/**
 * services/auth/authService.ts
 *
 * Thin wrapper over Supabase Auth. AuthProvider calls these functions and exposes
 * the result via context; screens never import `supabase` directly.
 *
 * signInWithGoogle uses the web OAuth flow (expo-web-browser opens the Google
 * consent screen, redirects back into the app via the "gymman://" scheme set in
 * app.json, and the code is exchanged for a session via PKCE — see client.ts).
 * This is code-complete but requires a Google OAuth Client ID to be registered in
 * Supabase Dashboard → Authentication → Providers → Google before it'll actually
 * work — until then it fails with Supabase's real "provider not enabled" error.
 *
 * Phone sign-in is two calls: signInWithPhoneOtp sends the code, verifyPhoneOtp
 * checks it and creates the session (Supabase creates the user on first verify —
 * there's no separate "sign up" step for phone). Requires an SMS provider (Twilio /
 * MessageBird / Vonage / TextLocal) enabled in Supabase Dashboard → Authentication
 * → Providers → Phone — that's a paid, per-message service, your choice which one.
 *
 * One account at a time — there is no multi-account switcher, so signing in
 * always replaces whatever session (if any) was active before.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/services/storage/cloud/client';
import type { Session } from '@supabase/supabase-js';

export type AuthResult =
  | { ok: true; userId: string; email: string | null }
  | { ok: false; error: string };

export type OtpSendResult = { ok: true } | { ok: false; error: string };

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Sign up failed' };
  return { ok: true, userId: data.user.id, email: data.user.email ?? null };
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Sign in failed' };
  return { ok: true, userId: data.user.id, email: data.user.email ?? null };
}

export async function signInWithGoogle(): Promise<AuthResult> {
  const redirectTo = Linking.createURL('/auth-callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) return { ok: false, error: error?.message ?? 'Google sign-in failed to start' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: result.type === 'cancel' ? 'Sign-in cancelled' : 'Google sign-in failed' };
  }

  const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(result.url);
  if (exchangeError || !sessionData.user) {
    return { ok: false, error: exchangeError?.message ?? 'Could not complete Google sign-in' };
  }
  return { ok: true, userId: sessionData.user.id, email: sessionData.user.email ?? null };
}

export async function signInWithPhoneOtp(phone: string): Promise<OtpSendResult> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function verifyPhoneOtp(phone: string, token: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error || !data.user) return { ok: false, error: error?.message ?? 'Invalid code' };
  return { ok: true, userId: data.user.id, email: data.user.email ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void,
): () => void {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  return () => data.subscription.unsubscribe();
}
