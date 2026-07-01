/**
 * contexts/GoalsContext.tsx
 *
 * A React Context that lives at the MainTabNavigator level and acts as the live bridge
 * between three screens: CaloryBurn (writes activity burns), Plan (reads today's calorie
 * target), and Diet (reads the target to compare against consumed calories).
 *
 * When Dynamic Mode is on, this context recalculates the calorie target every time the
 * user navigates between tabs (via AppState + focus events) by reading today's logged
 * activities and adding their burn to the base TDEE. When Dynamic Mode is off, the
 * target is just the static goal from the user profile.
 *
 * Why a Context and not a store slice? Because this value needs to be hot-reloaded on
 * every tab visit without a full Redux dispatch cycle. It reads from AsyncStorage
 * directly and stays in local component state.
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { loadDynamicMode, loadTodayActivities } from '@/services/storage/local/caloryBurnStorage';
import { calcDynamicTarget } from '@/engine/nutrition';
import type { NutritionGoals } from '@/types/user';

const DEFAULT_GOALS: NutritionGoals = { calories: 1700, protein: 130, carbs: 170, fats: 47 };

type GoalsContextValue = {
  goals: NutritionGoals;
  isDynamic: boolean;
  refresh: () => Promise<void>;
};

const GoalsContext = createContext<GoalsContextValue>({
  goals: DEFAULT_GOALS,
  isDynamic: false,
  refresh: async () => {},
});

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals,     setGoals]     = useState<NutritionGoals>(DEFAULT_GOALS);
  const [isDynamic, setIsDynamic] = useState(false);

  const refresh = useCallback(async () => {
    const [profile, on, acts] = await Promise.all([
      loadUserProfile(),
      loadDynamicMode(),
      loadTodayActivities(),
    ]);

    const baseGoals: NutritionGoals = profile?.calorieTarget
      ? { calories: profile.calorieTarget, protein: profile.proteinG ?? 130, carbs: profile.carbsG ?? 170, fats: profile.fatsG ?? 47 }
      : DEFAULT_GOALS;

    if (on && profile?.bmr && profile.goalOffset !== undefined) {
      const burned = acts.reduce((s, a) => s + a.caloriesBurned, 0);
      const dynCal = calcDynamicTarget(profile.bmr, burned, profile.goalOffset);
      setGoals({ ...baseGoals, calories: dynCal });
      setIsDynamic(true);
    } else {
      setGoals(baseGoals);
      setIsDynamic(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <GoalsContext.Provider value={{ goals, isDynamic, refresh }}>
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  return useContext(GoalsContext);
}
