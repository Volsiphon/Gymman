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
            transform: [{ translateY: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
          },
        ]}
      >
        <Ionicons name="flame" size={16} color={colors.primary} />
        <Text style={s.wordmarkText}>GYMMAN</Text>
      </Animated.View>

      {/* Headline */}
      <Animated.View
        style={[
          s.headlineBlock,
          {
            opacity: headlineAnim,
            transform: [{ translateY: headlineAnim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
            overflow: 'visible',
          },
        ]}
      >
        <Text style={s.headlineWhite}>{'BUILT AROUND\nYOUR BODY.'}</Text>
        <Text style={s.headlineGreen}>{'NOT THE OTHER\nWAY AROUND.'}</Text>
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
          <Ionicons name="chevron-forward" size={20} color={colors.text.inverse} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <Text style={s.caption}>Free plan • No credit card</Text>
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
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  wordmarkText: {
    fontFamily: typography.fonts.display,
    fontSize: 15,
    color: colors.primary,
    letterSpacing: 2,
  },

  headlineBlock: {
    marginTop: spacing['2xl'],
    overflow: 'visible',
  },
  headlineWhite: {
    fontFamily: typography.fonts.display,
    fontSize: 52,
    lineHeight: 58,
    paddingTop: 10,
    color: colors.text.primary,
    letterSpacing: 0.5,
    overflow: 'visible',
  },
  headlineGreen: {
    fontFamily: typography.fonts.display,
    fontSize: 52,
    lineHeight: 58,
    paddingTop: 10,
    color: colors.primary,
    letterSpacing: 0.5,
    overflow: 'visible',
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
  },
  ctaText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
  caption: {
    ...typography.footnote,
    color: colors.text.muted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
