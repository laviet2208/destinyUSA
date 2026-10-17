const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'expo-secure-store') {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src/platform/storage.web.ts') };
  }
  return context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
