import { Pressable, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutGrid, ShoppingCart, UserRound } from 'lucide-react-native';
import { useMobile } from '../state/MobileContext';
import { AppText } from './components';
import { colors, touchTarget } from './theme';

export function CommerceFooter({ active }: { active?: 'main_page' | 'categories_page' | 'cart_page' | 'account_page' }) {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, carts } = useMobile();
  const items = [{ route: 'main_page', title: t('home'), Icon: Home }, { route: 'categories_page', title: t('categories'), Icon: LayoutGrid }, { route: 'cart_page', title: t('cart'), Icon: ShoppingCart }, { route: 'account_page', title: t('account'), Icon: UserRound }];
  return <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: 7 + insets.bottom, minHeight: 65 + insets.bottom }]}>{items.map(({ route, title, Icon }) => <Pressable key={route} accessibilityRole="tab" accessibilityState={{ selected: active === route }} accessibilityLabel={title} onPress={() => navigation.navigate('main_screen', { screen: route }, { pop: true })} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}><View><Icon size={21} strokeWidth={1.8} color={active === route ? colors.primary : '#9A94A1'}/>{route === 'cart_page' && carts.regular.length > 0 && <View style={styles.badge}><AppText style={styles.badgeText}>{carts.regular.length > 99 ? '99+' : carts.regular.length}</AppText></View>}</View><AppText style={[styles.label, active === route && styles.selected]}>{title}</AppText></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', minHeight: 65, paddingTop: 5, paddingHorizontal: 8, backgroundColor: colors.background, borderTopWidth: 1, borderColor: colors.line },
  tab: { flex: 1, minHeight: touchTarget, justifyContent: 'center', alignItems: 'center', gap: 4 },
  label: { fontSize: 10, lineHeight: 14, color: '#9A94A1', textAlign: 'center' }, selected: { color: colors.primary, fontWeight: '700' }, pressed: { opacity: 0.8 },
  badge: { position: 'absolute', top: -5, right: -9, backgroundColor: colors.danger, minWidth: 15, height: 15, paddingHorizontal: 3, borderRadius: 10 },
  badgeText: { color: colors.background, fontSize: 9, lineHeight: 15, textAlign: 'center' },
});
