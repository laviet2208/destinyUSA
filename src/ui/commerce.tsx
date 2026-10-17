import { useContext, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { AppText, Header, IconButton, UiDirection } from './components';
import { colors, touchTarget } from './theme';
import { useMotionEnabled } from './motion';

export function PageSection({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.section, style]}>{(title || action) && <View style={styles.sectionHeading}>{title && <AppText style={styles.sectionTitle}>{title}</AppText>}{action}</View>}{children}</View>;
}

export function StatusPill({ label, tone = 'purple' }: { label: string; tone?: 'purple' | 'success' | 'danger' | 'neutral' }) {
  const tint = tone === 'success' ? colors.success : tone === 'danger' ? colors.danger : tone === 'neutral' ? '#736B7B' : colors.primary;
  return <View style={[styles.pill, { backgroundColor: tone === 'success' ? '#E8F6EF' : tone === 'danger' ? '#FCECEF' : tone === 'neutral' ? '#F5F3F5' : '#F2EDF7' }]}><AppText style={[styles.pillText, { color: tint }]}>{label}</AppText></View>;
}

export function SegmentedControl<Value extends string>({ items, value, onChange, disabled, style }: { items: { value: Value; label: string }[]; value: Value; onChange: (value: Value) => void; disabled?: boolean; style?: StyleProp<ViewStyle> }) {
  return <View accessibilityRole="tablist" style={[styles.segments, style]}>{items.map(item => <Pressable key={item.value} accessibilityRole="tab" accessibilityState={{ selected: value === item.value, disabled: Boolean(disabled) }} disabled={disabled} onPress={() => onChange(item.value)} style={[styles.segment, value === item.value && styles.segmentActive]}><AppText style={[styles.segmentText, value === item.value && styles.segmentTextActive]}>{item.label}</AppText></Pressable>)}</View>;
}

export function BottomSheet({ visible, title, closeLabel, onClose, children, footer, busy = false, scroll = true }: { visible: boolean; title: string; closeLabel: string; onClose: () => void; children: ReactNode; footer?: ReactNode; busy?: boolean; scroll?: boolean }) {
  const motion = useMotionEnabled();
  const rtl = useContext(UiDirection);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  return <Modal visible={visible} transparent animationType={motion ? 'slide' : 'none'} statusBarTranslucent onRequestClose={() => { if (!busy) onClose(); }}>
    <KeyboardAvoidingView style={[styles.overlay, { direction: rtl ? 'rtl' : 'ltr' }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} disabled={busy} onPress={onClose} style={styles.backdrop}/>
      <SafeAreaView edges={['left', 'right']} accessibilityViewIsModal style={[styles.sheet, { maxHeight: Math.min(height * 0.88, height - insets.top - 12), paddingBottom: Math.max(18, insets.bottom) }]}>
        <View accessibilityElementsHidden style={styles.handle}/>
        <Header title={title} action={<IconButton label={closeLabel} disabled={busy} onPress={onClose}><X size={19} color={colors.text}/></IconButton>}/>
        {scroll ? <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>{children}</ScrollView> : <View style={styles.sheetBody}>{children}</View>}
        {footer && <View style={styles.sheetFooter}>{footer}</View>}
      </SafeAreaView>
    </KeyboardAvoidingView>
  </Modal>;
}

const styles = StyleSheet.create({
  section: { paddingVertical: 16, paddingHorizontal: 18, borderBottomWidth: 8, borderColor: colors.surface, gap: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  sectionTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '800', letterSpacing: -0.3 },
  pill: { alignSelf: 'flex-start', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 7 },
  pillText: { fontSize: 10, lineHeight: 14, fontWeight: '700' },
  segments: { flexDirection: 'row', padding: 4, gap: 3, marginHorizontal: 18, marginTop: 3, marginBottom: 11, borderRadius: 11, backgroundColor: '#F3F0F5' },
  segment: { flex: 1, minHeight: touchTarget, paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  segmentActive: { backgroundColor: colors.background },
  segmentText: { color: '#817588', fontWeight: '600', fontSize: 12, lineHeight: 17, textAlign: 'center' },
  segmentTextActive: { color: colors.primary, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', inset: 0, backgroundColor: '#1E142877' },
  sheet: { flexShrink: 1, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.background, overflow: 'hidden' },
  handle: { height: 4, width: 39, borderRadius: 10, backgroundColor: '#D7CCD9', alignSelf: 'center', marginTop: 11, marginBottom: 3 },
  sheetBody: { paddingHorizontal: 18, paddingBottom: 8, gap: 15, flexShrink: 1 },
  sheetFooter: { paddingHorizontal: 18, paddingTop: 15 },
});
