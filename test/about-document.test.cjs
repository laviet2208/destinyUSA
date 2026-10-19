const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = name => fs.readFileSync(path.join(__dirname, '../src', name), 'utf8');
function load(name, dependencies = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(source(name), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, require: name => { assert.ok(name in dependencies, name); return dependencies[name]; } });
  return module.exports;
}

test('About uses a script-disabled native WebView and never navigates to file, JavaScript or intent URLs', async () => {
  const helpers = load('services/about-document.ts');
  const opened = [];
  const jsx = (type, props) => ({ type, props });
  const { AboutDocument } = load('ui/AboutDocument.tsx', {
    react: { useState: value => [value, () => {}], useRef: current => ({ current }) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { ActivityIndicator: 'ActivityIndicator', Alert: { alert() {} }, Linking: { openURL: async url => opened.push(url) }, View: 'View' },
    'react-native-webview': { WebView: 'WebView' },
    '../services/api': { apiBase: 'https://example.test' },
    '../services/about-document': helpers,
    '../state/MobileContext': { useMobile: () => ({ t: key => key }) },
    './components': { EmptyState: 'EmptyState' },
  });
  const html = '<!doctype html><html><style>.hero{display:grid}</style><body>About</body></html>';
  const view = AboutDocument({ html, title: 'About' });
  assert.equal(view.type, 'WebView');
  assert.equal(view.props.source.html, html);
  for (const prop of ['javaScriptEnabled', 'domStorageEnabled', 'sharedCookiesEnabled', 'thirdPartyCookiesEnabled', 'allowFileAccess', 'allowFileAccessFromFileURLs', 'allowUniversalAccessFromFileURLs']) assert.equal(view.props[prop], false, prop);
  const navigate = url => view.props.onShouldStartLoadWithRequest({ url });
  for (const url of ['about:blank', 'about:blank#intro', 'https://example.test/']) assert.equal(navigate(url), true);
  for (const url of ['javascript:bad()', 'file:///etc/passwd', 'intent://test', 'https://user:password@bad.test']) assert.equal(navigate(url), false);
  assert.deepEqual(opened, []);
  assert.equal(navigate('viber://chat?number=%2B12138296490'), false);
  assert.deepEqual(opened, ['viber://chat?number=%2B12138296490']);
  assert.equal(helpers.isAboutDocument(html), true);
  assert.equal(helpers.isAboutDocument('<p>About</p>'), false);
});

test('web About uses an isolated iframe without script or parent-origin permissions', () => {
  const jsx = (type, props) => ({ type, props });
  const { AboutDocument } = load('ui/AboutDocument.web.tsx', { 'react/jsx-runtime': { jsx, jsxs: jsx } });
  const frame = AboutDocument({ html: '<html>Full design</html>', title: 'About' });
  assert.equal(frame.type, 'iframe');
  assert.equal(frame.props.srcDoc, '<html>Full design</html>');
  assert.doesNotMatch(frame.props.sandbox, /allow-scripts|allow-same-origin|allow-forms/);
  assert.equal(frame.props.referrerPolicy, 'no-referrer');
});
