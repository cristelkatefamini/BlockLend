import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Header.css';

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <svg className="logo-icon" viewBox="0 0 32 36" aria-hidden="true">
            <path
              d="M16 1L2 8v12c0 9.5 6.2 18.3 14 21 7.8-2.7 14-11.5 14-21V8L16 1z"
              fill="currentColor"
            />
          </svg>
          <span className="logo-text">BlockLend</span>
        </Link>

        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/home" className="nav-link">Home</Link>
              <Link to="/assets" className="nav-link">Assets</Link>
              <Link to="/transactions" className="nav-link">Transactions</Link>
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
                    <Link to="/admin/users" className="dropdown-link">Users Management</Link>
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
            <Link to="/" className="btn btn-primary btn-sm">
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
