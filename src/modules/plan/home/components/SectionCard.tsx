/**
 * modules/plan/home/components/SectionCard.tsx
 *
 * A tappable card that navigates to one of the three Plan sub-screens: Diet,
 * Training, or Calory Burn. Shows a title, subtitle, an icon, and a small
 * coloured dot in the corner when the corresponding streak flame is lit (meaning
 * the user has already completed that section today). PlanScreen renders three
 * of these in a column and passes each one a different onPress destination.
 *
 * Also exports the SectionProps interface.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export interface SectionProps {
  title:       string;
  subtitle:    string;
  done:        boolean;
  accentColor: string;
  onPress:     () => void;
}

export function SectionCard({ title, subtitle, done, accentColor, onPress }: SectionProps) {
  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.8}>
      <View style={s.textBlock}>
        <Text style={s.title}>{title}</Text>
        <Text style={s.sub} numberOfLines={1}>{subtitle}</Text>
      </View>
      <View style={s.right}>
        {done && <View style={[s.doneDot, { backgroundColor: accentColor }]} />}
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2, gap: spacing.sm },
  textBlock: { flex: 1, gap: 5 },
  title:     { fontFamily: typography.fonts.display, fontSize: 17, color: colors.text.primary, letterSpacing: 0.3 },
  sub:       { ...typography.footnote, color: colors.text.muted },
  right:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneDot:   { width: 8, height: 8, borderRadius: 4 },
});
