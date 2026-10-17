import { useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { FilePenLine, MessageCircle, Phone } from 'lucide-react-native';
import { useMobile } from '../../state/MobileContext';
import { captureApiSession, isApiSessionCurrent } from '../../services/api';
import { AppText, Button, Header, Notice, Screen } from '../../ui/components';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors } from '../../ui/theme';
import { type AccountScreenProps } from './account-ui';

export function SupportScreen({ navigation, route }: AccountScreenProps) {
  const { t } = useMobile();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const opening = useRef(false);
  const withdrawal = route?.params?.mode === 'withdrawal';
  const openViber = async () => { if (opening.current) return; const session = captureApiSession(); opening.current = true; setBusy(true); setError(''); try { await Linking.openURL('viber://chat?number=%2B12138296490'); } catch { if (isApiSessionCurrent(session)) setError(t('viberUnavailable')); } finally { opening.current = false; if (isApiSessionCurrent(session)) setBusy(false); } };
  return <Screen scroll={false}><Header title={withdrawal ? t('withdraw') : route?.params?.mode === 'deposit' ? t('deposit') : t('customerCare')} onBack={() => navigation.goBack()}/><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <View style={styles.intro}><View accessibilityElementsHidden style={styles.supportSymbol}><MessageCircle size={36} strokeWidth={1.4} color={colors.primary}/></View><AppText style={styles.title}>{t('supportIntro')}</AppText><AppText style={styles.description}>{t('thissystemwilltranfer')}</AppText></View>
    {error && <Notice message={`${error}\n+12138296490`} danger/>}
    <View style={styles.contactCard}><Phone size={24} strokeWidth={1.5} color={colors.primary}/><View style={styles.contactText}><AppText variant="label">{t('viber')}</AppText><AppText muted selectable>+1 213 829 6490</AppText></View></View>
    <Button title={t('viber')} onPress={() => { void openViber(); }} variant="secondary" icon={<MessageCircle size={17} color={colors.primary}/>} loading={busy}/>
    <Button title={t('inAppSupport')} onPress={() => navigation.navigate('chat_room')} icon={<MessageCircle size={17} color={colors.background}/>}/>
    {withdrawal && <Button title={t('filloutform')} onPress={() => navigation.navigate('withdrawal_form')} variant="quiet" icon={<FilePenLine size={17} color={colors.primary}/>} style={styles.formButton}/>}
  </ScrollView><CommerceFooter/></Screen>;
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 26, gap: 8 }, intro: { alignItems: 'center', paddingTop: 30, paddingBottom: 20, paddingHorizontal: 9 }, supportSymbol: { width: 75, height: 75, borderRadius: 22, backgroundColor: '#F3EDF8', alignItems: 'center', justifyContent: 'center', marginBottom: 17 },
  title: { fontSize: 23, lineHeight: 30, fontWeight: '800', letterSpacing: -0.7, textAlign: 'center', marginBottom: 10 }, description: { fontSize: 12, lineHeight: 19, color: '#81748B', textAlign: 'center' },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: colors.softPurple, borderRadius: 13, marginTop: 6, marginBottom: 8 }, contactText: { flex: 1, gap: 4 },
  formButton: { borderWidth: 1, borderColor: '#E1D5ED', marginTop: 8 },
});
