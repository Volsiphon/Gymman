/**
 * modules/plan/review/components/CalibrationCard.tsx
 *
 * Implied maintenance calories vs. the new estimate, with a confidence badge
 * (high/medium/low) and the delta from the previous estimate. Falls back to
 * a "need more data" message when the week has too few logs to calibrate.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { WeeklyAnalysisResult } from '@/engine/weekly-review';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   colors.success,
  medium: colors.gold,
  low:    colors.danger,
};

export function CalibrationCard({ result }: { result: WeeklyAnalysisResult }) {
  const hasCalibration = result.impliedMaintenanceCal !== null;
  const confidenceColor = CONFIDENCE_COLOR[result.confidence];
  const deltaSign = result.maintenanceDelta >= 0 ? '+' : '';

  return (
    <View style={cal.card}>
      <View style={cal.headerRow}>
        <Text style={cal.title}>CALIBRATION</Text>
        <View style={[cal.confBadge, { borderColor: confidenceColor }]}>
          <Text style={[cal.confText, { color: confidenceColor }]}>
            {result.confidence.toUpperCase()} CONFIDENCE
          </Text>
        </View>
      </View>

      {hasCalibration ? (
        <>
          <View style={cal.mainRow}>
            <View style={cal.mainBlock}>
              <Text style={cal.mainLabel}>IMPLIED MAINTENANCE</Text>
              <Text style={cal.mainNum}>
                {result.impliedMaintenanceCal!.toLocaleString()}
                <Text style={cal.mainUnit}> kcal</Text>
              </Text>
            </View>
            <View style={cal.mainBlock}>
              <Text style={cal.mainLabel}>NEW ESTIMATE</Text>
              <Text style={[cal.mainNum, { color: colors.primary }]}>
                {result.newMaintenanceEstimate.toLocaleString()}
                <Text style={cal.mainUnit}> kcal</Text>
              </Text>
            </View>
          </View>
          {result.maintenanceDelta !== 0 && (
            <View style={cal.deltaRow}>
              <Ionicons
                name={result.maintenanceDelta > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={colors.primary}
              />
              <Text style={cal.deltaText}>
                {`${deltaSign}${result.maintenanceDelta} kcal/day from previous estimate`}
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text style={cal.incompleteText}>
          {result.dietLoggedDays < 5
            ? `Need ${5 - result.dietLoggedDays} more logged days to calibrate.`
            : 'Need at least 2 weight logs to calibrate.'}
        </Text>
      )}
    </View>
  );
}

const cal = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
  },
  confBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  confText: {
    ...typography.caption,
    fontFamily: typography.fonts.semibold,
    fontWeight: '600',
  },
  mainRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  mainBlock: { flex: 1, gap: 3 },
  mainLabel: {
    ...typography.caption,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  mainNum: {
    fontFamily: typography.fonts.display,
    fontSize: 28,
    lineHeight: 36,
    color: colors.text.primary,
  },
  mainUnit: {
    fontFamily: typography.fonts.regular,
    fontSize: 14,
    color: colors.text.muted,
  },
  deltaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deltaText: {
    ...typography.caption,
    color: colors.primary,
  },
  incompleteText: {
    ...typography.footnote,
    color: colors.text.muted,
  },
});
