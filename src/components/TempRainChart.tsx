import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { fmtDay, hhmm, type LocalMs } from '../lib/time';
import type { HourPoint } from '../weather/types';

const H_TEMP = 132;
const H_RAIN = 78;
const GAP = 18;
const X_AXIS = 22;
const LEFT = 34;
const RIGHT = 10;
const TOP = 18;

/**
 * Dua grafik bertumpuk dengan sumbu waktu yang sama: suhu (garis) dan peluang hujan (kolom).
 * Sengaja tidak memakai dua sumbu Y dalam satu grafik. Tabel di bawahnya adalah versi tabel dari data ini.
 */
export function TempRainChart({ hours, now, placeName }: { hours: HourPoint[]; now: LocalMs; placeName: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    if (!hours.length || !width) return null;
    const t0 = hours[0].t;
    const t1 = hours[hours.length - 1].t;
    const plotW = width - LEFT - RIGHT;
    const x = (t: number) => LEFT + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
    const temps = hours.map((h) => h.temp);
    const lo = Math.floor(Math.min(...temps)) - 1;
    const hi = Math.ceil(Math.max(...temps)) + 1;
    const step = hi - lo > 12 ? 5 : 2;
    const yT = (v: number) => TOP + (1 - (v - lo) / (hi - lo)) * H_TEMP;
    const rainTop = TOP + H_TEMP + GAP;
    const yR = (pp: number) => rainTop + (1 - pp / 100) * H_RAIN;
    const ticksT: number[] = [];
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) ticksT.push(v);
    const slot = plotW / Math.max(1, hours.length - 1);
    const barW = Math.max(1, Math.min(24, slot - 2));
    const minI = temps.indexOf(Math.min(...temps));
    const maxI = temps.indexOf(Math.max(...temps));
    const days = hours.filter((h) => new Date(h.t).getUTCHours() === 0).map((h) => h.t);
    return { t0, t1, plotW, x, yT, yR, rainTop, ticksT, barW, minI, maxI, days };
  }, [hours, width]);

  const height = TOP + H_TEMP + GAP + H_RAIN + X_AXIS;

  const pick = (clientX: number) => {
    if (!geo || !wrap.current) return;
    const rect = wrap.current.getBoundingClientRect();
    const rel = (clientX - rect.left - LEFT) / geo.plotW;
    setHover(Math.max(0, Math.min(hours.length - 1, Math.round(rel * (hours.length - 1)))));
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const d = e.key === 'ArrowRight' ? 1 : -1;
      setHover((h) => Math.max(0, Math.min(hours.length - 1, (h ?? 0) + d)));
    } else if (e.key === 'Escape') setHover(null);
  };

  const line = geo ? hours.map((h, i) => `${i ? 'L' : 'M'}${geo.x(h.t).toFixed(1)},${geo.yT(h.temp).toFixed(1)}`).join('') : '';
  const area = geo ? `${line}L${geo.x(hours[hours.length - 1].t)},${TOP + H_TEMP}L${geo.x(hours[0].t)},${TOP + H_TEMP}Z` : '';
  const h = hover !== null ? hours[hover] : null;

  return (
    <div
      ref={wrap}
      className="relative select-none outline-none focus-visible:ring-2 focus-visible:ring-rain/40"
      tabIndex={0}
      onKeyDown={onKey}
      onPointerMove={(e: PointerEvent) => pick(e.clientX)}
      onPointerDown={(e: PointerEvent) => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={`Grafik suhu dan peluang hujan per jam di ${placeName}. Gunakan panah kiri/kanan untuk membaca nilai.`}
      style={{ touchAction: 'pan-y' }}
    >
      <svg width={width} height={height} className="block overflow-visible">
        {geo && (
          <>
            {/* panel suhu */}
            <text x={LEFT} y={10} className="fill-muted text-[11px] font-bold">
              Suhu (°C)
            </text>
            {geo.ticksT.map((v) => (
              <g key={v}>
                <line x1={LEFT} x2={width - RIGHT} y1={geo.yT(v)} y2={geo.yT(v)} stroke="var(--line)" strokeWidth={1} />
                <text x={LEFT - 6} y={geo.yT(v) + 4} textAnchor="end" className="fill-muted text-[10.5px] tabular-nums">
                  {v}
                </text>
              </g>
            ))}
            <path d={area} fill="var(--temp)" opacity={0.1} />
            <path d={line} fill="none" stroke="var(--temp)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {[geo.minI, geo.maxI].map((i, k) => {
              const p = hours[i];
              const cx = geo.x(p.t);
              const cy = geo.yT(p.temp);
              const anchor = cx < LEFT + 30 ? 'start' : cx > width - RIGHT - 30 ? 'end' : 'middle';
              return (
                <g key={k}>
                  <circle cx={cx} cy={cy} r={4} fill="var(--temp)" stroke="var(--card)" strokeWidth={2} />
                  <text x={cx} y={k === 0 ? cy + 17 : cy - 9} textAnchor={anchor} className="fill-ink text-[11px] font-bold">
                    {k === 0 ? 'min ' : 'maks '}
                    {Math.round(p.temp)}°
                  </text>
                </g>
              );
            })}

            {/* panel hujan */}
            <text x={LEFT} y={geo.rainTop - 5} className="fill-muted text-[11px] font-bold">
              Peluang hujan (%)
            </text>
            {[0, 50, 100].map((v) => (
              <g key={v}>
                <line x1={LEFT} x2={width - RIGHT} y1={geo.yR(v)} y2={geo.yR(v)} stroke="var(--line)" strokeWidth={1} />
                <text x={LEFT - 6} y={geo.yR(v) + 4} textAnchor="end" className="fill-muted text-[10.5px] tabular-nums">
                  {v}
                </text>
              </g>
            ))}
            {hours.map((p) => {
              if (p.pp <= 0) return null;
              const cx = geo.x(p.t);
              const w = geo.barW;
              const top = geo.yR(p.pp);
              const base = geo.yR(0);
              const r = Math.min(4, w / 2, base - top);
              const x0 = cx - w / 2;
              return (
                <path
                  key={p.t}
                  d={`M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x0 + w - r}Q${x0 + w},${top} ${x0 + w},${top + r}V${base}Z`}
                  fill="var(--rain)"
                  opacity={h && h.t !== p.t ? 0.55 : 1}
                />
              );
            })}

            {/* batas hari + label */}
            {geo.days.map((t) => (
              <g key={t}>
                <line x1={geo.x(t)} x2={geo.x(t)} y1={TOP} y2={geo.yR(0)} stroke="var(--line)" strokeWidth={1} />
                <text x={geo.x(t) + 4} y={height - 6} className="fill-muted text-[10.5px] font-semibold">
                  {fmtDay(t, true)}
                </text>
              </g>
            ))}

            {/* sekarang */}
            {now >= geo.t0 && now <= geo.t1 && (
              <g>
                <line x1={geo.x(now)} x2={geo.x(now)} y1={TOP} y2={geo.yR(0)} stroke="var(--ink)" strokeWidth={1} />
                <text x={geo.x(now)} y={TOP - 4} textAnchor="middle" className="fill-ink text-[10.5px] font-bold">
                  sekarang
                </text>
              </g>
            )}

            {/* crosshair */}
            {h && (
              <line x1={geo.x(h.t)} x2={geo.x(h.t)} y1={TOP} y2={geo.yR(0)} stroke="var(--muted)" strokeWidth={1} />
            )}
          </>
        )}
      </svg>

      {h && geo && (
        <div
          className="pointer-events-none absolute top-6 z-10 min-w-[150px] rounded-xl border border-line bg-card px-3 py-2 text-xs shadow-lg"
          style={geo.x(h.t) > width / 2 ? { right: width - geo.x(h.t) + 10 } : { left: geo.x(h.t) + 10 }}
        >
          <div className="font-semibold text-muted">
            {fmtDay(h.t, true)} · {hhmm(h.t)}
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-0.5 w-3 rounded" style={{ background: 'var(--temp)' }} />
            <b className="text-sm">{Math.round(h.temp)}°C</b>
            <span className="text-muted">suhu</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-3 rounded" style={{ background: 'var(--rain)' }} />
            <b className="text-sm">{Math.round(h.pp)}%</b>
            <span className="text-muted">peluang hujan</span>
          </div>
        </div>
      )}
    </div>
  );
}
