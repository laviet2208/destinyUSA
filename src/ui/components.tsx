import { createContext, useContext, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type TextProps, type ViewStyle, type StyleProp } from 'react-native';
import { Image as CachedImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight, ImageOff, PackageOpen, RotateCw } from 'lucide-react-native';
import { colors, fontFamily, spacing, typography, touchTarget } from './theme';
import { translate, type Language } from './strings';
import { MotionPressable, MotionScreen, Skeleton, useMotionEnabled, usePressFeedback } from './motion';
import { imagePresentation } from './media';

export const UiDirection = createContext(false);
export const UiLanguage = createContext<Language>('en');
export function AppText({ variant = 'body', muted, style, ...props }: TextProps & { variant?: keyof typeof typography; muted?: boolean }) {
  const rtl = useContext(UiDirection);
  return <Text {...props} style={[{ color: muted ? colors.muted : colors.text, fontFamily, textAlign: rtl ? 'right' : 'left', writingDirection: rtl ? 'rtl' : 'ltr' }, typography[variant], style]}/>;
}
export function Button({ title, onPress, variant = 'primary', disabled, loading, icon, style }: { title: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; disabled?: boolean; loading?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle> }) {
  const blocked = disabled || loading;
  const feedback = usePressFeedback(Boolean(blocked));
  return <MotionPressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(blocked), busy: Boolean(loading) }} disabled={blocked} onPress={onPress} onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut} style={[feedback.style, styles.button, variant === 'primary' ? styles.primary : variant === 'secondary' ? styles.secondary : variant === 'danger' ? styles.danger : styles.quiet, blocked && styles.disabled, style]}>{loading ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary}/> : icon}<AppText variant="button" style={{ color: variant === 'primary' || variant === 'danger' ? '#fff' : colors.primary, textAlign: 'center', flexShrink: 1 }}>{title}</AppText></MotionPressable>;
}
export function IconButton({ label, onPress, children, disabled, plain = false, outlined = false }: { label: string; onPress: () => void; children: ReactNode; disabled?: boolean; plain?: boolean; outlined?: boolean }) {
  const feedback = usePressFeedback(Boolean(disabled));
  return <MotionPressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} onPress={onPress} onPressIn={feedback.onPressIn} onPressOut={feedback.onPressOut} disabled={disabled} style={[feedback.style, styles.iconButton, disabled && styles.disabled]}><View style={[styles.iconFace, outlined && styles.iconFaceOutlined, plain && styles.iconFacePlain]}>{children}</View></MotionPressable>;
}
export function Field({ label, error, trailing, style, ...props }: TextInputProps & { label: string; error?: string; trailing?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const rtl = useContext(UiDirection);
  const technical = props.secureTextEntry || props.keyboardType === 'email-address' || props.keyboardType === 'phone-pad' || props.keyboardType === 'number-pad' || props.autoCapitalize === 'none';
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>{label}</AppText><View style={[styles.inputFrame, focused && styles.inputFocused, error ? { borderColor: colors.danger } : null]}><TextInput {...props} accessibilityLabel={props.accessibilityLabel ?? label} placeholderTextColor={colors.muted} onFocus={event => { setFocused(true); props.onFocus?.(event); }} onBlur={event => { setFocused(false); props.onBlur?.(event); }} style={[styles.input, props.multiline && styles.multilineInput, props.editable === false && styles.readOnly, { writingDirection: technical ? 'ltr' : rtl ? 'rtl' : 'ltr', textAlign: technical ? 'left' : rtl ? 'right' : 'left' }, style]}/>{trailing}</View>{error && <AppText variant="caption" accessibilityRole="alert" style={{ color: colors.danger }}>{error}</AppText>}</View>;
}
export function Screen({ children, style, scroll = true, refreshing, onRefresh, surface = colors.background }: { children: ReactNode; style?: StyleProp<ViewStyle>; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void; surface?: string }) {
  const rtl = useContext(UiDirection);
  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: surface, direction: rtl ? 'rtl' : 'ltr' }]}><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><MotionScreen>{scroll ? <ScrollView keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary}/> : undefined} contentContainerStyle={[styles.scroll, style]}>{children}</ScrollView> : <View style={[styles.flex, style]}>{children}</View>}</MotionScreen></KeyboardAvoidingView></SafeAreaView>;
}
export function Header({ title, onBack, action }: { title: string; onBack?: () => void; action?: ReactNode }) {
  const rtl = useContext(UiDirection);
  const language = useContext(UiLanguage);
  return <View style={styles.header}>{onBack && <IconButton outlined label={translate(language, 'back')} onPress={onBack}><ArrowLeft size={22} color={colors.text} style={rtl ? { transform: [{ rotate: '180deg' }] } : undefined}/></IconButton>}<AppText variant="heading" style={styles.headerTitle}>{title}</AppText>{action}</View>;
}
export function SectionHeading({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  const rtl = useContext(UiDirection);
  return <View style={styles.sectionHeading}><AppText variant="heading" style={styles.flex}>{title}</AppText>{action && onPress && <Pressable accessibilityRole="button" onPress={onPress} style={styles.sectionAction}><AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>{action}</AppText><ChevronRight size={15} color={colors.primary} style={rtl ? { transform: [{ scaleX: -1 }] } : undefined}/></Pressable>}</View>;
}
export function Divider() { return <View style={styles.divider}/>; }
export function Notice({ message, danger }: { message: string; danger?: boolean }) {
  return <View style={[styles.notice, danger && { backgroundColor: '#FCF0F1' }]}><AppText accessibilityRole={danger ? 'alert' : undefined} variant="label" style={{ color: danger ? colors.danger : colors.primary }}>{message}</AppText></View>;
}
export function EmptyState({ title, message, action, onPress }: { title: string; message?: string; action?: string; onPress?: () => void }) {
  return <View style={styles.empty}><View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.emptyIcon}><PackageOpen size={36} strokeWidth={1.25} color={colors.secondary}/></View><AppText variant="heading" style={{ textAlign: 'center' }}>{title}</AppText>{message && <AppText muted style={{ textAlign: 'center' }}>{message}</AppText>}{action && onPress && <Button title={action} onPress={onPress} variant="secondary" style={styles.emptyAction}/>}</View>;
}
export function LoadingState() { return <View style={styles.empty}><View style={styles.loadingFrame}><ActivityIndicator size="large" color={colors.primary}/></View><Skeleton style={styles.loadingLine}/><Skeleton style={[styles.loadingLine, { width: 100 }]}/></View>; }
export function ProductImage({ uri, style, label, resizeMode = 'contain', inset = 0 }: { uri?: string; style?: StyleProp<ViewStyle>; label: string; resizeMode?: 'contain' | 'cover'; inset?: number }) {
  const [state, dispatch] = useReducer(imagePresentation, { uri, phase: 'loading', attempt: 0 });
  const language = useContext(UiLanguage);
  const motionEnabled = useMotionEnabled();
  const currentUri = useRef(uri);
  const mounted = useRef(true);
  currentUri.current = uri;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { dispatch({ type: 'source', uri }); }, [uri]);
  const phase = state.uri === uri ? state.phase : 'loading';
  const attempt = state.uri === uri ? state.attempt : 0;
  const update = (type: 'loaded' | 'error' | 'retry') => { if (mounted.current && currentUri.current === uri) dispatch({ type, uri, attempt }); };
  return <View style={[styles.image, style]}>
    {uri && phase === 'loading' && <Skeleton style={[StyleSheet.absoluteFill, { backgroundColor: colors.lavender }]}/>}
    {uri && phase !== 'error' ? <CachedImage key={`${uri}:${attempt}`} source={{ uri }} recyclingKey={`${uri}:${attempt}`} accessibilityLabel={label} contentFit={resizeMode} cachePolicy="memory-disk" transition={motionEnabled ? 180 : 0} style={[StyleSheet.absoluteFill, { top: inset, right: inset, bottom: inset, left: inset }]} onLoad={() => update('loaded')} onError={() => update('error')}/> : uri ? <Pressable accessibilityRole="button" accessibilityLabel={`${translate(language, 'tryAgain')} · ${label}`} onPress={event => { event.stopPropagation(); update('retry'); }} style={styles.imageRetry}><ImageOff size={24} strokeWidth={1.25} color={colors.muted}/><View style={styles.retryMark}><RotateCw size={12} color={colors.primary}/></View></Pressable> : <ImageOff size={28} strokeWidth={1.25} color={colors.muted}/>}
  </View>;
}
export function BottomAction({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.bottomAction, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>{children}</View>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, screen: { flex: 1, backgroundColor: colors.background }, scroll: { flexGrow: 1, paddingBottom: 26 },
  button: { minHeight: Math.max(47, touchTarget), paddingHorizontal: 15, paddingVertical: 14, borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },
  primary: { backgroundColor: colors.primary }, secondary: { backgroundColor: '#F1EBF8' }, quiet: { backgroundColor: 'transparent' }, danger: { backgroundColor: colors.danger },
  pressed: { opacity: 0.86 }, disabled: { opacity: 0.5 }, iconButton: { minWidth: touchTarget, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center' },
  iconFace: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  iconFaceOutlined: { width: 35, height: 35, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.background },
  iconFacePlain: { backgroundColor: 'transparent' },
  field: { gap: 7 }, fieldLabel: { fontSize: 11, lineHeight: 16, fontWeight: '600', color: '#675D70' },
  inputFrame: { minHeight: 45, borderWidth: 1, borderColor: '#E7E2EC', borderRadius: 11, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background },
  inputFocused: { borderColor: '#9B6CD2' }, readOnly: { color: colors.muted },
  input: { flex: 1, minWidth: 0, minHeight: 45, paddingHorizontal: 12, paddingVertical: 11, fontFamily, fontSize: Platform.OS === 'web' ? 16 : 14, lineHeight: 21, color: colors.text },
  multilineInput: { minHeight: 82, textAlignVertical: 'top' },
  header: { minHeight: 62, paddingHorizontal: 17, paddingTop: 4, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.background },
  headerTitle: { flex: 1, fontSize: 19, lineHeight: 25, fontWeight: '800', letterSpacing: -0.6 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 12 },
  sectionAction: { minHeight: touchTarget, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '40%' },
  divider: { height: 1, backgroundColor: colors.line },
  notice: { padding: 13, backgroundColor: colors.lavender, borderRadius: 11 },
  empty: { minHeight: 220, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 42, gap: 10 },
  emptyIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  emptyAction: { alignSelf: 'center', minWidth: 170, marginTop: 7 },
  loadingFrame: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.softPurple, alignItems: 'center', justifyContent: 'center' },
  loadingLine: { height: 8, width: 140, borderRadius: 4, backgroundColor: colors.lavender },
  image: { backgroundColor: '#F6F3F8', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 13 },
  imageRetry: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' },
  retryMark: { position: 'absolute', right: 6, bottom: 6, width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line },
  bottomAction: { paddingTop: 10, paddingHorizontal: 17, gap: 9, borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.background },
});
