import { useAuth } from '../contexts/AuthContext';

export default function ParticipantIdentity({ name, rollNumber, style = {} }) {
  const { currentUser, userData } = useAuth();
  const fallbackRoll = currentUser?.email ? currentUser.email.split('@')[0] : '';
  const displayName =
    String(name ?? userData?.name ?? currentUser?.displayName ?? '').trim() || 'Participant';
  const displayRoll =
    String(rollNumber ?? userData?.rollNumber ?? fallbackRoll ?? '').trim() || 'Pending';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 2,
        padding: '0.55rem 0.85rem',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-subtle)',
        minWidth: 160,
        ...style,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
        {displayName}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll #{displayRoll}</div>
    </div>
  );
}
