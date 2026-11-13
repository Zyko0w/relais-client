import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { deleteTempFile } from './files';
import { native } from './native';
import type { Settings } from './types';

/** Réduit l'image et la renvoie en base64 (l'API gratuite OCR.space limite à 1 Mo) */
async function shrinkBase64(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1600 });
  const ref = await ctx.renderAsync();
  const res = await ref.saveAsync({ compress: 0.6, format: SaveFormat.JPEG, base64: true });
  if (res.uri) deleteTempFile(res.uri); // on ne garde que le base64 : le fichier est inutile
  return res.base64 ?? '';
}

/**
 * Normalise l'image en JPEG standard avant l'OCR sur l'appareil.
 * - évite le NullPointerException natif de ML Kit sur certains formats (HEIC…) ;
 * - garde la meilleure qualité possible (compress 1) car il n'y a pas de limite
 *   de taille en local — plus l'image est nette, meilleure est la détection ;
 * - ne réduit QUE les très grandes images (mémoire) et n'agrandit jamais une
 *   petite image (ça n'ajoute aucun détail et nuit à la précision).
 */
const OCR_MAX_WIDTH = 2200;

async function prepareForDeviceOcr(uri: string): Promise<string> {
  const img = await ImageManipulator.manipulate(uri).renderAsync();
  // image déjà raisonnable : on ré-encode directement (pas de 2e décodage)
  if (img.width <= OCR_MAX_WIDTH) {
    const res = await img.saveAsync({ compress: 1, format: SaveFormat.JPEG });
    return res.uri;
  }
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: OCR_MAX_WIDTH });
  const ref = await ctx.renderAsync();
  const res = await ref.saveAsync({ compress: 1, format: SaveFormat.JPEG });
  return res.uri;
}

async function onlineOcr(uri: string, settings: Settings): Promise<string> {
  const base64 = await shrinkBase64(uri);
  if (!base64) throw new Error('Préparation de l’image impossible');
  const form = new FormData();
  form.append('apikey', settings.ocrSpaceKey || 'helloworld');
  form.append('language', settings.ocrLanguage || 'fre');
  form.append('OCREngine', '2');
  form.append('scale', 'true');
  form.append('isOverlayRequired', 'false');
  // Envoi en base64 : uniquement des champs texte (compatible nouvelle archi RN).
  form.append('base64Image', `data:image/jpeg;base64,${base64}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const resp = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    const json = await resp.json();
    if (json.IsErroredOnProcessing) {
      const msg = Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(' ') : json.ErrorMessage;
      throw new Error(msg || 'Erreur OCR en ligne');
    }
    const parsed: { ParsedText?: string }[] = json.ParsedResults ?? [];
    return parsed.map((p) => p.ParsedText ?? '').join('\n').trim();
  } finally {
    clearTimeout(timer);
  }
}

export function ocrEngineAvailable(settings: Settings): 'device' | 'online' {
  if (settings.ocrEngine === 'online') return 'online';
  if (settings.ocrEngine === 'device') return native ? 'device' : 'online';
  return native ? 'device' : 'online';
}

/** Extrait le texte d'une image : ML Kit sur l'appareil si dispo, sinon OCR.space */
export async function recognize(uri: string, settings: Settings): Promise<string> {
  const engine = ocrEngineAvailable(settings);
  if (engine === 'device' && native) {
    let prepared: string | null = null;
    try {
      prepared = await prepareForDeviceOcr(uri);
      const text = await native.recognizeText(prepared);
      return text.trim();
    } catch (e) {
      // en mode « Auto », on bascule sur l'OCR en ligne si l'appareil échoue ;
      // en mode « Sur le téléphone » (explicite), on remonte l'erreur.
      if (settings.ocrEngine !== 'device') return onlineOcr(uri, settings);
      throw e;
    } finally {
      if (prepared) deleteTempFile(prepared); // libère le cache de cette image
    }
  }
  return onlineOcr(uri, settings);
}
