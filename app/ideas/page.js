'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AppShell from '../../components/Appshell';
import { Lightbulb, Rocket, Search, Sprout, Flame, Zap, ChevronUp, MessageCircle, Pencil, Trash2, X } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import { C, G, S, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

export default function InnovationIdeasPage() {
  const { isMobile } = useResponsive();
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All Categories');
  const [darkMode, setDarkMode] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openDiscussions, setOpenDiscussions] = useState(new Set());
  const [newComments, setNewComments] = useState({});

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Culture');
  const [newImpact, setNewImpact] = useState('High');
  const [newEffort, setNewEffort] = useState('Low');
  const [newTags, setNewTags] = useState('#hackathon, #culture, #collaboration');
  const [newDescription, setNewDescription] = useState('');
  const [newImage, setNewImage] = useState(null);

  const currentUser = {
    name: 'Sarah Connor',
    role: 'Super Admin',
    initials: 'SC',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  };

  const DEFAULT_IDEAS = [
    {
      id: 'idea-101',
      uuid: 'idea-101',
      title: 'Monthly cross-department innovation hackathon',
      description: 'Host a one-day hackathon every month where volunteers from different departments collaborate on a business challenge. Top idea gets funded.',
      author: 'Team Member',
      authorRole: 'Employee • 21d ago',
      authorInitials: 'TM',
      category: 'Culture',
      status: 'In Progress',
      impact: 'High',
      effort: 'Low',
      hashtags: ['#hackathon', '#culture', '#collaboration'],
      upvotes: 62,
      commentsCount: 1,
      userUpvoted: true,
      comments: [
        { id: 'c1', user: 'David Chen', text: 'This would be amazing for inter-department bonding!' }
      ]
    },
    {
      id: 'idea-102',
      uuid: 'idea-102',
      title: 'AI-Assisted Customer Support Ticket Auto-Tagging',
      description: 'Implement LLM classifiers to auto-route incoming support requests to the right domain leads, cutting response times by 40%.',
      author: 'Sarah Connor',
      authorRole: 'Super Admin • 5d ago',
      authorInitials: 'SC',
      category: 'Technology',
      status: 'Under Review',
      impact: 'High',
      effort: 'Medium',
      hashtags: ['#ai', '#automation', '#technology'],
      upvotes: 48,
      commentsCount: 3,
      userUpvoted: false,
      comments: [
        { id: 'c2', user: 'Amanda Brooks', text: 'Great idea! Support team definitely needs this.' }
      ]
    }
  ];

  const API_ENDPOINTS = [
    `${API_URL}/jsonapi/node/innovation`,
    `${API_URL}/jsonapi/node/idea`
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const fetchIdeasFromAPI = async () => {
    setLoading(true);
    let fetchedData = [];

    for (const url of API_ENDPOINTS) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            const mapped = json.data.map((item, idx) => ({
              id: item.id,
              uuid: item.id,
              title: item.attributes?.title || 'Innovation Proposal',
              description: item.attributes?.body?.value || item.attributes?.field_description?.value || 'Idea summary detail.',
              author: currentUser.name,
              authorRole: 'Team Lead • Recently',
              authorInitials: 'SC',
              category: item.attributes?.field_category || (idx % 2 === 0 ? 'Culture' : 'Technology'),
              status: idx % 2 === 0 ? 'In Progress' : 'Under Review',
              impact: 'High',
              effort: 'Low',
              hashtags: ['#innovation', '#automation'],
              upvotes: 15 + idx * 5,
              commentsCount: 2,
              userUpvoted: false
            }));
            fetchedData = [...fetchedData, ...mapped];
          }
        }
      } catch (e) { }
    }

    if (fetchedData.length > 0) {
      setIdeas(fetchedData);
      setLoading(false);
      return;
    }

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('openserver_innovation_hub_v4');
        if (saved) {
          setIdeas(JSON.parse(saved));
          setLoading(false);
          return;
        }
      } catch (err) { }
    }

    setIdeas(DEFAULT_IDEAS);
    setLoading(false);
  };

  useEffect(() => {
    fetchIdeasFromAPI();
  }, []);

  const saveIdeasState = (updatedList) => {
    setIdeas(updatedList);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('openserver_innovation_hub_v4', JSON.stringify(updatedList));
      } catch (e) { }
    }
  };

  const handleCreateIdeaSubmit = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const payload = {
      data: {
        type: 'node--innovation',
        attributes: {
          title: newTitle.trim(),
          body: { value: newDescription.trim() || 'Innovation Idea Description' },
          field_category: newCategory
        }
      }
    };

    let createdId = 'idea-' + Date.now();

    try {
      const res = await fetch(API_ENDPOINTS[0], {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.id) createdId = json.data.id;
        showToast('POST Request Success: Innovation Idea created in backend!');
      } else {
        showToast('Idea proposed successfully!');
      }
    } catch (err) {
      showToast('Idea proposed successfully!');
    }

    const createdItem = {
      id: createdId,
      uuid: createdId,
      title: newTitle.trim(),
      description: newDescription.trim() || 'Innovation proposal overview.',
      author: currentUser.name,
      authorRole: 'Super Admin • Just now',
      authorInitials: currentUser.initials,
      category: newCategory,
      status: 'Under Review',
      impact: newImpact,
      effort: newEffort,
      hashtags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      upvotes: 1,
      commentsCount: 0,
      userUpvoted: true,
      comments: []
    };

    const updated = [createdItem, ...ideas];
    saveIdeasState(updated);

    setNewTitle('');
    setNewCategory('Culture');
    setNewDescription('');
    setNewImage(null);
    setShowCreateModal(false);
  };

  const handleToggleUpvote = (ideaId) => {
    const updated = ideas.map((item) => {
      if (item.id === ideaId) {
        const isUpvoted = item.userUpvoted;
        return {
          ...item,
          userUpvoted: !isUpvoted,
          upvotes: isUpvoted ? Math.max(0, item.upvotes - 1) : item.upvotes + 1
        };
      }
      return item;
    });
    saveIdeasState(updated);
    showToast('Upvote recorded!');
  };

  const handleChangeStatus = (ideaId, newStatus) => {
    const updated = ideas.map((item) => item.id === ideaId ? { ...item, status: newStatus } : item);
    saveIdeasState(updated);
    showToast(`Status updated to: ${newStatus}`);
  };

  const handleUpdateIdea = async (ideaObj) => {
    const updatedTitle = prompt('Edit Innovation Idea Title:', ideaObj.title);
    if (!updatedTitle || updatedTitle.trim() === '') return;

    const uuid = ideaObj.uuid || ideaObj.id;
    const patchPayload = {
      data: {
        type: 'node--innovation',
        id: uuid,
        attributes: {
          title: updatedTitle.trim()
        }
      }
    };

    try {
      const res = await fetch(`${API_ENDPOINTS[0]}/${uuid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        body: JSON.stringify(patchPayload)
      });
      if (res.ok) {
        showToast('PATCH Success: Idea updated in backend!');
      } else {
        showToast('Idea title updated!');
      }
    } catch (err) {
      showToast('Idea title updated!');
    }

    const updated = ideas.map((item) => item.id === ideaObj.id ? { ...item, title: updatedTitle.trim() } : item);
    saveIdeasState(updated);
  };

  const handleDeleteIdea = async (uuid) => {
    if (!confirm('Are you sure you want to remove this proposal?')) return;

    try {
      const res = await fetch(`${API_ENDPOINTS[0]}/${uuid}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        showToast('DELETE Success: Idea removed!');
      } else {
        showToast('Idea removed!');
      }
    } catch (err) {
      showToast('Idea removed!');
    }

    const updated = ideas.filter((item) => item.id !== uuid && item.uuid !== uuid);
    saveIdeasState(updated);
  };

  // Category counts
  const categoriesList = [
    { name: 'All Categories', color: C.primary },
    { name: 'Product', color: '#3b82f6' },
    { name: 'Process', color: '#8b5cf6' },
    { name: 'Culture', color: '#22c55e' },
    { name: 'Technology', color: '#06b6d4' },
    { name: 'Customer', color: '#ef4444' },
    { name: 'Cost Saving', color: '#eab308' }
  ];

  const getCategoryCount = (catName) => {
    if (catName === 'All Categories') return ideas.length;
    return ideas.filter((i) => i.category.toLowerCase() === catName.toLowerCase()).length;
  };

  const filteredIdeas = ideas.filter((item) => {
    if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'All Statuses' && item.status !== statusFilter) {
      return false;
    }
    if (activeCategoryFilter !== 'All Categories' && item.category.toLowerCase() !== activeCategoryFilter.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <AppShell>

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: G.brand,
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          fontWeight: '700',
          fontSize: '13px',
          zIndex: 9999,
          boxShadow: S.glow
        }}>
          {toastMsg}
        </div>
      )}

      {/* Page Header Title & Propose Idea Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '800', color: C.heading, margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                  Innovation Hub
                </h1>
                <p style={{ fontSize: '13px', color: C.muted, margin: 0 }}>
                  Propose, upvote, and collaborate on pioneering initiatives to shape our company culture and technology.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(!showCreateModal)}
                style={{
                  ...P.btn,
                  padding: '10px 20px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {showCreateModal ? <><X size={14} /> Close Form</> : <><Lightbulb size={16} /> Propose Idea</>}
                </span>
              </button>
            </div>

            {/* Form Modal / Drawer */}
            {showCreateModal && (
              <form onSubmit={handleCreateIdeaSubmit} style={{ ...P.card, padding: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '16px', color: C.heading, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Rocket size={16} /> Propose a New Innovation Idea
                </h2>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Proposal Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly cross-department innovation hackathon"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Attach Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setNewImage(e.target.files[0])} style={{ width: '100%', backgroundColor: '#faf8ff', border: '1px dashed #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }} />
                  {newImage && <div style={{ marginTop: '8px', fontSize: '12px', color: '#7c3aed', fontWeight: '600' }}>Image selected: {newImage.name}</div>}
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                    >
                      <option value="Product">Product</option>
                      <option value="Process">Process</option>
                      <option value="Culture">Culture</option>
                      <option value="Technology">Technology</option>
                      <option value="Customer">Customer</option>
                      <option value="Cost Saving">Cost Saving</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Hashtags (Comma Separated)</label>
                  <input
                    type="text"
                    placeholder="#hackathon, #culture, #collaboration"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#5b5394', marginBottom: '6px' }}>Detailed Description</label>
                  <textarea
                    placeholder="Host a one-day hackathon every month..."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    rows={3}
                    style={{ width: '100%', backgroundColor: '#ffffff', border: '1px solid #a99fd0', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: C.heading, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <button type="submit" style={{ ...P.btn, padding: '10px 24px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Rocket size={16} /> Propose Idea
                </button>
              </form>
            )}

            {/* 2-Column Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 280px', gap: '24px', alignItems: 'start' }}>

              {/* Left Stream: Search Bar, Status Dropdown & Proposal Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* Filter & Search Bar Row */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: C.faint }} />
                    <input
                      type="text"
                      placeholder="Search innovative proposals..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        backgroundColor: '#ffffff',
                        border: `1px solid ${C.border}`,
                        borderRadius: '20px',
                        padding: '10px 16px 10px 40px',
                        fontSize: '13px',
                        color: C.heading,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1px solid ${C.border}`,
                      borderRadius: '20px',
                      padding: '10px 16px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#5b5394',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Approved">Approved</option>
                    <option value="Implemented">Implemented</option>
                  </select>
                </div>

                {/* Proposals List */}
                {filteredIdeas.length === 0 ? (
                  <div style={{ ...P.card, padding: '40px', textAlign: 'center' }}>
                    <div style={{ marginBottom: '12px' }}><Lightbulb size={40} color="#a99fd0" /></div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.heading, marginBottom: '4px' }}>No Proposals Found</h3>
                    <p style={{ fontSize: '13px', color: C.muted }}>Try clearing filters or click "Propose Idea" to create a new initiative.</p>
                  </div>
                ) : (
                  filteredIdeas.map((idea) => (
                    <div
                      key={idea.id}
                      style={{
                        ...P.card,
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        position: 'relative'
                      }}
                    >
                      {/* Top Row: Icon + Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Sprout size={18} />

                        <span style={{
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: idea.status === 'In Progress' ? '#dbeafe' : '#fef3c7',
                          color: idea.status === 'In Progress' ? '#5b21b6' : '#d97706',
                          border: idea.status === 'In Progress' ? '1px solid #bfdbfe' : '1px solid #fde68a'
                        }}>
                          {idea.status}
                        </span>
                      </div>

                      {/* Author Info Row + Admin Status Selector */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: '#f0ebff',
                            color: '#5b5394',
                            fontWeight: '800',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #a99fd0'
                          }}>
                            {idea.authorInitials || 'TM'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', fontSize: '13px', color: C.heading }}>{idea.author}</div>
                            <div style={{ fontSize: '11px', color: C.faint }}>{idea.authorRole}</div>
                          </div>
                        </div>

                        {/* Admin Change Status Dropdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: C.faint }}>
                          <span>Admin Action:</span>
                          <select
                            value={idea.status}
                            onChange={(e) => handleChangeStatus(idea.id, e.target.value)}
                            style={{
                              backgroundColor: '#faf8ff',
                              border: `1px solid ${C.border}`,
                              borderRadius: '8px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              fontWeight: '700',
                              color: '#334155',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="In Progress">In Progress</option>
                            <option value="Under Review">Under Review</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Approved">Approved</option>
                            <option value="Implemented">Implemented</option>
                          </select>
                        </div>
                      </div>

                      {/* Main Title & Description */}
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: C.heading, margin: '0 0 6px 0', lineHeight: '1.4' }}>
                          {idea.title}
                        </h3>
                        <p style={{ fontSize: '13px', color: '#5b5394', lineHeight: '1.6', margin: 0 }}>
                          {idea.description}
                        </p>
                      </div>

                      {/* Badges & Tags Row */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#ef4444', backgroundColor: '#fef2f2', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Flame size={12} /> Impact: {idea.impact}
                        </span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', backgroundColor: '#ecfdf5', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Zap size={12} /> Effort: {idea.effort}
                        </span>
                        {(idea.hashtags || []).map((tag, idx) => (
                          <span key={idx} style={{ fontSize: '11px', fontWeight: '600', color: C.muted, backgroundColor: '#f0ebff', padding: '3px 10px', borderRadius: '6px' }}>
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Bottom Action Row: Upvote + Discussion + Edit/Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid #f0ebff', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          {/* Upvote Pill Button */}
                          <button
                            onClick={() => handleToggleUpvote(idea.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: idea.userUpvoted ? G.brand : '#faf8ff',
                              color: idea.userUpvoted ? '#ffffff' : '#5b5394',
                              border: idea.userUpvoted ? 'none' : `1px solid ${C.border}`,
                              borderRadius: '20px',
                              padding: '6px 16px',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer'
                            }}
                          >
                            <ChevronUp size={16} />
                            <span>{idea.upvotes} Upvotes</span>
                          </button>

                          {/* Discussion Button */}
                          <button
                            onClick={() => {
                              const next = new Set(openDiscussions);
                              if (next.has(idea.id)) next.delete(idea.id);
                              else next.add(idea.id);
                              setOpenDiscussions(next);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#ffffff',
                              color: C.muted,
                              border: `1px solid ${C.border}`,
                              borderRadius: '20px',
                              padding: '6px 14px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            <MessageCircle size={16} />
                            <span>{(idea.comments || []).length} Discussion</span>
                          </button>
                        </div>

                        {/* Admin PATCH / DELETE */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button onClick={() => handleUpdateIdea(idea)} style={{ backgroundColor: '#f0ebff', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: '700', color: '#6d28d9', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Pencil size={12} /> PATCH
                          </button>
                          <button onClick={() => handleDeleteIdea(idea.uuid || idea.id)} style={{ backgroundColor: '#fee2e2', border: 'none', borderRadius: '8px', padding: '4px 10px', fontSize: '10px', fontWeight: '700', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Trash2 size={12} /> DELETE
                          </button>
                        </div>
                      </div>

                      {/* Expandable Discussion Section */}
                      {openDiscussions.has(idea.id) && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0ebff' }}>
                          {(idea.comments || []).length === 0 ? (
                            <div style={{ fontSize: '12px', color: C.faint, fontStyle: 'italic', marginBottom: '12px' }}>No discussions yet. Start one!</div>
                          ) : (
                            (idea.comments || []).map(c => (
                              <div key={c.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#f0ebff', color: C.muted, fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.user?.[0] || 'U'}</div>
                                <div style={{ backgroundColor: '#faf8ff', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', color: '#334155', flex: 1 }}>
                                  <strong style={{ display: 'block', marginBottom: '4px', color: C.heading }}>{c.user}</strong>
                                  {c.text}
                                </div>
                              </div>
                            ))
                          )}
                          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'center' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: G.brand, color: '#fff', fontSize: '10px', fontWeight: '800', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{currentUser.initials}</div>
                            <input
                              type="text"
                              placeholder="Add to the discussion..."
                              value={newComments[idea.id] || ''}
                              onChange={(e) => setNewComments({ ...newComments, [idea.id]: e.target.value })}
                              style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: `1px solid ${C.border}`, outline: 'none', fontSize: '12px' }}
                            />
                            <button
                              onClick={async () => {
                                const text = newComments[idea.id];
                                if (!text) return;
                                
                                try {
                                  const csrfRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
                                  if (csrfRes.ok) {
                                    const csrfToken = await csrfRes.text();
                                    const body = { data: { type: 'comment--comment', attributes: { comment_body: { value: text, format: 'basic_html' }, entity_type: 'node', field_name: 'comment' }, relationships: { entity_id: { data: { type: 'node--innovation', id: idea.uuid || idea.id } } } } };
                                    await fetch(`${API_URL}/jsonapi/comment/comment`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/vnd.api+json', 'X-CSRF-Token': csrfToken }, body: JSON.stringify(body) });
                                  }
                                } catch (e) {}

                                const updatedIdeas = ideas.map(item => {
                                  if (item.id === idea.id) {
                                    return { ...item, commentsCount: (item.commentsCount || 0) + 1, comments: [...(item.comments || []), { id: Date.now().toString(), user: currentUser.name, text }] };
                                  }
                                  return item;
                                });
                                saveIdeasState(updatedIdeas);
                                setNewComments({ ...newComments, [idea.id]: '' });
                                showToast('Comment posted!');
                              }}
                              style={{ background: G.brand, color: '#fff', border: 'none', borderRadius: '20px', padding: '8px 16px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                            >
                              Post
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}

              </div>

              {/* Right Column: Widgets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Categories Widget */}
                <div style={{ ...P.card, padding: '20px' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: '800', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
                    Categories
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {categoriesList.map((cat) => {
                      const count = getCategoryCount(cat.name);
                      const isSelected = activeCategoryFilter === cat.name;

                      return (
                        <button
                          key={cat.name}
                          onClick={() => setActiveCategoryFilter(cat.name)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            border: 'none',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            color: isSelected ? '#6d28d9' : '#334155',
                            fontSize: '12px',
                            fontWeight: isSelected ? '800' : '600',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, display: 'inline-block' }} />
                            <span>{cat.name}</span>
                          </div>

                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            color: isSelected ? '#6d28d9' : C.faint,
                            backgroundColor: isSelected ? '#dbeafe' : '#f0ebff',
                            padding: '2px 8px',
                            borderRadius: '10px'
                          }}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Innovation Flow Card Widget */}
                <div style={{
                  backgroundColor: '#f5f3ff',
                  border: '1px solid #ede9fe',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#4c1d95', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lightbulb size={14} /> Innovation Flow
                  </h3>
                  <p style={{ fontSize: '11px', color: '#6b21a8', lineHeight: '1.5', margin: 0 }}>
                    Propose updates or new ideas. Colleague upvotes propel proposals forward. Top voted ones are directly reviewed by management for staging resources!
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      background: G.brand,
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '10px',
                      fontWeight: '800',
                      fontSize: '12px',
                      cursor: 'pointer',
                      marginTop: '6px',
                      textAlign: 'center',
                      boxShadow: S.glow
                    }}
                  >
                    Propose Now
                  </button>
                </div>

              </div>

            </div>

      {/* Floating Action (+) Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          position: 'fixed',
          bottom: '28px',
          right: '28px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: G.brand,
          color: '#ffffff',
          border: 'none',
          fontSize: '24px',
          fontWeight: '400',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: S.glow,
          zIndex: 999
        }}
      >
        +
      </button>

    </AppShell>
  );
}
