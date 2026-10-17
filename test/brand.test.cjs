const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function renderBrand(props) {
  const jsx = (type, properties) => ({ type, props: properties });
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/ui/BrandLogo.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === 'react-native') return { Image: 'Image', Text: 'Text', View: 'View' };
    assert.ok(name.startsWith('../../assets/'));
    assert.ok(fs.existsSync(path.join(__dirname, '../src/ui', name)));
    return name;
  } });
  return module.exports.BrandLogo(props);
}

function images(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(images);
  return [...(node.type === 'Image' ? [node] : []), ...images(node.props?.children)];
}

test('full brand uses the supplied transparent PNG at its original aspect ratio', () => {
  const result = renderBrand({ width: 180 });
  assert.equal(result.props.source, '../../assets/logofull.png');
  assert.equal(result.props.style.aspectRatio, 2654 / 1568);
  assert.equal(result.props.style.height, 180 * 1568 / 2654);
  assert.equal(result.props.resizeMode, 'contain');
  assert.equal(result.props.accessibilityLabel, 'Destiny USA');
});

test('purple and compact headers use real earth and wordmark images on a readable surface', () => {
  for (const props of [{ light: true, subtitle: 'Premium shopping' }, { compact: true }]) {
    const result = renderBrand(props);
    assert.deepEqual(images(result).map(node => node.props.source), ['../../assets/logoonlyearth.png', '../../assets/logoonlytext.png']);
    assert.equal(result.props.style.flexShrink, 1);
    assert.equal(result.props.children[0].props.style.backgroundColor, '#FFFFFF');
  }
});

test('native launcher icon remains a square 1024px PNG', () => {
  const icon = fs.readFileSync(path.join(__dirname, '../assets/icon.png'));
  assert.equal(icon.subarray(1, 4).toString(), 'PNG');
  assert.equal(icon.readUInt32BE(16), 1024);
  assert.equal(icon.readUInt32BE(20), 1024);
});
