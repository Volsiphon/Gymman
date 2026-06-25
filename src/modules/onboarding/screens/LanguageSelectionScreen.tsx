import React, { useState, useRef, useEffect } from 'react';
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
import type { Language } from '@/types/user';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'LanguageSelection'>;
};

interface LanguageOption {
  id: Language;
  name: string;
  descriptor: string;
  isMalayalam?: boolean;
}

const LANGUAGES: LanguageOption[] = [
  {
    id: 'en',
    name: 'English',
    descriptor: 'Continue in English',
  },
  {
    id: 'ml',
    name: 'മലയാളം',
    descriptor: 'Malayalam',
    isMalayalam: true,
  },
  {
    id: 'manglish',
    name: 'Manglish',
    descriptor: 'Malayalam, typed in English',
  },
];

const CONTINUE_TEXT: Record<Language, string> = {
  en: 'CONTINUE',
  ml: 'തുടരുക',
  manglish: 'CONTINUE',
};

export function LanguageSelectionScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Language | null>(null);
  const insets = useSafeAreaInsets();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims  = useRef(LANGUAGES.map(() => new Animated.Value(0))).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.stagger(
        90,
        cardAnims.map(anim =>
          Animated.spring(anim, { toValue: 1, tension: 80, friction: 10, useNativeDriver: true })
        )
      ),
      Animated.timing(buttonAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('Login');
  };

  const buttonText = selected ? CONTINUE_TEXT[selected] : 'CONTINUE';
  const isMlSelected = selected === 'ml';

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.app} />

      {/* ── Centered content block ─────────────────────────────────── */}
      <View style={styles.centerGroup}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0,1], outputRange: [12, 0] }) }],
              overflow: 'visible',
            },
          ]}
        >
          <Text style={styles.title}>CHOOSE YOUR{'\n'}LANGUAGE</Text>
          <Text style={styles.subtitle}>
            Your coach will speak to you in this language. You can change it later.
          </Text>
        </Animated.View>

        {/* ── Language cards ─────────────────────────────────────── */}
        <View style={styles.cards}>
          {LANGUAGES.map((lang, index) => (
            <LanguageCard
              key={lang.id}
              option={lang}
              selected={selected === lang.id}
              dimmed={selected !== null && selected !== lang.id}
              entryAnim={cardAnims[index]}
              onPress={() => setSelected(lang.id)}
            />
          ))}
        </View>

      </View>

      {/* ── Continue button ─────────────────────────────────────────── */}
      <Animated.View style={{ opacity: buttonAnim }}>
        <TouchableOpacity
          style={[styles.button, selected ? styles.buttonActive : styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={!selected}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.buttonText,
              !selected && styles.buttonTextDisabled,
              isMlSelected && styles.buttonTextMl,
            ]}
          >
            {buttonText}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={selected ? colors.text.inverse : colors.text.disabled}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Language Card ───────────────────────────────────────────────────────────

interface CardProps {
  option: LanguageOption;
  selected: boolean;
  dimmed: boolean;
  entryAnim: Animated.Value;
  onPress: () => void;
}

function LanguageCard({ option, selected, dimmed, entryAnim, onPress }: CardProps) {
  const pressScale = useRef(new Animated.Value(1)).current;
  const dimAnim    = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(dimAnim, { toValue: dimmed ? 0.45 : 1, duration: 200, useNativeDriver: true }).start();
  }, [dimmed]);

  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 1.02, duration: 80, useNativeDriver: true }),
        Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [selected]);

  const handlePressIn  = () =>
    Animated.spring(pressScale, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  const handlePressOut = () =>
    Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={{
        opacity: dimAnim,
        transform: [
          { translateY: entryAnim.interpolate({ inputRange: [0,1], outputRange: [28, 0] }) },
          { scale: Animated.multiply(
              entryAnim.interpolate({ inputRange: [0,1], outputRange: [0.95, 1] }),
              pressScale
            )
          },
        ],
      }}
    >
      <TouchableOpacity
        style={[styles.card, selected && styles.cardSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.cardName,
              selected && styles.cardNameSelected,
              option.isMalayalam && styles.cardNameMl,
            ]}
          >
            {option.name}
          </Text>
          <Text
            style={[
              styles.cardDescriptor,
              option.isMalayalam && styles.cardDescriptorMl,
            ]}
          >
            {option.descriptor}
          </Text>
        </View>
        {selected && (
          <Ionicons name="checkmark" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const ML_FONT = 'NotoSansMalayalam';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.app,
    paddingHorizontal: spacing.screenPadding,
  },

  // ── Centered group ───────────────────────────────────────────────────────────
  centerGroup: {
    flex: 1,
    justifyContent: 'center',
    overflow: 'visible',
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.sm,
    overflow: 'visible',
  },
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 36,
    lineHeight: 48,
    textAlign: 'center',
    color: colors.text.primary,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    ...typography.callout,
    color: colors.text.muted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing.sm,
  },

  // ── Cards ────────────────────────────────────────────────────────────────────
  cards: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  cardContent: {
    gap: spacing.xs,
  },
  cardName: {
    ...typography.title3,
    color: colors.text.primary,
  },
  cardNameSelected: {
    color: colors.primary,
  },
  cardNameMl: {
    fontFamily: ML_FONT,
  },
  cardDescriptor: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  cardDescriptorMl: {
    fontFamily: ML_FONT,
  },

  // ── Button ───────────────────────────────────────────────────────────────────
  button: {
    height: spacing.buttonHeight,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  buttonText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
  buttonTextDisabled: {
    color: colors.text.disabled,
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
  },
  buttonTextMl: {
    fontFamily: ML_FONT,
    fontSize: 16,
  },
});
