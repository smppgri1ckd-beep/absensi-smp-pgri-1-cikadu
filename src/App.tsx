import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  UserSession,
  ViewType,
  AttendanceSession,
  TeacherUser,
  TeachingJournal,
  AdminProfile,
  SyncStatus,
} from './types';
import {
  db,
  auth,
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
  cleanFirestoreData,
  testFirebaseConnection,
  DEFAULT_SCHOOL_CONFIG,
  SEED_STUDENTS,
  SEED_TEACHERS,
} from './firebase';
import { playBeep } from './utils/audio';

import { Navbar } from './components/Navbar';
import { KioskView } from './components/KioskView';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentMasterView } from './components/StudentMasterView';
import { AttendanceManageView } from './components/AttendanceManageView';
import { IdCardPrintView } from './components/IdCardPrintView';
import { QrDownloadView } from './components/QrDownloadView';
import { CalendarHebView } from './components/CalendarHebView';
import { RekapReportView } from './components/RekapReportView';
import { SettingsView } from './components/SettingsView';
import { PublicRekapView } from './components/PublicRekapView';
import { TeacherManageView } from './components/TeacherManageView';
import { TeacherPortalView } from './components/TeacherPortalView';
import { AdminKbmSupervisionView } from './components/AdminKbmSupervisionView';
import { BackupDriveView } from './components/BackupDriveView';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Sidebar, TeacherTabType } from './components/Sidebar';
import { WelcomeModal } from './components/WelcomeModal';
import { LoginModal } from './components/LoginModal';
import { NoticeModal, ConfirmModal } from './components/NoticeModal';
import { NotificationBanner } from './components/NotificationBanner';

export default function App() {
  const [students, setStudents] = useState<Student[]>(SEED_STUDENTS);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [config, setConfig] = useState<SchoolConfig>(DEFAULT_SCHOOL_CONFIG);
  const [kalenderHebData, setKalenderHebData] = useState<Record<string, boolean>>({});
  const [teachers, setTeachers] = useState<TeacherUser[]>(SEED_TEACHERS);
  const [teachingJournals, setTeachingJournals] = useState<TeachingJournal[]>([]);

  const [userSession, setUserSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('epresensi_user_session');
    return saved ? JSON.parse(saved) : { role: null, name: null };
  });

  const [currentView, setCurrentView] = useState<ViewType>('kiosk');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('epresensi_sidebar_collapsed') === 'true';
  });
  const [teacherActiveTab, setTeacherActiveTab] = useState<TeacherTabType>('DASHBOARD');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(() => (typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online'));

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('epresensi_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleSelectTeacherTab = (tab: TeacherTabType) => {
    setTeacherActiveTab(tab);
    setCurrentView('portalGuru');
  };

  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return config.welcomeScreen.show !== false;
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Notifications & Confirmations
  const [notice, setNotice] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [confirm, setConfirm] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const [sessionSwitchBanner, setSessionSwitchBanner] = useState<{
    show: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Manual Session Override
  const [manualSessionOverride, setManualSessionOverride] = useState<AttendanceSession | null>(null);

  // Time & Date strings
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const prevSessionRef = useRef<AttendanceSession>('Pagi');

  // PWA Prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Compute Active Session automatically based on schedule
  const computedSession = useMemo<AttendanceSession>(() => {
    if (manualSessionOverride) return manualSessionOverride;

    const curMin = currentTime.getHours() * 60 + currentTime.getMinutes();
    const [ah, am] = (config.schedule.afternoonStart || '13:45').split(':').map(Number);
    const afternoonStartMin = ah * 60 + am;

    return curMin >= afternoonStartMin ? 'Siang' : 'Pagi';
  }, [currentTime, config.schedule.afternoonStart, manualSessionOverride]);

  // Current day key (senin, selasa, rabu, kamis, jumat, sabtu)
  const currentDayKey = useMemo(() => {
    const days = ['senin', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
    return days[currentTime.getDay()] || 'senin';
  }, [currentTime]);

  // Clock interval and auto-switch detection
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      // Auto-switch check
      if (config.schedule.autoSwitchSession && !manualSessionOverride) {
        const curMin = now.getHours() * 60 + now.getMinutes();
        const [ah, am] = (config.schedule.afternoonStart || '13:45').split(':').map(Number);
        const afternoonStartMin = ah * 60 + am;
        const newSession: AttendanceSession = curMin >= afternoonStartMin ? 'Siang' : 'Pagi';

        if (newSession !== prevSessionRef.current) {
          prevSessionRef.current = newSession;
          if (config.schedule.soundNotification) {
            playBeep('switch');
          }
          setSessionSwitchBanner({
            show: true,
            title: `Beralih Otomatis ke Sesi ${newSession.toUpperCase()}`,
            message: `Waktu saat ini (${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB) telah memasuki rentang jadwal Sesi ${newSession}.`,
          });
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [config.schedule, manualSessionOverride]);

  // Register PWA Install prompt listener
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPwa = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => {
        setDeferredPrompt(null);
      });
    }
  };

  // Synchronize Firestore Realtime Collections
  useEffect(() => {
    const firestore = db;
    if (!firestore) return;

    // 1. Listen to Students (siswa)
    const unsubStudents = onSnapshot(
      collection(firestore, 'siswa'),
      (snapshot) => {
        if (!snapshot.empty && snapshot.docs.length > 0) {
          const list: Student[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Student;
            data.nisn = String(data.nisn || d.id).trim();
            list.push(data);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
          setStudents(list);
          setSyncStatus('online');
        } else {
          setStudents([]);
          setSyncStatus('online');
        }
      },
      (err) => {
        console.warn('Firestore students error:', err);
        if (!navigator.onLine) setSyncStatus('offline');
      }
    );

    // 2. Listen to Attendance (presensi)
    const unsubAttendance = onSnapshot(
      collection(firestore, 'presensi'),
      (snapshot) => {
        const uniqueMap = new Map<string, AttendanceRecord>();
        snapshot.forEach((d) => {
          const item = d.data() as AttendanceRecord;
          item.id = d.id;
          item.nisn = String(item.nisn || '').trim();
          const dedupeKey = item.kategori === 'KELAS'
            ? `${item.nisn}_${item.tanggal}_KELAS_${item.mapel || 'mapel'}_${item.pertemuanKe || 1}`
            : `${item.nisn}_${item.tanggal}_APEL_${item.sesi}`;
          if (!uniqueMap.has(dedupeKey)) {
            uniqueMap.set(dedupeKey, item);
          }
        });
        const list = Array.from(uniqueMap.values());
        list.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
        setAttendance(list);
        setSyncStatus('online');
      },
      (err) => {
        console.warn('Firestore attendance error:', err);
        if (!navigator.onLine) setSyncStatus('offline');
      }
    );

    // 3. Listen to Teaching Journals (jurnal_mengajar)
    const unsubJournals = onSnapshot(
      collection(firestore, 'jurnal_mengajar'),
      (snapshot) => {
        const list: TeachingJournal[] = [];
        snapshot.forEach((d) => {
          const item = d.data() as TeachingJournal;
          item.id = d.id;
          list.push(item);
        });
        list.sort((a, b) => (b.tanggal + (b.createdAt || '')).localeCompare(a.tanggal + (a.createdAt || '')));
        setTeachingJournals(list);
        setSyncStatus('online');
      },
      (err) => {
        console.warn('Firestore journals error:', err);
        if (!navigator.onLine) setSyncStatus('offline');
      }
    );

    // 4. Listen to School Config
    const unsubConfig = onSnapshot(
      doc(firestore, 'pengaturan', 'identitas_sekolah'),
      (d) => {
        if (d.exists()) {
          const remoteConfig = d.data() as SchoolConfig;
          const merged: SchoolConfig = {
            ...DEFAULT_SCHOOL_CONFIG,
            ...remoteConfig,
            schedule: {
              ...DEFAULT_SCHOOL_CONFIG.schedule,
              ...(remoteConfig.schedule || {}),
            },
            welcomeScreen: {
              ...DEFAULT_SCHOOL_CONFIG.welcomeScreen,
              ...(remoteConfig.welcomeScreen || {}),
            },
            jadwalPiket: {
              ...DEFAULT_SCHOOL_CONFIG.jadwalPiket,
              ...(remoteConfig.jadwalPiket || {}),
            },
          };
          setConfig(merged);
          setSyncStatus('online');
        } else {
          setDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'), cleanFirestoreData(DEFAULT_SCHOOL_CONFIG)).catch(() => {});
        }
      },
      (err) => {
        console.warn('Firestore config error:', err);
        if (!navigator.onLine) setSyncStatus('offline');
      }
    );

    // 5. Listen to HEB Calendar
    const unsubHeb = onSnapshot(
      doc(firestore, 'kalender_heb', 'active'),
      (d) => {
        if (d.exists()) {
          const data = d.data()?.kalenderData || {};
          setKalenderHebData(data);
          setSyncStatus('online');
        }
      },
      (err) => {
        console.warn('Firestore HEB error:', err);
        if (!navigator.onLine) setSyncStatus('offline');
      }
    );

    // 6. Listen to Teachers (guru_users)
    const unsubTeachers = onSnapshot(
      collection(firestore, 'guru_users'),
      (snapshot) => {
        if (!snapshot.empty && snapshot.docs.length > 0) {
          const list: TeacherUser[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as TeacherUser;
            data.id = d.id;
            list.push(data);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          setTeachers(list);
          setSyncStatus('online');
        } else {
          setTeachers([]);
          setSyncStatus('online');
        }
      },
      (err) => {
        console.warn('Firestore teachers error:', err);
        if (!navigator.onLine) setSyncStatus('offline');
      }
    );

    // 7. Auth listener
    let unsubAuth: (() => void) | undefined;
    if (auth) {
      unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          const session: UserSession = { role: 'ADMIN', name: user.email };
          setUserSession(session);
          localStorage.setItem('epresensi_user_session', JSON.stringify(session));
        }
      });
    }

    return () => {
      unsubStudents();
      unsubAttendance();
      unsubJournals();
      unsubConfig();
      unsubHeb();
      unsubTeachers();
      if (unsubAuth) unsubAuth();
    };
  }, []);

  // Polling Fallback Mechanism for Continuous Data Synchronization
  // Runs via HTTPS REST / Firestore getDocs if WebSockets/HMR connections fail or degrade
  useEffect(() => {
    const firestore = db;
    if (!firestore) return;

    let isPolling = false;

    const syncFirebaseData = async () => {
      if (isPolling || !navigator.onLine) return;
      isPolling = true;

      try {
        // 1. Fetch Students
        const studentSnap = await getDocs(collection(firestore, 'siswa'));
        if (!studentSnap.empty && studentSnap.docs.length > 0) {
          const listStudents: Student[] = [];
          studentSnap.forEach((d) => {
            const data = d.data() as Student;
            data.nisn = String(data.nisn || d.id).trim();
            listStudents.push(data);
          });
          listStudents.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
          setStudents(listStudents);
        }

        // 2. Fetch Attendance
        const attSnap = await getDocs(collection(firestore, 'presensi'));
        if (!attSnap.empty && attSnap.docs.length > 0) {
          const uniqueMap = new Map<string, AttendanceRecord>();
          attSnap.forEach((d) => {
            const item = d.data() as AttendanceRecord;
            item.id = d.id;
            item.nisn = String(item.nisn || '').trim();
            const dedupeKey =
              item.kategori === 'KELAS'
                ? `${item.nisn}_${item.tanggal}_KELAS_${item.mapel || 'mapel'}_${item.pertemuanKe || 1}`
                : `${item.nisn}_${item.tanggal}_APEL_${item.sesi}`;
            if (!uniqueMap.has(dedupeKey)) {
              uniqueMap.set(dedupeKey, item);
            }
          });
          const listAtt = Array.from(uniqueMap.values());
          listAtt.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
          setAttendance(listAtt);
        }

        // 3. Fetch Teaching Journals
        const journalSnap = await getDocs(collection(firestore, 'jurnal_mengajar'));
        if (!journalSnap.empty && journalSnap.docs.length > 0) {
          const listJournals: TeachingJournal[] = [];
          journalSnap.forEach((d) => {
            const item = d.data() as TeachingJournal;
            item.id = d.id;
            listJournals.push(item);
          });
          listJournals.sort((a, b) =>
            (b.tanggal + (b.createdAt || '')).localeCompare(a.tanggal + (a.createdAt || ''))
          );
          setTeachingJournals(listJournals);
        }

        // 4. Fetch School Config
        const configSnap = await getDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'));
        if (configSnap.exists()) {
          const remoteConfig = configSnap.data() as SchoolConfig;
          const merged: SchoolConfig = {
            ...DEFAULT_SCHOOL_CONFIG,
            ...remoteConfig,
            schedule: {
              ...DEFAULT_SCHOOL_CONFIG.schedule,
              ...(remoteConfig.schedule || {}),
            },
            welcomeScreen: {
              ...DEFAULT_SCHOOL_CONFIG.welcomeScreen,
              ...(remoteConfig.welcomeScreen || {}),
            },
            jadwalPiket: {
              ...DEFAULT_SCHOOL_CONFIG.jadwalPiket,
              ...(remoteConfig.jadwalPiket || {}),
            },
          };
          setConfig(merged);
        }

        // 5. Fetch Teachers
        const teacherSnap = await getDocs(collection(firestore, 'guru_users'));
        if (!teacherSnap.empty && teacherSnap.docs.length > 0) {
          const listTeachers: TeacherUser[] = [];
          teacherSnap.forEach((d) => {
            const data = d.data() as TeacherUser;
            data.id = d.id;
            listTeachers.push(data);
          });
          listTeachers.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          setTeachers(listTeachers);
        }

        // 6. Fetch HEB Calendar
        const hebSnap = await getDoc(doc(firestore, 'kalender_heb', 'active'));
        if (hebSnap.exists()) {
          const data = hebSnap.data()?.kalenderData || {};
          setKalenderHebData(data);
        }
        setSyncStatus('online');
      } catch (err) {
        if (!navigator.onLine) {
          setSyncStatus('offline');
        }
      } finally {
        isPolling = false;
      }
    };

    // Periodic polling every 10 seconds as backup
    const pollingInterval = setInterval(syncFirebaseData, 10000);

    // Online/Offline and network state events
    const handleOnlineEvent = () => {
      setSyncStatus('syncing');
      showNotice('Jaringan Terhubung', 'Koneksi internet aktif. Terhubung langsung ke Firebase Firestore.', 'success');
      syncFirebaseData();
    };

    const handleOfflineEvent = () => {
      setSyncStatus('offline');
      showNotice(
        'Jaringan Terputus',
        'Anda tidak terhubung ke jaringan. Pastikan perangkat Anda terhubung ke internet untuk menyimpan dan membaca data Firebase.',
        'warning'
      );
    };

    const handleSyncTrigger = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        syncFirebaseData();
      }
    };

    window.addEventListener('focus', handleSyncTrigger);
    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);
    document.addEventListener('visibilitychange', handleSyncTrigger);

    return () => {
      clearInterval(pollingInterval);
      window.removeEventListener('focus', handleSyncTrigger);
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
      document.removeEventListener('visibilitychange', handleSyncTrigger);
    };
  }, []);

  // Proactive Network Verification Helper
  const ensureNetworkOnline = (): boolean => {
    if (!navigator.onLine) {
      setSyncStatus('offline');
      showNotice(
        'Tidak Terhubung ke Jaringan',
        'Anda sedang tidak terhubung ke jaringan internet. Pastikan jaringan internet Anda aktif untuk menyimpan data ke Firebase.',
        'warning'
      );
      return false;
    }
    return true;
  };

  // Manual Trigger to refresh and sync with Cloud Firestore
  const handleManualSync = async () => {
    if (!ensureNetworkOnline()) {
      return;
    }

    setSyncStatus('syncing');
    try {
      const conn = await testFirebaseConnection();
      if (conn.isFirestoreOnline) {
        setSyncStatus('online');
        showNotice(
          'Database Cloud Tersinkron',
          `Koneksi ke Firestore (${conn.projectId}) aktif dan seluruh data telah sinkron realtime.`,
          'success'
        );
      } else {
        setSyncStatus('offline');
        showNotice(
          'Koneksi Cloud Terbatas',
          'Database cloud sedang tidak merespons. Pastikan jaringan Anda terhubung ke internet.',
          'warning'
        );
      }
    } catch {
      setSyncStatus('offline');
      showNotice('Gagal Terhubung', 'Tidak dapat terhubung ke cloud Firebase. Periksa koneksi internet Anda.', 'warning');
    }
  };

  // Format Indonesian strings
  const timeFormatted = `${String(currentTime.getHours()).padStart(2, '0')}:${String(
    currentTime.getMinutes()
  ).padStart(2, '0')}:${String(currentTime.getSeconds()).padStart(2, '0')}`;

  const dateFormatted = useMemo(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
    const months = [
      'Januari',
      'Februari',
      'Maret',
      'April',
      'Mei',
      'Juni',
      'Juli',
      'Agustus',
      'September',
      'Oktober',
      'November',
      'Desember',
    ];
    return `${days[currentTime.getDay()]}, ${currentTime.getDate()} ${
      months[currentTime.getMonth()]
    } ${currentTime.getFullYear()}`;
  }, [currentTime]);

  // Calculate Total HEB
  const totalHebCount = useMemo(() => {
    const curYear = currentTime.getFullYear();
    let count = 0;
    Object.entries(kalenderHebData).forEach(([dateStr, isHeb]) => {
      if (isHeb && dateStr.startsWith(String(curYear))) {
        count++;
      }
    });
    return Math.max(1, count || 112); // sensible default
  }, [kalenderHebData, currentTime]);

  // Modal Notice & Confirm Handlers
  const showNotice = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setNotice({ isOpen: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirm({ isOpen: true, title, message, onConfirm });
  };

  // Auth actions
  const handleLogin = async (user: string, pass: string): Promise<boolean> => {
    const rawUser = user.trim();
    const normalizedUser = rawUser.toLowerCase();
    const trimmedPass = pass.trim();

    console.group(`[Auth Debug] handleLogin initiated for: "${rawUser}"`);
    console.log('[Auth Debug] Normalized user:', normalizedUser);
    console.log('[Auth Debug] Firebase Auth initialized:', !!auth);

    // 1. Firebase Auth for Administrator (if connected)
    if (auth && normalizedUser.includes('@')) {
      try {
        console.log('[Auth Debug] Attempting signInWithEmailAndPassword with Firebase...');
        const cred = await signInWithEmailAndPassword(auth, rawUser, trimmedPass);
        console.log('[Auth Debug] Firebase signInWithEmailAndPassword SUCCESS:', {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: cred.user.displayName,
          emailVerified: cred.user.emailVerified,
        });
        const session: UserSession = { role: 'ADMIN', name: cred.user.email || 'Administrator' };
        setUserSession(session);
        localStorage.setItem('epresensi_user_session', JSON.stringify(session));
        setCurrentView('dashboard');
        showNotice('Selamat Datang', 'Login Administrator berhasil. Seluruh fitur aktif!', 'success');
        console.groupEnd();
        return true;
      } catch (authErr: any) {
        console.warn('[Auth Debug] Firebase signInWithEmailAndPassword ERROR details:', {
          code: authErr?.code,
          message: authErr?.message,
          customData: authErr?.customData,
          name: authErr?.name,
          stack: authErr?.stack,
          fullError: authErr,
        });
        // Fallback to local accounts
      }
    } else if (!auth) {
      console.log('[Auth Debug] Firebase Auth instance is not active. Using local authentication store.');
    }

    // 2. Default Administrator Local Credentials
    const validAdminUsers = [
      'admin@absensi.id',
      'admin',
      'administrator',
      'smp.pgri1ckd@gmail.com',
      'smp.pgri1ckd',
      'admin@smp.id',
      'admin@gmail.com',
    ];
    const validAdminPass = ['edudigital', 'admin123', 'admin', 'password', 'edudigital123', '123456', '12345678'];

    if (validAdminUsers.includes(normalizedUser) && validAdminPass.includes(trimmedPass)) {
      const session: UserSession = { role: 'ADMIN', name: 'Administrator SMP PGRI 1 Cikadu' };
      setUserSession(session);
      localStorage.setItem('epresensi_user_session', JSON.stringify(session));
      setCurrentView('dashboard');
      showNotice('Selamat Datang', 'Login Administrator berhasil. Seluruh fitur aktif!', 'success');
      console.log('[Auth Debug] Administrator logged in successfully via local credentials.');
      console.groupEnd();
      return true;
    }

    // Allow login if user typed "admin" or school email with any of standard passwords
    if ((normalizedUser.includes('admin') || normalizedUser.includes('smp.pgri1ckd')) && validAdminPass.includes(trimmedPass)) {
      const session: UserSession = { role: 'ADMIN', name: 'Administrator' };
      setUserSession(session);
      localStorage.setItem('epresensi_user_session', JSON.stringify(session));
      setCurrentView('dashboard');
      showNotice('Selamat Datang', 'Login Administrator berhasil. Seluruh fitur aktif!', 'success');
      console.log('[Auth Debug] Administrator logged in successfully via fallback alias.');
      console.groupEnd();
      return true;
    }

    // 3. Teacher (Guru) Authentication Verification
    const foundTeacher = teachers.find(
      (t) =>
        (t.username.toLowerCase() === normalizedUser ||
          t.nip.replace(/\s+/g, '').toLowerCase() === normalizedUser.replace(/\s+/g, '')) &&
        t.password === trimmedPass
    );

    if (foundTeacher) {
      if (foundTeacher.status === 'NONAKTIF') {
        console.warn('[Auth Debug] Teacher account is disabled (NONAKTIF).');
        console.groupEnd();
        showNotice(
          'Akun Dinonaktifkan',
          'Akun guru ini sedang berstatus NONAKTIF. Silakan hubungi Administrator sekolah untuk mengaktifkan kembali akun Anda.',
          'warning'
        );
        return false;
      }

      const session: UserSession = {
        role: 'GURU',
        name: foundTeacher.nama,
        teacherData: foundTeacher,
      };
      setUserSession(session);
      localStorage.setItem('epresensi_user_session', JSON.stringify(session));
      setCurrentView('portalGuru');
      showNotice(
        'Selamat Datang, Bapak/Ibu Guru',
        `Login berhasil sebagai ${foundTeacher.nama} (${foundTeacher.mapel}). Selamat mengajar dan mengelola presensi kelas!`,
        'success'
      );
      console.log('[Auth Debug] Teacher logged in successfully:', foundTeacher.nama);
      console.groupEnd();
      return true;
    }

    console.warn('[Auth Debug] Authentication failed: No matching credentials found for user:', rawUser);
    console.groupEnd();
    return false;
  };

  const handleLogout = () => {
    if (auth) {
      signOut(auth).catch(() => {});
    }
    const session: UserSession = { role: null, name: null };
    setUserSession(session);
    localStorage.removeItem('epresensi_user_session');
    setCurrentView('kiosk');
    showNotice('Sesi Berakhir', 'Anda telah kembali ke Mode Kiosk Publik.', 'info');
  };

  // Helper to ensure Firestore async writes never block or hang the UI
  const syncWithFirestoreTimeout = async (promise: Promise<any>, timeoutMs = 2000): Promise<void> => {
    try {
      await Promise.race([
        promise,
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);
    } catch (err) {
      console.warn('Firestore async sync note/error:', err);
    }
  };

  // Teacher Management Actions (Admin)
  const handleAddTeacher = async (teacher: TeacherUser) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleaned = cleanFirestoreData(teacher);
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await setDoc(doc(firestore, 'guru_users', cleaned.id), cleaned);
    setTeachers((prev) => {
      const updated = [...prev.filter((t) => t.id !== cleaned.id), cleaned];
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
      return updated;
    });
  };

  const handleUpdateTeacher = async (teacher: TeacherUser) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleaned = cleanFirestoreData(teacher);
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await setDoc(doc(firestore, 'guru_users', cleaned.id), cleaned);
    setTeachers((prev) => {
      const updated = prev.map((t) => (t.id === cleaned.id ? cleaned : t));
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
      return updated;
    });

    // If currently logged in teacher is modified, update session
    if (userSession.teacherData?.id === cleaned.id) {
      const updatedSession: UserSession = {
        ...userSession,
        name: cleaned.nama,
        teacherData: cleaned,
      };
      setUserSession(updatedSession);
      localStorage.setItem('epresensi_user_session', JSON.stringify(updatedSession));
    }
  };

  const handleUpdateTeacherProfile = async (updatedTeacher: TeacherUser) => {
    await handleUpdateTeacher(updatedTeacher);
  };

  const handleUpdateAdminProfile = async (adminProfile: AdminProfile) => {
    const updatedConfig: SchoolConfig = {
      ...config,
      adminProfile,
      adminFotoUrl: adminProfile.fotoUrl,
    };
    await handleUpdateConfig(updatedConfig);

    if (userSession.role === 'ADMIN') {
      const updatedSession: UserSession = {
        ...userSession,
        name: adminProfile.nama,
        avatarUrl: adminProfile.fotoUrl || null,
        adminData: adminProfile,
      };
      setUserSession(updatedSession);
      localStorage.setItem('epresensi_user_session', JSON.stringify(updatedSession));
    }
  };

  const handleDeleteTeacher = async (id: string) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await deleteDoc(doc(firestore, 'guru_users', id));
    setTeachers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleBatchImportTeachers = async (newTeachers: TeacherUser[]) => {
    if (!ensureNetworkOnline()) {
      return;
    }

    if (!newTeachers || newTeachers.length === 0) {
      showNotice(
        'Format Tidak Sesuai',
        'Tidak ada data guru yang valid untuk diimpor atau format kolom tidak sesuai template.',
        'warning'
      );
      return;
    }

    // Step 1: Format validation & sanitization
    const validTeachers: TeacherUser[] = [];
    const invalidRows: string[] = [];

    newTeachers.forEach((t, idx) => {
      const namaClean = (t.nama || '').trim();
      const usernameClean = (t.username || '').trim().toLowerCase().replace(/\s+/g, '');

      if (!namaClean || namaClean.length < 2) {
        invalidRows.push(`Baris #${idx + 1}: Nama guru kosong atau tidak valid.`);
        return;
      }

      if (!usernameClean) {
        invalidRows.push(`Baris #${idx + 1} (${namaClean}): Username tidak valid.`);
        return;
      }

      validTeachers.push(cleanFirestoreData({
        ...t,
        nama: namaClean,
        username: usernameClean,
        nip: (t.nip || '').trim() || '-',
        password: (t.password || '').trim() || 'guru123',
        mapel: (t.mapel || '').trim() || 'Semua Mata Pelajaran',
        status: t.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
        waliKelas: t.waliKelas || '',
        kontak: t.kontak || '',
        noHp: t.noHp || '',
        fotoUrl: t.fotoUrl || '',
      }));
    });

    if (validTeachers.length === 0) {
      showNotice(
        'Impor Dibatalkan',
        `Format kolom atau data guru tidak sesuai:\n${invalidRows.slice(0, 3).join('\n')}`,
        'warning'
      );
      return;
    }

    // Step 2: Check duplicates within the import batch itself
    const seenBatchNips = new Set<string>();
    const seenBatchUsernames = new Set<string>();
    const internalDuplicates: string[] = [];

    const dedupedBatch: TeacherUser[] = [];
    validTeachers.forEach((t) => {
      const hasNip = t.nip && t.nip !== '-';
      const isDupNip = hasNip && seenBatchNips.has(t.nip);
      const isDupUser = seenBatchUsernames.has(t.username);

      if (isDupNip || isDupUser) {
        internalDuplicates.push(
          `${t.nama} (${isDupNip ? `NIP ${t.nip}` : `Username @${t.username}`} terduplikasi dalam file)`
        );
      } else {
        if (hasNip) seenBatchNips.add(t.nip);
        seenBatchUsernames.add(t.username);
        dedupedBatch.push(t);
      }
    });

    // Step 3: Check against existing registered teachers in system state
    const duplicateNipsFound: string[] = [];
    const duplicateUsernamesFound: string[] = [];
    let updatedCount = 0;
    let insertedCount = 0;

    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    // Step 4: Persist directly to Firestore
    const chunkSize = 400;
    for (let i = 0; i < dedupedBatch.length; i += chunkSize) {
      const chunk = dedupedBatch.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      chunk.forEach((t) => batch.set(doc(firestore, 'guru_users', t.id), cleanFirestoreData(t)));
      await batch.commit();
    }

    // Step 5: Update state
    setTeachers((prev) => {
      const map = new Map<string, TeacherUser>();
      prev.forEach((t) => map.set(t.id, t));

      dedupedBatch.forEach((nt) => {
        let existingId: string | null = null;
        let matchedBy = '';

        for (const [id, t] of map.entries()) {
          const sameNip =
            nt.nip &&
            nt.nip !== '-' &&
            t.nip &&
            t.nip !== '-' &&
            t.nip.trim() === nt.nip.trim();
          const sameUsername =
            nt.username &&
            t.username &&
            t.username.trim().toLowerCase() === nt.username.trim().toLowerCase();

          if (sameNip) {
            existingId = id;
            matchedBy = `NIP: ${nt.nip}`;
            break;
          } else if (sameUsername) {
            existingId = id;
            matchedBy = `Username: @${nt.username}`;
            break;
          }
        }

        if (existingId) {
          const existing = map.get(existingId)!;
          if (matchedBy.startsWith('NIP')) {
            duplicateNipsFound.push(`${nt.nama} (NIP ${nt.nip} sudah terdaftar -> diperbarui)`);
          } else {
            duplicateUsernamesFound.push(`${nt.nama} (Username @${nt.username} sudah terdaftar -> diperbarui)`);
          }

          map.set(existingId, cleanFirestoreData({
            ...existing,
            ...nt,
            id: existingId,
            fotoUrl: nt.fotoUrl || existing.fotoUrl,
          }));
          updatedCount++;
        } else {
          map.set(nt.id, nt);
          insertedCount++;
        }
      });

      const updated = Array.from(map.values());
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
      return updated;
    });

    // Step 6: Informative notification feedback
    const totalDuplicates = duplicateNipsFound.length + duplicateUsernamesFound.length + internalDuplicates.length;
    const hasWarnings = totalDuplicates > 0 || invalidRows.length > 0;

    if (hasWarnings) {
      const summaryMsg = [
        `Berhasil memproses ${insertedCount} guru baru dan memperbarui ${updatedCount} akun terdaftar di Firebase.`,
        totalDuplicates > 0 ? `⚠️ Ditemukan ${totalDuplicates} data NIP/Username yang terdaftar sebelumnya atau terduplikasi.` : '',
        invalidRows.length > 0 ? `⚠️ ${invalidRows.length} baris dilewati karena format tidak lengkap.` : '',
      ]
        .filter(Boolean)
        .join('\n');

      showNotice('Hasil Impor Guru (Validasi Data)', summaryMsg, 'warning');
    } else {
      showNotice(
        'Impor Data Guru Berhasil',
        `Sebanyak ${insertedCount} data guru baru berhasil diverifikasi dan disimpan langsung ke database Firebase.`,
        'success'
      );
    }
  };

  const handleBatchDeleteTeachers = async (ids: string[]) => {
    if (!ensureNetworkOnline()) {
      return;
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    const chunkSize = 400;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      chunk.forEach((id) => batch.delete(doc(firestore, 'guru_users', id)));
      await batch.commit();
    }

    setTeachers((prev) => {
      const idSet = new Set(ids);
      return prev.filter((t) => !idSet.has(t.id));
    });
  };

  // Record Attendance Action
  const handleRecordAttendance = async (record: AttendanceRecord): Promise<boolean> => {
    if (!ensureNetworkOnline()) {
      return false;
    }
    const cleaned = cleanFirestoreData(record);
    const firestore = db;
    if (firestore) {
      await setDoc(doc(firestore, 'presensi', cleaned.id), cleaned);
    }

    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== cleaned.id);
      return [cleaned, ...filtered];
    });
    return true;
  };

  // Student CRUD Actions
  const handleAddOrUpdateStudent = async (student: Student, oldNisn?: string) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleaned = cleanFirestoreData(student);
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    if (oldNisn && oldNisn !== cleaned.nisn) {
      await deleteDoc(doc(firestore, 'siswa', oldNisn));
    }
    await setDoc(doc(firestore, 'siswa', cleaned.nisn), cleaned);

    setStudents((prev) => {
      const filtered = prev.filter((s) => s.nisn !== (oldNisn || cleaned.nisn));
      const updated = [...filtered, cleaned];
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
      return updated;
    });
  };

  const handleDeleteStudent = async (nisn: string) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await deleteDoc(doc(firestore, 'siswa', nisn));
    setStudents((prev) => prev.filter((s) => s.nisn !== nisn));
  };

  const handleBatchDeleteStudents = async (nisns: string[]) => {
    if (!ensureNetworkOnline()) {
      return;
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    const chunkSize = 200;
    for (let i = 0; i < nisns.length; i += chunkSize) {
      const chunk = nisns.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      chunk.forEach((nisn) => batch.delete(doc(firestore, 'siswa', nisn)));
      await batch.commit();
    }

    setStudents((prev) => prev.filter((s) => !nisns.includes(s.nisn)));
  };

  const handleBatchImportStudents = async (newStudents: Student[]) => {
    if (!ensureNetworkOnline()) {
      return;
    }
    const cleanedList = newStudents.map((s) => cleanFirestoreData(s));
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    const chunkSize = 200;
    for (let i = 0; i < cleanedList.length; i += chunkSize) {
      const chunk = cleanedList.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      chunk.forEach((s) => batch.set(doc(firestore, 'siswa', s.nisn), s));
      await batch.commit();
    }

    setStudents((prev) => {
      const map = new Map<string, Student>();
      prev.forEach((s) => map.set(s.nisn, s));
      cleanedList.forEach((s) => map.set(s.nisn, s));
      const updated = Array.from(map.values());
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
      return updated;
    });
  };

  // Attendance CRUD Actions
  const handleAddOrUpdateAttendance = async (record: AttendanceRecord) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleaned = cleanFirestoreData(record);
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await setDoc(doc(firestore, 'presensi', cleaned.id), cleaned);
    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== cleaned.id);
      return [cleaned, ...filtered];
    });
  };

  const handleDeleteAttendance = async (id: string) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await deleteDoc(doc(firestore, 'presensi', id));
    setAttendance((prev) => prev.filter((a) => a.id !== id));
  };

  const handleBatchDeleteAttendance = async (ids: string[]) => {
    if (!ensureNetworkOnline()) {
      return;
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      chunk.forEach((id) => batch.delete(doc(firestore, 'presensi', id)));
      await batch.commit();
    }

    setAttendance((prev) => {
      const idSet = new Set(ids);
      return prev.filter((a) => !idSet.has(a.id));
    });
  };

  // Teaching Journal / Data Pembelajaran Actions
  const handleSaveTeachingJournal = async (journal: TeachingJournal, attendanceBatch?: AttendanceRecord[]) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleanedJournal = cleanFirestoreData(journal);
    const cleanedBatch = attendanceBatch ? attendanceBatch.map((r) => cleanFirestoreData(r)) : [];
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    const batch = writeBatch(firestore);
    const journalRef = doc(firestore, 'jurnal_mengajar', cleanedJournal.id);
    batch.set(journalRef, cleanedJournal, { merge: true });

    if (cleanedBatch.length > 0) {
      cleanedBatch.forEach((rec) => {
        const recRef = doc(firestore, 'presensi', rec.id);
        batch.set(recRef, rec, { merge: true });
      });
    }
    await batch.commit();

    setTeachingJournals((prev) => {
      const idx = prev.findIndex((j) => j.id === cleanedJournal.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = cleanedJournal;
        return updated;
      }
      return [cleanedJournal, ...prev];
    });

    if (cleanedBatch.length > 0) {
      setAttendance((prev) => {
        const map = new Map<string, AttendanceRecord>();
        prev.forEach((r) => map.set(r.id, r));
        cleanedBatch.forEach((r) => map.set(r.id, r));
        return Array.from(map.values());
      });
    }
  };

  const handleDeleteTeachingJournal = async (journalId: string) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    await deleteDoc(doc(firestore, 'jurnal_mengajar', journalId));
    setTeachingJournals((prev) => prev.filter((j) => j.id !== journalId));
  };

  // Config and HEB updates
  const handleUpdateConfig = async (newConfig: SchoolConfig) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleaned = cleanFirestoreData(newConfig);
    const firestore = db;
    if (!firestore) {
      setConfig(cleaned);
      return;
    }

    const savePromise = setDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'), cleaned);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Waktu penyimpanan habis (Timeout). Periksa koneksi internet Anda.')), 7000)
    );

    await Promise.race([savePromise, timeoutPromise]);
    setConfig(cleaned);
  };

  const handleUpdateKalenderHeb = async (data: Record<string, boolean>) => {
    if (!ensureNetworkOnline()) {
      throw new Error('Tidak terhubung ke jaringan internet.');
    }
    const cleaned = cleanFirestoreData(data);
    const firestore = db;
    if (!firestore) {
      setKalenderHebData(cleaned);
      return;
    }

    const savePromise = setDoc(doc(firestore, 'kalender_heb', 'active'), { kalenderData: cleaned });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Waktu penyimpanan habis (Timeout). Periksa koneksi internet Anda.')), 7000)
    );

    await Promise.race([savePromise, timeoutPromise]);
    setKalenderHebData(cleaned);
  };

  // Maintenance: clean duplicates
  const handleCleanDuplicates = async (): Promise<number> => {
    if (!ensureNetworkOnline()) {
      return 0;
    }
    const seen = new Map<string, string>();
    const dupIds: string[] = [];

    attendance.forEach((a) => {
      const key = `${a.nisn.trim()}_${a.tanggal}_${a.sesi}`;
      if (seen.has(key)) {
        dupIds.push(a.id);
      } else {
        seen.set(key, a.id);
      }
    });

    if (dupIds.length > 0) {
      await handleBatchDeleteAttendance(dupIds);
    }
    return dupIds.length;
  };

  // Batch delete teaching journals
  const handleBatchDeleteJournals = async (ids: string[]) => {
    if (!ensureNetworkOnline()) {
      return;
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    const chunkSize = 200;
    for (let i = 0; i < ids.length; i += chunkSize) {
      const chunk = ids.slice(i, i + chunkSize);
      const batch = writeBatch(firestore);
      chunk.forEach((id) => batch.delete(doc(firestore, 'jurnal_mengajar', id)));
      await batch.commit();
    }

    setTeachingJournals((prev) => {
      const updated = prev.filter((j) => !ids.includes(j.id));
      return updated;
    });
  };

  // Maintenance: purge semester attendance
  const handlePurgeSemester = async (
    year: number,
    sem: 'ganjil' | 'genap'
  ): Promise<number> => {
    const startIso = sem === 'ganjil' ? `${year}-07-01` : `${year}-01-01`;
    const endIso = sem === 'ganjil' ? `${year}-12-31` : `${year}-06-30`;

    const targets = attendance
      .filter((a) => a.tanggal >= startIso && a.tanggal <= endIso)
      .map((a) => a.id);

    if (targets.length > 0) {
      await handleBatchDeleteAttendance(targets);
    }
    return targets.length;
  };

  // Maintenance: purge semester journals
  const handlePurgeSemesterJournals = async (
    year: number,
    sem: 'ganjil' | 'genap'
  ): Promise<number> => {
    const startIso = sem === 'ganjil' ? `${year}-07-01` : `${year}-01-01`;
    const endIso = sem === 'ganjil' ? `${year}-12-31` : `${year}-06-30`;

    const targetIds = teachingJournals
      .filter((j) => j.tanggal >= startIso && j.tanggal <= endIso)
      .map((j) => j.id);

    if (targetIds.length > 0) {
      await handleBatchDeleteJournals(targetIds);
    }
    return targetIds.length;
  };

  // Maintenance: purge ALL attendance logs
  const handlePurgeAllAttendance = async (): Promise<number> => {
    const ids = attendance.map((a) => a.id);
    if (ids.length > 0) {
      await handleBatchDeleteAttendance(ids);
    }
    return ids.length;
  };

  // Maintenance: purge ALL teaching journals
  const handlePurgeAllJournals = async (): Promise<number> => {
    const ids = teachingJournals.map((j) => j.id);
    if (ids.length > 0) {
      await handleBatchDeleteJournals(ids);
    }
    return ids.length;
  };

  // Maintenance: purge ALL input data (attendance logs + teaching journals)
  const handlePurgeAllInputData = async (options?: {
    purgeAttendance?: boolean;
    purgeJournals?: boolean;
  }): Promise<{ attendanceCount: number; journalCount: number }> => {
    const doAttendance = options?.purgeAttendance !== false;
    const doJournals = options?.purgeJournals !== false;

    let deletedAttCount = 0;
    let deletedJrnCount = 0;

    if (doAttendance && attendance.length > 0) {
      const attIds = attendance.map((a) => a.id);
      await handleBatchDeleteAttendance(attIds);
      deletedAttCount = attIds.length;
    }

    if (doJournals && teachingJournals.length > 0) {
      const jrnIds = teachingJournals.map((j) => j.id);
      await handleBatchDeleteJournals(jrnIds);
      deletedJrnCount = jrnIds.length;
    }

    return { attendanceCount: deletedAttCount, journalCount: deletedJrnCount };
  };

  // Maintenance: Total Factory Reset (Wipe students, teachers, attendance, journals)
  const handleResetEntireDatabase = async (): Promise<void> => {
    if (!ensureNetworkOnline()) {
      return;
    }
    const firestore = db;
    if (!firestore) throw new Error('Firebase Firestore belum terinisialisasi.');

    // 1. Delete all students
    if (students.length > 0) {
      await handleBatchDeleteStudents(students.map((s) => s.nisn));
    }
    // 2. Delete all teachers
    if (teachers.length > 0) {
      await handleBatchDeleteTeachers(teachers.map((t) => t.id));
    }
    // 3. Delete all attendance
    if (attendance.length > 0) {
      await handleBatchDeleteAttendance(attendance.map((a) => a.id));
    }
    // 4. Delete all journals
    if (teachingJournals.length > 0) {
      await handleBatchDeleteJournals(teachingJournals.map((j) => j.id));
    }
    setStudents([]);
    setTeachers([]);
    setAttendance([]);
    setTeachingJournals([]);
  };

  // Restore Complete Backup Archive into Database
  const handleRestoreAllData = async (payload: any) => {
    if (!ensureNetworkOnline()) {
      return;
    }
    // 1. Update State
    if (Array.isArray(payload.students)) setStudents(payload.students.map((s: any) => cleanFirestoreData(s)));
    if (Array.isArray(payload.attendance)) setAttendance(payload.attendance.map((a: any) => cleanFirestoreData(a)));
    if (Array.isArray(payload.journals)) setTeachingJournals(payload.journals.map((j: any) => cleanFirestoreData(j)));
    if (Array.isArray(payload.teachers)) setTeachers(payload.teachers.map((t: any) => cleanFirestoreData(t)));
    if (payload.kalenderHeb) setKalenderHebData(cleanFirestoreData(payload.kalenderHeb));
    if (payload.config && payload.config.namaSekolah) setConfig(cleanFirestoreData(payload.config));

    // 2. Persist to Firestore directly
    const firestore = db;
    if (firestore) {
      try {
        if (payload.config) {
          await setDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'), cleanFirestoreData(payload.config), { merge: true });
        }
        if (payload.kalenderHeb) {
          await setDoc(doc(firestore, 'kalender_heb', 'active'), { kalenderData: cleanFirestoreData(payload.kalenderHeb) }, { merge: true });
        }

        // Write students chunked
        if (Array.isArray(payload.students)) {
          for (let i = 0; i < payload.students.length; i += 200) {
            const chunk = payload.students.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((s: any) => batch.set(doc(firestore, 'siswa', s.nisn), cleanFirestoreData(s)));
            await batch.commit();
          }
        }

        // Write attendance chunked
        if (Array.isArray(payload.attendance)) {
          for (let i = 0; i < payload.attendance.length; i += 200) {
            const chunk = payload.attendance.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((a: any) => batch.set(doc(firestore, 'presensi', a.id), cleanFirestoreData(a)));
            await batch.commit();
          }
        }

        // Write journals chunked
        if (Array.isArray(payload.journals)) {
          for (let i = 0; i < payload.journals.length; i += 200) {
            const chunk = payload.journals.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((j: any) => batch.set(doc(firestore, 'jurnal_mengajar', j.id), cleanFirestoreData(j)));
            await batch.commit();
          }
        }

        // Write teachers chunked into guru_users
        if (Array.isArray(payload.teachers)) {
          for (let i = 0; i < payload.teachers.length; i += 200) {
            const chunk = payload.teachers.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((t: any) => batch.set(doc(firestore, 'guru_users', t.id), cleanFirestoreData(t)));
            await batch.commit();
          }
        }
      } catch (err) {
        console.warn('Firestore restore sync error:', err);
      }
    }
  };

  const handleToggleSessionManual = () => {
    const next = computedSession === 'Pagi' ? 'Siang' : 'Pagi';
    setManualSessionOverride(next);
    showNotice(
      'Sesi Presensi Dialihkan',
      `Mode pemindaian dialihkan manual ke Sesi ${next.toUpperCase()}.`,
      'info'
    );
  };

  const handleSelectView = (view: ViewType) => {
    if (view === 'kiosk' || view === 'pantauPublik') {
      setCurrentView(view);
      return;
    }

    if (view === 'portalGuru' || view === 'guruIzinAbsen') {
      if (userSession.role !== 'GURU' && userSession.role !== 'ADMIN') {
        setIsLoginModalOpen(true);
        return;
      }
      setCurrentView(view);
      return;
    }

    if (view === 'kalenderHeb') {
      if (userSession.role !== 'ADMIN' && userSession.role !== 'GURU') {
        setIsLoginModalOpen(true);
        return;
      }
      setCurrentView(view);
      return;
    }

    if (userSession.role !== 'ADMIN') {
      setIsLoginModalOpen(true);
      return;
    }
    setCurrentView(view);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 select-none">
      {/* Navbar Header */}
      <Navbar
        config={config}
        userSession={userSession}
        activeSession={computedSession}
        timeString={timeFormatted}
        dateString={dateFormatted}
        currentView={currentView}
        onSelectView={handleSelectView}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onEditProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        onShowWelcome={() => setShowWelcome(false)}
        onToggleSessionManual={handleToggleSessionManual}
        canInstallPwa={Boolean(deferredPrompt)}
        onInstallPwa={handleInstallPwa}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        syncStatus={syncStatus}
        onTriggerManualSync={handleManualSync}
      />

      {/* Offline Connectivity Warning Banner */}
      {syncStatus === 'offline' && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between gap-3 shadow-xs shrink-0 z-30 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span>⚠️ Anda sedang tidak terhubung ke jaringan internet. Pastikan koneksi internet Anda aktif untuk menyimpan dan memuat data Firebase secara realtime.</span>
          </div>
          <button
            type="button"
            onClick={handleManualSync}
            className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-[11px] font-extrabold transition cursor-pointer shrink-0 shadow-2xs"
          >
            Uji &amp; Hubungkan Ulang
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Desktop (Admin & Guru) */}
        {(userSession.role === 'ADMIN' || userSession.role === 'GURU') && (
          <Sidebar
            currentView={currentView}
            userSession={userSession}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={handleToggleSidebar}
            onSelectView={handleSelectView}
            teacherActiveTab={teacherActiveTab}
            onSelectTeacherTab={handleSelectTeacherTab}
            journalCount={teachingJournals.length}
            onLogout={handleLogout}
          />
        )}

        {/* View Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 pb-20 md:pb-6">
          {currentView === 'kiosk' && (
            <KioskView
              students={students}
              attendance={attendance}
              config={config}
              activeSession={computedSession}
              timeString={timeFormatted}
              onRecordAttendance={handleRecordAttendance}
              onToggleSessionManual={handleToggleSessionManual}
              dayKey={currentDayKey}
              onGoToPublicRekap={() => setCurrentView('pantauPublik')}
            />
          )}

          {currentView === 'pantauPublik' && (
            <PublicRekapView
              students={students}
              attendance={attendance}
              config={config}
              dayKey={currentDayKey}
              teachers={teachers}
              onGoToKiosk={() => setCurrentView('kiosk')}
              onOpenLogin={() => setIsLoginModalOpen(true)}
            />
          )}

          {/* Admin: Supervisi & Monitoring KBM Guru */}
          {currentView === 'portalGuru' && userSession.role === 'ADMIN' && (
            <AdminKbmSupervisionView
              teachers={teachers}
              students={students}
              attendance={attendance}
              journals={teachingJournals}
              config={config}
              activeSession={computedSession}
              timeString={timeFormatted}
              dateString={dateFormatted}
              dayKey={currentDayKey}
              onRecordAttendance={handleRecordAttendance}
              onDeleteAttendance={handleDeleteAttendance}
              onSaveJournal={handleSaveTeachingJournal}
              onDeleteJournal={handleDeleteTeachingJournal}
              onShowNotice={showNotice}
              onShowConfirm={showConfirm}
            />
          )}

          {/* Guru Views: Portal Guru & Presensi KBM */}
          {(currentView === 'portalGuru' || currentView === 'guruIzinAbsen') &&
            userSession.role === 'GURU' &&
            userSession.teacherData && (
              <TeacherPortalView
                teacher={userSession.teacherData}
                students={students}
                attendance={attendance}
                journals={teachingJournals}
                config={config}
                activeSession={computedSession}
                timeString={timeFormatted}
                dateString={dateFormatted}
                dayKey={currentDayKey}
                onRecordAttendance={handleRecordAttendance}
                onDeleteAttendance={handleDeleteAttendance}
                onSaveJournal={handleSaveTeachingJournal}
                onDeleteJournal={handleDeleteTeachingJournal}
                onUpdateTeacherProfile={handleUpdateTeacherProfile}
                activeTab={teacherActiveTab}
                onSelectTab={setTeacherActiveTab}
                isIzinView={currentView === 'guruIzinAbsen'}
                onShowNotice={showNotice}
                onShowConfirm={showConfirm}
              />
            )}

          {/* Admin: Teacher Management */}
          {currentView === 'kelolaGuru' && userSession.role === 'ADMIN' && (
            <TeacherManageView
              teachers={teachers}
              config={config}
              onAddTeacher={handleAddTeacher}
              onUpdateTeacher={handleUpdateTeacher}
              onDeleteTeacher={handleDeleteTeacher}
              onBatchImportTeachers={handleBatchImportTeachers}
              onBatchDeleteTeachers={handleBatchDeleteTeachers}
              onShowNotice={showNotice}
              onShowConfirm={showConfirm}
            />
          )}

          {currentView === 'dashboard' && userSession.role === 'ADMIN' && (
            <AdminDashboard
              students={students}
              attendance={attendance}
              config={config}
              totalHeb={totalHebCount}
              dayKey={currentDayKey}
              onNavigateToBackup={() => setCurrentView('backupData')}
            />
          )}

          {currentView === 'dataSiswa' && userSession.role === 'ADMIN' && (
            <StudentMasterView
              students={students}
              attendance={attendance}
              config={config}
              teachers={teachers}
              onAddOrUpdateStudent={handleAddOrUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onBatchDeleteStudents={handleBatchDeleteStudents}
              onBatchImportStudents={handleBatchImportStudents}
              onShowNotice={showNotice}
              onShowConfirm={showConfirm}
            />
          )}

          {currentView === 'kelolaAbsensi' && userSession.role === 'ADMIN' && (
            <AttendanceManageView
              students={students}
              attendance={attendance}
              config={config}
              teachers={teachers}
              onAddOrUpdateAttendance={handleAddOrUpdateAttendance}
              onDeleteAttendance={handleDeleteAttendance}
              onBatchDeleteAttendance={handleBatchDeleteAttendance}
              onShowNotice={showNotice}
              onShowConfirm={showConfirm}
            />
          )}

          {currentView === 'cetakQr' && userSession.role === 'ADMIN' && (
            <IdCardPrintView students={students} config={config} />
          )}

          {currentView === 'downloadQr' && userSession.role === 'ADMIN' && (
            <QrDownloadView students={students} onShowNotice={showNotice} />
          )}

          {currentView === 'kalenderHeb' &&
            (userSession.role === 'ADMIN' || userSession.role === 'GURU') && (
              <CalendarHebView
                config={config}
                kalenderHebData={kalenderHebData}
                onUpdateKalenderHeb={handleUpdateKalenderHeb}
                onShowNotice={showNotice}
              />
            )}

          {currentView === 'rekapPdf' && userSession.role === 'ADMIN' && (
            <RekapReportView
              students={students}
              attendance={attendance}
              config={config}
              totalHeb={totalHebCount}
              dayKey={currentDayKey}
            />
          )}

          {currentView === 'backupData' && userSession.role === 'ADMIN' && (
            <BackupDriveView
              config={config}
              students={students}
              attendance={attendance}
              journals={teachingJournals}
              teachers={teachers}
              kalenderHebData={kalenderHebData}
              onUpdateConfig={handleUpdateConfig}
              onRestoreAllData={handleRestoreAllData}
              onShowNotice={showNotice}
              onShowConfirm={showConfirm}
            />
          )}

          {currentView === 'pengaturan' && userSession.role === 'ADMIN' && (
            <SettingsView
              config={config}
              attendance={attendance}
              journals={teachingJournals}
              students={students}
              teachers={teachers}
              onUpdateConfig={handleUpdateConfig}
              onCleanDuplicates={handleCleanDuplicates}
              onPurgeSemester={handlePurgeSemester}
              onPurgeSemesterJournals={handlePurgeSemesterJournals}
              onPurgeAllAttendance={handlePurgeAllAttendance}
              onPurgeAllJournals={handlePurgeAllJournals}
              onPurgeAllInputData={handlePurgeAllInputData}
              onResetEntireDatabase={handleResetEntireDatabase}
              onNavigateToBackup={() => setCurrentView('backupData')}
              onShowNotice={showNotice}
              onShowConfirm={showConfirm}
            />
          )}
        </main>
      </div>

      {/* Modals & Notifications */}
      {showWelcome && (
        <WelcomeModal
          config={config}
          onEnter={() => setShowWelcome(false)}
          onGoToMonitoring={() => {
            setShowWelcome(false);
            setCurrentView('pantauPublik');
          }}
        />
      )}

      {/* Profile & Photo Edit Modal for Logged In User */}
      {isProfileModalOpen && (
        <ProfileEditModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          mode={userSession.role === 'GURU' ? 'TEACHER' : 'ADMIN'}
          teacher={userSession.teacherData || teachers.find((t) => t.nama === userSession.name) || teachers[0]}
          config={config}
          onSaveTeacher={handleUpdateTeacherProfile}
          onSaveAdmin={handleUpdateAdminProfile}
          onShowNotice={showNotice}
        />
      )}

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
        onShowNotice={showNotice}
      />

      <NoticeModal
        isOpen={notice.isOpen}
        title={notice.title}
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice((prev) => ({ ...prev, isOpen: false }))}
      />

      <ConfirmModal
        isOpen={confirm.isOpen}
        title={confirm.title}
        message={confirm.message}
        onConfirm={() => {
          confirm.onConfirm();
          setConfirm((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirm((prev) => ({ ...prev, isOpen: false }))}
      />

      <NotificationBanner
        banner={sessionSwitchBanner}
        onDismiss={() => setSessionSwitchBanner(null)}
      />
    </div>
  );
}
