'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, Zap, RefreshCw, ThumbsUp, MessageCircle, FileText, Users, CalendarDays, Lock, Heart } from 'lucide-react';
import useResponsive from '../lib/useResponsive';
import { C, G } from '../lib/theme';
import AppShell from './Appshell';
import { API_URL } from '../lib/config';

/* ----------------------------------------------------------------------
   Maps a Drupal Open Social activity `type` (e.g. "activity--activity")
   or its message text to a normalized category we can filter/icon on.
   Open Social activities usually carry a bundle-ish hint either in the
   `type` string itself or inside field_activity_output/message text
   (e.g. "liked your post", "commented on", "created a new post",
   "joined the group", "is attending an event"). We check both.
------------------------------------------------------------------------ */
const CATEGORY_RULES = [
    { key: 'like', label: 'Likes', Icon: ThumbsUp, color: C.primary, bg: C.primarySoft, match: /like|love|reaction/i },
    { key: 'comment', label: 'Comments', Icon: MessageCircle, color: '#06b6d4', bg: '#ecfeff', match: /comment|repl(y|ied)/i },
    { key: 'post', label: 'Posts', Icon: FileText, color: '#8b5cf6', bg: '#f5f3ff', match: /post|status|created a/i },
    { key: 'join', label: 'Joins', Icon: Users, color: '#22c55e', bg: '#f0fdf4', match: /join|member|group/i },
    { key: 'event', label: 'Events', Icon: CalendarDays, color: '#f59e0b', bg: '#fffbeb', match: /event|attend/i },
    { key: 'login', label: 'Logins', Icon: Lock, color: C.muted, bg: '#f0ebff', match: /login|signed in/i },
];

function categorize(drupalType, message) {
    const haystack = `${drupalType || ''} ${message || ''}`;
    for (const rule of CATEGORY_RULES) {
        if (rule.match.test(haystack)) return rule.key;
    }
    return 'other';
}

function categoryMeta(key) {
    return CATEGORY_RULES.find((r) => r.key === key) || { key: 'other', label: 'Other', Icon: Zap, color: '#5b5394', bg: '#f0ebff' };
}

const DRUPAL_ENDPOINT = `${API_URL}/activity_proxy.php`;
const POLL_INTERVAL_MS = 15000; // auto-refresh so new likes/posts/comments show up without a manual reload

export default function ActivityLogPage() {

    const { isMobile } = useResponsive();
    const [toastMsg, setToastMsg] = useState('');
    const [currentUser, setCurrentUser] = useState({ name: 'Sarah Connor', role: 'Super Admin', initials: 'SC' });

    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [apiOnline, setApiOnline] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [lastSynced, setLastSynced] = useState(null);

    const showToast = (msg) => { setToastMsg(msg); setTimeout(() => setToastMsg(''), 2500); };

    const loadActivities = useCallback(async (isBackgroundRefresh = false) => {
        let apiActivities = [];
        let isApiOnline = false;
        try {
            const res = await fetch(DRUPAL_ENDPOINT, { 
                credentials: 'include',
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    apiActivities = json.data.map((item) => {
                        const rawMsg =
                            item.attributes?.field_activity_output ||
                            item.attributes?.field_activity_message ||
                            'New activity recorded';

                        const cleanMsg = rawMsg.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();

                        return {
                            id: item.id,
                            message: cleanMsg,
                            time: item.attributes?.created ? new Date(item.attributes.created).toLocaleString() : 'Recently',
                            type: item.type || 'activity',
                            category: categorize(item.type, cleanMsg),
                            timestamp: item.attributes?.created ? new Date(item.attributes.created).getTime() : Date.now(),
                        };
                    });
                    isApiOnline = true;
                }
            }
        } catch (err) {
            console.log('API offline, using mock/local data.');
        }

        // Load activities from localStorage
        let localActivities = [];
        if (typeof window !== 'undefined') {
            try {
                const localData = JSON.parse(localStorage.getItem('openserver_logs_v2') || '[]');
                localActivities = localData.map((item) => {
                    const cleanMsg = `${item.user || 'Someone'} ${item.action || 'performed an action'} ${item.target ? `"${item.target}"` : ''}`.trim();
                    
                    let tsVal = Date.now();
                    if (item.timestamp) {
                        const parsed = new Date(item.timestamp).getTime();
                        if (!isNaN(parsed)) tsVal = parsed;
                    } else if (item.id && typeof item.id === 'string' && item.id.startsWith('act-')) {
                        const parsedId = parseInt(item.id.replace('act-', ''));
                        if (!isNaN(parsedId)) tsVal = parsedId;
                    } else if (typeof item.id === 'number') {
                        tsVal = item.id;
                    }

                    return {
                        id: item.id || `local-${Date.now()}-${Math.random()}`,
                        message: cleanMsg,
                        time: item.time || 'Recently',
                        type: 'activity',
                        category: categorize('activity', cleanMsg),
                        timestamp: tsVal,
                        image: item.postImage || null
                    };
                });
            } catch (e) {
                console.error(e);
            }
        }

        // Merge and deduplicate by message content
        const merged = [...apiActivities];
        const existingMessages = new Set(apiActivities.map(a => a.message.toLowerCase()));

        localActivities.forEach(localItem => {
            if (!existingMessages.has(localItem.message.toLowerCase())) {
                merged.push(localItem);
            }
        });

        // Sort by timestamp descending
        merged.sort((a, b) => b.timestamp - a.timestamp);

        if (merged.length > 0) {
            setActivities(merged);
        } else {
            setActivities([
                { id: 'm1', message: 'No activities found. Log some actions to see them here!', time: 'Just now', type: 'system', category: 'other', timestamp: Date.now() }
            ]);
        }

        setApiOnline(isApiOnline);
        setLastSynced(new Date());
        setLoading(false);
        if (isBackgroundRefresh) showToast('Activity feed updated');
    }, []);

    useEffect(() => {
        try {
            const savedUser = localStorage.getItem('openserver_user');
            if (savedUser) {
                const parsed = JSON.parse(savedUser);
                if (parsed?.name) setCurrentUser({ ...parsed, initials: parsed.name.substring(0, 2).toUpperCase() });
            }
        } catch (err) { }

        loadActivities(false);

        // Poll so likes/posts/comments/updates keep streaming in automatically
        const interval = setInterval(() => loadActivities(true), POLL_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [loadActivities]);



    const filteredActivities = useMemo(() => {
        if (activeFilter === 'all') return activities;
        return activities.filter((a) => a.category === activeFilter);
    }, [activities, activeFilter]);

    const availableFilters = useMemo(() => {
        const present = new Set(activities.map((a) => a.category));
        return CATEGORY_RULES.filter((r) => present.has(r.key));
    }, [activities]);

    return (
        <AppShell>
            <style>{`
                .filter-chip:hover { background: #f0ebff !important; }
            `}</style>

            {toastMsg && <div style={S.toast}>{toastMsg}</div>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '800px' }}>
                    <div>
                        <h1 style={{ ...S.heroTitle, display: 'flex', alignItems: 'center', gap: '10px' }}><Zap size={24} color={C.primary} /> Activity Stream</h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: apiOnline ? '#22c55e' : '#f59e0b', display: 'inline-block' }} />
                            <p style={{ color: C.muted, fontSize: '13px', margin: 0 }}>
                                {loading
                                    ? 'Fetching live data from Drupal API...'
                                    : apiOnline
                                        ? `Live • synced ${lastSynced ? lastSynced.toLocaleTimeString() : ''}`
                                        : 'API unreachable — showing fallback data'}
                            </p>
                        </div>
                    </div>

                    {/* FILTER CHIPS */}
                    {availableFilters.length > 0 && (
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="filter-chip" onClick={() => setActiveFilter('all')}
                                style={{ ...S.chip, ...(activeFilter === 'all' ? S.chipActive : {}) }}>
                                All
                            </button>
                            {availableFilters.map((f) => (
                                <button key={f.key} className="filter-chip" onClick={() => setActiveFilter(f.key)}
                                    style={{ ...S.chip, ...(activeFilter === f.key ? S.chipActive : {}) }}>
                                    <f.Icon size={14} style={{ marginRight: 5, verticalAlign: 'text-bottom' }} /> {f.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* TIMELINE */}
                    <div style={S.timelineContainer}>
                        {filteredActivities.map((act, idx) => (
                            <div key={act.id} style={S.timelineRow}>
                                <div style={S.timelineNode}>
                                    <div style={{ ...S.timelineDot, width: isMobile ? '36px' : '44px', height: isMobile ? '36px' : '44px' }}>
                                        {(() => {
                                            const meta = categoryMeta(act.category);
                                            const Icon = meta.Icon;
                                            const isLove = act.category === 'like' && /love/i.test(act.message);
                                            return isLove ? <Heart size={17} color="#f43f5e" /> : <Icon size={17} color={meta.color} />;
                                        })()}
                                    </div>
                                    {idx !== filteredActivities.length - 1 && <div style={S.timelineLine} />}
                                </div>
                                <div style={S.timelineCard}>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={S.timelineText}>{act.message}</div>
                                            <div style={S.timelineTime}>
                                                <Clock size={12} /> {act.time}
                                            </div>
                                        </div>
                                        {act.image && (
                                            <div style={{ flexShrink: 0 }}>
                                                <img src={act.image} alt="Activity" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: `1px solid ${C.border}` }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {!loading && filteredActivities.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '40px', color: C.faint }}>
                                No activities found{activeFilter !== 'all' ? ` for "${categoryMeta(activeFilter).label}"` : ''}.
                            </div>
                        )}
                    </div>
                </div>
    </AppShell>
);
}

/* ================= STYLES ================= */
const S = {
    wrap: { minHeight: '100vh', backgroundColor: C.bg, color: C.heading, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
    toast: { position: 'fixed', bottom: '24px', right: '24px', background: G.brand, color: '#fff', padding: '12px 20px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', zIndex: 9999, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' },
    sidebar: { position: 'fixed', top: '16px', left: '16px', bottom: '16px', width: '240px', boxSizing: 'border-box', backgroundColor: '#fbfcfe', border: `1px solid ${C.border}`, borderRadius: '18px', padding: '18px 12px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', zIndex: 100, boxShadow: '0 2px 10px rgba(15,23,42,0.05)' },
    logo: { fontSize: '20px', fontWeight: 800, color: C.primary, letterSpacing: '0.3px', padding: '0 10px', flexShrink: 0 },
    nav: { display: 'flex', flexDirection: 'column', gap: '3px' },
    navItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 12px', borderRadius: '10px', backgroundColor: 'transparent', color: '#5b5394', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background .15s, color .15s' },
    navActive: { background: G.brand, color: '#fff', fontWeight: 700, boxShadow: '0 10px 30px -10px rgba(124, 58, 237, 0.4)' },
    sideFooter: { marginTop: 'auto', borderTop: `1px solid ${C.border}`, paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 },
    avatarGrad: { width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#6366f1)', color: '#fff', fontWeight: 800, fontSize: '12.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    rightCol: { marginLeft: '280px', padding: '20px 24px 20px 0', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px' },
    headerCard: { backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(109, 40, 217, 0.08)' },
    searchWrap: { position: 'relative', width: '340px' },
    searchIcon: { position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', opacity: 0.45, display: 'flex' },
    searchInput: { width: '100%', backgroundColor: '#f0ebff', border: `1px solid ${C.border}`, borderRadius: '12px', padding: '9px 14px 9px 38px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' },
    iconBtn: { position: 'relative', width: '38px', height: '38px', borderRadius: '12px', border: `1px solid ${C.border}`, backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#334155' },
    badge: { position: 'absolute', top: '-5px', right: '-5px', backgroundColor: '#ef4444', color: '#fff', fontSize: '9px', fontWeight: 800, borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },
    headerAvatar: { width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#4f6df5', color: '#fff', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    heroTitle: { fontSize: '24px', fontWeight: 800, color: '#1e1b4b', margin: '0 0 10px', maxWidth: '480px', lineHeight: 1.3 },
    chip: { padding: '6px 12px', borderRadius: '999px', border: `1px solid ${C.border}`, backgroundColor: '#fff', fontSize: '12.5px', fontWeight: 600, color: '#5b5394', cursor: 'pointer' },
    chipActive: { backgroundColor: G.brand, borderColor: G.brand, color: '#fff' },
    timelineContainer: { display: 'flex', flexDirection: 'column', gap: '4px' },
    timelineRow: { display: 'flex', gap: '20px', position: 'relative' },
    timelineNode: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
    timelineDot: { width: '44px', height: '44px', borderRadius: '50%', backgroundColor: C.primarySoft, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${C.border}`, fontSize: '20px', zIndex: 2, flexShrink: 0 },
    timelineLine: { width: '2px', flex: 1, backgroundColor: C.border, minHeight: '20px' },
    timelineCard: { flex: 1, backgroundColor: '#fff', border: `1px solid ${C.border}`, borderRadius: '16px', padding: '18px 22px', marginBottom: '12px', boxShadow: '0 2px 12px rgba(109, 40, 217, 0.08)' },
    timelineText: { fontSize: '14px', color: '#334155', lineHeight: 1.6, marginBottom: '8px', fontWeight: 500 },
    timelineTime: { fontSize: '12px', color: C.faint, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }
};