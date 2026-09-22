import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Calendar,
  AlertCircle,
  TrendingUp,
  UserCheck,
  Building2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Camera,
  RefreshCw,
  Eye,
  Printer,
  Download,
  Phone,
  BookOpen,
  ArrowLeft,
  X,
  MessageCircle,
  FileText,
  Award,
  Layers,
  Check,
  Clock3,
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig, TeacherUser } from '../types';
import { StudentDetailModal } from './StudentDetailModal';
import { exportSingleStudentAttendancePDF } from '../utils/export';

interface PublicRekapViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  config: SchoolConfig;
  dayKey: string;
  teachers?: TeacherUser[];
  onGoToKiosk: () => void;
  onOpenLogin: () => void;
}

export const PublicRekapView: React.FC<PublicRekapViewProps> = ({
  students,
  attendance,
  config,
  dayKey,
  teachers = [],
  onGoToKiosk,
  onOpenLogin,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchParentQuery, setSearchParentQuery] = useState<string>('');
  const [selectedStudentNisn, setSelectedStudentNisn] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [studentHistoryTab, setStudentHistoryTab] = useState<'ALL' | 'APEL' | 'KELAS'>('ALL');

  // Student Detail Modal state
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenStudentDetail = (s: Student) => {
    setSelectedDetailStudent(s);
    setIsDetailModalOpen(true);
  };

  // Daftar kelas unik
  const classes = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort(),
    [students]
  );

  // Filter presensi sesuai tanggal terpilih
  const dateAttendance = useMemo(
    () => attendance.filter((a) => a.tanggal === selectedDate),
    [attendance, selectedDate]
  );

  // Apakah sedang dalam mode pencarian siswa
  const isSearchActive = Boolean(searchParentQuery.trim() || selectedStudentNisn);

  // Hasil pencarian siswa
  const matchedStudents = useMemo(() => {
    const q = searchParentQuery.trim().toLowerCase();
    if (!q) {
      if (selectedStudentNisn) {
        const found = students.find((s) => s.nisn === selectedStudentNisn);
        return found ? [found] : [];
      }
      return [];
    }
    return students.filter((s) => {
      const matchesClass = selectedClass === 'ALL' || s.kelas === selectedClass;
      const matchesQuery =
        s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q);
      return matchesClass && matchesQuery;
    });
  }, [students, searchParentQuery, selectedClass, selectedStudentNisn]);

  // Siswa aktif yang difokuskan (jika dipilih atau jika hasil pencarian tepat 1 siswa)
  const activeStudent = useMemo(() => {
    if (selectedStudentNisn) {
      return students.find((s) => s.nisn === selectedStudentNisn) || null;
    }
    if (searchParentQuery.trim() && matchedStudents.length === 1) {
      return matchedStudents[0];
    }
    return null;
  }, [students, selectedStudentNisn, searchParentQuery, matchedStudents]);

  // Log presensi hari ini untuk siswa aktif
  const activeStudentTodayLogs = useMemo(() => {
    if (!activeStudent) return [];
    return dateAttendance.filter(
      (a) => String(a.nisn).trim() === String(activeStudent.nisn).trim()
    );
  }, [dateAttendance, activeStudent]);

  // Presensi Apel Pagi, Apel Siang, dan KBM Kelas hari ini untuk siswa aktif
  const activeMorningLog = useMemo(
    () =>
      activeStudentTodayLogs.find(
        (l) => l.sesi === 'Pagi' && (l.kategori === 'APEL' || !l.kategori)
      ),
    [activeStudentTodayLogs]
  );

  const activeAfternoonLog = useMemo(
    () =>
      activeStudentTodayLogs.find(
        (l) => l.sesi === 'Siang' && (l.kategori === 'APEL' || !l.kategori)
      ),
    [activeStudentTodayLogs]
  );

  const activeKbmTodayLogs = useMemo(
    () => activeStudentTodayLogs.filter((l) => l.kategori === 'KELAS'),
    [activeStudentTodayLogs]
  );

  // Seluruh riwayat presensi siswa aktif (bisa difilter tab: Semua / Apel / KBM)
  const activeStudentAllLogs = useMemo(() => {
    if (!activeStudent) return [];
    const all = attendance.filter(
      (a) => String(a.nisn).trim() === String(activeStudent.nisn).trim()
    );
    return all.sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));
  }, [attendance, activeStudent]);

  const activeStudentFilteredLogs = useMemo(() => {
    if (studentHistoryTab === 'APEL') {
      return activeStudentAllLogs.filter((a) => a.kategori === 'APEL' || !a.kategori);
    }
    if (studentHistoryTab === 'KELAS') {
      return activeStudentAllLogs.filter((a) => a.kategori === 'KELAS');
    }
    return activeStudentAllLogs;
  }, [activeStudentAllLogs, studentHistoryTab]);

  // Statistik akumulasi siswa aktif
  const studentStats = useMemo(() => {
    if (!activeStudent) return { total: 0, onTime: 0, late: 0, izin: 0, rate: 100 };
    const logs = activeStudentAllLogs;
    const total = logs.length;
    const onTime = logs.filter((l) => l.status.includes('Tepat Waktu')).length;
    const late = logs.filter((l) => l.status.includes('Terlambat')).length;
    const izin = logs.filter((l) => l.status === 'Izin' || l.status === 'Sakit').length;
    const rate = total > 0 ? Math.round(((onTime + late) / total) * 100) : 100;
    return { total, onTime, late, izin, rate };
  }, [activeStudent, activeStudentAllLogs]);

  // Statistik Kehadiran Sekolah (Mode Umum)
  const totalStudents = students.length;
  const morningPresentSet = useMemo(
    () =>
      new Set(
        dateAttendance
          .filter((a) => a.sesi === 'Pagi' && (a.kategori === 'APEL' || !a.kategori))
          .map((a) => a.nisn.trim())
      ),
    [dateAttendance]
  );
  const afternoonPresentSet = useMemo(
    () =>
      new Set(
        dateAttendance
          .filter((a) => a.sesi === 'Siang' && (a.kategori === 'APEL' || !a.kategori))
          .map((a) => a.nisn.trim())
      ),
    [dateAttendance]
  );
  const allPresentUnique = useMemo(
    () => new Set(dateAttendance.map((a) => a.nisn.trim())).size,
    [dateAttendance]
  );

  const onTimeMorning = dateAttendance.filter(
    (a) => a.sesi === 'Pagi' && a.status === 'Hadir Tepat Waktu'
  ).length;
  const lateMorning = dateAttendance.filter(
    (a) => a.sesi === 'Pagi' && a.status === 'Terlambat'
  ).length;
  const earlyLeave = dateAttendance.filter(
    (a) => a.sesi === 'Siang' && a.status === 'Pulang Mendahului'
  ).length;
  const onTimeAfternoon = dateAttendance.filter(
    (a) => a.sesi === 'Siang' && a.status === 'Pulang Tepat Waktu'
  ).length;

  const attendanceRate =
    totalStudents > 0 ? Math.round((allPresentUnique / totalStudents) * 100) : 0;

  // Guru Piket Hari Ini
  const dutyTeacher =
    config.jadwalPiket[dayKey as keyof typeof config.jadwalPiket] || config.jadwalPiket.senin;

  // Statistik per rombel kelas (Mode Umum)
  const classBreakdowns = useMemo(() => {
    return classes.map((c) => {
      const classStudents = students.filter((s) => s.kelas === c);
      const totalInClass = classStudents.length;
      const presentInClass = classStudents.filter((s) =>
        dateAttendance.some((a) => a.nisn.trim() === s.nisn.trim())
      ).length;
      const pct = totalInClass > 0 ? Math.round((presentInClass / totalInClass) * 100) : 0;
      return {
        kelas: c,
        total: totalInClass,
        hadir: presentInClass,
        pct,
      };
    });
  }, [classes, students, dateAttendance]);

  // Daftar tabel kehadiran umum (HANYA digunakan saat TIDAK mencari anak)
  const filteredTableList = useMemo(() => {
    return dateAttendance.filter((rec) => {
      const matchClass = selectedClass === 'ALL' || rec.kelas === selectedClass;
      const matchStatus = statusFilter === 'ALL' || rec.status === statusFilter;
      return matchClass && matchStatus;
    });
  }, [dateAttendance, selectedClass, statusFilter]);

  // Reset pencarian ke mode umum
  const handleClearSearch = () => {
    setSearchParentQuery('');
    setSelectedStudentNisn(null);
  };

  // Unduh Bukti PDF Presensi Ananda
  const handleDownloadStudentSlip = () => {
    if (!activeStudent) return;
    exportSingleStudentAttendancePDF(config, activeStudent, attendance);
  };

  // WhatsApp link untuk konfirmasi ke sekolah / guru piket
  const handleWhatsAppContact = () => {
    if (!activeStudent) return;
    const phone = (config.kontak || '').replace(/[^0-9]/g, '');
    const targetPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone || '628123456789';
    const message = encodeURIComponent(
      `Assalamu'alaikum / Selamat Pagi Pihak ${config.namaSekolah},\n\nSaya orang tua/wali dari ananda:\nNama: ${activeStudent.nama}\nNISN: ${activeStudent.nisn}\nKelas: ${activeStudent.kelas}\n\nIngin konfirmasi mengenai kehadiran ananda pada hari ini (${selectedDate}). Terima kasih.`
    );
    window.open(`https://wa.me/${targetPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner Publik */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg border border-blue-600/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-white/20 uppercase tracking-wider backdrop-blur-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Portal Monitoring Orang Tua &amp; Publik
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                Real-time Presensi
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              Pantauan Kehadiran Siswa Real-Time
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Portal transparansi kehadiran <strong>{config.namaSekolah}</strong>. Ketik nama atau NISN ananda di kolom pencarian di bawah untuk memeriksa kehadiran secara instan dan akurat.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="no-print flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={onGoToKiosk}
              className="px-4 py-2.5 bg-white text-blue-800 hover:bg-blue-50 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-blue-600" />
              <span>Buka Scanner Kiosk</span>
            </button>
            <button
              type="button"
              onClick={onOpenLogin}
              className="px-4 py-2.5 bg-blue-800/80 hover:bg-blue-800 text-white border border-white/20 rounded-2xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-blue-300" />
              <span>Login Guru / Admin</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION PENCARIAN SISWA UNTUK ORANG TUA */}
      <div className="bg-white border-2 border-blue-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Pencarian Khusus Siswa (Pantauan Orang Tua)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Data yang ditampilkan di bawah akan <strong>fokus hanya pada anak yang Anda cari</strong>.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600">Pilih Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Input Pencarian Siswa & Filter Kelas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Ketik Nama Siswa atau NISN ananda (Contoh: Ahmad, Siti, 008...)"
              value={searchParentQuery}
              onChange={(e) => {
                setSearchParentQuery(e.target.value);
                if (selectedStudentNisn) setSelectedStudentNisn(null);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition"
            />
            {searchParentQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
                title="Hapus Pencarian"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-hidden focus:border-blue-500"
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

        {/* Banner Status Mode Pencarian */}
        {isSearchActive && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-blue-50/90 border border-blue-200 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              <span className="font-bold text-blue-900">
                Mode Pantauan Hasil Pencarian:
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 font-extrabold text-blue-700">
                {activeStudent
                  ? activeStudent.nama
                  : `"${searchParentQuery}" (${matchedStudents.length} siswa)`}
              </span>
              <span className="text-slate-500 hidden sm:inline">
                &bull; Menampilkan data khusus anak yang dicari saja.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset &amp; Tampilkan Semua</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* KONDISI 1: MODE PENCARIAN AKTIF (HANYA TAMPILKAN ANAK YANG DICARI)         */}
      {/* ========================================================================= */}
      {isSearchActive ? (
        <div className="space-y-6">
          {/* Sub-Kasus 1.1: Tidak Ditemukan Siswa */}
          {matchedStudents.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto text-amber-500">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-black text-slate-800">
                  Siswa Tidak Ditemukan
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tidak ada data siswa yang cocok dengan kata kunci "<strong>{searchParentQuery}</strong>" di {selectedClass === 'ALL' ? 'Semua Kelas' : `Kelas ${selectedClass}`}.
                </p>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-left text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Tips Pencarian untuk Orang Tua:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-500">
                  <li>Pastikan penulisan ejaan nama sudah benar.</li>
                  <li>Anda dapat mencoba mengetik nomor NISN ananda (10 digit).</li>
                  <li>Ubah pilihan kelas di samping kanan menjadi "Semua Kelas".</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={handleClearSearch}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                Kembali ke Pantauan Umum Sekolah
              </button>
            </div>
          )}

          {/* Sub-Kasus 1.2: Ditemukan Lebih Dari 1 Siswa (Tampilkan Kartu Khusus Siswa Terkait Saja) */}
          {matchedStudents.length > 1 && !selectedStudentNisn && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-slate-900">
                    Ditemukan {matchedStudents.length} Siswa yang Cocok
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Silakan klik kartu anak Anda untuk membuka rincian lengkap dan riwayat kehadirannya:
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {matchedStudents.map((st) => {
                  const stLogs = dateAttendance.filter(
                    (a) => String(a.nisn).trim() === String(st.nisn).trim()
                  );
                  const morning = stLogs.find(
                    (l) => l.sesi === 'Pagi' && (l.kategori === 'APEL' || !l.kategori)
                  );
                  const afternoon = stLogs.find(
                    (l) => l.sesi === 'Siang' && (l.kategori === 'APEL' || !l.kategori)
                  );

                  return (
                    <div
                      key={st.nisn}
                      className="p-4 bg-slate-50/70 border-2 border-slate-200 hover:border-blue-500 rounded-2xl transition space-y-3.5 group hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black text-white shadow-xs shrink-0 ${
                            st.jk === 'L'
                              ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                              : 'bg-gradient-to-tr from-rose-500 to-pink-600'
                          }`}
                        >
                          {st.fotoUrl ? (
                            <img
                              src={st.fotoUrl}
                              alt={st.nama}
                              className="w-full h-full object-cover rounded-2xl"
                            />
                          ) : (
                            st.nama.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-blue-800 uppercase">
                              Kelas {st.kelas}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500">
                              {st.nisn}
                            </span>
                          </div>
                          <p className="text-sm font-black text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {st.nama}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {st.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}
                          </p>
                        </div>
                      </div>

                      {/* Status Kehadiran Hari Ini */}
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-0.5">
                          <span className="text-slate-400 block font-bold">Apel Pagi:</span>
                          {morning ? (
                            <span className="font-extrabold text-emerald-700 block truncate">
                              ✓ {morning.waktu} WIB
                            </span>
                          ) : (
                            <span className="font-bold text-amber-600 block">
                              Belum Masuk
                            </span>
                          )}
                        </div>
                        <div className="p-2 bg-white rounded-xl border border-slate-200 space-y-0.5">
                          <span className="text-slate-400 block font-bold">Apel Siang:</span>
                          {afternoon ? (
                            <span className="font-extrabold text-blue-700 block truncate">
                              ✓ {afternoon.waktu} WIB
                            </span>
                          ) : (
                            <span className="font-bold text-slate-500 block">
                              Belum Pulang
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Tombol Pilih Siswa */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentNisn(st.nisn)}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>Pantau Detail Ananda</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenStudentDetail(st)}
                          className="p-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl transition cursor-pointer"
                          title="Lihat Kartu QR Siswa"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-Kasus 1.3: DOSSIER EKSKLUSIF SISWA TERPILIH (HANYA DATA SISWA INI) */}
          {activeStudent && (
            <div className="space-y-6 animate-scale-in">
              {/* KARTU PROFIL & RINGKASAN EKSEKUTIF SISWA */}
              <div className="bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-white border-2 border-blue-300 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-blue-100 pb-5">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center text-2xl sm:text-3xl font-black text-white shadow-md shrink-0 ${
                        activeStudent.jk === 'L'
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                          : 'bg-gradient-to-tr from-rose-500 to-pink-600'
                      }`}
                    >
                      {activeStudent.fotoUrl ? (
                        <img
                          src={activeStudent.fotoUrl}
                          alt={activeStudent.nama}
                          className="w-full h-full object-cover rounded-3xl"
                        />
                      ) : (
                        activeStudent.nama.charAt(0)
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-blue-600 text-white uppercase tracking-wide">
                          Kelas {activeStudent.kelas}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                          NISN: {activeStudent.nisn}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                          {activeStudent.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}
                        </span>
                      </div>
                      <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
                        {activeStudent.nama}
                      </h3>
                      <p className="text-xs text-slate-500 flex items-center gap-2">
                        <span>Status Hari Ini ({selectedDate}):</span>
                        {activeMorningLog ? (
                          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            ● Sudah di Sekolah ({activeMorningLog.status})
                          </span>
                        ) : (
                          <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ○ Belum Ada Presensi Masuk
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Tombol Aksi Orang Tua */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadStudentSlip}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      title="Unduh Slip Bukti Presensi Siswa PDF Resmi"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Cetak Slip PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenStudentDetail(activeStudent)}
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      title="Lihat Kartu Pelajar Digital & Barcode QR Siswa"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Kartu QR Digital</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleWhatsAppContact}
                      className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                      title="Kirim pesan WhatsApp ke kontak sekolah / guru piket"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Konfirmasi Guru</span>
                    </button>
                    {matchedStudents.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSelectedStudentNisn(null)}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Pilih Siswa Lain
                      </button>
                    )}
                  </div>
                </div>

                {/* STATUS KEHADIRAN HARI INI: 3 KARTU (APEL PAGI, KELAS KBM, APEL SIANG) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      Status Presensi Ananda pada Tanggal: {selectedDate}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Sesi 1: Apel Pagi */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-blue-900 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          1. Apel Masuk (Pagi)
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {config.schedule.morningStart} - {config.schedule.morningOnTimeEnd} WIB
                        </span>
                      </div>

                      {activeMorningLog ? (
                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-emerald-800">
                              {activeMorningLog.status}
                            </span>
                            <span className="font-mono text-xs font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                              {activeMorningLog.waktu} WIB
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            Ananda telah hadir dan tercatat di gerbang sekolah.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-800">
                              Belum Ada Presensi Masuk
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                              Menunggu
                            </span>
                          </div>
                          <p className="text-[11px] text-amber-700">
                            Belum terdeteksi scan kartu QR pada pagi hari ini.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Sesi 2: KBM Tatap Muka di Kelas */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-indigo-900 flex items-center gap-1">
                          <BookOpen className="w-4 h-4 text-indigo-600" />
                          2. KBM Kelas Hari Ini
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {activeKbmTodayLogs.length} Mapel Tercatat
                        </span>
                      </div>

                      {activeKbmTodayLogs.length > 0 ? (
                        <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                          {activeKbmTodayLogs.map((kbm) => (
                            <div
                              key={kbm.id}
                              className="p-2 bg-indigo-50/80 border border-indigo-200 rounded-xl flex items-center justify-between text-[11px]"
                            >
                              <div className="truncate">
                                <span className="font-bold text-indigo-900 block truncate">
                                  {kbm.mapel || 'Pelajaran'} (P-{kbm.pertemuanKe || '1'})
                                </span>
                                <span className="text-[10px] text-indigo-600">
                                  Guru: {kbm.guruNama || 'Pengajar'} &bull; {kbm.waktu} WIB
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 shrink-0">
                                Hadir
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-[11px] py-3.5">
                          Belum ada presensi KBM kelas oleh guru mapel pada tanggal ini.
                        </div>
                      )}
                    </div>

                    {/* Sesi 3: Apel Kepulangan */}
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-blue-900 flex items-center gap-1">
                          <Clock className="w-4 h-4 text-blue-600" />
                          3. Apel Pulang (Siang)
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {config.schedule.afternoonOnTimeEnd} - {config.schedule.afternoonCutoff} WIB
                        </span>
                      </div>

                      {activeAfternoonLog ? (
                        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-blue-800">
                              {activeAfternoonLog.status}
                            </span>
                            <span className="font-mono text-xs font-extrabold text-blue-800 bg-white px-2 py-0.5 rounded border border-blue-200">
                              {activeAfternoonLog.waktu} WIB
                            </span>
                          </div>
                          <p className="text-[11px] text-blue-700 font-medium">
                            Ananda telah melakukan presensi kepulangan sekolah.
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700">
                              Belum Presensi Pulang
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded">
                              Di Sekolah
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">
                            Presensi pulang dilakukan saat jam pembelajaran berakhir.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* REKAPITULASI AKUMULASI STATISTIK KEHADIRAN ANANDA */}
                <div className="pt-2 border-t border-blue-100">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                      <span className="text-[11px] font-bold text-slate-500 block">Total Kehadiran</span>
                      <span className="text-xl font-black text-slate-900">{studentStats.total}</span>
                      <span className="text-[10px] text-slate-400 block">Sesi tercatat</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                      <span className="text-[11px] font-bold text-emerald-700 block">Tepat Waktu</span>
                      <span className="text-xl font-black text-emerald-600">{studentStats.onTime}</span>
                      <span className="text-[10px] text-slate-400 block">Kedatangan disiplin</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                      <span className="text-[11px] font-bold text-amber-700 block">Terlambat</span>
                      <span className="text-xl font-black text-amber-600">{studentStats.late}</span>
                      <span className="text-[10px] text-slate-400 block">Sesi keterlambatan</span>
                    </div>
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                      <span className="text-[11px] font-bold text-indigo-700 block">Tingkat Disiplin</span>
                      <span className="text-xl font-black text-indigo-600">{studentStats.rate}%</span>
                      <span className="text-[10px] text-slate-400 block">Rasio kehadiran</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* TABEL RIWAYAT PRESENSI KHUSUS ANANDA (HANYA DATA ANANDA) */}
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Riwayat Presensi Ananda ({activeStudent.nama}) &bull; {activeStudentFilteredLogs.length} Catatan
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Seluruh rekaman log presensi milik ananda tersusun dari yang terbaru.
                    </p>
                  </div>

                  {/* Filter Tab Kategori Khusus Ananda */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setStudentHistoryTab('ALL')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        studentHistoryTab === 'ALL'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Semua Log
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentHistoryTab('APEL')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        studentHistoryTab === 'APEL'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Apel Sekolah
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentHistoryTab('KELAS')}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                        studentHistoryTab === 'KELAS'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      KBM Kelas
                    </button>
                  </div>
                </div>

                {/* Tabel Rekaman Siswa Terpilih */}
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">Kategori &amp; Sesi / Mapel</th>
                        <th className="py-2.5 px-3">Waktu (WIB)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Keterangan / Guru</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {activeStudentFilteredLogs.length > 0 ? (
                        activeStudentFilteredLogs.map((rec, idx) => (
                          <tr key={rec.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold font-mono text-slate-800">
                              {rec.tanggal}
                            </td>
                            <td className="py-2.5 px-3">
                              {rec.kategori === 'KELAS' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                                  <BookOpen className="w-3 h-3" />
                                  KBM: {rec.mapel || 'Pelajaran'} (P-{rec.pertemuanKe || '1'})
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold ${
                                    rec.sesi === 'Pagi'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  Apel Sesi {rec.sesi}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              {rec.waktu} WIB
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  rec.status.includes('Tepat Waktu')
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : rec.status.includes('Terlambat')
                                    ? 'bg-amber-100 text-amber-800'
                                    : rec.status === 'Izin' || rec.status === 'Sakit'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-slate-100 text-slate-800'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {rec.kategori === 'KELAS'
                                ? `Guru: ${rec.guruNama || '-'} ${rec.materiPokok ? `(${rec.materiPokok})` : ''}`
                                : 'Scan Gerbang / Apel Sekolah'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                            Belum ada rekaman presensi pada filter ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* KONDISI 2: MODE UMUM / SEKOLAH (SAAT KOLOM PENCARIAN KOSONG)              */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* SECTION 2: RINGKASAN STATISTIK KEHADIRAN HARI INI */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total Terdaftar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold text-slate-600">Total Siswa</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-900">{totalStudents}</p>
              <p className="text-[11px] text-slate-500 font-medium">Siswa terdaftar aktif</p>
            </div>

            {/* Hadir Pagi */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold text-emerald-700">Hadir Masuk (Pagi)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-emerald-600">{morningPresentSet.size}</p>
                <span className="text-xs font-bold text-slate-400 font-mono">/ {totalStudents}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Tepat Waktu: <strong className="text-emerald-700">{onTimeMorning}</strong> &bull; Terlambat: <strong className="text-amber-700">{lateMorning}</strong>
              </p>
            </div>

            {/* Hadir Siang (Kepulangan) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold text-blue-700">Presensi Pulang (Siang)</span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-blue-600">{afternoonPresentSet.size}</p>
                <span className="text-xs font-bold text-slate-400 font-mono">/ {totalStudents}</span>
              </div>
              <p className="text-[10px] text-slate-500">
                Standar: <strong className="text-blue-700">{onTimeAfternoon}</strong> &bull; Mendahului: <strong className="text-amber-700">{earlyLeave}</strong>
              </p>
            </div>

            {/* Persentase Kehadiran */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold text-indigo-700">Tingkat Kehadiran</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-indigo-600">{attendanceRate}%</p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Guru Piket: <strong>{dutyTeacher?.nama || 'Bertugas'}</strong>
              </p>
            </div>
          </div>

          {/* SECTION: RINGKASAN KEHADIRAN PER KELAS / ROMBEL */}
          {classBreakdowns.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Distribusi Kehadiran per Rombel Kelas (Tanggal {selectedDate})
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {classBreakdowns.map((cb) => (
                  <div
                    key={cb.kelas}
                    className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">
                        Kelas {cb.kelas}
                      </span>
                      <span className="text-[10px] font-black font-mono text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                        {cb.pct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, cb.pct)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Hadir: <strong className="text-slate-800">{cb.hadir}</strong> / {cb.total} siswa
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 3: TABEL DAFTAR PRESENSI REALTIME HARI INI */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Catatan Kehadiran Realtime Tanggal {selectedDate} ({filteredTableList.length} rekaman)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Data terbarui seketika setiap kali kartu QR siswa dipindai di scanner sekolah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Status */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-hidden"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Hadir Tepat Waktu">Hadir Tepat Waktu</option>
                  <option value="Terlambat">Terlambat</option>
                  <option value="Pulang Tepat Waktu">Pulang Tepat Waktu</option>
                  <option value="Pulang Mendahului">Pulang Mendahului</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                </select>
              </div>
            </div>

            {/* Tabel Data Kehadiran */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">No</th>
                    <th className="py-2.5 px-3">NISN</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3">Kelas</th>
                    <th className="py-2.5 px-3">Sesi / Kategori</th>
                    <th className="py-2.5 px-3">Waktu (WIB)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi Pantau</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredTableList.length > 0 ? (
                    filteredTableList.map((rec, idx) => {
                      const studentObj = students.find((s) => s.nisn === rec.nisn);
                      return (
                        <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td
                            onClick={() => {
                              if (studentObj) setSelectedStudentNisn(studentObj.nisn);
                            }}
                            className={`py-2.5 px-3 font-mono font-bold ${
                              studentObj ? 'text-slate-800 hover:text-blue-600 cursor-pointer' : 'text-slate-800'
                            }`}
                            title={studentObj ? `Klik untuk memantau data ${rec.nama}` : undefined}
                          >
                            {rec.nisn}
                          </td>
                          <td
                            onClick={() => {
                              if (studentObj) setSelectedStudentNisn(studentObj.nisn);
                            }}
                            className={`py-2.5 px-3 font-bold ${
                              studentObj ? 'text-slate-900 hover:text-blue-600 cursor-pointer' : 'text-slate-900'
                            }`}
                            title={studentObj ? `Klik untuk memantau data ${rec.nama}` : undefined}
                          >
                            {rec.nama}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700">
                              {rec.kelas}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec.sesi === 'Pagi'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {rec.kategori === 'KELAS' ? `KBM: ${rec.mapel || 'Mapel'}` : `Apel ${rec.sesi}`}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {rec.waktu} WIB
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                rec.status === 'Hadir Tepat Waktu'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.status === 'Terlambat'
                                  ? 'bg-amber-100 text-amber-800'
                                  : rec.status === 'Pulang Tepat Waktu'
                                  ? 'bg-blue-100 text-blue-800'
                                  : rec.status === 'Pulang Mendahului'
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-slate-100 text-slate-800'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                              {rec.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {studentObj && (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentNisn(studentObj.nisn)}
                                  className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                                  title={`Buka Pantauan Khusus ${rec.nama}`}
                                >
                                  <Search className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenStudentDetail(studentObj)}
                                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                                  title={`Lihat Kartu QR ${rec.nama}`}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                        Belum ada rekaman presensi pada filter tanggal {selectedDate}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Aesthetic Student Detail Modal */}
      <StudentDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        student={selectedDetailStudent}
        studentsList={students}
        onSelectStudent={(s) => setSelectedDetailStudent(s)}
        attendance={attendance}
        config={config}
        teachers={teachers}
      />
    </div>
  );
};
