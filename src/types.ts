export type Gender = 'L' | 'P';

export type AttendanceSession = 'Pagi' | 'Siang';

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

export interface UserSession {
  role: 'ADMIN' | 'PESERTA' | null;
  name: string | null;
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
  | 'pengaturan';
