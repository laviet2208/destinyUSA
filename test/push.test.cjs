const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup(platform = 'android') {
  const state = { token: 'session-one', permission: true, calls: [], scheduled: [], opened: [], refreshes: 0, listeners: {}, storage: new Map(), initial: null, localInitial: null };
  const subscribe = event => (instance, listener) => {
    state.listeners[event] = listener;
    return () => { delete state.listeners[event]; };
  };
  const messaging = {
    getMessaging: () => ({}),
    getToken: async () => 'test-device-token-not-a-real-fcm-token',
    hasPermission: async () => state.permission ? 1 : 0,
    AuthorizationStatus: { AUTHORIZED: 1, PROVISIONAL: 2 },
    isDeviceRegisteredForRemoteMessages: () => false,
    registerDeviceForRemoteMessages: async () => state.calls.push('apns-register'),
    requestPermission: async () => { state.calls.push('ios-permission'); return state.permission ? 1 : 0; },
    onMessage: subscribe('message'),
    onNotificationOpenedApp: subscribe('open'),
    onTokenRefresh: subscribe('token'),
    getInitialNotification: async () => state.initial,
  };
  const notifications = {
    AndroidImportance: { HIGH: 6 },
    AndroidNotificationVisibility: { PRIVATE: 2 },
    setNotificationChannelAsync: async (...args) => state.calls.push(['channel', ...args]),
    getPermissionsAsync: async () => ({ granted: state.permission }),
    requestPermissionsAsync: async () => { state.calls.push('android-permission'); return { granted: state.permission }; },
    setNotificationHandler: handler => { state.handler = handler; },
    scheduleNotificationAsync: async request => { state.scheduled.push(request); return request.identifier; },
    addNotificationResponseReceivedListener: listener => {
      state.listeners.local = listener;
      return { remove: () => { delete state.listeners.local; } };
    },
    getLastNotificationResponseAsync: async () => state.localInitial,
    clearLastNotificationResponseAsync: async () => { state.localInitial = null; },
  };
  const modules = {
    'react-native': { Platform: { OS: platform }, AppState: { currentState: 'active' } },
    'expo-notifications': notifications,
    'expo-secure-store': { setItemAsync: async (key, value) => state.storage.set(key, value) },
    './api': { getApiToken: () => state.token, api: async (...args) => { state.calls.push(['api', ...args]); } },
    '@react-native-firebase/messaging': messaging,
  };
  const filename = path.join(__dirname, '../src/services/push.ts');
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
    return modules[name];
  } }, { filename });
  return { state, push: exports, open: data => state.opened.push(data), refresh: () => { state.refreshes += 1; } };
}

test('restore never prompts and does not register when permission is missing', async () => {
  const { state, push, open } = setup();
  state.permission = false;
  const cleanup = await push.initializePush(open);
  cleanup();
  assert.equal(state.calls.length, 0);
  assert.equal(Object.keys(state.listeners).length, 0);
});

test('Android explicit enable registers one device and presents foreground messages once', async () => {
  const { state, push, open, refresh } = setup();
  const cleanup = await push.enablePush(open, refresh);
  assert.equal(state.calls[0][0], 'channel');
  assert.equal(state.calls[0][1], 'destiny_events');
  assert.ok(state.calls.includes('android-permission'));
  assert.equal(state.calls.filter(call => Array.isArray(call) && call[0] === 'api').length, 1);
  const registration = state.calls.find(call => Array.isArray(call) && call[0] === 'api');
  assert.equal(registration[1], '/devices');
  assert.equal(registration[2], 'POST');
  assert.equal(registration[3].platform, 'android');
  assert.equal(state.storage.get('destiny.push-token'), registration[3].token);
  const message = { messageId: 'message-1', notification: { title: 'Order', body: 'Processed' }, data: { kind: 'order', orderId: 'order-1', notificationId: 'notice-1', invalid: { nested: true } } };
  await state.listeners.message(message);
  await state.listeners.message(message);
  assert.equal(state.scheduled.length, 1);
  assert.equal(state.refreshes, 1);
  assert.equal(state.scheduled[0].content.title, 'Order');
  assert.equal(state.scheduled[0].trigger.channelId, 'destiny_events');
  assert.equal(state.scheduled[0].content.data.invalid, undefined);
  const remotePresentation = await state.handler.handleNotification({ request: { content: { data: {} } } });
  assert.equal(remotePresentation.shouldShowBanner, false);
  const localPresentation = await state.handler.handleNotification({ request: { content: { data: { destinyLocal: '1' } } } });
  assert.equal(localPresentation.shouldShowBanner, true);
  state.listeners.open(message);
  state.listeners.local({ notification: { request: { identifier: 'destiny-notice-1', content: { data: state.scheduled[0].content.data } } } });
  assert.equal(state.opened.length, 1);
  assert.equal(state.opened[0].orderId, 'order-1');
  assert.equal(state.opened[0].destinyLocal, undefined);
  cleanup();
  assert.equal(Object.keys(state.listeners).length, 0);
  assert.equal((await state.handler.handleNotification({ request: { content: { data: { destinyLocal: '1' } } } })).shouldShowBanner, false);
});

test('token refresh and callbacks stop affecting another login session', async () => {
  const { state, push, open } = setup();
  const cleanup = await push.initializePush(open);
  state.listeners.token('refreshed-device-token-not-real');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.storage.get('destiny.push-token'), 'refreshed-device-token-not-real');
  const callCount = state.calls.length;
  state.token = 'session-two';
  state.listeners.token('stale-token-must-not-register');
  await state.listeners.message({ notification: { title: 'Old account' }, data: { notificationId: 'old' } });
  state.listeners.open({ data: { kind: 'order' } });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.calls.length, callCount);
  assert.equal(state.scheduled.length, 0);
  assert.equal(state.opened.length, 0);
  cleanup();
});

test('iOS restores granted permission without prompting and opens cold-start data', async () => {
  const { state, push, open } = setup('ios');
  state.initial = { data: { kind: 'chat', conversationId: 'conversation-1' }, messageId: 'initial-message' };
  const cleanup = await push.initializePush(open);
  assert.ok(state.calls.includes('apns-register'));
  assert.ok(!state.calls.includes('ios-permission'));
  assert.equal(state.opened.length, 1);
  assert.equal(state.opened[0].conversationId, 'conversation-1');
  cleanup();
});

test('web never attempts native registration and explicit enable fails clearly', async () => {
  const { state, push, open } = setup('web');
  (await push.initializePush(open))();
  await assert.rejects(push.enablePush(open), /Android/);
  assert.equal(state.calls.length, 0);
});

test('explicit enable inherits root callbacks and global cleanup removes all listeners', async () => {
  const { state, push, open } = setup();
  state.permission = false;
  (await push.initializePush(open))();
  state.permission = true;
  const firstCleanup = await push.enablePush();
  state.listeners.open({ data: { kind: 'order' } });
  assert.equal(state.opened.length, 1);
  const secondCleanup = await push.initializePush(open);
  firstCleanup();
  assert.equal(Object.keys(state.listeners).length, 4);
  push.stopPush();
  assert.equal(Object.keys(state.listeners).length, 0);
  secondCleanup();
  assert.equal(Object.keys(state.listeners).length, 0);
});
