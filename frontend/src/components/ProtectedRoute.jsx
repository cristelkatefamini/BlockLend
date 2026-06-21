import { useAuth } from '../context/AuthContext';
import '../styles/ProtectedRoute.css';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="protected-error">
        <h2>Access Denied</h2>
        <p>You need to be logged in to access this page.</p>
        <a href="/" className="btn btn-primary">
          Go to Sign In
        </a>
      </div>
    );
  }

  return children;
}
