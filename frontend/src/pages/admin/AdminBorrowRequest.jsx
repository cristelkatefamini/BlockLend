import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { borrowAPI, transactionAPI, userAPI } from '../../utils/api';
import { exportBorrowsPDF } from '../../utils/pdfReport';
import '../../styles/pages/Admin.css';

export default function AdminBorrowRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [borrows, setBorrows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [confirmBorrow, setConfirmBorrow] = useState(null);
  const [confirmData, setConfirmData] = useState({ condition: 'good', notes: '' });
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [detailBorrow, setDetailBorrow] = useState(null);
  const [borrowTransactions, setBorrowTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [userLookup, setUserLookup] = useState({});

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }
    loadBorrowRequests();
  }, [user, navigate]);

  const loadBorrowRequests = async () => {
    try {
      const borrowResponse = await borrowAPI.getBorrowRequests();
      const requestList = Array.isArray(borrowResponse.data)
        ? borrowResponse.data
        : Array.isArray(borrowResponse.data?.data)
          ? borrowResponse.data.data
          : [];
      setBorrows(requestList);

      try {
        const usersResponse = await userAPI.getAllUsers();
        const users = usersResponse.data?.users || [];
        setUserLookup(Object.fromEntries(users.map((u) => [u.id, u])));
      } catch (usersErr) {
        console.error('Failed to load user trust scores:', usersErr);
        setUserLookup({});
      }
    } catch (err) {
      console.error('Failed to load borrow requests:', err);
      setBorrows([]);
      setUserLookup({});
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (borrowId) => {
    try {
      await borrowAPI.approveBorrow(borrowId);
      await loadBorrowRequests();
    } catch (err) {
      console.error('Failed to approve:', err);
      alert(err.response?.data?.detail || err.response?.data?.message || 'Failed to approve borrow request.');
    }
  };

  const handleDecline = async (borrowId) => {
    try {
      await borrowAPI.declineBorrow(borrowId);
      await loadBorrowRequests();
    } catch (err) {
      console.error('Failed to decline:', err);
      alert('Failed to decline borrow request.');
    }
  };

  const fetchBorrowTransactions = async (borrowId) => {
    if (!borrowId) return;
    try {
      setLoadingTransactions(true);
      const response = await transactionAPI.getTransactions(borrowId);
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      setBorrowTransactions(data);
    } catch (err) {
      console.error('Failed to load borrow transactions:', err);
      setBorrowTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const openDetails = (borrow) => {
    setDetailBorrow(borrow);
    setBorrowTransactions([]);
    fetchBorrowTransactions(borrow.id || borrow._id);
  };

  const openUserDetails = async (borrowerId) => {
    if (!borrowerId) return;
    const cached = userLookup[borrowerId];
    if (cached) {
      setDetailUser(cached);
      return;
    }
    setLoadingUser(true);
    setDetailUser(null);
    try {
      const response = await userAPI.getUser(borrowerId);
      const user = response.data?.user || response.data;
      setDetailUser(user);
      if (user?.id) {
        setUserLookup((prev) => ({ ...prev, [user.id]: user }));
      }
    } catch (err) {
      console.error('Failed to load user details:', err);
      alert(err.response?.data?.detail || 'Failed to load user details.');
    } finally {
      setLoadingUser(false);
    }
  };

  const getBorrowerId = (borrow) => borrow.borrowerId || borrow.borrower_id;

  const getBorrowerProfile = (borrow) => {
    const borrowerId = getBorrowerId(borrow);
    return borrowerId ? userLookup[borrowerId] : null;
  };

  const getBorrowerName = (borrow) => {
    const profile = getBorrowerProfile(borrow);
    if (profile) return profile.full_name || profile.username || 'Unknown';
    return borrow.borrowerName || borrow.borrowerUsername || getBorrowerId(borrow) || 'Unknown';
  };

  const getBorrowerTrustScore = (borrow) => {
    const profile = getBorrowerProfile(borrow);
    if (profile) return profile.trust_score ?? profile.credit_score ?? 0;
    return borrow.borrowerTrustScore ?? borrow.borrower_trust_score ?? 0;
  };

  const getBorrowerWarningCount = (borrow) => {
    const profile = getBorrowerProfile(borrow);
    if (profile) return profile.warning_count ?? 0;
    return borrow.borrowerWarningCount ?? borrow.borrower_warning_count ?? 0;
  };

  const handleConfirmReturn = async (e) => {
    e.preventDefault();
    if (!confirmBorrow) return;
    setConfirmSubmitting(true);
    try {
      await borrowAPI.confirmReturn(confirmBorrow.id || confirmBorrow._id, confirmData);
      setConfirmBorrow(null);
      setConfirmData({ condition: 'good', notes: '' });
      await loadBorrowRequests();
    } catch (err) {
      alert(err.response?.data?.detail || err.response?.data?.message || 'Failed to confirm return.');
    } finally {
      setConfirmSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'status-pending',
      approved: 'status-approved',
      declined: 'status-declined',
      active: 'status-active',
      return_pending: 'status-pending',
      completed: 'status-returned',
      returned: 'status-returned',
    };
    return statusColors[status] || 'status-default';
  };

  const filteredBorrows = borrows.filter(borrow => {
    if (filter === 'all') return true;
    return borrow.status === filter;
  });

  return (
    <div className="admin-container page-container">
      <div className="container">
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Borrow Requests Management</h1>
              <p>Review and manage all borrow requests</p>
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

        <div className="filter-section">
          <div className="filter-group">
            <label>Filter by Status:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="return_pending">Pending Return</option>
              <option value="completed">Completed</option>
              <option value="declined">Declined</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading borrow requests...</p>
          </div>
        ) : filteredBorrows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h2>No Borrow Requests</h2>
            <p>There are no borrow requests to display.</p>
          </div>
        ) : (
          <div className="borrow-table-wrapper">
            <table className="borrow-table">
              <thead>
                <tr>
                  <th>Borrower</th>
                  <th>Trust Score</th>
                  <th>Asset</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBorrows.map(borrow => (
                  <tr key={borrow.id || borrow._id}>
                    <td>
                      <button
                        type="button"
                        className="borrower-link"
                        onClick={() => openUserDetails(getBorrowerId(borrow))}
                      >
                        {getBorrowerName(borrow)}
                      </button>
                    </td>
                    <td>
                      <span className={getBorrowerTrustScore(borrow) < 0 ? 'trust-negative' : 'trust-positive'}>
                        {getBorrowerTrustScore(borrow)}
                      </span>
                      {getBorrowerWarningCount(borrow) > 0 && (
                        <span className="borrower-warnings"> ({getBorrowerWarningCount(borrow)}/3 warnings)</span>
                      )}
                    </td>
                    <td>{borrow.assetName || 'Unknown Asset'}</td>
                    <td>{borrow.requestDate ? new Date(borrow.requestDate).toLocaleString() : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadge(borrow.status)}`}>
                        {borrow.status === 'return_pending' ? 'pending return' : borrow.status}
                      </span>
                    </td>
                    <td className="action-buttons">
                      <button className="btn-details" onClick={() => openDetails(borrow)}>
                        Details
                      </button>
                      {borrow.status === 'pending' && (
                        <>
                          <button
                            className="btn-approve"
                            onClick={() => handleApprove(borrow.id || borrow._id)}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-decline"
                            onClick={() => handleDecline(borrow.id || borrow._id)}
                          >
                            Decline
                          </button>
                        </>
                      )}
                      {borrow.status === 'return_pending' && (
                        <button
                          className="btn-approve"
                          onClick={() => {
                            setConfirmBorrow(borrow);
                            setConfirmData({ condition: 'good', notes: '' });
                          }}
                        >
                          Confirm Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detailBorrow && (
          <div className="modal-overlay" onClick={() => setDetailBorrow(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Borrow Details</h2>
                <button className="close-btn" onClick={() => setDetailBorrow(null)}>✕</button>
              </div>
              <div className="modal-body">
                <div className="detail-group">
                  <label>Borrower</label>
                  <p>
                    <button
                      type="button"
                      className="borrower-link"
                      onClick={() => openUserDetails(getBorrowerId(detailBorrow))}
                    >
                      {getBorrowerName(detailBorrow)}
                    </button>
                  </p>
                </div>
                <div className="detail-group">
                  <label>Asset</label>
                  <p>{detailBorrow.assetName || 'Unknown Asset'}</p>
                </div>
                <div className="detail-group">
                  <label>Request Date</label>
                  <p>{detailBorrow.requestDate ? new Date(detailBorrow.requestDate).toLocaleString() : 'N/A'}</p>
                </div>
                <div className="detail-group">
                  <label>Borrow Date</label>
                  <p>{detailBorrow.borrowDate ? new Date(detailBorrow.borrowDate).toLocaleString() : 'N/A'}</p>
                </div>
                {detailBorrow.due_date && (
                  <div className="detail-group">
                    <label>Due Date</label>
                    <p>{new Date(detailBorrow.due_date).toLocaleString()}</p>
                  </div>
                )}
                <div className="detail-group">
                  <label>Return Date</label>
                  <p>{detailBorrow.returnDate ? new Date(detailBorrow.returnDate).toLocaleString() : 'Pending'}</p>
                </div>
                <div className="detail-group">
                  <label>Status</label>
                  <p>
                    <span className={`status-badge ${getStatusBadge(detailBorrow.status)}`}>
                      {detailBorrow.status === 'return_pending' ? 'pending return' : detailBorrow.status}
                    </span>
                  </p>
                </div>
                {detailBorrow.reason && (
                  <div className="detail-group">
                    <label>Borrow Reason</label>
                    <p>{detailBorrow.reason}</p>
                  </div>
                )}
                {detailBorrow.return_notes && (
                  <div className="detail-group">
                    <label>User Return Notes</label>
                    <p>{detailBorrow.return_notes}</p>
                  </div>
                )}
                {detailBorrow.status === 'completed' && (
                  <>
                    <div className="detail-group">
                      <label>Item Condition</label>
                      <p>
                        {detailBorrow.condition ? (
                          <span className={`status-badge condition-${detailBorrow.condition}`}>
                            {formatCondition(detailBorrow.condition)}
                          </span>
                        ) : 'Not recorded'}
                      </p>
                    </div>
                    <div className="detail-group">
                      <label>Admin Notes</label>
                      <p>{detailBorrow.admin_return_notes || 'No notes provided'}</p>
                    </div>
                    <div className="detail-group">
                      <label>Trust Points</label>
                      <p className={detailBorrow.trustPoints >= 0 ? 'trust-positive' : 'trust-negative'}>
                        {detailBorrow.trustPoints > 0 ? '+' : ''}{detailBorrow.trustPoints ?? 0}
                      </p>
                    </div>
                  </>
                )}
                <div className="detail-group">
                  <label>Blockchain Transactions</label>
                  {loadingTransactions ? (
                    <p>Loading transactions...</p>
                  ) : borrowTransactions.length > 0 ? (
                    <ul className="transaction-list">
                      {borrowTransactions.map((tx) => (
                        <li key={tx.id || tx._id}>
                          <span className="tx-hash">{tx.tx_hash || tx.transaction_hash || 'N/A'}</span>
                          <span className="tx-status">{tx.status || 'pending'}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No blockchain transactions recorded for this order yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(loadingUser || detailUser) && (
          <div className="modal-overlay" onClick={() => !loadingUser && setDetailUser(null)}>
            <div className="modal-content user-detail-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>User Details</h2>
                <button className="close-btn" onClick={() => setDetailUser(null)}>✕</button>
              </div>
              <div className="modal-body">
                {loadingUser ? (
                  <p>Loading user details...</p>
                ) : detailUser && (
                  <>
                    <div className="user-detail-header">
                      <div className="user-detail-avatar">
                        {detailUser.profile_image ? (
                          <img src={detailUser.profile_image} alt={detailUser.username} />
                        ) : (
                          <span>{(detailUser.username || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="user-detail-heading">
                        <h3>{detailUser.full_name || detailUser.username}</h3>
                        <p>@{detailUser.username}</p>
                        <span className={`user-detail-role role-${detailUser.role || 'user'}`}>
                          {detailUser.role || 'user'}
                        </span>
                      </div>
                    </div>
                    <div className="user-detail-stats">
                      <div className="user-detail-stat">
                        <span className="user-detail-stat-label">Trust Score</span>
                        <span className={(detailUser.trust_score ?? 0) < 0 ? 'trust-negative' : 'trust-positive'}>
                          {detailUser.trust_score ?? 0}
                        </span>
                      </div>
                      <div className="user-detail-stat">
                        <span className="user-detail-stat-label">Warnings</span>
                        <span>{detailUser.warning_count ?? 0} / {detailUser.max_warnings ?? 3}</span>
                      </div>
                      <div className="user-detail-stat">
                        <span className="user-detail-stat-label">Borrows</span>
                        <span>{detailUser.borrow_count ?? 0}</span>
                      </div>
                      <div className="user-detail-stat">
                        <span className="user-detail-stat-label">On-Time</span>
                        <span>{detailUser.on_time_returns ?? 0}</span>
                      </div>
                    </div>
                    <div className="detail-group"><label>Email</label><p>{detailUser.email || '-'}</p></div>
                    <div className="detail-group"><label>Phone</label><p>{detailUser.phone_number || '-'}</p></div>
                    <div className="detail-group"><label>TUPT ID</label><p>{detailUser.tupt_id || detailUser.department || '-'}</p></div>
                    <div className="detail-group"><label>Section</label><p>{detailUser.section || '-'}</p></div>
                    <div className="detail-group"><label>Address</label><p>{detailUser.address || '-'}</p></div>
                    <div className="detail-group">
                      <label>Status</label>
                      <p>{detailUser.is_banned ? 'Banned' : detailUser.is_active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="detail-group">
                      <label>Member Since</label>
                      <p>{detailUser.created_at ? new Date(detailUser.created_at).toLocaleDateString() : '-'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {confirmBorrow && (
          <div className="modal-overlay" onClick={() => setConfirmBorrow(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Confirm Return</h2>
                <button className="close-btn" onClick={() => setConfirmBorrow(null)}>✕</button>
              </div>
              <div className="modal-body">
                <p><strong>Asset:</strong> {confirmBorrow.assetName}</p>
                <p><strong>Borrower:</strong> {getBorrowerName(confirmBorrow)}</p>
                {confirmBorrow.return_notes && (
                  <p><strong>User Notes:</strong> {confirmBorrow.return_notes}</p>
                )}
                <form onSubmit={handleConfirmReturn}>
                  <div className="form-group">
                    <label htmlFor="admin-condition">Asset Condition</label>
                    <select
                      id="admin-condition"
                      value={confirmData.condition}
                      onChange={(e) => setConfirmData(prev => ({ ...prev, condition: e.target.value }))}
                      required
                    >
                      <option value="good">Good (+10 condition)</option>
                      <option value="fair">Fair (+5 condition)</option>
                      <option value="poor">Poor (-5 condition)</option>
                      <option value="damaged">Damaged (-15 condition)</option>
                    </select>
                    <p className="form-hint">On-time return: +5 trust. Late return: -5 per day overdue. At -25 trust, score resets to 0 and counts as 1 warning (3 warnings = ban).</p>
                  </div>
                  <div className="form-group">
                    <label htmlFor="admin-notes">Admin Notes (optional)</label>
                    <textarea
                      id="admin-notes"
                      value={confirmData.notes}
                      onChange={(e) => setConfirmData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Inspection notes..."
                    />
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirmBorrow(null)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={confirmSubmitting}>
                      {confirmSubmitting ? 'Confirming...' : 'Confirm Return'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCondition(condition) {
  if (!condition) return 'Unknown';
  return condition.charAt(0).toUpperCase() + condition.slice(1);
}
