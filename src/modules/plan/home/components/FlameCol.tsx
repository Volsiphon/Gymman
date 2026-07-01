/**
 * modules/plan/home/components/FlameCol.tsx
 *
 * Renders a single streak flame column (icon + label). When lit, the flame pulses
 * with an Animated loop. Also exports the FlameState interface (which flames are
 * currently lit) and the STREAK_FLAMES constant that defines all three flames —
 * their key, label, colour, and the condition text shown in StreakModal. Both
 * exports are used by StreakModal and StreakCelebrationModal so everything
 * stays in sync: add a new flame here and it appears everywhere automatically.
 */

import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

export interface FlameState {
  diet:     boolean;
  gym:      boolean;
  activity: boolean;
}

export const STREAK_FLAMES = [
  {
    key:       'diet'     as const,
    label:     'DIET',
    color:     colors.success,
    condition: 'Log at least one meal today in the Diet section.',
    howTo:     'Plan → Diet → log what you ate or ask the AI for a meal plan.',
  },
  {
    key:       'gym'      as const,
    label:     'GYM',
    color:     colors.primary,
    condition: 'Complete a training session today in Training Routine.',
    howTo:     'Plan → Training Routine → start a session and mark it done.',
  },
  {
    key:       'activity' as const,
    label:     'ACTIVITY',
    color:     colors.gold,
    condition: 'Log at least one calorie burn in Calory Burn today.',
    howTo:     'Plan → Calory Burn → describe what you did or add it manually.',
  },
] as const;

export function FlameCol({
  color, lit, label, onPress,
}: {
  color:   string;
  lit:     boolean;
  label:   string;
  onPress: () => void;
}) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.28)).current;

  useEffect(() => {
    let anim: Animated.CompositeAnimation | null = null;
    if (lit) {
      opacity.setValue(1);
      anim = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.13, duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.80, duration: 900, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale,   { toValue: 0.96, duration: 900, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 1,    duration: 900, useNativeDriver: true }),
          ]),
        ]),
      );
      anim.start();
    } else {
      scale.setValue(1);
      opacity.setValue(0.28);
    }
    return () => { anim?.stop(); };
  }, [lit]);

  return (
    <TouchableOpacity style={s.col} onPress={onPress} activeOpacity={0.7}>
      <Animated.View style={{ transform: [{ scale }], opacity }}>
        <Ionicons name="flame" size={40} color={lit ? color : colors.text.primary} />
      </Animated.View>
      <Text style={[s.label, lit && { color }]}>{label}</Text>
      <View style={s.infoIcon}>
        <Ionicons name="information-circle-outline" size={13} color={lit ? color : colors.text.disabled} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  col:      { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 6 },
  label:    { ...typography.label, color: colors.text.disabled, fontSize: 10, letterSpacing: 1 },
  infoIcon: { opacity: 0.7 },
});
