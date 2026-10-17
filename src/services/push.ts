import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { api, getApiToken } from './api';

type PushData = Record<string, string>;
type OpenNotification = (data: PushData) => void;

const channelId = 'destiny_events';
const tokenKey = 'destiny.push-token';
let generation = 0;
let activeCleanup: (() => void) | undefined;
let callbacks: { onOpen: OpenNotification; onMessage?: () => void } | undefined;

export function stopPush() {
  generation += 1;
  activeCleanup?.();
  activeCleanup = undefined;
  callbacks = undefined;
}

function stringData(value: Record<string, unknown> | undefined): PushData {
  return Object.fromEntries(Object.entries(value ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string'));
}

async function prepareChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(channelId, {
      name: 'Destiny USA',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
    });
  }
}

async function permissionGranted() {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'ios') {
    const messaging = await import('@react-native-firebase/messaging');
    const status = await messaging.hasPermission(messaging.getMessaging());
    return status === messaging.AuthorizationStatus.AUTHORIZED || status === messaging.AuthorizationStatus.PROVISIONAL;
  }
  return (await Notifications.getPermissionsAsync()).granted;
}

export async function initializePush(onOpen: OpenNotification, onMessage?: () => void): Promise<() => void> {
  stopPush();
  callbacks = { onOpen, onMessage };
  const currentGeneration = generation;
  const ownerToken = getApiToken();
  if (!ownerToken || !(await permissionGranted())) return () => {};
  await prepareChannel();
  const messaging = await import('@react-native-firebase/messaging');
  const instance = messaging.getMessaging();
  if (Platform.OS === 'ios' && !messaging.isDeviceRegisteredForRemoteMessages(instance)) {
    await messaging.registerDeviceForRemoteMessages(instance);
  }
  if (generation !== currentGeneration || getApiToken() !== ownerToken) return () => {};
  let disposed = false;
  const currentSession = () => !disposed && generation === currentGeneration && getApiToken() === ownerToken;
  const received = new Set<string>();
  const opened = new Set<string>();
  const remember = (history: Set<string>, identifier: string) => {
    history.add(identifier);
    if (history.size > 100) history.delete(history.values().next().value!);
  };
  const openNotification = (data: PushData, identifier?: string) => {
    if (!currentSession() || (identifier && opened.has(identifier))) return;
    if (identifier) remember(opened, identifier);
    onOpen(data);
  };
  const registerToken = async (token: string) => {
    if (!currentSession()) return;
    await api('/devices', 'POST', { token, platform: Platform.OS });
    if (currentSession()) await SecureStore.setItemAsync(tokenKey, token);
  };
  Notifications.setNotificationHandler({
    handleNotification: async notification => ({
      shouldShowBanner: currentSession() && notification.request.content.data?.destinyLocal === '1',
      shouldShowList: currentSession() && notification.request.content.data?.destinyLocal === '1',
      shouldPlaySound: currentSession() && notification.request.content.data?.destinyLocal === '1',
      shouldSetBadge: false,
    }),
  });
  const unsubscribeMessages = messaging.onMessage(instance, async message => {
    if (!currentSession()) return;
    const data = stringData(message.data);
    const identifier = data.notificationId || message.messageId;
    if (identifier && received.has(identifier)) return;
    if (identifier) remember(received, identifier);
    onMessage?.();
    if (!message.notification || AppState.currentState !== 'active') return;
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: identifier ? `destiny-${identifier}` : undefined,
        content: {
          title: message.notification.title,
          body: message.notification.body,
          sound: 'default',
          data: { ...data, destinyLocal: '1' },
        },
        trigger: Platform.OS === 'android' ? { channelId } : null,
      });
    } catch {}
  });
  const unsubscribeOpened = messaging.onNotificationOpenedApp(instance, message => {
    const data = stringData(message.data);
    openNotification(data, data.notificationId || message.messageId);
  });
  const unsubscribeToken = messaging.onTokenRefresh(instance, token => { void registerToken(token).catch(() => {}); });
  const localResponse = Notifications.addNotificationResponseReceivedListener(response => {
    const data = stringData(response.notification.request.content.data);
    if (data.destinyLocal !== '1') return;
    delete data.destinyLocal;
    openNotification(data, data.notificationId || response.notification.request.identifier);
    void Notifications.clearLastNotificationResponseAsync().catch(() => {});
  });
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    unsubscribeMessages();
    unsubscribeOpened();
    unsubscribeToken();
    localResponse.remove();
    if (activeCleanup === cleanup) activeCleanup = undefined;
  };
  activeCleanup = cleanup;
  try {
    await registerToken(await messaging.getToken(instance));
    const initial = await messaging.getInitialNotification(instance);
    if (initial) {
      const data = stringData(initial.data);
      openNotification(data, data.notificationId || initial.messageId);
    }
    const localInitial = await Notifications.getLastNotificationResponseAsync();
    if (localInitial) {
      const data = stringData(localInitial.notification.request.content.data);
      if (data.destinyLocal === '1') {
        delete data.destinyLocal;
        openNotification(data, data.notificationId || localInitial.notification.request.identifier);
        await Notifications.clearLastNotificationResponseAsync();
      }
    }
    return cleanup;
  } catch (error) {
    cleanup();
    throw error;
  }
}

export async function enablePush(onOpen?: OpenNotification, onMessage?: () => void): Promise<() => void> {
  if (Platform.OS === 'web') throw new Error('Thông báo cần được bật trong ứng dụng Android hoặc iOS.');
  const ownerToken = getApiToken();
  if (!ownerToken) throw new Error('Vui lòng đăng nhập trước khi bật thông báo.');
  const configured = onOpen ? { onOpen, onMessage } : callbacks;
  if (!configured) throw new Error('Vui lòng mở lại ứng dụng trước khi bật thông báo.');
  await prepareChannel();
  if (Platform.OS === 'ios') {
    const messaging = await import('@react-native-firebase/messaging');
    const status = await messaging.requestPermission(messaging.getMessaging(), { alert: true, badge: true, sound: true });
    if (status !== messaging.AuthorizationStatus.AUTHORIZED && status !== messaging.AuthorizationStatus.PROVISIONAL) {
      throw new Error('Bạn chưa cho phép thông báo. Vui lòng bật trong Cài đặt của thiết bị.');
    }
  } else if (!(await Notifications.requestPermissionsAsync()).granted) {
    throw new Error('Bạn chưa cho phép thông báo. Vui lòng bật trong Cài đặt của thiết bị.');
  }
  if (getApiToken() !== ownerToken) return () => {};
  return initializePush(configured.onOpen, configured.onMessage);
}

export const enableNotifications = enablePush;
