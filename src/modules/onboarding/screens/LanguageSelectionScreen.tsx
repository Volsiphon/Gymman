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
import type { OnboardingStackParamList } from '@/app/navigation';
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
    descriptor: 'മലയാളത്തിൽ തുടരുക',
    isMalayalam: true,
  },
  {
    id: 'manglish',
    name: 'Manglish',
    descriptor: 'Manglishil Thudaruka',
  },
];

const CONTINUE_TEXT: Record<Language, string> = {
  en: 'Continue',
  ml: 'തുടരുക',
  manglish: 'Thudaruka',
};

export function LanguageSelectionScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<Language | null>(null);
  const insets = useSafeAreaInsets();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(LANGUAGES.map(() => new Animated.Value(0))).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 550,
        useNativeDriver: true,
      }),
      Animated.stagger(
        90,
        cardAnims.map(anim =>
          Animated.spring(anim, {
            toValue: 1,
            tension: 80,
            friction: 10,
            useNativeDriver: true,
          })
        )
      ),
      Animated.timing(buttonAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleContinue = () => {
    if (!selected) return;
    // TODO: persist language choice to store/language/ before navigating
    navigation.navigate('Login');
  };

  const buttonText = selected ? CONTINUE_TEXT[selected] : 'Continue';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.lg,
        },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.app} />

      {/* Logo + tagline */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-16, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.logo}>GYMMAN</Text>
        <View style={styles.taglines}>
          <Text style={styles.tagline}>Choose your language</Text>
          <Text style={[styles.tagline, styles.taglineMl]}>
            ഭാഷ തിരഞ്ഞെടുക്കുക
          </Text>
          <Text style={styles.tagline}>Bhasha Thiranjedukkuka</Text>
        </View>
      </Animated.View>

      {/* Language cards */}
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

      {/* Continue */}
      <Animated.View style={[styles.buttonWrap, { opacity: buttonAnim }]}>
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
              selected === 'ml' && styles.buttonTextMl,
            ]}
          >
            {buttonText}
          </Text>
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
  const dimAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(dimAnim, {
      toValue: dimmed ? 0.4 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [dimmed]);

  // Pop feedback when this card becomes selected
  useEffect(() => {
    if (selected) {
      Animated.sequence([
        Animated.timing(pressScale, { toValue: 1.03, duration: 90, useNativeDriver: true }),
        Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [selected]);

  const handlePressIn = () => {
    Animated.spring(pressScale, { toValue: 0.97, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, { toValue: 1, tension: 200, friction: 10, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: dimAnim,
        transform: [
          {
            translateY: entryAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [28, 0],
            }),
          },
          {
            scale: Animated.multiply(
              entryAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }),
              pressScale
            ),
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
        <Ionicons
          name={selected ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={selected ? colors.primary : colors.border.strong}
        />
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
    justifyContent: 'space-between',
  },

  // Header
  header: {
    alignItems: 'center',
  },
  logo: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.black,
    color: colors.primary,
    letterSpacing: 8,
  },
  taglines: {
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  tagline: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  taglineMl: {
    fontFamily: ML_FONT,
  },

  // Cards
  cards: {
    gap: spacing.sm,
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
    borderColor: colors.primaryBorder,
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
    color: colors.primaryLight,
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

  // Button
  buttonWrap: {
    width: '100%',
  },
  button: {
    height: spacing.buttonHeight,
    borderRadius: radius.button,
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
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  buttonTextDisabled: {
    color: colors.text.disabled,
  },
  buttonTextMl: {
    fontFamily: ML_FONT,
  },
});
