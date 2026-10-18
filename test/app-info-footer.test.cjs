const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

function harness(openURL = async () => {}) {
  const state = [];
  const refs = [];
  const cleanups = [];
  const urls = [];
  const routes = [];
  let stateIndex = 0;
  let refIndex = 0;
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: {
      useState(initial) { const index = stateIndex++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
      useRef(initial) { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); },
      useEffect(effect) { cleanups.push(effect()); },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Pressable: 'Pressable', StyleSheet: { create: styles => styles }, Linking: { openURL: async url => { urls.push(url); await openURL(url); } } },
    '@react-navigation/native': { useNavigation: () => ({ navigate: route => routes.push(route) }) },
    'lucide-react-native': new Proxy({}, { get: (_, name) => name }),
    '../state/MobileContext': { useMobile: () => ({ t: key => key }) },
    './components': { AppText: 'AppText' },
    './BrandLogo': { BrandLogo: 'BrandLogo' },
    './theme': { touchTarget: 48 },
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/AppInfoFooter.tsx'), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, jsx: typescript.JsxEmit.ReactJSX, target: typescript.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return {
    render() { stateIndex = 0; refIndex = 0; return module.exports.AppInfoFooter(); },
    unmount() { cleanups.forEach(cleanup => cleanup?.()); },
    state, urls, routes,
    flush: () => new Promise(resolve => setImmediate(resolve)),
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)];
}

test('information footer preserves the supplied contacts, venue hours and address without demo links', async () => {
  const preview = harness();
  const tree = preview.render();
  const text = JSON.stringify(tree);
  for (const value of ['infodestinyusa1990@gmail.com', '+1 213 829 6490', 'DESTINY-USA CUSTOMER CARE', 'GMT+8', '09:30 – 00:00', '10:00 – 20:00', '10:00 – 21:00', '11:00 – 18:00', '1 Destiny USA Drive', 'Syracuse, NY 13204', '315.466.6000']) assert.ok(text.includes(value), value);
  const links = nodes(tree).filter(node => node.type === 'Pressable' && node.props.accessibilityRole === 'link');
  assert.equal(links.length, 2);
  links[0].props.onPress(); await preview.flush();
  links[1].props.onPress(); await preview.flush();
  assert.deepEqual(preview.urls, ['mailto:infodestinyusa1990@gmail.com', 'viber://chat?number=%2B12138296490']);
  nodes(tree).find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'button').props.onPress();
  assert.deepEqual(preview.routes, ['about_screen']);
  assert.equal(tree.props.style.backgroundColor, '#2B143F');
  for (const link of links) assert.ok(link.props.style({ pressed: false })[0].minHeight >= 48);
});

test('contact opening suppresses repeated presses and reports unavailable email apps without hiding the address', async () => {
  let fail;
  const pending = new Promise((_, reject) => { fail = reject; });
  const preview = harness(() => pending);
  const email = nodes(preview.render()).find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'link');
  email.props.onPress(); email.props.onPress();
  assert.equal(preview.urls.length, 1);
  fail(new Error('unavailable')); await preview.flush();
  const tree = preview.render();
  assert.equal(preview.state[0], 'contactLinkUnavailable');
  assert.ok(JSON.stringify(tree).includes('infodestinyusa1990@gmail.com'));
});

test('contact failure after leaving the screen cannot update an unmounted footer', async () => {
  let fail;
  const pending = new Promise((_, reject) => { fail = reject; });
  const preview = harness(() => pending);
  nodes(preview.render()).find(node => node.type === 'Pressable' && node.props.accessibilityRole === 'link').props.onPress();
  preview.unmount(); fail(new Error('unavailable')); await preview.flush();
  assert.equal(preview.state[0], '');
});

test('all sixteen languages include the footer labels and contact fallback', () => {
  const directory = path.join(__dirname, '../src/ui/locales');
  for (const filename of fs.readdirSync(directory).filter(name => name.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join(directory, filename), 'utf8');
    for (const key of ['footerContact', 'footerOpeningHours', 'footerAsiaHours', 'footerRegularHours', 'footerMonThu', 'footerFriSat', 'footerSunday', 'contactLinkUnavailable']) assert.match(source, new RegExp(`"${key}"\\s*:\\s*"[^"\\n]+"`), filename);
  }
});
