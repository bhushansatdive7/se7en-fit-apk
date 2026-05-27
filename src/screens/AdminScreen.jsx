import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../api/admin';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

// ── Helpers ────────────────────────────────────────────────────────
const PLAN_LABELS = { none: 'None', monthly: 'Monthly', quarterly: 'Quarterly', halfyearly: 'Half-Yearly', annual: 'Annual' };
const PLAN_COLORS = { none: 'var(--muted)', monthly: 'var(--blue)', quarterly: 'var(--amber)', halfyearly: 'var(--red)', annual: '#c9a84c' };
const ROLE_COLORS = { member: 'var(--blue)', trainer: 'var(--green)', admin: 'var(--red)' };

const Badge = ({ label, color }) => (
  <span style={{
    fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
    padding: '3px 8px', borderRadius: 6,
    background: `${color}22`, color,
    border: `1px solid ${color}44`,
  }}>{label}</span>
);

const StatCard = ({ icon, value, label, sub, color = 'var(--red)' }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 14, padding: '14px 16px', position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: color }} />
    <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
    <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.02em', color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--white)', marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── MOCK DATA (used when API offline) ─────────────────────────────
const MOCK_STATS = {
  totalUsers: 124, totalTrainers: 3, totalWorkouts: 891,
  newUsersThisWeek: 8, activeMembers: 47, revenue: 186750,
  planDist: [
    { _id: 'monthly', count: 38 }, { _id: 'quarterly', count: 42 },
    { _id: 'halfyearly', count: 24 }, { _id: 'annual', count: 20 },
  ],
};
const MOCK_USERS = [
  { _id: '1', name: 'Rohan Kapoor',  email: 'rohan@ironforge.com',  plan: 'annual',     role: 'member',  streak: 14, createdAt: '2026-01-10' },
  { _id: '2', name: 'Priya Mehta',   email: 'priya@ironforge.com',  plan: 'quarterly',  role: 'member',  streak: 7,  createdAt: '2026-02-14' },
  { _id: '3', name: 'Arun Sharma',   email: 'arun@ironforge.com',   plan: 'monthly',    role: 'member',  streak: 3,  createdAt: '2026-03-01' },
  { _id: '4', name: 'Neha Patel',    email: 'neha@ironforge.com',   plan: 'halfyearly', role: 'member',  streak: 21, createdAt: '2026-01-22' },
  { _id: '5', name: 'Vikram Singh',  email: 'vikram@ironforge.com', plan: 'none',       role: 'member',  streak: 0,  createdAt: '2026-04-05' },
  { _id: '6', name: 'Anjali Rao',    email: 'anjali@ironforge.com', plan: 'annual',     role: 'member',  streak: 30, createdAt: '2025-12-01' },
];
const MOCK_TRAINERS = [
  { _id: '1', name: 'Arjun Mehta',  specialization: 'Strength & Powerlifting',   experience: 7, certifications: ['NSCA','CSCS'], rating: 4.9, totalClients: 45, available: true },
  { _id: '2', name: 'Priya Sharma', specialization: 'Yoga & Functional Fitness', experience: 5, certifications: ['RYT 500','ACE'], rating: 4.8, totalClients: 38, available: true },
  { _id: '3', name: 'Vikram Patel', specialization: 'HIIT & Cardio',             experience: 6, certifications: ['ACE','NASM'],   rating: 4.7, totalClients: 52, available: false },
];
const MOCK_ACTIVITY = [
  { _id: '1', user: { name: 'Rohan Kapoor' }, muscleGroup: 'Chest',     totalCalories: 412, createdAt: new Date().toISOString() },
  { _id: '2', user: { name: 'Neha Patel'   }, muscleGroup: 'Back',      totalCalories: 510, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { _id: '3', user: { name: 'Anjali Rao'   }, muscleGroup: 'Legs',      totalCalories: 620, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { _id: '4', user: { name: 'Priya Mehta'  }, muscleGroup: 'Shoulders', totalCalories: 390, createdAt: new Date(Date.now() - 10800000).toISOString() },
  { _id: '5', user: { name: 'Arun Sharma'  }, muscleGroup: 'Arms',      totalCalories: 360, createdAt: new Date(Date.now() - 18000000).toISOString() },
];

// ── TABS ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',  label: 'Overview', icon: '📊' },
  { id: 'users',     label: 'Users',    icon: '👥' },
  { id: 'trainers',  label: 'Trainers', icon: '🏋️' },
  { id: 'activity',  label: 'Activity', icon: '⚡' },
];

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function AdminScreen() {
  const { user, logout } = useAuth();
  const [tab,      setTab]      = useState('overview');
  const [stats,    setStats]    = useState(null);
  const [users,    setUsers]    = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState(null);
  const [search,   setSearch]   = useState('');
  const [planFilter, setPlanFilter] = useState('');

  // Modals
  const [editUser,       setEditUser]       = useState(null);
  const [editTrainer,    setEditTrainer]    = useState(null);
  const [addTrainerOpen, setAddTrainerOpen] = useState(false);
  const [newTrainer,     setNewTrainer]     = useState({ name: '', specialization: '', experience: 1, certifications: '', bio: '' });

  const showToast = (message, type = 'success') => setToast({ message, type });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, t, a] = await Promise.all([
        adminAPI.getStats(), adminAPI.getUsers(), adminAPI.getTrainers(), adminAPI.getActivity(),
      ]);
      setStats(s.data.stats);
      setUsers(u.data.users);
      setTrainers(t.data.trainers);
      setActivity(a.data.logs);
    } catch {
      setStats(MOCK_STATS);
      setUsers(MOCK_USERS);
      setTrainers(MOCK_TRAINERS);
      setActivity(MOCK_ACTIVITY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── User actions ─────────────────────────────────────────
  const saveUser = async () => {
    try {
      await adminAPI.updateUser(editUser._id, { plan: editUser.plan, role: editUser.role });
      setUsers(p => p.map(u => u._id === editUser._id ? { ...u, plan: editUser.plan, role: editUser.role } : u));
      showToast('User updated!');
    } catch {
      setUsers(p => p.map(u => u._id === editUser._id ? { ...u, plan: editUser.plan, role: editUser.role } : u));
      showToast('User updated (offline mode)');
    }
    setEditUser(null);
  };

  const deleteUser = async (id) => {
    try { await adminAPI.deleteUser(id); } catch {}
    setUsers(p => p.filter(u => u._id !== id));
    showToast('User removed');
  };

  // ── Trainer actions ───────────────────────────────────────
  const addTrainer = async () => {
    const data = { ...newTrainer, certifications: newTrainer.certifications.split(',').map(c => c.trim()) };
    try {
      const r = await adminAPI.createTrainer(data);
      setTrainers(p => [...p, r.data.trainer]);
    } catch {
      setTrainers(p => [...p, { _id: Date.now().toString(), ...data, rating: 5.0, totalClients: 0, available: true }]);
    }
    setAddTrainerOpen(false);
    setNewTrainer({ name: '', specialization: '', experience: 1, certifications: '', bio: '' });
    showToast('Trainer added!');
  };

  const saveTrainer = async () => {
    try { await adminAPI.updateTrainer(editTrainer._id, editTrainer); } catch {}
    setTrainers(p => p.map(t => t._id === editTrainer._id ? editTrainer : t));
    setEditTrainer(null);
    showToast('Trainer updated!');
  };

  const deleteTrainer = async (id) => {
    try { await adminAPI.deleteTrainer(id); } catch {}
    setTrainers(p => p.filter(t => t._id !== id));
    showToast('Trainer removed');
  };

  // ── Filtered users ────────────────────────────────────────
  const filteredUsers = users.filter(u =>
    (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())) &&
    (!planFilter || u.plan === planFilter)
  );

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 60000);
    if (diff < 60)  return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  if (loading) return <div className="spinner" style={{ marginTop: 80 }} />;

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ position: 'relative' }}>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{
        padding: '18px 20px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.04em', lineHeight: 1 }}>
            ADMIN <span style={{ color: 'var(--red)' }}>PANEL</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
            Logged in as {user?.name}
          </div>
        </div>
        <button onClick={logout} style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--muted)', fontSize: 11, fontWeight: 700,
          padding: '7px 12px', borderRadius: 8, cursor: 'pointer',
          fontFamily: 'var(--font-body)',
        }}>Sign Out</button>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        {TABS.map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            padding: '10px 4px 8px', cursor: 'pointer',
            borderBottom: `2px solid ${tab === t.id ? 'var(--red)' : 'transparent'}`,
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: tab === t.id ? 'var(--red)' : 'var(--muted)' }}>{t.label}</span>
          </div>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div style={{ padding: '16px 16px 20px' }}>
          {/* Stat grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <StatCard icon="👥" value={stats?.totalUsers}    label="Total Members"  sub={`+${stats?.newUsersThisWeek} this week`} color="var(--blue)" />
            <StatCard icon="⚡" value={stats?.activeMembers} label="Active Members" sub="Worked out this week" color="var(--green)" />
            <StatCard icon="🏋️" value={stats?.totalTrainers}  label="Trainers"       sub="All active"          color="var(--amber)" />
            <StatCard icon="💪" value={stats?.totalWorkouts}  label="Total Workouts" sub="All time"             color="var(--red)" />
          </div>

          {/* Revenue */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,45,58,0.18), rgba(255,45,58,0.05))',
            border: '1px solid rgba(255,45,58,0.35)', borderRadius: 14,
            padding: '16px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <span style={{ fontSize: 32 }}>💰</span>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'var(--red)', letterSpacing: '0.02em', lineHeight: 1 }}>
                ₹{(stats?.revenue || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted2)', marginTop: 3 }}>Estimated monthly revenue</div>
            </div>
          </div>

          {/* Plan distribution */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted2)', marginBottom: 12 }}>
              Plan Distribution
            </div>
            {(stats?.planDist || []).map((p, i) => {
              const total = (stats?.planDist || []).reduce((s, d) => s + d.count, 0) || 1;
              const pct   = Math.round((p.count / total) * 100);
              const color = PLAN_COLORS[p._id] || 'var(--muted)';
              return (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
                    <span style={{ color: 'var(--white)', fontWeight: 600 }}>{PLAN_LABELS[p._id] || p._id}</span>
                    <span style={{ color: 'var(--muted)' }}>{p.count} members · {pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.8s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick actions */}
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted2)', marginBottom: 10 }}>
            Quick Actions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Add Trainer',    icon: '➕', action: () => { setTab('trainers'); setAddTrainerOpen(true); } },
              { label: 'View Activity',  icon: '⚡', action: () => setTab('activity') },
              { label: 'Manage Users',   icon: '👥', action: () => setTab('users') },
              { label: 'Refresh Data',   icon: '🔄', action: loadAll },
            ].map((a, i) => (
              <button key={i} onClick={a.action} style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
                fontFamily: 'var(--font-body)', color: 'var(--white)',
                fontSize: 12, fontWeight: 700, textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--red)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize: 18 }}>{a.icon}</span> {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <div style={{ padding: '14px 16px 20px' }}>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <input
              className="input-field"
              placeholder="🔍 Search name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, fontSize: 12, padding: '10px 12px' }}
            />
            <select
              value={planFilter}
              onChange={e => setPlanFilter(e.target.value)}
              style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--white)', fontSize: 11,
                padding: '10px 10px', fontFamily: 'var(--font-body)', outline: 'none',
              }}
            >
              <option value="">All Plans</option>
              {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 10 }}>
            {filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''} found
          </div>

          {/* User list */}
          {filteredUsers.map(u => (
            <div key={u._id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '12px 14px', marginBottom: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--red), #8b0000)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: 14,
                }}>
                  {u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted2)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge label={PLAN_LABELS[u.plan] || u.plan} color={PLAN_COLORS[u.plan] || 'var(--muted)'} />
                    <Badge label={u.role} color={ROLE_COLORS[u.role] || 'var(--muted)'} />
                    {u.streak > 0 && <Badge label={`🔥 ${u.streak}d`} color="var(--amber)" />}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditUser({ ...u })} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                    fontSize: 12, color: 'var(--white)', fontFamily: 'var(--font-body)',
                  }}>✏️</button>
                  <button onClick={() => deleteUser(u._id)} style={{
                    background: 'rgba(255,45,58,0.1)', border: '1px solid rgba(255,45,58,0.3)',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                    fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-body)',
                  }}>🗑️</button>
                </div>
              </div>

              <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 8 }}>
                Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── TRAINERS TAB ── */}
      {tab === 'trainers' && (
        <div style={{ padding: '14px 16px 20px' }}>
          <button
            onClick={() => setAddTrainerOpen(true)}
            className="btn btn-primary"
            style={{ marginBottom: 14, fontSize: 12 }}
          >
            ➕ Add New Trainer
          </button>

          {trainers.map(t => (
            <div key={t._id} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 14, padding: '14px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'linear-gradient(135deg, #1a3a2a, #22c55e)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>🏋️</div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600, margin: '2px 0 6px' }}>{t.specialization}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Badge label={`${t.experience} yrs`} color="var(--blue)" />
                    <Badge label={`⭐ ${t.rating}`} color="var(--amber)" />
                    <Badge label={`${t.totalClients} clients`} color="var(--green)" />
                    <Badge label={t.available ? 'Available' : 'Busy'} color={t.available ? 'var(--green)' : 'var(--muted)'} />
                  </div>
                  {t.certifications?.length > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 6 }}>
                      {t.certifications.join(' · ')}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditTrainer({ ...t })} style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                    fontSize: 12, color: 'var(--white)', fontFamily: 'var(--font-body)',
                  }}>✏️</button>
                  <button onClick={() => deleteTrainer(t._id)} style={{
                    background: 'rgba(255,45,58,0.1)', border: '1px solid rgba(255,45,58,0.3)',
                    borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                    fontSize: 12, color: 'var(--red)', fontFamily: 'var(--font-body)',
                  }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {tab === 'activity' && (
        <div style={{ padding: '14px 16px 20px' }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
            Recent workout activity across all members
          </div>
          {activity.map((log, i) => (
            <div key={log._id || i} style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '12px 14px', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'var(--red-soft)', border: '1px solid rgba(255,45,58,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>💪</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.user?.name || 'Unknown'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted2)' }}>
                  {log.muscleGroup || 'Workout'} · {log.totalCalories || 0} kcal burned
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
                {timeAgo(log.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MODAL: Edit User ── */}
      {editUser && (
        <Modal title="Edit Member" onClose={() => setEditUser(null)} onSave={saveUser}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{editUser.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted2)' }}>{editUser.email}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="input-label">Membership Plan</div>
            <select className="input-field" value={editUser.plan} onChange={e => setEditUser(p => ({ ...p, plan: e.target.value }))}>
              {Object.entries(PLAN_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <div className="input-label">Role</div>
            <select className="input-field" value={editUser.role} onChange={e => setEditUser(p => ({ ...p, role: e.target.value }))}>
              <option value="member">Member</option>
              <option value="trainer">Trainer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Add Trainer ── */}
      {addTrainerOpen && (
        <Modal title="Add Trainer" onClose={() => setAddTrainerOpen(false)} onSave={addTrainer}>
          {[
            { label: 'Full Name',       key: 'name',           placeholder: 'Arjun Mehta' },
            { label: 'Specialization',  key: 'specialization', placeholder: 'Strength & Powerlifting' },
            { label: 'Experience (yrs)',key: 'experience',     placeholder: '5', type: 'number' },
            { label: 'Certifications (comma-separated)', key: 'certifications', placeholder: 'NSCA, CSCS' },
            { label: 'Bio',             key: 'bio',            placeholder: 'Short bio…' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div className="input-label">{f.label}</div>
              <input
                className="input-field"
                type={f.type || 'text'}
                placeholder={f.placeholder}
                value={newTrainer[f.key]}
                onChange={e => setNewTrainer(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ fontSize: 13 }}
              />
            </div>
          ))}
        </Modal>
      )}

      {/* ── MODAL: Edit Trainer ── */}
      {editTrainer && (
        <Modal title="Edit Trainer" onClose={() => setEditTrainer(null)} onSave={saveTrainer}>
          {[
            { label: 'Name',           key: 'name' },
            { label: 'Specialization', key: 'specialization' },
            { label: 'Experience',     key: 'experience', type: 'number' },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 12 }}>
              <div className="input-label">{f.label}</div>
              <input
                className="input-field"
                type={f.type || 'text'}
                value={editTrainer[f.key]}
                onChange={e => setEditTrainer(p => ({ ...p, [f.key]: e.target.value }))}
                style={{ fontSize: 13 }}
              />
            </div>
          ))}
          <div style={{ marginBottom: 12 }}>
            <div className="input-label">Available</div>
            <select className="input-field" value={editTrainer.available ? 'true' : 'false'}
              onChange={e => setEditTrainer(p => ({ ...p, available: e.target.value === 'true' }))}>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Reusable Modal ────────────────────────────────────────────────
function Modal({ title, children, onClose, onSave }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div style={{
        background: 'var(--card)', borderRadius: '20px 20px 0 0',
        padding: '20px 20px 28px', width: '100%',
        maxHeight: '80%', overflowY: 'auto',
        border: '1px solid var(--border)', borderBottom: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em' }}>{title}</div>
          <button onClick={onClose} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 14, fontFamily: 'var(--font-body)',
          }}>✕</button>
        </div>
        {children}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          <button className="btn btn-outline" onClick={onClose} style={{ fontSize: 12 }}>Cancel</button>
          <button className="btn btn-primary" onClick={onSave}  style={{ fontSize: 12 }}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
