import { useContext } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowRight, Bell, LayoutGrid, Search, ShoppingBag, SlidersHorizontal } from 'lucide-react-native';
import type { FlashSchedule, Banner, Category, Channel, Product } from '../../types';
import { mediaUrl } from '../../services/api';
import { AppText, ProductImage, Screen, UiDirection } from '../../ui/components';
import { colors, touchTarget } from '../../ui/theme';
import { FlashSaleHero } from '../../ui/FlashSaleHero';
import { AdCarousel } from '../../ui/AdCarousel';
import { BrandLogo } from '../../ui/BrandLogo';
import { AppInfoFooter } from '../../ui/AppInfoFooter';
import { CatalogFeedback, CategoryTile, ProductCard, productPrice, type CatalogStatus, type DirectorySection } from './catalog-ui';
import { phoneLayout } from './presentation';

export type HomeScreenProps = CatalogStatus & {
  banners: Banner[];
  flashSchedule?: FlashSchedule;
  categories: Category[];
  topProducts: Product[];
  flashProducts: Product[];
  directorySections: DirectorySection[];
  cartCount: number;
  onSearch: () => void;
  onCart: () => void;
  onNotifications: () => void;
  onFeatured: () => void;
  onFlashSale: () => void;
  onAllCategories: () => void;
  onCategory: (id: string, kind: 'type' | 'directory') => void;
  onProduct: (id: string, channel: Channel) => void;
  onQuickAdd: (id: string, channel: Channel) => void;
  onBanner: (banner: Banner) => void;
};

export function HomeScreen(props: HomeScreenProps) {
  const { banners, categories, topProducts, flashProducts, directorySections, t, onRefresh, refreshing, onProduct } = props;
  const { width } = useWindowDimensions();
  const layout = phoneLayout(width);
  const rtl = useContext(UiDirection);
  const railKey = `${rtl ? 'rtl' : 'ltr'}-${Math.round(width)}`;
  const empty = !banners.length && !categories.length && !topProducts.length && !directorySections.length;
  const heading = (title: string, onPress: () => void) => <View style={styles.sectionHeading}><AppText style={styles.sectionTitle}>{title}</AppText><Pressable accessibilityRole="button" onPress={onPress} style={styles.seeAll}><AppText variant="caption" style={styles.purple}>{t('seeAll')}</AppText><ArrowRight size={15} color={colors.primary}/></Pressable></View>;
  const grid = (products: Product[]) => <View style={styles.grid}>{products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} categoryName={categories.find(category => category.id === product.type_id)?.name} enterDelay={index * 35} onProduct={onProduct} onQuickAdd={props.onQuickAdd} quickAddLabel={t('quickAdd')} style={{ width: layout.cardWidth }}/>)}</View>;
  return <Screen scroll={false} surface={colors.primary}>
    <FlatList<DirectorySection> data={directorySections} keyExtractor={section => section.id} refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary}/>} style={styles.listSurface} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={5} ListFooterComponent={<AppInfoFooter/>} ListHeaderComponent={<>
    <View style={[styles.header, { paddingHorizontal: layout.padding }]}>
      <View style={styles.headerTop}><BrandLogo compact light/><View style={styles.headerActions}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('notification')} onPress={props.onNotifications} style={styles.headButton}><Bell size={22} color={colors.background}/></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`${t('cart')} · ${props.cartCount}`} onPress={props.onCart} style={styles.headButton}><ShoppingBag size={22} color={colors.background}/>{props.cartCount > 0 && <View style={styles.badge}><AppText style={styles.badgeText}>{props.cartCount > 99 ? '99+' : props.cartCount}</AppText></View>}</Pressable>
      </View></View>
      <Pressable accessibilityRole="button" accessibilityLabel={t('search')} onPress={props.onSearch} style={styles.search}><Search size={19} color={colors.primary}/><AppText muted variant="label" numberOfLines={1} style={styles.searchText}>{t('searchProductOnApp')}</AppText><SlidersHorizontal size={17} color={colors.primary}/></Pressable>
    </View>
    <View style={styles.sections}>
      <CatalogFeedback {...props} empty={empty}/>
      {banners.length > 0 ? <AdCarousel banners={banners} width={layout.contentWidth} padding={layout.padding} rtl={rtl} label={t('advertisement')} onPress={props.onBanner}/> : topProducts[0] && <Pressable accessibilityRole="button" accessibilityLabel={topProducts[0].name} onPress={() => onProduct(topProducts[0].id, 'regular')} style={[styles.editorial, { marginHorizontal: layout.padding }]}><View style={styles.editorialCopy}><AppText variant="caption" style={styles.purple}>{t('topProducts')}</AppText><AppText style={styles.editorialTitle} numberOfLines={3}>{topProducts[0].name}</AppText><AppText variant="label" style={styles.purple}>{productPrice(topProducts[0])}</AppText><View style={styles.heroAction}><AppText variant="caption" style={styles.white}>{t('productDetails')}</AppText><ArrowRight size={14} color={colors.background}/></View></View><ProductImage uri={mediaUrl(topProducts[0].images[0])} label={topProducts[0].name} inset={8} style={styles.editorialImage}/></Pressable>}
      <View style={{ marginHorizontal: layout.padding }}><FlashSaleHero schedule={props.flashSchedule} count={flashProducts.length} t={t} onPress={props.onFlashSale}/></View>
      {categories.length > 0 && <FlatList key={`categories-${railKey}`} horizontal inverted={rtl} data={categories} keyExtractor={category => category.id} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: layout.padding, gap: layout.gap }} ListHeaderComponent={<Pressable accessibilityRole="button" accessibilityLabel={t('categories')} onPress={props.onAllCategories} style={{ width: layout.categoryWidth, gap: 6 }}><View style={[styles.allCategory, { height: Math.min(54, layout.categoryWidth), width: Math.min(54, layout.categoryWidth) }]}><LayoutGrid size={24} color={colors.primary}/></View><AppText variant="caption" numberOfLines={1} style={styles.categoryLabel}>{t('categories')}</AppText></Pressable>} renderItem={({ item }) => <CategoryTile compact category={item} onPress={() => props.onCategory(item.id, 'type')} style={{ width: layout.categoryWidth }}/>} initialNumToRender={6}/>}
      {topProducts.length > 0 && <View style={{ paddingHorizontal: layout.padding }}>{heading(t('topProducts'), props.onFeatured)}{grid(topProducts)}</View>}

    </View></>} renderItem={({ item: section }) => <View style={[styles.directory, { paddingHorizontal: layout.padding }]}>{heading(section.name, () => props.onCategory(section.id, 'directory'))}{section.products.length ? grid(section.products) : <AppText muted>{t('noProducts')}</AppText>}</View>}/>
  </Screen>;
}

const styles = StyleSheet.create({
  listSurface: { backgroundColor: colors.background },
  header: { paddingTop: 8, paddingBottom: 21, gap: 14, backgroundColor: colors.primary, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', gap: 3 }, headButton: { width: touchTarget, height: touchTarget, justifyContent: 'center', alignItems: 'center' },
  badge: { position: 'absolute', right: 1, top: 1, backgroundColor: colors.danger, borderRadius: 9, minWidth: 15, paddingHorizontal: 3 }, badgeText: { color: colors.background, fontSize: 9, lineHeight: 15, textAlign: 'center', fontWeight: '700' },
  search: { minHeight: Math.max(45, touchTarget), paddingHorizontal: 14, backgroundColor: colors.background, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchText: { flex: 1, fontSize: 12, color: '#8E8597', fontWeight: '400' },
  content: { paddingBottom: 0 }, sections: { gap: 17, paddingTop: 16 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  sectionHeading: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3, marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '800', letterSpacing: -0.45 },
  seeAll: { minHeight: touchTarget, marginVertical: -6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  purple: { color: colors.primary, fontWeight: '700', fontSize: 11 }, white: { color: colors.background },
  categoryLabel: { textAlign: 'center', fontSize: 10, fontWeight: '600', lineHeight: 15 },
  allCategory: { alignSelf: 'center', borderRadius: 16, backgroundColor: '#F3EFF7', alignItems: 'center', justifyContent: 'center' },
  bannerSection: { gap: 9 }, bannerImage: { width: '100%', aspectRatio: 1.94, borderRadius: 17 },
  pagination: { alignSelf: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5, marginBottom: 3 },
  dot: { height: 5, width: 5, borderRadius: 9, backgroundColor: '#D4C8E0' }, activeDot: { width: 17, backgroundColor: colors.primary },
  editorial: { flexDirection: 'row', backgroundColor: '#EDE3F5', borderRadius: 17, overflow: 'hidden', minHeight: 182 },
  editorialCopy: { flex: 1, padding: 17, gap: 9 }, editorialTitle: { fontSize: 24, lineHeight: 27, fontWeight: '800', letterSpacing: -0.95 },
  editorialImage: { width: '47%', backgroundColor: '#EDE3F5' }, heroAction: { flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: colors.primary, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9 },
  promoStrip: { borderRadius: 12, backgroundColor: '#F4EFF9', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  promoText: { flex: 1, gap: 3 }, promoTitle: { color: colors.primary, fontSize: 13, lineHeight: 18, fontWeight: '700' }, promoCaption: { color: '#8B75A2', fontSize: 10, lineHeight: 15 },
  directory: { marginTop: 20 },
});
