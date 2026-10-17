import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useResource } from '../../hooks/useResource';
import { AppText, Button, Notice } from '../../ui/components';
import { colors } from '../../ui/theme';

export const reviewAvatars: Record<string, number> = {
  blue: require('../../../assets/review-avatars/sample-01.jpg'),
  mint: require('../../../assets/review-avatars/sample-02.jpg'),
  rose: require('../../../assets/review-avatars/sample-03.jpg'),
  amber: require('../../../assets/review-avatars/sample-04.jpg'),
  violet: require('../../../assets/review-avatars/sample-05.jpg'),
  slate: require('../../../assets/review-avatars/sample-06.jpg'),
  'photo-07': require('../../../assets/review-avatars/sample-07.jpg'),
  'photo-08': require('../../../assets/review-avatars/sample-08.jpg'),
};
type ReviewExample = { id: string; display_name: string; avatar_style: string; rating: 4 | 5; content: string; is_demo: true };

export function ProductReviewExamples({ productId, t }: { productId: string; t: (key: string) => string }) {
  const resource = useResource<{ items: ReviewExample[] }>(`/public/products/${encodeURIComponent(productId)}/review-examples`);
  const items = resource.data?.items.filter(item => item.is_demo === true) ?? [];
  if (!items.length && !resource.error) return null;
  return <View style={styles.section}>
    <View style={styles.heading}><AppText style={styles.title}>{t('sampleComments')}</AppText><AppText style={styles.count}>{items.length}</AppText></View>
    {resource.error && <View style={styles.error}><Notice message={t('loadError')} danger/><Button variant="quiet" title={t('tryAgain')} onPress={resource.refresh}/></View>}
    {items.map(item => <View key={item.id} style={styles.comment}>
      <View style={styles.identity}><ExpoImage source={reviewAvatars[item.avatar_style] ?? reviewAvatars.blue} contentFit="cover" accessibilityLabel={t('sampleIllustration')} style={styles.avatar}/><View style={styles.person}><AppText style={styles.name}>{item.display_name}</AppText><View style={styles.stars} accessible accessibilityLabel={`${item.rating}/5 · ${t('sampleIllustration')}`}>{[1, 2, 3, 4, 5].map(star => <Star key={star} size={12} color={star <= item.rating ? '#A26A15' : '#D6CDDD'} fill={star <= item.rating ? '#D99A34' : 'transparent'}/>)}</View></View><View style={styles.badge}><AppText style={styles.disclosure}>{t('sampleIllustration')}</AppText></View></View>
      <AppText style={styles.text}>{item.content}</AppText>
    </View>)}
  </View>;
}

const styles = StyleSheet.create({
  section: { marginHorizontal: 18, marginTop: 26, borderTopWidth: 1, borderColor: colors.line, paddingTop: 20 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }, title: { fontSize: 16, fontWeight: '800', color: colors.text }, count: { fontSize: 11, color: colors.muted },
  comment: { paddingVertical: 17, borderBottomWidth: 1, borderColor: colors.line, gap: 12 }, identity: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  avatar: { width: 40, height: 40, borderRadius: 20 }, person: { flex: 1, minWidth: 90, gap: 5 }, name: { fontSize: 12, lineHeight: 18, fontWeight: '700' }, stars: { flexDirection: 'row', gap: 2 },
  badge: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 5, backgroundColor: colors.softPurple }, disclosure: { fontSize: 9, lineHeight: 14, color: colors.primary }, text: { fontSize: 12, lineHeight: 20, color: '#62566C' }, error: { gap: 7, marginTop: 10 },
});
