import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { exportDashboardPDF } from '../../utils/pdfReport';
import '../../styles/pages/Admin.css';

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    assets: { total: 0, available: 0, unavailable: 0 },
    borrows: { total: 0, pending: 0, active: 0, returned: 0 },
    users: { total: 0, admins: 0, regular: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }

    // Load dashboard stats
    loadStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [user, navigate]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:8000/api/admin/stats', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadStats();
  };

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>Admin Dashboard</h1>
              <p>Welcome back, {user?.username}! Here's your system overview.</p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => exportDashboardPDF(stats)}
                disabled={loading}
              >
                ⬇ Export PDF
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleRefresh}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          {lastUpdated && (
            <p style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.5rem' }}>
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        {error && (
          <div className="error-message">
            <p>⚠️ {error}</p>
          </div>
        )}

        {loading && !stats.assets.total ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading dashboard stats...</p>
          </div>
        ) : (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <h3>Total Assets</h3>
                  <p className="stat-value">{stats.assets.total}</p>
                  <span className="stat-label">{stats.assets.available} available</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">📦</div>
                <div className="stat-content">
                  <h3>Total Borrows</h3>
                  <p className="stat-value">{stats.borrows.total}</p>
                  <span className="stat-label">All borrow transactions</span>
                </div>
              </div>

              <div className="stat-card pending">
                <div className="stat-icon">⏳</div>
                <div className="stat-content">
                  <h3>Pending Requests</h3>
                  <p className="stat-value">{stats.borrows.pending}</p>
                  <span className="stat-label">Awaiting your approval</span>
                </div>
              </div>

              <div className="stat-card active">
                <div className="stat-icon">✅</div>
                <div className="stat-content">
                  <h3>Active Loans</h3>
                  <p className="stat-value">{stats.borrows.active}</p>
                  <span className="stat-label">Currently borrowed items</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-content">
                  <h3>Total Users</h3>
                  <p className="stat-value">{stats.users.total}</p>
                  <span className="stat-label">{stats.users.regular} regular, {stats.users.admins} admin</span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon">🔄</div>
                <div className="stat-content">
                  <h3>Returned Items</h3>
                  <p className="stat-value">{stats.borrows.returned}</p>
                  <span className="stat-label">Successfully returned</span>
                </div>
              </div>
            </div>

            <div className="admin-actions">
              <div className="action-card">
                <h3>Quick Actions</h3>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/admin/borrow-requests')}
                >
                  View Borrow Requests ({stats.borrows.pending})
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate('/admin/assets')}
                >
                  Manage Assets ({stats.assets.total})
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
