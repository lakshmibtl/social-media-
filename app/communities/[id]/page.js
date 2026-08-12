'use client';

import React, { useEffect, useState } from 'react';
import AppShell from '../../../components/Appshell';
import { useRouter } from 'next/navigation';
import { ThumbsUp, MessageCircle, Image as ImageIcon, Send, Users, Trash2, Globe, Lock, LockOpen, Eye, Settings, ArrowLeft, Check, X } from 'lucide-react';
import useResponsive from '../../../lib/useResponsive';
import { C, S, P } from '../../../lib/theme';
import { API_URL } from '../../../lib/config';

const BASE_URL = API_URL;
const TOKEN_URL = `${BASE_URL}/session/token`;

// Component to securely fetch private images with credentials
function AuthenticatedImage({ url, alt, style }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;

    fetch(url, { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Image fetch failed');
        return res.blob();
      })
      .then(blob => {
        setImgSrc(URL.createObjectURL(blob));
      })
      .catch(err => setError(true));
  }, [url]);

  if (error) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ebff', color: C.muted }}>Image Unavailable</div>;
  if (!imgSrc) return <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0ebff' }}>Loading image...</div>;
  return <img src={imgSrc} alt={alt} style={style} />;
}
const renderContentWithTags = (content) => {
  if (!content) return '';
  const parts = content.split(/(@[a-zA-Z0-9_\-\.]+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      const username = part.substring(1);
      return (
        <a
          key={idx}
          href={`/messages?chat=${encodeURIComponent(username)}`}
          style={{ color: '#6d28d9', fontWeight: '700', textDecoration: 'none', cursor: 'pointer' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

const GROUP_TYPES = {
  'public_group': { label: 'Public Group', color: '#10b981', Icon: Globe },
  'open_group': { label: 'Open Group', color: '#3b82f6', Icon: LockOpen },
  'closed_group': { label: 'Closed Group', color: '#f59e0b', Icon: Lock },
  'secret_group': { label: 'Secret Group', color: '#ef4444', Icon: Eye },
  'flexible_group': { label: 'Flexible Group', color: '#8b5cf6', Icon: Settings }
};

export default function CommunityPage({ params }) {
  const { id } = params;
  const router = useRouter();
  const { isMobile } = useResponsive();

  const [postText, setPostText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const [posts, setPosts] = useState([]);
  const [imagesMap, setImagesMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentTexts, setCommentTexts] = useState({});
  const [likedPosts, setLikedPosts] = useState(new Set());
  const [likeCounts, setLikeCounts] = useState({});
  const [groupInfo, setGroupInfo] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [commentsMap, setCommentsMap] = useState({});
  const [likedAnimationPostId, setLikedAnimationPostId] = useState(null);

  // Admin / Membership states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [activeMembers, setActiveMembers] = useState([]);

  useEffect(() => {
    fetchGroupInfo();
    fetchPosts();

    // Check if user is admin or creator
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.name) {
          const username = u.name.toLowerCase();
          const savedOwners = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('group_owners') || '{}') : {};
          if (username === 'admin' || username.includes('prasuna') || savedOwners[id] === username) {
            setIsAdmin(true);
          }
        }
      } catch (e) { }
    }
  }, [id]);

  async function fetchGroupInfo() {
    const types = ['public_group', 'open_group', 'closed_group', 'secret_group', 'flexible_group'];
    for (const type of types) {
      try {
        const res = await fetch(`${BASE_URL}/jsonapi/group/${type}/${id}`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setGroupInfo({ ...json.data, groupType: type });
            fetchMemberCount(type, id);
            return;
          }
        }
      } catch (err) { }
    }
  }

  async function fetchMemberCount(type, groupId) {
    try {
      // Use gid.id to filter memberships by the correct group ID
      const res = await fetch(`${BASE_URL}/jsonapi/group_content/${type}-group_membership?filter[gid.id]=${groupId}`, { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        // Use meta count if available, otherwise array length
        const count = json.meta?.count || (json.data ? json.data.length : 0);
        setMemberCount(count);
      }
    } catch (err) { }
  }

  async function fetchMembersData() {
    if (!groupInfo) return;
    try {
      // Mocking fetch members for prototype since real jsonapi for members requires entity mapping
      // Real app would fetch the group_content memberships and map the entity_id to user names
      // For now, we will just show Lakshmi as pending if we are in python group
      const pMembers = [];
      const aMembers = [{ id: '1', name: 'Prasuna (You)', role: 'Admin' }];

      if (groupInfo.attributes?.label?.toLowerCase() === 'python') {
        pMembers.push({ id: 'lakshmi', name: 'lakshmi', status: 'Pending' });
      }
      setPendingMembers(pMembers);
      setActiveMembers(aMembers);
    } catch (err) { }
  }

  async function handleApproveMember(memberId) {
    // Optimistic update
    setPendingMembers(prev => prev.filter(m => m.id !== memberId));
    setActiveMembers(prev => [...prev, { id: memberId, name: 'lakshmi', role: 'Member' }]);
    setMemberCount(prev => prev + 1);

    // Track approval in localStorage for prototype flow
    if (typeof window !== 'undefined') {
      const approvals = JSON.parse(localStorage.getItem('group_approvals') || '{}');
      if (!approvals[id]) approvals[id] = [];
      approvals[id].push(memberId);
      localStorage.setItem('group_approvals', JSON.stringify(approvals));
    }

    showToast('Member approved successfully!');
  }

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };

  async function getCsrfToken() {
    const res = await fetch(TOKEN_URL, { credentials: 'include' });
    if (!res.ok) throw new Error('Could not fetch CSRF token');
    return res.text();
  }

  async function fetchPosts() {
    setLoading(true);
    try {
      // Fetch both text posts and photo posts, filtering them to this specific group
      const [postRes, photoRes, likesRes] = await Promise.all([
        fetch(`${BASE_URL}/jsonapi/post/post?filter[field_recipient_group.id]=${id}&include=field_post_image,user_id`, { headers: { Accept: 'application/vnd.api+json' }, credentials: 'include' }),
        fetch(`${BASE_URL}/jsonapi/post/photo?filter[field_recipient_group.id]=${id}&include=field_post_image,user_id`, { headers: { Accept: 'application/vnd.api+json' }, credentials: 'include' }),
        fetch(`${BASE_URL}/likes_proxy.php`, { credentials: 'include', cache: 'no-store' })
      ]);

      let allPosts = [];
      let includedFiles = [];

      if (postRes.ok) {
        const json = await postRes.json();
        allPosts = [...allPosts, ...(json.data || [])];
        if (json.included) includedFiles = [...includedFiles, ...json.included];
      }
      if (photoRes.ok) {
        const json = await photoRes.json();
        allPosts = [...allPosts, ...(json.data || [])];
        if (json.included) includedFiles = [...includedFiles, ...json.included];
      }

      // Sort newest first
      allPosts.sort((a, b) => new Date(b.attributes.created) - new Date(a.attributes.created));
      setPosts(allPosts);

      // Map file IDs to URLs and user IDs to names
      const fileMap = {};
      const localUsers = {};
      includedFiles.forEach(f => {
        if (f.type === 'file--file' && f.attributes?.uri?.url) {
          let url = f.attributes.uri.url;
          // Fix for php -S local server: force files to route through index.php
          if (url.startsWith('/system/files/') || url.startsWith('/sites/default/files/styles/')) {
            url = '/index.php' + url;
          }
          fileMap[f.id] = url.startsWith('http') ? url : BASE_URL + url;
        }
        if (f.type === 'user--user') {
          localUsers[f.id] = f.attributes?.display_name || f.attributes?.name || 'Community Member';
        }
      });
      setImagesMap(fileMap);

      const postsWithAuthor = allPosts.map(p => {
        const uid = p.relationships?.user_id?.data?.id;
        const authorName = uid ? localUsers[uid] : 'Community Member';
        return {
          ...p,
          authorName: authorName
        };
      });
      setPosts(postsWithAuthor);

      // Parse likes count map and user likes state
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
      let currentLoggedUser = 'admin';
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u && u.name) currentLoggedUser = u.name;
        } catch (e) { }
      }

      let likesCountMap = {};
      const userLikedSet = new Set();
      if (likesRes.ok) {
        const likesJson = await likesRes.json();
        if (likesJson.data) {
          likesJson.data.forEach(like => {
            const postId = like.relationships?.entity_id?.data?.id;
            if (postId) {
              likesCountMap[postId] = (likesCountMap[postId] || 0) + 1;
              const likeUser = like.attributes?.username || 'anonymous';
              if (likeUser.toLowerCase() === currentLoggedUser.toLowerCase()) {
                userLikedSet.add(postId);
              }
            }
          });
        }
      }

      // Initialize like counts and fetch comments for each post
      const initialLikes = {};
      allPosts.forEach(p => {
        initialLikes[p.id] = likesCountMap[p.id] || 0;
        fetchCommentsForPost(p.id);
      });
      setLikeCounts(initialLikes);
      setLikedPosts(userLikedSet);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCommentsForPost(postId) {
    try {
      const res = await fetch(`${BASE_URL}/jsonapi/comment/post_comment?filter[entity_id.id]=${postId}&include=uid&sort=created`, { headers: { Accept: 'application/vnd.api+json' }, credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        const localUsers = {};
        if (json.included) {
          json.included.forEach(inc => {
            if (inc.type === 'user--user') {
              localUsers[inc.id] = inc.attributes?.display_name || inc.attributes?.name || 'Community Member';
            }
          });
        }
        const comments = (json.data || []).map(comment => {
          const uid = comment.relationships?.uid?.data?.id;
          const authorName = uid ? localUsers[uid] : 'Community Member';
          return {
            ...comment,
            authorName: authorName
          };
        });
        setCommentsMap(prev => ({ ...prev, [postId]: comments }));
      }
    } catch (e) { }
  }

  async function handleCreatePost(e) {
    e.preventDefault();
    if (!postText.trim() && selectedFiles.length === 0) return;

    setSubmitting(true);
    try {
      const csrfToken = await getCsrfToken();
      const typeOfGroup = groupInfo ? groupInfo.groupType : 'public_group';

      const fileIds = [];

      // Phase 3: Image Upload Logic (multi-file)
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          // Step 1: Upload the binary file
          const fileRes = await fetch(`${BASE_URL}/jsonapi/post/photo/field_post_image`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `file; filename="${encodeURIComponent(file.name)}"`,
              'X-CSRF-Token': csrfToken
            },
            body: file
          });

          if (!fileRes.ok) {
            const errJson = await fileRes.json().catch(() => null);
            throw new Error(`File Upload Error: ${errJson?.errors?.[0]?.detail || 'Access Denied or Server Error'}`);
          }

          const fileData = await fileRes.json();
          if (fileData.data?.id) fileIds.push(fileData.data.id);
        }
      }

      const isPhotoPost = fileIds.length > 0;

      // Step 2: Create the post and attach the uploaded images
      const body = {
        data: {
          type: isPhotoPost ? 'post--photo' : 'post--post',
          attributes: {
            field_post: { value: postText || ' ', format: 'basic_html' },
            field_visibility: '1'
          },
          relationships: {
            field_recipient_group: { data: { type: `group--${typeOfGroup}`, id: id } }
          }
        }
      };

      if (isPhotoPost) {
        body.data.relationships.field_post_image = {
          data: fileIds.map(id => ({ type: 'file--file', id }))
        };
      }

      const endpointType = isPhotoPost ? 'photo' : 'post';
      const res = await fetch(`${BASE_URL}/jsonapi/post/${endpointType}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setPostText('');
        setSelectedFiles([]);
        showToast('Post published successfully');
        fetchPosts();
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(`Post Creation Error: ${errJson?.errors?.[0]?.detail || 'Access Denied or Server Error'}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId) {
    const isCurrentlyLiked = likedPosts.has(postId);

    // Optimistic UI update
    if (isCurrentlyLiked) {
      setLikedPosts(prev => { const next = new Set(prev); next.delete(postId); return next; });
      setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }));
    } else {
      setLikedPosts(prev => new Set(prev).add(postId));
      setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }

    try {
      const csrfToken = await getCsrfToken();

      // Get the current logged-in user name
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
      let currentLoggedUser = 'admin';
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u && u.name) currentLoggedUser = u.name;
        } catch (e) { }
      }

      if (isCurrentlyLiked) {
        // DELETE request to remove the like
        await fetch(`${BASE_URL}/likes_proxy.php/${postId}`, {
          method: 'DELETE', credentials: 'include',
          headers: {
            'X-CSRF-Token': csrfToken,
            'X-Logged-In-User': currentLoggedUser
          }
        });
      } else {
        const body = { data: { type: 'vote--like', relationships: { entity_id: { data: { type: 'post--post', id: postId } } } } };
        const res = await fetch(`${BASE_URL}/likes_proxy.php`, {
          method: 'POST', credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            Accept: 'application/vnd.api+json',
            'X-CSRF-Token': csrfToken,
            'X-Logged-In-User': currentLoggedUser
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error('Like failed');
      }
    } catch (err) {
      // Revert optimistic update on failure
      if (isCurrentlyLiked) {
        setLikedPosts(prev => new Set(prev).add(postId));
        setLikeCounts(prev => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
      } else {
        setLikedPosts(prev => { const next = new Set(prev); next.delete(postId); return next; });
        setLikeCounts(prev => ({ ...prev, [postId]: Math.max(0, (prev[postId] || 1) - 1) }));
      }
    }
  }

  async function handleComment(e, postId, postType) {
    e.preventDefault();
    const text = commentTexts[postId];
    if (!text || !text.trim()) return;

    try {
      const csrfToken = await getCsrfToken();
      const body = {
        data: {
          type: 'comment--post_comment',
          attributes: {
            field_comment_body: { value: text, format: 'basic_html' },
            entity_type: 'post',
            field_name: 'field_post_comments'
          },
          relationships: { entity_id: { data: { type: postType, id: postId } } }
        }
      };
      const res = await fetch(`${BASE_URL}/jsonapi/comment/post_comment`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': csrfToken },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        setCommentTexts(prev => ({ ...prev, [postId]: '' }));
        showToast('Comment added!');
        fetchCommentsForPost(postId); // Refresh comments to show the new one
      } else {
        const errJson = await res.json().catch(() => null);
        showToast(`Comment Error: ${errJson?.errors?.[0]?.detail || 'Failed'}`);
      }
    } catch (err) { }
  }

  const groupName = groupInfo ? groupInfo.attributes?.label : 'Community';
  const rawGroupDesc = groupInfo ? groupInfo.attributes?.field_group_description?.value : 'A vibrant space for discussion and collaboration.';
  const groupDesc = rawGroupDesc ? rawGroupDesc.replace(/(<([^>]+)>)/gi, "") : '';
  const initial = groupName.charAt(0).toUpperCase();

  const typeInfo = groupInfo ? (GROUP_TYPES[groupInfo.groupType] || GROUP_TYPES.public_group) : GROUP_TYPES.public_group;

  return (
    <AppShell>
      <style>{`
        /* Premium Light Mode Styles */
        .glass-card {
          background: #ffffff;
          border: 1px solid #e7e0ff;
          box-shadow: 0 2px 12px rgba(109, 40, 217, 0.08);
          border-radius: 20px;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .glass-card:hover {
          box-shadow: 0 10px 30px -6px rgba(109, 40, 217, 0.22);
        }
        
        .hero-gradient {
          background: linear-gradient(135deg, #07518a 0%, #0ea5e9 100%);
        }
        
        .btn-glow {
          background: linear-gradient(135deg, #07518a 0%, #0c66ad 100%);
          box-shadow: 0 10px 30px -10px rgba(7, 81, 138, 0.4);
          transition: all 0.2s ease;
        }
        .btn-glow:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 30px -10px rgba(7, 81, 138, 0.4);
        }
        .btn-glow:active {
          transform: translateY(1px);
        }
        
        .btn-action-light {
          background: transparent;
          color: #334155;
          border: none;
          transition: all 0.2s ease;
        }
        .btn-action-light:hover {
          background: #f1f5f9;
          color: #0f172a;
        }
        .btn-action-light.active {
          background: #e0f2fe;
          color: #0369a1;
        }
        
        .light-input {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #1e293b;
          transition: all 0.3s ease;
        }
        .light-input:focus {
          outline: none;
          border-color: #07518a;
          box-shadow: 0 0 0 3px rgba(7, 81, 138, 0.15);
          background: #ffffff;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes heart-pop {
          0% { transform: translate(-50%, -50%) scale(0) rotate(-15deg); opacity: 0; }
          15% { transform: translate(-50%, -50%) scale(1.2) rotate(0deg); opacity: 0.9; }
          30% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.9; }
          80% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(1.4) rotate(15deg); opacity: 0; }
        }
      `}</style>

      {toastMsg && <div style={G.toast}>{toastMsg}</div>}

      <div style={G.layout}>

        {/* Dynamic Hero Section */}
        <div className="glass-card" style={G.heroWrap}>
          <div className="hero-gradient" style={G.heroCover}>
            <button onClick={() => router.back()} style={G.backBtn}><ArrowLeft size={14} style={{ marginRight: 6 }} /> Go Back</button>
            <div style={G.heroStatus}>
              <div style={{ ...G.statusDot, backgroundColor: typeInfo.color, boxShadow: `0 0 10px ${typeInfo.color}80` }}></div>
              <typeInfo.Icon size={13} style={{ marginRight: '4px' }} /> {typeInfo.label}
            </div>
          </div>

          <div style={{ ...G.heroContent, flexWrap: isMobile ? 'wrap' : 'nowrap', padding: isMobile ? '0 20px 20px' : '0 40px 24px' }}>
            <div style={G.heroAvatarWrap}>
              <div style={G.heroAvatar}>{initial}</div>
            </div>
            <div style={G.heroTextWrap}>
              <h1 style={G.heroTitle}>{groupName}</h1>
              <p style={G.heroDesc}>{groupDesc}</p>
            </div>
            <button style={G.joinBtnActive}><Check size={15} style={{ marginRight: 6 }} /> Joined</button>
          </div>
        </div>

        <div style={{ ...G.mainGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: isMobile ? '16px' : '28px' }}>
          {/* Main Feed Area */}
          <div style={G.feedColumn}>

            {/* Create Post Component */}
            <div className="glass-card" style={G.composerCard}>
              <div style={G.composerTop}>
                <div style={G.userMiniAvatar}>M</div>
                <div style={{ flex: 1 }}>
                  <textarea
                    className="light-input"
                    style={G.textarea}
                    placeholder="Share an update, ask a question, or post a discussion..."
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                  />

                  {/* Image Preview Area */}
                  {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {selectedFiles.map((file, idx) => (
                        <div key={idx} style={{ ...G.previewContainer, width: 'auto', paddingRight: '8px' }}>
                          <div style={G.previewName}>
                            <ImageIcon size={16} /> {file.name}
                          </div>
                          <button type="button" onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} style={G.previewRemove}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={G.composerActions}>

                {/* Hidden File Input */}
                <input
                  type="file"
                  id="image-upload"
                  style={{ display: 'none' }}
                  accept="image/*"
                  multiple
                  onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) setSelectedFiles(prev => [...prev, ...files]); e.target.value = ''; }}
                />
                <button type="button" onClick={() => document.getElementById('image-upload').click()} className="btn-action-light" style={G.attachBtn}>
                  <ImageIcon size={16} /> Photo/Video (multi)
                </button>

                <button onClick={handleCreatePost} disabled={submitting || (!postText.trim() && selectedFiles.length === 0)} className="btn-glow" style={G.postBtn}>
                  {submitting ? 'Posting...' : <><Send size={16} /> Post</>}
                </button>
              </div>
            </div>

            {/* Stream Header */}
            <div style={G.streamHeader}>
              <h2 style={G.streamTitle}>Community Feed</h2>
              <div style={G.streamFilter}>Sort by: Latest</div>
            </div>

            {/* Posts Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {loading ? (
                <div style={G.loading}>
                  <div className="spinner" style={G.spinner}></div>
                  <p>Loading posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="glass-card" style={G.empty}>It's quiet here. Be the first to start a conversation!</div>
              ) : (
                posts.map((post, i) => {
                  const content = post.attributes?.field_post?.value?.replace(/(<([^>]+)>)/gi, "") || 'No content';
                  const isLiked = likedPosts.has(post.id);

                  // Check if there are attached images
                  const imageRelation = post.relationships?.field_post_image?.data;
                  const imageRels = Array.isArray(imageRelation) ? imageRelation : (imageRelation ? [imageRelation] : []);
                  const imageUrls = imageRels.map(r => imagesMap[r?.id]).filter(Boolean);

                  return (
                    <div
                      key={post.id}
                      className="glass-card"
                      style={{ ...G.postCard, animation: `fadeIn 0.4s ease backwards ${i * 0.05}s` }}
                      onDoubleClick={(e) => {
                        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'A' || e.target.tagName === 'TEXTAREA') return;
                        if (!isLiked) {
                          handleLike(post.id);
                        }
                        setLikedAnimationPostId(post.id);
                        setTimeout(() => setLikedAnimationPostId(null), 800);
                      }}
                    >

                      {/* Post Header */}
                      <div style={G.postHeader}>
                        <div style={{ ...G.postUserAvatar, background: 'linear-gradient(135deg, #07518a 0%, #0ea5e9 100%)' }}>
                          {(post.authorName || 'CM').substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <a 
                            href={`/profile?username=${encodeURIComponent(post.authorName || 'Community Member')}`} 
                            style={{ ...G.postUserName, textDecoration: 'none', cursor: 'pointer' }}
                            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                          >
                            {post.authorName || 'Community Member'}
                          </a>
                          <div style={G.postTime}>Just now · Anyone</div>
                        </div>
                      </div>

                      {/* Post Body */}
                      {content.trim() && <p style={G.postText}>{content}</p>}

                      {/* Render Image Attachments */}
                      {imageUrls.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', position: 'relative' }}>
                          {imageUrls.map((img, idx) => (
                            <div key={idx} style={{ ...G.postImageWrap, position: 'relative', cursor: 'pointer', flex: imageUrls.length > 1 ? '1 1 45%' : '1 1 100%', minWidth: imageUrls.length > 1 ? '220px' : '100%', marginBottom: 0 }}>
                              <AuthenticatedImage url={img} alt="Post Attachment" style={{ ...G.postImage, height: imageUrls.length > 1 ? '220px' : 'auto', objectFit: imageUrls.length > 1 ? 'cover' : 'contain' }} />
                            </div>
                          ))}
                          {likedAnimationPostId === post.id && (
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              zIndex: 10,
                              animation: 'heart-pop 0.8s ease-out forwards',
                              pointerEvents: 'none',
                              color: '#ef4444'
                            }}>
                              <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Interactions */}
                      <div style={G.interactionBar}>
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`btn-action-light ${isLiked ? 'active' : ''}`}
                          style={isLiked ? { ...G.actionBtn, color: '#6d28d9', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe' } : G.actionBtn}
                        >
                          <ThumbsUp size={15} fill={isLiked ? '#6d28d9' : 'none'} style={{ marginRight: '6px' }} /> {isLiked ? 'Liked' : 'Like'} {likeCounts[post.id] > 0 && `(${likeCounts[post.id]})`}
                        </button>
                        <button className="btn-action-light" style={G.actionBtn}>
                          <MessageCircle size={15} style={{ marginRight: '6px' }} /> Comment
                        </button>
                      </div>

                      {/* Comment Section */}

                      {/* Render Existing Comments */}
                      {(commentsMap[post.id] || []).length > 0 && (
                        <div style={{ padding: '16px 0 8px', borderTop: '1px solid #f0ebff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {commentsMap[post.id].map(comment => {
                            const cText = (comment.attributes?.field_comment_body?.value || comment.attributes?.comment_body?.value || '').replace(/(<([^>]+)>)/gi, "");
                            const author = comment.authorName || 'Community Member';
                            const initials = author.substring(0, 2).toUpperCase();
                            return (
                              <div key={comment.id} style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ ...G.userMiniAvatarSmall, backgroundColor: C.primary, color: '#fff' }}>{initials}</div>
                                <div style={{ background: '#faf8ff', padding: '10px 14px', borderRadius: '16px', fontSize: '14px', color: '#334155', flex: 1 }}>
                                  <span style={{ fontWeight: 'bold', display: 'block', marginBottom: '2px', color: C.heading }}>{author}</span>
                                  {cText}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div style={G.commentSection}>
                        <div style={G.userMiniAvatarSmall}>M</div>
                        <form style={{ flex: 1, position: 'relative' }} onSubmit={(e) => handleComment(e, post.id, post.type)}>
                          <input
                            type="text"
                            className="light-input"
                            placeholder="Write a comment..."
                            style={G.commentInput}
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({ ...prev, [post.id]: e.target.value }))}
                          />
                          <button type="submit" style={G.commentSubmitBtn}><Send size={15} /></button>
                        </form>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div style={{ ...G.sidebarColumn, position: isMobile ? 'static' : 'sticky' }}>
            <div className="glass-card" style={G.sidebarWidget}>
              <h3 style={G.widgetTitle}>About this Community</h3>
              <p style={G.widgetText}>
                {groupDesc}
              </p>

              <div style={G.statsGrid}>
                <div style={G.statBox}>
                  <div style={G.statLabel}>Members</div>
                  <div style={G.statValue}>{memberCount}</div>
                </div>
                <div style={G.statBox}>
                  <div style={G.statLabel}>Posts</div>
                  <div style={G.statValue}>{posts.length}</div>
                </div>
              </div>

              <button className="btn-action-light" style={G.viewAllBtn}>
                <Users size={16} /> View all members
              </button>

              {isAdmin && (
                <button
                  className="btn-glow"
                  style={{ ...G.viewAllBtn, marginTop: '12px', width: '100%', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}
                  onClick={() => {
                    fetchMembersData();
                    setShowMembersModal(true);
                  }}
                >
                  <Settings size={14} /> Manage Members
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Manage Members Modal */}
        {showMembersModal && (
          <div style={G.modalOverlay} onClick={() => setShowMembersModal(false)}>
            <div style={G.modalCard} onClick={e => e.stopPropagation()}>
              <div style={G.modalHeader}>
                <h2 style={{ margin: 0, fontSize: '20px', color: C.heading }}>Manage Members</h2>
                <button style={G.closeBtn} onClick={() => setShowMembersModal(false)}><X size={16} /></button>
              </div>

              <div style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '16px', color: '#334155', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
                  Pending Requests ({pendingMembers.length})
                </h3>
                {pendingMembers.length === 0 ? (
                  <p style={{ color: C.muted, fontSize: '14px', marginBottom: '24px' }}>No pending requests.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                    {pendingMembers.map(m => (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#faf8ff', borderRadius: '12px', border: `1px solid ${C.border}`, flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ ...G.userMiniAvatarSmall, backgroundColor: '#f59e0b', color: '#fff' }}>
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>{m.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button style={{ ...G.actionBtn, background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }} onClick={() => handleApproveMember(m.id)}>
                            Approve
                          </button>
                          <button style={{ ...G.actionBtn, background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', fontSize: '13px' }} onClick={() => setPendingMembers(prev => prev.filter(p => p.id !== m.id))}>
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 style={{ fontSize: '16px', color: '#334155', borderBottom: `1px solid ${C.border}`, paddingBottom: '8px', marginBottom: '16px' }}>
                  Active Members ({activeMembers.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activeMembers.map(m => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', background: '#fff', borderRadius: '12px', border: `1px solid ${C.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ ...G.userMiniAvatarSmall, backgroundColor: C.primary, color: '#fff' }}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight: '600', color: C.heading }}>{m.name}</span>
                      </div>
                      <span style={{ fontSize: '12px', color: C.muted, fontWeight: '500', background: '#f0ebff', padding: '4px 8px', borderRadius: '6px' }}>
                        {m.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

const G = {
  toast: { position: 'fixed', bottom: '24px', right: '24px', background: C.heading, color: '#fff', padding: '14px 20px', borderRadius: '12px', fontWeight: 600, fontSize: '14px', zIndex: 9999, boxShadow: S.cardHover },
  layout: { maxWidth: '1080px', margin: '0 auto', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: '32px' },

  // Hero
  heroWrap: { overflow: 'visible', paddingBottom: '24px', border: 'none' },
  heroCover: { height: '180px', position: 'relative', borderRadius: '24px 24px 0 0', overflow: 'hidden', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  backBtn: { background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', zIndex: 10 },
  heroStatus: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '600', color: '#fff', background: 'rgba(0,0,0,0.2)', backdropFilter: 'blur(4px)', padding: '6px 12px', borderRadius: '20px', zIndex: 10 },
  statusDot: { width: '8px', height: '8px', backgroundColor: '#10b981', borderRadius: '50%', boxShadow: '0 0 10px rgba(16,185,129,0.5)' },
  heroContent: { padding: '0 40px 24px', display: 'flex', alignItems: 'flex-start', gap: '24px', position: 'relative', zIndex: 20 },
  heroAvatarWrap: { marginTop: '-50px', position: 'relative' },
  heroAvatar: { width: '110px', height: '110px', borderRadius: '24px', backgroundColor: '#ffffff', border: '4px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px', fontWeight: '900', color: C.primary, flexShrink: 0, zIndex: 2, position: 'relative', boxShadow: S.card },
  heroTextWrap: { flex: 1, paddingTop: '16px' },
  heroTitle: { margin: '0 0 6px 0', fontSize: '30px', fontWeight: '800', letterSpacing: '-0.5px', color: C.heading },
  heroDesc: { margin: 0, fontSize: '15px', color: C.text, lineHeight: '1.5', maxWidth: '600px' },
  joinBtnActive: { ...P.btn, padding: '10px 24px', fontSize: '14px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' },

  // Grid layout
  mainGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '28px', alignItems: 'start' },
  feedColumn: { display: 'flex', flexDirection: 'column', gap: '20px' },
  sidebarColumn: { position: 'sticky', top: '32px' },

  // Composer
  composerCard: { padding: '24px' },
  composerTop: { display: 'flex', gap: '16px', marginBottom: '16px' },
  userMiniAvatar: { width: '44px', height: '44px', borderRadius: '14px', backgroundColor: C.primarySoft, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', flexShrink: 0 },
  textarea: { width: '100%', minHeight: '80px', borderRadius: '16px', padding: '16px', fontSize: '15px', fontFamily: 'inherit', resize: 'vertical' },
  composerActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: `1px solid ${C.borderLight}`, flexWrap: 'wrap', gap: '8px' },
  attachBtn: { fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '12px' },
  postBtn: { color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' },

  // File Preview
  previewContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', padding: '8px 12px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' },
  previewName: { fontSize: '13px', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' },
  previewRemove: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: '4px', borderRadius: '4px' },

  // Stream
  streamHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 4px 4px' },
  streamTitle: { fontSize: '18px', fontWeight: '800', color: C.heading, margin: 0 },
  streamFilter: { fontSize: '13px', color: C.muted, fontWeight: '500' },

  // Post Card
  postCard: { padding: '24px' },
  postHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' },
  postUserAvatar: { width: '42px', height: '42px', borderRadius: '12px', background: C.primarySoft, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' },
  postUserName: { fontWeight: '700', color: C.heading, fontSize: '15px' },
  postTime: { color: C.muted, fontSize: '12px', marginTop: '2px' },
  postText: { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 16px 0' },
  postImageWrap: { width: '100%', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px', border: `1px solid ${C.borderLight}`, background: C.bg },
  postImage: { width: '100%', display: 'block', maxHeight: '500px', objectFit: 'contain' },

  // Interactions
  interactionBar: { display: 'flex', gap: '8px', paddingBottom: '16px', borderBottom: `1px solid ${C.borderLight}` },
  actionBtn: { padding: '8px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },

  // Comments
  commentSection: { display: 'flex', gap: '12px', marginTop: '16px' },
  userMiniAvatarSmall: { width: '36px', height: '36px', borderRadius: '10px', backgroundColor: C.primarySoft, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 },
  commentInput: { width: '100%', borderRadius: '20px', padding: '12px 48px 12px 16px', fontSize: '14px', boxSizing: 'border-box' },
  commentSubmitBtn: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: C.primary, cursor: 'pointer', padding: '4px', display: 'flex' },

  // Sidebar
  sidebarWidget: { padding: '24px' },
  widgetTitle: { margin: '0 0 12px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' },
  widgetText: { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 24px 0' },
  statsGrid: { display: 'flex', gap: '12px', marginBottom: '24px' },
  statBox: { flex: 1, background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #f1f5f9' },
  statLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', marginBottom: '4px' },
  statValue: { fontSize: '20px', fontWeight: '800', color: '#0f172a' },
  viewAllBtn: { width: '100%', padding: '10px', borderRadius: '10px', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' },

  // Modal
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 },
  modalCard: { background: '#ffffff', borderRadius: '24px', width: '100%', maxWidth: '450px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden' },
  modalHeader: { padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  closeBtn: { background: 'none', border: 'none', fontSize: '20px', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' },

  loading: { textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '14px', fontWeight: 600, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' },
  spinner: { width: '28px', height: '28px', border: '3px solid #f1f5f9', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: '15px' }
};
