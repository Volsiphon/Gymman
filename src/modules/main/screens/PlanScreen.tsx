import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/navigation/navigation/types';
import { useGoals } from '@/contexts/GoalsContext';
import { loadTodayLog }       from '@/services/storage/local/dietLogStorage';
import { getLogForDate, loadWorkoutLogs } from '@/services/storage/local/workoutStorage';
import { loadTodayActivities, loadActivityHistory } from '@/services/storage/local/caloryBurnStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

// ── Streak acknowledgement storage ────────────────────────────────────────────

const ACK_KEY = 'gymman_streak_ack';

type StreakAck = { date: string; flameCount: number; fullStreak: number };

async function loadStreakAck(): Promise<StreakAck> {
  const raw = await AsyncStorage.getItem(ACK_KEY);
  if (!raw) return { date: '', flameCount: 0, fullStreak: 0 };
  try { return JSON.parse(raw) as StreakAck; } catch { return { date: '', flameCount: 0, fullStreak: 0 }; }
}

async function saveStreakAck(ack: StreakAck): Promise<void> {
  await AsyncStorage.setItem(ACK_KEY, JSON.stringify(ack));
}

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'PlanHome'>;
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function dateOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const todayStr = () => dateOffset(0);

// ── Header ────────────────────────────────────────────────────────────────────

function PlanHeader({
  onStreak,
  onSevenDay,
  flamesLit,
}: {
  onStreak:   () => void;
  onSevenDay: () => void;
  flamesLit:  number;
}) {
  return (
    <View style={hd.row}>
      <View style={hd.brand}>
        <Ionicons name="flame" size={20} color={colors.primary} />
        <Text style={hd.appName}>GYMMAN</Text>
      </View>
      <View style={hd.btnRow}>
        <TouchableOpacity style={[hd.pill, flamesLit > 0 && hd.pillLit]} onPress={onStreak}>
          <Ionicons name="flame" size={11} color={flamesLit > 0 ? colors.primary : colors.text.muted} />
          <Text style={[hd.pillText, flamesLit > 0 && hd.pillTextLit]}>
            STREAK
          </Text>
          {flamesLit > 0 && <Text style={hd.flameCount}>{flamesLit}/3</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={hd.pill} onPress={onSevenDay}>
          <Text style={hd.pillText}>7-DAY</Text>
        </TouchableOpacity>
      </View>
      <Text style={hd.greeting}>Hey, Bam</Text>
    </View>
  );
}

const hd = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: 12,
    gap: 10,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  appName: {
    fontFamily: typography.fonts.display,
    fontSize: 20,
    color: colors.text.primary,
    letterSpacing: 1,
  },
  btnRow: { flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  pillLit: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
  },
  pillText: { ...typography.label, color: colors.text.muted },
  pillTextLit: { color: colors.primary },
  flameCount: { ...typography.label, color: colors.primary, fontSize: 10 },
  greeting: { ...typography.subhead, color: colors.text.secondary },
});

// ── Streak flames ─────────────────────────────────────────────────────────────

const STREAK_FLAMES = [
  {
    key:       'diet'     as const,
    label:     'DIET',
    color:     colors.success,
    condition: 'Log at least one meal today in the Diet section.',
    howTo:     'Plan → Diet → log what you ate or ask the AI for a meal plan.',
  },
  {
    key:       'gym'      as const,
    label:     'GYM',
    color:     colors.primary,
    condition: 'Complete a training session today in Training Routine.',
    howTo:     'Plan → Training Routine → start a session and mark it done.',
  },
  {
    key:       'activity' as const,
    label:     'ACTIVITY',
    color:     colors.gold,
    condition: 'Log at least one calorie burn in Calory Burn today.',
    howTo:     'Plan → Calory Burn → describe what you did or add it manually.',
  },
] as const;

interface FlameState {
  diet:     boolean;
  gym:      boolean;
  activity: boolean;
}

function FlameCol({
  color, lit, label, onPress,
}: {
  color:   string;
  lit:     boolean;
  label:   string;
  onPress: () => void;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (lit) {
      opacity.setValue(1);
      anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.13, duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.80, duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 0.96, duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
          ]),
        ]),
      );
      anim.start();
    } else {
      scale.setValue(1);
      opacity.setValue(0.28);
    }
    return () => { anim?.stop(); };
  }, [lit]);

  return (
    <TouchableOpacity style={fl.col} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Ionicons name="flame" size={40} color={lit ? color : colors.text.primary} />
      </Animated.View>
      <Text style={[fl.label, lit && { color }]}>{label}</Text>
      <View style={fl.infoIcon}>
        <Ionicons name="information-circle-outline" size={13} color={lit ? color : colors.text.disabled} />
      </View>
    </TouchableOpacity>
  );
}

const fl = StyleSheet.create({
  col: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 6 },
  label: {
    ...typography.label,
    color: colors.text.disabled,
    fontSize: 10,
    letterSpacing: 1,
  },
  infoIcon: { opacity: 0.7 },
});

// ── StreakModal ───────────────────────────────────────────────────────────────

function StreakModal({
  visible,
  flames,
  fullStreak,
  weekDots,
  onClose,
}: {
  visible:    boolean;
  flames:     FlameState;
  fullStreak: number;
  weekDots:   boolean[];
  onClose:    () => void;
}) {
  const insets = useSafeAreaInsets();

  const handleFlamePress = (f: typeof STREAK_FLAMES[number]) => {
    const status = flames[f.key] ? '✅ Already lit today!' : '🔲 Not lit yet.';
    Alert.alert(
      `${f.label} Flame`,
      `${status}\n\nCondition:\n${f.condition}\n\nHow to complete it:\n${f.howTo}`,
      [{ text: 'Got it' }],
    );
  };

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayDow   = (new Date().getDay() + 6) % 7; // 0=Mon … 6=Sun

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[sm.root, { paddingTop: insets.top }]}>

        {/* handle + close */}
        <View style={sm.handleRow}>
          <View style={sm.handle} />
        </View>
        <View style={sm.headerRow}>
          <View style={sm.titleRow}>
            <Ionicons name="flame" size={17} color={colors.primary} />
            <Text style={sm.title}>DAY STREAK</Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={20} color={colors.text.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[sm.scroll, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* full streak badge */}
          <View style={sm.badgeCard}>
            <View style={sm.badgeLeft}>
              <Text style={sm.badgeNum}>{fullStreak}</Text>
              <Text style={sm.badgeDays}>{fullStreak === 1 ? 'day' : 'days'}</Text>
            </View>
            <View style={sm.badgeRight}>
              <Text style={sm.badgeTitle}>FULL STREAK</Text>
              <Text style={sm.badgeSub}>Consecutive days with all three flames lit</Text>
            </View>
          </View>

          {/* three flames */}
          <View style={sm.flameCard}>
            <Text style={sm.sectionLabel}>TODAY — TAP A FLAME TO SEE ITS CONDITION</Text>
            <View style={sm.flameRow}>
              {STREAK_FLAMES.map((f, i) => (
                <React.Fragment key={f.key}>
                  {i > 0 && <View style={sm.vSep} />}
                  <FlameCol
                    color={f.color}
                    lit={flames[f.key]}
                    label={f.label}
                    onPress={() => handleFlamePress(f)}
                  />
                </React.Fragment>
              ))}
            </View>

            {/* condition summary rows */}
            {STREAK_FLAMES.map(f => (
              <TouchableOpacity
                key={f.key}
                style={sm.condRow}
                onPress={() => handleFlamePress(f)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={flames[f.key] ? 'checkmark-circle' : 'ellipse-outline'}
                  size={16}
                  color={flames[f.key] ? f.color : colors.text.disabled}
                />
                <Text style={[sm.condText, flames[f.key] && { color: f.color }]}>
                  {f.condition}
                </Text>
                <Ionicons name="chevron-forward" size={13} color={colors.text.disabled} />
              </TouchableOpacity>
            ))}
          </View>

          {/* weekly dots */}
          <View style={sm.weekCard}>
            <View style={sm.weekHeader}>
              <Ionicons name="trending-up" size={13} color={colors.primary} />
              <Text style={sm.sectionLabel}>THIS WEEK</Text>
            </View>
            <View style={sm.weekRow}>
              {weekDots.map((complete, i) => {
                const isToday = i === todayDow;
                return (
                  <View key={i} style={sm.dayCol}>
                    <View style={[
                      sm.dot,
                      complete && { backgroundColor: colors.primary },
                      isToday && sm.dotToday,
                    ]} />
                    <Text style={[sm.dayLabel, isToday && sm.dayLabelToday]}>
                      {DAY_LABELS[i]}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={sm.weekLegend}>
              <View style={sm.legendItem}>
                <View style={[sm.legendDot, { backgroundColor: colors.primary }]} />
                <Text style={sm.legendText}>ALL THREE LIT</Text>
              </View>
              <View style={sm.legendItem}>
                <View style={[sm.legendDot, { backgroundColor: colors.bg.elevated }]} />
                <Text style={sm.legendText}>INCOMPLETE</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const sm = StyleSheet.create({
  root:       { flex: 1, backgroundColor: colors.bg.app },
  handleRow:  { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border.subtle },
  headerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.screenPadding, paddingBottom: 12 },
  titleRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title:      { fontFamily: typography.fonts.display, fontSize: 20, color: colors.text.primary, letterSpacing: 0.5 },

  scroll: { padding: spacing.screenPadding, gap: spacing.md },

  // full streak badge
  badgeCard:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.primaryBorder, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badgeLeft:  { alignItems: 'center', paddingVertical: 4, gap: 2 },
  badgeNum:   { fontFamily: typography.fonts.display, fontSize: 52, color: colors.primary, includeFontPadding: false },
  badgeDays:  { ...typography.label, color: colors.primary, letterSpacing: 1 },
  badgeRight: { flex: 1, gap: 4 },
  badgeTitle: { ...typography.label, color: colors.primary },
  badgeSub:   { ...typography.caption, color: colors.text.muted, lineHeight: 16 },

  // flames
  flameCard:  { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, overflow: 'hidden' },
  sectionLabel: { ...typography.label, color: colors.text.muted, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4 },
  flameRow:   { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  vSep:       { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border.subtle },

  // condition rows
  condRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: spacing.md, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border.subtle },
  condText:   { ...typography.footnote, color: colors.text.muted, flex: 1, lineHeight: 18 },

  // weekly dots
  weekCard:   { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, gap: spacing.md },
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  weekRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  dayCol:     { alignItems: 'center', gap: 5, flex: 1 },
  dot:        { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.bg.elevated },
  dotToday:   { borderWidth: 2, borderColor: colors.primaryBorder },
  dayLabel:   { ...typography.caption, color: colors.text.disabled, fontSize: 9 },
  dayLabelToday: { color: colors.primary },
  weekLegend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.text.muted, fontSize: 9 },
});

// ── StreakCelebrationModal ────────────────────────────────────────────────────

type CelebData = {
  flames:         FlameState;
  fullStreak:     number;
  prevFlameCount: number;
  prevFullStreak: number;
};

function StreakCelebrationModal({
  visible,
  data,
  onDismiss,
}: {
  visible:   boolean;
  data:      CelebData | null;
  onDismiss: () => void;
}) {
  if (!data) return null;

  const { flames, fullStreak, prevFlameCount, prevFullStreak } = data;
  const flameCount  = [flames.diet, flames.gym, flames.activity].filter(Boolean).length;
  const streakRose  = fullStreak > prevFullStreak;
  const newFlames   = flameCount > prevFlameCount;
  const allThree    = flameCount === 3;

  const heading = allThree
    ? 'FULL DAY 🔥'
    : streakRose
    ? `DAY ${fullStreak} STREAK`
    : `${flameCount}/3 TODAY`;

  const sub = allThree
    ? 'All three flames burning. Perfect day.'
    : streakRose && newFlames
    ? `Streak extended to ${fullStreak} day${fullStreak !== 1 ? 's' : ''}. Keep it up.`
    : streakRose
    ? `Streak extended to ${fullStreak} day${fullStreak !== 1 ? 's' : ''}.`
    : `${STREAK_FLAMES.filter(f => flames[f.key]).map(f => f.label).join(' + ')} lit. ${3 - flameCount} to go.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={cb.overlay}>
        <View style={cb.card}>
          {/* flames */}
          <View style={cb.flameRow}>
            {STREAK_FLAMES.map((f, i) => (
              <React.Fragment key={f.key}>
                {i > 0 && <View style={cb.vSep} />}
                <FlameCol
                  color={f.color}
                  lit={flames[f.key]}
                  label={f.label}
                  onPress={onDismiss}
                />
              </React.Fragment>
            ))}
          </View>

          {/* message */}
          <View style={cb.msgBlock}>
            <Text style={cb.heading}>{heading}</Text>
            <Text style={cb.sub}>{sub}</Text>
          </View>

          {/* dismiss */}
          <TouchableOpacity style={cb.btn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={cb.btnText}>Nice!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const cb = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    width: '100%',
    overflow: 'hidden',
  },
  flameRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  vSep: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border.subtle },
  msgBlock: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  heading: {
    fontFamily: typography.fonts.display,
    fontSize: 26,
    color: colors.text.primary,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  sub: {
    ...typography.callout,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  btn: {
    margin: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    height: spacing.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    ...typography.subhead,
    color: colors.text.inverse,
    fontWeight: '700',
  },
});

// ── Today's Targets card ──────────────────────────────────────────────────────

interface Targets {
  calories:   number;
  goalWeight: number;
  protein:    number;
  carbs:      number;
  fats:       number;
}

function TodayTargets({ targets }: { targets: Targets }) {
  const macros = [
    { label: 'PROTEIN', value: targets.protein },
    { label: 'CARBS',   value: targets.carbs },
    { label: 'FATS',    value: targets.fats },
  ];
  const hasGoalWeight = targets.goalWeight > 0;
  return (
    <View style={tt.card}>
      <Text style={tt.heading}>TODAY'S TARGETS</Text>
      <View style={tt.topRow}>
        <View style={tt.statBlock}>
          <Text style={tt.statLabel}>CALORIES</Text>
          <View style={tt.statValueRow}>
            <Text style={[tt.statNum, { color: colors.primary }]}>{targets.calories}</Text>
            <Text style={tt.unit}>kcal</Text>
          </View>
        </View>
        <View style={tt.vDivider} />
        <View style={tt.statBlock}>
          <Text style={tt.statLabel}>GOAL WEIGHT</Text>
          <View style={tt.statValueRow}>
            {hasGoalWeight ? (
              <>
                <Text style={[tt.statNum, { color: colors.danger }]}>{targets.goalWeight}</Text>
                <Text style={tt.unit}>kg</Text>
              </>
            ) : (
              <Text style={[tt.statNum, { color: colors.text.disabled, fontSize: 36 }]}>--</Text>
            )}
          </View>
        </View>
      </View>
      <View style={tt.macroRow}>
        {macros.map((m, i) => (
          <View key={m.label} style={[tt.macroBox, i > 0 && { marginLeft: 8 }]}>
            <Text style={tt.macroVal}>
              {m.value}<Text style={tt.macroG}>g</Text>
            </Text>
            <Text style={tt.macroLabel}>{m.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const tt = StyleSheet.create({
  card:        { backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, padding: spacing.md, gap: spacing.md },
  heading:     { ...typography.label, color: colors.text.muted },
  topRow:      { flexDirection: 'row', alignItems: 'center' },
  statBlock:   { flex: 1, gap: 2 },
  statLabel:   { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValueRow:{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  statNum:     { fontFamily: typography.fonts.display, fontSize: 48, lineHeight: 62 },
  unit:        { ...typography.subhead, color: colors.text.muted, marginBottom: 6 },
  vDivider:    { width: 1, height: 62, backgroundColor: colors.border.default, marginHorizontal: spacing.md },
  macroRow:    { flexDirection: 'row' },
  macroBox:    { flex: 1, backgroundColor: colors.bg.elevated, borderRadius: radius.md, paddingVertical: 14, alignItems: 'center', gap: 4 },
  macroVal:    { fontFamily: typography.fonts.bold, fontSize: 20, fontWeight: '700', color: colors.text.primary },
  macroG:      { fontFamily: typography.fonts.regular, fontSize: 15, fontWeight: '400', color: colors.text.muted },
  macroLabel:  { ...typography.caption, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
});

// ── Section card ──────────────────────────────────────────────────────────────

interface SectionProps {
  title:       string;
  subtitle:    string;
  done:        boolean;
  accentColor: string;
  onPress:     () => void;
}

function SectionCard({ title, subtitle, done, accentColor, onPress }: SectionProps) {
  return (
    <TouchableOpacity style={cd.card} onPress={onPress} activeOpacity={0.8}>
      <View style={cd.textBlock}>
        <Text style={cd.title}>{title}</Text>
        <Text style={cd.sub}>{subtitle}</Text>
      </View>
      <View style={cd.right}>
        {done && <View style={[cd.doneDot, { backgroundColor: accentColor }]} />}
        <Ionicons name="chevron-forward" size={20} color={colors.text.muted} />
      </View>
    </TouchableOpacity>
  );
}

const cd = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bg.card, borderRadius: radius.card, borderWidth: 1, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: spacing.md + 2, gap: spacing.sm },
  textBlock: { flex: 1, gap: 5 },
  title:     { fontFamily: typography.fonts.display, fontSize: 17, color: colors.text.primary, letterSpacing: 0.3 },
  sub:       { ...typography.footnote, color: colors.text.muted },
  right:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doneDot:   { width: 8, height: 8, borderRadius: 4 },
});

// ── Screen ────────────────────────────────────────────────────────────────────

export function PlanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { goals } = useGoals();

  const [flames,      setFlames]      = useState<FlameState>({ diet: false, gym: false, activity: false });
  const [fullStreak,  setFullStreak]  = useState(0);
  const [weekDots,    setWeekDots]    = useState<boolean[]>(Array(7).fill(false));
  const [showStreak,  setShowStreak]  = useState(false);
  const [celebData,   setCelebData]   = useState<CelebData | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const today = todayStr();

        // ── Today's flames ───────────────────────────────────────────────────
        const [dietItems, gymLog, actItems] = await Promise.all([
          loadTodayLog(),
          getLogForDate(today),
          loadTodayActivities(),
        ]);

        const newFlames: FlameState = {
          diet:     dietItems.length > 0,
          gym:      gymLog !== null,
          activity: actItems.length > 0,
        };
        setFlames(newFlames);

        // ── Weekly dots (Mon–Sun, gym or activity logged) ────────────────────
        const [workoutLogs, actHistory] = await Promise.all([
          loadWorkoutLogs(),
          loadActivityHistory(7),
        ]);
        const gymDates = new Set(workoutLogs.map(l => l.date));
        const actDates = new Set(actHistory.map(h => h.date));

        const dots = Array.from({ length: 7 }, (_, i) => {
          // i=0 → Monday of this week ... i=6 → Sunday
          const d    = new Date();
          const dow  = (d.getDay() + 6) % 7; // 0=Mon
          d.setDate(d.getDate() - dow + i);
          const key  = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          // future days never complete
          if (key > today) return false;
          return gymDates.has(key) || actDates.has(key);
        });
        setWeekDots(dots);

        // ── Full streak (consecutive days with gym or activity, going back) ──
        let streak = 0;
        let offset = 0;
        while (streak < 365) {
          const key = dateOffset(offset);
          if (gymDates.has(key) || actDates.has(key)) {
            streak++;
            offset++;
          } else {
            break;
          }
        }
        setFullStreak(streak);

        // ── Celebration check ─────────────────────────────────────────────────
        const ack              = await loadStreakAck();
        const currentFlameCt   = [newFlames.diet, newFlames.gym, newFlames.activity].filter(Boolean).length;
        const ackedFlameCt     = ack.date === today ? ack.flameCount : 0;

        if (currentFlameCt > ackedFlameCt || streak > ack.fullStreak) {
          setCelebData({
            flames:         newFlames,
            fullStreak:     streak,
            prevFlameCount: ackedFlameCt,
            prevFullStreak: ack.fullStreak,
          });
        }
      }

      load();
    }, []),
  );

  const handleCelebDismiss = useCallback(async () => {
    const today     = todayStr();
    const flameCt   = [flames.diet, flames.gym, flames.activity].filter(Boolean).length;
    await saveStreakAck({ date: today, flameCount: flameCt, fullStreak });
    setCelebData(null);
  }, [flames, fullStreak]);

  const flamesLit = [flames.diet, flames.gym, flames.activity].filter(Boolean).length;

  const sections: SectionProps[] = [
    {
      title:       'DIET',
      subtitle:    'Log intake, or get an AI meal plan from your local cuisine.',
      done:        flames.diet,
      accentColor: colors.success,
      onPress:     () => navigation.navigate('Diet'),
    },
    {
      title:       'TRAINING ROUTINE',
      subtitle:    'Plan your week, or grab a free routine.',
      done:        flames.gym,
      accentColor: colors.primary,
      onPress:     () => navigation.navigate('Training'),
    },
    {
      title:       'CALORY BURN',
      subtitle:    'Track active calories beyond your TDEE.',
      done:        flames.activity,
      accentColor: colors.gold,
      onPress:     () => navigation.navigate('CaloryBurn'),
    },
  ];

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StreakCelebrationModal
        visible={celebData !== null}
        data={celebData}
        onDismiss={handleCelebDismiss}
      />
      <StreakModal
        visible={showStreak}
        flames={flames}
        fullStreak={fullStreak}
        weekDots={weekDots}
        onClose={() => setShowStreak(false)}
      />

      <PlanHeader
        onStreak={() => setShowStreak(true)}
        onSevenDay={() => navigation.navigate('SevenDay')}
        flamesLit={flamesLit}
      />

      <View style={s.scroll}>
        <TodayTargets targets={{
          calories:   goals.calories,
          protein:    goals.protein,
          carbs:      goals.carbs,
          fats:       goals.fats,
          goalWeight: goals.goalWeightKg ?? 0,
        }} />

        {sections.map((sec) => (
          <SectionCard key={sec.title} {...sec} />
        ))}

        <TouchableOpacity
          style={s.bloodworkBtn}
          onPress={() => navigation.navigate('Bloodwork')}
          activeOpacity={0.8}
        >
          <Ionicons name="medical-outline" size={15} color={colors.white} />
          <Text style={s.bloodworkText}>BLOODWORK</Text>
          <Ionicons name="chevron-forward" size={15} color={colors.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg.app },
  scroll: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.xs, gap: spacing.sm + 4 },
  bloodworkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    gap: spacing.sm,
  },
  bloodworkText: {
    fontFamily: typography.fonts.display,
    fontSize: 14,
    color: colors.white,
    letterSpacing: 0.5,
    flex: 1,
  },
});
