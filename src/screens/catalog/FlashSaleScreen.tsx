import { useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ShoppingCart } from 'lucide-react-native';
import type { Channel, FlashSchedule, Product } from '../../types';
import { AppText, Field, Header, IconButton, Screen } from '../../ui/components';
import { FlashSaleHero } from '../../ui/FlashSaleHero';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors, radius, spacing } from '../../ui/theme';
import { CatalogFeedback, ProductCard, type CatalogStatus } from './catalog-ui';
import { browseProducts, phoneLayout } from './presentation';

export type FlashSaleScreenProps = CatalogStatus & {
  products: Product[];
  schedule?: FlashSchedule;
  onBack: () => void;
  onCart: () => void;
  cartCount?: number;
  onProduct: (id: string, channel: Channel) => void;
  onQuickAdd: (id: string, channel: Channel) => void;
};

export function FlashSaleScreen(props: FlashSaleScreenProps) {
  const { width } = useWindowDimensions();
  const layout = phoneLayout(width);
  const [search, setSearch] = useState('');
  const filtered = browseProducts(props.products, { query: search });
  return <Screen scroll={false}>
    <Header title={props.t('flashSale')} onBack={props.onBack} action={<View><IconButton label={`${props.t('flashSale')} · ${props.t('cart')}${props.cartCount ? ` (${props.cartCount})` : ''}`} onPress={props.onCart}><ShoppingCart size={22} color={colors.text}/></IconButton>{Boolean(props.cartCount) && <View pointerEvents="none" style={styles.badge}><AppText variant="caption" style={styles.badgeText}>{props.cartCount! > 99 ? '99+' : props.cartCount}</AppText></View>}</View>}/>
    <FlatList data={filtered} keyExtractor={product => product.id} numColumns={2} contentContainerStyle={[styles.list, { paddingHorizontal: layout.padding }]} columnWrapperStyle={styles.columns} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={Boolean(props.refreshing)} onRefresh={props.onRefresh} tintColor={colors.primary}/>} ListHeaderComponent={<View style={styles.meta}><FlashSaleHero schedule={props.schedule} count={props.products.length} t={props.t}/><Field label={props.t('searchFlashSale')} value={search} onChangeText={setSearch} placeholder={props.t('searchFlashSale')} accessibilityLabel={props.t('searchFlashSale')} returnKeyType="search" autoCorrect={false} maxLength={200}/><AppText muted variant="caption">{filtered.length} {props.t('products')}</AppText>{props.error && props.products.length > 0 && <CatalogFeedback {...props} empty={false}/>}</View>} ListEmptyComponent={<CatalogFeedback {...props} empty/>} renderItem={({ item }) => <ProductCard product={item} channel="flashsale" onProduct={props.onProduct} onQuickAdd={props.onQuickAdd} quickAddLabel={props.t('quickAdd')} style={{ width: layout.cardWidth }}/>} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}/>
    <CommerceFooter/>
  </Screen>;
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, paddingTop: 12, paddingBottom: 24, gap: 11, backgroundColor: colors.background },
  columns: { gap: 10 },
  meta: { gap: 18, paddingBottom: 4 },
  saleHero: { borderRadius: 14, backgroundColor: colors.primary, padding: 19, flexDirection: 'row', alignItems: 'center', gap: 12 }, saleCopy: { flex: 1, gap: 5 }, saleKicker: { fontSize: 10, letterSpacing: 1, color: '#DBCBE9' }, saleTitle: { fontSize: 21, lineHeight: 28, fontWeight: '800', color: colors.background }, saleCaption: { fontSize: 11, color: '#DECFEA' },
  badge: { position: 'absolute', right: 0, top: 0, minWidth: 20, minHeight: 20, paddingHorizontal: spacing.xs, borderRadius: radius.small, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
  badgeText: { color: colors.background, fontSize: 10, lineHeight: 14, fontWeight: '600' },
});
