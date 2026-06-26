import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@gymman:trainerChats';
const MAX_CHATS = 25;

export interface SavedChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface SavedChat {
  id: string;
  startedAt: number;
  messages: SavedChatMessage[];
}

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
