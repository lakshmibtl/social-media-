'use client';

import React from 'react';
import Link from 'next/link';
import { Pin, MessageCircle, Eye } from 'lucide-react';
import { C, P, S } from '../../lib/theme';

export default function TopicsPage() {
  const topics = [
    {
      id: 't1',
      title: 'Best Practices for Headless Next.js Performance & Micro-Animations',
      author: 'Alex Rivera',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      category: 'Frontend Engineering',
      replies: 18,
      views: 340,
      time: 'Yesterday'
    },
    {
      id: 't2',
      title: 'Building Decoupled Social Portals with Clean White Aesthetic',
      author: 'Sarah Chen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      category: 'Design Systems',
      replies: 9,
      views: 195,
      time: '3 days ago'
    }
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <Link href="/" style={styles.backLink}>← Return to Feed</Link>
          <h1 style={{ ...styles.title, display: 'flex', alignItems: 'center', gap: '8px' }}><Pin size={22} color={C.primaryText} /> Discussion Forum & Topics</h1>
          <p style={styles.subtitle}>Ask questions, start threads, and share knowledge with your team</p>
        </div>
        <button style={styles.newThreadBtn}>+ New Topic</button>
      </header>

      <main style={styles.main}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {topics.map((t) => (
            <div key={t.id} style={styles.topicCard}>
              <img src={t.avatar} alt={t.author} style={styles.avatar} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={styles.catBadge}>{t.category}</span>
                  <span style={styles.timeText}>{t.time}</span>
                </div>
                <h2 style={styles.topicTitle}>{t.title}</h2>
                <span style={styles.authorSub}>Started by <strong>{t.author}</strong></span>
              </div>
              <div style={styles.statsCol}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}><MessageCircle size={13} /> {t.replies} Replies</span>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}><Eye size={13} /> {t.views} Views</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#faf8ff',
    color: C.heading,
    fontFamily: 'Inter, system-ui, sans-serif'
  },
  header: {
    padding: '24px 40px',
    backgroundColor: '#ffffff',
    borderBottom: `1px solid ${C.border}`,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px'
  },
  backLink: {
    color: C.primaryText,
    textDecoration: 'none',
    fontSize: '13px',
    fontWeight: '700'
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
  newThreadBtn: {
    ...P.btn,
    borderRadius: '8px',
    padding: '10px 22px',
    fontSize: '14px'
  },
  main: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 20px'
  },
  topicCard: {
    backgroundColor: '#ffffff',
    border: `1px solid ${C.border}`,
    borderRadius: '14px',
    padding: '20px',
    boxShadow: S.card,
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap'
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    objectFit: 'cover'
  },
  catBadge: {
    backgroundColor: C.primarySoft,
    color: C.primary,
    fontSize: '11px',
    fontWeight: 'bold',
    padding: '3px 8px',
    borderRadius: '6px'
  },
  timeText: {
    fontSize: '12px',
    color: C.muted
  },
  topicTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: C.heading,
    margin: '0 0 4px 0'
  },
  authorSub: {
    fontSize: '12px',
    color: C.muted
  },
  statsCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
    color: C.muted,
    fontWeight: '600',
    textAlign: 'right'
  }
};
