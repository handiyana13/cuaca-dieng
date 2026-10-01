import { ICON } from './icons';
import type { BmkgPoint, DailyPoint, HourPoint } from './types';

// ---------- Kode cuaca WMO (Open-Meteo) ----------

export function wmoLabel(code: number): string {
  if (code === 0) return 'Cerah';
  if (code === 1) return 'Cerah sebagian';
  if (code === 2) return 'Cerah berawan';
  if (code === 3) return 'Mendung';
  if (code === 45 || code === 48) return 'Berkabut';
  if (code >= 51 && code <= 57) return 'Gerimis';
  if (code === 61 || code === 80) return 'Hujan ringan';
  if (code === 63 || code === 81) return 'Hujan sedang';
  if (code === 65 || code === 82 || code === 66 || code === 67) return 'Hujan lebat';
  if (code >= 95) return 'Hujan petir';
  return 'Berawan';
}

/** Semakin besar semakin "buruk" untuk aktivitas luar ruang. */
export function severity(code: number): number {
  if (code >= 95) return 7;
  if (code === 65 || code === 82 || code === 66 || code === 67) return 6;
  if (code === 63 || code === 81) return 5;
  if (code === 61 || code === 80) return 4;
  if (code >= 51 && code <= 57) return 3;
  if (code === 45 || code === 48) return 2;
  if (code === 3) return 1;
  return 0;
}

export function wmoIcon(code: number, isDay: boolean): string {
  if (code === 0) return isDay ? ICON.clearDay : ICON.clearNight;
  if (code === 1 || code === 2) return isDay ? ICON.partlyDay : ICON.partlyNight;
  if (code === 3) return isDay ? ICON.overcastDay : ICON.overcastNight;
  if (code === 45 || code === 48) return isDay ? ICON.fogDay : ICON.fogNight;
  if (code >= 51 && code <= 57) return isDay ? ICON.drizzleDay : ICON.drizzleNight;
  if (code === 61 || code === 80) return isDay ? ICON.rainDay : ICON.rainNight;
  if (code >= 63 && code <= 82) return ICON.rain;
  if (code >= 95) return isDay ? ICON.stormDay : ICON.stormNight;
  return ICON.cloudy;
}

/** Ikon model, tapi kalau jarak pandang sangat pendek tampilkan kabut (sering terjadi di Dieng). */
export function hourIcon(h: HourPoint): string {
  if (severity(h.code) <= 1 && h.vis < 1000) return h.isDay ? ICON.fogDay : ICON.fogNight;
  return wmoIcon(h.code, h.isDay);
}

export function hourLabel(h: HourPoint): string {
  if (severity(h.code) <= 1 && h.vis < 1000) return 'Berkabut';
  return wmoLabel(h.code);
}

// ---------- Kode cuaca BMKG ----------

export function bmkgIcon(b: BmkgPoint): string {
  const hour = new Date(b.t).getUTCHours();
  const isDay = hour >= 6 && hour < 18;
  const c = b.code;
  if (c === 0) return isDay ? ICON.clearDay : ICON.clearNight;
  if (c === 1 || c === 2) return isDay ? ICON.partlyDay : ICON.partlyNight;
  if (c === 3 || c === 4) return isDay ? ICON.overcastDay : ICON.overcastNight;
  if (c === 5) return isDay ? ICON.hazeDay : ICON.hazeNight;
  if (c === 10) return ICON.smoke;
  if (c === 45) return isDay ? ICON.fogDay : ICON.fogNight;
  if (c >= 95) return isDay ? ICON.stormDay : ICON.stormNight;
  if (c >= 60) return isDay ? ICON.rainDay : ICON.rainNight;
  return ICON.cloudy;
}

export const bmkgRainy = (b?: BmkgPoint) => Boolean(b && b.code >= 60);

// ---------- Tips per kegiatan ----------

export type Tone = 'rain' | 'cold' | 'fog' | 'wind' | 'sun' | 'ok';
export interface Tip {
  tone: Tone;
  text: string;
}

export function tipsFor(h?: HourPoint, b?: BmkgPoint, ppOverride?: number): Tip[] {
  if (!h && !b) return [];
  const tips: Tip[] = [];
  const pp = ppOverride ?? h?.pp ?? 0;
  const bmkgRain = bmkgRainy(b);
  const modelRain = h ? severity(h.code) >= 3 || pp >= 60 : false;

  if (modelRain && bmkgRain) tips.push({ tone: 'rain', text: 'Hujan — BMKG & model sepakat, siapkan jas hujan' });
  else if (modelRain || bmkgRain) tips.push({ tone: 'rain', text: `Kemungkinan hujan${bmkgRain && !modelRain ? ' (menurut BMKG)' : ''} — bawa jas hujan/payung` });
  else if (pp >= 30) tips.push({ tone: 'rain', text: 'Bisa gerimis — bawa payung lipat' });

  if (h) {
    if (h.vis < 300) tips.push({ tone: 'fog', text: `Kabut tebal, jarak pandang ±${Math.round(h.vis / 10) * 10} m` });
    else if (h.vis < 1000) tips.push({ tone: 'fog', text: `Berkabut, jarak pandang ±${Math.round(h.vis / 50) * 50} m` });

    if (h.feels <= 10) tips.push({ tone: 'cold', text: `Sangat dingin (terasa ${Math.round(h.feels)}°) — jaket tebal, sarung tangan, kupluk` });
    else if (h.feels <= 15) tips.push({ tone: 'cold', text: `Dingin (terasa ${Math.round(h.feels)}°) — pakai jaket` });

    if (h.gust >= 35) tips.push({ tone: 'wind', text: `Angin kencang, hembusan ${Math.round(h.gust)} km/j` });
    if (!tips.length) tips.push({ tone: 'ok', text: h.cloud <= 40 ? 'Cerah, cocok untuk foto' : 'Aman untuk aktivitas luar' });
  }
  return tips;
}

// ---------- Peluang sunrise ----------

export interface SunriseOutlook {
  time: number;
  score: number;
  label: 'Bagus' | 'Lumayan' | 'Kurang mendukung';
  reasons: string[];
  seaOfClouds: boolean;
}

/**
 * Skor sederhana 0–100 untuk "golden sunrise" di puncak, dari jam sekitar matahari terbit.
 * Faktor terbesar: kabut di puncak (jarak pandang), awan menengah yang menutupi ufuk, dan hujan.
 */
export function sunriseOutlook(day: DailyPoint, around: HourPoint[]): SunriseOutlook | null {
  if (!around.length) return null;
  const vis = Math.min(...around.map((h) => h.vis));
  const mid = Math.max(...around.map((h) => h.mid));
  const high = Math.max(...around.map((h) => h.high));
  const low = Math.max(...around.map((h) => h.low));
  const pp = Math.max(...around.map((h) => h.pp));

  let score = 100;
  const reasons: string[] = [];
  if (vis < 300) {
    score -= 55;
    reasons.push(`Puncak kemungkinan tertutup kabut (jarak pandang ±${Math.round(vis / 10) * 10} m)`);
  } else if (vis < 1000) {
    score -= 35;
    reasons.push(`Agak berkabut (jarak pandang ±${Math.round(vis / 50) * 50} m)`);
  } else {
    reasons.push(`Jarak pandang baik (${vis >= 10000 ? '>10 km' : `${(vis / 1000).toFixed(1)} km`})`);
  }
  score -= mid * 0.35;
  if (mid >= 60) reasons.push(`Awan menengah ${Math.round(mid)}% bisa menutupi matahari`);
  score -= high * 0.1;
  score -= pp * 0.4;
  if (pp >= 30) reasons.push(`Peluang hujan ${Math.round(pp)}%`);
  if (mid < 60) reasons.push(mid < 20 ? 'Hampir tidak ada awan menengah di ufuk' : `Awan menengah sedikit (${Math.round(mid)}%)`);
  if (pp < 30) reasons.push(`Peluang hujan rendah (${Math.round(pp)}%)`);

  // Awan rendah di bawah puncak + puncak tidak berkabut = pemandangan "negeri di atas awan".
  const seaOfClouds = vis >= 1000 && low >= 50;
  if (seaOfClouds) reasons.push('Potensi lautan awan di bawah puncak');

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 65 ? 'Bagus' : score >= 40 ? 'Lumayan' : 'Kurang mendukung';
  return { time: day.sunrise, score, label, reasons, seaOfClouds };
}

// ---------- Daftar bawaan ----------

export interface PackItem {
  icon: string;
  text: string;
}

export function packingList(hours: HourPoint[], bmkg: BmkgPoint[], uvMax: number): PackItem[] {
  if (!hours.length) return [];
  const minFeels = Math.min(...hours.map((h) => h.feels));
  const rainyHours = hours.filter((h) => h.pp >= 50 || severity(h.code) >= 3).length;
  const items: PackItem[] = [];
  if (minFeels <= 10) items.push({ icon: ICON.thermometerColder, text: `Jaket tebal, sarung tangan & kupluk (terendah terasa ${Math.round(minFeels)}°)` });
  else items.push({ icon: ICON.thermometerColder, text: `Jaket/hoodie (terendah terasa ${Math.round(minFeels)}°)` });
  if (rainyHours > 0 || bmkg.some(bmkgRainy)) items.push({ icon: ICON.umbrella, text: 'Jas hujan / payung lipat & pelindung HP' });
  // di ±2.000 mdpl matahari terasa menyengat walau udaranya sejuk
  if (uvMax >= 6) items.push({ icon: ICON.uv, text: `Sunscreen & topi — UV siang ${Math.round(uvMax) >= 8 ? 'sangat ' : ''}tinggi (indeks ${Math.round(uvMax)})` });
  items.push({ icon: ICON.starryNight, text: 'Senter/headlamp untuk naik Sikunir dini hari' });
  if (hours.some((h) => h.vis < 1000)) items.push({ icon: ICON.mist, text: 'Hati-hati kabut di jalan saat pagi & malam' });
  return items;
}
