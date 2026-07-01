/**
 * modules/plan/review/components/CalorieSummary.tsx
 *
 * Average daily eaten vs. target, and the weekly net surplus/deficit across
 * the logged days. Pure display of a WeeklyAnalysisResult from the engine.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { WeeklyAnalysisResult } from '@/engine/weekly-review';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

function signedKcal(n: number): string {
  return (n > 0 ? '+' : '') + n.toLocaleString();
}

export function CalorieSummary({ result }: { result: WeeklyAnalysisResult }) {
  const isDeficit = result.totalSurplusDeficit <= 0;
  const netColor  = isDeficit ? colors.primary : colors.danger;

  return (
    <View style={cs.card}>
      <View style={cs.topRow}>
        <View style={cs.block}>
          <Text style={cs.blockLabel}>AVG DAILY</Text>
          <Text style={cs.bigNum}>{result.avgDailyCaloriesEaten.toLocaleString()}</Text>
          <Text style={cs.unit}>kcal eaten</Text>
        </View>
        <View style={cs.vDivider} />
        <View style={cs.block}>
          <Text style={cs.blockLabel}>TARGET</Text>
          <Text style={cs.bigNum}>{Math.round(result.totalGoalCalories / 7).toLocaleString()}</Text>
          <Text style={cs.unit}>kcal goal</Text>
        </View>
      </View>
      <View style={cs.netRow}>
        <Text style={cs.netLabel}>WEEKLY NET</Text>
        <Text style={[cs.netValue, { color: netColor }]}>
          {signedKcal(result.totalSurplusDeficit)} kcal
        </Text>
        <Text style={cs.netSub}>
          {isDeficit ? 'deficit' : 'surplus'} across {result.dietLoggedDays} logged days
        </Text>
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  block: { flex: 1, gap: 2 },
  blockLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigNum: {
    fontFamily: typography.fonts.display,
    fontSize: 40,
    lineHeight: 52,
    color: colors.text.primary,
  },
  unit: {
    ...typography.caption,
    color: colors.text.muted,
  },
  vDivider: {
    width: 1,
    height: 52,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.md,
    alignSelf: 'center',
  },
  netRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: 12,
    gap: 3,
  },
  netLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  netValue: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 36,
  },
  netSub: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
