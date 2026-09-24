export type Gender = 'L' | 'P';

export type AttendanceSession = 'Pagi' | 'Siang';

export type AttendanceCategory = 'APEL' | 'KELAS';

export type SyncStatus = 'online' | 'syncing' | 'offline';

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
  restrictOutOfHours?: boolean; // Batasi/kunci absensi di luar jam operasional
  outOfHoursMessage?: string;   // Pesan kustom saat scan di luar jam
}

export interface DutyTeacher {
  nama: string;
  nip: string;
}

export interface GoogleDriveBackupConfig {
  enabled: boolean;
  folderId: string; // "1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw"
  folderUrl: string; // "https://drive.google.com/drive/u/0/folders/1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw"
  autoDailyBackup: boolean;
  lastBackupDate?: string; // YYYY-MM-DD
  lastBackupTimestamp?: string; // ISO string
  lastBackupStatus?: 'SUCCESS' | 'FAILED' | 'IDLE';
  lastBackupMessage?: string;
  clientId?: string;
}

export interface BackupHistoryItem {
  id: string;
  timestamp: string; // ISO string
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  totalStudents: number;
  totalAttendance: number;
  totalJournals: number;
  totalTeachers: number;
  fileNames: string[];
  driveFolderId?: string;
  status: 'SUCCESS' | 'FAILED';
  source: 'AUTO_DAILY' | 'MANUAL_DRIVE' | 'MANUAL_CSV' | 'MANUAL_JSON' | 'MANUAL_ZIP' | 'MANUAL_XLSX' | 'MANUAL';
  message?: string;
  driveWebLink?: string;
}

export interface FullBackupPayload {
  version: string;
  exportedAt: string;
  schoolName: string;
  npsn: string;
  config: SchoolConfig;
  students: Student[];
  attendance: AttendanceRecord[];
  journals: TeachingJournal[];
  teachers: TeacherUser[];
  kalenderHeb?: Record<string, boolean>;
}

export interface AdminProfile {
  nama: string;
  nip?: string;
  email?: string;
  noHp?: string;
  fotoUrl?: string;
  jabatan?: string;
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
  adminProfile?: AdminProfile;
  adminFotoUrl?: string;
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
  googleDriveBackup?: GoogleDriveBackupConfig;
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
  // Supervision & Verification Fields
  supervisionStatus?: 'PENDING' | 'VERIFIED' | 'REVISION_NEEDED';
  supervisionScore?: number; // 1 - 100
  supervisionRubric?: {
    mastery?: number; // 1 - 5 (Penguasaan Materi)
    classroomMgmt?: number; // 1 - 5 (Pengelolaan Kelas & Ketertiban)
    pedagogy?: number; // 1 - 5 (Metode & Media Pembelajaran)
    discipline?: number; // 1 - 5 (Ketepatan Waktu & Kedisiplinan)
  };
  supervisorNotes?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UserSession {
  role: 'ADMIN' | 'GURU' | null;
  name: string | null;
  avatarUrl?: string | null;
  teacherData?: TeacherUser | null;
  adminData?: AdminProfile | null;
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
  | 'backupData'
  | 'kelolaGuru'
  | 'portalGuru'
  | 'guruIzinAbsen';
