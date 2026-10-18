import { useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { Clock3, Gift, Ticket } from 'lucide-react-native';
import { useMobile } from '../../state/MobileContext';
import { api, captureApiSession, isApiSessionCurrent } from '../../services/api';
import { money, voucherData } from '../../services/commerce';
import type { Channel, PageResult, Voucher, VoucherData } from '../../types';
import { AppText, Button, Field, Header, IconButton, Notice, Screen } from '../../ui/components';
import { BottomSheet, SegmentedControl } from '../../ui/commerce';
import { VoucherFace } from '../../ui/VoucherFace';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors, touchTarget } from '../../ui/theme';
import { accountStyles, DataFeedback, PageControls, recordDate, useAccountResource, type AccountScreenProps } from './account-ui';

type WalletResponse = { items: Voucher[]; grants: Voucher[] };
type VoucherRow = { voucher: Voucher; personal: boolean };
type VoucherSnapshot = VoucherData & { startTime?: Record<string, number>; endTime?: Record<string, number> };
type TransferRow = { id: string; voucher: VoucherSnapshot; direction: 'sent' | 'received'; created_at: string | null };

function voucherDate(value: Record<string, number> | undefined) {
  if (!value?.year || !value.month || !value.day) return '';
  return `${String(value.day).padStart(2, '0')}/${String(value.month).padStart(2, '0')}/${value.year}`;
}

export function VouchersScreen({ navigation }: AccountScreenProps) {
  const { account, t, refresh } = useMobile();
  const [channel, setChannel] = useState<Channel>('regular');
  const resource = useAccountResource<WalletResponse>(account ? `/vouchers?channel=${channel}` : null);
  const [gift, setGift] = useState<Voucher | null>(null);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [giftError, setGiftError] = useState('');
  const [message, setMessage] = useState('');
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const submitting = useRef(false);
  const rows: VoucherRow[] = [...(resource.data?.grants ?? []).map(voucher => ({ voucher, personal: true })), ...(resource.data?.items ?? []).map(voucher => ({ voucher, personal: false }))];
  const openGift = (voucher: Voucher) => { setGift(voucher); setRecipient(''); setGiftError(''); attempt.current = null; };
  const sendGift = async () => {
    if (submitting.current || !gift || !recipient.trim()) return;
    const session = captureApiSession();
    if (!session.token) return;
    submitting.current = true;
    setBusy(true); setGiftError('');
    const body = { grantId: gift.id, receiverEmail: recipient.trim() };
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: Crypto.randomUUID() };
    try { await api('/vouchers/transfer', 'POST', body, attempt.current.key); if (!isApiSessionCurrent(session)) return; setGift(null); setMessage(t('giftSent')); resource.refresh(); refresh(); }
    catch (failure) { if (isApiSessionCurrent(session)) setGiftError((failure as Error).message); }
    finally { submitting.current = false; if (isApiSessionCurrent(session)) setBusy(false); }
  };
  return <Screen scroll={false}>
    <Header title={t('voucherWallet')} onBack={() => navigation.goBack()} action={<IconButton label={t('voucherhistory')} onPress={() => navigation.navigate('history_voucher_screen')}><Clock3 size={20} color={colors.text}/></IconButton>}/>
    <SegmentedControl items={(['regular', 'flashsale'] as const).map(value => ({ value, label: t(value === 'regular' ? 'normalCart' : 'flashSale') }))} value={channel} onChange={value => { setChannel(value); setMessage(''); setError(''); }}/>
    {message && <View style={accountStyles.inset}><Notice message={message}/></View>}{error && <View style={accountStyles.inset}><Notice message={error} danger/></View>}
    <FlatList data={rows} keyExtractor={item => `${item.personal ? 'private' : 'common'}:${item.voucher.id}`} contentContainerStyle={styles.voucherList} refreshControl={<RefreshControl refreshing={resource.loading && Boolean(resource.data)} onRefresh={resource.refresh} tintColor={colors.primary}/>}
      ListHeaderComponent={<View style={styles.listHeading}><AppText style={styles.listTitle}>{t('yourVouchers')}</AppText><AppText muted style={styles.count}>{rows.length}</AppText>{resource.error && rows.length ? <DataFeedback loading={resource.loading} error={resource.error} empty={false} title={t('thereAreNotVoucherInHere')} onRetry={resource.refresh}/> : null}</View>}
      ListEmptyComponent={<DataFeedback loading={resource.loading} error={resource.error} empty title={t('thereAreNotVoucherInHere')} onRetry={resource.refresh}/>}
      renderItem={({ item }) => {
        const data = voucherData(item.voucher) as VoucherSnapshot | undefined;
        const status = item.voucher.used_at ? 'used' : item.voucher.revoked_at ? 'revoked' : item.voucher.status;
        const start = voucherDate(data?.startTime);
        const end = voucherDate(data?.endTime);
        return <View style={styles.voucher}><VoucherFace value={data ? money(data.Money) : '—'} unit={Number(data?.type) === 0 ? '%' : 'USDT'} kind={t(item.personal ? 'individualVoucher' : 'generalVoucher')} scope={t(item.voucher.scope || channel)} title={data?.eventName || data?.code || t('voucher')} details={<View style={styles.voucherMeta}><View style={styles.voucherMetaText}>{Boolean(start || end) && <AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.cardDate}>{start || '—'} – {end || '—'}</AppText>}{Boolean(data?.mincost) && <AppText numberOfLines={1} style={styles.cardCaption}>{t('subTotal')}: ≥ {money(data!.mincost!)} USDT</AppText>}{status && <AppText numberOfLines={1} style={styles.cardStatus}>{t(status)}</AppText>}</View>{item.personal && !item.voucher.used_at && !item.voucher.revoked_at && <Pressable accessibilityRole="button" accessibilityLabel={t('giftThisVoucher')} onPress={() => openGift(item.voucher)} style={styles.giftButton}><Gift size={14} color="#563B16"/><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={styles.giftLabel}>{t('gift')}</AppText></Pressable>}</View>}/></View>;
      }}/>
    <CommerceFooter/>
    <BottomSheet visible={Boolean(gift)} title={t('giftThisVoucher')} closeLabel={t('close')} onClose={() => setGift(null)} busy={busy} footer={<Button title={t('gift')} onPress={() => { void sendGift(); }} loading={busy} disabled={!recipient.trim()}/>}>
      {gift && <View style={styles.giftPreview}><Ticket size={24} strokeWidth={1.5} color={colors.primary}/><View style={styles.giftPreviewText}><AppText variant="label">{voucherData(gift)?.eventName || voucherData(gift)?.code || t('voucher')}</AppText><AppText style={styles.giftValue}>{money(voucherData(gift).Money)}{Number(voucherData(gift).type) === 0 ? '%' : ' USDT'}</AppText></View></View>}
      <Field label={t('recipientEmail')} value={recipient} onChangeText={setRecipient} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254} editable={!busy}/>
      {giftError && <Notice message={giftError} danger/>}
    </BottomSheet>
  </Screen>;
}

export function VoucherHistoryScreen({ navigation }: AccountScreenProps) {
  const { account, t, language } = useMobile();
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState('all');
  const resource = useAccountResource<PageResult<TransferRow>>(account ? `/voucher-transfers?limit=30&offset=${offset}&direction=${direction}` : null);
  const rows = resource.data?.items ?? [];
  return <Screen scroll={false}><Header title={t('voucherhistory')} onBack={() => navigation.goBack()}/><View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyFilters}>{['all', 'sent', 'received'].map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: value === direction }} onPress={() => { setDirection(value); setOffset(0); }} style={[styles.historyFilter, value === direction && styles.historyFilterSelected]}><AppText style={[styles.historyFilterLabel, value === direction && styles.historyFilterActive]}>{t(value)}</AppText></Pressable>)}</ScrollView></View><FlatList data={rows} keyExtractor={item => item.id} contentContainerStyle={accountStyles.list} refreshControl={<RefreshControl refreshing={resource.loading && Boolean(resource.data)} onRefresh={resource.refresh} tintColor={colors.primary}/>} ListEmptyComponent={<DataFeedback loading={resource.loading} error={resource.error} empty title={t('noHistory')} onRetry={resource.refresh}/>} ListHeaderComponent={resource.error && rows.length ? <DataFeedback loading={resource.loading} error={resource.error} empty={false} title={t('noHistory')} onRetry={resource.refresh}/> : null}
    renderItem={({ item }) => <View style={accountStyles.row}><View style={accountStyles.between}><View style={styles.historyInfo}><AppText variant="label">{item.voucher.eventName || item.voucher.code || t('voucher')}</AppText><AppText style={styles.voucherCaption}>{t(item.direction)} · {recordDate(item.created_at, language, t('dateUnknown'))}</AppText></View><AppText style={[styles.historyValue, item.direction === 'received' && styles.received]}>{money(item.voucher.Money)}{Number(item.voucher.type) === 0 ? '%' : ' USDT'}</AppText></View></View>}
    ListFooterComponent={<PageControls offset={offset} total={resource.data?.total ?? 0} onOffset={setOffset} loading={resource.loading}/>}/><CommerceFooter/></Screen>;
}

const styles = StyleSheet.create({
  voucherList: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 26 }, listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 6, paddingBottom: 17 }, listTitle: { fontSize: 13, fontWeight: '800', flex: 1 }, count: { fontSize: 10 },
  voucher: { marginBottom: 13, borderRadius: 14, overflow: 'hidden' },
  voucherMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 }, voucherMetaText: { flex: 1, minWidth: 0, gap: 1 }, cardDate: { color: '#FFF2CC', fontSize: 10, lineHeight: 12, fontWeight: '600' }, cardCaption: { color: '#C9E2DA', fontSize: 9, lineHeight: 11 }, cardStatus: { color: '#F6DC9D', fontSize: 9, lineHeight: 11, fontWeight: '600' },
  voucherValue: { width: 103, paddingVertical: 17, paddingHorizontal: 8, backgroundColor: '#F0E8F7', borderEndWidth: 1, borderStyle: 'dashed', borderColor: '#BFA7CF', alignItems: 'center', justifyContent: 'center', gap: 5 },
  amount: { fontSize: 19, lineHeight: 25, color: colors.primary, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' }, voucherKind: { fontSize: 9, lineHeight: 13, color: '#896A9F', textAlign: 'center' },
  voucherContent: { flex: 1, minWidth: 0, padding: 12, gap: 6 }, voucherCaption: { fontSize: 10, lineHeight: 15, color: '#817688' }, voucherBottom: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  giftButton: { minHeight: touchTarget, minWidth: 60, maxWidth: '36%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, borderRadius: 9, backgroundColor: '#F1D693' }, giftLabel: { flexShrink: 1, fontSize: 11, fontWeight: '700', color: '#563B16' },
  giftPreview: { padding: 14, borderRadius: 13, backgroundColor: colors.softPurple, flexDirection: 'row', alignItems: 'center', gap: 12 }, giftPreviewText: { flex: 1, gap: 5 }, giftValue: { fontSize: 19, fontWeight: '800', color: colors.primary },
  historyFilters: { paddingHorizontal: 18, paddingBottom: 12, gap: 8 }, historyFilter: { minHeight: touchTarget, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 9, justifyContent: 'center' }, historyFilterSelected: { borderColor: colors.primary, backgroundColor: colors.primary }, historyFilterLabel: { color: '#706878', fontSize: 11, fontWeight: '600' }, historyFilterActive: { color: colors.background },
  historyInfo: { flex: 1, gap: 5 }, historyValue: { color: colors.primary, fontSize: 13, fontWeight: '700' }, received: { color: colors.success },
});
