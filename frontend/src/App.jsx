import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentTitle from './components/DocumentTitle';

// Pages
import Landing from './pages/Landing';
import LandingLoggedIn from './pages/LandingLoggedIn';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Home from './pages/Home';
import Asset from './pages/Asset';
import BorrowHistory from './pages/BorrowHistory';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';
import About from './pages/About';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBorrowRequest from './pages/admin/AdminBorrowRequest';
import AdminAssetsManagement from './pages/admin/AdminAssetsManagement';
import AdminUsersManagement from './pages/admin/AdminUsersManagement';
import AdminBlockchain from './pages/admin/AdminBlockchain';

// Styles
import './styles/global.css';
import './App.css';

import { useAuth } from './context/AuthContext';

function AppLayout() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isPublicMarketingPage = ['/', '/register', '/verify-email'].includes(location.pathname) && !isAuthenticated;

  return (
    <div className="app">
      <DocumentTitle />
      {!isPublicMarketingPage && <Header />}

      <main className="main-content">
        <Routes>
              {/* Public Routes */}
              <Route path="/" element={isAuthenticated ? <LandingLoggedIn /> : <Landing />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/about" element={<About />} />

              {/* Protected Routes */}
              <Route
                path="/home"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/assets"
                element={
                  <ProtectedRoute>
                    <Asset />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/borrow-history"
                element={
                  <ProtectedRoute>
                    <BorrowHistory />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/transactions"
                element={
                  <ProtectedRoute>
                    <Transactions />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/borrow-requests"
                element={
                  <ProtectedRoute>
                    <AdminBorrowRequest />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/assets"
                element={
                  <ProtectedRoute>
                    <AdminAssetsManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <AdminUsersManagement />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/blockchain"
                element={
                  <ProtectedRoute>
                    <AdminBlockchain />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
      </main>

      {!isPublicMarketingPage && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </Router>
  );
}

export default App;