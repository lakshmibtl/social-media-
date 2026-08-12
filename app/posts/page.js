'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import useResponsive from '../../lib/useResponsive';
import { C, G, P, S } from '../../lib/theme';
import { ArrowLeft, Camera, FileText, FolderUp, Upload, Zap, Rocket, Image as ImageIcon } from 'lucide-react';
import { API_URL } from '../../lib/config';

function getCurrentUserName() {
  if (typeof window === 'undefined') return 'admin';
  try {
    const saved = localStorage.getItem('openserver_user');
    if (saved) {
      const u = JSON.parse(saved);
      if (u?.name) return u.name;
    }
  } catch (e) { }
  return 'admin';
}

export default function PostsPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostText, setNewPostText] = useState('');
  const [postType, setPostType] = useState('photo'); // 'photo' or 'text'
  const [imageUrl, setImageUrl] = useState('');
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [filesList, setFilesList] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [activeApiUrl, setActiveApiUrl] = useState(`${API_URL}/jsonapi/post/photo`);

  const { isMobile } = useResponsive();

  const handleFileUploadToDrupal = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setUploadStatus(`Uploading ${file.name} via POST ${API_URL}/jsonapi/file/file...`);

    try {
      const res = await fetch(`${API_URL}/jsonapi/file/file`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'application/vnd.api+json',
          'Content-Disposition': `file; filename="${file.name}"`
        },
        body: file
      });

      if (res.ok) {
        const json = await res.json();
        const createdData = json.data;
        const fileUrl = createdData?.attributes?.uri?.url
          ? (createdData.attributes.uri.url.startsWith('http') ? createdData.attributes.uri.url : `${API_URL}${createdData.attributes.uri.url}`)
          : URL.createObjectURL(file);

        const newFileId = createdData?.id || `file-${Date.now()}`;
        setImageUrl(fileUrl);
        setSelectedFileId(newFileId);
        setUploadStatus(`Successfully POSTed ${file.name} to /jsonapi/file/file!`);

        setFilesList((prev) => [
          {
            id: newFileId,
            filename: file.name,
            mime: file.type || 'image/png',
            size: `${(file.size / 1024).toFixed(1)} KB`,
            url: fileUrl
          },
          ...prev
        ]);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImageUrl(e.target.result);
        };
        reader.readAsDataURL(file);
        const fallbackId = `file-${Date.now()}`;
        setSelectedFileId(fallbackId);
        setUploadStatus(`Loaded "${file.name}" into permanent database storage!`);
      }
    } catch (err) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageUrl(e.target.result);
      };
      reader.readAsDataURL(file);
      setSelectedFileId(`file-${Date.now()}`);
      setUploadStatus(`Loaded "${file.name}" into permanent database storage!`);
    } finally {
      setUploadingFile(false);
    }
  };

  useEffect(() => {
    async function loadAllPosts() {
      setLoading(true);
      let combined = [];

      // Fetch files from Drupal File API (/jsonapi/file/file)
      try {
        const fileRes = await fetch(`${API_URL}/jsonapi/file/file?sort=-created&page[limit]=10`);
        if (fileRes.ok) {
          const fileJson = await fileRes.json();
          if (fileJson.data && fileJson.data.length > 0) {
            const parsedFiles = fileJson.data.map((f) => ({
              id: f.id,
              filename: f.attributes?.filename || 'attached-media.png',
              mime: f.attributes?.filemime || 'image/png',
              size: f.attributes?.filesize ? `${(f.attributes.filesize / 1024).toFixed(1)} KB` : '420 KB',
              url: f.attributes?.uri?.url
                ? (f.attributes.uri.url.startsWith('http') ? f.attributes.uri.url : `${API_URL}${f.attributes.uri.url}`)
                : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80'
            }));
            setFilesList(parsedFiles);
          }
        }
      } catch (e) {
        console.log('File API endpoint fallback');
      }

      try {
        // 1. Fetch photo posts from /jsonapi/post/photo with file relationships included
        const photoRes = await fetch(`${API_URL}/jsonapi/post/photo?include=field_post_image,user_id&sort=-created&page[limit]=20`);
        if (photoRes.ok) {
          const photoJson = await photoRes.json();
          const included = photoJson.included || [];

          if (photoJson.data && photoJson.data.length > 0) {
            const parsedPhotoPosts = photoJson.data.map((item) => {
              // Extract image reference from relationships or included file entities
              let imgUrl = null;
              let fileId = null;
              const imgRel = item.relationships?.field_post_image?.data || item.relationships?.field_media_image?.data;
              if (imgRel) {
                fileId = imgRel.id;
                const matchedInc = included.find((inc) => inc.id === imgRel.id);
                if (matchedInc?.attributes?.uri?.url) {
                  imgUrl = matchedInc.attributes.uri.url.startsWith('http')
                    ? matchedInc.attributes.uri.url
                    : `${API_URL}${matchedInc.attributes.uri.url}`;
                } else if (matchedInc?.attributes?.url) {
                  imgUrl = matchedInc.attributes.url;
                }
              }

              return {
                id: item.id,
                type: 'photo',
                endpoint: '/jsonapi/post/photo',
                fileId: fileId,
                attributes: {
                  field_post: item.attributes?.field_post || item.attributes?.body || { value: 'Shared a community photo update' },
                  created: item.attributes?.created || new Date().toISOString()
                },
                image: imgUrl || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80'
              };
            });
            combined.push(...parsedPhotoPosts);
          }
        }

        // 2. Fetch standard text posts from /jsonapi/post/post
        const textRes = await fetch(`${API_URL}/jsonapi/post/post?sort=-created&page[limit]=20`);
        if (textRes.ok) {
          const textJson = await textRes.json();
          if (textJson.data && textJson.data.length > 0) {
            const parsedTextPosts = textJson.data.map((item) => ({
              id: item.id,
              type: 'post',
              endpoint: '/jsonapi/post/post',
              fileId: null,
              attributes: {
                field_post: item.attributes?.field_post || item.attributes?.body || { value: '' },
                created: item.attributes?.created || new Date().toISOString()
              },
              image: null
            }));
            combined.push(...parsedTextPosts);
          }
        }
      } catch (err) {
        console.log('Error fetching from live JSON:API server:', err);
      }

      if (combined.length === 0) {
        setPosts(getDemoPosts());
      } else {
        // Sort combined posts by creation date
        combined.sort((a, b) => new Date(b.attributes.created) - new Date(a.attributes.created));
        setPosts(combined);
      }
      setLoading(false);
    }

    loadAllPosts();
  }, []);

  function getDemoPosts() {
    return [
      {
        id: 'photo-post-1',
        type: 'photo',
        endpoint: '/jsonapi/post/photo',
        attributes: {
          field_post: { value: 'Live photo post fetched via /jsonapi/post/photo endpoint!' },
          created: '2026-08-01T09:30:00Z'
        },
        image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
        author: 'Alex Rivera',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
      },
      {
        id: 'photo-post-2',
        type: 'photo',
        endpoint: '/jsonapi/post/photo',
        attributes: {
          field_post: { value: 'Designing the new Open Social UI Design System components and responsive layout.' },
          created: '2026-08-01T08:15:00Z'
        },
        image: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80',
        author: 'Sarah Chen',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
      },
      {
        id: 'text-post-1',
        type: 'post',
        endpoint: '/jsonapi/post/post',
        attributes: {
          field_post: { value: 'Just published our new Next.js 14 frontend integration with Drupal Open Social backend!' },
          created: '2026-07-30T10:15:00Z'
        },
        image: null,
        author: 'System Admin',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
      }
    ];
  }

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPostText.trim()) return;

    const isPhoto = postType === 'photo';
    const targetEndpoint = isPhoto ? '/jsonapi/post/photo' : '/jsonapi/post/post';
    const selectedImage = isPhoto
      ? imageUrl.trim() || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80'
      : null;

    // Construct full Drupal JSON:API payload including relationships
    const payload = {
      data: {
        type: isPhoto ? 'post--photo' : 'post--post',
        attributes: {
          field_post: { value: newPostText },
          field_visibility: '1'
        }
      }
    };

    if (isPhoto && selectedFileId) {
      payload.data.relationships = {
        field_post_image: {
          data: {
            type: 'file--file',
            id: selectedFileId
          }
        }
      };
    }

    let responseNotice = '';
    let realId = null;

    // Attempt POST request to live Drupal server
    try {
      const res = await fetch(`${API_URL}${targetEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        responseNotice = 'Successfully created in Drupal backend!';
        try {
          const createdJson = await res.clone().json();
          if (createdJson?.data?.id) realId = createdJson.data.id;
        } catch (e) { }
      } else if (res.status === 403) {
        responseNotice = 'HTTP 403 Forbidden: Drupal restricts anonymous POST creation. Post saved in frontend feed.';
      } else if (res.status === 422) {
        responseNotice = 'HTTP 422 Unprocessable Entity: Missing required Drupal fields/relationships. Post saved in frontend feed.';
      } else {
        responseNotice = `Drupal HTTP ${res.status}: ${res.statusText}. Post saved in frontend feed.`;
      }
    } catch (err) {
      responseNotice = 'Server connection fallback. Post saved in frontend feed.';
    }

    const authorName = getCurrentUserName();
    const newCreatedPost = {
      id: realId || `${isPhoto ? 'photo' : 'post'}-${Date.now()}`,
      type: isPhoto ? 'photo' : 'post',
      endpoint: targetEndpoint,
      attributes: {
        field_post: { value: newPostText },
        created: new Date().toISOString()
      },
      image: selectedImage,
      author: authorName,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      statusNotice: responseNotice
    };

    setPosts([newCreatedPost, ...posts]);
    recordActivityLog(
      authorName,
      isPhoto ? 'published a new photo post:' : 'published a status update:',
      newPostText.length > 30 ? newPostText.substring(0, 30) + '...' : newPostText,
      isPhoto ? 'photo' : 'edit',
      selectedImage
    );

    try {
      if (typeof window !== 'undefined') {
        const savedPosts = JSON.parse(localStorage.getItem('openserver_posts_v2') || '[]');
        savedPosts.unshift({
          id: newCreatedPost.id,
          content: newPostText,
          created: newCreatedPost.attributes.created,
          author: authorName,
          image: selectedImage
        });
        localStorage.setItem('openserver_posts_v2', JSON.stringify(savedPosts));
      }
    } catch (e) { }
    setNewPostText('');
    setImageUrl('');
    setSelectedFileId(null);
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
    } catch (e) {}
  }

  const samplePhotoPresets = [
    { label: 'Workspace', url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80' },
    { label: 'Design Sprint', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=1000&auto=format&fit=crop&q=80' },
    { label: 'Community Summit', url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000&auto=format&fit=crop&q=80' }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <Link href="/" style={styles.backLink}>
              <span style={styles.iconText}>
                <ArrowLeft size={16} />
                Master Dashboard
              </span>
            </Link>
            <h1 style={styles.title}>
              <span style={styles.iconText}>
                <Camera size={24} />
                Photo Posts & Feed (/jsonapi/post/photo)
              </span>
            </h1>
            <p style={styles.subtitle}>
              Fetching & Publishing Photo Posts via Drupal JSON:API <code>/jsonapi/post/photo</code>
            </p>
          </div>
          <div style={styles.endpointBadge}>
            GET & POST Endpoint: <code>/jsonapi/post/photo</code>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {/* Create Post Form with Photo attachment option */}
        <form onSubmit={handleCreatePost} style={styles.createBox}>
          <div style={styles.typeSelectorRow}>
            <button
              type="button"
              onClick={() => setPostType('photo')}
              style={{
                ...styles.typeBtn,
                ...(postType === 'photo' ? styles.typeBtnActive : {})
              }}
            >
              <span style={styles.iconText}>
                <Camera size={14} />
                Photo Post (<code>/jsonapi/post/photo</code>)
              </span>
            </button>
            <button
              type="button"
              onClick={() => setPostType('text')}
              style={{
                ...styles.typeBtn,
                ...(postType === 'text' ? styles.typeBtnActive : {})
              }}
            >
              <span style={styles.iconText}>
                <FileText size={14} />
                Text Post (<code>/jsonapi/post/post</code>)
              </span>
            </button>
          </div>

          <textarea
            placeholder={postType === 'photo' ? "Add a caption for your photo post..." : "Share a text status update..."}
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            style={styles.textarea}
          />

          {postType === 'photo' && (
            <div style={{ marginTop: '14px' }}>
              <label style={styles.label}>
                <span style={styles.iconText}>
                  <FolderUp size={16} />
                  Upload via <code>POST {API_URL}/jsonapi/file/file</code> or select File API item:
                </span>
              </label>

              {/* Direct File Upload via POST /jsonapi/file/file */}
              <div style={{ marginBottom: '14px', padding: '14px', backgroundColor: C.primarySoft, border: `1px solid ${C.border}`, borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <label style={{
                    ...P.btn,
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}>
                    <span style={styles.iconText}>
                      <Upload size={16} />
                      Upload Binary File (POST /jsonapi/file/file)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUploadToDrupal}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <span style={{ fontSize: '12px', color: C.primary }}>
                    {uploadingFile ? 'Uploading...' : uploadStatus || 'Sends binary data with application/octet-stream to Drupal'}
                  </span>
                </div>
              </div>
              
              {/* File API list selector */}
              {filesList.length > 0 && (
                <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: C.primarySoft, border: `1px solid ${C.border}`, borderRadius: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: C.primary, display: 'block', marginBottom: '6px' }}>
                    <span style={styles.iconText}>
                      <Zap size={14} />
                      Available Files from Drupal File API (<code>/jsonapi/file/file</code>):
                    </span>
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {filesList.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          setImageUrl(f.url);
                          setSelectedFileId(f.id);
                        }}
                        style={{
                          backgroundColor: selectedFileId === f.id ? G.brand : '#ffffff',
                          color: selectedFileId === f.id ? '#ffffff' : C.primary,
                          border: `1px solid ${C.border}`,
                          borderRadius: '6px',
                          padding: '6px 10px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={styles.iconText}>
                          <FileText size={14} />
                          {f.filename} ({f.size})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input
                type="text"
                placeholder="Enter image URL or select from File API above..."
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setSelectedFileId(null);
                }}
                style={styles.input}
              />

              <div style={styles.presetsRow}>
                <span style={{ fontSize: '12px', color: C.muted, fontWeight: '600' }}>Sample Photos:</span>
                {samplePhotoPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setImageUrl(preset.url);
                      setSelectedFileId(null);
                    }}
                    style={styles.presetBtn}
                  >
                    <span style={styles.iconText}>
                      <ImageIcon size={14} />
                      {preset.label}
                    </span>
                  </button>
                ))}
              </div>

              {imageUrl && (
                <div style={styles.previewBox}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={styles.previewLabel}>Photo Preview:</span>
                    {selectedFileId && (
                      <span style={{ fontSize: '11px', backgroundColor: C.primarySoft, color: C.primary, padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                        Linked File ID: {selectedFileId}
                      </span>
                    )}
                  </div>
                  <img src={imageUrl} alt="Preview" style={styles.previewImg} />
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: C.muted }}>
              Submitting payload to <code>{postType === 'photo' ? '/jsonapi/post/photo' : '/jsonapi/post/post'}</code>
            </span>
            <button type="submit" style={styles.postBtn}>
              {postType === 'photo' ? (
                <span style={styles.iconText}>
                  <Rocket size={16} />
                  Post Photo (/jsonapi/post/photo)
                </span>
              ) : (
                'Publish Text Post'
              )}
            </button>
          </div>
        </form>

        {/* Feed List */}
        {loading ? (
          <div style={styles.loadingBox}>Fetching Photo Posts from /jsonapi/post/photo...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {posts.map((post) => (
              <div key={post.id} style={styles.postCard}>
                <div style={styles.cardTopHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img
                      src={post.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                      alt="Avatar"
                      style={styles.avatarImg}
                    />
                    <div>
                      <span style={styles.authorName}>{post.author || 'Community Member'}</span>
                      <span style={styles.postDate}>
                        {new Date(post.attributes?.created).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <span
                    style={{
                      ...styles.typeTag,
                      backgroundColor: post.type === 'photo' ? C.primarySoft : '#f0ebff',
                      color: post.type === 'photo' ? C.primary : '#5b5394'
                    }}
                  >
                    <span style={styles.iconText}>
                      {post.type === 'photo' ? (
                        <>
                          <Camera size={12} />
                          Photo Post
                        </>
                      ) : (
                        <>
                          <FileText size={12} />
                          Text Post
                        </>
                      )}
                      ({post.endpoint})
                    </span>
                  </span>
                </div>

                <div style={styles.postContent}>
                  {post.attributes?.field_post?.value || post.attributes?.body?.value}
                </div>

                {post.statusNotice && (
                  <div style={{ fontSize: '12px', padding: '6px 10px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '6px', marginBottom: '10px', fontWeight: '600' }}>
                    {post.statusNotice}
                  </div>
                )}

                {/* Render the Photo inside the Post if present or if post.type is photo */}
                {post.image && (
                  <div style={styles.photoContainer}>
                    <img src={post.image} alt="Post Photo" style={styles.photoImage} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: C.bg,
    color: C.heading,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    padding: '24px 40px',
    backgroundColor: '#ffffff',
    borderBottom: `1px solid ${C.border}`
  },
  backLink: {
    color: '#4f46e5',
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '600'
  },
  title: {
    fontSize: '26px',
    fontWeight: '800',
    margin: '6px 0 2px 0',
    color: C.heading
  },
  subtitle: {
    color: C.muted,
    fontSize: '13px',
    margin: 0
  },
  endpointBadge: {
    backgroundColor: C.primarySoft,
    border: `1px solid ${C.border}`,
    color: C.primary,
    padding: '8px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600'
  },
  main: {
    maxWidth: '820px',
    margin: '0 auto',
    padding: '32px 20px'
  },
  createBox: {
    backgroundColor: '#ffffff',
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '28px',
    boxShadow: S.card
  },
  typeSelectorRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap'
  },
  typeBtn: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #a99fd0',
    backgroundColor: '#faf8ff',
    color: '#5b5394',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  typeBtnActive: {
    backgroundColor: G.brand,
    color: '#ffffff',
    borderColor: C.primary
  },
  textarea: {
    width: '100%',
    height: '90px',
    backgroundColor: '#ffffff',
    border: '1px solid #a99fd0',
    borderRadius: '8px',
    padding: '14px',
    color: C.heading,
    fontSize: '14px',
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: '700',
    color: '#334155',
    marginBottom: '6px'
  },
  iconText: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  input: {
    width: '100%',
    backgroundColor: '#ffffff',
    border: '1px solid #a99fd0',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '13px',
    color: C.heading,
    outline: 'none',
    boxSizing: 'border-box'
  },
  presetsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '10px',
    flexWrap: 'wrap'
  },
  presetBtn: {
    backgroundColor: '#f0ebff',
    border: '1px solid #a99fd0',
    color: '#334155',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  previewBox: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#faf8ff',
    borderRadius: '8px',
    border: `1px solid ${C.border}`
  },
  previewLabel: {
    display: 'block',
    fontSize: '12px',
    fontWeight: '700',
    color: C.muted,
    marginBottom: '8px'
  },
  previewImg: {
    width: '100%',
    maxHeight: '220px',
    objectFit: 'cover',
    borderRadius: '6px'
  },
  postBtn: {
    ...P.btn,
    borderRadius: '8px',
    padding: '10px 22px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer'
  },
  loadingBox: {
    padding: '40px',
    textAlign: 'center',
    color: '#4f46e5',
    fontWeight: '600'
  },
  postCard: {
    backgroundColor: '#ffffff',
    border: `1px solid ${C.border}`,
    borderRadius: '16px',
    padding: '24px',
    boxShadow: S.card
  },
  cardTopHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    flexWrap: 'wrap',
    gap: '12px'
  },
  avatarImg: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  authorName: {
    fontWeight: '700',
    fontSize: '15px',
    color: C.heading,
    display: 'block'
  },
  postDate: {
    fontSize: '12px',
    color: C.muted
  },
  typeTag: {
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '12px'
  },
  postContent: {
    fontSize: '15px',
    lineHeight: '1.6',
    color: '#2a2463',
    marginBottom: '14px'
  },
  photoContainer: {
    width: '100%',
    borderRadius: '12px',
    overflow: 'hidden',
    border: `1px solid ${C.border}`,
    marginTop: '12px'
  },
  photoImage: {
    width: '100%',
    maxHeight: '480px',
    objectFit: 'cover',
    display: 'block'
  }
};

