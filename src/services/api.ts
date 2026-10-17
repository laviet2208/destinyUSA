import { Platform } from 'react-native';

export const apiBase = (process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : __DEV__ ? Platform.OS === 'android' ? 'http://10.0.2.2:4100' : 'http://127.0.0.1:4100' : '')).replace(/\/$/, '');
let sessionToken: string | null = null;
let sessionGeneration = 0;
let expired: (() => void) | undefined;
export function setApiSession(token: string | null, onExpired?: () => void) { sessionToken = token; sessionGeneration += 1; expired = onExpired; }
export function getApiToken() { return sessionToken; }
export function captureApiSession() { return { token: sessionToken, generation: sessionGeneration }; }
export function isApiSessionCurrent(session: ReturnType<typeof captureApiSession>) { return session.token === sessionToken && session.generation === sessionGeneration; }
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function api<Result = any>(path: string, method = 'GET', body?: unknown, key?: string, signal?: AbortSignal): Promise<Result> {
  if (!apiBase) throw new Error('Chưa cấu hình EXPO_PUBLIC_API_URL cho ứng dụng.');
  const session = captureApiSession();
  const onExpired = expired;
  const headers: Record<string, string> = {};
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  if (key) headers['Idempotency-Key'] = key;
  const multipart = body instanceof FormData;
  if (body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  const controller = new AbortController();
  const abort = () => controller.abort();
  let timedOut = false;
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);
  try {
    const response = await fetch(`${apiBase}/api${path}`, { method, headers, body: body === undefined ? undefined : multipart ? body : JSON.stringify(body), signal: controller.signal });
    let result;
    try { result = await response.json(); }
    catch { if (response.ok) throw new Error('Phản hồi máy chủ không hợp lệ. Vui lòng thử lại.'); result = {}; }
    if (!response.ok) {
      if (response.status === 401 && path !== '/auth/login' && path !== '/auth/verify-password' && isApiSessionCurrent(session)) onExpired?.();
      throw new ApiError(result?.message || `Không kết nối được máy chủ (${response.status})`, response.status);
    }
    if (!result || typeof result !== 'object') throw new Error('Phản hồi máy chủ không hợp lệ. Vui lòng thử lại.');
    return result;
  } catch (failure) {
    if (timedOut) throw new Error('Máy chủ phản hồi quá lâu. Nội dung được giữ lại để thử lại.');
    throw failure;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
export function mediaUrl(value?: string) {
  if (!value) return '';
  if (value.startsWith('/')) return `${apiBase}${value}`;
  try { const url = new URL(value); if (/^\/api\/media\/[a-f0-9]{64}$/.test(url.pathname)) return `${apiBase}${url.pathname}`; } catch {}
  return value;
}
