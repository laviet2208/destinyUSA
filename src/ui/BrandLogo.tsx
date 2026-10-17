import { Image, Text, View } from 'react-native';

export function BrandLogo({ width = 156, compact = false, light = false, subtitle }: { width?: number; compact?: boolean; light?: boolean; subtitle?: string }) {
  if (compact || light) return <View accessible accessibilityLabel="Destiny USA" style={{ gap: 5, maxWidth: '100%', flexShrink: 1 }}><View style={{ width, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 7, padding: 7, borderRadius: 10, backgroundColor: '#FFFFFF' }}><Image source={require('../../assets/logoonlyearth.png')} resizeMode="contain" style={{ width: 28, height: 28 }}/><Image source={require('../../assets/logoonlytext.png')} resizeMode="contain" style={{ flex: 1, height: 26 }}/></View>{subtitle && <Text style={{ color: light ? '#D5C5E5' : '#706278', fontSize: 9, lineHeight: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{subtitle}</Text>}</View>;
  return <Image source={require('../../assets/logofull.png')} accessibilityLabel="Destiny USA" resizeMode="contain" style={{ width, aspectRatio: 2654 / 1568, maxWidth: '100%' }}/>;
}
