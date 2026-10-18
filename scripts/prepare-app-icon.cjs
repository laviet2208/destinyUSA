const fs = require('node:fs/promises');
const path = require('node:path');
const { generateImageAsync } = require('@expo/image-utils');

async function prepareIcon() {
  const root = path.resolve(__dirname, '..');
  const { source } = await generateImageAsync({ projectRoot: root }, {
    src: path.join(root, 'assets/logomain.png'),
    width: 1024,
    height: 1024,
    resizeMode: 'contain',
    backgroundColor: '#FFFFFF',
    removeTransparency: true,
  });
  await fs.writeFile(path.join(root, 'assets/icon.png'), source);
  console.log('Prepared Android/iOS app icon from assets/logomain.png (1024×1024).');
}

prepareIcon().catch(error => { console.error(error.message); process.exitCode = 1; });
