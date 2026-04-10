import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTabDetection from '../hooks/useTabDetection';

export default function Round1Page() {
  const { userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formOpened, setFormOpened] = useState(false);
  const [adminControls, setAdminControls] = useState(null);
  const navigate = useNavigate();
  const { tabSwitchCount, showWarning, dismissWarning } = useTabDetection();

  // Listen to admin controls for real-time round status
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'adminControls', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setAdminControls(data);
        if (!data.round1Active) {
          navigate('/dashboard');
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  // Check if already submitted
  useEffect(() => {
    if (userData?.round1Submitted) {
      setSubmitted(true);
    }
  }, [userData]);

  function handleOpenForm() {
    window.open('https://docs.google.com/forms/d/e/1FAIpQLSc_sb8TPup4blj-AUmZu3S4aK92xQVs0X_Eu1QicwLh86oxQg/viewform?usp=publish-editor', '_blank');
    setFormOpened(true);
  }

  async function handleSubmit() {
    if (loading || submitted || userData?.round1Submitted) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userData.rollNumber), {
        round1Submitted: true,
        round1SubmittedAt: new Date().toISOString(),
        round1TabSwitches: tabSwitchCount,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit:', err);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="page-wrapper">
        <WaitingScreen
          title="Round 1 Complete!"
          message="Your prompt has been submitted. Wait for the admin to activate Round 2."
          onBack={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  // The competition image - using a placeholder for now
  const imageUrl = adminControls?.round1ImageUrl || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80';

  return (
    <div className="page-wrapper">
      {/* Tab switch warning */}
      {showWarning && (
        <div className="tab-warning-overlay">
          <div className="tab-warning-content">
            <h2 className="heading-lg">⚠️ Tab Switch Detected!</h2>
            <p>You switched tabs {tabSwitchCount} time(s). This activity is being recorded.</p>
            <button className="btn btn-danger" onClick={dismissWarning}>
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="round-header">
        <div className="round-title">
          <span className="round-number">Round 1</span>
          <h2 className="heading-md">Scenario to Image</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {tabSwitchCount > 0 && (
            <span className="badge badge-inactive" style={{ fontSize: '0.7rem' }}>
              ⚠ {tabSwitchCount} tab switches
            </span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {userData?.name} • #{userData?.rollNumber}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ padding: '2rem 1.5rem', maxWidth: 900 }}>
        <div className="slide-up" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Scenario:
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {adminControls?.round1Scenario || 'Generate an image by writing the best prompt based on a given scenario.'}
          </p>
        </div>

        {/* Image Display */}
        <div className="glass-card-static slide-up stagger-1" style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          textAlign: 'center'
        }}>
          <img
            src={imageUrl}
            alt="Competition image - write a prompt to recreate this"
            style={{
              width: '100%',
              maxHeight: 500,
              objectFit: 'contain',
              borderRadius: 'var(--radius-md)',
            }}
            onError={(e) => {
              e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%231a1a2e" width="400" height="300"/><text fill="%236c5ce7" font-size="20" x="50%" y="50%" text-anchor="middle" dy=".3em">Image will be displayed here</text></svg>';
            }}
          />
        </div>

        {/* Submission Section */}
        <div className="glass-card-static slide-up stagger-2" style={{ padding: '2rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
            Submission
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Click the button below to open the submission form in a new tab.
            Once you have submitted your prompt on the form, come back here and click "Submitted" to update your progress.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleOpenForm}
              disabled={loading || submitted}
              style={{ width: '100%', maxWidth: 300 }}
            >
              Go to Submission Form →
            </button>

            {formOpened && (
              <button
                className="btn btn-success btn-lg"
                onClick={handleSubmit}
                disabled={loading || submitted}
                style={{ width: '100%', maxWidth: 300 }}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Updating Admin Panel...
                  </>
                ) : (
                  'Submitted'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WaitingScreen({ title, message, onBack }) {
  return (
    <div className="waiting-container">
      <div className="pulse-ring" />
      <h2 className="heading-lg text-gradient">{title}</h2>
      <p style={{ color: 'var(--text-secondary)', maxWidth: 400 }}>{message}</p>
      {onBack && (
        <button className="btn btn-secondary" onClick={onBack}>
          ← Back to Dashboard
        </button>
      )}
    </div>
  );
}
