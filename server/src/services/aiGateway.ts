import { env } from '../config/env.js';
import { ollamaGenerate } from './ollama.js';

export type AiGenerateResult =
  | { ok: true; text: string; provider: 'groq' | 'huggingface' | 'ollama'; model: string }
  | { ok: false; error: string; attempts: Array<{ provider: string; error: string }> };

async function withTimeout<T>(ms: number, fn: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fn(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

async function groqGenerate(prompt: string): Promise<{ text: string; model: string }> {
  if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
  const model = env.GROQ_MODEL;
  const json = await withTimeout(env.AI_TIMEOUT_MS, async (signal) => {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise retail inventory analyst. Use only numbers and SKUs present in the user message. Do not invent data.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const body = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!r.ok) throw new Error(body.error?.message || `Groq HTTP ${r.status}`);
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Groq returned empty content');
    return { text, model };
  });
  return json;
}

async function huggingfaceGenerate(prompt: string): Promise<{ text: string; model: string }> {
  if (!env.HF_TOKEN) throw new Error('HF_TOKEN not configured');
  const model = env.HF_MODEL;
  const json = await withTimeout(env.AI_TIMEOUT_MS, async (signal) => {
    const r = await fetch(`https://router.huggingface.co/v1/chat/completions`, {
      method: 'POST',
      signal,
      headers: {
        Authorization: `Bearer ${env.HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are a precise retail inventory analyst. Use only numbers and SKUs present in the user message. Do not invent data.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const body = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: string | { message?: string };
    };
    if (!r.ok) {
      const msg =
        typeof body.error === 'string'
          ? body.error
          : body.error?.message || `Hugging Face HTTP ${r.status}`;
      throw new Error(msg);
    }
    const text = body.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Hugging Face returned empty content');
    return { text, model };
  });
  return json;
}

/** Provider status for /api/health (no secrets). */
export async function aiGatewayStatus() {
  const ollamaModels = await import('./ollama.js').then((m) => m.listOllamaModels()).catch(() => []);
  return {
    groq: { configured: Boolean(env.GROQ_API_KEY), model: env.GROQ_MODEL },
    huggingface: { configured: Boolean(env.HF_TOKEN), model: env.HF_MODEL },
    ollama: {
      url: env.OLLAMA_URL,
      preferredModel: env.OLLAMA_MODEL,
      reachable: ollamaModels.length > 0,
      models: ollamaModels.slice(0, 8),
    },
    timeoutMs: env.AI_TIMEOUT_MS,
  };
}

/**
 * Groq → Hugging Face → Ollama. Clear error if all fail.
 */
export async function aiGenerate(prompt: string): Promise<AiGenerateResult> {
  const attempts: Array<{ provider: string; error: string }> = [];

  try {
    const r = await groqGenerate(prompt);
    return { ok: true, text: r.text, provider: 'groq', model: r.model };
  } catch (err) {
    attempts.push({ provider: 'groq', error: err instanceof Error ? err.message : String(err) });
  }

  try {
    const r = await huggingfaceGenerate(prompt);
    return { ok: true, text: r.text, provider: 'huggingface', model: r.model };
  } catch (err) {
    attempts.push({
      provider: 'huggingface',
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const ollama = await ollamaGenerate(prompt);
  if (ollama.ok) {
    return { ok: true, text: ollama.text, provider: 'ollama', model: ollama.model };
  }
  attempts.push({ provider: 'ollama', error: ollama.error });

  return {
    ok: false,
    error: `All AI providers failed. ${attempts.map((a) => `${a.provider}: ${a.error}`).join(' | ')}`,
    attempts,
  };
}
