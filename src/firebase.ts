import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Student, AttendanceRecord, SchoolConfig } from './types';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "presensi-siswa-digital-a24ca.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "presensi-siswa-digital-a24ca",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "presensi-siswa-digital-a24ca.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "696200452974",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:696200452974:web:c4ca3756e13c7204e43f7f",
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

try {
  if (firebaseConfig.apiKey) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    auth = getAuth(app);
  } else {
    console.info('Firebase API key not set in environment. Running in offline/local storage mode.');
  }
} catch (err) {
  console.warn('Firebase initialization error, fallback active:', err);
}

export { app, db, auth };

// Default initial school configuration
export const DEFAULT_SCHOOL_CONFIG: SchoolConfig = {
  namaSekolah: "SMP PGRI 1 CIKADU",
  npsn: "69919136",
  kota: "Cianjur",
  alamat: "Kp. Koleberes Blok D RT. 04 RW. 09 Desa Cikadu Kec. Cikadu Kab. Cianjur",
  kontak: "Telp: 0852 1258 7750 | e-mail: smp.pgri1ckd@gmail.com",
  namaKepsek: "CUNCUN MUHLISOH, S.Pd.",
  nipKepsek: "-",
  logoUrl: "https://cdn-icons-png.flaticon.com/512/2856/2856000.png",
  sistemHariSekolah: "5",
  welcomeScreen: {
    show: true,
    title: "Selamat Datang Di E-Absensi\nSMP PGRI 1 CIKADU",
    subtitle: "Portal presensi digital berbasis QR Code, pencatatan otomatis, rekapitulasi data akurat, dan cetak kartu siswa presisi.",
  },
  jadwalPiket: {
    senin: { nama: "Guru Piket Senin, S.Pd", nip: "19800101 200501 1 001" },
    selasa: { nama: "Guru Piket Selasa, S.Pd", nip: "19820202 200602 2 002" },
    rabu: { nama: "Guru Piket Rabu, S.Pd", nip: "19840303 200703 1 003" },
    kamis: { nama: "Guru Piket Kamis, S.Pd", nip: "19860404 200804 2 004" },
    jumat: { nama: "Guru Piket Jum'at, S.Pd", nip: "19880505 200905 1 005" },
  },
  schedule: {
    morningStart: "06:00",
    morningOnTimeEnd: "07:00",
    morningCutoff: "11:30",
    afternoonStart: "13:45",
    afternoonOnTimeEnd: "15:00",
    afternoonCutoff: "17:00",
    autoSwitchSession: true,
    soundNotification: true,
  },
};

// Initial starter students for demo / instant experience if cloud collection is empty
export const SEED_STUDENTS: Student[] = [
  { nisn: "0091234501", nama: "Ahmad Fauzi", jk: "L", kelas: "VII-A", fotoUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0091234502", nama: "Anisa Rahmawati", jk: "P", kelas: "VII-A", fotoUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0091234503", nama: "Bayu Pratama", jk: "L", kelas: "VII-A", fotoUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0091234504", nama: "Dewi Lestari", jk: "P", kelas: "VII-B", fotoUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0091234505", nama: "Dimas Saputra", jk: "L", kelas: "VII-B", fotoUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0081234506", nama: "Fajar Hidayat", jk: "L", kelas: "VIII-A", fotoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0081234507", nama: "Indah Permata", jk: "P", kelas: "VIII-A", fotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0081234508", nama: "Muhammad Rizki", jk: "L", kelas: "VIII-B", fotoUrl: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0071234509", nama: "Nabila Putri", jk: "P", kelas: "IX-A", fotoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0071234510", nama: "Rian Kurniawan", jk: "L", kelas: "IX-A", fotoUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0071234511", nama: "Siti Nurhaliza", jk: "P", kelas: "IX-B", fotoUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=80" },
  { nisn: "0071234512", nama: "Yusuf Maulana", jk: "L", kelas: "IX-B", fotoUrl: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80" },
];

export {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};
export type { Unsubscribe, User };
