import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  Users,
  Eye,
  Trash2,
  Download,
  FileText,
  Sparkles,
  BarChart3,
  TrendingUp,
  XCircle,
  HelpCircle,
  ChevronRight,
  Layers,
  ArrowRight,
  ClipboardList,
  Edit3,
  Phone,
  MessageSquare,
  UserCheck,
  Award,
  ExternalLink,
  X,
  Zap,
  Check,
  UserPlus,
  RefreshCw,
  Send,
  FileCheck2,
  Star,
  CheckCheck,
  AlertCircle,
  Share2,
  Radio,
  Sliders,
  Sparkle,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  TeachingJournal,
  AttendanceSession,
} from '../types';
import { OFFICIAL_SUBJECTS } from '../constants/subjects';
import {
  exportTeacherDailyPDF,
  exportTeacherJournalBookPDF,
  exportAdminSupervisionReportPDF,
  exportAssistedTeachingSlipPDF,
  exportAcademicSupervisionRubricPDF,
  exportCurriculumTargetProgressPDF,
} from '../utils/teacherExportPdf';
import { TeacherPortalView } from './TeacherPortalView';

interface AdminKbmSupervisionViewProps {
  teachers: TeacherUser[];
  students: Student[];
  attendance: AttendanceRecord[];
  journals: TeachingJournal[];
  config: SchoolConfig;
  activeSession: AttendanceSession;
  timeString: string;
  dateString: string;
  dayKey: string;
  onRecordAttendance: (record: AttendanceRecord) => Promise<boolean>;
  onDeleteAttendance?: (id: string) => Promise<void>;
  onSaveJournal?: (journal: TeachingJournal, attendanceBatch?: AttendanceRecord[]) => Promise<void>;
  onDeleteJournal?: (id: string) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

type SupervisionTab = 'OVERVIEW' | 'JOURNALS' | 'CURRICULUM_MATRIX' | 'ATTENDANCE' | 'REPORTS' | 'ASSISTANCE';
type AssistanceWorkflow = 'QUICK_FORM' | 'FULL_PORTAL';

const ASSISTANCE_REASONS = [
  'Guru Berhalangan Sakit',
  'Guru Izin / Dinas Luar',
  'Guru Pengganti / Penugasan Piket',
  'Kendala Perangkat / Device Guru',
  'Entri Data Terlambat / Rekap Manual',
];

const QUICK_MATERI_TEMPLATES = [
  'Penyampaian Materi Bab Baru & Tanya Jawab',
  'Diskusi Kelompok & Presentasi Tugas',
  'Latihan Soal & Penilaian Harian (PH)',
  'Remedial & Pengayaan Pembelajaran',
  'Praktik Keterampilan / Lembar Kerja Siswa (LKS)',
  'Review & Pendalaman Materi Ujian',
];

const JAM_PELAJARAN_OPTIONS = [
  'Jam Ke 1-2 (07:30 - 08:50)',
  'Jam Ke 3-4 (08:50 - 10:10)',
  'Jam Ke 5-6 (10:30 - 11:50)',
  'Jam Ke 7-8 (12:30 - 13:50)',
  'Jam Ke 1-4 (Blok Pagi)',
  'Jam Ke 5-8 (Blok Siang)',
];

const SUPERVISION_FEEDBACK_PRESETS = [
  'Pembelajaran berjalan tertib, interaktif, dan sesuai dengan alur RPP/silabus.',
  'Sangat baik dalam penguasaan konsep, siswa antusias berpartisipasi aktif.',
  'Pemanfaatan media & lembar kerja siswa sudah sangat tepat sasaran.',
  'Pertahankan keterlibatan siswa dan ketepatan alokasi waktu sesi KBM.',
  'Perlu peningkatan pengawasan disiplin pada kelompok belajar di baris belakang.',
];

export const AdminKbmSupervisionView: React.FC<AdminKbmSupervisionViewProps> = ({
  teachers,
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
  onShowNotice,
  onShowConfirm,
}) => {
  const [activeTab, setActiveTab] = useState<SupervisionTab>('OVERVIEW');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('ALL');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedVerificationStatus, setSelectedVerificationStatus] = useState<string>('ALL');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [detailJournal, setDetailJournal] = useState<TeachingJournal | null>(null);
  const [selectedTeacherModal, setSelectedTeacherModal] = useState<TeacherUser | null>(null);

  // Supervision Assessment / Scoring Modal
  const [supervisingJournal, setSupervisingJournal] = useState<TeachingJournal | null>(null);
  const [rubricMastery, setRubricMastery] = useState<number>(5);
  const [rubricClassroom, setRubricClassroom] = useState<number>(5);
  const [rubricPedagogy, setRubricPedagogy] = useState<number>(5);
  const [rubricDiscipline, setRubricDiscipline] = useState<number>(5);
  const [supervisorNotes, setSupervisorNotes] = useState<string>('');
  const [supervisionStatusChoice, setSupervisionStatusChoice] = useState<'VERIFIED' | 'REVISION_NEEDED' | 'PENDING'>('VERIFIED');
  const [supervisorName, setSupervisorName] = useState<string>('Tim Supervisi Kurikulum');
  const [isSavingSupervision, setIsSavingSupervision] = useState<boolean>(false);

  // Bulk Selection State for Journals
  const [selectedJournalIds, setSelectedJournalIds] = useState<string[]>([]);

  // ==========================================
  // STATE FOR ENHANCED ASSISTANCE MODE
  // ==========================================
  const [assistanceTeacherId, setAssistanceTeacherId] = useState<string>(() => teachers[0]?.id || '');
  const [assistanceWorkflow, setAssistanceWorkflow] = useState<AssistanceWorkflow>('QUICK_FORM');
  const [assistanceReason, setAssistanceReason] = useState<string>(ASSISTANCE_REASONS[0]);
  const [assistanceOfficerName, setAssistanceOfficerName] = useState<string>('Petugas Piket / Admin');
  const [assistanceTeacherSearch, setAssistanceTeacherSearch] = useState<string>('');
  const [assistanceFilterStatus, setAssistanceFilterStatus] = useState<'ALL' | 'UNFILLED' | 'FILLED'>('ALL');

  // Quick form state
  const [quickClass, setQuickClass] = useState<string>('');
  const [quickSubject, setQuickSubject] = useState<string>('');
  const [quickJam, setQuickJam] = useState<string>(JAM_PELAJARAN_OPTIONS[0]);
  const [quickMateri, setQuickMateri] = useState<string>('');
  const [quickKegiatan, setQuickKegiatan] = useState<string>('');
  const [quickRefleksi, setQuickRefleksi] = useState<string>('');
  const [quickStudentStatuses, setQuickStudentStatuses] = useState<Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA'>>({});
  const [isSubmittingQuickForm, setIsSubmittingQuickForm] = useState(false);

  // Keep assistanceTeacherId synced with available teachers
  React.useEffect(() => {
    if ((!assistanceTeacherId || !teachers.some((t) => t.id === assistanceTeacherId)) && teachers.length > 0) {
      setAssistanceTeacherId(teachers[0].id);
    }
  }, [teachers, assistanceTeacherId]);

  // Extract classes list
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();
  }, [students]);

  // Keep quickClass in sync with available classes
  React.useEffect(() => {
    if (classes.length > 0 && (!quickClass || !classes.includes(quickClass))) {
      setQuickClass(classes[0]);
    }
  }, [classes, quickClass]);

  // Extract distinct subjects list
  const subjectsList = OFFICIAL_SUBJECTS;

  // Journals created on the selected date
  const todayJournals = useMemo(() => {
    return journals.filter((j) => j.tanggal === selectedDate);
  }, [journals, selectedDate]);

  // Teachers who submitted journals on the selected date
  const teachersWithJournalToday = useMemo(() => {
    const ids = new Set(todayJournals.map((j) => j.guruId || j.guruNama));
    return ids;
  }, [todayJournals]);

  // Active teachers count
  const activeTeachers = useMemo(() => {
    return teachers.filter((t) => t.status === 'AKTIF');
  }, [teachers]);

  // Teachers who haven't filled journals today
  const teachersNotFilledToday = useMemo(() => {
    return activeTeachers.filter(
      (t) => !teachersWithJournalToday.has(t.id) && !teachersWithJournalToday.has(t.nama)
    );
  }, [activeTeachers, teachersWithJournalToday]);

  // Filtered Journals List
  const filteredJournals = useMemo(() => {
    return journals.filter((j) => {
      const matchTeacher =
        selectedTeacherId === 'ALL' ||
        j.guruId === selectedTeacherId ||
        j.guruNama === selectedTeacherId;
      const matchClass = selectedClass === 'ALL' || j.kelas === selectedClass;
      const matchSubject = selectedSubject === 'ALL' || j.mapel === selectedSubject;
      const matchStatus =
        selectedVerificationStatus === 'ALL' ||
        (selectedVerificationStatus === 'VERIFIED' && j.supervisionStatus === 'VERIFIED') ||
        (selectedVerificationStatus === 'REVISION_NEEDED' && j.supervisionStatus === 'REVISION_NEEDED') ||
        (selectedVerificationStatus === 'PENDING' && (!j.supervisionStatus || j.supervisionStatus === 'PENDING'));
      const matchDate = !selectedDate || j.tanggal === selectedDate;
      const matchQuery =
        !searchQuery.trim() ||
        (j.guruNama && j.guruNama.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (j.mapel && j.mapel.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (j.materiPokok && j.materiPokok.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (j.kegiatanPembelajaran && j.kegiatanPembelajaran.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchTeacher && matchClass && matchSubject && matchStatus && matchDate && matchQuery;
    });
  }, [journals, selectedTeacherId, selectedClass, selectedSubject, selectedVerificationStatus, selectedDate, searchQuery]);

  // Filtered KBM Attendance Records (Category KELAS)
  const kbmAttendanceRecords = useMemo(() => {
    return attendance.filter((a) => {
      const isKelas = a.kategori === 'KELAS';
      if (!isKelas) return false;

      const matchClass = selectedClass === 'ALL' || a.kelas === selectedClass;
      const matchDate = !selectedDate || a.tanggal === selectedDate;
      const matchSubject = selectedSubject === 'ALL' || a.mapel === selectedSubject;

      return matchClass && matchDate && matchSubject;
    });
  }, [attendance, selectedClass, selectedDate, selectedSubject]);

  // Teacher compliance statistics
  const complianceRate = useMemo(() => {
    if (activeTeachers.length === 0) return 0;
    const submittedCount = activeTeachers.filter(
      (t) => teachersWithJournalToday.has(t.id) || teachersWithJournalToday.has(t.nama)
    ).length;
    return Math.round((submittedCount / activeTeachers.length) * 100);
  }, [activeTeachers, teachersWithJournalToday]);

  // Total teaching hours/sessions taught by selected modal teacher
  const selectedTeacherJournals = useMemo(() => {
    if (!selectedTeacherModal) return [];
    return journals.filter(
      (j) => j.guruId === selectedTeacherModal.id || j.guruNama === selectedTeacherModal.nama
    );
  }, [selectedTeacherModal, journals]);

  // Distinct classes taught by selected modal teacher
  const selectedTeacherClasses = useMemo(() => {
    return Array.from(new Set(selectedTeacherJournals.map((j) => j.kelas))).sort();
  }, [selectedTeacherJournals]);

  // Find target teacher for assistance mode
  const currentAssistanceTeacher = useMemo(() => {
    const target = teachers.find((t) => t.id === assistanceTeacherId) || teachers[0] || null;
    return target;
  }, [assistanceTeacherId, teachers]);

  // Sync quick subject when assistance teacher changes
  React.useEffect(() => {
    if (currentAssistanceTeacher) {
      setQuickSubject(currentAssistanceTeacher.mapel || OFFICIAL_SUBJECTS[0]);
    }
  }, [currentAssistanceTeacher]);

  // Students in selected quick class
  const quickClassStudents = useMemo(() => {
    return students.filter((s) => s.kelas === quickClass);
  }, [students, quickClass]);

  // Initialize or reset quick student statuses when quick class changes
  React.useEffect(() => {
    const initialStatuses: Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA'> = {};
    quickClassStudents.forEach((s) => {
      initialStatuses[s.nisn] = 'HADIR';
    });
    setQuickStudentStatuses(initialStatuses);
  }, [quickClass, quickClassStudents.length]);

  // Auto-calculated Pertemuan Ke for quick form
  const computedQuickPertemuan = useMemo(() => {
    if (!currentAssistanceTeacher) return 1;
    const existing = journals.filter(
      (j) =>
        (j.guruId === currentAssistanceTeacher.id || j.guruNama === currentAssistanceTeacher.nama) &&
        j.kelas === quickClass &&
        j.mapel === quickSubject
    );
    return existing.length + 1;
  }, [currentAssistanceTeacher, quickClass, quickSubject, journals]);

  // Filtered teachers list for the assistance picker
  const filteredAssistanceTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const matchSearch =
        !assistanceTeacherSearch.trim() ||
        t.nama.toLowerCase().includes(assistanceTeacherSearch.toLowerCase()) ||
        t.mapel.toLowerCase().includes(assistanceTeacherSearch.toLowerCase()) ||
        (t.nip && t.nip.includes(assistanceTeacherSearch));

      const hasFilled = teachersWithJournalToday.has(t.id) || teachersWithJournalToday.has(t.nama);
      const matchStatus =
        assistanceFilterStatus === 'ALL' ||
        (assistanceFilterStatus === 'UNFILLED' && !hasFilled) ||
        (assistanceFilterStatus === 'FILLED' && hasFilled);

      return matchSearch && matchStatus;
    });
  }, [teachers, assistanceTeacherSearch, assistanceFilterStatus, teachersWithJournalToday]);

  // Quick form student attendance counts
  const quickAttendanceCounts = useMemo(() => {
    let hadir = 0;
    let sakit = 0;
    let izin = 0;
    let alpa = 0;

    quickClassStudents.forEach((s) => {
      const st = quickStudentStatuses[s.nisn] || 'HADIR';
      if (st === 'HADIR') hadir++;
      else if (st === 'SAKIT') sakit++;
      else if (st === 'IZIN') izin++;
      else if (st === 'ALPA') alpa++;
    });

    return {
      total: quickClassStudents.length,
      hadir,
      sakit,
      izin,
      alpa,
    };
  }, [quickClassStudents, quickStudentStatuses]);

  // Open Supervision Modal for a Journal
  const handleOpenSupervisionModal = (j: TeachingJournal) => {
    setSupervisingJournal(j);
    setRubricMastery(j.supervisionRubric?.mastery || 5);
    setRubricClassroom(j.supervisionRubric?.classroomMgmt || 5);
    setRubricPedagogy(j.supervisionRubric?.pedagogy || 5);
    setRubricDiscipline(j.supervisionRubric?.discipline || 5);
    setSupervisorNotes(j.supervisorNotes || '');
    setSupervisionStatusChoice(j.supervisionStatus || 'VERIFIED');
  };

  // Save Supervision Assessment
  const handleSaveSupervisionAssessment = async (andPrintPDF = false) => {
    if (!supervisingJournal) return;
    setIsSavingSupervision(true);

    try {
      const calculatedScore = Math.round(
        ((rubricMastery + rubricClassroom + rubricPedagogy + rubricDiscipline) / 20) * 100
      );

      const updatedJournal: TeachingJournal = {
        ...supervisingJournal,
        supervisionStatus: supervisionStatusChoice,
        supervisionScore: calculatedScore,
        supervisionRubric: {
          mastery: rubricMastery,
          classroomMgmt: rubricClassroom,
          pedagogy: rubricPedagogy,
          discipline: rubricDiscipline,
        },
        supervisorNotes: supervisorNotes.trim() || undefined,
        verifiedBy: supervisorName,
        verifiedAt: new Date().toISOString(),
      };

      if (onSaveJournal) {
        await onSaveJournal(updatedJournal);
      }

      onShowNotice(
        'Supervisi KBM Disimpan',
        `Hasil evaluasi supervisi KBM ${updatedJournal.guruNama} (Skor: ${calculatedScore}/100) berhasil diverifikasi.`,
        'success'
      );

      if (andPrintPDF) {
        const teacherObj = teachers.find(
          (t) => t.id === updatedJournal.guruId || t.nama === updatedJournal.guruNama
        ) || {
          id: updatedJournal.guruId,
          nama: updatedJournal.guruNama,
          nip: updatedJournal.guruNip || '-',
          username: 'guru',
          password: '',
          mapel: updatedJournal.mapel,
          status: 'AKTIF',
          createdAt: new Date().toISOString(),
        };

        await exportAcademicSupervisionRubricPDF(config, teacherObj, updatedJournal, supervisorName);
      }

      setSupervisingJournal(null);
    } catch (err: any) {
      onShowNotice('Gagal Menyimpan', err.message || 'Terjadi kesalahan.', 'warning');
    } finally {
      setIsSavingSupervision(false);
    }
  };

  // Bulk Verification of Selected Journals
  const handleBulkVerifyJournals = async () => {
    if (selectedJournalIds.length === 0) {
      onShowNotice('Pilih Jurnal', 'Pilih minimal satu jurnal untuk diverifikasi massal.', 'warning');
      return;
    }

    onShowConfirm(
      'Verifikasi Massal Jurnal',
      `Apakah Anda yakin ingin memverifikasi & menyetujui ${selectedJournalIds.length} jurnal mengajar terpilih?`,
      async () => {
        try {
          const nowIso = new Date().toISOString();
          for (const id of selectedJournalIds) {
            const targetJ = journals.find((j) => j.id === id);
            if (targetJ && onSaveJournal) {
              await onSaveJournal({
                ...targetJ,
                supervisionStatus: 'VERIFIED',
                verifiedBy: 'Tim Supervisi Kurikulum',
                verifiedAt: nowIso,
              });
            }
          }
          setSelectedJournalIds([]);
          onShowNotice('Verifikasi Selesai', `${selectedJournalIds.length} jurnal KBM telah disetujui.`, 'success');
        } catch (err: any) {
          onShowNotice('Gagal Verifikasi', err.message, 'warning');
        }
      }
    );
  };

  // Broadcast WhatsApp Reminder to Teachers who haven't filled
  const handleSendWaReminder = (teacher: TeacherUser) => {
    const phone = (teacher.noHp || '').replace(/\D/g, '');
    if (!phone) {
      onShowNotice('Nomor WA Kosong', `Data nomor HP/WA untuk ${teacher.nama} belum terdaftar.`, 'warning');
      return;
    }

    const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone.startsWith('62') ? phone : '62' + phone;
    const greeting = 'Assalamu’alaikum Wr. Wb. / Selamat Pagi/Siang Bapak/Ibu ';
    const textMsg = `${greeting}${teacher.nama},\n\nMengingatkan dari Tim Kurikulum &amp; Piket ${config.namaSekolah}, mohon untuk segera melengkapi Presensi Siswa &amp; Jurnal Mengajar KBM Hari Ini (${selectedDate}).\n\nTerima kasih atas dedikasi dan kerjasamanya.\n\n_E-Presensi & Supervisi Akademik ${config.namaSekolah}_`;

    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(textMsg)}`;
    window.open(waUrl, '_blank');
  };

  // Submit Quick Assisted KBM Entry
  const handleSaveQuickAssistance = async (andPrintSlip = false) => {
    if (!currentAssistanceTeacher) {
      onShowNotice('Pilih Guru', 'Pilih guru pengampu terlebih dahulu.', 'warning');
      return;
    }

    if (!quickMateri.trim()) {
      onShowNotice('Materi Wajib Diisi', 'Silakan masukkan materi pokok pembelajaran kelas.', 'warning');
      return;
    }

    if (quickClassStudents.length === 0) {
      onShowNotice('Data Siswa Kosong', `Tidak ditemukan siswa terdaftar di Kelas ${quickClass || '-'}. Pastikan data siswa telah diinput.`, 'warning');
      return;
    }

    setIsSubmittingQuickForm(true);

    try {
      const now = new Date();
      const journalId = `jrn-${Date.now()}`;
      const auditNote = `[Diinput via Mode Asistensi: ${assistanceReason || 'Bantuan Piket'} oleh ${assistanceOfficerName || 'Petugas'} pada ${selectedDate} ${timeString || ''}]`;
      const combinedRefleksi = quickRefleksi.trim()
        ? `${quickRefleksi.trim()}\n${auditNote}`
        : auditNote;

      const subjectName = quickSubject || currentAssistanceTeacher.mapel || OFFICIAL_SUBJECTS[0];

      const newJournal: TeachingJournal = {
        id: journalId,
        guruId: currentAssistanceTeacher.id,
        guruNama: currentAssistanceTeacher.nama,
        guruNip: currentAssistanceTeacher.nip || '-',
        kelas: quickClass,
        mapel: subjectName,
        tanggal: selectedDate,
        pertemuanKe: computedQuickPertemuan,
        jamPelajaran: quickJam || JAM_PELAJARAN_OPTIONS[0],
        materiPokok: quickMateri.trim(),
        kegiatanPembelajaran: quickKegiatan.trim() || '',
        catatanRefleksi: combinedRefleksi,
        totalSiswa: quickAttendanceCounts.total,
        hadir: quickAttendanceCounts.hadir,
        terlambat: 0,
        izin: quickAttendanceCounts.izin,
        sakit: quickAttendanceCounts.sakit,
        alpa: quickAttendanceCounts.alpa,
        persentaseKehadiran: quickAttendanceCounts.total > 0
          ? Math.round((quickAttendanceCounts.hadir / quickAttendanceCounts.total) * 100)
          : 100,
        supervisionStatus: 'VERIFIED',
        verifiedBy: `Asistensi: ${assistanceOfficerName || 'Petugas Piket'}`,
        verifiedAt: now.toISOString(),
        createdAt: now.toISOString(),
      };

      // Create attendance batch records
      const attendanceBatch: AttendanceRecord[] = quickClassStudents.map((s, idx) => {
        const st = quickStudentStatuses[s.nisn] || 'HADIR';
        return {
          id: `att-kbm-${journalId}-${s.nisn}-${idx}`,
          tanggal: selectedDate,
          waktu: timeString || '08:00',
          nisn: s.nisn,
          nama: s.nama,
          kelas: quickClass,
          sesi: activeSession || 'Pagi',
          status: st === 'HADIR' ? 'Hadir Tepat Waktu' : st === 'SAKIT' ? 'Sakit' : st === 'IZIN' ? 'Izin' : 'Alpa',
          kategori: 'KELAS',
          mapel: subjectName,
          pertemuanKe: computedQuickPertemuan,
          materiPokok: quickMateri.trim(),
          guruId: currentAssistanceTeacher.id,
          guruNama: currentAssistanceTeacher.nama,
        };
      });

      if (onSaveJournal) {
        await onSaveJournal(newJournal, attendanceBatch);
      }

      onShowNotice(
        'KBM Berhasil Disimpan',
        `Jurnal KBM ${currentAssistanceTeacher.nama} kelas ${quickClass} berhasil disimpan ke database.`,
        'success'
      );

      // Print slip if requested
      if (andPrintSlip) {
        await exportAssistedTeachingSlipPDF(
          config,
          currentAssistanceTeacher,
          newJournal,
          assistanceReason,
          assistanceOfficerName
        );
      }

      // Reset form
      setQuickMateri('');
      setQuickKegiatan('');
      setQuickRefleksi('');
    } catch (err: any) {
      onShowNotice('Gagal Menyimpan', err.message || 'Terjadi kesalahan saat menyimpan data asistensi.', 'warning');
    } finally {
      setIsSubmittingQuickForm(false);
    }
  };

  // Export Official Supervision Report PDF (Kop & Logo)
  const handleExportSupervisionPDF = async () => {
    if (filteredJournals.length === 0) {
      onShowNotice('Data Kosong', 'Tidak ada data jurnal yang sesuai filter saat ini untuk dicetak.', 'warning');
      return;
    }

    try {
      const teacherObj = selectedTeacherId !== 'ALL' ? teachers.find((t) => t.id === selectedTeacherId) : undefined;
      await exportAdminSupervisionReportPDF(config, filteredJournals, {
        dateFilter: selectedDate || undefined,
        teacherFilterName: teacherObj ? teacherObj.nama : selectedTeacherId !== 'ALL' ? selectedTeacherId : undefined,
        classFilter: selectedClass !== 'ALL' ? selectedClass : undefined,
        subjectFilter: selectedSubject !== 'ALL' ? selectedSubject : undefined,
        totalTeachersCount: teachers.length,
        activeTeachersCount: activeTeachers.length,
      });
      onShowNotice('PDF Resmi Siap', 'Laporan hasil supervisi KBM guru berhasil diunduh dengan kop & logo resmi.', 'success');
    } catch (err: any) {
      onShowNotice('Gagal Cetak PDF', err.message || 'Terjadi kesalahan saat membuat dokumen PDF.', 'warning');
    }
  };

  // Export Curriculum Target Matrix PDF
  const handleExportCurriculumMatrixPDF = async () => {
    try {
      await exportCurriculumTargetProgressPDF(config, teachers, journals, 18);
      onShowNotice('PDF Matriks Siap', 'Dokumen matriks kemajuan target kurikulum semester berhasil diunduh.', 'success');
    } catch (err: any) {
      onShowNotice('Gagal Cetak PDF', err.message || 'Terjadi kesalahan.', 'warning');
    }
  };

  // Export Filtered Journals to Excel
  const handleExportExcel = () => {
    if (filteredJournals.length === 0) {
      onShowNotice('Data Kosong', 'Tidak ada log jurnal mengajar yang sesuai filter untuk diekspor.', 'warning');
      return;
    }

    const rows = [
      ['LAPORAN SUPERVISI & AUDIT KBM GURU - E-PRESENSI'],
      [config.namaSekolah],
      [`Tanggal Supervisi: ${selectedDate || 'Semua Tanggal'}`],
      [`Total Jurnal: ${filteredJournals.length}`],
      [],
      [
        'NO',
        'TANGGAL',
        'GURU PENGAMPU',
        'MATA PELAJARAN',
        'KELAS',
        'JAM KE / WAKTU',
        'PERTEMUAN KE',
        'MATERI POKOK',
        'KEGIATAN PEMBELAJARAN',
        'CATATAN / REFLEKSI',
        'STATUS SUPERVISI',
        'SKOR SUPERVISI',
        'SISWA HADIR',
        'SAKIT',
        'IZIN',
        'ALFA',
      ],
    ];

    filteredJournals.forEach((j, idx) => {
      rows.push([
        String(idx + 1),
        j.tanggal,
        j.guruNama,
        j.mapel,
        j.kelas,
        j.jamPelajaran || '-',
        String(j.pertemuanKe || 1),
        j.materiPokok,
        j.kegiatanPembelajaran || '-',
        j.catatanRefleksi || '-',
        j.supervisionStatus || 'PENDING',
        j.supervisionScore ? `${j.supervisionScore}/100` : '-',
        String(j.hadir ?? '-'),
        String(j.sakit ?? '-'),
        String(j.izin ?? '-'),
        String(j.alpa ?? '-'),
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'SUPERVISI_KBM');
    XLSX.writeFile(
      wb,
      `Supervisi_KBM_Guru_${config.namaSekolah.replace(/\s+/g, '_')}_${selectedDate || 'Semua'}.xlsx`
    );
    onShowNotice('Ekspor Berhasil', 'Berkas Excel hasil supervisi KBM guru berhasil diunduh.', 'success');
  };

  // Delete Journal
  const handleDeleteJournal = (j: TeachingJournal) => {
    onShowConfirm(
      'Hapus Log Jurnal KBM',
      `Apakah Anda yakin ingin menghapus catatan jurnal KBM "${j.materiPokok}" kelas ${j.kelas} oleh ${j.guruNama}?`,
      async () => {
        try {
          if (onDeleteJournal) {
            await onDeleteJournal(j.id);
            onShowNotice('Jurnal Dihapus', 'Catatan jurnal KBM guru berhasil dihapus dari database.', 'info');
          }
        } catch (err: any) {
          onShowNotice('Gagal Menghapus', err.message, 'warning');
        }
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Academic Supervisor Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Executive Controller &amp; Academic Supervisor Console</span>
              </span>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full font-bold text-[10px] flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                <span>Live Audit KBM Aktif</span>
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Supervisi Akademik, Presensi &amp; Jurnal Guru</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Pusat komando pengawasan KBM terpadu. Verifikasi jurnal materi harian, lakukan evaluasi rubrik supervisi pembelajaran kelas, pantau target silabus semester, serta terbitkan dokumen resmi ber-kop surat dan logo sekolah.
            </p>
          </div>

          {/* Quick Date Control & Fast Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center shrink-0">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-2 rounded-2xl border border-white/15">
              <Calendar className="w-4 h-4 text-blue-300" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-xs font-bold focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={handleExportSupervisionPDF}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition cursor-pointer"
              title="Download Laporan PDF Resmi dengan Kop Surat & Logo"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan Supervisi (PDF)</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation for Supervisor Console */}
        <div className="flex flex-wrap gap-1.5 pt-5 mt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('OVERVIEW')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'OVERVIEW'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Dashboard &amp; Kepatuhan Guru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('JOURNALS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'JOURNALS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Audit &amp; Verifikasi Jurnal ({filteredJournals.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CURRICULUM_MATRIX')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'CURRICULUM_MATRIX'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Matriks Target Kurikulum (Semester)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ATTENDANCE'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>Presensi Siswa di KBM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('REPORTS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'REPORTS'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Dokumen &amp; Buku Jurnal Guru</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ASSISTANCE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'ASSISTANCE'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md ring-2 ring-amber-300'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30'
            }`}
            title="Bantu input presensi / jurnal jika ada guru yang berhalangan atau sakit"
          >
            <Zap className="w-4 h-4 text-amber-950 fill-amber-950" />
            <span>Mode Asistensi Guru (Piket)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: OVERVIEW & TEACHER COMPLIANCE DASHBOARD */}
      {/* ======================================================== */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Jurnal Hari Ini</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                {todayJournals.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Sesi KBM terinput pada {selectedDate}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Kepatuhan Guru</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2">
                {complianceRate}%
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {teachersWithJournalToday.size} dari {activeTeachers.length} guru aktif mengisi
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Terverifikasi</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FileCheck2 className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-900 mt-2">
                {journals.filter((j) => j.supervisionStatus === 'VERIFIED').length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Jurnal disetujui kurikulum</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Belum Mengisi Hari Ini</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
                {teachersNotFilledToday.length}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Guru belum input jurnal harian</p>
            </div>
          </div>

          {/* Alert Box for Pending Teachers with WhatsApp Broadcast */}
          {teachersNotFilledToday.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-amber-950">
                      Peringatan Pengisian Jurnal Mengajar ({teachersNotFilledToday.length} Guru Belum Mengisi)
                    </h4>
                    <p className="text-xs text-amber-800/90 mt-0.5 max-w-2xl">
                      Terdapat {teachersNotFilledToday.length} guru pengampu yang belum merekam presensi atau jurnal KBM pada tanggal <b>{selectedDate}</b>. Anda dapat mengirimkan pengingat WhatsApp instan ke masing-masing guru.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('ASSISTANCE')}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Bantu Input (Piket)</span>
                  </button>
                </div>
              </div>

              {/* Quick Teacher WhatsApp Tags */}
              <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap gap-2">
                {teachersNotFilledToday.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleSendWaReminder(t)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-100/80 border border-amber-300 text-amber-950 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs group cursor-pointer"
                    title={`Kirim Pengingat WhatsApp ke ${t.nama}`}
                  >
                    <Phone className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition" />
                    <span>{t.nama}</span>
                    <span className="text-[10px] text-amber-700">({t.mapel})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Daily Compliance Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Status Kepatuhan Jurnal &amp; Aktivitas Mengajar Guru
                </h3>
                <p className="text-xs text-slate-500">
                  Klik kartu profil guru untuk melihat detail data guru, riwayat portofolio mengajar, dan buku jurnal.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Hari Ini
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {teachers.map((t) => {
                const teacherJournalsToday = todayJournals.filter(
                  (j) => j.guruId === t.id || j.guruNama === t.nama
                );
                const hasFilled = teacherJournalsToday.length > 0;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTeacherModal(t)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 group ${
                      hasFilled
                        ? 'bg-emerald-50/50 border-emerald-200 hover:border-emerald-300'
                        : t.status === 'NONAKTIF'
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-blue-200 group-hover:scale-105 transition">
                          {t.fotoUrl ? (
                            <img src={t.fotoUrl} alt={t.nama} className="w-full h-full object-cover" />
                          ) : (
                            <span>{t.nama.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 group-hover:text-blue-700 transition truncate flex items-center gap-1">
                            <span>{t.nama}</span>
                            <Eye className="w-3 h-3 text-slate-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition" />
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">{t.mapel}</p>
                          {t.waliKelas && t.waliKelas !== 'Bukan Wali Kelas' && (
                            <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-purple-100 text-purple-800 rounded-md font-bold">
                              Wali {t.waliKelas}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black shrink-0 ${
                            hasFilled
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'NONAKTIF'
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {hasFilled
                            ? `✓ ${teacherJournalsToday.length} Jurnal`
                            : t.status === 'NONAKTIF'
                            ? 'Nonaktif'
                            : 'Belum Mengisi'}
                        </span>

                        {!hasFilled && t.status === 'AKTIF' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWaReminder(t);
                            }}
                            className="text-[9px] px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-md font-bold flex items-center gap-1"
                            title="Kirim WA Pengingat"
                          >
                            <Phone className="w-2.5 h-2.5" />
                            <span>Ingatkan</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {hasFilled && (
                      <div className="mt-3 pt-2.5 border-t border-emerald-100 space-y-1">
                        <p className="text-[10px] font-bold text-emerald-900 line-clamp-1">
                          Materi: <span className="font-normal text-slate-700">{teacherJournalsToday[0].materiPokok}</span>
                        </p>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Kelas: <b>{teacherJournalsToday.map((j) => j.kelas).join(', ')}</b></span>
                          <span className="text-emerald-700 font-bold">{teacherJournalsToday[0].jamPelajaran}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: FULL JOURNAL AUDIT & VERIFICATION */}
      {/* ======================================================== */}
      {activeTab === 'JOURNALS' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Filters & Bulk Action Bar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-600" />
                  <span>Audit, Evaluasi Rubrik &amp; Verifikasi Jurnal KBM</span>
                </h3>

                {selectedJournalIds.length > 0 && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">
                    {selectedJournalIds.length} Terpilih
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedJournalIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkVerifyJournals}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Verifikasi Massal ({selectedJournalIds.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportSupervisionPDF}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak PDF Laporan Resmi</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Ekspor Excel</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <input
                  type="text"
                  placeholder="Cari materi, nama guru..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Teacher Selector */}
              <div>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                >
                  <option value="ALL">Semua Guru ({teachers.length})</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class Selector */}
              <div>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                >
                  <option value="ALL">Semua Kelas</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verification Status Selector */}
              <div>
                <select
                  value={selectedVerificationStatus}
                  onChange={(e) => setSelectedVerificationStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                >
                  <option value="ALL">Semua Status Audit</option>
                  <option value="VERIFIED">Terverifikasi (Disetujui)</option>
                  <option value="PENDING">Menunggu Verifikasi</option>
                  <option value="REVISION_NEEDED">Perlu Revisi</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex gap-1">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                />
                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate('')}
                    className="px-2 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-[10px]"
                    title="Tampilkan semua tanggal"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Journals Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredJournals.length > 0 &&
                          selectedJournalIds.length === filteredJournals.length
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedJournalIds(filteredJournals.map((j) => j.id));
                          } else {
                            setSelectedJournalIds([]);
                          }
                        }}
                        className="rounded-md text-blue-600 cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-4">Guru &amp; Mapel</th>
                    <th className="py-3.5 px-4">Waktu &amp; Kelas</th>
                    <th className="py-3.5 px-4">Materi Pokok &amp; Uraian KBM</th>
                    <th className="py-3.5 px-4 text-center">Status Audit &amp; Nilai</th>
                    <th className="py-3.5 px-4 text-center">Presensi Siswa</th>
                    <th className="py-3.5 px-4 text-right">Aksi Supervisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredJournals.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-bold text-sm text-slate-600">Tidak ada log jurnal mengajar</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Ubah filter di atas atau klik "Reset" pada tanggal untuk menampilkan seluruh data.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredJournals.map((j) => {
                      const teacherObj = teachers.find(
                        (t) => t.id === j.guruId || t.nama === j.guruNama
                      );
                      const isSelected = selectedJournalIds.includes(j.id);
                      const isVerified = j.supervisionStatus === 'VERIFIED';
                      const isRevision = j.supervisionStatus === 'REVISION_NEEDED';

                      return (
                        <tr
                          key={j.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <td className="py-3.5 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedJournalIds((prev) => [...prev, j.id]);
                                } else {
                                  setSelectedJournalIds((prev) => prev.filter((id) => id !== j.id));
                                }
                              }}
                              className="rounded-md text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <div
                              onClick={() => teacherObj && setSelectedTeacherModal(teacherObj)}
                              className="cursor-pointer group inline-block"
                              title="Klik untuk melihat profil & data guru"
                            >
                              <p className="font-extrabold text-slate-900 group-hover:text-blue-600 group-hover:underline flex items-center gap-1">
                                <span>{j.guruNama}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition text-blue-500" />
                              </p>
                              <p className="text-[11px] text-blue-700 font-semibold">{j.mapel}</p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-slate-800">
                              {j.tanggal} • <span className="text-purple-700">Kelas {j.kelas}</span>
                            </p>
                            <p className="text-[10px] text-slate-400">{j.jamPelajaran} (Pertemuan {j.pertemuanKe || 1})</p>
                          </td>
                          <td className="py-3.5 px-4 max-w-xs">
                            <p className="font-extrabold text-slate-900 line-clamp-1">{j.materiPokok}</p>
                            {j.kegiatanPembelajaran && (
                              <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                                {j.kegiatanPembelajaran}
                              </p>
                            )}
                            {j.supervisorNotes && (
                              <p className="text-[10px] text-indigo-700 font-semibold mt-1 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                💡 Catatan: {j.supervisorNotes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isVerified ? (
                              <div className="inline-flex flex-col items-center">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Terverifikasi</span>
                                </span>
                                {j.supervisionScore && (
                                  <span className="text-[10px] font-black text-emerald-700 mt-0.5">
                                    Skor: {j.supervisionScore}/100
                                  </span>
                                )}
                              </div>
                            ) : isRevision ? (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-bold text-[10px] rounded-full flex items-center gap-1 justify-center">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                <span>Perlu Revisi</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-full">
                                Belum Disupervisi
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-xl text-[10px] font-bold">
                              <span className="text-emerald-700">H: {j.hadir ?? '-'}</span>
                              <span className="text-blue-700">S: {j.sakit ?? '-'}</span>
                              <span className="text-amber-700">I: {j.izin ?? '-'}</span>
                              <span className="text-rose-700">A: {j.alpa ?? '-'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenSupervisionModal(j)}
                                className="px-2 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition shadow-2xs cursor-pointer"
                                title="Supervisi & Nilai Rubrik KBM"
                              >
                                <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                                <span>Supervisi</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDetailJournal(j)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                title="Lihat Detail Jurnal"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteJournal(j)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Log Jurnal Ini"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CURRICULUM TARGET & PROGRESS MATRIX (SEMESTER) */}
      {/* ======================================================== */}
      {activeTab === 'CURRICULUM_MATRIX' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <span>Matriks Pencapaian Target Silabus &amp; Kurikulum Semester</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standar kurikulum menetapkan <b>18 Pertemuan Tatap Muka</b> per semester untuk setiap rombongan belajar.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportCurriculumMatrixPDF}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl text-xs font-extrabold shadow-md flex items-center gap-2 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Matriks Semester (PDF Kop &amp; Logo)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teachers.map((t) => {
              const teacherJournalsList = journals.filter(
                (j) => j.guruId === t.id || j.guruNama === t.nama
              );
              const distinctClassesTaught = Array.from(
                new Set(teacherJournalsList.map((j) => j.kelas))
              ).sort();
              const totalMeetings = teacherJournalsList.length;
              const targetMeetings = 18;
              const progressPct = Math.min(100, Math.round((totalMeetings / targetMeetings) * 100));

              return (
                <div
                  key={t.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs hover:border-blue-300 transition space-y-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-indigo-200">
                        {t.fotoUrl ? (
                          <img src={t.fotoUrl} alt={t.nama} className="w-full h-full object-cover" />
                        ) : (
                          <span>{t.nama.slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">{t.nama}</h4>
                        <p className="text-xs text-blue-700 font-semibold">{t.mapel}</p>
                        <p className="text-[10px] text-slate-400">NIP/NUPTK: {t.nip || '-'}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                        progressPct >= 80
                          ? 'bg-emerald-100 text-emerald-800'
                          : progressPct >= 40
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {progressPct}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                      <span>Progres KBM:</span>
                      <span className="text-slate-900 font-extrabold">
                        {totalMeetings} / {targetMeetings} Pertemuan
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          progressPct >= 80
                            ? 'bg-emerald-500'
                            : progressPct >= 40
                            ? 'bg-blue-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Classes Covered */}
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Kelas yang Diajar:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {distinctClassesTaught.length > 0 ? (
                        distinctClassesTaught.map((c) => (
                          <span
                            key={c}
                            className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-[10px] font-bold"
                          >
                            Kelas {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Belum ada kelas terinput</span>
                      )}
                    </div>
                  </div>

                  {/* Fast Action Buttons */}
                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedTeacherModal(t)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Lihat Rincian</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        const tJournals = journals.filter(
                          (j) => j.guruId === t.id || j.guruNama === t.nama
                        );
                        await exportTeacherJournalBookPDF(
                          config,
                          t,
                          distinctClassesTaught[0] || 'VII-A',
                          t.mapel,
                          tJournals
                        );
                      }}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition"
                      title="Cetak Buku Agenda Guru"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: KBM ATTENDANCE LOG */}
      {/* ======================================================== */}
      {activeTab === 'ATTENDANCE' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Data Presensi Siswa Sesi KBM Kelas
              </h3>
              <p className="text-xs text-slate-500">
                Melihat rekaman kehadiran siswa per mata pelajaran pada tanggal <b>{selectedDate || 'Semua Tanggal'}</b>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="ALL">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-3 w-10 text-center">No</th>
                    <th className="py-3.5 px-4">Nama Siswa &amp; NISN</th>
                    <th className="py-3.5 px-4">Kelas</th>
                    <th className="py-3.5 px-4">Mata Pelajaran</th>
                    <th className="py-3.5 px-4">Tanggal &amp; Waktu</th>
                    <th className="py-3.5 px-4 text-center">Status Kehadiran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {kbmAttendanceRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                        <p className="font-bold text-sm text-slate-600">Tidak ada presensi KBM kelas pada filter ini</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Presensi KBM tercatat otomatis saat guru atau petugas piket menyimpan jurnal mengajar.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    kbmAttendanceRecords.slice(0, 150).map((a, idx) => (
                      <tr key={a.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {a.nama}
                          <span className="block text-[10px] text-slate-400 font-normal">NISN: {a.nisn}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md font-bold text-[10px]">
                            Kelas {a.kelas}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-blue-700 font-semibold">{a.mapel || '-'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{a.tanggal} • {a.waktu}</td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                              a.status.includes('Hadir')
                                ? 'bg-emerald-100 text-emerald-800'
                                : a.status === 'Sakit'
                                ? 'bg-blue-100 text-blue-800'
                                : a.status === 'Izin'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 5: OFFICIAL REPORTS & PRINTING */}
      {/* ======================================================== */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Report Card 1: Official Supervision Report */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Laporan Hasil Supervisi &amp; Audit KBM (A4 Landscape)
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Dokumen rekapitulasi KBM resmi ber-kop Yayasan &amp; Sekolah beserta logo, garis pembatas ganda, rincian materi harian, dan kolom tanda tangan Kepala Sekolah &amp; Tim Supervisi.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportSupervisionPDF}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh Laporan Supervisi (PDF)</span>
              </button>
            </div>

            {/* Report Card 2: Curriculum Target Matrix */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-base text-slate-900">
                  Matriks Target Kurikulum &amp; Silabus Semester (A4)
                </h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Laporan komparatif jumlah pertemuan tatap muka yang telah terlaksana dibandingkan dengan target 18 pertemuan per semester untuk seluruh guru.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExportCurriculumMatrixPDF}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Unduh Matriks Semester (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 6: ENHANCED TEACHER ASSISTANCE MODE */}
      {/* ======================================================== */}
      {activeTab === 'ASSISTANCE' && (
        <div className="space-y-5 animate-in fade-in">
          {/* Header Note */}
          <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-300/40 rounded-3xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <Zap className="w-5 h-5 fill-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    Mode Asistensi &amp; Delegasi KBM Guru (Konsol Petugas Piket)
                  </h3>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                    Official Piket Tool
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  Digunakan oleh Petugas Piket / Admin untuk mencatat presensi dan materi kelas atas nama guru yang berhalangan hadir (sakit/izin), guru pengganti, atau kendala perangkat dengan audit trail yang transparan.
                </p>
              </div>
            </div>

            {/* Workflow Switcher */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-slate-200 shadow-2xs self-start md:self-center">
              <button
                type="button"
                onClick={() => setAssistanceWorkflow('QUICK_FORM')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  assistanceWorkflow === 'QUICK_FORM'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Form Kilat Piket
              </button>
              <button
                type="button"
                onClick={() => setAssistanceWorkflow('FULL_PORTAL')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  assistanceWorkflow === 'FULL_PORTAL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Portal Guru Lengkap
              </button>
            </div>
          </div>

          {/* Teacher Selection & Metadata Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-amber-600" />
                  <span>Pilih Guru yang Diberikan Asistensi:</span>
                </span>
                <span className="text-xs text-slate-400">({filteredAssistanceTeachers.length} Guru Ditemukan)</span>
              </div>

              {/* Status Filter for Picker */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setAssistanceFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    assistanceFilterStatus === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Semua Guru
                </button>
                <button
                  type="button"
                  onClick={() => setAssistanceFilterStatus('UNFILLED')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    assistanceFilterStatus === 'UNFILLED'
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  Belum Mengisi Hari Ini ({teachersNotFilledToday.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssistanceFilterStatus('FILLED')}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                    assistanceFilterStatus === 'FILLED'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  Sudah Mengisi ({teachersWithJournalToday.size})
                </button>
              </div>
            </div>

            {/* Teacher Search & Horizontal Picker Cards */}
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama guru, NIP, atau mata pelajaran untuk memilih..."
                  value={assistanceTeacherSearch}
                  onChange={(e) => setAssistanceTeacherSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-hidden font-medium"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredAssistanceTeachers.map((t) => {
                  const isSelected = assistanceTeacherId === t.id;
                  const hasFilled = teachersWithJournalToday.has(t.id) || teachersWithJournalToday.has(t.nama);

                  return (
                    <div
                      key={t.id}
                      onClick={() => setAssistanceTeacherId(t.id)}
                      className={`p-3 rounded-2xl border transition cursor-pointer text-left flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300 shadow-xs'
                          : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {t.fotoUrl ? (
                            <img src={t.fotoUrl} alt={t.nama} className="w-full h-full object-cover" />
                          ) : (
                            <span>{t.nama.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-xs text-slate-900 truncate">{t.nama}</p>
                          <p className="text-[10px] text-slate-500 truncate">{t.mapel}</p>
                        </div>
                      </div>

                      {hasFilled ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Sudah mengisi jurnal hari ini" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Belum mengisi jurnal" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Assistance Context Configuration */}
            {currentAssistanceTeacher && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">Alasan Delegasi / Asistensi:</label>
                  <select
                    value={assistanceReason}
                    onChange={(e) => setAssistanceReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                  >
                    {ASSISTANCE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Nama Petugas Piket / Admin:</label>
                  <input
                    type="text"
                    value={assistanceOfficerName}
                    onChange={(e) => setAssistanceOfficerName(e.target.value)}
                    placeholder="Contoh: Budi Santoso (Piket)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">Status Guru Terpilih:</label>
                  <div className="flex items-center gap-2 h-9 px-3 bg-white border border-slate-200 rounded-xl">
                    <span className="font-bold text-slate-800 truncate">{currentAssistanceTeacher.nama}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold shrink-0">
                      {currentAssistanceTeacher.mapel}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Workflow A: Quick Form */}
          {assistanceWorkflow === 'QUICK_FORM' && currentAssistanceTeacher && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-black text-base text-slate-900 flex items-center gap-2">
                    <span>Entri Kilat KBM &amp; Presensi Kelas</span>
                    <span className="text-xs px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold">
                      Pertemuan Ke-{computedQuickPertemuan}
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Isi materi pembelajaran dan checklist presensi siswa kelas tatap muka berikut.
                  </p>
                </div>
              </div>

              {/* Class, Subject, Jam Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Kelas yang Diajar:</label>
                  <select
                    value={quickClass}
                    onChange={(e) => setQuickClass(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden"
                  >
                    {classes.map((c) => (
                      <option key={c} value={c}>
                        Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Mata Pelajaran:</label>
                  <select
                    value={quickSubject}
                    onChange={(e) => setQuickSubject(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden"
                  >
                    {subjectsList.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Jam Pelajaran:</label>
                  <select
                    value={quickJam}
                    onChange={(e) => setQuickJam(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden"
                  >
                    {JAM_PELAJARAN_OPTIONS.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Materi & Template Suggestions */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-700 text-xs">
                  Materi Pokok Pembelajaran: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={quickMateri}
                  onChange={(e) => setQuickMateri(e.target.value)}
                  placeholder="Contoh: Bab 3 - Persamaan Linier Satu Variabel & Latihan Mandiri"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden"
                />

                {/* Quick Suggestion Chips */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-400 self-center">Template Cepat:</span>
                  {QUICK_MATERI_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => setQuickMateri(tmpl)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition cursor-pointer"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kegiatan & Refleksi */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Uraian Kegiatan Pembelajaran (Opsional):</label>
                  <textarea
                    rows={2}
                    value={quickKegiatan}
                    onChange={(e) => setQuickKegiatan(e.target.value)}
                    placeholder="Contoh: Siswa mengerjakan lembar kerja mandiri, dilanjutkan pembahasan soal..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Catatan &amp; Refleksi Kelas (Opsional):</label>
                  <textarea
                    rows={2}
                    value={quickRefleksi}
                    onChange={(e) => setQuickRefleksi(e.target.value)}
                    placeholder="Contoh: Kondisi kelas tenang dan tertib selama sesi berlangsung..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* Student Attendance Checklist */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden space-y-0">
                <div className="bg-slate-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
                  <div>
                    <span className="font-extrabold text-xs text-slate-900">
                      Presensi Siswa Kelas {quickClass} ({quickClassStudents.length} Siswa)
                    </span>
                    <div className="flex items-center gap-3 text-[11px] font-bold mt-0.5">
                      <span className="text-emerald-700">Hadir: {quickAttendanceCounts.hadir}</span>
                      <span className="text-blue-700">Sakit: {quickAttendanceCounts.sakit}</span>
                      <span className="text-amber-700">Izin: {quickAttendanceCounts.izin}</span>
                      <span className="text-rose-700">Alfa: {quickAttendanceCounts.alpa}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Tandai Semua:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA'> = {};
                        quickClassStudents.forEach((s) => {
                          updated[s.nisn] = 'HADIR';
                        });
                        setQuickStudentStatuses(updated);
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Semua Hadir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const updated: Record<string, 'HADIR' | 'SAKIT' | 'IZIN' | 'ALPA'> = {};
                        quickClassStudents.forEach((s) => {
                          updated[s.nisn] = 'IZIN';
                        });
                        setQuickStudentStatuses(updated);
                      }}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      Semua Izin
                    </button>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 text-xs">
                  {quickClassStudents.map((s, idx) => {
                    const currentStatus = quickStudentStatuses[s.nisn] || 'HADIR';

                    return (
                      <div key={s.nisn} className="p-2.5 px-4 flex items-center justify-between gap-3 hover:bg-slate-50">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-slate-400 font-bold w-5 text-center">{idx + 1}</span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{s.nama}</p>
                            <p className="text-[10px] text-slate-400">NISN: {s.nisn}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {(['HADIR', 'SAKIT', 'IZIN', 'ALPA'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => {
                                setQuickStudentStatuses((prev) => ({
                                  ...prev,
                                  [s.nisn]: st,
                                }));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                                currentStatus === st
                                  ? st === 'HADIR'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : st === 'SAKIT'
                                    ? 'bg-blue-600 text-white shadow-2xs'
                                    : st === 'IZIN'
                                    ? 'bg-amber-500 text-white shadow-2xs'
                                    : 'bg-rose-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {st === 'HADIR' ? 'H' : st === 'SAKIT' ? 'S' : st === 'IZIN' ? 'I' : 'A'}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmittingQuickForm}
                  onClick={() => handleSaveQuickAssistance(true)}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-4 h-4" />
                  <span>Simpan &amp; Cetak Berita Acara (PDF)</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmittingQuickForm}
                  onClick={() => handleSaveQuickAssistance(false)}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-extrabold text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Jurnal KBM</span>
                </button>
              </div>
            </div>
          )}

          {/* Workflow B: Full Teacher Portal Embedded */}
          {assistanceWorkflow === 'FULL_PORTAL' && currentAssistanceTeacher && (
            <div className="border border-slate-200 rounded-3xl p-1 bg-slate-50">
              <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs">
                    {currentAssistanceTeacher.nama.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-sm">Mode Delegasi: {currentAssistanceTeacher.nama}</h4>
                    <p className="text-[11px] text-slate-300">{currentAssistanceTeacher.mapel} • NIP/NUPTK: {currentAssistanceTeacher.nip || '-'}</p>
                  </div>
                </div>
                <span className="text-[10px] px-3 py-1 bg-amber-400 text-slate-950 font-black rounded-full">
                  Asistensi Aktif
                </span>
              </div>

              <TeacherPortalView
                teacher={currentAssistanceTeacher}
                students={students}
                attendance={attendance}
                journals={journals}
                config={config}
                activeSession={activeSession}
                timeString={timeString}
                dateString={dateString}
                dayKey={dayKey}
                onRecordAttendance={onRecordAttendance}
                onDeleteAttendance={onDeleteAttendance}
                onSaveJournal={onSaveJournal}
                onDeleteJournal={onDeleteJournal}
                onShowNotice={onShowNotice}
                onShowConfirm={onShowConfirm}
              />
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: SUPERVISION ASSESSMENT & RUBRIC SCORING */}
      {/* ======================================================== */}
      {supervisingJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Star className="w-6 h-6 fill-amber-300 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Rubrik Evaluasi &amp; Supervisi Akademik KBM
                  </h3>
                  <p className="text-xs text-slate-500">
                    Guru: <b>{supervisingJournal.guruNama}</b> ({supervisingJournal.mapel} - Kelas {supervisingJournal.kelas})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSupervisingJournal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Score Summary Box */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Perhitungan Nilai Akhir:</span>
                <p className="text-2xl font-black text-blue-950">
                  {Math.round(((rubricMastery + rubricClassroom + rubricPedagogy + rubricDiscipline) / 20) * 100)} / 100
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-xs">
                {Math.round(((rubricMastery + rubricClassroom + rubricPedagogy + rubricDiscipline) / 20) * 100) >= 90
                  ? 'AMAT BAIK (A)'
                  : Math.round(((rubricMastery + rubricClassroom + rubricPedagogy + rubricDiscipline) / 20) * 100) >= 80
                  ? 'BAIK (B)'
                  : 'CUKUP (C)'}
              </span>
            </div>

            {/* 4 Rubric Criteria */}
            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">1. Penguasaan Materi Pokok &amp; Kedalaman Konsep</span>
                  <span className="font-extrabold text-blue-600">{rubricMastery} / 5</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricMastery(val)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        rubricMastery === val
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">2. Pengelolaan Kelas &amp; Partisipasi Aktif Siswa</span>
                  <span className="font-extrabold text-blue-600">{rubricClassroom} / 5</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricClassroom(val)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        rubricClassroom === val
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">3. Media &amp; Metode Pembelajaran Inovatif</span>
                  <span className="font-extrabold text-blue-600">{rubricPedagogy} / 5</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricPedagogy(val)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        rubricPedagogy === val
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">4. Kedisiplinan Waktu &amp; Administrasi Jurnal</span>
                  <span className="font-extrabold text-blue-600">{rubricDiscipline} / 5</span>
                </div>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRubricDiscipline(val)}
                      className={`flex-1 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                        rubricDiscipline === val
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan & Rekomendasi Supervisor */}
              <div className="space-y-1.5">
                <label className="block font-bold text-slate-700">
                  Catatan, Rekomendasi &amp; Tindak Lanjut Supervisi:
                </label>
                <textarea
                  rows={3}
                  value={supervisorNotes}
                  onChange={(e) => setSupervisorNotes(e.target.value)}
                  placeholder="Ketik catatan evaluasi guru..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-medium"
                />

                <div className="flex flex-wrap gap-1 pt-1">
                  {SUPERVISION_FEEDBACK_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSupervisorNotes(p)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[9px] font-medium"
                    >
                      {p.slice(0, 45)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Decision */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Keputusan Status:</label>
                  <select
                    value={supervisionStatusChoice}
                    onChange={(e) => setSupervisionStatusChoice(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  >
                    <option value="VERIFIED">Terverifikasi &amp; Disetujui</option>
                    <option value="REVISION_NEEDED">Perlu Revisi Guru</option>
                    <option value="PENDING">Menunggu Ditinjau</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Supervisor:</label>
                  <input
                    type="text"
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSupervisingJournal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={isSavingSupervision}
                onClick={() => handleSaveSupervisionAssessment(true)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Simpan &amp; Cetak Hasil Supervisi (PDF)</span>
              </button>

              <button
                type="button"
                disabled={isSavingSupervision}
                onClick={() => handleSaveSupervisionAssessment(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Verifikasi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: TEACHER PROFILE & PORTFOLIO MODAL */}
      {/* ======================================================== */}
      {selectedTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-base shrink-0 overflow-hidden border border-blue-200 shadow-sm">
                  {selectedTeacherModal.fotoUrl ? (
                    <img
                      src={selectedTeacherModal.fotoUrl}
                      alt={selectedTeacherModal.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedTeacherModal.nama.slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>{selectedTeacherModal.nama}</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                        selectedTeacherModal.status === 'AKTIF'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {selectedTeacherModal.status}
                    </span>
                  </h3>
                  <p className="text-xs text-blue-700 font-semibold">{selectedTeacherModal.mapel}</p>
                  <p className="text-[11px] text-slate-400">NIP/NUPTK: {selectedTeacherModal.nip || '-'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTeacherModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Contact */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl text-xs">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>{selectedTeacherModal.noHp || 'No HP Belum Terdaftar'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                {selectedTeacherModal.noHp && (
                  <button
                    type="button"
                    onClick={() => handleSendWaReminder(selectedTeacherModal)}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat WA</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await exportTeacherJournalBookPDF(
                      config,
                      selectedTeacherModal,
                      selectedTeacherClasses[0] || 'VII-A',
                      selectedTeacherModal.mapel,
                      selectedTeacherJournals
                    );
                  }}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Buku Agenda (PDF)</span>
                </button>
              </div>
            </div>

            {/* Teaching History Stats */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Sesi KBM</span>
                <p className="text-xl font-black text-blue-900 mt-1">{selectedTeacherJournals.length} Sesi</p>
              </div>

              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kelas Diampu</span>
                <p className="text-xl font-black text-purple-900 mt-1">
                  {selectedTeacherClasses.length > 0 ? selectedTeacherClasses.join(', ') : '-'}
                </p>
              </div>
            </div>

            {/* Recent Journals */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                Log KBM Terakhir ({selectedTeacherJournals.length} Pertemuan)
              </h4>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl text-xs">
                {selectedTeacherJournals.length === 0 ? (
                  <p className="p-4 text-center text-slate-400">Belum ada jurnal yang tercatat.</p>
                ) : (
                  selectedTeacherJournals.slice(0, 10).map((j) => (
                    <div key={j.id} className="p-3 flex items-start justify-between gap-3 hover:bg-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">{j.materiPokok}</p>
                        <p className="text-[10px] text-slate-500">
                          {j.tanggal} • Kelas {j.kelas} • {j.jamPelajaran || 'Sesi KBM'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-md font-bold text-[9px] shrink-0">
                        {j.persentaseKehadiran || 100}% Hadir
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: JOURNAL DETAIL INSPECTOR */}
      {/* ======================================================== */}
      {detailJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Detail Jurnal KBM</span>
                <h3 className="text-base font-black text-slate-900">{detailJournal.materiPokok}</h3>
                <p className="text-xs text-slate-500">{detailJournal.guruNama} • {detailJournal.mapel}</p>
              </div>

              <button
                type="button"
                onClick={() => setDetailJournal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-slate-50 rounded-2xl text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Tanggal:</span>
                <span className="font-bold text-slate-800">{detailJournal.tanggal}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Kelas &amp; Jam:</span>
                <span className="font-bold text-purple-700">Kelas {detailJournal.kelas}</span>
                <span className="text-[10px] text-slate-500 block">{detailJournal.jamPelajaran}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Pertemuan:</span>
                <span className="font-bold text-slate-800">Ke-{detailJournal.pertemuanKe || 1}</span>
              </div>
            </div>

            {detailJournal.kegiatanPembelajaran && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Uraian Kegiatan:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-600 leading-relaxed">
                  {detailJournal.kegiatanPembelajaran}
                </p>
              </div>
            )}

            {detailJournal.catatanRefleksi && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Catatan / Refleksi Kelas:</span>
                <p className="p-3 bg-slate-50 rounded-xl text-slate-600 leading-relaxed whitespace-pre-line">
                  {detailJournal.catatanRefleksi}
                </p>
              </div>
            )}

            {/* Attendance Breakdown */}
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
              <span className="font-bold text-emerald-950">Rekap Kehadiran Siswa:</span>
              <div className="flex items-center gap-2 font-black text-emerald-900">
                <span>H: {detailJournal.hadir ?? '-'}</span>
                <span>S: {detailJournal.sakit ?? '-'}</span>
                <span>I: {detailJournal.izin ?? '-'}</span>
                <span>A: {detailJournal.alpa ?? '-'}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleOpenSupervisionModal(detailJournal)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                <span>Supervisi &amp; Nilai</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailJournal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
