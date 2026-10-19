const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function cardHarness() {
  const jsx = (type, props) => ({ type, props });
  let sequence = 0;
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/AccountIdentityCard.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react') return { useId: () => `:card${++sequence}:` };
    if (name === 'react-native') return { View: 'View', StyleSheet: { create: value => value, absoluteFill: { position: 'absolute', inset: 0 } } };
    if (name === 'expo-image') return { Image: 'Image' };
    if (name === 'lucide-react-native') return { Pencil: 'Pencil' };
    if (name === 'react-native-svg') return new Proxy({ default: 'Svg', __esModule: true }, { get: (target, key) => target[key] ?? String(key) });
    if (name === './components') return { AppText: 'AppText', IconButton: 'IconButton' };
    assert.equal(name, '../../assets/auth/brand-mark.webp');
    assert.ok(fs.existsSync(path.join(__dirname, '../src/ui', name)));
    return name;
  } });
  return props => module.exports.AccountIdentityCard(props);
}

function elements(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  if (typeof node.type === 'function') return elements(node.type(node.props));
  return [node, ...elements(node.props?.children)];
}

function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (Array.isArray(node)) return node.map(text).join('');
  if (typeof node !== 'object') return String(node);
  if (typeof node.type === 'function') return text(node.type(node.props));
  return text(node.props.children);
}

const account = { first_name: 'Nguyễn', last_name: 'Khách Hàng', email: 'customer@example.test', referral_code: 'MY-OWN-CODE', balance: 123456 };
const props = { account, referralLabel: 'Mã giới thiệu', editLabel: 'Sửa hồ sơ', onEdit() {} };

test('member card displays current account fields rather than reference customer or balance', () => {
  const tree = cardHarness()(props);
  assert.match(text(tree), /Nguyễn Khách Hàng/);
  assert.match(text(tree), /customer@example.test/);
  assert.match(text(tree), /Mã giới thiệu: MY-OWN-CODE/);
  assert.doesNotMatch(text(tree), /kakitaryo|RM3TEBF6|123456|USDT/);
  const copyable = elements(tree).filter(node => node.type === 'AppText' && node.props.selectable);
  assert.equal(copyable.length, 2);
  for (const node of copyable) assert.equal(node.props.numberOfLines, undefined);
});

test('the edit affordance retains its accessible label and existing callback', () => {
  let edits = 0;
  const tree = cardHarness()({ ...props, onEdit: () => { edits += 1; } });
  const button = elements(tree).find(node => node.type === 'IconButton');
  assert.equal(button.props.label, 'Sửa hồ sơ');
  button.props.onPress();
  assert.equal(edits, 1);
});

test('card grows for longer fields and avatar supports Unicode and email fallback', () => {
  const render = cardHarness();
  const tree = render({ ...props, account: { ...account, first_name: '𠮷', last_name: '' } });
  assert.equal(elements(tree).some(node => node.type === 'AppText' && node.props.children === '𠮷'), true);
  assert.equal(tree.props.style.height, undefined);
  assert.ok(elements(tree).some(node => node.props.style?.flex === 1 && node.props.style?.minWidth === 0));
  const fallback = render({ ...props, account: { ...account, first_name: '', last_name: '' } });
  assert.ok(elements(fallback).some(node => node.type === 'AppText' && node.props.children === 'customer'));
  assert.ok(elements(fallback).some(node => node.type === 'AppText' && node.props.children === 'C'));
});

test('vector artwork IDs stay isolated when more than one member card is rendered', () => {
  const render = cardHarness();
  const first = elements(render(props)).filter(node => node.props.id).map(node => node.props.id);
  const second = elements(render(props)).filter(node => node.props.id).map(node => node.props.id);
  assert.equal(first.length, 5);
  assert.equal(new Set([...first, ...second]).size, 10);
});
