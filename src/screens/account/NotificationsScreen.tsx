import { useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Bell, BellRing, MessageCircle, Package, Ticket, Wallet } from 'lucide-react-native';
import { useMobile } from '../../state/MobileContext';
import { api, captureApiSession, isApiSessionCurrent } from '../../services/api';
import { enablePush } from '../../services/push';
import type { ContentRecord } from '../../types';
import { AppText, Button, Header, Notice, Screen } from '../../ui/components';
import { SegmentedControl } from '../../ui/commerce';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors } from '../../ui/theme';
import { RichProductDescription } from '../catalog/RichProductDescription';
import { accountStyles, DataFeedback, recordDate, useAccountResource, type AccountScreenProps } from './account-ui';

type NotificationRow = { id: string; title: string; body: string; created_at: string | null; read_at: string | null; data?: Record<string, string> };
type Announcement = { id: string; title?: string; sub?: string; content?: string; status?: number };

export function NotificationsScreen({ navigation }: AccountScreenProps) {
  const { account, t, language } = useMobile();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'personal' | 'content'>('personal');
  const [offset, setOffset] = useState(0);
  const personal = useAccountResource<{ items: NotificationRow[]; unread: number }>(account ? `/notifications?limit=30&offset=${offset}` : null);
  const content = useAccountResource<{ items: ContentRecord[] }>(account ? '/content/Notification' : null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const reading = useRef(false);
  const enabling = useRef(false);
  const notices: Announcement[] = (content.data?.items ?? []).filter(item => Number((item.data as Announcement)?.status) === 2).map(item => ({ ...(item.data as Announcement), id: item.id }));
  const resource = tab === 'personal' ? personal : content;
  const rows = tab === 'personal' ? personal.data?.items ?? [] : notices;
  const markRead = async () => {
    if (reading.current) return;
    const session = captureApiSession();
    if (!session.token) return;
    reading.current = true; setBusy(true); setError('');
    try { await api('/notifications/read', 'POST', {}); if (isApiSessionCurrent(session)) personal.refresh(); }
    catch (failure) { if (isApiSessionCurrent(session)) setError((failure as Error).message); }
    finally { reading.current = false; if (isApiSessionCurrent(session)) setBusy(false); }
  };
  const turnOnPush = async () => {
    if (enabling.current) return;
    const session = captureApiSession();
    if (!session.token) return;
    enabling.current = true; setPushBusy(true); setError('');
    try { await enablePush(); if (isApiSessionCurrent(session)) setPushEnabled(true); }
    catch (failure) { if (isApiSessionCurrent(session)) setError((failure as Error).message); }
    finally { enabling.current = false; if (isApiSessionCurrent(session)) setPushBusy(false); }
  };
  const open = (item: NotificationRow) => { if (item.data?.boundary && item.data?.event) navigation.navigate('flash_sale_screen'); else if (item.data?.orderId) navigation.navigate('order_detail_screen', { id: item.data.orderId }); else if (item.data?.conversationId) navigation.navigate('chat_room'); else if (item.data?.requestId) navigation.navigate('wallet_info'); else if (item.data?.grantId) navigation.navigate('voucher_page'); };
  return <Screen scroll={false}>
    <Header title={t('notifications')} onBack={() => navigation.goBack()} action={tab === 'personal' && Boolean(personal.data?.unread) ? <Button title={t('readAll')} onPress={() => { void markRead(); }} loading={busy} variant="quiet" style={styles.readAll}/> : undefined}/>
    <SegmentedControl items={([{ value: 'personal', label: t('personalNotices') }, { value: 'content', label: t('contentNotices') }] as const).map(item => item)} value={tab} onChange={setTab}/>
    <View style={styles.pushPrompt}><View style={styles.pushIcon}><BellRing size={18} strokeWidth={1.5} color={colors.primary}/></View><View style={styles.pushAction}><Button title={t('enableNotifications')} onPress={() => { void turnOnPush(); }} loading={pushBusy} variant="quiet" style={styles.enableButton}/>{pushEnabled && <Notice message={t('notificationsEnabled')}/>}</View></View>
    {error && <View style={accountStyles.inset}><Notice message={error} danger/></View>}
    <FlatList<NotificationRow | Announcement> data={rows} keyExtractor={item => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={resource.loading && Boolean(resource.data)} onRefresh={resource.refresh} tintColor={colors.primary}/>} ListHeaderComponent={resource.error && rows.length ? <DataFeedback loading={resource.loading} error={resource.error} empty={false} title={t('noNotifications')} onRetry={resource.refresh}/> : null} ListEmptyComponent={<DataFeedback loading={resource.loading} error={resource.error} empty title={t('noNotifications')} onRetry={resource.refresh}/>}
      renderItem={({ item }) => {
        if (tab === 'content') { const notice = item as Announcement; return <View style={styles.notification}><View style={styles.bubbleIcon}><Bell size={19} color={colors.primary}/></View><View style={styles.notificationInfo}><AppText variant="label">{notice.title}</AppText>{notice.sub && <AppText style={styles.body}>{notice.sub}</AppText>}{notice.content && <RichProductDescription html={notice.content} width={Math.max(0, width - 87)}/>}</View></View>; }
        const notification = item as NotificationRow;
        const Icon = notification.data?.orderId ? Package : notification.data?.conversationId ? MessageCircle : notification.data?.requestId ? Wallet : notification.data?.grantId ? Ticket : Bell;
        const body = <><View style={styles.bubbleIcon}><Icon size={19} strokeWidth={1.6} color={colors.primary}/></View><View style={styles.notificationInfo}><View style={styles.titleRow}><AppText variant="label" style={accountStyles.flex}>{notification.title}</AppText>{!notification.read_at && <View style={styles.unreadDot}/>}</View><AppText style={styles.body}>{notification.body}</AppText><AppText style={styles.date}>{recordDate(notification.created_at, language, t('dateUnknown'))}</AppText></View></>;
        const linked = notification.data?.boundary || notification.data?.orderId || notification.data?.conversationId || notification.data?.requestId || notification.data?.grantId;
        return linked ? <Pressable accessibilityRole="button" onPress={() => open(notification)} style={({ pressed }) => [styles.notification, pressed && accountStyles.pressed]}>{body}</Pressable> : <View style={styles.notification}>{body}</View>;
      }}
      ListFooterComponent={tab === 'personal' && (offset > 0 || (personal.data?.items.length ?? 0) === 30) ? <View style={styles.pages}><Button title={t('back')} onPress={() => setOffset(Math.max(0, offset - 30))} variant="quiet" disabled={offset === 0 || personal.loading}/><Button title={t('loadMore')} onPress={() => setOffset(offset + 30)} variant="quiet" disabled={(personal.data?.items.length ?? 0) < 30 || personal.loading}/></View> : null}/>
    <CommerceFooter/>
  </Screen>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 26 }, notification: { flexDirection: 'row', gap: 12, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.line },
  notificationInfo: { flex: 1, gap: 5 }, bubbleIcon: { width: 39, height: 39, borderRadius: 12, backgroundColor: '#F3EDF8', alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.secondary }, body: { color: '#81768B', fontSize: 11, lineHeight: 17 }, date: { color: '#9A8F9F', fontSize: 10, lineHeight: 15 },
  readAll: { paddingHorizontal: 0, minHeight: 44, maxWidth: '48%' },
  pushPrompt: { marginHorizontal: 18, marginTop: 2, marginBottom: 3, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.line },
  pushIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.softPurple, alignItems: 'center', justifyContent: 'center' },
  pushAction: { flex: 1 }, enableButton: { alignSelf: 'flex-start', paddingHorizontal: 0, paddingVertical: 10, minHeight: 44 },
  pages: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
});
