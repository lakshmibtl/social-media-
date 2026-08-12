'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../components/Appshell';
import { Lightbulb, Rocket, Search, Sprout, Flame, Zap, X } from 'lucide-react';
import { C, G, S, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const BASE_URL = API_URL;
const TOKEN_URL = `${BASE_URL}/session/token`;

const Icons = {
  UpArrow: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4l-8 10h16z"/></svg>,
  MessageCircle: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>,
  Pen: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  Trash: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>,
  Send: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
};

const STATUS_COLORS = {
  'In Progress': { bg: '#e0e7ff', color: '#4338ca', border: '#c7d2fe' },
  'Under Review': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
  'Rejected': { bg: '#fee2e2', color: '#b91c1c', border: '#fecaca' },
  'New': { bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' }
};

export default function InnovationIdeasPage() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  
  // State for simulated data since Drupal 'topic' doesn't have these custom fields
  const [ideaStatuses, setIdeaStatuses] = useState({});
  const [likedIdeas, setLikedIdeas] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});
  
  // Discussion state
  const [openDiscussions, setOpenDiscussions] = useState(new Set());
  const [commentsMap, setCommentsMap] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState(null);

  const handleCreateIdeaSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    
    let imageUrl = null;
    if (newImage) {
      // Convert to base64 for persistent local storage in the prototype
      imageUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(newImage);
      });
    }
    
    const newItem = {
      id: 'mock-' + Date.now(),
      attributes: { title: newTitle, body: { value: newDescription } },
      imageUrl: imageUrl
    };
    
    setIdeaStatuses(prev => ({ ...prev, [newItem.id]: 'New' }));
    setLikeCounts(prev => ({ ...prev, [newItem.id]: 0 }));
    
    const newIdeasArray = [newItem, ...ideas];
    setIdeas(newIdeasArray);
    
    try {
      const existingStr = localStorage.getItem('openserver_innovation_cache_v2');
      const existing = existingStr ? JSON.parse(existingStr) : [];
      localStorage.setItem('openserver_innovation_cache_v2', JSON.stringify([newItem, ...existing]));
    } catch (e) {}

    showToast('Idea proposed successfully!');
    setNewTitle('');
    setNewDescription('');
    setNewImage(null);
    setShowCreateModal(false);

    try {
      const csrfToken = await getCsrfToken();
      const body = { data: { type: 'node--topic', attributes: { title: newTitle.trim(), body: { value: newDescription.trim(), format: 'basic_html' } } } };
      await fetch(`${BASE_URL}/jsonapi/node/topic`, {
        method: 'POST', headers: { 'Content-Type': 'application/vnd.api+json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(body), credentials: 'include'
      });
    } catch (err) {}
  };

  useEffect(() => {
    fetchIdeas();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  async function getCsrfToken() {
    const res = await fetch(TOKEN_URL, { credentials: 'include' });
    if (!res.ok) throw new Error('Could not fetch CSRF token');
    return res.text();
  }

  async function fetchIdeas() {
    setLoading(true);
    // Hardcoded mockup data to replace random database content
    const mockData = [
      {
        id: 'mock-1',
        attributes: {
          title: 'Monthly cross-department innovation hackathon',
          body: { value: 'Host a one-day hackathon every month where volunteers from different departments collaborate on a business challenge. Top idea gets funded.' }
        }
      },
      {
        id: 'mock-2',
        attributes: {
          title: 'AI-Assisted Customer Support Ticket Auto-Tagging',
          body: { value: 'Implement LLM classifiers to auto-route incoming support requests to the right domain leads, cutting response times by 40%.' }
        }
      }
    ];

    setTimeout(() => {
      let combinedData = [...mockData];
      try {
        const saved = localStorage.getItem('openserver_innovation_cache_v2');
        if (saved) {
          combinedData = [...JSON.parse(saved), ...mockData];
        }
      } catch (err) {}

      setIdeas(combinedData);
      
      const initialLikes = { 'mock-1': 62, 'mock-2': 49 };
      const initialStatuses = { 'mock-1': 'In Progress', 'mock-2': 'Under Review' };
      
      try {
        const savedComments = localStorage.getItem('openserver_innovation_comments_v2');
        if (savedComments) {
          setCommentsMap(JSON.parse(savedComments));
        }
      } catch (err) {}

      setLikeCounts(initialLikes);
      setIdeaStatuses(initialStatuses);
      setLoading(false);
    }, 400);
  }

  // Handle Admin Status Update
  function handleStatusChange(ideaId, newStatus) {
    // In a real app, this would be a PATCH to the Drupal node API to update the custom status field.
    // For this prototype, we simulate it via local state to match the requested design.
    setIdeaStatuses(prev => ({ ...prev, [ideaId]: newStatus }));
    showToast(`Status updated to ${newStatus}`);
  }

  // Handle Upvotes
  async function handleLike(ideaId) {
    const isCurrentlyLiked = likedIdeas.has(ideaId);
    
    if (isCurrentlyLiked) {
      setLikedIdeas(prev => { const next = new Set(prev); next.delete(ideaId); return next; });
      setLikeCounts(prev => ({ ...prev, [ideaId]: Math.max(0, (prev[ideaId] || 1) - 1) }));
    } else {
      setLikedIdeas(prev => new Set(prev).add(ideaId));
      setLikeCounts(prev => ({ ...prev, [ideaId]: (prev[ideaId] || 0) + 1 }));
    }

    try {
      const csrfToken = await getCsrfToken();
      if (isCurrentlyLiked) {
        // DELETE request to remove the like
        await fetch(`${BASE_URL}/likes_proxy.php/${ideaId}`, {
          method: 'DELETE', credentials: 'include',
          headers: { 'X-CSRF-Token': csrfToken }
        });
      } else {
        const body = { data: { type: 'vote--like', relationships: { entity_id: { data: { type: 'node--topic', id: ideaId } } } } };
        await fetch(`${BASE_URL}/likes_proxy.php`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/vnd.api+json', 'X-CSRF-Token': csrfToken },
          body: JSON.stringify(body)
        });
      }
    } catch (err) {}
  }

  // Fetch comments when opening a discussion
  async function toggleDiscussion(ideaId) {
    const newOpen = new Set(openDiscussions);
    if (newOpen.has(ideaId)) {
      newOpen.delete(ideaId);
    } else {
      newOpen.add(ideaId);
      // Fetch comments from Drupal
      fetchCommentsForIdea(ideaId);
    }
    setOpenDiscussions(newOpen);
  }

  async function fetchCommentsForIdea(ideaId) {
    try {
      const res = await fetch(`${BASE_URL}/jsonapi/comment/comment?filter[entity_id.id]=${ideaId}&sort=created`, { headers: { Accept: 'application/vnd.api+json' }, credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        setCommentsMap(prev => {
          const localCache = prev[ideaId] ? prev[ideaId].filter(c => c.id.toString().startsWith('mock')) : [];
          const updated = { ...prev, [ideaId]: [...(json.data || []), ...localCache] };
          try { localStorage.setItem('openserver_innovation_comments_v2', JSON.stringify(updated)); } catch (e) {}
          return updated;
        });
      }
    } catch (e) {}
  }

  // Post a new comment
  async function submitComment(e, ideaId) {
    e.preventDefault();
    const text = commentTexts[ideaId];
    if (!text || !text.trim()) return;

    // Optimistic UI update for comments (especially since we are using mock idea IDs now)
    const newComment = {
      id: 'mock-c-' + Date.now(),
      attributes: { comment_body: { value: text } }
    };
    
    setCommentsMap(prev => {
      const updated = {
        ...prev,
        [ideaId]: [...(prev[ideaId] || []), newComment]
      };
      try { localStorage.setItem('openserver_innovation_comments_v2', JSON.stringify(updated)); } catch (e) {}
      return updated;
    });
    
    setCommentTexts(prev => ({ ...prev, [ideaId]: '' }));
    showToast('Discussion posted!');

    try {
      const csrfToken = await getCsrfToken();
      const body = {
        data: {
          type: 'comment--comment',
          attributes: { comment_body: { value: text, format: 'basic_html' }, entity_type: 'node', field_name: 'comment' },
          relationships: { entity_id: { data: { type: 'node--topic', id: ideaId } } }
        }
      };
      
      await fetch(`${BASE_URL}/jsonapi/comment/comment`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(body)
      });
    } catch (err) {}
  }

  // Styles matching the screenshot exactly
  const S = {
    header: { marginBottom: '24px' },
    title: { fontSize: '28px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' },
    subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },
    toolbar: { display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' },
    searchInput: { flex: 1, padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff' },
    statusSelect: { padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', background: '#fff', cursor: 'pointer', color: '#475569' },
    list: { display: 'flex', flexDirection: 'column', gap: '20px' },
    card: { background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
    cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' },
    badge: (status) => ({
      background: STATUS_COLORS[status]?.bg || '#f1f5f9',
      color: STATUS_COLORS[status]?.color || '#475569',
      border: `1px solid ${STATUS_COLORS[status]?.border || '#e2e8f0'}`,
      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
    }),
    authorRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' },
    authorLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
    avatar: { width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#475569', fontSize: '14px' },
    authorName: { margin: 0, fontSize: '15px', fontWeight: '700', color: '#0f172a' },
    authorMeta: { margin: 0, fontSize: '12px', color: '#94a3b8' },
    adminActionWrap: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8' },
    adminSelect: { padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
    ideaTitle: { margin: '0 0 10px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' },
    ideaDesc: { margin: '0 0 20px 0', fontSize: '14px', color: '#475569', lineHeight: 1.6 },
    tagsRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' },
    tagImpact: { background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' },
    tagEffort: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '4px' },
    tagHash: { background: '#f1f5f9', color: '#64748b', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },
    bottomBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px', flexWrap: 'wrap', gap: '8px' },
    btnGroup: { display: 'flex', gap: '12px' },
    upvoteBtn: (active) => ({
      background: active ? '#2563eb' : '#eff6ff',
      color: active ? '#fff' : '#2563eb',
      border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s'
    }),
    discussBtn: {
      background: '#fff', color: '#64748b', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
      display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', transition: 'all 0.2s'
    },
    patchBtn: { background: '#fef3c7', color: '#d97706', border: 'none', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
    deleteBtn: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '8px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' },
    toast: { position: 'fixed', bottom: '30px', right: '30px', background: '#1e293b', color: '#fff', padding: '14px 24px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', zIndex: 2000, fontWeight: 'bold' },
    commentsArea: { marginTop: '20px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' },
    commentItem: { display: 'flex', gap: '12px', marginBottom: '16px' },
    commentBubble: { background: '#fff', padding: '12px 16px', borderRadius: '16px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', flex: 1 },
    commentInputWrap: { display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' },
    commentInput: { flex: 1, padding: '12px 16px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px' },
    commentSubmit: { background: '#3b82f6', color: '#fff', border: 'none', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
  };

  return (
    <AppShell>
      {toastMsg && <div style={S.toast}>{toastMsg}</div>}

      <div style={S.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={S.title}>Innovation Hub</h1>
            <p style={S.subtitle}>Propose, upvote, and collaborate on pioneering initiatives to shape our company culture and technology.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(!showCreateModal)}
            style={{
              backgroundColor: C.primary, color: '#ffffff', border: 'none', borderRadius: '12px', padding: '10px 20px',
              fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showCreateModal ? <><X size={14} /> Close Form</> : <><Lightbulb size={16} /> Propose Idea</>}
            </span>
          </button>
        </div>
      </div>

      {showCreateModal && (
        <form onSubmit={handleCreateIdeaSubmit} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 16px rgba(0,0,0,0.04)', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Rocket size={16} /> Propose a New Innovation Idea
          </h2>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Proposal Title</label>
            <input type="text" placeholder="e.g. Monthly cross-department innovation hackathon" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} required />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Attach Image</label>
            <input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files[0])} style={{ width: '100%', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }} />
            {newImage && <div style={{ marginTop: '8px', fontSize: '12px', color: C.primary, fontWeight: '600' }}>Image selected: {newImage.name}</div>}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>Detailed Description</label>
            <textarea placeholder="Host a one-day hackathon every month..." value={newDescription} onChange={(e) => setNewDescription(e.target.value)} rows={3} style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: '#0f172a', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <button type="submit" style={{ backgroundColor: C.primary, color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 24px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Rocket size={16} /> Submit Proposal
          </button>
        </form>
      )}

      <div style={S.toolbar}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input style={{ ...S.searchInput, paddingLeft: '40px' }} placeholder="Search innovative proposals..." />
        </div>
        <select style={S.statusSelect}>
          <option>All Statuses</option>
          <option>In Progress</option>
          <option>Under Review</option>
          <option>Rejected</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontWeight: 'bold' }}>Loading proposals...</div>
      ) : (
        <div style={S.list}>
          {ideas.map((idea) => {
            const isLiked = likedIdeas.has(idea.id);
            const status = ideaStatuses[idea.id] || 'New';
            const comments = commentsMap[idea.id] || [];
            
            // Mock tags for the UI design
            const tags = ['#innovation', '#technology'];
            const authorInitials = idea.attributes?.title?.charAt(0)?.toUpperCase() || 'U';
            const bodySnippet = idea.attributes?.body?.value?.replace(/(<([^>]+)>)/gi, "") || 'No description provided.';
            
            return (
              <div key={idea.id} style={S.card}>
                
                {/* Top Badge */}
                <div style={S.cardTop}>
                  <Sprout size={20} color="#22c55e" />
                  <div style={S.badge(status)}>{status}</div>
                </div>

                {/* Author & Admin Action */}
                <div style={S.authorRow}>
                  <div style={S.authorLeft}>
                    <div style={S.avatar}>{authorInitials}</div>
                    <div>
                      <h4 style={S.authorName}>Team Member</h4>
                      <p style={S.authorMeta}>Employee • Just now</p>
                    </div>
                  </div>
                  
                  <div style={S.adminActionWrap}>
                    Admin Action:
                    <select 
                      style={S.adminSelect}
                      value={status}
                      onChange={(e) => handleStatusChange(idea.id, e.target.value)}
                    >
                      <option value="New">New</option>
                      <option value="Under Review">Under Review</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                </div>

                {/* Content */}
                <h3 style={S.ideaTitle}>{idea.attributes?.title}</h3>
                <p style={S.ideaDesc}>{bodySnippet}</p>

                {/* Attached Image */}
                {idea.imageUrl && (
                  <div style={{ marginTop: '12px', marginBottom: '16px' }}>
                    <img src={idea.imageUrl} alt="Attached Idea UI" style={{ maxWidth: '100%', maxHeight: '350px', borderRadius: '12px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                  </div>
                )}

                {/* Tags */}
                <div style={S.tagsRow}>
                  <span style={S.tagImpact}><Flame size={12} /> Impact: High</span>
                  <span style={S.tagEffort}><Zap size={12} /> Effort: Medium</span>
                  {tags.map(t => <span key={t} style={S.tagHash}>{t}</span>)}
                </div>

                {/* Bottom Actions */}
                <div style={S.bottomBar}>
                  <div style={S.btnGroup}>
                    <button style={S.upvoteBtn(isLiked)} onClick={() => handleLike(idea.id)}>
                      <Icons.UpArrow /> {likeCounts[idea.id] || 0} Upvotes
                    </button>
                    <button style={S.discussBtn} onClick={() => toggleDiscussion(idea.id)}>
                      <Icons.MessageCircle /> {comments.length || 0} Discussion
                    </button>
                  </div>
                  
                  <div style={S.btnGroup}>
                    <button style={S.patchBtn} onClick={() => showToast('PATCH request simulated')}><Icons.Pen /> PATCH</button>
                    <button style={S.deleteBtn} onClick={() => showToast('DELETE request simulated')}><Icons.Trash /> DELETE</button>
                  </div>
                </div>

                {/* Expandable Discussion Section */}
                {openDiscussions.has(idea.id) && (
                  <div style={S.commentsArea}>
                    
                    {comments.length === 0 ? (
                      <div style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', marginBottom: '10px' }}>No discussions yet. Start the conversation!</div>
                    ) : (
                      comments.map(c => (
                        <div key={c.id} style={S.commentItem}>
                          <div style={{...S.avatar, width: '32px', height: '32px', fontSize: '12px'}}>U</div>
                          <div style={S.commentBubble}>
                            <strong style={{display: 'block', marginBottom: '4px', color: '#0f172a'}}>User</strong>
                            {c.attributes?.comment_body?.value?.replace(/(<([^>]+)>)/gi, "")}
                          </div>
                        </div>
                      ))
                    )}
                    
                    <form onSubmit={(e) => submitComment(e, idea.id)} style={S.commentInputWrap}>
                      <div style={{...S.avatar, width: '32px', height: '32px', fontSize: '12px'}}>M</div>
                      <input 
                        style={S.commentInput} 
                        placeholder="Join the discussion..." 
                        value={commentTexts[idea.id] || ''}
                        onChange={(e) => setCommentTexts(prev => ({ ...prev, [idea.id]: e.target.value }))}
                      />
                      <button type="submit" style={S.commentSubmit}><Icons.Send /></button>
                    </form>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
