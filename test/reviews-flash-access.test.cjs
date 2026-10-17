const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function load(relative, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8');
  const loaded = { exports: {} };
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: name => {
    if (name.endsWith('.jpg')) return name;
    assert.ok(name in imports, name); return imports[name];
  }, ...globals });
  return loaded.exports;
}
const jsx = (type, props) => ({ type, props: props ?? {} });
const ui = new Proxy({}, { get: (_, key) => String(key) });
const schedule = serverNow => ({ startsAt: '2026-10-17T06:30:00Z', endsAt: '2026-10-17T13:30:00Z', serverNow, receivedAt: 1000 });

test('Flash Sale entry uses server clock, includes 13:30 and excludes 20:30 Vietnam time', () => {
  const access = load('services/flash-sale-access.ts', {}, { Date: class extends Date { static now() { return 1000; } } });
  const before = schedule('2026-10-17T06:29:59Z');
  assert.equal(access.flashSaleIsOpen(before, 1000), false);
  assert.equal(access.flashSaleIsOpen(before, 2000), true);
  assert.equal(access.flashSaleIsOpen(before, 7 * 3600000 + 1999), true);
  assert.equal(access.flashSaleIsOpen(before, 7 * 3600000 + 2000), false);
  assert.equal(access.flashSaleIsOpen(undefined), false);
  assert.equal(access.flashSaleIsOpen({ ...before, serverNow: 'invalid' }), false);
  const actions = [];
  assert.equal(access.enterFlashSale(before, () => actions.push('open'), () => actions.push('notice')), false);
  assert.deepEqual(actions, ['notice']);
  assert.equal(access.enterFlashSale(schedule('2026-10-17T06:30:00Z'), () => actions.push('open'), () => actions.push('notice')), true);
  assert.deepEqual(actions, ['notice', 'open']);
});

test('direct Flash Sale navigation fetches fresh schedule, blocks closed content and keeps load failures retryable', () => {
  const access = load('services/flash-sale-access.ts');
  for (const status of ['before', 'active', 'ended', 'loading', 'error']) {
    const effects = [], actions = [];
    const current = schedule(status === 'active' ? '2026-10-17T06:30:00Z' : status === 'ended' ? '2026-10-17T13:30:00Z' : '2026-10-17T06:29:59Z');
    const { FlashSaleAccess } = load('screens/catalog/FlashSaleAccess.tsx', {
      react: { useEffect: callback => effects.push(callback), useMemo: callback => callback(), useRef: value => ({ current: value }), useState: value => [value, () => {}] },
      'react/jsx-runtime': { jsx, jsxs: jsx },
      'react-native': { Alert: { alert: (...args) => actions.push(['alert', ...args]) }, AppState: { addEventListener: () => ({ remove() {} }) } },
      '@react-navigation/native': { useIsFocused: () => true },
      '../../hooks/useResource': { useResource: requested => { assert.equal(requested, '/public/content/Flashsale'); return { data: status === 'loading' ? null : { items: [{ id: 'schedule', data: current }] }, loading: status === 'loading', error: status === 'error' ? 'Offline' : '', refresh() {} }; } },
      '../../services/flash-sale-access': access, '../../ui/components': ui,
    }, { Date: class extends Date { static now() { return 1000; } }, setInterval: () => 1, clearInterval() {} });
    const tree = FlashSaleAccess({ t: key => key, children: 'actual catalog', navigation: { canGoBack: () => true, goBack: () => actions.push(['back']) } });
    const cleanups = effects.map(effect => effect()).filter(cleanup => typeof cleanup === 'function');
    if (status === 'active') { assert.equal(tree, 'actual catalog'); assert.equal(actions.length, 0); }
    if (status === 'before' || status === 'ended') { assert.equal(tree, null); assert.deepEqual(actions, [['alert', 'flashSale', 'saleNotStarted'], ['back']]); }
    if (status === 'loading' || status === 'error') { assert.equal(tree.type, 'Screen'); assert.equal(actions.length, 0); }
    cleanups.forEach(cleanup => cleanup());
  }
});

test('customer sample comments preserve admin content, real supplied photo assets and explicit sample labels', () => {
  let state = { data: { items: [{ id: 'sample', display_name: 'Admin sample', avatar_style: 'photo-08', rating: 4, content: 'Original sample text', is_demo: true }, { id: 'unknown', is_demo: false, content: 'Do not present as a sample' }] }, error: '', refresh() {} };
  const alerts = [];
  const { ProductReviewExamples, reviewAvatars } = load('screens/catalog/ProductReviewExamples.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'expo-image': { Image: 'Photo' },
    'react-native': { StyleSheet: { create: value => value }, View: 'View', Alert: { alert: (...args) => alerts.push(args) } }, 'lucide-react-native': { Star: 'Star', Info: 'Info' },
    '../../hooks/useResource': { useResource: requested => { assert.equal(requested, '/public/products/item%2Fone/review-examples'); return state; } },
    '../../ui/components': ui, '../../ui/theme': { colors: {} },
  });
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
  const rendered = nodes(ProductReviewExamples({ productId: 'item/one', t: key => key }));
  assert.ok(rendered.some(node => node.props.children === 'Original sample text'));
  assert.equal(rendered.some(node => node.type === 'AppText' && node.props.children === 'sampleIllustration'), false);
  const disclosure = rendered.find(node => node.type === 'IconButton' && node.props.label === 'sampleIllustration');
  assert.ok(disclosure);
  assert.equal(rendered.filter(node => node.type === 'Info').length, 1);
  disclosure.props.onPress();
  assert.deepEqual(alerts, [['sampleIllustration', 'commentDisclosure']]);
  assert.equal(rendered.some(node => node.props.children === 'Do not present as a sample'), false);
  assert.equal(rendered.filter(node => node.type === 'Star').length, 5);
  assert.equal(rendered.find(node => node.type === 'Photo').props.source, reviewAvatars['photo-08']);
  for (const [index, source] of Object.values(reviewAvatars).entries()) {
    const filename = `sample-0${index + 1}.jpg`;
    const customerPhoto = fs.readFileSync(path.join(__dirname, '../assets/review-avatars', filename));
    const adminPhoto = fs.readFileSync(path.join(__dirname, '../../admin/public/review-avatars', filename));
    assert.equal(crypto.createHash('sha256').update(customerPhoto).digest('hex'), crypto.createHash('sha256').update(adminPhoto).digest('hex'));
    assert.ok(source.endsWith(filename));
  }
  state = { ...state, data: { items: [] } };
  assert.equal(ProductReviewExamples({ productId: 'item/one', t: key => key }), null);
  state = { ...state, error: 'Offline' };
  assert.ok(nodes(ProductReviewExamples({ productId: 'item/one', t: key => key })).some(node => node.type === 'Button' && node.props.title === 'tryAgain'));
});
