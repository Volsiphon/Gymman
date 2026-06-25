import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { trainerCoachChat } from '@/services/ai/trainerCoach';
import type { ChatMessage } from '@/services/ai/client';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type DisplayMessage = { id: string; role: 'user' | 'assistant'; content: string };

const NUM_INTRO = 6;
// When revealed === 5, msgs[0–4] are visible (last educational msg shown) → dual buttons
const DUAL_BTN_AT = 5;

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

interface Props {
  userName: string;
  accent?: string;
}

export function TrainerIntroView({ userName, accent = colors.primary }: Props) {
  const msgs = useMemo(() => buildIntroMessages(userName), [userName]);

  // How many intro messages are currently visible (1 = first shown on mount)
  const [revealed, setRevealed] = useState(1);
  const [chatPhase, setChatPhase] = useState(false);
  const [chatMessages, setChatMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const chatMessagesRef = useRef<DisplayMessage[]>([]);
  const pendingAutoSend = useRef<string | null>(null);

  const introAnims = useRef(
    Array.from({ length: NUM_INTRO }, () => new Animated.Value(0)),
  ).current;

  // Animate first message on mount
  useEffect(() => {
    Animated.timing(introAnims[0], {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Animate each newly revealed message
  const prevRevealedRef = useRef(1);
  useEffect(() => {
    if (revealed > prevRevealedRef.current) {
      const idx = revealed - 1;
      if (idx >= 0 && idx < NUM_INTRO) {
        Animated.timing(introAnims[idx], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
      prevRevealedRef.current = revealed;
    }
  }, [revealed]);

  const doSend = useCallback(
    async (text: string) => {
      const userMsg: DisplayMessage = { id: `u-${Date.now()}`, role: 'user', content: text };
      chatMessagesRef.current = [...chatMessagesRef.current, userMsg];
      setChatMessages([...chatMessagesRef.current]);
      setLoading(true);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

      try {
        const history: ChatMessage[] = [
          { role: 'assistant', content: msgs[NUM_INTRO - 1] },
          ...chatMessagesRef.current.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];
        const reply = await trainerCoachChat(history);
        const aiMsg: DisplayMessage = { id: `a-${Date.now()}`, role: 'assistant', content: reply };
        chatMessagesRef.current = [...chatMessagesRef.current, aiMsg];
        setChatMessages([...chatMessagesRef.current]);
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
    [msgs],
  );

  // Fire auto-send once chat phase activates (from "Let's build" button)
  useEffect(() => {
    if (chatPhase && pendingAutoSend.current) {
      const msg = pendingAutoSend.current;
      pendingAutoSend.current = null;
      doSend(msg);
    }
  }, [chatPhase, doSend]);

  function handleMakesSense() {
    const next = revealed + 1;
    setRevealed(next);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    if (next >= NUM_INTRO) {
      // All intro messages shown; enable chat after message animates in
      setTimeout(() => setChatPhase(true), 400);
    }
  }

  function handleBuild() {
    pendingAutoSend.current = "I don't have a routine yet. Let's build one from scratch.";
    setChatPhase(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    doSend(text);
  }

  const canSend = input.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {msgs.slice(0, revealed).map((msg, i) => (
          <Animated.View
            key={`intro-${i}`}
            style={{
              opacity: introAnims[i],
              transform: [
                {
                  translateY: introAnims[i].interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            }}
          >
            <View style={[s.bubble, s.aiBubble]}>
              <Text style={s.bubbleText}>{msg}</Text>
            </View>
          </Animated.View>
        ))}

        {chatMessages.map((msg) => (
          <View
            key={msg.id}
            style={[
              s.bubble,
              msg.role === 'user'
                ? [s.userBubble, { backgroundColor: accent }]
                : s.aiBubble,
            ]}
          >
            <Text style={[s.bubbleText, msg.role === 'user' && s.userBubbleText]}>
              {msg.content}
            </Text>
          </View>
        ))}

        {loading && (
          <View style={s.typingRow}>
            <ActivityIndicator size="small" color={accent} />
            <Text style={s.typingText}>Thinking…</Text>
          </View>
        )}
      </ScrollView>

      {/* Intro controls — hidden once all messages are shown or chat is active */}
      {!chatPhase && revealed < NUM_INTRO && (
        <View style={s.controls}>
          {revealed === DUAL_BTN_AT ? (
            <>
              <TouchableOpacity
                style={[s.buildBtn, { backgroundColor: accent }]}
                onPress={handleBuild}
                activeOpacity={0.85}
              >
                <Text style={s.buildBtnText}>Let's build your routine</Text>
                <Ionicons name="arrow-forward" size={16} color={colors.text.inverse} />
              </TouchableOpacity>
              <TouchableOpacity
                style={s.makesSenseBtn}
                onPress={handleMakesSense}
                activeOpacity={0.75}
              >
                <Text style={s.makesSenseBtnText}>Makes sense</Text>
                <Ionicons name="checkmark" size={16} color={colors.text.muted} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[s.makesSenseBtn, s.makesSenseBtnFull]}
              onPress={handleMakesSense}
              activeOpacity={0.75}
            >
              <Text style={s.makesSenseBtnText}>Makes sense</Text>
              <Ionicons name="checkmark" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Chat input — shown once intro is complete */}
      {chatPhase && (
        <View style={s.inputRow}>
          <TextInput
            style={s.input}
            placeholder="Reply to your trainer…"
            placeholderTextColor={colors.text.disabled}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={2000}
            editable={!loading}
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
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  list: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },

  bubble: {
    maxWidth: '88%',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  aiBubble: {
    backgroundColor: colors.bg.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: radius.sm,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: radius.sm,
  },
  bubbleText: {
    ...typography.callout,
    color: colors.text.primary,
    lineHeight: 22,
  },
  userBubbleText: {
    color: colors.text.inverse,
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  typingText: {
    ...typography.caption,
    color: colors.text.muted,
  },

  controls: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    gap: spacing.xs,
  },

  buildBtn: {
    height: 52,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buildBtnText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 0.5,
    color: colors.text.inverse,
  },

  makesSenseBtn: {
    height: 42,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bg.elevated,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  makesSenseBtnFull: {
    height: 52,
  },
  makesSenseBtnText: {
    ...typography.callout,
    color: colors.text.secondary,
    fontWeight: '500',
  },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.callout,
    color: colors.text.primary,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
});
