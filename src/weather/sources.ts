import type { Place } from '../data/places';
import { parseLocal } from '../lib/time';
import type { BmkgVillage, OmPlace } from './types';

const HOURLY = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'cloud_cover_low',
  'cloud_cover_mid',
  'cloud_cover_high',
  'visibility',
  'wind_speed_10m',
  'wind_gusts_10m',
  'relative_humidity_2m',
  'is_day',
];
const DAILY = ['sunrise', 'sunset', 'temperature_2m_min', 'temperature_2m_max', 'uv_index_max'];

/**
 * Open-Meteo: semua lokasi dalam satu request. Elevasi tidak dikirim, jadi Open-Meteo memakai
 * model elevasi 90 m untuk tiap titik dan mengoreksi suhu ke ketinggian sebenarnya (penting di Dieng ±2.000 mdpl).
 */
export async function fetchOpenMeteo(places: Place[], start: string, end: string): Promise<Record<string, OmPlace>> {
  const params = new URLSearchParams({
    latitude: places.map((p) => p.lat).join(','),
    longitude: places.map((p) => p.lon).join(','),
    hourly: HOURLY.join(','),
    daily: DAILY.join(','),
    timezone: 'Asia/Jakarta',
    start_date: start,
    end_date: end,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.reason ?? `Open-Meteo error ${res.status}`);
  const list: any[] = Array.isArray(json) ? json : [json];

  const out: Record<string, OmPlace> = {};
  list.forEach((loc, i) => {
    const h = loc.hourly;
    const d = loc.daily;
    out[places[i].id] = {
      elevation: loc.elevation,
      hours: h.time.map((time: string, k: number) => ({
        t: parseLocal(time),
        temp: h.temperature_2m[k],
        feels: h.apparent_temperature[k],
        pp: h.precipitation_probability[k] ?? 0,
        mm: h.precipitation[k] ?? 0,
        code: h.weather_code[k],
        cloud: h.cloud_cover[k],
        low: h.cloud_cover_low[k],
        mid: h.cloud_cover_mid[k],
        high: h.cloud_cover_high[k],
        vis: h.visibility[k],
        wind: h.wind_speed_10m[k],
        gust: h.wind_gusts_10m[k],
        hum: h.relative_humidity_2m[k],
        isDay: h.is_day[k] === 1,
      })),
      daily: d.time.map((date: string, k: number) => ({
        date,
        sunrise: parseLocal(d.sunrise[k]),
        sunset: parseLocal(d.sunset[k]),
        tmin: d.temperature_2m_min[k],
        tmax: d.temperature_2m_max[k],
        uvMax: d.uv_index_max[k],
      })),
    };
  });
  return out;
}

/** BMKG: prakiraan resmi per desa, 3 hari ke depan, interval 3 jam. Satu request per kode desa. */
export async function fetchBmkg(adm4: string): Promise<BmkgVillage> {
  const res = await fetch(`https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`);
  if (!res.ok) throw new Error(`BMKG error ${res.status}`);
  const json = await res.json();
  const days: any[][] = json.data?.[0]?.cuaca ?? [];
  const points = days.flat().map((e) => ({
    t: parseLocal(e.local_datetime),
    temp: e.t,
    hum: e.hu,
    cloud: e.tcc,
    mm: e.tp ?? 0,
    code: e.weather,
    desc: e.weather_desc,
    wind: e.ws,
    windFrom: e.wd,
  }));
  return { analysis: days[0]?.[0]?.analysis_date ?? '', points };
}
