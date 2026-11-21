import { env } from '../config/env.js';

const FALLBACK_MODELS = ['gemma3:4b', 'mistral:latest', 'mistral', 'llama3.2', 'llama3'];

export async function listOllamaModels(): Promise<string[]> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 4000);
  try {
    const r = await fetch(`${env.OLLAMA_URL}/api/tags`, { signal: ctrl.signal });
    if (!r.ok) return [];
    const json = (await r.json()) as { models?: Array<{ name?: string }> };
    return (json.models || []).map((m) => String(m.name || '')).filter(Boolean);
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}

async function pickModel(): Promise<string | null> {
  const available = await listOllamaModels();
  if (!available.length) return null;
  if (available.includes(env.OLLAMA_MODEL)) return env.OLLAMA_MODEL;
  // exact prefix match e.g. mistral → mistral:latest
  const preferred = available.find((n) => n === env.OLLAMA_MODEL || n.startsWith(`${env.OLLAMA_MODEL}:`));
  if (preferred) return preferred;
  for (const name of FALLBACK_MODELS) {
    const hit = available.find((n) => n === name || n.startsWith(`${name}:`) || name.startsWith(`${n}:`));
    if (hit) return hit;
  }
  return available[0];
}

export async function ollamaGenerate(prompt: string): Promise<{ ok: true; text: string; model: string } | { ok: false; error: string }> {
  const model = await pickModel();
  if (!model) {
    return {
      ok: false,
      error: `Ollama has no models at ${env.OLLAMA_URL}. Run: ollama pull gemma3:4b`,
    };
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90_000);
  try {
    const r = await fetch(`${env.OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      return { ok: false, error: `Ollama ${r.status} for model ${model}: ${body.slice(0, 200)}` };
    }
    const json = (await r.json()) as { response?: string };
    return { ok: true, text: json.response?.trim() || '', model };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/abort/i.test(msg)) {
      return { ok: false, error: `Ollama timed out using ${model}. Try a smaller model.` };
    }
    return { ok: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}
