import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { ArrowRight, Globe2, Monitor, Smartphone } from 'lucide-react-native';
import { browserLanguage } from '../services/desktop-access';
import { languages, normalizeLanguage, translate, type Language } from './strings';
import { AppText, UiLanguage } from './components';
import { BrandLogo } from './BrandLogo';
import { colors } from './theme';

export function DesktopNotice() {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [language, setLanguage] = useState<Language>(() => browserLanguage(navigator.language));
  const selection = useRef(0);
  const storage = useRef(Promise.resolve());
  const t = (key: string) => translate(language, key);
  useEffect(() => {
    let current = true;
    const version = selection.current;
    void SecureStore.getItemAsync('destiny.language').then(saved => { if (current && saved && selection.current === version) setLanguage(normalizeLanguage(saved)); }).catch(() => {});
    return () => { current = false; };
  }, []);
  const chooseLanguage = (value: string) => {
    const next = normalizeLanguage(value);
    selection.current += 1;
    setLanguage(next);
    storage.current = storage.current.catch(() => {}).then(() => SecureStore.setItemAsync('destiny.language', next));
    void storage.current.catch(() => {});
  };
  return <UiLanguage.Provider value={language}><ScrollView style={styles.page} contentContainerStyle={[styles.content, !wide && styles.narrowContent]}>
    <View style={styles.header}><BrandLogo width={174}/><View style={styles.language}><Globe2 size={17} strokeWidth={1.5} color={colors.primary}/><select aria-label={t('language')} lang={language} value={language} onChange={event => chooseLanguage(event.target.value)} style={{ fontFamily: 'inherit', fontSize: 13, color: colors.primary, background: 'transparent', border: 0, outlineOffset: 5, cursor: 'pointer', maxWidth: '100%', padding: '9px 4px', minHeight: 44 }}>{languages.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></View></View>
    <View style={[styles.main, !wide && styles.narrowMain]}>
      <View style={[styles.copy, !wide && styles.narrowCopy]}><View style={styles.status}><View style={styles.statusDot}/><AppText style={styles.statusText}>{t('desktopStatus')}</AppText></View><AppText accessibilityRole="header" style={[styles.title, !wide && styles.narrowTitle]}>{t('desktopTitle')}</AppText><AppText style={styles.description}>{t('desktopMessage')}</AppText><View style={styles.mobileHint}><Smartphone size={20} strokeWidth={1.5} color={colors.primary}/><AppText style={styles.hintText}>{t('desktopMobileHint')}</AppText></View><View style={styles.siteRow}><AppText selectable style={styles.site}>{window.location.origin.replace(/^https?:\/\//, '')}</AppText><ArrowRight size={16} color="#9274AC"/></View></View>
      <View accessible={false} accessibilityElementsHidden style={[styles.visual, !wide && styles.narrowVisual]}><View style={styles.outerRing}><View style={styles.innerRing}><Monitor size={112} strokeWidth={1.1} color={colors.primary}/></View></View><View style={styles.phone}><View style={styles.phoneSpeaker}/><View style={styles.phoneMark}><Smartphone size={34} strokeWidth={1.25} color={colors.secondary}/></View><View style={styles.phoneLine}/><View style={[styles.phoneLine, { width: 29, opacity: 0.5 }]}/><View style={styles.phoneHome}/></View><View style={styles.spark}/></View>
    </View>
    <View style={styles.bottom}><AppText style={styles.copyright}>© {new Date().getFullYear()} Destiny USA</AppText><a href="mailto:infodestinyusa1990@gmail.com" style={{ color: '#776485', fontSize: 12, lineHeight: '20px', textDecoration: 'none', overflowWrap: 'anywhere', padding: '8px 0' }}>infodestinyusa1990@gmail.com</a></View>
  </ScrollView></UiLanguage.Provider>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8F5FC' }, content: { flexGrow: 1, paddingHorizontal: 48, paddingTop: 30, paddingBottom: 24, alignItems: 'center' }, narrowContent: { paddingHorizontal: 24, paddingTop: 18 },
  header: { width: '100%', maxWidth: 1080, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }, language: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E9E0F0', borderRadius: 11, maxWidth: '100%' },
  main: { width: '100%', maxWidth: 1080, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 48, paddingVertical: 64 }, narrowMain: { flexDirection: 'column-reverse', gap: 32, paddingVertical: 38 }, copy: { flex: 1, maxWidth: 610, alignItems: 'flex-start' }, narrowCopy: { flex: 0, width: '100%' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#EEE5F7', marginBottom: 24 }, statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.secondary }, statusText: { fontSize: 10, lineHeight: 16, letterSpacing: 0.8, color: colors.primary, fontWeight: '700', textTransform: 'uppercase', flexShrink: 1 },
  title: { fontSize: 46, lineHeight: 56, letterSpacing: -1.8, fontWeight: '700', color: '#351855' }, narrowTitle: { fontSize: 30, lineHeight: 39, letterSpacing: -0.8 }, description: { marginTop: 21, fontSize: 15, lineHeight: 26, color: '#807289', maxWidth: 510 },
  mobileHint: { marginTop: 30, flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '100%' }, hintText: { color: colors.primary, fontSize: 13, lineHeight: 21, fontWeight: '600', flexShrink: 1 }, siteRow: { marginTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderColor: '#DFD2EB', flexDirection: 'row', alignItems: 'center', gap: 18, maxWidth: '100%' }, site: { fontSize: 12, lineHeight: 20, color: '#9274AC', flexShrink: 1 },
  visual: { width: 300, height: 310, alignItems: 'center', justifyContent: 'center' }, narrowVisual: { width: 260, height: 230 }, outerRing: { width: 256, height: 256, borderRadius: 128, borderWidth: 1, borderColor: '#E3D5EF', alignItems: 'center', justifyContent: 'center' }, innerRing: { width: 216, height: 216, borderRadius: 108, backgroundColor: '#EEE5F7', alignItems: 'center', justifyContent: 'center' }, phone: { position: 'absolute', bottom: 20, right: 8, width: 86, height: 145, borderWidth: 2, borderColor: '#48217D', borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', paddingTop: 10 }, phoneSpeaker: { width: 23, height: 3, borderRadius: 2, backgroundColor: '#CBB6DD' }, phoneMark: { width: 54, height: 54, borderRadius: 15, backgroundColor: '#F5EFFA', justifyContent: 'center', alignItems: 'center', marginTop: 15, marginBottom: 12 }, phoneLine: { width: 43, height: 3, borderRadius: 2, backgroundColor: '#CCBADD', marginBottom: 6 }, phoneHome: { position: 'absolute', bottom: 8, width: 21, height: 3, borderRadius: 2, backgroundColor: '#DDD0E8' }, spark: { position: 'absolute', top: 28, right: 34, width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }], backgroundColor: '#BFA5D6' },
  bottom: { width: '100%', maxWidth: 1080, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: '#E9E0F0', paddingTop: 16 }, copyright: { color: '#9D8BA9', fontSize: 11, lineHeight: 20 },
});
