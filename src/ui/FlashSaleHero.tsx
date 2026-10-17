import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, Easing, Platform, Pressable, StyleSheet, View } from 'react-native';
import { ArrowUpRight, Flame, Zap } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import type { FlashSchedule } from '../types';
import { AppText } from './components';
import { useMotionEnabled } from './motion';

export function flashCountdown(schedule: FlashSchedule, localNow = Date.now()) {
  const now = Date.parse(schedule.serverNow) + localNow - (schedule.receivedAt ?? localNow);
  const day = Math.floor((now - Date.parse(schedule.startsAt)) / 86400000);
  let start = Date.parse(schedule.startsAt) + day * 86400000;
  if (now >= start + 7 * 3600000) start += 86400000;
  const active = now >= start && now < start + 7 * 3600000;
  const seconds = Math.max(0, Math.ceil(((active ? start + 7 * 3600000 : start) - now) / 1000));
  return { active, parts: [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(value => String(value).padStart(2, '0')) };
}

export function FlashSaleHero({ schedule, count, t, onPress }: { schedule?: FlashSchedule; count: number; t: (key: string) => string; onPress?: () => void }) {
  const [now, setNow] = useState(Date.now());
  const enabled = useMotionEnabled();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { setForeground(state === 'active'); if (state === 'active') setNow(Date.now()); });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    setNow(Date.now());
    if (!focused || !foreground) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [focused, foreground]);
  useEffect(() => {
    progress.setValue(0);
    if (!enabled || !focused || !foreground) return;
    const animation = Animated.loop(Animated.sequence([Animated.timing(progress, { toValue: 1, duration: 2300, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web', isInteraction: false }), Animated.delay(1700)]));
    animation.start(); return () => animation.stop();
  }, [enabled, focused, foreground, progress]);
  const countdown = schedule ? flashCountdown(schedule, now) : null;
  const content = <><View pointerEvents="none" style={styles.orbit}/><Animated.View pointerEvents="none" style={[styles.glow, { opacity: enabled ? progress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.24, 0] }) : 0, transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-130, 380] }) }, { rotate: '24deg' }] }]}/><View style={styles.top}><View style={styles.titleRow}><View style={styles.icon}><Flame size={19} color="#FFDEA0" fill="#FFDEA0"/></View><AppText style={styles.title}>FLASH SALE</AppText></View><View style={styles.live}><View style={[styles.liveDot, !countdown?.active && styles.waitDot]}/><AppText style={styles.liveText}>{t(countdown?.active ? 'saleLive' : 'saleUpcoming')}</AppText></View></View><View style={styles.bottom}><View style={styles.copy}><AppText style={styles.label}>{t(countdown?.active ? 'saleEndsIn' : 'saleStartsIn')}</AppText><View style={styles.clock}>{(countdown?.parts ?? ['—', '—', '—']).map((part, index) => <View key={index} style={styles.clockPart}>{index > 0 && <AppText style={styles.colon}>:</AppText>}<View style={styles.digit}><AppText style={styles.digitText}>{part}</AppText></View></View>)}</View><AppText style={styles.hours}>13:30 – 20:30 · {t('vietnamTime')}</AppText></View><View style={styles.cta}><Zap size={35} fill="#FFDB91" color="#FFDB91"/><View style={styles.explore}><AppText style={styles.count}>{count} {t('products')}</AppText>{onPress && <ArrowUpRight size={18} color="#FFE7B8"/>}</View></View></View></>;
  return onPress ? <Pressable accessibilityRole="button" accessibilityLabel={t('flashSale')} onPress={onPress} style={styles.card}>{content}</Pressable> : <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#A52235', borderRadius: 18, padding: 16, overflow: 'hidden', gap: 17 },
  orbit: { position: 'absolute', width: 190, height: 190, borderWidth: 24, borderColor: '#B83143', borderRadius: 100, right: -70, top: -75 },
  glow: { position: 'absolute', top: -90, bottom: -90, width: 60, backgroundColor: '#FFE5B4' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 7 }, titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { width: 27, height: 27, borderRadius: 9, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 20, lineHeight: 26, letterSpacing: -0.7, fontWeight: '900', color: '#FFF4DD', fontStyle: 'italic' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7F152A', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 20 }, liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#9BFFB4' }, waitDot: { backgroundColor: '#FFD99B' }, liveText: { color: '#FFF4DD', fontSize: 9, lineHeight: 13, fontWeight: '600' },
  bottom: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'space-between' }, copy: { flex: 1, gap: 7 }, label: { color: '#FFE0D9', fontSize: 11, lineHeight: 15 }, clock: { flexDirection: 'row', gap: 5 }, clockPart: { flexDirection: 'row', alignItems: 'center', gap: 5 }, digit: { backgroundColor: '#FFF5E4', minWidth: 35, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 5 }, digitText: { color: '#961E32', fontSize: 19, lineHeight: 25, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] }, colon: { color: '#FFE3B4', fontSize: 17, fontWeight: '700' }, hours: { fontSize: 9, lineHeight: 14, color: '#FFCBCB' },
  cta: { alignItems: 'flex-end', gap: 14 }, explore: { flexDirection: 'row', alignItems: 'center', gap: 4 }, count: { fontSize: 10, color: '#FFE7B8', fontWeight: '600' },
});
