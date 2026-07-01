/**
 * modules/plan/home/components/BloodworkButton.tsx
 *
 * A standalone "Bloodwork" button at the bottom of PlanScreen. Bloodwork is a Plan
 * stack screen (not a bottom tab), so it needs its own entry point here rather than
 * a section card. Tapping it pushes BloodworkScreen onto the PlanNavigator stack.
 * Kept as its own file because its styling and navigation target differ from the
 * three SectionCards above it.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

export function BloodworkButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={s.btn} onPress={onPress} activeOpacity={0.75}>
      <Ionicons name="medical-outline" size={15} color={colors.text.inverse} />
      <Text style={s.label}>BLOODWORK</Text>
      <Ionicons name="chevron-forward" size={15} color={colors.text.inverse} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  label: {
    fontFamily: typography.fonts.display,
    fontSize: 14,
    color: colors.text.inverse,
    letterSpacing: 0.5,
    flex: 1,
  },
});
