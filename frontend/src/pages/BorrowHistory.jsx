import { useState, useEffect } from 'react';
import { borrowAPI, penaltyAPI } from '../utils/api';
import { exportBorrowsPDF } from '../utils/pdfReport';
import '../styles/pages/BorrowHistory.css';

export default function BorrowHistory() {
  const [borrows, setBorrows] = useState([]);
  const [penaltyInfo, setPenaltyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBorrow, setSelectedBorrow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [returnData, setReturnData] = useState({ notes: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBorrowHistory();
    fetchPenaltyInfo();
  }, []);

  const fetchPenaltyInfo = async () => {
    try {
      const response = await penaltyAPI.getPenalties();
      setPenaltyInfo(response.data || null);
    } catch (err) {
      console.error('Failed to load penalty info:', err);
    }
  };

  const fetchBorrowHistory = async () => {
    try {
      const response = await borrowAPI.getBorrowHistory();
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
      setBorrows(data);
      setError('');
    } catch (err) {
      setError('Failed to load borrow history');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBorrow) return;

    setSubmitting(true);
    try {
      await borrowAPI.returnAsset(selectedBorrow._id, returnData);
      alert('Return submitted! An admin will inspect the asset and confirm your return.');
      setShowModal(false);
      setSelectedBorrow(null);
      setReturnData({ notes: '' });
      await fetchBorrowHistory();
      await fetchPenaltyInfo();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.message || 'Failed to submit return');
    } finally {
      setSubmitting(false);
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
    <div className="borrow-history-container page-container">
      <div className="container">
        <div className="page-header">
          <div className="page-header-main">
            <div>
              <h1>Borrow History</h1>
              <p>View and manage all your borrowing records</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportBorrowsPDF(borrows)}
              disabled={loading || borrows.length === 0}
            >
              ⬇ Export PDF
            </button>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {penaltyInfo && penaltyInfo.late_return_warnings > 0 && (
          <div className={`alert ${penaltyInfo.late_return_warnings >= 3 ? 'alert-danger' : 'alert-warning'}`}>
            {penaltyInfo.late_return_warnings >= 3
              ? 'Your account has been deactivated due to 3 late-return warnings. Contact an administrator.'
              : `Late return warnings: ${penaltyInfo.late_return_warnings} of 3. Return overdue items to avoid account deactivation.`}
          </div>
        )}

        {borrows.length > 0 ? (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Qty</th>
                  <th>Borrow Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                  <th>Trust Points</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {borrows.map(borrow => (
                  <tr key={borrow._id} className={`status-${borrow.status}`}>
                    <td className="asset-name">{borrow.assetName}</td>
                    <td>{borrow.quantity ?? 1}</td>
                    <td>{new Date(borrow.borrowDate).toLocaleDateString()}</td>
                    <td>{borrow.due_date ? new Date(borrow.due_date).toLocaleDateString() : '-'}</td>
                    <td>{borrow.returnDate ? new Date(borrow.returnDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge badge-${getBadgeColor(borrow.status)}`}>
                        {borrow.status === 'return_pending' ? 'pending return' : borrow.status}
                      </span>
                    </td>
                    <td className="trust-points">
                      <span className={`points ${borrow.trustPoints >= 0 ? 'positive' : 'negative'}`}>
                        {borrow.trustPoints > 0 ? '+' : ''}{borrow.trustPoints}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn-action"
                        onClick={() => {
                          setSelectedBorrow(borrow);
                          setShowModal(true);
                        }}
                      >
                        Details
                      </button>
                      {(borrow.status === 'active' || borrow.status === 'approved') && (
                        <button
                          className="btn-action btn-return"
                          onClick={() => {
                            setSelectedBorrow(borrow);
                            setShowModal(true);
                          }}
                        >
                          Return
                        </button>
                      )}
                      {borrow.status === 'return_pending' && (
                        <span className="return-pending-label">Awaiting admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <p>No borrowing history yet</p>
          </div>
        )}

        {showModal && selectedBorrow && (
          <div className="modal-overlay" onClick={() => setShowModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>
                  {(selectedBorrow.status === 'active' || selectedBorrow.status === 'approved')
                    ? 'Return Asset'
                    : 'Borrow Details'}
                </h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="detail-group">
                  <label>Asset Name</label>
                  <p>{selectedBorrow.assetName}</p>
                </div>

                <div className="detail-group">
                  <label>Quantity Borrowed</label>
                  <p>{selectedBorrow.quantity ?? 1}</p>
                </div>

                <div className="detail-group">
                  <label>Borrow Date</label>
                  <p>{new Date(selectedBorrow.borrowDate).toLocaleDateString()}</p>
                </div>

                <div className="detail-group">
                  <label>Due Date</label>
                  <p>{selectedBorrow.due_date
                    ? new Date(selectedBorrow.due_date).toLocaleDateString()
                    : 'Pending approval'}</p>
                </div>

                <div className="detail-group">
                  <label>Return Date</label>
                  <p>{selectedBorrow.returnDate
                    ? new Date(selectedBorrow.returnDate).toLocaleDateString()
                    : 'Pending'}</p>
                </div>

                <div className="detail-group">
                  <label>Status</label>
                  <p>
                    <span className={`badge badge-${getBadgeColor(selectedBorrow.status)}`}>
                      {selectedBorrow.status === 'return_pending' ? 'pending return' : selectedBorrow.status}
                    </span>
                  </p>
                </div>

                {selectedBorrow.status === 'completed' && (
                  <>
                    <div className="detail-group">
                      <label>Item Condition</label>
                      <p>
                        {selectedBorrow.condition ? (
                          <span className={`badge badge-${getConditionBadgeColor(selectedBorrow.condition)}`}>
                            {formatCondition(selectedBorrow.condition)}
                          </span>
                        ) : 'Not recorded'}
                      </p>
                    </div>

                    <div className="detail-group">
                      <label>Trust Points Earned</label>
                      <p style={{
                        fontWeight: 600,
                        color: (selectedBorrow.trustPoints ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {(selectedBorrow.trustPoints ?? 0) > 0 ? '+' : ''}{selectedBorrow.trustPoints ?? 0}
                      </p>
                    </div>

                    <div className="detail-group">
                      <label>Admin Notes</label>
                      <p>{selectedBorrow.admin_return_notes || 'No notes provided'}</p>
                    </div>
                  </>
                )}

                {(selectedBorrow.status === 'active' || selectedBorrow.status === 'approved') && (
                  <form onSubmit={handleReturnSubmit}>
                    <p className="return-info">
                      Submit this asset for return. An admin will inspect it and confirm the condition.
                    </p>
                    <div className="form-group">
                      <label htmlFor="notes">Notes (optional)</label>
                      <textarea
                        id="notes"
                        value={returnData.notes}
                        onChange={(e) => setReturnData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any notes about the return..."
                      />
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-success" disabled={submitting}>
                        {submitting ? 'Processing...' : 'Submit Return'}
                      </button>
                    </div>
                  </form>
                )}

                {selectedBorrow.status === 'return_pending' && (
                  <p className="return-info">Your return is pending admin confirmation.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getBadgeColor(status) {
  switch (status) {
    case 'pending': return 'warning';
    case 'approved': return 'success';
    case 'active': return 'info';
    case 'return_pending': return 'warning';
    case 'completed': return 'success';
    case 'rejected': return 'danger';
    default: return 'info';
  }
}

function formatCondition(condition) {
  if (!condition) return 'Unknown';
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}

function getConditionBadgeColor(condition) {
  switch ((condition || '').toLowerCase()) {
    case 'good': return 'success';
    case 'fair': return 'info';
    case 'poor': return 'warning';
    case 'damaged': return 'danger';
    default: return 'info';
  }
}
