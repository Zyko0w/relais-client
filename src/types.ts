export type Source = 'share' | 'sms' | 'mms' | 'gallery' | 'camera' | 'clipboard' | 'manual';

export type OcrStatus = 'none' | 'pending' | 'done' | 'error';

export type ItemImage = {
  id: string;
  /** fichier copié dans le stockage de l'appli */
  uri: string;
  ocrText?: string;
  ocrStatus: OcrStatus;
  ocrError?: string;
};

export type Item = {
  id: string;
  /** date du message (réception) en ms – sert au filtre de période */
  receivedAt: number;
  addedAt: number;
  source: Source;
  /** nom et/ou numéro du client */
  sender?: string;
  text?: string;
  images: ItemImage[];
  /** identifiant SMS/MMS d'origine pour éviter les doublons */
  externalId?: string;
  sentAt?: number;
};

export type OcrEngine = 'auto' | 'device' | 'online';

export type Settings = {
  recipients: string;
  subjectTemplate: string;
  autoOcr: boolean;
  ocrEngine: OcrEngine;
  ocrSpaceKey: string;
  ocrLanguage: string;
  includeMessageText: boolean;
  includeOcrText: boolean;
  attachImages: boolean;
  markAsSent: boolean;
  /** 0 = jamais */
  retentionDays: number;
  defaultPeriod: PeriodKey;
};

export type PeriodKey = '15m' | '1h' | '3h' | 'today' | '24h' | '7d' | 'all' | 'custom';

export type PeriodState = {
  key: PeriodKey;
  /** pour "custom" : valeur + unité */
  customValue: number;
  customUnit: 'min' | 'h' | 'j';
};
