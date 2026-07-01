/**
 * modules/plan/review/components/InsightsList.tsx
 *
 * Bullet list of the engine's weekly insights, each with an icon keyed to its
 * type (info / warning / success / adjustment).
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Insight, InsightType } from '@/engine/weekly-review';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const INSIGHT_ICON: Record<InsightType, { name: string; color: string }> = {
  info:       { name: 'information-circle-outline', color: colors.info },
  warning:    { name: 'warning-outline',            color: colors.gold },
  success:    { name: 'checkmark-circle-outline',   color: colors.success },
  adjustment: { name: 'trending-up-outline',        color: colors.primary },
};

export function InsightsList({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;
  return (
    <View style={ins.container}>
      {insights.map((insight, i) => {
        const { name, color } = INSIGHT_ICON[insight.type];
        return (
          <View key={i} style={ins.row}>
            <Ionicons name={name as any} size={16} color={color} style={{ marginTop: 1 }} />
            <Text style={ins.text}>{insight.text}</Text>
          </View>
        );
      })}
    </View>
  );
}

const ins = StyleSheet.create({
  container: {
    gap: 10,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  text: {
    ...typography.footnote,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 20,
  },
});
