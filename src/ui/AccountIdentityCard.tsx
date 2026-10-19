import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Pencil } from 'lucide-react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Pattern, Rect, Stop } from 'react-native-svg';
import type { Account } from '../types';
import { AppText, IconButton } from './components';

type Props = {
  account: Pick<Account, 'first_name' | 'last_name' | 'email' | 'referral_code'>;
  referralLabel: string;
  editLabel: string;
  onEdit: () => void;
};

function SocietyMark({ id }: { id: string }) {
  return <View accessible accessibilityLabel="Destiny Society LLC" style={styles.society}>
    <Svg width={39} height={27} viewBox="0 0 60 42" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Defs><LinearGradient id={`${id}societyGold`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF0BD"/><Stop offset="0.5" stopColor="#C49850"/><Stop offset="1" stopColor="#F7DB91"/></LinearGradient></Defs><Path d="M4 27 30 3 56 27 49 34 30 16 11 34Z" fill={`url(#${id}societyGold)`}/><Path d="M18 33 30 22 42 33 36 39 30 33 24 39Z" fill="#9AB5C9"/><Path d="M3 39H13M47 39H57" stroke="#D9B574" strokeWidth="2"/></Svg>
    <AppText style={styles.societyName}>DESTINY</AppText><View style={styles.societyCaption}><View style={styles.rule}/><AppText style={styles.societyType}>SOCIETY LLC.</AppText><View style={styles.rule}/></View>
  </View>;
}

function ShoppingMark({ id }: { id: string }) {
  return <View accessible accessibilityLabel="Destiny USA — Online shopping" style={styles.shopping}>
    <Svg width={33} height={38} viewBox="0 0 50 58" accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Defs><LinearGradient id={`${id}shoppingRed`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FF333E"/><Stop offset="1" stopColor="#D90024"/></LinearGradient></Defs><Path d="M16 20V13a9 9 0 0 1 18 0v7" fill="none" stroke="#20B4D6" strokeWidth="4"/><Path d="M7 19Q7 17 10 17H40Q43 17 43 20L48 52Q48 55 44 55H6Q2 55 3 51Z" fill={`url(#${id}shoppingRed)`}/><Circle cx="18" cy="32" r="2.3" fill="#FFFFFF"/><Path d="M30 32H36M14 40Q25 52 38 40" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round"/></Svg>
    <View style={styles.wordmark}><Image source={require('../../assets/auth/brand-mark.webp')} contentFit="contain" style={styles.earth}/><AppText numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.destiny}>destiny<AppText style={styles.usa}> usa</AppText></AppText></View>
    <AppText style={styles.shoppingCaption}>ONLINE SHOPPING</AppText>
  </View>;
}

export function AccountIdentityCard({ account, referralLabel, editLabel, onEdit }: Props) {
  const id = useId().replace(/:/g, '');
  const name = [account.first_name, account.last_name].filter(Boolean).join(' ') || account.email.split('@')[0];
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase() ?? '';
  return <View style={styles.card}>
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%"><Defs>
        <LinearGradient id={`${id}navy`} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#13263C"/><Stop offset="0.52" stopColor="#0B1829"/><Stop offset="1" stopColor="#122138"/></LinearGradient>
        <LinearGradient id={`${id}gold`} x1="0" y1="0" x2="1" y2="0.65"><Stop offset="0" stopColor="#9F7134"/><Stop offset="0.1" stopColor="#FFE6A8"/><Stop offset="0.24" stopColor="#BC8C46"/><Stop offset="0.49" stopColor="#F3D18A"/><Stop offset="0.74" stopColor="#A2783D"/><Stop offset="0.92" stopColor="#FFE6AA"/><Stop offset="1" stopColor="#B48845"/></LinearGradient>
        <Pattern id={`${id}grain`} width="8" height="8" patternUnits="userSpaceOnUse"><Circle cx="1" cy="2" r="0.45" fill="#D5E3F0" opacity="0.12"/><Circle cx="5" cy="6" r="0.7" fill="#000000" opacity="0.18"/><Path d="M0 7 3 5M5 2 8 0" stroke="#7890AA" strokeWidth="0.5" opacity="0.08"/></Pattern>
      </Defs><Rect width="100%" height="100%" rx="21" fill={`url(#${id}navy)`}/><Ellipse cx="84%" cy="6%" rx="44%" ry="34%" fill="#354F6B" opacity="0.12"/><Rect width="100%" height="100%" rx="21" fill={`url(#${id}grain)`}/><Rect x="1" y="1" width="99.4%" height="99%" rx="20" fill="none" stroke={`url(#${id}gold)`} strokeWidth="3"/><Rect x="4" y="4" width="97.7%" height="96%" rx="17" fill="none" stroke="#F2D49B" strokeOpacity="0.15" strokeWidth="0.7"/></Svg>
    </View>
    <View style={styles.brands}><SocietyMark id={id}/><View style={styles.brandDivider}/><ShoppingMark id={id}/></View>
    <View style={styles.identity}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}><AppText style={styles.initial}>{initial}</AppText></View><View style={styles.details}><AppText style={styles.name}>{name}</AppText><AppText selectable style={styles.email}>{account.email}</AppText><AppText selectable style={styles.referral}>{referralLabel}: {account.referral_code}</AppText></View><IconButton label={editLabel} onPress={onEdit}><Pencil size={22} strokeWidth={1.7} color="#F9F5E9"/></IconButton></View>
  </View>;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 18, marginBottom: 15, borderRadius: 21, overflow: 'hidden', backgroundColor: '#0B1829', paddingHorizontal: 15, paddingTop: 17, paddingBottom: 20, borderWidth: 1, borderColor: '#B28D50' },
  brands: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', gap: 8, marginBottom: 19 },
  brandDivider: { width: 1, height: 39, backgroundColor: '#D8B879', opacity: 0.22 },
  society: { alignItems: 'center', gap: 2, flex: 1, minWidth: 0 },
  societyName: { color: '#E7CE97', fontSize: 18, lineHeight: 23, fontWeight: '400', letterSpacing: 3 },
  societyCaption: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  societyType: { color: '#D3D9E1', fontSize: 7, lineHeight: 10, fontWeight: '600', letterSpacing: 1.1 },
  rule: { width: 10, height: 1, backgroundColor: '#C7A160' },
  shopping: { flex: 1.25, minWidth: 0, alignItems: 'center', gap: 2 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  earth: { width: 18, height: 18, flexShrink: 0 },
  destiny: { fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.7, color: '#F7FAFD', flexShrink: 1 },
  usa: { fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.7, color: '#94C748' },
  shoppingCaption: { fontSize: 6, lineHeight: 9, fontWeight: '600', letterSpacing: 1.5, color: '#D1DAE6', paddingStart: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 48, height: 54, flexShrink: 0, borderRadius: 16, backgroundColor: '#5C3585', borderWidth: 1, borderColor: '#77539E', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#FFFFFF', fontSize: 29, lineHeight: 36, fontWeight: '700' },
  details: { flex: 1, minWidth: 0, gap: 5 },
  name: { color: '#FAFAF5', fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.3 },
  email: { color: '#C1CBDA', fontSize: 12, lineHeight: 18 },
  referral: { color: '#CBBFA9', fontSize: 12, lineHeight: 18 },
});
