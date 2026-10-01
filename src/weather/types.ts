import type { LocalMs } from '../lib/time';

/** Satu jam prakiraan model (Open-Meteo, sudah dikoreksi ke ketinggian lokasi). */
export interface HourPoint {
  t: LocalMs;
  temp: number;
  feels: number;
  /** peluang hujan, % */
  pp: number;
  /** curah hujan, mm */
  mm: number;
  /** kode cuaca WMO */
  code: number;
  cloud: number;
  low: number;
  mid: number;
  high: number;
  /** jarak pandang, meter */
  vis: number;
  wind: number;
  gust: number;
  hum: number;
  isDay: boolean;
}

export interface DailyPoint {
  date: string;
  sunrise: LocalMs;
  sunset: LocalMs;
  tmin: number;
  tmax: number;
  uvMax: number;
}

export interface OmPlace {
  elevation: number;
  hours: HourPoint[];
  daily: DailyPoint[];
}

/** Satu titik prakiraan resmi BMKG (interval 3 jam). */
export interface BmkgPoint {
  t: LocalMs;
  temp: number;
  hum: number;
  cloud: number;
  mm: number;
  code: number;
  desc: string;
  /** km/jam */
  wind: number;
  windFrom: string;
}

export interface BmkgVillage {
  analysis: string;
  points: BmkgPoint[];
}

export interface Forecast {
  fetchedAt: number;
  start: string;
  end: string;
  om: Record<string, OmPlace>;
  bmkg: Record<string, BmkgVillage>;
  errors: { om?: string; bmkg?: string };
}
