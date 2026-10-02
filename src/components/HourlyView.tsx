import { useEffect, useRef } from 'react';
import { PLACE, type PlaceId } from '../data/places';
import { HOUR, addDays, at, dateOf, fmtDay, floorHour, hhmm, type LocalMs } from '../lib/time';
import { hourIcon, hourLabel, severity } from '../weather/interpret';
import { bmkgAt, bmkgPhase } from '../weather/lookup';
import { hoursBetween } from '../weather/summary';
import type { Forecast } from '../weather/types';
import { BmkgChip, Card, WxIcon, fmtVis, round } from './bits';
import { IntervalChips, PlaceChips, onInterval, type Interval } from './controls';
import { TempRainChart } from './TempRainChart';

interface Props {
  forecast: Forecast | null;
  place: PlaceId;
  onPlace: (p: PlaceId) => void;
  interval: Interval;
  onIntervalChange: (v: Interval) => void;
  tripStart: string;
  now: LocalMs;
  focusT?: LocalMs;
}

export function HourlyView({ forecast: f, place, onPlace, interval, onIntervalChange, tripStart, now, focusT }: Props) {
  const from = at(tripStart, '00:00');
  const to = at(addDays(tripStart, 2), '23:00');
  const hours = f ? hoursBetween(f, place, from, to) : [];
  const phase = bmkgPhase(f);
  const rows = hours.filter((h) => onInterval(h.t, interval, phase));
  const byDay = new Map<string, typeof rows>();
  rows.forEach((h) => byDay.set(dateOf(h.t), [...(byDay.get(dateOf(h.t)) ?? []), h]));
  const meta = PLACE[place];
  const elevation = f?.om[place]?.elevation;

  // gulir ke jam yang relevan (dari itinerary, atau sekarang)
  const target = floorHour(focusT ?? now);
  const targetRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    targetRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [place, interval, focusT]);
  const nearestRow = rows.reduce<number | null>((best, h) => (best === null || Math.abs(h.t - target) < Math.abs(best - target) ? h.t : best), null);

  return (
    <div className="space-y-4">
      <PlaceChips value={place} onChange={onPlace} />
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-lg font-extrabold">{meta.name}</h2>
            <div className="text-sm text-muted">
              {elevation ? `${Math.round(elevation)} mdpl · ` : ''}BMKG desa {meta.bmkgDesa}
            </div>
          </div>
        </div>
        {hours.length ? (
          <TempRainChart hours={hours} now={now} placeName={meta.name} />
        ) : (
          <div className="grid h-40 place-items-center text-sm text-muted">{f ? 'Prakiraan untuk tanggal ini belum tersedia' : 'Memuat prakiraan…'}</div>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-extrabold">Tabel per {interval} jam</h2>
        <IntervalChips value={interval} onChange={onIntervalChange} />
      </div>

      {[...byDay.entries()].map(([date, list]) => (
        <Card key={date} className="overflow-hidden">
          <div className="border-b border-line bg-card2 px-4 py-2 text-sm font-extrabold sm:px-5">{fmtDay(date)}</div>
          <ol>
            {list.map((h) => {
              const b = f ? bmkgAt(f, place, h.t) : undefined;
              const bmkgHere = b && Math.abs(b.t - h.t) < HOUR ? b : undefined;
              const isNow = now >= h.t && now < h.t + interval * HOUR;
              const wet = h.pp >= 50 || severity(h.code) >= 3;
              return (
                <li
                  key={h.t}
                  ref={h.t === nearestRow ? targetRef : undefined}
                  className={`grid grid-cols-[48px_40px_1fr_auto] items-center gap-x-2 border-b border-line px-4 py-2 last:border-b-0 sm:grid-cols-[56px_44px_1fr_auto_auto] sm:px-5 ${
                    isNow ? 'bg-day2/10' : ''
                  } ${h.t < floorHour(now) && !isNow ? 'opacity-55' : ''}`}
                >
                  <div className="text-sm font-extrabold tabular-nums">
                    {hhmm(h.t)}
                    {isNow && <div className="text-[10px] font-bold uppercase text-day2">sekarang</div>}
                  </div>
                  <WxIcon src={hourIcon(h)} size={40} />
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-extrabold">{round(h.temp)}°</span>
                      <span className="truncate text-xs text-muted">terasa {round(h.feels)}° · {hourLabel(h)}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>angin {round(h.wind)} km/j</span>
                      <span className={h.vis < 1000 ? 'font-semibold text-fog' : ''}>pandang {fmtVis(h.vis)}</span>
                      <span className="sm:hidden">{bmkgHere && <BmkgChip b={bmkgHere} />}</span>
                    </div>
                  </div>
                  <div className="w-[72px] text-right">
                    <div className={`text-sm font-extrabold ${wet ? 'text-rain' : ''}`}>{round(h.pp)}%</div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-rain" style={{ width: `${h.pp}%` }} />
                    </div>
                    {h.mm > 0 && <div className="mt-0.5 text-[11px] text-muted">{h.mm.toFixed(1)} mm</div>}
                  </div>
                  <div className="hidden min-w-[150px] justify-end sm:flex">{bmkgHere && <BmkgChip b={bmkgHere} />}</div>
                </li>
              );
            })}
          </ol>
        </Card>
      ))}
    </div>
  );
}
