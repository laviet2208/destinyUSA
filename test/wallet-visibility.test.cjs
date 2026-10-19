const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

test('wallet visibility understands imported numeric values and a missing legacy configuration defaults to visible', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/wallet-visibility.ts'), 'utf8');
  const loaded = { exports: {} };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: loaded, exports: loaded.exports });
  for (const value of [1, '1', true, undefined]) assert.equal(loaded.exports.walletIsVisible(value), true);
  for (const value of [0, '0', false, null, 'unexpected']) assert.equal(loaded.exports.walletIsVisible(value), false);
});

test('wallet gate redirects an open wallet to Account, but keeps ordinary support available', () => {
  let showWallet = false;
  let showAboutApp = false;
  const replacements = [];
  const modules = {
    react: { useEffect: callback => callback() },
    'react/jsx-runtime': {},
    'react-native': { StyleSheet: { create: value => value } },
    'lucide-react-native': {},
    '../../hooks/useResource': {},
    '../../state/MobileContext': { useMobile: () => ({ catalog: { showWallet, showAboutApp } }) },
    '../../ui/components': {}, '../../ui/theme': { colors: {}, spacing: {} }, '../../ui/strings': {},
  };
  const loaded = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/screens/account/account-ui.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: name => { assert.ok(name in modules, name); return modules[name]; } });
  const props = { navigation: { replace: (...args) => replacements.push(args) }, children: 'wallet content' };
  assert.equal(loaded.exports.WalletAccess(props), null);
  assert.equal(replacements[0][0], 'main_screen');
  assert.equal(replacements[0][1].screen, 'account_page');
  assert.equal(loaded.exports.WalletAccess({ ...props, required: false }), 'wallet content');
  showWallet = true;
  assert.equal(loaded.exports.WalletAccess(props), 'wallet content');
  assert.equal(loaded.exports.AboutAccess(props), null);
  assert.equal(replacements[1][0], 'main_screen');
  assert.equal(replacements[1][1].screen, 'account_page');
  showAboutApp = true;
  assert.equal(loaded.exports.AboutAccess(props), 'wallet content');
});
