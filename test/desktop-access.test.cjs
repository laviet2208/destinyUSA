const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

function load() {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/desktop-access.ts'), 'utf8');
  const module = { exports: {} };
  vm.runInNewContext(typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText, { module, exports: module.exports, require: () => ({ normalizeLanguage: value => ['en', 'zh', 'vi', 'fr', 'es', 'pt', 'km', 'th', 'lo', 'my', 'ru', 'id', 'ja', 'ko', 'fil', 'ms'].includes(value) ? value : 'en' }) });
  return module.exports;
}

test('desktop notice applies to computers, including narrow windows, without blocking native or mobile web', () => {
  const { isDesktopWeb } = load();
  for (const userAgent of ['Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'Mozilla/5.0 (X11; Linux x86_64)']) assert.equal(isDesktopWeb('web', { userAgent, maxTouchPoints: 0 }), true);
  for (const userAgent of ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)', 'Mozilla/5.0 (Linux; Android 15; Mobile)', 'Mozilla/5.0 (iPad)']) assert.equal(isDesktopWeb('web', { userAgent, maxTouchPoints: 5 }), false);
  assert.equal(isDesktopWeb('web', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', maxTouchPoints: 5 }), false);
  assert.equal(isDesktopWeb('web'), false);
  for (const platform of ['ios', 'android']) assert.equal(isDesktopWeb(platform, { userAgent: 'desktop' }), false);
  const app = fs.readFileSync(path.join(__dirname, '../App.tsx'), 'utf8');
  assert.match(app, /if \(isDesktopWeb[\s\S]*?return <DesktopNotice\/>/);
});

test('desktop language selection supports all sixteen dictionaries and browser locale variants', () => {
  const { browserLanguage } = load();
  for (const [value, expected] of [['vi-VN', 'vi'], ['ja-JP', 'ja'], ['ko-KR', 'ko'], ['tl-PH', 'fil'], ['fil-PH', 'fil'], ['ms-MY', 'ms'], ['zh-TW', 'zh'], ['ar-SA', 'en']]) assert.equal(browserLanguage(value), expected);
  const directory = path.join(__dirname, '../src/ui/locales');
  for (const filename of fs.readdirSync(directory).filter(name => name.endsWith('.ts'))) {
    const source = fs.readFileSync(path.join(directory, filename), 'utf8');
    for (const key of ['desktopStatus', 'desktopTitle', 'desktopMessage', 'desktopMobileHint']) assert.match(source, new RegExp(`"${key}"\\s*:`), filename);
    assert.ok(!source.includes('premiumShopping'));
  }
});

test('desktop wrapper expands the notice and cannot become the shopping app through a width query', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/phone-preview.html'), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const query of ['', '?width=320', '?width=390']) {
    const frame = { style: { maxWidth: '430px' } };
    vm.runInNewContext(script, { URLSearchParams, location: { search: query }, navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0)', maxTouchPoints: 0 }, document: { querySelector: () => frame } });
    assert.equal(frame.style.maxWidth, 'none');
  }
});

test('desktop notice changes its actual copy, remembers language and ignores a late stored preference', async () => {
  const jsx = (type, props) => ({ type, props });
  const states = [];
  const refs = [];
  const effects = [];
  const writes = [];
  let stateIndex = 0;
  let refIndex = 0;
  let readPreference;
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/DesktopNotice.web.tsx'), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, jsx: typescript.JsxEmit.ReactJSX, target: typescript.ScriptTarget.ES2022 } }).outputText;
  const dependencies = {
    react: { useState(initial) { const index = stateIndex++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = value; }]; }, useRef(initial) { const index = refIndex++; return refs[index] ?? (refs[index] = { current: initial }); }, useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ScrollView: 'ScrollView', View: 'View', StyleSheet: { create: value => value }, useWindowDimensions: () => ({ width: 1280 }) },
    'expo-secure-store': { getItemAsync: key => { assert.equal(key, 'destiny.language'); return new Promise(resolve => { readPreference = resolve; }); }, setItemAsync: async (key, language) => { writes.push([key, language]); } },
    'lucide-react-native': new Proxy({}, { get: (_, key) => key }),
    '../services/desktop-access': { browserLanguage: () => 'vi' },
    './strings': { languages: [{ id: 'vi', name: 'Tiếng Việt' }, { id: 'ja', name: '日本語' }], normalizeLanguage: value => value, translate: (language, key) => `${language}:${key}` },
    './components': { AppText: 'AppText', UiLanguage: { Provider: 'Provider' } },
    './BrandLogo': { BrandLogo: 'BrandLogo' },
    './theme': { colors: {} },
  };
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; }, navigator: { language: 'vi-VN' }, window: { location: { origin: 'https://shop.example.test' } } });
  const render = () => { stateIndex = 0; refIndex = 0; return module.exports.DesktopNotice(); };
  const all = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(all) : [tree, ...all(tree.props.children)];
  const tree = render(); effects[0]();
  assert.ok(JSON.stringify(tree).includes('vi:desktopTitle'));
  assert.ok(!JSON.stringify(tree).includes('MobileProvider'));
  all(tree).find(node => node.type === 'select').props.onChange({ target: { value: 'ja' } });
  readPreference('vi'); await new Promise(resolve => setImmediate(resolve));
  const updated = render();
  assert.ok(JSON.stringify(updated).includes('ja:desktopTitle'));
  assert.deepEqual(writes, [['destiny.language', 'ja']]);
});
