/**
 * modules/plan/review/components/WeightTracker.tsx
 *
 * Start/end weight for the week, actual vs. expected (calorie-math) change,
 * and a water-retention flag when the two disagree by a lot. Shows a prompt
 * instead when fewer than two weight logs exist.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeeklyAnalysisResult } from '@/engine/weekly-review';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

function signedKg(n: number): string {
  return (n > 0 ? '+' : '') + n.toFixed(2);
}

export function WeightTracker({ result }: { result: WeeklyAnalysisResult }) {
  const hasWeight =
    result.startWeightKg !== null && result.endWeightKg !== null;
  const hasBoth =
    hasWeight && result.expectedWeightChangeKg !== null;

  if (!hasWeight) {
    return (
      <View style={wt.card}>
        <Text style={wt.emptyText}>Log your weight at least twice this week to see change tracking.</Text>
      </View>
    );
  }

  const actualColor =
    result.waterRetentionSuspected ? colors.gold : colors.text.primary;

  return (
    <View style={wt.card}>
      <View style={wt.scaleRow}>
        <View style={wt.scaleBlock}>
          <Text style={wt.scaleLabel}>START</Text>
          <Text style={wt.scaleNum}>{result.startWeightKg!.toFixed(1)}</Text>
          <Text style={wt.unit}>kg</Text>
        </View>
        <Ionicons
          name="arrow-forward"
          size={20}
          color={colors.text.muted}
          style={{ alignSelf: 'center', marginBottom: 4 }}
        />
        <View style={wt.scaleBlock}>
          <Text style={wt.scaleLabel}>END</Text>
          <Text style={[wt.scaleNum, { color: actualColor }]}>
            {result.endWeightKg!.toFixed(1)}
          </Text>
          <Text style={wt.unit}>kg</Text>
        </View>
        <View style={wt.changeBadge}>
          <Text style={[wt.changeBig, { color: actualColor }]}>
            {signedKg(result.actualWeightChangeKg!)} kg
          </Text>
          <Text style={wt.changeLabel}>actual change</Text>
        </View>
      </View>

      {hasBoth && (
        <View style={wt.comparison}>
          <View style={wt.compRow}>
            <Text style={wt.compLabel}>Expected (calorie math)</Text>
            <Text style={wt.compValue}>
              {signedKg(result.expectedWeightChangeKg!)} kg
            </Text>
          </View>
          <View style={wt.compRow}>
            <Text style={wt.compLabel}>Actual</Text>
            <Text style={[wt.compValue, { color: actualColor }]}>
              {signedKg(result.actualWeightChangeKg!)} kg
            </Text>
          </View>
          {result.waterRetentionSuspected && (
            <View style={wt.retentionFlag}>
              <Ionicons name="water-outline" size={14} color={colors.gold} />
              <Text style={wt.retentionText}>
                Large discrepancy — water retention likely, not fat change
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const wt = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: 12,
  },
  emptyText: {
    ...typography.footnote,
    color: colors.text.muted,
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  scaleBlock: { alignItems: 'center', gap: 2 },
  scaleLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scaleNum: {
    fontFamily: typography.fonts.display,
    fontSize: 32,
    lineHeight: 42,
    color: colors.text.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.muted,
  },
  changeBadge: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  changeBig: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 36,
  },
  changeLabel: {
    ...typography.caption,
    color: colors.text.muted,
  },
  comparison: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: 10,
    gap: 8,
  },
  compRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compLabel: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  compValue: {
    ...typography.footnote,
    fontFamily: typography.fonts.semibold,
    fontWeight: '600',
    color: colors.text.primary,
  },
  retentionFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.goldMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 2,
  },
  retentionText: {
    ...typography.caption,
    color: colors.gold,
    flex: 1,
  },
});
