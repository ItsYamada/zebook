import * as SecureStore from 'expo-secure-store';
import { API_URL } from './config';

const KEY = 'zebook_token';
let token = null;

export async function loadToken() {
  try { token = await SecureStore.getItemAsync(KEY); } catch { token = null; }
  return token;
}
export async function setToken(value) {
  token = value || null;
  try {
    if (value) await SecureStore.setItemAsync(KEY, value);
    else await SecureStore.deleteItemAsync(KEY);
  } catch { /* storage unavailable */ }
}
export const hasToken = () => Boolean(token);

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details; // field errors from the backend
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000); // cloud apps can wake up slowly
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your internet connection and the API_URL in src/config.js.');
  } finally {
    clearTimeout(timer);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || 'Something went wrong', data.details);
  return data;
}
