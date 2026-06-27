import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { transactionAPI } from '../../utils/api';
import '../../styles/pages/Admin.css';
import '../../styles/pages/AdminBlockchain.css';

function exportBlockchainPDF(networkInfo, contractInfo, transactions) {
  const { exportDashboardPDF: _, ...pdfMod } = {};
  // inline lightweight export for blockchain
  const BRAND = '#1b365d';
  const rows = transactions.map(tx => `
    <tr>
      <td style="font-family:monospace;font-size:9px;color:#4a7ba7">${tx.tx_hash ? tx.tx_hash.slice(0, 20) + '…' : 'N/A'}</td>
      <td>${tx.tx_type || 'blockchain'}</td>
      <td>${tx.status || 'pending'}</td>
      <td style="font-family:monospace;font-size:9px">${tx.from_address ? tx.from_address.slice(0, 12) + '…' : '—'}</td>
      <td style="font-family:monospace;font-size:9px">${tx.to_address ? tx.to_address.slice(0, 12) + '…' : '—'}</td>
      <td>${tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</td>
    </tr>
  `).join('');

  const now = new Date();
  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>Blockchain Report</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#222}
      .rh{display:flex;justify-content:space-between;align-items:flex-start;padding:18px 24px 14px;border-bottom:3px solid ${BRAND};margin-bottom:18px}
      .rh h1{font-size:18px;color:${BRAND};margin-bottom:3px} .rh p{font-size:11px;color:#666}
      .logo{font-size:22px;font-weight:800;color:${BRAND}} .logo span{color:#e87722}
      .meta{font-size:10px;color:#888;text-align:right;line-height:1.6}
      .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px}
      .info-box{border:1px solid #ddd;padding:12px 14px;border-left:4px solid ${BRAND}}
      .info-box .t{font-size:10px;font-weight:700;color:${BRAND};margin-bottom:8px;text-transform:uppercase}
      .info-row{display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px}
      .info-row span{color:#888} .info-row strong{color:#333;word-break:break-all;text-align:right;max-width:60%}
      .sec{font-size:12px;font-weight:700;color:${BRAND};border-bottom:1px solid #e0e0e0;padding-bottom:5px;margin:18px 0 10px;text-transform:uppercase;letter-spacing:.04em}
      table{width:100%;border-collapse:collapse}
      thead{background:${BRAND}} thead th{padding:7px 10px;color:#fff;text-align:left;font-size:10px;font-weight:600}
      tbody td{padding:6px 10px;border-bottom:1px solid #f0f0f0;font-size:10px;color:#333}
      tbody tr:nth-child(even) td{background:#fafafa}
      .foot{border-top:1px solid #ddd;padding-top:8px;font-size:9px;color:#aaa;margin-top:24px;display:flex;justify-content:space-between}
      @media print{@page{margin:15mm 12mm;size:A4 portrait}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    </style></head><body>
    <div class="rh">
      <div><div class="logo">Block<span>Lend</span></div><h1>Blockchain Report</h1><p>Ganache network &amp; transaction records</p></div>
      <div class="meta"><div>Generated: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}</div><div>BlockLend Admin Report</div></div>
    </div>
    <div class="info-grid">
      <div class="info-box">
        <div class="t">Network Status</div>
        <div class="info-row"><span>Connected</span><strong>${networkInfo?.is_connected ? 'Yes' : 'No'}</strong></div>
        <div class="info-row"><span>Chain ID</span><strong>${networkInfo?.chain_id ?? '—'}</strong></div>
        <div class="info-row"><span>Latest Block</span><strong>${networkInfo?.latest_block ?? '—'}</strong></div>
      </div>
      <div class="info-box">
        <div class="t">Contract Info</div>
        <div class="info-row"><span>Address</span><strong style="font-family:monospace;font-size:9px">${contractInfo?.contract_address || 'Not deployed'}</strong></div>
        <div class="info-row"><span>RPC URL</span><strong style="font-family:monospace;font-size:9px">${contractInfo?.network?.rpc_url || '—'}</strong></div>
      </div>
    </div>
    <div class="sec">Recorded Transactions (${transactions.length})</div>
    <table>
      <thead><tr><th>Tx Hash</th><th>Type</th><th>Status</th><th>From</th><th>To</th><th>Date</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6">No transactions recorded yet</td></tr>'}</tbody>
    </table>
    <div class="foot"><span>BlockLend — Confidential</span><span>${now.toISOString()}</span></div>
    </body></html>
  `;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

export default function AdminBlockchain() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [networkInfo, setNetworkInfo] = useState(null);
  const [contractInfo, setContractInfo] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Receipt checker
  const [txHash, setTxHash] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [checkingReceipt, setCheckingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }
    loadAll();
  }, [user, navigate]);

  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const [networkRes, contractRes, txRes] = await Promise.all([
        transactionAPI.getNetworkInfo(),
        transactionAPI.getContractInfo(),
        transactionAPI.getTransactions(),
      ]);
      setNetworkInfo(networkRes.data?.network || null);
      setContractInfo(contractRes.data || null);
      setTransactions(Array.isArray(txRes.data?.data) ? txRes.data.data : []);
    } catch (err) {
      console.error(err);
      setError('Failed to load blockchain data. Make sure Ganache is running on port 7545.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleCheckReceipt = async (e) => {
    e.preventDefault();
    if (!txHash.trim()) return;
    setCheckingReceipt(true);
    setReceipt(null);
    setReceiptError('');
    try {
      const res = await transactionAPI.getTransactionReceipt(txHash.trim());
      setReceipt(res.data?.receipt || null);
      await loadAll(true);
    } catch (err) {
      setReceiptError(err.response?.data?.detail || 'Transaction not found or Ganache unreachable.');
    } finally {
      setCheckingReceipt(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-container page-container">
        <div className="container">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Connecting to Ganache...</p>
          </div>
        </div>
      </div>
    );
  }

  const isConnected = networkInfo?.is_connected;

  return (
    <div className="admin-container page-container">
      <div className="container">

        <div className="admin-header">
          <div className="bc-header-row">
            <div>
              <h1>Blockchain Transactions</h1>
              <p>Verify network status, smart contract info, and transaction receipts</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => exportBlockchainPDF(networkInfo, contractInfo, transactions)}
                disabled={refreshing}
              >
                ⬇ Export PDF
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => loadAll(true)}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {/* Network + Contract cards */}
        <div className="bc-info-grid">
          <div className="bc-info-card">
            <div className="bc-info-card-title">
              <span className={`bc-dot ${isConnected ? 'bc-dot--green' : 'bc-dot--red'}`}></span>
              Network Status
            </div>
            <div className="bc-info-rows">
              <div className="bc-info-row">
                <span>Connected</span>
                <strong className={isConnected ? 'bc-value--green' : 'bc-value--red'}>
                  {isConnected ? 'Yes' : 'No'}
                </strong>
              </div>
              <div className="bc-info-row">
                <span>Chain ID</span>
                <strong>{networkInfo?.chain_id ?? 'N/A'}</strong>
              </div>
              <div className="bc-info-row">
                <span>Latest Block</span>
                <strong>{networkInfo?.latest_block ?? 'N/A'}</strong>
              </div>
            </div>
          </div>

          <div className="bc-info-card">
            <div className="bc-info-card-title">Contract Info</div>
            <div className="bc-info-rows">
              <div className="bc-info-row">
                <span>Address</span>
                <strong className="bc-mono">{contractInfo?.contract_address || 'Not deployed'}</strong>
              </div>
              <div className="bc-info-row">
                <span>RPC</span>
                <strong className="bc-mono">{contractInfo?.network?.rpc_url || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt checker */}
        <div className="bc-section-card">
          <div className="bc-section-title">Check Receipt</div>
          <form className="bc-receipt-form" onSubmit={handleCheckReceipt}>
            <input
              type="text"
              className="bc-hash-input"
              placeholder="Enter transaction hash"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={checkingReceipt}>
              {checkingReceipt ? 'Checking...' : 'Check Receipt'}
            </button>
          </form>

          {receiptError && (
            <div className="bc-receipt-result bc-receipt-result--error">
              {receiptError}
            </div>
          )}

          {receipt && !receiptError && (
            <div className="bc-receipt-result">
              <div className="bc-receipt-grid">
                <div className="bc-receipt-item">
                  <span>Hash</span>
                  <strong className="bc-mono">{receipt.transaction_hash || receipt.tx_hash || '—'}</strong>
                </div>
                <div className="bc-receipt-item">
                  <span>Status</span>
                  <strong className={receipt.status === 'success' ? 'bc-value--green' : receipt.status === 'error' ? 'bc-value--red' : ''}>
                    {receipt.status || '—'}
                  </strong>
                </div>
                <div className="bc-receipt-item">
                  <span>Block Number</span>
                  <strong>{receipt.block_number ?? '—'}</strong>
                </div>
                <div className="bc-receipt-item">
                  <span>Gas Used</span>
                  <strong>{receipt.gas_used ?? '—'}</strong>
                </div>
                {receipt.contract_address && (
                  <div className="bc-receipt-item">
                    <span>Contract Address</span>
                    <strong className="bc-mono">{receipt.contract_address}</strong>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Transaction records */}
        <div className="bc-section-card">
          <div className="bc-section-title">
            Recorded Transactions
            <span className="bc-count">{transactions.length}</span>
          </div>

          {transactions.length === 0 ? (
            <div className="empty-state">
              <p>No transactions recorded yet. Approve a borrow request to generate one.</p>
            </div>
          ) : (
            <div className="borrow-table-wrapper" style={{ marginBottom: 0 }}>
              <table className="borrow-table">
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
                      <td>
                        <span className="bc-mono bc-hash-cell" title={tx.tx_hash}>
                          {tx.tx_hash || 'N/A'}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${
                          tx.status === 'success' ? 'status-approved' :
                          tx.status === 'failed' ? 'status-declined' :
                          'status-pending'
                        }`}>
                          {tx.status || 'pending'}
                        </span>
                      </td>
                      <td>{tx.tx_type || 'blockchain'}</td>
                      <td>{tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
