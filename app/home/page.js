'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsUp, MessageCircle, Image, Globe, Users, Calendar, MapPin, Plus, Hand, FolderUp, ChevronDown, ArrowRight } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import AppShell from '../../components/Appshell';
import { C, G, S as STheme, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

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
          style={{ color: C.primary, fontWeight: '700', textDecoration: 'none', cursor: 'pointer' }}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// ✅ Detect old demo/fake posts so we can purge them
const isDemoPost = (p) =>
  p?.id === 'p1' ||
  p?.author === 'Sarah Johnson' ||
  p?.tag === 'ANNOUNCEMENT' ||
  (p?.id || '').startsWith('demo-');

export default function MainMasterSocialFrontend() {

  /* ---------- Shell state ---------- */
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [toastMsg, setToastMsg] = useState('');
  const [currentUser, setCurrentUser] = useState({ name: 'Guest', role: 'Member', initials: 'GU' });

  /* ---------- Auth guard: open login first if not logged in ---------- */
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let isLoggedIn = false;
    try {
      const savedUser = localStorage.getItem('openserver_user');
      if (savedUser) {
        const u = JSON.parse(savedUser);
        isLoggedIn = !!(u && (u.loggedIn || u.data));
      }
    } catch (e) { }
    if (!isLoggedIn) {
      router.replace('/login');
      return;
    }
    setAuthChecked(true);
  }, [router]);

  /* ---------- Home state ---------- */
  const [events, setEvents] = useState([]);
  const [people, setPeople] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [followingPeople, setFollowingPeople] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const sidebar = JSON.parse(localStorage.getItem('openserver_following_sidebar') || '{}');
        const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
        const savedUser = localStorage.getItem('openserver_user');
        let currentLoggedUser = 'admin';
        if (savedUser) {
          const u = JSON.parse(savedUser);
          if (u && u.name) currentLoggedUser = u.name;
        }
        const myFollows = followsMap[currentLoggedUser.toLowerCase()] || [];
        myFollows.forEach(f => {
          sidebar[f.toLowerCase()] = true;
        });
        return sidebar;
      } catch (e) { }
    }
    return {};
  });

  const [newPostText, setNewPostText] = useState('');
  const [postVisibility, setPostVisibility] = useState('1');
  const [isVisibilityMenuOpen, setIsVisibilityMenuOpen] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [editPostText, setEditPostText] = useState('');
  const [newPostImages, setNewPostImages] = useState([]);
  const [newPostFiles, setNewPostFiles] = useState([]);
  const [newImageUrlInput, setNewImageUrlInput] = useState('');
  const [showPhotoInput, setShowPhotoInput] = useState(false);
  const [feedTab, setFeedTab] = useState('All Posts');
  const [openCommentPostId, setOpenCommentPostId] = useState(null); // ✅ was 'p1' (demo)
  const [commentInputs, setCommentInputs] = useState({});
  const [likedAnimationPostId, setLikedAnimationPostId] = useState(null);
  const [posts, setPosts] = useState([]); // ✅ NO demo data anymore — only real DB posts

  useEffect(() => {
    // ✅ Clean old demo posts out of localStorage once
    try {
      const savedPosts = localStorage.getItem('openserver_posts_v2');
      if (savedPosts) {
        const cleaned = (JSON.parse(savedPosts) || []).filter(p => !isDemoPost(p));
        localStorage.setItem('openserver_posts_v2', JSON.stringify(cleaned));
        setPosts(cleaned);
      }
      const savedUser = localStorage.getItem('openserver_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed?.name) {
          setCurrentUser({
            name: parsed.name, role: parsed.role || 'Member',
            initials: parsed.name.substring(0, 2).toUpperCase()
          });
        }
      }
    } catch (err) { }

    async function loadDatabasePhotoPosts() {
      try {
        const cb = Date.now();
        const [photoRes, postRes, commentsRes, likesRes] = await Promise.all([
          fetch(`${API_URL}/jsonapi/post/photo?include=user_id,field_post_image`, { credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
          fetch(`${API_URL}/jsonapi/post/post?include=user_id&sort=-created`, { credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
          fetch(`${API_URL}/jsonapi/comment/post_comment?include=uid&sort=created`, { credentials: 'include', cache: 'no-store', headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }),
          fetch(`${API_URL}/likes_proxy.php?_cb=${cb}`, { credentials: 'include', cache: 'no-store' })
        ]);

        let allApiPosts = [];
        let usersMap = {};
        let filesMap = {};

        const processJson = (json) => {
          if (json.included) {
            json.included.forEach(inc => {
              if (inc.type === 'user--user') {
                const parsedName = inc.attributes?.display_name || inc.attributes?.name;
                if (parsedName) {
                  usersMap[inc.id] = parsedName;
                } else if (!usersMap[inc.id]) {
                  usersMap[inc.id] = 'Community Member';
                }
              }
              if (inc.type === 'file--file') {
                let url = inc.attributes?.uri?.url || '';
                if (url) {
                  if (url.startsWith('/system/files/') || url.startsWith('/sites/default/files/styles/')) {
                    url = '/index.php' + url;
                  }
                  filesMap[inc.id] = url.startsWith('http') ? url : `${API_URL}${url}`;
                }
              }
            });
          }
          if (json.data) allApiPosts = [...allApiPosts, ...json.data];
        };

        if (photoRes.ok) processJson(await photoRes.json());
        if (postRes.ok) processJson(await postRes.json());

        // Parse comments grouped by post ID
        let commentsGroupedByPost = {};
        if (commentsRes.ok) {
          const commentsJson = await commentsRes.json();
          processJson(commentsJson);
          if (commentsJson.data) {
            commentsJson.data.forEach(c => {
              const postId = c.relationships?.entity_id?.data?.id;
              if (postId) {
                if (!commentsGroupedByPost[postId]) commentsGroupedByPost[postId] = [];
                const text = (c.attributes?.field_comment_body?.value || c.attributes?.comment_body?.value || '').replace(/(<([^>]+)>)/gi, '');
                const commentUid = c.relationships?.uid?.data?.id;
                const authorName = commentUid ? usersMap[commentUid] : 'Community Member';
                const initials = authorName.substring(0, 2).toUpperCase();
                commentsGroupedByPost[postId].push({
                  id: c.id,
                  author: authorName,
                  avatar: null,
                  initials: initials,
                  text: text
                });
              }
            });
          }
        }

        // Get the current logged-in user name
        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
        let currentLoggedUser = 'admin';
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            if (u && u.name) currentLoggedUser = u.name;
          } catch (e) { }
        }

        // Parse likes count map and user likes state
        let likesCountMap = {};
        let userLikesMap = {};
        if (likesRes.ok) {
          const likesJson = await likesRes.json();
          if (likesJson.data) {
            likesJson.data.forEach(like => {
              const postId = like.relationships?.entity_id?.data?.id;
              if (postId) {
                likesCountMap[postId] = (likesCountMap[postId] || 0) + 1;
                const likeUser = like.attributes?.username || 'anonymous';
                if (likeUser.toLowerCase() === currentLoggedUser.toLowerCase()) {
                  userLikesMap[postId] = true;
                }
              }
            });
          }
        }

        allApiPosts.sort((a, b) => new Date(b.attributes?.created || 0) - new Date(a.attributes?.created || 0));

        // Local posts may carry the real logged-in author
        let localById = {};
        if (typeof window !== 'undefined') {
          try {
            const savedPosts = localStorage.getItem('openserver_posts_v2');
            if (savedPosts) JSON.parse(savedPosts).forEach((p) => { if (p.id && !isDemoPost(p)) localById[p.id] = p; });
          } catch (e) { }
        }

        let followingMap = {};
        if (typeof window !== 'undefined') {
          try {
            const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
            const myFollows = followsMap[currentLoggedUser.toLowerCase()] || [];
            myFollows.forEach(f => {
              followingMap[f.toLowerCase()] = true;
            });
            const sidebarFollows = JSON.parse(localStorage.getItem('openserver_following_sidebar') || '{}');
            Object.keys(sidebarFollows).forEach(k => {
              if (sidebarFollows[k]) {
                followingMap[k.toLowerCase()] = true;
              }
            });
            const savedList = localStorage.getItem('openserver_users_v2');
            if (savedList) {
              JSON.parse(savedList).forEach(u => {
                if (u.isFollowing) followingMap[u.name.toLowerCase()] = true;
              });
            }
          } catch (e) { }
        }

        const filteredApiPosts = allApiPosts.filter(item => {
          const uid = item.relationships?.user_id?.data?.id;
          const authorName = localById[item.id]?.author || (uid ? usersMap[uid] : (item.attributes?.field_author_name || 'Community Member'));
          const visibility = String(item.attributes?.field_visibility || '1');

          if (visibility === '1') return true;
          if (visibility === '3') {
            if (authorName.toLowerCase() === currentLoggedUser.toLowerCase()) return true;
            if (followingMap[authorName.toLowerCase()]) return true;
            return false;
          }
          return true;
        });

        const apiPosts = filteredApiPosts.map((item, idx) => {
          const uid = item.relationships?.user_id?.data?.id;
          const localPost = localById[item.id];
          const authorName = localPost?.author || (uid ? usersMap[uid] : (item.attributes?.field_author_name || 'Community Member'));
          const role = authorName.toLowerCase() === 'admin' ? 'Administrator' : 'OpenSocial Contributor';
          const initials = authorName.substring(0, 2).toUpperCase();

          const postComments = commentsGroupedByPost[item.id] || [];
          const likesCount = likesCountMap[item.id] || 0;

          // ✅ Resolve the REAL uploaded images from Drupal (no demo image)
          let postImg = null;
          let postImgs = [];
          if (item.type === 'post--photo') {
            const fileRel = item.relationships?.field_post_image?.data;
            const fileIds = Array.isArray(fileRel) ? fileRel.map(r => r?.id).filter(Boolean) : (fileRel?.id ? [fileRel.id] : []);
            postImgs = fileIds.map(fid => filesMap[fid]).filter(Boolean);
            postImg = postImgs[0] || null;
          }

          return {
            id: item.id || `db-post-${idx}`,
            apiType: item.type || 'post--post',
            visibility: String(item.attributes?.field_visibility || '1'),
            author: authorName,
            role: role, tag: 'UPDATE',
            avatar: null, // ✅ no fake faces — show initials circle
            initials: initials,
            time: item.attributes?.created ? new Date(item.attributes.created).toLocaleString() : 'Recently',
            content: item.attributes?.field_post?.value || item.attributes?.body?.value || 'Shared an update',
            image: postImg,
            images: postImgs,
            userReaction: userLikesMap[item.id] ? 'like' : null, likesCount: likesCount, dislikesCount: 0, lovesCount: 0, commentsCount: postComments.length, comments: postComments
          };
        });

        setPosts((prev) => {
          // ✅ Merge, but drop demo posts from prev too
          const merged = [...apiPosts, ...prev.filter(p => !apiPosts.some(ap => ap.id === p.id) && !isDemoPost(p))];

          return merged.filter(p => {
            const author = p.author || '';
            const vis = String(p.visibility || '1');

            if (vis === '1') return true;
            if (vis === '3') {
              if (author.toLowerCase() === currentLoggedUser.toLowerCase()) return true;
              return !!followingMap[author.toLowerCase()];
            }
            return true;
          });
        });
      } catch (err) { }
    }
    loadDatabasePhotoPosts();

    async function loadWidgetsData() {
      try {
        const evtRes = await fetch(`${API_URL}/jsonapi/node/event?sort=-created&page[limit]=3`);
        if (evtRes.ok) {
          const evtJson = await evtRes.json();
          if (evtJson.data?.length > 0) {
            const apiEvents = evtJson.data.map(item => {
              const rawDate = item.attributes?.field_event_date?.value
                || item.attributes?.field_date?.value
                || item.attributes?.created;
              const dt = rawDate ? new Date(rawDate) : new Date();
              const mon = dt.toLocaleString('en-US', { month: 'short' }).toUpperCase();
              const day = dt.getDate().toString().padStart(2, '0');
              const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateStr = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const loc = item.attributes?.field_location || item.attributes?.field_event_location || 'Online';
              return {
                id: item.id,
                m: mon,
                d: day,
                title: item.attributes?.title || 'Community Event',
                meta: `${dateStr} • ${timeStr}`,
                loc: loc
              };
            });
            setEvents(apiEvents);
          } else {
            setEvents([]);
          }
        } else {
          setEvents([]);
        }

        setPeopleLoading(true);
        const usrRes = await fetch(`${API_URL}/jsonapi/user/user?sort=-created&page[limit]=10`, {
          credentials: 'include',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (usrRes.ok) {
          const usrJson = await usrRes.json();
          if (usrJson.data?.length > 0) {
            const colors = [
              { bg: C.primarySoft, c: C.primary },
              { bg: C.accentSoft, c: C.accent },
              { bg: C.successSoft, c: C.success },
              { bg: '#f1f5f9', c: '#334155' },
              { bg: '#e0f2fe', c: '#0369a1' }
            ];
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
            let selfName = '';
            try { if (savedUser) selfName = (JSON.parse(savedUser)?.name || '').toLowerCase(); } catch (e) { }

            const apiPeople = usrJson.data
              .filter(u => {
                const uname = u.attributes?.name || '';
                if (!uname || uname.toLowerCase() === 'anonymous') return false;
                if (selfName && uname.toLowerCase() === selfName) return false;
                return true;
              })
              .slice(0, 3)
              .map((item, idx) => {
                const name = item.attributes.display_name || item.attributes.name;
                const username = item.attributes.name;
                const initials = name.substring(0, 2).toUpperCase();
                return { id: item.id, name, username, i: initials, ...colors[idx % colors.length] };
              });
            setPeople(apiPeople);
          } else {
            setPeople([]);
          }
        } else {
          setPeople([]);
        }
        setPeopleLoading(false);
      } catch (err) { }
    }
    loadWidgetsData();
  }, [followingPeople]);

  const savePostsState = (updated) => {
    setPosts(updated);
    try { localStorage.setItem('openserver_posts_v2', JSON.stringify(updated.filter(p => !isDemoPost(p)))); } catch (err) { }
  };
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500); };

  const handlePostReaction = async (postId, type) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const postTitle = post ? (post.content.length > 30 ? post.content.substring(0, 30) + '...' : post.content) : 'a post';
    const isRemoving = post.userReaction === type;

    const updated = posts.map((p) => {
      if (p.id !== postId) return p;
      let likes = p.likesCount, loves = p.lovesCount, dislikes = p.dislikesCount;
      if (isRemoving) {
        if (type === 'like') likes = Math.max(0, likes - 1);
        if (type === 'love') loves = Math.max(0, loves - 1);
        if (type === 'dislike') dislikes = Math.max(0, dislikes - 1);
        return { ...p, userReaction: null, likesCount: likes, lovesCount: loves, dislikesCount: dislikes };
      }
      if (type === 'like') likes++; if (type === 'love') loves++; if (type === 'dislike') dislikes++;
      return { ...p, userReaction: type, likesCount: likes, lovesCount: loves, dislikesCount: dislikes };
    });
    savePostsState(updated);
    showToast(isRemoving ? 'Removed reaction' : 'Reacted to post!');

    if (type === 'like' && post.apiType) {
      try {
        const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
        const csrfToken = await tokenRes.text();

        const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
        let currentLoggedUser = 'admin';
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            if (u && u.name) currentLoggedUser = u.name;
          } catch (e) { }
        }

        if (isRemoving) {
          await fetch(`${API_URL}/likes_proxy.php/${postId}`, {
            method: 'DELETE', credentials: 'include',
            headers: {
              'X-CSRF-Token': csrfToken,
              'X-Logged-In-User': currentLoggedUser
            }
          });
        } else {
          const body = { data: { type: 'vote--like', relationships: { entity_id: { data: { type: post.apiType, id: postId } } } } };
          const res = await fetch(`${API_URL}/likes_proxy.php`, {
            method: 'POST', credentials: 'include',
            headers: {
              'Content-Type': 'application/vnd.api+json',
              Accept: 'application/vnd.api+json',
              'X-CSRF-Token': csrfToken,
              'X-Logged-In-User': currentLoggedUser
            },
            body: JSON.stringify(body)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const errMsg = errData?.errors?.[0]?.detail || res.statusText || 'Forbidden/Access Denied';
            showToast(`Like Database Error: ${errMsg}`);
            setPosts(prev => prev.map(p => p.id === postId ? {
              ...p,
              userReaction: null,
              likesCount: Math.max(0, p.likesCount - 1)
            } : p));
          }
        }
      } catch (e) {
        console.error('Like API failed', e);
        showToast('Backend Offline: Like saved locally only.');
      }
    }

    const actionText = type === 'like' ? 'liked the post' : type === 'love' ? 'loved the post' : 'disliked the post';
    recordActivityLog(
      currentUser.name,
      isRemoving ? 'un-' + actionText : actionText,
      postTitle,
      type === 'like' ? 'like' : type === 'love' ? 'heart' : 'dislike',
      post.image
    );
  };

  const handlePublishPost = async (e) => {
    e?.preventDefault();
    const postImgs = newPostImages.filter(Boolean);
    if (!newPostText.trim() && postImgs.length === 0) return;

    const tempId = 'p-' + Date.now();
    savePostsState([{
      id: tempId, author: currentUser.name, role: currentUser.role, tag: 'NEW',
      avatar: null, initials: currentUser.initials, time: 'Just now',
      content: newPostText, image: postImgs[0] || null, images: postImgs, userReaction: null,
      visibility: postVisibility,
      likesCount: 0, dislikesCount: 0, lovesCount: 0, commentsCount: 0, comments: []
    }, ...posts]);

    recordActivityLog(
      currentUser.name,
      'created a new post:',
      newPostText.length > 30 ? newPostText.substring(0, 30) + '...' : newPostText,
      'edit',
      postImgs[0] || null
    );

    const savedText = newPostText;
    const savedFiles = newPostFiles;
    setNewPostText(''); setNewPostImages([]); setNewPostFiles([]); setNewImageUrlInput(''); setShowPhotoInput(false);
    showToast('Post published!');

    try {
      const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
      const token = await tokenRes.text();
      let fileIds = [];

      if (savedFiles.length > 0) {
        for (const file of savedFiles) {
          const fileRes = await fetch(`${API_URL}/jsonapi/post/photo/field_post_image`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `file; filename="${encodeURIComponent(file.name)}"`,
              'X-CSRF-Token': token
            },
            body: file
          });
          if (fileRes.ok) {
            const fileData = await fileRes.json();
            if (fileData.data?.id) fileIds.push(fileData.data.id);
          }
        }
      }

      const isPhoto = fileIds.length > 0;
      const body = {
        data: {
          type: isPhoto ? 'post--photo' : 'post--post',
          attributes: {
            field_post: { value: savedText.trim() || 'Shared an image', format: 'basic_html' },
            field_visibility: postVisibility
          }
        }
      };

      if (isPhoto) {
        body.data.relationships = {
          field_post_image: { data: fileIds.map(id => ({ type: 'file--file', id })) }
        };
      }

      const res = await fetch(`${API_URL}/jsonapi/post/${isPhoto ? 'photo' : 'post'}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': token },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const json = await res.json();
        const realId = json.data?.id;
        const realType = json.data?.type;
        if (realId) {
          setPosts(prev => {
            const updatedList = prev.map(p => p.id === tempId ? { ...p, id: realId, apiType: realType } : p);
            try { localStorage.setItem('openserver_posts_v2', JSON.stringify(updatedList.filter(p => !isDemoPost(p)))); } catch (err) { }
            return updatedList;
          });
        }
      } else {
        const errJson = await res.json().catch(() => null);
        console.error('Failed to post to API', errJson);
        const errMsg = errJson?.errors?.[0]?.detail || 'Unknown error occurred while posting.';
        setToastMsg(`API Error: ${errMsg}`);
        setTimeout(() => setToastMsg(''), 5000);
      }
    } catch (err) {
      console.error('API Error during post publish', err);
      setToastMsg(`Network Error: ${err.message}`);
      setTimeout(() => setToastMsg(''), 5000);
    }
  };

  const handleMainFeedFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setNewPostFiles((prev) => [...prev, ...files]);
    files.forEach((file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setNewPostImages((prev) => [...prev, ev.target.result]);
        showToast(`Image "${file.name}" attached!`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    const url = newImageUrlInput.trim();
    if (!url) return;
    setNewPostImages((prev) => [...prev, url]);
    setNewImageUrlInput('');
  };

  const handleRemoveComposerImage = (idx) => {
    setNewPostImages((prev) => prev.filter((_, i) => i !== idx));
    setNewPostFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId];
    if (!text?.trim()) return;
    const post = posts.find((p) => p.id === postId);
    const postTitle = post ? (post.content.length > 30 ? post.content.substring(0, 30) + '...' : post.content) : 'a post';
    const tempCommentId = 'c-' + Date.now();
    const updated = posts.map((p) => p.id === postId ? {
      ...p, commentsCount: p.commentsCount + 1,
      comments: [...p.comments, { id: tempCommentId, author: currentUser.name, avatar: null, initials: currentUser.initials, text: text.trim() }]
    } : p);
    savePostsState(updated);
    setCommentInputs({ ...commentInputs, [postId]: '' });
    showToast('Comment added!');

    recordActivityLog(
      currentUser.name,
      'commented on the post:',
      text.length > 30 ? text.substring(0, 30) + '...' : text,
      'comment',
      post.image
    );

    if (post.apiType) {
      try {
        const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
        const csrfToken = await tokenRes.text();
        const body = {
          data: {
            type: 'comment--post_comment',
            attributes: {
              field_comment_body: { value: text.trim(), format: 'basic_html' },
              entity_type: 'post',
              field_name: 'field_post_comments'
            },
            relationships: { entity_id: { data: { type: post.apiType, id: postId } } }
          }
        };
        const res = await fetch(`${API_URL}/jsonapi/comment/post_comment`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify(body)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          const errMsg = errData?.errors?.[0]?.detail || res.statusText || 'Forbidden/Access Denied';
          showToast(`Backend Sync Failed: ${errMsg}`);
          setPosts(prev => prev.map(p => p.id === postId ? {
            ...p, commentsCount: Math.max(0, p.commentsCount - 1),
            comments: p.comments.filter(c => c.id !== tempCommentId)
          } : p));
        } else {
          const json = await res.json();
          const realCommentId = json.data?.id;
          if (realCommentId) {
            setPosts(prev => prev.map(p => p.id === postId ? {
              ...p,
              comments: p.comments.map(c => c.id === tempCommentId ? { ...c, id: realCommentId } : c)
            } : p));
          }
        }
      } catch (e) {
        console.error('Comment API failed', e);
        showToast('Backend Offline: Comment saved locally only.');
      }
    } else {
      showToast('Local Post: Comment saved in browser session only.');
    }
  };

  async function recordActivityLog(user, action, target, icon = 'zap', postImage = null) {
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
        postImage: postImage
      };
      const updatedList = [newEntry, ...existing];
      localStorage.setItem('openserver_logs_v2', JSON.stringify(updatedList));

      try {
        const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
        const csrfToken = await tokenRes.text();

        await fetch(`${API_URL}/jsonapi/activity/activity`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
            'X-CSRF-Token': csrfToken
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

  const deletePost = async (id) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    const postTitle = post.content.length > 30 ? post.content.substring(0, 30) + '...' : post.content;

    savePostsState(posts.filter((p) => p.id !== id));
    showToast('Post deleted');
    recordActivityLog(currentUser.name, 'deleted a post:', postTitle, 'delete');

    if (post.apiType) {
      try {
        const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
        const csrfToken = await tokenRes.text();
        await fetch(`${API_URL}/jsonapi/post/${post.apiType === 'post--photo' ? 'photo' : 'post'}/${id}`, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'X-CSRF-Token': csrfToken }
        });
      } catch (e) { console.error('Delete failed', e); }
    }
  };

  const handleEditPostSubmit = async (id) => {
    const post = posts.find((p) => p.id === id);
    if (!post || !editPostText.trim()) return;

    savePostsState(posts.map((p) => p.id === id ? { ...p, content: editPostText } : p));
    setEditPostId(null);
    showToast('Post updated');

    if (post.apiType) {
      try {
        const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
        const csrfToken = await tokenRes.text();
        await fetch(`${API_URL}/jsonapi/post/${post.apiType === 'post--photo' ? 'photo' : 'post'}/${id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            data: {
              type: post.apiType,
              id: id,
              attributes: { field_post: { value: editPostText, format: 'basic_html' } }
            }
          })
        });
      } catch (e) { console.error('Edit failed', e); }
    }
  };

  const trends = ['#Innovation', '#CompanyNews', '#Leadership', '#Wellness', '#CustomerFirst', '#AI', '#Diversity'];

  const handleFollowPerson = async (username) => {
    const key = username.toLowerCase();
    const personObj = people.find(p => (p.username || p.name).toLowerCase() === key);
    const targetUuid = personObj?.id;

    setFollowingPeople(prev => {
      const nextState = !prev[key];
      const updated = { ...prev, [key]: nextState };
      try { localStorage.setItem('openserver_following_sidebar', JSON.stringify(updated)); } catch (e) { }

      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
      let currentLoggedUser = 'admin';
      if (savedUser) {
        try {
          const u = JSON.parse(savedUser);
          if (u && u.name) currentLoggedUser = u.name;
        } catch (e) { }
      }

      try {
        const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
        let myFollows = followsMap[currentLoggedUser.toLowerCase()] || [];
        if (nextState) {
          if (!myFollows.map(x => x.toLowerCase()).includes(key)) {
            myFollows.push(username);
          }
        } else {
          myFollows = myFollows.filter(x => x.toLowerCase() !== key);
        }
        followsMap[currentLoggedUser.toLowerCase()] = myFollows;
        localStorage.setItem('openserver_follows_map', JSON.stringify(followsMap));
      } catch (e) { }

      try {
        const savedList = localStorage.getItem('openserver_users_v2');
        if (savedList) {
          const usersList = JSON.parse(savedList);
          const updatedUsers = usersList.map(u => u.name && u.name.toLowerCase() === key ? { ...u, isFollowing: nextState } : u);
          localStorage.setItem('openserver_users_v2', JSON.stringify(updatedUsers));
        }
      } catch (e) { }

      if (targetUuid) {
        const nextStateVal = nextState;
        (async () => {
          try {
            const tokenRes = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
            const token = (await tokenRes.text()).trim();

            if (nextStateVal) {
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
        })();
      }

      return updated;
    });
  };


  if (!authChecked) return null;

  return (
    <AppShell>
      {toastMsg && <div style={S.toast}>{toastMsg}</div>}

      <div style={{ ...S.pageGrid, gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: isMobile ? '16px' : '24px' }}>
        {/* CENTER */}
        <div style={S.centerCol}>
          <div style={S.hero}>
            <div>
              <div style={{ ...S.heroKicker, display: 'flex', alignItems: 'center', gap: '8px' }}><Hand size={22} /> Good to see you, {currentUser.name.split(' ')[0]}!</div>
              <h1 style={S.heroTitle}>Welcome back! Let's make today a great day together.</h1>
              <div style={S.heroDate}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '32px' }}><Users size={40} color={C.onDark} /></div>
          </div>

          {/* Composer */}
          <div style={S.card}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
              <div style={S.avatarBlue}>{currentUser.initials}</div>
              <input value={newPostText} onChange={(e) => setNewPostText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePublishPost(e)}
                placeholder="What's on your mind?" style={S.composerInput} />
            </div>
            {showPhotoInput && (
              <div style={S.photoPanel}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={S.fileUploadBtn}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FolderUp size={14} /> Select Files from Computer</span>
                    <input type="file" accept="image/*" multiple onChange={handleMainFeedFileUpload} style={{ display: 'none' }} />
                  </label>
                  <span style={{ fontSize: '12px', color: C.muted }}>Or paste image URL:</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={newImageUrlInput} onChange={(e) => setNewImageUrlInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                    placeholder="Paste web image URL here..." style={S.textInput} />
                  <button type="button" onClick={handleAddImageUrl} style={S.chip}>Add</button>
                </div>
                {newPostImages.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '12px' }}>
                    {newPostImages.map((img, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <img src={img} alt="Preview" style={{ maxHeight: '120px', maxWidth: '160px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #a99fd0' }} />
                        <button
                          type="button"
                          onClick={() => handleRemoveComposerImage(idx)}
                          style={{
                            position: 'absolute', top: '-8px', right: '-8px', width: '22px', height: '22px',
                            borderRadius: '50%', border: 'none', backgroundColor: '#ef4444', color: '#fff',
                            fontSize: '13px', fontWeight: 800, cursor: 'pointer', lineHeight: '1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                          aria-label="Remove image"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={S.composerActions}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setShowPhotoInput(!showPhotoInput)} style={S.chip}><Image size={14} style={{ marginRight: '5px', verticalAlign: 'text-bottom' }} />Image</button>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setIsVisibilityMenuOpen(!isVisibilityMenuOpen)}
                    style={{
                      padding: '8px 16px', borderRadius: '20px', border: `1px solid ${C.border}`,
                      backgroundColor: '#faf8ff', fontSize: '13px', fontWeight: 600,
                      color: C.heading, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    {postVisibility === '1' ? <><Globe size={14} /> Public</> : <><Users size={14} /> Following</>}
                    <ChevronDown size={14} color={C.muted} />
                  </button>
                  {isVisibilityMenuOpen && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px',
                      backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)', overflow: 'hidden', minWidth: '180px', zIndex: 100
                    }}>
                      <div onClick={() => { setPostVisibility('1'); setIsVisibilityMenuOpen(false); }} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: postVisibility === '1' ? 700 : 500, backgroundColor: postVisibility === '1' ? '#faf8ff' : '#fff', color: C.heading }}><Globe size={15} /> Public</div>
                      <div onClick={() => { setPostVisibility('3'); setIsVisibilityMenuOpen(false); }} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: postVisibility === '3' ? 700 : 500, backgroundColor: postVisibility === '3' ? '#faf8ff' : '#fff', color: C.heading }}><Users size={15} /> Following Users</div>
                    </div>
                  )}
                </div>
                <button onClick={handlePublishPost} style={S.postBtn}>Post</button>
              </div>
            </div>
          </div>

          {/* Posts — ONLY real database posts now */}
          {posts.length === 0 && (
            <div style={{ ...S.card, textAlign: 'center', padding: '40px 20px', color: C.muted }}>
              <div style={{ fontSize: '36px', marginBottom: '8px' }}>📰</div>
              <div style={{ fontWeight: 700, color: C.heading }}>No posts yet</div>
              <div style={{ fontSize: '13px', marginTop: '4px' }}>Be the first to share something!</div>
            </div>
          )}
          {posts.map((post) => (
            <article
              key={post.id}
              style={S.card}
              onDoubleClick={(e) => {
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'A' || e.target.tagName === 'TEXTAREA') return;
                if (post.userReaction !== 'like') {
                  handlePostReaction(post.id, 'like');
                }
                setLikedAnimationPostId(post.id);
                setTimeout(() => setLikedAnimationPostId(null), 800);
              }}
            >
              <div style={S.postHead}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {post.avatar
                    ? <img src={post.avatar} alt={post.author} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                    : <div style={S.avatarBlue}>{post.initials || 'CM'}</div>}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <a
                        href={`/profile?username=${encodeURIComponent(post.author)}`}
                        style={{ fontWeight: 800, fontSize: '14px', color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                      >
                        {post.author}
                      </a>
                      <span style={S.roleTag}>{post.role}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: C.faint }}>{post.time}</span>
                  </div>
                </div>

              </div>
              {post.tag && <span style={S.badgePurple}>{post.tag}</span>}
              {editPostId === post.id ? (
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea value={editPostText} onChange={(e) => setEditPostText(e.target.value)} style={{ width: '100%', minHeight: '60px', borderRadius: '8px', border: '1px solid #a99fd0', padding: '8px' }} />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditPostId(null)} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #a99fd0', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Cancel</button>
                    <button onClick={() => handleEditPostSubmit(post.id)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: G.brand, color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Save</button>
                  </div>
                </div>
              ) : (
                <p style={S.postBody}>{renderContentWithTags(post.content)}</p>
              )}
              {(post.images?.length ? post.images : post.image ? [post.image] : []).length > 0 && (
                <div style={{ ...S.media, position: 'relative', cursor: 'pointer', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(post.images?.length ? post.images : post.image ? [post.image] : []).map((img, idx) => (
                    <div key={idx} style={{ position: 'relative', flex: post.images?.length > 1 ? '1 1 45%' : '1 1 100%', minWidth: post.images?.length > 1 ? '220px' : '100%' }}>
                      <img src={img} alt="Media" style={{ ...S.mediaImg, width: '100%', height: post.images?.length > 1 ? '220px' : 'auto', objectFit: post.images?.length > 1 ? 'cover' : 'contain' }} />
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
              <div style={S.actions}>
                <button onClick={() => handlePostReaction(post.id, 'like')} style={post.userReaction === 'like' ? { ...S.actionPill, color: C.primary, fontWeight: 800, backgroundColor: C.primarySoft, borderColor: C.border } : S.actionPill}>
                  <ThumbsUp size={15} fill={post.userReaction === 'like' ? C.primary : 'none'} style={{ marginRight: '6px' }} />
                  {post.userReaction === 'like' ? 'Liked' : 'Like'} ({post.likesCount})
                </button>
                <button onClick={() => setOpenCommentPostId(openCommentPostId === post.id ? null : post.id)} style={S.actionPill}>
                  <MessageCircle size={15} style={{ marginRight: '6px' }} />
                  Comment ({post.commentsCount})
                </button>
              </div>
              {openCommentPostId === post.id && (
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${C.borderLight}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {(post.comments || []).map((c) => (
                      <div key={c.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        {c.avatar
                          ? <img src={c.avatar} alt={c.author} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
                          : <div style={{ ...S.avatarBlue, width: '28px', height: '28px', fontSize: '10px' }}>{c.initials || 'U'}</div>}
                        <div style={{ backgroundColor: '#faf8ff', padding: '8px 12px', borderRadius: '10px', flex: 1 }}>
                          <span style={{ fontWeight: 800, fontSize: '12px', display: 'block' }}>{c.author}</span>
                          <span style={{ fontSize: '13px', color: '#334155' }}>{renderContentWithTags(c.text)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      placeholder="Write a comment..." style={S.textInput} />
                    <button onClick={() => handleAddComment(post.id)} style={S.postBtn}>Send</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>

        {/* RIGHT WIDGETS */}
        <div style={S.rightWidgets}>
          <div style={S.widgetCard}>
            <div style={S.widgetHead}>
              <span style={S.widgetTitle}>Upcoming Events</span>
              <a href="/events" style={{ fontSize: '12px', color: C.primary, fontWeight: 700, cursor: 'pointer', textDecoration: 'none' }}>View All</a>
            </div>
            {events.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '18px 0', color: C.faint, fontSize: '13px' }}>
                <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}><Calendar size={30} color={C.faint} /></div>
                <div style={{ fontWeight: 600 }}>No upcoming events</div>
                <a href="/events" style={{ fontSize: '11px', color: C.primary, fontWeight: 700, textDecoration: 'none', marginTop: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>Schedule one <ArrowRight size={14} /></a>
              </div>
            ) : (
              events.map((ev) => (
                <a key={ev.id || ev.title} href="/events" style={{ display: 'flex', gap: '12px', marginBottom: '14px', textDecoration: 'none', color: 'inherit' }}>
                  <div style={S.dateBox}><span style={S.dateM}>{ev.m}</span><span style={S.dateD}>{ev.d}</span></div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2a2463' }}>{ev.title}</div>
                    <div style={{ fontSize: '11px', color: C.muted }}>{ev.meta}</div>
                    <div style={{ fontSize: '11px', color: C.faint, display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} /> {ev.loc}</div>
                  </div>
                </a>
              ))
            )}
          </div>

          <div style={S.widgetCard}>
            <div style={S.widgetHead}>
              <span style={S.widgetTitle}>People You May Know</span>
              <a href="/search" style={{ fontSize: '12px', color: C.primary, fontWeight: 700, textDecoration: 'none' }}>View All</a>
            </div>
            {peopleLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(n => (
                  <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ height: '12px', borderRadius: '6px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: '70%' }} />
                      <div style={{ height: '10px', borderRadius: '6px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: '45%' }} />
                    </div>
                    <div style={{ width: '58px', height: '26px', borderRadius: '8px', background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ) : people.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '18px 0', color: C.faint, fontSize: '13px' }}>
                <div style={{ marginBottom: '6px', display: 'flex', justifyContent: 'center' }}><Users size={30} color={C.faint} /></div>
                <div style={{ fontWeight: 600 }}>No users in database yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {people.map((p) => (
                  <div key={p.id || p.i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <a href={`/profile?username=${encodeURIComponent(p.username || p.name)}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '50%', backgroundColor: p.bg, color: p.c, fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{p.i}</div>
                    </a>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={`/profile?username=${encodeURIComponent(p.username || p.name)}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#2a2463', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name || p.username}</div>
                        <div style={{ fontSize: '11px', color: C.faint, fontWeight: 600 }}>@{p.username || p.i.toLowerCase()}</div>
                      </a>
                    </div>
                    <button
                      onClick={() => handleFollowPerson(p.username || p.name)}
                      style={{
                        flexShrink: 0,
                        border: followingPeople[(p.username || p.name).toLowerCase()] ? '1.5px solid #dbdbdb' : 'none',
                        background: followingPeople[(p.username || p.name).toLowerCase()] ? '#fff' : G.brand,
                        color: followingPeople[(p.username || p.name).toLowerCase()] ? '#262626' : '#fff',
                        borderRadius: '8px', padding: '5px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap'
                      }}
                    >
                      {followingPeople[(p.username || p.name).toLowerCase()] ? 'Following' : '+ Follow'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <button onClick={() => setShowPhotoInput(true)} style={{ ...S.fab, bottom: isMobile ? '88px' : '28px', right: isMobile ? '16px' : '28px' }} aria-label="New post"><Plus size={26} /></button>
    </AppShell>
  );
}

/* ================= STYLES ================= */
const S = {
  wrap: { minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'Inter, -apple-system, sans-serif' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', backgroundColor: C.heading, color: '#fff', padding: '14px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', zIndex: 9999, boxShadow: STheme.cardHover },
  pageGrid: { display: 'grid', gridTemplateColumns: '1fr 320px', gap: '32px', alignItems: 'start', maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' },
  centerCol: { display: 'flex', flexDirection: 'column', gap: '24px' },
  rightWidgets: { display: 'flex', flexDirection: 'column', gap: '24px' },
  
  hero: { ...P.hero, borderRadius: '24px', padding: '36px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  heroKicker: { fontSize: '14px', color: C.accentSoft, fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' },
  heroTitle: { fontSize: '28px', fontWeight: 800, color: '#fff', margin: '0 0 12px', maxWidth: '480px', lineHeight: 1.3 },
  heroDate: { fontSize: '14px', color: C.accentSoft, fontWeight: 600 },
  
  card: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '28px', boxShadow: STheme.cardHover },
  
  avatarBlue: { width: '48px', height: '48px', borderRadius: '50%', background: G.brand, color: '#fff', fontWeight: 800, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  composerInput: { flex: 1, backgroundColor: C.bg, border: 'none', borderRadius: '16px', padding: '14px 20px', fontSize: '15px', color: C.text, outline: 'none', boxSizing: 'border-box' },
  photoPanel: { padding: '16px', backgroundColor: C.bg, borderRadius: '16px', border: `1px solid ${C.borderLight}`, marginBottom: '16px' },
  fileUploadBtn: { ...P.btnGhost, padding: '10px 16px', fontSize: '13px' },
  textInput: { flex: 1, backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 16px', fontSize: '14px', color: C.text, outline: 'none', boxSizing: 'border-box' },
  
  composerActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${C.borderLight}` },
  chip: { backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' },
  postBtn: { ...P.btn, padding: '10px 24px', fontSize: '14px' },
  
  postHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  roleTag: { fontSize: '11px', color: C.primary, backgroundColor: C.primarySoft, padding: '4px 10px', borderRadius: '8px', fontWeight: 700 },
  badgePurple: { display: 'inline-block', backgroundColor: C.accent, color: '#fff', fontSize: '11px', fontWeight: 800, padding: '4px 12px', borderRadius: '8px', marginBottom: '14px', letterSpacing: '0.5px', textTransform: 'uppercase' },
  postBody: { fontSize: '16px', color: C.text, lineHeight: 1.7, marginBottom: '20px', whiteSpace: 'pre-line' },
  media: { borderRadius: '16px', overflow: 'hidden', marginBottom: '20px', maxHeight: '500px', backgroundColor: C.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', border: `1px solid ${C.borderLight}` },
  mediaImg: { maxWidth: '100%', maxHeight: '500px', objectFit: 'contain', display: 'block' },
  
  actions: { display: 'flex', gap: '12px', paddingTop: '16px', borderTop: `1px solid ${C.borderLight}` },
  actionPill: { backgroundColor: C.bg, border: 'none', borderRadius: '12px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, color: C.muted, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', transition: 'all 0.2s ease' },
  
  widgetCard: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', padding: '24px', boxShadow: STheme.cardHover },
  widgetHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  widgetTitle: { fontSize: '16px', fontWeight: 800, color: C.heading },
  dateBox: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '42px', padding: '6px', borderRadius: '10px', backgroundColor: C.primarySoft },
  dateM: { fontSize: '11px', fontWeight: 800, color: C.primary, textTransform: 'uppercase' },
  dateD: { fontSize: '18px', fontWeight: 800, color: C.heading },
  
  fab: { position: 'fixed', bottom: '28px', right: '28px', width: '56px', height: '56px', borderRadius: '50%', backgroundColor: C.primary, color: '#fff', fontSize: '24px', border: 'none', cursor: 'pointer', boxShadow: STheme.glow, zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }
};