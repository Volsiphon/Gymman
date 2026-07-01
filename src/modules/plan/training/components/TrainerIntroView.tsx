/**
 * modules/plan/training/components/TrainerIntroView.tsx
 *
 * The "Trainer" tab inside TrainingScreen — the chat interface where the user
 * builds and modifies their workout routine by talking to the AI trainer. Uses
 * trainerCoach.ts which operates in two modes: builder mode (no routine exists yet,
 * AI creates one from scratch) and modifier mode (routine exists, AI issues [PATCH]
 * commands). After each AI reply, the routine in planStorage.ts is updated and the
 * parent TrainingScreen re-renders TodayWorkoutView with the new plan.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Animated,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  trainerCoachChat,
  routineCoachChat,
  parseRoutineFromText,
  extractPatches,
  applyPatchesToRoutine,
  PATCH_DONE_MARKER,
} from '@/services/ai/trainerCoach';
import type { ChatMessage, SavedChat } from '@/types/coaching';
import { saveRoutine, loadRoutines, updateRoutine } from '@/services/storage/local/planStorage';
import { loadWorkoutLogs } from '@/services/storage/local/workoutStorage';
import { saveRoutineChange } from '@/services/storage/local/historyStorage';
import { loadSavedChats, upsertSavedChat, deleteSavedChat } from '@/services/storage/local/trainerChatStorage';
import type { Routine, WorkoutLog } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type DisplayMessage = { id: string; role: 'user' | 'assistant' | 'system'; content: string };

const NUM_INTRO = 6;
const DUAL_BTN_AT = 5;
const READY_MARKER = '[ROUTINE_READY]';
const SUMMARY_RE = /\[CHANGE_SUMMARY:\s*([^\]]+)\]/;

function buildIntroMessages(name: string): string[] {
  const hey = name ? `Hey ${name}` : 'Hey there';
  return [
    `${hey} — I'm your specialized trainer for all the exercises. Before we build your routine, let me walk you through a few things that most people skip. This will take 2 minutes and it'll make everything we do after this actually make sense.`,
    `Your body has around 600 muscles but they're grouped into major groups — chest, back, shoulders, biceps, triceps, legs (quads, hamstrings, glutes, calves), and core. A good routine hits ALL of them across the week. Most beginners only train what they can see in the mirror (chest, biceps, abs) and completely neglect their back, posterior chain, and legs. That imbalance leads to poor posture, injuries, and a physique that looks unfinished.`,
    `Muscles grow when you stress them and then let them RECOVER. Training the same muscle two days in a row before it's recovered is called overtraining — and it actually makes you weaker, not stronger. A general rule: give each muscle group 48–72 hours of rest before hitting it again. This is why smart routines are designed around rest days and splits, not just "go hard every day."`,
    `Sets and reps matter too. For muscle growth (hypertrophy): 3–4 sets of 8–12 reps per exercise works well for most people. For strength: lower reps (3–6), heavier weight. Rest between sets: 60–90 seconds for hypertrophy, 2–3 minutes for heavy strength work. Progressive overload — gradually adding weight or reps over time — is the single most important training concept. Without it, you plateau.`,
    `One more thing: compound movements first, isolation movements after. Squats, deadlifts, bench press, rows, overhead press — these hit multiple muscles at once and should be your priority. Bicep curls, tricep pushdowns, lateral raises — these are finishers, isolation exercises that target a single muscle group. Alright — that's enough theory. Now let's talk about your training.`,
    `Do you already have a training routine? If yes, describe it — what days, what exercises, how many sets. Don't worry about it being "right" — just tell me what you're doing, and I'll give you an honest take on whether it's working for your goal. If it's bad, we'll modify it together to make a viable routine FOR YOU. If you don't have a routine, say that.`,
  ];
}

const COACH_GREETING =
  "Your routine is loaded — and I have your full training history. Ask me to swap exercises, adjust the split, fix rep ranges, or build something new. What needs work?";

function formatChatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - ts) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  userName: string;
  accent?: string;
}

export function TrainerIntroView({ userName, accent = colors.primary }: Props) {
  const insets = useSafeAreaInsets();
  const msgs = useMemo(() => buildIntroMessages(userName), [userName]);

  const [revealed, setRevealed] = useState(1);
  const [chatPhase, setChatPhase] = useState(false);
  const [chatMessages, setChatMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Editing
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);

  // Routine saving state
  const [routineText, setRoutineText] = useState<string | null>(null);
  const [changeSummary, setChangeSummary] = useState('Routine updated');
  const [routineSaving, setRoutineSaving] = useState(false);
  const [routineSaved, setRoutineSaved] = useState(false);

  // Coach mode (has existing routine)
  const [routineMode, setRoutineMode] = useState(false);
  const [loadedRoutines, setLoadedRoutines] = useState<Routine[]>([]);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const chatMessagesRef = useRef<DisplayMessage[]>([]);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const kbHeightAnim = useRef(new Animated.Value(0)).current;
  const [kbShown, setKbShown] = useState(false);

  const introAnims = useRef(
    Array.from({ length: NUM_INTRO }, () => new Animated.Value(0)),
  ).current;

  // On mount: load routines + workout history + saved chats, restore last session
  useEffect(() => {
    Promise.all([loadRoutines(), loadWorkoutLogs(), loadSavedChats()]).then(([routines, logs, saved]) => {
      setWorkoutLogs(logs);
      if (routines.length > 0) {
        setLoadedRoutines(routines);
        setRoutineMode(true);
        setChatPhase(true);
        if (saved.length > 0) {
          const last = saved[0];
          sessionIdRef.current = last.id;
          chatMessagesRef.current = last.messages as DisplayMessage[];
          setChatMessages([...chatMessagesRef.current]);
          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
        } else {
          const greeting: DisplayMessage = {
            id: 'coach-greeting',
            role: 'assistant',
            content: logs.length > 0
              ? COACH_GREETING
              : "Your routine is loaded. Ask me to swap exercises, adjust sets and reps, fix the split, or restructure your week. What needs work?",
          };
          chatMessagesRef.current = [greeting];
          setChatMessages([greeting]);
        }
      } else if (saved.length > 0) {
        const last = saved[0];
        sessionIdRef.current = last.id;
        chatMessagesRef.current = last.messages as DisplayMessage[];
        setChatMessages([...chatMessagesRef.current]);
        setChatPhase(true);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
      }
    });
  }, []);

  // Keyboard height tracking + scroll-to-end
  useEffect(() => {
    const isIOS = Platform.OS === 'ios';
    const showEvent = isIOS ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = isIOS ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKbShown(true);
      Animated.timing(kbHeightAnim, {
        toValue: e.endCoordinates.height - insets.bottom,
        duration: isIOS ? (e.duration ?? 250) : 0,
        useNativeDriver: false,
      }).start();
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    });

    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      setKbShown(false);
      Animated.timing(kbHeightAnim, {
        toValue: 0,
        duration: isIOS ? (e.duration ?? 250) : 0,
        useNativeDriver: false,
      }).start();
    });

    return () => { showSub.remove(); hideSub.remove(); };
  }, [kbHeightAnim, insets.bottom]);

  // Animate first intro message
  useEffect(() => {
    Animated.timing(introAnims[0], { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);

  const prevRevealedRef = useRef(1);
  useEffect(() => {
    if (revealed > prevRevealedRef.current) {
      const idx = revealed - 1;
      if (idx >= 0 && idx < NUM_INTRO) {
        Animated.timing(introAnims[idx], { toValue: 1, duration: 300, useNativeDriver: true }).start();
      }
      prevRevealedRef.current = revealed;
    }
  }, [revealed]);

  function persistCurrentChat() {
    if (chatMessagesRef.current.length <= 1) return;
    upsertSavedChat({
      id: sessionIdRef.current,
      startedAt: parseInt(sessionIdRef.current.replace('session-', ''), 10),
      messages: chatMessagesRef.current,
    });
  }

  async function applyAndSavePatches(reply: string, summary: string) {
    const patches = extractPatches(reply);
    if (patches.length === 0) return;
    try {
      const routines = await loadRoutines();
      if (routines.length === 0) return;
      const latest = routines[routines.length - 1];
      const updated = applyPatchesToRoutine(latest, patches);
      const now = Date.now();
      await updateRoutine(updated);
      await saveRoutineChange({
        id: `change-${now}`,
        date: new Date().toISOString().split('T')[0],
        summary,
        routineId: updated.id,
        changedAt: now,
      });
      const refreshed = await loadRoutines();
      setLoadedRoutines(refreshed);
      const sysMsg: DisplayMessage = { id: `sys-${now}`, role: 'system', content: summary };
      chatMessagesRef.current = [...chatMessagesRef.current, sysMsg];
      setChatMessages([...chatMessagesRef.current]);
      persistCurrentChat();
    } catch (err) {
      console.error('[applyAndSavePatches]', err);
    }
  }

  const doSend = useCallback(
    async (text: string) => {
      const userMsg: DisplayMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
      chatMessagesRef.current = [...chatMessagesRef.current, userMsg];
      setChatMessages([...chatMessagesRef.current]);
      setLoading(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

      try {
        const history: ChatMessage[] = chatMessagesRef.current
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        let reply: string;
        if (routineMode) {
          reply = await routineCoachChat(history, loadedRoutines, workoutLogs);
        } else {
          reply = await trainerCoachChat([
            { role: 'assistant', content: msgs[NUM_INTRO - 1] },
            ...history,
          ]);
        }

        const hasPatchDone = reply.includes(PATCH_DONE_MARKER);
        const hasReady = !hasPatchDone && reply.includes(READY_MARKER);
        const summaryMatch = reply.match(SUMMARY_RE);
        const summary = summaryMatch ? summaryMatch[1].trim() : 'Routine updated';

        let displayContent = reply
          .replace(/\[PATCH[^\]]*\]/g, '')
          .replace(PATCH_DONE_MARKER, '')
          .replace(READY_MARKER, '');
        if (summaryMatch) displayContent = displayContent.replace(summaryMatch[0], '');
        displayContent = displayContent.replace(/\n{3,}/g, '\n\n').trim();

        const aiMsg: DisplayMessage = { id: `a-${Date.now()}`, role: 'assistant', content: displayContent };
        chatMessagesRef.current = [...chatMessagesRef.current, aiMsg];
        setChatMessages([...chatMessagesRef.current]);
        persistCurrentChat();

        if (hasPatchDone) {
          applyAndSavePatches(reply, summary);
        } else if (hasReady) {
          setRoutineText(displayContent);
          setChangeSummary(summary);
          setRoutineSaved(false);
        }
      } catch {
        const errMsg: DisplayMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "Couldn't reach the server. Check your connection and try again.",
        };
        chatMessagesRef.current = [...chatMessagesRef.current, errMsg];
        setChatMessages([...chatMessagesRef.current]);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      }
    },
    [msgs, routineMode, loadedRoutines, workoutLogs],
  );

  function handleMakesSense() {
    const next = revealed + 1;
    setRevealed(next);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    if (next >= NUM_INTRO) setTimeout(() => setChatPhase(true), 400);
  }

  function handleBuild() {
    setChatPhase(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    if (editingMsgId) {
      const idx = chatMessagesRef.current.findIndex((m) => m.id === editingMsgId);
      if (idx >= 0) {
        chatMessagesRef.current = chatMessagesRef.current.slice(0, idx);
        setChatMessages([...chatMessagesRef.current]);
      }
      setEditingMsgId(null);
    }

    doSend(text);
  }

  function handleCancelEdit() {
    setEditingMsgId(null);
    setInput('');
  }

  function handleLongPressMsg(msg: DisplayMessage) {
    if (msg.role !== 'user') return;
    setEditingMsgId(msg.id);
    setInput(msg.content);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleNewChat() {
    if (chatMessagesRef.current.length > 1) {
      upsertSavedChat({
        id: sessionIdRef.current,
        startedAt: parseInt(sessionIdRef.current.replace('session-', ''), 10),
        messages: chatMessagesRef.current,
      });
    }
    sessionIdRef.current = `session-${Date.now()}`;
    const greeting: DisplayMessage = {
      id: `greeting-${Date.now()}`,
      role: 'assistant',
      content: routineMode ? COACH_GREETING : msgs[0],
    };
    chatMessagesRef.current = [greeting];
    setChatMessages([greeting]);
    setEditingMsgId(null);
    setRoutineText(null);
    setRoutineSaved(false);
    if (!routineMode) {
      setChatPhase(false);
      setRevealed(1);
    }
  }

  async function handleShowHistory() {
    const chats = await loadSavedChats();
    setSavedChats(chats);
    setShowHistory(true);
  }

  async function handleLoadChat(chat: SavedChat) {
    if (chatMessagesRef.current.length > 1) {
      upsertSavedChat({
        id: sessionIdRef.current,
        startedAt: parseInt(sessionIdRef.current.replace('session-', ''), 10),
        messages: chatMessagesRef.current,
      });
    }
    sessionIdRef.current = chat.id;
    chatMessagesRef.current = chat.messages as DisplayMessage[];
    setChatMessages([...chatMessagesRef.current]);
    setShowHistory(false);
    setChatPhase(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
  }

  async function handleDeleteChat(id: string) {
    await deleteSavedChat(id);
    setSavedChats((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleSaveRoutine() {
    if (!routineText || routineSaving) return;
    setRoutineSaving(true);
    try {
      const existing = await loadRoutines();
      const name = `Routine ${existing.length + 1}`;
      const days = parseRoutineFromText(routineText);
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const newRoutine: Routine = {
        id: `routine-${now}`, name, days, rawText: routineText, createdAt: now,
      };
      await saveRoutine(newRoutine);
      await saveRoutineChange({
        id: `change-${now}`, date: today, summary: changeSummary,
        routineId: newRoutine.id, changedAt: now,
      });
      setRoutineSaved(true);
      const updated = await loadRoutines();
      setLoadedRoutines(updated);
      if (!routineMode) setRoutineMode(true);
    } catch (err) {
      console.error('[handleSaveRoutine]', err);
    } finally {
      setRoutineSaving(false);
    }
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <View style={{ flex: 1 }}>

      {/* Toolbar — only in chat phase */}
      {chatPhase && (
        <View style={s.toolbar}>
          <TouchableOpacity
            onPress={handleShowHistory}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="time-outline" size={20} color={colors.text.muted} />
          </TouchableOpacity>
          <Text style={s.toolbarTitle}>Trainer</Text>
          <TouchableOpacity
            onPress={handleNewChat}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="create-outline" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>
      )}

      <Animated.View style={{ flex: 1, marginBottom: kbHeightAnim }}>
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
        >
          {/* Intro messages */}
          {!routineMode && msgs.slice(0, revealed).map((msg, i) => (
            <Animated.View
              key={`intro-${i}`}
              style={{
                opacity: introAnims[i],
                transform: [{
                  translateY: introAnims[i].interpolate({ inputRange: [0, 1], outputRange: [10, 0] }),
                }],
              }}
            >
              <View style={[s.bubble, s.aiBubble]}>
                <Text style={s.bubbleText}>{msg}</Text>
              </View>
            </Animated.View>
          ))}

          {/* Chat messages */}
          {chatMessages.map((msg) => {
            if (msg.role === 'system') {
              return (
                <View key={msg.id} style={s.sysMsgWrap}>
                  <View style={s.sysMsgChip}>
                    <Ionicons name="checkmark-circle" size={13} color={colors.success} />
                    <Text style={s.sysMsgText}>{msg.content}</Text>
                  </View>
                </View>
              );
            }
            const isUser = msg.role === 'user';
            const isEditing = msg.id === editingMsgId;
            return (
              <TouchableOpacity
                key={msg.id}
                activeOpacity={isUser ? 0.7 : 1}
                onLongPress={() => handleLongPressMsg(msg)}
                delayLongPress={350}
                disabled={!isUser}
              >
                <View
                  style={[
                    s.bubble,
                    isUser ? [s.userBubble, { backgroundColor: accent }] : s.aiBubble,
                    isEditing && s.bubbleEditing,
                  ]}
                >
                  <Text style={[s.bubbleText, isUser && s.userBubbleText]}>{msg.content}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {loading && (
            <View style={s.typingRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={s.typingText}>Thinking…</Text>
            </View>
          )}
        </ScrollView>

        {/* Intro controls */}
        {!routineMode && !chatPhase && revealed < NUM_INTRO && (
          <View style={s.controls}>
            {revealed === DUAL_BTN_AT ? (
              <TouchableOpacity
                style={[s.buildBtn, { backgroundColor: accent }]}
                onPress={handleBuild}
                activeOpacity={0.85}
              >
                <Text style={s.buildBtnText}>Let's build your routine</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={s.makesSenseBtn}
                onPress={handleMakesSense}
                activeOpacity={0.75}
              >
                <Text style={s.makesSenseBtnText}>Makes sense</Text>
                <Ionicons name="checkmark" size={16} color={colors.text.inverse} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Save banner */}
        {chatPhase && routineText !== null && (
          <TouchableOpacity
            style={[s.saveBanner, routineSaved && s.saveBannerDone]}
            onPress={handleSaveRoutine}
            activeOpacity={0.8}
            disabled={routineSaved || routineSaving}
          >
            {routineSaving ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Ionicons
                name={routineSaved ? 'checkmark-circle' : 'add-circle-outline'}
                size={18}
                color={routineSaved ? colors.success : colors.text.inverse}
              />
            )}
            <Text style={[s.saveBannerText, routineSaved && s.saveBannerTextDone]}>
              {routineSaved ? 'Applied' : routineMode ? 'Apply Changes' : 'Save to Routines'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Edit banner */}
        {editingMsgId && (
          <View style={s.editBanner}>
            <Ionicons name="pencil" size={13} color={accent} />
            <Text style={[s.editBannerText, { color: accent }]}>Editing message</Text>
            <TouchableOpacity onPress={handleCancelEdit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input */}
        {chatPhase && (
          <View style={[s.inputRow, { paddingBottom: kbShown ? spacing.sm : Math.max(spacing.sm, insets.bottom) }]}>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder={routineMode ? 'Ask your coach…' : 'Reply to your trainer…'}
              placeholderTextColor={colors.text.disabled}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={2000}
              editable={!loading}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[s.sendBtn, canSend ? { backgroundColor: accent } : s.sendBtnDisabled]}
              onPress={handleSend}
              activeOpacity={0.8}
              disabled={!canSend}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={canSend ? colors.text.inverse : colors.text.disabled}
              />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* History overlay */}
      {showHistory && (
        <View style={s.historyOverlay}>
          <View style={s.historyHeader}>
            <Text style={s.historyTitle}>Past Conversations</Text>
            <TouchableOpacity
              onPress={() => setShowHistory(false)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.historyList} showsVerticalScrollIndicator={false}>
            {savedChats.length === 0 ? (
              <Text style={s.historyEmpty}>No saved conversations yet.{'\n'}Start a new chat and use "New Chat" to archive it.</Text>
            ) : (
              savedChats.map((chat) => {
                const firstUserMsg = chat.messages.find((m) => m.role === 'user');
                return (
                  <TouchableOpacity
                    key={chat.id}
                    style={s.historyItem}
                    onPress={() => handleLoadChat(chat)}
                    activeOpacity={0.75}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.historyItemDate}>{formatChatDate(chat.startedAt)}</Text>
                      <Text style={s.historyItemPreview} numberOfLines={2}>
                        {firstUserMsg?.content ?? 'No messages'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteChat(chat.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.text.disabled} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
    backgroundColor: colors.bg.app,
  },
  toolbarTitle: { ...typography.subhead, color: colors.text.muted, fontWeight: '500' },

  list: { padding: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },

  bubble: { maxWidth: '88%', borderRadius: radius.lg, padding: spacing.md },
  aiBubble: {
    backgroundColor: colors.bg.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
  },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: radius.sm },
  bubbleEditing: { opacity: 0.5 },
  bubbleText: { ...typography.callout, color: colors.text.primary, lineHeight: 22 },
  userBubbleText: { color: colors.text.inverse },

  sysMsgWrap: { alignItems: 'center', paddingVertical: spacing.xs },
  sysMsgChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  sysMsgText: { ...typography.caption, color: colors.success, fontWeight: '500' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  typingText: { ...typography.caption, color: colors.text.muted },

  controls: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  buildBtn: {
    height: 52, borderRadius: radius.button,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
  },
  buildBtnText: { fontFamily: typography.fonts.display, fontSize: 16, letterSpacing: 0.5, color: colors.text.inverse },
  makesSenseBtn: {
    height: 52, borderRadius: radius.button,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.success,
  },
  makesSenseBtnText: { ...typography.callout, color: colors.text.inverse, fontWeight: '500' },

  saveBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 12, paddingHorizontal: spacing.md,
    backgroundColor: colors.success,
  },
  saveBannerDone: {
    backgroundColor: colors.bg.elevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
  },
  saveBannerText: { ...typography.callout, color: colors.text.inverse, fontWeight: '600' },
  saveBannerTextDone: { color: colors.success },

  editBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: colors.bg.elevated,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  editBannerText: { ...typography.caption, fontWeight: '500', flex: 1 },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingTop: spacing.sm,
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 120,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    ...typography.callout, color: colors.text.primary,
  },
  sendBtn: { width: 36, height: 36, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.bg.elevated },

  // History overlay
  historyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg.app,
    zIndex: 99,
  },
  historyHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  historyTitle: { ...typography.title3, color: colors.text.primary },
  historyList: { padding: spacing.md, gap: spacing.sm },
  historyEmpty: {
    ...typography.callout, color: colors.text.muted,
    textAlign: 'center', marginTop: 48, lineHeight: 22,
  },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  historyItemDate: { ...typography.caption, color: colors.text.muted, marginBottom: 4 },
  historyItemPreview: { ...typography.callout, color: colors.text.primary, lineHeight: 20 },
});
