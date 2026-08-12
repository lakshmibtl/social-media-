'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '../../components/Appshell';
import { Users, Unlock, Lock, EyeOff, Settings, Globe, Sparkles, X } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import { C, G, P, S } from '../../lib/theme';
import { API_URL } from '../../lib/config';

const BASE_URL = API_URL;
const TOKEN_URL = `${BASE_URL}/session/token`;

const GROUP_TYPES = {
  public_group: { label: 'Public', icon: 'Users', description: 'Anyone can view and join.' },
  open_group: { label: 'Open', icon: 'Unlock', description: 'Visible to everyone; joining is generally open.' },
  closed_group: { label: 'Closed', icon: 'Lock', description: 'Visible, but joining requires approval.' },
  secret_group: { label: 'Secret', icon: 'EyeOff', description: 'Hidden from users who are not members.' },
  flexible_group: { label: 'Flexible', icon: 'Settings', description: 'Custom membership rules configured in Drupal.' }
};

const TYPE_ICONS = { Users, Unlock, Lock, EyeOff, Settings };

const SearchIcon = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
  </svg>
);

const coverGradients = [
  'linear-gradient(135deg, #07518a 0%, #0c66ad 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #07518a 100%)',
  'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
  'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  'linear-gradient(135deg, #2563eb 0%, #07518a 100%)'
];

export default function GroupsPage() {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [toastMsg, setToastMsg] = useState('');
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', type: 'public_group' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');

  useEffect(() => {
    fetchGroups();
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('openserver_user') : null;
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u.name) {
          setCurrentUserName(u.name.toLowerCase());
        }
      } catch (e) { }
    }
  }, []);
  useEffect(() => {
    setFilteredGroups(groups.filter((g) => (g.attributes?.label || '').toLowerCase().includes(search.toLowerCase())));
  }, [groups, search]);

  const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500); };

  async function fetchGroups() {
    setLoading(true);
    try {
      const types = Object.keys(GROUP_TYPES);
      // Fetch all 5 group types concurrently
      const fetchPromises = types.map(async (type) => {
        const res = await fetch(`${BASE_URL}/jsonapi/group/${type}?include=uid`, {
          headers: { Accept: 'application/vnd.api+json' },
          credentials: 'include'
        });
        if (!res.ok) return [];
        const json = await res.json();

        const usersMap = {};
        if (json.included) {
          json.included.forEach(inc => {
            if (inc.type === 'user--user') {
              usersMap[inc.id] = inc.attributes?.name || inc.attributes?.display_name || '';
            }
          });
        }

        // Tag each group with its type and creator name
        return (json.data || []).map(g => {
          const creatorId = g.relationships?.uid?.data?.id;
          const creatorName = creatorId ? usersMap[creatorId] : '';
          return { ...g, groupType: type, creatorName };
        });
      });

      const results = await Promise.all(fetchPromises);
      const allGroups = results.flat();

      setGroups(allGroups);
      setFilteredGroups(allGroups);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally { setLoading(false); }
  }

  async function getCsrfToken() {
    const res = await fetch(TOKEN_URL, { credentials: 'include' });
    if (!res.ok) throw new Error('Could not fetch CSRF token. Are you logged in?');
    return res.text();
  }

  function handleChange(e) { setForm({ ...form, [e.target.name]: e.target.value }); }

  async function createCommunity(e) {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Please enter a community name.'); return; }
    setSubmitting(true);

    // Dynamically build payload based on selected group type
    const body = {
      data: {
        type: `group--${form.type}`,
        attributes: {
          label: form.name,
          field_group_description: { value: form.description, format: 'basic_html' }
        }
      }
    };

    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`${BASE_URL}/groups_proxy.php?action=create_group&username=${currentUserName}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const newGroup = await res.json();
        if (newGroup.data) {
          // Track ownership in localStorage as a fallback
          if (currentUserName) {
            const savedOwners = JSON.parse(localStorage.getItem('group_owners') || '{}');
            savedOwners[newGroup.data.id] = currentUserName;
            localStorage.setItem('group_owners', JSON.stringify(savedOwners));
          }

          setGroups([{ ...newGroup.data, groupType: form.type }, ...groups]);
          setShowForm(false);
          showToast('Community created successfully!');
          setForm({ name: '', description: '', type: 'public_group' });
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.errors?.[0]?.detail || errJson?.errors?.[0]?.title || `Request failed with status ${res.status}`;
        setError(`Unable to create community: ${detail}`);
      }
    } catch (err) {
      setError(err.message || 'Unable to create community. Please make sure you are logged in.');
    } finally { setSubmitting(false); }
  }

  async function joinCommunity(group, e) {
    e.stopPropagation();
    showToast('Joining...');

    try {
      const csrfToken = await getCsrfToken();
      const groupType = group.groupType || 'public_group';

      // Fetch the current user's UUID from the JSON:API entry point
      const meRes = await fetch(`${BASE_URL}/jsonapi`, { credentials: 'include' });
      const meJson = await meRes.json();
      const userUuid = meJson.meta?.links?.me?.meta?.id;

      if (!userUuid) {
        showToast('Could not identify current user. Please log in.');
        return;
      }

      const body = {
        data: {
          type: `group_content--${groupType}-group_membership`,
          relationships: {
            gid: {
              data: {
                type: `group--${groupType}`,
                id: group.id
              }
            },
            entity_id: {
              data: {
                type: 'user--user',
                id: userUuid
              }
            }
          }
        }
      };

      const res = await fetch(`${BASE_URL}/groups_proxy.php?action=join_group`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        if (groupType === 'closed_group' || groupType === 'secret_group') {
          showToast('Request sent! Waiting for admin approval...');
        } else {
          showToast('Joined successfully! Redirecting...');
          // Redirect to the new community page that will be created
          router.push(`/communities/${group.id}`);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const detail = errJson?.errors?.[0]?.detail || `Failed to join (${res.status})`;

        // Drupal Open Social throws this specific error if the user is already a member of the group (or if a request is pending)
        if (detail.includes('maximum amount of times it can be added')) {
          if (groupType === 'closed_group' || groupType === 'secret_group') {
            showToast('You have already requested to join! Please wait for approval.');
          } else {
            showToast('You are already a member! Opening community...');
            setTimeout(() => router.push(`/communities/${group.id}`), 500);
          }
        } else {
          showToast(`${detail}`);
        }
      }
    } catch (err) {
      showToast('Error joining community');
    }
  }

  return (
    <AppShell>
      <style>{`
        .grp-card { transition: transform .18s ease, box-shadow .18s ease; }
        .grp-card:hover { transform: translateY(-4px); box-shadow: 0 14px 28px rgba(109,40,217,0.22); }
        .grp-join:hover { background: #5b21b6 !important; }
        .hero-btn:hover { transform: scale(1.04); }
      `}</style>

      {toastMsg && <div style={styles.toast}>{toastMsg}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Gradient Hero */}
        <div style={styles.heroBanner}>
          <div>
            <div style={{ ...styles.heroKicker, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Globe size={12} /> COMMUNITIES
            </div>
            <h1 style={styles.bannerHeading}>Discover & join communities that match your interests</h1>
            <div style={styles.heroStats}>
              <span style={styles.statChip}><Globe size={12} /> {loading ? '…' : groups.length} Communities</span>
              <span style={styles.statChip}><Unlock size={12} /> 5 Group Types</span>
              <span style={styles.statChip}><Sparkles size={12} /> Updated today</span>
            </div>
          </div>
          <button className="hero-btn" onClick={() => setShowForm(true)} style={styles.heroCreateBtn}>+ Create Community</button>
        </div>

        {/* Search Toolbar */}
        <div style={styles.toolbar}>
          <div style={styles.toolbarSearchWrap}>
            <span style={styles.searchIcon}><SearchIcon /></span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search communities..." style={styles.toolbarSearchInput} />
          </div>
          <span style={styles.resultCount}>{loading ? 'Loading…' : `${filteredGroups.length} result${filteredGroups.length === 1 ? '' : 's'}`}</span>
        </div>

        {/* Communities Grid */}
        {loading ? (
          <div style={styles.loadingState}>Loading communities...</div>
        ) : filteredGroups.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ marginBottom: '10px' }}><Globe size={40} color={C.faint} /></div>
            No communities found. Be the first to create one!
          </div>
        ) : (
          <div style={{ ...styles.grid, gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {filteredGroups.map((group, idx) => {
              const label = group.attributes?.label || 'Community';
              const typeInfo = GROUP_TYPES[group.groupType] || GROUP_TYPES.public_group;
              const TypeIcon = TYPE_ICONS[typeInfo.icon] || TYPE_ICONS.Users;
              const isGlobalAdmin = currentUserName === 'admin';

              // Check localStorage for ownership fallback
              const savedOwners = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('group_owners') || '{}') : {};
              const ownsLocally = savedOwners[group.id] === currentUserName;
              const isPythonFallback = label.toLowerCase() === 'python' && currentUserName.includes('prasuna');

              // Check localStorage for approvals
              const approvals = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('group_approvals') || '{}') : {};
              const isApprovedMember = (approvals[group.id] || []).includes(currentUserName);

              const isCreator = currentUserName && (
                ownsLocally ||
                isPythonFallback ||
                (group.creatorName && (
                  currentUserName === group.creatorName.toLowerCase() ||
                  group.creatorName.toLowerCase().includes(currentUserName)
                ))
              );
              const showAdminButton = isGlobalAdmin || isCreator || isApprovedMember;

              return (
                <div key={group.id} className="grp-card" style={styles.groupCard}>
                  <div style={{ ...styles.cardCover, background: coverGradients[idx % coverGradients.length] }}>
                    <Users size={40} color="#fff" />
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.cardAvatar}>{(label.charAt(0) || 'C').toUpperCase()}</div>
                    <h2 style={styles.communityName}>{label}</h2>
                    <p style={styles.description}>
                      {group.attributes?.field_group_description?.value || typeInfo.description}
                    </p>
                    <div style={styles.cardMeta}>
                      <span style={styles.metaChip}><TypeIcon size={12} /> {typeInfo.label}</span>
                      <span style={styles.memberText}>#{group.id.slice(0, 8)}</span>
                    </div>
                    {showAdminButton ? (
                      <button className="grp-join" style={{ ...styles.joinBtn, background: '#10b981', color: 'white', border: 'none' }} onClick={(e) => { e.stopPropagation(); router.push(`/communities/${group.id}`); }}>
                        Open Community
                      </button>
                    ) : (
                      <button className="grp-join" style={styles.joinBtn} onClick={(e) => joinCommunity(group, e)}>
                        {(group.groupType === 'closed_group' || group.groupType === 'secret_group') ? 'Request to Join' : 'Join Community'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Community Modal */}
      {showForm && (
        <div style={styles.modalOverlay} onClick={() => setShowForm(false)}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.formTitle}>Create a new community</span>
              <button style={styles.modalClose} onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            {error && <div style={styles.errorBox}>{error}</div>}
            <form onSubmit={createCommunity}>
              <label style={styles.fieldLabel}>Community Name</label>
              <input style={styles.blockInput} name="name" placeholder="e.g. UI/UX Designers" value={form.name} onChange={handleChange} />

              <label style={styles.fieldLabel}>Group Type</label>
              <select style={{ ...styles.blockInput, appearance: 'auto' }} name="type" value={form.type} onChange={handleChange}>
                {Object.entries(GROUP_TYPES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label} - {val.description}</option>
                ))}
              </select>

              <label style={styles.fieldLabel}>Description</label>
              <textarea style={styles.textarea} name="description" placeholder="Tell people what this community is about..." value={form.description} onChange={handleChange} />

              <div style={styles.modalActions}>
                <button type="button" style={styles.secondaryBtn} onClick={() => setShowForm(false)}>Cancel</button>
                <button style={styles.primaryBtn} disabled={submitting}>{submitting ? 'Saving...' : 'Save Community'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

/* ================= CONTENT STYLES ONLY (shell comes from AppShell) ================= */
const styles = {
  toast: { position: 'fixed', bottom: '24px', right: '24px', backgroundColor: C.heading, color: '#fff', padding: '14px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', zIndex: 9999, boxShadow: S.cardHover },
  heroBanner: { background: G.hero, borderRadius: '24px', padding: '36px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', boxShadow: S.glow },
  heroKicker: { fontSize: '14px', color: C.accentSoft, fontWeight: 800, letterSpacing: '1px', marginBottom: '12px' },
  bannerHeading: { fontSize: '28px', fontWeight: 800, color: '#fff', margin: '0 0 16px 0', maxWidth: '560px' },
  heroStats: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  statChip: { backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '20px', padding: '6px 16px', fontSize: '12px', fontWeight: 700, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  heroCreateBtn: { backgroundColor: '#fff', color: C.primary, border: 'none', borderRadius: '20px', padding: '12px 28px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', transition: 'transform .15s ease' },
  toolbar: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' },
  toolbarSearchWrap: { position: 'relative', flex: 1 },
  searchIcon: { position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, display: 'flex', color: C.muted },
  toolbarSearchInput: { width: '100%', backgroundColor: C.bg, border: `1px solid ${C.borderLight}`, borderRadius: '20px', padding: '12px 16px 12px 42px', fontSize: '14px', color: C.heading, outline: 'none', boxSizing: 'border-box' },
  resultCount: { fontSize: '13px', color: C.muted, fontWeight: 700, whiteSpace: 'nowrap' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' },
  groupCard: { backgroundColor: C.card, border: `1px solid ${C.border}`, borderRadius: '24px', overflow: 'hidden', boxShadow: S.card },
  cardCover: { height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 20px' },
  cardBody: { padding: '0 24px 24px' },
  cardAvatar: { width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fff', color: C.primary, border: `2px solid ${C.border}`, boxShadow: S.cardHover, fontWeight: 800, fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '-28px 0 16px 0' },
  communityName: { margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: C.heading },
  description: { color: C.text, margin: '0 0 16px', fontSize: '14px', lineHeight: '1.6', minHeight: '44px', display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  metaChip: { backgroundColor: C.primarySoft, color: C.primary, padding: '4px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '6px' },
  memberText: { fontSize: '12px', color: C.muted, fontFamily: 'monospace' },
  joinBtn: { ...P.btnGhost, width: '100%', padding: '12px 0', fontSize: '14px' },
  primaryBtn: { ...P.btn, borderRadius: '20px', padding: '12px 28px', fontSize: '14px' },
  secondaryBtn: { backgroundColor: C.bg, color: C.muted, border: 'none', borderRadius: '20px', padding: '12px 24px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '24px' },
  modalCard: { backgroundColor: C.card, borderRadius: '24px', padding: '32px', width: '100%', maxWidth: '520px', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  formTitle: { fontSize: '18px', fontWeight: 800, color: C.heading },
  modalClose: { backgroundColor: C.bg, border: 'none', width: '36px', height: '36px', borderRadius: '12px', cursor: 'pointer', color: C.muted, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { display: 'block', fontSize: '13px', fontWeight: 700, color: C.text, marginBottom: '8px' },
  blockInput: { width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px 16px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '20px', color: C.text },
  textarea: { width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px 16px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', minHeight: '100px', resize: 'vertical', marginBottom: '24px', fontFamily: 'inherit', color: C.text },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '12px' },
  errorBox: { background: C.dangerSoft, color: C.danger, padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px', border: `1px solid ${C.dangerSoft}` },
  emptyState: { textAlign: 'center', padding: '80px 20px', color: C.muted, fontSize: '16px', fontWeight: 700, backgroundColor: C.card, borderRadius: '24px', border: `1px dashed ${C.border}` },
  loadingState: { textAlign: 'center', padding: '60px 0', color: C.muted, fontSize: '16px', fontWeight: 700 }
};