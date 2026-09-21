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
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  AttendanceSession,
  AttendanceStatus,
} from '../types';
import { StudentDetailModal } from './StudentDetailModal';

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

  // Modal Input Izin / Sakit
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [targetStudent, setTargetStudent] = useState<Student | null>(null);
  const [izinStatus, setIzinStatus] = useState<'Izin' | 'Sakit' | 'Alpa' | 'Hadir Tepat Waktu'>('Izin');
  const [izinKeterangan, setIzinKeterangan] = useState('');

  // Student Detail Modal state
  const [selectedDetailStudent, setSelectedDetailStudent] = useState<Student | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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

  // Attendance records for the selected date & session
  const dateSessionRecords = useMemo(() => {
    return attendance.filter(
      (a) => a.tanggal === selectedDate && a.sesi === selectedSession
    );
  }, [attendance, selectedDate, selectedSession]);

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

    const newRecord: AttendanceRecord = {
      id: `att_${student.nisn}_${selectedDate}_${selectedSession}`,
      tanggal: selectedDate,
      waktu: timeNow,
      nisn: student.nisn,
      nama: student.nama,
      kelas: student.kelas,
      sesi: selectedSession,
      status: note ? `${newStatus} (${note})` : newStatus,
    };

    onRecordAttendance(newRecord).then(() => {
      onShowNotice(
        'Status Presensi Diperbarui',
        `${student.nama} (${student.kelas}) ditandai: ${newStatus}`,
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
          {/* Controls Bar */}
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

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">
                  Sesi
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
                    Pagi
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
                    Siang
                  </button>
                </div>
              </div>
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
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-xs font-extrabold text-slate-800">
                  Daftar Presensi Kelas {selectedClass} • {selectedDate} (Sesi {selectedSession})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Guru dapat langsung mencatat Izin/Sakit dari orang tua atau mengubah status presensi siswa.
                </p>
              </div>

              <span className="text-xs font-black text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                Kehadiran: {stats.persentase}%
              </span>
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
            {/* Kop Laporan */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              <h3 className="text-sm sm:text-base font-black uppercase text-slate-900 tracking-wider">
                {config.namaSekolah}
              </h3>
              <p className="text-xs font-bold text-slate-700">
                LEMBAR PRESENSI & JURNAL KEHADIRAN SISWA
              </p>
              <p className="text-[11px] text-slate-500">
                NPSN: {config.npsn} • {config.alamat} • Kontak: {config.kontak}
              </p>
            </div>

            {/* Document Meta Info */}
            <div className="grid grid-cols-2 text-xs font-medium text-slate-700 gap-2 pb-2">
              <div>
                <p>
                  <span className="font-bold">Kelas / Rombel:</span> Kelas {selectedClass}
                </p>
                <p>
                  <span className="font-bold">Guru Pengajar:</span> {teacher.nama} ({teacher.mapel})
                </p>
              </div>
              <div className="text-right">
                <p>
                  <span className="font-bold">Tanggal:</span> {selectedDate} (Sesi {selectedSession})
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
    </div>
  );
};
