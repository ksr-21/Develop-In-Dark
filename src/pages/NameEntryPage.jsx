import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function NameEntryPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { userData, setUserName } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Please enter your full name');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await setUserName(name.trim());
      navigate('/dashboard');
    } catch {
      setError('Failed to save name. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="page-center">
      <div className="glass-card-static slide-up" style={{ width: '100%', maxWidth: 480, padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', fontSize: '2rem'
          }}>
            👋
          </div>
          <h1 className="heading-lg" style={{ marginBottom: 8 }}>
            Welcome, <span className="text-gradient">Participant!</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Roll Number: <strong style={{ color: 'var(--accent-secondary)' }}>
              {userData?.rollNumber}
            </strong>
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Please enter your full name to get started
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              className="input-field"
              placeholder="e.g. Kunal Singh"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ fontSize: '1.1rem', padding: '16px' }}
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              fontSize: '0.85rem',
              marginBottom: '1rem'
            }}>
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
                Saving...
              </>
            ) : (
              'Continue to Competition →'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
