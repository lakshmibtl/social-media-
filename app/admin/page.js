'use client';

import React, { useState, useEffect, useRef } from 'react';
import useResponsive from '../../lib/useResponsive';
import AppShell from '../../components/Appshell';
import { C, G, S, P } from '../../lib/theme';
import {
    Users, Shield, FileText, Settings, Search, Trash2, Edit, RefreshCw,
    AlertCircle, MessageSquare, Database, Folder, Tag, LayoutDashboard, Globe, Activity,
    Trophy, ThumbsUp, ThumbsDown, Lock, X, KeyRound, ShieldCheck, ChevronDown, UserPlus
} from 'lucide-react';
import { API_URL } from '../../lib/config';

/* =====================================================================
   ADMIN PORTAL CONFIGURATION
======================================================================== */
const ADMIN_SECTIONS = [
    {
        category: 'People & Access',
        icon: <Users size={16} />,
        items: [
            { id: 'users', label: 'User Management', endpoint: '/jsonapi/user/user', icon: <Users size={16} /> },
            { id: 'roles', label: 'User Roles', endpoint: '/roles_proxy.php', icon: <Shield size={16} /> },
            { id: 'user_actions', label: 'User Actions', endpoint: '/jsonapi/user/user', icon: <Activity size={16} /> },
        ]
    },
    {
        category: 'Communities & Groups',
        icon: <Globe size={16} />,
        items: [
            { id: 'groups_public', label: 'Public Groups', endpoint: '/jsonapi/group/public_group', icon: <Users size={16} /> },
            { id: 'groups_open', label: 'Open Groups', endpoint: '/jsonapi/group/open_group', icon: <Users size={16} /> },
            { id: 'groups_closed', label: 'Closed Groups', endpoint: '/jsonapi/group/closed_group', icon: <Shield size={16} /> },
            { id: 'groups_secret', label: 'Secret Groups', endpoint: '/jsonapi/group/secret_group', icon: <Shield size={16} /> },
            { id: 'groups_flexible', label: 'Flexible Groups', endpoint: '/jsonapi/group/flexible_group', icon: <Settings size={16} /> },
        ]
    },
    {
        category: 'Content Management',
        icon: <FileText size={16} />,
        items: [
            { id: 'events', label: 'Events', endpoint: '/jsonapi/node/event', icon: <FileText size={16} /> },
            { id: 'polls', label: 'Poll Questions', endpoint: '/jsonapi/node/page', icon: <FileText size={16} /> },
            { id: 'posts_text', label: 'Text Posts', endpoint: '/jsonapi/post/post', icon: <MessageSquare size={16} /> },
            { id: 'posts_photo', label: 'Photo Posts', endpoint: '/jsonapi/post/photo', icon: <MessageSquare size={16} /> },
            { id: 'comments_post', label: 'Post Comments', endpoint: '/jsonapi/comment/post_comment', icon: <MessageSquare size={16} /> },
        ]
    },
    {
        category: 'System & Communication',
        icon: <Database size={16} />,
        items: [
            { id: 'private_messages', label: 'Private Messages', endpoint: '/jsonapi/private_message/private_message', icon: <MessageSquare size={16} /> },
            { id: 'notifications', label: 'Notifications', endpoint: '/jsonapi/message/message', icon: <AlertCircle size={16} /> },
        ]
    }
];

const API_BASE = API_URL;

/* =====================================================================
   PERMISSION CATALOG
======================================================================== */
const PERMISSION_CATALOG = {
    'Core & System': [
        'access content', 'access administration pages', 'access site reports', 'search content',
        'access user profiles', 'view own profile', 'use text format basic_html',
        'use text format full_html', 'view the administration theme',
    ],
    'Posts & Feed': [
        'add post entities', 'edit own post entities', 'edit any post entities',
        'delete own post entities', 'delete any post entities', 'view published post entities',
        'view unpublished post entities', 'view own unpublished post entities', 'create photo posts',
    ],
    'Comments': [
        'access comments', 'post comments', 'edit own comments', 'edit any comments',
        'delete own comments', 'delete any comments', 'skip comment approval',
    ],
    'Groups': [
        'access group overview', 'view group entities', 'view group content',
        'create group entities of bundle public_group', 'create group entities of bundle open_group',
        'create group entities of bundle closed_group', 'create group entities of bundle secret_group',
        'create group entities of bundle flexible_group', 'join groups', 'leave groups',
        'manage group memberships', 'access group membership overview',
    ],
    'Innovation Ideas': [
        'create idea content', 'edit own idea content', 'edit any idea content',
        'delete own idea content', 'delete any idea content',
    ],
    'Recognition': [
        'create recognition content', 'edit own recognition content', 'edit any recognition content',
        'delete own recognition content', 'delete any recognition content',
    ],
    'Follows & Flags': [
        'flag follow_content', 'unflag follow_content', 'flag follow_user', 'unflag follow_user',
        'flag report_content', 'unflag report_content', 'flag report_comment', 'unflag report_comment',
        'flag report_post', 'unflag report_post',
    ],
    'Private Messages': [
        'create private_message entities', 'view own private_message entities',
        'delete own private_message entities', 'edit own private_message entities',
    ],
    'Activity & Notifications': [
        'access social notifications', 'view own notification messages', 'access activity overview',
    ],
    'Votes & Reactions': [
        'vote on content', 'vote on events', 'vote on polls', 'access own votes',
    ],
    'Administration': [
        'administer users', 'administer permissions', 'administer roles', 'administer groups',
        'administer nodes', 'administer site configuration',
    ],
};

const PERMISSION_LABELS = {
    'access content': { label: 'View content', desc: 'Read posts, pages and activity on the platform' },
    'access administration pages': { label: 'Access admin pages', desc: 'Open Drupal admin interfaces' },
    'access site reports': { label: 'View site reports', desc: 'See system reports and logs' },
    'search content': { label: 'Search content', desc: 'Use the global search bar' },
    'access user profiles': { label: 'View member profiles', desc: 'Open the people directory and profiles' },
    'view own profile': { label: 'View own profile', desc: 'Access your own profile page' },
    'use text format basic_html': { label: 'Basic HTML posts', desc: 'Allowed to post using Basic HTML format' },
    'use text format full_html': { label: 'Full HTML posts', desc: 'Allowed to post using Full HTML format' },
    'view the administration theme': { label: 'View admin theme', desc: 'Use the admin theme interface' },
    'add post entities': { label: 'Create posts', desc: 'Write new posts in the feed' },
    'edit own post entities': { label: 'Edit own posts', desc: 'Modify posts you created' },
    'edit any post entities': { label: 'Edit any posts', desc: 'Modify posts created by others' },
    'delete own post entities': { label: 'Delete own posts', desc: 'Remove posts you created' },
    'delete any post entities': { label: 'Delete any posts', desc: 'Remove posts created by others' },
    'view published post entities': { label: 'View published posts', desc: 'See posts that are publicly visible' },
    'view unpublished post entities': { label: 'View unpublished posts', desc: 'See posts that are not yet published' },
    'view own unpublished post entities': { label: 'View own unpublished posts', desc: 'See your own drafts' },
    'create photo posts': { label: 'Create photo posts', desc: 'Share photos in the feed' },
    'access comments': { label: 'View comments', desc: 'Read comments on posts' },
    'post comments': { label: 'Post comments', desc: 'Write comments on posts' },
    'edit own comments': { label: 'Edit own comments', desc: 'Modify comments you wrote' },
    'edit any comments': { label: 'Edit any comments', desc: 'Modify comments written by others' },
    'delete own comments': { label: 'Delete own comments', desc: 'Remove comments you wrote' },
    'delete any comments': { label: 'Delete any comments', desc: 'Remove comments written by others' },
    'skip comment approval': { label: 'Skip comment approval', desc: 'Comments publish instantly without moderation' },
    'access group overview': { label: 'View group overview', desc: 'See the communities overview page' },
    'view group entities': { label: 'View groups', desc: 'Browse communities on the platform' },
    'view group content': { label: 'View group content', desc: 'See content inside groups' },
    'create group entities of bundle public_group': { label: 'Create public groups', desc: 'Start a public community' },
    'create group entities of bundle open_group': { label: 'Create open groups', desc: 'Start an open community' },
    'create group entities of bundle closed_group': { label: 'Create closed groups', desc: 'Start a closed community' },
    'create group entities of bundle secret_group': { label: 'Create secret groups', desc: 'Start a secret community' },
    'create group entities of bundle flexible_group': { label: 'Create flexible groups', desc: 'Start a flexible community' },
    'join groups': { label: 'Join groups', desc: 'Become a member of communities' },
    'leave groups': { label: 'Leave groups', desc: 'Leave communities you joined' },
    'manage group memberships': { label: 'Manage memberships', desc: 'Approve and manage group members' },
    'access group membership overview': { label: 'View memberships', desc: 'See who belongs to a group' },
    'create idea content': { label: 'Submit innovation ideas', desc: 'Create new entries in Innovation Ideas' },
    'edit own idea content': { label: 'Edit own ideas', desc: 'Modify ideas you submitted' },
    'edit any idea content': { label: 'Edit any ideas', desc: 'Modify ideas submitted by others' },
    'delete own idea content': { label: 'Delete own ideas', desc: 'Remove ideas you submitted' },
    'delete any idea content': { label: 'Delete any ideas', desc: 'Remove ideas submitted by others' },
    'create recognition content': { label: 'Give recognition', desc: 'Post recognitions for colleagues' },
    'edit own recognition content': { label: 'Edit own recognitions', desc: 'Modify recognitions you gave' },
    'edit any recognition content': { label: 'Edit any recognitions', desc: 'Modify recognitions given by others' },
    'delete own recognition content': { label: 'Delete own recognitions', desc: 'Remove recognitions you gave' },
    'delete any recognition content': { label: 'Delete any recognitions', desc: 'Remove recognitions given by others' },
    'flag follow_content': { label: 'Follow content', desc: 'Subscribe to content updates' },
    'unflag follow_content': { label: 'Unfollow content', desc: 'Stop following content' },
    'flag follow_user': { label: 'Follow members', desc: 'Follow other members' },
    'unflag follow_user': { label: 'Unfollow members', desc: 'Unfollow other members' },
    'flag report_content': { label: 'Report content', desc: 'Flag content for review' },
    'unflag report_content': { label: 'Cancel content report', desc: 'Withdraw a content report' },
    'flag report_comment': { label: 'Report comments', desc: 'Flag comments for review' },
    'unflag report_comment': { label: 'Cancel comment report', desc: 'Withdraw a comment report' },
    'flag report_post': { label: 'Report posts', desc: 'Flag posts for review' },
    'unflag report_post': { label: 'Cancel post report', desc: 'Withdraw a post report' },
    'create private_message entities': { label: 'Send private messages', desc: 'Start conversations with members' },
    'view own private_message entities': { label: 'View own messages', desc: 'Read your private messages' },
    'delete own private_message entities': { label: 'Delete own messages', desc: 'Remove your private messages' },
    'edit own private_message entities': { label: 'Edit own messages', desc: 'Modify your private messages' },
    'access social notifications': { label: 'View notifications', desc: 'Receive and open the notification bell' },
    'view own notification messages': { label: 'View own notifications', desc: 'See your own notification messages' },
    'access activity overview': { label: 'View activity feed', desc: 'See the activity log page' },
    'vote on content': { label: 'Vote on content', desc: 'Like and react to content' },
    'vote on events': { label: 'Vote on events', desc: 'Vote and react on events' },
    'vote on polls': { label: 'Vote on polls', desc: 'Answer polls' },
    'access own votes': { label: 'View own votes', desc: 'See your voting history' },
    'administer users': { label: 'Administer users', desc: 'Full control over member accounts' },
    'administer permissions': { label: 'Administer permissions', desc: 'Grant/revoke permissions on roles' },
    'administer roles': { label: 'Administer roles', desc: 'Create and manage roles' },
    'administer groups': { label: 'Administer groups', desc: 'Full control over communities' },
    'administer nodes': { label: 'Administer content', desc: 'Full control over all content' },
    'administer site configuration': { label: 'Administer site settings', desc: 'Change global site configuration' },
};

const PERMISSION_PRESETS = {
    'Employee': [
        'access content', 'access user profiles', 'search content', 'use text format basic_html',
        'add post entities', 'edit own post entities', 'delete own post entities',
        'view published post entities', 'view own unpublished post entities',
        'access comments', 'post comments', 'edit own comments', 'delete own comments',
        'access group overview', 'view group entities', 'join groups', 'leave groups',
        'create idea content', 'edit own idea content', 'delete own idea content',
        'create recognition content', 'edit own recognition content', 'delete own recognition content',
        'flag follow_content', 'unflag follow_content', 'flag follow_user', 'unflag follow_user',
        'create private_message entities', 'view own private_message entities',
        'access social notifications', 'view own notification messages', 'access activity overview',
        'vote on content', 'vote on polls', 'access own votes',
    ],
    'Administrator': Object.values(PERMISSION_CATALOG).flat(),
    'Moderator': [
        'access content', 'access user profiles', 'search content', 'use text format basic_html',
        'add post entities', 'edit own post entities', 'edit any post entities', 'delete any post entities',
        'view published post entities', 'view unpublished post entities',
        'access comments', 'post comments', 'edit own comments', 'edit any comments', 'delete own comments', 'delete any comments', 'skip comment approval',
        'access group overview', 'view group entities', 'join groups', 'leave groups',
        'create idea content', 'edit own idea content', 'edit any idea content', 'delete own idea content', 'delete any idea content',
        'create recognition content', 'edit own recognition content', 'edit any recognition content', 'delete own recognition content', 'delete any recognition content',
        'flag follow_content', 'unflag follow_content', 'flag follow_user', 'unflag follow_user',
        'flag report_content', 'unflag report_content', 'flag report_comment', 'unflag report_comment',
        'flag report_post', 'unflag report_post',
        'create private_message entities', 'view own private_message entities',
        'access social notifications', 'view own notification messages', 'access activity overview',
        'vote on content', 'vote on polls', 'access own votes',
    ],
};

export default function AdminPortal() {
    const { isMobile } = useResponsive();
    const [activeSectionId, setActiveSectionId] = useState('users');

    let activeConfig = null;
    ADMIN_SECTIONS.forEach(cat => {
        cat.items.forEach(item => {
            if (item.id === activeSectionId) activeConfig = item;
        });
    });

    const THEME = {
        bg: C.bg, card: C.card, text: C.heading, subtext: '#5b5394',
        border: C.border, primary: C.primary, primaryLight: C.primarySoft,
        danger: C.danger, dangerLight: C.dangerSoft,
    };

    return (
        <AppShell>
            <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', backgroundColor: THEME.card, padding: '24px 30px', borderRadius: '16px', border: `1px solid ${THEME.border}` }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: G.hero, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0 }}>
                        <Shield size={28} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '26px', color: THEME.text, fontWeight: 800 }}>Master Admin Portal</h1>
                        <p style={{ margin: 0, color: THEME.subtext, fontSize: '14px', marginTop: '6px' }}>Manage all JSON:API endpoints, system data, and architecture</p>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: isMobile ? '16px' : '24px', alignItems: 'flex-start', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <div style={{ width: isMobile ? '100%' : '280px', flexShrink: 0, position: isMobile ? 'static' : 'sticky', top: '20px', maxHeight: isMobile ? 'none' : 'calc(100vh - 40px)', overflowY: isMobile ? 'visible' : 'auto', overflowX: isMobile ? 'auto' : 'hidden', display: 'flex', flexDirection: isMobile ? 'row' : 'column', gap: '12px', paddingRight: isMobile ? 0 : 6, boxSizing: 'border-box', scrollbarWidth: 'thin' }}>
                        {ADMIN_SECTIONS.map((category, idx) => (
                            <div key={idx} style={{ backgroundColor: THEME.card, borderRadius: '16px', border: `1px solid ${THEME.border}`, overflow: 'hidden', minWidth: isMobile ? '260px' : 'auto', flexShrink: 0 }}>
                                <div style={{ padding: '12px 16px', backgroundColor: '#faf8ff', borderBottom: `1px solid ${THEME.border}`, fontSize: '12px', fontWeight: 800, color: THEME.subtext, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {category.icon} {category.category}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', padding: '8px' }}>
                                    {category.items.map(item => {
                                        const isActive = activeSectionId === item.id;
                                        return (
                                            <button key={item.id} onClick={() => setActiveSectionId(item.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '8px', border: 'none', background: isActive ? G.brand : 'transparent', color: isActive ? '#ffffff' : THEME.text, fontWeight: isActive ? 700 : 500, fontSize: '13px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', flexShrink: 0 }}>
                                                <span style={{ opacity: isActive ? 1 : 0.6 }}>{item.icon}</span>
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, backgroundColor: THEME.card, borderRadius: '16px', border: `1px solid ${THEME.border}`, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
                        {activeConfig ? (
                            <AdminDataTable key={activeSectionId} config={activeConfig} theme={THEME} />
                        ) : (
                            <div style={{ padding: '60px', textAlign: 'center', color: THEME.subtext }}>Select a category from the sidebar</div>
                        )}
                    </div>
                </div>
            </div>
        </AppShell>
    );
}

function parsePollBody(bodyVal) {
    if (!bodyVal) return null;
    let text = bodyVal.replace(/<[^>]*>/g, '');
    text = text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1) text = text.substring(start, end + 1);
    try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.isPoll) return parsed;
    } catch (e) { }
    return null;
}

function AdminDataTable({ config, theme }) {
    const { isMobile } = useResponsive();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [editingItem, setEditingItem] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editStatus, setEditStatus] = useState(true);
    const [activeThreadId, setActiveThreadId] = useState(null);
    const [viewingActionsFor, setViewingActionsFor] = useState(null);
    const [actionTimeframe, setActionTimeframe] = useState('Days');
    const [userActivityData, setUserActivityData] = useState({ loading: false, posts: [], likes: [], comments: [], groups: [] });
    const [permissionsFor, setPermissionsFor] = useState(null);
    const [permSelections, setPermSelections] = useState([]);
    const [permSaving, setPermSaving] = useState(false);
    const [permError, setPermError] = useState(null);

    // ---- CREATE USER (empty form + role assignment) ----
    const [creatingUser, setCreatingUser] = useState(false);
    const [createName, setCreateName] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createStatus, setCreateStatus] = useState(true);
    const [createSaving, setCreateSaving] = useState(false);
    const [rolesList, setRolesList] = useState([]);
    const [createRoles, setCreateRoles] = useState([]);

    const [toast, setToast] = useState(null);
    const toastTimer = useRef(null);

    const showToast = (message, type = 'success') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        setToast({ message, type });
        toastTimer.current = setTimeout(() => setToast(null), 4500);
    };

    useEffect(() => {
        if (!viewingActionsFor) return;
        const fetchUserActivity = async () => {
            setUserActivityData({ loading: true, posts: [], likes: [], comments: [], groups: [] });
            const uuid = viewingActionsFor.id;
            const name = viewingActionsFor.attributes?.name || viewingActionsFor.attributes?.display_name || 'anonymous';

            try {
                const postsRes = await fetch(`${API_BASE}/jsonapi/post/post?filter[uid.id]=${uuid}&sort=-created`);
                const postsData = postsRes.ok ? await postsRes.json() : { data: [] };

                const photoRes = await fetch(`${API_BASE}/jsonapi/post/photo?filter[uid.id]=${uuid}&sort=-created`);
                const photoData = photoRes.ok ? await photoRes.json() : { data: [] };

                let globalPosts = [];
                try {
                    const [allPostsRes, allPhotoRes, allRecRes, allIdeaRes, allEventRes, allPageRes] = await Promise.all([
                        fetch(`${API_BASE}/jsonapi/post/post`).catch(() => null),
                        fetch(`${API_BASE}/jsonapi/post/photo`).catch(() => null),
                        fetch(`${API_BASE}/jsonapi/node/recognition`).catch(() => null),
                        fetch(`${API_BASE}/jsonapi/node/idea`).catch(() => null),
                        fetch(`${API_BASE}/jsonapi/node/event`).catch(() => null),
                        fetch(`${API_BASE}/jsonapi/node/page`).catch(() => null)
                    ]);
                    const allPostsData = allPostsRes?.ok ? await allPostsRes.json() : { data: [] };
                    const allPhotoData = allPhotoRes?.ok ? await allPhotoRes.json() : { data: [] };
                    const allRecData = allRecRes?.ok ? await allRecRes.json() : { data: [] };
                    const allIdeaData = allIdeaRes?.ok ? await allIdeaRes.json() : { data: [] };
                    const allEventData = allEventRes?.ok ? await allEventRes.json() : { data: [] };
                    const allPageData = allPageRes?.ok ? await allPageRes.json() : { data: [] };

                    globalPosts = [
                        ...(allPostsData.data || []),
                        ...(allPhotoData.data || []),
                        ...(allRecData.data || []),
                        ...(allIdeaData.data || []),
                        ...(allEventData.data || []),
                        ...(allPageData.data || [])
                    ];
                } catch (e) { }

                let mappedComments = [];
                try {
                    const commentsRes = await fetch(`${API_BASE}/jsonapi/comment/post_comment?filter[uid.id]=${uuid}&sort=-created`);
                    const commentsData = commentsRes.ok ? await commentsRes.json() : { data: [] };
                    mappedComments = (commentsData.data || []).map(c => {
                        const targetId = c.relationships?.entity_id?.data?.id;
                        const targetPost = globalPosts.find(p => p.id === targetId);
                        return { ...c, targetPost };
                    });
                } catch (e) { }

                let likesData = [];
                try {
                    const likesRes = await fetch(`${API_BASE}/likes_proxy.php`);
                    if (likesRes.ok) {
                        const proxyJson = await likesRes.json();
                        const userLikes = (proxyJson.data || []).filter(l =>
                            (l.attributes?.username?.toLowerCase() === name.toLowerCase()) ||
                            (name === 'admin' && l.attributes?.username === 'admin')
                        );
                        likesData = userLikes.map(l => {
                            const targetId = l.relationships?.entity_id?.data?.id;
                            const targetPost = globalPosts.find(p => p.id === targetId);
                            return { ...l, targetPost };
                        });
                    }
                } catch (e) { }

                let groupsData = [];
                try {
                    const groupRes = await fetch(`${API_BASE}/jsonapi/group/public_group?filter[uid.id]=${uuid}&sort=-created`);
                    if (groupRes.ok) groupsData = (await groupRes.json()).data || [];
                } catch (e) { }

                let extraPosts = [];
                try {
                    const recRes = await fetch(`${API_BASE}/jsonapi/node/recognition?filter[uid.id]=${uuid}&sort=-created`);
                    if (recRes.ok) extraPosts.push(...((await recRes.json()).data || []));
                } catch (e) { }
                try {
                    const ideaRes = await fetch(`${API_BASE}/jsonapi/node/idea?filter[uid.id]=${uuid}&sort=-created`);
                    if (ideaRes.ok) extraPosts.push(...((await ideaRes.json()).data || []));
                } catch (e) { }

                setUserActivityData({
                    loading: false,
                    posts: [...(postsData.data || []), ...(photoData.data || []), ...extraPosts],
                    likes: likesData || [],
                    comments: mappedComments || [],
                    groups: groupsData || []
                });
            } catch (e) {
                console.error("Failed to fetch user activity", e);
                setUserActivityData(prev => ({ ...prev, loading: false }));
            }
        };
        fetchUserActivity();
    }, [viewingActionsFor]);

    const parseCreated = (item) => {
        const raw = item?.attributes?.created ?? item?.created ?? null;
        if (raw === null || raw === undefined || raw === '') {
            if (item?.type?.startsWith('vote--')) return new Date();
            return null;
        }
        const s = String(raw);
        if (/^\d{9,11}$/.test(s)) return new Date(Number(s) * 1000);
        if (/^\d{12,14}$/.test(s)) return new Date(Number(s));
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d;
    };

    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const getItemsByTime = (items, timeframe) => {
        const now = new Date();
        const today = startOfDay(now);
        const dow = (now.getDay() + 6) % 7;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - dow);
        const lastWeekStart = new Date(weekStart);
        lastWeekStart.setDate(weekStart.getDate() - 7);
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        return items.filter(item => {
            const d = parseCreated(item);
            if (!d) return timeframe === 'All Time';
            const day = startOfDay(d);
            switch (timeframe) {
                case 'Today': return day.getTime() === today.getTime();
                case 'Yesterday': return day.getTime() === today.getTime() - 86400000;
                case 'This Week': return day >= weekStart && day <= today;
                case 'Last Week': return day >= lastWeekStart && day < weekStart;
                case 'This Month': return day >= monthStart && day <= today;
                case 'All Time': return true;
                default: return false;
            }
        });
    };

    const getPrimaryAttrKey = (item) => {
        if (!item) return null;
        // For users always use 'name' as primary key (even if API omitted it)
        if (item.type === 'user--user') return 'name';
        const attrs = item.attributes || {};
        if (attrs.name !== undefined) return 'name';
        if (attrs.title !== undefined) return 'title';
        if (attrs.display_name !== undefined) return 'display_name';
        if (attrs.label !== undefined) return 'label';
        return null;
    };

    const openEditModal = (item) => {
        const attrs = item.attributes || {};
        const primaryKey = getPrimaryAttrKey(item);
        setEditValue(primaryKey ? (attrs[primaryKey] ?? '') : '');
        setEditEmail(attrs.mail || '');
        // Treat missing status as active (true) for users
        if (attrs.status !== undefined && attrs.status !== null) {
            setEditStatus(attrs.status === true || attrs.status === 1 || attrs.status === '1');
        } else {
            setEditStatus(true);
        }
        setEditingItem(item);
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!editingItem) return;

        try {
            const csrfRes = await fetch(`${API_BASE}/session/token`, { credentials: 'include' });
            let csrfToken = '';
            if (csrfRes.ok) csrfToken = (await csrfRes.text()).trim();

            const attrs = {};
            const primaryKey = getPrimaryAttrKey(editingItem);
            if (primaryKey && editValue) attrs[primaryKey] = editValue;
            // Always send mail and status for users
            if (editingItem.type === 'user--user' || editingItem.attributes?.mail !== undefined) {
                if (editEmail) attrs.mail = editEmail;
            }
            if (editingItem.type === 'user--user' || editingItem.attributes?.status !== undefined) {
                attrs.status = editStatus ? 1 : 0;
            }

            // Helper: sync status to localStorage so login blocked-check works immediately
            // Uses upsert: if user not found in localStorage, adds them with correct status
            const syncToLocalStorage = (nameVal, emailVal, statusActive) => {
                if (typeof window === 'undefined' || !nameVal) return;
                try {
                    const stored = localStorage.getItem('openserver_users_v2');
                    const userList = stored ? JSON.parse(stored) : [];
                    const idx = userList.findIndex(u => u.name?.toLowerCase() === nameVal.toLowerCase());
                    if (idx >= 0) {
                        // Update existing entry
                        userList[idx] = { ...userList[idx], status: statusActive ? 'Active' : 'Blocked' };
                    } else {
                        // Add new entry (user existed in Drupal but never logged into the Next.js app)
                        userList.push({
                            id: 'u-drupal-' + editingItem.id.substring(0, 8),
                            name: nameVal,
                            email: emailVal || `${nameVal.toLowerCase()}@example.com`,
                            role: 'Employee',
                            status: statusActive ? 'Active' : 'Blocked',
                            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
                        });
                    }
                    localStorage.setItem('openserver_users_v2', JSON.stringify(userList));
                } catch (e) { }
            };

            const res = await fetch(`${API_BASE}${config.endpoint}/${editingItem.id}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    data: { type: editingItem.type, id: editingItem.id, attributes: attrs }
                })
            });

            if (res.ok) {
                const responseJson = await res.json();
                const updatedItem = responseJson.data;
                setData(prevData => prevData.map(item =>
                    item.id === editingItem.id ? updatedItem : item
                ));
                // Sync to localStorage for login gate
                if (editingItem.type === 'user--user') {
                    syncToLocalStorage(attrs.name || editingItem.attributes?.name, attrs.mail || editingItem.attributes?.mail, editStatus);
                }
                setEditingItem(null);
                showToast(editStatus
                    ? `✅ User "${attrs.name || editingItem.attributes?.name}" is now Active.`
                    : `🚫 User "${attrs.name || editingItem.attributes?.name}" has been Blocked — login will be denied.`
                );
            } else {
                const errJson = await res.json().catch(() => null);
                const errMsg = errJson?.errors?.[0]?.detail || `Server returned status ${res.status}`;

                // Even if Drupal PATCH fails, still sync blocked status locally so the login gate works
                if (editingItem.type === 'user--user') {
                    syncToLocalStorage(editValue || editingItem.attributes?.name, editEmail || editingItem.attributes?.mail, editStatus);
                    setData(prevData => prevData.map(item =>
                        item.id === editingItem.id
                            ? { ...item, attributes: { ...item.attributes, status: editStatus ? 1 : 0, name: editValue || item.attributes?.name, mail: editEmail || item.attributes?.mail } }
                            : item
                    ));
                    setEditingItem(null);
                    showToast(editStatus
                        ? `✅ User "${editValue || editingItem.attributes?.name}" marked Active locally (Drupal sync failed: ${errMsg}).`
                        : `🚫 User "${editValue || editingItem.attributes?.name}" Blocked locally — login denied immediately. (Drupal sync failed: ${errMsg})`
                    );
                } else {
                    showToast(`Error saving edits: ${errMsg}`, 'error');
                }
            }
        } catch (err) {
            showToast(`Network error while saving edits: ${err.message}`, 'error');
        }
    };

    /* ---- Load Drupal roles for the Create User modal ---- */
    const fetchRoles = async () => {
        let roles = [];
        try {
            const proxyRes = await fetch(`${API_BASE}/roles_proxy.php`, { credentials: 'include' });
            if (proxyRes.ok) roles = (await proxyRes.json()).data || [];
        } catch (e) { }
        if (!roles.length) {
            try {
                const res = await fetch(`${API_BASE}/jsonapi/user_role/user_role`, { credentials: 'include' });
                if (res.ok) roles = (await res.json()).data || [];
            } catch (e) { }
        }
        roles = (roles || []).filter(r => {
            const internal = String(r.attributes?.drupal_internal__id || '').toLowerCase();
            return internal !== 'anonymous' && internal !== 'authenticated';
        });
        setRolesList(roles);
    };

    useEffect(() => {
        if (creatingUser && rolesList.length === 0) fetchRoles();
    }, [creatingUser]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const name = createName.trim();
        if (!name) { showToast('Username is required.', 'error'); return; }
        setCreateSaving(true);
        try {
            const csrfRes = await fetch(`${API_BASE}/session/token`, { credentials: 'include' });
            let csrfToken = '';
            if (csrfRes.ok) csrfToken = (await csrfRes.text()).trim();

            const attrs = {
                name,
                mail: createEmail.trim() || `${name.toLowerCase()}@example.com`,
                status: createStatus ? 1 : 0,
            };
            if (createPassword) attrs.pass = createPassword;

            const payload = { type: 'user--user', attributes: attrs };
            if (createRoles.length > 0) {
                payload.relationships = {
                    roles: { data: createRoles.map(id => ({ type: 'user_role--user_role', id })) }
                };
            }

            const res = await fetch(`${API_BASE}/jsonapi/user/user`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({ data: payload })
            });

            if (res.ok) {
                const json = await res.json();
                if (json?.data) setData(prev => [...prev, json.data]);
                setCreatingUser(false);
                setCreateName('');
                setCreateEmail('');
                setCreatePassword('');
                setCreateStatus(true);
                setCreateRoles([]);
                showToast(`User "${name}" created successfully! ✅`);
            } else {
                const errJson = await res.json().catch(() => null);
                const detail = errJson?.errors?.[0]?.detail || errJson?.errors?.[0]?.title || `Server returned status ${res.status}`;
                showToast(`Failed to create user: ${detail} — make sure you are logged into Drupal as an administrator!`, 'error');
            }
        } catch (err) {
            showToast(`Network error while creating user: ${err.message}`, 'error');
        } finally {
            setCreateSaving(false);
        }
    };

    const openPermissions = (role) => {
        const current = Array.isArray(role.attributes?.permissions)
            ? role.attributes.permissions
            : [];
        setPermissionsFor(role);
        setPermSelections(current);
        setPermError(null);
    };

    const savePermissions = async () => {
        if (!permissionsFor) return;
        setPermSaving(true);
        setPermError(null);
        try {
            const roleUuid = permissionsFor.id;
            const roleId = permissionsFor.attributes?.drupal_internal__id || roleUuid;

            const csrfRes = await fetch(`${API_BASE}/session/token`, { credentials: 'include' });
            let csrfToken = '';
            if (csrfRes.ok) csrfToken = (await csrfRes.text()).trim();

            const res = await fetch(`${API_BASE}/roles_proxy.php/${roleUuid}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                body: JSON.stringify({
                    data: { attributes: { permissions: permSelections } }
                })
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => null);
                throw new Error(errJson?.errors?.[0]?.detail || errJson?.error || `Server returned status ${res.status}`);
            }

            const saved = await res.json();
            const updatedPermissions = saved.data?.attributes?.permissions || permSelections;

            setData(prevData => prevData.map(item =>
                item.id === permissionsFor.id
                    ? { ...item, attributes: { ...item.attributes, permissions: updatedPermissions } }
                    : item
            ));
            setPermissionsFor(null);
            showToast(`Permissions saved for role "${roleId}" (${updatedPermissions.length} granted) — stored in database ✅`);
        } catch (err) {
            let msg = err.message;
            if (/NetworkError|Failed to fetch/i.test(msg)) {
                msg = `Could not reach roles_proxy.php on ${API_URL}. Make sure the file exists in the Drupal web root. (` + msg + ')';
            }
            setPermError(msg);
            showToast(`Failed to save permissions: ${msg}`, 'error');
        } finally {
            setPermSaving(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        setData([]);
        if (config.id === 'private_messages') {
            try {
                const res = await fetch(`${API_BASE}/jsonapi/private_message_thread/private_message_thread?include=private_messages,private_messages.owner,members&page[limit]=100`, {
                    credentials: 'include',
                    headers: { Accept: 'application/vnd.api+json' }
                });
                if (res.ok) {
                    const json = await res.json();
                    const userName = {};
                    const msgById = {};
                    (json.included || []).forEach((i) => {
                        if (i.type === 'user--user') {
                            userName[i.id] = i.attributes?.name || i.attributes?.display_name || 'User';
                        }
                        if (i.type === 'private_message--private_message') {
                            const msgVal = typeof i.attributes?.message === 'object' ? i.attributes?.message?.value : i.attributes?.message;
                            msgById[i.id] = {
                                id: i.id,
                                text: msgVal || '',
                                ownerId: i.relationships?.owner?.data?.id,
                                created: i.attributes?.created
                            };
                        }
                    });

                    const parsedThreads = (json.data || []).map((t) => {
                        const memberIds = (t.relationships?.members?.data || []).map((m) => m.id);
                        const memberNames = memberIds.map((id) => userName[id] || 'User');
                        const threadMsgs = (t.relationships?.private_messages?.data || [])
                            .map((d) => msgById[d.id])
                            .filter(Boolean)
                            .sort((a, b) => (a.created || '').localeCompare(b.created || ''))
                            .map((m) => ({
                                id: m.id,
                                sender: userName[m.ownerId] || 'User',
                                text: m.text,
                                time: m.created ? new Date(m.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'
                            }));

                        return {
                            id: t.id,
                            members: memberNames.join(' · '),
                            lastUpdated: t.attributes?.updated ? new Date(t.attributes.updated).toLocaleString() : 'Recently',
                            msgs: threadMsgs,
                            raw: t
                        };
                    });

                    parsedThreads.sort((a, b) => (b.raw.attributes?.updated || '').localeCompare(a.raw.attributes?.updated || ''));
                    setData(parsedThreads);
                    if (parsedThreads.length > 0) setActiveThreadId(parsedThreads[0].id);
                } else {
                    setError(`Failed to load threads: ${res.statusText}`);
                }
            } catch (e) {
                setError(e.message);
            }
            setLoading(false);
            return;
        }
        try {
            let url = `${API_BASE}${config.endpoint}?page[limit]=50`;
            const needsUid = ['events', 'polls', 'comments_post', 'groups_public', 'groups_open', 'groups_closed', 'groups_secret', 'groups_flexible', 'notifications'];
            const needsUserId = ['posts_text', 'posts_photo'];

            if (config.id === 'posts_photo') url += '&include=field_post_image,user_id';
            else if (config.id === 'posts_text') url += '&include=user_id';
            else if (needsUid.includes(config.id)) url += '&include=uid';

            const res = await fetch(url, { credentials: 'include' });

            let apiData = [];
            let likesMap = {};
            let dislikesMap = {};
            let votesMap = {};

            if (config.id === 'posts_text' || config.id === 'posts_photo' || config.id === 'polls') {
                try {
                    const [likesRes, dislikesRes] = await Promise.all([
                        fetch(`${API_BASE}/likes_proxy.php`, { credentials: 'include' }),
                        fetch(`${API_BASE}/jsonapi/vote/dislike`, { credentials: 'include' })
                    ]);
                    if (likesRes.ok) {
                        const json = await likesRes.json();
                        json.data?.forEach(like => {
                            const entityId = like.relationships?.entity_id?.data?.id;
                            if (entityId) likesMap[entityId] = (likesMap[entityId] || 0) + 1;
                        });
                    }
                    if (dislikesRes.ok) {
                        const json = await dislikesRes.json();
                        json.data?.forEach(dislike => {
                            const entityId = dislike.relationships?.entity_id?.data?.id;
                            if (entityId) dislikesMap[entityId] = (dislikesMap[entityId] || 0) + 1;
                        });
                    }
                } catch (e) {
                    console.error('Error fetching reactions', e);
                }
            }

            if (config.id === 'polls') {
                try {
                    const votesRes = await fetch(`${API_BASE}/jsonapi/vote/vote`, { credentials: 'include' });
                    if (votesRes.ok) {
                        const json = await votesRes.json();
                        json.data?.forEach(vote => {
                            const pollId = vote.relationships?.entity_id?.data?.id;
                            const optionIdx = vote.attributes?.value;
                            if (pollId && optionIdx !== undefined && optionIdx !== null) {
                                if (!votesMap[pollId]) votesMap[pollId] = {};
                                votesMap[pollId][optionIdx] = (votesMap[pollId][optionIdx] || 0) + 1;
                            }
                        });
                    }
                } catch (e) {
                    console.error('Error fetching poll votes', e);
                }
            }

            if (res.ok) {
                const json = await res.json();
                const dataArr = json.data || [];
                const included = json.included || [];

                const userMap = {};
                included.forEach(inc => {
                    if (inc.type === 'user--user') {
                        userMap[inc.id] = inc.attributes?.display_name || inc.attributes?.name || 'A user';
                    }
                });

                const mapped = dataArr.map(item => {
                    const baseItem = { ...item };
                    const authorId = item.relationships?.uid?.data?.id || item.relationships?.user_id?.data?.id;
                    if (authorId) {
                        if (userMap[authorId]) {
                            baseItem.authorName = userMap[authorId];
                        } else {
                            baseItem.authorName = 'System';
                        }
                    }

                    if (config.id === 'posts_text' || config.id === 'posts_photo' || config.id === 'polls') {
                        baseItem.likesCount = likesMap[item.id] || 0;
                        baseItem.dislikesCount = dislikesMap[item.id] || 0;
                    }

                    if (config.id === 'polls') {
                        const bodyVal = item.attributes?.body?.value || '';
                        let options = [];
                        let winningOption = null;
                        let maxVotes = -1;
                        let totalVotes = 0;

                        const parsed = parsePollBody(bodyVal);
                        if (parsed) options = parsed.options || [];

                        const pollVotes = votesMap[item.id] || {};
                        const optionsWithVotes = options.map((optText, idx) => {
                            const votes = pollVotes[idx] || 0;
                            totalVotes += votes;
                            if (votes > maxVotes) {
                                maxVotes = votes;
                                winningOption = `${optText} (${votes} votes)`;
                            } else if (votes === maxVotes && votes > 0) {
                                winningOption += `, ${optText} (${votes} votes)`;
                            }
                            return { text: optText, votes };
                        });

                        return {
                            ...baseItem,
                            options: optionsWithVotes,
                            totalVotes,
                            winningOption: totalVotes > 0 ? winningOption : 'No votes yet'
                        };
                    }
                    return baseItem;
                });

                if (config.id === 'posts_photo') {
                    const fileMap = {};
                    included.forEach(inc => {
                        if (inc.type === 'file--file' && inc.attributes?.uri?.url) {
                            let fUrl = inc.attributes.uri.url;
                            if (fUrl.startsWith('/system/files/') || fUrl.startsWith('/sites/default/files/styles/')) {
                                fUrl = '/index.php' + fUrl;
                            }
                            fileMap[inc.id] = fUrl.startsWith('http') ? fUrl : `${API_BASE}${fUrl}`;
                        }
                    });

                    apiData = mapped.map(item => {
                        const fileRel = item.relationships?.field_post_image?.data;
                        const fileId = Array.isArray(fileRel) ? fileRel[0]?.id : fileRel?.id;
                        return { ...item, image: fileId ? fileMap[fileId] : null };
                    });
                } else if (config.id === 'events') {
                    apiData = mapped.map(item => ({ ...item, image: item.attributes?.field_event_image || null }));
                } else {
                    apiData = mapped;
                }
            }

            let localData = [];
            try {
                if (typeof window !== 'undefined') {
                    if (config.id === 'posts_text' || config.id === 'posts_photo' || config.id === 'comments_post' || config.id === 'likes' || config.id === 'dislikes' || config.id === 'polls' || config.id === 'events') {
                        const localPosts = JSON.parse(localStorage.getItem('openserver_posts_v2') || '[]');

                        if (config.id === 'posts_text') {
                            localData = localPosts.filter(p => !p.id.startsWith('db-post-') && (p.apiType === 'post--post' || !p.image)).map(p => ({
                                id: p.id, type: 'post--post',
                                attributes: { field_post: { value: p.content }, status: 1, created: p.time || new Date().toISOString() },
                                likesCount: p.likesCount || 0, dislikesCount: p.dislikesCount || 0,
                                authorName: p.author || 'Admin'
                            }));
                        } else if (config.id === 'posts_photo') {
                            localData = localPosts.filter(p => p.image).map(p => ({
                                id: p.id, type: 'post--photo',
                                attributes: { field_post: { value: p.content }, status: 1, created: p.time || new Date().toISOString() },
                                image: p.image, likesCount: p.likesCount || 0, dislikesCount: p.dislikesCount || 0,
                                authorName: p.author || 'Admin'
                            }));
                        } else if (config.id === 'comments_post') {
                            localPosts.forEach(p => {
                                if (p.comments) {
                                    p.comments.forEach(c => {
                                        localData.push({
                                            id: c.id, type: 'comment--post_comment',
                                            attributes: { field_comment_body: { value: c.text }, comment_body: { value: c.text }, author_name: c.author, subject: `Comment by ${c.author}`, status: 1, created: new Date().toISOString() },
                                            relationships: { entity_id: { data: { type: p.apiType || 'post--post', id: p.id } } },
                                            authorName: c.author || 'Admin'
                                        });
                                    });
                                }
                            });
                        } else if (config.id === 'likes') {
                            localPosts.forEach(p => {
                                if (p.likesCount > 0) {
                                    for (let i = 0; i < p.likesCount; i++) {
                                        localData.push({
                                            id: `like-${p.id}-${i}`, type: 'vote--like',
                                            attributes: { value: 1, status: 1, created: new Date().toISOString() },
                                            relationships: { entity_id: { data: { type: p.apiType || 'post--post', id: p.id } } }
                                        });
                                    }
                                }
                            });
                        } else if (config.id === 'dislikes') {
                            localPosts.forEach(p => {
                                if (p.dislikesCount > 0) {
                                    for (let i = 0; i < p.dislikesCount; i++) {
                                        localData.push({
                                            id: `dislike-${p.id}-${i}`, type: 'vote--dislike',
                                            attributes: { value: -1, status: 1, created: new Date().toISOString() },
                                            relationships: { entity_id: { data: { type: p.apiType || 'post--post', id: p.id } } }
                                        });
                                    }
                                }
                            });
                        } else if (config.id === 'polls') {
                            const localPolls = JSON.parse(localStorage.getItem('openserver_polls_v2') || '[]');
                            localData = localPolls.map(p => {
                                let winningOption = null;
                                let maxVotes = -1;
                                let totalVotes = 0;
                                const opts = p.options || [];
                                opts.forEach(opt => {
                                    totalVotes += opt.votes;
                                    if (opt.votes > maxVotes) {
                                        maxVotes = opt.votes;
                                        winningOption = `${opt.text} (${opt.votes} votes)`;
                                    } else if (opt.votes === maxVotes && opt.votes > 0) {
                                        winningOption += `, ${opt.text} (${opt.votes} votes)`;
                                    }
                                });
                                return {
                                    id: p.id, type: 'node--page',
                                    attributes: {
                                        title: p.question,
                                        body: { value: JSON.stringify({ isPoll: true, category: p.category, options: opts.map(o => o.text) }) },
                                        status: 1, created: new Date().toISOString()
                                    },
                                    options: opts, totalVotes,
                                    winningOption: totalVotes > 0 ? winningOption : 'No votes yet'
                                };
                            });
                        } else if (config.id === 'events') {
                            const localEvents = (JSON.parse(localStorage.getItem('openserver_events_calendar_v4') || '[]'))
                                .filter(e => e.id !== 'evt-101' && e.id !== 'evt-102' && e.id !== 'evt-103');
                            localData = localEvents.map(e => ({
                                id: e.id, type: 'node--event',
                                attributes: {
                                    title: e.title, body: { value: e.description }, field_location: e.location,
                                    field_event_image: e.image, status: 1,
                                    created: e.fullDate ? new Date(e.fullDate).toISOString() : new Date().toISOString()
                                },
                                image: e.image,
                                authorName: e.organizer || 'Admin'
                            }));
                        }
                    } else if (config.id === 'notifications') {
                        const localLogs = JSON.parse(localStorage.getItem('openserver_logs_v2') || '[]');
                        localData = localLogs.map(l => ({
                            id: l.id, type: 'message--message',
                            attributes: { message: `${l.user} ${l.action} ${l.target || ''}`, status: 1, created: l.timestamp || new Date().toISOString() }
                        }));
                    } else if (config.id === 'users' && apiData.length === 0) {
                        localData = [{
                            id: 'user-admin', type: 'user--user',
                            attributes: { name: 'admin', mail: 'admin@example.com', status: 1, created: new Date().toISOString() }
                        }];
                    }
                }
            } catch (e) {
                console.error('Error loading fallback local storage data', e);
            }

            const apiIds = new Set(apiData.map(item => item.id));
            const mergedData = [...apiData];
            localData.forEach(item => { if (!apiIds.has(item.id)) mergedData.push(item); });

            setData(mergedData);
        } catch (err) {
            setError(`Network Error: Cannot connect to ${config.endpoint}`);
            setData([]);
        }
        setLoading(false);
    };

    useEffect(() => {
        setActiveThreadId(null);
        fetchData();
    }, [config.id]);

    const handleDelete = async (id, item) => {
        const label = item?.attributes?.name || item?.attributes?.title || item?.attributes?.label || 'this record';
        if (!confirm(`Delete "${label}"?\n\nThis will permanently remove it. Are you sure?`)) return;

        // Helper to remove from localStorage (users)
        const removeFromLocalStorage = (nameVal) => {
            if (typeof window === 'undefined' || !nameVal) return;
            try {
                const stored = localStorage.getItem('openserver_users_v2');
                if (!stored) return;
                const userList = JSON.parse(stored);
                const updated = userList.filter(u => u.name?.toLowerCase() !== nameVal.toLowerCase());
                localStorage.setItem('openserver_users_v2', JSON.stringify(updated));
            } catch (e) { }
        };

        try {
            const csrfRes = await fetch(`${API_BASE}/session/token`, { credentials: 'include' });
            let csrfToken = '';
            if (csrfRes.ok) csrfToken = (await csrfRes.text()).trim();

            let res = await fetch(`${API_BASE}${config.endpoint}/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: {
                    'Accept': 'application/vnd.api+json',
                    'Content-Type': 'application/vnd.api+json',
                    'X-CSRF-Token': csrfToken
                }
            });

            if (res.ok) {
                // Drupal DELETE succeeded
                setData(prev => prev.filter(d => d.id !== id));
                if (config.id === 'users') removeFromLocalStorage(item?.attributes?.name);
                showToast(`🗑️ "${label}" deleted from database successfully!`);
                return;
            }

            // Drupal rejected DELETE — try local removal + block for users
            if (config.id === 'users') {
                // Try to block via PATCH as fallback
                const patchRes = await fetch(`${API_BASE}${config.endpoint}/${id}`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/vnd.api+json',
                        'Content-Type': 'application/vnd.api+json',
                        'X-CSRF-Token': csrfToken
                    },
                    body: JSON.stringify({
                        data: { type: 'user--user', id: id, attributes: { status: 0 } }
                    })
                });

                // Always remove from the UI and localStorage regardless of PATCH result
                setData(prev => prev.filter(d => d.id !== id));
                removeFromLocalStorage(item?.attributes?.name);

                if (patchRes.ok) {
                    showToast(`🚫 "${label}" removed from view and blocked (Drupal prevented full deletion — account has been disabled and cannot log in).`);
                } else {
                    showToast(`🗑️ "${label}" removed from Admin view. Note: Drupal may still have this account — log into Drupal admin to fully delete.`);
                }
                return;
            }

            // For non-user records: remove from UI locally even if Drupal rejected
            let errorDetail = 'Unknown Error';
            try {
                const errJson = await res.json();
                if (errJson.errors && errJson.errors.length > 0) {
                    errorDetail = errJson.errors[0].detail || errJson.errors[0].title;
                }
            } catch (e) {
                errorDetail = res.statusText;
            }

            // Still remove from UI for smooth UX
            setData(prev => prev.filter(d => d.id !== id));
            showToast(`🗑️ Removed from view. Note: Drupal rejected server-side delete (${res.status}): ${errorDetail} — log into Drupal as admin to fully delete.`);

        } catch (err) {
            // Network error — still remove from UI locally
            setData(prev => prev.filter(d => d.id !== id));
            if (config.id === 'users') removeFromLocalStorage(item?.attributes?.name);
            showToast(`🗑️ "${label}" removed locally. (Drupal unreachable: ${err.message})`);
        }
    };

    const extractTitle = (item) => {
        if (!item) return 'Untitled/Unknown';
        const attrs = item.attributes || {};
        if (item.type?.startsWith('vote--')) {
            const targetType = item.relationships?.entity_id?.data?.type || 'content';
            const targetId = item.relationships?.entity_id?.data?.id?.substring(0, 8) || 'unknown';
            return `Reaction on ${targetType} (${targetId})`;
        }
        if (item.type?.startsWith('comment--')) {
            const author = attrs.author_name || attrs.name || (attrs.subject?.startsWith('Comment by ') ? attrs.subject.replace('Comment by ', '') : 'Member');
            const commentText = attrs.field_comment_body?.value || attrs.comment_body?.value || attrs.subject || 'Empty Comment';
            const targetType = item.relationships?.entity_id?.data?.type || 'content';
            const targetId = item.relationships?.entity_id?.data?.id?.substring(0, 8) || 'unknown';
            return `[${author}]: "${commentText}" (on ${targetType} ID: ${targetId})`;
        }
        if (item.type === 'node--page') {
            const bodyVal = attrs.body?.value || '';
            const parsed = parsePollBody(bodyVal);
            if (parsed) return `Poll: "${attrs.title || 'Untitled Poll'}"`;
            return `Page: "${attrs.title || 'Untitled'}"`;
        }
        if (item.type?.startsWith('private_message--')) {
            const msgVal = typeof attrs.message === 'object' ? attrs.message?.value : attrs.message;
            return `Direct Message: "${msgVal || 'Empty Message'}"`;
        }
        if (item.type?.startsWith('activity')) {
            const actionText = attrs.field_activity_output_text?.value || attrs.field_activity_message?.value || attrs.message || 'performed an action on the platform';
            const actorStr = item.relationships?.actor?.data?.id ? `[User ${item.relationships.actor.data.id.substring(0, 6)}]` : 'User';
            return `${actorStr} ${actionText.replace(/(<([^>]+)>)/gi, "")}`;
        }
        return attrs.name || attrs.title || attrs.subject || attrs.display_name || attrs.label ||
            attrs.field_post?.value || attrs.field_comment_body?.value || attrs.comment_body?.value ||
            attrs.body?.value || (typeof attrs.message === 'object' ? attrs.message?.value : attrs.message) || 'Untitled/Unknown';
    };

    const extractStatus = (item) => {
        const attrs = item.attributes || {};
        // For users, treat missing status as Active (Drupal may not expose it without auth)
        if (item.type === 'user--user') {
            if (attrs.status === undefined || attrs.status === null) return 'Active';
            return (attrs.status === true || attrs.status === 1 || attrs.status === '1') ? 'Active' : 'Blocked';
        }
        if (attrs.status !== undefined && attrs.status !== null) {
            return (attrs.status === true || attrs.status === 1 || attrs.status === '1') ? 'Active' : 'Blocked';
        }
        return null;
    };

    const extractDate = (item) => {
        const created = item.attributes?.created;
        if (!created) return '-';
        return new Date(created).toLocaleDateString();
    };

    const filteredData = data.filter(item => {
        if (!searchQuery) return true;
        const searchStr = extractTitle(item).toLowerCase();
        return searchStr.includes(searchQuery.toLowerCase()) || item.id.includes(searchQuery.toLowerCase());
    });

    const hideStatusColumn = config.id === 'roles';

    const renderActivitySection = (timeframe, label) => {
        if (userActivityData.loading) return <div style={{ padding: '16px', color: theme.subtext }}>Loading real-time backend data...</div>;

        const posts = getItemsByTime(userActivityData.posts, timeframe);
        const likes = getItemsByTime(userActivityData.likes, timeframe);
        const comments = getItemsByTime(userActivityData.comments, timeframe);
        const groups = getItemsByTime(userActivityData.groups, timeframe);

        if (posts.length === 0 && likes.length === 0 && comments.length === 0 && groups.length === 0) {
            return (
                <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                    <strong style={{ fontSize: '15px' }}>{label}</strong>
                    <div style={{ marginTop: '12px', fontSize: '13px', color: theme.subtext }}>No activity logged by this user for this timeframe.</div>
                </div>
            );
        }

        return (
            <div style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '12px', border: `1px solid ${theme.border}` }}>
                <strong style={{ fontSize: '15px' }}>{label}</strong>
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {posts.length > 0 && (
                        <div style={{ fontSize: '13px', color: theme.subtext }}>
                            <strong>Posts/Ideas/Recognitions:</strong> {posts.map(p => `"${p.attributes?.title || p.attributes?.field_post?.value || 'Untitled'}"`).join(', ')}
                        </div>
                    )}
                    {likes.length > 0 && (
                        <div style={{ fontSize: '13px', color: theme.subtext }}>
                            <strong>Liked:</strong> {likes.map(l => {
                                const title = l.targetPost?.attributes?.field_post?.value || l.targetPost?.attributes?.title;
                                const typeStr = (l.relationships?.entity_id?.data?.type || '').replace('--', ' ').replace('_', ' ');
                                return `"${title || typeStr || 'Unknown Post'}"`;
                            }).join(', ')}
                        </div>
                    )}
                    {comments.length > 0 && (
                        <div style={{ fontSize: '13px', color: theme.subtext }}>
                            <strong>Comments Made:</strong> {comments.map(c => {
                                const body = c.attributes?.field_comment_body?.value || c.attributes?.subject || 'Comment';
                                const targetTitle = c.targetPost?.attributes?.field_post?.value || c.targetPost?.attributes?.title || 'Unknown Post';
                                return `"${body}" on "${targetTitle}"`;
                            }).join(', ')}
                        </div>
                    )}
                    {groups.length > 0 && (
                        <div style={{ fontSize: '13px', color: theme.subtext }}>
                            <strong>Groups Created/Joined:</strong> {groups.map(g => `"${g.attributes?.label || g.attributes?.title || 'Group'}"`).join(', ')}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

            {/* Table Header */}
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.text }}>{config.label}</h2>
                    <div style={{ fontSize: '12px', color: theme.subtext, marginTop: '4px', fontFamily: 'monospace' }}>GET {config.endpoint}</div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {config.id === 'users' && (
                        <button onClick={() => setCreatingUser(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: 'none', background: theme.primary, color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                            <UserPlus size={14} /> Create User
                        </button>
                    )}
                    <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                            <Search size={14} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ padding: '8px 12px 8px 32px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '13px', outline: 'none' }}
                        />
                    </div>
                    <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: '#fff', color: theme.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                        <RefreshCw size={14} /> Refresh
                    </button>
                </div>
            </div>

            {/* Table Content */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: isMobile ? 'auto' : 'hidden', display: 'flex', flexDirection: 'column' }}>
                {loading ? (
                    <div style={{ padding: '60px', textAlign: 'center', color: theme.subtext, fontWeight: 600 }}>Loading records...</div>
                ) : error ? (
                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                        <div style={{ color: theme.danger, marginBottom: '10px' }}><AlertCircle size={32} /></div>
                        <div style={{ color: theme.text, fontWeight: 700 }}>Failed to load data</div>
                        <div style={{ color: theme.subtext, fontSize: '13px', marginTop: '4px' }}>{error}</div>
                    </div>
                ) : config.id === 'private_messages' ? (
                    <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', flex: 1, minHeight: '520px', backgroundColor: '#faf8ff' }}>
                        <div style={{ width: isMobile ? '100%' : '320px', minHeight: isMobile ? '200px' : 'auto', borderRight: `1px solid ${theme.border}`, borderBottom: isMobile ? `1px solid ${theme.border}` : 'none', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${theme.border}`, backgroundColor: '#faf8ff' }}>
                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: theme.text }}>Conversations</h4>
                                <span style={{ fontSize: '11px', color: theme.subtext }}>Select a thread to view chat history</span>
                            </div>
                            {filteredData.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: theme.subtext, fontSize: '13px' }}>No conversations found.</div>
                            ) : (
                                filteredData.map(thread => {
                                    const isSelected = thread.id === activeThreadId;
                                    const threadMsgs = Array.isArray(thread.msgs) ? thread.msgs : [];
                                    const lastMsg = threadMsgs[threadMsgs.length - 1];
                                    return (
                                        <button
                                            key={thread.id}
                                            onClick={() => setActiveThreadId(thread.id)}
                                            style={{
                                                display: 'flex', flexDirection: 'column', gap: '6px',
                                                padding: '16px 20px', width: '100%', border: 'none',
                                                borderBottom: `1px solid ${theme.border}`,
                                                backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                                                borderLeft: isSelected ? `4px solid ${C.primary}` : '4px solid transparent',
                                                textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.15s', flexShrink: 0
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                <span style={{ fontWeight: 800, fontSize: '13px', color: theme.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                                    {thread.members}
                                                </span>
                                                <span style={{ fontSize: '10px', color: theme.subtext }}>
                                                    {threadMsgs[threadMsgs.length - 1]?.time || 'Now'}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '11px', color: theme.subtext, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                                {lastMsg ? `${lastMsg.sender}: ${lastMsg.text}` : 'No messages yet'}
                                            </p>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '10px', marginTop: '2px' }}>
                                                <span style={{ color: C.primary, fontWeight: 600 }}>{threadMsgs.length} messages</span>
                                                <span style={{ color: theme.subtext }}>Updated: {String(thread.lastUpdated || '').split(',')[0] || 'Recently'}</span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f0ebff' }}>
                            {activeThreadId && filteredData.find(t => t.id === activeThreadId) ? (() => {
                                const activeThread = filteredData.find(t => t.id === activeThreadId);
                                return (
                                    <>
                                        <div style={{ padding: '16px 24px', backgroundColor: '#fff', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: theme.text }}>{activeThread.members}</h4>
                                                <span style={{ fontSize: '11px', color: theme.subtext }}>Thread ID: <code style={{ fontFamily: 'monospace' }}>{activeThread.id}</code></span>
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    if (confirm('Are you sure you want to delete this conversation thread?')) {
                                                        try {
                                                            const csrfRes = await fetch(`${API_BASE}/session/token`, { credentials: 'include' });
                                                            const csrfToken = csrfRes.ok ? (await csrfRes.text()).trim() : '';
                                                            const res = await fetch(`${API_BASE}/jsonapi/private_message_thread/private_message_thread/${activeThread.id}`, {
                                                                method: 'DELETE',
                                                                credentials: 'include',
                                                                headers: { 'X-CSRF-Token': csrfToken }
                                                            });
                                                            if (res.ok) {
                                                                showToast('Conversation thread deleted successfully!');
                                                                fetchData();
                                                            } else {
                                                                showToast('Failed to delete thread', 'error');
                                                            }
                                                        } catch (err) {
                                                            showToast(`Error: ${err.message}`, 'error');
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    backgroundColor: '#fee2e2', color: '#ef4444', border: 'none',
                                                    borderRadius: '8px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                Delete Thread
                                            </button>
                                        </div>

                                        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {(activeThread.msgs || []).length === 0 ? (
                                                <div style={{ textAlign: 'center', color: theme.subtext, fontSize: '13px', padding: '40px 0' }}>No messages in this conversation.</div>
                                            ) : (
                                                (activeThread.msgs || []).map((msg) => (
                                                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flexShrink: 0 }}>
                                                        <span style={{ fontSize: '10px', color: C.muted, fontWeight: '700', marginBottom: '3px', marginLeft: '4px' }}>
                                                            {msg.sender}
                                                        </span>
                                                        <div style={{
                                                            maxWidth: '80%', padding: '10px 14px', borderRadius: '12px',
                                                            backgroundColor: '#fff', color: theme.text, fontSize: '13px',
                                                            lineHeight: 1.5, boxShadow: '0 1px 3px rgba(15,23,42,0.03)',
                                                            border: `1px solid ${theme.border}`
                                                        }}>
                                                            {msg.text}
                                                        </div>
                                                        <span style={{ fontSize: '9px', color: theme.subtext, marginTop: '3px', marginLeft: '4px' }}>{msg.time}</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <div style={{ padding: '12px 24px', backgroundColor: '#fff', borderTop: `1px solid ${theme.border}`, textAlign: 'center', fontSize: '11px', color: theme.subtext, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                            <Shield size={13} /> Admin Moderation View (Read-Only)
                                        </div>
                                    </>
                                );
                            })() : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.subtext }}>
                                    Select a conversation to inspect messages
                                </div>
                            )}
                        </div>
                    </div>
                ) : filteredData.length === 0 ? (
                    config.id === 'roles' ? (
                        <div style={{ padding: '48px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                            <Shield size={36} style={{ color: theme.subtext, opacity: 0.4 }} />
                            <div style={{ fontSize: '15px', fontWeight: 800, color: theme.text }}>No roles returned from Drupal</div>
                            <div style={{ maxWidth: '520px', fontSize: '13px', color: theme.subtext, lineHeight: '1.6' }}>
                                Drupal hides roles unless your browser has an admin session. Log in to the backend first:
                                <div style={{ marginTop: '12px' }}>
                                    <a href={`${API_URL}/user/login`} target="_blank" rel="noreferrer" style={{ ...P.btn, textDecoration: 'none', display: 'inline-block', padding: '10px 24px', fontSize: '13px', fontWeight: 700 }}>
                                        Log in to Drupal ({API_URL}/user/login)
                                    </a>
                                </div>
                                <div style={{ marginTop: '12px', fontSize: '12px' }}>
                                    Use your admin account, then click <strong>Refresh</strong> above. The role must have the <code style={{ fontFamily: 'monospace' }}>administer permissions</code> permission to be readable.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '60px', textAlign: 'center', color: theme.subtext }}>No records found in this endpoint.</div>
                    )
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, backgroundColor: '#faf8ff', zIndex: 10 }}>
                            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase' }}>UUID</th>
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase' }}>Identifier / Label</th>
                                {!hideStatusColumn && (
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase' }}>Status</th>
                                )}
                                {config.id !== 'roles' && config.id !== 'users' && config.id !== 'user_actions' && (
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase' }}>Author</th>
                                )}
                                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase' }}>Created</th>
                                <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', fontWeight: 800, color: theme.subtext, textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map(item => {
                                const title = extractTitle(item);
                                const status = extractStatus(item);
                                return (
                                    <tr key={item.id} style={{ borderBottom: `1px solid ${theme.border}` }}>
                                        <td style={{ padding: '14px 24px', fontSize: '13px', fontFamily: 'monospace', color: theme.subtext }}>
                                            {String(item.id).substring(0, 8)}...
                                        </td>
                                        <td style={{ padding: '14px 24px', fontSize: '14px', color: theme.text, fontWeight: 600 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {item.image && (
                                                    <img src={item.image} alt="Thumbnail" style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${theme.border}`, flexShrink: 0 }} />
                                                )}
                                                <div>
                                                    <div dangerouslySetInnerHTML={{ __html: title.length > 60 ? title.substring(0, 60) + '...' : title }} />
                                                    {item.type === 'node--page' && item.options && (
                                                        <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: 'normal', color: theme.subtext }}>
                                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                                                {item.options.map((opt, i) => (
                                                                    <span key={i} style={{ padding: '2px 6px', background: '#f0ebff', borderRadius: '4px' }}>
                                                                        {opt.text}: {opt.votes}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Trophy size={13} /> Highest Voted: {item.winningOption}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {item.type !== 'node--page' && (item.likesCount !== undefined || item.dislikesCount !== undefined) && (
                                                        <div style={{ fontSize: '11px', color: theme.subtext, marginTop: '4px', fontWeight: 'normal', display: 'flex', gap: '8px' }}>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ThumbsUp size={12} /> {item.likesCount || 0}</span>
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><ThumbsDown size={12} /> {item.dislikesCount || 0}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        {!hideStatusColumn && (
                                            <td style={{ padding: '14px 24px' }}>
                                                {status && (
                                                    <span style={{
                                                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                                                        background: status === 'Active' ? theme.primaryLight : (status === 'Blocked' ? theme.dangerLight : '#f0ebff'),
                                                        color: status === 'Active' ? theme.primary : (status === 'Blocked' ? theme.danger : theme.subtext)
                                                    }}>
                                                        {status}
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {config.id !== 'roles' && config.id !== 'users' && config.id !== 'user_actions' && (
                                            <td style={{ padding: '14px 24px', fontSize: '13px', color: theme.text, fontWeight: 600 }}>
                                                {item.authorName || '-'}
                                            </td>
                                        )}
                                        <td style={{ padding: '14px 24px', fontSize: '13px', color: theme.subtext }}>
                                            {extractDate(item)}
                                        </td>
                                        <td style={{ padding: '14px 24px', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                                                {config.id === 'user_actions' ? (
                                                    <button onClick={() => setViewingActionsFor(item)} style={{ border: 'none', background: theme.primaryLight, color: theme.primary, cursor: 'pointer', padding: '6px 10px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700 }} title="User Actions">
                                                        <Activity size={14} /> Actions
                                                    </button>
                                                ) : config.id === 'roles' ? (
                                                    <>
                                                        <button onClick={() => openPermissions(item)} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', border: 'none', background: theme.primaryLight, color: theme.primary, cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }} title="Manage permissions">
                                                            <KeyRound size={14} /> Permissions
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                                                            style={{ border: 'none', background: '#f0f0ff', color: theme.primary, cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id, item)} style={{ border: 'none', background: '#fee2e2', color: theme.danger, cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }} title="Delete">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); openEditModal(item); }}
                                                            style={{ border: 'none', background: '#f0f0ff', color: theme.primary, cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                                                            title="Edit"
                                                        >
                                                            <Edit size={15} />
                                                        </button>
                                                        <button onClick={() => handleDelete(item.id, item)} style={{ border: 'none', background: '#fee2e2', color: theme.danger, cursor: 'pointer', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center' }} title="Delete">
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Table Footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8ff', fontSize: '12px', color: theme.subtext }}>
                <div>Total Records: <strong>{data.length}</strong></div>
                <div>Note: Deep schema editing requires backend Drupal configuration.</div>
            </div>

            {/* Generic Edit Modal */}
            {editingItem && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${theme.border}`,
                        width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.text }}>Edit Record</h3>
                            <button onClick={() => setEditingItem(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.subtext, fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleSaveEdit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.subtext, backgroundColor: '#faf8ff', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                                <strong>UUID:</strong> {editingItem.id}<br />
                                <strong>Type:</strong> {editingItem.type}
                            </div>

                            {/* Username / Name field — always shown for users, conditionally for others */}
                            {(editingItem.type === 'user--user' || getPrimaryAttrKey(editingItem)) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, marginBottom: '2px', textTransform: 'uppercase' }}>
                                        {editingItem.type === 'user--user' ? 'Username' : (getPrimaryAttrKey(editingItem) === 'name' ? 'Username / Name' : 'Title / Label')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        placeholder={editingItem.type === 'user--user' ? 'Enter username' : 'Enter value'}
                                        required
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, boxSizing: 'border-box', outline: 'none' }}
                                    />
                                </div>
                            )}

                            {/* Email — always shown for users */}
                            {(editingItem.type === 'user--user' || editingItem.attributes?.mail !== undefined) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, marginBottom: '2px', textTransform: 'uppercase' }}>
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={editEmail}
                                        onChange={(e) => setEditEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, boxSizing: 'border-box', outline: 'none' }}
                                    />
                                </div>
                            )}

                            {/* Status — always shown for users */}
                            {(editingItem.type === 'user--user' || editingItem.attributes?.status !== undefined) && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, marginBottom: '2px', textTransform: 'uppercase' }}>
                                        Account Status
                                    </label>
                                    <select
                                        value={editStatus ? 'active' : 'blocked'}
                                        onChange={(e) => setEditStatus(e.target.value === 'active')}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}
                                    >
                                        {(editingItem.type === 'user--user' || editingItem.type === 'user_role--user_role') ? (
                                            <><option value="active">✅ Active</option><option value="blocked">🚫 Blocked</option></>
                                        ) : (
                                            <><option value="active">✅ Published</option><option value="blocked">⬜ Unpublished</option></>
                                        )}
                                    </select>
                                    <span style={{ fontSize: '11px', color: theme.subtext, marginTop: '2px' }}>
                                        {editingItem.type === 'user--user' ? 'Active users can log in. Blocked users cannot.' : ''}
                                    </span>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
                                <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: '#fff', color: theme.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ ...P.btn, padding: '10px 20px', fontSize: '13px', fontWeight: 600 }}>
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create User Modal (with Role assignment) */}
            {creatingUser && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
                    <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${theme.border}`, width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.text }}>Create New User</h3>
                            <button onClick={() => setCreatingUser(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.subtext, display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
                            <div style={{ fontSize: '11px', fontFamily: 'monospace', color: theme.subtext, backgroundColor: '#faf8ff', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}` }}>
                                POST {API_BASE}/jsonapi/user/user
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, textTransform: 'uppercase' }}>Username</label>
                                <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Enter username" required
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, textTransform: 'uppercase' }}>Email Address</label>
                                <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="name@example.com" required
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, textTransform: 'uppercase' }}>Password</label>
                                <input type="text" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Enter password" required
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, textTransform: 'uppercase' }}>Status</label>
                                <select value={createStatus ? 'active' : 'blocked'} onChange={(e) => setCreateStatus(e.target.value === 'active')}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: `1px solid ${theme.border}`, fontSize: '14px', color: theme.text, backgroundColor: '#fff', outline: 'none', cursor: 'pointer' }}>
                                    <option value="active">Active</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>

                            {/* ---- ROLE ASSIGNMENT ---- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.subtext, textTransform: 'uppercase' }}>Assign Roles (optional)</label>
                                {rolesList.length === 0 ? (
                                    <div style={{ fontSize: '12px', color: theme.subtext, backgroundColor: '#faf8ff', border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '10px 12px' }}>
                                        No assignable roles loaded (log into Drupal as admin to see roles).
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto', padding: '10px 12px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: '#faf8ff' }}>
                                        {rolesList.map(role => {
                                            const checked = createRoles.includes(role.id);
                                            const roleLabel = role.attributes?.label || role.attributes?.drupal_internal__id || role.id;
                                            return (
                                                <label key={role.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: checked ? theme.primary : theme.text, fontWeight: checked ? 700 : 500, cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => setCreateRoles(prev => prev.includes(role.id) ? prev.filter(id => id !== role.id) : [...prev, role.id])}
                                                        style={{ accentColor: theme.primary, width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                                                    />
                                                    {roleLabel}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                <div style={{ fontSize: '11px', color: theme.subtext }}>
                                    {createRoles.length > 0 ? `${createRoles.length} role(s) will be assigned to this user.` : 'No role selected — the user will only have default "authenticated" access.'}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', borderTop: `1px solid ${theme.border}`, paddingTop: '16px', flexShrink: 0 }}>
                                <button type="button" onClick={() => setCreatingUser(false)} style={{ padding: '10px 20px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: '#fff', color: theme.text, fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={createSaving} style={{ ...P.btn, padding: '10px 20px', fontSize: '13px', fontWeight: 700, opacity: createSaving ? 0.7 : 1, cursor: createSaving ? 'wait' : 'pointer' }}>
                                    {createSaving ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Actions Modal */}
            {viewingActionsFor && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 9999, padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: '#fff', borderRadius: '16px', border: `1px solid ${theme.border}`,
                        width: '100%', maxWidth: '600px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                        overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '80vh'
                    }}>
                        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#faf8ff' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: theme.text }}>User Actions & Activity</h3>
                                <div style={{ fontSize: '12px', color: theme.subtext, marginTop: '4px' }}>
                                    Analytics for <strong>{viewingActionsFor.attributes?.name || viewingActionsFor.attributes?.mail || 'User'}</strong>
                                </div>
                            </div>
                            <button onClick={() => setViewingActionsFor(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.subtext, fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                        </div>

                        <div style={{ padding: '16px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '16px' }}>
                            {['Days', 'Weekly', 'Monthly', 'All'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActionTimeframe(tab)}
                                    style={{
                                        padding: '6px 16px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
                                        backgroundColor: actionTimeframe === tab ? theme.primaryLight : '#f0ebff',
                                        color: actionTimeframe === tab ? theme.primary : theme.subtext
                                    }}
                                >
                                    {tab === 'All' ? 'All Time' : `${tab} Wise`}
                                </button>
                            ))}
                        </div>

                        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, backgroundColor: '#faf8ff' }}>
                            {userActivityData.loading ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: theme.subtext }}>Fetching real-time backend data...</div>
                            ) : (
                                <>
                                    {actionTimeframe === 'Days' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {renderActivitySection('Today', 'Today')}
                                            {renderActivitySection('Yesterday', 'Yesterday')}
                                        </div>
                                    )}
                                    {actionTimeframe === 'Weekly' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {renderActivitySection('This Week', 'This Week')}
                                            {renderActivitySection('Last Week', 'Last Week')}
                                        </div>
                                    )}
                                    {actionTimeframe === 'Monthly' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {renderActivitySection('This Month', 'This Month')}
                                        </div>
                                    )}
                                    {actionTimeframe === 'All' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {renderActivitySection('All Time', 'All Time (everything stored in the database)')}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Role Permissions Modal */}
            {permissionsFor && (
                <RolePermissionsModal
                    role={permissionsFor}
                    selections={permSelections}
                    setSelections={setPermSelections}
                    onSave={savePermissions}
                    onClose={() => setPermissionsFor(null)}
                    saving={permSaving}
                    saveError={permError}
                    theme={theme}
                />
            )}

            {/* Themed toast notification */}
            {toast && (
                <div style={{
                    position: 'fixed', bottom: 24, right: 24, zIndex: 10001,
                    display: 'flex', alignItems: 'center', gap: 10, maxWidth: 420,
                    padding: '12px 18px', borderRadius: 12,
                    backgroundColor: toast.type === 'error' ? '#fee2e2' : '#ecfdf5',
                    border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#a7f3d0'}`,
                    color: toast.type === 'error' ? '#991b1b' : '#065f46',
                    fontSize: 13, fontWeight: 700,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                    animation: 'toastIn 0.2s ease-out'
                }}>
                    <style>{`@keyframes toastIn { from { transform: translateY(12px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
                    {toast.type === 'error' ? <AlertCircle size={16} style={{ flexShrink: 0 }} /> : <ShieldCheck size={16} style={{ flexShrink: 0 }} />}
                    <span>{toast.message}</span>
                    <button onClick={() => setToast(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 2, marginLeft: 4 }}>
                        <X size={14} />
                    </button>
                </div>
            )}
        </div>
    );
}

/* =====================================================================
   ROLE PERMISSIONS MODAL
===================================================================== */
function GroupHeaderCheckbox({ checked, indeterminate, onChange, theme }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            onClick={(e) => e.stopPropagation()}
            style={{ accentColor: theme.primary, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
        />
    );
}

function RolePermissionsModal({ role, selections, setSelections, onSave, onClose, saving, saveError, theme }) {
    const [search, setSearch] = useState('');
    const [onlyGranted, setOnlyGranted] = useState(false);
    const [expanded, setExpanded] = useState({});

    const roleLabel = role.attributes?.label || role.attributes?.drupal_internal__id || role.id;
    const roleId = (role.attributes?.drupal_internal__id || '').toLowerCase();
    const hadPermsAttr = Array.isArray(role.attributes?.permissions);

    const allPerms = Object.values(PERMISSION_CATALOG).flat();
    const grantedCount = selections.length;
    const customPerms = selections.filter(p => !allPerms.includes(p));
    const searching = search.trim() !== '';
    const q = search.trim().toLowerCase();

    const activePreset = (Object.entries(PERMISSION_PRESETS).find(([, list]) =>
        list.length === selections.length && selections.every(p => list.includes(p))) || [null])[0];

    const groups = Object.entries(PERMISSION_CATALOG)
        .map(([module, perms]) => ({
            module,
            visible: perms.filter(p => {
                if (onlyGranted && !selections.includes(p)) return false;
                if (!searching) return true;
                const meta = PERMISSION_LABELS[p] || {};
                return `${meta.label || ''} ${meta.desc || ''} ${p}`.toLowerCase().includes(q);
            })
        }))
        .filter(g => g.visible.length > 0);

    const isOpen = (module) => searching || onlyGranted || !!expanded[module];

    const togglePerm = (perm) => setSelections(prev =>
        prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );

    const toggleGroup = (perms) => {
        const allOn = perms.every(p => selections.includes(p));
        setSelections(prev => {
            const set = new Set(prev);
            perms.forEach(p => (allOn ? set.delete(p) : set.add(p)));
            return [...set];
        });
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20 }}>
            <div style={{ backgroundColor: '#fff', borderRadius: 16, border: `1px solid ${theme.border}`, width: '100%', maxWidth: 820, maxHeight: '88vh', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                <div style={{ padding: '18px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 12, backgroundColor: '#faf8ff', flexShrink: 0 }}>
                    <span style={{ width: 38, height: 38, borderRadius: 10, background: theme.primaryLight, color: theme.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <KeyRound size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: theme.text }}>Permissions — {roleLabel}</h3>
                        <div style={{ fontSize: 12, color: theme.subtext, marginTop: 2 }}>Grant or revoke what this role can do on the platform</div>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: theme.subtext, width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }} title="Close">
                        <X size={16} />
                    </button>
                </div>

                <div style={{ padding: '12px 24px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', backgroundColor: '#fff', flexShrink: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.subtext }}>Presets:</span>
                    {Object.entries(PERMISSION_PRESETS).map(([key, list]) => {
                        const active = activePreset === key;
                        return (
                            <button key={key} onClick={() => setSelections([...list])} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? theme.primary : theme.border}`, backgroundColor: active ? theme.primary : '#fff', color: active ? '#fff' : theme.text, fontSize: 12, fontWeight: 700, cursor: 'pointer' }} title={`Apply the "${key}" permission set`}>
                                <ShieldCheck size={13} /> {key}
                            </button>
                        );
                    })}
                    <button onClick={() => setOnlyGranted(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1px solid ${onlyGranted ? theme.primary : theme.border}`, backgroundColor: onlyGranted ? theme.primaryLight : '#fff', color: onlyGranted ? theme.primary : theme.subtext, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        Granted only ({grantedCount})
                    </button>
                    <div style={{ position: 'relative', flex: 1, minWidth: 180, marginLeft: 'auto' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                            <Search size={14} />
                        </span>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search permissions..."
                            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: 10, border: `1px solid ${theme.border}`, fontSize: 13, outline: 'none', boxSizing: 'border-box', backgroundColor: '#f8fafc' }}
                        />
                    </div>
                </div>

                <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 24px', backgroundColor: '#f7f8fb' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {saveError && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                                {saveError}
                            </div>
                        )}

                        {!hadPermsAttr && (
                            <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', fontSize: 12.5, lineHeight: 1.5, flexShrink: 0 }}>
                                <strong>Note:</strong> Drupal didn't expose this role's current permissions (needs <code style={{ fontFamily: 'monospace' }}>administer permissions</code>). Checkboxes start empty — the <strong>Employee</strong> preset is a good starting point.
                            </div>
                        )}

                        {groups.length === 0 && (
                            <div style={{ padding: 40, textAlign: 'center', color: theme.subtext, fontSize: 13, flexShrink: 0 }}>
                                {searching ? `No permissions match "${search}".` : 'Nothing to show.'}
                            </div>
                        )}

                        {groups.map(g => {
                            const open = isOpen(g.module);
                            const grantedIn = g.visible.filter(p => selections.includes(p)).length;
                            const allChecked = grantedIn > 0 && grantedIn === g.visible.length;
                            const someChecked = grantedIn > 0 && !allChecked;
                            return (
                                <div key={g.module} style={{ backgroundColor: '#fff', borderRadius: 12, border: `1px solid ${theme.border}`, overflow: 'hidden', flexShrink: 0 }}>
                                    <div onClick={() => setExpanded(prev => ({ ...prev, [g.module]: !prev[g.module] }))} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer', backgroundColor: open ? '#faf8ff' : '#fff', userSelect: 'none' }}>
                                        <GroupHeaderCheckbox checked={allChecked} indeterminate={someChecked} onChange={() => toggleGroup(g.visible)} theme={theme} />
                                        <span style={{ flex: 1, fontSize: 13, fontWeight: 800, color: theme.text }}>{g.module}</span>
                                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, backgroundColor: allChecked ? '#ecfdf5' : someChecked ? theme.primaryLight : '#f1f5f9', color: allChecked ? '#059669' : someChecked ? theme.primary : theme.subtext }}>
                                            {grantedIn}/{g.visible.length}
                                        </span>
                                        <ChevronDown size={16} style={{ color: theme.subtext, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }} />
                                    </div>

                                    {open && g.visible.map(perm => {
                                        const checked = selections.includes(perm);
                                        const meta = PERMISSION_LABELS[perm] || { label: perm, desc: null };
                                        return (
                                            <label key={perm} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderTop: `1px solid ${theme.borderLight || '#f1f5f9'}`, cursor: 'pointer', backgroundColor: checked ? theme.primaryLight : '#fff' }}>
                                                <input type="checkbox" checked={checked} onChange={() => togglePerm(perm)} style={{ accentColor: theme.primary, width: 16, height: 16, cursor: 'pointer', marginTop: 2, flexShrink: 0 }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: 13.5, fontWeight: checked ? 700 : 600, color: checked ? theme.primary : theme.text }}>{meta.label}</div>
                                                    {meta.desc && <div style={{ fontSize: 12, color: theme.subtext, marginTop: 1 }}>{meta.desc}</div>}
                                                    <div style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#b9b1e0', marginTop: 2 }}>{perm}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            );
                        })}

                        {customPerms.length > 0 && (
                            <div style={{ backgroundColor: '#fffbeb', borderRadius: 12, border: '1px solid #fde68a', overflow: 'hidden', flexShrink: 0 }}>
                                <div style={{ padding: '10px 16px', fontSize: 13, fontWeight: 800, color: '#92400e', borderBottom: '1px solid #fde68a' }}>
                                    Other permissions on this role (not in catalog)
                                </div>
                                {customPerms.map(perm => (
                                    <div key={perm} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 16px', borderBottom: '1px solid #fef3c7' }}>
                                        <code style={{ fontFamily: 'monospace', fontSize: 12, color: '#92400e' }}>{perm}</code>
                                        <button onClick={() => togglePerm(perm)} style={{ border: 'none', background: 'transparent', color: theme.danger, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }} title="Revoke this permission">
                                            <X size={13} /> Revoke
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ padding: '14px 24px', borderTop: `1px solid ${theme.border}`, backgroundColor: '#fff', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
                    <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: theme.subtext, marginBottom: 6 }}>
                            <span>{grantedCount} of {allPerms.length} permissions granted</span>
                            <span>{roleId || 'role'}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 4, backgroundColor: '#eef1f6', overflow: 'hidden' }}>
                            <div style={{ width: `${allPerms.length ? Math.round((grantedCount / allPerms.length) * 100) : 0}%`, height: '100%', backgroundColor: theme.primary, borderRadius: 4, transition: 'width 0.2s' }} />
                        </div>
                    </div>
                    <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${theme.border}`, backgroundColor: '#fff', color: theme.text, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={onSave} disabled={saving} style={{ ...P.btn, padding: '10px 22px', fontSize: 13, fontWeight: 700, opacity: saving ? 0.7 : 1, cursor: saving ? 'wait' : 'pointer' }}>
                        {saving ? 'Saving...' : `Save ${grantedCount} Permission${grantedCount === 1 ? '' : 's'}`}
                    </button>
                </div>
            </div>
        </div>
    );
}