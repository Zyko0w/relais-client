import { requireOptionalNativeModule } from 'expo';

export type NativeMessage = {
  id: string;
  address: string | null;
  name: string | null;
  body: string;
  /** date de réception en ms */
  date: number;
  /** URIs file:// des images (MMS) */
  images: string[];
};

export type ReadOptions = {
  sinceMs: number;
  untilMs?: number;
  address?: string | null;
  limit?: number;
};

type RelaisNativeModule = {
  hasSmsPermission(): boolean;
  hasContactsPermission(): boolean;
  readSms(options: ReadOptions): Promise<NativeMessage[]>;
  readMms(options: ReadOptions): Promise<NativeMessage[]>;
  recognizeText(uri: string): Promise<string>;
};

/** null dans Expo Go (module natif absent) */
export default requireOptionalNativeModule<RelaisNativeModule>('RelaisNative');
