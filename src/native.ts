import Constants, { ExecutionEnvironment } from 'expo-constants';
import { PermissionsAndroid, Platform } from 'react-native';
import RelaisNative from '../modules/relais-native';

/** true quand l'appli tourne dans Expo Go (pas de code natif personnalisé) */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Module natif dispo (build de dev ou APK) */
export const native = Platform.OS === 'android' ? RelaisNative : null;

export const hasNative = !!native;

export async function ensureSmsPermission(): Promise<boolean> {
  if (!native) return false;
  if (native.hasSmsPermission()) return true;
  const res = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  ]);
  return res[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
}
