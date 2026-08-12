'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { Grid, Users, Mail, Pencil, Plus, UserPlus, UserCheck, Atom, Building2, Plug, Palette, Database, Crown, ArrowLeft, FolderUp, Save, MapPin, Lock, Camera, Image as ImageIcon, Check, User } from 'lucide-react';
import AppShell from '../../components/Appshell';
import useResponsive from '../../lib/useResponsive';
import { useSearchParams } from 'next/navigation';
import { C, G, S, P } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const API = `${API_URL}/jsonapi`;

async function recordActivityLog(message) {
  try {
    const existing = JSON.parse(localStorage.getItem('openserver_logs_v2') || '[]');
    existing.unshift({ id: Date.now(), message, timestamp: new Date().toISOString() });
    localStorage.setItem('openserver_logs_v2', JSON.stringify(existing.slice(0, 200)));
  } catch (e) { }

  try {
    const token = await getCsrfToken();
    await fetch(`${API}/activity/activity`, {
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
            field_activity_message: message,
            field_activity_output: message
          }
        }
      })
    });
  } catch (err) {
    console.error('Failed to post activity to Drupal:', err);
  }
}

const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#30cfd0,#330867)',
];

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';

function resolveAvatarUrl(json) {
  if (!json || !Array.isArray(json.included)) return null;
  for (const inc of json.included) {
    if (inc.type === 'file--file') {
      const uri = inc.attributes?.uri;
      let url = uri?.url;
      if (!url && uri?.value && uri.value.startsWith('public://')) {
        url = `${API.replace(/\/jsonapi$/, '')}${uri.value.slice('public://'.length)}`;
      }
      if (url) return url;
    }
  }
  return null;
}

function readText(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return v.value || '';
  return String(v);
}

function dataUrlToBlob(dataUrl) {
  try {
    const [meta, b64] = dataUrl.split(',');
    const mime = (meta.match(/data:(.*?);/) || [])[1] || 'image/png';
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch (e) {
    return null;
  }
}

// ✅ Detect old demo/fake posts so we can purge them
const isDemoPost = (p) =>
  p?.id === 'p1' ||
  p?.author === 'Sarah Johnson' ||
  p?.tag === 'ANNOUNCEMENT' ||
  (p?.id || '').startsWith('demo-');

const HIGHLIGHTS = [
  { label: 'React' }, { label: 'Architecture' },
  { label: 'APIs' }, { label: 'Design' },
  { label: 'Drupal' }, { label: 'Leadership' },
];

const skillIcon = {
  React: Atom,
  Architecture: Building2,
  APIs: Plug,
  Design: Palette,
  Drupal: Database,
  Leadership: Crown,
};

async function getCsrfToken() {
  const res = await fetch(`${API_URL}/session/token`, { credentials: 'include' });
  if (!res.ok) throw new Error('Could not get CSRF token');
  return (await res.text()).trim();
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const targetUsername = searchParams.get('username');

  let loggedInUsername = 'admin';
  try {
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
    if (savedUser) {
      const p = JSON.parse(savedUser);
      if (p?.name) loggedInUsername = p.name;
    }
  } catch (e) { }

  const isMe = !targetUsername || targetUsername.toLowerCase() === loggedInUsername.toLowerCase();
  const activeUsername = targetUsername || loggedInUsername;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');
  const [activeTab, setActiveTab] = useState('posts');
  const [showComposer, setShowComposer] = useState(false);
  const { isMobile } = useResponsive();

  const [name, setName] = useState('');
  const [role, setRole] = useState('Administrator');
  const [department, setDepartment] = useState('General');
  const [location, setLocation] = useState('Remote');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState(null);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [newPostText, setNewPostText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [postingLoading, setPostingLoading] = useState(false);
  const [myGroups, setMyGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [eventEnrollments, setEventEnrollments] = useState([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState(null);

  const API_ENDPOINT = `${API}/profile/profile`;
  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 3000); };
  const handle = (name || 'user').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '');
  const initials = (name || '?').substring(0, 2).toUpperCase();
  const isValidUuid = (v) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v || '');

  const fetchProfileFromAPI = async () => {
    setLoading(true);
    try {
      const url = `${API_URL}/profile_proxy_v3.php` + (activeUsername ? `?username=${encodeURIComponent(activeUsername)}` : '');
      const res = await fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } });
      if (res.ok) {
        const json = await res.json();
        if (json.data && json.data.length > 0) {
          const first = json.data[0];
          const attr = first.attributes || {};

          let savedAvatar = null;
          try {
            const sv = localStorage.getItem('openserver_user_profile_v2');
            if (sv) savedAvatar = JSON.parse(sv)?.avatar || null;
          } catch (e) { }

          let finalName =
            attr.field_display_name ||
            [attr.field_profile_first_name, attr.field_profile_last_name].filter(Boolean).join(' ') ||
            attr.profile_name ||
            activeUsername;
          if (!finalName || finalName.trim() === '') finalName = activeUsername;

          const mapped = {
            id: first.id,
            userUuid: attr.uid || 'prof-101',
            name: finalName,
            role: attr.field_job_title || attr.field_profile_function || 'Member',
            department: attr.field_department || attr.field_profile_organization || 'General',
            location: attr.field_location || attr.field_profile_location || 'Remote',
            bio: attr.field_bio || attr.field_profile_self_introduction || '',
            avatar: attr.field_user_avatar || attr.field_profile_image || savedAvatar || avatar || DEFAULT_AVATAR
          };
          setProfile(mapped); setName(mapped.name); setRole(mapped.role);
          setDepartment(mapped.department); setLocation(mapped.location);
          setBio(mapped.bio); if (mapped.avatar) setAvatar(mapped.avatar);

          fetchFollowData(mapped.userUuid);
          checkFollowStatus();
          setLoading(false); return;
        }
      }
    } catch (e) { }

    let fallbackName = activeUsername;
    let fallbackRole = 'Member';
    let fallbackAvatar = null;
    try {
      const savedList = localStorage.getItem('openserver_users_v2');
      if (savedList) {
        const usersList = JSON.parse(savedList);
        const matchedUser = usersList.find(u => u.name && u.name.toLowerCase() === activeUsername.toLowerCase());
        if (matchedUser) {
          fallbackName = matchedUser.name;
          fallbackRole = matchedUser.role || 'Member';
          fallbackAvatar = matchedUser.avatar;
        }
      }

      if (isMe) {
        const savedV2 = localStorage.getItem('openserver_user_profile_v2');
        if (savedV2) {
          const p = JSON.parse(savedV2);
          if (p?.name && p.name.trim() !== '') fallbackName = p.name;
          if (p?.role) fallbackRole = p.role;
          if (p?.avatar) fallbackAvatar = p.avatar;
        }
        const savedLogin = localStorage.getItem('openserver_user');
        if (savedLogin) {
          const l = JSON.parse(savedLogin);
          if (l?.avatar) fallbackAvatar = l.avatar;
        }
      }
    } catch (e) { }

    fallbackAvatar = fallbackAvatar || DEFAULT_AVATAR;

    // ✅ FIX: "currentUserUuid" was never defined → ReferenceError.
    // Safely resolve the current user's UUID from localStorage instead.
    let currentUserUuid = null;
    try {
      const savedLogin = localStorage.getItem('openserver_user');
      if (savedLogin) {
        const l = JSON.parse(savedLogin);
        currentUserUuid = l?.uuid || l?.userUuid || (isValidUuid(l?.id) ? l.id : null) || null;
      }
      if (!currentUserUuid) {
        const savedV2 = localStorage.getItem('openserver_user_profile_v2');
        if (savedV2) {
          const p = JSON.parse(savedV2);
          currentUserUuid = p?.userUuid || (isValidUuid(p?.id) ? p.id : null) || null;
        }
      }
    } catch (e) { }

    const def = { id: 'prof-101', userUuid: currentUserUuid || 'prof-101', name: fallbackName, role: fallbackRole, department: 'General', location: 'Remote', bio: '', avatar: fallbackAvatar };
    setProfile(def); setName(fallbackName); setRole(fallbackRole); setAvatar(fallbackAvatar);
    checkFollowStatus();
    setLoading(false);
  };

  const checkFollowStatus = () => {
    try {
      const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
      const myFollows = followsMap[loggedInUsername.toLowerCase()] || [];
      if (myFollows.length > 0) {
        setIsFollowing(myFollows.map(x => x.toLowerCase()).includes(activeUsername.toLowerCase()));
        return;
      }
      const savedList = localStorage.getItem('openserver_users_v2');
      if (savedList) {
        const usersList = JSON.parse(savedList);
        const matchedUser = usersList.find(u => u.name && u.name.toLowerCase() === activeUsername.toLowerCase());
        if (matchedUser) {
          setIsFollowing(!!matchedUser.isFollowing);
        }
      }
    } catch (e) { }
  };

  const fetchFollowData = async (userUuid) => {
    const headers = { Accept: 'application/vnd.api+json' };

    let drupalFollowers = 0;
    let drupalFollowing = 0;

    try {
      const res = await fetch(`${API}/flagging/follow_user?filter[flagged_entity.id]=${userUuid}`, { credentials: 'include', headers });
      if (res.ok) {
        const json = await res.json();
        drupalFollowers = (json.data || []).length || 0;
      }
    } catch (e) { }

    try {
      const res = await fetch(`${API}/flagging/follow_user?filter[uid.id]=${userUuid}`, { credentials: 'include', headers });
      if (res.ok) {
        const json = await res.json();
        drupalFollowing = (json.data || []).length || 0;
      }
    } catch (e) { }

    try {
      const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
      let localFollowers = 0;
      Object.keys(followsMap).forEach(follower => {
        const list = followsMap[follower] || [];
        if (list.map(x => x.toLowerCase()).includes(activeUsername.toLowerCase())) {
          localFollowers++;
        }
      });
      let localFollowing = (followsMap[activeUsername.toLowerCase()] || []).length;

      setFollowersCount(Math.max(drupalFollowers, localFollowers));
      setFollowingCount(Math.max(drupalFollowing, localFollowing));
    } catch (e) {
      setFollowersCount(drupalFollowers);
      setFollowingCount(drupalFollowing);
    }
  };

  const handleToggleFollowProfile = async () => {
    const targetUuid = profile?.userUuid || profile?.id || 'prof-101';
    const nextState = !isFollowing;

    try {
      const followsMap = JSON.parse(localStorage.getItem('openserver_follows_map') || '{}');
      let myFollows = followsMap[loggedInUsername.toLowerCase()] || [];
      if (nextState) {
        if (!myFollows.map(x => x.toLowerCase()).includes(activeUsername.toLowerCase())) {
          myFollows.push(activeUsername);
        }
      } else {
        myFollows = myFollows.filter(x => x.toLowerCase() !== activeUsername.toLowerCase());
      }
      followsMap[loggedInUsername.toLowerCase()] = myFollows;
      localStorage.setItem('openserver_follows_map', JSON.stringify(followsMap));
    } catch (e) { }

    try {
      const savedList = localStorage.getItem('openserver_users_v2');
      if (savedList) {
        const usersList = JSON.parse(savedList);
        const updated = usersList.map(u => u.name && u.name.toLowerCase() === activeUsername.toLowerCase() ? { ...u, isFollowing: nextState } : u);
        localStorage.setItem('openserver_users_v2', JSON.stringify(updated));
      }
    } catch (e) { }

    setIsFollowing(nextState);
    setFollowersCount((prev) => nextState ? prev + 1 : Math.max(0, prev - 1));

    if (nextState) {
      showToast(`You are now following ${name}!`);
      recordActivityLog(`user You started following ${name}`);
    } else {
      showToast(`Unfollowed ${name}`);
      recordActivityLog(`user You unfollowed ${name}`);
    }

    try {
      if (nextState) {
        const token = await getCsrfToken();
        const res = await fetch(`${API}/flagging/follow_user`, {
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
        if (res.ok) {
          const json = await res.json();
          if (json.data?.id) setFollowId(json.data.id);
        }
      } else {
        if (followId) {
          const token = await getCsrfToken();
          await fetch(`${API}/flagging/follow_user/${followId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Accept': 'application/vnd.api+json',
              'X-CSRF-Token': token
            }
          });
        }
      }
    } catch (err) {
      console.error('Follow toggle API failed:', err);
    }
  };

  const saveAvatarToDrupal = async (uuid) => {
    if (!uuid || !isValidUuid(uuid) || !avatar || !avatar.startsWith('data:')) return;
    try {
      const token = await getCsrfToken();
      const blob = dataUrlToBlob(avatar);
      if (!blob) return;
      const filename = `avatar-${Date.now()}.png`;

      let fileId = null;
      const uploadEndpoints = [
        `${API}/media/image/field_media_image`,
        `${API}/profile/profile/field_user_avatar`,
        `${API}/profile/profile/field_profile_image`
      ];
      for (const ep of uploadEndpoints) {
        try {
          const upRes = await fetch(ep, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Accept': 'application/vnd.api+json',
              'Content-Type': 'application/octet-stream',
              'Content-Disposition': `file; filename="${filename}"`,
              'X-CSRF-Token': token
            },
            body: blob
          });
          if (upRes.ok) {
            const uj = await upRes.json();
            fileId = uj?.data?.id || null;
            if (fileId) break;
          }
        } catch (e) { }
      }
      if (!fileId) return;

      let mediaId = null;
      try {
        const mRes = await fetch(`${API}/media/image`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/vnd.api+json', 'Accept': 'application/vnd.api+json', 'X-CSRF-Token': token },
          body: JSON.stringify({
            data: {
              type: 'media--image',
              attributes: { name: filename },
              relationships: { field_media_image: { data: { type: 'file--file', id: fileId } } }
            }
          })
        });
        if (mRes.ok) {
          const mj = await mRes.json();
          mediaId = mj?.data?.id || null;
        }
      } catch (e) { }

      const jsonHeaders = { 'Content-Type': 'application/vnd.api+json', 'Accept': 'application/vnd.api+json', 'X-CSRF-Token': token };
      const attach = async (rel, type, id) => {
        try {
          const pRes = await fetch(`${API_ENDPOINT}/${uuid}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: jsonHeaders,
            body: JSON.stringify({ data: { type: 'profile--profile', id: uuid, relationships: { [rel]: { data: { type, id } } } } })
          });
          return pRes.ok;
        } catch (e) { return false; }
      };

      for (const rel of ['field_user_avatar', 'field_profile_image']) {
        if (mediaId && (await attach(rel, 'media--image', mediaId))) return;
        if (await attach(rel, 'file--file', fileId)) return;
      }
    } catch (err) {
      console.error('Avatar upload to Drupal failed:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();

    let uuid = isValidUuid(profile?.id) ? profile.id : null;
    let userUuid = isValidUuid(profile?.userUuid) ? profile.userUuid : null;

    if (!userUuid) {
      try {
        const userRes = await fetch(`${API}/user/user?filter[name]=${encodeURIComponent(activeUsername)}`, { credentials: 'include', headers: { Accept: 'application/vnd.api+json' } });
        if (userRes.ok) {
          const uj = await userRes.json();
          if (uj.data && uj.data[0]) userUuid = uj.data[0].id;
        }
      } catch (err) { }
    }

    let token = null;
    try { token = await getCsrfToken(); } catch (err) { }

    const headers = {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json',
      ...(token ? { 'X-CSRF-Token': token } : {})
    };

    const [firstName, ...restName] = (name.trim() || activeUsername).split(/\s+/);
    const lastName = restName.join(' ');

    let attrs = {
      field_display_name: name.trim(),
      field_profile_first_name: firstName,
      ...(lastName ? { field_profile_last_name: lastName } : {}),
      field_job_title: role.trim(),
      field_profile_function: role.trim(),
      field_department: department.trim(),
      field_profile_organization: department.trim(),
      field_location: location.trim(),
      field_profile_location: location.trim(),
      field_bio: { value: bio.trim() },
      field_profile_self_introduction: { value: bio.trim() },
    };

    const doRequest = (attributes) => fetch(`${API_URL}/profile_proxy_v3.php`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        data: {
          type: 'profile--profile',
          attributes
        }
      })
    });

    try {
      const res = await doRequest(attrs);
      if (!res.ok) {
        const lastErrorText = await res.text();
        console.error('Profile save failed:', res?.status, lastErrorText);
        let msg = `Update failed (Status: ${res?.status})`;
        try {
          const ej = JSON.parse(lastErrorText);
          if (ej?.message) msg = ej.message;
        } catch (err) { }
        showToast(msg);
        return;
      }

      try {
        const saved = await res.json();
        if (saved?.id) uuid = saved.id;
      } catch (err) { }

      if (avatar && avatar.startsWith('data:')) {
        await saveAvatarToDrupal(uuid);
      }

      showToast('Profile saved!');
    } catch (err) {
      console.error('Error updating profile:', err);
      showToast('Network error during update');
      return;
    }

    const updated = { ...profile, id: uuid || profile?.id, userUuid: userUuid || profile?.userUuid, name: name.trim(), role: role.trim(), department: department.trim(), location: location.trim(), bio: bio.trim(), avatar };
    setProfile(updated);
    try { localStorage.setItem('openserver_user_profile_v2', JSON.stringify(updated)); } catch (e) { }
    recordActivityLog(`edit Profile updated for ${name.trim()}`);
    setActiveTab('posts');
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => { setAvatar(ev.target.result); showToast(`Uploaded! Press Submit to save`); };
      reader.readAsDataURL(file);
    }
  };

  /* ✅ FIXED: loadPosts now loads REAL images from Drupal */
  const loadPosts = async () => {
    setPostsLoading(true);
    try {
      const [postRes, photoRes] = await Promise.all([
        fetch(`${API}/post/post?include=user_id&sort=-created&page[limit]=50`, { credentials: 'include', headers: { Accept: 'application/vnd.api+json' } })
          .then(r => r.ok ? r.json() : null).catch(() => null),
        fetch(`${API}/post/photo?include=user_id,field_post_image&sort=-created&page[limit]=50`, { credentials: 'include', headers: { Accept: 'application/vnd.api+json' } })
          .then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      let all = [];
      let usersMap = {};
      let filesMap = {};

      // ✅ Prefer the locally-saved author/image for posts created in this
      // browser so they show on the right profile even if Drupal attributes
      // them to a stale session (e.g. admin).
      let localById = {};
      try {
        const savedPosts = localStorage.getItem('openserver_posts_v2');
        if (savedPosts) {
          JSON.parse(savedPosts).forEach((lp) => { if (lp && lp.id && !isDemoPost(lp)) localById[lp.id] = lp; });
        }
      } catch (e) { }

      const processJson = (json) => {
        if (json.included) {
          json.included.forEach(inc => {
            if (inc.type === 'user--user') {
              usersMap[inc.id] = inc.attributes?.display_name || inc.attributes?.name || 'Community Member';
            }
            // ✅ Collect real uploaded file URLs
            if (inc.type === 'file--file') {
              let url = inc.attributes?.uri?.url || '';
              if (url) {
                if (url.startsWith('/system/files/') || url.startsWith('/sites/default/files/styles/')) url = '/index.php' + url;
                filesMap[inc.id] = url.startsWith('http') ? url : `${API_URL}${url}`;
              }
            }
          });
        }
        if (json.data) {
          all = [...all, ...json.data.map(p => {
            const localPost = localById[p.id];
            const uid = p.relationships?.user_id?.data?.id;
            const authorName = localPost?.author || (uid ? usersMap[uid] : (p.attributes?.field_author_name || 'Community Member'));

            // ✅ Resolve the REAL images (no more demo Unsplash image)
            let postImg = null;
            let postImgs = [];
            if (p.type === 'post--photo') {
              const fileRel = p.relationships?.field_post_image?.data;
              const fileIds = Array.isArray(fileRel) ? fileRel.map(r => r?.id).filter(Boolean) : (fileRel?.id ? [fileRel.id] : []);
              postImgs = fileIds.map(fid => filesMap[fid]).filter(Boolean);
              postImg = postImgs[0] || null;
            }

            return {
              id: p.id,
              text: p.attributes?.field_post?.value || p.attributes?.body?.value || '(no text)',
              created: p.attributes?.created,
              author: authorName,
              userId: uid,
              image: localPost?.image || postImg,
              images: (localPost?.images?.length ? localPost.images : postImgs)
            };
          })];
        }
      };

      if (postRes) processJson(postRes);
      if (photoRes) processJson(photoRes);

      // Merge local posts (skip demo ones)
      try {
        const savedPosts = localStorage.getItem('openserver_posts_v2');
        if (savedPosts) {
          JSON.parse(savedPosts).forEach((lp) => {
            if (isDemoPost(lp)) return; // skip demo
            if (!all.some((ap) => ap.id === lp.id)) {
              let createdTime = new Date().toISOString();
              if (lp.id && lp.id.startsWith('p-')) {
                const ts = parseInt(lp.id.split('-')[1]);
                if (!isNaN(ts)) createdTime = new Date(ts).toISOString();
              }
              all.push({
                id: lp.id,
                text: lp.content || '',
                created: createdTime,
                author: lp.author,
                userId: lp.userId || null,
                image: lp.image || null,
                images: lp.images?.length ? lp.images : (lp.image ? [lp.image] : [])
              });
            }
          });
        }
      } catch (e) { }

      all = all.filter((p) => {
        if (!p.author) return false;
        const authorLower = p.author.toLowerCase();
        const activeLower = activeUsername.toLowerCase();
        const nameLower = name.toLowerCase();
        if (profile?.userUuid && p.userId && p.userId === profile.userUuid) {
          return true;
        }
        return authorLower === activeLower || authorLower === nameLower;
      });
      all.sort((a, b) => new Date(b.created) - new Date(a.created));

      setPosts(all);
    } catch (e) {
      // Backend offline: still show this user's locally-saved posts.
      try {
        const localOnly = JSON.parse(localStorage.getItem('openserver_posts_v2') || '[]')
          .filter(p => {
            if (!p.author) return false;
            const authorLower = p.author.toLowerCase();
            const activeLower = activeUsername.toLowerCase();
            const nameLower = name.toLowerCase();
            if (profile?.userUuid && p.userId && p.userId === profile.userUuid) {
              return true;
            }
            return authorLower === activeLower || authorLower === nameLower;
          })
          .map(p => ({
            id: p.id,
            text: p.content || '',
            created: p.created || new Date().toISOString(),
            author: p.author,
            image: p.image || null,
            images: p.images?.length ? p.images : (p.image ? [p.image] : [])
          }));
        setPosts(localOnly);
      } catch (err) { setPosts([]); }
    }
    finally { setPostsLoading(false); }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    const postText = newPostText.trim();
    if (!postText && selectedFiles.length === 0) return;
    setPostingLoading(true);

    const tempId = 'p-' + Date.now();

    const localImages = [];
    if (selectedFiles.length > 0) {
      for (const file of selectedFiles) {
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
        if (dataUrl) localImages.push(dataUrl);
      }
    }

    // ✅ Optimistic local save FIRST so the post shows on the profile (and
    // home feed) even if the backend is offline. Sync to Drupal afterwards.
    const localPost = {
      id: tempId,
      author: activeUsername,
      role: role || 'Member',
      tag: 'NEW',
      initials: (activeUsername || '?').substring(0, 2).toUpperCase(),
      time: 'Just now',
      content: postText,
      image: localImages[0] || null,
      images: localImages,
      userReaction: null,
      visibility: '1',
      likesCount: 0, dislikesCount: 0, lovesCount: 0, commentsCount: 0, comments: []
    };

    try {
      if (typeof window !== 'undefined') {
        const savedPosts = JSON.parse(localStorage.getItem('openserver_posts_v2') || '[]');
        localStorage.setItem('openserver_posts_v2', JSON.stringify([localPost, ...savedPosts.filter(p => !isDemoPost(p))]));
      }
    } catch (e) { }

    setPosts((prev) => [localPost, ...prev]);
    setNewPostText(''); setSelectedFiles([]); setShowComposer(false);
    showToast('Post shared!');
    recordActivityLog(`edit ${name} published a new post`);

    try {
      const token = await getCsrfToken();
      const fileIds = [];

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const fileRes = await fetch(`${API}/post/photo/field_post_image`, {
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
            field_post: { value: postText || 'Shared an image', format: 'basic_html' },
            field_visibility: '1'
          }
        }
      };

      if (isPhoto) {
        body.data.relationships = {
          field_post_image: { data: fileIds.map(id => ({ type: 'file--file', id })) }
        };
      }

      const res = await fetch(`${API}/post/${isPhoto ? 'photo' : 'post'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json', 'X-CSRF-Token': token },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const createdJson = await res.json().catch(() => null);
        const realId = createdJson?.data?.id;
        const realType = createdJson?.data?.type;
        if (realId) {
          const replaceId = (list) => list.map(p => p.id === tempId ? { ...p, id: realId, apiType: realType } : p);
          setPosts(replaceId);
          try {
            if (typeof window !== 'undefined') {
              const savedPosts = JSON.parse(localStorage.getItem('openserver_posts_v2') || '[]');
              localStorage.setItem('openserver_posts_v2', JSON.stringify(replaceId(savedPosts).filter(p => !isDemoPost(p))));
            }
          } catch (e) { }
        }
      } else {
        showToast('Backend rejected: post saved locally only.');
      }
    } catch (err) {
      showToast('Backend offline: post saved locally only.');
    }
    finally { setPostingLoading(false); }
  };

  const GROUP_BUNDLES = ['open_group', 'public_group', 'closed_group', 'flexible_group', 'secret_group'];
  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      const results = await Promise.all(GROUP_BUNDLES.map((bundle) =>
        fetch(`${API}/group/${bundle}?sort=-created&page[limit]=10`, { headers: { Accept: 'application/vnd.api+json' } })
          .then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] }))
      ));
      setAllGroups(results.flatMap((json, i) =>
        (json.data || []).map((g) => ({ id: g.id, bundle: GROUP_BUNDLES[i], label: g.attributes?.label || g.attributes?.title || 'Untitled' }))
      ));
    } catch (e) { setAllGroups([]); }
    finally { setGroupsLoading(false); }
  };

  const handleJoinGroup = async (group) => {
    try {
      const token = await getCsrfToken();
      const res = await fetch(`${API}/group_content/${group.bundle}-group_membership`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'X-CSRF-Token': token
        },
        body: JSON.stringify({ data: { type: `group_content--${group.bundle}-group_membership`, relationships: { gid: { data: { type: `group--${group.bundle}`, id: group.id } } } } })
      });
      if (res.ok) {
        showToast(`Joined "${group.label}"`);
        recordActivityLog(`users ${name} joined group "${group.label}"`);
        setMyGroups((prev) => [...prev, group]);
      } else showToast(`Join failed (${res.status})`);
    } catch (e) { showToast('Network error'); }
  };

  const loadInvitations = async () => {
    setInvitationsLoading(true);
    try {
      const invResults = await Promise.all(GROUP_BUNDLES.map((bundle) =>
        fetch(`${API}/group_content/${bundle}-group_invitation?page[limit]=10`, { headers: { Accept: 'application/vnd.api+json' } })
          .then((r) => (r.ok ? r.json() : { data: [] })).catch(() => ({ data: [] }))
      ));
      setInvitations(invResults.flatMap((json, i) =>
        (json.data || []).map((inv) => ({ id: inv.id, bundle: GROUP_BUNDLES[i], status: 'Pending' }))
      ));
      const evRes = await fetch(`${API}/event_enrollment/event_enrollment?page[limit]=10`, { headers: { Accept: 'application/vnd.api+json' } });
      if (evRes.ok) {
        const evJson = await evRes.json();
        setEventEnrollments((evJson.data || []).map((e) => ({ id: e.id, status: e.attributes?.field_enrollment_status ?? 'Pending' })));
      } else setEventEnrollments([]);
    } catch (e) { setInvitations([]); setEventEnrollments([]); }
    finally { setInvitationsLoading(false); }
  };

  const handleInvitationResponse = async (invitationId, bundle, accept) => {
    try {
      const token = await getCsrfToken();
      const res = await fetch(`${API}/group_content/${bundle}-group_invitation/${invitationId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
          'X-CSRF-Token': token
        },
        body: JSON.stringify({ data: { type: `group_content--${bundle}-group_invitation`, id: invitationId, attributes: { field_invitation_status: accept ? 'accepted' : 'declined' } } })
      });
      if (res.ok) {
        showToast(accept ? 'Accepted' : 'Declined');
        recordActivityLog(`mail ${name} ${accept ? 'accepted' : 'declined'} a group invitation`);
        setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      } else showToast(`Could not update (${res.status})`);
    } catch (e) { showToast('Network error'); }
  };

  useEffect(() => {
    setPosts([]);
    setAllGroups([]);
    setInvitations([]);
    fetchProfileFromAPI();
  }, [activeUsername]);

  useEffect(() => {
    if (activeTab === 'posts') loadPosts();
    if (activeTab === 'groups') loadGroups();
    if (activeTab === 'invitations') loadInvitations();
  }, [activeTab, activeUsername, profile?.userUuid, name]);

  const btn = { backgroundColor: '#efefef', color: '#262626', border: 'none', borderRadius: '8px', padding: '7px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const btnBlue = { ...P.btn, padding: '7px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' };
  const input = { width: '100%', backgroundColor: '#fafafa', border: '1px solid #dbdbdb', borderRadius: '8px', padding: '9px 12px', fontSize: '14px', color: '#262626', outline: 'none', boxSizing: 'border-box' };
  const label = { display: 'block', fontSize: '12px', fontWeight: 700, color: '#8e8e8e', marginBottom: '6px' };

  const tabBtn = (key, IconCmp, lab) => (
    <button onClick={() => setActiveTab(key)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '14px 4px', marginTop: '-1px', border: 'none', borderTop: activeTab === key ? '2px solid transparent' : '2px solid transparent', borderImage: activeTab === key ? `${G.brand} 1` : 'none', backgroundColor: 'transparent', color: activeTab === key ? '#262626' : '#8e8e8e', fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer' }}>
      <IconCmp size={14} /> {lab}
    </button>
  );

  return (
    <AppShell>
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', backgroundColor: '#262626', color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>{toastMsg}</div>
      )}

      <div style={{ maxWidth: 935, margin: '0 auto', padding: '30px 20px', display: 'flex', flexDirection: 'column', gap: '28px', color: '#262626' }}>

        {!isMe && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: C.primarySoft, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '14px 18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
              {avatar ? (
                <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: G.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 800 }}>{initials}</div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#5b21b6', display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Viewing {name}'s Profile</div>
              <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '2px' }}>@{handle} • {role}</div>
            </div>
            <button
              onClick={() => window.history.back()}
              style={{ backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, color: '#5b21b6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            ><ArrowLeft size={16} /> Back</button>
          </div>
        )}

        {activeTab === 'edit' ? (
          <form onSubmit={handleSaveProfile} style={{ maxWidth: 600, margin: '0 auto', width: '100%', backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '28px', boxShadow: S.card, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
              {avatar ? (
                <img src={avatar} alt={name} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#6d28d9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 800 }}>{initials}</div>
              )}
              <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: C.heading }}>Edit Profile</div>
                <div style={{ fontSize: '13px', color: '#8e8e8e' }}>@{handle}</div>
              </div>
            </div>
            <div><label style={label}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} style={input} required /></div>
            <div><label style={label}>Role / Job Title</label><input value={role} onChange={(e) => setRole(e.target.value)} style={input} /></div>
            <div><label style={label}>Department</label><input value={department} onChange={(e) => setDepartment(e.target.value)} style={input} /></div>
            <div><label style={label}>Location</label><input value={location} onChange={(e) => setLocation(e.target.value)} style={input} /></div>
            <div><label style={label}>Bio</label><textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} style={{ ...input, fontFamily: 'inherit' }} /></div>
            <div>
              <label style={label}>Avatar</label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ ...btn, cursor: 'pointer', marginBottom: 0 }}><FolderUp size={14} /> Upload<input type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} /></label>
                <input value={avatar} onChange={(e) => setAvatar(e.target.value)} style={{ ...input, flex: 1 }} placeholder="or paste image URL" />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button type="submit" style={btnBlue}><Save size={14} /> Submit</button>
              <button type="button" onClick={() => setActiveTab('posts')} style={btn}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
            {/* Professional Header */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '20px' : '80px', padding: isMobile ? '20px 0' : '40px 20px', alignItems: isMobile ? 'flex-start' : 'center', borderBottom: `1px solid ${C.borderLight}` }}>
              <div style={{ width: isMobile ? 80 : 150, height: isMobile ? 80 : 150, borderRadius: '50%', flexShrink: 0, overflow: 'hidden', backgroundColor: '#fafafa', border: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {avatar ? (
                  <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: G.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? '32px' : '56px', fontWeight: 800 }}>{initials}</div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '20px', fontWeight: 400, margin: 0, color: '#262626' }}>{handle}</h1>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {!isMe && (
                      <button onClick={handleToggleFollowProfile} style={{ ...(isFollowing ? btn : btnBlue), padding: '6px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '14px', fontWeight: 600, borderRadius: '4px' }}>
                        {isFollowing ? <UserCheck size={16} /> : <UserPlus size={16} />}
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                    {isMe && (
                      <button onClick={() => setActiveTab('edit')} style={{ backgroundColor: '#efefef', color: '#262626', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Pencil size={16} /> Edit Profile
                      </button>
                    )}
                  </div>
                </div>

                {!isMobile && (
                  <div style={{ display: 'flex', gap: '40px', fontSize: '16px', color: '#262626' }}>
                    <span><strong style={{ fontWeight: 600 }}>{posts.length}</strong> posts</span>
                    <span><strong style={{ fontWeight: 600 }}>{followersCount}</strong> followers</span>
                    <span><strong style={{ fontWeight: 600 }}>{followingCount}</strong> following</span>
                  </div>
                )}

                <div style={{ fontSize: '14px', color: '#262626', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ fontWeight: 600, fontSize: '16px', color: '#262626' }}>{name}</div>
                  <div style={{ color: '#8e8e8e', fontWeight: 400 }}>{role} • {department} • {location}</div>
                  {bio && <div style={{ whiteSpace: 'pre-wrap', lineHeight: '20px', marginTop: '4px', fontWeight: 400, color: '#262626' }}>{bio}</div>}
                </div>
              </div>
            </div>

            {/* Mobile Stats Row */}
            {isMobile && (
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '12px 0', borderBottom: `1px solid ${C.borderLight}`, fontSize: '14px', color: C.muted, textAlign: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: C.heading }}>{posts.length}</strong> posts</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: C.heading }}>{followersCount}</strong> followers</div>
                <div style={{ display: 'flex', flexDirection: 'column' }}><strong style={{ color: C.heading }}>{followingCount}</strong> following</div>
              </div>
            )}


            {/* Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '60px', borderTop: `1px solid ${C.borderLight}` }}>
              <button onClick={() => setActiveTab('posts')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '16px 0', border: 'none', borderTop: activeTab === 'posts' ? `1px solid ${C.heading}` : '1px solid transparent', backgroundColor: 'transparent', color: activeTab === 'posts' ? C.heading : C.muted, fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', marginTop: '-1px' }}>
                <Grid size={14} /> POSTS
              </button>
              <button onClick={() => setActiveTab('groups')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '16px 0', border: 'none', borderTop: activeTab === 'groups' ? `1px solid ${C.heading}` : '1px solid transparent', backgroundColor: 'transparent', color: activeTab === 'groups' ? C.heading : C.muted, fontSize: '12px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', cursor: 'pointer', marginTop: '-1px' }}>
                <Users size={14} /> GROUPS
              </button>
            </div>

            {activeTab === 'posts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {!isMe && !isFollowing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', border: `1px solid ${C.border}`, borderRadius: '24px', backgroundColor: C.card, textAlign: 'center', boxShadow: S.card }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: C.primarySoft, color: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '20px' }}>
                      <Lock size={32} />
                    </div>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px 0', color: C.heading }}>This Professional Profile is Private</h2>
                    <p style={{ fontSize: '15px', color: C.muted, margin: 0, maxWidth: '320px', lineHeight: '1.6' }}>Connect with this member to view their timeline, publications, and professional updates.</p>
                  </div>
                ) : (
                  <>
                    {/* Composer */}
                    {(isMe || showComposer) && (
                      <form onSubmit={handleCreatePost} style={{ border: `1px solid ${C.border}`, borderRadius: '24px', padding: '24px', backgroundColor: C.card, boxShadow: S.cardHover, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                          {avatar ? (
                            <img src={avatar} alt={name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: `1px solid ${C.borderLight}` }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: G.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 800 }}>{initials}</div>
                          )}
                          <textarea
                            value={newPostText}
                            onChange={(e) => setNewPostText(e.target.value)}
                            placeholder="Share an update, publication, or thought..."
                            style={{ flex: 1, border: 'none', outline: 'none', fontSize: '16px', backgroundColor: 'transparent', color: C.text, resize: 'none', minHeight: '60px', fontFamily: 'inherit', paddingTop: '12px' }}
                          />
                        </div>
                        {selectedFiles.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', paddingLeft: '64px' }}>
                            {selectedFiles.map((file, idx) => (
                              <div key={idx} style={{ fontSize: '13px', color: C.primary, display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, backgroundColor: C.primarySoft, borderRadius: '6px', padding: '4px 8px' }}>
                                <Camera size={14} /> {file.name}
                                <button
                                  type="button"
                                  onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', fontSize: '14px', fontWeight: 800, lineHeight: 1 }}
                                  aria-label="Remove file"
                                >×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '64px', borderTop: `1px solid ${C.borderLight}`, paddingTop: '16px' }}>
                          <label style={{ fontSize: '18px', cursor: 'pointer', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px', color: C.muted, fontWeight: 700 }}>
                            <span style={{ padding: '10px', borderRadius: '50%', backgroundColor: C.primarySoft, color: C.primary, display: 'flex' }}><ImageIcon size={18} /></span>
                            <span style={{ fontSize: '14px' }}>Attach Media (multi)</span>
                            <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) setSelectedFiles(prev => [...prev, ...files]); e.target.value = ''; }} />
                          </label>
                          <button type="submit" disabled={postingLoading || (!newPostText.trim() && selectedFiles.length === 0)} style={{ ...btnBlue, padding: '12px 24px', opacity: (postingLoading || (!newPostText.trim() && selectedFiles.length === 0)) ? 0.6 : 1, fontSize: '14px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            {postingLoading ? 'Publishing...' : <><Atom size={16} /> Publish Post</>}
                          </button>
                        </div>
                      </form>
                    )}
                    {postsLoading && <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '14px', padding: '30px 0' }}>Loading posts…</div>}
                    {!postsLoading && posts.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '50px 0', color: '#262626' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}><Camera size={40} /></div>
                        <div style={{ fontSize: '20px', fontWeight: 700, color: C.heading }}>Share your first post</div>
                        <div style={{ color: '#8e8e8e', fontSize: '13px', marginTop: '4px' }}>Click "New Post" above to publish an update.</div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: '4px' }}>
                      {posts.map((p, i) => (
                        <div key={p.id} style={{
                          aspectRatio: '1 / 1',
                          background: (p.images?.[0] || p.image) ? `url(${p.images?.[0] || p.image}) center/cover no-repeat` : GRADIENTS[i % GRADIENTS.length],
                          borderRadius: '4px',
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '18px',
                          cursor: 'pointer'
                        }}>
                          {!(p.images?.[0] || p.image) && <p style={{ color: '#fff', fontSize: '13px', fontWeight: 600, textAlign: 'center', margin: 0, display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.text}</p>}
                          {p.created && <span style={{ position: 'absolute', bottom: '8px', right: '10px', color: '#fff', fontSize: '10px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{new Date(p.created).toLocaleDateString()}</span>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'groups' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {groupsLoading && <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '14px', padding: '30px 0' }}>Loading groups…</div>}
                {!groupsLoading && allGroups.length === 0 && <div style={{ textAlign: 'center', color: '#8e8e8e', fontSize: '14px', padding: '30px 0' }}>No groups found.</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '14px' }}>
                  {allGroups.map((g, i) => {
                    const joined = myGroups.some((mg) => mg.id === g.id);
                    return (
                      <div key={g.id} style={{ border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px 16px', backgroundColor: C.card, boxShadow: S.card, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{ width: 62, height: 62, borderRadius: '50%', background: GRADIENTS[i % GRADIENTS.length], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800 }}>{(g.label || '?')[0].toUpperCase()}</div>
                        <div style={{ fontWeight: 700, fontSize: '14px', color: C.heading }}>{g.label}</div>
                        <div style={{ fontSize: '12px', color: '#8e8e8e', textTransform: 'capitalize' }}>{g.bundle.replace('_', ' ')} group</div>
                        <button onClick={() => handleJoinGroup(g)} disabled={joined} style={{ ...(joined ? btn : btnBlue), width: '100%', justifyContent: 'center', marginTop: '6px' }}>{joined ? <><Check size={14} /> Joined</> : 'Join'}</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', color: '#262626' }}>Loading Profile...</div>}>
      <ProfileContent />
    </Suspense>
  );
}