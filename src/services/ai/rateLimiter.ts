/**
 * services/ai/rateLimiter.ts
 *
 * Tracks daily usage counters for rate-limited AI features. Both counters reset
 * at midnight local time and persist across app launches via AsyncStorage.
 *
 *   imageLog   — diet photo-analysis requests (aiVisionChat calls from DietScreen)
 *   aiMessage  — in-app AI chat messages sent by the user across all screens
 *
 * Callers check the relevant function before making an AI call. On success they
 * call the corresponding record function to increment the counter.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SubscriptionTier } from '@/types/subscription';
import { SUBSCRIPTION_LIMITS } from '@/config/subscriptionLimits';

const IMAGE_LOG_KEY  = 'gymman_rl_image_log';
const AI_MESSAGE_KEY = 'gymman_rl_ai_message';

interface Counter { date: string; count: number }

function todayStr(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

async function getCounter(key: string): Promise<Counter> {
  const today = todayStr();
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { date: today, count: 0 };
    const c = JSON.parse(raw) as Counter;
    return c.date === today ? c : { date: today, count: 0 };
  } catch {
    return { date: today, count: 0 };
  }
}

async function setCounter(key: string, count: number): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify({ date: todayStr(), count }));
}

export async function checkImageLogAllowed(tier: SubscriptionTier): Promise<boolean> {
  const limit = SUBSCRIPTION_LIMITS[tier].dailyImageLogs;
  if (!isFinite(limit)) return true;
  const c = await getCounter(IMAGE_LOG_KEY);
  return c.count < limit;
}

export async function recordImageLog(): Promise<void> {
  const c = await getCounter(IMAGE_LOG_KEY);
  await setCounter(IMAGE_LOG_KEY, c.count + 1);
}

export async function getImageLogCount(): Promise<number> {
  return (await getCounter(IMAGE_LOG_KEY)).count;
}

export async function checkAiMessageAllowed(tier: SubscriptionTier): Promise<boolean> {
  const limit = SUBSCRIPTION_LIMITS[tier].dailyAiMessages;
  if (!isFinite(limit)) return true;
  const c = await getCounter(AI_MESSAGE_KEY);
  return c.count < limit;
}

export async function recordAiMessage(): Promise<void> {
  const c = await getCounter(AI_MESSAGE_KEY);
  await setCounter(AI_MESSAGE_KEY, c.count + 1);
}

export async function getAiMessageCount(): Promise<number> {
  return (await getCounter(AI_MESSAGE_KEY)).count;
}
