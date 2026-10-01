import { useCallback, useEffect, useRef, useState } from 'react';
import { PLACES } from '../data/places';
import { MIN } from '../lib/time';
import { fetchBmkg, fetchOpenMeteo } from './sources';
import type { BmkgVillage, Forecast } from './types';

const CACHE_KEY = 'wx-dieng-cache-v1';
/** Data dianggap basi setelah 30 menit (BMKG memperbarui per jam). */
const STALE_MS = 30 * MIN;

function readCache(): Forecast | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Forecast) : null;
  } catch {
    return null;
  }
}

function writeCache(f: Forecast) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(f));
  } catch {
    // penyimpanan penuh / mode privat: app tetap jalan tanpa cache
  }
}

export type LoadState = 'idle' | 'loading' | 'error';

/**
 * Prakiraan untuk semua lokasi. Data terakhir disimpan di perangkat,
 * jadi tetap bisa dibuka saat sinyal di Dieng hilang.
 */
export function useForecast(start: string, end: string) {
  const [data, setData] = useState<Forecast | null>(readCache);
  const [state, setState] = useState<LoadState>('idle');
  const [online, setOnline] = useState(() => navigator.onLine);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setState('loading');
    const adm4s = [...new Set(PLACES.map((p) => p.adm4))];
    const [om, ...bmkgs] = await Promise.allSettled([fetchOpenMeteo(PLACES, start, end), ...adm4s.map(fetchBmkg)]);

    const bmkg: Record<string, BmkgVillage> = {};
    let bmkgFailed = 0;
    bmkgs.forEach((r, i) => {
      if (r.status === 'fulfilled') bmkg[adm4s[i]] = r.value;
      else bmkgFailed++;
    });

    if (om.status === 'rejected' && bmkgFailed === adm4s.length) {
      setState('error');
      busy.current = false;
      return;
    }

    setData((prev) => {
      // Bagian yang gagal diambil memakai data lama (kalau rentang tanggalnya sama).
      const sameRange = prev && prev.start === start && prev.end === end;
      const next: Forecast = {
        fetchedAt: Date.now(),
        start,
        end,
        om: om.status === 'fulfilled' ? om.value : sameRange ? prev.om : {},
        bmkg: { ...(sameRange ? prev.bmkg : {}), ...bmkg },
        errors: {
          om: om.status === 'rejected' ? String(om.reason?.message ?? om.reason) : undefined,
          bmkg: bmkgFailed ? `${bmkgFailed} desa gagal dimuat` : undefined,
        },
      };
      writeCache(next);
      return next;
    });
    setState('idle');
    busy.current = false;
  }, [start, end]);

  // Muat saat dibuka / tanggal trip berubah, lalu tiap 30 menit selama halaman terbuka.
  useEffect(() => {
    const fresh = data && data.start === start && data.end === end && Date.now() - data.fetchedAt < STALE_MS;
    if (!fresh) void load();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, STALE_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      void load();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [load]);

  const matches = data && data.start === start && data.end === end ? data : null;
  return { data: matches, state, online, reload: load };
}
