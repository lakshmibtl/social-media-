'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AppShell from '../../components/Appshell';
import { Users, UserPlus, UserCheck, Trash2, X } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import { C, G, S as STheme, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const API_BASE = API_URL;

/* 🔑 NEW: get CSRF token from Drupal (uses your admin login cookie) */
async function getCsrfToken() {
  const res = await fetch(`${API_BASE}/session/token`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Could not get CSRF token - login to Drupal first');
  return (await res.text()).trim();
}



export default function UsersDirectoryPage() {
  const { isMobile } = useResponsive();
  const [currentUser, setCurrentUser] = useState({ name: 'Sarah Connor', role: 'Super Admin', initials: 'SC' });
  const [users, setUsers] = useState([
    { id: 'u1', name: 'admin', email: 'admin@example.com', role: 'Administrator', status: 'Active', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
    { id: 'u2', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Senior Product Designer', status: 'Active', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' },
    { id: 'u3', name: 'Alex Rivera', email: 'alex@example.com', role: 'Engineering Lead', status: 'Active', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' }
  ]);

  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('employee');
  const [toastMsg, setToastMsg] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [dbRolesMap, setDbRolesMap] = useState({});

  useEffect(() => {
    let currentLoggedUser = 'admin';
    if (typeof window !== 'undefined') {
      try {
        const savedUser = localStorage.getItem('openserver_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.name) {
            currentLoggedUser = parsed.name;
            setCurrentUser({
              ...parsed,
              initials: parsed.name.substring(0, 2).toUpperCase()
            });
          }
        }

        const savedList = localStorage.getItem('openserver_users_v2');
        if (savedList) {
          const rawUsers = JSON.parse(savedList);
          const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
          const myFollows = followsMap[currentLoggedUser.toLowerCase()] || [];
          const updatedWithFollows = rawUsers.map(u => ({
            ...u,
            isFollowing: myFollows.map(x => x.toLowerCase()).includes(u.name.toLowerCase())
          }));
          setUsers(updatedWithFollows);
          return;
        }
      } catch (err) { }
    }

    async function loadApiUsers() {
      try {
        const res = await fetch(`${API_BASE}/jsonapi/user/user`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const parsed = json.data.map((u, i) => ({
              id: u.id || `u-${i}`,
              name: u.attributes?.name || u.attributes?.display_name || 'Registered User',
              email: u.attributes?.mail || u.attributes?.email || `${u.attributes?.name || 'user'}@localhost`,
              role: Array.isArray(u.attributes?.roles) ? u.attributes.roles.join(', ') : 'Member',
              status: u.attributes?.status !== false ? 'Active' : 'Blocked',
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
            }));
            const followsMap = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('openserver_follows_map') || '{}') : {};
            const myFollows = followsMap[currentLoggedUser.toLowerCase()] || [];
            const parsedWithFollows = parsed.map(u => ({
              ...u,
              isFollowing: myFollows.map(x => x.toLowerCase()).includes(u.name.toLowerCase())
            }));
            setUsers(parsedWithFollows);
          }
        }
      } catch (err) { }
    }
    async function loadApiRoles() {
      try {
        const res = await fetch(`${API_BASE}/roles_proxy.php`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.length > 0) {
            const map = {};
            json.data.forEach(r => {
              const machineName = r.attributes?.drupal_internal__id || r.id;
              map[machineName] = r.id;
            });
            setDbRolesMap(map);
          }
        }
      } catch (err) { }
    }
    loadApiUsers();
    loadApiRoles();
  }, []);

  const saveUsersList = (updated) => {
    setUsers(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('openserver_users_v2', JSON.stringify(updated));
      } catch (err) { }
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  async function recordActivityLog(user, action, target, icon = 'zap') {
    if (typeof window === 'undefined') return;
    try {
      const existing = JSON.parse(localStorage.getItem('openserver_logs_v2') || '[]');
      const newEntry = {
        id: 'act-' + Date.now(),
        user: user || 'admin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        action: action,
        target: target,
        time: 'Just now',
        icon: icon,
        timestamp: Date.now(),
        postImage: null
      };
      const updatedList = [newEntry, ...existing];
      localStorage.setItem('openserver_logs_v2', JSON.stringify(updatedList));

      try {
        const token = await getCsrfToken();
        await fetch(`${API_BASE}/jsonapi/activity/activity`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
            'X-CSRF-Token': token
          },
          body: JSON.stringify({
            data: {
              type: 'activity--activity',
              attributes: {
                field_activity_message: `${user} ${action} "${target}"`,
                field_activity_output: `${user} ${action} "${target}"`
              }
            }
          })
        });
      } catch (err) {
        console.error('Failed to post activity to Drupal:', err);
      }
    } catch (e) { }
  }

  // 🔥 FIXED: fetch CSRF token first, then POST with cookie + token → saves in DB as admin
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;

    const username = newUsername.trim();
    const email = newEmail.trim() || `${username.toLowerCase().replace(/\s+/g, '')}@example.com`;
    const password = newPassword || 'password123';

    try {
      const token = await getCsrfToken();

      const roleMachineName = newRole;
      const roleUuid = dbRolesMap[roleMachineName];

      const res = await fetch(`${API_BASE}/jsonapi/user/user`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'X-CSRF-Token': token
        },
        body: JSON.stringify({
          data: {
            type: 'user--user',
            attributes: {
              name: username,
              mail: email,
              pass: password,
              status: true
            },
            ...(roleUuid ? {
              relationships: {
                roles: {
                  data: [
                    { type: 'user_role--user_role', id: roleUuid }
                  ]
                }
              }
            } : {})
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.errors?.[0]?.detail || 'Database rejected the request');
      }

      const result = await res.json();
      const createdUser = result.data;

      const newUser = {
        id: createdUser.id || 'u-' + Date.now(),
        name: createdUser.attributes?.name || username,
        email: createdUser.attributes?.mail || email,
        role: {
          administrator: 'Administrator',
          authenticated: 'Authenticated User',
          anonymous: 'Anonymous User',
          content_editor: 'Content Editor',
          community_manager: 'Community Manager',
          moderator: 'Moderator',
          hr_manager: 'HR Manager',
          event_manager: 'Event Manager',
          employee: 'Employee',
          guest: 'Guest'
        }[newRole] || newRole,
        status: 'Active',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      };

      const updated = [newUser, ...users];
      saveUsersList(updated);

      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setShowCreateForm(false);

      showToast(`Created "${newUser.name}" in database!`);
      recordActivityLog(currentUser.name, 'created a new user:', newUser.name, 'user');
    } catch (err) {
      console.error('API Error:', err);
      showToast(`DB Error: ${err.message}`);
    }
  };

  const handleToggleFollow = async (targetUserId, targetUserName) => {
    const isCurrentlyFollowing = users.find(u => u.id === targetUserId)?.isFollowing;
    const nextState = !isCurrentlyFollowing;

    // Update localStorage openserver_follows_map
    try {
      const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
      let myFollows = followsMap[currentUser.name.toLowerCase()] || [];
      if (nextState) {
        if (!myFollows.map(x => x.toLowerCase()).includes(targetUserName.toLowerCase())) {
          myFollows.push(targetUserName);
        }
      } else {
        myFollows = myFollows.filter(x => x.toLowerCase() !== targetUserName.toLowerCase());
      }
      followsMap[currentUser.name.toLowerCase()] = myFollows;
      localStorage.setItem('openserver_follows_map', JSON.stringify(followsMap));
    } catch (e) { }

    try {
      const token = await getCsrfToken();
      if (nextState) {
        await fetch(`${API_BASE}/jsonapi/flagging/follow_user`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
            'X-CSRF-Token': token
          },
          body: JSON.stringify({
            data: {
              type: 'flagging--follow_user',
              relationships: {
                flagged_entity: {
                  data: {
                    type: 'user--user',
                    id: targetUserId
                  }
                }
              }
            }
          })
        });
      }
    } catch (e) { }

    const updated = users.map((u) => u.id === targetUserId ? { ...u, isFollowing: nextState } : u);
    saveUsersList(updated);
    showToast(nextState ? `Now following ${targetUserName}!` : `Unfollowed ${targetUserName}`);
    recordActivityLog(currentUser.name, nextState ? 'started following' : 'unfollowed', targetUserName, 'user');
  };

  // 🔥 FIXED: DELETE also needs CSRF token
  const handleDeleteUser = async (userId, userName) => {
    try {
      const token = await getCsrfToken();
      const res = await fetch(`${API_BASE}/jsonapi/user/user/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'X-CSRF-Token': token
        }
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errMsg = errData?.errors?.[0]?.detail || `Server returned status ${res.status}`;
        throw new Error(errMsg);
      }

      const updated = users.filter((u) => u.id !== userId);
      saveUsersList(updated);
      showToast(`User "${userName}" permanently deleted from database!`);
      recordActivityLog(currentUser.name, 'deleted user:', userName, 'delete');
    } catch (err) {
      console.error('Delete Error:', err);
      showToast(`Delete failed: ${err.message}`);
    }
  };



  return (
    <AppShell>
      {toastMsg && <div style={S.toast}>{toastMsg}</div>}

      {/* Off-canvas Drawer Backdrop */}
      <div
        onClick={() => setShowCreateForm(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          opacity: showCreateForm ? 1 : 0,
          pointerEvents: showCreateForm ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      >
        {/* Drawer Panel */}
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: isMobile ? '100%' : '440px',
            height: '100%',
            backgroundColor: '#ffffff',
            boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            transform: showCreateForm ? 'translateX(0)' : 'translateX(100%)',
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            padding: '40px 32px',
            boxSizing: 'border-box',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', fontWeight: '800', color: C.heading, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserPlus size={22} style={{ color: C.primary }} /> Create New User
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: C.muted, lineHeight: 1.5 }}>
                Fill in the credentials to register a new user in the database.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                borderRadius: '50%',
                backgroundColor: C.bg,
                transition: 'background-color 0.2s',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
            <div>
              <label style={S.label}>Username</label>
              <input
                type="text"
                required
                placeholder="e.g. john_doe"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Email Address</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={S.input}
              />
            </div>
            <div>
              <label style={S.label}>Assign Role</label>
              <div style={{ position: 'relative' }}>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{
                    ...S.input,
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 16px center',
                    backgroundSize: '16px',
                    paddingRight: '40px'
                  }}
                >
                  <option value="administrator">Administrator</option>
                  <option value="authenticated">Authenticated User</option>
                  <option value="anonymous">Anonymous User</option>
                  <option value="content_editor">Content Editor</option>
                  <option value="community_manager">Community Manager</option>
                  <option value="moderator">Moderator</option>
                  <option value="hr_manager">HR Manager</option>
                  <option value="event_manager">Event Manager</option>
                  <option value="employee">Employee</option>
                  <option value="guest">Guest</option>
                </select>
              </div>
            </div>
            <button type="submit" style={{ ...S.submitBtn, marginTop: '12px' }}>Save User</button>
          </form>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: C.heading, margin: '0 0 8px', letterSpacing: '-0.5px' }}><Users size={24} style={{ verticalAlign: 'text-bottom', marginRight: '10px', color: C.primary }} />User Directory</h1>
            <p style={{ color: C.muted, fontSize: '15px', margin: 0, fontWeight: 500 }}>
              Discover and connect with professionals across the network.
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            style={S.createBtn}
          >
            + Create New User
          </button>
        </div>

        <main style={S.main}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
            {users.map((usr) => {
              const isFollowing = usr.isFollowing || false;
              return (
                <div key={usr.id} style={{ ...S.userCard, ':hover': { transform: 'translateY(-4px)', boxShadow: STheme.cardHover } }}>
                  <div style={S.cardHeader}>
                    <div style={S.avatarWrap}>
                      <img src={usr.avatar} alt={usr.name} style={S.avatar} />
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <strong style={S.userName}>{usr.name}</strong>
                      <span style={S.userEmail}>{usr.email}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', margin: '16px 0' }}>
                    <span style={S.roleBadge}>{usr.role}</span>
                  </div>
                  <div style={S.cardActions}>
                    <button
                      onClick={() => handleToggleFollow(usr.id, usr.name)}
                      style={isFollowing ? S.btnFollowing : S.btnFollow}
                    >
                      {isFollowing ? <><UserCheck size={14} /> Following</> : '+ Connect'}
                    </button>
                    {(currentUser.role === 'Super Admin' || currentUser.name === 'admin') && (
                      <button onClick={() => handleDeleteUser(usr.id, usr.name)} style={S.btnDeleteGhost} title="Delete User">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </AppShell>
  );
}

/* ================= STYLES ================= */
const S = {
  wrap: { minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', backgroundColor: C.heading, color: '#fff', padding: '14px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', zIndex: 9999, boxShadow: STheme.cardHover },
  sidebar: { position: 'fixed', top: '16px', left: '16px', bottom: '16px', width: '240px', boxSizing: 'border-box', backgroundColor: C.card, border: `1px solid ${C.borderLight}`, borderRadius: '18px', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', zIndex: 100, boxShadow: STheme.card },
  logo: { fontSize: '20px', fontWeight: 800, color: C.primary, letterSpacing: '0.3px', padding: '0 10px', flexShrink: 0 },
  nav: { display: 'flex', flexDirection: 'column', gap: '3px' },
  navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '12px', backgroundColor: 'transparent', color: C.muted, fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background .15s, color .15s' },
  navActive: { background: G.brand, color: '#fff', fontWeight: 700, boxShadow: STheme.glow },
  sideFooter: { marginTop: 'auto', borderTop: `1px solid ${C.borderLight}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 },
  avatarGrad: { width: '40px', height: '40px', borderRadius: '50%', background: G.brand, color: '#fff', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rightCol: { marginLeft: '280px', padding: '24px 32px 24px 0', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1400px' },
  headerCard: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: STheme.card },
  searchWrap: { position: 'relative', width: '360px' },
  searchIcon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex' },
  searchInput: { width: '100%', backgroundColor: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: '16px', padding: '12px 16px 12px 44px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' },
  iconBtn: { position: 'relative', width: '42px', height: '42px', borderRadius: '14px', border: `1px solid ${C.border}`, backgroundColor: C.card, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: C.muted, transition: 'all 0.2s ease' },
  badge: { position: 'absolute', top: '-6px', right: '-6px', backgroundColor: C.danger, color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.card}` },
  headerAvatar: { width: '42px', height: '42px', borderRadius: '50%', backgroundColor: C.primary, color: '#fff', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: '28px', fontWeight: 800, color: C.heading, margin: '0 0 12px', maxWidth: '480px', lineHeight: 1.3 },

  main: { width: '100%' },
  createBtn: { ...P.btn, padding: '10px 20px', fontSize: '14px', borderRadius: '12px' },
  formCard: { backgroundColor: C.card, border: `1px solid ${C.borderLight}`, borderRadius: '24px', padding: '32px', marginBottom: '32px', boxShadow: STheme.cardHover },
  label: { display: 'block', fontSize: '13px', fontWeight: '700', color: C.text, marginBottom: '8px' },
  input: { width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '12px 16px', fontSize: '14px', color: C.text, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' },
  submitBtn: { ...P.btnBlue, padding: '12px 28px', borderRadius: '12px', fontSize: '14px', width: '100%' },

  userCard: { backgroundColor: C.card, border: `1px solid ${C.borderLight}`, borderRadius: '24px', padding: '24px', boxShadow: STheme.card, transition: 'transform 0.2s ease, box-shadow 0.2s ease', display: 'flex', flexDirection: 'column', cursor: 'default' },
  cardHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  avatarWrap: { width: '80px', height: '80px', borderRadius: '50%', padding: '3px', background: G.brand, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  avatar: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.card}` },
  userName: { fontSize: '18px', fontWeight: '800', color: C.heading, display: 'block', marginBottom: '4px' },
  userEmail: { fontSize: '13px', color: C.muted },
  roleBadge: { fontSize: '12px', fontWeight: '700', color: C.primary, backgroundColor: C.primarySoft, padding: '6px 14px', borderRadius: '20px', display: 'inline-block' },
  cardActions: { display: 'flex', justifyContent: 'center', gap: '8px', marginTop: 'auto', paddingTop: '16px', borderTop: `1px solid ${C.borderLight}` },
  btnFollow: { ...P.btnBlue, padding: '8px 24px', borderRadius: '20px', fontSize: '13px', flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center' },
  btnFollowing: { ...P.btnGhost, padding: '8px 24px', borderRadius: '20px', fontSize: '13px', flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', alignItems: 'center', border: `1px solid ${C.border}` },
  btnDeleteGhost: { backgroundColor: 'transparent', color: C.danger, border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }
};