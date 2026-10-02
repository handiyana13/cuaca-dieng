// Koordinat dari OpenStreetMap (Nominatim); kode desa (adm4) sesuai Kepmendagri, dipakai API BMKG.

export type PlaceId =
  | 'cisalak'
  | 'kalibening'
  | 'dieng'
  | 'candi-arjuna'
  | 'sikidang'
  | 'ratapan-angin'
  | 'sikunir'
  | 'telaga-warna'
  | 'telaga-cebong'
  | 'telaga-merdada'
  | 'candradimuka';

export interface Place {
  id: PlaceId;
  name: string;
  /** label pendek untuk marker peta */
  short: string;
  lat: number;
  lon: number;
  /** kode desa untuk BMKG */
  adm4: string;
  /** nama desa BMKG, untuk keterangan sumber */
  bmkgDesa: string;
  /** spot tambahan di luar itinerary (mis. tujuan jeep) */
  extra?: boolean;
  /** jauh dari Dieng: tidak ikut zoom awal peta */
  far?: boolean;
  /** label marker di bawah titik, supaya tidak menumpuk dengan tetangga yang lebih ke utara */
  below?: boolean;
}

export const PLACES: Place[] = [
  { id: 'candi-arjuna', name: 'Kompleks Candi Arjuna', short: 'Candi Arjuna', lat: -7.2050, lon: 109.9069, adm4: '33.04.16.2008', bmkgDesa: 'Dieng Kulon' },
  { id: 'sikidang', name: 'Kawah Sikidang', short: 'Kawah Sikidang', lat: -7.2197, lon: 109.9048, adm4: '33.04.16.2008', bmkgDesa: 'Dieng Kulon', below: true },
  { id: 'ratapan-angin', name: 'Batu Pandang Ratapan Angin', short: 'Ratapan Angin', lat: -7.2178, lon: 109.9168, adm4: '33.07.13.2012', bmkgDesa: 'Jojogan', below: true },
  { id: 'sikunir', name: 'Bukit Sikunir', short: 'Bukit Sikunir', lat: -7.2387, lon: 109.9250, adm4: '33.07.13.2003', bmkgDesa: 'Sembungan', below: true },
  { id: 'dieng', name: 'Desa Dieng (homestay & kuliner)', short: 'Desa Dieng', lat: -7.2073, lon: 109.9062, adm4: '33.04.16.2008', bmkgDesa: 'Dieng Kulon', below: true },
  { id: 'kalibening', name: 'Rest Area Kalibening', short: 'Kalibening', lat: -7.2214, lon: 109.6380, adm4: '33.04.18.2001', bmkgDesa: 'Kalibening', far: true },
  { id: 'cisalak', name: 'Exit Tol Cisalak (titik kumpul)', short: 'Exit Tol Cisalak', lat: -6.380899, lon: 106.86742, adm4: '32.76.02.1012', bmkgDesa: 'Cisalak Pasar', far: true },
  { id: 'telaga-warna', name: 'Telaga Warna', short: 'Telaga Warna', lat: -7.2137, lon: 109.9154, adm4: '33.07.13.2012', bmkgDesa: 'Jojogan', extra: true },
  { id: 'telaga-cebong', name: 'Telaga Cebong', short: 'Telaga Cebong', lat: -7.2363, lon: 109.9203, adm4: '33.07.13.2003', bmkgDesa: 'Sembungan', extra: true },
  { id: 'telaga-merdada', name: 'Telaga Merdada', short: 'Telaga Merdada', lat: -7.2090, lon: 109.8916, adm4: '33.04.16.2007', bmkgDesa: 'Karangtengah', extra: true },
  { id: 'candradimuka', name: 'Kawah Candradimuka', short: 'Candradimuka', lat: -7.1889, lon: 109.8535, adm4: '33.04.16.2004', bmkgDesa: 'Pekasiran', extra: true },
];

export const PLACE: Record<PlaceId, Place> = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<PlaceId, Place>;
