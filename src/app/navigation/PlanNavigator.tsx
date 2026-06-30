import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlanScreen, PlaceholderDetailScreen } from '@/modules/plan/home';
import { DietScreen } from '@/modules/plan/diet';
import { TrainingScreen } from '@/modules/plan/training';
import { CaloryBurnScreen } from '@/modules/plan/calory-burn';
import { BloodworkScreen } from '@/modules/plan/bloodwork';
import { SevenDayScreen } from '@/modules/plan/review';
import type { PlanStackParamList } from './types';
import { colors } from '@/theme/colors';

const Stack = createNativeStackNavigator<PlanStackParamList>();

export function PlanNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.bg.app },
      }}
    >
      <Stack.Screen name="PlanHome"          component={PlanScreen} />
      <Stack.Screen name="Diet"              component={DietScreen} />
      <Stack.Screen name="Training"          component={TrainingScreen} />
      <Stack.Screen name="CaloryBurn"        component={CaloryBurnScreen} />
      <Stack.Screen name="Bloodwork"         component={BloodworkScreen} />
      <Stack.Screen name="SevenDay"          component={SevenDayScreen} />
      <Stack.Screen name="PlaceholderDetail" component={PlaceholderDetailScreen} />
    </Stack.Navigator>
  );
}
