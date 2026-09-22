export type Gender = 'L' | 'P';

export type AttendanceSession = 'Pagi' | 'Siang';

export type AttendanceCategory = 'APEL' | 'KELAS';

export type AttendanceStatus =
  | 'Hadir Tepat Waktu'
  | 'Terlambat'
  | 'Hadir Terlalu Dini'
  | 'Pulang Tepat Waktu'
  | 'Pulang Mendahului'
  | 'Pulang Terlambat'
  | 'Izin'
  | 'Sakit'
  | 'Alpa';

export interface Student {
  nisn: string;
  nama: string;
  jk: Gender;
  kelas: string;
  fotoUrl: string;
}

export interface AttendanceRecord {
  id: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string;   // HH:mm:ss
  nisn: string;
  nama: string;
  kelas: string;
  sesi: AttendanceSession;
  status: AttendanceStatus | string;
  // Dual-Function Attributes:
  kategori?: AttendanceCategory; // 'APEL' (Apel Pagi / Siang) or 'KELAS' (KBM Tatap Muka Mapel)
  mapel?: string;                 // e.g. "Matematika", "Informatika"
  pertemuanKe?: number;           // Pertemuan ke-1, 2, 3, dst
  materiPokok?: string;           // Materi pembelajaran
  guruId?: string;                // ID Guru Pengajar
  guruNama?: string;              // Nama Guru Pengajar
}

export interface ScheduleConfig {
  morningStart: string;       // e.g. "06:00"
  morningOnTimeEnd: string;   // e.g. "07:00"
  morningCutoff: string;      // e.g. "11:30"
  afternoonStart: string;     // e.g. "13:45"
  afternoonOnTimeEnd: string; // e.g. "15:00"
  afternoonCutoff: string;    // e.g. "17:00"
  autoSwitchSession: boolean;
  soundNotification: boolean;
}

export interface DutyTeacher {
  nama: string;
  nip: string;
}

export interface SchoolConfig {
  namaSekolah: string;
  npsn: string;
  kota: string;
  alamat: string;
  kontak: string;
  namaKepsek: string;
  nipKepsek: string;
  logoUrl: string;
  sistemHariSekolah: string; // "5" | "6"
  welcomeScreen: {
    show: boolean;
    title: string;
    subtitle: string;
  };
  jadwalPiket: {
    senin: DutyTeacher;
    selasa: DutyTeacher;
    rabu: DutyTeacher;
    kamis: DutyTeacher;
    jumat: DutyTeacher;
    sabtu?: DutyTeacher;
  };
  schedule: ScheduleConfig;
}

export interface TeacherUser {
  id: string;
  nip: string;
  nama: string;
  username: string;
  password: string;
  mapel: string;
  waliKelas?: string;
  kontak?: string; // No HP / WhatsApp Wali Kelas
  noHp?: string;   // Nomor HP / WA langsung
  fotoUrl?: string; // Foto profil guru (diunggah guru / admin)
  status: 'AKTIF' | 'NONAKTIF';
  createdAt: string;
}

export interface TeachingJournal {
  id: string;
  guruId: string;
  guruNama: string;
  guruNip?: string;
  kelas: string;
  mapel: string;
  tanggal: string; // YYYY-MM-DD
  pertemuanKe: number;
  jamPelajaran?: string; // e.g. "07:30 - 09:00" atau "Jam Ke 1-2"
  materiPokok: string;
  kegiatanPembelajaran?: string; // e.g. "Penjelasan materi, diskusi kelompok, latihan soal"
  catatanRefleksi?: string; // e.g. "3 siswa butuh bimbingan tambahan, tugas di kumpulkan minggu depan"
  totalSiswa: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  persentaseKehadiran: number;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSession {
  role: 'ADMIN' | 'GURU' | null;
  name: string | null;
  teacherData?: TeacherUser | null;
}

export type ViewType =
  | 'kiosk'
  | 'pantauPublik'
  | 'dashboard'
  | 'dataSiswa'
  | 'kelolaAbsensi'
  | 'cetakQr'
  | 'downloadQr'
  | 'kalenderHeb'
  | 'rekapPdf'
  | 'pengaturan'
  | 'kelolaGuru'
  | 'portalGuru'
  | 'guruIzinAbsen';
