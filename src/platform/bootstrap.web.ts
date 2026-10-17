import { Alert } from 'react-native';
import { showWebAlert } from './web-alert';

Alert.alert = showWebAlert;
