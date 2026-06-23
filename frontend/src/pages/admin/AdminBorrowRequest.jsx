import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../../styles/pages/Admin.css';

export default function AdminBorrowRequest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [borrows, setBorrows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/home');
      return;
    }

    loadBorrowRequests();
  }, [user, navigate]);

  const loadBorrowRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/borrow', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load borrow requests (${response.status})`);
      }

      const data = await response.json();
      const requestList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setBorrows(requestList);
    } catch (err) {
      console.error('Failed to load borrow requests:', err);
      setBorrows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (borrowId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/borrow/${borrowId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to approve borrow request');
      }

      await loadBorrowRequests();
    } catch (err) {
      console.error('Failed to approve:', err);
      alert('Failed to approve borrow request.');
    }
  };

  const handleDecline = async (borrowId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/borrow/${borrowId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to decline borrow request');
      }

      await loadBorrowRequests();
    } catch (err) {
      console.error('Failed to decline:', err);
      alert('Failed to decline borrow request.');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': 'status-pending',
      'approved': 'status-approved',
      'declined': 'status-declined',
      'active': 'status-active',
      'returned': 'status-returned',
    };
    return statusColors[status] || 'status-default';
  };

  const filteredBorrows = borrows.filter(borrow => {
    if (filter === 'all') return true;
    return borrow.status === filter;
  });

  return (
    <div className="admin-container">
      <div className="container">
        <div className="admin-header">
          <h1>Borrow Requests Management</h1>
          <p>Review and manage all borrow requests</p>
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
              <option value="approved">Approved</option>
              <option value="declined">Declined</option>
              <option value="active">Active</option>
              <option value="returned">Returned</option>
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
                  <th>Asset</th>
                  <th>Request Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBorrows.map(borrow => (
                  <tr key={borrow.id || borrow._id}>
                    <td>{borrow.borrowerName || borrow.borrowerId || 'Unknown'}</td>
                    <td>{borrow.assetName || 'Unknown Asset'}</td>
                    <td>{borrow.requestDate ? new Date(borrow.requestDate).toLocaleString() : 'N/A'}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadge(borrow.status)}`}>
                        {borrow.status}
                      </span>
                    </td>
                    <td className="action-buttons">
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
                      {borrow.status !== 'pending' && (
                        <span className="action-status">{borrow.status}</span>
                      )}
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
