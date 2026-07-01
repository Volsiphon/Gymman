/**
 * modules/plan/training/TrainingScreen.tsx
 *
 * The Training Plan sub-screen — the orchestrator for the full workout feature.
 * Renders four tab views (controlled by CollapsibleTabBar): TrainerIntroView
 * (where the AI builds the routine via chat), RoutineDisplay (the saved weekly
 * routine as DayCards), TodayWorkoutView (where the user logs today's sets and
 * reps), and HistoryView (past workout sessions). Loads routines from
 * planStorage on tab focus and passes them down as props.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PlanStackParamList } from '@/app/navigation/types';
import { TrainerIntroView } from './components/TrainerIntroView';
import { RoutineDisplay } from './components/RoutineDisplay';
import { TodayWorkoutView } from './components/TodayWorkoutView';
import { HistoryView } from './components/HistoryView';
import { CollapsibleTabBar } from '@/shared/components/CollapsibleTabBar';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { loadRoutines, deleteRoutine } from '@/services/storage/local/planStorage';
import type { Routine } from '@/types/plan';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<PlanStackParamList, 'Training'>;
};

const ACCENT = colors.primary;

const TABS = [
  { id: 'trainer',  icon: 'fitness-outline',  label: 'Trainer'  },
  { id: 'routine',  icon: 'list-outline',      label: 'Routine'  },
  { id: 'today',    icon: 'pencil-outline',    label: 'Today'    },
  { id: 'history',  icon: 'time-outline',      label: 'History'  },
] as const;

type TabId = typeof TABS[number]['id'];

export function TrainingScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [active, setActive] = useState<TabId>('trainer');
  const [userName, setUserName] = useState('');
  const [nameLoaded, setNameLoaded] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    loadUserProfile().then(p => { setUserName(p?.name ?? ''); setNameLoaded(true); });
  }, []);

  const refreshRoutines = useCallback(() => {
    loadRoutines().then(setRoutines);
  }, []);

  useEffect(() => {
    if (active === 'routine') refreshRoutines();
  }, [active, refreshRoutines]);

  async function handleDelete(id: string) {
    await deleteRoutine(id);
    refreshRoutines();
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Training</Text>
        <View style={{ width: 24 }} />
      </View>

      <CollapsibleTabBar
        tabs={TABS}
        active={active}
        onSelect={(id) => setActive(id as TabId)}
        accent={ACCENT}
      />

      {/* Content */}
      <View style={{ flex: 1 }}>
        {active === 'trainer' && (
          nameLoaded
            ? <TrainerIntroView userName={userName} accent={ACCENT} />
            : <View style={{ flex: 1 }} />
        )}

        {active === 'routine' && (
          routines.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="list-outline" size={36} color={colors.text.muted} />
              <Text style={s.emptyTitle}>No routine yet</Text>
              <Text style={s.emptyDesc}>Go to the Trainer tab to build your first routine.</Text>
            </View>
          ) : (
            <RoutineDisplay routines={routines} onDelete={handleDelete} />
          )
        )}

        {active === 'today' && <TodayWorkoutView />}

        {active === 'history' && <HistoryView editable />}
      </View>

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

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: spacing.md,
  },
  emptyTitle: { ...typography.title3, color: colors.text.primary, textAlign: 'center' },
  emptyDesc: { ...typography.callout, color: colors.text.muted, textAlign: 'center', lineHeight: 22 },
});
