// One small API client. The Android app can reuse the same pattern.
const BASE = import.meta.env.VITE_API_URL || '/api';
const KEY = 'elib_token';
export const coverUrl = (id) => `${BASE}/books/${id}/cover`; // real cover image (404 when none exists)

export function getToken() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
export function setToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch { /* storage unavailable */ }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details; // field errors from the backend (Zod)
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong', data.details);
  return data;
}
