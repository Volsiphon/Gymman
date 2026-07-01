/**
 * services/storage/local/masterChatStorage.ts
 *
 * Persists Master Coach chat sessions and the one-time onboarding flag.
 * Sessions accumulate like ChatGPT history — up to 50 stored, newest first.
 * The onboarded flag is set permanently once the user starts their first
 * conversation, so the intro splash never shows again.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_CHATS     = '@gymman:masterChats';
const KEY_ONBOARDED = '@gymman:masterCoachOnboarded';
const KEY_ACTIVE_ID = '@gymman:masterChatActiveId';
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
  const raw = await AsyncStorage.getItem(KEY_ONBOARDED);
  return raw === 'true';
}

export async function setCoachOnboarded(): Promise<void> {
  await AsyncStorage.setItem(KEY_ONBOARDED, 'true');
}

export async function loadMasterChats(): Promise<MasterChat[]> {
  const raw = await AsyncStorage.getItem(KEY_CHATS);
  return raw ? (JSON.parse(raw) as MasterChat[]) : [];
}

export async function saveMasterChat(chat: MasterChat): Promise<void> {
  const all = await loadMasterChats();
  const idx = all.findIndex(c => c.id === chat.id);
  if (idx >= 0) all[idx] = chat;
  else all.unshift(chat);
  await AsyncStorage.setItem(KEY_CHATS, JSON.stringify(all.slice(0, MAX_CHATS)));
}

export async function getActiveChatId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY_ACTIVE_ID);
}

export async function setActiveChatId(id: string): Promise<void> {
  await AsyncStorage.setItem(KEY_ACTIVE_ID, id);
}

export async function deleteMasterChat(id: string): Promise<void> {
  const all = await loadMasterChats();
  await AsyncStorage.setItem(KEY_CHATS, JSON.stringify(all.filter(c => c.id !== id)));
}

export function createMasterChat(): MasterChat {
  return { id: `mc-${Date.now()}`, startedAt: Date.now(), messages: [] };
}
