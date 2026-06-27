import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { borrowAPI, assetAPI } from '../utils/api';
import '../styles/pages/Home.css';

export default function Home() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentBorrows, setRecentBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [borrowRes, assetsRes] = await Promise.all([
        borrowAPI.getBorrowRequests(),
        assetAPI.getAssets(),
      ]);

      const borrows = Array.isArray(borrowRes.data)
        ? borrowRes.data
        : Array.isArray(borrowRes.data?.data)
          ? borrowRes.data.data
          : [];

      const assets = Array.isArray(assetsRes.data?.data)
        ? assetsRes.data.data
        : Array.isArray(assetsRes.data)
          ? assetsRes.data
          : [];

      setStats({
        totalAssets: assets.length,
        activeBorrows: borrows.filter(b => b.status === 'active').length,
        pendingRequests: borrows.filter(b => b.status === 'pending').length,
        completedBorrows: borrows.filter(b => b.status === 'completed').length,
      });

      setRecentBorrows(borrows.slice(0, 5));
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
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
    <div className="home-container page-container">
      <div className="container">
        {/* Welcome Section */}
        <section className="welcome-section">
          <div>
            <h1>Welcome, {user?.username}! 👋</h1>
            <p>
              {isAdmin
                ? 'Manage and oversee all assets and borrowing requests'
                : 'Browse assets and manage your borrowing requests'}
            </p>
          </div>
        </section>

        {/* Stats Grid */}
        {stats && (
          <section className="stats-section">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <h3>Total Assets</h3>
                <p className="stat-number">{stats.totalAssets}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <h3>Active Borrows</h3>
                <p className="stat-number">{stats.activeBorrows}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⏳</div>
              <div className="stat-content">
                <h3>Pending Requests</h3>
                <p className="stat-number">{stats.pendingRequests}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <h3>Completed</h3>
                <p className="stat-number">{stats.completedBorrows}</p>
              </div>
            </div>
          </section>
        )}

        {/* Error Message */}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* Recent Activity */}
        <section className="recent-section">
          <div className="section-header">
            <h2>Recent Borrow Requests</h2>
            <a href="/borrow-history" className="link-button">View All →</a>
          </div>

          {recentBorrows.length > 0 ? (
            <div className="borrow-table-wrapper">
              <table className="borrow-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Borrower</th>
                    <th>Status</th>
                    <th>Request Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBorrows.map(borrow => (
                    <tr key={borrow._id}>
                      <td>{borrow.assetName || 'N/A'}</td>
                      <td>{borrow.borrowerName || 'N/A'}</td>
                      <td>
                        <span className={`badge badge-${getBadgeColor(borrow.status)}`}>
                          {borrow.status}
                        </span>
                      </td>
                      <td>{new Date(borrow.requestDate).toLocaleDateString()}</td>
                      <td>
                        <a href={`/borrow-history`} className="action-link">View</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No borrow requests yet</p>
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-grid">
            {!isAdmin && (
              <a href="/assets" className="action-button">
                <span className="action-icon">🔍</span>
                <span>Browse Assets</span>
              </a>
            )}
            <a href="/profile" className="action-button">
              <span className="action-icon">👤</span>
              <span>My Profile</span>
            </a>
            <a href="/about" className="action-button">
              <span className="action-icon">ℹ️</span>
              <span>About BlockLend</span>
            </a>
          </div>
        </section>
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
