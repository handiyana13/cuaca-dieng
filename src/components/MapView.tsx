import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { LayerGroup, LayersControl, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { PLACE, PLACES, type Place, type PlaceId } from '../data/places';
import { HOUR, addDays, at, fmtDay, hhmm, type LocalMs } from '../lib/time';
import { hourIcon, tipsFor } from '../weather/interpret';
import { bmkgAt, bmkgPhase, hourAt } from '../weather/lookup';
import { fetchOpenMeteo } from '../weather/sources';
import type { Forecast, OmPlace } from '../weather/types';
import { BmkgChip, Card, TipChip, WeatherPill, WxIcon, round } from './bits';
import { IntervalChips, onInterval, type Interval } from './controls';

interface Props {
  forecast: Forecast | null;
  tripStart: string;
  now: LocalMs;
  place: PlaceId;
  onPlace: (p: PlaceId) => void;
  time: LocalMs;
  onTime: (t: LocalMs) => void;
  interval: Interval;
  onIntervalChange: (v: Interval) => void;
  onHourly: (p: PlaceId) => void;
}

const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services';

// zoom awal: titik-titik itinerary di Dieng saja (spot tambahan & lokasi jauh tetap bisa digeser/dipilih)
const DIENG_BOUNDS = L.latLngBounds(PLACES.filter((p) => !p.far && !p.extra).map((p) => [p.lat, p.lon] as [number, number]));

/** Di bawah zoom ini marker dibuat ringkas (tanpa nama) dan spot tambahan disembunyikan supaya tidak berdempetan. */
const DETAIL_ZOOM = 14;

function ZoomWatcher({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({ zoomend: () => onZoom(map.getZoom()) });
  useEffect(() => onZoom(map.getZoom()), [map, onZoom]);
  return null;
}

function markerHtml(place: Place, f: Forecast | null, t: LocalMs, active: boolean, compact: boolean) {
  const h = f ? hourAt(f, place.id, t) : undefined;
  const body = h
    ? `<img src="${hourIcon(h)}" alt=""/><span>${round(h.temp)}°</span>${compact && !active ? '' : `<span class="wx-marker__pp">${round(h.pp)}%</span>`}`
    : '<span style="padding:6px">…</span>';
  return `<div class="wx-marker ${active ? 'is-active' : ''} ${place.extra ? 'is-extra' : ''} ${place.below ? 'is-below' : ''} ${compact && !active ? 'is-compact' : ''}">
    <div class="wx-marker__pill">${body}</div>
    ${compact && !active ? '' : `<div class="wx-marker__name">${place.short}</div>`}
    <div class="wx-marker__stem"></div>
  </div>`;
}

/** Terbang ke lokasi yang dipilih dari luar peta (mis. tombol "Lihat di peta"). */
function FlyTo({ place }: { place: PlaceId }) {
  const map = useMap();
  useEffect(() => {
    const p = PLACE[place];
    if (p.far) map.flyTo([p.lat, p.lon], 12, { duration: 0.8 });
    else if (!map.getBounds().pad(-0.1).contains([p.lat, p.lon])) map.flyTo([p.lat, p.lon], 14, { duration: 0.8 });
  }, [place, map]);
  return null;
}

function Locate({ onFound }: { onFound: (lat: number, lon: number) => void }) {
  const map = useMap();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        if (!navigator.geolocation) return alert('Perangkat tidak mendukung lokasi.');
        setBusy(true);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setBusy(false);
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 14, { duration: 0.8 });
            onFound(pos.coords.latitude, pos.coords.longitude);
          },
          () => {
            setBusy(false);
            alert('Lokasi tidak bisa diakses. Izinkan akses lokasi di browser.');
          },
          { enableHighAccuracy: true, timeout: 12000 },
        );
      }}
      className="absolute left-3 top-3 z-[500] flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-sm font-bold text-ink shadow-lg"
    >
      <svg className={busy ? 'animate-pulse' : ''} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
      </svg>
      Lokasi saya
    </button>
  );
}

export function MapView({ forecast: f, tripStart, now, place, onPlace, time, onTime, interval, onIntervalChange, onHourly }: Props) {
  const days = [0, 1, 2].map((n) => addDays(tripStart, n));
  const phase = bmkgPhase(f);
  const steps = useMemo(() => {
    const out: LocalMs[] = [];
    for (let t = at(days[0], '00:00'); t <= at(days[2], '23:00'); t += HOUR) if (onInterval(t, interval, phase)) out.push(t);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripStart, interval, phase]);
  // jendela waktu yang sedang berjalan: langkah terakhir yang tidak melewati `time`
  const stepIndex = Math.max(0, steps.reduce((best, t, i) => (t <= time ? i : best), 0));
  const t = steps[stepIndex] ?? time;

  const [me, setMe] = useState<{ lat: number; lon: number; om?: OmPlace; failed?: boolean } | null>(null);
  const onFound = async (lat: number, lon: number) => {
    setMe({ lat, lon });
    try {
      const pseudo = { id: 'me', name: 'Lokasi saya', short: 'Saya', lat, lon, adm4: '', bmkgDesa: '' } as unknown as Place;
      const res = await fetchOpenMeteo([pseudo], days[0], days[2]);
      setMe({ lat, lon, om: res.me });
    } catch {
      // titik lokasi tetap tampil; cuacanya bisa dicoba lagi
      setMe({ lat, lon, failed: true });
    }
  };

  const [zoom, setZoom] = useState(14);
  const compact = zoom < DETAIL_ZOOM;
  const icons = useMemo(
    () => Object.fromEntries(PLACES.map((p) => [p.id, L.divIcon({ className: '', html: markerHtml(p, f, t, p.id === place, compact), iconSize: [0, 0] })])),
    [f, t, place, compact],
  );
  const meIcon = useMemo(() => L.divIcon({ className: '', html: '<div class="wx-me"></div>', iconSize: [0, 0] }), []);

  const sel = PLACE[place];
  const selHour = f ? hourAt(f, place, t) : undefined;
  const selBmkg = f ? bmkgAt(f, place, t) : undefined;
  const ahead = f ? steps.slice(stepIndex, stepIndex + 6).map((s) => hourAt(f, place, s)).filter(Boolean) : [];
  const meHour = me?.om?.hours.find((h) => h.t === t);

  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="relative h-[56vh] min-h-[340px] sm:h-[520px]">
          <MapContainer bounds={DIENG_BOUNDS} boundsOptions={{ padding: [20, 20] }} className="h-full w-full" zoomControl={false} attributionControl>
            {/* Tile Esri: tanpa API key (CARTO kini butuh key, server OSM memblokir pemakaian app) */}
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Topografi">
                <TileLayer url={`${ESRI}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`} attribution="Tiles &copy; Esri" maxZoom={19} />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Jalan">
                <TileLayer url={`${ESRI}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`} attribution="Tiles &copy; Esri" maxZoom={19} />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satelit">
                <LayerGroup>
                  <TileLayer url={`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`} attribution="Tiles &copy; Esri" maxZoom={19} />
                  <TileLayer url={`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`} maxZoom={19} />
                </LayerGroup>
              </LayersControl.BaseLayer>
            </LayersControl>
            <ZoomWatcher onZoom={setZoom} />
            {PLACES.filter((p) => !compact || !p.extra || p.id === place).map((p) => (
              <Marker key={p.id} position={[p.lat, p.lon]} icon={icons[p.id]} eventHandlers={{ click: () => onPlace(p.id) }} zIndexOffset={p.id === place ? 1000 : p.extra ? 0 : 500} />
            ))}
            {me && <Marker position={[me.lat, me.lon]} icon={meIcon} zIndexOffset={2000} />}
            <FlyTo place={place} />
            <Locate onFound={onFound} />
          </MapContainer>
        </div>

        {/* kontrol waktu */}
        <div className="space-y-3 border-t border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-muted">Cuaca pada</div>
              <div className="text-lg font-extrabold">
                {fmtDay(t)} · {hhmm(t)}
              </div>
            </div>
            <IntervalChips value={interval} onChange={onIntervalChange} />
          </div>
          <input
            type="range"
            min={0}
            max={steps.length - 1}
            value={stepIndex}
            onChange={(e) => onTime(steps[+e.target.value])}
            className="w-full accent-[var(--day1)]"
            aria-label="Geser waktu prakiraan"
          />
          <div className="flex flex-wrap gap-2">
            {days.map((d, i) => (
              <button key={d} type="button" onClick={() => onTime(at(d, i === 2 ? '05:00' : i === 1 ? '08:00' : '20:00'))} className="rounded-full bg-card2 px-3 py-1.5 text-sm font-bold hover:bg-line">
                Hari {i + 1} · {fmtDay(d, true)}
              </button>
            ))}
            {now >= steps[0] && now <= steps[steps.length - 1] && (
              <button type="button" onClick={() => onTime(now)} className="rounded-full bg-day2/12 px-3 py-1.5 text-sm font-bold text-day2">
                Sekarang
              </button>
            )}
          </div>
        </div>
      </Card>

      {me && (
        <Card className="flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted">Lokasi kamu · {hhmm(t)}</div>
            <div className="text-sm text-muted">
              {me.lat.toFixed(4)}, {me.lon.toFixed(4)}
              {me.om ? ` · ${Math.round(me.om.elevation)} mdpl` : ''}
            </div>
          </div>
          {me.om ? (
            <WeatherPill hour={meHour} />
          ) : me.failed ? (
            <button type="button" onClick={() => void onFound(me.lat, me.lon)} className="rounded-xl bg-card2 px-3 py-2 text-sm font-bold">
              Gagal dimuat · coba lagi
            </button>
          ) : (
            <span className="text-sm text-muted">Memuat…</span>
          )}
        </Card>
      )}

      <Card className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-extrabold leading-tight">{sel.name}</div>
            <div className="text-sm text-muted">
              {f?.om[place] ? `${Math.round(f.om[place].elevation)} mdpl · ` : ''}BMKG desa {sel.bmkgDesa}
            </div>
          </div>
          <WeatherPill hour={selHour} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tipsFor(selHour, selBmkg).map((tip) => (
            <TipChip key={tip.text} tip={tip} />
          ))}
          <BmkgChip b={selBmkg} />
        </div>
        {ahead.length > 1 && (
          <div className="no-scrollbar mt-3 flex gap-1 overflow-x-auto">
            {ahead.map((h) => (
              <button key={h!.t} type="button" onClick={() => onTime(h!.t)} className={`flex min-w-[64px] flex-col items-center rounded-xl px-1 py-1.5 text-xs ${h!.t === t ? 'bg-day1/10' : 'hover:bg-card2'}`}>
                <span className="font-bold tabular-nums">{hhmm(h!.t)}</span>
                <WxIcon src={hourIcon(h!)} size={34} />
                <span className="font-extrabold">{round(h!.temp)}°</span>
                <span className="font-semibold text-rain">{round(h!.pp)}%</span>
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={() => onHourly(place)} className="mt-3 w-full rounded-xl bg-day1 py-2.5 text-sm font-bold text-white">
          Lihat grafik & tabel per jam
        </button>
      </Card>
    </div>
  );
}
