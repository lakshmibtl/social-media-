'use client';

import React, { useState, useMemo } from 'react';
import { Zap, Copy, Check, Lightbulb, Terminal } from 'lucide-react';
import useResponsive from '../../lib/useResponsive';
import { API_URL } from '../../lib/config';

// Complete dictionary of ALL 140+ JSON:API endpoints provided from Drupal backend
const RAW_ENDPOINTS = {
  "action--action": `${API_URL}/jsonapi/action/action`,
  "activity--activity": `${API_URL}/jsonapi/activity/activity`,
  "advancedqueue_queue--advancedqueue_queue": `${API_URL}/jsonapi/advancedqueue_queue/advancedqueue_queue`,
  "base_field_override--base_field_override": `${API_URL}/jsonapi/base_field_override/base_field_override`,
  "block--block": `${API_URL}/jsonapi/block/block`,
  "block_content--basic": `${API_URL}/jsonapi/block_content/basic`,
  "block_content--custom_content_list": `${API_URL}/jsonapi/block_content/custom_content_list`,
  "block_content--featured": `${API_URL}/jsonapi/block_content/featured`,
  "block_content--featured_items": `${API_URL}/jsonapi/block_content/featured_items`,
  "block_content--hero_call_to_action_block": `${API_URL}/jsonapi/block_content/hero_call_to_action_block`,
  "block_content--platform_intro": `${API_URL}/jsonapi/block_content/platform_intro`,
  "block_content_type--block_content_type": `${API_URL}/jsonapi/block_content_type/block_content_type`,
  "comment--comment": `${API_URL}/jsonapi/comment/comment`,
  "comment--post_comment": `${API_URL}/jsonapi/comment/post_comment`,
  "comment_type--comment_type": `${API_URL}/jsonapi/comment_type/comment_type`,
  "crop--hero": `${API_URL}/jsonapi/crop/hero`,
  "crop--hero_an": `${API_URL}/jsonapi/crop/hero_an`,
  "crop--hero_landing": `${API_URL}/jsonapi/crop/hero_landing`,
  "crop--hero_small": `${API_URL}/jsonapi/crop/hero_small`,
  "crop--hero_small_landing": `${API_URL}/jsonapi/crop/hero_small_landing`,
  "crop--profile_large": `${API_URL}/jsonapi/crop/profile_large`,
  "crop--profile_medium": `${API_URL}/jsonapi/crop/profile_medium`,
  "crop--profile_small": `${API_URL}/jsonapi/crop/profile_small`,
  "crop--teaser": `${API_URL}/jsonapi/crop/teaser`,
  "crop_type--crop_type": `${API_URL}/jsonapi/crop_type/crop_type`,
  "data_policy--data_policy": `${API_URL}/jsonapi/data_policy/data_policy`,
  "date_format--date_format": `${API_URL}/jsonapi/date_format/date_format`,
  "editor--editor": `${API_URL}/jsonapi/editor/editor`,
  "embed_button--embed_button": `${API_URL}/jsonapi/embed_button/embed_button`,
  "entity_form_display--entity_form_display": `${API_URL}/jsonapi/entity_form_display/entity_form_display`,
  "entity_form_mode--entity_form_mode": `${API_URL}/jsonapi/entity_form_mode/entity_form_mode`,
  "entity_view_display--entity_view_display": `${API_URL}/jsonapi/entity_view_display/entity_view_display`,
  "entity_view_mode--entity_view_mode": `${API_URL}/jsonapi/entity_view_mode/entity_view_mode`,
  "event_enrollment--event_enrollment": `${API_URL}/jsonapi/event_enrollment/event_enrollment`,
  "field_config--field_config": `${API_URL}/jsonapi/field_config/field_config`,
  "field_storage_config--field_storage_config": `${API_URL}/jsonapi/field_storage_config/field_storage_config`,
  "file--file": `${API_URL}/jsonapi/file/file`,
  "filter_format--filter_format": `${API_URL}/jsonapi/filter_format/filter_format`,
  "flag--flag": `${API_URL}/jsonapi/flag/flag`,
  "flagging--follow_content": `${API_URL}/jsonapi/flagging/follow_content`,
  "flagging--follow_user": `${API_URL}/jsonapi/flagging/follow_user`,
  "flagging--mute_group_notifications": `${API_URL}/jsonapi/flagging/mute_group_notifications`,
  "flagging--report_comment": `${API_URL}/jsonapi/flagging/report_comment`,
  "flagging--report_node": `${API_URL}/jsonapi/flagging/report_node`,
  "flagging--report_post": `${API_URL}/jsonapi/flagging/report_post`,
  "font--font": `${API_URL}/jsonapi/font/font`,
  "graphql_server--graphql_server": `${API_URL}/jsonapi/graphql_server/graphql_server`,
  "group--closed_group": `${API_URL}/jsonapi/group/closed_group`,
  "group--flexible_group": `${API_URL}/jsonapi/group/flexible_group`,
  "group--open_group": `${API_URL}/jsonapi/group/open_group`,
  "group--public_group": `${API_URL}/jsonapi/group/public_group`,
  "group--secret_group": `${API_URL}/jsonapi/group/secret_group`,
  "group_content--closed_group-group_invitation": `${API_URL}/jsonapi/group_content/closed_group-group_invitation`,
  "group_content--closed_group-group_membership": `${API_URL}/jsonapi/group_content/closed_group-group_membership`,
  "group_content--closed_group-group_node-album": `${API_URL}/jsonapi/group_content/closed_group-group_node-album`,
  "group_content--closed_group-group_node-event": `${API_URL}/jsonapi/group_content/closed_group-group_node-event`,
  "group_content--closed_group-group_node-topic": `${API_URL}/jsonapi/group_content/closed_group-group_node-topic`,
  "group_content--flexible_group-group_invitation": `${API_URL}/jsonapi/group_content/flexible_group-group_invitation`,
  "group_content--flexible_group-group_membership": `${API_URL}/jsonapi/group_content/flexible_group-group_membership`,
  "group_content--flexible_group-group_node-album": `${API_URL}/jsonapi/group_content/flexible_group-group_node-album`,
  "group_content--flexible_group-group_node-event": `${API_URL}/jsonapi/group_content/flexible_group-group_node-event`,
  "group_content--flexible_group-group_node-topic": `${API_URL}/jsonapi/group_content/flexible_group-group_node-topic`,
  "group_content--group_content_type_7fcb76fdf61a9": `${API_URL}/jsonapi/group_content/group_content_type_7fcb76fdf61a9`,
  "group_content--group_content_type_c8bae2527294c": `${API_URL}/jsonapi/group_content/group_content_type_c8bae2527294c`,
  "group_content--open_group-group_invitation": `${API_URL}/jsonapi/group_content/open_group-group_invitation`,
  "group_content--open_group-group_membership": `${API_URL}/jsonapi/group_content/open_group-group_membership`,
  "group_content--open_group-group_node-album": `${API_URL}/jsonapi/group_content/open_group-group_node-album`,
  "group_content--open_group-group_node-event": `${API_URL}/jsonapi/group_content/open_group-group_node-event`,
  "group_content--open_group-group_node-topic": `${API_URL}/jsonapi/group_content/open_group-group_node-topic`,
  "group_content--public_group-group_invitation": `${API_URL}/jsonapi/group_content/public_group-group_invitation`,
  "group_content--public_group-group_membership": `${API_URL}/jsonapi/group_content/public_group-group_membership`,
  "group_content--public_group-group_node-album": `${API_URL}/jsonapi/group_content/public_group-group_node-album`,
  "group_content--public_group-group_node-event": `${API_URL}/jsonapi/group_content/public_group-group_node-event`,
  "group_content--public_group-group_node-topic": `${API_URL}/jsonapi/group_content/public_group-group_node-topic`,
  "group_content--secret_group-group_invitation": `${API_URL}/jsonapi/group_content/secret_group-group_invitation`,
  "group_content--secret_group-group_membership": `${API_URL}/jsonapi/group_content/secret_group-group_membership`,
  "group_content--secret_group-group_node-album": `${API_URL}/jsonapi/group_content/secret_group-group_node-album`,
  "group_content--secret_group-group_node-event": `${API_URL}/jsonapi/group_content/secret_group-group_node-event`,
  "group_content--secret_group-group_node-topic": `${API_URL}/jsonapi/group_content/secret_group-group_node-topic`,
  "group_content_type--group_content_type": `${API_URL}/jsonapi/group_content_type/group_content_type`,
  "group_role--group_role": `${API_URL}/jsonapi/group_role/group_role`,
  "group_type--group_type": `${API_URL}/jsonapi/group_type/group_type`,
  "image_style--image_style": `${API_URL}/jsonapi/image_style/image_style`,
  "informblock--informblock": `${API_URL}/jsonapi/informblock/informblock`,
  "mailer_policy--mailer_policy": `${API_URL}/jsonapi/mailer_policy/mailer_policy`,
  "mailer_transport--mailer_transport": `${API_URL}/jsonapi/mailer_transport/mailer_transport`,
  "mentions--mentions": `${API_URL}/jsonapi/mentions/mentions`,
  "mentions_type--mentions_type": `${API_URL}/jsonapi/mentions_type/mentions_type`,
  "menu--menu": `${API_URL}/jsonapi/menu/menu`,
  "menu_link_content--menu_link_content": `${API_URL}/jsonapi/menu_link_content/menu_link_content`,
  "message--activity_on_events_im_organizing": `${API_URL}/jsonapi/message/activity_on_events_im_organizing`,
  "message--approve_request_join_group": `${API_URL}/jsonapi/message/approve_request_join_group`,
  "message--background_process_finished": `${API_URL}/jsonapi/message/background_process_finished`,
  "message--content_reported": `${API_URL}/jsonapi/message/content_reported`,
  "message--create_comment_author_node_post": `${API_URL}/jsonapi/message/create_comment_author_node_post`,
  "message--create_comment_community_node": `${API_URL}/jsonapi/message/create_comment_community_node`,
  "message--create_comment_community_post": `${API_URL}/jsonapi/message/create_comment_community_post`,
  "message--create_comment_following_node": `${API_URL}/jsonapi/message/create_comment_following_node`,
  "message--create_comment_group_node": `${API_URL}/jsonapi/message/create_comment_group_node`,
  "message--create_comment_group_post": `${API_URL}/jsonapi/message/create_comment_group_post`,
  "message--create_comment_post_profile": `${API_URL}/jsonapi/message/create_comment_post_profile`,
  "message--create_comment_reply": `${API_URL}/jsonapi/message/create_comment_reply`,
  "message--create_comment_reply_mention": `${API_URL}/jsonapi/message/create_comment_reply_mention`,
  "message--create_content_in_joined_group": `${API_URL}/jsonapi/message/create_content_in_joined_group`,
  "message--create_event_community": `${API_URL}/jsonapi/message/create_event_community`,
  "message--create_event_gc": `${API_URL}/jsonapi/message/create_event_gc`,
  "message--create_event_group": `${API_URL}/jsonapi/message/create_event_group`,
  "message--create_like_node_or_post": `${API_URL}/jsonapi/message/create_like_node_or_post`,
  "message--create_mention_comment": `${API_URL}/jsonapi/message/create_mention_comment`,
  "message--create_mention_comment_stream": `${API_URL}/jsonapi/message/create_mention_comment_stream`,
  "message--create_mention_post": `${API_URL}/jsonapi/message/create_mention_post`,
  "message--create_mention_post_stream": `${API_URL}/jsonapi/message/create_mention_post_stream`,
  "message--create_post_community": `${API_URL}/jsonapi/message/create_post_community`,
  "message--create_post_group": `${API_URL}/jsonapi/message/create_post_group`,
  "message--create_post_profile": `${API_URL}/jsonapi/message/create_post_profile`,
  "message--create_post_profile_stream": `${API_URL}/jsonapi/message/create_post_profile_stream`,
  "message--create_private_message": `${API_URL}/jsonapi/message/create_private_message`,
  "message--create_topic_community": `${API_URL}/jsonapi/message/create_topic_community`,
  "message--create_topic_gc": `${API_URL}/jsonapi/message/create_topic_gc`,
  "message--create_topic_group": `${API_URL}/jsonapi/message/create_topic_group`,
  "message--event_request_approved": `${API_URL}/jsonapi/message/event_request_approved`,
  "message--invite_event_enrollment": `${API_URL}/jsonapi/message/invite_event_enrollment`,
  "message--invited_to_join_group": `${API_URL}/jsonapi/message/invited_to_join_group`,
  "message--join_to_group": `${API_URL}/jsonapi/message/join_to_group`,
  "message--member_added_by_event_organiser": `${API_URL}/jsonapi/message/member_added_by_event_organiser`,
  "message--moved_content_between_groups": `${API_URL}/jsonapi/message/moved_content_between_groups`,
  "message--private_message_notification": `${API_URL}/jsonapi/message/private_message_notification`,
  "message--request_event_enrollment": `${API_URL}/jsonapi/message/request_event_enrollment`,
  "message--request_to_join_a_group": `${API_URL}/jsonapi/message/request_to_join_a_group`,
  "message--user_was_enrolled_to_event": `${API_URL}/jsonapi/message/user_was_enrolled_to_event`,
  "message_template--message_template": `${API_URL}/jsonapi/message_template/message_template`,
  "metatag_defaults--metatag_defaults": `${API_URL}/jsonapi/metatag_defaults/metatag_defaults`,
  "node--album": `${API_URL}/jsonapi/node/album`,
  "node--book": `${API_URL}/jsonapi/node/book`,
  "node--event": `${API_URL}/jsonapi/node/event`,
  "node--landing_page": `${API_URL}/jsonapi/node/landing_page`,
  "node--page": `${API_URL}/jsonapi/node/page`,
  "node--topic": `${API_URL}/jsonapi/node/topic`,
  "node_type--node_type": `${API_URL}/jsonapi/node_type/node_type`,
  "paragraph--accordion": `${API_URL}/jsonapi/paragraph/accordion`,
  "paragraph--accordion_item": `${API_URL}/jsonapi/paragraph/accordion_item`,
  "paragraph--block": `${API_URL}/jsonapi/paragraph/block`,
  "paragraph--button": `${API_URL}/jsonapi/paragraph/button`,
  "paragraph--featured": `${API_URL}/jsonapi/paragraph/featured`,
  "paragraph--featured_item": `${API_URL}/jsonapi/paragraph/featured_item`,
  "paragraph--featured_items": `${API_URL}/jsonapi/paragraph/featured_items`,
  "paragraph--hero": `${API_URL}/jsonapi/paragraph/hero`,
  "paragraph--hero_small": `${API_URL}/jsonapi/paragraph/hero_small`,
  "paragraph--introduction": `${API_URL}/jsonapi/paragraph/introduction`,
  "paragraph--section": `${API_URL}/jsonapi/paragraph/section`,
  "paragraphs_type--paragraphs_type": `${API_URL}/jsonapi/paragraphs_type/paragraphs_type`,
  "path_alias--path_alias": `${API_URL}/jsonapi/path_alias/path_alias`,
  "post--photo": `${API_URL}/jsonapi/post/photo`,
  "post--post": `${API_URL}/jsonapi/post/post`,
  "post_type--post_type": `${API_URL}/jsonapi/post_type/post_type`,
  "private_message--private_message": `${API_URL}/jsonapi/private_message/private_message`,
  "private_message_thread--private_message_thread": `${API_URL}/jsonapi/private_message_thread/private_message_thread`,
  "profile--profile": `${API_URL}/jsonapi/profile/profile`,
  "profile_type--profile_type": `${API_URL}/jsonapi/profile_type/profile_type`,
  "queue_storage_entity--email": `${API_URL}/jsonapi/queue_storage_entity/email`,
  "queue_storage_entity_type--queue_storage_entity_type": `${API_URL}/jsonapi/queue_storage_entity_type/queue_storage_entity_type`,
  "redirect--redirect": `${API_URL}/jsonapi/redirect/redirect`,
  "search_api_index--search_api_index": `${API_URL}/jsonapi/search_api_index/search_api_index`,
  "search_api_server--search_api_server": `${API_URL}/jsonapi/search_api_server/search_api_server`,
  "search_api_task--search_api_task": `${API_URL}/jsonapi/search_api_task/search_api_task`,
  "taxonomy_term--event_types": `${API_URL}/jsonapi/taxonomy_term/event_types`,
  "taxonomy_term--expertise": `${API_URL}/jsonapi/taxonomy_term/expertise`,
  "taxonomy_term--group_type": `${API_URL}/jsonapi/taxonomy_term/group_type`,
  "taxonomy_term--interests": `${API_URL}/jsonapi/taxonomy_term/interests`,
  "taxonomy_term--nationality": `${API_URL}/jsonapi/taxonomy_term/nationality`,
  "taxonomy_term--profile_organization_tag": `${API_URL}/jsonapi/taxonomy_term/profile_organization_tag`,
  "taxonomy_term--profile_tag": `${API_URL}/jsonapi/taxonomy_term/profile_tag`,
  "taxonomy_term--report_reasons": `${API_URL}/jsonapi/taxonomy_term/report_reasons`,
  "taxonomy_term--social_tagging": `${API_URL}/jsonapi/taxonomy_term/social_tagging`,
  "taxonomy_term--topic_types": `${API_URL}/jsonapi/taxonomy_term/topic_types`,
  "taxonomy_vocabulary--taxonomy_vocabulary": `${API_URL}/jsonapi/taxonomy_vocabulary/taxonomy_vocabulary`,
  "ultimate_cron_job--ultimate_cron_job": `${API_URL}/jsonapi/ultimate_cron_job/ultimate_cron_job`,
  "user--user": `${API_URL}/jsonapi/user/user`,
  "user_consent--user_consent": `${API_URL}/jsonapi/user_consent/user_consent`,
  "user_role--user_role": `${API_URL}/jsonapi/user_role/user_role`,
  "view--view": `${API_URL}/jsonapi/view/view`,
  "vote--dislike": `${API_URL}/jsonapi/vote/dislike`,
  "vote--like": `${API_URL}/jsonapi/vote/like`,
  "vote--vote": `${API_URL}/jsonapi/vote/vote`,
  "vote_result--vote_result": `${API_URL}/jsonapi/vote_result/vote_result`,
  "vote_type--vote_type": `${API_URL}/jsonapi/vote_type/vote_type`
};

function getCategory(key) {
  if (key.startsWith('node--') || key.startsWith('node_type')) return 'Nodes & Content';
  if (key.startsWith('user') || key.startsWith('profile')) return 'Users & Profiles';
  if (key.startsWith('group')) return 'Groups & Memberships';
  if (key.startsWith('post')) return 'Posts & Feed';
  if (key.startsWith('comment')) return 'Comments';
  if (key.startsWith('message')) return 'Messages & Activity';
  if (key.startsWith('taxonomy_term') || key.startsWith('taxonomy_vocabulary')) return 'Taxonomy & Tags';
  if (key.startsWith('paragraph')) return 'Paragraph Components';
  if (key.startsWith('flag') || key.startsWith('vote')) return 'Interactions & Flags';
  if (key.startsWith('block')) return 'Blocks';
  if (key.startsWith('crop')) return 'Media & Crops';
  return 'System & Configuration';
}

export default function ApiDocsPage() {
  const { isMobile } = useResponsive();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeEndpointKey, setActiveEndpointKey] = useState('post--photo');
  const [selectedMethod, setSelectedMethod] = useState('GET');
  const [queryParams, setQueryParams] = useState({
    include: '',
    sort: '',
    pageLimit: '10',
    filterField: '',
    filterVal: ''
  });
  const [responseState, setResponseState] = useState({
    loading: false,
    status: null,
    time: null,
    data: null,
    error: null
  });
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const parsedEndpoints = useMemo(() => {
    return Object.entries(RAW_ENDPOINTS).map(([key, href]) => {
      const [type, bundle] = key.split('--');
      return {
        key,
        type,
        bundle: bundle || type,
        href,
        category: getCategory(key)
      };
    });
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(parsedEndpoints.map((e) => e.category)));
    return ['All', ...cats.sort()];
  }, [parsedEndpoints]);

  const filteredEndpoints = useMemo(() => {
    return parsedEndpoints.filter((e) => {
      const matchesCat = selectedCategory === 'All' || e.category === selectedCategory;
      const matchesSearch =
        e.key.toLowerCase().includes(search.toLowerCase()) ||
        e.href.toLowerCase().includes(search.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [parsedEndpoints, selectedCategory, search]);

  const activeEndpoint = useMemo(() => {
    return parsedEndpoints.find((e) => e.key === activeEndpointKey) || parsedEndpoints[0];
  }, [parsedEndpoints, activeEndpointKey]);

  const constructedUrl = useMemo(() => {
    if (!activeEndpoint) return '';
    const url = new URL(activeEndpoint.href);
    if (queryParams.include) url.searchParams.set('include', queryParams.include);
    if (queryParams.sort) url.searchParams.set('sort', queryParams.sort);
    if (queryParams.pageLimit) url.searchParams.set('page[limit]', queryParams.pageLimit);
    if (queryParams.filterField && queryParams.filterVal) {
      url.searchParams.set(`filter[${queryParams.filterField}]`, queryParams.filterVal);
    }
    return url.toString();
  }, [activeEndpoint, queryParams]);

  const handleExecute = async () => {
    setResponseState({ loading: true, status: null, time: null, data: null, error: null });
    const startTime = performance.now();
    try {
      const res = await fetch(constructedUrl, {
        method: selectedMethod,
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json'
        }
      });
      const endTime = performance.now();
      const json = await res.json();
      setResponseState({
        loading: false,
        status: res.status,
        time: Math.round(endTime - startTime),
        data: json,
        error: res.ok ? null : `HTTP Error ${res.status}: ${res.statusText}`
      });
    } catch (err) {
      const endTime = performance.now();
      setResponseState({
        loading: false,
        status: 0,
        time: Math.round(endTime - startTime),
        data: null,
        error: `Fetch Failed: ${err.message || 'CORS or Server Offline'}. Make sure ${API_URL} is running.`
      });
    }
  };

  const generateCodeSnippet = () => {
    return `// Next.js / React Fetch Example for ${activeEndpoint.key}
async function fetch${activeEndpoint.bundle.replace(/[^a-zA-Z0-9]/g, '_')}Data() {
  const response = await fetch('${constructedUrl}', {
    method: '${selectedMethod}',
    headers: {
      'Accept': 'application/vnd.api+json'
    },
    next: { revalidate: 60 }
  });

  if (!response.ok) {
    throw new Error(\`Failed to fetch: \${response.statusText}\`);
  }

  const json = await response.json();
  return json.data;
}`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generateCodeSnippet());
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.brandGroup}>
          <div style={{ ...styles.logoBadge, display: 'flex', alignItems: 'center', gap: 6 }}><Terminal size={15} /> {parsedEndpoints.length} APIS</div>
          <div>
            <h1 style={{ ...styles.title, fontSize: isMobile ? '17px' : '22px' }}>All {parsedEndpoints.length} JSON:API Endpoints Documentation</h1>
            <p style={styles.subtitle}>Full Drupal Backend Dictionary Explorer & Client</p>
          </div>
        </div>
      </header>

      <div style={{ ...styles.layout, gridTemplateColumns: isMobile ? '1fr' : '340px 1fr', padding: isMobile ? '16px' : '24px 32px' }}>
        <aside style={{ ...styles.sidebar, maxHeight: isMobile ? '40vh' : 'calc(100vh - 120px)', position: isMobile ? 'static' : 'sticky' }}>
          <input
            type="text"
            placeholder={`Search ${parsedEndpoints.length} endpoints...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.categoryPills}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  ...styles.catButton,
                  ...(selectedCategory === cat ? styles.catButtonActive : {})
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={styles.endpointList}>
            {filteredEndpoints.map((item) => (
              <div
                key={item.key}
                onClick={() => setActiveEndpointKey(item.key)}
                style={{
                  ...styles.endpointItem,
                  ...(activeEndpointKey === item.key ? styles.endpointItemActive : {})
                }}
              >
                <span style={styles.getBadge}>GET</span>
                <span style={styles.itemKey}>{item.key}</span>
              </div>
            ))}
          </div>
        </aside>

        <main style={styles.mainContent}>
          {activeEndpoint && (
            <>
              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <select
                      value={selectedMethod}
                      onChange={(e) => setSelectedMethod(e.target.value)}
                      style={styles.methodSelect}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <h2 style={styles.endpointTitle}>{activeEndpoint.key}</h2>
                  </div>
                  <span style={styles.categoryBadge}>{activeEndpoint.category}</span>
                </div>

                <div style={{ ...styles.urlBox, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                  <span style={styles.urlLabel}>Target URL:</span>
                  <code style={{ ...styles.urlCode, wordBreak: 'break-all' }}>{constructedUrl}</code>
                </div>

                {activeEndpoint.key === 'file--file' && selectedMethod === 'POST' && (
                  <div style={{ marginTop: '14px', padding: '14px', backgroundColor: '#faf5ff', border: '1px solid #d8b4fe', borderRadius: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#6b21a8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Lightbulb size={15} /> Drupal JSON:API Binary File Upload Instructions (POST /jsonapi/file/file):
                    </span>
                    <p style={{ fontSize: '12px', color: '#581c87', margin: '0 0 8px 0', lineHeight: '1.5' }}>
                      To POST a file entity to Drupal, pass raw binary file bytes in the request body with the following headers:
                    </p>
                    <code style={{ display: 'block', backgroundColor: '#3b0764', color: '#e9d5ff', padding: '10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace' }}>
                      Content-Type: application/octet-stream<br/>
                      Accept: application/vnd.api+json<br/>
                      Content-Disposition: file; filename="my-photo.png"
                    </code>
                  </div>
                )}

                <div style={{ marginTop: '16px' }}>
                  <h3 style={styles.sectionTitle}>Query Parameters</h3>
                  <div style={styles.paramGrid}>
                    <input
                      type="text"
                      placeholder="include (e.g. uid,field_media)"
                      value={queryParams.include}
                      onChange={(e) => setQueryParams({ ...queryParams, include: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      type="text"
                      placeholder="sort (e.g. -created)"
                      value={queryParams.sort}
                      onChange={(e) => setQueryParams({ ...queryParams, sort: e.target.value })}
                      style={styles.input}
                    />
                    <input
                      type="number"
                      placeholder="limit (e.g. 10)"
                      value={queryParams.pageLimit}
                      onChange={(e) => setQueryParams({ ...queryParams, pageLimit: e.target.value })}
                      style={styles.input}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={handleExecute} disabled={responseState.loading} style={styles.executeButton}>
                      {responseState.loading ? 'Executing...' : <><Zap size={15} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />Send Request</>}
                    </button>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.sectionTitle}>Next.js Code Snippet</h3>
                  <button onClick={handleCopyCode} style={styles.copyButton}>
                    {copiedSnippet ? <><Check size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />Copied!</> : <><Copy size={13} style={{ verticalAlign: 'text-bottom', marginRight: 5 }} />Copy Code</>}
                  </button>
                </div>
                <pre style={styles.codeSnippet}>{generateCodeSnippet()}</pre>
              </div>

              <div style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3 style={styles.sectionTitle}>Response Payload</h3>
                  {responseState.status !== null && (
                    <span style={{ fontSize: '12px', color: responseState.status >= 200 && responseState.status < 300 ? '#059669' : '#dc2626', fontWeight: 'bold' }}>
                      Status: {responseState.status} ({responseState.time} ms)
                    </span>
                  )}
                </div>
                <pre style={styles.jsonViewer}>
                  {responseState.data ? JSON.stringify(responseState.data, null, 2) : responseState.error || '// Click "Send Request" to test live payload'}
                </pre>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// Light White Theme Styles
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    color: '#0f172a',
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    padding: '20px 32px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e2e8f0'
  },
  brandGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  logoBadge: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: '13px',
    padding: '6px 12px',
    borderRadius: '6px'
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    margin: 0,
    color: '#0f172a'
  },
  subtitle: {
    fontSize: '13px',
    margin: 0,
    color: '#64748b'
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '340px 1fr',
    gap: '24px',
    padding: '24px 32px',
    maxWidth: '1600px',
    margin: '0 auto'
  },
  sidebar: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 'calc(100vh - 120px)',
    position: 'sticky',
    top: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#0f172a',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: '12px'
  },
  categoryPills: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
    maxHeight: '100px',
    overflowY: 'auto'
  },
  catButton: {
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    color: '#64748b',
    borderRadius: '16px',
    padding: '4px 10px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  catButtonActive: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    borderColor: '#4f46e5'
  },
  endpointList: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1
  },
  endpointItem: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  endpointItemActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#4f46e5'
  },
  getBadge: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    borderRadius: '4px'
  },
  itemKey: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#0f172a'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
    marginBottom: '16px'
  },
  methodSelect: {
    backgroundColor: '#059669',
    color: '#ffffff',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px'
  },
  endpointTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
    color: '#0f172a'
  },
  categoryBadge: {
    backgroundColor: '#f1f5f9',
    color: '#475569',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px'
  },
  urlBox: {
    backgroundColor: '#f8fafc',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  urlLabel: {
    fontSize: '12px',
    color: '#64748b'
  },
  urlCode: {
    color: '#4f46e5',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: '600',
    margin: 0,
    color: '#0f172a'
  },
  paramGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginTop: '12px'
  },
  input: {
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#0f172a',
    fontSize: '13px',
    outline: 'none'
  },
  executeButton: {
    backgroundColor: '#4f46e5',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '14px',
    padding: '10px 24px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer'
  },
  copyButton: {
    backgroundColor: '#f1f5f9',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  codeSnippet: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    color: '#a5b4fc',
    fontSize: '13px',
    fontFamily: 'monospace',
    overflowX: 'auto',
    margin: 0
  },
  jsonViewer: {
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    color: '#34d399',
    fontSize: '13px',
    fontFamily: 'monospace',
    maxHeight: '450px',
    overflow: 'auto',
    margin: 0
  }
};
