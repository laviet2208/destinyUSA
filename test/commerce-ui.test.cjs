const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const jsx = (type, props) => ({ type, props: props ?? {} });
const ui = new Proxy({}, { get: (_, key) => String(key) });
const native = new Proxy({ StyleSheet: { create: value => value }, AppState: { currentState: 'active' }, Keyboard: { dismiss() {} } }, { get: (target, key) => target[key] ?? String(key) });

function compile(filename, imports) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src', filename), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => { assert.ok(name in imports, name); return imports[name]; } });
  return module.exports;
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

test('commerce footer reserves safe-area space and returns to existing root tabs without building duplicate stacks', () => {
  const routes = [];
  let bottom = 0;
  const carts = { regular: [{ quantity: 1 }, { quantity: 2 }], flashsale: [] };
  const before = JSON.stringify(carts);
  const { CommerceFooter } = compile('ui/CommerceFooter.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, 'lucide-react-native': ui,
    '@react-navigation/native': { useNavigation: () => ({ navigate: (...args) => routes.push(args) }) },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom }) },
    '../state/MobileContext': { useMobile: () => ({ t: key => key, carts }) }, './components': ui, './theme': { colors: {}, touchTarget: 48 },
  });
  for (bottom of [0, 16, 34, 48]) {
    const tree = CommerceFooter({});
    const insetStyle = tree.props.style.at(-1);
    assert.equal(insetStyle.minHeight, 65 + bottom);
    assert.equal(insetStyle.paddingBottom, 7 + bottom);
  }
  for (const tab of nodes(CommerceFooter({})).filter(node => node.type === 'Pressable')) tab.props.onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(routes)), ['main_page', 'categories_page', 'cart_page', 'account_page'].map(screen => ['main_screen', { screen }, { pop: true }]));
  assert.equal(JSON.stringify(carts), before);
});

function chatHarness() {
  const messages = [
    { id: 'one', seq: 1, sender_role: 'admin', kind: 'text', content: 'Fixture message', created_at: '2026-10-12T09:00:00Z' },
    { id: 'two', seq: 2, sender_role: 'customer', kind: 'image', content: '/media/fixture.jpg', created_at: '2026-10-12T09:01:00Z' },
    { id: 'three', seq: 3, sender_role: 'admin', kind: 'text', content: 'Next date', created_at: '2026-10-13T09:00:00Z' },
  ];
  const state = [messages, [], '', '', null, false, 2, 44];
  const references = [];
  const navigations = [];
  const requests = [];
  let stateIndex = 0;
  let refIndex = 0;
  const context = { account: { id: 'fixture' }, t: key => key, language: 'en' };
  const module = compile('screens/ChatScreen.tsx', {
    react: { useState(value) { const position = stateIndex++; if (!(position in state)) state[position] = value; return [state[position], next => { state[position] = typeof next === 'function' ? next(state[position]) : next; }]; }, useRef(value) { const position = refIndex++; return references[position] ?? (references[position] = { current: value }); }, useEffect() {}, useCallback: callback => callback },
    'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': native, 'lucide-react-native': ui,
    '@react-navigation/native': { useIsFocused: () => true }, 'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 34 }) },
    'expo-crypto': { randomUUID: () => 'fixture-client-id' }, 'expo-image-picker': {}, 'socket.io-client': {},
    '../state/MobileContext': { useMobile: () => context },
    '../services/api': { api: async (...args) => { requests.push(args); return {}; }, apiBase: 'https://example.test', getApiToken: () => 'fixture-session', mediaUrl: value => value },
    '../services/image-upload': {}, '../ui/components': ui, '../ui/theme': { colors: {} },
  });
  return { messages, state, navigations, requests, render(name = 'ChatScreen', route) { stateIndex = 0; refIndex = 0; return module[name]({ route, navigation: { navigate: (...args) => navigations.push(args), goBack: () => navigations.push(['back']) } }); } };
}

test('chat date grouping uses real adjacent timestamps without changing message order or read-viewability settings', () => {
  const app = chatHarness();
  const list = nodes(app.render()).find(node => node.type === 'FlatList');
  assert.equal(list.props.data, app.messages);
  assert.equal(list.props.viewabilityConfig.itemVisiblePercentThreshold, 50);
  const headings = app.messages.map((item, index) => nodes(list.props.renderItem({ item, index })).filter(node => node.type === 'AppText' && node.props.style?.textAlign === 'center').length);
  assert.deepEqual(headings, [1, 0, 1]);
  assert.deepEqual(app.requests, []);
});

test('chat photo opens a separate native route so existing focus guards protect unread receipts', () => {
  const app = chatHarness();
  const list = nodes(app.render()).find(node => node.type === 'FlatList');
  const image = nodes(list.props.renderItem({ item: app.messages[1], index: 1 })).find(node => node.type === 'Pressable');
  image.props.onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(app.navigations)), [['chat_image_preview', { uri: '/media/fixture.jpg' }]]);
  assert.deepEqual(app.requests, []);
  const preview = nodes(app.render('ChatImageScreen', { params: { uri: '/media/fixture.jpg' } })).find(node => node.type === 'ProductImage');
  assert.equal(preview.props.uri, '/media/fixture.jpg');
});

test('composer grows only within UI limits and typing does not send a chat request', () => {
  const app = chatHarness();
  let input = nodes(app.render()).find(node => node.type === 'TextInput');
  assert.equal(input.props.numberOfLines, 1);
  assert.equal(input.props.maxLength, 10000);
  input.props.onChangeText('Unsent local draft');
  input.props.onContentSizeChange({ nativeEvent: { contentSize: { height: 500 } } });
  input = nodes(app.render()).find(node => node.type === 'TextInput');
  assert.equal(input.props.style.at(-1).height, 132);
  input.props.onContentSizeChange({ nativeEvent: { contentSize: { height: 12 } } });
  assert.equal(nodes(app.render()).find(node => node.type === 'TextInput').props.style.at(-1).height, 44);
  assert.deepEqual(app.requests, []);
});
