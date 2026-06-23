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

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <h1>User Management</h1>
          <p>Activate or deactivate user accounts</p>
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
                    <td>{u.is_active ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button
                        className={u.is_active ? 'btn btn-secondary' : 'btn btn-success'}
                        onClick={() => handleToggleStatus(u.id)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
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
