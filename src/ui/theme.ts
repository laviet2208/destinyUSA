import { Platform, StyleSheet } from 'react-native';

export const colors = {
  primary: '#48217D', secondary: '#7940B5', lavender: '#EEE5F7', background: '#FFFFFF',
  text: '#1F1830', muted: '#827B91', line: '#EBE8F0', surface: '#FAF9FC',
  danger: '#B34853', success: '#16805C', warning: '#976211', disabled: '#D8D3DF',
  softPurple: '#F7F3FA', deepPurple: '#321454', onPrimary: '#FFFFFF',
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32, page: 18 } as const;
export const touchTarget = Platform.OS === 'android' ? 48 : 44;
export const radius = { small: 9, control: 12, image: 13, banner: 17, sheet: 22 } as const;
export const typography = StyleSheet.create({
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.8 },
  heading: { fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.45 },
  body: { fontSize: 12, lineHeight: 19, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  caption: { fontSize: 11, lineHeight: 16, fontWeight: '400' },
  price: { fontSize: 25, lineHeight: 33, fontWeight: '800', letterSpacing: -0.75, fontVariant: ['tabular-nums'] },
  productName: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
  cardPrice: { fontSize: 15, lineHeight: 21, fontWeight: '800', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  overline: { fontSize: 10, lineHeight: 15, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  button: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
export const fontFamily = Platform.select({ ios: 'System', default: 'sans-serif' });
