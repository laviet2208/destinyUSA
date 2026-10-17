import type { Product } from '../../types';

export type BrowseSort = 'default' | 'priceLowHigh' | 'priceHighLow' | 'sortByName';
export type BrowseLayout = 'grid' | 'list';

export function phoneLayout(width: number) {
  const padding = width < 350 ? 14 : 18;
  const gap = 11;
  const contentWidth = Math.max(0, width - padding * 2);
  const sidebarWidth = Math.max(82, Math.min(95, width * 0.244));
  return { padding, gap, contentWidth, cardWidth: Math.max(0, (contentWidth - gap) / 2), sidebarWidth, categoryCardWidth: Math.max(0, (width - sidebarWidth - padding * 2 - gap - 1) / 2), categoryWidth: Math.max(44, Math.floor((contentWidth - gap * 4) / 5)) };
}

export function searchText(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase().replace(/đ/g, 'd').trim();
}

function minimumPrice(product: Product) {
  const prices = product.variants.map(variant => Number(variant.price)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : Infinity;
}

export function browseProducts(products: Product[], { query = '', categoryId = '', kind = 'type', sort = 'default' }: { query?: string; categoryId?: string; kind?: 'type' | 'directory'; sort?: BrowseSort } = {}) {
  const normalized = searchText(query);
  const result = products.filter(product => (!categoryId || (kind === 'type' ? product.type_id : product.directory_id) === categoryId) && (!normalized || searchText(product.name).includes(normalized)));
  if (sort === 'priceLowHigh') result.sort((left, right) => minimumPrice(left) - minimumPrice(right));
  if (sort === 'priceHighLow') result.sort((left, right) => {
    const first = minimumPrice(left); const second = minimumPrice(right);
    if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
    if (!Number.isFinite(second)) return -1;
    return second - first;
  });
  if (sort === 'sortByName') result.sort((left, right) => left.name.localeCompare(right.name));
  return result;
}
