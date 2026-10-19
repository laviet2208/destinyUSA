import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useResource } from '../../hooks/useResource';
import { useMobile } from '../../state/MobileContext';
import { AppText, Button, EmptyState, LoadingState, Notice } from '../../ui/components';
import { colors, spacing } from '../../ui/theme';
import { directionFor } from '../../ui/strings';

export type AccountScreenProps = { navigation: any; route?: any };

export function AboutAccess({ navigation, children }: { navigation: any; children: ReactNode }) {
  const { catalog } = useMobile();
  useEffect(() => {
    if (!catalog.showAboutApp) navigation.replace('main_screen', { screen: 'account_page' });
  }, [catalog.showAboutApp, navigation]);
  return catalog.showAboutApp ? children : null;
}

export function WalletAccess({ navigation, required = true, children }: { navigation: any; required?: boolean; children: ReactNode }) {
  const { catalog } = useMobile();
  const visible = !required || catalog.showWallet;
  useEffect(() => {
    if (!visible) navigation.replace('main_screen', { screen: 'account_page' });
  }, [visible, navigation]);
  return visible ? children : null;
}
export type OrderRow = { id: string; status: string; created_at: string | null; subtotal: number; paid_amount: number; voucher_value: number; refunded_amount: number; archived_at?: string | null; channel?: string; note?: string; receiver?: Record<string, string>; items?: OrderItem[]; events?: { status: string; created_at: string | null }[] };
export type OrderItem = { id: string; product_name: string; variant_name: string; quantity: number; unit_price: number; image_urls: string[] };
export type LedgerRow = { id: string; direction: string; amount: number; content: string; created_at: string | null };
export type MoneyRequestRow = { id: string; direction: string; amount: number; wallet_address: string; status: string; created_at: string | null };

export function useAccountResource<Result>(path: string | null) {
  const { revision } = useMobile();
  const resource = useResource<Result>(path);
  useEffect(() => { resource.refresh(); }, [revision, resource.refresh]);
  return resource;
}

export function DataFeedback({ loading, error, empty, title, onRetry }: { loading: boolean; error: string; empty: boolean; title: string; onRetry: () => void }) {
  const { t } = useMobile();
  if (loading && empty) return <LoadingState/>;
  if (error && empty) return <EmptyState title={t('loadError')} message={error} action={t('tryAgain')} onPress={onRetry}/>;
  if (empty) return <EmptyState title={title}/>;
  return error ? <View style={accountStyles.inset}><Notice message={error} danger/><Button title={t('tryAgain')} onPress={onRetry} variant="quiet"/></View> : null;
}

export function MenuRow({ title, icon, onPress, danger, value }: { title: string; icon: ReactNode; onPress: () => void; danger?: boolean; value?: string }) {
  const { language } = useMobile();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuRow, pressed && accountStyles.pressed]}><View style={styles.menuIcon}>{icon}</View><AppText variant="label" style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</AppText>{value && <AppText muted variant="caption" numberOfLines={1} style={styles.value}>{value}</AppText>}<ChevronRight size={16} color={colors.muted} style={{ transform: [{ scaleX: directionFor(language) === 'rtl' ? -1 : 1 }] }}/></Pressable>;
}

export function AccountAvatar({ firstName, lastName, inverse = false }: { firstName?: string; lastName?: string; inverse?: boolean }) {
  return <View accessibilityElementsHidden style={[styles.avatar, inverse && styles.avatarInverse]}><AppText style={styles.initials}>{[firstName, lastName].filter(Boolean).map(value => Array.from(value!)[0]).slice(0, 2).join('').toLocaleUpperCase()}</AppText></View>;
}

export function PageControls({ offset, total, limit = 30, onOffset, loading }: { offset: number; total: number; limit?: number; onOffset: (offset: number) => void; loading?: boolean }) {
  const { t } = useMobile();
  if (total <= limit && offset === 0) return null;
  return <View style={styles.pages}><Button title={t('back')} onPress={() => onOffset(Math.max(0, offset - limit))} variant="quiet" disabled={offset === 0 || loading}/><AppText muted variant="caption">{Math.floor(offset / limit) + 1} / {Math.max(1, Math.ceil(total / limit))}</AppText><Button title={t('loadMore')} onPress={() => onOffset(offset + limit)} variant="quiet" disabled={offset + limit >= total || loading}/></View>;
}

export function recordDate(value: string | null | undefined, language: string, unknown: string) {
  if (!value || !Number.isFinite(Date.parse(value))) return unknown;
  try { return new Date(value).toLocaleString(language, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return new Date(value).toLocaleString(); }
}

export const accountStyles = StyleSheet.create({
  inset: { paddingHorizontal: 18 },
  content: { padding: 18, gap: 15 },
  gap: { gap: spacing.lg },
  readOnly: { gap: spacing.sm, padding: spacing.lg, backgroundColor: colors.surface, borderRadius: 14, borderWidth: 1, borderColor: colors.line },
  flex: { flex: 1 },
  pressed: { opacity: 0.88 },
  list: { flexGrow: 1, paddingBottom: spacing.section },
  row: { paddingHorizontal: spacing.xl, paddingVertical: 14, gap: 5, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  muted: { color: colors.muted },
});

const styles = StyleSheet.create({
  avatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF25', alignItems: 'center', justifyContent: 'center' }, avatarInverse: { backgroundColor: colors.primary }, initials: { color: colors.background, fontSize: 19, fontWeight: '800' },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F6F2F9', alignItems: 'center', justifyContent: 'center' },
  menuRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  rowTitle: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  value: { maxWidth: '35%' },
  pages: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
});
