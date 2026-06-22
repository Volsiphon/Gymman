// All spacing and sizing on a 4-point grid.
// Components import named values — no magic numbers anywhere else.

export const spacing = {
  // ─── Scale ─────────────────────────────────────────────────────
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
  '4xl': 80,

  // ─── Layout ────────────────────────────────────────────────────
  screenPadding: 20,     // horizontal padding applied to every screen
  screenPaddingTop: 16,  // top content gap below header
  sectionGap: 32,        // vertical space between major page sections
  cardPadding: 16,       // inner padding for Card component

  // ─── Component dimensions ──────────────────────────────────────
  buttonHeight: 52,
  buttonHeightSm: 40,
  inputHeight: 52,
  tabBarHeight: 83,      // iOS with home indicator
  headerHeight: 56,

  // ─── Avatars ───────────────────────────────────────────────────
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 80,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  '2xl': 28,

  card: 16,     // standard Card corner radius
  button: 12,   // standard Button corner radius
  input: 12,    // standard Input corner radius
  badge: 6,

  full: 9999,   // pill shapes and circular avatars
};
