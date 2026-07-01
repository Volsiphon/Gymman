/**
 * services/storage/local/dietChatStorage.ts
 *
 * Persists the history of diet chat conversations — one DietChat per session,
 * up to 50 stored. Each chat has an ID, a title, a timestamp, and the full
 * message thread. This lets the user scroll back and see what the AI recommended
 * in past sessions. The most recent chat is at index 0.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DietChat } from '@/types/coaching';


const KEY      = '@gymman:dietChats';
const MAX_CHATS = 50;

export async function loadDietChats(): Promise<DietChat[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as DietChat[]) : [];
}

export async function saveDietChat(chat: DietChat): Promise<void> {
  const list = await loadDietChats();
  const idx = list.findIndex(c => c.id === chat.id);
  if (idx >= 0) list[idx] = chat;
  else list.unshift(chat);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_CHATS)));
}

export async function deleteDietChat(id: string): Promise<void> {
  const list = await loadDietChats();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter(c => c.id !== id)));
}
