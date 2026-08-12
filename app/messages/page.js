'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '../../components/Appshell';
import useResponsive from '../../lib/useResponsive';
import { C, G, S, P } from '../../lib/theme';
import { MessageCircle, Search, Phone, Settings, Send } from 'lucide-react';
import { API_URL } from '../../lib/config';

const API = `${API_URL}/jsonapi`;

/* ---------- Helpers ---------- */
const getInitials = (name) => {
  const n = (name || '').trim();
  if (!n) return '??';
  const parts = n.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : n.slice(0, 2)).toUpperCase();
};

const asText = (raw, fallback = '(message)') => {
  if (raw == null) return fallback;
  if (typeof raw === 'string') return raw;
  return raw.value || fallback;
};

function Avatar({ src, name, size = 40 }) {
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: G.brand, color: '#fff', fontWeight: 800, fontSize: Math.round(size * 0.32), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {getInitials(name)}
    </div>
  );
}

async function getCsrfToken() {
  const res = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Login to Drupal first (${API_URL})`);
  return (await res.text()).trim();
}

async function apiWrite(path, method, body) {
  const token = await getCsrfToken();
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': token },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = `HTTP ${res.status}`;
    try {
      const err = errText ? JSON.parse(errText) : null;
      detail = err?.errors?.[0]?.detail || err?.errors?.[0]?.title || detail;
    } catch (e) { }
    throw new Error(detail);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function apiProxyWrite(queryString, body) {
  const token = await getCsrfToken();
  const res = await fetch(`${API_URL}/messages_proxy.php${queryString}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': token },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = `HTTP ${res.status}`;
    try {
      const err = errText ? JSON.parse(errText) : null;
      detail = err?.errors?.[0]?.detail || err?.errors?.[0]?.title || detail;
    } catch (e) { }
    throw new Error(detail);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const fmtTime = (iso) => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now';

export default function PrivateMessagesPage() {
  const { isMobile } = useResponsive();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState('');
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [allPeople, setAllPeople] = useState([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [myUuid, setMyUuid] = useState('');

  const [currentUser] = useState(() => {
    try {
      const a = JSON.parse(localStorage.getItem('openserver_user') || 'null');
      const b = JSON.parse(localStorage.getItem('openserver_user_profile_v2') || 'null');
      return { name: a?.name || b?.name || 'admin', role: a?.role || b?.role || 'Administrator' };
    } catch (e) { return { name: 'admin', role: 'Administrator' }; }
  });

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  /* ---------- 🔥 FIXED: merge all threads of same person → ONE row (WhatsApp style) ---------- */
  const loadThreads = async (myId, username) => {
    try {
      const res = await fetch(`${API_URL}/messages_proxy.php?username=${username}`, {
        credentials: 'include',
        headers: { Accept: 'application/vnd.api+json' }
      });
      if (!res.ok) return;
      const json = await res.json();

      const userName = {}; const msgById = {};
      (json.included || []).forEach((i) => {
        if (i.type === 'user--user') userName[i.id] = i.attributes?.name || i.attributes?.display_name || 'User';
        if (i.type === 'private_message--private_message') {
          msgById[i.id] = {
            id: i.id,
            text: asText(i.attributes?.message),
            ownerId: i.relationships?.owner?.data?.id,
            created: i.attributes?.created
          };
        }
      });

      // Group threads BY PERSON
      const byPerson = {};
      (json.data || []).forEach((t) => {
        const memberIds = (t.relationships?.members?.data || []).map((m) => m.id);
        const otherId = memberIds.find((id) => id !== myId) || memberIds[0] || 'unknown';
        if (!byPerson[otherId]) {
          byPerson[otherId] = { recipient: userName[otherId] || 'User', recipientId: otherId, threads: [], msgs: [] };
        }
        byPerson[otherId].threads.push({ id: t.id, updated: t.attributes?.updated || '' });
        (t.relationships?.private_messages?.data || []).forEach((d) => {
          if (msgById[d.id]) byPerson[otherId].msgs.push(msgById[d.id]);
        });
      });

      // One conversation per person
      const convs = Object.values(byPerson).map((g) => {
        const msgs = g.msgs
          .sort((a, b) => (a.created || '').localeCompare(b.created || ''))
          .map((m) => ({ id: m.id, sender: userName[m.ownerId] || 'User', isMe: m.ownerId === myId, text: m.text, time: fmtTime(m.created) }));
        const latestThread = g.threads.sort((a, b) => (a.updated || '').localeCompare(b.updated || ''))[g.threads.length - 1];
        return {
          id: 'conv-' + g.recipientId,
          threadId: latestThread?.id || null,
          recipient: g.recipient,
          recipientId: g.recipientId,
          role: 'Member',
          avatar: null,
          unread: 0,
          online: true,
          msgs,
          lastMessage: msgs.length ? msgs[msgs.length - 1].text : 'No messages yet',
          time: msgs.length ? msgs[msgs.length - 1].time : 'Now'
        };
      });

      // Newest conversation on top
      convs.sort((a, b) => (b.msgs.length ? b.msgs[b.msgs.length - 1].time : '').localeCompare(a.msgs.length ? a.msgs[a.msgs.length - 1].time : ''));
      setConversations(convs);
    } catch (e) { console.error(e); }
  };

  /* ---------- Boot ---------- */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/user/user?page[limit]=100`, { credentials: 'include', headers: { Accept: 'application/vnd.api+json' } });
        if (res.ok) {
          const json = await res.json();
          const people = (json.data || []).map((u) => ({
            id: u.id,
            name: u.attributes?.name || u.attributes?.display_name || 'User',
            role: 'Member',
            email: u.attributes?.mail || '',
            avatar: null
          }));
          setAllPeople(people);
          const me = people.find((p) => p.name === currentUser.name);
          if (me) { setMyUuid(me.id); await loadThreads(me.id, currentUser.name); }
        }
      } catch (e) { }
      setLoading(false);
    })();
  }, []);

  const openConversation = (conv) => { setActiveConvId(conv.id); setMessages(conv.msgs || []); };

  const startConversation = (person) => {
    const existing = conversations.find((c) => c.recipientId === person.id);
    if (existing) { openConversation(existing); setPeopleSearch(''); return; }
    const conv = {
      id: 'conv-' + person.id,
      threadId: null,
      recipient: person.name,
      recipientId: person.id,
      role: person.role,
      avatar: person.avatar,
      lastMessage: 'New conversation — say hi',
      time: 'Now',
      unread: 0,
      online: true,
      msgs: []
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    setMessages([]);
    setPeopleSearch('');
    showToast(`Chat opened with ${person.name}`);
  };

  /* ---------- Send message ---------- */
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = newMessageText.trim();
    if (!text) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) return;
    if (!myUuid) { showToast(`Could not detect your user — login at ${API_URL} first`); return; }

    try {
      let threadId = conv.threadId;

      if (!threadId) {
        const t = await apiProxyWrite('?action=create_thread', {
          data: {
            type: 'private_message--private_message_thread',
            relationships: {
              members: { data: [{ type: 'user--user', id: myUuid }, { type: 'user--user', id: conv.recipientId }] }
            }
          }
        });
        threadId = t.data.id;
      }

      const m = await apiProxyWrite('?action=create_message', {
        data: {
          type: 'private_message--private_message',
          attributes: { message: { value: text } },
          relationships: { owner: { data: { type: 'user--user', id: myUuid } } }
        }
      });
      const msgId = m.data.id;

      await apiProxyWrite(`?action=add_message_to_thread&thread_id=${threadId}`, {
        data: [{ type: 'private_message--private_message', id: msgId }]
      });

      const newMsg = { id: msgId, sender: currentUser.name, isMe: true, text, time: 'Just now' };
      setMessages((prev) => [...prev, newMsg]);
      setConversations((prev) => prev.map((c) => c.id === activeConvId
        ? { ...c, threadId, msgs: [...(c.msgs || []), newMsg], lastMessage: text, time: 'Now' }
        : c));
      setNewMessageText('');
      showToast('Message saved to database!');
    } catch (err) {
      console.error(err);
      showToast(`DB Error: ${err.message}`);
    }
  };

  const peopleResults = peopleSearch.trim()
    ? allPeople.filter((p) => p.name.toLowerCase().includes(peopleSearch.toLowerCase()))
    : [];

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <AppShell>
      <style>{`
        .conv-item {
          transition: all 0.2s ease;
        }
        .conv-item:hover {
          background-color: ${C.bg} !important;
        }
        .msg-input:focus {
          background-color: #ffffff !important;
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 3px ${C.primarySoft} !important;
        }
        .msg-search-input:focus {
          background-color: #ffffff !important;
          border-color: ${C.primary} !important;
          box-shadow: 0 0 0 3px ${C.primarySoft} !important;
        }
        .msg-send-btn:hover {
          transform: scale(1.05);
        }
        .header-icon-btn {
          color: ${C.muted};
          transition: all 0.2s;
        }
        .header-icon-btn:hover {
          background-color: ${C.bg} !important;
          color: ${C.primary} !important;
        }
      `}</style>

      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#262626', color: '#fff', padding: '14px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          {toastMsg}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '350px 1fr', overflow: 'hidden', height: '720px', boxShadow: S.card }}>

        {/* LEFT (Conversations List Sidebar) */}
        {(!isMobile || !viewChat) && (
          <div style={{ borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', backgroundColor: '#fff' }}>
            <div style={{ padding: '24px 20px 16px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: C.heading, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageCircle size={22} style={{ color: C.primary }} /> Direct Messages
              </h2>
              <span style={{ fontSize: '11px', color: C.muted }}>Connect with colleagues in real-time</span>

              <div style={{ marginTop: '16px', position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                <input
                  type="text"
                  value={peopleSearch}
                  onChange={(e) => setPeopleSearch(e.target.value)}
                  placeholder="Search people to message..."
                  style={{ width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '10px 16px 10px 40px', fontSize: '13px', color: C.text, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
                  className="msg-search-input"
                />
                {peopleSearch.trim() && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', border: `1px solid ${C.border}`, borderRadius: '12px', backgroundColor: '#fff', maxHeight: '230px', overflowY: 'auto', boxShadow: '0 12px 24px rgba(0,0,0,0.08)', zIndex: 10 }}>
                    {peopleResults.length === 0 && (
                      <div style={{ padding: '12px 14px', fontSize: '12px', color: C.faint }}>No people found for “{peopleSearch}”</div>
                    )}
                    {peopleResults.map((p) => (
                      <button key={p.id} onClick={() => startConversation(p)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 12px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                        <Avatar src={p.avatar} name={p.name} size={34} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: C.heading, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: C.muted }}>{p.email || p.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {loading && <div style={{ textAlign: 'center', color: C.faint, fontSize: '12px', padding: '20px 0' }}>Loading…</div>}
              {!loading && conversations.length === 0 && (
                <div style={{ textAlign: 'center', color: C.muted, fontSize: '13px', padding: '40px 20px', fontWeight: 500 }}>
                  No conversations yet.<br />
                  <span style={{ fontSize: '12px', color: C.faint, marginTop: '4px', display: 'block' }}>Search a user above to start chatting.</span>
                </div>
              )}
              {conversations.map((conv) => {
                const isSelected = activeConvId === conv.id;
                return (
                  <button key={conv.id} onClick={() => openConversation(conv)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 20px',
                      border: 'none', borderBottom: `1px solid ${C.borderLight}`,
                      backgroundColor: isSelected ? C.primarySoft : 'transparent',
                      borderLeft: isSelected ? `4px solid ${C.primary}` : '4px solid transparent',
                      textAlign: 'left', cursor: 'pointer'
                    }}
                    className="conv-item"
                  >
                    <Avatar src={conv.avatar} name={conv.recipient} online={conv.online} />
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: C.heading }}>{conv.recipient}</span>
                        <span style={{ fontSize: '11px', color: C.muted }}>{conv.time}</span>
                      </div>
                      <p style={{ fontSize: '12px', color: C.muted, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{conv.lastMessage}</p>
                    </div>
                    {conv.unread > 0 && (
                      <span style={{ backgroundColor: C.primary, color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{conv.unread}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* RIGHT (Active Chat Window) */}
        {(!isMobile || viewChat) && (
          <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc', height: '100%' }}>
            {!activeConv ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: C.muted, padding: '20px' }}>
                <div style={{ backgroundColor: C.primarySoft, padding: '16px', borderRadius: '50%', color: C.primary }}>
                  <MessageCircle size={36} />
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: C.heading }}>Your Messages</div>
                <div style={{ fontSize: '13px', textAlign: 'center', maxWidth: '300px', lineHeight: 1.5 }}>Select a chat from the sidebar or start a new conversation to begin.</div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {isMobile && (
                      <button 
                        onClick={() => setViewChat(false)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: C.primary,
                          cursor: 'pointer',
                          padding: '8px',
                          marginRight: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '50%',
                          backgroundColor: C.bg
                        }}
                      >
                        <ArrowLeft size={18} />
                      </button>
                    )}
                    <Avatar src={activeConv.avatar} name={activeConv.recipient} online={activeConv.online} />
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: C.heading, margin: 0 }}>{activeConv.recipient}</h3>
                      <span style={{ fontSize: '11px', color: C.muted, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block' }} />
                        Active Now ({activeConv.role})
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      style={{ backgroundColor: 'transparent', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      className="header-icon-btn"
                    >
                      <Phone size={18} />
                    </button>
                    <button 
                      style={{ backgroundColor: 'transparent', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      className="header-icon-btn"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                </div>

                {/* Messages Panel */}
                <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc' }}>
                  {messages.length === 0 && (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.faint, gap: '8px' }}>
                      <MessageCircle size={36} style={{ color: C.faint }} />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>No messages yet</span>
                      <span style={{ fontSize: '12px' }}>Start the conversation by typing below.</span>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.isMe ? 'flex-end' : 'flex-start' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', maxWidth: '70%', flexDirection: msg.isMe ? 'row-reverse' : 'row' }}>
                        {!msg.isMe && <Avatar name={activeConv.recipient} size={28} />}
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: msg.isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          background: msg.isMe ? G.brand : '#ffffff',
                          color: msg.isMe ? '#ffffff' : C.text,
                          fontSize: '14px',
                          lineHeight: 1.5,
                          boxShadow: msg.isMe ? S.glow : '0 2px 6px rgba(0,0,0,0.03)',
                          border: msg.isMe ? 'none' : `1px solid ${C.borderLight}`,
                          wordBreak: 'break-word'
                        }}>
                          {asText(msg.text)}
                        </div>
                      </div>
                      <span style={{ fontSize: '10px', color: C.muted, marginTop: '4px', marginLeft: msg.isMe ? 0 : '36px', marginRight: msg.isMe ? '12px' : 0 }}>
                        {msg.time}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Form Input Footer */}
                <form onSubmit={handleSendMessage} style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderTop: `1px solid ${C.borderLight}`, display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`Type a message to ${activeConv.recipient}...`}
                    value={newMessageText}
                    onChange={(e) => setNewMessageText(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: '#f1f5f9',
                      border: '1px solid transparent',
                      borderRadius: '24px',
                      padding: '12px 20px',
                      fontSize: '14px',
                      color: C.text,
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    className="msg-input"
                  />
                  <button 
                    type="submit" 
                    style={{ 
                      backgroundColor: C.primary,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '44px',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: S.glow,
                      transition: 'transform 0.15s ease'
                    }}
                    className="msg-send-btn"
                  >
                    <Send size={18} style={{ marginLeft: '2px' }} />
                  </button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ================= CONTENT STYLES ONLY ================= */
const styles = {
  toast: { position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#262626', color: '#fff', padding: '14px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', zIndex: 9999 }
};