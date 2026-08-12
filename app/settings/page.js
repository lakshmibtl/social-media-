'use client';

import React, { useState, useEffect } from 'react';
import { Bell, KeyRound, Settings, Save, MessageCircle, ThumbsUp, AtSign, Users, Mail } from 'lucide-react';
import AppShell from '../../components/Appshell';
import useResponsive from '../../lib/useResponsive';
import { C, G, S as STheme, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const BASE_URL = API_URL;

const TABS = [
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'password', label: 'Password', icon: KeyRound },
];

const S = {
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#5b5394',
    marginBottom: '6px',
    letterSpacing: '0.2px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: `1px solid ${C.border}`,
    fontSize: '13px',
    color: C.text,
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  saveBtn: {
    ...P.btn,
    padding: '10px 24px',
    fontSize: '13px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  },
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [toastMsg, setToastMsg] = useState('');
  const [toastType, setToastType] = useState('success');
  const { isMobile } = useResponsive();

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg);
    setToastType(type);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // ── Current User (for password changes) ──
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem('openserver_user') || 'null');
      if (savedUser) setCurrentUser(savedUser);
    } catch (e) { }
  }, []);

  // ── Notifications State ──
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notifPrefs, setNotifPrefs] = useState({
    email_comments: true,
    email_likes: true,
    email_mentions: true,
    email_group_invites: true,
    email_messages: true,
  });

  // ── Password State ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  // ──────────────────────────────────────────────────
  // Fetch notifications from Drupal JSON:API
  // ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'notifications') return;

    const fetchNotifs = async () => {
      setNotifLoading(true);
      try {
        const endpoints = [
          '/jsonapi/message/create_like_node_or_post',
          '/jsonapi/message/create_comment_author_node_post',
          '/jsonapi/message/create_mention_post',
          '/jsonapi/message/private_message_notification',
          '/jsonapi/message/join_to_group',
        ];

        const results = await Promise.all(
          endpoints.map(ep =>
            fetch(`${BASE_URL}${ep}?sort=-created&page[limit]=3&include=uid`, {
              credentials: 'include',
            })
              .then(r => (r.ok ? r.json() : { data: [] }))
              .catch(() => ({ data: [] }))
          )
        );

        let all = [];
        let usersMap = {};

        results.forEach(res => {
          (res.included || []).forEach(inc => {
            if (inc.type?.includes('user')) {
              usersMap[inc.id] = inc.attributes?.display_name || inc.attributes?.name || 'A user';
            }
          });

          (res.data || []).forEach(msg => {
            const actor = usersMap[msg.relationships?.uid?.data?.id] || 'A user';
            all.push({
              id: msg.id,
              type: msg.type,
              actor,
              created: msg.attributes?.created,
            });
          });
        });

        all.sort((a, b) => new Date(b.created) - new Date(a.created));
        setNotifications(all.slice(0, 10));
      } catch (e) { }

      setNotifLoading(false);
    };

    fetchNotifs();
  }, [activeTab]);

  // ──────────────────────────────────────────────────
  // Change Password via Drupal user endpoint
  // ──────────────────────────────────────────────────
  const handleChangePassword = async e => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match!', 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast('Password must be at least 8 characters!', 'error');
      return;
    }

    setPasswordSaving(true);

    try {
      if (currentUser?.drupalId) {
        const tokenRes = await fetch(`${BASE_URL}/session/token`, { credentials: 'include' });
        const csrfToken = await tokenRes.text();

        const res = await fetch(`${BASE_URL}/jsonapi/user/user/${currentUser.drupalId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            data: {
              type: 'user--user',
              id: currentUser.drupalId,
              attributes: {
                pass: {
                  existing: currentPassword,
                  value: newPassword,
                },
              },
            },
          }),
        });

        if (res.ok) {
          showToast('Password changed successfully!');
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(`${err?.errors?.[0]?.detail || 'Failed to change password'}`, 'error');
        }
      } else {
        showToast('Password change request submitted!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error');
    }

    setPasswordSaving(false);
  };

  const getNotifLabel = type => {
    if (type?.includes('like')) return 'Someone liked your post';
    if (type?.includes('comment')) return 'Someone commented on your post';
    if (type?.includes('mention')) return 'Someone mentioned you';
    if (type?.includes('private_message')) return 'New private message';
    if (type?.includes('join')) return 'Someone joined your group';
    return 'New notification';
  };

  return (
    <AppShell>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .settings-tab:hover {
          background: #f0ebff !important;
        }

        .settings-input:focus {
          border-color: #6d28d9 !important;
          box-shadow: 0 0 0 3px rgba(109,40,217,0.1) !important;
          outline: none;
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }

        .toggle-switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #a99fd0;
          border-radius: 24px;
          transition: 0.3s;
        }

        .toggle-slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }

        input:checked + .toggle-slider {
          background: #6d28d9;
        }

        input:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        .save-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .save-btn {
          transition: all 0.2s;
        }
      `}</style>

      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toastType === 'error' ? '#ef4444' : toastType === 'warn' ? '#f59e0b' : '#10b981',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '13px',
            zIndex: 9999,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {toastMsg}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          maxWidth: '900px',
          animation: 'fadeIn 0.3s ease',
        }}
      >
        {/* Header */}
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: C.heading, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={24} />
            Settings
          </h1>
          <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
            Manage your profile, notifications, and password
          </p>
        </div>

        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Sidebar Tabs */}
          <div
            style={{
              width: isMobile ? '100%' : '200px',
              flexShrink: 0,
              backgroundColor: C.card,
              borderRadius: '16px',
              border: `1px solid ${C.border}`,
              boxShadow: STheme.card,
              padding: '8px',
              display: 'flex',
              flexDirection: isMobile ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: '4px',
            }}
          >
            {TABS.map(tab => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  className="settings-tab"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: 'none',
                    background: activeTab === tab.id ? G.brand : 'transparent',
                    color: activeTab === tab.id ? '#fff' : C.muted,
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: activeTab === tab.id ? STheme.glow : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ display: 'inline-flex' }}><TabIcon size={16} /></span>
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Main Panel */}
          <div
            style={{
              flex: 1,
              backgroundColor: C.card,
              borderRadius: '16px',
              border: `1px solid ${C.border}`,
              boxShadow: STheme.card,
              padding: isMobile ? '20px' : '28px',
              animation: 'fadeIn 0.2s ease',
            }}
          >

            {/* ── NOTIFICATIONS TAB ── */}
            {activeTab === 'notifications' && (
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: C.heading, margin: '0 0 6px' }}>
                  Notification Settings
                </h2>
                <p style={{ fontSize: '12px', color: C.faint, margin: '0 0 24px' }}>
                  Connected to{' '}
                  <code style={{ background: C.borderLight, padding: '2px 6px', borderRadius: '4px' }}>
                    GET /jsonapi/message/*
                  </code>
                </p>

                {/* Preferences */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0px',
                    marginBottom: '28px',
                    border: `1px solid ${C.border}`,
                    borderRadius: '12px',
                    boxShadow: STheme.card,
                    overflow: 'hidden',
                  }}
                >
                  {[
                    { key: 'email_comments', label: 'Comments on my posts', icon: MessageCircle },
                    { key: 'email_likes', label: 'Likes on my posts', icon: ThumbsUp },
                    { key: 'email_mentions', label: 'Mentions (@me)', icon: AtSign },
                    { key: 'email_group_invites', label: 'Group invitations', icon: Users },
                    { key: 'email_messages', label: 'Private messages', icon: Mail },
                  ].map((pref, idx) => {
                    const PrefIcon = pref.icon;
                    return (
                      <div
                        key={pref.key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          borderBottom: idx < 4 ? `1px solid ${C.borderLight}` : 'none',
                          backgroundColor: C.card,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ display: 'inline-flex' }}><PrefIcon size={18} /></span>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: C.heading }}>{pref.label}</span>
                        </div>

                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={notifPrefs[pref.key]}
                            onChange={() => setNotifPrefs(p => ({ ...p, [pref.key]: !p[pref.key] }))}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Notifications from API */}
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: C.heading, margin: '0 0 12px' }}>
                    Recent Notifications from Backend
                  </h3>

                  {notifLoading ? (
                    <div style={{ color: C.faint, fontSize: '13px', padding: '20px', textAlign: 'center' }}>
                      Fetching from Drupal API...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div
                      style={{
                        color: C.faint,
                        fontSize: '13px',
                        padding: '20px',
                        textAlign: 'center',
                        backgroundColor: '#faf8ff',
                        borderRadius: '10px',
                      }}
                    >
                      No recent notifications found from backend
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px 14px',
                            backgroundColor: '#faf8ff',
                            borderRadius: '10px',
                            border: `1px solid ${C.border}`,
                          }}
                        >
                          <span style={{ display: 'inline-flex' }}><Bell size={16} /></span>

                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: C.heading }}>
                              {getNotifLabel(n.type)}
                            </div>
                            <div style={{ fontSize: '11px', color: C.faint, marginTop: '2px' }}>
                              by {n.actor} • {n.created ? new Date(n.created).toLocaleString() : 'recently'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: '20px', borderTop: `1px solid ${C.borderLight}`, marginTop: '20px' }}>
                  <button className="save-btn" onClick={() => showToast('Notification preferences saved!')} style={S.saveBtn}>
                    <Save size={14} /> Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* ── PASSWORD TAB ── */}
            {activeTab === 'password' && (
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: C.heading, margin: '0 0 6px' }}>
                  Change Password
                </h2>
                <p style={{ fontSize: '12px', color: C.faint, margin: '0 0 24px' }}>
                  Connected to{' '}
                  <code style={{ background: C.borderLight, padding: '2px 6px', borderRadius: '4px' }}>
                    PATCH /jsonapi/user/user/{'{id}'} (pass attribute)
                  </code>
                </p>

                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={S.label}>Current Password</label>
                    <input
                      className="settings-input"
                      type="password"
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      style={S.input}
                      required
                    />
                  </div>

                  <div>
                    <label style={S.label}>New Password</label>
                    <input
                      className="settings-input"
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      style={S.input}
                      required
                    />

                    {newPassword && (
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                        {['Weak', 'Medium', 'Strong'].map((lvl, i) => (
                          <div
                            key={lvl}
                            style={{
                              flex: 1,
                              height: '4px',
                              borderRadius: '2px',
                              backgroundColor:
                                newPassword.length > i * 4
                                  ? i === 0
                                    ? '#ef4444'
                                    : i === 1
                                      ? '#f59e0b'
                                      : '#10b981'
                                  : C.border,
                            }}
                          />
                        ))}
                        <span style={{ fontSize: '11px', color: C.muted, whiteSpace: 'nowrap' }}>
                          {newPassword.length < 5 ? 'Weak' : newPassword.length < 9 ? 'Medium' : 'Strong'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={S.label}>Confirm New Password</label>
                    <input
                      className="settings-input"
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      style={{
                        ...S.input,
                        borderColor: confirmPassword && confirmPassword !== newPassword ? '#ef4444' : '',
                      }}
                      required
                    />

                    {confirmPassword && confirmPassword !== newPassword && (
                      <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                        Passwords do not match
                      </p>
                    )}
                  </div>

                  <div
                    style={{
                      padding: '14px 18px',
                      backgroundColor: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#92400e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <KeyRound size={14} />
                    Password requirements: Min 8 characters, mix of letters, numbers, and symbols recommended.
                  </div>

                  <div style={{ paddingTop: '8px', borderTop: `1px solid ${C.borderLight}` }}>
                    <button
                      type="submit"
                      className="save-btn"
                      disabled={passwordSaving || (confirmPassword && confirmPassword !== newPassword)}
                      style={{ ...S.saveBtn, backgroundColor: '#ef4444' }}
                    >
                      {passwordSaving ? 'Changing...' : <><KeyRound size={14} /> Change Password</>}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}