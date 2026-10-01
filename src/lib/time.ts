// Semua waktu di app ini adalah waktu lokal WIB, disimpan sebagai angka ms dengan basis UTC
// (tanpa zona waktu). Jadi hasilnya sama di perangkat mana pun, apa pun setelan zonanya.

export type LocalMs = number;

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;
const WIB_OFFSET = 7 * HOUR;

/** "2026-10-02T05:00" atau "2026-10-02 05:00:00" → LocalMs */
export function parseLocal(s: string): LocalMs {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) throw new Error(`Format waktu tidak dikenal: ${s}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
}

/** "2026-10-02" + "05:30" → LocalMs */
export const at = (date: string, hhmm: string) => parseLocal(`${date}T${hhmm}`);

export const nowLocal = (): LocalMs => Date.now() + WIB_OFFSET;

export const dateOf = (t: LocalMs) => new Date(t).toISOString().slice(0, 10);
export const hhmm = (t: LocalMs) => new Date(t).toISOString().slice(11, 16);
export const floorHour = (t: LocalMs) => Math.floor(t / HOUR) * HOUR;

export function addDays(date: string, n: number): string {
  return dateOf(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + n * DAY);
}

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "Kamis, 2 Okt" */
export function fmtDay(t: LocalMs | string, short = false): string {
  const d = new Date(typeof t === 'string' ? `${t}T00:00:00Z` : t);
  const hari = HARI[d.getUTCDay()];
  return `${short ? hari.slice(0, 3) : hari}, ${d.getUTCDate()} ${BULAN[d.getUTCMonth()]}`;
}

/** "1–3 Okt 2026" */
export function fmtRange(start: string, end: string): string {
  const a = new Date(`${start}T00:00:00Z`);
  const b = new Date(`${end}T00:00:00Z`);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  return `${a.getUTCDate()}${sameMonth ? '' : ` ${BULAN[a.getUTCMonth()]}`}–${b.getUTCDate()} ${BULAN[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
}

/** "5 menit lalu", "2 jam lalu" */
export function ago(epochMs: number): string {
  const m = Math.round((Date.now() - epochMs) / MIN);
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}

/** "dalam 3 jam 20 menit" */
export function countdown(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / MIN));
  const d = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} menit`;
  return `${m} menit`;
}
