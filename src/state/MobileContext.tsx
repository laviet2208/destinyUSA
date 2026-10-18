import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { io } from 'socket.io-client';
import { api, apiBase, captureApiSession, getApiToken, isApiSessionCurrent, mediaUrl, setApiSession } from '../services/api';
import { addCartItem, eligibleVariant } from '../services/commerce';
import { walletIsVisible } from '../services/wallet-visibility';
import { appInfoFooterIsVisible } from '../services/footer-visibility';
import { referralButtonsAreVisible } from '../services/referral-visibility';
import { normalizeLanguage, translate, type Language } from '../ui/strings';
import type { FlashSchedule, Account, Banner, CartItem, Category, Channel, ContentRecord, PageResult, Product, Variant } from '../types';

type CatalogState = { products: Product[]; types: Category[]; directories: Category[]; banners: Banner[]; topIds: string[]; directoryIds: string[]; flashIds: string[]; flashActive: boolean; flashSchedule?: FlashSchedule; showWallet: boolean; showAppInfoFooter: boolean; showReferralButtons: boolean };
type LoginInput = { email: string; password: string; remember: boolean; savePassword: boolean };
type MobileState = {
  account: Account | null; guest: boolean; booting: boolean; bootError: string; language: Language;
  catalog: CatalogState; loading: boolean; error: string; revision: number;
  carts: Record<Channel, CartItem[]>; savedLogin: { email: string; password: string } | null;
  t: (key: string) => string; setLanguage: (value: Language) => Promise<void>; enterGuest: () => void;
  login: (input: LoginInput) => Promise<void>; signup: (input: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>; referral: (code: string) => Promise<void>; refreshAccount: () => Promise<void>;
  refresh: () => void; addToCart: (channel: Channel, product: Product, variant: Variant, quantity: number) => Promise<void>;
  updateCart: (channel: Channel, variantId: string, quantity: number) => Promise<void>; removeCart: (channel: Channel, ids: string[]) => void;
};
const initialCatalog: CatalogState = { products: [], types: [], directories: [], banners: [], topIds: [], directoryIds: [], flashIds: [], flashActive: false, showWallet: false, showAppInfoFooter: false, showReferralButtons: false };
const Context = createContext<MobileState | null>(null);
const recordValue = (rows: ContentRecord[], id: string) => rows.find(row => row.id === id)?.data;
const idList = (value: unknown): string[] => (Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []).map(item => typeof item === 'string' ? item : String(item?.id ?? '')).filter(Boolean);
const toCategory = (row: ContentRecord): Category => { const data = row.data as Record<string, unknown>; return { id: row.id, name: String(data.name ?? ''), image: mediaUrl(String(data.image ?? '')) }; };

export function MobileProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [guest, setGuest] = useState(false);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');
  const [language, updateLanguage] = useState<Language>('en');
  const [savedLogin, setSavedLogin] = useState<{ email: string; password: string } | null>(null);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [carts, setCarts] = useState<Record<Channel, CartItem[]>>({ regular: [], flashsale: [] });
  const cartRef = useRef(carts);
  const authAttempt = useRef(0);
  const displayVersion = useRef({ next: 0, applied: 0 });
  const authStorage = useRef(Promise.resolve());
  const queueAuthStorage = (operation: () => Promise<void>) => {
    const queued = authStorage.current.catch(() => {}).then(operation);
    authStorage.current = queued;
    return queued;
  };
  const writeCarts = (value: Record<Channel, CartItem[]>) => { cartRef.current = value; setCarts(value); };
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  const clearSession = useCallback(() => {
    authAttempt.current += 1;
    setApiSession(null); setAccount(null); setGuest(false); setBootError(''); setCatalog(initialCatalog); setError(''); setLoading(false); writeCarts({ regular: [], flashsale: [] });
    void queueAuthStorage(() => SecureStore.deleteItemAsync('destiny.session')).catch(() => {});
  }, []);
  const refreshAccount = useCallback(async () => { const session = captureApiSession(); const result = await api<Account>('/me'); if (isApiSessionCurrent(session)) { setAccount(result); setBootError(''); } }, []);
  useEffect(() => {
    let current = true;
    const boot = async () => {
      const [token, saved, locale] = await Promise.all([SecureStore.getItemAsync('destiny.session'), SecureStore.getItemAsync('destiny.saved-login'), SecureStore.getItemAsync('destiny.language')]);
      if (!current) return;
      updateLanguage(normalizeLanguage(locale));
      if (saved) { try { const value = JSON.parse(saved); if (typeof value.email === 'string' && typeof value.password === 'string') setSavedLogin(value); } catch {} }
      if (token) { setApiSession(token, clearSession); try { await refreshAccount(); } catch (failure) { if ((failure as { status?: number }).status !== 401) setBootError((failure as Error).message); } }
    };
    boot().catch(failure => setBootError((failure as Error).message)).finally(() => { if (current) setBooting(false); });
    return () => { current = false; };
  }, [clearSession, refreshAccount]);
  const establish = async (response: { token: string; account: Account }, remember: boolean, attempt: number, credentials?: { email: string; password: string } | null) => {
    if (response.account.role !== 'customer') throw new Error('Ứng dụng này chỉ dành cho khách hàng.');
    await queueAuthStorage(async () => {
      if (attempt !== authAttempt.current) return;
      if (remember) await SecureStore.setItemAsync('destiny.session', response.token);
      else await SecureStore.deleteItemAsync('destiny.session');
      if (credentials !== undefined) {
        if (credentials) await SecureStore.setItemAsync('destiny.saved-login', JSON.stringify(credentials));
        else await SecureStore.deleteItemAsync('destiny.saved-login');
      }
      if (attempt !== authAttempt.current) return;
      if (credentials !== undefined) setSavedLogin(credentials);
      writeCarts({ regular: [], flashsale: [] }); setCatalog(initialCatalog); setError('');
      setApiSession(response.token, clearSession); setAccount(response.account); setGuest(false); setBootError('');
    });
  };
  const login = async (input: LoginInput) => {
    const attempt = ++authAttempt.current;
    const response = await api<{ token: string; account: Account }>('/auth/login', 'POST', { email: input.email, password: input.password, remember: input.remember });
    await establish(response, input.remember, attempt, input.savePassword ? { email: input.email, password: input.password } : null);
  };
  const signup = async (input: { email: string; password: string; firstName: string; lastName: string }) => { const attempt = ++authAttempt.current; await establish(await api('/auth/signup', 'POST', input), true, attempt); };
  const logout = async () => {
    const session = captureApiSession();
    try {
      const token = await SecureStore.getItemAsync('destiny.push-token');
      if (!isApiSessionCurrent(session)) return;
      if (token) { await api('/devices', 'DELETE', { token }); if (!isApiSessionCurrent(session)) return; await SecureStore.deleteItemAsync('destiny.push-token'); }
      if (isApiSessionCurrent(session)) await api('/auth/logout', 'POST');
    } finally { if (isApiSessionCurrent(session)) clearSession(); }
  };
  const referral = async (code: string) => { await api('/auth/referral', 'POST', { code }); await refreshAccount(); };
  const setLanguage = async (value: Language) => { await SecureStore.setItemAsync('destiny.language', value); updateLanguage(value); };
  useEffect(() => {
    if (!guest && account?.status !== 'active') { setCatalog(initialCatalog); return; }
    const controller = new AbortController();
    const session = captureApiSession();
    const prefix = account ? '' : '/public';
    setLoading(true); setError('');
    const fetchContent = (name: string) => api<{ items: ContentRecord[] }>(`${prefix}/content/${name}`, 'GET', undefined, undefined, controller.signal);
    const load = async () => {
      const products: Product[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await api<PageResult<Product>>(`${prefix}/products?limit=100&offset=${offset}`, 'GET', undefined, undefined, controller.signal);
        products.push(...page.items);
        if (!page.items.length || products.length >= page.total) break;
      }
      const settingsRequest = ++displayVersion.current.next;
      const [types, directories, ads, ui, flash, wallet] = await Promise.all([fetchContent('productType'), fetchContent('productDirectory'), fetchContent('adsData'), fetchContent('UI'), fetchContent('Flashsale'), account ? fetchContent('isShowWallet') : Promise.resolve({ items: [] as ContentRecord[] })]);
      if (controller.signal.aborted || !isApiSessionCurrent(session)) return;
      const applySettings = settingsRequest >= displayVersion.current.applied;
      if (applySettings) displayVersion.current.applied = settingsRequest;
      setCatalog(previous => ({ products, types: types.items.map(toCategory), directories: directories.items.filter(row => Number((row.data as any).status ?? 1) === 1).map(toCategory), banners: ads.items.filter(row => Number((row.data as any).status) === 1).map(row => ({ id: row.id, image: mediaUrl((row.data as any).image), productId: (row.data as any).productId })), topIds: idList(recordValue(ui.items, 'productTop')), directoryIds: idList(recordValue(ui.items, 'productDirectory')), flashIds: idList(recordValue(flash.items, 'product')), flashActive: Number(recordValue(flash.items, 'isStart')) === 1, flashSchedule: recordValue(flash.items, 'schedule') ? { ...(recordValue(flash.items, 'schedule') as FlashSchedule), receivedAt: Date.now() } : undefined, showWallet: applySettings ? walletIsVisible(recordValue(wallet.items, '__value')) : previous.showWallet, showAppInfoFooter: applySettings ? appInfoFooterIsVisible(recordValue(ui.items, 'showAppInfoFooter')) : previous.showAppInfoFooter, showReferralButtons: applySettings ? referralButtonsAreVisible(recordValue(ui.items, 'showReferralButtons')) : previous.showReferralButtons }));
    };
    load().catch(failure => { if (!controller.signal.aborted) setError((failure as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [account?.id, account?.status, guest, revision]);
  useEffect(() => {
    if (!guest && account?.status !== 'active') return;
    const controller = new AbortController();
    const schedule = catalog.flashSchedule;
    const sync = () => {
      void api<{ items: ContentRecord[] }>((account ? '' : '/public') + '/content/Flashsale', 'GET', undefined, undefined, controller.signal).then(result => {
        if (controller.signal.aborted) return;
        const next = recordValue(result.items, 'schedule') as FlashSchedule | undefined;
        setCatalog(previous => ({ ...previous, flashIds: idList(recordValue(result.items, 'product')), flashActive: Number(recordValue(result.items, 'isStart')) === 1, flashSchedule: next ? { ...next, receivedAt: Date.now() } : undefined }));
      }).catch(() => {});
    };
    const serverNow = schedule ? Date.parse(schedule.serverNow) + Date.now() - (schedule.receivedAt ?? Date.now()) : Date.now();
    const boundary = schedule ? Date.parse(schedule.active ? schedule.endsAt : schedule.nextStartsAt) : serverNow;
    const timer = setTimeout(sync, Math.max(250, boundary - serverNow + 75));
    const poll = setInterval(sync, 60000);
    const active = AppState.addEventListener('change', state => { if (state === 'active') sync(); });
    return () => { controller.abort(); clearTimeout(timer); clearInterval(poll); active.remove(); };
  }, [account?.id, account?.status, guest, catalog.flashSchedule]);
  useEffect(() => {
    const activeAccount = account?.status === 'active';
    if (!guest && !activeAccount && account?.status !== 'referral_required') return;
    const socket = activeAccount ? io(apiBase, { auth: { token: getApiToken() } }) : null;
    const controller = new AbortController();
    const session = captureApiSession();
    const syncSettings = () => {
      const request = ++displayVersion.current.next;
      const prefix = activeAccount ? '' : '/public';
      void Promise.all([
        api<{ items: ContentRecord[] }>(`${prefix}/content/UI`, 'GET', undefined, undefined, controller.signal),
        activeAccount ? api<{ items: ContentRecord[] }>('/content/isShowWallet', 'GET', undefined, undefined, controller.signal) : Promise.resolve({ items: [] as ContentRecord[] }),
      ]).then(([ui, wallet]) => {
        if (!controller.signal.aborted && isApiSessionCurrent(session) && request >= displayVersion.current.applied) {
          displayVersion.current.applied = request;
          setCatalog(previous => ({ ...previous, showWallet: activeAccount ? walletIsVisible(recordValue(wallet.items, '__value')) : false, showAppInfoFooter: appInfoFooterIsVisible(recordValue(ui.items, 'showAppInfoFooter')), showReferralButtons: referralButtonsAreVisible(recordValue(ui.items, 'showReferralButtons')) }));
        }
      }).catch(() => {});
    };
    syncSettings();
    const pollSettings = setInterval(syncSettings, 30000);
    socket?.on('settings:changed', syncSettings);
    socket?.on('connect', syncSettings);
    const changed = () => { void refreshAccount().catch(() => {}); refresh(); };
    socket?.on('data:changed', changed);
    socket?.on('connect', changed);
    const onActive = AppState.addEventListener('change', state => { if (state === 'active') { syncSettings(); if (account) { void refreshAccount().catch(() => {}); refresh(); } } });
    return () => { controller.abort(); clearInterval(pollSettings); onActive.remove(); socket?.disconnect(); };
  }, [account?.id, account?.status, guest, refreshAccount, refresh]);
  const addToCart = async (channel: Channel, product: Product, variant: Variant, quantity: number) => {
    if (!account) throw new Error(translate(language, 'loginRequired'));
    const session = captureApiSession();
    const latest = await api<Product>(`/products/${encodeURIComponent(product.id)}`);
    const current = latest.variants.find(item => item.id === variant.id);
    if (!isApiSessionCurrent(session)) throw new Error(translate(language, 'loginRequired'));
    if (!current || !eligibleVariant(current, quantity)) throw new Error(translate(language, 'notEnoughStock'));
    writeCarts({ ...cartRef.current, [channel]: addCartItem(cartRef.current[channel], latest, current, quantity) });
  };
  const updateCart = async (channel: Channel, variantId: string, quantity: number) => {
    const session = captureApiSession();
    const item = cartRef.current[channel].find(row => row.variant.id === variantId);
    if (!item) return;
    const latest = await api<Product>(`/products/${encodeURIComponent(item.product.id)}`);
    const variant = latest.variants.find(row => row.id === variantId);
    if (!isApiSessionCurrent(session)) throw new Error(translate(language, 'loginRequired'));
    if (!variant || !eligibleVariant(variant, quantity)) throw new Error(translate(language, 'notEnoughStock'));
    writeCarts({ ...cartRef.current, [channel]: cartRef.current[channel].map(row => row.variant.id === variantId ? { product: latest, variant, quantity } : row) });
  };
  const removeCart = (channel: Channel, ids: string[]) => writeCarts({ ...cartRef.current, [channel]: cartRef.current[channel].filter(row => !ids.includes(row.variant.id)) });
  const t = useCallback((key: string) => translate(language, key), [language]);
  const value: MobileState = { account, guest, booting, bootError, language, catalog, loading, error, revision, carts, savedLogin, t, setLanguage, enterGuest: () => setGuest(true), login, signup, logout, referral, refreshAccount, refresh, addToCart, updateCart, removeCart };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useMobile() { const value = useContext(Context); if (!value) throw new Error('Missing MobileProvider'); return value; }
