import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
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

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Bloodwork'>;
};

const ACCENT       = colors.danger;
const ACCENT_MUTED = colors.dangerMuted;

// ── Tier metadata ──────────────────────────────────────────────────────────────

const TIER_DEFS = [
  {
    tier:     1 as const,
    label:    'Tier 1 — Essential',
    sub:      'Recommended for everyone serious about training',
    color:    ACCENT,
  },
  {
    tier:     2 as const,
    label:    'Tier 2 — Performance',
    sub:      'Recovery and optimization markers',
    color:    colors.gold,
  },
  {
    tier:     3 as const,
    label:    'Tier 3 — Advanced',
    sub:      'Only if indicated by symptoms, family history, or physician',
    color:    colors.info,
  },
] as const;

// Pre-compute category groups per tier once at module load
const TIER_GROUPS = TIER_DEFS.map(td => ({
  ...td,
  categories: [...new Set(METRICS.filter(m => m.tier === td.tier).map(m => m.category))].map(cat => ({
    category: cat,
    metrics:  METRICS.filter(m => m.tier === td.tier && m.category === cat),
  })),
}));

// Keys to show as preview pills on the summary/history cards
const PREVIEW_KEYS = ['totalT', 'vitD', 'hsCrp', 'hba1c', 'fastingGlucose', 'hdl'];

const PREP_TIPS = [
  { icon: 'time-outline'    as const, text: 'Fast for 8–12 hours beforehand (water is fine).' },
  { icon: 'sunny-outline'   as const, text: 'Get tested 7–10 AM, especially for testosterone and cortisol.' },
  { icon: 'barbell-outline' as const, text: 'Avoid intense training 24–48 h before — CK and some hormones shift after hard sessions.' },
  { icon: 'wine-outline'    as const, text: 'No alcohol for 24–48 hours.' },
  { icon: 'water-outline'   as const, text: 'Stay well hydrated the morning of the draw.' },
  { icon: 'flask-outline'   as const, text: 'High-dose biotin users: pause 2–3 days before — it interferes with several lab assays.' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function filledCount(metrics: Record<string, string>): number {
  return Object.values(metrics).filter(v => v.trim()).length;
}

// ── PrepTipsCard ──────────────────────────────────────────────────────────────

function PrepTipsCard({ startExpanded }: { startExpanded: boolean }) {
  const [open, setOpen] = useState(startExpanded);

  return (
    <View style={pt.card}>
      <TouchableOpacity style={pt.header} onPress={() => setOpen(v => !v)} activeOpacity={0.75}>
        <View style={pt.iconWrap}>
          <Ionicons name="time-outline" size={17} color={colors.gold} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pt.title}>BEFORE YOUR DRAW</Text>
          <Text style={pt.sub}>How to get accurate, consistent results</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.text.muted} />
      </TouchableOpacity>

      {open && (
        <>
          <View style={pt.dividerTop} />
          {PREP_TIPS.map((tip, i) => (
            <View key={i} style={pt.row}>
              <View style={pt.rowIcon}>
                <Ionicons name={tip.icon} size={14} color={colors.gold} />
              </View>
              <Text style={pt.rowText}>{tip.text}</Text>
            </View>
          ))}
          <View style={pt.noteSep} />
          <View style={pt.note}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
            <Text style={pt.noteText}>
              Got a DEXA scan, VO₂ max test, or blood pressure reading? Share it in the{' '}
              <Text style={pt.noteHighlight}>Coach tab</Text>
              {' '}— it complements your bloodwork and helps refine your plan.
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const pt = StyleSheet.create({
  card:      { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  header:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md },
  iconWrap:  { width: 32, height: 32, borderRadius: radius.full, backgroundColor: 'rgba(234,179,8,0.12)', alignItems: 'center', justifyContent: 'center' },
  title:     { ...typography.label, color: colors.gold },
  sub:       { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  dividerTop:{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginHorizontal: spacing.md },
  row:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 9 },
  rowIcon:   { width: 20, alignItems: 'center', paddingTop: 1 },
  rowText:   { ...typography.callout, color: colors.text.secondary, flex: 1, lineHeight: 20 },
  noteSep:   { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginHorizontal: spacing.md, marginTop: 4 },
  note:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.md, paddingTop: 10 },
  noteText:  { ...typography.footnote, color: colors.text.muted, flex: 1, lineHeight: 18 },
  noteHighlight: { color: colors.primary, fontFamily: typography.fonts.semibold },
});

// ── AddLogModal ───────────────────────────────────────────────────────────────

type AddLogModalProps = {
  onClose: () => void;
  onSave:  (log: BloodworkLog) => void;
};

function AddLogModal({ onClose, onSave }: AddLogModalProps) {
  const insets = useSafeAreaInsets();
  const [date,          setDate]          = useState(todayIso());
  const [values,        setValues]        = useState<Record<string, string>>({});
  const [notes,         setNotes]         = useState('');
  const [openTiers,     setOpenTiers]     = useState<Set<number>>(new Set([1]));

  const setVal = useCallback((key: string, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }));
  }, []);

  const toggleTier = useCallback((tier: number) => {
    setOpenTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
    });
  }, []);

  const filled   = filledCount(values);
  const canSave  = filled > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ id: uid(), date: date.trim() || todayIso(), metrics: values, notes: notes.trim() });
    onClose();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[am.root, { backgroundColor: colors.bg.app, paddingTop: insets.top }]}>

        {/* ── Header ── */}
        <View style={am.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={am.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={am.title}>New Log</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={[am.save, !canSave && am.saveDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* ── Date row ── */}
        <View style={am.dateRow}>
          <Ionicons name="calendar-outline" size={15} color={colors.text.muted} />
          <Text style={am.dateLabel}>DATE</Text>
          <TextInput
            style={am.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.text.disabled}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />
          <TouchableOpacity onPress={() => setDate(todayIso())} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={am.todayChip}>Today</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={am.scroll}
            contentContainerStyle={[am.scrollContent, { paddingBottom: insets.bottom + 32 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={am.hint}>Fill in whatever values you have from your lab report. Leave the rest blank.</Text>

            {TIER_GROUPS.map(({ tier, label, sub, color, categories }) => {
              const isOpen   = openTiers.has(tier);
              const tierFill = categories.reduce((n, g) =>
                n + g.metrics.filter(m => (values[m.key] ?? '').trim()).length, 0);

              return (
                <View key={tier} style={am.tierBlock}>
                  <TouchableOpacity
                    style={am.tierHeader}
                    onPress={() => toggleTier(tier)}
                    activeOpacity={0.75}
                  >
                    <View style={[am.tierDot, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[am.tierLabel, { color }]}>{label}</Text>
                      <Text style={am.tierSub}>{sub}</Text>
                    </View>
                    {tierFill > 0 && (
                      <View style={[am.badge, { backgroundColor: color + '22' }]}>
                        <Text style={[am.badgeText, { color }]}>{tierFill}</Text>
                      </View>
                    )}
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={15} color={colors.text.muted} />
                  </TouchableOpacity>

                  {isOpen && categories.map(({ category, metrics }) => (
                    <View key={category} style={am.catBlock}>
                      <Text style={am.catLabel}>{category.toUpperCase()}</Text>
                      {metrics.map(m => (
                        <View key={m.key} style={am.metricRow}>
                          <Text style={am.metricName} numberOfLines={1}>{m.label}</Text>
                          <TextInput
                            style={am.metricInput}
                            value={values[m.key] ?? ''}
                            onChangeText={v => setVal(m.key, v)}
                            placeholder={m.unit}
                            placeholderTextColor={colors.text.disabled}
                            returnKeyType="next"
                            keyboardType="default"
                          />
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}

            {/* Notes */}
            <View style={am.notesBlock}>
              <Text style={am.catLabel}>NOTES</Text>
              <TextInput
                style={am.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="How you felt, doctor's comments, anything worth remembering…"
                placeholderTextColor={colors.text.disabled}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  cancel:      { ...typography.callout, color: colors.text.muted },
  title:       { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  save:        { ...typography.callout, color: ACCENT, fontWeight: '600' },
  saveDisabled:{ color: colors.text.disabled },

  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.screenPadding, paddingVertical: 12, backgroundColor: colors.bg.card, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  dateLabel:   { ...typography.label, color: colors.text.muted },
  dateInput:   { flex: 1, ...typography.callout, color: colors.text.primary, padding: 0 },
  todayChip:   { ...typography.caption, color: ACCENT, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: ACCENT_MUTED, borderRadius: radius.badge },

  scroll:        { flex: 1 },
  scrollContent: { padding: spacing.screenPadding, gap: spacing.sm },
  hint:          { ...typography.footnote, color: colors.text.muted, textAlign: 'center', paddingVertical: spacing.xs },

  tierBlock:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: spacing.md },
  tierDot:    { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  tierLabel:  { ...typography.subhead, fontWeight: '600' },
  tierSub:    { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  badge:      { borderRadius: radius.badge, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  badgeText:  { ...typography.label, fontWeight: '700' },

  catBlock:   { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 6 },
  catLabel:   { ...typography.label, color: colors.text.muted, marginTop: 12, marginBottom: 4 },
  metricRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.elevated, borderRadius: radius.input, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  metricName: { ...typography.footnote, color: colors.text.secondary, flex: 1 },
  metricInput:{ ...typography.callout, color: colors.text.primary, width: 90, textAlign: 'right', padding: 0 },

  notesBlock:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md },
  notesInput:  { ...typography.callout, color: colors.text.primary, backgroundColor: colors.bg.elevated, borderRadius: radius.input, padding: 12, minHeight: 88 },
});

// ── LogDetailModal ────────────────────────────────────────────────────────────

type DetailProps = {
  log:      BloodworkLog;
  onClose:  () => void;
  onDelete: () => void;
};

function LogDetailModal({ log, onClose, onDelete }: DetailProps) {
  const insets = useSafeAreaInsets();
  const count  = filledCount(log.metrics);

  const groupedFilled = TIER_GROUPS.map(td => ({
    ...td,
    items: METRICS
      .filter(m => m.tier === td.tier && (log.metrics[m.key] ?? '').trim())
      .map(m => ({ def: m, val: log.metrics[m.key] })),
  })).filter(g => g.items.length > 0);

  const confirmDelete = () => {
    Alert.alert(
      'Delete Log',
      'Remove this bloodwork entry? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ],
    );
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[dm.root, { paddingTop: insets.top }]}>
        <View style={dm.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-down" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <View style={dm.headerCenter}>
            <Text style={dm.headerDate}>{formatDate(log.date)}</Text>
            <Text style={dm.headerSub}>{count} marker{count !== 1 ? 's' : ''} recorded</Text>
          </View>
          <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[dm.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {groupedFilled.map(({ tier, label, color, items }) => (
            <View key={tier} style={dm.section}>
              <Text style={[dm.tierLabel, { color }]}>{label}</Text>
              {items.map(({ def, val }) => (
                <View key={def.key} style={dm.row}>
                  <Text style={dm.name}>{def.label}</Text>
                  <Text style={dm.val}>
                    {val}
                    <Text style={dm.unit}> {def.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          ))}

          {log.notes ? (
            <View style={dm.section}>
              <Text style={[dm.tierLabel, { color: colors.text.muted }]}>NOTES</Text>
              <Text style={dm.notes}>{log.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const dm = StyleSheet.create({
  root:        { flex: 1, backgroundColor: colors.bg.app },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle },
  headerCenter:{ flex: 1, alignItems: 'center', gap: 2 },
  headerDate:  { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  headerSub:   { ...typography.caption, color: colors.text.muted },
  scroll:      { padding: spacing.screenPadding, gap: spacing.md },
  section:     { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  tierLabel:   { ...typography.label, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 8 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  name:        { ...typography.callout, color: colors.text.secondary, flex: 1, marginRight: 12 },
  val:         { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  unit:        { ...typography.caption, color: colors.text.muted, fontWeight: '400' },
  notes:       { ...typography.callout, color: colors.text.secondary, paddingHorizontal: spacing.md, paddingBottom: spacing.md, lineHeight: 22 },
});

// ── BloodworkScreen ───────────────────────────────────────────────────────────

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
