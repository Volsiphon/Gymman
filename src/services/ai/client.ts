import { GROQ_API_KEY } from '@/config/keys';

const BASE_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function groqChat(messages: ChatMessage[]): Promise<string> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}

export async function groqVisionChat(
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'text', text: userText || 'What food is this? Estimate the macros.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq vision ${res.status}: ${text}`);
  }

  const data = await res.json();
  return data.choices[0].message.content as string;
}
