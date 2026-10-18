import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight, Check, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useMobile } from '../../state/MobileContext';
import { money } from '../../services/commerce';
import type { PageResult } from '../../types';
import { AppText, Header, Screen } from '../../ui/components';
import { SegmentedControl, StatusPill } from '../../ui/commerce';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { BrandLogo } from '../../ui/BrandLogo';
import { colors, touchTarget } from '../../ui/theme';
import { accountStyles, DataFeedback, PageControls, recordDate, useAccountResource, WalletAccess, type AccountScreenProps, type LedgerRow, type MoneyRequestRow } from './account-ui';

export function WalletScreen(props: AccountScreenProps) {
  return <WalletAccess navigation={props.navigation}><WalletContent {...props}/></WalletAccess>;
}

function WalletContent({ navigation }: AccountScreenProps) {
  const { account, t, language, refreshAccount } = useMobile();
  const [mode, setMode] = useState<'ledger' | 'requests'>('ledger');
  const [offset, setOffset] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const resource = useAccountResource<PageResult<LedgerRow | MoneyRequestRow>>(account ? `${mode === 'ledger' ? '/ledger' : '/money-requests'}?limit=30&offset=${offset}` : null);
  const items = resource.data?.items ?? [];
  const refresh = () => { resource.refresh(); void refreshAccount().catch(() => {}); };
  const copyEmail = async () => {
    if (!account?.email) return;
    setCopyError(false);
    try {
      const written = await Clipboard.setStringAsync(account.email);
      setCopied(written);
      setCopyError(!written);
    } catch { setCopied(false); setCopyError(true); }
  };
  return <Screen scroll={false}><Header title={t('yourWallet')} onBack={() => navigation.goBack()}/>
    <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={accountStyles.list} refreshControl={<RefreshControl refreshing={resource.loading && Boolean(resource.data)} onRefresh={refresh} tintColor={colors.primary}/>}
      ListHeaderComponent={<View><View style={styles.balance}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.decor}/>
        <BrandLogo light width={146}/>
        <AppText style={styles.balanceLabel}>{t('balance')}</AppText>
        <View style={styles.balanceValue}><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.balanceAmount}>{money(account?.balance ?? 0)}</AppText><AppText style={styles.currency}>USDT</AppText></View>
        {Boolean(account?.email) && <View style={styles.emailRow}><AppText selectable style={styles.email}>{account?.email}</AppText><Pressable accessibilityRole="button" accessibilityLabel={t(copied ? 'emailCopied' : 'copyEmail')} onPress={() => { void copyEmail(); }} style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}>{copied ? <Check size={17} color="#7DE2B3"/> : <Copy size={16} color="#E5E1EC"/>}</Pressable></View>}
        {(copied || copyError) && <AppText accessibilityLiveRegion="polite" style={[styles.copyFeedback, copyError && styles.copyError]}>{t(copyError ? 'copyFailed' : 'emailCopied')}</AppText>}
        <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => navigation.navigate('customer_care', { mode: 'deposit' })} style={({ pressed }) => [styles.balanceAction, styles.depositAction, pressed && styles.pressed]}><ArrowDownLeft size={18} color={colors.background}/><AppText style={styles.balanceActionText}>{t('deposit')}</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => navigation.navigate('customer_care', { mode: 'withdrawal' })} style={({ pressed }) => [styles.balanceAction, styles.withdrawAction, pressed && styles.pressed]}><ArrowUpRight size={18} color={colors.background}/><AppText style={styles.balanceActionText}>{t('withdraw')}</AppText></Pressable></View>
      </View>
        <SegmentedControl items={([{ value: 'ledger', label: t('historyTransaction') }, { value: 'requests', label: t('moneyRequests') }] as const).map(item => item)} value={mode} onChange={value => { setMode(value); setOffset(0); }}/>
        <AppText style={styles.historyHeading}>{t(mode === 'ledger' ? 'historyTransaction' : 'moneyRequests')}</AppText>{resource.error && items.length > 0 && <DataFeedback loading={resource.loading} error={resource.error} empty={false} title={t('noHistory')} onRetry={resource.refresh}/>}
      </View>}
      ListEmptyComponent={<DataFeedback loading={resource.loading} error={resource.error} empty title={t('noHistory')} onRetry={resource.refresh}/>}
      renderItem={({ item }) => {
        const incoming = item.direction === 'credit' || item.direction === 'deposit';
        const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight;
        return <View style={accountStyles.row}><View style={accountStyles.between}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.historyIcon, incoming ? styles.creditBackground : styles.debitBackground]}><DirectionIcon size={18} color={incoming ? '#16805C' : '#BD3949'}/></View><View style={styles.historyInfo}><AppText variant="label">{mode === 'ledger' ? (item as LedgerRow).content : t(incoming ? 'deposit' : 'withdraw')}</AppText><AppText style={styles.historyDate}>{recordDate(item.created_at, language, t('dateUnknown'))}</AppText></View><AppText style={[styles.historyAmount, incoming ? styles.credit : styles.debit]}>{mode === 'ledger' ? incoming ? '+' : '−' : ''}{money(item.amount)} USDT</AppText></View>{mode === 'requests' && <StatusPill label={t((item as MoneyRequestRow).status)} tone={(item as MoneyRequestRow).status === 'rejected' ? 'danger' : 'purple'}/>} {mode === 'requests' && Boolean((item as MoneyRequestRow).wallet_address) && <AppText style={styles.historyDate} selectable>{(item as MoneyRequestRow).wallet_address}</AppText>}</View>;
      }}
      ListFooterComponent={<PageControls offset={offset} total={resource.data?.total ?? 0} onOffset={setOffset} loading={resource.loading}/>}/>
    <CommerceFooter/>
  </Screen>;
}

const styles = StyleSheet.create({
  balance: { marginHorizontal: 18, marginBottom: 20, padding: 20, borderRadius: 20, backgroundColor: '#151419', borderWidth: 1, borderColor: '#343139', overflow: 'hidden', position: 'relative' },
  decor: { position: 'absolute', right: -75, top: -95, width: 260, height: 260, borderRadius: 130, borderWidth: 1, borderColor: '#FFFFFF0D', backgroundColor: '#FFFFFF03' },
  balanceLabel: { color: '#B4AFBF', fontSize: 10, lineHeight: 16, letterSpacing: 1.1, textTransform: 'uppercase', marginTop: 22 },
  balanceValue: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 5, marginBottom: 8 }, balanceAmount: { flexShrink: 1, fontSize: 36, lineHeight: 45, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -1.1, color: '#FFFFFF' }, currency: { fontSize: 11, lineHeight: 18, fontWeight: '600', color: '#C8C2D0' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }, email: { flexShrink: 1, color: '#DBD6E2', fontSize: 12, lineHeight: 19 }, copyButton: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  copyFeedback: { color: '#7DE2B3', fontSize: 10, lineHeight: 16 }, copyError: { color: '#FFABB4' }, pressed: { opacity: 0.78 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 }, balanceAction: { flex: 1, minHeight: touchTarget, borderRadius: 11, paddingHorizontal: 10, paddingVertical: 13, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }, depositAction: { backgroundColor: '#16805C' }, withdrawAction: { backgroundColor: '#BD3949' }, balanceActionText: { fontSize: 12, lineHeight: 18, fontWeight: '700', flexShrink: 1, textAlign: 'center', color: colors.background },
  historyHeading: { fontSize: 13, lineHeight: 19, fontWeight: '800', letterSpacing: -0.35, marginHorizontal: 18, marginTop: 12, marginBottom: 11 },
  historyIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, creditBackground: { backgroundColor: '#EAF7F0' }, debitBackground: { backgroundColor: '#FCEEF0' },
  historyInfo: { flex: 1, minWidth: 0, gap: 5 }, historyDate: { color: '#9A8F9F', fontSize: 10, lineHeight: 15 }, historyAmount: { maxWidth: '45%', flexShrink: 1, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'right', fontVariant: ['tabular-nums'] }, credit: { color: '#16805C' }, debit: { color: '#BD3949' },
});
