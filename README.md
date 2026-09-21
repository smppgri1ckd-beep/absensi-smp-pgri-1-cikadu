# E-Presensi Siswa Berbasis QR Code - SMP PGRI 1 CIKADU

Aplikasi web presensi siswa modern, cepat, dan terintegrasi dengan Firebase Firestore realtime database. Dirancang khusus untuk kemudahan pemindaian kamera kiosk, cetak kartu siswa presisi tanpa terpotong (F4 & A4), pengaturan jadwal sesi otomatis, serta pelaporan rekapitulasi kehadiran resmi.

---

## 🌟 Fitur Utama

1. **Pemindaian QR Kiosk Cepat & Suara Umpan Balik**
   - Mendukung kamera depan/belakang laptop, webcam USB, maupun ponsel.
   - Deteksi instan dengan *audio chime* (Hadir tepat waktu, Terlambat, Sesi Siang, dll.).
   - Anti-duplikasi cerdas (mencegah siswa memindai ganda di tanggal dan sesi yang sama).

2. **Perbaikan Cetak Kartu Siswa (F4 & A4 Presisi)**
   - Desain kartu ID Card vertikal modern (54mm × 86mm) dengan QR Code beresolusi tinggi.
   - Pilihan ukuran kertas: **Folio / F4 (215mm × 330mm)** isi 10 kartu per lembar, dan **A4 (210mm × 297mm)** isi 8 kartu per lembar.
   - CSS `@media print` khusus yang mencegah hasil cetak terpotong, margin otomatis, dan tanpa header/footer browser yang mengganggu.
   - Fitur penetralan latar belakang logo sekolah ke putih bersih agar kartu dan kop selalu rapi.

3. **Pengaturan Waktu Absensi & Alih Sesi Otomatis**
   - Konfigurasi mandiri jam mulai, batas tepat waktu, dan batas akhir untuk **Sesi Pagi** dan **Sesi Siang**.
   - Deteksi real-time pergantian sesi otomatis sesuai jam yang ditetapkan.
   - Notifikasi suara merdu dan banner *toast* saat sistem berpindah sesi secara otomatis.

4. **Dashboard Rekapitulasi Real-Time**
   - Statistik kehadiran hari ini (Hadir, Terlambat, Persentase, Grafik Per Kelas).
   - Log kehadiran langsung (*live feed*) dari cloud database.

5. **Ekspor Laporan Resmi (PDF & Excel)**
   - Format A4 lengkap dengan **Kop Resmi SMP PGRI 1 CIKADU**.
   - Perhitungan persentase kehadiran terhadap Hari Efektif Belajar (HEB).
   - Tanda tangan Kepala Sekolah dan Petugas Guru Piket harian.
   - Tombol Ekspor langsung ke Excel (.xlsx) dan Dokumen PDF (jsPDF + autotable).

6. **Manajemen Master Data Siswa & Kalender HEB**
   - Tambah, edit, dan hapus siswa dengan filter kelas.
   - Impor massal data siswa dari file Excel/CSV.
   - Download QR code siswa perorangan (.png) atau kolektif satu kelas (.zip).
   - Kalender Hari Efektif Belajar (HEB) dengan tombol cepat Pola 5 Hari / Pola 6 Hari.

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

```bash
# 1. Pasang dependensi proyek
npm install

# 2. Jalankan server lokal
npm run dev

# 3. Bangun proyek untuk publikasi ke GitHub / Hosting
npm run build
```

---

## 🔑 Akses Masuk Portal (Default)

- **Akun Administrator:**
  - Email: `admin@absensi.id`
  - Password: `edudigital`
- **Akun Petugas Guru Piket:**
  - Username: `peserta`
  - Password: `edudigital`

---

## ⚡ Panduan Konfigurasi Firebase (Mencegah Eror)

Agar aplikasi dapat membaca dan menulis data tanpa kendala (*Missing or insufficient permissions* / eror izin), ikuti 2 langkah mudah berikut:

### 1. Atur Aturan Keamanan Firestore (Firestore Rules)
Buka [Firebase Console](https://console.firebase.google.com/) &rarr; Masuk ke proyek Anda &rarr; Pilih **Firestore Database** &rarr; Tab **Rules (Aturan)**, lalu salin kode dari berkas `firestore.rules` berikut:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
Klik **Publish / Publikasikan**. Aturan ini memastikan scanner kiosk dapat mencatat presensi dan dashboard admin dapat memuat rekapitulasi data.

### 2. Konfigurasi Proyek Firebase Sendiri (Opsional)
Aplikasi sudah dilengkapi konfigurasi bawaan yang siap pakai. Jika Anda ingin menggunakan proyek Firebase pribadi saat di-hosting di GitHub Pages atau Vercel:
1. Salin berkas `.env.example` menjadi `.env`
2. Isi variabel dengan data dari Firebase Console (Project Settings &rarr; General &rarr; Your apps):
   ```env
   VITE_FIREBASE_API_KEY="AIzaSy..."
   VITE_FIREBASE_AUTH_DOMAIN="proyek-anda.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="proyek-anda"
   VITE_FIREBASE_STORAGE_BUCKET="proyek-anda.firebasestorage.app"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
   VITE_FIREBASE_APP_ID="1:123456:web:abcd123"
   ```
3. Atau Anda dapat langsung mengganti objek `firebaseConfig` pada berkas `src/firebase.ts`.

---

## 🖨️ Tips Mencetak Kartu Siswa & Laporan Tanpa Terpotong

1. Klik tombol **Cetak Sekarang** pada menu Cetak Kartu Siswa atau Rekapitulasi.
2. Pada dialog cetak browser (*Print Dialog*):
   - **Tujuan / Destination**: Pilih printer fisik Anda atau *Save as PDF*.
   - **Ukuran Kertas / Paper Size**: Pilih **Folio / F4** atau **A4** sesuai mode yang Anda aktifkan di aplikasi.
   - **Tata Letak / Layout**: Portrait.
   - **Margin**: Pilih **None** atau **Default**.
   - **Opsi Grafik Latar Belakang / Background Graphics**: **Centang / Aktifkan** (wajib agar warna kartu dan kop tampil sempurna).
