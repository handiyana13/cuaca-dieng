import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_TRIP_START } from './data/itinerary';
import type { PlaceId } from './data/places';
import { addDays, at, nowLocal, type LocalMs } from './lib/time';
import { buildTrip } from './lib/trip';
import { useForecast } from './weather/useForecast';
import { Hero } from './components/Hero';
import { NowCard } from './components/NowCard';
import { ItineraryView } from './components/ItineraryView';
import { HourlyView } from './components/HourlyView';
import { MapView } from './components/MapView';
import type { Interval } from './components/controls';

type Tab = 'itinerary' | 'map' | 'hourly';

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // abaikan: mode privat / penyimpanan penuh
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  // v2: tanggal default berubah ke 2 Okt; kunci baru supaya tanggal lama yang tersimpan di HP tidak terpakai
  const [tripStart, setTripStart] = useStored('wx-trip-start-v2', DEFAULT_TRIP_START);
  const [interval, setInterval_] = useStored<Interval>('wx-interval', 3);
  const [tab, setTab] = useState<Tab>('itinerary');
  const [place, setPlace] = useState<PlaceId>('candi-arjuna');
  const [focusT, setFocusT] = useState<LocalMs | undefined>();
  const [now, setNow] = useState(nowLocal);

  useEffect(() => {
    const t = setInterval(() => setNow(nowLocal()), 60_000);
    return () => clearInterval(t);
  }, []);

  const end = addDays(tripStart, 2);
  const { data, state, online, reload } = useForecast(tripStart, end);
  const trip = useMemo(() => buildTrip(tripStart), [tripStart]);

  const inTrip = now >= at(tripStart, '00:00') && now <= at(end, '23:59');
  const [mapTime, setMapTime] = useState<LocalMs>(() => (inTrip ? now : at(addDays(tripStart, 1), '08:00')));
  useEffect(() => {
    if (!inTrip) setMapTime(at(addDays(tripStart, 1), '08:00'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripStart]);

  const go = (next: Tab) => {
    setTab(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPlace = (p: PlaceId, view: 'map' | 'hourly', t?: LocalMs) => {
    setPlace(p);
    if (t) {
      setMapTime(t);
      setFocusT(t);
    }
    go(view);
  };

  return (
    <div className="min-h-dvh pb-[calc(88px+env(safe-area-inset-bottom))] lg:pb-10">
      <Hero tripStart={tripStart} onTripStart={setTripStart} fetchedAt={data?.fetchedAt} state={state} online={online} onReload={() => void reload()} />

      <main className="relative mx-auto -mt-10 max-w-5xl space-y-4 px-4 sm:px-6">
        {!online && (
          <div className="rounded-2xl bg-warn/12 px-4 py-2 text-sm font-semibold text-warn">Offline — menampilkan data terakhir yang tersimpan di perangkat.</div>
        )}
        {state === 'error' && !data && (
          <div className="rounded-2xl bg-warn/12 px-4 py-2 text-sm font-semibold text-warn">Gagal memuat prakiraan. Cek koneksi lalu ketuk Perbarui.</div>
        )}
        {data?.errors.om && <div className="rounded-2xl bg-warn/12 px-4 py-2 text-sm text-warn">Model per jam: {data.errors.om}</div>}

        <NowCard forecast={data} trip={trip} tripStart={tripStart} now={now} />

        {/* tab atas untuk layar lebar */}
        <nav className="sticky top-3 z-[600] hidden justify-center lg:flex">
          <div className="flex rounded-2xl border border-line bg-card/90 p-1 shadow-lg backdrop-blur">
            <TabButtons tab={tab} onTab={go} wide />
          </div>
        </nav>

        {tab === 'itinerary' && <ItineraryView forecast={data} trip={trip} tripStart={tripStart} now={now} onOpenPlace={openPlace} />}
        {tab === 'map' && (
          <MapView
            forecast={data}
            tripStart={tripStart}
            now={now}
            place={place}
            onPlace={setPlace}
            time={mapTime}
            onTime={setMapTime}
            interval={interval}
            onIntervalChange={setInterval_}
            onHourly={(p) => openPlace(p, 'hourly', mapTime)}
          />
        )}
        {tab === 'hourly' && (
          <HourlyView
            forecast={data}
            place={place}
            onPlace={(p) => {
              setPlace(p);
              setFocusT(undefined);
            }}
            interval={interval}
            onIntervalChange={setInterval_}
            tripStart={tripStart}
            now={now}
            focusT={focusT}
          />
        )}

        <footer className="space-y-1 pt-4 text-center text-xs text-muted">
          <p>
            Sumber: <a className="underline" href="https://data.bmkg.go.id/prakiraan-cuaca/" target="_blank" rel="noreferrer">BMKG</a> (prakiraan resmi per desa, 3 jam) &{' '}
            <a className="underline" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> (model per jam, dikoreksi ke ketinggian, CC BY 4.0).
          </p>
          <p>Suhu BMKG untuk Dieng cenderung lebih hangat karena grid modelnya berada di elevasi lebih rendah; suhu utama memakai Open-Meteo.</p>
          <p>Ikon: Meteocons (MIT) · Peta: Esri · Koordinat: OpenStreetMap.</p>
        </footer>
      </main>

      {/* tab bawah untuk HP */}
      <nav className="fixed inset-x-0 bottom-0 z-[600] border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-md">
          <TabButtons tab={tab} onTab={go} />
        </div>
      </nav>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: 'itinerary',
    label: 'Itinerary',
    icon: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  },
  {
    id: 'map',
    label: 'Peta',
    icon: <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />,
  },
  {
    id: 'hourly',
    label: 'Per jam',
    icon: <path d="M4 19V9m6 10V5m6 14v-7m4 7H2" />,
  },
];

function TabButtons({ tab, onTab, wide }: { tab: Tab; onTab: (t: Tab) => void; wide?: boolean }) {
  return (
    <>
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onTab(t.id)}
            aria-current={active ? 'page' : undefined}
            className={
              wide
                ? `flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold transition ${active ? 'bg-day1 text-white' : 'text-muted hover:text-ink'}`
                : `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition ${active ? 'text-day1' : 'text-muted'}`
            }
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              {t.icon}
            </svg>
            {t.label}
          </button>
        );
      })}
    </>
  );
}
