import type { SubscriptionTier } from '@/types/subscription';

export interface TierLimits {
  dailyImageLogs: number;   // diet photo-analysis requests (Infinity = unlimited)
  dailyAiMessages: number;  // in-app AI chat messages across all screens (Infinity = unlimited)
  photoSections: number;    // photo section slots, including "General" (Infinity = unlimited)
}

export const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    dailyImageLogs: 1,
    dailyAiMessages: 20,
    photoSections: 1,
  },
  premium: {
    dailyImageLogs: Infinity,
    dailyAiMessages: 200,
    photoSections: 5,
  },
  ultra: {
    dailyImageLogs: Infinity,
    dailyAiMessages: Infinity,
    photoSections: Infinity,
  },
};
