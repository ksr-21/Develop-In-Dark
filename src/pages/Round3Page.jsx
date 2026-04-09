import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { doc, setDoc, collection, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTabDetection from '../hooks/useTabDetection';
import ParticipantIdentity from '../components/ParticipantIdentity';
import seededShuffle from '../utils/seededShuffle';

const QUIZ_DURATION = 25 * 60; // 25 minutes

export default function Round3Page() {
  const { currentUser, userData } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(QUIZ_DURATION);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [quizLoaded, setQuizLoaded] = useState(false);
  const [score] = useState(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { tabSwitchCount, showWarning, dismissWarning } = useTabDetection();
  const participantSeed = currentUser?.email?.split('@')[0] || userData?.rollNumber || '';

  // Listen to admin controls
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'adminControls', 'main'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (!data.round3Active) {
          navigate('/dashboard');
        }
      }
    });
    return () => unsub();
  }, [navigate]);

  // Fetch quiz questions
  useEffect(() => {
    async function fetchQuestions() {
        const snap = await getDocs(collection(db, 'quizQuestions'));
        const qs = [];
        snap.forEach((d) => {
          qs.push({ id: d.id, ...d.data() });
        });
        qs.sort((a, b) => (a.order || 0) - (b.order || 0));
        setQuestions(seededShuffle(qs, participantSeed));
        setQuizLoaded(true);
    }
    fetchQuestions();
  }, [participantSeed]);

  // Check if already submitted
  useEffect(() => {
    if (userData?.round3Submitted) {
      setSubmitted(true);
    }
  }, [userData]);

  // Timer
  useEffect(() => {
    if (submitted || !quizLoaded) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [submitted, quizLoaded]);

  const handleAutoSubmit = useCallback(async () => {
    if (submitted) return;
    await submitQuiz();
  }, [submitted, answers, questions]);

  async function submitQuiz() {
    if (loading || submitted || userData?.round3Submitted) return;
    setLoading(true);
    try {
      const rollNumber = userData?.rollNumber || currentUser?.email?.split('@')[0];
      if (!rollNumber) {
        throw new Error('Your profile is still loading. Please wait a moment and try again.');
      }

      // Calculate score
      let correct = 0;
      const answerArray = questions.map((q, i) => {
        const userAnswer = answers[i] || '';
        const isCorrect = userAnswer === q.correctAnswer;
        if (isCorrect) correct++;
        return {
          questionId: q.id,
          userAnswer,
          isCorrect,
        };
      });

      const calculatedScore = Math.round((correct / questions.length) * 100);

      await setDoc(doc(db, 'users', rollNumber), {
        quizAnswers: answerArray,
        quizScore: calculatedScore,
        quizCorrectCount: correct,
        quizTotalQuestions: questions.length,
        round3Submitted: true,
        round3SubmittedAt: new Date().toISOString(),
        round3TimeUsed: QUIZ_DURATION - timeLeft,
        round3TabSwitches: tabSwitchCount,
      }, { merge: true });

      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit quiz:', err);
    }
    setLoading(false);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  function getTimerClass() {
    if (timeLeft <= 30) return 'timer-danger';
    if (timeLeft <= 120) return 'timer-warning';
    return '';
  }

  if (submitted) {
    return (
      <div className="page-wrapper">
        <div className="waiting-container">
          <div style={{
            width: 120, height: 120, borderRadius: '50%',
            background: 'var(--accent-gradient)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: 900,
            margin: '0 auto',
            boxShadow: '0 0 60px var(--accent-glow)',
          }}>
            {score !== null ? `${score}%` : '✓'}
          </div>
          <h2 className="heading-lg">
            <span className="text-gradient">Quiz Complete!</span>
          </h2>
          {score !== null && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              You scored <strong style={{ color: 'var(--accent-secondary)' }}>{score}%</strong>
              {' '}({userData?.quizCorrectCount || '?'}/{userData?.quizTotalQuestions || questions.length} correct)
            </p>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!quizLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading quiz...</p>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).filter(k => answers[k]).length;

  return (
    <div className="page-wrapper">
      {/* Tab switch warning */}
      {showWarning && (
        <div className="tab-warning-overlay">
          <div className="tab-warning-content">
            <h2 className="heading-lg">⚠️ Tab Switch Detected!</h2>
            <p>You switched tabs {tabSwitchCount} time(s). This is being recorded.</p>
            <button className="btn btn-danger" onClick={dismissWarning}>I Understand</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="round-header">
        <div className="round-title">
          <span className="round-number" style={{ background: 'linear-gradient(135deg, #00cec9, #00b894)' }}>
            Round 3
          </span>
          <h2 className="heading-md">AI Quiz</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ParticipantIdentity name={userData?.name} rollNumber={userData?.rollNumber} />
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {answeredCount}/{questions.length} answered
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {questions.length} MCQs, 25 minutes total
          </span>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              Time Left
            </div>
            <div
              className={`timer-display ${getTimerClass()}`}
              aria-live="polite"
              style={{ minWidth: 110, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ padding: '1.5rem', maxWidth: 800 }}>
        {/* Question nav dots */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: '1.5rem',
          flexWrap: 'wrap', justifyContent: 'center'
        }}>
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              style={{
                width: 36, height: 36,
                borderRadius: '50%',
                border: '2px solid',
                borderColor: currentQ === i
                  ? 'var(--accent-primary)'
                  : answers[i]
                    ? 'rgba(0, 206, 201, 0.4)'
                    : 'var(--border-subtle)',
                background: currentQ === i
                  ? 'var(--accent-primary)'
                  : answers[i]
                    ? 'rgba(0, 206, 201, 0.15)'
                    : 'var(--bg-glass)',
                color: currentQ === i
                  ? 'white'
                  : answers[i]
                    ? 'var(--success)'
                    : 'var(--text-muted)',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.8rem',
                fontFamily: "'Inter', sans-serif",
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Progress */}
        <div className="progress-bar" style={{ marginBottom: '1.5rem' }}>
          <div
            className="progress-fill"
            style={{
              width: `${(answeredCount / questions.length) * 100}%`,
              background: 'linear-gradient(135deg, #00cec9, #00b894)',
            }}
          />
        </div>

        {/* Current Question */}
        {questions[currentQ] && (
          <div className="glass-card-static slide-up" style={{ padding: '2rem' }} key={currentQ}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              marginBottom: '1.5rem'
            }}>
              <span style={{
                fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600
              }}>
                Question {currentQ + 1} of {questions.length}
              </span>
            </div>

            <h3 style={{
              fontSize: '1.15rem', fontWeight: 600,
              lineHeight: 1.6, marginBottom: '1.5rem',
              color: 'var(--text-primary)'
            }}>
              {questions[currentQ].question}
            </h3>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(questions[currentQ].options || []).map((option, oi) => {
                const letter = String.fromCharCode(65 + oi); // A, B, C, D
                const isSelected = answers[currentQ] === letter;
                return (
                  <div
                    key={oi}
                    className={`quiz-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => setAnswers({ ...answers, [currentQ]: letter })}
                  >
                    <span className="quiz-option-letter">{letter}</span>
                    <span style={{ flex: 1, fontSize: '0.95rem' }}>{option}</span>
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginTop: '2rem'
            }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {currentQ < questions.length - 1 && (
                <>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                  disabled={currentQ === 0}
                >
                  ← Previous
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
                  disabled={currentQ === questions.length - 1}
                >
                  Next →
                </button>
                )}
              </div>
              {currentQ === questions.length - 1 && (
              <button
                className="btn btn-success btn-lg"
                onClick={submitQuiz}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner spinner-sm"></span>
                    Submitting...
                  </>
                ) : (
                  `Submit Quiz (${answeredCount}/${questions.length})`
                )}
              </button>
              )}
            </div>
          </div>
        )}

        {questions.length === 0 && (
          <div className="glass-card-static" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)' }}>
              No quiz questions available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
