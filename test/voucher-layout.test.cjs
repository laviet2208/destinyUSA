const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const typescript = require('typescript');

function renderVoucher(width, platform) {
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { Platform: { OS: platform }, StyleSheet: { create: styles => styles }, View: 'View', useWindowDimensions: () => ({ width }) },
    'react-native-svg': new Proxy({ __esModule: true, default: 'Svg' }, { get: (target, key) => target[key] ?? key }),
    './components': { AppText: 'AppText' },
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/VoucherFace.tsx'), 'utf8');
  const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS, jsx: typescript.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports, require: name => dependencies[name] });
  return module.exports.VoucherFace({ value: '12,345', unit: 'USDT', kind: 'Personal voucher', scope: 'Flash Sale', title: 'Purchase reward', details: { type: 'Details' } });
}

test('voucher stays 2:1 and reserves a full touch target on narrow Android and iOS screens', () => {
  for (const platform of ['android', 'ios', 'web']) {
    for (const width of [320, 360, 390, 430]) {
      const card = renderVoucher(width, platform);
      assert.equal(card.props.style.aspectRatio, 2);
      const [artwork, visual, details] = card.props.children;
      const graphic = artwork.props.children.type();
      assert.equal(graphic.props.viewBox, '0 0 360 180');
      assert.equal(graphic.props.preserveAspectRatio, 'xMidYMid meet');
      assert.equal(visual.props.style.height, details.props.style.top);
      const footerHeight = (width - 36) / 2 * (1 - parseFloat(details.props.style.top) / 100);
      assert.ok(footerHeight >= (platform === 'android' ? 48 : 44));
      assert.equal(details.props.children.type, 'Details');
    }
  }
});
