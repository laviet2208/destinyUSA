import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { RotateCw, Wallet } from 'lucide-react-native';
import { useMobile } from '../state/MobileContext';
import { money } from '../services/commerce';
import { AppText, IconButton } from './components';
import { colors } from './theme';

export function AvailableBalance({ compact = false }: { compact?: boolean }) {
  const { account, refreshAccount, t } = useMobile();
  const focused = useIsFocused();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!account?.id || !focused) return;
    let current = true;
    setStatus('loading');
    void refreshAccount().then(() => { if (current) setStatus('ready'); }).catch(() => { if (current) setStatus('error'); });
    return () => { current = false; };
  }, [account?.id, focused, refreshAccount, retry]);
  if (!account) return null;
  return <View style={[styles.card, compact && styles.compact]}>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.symbol}><Wallet size={compact ? 19 : 23} color={colors.primary} strokeWidth={1.6}/></View>
    <View style={styles.copy}><AppText style={styles.label}>{t('balance')}</AppText><AppText selectable style={[styles.amount, compact && styles.compactAmount]}>{Number.isFinite(account.balance) ? money(account.balance) : '—'} USDT</AppText>{status === 'error' && <AppText accessibilityLiveRegion="polite" style={styles.error}>{t('loadError')}</AppText>}</View>
    <IconButton label={t('refreshBalance')} disabled={status === 'loading'} onPress={() => setRetry(value => value + 1)}>{status === 'loading' ? <ActivityIndicator size="small" color={colors.primary}/> : <RotateCw size={18} color={colors.primary}/>}</IconButton>
  </View>;
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 13, backgroundColor: colors.softPurple, borderWidth: 1, borderColor: colors.lavender },
  compact: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 11 },
  symbol: { alignItems: 'center', justifyContent: 'center', width: 30, flexShrink: 0 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  label: { color: '#655672', fontSize: 12, lineHeight: 17 },
  amount: { color: colors.primary, fontSize: 25, lineHeight: 33, fontWeight: '800', fontVariant: ['tabular-nums'] },
  compactAmount: { fontSize: 18, lineHeight: 25 },
  error: { fontSize: 11, lineHeight: 16, color: colors.danger },
});
