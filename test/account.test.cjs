const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

function screenHarness(filename, options = {}) {
  const state = [...(options.state ?? [])];
  const references = [];
  const requests = [];
  const alerts = [];
  const clipboard = [];
  const navigations = [];
  let stateIndex = 0;
  let refIndex = 0;
  let uuidIndex = 0;
  let refreshes = 0;
  let accountRefreshes = 0;
  let logoutCount = 0;
  let session = { token: 'session-A', generation: 1 };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const mobile = {
    account: { id: 'customer-fixture', email: 'customer@example.test', first_name: 'First', last_name: 'Last', phone: '0123456789', address: 'Combined address', balance: 500, referral_code: 'REF' },
    t: key => key,
    language: 'en',
    catalog: { showWallet: true, showAboutApp: true },
    revision: 0,
    refresh: () => { refreshes += 1; },
    refreshAccount: async () => { accountRefreshes += 1; },
    logout: async () => { logoutCount += 1; },
    setLanguage: async () => {},
  };
  const resource = { data: options.data ?? null, loading: false, error: '', refresh: () => { refreshes += 1; } };
  const modules = {
    react: {
      useState(initial) {
        const index = stateIndex++;
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
        return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useRef(initial) { const index = refIndex++; return references[index] ?? (references[index] = { current: initial }); },
      useEffect() {},
    },
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': new Proxy({ StyleSheet: { create: value => value, hairlineWidth: 1 }, Alert: { alert: (...arguments_) => alerts.push(arguments_) }, useWindowDimensions: () => ({ width: 390, height: 844 }), Linking: { openURL: async () => {} } }, { get: (target, key) => target[key] ?? String(key) }),
    'expo-crypto': { randomUUID: () => `operation-${++uuidIndex}` },
    'expo-clipboard': { setStringAsync: async value => { clipboard.push(value); return options.copy ? options.copy(value) : true; } },
    'lucide-react-native': new Proxy({}, { get: (_, key) => String(key) }),
    '../../state/MobileContext': { useMobile: () => mobile },
    '../../services/api': { api: async (...arguments_) => { requests.push(arguments_); return options.api ? options.api(...arguments_) : {}; }, mediaUrl: value => value ?? '', captureApiSession: () => ({ ...session }), isApiSessionCurrent: value => value.token === session.token && value.generation === session.generation },
    '../../services/commerce': { money: value => String(value), voucherData: value => value.voucher ?? value.voucher_snapshot ?? value.data },
    '../../services/push': { enablePush: () => options.enablePush?.() ?? Promise.resolve(() => {}) },
    '../../services/flash-sale-access': { enterFlashSale: (schedule, open, unavailable) => schedule?.active ? open() : unavailable() },
    '../../ui/components': new Proxy({}, { get: (_, key) => String(key) }),
    '../../ui/commerce': new Proxy({}, { get: (_, key) => String(key) }),
    '../../ui/CommerceFooter': { CommerceFooter: 'CommerceFooter' },
    '../../ui/AvailableBalance': { AvailableBalance: 'AvailableBalance' },
    '../../ui/BrandLogo': { BrandLogo: 'BrandLogo' },
    '../../ui/AppInfoFooter': { AppInfoFooter: 'AppInfoFooter' },
    '../../ui/AccountIdentityCard': { AccountIdentityCard: 'AccountIdentityCard' },
    '../../ui/theme': { colors: { deepPurple: '#321454' }, radius: {}, spacing: {} },
    '../../ui/VoucherFace': { VoucherFace: 'VoucherFace' },
    '../../ui/strings': { languages: [{ id: 'en', name: 'English' }] },
    '../catalog/RichProductDescription': { RichProductDescription: 'RichProductDescription' },
    '../../ui/AboutDocument': { AboutDocument: 'AboutDocument' },
    '../../services/about-document': { isAboutDocument: html => /<(?:!doctype|html|head|style)\b/i.test(html) },
    './account-ui': { AboutAccess: ({ children }) => mobile.catalog.showAboutApp ? children : null, accountStyles: {}, MenuRow: 'MenuRow', DataFeedback: 'DataFeedback', PageControls: 'PageControls', WalletAccess: ({ required = true, children }) => !required || mobile.catalog.showWallet ? children : null, useAccountResource: requestedPath => options.resource ? options.resource(requestedPath) : resource, recordDate: value => value ?? 'dateUnknown' },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/account', filename), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, target: typescript.ScriptTarget.ES2022, jsx: typescript.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`); return modules[name]; }, console }, { filename });
  const navigation = { navigate: (...arguments_) => navigations.push(arguments_), goBack: () => navigations.push(['back']) };
  return {
    render(name, route) { stateIndex = 0; refIndex = 0; let tree = module.exports[name]({ navigation, route }); while (typeof tree?.type === 'function') tree = tree.type(tree.props); return tree; },
    state, requests, alerts, navigations, mobile, clipboard,
    get refreshes() { return refreshes; },
    get accountRefreshes() { return accountRefreshes; },
    get logoutCount() { return logoutCount; },
    invalidateSession() { session = { token: 'session-B', generation: session.generation + 1 }; },
    flush: () => new Promise(resolve => setImmediate(resolve)),
  };
}

function elements(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(elements);
  return [tree, ...elements(tree.props?.children), ...elements(tree.props?.footer)];
}

function button(tree, title) {
  const result = elements(tree).find(element => element.type === 'Button' && element.props.title === title);
  assert.ok(result, `Button ${title} exists`);
  return result.props;
}

const requestBody = (harness, index) => JSON.parse(JSON.stringify(harness.requests[index][2]));

test('Account member card uses current identity and preserves the profile edit route', () => {
  const harness = screenHarness('AccountScreen.tsx');
  const card = elements(harness.render('AccountScreen')).find(node => node.type === 'AccountIdentityCard');
  assert.equal(card.props.account, harness.mobile.account);
  assert.equal(card.props.referralLabel, 'referral');
  assert.equal(card.props.editLabel, 'profile');
  card.props.onEdit();
  assert.deepEqual(harness.navigations.map(arguments_ => [...arguments_]), [['account_info_screen']]);
  harness.mobile.account = null;
  assert.equal(elements(harness.render('AccountScreen')).some(node => node.type === 'AccountIdentityCard'), false);
});

test('hiding wallet removes Account Balance and prevents wallet, withdrawal and money-support screens mounting', () => {
  const account = screenHarness('AccountScreen.tsx');
  assert.ok(elements(account.render('AccountScreen')).some(node => node.props.children === 'balance'));
  account.mobile.catalog.showWallet = false;
  assert.equal(elements(account.render('AccountScreen')).some(node => node.props.children === 'balance'), false);
  for (const [file, screen] of [['WalletScreen.tsx', 'WalletScreen'], ['WithdrawalScreen.tsx', 'WithdrawalScreen']]) {
    const harness = screenHarness(file);
    harness.mobile.catalog.showWallet = false;
    assert.equal(harness.render(screen), null);
    assert.equal(harness.requests.length, 0);
  }
  const support = screenHarness('SupportScreen.tsx');
  support.mobile.catalog.showWallet = false;
  assert.equal(support.render('SupportScreen', { params: { mode: 'withdrawal' } }), null);
  assert.equal(support.render('SupportScreen', { params: { mode: 'deposit' } }), null);
  assert.ok(support.render('SupportScreen'));
});

test('withdrawal support and form both display available balance without exposing it in ordinary support or deposit', () => {
  const form = screenHarness('WithdrawalScreen.tsx');
  assert.equal(elements(form.render('WithdrawalScreen')).filter(node => node.type === 'AvailableBalance').length, 1);
  const support = screenHarness('SupportScreen.tsx');
  assert.equal(elements(support.render('SupportScreen', { params: { mode: 'withdrawal' } })).filter(node => node.type === 'AvailableBalance').length, 1);
  assert.equal(elements(support.render('SupportScreen')).filter(node => node.type === 'AvailableBalance').length, 0);
  assert.equal(elements(support.render('SupportScreen', { params: { mode: 'deposit' } })).filter(node => node.type === 'AvailableBalance').length, 0);
  assert.equal(form.requests.length, 0);
  assert.equal(support.requests.length, 0);
});

test('About visibility hides its Account entry and prevents content from mounting without removing saved content', () => {
  const account = screenHarness('AccountScreen.tsx');
  assert.ok(elements(account.render('AccountScreen')).some(node => node.props.title === 'aboutApp'));
  account.mobile.catalog.showAboutApp = false;
  assert.equal(elements(account.render('AccountScreen')).some(node => node.props.title === 'aboutApp'), false);
  let fetches = 0;
  const harness = screenHarness('AboutScreen.tsx', { resource: () => { fetches += 1; return { data: { html: '<p>Saved</p>' } }; } });
  harness.mobile.catalog.showAboutApp = false;
  assert.equal(harness.render('AboutScreen'), null);
  assert.equal(fetches, 0);
  harness.mobile.catalog.showAboutApp = true;
  assert.ok(harness.render('AboutScreen'));
  assert.equal(fetches, 1);
});

test('About requests the selected locale instead of a fixed English page', () => {
  const paths = [];
  const harness = screenHarness('AboutScreen.tsx', { resource: requestedPath => { paths.push(requestedPath); return { data: { html: '<p>About</p>' }, refresh() {} }; } });
  harness.mobile.language = 'vi'; harness.render('AboutScreen');
  harness.mobile.language = 'fr'; harness.render('AboutScreen');
  assert.deepEqual(paths, ['/public/about?language=vi', '/public/about?language=fr']);
  const tree = harness.render('AboutScreen');
  assert.equal(tree.props.surface, '#321454');
  assert.equal(elements(tree).find(node => node.type === 'Header').props.tone, 'purple');
  assert.equal(elements(tree).find(node => node.type === 'RichProductDescription').props.html, '<p>About</p>');
});

test('full About documents use the complete layout without an extra legacy hero, article card or nested scroll container', () => {
  const html = '<!doctype html><html><head><style>.hero{display:grid}</style></head><body><footer>Contacts</footer></body></html>';
  const harness = screenHarness('AboutScreen.tsx', { data: { html } });
  const tree = harness.render('AboutScreen');
  assert.equal(elements(tree).find(node => node.type === 'AboutDocument').props.html, html);
  assert.equal(elements(tree).filter(node => node.type === 'CommerceFooter').length, 1);
  assert.ok(!elements(tree).some(node => ['RichProductDescription', 'ScrollView', 'BrandLogo'].includes(node.type)));
});

test('wallet copies the actual account email, gives feedback and retains deposit/withdrawal routes', async () => {
  const harness = screenHarness('WalletScreen.tsx');
  const walletHeader = () => elements(harness.render('WalletScreen')).find(node => node.type === 'FlatList').props.ListHeaderComponent;
  const copyButton = () => elements(walletHeader()).find(node => node.props.accessibilityLabel === 'copyEmail');
  assert.ok(elements(walletHeader()).some(node => node.type === 'BrandLogo'));
  assert.ok(elements(walletHeader()).some(node => node.props.children === 'customer@example.test'));
  assert.equal(elements(walletHeader()).some(node => node.props.children === 'Destiny USA · USDT'), false);
  assert.ok(elements(walletHeader()).some(node => node.props.style?.backgroundColor === '#151419'));
  copyButton().props.onPress(); await harness.flush();
  assert.deepEqual(harness.clipboard, ['customer@example.test']);
  assert.ok(elements(walletHeader()).some(node => node.props.accessibilityLabel === 'emailCopied'));
  for (const label of ['deposit', 'withdraw']) {
    elements(walletHeader()).find(node => node.type === 'Pressable' && elements(node).some(child => child.props.children === label)).props.onPress();
  }
  assert.deepEqual(JSON.parse(JSON.stringify(harness.navigations)), [['customer_care', {mode:'deposit'}], ['customer_care', {mode:'withdrawal'}]]);
  assert.equal(harness.requests.length, 0);
});

test('wallet clipboard failures show a localized fallback without reporting success', async () => {
  for (const copy of [async () => false, async () => { throw new Error('denied'); }]) {
    const harness = screenHarness('WalletScreen.tsx', { copy });
    const header = () => elements(harness.render('WalletScreen')).find(node => node.type === 'FlatList').props.ListHeaderComponent;
    elements(header()).find(node => node.props.accessibilityLabel === 'copyEmail').props.onPress();
    await harness.flush();
    assert.ok(elements(header()).some(node => node.props.children === 'copyFailed'));
    assert.equal(elements(header()).some(node => node.props.accessibilityLabel === 'emailCopied'), false);
  }
});

test('wallet uses green credits and deposits, red debits and withdrawals in both history tabs', () => {
  const harness = screenHarness('WalletScreen.tsx');
  for (const mode of ['ledger', 'requests']) {
    harness.state[0] = mode;
    const list = elements(harness.render('WalletScreen')).find(node => node.type === 'FlatList');
    for (const direction of mode === 'ledger' ? ['credit', 'debit'] : ['deposit', 'withdrawal']) {
      const row = list.props.renderItem({ item: { id:'history-fixture', direction, amount:50, content:'Transaction', status:'pending', created_at:null } });
      const amount = elements(row).find(node => Array.isArray(node.props.children) && node.props.children.includes(' USDT'));
      const incoming = direction === 'credit' || direction === 'deposit';
      assert.equal(amount.props.style[1].color, incoming ? '#16805C' : '#BD3949');
      assert.equal(amount.props.children[0], mode === 'ledger' ? incoming ? '+' : '−' : '');
    }
  }
});

test('profile saves profile fields only, never balance, status, email or credentials', async () => {
  const harness = screenHarness('ProfileScreen.tsx');
  button(harness.render('ProfileScreen'), 'saveInformation').onPress();
  await harness.flush();
  assert.deepEqual(harness.requests[0].slice(0, 2), ['/me', 'PATCH']);
  assert.deepEqual(requestBody(harness, 0), { firstName: 'First', lastName: 'Last', phone: '0123456789', address: 'Combined address' });
  assert.equal(harness.accountRefreshes, 1);
});

test('withdrawal verifies credentials before requesting funds and retains its idempotency key after timeout', async () => {
  let moneyAttempts = 0;
  const harness = screenHarness('WithdrawalScreen.tsx', {
    state: ['100', false, 'A'.repeat(30), 'customer@example.test', 'fixture-password', false, ''],
    api: async route => { if (route === '/money-requests' && ++moneyAttempts === 1) throw new Error('timeout'); return {}; },
  });
  button(harness.render('WithdrawalScreen'), 'confirm').onPress();
  await harness.flush();
  button(harness.render('WithdrawalScreen'), 'confirm').onPress();
  await harness.flush();
  assert.deepEqual(harness.requests.map(request => request[0]), ['/auth/verify-password', '/money-requests', '/auth/verify-password', '/money-requests']);
  assert.deepEqual(requestBody(harness, 1), { direction: 'withdrawal', amount: 100, walletAddress: 'A'.repeat(30) });
  assert.deepEqual(requestBody(harness, 1), requestBody(harness, 3));
  assert.equal(harness.requests[1][3], harness.requests[3][3]);
  assert.equal(harness.requests[1][3], 'operation-1');
  assert.equal(harness.alerts.at(-1)[0], 'requestSent');
});

test('withdrawal submit remains disabled for fractional amounts or whitespace in the wallet', () => {
  const fractional = screenHarness('WithdrawalScreen.tsx', { state: ['50.5', true, 'A'.repeat(30), 'customer@example.test', 'fixture-password', false, ''] });
  const badWallet = screenHarness('WithdrawalScreen.tsx', { state: ['50', false, `${'A'.repeat(30)} `, 'customer@example.test', 'fixture-password', false, ''] });
  assert.equal(button(fractional.render('WithdrawalScreen'), 'confirm').disabled, true);
  assert.equal(button(badWallet.render('WithdrawalScreen'), 'confirm').disabled, true);
});

test('order cancellation only requests admin approval and retries the same operation key', async () => {
  let attempts = 0;
  const harness = screenHarness('OrderScreens.tsx', { data: { id: 'order-fixture', status: 'pending', subtotal: 100, paid_amount: 100, voucher_value: 10, refunded_amount: 0, receiver: {}, items: [], events: [] }, api: async () => { if (++attempts === 1) throw new Error('timeout'); return {}; } });
  const confirmCancellation = () => {
    button(harness.render('OrderDetailScreen', { params: { id: 'order-fixture' } }), 'cancelOrder').onPress();
    harness.alerts.at(-1)[2].find(action => action.text === 'confirm').onPress();
  };
  confirmCancellation(); await harness.flush();
  confirmCancellation(); await harness.flush();
  assert.equal(harness.requests.length, 2);
  assert.equal(harness.requests[0][0], '/orders/order-fixture/cancel-request');
  assert.deepEqual(requestBody(harness, 0), {});
  assert.equal(harness.requests[0][3], harness.requests[1][3]);
  assert.ok(harness.requests.every(request => !request[0].includes('refund')));
});

test('gifting a personal voucher sends only the grant and recipient, retaining the key on retry', async () => {
  let attempts = 0;
  const voucher = { id: 'grant-fixture', scope: 'flashsale', voucher: { Money: 20, type: 1, eventName: 'Fixture voucher' } };
  const harness = screenHarness('VoucherScreens.tsx', { state: [voucher, 'receiver@example.test', false, '', '', ''], data: { items: [], grants: [voucher] }, api: async () => { if (++attempts === 1) throw new Error('timeout'); return {}; } });
  button(harness.render('VouchersScreen'), 'gift').onPress(); await harness.flush();
  button(harness.render('VouchersScreen'), 'gift').onPress(); await harness.flush();
  assert.equal(harness.requests[0][0], '/vouchers/transfer');
  assert.deepEqual(requestBody(harness, 0), { grantId: 'grant-fixture', receiverEmail: 'receiver@example.test' });
  assert.equal(harness.requests[0][3], harness.requests[1][3]);
});

test('Flash sale voucher keeps dates, status and gift action in the artwork without a subtotal line or extra panel', () => {
  const voucher = { id: 'compact-grant', scope: 'flashsale', status: 'available', voucher: { Money: 51, type: 1, eventName: 'Purchase reward', mincost: 1000, startTime: { year: 2026, month: 10, day: 17 }, endTime: { year: 2026, month: 10, day: 27 } } };
  const harness = screenHarness('VoucherScreens.tsx', { data: { items: [], grants: [voucher] } });
  const list = elements(harness.render('VouchersScreen')).find(element => element.type === 'FlatList');
  const card = list.props.renderItem({ item: { voucher, personal: true } });
  assert.equal(card.props.children.type, 'VoucherFace');
  assert.equal(card.props.children.props.value, '51');
  assert.equal(card.props.children.props.unit, 'USDT');
  assert.equal(card.props.children.props.scope, 'flashsale');
  const details = card.props.children.props.details;
  assert.ok(JSON.stringify(details).includes('17/10/2026'));
  assert.ok(JSON.stringify(details).includes('27/10/2026'));
  assert.ok(!JSON.stringify(details).includes('1000'));
  assert.ok(!JSON.stringify(details).includes('subTotal'));
  const gift = elements(details).find(element => element.type === 'Pressable' && element.props.accessibilityLabel === 'giftThisVoucher');
  assert.ok(gift); gift.props.onPress();
  assert.equal(harness.state[0].id, 'compact-grant');
  assert.equal(harness.requests.length, 0);
});

test('voucher wallet contains only Flash sale vouchers and only personal grants have a gift action', () => {
  const personal = { id: 'private-flash', scope: 'flashsale', voucher: { Money: 20, type: 1 } };
  const common = { id: 'common-flash', scope: 'flashsale', data: { Money: 30, type: 1 } };
  const legacy = { id: 'legacy-private', scope: 'regular', voucher: { Money: 40, type: 1 } };
  let requested;
  const harness = screenHarness('VoucherScreens.tsx', { resource: path => { requested = path; return { loading: false, error: '', data: { grants: [personal, legacy], items: [common] }, refresh() {} }; } });
  const tree = harness.render('VouchersScreen');
  assert.equal(requested, '/vouchers?channel=flashsale');
  assert.equal(elements(tree).some(node => node.type === 'SegmentedControl'), false);
  const list = elements(tree).find(node => node.type === 'FlatList');
  assert.deepEqual(Array.from(list.props.data, item => item.voucher.id), ['private-flash', 'common-flash']);
  const privateCard = list.props.renderItem({ item: { voucher: personal, personal: true } });
  const commonCard = list.props.renderItem({ item: { voucher: common, personal: false } });
  assert.ok(elements(privateCard.props.children.props.details).some(node => node.type === 'Pressable' && node.props.accessibilityLabel === 'giftThisVoucher'));
  assert.ok(!elements(commonCard.props.children.props.details).some(node => node.type === 'Pressable'));
});

test('notification enable success is displayed only after push registration resolves', async () => {
  let complete;
  const registration = new Promise(resolve => { complete = resolve; });
  const harness = screenHarness('NotificationsScreen.tsx', { enablePush: () => registration, resource: requestedPath => ({ data: requestedPath?.startsWith('/notifications') ? { items: [], unread: 0 } : { items: [] }, loading: false, error: '', refresh() {} }) });
  button(harness.render('NotificationsScreen'), 'enableNotifications').onPress();
  assert.equal(elements(harness.render('NotificationsScreen')).some(element => element.type === 'Notice' && element.props.message === 'notificationsEnabled'), false);
  complete(() => {}); await harness.flush();
  assert.equal(elements(harness.render('NotificationsScreen')).some(element => element.type === 'Notice' && element.props.message === 'notificationsEnabled'), true);
});

test('withdrawal double press is gated synchronously and a changed session never submits the second step', async () => {
  let completeVerification;
  const verification = new Promise(resolve => { completeVerification = resolve; });
  const harness = screenHarness('WithdrawalScreen.tsx', { state: ['50', false, 'A'.repeat(30), 'customer@example.test', 'fixture-password', false, ''], api: route => route === '/auth/verify-password' ? verification : {} });
  const confirm = button(harness.render('WithdrawalScreen'), 'confirm').onPress;
  confirm(); confirm();
  assert.equal(harness.requests.length, 1);
  harness.invalidateSession(); completeVerification({ verified: true }); await harness.flush();
  assert.deepEqual(harness.requests.map(request => request[0]), ['/auth/verify-password']);
  assert.equal(harness.refreshes, 0);
  assert.equal(harness.accountRefreshes, 0);
  assert.equal(harness.navigations.length, 0);
});

test('withdrawal completion from an old session never refreshes, alerts or navigates the new account', async () => {
  let completeRequest;
  const request = new Promise(resolve => { completeRequest = resolve; });
  const harness = screenHarness('WithdrawalScreen.tsx', { state: ['50', false, 'A'.repeat(30), 'customer@example.test', 'fixture-password', false, ''], api: route => route === '/money-requests' ? request : {} });
  button(harness.render('WithdrawalScreen'), 'confirm').onPress(); await harness.flush();
  assert.equal(harness.requests.length, 2);
  harness.invalidateSession(); completeRequest({ id: 'request-fixture' }); await harness.flush();
  assert.equal(harness.refreshes, 0);
  assert.equal(harness.accountRefreshes, 0);
  assert.equal(harness.alerts.length, 0);
  assert.equal(harness.navigations.length, 0);
});

test('profile completion from an old session cannot refresh or report success for the new account', async () => {
  let completeRequest;
  const request = new Promise(resolve => { completeRequest = resolve; });
  const harness = screenHarness('ProfileScreen.tsx', { api: () => request });
  const save = button(harness.render('ProfileScreen'), 'saveInformation').onPress;
  save(); save();
  assert.equal(harness.requests.length, 1);
  harness.invalidateSession(); completeRequest({ ok: true }); await harness.flush();
  assert.equal(harness.accountRefreshes, 0);
  assert.equal(elements(harness.render('ProfileScreen')).some(element => element.type === 'Notice' && element.props.message === 'updateSuccess'), false);
});

test('voucher gift completion and cancellation completion ignore a switched session', async () => {
  let completeGift;
  const pendingGift = new Promise(resolve => { completeGift = resolve; });
  const voucher = { id: 'grant-fixture', scope: 'flashsale', voucher: { Money: 20, type: 1 } };
  const gift = screenHarness('VoucherScreens.tsx', { state: [voucher, 'receiver@example.test', false, '', '', ''], data: { items: [], grants: [voucher] }, api: () => pendingGift });
  const submitGift = button(gift.render('VouchersScreen'), 'gift').onPress;
  submitGift(); submitGift(); assert.equal(gift.requests.length, 1);
  gift.invalidateSession(); completeGift({ id: 'transfer-fixture' }); await gift.flush();
  assert.equal(gift.refreshes, 0);

  let completeCancellation;
  const pendingCancellation = new Promise(resolve => { completeCancellation = resolve; });
  const cancellation = screenHarness('OrderScreens.tsx', { data: { id: 'order-fixture', status: 'pending', subtotal: 100, paid_amount: 100, voucher_value: 0, refunded_amount: 0, receiver: {}, items: [], events: [] }, api: () => pendingCancellation });
  button(cancellation.render('OrderDetailScreen', { params: { id: 'order-fixture' } }), 'cancelOrder').onPress();
  const confirm = cancellation.alerts.at(-1)[2].find(action => action.text === 'confirm').onPress;
  confirm(); confirm(); assert.equal(cancellation.requests.length, 1);
  cancellation.invalidateSession(); completeCancellation({ status: 'cancel_requested' }); await cancellation.flush();
  assert.equal(cancellation.refreshes, 0);
});

test('an old account deletion acknowledgement cannot log out the new account', async () => {
  let completeRequest;
  const request = new Promise(resolve => { completeRequest = resolve; });
  const harness = screenHarness('AccountScreen.tsx', { api: () => request });
  const deletion = elements(harness.render('AccountScreen')).find(element => element.type === 'MenuRow' && element.props.title === 'requestAccountDeletion');
  deletion.props.onPress();
  harness.alerts.at(-1)[2].find(action => action.text === 'confirm').onPress();
  harness.invalidateSession(); completeRequest({ message: 'Acknowledged' }); await harness.flush();
  assert.equal(harness.logoutCount, 0);
  assert.equal(harness.alerts.length, 1);
});

test('a confirmation dialog opened by the old account cannot act on the new session', async () => {
  const deletion = screenHarness('AccountScreen.tsx');
  elements(deletion.render('AccountScreen')).find(element => element.type === 'MenuRow' && element.props.title === 'requestAccountDeletion').props.onPress();
  deletion.invalidateSession();
  deletion.alerts.at(-1)[2].find(action => action.text === 'confirm').onPress();
  await deletion.flush();
  assert.equal(deletion.requests.length, 0);
  assert.equal(deletion.logoutCount, 0);

  const cancellation = screenHarness('OrderScreens.tsx', { data: { id: 'order-fixture', status: 'pending', subtotal: 100, paid_amount: 100, voucher_value: 0, refunded_amount: 0, receiver: {}, items: [], events: [] } });
  button(cancellation.render('OrderDetailScreen', { params: { id: 'order-fixture' } }), 'cancelOrder').onPress();
  cancellation.invalidateSession();
  cancellation.alerts.at(-1)[2].find(action => action.text === 'confirm').onPress();
  await cancellation.flush();
  assert.equal(cancellation.requests.length, 0);
});
