// Professional Corporate Blue design tokens — shared across all pages.
// Import in a page with:  import { C, P, G, S } from '../../lib/theme';

export const C = {
  // Surfaces
  bg: '#f4f7f9',          // page background (cool gray-blue)
  card: '#ffffff',        // card background
  border: '#e1e8f0',      // soft slate border
  borderLight: '#edf2f7', // lighter border (hover/rows)
  borderStrong: '#cbd5e1',// stronger slate border

  // Text
  text: '#1e293b',        // deep slate body text
  heading: '#0f172a',     // darkest navy headings
  muted: '#64748b',       // muted slate gray
  faint: '#94a3b8',       // lightest secondary text
  onDark: '#ffffff',

  // Accents
  primary: '#07518a',     // Corporate Blue (requested)
  primarySoft: '#e0efff', // light translucent blue
  primaryText: '#0c66ad', // slightly lighter blue for text
  accent: '#0ea5e9',      // bright sky blue
  accentSoft: '#e0f2fe',  // light sky blue
  indigo: '#2563eb',      // rich blue
  cyan: '#0891b2',        // dark cyan
  amber: '#f59e0b',
  success: '#10b981',
  successSoft: '#d1fae5',
  danger: '#ef4444',
  dangerSoft: '#fee2e2',
};

// Gradients
export const G = {
  hero: 'linear-gradient(135deg, #07518a 0%, #0c66ad 55%, #0ea5e9 100%)',
  brand: 'linear-gradient(135deg, #07518a 0%, #0ea5e9 100%)',
  brandPink: 'linear-gradient(135deg, #0f172a 0%, #07518a 100%)', // repurposed to dark navy
  pink: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)',      // repurposed to bright blue
  cyan: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)',
};

// Shadows
export const S = {
  card: '0 2px 12px rgba(7, 81, 138, 0.08)',
  cardHover: '0 10px 30px -6px rgba(7, 81, 138, 0.22)',
  glow: '0 10px 30px -10px rgba(7, 81, 138, 0.4)',
  glowPink: '0 10px 30px -10px rgba(14, 165, 233, 0.45)', // repurposed to blue glow
};

// Reusable style presets (spread into style props)
export const P = {
  btn: {
    background: G.brand,
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: S.glow,
  },
  btnGhost: {
    background: C.primarySoft,
    color: C.primary,
    border: 'none',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
  },
  hero: {
    background: G.hero,
    color: '#ffffff',
    borderRadius: 20,
    boxShadow: S.glow,
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    boxShadow: S.card,
  },
  chip: {
    background: C.primarySoft,
    color: C.primary,
    borderRadius: 999,
    fontWeight: 700,
  },
  input: {
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    background: '#ffffff',
  },
  gradientText: {
    background: G.brand,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
};
