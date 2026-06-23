import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Register from './pages/Register';
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

// Styles
import './styles/global.css';
import './App.css';

function AppLayout() {
  const location = useLocation();
  const isPublicMarketingPage = ['/', '/register'].includes(location.pathname);

  return (
    <div className="app">
      {!isPublicMarketingPage && <Header />}

      <main className="main-content">
        <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/register" element={<Register />} />
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