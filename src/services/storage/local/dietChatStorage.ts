import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY      = '@gymman:dietChats';
const MAX_CHATS = 50;

export type StoredDietMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionCount?: number;
  // imageUri intentionally omitted — temp URIs don't survive app restarts
};

export type DietChat = {
  id: string;
  title: string;
  startedAt: number;
  messages: StoredDietMessage[];
};

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
