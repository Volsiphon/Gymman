import { Platform } from 'react-native';
import type { TextStyle } from 'react-native';

// When language is 'ml', components swap fontFamily to this value.
// Font must be loaded via expo-font at app startup before any ml screen renders.
const MALAYALAM_FONT = 'NotoSansMalayalam';

export const typography = {
  fonts: {
    // undefined = OS default (SF Pro on iOS, Roboto on Android)
    default: Platform.select({ ios: undefined, android: undefined, default: undefined }),
    malayalam: MALAYALAM_FONT,
  },

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
    medium: '500' as TextStyle['fontWeight'],
    semibold: '600' as TextStyle['fontWeight'],
    bold: '700' as TextStyle['fontWeight'],
    black: '900' as TextStyle['fontWeight'],
  },

  // ─── Named styles ──────────────────────────────────────────────
  // Components import these directly rather than composing raw tokens.
  // Named after role, not size — so the intent is always clear.

  // Hero numbers: scale weight, calorie totals, progress stats
  stat: {
    fontSize: 56,
    fontWeight: '800' as TextStyle['fontWeight'],
    lineHeight: 60,
    letterSpacing: -2,
  },
  statSmall: {
    fontSize: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 44,
    letterSpacing: -1,
  },

  // Screen and section headings
  display: {
    fontSize: 34,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 41,
    letterSpacing: -0.5,
  },
  title1: {
    fontSize: 28,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 34,
  },
  title2: {
    fontSize: 22,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 28,
  },
  title3: {
    fontSize: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 25,
  },

  // Body copy
  body: {
    fontSize: 17,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 25,
  },
  bodyMedium: {
    fontSize: 17,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 25,
  },

  // Supporting text
  callout: {
    fontSize: 15,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  subhead: {
    fontSize: 15,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 18,
  },

  // Tiny labels and tags — always uppercase
  caption: {
    fontSize: 11,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 14,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
};
