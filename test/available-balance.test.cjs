const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function harness() {
  const states = [];
  const effects = [];
  const pendingEffects = [];
  const requests = [];
  let stateIndex = 0;
  let effectIndex = 0;
  let focused = true;
  let writes = 0;
  const mobile = { account: { id: 'first', balance: 12345 }, t: key => key, refreshAccount: () => new Promise((resolve, reject) => requests.push({ resolve, reject })) };
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const dependencies = {
    react: {
      useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = initial; return [states[index], next => { writes += 1; states[index] = typeof next === 'function' ? next(states[index]) : next; }]; },
      useEffect(effect, deps) {
        const index = effectIndex++;
        if (!effects[index] || deps.some((value, position) => value !== effects[index].deps[position])) {
          pendingEffects.push(() => { effects[index]?.cleanup?.(); effects[index] = { deps, cleanup: effect() }; });
        }
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ActivityIndicator: 'ActivityIndicator', View: 'View', StyleSheet: { create: value => value } },
    '@react-navigation/native': { useIsFocused: () => focused },
    'lucide-react-native': { RotateCw: 'RotateCw', Wallet: 'Wallet' },
    '../state/MobileContext': { useMobile: () => mobile },
    '../services/commerce': { money: String },
    './components': { AppText: 'AppText', IconButton: 'IconButton' },
    './theme': { colors: {} },
  };
  const loaded = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/AvailableBalance.tsx'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, { module: loaded, exports: loaded.exports, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return {
    mobile, requests, states,
    render(compact = false) { stateIndex = 0; effectIndex = 0; return loaded.exports.AvailableBalance({ compact }); },
    commit() { pendingEffects.splice(0).forEach(effect => effect()); },
    focus(value) { focused = value; },
    unmount() { effects.forEach(effect => effect.cleanup?.()); },
    get writes() { return writes; },
    flush: () => new Promise(resolve => setImmediate(resolve)),
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}
const button = tree => nodes(tree).find(node => node.type === 'IconButton').props;
const text = tree => nodes(tree).filter(node => node.type === 'AppText').flatMap(node => node.props.children).join(' ');

test('balance displays the actual account amount, refreshes on focus and never computes a deduction', async () => {
  const app = harness();
  const account = JSON.stringify(app.mobile.account);
  let tree = app.render(true); app.commit();
  assert.match(text(tree), /balance 12345  USDT/);
  assert.equal(button(tree).disabled, true);
  assert.equal(app.requests.length, 1);
  assert.equal(JSON.stringify(app.mobile.account), account);
  app.mobile.account.balance = 15000;
  app.requests[0].resolve(); await app.flush();
  tree = app.render(true); app.commit();
  assert.match(text(tree), /15000/);
  assert.equal(button(tree).disabled, false);
  assert.equal(button(tree).label, 'refreshBalance');
  assert.equal(app.requests.length, 1);
  app.focus(false); app.render(); app.commit();
  app.focus(true); app.render(); app.commit();
  assert.equal(app.requests.length, 2);
  app.unmount();
});

test('failed refresh is explicit, preserves the last amount and allows a read-only retry', async () => {
  const app = harness(); app.render(); app.commit();
  app.requests[0].reject(new Error('offline')); await app.flush();
  const tree = app.render(); app.commit();
  assert.match(text(tree), /12345/);
  assert.match(text(tree), /loadError/);
  button(tree).onPress(); app.render(); app.commit();
  assert.equal(app.requests.length, 2);
  assert.equal(app.mobile.account.balance, 12345);
  app.requests[1].resolve(); await app.flush();
  assert.ok(!text(app.render()).includes('loadError'));
  app.unmount();
});

test('guest or unfocused balance does not fetch and a missing amount is not falsely displayed as zero', () => {
  const guest = harness(); guest.mobile.account = null;
  assert.equal(guest.render(), null); guest.commit();
  assert.equal(guest.requests.length, 0);
  const inactive = harness(); inactive.focus(false); inactive.render(); inactive.commit();
  assert.equal(inactive.requests.length, 0);
  inactive.mobile.account.balance = undefined;
  assert.match(text(inactive.render()), /—/);
  assert.ok(!text(inactive.render()).includes('0'));
});

test('late refreshes do not change status for a different account or after unmount', async () => {
  const app = harness(); app.render(); app.commit();
  app.mobile.account = { id: 'second', balance: 50 };
  app.render(); app.commit();
  app.requests[0].resolve(); await app.flush();
  assert.equal(app.states[0], 'loading');
  assert.match(text(app.render()), /50/);
  app.unmount(); const before = app.writes;
  app.requests[1].reject(new Error('late')); await app.flush();
  assert.equal(app.writes, before);
});
