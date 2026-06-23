from web3 import Web3
import json
import os
from pathlib import Path

class BlockchainConfig:
    """Blockchain configuration and utilities"""
    
    def __init__(self):
        self.rpc_url = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:7545")
        self.repo_root = Path(__file__).resolve().parents[3]
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        self.contract_abi = self._load_contract_abi()
        self.contract_address = os.getenv("BLOCKCHAIN_CONTRACT_ADDRESS") or self._load_contract_address()
    
    def _load_contract_abi(self):
        """Load contract ABI from file"""
        try:
            abi_path = self.repo_root / "blockchain" / "abi" / "BlobkLendABI.json"
            if abi_path.exists():
                with abi_path.open('r', encoding='utf-8') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load contract ABI: {e}")
        return []
    
    def _load_contract_address(self):
        """Load contract address from file"""
        try:
            addr_path = self.repo_root / "blockchain" / "contract_info" / "contract_address.txt"
            if addr_path.exists():
                return addr_path.read_text(encoding='utf-8').strip()
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