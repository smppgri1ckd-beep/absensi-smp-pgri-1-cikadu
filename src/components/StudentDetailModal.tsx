import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  User,
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock3,
  QrCode,
  Download,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Printer,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  Phone,
  Building2,
  CreditCard,
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig, TeacherUser } from '../types';
import { generateQrDataUrl } from '../utils/qr';
import { PgriLogo } from './PgriLogo';

interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  studentsList?: Student[];
  onSelectStudent?: (student: Student) => void;
  attendance?: AttendanceRecord[];
  config: SchoolConfig;
  teachers?: TeacherUser[];
  onOpenCardPrint?: (student: Student) => void;
  onOpenIzinModal?: (student: Student) => void;
  onShowNotice?: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  studentsList = [],
  onSelectStudent,
  attendance = [],
  config,
  teachers = [],
  onOpenCardPrint,
  onOpenIzinModal,
  onShowNotice,
}) => {
  const [activeTab, setActiveTab] = useState<'RINGKASAN' | 'RIWAYAT' | 'KARTU_QR'>('RINGKASAN');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [filterSession, setFilterSession] = useState<'ALL' | 'Pagi' | 'Siang'>('ALL');

  // Reset copied state on student change
  useEffect(() => {
    setCopied(false);
  }, [student?.nisn]);

  // Generate QR Code for this student
  useEffect(() => {
    let isMounted = true;
    if (student?.nisn) {
      generateQrDataUrl(student.nisn, 280).then((url) => {
        if (isMounted) setQrUrl(url);
      });
    } else {
      setQrUrl('');
    }
    return () => {
      isMounted = false;
    };
  }, [student?.nisn]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && studentsList.length > 1 && student && onSelectStudent) {
        const idx = studentsList.findIndex((s) => s.nisn === student.nisn);
        if (idx > 0) {
          onSelectStudent(studentsList[idx - 1]);
        }
      } else if (e.key === 'ArrowRight' && studentsList.length > 1 && student && onSelectStudent) {
        const idx = studentsList.findIndex((s) => s.nisn === student.nisn);
        if (idx < studentsList.length - 1) {
          onSelectStudent(studentsList[idx + 1]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, student, studentsList, onSelectStudent, onClose]);

  // Student Attendance Records
  const studentRecords = useMemo(() => {
    if (!student) return [];
    return attendance
      .filter((a) => a.nisn.trim() === student.nisn.trim())
      .sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
  }, [student, attendance]);

  // Filtered records by session
  const filteredRecords = useMemo(() => {
    if (filterSession === 'ALL') return studentRecords;
    return studentRecords.filter((r) => r.sesi === filterSession);
  }, [studentRecords, filterSession]);

  // Stats calculation
  const stats = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let izin = 0;
    let sakit = 0;
    let alpa = 0;

    studentRecords.forEach((r) => {
      const st = r.status;
      if (st === 'Hadir Tepat Waktu' || st === 'Pulang Tepat Waktu') hadir++;
      else if (st === 'Terlambat' || st === 'Pulang Terlambat') terlambat++;
      else if (st === 'Izin') izin++;
      else if (st === 'Sakit') sakit++;
      else if (st === 'Alpa') alpa++;
      else hadir++;
    });

    const total = hadir + terlambat + izin + sakit + alpa;
    const persentase =
      total > 0 ? Math.round(((hadir + terlambat) / total) * 100) : 100;

    return { total, hadir, terlambat, izin, sakit, alpa, persentase };
  }, [studentRecords]);

  // Find Wali Kelas for this student
  const waliKelas = useMemo(() => {
    if (!student) return null;
    return teachers.find((t) => t.waliKelas === student.kelas);
  }, [student, teachers]);

  // Today's attendance status
  const todayStr = new Date().toISOString().split('T')[0];
  const todayPagi = studentRecords.find((r) => r.tanggal === todayStr && r.sesi === 'Pagi');
  const todaySiang = studentRecords.find((r) => r.tanggal === todayStr && r.sesi === 'Siang');

  if (!isOpen || !student) return null;

  // Next / Prev index in list
  const currentIndex = studentsList.findIndex((s) => s.nisn === student.nisn);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < studentsList.length - 1;

  const handleCopyNisn = () => {
    navigator.clipboard.writeText(student.nisn);
    setCopied(true);
    if (onShowNotice) {
      onShowNotice('NISN Tersalin', `NISN ${student.nisn} (${student.nama}) berhasil disalin.`, 'info');
    }
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrUrl) return;
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = `QR_${student.nisn}_${student.nama.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (onShowNotice) {
      onShowNotice('Unduhan QR', 'File QR Code siswa berhasil diunduh.', 'success');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Top Aesthetic Header & Banner */}
        <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 shrink-0 overflow-hidden">
          {/* Subtle geometric pattern background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-blue-100 flex items-center gap-1.5 border border-white/20">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Kartu Profil Siswa</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[11px] font-bold">
                Siswa Aktif
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Previous Student */}
              {studentsList.length > 1 && (
                <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/15">
                  <button
                    type="button"
                    disabled={!hasPrev}
                    onClick={() => hasPrev && onSelectStudent && onSelectStudent(studentsList[currentIndex - 1])}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="Siswa Sebelumnya (Panah Kiri)"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono font-bold px-1.5 text-blue-100">
                    {currentIndex + 1}/{studentsList.length}
                  </span>
                  <button
                    type="button"
                    disabled={!hasNext}
                    onClick={() => hasNext && onSelectStudent && onSelectStudent(studentsList[currentIndex + 1])}
                    className="p-1.5 hover:bg-white/20 rounded-lg text-white disabled:opacity-30 disabled:hover:bg-transparent transition cursor-pointer"
                    title="Siswa Berikutnya (Panah Kanan)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 bg-white/10 hover:bg-white/25 text-white rounded-xl transition border border-white/20 cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Student Hero Info */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-4 mt-4 pt-1">
            {/* Student Photo */}
            <div className="relative group shrink-0">
              <img
                src={student.fotoUrl}
                alt={student.nama}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-3 border-white/90 shadow-lg bg-slate-100"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src =
                    'https://placehold.co/120x120/ffffff/64748b?text=Siswa';
                }}
              />
              <span
                className={`absolute -bottom-1.5 -right-1.5 px-2 py-0.5 rounded-md text-[10px] font-black border uppercase shadow-sm ${
                  student.jk === 'L'
                    ? 'bg-sky-500 text-white border-sky-300'
                    : 'bg-rose-500 text-white border-rose-300'
                }`}
              >
                {student.jk === 'L' ? 'L' : 'P'}
              </span>
            </div>

            {/* Name, NISN & Class */}
            <div className="flex-1 text-center sm:text-left overflow-hidden">
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-tight drop-shadow-xs">
                {student.nama}
              </h2>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {/* NISN Pill with copy */}
                <button
                  type="button"
                  onClick={handleCopyNisn}
                  className="px-2.5 py-1 bg-white/15 hover:bg-white/25 transition rounded-lg text-xs font-mono font-bold text-white border border-white/20 flex items-center gap-1.5 cursor-pointer"
                  title="Klik untuk menyalin NISN"
                >
                  <span>NISN: {student.nisn}</span>
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5 text-blue-200" />}
                </button>

                {/* Class Badge */}
                <span className="px-2.5 py-1 bg-amber-400 text-amber-950 font-black rounded-lg text-xs shadow-xs">
                  Kelas {student.kelas}
                </span>

                {/* Gender Tag */}
                <span className="px-2.5 py-1 bg-white/10 text-blue-100 font-bold rounded-lg text-xs border border-white/15">
                  {student.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                </span>
              </div>

              {/* School and Wali Kelas Meta */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-1 text-[11px] text-blue-100/90 mt-2.5">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 opacity-80" />
                  <span>{config.namaSekolah}</span>
                </span>
                {waliKelas && (
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-3.5 h-3.5 opacity-80" />
                    <span>Wali: <strong>{waliKelas.nama}</strong></span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 pt-2 flex items-center gap-2 overflow-x-auto text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('RINGKASAN')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'RINGKASAN'
                ? 'border-blue-600 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ringkasan Kehadiran</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('RIWAYAT')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'RIWAYAT'
                ? 'border-blue-600 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Histori Presensi ({studentRecords.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('KARTU_QR')}
            className={`pb-2.5 px-3 border-b-2 transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
              activeTab === 'KARTU_QR'
                ? 'border-blue-600 text-blue-700 font-extrabold'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Kartu Pelajar & QR Code</span>
          </button>
        </div>

        {/* Tab Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* TAB 1: RINGKASAN STATISTIK */}
          {activeTab === 'RINGKASAN' && (
            <div className="space-y-4">
              {/* Today's Status Box */}
              <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Status Presensi Hari Ini ({todayStr})</span>
                  </span>
                  <span className="text-[11px] font-bold text-blue-700">
                    Sesi Pagi & Siang
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Pagi */}
                  <div className="bg-white border border-blue-100 rounded-xl p-3 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      1. Sesi Pagi (Kedatangan)
                    </span>
                    {todayPagi ? (
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          {todayPagi.status}
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {todayPagi.waktu} WIB
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="italic text-[11px]">Belum Presensi Pagi</span>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          Standar: {config.schedule.morningStart} - {config.schedule.morningOnTimeEnd}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Siang */}
                  <div className="bg-white border border-blue-100 rounded-xl p-3 space-y-1 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      2. Sesi Siang (Kepulangan)
                    </span>
                    {todaySiang ? (
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-slate-900 flex items-center gap-1 text-blue-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          {todaySiang.status}
                        </span>
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {todaySiang.waktu} WIB
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="italic text-[11px]">Belum Presensi Pulang</span>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">
                          Standar: {config.schedule.afternoonOnTimeEnd} - {config.schedule.afternoonCutoff}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase">Tepat Waktu</span>
                  <p className="text-xl font-black text-emerald-800">{stats.hadir}</p>
                  <span className="text-[10px] text-emerald-600">Presensi Sesuai Jam</span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 uppercase">Terlambat</span>
                  <p className="text-xl font-black text-amber-800">{stats.terlambat}</p>
                  <span className="text-[10px] text-amber-600">Melewati Batas</span>
                </div>

                <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-blue-700 uppercase">Izin / Sakit</span>
                  <p className="text-xl font-black text-blue-800">{stats.izin + stats.sakit}</p>
                  <span className="text-[10px] text-blue-600">Ada Keterangan</span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-3 text-center space-y-1">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Alpa</span>
                  <p className="text-xl font-black text-rose-800">{stats.alpa}</p>
                  <span className="text-[10px] text-rose-600">Tanpa Berita</span>
                </div>
              </div>

              {/* Attendance Discipline Score Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800 text-xs">
                    Tingkat Disiplin Kehadiran
                  </span>
                  <span className="font-black text-sm text-blue-700 font-mono">
                    {stats.persentase}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      stats.persentase >= 85
                        ? 'bg-emerald-500'
                        : stats.persentase >= 70
                        ? 'bg-blue-500'
                        : stats.persentase >= 50
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, stats.persentase))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Total Aktivitas Presensi: <strong>{stats.total} kali</strong></span>
                  <span className="font-bold text-slate-700">
                    {stats.persentase >= 85
                      ? '⭐ Sangat Disiplin'
                      : stats.persentase >= 70
                      ? '👍 Cukup Rajin'
                      : '⚠️ Perlu Perhatian & Pembinaan'}
                  </span>
                </div>
              </div>

              {/* Quick Actions Footer for Teachers/Admins */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {onOpenIzinModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenIzinModal(student);
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Catat Izin / Sakit</span>
                  </button>
                )}

                {onOpenCardPrint && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenCardPrint(student);
                      onClose();
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cetak Kartu Siswa</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RIWAYAT LENGKAP */}
          {activeTab === 'RIWAYAT' && (
            <div className="space-y-3">
              {/* Session Filter Controls */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <span className="font-extrabold text-slate-700 text-xs">
                  Semua Riwayat Log Presensi ({filteredRecords.length})
                </span>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setFilterSession('ALL')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      filterSession === 'ALL'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSession('Pagi')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      filterSession === 'Pagi'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pagi (Masuk)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterSession('Siang')}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      filterSession === 'Siang'
                        ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Siang (Pulang)
                  </button>
                </div>
              </div>

              {/* Records List Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3">Tanggal</th>
                      <th className="py-2.5 px-3">Sesi</th>
                      <th className="py-2.5 px-3">Waktu (WIB)</th>
                      <th className="py-2.5 px-3">Status Kehadiran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                          Belum ada rekaman data presensi untuk siswa ini.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((r, idx) => {
                        const isHadir = r.status.includes('Hadir') || r.status.includes('Pulang Tepat');
                        const isLate = r.status.includes('Terlambat');
                        const isIzin = r.status.includes('Izin');
                        const isSakit = r.status.includes('Sakit');
                        const isAlpa = r.status.includes('Alpa');

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {r.tanggal}
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.sesi === 'Pagi'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}
                              >
                                {r.sesi}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {r.waktu} WIB
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                  isHadir
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : isLate
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : isIzin
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : isSakit
                                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}
                              >
                                {isHadir && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                                {isLate && <Clock3 className="w-3 h-3 text-amber-600" />}
                                {isIzin && <FileText className="w-3 h-3 text-blue-600" />}
                                {isSakit && <AlertTriangle className="w-3 h-3 text-orange-600" />}
                                <span>{r.status}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: KARTU PELAJAR & QR CODE */}
          {activeTab === 'KARTU_QR' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                {/* QR Code Presentation */}
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center space-y-3 flex flex-col items-center justify-center">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4 text-blue-600" />
                    <span>Kode QR Presensi Siswa</span>
                  </span>

                  {/* QR Image Box */}
                  <div className="p-3 bg-white border-2 border-slate-900 rounded-2xl shadow-md">
                    {qrUrl ? (
                      <img
                        src={qrUrl}
                        alt={`QR ${student.nisn}`}
                        className="w-44 h-44 object-contain"
                      />
                    ) : (
                      <div className="w-44 h-44 flex items-center justify-center text-slate-400">
                        Membuat QR...
                      </div>
                    )}
                  </div>

                  <div className="font-mono text-center">
                    <p className="font-extrabold text-sm text-slate-900">{student.nisn}</p>
                    <p className="text-[10px] text-slate-500">Scan di kamera Kiosk Presensi Sekolah</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDownloadQr}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyNisn}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Tersalin' : 'Salin NISN'}</span>
                    </button>
                  </div>
                </div>

                {/* Digital Card Preview Mockup */}
                <div className="space-y-3">
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Format Kartu Siswa Digital</span>
                  </span>

                  {/* Mini Card Preview */}
                  <div className="relative bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 text-white p-4 rounded-2xl border border-blue-900 shadow-lg space-y-3 overflow-hidden">
                    {/* Hologram aesthetic strip */}
                    <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />

                    {/* Card Header */}
                    <div className="flex items-center gap-2 border-b border-white/20 pb-2">
                      <div className="w-7 h-7 bg-white rounded-lg p-0.5 flex items-center justify-center shrink-0">
                        {config.logoUrl ? (
                          <img src={config.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <PgriLogo className="w-full h-full" />
                        )}
                      </div>
                      <div className="overflow-hidden leading-tight">
                        <p className="text-[10px] font-black uppercase tracking-wider text-amber-300 truncate">
                          {config.namaSekolah}
                        </p>
                        <p className="text-[8px] text-blue-100 font-bold uppercase tracking-tight">
                          Kartu Identitas Siswa Resmi
                        </p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex items-center gap-3">
                      <img
                        src={student.fotoUrl}
                        alt={student.nama}
                        className="w-14 h-16 rounded-lg object-cover border-2 border-white/80 bg-slate-200 shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src =
                            'https://placehold.co/100x120/ffffff/64748b?text=Foto';
                        }}
                      />

                      <div className="text-[10px] space-y-0.5 overflow-hidden">
                        <p className="font-black text-white text-xs truncate drop-shadow-xs">
                          {student.nama}
                        </p>
                        <p className="font-mono text-[10px] text-blue-200 font-bold">
                          NISN: {student.nisn}
                        </p>
                        <p className="text-blue-100 font-medium">
                          Kelas: <strong className="text-amber-300">{student.kelas}</strong> &bull; {student.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </p>
                        <p className="text-[8px] text-blue-200 truncate">
                          {config.alamat}
                        </p>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="flex items-center justify-between text-[8px] border-t border-white/15 pt-1.5 text-blue-200">
                      <span>NPSN: {config.npsn}</span>
                      <span className="text-amber-300 font-bold">TERAKREDITASI</span>
                    </div>
                  </div>

                  {onOpenCardPrint && (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenCardPrint(student);
                        onClose();
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Cetak Fisik Kartu Siswa (F4 / A4)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs shrink-0">
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <span>Tekan</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700">Esc</kbd>
            <span>untuk menutup,</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700">←</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] text-slate-700">→</kbd>
            <span>navigasi siswa</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
