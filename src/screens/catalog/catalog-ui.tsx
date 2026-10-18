import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { BookOpen, Footprints, Gem, Headphones, Home, LayoutGrid, Plus, Shirt, Sparkles, Utensils, Watch, Wrench } from 'lucide-react-native';
import { MotionPressable, useEntrance, usePressFeedback } from '../../ui/motion';
import type { Category, Channel, Product } from '../../types';
import { mediaUrl } from '../../services/api';
import { AppText, Button, EmptyState, LoadingState, Notice, ProductImage } from '../../ui/components';
import { colors, touchTarget } from '../../ui/theme';

export type Translate = (key: string) => string;
export type CatalogStatus = { loading?: boolean; refreshing?: boolean; error?: string; onRefresh: () => void; t: Translate };
export type DirectorySection = { id: string; name: string; products: Product[] };

export function moneyLabel(amount: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(amount)} USDT`;
}

export function productPrice(product: Product) {
  const prices = product.variants.map(variant => Number(variant.price)).filter(Number.isFinite);
  if (!prices.length) return '—';
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  return minimum === maximum ? moneyLabel(minimum) : `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(minimum)} – ${moneyLabel(maximum)}`;
}

export function CatalogFeedback({ loading, error, onRefresh, t, empty, emptyTitle }: CatalogStatus & { empty: boolean; emptyTitle?: string }) {
  if (loading && empty) return <LoadingState/>;
  if (error && empty) return <EmptyState title={t('loadError')} message={error} action={t('tryAgain')} onPress={onRefresh}/>;
  if (empty) return <EmptyState title={emptyTitle ?? t('noProducts')}/>;
  return error ? <View style={styles.error}><Notice message={error} danger/><Button title={t('tryAgain')} onPress={onRefresh} variant="quiet"/></View> : null;
}

export function CategoryGlyph({ name, size = 25 }: { name: string; size?: number }) {
  const definitions = [[/beaut|mỹ phẩm/i, Sparkles], [/watch|đồng hồ/i, Watch], [/shoe|sneaker|giày/i, Footprints], [/book|sách/i, BookOpen], [/kitchen|gia dụng/i, Utensils], [/electronic|technology|điện/i, Headphones], [/clothes|thời trang/i, Shirt], [/interior|nội thất/i, Home], [/diamond|jewelry|đá quý/i, Gem], [/tool|machin|công cụ/i, Wrench]] as const;
  const Icon = definitions.find(([pattern]) => pattern.test(name))?.[1] ?? LayoutGrid;
  return <Icon size={size} strokeWidth={1.4} color={colors.primary}/>;
}

export function ProductCard({ product, channel = 'regular', onProduct, onQuickAdd, quickAddLabel, layout = 'grid', categoryName, enterDelay, style }: { product: Product; channel?: Channel; onProduct: (id: string, channel: Channel) => void; onQuickAdd?: (id: string, channel: Channel) => void; quickAddLabel?: string; layout?: 'grid' | 'list' | 'compact'; categoryName?: string; enterDelay?: number; style?: StyleProp<ViewStyle> }) {
  const feedback = usePressFeedback();
  const entrance = useEntrance(enterDelay ?? 0, 8, enterDelay !== undefined);
  const cardWidth = StyleSheet.flatten(style)?.width;
  const imageHeight = layout === 'list' ? 116 : layout === 'compact' ? 75 : typeof cardWidth === 'number' ? Math.max(0, cardWidth) * 1.04 : undefined;
  return <MotionPressable accessibilityRole="button" accessibilityLabel={product.name} onPress={() => onProduct(product.id, channel)} onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut} style={[{ opacity: entrance.opacity, transform: [...entrance.transform, ...feedback.style.transform] }, styles.product, layout === 'list' && styles.listProduct, layout === 'compact' && styles.compactProduct, style]}>
    <View style={[styles.imageFrame, layout === 'list' && styles.listFrame, imageHeight !== undefined && { height: imageHeight }]}>
      <ProductImage key={product.images[0] || product.variants[0]?.image} uri={mediaUrl(product.images[0] || product.variants[0]?.image)} label={product.name} inset={8} style={[styles.productImage, layout === 'list' && styles.listImage, layout === 'compact' && styles.compactImage, imageHeight !== undefined && { height: imageHeight, aspectRatio: undefined }]}/>
      {onQuickAdd && <Pressable accessibilityRole="button" accessibilityLabel={`${quickAddLabel ?? product.name} · ${product.name}`} onPress={event => { event.stopPropagation(); onQuickAdd(product.id, channel); }} style={({ pressed }) => [styles.quickAdd, pressed && styles.pressed]}><View style={styles.quickAddFace}><Plus size={16} color={colors.primary}/></View></Pressable>}
    </View>
    <View style={[styles.productInfo, layout === 'list' && styles.listInfo, layout === 'compact' && styles.compactInfo]}><AppText variant="productName" numberOfLines={layout === 'compact' ? 1 : 2} style={[styles.productName, layout === 'compact' && styles.compactName]}>{product.name}</AppText>{Boolean(categoryName) && layout !== 'compact' && <AppText style={styles.metadata} numberOfLines={1}>{categoryName}</AppText>}
      {layout !== 'compact' && <AppText variant="cardPrice" style={styles.price}>{productPrice(product)}</AppText>}
      {layout !== 'compact' && product.variants.length === 1 && Number(product.variants[0].original_price) > Number(product.variants[0].price) && <AppText style={styles.originalPrice}>{moneyLabel(Number(product.variants[0].original_price))}</AppText>}
    </View>
  </MotionPressable>;
}

export function CategoryTile({ category, onPress, style, compact = false }: { category: Category; onPress: () => void; style?: StyleProp<ViewStyle>; compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={category.name} onPress={onPress} style={({ pressed }) => [styles.category, pressed && styles.pressed, style]}>
    {compact ? <View style={styles.categorySymbol}><CategoryGlyph name={category.name}/></View> : <ProductImage key={category.image} uri={mediaUrl(category.image)} label={category.name} style={styles.categoryImage} resizeMode="cover"/>}
    <AppText variant={compact ? 'caption' : 'label'} numberOfLines={compact ? 1 : 2} style={compact ? styles.compactCategoryName : styles.categoryName}>{category.name}</AppText>
  </Pressable>;
}

export const catalogStyles = StyleSheet.create({
  list: { paddingHorizontal: 18, paddingBottom: 26, gap: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11 },
  horizontal: { paddingHorizontal: 18, gap: 11 },
  section: { gap: 4 }, inset: { paddingHorizontal: 18 }, pressed: { opacity: 0.88 },
});

const styles = StyleSheet.create({
  product: { alignSelf: 'flex-start', minWidth: 0, backgroundColor: colors.background },
  imageFrame: { position: 'relative' },
  productImage: { width: '100%', aspectRatio: 1 / 1.04, borderRadius: 13, backgroundColor: '#F6F3F8' },
  productInfo: { paddingTop: 9, paddingHorizontal: 2, paddingBottom: 4, gap: 4 },
  listInfo: { flex: 1, minWidth: 0 },
  productName: { fontSize: 12, lineHeight: 17, minHeight: 34, fontWeight: '600' },
  metadata: { color: '#9B91A4', fontSize: 10, lineHeight: 14 },
  price: { color: colors.primary, fontSize: 15, lineHeight: 21, fontWeight: '800', flexShrink: 1 },
  originalPrice: { color: '#A7A0AE', fontSize: 10, lineHeight: 14, textDecorationLine: 'line-through' },
  quickAdd: { position: 'absolute', right: 0, bottom: 0, width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  quickAddFace: { width: 28, height: 28, borderRadius: 9, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  listProduct: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listFrame: { width: 108 }, listImage: { width: 108, height: 116, aspectRatio: undefined },
  compactProduct: { backgroundColor: '#F8F6FA', borderRadius: 11, padding: 8 },
  compactImage: { width: '100%', height: 75, aspectRatio: undefined, borderRadius: 8, backgroundColor: '#F8F6FA' },
  compactInfo: { paddingHorizontal: 0, gap: 4 }, compactName: { fontSize: 11, lineHeight: 15, minHeight: 15, textAlign: 'center' },
  compactPrice: { fontSize: 12, lineHeight: 17, textAlign: 'center' },
  pressed: { opacity: 0.88 }, category: { gap: 7, alignItems: 'center' },
  categorySymbol: { width: 54, maxWidth: '100%', aspectRatio: 1, borderRadius: 16, backgroundColor: '#F3EFF7', alignItems: 'center', justifyContent: 'center' },
  categoryImage: { width: '100%', aspectRatio: 1.28, borderRadius: 13 },
  categoryName: { minHeight: 34, fontWeight: '600' }, compactCategoryName: { fontSize: 10, lineHeight: 15, fontWeight: '600', textAlign: 'center' },
  error: { gap: 4 },
});
