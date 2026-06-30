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
import type { OnboardingStackParamList } from '@/app/navigation';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
import { spacing, radius } from '@/theme/spacing';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Login'>;
};

type Mode = 'login' | 'signup';

// ─── Labelled input ───────────────────────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureEntry,
  keyboardType,
  returnKeyType,
  onSubmit,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureEntry?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  returnKeyType?: React.ComponentProps<typeof TextInput>['returnKeyType'];
  onSubmit?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () =>
    Animated.timing(borderAnim, { toValue: 1, duration: 180, useNativeDriver: false }).start();
  const handleBlur = () =>
    Animated.timing(borderAnim, { toValue: 0, duration: 180, useNativeDriver: false }).start();

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border.default, colors.primary],
  });

  return (
    <View style={inputStyles.wrap}>
      <Text style={inputStyles.label}>{label}</Text>
      <Animated.View style={[inputStyles.field, { borderColor }]}>
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.text.disabled}
          secureTextEntry={secureEntry && !visible}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType ?? 'next'}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={onSubmit}
          selectionColor={colors.primary}
        />
        {secureEntry && (
          <TouchableOpacity onPress={() => setVisible(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.text.muted}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

const inputStyles = StyleSheet.create({
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
    height: spacing.inputHeight,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.callout,
    color: colors.text.primary,
    padding: 0,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function LoginScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const insets = useSafeAreaInsets();

  const isLogin  = mode === 'login';
  const isValid  = isLogin
    ? email.trim().length >= 3 && password.length >= 6
    : name.trim().length >= 2 && email.trim().length >= 3 && password.length >= 6 && confirm === password;

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
    Animated.timing(formAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [mode]);

  const handleSubmit = () => {
    if (!isValid) return;
    navigation.navigate('Welcome');
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

        {/* ── Tab switcher ─────────────────────────────────────────── */}
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

        {/* ── Form ─────────────────────────────────────────────────── */}
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

          {/* CTA button */}
          <TouchableOpacity
            style={[styles.cta, !isValid && styles.ctaDisabled]}
            onPress={handleSubmit}
            disabled={!isValid}
            activeOpacity={0.85}
          >
            <Text style={[styles.ctaText, !isValid && styles.ctaTextDisabled]}>
              {isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={isValid ? colors.text.inverse : colors.text.disabled}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* ── Social ───────────────────────────────────────────────── */}
        <View style={styles.social}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.googleBtn} activeOpacity={0.8}>
            <Ionicons name="logo-google" size={18} color={colors.text.primary} />
            <Text style={styles.googleText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>

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
});
