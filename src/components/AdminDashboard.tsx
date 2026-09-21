import React, { useState } from 'react';
import {
  Users,
  UserCheck,
  Clock,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Printer,
  Calendar,
  Layers,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { Student, AttendanceRecord, SchoolConfig } from '../types';
import { exportRekapToExcel, exportRekapPDF } from '../utils/export';
import { triggerDirectPrint } from '../utils/print';

interface AdminDashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
  config: SchoolConfig;
  totalHeb: number;
  dayKey: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  students,
  attendance,
  config,
  totalHeb,
  dayKey,
}) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedClass, setSelectedClass] = useState<string>('ALL');

  // Filter logs based on date
  const filteredAttendance = attendance.filter((a) => a.tanggal === selectedDate);
  const classes = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();

  // Metrics
  const totalStudents = students.length;
  const morningPresent = new Set(
    filteredAttendance.filter((a) => a.sesi === 'Pagi').map((a) => a.nisn.trim())
  ).size;
  const afternoonPresent = new Set(
    filteredAttendance.filter((a) => a.sesi === 'Siang').map((a) => a.nisn.trim())
  ).size;
  const allPresentUnique = new Set(filteredAttendance.map((a) => a.nisn.trim())).size;
  const notPresentCount = Math.max(0, totalStudents - allPresentUnique);

  const onTimeMorning = filteredAttendance.filter(
    (a) => a.sesi === 'Pagi' && a.status === 'Hadir Tepat Waktu'
  ).length;
  const lateMorning = filteredAttendance.filter(
    (a) => a.sesi === 'Pagi' && a.status === 'Terlambat'
  ).length;
  const earlyLeave = filteredAttendance.filter(
    (a) => a.sesi === 'Siang' && a.status === 'Pulang Mendahului'
  ).length;

  const attendanceRate =
    totalStudents > 0 ? Math.round((allPresentUnique / totalStudents) * 100) : 0;

  // Class Breakdown stats
  const classBreakdowns = classes.map((cls) => {
    const classStudents = students.filter((s) => s.kelas === cls);
    const classTotal = classStudents.length;
    const classLogs = filteredAttendance.filter((a) => a.kelas === cls);
    const pagiCount = new Set(
      classLogs.filter((a) => a.sesi === 'Pagi').map((a) => a.nisn.trim())
    ).size;
    const siangCount = new Set(
      classLogs.filter((a) => a.sesi === 'Siang').map((a) => a.nisn.trim())
    ).size;
    const uniquePresent = new Set(classLogs.map((a) => a.nisn.trim())).size;
    const rate = classTotal > 0 ? Math.round((uniquePresent / classTotal) * 100) : 0;

    return {
      kelas: cls,
      total: classTotal,
      pagi: pagiCount,
      siang: siangCount,
      uniquePresent,
      rate,
    };
  });

  const dutyTeacher =
    config.jadwalPiket[dayKey as keyof typeof config.jadwalPiket] || config.jadwalPiket.senin;

  const handleExportExcel = () => {
    exportRekapToExcel(
      config,
      students,
      attendance,
      selectedDate,
      selectedDate,
      selectedClass,
      1
    );
  };

  const handleExportPDF = () => {
    exportRekapPDF(
      config,
      students,
      attendance,
      selectedDate,
      selectedDate,
      selectedClass,
      1,
      dutyTeacher.nama,
      dutyTeacher.nip,
      selectedDate
    );
  };

  const handleDirectPrint = () => {
    triggerDirectPrint({
      paperSize: 'A4',
      margins: '8mm 6mm',
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Print-Only Official Letterhead */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-3 mb-2">
        <div className="flex items-center gap-4">
          <img
            src={config.logoUrl}
            alt="Logo"
            className="w-14 h-14 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://cdn-icons-png.flaticon.com/512/2856/2856000.png';
            }}
          />
          <div className="flex-1">
            <h3 className="text-base font-black uppercase text-slate-900 leading-tight">
              {config.namaSekolah}
            </h3>
            <p className="text-[10px] text-slate-700 font-medium">
              {config.alamat} &bull; NPSN: {config.npsn}
            </p>
            <h4 className="text-xs font-bold text-slate-900 mt-1 uppercase">
              Laporan Ringkasan Presensi Harian ({selectedDate})
            </h4>
          </div>
        </div>
      </div>

      {/* Header with Filter Controls and Quick Export */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-base font-extrabold text-slate-900">
              Dashboard Rekapitulasi Presensi Real-Time
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau kehadiran siswa harian, rasio sesi pagi & siang, serta performa per kelas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-hidden"
            />
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={handleDirectPrint}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Dokumen</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Students */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Total Siswa
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-900">{totalStudents}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Seluruh jenjang kelas</p>
          </div>
        </div>

        {/* Morning Session */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">
              Hadir Pagi
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-blue-600">{morningPresent}</h4>
              <span className="text-xs font-bold text-blue-600 font-mono">
                {totalStudents > 0 ? Math.round((morningPresent / totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {onTimeMorning} Tepat Waktu &bull; {lateMorning} Terlambat
            </p>
          </div>
        </div>

        {/* Afternoon Session */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wide">
              Hadir Siang
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-emerald-600">{afternoonPresent}</h4>
              <span className="text-xs font-bold text-emerald-600 font-mono">
                {totalStudents > 0 ? Math.round((afternoonPresent / totalStudents) * 100) : 0}%
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {earlyLeave} Pulang Mendahului
            </p>
          </div>
        </div>

        {/* Overall Attendance Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide">
              Rasio Kehadiran
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-indigo-700">{attendanceRate}%</h4>
              <span className="text-xs font-semibold text-slate-500">
                ({allPresentUnique}/{totalStudents})
              </span>
            </div>
            <p className="text-[11px] text-amber-600 font-semibold mt-0.5">
              {notPresentCount} Siswa belum hadir
            </p>
          </div>
        </div>
      </div>

      {/* Class-by-Class Breakdown Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Rekapitulasi Kehadiran per Rombel / Kelas ({selectedDate})
            </h4>
            <p className="text-xs text-slate-500">
              Evaluasi persentase kehadiran masing-masing kelas secara mendalam.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 font-mono">
            {classes.length} Rombel
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Nama Rombel / Kelas</th>
                <th className="p-3 text-center">Jumlah Siswa</th>
                <th className="p-3 text-center">Hadir Pagi</th>
                <th className="p-3 text-center">Hadir Siang</th>
                <th className="p-3 text-center">Total Terdata</th>
                <th className="p-3 w-48">Tingkat Kehadiran (%)</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {classBreakdowns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400 italic">
                    Belum ada kelas terdaftar dalam database siswa.
                  </td>
                </tr>
              ) : (
                classBreakdowns.map((cb) => (
                  <tr key={cb.kelas} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-bold text-slate-900">{cb.kelas}</td>
                    <td className="p-3 text-center font-mono font-medium">{cb.total}</td>
                    <td className="p-3 text-center font-mono text-blue-600 font-bold">
                      {cb.pagi}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-bold">
                      {cb.siang}
                    </td>
                    <td className="p-3 text-center font-mono font-extrabold text-slate-800">
                      {cb.uniquePresent}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              cb.rate >= 85
                                ? 'bg-emerald-500'
                                : cb.rate >= 65
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${cb.rate}%` }}
                          ></div>
                        </div>
                        <span className="text-[11px] font-mono font-bold w-10 text-right">
                          {cb.rate}%
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          cb.rate >= 80
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {cb.rate >= 80 ? 'Sangat Baik' : 'Perlu Perhatian'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly Scan Distribution & Log Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Session Attendance Schedule Recap */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-indigo-600" />
            Parameter Jadwal Sesi Presensi Aktif
          </h4>
          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-blue-900 block">Sesi Pagi (Kedatangan)</span>
                <span className="text-slate-600 text-[11px]">
                  Mulai: {config.schedule.morningStart} WIB &bull; Batas Tepat Waktu: {config.schedule.morningOnTimeEnd} WIB &bull; Batas Akhir: {config.schedule.morningCutoff} WIB
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-black font-mono text-[11px]">
                {morningPresent} Hadir
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-extrabold text-emerald-900 block">Sesi Siang (Kepulangan)</span>
                <span className="text-slate-600 text-[11px]">
                  Mulai: {config.schedule.afternoonStart} WIB &bull; Batas Pulang: {config.schedule.afternoonOnTimeEnd} WIB &bull; Batas Akhir: {config.schedule.afternoonCutoff} WIB
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-black font-mono text-[11px]">
                {afternoonPresent} Hadir
              </span>
            </div>
          </div>
        </div>

        {/* Real-time scan log preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Presensi Terkini Hari Ini ({selectedDate})
            </h4>
            <span className="text-[10px] font-mono text-slate-500">
              {filteredAttendance.length} Catatan
            </span>
          </div>

          <div className="overflow-y-auto max-h-56 space-y-2">
            {filteredAttendance.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                Belum ada aktivitas presensi pada tanggal ini.
              </p>
            ) : (
              filteredAttendance.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl transition text-xs"
                >
                  <div className="overflow-hidden pr-2">
                    <p className="font-bold text-slate-900 truncate">{item.nama}</p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {item.nisn} &bull; {item.kelas}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.sesi === 'Pagi'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {item.sesi} &bull; {item.waktu}
                    </span>
                    <p className="text-[10px] text-slate-600 mt-0.5 font-medium">
                      {item.status}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
