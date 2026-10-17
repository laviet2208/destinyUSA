import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Keyboard, Pressable, StyleSheet, TextInput, View, type ViewToken } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImagePlus, Send } from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { io } from 'socket.io-client';
import { useMobile } from '../state/MobileContext';
import { api, apiBase, getApiToken, mediaUrl } from '../services/api';
import { imageUploadForm } from '../services/image-upload';
import { AppText, Button, EmptyState, Header, IconButton, Notice, ProductImage, Screen } from '../ui/components';
import { colors } from '../ui/theme';

type Message = { id: string; client_id: string | null; seq: number; sender_role: string; kind: 'text' | 'image'; content: string; created_at: string | null };
type ChatPage = { items: Message[]; nextBefore: number | null; receipts: { role: string; read_seq: number }[] };
type Draft = { clientId: string; kind: 'text' | 'image'; content: string; asset?: ImagePicker.ImagePickerAsset; error?: string };

export function ChatScreen({ navigation }: any) {
  const { account, t, language } = useMobile(); const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]); const [drafts, setDrafts] = useState<Draft[]>([]); const [text, setText] = useState(''); const [error, setError] = useState(''); const [before, setBefore] = useState<number | null>(null); const [loading, setLoading] = useState(false); const [adminRead, setAdminRead] = useState(0);
  const list = useRef<FlatList<Message>>(null); const live = useRef(true); const atBottom = useRef(true); const initialScroll = useRef(true); const sentRead = useRef(0); const visibleSeq = useRef(0); const sending = useRef(new Set<string>()); const staged = useRef(new Map<string, Draft>()); const foreground = useRef(AppState.currentState === 'active'); const canRead = useRef(focused); canRead.current = focused;
  const chatId = account?.id;
  const path = `/chat/${encodeURIComponent(chatId ?? '')}`;
  const merge = useCallback((items: Message[]) => setMessages(previous => [...new Map([...previous, ...items].map(item => [item.id, item])).values()].sort((left, right) => left.seq - right.seq)), []);
  const markRead = useCallback(async (seq: number) => {
    if (!chatId || !canRead.current || !foreground.current || seq <= sentRead.current) return;
    try { await api(`${path}/read`, 'POST', { seq }); sentRead.current = Math.max(sentRead.current, seq); } catch {}
  }, [chatId, path]);
  const read = useRef(markRead); read.current = markRead;
  const viewability = useRef(({ viewableItems }: { viewableItems: ViewToken<Message>[] }) => { const seq = Math.max(0, ...viewableItems.map(item => item.item.seq)); visibleSeq.current = seq; void read.current(seq); });
  const load = useCallback(async (older = false) => {
    if (!chatId) return; setLoading(true); setError('');
    try {
      const result = await api<ChatPage>(`${path}/messages?limit=40${older && before ? `&before=${before}` : ''}`);
      if (!live.current) return;
      merge(result.items); setBefore(previous => older || previous === null ? result.nextBefore : result.nextBefore === null ? previous : Math.min(previous, result.nextBefore)); setAdminRead(previous => Math.max(previous, ...result.receipts.filter(item => item.role === 'admin').map(item => item.read_seq), 0));
    } catch (failure) { if (live.current) setError((failure as Error).message); }
    finally { if (live.current) setLoading(false); }
  }, [chatId, path, before, merge]);
  const reload = useRef(load); reload.current = load;
  useEffect(() => {
    live.current = true; if (!chatId) return;
    void reload.current();
    const socket = io(apiBase, { auth: { token: getApiToken() } });
    socket.on('connect', () => { socket.emit('chat:join', chatId); void reload.current(); });
    socket.on('chat:message', (message: Message & { conversation_id: string }) => { if (message.conversation_id === chatId) merge([message]); });
    socket.on('chat:read', (receipt: { role: string; read_seq: number; conversation_id: string }) => { if (receipt.role === 'admin' && receipt.conversation_id === chatId) setAdminRead(previous => Math.max(previous, receipt.read_seq)); });
    const state = AppState.addEventListener('change', value => { foreground.current = value === 'active'; if (foreground.current && canRead.current) { void reload.current(); void read.current(visibleSeq.current); } });
    return () => { live.current = false; state.remove(); socket.emit('chat:leave', chatId); socket.disconnect(); };
  }, [chatId, merge]);
  useEffect(() => { if (focused) { void reload.current(); void markRead(visibleSeq.current); } }, [focused, markRead]);
  const sendDraft = async (draft: Draft) => {
    if (!chatId || sending.current.has(draft.clientId)) return;
    sending.current.add(draft.clientId);
    setDrafts(previous => previous.map(item => item.clientId === draft.clientId ? { ...item, error: undefined } : item));
    try {
      let prepared = staged.current.get(draft.clientId) ?? draft;
      if (prepared.asset) {
        const form = await imageUploadForm(prepared.asset);
        const result = await api<{ url: string }>('/media', 'POST', form);
        prepared = { ...prepared, asset: undefined, content: result.url }; staged.current.set(prepared.clientId, prepared);
      }
      if (!live.current) return;
      const result = await api<Message>(`${path}/messages`, 'POST', { clientId: prepared.clientId, kind: prepared.kind, content: prepared.content });
      if (!live.current) return;
      merge([result]); staged.current.delete(draft.clientId); setDrafts(previous => previous.filter(item => item.clientId !== draft.clientId)); atBottom.current = true; void load();
    } catch (failure) { if (live.current) setDrafts(previous => previous.map(item => item.clientId === draft.clientId ? { ...item, error: (failure as Error).message } : item)); }
    finally { sending.current.delete(draft.clientId); }
  };
  const stage = (draft: Draft) => { staged.current.set(draft.clientId, draft); setDrafts(previous => [...previous, draft]); void sendDraft(draft); };
  const sendText = () => { const content = text.trim(); if (!content) return; setText(''); stage({ clientId: randomUUID(), kind: 'text', content }); };
  const pickImage = async () => {
    try { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 }); if (result.canceled) return; const asset = result.assets[0]; if ((asset.fileSize ?? 0) > 20 * 1024 * 1024) throw new Error(t('imageTooLarge')); stage({ clientId: randomUUID(), kind: 'image', content: asset.uri, asset }); }
    catch (failure) { Alert.alert(t('loadError'), (failure as Error).message); }
  };
  const [composerHeight, setComposerHeight] = useState(44);
  useEffect(() => { if (!text) setComposerHeight(44); }, [text]);
  if (!account) return <Screen><EmptyState title={t('loginRequired')} action={t('login')} onPress={() => navigation.navigate('welcome_screen')}/></Screen>;
  return <Screen scroll={false}>
    <Header title={`Destiny USA · ${t('supportLabel')}`} onBack={() => navigation.goBack()}/>
    {error && <View style={styles.error}><Notice message={error} danger/><Button title={t('tryAgain')} onPress={() => void load()}/></View>}
    <FlatList ref={list} data={messages} keyExtractor={item => item.id} contentContainerStyle={styles.messages} maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      onViewableItemsChanged={viewability.current} viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      onScroll={event => { const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent; atBottom.current = contentSize.height - layoutMeasurement.height - contentOffset.y < 70; }} scrollEventThrottle={32}
      onContentSizeChange={() => { if (initialScroll.current || atBottom.current) { list.current?.scrollToEnd({ animated: false }); initialScroll.current = false; } }}
      ListHeaderComponent={before ? <Button title={t('older')} loading={loading} onPress={() => void load(true)} variant="quiet"/> : loading ? <ActivityIndicator color={colors.primary}/> : null}
      ListEmptyComponent={!loading ? <EmptyState title={t('noMessages')}/> : null}
      renderItem={({ item, index }) => {
        const own = item.sender_role === 'customer';
        const day = chatDay(item.created_at);
        const showDay = Boolean(day) && (index === 0 || day !== chatDay(messages[index - 1]?.created_at ?? null));
        return <View>
          {showDay && <AppText style={styles.dayLabel}>{new Date(item.created_at!).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' })}</AppText>}
          <View style={[styles.messageLine, own ? styles.own : styles.peer]}><View style={[styles.bubble, own ? styles.ownBubble : styles.peerBubble]}>
            {item.kind === 'image' ? <Pressable accessibilityRole="button" accessibilityLabel={t('viewImage')} onPress={() => { Keyboard.dismiss(); navigation.navigate('chat_image_preview', { uri: mediaUrl(item.content) }); }}><ProductImage uri={mediaUrl(item.content)} label={t('chooseImage')} style={styles.chatImage}/></Pressable> : <AppText selectable style={[styles.messageText, own ? { color: colors.background } : undefined]}>{item.content}</AppText>}
            <AppText muted style={[styles.timestamp, own ? styles.ownTimestamp : undefined]}>{item.created_at ? new Date(item.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : t('dateUnknown')}{own ? ` · ${t(item.seq <= adminRead ? 'seen' : 'sent')}` : ''}</AppText>
          </View></View>
        </View>;
      }}
      ListFooterComponent={<View>{drafts.map(draft => <Pressable key={draft.clientId} disabled={!draft.error} onPress={() => void sendDraft(draft)} style={[styles.messageLine, styles.own]}><View style={[styles.bubble, styles.ownBubble]}>{draft.kind === 'image' ? <ProductImage uri={mediaUrl(draft.content)} label={t('chooseImage')} style={styles.chatImage}/> : <AppText style={{ color: colors.background }}>{draft.content}</AppText>}{draft.error ? <AppText variant="caption" style={styles.draftError}>{t('failedSend')}</AppText> : <ActivityIndicator size="small" color={colors.background}/>}</View></Pressable>)}</View>}/>
    <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 11) }]}>
      <View style={styles.attachButton}><IconButton label={t('chooseImage')} onPress={() => void pickImage()}><ImagePlus size={18} color={colors.primary}/></IconButton></View>
      <TextInput accessibilityLabel={t('message')} placeholder={t('message')} placeholderTextColor={colors.muted} value={text} onChangeText={setText} multiline numberOfLines={1} maxLength={10000} onContentSizeChange={event => setComposerHeight(Math.max(44, Math.min(132, Math.ceil(event.nativeEvent.contentSize.height))))} style={[styles.messageInput, { height: composerHeight }]}/>
      <View style={[styles.sendButton, !text.trim() && styles.sendDisabled]}><IconButton label={t('send')} disabled={!text.trim()} onPress={sendText}><Send size={19} color={text.trim() ? colors.background : colors.muted}/></IconButton></View>
    </View>
  </Screen>;
}

export function ChatImageScreen({ navigation, route }: any) {
  const { t } = useMobile();
  const uri = typeof route.params?.uri === 'string' ? route.params.uri : undefined;
  return <Screen scroll={false}><Header title={t('viewImage')} onBack={() => navigation.goBack()}/><View style={styles.preview}><ProductImage uri={uri} label={t('viewImage')} style={styles.previewImage}/></View></Screen>;
}

function chatDay(value: string | null) {
  if (!value || !Number.isFinite(Date.parse(value))) return '';
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

const styles = StyleSheet.create({
  dayLabel: { fontSize: 10, lineHeight: 15, color: '#9A8F9F', textAlign: 'center', marginTop: 8, marginBottom: 15 }, draftError: { fontSize: 10, lineHeight: 15, color: '#FFD2DA' }, preview: { flex: 1, padding: 12 }, previewImage: { width: '100%', height: '100%', backgroundColor: colors.background, borderRadius: 0 },
  messages: { flexGrow: 1, paddingHorizontal: 17, paddingVertical: 17, backgroundColor: colors.background }, error: { padding: 18 },
  messageLine: { marginVertical: 7, maxWidth: '83%' }, own: { alignSelf: 'flex-end' }, peer: { alignSelf: 'flex-start' },
  bubble: { paddingVertical: 12, paddingHorizontal: 13, gap: 7, borderRadius: 13 }, ownBubble: { backgroundColor: colors.primary, borderBottomRightRadius: 4 }, peerBubble: { backgroundColor: '#F2EDF7', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 12, lineHeight: 19, color: '#51415E' }, timestamp: { fontSize: 9, lineHeight: 13, color: '#81768B' }, ownTimestamp: { color: '#D9C8E8' },
  chatImage: { width: 220, maxWidth: '100%', aspectRatio: 1, borderRadius: 9 },
  composer: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingHorizontal: 15, paddingTop: 11, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.background },
  attachButton: { backgroundColor: '#F2EDF7', borderRadius: 11 }, sendButton: { backgroundColor: colors.primary, borderRadius: 11 }, sendDisabled: { backgroundColor: colors.lavender },
  messageInput: { flex: 1, minWidth: 0, maxHeight: 132, minHeight: 44, fontSize: 16, lineHeight: 22, color: colors.text, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10 },
});
