# Cuaca Dieng · Open Trip 3D2N

Prakiraan cuaca per kegiatan untuk itinerary Open Trip Dieng (Bali Satak Travel), dibuat untuk dibuka di HP.

**Live:** https://handiyana13.github.io/cuaca-dieng/

Setiap `git push` ke `main` otomatis di-build dan di-deploy ulang oleh GitHub Actions (`.github/workflows/deploy.yml`).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # hasil statis di dist/ (bisa di-hosting di mana saja)
```

## Fitur

- **Itinerary**: tiap kegiatan di poster menampilkan cuaca di lokasi & jam kegiatan itu, tips (jas hujan, jaket, kabut), dan pembanding BMKG. Kegiatan yang sedang berlangsung ditandai otomatis.
- **Peluang sunrise Sikunir**: skor 0–100 dari kabut (jarak pandang), awan menengah, dan peluang hujan sekitar jam matahari terbit.
- **Peta**: titik-titik Dieng (plus spot jeep) dengan cuaca pada jam yang dipilih; slider waktu interval 1/3/6 jam; tombol *Lokasi saya*.
- **Per jam**: grafik suhu & peluang hujan + tabel per 1/3/6 jam untuk tiap lokasi.
- **Offline**: data terakhir disimpan di perangkat; setelah dibuka sekali (versi build), app tetap terbuka tanpa sinyal. Bisa dipasang ke layar utama HP.
- Tanggal trip bisa diubah dari header (default Hari 1 = 1 Okt 2026).

## Sumber data

| Sumber | Dipakai untuk |
| --- | --- |
| [BMKG](https://data.bmkg.go.id/prakiraan-cuaca/) — `api.bmkg.go.id/publik/prakiraan-cuaca?adm4=…` | Prakiraan resmi per desa, interval 3 jam, 3 hari |
| [Open-Meteo](https://open-meteo.com/) | Model per jam yang dikoreksi ke ketinggian tiap titik (suhu utama, peluang hujan, kabut, sunrise, UV) |

Suhu BMKG untuk Dieng cenderung lebih hangat karena grid modelnya berada di elevasi lebih rendah, jadi suhu utama memakai Open-Meteo dan BMKG ditampilkan sebagai pembanding.

Kode desa BMKG yang dipakai: Dieng Kulon `33.04.16.2008`, Jojogan `33.07.13.2012`, Sembungan `33.07.13.2003`, Karangtengah `33.04.16.2007`, Pekasiran `33.04.16.2004`, Kalibening `33.04.18.2001`, Gambir `31.71.01.1001`.

## Struktur

- `src/data/`: titik lokasi (koordinat OSM + kode desa) dan itinerary
- `src/weather/`: pengambilan data, cache offline, interpretasi (ikon, tips, skor sunrise, daftar bawaan)
- `src/components/`: tampilan (itinerary, peta, per jam, grafik)
- `public/sw.js`: service worker untuk mode offline

Ikon cuaca: Meteocons (MIT). Peta: Esri.
