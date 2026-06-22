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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import {
  extractName, extractAge, extractWeight, extractHeight,
  extractNeck, extractWaist, extractHip,
  isGibberish, estimateActivityLevel,
  type ActivityLevel, type Sex, type UserPhysicalStats, type QuestionKey,
} from '../utils/physicalStatsParser';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'PhysicalStats'>;
};

// ─── Types ────────────────────────────────────────────────────────────────────

type MsgType = 'bot' | 'user' | 'flag' | 'ban';

interface Msg {
  id: string;
  type: MsgType;
  text: string;
}

interface Choice {
  label: string;
  desc?: string;
  value: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SEX_CHOICES: Choice[] = [
  { label: 'Male', value: 'male' },
  { label: 'Female', value: 'female' },
  { label: 'Non-binary', value: 'nonbinary' },
  { label: 'Prefer not to say', value: 'unspecified' },
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

const FLAG_MESSAGES = [
  "That doesn't look like an answer. Try again.",
  "Still not getting it. One more and your IP gets flagged.",
  "That's three. Your IP is now banned.\n\nJust kidding — but come on, answer the question.",
];

function getBotQuestion(q: QuestionKey, name?: string): string {
  switch (q) {
    case 'name': return "Let's start. What's your name?";
    case 'age': return `Nice to meet you, ${name ?? 'there'}! How old are you?`;
    case 'sex': return "What's your sex or gender?";
    case 'weight': return "How much do you weigh?\n(e.g. 75 kg or 165 lbs)";
    case 'height': return "How tall are you?\n(e.g. 5'10\" or 177 cm)";
    case 'activityLevel': return "How active are you on a typical day?";
    case 'activityDescription':
      return "No worries! Just describe a typical day for you — morning to night. I'll figure your activity level from that.";
    case 'neck':
      return "Almost done — do you know your neck circumference? Helps estimate body fat.\n(Type a number or say skip)";
    case 'waist':
      return "What's your waist circumference? Measure around the narrowest point.\n(Type a number or say skip)";
    case 'hip':
      return "And your hip circumference? Measure around the widest point.\n(Type a number or say skip)";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Msg }) {
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

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        msg.type === 'user' ? styles.bubbleRowRight : styles.bubbleRowLeft,
        { opacity: fade, transform: [{ translateY: slide }] },
      ]}
    >
      <View style={[styles.bubble, msg.type === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
        <Text style={[styles.bubbleText, msg.type === 'user' && styles.bubbleTextUser]}>
          {msg.text}
        </Text>
      </View>
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

export function PhysicalStatsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const msgCounter = useRef(0);
  const answersRef = useRef<Partial<UserPhysicalStats>>({});

  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentQ, setCurrentQ] = useState<QuestionKey>('name');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [choices, setChoices] = useState<Choice[] | null>(null);

  const addMsg = useCallback((type: MsgType, text: string) => {
    setMessages(prev => [...prev, { id: String(++msgCounter.current), type, text }]);
  }, []);

  useEffect(() => {
    setTimeout(() => addMsg('bot', getBotQuestion('name')), 350);
  }, []);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages, isTyping]);

  const proceed = useCallback((nextQ: QuestionKey | 'done', ack?: string) => {
    if (ack) {
      setIsTyping(false);
      addMsg('bot', ack);
      setTimeout(() => proceed(nextQ), 650);
      return;
    }

    if (nextQ === 'done') {
      const a = answersRef.current;
      const summary =
        `You're all set, ${a.name}!\n\n` +
        `Name: ${a.name}, ${a.age} years old\n` +
        `Sex: ${a.sex}\n` +
        `Weight: ${a.weightKg} kg  ·  Height: ${a.heightCm} cm\n` +
        `Activity: ${ACTIVITY_LABELS[a.activityLevel!]}\n` +
        (a.neckCm ? `Neck: ${a.neckCm} cm` : 'Neck: not set') + '\n' +
        (a.waistCm ? `Waist: ${a.waistCm} cm` : 'Waist: not set') +
        (a.hipCm ? `\nHip: ${a.hipCm} cm` : '');
      setIsTyping(false);
      addMsg('bot', summary);
      setIsDone(true);
      return;
    }

    setIsTyping(false);
    setCurrentQ(nextQ);
    addMsg('bot', getBotQuestion(nextQ, answersRef.current.name));
    if (nextQ === 'sex') setChoices(SEX_CHOICES);
    else if (nextQ === 'activityLevel') setChoices(ACTIVITY_CHOICES);
    else setChoices(null);
  }, [addMsg]);

  const processTextAnswer = useCallback((raw: string) => {
    const q = currentQ;
    const currentStrikes = strikes;

    setInputText('');
    addMsg('user', raw);
    setIsTyping(true);

    if (isGibberish(raw, q)) {
      const ns = currentStrikes + 1;
      setTimeout(() => {
        setStrikes(ns >= 3 ? 0 : ns);
        setIsTyping(false);
        addMsg(ns >= 3 ? 'ban' : 'flag', FLAG_MESSAGES[Math.min(ns - 1, 2)]);
      }, 500);
      return;
    }

    setTimeout(() => {
      let ack: string | undefined;
      let nextQ: QuestionKey | 'done';
      let ok = false;

      switch (q) {
        case 'name': {
          const v = extractName(raw);
          if (v) { answersRef.current.name = v; nextQ = 'age'; ok = true; }
          else nextQ = 'name';
          break;
        }
        case 'age': {
          const v = extractAge(raw);
          if (v !== null) { answersRef.current.age = v; nextQ = 'sex'; ok = true; }
          else nextQ = 'age';
          break;
        }
        case 'weight': {
          const v = extractWeight(raw);
          if (v) { answersRef.current.weightKg = v.kg; ack = `Noted — ${v.display}.`; nextQ = 'height'; ok = true; }
          else nextQ = 'weight';
          break;
        }
        case 'height': {
          const v = extractHeight(raw);
          if (v) { answersRef.current.heightCm = v.cm; ack = `Got it — ${v.display}.`; nextQ = 'activityLevel'; ok = true; }
          else nextQ = 'height';
          break;
        }
        case 'activityDescription': {
          const level = estimateActivityLevel(raw);
          answersRef.current.activityLevel = level;
          ack = `Based on that, marking you as ${ACTIVITY_LABELS[level]}.`;
          nextQ = 'neck';
          ok = true;
          break;
        }
        case 'neck': {
          const v = extractNeck(raw);
          if (v === 'skip') {
            ack = "No problem.";
            nextQ = 'waist'; ok = true;
          } else if (v !== null) {
            answersRef.current.neckCm = v;
            ack = `Noted — ${v} cm.`;
            nextQ = 'waist'; ok = true;
          } else nextQ = 'neck';
          break;
        }
        case 'waist': {
          const v = extractWaist(raw);
          const sex = answersRef.current.sex;
          const afterWaist: QuestionKey | 'done' =
            (sex === 'female' || sex === 'nonbinary') ? 'hip' : 'done';
          if (v === 'skip') {
            ack = "Okay, skipping.";
            nextQ = afterWaist; ok = true;
          } else if (v !== null) {
            answersRef.current.waistCm = v;
            ack = `Noted — ${v} cm.`;
            nextQ = afterWaist; ok = true;
          } else nextQ = 'waist';
          break;
        }
        case 'hip': {
          const v = extractHip(raw);
          if (v === 'skip') {
            ack = "Got it.";
            nextQ = 'done'; ok = true;
          } else if (v !== null) {
            answersRef.current.hipCm = v;
            ack = `Noted — ${v} cm.`;
            nextQ = 'done'; ok = true;
          } else nextQ = 'hip';
          break;
        }
        default:
          nextQ = q;
      }

      if (!ok) {
        const ns = currentStrikes + 1;
        setStrikes(ns >= 3 ? 0 : ns);
        setIsTyping(false);
        addMsg(ns >= 3 ? 'ban' : 'flag', FLAG_MESSAGES[Math.min(ns - 1, 2)]);
        return;
      }

      setStrikes(0);
      proceed(nextQ, ack);
    }, 500);
  }, [currentQ, strikes, addMsg, proceed]);

  const processChoiceAnswer = useCallback((value: string, label: string) => {
    addMsg('user', label);
    setChoices(null);
    setIsTyping(true);

    setTimeout(() => {
      let nextQ: QuestionKey | 'done';
      switch (currentQ) {
        case 'sex':
          answersRef.current.sex = value as Sex;
          nextQ = 'weight';
          break;
        case 'activityLevel':
          if (value !== 'not_sure') answersRef.current.activityLevel = value as ActivityLevel;
          nextQ = value === 'not_sure' ? 'activityDescription' : 'neck';
          break;
        default:
          nextQ = 'name';
      }
      proceed(nextQ);
    }, 500);
  }, [currentQ, addMsg, proceed]);

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
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {isTyping && <TypingDots />}
      </ScrollView>

      <View style={[styles.inputArea, { paddingBottom: insets.bottom + spacing.xs }]}>
        {isDone ? (
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={() => navigation.navigate('PhotoCapture', { stats: answersRef.current as UserPhysicalStats })}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
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
    maxWidth: '80%',
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
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
});
