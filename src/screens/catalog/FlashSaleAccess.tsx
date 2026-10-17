import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Alert, AppState } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useResource } from '../../hooks/useResource';
import { flashSaleIsOpen } from '../../services/flash-sale-access';
import type { ContentRecord, FlashSchedule } from '../../types';
import { EmptyState, Header, LoadingState, Screen } from '../../ui/components';

export function FlashSaleAccess({ navigation, t, children }: { navigation: any; t: (key: string) => string; children: ReactNode }) {
  const resource = useResource<{ items: ContentRecord[] }>('/public/content/Flashsale');
  const [now, setNow] = useState(Date.now());
  const focused = useIsFocused();
  const notified = useRef(false);
  const schedule = useMemo(() => {
    const data = resource.data?.items.find(item => item.id === 'schedule')?.data as FlashSchedule | undefined;
    return data ? { ...data, receivedAt: Date.now() } : undefined;
  }, [resource.data]);
  useEffect(() => {
    if (!focused) return;
    const sync = () => setNow(Date.now());
    sync();
    const timer = setInterval(sync, 1000);
    const active = AppState.addEventListener('change', state => { if (state === 'active') { sync(); resource.refresh(); } });
    return () => { clearInterval(timer); active.remove(); };
  }, [focused, resource.refresh]);
  const open = flashSaleIsOpen(schedule, Math.max(now, schedule?.receivedAt ?? now));
  useEffect(() => {
    if (!focused || !resource.data || resource.loading || resource.error || open || notified.current) return;
    notified.current = true;
    Alert.alert(t('flashSale'), t('saleNotStarted'));
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('main_screen', { screen: 'main_page' });
  }, [focused, resource.data, resource.loading, resource.error, open, navigation, t]);
  if (resource.error) return <Screen><Header title={t('flashSale')} onBack={() => navigation.goBack()}/><EmptyState title={t('loadError')} action={t('tryAgain')} onPress={resource.refresh}/></Screen>;
  if (resource.loading || !resource.data) return <Screen><LoadingState/></Screen>;
  return open ? children : null;
}
