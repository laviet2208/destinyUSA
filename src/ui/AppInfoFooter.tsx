import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowUpRight, ChevronRight, Clock3, Mail, MapPin, MessageCircle } from 'lucide-react-native';
import { useMobile } from '../state/MobileContext';
import { AppText } from './components';
import { BrandLogo } from './BrandLogo';
import { touchTarget } from './theme';

export const supportContact = {
  email: 'infodestinyusa1990@gmail.com',
  viberNumber: '+1 213 829 6490',
  viberName: 'DESTINY-USA CUSTOMER CARE',
  viberUrl: 'viber://chat?number=%2B12138296490',
} as const;

export function AppInfoFooter() {
  const { t } = useMobile();
  const navigation = useNavigation<any>();
  const [error, setError] = useState('');
  const opening = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const openContact = async (kind: 'email' | 'viber') => {
    if (opening.current) return;
    opening.current = true;
    setError('');
    try { await Linking.openURL(kind === 'email' ? `mailto:${supportContact.email}` : supportContact.viberUrl); }
    catch { if (mounted.current) setError(t(kind === 'viber' ? 'viberUnavailable' : 'contactLinkUnavailable')); }
    finally { opening.current = false; }
  };
  return <View style={styles.footer}>
    <View style={styles.brandRow}><BrandLogo light width={164}/><View style={styles.brandAccent}/></View>
    <AppText style={styles.tagline}>{t('premiumShopping')}</AppText>
    <View style={styles.section}>
      <AppText style={styles.heading}>{t('footerContact')}</AppText>
      <Pressable accessibilityRole="link" accessibilityLabel={`${t('email')}: ${supportContact.email}`} onPress={() => { void openContact('email'); }} style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
        <View style={styles.contactIcon}><Mail size={18} strokeWidth={1.5} color="#E4D0FA"/></View><View style={styles.contactCopy}><AppText style={styles.label}>{t('email')}</AppText><AppText selectable style={styles.contactValue}>{supportContact.email}</AppText></View><ArrowUpRight size={15} color="#BBA0D3"/>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel={`Viber: ${supportContact.viberNumber}`} onPress={() => { void openContact('viber'); }} style={({ pressed }) => [styles.contact, pressed && styles.pressed]}>
        <View style={styles.contactIcon}><MessageCircle size={18} strokeWidth={1.5} color="#E4D0FA"/></View><View style={styles.contactCopy}><AppText style={styles.label}>Viber</AppText><AppText selectable style={styles.contactValue}>{supportContact.viberNumber}</AppText><AppText selectable style={styles.contactName}>{supportContact.viberName}</AppText></View><ArrowUpRight size={15} color="#BBA0D3"/>
      </Pressable>
      {Boolean(error) && <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText>}
    </View>
    <View style={styles.divider}/>
    <View style={styles.section}>
      <View style={styles.headingRow}><Clock3 size={17} strokeWidth={1.5} color="#D4B7ED"/><AppText style={styles.heading}>{t('footerOpeningHours')}</AppText></View>
      <View style={styles.asiaHours}><View style={styles.asiaHeading}><AppText style={styles.asiaLabel}>{t('footerAsiaHours')}</AppText><AppText style={styles.timezone}>GMT+8</AppText></View><AppText style={styles.asiaTime}>09:30 – 00:00</AppText></View>
      <AppText style={styles.label}>{t('footerRegularHours')}</AppText>
      {[['footerMonThu', '10:00 – 20:00'], ['footerFriSat', '10:00 – 21:00'], ['footerSunday', '11:00 – 18:00']].map(([day, hours]) => <View key={day} style={styles.hoursRow}><AppText style={styles.day}>{t(day)}</AppText><AppText style={styles.hours}>{hours}</AppText></View>)}
    </View>
    <View style={styles.divider}/>
    <View style={styles.address}><MapPin size={17} strokeWidth={1.5} color="#C6A6DF"/><View style={styles.contactCopy}><AppText selectable style={styles.addressText}>1 Destiny USA Drive</AppText><AppText selectable style={styles.addressText}>Syracuse, NY 13204</AppText><AppText selectable style={styles.venuePhone}>315.466.6000</AppText></View></View>
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('about_screen')} style={({ pressed }) => [styles.about, pressed && styles.pressed]}><AppText style={styles.aboutLabel}>{t('aboutApp')}</AppText><ChevronRight size={17} color="#DDC7F0"/></Pressable>
    <AppText style={styles.copyright}>© {new Date().getFullYear()} Destiny USA</AppText>
  </View>;
}

const styles = StyleSheet.create({
  footer: { marginTop: 30, backgroundColor: '#2B143F', borderTopWidth: 2, borderTopColor: '#B999D0', paddingHorizontal: 22, paddingTop: 28, paddingBottom: 25 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 24 }, brandAccent: { flex: 1, height: 1, backgroundColor: '#79538F' }, tagline: { marginTop: 11, marginBottom: 25, color: '#C5ADD8', fontSize: 10, lineHeight: 16, letterSpacing: 1 },
  section: { gap: 13 }, heading: { color: '#F6F0FC', fontSize: 15, lineHeight: 22, fontWeight: '700' }, headingRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  contact: { minHeight: touchTarget, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }, contactIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#432659', justifyContent: 'center', alignItems: 'center' }, contactCopy: { flex: 1, minWidth: 0, gap: 3 }, label: { color: '#BFA5D4', fontSize: 10, lineHeight: 16, fontWeight: '600' }, contactValue: { color: '#FFFFFF', fontSize: 12, lineHeight: 19, fontWeight: '600' }, contactName: { color: '#CFBADC', fontSize: 9, lineHeight: 15, letterSpacing: 0.25 }, pressed: { opacity: 0.72 }, error: { color: '#F3CCD4', fontSize: 11, lineHeight: 17 },
  divider: { height: 1, backgroundColor: '#543268', marginVertical: 23 }, asiaHours: { backgroundColor: '#3C2250', borderRadius: 12, padding: 13, gap: 6 }, asiaHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, asiaLabel: { color: '#DFCAF0', fontSize: 11, lineHeight: 17, fontWeight: '600', flexShrink: 1 }, timezone: { color: '#DCC6A1', fontSize: 10, lineHeight: 16, fontWeight: '600', letterSpacing: 0.5 }, asiaTime: { color: '#FFFFFF', fontSize: 19, lineHeight: 26, fontWeight: '600', fontVariant: ['tabular-nums'], letterSpacing: 0.3 },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, day: { color: '#D6C4E2', fontSize: 11, lineHeight: 18, flexShrink: 1 }, hours: { color: '#F7F0FC', fontSize: 12, lineHeight: 18, fontVariant: ['tabular-nums'] },
  address: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 }, addressText: { color: '#D6C4E2', fontSize: 11, lineHeight: 18 }, venuePhone: { color: '#BFA5D4', fontSize: 11, lineHeight: 18 }, about: { minHeight: touchTarget, marginTop: 18, borderTopWidth: 1, borderColor: '#543268', paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, aboutLabel: { color: '#DDC7F0', fontSize: 12, lineHeight: 19, fontWeight: '600', flex: 1 }, copyright: { color: '#A78DBA', fontSize: 10, lineHeight: 16, marginTop: 15 },
});
