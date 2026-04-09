import { Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import NameEntryPage from './pages/NameEntryPage';
import Dashboard from './pages/Dashboard';
import Round1Page from './pages/Round1Page';
import Round2Page from './pages/Round2Page';
import Round3Page from './pages/Round3Page';
import WaitingScreen from './pages/WaitingScreen';
import AdminPanel from './pages/AdminPanel';
import './App.css';

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    console.error('App crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-center">
          <div className="glass-card-static" style={{ maxWidth: 560, padding: '2rem' }}>
            <h1 className="heading-lg" style={{ marginBottom: '0.75rem' }}>
              <span className="text-gradient-vibrant">App Error</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1rem' }}>
              Something in the page tree crashed before it could render. Open the browser console
              for the exact error, or send me the stack trace and I’ll fix it with you.
            </p>
            <pre style={{
              margin: 0,
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(0, 0, 0, 0.35)',
              color: 'var(--text-primary)',
              overflowX: 'auto',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {String(this.state.error?.message || this.state.error || 'Unknown error')}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function ProtectedRoute({ children }) {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // If user needs to set their name (first login)
  if (userData && !userData.nameSet && !userData.name && userData.needsName) {
    return <Navigate to="/name-entry" />;
  }

  return children;
}

function AdminRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (!currentUser || !isAdmin) {
    return <Navigate to="/login" />;
  }

  return children;
}

function AuthRoute({ children }) {
  const { currentUser, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  if (currentUser) {
    if (isAdmin) return <Navigate to="/admin" />;
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AuthRoute>
            <LoginPage />
          </AuthRoute>
        }
      />
      <Route
        path="/name-entry"
        element={
          <ProtectedRoute>
            <NameEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/round1"
        element={
          <ProtectedRoute>
            <Round1Page />
          </ProtectedRoute>
        }
      />
      <Route
        path="/round2"
        element={
          <ProtectedRoute>
            <Round2Page />
          </ProtectedRoute>
        }
      />
      <Route
        path="/round3"
        element={
          <ProtectedRoute>
            <Round3Page />
          </ProtectedRoute>
        }
      />
      <Route
        path="/waiting"
        element={
          <ProtectedRoute>
            <WaitingScreen />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPanel />
          </AdminRoute>
        }
      />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <div className="app-bg" />
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}

export default App;
