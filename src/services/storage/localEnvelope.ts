/**
 * services/storage/localEnvelope.ts
 *
 * Shared low-level read/write primitive for every file in services/storage/local/.
 * The database is the source of truth for a signed-in user — every domain (routine,
 * diet, bloodwork, cal burn, photo metadata, progress, account/profile, targets)
 * reads and writes straight to Supabase's `user_data` table (user_id, domain, payload),
 * RLS-scoped so it's only ever reachable from that specific account. AsyncStorage is
 * purely a write-through cache: it makes the app open instantly and tolerate being
 * briefly offline, but it is never the source of truth and never needs conflict
 * resolution — the server always wins when reachable.
 *
 * Two rules exist specifically to stop different accounts on the same device from
 * ever seeing each other's data (a real bug that shipped earlier this session):
 *   1. Cache keys are scoped by userId ('@gymman:<userId>:<name>' when signed in,
 *      '@gymman:<name>' only for the signed-out pre-login staging area). A second
 *      account on the same phone gets its own empty cache, not the first account's.
 *   2. A cloud read that *succeeds* and finds no row is the real, final answer —
 *      "this account has nothing here yet" — and returns null immediately. It does
 *      NOT fall back to the cache. Only a genuine failure to reach the cloud at all
 *      (offline, thrown/network error) falls back to this account's own cache, best
 *      effort. Conflating "successfully confirmed empty" with "couldn't check" was
 *      the actual bug: a brand-new account's empty cloud result was falling through
 *      to a shared cache that still held the previous account's cached profile —
 *      RootNavigator would then see a "profile" and skip onboarding for someone who
 *      had never touched the app.
 *
 * Who's signed in is read fresh via supabase.auth.getSession() on every call rather
 * than a value pushed from AuthProvider — that's an in-memory read on the same client
 * that processes sign-in/out (no network round trip), and it means callers that check
 * "does this account already have a profile" immediately after a successful sign-in
 * (LoginScreen) always see the right session, with no ordering dependency on
 * AuthProvider's own state updates.
 *
 * legacyKeys lets each domain file name the old raw AsyncStorage key(s) it used before
 * this cloud-backed model existed (or before the even older '@gymman:' prefix cleanup).
 * Checked only once nothing else has answered (no cloud row reachable *and* no cache
 * hit) — found data is migrated forward automatically: cached under the new key and
 * pushed to the cloud if signed in. No user-facing prompt; there's no separate
 * "identity" to ask about merging with anymore.
 *
 * Offline writes: if a cloud upsert fails (no network, most likely), the write already
 * landed in the local cache — the UI never sees a failure — but it's also queued in
 * pendingWrites so it isn't silently lost. The queue drains automatically: after any
 * later successful cloud read/write (proves connectivity), and whenever the app comes
 * back to the foreground. No manual "sync now" trigger needed. Queue entries are tagged
 * with the userId that made them and only ever flushed while that same account is the
 * one signed in — a pending write never gets pushed under a different account's session
 * if someone signs out before reconnecting. This is deliberately simple: no retry
 * backoff, no attempt limit — a write that fails for a non-connectivity reason (e.g. a
 * genuinely rejected payload) just stays queued and gets retried every time the queue
 * flushes, which is harmless but also not smart about giving up.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { supabase } from './cloud/client';

async function getActiveUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

function cacheKey(userId: string | null, name: string): string {
  return userId ? `@gymman:${userId}:${name}` : `@gymman:${name}`;
}

async function readCache<T>(userId: string | null, key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(cacheKey(userId, key));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[localEnvelope] corrupted cache at "${key}", ignoring`);
    return null;
  }
}

async function writeCache<T>(userId: string | null, key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(cacheKey(userId, key), JSON.stringify(data));
}

async function readLegacy<T>(legacyKeys: string[]): Promise<T | null> {
  for (const legacyKey of legacyKeys) {
    const raw = await AsyncStorage.getItem(legacyKey);
    if (!raw) continue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      console.warn(`[localEnvelope] corrupted legacy data at "${legacyKey}", skipping`);
    }
  }
  return null;
}

// ── Offline write queue ─────────────────────────────────────────────────────────

type PendingWrite = { userId: string; domain: string; payload: unknown };

const PENDING_WRITES_KEY = '@gymman:pendingWrites';

async function loadPendingWrites(): Promise<PendingWrite[]> {
  const raw = await AsyncStorage.getItem(PENDING_WRITES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PendingWrite[];
  } catch {
    return [];
  }
}

async function savePendingWrites(writes: PendingWrite[]): Promise<void> {
  await AsyncStorage.setItem(PENDING_WRITES_KEY, JSON.stringify(writes));
}

async function queuePendingWrite(userId: string, domain: string, payload: unknown): Promise<void> {
  const writes = await loadPendingWrites();
  const idx = writes.findIndex(w => w.userId === userId && w.domain === domain);
  const entry: PendingWrite = { userId, domain, payload };
  if (idx >= 0) writes[idx] = entry; // only the latest write for this domain matters
  else writes.push(entry);
  await savePendingWrites(writes);
}

async function pushToCloud(userId: string, domain: string, payload: unknown): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_data').upsert({
      user_id: userId,
      domain,
      payload,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Retries every write that failed while offline, for whichever account is currently
 * signed in. Called automatically — after a successful cloud read/write, and when the
 * app returns to the foreground (see AppState listener below). No manual trigger needed.
 */
export async function flushPendingWrites(): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;

  const writes = await loadPendingWrites();
  const mine = writes.filter(w => w.userId === userId);
  if (mine.length === 0) return;

  const stillPending = writes.filter(w => w.userId !== userId);
  for (const w of mine) {
    const ok = await pushToCloud(w.userId, w.domain, w.payload);
    if (!ok) stillPending.push(w);
  }
  await savePendingWrites(stillPending);
}

AppState.addEventListener('change', state => {
  if (state === 'active') {
    flushPendingWrites().catch(err => console.warn('[localEnvelope] flushPendingWrites failed', err));
  }
});

// ── Public API ───────────────────────────────────────────────────────────────────

export async function readLocal<T>(key: string, legacyKeys?: string[]): Promise<T | null> {
  const userId = await getActiveUserId();

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('payload')
        .eq('user_id', userId)
        .eq('domain', key)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        await writeCache(userId, key, data.payload as T);
        flushPendingWrites().catch(() => {}); // opportunistic: a successful read proves we're online
        return data.payload as T;
      }

      // Query succeeded and found nothing — that IS the answer: this account has no
      // data here yet. Never fall back to a cache that could belong to another
      // account that used this device before.
      return null;
    } catch (err) {
      console.warn(`[localEnvelope] cloud read failed for "${key}", falling back to this account's cache`, err);
      // Genuinely couldn't reach the cloud — best-effort fall back to this SAME
      // account's own cached copy (cache key is scoped by userId, so this can never
      // return a different account's data).
      const cached = await readCache<T>(userId, key);
      if (cached !== null) return cached;
    }
  } else {
    const cached = await readCache<T>(null, key);
    if (cached !== null) return cached;
  }

  if (legacyKeys?.length) {
    const legacy = await readLegacy<T>(legacyKeys);
    if (legacy !== null) {
      await writeLocal(key, legacy); // migrates forward: cache + push to cloud if signed in
      return legacy;
    }
  }

  return null;
}

export async function writeLocal<T>(key: string, data: T): Promise<void> {
  const userId = await getActiveUserId();
  await writeCache(userId, key, data);

  if (!userId) return;

  const ok = await pushToCloud(userId, key, data);
  if (!ok) {
    await queuePendingWrite(userId, key, data);
    console.warn(`[localEnvelope] cloud write failed for "${key}", queued for retry`);
  } else {
    flushPendingWrites().catch(() => {}); // opportunistic: drain any older backlog too
  }
}
