import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiBase } from '../services/api';
import { aboutNavigation } from '../services/about-document';
import { useMobile } from '../state/MobileContext';
import { EmptyState } from './components';

export function AboutDocument({ html, title }: { html: string; title: string }) {
  const { t } = useMobile();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const opening = useRef(false);
  const base = apiBase + '/';
  const openExternal = async (url: string) => {
    if (opening.current || aboutNavigation(url, base) !== 'external') return;
    opening.current = true;
    try { await Linking.openURL(url); }
    catch { Alert.alert(t('loadError'), url); }
    finally { opening.current = false; }
  };
  if (failed) return <View style={{ flex: 1, justifyContent: 'center' }}><EmptyState title={t('loadError')} action={t('tryAgain')} onPress={() => { setFailed(false); setAttempt(value => value + 1); }}/></View>;
  return <WebView key={attempt} accessibilityLabel={title} style={{ flex: 1, backgroundColor: '#FBFAF9' }} source={{ html, baseUrl: base }} originWhitelist={['*']} javaScriptEnabled={false} domStorageEnabled={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} allowFileAccess={false} allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false} mixedContentMode="never" setSupportMultipleWindows={false} startInLoadingState renderLoading={() => <ActivityIndicator style={{ flex: 1 }} color="#48217D"/>} onError={() => setFailed(true)} onShouldStartLoadWithRequest={request => {
    const action = aboutNavigation(request.url, base);
    if (action === 'internal') return true;
    if (action === 'external') void openExternal(request.url);
    return false;
  }} onOpenWindow={event => { void openExternal(event.nativeEvent.targetUrl); }}/>;
}
