import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

export function AuthBackdrop({ dark = false }: { dark?: boolean }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
    <Svg width="100%" height={dark ? '100%' : 215} style={dark ? undefined : { position: 'absolute', bottom: 0 }} preserveAspectRatio="none" viewBox={dark ? '0 0 390 450' : '0 0 390 215'}>
      <Defs><LinearGradient id="authSurface" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={dark ? '#170B29' : '#FBF8FE'}/><Stop offset="0.48" stopColor={dark ? '#301149' : '#F9F5FD'}/><Stop offset="1" stopColor={dark ? '#572276' : '#F7F2FD'}/></LinearGradient><RadialGradient id="authGlow"><Stop offset="0" stopColor="#9859C9" stopOpacity="0.5"/><Stop offset="1" stopColor="#9859C9" stopOpacity="0"/></RadialGradient></Defs>
      <Rect width="390" height="450" fill="url(#authSurface)"/>
      {dark ? <><Circle cx="400" cy="5" r="230" fill="url(#authGlow)"/><Circle cx="380" cy="320" r="125" stroke="#FFFFFF1C" fill="none"/><Circle cx="380" cy="320" r="155" stroke="#FFFFFF05" strokeWidth="30" fill="none"/><Circle cx="380" cy="320" r="200" stroke="#FFFFFF04" strokeWidth="45" fill="none"/></> : <><Circle cx="370" cy="227" r="108.5" fill="#8C4BAD09"/><Circle cx="370" cy="227" r="83.5" fill="#8C4BAD0B"/><Circle cx="370" cy="227" r="62.5" stroke="#D9C6EC" fill="none"/></>}
    </Svg>
  </View>;
}

export function AuthProductScene({ scale = 1 }: { scale?: number }) {
  return <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.scene, { transform: [{ scale }] }]}>
    <Svg width="100%" height="235" viewBox="0 0 350 235" style={StyleSheet.absoluteFill}><Defs><RadialGradient id="sceneGlow"><Stop offset="0" stopColor="#B96EEB" stopOpacity="0.5"/><Stop offset="1" stopColor="#994ECA" stopOpacity="0"/></RadialGradient><RadialGradient id="sceneDisc"><Stop offset="0" stopColor="#A27BD3"/><Stop offset="0.62" stopColor="#6E3A94"/><Stop offset="1" stopColor="#4E216F"/></RadialGradient></Defs><Ellipse cx="175" cy="150" rx="158" ry="90" fill="url(#sceneGlow)"/><Ellipse cx="190" cy="234" rx="140" ry="66" fill="url(#sceneDisc)"/></Svg>
    <Image source={require('../../assets/auth/scene-perfume.webp')} contentFit="contain" style={styles.perfume}/>
    <Image source={require('../../assets/auth/scene-headphones.webp')} contentFit="contain" style={styles.headphones}/>
    <Image source={require('../../assets/auth/scene-watch.webp')} contentFit="contain" style={styles.watch}/>
  </View>;
}

const styles = StyleSheet.create({
  scene: { position: 'absolute', bottom: -3, left: 0, right: 0, height: 235 },
  headphones: { position: 'absolute', width: 196, height: 191, bottom: 12, left: '50%', marginLeft: -102, transform: [{ rotate: '-11deg' }] },
  perfume: { position: 'absolute', width: 101, height: 116, bottom: 21, left: '6%', transform: [{ rotate: '-11deg' }] },
  watch: { position: 'absolute', width: 89, height: 103, bottom: 11, right: '7%', transform: [{ rotate: '12deg' }] },
});
