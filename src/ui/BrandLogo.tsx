import { Image, Text, View } from 'react-native';

export function BrandLogo({ width = 156, compact = false, light = false, subtitle }: { width?: number; compact?: boolean; light?: boolean; subtitle?: string }) {
  if (light) return <View accessible accessibilityLabel="Destiny USA" style={{ gap: 2, maxWidth: '100%' }}><Text style={{ color: '#FFFFFF', fontSize: 19, lineHeight: 23, fontWeight: '800', letterSpacing: -0.9 }}>destiny<Text style={{ fontWeight: '400', color: '#DACBE8' }}>USA</Text></Text>{subtitle && <Text style={{ color: '#D5C5E5', fontSize: 9, lineHeight: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase' }}>{subtitle}</Text>}</View>;
  if (compact) return <View accessible accessibilityLabel="Destiny USA" style={{ flexDirection: 'row', alignItems: 'center', gap: 7, padding: 7, borderRadius: 10, backgroundColor: '#FFFFFF', maxWidth: '100%' }}><Image source={require('../../assets/logoonlyearth.png')} resizeMode="contain" style={{ width: 28, height: 28 }}/><Image source={require('../../assets/logoonlytext.png')} resizeMode="contain" style={{ width: Math.max(70, width - 49), height: 26 }}/></View>;
  return <Image source={require('../../assets/logonew.jpg')} accessibilityLabel="Destiny USA" resizeMode="contain" style={{ width, height: width * 756 / 1280, maxWidth: '100%' }}/>;
}
