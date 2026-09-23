import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  HardDrive,
  Download,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Calendar,
  Clock,
  ShieldCheck,
  History,
  RotateCcw,
  Sparkles,
  Database,
  Info,
  Check,
  Users,
  ClipboardList,
  BookOpen,
  Trash2,
  Upload,
  ArrowDownToLine,
  FileText,
  HelpCircle,
} from 'lucide-react';
import {
  Student,
  AttendanceRecord,
  SchoolConfig,
  TeacherUser,
  TeachingJournal,
  FullBackupPayload,
  BackupHistoryItem,
} from '../types';
import {
  generateStudentsCsv,
  generateAttendanceCsv,
  generateJournalsCsv,
  generateTeachersCsv,
  downloadCsvFile,
  downloadJsonFile,
  downloadFullBackupXlsx,
  createFullBackupZip,
  downloadBlob,
  getBackupHistory,
  addBackupHistoryItem,
  clearBackupHistory,
  parseAndValidateBackupPayload,
} from '../utils/googleDriveBackup';

interface BackupDriveViewProps {
  config: SchoolConfig;
  students: Student[];
  attendance: AttendanceRecord[];
  journals: TeachingJournal[];
  teachers: TeacherUser[];
  kalenderHebData: Record<string, boolean>;
  onUpdateConfig?: (newConfig: SchoolConfig) => Promise<void>;
  onRestoreAllData: (payload: FullBackupPayload) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const BackupDriveView: React.FC<BackupDriveViewProps> = ({
  config,
  students,
  attendance,
  journals,
  teachers,
  kalenderHebData,
  onRestoreAllData,
  onShowNotice,
  onShowConfirm,
}) => {
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isExportingXlsx, setIsExportingXlsx] = useState<boolean>(false);
  const [isExportingJson, setIsExportingJson] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [historyList, setHistoryList] = useState<BackupHistoryItem[]>([]);

  // Restore file preview state
  const [restoreFilePayload, setRestoreFilePayload] = useState<FullBackupPayload | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load local backup history on mount
  useEffect(() => {
    setHistoryList(getBackupHistory());
  }, []);

  // Construct full backup payload
  const currentPayload: FullBackupPayload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    schoolName: config.namaSekolah || 'SMP PGRI 1 CIKADU',
    npsn: config.npsn || '69919136',
    config,
    students,
    attendance,
    journals,
    teachers,
    kalenderHeb: kalenderHebData,
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const formattedSchoolName = (config.namaSekolah || 'SMP_PGRI_1_CIKADU')
    .replace(/\s+/g, '_')
    .toUpperCase();

  // 1. Download Master JSON Payload
  const handleDownloadMasterJson = () => {
    try {
      setIsExportingJson(true);
      const fileName = `BACKUP_${formattedSchoolName}_${todayStr}_MASTER.json`;
      downloadJsonFile(currentPayload, fileName);

      const newHistory = addBackupHistoryItem({
        id: `manual-json-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: todayStr,
        time: new Date().toLocaleTimeString('id-ID'),
        totalStudents: students.length,
        totalAttendance: attendance.length,
        totalJournals: journals.length,
        totalTeachers: teachers.length,
        fileNames: [fileName],
        driveFolderId: 'OFFLINE_LOCAL',
        status: 'SUCCESS',
        source: 'MANUAL',
        message: 'Unduhan berkas Master JSON untuk restore database',
      });
      setHistoryList(newHistory);
      onShowNotice(
        'Cadangan JSON Berhasil',
        `Berkas "${fileName}" berhasil diunduh ke komputer Anda. Simpan file ini untuk kebutuhan restore.`,
        'success'
      );
    } catch (err: any) {
      onShowNotice('Gagal Mengunduh', err.message, 'warning');
    } finally {
      setIsExportingJson(false);
    }
  };

  // 2. Download Multi-Sheet Excel
  const handleDownloadMasterXlsx = () => {
    try {
      setIsExportingXlsx(true);
      const fileName = `DATABASE_LENGKAP_${formattedSchoolName}_${todayStr}.xlsx`;
      downloadFullBackupXlsx(currentPayload, fileName);

      const newHistory = addBackupHistoryItem({
        id: `manual-xlsx-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: todayStr,
        time: new Date().toLocaleTimeString('id-ID'),
        totalStudents: students.length,
        totalAttendance: attendance.length,
        totalJournals: journals.length,
        totalTeachers: teachers.length,
        fileNames: [fileName],
        driveFolderId: 'OFFLINE_LOCAL',
        status: 'SUCCESS',
        source: 'MANUAL',
        message: 'Unduhan Buku Kerja Excel Komprehensif (4 Sheet)',
      });
      setHistoryList(newHistory);
      onShowNotice(
        'Buku Kerja Excel Berhasil',
        `Berkas "${fileName}" berhasil diunduh. Berisi 4 sheet: Siswa, Presensi, Jurnal Mengajar, dan Master Guru.`,
        'success'
      );
    } catch (err: any) {
      onShowNotice('Gagal Mengunduh Excel', err.message, 'warning');
    } finally {
      setIsExportingXlsx(false);
    }
  };

  // 3. Download Full ZIP Archive
  const handleDownloadFullZip = async () => {
    try {
      setIsExportingZip(true);
      const fileName = `ARSIP_BACKUP_LENGKAP_${formattedSchoolName}_${todayStr}.zip`;
      const zipBlob = await createFullBackupZip(currentPayload);
      downloadBlob(zipBlob, fileName);

      const newHistory = addBackupHistoryItem({
        id: `manual-zip-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: todayStr,
        time: new Date().toLocaleTimeString('id-ID'),
        totalStudents: students.length,
        totalAttendance: attendance.length,
        totalJournals: journals.length,
        totalTeachers: teachers.length,
        fileNames: [
          fileName,
          '1_DATA_SISWA.csv',
          '2_LOG_PRESENSI.csv',
          '3_JURNAL_MENGAJAR.csv',
          '4_DATA_GURU.csv',
          'BACKUP_MASTER.json',
        ],
        driveFolderId: 'OFFLINE_LOCAL',
        status: 'SUCCESS',
        source: 'MANUAL',
        message: 'Unduhan Arsip Lengkap ZIP (CSV, JSON & Petunjuk Restorasi)',
      });
      setHistoryList(newHistory);
      onShowNotice(
        'Arsip ZIP Berhasil Dibuat',
        `Berkas "${fileName}" berhasil diunduh. Berisi berkas CSV terpisah, JSON master, dan petunjuk pemulihan.`,
        'success'
      );
    } catch (err: any) {
      onShowNotice('Gagal Mengunduh ZIP', err.message, 'warning');
    } finally {
      setIsExportingZip(false);
    }
  };

  // 4. Partial Category CSV & Excel Downloads
  const handleDownloadCategory = (
    category: 'students' | 'attendance' | 'journals' | 'teachers',
    format: 'csv' | 'xlsx'
  ) => {
    try {
      if (format === 'csv') {
        let content = '';
        let fileName = '';
        if (category === 'students') {
          content = generateStudentsCsv(students);
          fileName = `DATA_SISWA_${formattedSchoolName}_${todayStr}.csv`;
        } else if (category === 'attendance') {
          content = generateAttendanceCsv(attendance);
          fileName = `LOG_PRESENSI_${formattedSchoolName}_${todayStr}.csv`;
        } else if (category === 'journals') {
          content = generateJournalsCsv(journals);
          fileName = `JURNAL_MENGAJAR_${formattedSchoolName}_${todayStr}.csv`;
        } else {
          content = generateTeachersCsv(teachers);
          fileName = `DATA_GURU_${formattedSchoolName}_${todayStr}.csv`;
        }
        downloadCsvFile(content, fileName);
        onShowNotice('Unduhan Berhasil', `Berkas "${fileName}" berhasil diunduh dalam format CSV.`, 'success');
      } else {
        // Excel format
        const wb = XLSX.utils.book_new();
        let fileName = '';
        if (category === 'students') {
          const rows = students.map((s, idx) => ({
            No: idx + 1,
            NISN: s.nisn,
            'Nama Siswa': s.nama,
            'L/P': s.jk,
            Kelas: s.kelas,
            'Foto URL': s.fotoUrl || '',
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Master Siswa');
          fileName = `DATA_SISWA_${formattedSchoolName}_${todayStr}.xlsx`;
        } else if (category === 'attendance') {
          const rows = attendance.map((a, idx) => ({
            No: idx + 1,
            Tanggal: a.tanggal,
            Waktu: a.waktu,
            NISN: a.nisn,
            'Nama Siswa': a.nama,
            Kelas: a.kelas,
            Sesi: a.sesi,
            Status: a.status,
            Kategori: a.kategori || 'APEL',
            'Mata Pelajaran': a.mapel || '-',
            'Pertemuan Ke': a.pertemuanKe ?? '-',
            'Materi Pokok': a.materiPokok || '-',
            'Guru Pengajar': a.guruNama || '-',
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Log Presensi');
          fileName = `LOG_PRESENSI_${formattedSchoolName}_${todayStr}.xlsx`;
        } else if (category === 'journals') {
          const rows = journals.map((j, idx) => ({
            No: idx + 1,
            Tanggal: j.tanggal,
            'Pertemuan Ke': j.pertemuanKe,
            'Jam Pelajaran': j.jamPelajaran || '-',
            Kelas: j.kelas,
            'Mata Pelajaran': j.mapel,
            'Nama Guru': j.guruNama,
            NIP: j.guruNip || '-',
            'Materi Pokok': j.materiPokok,
            'Kegiatan Pembelajaran': j.kegiatanPembelajaran || '-',
            'Catatan Refleksi': j.catatanRefleksi || '-',
            'Total Siswa': j.totalSiswa,
            Hadir: j.hadir,
            Terlambat: j.terlambat,
            Izin: j.izin,
            Sakit: j.sakit,
            Alpa: j.alpa,
            '% Hadir': `${j.persentaseKehadiran}%`,
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Jurnal Mengajar');
          fileName = `JURNAL_MENGAJAR_${formattedSchoolName}_${todayStr}.xlsx`;
        } else {
          const rows = teachers.map((t, idx) => ({
            No: idx + 1,
            NIP: t.nip || '-',
            'Nama Guru': t.nama,
            Username: t.username,
            'Mata Pelajaran': t.mapel,
            'Wali Kelas': t.waliKelas || '-',
            'Kontak / WA': t.kontak || t.noHp || '-',
            Status: t.status,
          }));
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, 'Master Guru');
          fileName = `DATA_GURU_${formattedSchoolName}_${todayStr}.xlsx`;
        }
        XLSX.writeFile(wb, fileName);
        onShowNotice('Unduhan Berhasil', `Berkas "${fileName}" berhasil diunduh dalam format Excel.`, 'success');
      }
    } catch (err: any) {
      onShowNotice('Gagal Mengunduh', err.message, 'warning');
    }
  };

  // 5. Restore File Selection & Parse
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = parseAndValidateBackupPayload(text);
        if (!result.valid || !result.payload) {
          onShowNotice(
            'Berkas Tidak Valid',
            result.error || 'Format berkas tidak sesuai dengan standar backup e-Presensi.',
            'warning'
          );
          setRestoreFilePayload(null);
          return;
        }

        setRestoreFilePayload(result.payload);
        onShowNotice(
          'Berkas Terverifikasi',
          `Berkas "${file.name}" berhasil dibaca: ${result.payload.students.length} Siswa, ${result.payload.attendance.length} Presensi, ${result.payload.journals?.length || 0} Jurnal, ${result.payload.teachers?.length || 0} Guru.`,
          'info'
        );
      } catch (err: any) {
        onShowNotice('Gagal Membaca Berkas', err.message || 'Format JSON tidak valid.', 'warning');
        setRestoreFilePayload(null);
      }
    };
    reader.readAsText(file);
  };

  // 6. Execute Database Restore
  const handleExecuteRestore = () => {
    if (!restoreFilePayload) return;

    onShowConfirm(
      'Konfirmasi Pemulihan Database',
      `Apakah Anda yakin ingin memulihkan database dari berkas "${restoreFileName}"? Proses ini akan memperbarui data siswa, presensi, jurnal mengajar, dan akun guru sesuai isi berkas cadangan.`,
      async () => {
        try {
          setIsRestoring(true);
          await onRestoreAllData(restoreFilePayload);
          onShowNotice(
            'Pemulihan Database Sukses',
            `Seluruh data berhasil dipulihkan: ${restoreFilePayload.students.length} Siswa, ${restoreFilePayload.attendance.length} Log Presensi, ${restoreFilePayload.journals?.length || 0} Jurnal Mengajar.`,
            'success'
          );
          setRestoreFilePayload(null);
          setRestoreFileName('');
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } catch (err: any) {
          onShowNotice('Gagal Memulihkan Data', err.message, 'warning');
        } finally {
          setIsRestoring(false);
        }
      }
    );
  };

  const handleClearHistory = () => {
    onShowConfirm(
      'Hapus Riwayat Unduhan Cadangan',
      'Apakah Anda ingin mengosongkan catatan riwayat unduhan cadangan lokal pada browser ini?',
      () => {
        clearBackupHistory();
        setHistoryList([]);
        onShowNotice('Riwayat Dikosongkan', 'Catatan riwayat unduhan berhasil dihapus.', 'info');
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden border border-emerald-500/30">
        <div className="relative z-10 space-y-2 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              100% Bebas Eror &bull; Offline &amp; Instan
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-white/10 text-white/90 uppercase tracking-wider">
              {config.namaSekolah || 'SMP PGRI 1 CIKADU'}
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Pusat Cadangan &amp; Pemulihan Data Manual
          </h2>

          <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
            Amankan seluruh data sekolah ke berkas mandiri (ZIP, JSON, Excel .xlsx) langsung ke komputer Anda dengan 1-klik tanpa perlu konfigurasi token atau akun yang rumit dan rentan eror.
          </p>
        </div>

        <div className="relative z-10 shrink-0 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center sm:text-right space-y-1">
          <div className="flex items-center gap-2 justify-center sm:justify-end text-amber-300 font-bold text-xs">
            <Sparkles className="w-4 h-4" />
            <span>Kesiapan Database</span>
          </div>
          <p className="text-xs text-white/80">Status: <strong className="text-white">Siap Dicadangkan</strong></p>
          <p className="text-[11px] text-emerald-200 font-mono">
            {todayStr} &bull; {new Date().toLocaleTimeString('id-ID')} WIB
          </p>
        </div>

        {/* Background glow circle */}
        <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* 2. Database Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 block truncate">Master Siswa</span>
            <p className="text-xl font-black text-slate-900 leading-none mt-1">
              {students.length} <span className="text-xs font-semibold text-slate-500">Siswa</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 block truncate">Log Presensi Siswa</span>
            <p className="text-xl font-black text-slate-900 leading-none mt-1">
              {attendance.length} <span className="text-xs font-semibold text-slate-500">Log</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 block truncate">Jurnal Mengajar Guru</span>
            <p className="text-xl font-black text-slate-900 leading-none mt-1">
              {journals.length} <span className="text-xs font-semibold text-slate-500">KBM</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-500 block truncate">Master Akun Guru</span>
            <p className="text-xl font-black text-slate-900 leading-none mt-1">
              {teachers.length} <span className="text-xs font-semibold text-slate-500">Guru</span>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Three Main Full Backup Actions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              1-Klik Cadangkan Seluruh Database Sekolah
            </h3>
            <p className="text-xs text-slate-500">
              Pilih format cadangan yang Anda butuhkan untuk diunduh langsung ke komputer / laptop
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 self-start sm:self-auto">
            🚀 Download Seketika &bull; Tanpa Otorisasi
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Master JSON for Restore */}
          <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/50 border-2 border-blue-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-blue-400 transition shadow-2xs">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <FileCode className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Master Database JSON (.json)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Format standar resmi snapshot database e-Presensi. Berkas ini digunakan untuk <strong>memulihkan (restore)</strong> seluruh data aplikasi kapan saja.
              </p>
              <div className="text-[11px] font-mono text-blue-700 bg-blue-100/60 p-2 rounded-lg">
                &bull; Memuat seluruh tabel &amp; konfigurasi
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadMasterJson}
              disabled={isExportingJson}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isExportingJson ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Unduh Master JSON (.json)</span>
            </button>
          </div>

          {/* Card 2: Multi-Sheet Excel */}
          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/50 border-2 border-emerald-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-emerald-400 transition shadow-2xs">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Buku Kerja Excel Lengkap (.xlsx)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                1 Buku Kerja Microsoft Excel yang memuat <strong>4 Sheet Terpisah</strong>: Master Siswa, Rekap Presensi, Jurnal Mengajar, dan Master Guru.
              </p>
              <div className="text-[11px] font-mono text-emerald-700 bg-emerald-100/60 p-2 rounded-lg">
                &bull; 4 Sheet Rapi &bull; Siap Dibuka di Excel
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadMasterXlsx}
              disabled={isExportingXlsx}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isExportingXlsx ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Unduh Excel Lengkap (.xlsx)</span>
            </button>
          </div>

          {/* Card 3: Full ZIP Archive */}
          <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/50 border-2 border-amber-200 rounded-2xl p-4 flex flex-col justify-between space-y-4 hover:border-amber-400 transition shadow-2xs">
            <div className="space-y-2">
              <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                <FileArchive className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Arsip Cadangan Lengkap (.zip)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paket arsip kompresi ZIP yang berisi <strong>4 file CSV terpisah</strong> + Berkas Master JSON + Petunjuk Pemulihan Database lengkap.
              </p>
              <div className="text-[11px] font-mono text-amber-800 bg-amber-100/60 p-2 rounded-lg">
                &bull; CSV + JSON + Petunjuk Restorasi
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadFullZip}
              disabled={isExportingZip}
              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              {isExportingZip ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>Unduh Arsip ZIP (.zip)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Partial Category Export Cards */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Cadangkan Parsial / Unduh Per Kategori Data
          </h3>
          <p className="text-xs text-slate-500">
            Ekspor data per kategori secara spesifik dalam format Excel (.xlsx) atau CSV (.csv)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Category 1: Students */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                {students.length} Siswa
              </span>
              <h4 className="text-sm font-bold text-slate-900">Master Data Siswa</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Daftar lengkap NISN, nama siswa, jenis kelamin, kelas, dan foto.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => handleDownloadCategory('students', 'xlsx')}
                className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCategory('students', 'csv')}
                className="py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Category 2: Attendance */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                {attendance.length} Log
              </span>
              <h4 className="text-sm font-bold text-slate-900">Log Presensi Siswa</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Rekam jejak kehadiran harian (Apel Pagi, Apel Siang, dan KBM).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => handleDownloadCategory('attendance', 'xlsx')}
                className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCategory('attendance', 'csv')}
                className="py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Category 3: Journals */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                {journals.length} Jurnal
              </span>
              <h4 className="text-sm font-bold text-slate-900">Jurnal Mengajar Guru</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Catatan materi pokok, kegiatan pembelajaran, dan kehadiran KBM.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => handleDownloadCategory('journals', 'xlsx')}
                className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCategory('journals', 'csv')}
                className="py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                CSV (.csv)
              </button>
            </div>
          </div>

          {/* Category 4: Teachers */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                {teachers.length} Guru
              </span>
              <h4 className="text-sm font-bold text-slate-900">Master Data Guru</h4>
              <p className="text-[11px] text-slate-500 leading-tight">
                Daftar akun login guru, NIP, mata pelajaran, dan wali kelas.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => handleDownloadCategory('teachers', 'xlsx')}
                className="py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => handleDownloadCategory('teachers', 'csv')}
                className="py-1.5 px-2 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[11px] rounded-lg transition text-center cursor-pointer"
              >
                CSV (.csv)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Database Restore Module */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-5 sm:p-7 text-white shadow-xl space-y-5 border border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
          <div className="space-y-1">
            <h3 className="text-base sm:text-lg font-black flex items-center gap-2 text-amber-300">
              <RotateCcw className="w-5 h-5 text-amber-400" />
              Pemulihan Database (Restore Data dari Berkas Cadangan)
            </h3>
            <p className="text-xs text-slate-300">
              Unggah berkas JSON cadangan (*_MASTER.json atau *_FULL.json) untuk mengembalikan seluruh isi database
            </p>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded-full self-start sm:self-auto">
            Mode Administrator
          </span>
        </div>

        {/* Upload Dropzone */}
        <div className="bg-slate-800/80 border-2 border-dashed border-slate-600 hover:border-amber-400 rounded-2xl p-6 text-center transition space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-400/20">
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="text-sm font-bold text-slate-200">
              Pilih atau Tarik Berkas Cadangan JSON ke Sini
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Hanya menerima file berformat <strong>.json</strong> valid hasil cadangan e-Presensi
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
            id="restore-file-input"
          />

          <label
            htmlFor="restore-file-input"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition cursor-pointer active:scale-95"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Pilih Berkas Cadangan (.json)</span>
          </label>
        </div>

        {/* Restore Preview Panel if File Selected */}
        {restoreFilePayload && (
          <div className="bg-slate-800 border-2 border-amber-400/80 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold text-white">
                    Berkas Siap Dipulihkan: <span className="text-amber-300 font-mono">{restoreFileName}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Waktu Cadangan Dibuat: {restoreFilePayload.exportedAt}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRestoreFilePayload(null);
                  setRestoreFileName('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                Batal
              </button>
            </div>

            {/* Preview Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold block">Siswa Akan Dipulihkan</span>
                <p className="text-base font-black text-white mt-1">
                  {restoreFilePayload.students.length} Siswa
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold block">Log Presensi</span>
                <p className="text-base font-black text-white mt-1">
                  {restoreFilePayload.attendance.length} Catatan
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold block">Jurnal KBM</span>
                <p className="text-base font-black text-white mt-1">
                  {restoreFilePayload.journals?.length || 0} Jurnal
                </p>
              </div>

              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 text-[10px] font-bold block">Master Akun Guru</span>
                <p className="text-base font-black text-white mt-1">
                  {restoreFilePayload.teachers?.length || 0} Guru
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200/90 leading-relaxed">
              ⚠️ <strong>Peringatan Penting:</strong> Pemulihan database akan memperbarui data di database lokal dan Firestore. Pastikan berkas yang Anda pilih adalah berkas cadangan resmi yang valid.
            </div>

            <button
              type="button"
              onClick={handleExecuteRestore}
              disabled={isRestoring}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 text-slate-950 font-black text-sm rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Sedang Memproses Pemulihan Database...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-5 h-5" />
                  <span>Pulihkan &amp; Sinkronkan ke Database Sekarang</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 6. Local Backup History & Storage Guides */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* History List */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-700" />
              Riwayat Cadangan Manual di Perangkat Ini
            </h3>
            {historyList.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan</span>
              </button>
            )}
          </div>

          {historyList.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Database className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-medium">Belum ada riwayat unduhan cadangan manual di browser ini.</p>
              <p className="text-[11px] text-slate-400">Klik tombol di atas untuk membuat cadangan pertama Anda.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {historyList.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 font-bold text-slate-800 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{item.fileNames?.[0] || 'Berkas Cadangan'}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {item.date} &bull; {item.time} WIB &bull; {item.totalStudents} Siswa, {item.totalAttendance} Log
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md shrink-0 ml-2">
                    Tersimpan
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Practical Storage Tips */}
        <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/50 border border-indigo-200 rounded-3xl p-5 shadow-xs space-y-3">
          <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 border-b border-indigo-100 pb-2.5">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            Tips Pengamanan Cadangan
          </h3>

          <div className="space-y-2.5 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <p>
                <strong>Simpan di Flashdisk / Harddisk Eksternal:</strong> Salin file ZIP atau JSON secara berkala ke penyimpanan fisik sekolah.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <p>
                <strong>Upload ke Google Drive Manual:</strong> Anda dapat mengunggah file ZIP atau Excel hasil unduhan ke folder Google Drive pribadi / sekolah secara manual tanpa perlu login API yang rumit.
              </p>
            </div>

            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <p>
                <strong>Lakukan Backup Rutin:</strong> Sangat disarankan mengunduh cadangan setiap akhir pekan atau akhir semester setelah penginputan nilai/jurnal selesai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
