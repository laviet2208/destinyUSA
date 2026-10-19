import { useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Bell, ChevronRight, CircleUserRound, Gift, Package, Wallet, Globe2, LogOut, MessageCircle, ShoppingCart, Ticket, Trash2 } from 'lucide-react-native';
import { useMobile } from '../../state/MobileContext';
import { api, captureApiSession, isApiSessionCurrent } from '../../services/api';
import { money } from '../../services/commerce';
import { languages } from '../../ui/strings';
import { AppText, Button, Header, IconButton, Notice, Screen } from '../../ui/components';
import { BottomSheet, PageSection } from '../../ui/commerce';
import { colors } from '../../ui/theme';
import { AppInfoFooter } from '../../ui/AppInfoFooter';
import { AccountIdentityCard } from '../../ui/AccountIdentityCard';
import { accountStyles, MenuRow, type AccountScreenProps } from './account-ui';

export function AccountScreen({ navigation }: AccountScreenProps) {
  const { account, t, language, setLanguage, catalog, logout } = useMobile();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const run = async (operation: () => Promise<void>) => {
    if (submitting.current) return;
    const session = captureApiSession();
    submitting.current = true; setBusy(true); setError('');
    try { await operation(); }
    catch (failure) { if (isApiSessionCurrent(session)) setError((failure as Error).message); }
    finally { submitting.current = false; if (isApiSessionCurrent(session)) setBusy(false); }
  };
  const deleteRequest = () => {
    const session = captureApiSession();
    if (!session.token) return;
    Alert.alert(t('deleteRequest'), t('deleteRequestConfirm'), [{ text: t('cancel'), style: 'cancel' }, { text: t('confirm'), style: 'destructive', onPress: () => {
      if (!isApiSessionCurrent(session)) return;
      void run(async () => {
        if (!isApiSessionCurrent(session)) return;
        const result = await api<{ message: string }>('/me/delete-request', 'POST');
        if (!isApiSessionCurrent(session)) return;
        Alert.alert(t('deleteRequest'), result.message); await logout();
      });
    } }]);
  };
  return <Screen scroll={false}>
    <Header title={t('account')} action={<IconButton label={t('notifications')} onPress={() => navigation.navigate('notice_page')}><Bell size={20} color={colors.text}/></IconButton>}/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      {error && <View style={accountStyles.inset}><Notice message={error} danger/></View>}
      {!account ? <View style={styles.guest}><CircleUserRound size={48} strokeWidth={1.2} color={colors.primary}/><AppText variant="heading">{t('guestWelcome')}</AppText><Button title={t('login')} onPress={() => navigation.navigate('welcome_screen')}/></View> : <>
        <AccountIdentityCard account={account} referralLabel={t('referral')} editLabel={t('profile')} onEdit={() => navigation.navigate('account_info_screen')}/>
        <View style={styles.quickActions}><Pressable accessibilityRole="button" onPress={() => navigation.navigate('history_order_screen')} style={styles.quickAction}><Package size={21} strokeWidth={1.6} color={colors.primary}/><AppText style={styles.quickLabel}>{t('orderNumber')}</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => navigation.navigate('voucher_page')} style={styles.quickAction}><Ticket size={21} strokeWidth={1.6} color={colors.primary}/><AppText style={styles.quickLabel}>{t('voucher')}</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => navigation.navigate('customer_care')} style={styles.quickAction}><MessageCircle size={21} strokeWidth={1.6} color={colors.primary}/><AppText style={styles.quickLabel}>{t('supportLabel')}</AppText></Pressable></View>
        {catalog.showWallet && <Pressable accessibilityRole="button" onPress={() => navigation.navigate('wallet_info')} style={styles.balance}><Wallet size={23} strokeWidth={1.5} color={colors.text}/><View style={accountStyles.flex}><AppText style={styles.balanceLabel}>{t('balance')}</AppText><AppText style={styles.balanceAmount}>{money(account.balance)} USDT</AppText></View><ChevronRight size={18} color={colors.text}/></Pressable>}
        <PageSection style={styles.menuSection}><AppText variant="overline" style={styles.groupTitle}>{t('personal')}</AppText>
          <MenuRow title={t('yourProfile')} icon={<CircleUserRound size={19} color={colors.primary}/>} onPress={() => navigation.navigate('account_info_screen')}/>
          <MenuRow title={t('historyOrders')} icon={<Package size={19} color={colors.primary}/>} onPress={() => navigation.navigate('history_order_screen')}/>
          <MenuRow title={t('notification')} icon={<Bell size={19} color={colors.primary}/>} onPress={() => navigation.navigate('notice_page')}/>
          <MenuRow title={t('voucherWallet')} icon={<Ticket size={19} color={colors.primary}/>} onPress={() => navigation.navigate('voucher_page')}/>
          <MenuRow title={t('voucherhistory')} icon={<Gift size={19} color={colors.primary}/>} onPress={() => navigation.navigate('history_voucher_screen')}/>
          <MenuRow title={t('yourCart')} icon={<ShoppingCart size={19} color={colors.primary}/>} onPress={() => navigation.navigate('cart_page')}/>
        </PageSection>
      </>}
      <PageSection style={styles.menuSection}><AppText variant="overline" style={styles.groupTitle}>{t('settingsSupport')}</AppText>
        {account && <MenuRow title={t('customerCare')} icon={<MessageCircle size={19} color={colors.primary}/>} onPress={() => navigation.navigate('customer_care')}/>}
        {catalog.showAboutApp && <MenuRow title={t('aboutApp')} icon={<CircleUserRound size={19} color={colors.primary}/>} onPress={() => navigation.navigate('about_screen')}/>}
        <MenuRow title={t('language')} value={languages.find(item => item.id === language)?.name} icon={<Globe2 size={19} color={colors.primary}/>} onPress={() => setLanguageOpen(true)}/>
        {account && <><MenuRow title={t('logOut')} icon={<LogOut size={19} color={colors.primary}/>} onPress={() => { void run(logout); }}/><MenuRow title={t('requestAccountDeletion')} icon={<Trash2 size={19} color={colors.danger}/>} onPress={deleteRequest} danger/></>}
      </PageSection>
      <AppInfoFooter/>
    </ScrollView>
    <BottomSheet visible={languageOpen} title={t('language')} closeLabel={t('close')} onClose={() => setLanguageOpen(false)} busy={busy}>{languages.map(item => <Pressable key={item.id} accessibilityRole="radio" accessibilityState={{ checked: language === item.id, disabled: busy }} disabled={busy} onPress={() => { void run(async () => { const session = captureApiSession(); await setLanguage(item.id); if (isApiSessionCurrent(session)) setLanguageOpen(false); }); }} style={styles.languageRow}><AppText style={styles.languageName}>{item.name}</AppText><View style={[styles.radio, language === item.id && styles.radioSelected]}>{language === item.id && <View style={styles.radioDot}/>}</View></Pressable>)}</BottomSheet>
  </Screen>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 0 },
  quickActions: { flexDirection: 'row', marginHorizontal: 18, marginBottom: 13, gap: 10 }, quickAction: { flex: 1, minHeight: 70, paddingVertical: 13, paddingHorizontal: 4, backgroundColor: colors.softPurple, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 8 }, quickLabel: { textAlign: 'center', fontSize: 11, lineHeight: 16, fontWeight: '700', color: colors.primary },
  balance: { marginHorizontal: 18, marginBottom: 8, backgroundColor: '#F5F0FA', borderWidth: 1, borderColor: '#E9E0F0', borderRadius: 13, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, balanceLabel: { color: colors.muted, fontSize: 10, lineHeight: 15 }, balanceAmount: { color: colors.primary, fontSize: 23, lineHeight: 30, fontWeight: '800', letterSpacing: -0.8 },
  menuSection: { gap: 0, paddingBottom: 0 }, groupTitle: { color: '#9A79BB', paddingBottom: 7 }, guest: { gap: 16, padding: 18, paddingVertical: 30 },
  languageRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 15, borderBottomWidth: 1, borderColor: colors.line }, languageName: { flex: 1, fontSize: 12, fontWeight: '600' },
  radio: { width: 17, height: 17, borderWidth: 1.5, borderColor: '#BFAFCB', borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: colors.primary }, radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.primary },
});
