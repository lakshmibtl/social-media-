'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Home, User, Users, UsersRound, FileText, Zap, CalendarDays, BarChart3,
    Target, Award, Settings, MessageSquare, Lightbulb, Shield,
    Search, Bell, Menu, X, LogOut, CalendarClock, Heart, AtSign,
    MessageCircle, AlertTriangle, Cog, CheckCircle2, ArrowRight,
} from 'lucide-react';
import useResponsive from '../lib/useResponsive';
import { C, G, S } from '../lib/theme';
import { API_URL } from '../lib/config';

const API_BASE = API_URL;

/* =====================================================================
   PERMISSION-BASED NAVIGATION
   Each item shows only if the user's role has this permission
   (the same permissions you grant in Admin Portal → User Roles → Permissions)
===================================================================== */
const NAV_ITEMS = [
    { label: 'Home', href: '/', icon: Home, match: (p) => p === '/', permission: null },
    { label: 'My Profile', href: '/profile', icon: User, match: (p) => p.includes('profile'), permission: null },
    { label: 'People Directory', href: '/users', icon: Users, match: (p) => p.includes('people'), permission: 'access user profiles' },
    { label: 'Communities', href: '/groups', icon: UsersRound, match: (p) => p.includes('groups'), permission: 'access group overview' },
    { label: 'Message', href: '/messages', icon: FileText, match: (p) => p.includes('messages'), permission: 'create private_message entities' },
    { label: 'Activity Log', href: '/activity', icon: Zap, match: (p) => p.includes('activity'), permission: 'access activity overview' },
    { label: 'Events', href: '/events', icon: CalendarDays, match: (p) => p.includes('event'), permission: 'access content' },
    { label: 'Poll', href: '/polls', icon: BarChart3, match: (p) => p.includes('poll'), permission: 'vote on polls' },
    { label: 'Recognition', href: '/recognition', icon: Award, match: (p) => p.includes('recognition'), permission: 'access content' },
    { label: 'Settings', href: '/settings', icon: Settings, match: (p) => p.includes('settings'), permission: null },
    { label: 'Innovation Ideas', href: '/innovation-ideas', icon: Lightbulb, match: (p) => p.includes('idea'), permission: 'access content' },
    { label: 'Admin Portal', href: '/admin', icon: Shield, match: (p) => p.includes('admin'), roles: ['administrator', 'super admin', 'admin'], permission: 'access administration pages' },
];

const BOTTOM_NAV_ITEMS = [
    { label: 'Home', href: '/', icon: Home, match: (p) => p === '/', permission: null },
    { label: 'Profile', href: '/profile', icon: User, match: (p) => p.includes('profile') && !p.includes('users'), permission: null },
    { label: 'Messages', href: '/messages', icon: MessageSquare, match: (p) => p.includes('messages'), permission: 'create private_message entities' },
    { label: 'Groups', href: '/groups', icon: UsersRound, match: (p) => p.includes('groups'), permission: 'access group overview' },
];

/* Fallback permission sets (used only if Drupal can't be reached) */
const DEFAULT_ROLE_PERMISSIONS = {
    employee: [
        'access content', 'access user profiles', 'search content', 'use text format basic_html',
        'add post entities', 'edit own post entities', 'delete own post entities',
        'view published post entities', 'view own unpublished post entities',
        'access comments', 'post comments', 'edit own comments', 'delete own comments',
        'access group overview', 'view group entities', 'join groups', 'leave groups',
        'flag follow_content', 'unflag follow_content', 'flag follow_user', 'unflag follow_user',
        'create private_message entities', 'view own private_message entities',
        'access social notifications', 'view own notification messages', 'access activity overview',
        'vote on content', 'vote on polls', 'access own votes',
    ],
    moderator: [
        'access content', 'access user profiles', 'search content', 'use text format basic_html',
        'add post entities', 'edit own post entities', 'edit any post entities', 'delete any post entities',
        'view published post entities', 'view unpublished post entities',
        'access comments', 'post comments', 'edit own comments', 'edit any comments', 'delete own comments', 'delete any comments', 'skip comment approval',
        'access group overview', 'view group entities', 'join groups', 'leave groups',
        'flag follow_content', 'unflag follow_content', 'flag follow_user', 'unflag follow_user',
        'flag report_content', 'unflag report_content', 'flag report_comment', 'unflag report_comment',
        'flag report_post', 'unflag report_post',
        'create private_message entities', 'view own private_message entities',
        'access social notifications', 'view own notification messages', 'access activity overview',
        'vote on content', 'vote on polls', 'access own votes',
    ],
};

/* =====================================================================
   NAV ACCESS CHECK — role + permission based
===================================================================== */
const canAccessNav = (item, role, perms) => {
    const r = (role || '').toLowerCase();
    // Admins see everything
    if (['administrator', 'super admin', 'admin'].some(a => r.includes(a))) return true;
    // Role-locked items (Admin Portal)
    if (item.roles && item.roles.some(allowed => r.includes(allowed.toLowerCase()))) return true;
    if (item.roles) return false;
    // Open items (Home / Profile / Settings)
    if (!item.permission) return true;
    // Still loading permissions → show (avoid empty flash)
    if (perms === null) return true;
    // ✅ THE permission check
    return perms.includes(item.permission);
};

const MOCK_NOTIFS = [
    {
        id: 'mock-poll-vote-1',
        type: 'message--create_like_node_or_post',
        actorName: 'Sarah Connor',
        attributes: {
            created: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5m ago
        },
        messageText: 'Sarah Connor voted on your poll: "Which frontend micro-animations framework do you prefer?"'
    },
    {
        id: 'mock-activity-1',
        type: 'message--activity_on_events_im_organizing',
        actorName: 'Sarah Connor',
        attributes: {
            created: new Date(Date.now() - 12 * 60 * 1000).toISOString(), // 12m ago
        }
    },
    {
        id: 'mock-join-1',
        type: 'message--join_to_group',
        actorName: 'John Connor',
        attributes: {
            created: new Date(Date.now() - 48 * 60 * 1000).toISOString(), // 48m ago
        }
    },
    {
        id: 'mock-pm-1',
        type: 'message--private_message_notification',
        actorName: 'Sarah Chen',
        attributes: {
            created: new Date(Date.now() - 3.5 * 3600 * 1000).toISOString(), // 3.5h ago
        }
    },
    {
        id: 'mock-like-1',
        type: 'message--create_like_node_or_post',
        actorName: 'Alex Rivera',
        attributes: {
            created: new Date(Date.now() - 25 * 3600 * 1000).toISOString(), // 1d ago
        }
    }
];

const getInitials = (name) => {
    const n = (name || '').trim();
    if (!n) return 'AD';
    const parts = n.split(/\s+/);
    return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : n.slice(0, 2)).toUpperCase();
};

function NavLink({ item, active, theme }) {
    const [hover, setHover] = useState(false);
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                fontSize: '13px', fontWeight: active ? 700 : 600,
                color: active ? '#ffffff' : theme.navText,
                background: active ? G.brand : hover ? theme.hover : 'transparent',
                boxShadow: active ? S.glow : 'none',
                transition: 'background .15s',
            }}
        >
            <Icon size={16} strokeWidth={2.2} />
            <span>{item.label}</span>
        </Link>
    );
}

export default function AppShell({ children }) {
    const pathname = usePathname() || '/';   /* ✅ now updates on every navigation */
    const router = useRouter();
    const { isMobile, isTablet, isDesktop } = useResponsive();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState({ name: 'admin', role: 'Administrator', avatar: null });
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const [queryUsername, setQueryUsername] = useState(null);

    /* ✅ NEW — the logged-in user's real Drupal permissions (null = loading) */
    const [userPermissions, setUserPermissions] = useState(null);

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        const onEsc = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            setQueryUsername(params.get('username'));
        }
    }, [pathname]);

    useEffect(() => {
        try {
            const loginUser = JSON.parse(localStorage.getItem('openserver_user') || 'null');
            const saved = JSON.parse(localStorage.getItem('openserver_user_profile_v2') || 'null');

            let uName = 'admin';
            let uRole = 'Administrator';
            let uAvatar = null;

            if (loginUser && loginUser.name) {
                uName = loginUser.name;
                uRole = loginUser.role || 'Administrator';
                uAvatar = loginUser.avatar;
            } else {
                router.push('/login');
                return;
            }

            if (saved && saved.name && saved.name.toLowerCase() === uName.toLowerCase()) {
                if (saved.role) uRole = saved.role;
                if (saved.avatar) uAvatar = saved.avatar;
            }

            setUser({ name: uName, role: uRole, avatar: uAvatar });
            setIsCheckingAuth(false);
        } catch (e) {
            setIsCheckingAuth(false);
        }
    }, []);

    /* ✅ NEW — load the user's permissions from Drupal (roles_proxy.php) */
    useEffect(() => {
        const loadPermissions = async () => {
            const r = (user.role || '').toLowerCase();
            // Admins bypass everything
            if (['administrator', 'super admin', 'admin'].some(a => r.includes(a))) {
                setUserPermissions(['*']);
                return;
            }
            try {
                const res = await fetch(`${API_BASE}/roles_proxy.php`, { credentials: 'include' });
                const json = res.ok ? await res.json() : { data: [] };
                const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                const ur = norm(user.role);

                const myRoles = (json.data || []).filter(role => {
                    const rid = norm(role.attributes?.drupal_internal__id);
                    const label = norm(role.attributes?.label);
                    if (!ur) return false;
                    return rid === ur || label === ur || (rid && (ur.includes(rid) || rid.includes(ur)));
                });

                if (myRoles.length > 0) {
                    const perms = [...new Set(myRoles.flatMap(role => role.attributes?.permissions || []))];
                    setUserPermissions(perms);
                } else {
                    // Drupal didn't return roles → use built-in fallback for the role name
                    setUserPermissions(DEFAULT_ROLE_PERMISSIONS[r] || DEFAULT_ROLE_PERMISSIONS.employee);
                }
            } catch (e) {
                setUserPermissions(DEFAULT_ROLE_PERMISSIONS[r] || DEFAULT_ROLE_PERMISSIONS.employee);
            }
        };
        if (user.name) loadPermissions();
    }, [user.name, user.role]);

    const [notifs, setNotifs] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);
    const [readNotifIds, setReadNotifIds] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const searchContainerRef = useRef(null);
    const [suggestedPeople, setSuggestedPeople] = useState([]);
    const [suggestedGroups, setSuggestedGroups] = useState([]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsSearchOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const users = JSON.parse(localStorage.getItem('openserver_users_v2') || '[]');
                const groups = JSON.parse(localStorage.getItem('openserver_groups_v2') || '[]');

                const loggedIn = JSON.parse(localStorage.getItem('openserver_user') || '{}');
                const loggedInName = loggedIn.name || 'admin';

                const filteredUsers = users.filter(u => u.name && u.name.toLowerCase() !== loggedInName.toLowerCase()).slice(0, 5);
                setSuggestedPeople(filteredUsers);
                setSuggestedGroups([]);
            } catch (e) { }
        }
    }, [isSearchOpen]);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        const query = searchQuery.toLowerCase();
        let results = [];

        try {
            const users = JSON.parse(localStorage.getItem('openserver_users_v2') || '[]');
            const matchesUsers = users.filter(u => u.name && u.name.toLowerCase().includes(query)).map(u => ({
                id: 'u_' + u.name,
                type: 'user',
                label: u.name,
                subtext: u.role || 'Member',
                href: `/profile?username=${encodeURIComponent(u.name)}`,
                avatar: u.avatar || null
            }));
            results = [...results, ...matchesUsers];
        } catch (e) { }

        setSearchResults(results);
    }, [searchQuery]);

    useEffect(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('openserver_read_notifs') || '[]');
            setReadNotifIds(saved);
        } catch (e) { }
    }, []);

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const endpoints = [
                    '/jsonapi/message/activity_on_events_im_organizing',
                    '/jsonapi/message/join_to_group',
                    '/jsonapi/message/invited_to_join_group',
                    '/jsonapi/message/request_to_join_a_group',
                    '/jsonapi/message/approve_request_join_group',
                    '/jsonapi/message/content_reported',
                    '/jsonapi/message/create_comment_author_node_post',
                    '/jsonapi/message/create_like_node_or_post',
                    '/jsonapi/message/create_mention_post',
                    '/jsonapi/message/invite_event_enrollment',
                    '/jsonapi/message/event_request_approved',
                    '/jsonapi/message/background_process_finished',
                    '/jsonapi/message/user_was_enrolled_to_event'
                ];

                const promises = endpoints.map(ep =>
                    fetch(`${API_BASE}${ep}?sort=-created&page[limit]=5&include=uid`, {
                        cache: 'no-store',
                        credentials: 'include'
                    })
                        .then(r => r.ok ? r.json() : { data: [] })
                        .catch(() => ({ data: [] }))
                );

                const mentionsPromise = fetch(`${API_BASE}/jsonapi/mentions/mentions?sort=-created&page[limit]=5&include=uid,author`, {
                    cache: 'no-store',
                    credentials: 'include'
                })
                    .then(r => r.ok ? r.json() : { data: [] })
                    .catch(() => ({ data: [] }));

                const mentionsTypePromise = fetch(`${API_BASE}/jsonapi/mentions_type/mentions_type`, {
                    cache: 'no-store',
                    credentials: 'include'
                })
                    .then(r => r.ok ? r.json() : { data: [] })
                    .catch(() => ({ data: [] }));

                const results = await Promise.all([...promises, mentionsPromise, mentionsTypePromise]);
                let allMessages = [];
                let includedUsers = {};

                // Process mock notifications
                const mockMapped = MOCK_NOTIFS.map(m => {
                    let msg = 'New notification';
                    const actorUser = m.actorName;
                    const type = m.type;
                    if (m.messageText) msg = m.messageText;
                    else if (type.includes('activity_on_events_im_organizing')) msg = 'There is new activity on an event you are organizing';
                    else if (type.includes('join_to_group')) msg = `${actorUser} has joined your group`;
                    else if (type.includes('invited_to_join_group')) msg = `${actorUser} invited you to join a group`;
                    else if (type.includes('request_to_join_a_group')) msg = `${actorUser} requested to join your group`;
                    else if (type.includes('approve_request_join_group')) msg = `Your request to join a group was approved by ${actorUser}`;
                    else if (type.includes('content_reported')) msg = `Content has been reported for review by ${actorUser}`;
                    else if (type.includes('create_comment_author_node_post')) msg = `${actorUser} commented on your post`;
                    else if (type.includes('create_like_node_or_post')) msg = `${actorUser} liked your post`;
                    else if (type.includes('create_mention_post')) msg = `${actorUser} mentioned you in a post`;
                    else if (type.includes('invite_event_enrollment')) msg = `${actorUser} invited you to an event`;
                    else if (type.includes('event_request_approved')) msg = 'Your event registration was approved';
                    else if (type.includes('background_process_finished')) msg = 'A background process has finished';
                    else if (type.includes('user_was_enrolled_to_event')) msg = `${actorUser} enrolled in your event`;

                    return {
                        ...m,
                        messageText: msg
                    };
                });

                allMessages = [...mockMapped];
                let currentLoggedName = 'admin';
                try {
                    const loginUser = JSON.parse(localStorage.getItem('openserver_user') || 'null');
                    if (loginUser && loginUser.name) {
                        currentLoggedName = loginUser.name;
                    }
                } catch (e) { }

                results.forEach(res => {
                    // Extract all user profiles from the 'included' JSON:API payload
                    if (res.included && Array.isArray(res.included)) {
                        res.included.forEach(inc => {
                            if (inc.type && inc.includes('user')) {
                                includedUsers[inc.id] = inc.attributes?.display_name || inc.attributes?.name || 'A user';
                            }
                        });
                    }

                    if (res.data && Array.isArray(res.data)) {
                        // Attach the extracted real name to the notification object
                        res.data.forEach(msg => {
                            if (msg.type === 'mentions--mentions') {
                                const targetUid = msg.relationships?.uid?.data?.id;
                                const authorUid = msg.relationships?.author?.data?.id;

                                const targetName = targetUid ? includedUsers[targetUid] : 'A user';
                                const actorName = authorUid ? includedUsers[authorUid] : 'A user';

                                // Only show notification if the current logged-in user is the one mentioned
                                if (targetName.toLowerCase() !== currentLoggedName.toLowerCase()) {
                                    return;
                                }
                                // Skip if user mentioned themselves
                                if (actorName.toLowerCase() === currentLoggedName.toLowerCase()) {
                                    return;
                                }

                                msg.actorName = actorName;
                                msg.messageText = `${actorName} mentioned you`;
                                allMessages.push(msg);
                                return;
                            }

                            if (msg.type === 'mentions_type--mentions_type') {
                                // Mentions type metadata, skip rendering as a notification
                                return;
                            }

                            const uid = msg.relationships?.uid?.data?.id;
                            let actor = 'A user';
                            if (uid && includedUsers[uid]) {
                                actor = includedUsers[uid];
                            }
                            // Skip notifications triggered by the user themselves
                            if (actor.toLowerCase() === currentLoggedName.toLowerCase()) {
                                return;
                            }
                            msg.actorName = actor;
                            allMessages.push(msg);
                        });
                    }
                });

                allMessages.sort((a, b) => {
                    const dateA = new Date(a.attributes?.created || 0);
                    const dateB = new Date(b.attributes?.created || 0);
                    return dateB - dateA;
                });

                setNotifs(allMessages);
            } catch (e) {
                setNotifs([]);
            }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 15000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifs.filter(n => !readNotifIds.includes(n.id)).length;

    const getNotifIcon = (type) => {
        if (type.includes('event') || type.includes('activity_on_events')) return { Icon: CalendarClock, bg: '#eff6ff', color: '#6366f1' };
        if (type.includes('group') || type.includes('join')) return { Icon: UsersRound, bg: '#f0fdf4', color: '#22c55e' };
        if (type.includes('private_message')) return { Icon: MessageSquare, bg: '#f5f3ff', color: '#8b5cf6' };
        if (type.includes('content_reported')) return { Icon: AlertTriangle, bg: '#fffbeb', color: '#f59e0b' };
        if (type.includes('comment')) return { Icon: MessageCircle, bg: '#ecfeff', color: '#06b6d4' };
        if (type.includes('like')) return { Icon: Heart, bg: '#fff1f2', color: '#f43f5e' };
        if (type.includes('mention')) return { Icon: AtSign, bg: '#fdf2f8', color: '#ec4899' };
        if (type.includes('background_process')) return { Icon: Cog, bg: '#faf8ff', color: C.muted };
        return { Icon: Bell, bg: '#f0ebff', color: '#5b5394' };
    };

    const handleNotifClick = (n) => {
        if (!readNotifIds.includes(n.id)) {
            const updated = [...readNotifIds, n.id];
            setReadNotifIds(updated);
            try {
                localStorage.setItem('openserver_read_notifs', JSON.stringify(updated));
            } catch (e) { }
        }

        // Navigation mapping based on type
        const type = n.type || '';
        if (type.includes('event') || type.includes('activity_on_events')) {
            router.push('/events');
        } else if (type.includes('group') || type.includes('join')) {
            router.push('/groups');
        } else if (type.includes('private_message')) {
            router.push('/messages');
        } else if (type.includes('content_reported')) {
            router.push('/admin');
        } else {
            router.push('/');
        }
        setShowNotifs(false);
    };

    const handleMarkAllRead = () => {
        const allIds = notifs.map(n => n.id);
        setReadNotifIds(allIds);
        try {
            localStorage.setItem('openserver_read_notifs', JSON.stringify(allIds));
        } catch (e) { }
    };

    const theme = { appBg: C.bg, cardBg: '#ffffff', border: C.border, text: C.heading, navText: '#5b5394', subtext: C.muted, hover: '#f0ebff', inputBg: '#f0ebff' };

    const activeItem = NAV_ITEMS.find((item) => {
        if (item.label === 'My Profile') {
            if (pathname !== '/profile') return false;
            if (!queryUsername) return true;
            return queryUsername.toLowerCase() === user.name.toLowerCase();
        }
        if (item.label === 'People Directory') {
            if (pathname.includes('people') || pathname.includes('users')) return true;
            if (pathname === '/profile' && queryUsername && queryUsername.toLowerCase() !== user.name.toLowerCase()) {
                return true;
            }
            return false;
        }
        return item.match(pathname);
    }) || NAV_ITEMS[0];

    const initials = getInitials(user.name);

    if (isCheckingAuth) {
        return <div style={{ minHeight: '100vh', backgroundColor: theme.appBg }} />;
    }

    return (
        <div style={{ minHeight: '100vh', boxSizing: 'border-box', backgroundColor: theme.appBg, fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif", transition: 'background-color .25s' }}>

            {/* ============ SIDEBAR CONTENT (shared by desktop + mobile drawer) ============ */}
            {(() => {
                const sidebarContent = (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: '16px' }}>
                            <span style={{ fontSize: '19px', fontWeight: 900, color: C.primary, letterSpacing: '0.4px' }}>ENGAGE</span>
                            {!isDesktop && (
                                <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: theme.subtext, padding: 4 }} aria-label="Close menu">
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                        <nav style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {/* ✅ PERMISSION-BASED FILTER */}
                            {NAV_ITEMS.filter(item => canAccessNav(item, user.role, userPermissions)).map((item) => (
                                <NavLink key={item.label} item={item} active={activeItem === item} theme={theme} />
                            ))}
                        </nav>
                        <div style={{ borderTop: `1px solid ${theme.border}`, marginTop: '10px', paddingTop: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 6px', marginBottom: '12px' }}>
                                {user.avatar ? (
                                    <img src={user.avatar} alt={user.name} style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,#06b6d4,#6d28d9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{initials}</div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                                    <div style={{ fontSize: '11px', color: theme.subtext }}>{user.role}</div>
                                </div>
                            </div>
                            <button onClick={() => { try { localStorage.removeItem('openserver_user'); localStorage.removeItem('openserver_user_profile_v2'); } catch (e) { } window.location.href = '/login'; }} style={{ width: '100%', padding: '8px 0', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: '#ef4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                <LogOut size={13} /> Logout
                            </button>
                        </div>
                    </>
                );

                const headerContent = (
                    <>
                        <div ref={searchContainerRef} style={{ position: 'relative', width: isMobile ? '100%' : '380px', maxWidth: '100%' }}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (searchQuery.trim()) {
                                        setIsSearchOpen(false);
                                        router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                                    }
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', backgroundColor: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '10px', padding: '9px 12px' }}
                            >
                                <Search size={15} color={theme.subtext} />
                                <input
                                    type="text"
                                    placeholder={isMobile ? 'Search...' : 'Search people, communities...'}
                                    value={searchQuery}
                                    onChange={e => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                                    onFocus={() => setIsSearchOpen(true)}
                                    style={{ border: 'none', outline: 'none', backgroundColor: 'transparent', width: '100%', fontSize: '13px', color: theme.text }}
                                />
                            </form>
                            {isSearchOpen && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '8px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', boxShadow: S.card, zIndex: 999, maxHeight: isMobile ? '50vh' : '380px', overflowY: 'auto' }}>
                                    {!searchQuery.trim() ? (
                                        /* ===== EMPTY STATE: show suggestions ===== */
                                        <div style={{ padding: '12px' }}>
                                            <div style={{ fontSize: '11px', color: theme.subtext, padding: '4px 4px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Search size={11} />
                                                Type a name and press Enter to search
                                            </div>
                                            {suggestedPeople.length > 0 && (
                                                <div>
                                                    <div style={{ fontSize: '11px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase', letterSpacing: '0.5px', padding: '6px 8px 8px' }}>People You May Know</div>
                                                    {suggestedPeople.map(u => (
                                                        <div
                                                            key={'sug_u_' + u.name}
                                                            onClick={() => {
                                                                setIsSearchOpen(false);
                                                                setSearchQuery(u.name);
                                                                router.push(`/profile?username=${encodeURIComponent(u.name)}`);
                                                            }}
                                                            style={{ padding: '8px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background-color 0.2s', marginBottom: '2px' }}
                                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                        >
                                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                                                {u.avatar ? (
                                                                    <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ width: '100%', height: '100%', background: G.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                                                        {(u.name || '?').charAt(0).toUpperCase()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontSize: '13px', fontWeight: 800, color: theme.text }}>{u.name}</div>
                                                                <div style={{ fontSize: '11px', color: theme.subtext }}>@{u.name.toLowerCase()} • {u.role || 'Member'}</div>
                                                            </div>
                                                            <Search size={12} color={theme.subtext} style={{ flexShrink: 0 }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        /* ===== TYPED QUERY: show matching results + Search button ===== */
                                        <div>
                                            {/* "Search for X" row — always at the top */}
                                            <div
                                                onClick={() => {
                                                    setIsSearchOpen(false);
                                                    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                                                }}
                                                style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', backgroundColor: '#f8faff' }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8faff'}
                                            >
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Search size={16} color={C.primary} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 800, color: C.primary }}>Search for "{searchQuery}"</div>
                                                    <div style={{ fontSize: '11px', color: C.muted }}>See all results on search page</div>
                                                </div>
                                                <span style={{ fontSize: '11px', color: C.primary, fontWeight: 700 }}>↵ Enter</span>
                                            </div>

                                            {/* Matching results below */}
                                            {searchResults.length === 0 ? (
                                                <div style={{ padding: '16px', textAlign: 'center', color: theme.subtext, fontSize: '13px' }}>No matches found. Press Enter to search.</div>
                                            ) : (
                                                searchResults.map(res => (
                                                    <div
                                                        key={res.id}
                                                        onClick={() => {
                                                            setIsSearchOpen(false);
                                                            router.push(`/profile?username=${encodeURIComponent(res.label)}`);
                                                        }}
                                                        style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                                            {res.type === 'user' && res.avatar ? (
                                                                <img src={res.avatar} alt={res.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '100%', height: '100%', background: res.type === 'user' ? G.brand : 'linear-gradient(135deg, #10b981, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                                                                    {(res.label || '?').charAt(0).toUpperCase()}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13px', fontWeight: 800, color: theme.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                {res.label}
                                                                {res.type === 'user' && res.label.toLowerCase() === 'admin' && (
                                                                    <Shield size={12} color="#6366f1" />
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: theme.subtext }}>
                                                                {res.type === 'user' ? `@${res.label.toLowerCase()} • ${res.subtext}` : `Community • ${res.subtext}`}
                                                            </div>
                                                        </div>
                                                        <Search size={12} color={theme.subtext} style={{ flexShrink: 0 }} />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setShowNotifs(!showNotifs)} style={{ position: 'relative', width: '38px', height: '38px', borderRadius: '50%', border: `1px solid ${theme.border}`, backgroundColor: showNotifs ? theme.hover : 'transparent', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <Bell size={16} />
                                    {unreadCount > 0 && (
                                        <span style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#ef4444', color: '#fff', fontSize: '10px', fontWeight: 800, borderRadius: '999px', padding: '2px 6px' }}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </span>
                                    )}
                                </button>
                                {showNotifs && (
                                    <div style={{ position: 'absolute', top: '48px', right: 0, width: isMobile ? 'min(320px, calc(100vw - 24px))' : '320px', backgroundColor: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', zIndex: 999, maxHeight: isMobile ? '60vh' : '400px', overflowY: 'auto' }}>
                                        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: 800, fontSize: '14px' }}>Notifications</span>
                                            {unreadCount > 0 && (
                                                <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: C.primary, fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}>Mark all as read</button>
                                            )}
                                        </div>
                                        {notifs.length === 0 ? (
                                            <div style={{ padding: '20px', textAlign: 'center', color: theme.subtext, fontSize: '13px' }}>No notifications yet</div>
                                        ) : (
                                            notifs.map(n => {
                                                let msg = 'New activity in your network';
                                                const type = n.type || '';
                                                const actor = n.actorName || 'Someone';
                                                const actorUser = n.actorName || 'A user';
                                                const isRead = readNotifIds.includes(n.id);

                                                if (n.messageText) msg = n.messageText;
                                                else if (n.attributes?.field_activity_message) msg = n.attributes.field_activity_message;
                                                else if (type.includes('activity_on_events_im_organizing')) msg = 'There is new activity on an event you are organizing';
                                                else if (type.includes('join_to_group')) msg = `${actorUser} has joined your group`;
                                                else if (type.includes('invited_to_join_group')) msg = `${actorUser} invited you to join a group`;
                                                else if (type.includes('request_to_join_a_group')) msg = `${actorUser} requested to join your group`;
                                                else if (type.includes('approve_request_join_group')) msg = `Your request to join a group was approved by ${actorUser}`;
                                                else if (type.includes('private_message_notification') || type.includes('create_private_message')) msg = `You received a new private message from ${actorUser}`;
                                                else if (type.includes('content_reported')) msg = `Content has been reported for review by ${actorUser}`;
                                                else if (type.includes('create_comment_author_node_post')) msg = `${actor} commented on your post`;
                                                else if (type.includes('create_like_node_or_post')) msg = `${actor} liked your post`;
                                                else if (type.includes('create_mention_post')) msg = `${actorUser} mentioned you in a post`;
                                                else if (type.includes('invite_event_enrollment')) msg = `${actorUser} invited you to an event`;
                                                else if (type.includes('event_request_approved')) msg = 'Your event registration was approved';
                                                else if (type.includes('background_process_finished')) msg = 'A background process has finished';
                                                else if (type.includes('user_was_enrolled_to_event')) msg = `${actorUser} enrolled in your event`;
                                                else if (type.includes('activity')) msg = n.attributes?.field_activity_message || 'New activity in your network';

                                                const iconMeta = getNotifIcon(type);

                                                return (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => handleNotifClick(n)}
                                                        style={{
                                                            padding: '12px 16px',
                                                            borderBottom: `1px solid ${theme.border}`,
                                                            display: 'flex',
                                                            gap: '12px',
                                                            alignItems: 'flex-start',
                                                            cursor: 'pointer',
                                                            backgroundColor: theme.cardBg,
                                                            opacity: isRead ? 0.65 : 1,
                                                            transition: 'opacity 0.2s, background-color 0.2s',
                                                        }}
                                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.hover}
                                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.cardBg}
                                                    >
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '50%',
                                                            backgroundColor: iconMeta.bg,
                                                            color: iconMeta.color,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '14px',
                                                            flexShrink: 0
                                                        }}>
                                                            <iconMeta.Icon size={15} strokeWidth={2.2} />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13px', color: theme.text, lineHeight: '1.4', fontWeight: isRead ? 500 : 700 }}>{msg}</div>
                                                            <div style={{ fontSize: '11px', color: theme.subtext, marginTop: '4px' }}>{n.attributes?.created ? new Date(n.attributes.created).toLocaleString() : 'Just now'}</div>
                                                        </div>
                                                        {!isRead && (
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#6366f1', marginTop: '12px', flexShrink: 0 }}></div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                            <Link href="/profile" style={{ width: '38px', height: '38px', borderRadius: '50%', background: G.brand, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, cursor: 'pointer', textDecoration: 'none' }}>{initials}</Link>
                        </div>
                    </>
                );

                /* ==================== DESKTOP / TABLET LAYOUT ==================== */
                if (isDesktop) {
                    return (
                        <div style={{ minHeight: '100vh', boxSizing: 'border-box', display: 'flex', gap: '24px', width: '100%', backgroundColor: theme.appBg }}>
                            <aside style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', backgroundColor: theme.cardBg, borderRadius: '20px', padding: '20px 12px', position: 'sticky', top: '20px', height: 'calc(100vh - 40px)', boxSizing: 'border-box' }}>
                                {sidebarContent}
                            </aside>

                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: isTablet ? '14px 16px' : '14px 24px', backgroundColor: theme.cardBg, borderRadius: '20px', position: 'sticky', top: '20px', zIndex: 100, boxShadow: S.card }}>
                                    {headerContent}
                                </header>
                                <main style={{ flex: 1, minWidth: 0, maxWidth: '1400px', margin: '0 auto', width: '100%' }}>{children}</main>
                            </div>
                        </div>
                    );
                }

                /* ==================== MOBILE / COMPACT LAYOUT ==================== */
                return (
                    <div style={{ minHeight: '100vh', backgroundColor: theme.appBg }}>
                        {/* Compact sticky header */}
                        <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', backgroundColor: theme.cardBg, borderBottom: `1px solid ${theme.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
                            <button onClick={() => setSidebarOpen(true)} style={{ width: '38px', height: '38px', borderRadius: '10px', border: `1px solid ${theme.border}`, backgroundColor: 'transparent', color: theme.text, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} aria-label="Open menu">
                                <Menu size={18} />
                            </button>
                            <span style={{ fontSize: '17px', fontWeight: 900, color: C.primary, letterSpacing: '0.4px', flexShrink: 0 }}>ENGAGE</span>
                            {headerContent}
                        </header>

                        {/* Slide-in drawer */}
                        {sidebarOpen && (
                            <>
                                <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', zIndex: 200 }} />
                                <aside style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 'min(300px, 85vw)', zIndex: 201, display: 'flex', flexDirection: 'column', backgroundColor: theme.cardBg, padding: '20px 12px', boxSizing: 'border-box', boxShadow: '4px 0 30px rgba(15,23,42,0.2)', overflowY: 'auto' }}>
                                    {sidebarContent}
                                </aside>
                            </>
                        )}

                        <main style={{ padding: '16px 12px', minHeight: 'calc(100vh - 64px)' }}>{children}</main>

                        {/* Bottom navigation — ✅ also permission-based */}
                        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 150, backgroundColor: theme.cardBg, borderTop: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '6px 4px', paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}>
                            {BOTTOM_NAV_ITEMS.filter(item => canAccessNav(item, user.role, userPermissions)).map(item => {
                                const Icon = item.icon;
                                const isActive = item.match(pathname);
                                return (
                                    <Link key={item.label} href={item.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 10px', borderRadius: '10px', textDecoration: 'none', color: isActive ? C.primary : theme.subtext, fontWeight: isActive ? 800 : 600 }}>
                                        <Icon size={20} strokeWidth={2.2} />
                                        <span style={{ fontSize: '10px' }}>{item.label}</span>
                                    </Link>
                                );
                            })}
                            <button onClick={() => setSidebarOpen(true)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '6px 10px', borderRadius: '10px', background: 'none', border: 'none', cursor: 'pointer', color: theme.subtext, fontWeight: 600 }}>
                                <Menu size={20} strokeWidth={2.2} />
                                <span style={{ fontSize: '10px' }}>Menu</span>
                            </button>
                        </nav>
                    </div>
                );
            })()}
        </div>
    );
}