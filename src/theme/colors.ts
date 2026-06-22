// Internal palette — raw values, not exported.
// Consumers use semantic names below, never these directly.
const p = {
  black: '#000000',
  n950: '#0A0A0B',
  n900: '#111113',
  n850: '#18181B',
  n800: '#1C1C1F',
  n700: '#27272A',
  n600: '#3F3F46',
  n500: '#52525B',
  n400: '#71717A',
  n300: '#A1A1AA',
  n200: '#D4D4D8',
  n100: '#F4F4F5',
  white: '#FFFFFF',

  red700: '#9F1025',
  red600: '#C4162E',
  red500: '#D91F3A',
  red400: '#F43F5E',
  red300: '#FB7185',

  orange500: '#FB923C',
  orange400: '#FDBA74',

  amber400: '#FCD34D',

  green500: '#22C55E',

  cyan500: '#06B6D4',

  gold500: '#EAB308',
} as const;

export const colors = {
  // ─── Backgrounds ───────────────────────────────────────────────
  bg: {
    app: p.n950,       // root screen background
    card: p.n900,      // cards, list items
    elevated: p.n850,  // bottom sheets, modals
    input: p.n800,     // text inputs
    overlay: 'rgba(0,0,0,0.75)',
  },

  // ─── Brand ─────────────────────────────────────────────────────
  primary: p.red500,
  primaryLight: p.red400,
  primaryDark: p.red700,
  primaryMuted: 'rgba(217, 31, 58, 0.15)',
  primaryBorder: 'rgba(217, 31, 58, 0.35)',

  // ─── Semantic ──────────────────────────────────────────────────
  success: p.green500,
  successMuted: 'rgba(34, 197, 94, 0.15)',

  // Danger is brighter than primary red so errors read as alarms, not brand
  danger: p.red400,
  dangerMuted: 'rgba(244, 63, 94, 0.15)',

  info: p.cyan500,
  infoMuted: 'rgba(6, 182, 212, 0.15)',

  gold: p.gold500,
  goldMuted: 'rgba(234, 179, 8, 0.15)',

  // ─── Streak Flames ─────────────────────────────────────────────
  // 3-flame max lands on brand red — peak achievement = brand color
  flame: {
    one: p.amber400,
    two: p.orange500,
    three: p.red500,
  },

  // ─── Text ──────────────────────────────────────────────────────
  text: {
    primary: p.white,
    secondary: p.n300,
    muted: p.n400,
    disabled: p.n600,
    inverse: p.n950,
  },

  // ─── Borders ───────────────────────────────────────────────────
  border: {
    default: p.n700,
    subtle: p.n800,
    strong: p.n600,
  },

  transparent: 'transparent',
  white: p.white,
  black: p.black,
};
