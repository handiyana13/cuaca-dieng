import { PLACE, type PlaceId } from '../data/places';
import { HOUR, dateOf, floorHour, type LocalMs } from '../lib/time';
import { severity } from './interpret';
import type { BmkgPoint, DailyPoint, Forecast, HourPoint } from './types';

/** Jam prakiraan BMKG modulo 3 (0, 1, atau 2), untuk menyejajarkan interval 3/6 jam. */
export function bmkgPhase(f: Forecast | null): number {
  const first = f && Object.values(f.bmkg).find((v) => v.points.length)?.points[0];
  return first ? new Date(first.t).getUTCHours() % 3 : 2;
}

/** Data model per jam untuk jam yang memuat waktu `t`. */
export function hourAt(f: Forecast, place: PlaceId, t: LocalMs): HourPoint | undefined {
  const hours = f.om[place]?.hours;
  if (!hours?.length) return undefined;
  const i = Math.round((floorHour(t) - hours[0].t) / HOUR);
  return hours[i];
}

/** Titik BMKG terdekat (BMKG mewakili jendela ±1,5 jam di sekitar jamnya). */
export function bmkgAt(f: Forecast, place: PlaceId, t: LocalMs): BmkgPoint | undefined {
  const points = f.bmkg[PLACE[place].adm4]?.points;
  if (!points) return undefined;
  let best: BmkgPoint | undefined;
  for (const p of points) {
    if (Math.abs(p.t - t) <= 1.5 * HOUR && (!best || Math.abs(p.t - t) < Math.abs(best.t - t))) best = p;
  }
  return best;
}

export function dailyAt(f: Forecast, place: PlaceId, t: LocalMs | string): DailyPoint | undefined {
  const date = typeof t === 'string' ? t : dateOf(t);
  return f.om[place]?.daily.find((d) => d.date === date);
}

export interface Slot {
  /** jam yang mewakili (paling "buruk" kalau rentang) */
  hour?: HourPoint;
  bmkg?: BmkgPoint;
  /** ringkasan untuk kegiatan dengan rentang waktu */
  range?: { tmin: number; tmax: number; ppMax: number; mm: number; visMin: number };
}

/** Cuaca untuk satu kegiatan: titik waktu, atau ringkasan rentang (mis. 14:00–18:00). */
export function slotFor(f: Forecast, place: PlaceId, start: LocalMs, end?: LocalMs): Slot {
  if (!end || end - start <= HOUR) return { hour: hourAt(f, place, start), bmkg: bmkgAt(f, place, start) };
  const hours: HourPoint[] = [];
  for (let t = floorHour(start); t < end; t += HOUR) {
    const h = hourAt(f, place, t);
    if (h) hours.push(h);
  }
  if (!hours.length) return {};
  const worst = hours.reduce((a, b) => (severity(b.code) > severity(a.code) || (severity(b.code) === severity(a.code) && b.pp > a.pp) ? b : a));
  const bmkgs: BmkgPoint[] = [];
  for (let t = start; t <= end; t += HOUR) {
    const b = bmkgAt(f, place, t);
    if (b && !bmkgs.includes(b)) bmkgs.push(b);
  }
  const worstBmkg = bmkgs.reduce<BmkgPoint | undefined>((a, b) => (!a || b.mm > a.mm || b.code > a.code ? b : a), undefined);
  return {
    hour: worst,
    bmkg: worstBmkg,
    range: {
      tmin: Math.min(...hours.map((h) => h.temp)),
      tmax: Math.max(...hours.map((h) => h.temp)),
      ppMax: Math.max(...hours.map((h) => h.pp)),
      mm: hours.reduce((s, h) => s + h.mm, 0),
      visMin: Math.min(...hours.map((h) => h.vis)),
    },
  };
}
