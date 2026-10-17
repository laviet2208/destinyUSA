const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function uiModule(filename, imports) {
  const source = fs.readFileSync(path.join(__dirname, '../src/ui', filename), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require: name => { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name]; } });
  return module.exports;
}

test('image presentation ignores stale URLs/attempts and retry preserves the exact server image URL', () => {
  const { imagePresentation } = uiModule('media.ts', { 'expo-image': { Image: {} } });
  const original = { uri: 'https://media.example.test/api/media/original', phase: 'loading', attempt: 0 };
  const changed = imagePresentation(original, { type: 'source', uri: 'https://media.example.test/api/media/next' });
  assert.equal(imagePresentation(changed, { type: 'error', uri: original.uri, attempt: 0 }), changed);
  const failed = imagePresentation(changed, { type: 'error', uri: changed.uri, attempt: 0 });
  assert.equal(failed.phase, 'error');
  const retry = imagePresentation(failed, { type: 'retry', uri: failed.uri, attempt: 0 });
  assert.equal(retry.uri, changed.uri);
  assert.equal(retry.attempt, 1);
  assert.equal(retry.phase, 'loading');
  assert.equal(imagePresentation(retry, { type: 'error', uri: retry.uri, attempt: 0 }), retry);
  assert.equal(imagePresentation(retry, { type: 'retry', uri: retry.uri, attempt: 0 }), retry);
  assert.equal(imagePresentation(retry, { type: 'loaded', uri: retry.uri, attempt: 1 }).phase, 'loaded');
  assert.equal(original.phase, 'loading');
});

test('gallery prefetch is limited to two real image URLs, deduplicates in-flight work and never changes URLs', async () => {
  const calls = [];
  const pending = [];
  const { prefetchGalleryImages } = uiModule('media.ts', { 'expo-image': { Image: { prefetch: (uri, policy) => { calls.push([uri, policy]); return new Promise(resolve => pending.push(resolve)); } } } });
  const first = prefetchGalleryImages(['https://media.example.test/a', 'https://media.example.test/b', 'https://media.example.test/c']);
  const second = prefetchGalleryImages(['https://media.example.test/a', 'https://media.example.test/b']);
  await Promise.resolve();
  assert.deepEqual(calls, [['https://media.example.test/a', 'memory-disk'], ['https://media.example.test/b', 'memory-disk']]);
  pending.forEach(resolve => resolve(true));
  assert.deepEqual(Array.from(await first), [true, true]);
  await second;
  await prefetchGalleryImages(['https://media.example.test/a', 'data:image/png;base64,fixture', 'file:///local-image']);
  assert.equal(calls.length, 2);
});

test('prefetch failures do not block the gallery and can be retried; warm lookup stays bounded', async () => {
  const calls = [];
  let fail = true;
  const { prefetchGalleryImages } = uiModule('media.ts', { 'expo-image': { Image: { prefetch: async uri => { calls.push(uri); if (fail) throw new Error('offline'); return true; } } } });
  assert.deepEqual(Array.from(await prefetchGalleryImages(['https://media.example.test/retry'])), [false]);
  fail = false;
  await prefetchGalleryImages(['https://media.example.test/retry']);
  assert.equal(calls.length, 2);
  for (let index = 0; index < 66; index += 1) await prefetchGalleryImages([`https://media.example.test/${index}`]);
  await prefetchGalleryImages(['https://media.example.test/retry']);
  assert.equal(calls.filter(uri => uri.endsWith('/retry')).length, 3);
});

function motionHarness(enabled, platform = 'android') {
  const animations = [];
  const cleanups = [];
  const updates = [];
  let permission;
  let listener;
  let removed = false;
  class Value {
    constructor(value) { this.value = value; }
    stopAnimation() {}
    setValue(value) { this.value = value; }
    interpolate(options) { return options; }
  }
  const animation = (value, config) => { animations.push(config); return { start() { value?.setValue(config?.toValue); }, stop() {} }; };
  const modules = {
    react: { createContext: () => ({ Provider: 'Provider' }), useContext: () => enabled, useRef: current => ({ current }), useState: initial => [initial, value => updates.push(value)], useEffect: operation => { const cleanup = operation(); if (cleanup) cleanups.push(cleanup); } },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    'react-native': {
      Platform: { OS: platform }, Pressable: 'Pressable',
      AccessibilityInfo: { isReduceMotionEnabled: () => new Promise(resolve => { permission = resolve; }), addEventListener: (_event, callback) => { listener = callback; return { remove: () => { removed = true; } }; } },
      Animated: { Value, createAnimatedComponent: value => value, spring: animation, timing: animation, sequence: () => ({}), loop: () => ({ start() {}, stop() {} }) },
      Easing: { cubic: 'cubic', ease: 'ease', out: value => value, inOut: value => value },
    },
  };
  const client = uiModule('motion.tsx', modules);
  return { client, animations, updates, emit: value => listener(value), resolve: value => permission(value), cleanup: () => cleanups.forEach(operation => operation()), get removed() { return removed; } };
}

test('press animation uses the native driver on Android, remains non-blocking and respects reduced motion/disabled controls', () => {
  const active = motionHarness(true);
  const feedback = active.client.usePressFeedback();
  feedback.onPressIn(); feedback.onPressOut();
  assert.deepEqual(active.animations.map(config => config.toValue), [0.985, 1]);
  assert.ok(active.animations.every(config => config.useNativeDriver && config.isInteraction === false));
  for (const [enabled, disabled] of [[false, false], [true, true]]) {
    const harness = motionHarness(enabled);
    const control = harness.client.usePressFeedback(disabled);
    control.onPressIn(); control.onPressOut();
    assert.equal(harness.animations.length, 0);
  }
  const web = motionHarness(true, 'web');
  web.client.usePressFeedback().onPressIn();
  assert.equal(web.animations[0].useNativeDriver, false);
});

test('screen/card entrance is bounded, non-blocking and disabled for non-entering recycled items', () => {
  const harness = motionHarness(true);
  harness.client.useEntrance(900, 8);
  assert.equal(harness.animations[0].delay, 180);
  assert.equal(harness.animations[0].duration, 260);
  assert.equal(harness.animations[0].isInteraction, false);
  const inactive = motionHarness(true);
  inactive.client.useEntrance(0, 8, false);
  assert.equal(inactive.animations.length, 0);
});

test('a newer reduce-motion event wins over the initial asynchronous preference read', async () => {
  const harness = motionHarness(false);
  harness.client.MotionProvider({ children: null });
  harness.emit(true);
  harness.resolve(false);
  await Promise.resolve();
  assert.deepEqual(harness.updates, [false]);
  harness.cleanup();
  assert.equal(harness.removed, true);
});
