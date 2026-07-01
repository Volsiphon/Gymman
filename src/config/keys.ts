/**
 * config/keys.ts
 *
 * API key constants. Keys are read from EXPO_PUBLIC_* environment variables at
 * build time. Add them to your .env file locally and to CI secrets in production
 * — never paste real keys directly in this file.
 *
 * Tier → provider:
 *   free    → Groq
 *   premium → DeepSeek
 *   ultra   → Anthropic
 */

export const GROQ_API_KEY      = process.env['EXPO_PUBLIC_GROQ_API_KEY']      ?? '';
export const DEEPSEEK_API_KEY  = process.env['EXPO_PUBLIC_DEEPSEEK_API_KEY']  ?? '';
export const ANTHROPIC_API_KEY = process.env['EXPO_PUBLIC_ANTHROPIC_API_KEY'] ?? '';

// Supabase project — used by services/storage/cloud/client.ts. The anon key is safe
// to ship in the client bundle; access is enforced server-side via Row Level Security.
export const SUPABASE_URL      = process.env['EXPO_PUBLIC_SUPABASE_URL']      ?? '';
export const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
