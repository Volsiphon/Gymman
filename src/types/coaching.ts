// ─── AI chat message (used by all AI service calls) ──────────────────────────

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

// ─── Trainer chat storage ─────────────────────────────────────────────────────

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

// ─── Diet chat storage ────────────────────────────────────────────────────────

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
