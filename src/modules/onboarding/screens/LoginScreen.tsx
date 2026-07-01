/**
 * modules/onboarding/screens/LoginScreen.tsx
 *
 * Signs in or creates an account via authService.ts (Supabase Auth). Auth is
 * mandatory here — there is no guest/skip option, by design: local storage
 * (services/storage/localEnvelope.ts) is only ever a write-through cache, not a
 * usable way to run the app without an account. On success, checks whether this
 * account already has a saved profile (loadUserProfile — reads straight from the
 * database, so this covers logging into an existing account on a new device too)
 * and skips straight to Main instead of running through Welcome →
 * GoalDescription → OnboardingChat → ... again; a brand new account continues to
 * WelcomeScreen as usual. Three sign-in methods: email/password (tabs), Google
 * (web OAuth), and phone OTP (two-step inline flow: enter number → enter code).
 * Google and phone both need one-time provider setup in the Supabase dashboard
 * before they'll actually work end-to-end — see authService.ts.
 */

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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { OnboardingStackParamList } from '@/app/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';
import { LabeledInput } from '@/shared/components/Input';
import {
  signInWithEmail, signUpWithEmail, signInWithGoogle,
  signInWithPhoneOtp, verifyPhoneOtp,
} from '@/services/auth/authService';
import { loadUserProfile } from '@/services/storage/local/userProfileStorage';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Login'>;
};

type Mode = 'login' | 'signup';
type AuthMethod = 'email' | 'phone-enter' | 'phone-otp';

// ─── Main screen ──────────────────────────────────────────────────────────────

export function LoginScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [phone, setPhone]           = useState('');
  const [otpCode, setOtpCode]       = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const insets = useSafeAreaInsets();

  const isLogin  = mode === 'login';
  const isValid  = isLogin
    ? email.trim().length >= 3 && password.length >= 6
    : name.trim().length >= 2 && email.trim().length >= 3 && password.length >= 6 && confirm === password;

  const phoneDigits  = phone.replace(/\D/g, '');
  const isPhoneValid = phoneDigits.length === 10;
  const isOtpValid    = otpCode.trim().length === 6;

  const contentAnim = useRef(new Animated.Value(0)).current;
  const formAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(contentAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(formAnim,    { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  // Re-animate form when switching tabs
  useEffect(() => {
    formAnim.setValue(0);
    setError(null);
    Animated.timing(formAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [mode]);

  // Re-animate + clear errors when switching between email/phone
  useEffect(() => {
    formAnim.setValue(0);
    setError(null);
    Animated.timing(formAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [authMethod]);

  // Existing account (e.g. logging back in, or a new device) skips straight to
  // Main instead of re-running the goal/onboarding chat flow. A brand new account
  // has no profile yet, so this just falls through to Welcome as usual.
  const continueAfterAuth = async () => {
    const profile = await loadUserProfile();
    if (profile) {
      navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Main' as never }] });
      return;
    }
    navigation.navigate('Welcome');
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    setError(null);
    setSubmitting(true);
    const result = isLogin
      ? await signInWithEmail(email.trim(), password)
      : await signUpWithEmail(email.trim(), password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    await continueAfterAuth();
  };

  const handleGoogle = async () => {
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await signInWithGoogle();
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    await continueAfterAuth();
  };

  const handleSendOtp = async () => {
    if (!isPhoneValid || submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await signInWithPhoneOtp(`+91${phoneDigits}`);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAuthMethod('phone-otp');
  };

  const handleVerifyOtp = async () => {
    if (!isOtpValid || submitting) return;
    setError(null);
    setSubmitting(true);
    const result = await verifyPhoneOtp(`+91${phoneDigits}`, otpCode.trim());
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    await continueAfterAuth();
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bg.app} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing['2xl'] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Brand header ─────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.brand,
            {
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({ inputRange: [0,1], outputRange: [-8, 0] }) }],
            },
          ]}
        >
          <Ionicons name="flame" size={22} color={colors.primary} />
          <Text style={styles.brandText}>GYMMAN</Text>
        </Animated.View>

        {authMethod === 'email' && (
          <>
            {/* ── Tab switcher ─────────────────────────────────────── */}
            <Animated.View
              style={[
                styles.tabs,
                {
                  opacity: contentAnim,
                  transform: [{ translateY: contentAnim.interpolate({ inputRange: [0,1], outputRange: [8, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.tab, isLogin && styles.tabActive]}
                onPress={() => setMode('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, isLogin ? styles.tabTextActive : styles.tabTextInactive]}>
                  LOGIN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, !isLogin && styles.tabActive]}
                onPress={() => setMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabText, !isLogin ? styles.tabTextActive : styles.tabTextInactive]}>
                  SIGN UP
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ── Form ─────────────────────────────────────────────── */}
            <Animated.View
              style={[
                styles.form,
                {
                  opacity: formAnim,
                  transform: [{ translateY: formAnim.interpolate({ inputRange: [0,1], outputRange: [12, 0] }) }],
                },
              ]}
            >
              {!isLogin && (
                <LabeledInput
                  label="NAME"
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                />
              )}

              <LabeledInput
                label="EMAIL"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
              />

              <LabeledInput
                label="PASSWORD"
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 6 characters"
                secureEntry
                returnKeyType={isLogin ? 'done' : 'next'}
                onSubmit={isLogin ? handleSubmit : undefined}
              />

              {!isLogin && (
                <LabeledInput
                  label="CONFIRM PASSWORD"
                  value={confirm}
                  onChangeText={setConfirm}
                  placeholder="Repeat password"
                  secureEntry
                  returnKeyType="done"
                  onSubmit={handleSubmit}
                />
              )}

              {error && <Text style={styles.errorText}>{error}</Text>}

              {/* CTA button */}
              <TouchableOpacity
                style={[styles.cta, (!isValid || submitting) && styles.ctaDisabled]}
                onPress={handleSubmit}
                disabled={!isValid || submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.text.inverse} />
                ) : (
                  <>
                    <Text style={[styles.ctaText, !isValid && styles.ctaTextDisabled]}>
                      {isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={isValid ? colors.text.inverse : colors.text.disabled}
                      style={{ marginLeft: 4 }}
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* ── Social ───────────────────────────────────────────── */}
            <View style={styles.social}>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8} onPress={handleGoogle} disabled={submitting}>
                <Ionicons name="logo-google" size={18} color={colors.text.primary} />
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.googleBtn}
                activeOpacity={0.8}
                onPress={() => setAuthMethod('phone-enter')}
                disabled={submitting}
              >
                <Ionicons name="call-outline" size={18} color={colors.text.primary} />
                <Text style={styles.googleText}>Continue with Phone Number</Text>
              </TouchableOpacity>

              <Text style={styles.phoneNudge}>
                We suggest that you sign up with your Phone Number. If you do that, you
                will get calls from us in case you skip the gym and using the Gymman App.
                Believe me, we will curse you into getting back to the gym.
              </Text>
            </View>
          </>
        )}

        {authMethod === 'phone-enter' && (
          <Animated.View
            style={[
              styles.form,
              {
                opacity: formAnim,
                transform: [{ translateY: formAnim.interpolate({ inputRange: [0,1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <View style={phoneStyles.wrap}>
              <Text style={phoneStyles.label}>PHONE NUMBER</Text>
              <View style={phoneStyles.field}>
                <Text style={phoneStyles.prefix}>+91</Text>
                <TextInput
                  style={phoneStyles.input}
                  value={phone}
                  onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.text.disabled}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOtp}
                  selectionColor={colors.primary}
                />
              </View>
            </View>

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.cta, (!isPhoneValid || submitting) && styles.ctaDisabled]}
              onPress={handleSendOtp}
              disabled={!isPhoneValid || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={[styles.ctaText, !isPhoneValid && styles.ctaTextDisabled]}>SEND CODE</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAuthMethod('email')} activeOpacity={0.7}>
              <Text style={styles.linkText}>Use email instead</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {authMethod === 'phone-otp' && (
          <Animated.View
            style={[
              styles.form,
              {
                opacity: formAnim,
                transform: [{ translateY: formAnim.interpolate({ inputRange: [0,1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <Text style={styles.otpHint}>Enter the code sent to +91 {phoneDigits}</Text>

            <LabeledInput
              label="VERIFICATION CODE"
              value={otpCode}
              onChangeText={t => setOtpCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit code"
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmit={handleVerifyOtp}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.cta, (!isOtpValid || submitting) && styles.ctaDisabled]}
              onPress={handleVerifyOtp}
              disabled={!isOtpValid || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color={colors.text.inverse} />
              ) : (
                <Text style={[styles.ctaText, !isOtpValid && styles.ctaTextDisabled]}>VERIFY</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAuthMethod('phone-enter')} activeOpacity={0.7}>
              <Text style={styles.linkText}>Change number</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
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

  // ── Brand ────────────────────────────────────────────────────────────────────
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.lg,
  },
  brandText: {
    fontFamily: typography.fonts.display,
    fontSize: 18,
    color: colors.primary,
    letterSpacing: 1,
  },

  // ── Title ────────────────────────────────────────────────────────────────────
  title: {
    fontFamily: typography.fonts.display,
    fontSize: 52,
    lineHeight: 54,
    color: colors.text.primary,
    letterSpacing: 1,
    marginBottom: spacing.lg,
    // Hard drop shadow for 3D letterpress effect
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 3, height: 4 },
    textShadowRadius: 0,
  },

  // ── Tabs ─────────────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: 3,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.input - 2,
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontFamily: typography.fonts.display,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: colors.text.inverse,
  },
  tabTextInactive: {
    color: colors.text.muted,
  },

  // ── Form ─────────────────────────────────────────────────────────────────────
  form: {
    gap: spacing.md,
  },
  errorText: {
    ...typography.footnote,
    color: colors.danger,
  },
  linkText: {
    ...typography.footnote,
    color: colors.primary,
    textAlign: 'center',
  },
  otpHint: {
    ...typography.footnote,
    color: colors.text.muted,
  },

  // ── CTA button ───────────────────────────────────────────────────────────────
  cta: {
    height: spacing.buttonHeight,
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  ctaDisabled: {
    backgroundColor: colors.bg.elevated,
  },
  ctaText: {
    fontFamily: typography.fonts.display,
    fontSize: 16,
    letterSpacing: 1,
    color: colors.text.inverse,
  },
  ctaTextDisabled: {
    color: colors.text.disabled,
  },

  // ── Social ───────────────────────────────────────────────────────────────────
  social: {
    marginTop: spacing.xl,
    gap: spacing.md,
  },
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
  dividerText: {
    ...typography.footnote,
    color: colors.text.muted,
  },
  googleBtn: {
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
  phoneNudge: {
    ...typography.caption,
    color: colors.text.muted,
    lineHeight: 16,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});

// ─── Phone input (custom — needs a fixed "+91" prefix, unlike LabeledInput) ────

const phoneStyles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  label: {
    ...typography.label,
    color: colors.text.muted,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg.elevated,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border.default,
    height: spacing.inputHeight,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  prefix: {
    ...typography.callout,
    color: colors.text.secondary,
  },
  input: {
    flex: 1,
    ...typography.callout,
    color: colors.text.primary,
    padding: 0,
  },
});
