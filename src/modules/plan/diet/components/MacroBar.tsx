/**
 * modules/plan/diet/components/MacroBar.tsx
 *
 * Progress bar for a single macro (protein/carbs/fats): label, current vs goal
 * in grams, and a colored fill. Used by TodayTab's macro summary card.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { radius } from '@/theme/spacing';

export function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <View style={mb.wrap}>
      <View style={mb.row}>
        <Text style={mb.label}>{label}</Text>
        <Text style={mb.value}>{Math.round(current)}g / {goal}g</Text>
      </View>
      <View style={mb.track}>
        <View style={[mb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  wrap:  { marginBottom: 12 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { ...typography.label, color: colors.text.muted, lineHeight: 16 },
  value: { ...typography.caption, color: colors.text.secondary, lineHeight: 16 },
  track: { height: 5, backgroundColor: colors.bg.elevated, borderRadius: radius.full, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: radius.full },
});
