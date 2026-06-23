import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;
};

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const logoAnim     = useRef(new Animated.Value(0)).current;
  const headlineAnim = useRef(new Animated.Value(0)).current;
  const descAnim     = useRef(new Animated.Value(0)).current;
  const btnAnim      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim,     { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(headlineAnim, { toValue: 1, duration: 560, useNativeDriver: true }),
      Animated.timing(descAnim,     { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(btnAnim,      { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <View
      style={[
        s.root,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.md },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.app} />

      {/* Wordmark */}
      <Animated.View
        style={[
          s.wordmark,
          {
            opacity: logoAnim,
            transform: [
              {
                translateY: logoAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name="sparkles" size={13} color={colors.text.disabled} />
        <Text style={s.wordmarkText}>GYMMAN</Text>
      </Animated.View>

      {/* Headline */}
      <Animated.View
        style={[
          s.headlineBlock,
          {
            opacity: headlineAnim,
            transform: [
              {
                translateY: headlineAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [28, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={s.headline}>
          <Text style={s.headlineWhite}>{'BUILT AROUND\nYOUR BODY.\n'}</Text>
          <Text style={s.headlineRed}>{'NOT THE OTHER\nWAY AROUND.'}</Text>
        </Text>
      </Animated.View>

      {/* Description */}
      <Animated.View style={[s.descBlock, { opacity: descAnim }]}>
        <Text style={s.desc}>
          An AI coach that remembers your history, reads your progress, and rebuilds your plan as you change — not a calorie chart frozen on day one. Not just that, this is also the one place for all your Gym needs. A system made with cutting edge AI technology and world class fitness metrics.
        </Text>
      </Animated.View>

      <View style={{ flex: 1 }} />

      {/* CTA */}
      <Animated.View style={{ opacity: btnAnim }}>
        <TouchableOpacity
          style={s.cta}
          onPress={() => navigation.navigate('GoalDescription')}
          activeOpacity={0.85}
        >
          <Text style={s.ctaText}>START YOUR ASSESMENT</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.text.inverse} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
    paddingHorizontal: spacing.screenPadding,
  },

  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.lg,
  },
  wordmarkText: {
    ...typography.caption,
    color: colors.text.disabled,
    letterSpacing: 2.5,
    fontWeight: '600',
  },

  headlineBlock: {
    marginTop: spacing['2xl'],
  },
  headline: {
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  headlineWhite: {
    color: colors.text.primary,
  },
  headlineRed: {
    color: colors.primary,
  },

  descBlock: {
    marginTop: spacing.xl,
  },
  desc: {
    ...typography.callout,
    color: colors.text.muted,
    lineHeight: 23,
  },

  cta: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  ctaText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
});
