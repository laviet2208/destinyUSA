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
    if (name === 'expo-image') return { Image: 'Image' };
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

test('every brand placement uses the exact inline symbol and wordmark extracted from the auth reference', () => {
  for (const props of [{}, { width: 180 }, { compact: true }, { light: true }]) {
    const result = renderBrand(props);
    assert.deepEqual(images(result).map(node => node.props.source), ['../../assets/auth/brand-mark.webp', '../../assets/auth/brand-wordmark.webp']);
    assert.equal(result.props.accessibilityLabel, 'Destiny USA');
    for (const node of images(result)) {
      assert.equal(node.props.contentFit, 'contain');
      assert.ok(node.props.style.width > 0 && node.props.style.height > 0);
    }
  }
});

test('purple headers use the reference white badge while light surfaces do not add another logo card', () => {
  for (const props of [{ light: true, subtitle: 'Brand caption' }, { compact: true }]) {
    const result = renderBrand(props);
    assert.equal(result.props.style.flexShrink, 1);
    assert.equal(result.props.children[0].props.style.backgroundColor, props.light ? '#FFFFFF' : 'transparent');
  }
});

test('all embedded auth illustration assets are bundled WebP files rather than HTML or external demo URLs', () => {
  for (const name of ['brand-mark', 'brand-wordmark', 'scene-headphones', 'scene-perfume', 'scene-watch']) {
    const image = fs.readFileSync(path.join(__dirname, `../assets/auth/${name}.webp`));
    assert.equal(image.subarray(0, 4).toString(), 'RIFF');
    assert.equal(image.subarray(8, 12).toString(), 'WEBP');
    assert.ok(image.length > 1000);
  }
});

test('native launcher icon is an opaque 1024px PNG with the requested logo source bundled', async () => {
  const icon = fs.readFileSync(path.join(__dirname, '../assets/icon.png'));
  assert.equal(icon.subarray(1, 4).toString(), 'PNG');
  assert.equal(icon.readUInt32BE(16), 1024);
  assert.equal(icon.readUInt32BE(20), 1024);
  const source = fs.readFileSync(path.join(__dirname, '../assets/logomain.png'));
  assert.equal(source.subarray(1, 4).toString(), 'PNG');
  assert.equal(source.readUInt32BE(16), source.readUInt32BE(20));
  const { getPngInfo } = require('@expo/image-utils');
  const pixels = await getPngInfo(path.join(__dirname, '../assets/icon.png'));
  for (let offset = 3; offset < pixels.data.length; offset += 4) assert.equal(pixels.data[offset], 255);
});
