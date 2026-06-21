from fastapi import APIRouter, HTTPException, Request
from config.blockchain import blockchain_config

router = APIRouter(prefix="/api/blockchain", tags=["blockchain"])


@router.get("/network-info")
async def get_network_info():
    """Get blockchain network information."""
    try:
        w3 = blockchain_config.get_web3_instance()
        return {
            "network": {
                "chain_id": w3.eth.chain_id,
                "latest_block": w3.eth.block_number,
                "is_connected": w3.is_connected(),
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
async def get_transaction_receipt(request: Request):
    """Get transaction receipt from blockchain."""
    try:
        payload = await request.json()
        tx_hash = payload.get("tx_hash")
        if not tx_hash:
            raise HTTPException(status_code=400, detail="Transaction hash is required")

        w3 = blockchain_config.get_web3_instance()
        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if not receipt:
            raise HTTPException(status_code=404, detail="Transaction not found")

        return {
            "transaction_hash": tx_hash,
            "status": "success" if receipt.get("status") else "failed",
            "block_number": receipt.get("blockNumber"),
            "gas_used": receipt.get("gasUsed"),
            "contract_address": receipt.get("contractAddress")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

