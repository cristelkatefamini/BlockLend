import { useState, useEffect } from 'react';
import { borrowAPI } from '../utils/api';
import '../styles/pages/BorrowHistory.css';

export default function BorrowHistory() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedBorrow, setSelectedBorrow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [returnData, setReturnData] = useState({
    condition: 'good',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBorrowHistory();
  }, []);

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
      alert('Asset return submitted successfully!');
      setShowModal(false);
      setSelectedBorrow(null);
      setReturnData({ condition: 'good', notes: '' });
      await fetchBorrowHistory();
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
    <div className="borrow-history-container">
      <div className="container">
        <div className="page-header">
          <h1>Borrow History</h1>
          <p>View and manage all your borrowing records</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {borrows.length > 0 ? (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Borrow Date</th>
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
                    <td>{new Date(borrow.borrowDate).toLocaleDateString()}</td>
                    <td>{borrow.returnDate ? new Date(borrow.returnDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge badge-${getBadgeColor(borrow.status)}`}>
                        {borrow.status}
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
                      {borrow.status === 'active' && (
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
                  {selectedBorrow.status === 'active' ? 'Return Asset' : 'Borrow Details'}
                </h2>
                <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div className="modal-body">
                <div className="detail-group">
                  <label>Asset Name</label>
                  <p>{selectedBorrow.assetName}</p>
                </div>

                <div className="detail-group">
                  <label>Borrow Date</label>
                  <p>{new Date(selectedBorrow.borrowDate).toLocaleDateString()}</p>
                </div>

                <div className="detail-group">
                  <label>Return Date</label>
                  <p>{selectedBorrow.returnDate ? new Date(selectedBorrow.returnDate).toLocaleDateString() : 'Pending'}</p>
                </div>

                <div className="detail-group">
                  <label>Status</label>
                  <p>
                    <span className={`badge badge-${getBadgeColor(selectedBorrow.status)}`}>
                      {selectedBorrow.status}
                    </span>
                  </p>
                </div>

                {selectedBorrow.status === 'active' && (
                  <form onSubmit={handleReturnSubmit}>
                    <div className="form-group">
                      <label htmlFor="condition">Asset Condition</label>
                      <select
                        id="condition"
                        value={returnData.condition}
                        onChange={(e) => setReturnData(prev => ({ ...prev, condition: e.target.value }))}
                      >
                        <option value="good">Good</option>
                        <option value="fair">Fair</option>
                        <option value="poor">Poor</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="notes">Notes</label>
                      <textarea
                        id="notes"
                        value={returnData.notes}
                        onChange={(e) => setReturnData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Add any notes about the asset condition..."
                      />
                    </div>

                    <div className="modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={submitting}
                      >
                        {submitting ? 'Processing...' : 'Confirm Return'}
                      </button>
                    </div>
                  </form>
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
    case 'completed': return 'success';
    case 'rejected': return 'danger';
    default: return 'info';
  }
}
