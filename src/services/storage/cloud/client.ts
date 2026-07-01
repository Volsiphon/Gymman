/**
 * services/storage/cloud/client.ts
 *
 * Supabase client singleton. Every cloud service (auth, sync, photoCloud) imports
 * `supabase` from here instead of creating its own client. Session tokens persist
 * to AsyncStorage so a signed-in user stays signed in across app restarts.
 *
 * Requires EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see
 * config/keys.ts). Until those are set, calls will fail — the app still works
 * fully offline for signed-out / free-tier users, which never touch this client.
 *
 * flowType: 'pkce' is required for Google sign-in (authService.signInWithGoogle) —
 * the default 'implicit' flow assumes a browser context and can't exchange the
 * OAuth redirect for a session inside a mobile app.
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/config/keys';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
