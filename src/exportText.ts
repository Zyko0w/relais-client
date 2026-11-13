import { formatDate } from './periods';
import type { Item } from './types';

export type ExportOptions = {
  includeMessageText: boolean;
  includeOcrText: boolean;
  periodText: string;
};

const SOURCE_LABEL: Record<Item['source'], string> = {
  share: 'partagé',
  sms: 'SMS',
  mms: 'MMS',
  gallery: 'galerie',
  camera: 'photo',
  clipboard: 'presse-papier',
  manual: 'saisie',
};

export function buildBody(items: Item[], opts: ExportOptions): string {
  const sorted = [...items].sort((a, b) => a.receivedAt - b.receivedAt);
  const senders = Array.from(new Set(sorted.map((i) => i.sender).filter(Boolean)));
  const lines: string[] = [];
  lines.push(`Transfert de ${sorted.length} message(s) – ${opts.periodText}`);
  if (senders.length) lines.push(`Client(s) : ${senders.join(', ')}`);
  lines.push(`Généré le ${formatDate(Date.now())}`);
  lines.push('');

  sorted.forEach((item, idx) => {
    lines.push('════════════════════════════');
    const who = item.sender ? ` – De : ${item.sender}` : '';
    lines.push(`Message ${idx + 1}${who} – ${formatDate(item.receivedAt)} (${SOURCE_LABEL[item.source]})`);
    lines.push('════════════════════════════');

    if (opts.includeMessageText && item.text?.trim()) {
      lines.push('Message :');
      lines.push(item.text.trim());
      lines.push('');
    }
    if (opts.includeOcrText) {
      item.images.forEach((img, i) => {
        const label = item.images.length > 1 ? `image ${i + 1}` : "l'image";
        if (img.ocrStatus === 'done') {
          lines.push(`Texte extrait de ${label} :`);
          lines.push(img.ocrText?.trim() ? img.ocrText.trim() : '(aucun texte détecté)');
        } else if (img.ocrStatus === 'error') {
          lines.push(`Texte extrait de ${label} : (échec de l'extraction)`);
        } else {
          lines.push(`Texte extrait de ${label} : (non extrait)`);
        }
        lines.push('');
      });
    } else if (item.images.length) {
      lines.push(`${item.images.length} image(s) jointe(s)`);
      lines.push('');
    }
  });
  return lines.join('\n').trim() + '\n';
}

export function buildSubject(template: string, items: Item[]): string {
  const senders = Array.from(new Set(items.map((i) => i.sender).filter(Boolean)));
  const last = items.reduce((m, i) => Math.max(m, i.receivedAt), 0);
  return template
    .replace(/\{client\}/g, senders.join(', ') || 'client')
    .replace(/\{date\}/g, formatDate(last || Date.now()))
    .replace(/\{nombre\}/g, String(items.length));
}
