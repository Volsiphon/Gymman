/**
 * services/ai/whisper.ts  [MVP — voice input]
 *
 * Sends a locally recorded audio file to Groq's Whisper endpoint and returns
 * the plain-text transcript. Uses the same GROQ_API_KEY as the chat client.
 *
 * Model: whisper-large-v3-turbo  (fast, accurate, multilingual)
 * Audio: m4a recorded by expo-av on iOS/Android
 */

import { GROQ_API_KEY } from '@/config/keys';

const WHISPER_URL = 'https://api.groq.com/openai/v1/audio/transcriptions';

export async function transcribeAudio(uri: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', { uri, type: 'audio/m4a', name: 'voice.m4a' } as any);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('response_format', 'text');

  const res = await fetch(WHISPER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: formData,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Whisper ${res.status}: ${t}`);
  }
  return (await res.text()).trim();
}
