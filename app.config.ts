import type { ExpoConfig } from 'expo/config';

const isDevelopment = process.env.APP_VARIANT === 'development';

export default {
  name: 'Destiny USA',
  slug: 'destiny-usa-customer',
  owner: 'vitla22',
  scheme: 'destinyusa',
  version: '1.0.9',
  platforms: ['ios', 'android', 'web'],
  web: { bundler: 'metro', output: 'single', name: 'Destiny USA', favicon: './assets/icon.png' },
  icon: './assets/icon.png',
  android: {
    package: 'destn.dstnm.destinymain',
    versionCode: 9,
    googleServicesFile: './google-services.json',
    permissions: ['android.permission.POST_NOTIFICATIONS'],
    blockedPermissions: ['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.READ_MEDIA_IMAGES', 'android.permission.READ_MEDIA_VIDEO'],
  },
  ios: {
    bundleIdentifier: 'destn.dstnm.destinymain',
    buildNumber: '9',
    appleTeamId: '827H8UVFKV',
    supportsTablet: true,
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: {
      CFBundleDisplayName: 'Destiny USA',
      CFBundleName: 'Destiny USA',
      UIBackgroundModes: ['remote-notification'],
      UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'],
      'UISupportedInterfaceOrientations~ipad': ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown', 'UIInterfaceOrientationLandscapeLeft', 'UIInterfaceOrientationLandscapeRight'],
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  plugins: [
    ['@react-native-firebase/app', { ios: { disableSPM: true } }],
    '@react-native-firebase/messaging',
    ['expo-build-properties', { android: { minSdkVersion: 24, compileSdkVersion: 36, targetSdkVersion: 36, usesCleartextTraffic: isDevelopment }, ios: { deploymentTarget: '16.6', useFrameworks: 'static', forceStaticLinking: ['RNFBApp', 'RNFBMessaging'] } }],
    ['expo-image-picker', { photosPermission: 'Cho phép Destiny USA chọn ảnh để gửi cho bộ phận hỗ trợ.', cameraPermission: 'Cho phép Destiny USA chụp ảnh để gửi hỗ trợ.', microphonePermission: false }],
    'expo-secure-store',
    'expo-notifications',
    'expo-image',
    'expo-status-bar',
  ],
  extra: { apiUrl: process.env.EXPO_PUBLIC_API_URL ?? '', eas: { projectId: 'cd3200c2-c9ca-44ae-8504-030cdcca4c05' } },
} satisfies ExpoConfig;
