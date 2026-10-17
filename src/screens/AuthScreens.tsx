import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Check, Eye, EyeOff, Gift } from 'lucide-react-native';
import { AppText, Button, Field, Header, IconButton, Notice, Screen } from '../ui/components';
import { colors, touchTarget } from '../ui/theme';
import { BrandLogo } from '../ui/BrandLogo';
import { useMobile } from '../state/MobileContext';

export function WelcomeScreen({ navigation }: any) {
  const { t, enterGuest } = useMobile();
  return <Screen><View style={styles.welcomeHero}><BrandLogo width={98}/><View style={styles.welcomeCopy}><AppText variant="overline" style={styles.kicker}>DESTINY USA</AppText><AppText style={styles.welcomeHeadline}>{t('shoppingYourWay')}</AppText></View><AppText style={styles.welcomeDescription}>{t('guestWelcome')}</AppText></View><View style={styles.welcomeActions}><Button title={t('login')} onPress={() => navigation.navigate('login_screen')}/><Button title={t('signup')} variant="secondary" onPress={() => navigation.navigate('signup_screen')}/><Button title={t('guest')} variant="quiet" onPress={enterGuest}/></View></Screen>;
}

export function LoginScreen({ navigation }: any) {
  const { t, login, savedLogin } = useMobile();
  const [email, setEmail] = useState(savedLogin?.email ?? '');
  const [password, setPassword] = useState(savedLogin?.password ?? '');
  const [remember, setRemember] = useState(true);
  const [savePassword, setSavePassword] = useState(Boolean(savedLogin));
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async () => { setBusy(true); setError(''); try { await login({ email, password, remember, savePassword }); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } };
  return <Screen scroll={false}><Header title={t('login')} onBack={() => navigation.goBack()}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
    <View style={styles.formIntro}><AppText style={styles.loginHeadline}>{t('welcomeBack')}</AppText><AppText style={styles.formDescription}>{t('guestWelcome')}</AppText></View>
    <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username"/>
    <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="current-password" textContentType="password" trailing={<IconButton label={t(visible ? 'hidePassword' : 'showPassword')} onPress={() => setVisible(!visible)}>{visible ? <EyeOff size={20} color={colors.muted}/> : <Eye size={20} color={colors.muted}/>}</IconButton>}/>
    <View style={styles.rememberOptions}><RememberOption title={t('rememberSession')} checked={remember} onChange={setRemember}/><RememberOption title={t('rememberPassword')} checked={savePassword} onChange={setSavePassword}/></View>
    {error && <Notice message={error} danger/>}<Button title={t('login')} onPress={() => void submit()} disabled={!email.trim() || !password} loading={busy}/>
    <Button title={t('signup')} variant="quiet" onPress={() => navigation.navigate('signup_screen')}/>
  </ScrollView></Screen>;
}

export function SignupScreen({ navigation }: any) {
  const { t, signup } = useMobile();
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async () => { setBusy(true); setError(''); try { await signup({ firstName, lastName, email, password }); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } };
  return <Screen scroll={false}><Header title={t('signup')} onBack={() => navigation.goBack()}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
    <View style={styles.formIntro}><AppText style={styles.signupHeadline}>{t('createAccountIntro')}</AppText><AppText style={styles.formDescription}>{t('guestWelcome')}</AppText></View>
    <Field label={t('firstName')} value={firstName} onChangeText={setFirstName} autoComplete="given-name"/><Field label={t('lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name"/>
    <Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email"/>
    <Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword"/>
    {error && <Notice message={error} danger/>}<Button title={t('signup')} onPress={() => void submit()} loading={busy} disabled={!firstName.trim() || !email.trim() || !password}/>
    <Button title={t('login')} onPress={() => navigation.navigate('login_screen')} variant="quiet"/>
  </ScrollView></Screen>;
}

export function ReferralScreen() {
  const { t, referral, logout } = useMobile(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  return <Screen scroll={false}><Header title={t('referral')}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.referralForm}>
    <View style={styles.referralIntro}><View accessibilityElementsHidden style={styles.referralSymbol}><Gift size={29} strokeWidth={1.5} color={colors.primary}/></View><AppText style={styles.signupHeadline}>{t('enterReferral')}</AppText><AppText style={styles.formDescription}>{t('referralDescription')}</AppText></View>
    <Field label={t('referral')} value={code} onChangeText={setCode} autoCapitalize="none"/>
    {error && <Notice message={error} danger/>}
    <Button title={t('confirm')} loading={busy} disabled={!code.trim()} onPress={async () => { setBusy(true); setError(''); try { await referral(code); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } }}/>
    {['Destiny USA Code/Login OTP', 'Buying Agent Referral Code'].map(title => <View key={title} accessibilityRole="button" accessibilityState={{ disabled: true }} style={styles.decorativeButton}><AppText muted style={styles.decorativeLabel}>{title}</AppText></View>)}
    <Button title="Log out" variant="quiet" onPress={() => { void logout().catch(failure => Alert.alert(t('loadError'), failure.message)); }}/>
  </ScrollView></Screen>;
}

function RememberOption({ title, checked, onChange }: { title: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.rememberOption}><View style={[styles.checkbox, checked && styles.checkboxSelected]}>{checked && <Check size={12} strokeWidth={2.4} color={colors.background}/>}</View><AppText style={styles.rememberLabel}>{title}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  welcomeHero: { marginTop: 15, marginHorizontal: 18, paddingVertical: 27, paddingHorizontal: 22, borderRadius: 19, backgroundColor: '#F1EAF7', minHeight: 225, justifyContent: 'center', gap: 15 },
  welcomeCopy: { gap: 8 }, kicker: { color: '#9A79BB' }, welcomeHeadline: { fontSize: 28, lineHeight: 33, fontWeight: '800', letterSpacing: -1 }, welcomeDescription: { fontSize: 12, lineHeight: 18, color: '#806F8E' },
  welcomeActions: { paddingHorizontal: 18, paddingTop: 19, paddingBottom: 26, gap: 8 },
  form: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 26, gap: 15 }, formIntro: { gap: 8, marginBottom: 13 }, loginHeadline: { fontSize: 25, lineHeight: 32, fontWeight: '800', letterSpacing: -0.8 }, signupHeadline: { fontSize: 24, lineHeight: 31, fontWeight: '800', letterSpacing: -0.8 }, formDescription: { color: '#786D86', fontSize: 12, lineHeight: 18 },
  rememberOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -5, marginBottom: 9 },
  rememberOption: { flex: 1, minWidth: 130, minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 8 }, rememberLabel: { color: '#6D6174', fontSize: 11, lineHeight: 16, flexShrink: 1 },
  checkbox: { width: 17, height: 17, borderWidth: 1.5, borderColor: '#BFAFCB', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }, checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  referralForm: { paddingHorizontal: 18, paddingTop: 35, paddingBottom: 26, gap: 15 }, referralIntro: { gap: 12, marginBottom: 7 }, referralSymbol: { width: 62, height: 62, backgroundColor: '#F1EAF8', borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  decorativeButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface, opacity: 0.6 }, decorativeLabel: { fontSize: 12, textAlign: 'center' },
});
