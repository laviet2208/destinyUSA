import { useEffect, useRef, useState } from 'react';
import { Animated, AppState, FlatList, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import type { Banner } from '../types';
import { mediaUrl } from '../services/api';
import { ProductImage } from './components';
import { useMotionEnabled } from './motion';

export function AdCarousel({ banners, width, padding, rtl, label, onPress }: { banners: Banner[]; width: number; padding: number; rtl: boolean; label: string; onPress: (banner: Banner) => void }) {
  const list = useRef<FlatList<Banner>>(null);
  const position = useRef(new Animated.Value(0)).current;
  const indexRef = useRef(0);
  const pausedUntil = useRef(0);
  const [index, setIndex] = useState(0);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const focused = useIsFocused();
  const motion = useMotionEnabled();
  const stride = width + 10;
  const slides = banners.length > 1 ? [...banners, banners[0]] : banners;
  const identity = banners.map(banner => banner.id).join('|');
  const select = (target: number, animated: boolean) => {
    const next = Math.min(slides.length - 1, Math.max(0, target));
    indexRef.current = next; setIndex(next % banners.length);
    list.current?.scrollToOffset({ offset: next * stride, animated });
  };
  useEffect(() => { indexRef.current = 0; setIndex(0); position.setValue(0); list.current?.scrollToOffset({ offset: 0, animated: false }); }, [identity, stride, rtl, position]);
  useEffect(() => { const subscription = AppState.addEventListener('change', state => setForeground(state === 'active')); return () => subscription.remove(); }, []);
  useEffect(() => {
    if (!motion || !focused || !foreground || banners.length < 2) return;
    const timer = setInterval(() => { if (Date.now() >= pausedUntil.current) select(indexRef.current + 1, true); }, 5500);
    return () => clearInterval(timer);
  }, [motion, focused, foreground, identity, stride]);
  return <View style={styles.section}><Animated.FlatList ref={list} key={`${Math.round(width)}-${rtl}`} horizontal inverted={rtl} data={slides} keyExtractor={(banner, slideIndex) => `${banner.id}:${slideIndex}`} showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: padding, gap: 10 }} snapToInterval={stride} decelerationRate="fast" disableIntervalMomentum scrollEventThrottle={16} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: position } } }], { useNativeDriver: Platform.OS !== 'web' })} onScrollBeginDrag={() => { pausedUntil.current = Date.now() + 11000; }} onScrollEndDrag={() => { pausedUntil.current = Date.now() + 11000; }} onMomentumScrollEnd={event => { const next = Math.min(slides.length - 1, Math.max(0, Math.round(Math.abs(event.nativeEvent.contentOffset.x) / stride))); indexRef.current = next; setIndex(next % banners.length); if (next === banners.length) select(0, false); }} renderItem={({ item: banner, index: itemIndex }) => <Animated.View style={{ width, opacity: motion ? position.interpolate({ inputRange: [(itemIndex - 1) * stride, itemIndex * stride, (itemIndex + 1) * stride], outputRange: [0.85, 1, 0.85], extrapolate: 'clamp' }) : 1 }}><Pressable accessibilityRole="button" accessibilityLabel={`${label} ${itemIndex % banners.length + 1}/${banners.length}`} onPress={() => onPress(banner)} style={styles.banner}><ProductImage uri={mediaUrl(banner.image)} label={label} resizeMode="cover" style={styles.image}/></Pressable></Animated.View>}/><View style={styles.pagination}>{banners.map((banner, itemIndex) => <Pressable key={banner.id} accessibilityRole="button" accessibilityLabel={`${label} ${itemIndex + 1}/${banners.length}`} accessibilityState={{ selected: itemIndex === index }} hitSlop={9} onPress={() => { pausedUntil.current = Date.now() + 11000; select(itemIndex, motion); }} style={styles.dotTarget}><View style={[styles.dot, itemIndex === index && styles.activeDot]}/></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  section: { gap: 2 }, banner: { borderRadius: 17, overflow: 'hidden' }, image: { width: '100%', aspectRatio: 1.94, borderRadius: 17 }, pagination: { flexDirection: 'row', justifyContent: 'center', alignSelf: 'center' }, dotTarget: { minWidth: 21, height: 23, alignItems: 'center', justifyContent: 'center' }, dot: { height: 5, width: 5, borderRadius: 5, backgroundColor: '#D4C8E0' }, activeDot: { width: 17, backgroundColor: '#48217D' },
});
