import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CloudUpload,
  HardDrive,
  Download,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  RefreshCw,
  ExternalLink,
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
  ArrowUpRight,
  Info,
  Check,
  Key,
  Users,
  ClipboardList,
  BookOpen,
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
  DEFAULT_DRIVE_FOLDER_ID,
  DEFAULT_DRIVE_FOLDER_URL,
  generateStudentsCsv,
  generateAttendanceCsv,
  generateJournalsCsv,
  generateTeachersCsv,
  downloadCsvFile,
  downloadJsonFile,
  createFullBackupZip,
  downloadBlob,
  getCachedDriveToken,
  saveDriveToken,
  clearDriveToken,
  requestGoogleDriveAccessToken,
  executeFullDriveBackup,
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
  onUpdateConfig: (newConfig: SchoolConfig) => Promise<void>;
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
  onUpdateConfig,
  onRestoreAllData,
  onShowNotice,
  onShowConfirm,
}) => {
  const [folderId, setFolderId] = useState<string>(
    config.googleDriveBackup?.folderId || DEFAULT_DRIVE_FOLDER_ID
  );
  const [autoDaily, setAutoDaily] = useState<boolean>(
    config.googleDriveBackup?.autoDailyBackup ?? true
  );
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(false);
  const [isBackingUpDrive, setIsBackingUpDrive] = useState<boolean>(false);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [backupStep, setBackupStep] = useState<string>('');
  const [historyList, setHistoryList] = useState<BackupHistoryItem[]>([]);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  const [showAdvancedToken, setShowAdvancedToken] = useState<boolean>(false);

  // Restore file preview state
  const [restoreFilePayload, setRestoreFilePayload] = useState<FullBackupPayload | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');

  // Check initial token status
  useEffect(() => {
    const token = getCachedDriveToken();
    setIsDriveConnected(!!token);
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

  const folderUrl = `https://drive.google.com/drive/u/0/folders/${folderId || DEFAULT_DRIVE_FOLDER_ID}`;

  // Toggle Auto-Daily Backup Setting
  const handleToggleAutoDaily = async () => {
    const updatedAuto = !autoDaily;
    setAutoDaily(updatedAuto);
    const updatedConfig: SchoolConfig = {
      ...config,
      googleDriveBackup: {
        ...(config.googleDriveBackup || {
          enabled: true,
          folderId: DEFAULT_DRIVE_FOLDER_ID,
          folderUrl: DEFAULT_DRIVE_FOLDER_URL,
          autoDailyBackup: true,
        }),
        autoDailyBackup: updatedAuto,
        folderId: folderId || DEFAULT_DRIVE_FOLDER_ID,
        folderUrl: `https://drive.google.com/drive/u/0/folders/${folderId || DEFAULT_DRIVE_FOLDER_ID}`,
      },
    };
    try {
      await onUpdateConfig(updatedConfig);
      onShowNotice(
        'Pengaturan Diperbarui',
        `Backup otomatis harian ke Google Drive berhasil ${updatedAuto ? 'diaktifkan' : 'dinonaktifkan'}.`,
        'success'
      );
    } catch (e: any) {
      onShowNotice('Gagal Menyimpan', e.message, 'warning');
    }
  };

  // Save Folder ID
  const handleSaveFolderId = async () => {
    const cleanId = folderId.trim() || DEFAULT_DRIVE_FOLDER_ID;
    setFolderId(cleanId);
    const updatedConfig: SchoolConfig = {
      ...config,
      googleDriveBackup: {
        ...(config.googleDriveBackup || {
          enabled: true,
          autoDailyBackup: true,
        }),
        folderId: cleanId,
        folderUrl: `https://drive.google.com/drive/u/0/folders/${cleanId}`,
      },
    };
    try {
      await onUpdateConfig(updatedConfig);
      onShowNotice('Folder Tersimpan', 'Folder ID tujuan Google Drive berhasil diperbarui!', 'success');
    } catch (e: any) {
      onShowNotice('Gagal Menyimpan', e.message, 'warning');
    }
  };

  // Reset to default Cikadu folder
  const handleResetDefaultFolder = () => {
    setFolderId(DEFAULT_DRIVE_FOLDER_ID);
  };

  // Connect Google Drive via GIS
  const handleConnectDrive = async () => {
    try {
      setBackupStep('Memulai otorisasi Google Drive...');
      const token = await requestGoogleDriveAccessToken(config.googleDriveBackup?.clientId);
      if (token) {
        setIsDriveConnected(true);
        onShowNotice('Google Drive Terhubung', 'Akun Google Drive berhasil diotorisasi untuk backup.', 'success');
      }
    } catch (err: any) {
      console.warn('Connect drive error:', err);
      onShowNotice('Gagal Otorisasi', err.message || 'Gagal menghubungkan Google Drive.', 'warning');
    } finally {
      setBackupStep('');
    }
  };

  // Disconnect / Clear Token
  const handleDisconnectDrive = () => {
    clearDriveToken();
    setIsDriveConnected(false);
    onShowNotice('Sesi Dihentikan', 'Koneksi akun Google Drive telah diputus dari browser ini.', 'info');
  };

  // Manual token apply
  const handleApplyManualToken = () => {
    if (!manualTokenInput.trim()) return;
    saveDriveToken(manualTokenInput.trim(), 3600);
    setIsDriveConnected(true);
    setManualTokenInput('');
    setShowAdvancedToken(false);
    onShowNotice('Token Diterapkan', 'Akses token Google Drive berhasil disimpan.', 'success');
  };

  // Execute Direct Backup to Google Drive
  const handleExecuteDriveBackup = async () => {
    setIsBackingUpDrive(true);
    setBackupStep('Menghubungkan ke Google Drive...');

    try {
      let token = getCachedDriveToken();
      if (!token) {
        setBackupStep('Meminta izin otorisasi Google Drive...');
        token = await requestGoogleDriveAccessToken(config.googleDriveBackup?.clientId);
      }

      if (!token) {
        throw new Error('Tidak ada izin akses token Google Drive.');
      }

      setIsDriveConnected(true);
      setBackupStep('Mengunggah berkas cadangan (JSON & CSV)...');

      const targetFolder = folderId.trim() || DEFAULT_DRIVE_FOLDER_ID;
      const result = await executeFullDriveBackup(token, targetFolder, currentPayload);

      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('id-ID');

      // Update school config backup metadata
      const updatedConfig: SchoolConfig = {
        ...config,
        googleDriveBackup: {
          ...(config.googleDriveBackup || {
            enabled: true,
            folderId: targetFolder,
            folderUrl,
            autoDailyBackup: true,
          }),
          lastBackupDate: dateStr,
          lastBackupTimestamp: new Date().toISOString(),
          lastBackupStatus: 'SUCCESS',
          lastBackupMessage: `Berhasil mencadangkan ${result.uploadedFiles.length} berkas ke Google Drive.`,
        },
      };
      await onUpdateConfig(updatedConfig);

      // Record in local history
      const historyItem: BackupHistoryItem = {
        id: `backup-${Date.now()}`,
        timestamp: new Date().toISOString(),
        date: dateStr,
        time: timeStr,
        totalStudents: students.length,
        totalAttendance: attendance.length,
        totalJournals: journals.length,
        totalTeachers: teachers.length,
        fileNames: result.uploadedFiles.map((f) => f.fileName),
        driveFolderId: targetFolder,
        status: 'SUCCESS',
        source: 'MANUAL_DRIVE',
        message: 'Backup komprehensif ke Google Drive sukses',
        driveWebLink: result.uploadedFiles[0]?.webViewLink || folderUrl,
      };
      const newHistory = addBackupHistoryItem(historyItem);
      setHistoryList(newHistory);

      onShowNotice(
        'Backup Google Drive Sukses!',
        `Semua data siswa (${students.length}), presensi (${attendance.length} log), jurnal (${journals.length} sesi), dan akun guru (${teachers.length}) berhasil diunggah ke Google Drive!`,
        'success'
      );
    } catch (err: any) {
      console.error('Drive backup failed:', err);
      onShowNotice('Backup Google Drive Gagal', err.message || 'Terjadi kesalahan saat mengunggah ke Google Drive.', 'warning');
    } finally {
      setIsBackingUpDrive(false);
      setBackupStep('');
    }
  };

  // CSV Direct Downloads
  const handleDownloadStudentsCsv = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const csv = generateStudentsCsv(students);
    downloadCsvFile(csv, `DATA_SISWA_SMP_PGRI_1_CIKADU_${dateStr}.csv`);
    onShowNotice('Unduhan Dimulai', `File CSV Data Siswa (${students.length} baris) berhasil diunduh.`, 'success');
  };

  const handleDownloadAttendanceCsv = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const csv = generateAttendanceCsv(attendance);
    downloadCsvFile(csv, `LOG_PRESENSI_SMP_PGRI_1_CIKADU_${dateStr}.csv`);
    onShowNotice('Unduhan Dimulai', `File CSV Log Presensi (${attendance.length} catatan) berhasil diunduh.`, 'success');
  };

  const handleDownloadJournalsCsv = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const csv = generateJournalsCsv(journals);
    downloadCsvFile(csv, `JURNAL_MENGAJAR_SMP_PGRI_1_CIKADU_${dateStr}.csv`);
    onShowNotice('Unduhan Dimulai', `File CSV Jurnal Mengajar (${journals.length} sesi) berhasil diunduh.`, 'success');
  };

  const handleDownloadTeachersCsv = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const csv = generateTeachersCsv(teachers);
    downloadCsvFile(csv, `DATA_GURU_SMP_PGRI_1_CIKADU_${dateStr}.csv`);
    onShowNotice('Unduhan Dimulai', `File CSV Data Guru (${teachers.length} guru) berhasil diunduh.`, 'success');
  };

  const handleDownloadFullJson = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    downloadJsonFile(currentPayload, `BACKUP_FULL_SMP_PGRI_1_CIKADU_${dateStr}.json`);
    onShowNotice('Unduhan Dimulai', 'File Snapshot JSON Master lengkap berhasil diunduh.', 'success');
  };

  const handleDownloadFullZip = async () => {
    setIsExportingZip(true);
    try {
      const dateStr = new Date().toISOString().split('T')[0];
      const zipBlob = await createFullBackupZip(currentPayload);
      downloadBlob(zipBlob, `ARSIP_LENGKAP_SMP_PGRI_1_CIKADU_${dateStr}.zip`);
      onShowNotice('Paket ZIP Siap', 'Paket arsip ZIP lengkap (JSON + 4 CSV + Readme) berhasil diunduh.', 'success');
    } catch (err: any) {
      onShowNotice('Gagal Membuat ZIP', err.message, 'warning');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Restore file selection handler
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rawText = evt.target?.result as string;
      const res = parseAndValidateBackupPayload(rawText);
      if (res.valid && res.payload) {
        setRestoreFilePayload(res.payload);
        onShowNotice('File Backup Terverifikasi', `File valid: ${res.payload.students.length} siswa, ${res.payload.attendance.length} log presensi, ${res.payload.journals.length} jurnal.`, 'info');
      } else {
        setRestoreFilePayload(null);
        onShowNotice('File Tidak Valid', res.error || 'Format file JSON tidak sesuai struktur backup.', 'warning');
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore with user confirmation
  const handleConfirmRestore = () => {
    if (!restoreFilePayload) return;

    onShowConfirm(
      'Konfirmasi Pemulihan (Restore) Data',
      `Apakah Anda yakin ingin memulihkan data dari berkas "${restoreFileName}"?\n\n- Siswa: ${restoreFilePayload.students.length} data\n- Presensi: ${restoreFilePayload.attendance.length} data\n- Jurnal Mengajar: ${restoreFilePayload.journals.length} data\n- Guru: ${restoreFilePayload.teachers.length} data\n\nDatabase aktif akan digantikan dengan isi file cadangan ini.`,
      async () => {
        setIsRestoring(true);
        try {
          await onRestoreAllData(restoreFilePayload);
          setRestoreFilePayload(null);
          setRestoreFileName('');
          onShowNotice('Pemulihan Sukses', 'Seluruh data berhasil dipulihkan dari berkas cadangan ke database.', 'success');
        } catch (err: any) {
          onShowNotice('Gagal Memulihkan', err.message || 'Terjadi kesalahan saat memulihkan data.', 'warning');
        } finally {
          setIsRestoring(false);
        }
      }
    );
  };

  const lastBackupDate = config.googleDriveBackup?.lastBackupDate;
  const lastBackupTime = config.googleDriveBackup?.lastBackupTimestamp
    ? new Date(config.googleDriveBackup.lastBackupTimestamp).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. TOP HEADER & OVERVIEW BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span>Pusat Keamanan &amp; Cadangan Cloud</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Backup Harian Google Drive &amp; Ekspor CSV
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm max-w-2xl font-medium">
              Sistem pencadangan otomatis harian langsung ke Google Drive folder resmi SMP PGRI 1 CIKADU dan ekspor manual CSV / ZIP untuk perlindungan data siswa, presensi, &amp; jurnal mengajar.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 bg-white/15 hover:bg-white/25 border border-white/30 backdrop-blur-md text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <FolderOpen className="w-4 h-4 text-emerald-300" />
              <span>Buka Folder Google Drive</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <button
              type="button"
              onClick={handleExecuteDriveBackup}
              disabled={isBackingUpDrive}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-slate-950 font-black rounded-2xl text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg cursor-pointer transform active:scale-95"
            >
              <CloudUpload className={`w-5 h-5 ${isBackingUpDrive ? 'animate-bounce' : ''}`} />
              <span>{isBackingUpDrive ? 'Memproses Backup...' : '⚡ Backup ke Google Drive Sekarang'}</span>
            </button>
          </div>
        </div>

        {/* Status Pill Strip */}
        <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-blue-200 block uppercase font-bold">Total Data Siswa</span>
            <span className="text-lg font-black">{students.length} Siswa</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-blue-200 block uppercase font-bold">Total Log Presensi</span>
            <span className="text-lg font-black">{attendance.length} Catatan</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-blue-200 block uppercase font-bold">Jurnal Pembelajaran</span>
            <span className="text-lg font-black">{journals.length} Sesi KBM</span>
          </div>
          <div className="bg-white/10 rounded-2xl p-3 backdrop-blur-xs">
            <span className="text-[10px] text-blue-200 block uppercase font-bold">Backup Terakhir</span>
            <span className="text-xs sm:text-sm font-black truncate block">
              {lastBackupDate ? `${lastBackupDate} (${lastBackupTime})` : 'Belum Ada'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress banner during active backup */}
      {isBackingUpDrive && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 animate-pulse text-emerald-900 text-xs">
          <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
          <div className="flex-1">
            <span className="font-extrabold block">Sedang Menjalankan Sinkronisasi Cadangan...</span>
            <span className="text-emerald-700">{backupStep || 'Mengunggah seluruh data ke Google Drive...'}</span>
          </div>
        </div>
      )}

      {/* 2. MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 COLS): GOOGLE DRIVE AUTOMATION & CONFIG */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Google Drive Sync & Automation Settings */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-2xs">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Koneksi &amp; Sinkronisasi Google Drive
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadangan otomatis diunggah ke folder Google Drive sekolah setiap hari.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isDriveConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Terhubung</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>Siap Diotorisasi</span>
                  </span>
                )}
              </div>
            </div>

            {/* Folder Destination Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <FolderOpen className="w-4 h-4 text-emerald-600" />
                  <span>Folder Tujuan di Google Drive</span>
                </label>
                <a
                  href={folderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <span>Lihat Folder</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    placeholder="Folder ID Google Drive"
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveFolderId}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer shadow-xs"
                  >
                    Simpan ID
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-xs sm:max-w-md font-mono text-[10px]">
                    Link: {folderUrl}
                  </span>
                  {folderId !== DEFAULT_DRIVE_FOLDER_ID && (
                    <button
                      type="button"
                      onClick={handleResetDefaultFolder}
                      className="text-blue-600 hover:underline shrink-0 font-semibold cursor-pointer"
                    >
                      Reset ke Folder Cikadu
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Auto Daily Toggle & Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-extrabold text-emerald-950 block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Otomatisasi Backup Harian (Setiap Hari)
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    Saat aplikasi aktif setiap hari, data siswa, presensi, &amp; jurnal langsung dicadangkan ke Google Drive.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleAutoDaily}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoDaily ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      autoDaily ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons: 1-Click Upload & Connect */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExecuteDriveBackup}
                  disabled={isBackingUpDrive}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-extrabold rounded-2xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{isBackingUpDrive ? 'Sedang Backup...' : 'Mulai Backup ke Drive Sekarang'}</span>
                </button>

                {!isDriveConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectDrive}
                    className="py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-blue-600" />
                    <span>Hubungkan Akun Google</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnectDrive}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-500" />
                    <span>Putus Sesi Token Drive</span>
                  </button>
                )}
              </div>
            </div>

            {/* Advanced Token Configuration Accordion */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAdvancedToken(!showAdvancedToken)}
                className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>{showAdvancedToken ? '▼ Sembunyikan' : '▶ Opsi Lanjutan: Input OAuth Token Manual / Konfigurasi Client'}</span>
              </button>

              {showAdvancedToken && (
                <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-xs animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Tempel OAuth Access Token Google Drive Manual (Opsional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="ya29.a0AfH6SM..."
                        value={manualTokenInput}
                        onChange={(e) => setManualTokenInput(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyManualToken}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-[11px] cursor-pointer"
                      >
                        Terapkan
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Berguna jika Anda menggunakan token OAuth sementara dari Google OAuth Playground / Cloud Console.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: History & Backup Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Riwayat &amp; Log Backup Terakhir
                </h3>
              </div>
              {historyList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    clearBackupHistory();
                    setHistoryList([]);
                  }}
                  className="text-[11px] text-slate-400 hover:text-rose-600 font-semibold cursor-pointer"
                >
                  Bersihkan Riwayat
                </button>
              )}
            </div>

            {historyList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Clock className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                <p className="text-xs">Belum ada riwayat backup yang tercatat di browser ini.</p>
                <p className="text-[11px] text-slate-400">
                  Lakukan backup ke Google Drive atau unduh berkas untuk mencatat aktivitas cadangan.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 text-xs">
                {historyList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-xs">
                          {item.date} • {item.time}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-black text-[9px]">
                          {item.source === 'AUTO_DAILY' ? 'OTOMATIS' : 'MANUAL'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">
                        {item.totalStudents} Siswa • {item.totalAttendance} Log Presensi • {item.totalJournals} Jurnal
                      </p>
                    </div>

                    <a
                      href={item.driveWebLink || folderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white hover:bg-blue-50 border border-slate-200 text-blue-700 rounded-xl font-bold text-[11px] transition flex items-center gap-1 shrink-0"
                    >
                      <span>Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 COLS): MANUAL EXPORT & RESTORE TOOLS */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Manual Export Suite (CSV, JSON, ZIP) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Ekspor File Cadangan Manual
                </h3>
                <p className="text-xs text-slate-500">
                  Unduh langsung ke laptop / HP dalam format CSV, JSON, atau ZIP.
                </p>
              </div>
            </div>

            {/* 1-Click ZIP Archive Download */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                  <FileArchive className="w-4 h-4 text-indigo-600" />
                  Paket Lengkap Semua Data (.ZIP)
                </span>
                <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black uppercase">
                  Paling Lengkap
                </span>
              </div>
              <p className="text-[11px] text-indigo-900">
                Mengemas JSON master snapshot, 4 file CSV (Siswa, Presensi, Jurnal, Guru), dan file Readme info dalam 1 berkas arsip ZIP.
              </p>
              <button
                type="button"
                onClick={handleDownloadFullZip}
                disabled={isExportingZip}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-extrabold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingZip ? 'Mengemas ZIP...' : 'Unduh Paket ZIP Cadangan Lengkap'}</span>
              </button>
            </div>

            {/* Individual CSV / JSON Buttons */}
            <div className="space-y-2 pt-1 text-xs">
              <button
                type="button"
                onClick={handleDownloadStudentsCsv}
                className="w-full p-3 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-2xl transition flex items-center justify-between font-bold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>1. Ekspor CSV Data Siswa ({students.length})</span>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadAttendanceCsv}
                className="w-full p-3 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl transition flex items-center justify-between font-bold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4 text-emerald-600" />
                  <span>2. Ekspor CSV Log Presensi ({attendance.length})</span>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadJournalsCsv}
                className="w-full p-3 bg-slate-50 hover:bg-purple-50/70 border border-slate-200 hover:border-purple-300 rounded-2xl transition flex items-center justify-between font-bold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>3. Ekspor CSV Jurnal Mengajar ({journals.length})</span>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadTeachersCsv}
                className="w-full p-3 bg-slate-50 hover:bg-amber-50/70 border border-slate-200 hover:border-amber-300 rounded-2xl transition flex items-center justify-between font-bold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>4. Ekspor CSV Akun Guru ({teachers.length})</span>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={handleDownloadFullJson}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl transition flex items-center justify-between font-bold text-slate-800 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <FileCode className="w-4 h-4 text-rose-600" />
                  <span>5. Ekspor Full Snapshot JSON (Ready-to-Restore)</span>
                </div>
                <Download className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Card 4: Restore & Recovery from Backup File */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shadow-2xs">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Pulihkan / Restore Data
                </h3>
                <p className="text-xs text-slate-500">
                  Pulihkan seluruh database dari berkas backup JSON jika terjadi kendala.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-2xl text-center space-y-2">
              <input
                type="file"
                id="restore-file-input"
                accept=".json,application/json"
                onChange={handleSelectRestoreFile}
                className="hidden"
              />
              <label
                htmlFor="restore-file-input"
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <FileCode className="w-4 h-4 text-blue-600" />
                <span>Pilih Berkas Backup (*_FULL.json)</span>
              </label>
              <p className="text-[10px] text-slate-500">
                Pilih file JSON snapshot yang pernah diunduh atau diambil dari Google Drive.
              </p>
            </div>

            {/* Restore Preview and Confirm Box */}
            {restoreFilePayload && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3 animate-in fade-in text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Berkas Siap Dipulihkan
                  </span>
                  <span className="font-mono text-[10px] text-amber-800 font-bold truncate max-w-[150px]">
                    {restoreFileName}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] bg-white/80 p-2.5 rounded-xl border border-amber-200">
                  <div>• Siswa: <b>{restoreFilePayload.students.length}</b></div>
                  <div>• Presensi: <b>{restoreFilePayload.attendance.length}</b></div>
                  <div>• Jurnal: <b>{restoreFilePayload.journals.length}</b></div>
                  <div>• Guru: <b>{restoreFilePayload.teachers.length}</b></div>
                </div>

                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isRestoring ? 'Memulihkan Data...' : 'Konfirmasi & Pulihkan Database'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
