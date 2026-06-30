import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Dimensions,
  Keyboard,
} from 'react-native';

const MAX_BUBBLE_W = Dimensions.get('window').width * 0.78;
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { OnboardingStackParamList } from '@/app/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import type { ActivityLevel, Sex, UserPhysicalStats, QuestionKey } from '@/types/user';
import { onboardingChat, type OnboardingChatResult } from '@/services/ai/onboardingChat';
import type { ChatMessage } from '@/services/ai/client';
import { saveUserProfile } from '@/services/storage/local/userProfileStorage';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'OnboardingChat'>;
  route: RouteProp<OnboardingStackParamList, 'OnboardingChat'>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgType = 'bot' | 'user' | 'flag' | 'ban';

interface Msg {
  id: string;
  type: MsgType;
  text: string;
  questionKey?: QuestionKey;
}

interface Choice {
  label: string;
  desc?: string;
  value: string;
}

interface AnswerHistoryEntry {
  msgId: string;
  questionKey: QuestionKey;
  snapshot: Partial<UserPhysicalStats>;
  rawText: string;
  chatHistoryLen: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SEX_CHOICES: Choice[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Other', value: 'other' },
];

const ACTIVITY_CHOICES: Choice[] = [
  { label: 'Sedentary', desc: 'Desk job, minimal exercise', value: 'sedentary' },
  { label: 'Lightly Active', desc: 'Light exercise 1–3x/week', value: 'light' },
  { label: 'Moderately Active', desc: 'Regular workouts 3–5x/week', value: 'moderate' },
  { label: 'Very Active', desc: 'Hard training daily or physical job', value: 'active' },
  { label: 'Athlete Level', desc: 'Twice a day, competitive, military', value: 'extreme' },
  { label: "I'm not sure", desc: 'Describe your day instead', value: 'not_sure' },
];

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly Active',
  moderate: 'Moderately Active',
  active: 'Very Active',
  extreme: 'Athlete Level',
};

const USER_MSG_LIMIT = 30;

const PREAMBLE =
  "Got it — that's a clear goal to work with. Now give us the basic data about your current physique to help us identify how realistic your goal is. Everyone has different genetics, basic build, and different bodies. We'll use this information to build a practical plan to actually get you to your goal. If your goal is impractical for your body situation, we will also tell you that straightforwardly.\n\nNothing complicated yet, just the basics.";

function getBotQuestion(q: QuestionKey): string {
  switch (q) {
    case 'name':    return "Hey — I'm Gymman. What should I call you?";
    case 'age':     return "How old are you? (just the number)";
    case 'sex':     return "What's your sex — male, female, or other?";
    case 'weight':  return "What's your current weight? (e.g. 70 kg or 155 lbs)";
    case 'height':  return "What's your height? (e.g. 175 cm or 5'10\")";
    case 'neck':    return "Neck circumference? (e.g. 38 cm)\n\nWe know people don't generally know this, so you can skip it for now and add it in the app later when you have it.";
    case 'waist':   return "And your waist? (e.g. 80 cm)\n\nWe know people don't generally know this either, so you can skip it for now and add it in the app later when you have it.";
    case 'hip':     return "And your hips? (e.g. 95 cm — or skip)";
    case 'country': return "Which country or region are you in? (city name works)";
    case 'dietary': return "Any dietary preferences? (vegan, halal, no restrictions, etc.)";
    case 'activityLevel':        return "How active are you day-to-day?";
    case 'activityDescription':  return "Describe a typical day for me — morning to night.";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg, onLongPressEdit }: { msg: Msg; onLongPressEdit?: (msgId: string) => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  if (msg.type === 'flag' || msg.type === 'ban') {
    return (
      <Animated.View style={[styles.systemRow, { opacity: fade }]}>
        <Text style={msg.type === 'ban' ? styles.banText : styles.flagText}>
          {msg.text}
        </Text>
      </Animated.View>
    );
  }

  const canEdit = msg.type === 'user' && !!msg.questionKey && !!onLongPressEdit;

  const bubble = (
    <View style={[styles.bubble, msg.type === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
      <Text style={[styles.bubbleText, msg.type === 'user' && styles.bubbleTextUser]}>
        {msg.text}
      </Text>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        msg.type === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      {canEdit
        ? (
          <TouchableOpacity
            onLongPress={() => onLongPressEdit!(msg.id)}
            delayLongPress={450}
            activeOpacity={0.85}
          >
            {bubble}
          </TouchableOpacity>
        )
        : bubble
      }
    </Animated.View>
  );
}

function TypingDots() {
  const d1 = useRef(new Animated.Value(0.25)).current;
  const d2 = useRef(new Animated.Value(0.25)).current;
  const d3 = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.25, duration: 280, useNativeDriver: true }),
          Animated.delay(560 - delay),
        ]),
      );
    const a1 = pulse(d1, 0);
    const a2 = pulse(d2, 187);
    const a3 = pulse(d3, 374);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={styles.bubbleRowLeft}>
      <View style={[styles.typingBubble]}>
        {[d1, d2, d3].map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: d }]} />
        ))}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function OnboardingChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const msgCounter = useRef(0);
  const answersRef = useRef<Partial<UserPhysicalStats>>({});
  const rawActivityDescRef = useRef<string | undefined>(undefined);
  const chatHistoryRef = useRef<ChatMessage[]>([]);
  const userMsgCountRef = useRef(0);
  const restartCountRef = useRef(0);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentQ, setCurrentQ] = useState<QuestionKey>('name');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [choices, setChoices] = useState<Choice[] | null>(null);

  const addMsg = useCallback((type: MsgType, text: string, questionKey?: QuestionKey): string => {
    const id = String(++msgCounter.current);
    if (type === 'user') userMsgCountRef.current++;
    setMessages(prev => [...prev, { id, type, text, questionKey }]);
    return id;
  }, []);

  const distractionCountRef = useRef(0);
  const answerHistoryRef = useRef<AnswerHistoryEntry[]>([]);
  const editCountRef = useRef(0);
  const [editCount, setEditCount] = useState(0);
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const warningAnim = useRef(new Animated.Value(0)).current;

  const showWarning = useCallback((msg: string) => {
    warningAnim.stopAnimation();
    warningAnim.setValue(0);
    setWarningMsg(msg);
    Animated.sequence([
      Animated.timing(warningAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(warningAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setWarningMsg(null); });
  }, [warningAnim]);

  const rollBackTo = useCallback((msgId: string) => {
    if (editCountRef.current >= 3) return;
    const idx = answerHistoryRef.current.findIndex(e => e.msgId === msgId);
    if (idx === -1) return;
    const entry = answerHistoryRef.current[idx];
    answersRef.current = { ...entry.snapshot };
    chatHistoryRef.current = chatHistoryRef.current.slice(0, entry.chatHistoryLen);
    answerHistoryRef.current = answerHistoryRef.current.slice(0, idx);
    setMessages(prev => {
      const i = prev.findIndex(m => m.id === msgId);
      return i === -1 ? prev : prev.slice(0, i);
    });
    setCurrentQ(entry.questionKey);
    setInputText(entry.rawText);
    setIsDone(false);
    setIsTyping(false);
    if (entry.questionKey === 'sex') setChoices(SEX_CHOICES);
    else if (entry.questionKey === 'activityLevel') setChoices(ACTIVITY_CHOICES);
    else setChoices(null);
    editCountRef.current++;
    setEditCount(editCountRef.current);
    const remaining = 3 - editCountRef.current;
    showWarning(
      remaining === 0 ? 'No more edits allowed.'
      : remaining === 1 ? '1 edit remaining.'
      : `${remaining} edits remaining.`
    );
  }, [showWarning]);

  const resetChat = useCallback(() => {
    answersRef.current = {};
    answerHistoryRef.current = [];
    editCountRef.current = 0;
    userMsgCountRef.current = 0;
    msgCounter.current = 0;
    distractionCountRef.current = 0;
    chatHistoryRef.current = [];
    setEditCount(0);
    setMessages([]);
    setCurrentQ('name');
    setIsDone(false);
    setChoices(null);
    setInputText('');
    setSelectedMsgId(null);
    setTimeout(() => {
      addMsg('bot', PREAMBLE);
      chatHistoryRef.current.push({ role: 'assistant', content: PREAMBLE });
    }, 350);
    setTimeout(() => setIsTyping(true), 900);
    setTimeout(() => {
      setIsTyping(false);
      const firstQ = getBotQuestion('name');
      addMsg('bot', firstQ);
      chatHistoryRef.current.push({ role: 'assistant', content: firstQ });
    }, 1800);
  }, [addMsg]);

  const triggerLimit = useCallback(() => {
    setChoices(null);
    setIsTyping(false);
    if (restartCountRef.current >= 1) {
      addMsg('flag', "You've hit the cap twice. Keep this up and your account will be flagged. This session is now locked.");
      setIsDone(true);
      return;
    }
    restartCountRef.current++;
    addMsg('flag', "Just a heads-up — this is a quick stats intake, not an open chat. You've gone over the message limit. Restarting.");
    setTimeout(() => resetChat(), 2800);
  }, [addMsg, resetChat]);

  useEffect(() => {
    setTimeout(() => {
      addMsg('bot', PREAMBLE);
      chatHistoryRef.current.push({ role: 'assistant', content: PREAMBLE });
    }, 350);
    setTimeout(() => setIsTyping(true), 900);
    setTimeout(() => {
      setIsTyping(false);
      const firstQ = getBotQuestion('name');
      addMsg('bot', firstQ);
      chatHistoryRef.current.push({ role: 'assistant', content: firstQ });
    }, 1800);
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, isTyping]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100),
    );
    return () => show.remove();
  }, []);

  const proceed = useCallback((nextQ: QuestionKey | 'done', ack?: string) => {
    if (ack) {
      setIsTyping(false);
      addMsg('bot', ack);
      chatHistoryRef.current.push({ role: 'assistant', content: ack });
      setTimeout(() => proceed(nextQ), 650);
      return;
    }

    if (nextQ === 'done') {
      const a = answersRef.current;
      const bodyLines = [
        a.neckCm  ? `Neck: ${a.neckCm} cm`  : null,
        a.waistCm ? `Waist: ${a.waistCm} cm` : null,
        a.hipCm   ? `Hips: ${a.hipCm} cm`   : null,
      ].filter(Boolean).join('  ·  ');
      const summary =
        `You're all set, ${a.name}!\n\n` +
        `Name: ${a.name}, ${a.age} years old\n` +
        `Sex: ${a.sex}\n` +
        `Weight: ${a.weightKg} kg  ·  Height: ${a.heightCm} cm\n` +
        (bodyLines ? `${bodyLines}\n` : '') +
        `Country: ${a.country}\n` +
        `Diet: ${a.dietary}\n` +
        `Activity: ${ACTIVITY_LABELS[a.activityLevel!]}`;
      setIsTyping(false);
      addMsg('bot', summary);
      setIsDone(true);
      return;
    }

    setIsTyping(false);
    setCurrentQ(nextQ);
    const q_text = getBotQuestion(nextQ);
    addMsg('bot', q_text);
    chatHistoryRef.current.push({ role: 'assistant', content: q_text });
    if (nextQ === 'sex') setChoices(SEX_CHOICES);
    else if (nextQ === 'activityLevel') setChoices(ACTIVITY_CHOICES);
    else setChoices(null);
  }, [addMsg]);

  const handleDistraction = useCallback((q: QuestionKey, botReply: string) => {
    distractionCountRef.current++;
    const count = distractionCountRef.current;
    setIsTyping(false);

    if (count >= 4) {
      const msg = count === 4
        ? `I won't be taking off-topic questions from here. ${getBotQuestion(q)}`
        : getBotQuestion(q);
      addMsg('bot', msg);
      chatHistoryRef.current.push({ role: 'assistant', content: msg });
      return;
    }

    addMsg('bot', botReply);
    chatHistoryRef.current.push({ role: 'assistant', content: botReply });
    setTimeout(() => {
      const q_text = getBotQuestion(q);
      addMsg('bot', q_text);
      chatHistoryRef.current.push({ role: 'assistant', content: q_text });
    }, 500);
  }, [addMsg]);

  const advanceAfterAI = useCallback((aiText: string, nextQ: QuestionKey | 'done') => {
    setIsTyping(false);
    addMsg('bot', aiText);
    chatHistoryRef.current.push({ role: 'assistant', content: aiText });
    if (nextQ === 'done') { setIsDone(true); return; }
    setTimeout(() => {
      setCurrentQ(nextQ);
      const q_text = getBotQuestion(nextQ);
      addMsg('bot', q_text);
      chatHistoryRef.current.push({ role: 'assistant', content: q_text });
      if (nextQ === 'sex') setChoices(SEX_CHOICES);
      else if (nextQ === 'activityLevel') setChoices(ACTIVITY_CHOICES);
      else setChoices(null);
    }, 400);
  }, [addMsg]);

  const processTextAnswer = useCallback(async (raw: string) => {
    const q = currentQ;
    if (q === 'activityDescription') rawActivityDescRef.current = raw;
    setInputText('');

    const snapshotBefore = { ...answersRef.current };
    const chatHistoryLen = chatHistoryRef.current.length;
    const userMsgId = addMsg('user', raw, q);
    answerHistoryRef.current.push({ msgId: userMsgId, questionKey: q, snapshot: snapshotBefore, rawText: raw, chatHistoryLen });

    if (userMsgCountRef.current >= USER_MSG_LIMIT) { triggerLimit(); return; }
    setIsTyping(true);

    let result: OnboardingChatResult;
    try {
      result = await onboardingChat({
        currentQ: q,
        collected: { ...answersRef.current },
        userRaw: raw,
        goalText: route.params.goalText,
        history: chatHistoryRef.current,
      });
    } catch {
      setIsTyping(false);
      chatHistoryRef.current.push({ role: 'user', content: raw });
      addMsg('bot', "Something went wrong. Try again.");
      return;
    }

    chatHistoryRef.current.push({ role: 'user', content: raw });

    if (result.action === 'proceed' || result.action === 'skip' || result.action === 'correction') {
      if (result.collected) Object.assign(answersRef.current, result.collected);
      distractionCountRef.current = 0;
      advanceAfterAI(result.reply, result.next ?? q);
    } else {
      handleDistraction(q, result.reply);
    }
  }, [currentQ, addMsg, route.params.goalText, triggerLimit, advanceAfterAI, handleDistraction]);

  const processChoiceAnswer = useCallback((value: string, label: string) => {
    const q = currentQ;
    const snapshotBefore = { ...answersRef.current };
    const userMsgId = addMsg('user', label, q);
    if (userMsgCountRef.current >= USER_MSG_LIMIT) { triggerLimit(); return; }
    setChoices(null);

    let nextQ: QuestionKey | 'done';
    let ack: string;
    switch (q) {
      case 'sex':
        answersRef.current.sex = value as Sex;
        nextQ = 'weight';
        ack = 'Got it.';
        break;
      case 'activityLevel':
        if (value !== 'not_sure') answersRef.current.activityLevel = value as ActivityLevel;
        nextQ = value === 'not_sure' ? 'activityDescription' : 'done';
        ack = value === 'not_sure'
          ? "No worries — describe your day instead."
          : `${ACTIVITY_LABELS[value as ActivityLevel]} — noted.`;
        break;
      default:
        nextQ = 'name';
        ack = 'Got it.';
    }

    answerHistoryRef.current.push({ msgId: userMsgId, questionKey: q, snapshot: snapshotBefore, rawText: '', chatHistoryLen: chatHistoryRef.current.length });
    chatHistoryRef.current.push({ role: 'user', content: label });
    proceed(nextQ, ack);
  }, [currentQ, addMsg, proceed, triggerLimit]);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onLongPressEdit={editCount < 3 ? setSelectedMsgId : undefined}
          />
        ))}
        {isTyping && <TypingDots />}
      </ScrollView>

      {warningMsg !== null && (
        <Animated.View style={[styles.warningToast, { opacity: warningAnim }]}>
          <Ionicons name="warning-outline" size={12} color={colors.gold} />
          <Text style={styles.warningText}>{warningMsg}</Text>
        </Animated.View>
      )}

      <View style={[styles.inputArea, { paddingBottom: insets.bottom + spacing.xs }]}>
        {isDone ? (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={async () => {
              await saveUserProfile({
                ...(answersRef.current as UserPhysicalStats),
                goalText: route.params.goalText,
                activityDescription: rawActivityDescRef.current,
              });
              navigation.navigate('PhotoCapture');
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>CONTINUE</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.inverse} />
          </TouchableOpacity>
        ) : choices ? (
          <View style={styles.choiceList}>
            {choices.map(c => (
              <TouchableOpacity
                key={c.value}
                style={styles.choiceBtn}
                onPress={() => processChoiceAnswer(c.value, c.label)}
                disabled={isTyping}
                activeOpacity={0.75}
              >
                <Text style={styles.choiceBtnLabel}>{c.label}</Text>
                {c.desc && <Text style={styles.choiceBtnDesc}>{c.desc}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.textRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your answer..."
              placeholderTextColor={colors.text.disabled}
              returnKeyType="send"
              onSubmitEditing={() => {
                const t = inputText.trim();
                if (t && !isTyping) processTextAnswer(t);
              }}
              editable={!isTyping}
              autoFocus
              selectionColor={colors.primary}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!inputText.trim() || isTyping) && styles.sendBtnDisabled]}
              onPress={() => {
                const t = inputText.trim();
                if (t && !isTyping) processTextAnswer(t);
              }}
              disabled={!inputText.trim() || isTyping}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={!inputText.trim() || isTyping ? colors.text.disabled : colors.text.inverse}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>
      <Modal
        visible={selectedMsgId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMsgId(null)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setSelectedMsgId(null)}
        >
          <View style={[styles.actionCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.7}
              onPress={() => {
                if (selectedMsgId) rollBackTo(selectedMsgId);
                setSelectedMsgId(null);
              }}
            >
              <Ionicons name="create-outline" size={20} color={colors.text.primary} />
              <Text style={styles.actionBtnText}>Edit message</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },

  // Bubbles
  bubbleRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  bubbleRowLeft: {
    justifyContent: 'flex-start',
  },
  bubbleRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: MAX_BUBBLE_W,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bubbleBot: {
    backgroundColor: colors.bg.card,
    borderBottomLeftRadius: radius.sm,
  },
  bubbleUser: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: radius.sm,
  },
  bubbleText: {
    ...typography.callout,
    color: colors.text.primary,
  },
  bubbleTextUser: {
    color: colors.text.inverse,
  },

  // System messages (flag / ban)
  systemRow: {
    alignItems: 'center',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  flagText: {
    ...typography.footnote,
    color: colors.gold,
    textAlign: 'center',
  },
  banText: {
    ...typography.footnote,
    color: colors.danger,
    textAlign: 'center',
  },

  // Typing dots
  typingBubble: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: colors.bg.card,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.text.muted,
  },

  // Input area
  inputArea: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
    gap: spacing.xs,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  textInput: {
    flex: 1,
    height: spacing.inputHeight,
    ...typography.callout,
    color: colors.text.primary,
    backgroundColor: colors.bg.input,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },

  // Choices
  choiceList: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  choiceBtn: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  choiceBtnLabel: {
    ...typography.callout,
    color: colors.text.primary,
    fontWeight: '500',
  },
  choiceBtnDesc: {
    ...typography.footnote,
    color: colors.text.muted,
    marginTop: 1,
  },

  // Continue
  continueBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  continueBtnText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  actionCard: {
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.md,
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md + 2,
  },
  actionBtnText: {
    ...typography.callout,
    color: colors.text.primary,
  },

  warningToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.gold + '50',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    marginBottom: spacing.xs,
  },
  warningText: {
    ...typography.footnote,
    color: colors.gold,
  },

});
