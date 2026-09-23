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
import { BackupDriveView } from './components/BackupDriveView';
import { ProfileEditModal } from './components/ProfileEditModal';
import { Sidebar, TeacherTabType } from './components/Sidebar';
import { WelcomeModal } from './components/WelcomeModal';
import { LoginModal } from './components/LoginModal';
import { NoticeModal, ConfirmModal } from './components/NoticeModal';
import { NotificationBanner } from './components/NotificationBanner';
import {
  getCachedDriveToken,
  executeFullDriveBackup,
  addBackupHistoryItem,
  DEFAULT_DRIVE_FOLDER_ID,
} from './utils/googleDriveBackup';

export default function App() {
  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('epresensi_local_students');
    return saved ? JSON.parse(saved) : SEED_STUDENTS;
  });

  const [attendance, setAttendance] = useState<AttendanceRecord[]>(() => {
    const saved = localStorage.getItem('epresensi_local_attendance');
    return saved ? JSON.parse(saved) : [];
  });

  const [config, setConfig] = useState<SchoolConfig>(() => {
    const saved = localStorage.getItem('epresensi_local_config');
    return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_CONFIG;
  });

  const [kalenderHebData, setKalenderHebData] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('epresensi_local_heb');
    return saved ? JSON.parse(saved) : {};
  });

  const [teachers, setTeachers] = useState<TeacherUser[]>(() => {
    const saved = localStorage.getItem('epresensi_local_teachers');
    return saved ? JSON.parse(saved) : SEED_TEACHERS;
  });

  const [teachingJournals, setTeachingJournals] = useState<TeachingJournal[]>(() => {
    const saved = localStorage.getItem('epresensi_local_journals');
    return saved ? JSON.parse(saved) : [];
  });

  const [userSession, setUserSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('epresensi_user_session');
    return saved ? JSON.parse(saved) : { role: null, name: null };
  });

  const [currentView, setCurrentView] = useState<ViewType>('kiosk');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('epresensi_sidebar_collapsed') === 'true';
  });
  const [teacherActiveTab, setTeacherActiveTab] = useState<TeacherTabType>('DASHBOARD');

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

    // 1. Listen to Students
    const unsubStudents = onSnapshot(
      collection(firestore, 'siswa'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: Student[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as Student;
            data.nisn = String(data.nisn || d.id).trim();
            list.push(data);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
          setStudents(list);
          localStorage.setItem('epresensi_local_students', JSON.stringify(list));
        } else if (students.length === 0) {
          // Initialize starter students into cloud
          const batch = writeBatch(firestore);
          SEED_STUDENTS.forEach((s) => {
            batch.set(doc(firestore, 'siswa', s.nisn), s);
          });
          batch.commit().catch(() => {});
        }
      },
      (err) => console.warn('Firestore students error:', err)
    );

    // 2. Listen to Attendance
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
        localStorage.setItem('epresensi_local_attendance', JSON.stringify(list));
      },
      (err) => console.warn('Firestore attendance error:', err)
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
        localStorage.setItem('epresensi_local_journals', JSON.stringify(list));
      },
      (err) => console.warn('Firestore journals error:', err)
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
          localStorage.setItem('epresensi_local_config', JSON.stringify(merged));
        } else {
          setDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'), DEFAULT_SCHOOL_CONFIG).catch(() => {});
        }
      },
      (err) => console.warn('Firestore config error:', err)
    );

    // 5. Listen to HEB Calendar
    const unsubHeb = onSnapshot(
      doc(firestore, 'kalender_heb', 'active'),
      (d) => {
        if (d.exists()) {
          const data = d.data()?.kalenderData || {};
          setKalenderHebData(data);
          localStorage.setItem('epresensi_local_heb', JSON.stringify(data));
        }
      },
      (err) => console.warn('Firestore HEB error:', err)
    );

    // 6. Listen to Teachers (guru_users)
    const unsubTeachers = onSnapshot(
      collection(firestore, 'guru_users'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: TeacherUser[] = [];
          snapshot.forEach((d) => {
            const data = d.data() as TeacherUser;
            data.id = d.id;
            list.push(data);
          });
          list.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          setTeachers(list);
          localStorage.setItem('epresensi_local_teachers', JSON.stringify(list));
        } else {
          // Initialize starter teacher accounts into cloud
          const batch = writeBatch(firestore);
          SEED_TEACHERS.forEach((t) => {
            batch.set(doc(firestore, 'guru_users', t.id), t);
          });
          batch.commit().catch(() => {});
        }
      },
      (err) => console.warn('Firestore teachers error:', err)
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

    // 1. Firebase Auth for Administrator (if connected)
    if (auth && normalizedUser.includes('@')) {
      try {
        const cred = await signInWithEmailAndPassword(auth, rawUser, trimmedPass);
        const session: UserSession = { role: 'ADMIN', name: cred.user.email || 'Administrator' };
        setUserSession(session);
        localStorage.setItem('epresensi_user_session', JSON.stringify(session));
        setCurrentView('dashboard');
        showNotice('Selamat Datang', 'Login Administrator berhasil. Seluruh fitur aktif!', 'success');
        return true;
      } catch (authErr) {
        // Fallback to local accounts
      }
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
      return true;
    }

    // Allow login if user typed "admin" or school email with any of standard passwords
    if ((normalizedUser.includes('admin') || normalizedUser.includes('smp.pgri1ckd')) && validAdminPass.includes(trimmedPass)) {
      const session: UserSession = { role: 'ADMIN', name: 'Administrator' };
      setUserSession(session);
      localStorage.setItem('epresensi_user_session', JSON.stringify(session));
      setCurrentView('dashboard');
      showNotice('Selamat Datang', 'Login Administrator berhasil. Seluruh fitur aktif!', 'success');
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
      return true;
    }

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

  // Teacher Management Actions (Admin)
  const handleAddTeacher = async (teacher: TeacherUser) => {
    setTeachers((prev) => {
      const updated = [...prev, teacher];
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
      localStorage.setItem('epresensi_local_teachers', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'guru_users', teacher.id), teacher);
      } catch (err) {
        console.warn('Firestore add teacher error:', err);
      }
    }
  };

  const handleUpdateTeacher = async (teacher: TeacherUser) => {
    setTeachers((prev) => {
      const updated = prev.map((t) => (t.id === teacher.id ? teacher : t));
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
      localStorage.setItem('epresensi_local_teachers', JSON.stringify(updated));
      return updated;
    });

    // If currently logged in teacher is modified, update session
    if (userSession.teacherData?.id === teacher.id) {
      const updatedSession: UserSession = {
        ...userSession,
        name: teacher.nama,
        teacherData: teacher,
      };
      setUserSession(updatedSession);
      localStorage.setItem('epresensi_user_session', JSON.stringify(updatedSession));
    }

    const firestore = db;
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'guru_users', teacher.id), teacher);
      } catch (err) {
        console.warn('Firestore update teacher error:', err);
      }
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
    setTeachers((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      localStorage.setItem('epresensi_local_teachers', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'guru_users', id));
      } catch (err) {
        console.warn('Firestore delete teacher error:', err);
      }
    }
  };

  const handleBatchImportTeachers = async (newTeachers: TeacherUser[]) => {
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

      validTeachers.push({
        ...t,
        nama: namaClean,
        username: usernameClean,
        nip: (t.nip || '').trim() || '-',
        password: (t.password || '').trim() || 'guru123',
        mapel: (t.mapel || '').trim() || 'Semua Mata Pelajaran',
        status: t.status === 'NONAKTIF' ? 'NONAKTIF' : 'AKTIF',
      });
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

          map.set(existingId, {
            ...existing,
            ...nt,
            id: existingId,
            fotoUrl: nt.fotoUrl || existing.fotoUrl,
          });
          updatedCount++;
        } else {
          map.set(nt.id, nt);
          insertedCount++;
        }
      });

      const updated = Array.from(map.values());
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
      localStorage.setItem('epresensi_local_teachers', JSON.stringify(updated));
      return updated;
    });

    // Step 4: Persist to Firestore
    const firestore = db;
    if (firestore) {
      try {
        const chunkSize = 400;
        for (let i = 0; i < dedupedBatch.length; i += chunkSize) {
          const chunk = dedupedBatch.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);
          chunk.forEach((t) => batch.set(doc(firestore, 'guru_users', t.id), t));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore batch import teachers error:', err);
      }
    }

    // Step 5: Informative notification feedback
    const totalDuplicates = duplicateNipsFound.length + duplicateUsernamesFound.length + internalDuplicates.length;
    const hasWarnings = totalDuplicates > 0 || invalidRows.length > 0;

    if (hasWarnings) {
      const summaryMsg = [
        `Berhasil memproses ${insertedCount} guru baru dan memperbarui ${updatedCount} akun terdaftar.`,
        totalDuplicates > 0 ? `⚠️ Ditemukan ${totalDuplicates} data NIP/Username yang terdaftar sebelumnya atau terduplikasi.` : '',
        invalidRows.length > 0 ? `⚠️ ${invalidRows.length} baris dilewati karena format tidak lengkap.` : '',
      ]
        .filter(Boolean)
        .join('\n');

      showNotice('Hasil Impor Guru (Validasi Data)', summaryMsg, 'warning');
    } else {
      showNotice(
        'Impor Data Guru Berhasil',
        `Sebanyak ${insertedCount} data guru baru berhasil diverifikasi dan disimpan ke sistem.`,
        'success'
      );
    }
  };

  const handleBatchDeleteTeachers = async (ids: string[]) => {
    setTeachers((prev) => {
      const idSet = new Set(ids);
      const updated = prev.filter((t) => !idSet.has(t.id));
      localStorage.setItem('epresensi_local_teachers', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        const chunkSize = 400;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);
          chunk.forEach((id) => batch.delete(doc(firestore, 'guru_users', id)));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore batch delete teachers error:', err);
      }
    }
  };

  // Record Attendance Action
  const handleRecordAttendance = async (record: AttendanceRecord): Promise<boolean> => {
    // Update local state first for instantaneous feedback
    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== record.id);
      return [record, ...filtered];
    });

    const firestore = db;
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'presensi', record.id), record);
      } catch (err) {
        console.warn('Failed to sync attendance to Firestore:', err);
      }
    }
    return true;
  };

  // Student CRUD Actions
  const handleAddOrUpdateStudent = async (student: Student, oldNisn?: string) => {
    setStudents((prev) => {
      const filtered = prev.filter((s) => s.nisn !== (oldNisn || student.nisn));
      const updated = [...filtered, student];
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
      localStorage.setItem('epresensi_local_students', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        if (oldNisn && oldNisn !== student.nisn) {
          await deleteDoc(doc(firestore, 'siswa', oldNisn));
        }
        await setDoc(doc(firestore, 'siswa', student.nisn), student);
      } catch (err) {
        console.warn('Firestore student sync error:', err);
      }
    }
  };

  const handleDeleteStudent = async (nisn: string) => {
    setStudents((prev) => {
      const updated = prev.filter((s) => s.nisn !== nisn);
      localStorage.setItem('epresensi_local_students', JSON.stringify(updated));
      return updated;
    });
    const firestore = db;
    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'siswa', nisn));
      } catch (err) {
        console.warn('Firestore delete student error:', err);
      }
    }
  };

  const handleBatchDeleteStudents = async (nisns: string[]) => {
    setStudents((prev) => {
      const updated = prev.filter((s) => !nisns.includes(s.nisn));
      localStorage.setItem('epresensi_local_students', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        const chunkSize = 200;
        for (let i = 0; i < nisns.length; i += chunkSize) {
          const chunk = nisns.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);
          chunk.forEach((nisn) => batch.delete(doc(firestore, 'siswa', nisn)));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore batch delete students error:', err);
      }
    }
  };

  const handleBatchImportStudents = async (newStudents: Student[]) => {
    setStudents((prev) => {
      const map = new Map<string, Student>();
      prev.forEach((s) => map.set(s.nisn, s));
      newStudents.forEach((s) => map.set(s.nisn, s));
      const updated = Array.from(map.values());
      updated.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
      localStorage.setItem('epresensi_local_students', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        const chunkSize = 200;
        for (let i = 0; i < newStudents.length; i += chunkSize) {
          const chunk = newStudents.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);
          chunk.forEach((s) => batch.set(doc(firestore, 'siswa', s.nisn), s));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore batch import students error:', err);
      }
    }
  };

  // Attendance CRUD Actions
  const handleAddOrUpdateAttendance = async (record: AttendanceRecord) => {
    setAttendance((prev) => {
      const filtered = prev.filter((a) => a.id !== record.id);
      const updated = [record, ...filtered];
      localStorage.setItem('epresensi_local_attendance', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'presensi', record.id), record);
      } catch (err) {
        console.warn('Firestore attendance sync error:', err);
      }
    }
  };

  const handleDeleteAttendance = async (id: string) => {
    setAttendance((prev) => {
      const updated = prev.filter((a) => a.id !== id);
      localStorage.setItem('epresensi_local_attendance', JSON.stringify(updated));
      return updated;
    });
    const firestore = db;
    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'presensi', id));
      } catch (err) {
        console.warn('Firestore delete attendance error:', err);
      }
    }
  };

  const handleBatchDeleteAttendance = async (ids: string[]) => {
    setAttendance((prev) => {
      const updated = prev.filter((a) => !ids.includes(a.id));
      localStorage.setItem('epresensi_local_attendance', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        const chunkSize = 200;
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          const batch = writeBatch(firestore);
          chunk.forEach((id) => batch.delete(doc(firestore, 'presensi', id)));
          await batch.commit();
        }
      } catch (err) {
        console.warn('Firestore batch delete attendance error:', err);
      }
    }
  };

  // Teaching Journal / Data Pembelajaran Actions
  const handleSaveTeachingJournal = async (journal: TeachingJournal, attendanceBatch?: AttendanceRecord[]) => {
    // 1. Update local journal state
    setTeachingJournals((prev) => {
      const idx = prev.findIndex((j) => j.id === journal.id);
      let updated: TeachingJournal[];
      if (idx >= 0) {
        updated = [...prev];
        updated[idx] = journal;
      } else {
        updated = [journal, ...prev];
      }
      localStorage.setItem('epresensi_local_journals', JSON.stringify(updated));
      return updated;
    });

    // 2. Commit journal + batch attendance records to Firestore
    const firestore = db;
    if (firestore) {
      try {
        const batch = writeBatch(firestore);
        const journalRef = doc(firestore, 'jurnal_mengajar', journal.id);
        batch.set(journalRef, journal, { merge: true });

        if (attendanceBatch && attendanceBatch.length > 0) {
          attendanceBatch.forEach((rec) => {
            const recRef = doc(firestore, 'presensi', rec.id);
            batch.set(recRef, rec, { merge: true });
          });
        }
        await batch.commit();
      } catch (err) {
        console.warn('Firestore save teaching journal error:', err);
      }
    }

    // 3. Update local attendance state if attendanceBatch provided
    if (attendanceBatch && attendanceBatch.length > 0) {
      setAttendance((prev) => {
        const map = new Map<string, AttendanceRecord>();
        prev.forEach((r) => map.set(r.id, r));
        attendanceBatch.forEach((r) => map.set(r.id, r));
        const updated = Array.from(map.values());
        localStorage.setItem('epresensi_local_attendance', JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleDeleteTeachingJournal = async (journalId: string) => {
    setTeachingJournals((prev) => {
      const updated = prev.filter((j) => j.id !== journalId);
      localStorage.setItem('epresensi_local_journals', JSON.stringify(updated));
      return updated;
    });

    const firestore = db;
    if (firestore) {
      try {
        await deleteDoc(doc(firestore, 'jurnal_mengajar', journalId));
      } catch (err) {
        console.warn('Firestore delete teaching journal error:', err);
      }
    }
  };

  // Config and HEB updates
  const handleUpdateConfig = async (newConfig: SchoolConfig) => {
    setConfig(newConfig);
    localStorage.setItem('epresensi_local_config', JSON.stringify(newConfig));
    const firestore = db;
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'), newConfig);
      } catch (err) {
        console.warn('Firestore config update error:', err);
      }
    }
  };

  const handleUpdateKalenderHeb = async (data: Record<string, boolean>) => {
    setKalenderHebData(data);
    localStorage.setItem('epresensi_local_heb', JSON.stringify(data));
    const firestore = db;
    if (firestore) {
      try {
        await setDoc(doc(firestore, 'kalender_heb', 'active'), { kalenderData: data });
      } catch (err) {
        console.warn('Firestore HEB update error:', err);
      }
    }
  };

  // Maintenance: clean duplicates
  const handleCleanDuplicates = async (): Promise<number> => {
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

  // Maintenance: purge semester
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

  // Restore Complete Backup Archive into Database
  const handleRestoreAllData = async (payload: any) => {
    // 1. Update State
    if (Array.isArray(payload.students)) setStudents(payload.students);
    if (Array.isArray(payload.attendance)) setAttendance(payload.attendance);
    if (Array.isArray(payload.journals)) setTeachingJournals(payload.journals);
    if (Array.isArray(payload.teachers)) setTeachers(payload.teachers);
    if (payload.kalenderHeb) setKalenderHebData(payload.kalenderHeb);
    if (payload.config && payload.config.namaSekolah) setConfig(payload.config);

    // 2. Persist to LocalStorage
    localStorage.setItem('epresensi_local_students', JSON.stringify(payload.students || []));
    localStorage.setItem('epresensi_local_attendance', JSON.stringify(payload.attendance || []));
    localStorage.setItem('epresensi_local_journals', JSON.stringify(payload.journals || []));
    localStorage.setItem('epresensi_local_teachers', JSON.stringify(payload.teachers || []));
    if (payload.kalenderHeb) localStorage.setItem('epresensi_local_heb', JSON.stringify(payload.kalenderHeb));
    if (payload.config) localStorage.setItem('epresensi_local_config', JSON.stringify(payload.config));

    // 3. Persist to Firestore if available
    const firestore = db;
    if (firestore) {
      try {
        if (payload.config) {
          await setDoc(doc(firestore, 'pengaturan', 'identitas_sekolah'), payload.config, { merge: true });
        }
        if (payload.kalenderHeb) {
          await setDoc(doc(firestore, 'kalender_heb', 'active'), { kalenderData: payload.kalenderHeb }, { merge: true });
        }

        // Write students chunked
        if (Array.isArray(payload.students)) {
          for (let i = 0; i < payload.students.length; i += 200) {
            const chunk = payload.students.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((s: any) => batch.set(doc(firestore, 'siswa', s.nisn), s));
            await batch.commit();
          }
        }

        // Write attendance chunked
        if (Array.isArray(payload.attendance)) {
          for (let i = 0; i < payload.attendance.length; i += 200) {
            const chunk = payload.attendance.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((a: any) => batch.set(doc(firestore, 'presensi', a.id), a));
            await batch.commit();
          }
        }

        // Write journals chunked
        if (Array.isArray(payload.journals)) {
          for (let i = 0; i < payload.journals.length; i += 200) {
            const chunk = payload.journals.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((j: any) => batch.set(doc(firestore, 'jurnal_mengajar', j.id), j));
            await batch.commit();
          }
        }

        // Write teachers chunked
        if (Array.isArray(payload.teachers)) {
          for (let i = 0; i < payload.teachers.length; i += 200) {
            const chunk = payload.teachers.slice(i, i + 200);
            const batch = writeBatch(firestore);
            chunk.forEach((t: any) => batch.set(doc(firestore, 'guru', t.id), t));
            await batch.commit();
          }
        }
      } catch (err) {
        console.warn('Firestore restore sync partial fallback:', err);
      }
    }
  };

  // Daily Auto-Backup to Google Drive check
  useEffect(() => {
    const checkDailyBackup = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const backupConfig = config.googleDriveBackup;

      if (
        backupConfig?.autoDailyBackup !== false &&
        backupConfig?.lastBackupDate !== todayStr &&
        students.length > 0
      ) {
        const token = getCachedDriveToken();
        if (token) {
          try {
            console.log('[AutoBackup] Memulai pencadangan harian otomatis ke Google Drive...');
            const fullPayload = {
              version: '2.0',
              exportedAt: new Date().toISOString(),
              schoolName: config.namaSekolah || 'SMP PGRI 1 CIKADU',
              npsn: config.npsn || '69919136',
              config,
              students,
              attendance,
              journals: teachingJournals,
              teachers,
              kalenderHeb: kalenderHebData,
            };

            const targetFolder = backupConfig?.folderId || DEFAULT_DRIVE_FOLDER_ID;
            const res = await executeFullDriveBackup(token, targetFolder, fullPayload);

            const updatedConfig: SchoolConfig = {
              ...config,
              googleDriveBackup: {
                ...(config.googleDriveBackup || {
                  enabled: true,
                  folderId: targetFolder,
                  folderUrl: `https://drive.google.com/drive/u/0/folders/${targetFolder}`,
                  autoDailyBackup: true,
                }),
                lastBackupDate: todayStr,
                lastBackupTimestamp: new Date().toISOString(),
                lastBackupStatus: 'SUCCESS',
                lastBackupMessage: `Backup harian otomatis sukses (${res.uploadedFiles.length} berkas).`,
              },
            };

            await handleUpdateConfig(updatedConfig);

            addBackupHistoryItem({
              id: `auto-${Date.now()}`,
              timestamp: new Date().toISOString(),
              date: todayStr,
              time: new Date().toLocaleTimeString('id-ID'),
              totalStudents: students.length,
              totalAttendance: attendance.length,
              totalJournals: teachingJournals.length,
              totalTeachers: teachers.length,
              fileNames: res.uploadedFiles.map((f) => f.fileName),
              driveFolderId: targetFolder,
              status: 'SUCCESS',
              source: 'AUTO_DAILY',
              message: 'Backup harian otomatis tersinkronisasi ke Google Drive',
              driveWebLink: res.uploadedFiles[0]?.webViewLink,
            });

            console.log('[AutoBackup] Cadangan harian Google Drive berhasil disinkronkan.');
          } catch (err) {
            console.warn('[AutoBackup] Gagal menjalankan backup harian background:', err);
          }
        }
      }
    };

    const timer = setTimeout(checkDailyBackup, 4000);
    return () => clearTimeout(timer);
  }, [
    config.googleDriveBackup?.lastBackupDate,
    config.googleDriveBackup?.autoDailyBackup,
    students.length,
    attendance.length,
  ]);

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
      />

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

          {/* Guru Views */}
          {(currentView === 'portalGuru' || currentView === 'guruIzinAbsen') &&
            (userSession.role === 'GURU' || userSession.role === 'ADMIN') && (
              <TeacherPortalView
                teacher={
                  userSession.teacherData ||
                  teachers[0] || {
                    id: 'admin-guru',
                    nama: userSession.name || 'Administrator',
                    nip: '-',
                    username: 'admin',
                    password: '',
                    mapel: 'Semua Mata Pelajaran',
                    status: 'AKTIF',
                    createdAt: new Date().toISOString(),
                  }
                }
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
              onUpdateConfig={handleUpdateConfig}
              onCleanDuplicates={handleCleanDuplicates}
              onPurgeSemester={handlePurgeSemester}
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
