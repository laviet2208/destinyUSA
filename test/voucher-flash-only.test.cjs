const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

function harness() {
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const ui = new Proxy({}, { get: (_, key) => String(key) });
  const item = { product: { id: 'product', images: [], name: 'Product' }, variant: { id: 'variant', name: 'Variant', price: 100, inventory: 5 }, quantity: 1 };
  const resources = [];
  const dependencies = {
    react: { useEffect() {}, useRef: current => ({ current }), useState: value => [typeof value === 'function' ? value() : value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ...ui, View: 'View', Pressable: 'Pressable', ScrollView: 'ScrollView', FlatList: 'FlatList', StyleSheet: { create: value => value } },
    'lucide-react-native': ui,
    '@react-navigation/native': { useIsFocused: () => true, usePreventRemove() {} },
    '../ui/components': ui,
    '../ui/CommerceFooter': ui,
    '../ui/commerce': ui,
    '../ui/theme': { colors: {} },
    '../state/MobileContext': { useMobile: () => ({ account: { id: 'customer', first_name: 'Name', phone: '0123', address: 'Address', balance: 1000 }, carts: { regular: [item], flashsale: [item] }, t: key => key }) },
    '../hooks/useResource': { useResource: requested => { resources.push(requested); return { loading: false, error: '', refresh() {}, data: { grants: [{ id: 'private', scope: 'flashsale', voucher: { Money: 20 } }, { id: 'wrong-private', scope: 'regular', voucher: { Money: 30 } }], items: [{ id: 'common', scope: 'flashsale', active: true, data: { Money: 10 } }] } }; } },
    '../services/api': { mediaUrl: () => '', api() { throw new Error('Rendering must not send an order'); } },
    '../services/commerce': { cartTotal: () => 100, money: String, voucherData: voucher => voucher.voucher ?? voucher.data },
    '../services/pending-order': {},
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/CartScreens.tsx'), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, jsx: typescript.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return { ...module.exports, resources };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.ListFooterComponent)];
}

test('regular cart and checkout have no voucher selector; Flash sale keeps the existing selection flow', () => {
  const app = harness();
  for (const channel of ['regular', 'flashsale']) {
    const props = { navigation: {}, route: { name: 'cart_page', params: { channel, ...(channel === 'regular' ? { selection: { id: 'injected', personal: true, voucher: { voucher: {} } } } : {}) } } };
    for (const screen of ['CartScreen', 'CheckoutScreen']) {
      const tree = app[screen](props);
      assert.equal(nodes(tree).some(node => node.type === 'AppText' && node.props.children === 'selectVoucher'), channel === 'flashsale', `${screen}:${channel}`);
    }
  }
});

test('voucher picker never loads regular vouchers and filters any wrongly scoped grants from a stale response', () => {
  const app = harness();
  assert.equal(app.VoucherPicker({ channel: 'regular' }), null);
  assert.equal(app.resources[0], null);
  const tree = app.VoucherPicker({ channel: 'flashsale', selection: null });
  assert.equal(app.resources[1], '/vouchers?channel=flashsale');
  assert.equal(nodes(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityRole === 'radio').length, 3);
  assert.equal(JSON.stringify(tree).includes('wrong-private'), false);
});
