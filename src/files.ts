import { Directory, File, Paths } from 'expo-file-system';

const imagesDir = () => new Directory(Paths.document, 'images');

export function uid(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Copie une image (cache, partage, MMS…) dans le stockage permanent de l'appli
 * pour qu'elle ne disparaisse pas. Renvoie la nouvelle URI.
 */
export function persistImage(sourceUri: string): string {
  const dir = imagesDir();
  if (!dir.exists) dir.create({ intermediates: true });

  // image collée depuis le presse-papier (data:image/png;base64,…)
  const dataMatch = /^data:image\/(\w+);base64,(.*)$/s.exec(sourceUri);
  if (dataMatch) {
    const out = new File(dir, `${uid('img_')}.${dataMatch[1] === 'jpeg' ? 'jpg' : dataMatch[1]}`);
    out.create();
    out.writeSync(dataMatch[2], { encoding: 'base64' });
    return out.uri;
  }

  const src = new File(sourceUri);
  const extMatch = /\.(jpe?g|png|webp|gif|heic)$/i.exec(sourceUri.split('?')[0]);
  const ext = extMatch ? extMatch[1].toLowerCase() : 'jpg';
  const dest = new File(dir, `${uid('img_')}.${ext}`);
  try {
    src.copySync(dest);
    return dest.uri;
  } catch (e) {
    console.warn('Copie image impossible, URI d’origine conservée', e);
    return sourceUri;
  }
}

export function deleteImage(uri: string) {
  try {
    if (!uri.startsWith(imagesDir().uri)) return;
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // déjà supprimée
  }
}

/** Écrit un fichier texte temporaire (pour partage / pièce jointe) */
export function writeTextFile(name: string, content: string): string {
  const f = new File(Paths.cache, name);
  if (f.exists) f.delete();
  f.create();
  f.writeSync(content);
  return f.uri;
}

/** Supprime un fichier temporaire (sécurisé : uniquement dans le dossier cache). */
export function deleteTempFile(uri: string) {
  try {
    if (!uri.startsWith(Paths.cache.uri)) return; // ne touche jamais aux images persistées
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // déjà supprimé / inaccessible
  }
}
