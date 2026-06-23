import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  PlanScreen,
  DietScreen,
  TrainingScreen,
  CaloryBurnScreen,
  PlaceholderDetailScreen,
} from '@/modules/main';
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
      <Stack.Screen name="PlaceholderDetail" component={PlaceholderDetailScreen} />
    </Stack.Navigator>
  );
}
