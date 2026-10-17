import { useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { useMobile } from '../../state/MobileContext';
import { money } from '../../services/commerce';
import type { PageResult } from '../../types';
import { AppText, Header, Screen } from '../../ui/components';
import { SegmentedControl, StatusPill } from '../../ui/commerce';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors, touchTarget } from '../../ui/theme';
import { accountStyles, DataFeedback, PageControls, recordDate, useAccountResource, WalletAccess, type AccountScreenProps, type LedgerRow, type MoneyRequestRow } from './account-ui';

export function WalletScreen(props: AccountScreenProps) {
  return <WalletAccess navigation={props.navigation}><WalletContent {...props}/></WalletAccess>;
}

function WalletContent({ navigation }: AccountScreenProps) {
  const { account, t, language, refreshAccount } = useMobile();
  const [mode, setMode] = useState<'ledger' | 'requests'>('ledger');
  const [offset, setOffset] = useState(0);
  const resource = useAccountResource<PageResult<LedgerRow | MoneyRequestRow>>(account ? `${mode === 'ledger' ? '/ledger' : '/money-requests'}?limit=30&offset=${offset}` : null);
  const items = resource.data?.items ?? [];
  const refresh = () => { resource.refresh(); void refreshAccount().catch(() => {}); };
  return <Screen scroll={false}><Header title={t('yourWallet')} onBack={() => navigation.goBack()}/>
    <FlatList data={items} keyExtractor={item => item.id} contentContainerStyle={accountStyles.list} refreshControl={<RefreshControl refreshing={resource.loading && Boolean(resource.data)} onRefresh={refresh} tintColor={colors.primary}/>}
      ListHeaderComponent={<View><View style={styles.balance}><View accessibilityElementsHidden style={styles.decor}/><AppText style={styles.balanceLabel}>{t('balance')}</AppText><AppText style={styles.balanceAmount}>{money(account?.balance ?? 0)} USDT</AppText><AppText style={styles.walletCaption}>Destiny USA · USDT</AppText><View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => navigation.navigate('customer_care', { mode: 'deposit' })} style={styles.balanceAction}><ArrowDownLeft size={14} color={colors.background}/><AppText style={styles.balanceActionText}>{t('deposit')}</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => navigation.navigate('customer_care', { mode: 'withdrawal' })} style={styles.balanceAction}><ArrowUpRight size={14} color={colors.background}/><AppText style={styles.balanceActionText}>{t('withdraw')}</AppText></Pressable></View></View>
        <SegmentedControl items={([{ value: 'ledger', label: t('historyTransaction') }, { value: 'requests', label: t('moneyRequests') }] as const).map(item => item)} value={mode} onChange={value => { setMode(value); setOffset(0); }}/>
        <AppText style={styles.historyHeading}>{t(mode === 'ledger' ? 'historyTransaction' : 'moneyRequests')}</AppText>{resource.error && items.length > 0 && <DataFeedback loading={resource.loading} error={resource.error} empty={false} title={t('noHistory')} onRetry={resource.refresh}/>}
      </View>}
      ListEmptyComponent={<DataFeedback loading={resource.loading} error={resource.error} empty title={t('noHistory')} onRetry={resource.refresh}/>}
      renderItem={({ item }) => <View style={accountStyles.row}><View style={accountStyles.between}><View style={styles.historyInfo}><AppText variant="label">{mode === 'ledger' ? (item as LedgerRow).content : t(item.direction === 'withdrawal' ? 'withdraw' : 'deposit')}</AppText><AppText style={styles.historyDate}>{recordDate(item.created_at, language, t('dateUnknown'))}</AppText></View><AppText style={[styles.historyAmount, mode === 'ledger' && item.direction === 'credit' && styles.credit]}>{mode === 'ledger' ? item.direction === 'credit' ? '+' : '−' : ''}{money(item.amount)} USDT</AppText></View>{mode === 'requests' && <StatusPill label={t((item as MoneyRequestRow).status)} tone={(item as MoneyRequestRow).status === 'rejected' ? 'danger' : 'purple'}/>} {mode === 'requests' && Boolean((item as MoneyRequestRow).wallet_address) && <AppText style={styles.historyDate} selectable>{(item as MoneyRequestRow).wallet_address}</AppText>}</View>}
      ListFooterComponent={<PageControls offset={offset} total={resource.data?.total ?? 0} onOffset={setOffset} loading={resource.loading}/>}/>
    <CommerceFooter/>
  </Screen>;
}

const styles = StyleSheet.create({
  balance: { marginHorizontal: 18, marginBottom: 16, padding: 19, borderRadius: 16, backgroundColor: colors.primary, overflow: 'hidden', position: 'relative' },
  decor: { position: 'absolute', right: -27, top: -42, width: 160, height: 160, borderRadius: 80, borderWidth: 22, borderColor: '#FFFFFF13' },
  balanceLabel: { color: '#DED1EB', fontSize: 11, lineHeight: 16, textTransform: 'uppercase' }, balanceAmount: { fontSize: 29, lineHeight: 38, fontWeight: '800', letterSpacing: -1, color: colors.background, marginTop: 7, marginBottom: 12 }, walletCaption: { color: '#E2D2EE', fontSize: 11, lineHeight: 16 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 20 }, balanceAction: { flex: 1, minHeight: touchTarget, backgroundColor: '#FFFFFF25', borderWidth: 1, borderColor: '#FFFFFF2D', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }, balanceActionText: { fontSize: 11, lineHeight: 16, fontWeight: '700', color: colors.background },
  historyHeading: { fontSize: 13, lineHeight: 19, fontWeight: '800', letterSpacing: -0.35, marginHorizontal: 18, marginTop: 12, marginBottom: 11 },
  historyInfo: { flex: 1, gap: 5 }, historyDate: { color: '#9A8F9F', fontSize: 10, lineHeight: 15 }, historyAmount: { color: colors.primary, fontSize: 13, lineHeight: 19, fontWeight: '700' }, credit: { color: colors.success },
});
