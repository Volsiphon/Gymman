// Fill in your Anthropic API key to enable AI goal analysis.
// Get one at console.anthropic.com
// Do not commit a real key — use environment variables before shipping.
export const ANTHROPIC_API_KEY = '';

// Groq API key for in-app chat (Coach, Diet Coach, Trainer).
// Set EXPO_PUBLIC_GROQ_API_KEY in your .env file — never hardcode here.
export const GROQ_API_KEY = process.env['EXPO_PUBLIC_GROQ_API_KEY'] ?? '';
