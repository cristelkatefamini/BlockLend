import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userAPI } from '../../utils/api';
import '../../styles/pages/Admin.css';

export default function AdminUsersManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resettingId, setResettingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }

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

  const handleToggleStatus = async (userId) => {
    try {
      await userAPI.toggleUserStatus(userId);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError('Failed to update user status');
    }
  };

  const handleResetWarnings = async (userId, username) => {
    if (!window.confirm(`Reset warnings for "${username}"? This will set their warning count back to 0.`)) {
      return;
    }

    try {
      setResettingId(userId);
      setError('');
      await userAPI.resetUserWarnings(userId);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to reset warnings');
    } finally {
      setResettingId(null);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    const label = targetUser.username || targetUser.email || 'this user';
    const confirmed = window.confirm(
      `Permanently delete "${label}"?\n\nThis will remove their account, borrow history, trust points, notifications, and all related data. This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setDeletingId(targetUser.id);
      setError('');
      await userAPI.deleteUser(targetUser.id);
      await loadUsers();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <h1>User Management</h1>
          <p>Activate, deactivate, or permanently delete user accounts</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="borrow-table-wrapper">
            <table className="borrow-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Warnings</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.warning_count ?? 0} / {u.max_warnings ?? 3}</td>
                    <td>
                      {u.is_banned ? 'Banned' : u.is_active ? 'Active' : 'Inactive'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {(u.warning_count ?? 0) > 0 && u.role !== 'admin' && (
                          <button
                            type="button"
                            className="btn btn-edit btn-sm"
                            disabled={resettingId === u.id}
                            onClick={() => handleResetWarnings(u.id, u.username)}
                          >
                            {resettingId === u.id ? 'Resetting...' : 'Reset Warnings'}
                          </button>
                        )}
                        <button
                          type="button"
                          className={u.is_active ? 'btn btn-secondary btn-sm' : 'btn btn-success btn-sm'}
                          onClick={() => handleToggleStatus(u.id)}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        {u.role !== 'admin' && u.id !== user?.id && (
                          <button
                            type="button"
                            className="btn-delete btn-sm"
                            disabled={deletingId === u.id}
                            onClick={() => handleDeleteUser(u)}
                          >
                            {deletingId === u.id ? 'Deleting...' : 'Delete'}
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
    </div>
  );
}
