import { PLACE } from '../data/places';
import { addDays, countdown, fmtDay, hhmm, type LocalMs } from '../lib/time';
import { tripPhase, type TimedActivity } from '../lib/trip';
import { tipsFor } from '../weather/interpret';
import { dailyAt, hourAt, slotFor } from '../weather/lookup';
import { rainWindows } from '../weather/summary';
import type { Forecast } from '../weather/types';
import { BmkgChip, Card, TipChip, WeatherPill, WxIcon, round } from './bits';
import { hourIcon } from '../weather/interpret';

interface Props {
  forecast: Forecast | null;
  trip: TimedActivity[];
  tripStart: string;
  now: LocalMs;
}

/** Kartu utama: kegiatan yang sedang berlangsung + cuacanya, atau hitung mundur sebelum trip. */
export function NowCard({ forecast: f, trip, tripStart, now }: Props) {
  const phase = tripPhase(trip, now);

  if (phase.kind === 'before') {
    const day2 = addDays(tripStart, 1);
    const d = f ? dailyAt(f, 'dieng', day2) : undefined;
    const rain = f ? rainWindows(f, 'dieng', day2) : [];
    const meet = f ? hourAt(f, 'cisalak', now) : undefined;
    return (
      <Card className="p-4 sm:p-5">
        <div className="text-xs font-bold uppercase tracking-wider text-muted">Trip dimulai dalam</div>
        <div className="mt-1 text-3xl font-extrabold tracking-tight">{countdown(phase.first.startT - now)}</div>
        <div className="mt-1 text-sm text-muted">
          {fmtDay(phase.first.startT)} · {hhmm(phase.first.startT)} — {phase.first.title}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {meet && (
            <div className="flex items-center gap-3 rounded-2xl bg-card2 p-3">
              <WxIcon src={hourIcon(meet)} size={48} />
              <div className="text-sm">
                <div className="font-bold">Exit Tol Cisalak sekarang</div>
                <div className="text-muted">
                  {round(meet.temp)}° · peluang hujan {round(meet.pp)}%
                </div>
              </div>
            </div>
          )}
          {d && (
            <div className="rounded-2xl bg-day2/10 p-3 text-sm">
              <div className="font-bold">Di Dieng {fmtDay(day2, true)}</div>
              <div className="text-muted">
                {round(d.tmin)}°–{round(d.tmax)}°C · {rain.length ? `hujan ${rain.join(', ')}` : 'cenderung kering'}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  if (phase.kind === 'after') {
    return (
      <Card className="p-5">
        <div className="text-2xl font-extrabold">Trip selesai 🎉</div>
        <p className="mt-1 text-sm text-muted">Semoga perjalanannya menyenangkan. Ubah tanggal di atas untuk trip berikutnya.</p>
      </Card>
    );
  }

  const { current, next } = phase;
  const slot = f ? slotFor(f, current.place, now) : {};
  const tips = tipsFor(slot.hour, slot.bmkg);
  const nextSlot = f && next ? slotFor(f, next.place, next.startT) : {};
  return (
    <Card className="overflow-hidden">
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-day2/12 px-2.5 py-0.5 text-xs font-bold text-day2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-day2" /> Sekarang · {hhmm(now)}
            </span>
            <div className="mt-2 text-lg font-extrabold leading-snug">{current.title}</div>
            <div className="text-sm text-muted">📍 {PLACE[current.place].name}</div>
          </div>
          <WeatherPill hour={slot.hour} size="lg" />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tips.map((t) => (
            <TipChip key={t.text} tip={t} />
          ))}
          <BmkgChip b={slot.bmkg} />
        </div>
      </div>
      {next && (
        <div className="flex items-center justify-between gap-3 border-t border-line bg-card2 px-4 py-3 sm:px-5">
          <div className="min-w-0 text-sm">
            <span className="font-bold">Berikutnya {hhmm(next.startT)}</span>
            <span className="text-muted"> · dalam {countdown(next.startT - now)}</span>
            <div className="truncate text-muted">{next.title}</div>
          </div>
          {nextSlot.hour && (
            <div className="flex shrink-0 items-center gap-1 text-sm font-bold">
              <WxIcon src={hourIcon(nextSlot.hour)} size={34} />
              {round(nextSlot.hour.temp)}° <span className="text-rain">{round(nextSlot.hour.pp)}%</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
