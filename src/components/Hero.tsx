import { useState } from 'react';
import { addDays, ago, dateOf, fmtRange, nowLocal } from '../lib/time';
import type { LoadState } from '../weather/useForecast';

interface Props {
  tripStart: string;
  onTripStart: (date: string) => void;
  fetchedAt?: number;
  state: LoadState;
  online: boolean;
  onReload: () => void;
}

/** Warna langit mengikuti jam WIB saat ini: subuh, siang, senja, malam. */
function sky(hour: number): [string, string] {
  if (hour >= 4 && hour < 7) return ['#2f3f72', '#e7966b'];
  if (hour >= 7 && hour < 16) return ['#2f6fbf', '#8fc0e8'];
  if (hour >= 16 && hour < 19) return ['#2b3b6e', '#e3805a'];
  return ['#0a1428', '#273c63'];
}

export function Hero({ tripStart, onTripStart, fetchedAt, state, online, onReload }: Props) {
  const [editing, setEditing] = useState(false);
  const [top, bottom] = sky(new Date(nowLocal()).getUTCHours());
  const end = addDays(tripStart, 2);

  return (
    <header className="relative overflow-hidden pb-14 text-white" style={{ background: `linear-gradient(180deg, ${top}, ${bottom})` }}>
      {/* siluet pegunungan Dieng + candi */}
      <svg className="pointer-events-none absolute inset-x-0 bottom-0 h-36 w-full" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden>
        <path d="M0 70 L40 48 L70 60 L110 30 L150 58 L190 40 L230 62 L270 26 L310 52 L350 38 L400 56 L400 120 L0 120Z" fill="rgba(255,255,255,.14)" />
        <path d="M0 88 L50 66 L90 80 L140 58 L190 82 L240 64 L300 84 L350 66 L400 78 L400 120 L0 120Z" fill="rgba(255,255,255,.2)" />
        <path d="M0 104 L60 92 L120 100 L200 90 L280 102 L340 94 L400 100 L400 120 L0 120Z" fill="var(--bg)" />
      </svg>
      <svg className="pointer-events-none absolute bottom-[34px] right-[9%] h-12 w-10 opacity-35" viewBox="0 0 40 48" aria-hidden>
        <path d="M20 2 L23 8 L22 8 L26 16 L24 16 L29 26 L27 26 L33 38 L36 38 L36 48 L4 48 L4 38 L7 38 L13 26 L11 26 L16 16 L14 16 L18 8 L17 8 Z" fill="#fff" />
      </svg>

      <div className="relative mx-auto max-w-5xl px-4 pt-[max(env(safe-area-inset-top),16px)] sm:px-6">
        <div className="flex items-start justify-between gap-3 pt-2">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">Open Trip 3D2N</div>
            <h1 className="mt-1 text-[34px] font-extrabold leading-none tracking-tight sm:text-5xl">Cuaca Dieng</h1>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur hover:bg-white/25"
            >
              {fmtRange(tripStart, end)}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                <path d="M4 20h4L19 9l-4-4L4 16v4z" />
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={onReload}
            disabled={state === 'loading' || !online}
            className="mt-1 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-left text-xs font-semibold backdrop-blur hover:bg-white/25 disabled:opacity-80"
            title="Muat ulang prakiraan"
          >
            <svg className={state === 'loading' ? 'animate-spin' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
              <path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" />
            </svg>
            <span>
              {!online ? 'Offline' : state === 'loading' ? 'Memuat…' : 'Perbarui'}
              <span className="block font-medium text-white/70">{fetchedAt ? ago(fetchedAt) : 'belum ada data'}</span>
            </span>
          </button>
        </div>

        {editing && (
          <div className="mt-3 rounded-2xl bg-white/95 p-3 text-ink shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted" htmlFor="trip-start">
              Tanggal Hari 1 (penjemputan & berangkat malam)
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                id="trip-start"
                type="date"
                value={tripStart}
                onChange={(e) => e.target.value && onTripStart(e.target.value)}
                className="h-10 rounded-xl border border-line bg-card px-3 font-semibold text-ink"
              />
              {[0, 1].map((n) => {
                const d = addDays(dateOf(nowLocal()), n);
                return (
                  <button key={n} type="button" onClick={() => onTripStart(d)} className="h-10 rounded-xl bg-card2 px-3 text-sm font-bold hover:bg-line">
                    {n === 0 ? 'Hari ini' : 'Besok'}
                  </button>
                );
              })}
              <button type="button" onClick={() => setEditing(false)} className="ml-auto h-10 rounded-xl bg-day1 px-4 text-sm font-bold text-white">
                Selesai
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">Hari 2 & 3 dihitung otomatis. Prakiraan tersedia sampai ±2 minggu ke depan (BMKG 3 hari).</p>
          </div>
        )}
      </div>
    </header>
  );
}
