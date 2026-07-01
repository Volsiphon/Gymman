/**
 * services/storage/local/masterChatStorage.ts
 *
 * Persists Master Coach chat sessions and the one-time onboarding flag.
 * Sessions accumulate like ChatGPT history — up to 50 stored, newest first.
 * The onboarded flag is set permanently once the user starts their first
 * conversation, so the intro splash never shows again.
 */

import { readLocal, writeLocal } from '@/services/storage/localEnvelope';

const KEY_CHATS     = 'masterChats';
const KEY_ONBOARDED = 'masterCoachOnboarded';
const KEY_ACTIVE_ID = 'masterChatActiveId';
const MAX_CHATS     = 50;

export type MasterMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type MasterChat = {
  id: string;
  startedAt: number;
  messages: MasterMessage[];
};

export async function isCoachOnboarded(): Promise<boolean> {
  return (await readLocal<boolean>(KEY_ONBOARDED)) ?? false;
}

export async function setCoachOnboarded(): Promise<void> {
  await writeLocal(KEY_ONBOARDED, true);
}

export async function loadMasterChats(): Promise<MasterChat[]> {
  return (await readLocal<MasterChat[]>(KEY_CHATS)) ?? [];
}

export async function saveMasterChat(chat: MasterChat): Promise<void> {
  const all = await loadMasterChats();
  const idx = all.findIndex(c => c.id === chat.id);
  if (idx >= 0) all[idx] = chat;
  else all.unshift(chat);
  await writeLocal(KEY_CHATS, all.slice(0, MAX_CHATS));
}

export async function getActiveChatId(): Promise<string | null> {
  return readLocal<string>(KEY_ACTIVE_ID);
}

export async function setActiveChatId(id: string): Promise<void> {
  await writeLocal(KEY_ACTIVE_ID, id);
}

export async function deleteMasterChat(id: string): Promise<void> {
  const all = await loadMasterChats();
  await writeLocal(KEY_CHATS, all.filter(c => c.id !== id));
}

export function createMasterChat(): MasterChat {
  return { id: `mc-${Date.now()}`, startedAt: Date.now(), messages: [] };
}
