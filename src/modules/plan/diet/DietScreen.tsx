/**
 * modules/plan/diet/DietScreen.tsx
 *
 * The Diet Plan sub-screen — the most used screen in the app. Owns today's
 * food log state (loaded from and persisted to dietLogStorage) and switches
 * between three tabs: TodayTab (macro summary + log list), DietCoachTab
 * (AI nutrition coach that edits the log via [DIET:] actions), and HistoryTab
 * (past days' summaries). The daily calorie/macro targets come from
 * GoalsContext so Dynamic Mode adjustments show up live.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import { CollapsibleTabBar } from '@/shared/components/CollapsibleTabBar';
import type { LogItem, DietAction, MealEntry } from '@/services/ai/nutritionCoach';
import { useSubscription } from '@/app/providers/SubscriptionProvider';
import { loadTodayLog, saveTodayLog } from '@/services/storage/local/dietLogStorage';
import { useGoals } from '@/contexts/GoalsContext';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { TodayTab } from './components/TodayTab';
import { DietCoachTab } from './components/DietCoachTab';
import { HistoryTab } from './components/HistoryTab';
import { ManualLogModal } from './components/ManualLogModal';
import { uid, applyDietActions } from './utils';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Diet'>;
};

const ACCENT = colors.success;

const TABS = [
  { id: 'today',   icon: 'today-outline',               label: 'Today'   },
  { id: 'coach',   icon: 'chatbubble-ellipses-outline',  label: 'Coach'   },
  { id: 'history', icon: 'time-outline',                 label: 'History' },
] as const;

type TabId = typeof TABS[number]['id'];

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
