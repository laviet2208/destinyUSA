import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useMobile } from '../../state/MobileContext';
import { AppText, Header, Screen } from '../../ui/components';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { BrandLogo } from '../../ui/BrandLogo';
import { colors } from '../../ui/theme';
import { RichProductDescription } from '../catalog/RichProductDescription';
import { AboutDocument } from '../../ui/AboutDocument';
import { isAboutDocument } from '../../services/about-document';
import { AboutAccess, DataFeedback, useAccountResource, type AccountScreenProps } from './account-ui';

export function AboutScreen({ navigation }: AccountScreenProps) {
  return <AboutAccess navigation={navigation}><AboutContent navigation={navigation}/></AboutAccess>;
}

function AboutContent({ navigation }: AccountScreenProps) {
  const { t, language } = useMobile();
  const { width } = useWindowDimensions();
  const resource = useAccountResource<{ html: string }>(`/public/about?language=${encodeURIComponent(language)}`);
  if (resource.data?.html && isAboutDocument(resource.data.html)) return <Screen scroll={false} surface={colors.deepPurple}><Header title={t('aboutApp')} tone="purple" onBack={() => navigation.goBack()}/><AboutDocument html={resource.data.html} title={t('aboutApp')}/><CommerceFooter/></Screen>;
  return <Screen scroll={false} surface={colors.deepPurple}><Header title={t('aboutApp')} tone="purple" onBack={() => navigation.goBack()}/><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.hero}><View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.orbit}/><BrandLogo light width={186}/><View style={styles.rule}/><AppText variant="title" style={styles.title}>{t('aboutApp')}</AppText></View>
    <View style={styles.article}>{resource.data?.html ? <RichProductDescription html={resource.data.html} width={Math.max(0, width - 76)}/> : <DataFeedback loading={resource.loading} error={resource.error} empty title={t('noContent')} onRetry={resource.refresh}/>}</View>
  </ScrollView><CommerceFooter/></Screen>;
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: 18, paddingBottom: 28, backgroundColor: colors.deepPurple },
  hero: { paddingTop: 25, paddingBottom: 26, gap: 18, overflow: 'hidden', alignItems: 'flex-start' },
  orbit: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: '#FFFFFF12', right: -65, top: -70 },
  rule: { width: 30, height: 2, backgroundColor: '#B995DA', marginTop: 6 }, title: { color: '#FFFFFF', fontSize: 27, lineHeight: 35, maxWidth: '90%' },
  article: { backgroundColor: '#FCFAFF', borderRadius: 18, padding: 20, borderWidth: 1, borderColor: '#E7DAF0' },
});
