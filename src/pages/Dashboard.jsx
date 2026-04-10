import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import ParticipantIdentity from '../components/ParticipantIdentity';

export default function Dashboard() {
  const { userData, logout } = useAuth();
  const [adminControls, setAdminControls] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'adminControls', 'main'), (snap) => {
      if (snap.exists()) {
        setAdminControls(snap.data());
      }
    });
    return () => unsub();
  }, []);

  function handleRoundClick(round) {
    if (!adminControls) return;
    if (round === 1 && adminControls.round1Active) {
      if (userData?.round1Submitted) {
        return; // Already submitted
      }
      navigate('/round1');
    }
    if (round === 2 && adminControls.round2Active) {
      if (userData?.round2Submitted) return;
      navigate('/round2');
    }
    if (round === 3 && adminControls.round3Active) {
      if (userData?.round3Submitted) return;
      navigate('/round3');
    }
  }

  function getRoundStatus(round) {
    if (!adminControls) return 'locked';
    const roundKey = `round${round}Active`;
    const submittedKey = `round${round}Submitted`;

    if (userData?.[submittedKey]) return 'completed';
    if (adminControls[roundKey]) return 'active';
    return 'locked';
  }

  const rounds = [
    {
      num: 1,
      title: 'Scenario to Image',
      desc: 'Generate an image by writing the best prompt based on a given scenario.',
      icon: '🖼️',
      gradient: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
    },
    {
      num: 2,
      title: '8 Task Challenges',
      desc: 'Complete 8 locked prompt-writing tasks. Each task runs for 2 minutes.',
      icon: '⚡',
      gradient: 'linear-gradient(135deg, #e84393, #fd79a8)',
    },
    {
      num: 3,
      title: 'AI Knowledge Quiz',
      desc: 'Answer 21 MCQs in 25 minutes.',
      icon: '🧠',
      gradient: 'linear-gradient(135deg, #00cec9, #00b894)',
    },
  ];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <ParticipantIdentity name={userData?.name} rollNumber={userData?.rollNumber} />
          <button className="btn btn-secondary btn-sm" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container" style={{ padding: '2rem 1.5rem', flex: 1 }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 className="heading-xl slide-up">
            Welcome back, <span className="text-gradient">{userData?.name?.split(' ')[0] || 'Participant'}</span>
          </h1>
          <p className="slide-up stagger-1" style={{ color: 'var(--text-secondary)', marginTop: 8, fontSize: '1rem' }}>
            {adminControls
              ? `Currently on Round ${adminControls.currentRound || 1}`
              : 'Loading competition status...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="slide-up stagger-2" style={{ marginBottom: '2.5rem' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginBottom: 8, fontSize: '0.85rem', color: 'var(--text-secondary)'
          }}>
            <span>Your Progress</span>
            <span>
              {[1, 2, 3].filter(r => userData?.[`round${r}Submitted`]).length}/3 Rounds
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${([1, 2, 3].filter(r => userData?.[`round${r}Submitted`]).length / 3) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Round Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem'
        }}>
          {rounds.map((round, i) => {
            const status = getRoundStatus(round.num);
            return (
              <div
                key={round.num}
                className={`glass-card slide-up stagger-${i + 3}`}
                style={{
                  padding: '1.75rem',
                  cursor: status === 'active' ? 'pointer' : 'default',
                  opacity: status === 'locked' ? 0.5 : 1,
                  position: 'relative',
                  overflow: 'hidden',
                }}
                onClick={() => handleRoundClick(round.num)}
              >
                {/* Gradient accent */}
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, height: 3,
                  background: round.gradient,
                  opacity: status === 'active' ? 1 : 0.3,
                }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'var(--bg-glass)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.5rem'
                  }}>
                    {round.icon}
                  </div>
                  <span className={`badge ${
                    status === 'completed' ? 'badge-active' :
                    status === 'active' ? 'badge-info' : 'badge-inactive'
                  }`}>
                    {status === 'completed' ? '✓ Done' :
                     status === 'active' ? 'Active' : 'Locked'}
                  </span>
                </div>

                <h3 className="heading-md" style={{ marginBottom: 6 }}>
                  Round {round.num}: {round.title}
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.5 }}>
                  {round.desc}
                </p>

                {status === 'active' && (
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                    Start Round →
                  </button>
                )}
                {status === 'completed' && (
                  <div style={{
                    marginTop: '1rem', padding: '10px',
                    background: 'rgba(0, 206, 201, 0.1)',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    color: 'var(--success)',
                    fontSize: '0.85rem', fontWeight: 600
                  }}>
                    ✓ Submitted Successfully
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
