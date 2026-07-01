/**
 * modules/plan/calory-burn/CaloryBurnScreen.tsx
 *
 * The Calory Burn Plan sub-screen. Owns today's activity list and the Dynamic
 * Mode flag (persisted via caloryBurnStorage), and switches between TodayTab
 * and HistoryTab. Activities can be added by hand (ManualAddModal) or by
 * describing them in plain words — an inline AI parser estimates the calories.
 * When Dynamic Mode is on, every change calls GoalsContext.refresh() so the
 * diet calorie target updates live across the app.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
} from '@/services/storage/local/caloryBurnStorage';
import type { ActivityEntry, DayActivities } from '@/types/plan';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { aiChat } from '@/services/ai/client';
import { useGoals } from '@/contexts/GoalsContext';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { TodayTab } from './components/TodayTab';
import { HistoryTab } from './components/HistoryTab';
import { ManualAddModal } from './components/ManualAddModal';

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
  const reply = await aiChat([
    { role: 'system', content: AI_SYSTEM },
    { role: 'user', content: text },
  ]);
  const match = reply.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try { return JSON.parse(match[0]); } catch { return []; }
}

function uid() { return Math.random().toString(36).slice(2, 9); }

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
