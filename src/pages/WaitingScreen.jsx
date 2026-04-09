import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ParticipantIdentity from '../components/ParticipantIdentity';

export default function WaitingScreen() {
  const { userData, logout } = useAuth();
  const [adminControls, setAdminControls] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'adminControls', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminControls(data);

        // Auto-redirect when round becomes active
        if (data.round1Active && !userData?.round1Submitted) {
          navigate('/round1');
        } else if (data.round2Active && !userData?.round2Submitted) {
          navigate('/round2');
        } else if (data.round3Active && !userData?.round3Submitted) {
          navigate('/round3');
        }
      }
    });
    return () => unsub();
  }, [navigate, userData]);

  return (
    <div className="page-wrapper">
      {/* Header */}
      <header style={{
        padding: '1rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-card)',
        backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.85rem', fontWeight: 800
          }}>AI</div>
          <span style={{ fontWeight: 700, fontSize: '1.05rem' }}>
            Develop in Dark
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ParticipantIdentity name={userData?.name} rollNumber={userData?.rollNumber} />
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="waiting-container">
        {/* Animated background orbs */}
        <div style={{ position: 'relative' }}>
          <div className="waiting-orb" />
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
            <div className="pulse-ring" />
          </div>
        </div>

        <h2 className="heading-xl">
          <span className="text-gradient">Waiting for Next Round</span>
        </h2>

        <p style={{
          color: 'var(--text-secondary)',
          maxWidth: 450,
          textAlign: 'center',
          lineHeight: 1.7,
          fontSize: '1rem'
        }}>
          The admin hasn't activated the next round yet. 
          Sit tight — the competition will continue shortly!
        </p>

        {/* Status indicators */}
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center'
        }}>
          {[1, 2, 3].map((r) => {
            const isActive = adminControls?.[`round${r}Active`];
            const isSubmitted = userData?.[`round${r}Submitted`];
            return (
              <div key={r} style={{
                padding: '12px 20px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isSubmitted ? 'var(--success)' : isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 0 10px var(--accent-glow)' : 'none',
                }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Round {r}
                </span>
                <span className={`badge ${
                  isSubmitted ? 'badge-active' : isActive ? 'badge-info' : 'badge-inactive'
                }`} style={{ fontSize: '0.6rem' }}>
                  {isSubmitted ? 'Done' : isActive ? 'Live' : 'Locked'}
                </span>
              </div>
            );
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          color: 'var(--text-muted)', fontSize: '0.8rem',
          marginTop: '1rem'
        }}>
          <div className="spinner spinner-sm" />
          Listening for updates...
        </div>
      </div>
    </div>
  );
}
