import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useMobile } from '../../state/MobileContext';
import { api, captureApiSession, isApiSessionCurrent } from '../../services/api';
import { AppText, Button, Field, Header, Notice, Screen } from '../../ui/components';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors } from '../../ui/theme';
import { accountStyles, AccountAvatar, type AccountScreenProps } from './account-ui';

export function ProfileScreen({ navigation }: AccountScreenProps) {
  const { account, t, refreshAccount } = useMobile();
  const [firstName, setFirstName] = useState(account?.first_name ?? '');
  const [lastName, setLastName] = useState(account?.last_name ?? '');
  const [phone, setPhone] = useState(account?.phone ?? '');
  const [address, setAddress] = useState(account?.address ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const submitting = useRef(false);
  useEffect(() => { setFirstName(account?.first_name ?? ''); setLastName(account?.last_name ?? ''); setPhone(account?.phone ?? ''); setAddress(account?.address ?? ''); }, [account?.id]);
  const save = async () => {
    if (submitting.current) return;
    const session = captureApiSession();
    if (!session.token) return;
    submitting.current = true; setBusy(true); setError(''); setSaved(false);
    try { await api('/me', 'PATCH', { firstName, lastName, phone, address }); if (!isApiSessionCurrent(session)) return; await refreshAccount(); if (isApiSessionCurrent(session)) setSaved(true); }
    catch (failure) { if (isApiSessionCurrent(session)) setError((failure as Error).message); }
    finally { submitting.current = false; if (isApiSessionCurrent(session)) setBusy(false); }
  };
  return <Screen scroll={false}><Header title={t('yourProfile')} onBack={() => navigation.goBack()}/><ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[accountStyles.content, styles.formContent]}>
    <View style={styles.profileIntro}><AccountAvatar firstName={account?.first_name} lastName={account?.last_name} inverse/><View style={styles.profileCopy}><AppText variant="label">{[account?.first_name, account?.last_name].filter(Boolean).join(' ')}</AppText><AppText muted variant="caption">{t('profileIntro')}</AppText></View></View>
    {error && <Notice message={error} danger/>}{saved && <Notice message={t('updateSuccess')}/>}
    <Field label={t('lastName')} value={lastName} onChangeText={setLastName} maxLength={100} textContentType="familyName"/><Field label={t('firstName')} value={firstName} onChangeText={setFirstName} maxLength={100} textContentType="givenName"/>
    <View style={styles.emailField}><AppText style={styles.emailLabel}>{t('email')}</AppText><View style={styles.emailValue}><AppText selectable style={styles.emailText}>{account?.email ?? ''}</AppText></View></View>
    <Field label={t('phoneNumber')} value={phone} onChangeText={setPhone} maxLength={40} keyboardType="phone-pad" textContentType="telephoneNumber"/>
    <Field label={t('yourAddress')} value={address} onChangeText={setAddress} maxLength={1000} multiline textContentType="fullStreetAddress"/>
    <Button title={t('saveInformation')} onPress={() => { void save(); }} loading={busy} disabled={!firstName.trim()}/>
  </ScrollView><CommerceFooter/></Screen>;
}

const styles = StyleSheet.create({ emailField: { gap: 7 }, emailLabel: { fontSize: 11, lineHeight: 16, fontWeight: '600', color: '#675D70' }, emailValue: { minHeight: 45, borderWidth: 1, borderColor: '#E7E2EC', borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11 }, emailText: { fontSize: 14, lineHeight: 21, color: colors.muted }, formContent: { paddingTop: 0 }, profileIntro: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.softPurple, borderRadius: 13, padding: 14, marginBottom: 7 }, profileCopy: { flex: 1, gap: 4 } });
