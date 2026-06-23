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
import { onboardingReply } from '@/services/ai/onboardingCoach';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'PhysicalStats'>;
  route: RouteProp<OnboardingStackParamList, 'PhysicalStats'>;
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

const FLAG_MESSAGES = [
  "That doesn't look like an answer. Try again.",
  "Still not getting it. One more and your IP gets flagged.",
  "That's three. Your IP is now banned.\n\nJust kidding — but come on, answer the question.",
];

const PREAMBLE =
  "Got it — that's a clear goal to work with. Now give us the basic data about your current physique to help us identify how realistic your goal is. Everyone has different genetics, basic build, and different bodies. We'll use this information to build a practical plan to actually get you to your goal. If your goal is impractical for your body situation, we will also tell you that straightforwardly.\n\nNothing complicated yet, just the basics.";

const ACTIVITY_TRANSITION =
  "Got it — that's everything I need to gauge where you're starting from. Once your plan is ready, I'll explain it in plain terms first: like how much weight you'd need to lose or gain to get the look you described, or about how long that realistically takes. We'll skip the jargon for now — no calories or macros yet, just the simple version. A few more quick questions first so I can tailor it to your life. :";

function getBotQuestion(q: QuestionKey, name?: string): string {
  switch (q) {
    case 'name': return "Hey — I'm Gymman. First things first, what should I call you?";
    case 'age': return `Nice to meet you, ${name ?? 'there'}! How old are you?`;
    case 'sex': return "What's your sex or gender?";
    case 'weight': return "How much do you weigh?\n(e.g. 75 kg or 165 lbs)";
    case 'height': return "How tall are you?\n(e.g. 5'10\" or 177 cm)";
    case 'neck': return "Do you know your neck circumference? Helps estimate body fat.\n(Number in cm/inches, or type 'skip')";
    case 'waist': return "And your waist? Measure at the narrowest point.\n(Number in cm/inches, or type 'skip')";
    case 'hip': return "And your hips? Measure at the widest point.\n(Number in cm/inches, or type 'skip')";
    case 'country': return "Which country or region are you in? This helps me suggest food that's actually available to you.";
    case 'dietary': return "Any dietary preferences? Vegetarian, vegan, halal, kosher, pescatarian, lactose-free, gluten-free — or just say 'no restrictions'. You can list more than one.";
    case 'activityLevel': return "How active are you on a typical day?";
    case 'activityDescription':
      return "No worries! Just describe a typical day for you — morning to night. I'll figure your activity level from that.";
  }
}

const CORRECTION_RE = /\b(actually|oops|wait|change|update|fix|wrong|meant|correction|make it|no wait|scratch)\b/i;

interface FieldCorrection {
  apply: (a: Partial<UserPhysicalStats>) => void;
  summary: string;
}

function detectFieldCorrection(
  raw: string,
  currentQ: QuestionKey,
  collected: Partial<UserPhysicalStats>,
): FieldCorrection | null {
  if (!CORRECTION_RE.test(raw)) return null;
  if (currentQ !== 'weight' && collected.weightKg !== undefined) {
    const v = extractWeight(raw);
    if (v) return { apply: a => { a.weightKg = v.kg; }, summary: `weight changed to ${v.display}` };
  }
  if (currentQ !== 'height' && collected.heightCm !== undefined) {
    const v = extractHeight(raw);
    if (v) return { apply: a => { a.heightCm = v.cm; }, summary: `height changed to ${v.display}` };
  }
  if (currentQ !== 'age' && collected.age !== undefined) {
    const v = extractAge(raw);
    if (v !== null) return { apply: a => { a.age = v; }, summary: `age changed to ${v}` };
  }
  if (currentQ !== 'country' && collected.country !== undefined && /\b(country|region|from|based)\b/i.test(raw)) {
    const cleaned = raw.replace(CORRECTION_RE, '').replace(/\b(my|country|region|from|based|in|is|am|i|to|the)\b/gi, '').trim();
    if (cleaned.length >= 2) return { apply: a => { a.country = cleaned; }, summary: `country changed to ${cleaned}` };
  }
  if (currentQ !== 'dietary' && collected.dietary !== undefined && /\b(diet|dietary|eat|vegan|vegetarian|halal|kosher|restriction|pescatarian|gluten)\b/i.test(raw)) {
    const cleaned = raw.replace(CORRECTION_RE, '').trim();
    if (cleaned.length >= 2) return { apply: a => { a.dietary = cleaned; }, summary: `dietary updated` };
  }
  return null;
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

export function PhysicalStatsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const msgCounter = useRef(0);
  const answersRef = useRef<Partial<UserPhysicalStats>>({});
  const userMsgCountRef = useRef(0);
  const restartCountRef = useRef(0);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [currentQ, setCurrentQ] = useState<QuestionKey>('name');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [strikes, setStrikes] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [choices, setChoices] = useState<Choice[] | null>(null);

  const addMsg = useCallback((type: MsgType, text: string, questionKey?: QuestionKey): string => {
    const id = String(++msgCounter.current);
    if (type === 'user') userMsgCountRef.current++;
    setMessages(prev => [...prev, { id, type, text, questionKey }]);
    return id;
  }, []);

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
    setEditCount(0);
    setMessages([]);
    setCurrentQ('name');
    setStrikes(0);
    setIsDone(false);
    setChoices(null);
    setInputText('');
    setSelectedMsgId(null);
    setTimeout(() => addMsg('bot', PREAMBLE), 350);
    setTimeout(() => setIsTyping(true), 900);
    setTimeout(() => { setIsTyping(false); addMsg('bot', getBotQuestion('name')); }, 1800);
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
    setTimeout(() => addMsg('bot', PREAMBLE), 350);
    setTimeout(() => setIsTyping(true), 900);
    setTimeout(() => {
      setIsTyping(false);
      addMsg('bot', getBotQuestion('name'));
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
      setTimeout(() => proceed(nextQ), 650);
      return;
    }

    if (nextQ === 'done') {
      const a = answersRef.current;
      const bodyLines = [
        a.neckCm ? `Neck: ${a.neckCm} cm` : null,
        a.waistCm ? `Waist: ${a.waistCm} cm` : null,
        a.hipCm ? `Hips: ${a.hipCm} cm` : null,
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
    addMsg('bot', getBotQuestion(nextQ, answersRef.current.name));
    if (nextQ === 'sex') setChoices(SEX_CHOICES);
    else if (nextQ === 'activityLevel') setChoices(ACTIVITY_CHOICES);
    else setChoices(null);
  }, [addMsg]);

  const advanceAfterAI = useCallback((aiText: string, nextQ: QuestionKey | 'done') => {
    setIsTyping(false);
    addMsg('bot', aiText);
    if (nextQ === 'done') { setIsDone(true); return; }
    setCurrentQ(nextQ);
    if (nextQ === 'sex') setChoices(SEX_CHOICES);
    else if (nextQ === 'activityLevel') setChoices(ACTIVITY_CHOICES);
    else setChoices(null);
  }, [addMsg]);

  const processTextAnswer = useCallback((raw: string) => {
    const q = currentQ;
    const currentStrikes = strikes;

    setInputText('');

    // ── Inline field correction ───────────────────────────────────────────────
    if (editCountRef.current < 3) {
      const correction = detectFieldCorrection(raw, q, answersRef.current);
      if (correction) {
        addMsg('user', raw);
        setIsTyping(true);
        correction.apply(answersRef.current);
        editCountRef.current++;
        setEditCount(editCountRef.current);
        const remaining = 3 - editCountRef.current;
        showWarning(
          remaining === 0 ? 'No more edits allowed.'
          : remaining === 1 ? '1 edit remaining.'
          : `${remaining} edits remaining.`
        );
        onboardingReply({
          goalText: route.params.goalText,
          collected: { ...answersRef.current },
          justAnswered: q,
          userRaw: raw,
          nextQ: q,
          correction: correction.summary,
        })
          .then(aiText => {
            setIsTyping(false);
            addMsg('bot', aiText);
            if (q === 'sex') setChoices(SEX_CHOICES);
            else if (q === 'activityLevel') setChoices(ACTIVITY_CHOICES);
          })
          .catch(() => {
            setIsTyping(false);
            addMsg('bot', `Got it — ${correction.summary}.`);
            if (q === 'sex') setChoices(SEX_CHOICES);
            else if (q === 'activityLevel') setChoices(ACTIVITY_CHOICES);
          });
        return;
      }
    }

    // ── Normal answer processing ──────────────────────────────────────────────
    const snapshotBefore = { ...answersRef.current };
    const userMsgId = addMsg('user', raw, q);
    if (userMsgCountRef.current >= USER_MSG_LIMIT) { triggerLimit(); return; }
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

    let ack: string | undefined;
    let nextQ: QuestionKey | 'done' = q;
    let ok = false;

    switch (q) {
      case 'name': {
        const v = extractName(raw);
        if (v) { answersRef.current.name = v; nextQ = 'age'; ok = true; }
        break;
      }
      case 'age': {
        const v = extractAge(raw);
        if (v !== null) { answersRef.current.age = v; nextQ = 'sex'; ok = true; }
        break;
      }
      case 'weight': {
        const v = extractWeight(raw);
        if (v) { answersRef.current.weightKg = v.kg; ack = `Noted — ${v.display}.`; nextQ = 'height'; ok = true; }
        break;
      }
      case 'height': {
        const v = extractHeight(raw);
        if (v) { answersRef.current.heightCm = v.cm; ack = `Got it — ${v.display}.`; nextQ = 'neck'; ok = true; }
        break;
      }
      case 'neck': {
        const v = extractNeck(raw);
        if (v === 'skip') { nextQ = 'waist'; ok = true; }
        else if (v !== null) { answersRef.current.neckCm = v; ack = `Noted — ${v} cm.`; nextQ = 'waist'; ok = true; }
        break;
      }
      case 'waist': {
        const v = extractWaist(raw);
        const sex = answersRef.current.sex;
        const afterWaist: QuestionKey = (sex === 'female' || sex === 'other') ? 'hip' : 'country';
        if (v === 'skip') { nextQ = afterWaist; ok = true; }
        else if (v !== null) { answersRef.current.waistCm = v; ack = `Noted — ${v} cm.`; nextQ = afterWaist; ok = true; }
        break;
      }
      case 'hip': {
        const v = extractHip(raw);
        if (v === 'skip') { nextQ = 'country'; ok = true; }
        else if (v !== null) { answersRef.current.hipCm = v; ack = `Noted — ${v} cm.`; nextQ = 'country'; ok = true; }
        break;
      }
      case 'country': {
        answersRef.current.country = raw.trim();
        nextQ = 'dietary'; ok = true;
        break;
      }
      case 'dietary': {
        answersRef.current.dietary = raw.trim();
        ack = ACTIVITY_TRANSITION;
        nextQ = 'activityLevel'; ok = true;
        break;
      }
      case 'activityDescription': {
        const level = estimateActivityLevel(raw);
        answersRef.current.activityLevel = level;
        ack = `Based on that, marking you as ${ACTIVITY_LABELS[level]}.`;
        nextQ = 'done'; ok = true;
        break;
      }
    }

    if (!ok) {
      setTimeout(() => {
        const ns = currentStrikes + 1;
        setStrikes(ns >= 3 ? 0 : ns);
        setIsTyping(false);
        addMsg(ns >= 3 ? 'ban' : 'flag', FLAG_MESSAGES[Math.min(ns - 1, 2)]);
      }, 500);
      return;
    }

    setStrikes(0);
    answerHistoryRef.current.push({ msgId: userMsgId, questionKey: q, snapshot: snapshotBefore, rawText: raw });
    onboardingReply({
      goalText: route.params.goalText,
      collected: { ...answersRef.current },
      justAnswered: q,
      userRaw: raw,
      nextQ,
    })
      .then(aiText => advanceAfterAI(aiText, nextQ))
      .catch(() => proceed(nextQ, ack));
  }, [currentQ, strikes, addMsg, proceed, advanceAfterAI, route.params.goalText, showWarning, triggerLimit]);

  const processChoiceAnswer = useCallback((value: string, label: string) => {
    const q = currentQ;
    const snapshotBefore = { ...answersRef.current };
    const userMsgId = addMsg('user', label, q);
    if (userMsgCountRef.current >= USER_MSG_LIMIT) { triggerLimit(); return; }
    setChoices(null);
    setIsTyping(true);

    let nextQ: QuestionKey | 'done';
    switch (q) {
      case 'sex':
        answersRef.current.sex = value as Sex;
        nextQ = 'weight';
        break;
      case 'activityLevel':
        if (value !== 'not_sure') answersRef.current.activityLevel = value as ActivityLevel;
        nextQ = value === 'not_sure' ? 'activityDescription' : 'done';
        break;
      default:
        nextQ = 'name';
    }

    answerHistoryRef.current.push({ msgId: userMsgId, questionKey: q, snapshot: snapshotBefore, rawText: '' });
    onboardingReply({
      goalText: route.params.goalText,
      collected: { ...answersRef.current },
      justAnswered: q,
      userRaw: label,
      nextQ,
    })
      .then(aiText => advanceAfterAI(aiText, nextQ))
      .catch(() => proceed(nextQ));
  }, [currentQ, addMsg, proceed, advanceAfterAI, route.params.goalText, triggerLimit]);

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
            onPress={() => navigation.navigate('PhotoCapture', { stats: answersRef.current as UserPhysicalStats, goalText: route.params.goalText })}
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
    ...typography.bodyMedium,
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
    marginHorizontal: spacing.screenPadding,
  },
  warningText: {
    ...typography.footnote,
    color: colors.gold,
  },
});
