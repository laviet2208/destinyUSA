import { Image } from 'expo-image';
import { Text, View } from 'react-native';

export function BrandLogo({ width, compact = false, light = false, subtitle }: { width?: number; compact?: boolean; light?: boolean; subtitle?: string }) {
  const padding = light ? 11 : 1;
  const totalWidth = width ?? (light ? 162 : compact ? 116 : 142);
  const scale = Math.max(0, totalWidth - padding * 2) / 140;
  return <View accessible accessibilityLabel="Destiny USA" style={{ gap: 5, maxWidth: '100%', flexShrink: 1, alignSelf: 'flex-start' }}>
    <View style={{ width: totalWidth, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 * scale, paddingHorizontal: padding, paddingVertical: light ? 8 : 2, minHeight: light ? 47 : 35, borderRadius: 13, backgroundColor: light ? '#FFFFFF' : 'transparent' }}>
      <Image source={require('../../assets/auth/brand-mark.webp')} contentFit="contain" style={{ width: 37 * scale, height: 30 * scale }}/>
      <Image source={require('../../assets/auth/brand-wordmark.webp')} contentFit="contain" style={{ width: 97 * scale, height: 97 * scale * 104 / 499 }}/>
    </View>
    {subtitle && <Text style={{ color: light ? '#D5C5E5' : '#706278', fontSize: 9, lineHeight: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{subtitle}</Text>}
  </View>;
}
