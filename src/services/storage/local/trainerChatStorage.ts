/**
 * services/storage/local/trainerChatStorage.ts
 *
 * Persists saved trainer chat sessions. Each SavedChat is a named conversation
 * thread where the user built or modified a workout routine with the AI trainer.
 * Up to 50 chats are kept. The Training screen lists these so the user can
 * pick up any past coaching session and continue from where they left off.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedChat } from '@/types/coaching';


const KEY = '@gymman:trainerChats';
const MAX_CHATS = 25;

export async function loadSavedChats(): Promise<SavedChat[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SavedChat[]) : [];
}

export async function upsertSavedChat(chat: SavedChat): Promise<void> {
  const list = await loadSavedChats();
  const idx = list.findIndex((c) => c.id === chat.id);
  if (idx >= 0) list[idx] = chat;
  else list.unshift(chat);
  await AsyncStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_CHATS)));
}

export async function deleteSavedChat(id: string): Promise<void> {
  const list = await loadSavedChats();
  await AsyncStorage.setItem(KEY, JSON.stringify(list.filter((c) => c.id !== id)));
}
