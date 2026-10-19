const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

const compile = source => typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, jsx: typescript.JsxEmit.ReactJSX, target: typescript.ScriptTarget.ES2022 } }).outputText;
const source = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');

test('footer visibility defaults to visible only after settings load and accepts the existing numeric switch format', () => {
  const module = { exports: {} };
  vm.runInNewContext(compile(source('services/footer-visibility.ts')), { module, exports: module.exports });
  for (const value of [undefined, 1, '1', true]) assert.equal(module.exports.appInfoFooterIsVisible(value), true);
  for (const value of [0, '0', false, null, 'invalid']) assert.equal(module.exports.appInfoFooterIsVisible(value), false);
  assert.match(source('state/MobileContext.tsx'), /showAppInfoFooter: false/);
});

function settingsHarness(authenticated = false) {
  const states = [authenticated ? { id: 'customer-fixture', status: authenticated === 'referral_required' ? authenticated : 'active' } : null, !authenticated, false, '', 'vi', null, { showWallet: false, showAppInfoFooter: false, showReferralButtons: false, showAboutApp: false }, false, '', 0, { regular: [], flashsale: [] }];
  const effects = [];
  const requests = [];
  const intervals = [];
  const events = {};
  let active;
  let stateIndex = 0;
  const socket = { on: (event, handler) => { events[event] = handler; }, disconnect() {} };
  const dependencies = {
    react: { createContext: () => ({ Provider: 'Provider' }), useCallback: value => value, useContext() {}, useState: () => { const index = stateIndex++; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; }, useRef: current => ({ current }), useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'react-native': { AppState: { addEventListener: (_, handler) => { active = handler; return { remove() {} }; } } },
    'expo-secure-store': {},
    'socket.io-client': { io: () => socket },
    '../services/api': { api: url => new Promise((resolve, reject) => requests.push({ url, resolve, reject })), captureApiSession: () => ({}), isApiSessionCurrent: () => true, getApiToken: () => 'fixture-only' },
    '../services/commerce': {},
    '../services/wallet-visibility': { walletIsVisible: value => value === undefined || Number(value) === 1 },
    '../services/footer-visibility': { appInfoFooterIsVisible: value => value === undefined || Number(value) === 1 },
    '../services/about-visibility': { aboutAppIsVisible: value => value === undefined || Number(value) === 1 },
    '../services/referral-visibility': { referralButtonsAreVisible: value => value === undefined || Number(value) === 1 },
    '../ui/strings': {},
  };
  const module = { exports: {} };
  vm.runInNewContext(compile(source('state/MobileContext.tsx')), { module, exports: module.exports, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; }, AbortController, setInterval: (callback, delay) => { assert.equal(delay, 30000); intervals.push(callback); return intervals.length; }, clearInterval() {} });
  module.exports.MobileProvider({ children: null });
  const cleanup = effects.find(effect => effect.toString().includes('pollSettings'))();
  return { requests, events, intervals, cleanup, foreground: () => active('active'), catalog: () => states[6], flush: () => new Promise(resolve => setImmediate(resolve)) };
}

test('guests sync only public settings and an older response cannot re-enable a newly hidden footer', async () => {
  const harness = settingsHarness();
  assert.deepEqual(harness.requests.map(request => request.url), ['/public/content/UI']);
  assert.equal(Object.keys(harness.events).length, 0);
  harness.intervals[0]();
  harness.requests[1].resolve({ items: [{ id: 'showAppInfoFooter', data: 0 }] }); await harness.flush();
  harness.requests[0].resolve({ items: [{ id: 'showAppInfoFooter', data: 1 }] }); await harness.flush();
  assert.equal(harness.catalog().showAppInfoFooter, false);
  harness.foreground();
  harness.requests[2].resolve({ items: [{ id: 'showAppInfoFooter', data: 1 }] }); await harness.flush();
  assert.equal(harness.catalog().showAppInfoFooter, true);
  assert.equal(harness.catalog().showWallet, false);
  harness.cleanup();
});

test('customer socket updates footer and wallet independently and ignores results after unmount', async () => {
  const harness = settingsHarness(true);
  assert.deepEqual(harness.requests.map(request => request.url), ['/content/UI', '/content/isShowWallet']);
  harness.requests[0].resolve({ items: [{ id: 'showAppInfoFooter', data: 0 }] });
  harness.requests[1].resolve({ items: [{ id: '__value', data: 1 }] }); await harness.flush();
  assert.equal(harness.catalog().showAppInfoFooter, false);
  assert.equal(harness.catalog().showWallet, true);
  harness.events['settings:changed']();
  harness.cleanup();
  harness.requests[2].resolve({ items: [{ id: 'showAppInfoFooter', data: 1 }] });
  harness.requests[3].resolve({ items: [{ id: '__value', data: 0 }] }); await harness.flush();
  assert.equal(harness.catalog().showAppInfoFooter, false);
  assert.equal(harness.catalog().showWallet, true);
});

test('About visibility syncs independently through customer socket and foreground, without changing footer or wallet', async () => {
  const harness = settingsHarness(true);
  harness.requests[0].resolve({ items: [{ id: 'showAboutApp', data: 0 }, { id: 'showAppInfoFooter', data: 1 }] });
  harness.requests[1].resolve({ items: [{ id: '__value', data: 1 }] }); await harness.flush();
  assert.equal(harness.catalog().showAboutApp, false);
  assert.equal(harness.catalog().showAppInfoFooter, true);
  assert.equal(harness.catalog().showWallet, true);
  harness.events['settings:changed']();
  harness.requests[2].resolve({ items: [{ id: 'showAboutApp', data: 1 }, { id: 'showAppInfoFooter', data: 0 }] });
  harness.requests[3].resolve({ items: [{ id: '__value', data: 1 }] }); await harness.flush();
  assert.equal(harness.catalog().showAboutApp, true);
  assert.equal(harness.catalog().showAppInfoFooter, false);
  harness.foreground();
  harness.requests[4].resolve({ items: [{ id: 'showAboutApp', data: 0 }] });
  harness.requests[5].resolve({ items: [{ id: '__value', data: 0 }] }); await harness.flush();
  assert.equal(harness.catalog().showAboutApp, false);
  harness.cleanup();
});

test('About visibility supports numeric flags and missing legacy settings', () => {
  const module = { exports: {} };
  vm.runInNewContext(compile(source('services/about-visibility.ts')), { module, exports: module.exports });
  for (const value of [undefined, 1, '1', true]) assert.equal(module.exports.aboutAppIsVisible(value), true);
  for (const value of [0, '0', false, null, 'invalid']) assert.equal(module.exports.aboutAppIsVisible(value), false);
  assert.match(source('state/MobileContext.tsx'), /showAboutApp: false/);
});

test('referral-required accounts sync only public display settings without accessing wallet, catalog or active-only sockets', async () => {
  const harness = settingsHarness('referral_required');
  assert.deepEqual(harness.requests.map(request => request.url), ['/public/content/UI']);
  assert.equal(Object.keys(harness.events).length, 0);
  harness.requests[0].resolve({ items: [{ id: 'showReferralButtons', data: 1 }] }); await harness.flush();
  assert.equal(harness.catalog().showReferralButtons, true);
  assert.equal(harness.catalog().showWallet, false);
  harness.intervals[0]();
  harness.requests[1].resolve({ items: [{ id: 'showReferralButtons', data: 0 }] }); await harness.flush();
  assert.equal(harness.catalog().showReferralButtons, false);
  harness.foreground();
  harness.requests[2].resolve({ items: [] }); await harness.flush();
  assert.equal(harness.catalog().showReferralButtons, true);
  harness.intervals[0]();
  harness.cleanup();
  harness.requests[3].resolve({ items: [{ id: 'showReferralButtons', data: 0 }] }); await harness.flush();
  assert.equal(harness.catalog().showReferralButtons, true);
});

test('referral button visibility supports the existing numeric flag and keeps legacy visibility when unset', () => {
  const module = { exports: {} };
  vm.runInNewContext(compile(source('services/referral-visibility.ts')), { module, exports: module.exports });
  for (const value of [undefined, 1, '1', true]) assert.equal(module.exports.referralButtonsAreVisible(value), true);
  for (const value of [0, '0', false, null, 'invalid']) assert.equal(module.exports.referralButtonsAreVisible(value), false);
});
