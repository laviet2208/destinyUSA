const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const typescript = require('typescript');

function load(filename, imports, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../src/ui', filename), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { target: typescript.ScriptTarget.ES2022, module: typescript.ModuleKind.CommonJS, jsx: typescript.JsxEmit.ReactJSX } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require: name => { if (!(name in imports)) throw new Error(`Unexpected dependency ${name}`); return imports[name]; }, ...globals });
  return module.exports;
}

const jsx = (type, props) => ({ type, props: props ?? {} });
const styles = { create: value => value };
test('customer countdown follows server time despite a wrong device clock and switches at both boundaries', () => {
  const { flashCountdown } = load('FlashSaleHero.tsx', { react: {}, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'react-native': { StyleSheet: styles }, 'lucide-react-native': {}, '@react-navigation/native': {}, './components': {}, './motion': {} });
  const receivedAt = 100000;
  const schedule = { startsAt: '2026-10-17T06:30:00Z', serverNow: '2026-10-17T06:29:59Z', receivedAt };
  assert.equal(flashCountdown(schedule, receivedAt).active, false);
  assert.deepEqual(Array.from(flashCountdown(schedule, receivedAt).parts), ['00', '00', '01']);
  assert.equal(flashCountdown(schedule, receivedAt + 1000).active, true);
  assert.deepEqual(Array.from(flashCountdown(schedule, receivedAt + 1000).parts), ['07', '00', '00']);
  assert.equal(flashCountdown(schedule, receivedAt + 7 * 3600000 + 1000).active, false);
  assert.deepEqual(Array.from(flashCountdown(schedule, receivedAt + 7 * 3600000 + 1000).parts), ['17', '00', '00']);
  assert.equal(flashCountdown(schedule, receivedAt + 86400000 + 1000).active, true);
});

function carousel({ motion = true, focused = true, foreground = true } = {}) {
  const refs = [], effects = [], intervals = [], cleanups = [], offsets = [], pressed = [];
  let now = 100000;
  class Value { setValue() {} interpolate() { return 1; } }
  const imports = {
    react: { useState: value => [value, () => {}], useRef: value => { const ref = { current: value }; refs.push(ref); return ref; }, useEffect: effect => effects.push(effect) },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Animated: { Value, FlatList: 'AnimatedList', View: 'AnimatedView', event: () => () => {} }, AppState: { currentState: foreground ? 'active' : 'background', addEventListener: () => ({ remove() {} }) }, Platform: { OS: 'android' }, Pressable: 'Pressable', View: 'View', StyleSheet: styles },
    '@react-navigation/native': { useIsFocused: () => focused },
    '../services/api': { mediaUrl: value => value }, './components': { ProductImage: 'ProductImage' }, './motion': { useMotionEnabled: () => motion },
  };
  const { AdCarousel } = load('AdCarousel.tsx', imports, { Date: { now: () => now }, setInterval: (callback, delay) => { assert.equal(delay, 5500); intervals.push(callback); return callback; }, clearInterval: callback => cleanups.push(callback) });
  const banners = [{ id: 'first', image: 'one.jpg' }, { id: 'second', image: 'two.jpg' }];
  const tree = AdCarousel({ banners, width: 354, padding: 18, rtl: false, label: 'Ad', onPress: banner => pressed.push(banner) });
  refs[0].current = { scrollToOffset: value => offsets.push(value) };
  const dispose = effects.map(effect => effect());
  return { tree, banners, intervals, offsets, cleanups, pressed, advance: value => { now += value; }, dispose: () => dispose.forEach(cleanup => cleanup?.()) };
}

test('advertisements autoplay smoothly, pause after a swipe, preserve the real target and clean up timers', () => {
  const state = carousel();
  const list = state.tree.props.children[0];
  assert.equal(state.intervals.length, 1);
  state.intervals[0]();
  assert.equal(state.offsets.at(-1).offset, 364); assert.equal(state.offsets.at(-1).animated, true);
  list.props.onScrollBeginDrag();
  const count = state.offsets.length;
  state.intervals[0](); assert.equal(state.offsets.length, count);
  state.advance(11001); state.intervals[0](); assert.equal(state.offsets.at(-1).offset, 728);
  list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 728 } } });
  assert.equal(state.offsets.at(-1).offset, 0); assert.equal(state.offsets.at(-1).animated, false);
  list.props.renderItem({ item: state.banners[0], index: 0 }).props.children.props.onPress();
  assert.equal(state.pressed[0], state.banners[0]);
  state.dispose(); assert.equal(state.cleanups.length, 1);
});

test('advertisements do not autoplay with Reduce Motion, a hidden screen or a background app', () => {
  for (const options of [{ motion: false }, { focused: false }, { foreground: false }]) { const state = carousel(options); assert.equal(state.intervals.length, 0); state.dispose(); }
});
