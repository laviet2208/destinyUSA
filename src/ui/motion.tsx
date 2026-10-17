import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, type StyleProp, type ViewStyle } from 'react-native';

const MotionContext = createContext(false);
const nativeDriver = Platform.OS !== 'web';
export const MotionPressable = Animated.createAnimatedComponent(Pressable);

export function MotionProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    let revision = 0;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { revision += 1; if (active) setEnabled(!reduced); });
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (active && revision === 0) setEnabled(!reduced); }).catch(() => {});
    return () => { active = false; subscription.remove(); };
  }, []);
  return <MotionContext.Provider value={enabled}>{children}</MotionContext.Provider>;
}

export function useMotionEnabled() { return useContext(MotionContext); }

export function usePressFeedback(disabled = false) {
  const enabled = useMotionEnabled();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (!enabled || disabled) { scale.stopAnimation(); scale.setValue(1); } return () => scale.stopAnimation(); }, [enabled, disabled, scale]);
  const animate = (target: number) => {
    scale.stopAnimation();
    if (!enabled || disabled) { scale.setValue(1); return; }
    Animated.spring(scale, { toValue: target, stiffness: 420, damping: 30, mass: 0.65, useNativeDriver: nativeDriver, isInteraction: false }).start();
  };
  return { style: { transform: [{ scale }], opacity: scale.interpolate({ inputRange: [0.985, 1], outputRange: [0.94, 1], extrapolate: 'clamp' }) }, onPressIn: () => animate(0.985), onPressOut: () => animate(1) };
}

export function useEntrance(delay = 0, distance = 8, active = true) {
  const motionEnabled = useMotionEnabled();
  const enabled = motionEnabled && active;
  const progress = useRef(new Animated.Value(enabled ? 0 : 1)).current;
  const played = useRef(!enabled);
  useEffect(() => {
    if (!enabled) { progress.stopAnimation(); progress.setValue(1); return; }
    if (played.current) return;
    played.current = true;
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: 260, delay: Math.min(180, Math.max(0, delay)), easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => { animation.stop(); progress.setValue(1); };
  }, [enabled, progress, delay]);
  return { opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }] };
}

export function MotionScreen({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const entrance = useEntrance(0, 0);
  return <Animated.View style={[{ flex: 1 }, entrance, style]}>{children}</Animated.View>;
}

export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const enabled = useMotionEnabled();
  const opacity = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    if (!enabled) { opacity.setValue(0.5); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.8, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver, isInteraction: false }),
      Animated.timing(opacity, { toValue: 0.35, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver, isInteraction: false }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [enabled, opacity]);
  return <Animated.View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[style, { opacity }]}/>;
}

export function TabMotion({ active, children }: { active: boolean; children: ReactNode }) {
  const enabled = useMotionEnabled();
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (!enabled) { progress.stopAnimation(); progress.setValue(active ? 1 : 0); return; }
    const animation = Animated.spring(progress, { toValue: active ? 1 : 0, stiffness: 300, damping: 25, mass: 0.65, useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [active, enabled, progress]);
  return <Animated.View style={{ transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }] }}>{children}</Animated.View>;
}
