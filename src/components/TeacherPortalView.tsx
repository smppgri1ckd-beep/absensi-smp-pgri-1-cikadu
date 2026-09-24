import React, { useState, useMemo, useEffect } from 'react';
import {
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Users,
  ShieldCheck,
  Phone,
  Sparkles,
  ClipboardList,
  Edit3,
  PlusCircle,
  CalendarDays,
  FileText,
  Eye,
  Trash2,
  Download,
  FileDown,
  RotateCcw,
  Check,
  X,
  QrCode,
  Camera,
  Save,
  Layers,
  FileCheck2,
  ListOrdered,
  CalendarRange,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  AttendanceSession,
  AttendanceStatus,
  AttendanceCategory,
  TeachingJournal,
} from '../types';
import { OFFICIAL_SUBJECTS } from '../constants/subjects';
import { StudentDetailModal } from './StudentDetailModal';
import { TeacherQRScannerModal } from './TeacherQRScannerModal';
import { LearningSummaryDashboard } from './LearningSummaryDashboard';
import { ProfileEditModal } from './ProfileEditModal';
import {
  exportTeacherDailyPDF,
  exportTeacherJournalBookPDF,
  exportTeacherAttendanceMatrixPDF,
  JournalExportFilterOptions,
} from '../utils/teacherExportPdf';

interface TeacherPortalViewProps {
  teacher: TeacherUser;
  students: Student[];
  attendance: AttendanceRecord[];
  journals?: TeachingJournal[];
  config: SchoolConfig;
  activeSession: AttendanceSession;
  timeString: string;
  dateString: string;
  dayKey: string;
  onRecordAttendance: (record: AttendanceRecord) => Promise<boolean>;
  onDeleteAttendance?: (id: string) => Promise<void>;
  onSaveJournal?: (journal: TeachingJournal, attendanceBatch?: AttendanceRecord[]) => Promise<void>;
  onDeleteJournal?: (id: string) => Promise<void>;
  onUpdateTeacherProfile?: (updatedTeacher: TeacherUser) => Promise<void>;
  activeTab?: 'DASHBOARD' | 'PRESENSI' | 'JURNAL' | 'LAPORAN_PDF' | 'SISWA' | 'PIKET';
  onSelectTab?: (tab: 'DASHBOARD' | 'PRESENSI' | 'JURNAL' | 'LAPORAN_PDF' | 'SISWA' | 'PIKET') => void;
  isIzinView?: boolean;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({
  teacher,
  students,
  attendance,
  journals = [],
  config,
  activeSession,
  timeString,
  dateString,
  dayKey,
  onRecordAttendance,
  onDeleteAttendance,
  onSaveJournal,
  onDeleteJournal,
  onUpdateTeacherProfile,
  activeTab: propActiveTab,
  onSelectTab,
  isIzinView = false,
  onShowNotice,
  onShowConfirm,
}) => {
  // Extract available classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

  // Extract teacher's assigned subjects list (supports 1, 2, 3 or more subjects)
  const teacherMapelList = useMemo(() => {
    if (!teacher.mapel) return [OFFICIAL_SUBJECTS[0]];
    const list = teacher.mapel
      .split(/[,/|]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    return list.length > 0 ? list : [OFFICIAL_SUBJECTS[0]];
  }, [teacher.mapel]);

  // Default selected class: teacher's wali kelas if exists, else first class
  const initialClass = useMemo(() => {
    if (teacher.waliKelas && teacher.waliKelas !== 'Bukan Wali Kelas' && classes.includes(teacher.waliKelas)) {
      return teacher.waliKelas;
    }
    return classes[0] || 'VII-A';
  }, [teacher.waliKelas, classes]);

  const [selectedClass, setSelectedClass] = useState<string>(initialClass);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [selectedSession, setSelectedSession] = useState<AttendanceSession>(activeSession);
  const [internalActiveTab, setInternalActiveTab] = useState<'DASHBOARD' | 'PRESENSI' | 'JURNAL' | 'LAPORAN_PDF' | 'SISWA' | 'PIKET'>('DASHBOARD');
  const activeTab = propActiveTab || internalActiveTab;
  const setActiveTab = (tab: 'DASHBOARD' | 'PRESENSI' | 'JURNAL' | 'LAPORAN_PDF' | 'SISWA' | 'PIKET') => {
    setInternalActiveTab(tab);
    if (onSelectTab) {
      onSelectTab(tab);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');

  // Dual-Function: APEL (Pagi/Siang) vs KELAS (KBM Mengajar)
  const [attendanceCategory, setAttendanceCategory] = useState<AttendanceCategory>('KELAS');
  const [selectedMapel, setSelectedMapel] = useState<string>(() => teacherMapelList[0] || OFFICIAL_SUBJECTS[0]);
  const [pertemuanKe, setPertemuanKe] = useState<number>(1);
  const [jamPelajaran, setJamPelajaran] = useState<string>('07:30 - 09:00 (Jam Ke 1-2)');
  const [materiPokok, setMateriPokok] = useState<string>('');
  const [kegiatanPembelajaran, setKegiatanPembelajaran] = useState<string>('');
  const [catatanRefleksi, setCatatanRefleksi] = useState<string>('');
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // Sync state when teacher prop changes (e.g. in Assistance Mode)
  useEffect(() => {
    if (teacherMapelList.length > 0) {
      setSelectedMapel(teacherMapelList[0] || OFFICIAL_SUBJECTS[0]);
    }
    if (initialClass) {
      setSelectedClass(initialClass);
    }
  }, [teacher.id, teacher.mapel, initialClass]);

  // Modal Input Izin / Sakit
  const [showIzinModal, setShowIzinModal] = useState(isIzinView);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [izinStatus, setIzinStatus] = useState<'Izin' | 'Sakit' | 'Alpa' | 'Hadir Tepat Waktu'>('Izin');
  const [izinKeterangan, setIzinKeterangan] = useState('');

  useEffect(() => {
    if (isIzinView) {
      setShowIzinModal(true);
      setActiveTab('PRESENSI');
    }
  }, [isIzinView]);

  // Modal Edit Presensi Manual / Koreksi
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<string>('Hadir Tepat Waktu');
  const [editWaktu, setEditWaktu] = useState<string>('');
  const [editSesi, setEditSesi] = useState<AttendanceSession>('Pagi');
  const [editTanggal, setEditTanggal] = useState<string>('');
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [editKategori, setEditKategori] = useState<AttendanceCategory>('KELAS');
  const [editMapel, setEditMapel] = useState<string>(teacher.mapel || OFFICIAL_SUBJECTS[0]);
  const [editPertemuanKe, setEditPertemuanKe] = useState<number>(1);
  const [editMateriPokok, setEditMateriPokok] = useState<string>('');

  // Student Detail Modal state
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // QR Scanner Modal for KBM Presensi
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Filter state for Jurnal Tab
  const [journalFilterClass, setJournalFilterClass] = useState<string>('ALL');
  const [journalFilterMapel, setJournalFilterMapel] = useState<string>('ALL');
  const [journalSearchQuery, setJournalSearchQuery] = useState<string>('');

  // PDF Download Hub Modal / Form States
  const [showPdfHubModal, setShowPdfHubModal] = useState(false);
  const [pdfReportType, setPdfReportType] = useState<'REKAP_JURNAL' | 'PERTEMUAN' | 'TANGGAL' | 'BUKU_AGENDA' | 'MATRIKS'>('REKAP_JURNAL');
  const [pdfSelectedClass, setPdfSelectedClass] = useState<string>(initialClass);
  const [pdfSelectedMapel, setPdfSelectedMapel] = useState<string>(teacherMapelList[0] || OFFICIAL_SUBJECTS[0]);
  const [pdfPertemuanKe, setPdfPertemuanKe] = useState<number>(1);
  const [pdfStartDate, setPdfStartDate] = useState<string>(selectedDate);
  const [pdfEndDate, setPdfEndDate] = useState<string>(selectedDate);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Dedicated Journal PDF Filter Modal States
  const [showJournalExportModal, setShowJournalExportModal] = useState(false);
  const [jExpClass, setJExpClass] = useState<string>('ALL');
  const [jExpMapel, setJExpMapel] = useState<string>(teacherMapelList[0] || OFFICIAL_SUBJECTS[0]);
  const [jExpDateMode, setJExpDateMode] = useState<'ALL' | 'SINGLE' | 'RANGE'>('ALL');
  const [jExpStartDate, setJExpStartDate] = useState<string>(selectedDate);
  const [jExpEndDate, setJExpEndDate] = useState<string>(selectedDate);
  const [jExpPertemuanMode, setJExpPertemuanMode] = useState<'ALL' | 'SINGLE' | 'RANGE'>('ALL');
  const [jExpPertemuanSingle, setJExpPertemuanSingle] = useState<number>(1);
  const [jExpPertemuanFrom, setJExpPertemuanFrom] = useState<number>(1);
  const [jExpPertemuanTo, setJExpPertemuanTo] = useState<number>(16);
  const [jExpMateriMode, setJExpMateriMode] = useState<'ALL' | 'KEYWORD' | 'SELECT'>('ALL');
  const [jExpMateriKeyword, setJExpMateriKeyword] = useState<string>('');
  const [jExpSelectedMateri, setJExpSelectedMateri] = useState<string>('');

  // Handlers for Dashboard Drilldown Actions
  const handleOpenSessionInPresensi = (
    kelas: string,
    mapel: string,
    tanggal: string,
    pertemuan: number,
    materi?: string
  ) => {
    setSelectedClass(kelas);
    setSelectedMapel(mapel);
    setSelectedDate(tanggal);
    setPertemuanKe(pertemuan);
    if (materi) setMateriPokok(materi);
    setAttendanceCategory('KELAS');
    setActiveTab('PRESENSI');
    onShowNotice(
      'Sesi Pembelajaran Dimuat',
      `Membuka sesi KBM Kelas ${kelas} • ${mapel} (Pertemuan Ke-${pertemuan}) pada ${tanggal}`,
      'info'
    );
  };

  const handleDownloadMeetingPdf = async (
    kelas: string,
    mapel: string,
    pertemuan: number,
    tanggal: string,
    materi?: string,
    jam?: string,
    kegiatan?: string,
    catatan?: string
  ) => {
    try {
      const classStudentsList = students.filter((s) => s.kelas === kelas);
      await exportTeacherDailyPDF(
        config,
        teacher,
        kelas,
        'Pagi',
        tanggal,
        classStudentsList,
        attendance,
        {
          kategori: 'KELAS',
          mapel,
          pertemuanKe: pertemuan,
          materiPokok: materi,
          jamPelajaran: jam,
          kegiatanPembelajaran: kegiatan,
          catatanRefleksi: catatan,
        }
      );
      onShowNotice(
        'Laporan Berhasil Diunduh',
        `PDF Pembelajaran Pertemuan Ke-${pertemuan} (${mapel} - ${kelas}) telah disimpan.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to export meeting PDF:', err);
      onShowNotice('Gagal Unduh PDF', 'Terjadi kesalahan saat membuat file PDF.', 'warning');
    }
  };

  const handleOpenStudentDetail = (s: Student) => {
    setSelectedDetailStudent(s);
    setIsDetailModalOpen(true);
  };

  // Filter students by selected class & search
  const classStudents = useMemo(() => {
    return students
      .filter((s) => s.kelas === selectedClass)
      .filter(
        (s) =>
          s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.nisn.includes(searchQuery)
      )
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [students, selectedClass, searchQuery]);

  // Attendance records for the selected date, category & session/mapel
  const dateSessionRecords = useMemo(() => {
    return attendance.filter((a) => {
      if (a.tanggal !== selectedDate) return false;
      if (attendanceCategory === 'KELAS') {
        if (a.kategori === 'KELAS') {
          const mapelMatch = !a.mapel || a.mapel.trim().toLowerCase() === selectedMapel.trim().toLowerCase();
          const pertemuanMatch = a.pertemuanKe === undefined || a.pertemuanKe === pertemuanKe;
          return mapelMatch && pertemuanMatch;
        }
        return false;
      } else {
        const isApel = a.kategori === 'APEL' || !a.kategori;
        return isApel && a.sesi === selectedSession;
      }
    });
  }, [attendance, selectedDate, attendanceCategory, selectedSession, selectedMapel, pertemuanKe]);

  // Map of student NISN to their attendance record
  const studentAttendanceMap = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    dateSessionRecords.forEach((r) => {
      map.set(r.nisn, r);
    });
    return map;
  }, [dateSessionRecords]);

  // Class statistics for selected date & session
  const stats = useMemo(() => {
    const totalClassStudents = students.filter((s) => s.kelas === selectedClass).length;
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    students
      .filter((s) => s.kelas === selectedClass)
      .forEach((s) => {
        const rec = studentAttendanceMap.get(s.nisn);
        if (rec) {
          const st = rec.status;
          if (st.includes('Hadir') || st.includes('Tepat')) hadir++;
          else if (st.includes('Terlambat')) terlambat++;
          else if (st.includes('Izin')) izin++;
          else if (st.includes('Sakit')) sakit++;
          else if (st.includes('Alpa')) alpa++;
          else hadir++;
        }
      });

    const totalRecorded = hadir + terlambat + izin + sakit + alpa;
    const belumAbsen = Math.max(0, totalClassStudents - totalRecorded);
    const persentase =
      totalClassStudents > 0
        ? Math.round(((hadir + terlambat) / totalClassStudents) * 100)
        : 0;

    return {
      total: totalClassStudents,
      hadir,
      terlambat,
      izin,
      sakit,
      alpa,
      belumAbsen,
      persentase,
    };
  }, [students, selectedClass, studentAttendanceMap]);

  // Teacher's saved journals list
  const teacherJournals = useMemo(() => {
    return journals.filter((j) => {
      const isOwner = j.guruId === teacher.id || j.guruNama === teacher.nama || teacher.id === 'admin-guru';
      if (!isOwner) return false;

      if (journalFilterClass !== 'ALL' && j.kelas !== journalFilterClass) return false;
      if (journalFilterMapel !== 'ALL' && j.mapel !== journalFilterMapel) return false;
      if (journalSearchQuery) {
        const q = journalSearchQuery.toLowerCase();
        const matchMateri = j.materiPokok.toLowerCase().includes(q);
        const matchDate = j.tanggal.includes(q);
        const matchP = `pertemuan ${j.pertemuanKe}`.includes(q) || `p${j.pertemuanKe}`.includes(q);
        return matchMateri || matchDate || matchP;
      }
      return true;
    });
  }, [journals, teacher.id, teacher.nama, journalFilterClass, journalFilterMapel, journalSearchQuery]);

  // Teacher's distinct material topics for quick-selection
  const distinctMaterials = useMemo(() => {
    const set = new Set<string>();
    journals.forEach((j) => {
      const isOwner = j.guruId === teacher.id || j.guruNama === teacher.nama || teacher.id === 'admin-guru';
      if (isOwner && j.materiPokok && j.materiPokok.trim()) {
        set.add(j.materiPokok.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [journals, teacher.id, teacher.nama]);

  // Matching journals preview for PDF export based on active export filter parameters
  const matchingExportJournals = useMemo(() => {
    return journals.filter((j) => {
      const isOwner = j.guruId === teacher.id || j.guruNama === teacher.nama || teacher.id === 'admin-guru';
      if (!isOwner) return false;

      // Class filter
      if (jExpClass !== 'ALL' && j.kelas !== jExpClass) return false;

      // Mapel filter
      if (jExpMapel !== 'ALL' && j.mapel.trim().toLowerCase() !== jExpMapel.trim().toLowerCase()) return false;

      // Date filter
      if (jExpDateMode === 'SINGLE' && jExpStartDate) {
        if (j.tanggal !== jExpStartDate) return false;
      } else if (jExpDateMode === 'RANGE') {
        if (jExpStartDate && j.tanggal < jExpStartDate) return false;
        if (jExpEndDate && j.tanggal > jExpEndDate) return false;
      }

      // Pertemuan filter
      if (jExpPertemuanMode === 'SINGLE') {
        if (j.pertemuanKe !== jExpPertemuanSingle) return false;
      } else if (jExpPertemuanMode === 'RANGE') {
        if (jExpPertemuanFrom && j.pertemuanKe < jExpPertemuanFrom) return false;
        if (jExpPertemuanTo && j.pertemuanKe > jExpPertemuanTo) return false;
      }

      // Materi filter
      if (jExpMateriMode === 'KEYWORD' && jExpMateriKeyword.trim()) {
        const q = jExpMateriKeyword.trim().toLowerCase();
        const matchMateri = (j.materiPokok || '').toLowerCase().includes(q);
        const matchKegiatan = (j.kegiatanPembelajaran || '').toLowerCase().includes(q);
        const matchCatatan = (j.catatanRefleksi || '').toLowerCase().includes(q);
        if (!matchMateri && !matchKegiatan && !matchCatatan) return false;
      } else if (jExpMateriMode === 'SELECT' && jExpSelectedMateri) {
        if (j.materiPokok !== jExpSelectedMateri) return false;
      }

      return true;
    }).sort((a, b) => {
      if (a.pertemuanKe !== b.pertemuanKe) return a.pertemuanKe - b.pertemuanKe;
      return a.tanggal.localeCompare(b.tanggal);
    });
  }, [
    journals,
    teacher.id,
    teacher.nama,
    jExpClass,
    jExpMapel,
    jExpDateMode,
    jExpStartDate,
    jExpEndDate,
    jExpPertemuanMode,
    jExpPertemuanSingle,
    jExpPertemuanFrom,
    jExpPertemuanTo,
    jExpMateriMode,
    jExpMateriKeyword,
    jExpSelectedMateri,
  ]);

  // Suggest next meeting number when class / mapel changes
  const suggestedNextMeeting = useMemo(() => {
    const existing = journals
      .filter((j) => j.kelas === selectedClass && j.mapel === selectedMapel)
      .map((j) => j.pertemuanKe || 0);
    if (existing.length === 0) return 1;
    return Math.max(...existing) + 1;
  }, [journals, selectedClass, selectedMapel]);

  // Handle manual status change for 1 student
  const handleQuickStatusChange = (
    student: Student,
    newStatus: AttendanceStatus,
    note?: string
  ) => {
    const now = new Date();
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const isKelas = attendanceCategory === 'KELAS';
    const recId = isKelas
      ? `kbm_${student.nisn}_${selectedDate}_${selectedMapel.replace(/\s+/g, '_')}_p${pertemuanKe}`
      : `att_${student.nisn}_${selectedDate}_${selectedSession}`;

    const newRecord: AttendanceRecord = {
      id: recId,
      tanggal: selectedDate,
      waktu: timeNow,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      sesi: selectedSession,
      status: note ? `${newStatus} (${note})` : newStatus,
      kategori: attendanceCategory,
      ...(isKelas ? {
        mapel: selectedMapel,
        pertemuanKe,
        materiPokok: materiPokok.trim() || undefined,
        guruId: teacher.id,
        guruNama: teacher.nama,
      } : {}),
    };

    onRecordAttendance(newRecord).then(() => {
      onShowNotice(
        'Status Presensi Diperbarui',
        `${student.nama} (${student.kelas}) ditandai: ${newStatus}${isKelas ? ` [${selectedMapel} Pertemuan Ke-${pertemuanKe}]` : ''}`,
        'success'
      );
    });
  };

  // Mark all unrecorded students as "Hadir Tepat Waktu"
  const handleMarkAllPresent = async () => {
    const unrecorded = classStudents.filter((s) => !studentAttendanceMap.has(s.nisn));
    if (unrecorded.length === 0) {
      onShowNotice('Info', 'Semua siswa di kelas ini sudah memiliki status presensi.', 'info');
      return;
    }

    const now = new Date();
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const isKelas = attendanceCategory === 'KELAS';

    for (const student of unrecorded) {
      const recId = isKelas
        ? `kbm_${student.nisn}_${selectedDate}_${selectedMapel.replace(/\s+/g, '_')}_p${pertemuanKe}`
        : `att_${student.nisn}_${selectedDate}_${selectedSession}`;

      const rec: AttendanceRecord = {
        id: recId,
        tanggal: selectedDate,
        waktu: timeNow,
        nisn: student.nisn,
        nama: student.nama,
        kelas: student.kelas,
        sesi: selectedSession,
        status: 'Hadir Tepat Waktu',
        kategori: attendanceCategory,
        ...(isKelas ? {
          mapel: selectedMapel,
          pertemuanKe,
          materiPokok: materiPokok.trim() || undefined,
          guruId: teacher.id,
          guruNama: teacher.nama,
        } : {}),
      };
      await onRecordAttendance(rec);
    }

    onShowNotice(
      'Selesai',
      `Berhasil menandai Hadir untuk ${unrecorded.length} siswa kelas ${selectedClass}.`,
      'success'
    );
  };

  // Save Teaching Journal + Batch Attendance
  const handleSaveLearningSessionAndAttendance = async () => {
    if (!materiPokok.trim()) {
      onShowNotice(
        'Materi Pokok Diperlukan',
        'Silakan isi materi pokok pembelajaran pertemuan ini sebelum menyimpan.',
        'warning'
      );
      return;
    }

    setIsSavingJournal(true);
    try {
      const now = new Date();
      const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes()
      ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

      // Build attendance batch for all students in this class
      const attendanceBatch: AttendanceRecord[] = classStudents.map((s) => {
        const existing = studentAttendanceMap.get(s.nisn);
        if (existing) {
          return {
            ...existing,
            materiPokok: materiPokok.trim(),
            mapel: selectedMapel,
            pertemuanKe: pertemuanKe,
            guruId: teacher.id,
            guruNama: teacher.nama,
          };
        }
        // If not yet marked, default to Hadir Tepat Waktu
        return {
          id: `kbm_${s.nisn}_${selectedDate}_${selectedMapel.replace(/\s+/g, '_')}_p${pertemuanKe}`,
          tanggal: selectedDate,
          waktu: timeNow,
          nisn: s.nisn,
          nama: s.nama,
          kelas: s.kelas,
          sesi: selectedSession,
          status: 'Hadir Tepat Waktu',
          kategori: 'KELAS',
          mapel: selectedMapel,
          pertemuanKe,
          materiPokok: materiPokok.trim(),
          guruId: teacher.id,
          guruNama: teacher.nama,
        };
      });

      // Recalculate stats for journal
      let hadirCount = 0;
      let terlambatCount = 0;
      let izinCount = 0;
      let sakitCount = 0;
      let alpaCount = 0;

      attendanceBatch.forEach((r) => {
        const st = r.status.toLowerCase();
        if (st.includes('hadir') || st.includes('tepat')) hadirCount++;
        else if (st.includes('terlambat')) terlambatCount++;
        else if (st.includes('izin')) izinCount++;
        else if (st.includes('sakit')) sakitCount++;
        else if (st.includes('alpa')) alpaCount++;
        else hadirCount++;
      });

      const totalSiswa = classStudents.length;
      const totalHadirSemua = hadirCount + terlambatCount;
      const persentase = totalSiswa > 0 ? Math.round((totalHadirSemua / totalSiswa) * 100) : 0;

      const journalId = `jrn_${teacher.id}_${selectedClass}_${selectedMapel.replace(/\s+/g, '_')}_p${pertemuanKe}_${selectedDate}`;

      const journalData: TeachingJournal = {
        id: journalId,
        guruId: teacher.id,
        guruNama: teacher.nama,
        guruNip: teacher.nip || '-',
        kelas: selectedClass,
        mapel: selectedMapel,
        tanggal: selectedDate,
        pertemuanKe,
        jamPelajaran,
        materiPokok: materiPokok.trim(),
        kegiatanPembelajaran: kegiatanPembelajaran.trim() || '',
        catatanRefleksi: catatanRefleksi.trim() || '',
        totalSiswa,
        hadir: hadirCount,
        terlambat: terlambatCount,
        izin: izinCount,
        sakit: sakitCount,
        alpa: alpaCount,
        persentaseKehadiran: persentase,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (onSaveJournal) {
        await onSaveJournal(journalData, attendanceBatch);
      }

      onShowNotice(
        'Data Pembelajaran Tersimpan!',
        `Data KBM Pertemuan Ke-${pertemuanKe} (${selectedMapel} - Kelas ${selectedClass}) beserta rekap presensi seluruh siswa berhasil disimpan ke cloud database.`,
        'success'
      );
    } catch (err) {
      console.error('Error saving learning session:', err);
      onShowNotice('Gagal Menyimpan', 'Terjadi kendala saat menyimpan data ke database.', 'warning');
    } finally {
      setIsSavingJournal(false);
    }
  };

  // Load a historical journal into the active editor
  const handleLoadJournalToEditor = (jrn: TeachingJournal) => {
    setSelectedClass(jrn.kelas);
    setSelectedMapel(jrn.mapel);
    setSelectedDate(jrn.tanggal);
    setPertemuanKe(jrn.pertemuanKe);
    setJamPelajaran(jrn.jamPelajaran || '07:30 - 09:00 (Jam Ke 1-2)');
    setMateriPokok(jrn.materiPokok);
    setKegiatanPembelajaran(jrn.kegiatanPembelajaran || '');
    setCatatanRefleksi(jrn.catatanRefleksi || '');
    setAttendanceCategory('KELAS');
    setActiveTab('PRESENSI');

    onShowNotice(
      'Sesi Pembelajaran Dimuat',
      `Data Pertemuan Ke-${jrn.pertemuanKe} (${jrn.mapel} Kelas ${jrn.kelas}) telah dibuka di lembar presensi aktif.`,
      'info'
    );
  };

  // Delete a journal record
  const handleDeleteJournalItem = (jrn: TeachingJournal) => {
    onShowConfirm(
      'Hapus Data Jurnal?',
      `Apakah Anda yakin ingin menghapus data pembelajaran Pertemuan Ke-${jrn.pertemuanKe} (${jrn.mapel} - ${jrn.tanggal})?`,
      async () => {
        if (onDeleteJournal) {
          await onDeleteJournal(jrn.id);
          onShowNotice('Terhapus', 'Catatan jurnal pembelajaran berhasil dihapus.', 'info');
        }
      }
    );
  };

  // Export single meeting PDF directly
  const handleExportMeetingPdf = async (jrn?: TeachingJournal) => {
    const targetClass = jrn ? jrn.kelas : selectedClass;
    const targetMapel = jrn ? jrn.mapel : selectedMapel;
    const targetDate = jrn ? jrn.tanggal : selectedDate;
    const targetP = jrn ? jrn.pertemuanKe : pertemuanKe;
    const targetMateri = jrn ? jrn.materiPokok : materiPokok;
    const targetJam = jrn ? jrn.jamPelajaran : jamPelajaran;
    const targetKegiatan = jrn ? jrn.kegiatanPembelajaran : kegiatanPembelajaran;
    const targetCatatan = jrn ? jrn.catatanRefleksi : catatanRefleksi;

    const classSiswa = students.filter((s) => s.kelas === targetClass);

    await exportTeacherDailyPDF(
      config,
      teacher,
      targetClass,
      selectedSession,
      targetDate,
      classSiswa,
      attendance,
      {
        kategori: 'KELAS',
        mapel: targetMapel,
        pertemuanKe: targetP,
        materiPokok: targetMateri,
        jamPelajaran: targetJam,
        kegiatanPembelajaran: targetKegiatan,
        catatanRefleksi: targetCatatan,
      }
    );
  };

  // Open Journal PDF Export Modal with prefilled parameters
  const handleOpenJournalExportModal = (options?: {
    kelas?: string;
    mapel?: string;
    materi?: string;
    pertemuan?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    setJExpClass(options?.kelas || journalFilterClass || 'ALL');
    setJExpMapel(options?.mapel || (journalFilterMapel !== 'ALL' ? journalFilterMapel : teacherMapelList[0] || OFFICIAL_SUBJECTS[0]));
    
    if (options?.startDate || options?.endDate) {
      setJExpDateMode(options.startDate && options.endDate && options.startDate !== options.endDate ? 'RANGE' : 'SINGLE');
      setJExpStartDate(options.startDate || selectedDate);
      setJExpEndDate(options.endDate || selectedDate);
    } else {
      setJExpDateMode('ALL');
    }

    if (options?.pertemuan) {
      setJExpPertemuanMode('SINGLE');
      setJExpPertemuanSingle(options.pertemuan);
    } else {
      setJExpPertemuanMode('ALL');
    }

    if (options?.materi) {
      setJExpMateriMode('KEYWORD');
      setJExpMateriKeyword(options.materi);
    } else if (journalSearchQuery) {
      setJExpMateriMode('KEYWORD');
      setJExpMateriKeyword(journalSearchQuery);
    } else {
      setJExpMateriMode('ALL');
      setJExpMateriKeyword('');
      setJExpSelectedMateri('');
    }

    setShowJournalExportModal(true);
  };

  // Export the current journal table view directly
  const handleExportCurrentJournalView = async () => {
    if (teacherJournals.length === 0) {
      onShowNotice(
        'Tidak Ada Data Jurnal',
        'Tidak ada sesi jurnal yang cocok dengan filter tabel aktif untuk dicetak.',
        'warning'
      );
      return;
    }

    setIsExportingPdf(true);
    try {
      const filterOptions: JournalExportFilterOptions = {
        materiKeyword: journalSearchQuery || undefined,
        customSubtitle: `[ Tampilan Tabel: Kelas ${journalFilterClass} | Mapel ${journalFilterMapel} ${journalSearchQuery ? `| Pencarian: "${journalSearchQuery}"` : ''} ]`,
      };

      await exportTeacherJournalBookPDF(
        config,
        teacher,
        journalFilterClass,
        journalFilterMapel === 'ALL' ? (teacher.mapel || 'Semua Mapel') : journalFilterMapel,
        teacherJournals,
        filterOptions
      );

      onShowNotice(
        'Laporan Berhasil Diunduh',
        `PDF Rekap Jurnal Pembelajaran (${teacherJournals.length} sesi) berhasil disimpan.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to export current journal view:', err);
      onShowNotice('Gagal Unduh PDF', 'Terjadi kesalahan saat memproses file PDF.', 'warning');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Execute filtered Journal PDF export from dedicated modal
  const handleExecuteJournalPdfExport = async () => {
    if (matchingExportJournals.length === 0) {
      onShowNotice(
        'Tidak Ada Data Cocok',
        'Tidak ditemukan sesi jurnal yang sesuai dengan kriteria filter yang dipilih. Silakan sesuaikan filter Anda.',
        'warning'
      );
      return;
    }

    setIsExportingPdf(true);
    try {
      const filterOptions: JournalExportFilterOptions = {
        dateMode: jExpDateMode,
        startDate: jExpStartDate,
        endDate: jExpEndDate,
        pertemuanMode: jExpPertemuanMode,
        singlePertemuan: jExpPertemuanSingle,
        pertemuanFrom: jExpPertemuanFrom,
        pertemuanTo: jExpPertemuanTo,
        materiKeyword:
          jExpMateriMode === 'KEYWORD'
            ? jExpMateriKeyword.trim() || undefined
            : jExpMateriMode === 'SELECT'
            ? jExpSelectedMateri || undefined
            : undefined,
      };

      await exportTeacherJournalBookPDF(
        config,
        teacher,
        jExpClass,
        jExpMapel === 'ALL' ? (teacher.mapel || 'Semua Mapel') : jExpMapel,
        matchingExportJournals,
        filterOptions
      );

      setShowJournalExportModal(false);
      onShowNotice(
        'PDF Berhasil Diunduh',
        `Rekap Jurnal Pembelajaran (${matchingExportJournals.length} sesi) berhasil diunduh.`,
        'success'
      );
    } catch (err) {
      console.error('Failed to export journal PDF:', err);
      onShowNotice('Gagal Unduh PDF', 'Terjadi kesalahan saat memproses file PDF.', 'warning');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Export Teacher Journal Book
  const handleExportJournalBook = async () => {
    const targetClass = pdfSelectedClass;
    const targetMapel = pdfSelectedMapel;

    const filtered = journals.filter((j) => {
      const matchTeacher = j.guruId === teacher.id || j.guruNama === teacher.nama || teacher.id === 'admin-guru';
      if (!matchTeacher) return false;
      if (targetClass !== 'ALL' && j.kelas !== targetClass) return false;
      if (j.mapel.trim().toLowerCase() !== targetMapel.trim().toLowerCase()) return false;
      return true;
    });

    if (filtered.length === 0) {
      onShowNotice(
        'Belum Ada Data Jurnal',
        `Tidak ditemukan data jurnal untuk ${targetMapel} di kelas ${targetClass}. Silakan simpan pertemuan terlebih dahulu.`,
        'warning'
      );
      return;
    }

    await exportTeacherJournalBookPDF(config, teacher, targetClass, targetMapel, filtered);
  };

  // Export Attendance Matrix (P1 s.d PN)
  const handleExportAttendanceMatrix = async () => {
    const targetClass = pdfSelectedClass === 'ALL' ? classes[0] : pdfSelectedClass;
    const targetMapel = pdfSelectedMapel;

    const classSiswa = students.filter((s) => s.kelas === targetClass);
    if (classSiswa.length === 0) {
      onShowNotice('Info', `Tidak ada siswa di kelas ${targetClass}.`, 'warning');
      return;
    }

    const filteredJournals = journals.filter((j) => {
      const matchTeacher = j.guruId === teacher.id || j.guruNama === teacher.nama || teacher.id === 'admin-guru';
      if (!matchTeacher) return false;
      if (j.kelas !== targetClass) return false;
      if (j.mapel.trim().toLowerCase() !== targetMapel.trim().toLowerCase()) return false;
      return true;
    });

    await exportTeacherAttendanceMatrixPDF(
      config,
      teacher,
      targetClass,
      targetMapel,
      students,
      filteredJournals,
      attendance
    );
  };

  // Handle flexible PDF download from Hub modal
  const handleDownloadFromHub = async () => {
    setIsExportingPdf(true);
    try {
      if (pdfReportType === 'REKAP_JURNAL') {
        handleOpenJournalExportModal({
          kelas: pdfSelectedClass,
          mapel: pdfSelectedMapel,
          startDate: pdfStartDate,
          endDate: pdfEndDate,
          pertemuan: pdfPertemuanKe,
        });
        setShowPdfHubModal(false);
        return;
      } else if (pdfReportType === 'PERTEMUAN') {
        const classSiswa = students.filter((s) => s.kelas === pdfSelectedClass);
        const jrn = journals.find(
          (j) =>
            j.kelas === pdfSelectedClass &&
            j.mapel === pdfSelectedMapel &&
            j.pertemuanKe === pdfPertemuanKe
        );

        await exportTeacherDailyPDF(
          config,
          teacher,
          pdfSelectedClass,
          selectedSession,
          jrn ? jrn.tanggal : pdfStartDate,
          classSiswa,
          attendance,
          {
            kategori: 'KELAS',
            mapel: pdfSelectedMapel,
            pertemuanKe: pdfPertemuanKe,
            materiPokok: jrn ? jrn.materiPokok : `Materi Pembelajaran Pertemuan Ke-${pdfPertemuanKe}`,
            jamPelajaran: jrn ? jrn.jamPelajaran : undefined,
            kegiatanPembelajaran: jrn ? jrn.kegiatanPembelajaran : undefined,
            catatanRefleksi: jrn ? jrn.catatanRefleksi : undefined,
          }
        );
      } else if (pdfReportType === 'BUKU_AGENDA') {
        await handleExportJournalBook();
      } else if (pdfReportType === 'MATRIKS') {
        await handleExportAttendanceMatrix();
      } else if (pdfReportType === 'TANGGAL') {
        const classSiswa = students.filter((s) => s.kelas === pdfSelectedClass);
        await exportTeacherDailyPDF(
          config,
          teacher,
          pdfSelectedClass,
          selectedSession,
          pdfStartDate,
          classSiswa,
          attendance,
          {
            kategori: 'KELAS',
            mapel: pdfSelectedMapel,
            pertemuanKe: pdfPertemuanKe,
            materiPokok: materiPokok || `Rekap KBM Tanggal ${pdfStartDate}`,
          }
        );
      }
      setShowPdfHubModal(false);
    } catch (err) {
      console.error('Export error:', err);
      onShowNotice('Gagal Mengunduh', 'Terjadi kesalahan saat memproses laporan PDF.', 'warning');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleOpenIzinModal = (s: Student) => {
    setTargetStudent(s);
    const existing = studentAttendanceMap.get(s.nisn);
    if (existing?.status.includes('Sakit')) setIzinStatus('Sakit');
    else if (existing?.status.includes('Izin')) setIzinStatus('Izin');
    else if (existing?.status.includes('Alpa')) setIzinStatus('Alpa');
    else setIzinStatus('Izin');
    setIzinKeterangan('');
    setShowIzinModal(true);
  };

  const handleSaveIzin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStudent) return;

    handleQuickStatusChange(
      targetStudent,
      izinStatus as AttendanceStatus,
      izinKeterangan.trim() || undefined
    );
    setShowIzinModal(false);
  };

  // Open Edit Modal for a student / attendance record
  const handleOpenEditModal = (student: Student, record?: AttendanceRecord) => {
    setEditingStudent(student);
    setEditingRecord(record || null);

    const now = new Date();
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    if (record) {
      setEditTanggal(record.tanggal);
      setEditWaktu(record.waktu);
      setEditSesi(record.sesi);
      setEditKategori(record.kategori || attendanceCategory);
      setEditMapel(record.mapel || selectedMapel);
      setEditPertemuanKe(record.pertemuanKe || pertemuanKe);
      setEditMateriPokok(record.materiPokok || materiPokok || '');

      const match = record.status.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        setEditStatus(match[1]);
        setEditKeterangan(match[2]);
      } else {
        setEditStatus(record.status);
        setEditKeterangan('');
      }
    } else {
      setEditTanggal(selectedDate);
      setEditWaktu(timeNow);
      setEditSesi(selectedSession);
      setEditKategori(attendanceCategory);
      setEditMapel(selectedMapel);
      setEditPertemuanKe(pertemuanKe);
      setEditMateriPokok(materiPokok || '');
      setEditStatus('Hadir Tepat Waktu');
      setEditKeterangan('');
    }

    setShowEditModal(true);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const recId =
      editingRecord?.id ||
      (editKategori === 'KELAS'
        ? `kbm_${editingStudent.nisn}_${editTanggal}_${editMapel.replace(/\s+/g, '_')}_p${editPertemuanKe}`
        : `att_${editingStudent.nisn}_${editTanggal}_${editSesi}`);

    const finalStatus = editKeterangan.trim()
      ? `${editStatus} (${editKeterangan.trim()})`
      : editStatus;

    const newRecord: AttendanceRecord = {
      id: recId,
      tanggal: editTanggal,
      waktu: editWaktu,
      nisn: editingStudent.nisn,
      nama: editingStudent.nama,
      kelas: editingStudent.kelas,
      sesi: editSesi,
      status: finalStatus,
      kategori: editKategori,
      ...(editKategori === 'KELAS'
        ? {
            mapel: editMapel,
            pertemuanKe: editPertemuanKe,
            materiPokok: editMateriPokok.trim() || undefined,
            guruId: teacher.id,
            guruNama: teacher.nama,
          }
        : {}),
    };

    await onRecordAttendance(newRecord);
    setShowEditModal(false);
    onShowNotice('Sukses', 'Data presensi siswa berhasil diperbarui.', 'success');
  };

  const handleDeleteRecord = async () => {
    if (!editingRecord) return;
    onShowConfirm(
      'Hapus Catatan Presensi?',
      `Hapus data presensi ${editingRecord.nama} pada tanggal ${editingRecord.tanggal}?`,
      async () => {
        if (onDeleteAttendance) {
          await onDeleteAttendance(editingRecord.id);
          setShowEditModal(false);
          onShowNotice('Terhapus', 'Catatan presensi berhasil dihapus.', 'info');
        }
      }
    );
  };

  const dutyTeacherToday = config.jadwalPiket?.[dayKey as keyof typeof config.jadwalPiket] || {
    nama: 'Belum Diatur',
    nip: '-',
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ===== HERO GURU PROFILE & QUICK STATS BANNER ===== */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-700/40">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative group shrink-0">
              <img
                src={
                  teacher.fotoUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
                }
                alt={teacher.nama}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/30 shadow-lg bg-slate-800"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
                }}
              />
              <button
                type="button"
                onClick={() => setShowProfileModal(true)}
                title="Ganti Foto Profil Guru"
                className="absolute -bottom-1 -right-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full p-1.5 border-2 border-blue-950 shadow-sm transition active:scale-90 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/25 border border-blue-400/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-200">
                  Portal Guru Pengajar & Wali Kelas
                </span>
                {teacher.waliKelas && teacher.waliKelas !== 'Bukan Wali Kelas' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/30 text-[10px] sm:text-xs font-bold text-emerald-200">
                    Wali Kelas {teacher.waliKelas}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {teacher.nama}
              </h1>
              <p className="text-xs sm:text-sm text-blue-200/90 font-medium">
                NIP: {teacher.nip || '-'} • Mapel: <span className="font-bold text-white">{teacher.mapel}</span>
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowProfileModal(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer shadow-xs hover:border-emerald-400"
            >
              <User className="w-4 h-4 text-emerald-300" />
              <span>Edit Profil &amp; Foto</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPdfSelectedClass(selectedClass);
                setPdfSelectedMapel(selectedMapel);
                setShowPdfHubModal(true);
              }}
              className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-2 shadow-lg hover:shadow-emerald-900/30 cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>Unduh Laporan PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold backdrop-blur-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-300" />
              <span>Scan QR KBM</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== TAB 0: DASHBOARD RINGKASAN PEMBELAJARAN & GRAFIK TREN ===== */}
      {activeTab === 'DASHBOARD' && (
        <LearningSummaryDashboard
          teacher={teacher}
          students={students}
          journals={journals}
          attendance={attendance}
          classes={classes}
          teacherMapelList={teacherMapelList}
          config={config}
          onOpenSessionInPresensi={handleOpenSessionInPresensi}
          onDownloadMeetingPdf={handleDownloadMeetingPdf}
        />
      )}

      {/* ===== TAB 1: PRESENSI SISWA & SESI AKTIF KBM ===== */}
      {activeTab === 'PRESENSI' && (
        <div className="space-y-4">
          {/* Sesi KBM / Apel Selector Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Category selector */}
              <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                <button
                  type="button"
                  onClick={() => setAttendanceCategory('KELAS')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    attendanceCategory === 'KELAS'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>KBM Tatap Muka Kelas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceCategory('APEL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                    attendanceCategory === 'APEL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Apel Kedisiplinan Sekolah</span>
                </button>
              </div>

              {/* Class and Date Selectors */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Kelas:</span>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c} {teacher.waliKelas === c ? '(Wali Kelas)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {attendanceCategory === 'KELAS' ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Mapel:</span>
                    <select
                      value={selectedMapel}
                      onChange={(e) => setSelectedMapel(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 max-w-[180px] truncate"
                    >
                      {teacherMapelList.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      {OFFICIAL_SUBJECTS.filter((s) => !teacherMapelList.includes(s)).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Sesi:</span>
                    <select
                      value={selectedSession}
                      onChange={(e) => setSelectedSession(e.target.value as AttendanceSession)}
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                    >
                      <option value="Pagi">Apel Masuk Pagi</option>
                      <option value="Siang">Apel Pulang Siang</option>
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Tanggal:</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Sesi KBM: Details & Save Journal Bar */}
            {attendanceCategory === 'KELAS' && (
              <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border border-blue-200/80 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Input Data Pembelajaran & Pertemuan KBM
                    </h3>
                  </div>
                  <div className="text-[11px] text-blue-700 font-bold">
                    Saran Pertemuan: <span className="underline">Ke-{suggestedNextMeeting}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pertemuan Ke-
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={pertemuanKe}
                      onChange={(e) => setPertemuanKe(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Jam Pelajaran / Waktu
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 07:30 - 09:00 (Jam 1-2)"
                      value={jamPelajaran}
                      onChange={(e) => setJamPelajaran(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Materi Pokok / Pembahasan Hari Ini <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bab 3 - Persamaan Linear Dua Variabel (Metode Substitusi)"
                      value={materiPokok}
                      onChange={(e) => setMateriPokok(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kegiatan Pembelajaran / Capaian
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Diskusi kelompok, demonstrasi materi, dan latihan soal modul hal. 45"
                      value={kegiatanPembelajaran}
                      onChange={(e) => setKegiatanPembelajaran(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Catatan Guru / Tugas / Siswa Berkendala
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: 3 siswa remedial, PR dikumpulkan pertemuan berikutnya"
                      value={catatanRefleksi}
                      onChange={(e) => setCatatanRefleksi(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-600 font-semibold flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    <span>
                      Kehadiran: <strong className="text-emerald-700">{stats.persentase}%</strong> ({stats.hadir + stats.terlambat} Hadir, {stats.izin} Izin, {stats.sakit} Sakit, {stats.alpa + stats.belumAbsen} Belum/Alpa)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleMarkAllPresent}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tandai Semua Hadir</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveLearningSessionAndAttendance}
                      disabled={isSavingJournal}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      <span>{isSavingJournal ? 'Menyimpan...' : 'Simpan Data Pembelajaran & Absensi'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Table of Students Attendance */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN siswa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExportMeetingPdf()}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cetak PDF Sesi Ini</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold text-slate-600 uppercase">
                  <tr>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3">Siswa</th>
                    <th className="py-3 px-3 w-14 text-center">L/P</th>
                    <th className="py-3 px-3 w-28 text-center">Waktu</th>
                    <th className="py-3 px-3 w-36 text-center">Status</th>
                    <th className="py-3 px-3 text-center w-52">Aksi Presensi Cepat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classStudents.map((s, idx) => {
                    const record = studentAttendanceMap.get(s.nisn);
                    const status = record ? record.status : 'Alpa (Belum Hadir)';
                    const isRecorded = !!record;

                    return (
                      <tr key={s.nisn} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={s.fotoUrl}
                              alt={s.nama}
                              className="w-8 h-8 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
                              }}
                            />
                            <div>
                              <p
                                onClick={() => handleOpenStudentDetail(s)}
                                className="font-extrabold text-slate-900 hover:text-blue-600 cursor-pointer"
                              >
                                {s.nama}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                NISN: {s.nisn}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                          {s.jk}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-500">
                          {record?.waktu ? `${record.waktu} WIB` : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`text-[10px] font-black px-2.5 py-1 rounded-lg inline-block ${
                              status.includes('Hadir') || status.includes('Tepat')
                                ? 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                                : status.includes('Terlambat')
                                ? 'text-amber-800 bg-amber-50 border border-amber-200'
                                : status.includes('Izin')
                                ? 'text-blue-800 bg-blue-50 border border-blue-200'
                                : status.includes('Sakit')
                                ? 'text-orange-800 bg-orange-50 border border-orange-200'
                                : 'text-rose-800 bg-rose-50 border border-rose-200'
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(s, 'Hadir Tepat Waktu')}
                              title="Tandai Hadir"
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                            >
                              Hadir
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenIzinModal(s)}
                              title="Catat Izin / Sakit"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                            >
                              Izin/Sakit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickStatusChange(s, 'Alpa')}
                              title="Tandai Alpa"
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                            >
                              Alpa
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(s, record)}
                              title="Edit / Koreksi Detail"
                              className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB 2: DATA PEMBELAJARAN & BUKU JURNAL MENGAJAR GURU ===== */}
      {activeTab === 'JURNAL' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Bank Data Pembelajaran & Riwayat Sesi KBM
                </h3>
                <p className="text-[11px] text-slate-500">
                  Seluruh materi pertemuan dan rekap absensi yang pernah disimpan oleh {teacher.nama}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenJournalExportModal()}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Buka filter lanjutan untuk mengunduh rekap jurnal pembelajaran"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Ekspor Rekap Jurnal (PDF)</span>
                </button>

                {journalSearchQuery || journalFilterClass !== 'ALL' || journalFilterMapel !== 'ALL' ? (
                  <button
                    type="button"
                    onClick={handleExportCurrentJournalView}
                    disabled={isExportingPdf || teacherJournals.length === 0}
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Unduh langsung data yang saat ini tampil di tabel"
                  >
                    <Printer className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cetak Sesuai Filter Tabel ({teacherJournals.length})</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari materi pokok atau tanggal..."
                  value={journalSearchQuery}
                  onChange={(e) => setJournalSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                />
              </div>

              <div>
                <select
                  value={journalFilterClass}
                  onChange={(e) => setJournalFilterClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={journalFilterMapel}
                  onChange={(e) => setJournalFilterMapel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 truncate"
                >
                  <option value="ALL">Semua Mata Pelajaran</option>
                  {teacherMapelList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setJournalFilterClass('ALL');
                    setJournalFilterMapel('ALL');
                    setJournalSearchQuery('');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filter</span>
                </button>
              </div>
            </div>

            {/* Teaching History Cards */}
            {teacherJournals.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="font-extrabold text-sm text-slate-700">Belum Ada Sesi Pembelajaran Tersimpan</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Lakukan absensi di tab "Presensi Siswa", isi materi pokok pertemuan, lalu klik "Simpan Data Pembelajaran & Absensi" untuk mencatat agenda mengajar.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {teacherJournals.map((jrn) => (
                  <div
                    key={jrn.id}
                    className="bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md rounded-2xl p-4 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-black text-[10px] uppercase">
                            Pertemuan Ke-{jrn.pertemuanKe}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-extrabold text-[10px]">
                            Kelas {jrn.kelas}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {jrn.tanggal}
                          </span>
                        </div>
                        <h4 className="font-black text-xs text-slate-900 pt-1 leading-snug">
                          {jrn.materiPokok}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-semibold">
                          Mapel: <strong className="text-slate-800">{jrn.mapel}</strong> {jrn.jamPelajaran ? `• ${jrn.jamPelajaran}` : ''}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-emerald-700 block">
                          {jrn.persentaseKehadiran}%
                        </span>
                        <span className="text-[9px] text-slate-400 block">
                          {jrn.hadir + jrn.terlambat}/{jrn.totalSiswa} Hadir
                        </span>
                      </div>
                    </div>

                    {(jrn.kegiatanPembelajaran || jrn.catatanRefleksi) && (
                      <div className="text-[10.5px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                        {jrn.kegiatanPembelajaran && (
                          <p>
                            <strong className="text-slate-700">Kegiatan:</strong> {jrn.kegiatanPembelajaran}
                          </p>
                        )}
                        {jrn.catatanRefleksi && (
                          <p className="text-amber-800">
                            <strong className="text-amber-900">Catatan:</strong> {jrn.catatanRefleksi}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                        <span className="text-emerald-700">H: {jrn.hadir + jrn.terlambat}</span> •
                        <span className="text-blue-700">I: {jrn.izin}</span> •
                        <span className="text-orange-700">S: {jrn.sakit}</span> •
                        <span className="text-rose-700">A: {jrn.alpa}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadJournalToEditor(jrn)}
                          title="Buka / Tinjau Kembali Sesi Ini"
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Buka Sesi</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleExportMeetingPdf(jrn)}
                          title="Unduh PDF Pertemuan Ini"
                          className="p-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-lg transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteJournalItem(jrn)}
                          title="Hapus Sesi Jurnal"
                          className="p-1 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== TAB 3: DIREKTORI SISWA ROMBEL ===== */}
      {activeTab === 'SISWA' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-slate-900">
                Direktori Profil Siswa Kelas {selectedClass}
              </h3>
              <p className="text-[11px] text-slate-500">
                Total {classStudents.length} siswa terdaftar di rombongan belajar ini.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
              >
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {classStudents.map((s) => (
              <div
                key={s.nisn}
                onClick={() => handleOpenStudentDetail(s)}
                className="bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl p-3.5 shadow-2xs transition-all flex items-center gap-3 cursor-pointer group hover:-translate-y-0.5"
                title={`Klik untuk melihat detail profil ${s.nama}`}
              >
                <div className="relative shrink-0">
                  <img
                    src={s.fotoUrl}
                    alt={s.nama}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100 group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-blue-600/15 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-blue-800">
                    <Eye className="w-4 h-4 drop-shadow-sm" />
                  </div>
                </div>
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                      {s.nama}
                    </p>
                    <Eye className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors shrink-0" />
                  </div>
                  <p className="font-mono text-[10px] text-slate-500 mt-0.5">
                    NISN: {s.nisn}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                      {s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">
                      Kelas {s.kelas}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== TAB 4: INFO GURU PIKET & KALENDER ===== */}
      {activeTab === 'PIKET' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Petugas Piket Hari Ini ({dayKey.toUpperCase()})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Guru piket bertanggung jawab memantau ketertiban dan kiosk presensi.
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-200/70 rounded-2xl">
              <p className="text-xs font-bold text-amber-800">Guru Piket Bertugas:</p>
              <p className="text-base font-extrabold text-slate-900 mt-1">
                {dutyTeacherToday.nama}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                NIP: {dutyTeacherToday.nip}
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <span className="font-black text-slate-700 block">Jadwal Piket Mingguan:</span>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {Object.entries(config.jadwalPiket || {}).map(([day, dt]: [string, any]) => (
                  <div key={day} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-black uppercase text-blue-600 block">{day}</span>
                    <span className="font-semibold text-slate-800 truncate block">{dt.nama}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Jadwal Operasional Presensi Digital
                </h3>
                <p className="text-[11px] text-slate-500">
                  Aturan rentang waktu kedatangan dan kepulangan siswa.
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <p className="font-extrabold text-blue-800">Sesi Masuk Pagi:</p>
                <p className="text-slate-700 mt-0.5">
                  Buka: <span className="font-mono font-bold">{config.schedule.morningStart} WIB</span> • Batas Tepat Waktu:{' '}
                  <span className="font-mono font-bold text-emerald-700">{config.schedule.morningOnTimeEnd} WIB</span>
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-2xl">
                <p className="font-extrabold text-emerald-800">Sesi Kepulangan Siang:</p>
                <p className="text-slate-700 mt-0.5">
                  Buka: <span className="font-mono font-bold">{config.schedule.afternoonStart} WIB</span> • Selesai:{' '}
                  <span className="font-mono font-bold">{config.schedule.afternoonCutoff} WIB</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB 5: DOWNLOAD LAPORAN PDF KBM ===== */}
      {activeTab === 'LAPORAN_PDF' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-xs shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Pusat Unduh Laporan PDF & Agenda Mengajar
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ekspor rekapitulasi KBM, lembar presensi resmi A4, buku agenda, dan matriks kehadiran siswa.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowJournalExportModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-xs font-extrabold transition flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Filter Ekspor Jurnal Lengkap</span>
              </button>
            </div>

            {/* Report Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div
                onClick={() => {
                  setPdfReportType('REKAP_JURNAL');
                  setShowJournalExportModal(true);
                }}
                className="p-4 rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/40 hover:bg-emerald-50 transition cursor-pointer space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-emerald-900 text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    Rekap Jurnal & Agenda Mengajar (PDF)
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-800 font-extrabold">
                    Rekomendasi
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Format resmi buku agenda guru memuat nomor pertemuan, materi pokok, catatan refleksi, dan rincian kehadiran siswa.
                </p>
              </div>

              <div
                onClick={() => {
                  setPdfReportType('PERTEMUAN');
                  setShowPdfHubModal(true);
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition cursor-pointer space-y-1.5"
              >
                <span className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Presensi Per Pertemuan Spesifik
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cetak lembar presensi untuk satu nomor pertemuan tatap muka tertentu (misal Pertemuan Ke-1, 2, dst).
                </p>
              </div>

              <div
                onClick={() => {
                  setPdfReportType('TANGGAL');
                  setShowPdfHubModal(true);
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition cursor-pointer space-y-1.5"
              >
                <span className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <CalendarRange className="w-4 h-4 text-purple-600" />
                  Presensi Harian / Tanggal Tertentu
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cetak lembar absensi siswa pada tanggal pelaksanaan kegiatan belajar mengajar tertentu.
                </p>
              </div>

              <div
                onClick={() => {
                  setPdfReportType('BUKU_AGENDA');
                  setShowPdfHubModal(true);
                }}
                className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition cursor-pointer space-y-1.5"
              >
                <span className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-amber-600" />
                  Buku Agenda & Rekapitulasi Rombel
                </span>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cetak buku agenda mengajar lengkap 1 semester beserta ringkasan jam dan materi pokok.
                </p>
              </div>
            </div>

            {/* Quick Export Controls */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800">Pilih Parameter Cepat Unduh:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">Kelas</label>
                  <select
                    value={pdfSelectedClass}
                    onChange={(e) => setPdfSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>Kelas {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-600 mb-1">Mata Pelajaran</label>
                  <select
                    value={pdfSelectedMapel}
                    onChange={(e) => setPdfSelectedMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 truncate"
                  >
                    {teacherMapelList.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                    {OFFICIAL_SUBJECTS.filter((s) => !teacherMapelList.includes(s)).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowJournalExportModal(true)}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Buka Filter & Unduh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL PUSAT DOWNLOAD LAPORAN PDF FLEKSIBEL ===== */}
      {showPdfHubModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Pusat Unduh Laporan PDF Guru
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Pilih format dan filter laporan pembelajaran sesuai kebutuhan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfHubModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Type selector buttons */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPdfReportType('REKAP_JURNAL')}
                className={`p-3 rounded-2xl border font-bold text-left transition cursor-pointer space-y-1 ${
                  pdfReportType === 'REKAP_JURNAL'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-black">Rekap Jurnal Terfilter</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Filter tanggal, materi, atau pertemuan tertentu
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPdfReportType('PERTEMUAN')}
                className={`p-3 rounded-2xl border font-bold text-left transition cursor-pointer space-y-1 ${
                  pdfReportType === 'PERTEMUAN'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-black">Per Pertemuan</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Detail 1 pertemuan + daftar presensi siswa lengkap
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPdfReportType('MATRIKS')}
                className={`p-3 rounded-2xl border font-bold text-left transition cursor-pointer space-y-1 ${
                  pdfReportType === 'MATRIKS'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-black">Matriks Presensi (P1-PN)</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Tabel kehadiran siswa multi-pertemuan & % akhir
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPdfReportType('BUKU_AGENDA')}
                className={`p-3 rounded-2xl border font-bold text-left transition cursor-pointer space-y-1 ${
                  pdfReportType === 'BUKU_AGENDA'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-xs font-black">Buku Agenda Mengajar</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">
                  Rekap seluruh materi & agenda mengajar 1 semester
                </p>
              </button>
            </div>

            {/* Filter Configuration */}
            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kelas / Rombel
                  </label>
                  <select
                    value={pdfSelectedClass}
                    onChange={(e) => setPdfSelectedClass(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {pdfReportType === 'BUKU_AGENDA' && <option value="ALL">Semua Kelas</option>}
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={pdfSelectedMapel}
                    onChange={(e) => setPdfSelectedMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 truncate"
                  >
                    {teacherMapelList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {OFFICIAL_SUBJECTS.filter((s) => !teacherMapelList.includes(s)).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {pdfReportType === 'REKAP_JURNAL' && (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-emerald-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mode Ekspor Rekap Jurnal Fleksibel</span>
                  </p>
                  <p className="text-[10px] text-emerald-800">
                    Klik tombol di bawah untuk membuka panel filter lanjutan (berdasarkan rentang tanggal, materi pokok spesifik, atau pilihan pertemuan tertentu).
                  </p>
                </div>
              )}

              {pdfReportType === 'PERTEMUAN' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pilih Pertemuan Ke-
                  </label>
                  <select
                    value={pdfPertemuanKe}
                    onChange={(e) => setPdfPertemuanKe(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    {Array.from({ length: 32 }, (_, i) => i + 1).map((p) => {
                      const jrn = journals.find(
                        (j) =>
                          j.kelas === pdfSelectedClass &&
                          j.mapel === pdfSelectedMapel &&
                          j.pertemuanKe === p
                      );
                      return (
                        <option key={p} value={p}>
                          Pertemuan Ke-{p} {jrn ? `(${jrn.materiPokok.substring(0, 30)}...)` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {pdfReportType === 'TANGGAL' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tanggal Presensi
                  </label>
                  <input
                    type="date"
                    value={pdfStartDate}
                    onChange={(e) => setPdfStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPdfHubModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDownloadFromHub}
                disabled={isExportingPdf}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExportingPdf
                    ? 'Membuat PDF...'
                    : pdfReportType === 'REKAP_JURNAL'
                    ? 'Buka Filter Ekspor Jurnal'
                    : 'Unduh File PDF Sekarang'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL FILTER & EKSPOR REKAP JURNAL PEMBELAJARAN (PDF) ===== */}
      {showJournalExportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                  <FileDown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Ekspor Rekap Jurnal Pembelajaran (PDF)
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Unduh buku agenda & rekap jurnal KBM dengan filter tanggal, materi, atau pertemuan tertentu.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowJournalExportModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Scrollable Filters */}
            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              {/* Section 1: Rombel & Mapel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Kelas / Rombongan Belajar
                  </label>
                  <select
                    value={jExpClass}
                    onChange={(e) => setJExpClass(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                  >
                    <option value="ALL">Semua Kelas ({teacher.nama})</option>
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                    Mata Pelajaran
                  </label>
                  <select
                    value={jExpMapel}
                    onChange={(e) => setJExpMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 truncate"
                  >
                    <option value="ALL">Semua Mata Pelajaran</option>
                    {teacherMapelList.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {OFFICIAL_SUBJECTS.filter((s) => !teacherMapelList.includes(s)).map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section 2: Filter Rentang Tanggal */}
              <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <CalendarRange className="w-3.5 h-3.5 text-blue-600" />
                    <span>Filter Tanggal Pelaksanaan</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {jExpDateMode === 'ALL'
                      ? 'Seluruh Tanggal'
                      : jExpDateMode === 'SINGLE'
                      ? `Tanggal: ${jExpStartDate}`
                      : `${jExpStartDate} s.d ${jExpEndDate}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setJExpDateMode('ALL')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpDateMode === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Semua Tanggal
                  </button>
                  <button
                    type="button"
                    onClick={() => setJExpDateMode('SINGLE')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpDateMode === 'SINGLE'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tanggal Tertentu
                  </button>
                  <button
                    type="button"
                    onClick={() => setJExpDateMode('RANGE')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpDateMode === 'RANGE'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Rentang Tanggal
                  </button>
                </div>

                {jExpDateMode === 'SINGLE' && (
                  <div className="pt-1">
                    <input
                      type="date"
                      value={jExpStartDate}
                      onChange={(e) => setJExpStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                )}

                {jExpDateMode === 'RANGE' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Dari Tanggal
                      </label>
                      <input
                        type="date"
                        value={jExpStartDate}
                        onChange={(e) => setJExpStartDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        type="date"
                        value={jExpEndDate}
                        onChange={(e) => setJExpEndDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Filter Pertemuan Tertentu */}
              <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                    <span>Filter Nomor Pertemuan (KBM)</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {jExpPertemuanMode === 'ALL'
                      ? 'Semua Pertemuan'
                      : jExpPertemuanMode === 'SINGLE'
                      ? `Pertemuan Ke-${jExpPertemuanSingle}`
                      : `P${jExpPertemuanFrom} s.d P${jExpPertemuanTo}`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setJExpPertemuanMode('ALL')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpPertemuanMode === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Semua Pertemuan
                  </button>
                  <button
                    type="button"
                    onClick={() => setJExpPertemuanMode('SINGLE')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpPertemuanMode === 'SINGLE'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Pertemuan Spesifik
                  </button>
                  <button
                    type="button"
                    onClick={() => setJExpPertemuanMode('RANGE')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpPertemuanMode === 'RANGE'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Rentang (P1 - Pn)
                  </button>
                </div>

                {jExpPertemuanMode === 'SINGLE' && (
                  <div className="pt-1">
                    <select
                      value={jExpPertemuanSingle}
                      onChange={(e) => setJExpPertemuanSingle(parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    >
                      {Array.from({ length: 32 }, (_, i) => i + 1).map((p) => {
                        const matchingCount = journals.filter(
                          (j) =>
                            (jExpClass === 'ALL' || j.kelas === jExpClass) &&
                            (jExpMapel === 'ALL' || j.mapel === jExpMapel) &&
                            j.pertemuanKe === p
                        ).length;
                        return (
                          <option key={p} value={p}>
                            Pertemuan Ke-{p} {matchingCount > 0 ? `(${matchingCount} sesi tercatat)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                {jExpPertemuanMode === 'RANGE' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Dari Pertemuan Ke-
                      </label>
                      <select
                        value={jExpPertemuanFrom}
                        onChange={(e) => setJExpPertemuanFrom(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        {Array.from({ length: 32 }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            Pertemuan Ke-{p}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        Sampai Pertemuan Ke-
                      </label>
                      <select
                        value={jExpPertemuanTo}
                        onChange={(e) => setJExpPertemuanTo(parseInt(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        {Array.from({ length: 32 }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            Pertemuan Ke-{p}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Filter Materi Pembelajaran */}
              <div className="bg-slate-50/70 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    <span>Filter Materi Pokok / Topik Pembelajaran</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {jExpMateriMode === 'ALL'
                      ? 'Semua Materi'
                      : jExpMateriMode === 'KEYWORD'
                      ? `Kata Kunci: "${jExpMateriKeyword || '-'}"`
                      : `Topik Terpilih: "${jExpSelectedMateri || '-'}"`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setJExpMateriMode('ALL')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpMateriMode === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Semua Materi
                  </button>
                  <button
                    type="button"
                    onClick={() => setJExpMateriMode('KEYWORD')}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpMateriMode === 'KEYWORD'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cari Kata Kunci
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJExpMateriMode('SELECT');
                      if (!jExpSelectedMateri && distinctMaterials.length > 0) {
                        setJExpSelectedMateri(distinctMaterials[0]);
                      }
                    }}
                    className={`py-1.5 text-[11px] font-bold rounded-lg transition ${
                      jExpMateriMode === 'SELECT'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Pilih Dari Daftar
                  </button>
                </div>

                {jExpMateriMode === 'KEYWORD' && (
                  <div className="relative pt-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      placeholder="Ketik topik materi, kompetensi dasar, atau kata kunci..."
                      value={jExpMateriKeyword}
                      onChange={(e) => setJExpMateriKeyword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                    />
                  </div>
                )}

                {jExpMateriMode === 'SELECT' && (
                  <div className="pt-1">
                    {distinctMaterials.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic p-2 bg-white rounded-xl border border-slate-200">
                        Belum ada topik materi yang tersimpan di bank data jurnal.
                      </p>
                    ) : (
                      <select
                        value={jExpSelectedMateri}
                        onChange={(e) => setJExpSelectedMateri(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-800"
                      >
                        {distinctMaterials.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Section 5: Live Matched Sessions Counter & Preview */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-xs">
                      Hasil Sesi KBM yang Cocok:
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-black text-xs">
                    {matchingExportJournals.length} Sesi Terfilter
                  </span>
                </div>

                {matchingExportJournals.length === 0 ? (
                  <p className="text-[11px] text-amber-800 font-semibold bg-amber-50 p-2 rounded-xl border border-amber-200">
                    ⚠️ Tidak ditemukan sesi jurnal yang cocok dengan kombinasi filter di atas. Ubah filter untuk melanjutkan.
                  </p>
                ) : (
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {matchingExportJournals.map((j) => (
                      <div
                        key={j.id}
                        className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-emerald-100 text-[11px]"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[9px] shrink-0">
                            P{j.pertemuanKe}
                          </span>
                          <span className="font-bold text-slate-800 truncate">
                            {j.materiPokok}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            ({j.tanggal} • Kelas {j.kelas})
                          </span>
                        </div>
                        <span className="text-emerald-700 font-extrabold text-[10px] shrink-0">
                          {j.persentaseKehadiran}% Hadir
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setJExpClass('ALL');
                  setJExpMapel(teacherMapelList[0] || OFFICIAL_SUBJECTS[0]);
                  setJExpDateMode('ALL');
                  setJExpPertemuanMode('ALL');
                  setJExpMateriMode('ALL');
                  setJExpMateriKeyword('');
                  setJExpSelectedMateri('');
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJournalExportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleExecuteJournalPdfExport}
                  disabled={isExportingPdf || matchingExportJournals.length === 0}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-black transition flex items-center gap-2 shadow-md cursor-pointer disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {isExportingPdf
                      ? 'Memproses PDF...'
                      : `Unduh Rekap PDF (${matchingExportJournals.length} Sesi)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL INPUT IZIN / SAKIT SISWA ===== */}
      {showIzinModal && targetStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  Catat Izin / Sakit Siswa
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIzinModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <img
                src={targetStudent.fotoUrl}
                alt={targetStudent.nama}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div>
                <p className="font-extrabold text-xs text-slate-900">
                  {targetStudent.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  NISN: {targetStudent.nisn} • Kelas {targetStudent.kelas}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveIzin} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Pilih Status Keterangan
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIzinStatus('Izin')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      izinStatus === 'Izin'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Izin
                  </button>
                  <button
                    type="button"
                    onClick={() => setIzinStatus('Sakit')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      izinStatus === 'Sakit'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Sakit
                  </button>
                  <button
                    type="button"
                    onClick={() => setIzinStatus('Alpa')}
                    className={`py-2 px-3 rounded-xl font-bold border transition text-center cursor-pointer ${
                      izinStatus === 'Alpa'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Alpa
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Catatan / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Ada surat dokter / izin urusan keluarga"
                  value={izinKeterangan}
                  onChange={(e) => setIzinKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIzinModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL EDIT / KOREKSI PRESENSI MANUAL ===== */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900">
                  {editingRecord ? 'Koreksi Data Presensi' : 'Input Presensi Manual'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-3">
              <img
                src={editingStudent.fotoUrl}
                alt={editingStudent.nama}
                className="w-10 h-10 rounded-full object-cover border border-slate-200"
              />
              <div>
                <p className="font-extrabold text-xs text-slate-900">
                  {editingStudent.nama}
                </p>
                <p className="text-[10px] text-slate-500 font-mono">
                  NISN: {editingStudent.nisn} • Kelas {editingStudent.kelas}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Waktu (Jam:Menit:Detik)
                  </label>
                  <input
                    type="text"
                    required
                    value={editWaktu}
                    onChange={(e) => setEditWaktu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Status Kehadiran
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                >
                  <option value="Hadir Tepat Waktu">Hadir Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Alpa">Alpa</option>
                  <option value="Pulang Tepat Waktu">Pulang Tepat Waktu</option>
                  <option value="Pulang Mendahului">Pulang Mendahului</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Surat dokter / ada dispensasi"
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {editingRecord ? (
                  <button
                    type="button"
                    onClick={handleDeleteRecord}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Hapus
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Profile & Photo Edit Modal */}
      {showProfileModal && (
        <ProfileEditModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          mode="TEACHER"
          teacher={teacher}
          config={config}
          onSaveTeacher={onUpdateTeacherProfile}
          onShowNotice={onShowNotice}
        />
      )}

      {/* Student Profile Modal */}
      {selectedDetailStudent && (
        <StudentDetailModal
          student={selectedDetailStudent}
          attendance={attendance}
          config={config}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDetailStudent(null);
          }}
          teachers={teacher ? [teacher] : []}
        />
      )}

      {/* QR Scanner Modal for KBM attendance */}
      {showQRScanner && (
        <TeacherQRScannerModal
          isOpen={showQRScanner}
          onClose={() => setShowQRScanner(false)}
          students={students}
          selectedClass={selectedClass}
          selectedDate={selectedDate}
          selectedMapel={selectedMapel}
          pertemuanKe={pertemuanKe}
          materiPokok={materiPokok}
          attendance={attendance}
          onRecordAttendance={onRecordAttendance}
          onShowNotice={onShowNotice}
        />
      )}
    </div>
  );
};
