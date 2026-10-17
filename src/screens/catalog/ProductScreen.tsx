import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus, ShoppingBag, ShoppingCart } from 'lucide-react-native';
import type { Channel, Product } from '../../types';
import { mediaUrl } from '../../services/api';
import { AppText, BottomAction, Button, Divider, Header, IconButton, Notice, ProductImage, Screen } from '../../ui/components';
import { colors, touchTarget } from '../../ui/theme';
import { CatalogFeedback, catalogStyles, moneyLabel, productPrice, type CatalogStatus, type Translate } from './catalog-ui';
import { RichProductDescription } from './RichProductDescription';
import { prefetchGalleryImages } from '../../ui/media';
import { BottomSheet, StatusPill } from '../../ui/commerce';
import { ProductReviewExamples } from './ProductReviewExamples';

export type ProductScreenProps = CatalogStatus & {
  product?: Product;
  channel: Channel;
  categoryName?: string;
  onCart?: () => void;
  selectedVariantId?: string;
  quantity: number;
  onSelectVariant: (id: string) => void;
  onQuantityChange: (quantity: number) => void;
  busy?: boolean;
  onBack: () => void;
  onOpenPurchase: (action: 'cart' | 'buyNow') => void;
};

export function ProductScreen(props: ProductScreenProps) {
  const { product, t, selectedVariantId, quantity } = props;
  const { width } = useWindowDimensions();
  const [imageIndex, setImageIndex] = useState(0);
  const [nameExpanded, setNameExpanded] = useState(false);
  const lastSelectedVariant = useRef('');
  useEffect(() => { setImageIndex(0); setNameExpanded(false); lastSelectedVariant.current = ''; }, [product?.id]);
  const selectedVariant = product?.variants.find(variant => variant.id === selectedVariantId);
  const images = [...new Set([...(product?.images ?? []), ...(product?.variants.map(variant => variant.image).filter(Boolean) ?? [])])];
  useEffect(() => { if (lastSelectedVariant.current && selectedVariant?.image && images.includes(selectedVariant.image)) setImageIndex(images.indexOf(selectedVariant.image)); lastSelectedVariant.current = selectedVariantId ?? ''; }, [selectedVariantId, selectedVariant?.image, product?.id]);
  const displayedImage = images[imageIndex] ?? images[0];
  useEffect(() => {
    if (images.length < 2) return;
    void prefetchGalleryImages([images[(imageIndex + 1) % images.length], images[(imageIndex + 2) % images.length]].filter(image => image !== displayedImage).map(image => mediaUrl(image)));
  }, [displayedImage, product?.id]);
  return <Screen scroll={false}>
    <Header title={t('productDetails')} onBack={props.onBack} action={props.onCart ? <IconButton label={t('cart')} onPress={props.onCart}><ShoppingBag size={20} color={colors.text}/></IconButton> : undefined}/>
    {!product ? <CatalogFeedback {...props} empty/> : <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {props.error && <View style={catalogStyles.inset}><Notice message={props.error} danger/></View>}
        <View style={styles.gallery}>
          <View style={styles.photoFrame}><ProductImage key={displayedImage} uri={mediaUrl(displayedImage)} label={product.name} inset={Math.round((width - 36) * 0.075)} style={[styles.hero, { height: (width - 36) / 1.04 }]}/>{images.length > 1 && <><View style={styles.previousPhoto}><IconButton label={`${product.name} · ${((imageIndex - 1 + images.length) % images.length) + 1}/${images.length}`} onPress={() => setImageIndex(value => (value - 1 + images.length) % images.length)}><ChevronLeft size={18} color={colors.primary}/></IconButton></View><View style={styles.nextPhoto}><IconButton label={`${product.name} · ${((imageIndex + 1) % images.length) + 1}/${images.length}`} onPress={() => setImageIndex(value => (value + 1) % images.length)}><ChevronRight size={18} color={colors.primary}/></IconButton></View></>}<View style={styles.photoCounter}><AppText style={styles.photoCounterText}>{images.length ? imageIndex + 1 : 0} / {images.length}</AppText></View></View>
          {images.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>{images.map((image, index) => <Pressable key={`${image}:${index}`} accessibilityRole="button" accessibilityLabel={`${product.name} · ${index + 1}/${images.length}`} accessibilityState={{ selected: imageIndex === index }} onPress={() => setImageIndex(index)} style={[styles.thumbnail, imageIndex === index && styles.thumbnailSelected]}><ProductImage key={image} uri={mediaUrl(image)} label={`${product.name} · ${index + 1}`} inset={4} style={styles.thumbnailImage}/></Pressable>)}</ScrollView>}
        </View>
        <View style={styles.info}>
          <View style={styles.metaRow}><AppText variant="overline" style={styles.channel}>{props.channel === 'flashsale' ? t('flashSale') : props.categoryName || t('products')}</AppText>{selectedVariant && <StatusPill label={`${t('inventory')}: ${selectedVariant.inventory}`} tone={selectedVariant.inventory > 0 ? 'success' : 'neutral'}/>}</View>
          <Pressable accessibilityRole="button" accessibilityLabel={product.name} accessibilityState={{ expanded: nameExpanded }} onPress={() => setNameExpanded(value => !value)} style={styles.titleRow}><AppText style={styles.name} numberOfLines={nameExpanded ? undefined : 3}>{product.name}</AppText>{product.name.length > 75 && <ChevronDown size={17} color={colors.primary} style={nameExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}/>}</Pressable>
          <View style={styles.prices}><AppText variant="price" style={styles.price}>{selectedVariant ? moneyLabel(Number(selectedVariant.price)) : productPrice(product)}</AppText>{selectedVariant && Number(selectedVariant.original_price) > Number(selectedVariant.price) && <AppText style={styles.originalPrice}>{moneyLabel(Number(selectedVariant.original_price))}</AppText>}</View>
          <View style={styles.sectionDivider}/>
          {product.variants.length > 0 && <View style={styles.inlineOptions}><AppText style={styles.fieldTitle}>{t('variant')}</AppText><View style={styles.variantOptions}>{product.variants.map(variant => <Pressable key={variant.id} accessibilityRole="radio" accessibilityState={{ checked: variant.id === selectedVariantId, disabled: Boolean(props.busy) }} accessibilityLabel={variant.name} disabled={props.busy} onPress={() => props.onSelectVariant(variant.id)} style={[styles.variantOption, variant.id === selectedVariantId && styles.variantOptionSelected]}><AppText style={[styles.variantLabel, variant.id === selectedVariantId && styles.selectedLabel]}>{variant.name}</AppText></Pressable>)}</View></View>}
          <View style={styles.quantityRow}><AppText style={styles.fieldTitle}>{t('quantity')}</AppText><View style={styles.quantityControl}><IconButton plain label={`${t('quantity')} −`} onPress={() => props.onQuantityChange(quantity - 1)} disabled={props.busy || quantity <= 1}><Minus size={17} color={colors.primary}/></IconButton><AppText variant="label" style={styles.quantity}>{quantity}</AppText><IconButton plain label={`${t('quantity')} +`} onPress={() => props.onQuantityChange(quantity + 1)} disabled={props.busy || !selectedVariant || quantity >= selectedVariant.inventory || quantity >= 100}><Plus size={17} color={colors.primary}/></IconButton></View></View>
          <View style={styles.sectionDivider}/>
          <AppText style={styles.fieldTitle}>{t('description')}</AppText>
          {product.description ? <RichProductDescription html={product.description} width={width - 36}/> : <AppText muted>—</AppText>}
        </View>
        <ProductReviewExamples key={product.id} productId={product.id} t={t}/>
      </ScrollView>
      <BottomAction><View style={styles.actions}><Button title={t('addToCart')} onPress={() => props.onOpenPurchase('cart')} disabled={props.busy} variant="secondary" icon={<ShoppingCart size={17} color={colors.primary}/>} style={styles.action}/><Button title={t('buyNow')} onPress={() => props.onOpenPurchase('buyNow')} disabled={props.busy} style={styles.action}/></View></BottomAction>
    </>}
  </Screen>;
}

export type ProductPurchaseSheetProps = {
  visible: boolean;
  product: Product;
  action: 'cart' | 'buyNow';
  channel: Channel;
  selectedVariantId?: string;
  quantity: number;
  onSelectVariant: (id: string) => void;
  onQuantityChange: (quantity: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy?: boolean;
  error?: string;
  disabled?: boolean;
  t: Translate;
};

export function ProductPurchaseSheet(props: ProductPurchaseSheetProps) {
  const { product, t, selectedVariantId, quantity } = props;
  const selected = product.variants.find(variant => variant.id === selectedVariantId);
  const image = selected?.image || product.images[0];
  return <BottomSheet visible={props.visible} title={props.action === 'buyNow' ? t('buyNow') : t('addToCart')} closeLabel={t('close')} onClose={props.onClose} busy={props.busy} footer={<Button title={props.action === 'buyNow' ? t('buyNow') : t('addToCart')} onPress={props.onConfirm} loading={props.busy} disabled={props.disabled} icon={<ShoppingBag size={17} color={colors.background}/>}/>}>
    <View style={styles.selectedProduct}><ProductImage key={image} uri={mediaUrl(image)} label={product.name} inset={6} style={styles.selectedImage}/><View style={styles.selectedInfo}><AppText variant="label" numberOfLines={3}>{product.name}</AppText><AppText style={styles.sheetPrice}>{selected ? moneyLabel(Number(selected.price)) : productPrice(product)}</AppText>{selected && <AppText muted variant="caption">{t('inventory')}: {selected.inventory}</AppText>}</View></View>
    <Divider/><View style={styles.inlineOptions}><AppText style={styles.fieldTitle}>{t('variant')}</AppText><View style={styles.variantOptions}>{product.variants.map(variant => <Pressable key={variant.id} accessibilityRole="radio" accessibilityState={{ checked: variant.id === selectedVariantId, disabled: Boolean(props.busy) }} accessibilityLabel={variant.name} disabled={props.busy} onPress={() => props.onSelectVariant(variant.id)} style={[styles.variantOption, variant.id === selectedVariantId && styles.variantOptionSelected]}><AppText style={[styles.variantLabel, variant.id === selectedVariantId && styles.selectedLabel]}>{variant.name}</AppText>{variant.id === selectedVariantId && <Check size={16} color={colors.primary}/>}</Pressable>)}</View></View>
    <Divider/><View style={styles.quantityRow}><AppText style={styles.fieldTitle}>{t('quantity')}</AppText><View style={styles.quantityControl}><IconButton plain label={`${t('quantity')} −`} onPress={() => props.onQuantityChange(quantity - 1)} disabled={props.busy}><Minus size={17} color={colors.primary}/></IconButton><AppText variant="label" style={styles.quantity}>{quantity}</AppText><IconButton plain label={`${t('quantity')} +`} onPress={() => props.onQuantityChange(quantity + 1)} disabled={props.busy}><Plus size={17} color={colors.primary}/></IconButton></View></View>
    {props.error && <Notice message={props.error} danger/>}
  </BottomSheet>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 26 }, gallery: { paddingHorizontal: 18 },
  photoFrame: { position: 'relative', overflow: 'hidden', borderRadius: 19, backgroundColor: '#F5F1F8' }, hero: { width: '100%', borderRadius: 19, backgroundColor: '#F5F1F8' },
  previousPhoto: { position: 'absolute', left: 0, top: '42%', borderRadius: 12, backgroundColor: '#FFFFFFCC' }, nextPhoto: { position: 'absolute', right: 0, top: '42%', borderRadius: 12, backgroundColor: '#FFFFFFCC' },
  photoCounter: { position: 'absolute', right: 12, bottom: 11, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: colors.background }, photoCounterText: { fontSize: 10, lineHeight: 14, color: '#7E7189' },
  thumbnails: { paddingTop: 12, paddingBottom: 4, gap: 9 }, thumbnail: { width: 57, height: 57, borderWidth: 1, borderColor: '#E6DEE9', borderRadius: 10, padding: 4, backgroundColor: '#FBF9FC' }, thumbnailSelected: { borderColor: colors.primary }, thumbnailImage: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: '#FBF9FC' },
  info: { paddingHorizontal: 18, paddingTop: 0 }, metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, channel: { color: '#9A79BB', flex: 1 },
  titleRow: { marginTop: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  name: { flex: 1, fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.8 }, prices: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 8 },
  price: { color: colors.primary }, originalPrice: { fontSize: 12, color: '#A7A0AE', textDecorationLine: 'line-through' }, sectionDivider: { height: 1, backgroundColor: colors.line, marginVertical: 21 },
  fieldTitle: { fontSize: 13, lineHeight: 19, fontWeight: '700', marginBottom: 9 }, inlineOptions: { gap: 0 }, variantOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  variantOption: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#E8E2ED', borderRadius: 9, maxWidth: '100%' },
  variantOptionSelected: { borderColor: colors.primary, backgroundColor: '#F5F0FA' }, variantLabel: { fontSize: 12, color: '#564C60' }, selectedLabel: { color: colors.primary, fontWeight: '700', flexShrink: 1 },
  quantityRow: { marginTop: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, quantityControl: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }, quantity: { minWidth: 26, textAlign: 'center', fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10 }, action: { flex: 1, paddingHorizontal: 10 }, selectedProduct: { flexDirection: 'row', gap: 12 }, selectedImage: { width: 82, height: 86, borderRadius: 11 },
  selectedInfo: { flex: 1, gap: 5, justifyContent: 'center' }, sheetPrice: { color: colors.primary, fontSize: 20, fontWeight: '800' },
});
