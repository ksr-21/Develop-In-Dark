import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, doc, getDocs, onSnapshot, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import useTabDetection from '../hooks/useTabDetection';
import ParticipantIdentity from '../components/ParticipantIdentity';
import seededShuffle from '../utils/seededShuffle';

const TASK_COUNT = 8;
const TASK_DURATION_SECONDS = 2 * 60;

export default function Round2Page() {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const { tabSwitchCount, showWarning, dismissWarning } = useTabDetection();

  const [tasks, setTasks] = useState([]);
  const [responses, setResponses] = useState(Array(TASK_COUNT).fill(''));
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(TASK_DURATION_SECONDS);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  const timerRef = useRef(null);
  const transitionRef = useRef(false);
  const responsesRef = useRef(responses);
  const tasksRef = useRef(tasks);
  const currentTaskRef = useRef(currentTaskIndex);
  const loadingRef = useRef(loading);
  const submittedRef = useRef(submitted);
  const tabSwitchCountRef = useRef(tabSwitchCount);

  const visibleTasks = tasks.slice(0, TASK_COUNT);
  const hasAllTasks = visibleTasks.length === TASK_COUNT;
  const completedCount = submitted ? TASK_COUNT : currentTaskIndex;
  const participantSeed = currentUser?.email?.split('@')[0] || userData?.rollNumber || '';

  useEffect(() => {
    responsesRef.current = responses;
  }, [responses]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    currentTaskRef.current = currentTaskIndex;
  }, [currentTaskIndex]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    submittedRef.current = submitted;
  }, [submitted]);

  useEffect(() => {
    tabSwitchCountRef.current = tabSwitchCount;
  }, [tabSwitchCount]);

  useEffect(() => {
    if (userData?.round2Submitted) {
      setSubmitted(true);
    }
  }, [userData]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'adminControls', 'main'), (snap) => {
      if (!snap.exists()) return;

      const data = snap.data();
      if (!data.round2Active) {
        navigate('/dashboard');
      }
    });

    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      try {
        const snap = await getDocs(collection(db, 'round2Tasks'));
        if (cancelled) return;

        const taskList = [];
        snap.forEach((d) => {
          taskList.push({ id: d.id, ...d.data() });
        });

        taskList.sort((a, b) => {
          const orderDiff = (a.order || 0) - (b.order || 0);
          if (orderDiff !== 0) return orderDiff;
          return (a.id || '').localeCompare(b.id || '');
        });

        setTasks(seededShuffle(taskList.slice(0, TASK_COUNT), participantSeed));
      } catch (error) {
        console.error('Failed to load Round 2 tasks:', error);
      } finally {
        if (!cancelled) {
          setTasksLoaded(true);
        }
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
    };
  }, [participantSeed]);

  const submitRound = useCallback(async () => {
    if (loadingRef.current || submittedRef.current || !userData?.rollNumber) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const activeTasks = tasksRef.current.slice(0, TASK_COUNT);
      const responseArray = activeTasks.map((task, index) => ({
        taskId: task.id,
        taskTitle: task.title || `Task ${index + 1}`,
        response: responsesRef.current[index] || '',
      }));

      await setDoc(
        doc(db, 'users', userData.rollNumber),
        {
          round2Responses: responseArray,
          round2Submitted: true,
          round2SubmittedAt: new Date().toISOString(),
          round2TimeUsed: TASK_COUNT * TASK_DURATION_SECONDS,
          round2TabSwitches: tabSwitchCountRef.current,
          round2TaskCount: TASK_COUNT,
          round2TaskDurationSeconds: TASK_DURATION_SECONDS,
          round2Flow: 'sequential-prompt-writing',
        },
        { merge: true }
      );

      submittedRef.current = true;
      setSubmitted(true);
    } catch (error) {
      console.error('Failed to submit Round 2:', error);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [userData?.rollNumber]);

  const advanceToNextTask = useCallback(async (isAuto = false) => {
    if (transitionRef.current || loadingRef.current || submittedRef.current) return;

    if (!isAuto && currentTaskRef.current < TASK_COUNT - 1) {
      if (!window.confirm('Are you sure you want to go to the next task? You cannot come back to the previous task.')) {
        return;
      }
    }

    if (!isAuto && currentTaskRef.current === TASK_COUNT - 1) {
      if (!window.confirm('Are you sure you want to submit? After submitting you will not be able to change your responses.')) {
        return;
      }
    }

    transitionRef.current = true;

    try {
      if (currentTaskRef.current >= TASK_COUNT - 1) {
        await submitRound();
      } else {
        setCurrentTaskIndex((prev) => Math.min(prev + 1, TASK_COUNT - 1));
      }
    } finally {
      transitionRef.current = false;
    }
  }, [submitRound]);

  useEffect(() => {
    if (submitted || loading || !tasksLoaded || !hasAllTasks) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    setTimeLeft(TASK_DURATION_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          void advanceToNextTask(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [submitted, loading, tasksLoaded, hasAllTasks, currentTaskIndex, advanceToNextTask]);

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  }

  function getTimerClass() {
    if (timeLeft <= 20) return 'timer-danger';
    if (timeLeft <= 45) return 'timer-warning';
    return '';
  }

  function updateResponse(value) {
    const taskIndex = currentTaskRef.current;

    setResponses((prev) => {
      const next = [...prev];
      next[taskIndex] = value;
      responsesRef.current = next;
      return next;
    });
  }

  if (submitted) {
    return (
      <div className="page-wrapper">
        <div className="waiting-container">
          <div className="pulse-ring" />
          <h2 className="heading-lg text-gradient">Round 2 Complete!</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 420, textAlign: 'center' }}>
            Your 8 prompt responses have been submitted. Wait for the admin to activate Round 3.
          </p>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!tasksLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading Round 2 tasks...</p>
      </div>
    );
  }

  if (!hasAllTasks) {
    return (
      <div className="page-wrapper">
        <div className="waiting-container">
          <div className="pulse-ring" />
          <h2 className="heading-lg text-gradient">Round 2 Is Not Ready Yet</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 520, textAlign: 'center', lineHeight: 1.7 }}>
            Round 2 needs exactly 8 prompt-writing tasks before participants can begin. Ask the
            admin to finish setting all 8 tasks, then activate the round again.
          </p>
          <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentTask = visibleTasks[currentTaskIndex];
  const currentResponse = responses[currentTaskIndex] || '';
  const isLastTask = currentTaskIndex === TASK_COUNT - 1;

  return (
    <div className="page-wrapper">
      {showWarning && (
        <div className="tab-warning-overlay">
          <div className="tab-warning-content">
            <h2 className="heading-lg">Tab Switch Detected</h2>
            <p>You switched tabs {tabSwitchCount} time(s). This is being recorded.</p>
            <button className="btn btn-danger" onClick={dismissWarning}>
              I Understand
            </button>
          </div>
        </div>
      )}

      <div className="round-header">
        <div className="round-title">
          <span className="round-number">Round 2</span>
          <h2 className="heading-md">Prompt Writing Sprint</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <ParticipantIdentity name={userData?.name} rollNumber={userData?.rollNumber} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Task {currentTaskIndex + 1} of {TASK_COUNT}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Prompt only, no task execution
            </div>
          </div>
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

      <div className="container" style={{ padding: '1.5rem', maxWidth: 1000 }}>
        <div className="progress-bar" style={{ marginBottom: '1.5rem' }}>
          <div
            className="progress-fill"
            style={{ width: `${(completedCount / TASK_COUNT) * 100}%` }}
          />
        </div>

        <div className="glass-card-static slide-up" style={{ padding: '2rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 16,
              marginBottom: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'rgba(108, 92, 231, 0.12)',
                  border: '1px solid rgba(108, 92, 231, 0.22)',
                  color: 'var(--accent-primary)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  marginBottom: 12,
                }}
              >
                Locked task sequence
              </div>
              <h3 className="heading-md" style={{ marginBottom: 6 }}>
                {currentTask?.title || `Task ${currentTaskIndex + 1}`}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                You have 2 minutes for this task. Write only the prompt you would give to AI.
                You can move forward when you are ready, but you cannot return to earlier tasks.
              </p>
            </div>
            <div
              style={{
                textAlign: 'right',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                minWidth: 110,
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>
                2:00 per task
              </div>
              <div>Auto-advances on timeout</div>
            </div>
          </div>

          <div
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem',
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
            }}
          >
            {currentTask?.description || currentTask?.task || 'No description provided.'}
          </div>

          <div className="input-group" style={{ marginBottom: 0 }}>
            <label style={{ fontWeight: 600 }}>Your Prompt</label>
            <textarea
              className="input-field"
              placeholder="Write the prompt you would give to AI..."
              value={currentResponse}
              onChange={(e) => updateResponse(e.target.value)}
              disabled={loading}
              style={{
                minHeight: 180,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              marginTop: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              {isLastTask
                ? 'This is the final prompt. Submit it before the timer ends or wait for auto-submit.'
                : 'The next prompt unlocks automatically when this timer ends, or you can advance now.'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {loading && <span className="spinner spinner-sm" />}
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {loading ? 'Saving final submission...' : `${completedCount} of ${TASK_COUNT} completed`}
              </span>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void advanceToNextTask(false)}
                disabled={loading}
              >
                {isLastTask ? 'Submit Final Task' : 'Next Task →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
