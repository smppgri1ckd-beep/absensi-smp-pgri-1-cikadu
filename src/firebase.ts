import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
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
  setLogLevel,
} from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { Student, AttendanceRecord, SchoolConfig, TeacherUser } from './types';
import defaultFirebaseConfig from './firebase-config-default';

// Safe dynamic lookup for applet config if present
let appletConfig: any = defaultFirebaseConfig;
try {
  // @ts-ignore
  const imported = await import('../firebase-applet-config.json');
  if (imported && (imported.default || imported.apiKey)) {
    appletConfig = imported.default || imported;
  }
} catch {
  // Fallback to default config
  appletConfig = defaultFirebaseConfig;
}

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || defaultFirebaseConfig.appId,
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export interface FirebaseConnectionStatus {
  initialized: boolean;
  projectId: string;
  authDomain: string;
  hasApiKey: boolean;
  isFirestoreOnline: boolean;
  error?: string;
}

/**
 * Strips all undefined values and deeply sanitizes objects before Firestore writes.
 * Firestore will throw errors if any object key has the value `undefined`.
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return '' as any;
  }
  if (typeof obj !== 'object' || obj instanceof Date) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as any;
  }
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj as Record<string, any>)) {
    if (val !== undefined) {
      cleaned[key] = cleanFirestoreData(val);
    }
  }
  return cleaned as any;
}

/**
 * Checks and validates Firebase configuration & Firestore connectivity
 */
export async function testFirebaseConnection(): Promise<FirebaseConnectionStatus> {
  const status: FirebaseConnectionStatus = {
    initialized: !!app,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    hasApiKey: !!firebaseConfig.apiKey,
    isFirestoreOnline: false,
  };

  console.group('🔥 [Firebase Connection & Config Validation]');
  console.log('📌 Project ID:', status.projectId);
  console.log('📌 Auth Domain:', status.authDomain);
  console.log('🔑 API Key Status:', status.hasApiKey ? 'Loaded (Valid length)' : 'MISSING / EMPTY');
  console.log('📦 App Initialized:', status.initialized ? 'YES' : 'NO');
  console.log('🔒 OAuth Client ID:', (appletConfig as any).oAuthClientId || 'Default configured');

  if (!db) {
    console.warn('⚠️ Firestore instance is null. Running in offline fallback mode.');
    console.groupEnd();
    return status;
  }

  try {
    // Perform a lightweight ping to verify security rules and Firestore read
    const testDocRef = doc(db, 'pengaturan', 'identitas_sekolah');
    const snap = await getDoc(testDocRef);
    status.isFirestoreOnline = true;
    console.log('✅ Firestore Ping Success: Connected and rules are accepting queries! (Doc exists:', snap.exists(), ')');
  } catch (err: any) {
    status.error = err?.message || String(err);
    console.warn('⚠️ Firestore connectivity check notification:', {
      code: err?.code,
      message: err?.message,
    });
  }

  console.groupEnd();
  return status;
}

try {
  setLogLevel('error');
  if (firebaseConfig.apiKey) {
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    try {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      db = getFirestore(app);
    }
    auth = getAuth(app);
  } else {
    console.info('Firebase API key not set in environment. Running in offline/local storage mode.');
  }
} catch (err) {
  console.warn('Firebase initialization error, fallback active:', err);
}

// Auto-run connection check on startup
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testFirebaseConnection().catch(() => {});
  }, 1000);
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
    restrictOutOfHours: true,
    outOfHoursMessage: "Mohon maaf, sekarang bukan waktunya untuk melakukan absensi.",
  },
  googleDriveBackup: {
    enabled: true,
    folderId: "1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw",
    folderUrl: "https://drive.google.com/drive/u/0/folders/1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw",
    autoDailyBackup: true,
    lastBackupDate: "",
    lastBackupTimestamp: "",
    lastBackupStatus: "IDLE",
    lastBackupMessage: "Siap untuk sinkronisasi harian ke Google Drive",
  },
};

// Initial starter students (empty for production / clean start)
export const SEED_STUDENTS: Student[] = [];

// Initial starter teacher accounts (empty for production / clean start)
export const SEED_TEACHERS: TeacherUser[] = [];

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
