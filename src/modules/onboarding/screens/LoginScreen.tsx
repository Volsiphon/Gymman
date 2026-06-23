import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  StyleSheet,
  StatusBar,
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
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Login'>;
};

export function LoginScreen({ navigation }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const insets = useSafeAreaInsets();

  const isValid = username.trim().length >= 3 && password.length >= 6;

  const heroAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const socialAnim = useRef(new Animated.Value(0)).current;
  const phoneAnim = useRef(new Animated.Value(0)).current;
  const userFocus = useRef(new Animated.Value(0)).current;
  const passFocus = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(socialAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(phoneAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateFocus = (anim: Animated.Value, focused: boolean) => {
    Animated.timing(anim, {
      toValue: focused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  };

  const handleContinue = () => {
    if (!isValid) return;
    // TODO: authenticate via username/password
    navigation.navigate('Welcome');
  };

  const userBorder = userFocus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border.default, colors.primary],
  });
  const passBorder = passFocus.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border.default, colors.primary],
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.app} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.secondary} />
        </TouchableOpacity>

        {/* Hero */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [
                {
                  translateY: heroAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.headline}>Welcome to{'\n'}Gymman</Text>
          <Text style={styles.subhead}>Sign in or create a new account</Text>
        </Animated.View>

        {/* Username + password */}
        <Animated.View
          style={[
            styles.form,
            {
              opacity: formAnim,
              transform: [
                {
                  translateY: formAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Animated.View style={[styles.inputWrapper, { borderColor: userBorder }]}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              onFocus={() => animateFocus(userFocus, true)}
              onBlur={() => animateFocus(userFocus, false)}
              placeholder="Username or email"
              placeholderTextColor={colors.text.disabled}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="next"
              selectionColor={colors.primary}
            />
          </Animated.View>

          <Animated.View style={[styles.inputWrapper, { borderColor: passBorder }]}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => animateFocus(passFocus, true)}
              onBlur={() => animateFocus(passFocus, false)}
              placeholder="Password"
              placeholderTextColor={colors.text.disabled}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleContinue}
              selectionColor={colors.primary}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(p => !p)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.text.muted}
              />
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={[styles.button, isValid ? styles.buttonActive : styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text style={[styles.buttonText, !isValid && styles.buttonTextDisabled]}>
              Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Social */}
        <Animated.View style={[styles.social, { opacity: socialAnim }]}>
          <Divider />

          <TouchableOpacity
            style={styles.googleButton}
            activeOpacity={0.8}
            onPress={() => {
              // TODO: trigger Google Sign-In
            }}
          >
            <Ionicons name="logo-google" size={18} color={colors.text.primary} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Phone option */}
        <Animated.View style={[styles.phoneSection, { opacity: phoneAnim }]}>
          <Divider faint />

          <TouchableOpacity
            style={styles.phoneButton}
            activeOpacity={0.75}
            onPress={() => {
              // TODO: navigate to phone OTP flow
            }}
          >
            <Ionicons name="call-outline" size={18} color={colors.text.secondary} />
            <Text style={styles.phoneText}>Use phone number</Text>
          </TouchableOpacity>

          <View style={styles.accountabilityBox}>
            <Text style={styles.accountabilityText}>
              Choose your number and you can turn on gym accountability calls.
              Miss the gym, skip logging — our guy will call and personally curse you out. 😤
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Divider ─────────────────────────────────────────────────────────────────

function Divider({ faint }: { faint?: boolean }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, faint && styles.dividerLineFaint]} />
      <Text style={[styles.dividerText, faint && styles.dividerTextFaint]}>or</Text>
      <View style={[styles.dividerLine, faint && styles.dividerLineFaint]} />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.app,
  },
  scroll: {
    paddingHorizontal: spacing.screenPadding,
  },

  back: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -spacing.xs,
  },

  // Hero
  hero: {
    marginTop: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  headline: {
    ...typography.display,
    color: colors.text.primary,
  },
  subhead: {
    ...typography.subhead,
    color: colors.text.muted,
  },

  // Form
  form: {
    gap: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.card,
    borderRadius: radius.input,
    borderWidth: 1,
    height: spacing.inputHeight,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text.primary,
    padding: 0,
  },
  button: {
    height: spacing.buttonHeight,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
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

  // Social
  social: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  googleButton: {
    height: spacing.buttonHeight,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  googleText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },

  // Phone
  phoneSection: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  phoneText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  accountabilityBox: {
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: spacing.md,
  },
  accountabilityText: {
    ...typography.footnote,
    color: colors.text.muted,
    lineHeight: 19,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.default,
  },
  dividerLineFaint: {
    backgroundColor: colors.border.subtle,
  },
  dividerText: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  dividerTextFaint: {
    color: colors.text.disabled,
  },
});
