import type { PlaceId } from '../data/places';
import { HOUR, at, hhmm } from '../lib/time';
import { severity } from './interpret';
import type { Forecast, HourPoint } from './types';

/** Jam-jam pada tanggal itu (05:00–23:00) yang kemungkinan hujan, digabung jadi rentang: ["11:00–18:00"]. */
export function rainWindows(f: Forecast, place: PlaceId, date: string): string[] {
  const hours = (f.om[place]?.hours ?? []).filter((h) => h.t >= at(date, '05:00') && h.t <= at(date, '23:00'));
  const wet = (h: HourPoint) => h.pp >= 50 || severity(h.code) >= 3;
  const out: string[] = [];
  let startT: number | null = null;
  let lastT = 0;
  for (const h of hours) {
    if (wet(h)) {
      if (startT === null) startT = h.t;
      lastT = h.t;
    } else if (startT !== null) {
      out.push(`${hhmm(startT)}–${hhmm(lastT + HOUR)}`);
      startT = null;
    }
  }
  if (startT !== null) out.push(`${hhmm(startT)}–${hhmm(lastT + HOUR)}`);
  return out;
}

export function hoursBetween(f: Forecast, place: PlaceId, from: number, to: number): HourPoint[] {
  return (f.om[place]?.hours ?? []).filter((h) => h.t >= from && h.t <= to);
}
