import { supabase } from './supabase/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:4000';

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  let token = data.session?.access_token ?? null;
  if (token) return token;

  const { data: refreshed } = await supabase.auth.refreshSession();
  return refreshed.session?.access_token ?? null;
}

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { formData?: FormData } = {}
): Promise<T> {
  const headers = await authHeaders();
  if (!(headers as Record<string, string>).Authorization) {
    throw new ApiError(401, 'Sign in required', { error: 'Sign in required' });
  }

  const init: RequestInit = { ...options };
  if (options.formData) {
    const h = { ...(headers as Record<string, string>) };
    delete h['Content-Type'];
    init.headers = h;
    init.body = options.formData;
  } else {
    init.headers = { ...headers, ...(options.headers || {}) };
  }

  const res = await fetch(`${API_URL}${path}`, init);
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body && 'error' in body
        ? String((body as { error: string }).error)
        : res.statusText;
    throw new ApiError(res.status, msg, body);
  }
  return body as T;
}

export { API_URL };
