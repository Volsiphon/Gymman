/**
 * modules/coach/CoachScreen.tsx
 *
 * Master AI Coach tab. Shows a one-time intro splash the very first time, then
 * goes straight to a persistent ChatGPT-style interface forever after.
 *
 * The coach is context-aware (diet, weight, training, burn, bloodwork) and can
 * mutate user data directly from conversation via structured action commands
 * parsed from every AI reply. CoachScreen applies those mutations and keeps the
 * relevant storage in sync as side-effects of each message exchange.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons }         from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { MainTabParamList }     from '@/app/navigation/types';

import { ChatView }          from './components/ChatView';
import type { DisplayMessage } from './components/ChatView';

import { masterCoachChat }     from '@/services/ai/masterCoach';
import type { MasterAction }   from '@/services/ai/masterCoach';

import {
  isCoachOnboarded, setCoachOnboarded,
  loadMasterChats, saveMasterChat, getActiveChatId, setActiveChatId,
  createMasterChat,
  type MasterChat,
} from '@/services/storage/local/masterChatStorage';

import { loadTodayLog, saveTodayLog }         from '@/services/storage/local/dietLogStorage';
import { loadTodayActivities, saveTodayActivities } from '@/services/storage/local/caloryBurnStorage';
import { loadRoutines }                        from '@/services/storage/local/planStorage';
import { saveWorkoutLog }                      from '@/services/storage/local/workoutStorage';

import { type LogItem, type DietAction } from '@/services/ai/nutritionCoach';
import type { ActivityEntry, RoutineDay, ExerciseLog } from '@/types/plan';
import type { ChatMessage } from '@/types/coaching';

import { colors }     from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = BottomTabScreenProps<MainTabParamList, 'Coach'>;

type InProgressWorkout = {
  id:        string;
  date:      string;
  dayName:   string;
  focus:     string;
  exercises: ExerciseLog[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getTodayDayName(): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

function applyDietAction(log: LogItem[], action: DietAction): LogItem[] {
  switch (action.type) {
    case 'add':
      return [...log, { ...action.entry, id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` }];
    case 'remove':
      return log.filter(i => i.id !== action.id);
    case 'update':
      return log.map(i => i.id === action.id ? { ...i, ...action.patch } : i);
    case 'clear':
      return [];
  }
}

function nameMatch(a: string, b: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return n(a).includes(n(b)) || n(b).includes(n(a));
}

// ─── Onboarding capability list ───────────────────────────────────────────────

const CAPABILITIES = [
  { icon: 'body-outline',         text: 'Knows your full journey — weight, diet, training, bloodwork' },
  { icon: 'restaurant-outline',   text: 'Log food from conversation — just say what you ate' },
  { icon: 'barbell-outline',      text: 'Log your workout sets as you report them, live' },
  { icon: 'flame-outline',        text: 'Log calory burn when you mention any activity' },
  { icon: 'pulse-outline',        text: 'Analyses your bloodwork trends and flags changes' },
  { icon: 'chatbubbles-outline',  text: 'Full chat history saved, like ChatGPT' },
] as const;

// ─── Screen ───────────────────────────────────────────────────────────────────

export function CoachScreen(_: Props) {
  const insets = useSafeAreaInsets();

  // Boot state
  const [bootDone,   setBootDone]   = useState(false);
  const [onboarded,  setOnboarded]  = useState(false);
  const [session,    setSession]    = useState<MasterChat | null>(null);

  // Action side-effect state
  const [dietLog,          setDietLog]          = useState<LogItem[]>([]);
  const [todayActivities,  setTodayActivities]  = useState<ActivityEntry[]>([]);
  const [pendingWorkout,   setPendingWorkout]   = useState<InProgressWorkout | null>(null);
  const [todayRoutineDay,  setTodayRoutineDay]  = useState<RoutineDay | null>(null);

  // ── Boot: load everything in parallel ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [ob, chats, activeId, log, acts, routines] = await Promise.all([
        isCoachOnboarded(),
        loadMasterChats(),
        getActiveChatId(),
        loadTodayLog(),
        loadTodayActivities(),
        loadRoutines(),
      ]);

      setDietLog(log);
      setTodayActivities(acts);
      setOnboarded(ob);

      // Today's routine day for workout logging
      const routine  = routines[routines.length - 1];
      const dayName  = getTodayDayName();
      const todayDay = routine?.days.find(d => d.day === dayName) ?? null;
      setTodayRoutineDay(todayDay);

      if (ob) {
        const active = activeId ? chats.find(c => c.id === activeId) ?? null : null;
        const s      = active ?? createMasterChat();
        if (!active) {
          await saveMasterChat(s);
          await setActiveChatId(s.id);
        }
        setSession(s);
      }

      setBootDone(true);
    })();
  }, []);

  // ── Start conversation (one-time) ──────────────────────────────────────────
  const handleStart = useCallback(async () => {
    await setCoachOnboarded();
    const s = createMasterChat();
    await saveMasterChat(s);
    await setActiveChatId(s.id);
    setSession(s);
    setOnboarded(true);
  }, []);

  // ── New chat ───────────────────────────────────────────────────────────────
  const handleNewChat = useCallback(async () => {
    const s = createMasterChat();
    await saveMasterChat(s);
    await setActiveChatId(s.id);
    setSession(s);
    setPendingWorkout(null);
  }, []);

  // ── Save session whenever messages change ──────────────────────────────────
  const handleMessagesChange = useCallback(async (msgs: DisplayMessage[]) => {
    if (!session) return;
    const updated: MasterChat = {
      ...session,
      messages: msgs
        .filter(m => m.id !== 'welcome')
        .map(m => ({ id: m.id, role: m.role as 'user' | 'assistant', content: m.content })),
    };
    setSession(updated);
    await saveMasterChat(updated);
  }, [session]);

  // ── Apply actions returned by the coach ────────────────────────────────────
  const applyActions = useCallback(async (actions: MasterAction[]) => {
    let newLog     = dietLog;
    let newActs    = todayActivities;
    let newWorkout = pendingWorkout;

    for (const action of actions) {
      switch (action.type) {
        case 'diet':
          newLog = applyDietAction(newLog, action.action);
          break;

        case 'burn_add': {
          const entry: ActivityEntry = {
            id: `b-${Date.now()}`,
            name: action.name,
            caloriesBurned: action.calories,
          };
          newActs = [...newActs, entry];
          break;
        }

        case 'workout_set': {
          // Initialise the in-progress workout from today's routine if not started
          if (!newWorkout) {
            const dayName = getTodayDayName();
            newWorkout = {
              id:        `wl-${Date.now()}`,
              date:      getTodayStr(),
              dayName:   todayRoutineDay?.day   ?? dayName,
              focus:     todayRoutineDay?.focus ?? 'Training',
              exercises: (todayRoutineDay?.exercises ?? []).map(e => ({
                name:       e.name,
                targetSets: e.sets,
                targetReps: e.reps,
                sets:       [],
              })),
            };
          }
          // Find or add the exercise
          const exIdx = newWorkout.exercises.findIndex(e => nameMatch(e.name, action.exercise));
          const setEntry = {
            result:     action.result,
            repsActual: action.result !== 'done' ? action.reps : undefined,
          };
          if (exIdx >= 0) {
            const updatedSets = [...newWorkout.exercises[exIdx].sets];
            updatedSets[action.set - 1] = setEntry;
            newWorkout = {
              ...newWorkout,
              exercises: newWorkout.exercises.map((e, i) =>
                i === exIdx ? { ...e, sets: updatedSets } : e,
              ),
            };
          } else {
            newWorkout = {
              ...newWorkout,
              exercises: [
                ...newWorkout.exercises,
                { name: action.exercise, targetSets: 3, targetReps: '10', sets: [setEntry] },
              ],
            };
          }
          break;
        }

        case 'workout_done':
          if (newWorkout) {
            await saveWorkoutLog({ ...newWorkout, completedAt: Date.now() });
            newWorkout = null;
          }
          break;
      }
    }

    // Persist changes if anything mutated
    if (newLog !== dietLog) {
      setDietLog(newLog);
      await saveTodayLog(newLog);
    }
    if (newActs !== todayActivities) {
      setTodayActivities(newActs);
      await saveTodayActivities(newActs);
    }
    setPendingWorkout(newWorkout);
  }, [dietLog, todayActivities, pendingWorkout, todayRoutineDay]);

  // ── onSend passed to ChatView ──────────────────────────────────────────────
  const handleSend = useCallback(async (history: ChatMessage[]) => {
    const { display, actions } = await masterCoachChat(history);
    if (actions.length > 0) await applyActions(actions);
    return display;
  }, [applyActions]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!bootDone) {
    return (
      <View style={[s.root, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Coach</Text>
        {onboarded && (
          <TouchableOpacity style={s.iconBtn} onPress={handleNewChat} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Intro splash — shown once per user lifetime */}
      {!onboarded ? (
        <ScrollView
          style={s.bodyScroll}
          contentContainerStyle={s.body}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.coachCard}>
            <View style={s.coachIcon}>
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>
            <Text style={s.coachName}>Gymman Coach</Text>
            <Text style={s.coachDesc}>
              An AI coach that knows your entire health journey and can act on it — logging food, sets, and activity directly from your conversation.
            </Text>
          </View>

          <View style={s.capList}>
            {CAPABILITIES.map((cap, i) => (
              <View
                key={cap.text}
                style={[s.capRow, i === CAPABILITIES.length - 1 && s.capRowLast]}
              >
                <Ionicons name={cap.icon as any} size={16} color={colors.text.muted} />
                <Text style={s.capText}>{cap.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.startBtn} onPress={handleStart} activeOpacity={0.85}>
            <Ionicons
              name="chatbubble-ellipses"
              size={18}
              color={colors.text.inverse}
              style={{ marginRight: 6 }}
            />
            <Text style={s.startBtnText}>Start a conversation</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* Persistent chat — key on session id so ChatView remounts fresh on new chat */
        session && (
          <ChatView
            key={session.id}
            onSend={handleSend}
            accent={colors.primary}
            welcomeMessage={
              session.messages.length === 0
                ? "Hey! I'm Gymman Coach. I know your full health journey — weight, diet, training, and bloodwork. Ask me anything, or just tell me what you ate or how your workout went."
                : undefined
            }
            initialMessages={session.messages.map(m => ({
              id:      m.id,
              role:    m.role,
              content: m.content,
            }))}
            onMessagesChange={handleMessagesChange}
            placeholder="Ask your coach…"
          />
        )
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg.app },
  center: { alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical:   spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.title2,
    color: colors.text.primary,
  },
  iconBtn: {
    width:           36,
    height:          36,
    borderRadius:    radius.md,
    backgroundColor: colors.bg.card,
    borderWidth:     1,
    borderColor:     colors.border.default,
    alignItems:      'center',
    justifyContent:  'center',
  },

  bodyScroll: {
    flex: 1,
  },
  body: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop:        spacing.xl,
    paddingBottom:     spacing.xl,
    gap:               spacing.lg,
  },

  coachCard: {
    backgroundColor: colors.bg.card,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border.default,
    padding:         spacing.lg,
    alignItems:      'center',
    gap:             spacing.sm,
  },
  coachIcon: {
    width:           60,
    height:          60,
    borderRadius:    radius.full,
    backgroundColor: colors.primaryMuted,
    borderWidth:     1,
    borderColor:     colors.primaryBorder,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    spacing.xs,
  },
  coachName: {
    ...typography.title3,
    color: colors.text.primary,
  },
  coachDesc: {
    ...typography.callout,
    color:      colors.text.secondary,
    textAlign:  'center',
    lineHeight: 22,
  },

  capList: {
    backgroundColor: colors.bg.card,
    borderRadius:    radius.card,
    borderWidth:     1,
    borderColor:     colors.border.default,
    overflow:        'hidden',
  },
  capRow: {
    flexDirection:    'row',
    alignItems:       'center',
    gap:              spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical:   spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  capRowLast: {
    borderBottomWidth: 0,
  },
  capText: {
    ...typography.callout,
    color: colors.text.secondary,
    flex:  1,
  },

  startBtn: {
    height:          spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius:    radius.button,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
  },
  startBtnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
});
