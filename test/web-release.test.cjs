const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { finalizeWebBuild } = require('../scripts/finalize-web.cjs');

function fixture(run) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'destiny-web-release-'));
  const template = path.join(__dirname, '../scripts/phone-preview.html');
  const write = hash => fs.writeFileSync(path.join(directory, 'index.html'), `<html><head></head><body><script src="/_expo/static/js/web/index-${hash}.js"></script></body></html>`);
  try { run(directory, template, write); }
  finally {
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(os.tmpdir()));
    assert.match(path.basename(directory), /^destiny-web-release-/);
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('web releases version the iframe entry when the JavaScript hash changes, retaining same-origin sessions', () => fixture((directory, template, write) => {
  write('old');
  const first = finalizeWebBuild(directory, template);
  assert.match(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), new RegExp(`src="/app/\\?v=${first}"`));
  assert.match(fs.readFileSync(path.join(directory, 'app/index.html'), 'utf8'), new RegExp(`name="destiny-web-build" content="${first}"`));
  write('new');
  const second = finalizeWebBuild(directory, template);
  assert.notEqual(first, second);
  assert.match(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), new RegExp(`src="/app/\\?v=${second}"`));
  assert.doesNotMatch(fs.readFileSync(path.join(directory, 'index.html'), 'utf8'), /localStorage\.clear|indexedDB\.deleteDatabase|location\.reload/);
  write('new');
  assert.equal(finalizeWebBuild(directory, template), second);
}));

test('web packaging rejects a stale bundle from a different API environment before publishing', () => fixture((directory, template, write) => {
  write('api');
  const bundles = path.join(directory, '_expo/static/js/web');
  fs.mkdirSync(bundles, { recursive: true });
  fs.writeFileSync(path.join(bundles, 'index-api.js'), 'const api="https://other.example.test";');
  assert.throws(() => finalizeWebBuild(directory, template, 'https://api.example.test'), /configured API origin/);
  fs.writeFileSync(path.join(bundles, 'index-api.js'), 'const api="https://api.example.test";');
  assert.match(finalizeWebBuild(directory, template, 'https://api.example.test'), /^[a-f0-9]{16}$/);
}));

test('release builds clear transformed modules before switching API environments', () => {
  assert.match(fs.readFileSync(path.join(__dirname, '../scripts/build-web.cjs'), 'utf8'), /'--clear'/);
});
