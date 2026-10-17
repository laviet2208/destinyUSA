import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Path, Polygon, G } from 'react-native-svg';
import { AppText } from './components';

const voucherSerif = Platform.OS === 'ios' ? 'Georgia' : 'serif';

function VoucherArtwork() {
  const medal = Array.from({ length: 64 }, (_, index) => { const angle = index * Math.PI / 32; const radius = index % 2 ? 39 : 42; return `${58 + Math.cos(angle) * radius},${60 + Math.sin(angle) * radius}`; }).join(' ');
  return <Svg width="100%" height="100%" viewBox="0 0 360 226" preserveAspectRatio="none" accessible={false}>
    <Defs><LinearGradient id="voucherTeal" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#0C6570"/><Stop offset="1" stopColor="#00323E"/></LinearGradient><LinearGradient id="voucherRed" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#981D35"/><Stop offset="1" stopColor="#4D071E"/></LinearGradient><LinearGradient id="voucherGold" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#B78A38"/><Stop offset=".25" stopColor="#FCE9A6"/><Stop offset=".48" stopColor="#D4B269"/><Stop offset=".7" stopColor="#FFF1B5"/><Stop offset="1" stopColor="#AD7F2B"/></LinearGradient><LinearGradient id="voucherRibbon" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFF1"/><Stop offset=".45" stopColor="#C9BCA0"/><Stop offset=".7" stopColor="#FFFAE4"/><Stop offset="1" stopColor="#A9997B"/></LinearGradient></Defs>
    <Rect width="360" height="226" fill="url(#voucherTeal)"/><Rect width="116" height="226" fill="url(#voucherRed)"/><Path d="M116 0V226" stroke="#E3CA89" strokeWidth="1" opacity=".65"/>
    <G fill="none" stroke="#CCB56C" opacity=".17"><Circle cx="354" cy="0" r="68"/><Circle cx="354" cy="0" r="56"/><Circle cx="354" cy="0" r="44"/><Circle cx="154" cy="150" r="51"/><Circle cx="154" cy="150" r="40"/><Path d="M134 17Q177 45 211 9M123 27Q165 57 205 24"/></G>
    <Polygon points={medal} fill="url(#voucherGold)"/><Circle cx="58" cy="60" r="35" fill="none" stroke="#967020" strokeWidth=".7"/><Circle cx="58" cy="60" r="32" fill="none" stroke="#FFF2BA" strokeWidth=".6"/>
    <G fill="url(#voucherGold)"><Path d="M206 19L218 13L215 28Z"/><Path d="M335 17L349 12L342 26Z"/><Path d="M244 125L253 137L237 139Z"/><Path d="M130 92L135 82L141 94Z"/><Path d="M301 29L308 33L301 38Z"/></G>
    <G transform="translate(270 58) rotate(-10 45 50)"><Rect x="7" y="32" width="87" height="78" rx="3" fill="url(#voucherRed)"/><Rect x="2" y="27" width="97" height="20" rx="3" fill="#AC1534"/><Path d="M44 29H61V110H44Z" fill="url(#voucherRibbon)"/><Path d="M51 30C26 32 7 17 13 4C21-6 38 8 51 30Z" fill="url(#voucherRibbon)" stroke="#B9AB90"/><Path d="M52 30C63 5 81-8 88 2C98 16 77 30 52 30Z" fill="url(#voucherRibbon)" stroke="#B9AB90"/><Path d="M48 27L31 69L49 59L54 36L72 71L77 51L58 26Z" fill="url(#voucherRibbon)"/><Rect x="45" y="23" width="17" height="13" rx="5" fill="url(#voucherRibbon)"/></G>
    <Path d="M11 154H349" stroke="#E0C88A" strokeWidth=".6" opacity=".5"/><Rect x="9" y="127" width="98" height="17" rx="2" fill="#FFF6DF" opacity=".96"/>
  </Svg>;
}

export function VoucherFace({ value, unit, kind, scope, title, details }: { value: string; unit: string; kind: string; scope: string; title: string; details?: ReactNode }) {
  const { width } = useWindowDimensions();
  const titleSize = Math.min(24, Math.max(18, (width - 36) * 0.063));
  return <View style={styles.face}><View pointerEvents="none" style={StyleSheet.absoluteFill}><VoucherArtwork/></View><View style={styles.visual}><View style={styles.medal}><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.amount}>{value}</AppText><AppText numberOfLines={1} style={styles.unit}>{unit}</AppText></View><AppText numberOfLines={1} style={styles.kind}>{kind}</AppText><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65} style={styles.scope}>{scope}</AppText><View style={styles.copy}><AppText style={styles.brand}>DESTINY USA</AppText><View><AppText numberOfLines={1} style={[styles.heading, { fontSize: titleSize, lineHeight: titleSize + 2 }]}>GIFT</AppText><AppText numberOfLines={1} style={[styles.heading, { fontSize: titleSize, lineHeight: titleSize + 2 }]}>VOUCHER</AppText></View><AppText numberOfLines={2} style={styles.title}>{title}</AppText></View></View><View style={styles.details}>{details}</View></View>;
}

const styles = StyleSheet.create({
  face: { width: '100%', aspectRatio: 360 / 226, overflow: 'hidden', backgroundColor: '#063C46' }, visual: { position: 'absolute', top: 0, left: 0, right: 0, height: '68.14%' }, details: { position: 'absolute', top: '69%', bottom: 0, left: 0, right: 0, paddingHorizontal: 12, justifyContent: 'center' },
  medal: { position: 'absolute', left: '4.4%', width: '23.2%', top: '20%', height: '36%', alignItems: 'center', justifyContent: 'center' }, amount: { fontFamily: voucherSerif, fontSize: 30, lineHeight: 35, color: '#573C10', fontWeight: '700', textAlign: 'center', width: '100%' }, unit: { fontFamily: voucherSerif, color: '#684C20', fontSize: 10, lineHeight: 14 }, kind: { position: 'absolute', top: '67%', left: '2%', width: '28%', fontSize: 9, lineHeight: 15, color: '#FFF0C8', textAlign: 'center' }, scope: { position: 'absolute', top: '83.5%', left: '3.5%', width: '25%', fontSize: 9, lineHeight: 14, fontWeight: '700', color: '#774324', textAlign: 'center' },
  copy: { position: 'absolute', left: '36%', top: '11%', width: '39%', gap: 5 }, brand: { fontSize: 8, lineHeight: 10, letterSpacing: 1.6, color: '#EACD89' }, heading: { fontFamily: voucherSerif, fontSize: 24, lineHeight: 25, color: '#FFF9E8', letterSpacing: 0.3 }, title: { fontSize: 9, lineHeight: 13, color: '#B8DDD8', maxWidth: '95%' },
});
