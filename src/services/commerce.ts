import type { CartItem, Channel, Product, Variant, Voucher } from '../types';

export function money(value: number | string) { return Number(value).toLocaleString('en-US', { maximumFractionDigits: 0 }); }
export function cartTotal(items: CartItem[]) { return items.reduce((total, item) => total + item.variant.price * item.quantity, 0); }
export function eligibleVariant(variant: Variant, quantity: number) {
  return variant.active && Number.isSafeInteger(variant.price) && variant.price >= 0 && Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 100 && quantity <= variant.inventory;
}
export function addCartItem(items: CartItem[], product: Product, variant: Variant, quantity: number) {
  const existing = items.find(item => item.variant.id === variant.id);
  const count = (existing?.quantity ?? 0) + quantity;
  if (!eligibleVariant(variant, count)) throw new Error('Số lượng không hợp lệ hoặc vượt tồn kho hiện tại.');
  return existing ? items.map(item => item.variant.id === variant.id ? { product, variant, quantity: count } : item) : [...items, { product, variant, quantity }];
}
export function voucherData(voucher: Voucher) { return voucher.voucher ?? voucher.voucher_snapshot ?? voucher.data!; }
export function orderPayload(items: CartItem[], channel: Channel, receiver: { name: string; phoneNumber: string; address: string }, note: string, selection?: { id: string; personal: boolean } | null) {
  return { items: items.map(item => ({ variantId: item.variant.id, quantity: item.quantity })), channel, receiver, note, ...(channel === 'flashsale' && selection ? selection.personal ? { grantId: selection.id } : { voucherId: selection.id } : {}) };
}
