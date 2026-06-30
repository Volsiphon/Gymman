import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  loadWorkoutLogs,
  deleteWorkoutLog,
  updateWorkoutLogFocus,
} from '@/services/storage/local/workoutStorage';
import {
  loadRoutineChanges,
  deleteRoutineChange,
  updateRoutineChangeSummary,
} from '@/services/storage/local/historyStorage';
import type { WorkoutLog, RoutineChangeEvent, SetResult } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type HistoryItem =
  | { type: 'workout'; data: WorkoutLog; timestamp: number }
  | { type: 'change'; data: RoutineChangeEvent; timestamp: number };

type CaptchaAction = 'delete' | 'edit';

const CAPTCHA_WORDS = ['FORGE', 'GRIND', 'PRESS', 'SQUAT', 'CRUSH', 'BLAZE', 'STORM', 'POWER'];

function pickWord(): string {
  return CAPTCHA_WORDS[Math.floor(Math.random() * CAPTCHA_WORDS.length)];
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Mini set row (read-only) ─────────────────────────────────────────────────

function MiniSetRow({ num, result, repsActual }: {
  num: number;
  result: SetResult;
  repsActual?: number;
}) {
  const isDone = result === 'done';
  const isShort = result === 'short';
  const isSkipped = result === 'skipped';

  return (
    <View style={[mr.row, isDone && mr.rowDone, isShort && mr.rowShort, isSkipped && mr.rowSkipped]}>
      <View style={mr.icon}>
        {isDone && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
        {isShort && <Ionicons name="flash" size={16} color="#EAB308" />}
        {isSkipped && <Ionicons name="close-circle" size={16} color={colors.danger} />}
      </View>
      <Text style={[mr.setLabel, isSkipped && mr.textMuted]}>SET {num}</Text>
      <Text style={[mr.result, isDone && mr.resultDone, isShort && mr.resultShort, isSkipped && mr.resultSkipped]}>
        {isDone ? 'Done' : isShort ? `${repsActual} reps` : 'Skipped'}
      </Text>
    </View>
  );
}

// ─── Captcha Confirm Modal ────────────────────────────────────────────────────

function CaptchaModal({
  visible,
  action,
  word,
  itemLabel,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  action: CaptchaAction;
  word: string;
  itemLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState('');

  useEffect(() => {
    if (visible) setInput('');
  }, [visible]);

  const matched = input === word;
  const isDelete = action === 'delete';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <KeyboardAvoidingView
        style={cap.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={cap.sheet}>
          <View style={[cap.iconCircle, !isDelete && cap.iconCircleEdit]}>
            <Ionicons
              name={isDelete ? 'trash-outline' : 'pencil-outline'}
              size={22}
              color={isDelete ? colors.danger : colors.primary}
            />
          </View>

          <Text style={cap.title}>{isDelete ? 'Delete entry?' : 'Edit entry?'}</Text>
          <Text style={cap.label} numberOfLines={2}>{itemLabel}</Text>

          <Text style={cap.hint}>Type this word to confirm:</Text>
          <View style={cap.wordBox}>
            <Text style={cap.word}>{word}</Text>
          </View>

          <TextInput
            style={[cap.input, matched && cap.inputMatched]}
            value={input}
            onChangeText={(v) => setInput(v.toUpperCase())}
            placeholder="Type here…"
            placeholderTextColor={colors.text.disabled}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
          />

          <View style={cap.actions}>
            <TouchableOpacity style={cap.cancelBtn} onPress={onCancel}>
              <Text style={cap.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                cap.confirmBtn,
                matched
                  ? isDelete ? cap.confirmDelete : cap.confirmEdit
                  : cap.confirmOff,
              ]}
              onPress={matched ? onConfirm : undefined}
              activeOpacity={matched ? 0.7 : 1}
            >
              <Text style={[cap.confirmText, !matched && cap.confirmTextOff]}>
                {isDelete ? 'Delete' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({
  visible,
  label,
  initial,
  onSave,
  onCancel,
}: {
  visible: boolean;
  label: string;
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    if (visible) setValue(initial);
  }, [visible, initial]);

  const trimmed = value.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={em.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={em.sheet}>
          <View style={em.handle} />
          <Text style={em.title}>Edit {label}</Text>
          <TextInput
            style={em.input}
            value={value}
            onChangeText={setValue}
            multiline
            autoFocus
            placeholderTextColor={colors.text.disabled}
          />
          <View style={em.actions}>
            <TouchableOpacity style={em.cancelBtn} onPress={onCancel}>
              <Text style={em.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[em.saveBtn, !trimmed && em.saveOff]}
              onPress={trimmed ? () => onSave(trimmed) : undefined}
              activeOpacity={trimmed ? 0.7 : 1}
            >
              <Text style={[em.saveText, !trimmed && em.saveTextOff]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Workout history card ─────────────────────────────────────────────────────

function WorkoutCard({
  log,
  editable,
  onDelete,
  onEdit,
}: {
  log: WorkoutLog;
  editable: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalSets = log.exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const doneSets = log.exercises.reduce(
    (n, ex) => n + ex.sets.filter((s) => s.result !== 'skipped').length,
    0,
  );
  const allDone = doneSets === totalSets;

  return (
    <View style={wc.card}>
      <TouchableOpacity
        style={wc.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <View style={wc.headerLeft}>
          <Text style={wc.date}>{formatDate(log.completedAt)}</Text>
          <Text style={wc.focus}>{log.focus}</Text>
          <View style={wc.statRow}>
            <View style={[wc.statBadge, !allDone && wc.statBadgeLow]}>
              <Text style={[wc.statText, !allDone && wc.statTextLow]}>
                {doneSets}/{totalSets} sets
              </Text>
            </View>
            <Text style={wc.metaDot}>·</Text>
            <Text style={wc.meta}>{log.exercises.length} exercises</Text>
          </View>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.text.muted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={wc.body}>
          <View style={wc.divider} />
          {log.exercises.map((ex, i) => {
            const exDone = ex.sets.filter((s) => s.result !== 'skipped').length;
            const exAllDone = exDone === ex.sets.length;
            return (
              <View key={i} style={wc.exCard}>
                <View style={wc.exTop}>
                  <Text style={wc.exName} numberOfLines={1}>{ex.name}</Text>
                  <Text style={[wc.exBadge, !exAllDone && wc.exBadgeLow]}>
                    {exDone}/{ex.sets.length}
                  </Text>
                </View>
                <Text style={wc.exTarget}>{ex.targetSets} sets · {ex.targetReps} reps</Text>
                <View style={wc.setList}>
                  {ex.sets.map((set, j) => (
                    <MiniSetRow
                      key={j}
                      num={j + 1}
                      result={set.result}
                      repsActual={set.repsActual}
                    />
                  ))}
                </View>
              </View>
            );
          })}

          {editable && (
            <View style={wc.mgmtRow}>
              <TouchableOpacity style={wc.mgmtBtn} onPress={onEdit} activeOpacity={0.7}>
                <Ionicons name="pencil-outline" size={14} color={colors.text.secondary} />
                <Text style={wc.mgmtText}>Edit Focus</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[wc.mgmtBtn, wc.mgmtDanger]} onPress={onDelete} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={14} color={colors.danger} />
                <Text style={[wc.mgmtText, wc.mgmtDangerText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Routine change card ──────────────────────────────────────────────────────

function ChangeCard({
  event,
  editable,
  onDelete,
  onEdit,
}: {
  event: RoutineChangeEvent;
  editable: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <View style={cc.card}>
      <View style={cc.iconWrap}>
        <Ionicons name="sparkles" size={14} color={colors.gold} />
      </View>
      <View style={cc.content}>
        <Text style={cc.summary}>{event.summary}</Text>
        <Text style={cc.date}>{formatShortDate(event.changedAt)}</Text>
      </View>
      {editable && (
        <View style={cc.actions}>
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={15} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color={colors.danger + 'CC'} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HistoryView({ editable = false }: { editable?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [captchaVisible, setCaptchaVisible] = useState(false);
  const [pendingItem, setPendingItem] = useState<HistoryItem | null>(null);
  const [pendingAction, setPendingAction] = useState<CaptchaAction>('delete');
  const [captchaWord, setCaptchaWord] = useState('');
  const [editVisible, setEditVisible] = useState(false);

  useEffect(() => {
    Promise.all([loadWorkoutLogs(), loadRoutineChanges()]).then(([logs, changes]) => {
      const workoutItems: HistoryItem[] = logs.map((log) => ({
        type: 'workout',
        data: log,
        timestamp: log.completedAt,
      }));
      const changeItems: HistoryItem[] = changes.map((c) => ({
        type: 'change',
        data: c,
        timestamp: c.changedAt,
      }));
      setItems([...workoutItems, ...changeItems].sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });
  }, []);

  function openCaptcha(item: HistoryItem, action: CaptchaAction) {
    setCaptchaWord(pickWord());
    setPendingItem(item);
    setPendingAction(action);
    setCaptchaVisible(true);
  }

  function dismissAll() {
    setCaptchaVisible(false);
    setEditVisible(false);
    setPendingItem(null);
  }

  async function handleCaptchaConfirm() {
    if (!pendingItem) return;
    setCaptchaVisible(false);

    if (pendingAction === 'delete') {
      if (pendingItem.type === 'workout') {
        await deleteWorkoutLog(pendingItem.data.id);
      } else {
        await deleteRoutineChange(pendingItem.data.id);
      }
      setItems((prev) => prev.filter((i) => i.data.id !== pendingItem.data.id));
      setPendingItem(null);
    } else {
      setEditVisible(true);
    }
  }

  async function handleEditSave(newValue: string) {
    if (!pendingItem) return;

    if (pendingItem.type === 'workout') {
      await updateWorkoutLogFocus(pendingItem.data.id, newValue);
      setItems((prev) =>
        prev.map((i) =>
          i.data.id === pendingItem.data.id && i.type === 'workout'
            ? { ...i, data: { ...(i.data as WorkoutLog), focus: newValue } }
            : i,
        ),
      );
    } else {
      await updateRoutineChangeSummary(pendingItem.data.id, newValue);
      setItems((prev) =>
        prev.map((i) =>
          i.data.id === pendingItem.data.id && i.type === 'change'
            ? { ...i, data: { ...(i.data as RoutineChangeEvent), summary: newValue } }
            : i,
        ),
      );
    }

    dismissAll();
  }

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={s.center}>
        <Ionicons name="time-outline" size={36} color={colors.text.muted} />
        <Text style={s.emptyTitle}>Nothing logged yet</Text>
        <Text style={s.emptyDesc}>
          Your training sessions and routine changes will appear here.
        </Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={s.list} showsVerticalScrollIndicator={false}>
        {items.map((item) =>
          item.type === 'workout' ? (
            <WorkoutCard
              key={item.data.id}
              log={item.data as WorkoutLog}
              editable={editable}
              onDelete={() => openCaptcha(item, 'delete')}
              onEdit={() => openCaptcha(item, 'edit')}
            />
          ) : (
            <ChangeCard
              key={item.data.id}
              event={item.data as RoutineChangeEvent}
              editable={editable}
              onDelete={() => openCaptcha(item, 'delete')}
              onEdit={() => openCaptcha(item, 'edit')}
            />
          ),
        )}
      </ScrollView>

      <CaptchaModal
        visible={captchaVisible}
        action={pendingAction}
        word={captchaWord}
        itemLabel={
          pendingItem
            ? pendingItem.type === 'workout'
              ? `${(pendingItem.data as WorkoutLog).dayName} — ${(pendingItem.data as WorkoutLog).focus}`
              : (pendingItem.data as RoutineChangeEvent).summary
            : ''
        }
        onConfirm={handleCaptchaConfirm}
        onCancel={dismissAll}
      />

      <EditModal
        visible={editVisible}
        label={
          pendingItem
            ? pendingItem.type === 'workout' ? 'Workout Focus' : 'Routine Note'
            : ''
        }
        initial={
          pendingItem
            ? pendingItem.type === 'workout'
              ? (pendingItem.data as WorkoutLog).focus
              : (pendingItem.data as RoutineChangeEvent).summary
            : ''
        }
        onSave={handleEditSave}
        onCancel={dismissAll}
      />
    </>
  );
}

// ─── Mini set row styles ──────────────────────────────────────────────────────

const mr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.bg.elevated,
    marginBottom: 4,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  rowDone: {
    backgroundColor: colors.success + '14',
    borderColor: colors.success + '44',
  },
  rowShort: {
    backgroundColor: '#EAB30814',
    borderColor: '#EAB30844',
  },
  rowSkipped: {
    backgroundColor: colors.bg.app,
    borderColor: colors.border.subtle,
    opacity: 0.45,
  },
  icon: { width: 18, alignItems: 'center' },
  setLabel: {
    fontFamily: typography.fonts.display,
    fontSize: 11,
    letterSpacing: 0.8,
    color: colors.text.secondary,
    width: 38,
  },
  textMuted: { color: colors.text.muted },
  result: {
    flex: 1,
    ...typography.caption,
    textAlign: 'right',
  },
  resultDone: { color: colors.success },
  resultShort: { color: '#EAB308', fontWeight: '600' },
  resultSkipped: { color: colors.text.muted },
});

// ─── Captcha modal styles ─────────────────────────────────────────────────────

const cap = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  iconCircleEdit: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primaryBorder,
  },
  title: {
    ...typography.title3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  label: {
    ...typography.callout,
    color: colors.text.muted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.text.muted,
  },
  wordBox: {
    width: '100%',
    backgroundColor: colors.bg.app,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  word: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    letterSpacing: 6,
    color: colors.text.primary,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    textAlign: 'center',
    fontSize: 18,
    letterSpacing: 4,
    color: colors.text.primary,
  },
  inputMatched: {
    borderColor: colors.success + '88',
    backgroundColor: colors.successMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
    marginTop: spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelText: {
    ...typography.callout,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDelete: { backgroundColor: colors.danger },
  confirmEdit: { backgroundColor: colors.primary },
  confirmOff: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  confirmText: {
    ...typography.callout,
    fontWeight: '700',
    color: colors.white,
  },
  confirmTextOff: { color: colors.text.disabled },
});

// ─── Edit modal styles ────────────────────────────────────────────────────────

const em = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.bg.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bg.elevated,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.title3,
    color: colors.text.primary,
  },
  input: {
    backgroundColor: colors.bg.input,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text.primary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelText: {
    ...typography.callout,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveOff: {
    backgroundColor: colors.bg.card,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  saveText: {
    ...typography.callout,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  saveTextOff: { color: colors.text.disabled },
});

// ─── Workout card styles ──────────────────────────────────────────────────────

const wc = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerLeft: { flex: 1, gap: 4 },
  date: { ...typography.callout, color: colors.text.primary, fontWeight: '600' },
  focus: { ...typography.caption, color: colors.primary, fontWeight: '500' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statBadge: {
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statBadgeLow: { backgroundColor: colors.danger + '18' },
  statText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  statTextLow: { color: colors.danger },
  metaDot: { ...typography.caption, color: colors.text.muted },
  meta: { ...typography.caption, color: colors.text.muted },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.subtle,
    marginHorizontal: spacing.md,
  },
  body: { padding: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },

  exCard: {
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.sm,
  },
  exTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  exName: { ...typography.callout, color: colors.text.primary, fontWeight: '600', flex: 1 },
  exBadge: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.success,
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: spacing.sm,
  },
  exBadgeLow: { color: colors.danger, backgroundColor: colors.danger + '18' },
  exTarget: { ...typography.caption, color: colors.text.muted, marginBottom: spacing.xs },
  setList: { gap: 0 },

  mgmtRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  mgmtBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.bg.app,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  mgmtDanger: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger + '44',
  },
  mgmtText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  mgmtDangerText: { color: colors.danger },
});

// ─── Change card styles ───────────────────────────────────────────────────────

const cc = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.goldMuted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.gold + '55',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.goldMuted,
    borderWidth: 1,
    borderColor: colors.gold + '88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, gap: 2 },
  summary: { ...typography.callout, color: colors.gold, fontWeight: '500' },
  date: { ...typography.caption, color: colors.gold + 'AA' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
});

// ─── Screen-level styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.title3, color: colors.text.primary, textAlign: 'center' },
  emptyDesc: { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
});
