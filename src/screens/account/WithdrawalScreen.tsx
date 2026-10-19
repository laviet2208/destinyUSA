import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useMobile } from '../../state/MobileContext';
import { api, captureApiSession, isApiSessionCurrent } from '../../services/api';
import { AppText, Button, Field, Header, Notice, Screen } from '../../ui/components';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { AvailableBalance } from '../../ui/AvailableBalance';
import { colors, touchTarget } from '../../ui/theme';
import { accountStyles, WalletAccess, type AccountScreenProps } from './account-ui';

export function WithdrawalScreen(props: AccountScreenProps) {
  return <WalletAccess navigation={props.navigation}><WithdrawalContent {...props}/></WalletAccess>;
}

function WithdrawalContent({ navigation }: AccountScreenProps) {
  const { account, t, refreshAccount, refresh } = useMobile();
  const [amount, setAmount] = useState('50');
  const [customAmount, setCustomAmount] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [email, setEmail] = useState(account?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const submitting = useRef(false);
  const number = Number(amount);
  const validAmount = /^\d+$/.test(amount) && Number.isSafeInteger(number) && number > 0;
  const validWallet = walletAddress.length >= 30 && walletAddress.length <= 256 && !/\s/.test(walletAddress);
  const send = async () => {
    if (submitting.current || !validAmount || !validWallet || !password || !email.trim()) return;
    const session = captureApiSession();
    if (!session.token) return;
    submitting.current = true;
    setBusy(true); setError('');
    const body = { direction: 'withdrawal', amount: number, walletAddress };
    const signature = JSON.stringify(body);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: Crypto.randomUUID() };
    try {
      await api('/auth/verify-password', 'POST', { email, password });
      if (!isApiSessionCurrent(session)) return;
      await api('/money-requests', 'POST', body, attempt.current.key);
      if (!isApiSessionCurrent(session)) return;
      setPassword(''); refresh(); void refreshAccount().catch(() => {}); Alert.alert(t('requestSent')); navigation.goBack();
    } catch (failure) { if (isApiSessionCurrent(session)) setError((failure as Error).message); }
    finally { submitting.current = false; if (isApiSessionCurrent(session)) setBusy(false); }
  };
  return <Screen scroll={false}><Header title={t('withdraw')} onBack={() => navigation.goBack()}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[accountStyles.content, styles.formContent]}>
    <AvailableBalance/>
    {error && <Notice message={error} danger/>}
    <View style={styles.amountGroup}><AppText style={styles.sectionTitle}>{t('amount')}</AppText><View style={styles.presets}>{[50, 100, 200].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: !customAmount && number === value }} onPress={() => { setCustomAmount(false); setAmount(String(value)); }} style={[styles.preset, !customAmount && number === value && styles.selected]}><AppText style={[styles.presetText, !customAmount && number === value && styles.selectedText]}>{value} USDT</AppText></Pressable>)}<Pressable accessibilityRole="radio" accessibilityState={{ checked: customAmount }} onPress={() => { setCustomAmount(true); setAmount(''); }} style={[styles.preset, customAmount && styles.selected]}><AppText style={[styles.presetText, customAmount && styles.selectedText]}>{t('othermoney')}</AppText></Pressable></View>{customAmount && <Field label={`${t('amount')} (USDT)`} value={amount} onChangeText={setAmount} keyboardType="number-pad" maxLength={16}/>}</View>
    <Field label={t('walletAddress')} value={walletAddress} onChangeText={setWalletAddress} autoCapitalize="none" autoCorrect={false} maxLength={256}/><AppText muted style={styles.walletHint}>{t('walletRule')}</AppText>
    <View style={styles.verification}><AppText style={styles.sectionTitle}>{t('verifyAccount')}</AppText><AppText muted>{t('checkEmailPassword')}</AppText><Field label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={254}/><Field label={t('password')} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false}/></View>
    <Button title={t('confirm')} onPress={() => { void send(); }} loading={busy} disabled={!validAmount || !validWallet || !password || !email.trim()}/>
  </ScrollView><CommerceFooter/></Screen>;
}

const styles = StyleSheet.create({
  formContent: { paddingTop: 0 },
  amountGroup: { gap: 10 }, sectionTitle: { fontSize: 13, lineHeight: 19, fontWeight: '800' },
  presets: { flexDirection: 'row', gap: 8 }, preset: { flex: 1, minWidth: 0, minHeight: touchTarget, paddingHorizontal: 6, paddingVertical: 10, borderWidth: 1, borderColor: '#E8E2ED', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, presetText: { fontSize: 11, lineHeight: 16, color: '#564C60', textAlign: 'center' }, selected: { borderColor: colors.primary, backgroundColor: '#F5F0FA' }, selectedText: { color: colors.primary, fontWeight: '700' },
  walletHint: { fontSize: 12, lineHeight: 18, marginTop: -8, marginBottom: 5 }, verification: { gap: 15, paddingTop: 20, borderTopWidth: 1, borderColor: colors.line },
});
