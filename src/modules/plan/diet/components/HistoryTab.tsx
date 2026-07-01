/**
 * modules/plan/diet/components/HistoryTab.tsx
 *
 * Past days' diet summaries: date, calories vs goal bar, and macro totals.
 * Currently renders placeholder data — real daily rollups are a pending
 * feature (needs an end-of-day snapshot written from dietLogStorage).
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NutritionGoals } from '@/types/user';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const ACCENT = colors.success;

const DUMMY_HISTORY = [
  { date: 'Thu, Jun 25', calories: 1580, protein: 118, carbs: 162, fats: 41 },
  { date: 'Wed, Jun 24', calories: 1820, protein: 135, carbs: 181, fats: 52 },
  { date: 'Tue, Jun 23', calories: 1650, protein: 122, carbs: 170, fats: 44 },
];

export function HistoryTab({ goals }: { goals: NutritionGoals }) {
  if (DUMMY_HISTORY.length === 0) {
    return (
      <View style={ht.empty}>
        <Ionicons name="time-outline" size={40} color={colors.text.disabled} />
        <Text style={ht.emptyTitle}>No history yet</Text>
        <Text style={ht.emptyHint}>Complete your first day to see it here.</Text>
      </View>
    );
  }
  return (
    <ScrollView style={ht.root} contentContainerStyle={ht.content} showsVerticalScrollIndicator={false}>
      {DUMMY_HISTORY.map((day, i) => {
        const pct    = Math.min((day.calories / goals.calories) * 100, 100);
        const isOver = day.calories > goals.calories;
        return (
          <View key={i} style={ht.card}>
            <View style={ht.cardHeader}>
              <Text style={ht.dateText}>{day.date}</Text>
              <Text style={[ht.calText, { color: isOver ? colors.danger : colors.gold }]}>{Math.round(day.calories)} kcal</Text>
            </View>
            <View style={ht.bar}>
              <View style={[ht.barFill, { width: `${pct}%` as any, backgroundColor: isOver ? colors.danger : colors.gold }]} />
            </View>
            <View style={ht.macroRow}>
              {([['P', day.protein, colors.info], ['C', day.carbs, ACCENT], ['F', day.fats, colors.danger]] as [string, number, string][]).map(([l, v, c]) => (
                <View key={l} style={ht.macroPill}>
                  <View style={[ht.dot, { backgroundColor: c }]} />
                  <Text style={ht.macroText}>{l}: <Text style={ht.macroVal}>{Math.round(v)}g</Text></Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const ht = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.screenPadding, paddingBottom: 40, gap: spacing.sm },
  empty:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: 40 },
  emptyTitle: { ...typography.title3, color: colors.text.muted, textAlign: 'center' },
  emptyHint:  { ...typography.callout, color: colors.text.disabled, textAlign: 'center' },
  card:       { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  dateText:   { ...typography.subhead, color: colors.text.primary },
  calText:    { ...typography.subhead, fontWeight: '700' },
  bar:        { height: 4, backgroundColor: colors.bg.elevated, borderRadius: radius.full, marginBottom: 12, overflow: 'hidden' },
  barFill:    { height: '100%', borderRadius: radius.full },
  macroRow:   { flexDirection: 'row', gap: 16 },
  macroPill:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot:        { width: 7, height: 7, borderRadius: 4 },
  macroText:  { ...typography.caption, color: colors.text.muted },
  macroVal:   { color: colors.text.secondary },
});
