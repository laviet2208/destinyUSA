import { useRef, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { ChevronRight, MapPin, Package } from 'lucide-react-native';
import { useMobile } from '../../state/MobileContext';
import { api, captureApiSession, isApiSessionCurrent, mediaUrl } from '../../services/api';
import { money } from '../../services/commerce';
import type { PageResult } from '../../types';
import { AppText, BottomAction, Button, Header, Notice, ProductImage, Screen } from '../../ui/components';
import { PageSection, StatusPill } from '../../ui/commerce';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors, touchTarget } from '../../ui/theme';
import { accountStyles, DataFeedback, PageControls, recordDate, useAccountResource, type AccountScreenProps, type OrderRow } from './account-ui';

const orderStatuses = ['', 'pending', 'processing', 'completed', 'cancel_requested', 'cancelled', 'refunded'];

export function OrderHistoryScreen({ navigation }: AccountScreenProps) {
  const { account, t, language } = useMobile();
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const resource = useAccountResource<PageResult<OrderRow>>(account ? `/orders?status=${status}&limit=30&offset=${offset}` : null);
  const orders = resource.data?.items ?? [];
  return <Screen scroll={false}>
    <Header title={t('historyOrders')} onBack={() => navigation.goBack()}/>
    <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{orderStatuses.map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: status === value }} onPress={() => { setStatus(value); setOffset(0); }} style={[styles.filter, status === value && styles.filterSelected]}><AppText style={[styles.filterText, status === value && styles.selectedText]}>{t(value || 'all')}</AppText></Pressable>)}</ScrollView></View>
    <FlatList data={orders} keyExtractor={order => order.id} contentContainerStyle={accountStyles.list} refreshControl={<RefreshControl refreshing={resource.loading && Boolean(resource.data)} onRefresh={resource.refresh} tintColor={colors.primary}/>} ListHeaderComponent={resource.error && orders.length ? <DataFeedback loading={resource.loading} error={resource.error} empty={false} title={t('noOrders')} onRetry={resource.refresh}/> : null} ListEmptyComponent={<DataFeedback loading={resource.loading} error={resource.error} empty title={t('noOrders')} onRetry={resource.refresh}/>}
      renderItem={({ item }) => { const preview = item.items?.[0]; return <Pressable accessibilityRole="button" onPress={() => navigation.navigate('order_detail_screen', { id: item.id })} style={({ pressed }) => [styles.orderCard, pressed && accountStyles.pressed]}>
        <View style={styles.orderHeading}><AppText style={styles.orderId} numberOfLines={1}>{item.id}</AppText><StatusPill label={t(item.status)} tone={item.status === 'completed' ? 'success' : ['cancelled', 'refunded'].includes(item.status) ? 'neutral' : 'purple'}/></View>
        <View style={styles.orderBody}>{preview?.image_urls?.[0] ? <ProductImage uri={mediaUrl(preview.image_urls[0])} label={preview.product_name} style={styles.previewImage}/> : <View style={styles.previewPlaceholder}><Package size={27} strokeWidth={1.4} color={colors.secondary}/></View>}<View style={styles.previewInfo}><AppText variant="label" numberOfLines={2}>{preview?.product_name || t('orderNumber')}</AppText><AppText style={styles.previewMeta}>{recordDate(item.created_at, language, t('dateUnknown'))}</AppText>{item.channel && <AppText style={styles.previewMeta}>{t(item.channel)}</AppText>}</View></View>
        <View style={styles.orderFoot}><AppText muted variant="caption">{t('subTotal')}</AppText><View style={styles.orderFootPrice}><AppText style={styles.amount}>{money(item.subtotal)} USDT</AppText><ChevronRight size={14} color={colors.primary}/></View></View>
      </Pressable>; }}
      ListFooterComponent={<PageControls offset={offset} total={resource.data?.total ?? 0} onOffset={setOffset} loading={resource.loading}/>}/>
    <CommerceFooter/>
  </Screen>;
}

export function OrderDetailScreen({ navigation, route }: AccountScreenProps) {
  const { t, language, refresh } = useMobile();
  const id = String(route?.params?.id ?? '');
  const resource = useAccountResource<OrderRow>(id ? `/orders/${encodeURIComponent(id)}` : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const operation = useRef<{ id: string; key: string } | null>(null);
  const submitting = useRef(false);
  const order = resource.data;
  const sendCancellation = async () => {
    if (submitting.current || !order) return;
    const session = captureApiSession();
    if (!session.token) return;
    submitting.current = true;
    if (operation.current?.id !== id) operation.current = { id, key: Crypto.randomUUID() };
    setBusy(true); setError('');
    try { await api(`/orders/${encodeURIComponent(id)}/cancel-request`, 'POST', {}, operation.current.key); if (!isApiSessionCurrent(session)) return; resource.refresh(); refresh(); }
    catch (failure) { if (isApiSessionCurrent(session)) setError((failure as Error).message); }
    finally { submitting.current = false; if (isApiSessionCurrent(session)) setBusy(false); }
  };
  const cancel = () => {
    const session = captureApiSession();
    if (!session.token) return;
    Alert.alert(t('cancelOrder'), t('cancelOrderConfirm'), [{ text: t('close'), style: 'cancel' }, { text: t('confirm'), style: 'destructive', onPress: () => { if (isApiSessionCurrent(session)) void sendCancellation(); } }]);
  };
  const receiver = order?.receiver ?? {};
  return <Screen scroll={false}><Header title={t('orderNumber')} onBack={() => navigation.goBack()}/>
    {!order ? <DataFeedback loading={resource.loading} error={resource.error} empty title={t('noOrders')} onRetry={resource.refresh}/> : <>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={resource.loading} onRefresh={resource.refresh} tintColor={colors.primary}/>} contentContainerStyle={styles.detail}>
        <PageSection><View style={accountStyles.between}><AppText variant="overline" style={styles.kicker}>{t('orderNumber')}</AppText><StatusPill label={t(order.status)} tone={order.status === 'completed' ? 'success' : ['cancelled', 'refunded'].includes(order.status) ? 'neutral' : 'purple'}/></View><AppText style={styles.detailId} selectable>{order.id}</AppText><AppText muted variant="caption">{recordDate(order.created_at, language, t('dateUnknown'))}</AppText></PageSection>
        {(error || resource.error) && <View style={styles.error}><Notice message={error || resource.error} danger/></View>}
        <PageSection title={t('products')}>{order.items?.map(item => <View key={item.id} style={styles.item}><View style={styles.itemMain}><ProductImage key={item.image_urls?.[0]} uri={mediaUrl(item.image_urls?.[0])} label={item.product_name} inset={6} style={styles.itemImage}/><View style={styles.itemInfo}><AppText variant="label">{item.product_name}</AppText><AppText style={styles.previewMeta}>{item.variant_name} · × {item.quantity}</AppText><AppText style={styles.itemPrice}>{money(item.unit_price)} USDT × {item.quantity}</AppText></View></View>{item.image_urls?.length > 1 && <ScrollView horizontal contentContainerStyle={styles.itemImages} showsHorizontalScrollIndicator={false}>{item.image_urls.slice(1).map((image, index) => <ProductImage key={`${image}:${index}`} uri={mediaUrl(image)} label={`${item.product_name} · ${index + 2}`} inset={4} style={styles.itemThumbnail}/>)}</ScrollView>}</View>)}
          <View style={styles.summary}><View style={styles.summaryRow}><AppText muted>{t('subTotal')}</AppText><AppText variant="label">{money(order.subtotal)} USDT</AppText></View><View style={styles.summaryRow}><AppText muted>{t('voucher')}</AppText><AppText variant="label">{money(order.voucher_value)} USDT</AppText></View><View style={styles.summaryTotal}><AppText variant="label">{t('total')}</AppText><AppText style={styles.totalPrice}>{money(order.paid_amount)} USDT</AppText></View>{order.refunded_amount > 0 && <View style={styles.summaryRow}><AppText muted>{t('refunded')}</AppText><AppText variant="label">{money(order.refunded_amount)} USDT</AppText></View>}</View>
        </PageSection>
        <PageSection title={t('address')}><View style={styles.receiver}><MapPin size={20} color={colors.text}/><View style={styles.receiverInfo}><AppText selectable>{receiver.name || '—'} · {receiver.phoneNumber || '—'}</AppText><AppText muted>{receiver.address || receiver.district || '—'}</AppText></View></View></PageSection>
        {Boolean(order.note) && <PageSection title={t('note')}><AppText>{order.note}</AppText></PageSection>}
        {Boolean(order.events?.length) && <PageSection title={t('historyOrders')}><View style={styles.timeline}>{order.events!.map((event, index) => <View key={`${event.created_at}:${index}`} style={[styles.event, index === order.events!.length - 1 && styles.lastEvent]}><View style={styles.eventDot}/><AppText variant="label">{t(event.status)}</AppText><AppText style={styles.previewMeta}>{recordDate(event.created_at, language, t('dateUnknown'))}</AppText></View>)}</View></PageSection>}
      </ScrollView>
      {!order.archived_at && ['pending', 'processing'].includes(order.status) && <BottomAction><Button title={t('cancelOrder')} onPress={cancel} variant="secondary" loading={busy}/></BottomAction>}
    </>}
    <CommerceFooter/>
  </Screen>;
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 18, gap: 8, paddingBottom: 12 }, filter: { minHeight: touchTarget, paddingHorizontal: 13, paddingVertical: 10, justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: '#E8E3EC' },
  filterSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, filterText: { fontSize: 11, fontWeight: '600', color: '#706878' }, selectedText: { color: colors.background },
  orderCard: { marginHorizontal: 18, marginBottom: 12, padding: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 13 },
  orderHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 11 },
  orderId: { flex: 1, fontSize: 11, lineHeight: 16, color: '#8E8197' }, orderBody: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  previewImage: { width: 64, height: 66, borderRadius: 9 }, previewPlaceholder: { width: 64, height: 66, borderRadius: 9, backgroundColor: '#F5F1F8', alignItems: 'center', justifyContent: 'center' },
  previewInfo: { flex: 1, gap: 5 }, previewMeta: { fontSize: 10, lineHeight: 15, color: '#978B9D' },
  orderFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 }, orderFootPrice: { flexDirection: 'row', alignItems: 'center', gap: 6 }, amount: { fontSize: 14, lineHeight: 20, color: colors.primary, fontWeight: '800' },
  detail: { paddingBottom: 10 }, kicker: { color: '#9A79BB' }, detailId: { fontSize: 19, lineHeight: 26, fontWeight: '800', letterSpacing: -0.5 },
  item: { gap: 9, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line }, itemMain: { flexDirection: 'row', gap: 12 }, itemImage: { width: 82, height: 86, borderRadius: 11 }, itemInfo: { flex: 1, gap: 7 }, itemPrice: { fontSize: 15, lineHeight: 21, fontWeight: '800', color: colors.primary },
  itemImages: { gap: 9 }, itemThumbnail: { width: 57, height: 57, borderRadius: 10 }, summary: { paddingTop: 15, gap: 10 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 5 }, summaryTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingTop: 11, marginTop: 9, borderTopWidth: 1, borderColor: colors.line }, totalPrice: { fontSize: 20, fontWeight: '800', color: colors.primary },
  receiver: { flexDirection: 'row', alignItems: 'center', gap: 12 }, receiverInfo: { flex: 1, gap: 4 },
  timeline: { marginTop: 12, marginStart: 11 }, event: { position: 'relative', borderStartWidth: 1, borderColor: '#E4D4EE', paddingStart: 22, paddingBottom: 22, gap: 5 }, lastEvent: { borderColor: 'transparent', paddingBottom: 0 }, eventDot: { position: 'absolute', start: -5, top: 1, height: 9, width: 9, borderRadius: 5, backgroundColor: '#9274AD', borderWidth: 2, borderColor: colors.background }, error: { padding: 18 },
});
