import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../utils/api';
import { formatRelativeTime } from '../utils/time';
import '../styles/Header.css';

const NOTIFICATION_LABELS = {
  account_update: 'Account',
  borrow_request: 'Borrow',
  borrow_approved: 'Borrow',
  borrow_declined: 'Borrow',
  return_submitted: 'Borrow',
  return_confirmed: 'Borrow',
  borrow_history: 'History',
  due_tomorrow: 'Reminder',
  warning: 'Warning',
  account_ban: 'Banned',
};

export default function Header() {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef(null);
  const [, timeTick] = useState(0);

  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    if (!isAuthenticated) return;

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  useEffect(() => {
    const interval = setInterval(() => timeTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.data?.unread_count || 0);
    } catch {
      // silently ignore
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data?.notifications || []);
      setUnreadCount(response.data?.unread_count || 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const toggleNotifications = async () => {
    const next = !showNotifications;
    setShowNotifications(next);
    if (next) {
      await fetchNotifications();
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const navClass = ({ isActive }) =>
    `nav-link${isActive ? ' nav-link--active' : ''}`;

  return (
    <header className="header">
      <div className="header-container">
        <Link to={isAuthenticated ? '/' : '/'} className="logo">
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
              <NavLink to="/" end className={navClass}>Home</NavLink>
              <NavLink to="/assets" className={navClass}>Assets</NavLink>
              <NavLink to="/transactions" className={navClass}>Transactions</NavLink>
              {user?.role === 'admin' && (
                <div className={`admin-menu${isAdminRoute ? ' admin-menu--active' : ''}`}>
                  <span className="nav-link admin-label">Admin</span>
                  <div className="admin-dropdown">
                    <Link to="/admin/dashboard" className="dropdown-link">Dashboard</Link>
                    <Link to="/admin/borrow-requests" className="dropdown-link">Borrow Requests</Link>
                    <Link to="/admin/assets" className="dropdown-link">Assets Management</Link>
                    <Link to="/admin/users" className="dropdown-link">Users Management</Link>
                    <Link to="/admin/blockchain" className="dropdown-link">Blockchain</Link>
                  </div>
                </div>
              )}
              <NavLink to="/profile" className={navClass}>Profile</NavLink>
              <NavLink to="/about" className={navClass}>About</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/" end className={navClass}>Home</NavLink>
              <NavLink to="/about" className={navClass}>About</NavLink>
            </>
          )}
        </nav>

        <div className="user-section">
          {isAuthenticated ? (
            <>
              {user?.role !== 'admin' && (
                <div className="notification-menu" ref={notificationRef}>
                  <button
                    type="button"
                    className="notification-bell"
                    onClick={toggleNotifications}
                    aria-label="Notifications"
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                    )}
                  </button>
                  {showNotifications && (
                    <div className="notification-dropdown">
                      <div className="notification-dropdown-header">
                        <span>Notifications</span>
                        {unreadCount > 0 && (
                          <button type="button" className="mark-all-read" onClick={handleMarkAllRead}>
                            Mark all read
                          </button>
                        )}
                      </div>
                      <div className="notification-list">
                        {loadingNotifications ? (
                          <div className="notification-empty">Loading...</div>
                        ) : notifications.length === 0 ? (
                          <div className="notification-empty">No activity yet</div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              className={`notification-item ${n.read ? '' : 'notification-item--unread'}`}
                              onClick={() => !n.read && handleMarkAsRead(n.id)}
                            >
                              <div className="notification-item-header">
                                <span className="notification-item-type">
                                  {NOTIFICATION_LABELS[n.type] || 'Update'}
                                </span>
                                <span className="notification-item-time">
                                  {formatRelativeTime(n.created_at)}
                                </span>
                              </div>
                              <div className="notification-item-title">{n.title}</div>
                              <div className="notification-item-message">{n.message}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
