/**
 * modules/plan/bloodwork/BloodworkScreen.tsx
 *
 * The Bloodwork tracker — a Plan stack screen (not a bottom tab) reached by tapping
 * the Bloodwork button on PlanScreen. Shows the latest log as a summary card with
 * highlight pills, a history of past logs, and prep tips. Entry and detail views
 * are full-screen modals (AddLogModal / LogDetailModal). The most recent snapshot
 * is fed into the Master Coach's system prompt so it can factor blood health into
 * its advice.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import {
  METRICS,
  loadBloodworkLogs,
  saveBloodworkLog,
  deleteBloodworkLog,
  type BloodworkLog,
} from '@/services/storage/local/bloodworkStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { PrepTipsCard } from './components/PrepTipsCard';
import { AddLogModal } from './components/AddLogModal';
import { LogDetailModal } from './components/LogDetailModal';
import { formatDate, filledCount } from './utils';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Bloodwork'>;
};

const ACCENT       = colors.danger;
const ACCENT_MUTED = colors.dangerMuted;

// Keys to show as preview pills on the summary/history cards
const PREVIEW_KEYS = ['totalT', 'vitD', 'hsCrp', 'hba1c', 'fastingGlucose', 'hdl'];

export function BloodworkScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [logs,        setLogs]        = useState<BloodworkLog[]>([]);
  const [showAdd,     setShowAdd]     = useState(false);
  const [detailLog,   setDetailLog]   = useState<BloodworkLog | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadBloodworkLogs().then(setLogs);
    }, []),
  );

  const handleSave = useCallback(async (log: BloodworkLog) => {
    await saveBloodworkLog(log);
    loadBloodworkLogs().then(setLogs);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteBloodworkLog(id);
    setDetailLog(null);
    loadBloodworkLogs().then(setLogs);
  }, []);

  const latestLog     = logs[0] ?? null;
  const hasLogs       = logs.length > 0;

  // Pick 4 highlight values from the latest log to show in the summary card
  const summaryPills = latestLog
    ? PREVIEW_KEYS
        .map(k => ({ def: METRICS.find(m => m.key === k)!, val: latestLog.metrics[k] ?? '' }))
        .filter(x => x.def && x.val.trim())
        .slice(0, 4)
    : [];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {showAdd && (
        <AddLogModal onClose={() => setShowAdd(false)} onSave={handleSave} />
      )}
      {detailLog && (
        <LogDetailModal
          log={detailLog}
          onClose={() => setDetailLog(null)}
          onDelete={() => handleDelete(detailLog.id)}
        />
      )}

      {/* ── Screen header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Bloodwork</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: spacing.tabBarHeight + spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Summary / empty state ── */}
        {hasLogs ? (
          <View style={s.summaryCard}>
            <View style={s.summaryTop}>
              <View style={{ flex: 1 }}>
                <Text style={s.summaryMeta}>LAST LOGGED</Text>
                <Text style={s.summaryDate}>{formatDate(latestLog!.date)}</Text>
              </View>
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{filledCount(latestLog!.metrics)}</Text>
                <Text style={s.countBadgeLabel}>markers</Text>
              </View>
            </View>
            {summaryPills.length > 0 && (
              <View style={s.pillRow}>
                {summaryPills.map(({ def, val }) => (
                  <View key={def.key} style={s.pill}>
                    <Text style={s.pillName}>{def.label.split(' ')[0]}</Text>
                    <Text style={s.pillVal}>{val}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons name="medical-outline" size={30} color={ACCENT} />
            </View>
            <Text style={s.emptyTitle}>No logs yet</Text>
            <Text style={s.emptyText}>
              Monthly bloodwork is one of the sharpest tools for tracking hormones, metabolic health, and micronutrients. Log your results here and your Coach will use them to refine your plan.
            </Text>
          </View>
        )}

        {/* ── Add button ── */}
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
          <Ionicons name="add-circle-outline" size={20} color={colors.text.inverse} />
          <Text style={s.addBtnText}>Add New Log</Text>
        </TouchableOpacity>

        {/* ── Prep tips ── */}
        <PrepTipsCard startExpanded={!hasLogs} />

        {/* ── Past logs ── */}
        {hasLogs && (
          <View style={s.histSection}>
            <Text style={s.histLabel}>PAST LOGS</Text>
            {logs.map(log => {
              const preview = PREVIEW_KEYS
                .map(k => ({ def: METRICS.find(m => m.key === k)!, val: log.metrics[k] ?? '' }))
                .filter(x => x.val.trim())
                .slice(0, 3);

              return (
                <TouchableOpacity
                  key={log.id}
                  style={s.logCard}
                  onPress={() => setDetailLog(log)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={s.logDate}>{formatDate(log.date)}</Text>
                    {preview.length > 0 && (
                      <View style={s.logPillRow}>
                        {preview.map(({ def, val }) => (
                          <View key={def.key} style={s.logPill}>
                            <Text style={s.logPillText}>
                              {def.label.split(' ')[0]}: {val}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {log.notes ? (
                      <Text style={s.logNote} numberOfLines={1}>{log.notes}</Text>
                    ) : null}
                  </View>
                  <View style={s.logRight}>
                    <Text style={s.logCount}>{filledCount(log.metrics)}</Text>
                    <Text style={s.logCountSub}>markers</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
  },
  headerTitle: { ...typography.subhead, color: colors.text.secondary },

  scroll: { padding: spacing.screenPadding, gap: spacing.md },

  // Empty state
  emptyCard:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.lg, alignItems: 'center', gap: 10 },
  emptyIcon:  { width: 56, height: 56, borderRadius: radius.full, backgroundColor: ACCENT_MUTED, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typography.title3, color: colors.text.primary },
  emptyText:  { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },

  // Summary card
  summaryCard: { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: ACCENT + '44', padding: spacing.md, gap: spacing.md },
  summaryTop:  { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryMeta: { ...typography.label, color: colors.text.muted, marginBottom: 4 },
  summaryDate: { ...typography.title3, color: colors.text.primary },
  countBadge:  { backgroundColor: ACCENT_MUTED, borderRadius: radius.card, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  countBadgeText:  { fontFamily: typography.fonts.display, fontSize: 28, lineHeight: 34, color: ACCENT },
  countBadgeLabel: { ...typography.caption, color: ACCENT },
  pillRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill:        { backgroundColor: colors.bg.elevated, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 6, gap: 2 },
  pillName:    { ...typography.caption, color: colors.text.muted },
  pillVal:     { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },

  // Add button
  addBtn:     { backgroundColor: ACCENT, borderRadius: radius.button, height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { ...typography.subhead, color: colors.text.inverse, fontWeight: '700' },

  // History
  histSection: { gap: 8 },
  histLabel:   { ...typography.label, color: colors.text.muted, paddingHorizontal: 2 },
  logCard:     { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logDate:     { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  logPillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  logPill:     { backgroundColor: colors.bg.elevated, borderRadius: radius.sm, paddingHorizontal: 7, paddingVertical: 3 },
  logPillText: { ...typography.caption, color: colors.text.secondary },
  logNote:     { ...typography.caption, color: colors.text.muted, fontStyle: 'italic' },
  logRight:    { alignItems: 'center', gap: 2 },
  logCount:    { fontFamily: typography.fonts.display, fontSize: 22, lineHeight: 28, color: ACCENT },
  logCountSub: { ...typography.caption, color: colors.text.muted },
});
