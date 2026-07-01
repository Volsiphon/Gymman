/**
 * modules/plan/diet/DietScreen.tsx
 *
 * The Diet Plan sub-screen — the most used screen in the app. Combines three things:
 * (1) an AI nutrition coach chat powered by nutritionCoach.ts that can add/remove/update
 * food items via [DIET:] action commands; (2) a live food log showing today's meals and
 * their macros; (3) a macro progress bar showing calories/protein/carbs/fats consumed
 * vs the daily target from GoalsContext. The Kerala food library provides local food
 * suggestions the AI can recommend by name.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  FlatList,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Pressable,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import { CollapsibleTabBar } from '@/shared/components/CollapsibleTabBar';
import {
  nutritionCoachChat,
  parseDietActions,
  stripDietActions,
  VISION_SYSTEM,
  type LogItem,
  type DietAction,
  type MealEntry,
} from '@/services/ai/nutritionCoach';
import { aiVisionChat } from '@/services/ai/client';
import { checkImageLogAllowed, recordImageLog, checkAiMessageAllowed, recordAiMessage } from '@/services/ai/rateLimiter';
import { useSubscription } from '@/app/providers/SubscriptionProvider';
import type { SubscriptionTier } from '@/types/subscription';
import type { ChatMessage, DietChat, StoredDietMessage } from '@/types/coaching';
import type { NutritionGoals } from '@/types/user';
import { loadTodayLog, saveTodayLog } from '@/services/storage/local/dietLogStorage';
import { useGoals } from '@/contexts/GoalsContext';
import { loadDietChats, saveDietChat, deleteDietChat } from '@/services/storage/local/dietChatStorage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Diet'>;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = colors.success;
const LIME   = colors.primary;
const BLUE   = colors.info;


const TABS = [
  { id: 'today',   icon: 'today-outline',               label: 'Today'   },
  { id: 'coach',   icon: 'chatbubble-ellipses-outline',  label: 'Coach'   },
  { id: 'history', icon: 'time-outline',                 label: 'History' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Log reducer ──────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function applyDietActions(log: LogItem[], actions: DietAction[]): LogItem[] {
  let next = [...log];
  for (const action of actions) {
    switch (action.type) {
      case 'add':    next = [...next, { ...action.entry, id: uid() }]; break;
      case 'remove': next = next.filter(e => e.id !== action.id); break;
      case 'update': next = next.map(e => e.id === action.id ? { ...e, ...action.patch } : e); break;
      case 'clear':  next = []; break;
    }
  }
  return next;
}

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <View style={mb.wrap}>
      <View style={mb.row}>
        <Text style={mb.label}>{label}</Text>
        <Text style={mb.value}>{Math.round(current)}g / {goal}g</Text>
      </View>
      <View style={mb.track}>
        <View style={[mb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const mb = StyleSheet.create({
  wrap:  { marginBottom: 12 },
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  label: { ...typography.label, color: colors.text.muted, lineHeight: 16 },
  value: { ...typography.caption, color: colors.text.secondary, lineHeight: 16 },
  track: { height: 5, backgroundColor: colors.bg.elevated, borderRadius: radius.full, overflow: 'hidden' },
  fill:  { height: '100%', borderRadius: radius.full },
});

// ─── ManualLogModal ───────────────────────────────────────────────────────────

function ManualLogModal({ onClose, onAdd }: { onClose: () => void; onAdd: (meal: MealEntry) => void }) {
  const insets = useSafeAreaInsets();
  const [name,     setName]     = useState('');
  const [amount,   setAmount]   = useState('');
  const [calories, setCalories] = useState('');
  const [protein,  setProtein]  = useState('');
  const [carbs,    setCarbs]    = useState('');
  const [fats,     setFats]     = useState('');

  const canAdd = name.trim().length > 0 && calories.trim().length > 0;

  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      name:     name.trim(),
      amount:   amount.trim() || '1 serving',
      calories: parseFloat(calories) || 0,
      protein:  parseFloat(protein)  || 0,
      carbs:    parseFloat(carbs)    || 0,
      fats:     parseFloat(fats)     || 0,
    });
    onClose();
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={ml.overlay} onPress={onClose} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ml.sheetWrap}>
        <View style={[ml.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={ml.handle} />

          <View style={ml.headerRow}>
            <Text style={ml.headerTitle}>Log Food Manually</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={colors.text.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={ml.form}>
            {/* Food name */}
            <Text style={ml.fieldLabel}>FOOD NAME</Text>
            <TextInput
              style={ml.input}
              placeholder="e.g. Puttu, Chicken curry, Rice…"
              placeholderTextColor={colors.text.disabled}
              value={name}
              onChangeText={setName}
              autoFocus
              returnKeyType="next"
            />

            {/* Amount */}
            <Text style={ml.fieldLabel}>AMOUNT / PORTION</Text>
            <TextInput
              style={ml.input}
              placeholder="e.g. 1 bowl, 200g, 2 pieces…"
              placeholderTextColor={colors.text.disabled}
              value={amount}
              onChangeText={setAmount}
              returnKeyType="next"
            />

            {/* Macro grid */}
            <Text style={ml.fieldLabel}>MACROS</Text>
            <View style={ml.macroGrid}>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Calories</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={ml.macroUnit}>kcal</Text>
              </View>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Protein</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={ml.macroUnit}>g</Text>
              </View>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Carbs</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
                <Text style={ml.macroUnit}>g</Text>
              </View>
              <View style={ml.macroCell}>
                <Text style={ml.macroLabel}>Fats</Text>
                <TextInput
                  style={[ml.input, ml.macroInput]}
                  placeholder="0"
                  placeholderTextColor={colors.text.disabled}
                  value={fats}
                  onChangeText={setFats}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                <Text style={ml.macroUnit}>g</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[ml.addBtn, !canAdd && ml.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!canAdd}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={20} color={canAdd ? colors.text.inverse : colors.text.disabled} />
              <Text style={[ml.addBtnText, !canAdd && ml.addBtnTextDisabled]}>Add to Today's Log</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ml = StyleSheet.create({
  overlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: colors.bg.overlay },
  sheetWrap:{ flex: 1, justifyContent: 'flex-end' },
  sheet:    { backgroundColor: colors.bg.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8 },
  handle:   { width: 36, height: 4, backgroundColor: colors.border.subtle, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },

  headerRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, marginBottom: 20 },
  headerTitle: { ...typography.title3, color: colors.text.primary },

  form: { paddingHorizontal: spacing.screenPadding, paddingBottom: 8, gap: 6 },

  fieldLabel: { ...typography.label, color: colors.text.muted, marginTop: 12, marginBottom: 6 },
  input:      { backgroundColor: colors.bg.elevated, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 13, ...typography.callout, color: colors.text.primary },

  macroGrid:  { flexDirection: 'row', gap: 10 },
  macroCell:  { flex: 1, gap: 4 },
  macroLabel: { ...typography.caption, color: colors.text.muted, textAlign: 'center' },
  macroInput: { textAlign: 'center', paddingHorizontal: 8 },
  macroUnit:  { ...typography.caption, color: colors.text.muted, textAlign: 'center' },

  addBtn:         { backgroundColor: ACCENT, borderRadius: radius.button, height: spacing.buttonHeight, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  addBtnDisabled: { backgroundColor: colors.bg.elevated },
  addBtnText:     { ...typography.subhead, color: colors.text.inverse, fontWeight: '700' },
  addBtnTextDisabled: { color: colors.text.disabled },
});

// ─── TodayTab ─────────────────────────────────────────────────────────────────

type TodayTabProps = {
  log: LogItem[];
  goals: NutritionGoals;
  isDynamic: boolean;
  onRemove: (id: string) => void;
  onManualLog: () => void;
  onOpenCoach: () => void;
};

function TodayTab({ log, goals, isDynamic, onRemove, onManualLog, onOpenCoach }: TodayTabProps) {
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

// ─── DietCoachTab helpers ─────────────────────────────────────────────────────

type DietMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUri?: string;
  actionCount?: number;
};

const WELCOME_MSG: DietMessage = {
  id: 'welcome',
  role: 'assistant',
  content: "Hi! I'm your nutrition coach. Tell me what you ate and I'll log it directly — I can add, remove, or correct anything in today's log.\n\nYou can also send a photo of your food and I'll estimate the macros.",
};

const SUGGESTIONS = [
  'I had puttu & kadala curry for breakfast',
  '2 parottas with beef fry just now',
  'I drank 2 glasses of milk this morning',
  'Remove everything, I want to start over',
];

function makeChatTitle(messages: DietMessage[]): string {
  const first = messages.find(m => m.role === 'user' && m.id !== 'welcome');
  if (!first) return 'New Chat';
  const t = first.content.trim();
  return t.length > 45 ? t.slice(0, 42) + '…' : t;
}

function formatChatDate(ts: number): string {
  const d    = new Date(ts);
  const now  = new Date();
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === now.toDateString())  return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  const daysAgo = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (daysAgo < 7) return d.toLocaleDateString('en-IN', { weekday: 'long' });
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function formatChatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

type ChatGroup = { label: string; chats: DietChat[] };

function groupChatsByDate(chats: DietChat[]): ChatGroup[] {
  const now    = new Date();
  const yest   = new Date(now); yest.setDate(yest.getDate() - 1);
  const weekAgo= new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: ChatGroup[] = [
    { label: 'Today',            chats: [] },
    { label: 'Yesterday',        chats: [] },
    { label: 'Previous 7 Days',  chats: [] },
    { label: 'Older',            chats: [] },
  ];
  for (const chat of chats) {
    const d = new Date(chat.startedAt);
    if      (d.toDateString() === now.toDateString())  groups[0].chats.push(chat);
    else if (d.toDateString() === yest.toDateString()) groups[1].chats.push(chat);
    else if (d >= weekAgo)                             groups[2].chats.push(chat);
    else                                               groups[3].chats.push(chat);
  }
  return groups.filter(g => g.chats.length > 0);
}

// ─── Chat history panel ───────────────────────────────────────────────────────

function ChatHistoryPanel({
  visible,
  activeChatId,
  onClose,
  onSelect,
  onNewChat,
}: {
  visible: boolean;
  activeChatId: string;
  onClose: () => void;
  onSelect: (chat: DietChat) => void;
  onNewChat: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [chats, setChats] = useState<DietChat[]>([]);

  useEffect(() => {
    if (visible) loadDietChats().then(setChats);
  }, [visible]);

  async function handleDelete(id: string) {
    await deleteDietChat(id);
    setChats(prev => prev.filter(c => c.id !== id));
  }

  const groups = groupChatsByDate(chats);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[hp.root, { paddingTop: insets.top }]}>
        <View style={hp.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-down" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
          <Text style={hp.title}>Nutrition Coach Chats</Text>
          <TouchableOpacity onPress={onNewChat} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {chats.length === 0 ? (
          <View style={hp.empty}>
            <Ionicons name="chatbubble-outline" size={44} color={colors.text.disabled} />
            <Text style={hp.emptyTitle}>No saved chats yet</Text>
            <Text style={hp.emptyHint}>Start a conversation with your nutrition coach.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={hp.list} showsVerticalScrollIndicator={false}>
            {groups.map(group => (
              <View key={group.label}>
                <Text style={hp.groupLabel}>{group.label}</Text>
                {group.chats.map(chat => (
                  <TouchableOpacity
                    key={chat.id}
                    style={[hp.row, chat.id === activeChatId && hp.rowActive]}
                    onPress={() => onSelect(chat)}
                    activeOpacity={0.7}
                  >
                    <View style={hp.rowContent}>
                      <Text style={hp.rowTitle} numberOfLines={1}>{chat.title}</Text>
                      <Text style={hp.rowMeta}>
                        {formatChatDate(chat.startedAt)} · {formatChatTime(chat.startedAt)}
                        {' · '}{chat.messages.length} message{chat.messages.length !== 1 ? 's' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(chat.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.text.disabled} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const hp = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg.app },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  title: { ...typography.subhead, color: colors.text.primary, fontWeight: '600' },
  list:  { paddingBottom: 40 },

  groupLabel: {
    ...typography.label,
    color: colors.text.muted,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.xs,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowActive: {
    borderColor: ACCENT + '66',
    backgroundColor: ACCENT + '0C',
  },
  rowContent: { flex: 1 },
  rowTitle:   { ...typography.callout, color: colors.text.primary, fontWeight: '500' },
  rowMeta:    { ...typography.caption, color: colors.text.muted, marginTop: 3, lineHeight: 16 },

  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: 40 },
  emptyTitle: { ...typography.title3, color: colors.text.muted },
  emptyHint:  { ...typography.callout, color: colors.text.disabled, textAlign: 'center' },
});

// ─── DietCoachTab ─────────────────────────────────────────────────────────────

type DietCoachProps = {
  log: LogItem[];
  goals: NutritionGoals;
  tier: SubscriptionTier;
  onDietActions: (actions: DietAction[]) => void;
};

function DietCoachTab({ log, goals, tier, onDietActions }: DietCoachProps) {
  const [messages,    setMessages]    = useState<DietMessage[]>([WELCOME_MSG]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const listRef        = useRef<FlatList>(null);
  const historyRef     = useRef<ChatMessage[]>([]);
  const logRef         = useRef<LogItem[]>(log);
  const chatIdRef      = useRef<string>(uid());
  const startedAtRef   = useRef<number>(Date.now());

  useEffect(() => { logRef.current = log; }, [log]);

  // Load most recent chat on mount
  useEffect(() => {
    loadDietChats().then(chats => {
      if (chats.length === 0) return;
      const last = chats[0];
      chatIdRef.current  = last.id;
      startedAtRef.current = last.startedAt;
      historyRef.current = last.messages.map(m => ({ role: m.role, content: m.content }));
      if (last.messages.length > 0) {
        setMessages(last.messages.map(m => ({
          id: m.id, role: m.role, content: m.content, actionCount: m.actionCount,
        })));
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
      }
    });
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const persistMessages = useCallback((updated: DietMessage[]) => {
    const stored: StoredDietMessage[] = updated
      .filter(m => m.id !== 'welcome')
      .map(m => ({ id: m.id, role: m.role, content: m.content, actionCount: m.actionCount }));
    if (stored.length === 0) return;
    saveDietChat({
      id: chatIdRef.current,
      title: makeChatTitle(updated),
      startedAt: startedAtRef.current,
      messages: stored,
    });
  }, []);

  const handleAIReply = useCallback((reply: string) => {
    const actions = parseDietActions(reply);
    if (actions.length > 0) onDietActions(actions);
    const displayText = stripDietActions(reply);
    historyRef.current = [...historyRef.current, { role: 'assistant', content: displayText }];
    const newMsg: DietMessage = { id: uid(), role: 'assistant', content: displayText, actionCount: actions.length };
    setMessages(prev => {
      const updated = [...prev, newMsg];
      persistMessages(updated);
      return updated;
    });
  }, [onDietActions, persistMessages]);

  const startNewChat = useCallback(() => {
    chatIdRef.current    = uid();
    startedAtRef.current = Date.now();
    historyRef.current   = [];
    setMessages([WELCOME_MSG]);
    setInput('');
    setHistoryOpen(false);
  }, []);

  const openHistoryChat = useCallback((chat: DietChat) => {
    chatIdRef.current    = chat.id;
    startedAtRef.current = chat.startedAt;
    historyRef.current   = chat.messages.map(m => ({ role: m.role, content: m.content }));
    setMessages(
      chat.messages.length > 0
        ? chat.messages.map(m => ({ id: m.id, role: m.role, content: m.content, actionCount: m.actionCount }))
        : [WELCOME_MSG],
    );
    setHistoryOpen(false);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 120);
  }, []);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    const allowed = await checkAiMessageAllowed(tier);
    if (!allowed) {
      Alert.alert(
        'Daily limit reached',
        tier === 'free'
          ? 'Free users get 20 AI messages per day. Upgrade to Premium for much more.'
          : "You've used today's AI message allowance. Try again tomorrow.",
      );
      return;
    }

    setInput('');
    const newHistory: ChatMessage[] = [...historyRef.current, { role: 'user', content: text }];
    historyRef.current = newHistory;
    setMessages(prev => [...prev, { id: uid(), role: 'user', content: text }]);
    setLoading(true);
    scrollToEnd();

    try {
      const reply = await nutritionCoachChat(newHistory, logRef.current, goals);
      await recordAiMessage();
      handleAIReply(reply);
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: "Couldn't reach the server. Check your connection and try again." }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [input, loading, goals, tier, scrollToEnd, handleAIReply]);

  const sendImage = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) return;

    const allowed = await checkImageLogAllowed(tier);
    if (!allowed) {
      Alert.alert(
        'Photo scan limit reached',
        tier === 'free'
          ? 'Free users can scan 1 food photo per day. Upgrade to Premium for unlimited scans.'
          : "You've reached today's photo scan limit. Resets at midnight.",
      );
      return;
    }

    setMessages(prev => [...prev, { id: uid(), role: 'user', content: 'What food is in this photo? Log it to today.', imageUri: asset.uri }]);
    setLoading(true);
    scrollToEnd();
    try {
      const reply = await aiVisionChat(VISION_SYSTEM, 'Identify this food and log it to today.', asset.base64, asset.mimeType ?? 'image/jpeg');
      await recordImageLog();
      handleAIReply(reply);
    } catch {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: "Couldn't analyse the photo. Try again or describe the food instead." }]);
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }, [tier, scrollToEnd, handleAIReply]);

  const openCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph your food.'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) sendImage(result.assets[0]);
  }, [sendImage]);

  const openLibrary = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Photo access needed', 'Allow photo library access in Settings to pick a food photo.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7, base64: true });
    if (!result.canceled && result.assets[0]) sendImage(result.assets[0]);
  }, [sendImage]);

  const canSend    = input.trim().length > 0 && !loading;
  const chatTitle  = makeChatTitle(messages);
  const isNewChat  = messages.length === 1 && messages[0].id === 'welcome';

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Header */}
      <View style={dc.coachHeader}>
        <TouchableOpacity onPress={() => setHistoryOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="time-outline" size={20} color={colors.text.muted} />
        </TouchableOpacity>
        <Text style={dc.coachTitle} numberOfLines={1}>{chatTitle}</Text>
        <TouchableOpacity onPress={startNewChat} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={dc.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View style={[dc.msgWrap, isUser ? dc.msgWrapUser : dc.msgWrapAI]}>
              {!isUser && (
                <View style={dc.aiLabel}>
                  <View style={dc.aiBadge}><Text style={dc.aiBadgeText}>N</Text></View>
                  <Text style={dc.aiName}>Nutrition Coach</Text>
                </View>
              )}
              {item.imageUri && (
                <Image source={{ uri: item.imageUri }} style={[dc.imageBubble, { alignSelf: isUser ? 'flex-end' : 'flex-start' }]} />
              )}
              <View style={[dc.bubble, isUser ? [dc.userBubble, { backgroundColor: ACCENT }] : dc.aiBubble]}>
                <Text style={[dc.bubbleText, isUser && dc.userBubbleText]}>{item.content}</Text>
              </View>
              {!isUser && (item.actionCount ?? 0) > 0 && (
                <View style={dc.actionPill}>
                  <Ionicons name="checkmark-circle" size={13} color={ACCENT} />
                  <Text style={dc.actionPillText}>Log updated</Text>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          loading ? (
            <View style={dc.typingRow}>
              <View style={dc.aiBadge}><Text style={dc.aiBadgeText}>N</Text></View>
              <ActivityIndicator size="small" color={ACCENT} style={{ marginLeft: 4 }} />
            </View>
          ) : null
        }
      />

      {isNewChat && !loading && (
        <View style={dc.suggestions}>
          <Text style={dc.suggestLabel}>Try saying:</Text>
          {SUGGESTIONS.map((s, i) => (
            <TouchableOpacity key={i} style={dc.suggestChip} onPress={() => send(s)} activeOpacity={0.7}>
              <Text style={dc.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={dc.inputWrap}>
        <View style={dc.inputRow}>
          <TouchableOpacity onPress={openCamera}  style={dc.mediaBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="camera-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openLibrary} style={dc.mediaBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="image-outline" size={22} color={colors.text.muted} />
          </TouchableOpacity>
          <TextInput
            style={dc.input}
            placeholder="Tell your coach what you ate…"
            placeholderTextColor={colors.text.disabled}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={() => send()}
          />
          <TouchableOpacity
            style={[dc.sendBtn, !canSend && dc.sendBtnDisabled]}
            onPress={() => send()}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-up" size={18} color={canSend ? colors.text.inverse : colors.text.disabled} />
          </TouchableOpacity>
        </View>
        <Text style={dc.disclaimer}>AI estimates — verify weight-sensitive macros manually</Text>
      </View>

      <ChatHistoryPanel
        visible={historyOpen}
        activeChatId={chatIdRef.current}
        onClose={() => setHistoryOpen(false)}
        onSelect={openHistoryChat}
        onNewChat={startNewChat}
      />
    </KeyboardAvoidingView>
  );
}

const dc = StyleSheet.create({
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  coachTitle: {
    ...typography.subhead,
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing.md,
  },

  list: { padding: spacing.md, paddingBottom: spacing.sm, gap: 12 },

  msgWrap:     { gap: 6 },
  msgWrapUser: { alignItems: 'flex-end' },
  msgWrapAI:   { alignItems: 'flex-start' },

  aiLabel:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 2 },
  aiBadge:     { width: 22, height: 22, borderRadius: 11, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  aiBadgeText: { fontSize: 11, fontWeight: '700', color: colors.text.inverse },
  aiName:      { ...typography.caption, color: colors.text.muted, fontWeight: '600' },

  imageBubble: { width: 180, height: 180, borderRadius: radius.lg, marginBottom: 4, backgroundColor: colors.bg.elevated },

  bubble:         { maxWidth: '85%', borderRadius: radius.xl, paddingHorizontal: 14, paddingVertical: 11 },
  aiBubble:       { backgroundColor: colors.bg.card, borderBottomLeftRadius: radius.sm },
  userBubble:     { borderBottomRightRadius: radius.sm },
  bubbleText:     { ...typography.callout, color: colors.text.primary, lineHeight: 22 },
  userBubbleText: { color: colors.text.inverse },

  actionPill:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 2 },
  actionPillText: { ...typography.caption, color: ACCENT, fontWeight: '600' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 8 },

  suggestions:  { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: 8 },
  suggestLabel: { ...typography.caption, color: colors.text.muted, textAlign: 'center', marginBottom: 4 },
  suggestChip:  { backgroundColor: colors.bg.card, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 11 },
  suggestText:  { ...typography.callout, color: colors.text.secondary },

  inputWrap: { backgroundColor: colors.bg.card, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle, paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: 6 },
  inputRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 6, backgroundColor: colors.bg.elevated, borderRadius: radius.xl, paddingHorizontal: 10, paddingVertical: 8 },
  mediaBtn:  { paddingHorizontal: 4, paddingBottom: 2 },
  input:     { flex: 1, ...typography.callout, color: colors.text.primary, maxHeight: 120, padding: 0 },
  sendBtn:   { width: 34, height: 34, borderRadius: 17, backgroundColor: ACCENT, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sendBtnDisabled: { backgroundColor: colors.bg.card },
  disclaimer: { ...typography.caption, color: colors.text.disabled, textAlign: 'center', marginTop: 4, marginBottom: 2 },
});

// ─── HistoryTab ───────────────────────────────────────────────────────────────

const DUMMY_HISTORY = [
  { date: 'Thu, Jun 25', calories: 1580, protein: 118, carbs: 162, fats: 41 },
  { date: 'Wed, Jun 24', calories: 1820, protein: 135, carbs: 181, fats: 52 },
  { date: 'Tue, Jun 23', calories: 1650, protein: 122, carbs: 170, fats: 44 },
];

function HistoryTab({ goals }: { goals: NutritionGoals }) {
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

// ─── DietScreen ───────────────────────────────────────────────────────────────

export function DietScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { goals, isDynamic } = useGoals();
  const { tier } = useSubscription();
  const [active, setActive]         = useState<TabId>('today');
  const [log, setLog]               = useState<LogItem[]>([]);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    loadTodayLog().then(items => { if (items.length > 0) setLog(items); });
  }, []);

  useEffect(() => {
    saveTodayLog(log);
  }, [log]);

  const dispatchDietActions = useCallback((actions: DietAction[]) => {
    setLog(prev => applyDietActions(prev, actions));
  }, []);

  const addManual = useCallback((meal: MealEntry) => {
    setLog(prev => [...prev, { ...meal, id: uid() }]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setLog(prev => prev.filter(e => e.id !== id));
  }, []);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {showManual && (
        <ManualLogModal onClose={() => setShowManual(false)} onAdd={addManual} />
      )}

      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Diet</Text>
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
          log={log}
          goals={goals}
          isDynamic={isDynamic}
          onRemove={removeItem}
          onManualLog={() => setShowManual(true)}
          onOpenCoach={() => setActive('coach')}
        />
      )}
      {active === 'coach' && (
        <DietCoachTab log={log} goals={goals} tier={tier} onDietActions={dispatchDietActions} />
      )}
      {active === 'history' && <HistoryTab goals={goals} />}
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
  headerTitle: { ...typography.subhead, color: colors.text.secondary },
});
