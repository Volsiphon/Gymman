import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/navigation/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'GoalDescription'>;
};

const MIN_WORDS = 15;

export function GoalDescriptionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');

  const heroAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start();
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isValid = wordCount >= MIN_WORDS;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.xs }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Goal</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing.md }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero copy */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            },
          ]}
        >
          <Text style={styles.headline}>What are you working toward?</Text>
          <Text style={styles.body}>
            Describe your goal in your own words — your timeline, your reasons, what success looks like, and anything standing in your way.
          </Text>
          <Text style={styles.nudge}>
            The more you write, the better we can build a plan that actually works for you.
          </Text>
        </Animated.View>

        {/* Text area */}
        <Animated.View
          style={[
            styles.inputBlock,
            {
              opacity: formAnim,
              transform: [{ translateY: formAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
            },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.textArea}
            value={text}
            onChangeText={setText}
            placeholder={
              "E.g. I want to lose around 12 kg before my cousin's wedding in October. I've tried before but always quit after two weeks. This time I want to actually build a habit and not just crash diet. I'd love to feel confident without a shirt on..."
            }
            placeholderTextColor={colors.text.disabled}
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            autoCorrect
            selectionColor={colors.primary}
          />

          {/* Word count */}
          <View style={styles.countRow}>
            <Text style={[styles.countText, isValid && styles.countTextValid]}>
              {wordCount} {wordCount === 1 ? 'word' : 'words'}
            </Text>
            {!isValid && (
              <Text style={styles.countHint}>
                {MIN_WORDS - wordCount} more to continue
              </Text>
            )}
            {isValid && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark" size={12} color={colors.success} />
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Fixed bottom */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <TouchableOpacity
          style={[styles.continueBtn, !isValid && styles.continueBtnDisabled]}
          onPress={() => navigation.navigate('PhysicalStats', { goalText: text })}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, !isValid && styles.continueBtnTextDisabled]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    ...typography.subhead,
    color: colors.text.secondary,
  },

  scroll: {
    paddingHorizontal: spacing.screenPadding,
  },

  // Hero
  hero: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  headline: {
    ...typography.title1,
    color: colors.text.primary,
  },
  body: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
  },
  nudge: {
    ...typography.callout,
    color: colors.primary,
    lineHeight: 23,
    fontWeight: '500',
  },

  // Text area
  inputBlock: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  textArea: {
    ...typography.callout,
    color: colors.text.primary,
    backgroundColor: colors.bg.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    lineHeight: 24,
    minHeight: 96,
  },

  // Word count row
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countText: {
    ...typography.footnote,
    color: colors.text.disabled,
  },
  countTextValid: {
    color: colors.success,
  },
  countHint: {
    ...typography.footnote,
    color: colors.text.disabled,
  },
  checkBadge: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.md,
    backgroundColor: colors.bg.app,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.subtle,
  },
  continueBtn: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  continueBtnText: {
    ...typography.bodyMedium,
    color: colors.text.inverse,
  },
  continueBtnTextDisabled: {
    color: colors.text.disabled,
  },
});
