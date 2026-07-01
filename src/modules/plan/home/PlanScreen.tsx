/**
 * modules/plan/home/PlanScreen.tsx
 *
 * The hub screen of the Plan tab. Shows the three streak flames (Diet, Gym, Activity),
 * today's calorie and macro targets, the three section cards (Diet / Training /
 * Calory Burn), and a Bloodwork button. On every screen focus it loads the latest
 * data from storage and decides whether to auto-show the streak celebration modal
 * (only fires once per new streak milestone, not on every tab visit).
 *
 * All sub-components live in modules/plan/home/components/ — this file is purely
 * the orchestration layer that owns state and wires props together.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlanStackParamList } from '@/app/navigation/types';
import { useGoals } from '@/contexts/GoalsContext';
import { loadTodayLog } from '@/services/storage/local/dietLogStorage';
import { getLogForDate, loadWorkoutLogs } from '@/services/storage/local/workoutStorage';
import { loadTodayActivities, loadActivityHistory } from '@/services/storage/local/caloryBurnStorage';
import { loadRoutines } from '@/services/storage/local/planStorage';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { PlanHeader } from './components/PlanHeader';
import type { FlameState } from './components/FlameCol';
import { StreakModal } from './components/StreakModal';
import { StreakCelebrationModal } from './components/StreakCelebrationModal';
import { AccountModal } from './components/AccountModal';
import type { UserProfile } from '@/types/user';
import type { CelebData } from './components/StreakCelebrationModal';
import { TargetsCarousel } from './components/TargetsCarousel';
import type { BodyCompData } from './components/BodyCompositionCard';
import { SectionCard } from './components/SectionCard';
import type { SectionProps } from './components/SectionCard';
import { BloodworkButton } from './components/BloodworkButton';

// ── Streak acknowledgement ─────────────────────────────────────────────────────
// Tracks which flames were lit the last time the user dismissed the celebration
// modal, so we only re-show it when something actually improves.

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

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── Date helpers ───────────────────────────────────────────────────────────────

function dateOffset(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const todayStr = () => dateOffset(0);

// ── Screen ─────────────────────────────────────────────────────────────────────

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'PlanHome'>;
};

export function PlanScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { goals } = useGoals();

  const [flames,          setFlames]          = useState<FlameState>({ diet: false, gym: false, activity: false });
  const [fullStreak,      setFullStreak]      = useState(0);
  const [weekDots,        setWeekDots]        = useState<boolean[]>(Array(7).fill(false));
  const [showStreak,      setShowStreak]      = useState(false);
  const [showAccount,     setShowAccount]     = useState(false);
  const [celebData,       setCelebData]       = useState<CelebData | null>(null);
  const [trainingFocus,   setTrainingFocus]   = useState<string | null>(null);
  const [trainingDay,     setTrainingDay]     = useState<string | null>(null);
  const [bodyComp,        setBodyComp]        = useState<BodyCompData | null>(null);
  const [profile,         setProfile]         = useState<UserProfile | null>(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const today = todayStr();

        // ── Today's flames ────────────────────────────────────────────────────
        const [dietItems, gymLog, actItems, routines, profile] = await Promise.all([
          loadTodayLog(),
          getLogForDate(today),
          loadTodayActivities(),
          loadRoutines(),
          loadUserProfile(),
        ]);

        if (profile) {
          setProfile(profile);
          setBodyComp({
            currentWeight: profile.weightKg,
            currentBF:     profile.bfPercent    ?? null,
            targetWeight:  profile.targetWeightKg  ?? null,
            targetBF:      profile.targetBFPercent ?? null,
          });
        }

        // ── Today's training day (mirrors TodayWorkoutView logic) ─────────────
        const todayName = DAY_NAMES[new Date().getDay()];
        const routine   = routines[routines.length - 1];
        const routineDay = routine?.days?.find(d => d.day === todayName) ?? null;
        if (!routine) {
          setTrainingFocus(null);
          setTrainingDay(null);
        } else if (!routineDay || routineDay.isRest) {
          setTrainingFocus(null);
          setTrainingDay('Rest Day');
        } else {
          setTrainingFocus(routineDay.focus);
          setTrainingDay(todayName);
        }

        const newFlames: FlameState = {
          diet:     dietItems.length > 0,
          gym:      gymLog !== null,
          activity: actItems.length > 0,
        };
        setFlames(newFlames);

        // ── Weekly dots (Mon–Sun: dot is filled if gym OR activity logged) ────
        const [workoutLogs, actHistory] = await Promise.all([
          loadWorkoutLogs(),
          loadActivityHistory(7),
        ]);
        const gymDates = new Set(workoutLogs.map(l => l.date));
        const actDates = new Set(actHistory.map(h => h.date));

        const dots = Array.from({ length: 7 }, (_, i) => {
          const d   = new Date();
          const dow = (d.getDay() + 6) % 7; // 0=Mon … 6=Sun
          d.setDate(d.getDate() - dow + i);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (key > today) return false; // future days never complete
          return gymDates.has(key) || actDates.has(key);
        });
        setWeekDots(dots);

        // ── Full streak (consecutive days going back from today) ──────────────
        let streak = 0;
        let offset = 0;
        while (streak < 365) {
          const key = dateOffset(offset);
          if (gymDates.has(key) || actDates.has(key)) { streak++; offset++; }
          else break;
        }
        setFullStreak(streak);

        // ── Celebration modal: show only when flames or streak improved ────────
        const ack            = await loadStreakAck();
        const currentFlameCt = [newFlames.diet, newFlames.gym, newFlames.activity].filter(Boolean).length;
        const ackedFlameCt   = ack.date === today ? ack.flameCount : 0;

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
    const today   = todayStr();
    const flameCt = [flames.diet, flames.gym, flames.activity].filter(Boolean).length;
    await saveStreakAck({ date: today, flameCount: flameCt, fullStreak });
    setCelebData(null);
  }, [flames, fullStreak]);

  const flamesLit = [flames.diet, flames.gym, flames.activity].filter(Boolean).length;

  const sections: SectionProps[] = [
    {
      title:       'DIET',
      subtitle:    'Log intake, or get an AI meal plan.',
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

      <AccountModal
        visible={showAccount}
        onClose={() => setShowAccount(false)}
        profile={profile}
        goals={goals}
        fullStreak={fullStreak}
        weekDots={weekDots}
        flames={flames}
      />
      <PlanHeader
        onStreak={() => setShowStreak(true)}
        onSevenDay={() => navigation.navigate('SevenDay')}
        onAccount={() => setShowAccount(true)}
        flamesLit={flamesLit}
      />

      <View style={s.content}>
        <TargetsCarousel
          targets={{
            calories:      goals.calories,
            protein:       goals.protein,
            carbs:         goals.carbs,
            fats:          goals.fats,
            trainingFocus,
            trainingDay,
          }}
          bodyComp={bodyComp}
        />

        {sections.map((sec) => (
          <SectionCard key={sec.title} {...sec} />
        ))}

        <BloodworkButton onPress={() => navigation.navigate('Bloodwork')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.bg.app },
  content: { paddingHorizontal: spacing.screenPadding, paddingTop: spacing.xs, gap: spacing.sm + 4, paddingBottom: spacing.lg },
});
