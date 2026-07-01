/**
 * modules/plan/calory-burn/components/HistoryTab.tsx
 *
 * Past days' activity summaries: one card per day with total kcal burned and
 * the individual activities. Data comes from loadActivityHistory (last 7 days).
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DayActivities } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.gold;

export function HistoryTab({ history }: { history: DayActivities[] }) {
  if (history.length === 0) {
    return (
      <View style={ht.empty}>
        <Ionicons name="time-outline" size={40} color={colors.text.disabled} />
        <Text style={ht.emptyTitle}>No history yet</Text>
        <Text style={ht.emptyHint}>Log your first activity to see it here.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={ht.root} contentContainerStyle={ht.content} showsVerticalScrollIndicator={false}>
      {history.map(({ date, activities }) => {
        const total = activities.reduce((s, a) => s + a.caloriesBurned, 0);
        const label = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
        return (
          <View key={date} style={ht.card}>
            <View style={ht.cardHeader}>
              <Text style={ht.dateText}>{label}</Text>
              <Text style={ht.calText}>{total} kcal burned</Text>
            </View>
            {activities.map((a) => (
              <View key={a.id} style={ht.actRow}>
                <View style={ht.dot} />
                <Text style={ht.actName} numberOfLines={1}>{a.name}</Text>
                <Text style={ht.actCal}>{a.caloriesBurned} kcal</Text>
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const ht = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.screenPadding, paddingBottom: 40, gap: spacing.sm },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: 40 },
  emptyTitle: { ...typography.title3, color: colors.text.muted, textAlign: 'center' },
  emptyHint:  { ...typography.callout, color: colors.text.disabled, textAlign: 'center' },

  card:       { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md, gap: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  dateText:   { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  calText:    { ...typography.subhead, color: ACCENT, fontWeight: '700' },
  actRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: ACCENT + '88', flexShrink: 0 },
  actName:    { ...typography.callout, color: colors.text.secondary, flex: 1 },
  actCal:     { ...typography.caption, color: colors.text.muted },
});
