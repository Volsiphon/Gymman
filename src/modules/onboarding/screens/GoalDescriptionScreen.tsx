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
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/app/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

const REHAB_KEYWORDS = [
  'injury', 'injuri', 'surgery', 'sciatica', 'arthritis',
  'herniat', 'disc', 'fracture', 'ligament', 'chronic pain', 'rehab',
  'posture', 'slouch', 'hunch', 'rounded shoulder', 'forward head',
  'back pain', 'neck pain', 'joint pain', 'knee pain', 'shoulder pain',
];

function isRehabGoal(text: string): boolean {
  const lower = text.toLowerCase();
  return REHAB_KEYWORDS.some(k => lower.includes(k));
}

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'GoalDescription'>;
};

const MIN_WORDS = 5;
const MIN_CHARS = 15;

export function GoalDescriptionScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const [text, setText] = useState('');
  const [rehabWarning, setRehabWarning] = useState(false);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start();
  }, []);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isValid = wordCount >= MIN_WORDS || text.trim().length >= MIN_CHARS;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.md },
        ]}
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
              overflow: 'visible',
            },
          ]}
        >
          <Text style={styles.headline}>WHAT ARE YOU{'\n'}BUILDING TOWARD?</Text>
          <Text style={styles.body}>
            Be as specific as you can — physique references, timelines, how you want to feel. The more detail, the better your plan.
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
              "e.g. I want a lean, athletic build — visible abs, broader shoulders. I've got about 6 months and I'm willing to train 5 days a week..."
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
              <Text style={styles.countHint}>keep going...</Text>
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
          onPress={() => {
            if (isRehabGoal(text)) { setRehabWarning(true); return; }
            navigation.navigate('OnboardingChat', { goalText: text });
          }}
          disabled={!isValid}
          activeOpacity={0.85}
        >
          <Text style={[styles.continueBtnText, !isValid && styles.continueBtnTextDisabled]}>
            CONTINUE
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={isValid ? colors.text.inverse : colors.text.disabled}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        <Modal
          visible={rehabWarning}
          transparent
          animationType="slide"
          onRequestClose={() => setRehabWarning(false)}
          statusBarTranslucent
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
              <View style={styles.modalHandle} />
              <View style={styles.modalIconRow}>
                <Ionicons name="construct-outline" size={28} color={colors.gold} />
              </View>
              <Text style={styles.modalTitle}>Gymman is still new here</Text>
              <Text style={styles.modalBody}>
                Your goal sounds like it involves injury or rehab — an area that needs professional guidance and personalised care.{'\n\n'}
                Gymman is still building a proper Rehabilitation Coach experience. Right now the app is optimised for fitness goals: fat loss, muscle gain, body recomposition, and athletic performance.{'\n\n'}
                You can re-describe your goal as a fitness goal, or continue knowing the current version of Gymman may not fully serve your rehab needs.
              </Text>
              <TouchableOpacity
                style={styles.modalBtnPrimary}
                onPress={() => setRehabWarning(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalBtnPrimaryText}>Re-describe my goal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setRehabWarning(false);
                  navigation.navigate('OnboardingChat', { goalText: text });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalBtnSecondaryText}>Continue anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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

  scroll: {
    paddingHorizontal: spacing.screenPadding,
  },

  // Hero
  hero: {
    gap: spacing.md,
  },
  headline: {
    fontFamily: typography.fonts.display,
    fontSize: 44,
    lineHeight: 52,
    paddingTop: 10,
    color: colors.text.primary,
    letterSpacing: 0.5,
    overflow: 'visible',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  body: {
    ...typography.callout,
    color: colors.text.muted,
    lineHeight: 23,
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
    minHeight: 180,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  continueBtnText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
  continueBtnTextDisabled: {
    color: colors.text.disabled,
  },

  // Rehab modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.bg.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.default,
    alignSelf: 'center',
    marginBottom: spacing.xs,
  },
  modalIconRow: {
    alignItems: 'center',
    paddingTop: spacing.xs,
  },
  modalTitle: {
    fontFamily: typography.fonts.display,
    fontSize: 22,
    letterSpacing: 0.3,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalBody: {
    ...typography.callout,
    color: colors.text.secondary,
    lineHeight: 23,
  },
  modalBtnPrimary: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
  modalBtnSecondary: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalBtnSecondaryText: {
    ...typography.callout,
    color: colors.text.muted,
  },
});
