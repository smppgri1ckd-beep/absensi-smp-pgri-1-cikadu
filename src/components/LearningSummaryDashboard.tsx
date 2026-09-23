import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  Calendar,
  Users,
  Award,
  AlertTriangle,
  FileDown,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronRight,
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  TeachingJournal,
} from '../types';

export interface MeetingSummaryItem {
  id: string;
  pertemuanKe: number;
  materiPokok: string;
  kelas: string;
  mapel: string;
  tanggal: string;
  jamPelajaran?: string;
  totalSiswa: number;
  hadir: number;
  terlambat: number;
  izin: number;
  sakit: number;
  alpa: number;
  totalHadir: number;
  persentaseKehadiran: number;
  kegiatanPembelajaran?: string;
  catatanRefleksi?: string;
  source: 'journal' | 'attendance';
}

interface LearningSummaryDashboardProps {
  teacher: TeacherUser;
  students: Student[];
  journals: TeachingJournal[];
  attendance: AttendanceRecord[];
  classes: string[];
  teacherMapelList: string[];
  config: SchoolConfig;
  onOpenSessionInPresensi: (
    kelas: string,
    mapel: string,
    tanggal: string,
    pertemuanKe: number,
    materi?: string
  ) => void;
  onDownloadMeetingPdf: (
    kelas: string,
    mapel: string,
    pertemuanKe: number,
    tanggal: string,
    materiPokok?: string,
    jamPelajaran?: string,
    kegiatan?: string,
    catatan?: string
  ) => void;
}

export const LearningSummaryDashboard: React.FC<LearningSummaryDashboardProps> = ({
  teacher,
  students,
  journals,
  attendance,
  classes,
  teacherMapelList,
  config,
  onOpenSessionInPresensi,
  onDownloadMeetingPdf,
}) => {
  // Filters
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedMapel, setSelectedMapel] = useState<string>('ALL');
  const [chartMetric, setChartMetric] = useState<'COUNT' | 'PERCENT'>('COUNT');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');
  const [timeRange, setTimeRange] = useState<'ALL' | 'LAST_5' | 'LAST_10'>('ALL');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  // Compile unified meeting dataset from both journals and class attendance records
  const meetingData = useMemo<MeetingSummaryItem[]>(() => {
    const map = new Map<string, MeetingSummaryItem>();

    // 1. Process explicit teaching journals
    journals.forEach((jrn) => {
      const isOwner =
        jrn.guruId === teacher.id ||
        jrn.guruNama === teacher.nama ||
        teacher.id === 'admin-guru';
      if (!isOwner) return;

      const key = `${jrn.kelas}_${jrn.mapel}_p${jrn.pertemuanKe}_${jrn.tanggal}`;
      const totalHadir = (jrn.hadir || 0) + (jrn.terlambat || 0);
      const totalSiswa = jrn.totalSiswa || students.filter((s) => s.kelas === jrn.kelas).length || 1;
      const persentase =
        jrn.persentaseKehadiran !== undefined
          ? jrn.persentaseKehadiran
          : Math.round((totalHadir / totalSiswa) * 100);

      map.set(key, {
        id: jrn.id || key,
        pertemuanKe: jrn.pertemuanKe || 1,
        materiPokok: jrn.materiPokok || `Materi Pertemuan ${jrn.pertemuanKe}`,
        kelas: jrn.kelas,
        mapel: jrn.mapel,
        tanggal: jrn.tanggal,
        jamPelajaran: jrn.jamPelajaran,
        totalSiswa,
        hadir: jrn.hadir || 0,
        terlambat: jrn.terlambat || 0,
        izin: jrn.izin || 0,
        sakit: jrn.sakit || 0,
        alpa: jrn.alpa || 0,
        totalHadir,
        persentaseKehadiran: persentase,
        kegiatanPembelajaran: jrn.kegiatanPembelajaran,
        catatanRefleksi: jrn.catatanRefleksi,
        source: 'journal',
      });
    });

    // 2. Process class attendance records that may not have a journal record yet
    const classRecords = attendance.filter((a) => {
      if (a.kategori !== 'KELAS' || !a.mapel || a.pertemuanKe === undefined) return false;
      const isOwner = !a.guruId || a.guruId === teacher.id || a.guruNama === teacher.nama || teacher.id === 'admin-guru';
      return isOwner;
    });

    // Group class attendance by (kelas, mapel, pertemuanKe, tanggal)
    const groupedAtt = new Map<string, AttendanceRecord[]>();
    classRecords.forEach((r) => {
      const key = `${r.kelas}_${r.mapel}_p${r.pertemuanKe}_${r.tanggal}`;
      const list = groupedAtt.get(key) || [];
      list.push(r);
      groupedAtt.set(key, list);
    });

    groupedAtt.forEach((recs, key) => {
      if (!map.has(key) && recs.length > 0) {
        const sample = recs[0];
        const classTotal = students.filter((s) => s.kelas === sample.kelas).length || recs.length;

        let hadir = 0;
        let terlambat = 0;
        let izin = 0;
        let sakit = 0;
        let alpa = 0;

        recs.forEach((r) => {
          const st = r.status.toLowerCase();
          if (st.includes('hadir') || st.includes('tepat')) hadir++;
          else if (st.includes('terlambat')) terlambat++;
          else if (st.includes('izin')) izin++;
          else if (st.includes('sakit')) sakit++;
          else if (st.includes('alpa')) alpa++;
          else hadir++;
        });

        const totalHadir = hadir + terlambat;
        const persentase = Math.round((totalHadir / (classTotal || 1)) * 100);

        map.set(key, {
          id: key,
          pertemuanKe: sample.pertemuanKe || 1,
          materiPokok: sample.materiPokok || `Pertemuan ${sample.pertemuanKe} (${sample.mapel})`,
          kelas: sample.kelas,
          mapel: sample.mapel || teacher.mapel || 'Mata Pelajaran',
          tanggal: sample.tanggal,
          totalSiswa: classTotal,
          hadir,
          terlambat,
          izin,
          sakit,
          alpa,
          totalHadir,
          persentaseKehadiran: Math.min(100, persentase),
          source: 'attendance',
        });
      }
    });

    return Array.from(map.values());
  }, [journals, attendance, teacher.id, teacher.nama, teacher.mapel, students]);

  // Filter & sort meetings
  const filteredMeetings = useMemo(() => {
    let result = [...meetingData];

    if (selectedClass !== 'ALL') {
      result = result.filter((m) => m.kelas === selectedClass);
    }
    if (selectedMapel !== 'ALL') {
      result = result.filter((m) => m.mapel === selectedMapel);
    }

    // Sort by Pertemuan Ke or Tanggal
    result.sort((a, b) => {
      if (a.pertemuanKe !== b.pertemuanKe) {
        return sortOrder === 'ASC'
          ? a.pertemuanKe - b.pertemuanKe
          : b.pertemuanKe - a.pertemuanKe;
      }
      return sortOrder === 'ASC'
        ? a.tanggal.localeCompare(b.tanggal)
        : b.tanggal.localeCompare(a.tanggal);
    });

    // Time range slice
    if (timeRange === 'LAST_5') {
      result = result.slice(-5);
    } else if (timeRange === 'LAST_10') {
      result = result.slice(-10);
    }

    return result;
  }, [meetingData, selectedClass, selectedMapel, sortOrder, timeRange]);

  // Overall Statistics for KPIs
  const overallStats = useMemo(() => {
    if (filteredMeetings.length === 0) {
      return {
        totalMeetings: 0,
        avgPercentage: 0,
        totalStudentAttendances: 0,
        bestMeeting: null as MeetingSummaryItem | null,
        lowestMeeting: null as MeetingSummaryItem | null,
        totalAlpa: 0,
        totalIzinSakit: 0,
      };
    }

    let sumPercentage = 0;
    let sumAttendances = 0;
    let sumAlpa = 0;
    let sumIzinSakit = 0;

    let bestMeeting = filteredMeetings[0];
    let lowestMeeting = filteredMeetings[0];

    filteredMeetings.forEach((m) => {
      sumPercentage += m.persentaseKehadiran;
      sumAttendances += m.totalHadir;
      sumAlpa += m.alpa;
      sumIzinSakit += m.izin + m.sakit;

      if (m.persentaseKehadiran > bestMeeting.persentaseKehadiran) {
        bestMeeting = m;
      }
      if (m.persentaseKehadiran < lowestMeeting.persentaseKehadiran) {
        lowestMeeting = m;
      }
    });

    const avgPercentage = Math.round(sumPercentage / filteredMeetings.length);

    return {
      totalMeetings: filteredMeetings.length,
      avgPercentage,
      totalStudentAttendances: sumAttendances,
      bestMeeting,
      lowestMeeting,
      totalAlpa: sumAlpa,
      totalIzinSakit: sumIzinSakit,
    };
  }, [filteredMeetings]);

  // Active selected meeting for drilldown
  const activeSelectedMeeting = useMemo(() => {
    if (!selectedMeetingId) {
      return filteredMeetings[filteredMeetings.length - 1] || null;
    }
    return filteredMeetings.find((m) => m.id === selectedMeetingId) || filteredMeetings[0] || null;
  }, [selectedMeetingId, filteredMeetings]);

  // Calculate highest student count for scaling the bar chart heights
  const maxBarValue = useMemo(() => {
    if (chartMetric === 'PERCENT') return 100;
    const maxVal = Math.max(
      ...filteredMeetings.map((m) => m.totalSiswa || m.totalHadir || 30),
      25
    );
    return Math.ceil(maxVal / 5) * 5;
  }, [filteredMeetings, chartMetric]);

  return (
    <div className="space-y-6">
      {/* ===== HEADER & FILTER BAR ===== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                  Dashboard Ringkasan Pembelajaran & Keterlibatan Siswa
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi grafik batang absensi dan partisipasi siswa per materi pertemuan KBM tatap muka
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{overallStats.totalMeetings} Sesi Pertemuan</span>
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs border border-emerald-200 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Rata-rata: {overallStats.avgPercentage}% Kehadiran</span>
            </span>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-xs">
          {/* Filter Kelas */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Rombel / Kelas
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  Kelas {c} {teacher.waliKelas === c ? '(Wali Kelas)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Mapel */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Mata Pelajaran
            </label>
            <select
              value={selectedMapel}
              onChange={(e) => setSelectedMapel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 truncate"
            >
              <option value="ALL">Semua Mapel</option>
              {teacherMapelList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Selector */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Satuan Grafik Batang
            </label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setChartMetric('COUNT')}
                className={`flex-1 py-1 rounded-lg font-bold transition text-center cursor-pointer ${
                  chartMetric === 'COUNT'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Jumlah Siswa
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('PERCENT')}
                className={`flex-1 py-1 rounded-lg font-bold transition text-center cursor-pointer ${
                  chartMetric === 'PERCENT'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Persen (%)
              </button>
            </div>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
              Rentang Pertemuan
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="ALL">Semua Pertemuan</option>
              <option value="LAST_5">5 Pertemuan Terakhir</option>
              <option value="LAST_10">10 Pertemuan Terakhir</option>
            </select>
          </div>

          {/* Sort Order & Reset */}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === 'ASC' ? 'DESC' : 'ASC'))}
              className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              title="Ubah urutan pertemuan"
            >
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <span>{sortOrder === 'ASC' ? 'P1 ➔ Pn' : 'Pn ➔ P1'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedClass('ALL');
                setSelectedMapel('ALL');
                setChartMetric('COUNT');
                setSortOrder('ASC');
                setTimeRange('ALL');
              }}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
              title="Reset Filter"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ===== KPI CARDS (METRICS & ENGAGEMENT HIGHLIGHTS) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Rata-Rata Keterlibatan */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0 shadow-inner">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Tingkat Kehadiran
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {overallStats.avgPercentage}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                  overallStats.avgPercentage >= 90
                    ? 'bg-emerald-100 text-emerald-800'
                    : overallStats.avgPercentage >= 75
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {overallStats.avgPercentage >= 90
                  ? 'Sangat Tinggi'
                  : overallStats.avgPercentage >= 75
                  ? 'Baik'
                  : 'Cukup'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              Rata-rata kehadiran seluruh sesi
            </p>
          </div>
        </div>

        {/* KPI 2: Total Pertemuan & Jam Tatap Muka */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center font-black shrink-0 shadow-inner">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Sesi Materi KBM
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-900">
                {overallStats.totalMeetings}
              </span>
              <span className="text-xs font-bold text-slate-500">Pertemuan</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate mt-0.5">
              {overallStats.totalStudentAttendances} total presensi siswa
            </p>
          </div>
        </div>

        {/* KPI 3: Best Engagement Topic */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-black shrink-0 shadow-inner">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Materi Kehadiran Tertinggi
            </span>
            {overallStats.bestMeeting ? (
              <>
                <h4 className="text-xs font-extrabold text-slate-900 truncate" title={overallStats.bestMeeting.materiPokok}>
                  P{overallStats.bestMeeting.pertemuanKe}: {overallStats.bestMeeting.materiPokok}
                </h4>
                <p className="text-[10px] text-emerald-600 font-bold truncate mt-0.5">
                  {overallStats.bestMeeting.persentaseKehadiran}% Hadir ({overallStats.bestMeeting.kelas})
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data</p>
            )}
          </div>
        </div>

        {/* KPI 4: Materi Perlu Perhatian / Remedial */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black shrink-0 shadow-inner">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Materi Butuh Evaluasi
            </span>
            {overallStats.lowestMeeting ? (
              <>
                <h4 className="text-xs font-extrabold text-slate-900 truncate" title={overallStats.lowestMeeting.materiPokok}>
                  P{overallStats.lowestMeeting.pertemuanKe}: {overallStats.lowestMeeting.materiPokok}
                </h4>
                <p className="text-[10px] text-rose-600 font-bold truncate mt-0.5">
                  {overallStats.lowestMeeting.alpa} Siswa Alpa ({overallStats.lowestMeeting.persentaseKehadiran}%)
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400 italic">Belum ada data</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== MAIN VISUAL BAR CHART SECTION ===== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-7 shadow-xs space-y-5">
        {/* Chart Header & Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>Grafik Batang Kehadiran Siswa per Materi Pertemuan</span>
              <span className="text-xs font-normal text-slate-400">
                ({filteredMeetings.length} Sesi Terfilter)
              </span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pada batang pertemuan di bawah untuk melihat rincian capaian pembelajaran dan daftar siswa
            </p>
          </div>

          {/* Interactive Legend */}
          <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>Hadir Tepat ({chartMetric === 'PERCENT' ? '%' : 'Siswa'})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-500" />
              <span>Terlambat</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-500" />
              <span>Izin / Sakit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span>Alpa</span>
            </div>
          </div>
        </div>

        {/* Chart Display Area */}
        {filteredMeetings.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 rounded-3xl space-y-3">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto border border-blue-100">
              <BarChart3 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-sm text-slate-800">
                Belum Ada Data Pembelajaran untuk Filter Terpilih
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan pilih filter kelas lain, atau buka tab <strong>"Presensi Siswa"</strong> untuk mengisi materi pokok dan mencatat kehadiran siswa.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Scrollable Bar Chart Area */}
            <div className="overflow-x-auto pb-4 pt-6">
              <div
                className="min-w-[550px] flex items-end gap-3 sm:gap-6 justify-between px-4"
                style={{ height: '280px' }}
              >
                {filteredMeetings.map((item) => {
                  const isSelected = activeSelectedMeeting?.id === item.id;
                  const total = item.totalSiswa || 30;

                  // Percent calculations for stacked bars
                  const hadirPct = Math.round((item.hadir / total) * 100);
                  const terlambatPct = Math.round((item.terlambat / total) * 100);
                  const izinSakitPct = Math.round(((item.izin + item.sakit) / total) * 100);
                  const alpaPct = Math.max(0, 100 - (hadirPct + terlambatPct + izinSakitPct));

                  // Height of the entire column relative to maxBarValue
                  const totalBarHeightPct =
                    chartMetric === 'PERCENT'
                      ? item.persentaseKehadiran
                      : Math.min(100, Math.round((item.totalSiswa / maxBarValue) * 100));

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMeetingId(item.id)}
                      className={`flex-1 flex flex-col items-center justify-end h-full group cursor-pointer transition-all duration-200 relative ${
                        isSelected ? 'scale-105 z-10' : 'hover:scale-102'
                      }`}
                      style={{ minWidth: '45px', maxWidth: '85px' }}
                    >
                      {/* Floating Badge on Top of Bar */}
                      <div
                        className={`mb-2 px-2 py-0.5 rounded-lg text-[11px] font-black tracking-tight transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                            : item.persentaseKehadiran >= 90
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.persentaseKehadiran >= 75
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {chartMetric === 'PERCENT' ? `${item.persentaseKehadiran}%` : `${item.totalHadir}/${item.totalSiswa}`}
                      </div>

                      {/* Stacked Vertical Bar */}
                      <div
                        className={`w-full rounded-2xl overflow-hidden flex flex-col justify-end transition-all shadow-xs ${
                          isSelected
                            ? 'ring-4 ring-blue-500 ring-offset-2 shadow-lg'
                            : 'hover:shadow-md bg-slate-100'
                        }`}
                        style={{ height: `${Math.max(25, totalBarHeightPct * 2.2)}px` }}
                      >
                        {/* Alpa segment */}
                        {alpaPct > 0 && (
                          <div
                            style={{ height: `${alpaPct}%` }}
                            className="w-full bg-rose-500 hover:bg-rose-600 transition-colors"
                            title={`Alpa: ${item.alpa} siswa`}
                          />
                        )}

                        {/* Izin + Sakit segment */}
                        {izinSakitPct > 0 && (
                          <div
                            style={{ height: `${izinSakitPct}%` }}
                            className="w-full bg-sky-500 hover:bg-sky-600 transition-colors"
                            title={`Izin/Sakit: ${item.izin + item.sakit} siswa`}
                          />
                        )}

                        {/* Terlambat segment */}
                        {terlambatPct > 0 && (
                          <div
                            style={{ height: `${terlambatPct}%` }}
                            className="w-full bg-amber-500 hover:bg-amber-600 transition-colors"
                            title={`Terlambat: ${item.terlambat} siswa`}
                          />
                        )}

                        {/* Hadir Tepat segment */}
                        <div
                          style={{ height: `${Math.max(10, hadirPct)}%` }}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center text-white text-[9px] font-black"
                          title={`Hadir Tepat: ${item.hadir} siswa`}
                        >
                          {item.hadir > 0 && item.hadir}
                        </div>
                      </div>

                      {/* Bottom Labels (X-Axis: Pertemuan Ke, Kelas & Tanggal) */}
                      <div className="mt-2.5 text-center w-full space-y-0.5">
                        <span
                          className={`block text-[11px] font-black rounded-md px-1 py-0.5 truncate ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          P{item.pertemuanKe}
                        </span>
                        <span className="block text-[9px] font-bold text-slate-500 truncate">
                          {item.kelas}
                        </span>
                        <span className="block text-[8.5px] text-slate-400 truncate">
                          {item.tanggal.slice(5)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Meeting Interactive Detail Drawer / Callout Card */}
            {activeSelectedMeeting && (
              <div className="bg-gradient-to-br from-blue-50/80 via-slate-50 to-indigo-50/60 border-2 border-blue-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-xs uppercase">
                        Pertemuan Ke-{activeSelectedMeeting.pertemuanKe}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-800 font-extrabold text-xs">
                        Kelas {activeSelectedMeeting.kelas}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {activeSelectedMeeting.tanggal}
                      </span>
                      {activeSelectedMeeting.jamPelajaran && (
                        <span className="px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium text-xs">
                          {activeSelectedMeeting.jamPelajaran}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 pt-1">
                      {activeSelectedMeeting.materiPokok}
                    </h3>
                    <p className="text-xs text-slate-600">
                      Mata Pelajaran: <strong className="text-blue-900">{activeSelectedMeeting.mapel}</strong>
                    </p>
                  </div>

                  {/* Attendance Breakdown Pills & Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onOpenSessionInPresensi(
                          activeSelectedMeeting.kelas,
                          activeSelectedMeeting.mapel,
                          activeSelectedMeeting.tanggal,
                          activeSelectedMeeting.pertemuanKe,
                          activeSelectedMeeting.materiPokok
                        )
                      }
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Buka sesi ini di lembar kerja presensi aktif"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka di Presensi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDownloadMeetingPdf(
                          activeSelectedMeeting.kelas,
                          activeSelectedMeeting.mapel,
                          activeSelectedMeeting.pertemuanKe,
                          activeSelectedMeeting.tanggal,
                          activeSelectedMeeting.materiPokok,
                          activeSelectedMeeting.jamPelajaran,
                          activeSelectedMeeting.kegiatanPembelajaran,
                          activeSelectedMeeting.catatanRefleksi
                        )
                      }
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      title="Unduh Laporan PDF Resmi untuk pertemuan ini"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Cetak PDF</span>
                    </button>
                  </div>
                </div>

                {/* Breakdown Statistics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 text-xs">
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Hadir Tepat</span>
                    <span className="text-base font-black text-emerald-600">
                      {activeSelectedMeeting.hadir} Siswa
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Terlambat</span>
                    <span className="text-base font-black text-amber-600">
                      {activeSelectedMeeting.terlambat} Siswa
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Izin / Sakit</span>
                    <span className="text-base font-black text-sky-600">
                      {activeSelectedMeeting.izin + activeSelectedMeeting.sakit} Siswa
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Alpa</span>
                    <span className="text-base font-black text-rose-600">
                      {activeSelectedMeeting.alpa} Siswa
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-2xl border border-slate-200/80 text-center shadow-2xs col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Keterlibatan</span>
                    <span className="text-base font-black text-blue-700">
                      {activeSelectedMeeting.persentaseKehadiran}%
                    </span>
                  </div>
                </div>

                {/* Additional Journal Notes if available */}
                {(activeSelectedMeeting.kegiatanPembelajaran || activeSelectedMeeting.catatanRefleksi) && (
                  <div className="bg-white rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1.5 text-slate-700">
                    {activeSelectedMeeting.kegiatanPembelajaran && (
                      <p>
                        <strong className="text-slate-900">Kegiatan KBM:</strong> {activeSelectedMeeting.kegiatanPembelajaran}
                      </p>
                    )}
                    {activeSelectedMeeting.catatanRefleksi && (
                      <p className="text-amber-900">
                        <strong className="text-amber-950">Catatan Refleksi / Tugas:</strong> {activeSelectedMeeting.catatanRefleksi}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== DETAILED MEETING SUMMARY TABLE WITH TREND INDICATORS ===== */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm sm:text-base font-extrabold text-slate-900">
              Matriks & Tabel Tren Keterlibatan per Pertemuan
            </h4>
            <p className="text-xs text-slate-500">
              Daftar kronologis seluruh materi KBM beserta perubahan tren kehadiran siswa
            </p>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Total: {filteredMeetings.length} Rekap Pembelajaran
          </span>
        </div>

        {filteredMeetings.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs italic">
            Tidak ada riwayat pertemuan yang cocok.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3.5">Pertemuan</th>
                  <th className="py-3 px-3.5">Materi Pokok Pembelajaran</th>
                  <th className="py-3 px-3.5">Rombel</th>
                  <th className="py-3 px-3.5">Tanggal</th>
                  <th className="py-3 px-3 text-center">Hadir</th>
                  <th className="py-3 px-3 text-center">Izin/Sakit</th>
                  <th className="py-3 px-3 text-center">Alpa</th>
                  <th className="py-3 px-3.5 text-center">Tingkat Kehadiran</th>
                  <th className="py-3 px-3 text-center">Tren</th>
                  <th className="py-3 px-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredMeetings.map((m, idx) => {
                  // Calculate trend compared to previous meeting in list
                  const prev = filteredMeetings[idx - 1];
                  let trend: 'UP' | 'DOWN' | 'EQUAL' = 'EQUAL';
                  if (prev) {
                    if (m.persentaseKehadiran > prev.persentaseKehadiran) trend = 'UP';
                    else if (m.persentaseKehadiran < prev.persentaseKehadiran) trend = 'DOWN';
                  }

                  const isSelected = activeSelectedMeeting?.id === m.id;

                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-blue-50/50 transition-colors ${
                        isSelected ? 'bg-blue-50/70 font-semibold' : ''
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-black text-[10px]">
                          P{m.pertemuanKe}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 max-w-xs">
                        <div className="font-extrabold text-slate-900 truncate" title={m.materiPokok}>
                          {m.materiPokok}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {m.mapel} {m.jamPelajaran ? `• ${m.jamPelajaran}` : ''}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 font-bold text-slate-800">
                        {m.kelas}
                      </td>

                      <td className="py-3 px-3.5 text-slate-600 font-mono text-[11px]">
                        {m.tanggal}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-emerald-700">
                        {m.totalHadir}/{m.totalSiswa}
                      </td>

                      <td className="py-3 px-3 text-center text-sky-700 font-semibold">
                        {m.izin + m.sakit}
                      </td>

                      <td className="py-3 px-3 text-center font-bold text-rose-600">
                        {m.alpa}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                m.persentaseKehadiran >= 90
                                  ? 'bg-emerald-500'
                                  : m.persentaseKehadiran >= 75
                                  ? 'bg-blue-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${m.persentaseKehadiran}%` }}
                            />
                          </div>
                          <span className="font-mono font-extrabold text-[11px] text-slate-900 w-8 text-right">
                            {m.persentaseKehadiran}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {trend === 'UP' ? (
                          <span className="inline-flex items-center text-emerald-600 font-bold text-[10px]" title="Naik dibanding pertemuan sebelumnya">
                            <TrendingUp className="w-3.5 h-3.5 mr-0.5" />
                          </span>
                        ) : trend === 'DOWN' ? (
                          <span className="inline-flex items-center text-rose-600 font-bold text-[10px]" title="Turun dibanding pertemuan sebelumnya">
                            <TrendingDown className="w-3.5 h-3.5 mr-0.5" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-slate-400 font-bold text-[10px]" title="Stabil">
                            <Minus className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              onOpenSessionInPresensi(
                                m.kelas,
                                m.mapel,
                                m.tanggal,
                                m.pertemuanKe,
                                m.materiPokok
                              )
                            }
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition cursor-pointer"
                            title="Buka sesi ini di presensi aktif"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onDownloadMeetingPdf(
                                m.kelas,
                                m.mapel,
                                m.pertemuanKe,
                                m.tanggal,
                                m.materiPokok,
                                m.jamPelajaran,
                                m.kegiatanPembelajaran,
                                m.catatanRefleksi
                              )
                            }
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition cursor-pointer"
                            title="Unduh Laporan PDF"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
