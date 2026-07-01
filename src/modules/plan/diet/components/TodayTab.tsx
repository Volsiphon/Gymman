/**
 * modules/plan/diet/components/TodayTab.tsx
 *
 * The Diet screen's default tab: calorie/macro summary card (consumed vs the
 * daily target from GoalsContext), today's food log list with per-item delete,
 * and the two entry points for logging — AI coach chat or the manual modal.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LogItem } from '@/services/ai/nutritionCoach';
import type { NutritionGoals } from '@/types/user';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { MacroBar } from './MacroBar';

const ACCENT = colors.success;
const LIME   = colors.primary;
const BLUE   = colors.info;

type TodayTabProps = {
  log: LogItem[];
  goals: NutritionGoals;
  isDynamic: boolean;
  onRemove: (id: string) => void;
  onManualLog: () => void;
  onOpenCoach: () => void;
};

export function TodayTab({ log, goals, isDynamic, onRemove, onManualLog, onOpenCoach }: TodayTabProps) {
  const totals = log.reduce(
    (acc, item) => ({ calories: acc.calories + item.calories, protein: acc.protein + item.protein, carbs: acc.carbs + item.carbs, fats: acc.fats + item.fats }),
    { calories: 0, protein: 0, carbs: 0, fats: 0 },
  );
  const remaining = goals.calories - totals.calories;
  const isOver    = remaining < 0;
  const calPct    = Math.min((totals.calories / goals.calories) * 100, 100);

  return (
    <ScrollView style={tt.root} contentContainerStyle={tt.content} showsVerticalScrollIndicator={false}>
      {/* Macro summary card */}
      <View style={tt.card}>
        <View style={tt.calRow}>
          <View>
            <Text style={[tt.calNumber, isOver && { color: colors.danger }]}>{Math.round(totals.calories)}</Text>
            <Text style={tt.calGoal}>
              of {goals.calories} kcal{isDynamic ? '  ⚡ Dynamic' : ''}
            </Text>
          </View>
          <View style={tt.remainWrap}>
            <Text style={[tt.remainNum, { color: isOver ? colors.danger : colors.gold }]}>
              {Math.abs(Math.round(remaining))} kcal
            </Text>
            <Text style={tt.remainLabel}>{isOver ? 'over goal' : 'remaining'}</Text>
          </View>
        </View>
        <View style={tt.calBar}>
          <View style={[tt.calBarFill, { width: `${calPct}%` as any, backgroundColor: isOver ? colors.danger : colors.gold }]} />
        </View>
        <MacroBar label="PROTEIN" current={totals.protein} goal={goals.protein} color={colors.info} />
        <MacroBar label="CARBS"   current={totals.carbs}   goal={goals.carbs}   color={ACCENT} />
        <MacroBar label="FATS"    current={totals.fats}    goal={goals.fats}    color={colors.danger} />
      </View>

      {/* Log list */}
      <View style={tt.section}>
        <View style={tt.sectionHeader}>
          <Text style={tt.sectionTitle}>TODAY'S LOG</Text>
          <Text style={tt.sectionCount}>{log.length} items</Text>
        </View>
        {log.length === 0 ? (
          <View style={tt.emptyCard}>
            <Text style={tt.emptyText}>Nothing logged yet</Text>
            <Text style={tt.emptyHint}>Tell your AI Coach what you ate, or log manually below.</Text>
          </View>
        ) : (
          log.map((item) => (
            <View key={item.id} style={tt.logRow}>
              <View style={tt.logLeft}>
                <Text style={tt.logName}>{item.name}</Text>
                <Text style={tt.logAmount}>{item.amount}</Text>
              </View>
              <View style={tt.logRight}>
                <Text style={tt.logCal}>{Math.round(item.calories)} kcal</Text>
                <Text style={tt.logMacros}>P:{Math.round(item.protein)} C:{Math.round(item.carbs)} F:{Math.round(item.fats)}</Text>
              </View>
              <TouchableOpacity
                style={tt.deleteBtn}
                onPress={() => onRemove(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.text.disabled} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Action buttons — stacked */}
      <View style={tt.actions}>
        <TouchableOpacity style={tt.coachBtn} onPress={onOpenCoach} activeOpacity={0.85}>
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text.inverse} />
          <Text style={tt.coachBtnText}>Talk to AI Coach to Log Food</Text>
        </TouchableOpacity>
        <TouchableOpacity style={tt.manualBtn} onPress={onManualLog} activeOpacity={0.85}>
          <Ionicons name="pencil-outline" size={20} color={colors.text.inverse} />
          <Text style={tt.manualBtnText}>Log What You Ate Manually</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const tt = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.screenPadding, paddingBottom: 40, gap: spacing.md },

  card: { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md },

  calRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  calNumber:  { ...typography.statSmall, lineHeight: 52, color: colors.text.primary },
  calGoal:    { ...typography.caption, color: colors.text.muted, marginTop: 4 },
  remainWrap: { alignItems: 'flex-end', flexShrink: 0 },
  remainNum:  { fontFamily: typography.fonts.bold, fontSize: 22, lineHeight: 28, fontWeight: '700' },
  remainLabel:{ ...typography.caption, color: colors.text.muted, marginTop: 3 },

  calBar:    { height: 4, backgroundColor: colors.bg.elevated, borderRadius: radius.full, marginBottom: 18, overflow: 'hidden' },
  calBarFill:{ height: '100%', borderRadius: radius.full },

  section:       { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { ...typography.label, color: colors.text.muted },
  sectionCount:  { ...typography.caption, color: colors.text.muted },

  emptyCard: { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: 32, alignItems: 'center', gap: 6 },
  emptyText: { ...typography.callout, color: colors.text.muted },
  emptyHint: { ...typography.caption, color: colors.text.disabled, textAlign: 'center' },

  logRow:   { backgroundColor: colors.bg.card, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center' },
  logLeft:  { flex: 1 },
  logName:  { ...typography.callout, color: colors.text.primary, fontWeight: '500' },
  logAmount:{ ...typography.caption, color: colors.text.muted, marginTop: 2 },
  logRight: { alignItems: 'flex-end', marginRight: 10, flexShrink: 0 },
  logCal:   { ...typography.subhead, color: colors.gold, fontWeight: '600', lineHeight: 22 },
  logMacros:{ ...typography.caption, color: colors.text.muted, marginTop: 3, lineHeight: 16 },
  deleteBtn:{ padding: 2 },

  actions:      { gap: 10 },
  coachBtn:     { backgroundColor: LIME, borderRadius: radius.card, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  coachBtnText: { ...typography.subhead, color: colors.text.inverse, fontWeight: '700', fontSize: 16 },
  manualBtn:    { backgroundColor: BLUE, borderRadius: radius.card, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  manualBtnText:{ ...typography.subhead, color: colors.text.inverse, fontWeight: '700', fontSize: 16 },
});
