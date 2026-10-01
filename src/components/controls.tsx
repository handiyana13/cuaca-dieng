import { PLACES, type PlaceId } from '../data/places';

export type Interval = 1 | 3 | 6;
export const INTERVALS: Interval[] = [1, 3, 6];

/** Jam yang ditampilkan untuk interval: 3 & 6 jam disejajarkan dengan jam BMKG (02, 05, 08, …). */
export const onInterval = (t: number, interval: Interval) => new Date(t).getUTCHours() % interval === 2 % interval;

export function IntervalChips({ value, onChange }: { value: Interval; onChange: (v: Interval) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-card p-1" role="radiogroup" aria-label="Interval waktu">
      {INTERVALS.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition ${value === v ? 'bg-day1 text-white' : 'text-muted hover:text-ink'}`}
        >
          {v} jam
        </button>
      ))}
    </div>
  );
}

export function PlaceChips({ value, onChange }: { value: PlaceId; onChange: (p: PlaceId) => void }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
      {PLACES.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onChange(p.id)}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
            value === p.id ? 'border-day1 bg-day1 text-white' : 'border-line bg-card text-ink hover:border-muted'
          } ${p.extra && value !== p.id ? 'text-muted' : ''}`}
        >
          {p.short}
        </button>
      ))}
    </div>
  );
}
