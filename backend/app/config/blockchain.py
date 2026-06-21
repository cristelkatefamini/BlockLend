from web3 import Web3
import json
import os

class BlockchainConfig:
    """Blockchain configuration and utilities"""
    
    def __init__(self):
        self.rpc_url = "http://127.0.0.1:7545"
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.contract_abi = self._load_contract_abi()
        self.contract_address = self._load_contract_address()
    
    def _load_contract_abi(self):
        """Load contract ABI from file"""
        try:
            abi_path = os.path.join(os.path.dirname(__file__), '../../blockchain/abi/BlobkLendABI.json')
            if os.path.exists(abi_path):
                with open(abi_path, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load contract ABI: {e}")
        return []
    
    def _load_contract_address(self):
        """Load contract address from file"""
        try:
            addr_path = os.path.join(os.path.dirname(__file__), '../../blockchain/contract_info/contract_address.txt')
            if os.path.exists(addr_path):
                with open(addr_path, 'r') as f:
                    return f.read().strip()
        except Exception as e:
            print(f"Warning: Could not load contract address: {e}")
        return None
    
    def get_web3_instance(self, rpc_url=None):
        """Get Web3 instance"""
        url = rpc_url or self.rpc_url
        return Web3(Web3.HTTPProvider(url))
    
    def verify_address(self, address):
        """Verify Ethereum address"""
        return Web3.is_address(address)
    
    def verify_signature(self, message, signature, address):
        """Verify message signature"""
        try:
            recovered_address = self.w3.eth.account.recover_message(
                self.w3.keccak(text=message),
                signature=signature
            )
            return recovered_address.lower() == address.lower()
        except Exception as e:
            print(f"Signature verification error: {e}")
            return False

# Create singleton instance
blockchain_config = BlockchainConfig()