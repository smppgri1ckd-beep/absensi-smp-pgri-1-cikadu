import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  AttendanceSession,
  AttendanceStatus,
  AttendanceCategory,
} from '../types';
import { OFFICIAL_SUBJECTS } from '../constants/subjects';
import { StudentDetailModal } from './StudentDetailModal';
import { TeacherQRScannerModal } from './TeacherQRScannerModal';
import { exportTeacherDailyPDF } from '../utils/teacherExportPdf';

interface TeacherPortalViewProps {
  teacher: TeacherUser;
  students: Student[];
  attendance: AttendanceRecord[];
  config: SchoolConfig;
  activeSession: AttendanceSession;
  timeString: string;
  dateString: string;
  dayKey: string;
  onRecordAttendance: (record: AttendanceRecord) => Promise<boolean>;
  onDeleteAttendance?: (id: string) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const TeacherPortalView: React.FC<TeacherPortalViewProps> = ({
  teacher,
  students,
  attendance,
  config,
  activeSession,
  timeString,
  dateString,
  dayKey,
  onRecordAttendance,
  onDeleteAttendance,
  onShowNotice,
  onShowConfirm,
}) => {
  // Extract available classes
  const classes = useMemo(() => {
    return Array.from(new Set(students.map((s) => s.kelas))).sort();
  }, [students]);

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
  const [activeTab, setActiveTab] = useState<'PRESENSI' | 'JURNAL' | 'SISWA' | 'PIKET'>('PRESENSI');
  const [searchQuery, setSearchQuery] = useState('');

  // Dual-Function: APEL (Pagi/Siang) vs KELAS (KBM Mengajar)
  const [attendanceCategory, setAttendanceCategory] = useState<AttendanceCategory>('KELAS');
  const [selectedMapel, setSelectedMapel] = useState<string>(() => teacher.mapel || OFFICIAL_SUBJECTS[0]);
  const [pertemuanKe, setPertemuanKe] = useState<number>(1);
  const [materiPokok, setMateriPokok] = useState<string>('');

  // Modal Input Izin / Sakit
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [izinStatus, setIzinStatus] = useState<'Izin' | 'Sakit' | 'Alpa' | 'Hadir Tepat Waktu'>('Izin');
  const [izinKeterangan, setIzinKeterangan] = useState('');

  // Modal Edit Presensi Manual / Koreksi
  const [showEditModal, setShowEditModal] = useState(false);
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
          const mapelMatch = !a.mapel || a.mapel === selectedMapel;
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
          if (st === 'Hadir Tepat Waktu' || st === 'Pulang Tepat Waktu') hadir++;
          else if (st === 'Terlambat' || st === 'Pulang Terlambat') terlambat++;
          else if (st === 'Izin') izin++;
          else if (st === 'Sakit') sakit++;
          else if (st === 'Alpa') alpa++;
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

  // Handle manual status change
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
      } : {}),
    };

    onRecordAttendance(newRecord).then(() => {
      onShowNotice(
        'Status Presensi Diperbarui',
        `${student.nama} (${student.kelas}) ditandai: ${newStatus}${isKelas ? ` [${selectedMapel} Ke-${pertemuanKe}]` : ''}`,
        'success'
      );
    });
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

      // Extract raw status vs note if any
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
      setEditMateriPokok(materiPokok);
      setEditStatus('Hadir Tepat Waktu');
      setEditKeterangan('');
    }

    setShowEditModal(true);
  };

  // Save changes from Edit Modal
  const handleSaveEditAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const fullStatus = editKeterangan.trim()
      ? `${editStatus} (${editKeterangan.trim()})`
      : editStatus;

    const isKelas = editKategori === 'KELAS';
    const recordId =
      editingRecord?.id ||
      (isKelas
        ? `kbm_${editingStudent.nisn}_${editTanggal}_${editMapel.replace(/\s+/g, '_')}_p${editPertemuanKe}`
        : `att_${editingStudent.nisn}_${editTanggal}_${editSesi}`);

    const updatedRecord: AttendanceRecord = {
      id: recordId,
      tanggal: editTanggal,
      waktu: editWaktu || '07:00:00',
      nisn: editingStudent.nisn,
      nama: editingStudent.nama,
      kelas: editingStudent.kelas,
      sesi: editSesi,
      status: fullStatus as AttendanceStatus,
      kategori: editKategori,
      ...(isKelas ? {
        mapel: editMapel,
        pertemuanKe: editPertemuanKe,
        materiPokok: editMateriPokok.trim() || undefined,
      } : {}),
    };

    await onRecordAttendance(updatedRecord);
    setShowEditModal(false);
    onShowNotice(
      'Data Presensi Diperbarui',
      `Data presensi ${editingStudent.nama} (${editingStudent.kelas}) berhasil disimpan.`,
      'success'
    );
  };

  // Delete attendance record
  const handleDeleteAttendanceRecord = (student: Student, record: AttendanceRecord) => {
    onShowConfirm(
      'Hapus Catatan Presensi?',
      `Apakah Anda yakin ingin menghapus data presensi ${student.nama} (${record.status} - ${record.tanggal} ${record.kategori === 'KELAS' ? record.mapel : `Sesi ${record.sesi}`})? Status siswa akan kembali menjadi Belum Hadir / Kosong.`,
      async () => {
        if (onDeleteAttendance) {
          await onDeleteAttendance(record.id);
        } else {
          // Fallback if not provided directly
          const localStored = localStorage.getItem('epresensi_local_attendance');
          if (localStored) {
            try {
              const parsed = JSON.parse(localStored);
              const updated = parsed.filter((a: any) => a.id !== record.id);
              localStorage.setItem('epresensi_local_attendance', JSON.stringify(updated));
            } catch (err) {
              console.warn(err);
            }
          }
        }
        onShowNotice(
          'Presensi Dihapus',
          `Catatan presensi untuk ${student.nama} telah berhasil dihapus.`,
          'info'
        );
      }
    );
  };

  // Download PDF Report
  const handleDownloadPDF = async () => {
    try {
      await exportTeacherDailyPDF(
        config,
        teacher,
        selectedClass,
        selectedSession,
        selectedDate,
        classStudents,
        attendance,
        {
          kategori: attendanceCategory,
          mapel: selectedMapel,
          pertemuanKe,
          materiPokok,
        }
      );
      onShowNotice(
        'Laporan Berhasil Diunduh',
        `File PDF presensi Kelas ${selectedClass} (${attendanceCategory === 'KELAS' ? `${selectedMapel} Ke-${pertemuanKe}` : `Apel ${selectedSession}`}) untuk tanggal ${selectedDate} telah diunduh.`,
        'success'
      );
    } catch (err: any) {
      onShowNotice('Gagal Mengunduh PDF', err?.message || 'Terjadi kesalahan saat membuat file PDF.', 'warning');
    }
  };

  const handlePrintClassSheet = () => {
    window.print();
  };

  // Duty teacher today
  const dutyTeacherToday = (config.jadwalPiket as any)?.[dayKey] || {
    nama: 'Belum ditentukan',
    nip: '-',
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* ===== HEADER: PROFIL GURU & SAMBUTAN ===== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black text-base shadow-md shrink-0">
            {teacher.nama.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                {teacher.nama}
              </h2>
              <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-extrabold text-[10px] rounded-full border border-blue-200">
                GURU PENGAJAR
              </span>
              {teacher.waliKelas && teacher.waliKelas !== 'Bukan Wali Kelas' && (
                <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-extrabold text-[10px] rounded-full border border-amber-200 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3 text-amber-600" />
                  <span>Wali Kelas {teacher.waliKelas}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>NIP: {teacher.nip}</span>
              <span>•</span>
              <span className="font-semibold text-slate-700">Mapel: {teacher.mapel}</span>
              <span>•</span>
              <span>{config.namaSekolah}</span>
            </p>
          </div>
        </div>

        {/* Live Info & Quick Stats */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-2xl">
          <Clock className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="text-right">
            <p className="font-mono text-xs font-black text-slate-900 leading-tight">
              {timeString} WIB
            </p>
            <p className="text-[10px] text-slate-500 font-medium">{dateString}</p>
          </div>
          <span
            className={`ml-2 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
              activeSession === 'Pagi'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            Sesi {activeSession}
          </span>
        </div>
      </div>

      {/* ===== NAVIGATION TABS FITUR GURU ===== */}
      <div className="no-print flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl overflow-x-auto text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('PRESENSI')}
          className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'PRESENSI'
              ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-blue-600" />
          <span>Presensi Kelas Hari Ini</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('JURNAL')}
          className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'JURNAL'
              ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-indigo-600" />
          <span>Jurnal & Lembar Presensi Kelas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SISWA')}
          className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'SISWA'
              ? 'bg-white text-violet-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4 text-violet-600" />
          <span>Direktori Siswa Rombel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PIKET')}
          className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'PIKET'
              ? 'bg-white text-amber-700 shadow-2xs font-extrabold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4 text-amber-600" />
          <span>Info Guru Piket & Kalender</span>
        </button>
      </div>

      {/* ===== TAB 1: PRESENSI KELAS HARI INI ===== */}
      {activeTab === 'PRESENSI' && (
        <div className="space-y-4">
          {/* Dual-Function Selector Bar (Apel Sekolah vs Presensi KBM Kelas Mengajar) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Function Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Mode Presensi:</span>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setAttendanceCategory('KELAS')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      attendanceCategory === 'KELAS'
                        ? 'bg-teal-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Presensi KBM Kelas (Guru Mengajar)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceCategory('APEL')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      attendanceCategory === 'APEL'
                        ? 'bg-blue-600 text-white shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Presensi Apel Sekolah (Pagi/Siang)</span>
                  </button>
                </div>
              </div>

              {/* Badges / Active Mode Indicator */}
              <div className="flex items-center gap-2 self-start lg:self-auto">
                {attendanceCategory === 'KELAS' ? (
                  <span className="text-[11px] font-extrabold text-teal-800 bg-teal-50 px-3 py-1.5 rounded-xl border border-teal-200">
                    KBM Tatap Muka: {selectedMapel} (Pertemuan Ke-{pertemuanKe})
                  </span>
                ) : (
                  <span className="text-[11px] font-extrabold text-blue-800 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                    Apel Sekolah: Sesi {selectedSession === 'Pagi' ? 'Apel Pagi' : 'Apel Siang'}
                  </span>
                )}
              </div>
            </div>

            {/* Sub-bar depending on selected category */}
            {attendanceCategory === 'KELAS' ? (
              <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Mata Pelajaran (Mapel)
                  </label>
                  <select
                    value={selectedMapel}
                    onChange={(e) => setSelectedMapel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                  >
                    {OFFICIAL_SUBJECTS.map((m) => (
                      <option key={m} value={m}>
                        {m} {m === teacher.mapel ? '(Ampuan Saya)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Pertemuan Ke-
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={pertemuanKe}
                    onChange={(e) => setPertemuanKe(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 text-center focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Materi Pokok / Pembahasan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bab 1..."
                    value={materiPokok}
                    onChange={(e) => setMateriPokok(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    title="Buka Kamera Scan QR Code Siswa untuk KBM Kelas Ini"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR Siswa</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Controls Bar: Class, Date, Session (if Apel) & Search */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Pilih Rombel / Kelas
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  {classes.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c} {c === teacher.waliKelas ? '(Wali Kelas Saya)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Tanggal Presensi
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                />
              </div>

              {attendanceCategory === 'APEL' ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Sesi Apel Sekolah
                  </label>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedSession('Pagi')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        selectedSession === 'Pagi'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Apel Pagi
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSession('Siang')}
                      className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                        selectedSession === 'Siang'
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Apel Siang
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Student Search */}
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Cari nama atau NISN siswa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Statistics Strip for Class */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 sm:gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</p>
              <p className="text-[10px] text-slate-400">Kelas {selectedClass}</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Hadir Tepat</p>
              <p className="text-xl font-black text-emerald-700 mt-0.5">{stats.hadir}</p>
              <p className="text-[10px] text-emerald-600">Siswa Hadir</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Terlambat</p>
              <p className="text-xl font-black text-amber-700 mt-0.5">{stats.terlambat}</p>
              <p className="text-[10px] text-amber-600">Perlu Pembinaan</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Izin</p>
              <p className="text-xl font-black text-blue-700 mt-0.5">{stats.izin}</p>
              <p className="text-[10px] text-blue-600">Ada Keterangan</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Sakit</p>
              <p className="text-xl font-black text-orange-700 mt-0.5">{stats.sakit}</p>
              <p className="text-[10px] text-orange-600">Kabar Orang Tua</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs">
              <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Alpa / Belum</p>
              <p className="text-xl font-black text-rose-700 mt-0.5">{stats.belumAbsen + stats.alpa}</p>
              <p className="text-[10px] text-rose-600">{stats.persentase}% Kehadiran</p>
            </div>
          </div>

          {/* Student Attendance Table */}
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">
                  {attendanceCategory === 'KELAS' ? (
                    <span>
                      Presensi KBM Kelas {selectedClass} • {selectedMapel} (Pertemuan Ke-{pertemuanKe}) • {selectedDate}
                    </span>
                  ) : (
                    <span>
                      Daftar Presensi Apel Kelas {selectedClass} • {selectedDate} (Sesi Apel {selectedSession})
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {attendanceCategory === 'KELAS'
                    ? `Presensi tatap muka mata pelajaran ${selectedMapel} oleh guru pengajar saat KBM di dalam kelas.`
                    : 'Presensi apel kedisiplinan sekolah (Apel Pagi / Apel Siang) siswa per rombel.'}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap justify-end">
                {attendanceCategory === 'KELAS' && (
                  <button
                    type="button"
                    onClick={() => setShowQRScanner(true)}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    title="Buka Kamera Scan QR Code Siswa untuk Presensi KBM"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QR Siswa</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDownloadPDF}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  title="Download Laporan Presensi Format PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
                  Kehadiran: {stats.persentase}%
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3 px-3.5 w-10 text-center">No</th>
                    <th className="py-3 px-3.5">Foto & Nama Siswa</th>
                    <th className="py-3 px-3.5">NISN & JK</th>
                    <th className="py-3 px-3.5">Jam Masuk / Scan</th>
                    <th className="py-3 px-3.5">Status Kehadiran</th>
                    <th className="py-3 px-3.5 text-right">Aksi Cepat Guru</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {classStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Tidak ada siswa di kelas {selectedClass}
                      </td>
                    </tr>
                  ) : (
                    classStudents.map((s, idx) => {
                      const record = studentAttendanceMap.get(s.nisn);
                      const isRecorded = Boolean(record);
                      const statusText = record ? record.status : 'Belum Absen';

                      let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
                      if (statusText.includes('Hadir Tepat') || statusText.includes('Pulang Tepat')) {
                        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      } else if (statusText.includes('Terlambat')) {
                        badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                      } else if (statusText.includes('Izin')) {
                        badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                      } else if (statusText.includes('Sakit')) {
                        badgeClass = 'bg-orange-50 text-orange-700 border-orange-200';
                      } else if (statusText.includes('Alpa')) {
                        badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                      }

                      return (
                        <tr key={s.nisn} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-3.5">
                            <div
                              onClick={() => handleOpenStudentDetail(s)}
                              className="flex items-center gap-2.5 cursor-pointer group"
                              title="Klik untuk melihat detail profil siswa"
                            >
                              <img
                                src={s.fotoUrl}
                                alt={s.nama}
                                className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100 group-hover:ring-2 group-hover:ring-blue-500 transition-all"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80';
                                }}
                              />
                              <div>
                                <p className="font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                                  {s.nama}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                  Kelas {s.kelas}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-[11px]">
                            <p className="font-semibold text-slate-700">{s.nisn}</p>
                            <span className="text-[10px] text-slate-400">
                              {s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                            </span>
                          </td>
                          <td className="py-3 px-3.5 font-mono text-xs">
                            {record ? (
                              <span className="font-bold text-slate-800">{record.waktu} WIB</span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${badgeClass}`}
                            >
                              {statusText.includes('Hadir') && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {statusText.includes('Terlambat') && <Clock3 className="w-3 h-3 text-amber-600" />}
                              {statusText.includes('Izin') && <FileText className="w-3 h-3 text-blue-600" />}
                              {statusText.includes('Sakit') && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                              <span>{statusText}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Mark Hadir */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatusChange(s, 'Hadir Tepat Waktu')
                                }
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                                title="Tandai Hadir Manual"
                              >
                                Hadir
                              </button>

                              {/* Input Izin / Sakit with Note Modal */}
                              <button
                                type="button"
                                onClick={() => handleOpenIzinModal(s)}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                                title="Catat Surat Izin / Sakit"
                              >
                                Izin / Sakit
                              </button>

                              {/* Quick View Student Detail */}
                              <button
                                type="button"
                                onClick={() => handleOpenStudentDetail(s)}
                                className="p-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-lg transition cursor-pointer"
                                title="Lihat Profil Lengkap & Histori Siswa"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Quick Mark Alpa */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatusChange(s, 'Alpa', 'Tanpa Keterangan')
                                }
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-extrabold transition cursor-pointer"
                                title="Tandai Alpa"
                              >
                                Alpa
                              </button>

                              {/* Edit Data Presensi */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(s, record)}
                                className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg transition cursor-pointer"
                                title="Edit / Koreksi Data Presensi Siswa"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Hapus Data Presensi (jika ada record) */}
                              {record && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAttendanceRecord(s, record)}
                                  className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg transition cursor-pointer"
                                  title="Hapus Data Presensi (Reset Jadi Kosong/Belum Hadir)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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

      {/* ===== TAB 2: JURNAL & LEMBAR PRESENSI KELAS ===== */}
      {activeTab === 'JURNAL' && (
        <div className="space-y-4">
          <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
                Lembar Presensi & Rekap Tatap Muka Kelas {selectedClass}
              </h3>
              <p className="text-[11px] text-slate-500">
                Dokumen presensi resmi yang dapat dicetak langsung atau disimpan sebagai arsip guru pengajar/wali kelas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Download Laporan Presensi Format PDF"
              >
                <Download className="w-4 h-4" />
                <span>Download Laporan PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintClassSheet}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Lembar Presensi</span>
              </button>
            </div>
          </div>

          {/* Printable Class Attendance Sheet (A4 Styled Document) */}
          <div className="bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 print:border-none print:shadow-none print:p-0">
            {/* Kop Laporan Resmi dengan Logo Sekolah */}
            <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
              <div className="w-16 sm:w-20 shrink-0 flex items-center justify-center">
                <img
                  src={config.logoUrl}
                  alt="Logo Sekolah"
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://cdn-icons-png.flaticon.com/512/2856/2856000.png';
                  }}
                />
              </div>
              <div className="flex-1 text-center space-y-0.5">
                <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-800 leading-tight">
                  PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN
                </h4>
                <h4 className="text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-wide text-slate-800 leading-tight">
                  PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR
                </h4>
                <h3 className="text-base sm:text-lg font-black uppercase text-slate-950 tracking-wide leading-tight pt-0.5">
                  {config.namaSekolah}
                </h3>
                <p className="text-[11px] font-bold text-slate-700">
                  {attendanceCategory === 'KELAS'
                    ? 'LEMBAR PRESENSI KEGIATAN BELAJAR MENGAJAR (KBM KELAS)'
                    : 'LEMBAR PRESENSI APEL KEDISIPLINAN SEKOLAH'}
                </p>
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  NPSN: {config.npsn} • {config.alamat} • {config.kontak}
                </p>
              </div>
              <div className="w-16 sm:w-20 shrink-0 hidden sm:block" />
            </div>

            {/* Document Meta Info */}
            <div className="grid grid-cols-2 text-xs font-medium text-slate-700 gap-2 pb-2">
              <div>
                <p>
                  <span className="font-bold">Kelas / Rombel:</span> Kelas {selectedClass}
                </p>
                <p>
                  <span className="font-bold">Guru Pengajar:</span> {teacher.nama} ({selectedMapel})
                </p>
                {attendanceCategory === 'KELAS' && (
                  <p>
                    <span className="font-bold">Materi Pokok:</span> {materiPokok || '-'}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p>
                  <span className="font-bold">Tanggal:</span> {selectedDate}{' '}
                  {attendanceCategory === 'KELAS'
                    ? `(Pertemuan Ke-${pertemuanKe})`
                    : `(Sesi Apel ${selectedSession})`}
                </p>
                <p>
                  <span className="font-bold">Tingkat Kehadiran:</span> {stats.persentase}% ({stats.hadir + stats.terlambat} dari {stats.total} Siswa)
                </p>
              </div>
            </div>

            {/* Attendance Table */}
            <table className="w-full text-left text-xs border border-slate-300">
              <thead className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center border-r border-slate-300">No</th>
                  <th className="py-2 px-3 border-r border-slate-300">Nama Siswa</th>
                  <th className="py-2 px-2.5 w-24 text-center border-r border-slate-300">NISN</th>
                  <th className="py-2 px-2 w-12 text-center border-r border-slate-300">L/P</th>
                  <th className="py-2 px-3 w-28 text-center border-r border-slate-300">Status</th>
                  <th className="py-2 px-3 text-center w-36">Paraf / Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classStudents.map((s, idx) => {
                  const record = studentAttendanceMap.get(s.nisn);
                  const status = record ? record.status : 'Alpa';

                  return (
                    <tr key={s.nisn}>
                      <td className="py-1.5 px-2.5 text-center font-bold border-r border-slate-200">
                        {idx + 1}
                      </td>
                      <td
                        onClick={() => handleOpenStudentDetail(s)}
                        className="py-1.5 px-3 font-bold text-slate-900 border-r border-slate-200 hover:text-blue-600 cursor-pointer"
                        title={`Klik untuk melihat profil lengkap ${s.nama}`}
                      >
                        {s.nama}
                      </td>
                      <td className="py-1.5 px-2.5 text-center font-mono text-[11px] border-r border-slate-200">
                        {s.nisn}
                      </td>
                      <td className="py-1.5 px-2 text-center font-bold border-r border-slate-200">
                        {s.jk}
                      </td>
                      <td className="py-1.5 px-3 text-center font-bold border-r border-slate-200">
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md inline-block ${
                            status.includes('Hadir')
                              ? 'text-emerald-800 bg-emerald-50'
                              : status.includes('Terlambat')
                              ? 'text-amber-800 bg-amber-50'
                              : status.includes('Izin')
                              ? 'text-blue-800 bg-blue-50'
                              : status.includes('Sakit')
                              ? 'text-orange-800 bg-orange-50'
                              : 'text-rose-800 bg-rose-50'
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-center text-[10px] text-slate-400">
                        {record?.waktu ? `${record.waktu} WIB` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Signature Area */}
            <div className="pt-8 grid grid-cols-2 text-center text-xs font-semibold text-slate-800">
              <div>
                <p>Mengetahui,</p>
                <p className="text-[11px] text-slate-500">Kepala Sekolah</p>
                <div className="h-16" />
                <p className="font-extrabold underline">{config.namaKepsek}</p>
                <p className="text-[10px] text-slate-500">NIP: {config.nipKepsek}</p>
              </div>

              <div>
                <p>{config.kota || 'Cianjur'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="text-[11px] text-slate-500">Guru Mata Pelajaran / Wali Kelas</p>
                <div className="h-16" />
                <p className="font-extrabold underline">{teacher.nama}</p>
                <p className="text-[10px] text-slate-500">NIP: {teacher.nip || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TAB 3: DIREKTORI SISWA ROMBEL ===== */}
      {activeTab === 'SISWA' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">
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
                    <Eye className="w-4 h-4 drop-shadow" />
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
          {/* Duty Teacher Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
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
              <span className="font-extrabold text-slate-700 block">Jadwal Piket Mingguan:</span>
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

          {/* Schedule & Guidelines Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
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
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Setelah jam {config.schedule.morningOnTimeEnd}, siswa tercatat terlambat secara otomatis.
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

      {/* ===== MODAL INPUT IZIN / SAKIT SISWA ===== */}
      {showIzinModal && targetStudent && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold text-slate-900">
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
                        ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
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
                  Keterangan / Alasan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Sakit demam, surat terlampir / Izin acara keluarga..."
                  value={izinKeterangan}
                  onChange={(e) => setIzinKeterangan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowIzinModal(false)}
                  className="px-4 py-2 text-slate-600 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit / Koreksi Data Presensi Siswa */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingRecord ? 'Edit / Koreksi Data Presensi' : 'Tambah Presensi Siswa'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingStudent.nama} ({editingStudent.kelas}) • NISN: {editingStudent.nisn}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAttendance} className="space-y-4 text-xs">
              {/* Kategori Switcher */}
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Kategori Presensi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditKategori('KELAS')}
                    className={`p-2 rounded-xl border text-center font-bold transition cursor-pointer ${
                      editKategori === 'KELAS'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Presensi KBM Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditKategori('APEL')}
                    className={`p-2 rounded-xl border text-center font-bold transition cursor-pointer ${
                      editKategori === 'APEL'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Presensi Apel Sekolah
                  </button>
                </div>
              </div>

              {editKategori === 'KELAS' && (
                <div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-teal-900 font-bold mb-1">
                        Mata Pelajaran (Mapel)
                      </label>
                      <select
                        value={editMapel}
                        onChange={(e) => setEditMapel(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden"
                      >
                        {OFFICIAL_SUBJECTS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-teal-900 font-bold mb-1">
                        Pertemuan Ke-
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={editPertemuanKe}
                        onChange={(e) => setEditPertemuanKe(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs font-bold text-center focus:outline-hidden"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-teal-900 font-bold mb-1">
                      Materi Pokok / Pembahasan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Bab 1 Pendahuluan..."
                      value={editMateriPokok}
                      onChange={(e) => setEditMateriPokok(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-teal-300 rounded-lg text-xs focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={editTanggal}
                    onChange={(e) => setEditTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Jam Presensi
                  </label>
                  <input
                    type="text"
                    value={editWaktu}
                    onChange={(e) => setEditWaktu(e.target.value)}
                    placeholder="07:05:00"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Sesi Waktu
                  </label>
                  <select
                    value={editSesi}
                    onChange={(e) => setEditSesi(e.target.value as AttendanceSession)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden"
                  >
                    <option value="Pagi">Pagi</option>
                    <option value="Siang">Siang</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Status Kehadiran
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { key: 'Hadir Tepat Waktu', label: 'Hadir Tepat' },
                    { key: 'Terlambat', label: 'Terlambat' },
                    { key: 'Izin', label: 'Izin' },
                    { key: 'Sakit', label: 'Sakit' },
                    { key: 'Alpa', label: 'Alpa' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setEditStatus(item.key)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition cursor-pointer ${
                        editStatus === item.key
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Keterangan / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Terlambat karena ban bocor / Izin acara keluarga..."
                  value={editKeterangan}
                  onChange={(e) => setEditKeterangan(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {editingRecord ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      handleDeleteAttendanceRecord(editingStudent, editingRecord);
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Data Ini</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-slate-600 font-bold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Aesthetic Student Detail Modal */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedDetailStudent}
        studentsList={classStudents}
        onSelectStudent={(s) => setSelectedDetailStudent(s)}
        attendance={attendance}
        config={config}
        onOpenIzinModal={(s) => handleOpenIzinModal(s)}
        onShowNotice={onShowNotice}
      />

      {/* Teacher QR Code Scanner Modal for KBM Kelas */}
      <TeacherQRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        selectedClass={selectedClass}
        selectedDate={selectedDate}
        selectedMapel={selectedMapel}
        pertemuanKe={pertemuanKe}
        materiPokok={materiPokok}
        students={students}
        attendance={attendance}
        onRecordAttendance={onRecordAttendance}
        onShowNotice={onShowNotice}
      />
    </div>
  );
};
