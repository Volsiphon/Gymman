import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';
import { loadDynamicMode, loadTodayActivities } from '@/services/storage/local/caloryBurnStorage';
import { calcDynamicTarget } from '@/engine/nutrition';

type NutritionGoals = { calories: number; protein: number; carbs: number; fats: number };

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
