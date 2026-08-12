'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '../../components/Appshell';
import { BarChart3, X, Plus, Pencil, Rocket, Lock, Check, Vote } from 'lucide-react';
import { C, G, S } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const API_BASE = API_URL;
const POLL_ENDPOINT = '/jsonapi/node/page';

// ---------- JSON:API HELPERS ----------
async function getCsrfToken() {
  try {
    const res = await fetch(`${API_BASE}/session/token`, { credentials: 'include' });
    return await res.text();
  } catch (e) { return ''; }
}

async function jsonApiFetch(endpoint, method = 'GET', body = null) {
  const headers = { 'Accept': 'application/vnd.api+json' };
  const options = { method, headers, credentials: 'include' };

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/vnd.api+json';
    headers['X-CSRF-Token'] = await getCsrfToken();
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  if (!res.ok) {
    try {
      const errData = await res.json();
      console.error('Drupal API Error Details:', JSON.stringify(errData, null, 2));
    } catch (e) {}
    throw new Error(`API error: ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

function recordActivityLog(message) {
  try {
    const existing = JSON.parse(localStorage.getItem('openserver_logs_v2') || '[]');
    existing.unshift({ id: Date.now(), message, timestamp: new Date().toISOString() });
    localStorage.setItem('openserver_logs_v2', JSON.stringify(existing.slice(0, 200)));
  } catch (e) { }

  jsonApiFetch('/jsonapi/message/create_poll', 'POST', {
    data: {
      type: 'message--create_poll',
      attributes: { field_activity_message: message }
    }
  }).catch(() => { });
}

export default function PollsPage() {
  const [polls, setPolls] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // New Poll Form State
  const [newQuestion, setNewQuestion] = useState('');
  const [newCategory, setNewCategory] = useState('Feature Request');
  const [newOptions, setNewOptions] = useState(['', '']);   // ✅ OPTIONS ARE BACK
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [currentUser, setCurrentUser] = useState({
    name: 'admin',
    role: 'Administrator',
    initials: 'AD',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  });

  // ---------- LOAD POLLS + VOTE RESULTS FROM BACKEND ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const u = JSON.parse(localStorage.getItem('openserver_user'));
      if (u && u.name) {
        setCurrentUser({
          name: u.name,
          role: u.role || 'Member',
          initials: u.name.substring(0, 2).toUpperCase(),
          avatar: u.avatar || currentUser.avatar
        });
      }
    } catch (e) { }

    // Load from localStorage first as fallback database
    let localPolls = [];
    try {
      const saved = localStorage.getItem('openserver_polls_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localPolls = parsed;
        }
      }
    } catch (e) {}

    // Populate with premium default polls if completely empty
    if (localPolls.length === 0) {
      localPolls = [
        {
          id: 'poll-default-1',
          question: 'Which frontend micro-animations framework do you prefer?',
          category: 'Design & UX',
          author: 'Sarah Chen',
          role: 'Product Designer',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
          status: 'Active',
          totalVotes: 12,
          userVotes: {},
          options: [
            { id: 'opt-def1-1', text: 'Framer Motion', votes: 7 },
            { id: 'opt-def1-2', text: 'GSAP (GreenSock)', votes: 3 },
            { id: 'opt-def1-3', text: 'CSS Transitions / Web Animations API', votes: 2 }
          ]
        },
        {
          id: 'poll-default-2',
          question: 'Should we adopt Next.js App Router for the next phase?',
          category: 'Feature Request',
          author: 'Alex Rivera',
          role: 'Tech Lead',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          status: 'Active',
          totalVotes: 8,
          userVotes: {},
          options: [
            { id: 'opt-def2-1', text: 'Yes, App Router is stable and modern', votes: 6 },
            { id: 'opt-def2-2', text: 'No, keep Pages Router for simplicity', votes: 2 }
          ]
        }
      ];
      try {
        localStorage.setItem('openserver_polls_v2', JSON.stringify(localPolls));
      } catch (e) {}
    }

    setPolls(localPolls);

    fetch(`${API_BASE}/polls_proxy.php`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setPolls(data);
          try {
            localStorage.setItem('openserver_polls_v2', JSON.stringify(data));
          } catch (e) {}
        }
      })
      .catch(err => console.error('Error fetching polls:', err));
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2800);
  };

  // ---------- VOTE (saves to backend /jsonapi/vote/vote) ----------
  const handleVote = async (pollId, optionId) => {
    const poll = polls.find(p => p.id === pollId);
    const previousVotedId = poll?.userVotes?.[currentUser.name] || null;
    const isToggleOff = previousVotedId === optionId;

    // Find the index of the selected option
    const optionIndex = poll ? poll.options.findIndex(opt => opt.id === optionId) : 0;

    // Update UI instantly and save to localStorage
    const updatedPolls = polls.map(p => {
      if (p.id !== pollId) return p;
      const updatedOptions = p.options.map(opt => {
        if (opt.id === optionId) return { ...opt, votes: isToggleOff ? Math.max(0, opt.votes - 1) : opt.votes + 1 };
        if (previousVotedId && opt.id === previousVotedId && !isToggleOff) return { ...opt, votes: Math.max(0, opt.votes - 1) };
        return opt;
      });
      const userVotes = { ...(p.userVotes || {}) };
      if (isToggleOff) delete userVotes[currentUser.name];
      else userVotes[currentUser.name] = optionId;

      return {
        ...p,
        options: updatedOptions,
        userVotes,
        totalVotes: updatedOptions.reduce((s, o) => s + o.votes, 0)
      };
    });

    setPolls(updatedPolls);
    try {
      localStorage.setItem('openserver_polls_v2', JSON.stringify(updatedPolls));
    } catch (e) {}

    showToast(isToggleOff ? 'Removed vote' : 'Vote recorded successfully!');

    // Save vote in backend database using the proxy
    try {
      const updatedPoll = updatedPolls.find(p => p.id === pollId);
      const res = await fetch(`${API_BASE}/polls_proxy.php`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPoll),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Proxy PATCH failed');
    } catch (err) {
      console.error('Error saving vote:', err);
      showToast('Failed to save vote to backend');
    }
  };

  // ---------- OPTION INPUT HANDLERS ----------
  const handleAddOptionInput = () => {
    if (newOptions.length >= 6) { showToast('Maximum 6 options allowed per poll.'); return; }
    setNewOptions([...newOptions, '']);
  };

  const handleRemoveOptionInput = (index) => {
    if (newOptions.length <= 2) { showToast('Polls require at least 2 options.'); return; }
    setNewOptions(newOptions.filter((_, i) => i !== index));
  };

  const handleOptionTextChange = (index, value) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  // ---------- CREATE POLL (saves to backend) ----------
  const handleCreatePollSubmit = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    const validOptions = newOptions.map(o => o.trim()).filter(Boolean);
    if (validOptions.length < 2) { showToast('Please fill at least 2 options.'); return; }

    const tempId = 'poll-' + Date.now();
    const createdPoll = {
      id: tempId,
      question: newQuestion.trim(),
      category: newCategory,
      author: currentUser.name,
      role: currentUser.role,
      avatar: currentUser.avatar,
      status: 'Active',
      totalVotes: 0,
      userVotes: {},
      options: validOptions.map((t, i) => ({ id: `opt-${tempId}-${i}`, text: t, votes: 0 }))
    };

    // Save poll to backend database proxy
    try {
      const res = await fetch(`${API_BASE}/polls_proxy.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createdPoll),
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Proxy POST failed');

      const updatedPolls = [createdPoll, ...polls];
      setPolls(updatedPolls);
      try {
        localStorage.setItem('openserver_polls_v2', JSON.stringify(updatedPolls));
      } catch (e) {}

      showToast('New Poll published!');
      recordActivityLog(`poll New poll created: "${createdPoll.question}"`);
    } catch (err) {
      console.error('Error creating poll:', err);
      showToast('Failed to save poll to backend');

      // Fallback locally
      const updatedPolls = [createdPoll, ...polls];
      setPolls(updatedPolls);
      try {
        localStorage.setItem('openserver_polls_v2', JSON.stringify(updatedPolls));
      } catch (e) {}
    }

    setNewQuestion('');
    setNewCategory('Feature Request');
    setNewOptions(['', '']);
    setShowCreateModal(false);
  };

  const pollsList = Array.isArray(polls) ? polls : [];
  const filteredPolls = pollsList.filter((poll) => {
    if (searchQuery && !poll.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeFilter === 'active') return poll.status === 'Active';
    if (activeFilter === 'closed') return poll.status === 'Closed';
    if (activeFilter === 'my_votes') return Boolean((poll.userVotes || {})[currentUser.name]);
    return true;
  });

  return (
    <AppShell>
      {toastMsg && <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#6d28d9', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: '700', fontSize: '13px', zIndex: 9999 }}>{toastMsg}</div>}

      <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Hero Banner */}
        <div style={{ background: G.hero, borderRadius: '16px', padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', boxShadow: S.glow }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: '0 0 6px 0' }}><BarChart3 size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />Community Polls & Feedback Center</h1>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Vote on feature requests, design options, and team initiatives in real-time.</p>
          </div>
          <button onClick={() => setShowCreateModal(!showCreateModal)} style={{ backgroundColor: '#fff', color: C.primaryText, border: 'none', borderRadius: '20px', padding: '10px 22px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {showCreateModal ? <><X size={14} /> Close Form</> : <><Plus size={16} /> Create New Poll</>}
          </button>
        </div>

        {/* ✅ FULL Create Poll Form (Question + Category + Options) */}
        {showCreateModal && (
          <form onSubmit={handleCreatePollSubmit} style={{ backgroundColor: '#ffffff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', boxShadow: S.card }}>
            <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: C.heading }}><Pencil size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />Create a New Community Poll</h2>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Poll Question</label>
              <input type="text" placeholder="e.g. Which feature should we build next?" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} style={{ width: '100%', backgroundColor: '#ffffff', border: `1px solid ${C.faint}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }} required />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Category</label>
              <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} style={{ width: '100%', backgroundColor: '#ffffff', border: `1px solid ${C.faint}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}>
                <option value="Feature Request">Feature Request</option>
                <option value="Design & UX">Design & UX</option>
                <option value="Community Events">Community Events</option>
                <option value="General Feedback">General Feedback</option>
              </select>
            </div>

            {/* ✅ OPTIONS SECTION (this was missing) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Poll Options</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {newOptions.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder={`Option ${idx + 1}...`} value={opt} onChange={(e) => handleOptionTextChange(idx, e.target.value)} style={{ width: '100%', backgroundColor: '#ffffff', border: `1px solid ${C.faint}`, borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }} required />
                    {newOptions.length > 2 && (
                      <button type="button" onClick={() => handleRemoveOptionInput(idx)} style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              {newOptions.length < 6 && (
                <button type="button" onClick={handleAddOptionInput} style={{ backgroundColor: '#f0ebff', color: '#6d28d9', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: '700', marginTop: '8px', cursor: 'pointer' }}>+ Add Option</button>
              )}
            </div>

            <button type="submit" style={{ backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '20px', padding: '10px 24px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Rocket size={14} /> Publish Poll</button>
          </form>
        )}

        {/* Filter Row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[{ id: 'all', label: 'All Polls' }, { id: 'active', label: 'Active', dot: true }, { id: 'closed', label: 'Closed', lock: true }, { id: 'my_votes', label: 'My Votes', check: true }].map((f) => (
            <button key={f.id} type="button" onClick={() => setActiveFilter(f.id)} style={{ backgroundColor: activeFilter === f.id ? C.primarySoft : '#ffffff', color: activeFilter === f.id ? C.primary : C.muted, border: activeFilter === f.id ? `1px solid ${C.primary}` : `1px solid ${C.border}`, borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: activeFilter === f.id ? '700' : '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {f.dot && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', marginRight: '6px' }} />}
              {f.lock && <Lock size={12} style={{ marginRight: '6px' }} />}
              {f.check && <Check size={12} style={{ marginRight: '6px' }} />}
              {f.label}
            </button>
          ))}
        </div>

        {/* Poll Cards */}
        {filteredPolls.length === 0 ? (
          <div style={{ backgroundColor: '#ffffff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '40px', textAlign: 'center', boxShadow: S.card }}>
            <div style={{ marginBottom: '12px' }}><BarChart3 size={40} color={C.faint} /></div>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: C.heading, marginBottom: '6px' }}>No Polls Available</h3>
            <p style={{ fontSize: '14px', color: C.muted }}>Click "+ Create New Poll" above to add community polls.</p>
          </div>
        ) : (
          filteredPolls.map((poll) => (
            <div key={poll.id} style={{ backgroundColor: '#ffffff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', boxShadow: S.card }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={poll.avatar} alt={poll.author} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <span style={{ fontWeight: '800', fontSize: '14px', color: C.heading }}>{poll.author}</span>
                    <span style={{ fontSize: '11px', color: C.muted, marginLeft: '6px' }}>{poll.role}</span>
                  </div>
                </div>
                <span style={{ backgroundColor: C.primarySoft, color: C.primary, fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '6px' }}>{poll.category}</span>
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.heading, marginBottom: '14px' }}>{poll.question}</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {poll.options.map((opt) => {
                  const userVotes = poll.userVotes || {};
                  const hasVoted = Boolean(userVotes[currentUser.name]);
                  const isSelected = userVotes[currentUser.name] === opt.id;
                  const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;

                  return (
                    <button key={opt.id} type="button" onClick={() => handleVote(poll.id, opt.id)} style={{ width: '100%', borderRadius: '12px', border: isSelected ? `1px solid ${C.primary}` : `1px solid ${C.border}`, backgroundColor: isSelected ? C.primarySoft : '#faf8ff', padding: '12px 16px', textAlign: 'left', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: hasVoted ? '6px' : '0', fontSize: '13px', fontWeight: '700', color: C.heading, flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{isSelected ? <Check size={14} color={C.primary} /> : null}{opt.text}</span>
                        {hasVoted && <span style={{ color: C.primary }}>{pct}% ({opt.votes} votes)</span>}
                      </div>
                      {hasVoted && (
                        <div style={{ height: '6px', backgroundColor: C.border, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: G.brand, borderRadius: '3px', width: `${pct}%`, transition: 'width 0.4s ease' }} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              <div style={{ paddingTop: '12px', borderTop: `1px solid ${C.borderLight}`, fontSize: '12px', color: C.muted, fontWeight: '600' }}>
                <Vote size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} /> {poll.totalVotes} Total Votes Submitted
              </div>
            </div>
          ))
        )}
      </main>
    </AppShell>
  );
}