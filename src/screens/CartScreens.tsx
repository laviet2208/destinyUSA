import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, ChevronRight, MapPin, Minus, Plus, ShieldCheck, Ticket, Trash2, Wallet } from 'lucide-react-native';
import { useIsFocused, usePreventRemove } from '@react-navigation/native';
import { AppText, BottomAction, Button, Divider, EmptyState, Field, Header, IconButton, LoadingState, Notice, ProductImage, Screen } from '../ui/components';
import { CommerceFooter } from '../ui/CommerceFooter';
import { BottomSheet, PageSection, SegmentedControl } from '../ui/commerce';
import { colors, touchTarget } from '../ui/theme';
import { useMobile } from '../state/MobileContext';
import { useResource } from '../hooks/useResource';
import { api, ApiError, captureApiSession, isApiSessionCurrent, mediaUrl } from '../services/api';
import { cartTotal, eligibleVariant, money, orderPayload, voucherData } from '../services/commerce';
import { clearPendingOrder, readPendingOrder, savePendingOrder, type PendingOrder } from '../services/pending-order';
import type { CartItem, Channel, Product, Voucher, VoucherSelection } from '../types';

export function VoucherPicker({ channel, selection, onSelect, close }: { channel: Channel; selection: VoucherSelection | null; onSelect: (value: VoucherSelection | null) => void; close: () => void }) {
  const { t } = useMobile(); const resource = useResource<{ items: Voucher[]; grants: Voucher[] }>(channel === 'flashsale' ? '/vouchers?channel=flashsale' : null);
  const choices = [...(resource.data?.grants ?? []).filter(item => item.scope === 'flashsale' && !item.used_at && !item.revoked_at).map(voucher => ({ id: voucher.id, personal: true, voucher })), ...(resource.data?.items ?? []).filter(item => item.scope === 'flashsale' && item.active).map(voucher => ({ id: voucher.id, personal: false, voucher }))];
  if (channel !== 'flashsale') return null;
  return <BottomSheet visible title={t('selectVoucher')} closeLabel={t('close')} onClose={close}>
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: !selection }} onPress={() => { onSelect(null); close(); }} style={styles.voucherRow}><AppText style={styles.voucherChoice}>{t('noVoucher')}</AppText>{!selection && <Check size={18} color={colors.primary}/>}</Pressable>
    {resource.loading && <LoadingState/>}{resource.error && <><Notice message={resource.error} danger/><Button title={t('tryAgain')} onPress={resource.refresh}/></>}
    {choices.map(choice => { const data = voucherData(choice.voucher); return <Pressable key={`${choice.personal}:${choice.id}`} style={styles.voucherRow} accessibilityRole="radio" accessibilityState={{ checked: selection?.id === choice.id }} onPress={() => { onSelect(choice); close(); }}><View style={styles.pickerIcon}><Ticket size={21} strokeWidth={1.5} color={colors.primary}/></View><View style={styles.voucherChoice}><AppText variant="label">{data.eventName || data.code || choice.id}</AppText><AppText muted variant="caption">{money(data.Money)}{data.type === 0 ? '%' : ' USDT'} · {t(choice.personal ? 'individualVoucher' : 'generalVoucher')}</AppText></View>{selection?.id === choice.id && <Check color={colors.primary} size={18}/>}</Pressable>; })}
    {!resource.loading && !resource.error && !choices.length && <EmptyState title={t('thereAreNotVoucherInHere')}/>}
  </BottomSheet>;
}
export function CartScreen({ navigation, route }: any) {
  const { account, carts, t, updateCart, removeCart } = useMobile();
  const channel: Channel = route.params?.channel ?? (route.name === 'cart_sale_screen' ? 'flashsale' : 'regular');
  const isolated = route.name === 'cart_for_buy_now_screen';
  const [isolatedItems, setIsolatedItems] = useState<CartItem[]>(route.params?.items ?? []);
  const items = isolated ? isolatedItems : carts[channel]; const [selection, setSelection] = useState<VoucherSelection | null>(null); const [picker, setPicker] = useState(false); const [busy, setBusy] = useState('');
  const change = async (item: CartItem, quantity: number) => {
    setBusy(item.variant.id); const session = captureApiSession();
    try {
      if (!isolated) await updateCart(channel, item.variant.id, quantity);
      else { const product = await api<Product>(`/products/${encodeURIComponent(item.product.id)}`); const variant = product.variants.find(row => row.id === item.variant.id); if (!isApiSessionCurrent(session)) return; if (!variant || !eligibleVariant(variant, quantity)) throw new Error(t('notEnoughStock')); setIsolatedItems(previous => previous.map(row => row.variant.id === variant.id ? { product, variant, quantity } : row)); }
    } catch (failure) { if (isApiSessionCurrent(session)) Alert.alert(t('loadError'), (failure as Error).message); } finally { setBusy(''); }
  };
  const remove = (id: string) => isolated ? setIsolatedItems(previous => previous.filter(item => item.variant.id !== id)) : removeCart(channel, [id]);
  const clearAll = () => Alert.alert(t('clearCart'), t('clearCartConfirm'), [{ text: t('cancel'), style: 'cancel' }, { text: t('remove'), style: 'destructive', onPress: () => { if (isolated) setIsolatedItems([]); else removeCart(channel, items.map(item => item.variant.id)); } }]);
  return <Screen scroll={false}>
    <Header title={t('cart')} onBack={isolated || channel === 'flashsale' ? () => navigation.goBack() : undefined} action={account && items.length > 0 ? <IconButton label={t('clearCart')} onPress={clearAll} disabled={Boolean(busy)}><Trash2 size={19} color={colors.text}/></IconButton> : undefined}/>
    {!isolated && <SegmentedControl items={(['regular', 'flashsale'] as const).map(value => ({ value, label: t(value === 'regular' ? 'normalCart' : 'flashCart') }))} value={channel} disabled={Boolean(busy)} onChange={value => { if (channel === value) return; if (value === 'regular') navigation.navigate('main_screen', { screen: 'cart_page' }, { pop: true }); else navigation.navigate('cart_sale_screen'); }}/>}
    {!account ? <View style={styles.guestContent}><EmptyState title={t('loginRequired')} action={t('login')} onPress={() => navigation.navigate('welcome_screen')}/></View> : <>
      <FlatList data={items} keyExtractor={item => item.variant.id} contentContainerStyle={styles.list} ItemSeparatorComponent={Divider}
        ListHeaderComponent={items.length > 0 ? <View style={styles.cartHeading}><AppText variant="label">{items.reduce((sum, item) => sum + item.quantity, 0)} {t('products')}</AppText><AppText muted variant="caption">{t(channel === 'regular' ? 'normalCart' : 'flashCart')}</AppText></View> : null}
        renderItem={({ item }) => <View style={styles.cartRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={item.product.name} onPress={() => navigation.navigate('product_view_screen', { id: item.product.id, channel })}><ProductImage uri={mediaUrl(item.variant.image || item.product.images[0])} label={item.product.name} inset={6} style={styles.thumb}/></Pressable>
          <View style={styles.cartInfo}><AppText variant="label" numberOfLines={2}>{item.product.name}</AppText><AppText muted style={styles.variantText}>{item.variant.name}</AppText><View style={styles.rowBottom}><AppText variant="cardPrice" style={styles.cartPrice}>{money(item.variant.price)} USDT</AppText><Pressable accessibilityRole="button" accessibilityLabel={t('removeItem')} disabled={Boolean(busy)} onPress={() => remove(item.variant.id)} style={styles.deleteButton}><Trash2 color={colors.muted} size={16}/></Pressable></View><View style={styles.quantity}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${t('remove')} ${t('quantity')}`} disabled={Boolean(busy) || item.quantity <= 1} onPress={() => void change(item, item.quantity - 1)} style={styles.quantityButton}><Minus size={15} color={busy || item.quantity <= 1 ? colors.disabled : colors.primary}/></Pressable><AppText variant="label" style={styles.quantityValue}>{item.quantity}</AppText><Pressable accessibilityRole="button" accessibilityLabel={`${t('addToCart')} ${t('quantity')}`} disabled={Boolean(busy) || item.quantity >= item.variant.inventory || item.quantity >= 100} onPress={() => void change(item, item.quantity + 1)} style={styles.quantityButton}><Plus size={15} color={busy || item.quantity >= item.variant.inventory || item.quantity >= 100 ? colors.disabled : colors.primary}/></Pressable>
          </View></View>
        </View>}
        ListFooterComponent={items.length > 0 ? <View style={styles.cartFooter}>{channel === 'flashsale' && <Pressable accessibilityRole="button" style={styles.voucherButton} onPress={() => setPicker(true)}><Ticket size={21} strokeWidth={1.5} color={colors.primary}/><View style={styles.voucherChoice}><AppText variant="label">{selection ? voucherData(selection.voucher).eventName || selection.id : t('selectVoucher')}</AppText>{selection && <AppText style={styles.purple}>{money(voucherData(selection.voucher).Money)}{voucherData(selection.voucher).type === 0 ? '%' : ' USDT'}</AppText>}</View><ChevronRight size={17} color={colors.muted}/></Pressable>}<View style={styles.summary}><View style={styles.total}><AppText muted>{t('subTotal')}</AppText><AppText variant="label">{money(cartTotal(items))} USDT</AppText></View><View style={styles.summaryTotal}><AppText variant="label">{t('total')}</AppText><AppText style={styles.summaryPrice}>{money(cartTotal(items))} USDT</AppText></View></View></View> : null}
        ListEmptyComponent={<EmptyState title={t('emptyCart')} action={t('products')} onPress={() => channel === 'regular' ? navigation.navigate('main_screen', { screen: 'main_page' }, { pop: true }) : navigation.navigate('flash_sale_screen')}/>}/>
      {items.length > 0 && <BottomAction><View style={styles.total}><AppText muted>{t('total')}</AppText><AppText style={styles.dockPrice}>{money(cartTotal(items))} USDT</AppText></View><Button title={t('checkout')} icon={<ChevronRight size={17} color={colors.background}/>} disabled={Boolean(busy)} onPress={() => navigation.navigate(isolated ? 'check_out_buy_now_screen' : 'check_out_screen', { channel, selection, ...(isolated ? { items: isolatedItems } : {}) })}/></BottomAction>}
    </>}
    {channel === 'flashsale' && picker && <VoucherPicker channel={channel} selection={selection} onSelect={setSelection} close={() => setPicker(false)}/>}
    {!isolated && route.name !== 'cart_page' && <CommerceFooter active="cart_page"/>}
  </Screen>;
}
export function CheckoutScreen({ navigation, route }: any) {
  const { account, carts, t, removeCart, refresh, refreshAccount } = useMobile();
  const channel: Channel = route.params?.channel ?? 'regular';
  const isolated: CartItem[] | undefined = route.params?.items;
  const items = isolated ?? carts[channel];
  const [name, setName] = useState(`${account?.first_name ?? ''} ${account?.last_name ?? ''}`.trim());
  const [phoneNumber, setPhone] = useState(account?.phone ?? ''); const [address, setAddress] = useState(account?.address ?? ''); const [note, setNote] = useState('');
  const [selection, setSelection] = useState<VoucherSelection | null>(channel === 'flashsale' ? route.params?.selection ?? null : null); const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [pending, setPending] = useState<PendingOrder | null>(null);
  const submitting = useRef(false); const focused = useIsFocused();
  useEffect(() => { if (account) readPendingOrder(account.id).then(setPending).catch(failure => setError(failure.message)); }, [account?.id, focused]);
  usePreventRemove(busy, ({ data }) => { if (!submitting.current) navigation.dispatch(data.action); });
  const total = pending ? pending.lines.reduce((sum, item) => sum + item.quantity * item.price, 0) : cartTotal(items);
  const submit = async () => {
    if (!account || submitting.current) return;
    const session = captureApiSession();
    let request: PendingOrder | null = null;
    submitting.current = true; setBusy(true); setError('');
    try {
      request = pending ?? await savePendingOrder(account.id, orderPayload(items, channel, { name, phoneNumber, address }, note, selection), items, isolated ? 'buyNow' : 'cart');
      if (!isApiSessionCurrent(session)) return;
      setPending(request);
      const result = await api<{ id: string }>('/orders', 'POST', request.body, request.key);
      if (!result.id || typeof result.id !== 'string') throw new Error(t('loadError'));
      await clearPendingOrder(account.id, request.key);
      if (!isApiSessionCurrent(session)) return;
      setPending(null);
      if (request.source === 'cart') removeCart(request.body.channel, request.body.items.map(item => item.variantId));
      await refreshAccount().catch(() => {}); refresh(); submitting.current = false;
      if (!isApiSessionCurrent(session)) return;
      navigation.replace('order_detail_screen', { id: result.id });
    } catch (failure) {
      if (request && failure instanceof ApiError && failure.status >= 400 && failure.status < 500) { await clearPendingOrder(account.id, request.key); if (isApiSessionCurrent(session)) setPending(null); }
      if (!isApiSessionCurrent(session)) return;
      setError((failure as Error).message);
    } finally { submitting.current = false; setBusy(false); }
  };
  if (!account) return <Screen><EmptyState title={t('loginRequired')} action={t('login')} onPress={() => navigation.navigate('welcome_screen')}/></Screen>;
  return <Screen scroll={false}><Header title={t('checkout')} onBack={() => navigation.goBack()} action={<ShieldCheck size={21} strokeWidth={1.6} color={colors.primary}/>}/>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.checkout}>
      {pending ? <PageSection title={t('retry')}><Notice message={t('retry')}/>{pending.lines.map((item, index) => <View key={index} style={styles.checkoutLine}><AppText variant="label" style={styles.voucherChoice}>{item.name} · {item.variant} × {item.quantity}</AppText><AppText variant="label">{money(item.price * item.quantity)} USDT</AppText></View>)}<AppText>{pending.body.receiver.name} · {pending.body.receiver.phoneNumber}</AppText><AppText muted>{pending.body.receiver.address}</AppText></PageSection> : <>
        <PageSection title={t('address')} action={<MapPin size={18} color={colors.primary}/>}><Field label={t('name')} value={name} onChangeText={setName} editable={!busy} autoComplete="name"/><Field label={t('phone')} value={phoneNumber} onChangeText={setPhone} editable={!busy} keyboardType="phone-pad" autoComplete="tel"/><Field label={t('address')} value={address} onChangeText={setAddress} editable={!busy} autoComplete="street-address" maxLength={1000}/><Field label={t('note')} value={note} onChangeText={setNote} editable={!busy} multiline maxLength={2000}/></PageSection>
        <PageSection title={t('products')}>{items.map(item => <View style={styles.checkoutLine} key={item.variant.id}><ProductImage uri={mediaUrl(item.variant.image || item.product.images[0])} label={item.product.name} inset={6} style={styles.checkoutThumb}/><View style={styles.productSummary}><AppText variant="label" numberOfLines={2}>{item.product.name}</AppText><AppText muted style={styles.variantText}>{item.variant.name} · × {item.quantity}</AppText><AppText variant="cardPrice" style={styles.linePrice}>{money(item.quantity * item.variant.price)} USDT</AppText></View></View>)}</PageSection>
        <PageSection title={t('paymentInformation')}><View style={styles.walletPayment}><Wallet size={23} strokeWidth={1.5} color={colors.primary}/><View style={styles.voucherChoice}><AppText variant="label">{t('yourWallet')}</AppText><AppText muted variant="caption">{money(account.balance)} USDT</AppText></View><Check size={19} color={colors.primary}/></View>{channel === 'flashsale' && <Pressable accessibilityRole="button" style={styles.voucherButton} onPress={() => setPicker(true)} disabled={busy}><Ticket size={20} color={colors.primary}/><AppText variant="label" style={styles.voucherChoice}>{selection ? voucherData(selection.voucher).eventName || selection.id : t('selectVoucher')}</AppText><ChevronRight size={17} color={colors.muted}/></Pressable>}<View style={styles.summaryTotal}><AppText variant="label">{t('total')}</AppText><AppText style={styles.summaryPrice}>{money(total)} USDT</AppText></View></PageSection>
      </>}
      {error && <View style={styles.error}><Notice message={error} danger/></View>}
    </ScrollView>
    <BottomAction><View style={styles.total}><AppText muted>{t('total')}</AppText><AppText style={styles.dockPrice}>{money(total)} USDT</AppText></View><Button title={pending ? t('retry') : t('confirmAndPay')} onPress={() => void submit()} loading={busy} disabled={!pending && (!items.length || !name.trim() || !phoneNumber.trim() || !address.trim())}/></BottomAction>
    {channel === 'flashsale' && picker && <VoucherPicker channel={channel} selection={selection} onSelect={setSelection} close={() => setPicker(false)}/>}
  </Screen>;
}

const styles = StyleSheet.create({
  guestContent: { flex: 1, justifyContent: 'center' },
  list: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 26 }, cartHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginVertical: 13 },
  cartRow: { flexDirection: 'row', gap: 12, paddingVertical: 14 }, cartInfo: { flex: 1, minWidth: 0, gap: 4 }, thumb: { width: 82, height: 86, borderRadius: 11, backgroundColor: '#F6F2F9' },
  variantText: { fontSize: 10, lineHeight: 15, color: '#9A8F9F' }, rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cartPrice: { color: colors.primary, flexShrink: 1 }, deleteButton: { minHeight: touchTarget, width: touchTarget, alignItems: 'center', justifyContent: 'center', marginVertical: -8 },
  quantity: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' }, quantityButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' }, quantityValue: { minWidth: 26, textAlign: 'center' },
  purple: { color: colors.primary, fontSize: 11, fontWeight: '700' }, cartFooter: { paddingTop: 8 },
  voucherButton: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingVertical: 14, gap: 12, borderBottomWidth: 1, borderColor: colors.line }, voucherChoice: { flex: 1, minWidth: 0, gap: 4 },
  summary: { paddingTop: 15, marginTop: 12, borderTopWidth: 1, borderColor: colors.line, gap: 9 }, total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 5 },
  summaryTotal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 11, marginTop: 9 },
  summaryPrice: { fontSize: 20, lineHeight: 27, fontWeight: '800', color: colors.primary, flexShrink: 1 }, dockPrice: { fontSize: 16, lineHeight: 23, fontWeight: '800', color: colors.primary, flexShrink: 1 },
  checkout: { paddingBottom: 20, backgroundColor: colors.background }, checkoutLine: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 10 },
  checkoutThumb: { width: 82, height: 86, borderRadius: 11 }, productSummary: { flex: 1, gap: 6 }, linePrice: { color: colors.primary },
  walletPayment: { padding: 14, borderRadius: 13, backgroundColor: colors.softPurple, flexDirection: 'row', alignItems: 'center', gap: 12 },
  voucherRow: { minHeight: 64, paddingVertical: 14, borderBottomWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 12 },
  pickerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F6F2F9', alignItems: 'center', justifyContent: 'center' }, error: { padding: 18 },
});
