import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '@/navigation/navigation/types';
import {
  saveBodyWeight, loadBodyWeightLogs, getTodayLog,
  type WeightLog,
} from '@/services/storage/local/bodyWeightStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = BottomTabScreenProps<MainTabParamList, 'Progress'>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtDate(iso: string): string {
  if (iso === todayIso()) return 'Today';
  if (iso === yesterdayIso()) return 'Yesterday';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

// ── Weight chart ──────────────────────────────────────────────────────────────

function WeightChart({ logs }: { logs: WeightLog[] }) {
  const [w, setW] = useState(0);
  const H   = 160;
  const PAD = { top: 12, bottom: 28, left: 38, right: 12 };

  const cW = w - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const weights = logs.map(l => l.kg);
  const rawMin = Math.min(...weights);
  const rawMax = Math.max(...weights);
  const span   = rawMax - rawMin || 2;
  const yMin   = rawMin - span * 0.25;
  const yMax   = rawMax + span * 0.25;

  const px = (i: number) =>
    PAD.left + (logs.length > 1 ? (i / (logs.length - 1)) * cW : cW / 2);
  const py = (kg: number) =>
    PAD.top + (1 - (kg - yMin) / (yMax - yMin)) * cH;

  const pts = logs.map((l, i) => ({ x: px(i), y: py(l.kg) }));

  const yTicks = [yMax, (yMin + yMax) / 2, yMin];

  return (
    <View style={{ height: H }} onLayout={e => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <>
          {yTicks.map((v, i) => (
            <React.Fragment key={i}>
              <View style={[cs.grid, { top: py(v), left: PAD.left }]} />
              <Text style={[cs.yLbl, { top: py(v) - 7 }]}>{v.toFixed(1)}</Text>
            </React.Fragment>
          ))}

          {pts.slice(1).map((pt, i) => {
            const prev = pts[i];
            const dx = pt.x - prev.x;
            const dy = pt.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  left:  (prev.x + pt.x) / 2 - len / 2,
                  top:   (prev.y + pt.y) / 2 - 1,
                  width: len, height: 2, borderRadius: 1,
                  backgroundColor: colors.primary,
                  transform: [{ rotate: `${angle}deg` }],
                }}
              />
            );
          })}

          {pts.map((pt, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                left: pt.x - 5, top: pt.y - 5,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: colors.primary,
                borderWidth: 2, borderColor: colors.bg.card,
              }}
            />
          ))}

          <Text style={[cs.xLbl, { left: PAD.left }]}>{fmtDate(logs[0].date)}</Text>
          {logs.length > 1 && (
            <Text style={[cs.xLbl, { right: PAD.right, textAlign: 'right' }]}>
              {fmtDate(logs[logs.length - 1].date)}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export function ProgressScreen(_: Props) {
  const insets = useSafeAreaInsets();
  const [logs, setLogs]           = useState<WeightLog[]>([]);
  const [todayKg, setTodayKg]     = useState<number | null>(null);
  const [modal, setModal]         = useState(false);
  const [input, setInput]         = useState('');

  useFocusEffect(useCallback(() => {
    loadBodyWeightLogs().then(setLogs);
    getTodayLog().then(setTodayKg);
  }, []));

  async function handleSave() {
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val) || val < 20 || val > 300) {
      Alert.alert('Invalid weight', 'Enter a weight between 20 and 300 kg.');
      return;
    }
    await saveBodyWeight(val);
    const updated = await loadBodyWeightLogs();
    setLogs(updated);
    setTodayKg(val);
    setModal(false);
    setInput('');
  }

  // Most recent first for the list
  const listLogs = [...logs].reverse();
  const hasLogs  = logs.length > 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Progress</Text>
        <TouchableOpacity
          style={s.addBtn}
          activeOpacity={0.8}
          onPress={() => { setInput(todayKg?.toString() ?? ''); setModal(true); }}
        >
          <Ionicons name={todayKg ? 'create-outline' : 'add'} size={20} color={colors.text.inverse} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>

        {/* Chart */}
        <View style={s.chartCard}>
          {hasLogs ? (
            <>
              <Text style={s.chartLabel}>Weight (kg)</Text>
              <WeightChart logs={logs} />
            </>
          ) : (
            <View style={s.chartEmpty}>
              <Ionicons name="trending-up-outline" size={30} color={colors.text.muted} />
              <Text style={s.emptyTitle}>No data yet</Text>
              <Text style={s.emptySub}>Log your weight to see the trend graph</Text>
            </View>
          )}
        </View>

        {/* Log list */}
        {hasLogs ? (
          <View style={s.listCard}>
            {listLogs.map((log, i) => (
              <React.Fragment key={log.date}>
                <View style={s.logRow}>
                  <Text style={[s.logDate, log.date === todayIso() && s.logDateToday]}>
                    {fmtDate(log.date)}
                  </Text>
                  <Text style={s.logKg}>{log.kg.toFixed(1)} kg</Text>
                </View>
                {i < listLogs.length - 1 && <View style={s.rowDivider} />}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <TouchableOpacity
            style={s.logBtn}
            activeOpacity={0.85}
            onPress={() => { setInput(''); setModal(true); }}
          >
            <Ionicons name="add" size={18} color={colors.text.inverse} style={{ marginRight: 6 }} />
            <Text style={s.logBtnText}>Log today's weight</Text>
          </TouchableOpacity>
        )}

        {/* Tip — always visible */}
        <View style={s.tipRow}>
          <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} style={{ marginTop: 1 }} />
          <Text style={s.tip}>
            Weigh yourself first thing in the morning before eating or drinking — same conditions every day give the most accurate trend.
          </Text>
        </View>

      </ScrollView>

      {/* Modal */}
      <Modal visible={modal} transparent animationType="fade" onRequestClose={() => setModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
          <View style={s.sheet}>
            <Text style={s.sheetTitle}>{todayKg ? "Update today's weight" : "Log today's weight"}</Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.input}
                placeholder="e.g. 78.5"
                placeholderTextColor={colors.text.muted}
                keyboardType="decimal-pad"
                value={input}
                onChangeText={setInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={s.unit}>kg</Text>
            </View>
            <View style={s.actions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModal(false)} activeOpacity={0.75}>
                <Text style={s.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
                <Text style={s.saveTxt}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.subtle,
  },
  title:  { ...typography.title2, color: colors.text.primary },
  addBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },

  body: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md },

  chartCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default, padding: spacing.md,
  },
  chartLabel: { ...typography.caption, color: colors.text.muted, marginBottom: spacing.sm },
  chartEmpty: { height: 140, alignItems: 'center', justifyContent: 'center', gap: 6 },
  emptyTitle: { ...typography.subhead, color: colors.text.secondary },
  emptySub:   { ...typography.footnote, color: colors.text.muted, textAlign: 'center' },

  listCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.card,
    borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden',
  },
  logRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  logDate:       { ...typography.callout, color: colors.text.secondary },
  logDateToday:  { color: colors.primary, fontWeight: '600' },
  logKg:         { ...typography.subhead, color: colors.text.primary },
  rowDivider:    { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle, marginHorizontal: spacing.md },

  logBtn: {
    height: spacing.buttonHeight, backgroundColor: colors.primary,
    borderRadius: radius.button, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  logBtnText: { ...typography.bodyMedium, color: colors.text.inverse },

  tipRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  tip:    { ...typography.footnote, color: colors.text.muted, flex: 1, lineHeight: 18 },

  overlay: { flex: 1, backgroundColor: colors.bg.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.elevated, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, padding: spacing.lg, paddingBottom: spacing.xl, gap: spacing.md,
  },
  sheetTitle: { ...typography.title3, color: colors.text.primary, textAlign: 'center' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.input,
    borderRadius: radius.input, borderWidth: 1, borderColor: colors.border.default,
    height: spacing.inputHeight, paddingHorizontal: spacing.md,
  },
  input:  { flex: 1, ...typography.body, color: colors.text.primary },
  unit:   { ...typography.subhead, color: colors.text.muted },
  actions:   { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: spacing.buttonHeightSm, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.button, borderWidth: 1, borderColor: colors.border.default,
  },
  cancelTxt: { ...typography.subhead, color: colors.text.secondary },
  saveBtn:   {
    flex: 2, height: spacing.buttonHeightSm, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.button, backgroundColor: colors.primary,
  },
  saveTxt: { ...typography.subhead, color: colors.text.inverse },
});

const cs = StyleSheet.create({
  grid: { position: 'absolute', right: 0, height: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
  yLbl: { position: 'absolute', left: 0, width: 34, ...typography.caption, color: colors.text.muted, textAlign: 'right' },
  xLbl: { position: 'absolute', bottom: 0, ...typography.caption, color: colors.text.muted },
});
