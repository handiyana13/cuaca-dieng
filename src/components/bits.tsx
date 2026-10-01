import type { ReactNode } from 'react';
import type { Tip, Tone } from '../weather/interpret';
import type { BmkgPoint, HourPoint } from '../weather/types';
import { bmkgIcon, hourIcon, hourLabel } from '../weather/interpret';
import { ICON } from '../weather/icons';
import { hhmm } from '../lib/time';

export function WxIcon({ src, size = 40, className = '' }: { src: string; size?: number; className?: string }) {
  return <img src={src} alt="" width={size} height={size} className={`shrink-0 select-none ${className}`} draggable={false} />;
}

export const round = (n: number) => Math.round(n);

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-3xl border border-line bg-card shadow-[0_1px_2px_rgba(10,20,35,.04),0_8px_24px_-12px_rgba(10,20,35,.12)] ${className}`}>{children}</section>;
}

const TONE_CLASS: Record<Tone, string> = {
  rain: 'bg-rain/12 text-rain',
  cold: 'bg-cold/12 text-cold',
  fog: 'bg-fog/15 text-fog',
  wind: 'bg-warn/12 text-warn',
  sun: 'bg-day3/15 text-ink',
  ok: 'bg-ok/12 text-ok',
};
const TONE_ICON: Record<Tone, string> = {
  rain: ICON.umbrella,
  cold: ICON.thermometerColder,
  fog: ICON.mist,
  wind: ICON.wind,
  sun: ICON.clearDay,
  ok: ICON.clearDay,
};

export function TipChip({ tip }: { tip: Tip }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2.5 text-[12.5px] font-semibold leading-snug ${TONE_CLASS[tip.tone]}`}>
      <WxIcon src={TONE_ICON[tip.tone]} size={22} />
      {tip.text}
    </span>
  );
}

/** Ringkas: ikon + suhu + peluang hujan. */
export function WeatherPill({ hour, size = 'md' }: { hour?: HourPoint; size?: 'md' | 'lg' }) {
  if (!hour) return <span className="text-sm text-muted">—</span>;
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-1.5">
      <WxIcon src={hourIcon(hour)} size={big ? 64 : 46} />
      <div className="text-right leading-none">
        <div className={`${big ? 'text-4xl' : 'text-2xl'} font-extrabold tracking-tight`}>{round(hour.temp)}°</div>
        <div className="mt-1 flex items-center justify-end gap-0.5 text-xs font-bold text-rain">
          <WxIcon src={ICON.raindrop} size={16} className="-mr-0.5" />
          {round(hour.pp)}%
        </div>
      </div>
    </div>
  );
}

export function BmkgChip({ b }: { b?: BmkgPoint }) {
  if (!b) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-card2 py-0.5 pl-0.5 pr-2 text-[11.5px] font-semibold text-muted" title={`Prakiraan BMKG pukul ${hhmm(b.t)}`}>
      <WxIcon src={bmkgIcon(b)} size={20} />
      <span className="font-extrabold tracking-wide text-ink/70">BMKG</span> {b.desc}
    </span>
  );
}

function Metric({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-card2 p-2">
      <WxIcon src={icon} size={30} />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
        <div className="truncate text-sm font-bold">
          {value}
          {sub && <span className="ml-1 font-semibold text-muted">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

export function fmtVis(m: number): string {
  if (m >= 10000) return '>10 km';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m / 10) * 10} m`;
}

/** Detail lengkap satu jam + perbandingan BMKG. */
export function DetailGrid({ hour, bmkg }: { hour?: HourPoint; bmkg?: BmkgPoint }) {
  return (
    <div className="space-y-2">
      {hour && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Model per jam · {hhmm(hour.t)} · {hourLabel(hour)}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Metric icon={ICON.thermometer} label="Suhu" value={`${round(hour.temp)}°C`} sub={`terasa ${round(hour.feels)}°`} />
            <Metric icon={ICON.raindrop} label="Peluang hujan" value={`${round(hour.pp)}%`} sub={hour.mm > 0 ? `${hour.mm.toFixed(1)} mm` : undefined} />
            <Metric icon={ICON.wind} label="Angin" value={`${round(hour.wind)} km/j`} sub={`hembusan ${round(hour.gust)}`} />
            <Metric icon={ICON.humidity} label="Kelembapan" value={`${round(hour.hum)}%`} />
            <Metric icon={ICON.cloudy} label="Awan" value={`${round(hour.cloud)}%`} sub={`rendah ${round(hour.low)}%`} />
            <Metric icon={ICON.mist} label="Jarak pandang" value={fmtVis(hour.vis)} />
          </div>
        </>
      )}
      {bmkg && (
        <div className="flex items-center gap-3 rounded-2xl border border-dashed border-line p-2.5">
          <WxIcon src={bmkgIcon(bmkg)} size={40} />
          <div className="min-w-0 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted">BMKG resmi · {hhmm(bmkg.t)}</div>
            <div className="font-bold">
              {bmkg.desc} · {bmkg.temp}°C
            </div>
            <div className="text-xs text-muted">
              Kelembapan {bmkg.hum}% · angin {bmkg.wind} km/j dari {bmkg.windFrom}
              {bmkg.mm > 0 ? ` · hujan ${bmkg.mm} mm` : ''}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
