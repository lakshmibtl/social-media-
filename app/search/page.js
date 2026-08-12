'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AppShell from '../../components/Appshell';
import { C, G, S } from '../../lib/theme';
import { Search, User } from 'lucide-react';
import { API_URL } from '../../lib/config';

const API_BASE = API_URL;

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = (searchParams.get('q') || '').trim();

  const [currentUser, setCurrentUser] = useState({ name: 'admin' });
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('openserver_user');
      if (saved) setCurrentUser(JSON.parse(saved));
    } catch (e) {}
  }, []);

  useEffect(() => {
    setLoading(true);
    const q = query.toLowerCase();

    try {
      const usersList = JSON.parse(localStorage.getItem('openserver_users_v2') || '[]');
      const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
      const meKey = currentUser.name?.toLowerCase() || 'admin';
      const myFollows = (followsMap[meKey] || []).map(x => x.toLowerCase());

      const users = usersList
        .filter(u => u.name && u.name.toLowerCase().includes(q))
        .map(u => ({ ...u, isFollowing: myFollows.includes(u.name.toLowerCase()) }));

      setMatchedUsers(users);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setLoading(false);
    }
  }, [query, currentUser.name]);

  const handleToggleFollow = async (targetUser, e) => {
    e.stopPropagation(); // Prevent navigating to profile when clicking follow
    const next = !targetUser.isFollowing;
    const meKey = currentUser.name?.toLowerCase() || 'admin';
    const targetUuid = targetUser.id;

    try {
      const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
      let myFollows = followsMap[meKey] || [];
      if (next) {
        if (!myFollows.map(x => x.toLowerCase()).includes(targetUser.name.toLowerCase())) {
          myFollows.push(targetUser.name);
        }
      } else {
        myFollows = myFollows.filter(x => x.toLowerCase() !== targetUser.name.toLowerCase());
      }
      followsMap[meKey] = myFollows;
      localStorage.setItem('openserver_follows_map', JSON.stringify(followsMap));
    } catch (e) {}

    try {
      const savedList = JSON.parse(localStorage.getItem('openserver_users_v2') || '[]');
      const updated = savedList.map(u =>
        u.name?.toLowerCase() === targetUser.name?.toLowerCase() ? { ...u, isFollowing: next } : u
      );
      localStorage.setItem('openserver_users_v2', JSON.stringify(updated));
    } catch (e) {}

    // Sync with openserver_following_sidebar
    try {
      const sidebar = JSON.parse(localStorage.getItem('openserver_following_sidebar') || '{}');
      sidebar[targetUser.name.toLowerCase()] = next;
      localStorage.setItem('openserver_following_sidebar', JSON.stringify(sidebar));
    } catch (e) {}

    setMatchedUsers(prev =>
      prev.map(u => u.name === targetUser.name ? { ...u, isFollowing: next } : u)
    );
    showToast(next ? `Now following ${targetUser.name}!` : `Unfollowed ${targetUser.name}`);

    // Call Drupal flag/unflag API
    if (targetUuid) {
      try {
        const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
        const token = (await tokenRes.text()).trim();

        if (next) {
          // Follow (POST)
          await fetch(`${API_URL}/jsonapi/flagging/follow_user`, {
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
                      id: targetUuid
                    }
                  }
                }
              }
            })
          });
        } else {
          // Unfollow (DELETE)
          const flagRes = await fetch(`${API_URL}/jsonapi/flagging/follow_user?filter[flagged_entity.id]=${targetUuid}`, {
            credentials: 'include',
            headers: { Accept: 'application/vnd.api+json' }
          });
          if (flagRes.ok) {
            const flagJson = await flagRes.json();
            const flagId = flagJson.data?.[0]?.id;
            if (flagId) {
              await fetch(`${API_URL}/jsonapi/flagging/follow_user/${flagId}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                  'X-CSRF-Token': token,
                  Accept: 'application/vnd.api+json'
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Drupal follow sync failed:', err);
      }
    }
  };

  const handleCardClick = (username) => {
    router.push(`/profile?username=${encodeURIComponent(username)}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto', padding: '10px' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: G.brand, color: '#fff', padding: '12px 22px', borderRadius: '12px', fontWeight: 600, fontSize: '13px', zIndex: 9999, boxShadow: S.glow, animation: 'fadeIn 0.2s', fontFamily: 'sans-serif' }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: C.heading, fontFamily: 'sans-serif' }}>
          Search Results
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '14px', color: C.muted, fontFamily: 'sans-serif' }}>
          Found {matchedUsers.length} profile{matchedUsers.length !== 1 ? 's' : ''} matching &quot;{query || 'everything'}&quot;
        </p>
      </div>

      {/* Results List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted, fontSize: '14px', fontWeight: 600, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Search size={16} /> Searching...
        </div>
      ) : matchedUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: C.muted, fontSize: '14px', background: '#fff', borderRadius: '12px', border: `1px solid ${C.border}`, boxShadow: S.card, fontFamily: 'sans-serif' }}>
          <div style={{ marginBottom: '12px' }}><User size={36} color={C.faint} /></div>
          <div>No users found for &quot;{query}&quot;</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {matchedUsers.map(usr => (
            <div
              key={usr.id || usr.name}
              onClick={() => handleCardClick(usr.name)}
              style={{
                background: '#fff',
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: S.card,
                fontFamily: 'sans-serif'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = S.cardHover;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = S.card;
              }}
            >
              {/* Profile details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `1.5px solid ${C.border}` }}>
                  {usr.avatar ? (
                    <img src={usr.avatar} alt={usr.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#8e2de2,#4a00e0)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>
                      {(usr.name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: C.heading }}>{usr.name}</span>
                  <span style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>@{usr.name?.toLowerCase()} • {usr.role || 'Member'}</span>
                </div>
              </div>

              {/* Follow Button (MUI/Instagram style) */}
              {usr.name?.toLowerCase() !== currentUser.name?.toLowerCase() && (
                <button
                  onClick={(e) => handleToggleFollow(usr, e)}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '8px',
                    border: usr.isFollowing ? `1.5px solid ${C.border}` : 'none',
                    background: usr.isFollowing ? 'transparent' : G.brand,
                    color: usr.isFollowing ? C.heading : '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (!usr.isFollowing) e.currentTarget.style.background = C.primary;
                    else e.currentTarget.style.background = '#faf8ff';
                  }}
                  onMouseLeave={e => {
                    if (!usr.isFollowing) e.currentTarget.style.background = G.brand;
                    else e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {usr.isFollowing ? 'Following' : 'Follow'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <AppShell>
      <Suspense fallback={
        <div style={{ textAlign: 'center', padding: '80px 0', color: C.muted, fontSize: '14px', fontWeight: 600, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Search size={16} /> Loading search results...
        </div>
      }>
        <SearchContent />
      </Suspense>
    </AppShell>
  );
}
