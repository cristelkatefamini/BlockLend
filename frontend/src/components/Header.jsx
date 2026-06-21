import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">⛓️</span>
          <span className="logo-text">BlockLend</span>
        </Link>

        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/home" className="nav-link">Home</Link>
              <Link to="/assets" className="nav-link">Assets</Link>
              {user?.role !== 'admin' && (
                <Link to="/borrow-history" className="nav-link">Borrow History</Link>
              )}
              {user?.role === 'admin' && (
                <div className="admin-menu">
                  <span className="nav-link admin-label">Admin</span>
                  <div className="admin-dropdown">
                    <Link to="/admin/dashboard" className="dropdown-link">Dashboard</Link>
                    <Link to="/admin/borrow-requests" className="dropdown-link">Borrow Requests</Link>
                    <Link to="/admin/assets" className="dropdown-link">Assets Management</Link>
                  </div>
                </div>
              )}
              <Link to="/profile" className="nav-link">Profile</Link>
              <Link to="/about" className="nav-link">About</Link>
            </>
          ) : (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/about" className="nav-link">About</Link>
            </>
          )}
        </nav>

        <div className="user-section">
          {isAuthenticated ? (
            <>
              <span className="user-greeting">Welcome, {user?.username}</span>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
