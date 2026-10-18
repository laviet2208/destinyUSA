import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme, createNavigationContainerRef, getFocusedRouteNameFromRoute, useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, LayoutGrid, ShoppingCart, UserRound } from 'lucide-react-native';
import { MobileProvider, useMobile } from './src/state/MobileContext';
import { Button, EmptyState, LoadingState, Screen, UiDirection, UiLanguage } from './src/ui/components';
import { colors } from './src/ui/theme';
import { MotionProvider, TabMotion, useMotionEnabled } from './src/ui/motion';
import { directionFor } from './src/ui/strings';
import { WelcomeScreen, LoginScreen, SignupScreen, ReferralScreen } from './src/screens/AuthScreens';
import { HomeScreen } from './src/screens/catalog/HomeScreen';
import { CatalogScreen } from './src/screens/catalog/CatalogScreen';
import { AboutScreen } from './src/screens/account/AboutScreen';
import { FlashSaleScreen } from './src/screens/catalog/FlashSaleScreen';
import { FlashSaleAccess } from './src/screens/catalog/FlashSaleAccess';
import { enterFlashSale } from './src/services/flash-sale-access';
import { ProductScreen, ProductPurchaseSheet } from './src/screens/catalog/ProductScreen';
import { CartScreen, CheckoutScreen } from './src/screens/CartScreens';
import { AccountScreen, ProfileScreen, WalletScreen, OrderHistoryScreen, OrderDetailScreen, NotificationsScreen, VouchersScreen, VoucherHistoryScreen, SupportScreen, WithdrawalScreen } from './src/screens/account';
import { ChatImageScreen, ChatScreen } from './src/screens/ChatScreen';
import { useResource } from './src/hooks/useResource';
import { eligibleVariant } from './src/services/commerce';
import { api } from './src/services/api';
import { initializePush, stopPush } from './src/services/push';
import type { Channel, Product } from './src/types';
import { DesktopNotice } from './src/ui/DesktopNotice';
import { isDesktopWeb } from './src/services/desktop-access';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const navigationRef = createNavigationContainerRef<any>();

function HomeRoute({ navigation }: any) {
  const mobile = useMobile(); const { catalog, t, carts } = mobile;
  useFocusEffect(useCallback(() => { mobile.refresh(); }, [mobile.refresh]));
  const product = (id: string, channel: Channel) => navigation.navigate('product_view_screen', { id, channel });
  const quickAdd = (id: string, channel: Channel) => navigation.navigate('product_view_screen', { id, channel, purchaseAction: 'cart' });
  const openFlashSale = () => enterFlashSale(catalog.flashSchedule, () => navigation.navigate('flash_sale_screen'), () => Alert.alert(t('flashSale'), t('saleNotStarted')));
  return <HomeScreen t={t} loading={mobile.loading} refreshing={mobile.loading} error={mobile.error} onRefresh={mobile.refresh} flashSchedule={catalog.flashSchedule} banners={catalog.banners} categories={catalog.types} topProducts={catalog.topIds.map(id => catalog.products.find(item => item.id === id)).filter((item): item is Product => Boolean(item))} flashProducts={catalog.flashIds.map(id => catalog.products.find(item => item.id === id)).filter((item): item is Product => Boolean(item))} directorySections={catalog.directoryIds.map(id => ({ id, name: catalog.directories.find(item => item.id === id)?.name ?? '', products: catalog.products.filter(item => item.directory_id === id) })).filter(section => Boolean(section.name))} cartCount={carts.regular.reduce((sum, item) => sum + item.quantity, 0)} onCart={() => navigation.navigate('cart_page')} onNotifications={() => navigation.navigate('notice_page')} onFeatured={() => navigation.navigate('search_screen', { productIds: catalog.topIds, title: t('topProducts') })} onSearch={() => navigation.navigate('search_screen')} onFlashSale={openFlashSale} onAllCategories={() => navigation.navigate('categories_page')} onCategory={(id, kind) => navigation.navigate(kind === 'type' ? 'view_all_product_in_type' : 'view_all_product_indirectory', { id, kind })} onProduct={product} onQuickAdd={quickAdd} onBanner={banner => banner.productId ? product(banner.productId, 'regular') : Alert.alert(t('advertisement'), t('thisAdsIsNotHaveProductToGo'))}/>;
}
function CatalogRoute({ navigation, route }: any) {
  const { catalog, loading, error, refresh, t } = useMobile(); const [search, setSearch] = useState('');
  const categoryMode = route.name === 'view_all_type_screen' || route.name === 'categories_page'; const kind = route.params?.kind ?? 'type';
  const products = route.params?.productIds ? catalog.products.filter(item => route.params.productIds.includes(item.id)) : catalog.products;
  const title = categoryMode ? t('categories') : route.params?.title ?? t('products');
  return <CatalogScreen key={`${route.key}:${route.params?.id ?? ''}`} title={title} productCategories={catalog.types} categories={categoryMode ? catalog.types : undefined} filterCategories={kind === 'type' ? catalog.types : catalog.directories} initialCategoryId={route.params?.id} products={products} categoryKind={kind} t={t} loading={loading} refreshing={loading} error={error} onRefresh={refresh} onBack={route.name === 'categories_page' ? undefined : () => navigation.goBack()} onCart={() => navigation.navigate('main_screen', { screen: 'cart_page' }, { pop: true })} onProduct={(id, channel) => navigation.navigate('product_view_screen', { id, channel })} onQuickAdd={(id, channel) => navigation.navigate('product_view_screen', { id, channel, purchaseAction: 'cart' })} onCategory={(id, selectedKind) => navigation.navigate(selectedKind === 'type' ? 'view_all_product_in_type' : 'view_all_product_indirectory', { id, kind: selectedKind })} searchValue={search} onSearchChange={setSearch}/>;
}
function FlashRoute({ navigation }: any) {
  const { t } = useMobile();
  return <FlashSaleAccess navigation={navigation} t={t}><FlashContent navigation={navigation}/></FlashSaleAccess>;
}
function FlashContent({ navigation }: any) {
  const { catalog, t, loading, error, refresh, carts } = useMobile();
  return <FlashSaleScreen schedule={catalog.flashSchedule} products={catalog.flashIds.map(id => catalog.products.find(item => item.id === id)).filter((item): item is Product => Boolean(item))} t={t} loading={loading} refreshing={loading} error={error} onRefresh={refresh} onBack={() => navigation.goBack()} onCart={() => navigation.navigate('cart_sale_screen')} cartCount={carts.flashsale.reduce((sum, item) => sum + item.quantity, 0)} onProduct={(id, channel) => navigation.navigate('product_view_screen', { id, channel })} onQuickAdd={(id, channel) => navigation.navigate('product_view_screen', { id, channel, purchaseAction: 'cart' })}/>;
}
function ProductRoute({ route, navigation }: any) {
  const { account, t, addToCart, catalog } = useMobile(); const channel: Channel = route.params?.channel ?? 'regular';
  const resource = useResource<Product>(`${account ? '' : '/public'}/products/${encodeURIComponent(route.params.id)}`);
  const [selectedVariantId, setVariant] = useState(''); const [quantity, setQuantity] = useState(1); const [action, setAction] = useState<'cart' | 'buyNow' | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { setVariant(resource.data?.variants[0]?.id ?? ''); setQuantity(1); }, [resource.data?.id]);
  const variant = resource.data?.variants.find(item => item.id === selectedVariantId);
  const quickAddOpened = useRef(false);
  useEffect(() => {
    if (!resource.data || route.params?.purchaseAction !== 'cart' || quickAddOpened.current) return;
    quickAddOpened.current = true;
    if (!account) { navigation.navigate('welcome_screen'); return; }
    setError(''); setAction('cart');
  }, [resource.data?.id, route.params?.purchaseAction, account?.id, navigation]);
  const confirm = async () => {
    if (!resource.data || !variant || busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'cart') { await addToCart(channel, resource.data, variant, quantity); setAction(null); Alert.alert(t('cart'), t('addedToCart')); }
      else { const latest = await api<Product>(`/products/${encodeURIComponent(resource.data.id)}`); const current = latest.variants.find(item => item.id === selectedVariantId); if (!current || !eligibleVariant(current, quantity)) throw new Error(t('notEnoughStock')); setAction(null); navigation.navigate('cart_for_buy_now_screen', { channel, items: [{ product: latest, variant: current, quantity }] }); }
    } catch (failure) { setError((failure as Error).message); } finally { setBusy(false); }
  };
  return <><ProductScreen t={t} product={resource.data ?? undefined} categoryName={catalog.types.find(category => category.id === resource.data?.type_id)?.name} channel={channel} onCart={() => channel === 'flashsale' ? navigation.navigate('cart_sale_screen') : navigation.navigate('main_screen', { screen: 'cart_page' }, { pop: true })} selectedVariantId={selectedVariantId} quantity={quantity} onSelectVariant={id => { setVariant(id); setQuantity(1); }} onQuantityChange={value => setQuantity(Math.max(1, Math.min(value, variant?.inventory ?? 0, 100)))} busy={busy} loading={resource.loading} error={resource.error} onRefresh={resource.refresh} onBack={() => navigation.goBack()} onOpenPurchase={selectedAction => { if (!account) { navigation.navigate('welcome_screen'); return; } setError(''); setAction(selectedAction); }}/>{resource.data && <ProductPurchaseSheet t={t} visible={Boolean(action)} product={resource.data} action={action ?? 'cart'} channel={channel} selectedVariantId={selectedVariantId} quantity={quantity} onSelectVariant={id => { setVariant(id); setQuantity(1); }} onQuantityChange={value => setQuantity(Math.max(1, Math.min(value, variant?.inventory ?? 0, 100)))} onClose={() => { if (!busy) setAction(null); }} onConfirm={() => void confirm()} busy={busy} error={error} disabled={!variant || !eligibleVariant(variant, quantity)}/> }</>;
}
function MainTabs() {
  const { t, carts } = useMobile();
  const insets = useSafeAreaInsets();
  const icons = { main_page: Home, categories_page: LayoutGrid, account_page: UserRound, cart_page: ShoppingCart };
  return <Tab.Navigator screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.line, paddingTop: 5, paddingHorizontal: 8, paddingBottom: 7 + insets.bottom, height: 65 + insets.bottom }, tabBarBadgeStyle: { backgroundColor: colors.danger, color: colors.background, fontSize: 9, minWidth: 15, height: 15, lineHeight: 15 }, tabBarLabelStyle: { fontSize: 10, fontWeight: '600' }, tabBarIcon: ({ color, focused }) => { const Icon = icons[route.name as keyof typeof icons]; return <View style={{ minWidth: 46, height: 30, alignItems: 'center', justifyContent: 'center' }}><TabMotion active={focused}><Icon size={22} color={color} strokeWidth={1.8}/></TabMotion></View>; } })}><Tab.Screen name="main_page" component={HomeRoute} options={{ title: t('home') }}/><Tab.Screen name="categories_page" component={CatalogRoute} options={{ title: t('categories') }}/><Tab.Screen name="cart_page" component={CartScreen} options={{ title: t('cart'), tabBarBadge: carts.regular.length || undefined }}/><Tab.Screen name="account_page" component={AccountScreen} options={{ title: t('account') }}/></Tab.Navigator>;
}
function MobileNavigation() {
  const { account, guest, booting, bootError, t, language, refreshAccount, logout, refresh } = useMobile();
  const reduceMotion = !useMotionEnabled(); const pendingOpen = useRef<Record<string, string> | null>(null);
  const openNotification = useCallback((data: Record<string, string>) => {
    if (!navigationRef.isReady()) { pendingOpen.current = data; return; }
    if (data.conversationId || data.kind === 'chat') navigationRef.navigate('chat_room');
    else if (data.kind === 'flashsale') navigationRef.navigate('flash_sale_screen');
    else if (data.orderId) navigationRef.navigate('order_detail_screen', { id: data.orderId });
    else if (data.kind === 'voucher') navigationRef.navigate('voucher_page');
    else navigationRef.navigate('notice_page');
  }, []);
  useEffect(() => {
    if (account?.status !== 'active') return;
    let cancelled = false; let cleanup: (() => void) | undefined;
    initializePush(openNotification, refresh).then(stop => { if (cancelled) stop(); else cleanup = stop; }).catch(() => {});
    return () => { cancelled = true; cleanup?.(); stopPush(); };
  }, [account?.id, account?.status, openNotification, refresh]);
  if (booting) return <Screen><LoadingState/></Screen>;
  if (bootError) return <Screen><EmptyState title={t('loadError')} message={bootError} action={t('tryAgain')} onPress={() => { void refreshAccount().catch(failure => Alert.alert(t('loadError'), failure.message)); }}/><Button title={t('logout')} variant="quiet" onPress={() => { void logout().catch(() => {}); }}/></Screen>;
  const gate = account?.status === 'referral_required'; const access = account?.status === 'active' || guest;
  const groupKey = gate ? `referral:${account.id}` : account ? `customer:${account.id}` : guest ? 'guest' : 'signed-out';
  const rtl = directionFor(language) === 'rtl';
  return <UiDirection.Provider value={rtl}><View style={[styles.root, { direction: rtl ? 'rtl' : 'ltr' }]}><NavigationContainer ref={navigationRef} direction={rtl ? 'rtl' : 'ltr'} theme={{ ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.background, text: colors.text, border: colors.line, notification: colors.primary } }} onReady={() => { if (pendingOpen.current) { const value = pendingOpen.current; pendingOpen.current = null; openNotification(value); } }}><Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: reduceMotion ? 'none' : 'default', statusBarStyle: 'dark' }}><Stack.Group navigationKey={groupKey}>{gate ? <Stack.Screen name="enter_referral_code_screen" component={ReferralScreen}/> : <>{access && <><Stack.Screen name="main_screen" component={MainTabs} options={({ route }) => ({ statusBarStyle: (getFocusedRouteNameFromRoute(route) ?? 'main_page') === 'main_page' ? 'light' : 'dark' })}/><Stack.Screen name="view_all_type_screen" component={CatalogRoute}/><Stack.Screen name="view_all_product_in_type" component={CatalogRoute}/><Stack.Screen name="view_all_product_indirectory" component={CatalogRoute}/><Stack.Screen name="search_screen" component={CatalogRoute}/><Stack.Screen name="product_view_screen" component={ProductRoute}/><Stack.Screen name="flash_sale_screen" component={FlashRoute}/><Stack.Screen name="cart_sale_screen" component={CartScreen}/><Stack.Screen name="check_out_screen" component={CheckoutScreen}/><Stack.Screen name="cart_for_buy_now_screen" component={CartScreen}/><Stack.Screen name="check_out_buy_now_screen" component={CheckoutScreen}/><Stack.Screen name="notice_page" component={NotificationsScreen}/><Stack.Screen name="voucher_page" component={VouchersScreen}/><Stack.Screen name="about_screen" component={AboutScreen} options={{ statusBarStyle: 'light' }}/><Stack.Screen name="account_info_screen" component={ProfileScreen}/><Stack.Screen name="wallet_info" component={WalletScreen}/><Stack.Screen name="history_order_screen" component={OrderHistoryScreen}/><Stack.Screen name="order_detail_screen" component={OrderDetailScreen}/><Stack.Screen name="history_voucher_screen" component={VoucherHistoryScreen}/><Stack.Screen name="withdrawal_form" component={WithdrawalScreen}/><Stack.Screen name="customer_care" component={SupportScreen}/><Stack.Screen name="chat_room" component={ChatScreen}/><Stack.Screen name="chat_image_preview" component={ChatImageScreen} options={{ presentation: 'fullScreenModal', animation: reduceMotion ? 'none' : 'fade' }}/></>}<Stack.Screen name="welcome_screen" component={WelcomeScreen}/><Stack.Screen name="login_screen" component={LoginScreen}/><Stack.Screen name="signup_screen" component={SignupScreen}/></>}</Stack.Group></Stack.Navigator></NavigationContainer></View></UiDirection.Provider>;
}
function MobilePresentation() {
  const { language } = useMobile();
  const rtl = directionFor(language) === 'rtl';
  return <UiLanguage.Provider value={language}><UiDirection.Provider value={rtl}><View style={[styles.root, { direction: rtl ? 'rtl' : 'ltr' }]}><MobileNavigation/></View></UiDirection.Provider></UiLanguage.Provider>;
}
export default function App() {
  if (isDesktopWeb(Platform.OS, typeof navigator === 'undefined' ? undefined : navigator)) return <DesktopNotice/>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><MotionProvider><MobileProvider><MobilePresentation/></MobileProvider></MotionProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background } });
