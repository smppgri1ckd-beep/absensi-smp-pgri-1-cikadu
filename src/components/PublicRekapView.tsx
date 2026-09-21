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
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig } from '../types';

interface PublicRekapViewProps {
  students: Student[];
  attendance: AttendanceRecord[];
  config: SchoolConfig;
  dayKey: string;
  onGoToKiosk: () => void;
  onOpenLogin: () => void;
}

export const PublicRekapView: React.FC<PublicRekapViewProps> = ({
  students,
  attendance,
  config,
  dayKey,
  onGoToKiosk,
  onOpenLogin,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [searchParentQuery, setSearchParentQuery] = useState<string>('');
  const [selectedStudentNisn, setSelectedStudentNisn] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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

  // Metrik Statistik Realtime Hari Ini
  const totalStudents = students.length;
  const morningPresentSet = useMemo(
    () => new Set(dateAttendance.filter((a) => a.sesi === 'Pagi').map((a) => a.nisn.trim())),
    [dateAttendance]
  );
  const afternoonPresentSet = useMemo(
    () => new Set(dateAttendance.filter((a) => a.sesi === 'Siang').map((a) => a.nisn.trim())),
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

  // Pencarian Siswa untuk Orang Tua
  const matchedStudents = useMemo(() => {
    const q = searchParentQuery.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => {
        const matchesClass = selectedClass === 'ALL' || s.kelas === selectedClass;
        const matchesQuery =
          s.nama.toLowerCase().includes(q) || s.nisn.toLowerCase().includes(q);
        return matchesClass && matchesQuery;
      })
      .slice(0, 10);
  }, [students, searchParentQuery, selectedClass]);

  // Siswa yang sedang dipilih orang tua
  const activeStudent = useMemo(() => {
    if (!selectedStudentNisn) return null;
    return students.find((s) => s.nisn === selectedStudentNisn) || null;
  }, [students, selectedStudentNisn]);

  // Log presensi siswa terpilih pada tanggal terpilih
  const studentLogsToday = useMemo(() => {
    if (!activeStudent) return [];
    return dateAttendance.filter((a) => a.nisn.trim() === activeStudent.nisn.trim());
  }, [dateAttendance, activeStudent]);

  // Riwayat 7 log terakhir siswa terpilih
  const studentHistoryRecent = useMemo(() => {
    if (!activeStudent) return [];
    return attendance
      .filter((a) => a.nisn.trim() === activeStudent.nisn.trim())
      .sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu))
      .slice(0, 7);
  }, [attendance, activeStudent]);

  // Daftar tabel kehadiran umum
  const filteredTableList = useMemo(() => {
    return dateAttendance.filter((rec) => {
      const matchClass = selectedClass === 'ALL' || rec.kelas === selectedClass;
      const matchStatus = statusFilter === 'ALL' || rec.status === statusFilter;
      const matchSearch =
        !searchParentQuery.trim() ||
        rec.nama.toLowerCase().includes(searchParentQuery.toLowerCase()) ||
        rec.nisn.includes(searchParentQuery);
      return matchClass && matchStatus && matchSearch;
    });
  }, [dateAttendance, selectedClass, statusFilter, searchParentQuery]);

  const morningLog = studentLogsToday.find((l) => l.sesi === 'Pagi');
  const afternoonLog = studentLogsToday.find((l) => l.sesi === 'Siang');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
                Real-time Firebase
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              Rekapitulasi Kehadiran Siswa Real-Time
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
              Selamat datang di portal transparansi presensi <strong>{config.namaSekolah}</strong>. Orang tua dapat memeriksa status kehadiran, jam masuk, dan jam pulang ananda secara langsung dan akurat.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
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
              <span>Login Admin / Guru</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: FITUR CARI SISWA UNTUK ORANG TUA */}
      <div className="bg-white border-2 border-blue-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Pantau Kehadiran Ananda Hari Ini
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Ketik nama siswa atau NISN di bawah untuk melihat kepastian jam kehadiran ananda.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Pilih Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Input Pencarian Siswa */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Ketik Nama Siswa atau NISN (Contoh: Ahmad, Siti, 008...)"
              value={searchParentQuery}
              onChange={(e) => {
                setSearchParentQuery(e.target.value);
                if (selectedStudentNisn) setSelectedStudentNisn(null);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition"
            />
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

        {/* Saran Hasil Pencarian */}
        {searchParentQuery.trim() && !activeStudent && matchedStudents.length > 0 && (
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 space-y-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Hasil Ditemukan ({matchedStudents.length} siswa) &bull; Klik nama siswa untuk melihat status presensi:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {matchedStudents.map((st) => (
                <button
                  key={st.nisn}
                  type="button"
                  onClick={() => {
                    setSelectedStudentNisn(st.nisn);
                  }}
                  className="p-2.5 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs rounded-xl flex items-center justify-between text-left transition cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0 ${
                        st.jk === 'L' ? 'bg-blue-600' : 'bg-rose-500'
                      }`}
                    >
                      {st.nama.charAt(0)}
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{st.nama}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Kelas {st.kelas} &bull; {st.nisn}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {searchParentQuery.trim() && matchedStudents.length === 0 && (
          <div className="p-6 bg-slate-50 rounded-2xl text-center text-slate-500 text-xs font-medium">
            Tidak ditemukan siswa dengan kata kunci "<strong>{searchParentQuery}</strong>". Pastikan ejaan nama atau NISN sudah sesuai.
          </div>
        )}

        {/* KARTU HASIL PEMANTAUAN PRESENSI SISWA TERPILIH */}
        {activeStudent && (
          <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/50 to-white border-2 border-blue-300 rounded-3xl p-5 sm:p-6 space-y-5 animate-scale-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white shadow-md shrink-0 ${
                    activeStudent.jk === 'L'
                      ? 'bg-gradient-to-tr from-blue-600 to-indigo-600'
                      : 'bg-gradient-to-tr from-rose-500 to-pink-600'
                  }`}
                >
                  {activeStudent.fotoUrl ? (
                    <img
                      src={activeStudent.fotoUrl}
                      alt={activeStudent.nama}
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  ) : (
                    activeStudent.nama.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase">
                      Kelas {activeStudent.kelas}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 font-bold">
                      NISN: {activeStudent.nisn}
                    </span>
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                    {activeStudent.nama}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Jenis Kelamin: {activeStudent.jk === 'L' ? 'Laki-Laki' : 'Perempuan'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStudentNisn(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-3 py-1.5 rounded-xl self-start sm:self-center cursor-pointer shadow-2xs"
              >
                Tutup Kartu / Cari Siswa Lain
              </button>
            </div>

            {/* STATUS KEHADIRAN HARI INI (SESI PAGI & SESI SIANG) */}
            <div>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Status Presensi Tanggal {selectedDate}:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status Sesi Pagi */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-blue-900">
                      1. Sesi Pagi (Kedatangan)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Standar: {config.schedule.morningStart} - {config.schedule.morningOnTimeEnd} WIB
                    </span>
                  </div>

                  {morningLog ? (
                    <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          {morningLog.status}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {morningLog.waktu} WIB
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        Ananda telah berhasil melakukan presensi masuk di sekolah.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          Belum Ada Presensi Masuk
                        </span>
                        <span className="text-[10px] font-bold text-amber-700 bg-white px-1.5 py-0.5 rounded border border-amber-200">
                          Menunggu
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Belum terdeteksi pindaian QR pada sesi pagi tanggal ini.
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Sesi Siang */}
                <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-emerald-900">
                      2. Sesi Siang (Kepulangan)
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      Standar: {config.schedule.afternoonOnTimeEnd} - {config.schedule.afternoonCutoff} WIB
                    </span>
                  </div>

                  {afternoonLog ? (
                    <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-blue-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-blue-600" />
                          {afternoonLog.status}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                          {afternoonLog.waktu} WIB
                        </span>
                      </div>
                      <p className="text-[11px] text-blue-700 font-medium">
                        Ananda telah tercatat melakukan presensi kepulangan sekolah.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-slate-400" />
                          Belum Presensi Pulang
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded">
                          Belum Pulang
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Sesi kepulangan berlangsung sesuai jam belajar yang ditetapkan.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Riwayat 7 Hari Terakhir */}
            {studentHistoryRecent.length > 0 && (
              <div className="pt-2 border-t border-blue-100 space-y-2">
                <p className="text-xs font-bold text-slate-700">
                  Riwayat Presensi Terbaru Ananda:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {studentHistoryRecent.map((h) => (
                    <div
                      key={h.id}
                      className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                        <span>{h.tanggal}</span>
                        <span className="text-blue-600">Sesi {h.sesi}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-[11px]">{h.status}</span>
                        <span className="font-mono text-[10px] text-slate-500">{h.waktu} WIB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
                <th className="py-2.5 px-3">Sesi</th>
                <th className="py-2.5 px-3">Waktu (WIB)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTableList.length > 0 ? (
                filteredTableList.map((rec, idx) => (
                  <tr key={rec.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{rec.nisn}</td>
                    <td className="py-2.5 px-3 font-bold text-slate-900">{rec.nama}</td>
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
                        {rec.sesi}
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    Belum ada rekaman presensi pada filter tanggal {selectedDate}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
