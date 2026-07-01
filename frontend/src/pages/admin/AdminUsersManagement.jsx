import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import { exportUsersPDF } from '../../utils/pdfReport';
import '../../styles/pages/Admin.css';
import '../../styles/pages/AdminUsers.css';

export default function AdminUsersManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search / filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');   // all | admin | user
  const [verifyFilter, setVerifyFilter] = useState('all'); // all | verified | unverified

  // Action loading states
  const [resettingId, setResettingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [notifyingId, setNotifyingId] = useState(null);

  // Verify modal — step 1: profile preview
  const [verifyTarget, setVerifyTarget] = useState(null);   // user object
  // Verify modal — step 2: confirmation
  const [confirmVerify, setConfirmVerify] = useState(false);
  // Detail modal — read-only profile popup (clicking username)
  const [detailTarget, setDetailTarget] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/home'); return; }
    loadUsers();
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getAllUsers();
      setUsers(response.data?.users || response.data || []);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // ── filtered list ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (verifyFilter === 'verified' && !u.kyc_verified) return false;
      if (verifyFilter === 'unverified' && u.kyc_verified) return false;
      if (!term) return true;
      return (
        u.username?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.full_name?.toLowerCase().includes(term) ||
        u.section?.toLowerCase().includes(term)
      );
    });
  }, [users, search, roleFilter, verifyFilter]);

  // ── actions ───────────────────────────────────────────────────
  const handleToggleStatus = async (userId) => {
    try { await userAPI.toggleUserStatus(userId); await loadUsers(); }
    catch { setError('Failed to update user status'); }
  };

  const handleResetWarnings = async (userId, username) => {
    if (!window.confirm(`Reset warnings for "${username}"?`)) return;
    try {
      setResettingId(userId);
      await userAPI.resetUserWarnings(userId);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset warnings');
    } finally { setResettingId(null); }
  };

  const handleDeleteUser = async (targetUser) => {
    const label = targetUser.username || targetUser.email;
    if (!window.confirm(`Permanently delete "${label}"? This cannot be undone.`)) return;
    try {
      setDeletingId(targetUser.id);
      await userAPI.deleteUser(targetUser.id);
      await loadUsers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete user');
    } finally { setDeletingId(null); }
  };

  const handleNotifyCredentials = async (userId) => {
    try {
      setNotifyingId(userId);
      await userAPI.notifyCredentials(userId);
      alert('Notification sent to user.');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to send notification.');
    } finally { setNotifyingId(null); }
  };

  // Step 1 — open profile preview modal
  const openVerifyModal = (u) => {
    setVerifyTarget(u);
    setConfirmVerify(false);
  };

  // Step 2 — admin clicked "Verify" in profile preview → show confirmation
  const handleVerifyClick = () => setConfirmVerify(true);

  // Step 2 confirmed — actually verify
  const handleConfirmVerify = async () => {
    if (!verifyTarget) return;
    try {
      setVerifyingId(verifyTarget.id);
      await userAPI.verifyUser(verifyTarget.id);
      await loadUsers();
      setVerifyTarget(null);
      setConfirmVerify(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to verify user.');
    } finally { setVerifyingId(null); }
  };

  const handleUnverify = async (userId) => {
    if (!window.confirm('Remove verification from this user?')) return;
    try {
      await userAPI.unverifyUser(userId);
      await loadUsers();
      setVerifyTarget(null);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to unverify user.');
    }
  };

  // ── helpers ───────────────────────────────────────────────────
  const hasCredentials = (u) =>
    u.full_name?.trim() && u.section?.trim();

  const totalVerified   = users.filter(u => u.role === 'user' && u.kyc_verified).length;
  const totalUnverified = users.filter(u => u.role === 'user' && !u.kyc_verified).length;

  return (
    <div className="admin-container">
      <div className="container">

        {/* Header */}
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>User Management</h1>
              <p>Verify MTICS members, manage accounts</p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportUsersPDF(users)}
              disabled={loading || users.length === 0}
            >
              ⬇ Export PDF
            </button>
          </div>
        </div>

        {/* Verification summary */}
        <div className="user-verify-summary">
          <div className="verify-stat">
            <span className="verify-stat-val verify-stat-val--green">{totalVerified}</span>
            <span className="verify-stat-label">Verified</span>
          </div>
          <div className="verify-stat">
            <span className="verify-stat-val verify-stat-val--orange">{totalUnverified}</span>
            <span className="verify-stat-label">Unverified</span>
          </div>
          <div className="verify-stat">
            <span className="verify-stat-val">{users.filter(u => u.role === 'user').length}</span>
            <span className="verify-stat-label">Total Users</span>
          </div>
        </div>

        {/* Search & filter */}
        <div className="filter-section">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search by name, username, email, section…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>Role</label>
            <select className="filter-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Verification</label>
            <select className="filter-select" value={verifyFilter} onChange={e => setVerifyFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>

        {error && <div className="error-message"><p>⚠ {error}</p></div>}

        {loading ? (
          <div className="loading-state"><div className="spinner"></div><p>Loading users…</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h2>No Users Found</h2>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="borrow-table-wrapper">
            <table className="borrow-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Section</th>
                  <th>Role</th>
                  <th>Warnings</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button
                        type="button"
                        className="borrower-link"
                        onClick={() => setDetailTarget(u)}
                      >
                        {u.username}
                      </button>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.full_name || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td>{u.section || <span style={{ color: '#bbb' }}>—</span>}</td>
                    <td>{u.role}</td>
                    <td>{u.warning_count ?? 0} / {u.max_warnings ?? 3}</td>
                    <td>
                      {u.role === 'admin' ? (
                        <span style={{ color: '#aaa', fontSize: '0.8rem' }}>N/A</span>
                      ) : u.kyc_verified ? (
                        <span className="verify-badge verify-badge--yes">✓ Verified</span>
                      ) : (
                        <span className="verify-badge verify-badge--no">✗ Unverified</span>
                      )}
                    </td>
                    <td>
                      {u.is_banned ? 'Banned' : u.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {/* Verify button — users only */}
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn-verify"
                            onClick={() => openVerifyModal(u)}
                          >
                            {u.kyc_verified ? 'View / Unverify' : 'Verify'}
                          </button>
                        )}

                        {/* Reset warnings */}
                        {(u.warning_count ?? 0) > 0 && u.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn-edit btn-sm"
                            disabled={resettingId === u.id}
                            onClick={() => handleResetWarnings(u.id, u.username)}
                          >
                            {resettingId === u.id ? '…' : 'Reset Warnings'}
                          </button>
                        )}

                        {/* Toggle active */}
                        <button
                          type="button"
                          className={u.is_active ? 'btn btn-secondary btn-sm' : 'btn btn-success btn-sm'}
                          onClick={() => handleToggleStatus(u.id)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>

                        {/* Delete */}
                        {u.role !== 'admin' && u.id !== user?.id && (
                          <button
                            type="button"
                            className="btn-delete"
                            disabled={deletingId === u.id}
                            onClick={() => handleDeleteUser(u)}
                          >
                            {deletingId === u.id ? '…' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL STEP 1: Profile preview ── */}
      {verifyTarget && !confirmVerify && (
        <div className="modal-overlay" onClick={() => setVerifyTarget(null)}>
          <div className="modal-content verify-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Profile — {verifyTarget.username}</h2>
              <button className="close-btn" onClick={() => setVerifyTarget(null)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Avatar */}
              <div className="verify-modal-avatar">
                {verifyTarget.profile_image
                  ? <img src={verifyTarget.profile_image} alt={verifyTarget.username} />
                  : <span>{(verifyTarget.username || 'U').charAt(0).toUpperCase()}</span>
                }
              </div>

              {/* Info grid */}
              <div className="verify-info-grid">
                <div className="verify-info-item">
                  <label>Username</label>
                  <p>{verifyTarget.username}</p>
                </div>
                <div className="verify-info-item">
                  <label>Email</label>
                  <p>{verifyTarget.email}</p>
                </div>
                <div className="verify-info-item">
                  <label>Full Name</label>
                  <p>{verifyTarget.full_name || <span className="verify-missing">Not filled in</span>}</p>
                </div>
                <div className="verify-info-item">
                  <label>Section</label>
                  <p>{verifyTarget.section || <span className="verify-missing">Not filled in</span>}</p>
                </div>
                <div className="verify-info-item">
                  <label>Phone Number</label>
                  <p>{verifyTarget.phone_number || <span className="verify-missing">Not filled in</span>}</p>
                </div>
                <div className="verify-info-item">
                  <label>Address</label>
                  <p>{verifyTarget.address || <span className="verify-missing">Not filled in</span>}</p>
                </div>
                <div className="verify-info-item">
                  <label>Trust Score</label>
                  <p>{verifyTarget.trust_score ?? 0}</p>
                </div>
                <div className="verify-info-item">
                  <label>Current Status</label>
                  <p>
                    {verifyTarget.kyc_verified
                      ? <span className="verify-badge verify-badge--yes">✓ Verified</span>
                      : <span className="verify-badge verify-badge--no">✗ Unverified</span>
                    }
                  </p>
                </div>
              </div>

              {/* Warning if credentials missing */}
              {!hasCredentials(verifyTarget) && (
                <div className="verify-warning-box">
                  <strong>⚠ Incomplete Profile</strong>
                  <p>This user hasn't filled in their Full Name and Section yet. Verification is not available until they complete their profile.</p>
                </div>
              )}

              <div className="modal-footer">
                {/* Notify to fill credentials */}
                {!hasCredentials(verifyTarget) && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={notifyingId === verifyTarget.id}
                    onClick={() => handleNotifyCredentials(verifyTarget.id)}
                  >
                    {notifyingId === verifyTarget.id ? 'Sending…' : '🔔 Notify to Fill Credentials'}
                  </button>
                )}

                {/* Unverify */}
                {verifyTarget.kyc_verified && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleUnverify(verifyTarget.id)}
                  >
                    Remove Verification
                  </button>
                )}

                {/* Verify — only if credentials filled and not yet verified */}
                {!verifyTarget.kyc_verified && hasCredentials(verifyTarget) && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleVerifyClick}
                  >
                    Verify as MTICS Member
                  </button>
                )}

                <button type="button" className="btn btn-secondary" onClick={() => setVerifyTarget(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL: Read-only user profile (click username) ── */}
      {detailTarget && (
        <div className="modal-overlay" onClick={() => setDetailTarget(null)}>
          <div className="modal-content user-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>User Details</h2>
              <button className="close-btn" onClick={() => setDetailTarget(null)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Avatar */}
              <div className="user-detail-header">
                <div className="user-detail-avatar">
                  {detailTarget.profile_image
                    ? <img src={detailTarget.profile_image} alt={detailTarget.username} />
                    : <span>{(detailTarget.username || 'U').charAt(0).toUpperCase()}</span>
                  }
                </div>
                <div className="user-detail-heading">
                  <h3>
                    {detailTarget.full_name || detailTarget.username}
                    {detailTarget.kyc_verified && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', background: '#d4edda', color: '#155724', padding: '0.1rem 0.5rem', borderRadius: '999px', fontWeight: 600 }}>
                        ✓ Verified
                      </span>
                    )}
                  </h3>
                  <p>@{detailTarget.username}</p>
                  <span className={`user-detail-role role-${detailTarget.role || 'user'}`}>
                    {detailTarget.role || 'user'}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="user-detail-stats">
                <div className="user-detail-stat">
                  <span className="user-detail-stat-label">Trust Score</span>
                  <span className={(detailTarget.trust_score ?? 0) < 0 ? 'trust-negative' : 'trust-positive'}>
                    {detailTarget.trust_score ?? 0}
                  </span>
                </div>
                <div className="user-detail-stat">
                  <span className="user-detail-stat-label">Warnings</span>
                  <span>{detailTarget.warning_count ?? 0} / {detailTarget.max_warnings ?? 3}</span>
                </div>
                <div className="user-detail-stat">
                  <span className="user-detail-stat-label">Borrows</span>
                  <span>{detailTarget.borrow_count ?? 0}</span>
                </div>
                <div className="user-detail-stat">
                  <span className="user-detail-stat-label">On-Time</span>
                  <span>{detailTarget.on_time_returns ?? 0}</span>
                </div>
              </div>

              {/* Details */}
              <div className="detail-group"><label>Email</label><p>{detailTarget.email || '—'}</p></div>
              <div className="detail-group"><label>Phone</label><p>{detailTarget.phone_number || '—'}</p></div>
              <div className="detail-group"><label>Section</label><p>{detailTarget.section || '—'}</p></div>
              <div className="detail-group"><label>Address</label><p>{detailTarget.address || '—'}</p></div>
              <div className="detail-group">
                <label>Account Status</label>
                <p>{detailTarget.is_banned ? 'Banned' : detailTarget.is_active ? 'Active' : 'Inactive'}</p>
              </div>
              <div className="detail-group">
                <label>Member Since</label>
                <p>{detailTarget.created_at ? new Date(detailTarget.created_at).toLocaleDateString() : '—'}</p>
              </div>

              <div className="modal-footer">
                {/* Quick-access verify from detail modal */}
                {detailTarget.role !== 'admin' && (
                  <button
                    type="button"
                    className="btn-verify"
                    onClick={() => { setDetailTarget(null); openVerifyModal(detailTarget); }}
                  >
                    {detailTarget.kyc_verified ? 'View / Unverify' : 'Verify'}
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={() => setDetailTarget(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL STEP 2: Confirmation ── */}
      {verifyTarget && confirmVerify && (
        <div className="modal-overlay" onClick={() => setConfirmVerify(false)}>
          <div className="modal-content verify-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Verification</h2>
              <button className="close-btn" onClick={() => setConfirmVerify(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="verify-confirm-icon">🎓</div>
              <p className="verify-confirm-text">
                You are about to verify <strong>{verifyTarget.full_name || verifyTarget.username}</strong> as an
                official <strong>MTICS member</strong> and <strong>TUPT student</strong>.
              </p>
              <p className="verify-confirm-sub">
                Once verified, this user will be able to borrow assets from the system.
                Please confirm that you have personally validated their student credentials.
              </p>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setConfirmVerify(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={verifyingId === verifyTarget.id}
                  onClick={handleConfirmVerify}
                >
                  {verifyingId === verifyTarget.id ? 'Verifying…' : '✓ Confirm Verification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
