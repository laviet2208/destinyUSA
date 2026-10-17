const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const moduleSource = fs.readFileSync(path.join(__dirname, '../src/ui/auth-layout.ts'), 'utf8');
const compiled = ts.transpileModule(moduleSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports });
const { authLayout, passwordPresentation } = loaded.exports;

test('auth geometry scales across phone widths and reserves the bottom safe area without hiding actions', () => {
  for (const width of [320, 360, 390, 430, 480]) {
    for (const height of [568, 730, 844, 926]) {
      const layout = authLayout(width, height, 44, 34);
      assert.ok(layout.heroHeight >= 390 && layout.heroHeight <= 540);
      assert.ok(layout.headlineSize >= 32 && layout.headlineSize <= 42);
      assert.ok(layout.padding >= 20 && layout.padding <= 23);
      assert.ok(layout.bottomPadding >= 34);
      assert.ok(layout.sceneScale >= 0.85 && layout.sceneScale <= 1);
    }
  }
});

test('password meter is a visual indicator, not a replacement authentication or complexity rule', () => {
  assert.equal(passwordPresentation(''), 0);
  assert.equal(passwordPresentation('abcdefgh'), 1);
  assert.equal(passwordPresentation('abcdefgh12345'), 2);
  assert.equal(passwordPresentation('Abcdefgh123!'), 4);
});
