/**
 * services/ai/client.ts
 *
 * Multi-provider AI client. Every in-app AI feature calls aiChat() (text) or
 * aiVisionChat() (text + photo) — these dispatch to the right backend based on
 * the active subscription tier set via setCurrentTier().
 *
 * Tier → provider mapping:
 *   free    → Groq   (llama-3.3-70b for text, llama-4-scout for vision)
 *   premium → DeepSeek (deepseek-chat for text, Groq vision for images)
 *   ultra   → Anthropic (claude-haiku-4-5 for both text and vision)
 *
 * groqChat / groqVisionChat are also exported directly for onboarding flows
 * that must always use Groq regardless of subscription tier.
 *
 * Call setCurrentTier() from SubscriptionProvider whenever the tier changes so
 * every subsequent aiChat / aiVisionChat call automatically uses the right model.
 */

import { GROQ_API_KEY, DEEPSEEK_API_KEY, ANTHROPIC_API_KEY } from '@/config/keys';
import type { ChatMessage } from '@/types/coaching';
import type { SubscriptionTier } from '@/types/subscription';

export type { ChatMessage };

// ── Tier store ─────────────────────────────────────────────────────────────────

let _tier: SubscriptionTier = 'free';

export function setCurrentTier(tier: SubscriptionTier): void { _tier = tier; }
export function getCurrentTier(): SubscriptionTier { return _tier; }

// ── Groq (Free + vision fallback for Premium) ─────────────────────────────────

const GROQ_BASE    = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const GROQ_VISION  = 'meta-llama/llama-4-scout-17b-16e-instruct';

export async function groqChat(messages: ChatMessage[], maxTokens = 8192): Promise<string> {
  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Groq ${res.status}: ${t}`); }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export async function groqVisionChat(
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  const res = await fetch(GROQ_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
    body: JSON.stringify({
      model: GROQ_VISION,
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
  if (!res.ok) { const t = await res.text(); throw new Error(`Groq vision ${res.status}: ${t}`); }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

// ── DeepSeek (Premium text) ───────────────────────────────────────────────────

const DEEPSEEK_BASE  = 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = 'deepseek-chat';

async function deepseekChat(messages: ChatMessage[], maxTokens = 8192): Promise<string> {
  const res = await fetch(DEEPSEEK_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, max_tokens: maxTokens }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`DeepSeek ${res.status}: ${t}`); }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

// ── Anthropic (Ultra) ─────────────────────────────────────────────────────────

const ANTHROPIC_BASE    = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_MODEL   = 'claude-haiku-4-5-20251001';
const ANTHROPIC_VERSION = '2023-06-01';

async function anthropicChat(messages: ChatMessage[], maxTokens = 4096): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content ?? '';
  const body   = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));

  const res = await fetch(ANTHROPIC_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system, messages: body }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Anthropic ${res.status}: ${t}`); }
  const data = await res.json();
  return data.content[0].text as string;
}

async function anthropicVisionChat(
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  mimeType: string,
): Promise<string> {
  const res = await fetch(ANTHROPIC_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          { type: 'text', text: userText || 'What food is this? Estimate the macros.' },
        ],
      }],
    }),
  });
  if (!res.ok) { const t = await res.text(); throw new Error(`Anthropic vision ${res.status}: ${t}`); }
  const data = await res.json();
  return data.content[0].text as string;
}

// ── Tier-aware public API ─────────────────────────────────────────────────────

export async function aiChat(messages: ChatMessage[], maxTokens?: number): Promise<string> {
  if (_tier === 'ultra')   return anthropicChat(messages, maxTokens);
  if (_tier === 'premium') return deepseekChat(messages, maxTokens);
  return groqChat(messages, maxTokens);
}

export async function aiVisionChat(
  systemPrompt: string,
  userText: string,
  imageBase64: string,
  mimeType: string = 'image/jpeg',
): Promise<string> {
  // Ultra gets Anthropic vision; Free and Premium use Groq vision
  // (DeepSeek does not offer a public vision API)
  if (_tier === 'ultra') return anthropicVisionChat(systemPrompt, userText, imageBase64, mimeType);
  return groqVisionChat(systemPrompt, userText, imageBase64, mimeType);
}
