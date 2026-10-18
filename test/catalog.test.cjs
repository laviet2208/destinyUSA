const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function loadPresentation() {
  const filename = path.join(__dirname, '../src/screens/catalog/presentation.ts');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports });
  return module.exports;
}

function renderHome(rtl) {
  const filename = path.join(__dirname, '../src/screens/catalog/HomeScreen.tsx');
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  const jsx = (type, props, key) => ({ type, props: props || {}, key });
  const ui = new Proxy({}, { get: (_, key) => String(key) });
  const theme = { colors: { primary: '#48217D', text: '#1F1830', muted: '#716B7D', surface: '#F8F7FA', lavender: '#EEE5F7', line: '#EAE7EE' }, spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, section: 32 }, radius: { control: 12, banner: 18 } };
  const imports = {
    react: { useContext: () => rtl, useState: value => [value, () => {}] },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { FlatList: 'FlatList', Pressable: 'Pressable', RefreshControl: 'RefreshControl', View: 'View', useWindowDimensions: () => ({ width: 390, height: 844 }), StyleSheet: { create: value => value, hairlineWidth: 1 } },
    'lucide-react-native': ui,
    '../../services/api': { mediaUrl: value => value },
    '../../ui/components': ui,
    '../../ui/theme': theme,
    '../../ui/FlashSaleHero': { FlashSaleHero: 'FlashSaleHero' },
    '../../ui/AdCarousel': { AdCarousel: 'AdCarousel' },
    '../../ui/BrandLogo': { BrandLogo: 'BrandLogo' },
    '../../ui/AppInfoFooter': { AppInfoFooter: 'AppInfoFooter' },
    './presentation': loadPresentation(),
    './catalog-ui': { ...ui, ProductCard: 'ProductCard', CategoryTile: 'CategoryTile', CatalogFeedback: 'CatalogFeedback', catalogStyles: { inset: {}, horizontal: {}, pressed: {} } },
  };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, require: name => { if (!(name in imports)) throw new Error(`Unexpected import ${name}`); return imports[name]; } });
  const actions = [];
  const products = [{ id: 'first' }, { id: 'second' }];
  const categories = Array.from({ length: 6 }, (_, index) => ({ id: `type-${index}`, name: `Category ${index}` }));
  const props = { t: key => key, onRefresh: () => {}, banners: [{ id: 'ad-1', image: 'first.jpg', productId: 'first' }, { id: 'ad-2', image: 'second.jpg', productId: 'second' }], categories, topProducts: products, flashProducts: products, cartCount: 2, onCart: () => actions.push(['cart']), onNotifications: () => actions.push(['notifications']), onFeatured: () => actions.push(['featured']), onQuickAdd: (...values) => actions.push(['quickAdd', ...values]), directorySections: [{ id: 'directory', name: 'Directory', products }], onSearch: () => {}, onFlashSale: () => {}, onAllCategories: () => {}, onCategory: (...values) => actions.push(values), onProduct: (...values) => actions.push(values), onBanner: (...values) => actions.push(values) };
  return { tree: module.exports.HomeScreen(props), props, actions };
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(value => find(value, predicate));
  return [...(predicate(node) ? [node] : []), ...Object.values(node.props || {}).flatMap(value => find(value, predicate))];
}

for (const rtl of [false, true]) test(`home uses grid previews, all categories and real callbacks in ${rtl ? 'RTL' : 'LTR'}`, () => {
  const { tree, props, actions } = renderHome(rtl);
  const vertical = find(tree, item => item.type === 'FlatList' && !item.props.horizontal)[0];
  assert.equal(vertical.props.removeClippedSubviews, false);
  assert.equal(vertical.props.ListFooterComponent.type, 'AppInfoFooter');
  const horizontal = find(tree, item => item.type === 'FlatList' && item.props.horizontal);
  assert.equal(horizontal.length, 1);
  assert.equal(horizontal[0].props.inverted, rtl);
  assert.equal(horizontal[0].props.data, props.categories);
  assert.equal(horizontal[0].props.data.length, 6);
  const ad = find(tree, item => item.type === 'AdCarousel')[0];
  assert.equal(ad.props.banners, props.banners);
  assert.equal(ad.props.rtl, rtl);
  const directory = vertical.props.renderItem({ item: props.directorySections[0] });
  assert.equal(find(directory, item => item.type === 'FlatList').length, 0);
  assert.equal(find(directory, item => item.type === 'ProductCard').length, props.topProducts.length);
  const tile = horizontal[0].props.renderItem({ item: props.categories[5] });
  tile.props.onPress();
  assert.deepEqual(actions[0], ['type-5', 'type']);
  ad.props.onPress(props.banners[0]);
  assert.equal(actions[1][0], props.banners[0]);
  const topCard = find(tree, item => item.type === 'ProductCard')[0];
  assert.equal(topCard.props.onProduct, props.onProduct);
  topCard.props.onQuickAdd('first', 'regular');
  assert.deepEqual(actions[2], ['quickAdd', 'first', 'regular']);
  const flashEntry = find(tree, item => item.type === 'FlashSaleHero')[0];
  assert.equal(flashEntry.props.onPress, props.onFlashSale);
  const children = vertical.props.ListHeaderComponent.props.children[1].props.children;
  assert.ok(children.findIndex(child => find(child, item => item.type === 'FlashSaleHero').length) > children.findIndex(child => find(child, item => item.type === 'AdCarousel').length));
});

test('phone geometry keeps two columns inside 320–480px phones without tablet breakpoints', () => {
  const { phoneLayout } = loadPresentation();
  for (const width of [320, 360, 390, 430, 480]) {
    const value = phoneLayout(width);
    assert.equal(value.cardWidth * 2 + value.gap + value.padding * 2, width);
    assert.ok(value.categoryCardWidth > 80);
    assert.ok(value.categoryCardWidth * 2 + value.gap + value.padding * 2 + value.sidebarWidth <= width);
    assert.ok(value.categoryWidth * 5 + value.gap * 4 <= value.contentWidth);
    assert.ok(value.sidebarWidth >= 82 && value.sidebarWidth <= 110);
  }
});

test('catalog search, category type/directory and sort are presentation-only, with absent prices last', () => {
  const { browseProducts } = loadPresentation();
  const products = [
    { id: 'a', name: 'Đèn bàn', type_id: 'home', directory_id: 'new', variants: [{ price: '25' }, { price: '15' }] },
    { id: 'b', name: 'Áo trắng', type_id: 'wear', directory_id: 'new', variants: [{ price: '7' }] },
    { id: 'c', name: 'Đèn ngủ', type_id: 'home', directory_id: 'old', variants: [] },
  ];
  const original = JSON.stringify(products);
  const ids = options => Array.from(browseProducts(products, options), item => item.id);
  assert.deepEqual(ids({ query: ' den  ' }), ['a', 'c']);
  assert.deepEqual(ids({ categoryId: 'home', kind: 'type' }), ['a', 'c']);
  assert.deepEqual(ids({ categoryId: 'new', kind: 'directory' }), ['a', 'b']);
  assert.deepEqual(ids({ sort: 'priceLowHigh' }), ['b', 'a', 'c']);
  assert.deepEqual(ids({ sort: 'priceHighLow' }), ['a', 'b', 'c']);
  assert.deepEqual(ids({ sort: 'sortByName' }), ['b', 'a', 'c']);
  assert.deepEqual(ids({ query: 'missing', categoryId: 'home' }), []);
  assert.equal(JSON.stringify(products), original);
});

test('all sixteen languages include browsing labels and no Arabic dictionary', () => {
  const directory = path.join(__dirname, '../src/ui/locales');
  const files = fs.readdirSync(directory).filter(filename => filename.endsWith('.ts'));
  assert.equal(files.length, 16);
  assert.ok(!files.includes('ar.ts'));
  for (const filename of files) {
    const content = fs.readFileSync(path.join(directory, filename), 'utf8');
    for (const key of ['filter', 'defaultOrder', 'priceLowHigh', 'priceHighLow', 'sortByName', 'sortBy', 'gridView', 'listView', 'clearFilters', 'clearCart', 'clearCartConfirm', 'quickAdd']) assert.match(content, new RegExp(`"${key}"\\s*:`), filename);
  }
});

test('mobile web preview accepts only phone widths for the shopping interface', () => {
  const source = fs.readFileSync(path.join(__dirname, '../scripts/phone-preview.html'), 'utf8');
  const script = source.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [query, expected] of [['?width=320', '320px'], ['?width=360', '360px'], ['?width=390', '390px'], ['?width=430', '430px'], ['?width=480', '480px'], ['?width=1024', '430px'], ['?width=invalid', '430px'], ['', '430px']]) {
    const frame = { style: { maxWidth: '430px' } };
    vm.runInNewContext(script, { URLSearchParams, location: { search: query }, navigator: { userAgent: 'Mozilla/5.0 (iPhone)', maxTouchPoints: 5 }, document: { querySelector: selector => { assert.equal(selector, 'iframe'); return frame; } } });
    assert.equal(frame.style.maxWidth, expected);
  }
});
