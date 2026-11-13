import type { Item, PeriodKey, PeriodState } from './types';

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: '15m', label: '15 min' },
  { key: '1h', label: '1 h' },
  { key: '3h', label: '3 h' },
  { key: 'today', label: "Aujourd'hui" },
  { key: '24h', label: '24 h' },
  { key: '7d', label: '7 jours' },
  { key: 'all', label: 'Tout' },
  { key: 'custom', label: 'Perso…' },
];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Renvoie le timestamp de début de la période (0 = pas de limite) */
export function periodStart(p: PeriodState, now = Date.now()): number {
  switch (p.key) {
    case '15m':
      return now - 15 * MIN;
    case '1h':
      return now - HOUR;
    case '3h':
      return now - 3 * HOUR;
    case 'today': {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case '24h':
      return now - DAY;
    case '7d':
      return now - 7 * DAY;
    case 'all':
      return 0;
    case 'custom': {
      const v = Math.max(0, p.customValue || 0);
      const unit = p.customUnit === 'min' ? MIN : p.customUnit === 'h' ? HOUR : DAY;
      return v > 0 ? now - v * unit : 0;
    }
  }
}

export function periodLabel(p: PeriodState): string {
  if (p.key === 'custom') {
    const u = p.customUnit === 'min' ? 'min' : p.customUnit === 'h' ? 'h' : 'jour(s)';
    return `${p.customValue} ${u} dernier(e)s`;
  }
  switch (p.key) {
    case '15m':
      return '15 dernières minutes';
    case '1h':
      return 'dernière heure';
    case '3h':
      return '3 dernières heures';
    case 'today':
      return "aujourd'hui";
    case '24h':
      return 'dernières 24 h';
    case '7d':
      return '7 derniers jours';
    default:
      return 'tous les messages';
  }
}

export function filterByPeriod(items: Item[], p: PeriodState): Item[] {
  const start = periodStart(p);
  return items.filter((i) => i.receivedAt >= start);
}

export function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function relativeTime(ms: number, now = Date.now()): string {
  const diff = Math.max(0, now - ms);
  if (diff < MIN) return "à l'instant";
  if (diff < HOUR) return `il y a ${Math.floor(diff / MIN)} min`;
  if (diff < DAY) return `il y a ${Math.floor(diff / HOUR)} h`;
  return formatDate(ms);
}
