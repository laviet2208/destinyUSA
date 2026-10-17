import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useMobile } from '../../state/MobileContext';
import { AppText, Header, Screen } from '../../ui/components';
import { CommerceFooter } from '../../ui/CommerceFooter';
import { BrandLogo } from '../../ui/BrandLogo';
import { RichProductDescription } from '../catalog/RichProductDescription';
import { DataFeedback, useAccountResource, type AccountScreenProps } from './account-ui';

export function AboutScreen({ navigation }: AccountScreenProps) {
  const { t } = useMobile();
  const { width } = useWindowDimensions();
  const resource = useAccountResource<{ html: string }>('/public/about');
  return <Screen scroll={false}><Header title={t('aboutApp')} onBack={() => navigation.goBack()}/><ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}><BrandLogo/><AppText variant="title">{t('aboutApp')}</AppText>{resource.data?.html ? <RichProductDescription html={resource.data.html} width={Math.max(0, width - 36)}/> : <View><DataFeedback loading={resource.loading} error={resource.error} empty title={t('noContent')} onRetry={resource.refresh}/></View>}</ScrollView><CommerceFooter/></Screen>;
}
