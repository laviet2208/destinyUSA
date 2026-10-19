const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { finalizeWebBuild } = require('./finalize-web.cjs');

const root = path.resolve(__dirname, '..');
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'export', '--platform', 'web', '--output-dir', 'dist-web', '--clear'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_WEB_API_URL ?? '', CI: '1' },
});
if (result.error) console.error(result.error.message);
if (result.status === 0) {
  const output = path.join(root, 'dist-web');
  finalizeWebBuild(output, path.join(__dirname, 'phone-preview.html'), process.env.EXPO_PUBLIC_WEB_API_URL);
}
process.exit(result.status ?? 1);
