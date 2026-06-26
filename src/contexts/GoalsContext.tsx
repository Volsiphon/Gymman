import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { loadNutritionGoals, type NutritionGoals } from '@/services/storage/local/profileStorage';
import { loadDynamicMode, loadTodayActivities } from '@/services/storage/local/caloryBurnStorage';
import { loadUserBio } from '@/services/storage/local/userBioStorage';

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
    const [base, on, acts, bio] = await Promise.all([
      loadNutritionGoals(),
      loadDynamicMode(),
      loadTodayActivities(),
      loadUserBio(),
    ]);

    const baseGoals = base ?? DEFAULT_GOALS;

    if (on && bio) {
      const burned = acts.reduce((s, a) => s + a.caloriesBurned, 0);
      const dynCal = Math.round(bio.bmr * 1.2) + burned + bio.goalOffset;
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
