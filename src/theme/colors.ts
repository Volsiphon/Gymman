// Internal palette — raw hex values, not exported.
const p = {
  // ── App surfaces ───────────────────────────────────────────────
  bg:      '#14161A',
  panel:   '#1E2128',
  panel2:  '#262B33',
  border:  '#2E333D',
  border2: '#3A3F4A',

  // ── Text ───────────────────────────────────────────────────────
  text:      '#F2F0EB',
  textMuted: '#8B8F99',
  textFaint: '#6B7280',

  // ── Brand ──────────────────────────────────────────────────────
  accent: '#C8FF3D',

  // ── Semantic ───────────────────────────────────────────────────
  green:  '#22C55E',
  coral:  '#FF5E5B',
  blue:   '#64B5F6',
  gold:   '#EAB308',
  amber:  '#FCD34D',
  orange: '#FB923C',

  // ── Absolute ───────────────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const colors = {
  // ─── Backgrounds ───────────────────────────────────────────────
  bg: {
    app:     p.bg,       // root screen background
    card:    p.panel,    // cards, list items
    elevated: p.panel2,  // bottom sheets, modals, nested panels
    input:   p.panel2,   // text inputs
    overlay: 'rgba(0,0,0,0.75)',
  },

  // ─── Brand / Accent ────────────────────────────────────────────
  primary:       p.accent,
  primaryLight:  '#D4FF62',
  primaryDark:   '#A8D425',
  primaryMuted:  'rgba(200,255,61,0.12)',
  primaryBorder: 'rgba(200,255,61,0.30)',

  // ─── Semantic ──────────────────────────────────────────────────
  success:      p.green,
  successMuted: 'rgba(34,197,94,0.12)',

  danger:      p.coral,
  dangerMuted: 'rgba(255,94,91,0.12)',

  info:      p.blue,
  infoMuted: 'rgba(100,181,246,0.12)',

  gold:      p.gold,
  goldMuted: 'rgba(234,179,8,0.12)',

  // ─── Streak flames ─────────────────────────────────────────────
  flame: {
    one:   p.amber,
    two:   p.orange,
    three: p.accent,   // peak streak hits the brand accent
  },

  // ─── Text ──────────────────────────────────────────────────────
  text: {
    primary:   p.text,       // main readable text
    secondary: p.textMuted,  // labels, captions
    muted:     p.textFaint,  // hints, timestamps
    disabled:  '#4A5060',
    inverse:   p.bg,         // dark text on accent (lime) button
  },

  // ─── Borders ───────────────────────────────────────────────────
  border: {
    default: p.border,   // card borders, container outlines
    subtle:  p.border2,  // hairline dividers within cards
    strong:  '#4A5568',
  },

  transparent: 'transparent',
  white: p.white,
  black: p.black,
};
