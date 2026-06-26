import { groqChat, type ChatMessage } from './client';
import { loadBloodworkLogs, bloodworkContextString } from '@/services/storage/local/bloodworkStorage';

const BASE_SYSTEM = `You are Gymman Coach — an expert AI fitness and nutrition coach embedded in the Gymman app. You know the user's physical stats, goal, training history, diet logs, and progress.

Help with workouts, nutrition, goal-setting, plan adjustments, and app features. Be direct, practical, and evidence-based. Use metric units. Keep answers concise unless the user asks for depth. When the user wants to change their plan, always confirm with them before finalising.`;

export async function masterCoachChat(history: ChatMessage[]): Promise<string> {
  const logs    = await loadBloodworkLogs();
  const bwCtx   = bloodworkContextString(logs);
  const system  = bwCtx
    ? `${BASE_SYSTEM}\n\nThe user tracks their bloodwork in the app. Use this data when relevant to nutrition, recovery, or health recommendations.${bwCtx}`
    : BASE_SYSTEM;

  return groqChat([{ role: 'system', content: system }, ...history]);
}
