/**
 * modules/plan/review/components/DayGrid.tsx
 *
 * M–S grid for the review week: one column per day with two dots — diet
 * logged (primary) and weight logged (info) — plus a legend row.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export interface DayStatus {
  dietLogged: boolean;
  weightLogged: boolean;
  isToday: boolean;
}

export function DayGrid({ days }: { days: DayStatus[] }) {
  return (
    <View style={dg.card}>
      <View style={dg.row}>
        {DAY_LABELS.map((label, i) => {
          const d = days[i];
          return (
            <View key={i} style={dg.col}>
              <Text style={[dg.dayLabel, d.isToday && dg.todayLabel]}>{label}</Text>
              {/* Diet dot */}
              <View style={[dg.dot, d.dietLogged ? dg.dotDiet : dg.dotEmpty]} />
              {/* Weight dot */}
              <View style={[dg.dot, d.weightLogged ? dg.dotWeight : dg.dotEmpty]} />
            </View>
          );
        })}
      </View>
      <View style={dg.legend}>
        <View style={dg.legendItem}>
          <View style={[dg.dot, dg.dotDiet]} />
          <Text style={dg.legendText}>Diet</Text>
        </View>
        <View style={dg.legendItem}>
          <View style={[dg.dot, dg.dotWeight]} />
          <Text style={dg.legendText}>Weight</Text>
        </View>
        <View style={dg.legendItem}>
          <View style={[dg.dot, dg.dotEmpty]} />
          <Text style={dg.legendText}>Not logged</Text>
        </View>
      </View>
    </View>
  );
}

const dg = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    ...typography.label,
    color: colors.text.muted,
    fontSize: 12,
  },
  todayLabel: {
    color: colors.primary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotDiet: {
    backgroundColor: colors.primary,
  },
  dotWeight: {
    backgroundColor: colors.info,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.strong,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    paddingTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendText: {
    ...typography.caption,
    color: colors.text.muted,
  },
});
