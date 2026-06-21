from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from web3 import Web3
from web3.middleware import geth_poa_middleware

ROOT = Path(__file__).resolve().parents[1]
CONTRACT_PATH = ROOT / "contracts" / "BlockLend.sol"
ABI_PATH = ROOT / "abi" / "BlobkLendABI.json"
ADDRESS_PATH = ROOT / "contract_info" / "contract_address.txt"

ENV_FILE = Path(__file__).resolve().parents[2] / "backend" / ".env"
load_dotenv(ENV_FILE, override=False)
load_dotenv(override=False)

RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:7545")
PRIVATE_KEY = os.getenv("DEPLOYER_PRIVATE_KEY")

try:
    import solcx
except ImportError:
    solcx = None


def ensure_dependencies():
    if solcx is None:
        raise SystemExit(
            "Missing solcx. Install it with: pip install py-solc-x"
        )

    # Install exact compiler version expected by the contract.
    solcx.install_solc("0.8.20")


def compile_contract():
    ensure_dependencies()
    contract_source = CONTRACT_PATH.read_text(encoding="utf-8")
    compiled = solcx.compile_source(
        contract_source,
        output_values=["abi", "bin"],
        solc_version="0.8.20",
        evm_version="paris",
    )

    # solcx returns a nested dict keyed by contract name.
    contract_key = next(iter(compiled))
    contract_data = compiled[contract_key]
    return contract_data["abi"], contract_data["bin"]


def save_outputs(abi, address):
    ABI_PATH.parent.mkdir(parents=True, exist_ok=True)
    ADDRESS_PATH.parent.mkdir(parents=True, exist_ok=True)
    ABI_PATH.write_text(json.dumps(abi, indent=2), encoding="utf-8")
    ADDRESS_PATH.write_text(address + "\n", encoding="utf-8")
    print(f"ABI saved to: {ABI_PATH}")
    print(f"Contract address saved to: {ADDRESS_PATH}")


def main():
    if not PRIVATE_KEY:
        raise SystemExit(
            "Missing DEPLOYER_PRIVATE_KEY. Set it in your environment before running this script."
        )

    abi, bytecode = compile_contract()

    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    w3.middleware_onion.inject(geth_poa_middleware, layer=0)

    if not w3.is_connected():
        raise SystemExit(f"Could not connect to blockchain at {RPC_URL}")

    account = w3.eth.account.from_key(PRIVATE_KEY)
    chain_id = w3.eth.chain_id

    contract = w3.eth.contract(abi=abi, bytecode=bytecode)
    tx = contract.constructor().build_transaction(
        {
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 3000000,
            "gasPrice": w3.eth.gas_price,
            "chainId": chain_id,
        }
    )

    signed_tx = w3.eth.account.sign_transaction(tx, PRIVATE_KEY)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    deployed_contract = w3.eth.contract(
        address=receipt.contractAddress,
        abi=abi,
    )
    print(f"Contract deployed at: {receipt.contractAddress}")
    save_outputs(abi, receipt.contractAddress)

    print("Contract owner:", account.address)
    print(
        "Example call:\n"
        f"  python -c \"from web3 import Web3; import os;\n"
        f"  w3 = Web3(Web3.HTTPProvider(os.getenv('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:7545')));\n"
        f"  print(w3.eth.get_code('{receipt.contractAddress}'))\""
    )


if __name__ == "__main__":
    main()
