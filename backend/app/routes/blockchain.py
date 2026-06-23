from fastapi import APIRouter, Depends, HTTPException, Request
from datetime import datetime
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
            "receipt": {
                "block_number": receipt.get("blockNumber"),
                "gas_used": receipt.get("gasUsed"),
                "contract_address": receipt.get("contractAddress"),
                "transaction_index": receipt.get("transactionIndex"),
            },
            "updated_at": now,
        }

        existing = transactions.find_one({"tx_hash": tx_hash})
        if existing:
            transactions.update_one(
                {"_id": existing["_id"]},
                {"$set": {**record, "created_at": existing.get("created_at", now)}}
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
            transactions.update_one(
                {"_id": existing["_id"]},
                {"$set": record}
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
        query = {}

        if borrow_id:
            query["borrow_id"] = borrow_id

        if current_user.get("role") != "admin":
            query["user_id"] = current_user.get("user_id")

        docs = list(transactions.find(query).sort("created_at", -1))
        return {
            "success": True,
            "data": [serialize_transaction_record(doc) for doc in docs],
            "count": len(docs),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

