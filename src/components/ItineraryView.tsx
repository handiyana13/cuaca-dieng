import { useState } from 'react';
import { DAY_META } from '../data/itinerary';
import { PLACE, type PlaceId } from '../data/places';
import { HOUR, fmtDay, hhmm, type LocalMs } from '../lib/time';
import { tripDays, type TimedActivity } from '../lib/trip';
import { ICON } from '../weather/icons';
import { hourIcon, packingList, sunriseOutlook, tipsFor } from '../weather/interpret';
import { dailyAt, slotFor } from '../weather/lookup';
import { hoursBetween, rainWindows } from '../weather/summary';
import type { Forecast } from '../weather/types';
import { BmkgChip, Card, DetailGrid, TipChip, WeatherPill, WxIcon, fmtVis, round } from './bits';

interface Props {
  forecast: Forecast | null;
  trip: TimedActivity[];
  tripStart: string;
  now: LocalMs;
  onOpenPlace: (place: PlaceId, view: 'map' | 'hourly', t?: LocalMs) => void;
}

export function ItineraryView({ forecast: f, trip, tripStart, now, onOpenPlace }: Props) {
  const days = tripDays(tripStart);
  return (
    <div className="space-y-5">
      {f && <TripSummary f={f} tripStart={tripStart} />}
      {days.map((date, i) => {
        const day = (i + 1) as 1 | 2 | 3;
        return <DaySection key={date} day={day} date={date} f={f} acts={trip.filter((a) => a.day === day)} now={now} onOpenPlace={onOpenPlace} />;
      })}
    </div>
  );
}

function TripSummary({ f, tripStart }: { f: Forecast; tripStart: string }) {
  const [, day2, day3] = tripDays(tripStart);
  const dieng = [day2, day3].map((date) => ({ date, d: dailyAt(f, 'dieng', date), rain: rainWindows(f, 'dieng', date) }));
  const tripHours = hoursBetween(f, 'dieng', trip0(day2), trip0(day3) + 24 * HOUR).concat(hoursBetween(f, 'sikunir', trip0(day3), trip0(day3) + 8 * HOUR));
  const uv = Math.max(0, ...dieng.map((x) => x.d?.uvMax ?? 0));
  const pack = packingList(tripHours, [], uv);
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-base font-extrabold">Ringkasan cuaca di Dieng</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {dieng.map(({ date, d, rain }) => (
          <div key={date} className="rounded-2xl bg-card2 p-3">
            <div className="text-sm font-bold">{fmtDay(date)}</div>
            {d ? (
              <>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold tracking-tight">
                    {round(d.tmin)}°<span className="text-muted">–</span>
                    {round(d.tmax)}°
                  </span>
                  <span className="text-sm text-muted">UV maks {round(d.uvMax)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-sm">
                  <WxIcon src={ICON.umbrella} size={22} />
                  {rain.length ? (
                    <span>
                      Hujan <b>{rain.join(', ')}</b>
                    </span>
                  ) : (
                    <span className="text-muted">Tidak ada jam rawan hujan</span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-3 text-sm text-muted">
                  <span className="flex items-center gap-1">
                    <WxIcon src={ICON.sunrise} size={22} /> {hhmm(d.sunrise)}
                  </span>
                  <span className="flex items-center gap-1">
                    <WxIcon src={ICON.sunset} size={22} /> {hhmm(d.sunset)}
                  </span>
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-muted">Prakiraan belum tersedia</div>
            )}
          </div>
        ))}
      </div>
      {pack.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-extrabold">Jangan lupa bawa</h3>
          <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {pack.map((p) => (
              <li key={p.text} className="flex items-center gap-2 text-sm">
                <WxIcon src={p.icon} size={28} />
                {p.text}
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

const trip0 = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));

interface DayProps {
  day: 1 | 2 | 3;
  date: string;
  f: Forecast | null;
  acts: TimedActivity[];
  now: LocalMs;
  onOpenPlace: Props['onOpenPlace'];
}

function DaySection({ day, date, f, acts, now, onOpenPlace }: DayProps) {
  const meta = DAY_META[day];
  return (
    <section>
      <div className="mb-2 flex items-center gap-3">
        <div className="-rotate-2 rounded-xl px-3 py-1.5 text-white shadow-sm" style={{ background: meta.color, color: day === 3 ? 'var(--day3-ink)' : '#fff' }}>
          <div className="text-[15px] font-extrabold uppercase leading-none tracking-wide">{meta.label}</div>
        </div>
        <div className="text-sm font-semibold text-muted">{fmtDay(date)}</div>
      </div>
      <Card className="overflow-hidden">
        <ol className="relative">
          {acts.map((a, i) => (
            <ActivityRow key={a.id} a={a} f={f} now={now} color={meta.color} last={i === acts.length - 1} onOpenPlace={onOpenPlace} />
          ))}
        </ol>
      </Card>
    </section>
  );
}

interface RowProps {
  a: TimedActivity;
  f: Forecast | null;
  now: LocalMs;
  color: string;
  last: boolean;
  onOpenPlace: Props['onOpenPlace'];
}

function ActivityRow({ a, f, now, color, last, onOpenPlace }: RowProps) {
  const [open, setOpen] = useState(false);
  const slot = f ? slotFor(f, a.place, a.startT, a.rangeEnd) : {};
  const tips = tipsFor(slot.hour, slot.bmkg, slot.range?.ppMax);
  const isNow = now >= a.startT && now < a.endT;
  const isPast = now >= a.endT;
  const place = PLACE[a.place];

  return (
    <li className={`relative border-line ${last ? '' : 'border-b'} ${isPast ? 'opacity-55' : ''}`}>
      {isNow && <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} />}
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full gap-3 px-4 py-3 text-left hover:bg-card2/60 sm:px-5" aria-expanded={open}>
        <div className="w-[52px] shrink-0 pt-0.5">
          <div className="text-[15px] font-extrabold tabular-nums">{a.start}</div>
          {a.end && <div className="text-xs font-semibold tabular-nums text-muted">–{a.end}</div>}
        </div>
        <div className="min-w-0 flex-1">
          {isNow && (
            <span className="mb-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: color }}>
              SEKARANG
            </span>
          )}
          <div className="font-bold leading-snug">{a.title}</div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-muted">
            <span>📍 {place.short}</span>
            {a.cost && (
              <span className={`rounded-md px-1.5 text-[11px] font-bold uppercase ${a.cost === 'include' ? 'bg-ok/12 text-ok' : 'bg-warn/12 text-warn'}`}>{a.cost}</span>
            )}
            {slot.range && (
              <span>
                {round(slot.range.tmin) === round(slot.range.tmax) ? `${round(slot.range.tmin)}°` : `${round(slot.range.tmin)}°–${round(slot.range.tmax)}°`} · hujan s/d{' '}
                {round(slot.range.ppMax)}%
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">{f ? <WeatherPill hour={slot.hour} /> : <div className="h-12 w-20 animate-pulse rounded-xl bg-card2" />}</div>
      </button>

      {f && (a.sunrise ? <SunriseCard f={f} a={a} /> : null)}

      {f && (
        <div className="-mt-1 flex flex-wrap gap-1.5 px-4 pb-3 pl-[76px] sm:px-5 sm:pl-[80px]">
          {tips.slice(0, open ? undefined : 2).map((t) => (
            <TipChip key={t.text} tip={t} />
          ))}
          <BmkgChip b={slot.bmkg} />
        </div>
      )}

      {open && f && (
        <div className="space-y-3 px-4 pb-4 sm:px-5 sm:pl-[80px]">
          <DetailGrid hour={slot.hour} bmkg={slot.bmkg} />
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenPlace(a.place, 'map', a.startT)} className="rounded-xl bg-card2 px-3 py-2 text-sm font-bold hover:bg-line">
              Lihat di peta
            </button>
            <button type="button" onClick={() => onOpenPlace(a.place, 'hourly', a.startT)} className="rounded-xl bg-card2 px-3 py-2 text-sm font-bold hover:bg-line">
              Cuaca per jam
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** Kartu khusus sunrise Sikunir: jam matahari terbit, skor peluang, alasan, dan cuaca 03:00–07:00. */
function SunriseCard({ f, a }: { f: Forecast; a: TimedActivity }) {
  const day = dailyAt(f, 'sikunir', a.date);
  if (!day) return null;
  const around = hoursBetween(f, 'sikunir', day.sunrise - HOUR, day.sunrise + HOUR);
  const outlook = sunriseOutlook(day, around);
  if (!outlook) return null;
  const strip = hoursBetween(f, 'sikunir', a.startT - 2 * HOUR, a.startT + 3 * HOUR);
  const tone = outlook.score >= 65 ? 'var(--ok)' : outlook.score >= 40 ? 'var(--day3)' : 'var(--warn)';

  return (
    <div className="mx-4 mb-3 overflow-hidden rounded-2xl border border-line sm:mx-5 sm:ml-[80px]" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--day3) 18%, var(--card)), var(--card))' }}>
      <div className="flex items-center gap-3 p-3">
        <WxIcon src={ICON.sunrise} size={56} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">Matahari terbit {hhmm(outlook.time)} WIB</div>
          <div className="text-lg font-extrabold leading-tight">Peluang golden sunrise: {outlook.label}</div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={outlook.score}>
            <div className="h-full rounded-full" style={{ width: `${outlook.score}%`, background: tone }} />
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold">{outlook.score}</div>
          <div className="text-[11px] font-semibold text-muted">/100</div>
        </div>
      </div>
      <ul className="space-y-0.5 px-3 pb-2 text-[13px]">
        {outlook.reasons.map((r) => (
          <li key={r}>• {r}</li>
        ))}
      </ul>
      <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-line px-2 py-2">
        {strip.map((h) => (
          <div key={h.t} className={`flex min-w-[58px] flex-col items-center rounded-xl px-1 py-1 text-xs ${h.t === Math.floor(outlook.time / HOUR) * HOUR ? 'bg-day3/20' : ''}`}>
            <span className="font-bold tabular-nums">{hhmm(h.t)}</span>
            <WxIcon src={hourIcon(h)} size={32} />
            <span className="font-extrabold">{round(h.temp)}°</span>
            <span className="text-muted">{fmtVis(h.vis)}</span>
          </div>
        ))}
      </div>
      <p className="border-t border-line px-3 py-2 text-[11.5px] text-muted">
        Skor dari jarak pandang (kabut), awan menengah, dan peluang hujan sekitar jam matahari terbit. Kondisi puncak bisa berubah cepat.
      </p>
    </div>
  );
}
