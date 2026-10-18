import { useLayoutEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Eye, EyeOff, Gift, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react-native';
import { AppText, Button, Field, IconButton, Notice, Screen } from '../ui/components';
import { colors, touchTarget } from '../ui/theme';
import { BrandLogo } from '../ui/BrandLogo';
import { AuthBackdrop, AuthProductScene } from '../ui/AuthScenery';
import { authLayout, passwordPresentation } from '../ui/auth-layout';
import { useMobile } from '../state/MobileContext';

export function WelcomeScreen({ navigation }: any) {
  const { t, enterGuest } = useMobile();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const layout = authLayout(width, height, insets.top, insets.bottom);
  const [copyBottom, setCopyBottom] = useState(0);
  useLayoutEffect(() => { navigation.setOptions?.({ statusBarStyle: 'light' }); }, [navigation]);
  return <Screen scroll={false} surface="#271044"><StatusBar style="light"/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.welcomePage}>
      <View style={[styles.welcomeHero, { height: Math.max(layout.heroHeight, copyBottom + 180), paddingHorizontal: layout.padding }]}>
        <AuthBackdrop dark/>
        <View style={styles.heroTop}><BrandLogo light/><View style={styles.membersPill}><AppText style={styles.membersText}>DESTINY CLUB ✦</AppText></View></View>
        <View onLayout={event => { const { y, height: copyHeight } = event.nativeEvent.layout; setCopyBottom(previous => Math.abs(previous - y - copyHeight) > 1 ? y + copyHeight : previous); }} style={styles.heroCopy}>
          <View style={styles.heroEyebrow}><View style={styles.eyebrowLine}/><AppText style={styles.heroEyebrowText}>WELCOME TO DESTINY USA</AppText></View>
          <AppText accessibilityRole="header" style={[styles.welcomeHeadline, { fontSize: layout.headlineSize, lineHeight: layout.headlineSize * 1.025 }]}>{t('authFindMore')}{'\n'}<AppText style={[styles.welcomeHeadline, styles.heroAccent, { fontSize: layout.headlineSize, lineHeight: layout.headlineSize * 1.025 }]}>{t('authLoveMore')}</AppText></AppText>
          <AppText style={styles.welcomeDescription}>{t('authWelcomeCopy')}</AppText>
        </View>
        <AuthProductScene scale={layout.sceneScale}/>
        <View style={styles.heroTag}><Sparkles size={10} color="#E7D1F8"/><AppText style={styles.heroTagText}>A LITTLE EXTRAORDINARY</AppText></View>
      </View>
      <View style={[styles.welcomeActions, { paddingHorizontal: layout.padding + 2, paddingBottom: layout.bottomPadding }]}>
        <AppText style={styles.startCaption}>{t('authWelcomeCaption')}</AppText>
        <Button title={t('login')} onPress={() => navigation.navigate('login_screen')} style={styles.actionButton} textStyle={styles.buttonText} trailingIcon={<ArrowRight size={17} color="#FFFFFF"/>}/>
        <Button title={t('signup')} variant="secondary" onPress={() => navigation.navigate('signup_screen')} style={[styles.actionButton, styles.softButton]} textStyle={styles.buttonText} trailingIcon={<ArrowRight size={17} color={colors.primary}/>}/>
        <Button title={t('guest')} variant="quiet" onPress={enterGuest} style={styles.guestButton} textStyle={styles.guestText} trailingIcon={<ArrowUpRight size={14} color="#6D5A7F"/>}/>
        <AppText style={styles.welcomeFoot}>{t('authWelcomeFoot')}</AppText>
      </View>
    </ScrollView>
  </Screen>;
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
  const { width } = useWindowDimensions(); const insets = useSafeAreaInsets();
  const padding = authLayout(width, 0).padding;
  const submit = async () => { setBusy(true); setError(''); try { await login({ email, password, remember, savePassword }); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } };
  return <Screen scroll={false}><StatusBar style="dark"/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formPage}>
    <AuthHeader onBack={() => navigation.goBack()} backLabel={t('back')} chip="MEMBER ACCESS" eyebrow={t('welcomeBack')} title={t('authLoginLead')} accent={t('authLoginAccent')} description={t('authLoginCopy')} padding={padding}/>
    <View style={[styles.form, { paddingHorizontal: padding, paddingBottom: Math.max(26, insets.bottom + 18) }]}>
      <Field {...fieldAppearance} label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="username" placeholder="you@example.com" leading={<Mail size={17} color="#8C7D9D"/>}/>
      <Field {...fieldAppearance} label={t('password')} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="current-password" textContentType="password" placeholder={t('password')} leading={<LockKeyhole size={17} color="#8C7D9D"/>} trailing={<IconButton plain label={t(visible ? 'hidePassword' : 'showPassword')} onPress={() => setVisible(!visible)}>{visible ? <EyeOff size={18} color="#8C7B9C"/> : <Eye size={18} color="#8C7B9C"/>}</IconButton>}/>
      <View style={styles.rememberOptions}><RememberOption title={t('rememberSession')} checked={remember} onChange={setRemember}/><RememberOption title={t('rememberPassword')} checked={savePassword} onChange={setSavePassword}/></View>
      {error && <Notice message={error} danger/>}
      <Button title={t('login')} onPress={() => void submit()} disabled={!email.trim() || !password} loading={busy} style={styles.actionButton} textStyle={styles.buttonText} trailingIcon={<ArrowRight size={17} color="#FFFFFF"/>}/>
      <View style={styles.divider}><View style={styles.dividerLine}/><AppText style={styles.dividerText}>{t('authNewHere')}</AppText><View style={styles.dividerLine}/></View>
      <Button title={t('signup')} variant="secondary" onPress={() => navigation.navigate('signup_screen')} style={[styles.actionButton, styles.outlineButton]} textStyle={styles.buttonText}/>
      <View style={styles.securityNote}><View style={styles.securityIcon}><ShieldCheck size={18} color="#6C329F"/></View><View style={styles.securityCopy}><AppText style={styles.securityTitle}>{t('authSecurityTitle')}</AppText><AppText style={styles.securityDescription}>{t('authSecurityCopy')}</AppText></View></View>
    </View>
  </ScrollView></Screen>;
}

export function SignupScreen({ navigation }: any) {
  const { t, signup } = useMobile();
  const [firstName, setFirstName] = useState(''); const [lastName, setLastName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState(''); const [visible, setVisible] = useState(false); const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const { width } = useWindowDimensions(); const insets = useSafeAreaInsets(); const padding = authLayout(width, 0).padding;
  const strength = passwordPresentation(password);
  const submit = async () => {
    if (password !== confirmation) { setError(t('authPasswordMismatch')); return; }
    setBusy(true); setError(''); try { await signup({ firstName, lastName, email, password }); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  return <Screen scroll={false}><StatusBar style="dark"/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formPage}>
    <AuthHeader signup onBack={() => navigation.goBack()} backLabel={t('back')} chip="JOIN DESTINY" eyebrow="YOUR DESTINY STARTS HERE" title={t('authSignupLead')} accent={t('authSignupAccent')} description={t('authSignupCopy')} padding={padding}/>
    <View style={[styles.form, styles.signupForm, { paddingHorizontal: padding, paddingBottom: Math.max(26, insets.bottom + 18) }]}>
      <View style={styles.nameRow}><Field {...fieldAppearance} frameStyle={styles.compactFrame} label={t('firstName')} value={firstName} onChangeText={setFirstName} autoComplete="given-name" placeholder={t('firstName')} containerStyle={styles.nameField}/><Field {...fieldAppearance} frameStyle={styles.compactFrame} label={t('lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name" placeholder={t('lastName')} containerStyle={styles.nameField}/></View>
      <Field {...fieldAppearance} frameStyle={styles.compactFrame} label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="you@example.com" leading={<Mail size={17} color="#8C7D9D"/>}/>
      <View><Field {...fieldAppearance} frameStyle={styles.compactFrame} label={t('password')} value={password} onChangeText={setPassword} secureTextEntry={!visible} autoComplete="new-password" textContentType="newPassword" placeholder={t('authPasswordHint')} leading={<LockKeyhole size={17} color="#8C7D9D"/>} trailing={<IconButton plain label={t(visible ? 'hidePassword' : 'showPassword')} onPress={() => setVisible(!visible)}>{visible ? <EyeOff size={18} color="#8C7B9C"/> : <Eye size={18} color="#8C7B9C"/>}</IconButton>}/>
        <View accessibilityElementsHidden style={styles.passwordMeter}>{[0, 1, 2, 3].map(position => <View key={position} style={[styles.meterPart, position < strength && { backgroundColor: ['#ECE7F0', '#E56B75', '#EAB260', '#8E6EC7', '#46A785'][strength] }]}/>)}</View><AppText style={styles.strengthCopy}>{t('authPasswordHint')}</AppText>
      </View>
      <Field {...fieldAppearance} frameStyle={styles.compactFrame} label={t('authConfirmPassword')} value={confirmation} onChangeText={value => { setConfirmation(value); if (error === t('authPasswordMismatch')) setError(''); }} secureTextEntry={!confirmationVisible} autoComplete="new-password" textContentType="newPassword" placeholder={t('authConfirmPassword')} leading={<LockKeyhole size={17} color="#8C7D9D"/>} trailing={<IconButton plain label={t(confirmationVisible ? 'hidePassword' : 'showPassword')} onPress={() => setConfirmationVisible(!confirmationVisible)}>{confirmationVisible ? <EyeOff size={18} color="#8C7B9C"/> : <Eye size={18} color="#8C7B9C"/>}</IconButton>}/>
      {error && <Notice message={error} danger/>}
      <Button title={t('signup')} onPress={() => void submit()} loading={busy} disabled={!firstName.trim() || !email.trim() || !password || !confirmation} style={[styles.actionButton, styles.signupSubmit]} textStyle={styles.buttonText} trailingIcon={<ArrowRight size={17} color="#FFFFFF"/>}/>
      <View style={styles.accountSwitch}><AppText style={styles.accountSwitchText}>{t('authAlreadyMember')}</AppText><Pressable accessibilityRole="button" onPress={() => navigation.navigate('login_screen')} style={styles.accountSwitchButton}><AppText style={styles.accountSwitchLink}>{t('login')}</AppText></Pressable></View>
    </View>
  </ScrollView></Screen>;
}

export function ReferralScreen() {
  const { t, referral, logout, catalog } = useMobile(); const [code, setCode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const { width } = useWindowDimensions(); const insets = useSafeAreaInsets(); const padding = authLayout(width, 0).padding;
  return <Screen scroll={false}><StatusBar style="dark"/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.formPage}>
    <AuthHeader chip="DESTINY USA" eyebrow={t('verifyAccount')} title={t('enterReferral')} description={t('referralDescription')} padding={padding}/>
    <View style={[styles.form, { paddingHorizontal: padding, paddingBottom: Math.max(26, insets.bottom + 18) }]}>
      <View accessibilityElementsHidden style={styles.referralSymbol}><Gift size={28} strokeWidth={1.5} color={colors.primary}/></View>
      <Field {...fieldAppearance} label={t('referral')} value={code} onChangeText={setCode} autoCapitalize="none" leading={<Gift size={17} color="#8C7D9D"/>}/>
      {error && <Notice message={error} danger/>}
      <Button title={t('confirm')} loading={busy} disabled={!code.trim()} style={styles.actionButton} textStyle={styles.buttonText} onPress={async () => { setBusy(true); setError(''); try { await referral(code); } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); } }}/>
      {catalog.showReferralButtons && ['Destiny USA Code/Login OTP', 'Buying Agent Referral Code'].map(title => <Button key={title} title={title} variant="secondary" onPress={() => {}} style={[styles.actionButton, styles.outlineButton]} textStyle={styles.buttonText}/>)}
      <Button title="Log out" variant="quiet" onPress={() => { void logout().catch(failure => Alert.alert(t('loadError'), failure.message)); }}/>
    </View>
  </ScrollView></Screen>;
}

function AuthHeader({ onBack, backLabel, chip, eyebrow, title, accent, description, padding, signup = false }: { onBack?: () => void; backLabel?: string; chip: string; eyebrow: string; title: string; accent?: string; description: string; padding: number; signup?: boolean }) {
  return <View style={[styles.formTop, signup && styles.signupTop, { paddingHorizontal: padding }]}><AuthBackdrop/>
    <View style={styles.formNav}>{onBack ? <Pressable accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} style={styles.backTarget}><View style={styles.backFace}><ArrowLeft size={18} color={colors.primary}/></View></Pressable> : <View style={styles.backTarget}/>}
      <BrandLogo compact/><View style={styles.miniChip}><AppText numberOfLines={1} style={styles.chipText}>{chip}</AppText></View>
    </View>
    <View style={[styles.formTitleWrap, signup && styles.signupTitleWrap]}><AppText style={styles.formEyebrow}>{eyebrow}</AppText><AppText accessibilityRole="header" style={[styles.formTitle, signup && styles.signupTitle]}>{title}{accent && <AppText style={[styles.formTitle, styles.titleAccent, signup && styles.signupTitle]}>{accent}</AppText>}</AppText><AppText style={styles.formDescription}>{description}</AppText></View>
  </View>;
}

function RememberOption({ title, checked, onChange }: { title: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={title} accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.rememberOption}><View style={[styles.checkbox, checked && styles.checkboxSelected]}>{checked && <Check size={12} strokeWidth={2.4} color={colors.background}/>}</View><AppText style={styles.rememberLabel}>{title}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  welcomePage: { flexGrow: 1, backgroundColor: '#FFFFFF' },
  welcomeHero: { overflow: 'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingTop: 18, backgroundColor: '#271044' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, zIndex: 2 },
  membersPill: { borderWidth: 1, borderColor: '#FFFFFF3A', borderRadius: 30, paddingVertical: 8, paddingHorizontal: 10 }, membersText: { color: '#E7D6F4', fontSize: 9, lineHeight: 12, letterSpacing: 0.72, fontWeight: '700' },
  heroCopy: { marginTop: 25, zIndex: 2 }, heroEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, eyebrowLine: { width: 17, height: 1, backgroundColor: '#BB8CF3' }, heroEyebrowText: { color: '#CBB2E3', fontSize: 9, lineHeight: 14, letterSpacing: 1.98, fontWeight: '800' },
  welcomeHeadline: { color: '#FFFFFF', fontWeight: '900', letterSpacing: -2, marginTop: 11, marginBottom: 12, maxWidth: 300 }, heroAccent: { color: '#E5C2FF' }, welcomeDescription: { color: '#D5C8E0', fontSize: 12, lineHeight: 19.8, maxWidth: 260 },
  heroTag: { position: 'absolute', right: 18, bottom: 187, borderRadius: 100, borderWidth: 1, borderColor: '#D8A9EF55', backgroundColor: '#11082280', paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 3 }, heroTagText: { color: '#E7D1F8', fontSize: 8, lineHeight: 12, fontWeight: '700' },
  welcomeActions: { flexGrow: 1, paddingTop: 20, gap: 9 }, startCaption: { color: '#746680', fontSize: 11, lineHeight: 17, marginBottom: 6 }, actionButton: { minHeight: 52, borderRadius: 13, paddingVertical: 13 }, buttonText: { fontSize: 14, lineHeight: 20, fontWeight: '800' }, softButton: { backgroundColor: '#F0E9F8' }, guestButton: { minHeight: 44, paddingVertical: 9, alignSelf: 'center' }, guestText: { color: '#6D5A7F', fontSize: 12, fontWeight: '800' }, welcomeFoot: { color: '#A29AAC', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 'auto', paddingTop: 3 },
  formPage: { flexGrow: 1, backgroundColor: '#FFFFFF' }, formTop: { paddingTop: 10, paddingBottom: 25, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, backgroundColor: '#F7F2FD', overflow: 'hidden' }, signupTop: { paddingBottom: 20 },
  formNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }, backTarget: { width: touchTarget, height: touchTarget, justifyContent: 'center', alignItems: 'flex-start' }, backFace: { width: 35, height: 35, borderWidth: 1, borderColor: '#E5DAED', backgroundColor: '#FFFFFF', borderRadius: 11, justifyContent: 'center', alignItems: 'center' }, miniChip: { maxWidth: 105, borderWidth: 1, borderColor: '#E8DFF0', backgroundColor: '#FFFFFF', borderRadius: 30, paddingVertical: 7, paddingHorizontal: 10, flexShrink: 1 }, chipText: { color: '#765A8F', fontSize: 8, lineHeight: 12, fontWeight: '800' },
  formTitleWrap: { paddingTop: 19 }, signupTitleWrap: { paddingTop: 12 }, formEyebrow: { fontSize: 10, lineHeight: 15, letterSpacing: 1.8, fontWeight: '800', color: '#9675BB', textTransform: 'uppercase' }, formTitle: { fontSize: 32, lineHeight: 34, letterSpacing: -1.9, fontWeight: '900', color: colors.text, marginVertical: 8 }, signupTitle: { fontSize: 30, lineHeight: 33 }, titleAccent: { color: '#7940B5' }, formDescription: { fontSize: 11.5, lineHeight: 18.4, color: '#777087', maxWidth: 290 },
  form: { paddingTop: 20, gap: 14 }, signupForm: { paddingTop: 17, gap: 11 }, fieldLabel: { color: '#3A3048', fontSize: 12, lineHeight: 17, fontWeight: '700' }, fieldFrame: { minHeight: 51, borderColor: '#E5DEEA', borderRadius: 12, paddingLeft: 13, paddingRight: 3, gap: 10 }, compactFrame: { minHeight: 47, borderColor: '#E5DEEA', borderRadius: 12, paddingLeft: 13, paddingRight: 3, gap: 10 }, fieldInput: { minHeight: 45, fontSize: 13, lineHeight: 19, color: '#241831', paddingHorizontal: 0, paddingVertical: 11 },
  rememberOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -4, marginBottom: -4 }, rememberOption: { minHeight: touchTarget, flex: 1, minWidth: 124, flexDirection: 'row', alignItems: 'center', gap: 8 }, rememberLabel: { color: '#6A6074', fontSize: 11, lineHeight: 16, fontWeight: '600', flexShrink: 1 }, checkbox: { width: 17, height: 17, borderWidth: 1.5, borderColor: '#CFC3DD', borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }, checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 1 }, dividerLine: { height: 1, backgroundColor: '#EEE8F1', flex: 1 }, dividerText: { fontSize: 10, lineHeight: 16, color: '#A9A0B0' }, outlineButton: { backgroundColor: '#FFFFFF', borderColor: '#D8C8E8', borderWidth: 1 },
  securityNote: { marginTop: 3, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: '#E9DDF2', backgroundColor: '#FCF9FE', flexDirection: 'row', gap: 9, alignItems: 'center' }, securityIcon: { width: 31, height: 31, borderRadius: 10, backgroundColor: '#F0E4F9', alignItems: 'center', justifyContent: 'center' }, securityCopy: { flex: 1, gap: 2 }, securityTitle: { fontSize: 10.7, lineHeight: 15, fontWeight: '700', color: '#4D3370' }, securityDescription: { fontSize: 10, lineHeight: 15, color: '#9687A6' },
  nameRow: { flexDirection: 'row', gap: 10 }, nameField: { flex: 1, minWidth: 0 }, passwordMeter: { flexDirection: 'row', gap: 4, marginTop: 9, marginBottom: 3 }, meterPart: { height: 3, flex: 1, backgroundColor: '#ECE7F0', borderRadius: 2 }, strengthCopy: { fontSize: 9.5, lineHeight: 15, color: '#9A8E9F' }, signupSubmit: { marginTop: 3 }, accountSwitch: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center', justifyContent: 'center', paddingTop: 1 }, accountSwitchText: { fontSize: 12, lineHeight: 19, color: '#8B8293' }, accountSwitchButton: { minHeight: touchTarget, justifyContent: 'center' }, accountSwitchLink: { color: '#512087', fontSize: 12, lineHeight: 19, fontWeight: '800' },
  referralSymbol: { width: 58, height: 58, borderRadius: 17, backgroundColor: '#F0E4F9', alignItems: 'center', justifyContent: 'center' },
});

const fieldAppearance = { labelStyle: styles.fieldLabel, frameStyle: styles.fieldFrame, style: styles.fieldInput, placeholderTextColor: '#B6ADBF' };
