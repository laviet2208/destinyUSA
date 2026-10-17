import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

setBackgroundMessageHandler(getMessaging(), async () => {});
