/**
 * app/navigation/MainTabNavigator.tsx
 *
 * The five-tab bottom navigation bar the user sees after onboarding: Plan, Progress,
 * Coach, Photos, Shop. This file also wraps the whole navigator in GoalsContextProvider
 * so every tab can read or update the live calorie target without prop-drilling.
 * Tab bar styling (background, active/inactive tint, icon sizes) is all defined here.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { PlanNavigator } from './PlanNavigator';
import { ProgressScreen } from '@/modules/progress';
import { PhotosScreen } from '@/modules/photos';
import { CoachScreen } from '@/modules/coach';
import { ShopScreen } from '@/modules/shop';
import type { MainTabParamList } from './types';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { GoalsProvider } from '@/contexts/GoalsContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<keyof MainTabParamList, [IconName, IconName]> = {
  Plan:     ['calendar',             'calendar-outline'],
  Progress: ['trending-up',          'trending-up-outline'],
  Photos:   ['camera',               'camera-outline'],
  Coach:    ['sparkles',             'sparkles-outline'],
  Shop:     ['bag',                  'bag-outline'],
};

export function MainTabNavigator() {
  return (
    <GoalsProvider>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.bar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.text.muted,
          tabBarLabelStyle: styles.label,
          tabBarIcon: ({ color, focused }) => {
            const [active, inactive] = TAB_ICONS[route.name as keyof MainTabParamList];
            return <Ionicons name={focused ? active : inactive} size={24} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Plan"     component={PlanNavigator} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Photos"   component={PhotosScreen} />
        <Tab.Screen name="Coach"    component={CoachScreen} />
        <Tab.Screen name="Shop"     component={ShopScreen} />
      </Tab.Navigator>
    </GoalsProvider>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.bg.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.default,
    height: spacing.tabBarHeight,
  },
  label: {
    ...typography.caption,
    fontWeight: '500',
  },
});
