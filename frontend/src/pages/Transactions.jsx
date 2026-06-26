import { useEffect, useState } from 'react';
import { borrowAPI } from '../utils/api';
import '../styles/pages/Transactions.css';

const STATUS_COLORS = {
  pending: 'warning',
  active: 'info',
  return_pending: 'warning',
  completed: 'success',
  declined: 'danger',
  returned: 'success',
};

export default function Transactions() {
  const [borrows, setBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchActivity();
  }, []);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await borrowAPI.getBorrowHistory();
      const data = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
          ? res.data.data
          : [];
      setBorrows(data);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to load activity');
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter === 'all'
    ? borrows
    : borrows.filter(b => b.status === filter);

  const totalBorrows = borrows.length;
  const completed = borrows.filter(b => b.status === 'completed').length;
  const active = borrows.filter(b => ['active', 'approved'].includes(b.status)).length;
  const pending = borrows.filter(b => b.status === 'pending').length;

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
          <h1>Activity</h1>
          <p>A summary of all your borrow activity</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <div className="transaction-summary-grid">
          <div className="summary-card">
            <div className="summary-stat-value">{totalBorrows}</div>
            <div className="summary-stat-label">Total Borrows</div>
          </div>
          <div className="summary-card">
            <div className="summary-stat-value">{active}</div>
            <div className="summary-stat-label">Currently Active</div>
          </div>
          <div className="summary-card">
            <div className="summary-stat-value">{completed}</div>
            <div className="summary-stat-label">Completed</div>
          </div>
          <div className="summary-card">
            <div className="summary-stat-value">{pending}</div>
            <div className="summary-stat-label">Pending Approval</div>
          </div>
        </div>

        <div className="transactions-table-wrapper">
          <div className="transactions-table-header">
            <h3>Borrow Records</h3>
            <div className="filter-group">
              <select
                className="filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="return_pending">Pending Return</option>
                <option value="completed">Completed</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>

          {filtered.length > 0 ? (
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Qty</th>
                  <th>Borrow Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Status</th>
                  <th>Trust Points</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b._id || b.id}>
                    <td style={{ fontWeight: 600 }}>{b.assetName || 'Unknown Asset'}</td>
                    <td>{b.quantity ?? 1}</td>
                    <td>{b.borrowDate ? new Date(b.borrowDate).toLocaleDateString() : '-'}</td>
                    <td>{b.due_date ? new Date(b.due_date).toLocaleDateString() : '-'}</td>
                    <td>{b.returnDate ? new Date(b.returnDate).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge badge-${STATUS_COLORS[b.status] || 'info'}`}>
                        {b.status === 'return_pending' ? 'pending return' : b.status}
                      </span>
                    </td>
                    <td>
                      {b.status === 'completed' ? (
                        <span style={{
                          fontWeight: 600,
                          color: (b.trustPoints ?? 0) >= 0 ? 'var(--success)' : 'var(--danger)',
                        }}>
                          {(b.trustPoints ?? 0) > 0 ? '+' : ''}{b.trustPoints ?? 0}
                        </span>
                      ) : (
                        <span style={{ color: '#aaa' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <p>No records found{filter !== 'all' ? ` for status "${filter}"` : ''}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
