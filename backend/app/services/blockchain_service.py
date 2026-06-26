from config.blockchain import blockchain_config
from web3 import Web3
import json

class BlockchainService:
    """Blockchain service for smart contract interactions"""
    
    def __init__(self):
        self.config = blockchain_config
    
    def get_web3_instance(self):
        """Get Web3 instance using the configured RPC endpoint."""
        rpc_url = self.config.rpc_url
        return self.config.get_web3_instance(rpc_url)
    
    def verify_address(self, address):
        """Verify Ethereum address"""
        return Web3.is_address(address)
    
    def verify_signature(self, message, signature, address):
        """Verify message signature"""
        try:
            return self.config.verify_signature(message, signature, address)
        except Exception as e:
            raise ValueError(f"Signature verification failed: {str(e)}")
    
    def send_transaction(self, from_address, to_address, amount, private_key):
        """Send transaction on blockchain"""
        try:
            w3 = self.get_web3_instance()
            
            # Build transaction
            nonce = w3.eth.get_transaction_count(from_address)
            gas_price = w3.eth.gas_price
            
            transaction = {
                'nonce': nonce,
                'to': to_address,
                'value': Web3.toWei(amount, 'ether'),
                'gas': 21000,
                'gasPrice': gas_price,
                'from': from_address
            }
            
            # Sign transaction
            signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
            
            # Send transaction
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return tx_hash.hex()
        except Exception as e:
            raise Exception(f"Transaction failed: {str(e)}")

    def send_transaction_and_wait(self, from_address, to_address, amount, private_key, timeout=30):
        """Send a transaction and wait for Ganache/local chain to mine the receipt."""
        tx_hash = self.send_transaction(from_address, to_address, amount, private_key)
        w3 = self.get_web3_instance()
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
        receipt_status = receipt.get("status")
        status = "success" if receipt_status in (1, True, "1", "0x1") else "failed"
        return {
            "tx_hash": tx_hash,
            "status": status,
            "receipt": {
                "block_number": receipt.get("blockNumber"),
                "gas_used": receipt.get("gasUsed"),
                "contract_address": receipt.get("contractAddress"),
                "transaction_index": receipt.get("transactionIndex"),
            },
        }
    
    def get_transaction_receipt(self, tx_hash):
        """Get transaction receipt"""
        try:
            w3 = self.get_web3_instance()
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            return receipt
        except Exception as e:
            raise Exception(f"Failed to get transaction receipt: {str(e)}")
    
    def call_contract_function(self, function_name, *args):
        """Call a read-only function on the contract"""
        try:
            w3 = self.get_web3_instance()
            
            if not self.config.contract_address or not self.config.contract_abi:
                raise Exception("Contract address or ABI not configured")
            
            contract = w3.eth.contract(
                address=self.config.contract_address,
                abi=self.config.contract_abi
            )
            
            function = getattr(contract.functions, function_name)
            result = function(*args).call()
            
            return result
        except Exception as e:
            raise Exception(f"Contract call failed: {str(e)}")
    
    def send_contract_transaction(self, function_name, from_address, private_key, *args):
        """Send a transaction to a contract function"""
        try:
            w3 = self.get_web3_instance()
            
            if not self.config.contract_address or not self.config.contract_abi:
                raise Exception("Contract address or ABI not configured")
            
            contract = w3.eth.contract(
                address=self.config.contract_address,
                abi=self.config.contract_abi
            )
            
            function = getattr(contract.functions, function_name)
            tx = function(*args).build_transaction({
                'from': from_address,
                'nonce': w3.eth.get_transaction_count(from_address),
                'gas': 300000,
                'gasPrice': w3.eth.gas_price,
            })
            
            # Sign transaction
            signed_txn = w3.eth.account.sign_transaction(tx, private_key)
            
            # Send transaction
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            
            return tx_hash.hex()
        except Exception as e:
            raise Exception(f"Contract transaction failed: {str(e)}")
    
    def get_network_info(self):
        """Get network information"""
        try:
            w3 = self.get_web3_instance()
            
            return {
                'chain_id': w3.eth.chain_id,
                'latest_block': w3.eth.block_number,
                'gas_price': w3.to_decimal(w3.eth.gas_price),
                'is_connected': w3.is_connected()
            }
        except Exception as e:
            raise Exception(f"Failed to get network info: {str(e)}")

blockchain_service = BlockchainService()
