import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasFirebaseConfig } from '../firebase';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const rollPattern = /^[A-Za-z0-9._-]+$/;

export default function LoginPage() {
  const [authView, setAuthView] = useState('login');
  const [rollNumber, setRollNumber] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [college, setCollege] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('admin@contest.com');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, adminLogin } = useAuth();

  function validateRollNumber(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new Error('Roll number is required');
    }
    if (!rollPattern.test(trimmed)) {
      throw new Error('Roll number can only use letters, numbers, dots, underscores, and hyphens');
    }
    return trimmed;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authView === 'admin') {
        if (!emailPattern.test(adminEmail.trim())) {
          throw new Error('Enter a valid admin email');
        }
        await adminLogin(adminEmail.trim(), password);
      } else if (authView === 'register') {
        const normalizedRoll = validateRollNumber(rollNumber);
        const normalizedName = participantName.trim();
        const normalizedContact = contactNumber.trim();
        const normalizedEmail = email.trim();
        const normalizedCollege = college.trim();

        if (normalizedName.length < 2) {
          throw new Error('Please enter your full name');
        }
        if (normalizedContact.length < 6) {
          throw new Error('Please enter a valid contact number');
        }
        if (!emailPattern.test(normalizedEmail)) {
          throw new Error('Please enter a valid email address');
        }
        if (normalizedCollege.length < 2) {
          throw new Error('Please enter your college name');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        await register({
          rollNumber: normalizedRoll,
          name: normalizedName,
          contactNumber: normalizedContact,
          email: normalizedEmail,
          college: normalizedCollege,
          password,
        });
      } else {
        const normalizedRoll = validateRollNumber(rollNumber);
        const normalizedName = participantName.trim();

        if (normalizedName.length < 2) {
          throw new Error('Please enter your full name');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        await login(normalizedRoll, normalizedName, password);
      }
    } catch (err) {
      if (authView === 'admin') {
        setError(
          err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
            ? 'Invalid admin email or password'
            : err.message || 'Admin login failed'
        );
      } else if (authView === 'register') {
        setError(
          err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
            ? 'That roll number already exists. Try logging in with the same roll number, name, and password.'
            : err.message || 'Registration failed'
        );
      } else {
        setError(
          err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
            ? 'Invalid roll number, name, or password'
            : err.message || 'Login failed'
        );
      }
    }

    setLoading(false);
  }

  const isAdmin = authView === 'admin';
  const isRegister = authView === 'register';

  return (
    <div className="page-center">
      <div className="glass-card-static" style={{ width: '100%', maxWidth: 480, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
              fontSize: '1.5rem',
              fontWeight: 800,
            }}
          >
            AI
          </div>
          <h1 className="heading-lg">
            <span className="text-gradient">Develop in Dark</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '0.9rem' }}>
            AI Competition Platform
          </p>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.8rem', lineHeight: 1.5 }}>
            {isAdmin
              ? 'Admin sign in'
              : isRegister
                ? 'Create your participant profile'
                : 'Sign in with roll number, full name, and password'}
          </p>
        </div>

        {!hasFirebaseConfig && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(253, 203, 110, 0.12)',
              border: '1px solid rgba(253, 203, 110, 0.35)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--warning)',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              lineHeight: 1.5,
            }}
          >
            Firebase is not configured yet. Add the values in <code>.env</code> to enable login,
            registration, Firestore, and realtime updates.
          </div>
        )}

        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`tab ${!isAdmin && !isRegister ? 'active' : ''}`}
            onClick={() => {
              setAuthView('login');
              setError('');
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={`tab ${!isAdmin && isRegister ? 'active' : ''}`}
            onClick={() => {
              setAuthView('register');
              setError('');
            }}
          >
            Register
          </button>
          <button
            type="button"
            className={`tab ${isAdmin ? 'active' : ''}`}
            onClick={() => {
              setAuthView('admin');
              setError('');
            }}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isAdmin ? (
            <>
              <div className="input-group">
                <label htmlFor="adminEmail">Admin Email</label>
                <input
                  id="adminEmail"
                  type="email"
                  className="input-field"
                  placeholder="admin@contest.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="input-group">
                <label htmlFor="adminPassword">Password</label>
                <input
                  id="adminPassword"
                  type="password"
                  className="input-field"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label htmlFor="rollNumber">Roll Number</label>
                <input
                  id="rollNumber"
                  type="text"
                  className="input-field"
                  placeholder="e.g. 201"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>

              <div className="input-group">
                <label htmlFor="participantName">Full Name</label>
                <input
                  id="participantName"
                  type="text"
                  className="input-field"
                  placeholder="Enter your full name"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  required
                  autoComplete="name"
                />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 6 }}>
                  Required for participant login and registration.
                </p>
              </div>

              {isRegister && (
                <>
                  <div className="input-group">
                    <label htmlFor="contactNumber">Contact Number</label>
                    <input
                      id="contactNumber"
                      type="tel"
                      className="input-field"
                      placeholder="Enter your contact number"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                      required
                      autoComplete="tel"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      className="input-field"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="college">College</label>
                    <input
                      id="college"
                      type="text"
                      className="input-field"
                      placeholder="Enter your college name"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      required
                      autoComplete="organization"
                    />
                  </div>
                </>
              )}

              <div className="input-group">
                <label htmlFor="password">{isRegister ? 'Create Password' : 'Password'}</label>
                <input
                  id="password"
                  type="password"
                  className="input-field"
                  placeholder={isRegister ? 'Create a password' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm"></span>
                {isAdmin ? 'Signing in...' : isRegister ? 'Creating account...' : 'Signing in...'}
              </>
            ) : isAdmin ? (
              'Admin Sign In'
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
          }}
        >
          Secure, real-time, and competition-ready
        </p>
      </div>
    </div>
  );
}
