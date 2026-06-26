from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime
from bson.objectid import ObjectId
from web3.exceptions import TransactionNotFound
from config.blockchain import blockchain_config
from config.database import database
from middleware.auth import get_current_user
import traceback

router = APIRouter(prefix="/api/blockchain", tags=["blockchain"])


def serialize_transaction_record(doc):
    doc = dict(doc)
    doc["id"] = str(doc.get("_id"))
    doc["_id"] = str(doc.get("_id"))
    return doc


def sync_pending_transaction(doc):
    """If a stored transaction is still pending, check Ganache for its receipt."""
    if doc.get("status") != "pending":
        return doc

    tx_hash = doc.get("tx_hash")
    if not tx_hash:
        return doc

    try:
        w3 = blockchain_config.get_web3_instance()
        receipt = w3.eth.get_transaction_receipt(tx_hash)
    except TransactionNotFound:
        return doc
    except Exception:
        return doc

    if not receipt:
        return doc

    receipt_status = receipt.get("status")
    transaction_status = "success" if receipt_status in (1, True, "1", "0x1") else "failed"
    now = datetime.utcnow()
    receipt_data = {
        "block_number": receipt.get("blockNumber"),
        "gas_used": receipt.get("gasUsed"),
        "contract_address": receipt.get("contractAddress"),
        "transaction_index": receipt.get("transactionIndex"),
    }

    transactions = database.get_collection("transactions")
    transactions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "status": transaction_status,
                "receipt": receipt_data,
                "updated_at": now,
            }
        },
    )

    borrow_id = doc.get("borrow_id")
    if borrow_id and ObjectId.is_valid(borrow_id):
        borrows = database.get_collection("borrows")
        borrows.update_one(
            {"_id": ObjectId(borrow_id), "blockchain_tx_hash": tx_hash},
            {"$set": {"blockchain_status": transaction_status, "updated_at": now}},
        )

    updated = dict(doc)
    updated["status"] = transaction_status
    updated["receipt"] = receipt_data
    updated["updated_at"] = now
    return updated


@router.get("/network-info")
async def get_network_info():
    """Get blockchain network information."""
    try:
        w3 = blockchain_config.get_web3_instance()

        try:
            chain_id = w3.eth.chain_id
            latest_block = w3.eth.block_number
            is_connected = True
        except Exception:
            chain_id = None
            latest_block = None
            is_connected = False

        return {
            "network": {
                "chain_id": chain_id,
                "latest_block": latest_block,
                "is_connected": is_connected,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-address")
async def verify_address(request: Request):
    """Verify Ethereum address format."""
    try:
        payload = await request.json()
        address = payload.get("address")
        if not address:
            raise HTTPException(status_code=400, detail="Address is required")

        return {
            "address": address,
            "is_valid": blockchain_config.verify_address(address)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _merge_transaction_update(existing: dict, updates: dict) -> dict:
    """Apply receipt/status updates without wiping borrow metadata."""
    merged = {"updated_at": updates["updated_at"]}

    if updates.get("status"):
        merged["status"] = updates["status"]
    elif existing.get("status"):
        merged["status"] = existing["status"]

    if updates.get("receipt") is not None:
        merged["receipt"] = updates["receipt"]
    elif existing.get("receipt") is not None:
        merged["receipt"] = existing["receipt"]

    for field in ("user_id", "borrow_id", "asset_id", "tx_type", "from_address", "to_address", "amount", "network"):
        value = updates.get(field)
        if value is not None:
            merged[field] = value
        elif existing.get(field) is not None:
            merged[field] = existing[field]
    return merged


def _repair_borrow_transaction_links(borrow_id: str, borrow: dict | None):
    """Restore borrow links and borrower ownership on legacy/corrupted records."""
    if not borrow:
        return

    transactions = database.get_collection("transactions")
    borrower_id = borrow.get("borrower_id")
    now = datetime.utcnow()
    repair_fields = {"borrow_id": borrow_id, "updated_at": now}
    if borrower_id:
        repair_fields["user_id"] = borrower_id

    transactions.update_many({"borrow_id": borrow_id}, {"$set": repair_fields})

    tx_hash = borrow.get("blockchain_tx_hash")
    if tx_hash:
        transactions.update_one(
            {"tx_hash": tx_hash},
            {"$set": repair_fields},
        )


def _build_borrow_transaction_query(borrow_id: str, borrow: dict | None) -> dict:
    """Match transactions for a borrow, including records that lost borrow_id."""
    conditions = [{"borrow_id": borrow_id}]
    if borrow and borrow.get("blockchain_tx_hash"):
        conditions.append({"tx_hash": borrow["blockchain_tx_hash"]})
    if len(conditions) == 1:
        return conditions[0]
    return {"$or": conditions}


@router.post("/transaction-receipt")
async def get_transaction_receipt(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Get transaction receipt from blockchain and save/update metadata in MongoDB."""
    try:
        payload = await request.json()
        tx_hash = payload.get("tx_hash")

        if not isinstance(tx_hash, str) or not tx_hash.strip():
            raise HTTPException(status_code=400, detail="Transaction hash is required")

        tx_hash = tx_hash.strip()
        if not tx_hash.startswith("0x"):
            raise HTTPException(status_code=400, detail="Transaction hash must be a hex string")

        w3 = blockchain_config.get_web3_instance()

        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
        except TransactionNotFound:
            raise HTTPException(status_code=404, detail="Transaction not found on the blockchain")
        except (ValueError, TypeError) as exc:
            raise HTTPException(status_code=400, detail="Invalid transaction hash") from exc

        if not receipt:
            raise HTTPException(status_code=404, detail="Transaction receipt not available yet")

        transactions = database.get_collection("transactions")
        now = datetime.utcnow()
        receipt_status = receipt.get("status")
        transaction_status = "success" if receipt_status in (1, True, "1", "0x1") else "failed"

        receipt_data = {
            "block_number": receipt.get("blockNumber"),
            "gas_used": receipt.get("gasUsed"),
            "contract_address": receipt.get("contractAddress"),
            "transaction_index": receipt.get("transactionIndex"),
        }

        record = {
            "user_id": payload.get("user_id") or current_user.get("user_id"),
            "borrow_id": payload.get("borrow_id"),
            "asset_id": payload.get("asset_id"),
            "tx_hash": tx_hash,
            "tx_type": payload.get("tx_type") or "blockchain",
            "from_address": payload.get("from_address"),
            "to_address": payload.get("to_address"),
            "amount": payload.get("amount"),
            "status": transaction_status,
            "network": payload.get("network") or blockchain_config.rpc_url,
            "receipt": receipt_data,
            "updated_at": now,
        }

        existing = transactions.find_one({"tx_hash": tx_hash})
        if existing:
            merged = _merge_transaction_update(existing, record)
            transactions.update_one(
                {"_id": existing["_id"]},
                {"$set": {**merged, "created_at": existing.get("created_at", now)}}
            )
            saved = transactions.find_one({"_id": existing["_id"]})
        else:
            record["created_at"] = now
            result = transactions.insert_one(record)
            saved = transactions.find_one({"_id": result.inserted_id})

        return {
            "success": True,
            "message": "Transaction receipt retrieved and recorded",
            "data": serialize_transaction_record(saved),
            "receipt": {
                "transaction_hash": tx_hash,
                "status": transaction_status,
                "block_number": receipt.get("blockNumber"),
                "gas_used": receipt.get("gasUsed"),
                "contract_address": receipt.get("contractAddress")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch transaction receipt") from e


@router.get("/contract-info")
async def get_contract_info():
    """Get smart contract information."""
    try:
        return {
            "contract_address": blockchain_config.contract_address,
            "network": {
                "rpc_url": blockchain_config.rpc_url,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transactions")
async def create_transaction_record(
    request: Request,
    current_user: dict = Depends(get_current_user)
):
    """Record a newly created blockchain transaction in MongoDB."""
    try:
        payload = await request.json()
        tx_hash = payload.get("tx_hash")
        if not tx_hash:
            raise HTTPException(status_code=400, detail="Transaction hash is required")

        transactions = database.get_collection("transactions")
        now = datetime.utcnow()
        record = {
            "user_id": payload.get("user_id") or current_user.get("user_id"),
            "borrow_id": payload.get("borrow_id"),
            "asset_id": payload.get("asset_id"),
            "tx_hash": tx_hash,
            "tx_type": payload.get("tx_type") or "blockchain",
            "from_address": payload.get("from_address"),
            "to_address": payload.get("to_address"),
            "amount": payload.get("amount"),
            "status": payload.get("status") or "pending",
            "network": payload.get("network") or blockchain_config.rpc_url,
            "receipt": payload.get("receipt") or None,
            "created_at": now,
            "updated_at": now,
        }

        existing = transactions.find_one({"tx_hash": tx_hash})
        if existing:
            merged = _merge_transaction_update(existing, record)
            transactions.update_one(
                {"_id": existing["_id"]},
                {"$set": merged}
            )
            saved = transactions.find_one({"_id": existing["_id"]})
        else:
            result = transactions.insert_one(record)
            saved = transactions.find_one({"_id": result.inserted_id})

        return {
            "success": True,
            "message": "Transaction recorded successfully",
            "data": serialize_transaction_record(saved),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions")
async def get_transaction_records(
    current_user: dict = Depends(get_current_user),
    borrow_id: str | None = None,
):
    """Return transaction metadata stored in MongoDB for the current user or all records for admins.

    If `borrow_id` is provided, only transactions linked to that borrow are returned.
    """
    try:
        transactions = database.get_collection("transactions")
        borrows = database.get_collection("borrows")
        query = {}

        if borrow_id:
            if not ObjectId.is_valid(borrow_id):
                raise HTTPException(status_code=400, detail="Invalid borrow ID")

            borrow = borrows.find_one({"_id": ObjectId(borrow_id)})
            if not borrow:
                raise HTTPException(status_code=404, detail="Borrow record not found")

            if current_user.get("role") != "admin" and borrow.get("borrower_id") != current_user.get("user_id"):
                raise HTTPException(status_code=403, detail="You can only view transactions for your own borrows")

            _repair_borrow_transaction_links(borrow_id, borrow)
            query = _build_borrow_transaction_query(borrow_id, borrow)
        elif current_user.get("role") != "admin":
            user_id = current_user.get("user_id")
            user_borrows = list(borrows.find({"borrower_id": user_id}))
            for borrow in user_borrows:
                _repair_borrow_transaction_links(str(borrow["_id"]), borrow)

            user_borrow_ids = [str(doc["_id"]) for doc in user_borrows]
            or_filters = [{"user_id": user_id}]
            if user_borrow_ids:
                or_filters.append({"borrow_id": {"$in": user_borrow_ids}})
            query["$or"] = or_filters

        docs = list(transactions.find(query).sort("created_at", -1))
        synced_docs = [sync_pending_transaction(doc) for doc in docs]
        return {
            "success": True,
            "data": [serialize_transaction_record(doc) for doc in synced_docs],
            "count": len(synced_docs),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

