import { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowDownUp, Check, LayoutGrid, List, Search, ShoppingBag, SlidersHorizontal, X } from 'lucide-react-native';
import type { Category, Channel, Product } from '../../types';
import { mediaUrl } from '../../services/api';
import { AppText, Button, Header, IconButton, ProductImage, Screen } from '../../ui/components';
import { BottomSheet } from '../../ui/commerce';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { colors, fontFamily, touchTarget } from '../../ui/theme';
import { CatalogFeedback, ProductCard, type CatalogStatus } from './catalog-ui';
import { browseProducts, phoneLayout, type BrowseLayout, type BrowseSort } from './presentation';

export type CatalogScreenProps = CatalogStatus & {
  title: string;
  products: Product[];
  categories?: Category[];
  filterCategories: Category[];
  productCategories?: Category[];
  initialCategoryId?: string;
  categoryKind?: 'type' | 'directory';
  onCategory: (id: string, kind: 'type' | 'directory') => void;
  onBack?: () => void;
  onCart?: () => void;
  onProduct: (id: string, channel: Channel) => void;
  onQuickAdd: (id: string, channel: Channel) => void;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
};

export function CatalogScreen(props: CatalogScreenProps) {
  const { categories, products, filterCategories, t, onRefresh, refreshing } = props;
  const { width } = useWindowDimensions();
  const geometry = phoneLayout(width);
  const [categoryId, setCategoryId] = useState(props.initialCategoryId ?? categories?.[0]?.id ?? '');
  const [localSearch, setLocalSearch] = useState('');
  const [sort, setSort] = useState<BrowseSort>('default');
  const [layout, setLayout] = useState<BrowseLayout>('grid');
  const [sheet, setSheet] = useState<'filter' | 'sort' | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const query = props.searchValue ?? localSearch;
  const setSearch = props.onSearchChange ?? setLocalSearch;
  const categoryMode = categories !== undefined;
  const kind = props.categoryKind ?? 'type';
  const visible = useMemo(() => browseProducts(products, { query, categoryId, kind, sort }), [products, query, categoryId, kind, sort]);
  const selectedCategory = filterCategories.find(category => category.id === categoryId);
  const choices = [{ id: '', name: t('all') }, ...filterCategories];
  const sortChoices: BrowseSort[] = ['default', 'priceLowHigh', 'priceHighLow', 'sortByName'];
  const labelForSort = (value: BrowseSort) => t(value === 'default' ? 'defaultOrder' : value);
  const chips = <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{choices.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: category.id === categoryId }} onPress={() => setCategoryId(category.id)} style={[styles.chip, category.id === categoryId && styles.activeChip]}><AppText variant="caption" style={category.id === categoryId ? styles.white : styles.purple}>{category.name}</AppText></Pressable>)}</ScrollView>;
  const searchField = <View style={[styles.lookup, { paddingHorizontal: geometry.padding }]}><View style={styles.searchFrame}><TextInput accessibilityLabel={t('search')} value={query} onChangeText={setSearch} placeholder={t('searchProductOnApp')} placeholderTextColor={colors.muted} returnKeyType="search" onSubmitEditing={() => Keyboard.dismiss()} autoCapitalize="none" autoCorrect={false} style={styles.searchInput}/>{Boolean(query) && <Pressable accessibilityRole="button" accessibilityLabel={t('clearFilters')} onPress={() => setSearch('')} style={styles.clearSearch}><X size={17} color={colors.muted}/></Pressable>}</View><Pressable accessibilityRole="button" accessibilityLabel={t('search')} onPress={() => Keyboard.dismiss()} style={styles.searchSubmit}><Search size={18} color={colors.background}/></Pressable></View>;
  return <Screen scroll={false}>
    <Header title={categoryMode ? props.title : selectedCategory?.name ?? props.title} onBack={props.onBack} action={categoryMode ? <IconButton label={t(searchOpen ? 'close' : 'search')} onPress={() => { if (searchOpen) setSearch(''); setSearchOpen(value => !value); }}><Search size={20} color={colors.text}/></IconButton> : props.onCart ? <IconButton label={t('cart')} onPress={props.onCart}><ShoppingBag size={20} color={colors.text}/></IconButton> : undefined}/>
    {(!categoryMode || searchOpen) && searchField}
    {categoryMode ? <View style={styles.categoryLayout}>
      <ScrollView style={[styles.sideSurface, { width: geometry.sidebarWidth }]} contentContainerStyle={styles.sidebar} showsVerticalScrollIndicator={false}>{choices.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityState={{ selected: category.id === categoryId }} onPress={() => setCategoryId(category.id)} style={[styles.sideCategory, category.id === categoryId && styles.activeSide]}><AppText style={[styles.sideLabel, category.id === categoryId && styles.activeSideLabel]}>{category.name}</AppText></Pressable>)}</ScrollView>
      <FlatList key={`sidebar-${Math.round(width)}`} data={visible} keyExtractor={product => product.id} numColumns={2} style={styles.categoryProducts} contentContainerStyle={[styles.categoryContent, { gap: 11 }]} columnWrapperStyle={{ gap: 11 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary}/>}
        ListHeaderComponent={<View style={styles.categoryIntro}>{selectedCategory && <Pressable accessibilityRole="button" onPress={() => props.onCategory(categoryId, kind)} style={styles.categoryPromo}><View style={styles.promoCopy}><AppText variant="overline" style={styles.kicker}>{t('discoverMore')}</AppText><AppText style={styles.promoTitle}>{selectedCategory.name}</AppText><AppText style={styles.promoCaption}>{t('seeAll')} →</AppText></View>{selectedCategory.image && <ProductImage uri={mediaUrl(selectedCategory.image)} label={selectedCategory.name} inset={6} style={styles.promoImage}/>}</Pressable>}<View style={styles.categorySection}><AppText variant="heading" style={styles.categorySectionTitle}>{t('products')}</AppText><AppText style={styles.count}>{visible.length}</AppText></View>{props.error && visible.length > 0 && <CatalogFeedback {...props} empty={false}/>}</View>}
        renderItem={({ item }) => <ProductCard product={item} layout="compact" onProduct={props.onProduct} style={{ width: Math.max(0, (width - geometry.sidebarWidth - 28 - 11) / 2) }}/>}
        ListFooterComponent={selectedCategory && visible.length ? <Button title={t('seeAll')} variant="quiet" onPress={() => props.onCategory(categoryId, kind)}/> : null}
        ListEmptyComponent={<CatalogFeedback {...props} empty emptyTitle={categories.length ? t('noProducts') : t('noCategories')}/>} initialNumToRender={10} maxToRenderPerBatch={8} windowSize={7}/>
    </View> : <>
      <View style={{ paddingHorizontal: geometry.padding }}>{chips}</View>
      <View style={[styles.toolbar, { paddingHorizontal: geometry.padding }]}><Pressable accessibilityRole="button" onPress={() => setSheet('filter')} style={[styles.toolButton, Boolean(categoryId) && styles.selectedTool]}><SlidersHorizontal size={16} color={colors.text}/><AppText variant="caption">{t('filter')}</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t('sortBy')} onPress={() => setSheet('sort')} style={[styles.toolButton, styles.sortButton]}><ArrowDownUp size={16} color={colors.text}/><AppText numberOfLines={1} variant="caption" style={styles.sortLabel}>{labelForSort(sort)}</AppText></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t(layout === 'grid' ? 'listView' : 'gridView')} onPress={() => setLayout(layout === 'grid' ? 'list' : 'grid')} style={styles.layoutButton}>{layout === 'grid' ? <List size={18} color={colors.primary}/> : <LayoutGrid size={18} color={colors.primary}/>}</Pressable></View>
      <FlatList key={`${layout}-${Math.round(width)}`} data={visible} keyExtractor={product => product.id} numColumns={layout === 'grid' ? 2 : 1} contentContainerStyle={[styles.list, { paddingHorizontal: geometry.padding }]} columnWrapperStyle={layout === 'grid' ? { gap: geometry.gap } : undefined} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary}/>}
        ListHeaderComponent={<View style={styles.results}><AppText style={styles.resultsTitle}>{visible.length} {t('products')}</AppText>{props.error && visible.length > 0 && <CatalogFeedback {...props} empty={false}/>}</View>}
        ListEmptyComponent={<CatalogFeedback {...props} empty emptyTitle={t('noProducts')}/>}
        renderItem={({ item, index }) => <ProductCard product={item} categoryName={(props.productCategories ?? filterCategories).find(category => category.id === item.type_id)?.name} enterDelay={index < 8 ? index * 25 : undefined} layout={layout} onProduct={props.onProduct} onQuickAdd={props.onQuickAdd} quickAddLabel={t('quickAdd')} style={{ width: layout === 'grid' ? geometry.cardWidth : geometry.contentWidth }}/>} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}/>
    </>}
    {props.onBack && <CommerceFooter active={categoryMode ? 'categories_page' : undefined}/>}
    <BottomSheet visible={Boolean(sheet)} title={t(sheet === 'sort' ? 'sortBy' : 'filter')} closeLabel={t('close')} onClose={() => setSheet(null)} footer={sheet === 'filter' ? <View style={styles.filterFooter}><Button variant="quiet" title={t('clearFilters')} onPress={() => { setCategoryId(''); setSearch(''); setSort('default'); setSheet(null); }}/><Button title={t('products')} onPress={() => setSheet(null)}/></View> : undefined}>
      {sheet === 'sort' ? sortChoices.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: sort === value }} onPress={() => { setSort(value); setSheet(null); }} style={styles.option}><AppText style={styles.optionLabel}>{labelForSort(value)}</AppText>{sort === value && <Check size={18} color={colors.primary}/>}</Pressable>) : <View style={styles.filterChoices}>{choices.map(category => <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ checked: categoryId === category.id }} onPress={() => setCategoryId(category.id)} style={[styles.filterChoice, categoryId === category.id && styles.selectedTool]}><AppText style={styles.optionLabel}>{category.name}</AppText>{categoryId === category.id && <Check size={16} color={colors.primary}/>}</Pressable>)}</View>}
    </BottomSheet>
  </Screen>;
}

const styles = StyleSheet.create({
  lookup: { flexDirection: 'row', gap: 9, paddingBottom: 10 }, searchFrame: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: '#E7E2EC', borderRadius: 11, minHeight: 45, backgroundColor: colors.background },
  searchInput: { flex: 1, minWidth: 0, fontFamily, fontSize: 16, color: colors.text, paddingVertical: 11, paddingHorizontal: 12 },
  searchSubmit: { minWidth: touchTarget, minHeight: touchTarget, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  clearSearch: { width: touchTarget, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', gap: 9, marginTop: 6, marginBottom: 16 },
  toolButton: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.line },
  sortButton: { flex: 1 }, sortLabel: { flex: 1 }, layoutButton: { width: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
  selectedTool: { backgroundColor: '#F5F0FA', borderColor: colors.primary },
  chips: { gap: 8, paddingBottom: 12 }, chip: { minHeight: touchTarget, paddingHorizontal: 13, paddingVertical: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#E8E3EC', borderRadius: 9, backgroundColor: colors.background, maxWidth: 210 },
  activeChip: { backgroundColor: colors.primary, borderColor: colors.primary }, white: { color: colors.background }, purple: { color: '#706878', fontSize: 11, fontWeight: '600' },
  list: { flexGrow: 1, gap: 16, paddingBottom: 26 }, results: { paddingBottom: 1, gap: 8 }, resultsTitle: { fontSize: 13, fontWeight: '700' },
  categoryLayout: { flex: 1, flexDirection: 'row', borderTopWidth: 1, borderColor: colors.line },
  sideSurface: { flexGrow: 0, backgroundColor: '#FAF8FC' }, sidebar: { paddingBottom: 18 }, sideCategory: { minHeight: touchTarget, paddingVertical: 14, paddingHorizontal: 10, borderStartWidth: 3, borderColor: 'transparent' },
  activeSide: { borderColor: colors.primary, backgroundColor: colors.background }, sideLabel: { fontSize: 11, lineHeight: 16, color: '#716877', fontWeight: '600' }, activeSideLabel: { color: colors.primary, fontWeight: '800' },
  categoryProducts: { flex: 1, backgroundColor: colors.background }, categoryContent: { flexGrow: 1, paddingTop: 13, paddingBottom: 30, paddingHorizontal: 14 }, categoryIntro: { gap: 14 },
  categoryPromo: { backgroundColor: '#EFE6F7', borderRadius: 12, minHeight: 104, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', padding: 12 },
  promoCopy: { flex: 1, gap: 5 }, kicker: { color: '#9A79BB', fontSize: 8, lineHeight: 12 },
  promoTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', letterSpacing: -0.4, color: '#392052' }, promoCaption: { fontSize: 10, lineHeight: 15, color: '#7C6792' },
  promoImage: { width: '42%', height: 86, borderRadius: 0, backgroundColor: '#EFE6F7' },
  categorySection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 3 }, categorySectionTitle: { fontSize: 13, lineHeight: 18 }, count: { color: colors.muted, fontSize: 11 },
  option: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: colors.line }, optionLabel: { flex: 1, fontSize: 12, fontWeight: '600' },
  filterChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, filterChoice: { minHeight: touchTarget, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 9, flexDirection: 'row', gap: 7, maxWidth: '100%' }, filterFooter: { gap: 8 },
});
