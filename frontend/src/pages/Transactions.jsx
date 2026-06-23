import { useEffect, useState } from 'react';
import { transactionAPI } from '../utils/api';
import '../styles/pages/Transactions.css';

export default function Transactions() {
  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txHash, setTxHash] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingReceipt, setCheckingReceipt] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [networkRes, contractRes, txRes] = await Promise.all([
        transactionAPI.getNetworkInfo(),
        transactionAPI.getContractInfo(),
        transactionAPI.getTransactions(),
      ]);

      setNetworkInfo(networkRes.data?.network || null);
      setContractInfo(contractRes.data || null);
      setTransactions(Array.isArray(txRes.data?.data) ? txRes.data.data : []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load blockchain information');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckReceipt = async (e) => {
    e.preventDefault();
    if (!txHash.trim()) return;

    try {
      setCheckingReceipt(true);
      const res = await transactionAPI.getTransactionReceipt(txHash.trim());
      setReceipt(res.data?.receipt || null);
      await loadData();
    } catch (err) {
      console.error(err);
      setReceipt({
        transaction_hash: txHash,
        status: 'error',
        message: err.response?.data?.detail || 'Unable to fetch receipt',
      });
    } finally {
      setCheckingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="transactions-page">
      <div className="container">
        <div className="page-header">
          <h1>Blockchain Transactions</h1>
          <p>Verify network status, smart contract info, and transaction receipts</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="transaction-summary-grid">
          <div className="summary-card">
            <h3>Network Status</h3>
            <p><strong>Connected:</strong> {networkInfo?.is_connected ? 'Yes' : 'No'}</p>
            <p><strong>Chain ID:</strong> {networkInfo?.chain_id ?? 'N/A'}</p>
            <p><strong>Latest Block:</strong> {networkInfo?.latest_block ?? 'N/A'}</p>
          </div>

          <div className="summary-card">
            <h3>Contract Info</h3>
            <p><strong>Address:</strong> {contractInfo?.contract_address || 'N/A'}</p>
            <p><strong>RPC:</strong> {contractInfo?.network?.rpc_url || 'N/A'}</p>
          </div>
        </div>

        <div className="receipt-checker">
          <h3>Check Receipt</h3>
          <form onSubmit={handleCheckReceipt}>
            <input
              type="text"
              placeholder="Enter transaction hash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
            />
            <button type="submit" disabled={checkingReceipt}>
              {checkingReceipt ? 'Checking...' : 'Check Receipt'}
            </button>
          </form>

          {receipt && (
            <div className={`receipt-result ${receipt.status === 'error' ? 'error' : ''}`}>
              <p><strong>Hash:</strong> {receipt.transaction_hash || receipt.tx_hash || 'N/A'}</p>
              <p><strong>Status:</strong> {receipt.status || receipt.message || 'Unknown'}</p>
              {receipt.block_number && <p><strong>Block:</strong> {receipt.block_number}</p>}
              {receipt.gas_used && <p><strong>Gas Used:</strong> {receipt.gas_used}</p>}
              {receipt.contract_address && <p><strong>Contract:</strong> {receipt.contract_address}</p>}
            </div>
          )}
        </div>

        <div className="transactions-table-wrapper">
          <h3>Recorded Transactions</h3>
          {transactions.length > 0 ? (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id || tx._id}>
                    <td>{tx.tx_hash || tx.transaction_hash || 'N/A'}</td>
                    <td>{tx.status || 'pending'}</td>
                    <td>{tx.tx_type || 'blockchain'}</td>
                    <td>{tx.created_at ? new Date(tx.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No transaction records yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
