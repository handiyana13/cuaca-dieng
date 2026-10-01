import type { PlaceId } from './places';

export interface Activity {
  day: 1 | 2 | 3;
  start: string;
  end?: string;
  title: string;
  place: PlaceId;
  /** include / exclude biaya trip, sesuai poster */
  cost?: 'include' | 'exclude';
  sunrise?: boolean;
}

// Itinerary Open Trip Dieng 3D2N (Bali Satak Travel). Jam adalah estimasi.
export const ITINERARY: Activity[] = [
  { day: 1, start: '17:00', end: '21:00', title: 'Penjemputan ke meeting point', place: 'jakarta' },
  { day: 1, start: '21:00', title: 'Berangkat menuju Dieng', place: 'jakarta' },

  { day: 2, start: '05:00', title: 'Tiba di Rest Area Kalibening — mandi, sholat Subuh, istirahat', place: 'kalibening' },
  { day: 2, start: '06:30', title: 'Menuju lokal resto sarapan pagi', place: 'kalibening', cost: 'include' },
  { day: 2, start: '07:30', title: 'Tiba di lokal resto, sarapan pagi', place: 'dieng', cost: 'include' },
  { day: 2, start: '08:30', title: 'Explore Kawasan Candi Arjuna', place: 'candi-arjuna' },
  { day: 2, start: '10:00', title: 'Explore Kawah Sikidang', place: 'sikidang' },
  { day: 2, start: '11:30', title: 'Explore Batu Pandang Ratapan Angin', place: 'ratapan-angin' },
  { day: 2, start: '13:00', title: 'Makan siang', place: 'dieng', cost: 'include' },
  { day: 2, start: '14:00', title: 'Menuju homestay, check in', place: 'dieng' },
  { day: 2, start: '14:00', end: '18:00', title: 'Istirahat & acara bebas, bisa lanjut explore jeep', place: 'dieng', cost: 'exclude' },
  { day: 2, start: '19:00', title: 'Acara bebas, kulineran sekitar Titik 0 KM Dieng', place: 'dieng', cost: 'exclude' },
  { day: 2, start: '22:00', title: 'Kembali ke homestay, istirahat', place: 'dieng' },

  { day: 3, start: '02:00', title: 'Persiapan hunting sunrise', place: 'dieng' },
  { day: 3, start: '02:30', title: 'Menuju Bukit Sikunir (Golden Sunrise Point)', place: 'sikunir' },
  { day: 3, start: '04:30', end: '06:00', title: 'Menikmati sunrise di puncak Bukit Sikunir', place: 'sikunir', sunrise: true },
  { day: 3, start: '07:00', title: 'Kembali ke homestay, sarapan pagi', place: 'dieng', cost: 'include' },
  { day: 3, start: '09:00', title: 'Packing barang & check out homestay', place: 'dieng' },
  { day: 3, start: '09:30', title: 'Belanja oleh-oleh khas Dieng', place: 'dieng' },
  { day: 3, start: '10:30', title: 'Kembali menuju Jakarta', place: 'dieng' },
  { day: 3, start: '22:00', title: 'Tiba di meeting point awal, trip selesai', place: 'jakarta' },
];

export const DAY_META: Record<1 | 2 | 3, { label: string; color: string }> = {
  1: { label: 'Hari Pertama', color: 'var(--day1)' },
  2: { label: 'Hari Kedua', color: 'var(--day2)' },
  3: { label: 'Hari Ketiga', color: 'var(--day3)' },
};

/** Tanggal default Hari 1: berangkat malam 1 Okt, di Dieng 2–3 Okt. Bisa diubah di app. */
export const DEFAULT_TRIP_START = '2026-10-01';
