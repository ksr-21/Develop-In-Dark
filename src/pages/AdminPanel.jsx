import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import defaultRound2Tasks from '../data/defaultRound2Tasks.json';
import defaultQuizQuestions from '../data/defaultQuizQuestions';
import {
  doc, setDoc, updateDoc, deleteDoc,
  collection, onSnapshot, getDocs, writeBatch,
} from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';

export default function AdminPanel() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [adminControls, setAdminControls] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [tasks, setTasks] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const navigate = useNavigate();

  // Real-time listeners
  useEffect(() => {
    const unsubs = [];

    // Admin controls
    unsubs.push(
      onSnapshot(doc(db, 'adminControls', 'main'), (snap) => {
        if (snap.exists()) {
          setAdminControls(snap.data());
        } else {
          // Initialize if not exists
          setDoc(doc(db, 'adminControls', 'main'), {
            currentRound: 1,
            round1Active: false,
            round2Active: false,
            round3Active: false,
            round2Duration: 2,
            round2TaskCount: 8,
            round3Duration: 25,
            round3QuestionCount: 21,
          });
        }
      })
    );

    // Users
    unsubs.push(
      onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const u = [];
          snap.forEach((d) => {
            if (d.id !== 'admin') {
              u.push({ id: d.id, ...d.data() });
            }
          });
          u.sort((a, b) => (a.rollNumber || '').localeCompare(b.rollNumber || ''));
          setUsers(u);
          setUsersLoaded(true);
          setUsersError('');
        },
        (error) => {
          console.error('Failed to load registrations:', error);
          setUsers([]);
          setUsersLoaded(true);
          setUsersError(error?.message || 'Failed to load registrations');
        }
      )
    );

    // Tasks
    unsubs.push(
      onSnapshot(collection(db, 'round2Tasks'), (snap) => {
        const t = [];
        snap.forEach((d) => t.push({ id: d.id, ...d.data() }));
        t.sort((a, b) => (a.order || 0) - (b.order || 0));
        setTasks(t);
      })
    );

    // Quiz questions
    unsubs.push(
      onSnapshot(collection(db, 'quizQuestions'), (snap) => {
        const q = [];
        snap.forEach((d) => q.push({ id: d.id, ...d.data() }));
        q.sort((a, b) => (a.order || 0) - (b.order || 0));
        setQuizQuestions(q);
      })
    );

    return () => unsubs.forEach((u) => u());
  }, []);

  async function toggleRound(round) {
    const key = `round${round}Active`;
    await setDoc(
      doc(db, 'adminControls', 'main'),
      {
        [key]: !adminControls?.[key],
        currentRound: round,
      },
      { merge: true }
    );
  }

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊' },
    { key: 'rounds', label: 'Round Control', icon: '🎮' },
    { key: 'tasks', label: 'Round 2 Tasks', icon: '📝' },
    { key: 'quiz', label: 'Quiz Questions', icon: '❓' },
    { key: 'users', label: 'All Users', icon: '👥' },
    { key: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--accent-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8rem', fontWeight: 800
            }}>AI</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Admin Panel</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Develop in Dark</div>
            </div>
          </div>
          <div style={{
            marginTop: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            padding: '0.7rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-subtle)',
          }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
              Registrations
            </span>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              {usersLoaded ? users.length : '...'}
            </span>
          </div>
        </div>

        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`admin-nav-item ${activeTab === item.key ? 'active' : ''}`}
              onClick={() => setActiveTab(item.key)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-subtle)' }}>
          <button className="btn btn-danger btn-sm" style={{ width: '100%' }} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="admin-content">
        {activeTab === 'dashboard' && (
          <AdminDashboard
            users={users}
            adminControls={adminControls}
            usersLoaded={usersLoaded}
            usersError={usersError}
          />
        )}
        {activeTab === 'rounds' && (
          <RoundControl adminControls={adminControls} toggleRound={toggleRound} users={users} />
        )}
        {activeTab === 'tasks' && (
          <TaskManager tasks={tasks} />
        )}
        {activeTab === 'quiz' && (
          <QuizManager questions={quizQuestions} />
        )}
        {activeTab === 'users' && (
          <UserList users={users} />
        )}
        {activeTab === 'leaderboard' && (
          <Leaderboard users={users} />
        )}
      </main>
    </div>
  );
}

/* ======================== */
/* ADMIN DASHBOARD          */
/* ======================== */
function AdminDashboard({ users, adminControls, usersLoaded, usersError }) {
  const totalUsers = users.length;
  const r1Done = users.filter((u) => u.round1Submitted).length;
  const r2Done = users.filter((u) => u.round2Submitted).length;
  const r3Done = users.filter((u) => u.round3Submitted).length;
  const avgScore = users.filter((u) => u.quizScore != null).length > 0
    ? Math.round(
        users.filter((u) => u.quizScore != null).reduce((s, u) => s + u.quizScore, 0) /
        users.filter((u) => u.quizScore != null).length
      )
    : 0;

  return (
    <div className="fade-in">
      <h1 className="heading-xl" style={{ marginBottom: '0.5rem' }}>
        <span className="text-gradient">Dashboard</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Real-time overview of the competition
      </p>

      {usersError && (
        <div
          style={{
            marginBottom: '1.25rem',
            padding: '0.9rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.25)',
            color: 'var(--danger)',
            fontSize: '0.85rem',
            lineHeight: 1.5,
          }}
        >
          Unable to load registrations from Firestore: {usersError}
        </div>
      )}

      <div
        className="glass-card-static"
        style={{
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          border: '1px solid rgba(108, 92, 231, 0.25)',
        }}
      >
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>
              Total Registrations
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {usersLoaded ? totalUsers : '...'}
            </div>
          </div>
          <div style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 420 }}>
            All registered participants currently loaded in the system. This excludes the admin
            account and updates in real time.
        </div>
      </div>

      <div className="stats-grid">
        <div className="admin-stat-card">
          <span className="stat-value">{usersLoaded ? totalUsers : '...'}</span>
          <span className="stat-label">Total Registrations</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{r1Done}</span>
          <span className="stat-label">Round 1 Submitted</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{r2Done}</span>
          <span className="stat-label">Round 2 Submitted</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{r3Done}</span>
          <span className="stat-label">Round 3 Submitted</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{avgScore}%</span>
          <span className="stat-label">Avg Quiz Score</span>
        </div>
        <div className="admin-stat-card">
          <span className="stat-value">{adminControls?.currentRound || '-'}</span>
          <span className="stat-label">Current Round</span>
        </div>
      </div>

      {/* Round Status */}
      <div className="glass-card-static" style={{ padding: '1.5rem' }}>
        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>Round Status</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[1, 2, 3].map((r) => (
            <div key={r} style={{
              flex: 1, minWidth: 200,
              padding: '1rem',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600 }}>Round {r}</span>
                <span className={`badge ${adminControls?.[`round${r}Active`] ? 'badge-active' : 'badge-inactive'}`}>
                  {adminControls?.[`round${r}Active`] ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ======================== */
/* ROUND CONTROL            */
/* ======================== */
function RoundControl({ adminControls, toggleRound, users }) {
  return (
    <div className="fade-in">
      <h1 className="heading-xl" style={{ marginBottom: '0.5rem' }}>
        <span className="text-gradient">Round Control</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Activate or deactivate rounds in real-time
      </p>

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {/* Round 1 */}
        <div className="glass-card-static" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 className="heading-md">🖼️ Round 1: Scenario to Image</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                {users.filter(u => u.round1Submitted).length} submitted
              </p>
            </div>
            <button
              className={`btn ${adminControls?.round1Active ? 'btn-danger' : 'btn-success'}`}
              onClick={() => toggleRound(1)}
            >
              {adminControls?.round1Active ? 'Deactivate' : 'Activate'}
            </button>
          </div>

          <div className="input-group">
            <label>Round 1 Scenario</label>
            <textarea
              className="input-field"
              placeholder="Enter the scenario for Round 1..."
              value={adminControls?.round1Scenario || ''}
              onChange={async (e) => {
                await updateDoc(doc(db, 'adminControls', 'main'), {
                  round1Scenario: e.target.value
                });
              }}
              style={{ minHeight: 80 }}
            />
          </div>

          <div className="input-group">
            <label>Round 1 Image URL (Optional)</label>
            <input
              className="input-field"
              placeholder="https://example.com/image.jpg"
              value={adminControls?.round1ImageUrl || ''}
              onChange={async (e) => {
                await updateDoc(doc(db, 'adminControls', 'main'), {
                  round1ImageUrl: e.target.value
                });
              }}
            />
          </div>
        </div>

        {/* Round 2 */}
        <div className="glass-card-static" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 className="heading-md">Round 2: Prompt Writing Sprint</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                {users.filter(u => u.round2Submitted).length} submitted
              </p>
            </div>
            <button
              className={`btn ${adminControls?.round2Active ? 'btn-danger' : 'btn-success'}`}
              onClick={() => toggleRound(2)}
            >
              {adminControls?.round2Active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Format</label>
            <div style={{
              padding: '0.95rem 1rem',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              8 locked tasks, 2 minutes each, prompt writing only
            </div>
          </div>
        </div>

        {/* Round 3 */}
        <div className="glass-card-static" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 className="heading-md">🧠 Round 3: AI Quiz</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
                {users.filter(u => u.round3Submitted).length} submitted
              </p>
            </div>
            <button
              className={`btn ${adminControls?.round3Active ? 'btn-danger' : 'btn-success'}`}
              onClick={() => toggleRound(3)}
            >
              {adminControls?.round3Active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Format</label>
            <div style={{
              padding: '0.95rem 1rem',
              background: 'var(--bg-glass)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              21 MCQs, 25 minutes total
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================== */
/* TASK MANAGER             */
/* ======================== */
function TaskManager({ tasks }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [actionError, setActionError] = useState('');
  const [error, setError] = useState('');

  async function addTask() {
    if (!title.trim() || !description.trim()) {
      setError('Please enter both a title and a description.');
      return;
    }

    setSavingTask(true);
    setError('');

    try {
      const nextOrder = tasks.reduce(
        (max, task) => Math.max(max, parseInt(task.order, 10) || 0),
        0
      ) + 1;

      const taskRef = doc(collection(db, 'round2Tasks'));
      await setDoc(taskRef, {
        title: title.trim(),
        description: description.trim(),
        task: description.trim(),
        order: nextOrder,
        createdAt: new Date().toISOString(),
      });

      setTitle('');
      setDescription('');
    } catch (err) {
      console.error('Failed to add task:', err);
      setError(err?.message || 'Failed to add task. Please try again.');
    } finally {
      setSavingTask(false);
    }
  }

  async function loadDefaultTasks() {
    if (!confirm('This will replace the current Round 2 tasks with the default 8-task set. Continue?')) {
      return;
    }

    setLoadingDefaults(true);
    setActionError('');

    try {
      const snap = await getDocs(collection(db, 'round2Tasks'));
      const batch = writeBatch(db);

      snap.forEach((taskSnap) => {
        batch.delete(taskSnap.ref);
      });

      defaultRound2Tasks.forEach((item, index) => {
        batch.set(doc(db, 'round2Tasks', `task${index + 1}`), {
          title: item.title,
          description: item.description,
          task: item.description,
          order: index + 1,
          createdAt: new Date().toISOString(),
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('Failed to load default Round 2 tasks:', err);
      setActionError(err?.message || 'Failed to load default Round 2 tasks.');
    } finally {
      setLoadingDefaults(false);
    }
  }

  async function updateTask(id) {
    await updateDoc(doc(db, 'round2Tasks', id), {
      title: editTitle,
      description: editDescription,
      task: editDescription,
    });
    setEditingId(null);
  }

  async function removeTask(id) {
    if (confirm('Delete this task?')) {
      await deleteDoc(doc(db, 'round2Tasks', id));
    }
  }

  return (
    <div className="fade-in">
      <h1 className="heading-xl" style={{ marginBottom: '0.5rem' }}>
        <span className="text-gradient">Round 2 Tasks</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Add and manage the Round 2 prompt-writing tasks. Participants will see the first 8
        tasks, shuffled differently for each participant.
      </p>

      {/* Add Task Form */}
      <div className="glass-card-static" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>Add New Task</h3>
        <button
          className="btn btn-secondary"
          onClick={loadDefaultTasks}
          disabled={loadingDefaults}
          style={{ marginBottom: '1rem' }}
        >
          {loadingDefaults ? 'Loading Default Tasks...' : 'Load Default 8 Tasks'}
        </button>
        {actionError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {actionError}
          </p>
        )}
        <div className="input-group">
          <label>Task Title</label>
          <input
            className="input-field"
            placeholder="e.g. Creative Writing Prompt"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="input-group">
          <label>Task Description</label>
          <textarea
            className="input-field"
            placeholder="Describe what the participant needs to do..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={addTask} disabled={savingTask}>
          {savingTask ? 'Adding...' : 'Add Task'}
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
          Round 2 uses these 8 tasks, but each participant sees them in a different shuffled order.
        </p>
        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
            {error}
          </p>
        )}
      </div>

      {/* Task List */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {tasks.map((task, i) => (
          <div key={task.id} className="glass-card-static" style={{ padding: '1.25rem' }}>
            {editingId === task.id ? (
              <div>
                <div className="input-group">
                  <input
                    className="input-field"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <textarea
                    className="input-field"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => updateTask(task.id)}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8,
                      background: 'var(--accent-gradient)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700
                    }}>{i + 1}</span>
                    <strong>{task.title}</strong>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: 36 }}>
                    {task.description || task.task}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingId(task.id);
                      setEditTitle(task.title || '');
                      setEditDescription(task.description || task.task || '');
                    }}
                  >
                    Edit
                  </button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeTask(task.id)}>
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================== */
/* QUIZ MANAGER             */
/* ======================== */
function QuizManager({ questions }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState(null);
  const [loadingDefaults, setLoadingDefaults] = useState(false);
  const [actionError, setActionError] = useState('');

  async function addQuestion() {
    if (!question.trim() || options.some((o) => !o.trim())) return;
    const qId = `q${questions.length + 1}_${Date.now()}`;
    await setDoc(doc(db, 'quizQuestions', qId), {
      question: question.trim(),
      options: options.map((o) => o.trim()),
      correctAnswer,
      order: questions.length + 1,
      createdAt: new Date().toISOString(),
    });
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('A');
  }

  async function loadDefaultQuestions() {
    if (!confirm('This will replace the current quiz questions with the default 21-question set. Continue?')) {
      return;
    }

    setLoadingDefaults(true);
    setActionError('');

    try {
      const snap = await getDocs(collection(db, 'quizQuestions'));
      const batch = writeBatch(db);

      snap.forEach((questionSnap) => {
        batch.delete(questionSnap.ref);
      });

      defaultQuizQuestions.forEach((item, index) => {
        batch.set(doc(db, 'quizQuestions', `q${index + 1}`), {
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer,
          order: index + 1,
          createdAt: new Date().toISOString(),
        });
      });

      await batch.commit();
    } catch (err) {
      console.error('Failed to load default quiz questions:', err);
      setActionError(err?.message || 'Failed to load default quiz questions.');
    } finally {
      setLoadingDefaults(false);
    }
  }

  async function updateQuestion(id) {
    await updateDoc(doc(db, 'quizQuestions', id), {
      question: editData.question,
      options: editData.options,
      correctAnswer: editData.correctAnswer,
    });
    setEditingId(null);
    setEditData(null);
  }

  async function removeQuestion(id) {
    if (confirm('Delete this question?')) {
      await deleteDoc(doc(db, 'quizQuestions', id));
    }
  }

  return (
    <div className="fade-in">
      <h1 className="heading-xl" style={{ marginBottom: '0.5rem' }}>
        <span className="text-gradient">Quiz Questions</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Manage Round 3 quiz questions ({questions.length} total). You can load the default 21
        questions below and then edit any of them.
      </p>

      {/* Add Question Form */}
      <div className="glass-card-static" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="heading-md" style={{ marginBottom: '1rem' }}>Add New Question</h3>
        <button
          className="btn btn-secondary"
          onClick={loadDefaultQuestions}
          disabled={loadingDefaults}
          style={{ marginBottom: '1rem' }}
        >
          {loadingDefaults ? 'Loading Default Questions...' : 'Load Default 21 Questions'}
        </button>
        {actionError && (
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {actionError}
          </p>
        )}
        <div className="input-group">
          <label>Question</label>
          <textarea
            className="input-field"
            placeholder="Enter the quiz question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ minHeight: 80 }}
          />
        </div>
        {options.map((opt, i) => (
          <div className="input-group" key={i}>
            <label>Option {String.fromCharCode(65 + i)}</label>
            <input
              className="input-field"
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              value={opt}
              onChange={(e) => {
                const newOpts = [...options];
                newOpts[i] = e.target.value;
                setOptions(newOpts);
              }}
            />
          </div>
        ))}
        <div className="input-group">
          <label>Correct Answer</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['A', 'B', 'C', 'D'].map((letter) => (
              <button
                key={letter}
                className={`btn ${correctAnswer === letter ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setCorrectAnswer(letter)}
                type="button"
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary" onClick={addQuestion}>
          Add Question
        </button>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.75rem' }}>
          After loading or adding questions, use Edit on any item to change the question,
          options, or correct answer.
        </p>
      </div>

      {/* Question List */}
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {questions.map((q, i) => (
          <div key={q.id} className="glass-card-static" style={{ padding: '1.25rem' }}>
            {editingId === q.id ? (
              <div>
                <div className="input-group">
                  <label>Question</label>
                  <textarea
                    className="input-field"
                    value={editData.question}
                    onChange={(e) => setEditData({ ...editData, question: e.target.value })}
                    style={{ minHeight: 80 }}
                  />
                </div>
                {editData.options.map((opt, oi) => (
                  <div className="input-group" key={oi}>
                    <label>Option {String.fromCharCode(65 + oi)}</label>
                    <input
                      className="input-field"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...editData.options];
                        newOpts[oi] = e.target.value;
                        setEditData({ ...editData, options: newOpts });
                      }}
                    />
                  </div>
                ))}
                <div className="input-group">
                  <label>Correct Answer</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['A', 'B', 'C', 'D'].map((letter) => (
                      <button
                        key={letter}
                        className={`btn ${editData.correctAnswer === letter ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                        onClick={() => setEditData({ ...editData, correctAnswer: letter })}
                        type="button"
                      >
                        {letter}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => updateQuestion(q.id)}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setEditingId(null); setEditData(null); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-info">Q{i + 1}</span>
                    <strong style={{ fontSize: '0.95rem' }}>{q.question}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setEditingId(q.id);
                        setEditData({
                          question: q.question,
                          options: q.options || ['', '', '', ''],
                          correctAnswer: q.correctAnswer,
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => removeQuestion(q.id)}>
                      Delete
                    </button>
                  </div>
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  gap: '4px 12px', fontSize: '0.85rem', paddingLeft: 8,
                  color: 'var(--text-secondary)',
                }}>
                  {(q.options || []).map((opt, oi) => {
                    const letter = String.fromCharCode(65 + oi);
                    const isCorrect = letter === q.correctAnswer;
                    return (
                      <span key={oi} style={{
                        color: isCorrect ? 'var(--success)' : 'var(--text-secondary)',
                        fontWeight: isCorrect ? 600 : 400,
                      }}>
                        {letter}. {opt} {isCorrect && '✓'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ======================== */
/* USER LIST                */
/* ======================== */
function UserList({ users }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(null);

  const filtered = users.filter(
    (u) =>
      (u.rollNumber || '').includes(search) ||
      (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  function exportToExcel() {
    const data = users.map((u) => ({
      'Roll Number': u.rollNumber,
      'Name': u.name || 'N/A',
      'Contact Number': u.contactNumber || '',
      'Email': u.email || '',
      'College': u.college || '',
      'Profile Complete': u.profileComplete ? 'Yes' : 'No',
      'Round 1 Prompt': u.round1Prompt || '',
      'Round 1 Submitted': u.round1Submitted ? 'Yes' : 'No',
      'Round 1 Tab Switches': u.round1TabSwitches || 0,
      'Round 2 Submitted': u.round2Submitted ? 'Yes' : 'No',
      'Round 2 Tab Switches': u.round2TabSwitches || 0,
      ...(u.round2Responses || []).reduce((acc, r, i) => {
        acc[`Task ${i + 1} Response`] = r.response || '';
        return acc;
      }, {}),
      'Quiz Score': u.quizScore != null ? `${u.quizScore}%` : 'N/A',
      'Quiz Correct': u.quizCorrectCount || 'N/A',
      'Quiz Total': u.quizTotalQuestions || 'N/A',
      'Round 3 Tab Switches': u.round3TabSwitches || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Competition Data');
    XLSX.writeFile(wb, `DevelopInDark_Results_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 className="heading-xl" style={{ marginBottom: '0.5rem' }}>
            <span className="text-gradient">All Users</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {users.length} registered participants
          </p>
        </div>
        <button className="btn btn-success" onClick={exportToExcel}>
          📥 Export to Excel
        </button>
      </div>

      <div className="input-group" style={{ maxWidth: 400 }}>
        <input
          className="input-field"
          placeholder="Search by roll number or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="glass-card-static" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll #</th>
                <th>Name</th>
                <th>R1</th>
                <th>R2</th>
                <th>R3</th>
                <th>Quiz Score</th>
                <th>Tab Switches</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <>
                  <tr key={user.id}>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>
                      {user.rollNumber}
                    </td>
                    <td>{user.name || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td>
                      <span className={`badge ${user.round1Submitted ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: '0.65rem' }}>
                        {user.round1Submitted ? '✓' : '✗'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.round2Submitted ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: '0.65rem' }}>
                        {user.round2Submitted ? '✓' : '✗'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${user.round3Submitted ? 'badge-active' : 'badge-inactive'}`} style={{ fontSize: '0.65rem' }}>
                        {user.round3Submitted ? '✓' : '✗'}
                      </span>
                    </td>
                    <td>
                      {user.quizScore != null ? (
                        <span style={{
                          fontWeight: 700,
                          color: user.quizScore >= 70 ? 'var(--success)' : user.quizScore >= 40 ? 'var(--warning)' : 'var(--danger)'
                        }}>
                          {user.quizScore}%
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' }}>
                      {(user.round1TabSwitches || 0) + (user.round2TabSwitches || 0) + (user.round3TabSwitches || 0)}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setExpanded(expanded === user.id ? null : user.id)}
                      >
                        {expanded === user.id ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                  {expanded === user.id && (
                    <tr key={`${user.id}-detail`}>
                      <td colSpan={8} style={{ padding: '1rem', background: 'var(--bg-glass)' }}>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '0.75rem',
                          }}>
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                Contact Number
                              </div>
                              <div style={{ fontWeight: 600 }}>
                                {user.contactNumber || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                              </div>
                            </div>
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                Email
                              </div>
                              <div style={{ fontWeight: 600 }}>
                                {user.email || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                              </div>
                            </div>
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                College
                              </div>
                              <div style={{ fontWeight: 600 }}>
                                {user.college || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                              </div>
                            </div>
                            <div style={{
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-subtle)',
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                                Profile
                              </div>
                              <div style={{ fontWeight: 600, color: user.profileComplete ? 'var(--success)' : 'var(--warning)' }}>
                                {user.profileComplete ? 'Complete' : 'Incomplete'}
                              </div>
                            </div>
                          </div>
                          {user.round1Prompt && (
                            <div>
                              <strong style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem' }}>ROUND 1 PROMPT:</strong>
                              <p style={{ marginTop: 4, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                                {user.round1Prompt}
                              </p>
                            </div>
                          )}
                          {user.round2Responses?.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem' }}>ROUND 2 RESPONSES:</strong>
                              {user.round2Responses.map((r, i) => (
                                <div key={i} style={{
                                  marginTop: 8, padding: '8px 12px',
                                  background: 'var(--bg-tertiary)',
                                  borderRadius: 'var(--radius-sm)',
                                  fontSize: '0.85rem'
                                }}>
                                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                                    {r.taskTitle || `Task ${i + 1}`}:
                                  </span>
                                  <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                                    {r.response || '(No response)'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {user.quizAnswers?.length > 0 && (
                            <div>
                              <strong style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem' }}>
                                QUIZ: {user.quizCorrectCount}/{user.quizTotalQuestions} correct ({user.quizScore}%)
                              </strong>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ======================== */
/* LEADERBOARD              */
/* ======================== */
function Leaderboard({ users }) {
  const scored = users
    .filter((u) => u.quizScore != null)
    .sort((a, b) => (b.quizScore || 0) - (a.quizScore || 0));

  return (
    <div className="fade-in">
      <h1 className="heading-xl" style={{ marginBottom: '0.5rem' }}>
        <span className="text-gradient-vibrant">Leaderboard</span>
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Rankings based on quiz scores
      </p>

      {scored.length === 0 ? (
        <div className="glass-card-static" style={{ padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>
            No quiz scores yet. The leaderboard will populate after Round 3.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {scored.map((user, i) => (
            <div key={user.id} className="leaderboard-item slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <span className={`leaderboard-rank ${
                i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'
              }`}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{user.name || `Roll #${user.rollNumber}`}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Roll #{user.rollNumber}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '1.25rem', fontWeight: 800,
                  background: i === 0 ? 'linear-gradient(135deg, #ffd700, #ffaa00)' : 'var(--accent-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {user.quizScore}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {user.quizCorrectCount}/{user.quizTotalQuestions}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
