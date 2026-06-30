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
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import { CollapsibleTabBar } from '@/shared/components/CollapsibleTabBar';
import {
  loadDynamicMode,
  saveDynamicMode,
  loadTodayActivities,
  saveTodayActivities,
  loadActivityHistory,
  type ActivityEntry,
  type DayActivities,
} from '@/services/storage/local/caloryBurnStorage';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { groqChat } from '@/services/ai/client';
import { useGoals } from '@/contexts/GoalsContext';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'CaloryBurn'>;
};

const ACCENT = colors.gold;

const TABS = [
  { id: 'today',   icon: 'flame-outline',  label: 'Today'   },
  { id: 'history', icon: 'time-outline',   label: 'History' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── AI activity parser ───────────────────────────────────────────────────────

const AI_SYSTEM =
  'You are a calorie burn estimator. Given a description of physical activities, extract each activity and estimate calories burned for an average adult (~75 kg, moderate effort). Respond with ONLY a valid JSON array: [{"name":"...","caloriesBurned":0}]. One entry per distinct activity. If no valid activity is described, return [].';

async function parseActivities(text: string): Promise<Array<{ name: string; caloriesBurned: number }>> {
  const reply = await groqChat([
    { role: 'system', content: AI_SYSTEM },
    { role: 'user', content: text },
  ]);
  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── ManualAddModal ───────────────────────────────────────────────────────────

function ManualAddModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (entry: Omit<ActivityEntry, 'id'>) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name,     setName]     = useState('');
  const [calories, setCalories] = useState('');

  const canAdd = name.trim().length > 0 && calories.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({ name: name.trim(), caloriesBurned: parseFloat(calories) || 0 });
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={mm.overlay} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={mm.sheetWrap}
      >
        <View style={[mm.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={mm.handle} />

          <View style={mm.headerRow}>
            <Text style={mm.headerTitle}>Add Activity</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          <View style={mm.form}>
            <Text style={mm.fieldLabel}>ACTIVITY</Text>
            <TextInput
              style={mm.input}
              placeholder="e.g. Running 5 km, Gym session…"
              placeholderTextColor={colors.text.disabled}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />

            <Text style={mm.fieldLabel}>CALORIES BURNED</Text>
            <TextInput
              style={mm.input}
              placeholder="e.g. 350"
              placeholderTextColor={colors.text.disabled}
              value={calories}
              onChangeText={setCalories}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <Text style={mm.hint}>Not sure? Use "Tell AI" to estimate automatically.</Text>

            <TouchableOpacity
              style={[mm.addBtn, !canAdd && mm.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={canAdd ? colors.text.inverse : colors.text.disabled}
              />
              <Text style={[mm.addBtnText, !canAdd && mm.addBtnTextDisabled]}>
                Add Activity
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mm = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.overlay },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet:     { backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  handle:    { width: 36, height: 4, backgroundColor: colors.border.subtle, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, marginBottom: 20 },
  headerTitle: { ...typography.title3, color: colors.text.primary },

  form:       { paddingHorizontal: spacing.screenPadding, paddingBottom: 8, gap: 6 },
  fieldLabel: { ...typography.label, color: colors.text.muted, marginTop: 12, marginBottom: 6 },
  input:      { backgroundColor: colors.bg.elevated, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 13, ...typography.callout, color: colors.text.primary },
  hint:       { ...typography.caption, color: colors.text.disabled, marginTop: 4 },

  addBtn:             { backgroundColor: ACCENT, borderRadius: radius.button, height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  addBtnDisabled:     { backgroundColor: colors.bg.elevated },
  addBtnText:         { ...typography.subhead, color: colors.text.inverse, fontWeight: '700' },
  addBtnTextDisabled: { color: colors.text.disabled },
});

// ─── TodayTab ─────────────────────────────────────────────────────────────────

type TodayTabProps = {
  activities: ActivityEntry[];
  dynamicMode: boolean;
  bmr: number | null;
  goalOffset: number;
  aiInput: string;
  aiLoading: boolean;
  onToggleDynamic: (val: boolean) => void;
  onRemove: (id: string) => void;
  onManualAdd: () => void;
  onAiInputChange: (text: string) => void;
  onAiSend: () => void;
};

function TodayTab({
  activities,
  dynamicMode,
  bmr,
  goalOffset,
  aiInput,
  aiLoading,
  onToggleDynamic,
  onRemove,
  onManualAdd,
  onAiInputChange,
  onAiSend,
}: TodayTabProps) {
  const totalBurned = activities.reduce((s, a) => s + a.caloriesBurned, 0);
  const baseCal     = bmr !== null ? Math.round(bmr * 1.2) : null;
  const dynamicMaintenance = baseCal !== null ? baseCal + totalBurned : null;
  const dynamicTarget      = dynamicMaintenance !== null ? dynamicMaintenance + goalOffset : null;

  const showInfoModal = () => {
    Alert.alert(
      'Dynamic Mode',
      "When on, your rough activity level is replaced with what you actually burned today. Your calorie target in the Diet section updates live based on this.\n\nWhen off, your profile's activity level is used as usual.",
      [{ text: 'Got it' }],
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={tt.root}
        contentContainerStyle={tt.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Dynamic Mode toggle */}
        <View style={tt.toggleCard}>
          <View style={tt.toggleLeft}>
            <Text style={tt.toggleTitle}>Dynamic Mode</Text>
            <Text style={tt.toggleSub}>Link burned calories to diet target</Text>
          </View>
          <View style={tt.toggleRight}>
            <TouchableOpacity
              onPress={showInfoModal}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={tt.infoBtn}
            >
              <Ionicons name="information-circle-outline" size={18} color={colors.text.muted} />
            </TouchableOpacity>
            <Switch
              value={dynamicMode}
              onValueChange={onToggleDynamic}
              trackColor={{ false: colors.bg.elevated, true: ACCENT + '55' }}
              thumbColor={dynamicMode ? ACCENT : colors.text.disabled}
            />
          </View>
        </View>

        {/* Dynamic Maintenance card — only visible when mode is ON */}
        {dynamicMode && (
          bmr === null ? (
            <View style={tt.noBioCard}>
              <Ionicons name="alert-circle-outline" size={20} color={colors.gold} />
              <Text style={tt.noBioText}>
                Complete onboarding to enable dynamic calorie tracking.
              </Text>
            </View>
          ) : (
            <View style={tt.maintCard}>
              <Text style={tt.maintLabel}>DYNAMIC MAINTENANCE</Text>
              <Text style={tt.maintNumber}>
                {dynamicMaintenance?.toLocaleString()} kcal
              </Text>
              <View style={tt.maintRow}>
                <View style={tt.maintPill}>
                  <Text style={tt.maintPillLabel}>Base (BMR × 1.2)</Text>
                  <Text style={tt.maintPillVal}>{baseCal?.toLocaleString()} kcal</Text>
                </View>
                <Text style={tt.plus}>+</Text>
                <View style={tt.maintPill}>
                  <Text style={tt.maintPillLabel}>Burned Today</Text>
                  <Text style={[tt.maintPillVal, { color: ACCENT }]}>{totalBurned} kcal</Text>
                </View>
              </View>
              {dynamicTarget !== null && (
                <View style={tt.targetRow}>
                  <Ionicons name="restaurant-outline" size={13} color={colors.text.muted} />
                  <Text style={tt.targetText}>
                    Your diet target today:{' '}
                    <Text style={tt.targetNum}>{dynamicTarget.toLocaleString()} kcal</Text>
                  </Text>
                </View>
              )}
            </View>
          )
        )}

        {/* Activity log */}
        <View style={tt.section}>
          <View style={tt.sectionHeader}>
            <Text style={tt.sectionTitle}>TODAY'S ACTIVITIES</Text>
            <Text style={tt.sectionCount}>
              {totalBurned > 0 ? `${totalBurned} kcal burned` : `${activities.length} logged`}
            </Text>
          </View>

          {activities.length === 0 ? (
            <View style={tt.emptyCard}>
              <Ionicons name="flame-outline" size={32} color={colors.text.disabled} />
              <Text style={tt.emptyText}>Nothing logged yet</Text>
              <Text style={tt.emptyHint}>
                Describe your activities below or add them manually.
              </Text>
            </View>
          ) : (
            activities.map((item) => (
              <View key={item.id} style={tt.actRow}>
                <View style={tt.actIconWrap}>
                  <Ionicons name="flame-outline" size={16} color={ACCENT} />
                </View>
                <View style={tt.actLeft}>
                  <Text style={tt.actName}>{item.name}</Text>
                </View>
                <Text style={tt.actCal}>{item.caloriesBurned} kcal</Text>
                <TouchableOpacity
                  onPress={() => onRemove(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={tt.deleteBtn}
                >
                  <Ionicons name="close-circle" size={18} color={colors.text.disabled} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Add manually button */}
        <TouchableOpacity style={tt.manualBtn} onPress={onManualAdd} activeOpacity={0.85}>
          <Ionicons name="pencil-outline" size={18} color={colors.text.secondary} />
          <Text style={tt.manualBtnText}>Add Manually</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* AI input bar */}
      <View style={tt.inputWrap}>
        <View style={tt.inputRow}>
          <TextInput
            style={tt.input}
            placeholder="Describe what you did — AI will estimate…"
            placeholderTextColor={colors.text.disabled}
            value={aiInput}
            onChangeText={onAiInputChange}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={onAiSend}
          />
          <TouchableOpacity
            style={[tt.sendBtn, (!aiInput.trim() || aiLoading) && tt.sendBtnDisabled]}
            onPress={onAiSend}
            disabled={!aiInput.trim() || aiLoading}
            activeOpacity={0.85}
          >
            {aiLoading
              ? <ActivityIndicator size="small" color={colors.text.disabled} />
              : <Ionicons name="arrow-up" size={18} color={aiInput.trim() ? colors.text.inverse : colors.text.disabled} />
            }
          </TouchableOpacity>
        </View>
        <Text style={tt.disclaimer}>AI estimates are approximations — adjust if needed</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const tt = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: spacing.screenPadding, paddingBottom: 20, gap: spacing.md },

  // Dynamic toggle
  toggleCard:  { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md, flexDirection: 'row', alignItems: 'center' },
  toggleLeft:  { flex: 1 },
  toggleTitle: { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  toggleSub:   { ...typography.caption, color: colors.text.muted, marginTop: 3 },
  toggleRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  infoBtn:     { padding: 2 },

  // No bio warning
  noBioCard: { backgroundColor: colors.goldMuted, borderRadius: radius.card, padding: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noBioText: { ...typography.callout, color: colors.gold, flex: 1, lineHeight: 20 },

  // Dynamic maintenance card
  maintCard:      { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: spacing.md, gap: 12, borderWidth: 1, borderColor: ACCENT + '33' },
  maintLabel:     { ...typography.label, color: colors.text.muted },
  maintNumber:    { fontFamily: typography.fonts.display, fontSize: 40, lineHeight: 52, color: ACCENT },
  maintRow:       { flexDirection: 'row', alignItems: 'center', gap: 10 },
  maintPill:      { flex: 1, backgroundColor: colors.bg.elevated, borderRadius: radius.md, padding: 10, gap: 4 },
  maintPillLabel: { ...typography.caption, color: colors.text.muted },
  maintPillVal:   { ...typography.subhead, color: colors.text.primary, fontWeight: '600', lineHeight: 22 },
  plus:           { ...typography.subhead, color: colors.text.muted, fontWeight: '600' },
  targetRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  targetText:     { ...typography.caption, color: colors.text.muted, flex: 1 },
  targetNum:      { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },

  // Section
  section:       { gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle:  { ...typography.label, color: colors.text.muted },
  sectionCount:  { ...typography.caption, color: colors.text.muted },

  emptyCard: { backgroundColor: colors.bg.card, borderRadius: radius.card, padding: 32, alignItems: 'center', gap: 8 },
  emptyText: { ...typography.callout, color: colors.text.muted },
  emptyHint: { ...typography.caption, color: colors.text.disabled, textAlign: 'center' },

  actRow:      { backgroundColor: colors.bg.card, borderRadius: radius.md, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  actIconWrap: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: ACCENT + '18', alignItems: 'center', justifyContent: 'center' },
  actLeft:     { flex: 1 },
  actName:     { ...typography.callout, color: colors.text.primary, fontWeight: '500' },
  actCal:      { ...typography.subhead, color: ACCENT, fontWeight: '600' },
  deleteBtn:   { padding: 2 },

  manualBtn:     { backgroundColor: colors.bg.card, borderRadius: radius.card, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.border.default },
  manualBtnText: { ...typography.subhead, color: colors.text.secondary, fontWeight: '600' },

  inputWrap: { backgroundColor: colors.bg.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 6 },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 6, backgroundColor: colors.bg.elevated, borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 8 },
  input:     { flex: 1, ...typography.callout, color: colors.text.primary, maxHeight: 100, padding: 0 },
  sendBtn:         { width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { backgroundColor: colors.bg.card },
  disclaimer: { ...typography.caption, color: colors.text.disabled, textAlign: 'center', marginTop: 4, marginBottom: 2 },
});

// ─── HistoryTab ───────────────────────────────────────────────────────────────

function HistoryTab({ history }: { history: DayActivities[] }) {
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

// ─── CaloryBurnScreen ─────────────────────────────────────────────────────────

export function CaloryBurnScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { refresh } = useGoals();
  const [active,       setActive]       = useState<TabId>('today');
  const [dynamicMode,  setDynamicMode]  = useState(false);
  const [activities,   setActivities]   = useState<ActivityEntry[]>([]);
  const [history,      setHistory]      = useState<DayActivities[]>([]);
  const [bmr,          setBmr]          = useState<number | null>(null);
  const [goalOffset,   setGoalOffset]   = useState(0);
  const [aiInput,      setAiInput]      = useState('');
  const [aiLoading,    setAiLoading]    = useState(false);
  const [showManual,   setShowManual]   = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadDynamicMode().then(setDynamicMode);
      loadTodayActivities().then(setActivities);
      loadActivityHistory(7).then(setHistory);
      loadUserProfile().then(profile => {
        if (profile?.bmr !== undefined && profile.goalOffset !== undefined) {
          setBmr(profile.bmr);
          setGoalOffset(profile.goalOffset);
        }
      });
    }, []),
  );

  const toggleDynamic = useCallback((val: boolean) => {
    setDynamicMode(val);
    saveDynamicMode(val).then(refresh);
  }, [refresh]);

  const removeActivity = useCallback((id: string) => {
    setActivities(prev => {
      const updated = prev.filter(a => a.id !== id);
      saveTodayActivities(updated).then(refresh);
      return updated;
    });
  }, [refresh]);

  const addManual = useCallback((entry: Omit<ActivityEntry, 'id'>) => {
    setActivities(prev => {
      const updated = [...prev, { ...entry, id: uid() }];
      saveTodayActivities(updated).then(refresh);
      return updated;
    });
  }, [refresh]);

  const sendToAI = useCallback(async () => {
    const text = aiInput.trim();
    if (!text || aiLoading) return;
    setAiInput('');
    setAiLoading(true);
    try {
      const parsed = await parseActivities(text);
      if (parsed.length === 0) {
        Alert.alert(
          'No activities found',
          "Couldn't identify activities. Try something like: I ran 5km, or 30 min cycling.",
        );
        return;
      }
      setActivities(prev => {
        const updated = [
          ...prev,
          ...parsed.map(p => ({ id: uid(), name: p.name, caloriesBurned: p.caloriesBurned })),
        ];
        saveTodayActivities(updated).then(refresh);
        return updated;
      });
    } catch {
      Alert.alert('Connection error', "Couldn't reach the AI. Check your connection and try again.");
    } finally {
      setAiLoading(false);
    }
  }, [aiInput, aiLoading, refresh]);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {showManual && (
        <ManualAddModal onClose={() => setShowManual(false)} onAdd={addManual} />
      )}

      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Calory Burn</Text>
        <View style={{ width: 24 }} />
      </View>

      <CollapsibleTabBar
        tabs={TABS}
        active={active}
        onSelect={(id) => setActive(id as TabId)}
        accent={ACCENT}
      />

      {active === 'today' && (
        <TodayTab
          activities={activities}
          dynamicMode={dynamicMode}
          bmr={bmr}
          goalOffset={goalOffset}
          aiInput={aiInput}
          aiLoading={aiLoading}
          onToggleDynamic={toggleDynamic}
          onRemove={removeActivity}
          onManualAdd={() => setShowManual(true)}
          onAiInputChange={setAiInput}
          onAiSend={sendToAI}
        />
      )}
      {active === 'history' && <HistoryTab history={history} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.app },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },
});
