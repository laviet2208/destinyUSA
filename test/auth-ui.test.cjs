const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function harness(initial = []) {
  const state = [...initial];
  const actions = [];
  let index = 0;
  const jsx = (type, props) => ({ type, props: props ?? {} });
  const ui = new Proxy({}, { get: (_, key) => String(key) });
  const modules = {
    react: { useState(value) { const position = index++; if (!(position in state)) state[position] = value; return [state[position], next => { state[position] = typeof next === 'function' ? next(state[position]) : next; }]; } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': new Proxy({ StyleSheet: { create: value => value }, Alert: { alert: (...args) => actions.push(['alert', ...args]) } }, { get: (target, key) => target[key] ?? String(key) }),
    'lucide-react-native': ui,
    '../ui/components': ui,
    '../ui/theme': { colors: {}, touchTarget: 48 },
    '../ui/BrandLogo': { BrandLogo: 'BrandLogo' },
    '../state/MobileContext': { useMobile: () => ({ t: key => key, login: async body => actions.push(['login', body]), signup: async body => actions.push(['signup', body]), referral: async code => actions.push(['referral', code]), logout: async () => actions.push(['logout']), enterGuest: () => actions.push(['guest']) }) },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/AuthScreens.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  return { actions, render(name) { index = 0; return module.exports[name]({ navigation: { navigate: route => actions.push(['navigate', route]), goBack: () => actions.push(['back']) } }); }, flush: () => new Promise(resolve => setImmediate(resolve)) };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.trailing)];
}

function button(tree, title) {
  const node = nodes(tree).find(item => item.type === 'Button' && item.props.title === title);
  assert.ok(node, title);
  return node.props;
}

test('redesigned login retains independent remember choices, password visibility and the original login payload', async () => {
  const app = harness(['buyer@example.test', 'fixture-secret', true, false, false, false, '']);
  let tree = app.render('LoginScreen');
  assert.equal(nodes(tree).find(item => item.type === 'Field' && item.props.label === 'password').props.secureTextEntry, true);
  for (const [title, checked] of [['rememberSession', false], ['rememberPassword', true]]) {
    const option = nodes(tree).find(item => item.props.title === title);
    const control = option.type(option.props);
    assert.equal(control.props.accessibilityRole, 'checkbox');
    control.props.onPress();
    tree = app.render('LoginScreen');
    assert.equal(nodes(tree).find(item => item.props.title === title).props.checked, checked);
  }
  nodes(tree).find(item => item.type === 'IconButton' && item.props.label === 'showPassword').props.onPress();
  tree = app.render('LoginScreen');
  assert.equal(nodes(tree).find(item => item.type === 'Field' && item.props.label === 'password').props.secureTextEntry, false);
  button(tree, 'login').onPress(); await app.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(app.actions[0])), ['login', { email: 'buyer@example.test', password: 'fixture-secret', remember: false, savePassword: true }]);
});

test('signup does not copy the demo optional-referral field or embed a referral bypass', async () => {
  const app = harness(['First', 'Last', 'buyer@example.test', 'fixture-secret', false, '']);
  const tree = app.render('SignupScreen');
  assert.deepEqual(nodes(tree).filter(item => item.type === 'Field').map(item => item.props.label), ['firstName', 'lastName', 'email', 'password']);
  button(tree, 'signup').onPress(); await app.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(app.actions[0])), ['signup', { firstName: 'First', lastName: 'Last', email: 'buyer@example.test', password: 'fixture-secret' }]);
});

test('referral gate keeps both required decorative controls disabled and submits only the entered code', async () => {
  const app = harness(['CODE-FROM-ANOTHER-ACCOUNT', false, '']);
  const tree = app.render('ReferralScreen');
  const decorations = nodes(tree).filter(item => item.type === 'View' && item.props.accessibilityRole === 'button');
  assert.equal(decorations.length, 2);
  assert.ok(decorations.every(item => item.props.accessibilityState.disabled && !item.props.onPress));
  await button(tree, 'confirm').onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(app.actions[0])), ['referral', 'CODE-FROM-ANOTHER-ACCOUNT']);
  button(app.render('ReferralScreen'), 'Log out').onPress(); await app.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(app.actions[1])), ['logout']);
});

test('welcome guest action remains real and does not sign in a fabricated account', () => {
  const app = harness();
  button(app.render('WelcomeScreen'), 'guest').onPress();
  assert.deepEqual(JSON.parse(JSON.stringify(app.actions)), [['guest']]);
});
