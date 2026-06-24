// All spacing and sizing on a 4-point grid.

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
  screenPadding:    16,    // horizontal padding — matches PDF spec
  screenPaddingTop: 16,
  sectionGap:       28,
  cardPadding:      16,

  // ─── Component dimensions ──────────────────────────────────────
  buttonHeight:   52,
  buttonHeightSm: 40,
  inputHeight:    52,
  tabBarHeight:   83,
  headerHeight:   56,

  // ─── Avatars ───────────────────────────────────────────────────
  avatarSm: 32,
  avatarMd: 48,
  avatarLg: 80,
};

export const radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  '2xl': 28,

  card:   16,     // cards, panels, bottom sheets
  button: 12,     // buttons
  input:   8,     // text inputs, tags — PDF spec
  badge:   6,

  full: 9999,     // pills, avatar circles
};
