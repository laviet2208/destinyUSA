import * as SecureStore from 'expo-secure-store';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import type { CartItem, Channel } from '../types';
import { orderPayload } from './commerce';

export type PendingOrder = { accountId: string; key: string; body: ReturnType<typeof orderPayload>; source: 'cart' | 'buyNow'; lines: { name: string; variant: string; image: string; quantity: number; price: number }[] };
type StoredOrder = { version: 1; id: string; chunks: number };
const queues = new Map<string, Promise<void>>();

async function storageKey(accountId: string) { return `destiny.pending-order.${await digestStringAsync(CryptoDigestAlgorithm.SHA256, accountId)}`; }

async function serialized<Result>(accountId: string, operation: () => Promise<Result>): Promise<Result> {
  if (!accountId) throw new Error('Thiếu tài khoản cho đơn hàng đang chờ.');
  const previous = queues.get(accountId) ?? Promise.resolve();
  const task = previous.then(operation);
  const completed = task.then(() => {}, () => {});
  queues.set(accountId, completed);
  try { return await task; } finally { if (queues.get(accountId) === completed) queues.delete(accountId); }
}

function manifest(value: unknown): value is StoredOrder {
  if (!value || typeof value !== 'object') return false;
  const stored = value as StoredOrder;
  return stored.version === 1 && typeof stored.id === 'string' && /^[a-zA-Z0-9-]+$/.test(stored.id) && Number.isSafeInteger(stored.chunks) && stored.chunks > 0 && stored.chunks <= 10000;
}

async function removeChunks(base: string, value: StoredOrder) {
  for (let offset = 0; offset < value.chunks; offset += 16) await Promise.allSettled(Array.from({ length: Math.min(16, value.chunks - offset) }, (_, index) => SecureStore.deleteItemAsync(`${base}.${value.id}.${offset + index}`)));
}

async function readStoredOrder(accountId: string): Promise<PendingOrder | null> {
  const base = await storageKey(accountId);
  const stored = await SecureStore.getItemAsync(base);
  if (!stored) return null;
  const parsed: unknown = JSON.parse(stored);
  let value = parsed as PendingOrder;
  if (manifest(parsed)) {
    const chunks: string[] = [];
    for (let offset = 0; offset < parsed.chunks; offset += 16) {
      const batch = await Promise.all(Array.from({ length: Math.min(16, parsed.chunks - offset) }, (_, index) => SecureStore.getItemAsync(`${base}.${parsed.id}.${offset + index}`)));
      if (batch.some(chunk => chunk === null)) throw new Error('Không đọc được đầy đủ đơn hàng đang chờ. Vui lòng thử lại.');
      chunks.push(...batch as string[]);
    }
    value = JSON.parse(chunks.join('')) as PendingOrder;
  }
  if (!value || value.accountId !== accountId || typeof value.key !== 'string' || !value.key || !value.body || !Array.isArray(value.body.items) || !Array.isArray(value.lines) || !['cart', 'buyNow'].includes(value.source)) throw new Error('Dữ liệu đơn hàng đang chờ không hợp lệ.');
  return value;
}

export function readPendingOrder(accountId: string): Promise<PendingOrder | null> { return serialized(accountId, () => readStoredOrder(accountId)); }

export async function savePendingOrder(accountId: string, body: PendingOrder['body'], items: CartItem[], source: PendingOrder['source']): Promise<PendingOrder> {
  return serialized(accountId, async () => {
    const current = await readStoredOrder(accountId);
    if (current) {
      if (JSON.stringify(current.body) !== JSON.stringify(body)) throw new Error('Có đơn hàng đang chờ xác nhận. Hãy thử lại đơn đó trước khi tạo đơn mới.');
      return current;
    }
    const pending: PendingOrder = { accountId, key: randomUUID(), body: JSON.parse(JSON.stringify(body)), source, lines: items.map(item => ({ name: item.product.name, variant: item.variant.name, image: item.variant.image || item.product.images[0] || '', quantity: item.quantity, price: item.variant.price })) };
    const base = await storageKey(accountId);
    const points = Array.from(JSON.stringify(pending));
    const chunks = Array.from({ length: Math.ceil(points.length / 400) }, (_, index) => points.slice(index * 400, (index + 1) * 400).join(''));
    const stored: StoredOrder = { version: 1, id: randomUUID(), chunks: chunks.length };
    try {
      for (let offset = 0; offset < chunks.length; offset += 16) {
        const results = await Promise.allSettled(chunks.slice(offset, offset + 16).map((chunk, index) => SecureStore.setItemAsync(`${base}.${stored.id}.${offset + index}`, chunk)));
        const failed = results.find(result => result.status === 'rejected');
        if (failed?.status === 'rejected') throw failed.reason;
      }
      await SecureStore.setItemAsync(base, JSON.stringify(stored));
      return pending;
    } catch (failure) { await removeChunks(base, stored); throw failure; }
  });
}

export function clearPendingOrder(accountId: string, expectedKey?: string) {
  return serialized(accountId, async () => {
    const current = await readStoredOrder(accountId);
    if (!current || expectedKey && current.key !== expectedKey) return false;
    const base = await storageKey(accountId);
    const stored: unknown = JSON.parse((await SecureStore.getItemAsync(base))!);
    await SecureStore.deleteItemAsync(base);
    if (manifest(stored)) await removeChunks(base, stored);
    return true;
  });
}
