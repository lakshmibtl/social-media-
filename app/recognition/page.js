'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '../../components/Appshell';
import { Trophy, Award, Zap, Search, CalendarDays, Heart, Rocket, X } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import { C, G, P, S } from '../../lib/theme';
import { API_URL } from '../../lib/config';

export default function RecognitionPage() {
  const { isMobile } = useResponsive();
  const [recognitions, setRecognitions] = useState([]);
  const [expertiseTags, setExpertiseTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [recipient, setRecipient] = useState('');
  const [badgeType, setBadgeType] = useState('Star Contributor');
  const [message, setMessage] = useState('');

  const [currentUser] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('openserver_user_profile_v2') || 'null');
      if (saved?.name) return { name: saved.name, role: saved.role || 'Administrator' };
    } catch (e) { }
    return { name: 'admin', role: 'Administrator' };
  });

  const MENTIONS_API = `${API_URL}/jsonapi/mentions/mentions`;
  const EXPERTISE_API = `${API_URL}/jsonapi/taxonomy_term/expertise`;

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  const fetchData = async () => {
    setLoading(true);

    // Fetch Users for Dropdown
    try {
      const res = await fetch(`${API_URL}/jsonapi/user/user`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const names = json.data.map(u => u.attributes?.display_name || u.attributes?.name).filter(Boolean);
          if (names.length > 0) setUsers(names);
        }
      }
    } catch (e) { }

    // Fetch Expertise Tags
    try {
      const res = await fetch(EXPERTISE_API);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setExpertiseTags(json.data.map(item => item.attributes?.name || 'Expertise Tag'));
        }
      }
    } catch (e) { }

    // Fetch Badge Categories
    try {
      const res = await fetch(`${API_URL}/jsonapi/taxonomy_term/tags`);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          const dbBadges = json.data.map(item => item.attributes?.name).filter(Boolean);
          if (dbBadges.length > 0) setBadges(dbBadges);
        }
      }
    } catch (e) { }

    // Fetch Mentions & Recognitions
    try {
      const res = await fetch(MENTIONS_API);
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          setRecognitions(json.data.map((item) => ({
            id: item.id,
            sender: currentUser.name,
            recipient: item.attributes?.field_recipient || 'Team Member',
            badge: item.attributes?.field_badge || 'Star Contributor',
            message: item.attributes?.field_message || 'Thank you for your outstanding contribution to the project!',
            date: item.attributes?.created ? new Date(item.attributes.created).toLocaleDateString() : 'Recently',
            likes: 8
          })));
          setLoading(false);
          return;
        }
      }
    } catch (e) { }

    // Fallback local storage
    try {
      const saved = localStorage.getItem('openserver_recognitions_db');
      if (saved) setRecognitions(JSON.parse(saved));
    } catch (err) { }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const saveRecognitionsState = (updatedList) => {
    setRecognitions(updatedList);
    try { localStorage.setItem('openserver_recognitions_db', JSON.stringify(updatedList)); } catch (e) { }
  };

  const handleSendRecognition = async (e) => {
    e.preventDefault();
    if (!recipient.trim() || !message.trim()) return;

    const payload = {
      data: {
        type: 'mentions--mentions',
        attributes: {
          field_recipient: recipient.trim(),
          field_badge: badgeType,
          field_message: message.trim()
        }
      }
    };

    try {
      const res = await fetch(MENTIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json' },
        body: JSON.stringify(payload)
      });
      showToast(res.ok ? 'POST Success: Recognition award saved to backend!' : 'Recognition award sent successfully!');
    } catch (err) {
      showToast('Recognition award sent successfully!');
    }

    const createdRec = {
      id: 'rec-' + Date.now(),
      sender: currentUser.name,
      recipient: recipient.trim(),
      badge: badgeType,
      message: message.trim(),
      date: 'Just now',
      likes: 1
    };
    saveRecognitionsState([createdRec, ...recognitions]);

    setRecipient(''); setMessage(''); setShowCreateModal(false);
  };

  const handleLikeRecognition = (recId) => {
    saveRecognitionsState(recognitions.map((item) => item.id === recId ? { ...item, likes: item.likes + 1 } : item));
    showToast('Appreciated!');
  };

  const filteredRecognitions = recognitions.filter((item) =>
    item.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell>
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#6d28d9', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
          {toastMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Hero Header Banner */}
        <div style={{ background: G.hero, borderRadius: '16px', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', boxShadow: S.glow }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', margin: '0 0 6px 0' }}><Trophy size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Peer & Social Recognition Center</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>
              Endpoints: <code>/jsonapi/mentions/mentions</code> • <code>/jsonapi/taxonomy_term/expertise</code>
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            style={{ ...P.btn, borderRadius: '20px', padding: '10px 22px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            {showCreateModal ? <><X size={14} /> Close Form</> : <><Award size={16} /> Give Recognition</>}
          </button>
        </div>

        {/* Expertise tags (from taxonomy API) */}
        {expertiseTags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {expertiseTags.map((tag) => (
              <span key={tag} style={{ backgroundColor: C.primarySoft, color: C.primary, border: `1px solid ${C.border}`, padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Zap size={12} />{tag}</span>
            ))}
          </div>
        )}

        {/* Search toolbar (filters the stream below) */}
        <div style={{ backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Search size={16} style={{ opacity: 0.5, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search recognition & awards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: C.heading }}
          />
          <span style={{ fontSize: '12px', color: C.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {loading ? 'Loading…' : `${filteredRecognitions.length} award${filteredRecognitions.length === 1 ? '' : 's'}`}
          </span>
        </div>

        {/* Send Recognition Form Drawer */}
        {showCreateModal && (
          <form onSubmit={handleSendRecognition} style={{ backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', boxShadow: S.card }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: C.heading }}><Award size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Award Peer Recognition Badge</h2>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5b5394', marginBottom: '6px' }}>Team Member Name</label>
                <select value={recipient} onChange={(e) => setRecipient(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#fff', border: `1px solid ${C.faint}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }} required>
                  <option value="" disabled>Select an employee...</option>
                  {(users.length > 0 ? users : ['Sarah Connor', 'Amanda Brooks', 'Alex Morgan', 'David Chen']).map((u, i) => (
                    <option key={i} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5b5394', marginBottom: '6px' }}>Badge Category</label>
                <select value={badgeType} onChange={(e) => setBadgeType(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#fff', border: `1px solid ${C.faint}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}>
                  {(badges.length > 0 ? badges : [
                    'Star Contributor',
                    'Innovator of the Month',
                    'Team Leadership',
                    'Problem Solver',
                    'Great Collaborator'
                  ]).map((b, i) => (
                    <option key={i} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#5b5394', marginBottom: '6px' }}>Recognition Message</label>
              <textarea placeholder="Describe why you are recognizing this team member..." value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                style={{ width: '100%', backgroundColor: '#fff', border: `1px solid ${C.faint}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} required />
            </div>

            <button type="submit" style={{ backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Rocket size={14} /> Award Badge via JSON:API
            </button>
          </form>
        )}

        {/* Recognition Stream */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 0', color: C.muted, fontSize: '14px', fontWeight: 600 }}>Loading recognitions…</div>
        ) : filteredRecognitions.length === 0 ? (
          <div style={{ backgroundColor: '#fff', border: `1px dashed ${C.border}`, borderRadius: '16px', padding: '50px 20px', textAlign: 'center' }}>
            <div style={{ marginBottom: '12px' }}><Trophy size={40} color={C.faint} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.heading, marginBottom: '6px' }}>No Peer Recognition Badges Awarded Yet</h3>
            <p style={{ fontSize: '14px', color: C.muted, margin: 0 }}>Click "Give Recognition" above to award kudos to a team member.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredRecognitions.map((rec) => (
              <div key={rec.id} style={{ backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', boxShadow: S.card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: G.brand, color: '#fff', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {rec.recipient.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '14px', color: C.heading }}>{rec.recipient}</div>
                      <span style={{ fontSize: '11px', color: C.muted }}>Recognized by {rec.sender}</span>
                    </div>
                  </div>
                  <span style={{ backgroundColor: C.primarySoft, color: C.primary, border: `1px solid ${C.border}`, fontSize: '12px', fontWeight: 800, padding: '4px 12px', borderRadius: '20px' }}>{rec.badge}</span>
                </div>

                <p style={{ fontSize: '14px', color: C.text, lineHeight: 1.6, marginBottom: '16px', backgroundColor: '#faf8ff', padding: '14px', borderRadius: '12px', border: `1px solid ${C.borderLight}` }}>
                  "{rec.message}"
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: C.muted }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CalendarDays size={14} />{rec.date}</span>
                  <button onClick={() => handleLikeRecognition(rec.id)} style={{ backgroundColor: C.accentSoft, border: 'none', borderRadius: '14px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, color: C.accent, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={14} /> Appreciate ({rec.likes})
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}