/**
 * theme/typography.ts
 *
 * The app's type system. Use named styles (typography.body, typography.label, etc.)
 * in StyleSheets — they're semantic, not size-based. Spread them in:
 *   { ...typography.label, color: colors.text.muted }
 * Font families must match the keys passed to useFonts() in App.tsx.
 */

import type { TextStyle } from 'react-native';

// Font family name constants — must match the keys passed to useFonts() in App.tsx.
export const FONTS = {
  display:    'Anton_400Regular',    // Anton — hero stats, large screen titles
  regular:    'Inter_400Regular',    // Inter — body copy, labels
  medium:     'Inter_500Medium',     // Inter Medium — subheadings, UI labels
  semibold:   'Inter_600SemiBold',   // Inter SemiBold — strong labels
  bold:       'Inter_700Bold',       // Inter Bold — card titles, buttons
  malayalam:  'NotoSansMalayalam',   // Malayalam script fallback
} as const;

export const typography = {
  fonts: FONTS,

  // ─── Raw scale ─────────────────────────────────────────────────
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 40,
    '5xl': 48,
    '6xl': 56,
  },

  weights: {
    regular: '400' as TextStyle['fontWeight'],
    medium:  '500' as TextStyle['fontWeight'],
    semibold:'600' as TextStyle['fontWeight'],
    bold:    '700' as TextStyle['fontWeight'],
    black:   '900' as TextStyle['fontWeight'],
  },

  // ─── Named styles ──────────────────────────────────────────────
  // Hero numbers: calorie totals, streak count, weight stats
  stat: {
    fontFamily: FONTS.display,
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1,
  } as TextStyle,

  statSmall: {
    fontFamily: FONTS.display,
    fontSize: 40,
    lineHeight: 44,
  } as TextStyle,

  // Large screen/section headings
  display: {
    fontFamily: FONTS.display,
    fontSize: 34,
    lineHeight: 40,
  } as TextStyle,

  title1: {
    fontFamily: FONTS.display,
    fontSize: 28,
    lineHeight: 34,
  } as TextStyle,

  title2: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 28,
  } as TextStyle,

  title3: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 25,
  } as TextStyle,

  // Body copy
  body: {
    fontFamily: FONTS.regular,
    fontSize: 17,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 25,
  } as TextStyle,

  bodyMedium: {
    fontFamily: FONTS.medium,
    fontSize: 17,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 25,
  } as TextStyle,

  // Supporting text
  callout: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
  } as TextStyle,

  subhead: {
    fontFamily: FONTS.medium,
    fontSize: 15,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
  } as TextStyle,

  footnote: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 18,
  } as TextStyle,

  // Tiny labels and tags — always uppercase
  caption: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 14,
  } as TextStyle,

  label: {
    fontFamily: FONTS.semibold,
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  } as TextStyle,
};
