import { ITINERARY, type Activity } from '../data/itinerary';
import { HOUR, addDays, at, type LocalMs } from './time';

export interface TimedActivity extends Activity {
  id: string;
  date: string;
  startT: LocalMs;
  /** akhir kegiatan: jam selesai di poster, atau awal kegiatan berikutnya */
  endT: LocalMs;
  /** jam selesai hanya diisi bila poster menyebut rentang */
  rangeEnd?: LocalMs;
}

export function buildTrip(tripStart: string): TimedActivity[] {
  const list = ITINERARY.map((a, i) => {
    const date = addDays(tripStart, a.day - 1);
    const startT = at(date, a.start);
    return { ...a, id: `${a.day}-${i}`, date, startT, endT: startT + HOUR, rangeEnd: a.end ? at(date, a.end) : undefined };
  });
  list.forEach((a, i) => {
    const next = list.slice(i + 1).find((b) => b.startT > a.startT);
    a.endT = a.rangeEnd ?? (next ? next.startT : a.startT + 2 * HOUR);
  });
  return list;
}

export type TripPhase =
  | { kind: 'before'; first: TimedActivity }
  | { kind: 'during'; current: TimedActivity; next?: TimedActivity }
  | { kind: 'after' };

export function tripPhase(trip: TimedActivity[], now: LocalMs): TripPhase {
  if (now < trip[0].startT) return { kind: 'before', first: trip[0] };
  const last = trip[trip.length - 1];
  if (now > last.endT) return { kind: 'after' };
  // kegiatan terakhir yang sudah dimulai (rentang panjang seperti "acara bebas" kalah oleh kegiatan yang lebih baru)
  let current = trip[0];
  for (const a of trip) if (a.startT <= now) current = a;
  const next = trip.find((a) => a.startT > now);
  return { kind: 'during', current, next };
}

export const tripDays = (tripStart: string) => [1, 2, 3].map((d) => addDays(tripStart, d - 1));
