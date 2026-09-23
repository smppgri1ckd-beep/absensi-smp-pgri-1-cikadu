import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  School,
  Clock,
  CalendarDays,
  Server,
  Upload,
  Save,
  Volume2,
  Sparkles,
  Trash2,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  CloudUpload,
  FolderOpen,
  ExternalLink,
  User,
  Camera,
  ShieldCheck,
  Phone,
  Database,
  X,
  RefreshCw,
  Layers,
  BookOpen,
  Users,
} from 'lucide-react';
import { SchoolConfig, AttendanceRecord, TeachingJournal, Student, TeacherUser } from '../types';
import { processImageFile } from '../utils/qr';
import { playBeep } from '../utils/audio';
import { TimeInput24 } from './TimeInput24';

interface SettingsViewProps {
  config: SchoolConfig;
  attendance: AttendanceRecord[];
  journals?: TeachingJournal[];
  students?: Student[];
  teachers?: TeacherUser[];
  onUpdateConfig: (newConfig: SchoolConfig) => Promise<void>;
  onCleanDuplicates: () => Promise<number>;
  onPurgeSemester: (year: number, semester: 'ganjil' | 'genap') => Promise<number>;
  onPurgeSemesterJournals?: (year: number, semester: 'ganjil' | 'genap') => Promise<number>;
  onPurgeAllAttendance?: () => Promise<number>;
  onPurgeAllJournals?: () => Promise<number>;
  onPurgeAllInputData?: (options?: {
    purgeAttendance?: boolean;
    purgeJournals?: boolean;
  }) => Promise<{ attendanceCount: number; journalCount: number }>;
  onNavigateToBackup?: () => void;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  attendance,
  journals = [],
  students = [],
  teachers = [],
  onUpdateConfig,
  onCleanDuplicates,
  onPurgeSemester,
  onPurgeSemesterJournals,
  onPurgeAllAttendance,
  onPurgeAllJournals,
  onPurgeAllInputData,
  onNavigateToBackup,
  onShowNotice,
  onShowConfirm,
}) => {
  const [formData, setFormData] = useState<SchoolConfig>(config);
  const [maintenanceYear, setMaintenanceYear] = useState<number>(new Date().getFullYear());
  const [maintenanceSem, setMaintenanceSem] = useState<'ganjil' | 'genap'>('ganjil');
  const [isSaving, setIsSaving] = useState(false);
  const adminPhotoInputRef = useRef<HTMLInputElement>(null);

  // Safety Purge Modal State
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [purgeAttendanceChecked, setPurgeAttendanceChecked] = useState(true);
  const [purgeJournalsChecked, setPurgeJournalsChecked] = useState(true);
  const [purgeConfirmationWord, setPurgeConfirmationWord] = useState('');
  const [isPurgingAll, setIsPurgingAll] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onShowNotice('Memproses Logo', 'Membersihkan latar belakang logo...', 'info');
      const b64 = await processImageFile(file, 300, 1.0);
      setFormData((prev) => ({
        ...prev,
        logoUrl: b64,
      }));
    }
  };

  const handleAdminPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onShowNotice('Memproses Foto', 'Mengoptimalkan foto profil admin...', 'info');
      const b64 = await processImageFile(file, 360, 0.88);
      setFormData((prev) => ({
        ...prev,
        adminFotoUrl: b64,
        adminProfile: {
          ...(prev.adminProfile || {
            nama: 'Administrator Sekolah',
            email: 'admin@smp-pgri-1-cikadu.sch.id',
            jabatan: 'Operator Presensi',
          }),
          fotoUrl: b64,
        },
      }));
      onShowNotice('Foto Berhasil Dipilih', 'Foto profil admin siap disimpan.', 'success');
    }
  };

  const handleRemoveAdminPhoto = () => {
    setFormData((prev) => ({
      ...prev,
      adminFotoUrl: '',
      adminProfile: prev.adminProfile ? { ...prev.adminProfile, fotoUrl: '' } : undefined,
    }));
  };

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateConfig(formData);
      onShowNotice('Tersimpan', 'Pengaturan jadwal presensi dan profil sekolah berhasil diperbarui!', 'success');
    } catch (err: any) {
      onShowNotice('Gagal', err.message, 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const testSwitchChime = () => {
    playBeep('switch');
    onShowNotice('Uji Audio', 'Nada dering notifikasi otomatis peralihan sesi berhasil diputar.', 'info');
  };

  const handleBackupExcelOnly = () => {
    const startIso = maintenanceSem === 'ganjil' ? `${maintenanceYear}-07-01` : `${maintenanceYear}-01-01`;
    const endIso = maintenanceSem === 'ganjil' ? `${maintenanceYear}-12-31` : `${maintenanceYear}-06-30`;

    const targetAtt = attendance.filter((a) => a.tanggal >= startIso && a.tanggal <= endIso);
    const targetJournals = journals.filter((j) => j.tanggal >= startIso && j.tanggal <= endIso);

    if (targetAtt.length === 0 && targetJournals.length === 0) {
      onShowNotice('Data Kosong', `Tidak ditemukan log presensi atau jurnal pada Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear}.`, 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Presensi
    const attRows: any[][] = [
      ["ARSIP CADANGAN PRESENSI SEMESTER"],
      [config.namaSekolah],
      [`Periode: ${startIso} s/d ${endIso} (Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear})`],
      [],
      ["ID", "TANGGAL", "WAKTU", "NISN", "NAMA", "KELAS", "SESI", "KATEGORI", "STATUS", "MAPEL", "GURU"]
    ];
    targetAtt.forEach((t) =>
      attRows.push([
        t.id,
        t.tanggal,
        t.waktu,
        t.nisn,
        t.nama,
        t.kelas,
        t.sesi,
        t.kategori || 'APEL',
        t.status,
        t.mapel || '-',
        t.guruNama || '-'
      ])
    );
    const wsAtt = XLSX.utils.aoa_to_sheet(attRows);
    XLSX.utils.book_append_sheet(wb, wsAtt, "ARSIP_PRESENSI");

    // Sheet 2: Jurnal Mengajar
    if (targetJournals.length > 0) {
      const jrnRows: any[][] = [
        ["ARSIP CADANGAN JURNAL MENGAJAR SEMESTER"],
        [config.namaSekolah],
        [`Periode: ${startIso} s/d ${endIso} (Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear})`],
        [],
        ["ID", "TANGGAL", "GURU", "MAPEL", "KELAS", "PERTEMUAN", "JAM", "MATERI POKOK", "KEGIATAN", "STATUS SUPERVISI", "HADIR", "SAKIT", "IZIN", "ALPA"]
      ];
      targetJournals.forEach((j) =>
        jrnRows.push([
          j.id,
          j.tanggal,
          j.guruNama,
          j.mapel,
          j.kelas,
          j.pertemuanKe,
          j.jamPelajaran,
          j.materiPokok,
          j.kegiatanPembelajaran,
          j.supervisionStatus || 'PENDING',
          j.hadir || 0,
          j.sakit || 0,
          j.izin || 0,
          j.alpa || 0,
        ])
      );
      const wsJrn = XLSX.utils.aoa_to_sheet(jrnRows);
      XLSX.utils.book_append_sheet(wb, wsJrn, "JURNAL_MENGAJAR");
    }

    XLSX.writeFile(wb, `Cadangan_Semester_${maintenanceSem.toUpperCase()}_${maintenanceYear}.xlsx`);
    onShowNotice('Cadangan Berhasil', `${targetAtt.length} presensi & ${targetJournals.length} jurnal berhasil diekspor ke Excel!`, 'success');
  };

  const handleBackupFullExcel = () => {
    if (attendance.length === 0 && journals.length === 0) {
      onShowNotice('Data Kosong', 'Tidak ada data presensi atau jurnal mengajar di sistem.', 'warning');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Semua Presensi
    const attRows: any[][] = [
      ["ARSIP LENGKAP SELURUH PRESENSI SEKOLAH"],
      [config.namaSekolah],
      [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} - Total: ${attendance.length} Baris`],
      [],
      ["ID", "TANGGAL", "WAKTU", "NISN", "NAMA", "KELAS", "SESI", "KATEGORI", "STATUS", "MAPEL", "GURU"]
    ];
    attendance.forEach((t) =>
      attRows.push([
        t.id,
        t.tanggal,
        t.waktu,
        t.nisn,
        t.nama,
        t.kelas,
        t.sesi,
        t.kategori || 'APEL',
        t.status,
        t.mapel || '-',
        t.guruNama || '-'
      ])
    );
    const wsAtt = XLSX.utils.aoa_to_sheet(attRows);
    XLSX.utils.book_append_sheet(wb, wsAtt, "SEMUA_PRESENSI");

    // Sheet 2: Semua Jurnal
    if (journals.length > 0) {
      const jrnRows: any[][] = [
        ["ARSIP LENGKAP SELURUH JURNAL MENGAJAR GURU"],
        [config.namaSekolah],
        [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID')} - Total: ${journals.length} Jurnal`],
        [],
        ["ID", "TANGGAL", "GURU", "MAPEL", "KELAS", "PERTEMUAN", "JAM", "MATERI POKOK", "KEGIATAN", "STATUS SUPERVISI", "HADIR", "SAKIT", "IZIN", "ALPA"]
      ];
      journals.forEach((j) =>
        jrnRows.push([
          j.id,
          j.tanggal,
          j.guruNama,
          j.mapel,
          j.kelas,
          j.pertemuanKe,
          j.jamPelajaran,
          j.materiPokok,
          j.kegiatanPembelajaran,
          j.supervisionStatus || 'PENDING',
          j.hadir || 0,
          j.sakit || 0,
          j.izin || 0,
          j.alpa || 0,
        ])
      );
      const wsJrn = XLSX.utils.aoa_to_sheet(jrnRows);
      XLSX.utils.book_append_sheet(wb, wsJrn, "SEMUA_JURNAL");
    }

    XLSX.writeFile(wb, `Backup_Total_${config.namaSekolah.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    onShowNotice('Cadangan Lengkap Berhasil', `File cadangan seluruh data (${attendance.length} presensi, ${journals.length} jurnal) berhasil diunduh.`, 'success');
  };

  const handleCleanupDuplicates = () => {
    onShowConfirm(
      'Bersihkan Data Berganda',
      'Sistem akan memindai database dan menghapus catatan presensi yang duplikat pada tanggal dan sesi yang sama. Lanjutkan?',
      async () => {
        const deletedCount = await onCleanDuplicates();
        onShowNotice('Pembersihan Selesai', `Berhasil menghapus ${deletedCount} catatan duplikat! Database kini bersih.`, 'success');
      }
    );
  };

  const handlePurgeSemester = () => {
    onShowConfirm(
      'Konfirmasi Reset Presensi Semester',
      `PERINGATAN: Seluruh log presensi pada Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear} akan dihapus permanen. Master siswa & guru tetap 100% aman. Lanjutkan?`,
      async () => {
        const deleted = await onPurgeSemester(maintenanceYear, maintenanceSem);
        onShowNotice('Pembersihan Selesai', `${deleted} catatan presensi semester berhasil dibersihkan!`, 'success');
      }
    );
  };

  const handlePurgeSemesterJournals = () => {
    if (!onPurgeSemesterJournals) return;
    onShowConfirm(
      'Konfirmasi Reset Jurnal Mengajar Semester',
      `PERINGATAN: Seluruh jurnal mengajar & catatan KBM pada Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear} akan dihapus permanen. Lanjutkan?`,
      async () => {
        const deleted = await onPurgeSemesterJournals(maintenanceYear, maintenanceSem);
        onShowNotice('Pembersihan Selesai', `${deleted} jurnal mengajar semester berhasil dibersihkan!`, 'success');
      }
    );
  };

  const handleExecutePurgeAllInputData = async () => {
    if (purgeConfirmationWord.trim() !== 'HAPUS SEMUA') {
      onShowNotice('Konfirmasi Salah', 'Ketik kata "HAPUS SEMUA" dengan huruf kapital untuk mengonfirmasi penghapusan data.', 'warning');
      return;
    }

    if (!purgeAttendanceChecked && !purgeJournalsChecked) {
      onShowNotice('Pilih Kategori', 'Pilih minimal salah satu kategori data yang ingin dihapus.', 'warning');
      return;
    }

    setIsPurgingAll(true);
    try {
      if (onPurgeAllInputData) {
        const res = await onPurgeAllInputData({
          purgeAttendance: purgeAttendanceChecked,
          purgeJournals: purgeJournalsChecked,
        });
        onShowNotice(
          'Data Berhasil Dihapus',
          `Sukses membersihkan ${res.attendanceCount} log presensi dan ${res.journalCount} jurnal mengajar. Master data siswa & guru tetap aman!`,
          'success'
        );
      } else {
        if (purgeAttendanceChecked && onPurgeAllAttendance) {
          await onPurgeAllAttendance();
        }
        if (purgeJournalsChecked && onPurgeAllJournals) {
          await onPurgeAllJournals();
        }
        onShowNotice('Data Berhasil Dihapus', 'Seluruh data inputan terpilih telah dibersihkan dari database.', 'success');
      }
      setIsPurgeModalOpen(false);
      setPurgeConfirmationWord('');
    } catch (err: any) {
      onShowNotice('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus data.', 'warning');
    } finally {
      setIsPurgingAll(false);
    }
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-5 max-w-7xl mx-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Pengaturan Sistem &amp; Jadwal Presensi
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Konfigurasi jam masuk &amp; pulang, notifikasi alih sesi otomatis, profil sekolah, dan perawatan database.
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT COLUMN: ATTENDANCE SCHEDULE SETTINGS (NEW FEATURE) & WELCOME SCREEN */}
        <div className="space-y-5">
          {/* 1. SCHEDULE & AUTO SWITCH CONFIGURATION */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Pengaturan Waktu Absensi &amp; Notifikasi Otomatis
              </h4>
              <button
                type="button"
                onClick={testSwitchChime}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
                title="Uji Suara Notifikasi"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Tes Suara Alih Sesi</span>
              </button>
            </div>

            {/* Sesi Pagi */}
            <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-blue-900 text-xs">
                  1. Sesi Apel Pagi (Kedatangan / Apel Masuk)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                  Apel Pagi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TimeInput24
                  id="morning-start-time"
                  label="Jam Mulai Sesi"
                  value={formData.schedule.morningStart}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, morningStart: val },
                    })
                  }
                  presets={['06:00', '06:30']}
                />

                <TimeInput24
                  id="morning-ontime-time"
                  label="Batas Tepat Waktu"
                  value={formData.schedule.morningOnTimeEnd}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, morningOnTimeEnd: val },
                    })
                  }
                  presets={['07:00', '07:15']}
                />

                <TimeInput24
                  id="morning-cutoff-time"
                  label="Batas Akhir Sesi"
                  value={formData.schedule.morningCutoff}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, morningCutoff: val },
                    })
                  }
                  presets={['11:00', '11:30']}
                />
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Format 24 Jam (WIB). Lewat dari batas tepat waktu (<strong>{formData.schedule.morningOnTimeEnd} WIB</strong>) akan otomatis tercatat sebagai status <strong>"Terlambat"</strong>.
              </p>
            </div>

            {/* Sesi Siang */}
            <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-emerald-900 text-xs">
                  2. Sesi Apel Siang (Kepulangan / Apel Siang)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700">
                  Apel Siang
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TimeInput24
                  id="afternoon-start-time"
                  label="Jam Mulai Sesi"
                  value={formData.schedule.afternoonStart}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, afternoonStart: val },
                    })
                  }
                  presets={['12:30', '13:00']}
                />

                <TimeInput24
                  id="afternoon-ontime-time"
                  label="Batas Pulang Standar"
                  value={formData.schedule.afternoonOnTimeEnd}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, afternoonOnTimeEnd: val },
                    })
                  }
                  presets={['14:00', '15:00']}
                />

                <TimeInput24
                  id="afternoon-cutoff-time"
                  label="Batas Akhir Sesi"
                  value={formData.schedule.afternoonCutoff}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, afternoonCutoff: val },
                    })
                  }
                  presets={['16:00', '17:00']}
                />
              </div>
              <p className="text-[10px] text-slate-500 italic">
                Format 24 Jam (WIB). Presensi sebelum batas jam pulang (<strong>{formData.schedule.afternoonOnTimeEnd} WIB</strong>) akan tercatat sebagai status <strong>"Pulang Mendahului"</strong>.
              </p>
            </div>

            {/* Automation Toggles */}
            <div className="space-y-2.5 pt-1 text-xs">
              <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Beralih Otomatis ke Sesi Berikutnya Sesuai Jadwal
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Sistem akan otomatis mengalihkan mode presensi saat memasuki rentang sesi siang ({formData.schedule.afternoonStart}).
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.schedule.autoSwitchSession}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, autoSwitchSession: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer ml-3"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer">
                <div>
                  <span className="font-bold text-slate-900 block">
                    Notifikasi Suara Saat Terjadi Pergantian Sesi
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Membunyikan nada dering melodi saat sesi presensi berganti secara otomatis.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formData.schedule.soundNotification}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      schedule: { ...formData.schedule, soundNotification: e.target.checked },
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded cursor-pointer ml-3"
                />
              </label>
            </div>
          </div>

          {/* 2. WELCOME HERO SCREEN CUSTOMIZER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 text-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Monitor className="w-4 h-4 text-indigo-600" />
              Kustomisasi Layar Sambutan (Welcome Hero)
            </h4>

            <label className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
              <span className="font-bold text-slate-800">
                Tampilkan Layar Sambutan saat Aplikasi Dibuka
              </span>
              <input
                type="checkbox"
                checked={formData.welcomeScreen.show}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    welcomeScreen: { ...formData.welcomeScreen, show: e.target.checked },
                  })
                }
                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
              />
            </label>

            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Judul Sambutan
              </label>
              <input
                type="text"
                value={formData.welcomeScreen.title}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    welcomeScreen: { ...formData.welcomeScreen, title: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Keterangan Sambutan
              </label>
              <textarea
                rows={2}
                value={formData.welcomeScreen.subtitle}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    welcomeScreen: { ...formData.welcomeScreen, subtitle: e.target.value },
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SCHOOL PROFILE, TEACHER ROTATION & MAINTENANCE */}
        <div className="space-y-5">
          {/* 3. SCHOOL IDENTITY & HEADMASTER */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <School className="w-4 h-4 text-blue-600" />
              Identitas Sekolah &amp; Kepala Sekolah
            </h4>

            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Nama Instansi / Sekolah
              </label>
              <input
                type="text"
                required
                value={formData.namaSekolah}
                onChange={(e) => setFormData({ ...formData, namaSekolah: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  NPSN
                </label>
                <input
                  type="text"
                  required
                  value={formData.npsn}
                  onChange={(e) => setFormData({ ...formData, npsn: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  required
                  value={formData.kota}
                  onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Alamat Lengkap
              </label>
              <textarea
                rows={2}
                value={formData.alamat}
                onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-bold mb-1">
                Kontak &amp; Email Kop Surat
              </label>
              <input
                type="text"
                value={formData.kontak}
                onChange={(e) => setFormData({ ...formData, kontak: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            {/* Logo Preview and Upload */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <label className="block text-slate-700 font-bold">
                Logo Sekolah (Anti-Latar Hitam Otomatis)
              </label>
              <div className="flex items-center gap-3">
                <img
                  src={formData.logoUrl}
                  alt="Logo Preview"
                  className="w-14 h-14 object-contain bg-white rounded-xl p-1 border border-slate-200 shrink-0 shadow-xs"
                />
                <div className="flex-1 space-y-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="w-full text-xs text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 cursor-pointer"
                  />
                  <p className="text-[10px] text-emerald-600">
                    Latar belakang gelap dinetralkan ke putih murni untuk kop surat &amp; kartu siswa.
                  </p>
                </div>
              </div>
            </div>

            {/* Headmaster Credentials */}
            <div className="border-t border-slate-100 pt-3 space-y-2.5">
              <span className="font-extrabold text-slate-800 block">
                Kepala Sekolah (Penandatangan Dokumen)
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    Nama Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.namaKepsek}
                    onChange={(e) => setFormData({ ...formData, namaKepsek: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    NIP Kepala Sekolah
                  </label>
                  <input
                    type="text"
                    value={formData.nipKepsek}
                    onChange={(e) => setFormData({ ...formData, nipKepsek: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3.5. PROFIL & FOTO ADMINISTRATOR */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Profil &amp; Foto Administrator (Admin Avatar)
            </h4>

            {/* Photo Uploader */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3.5">
              <div className="relative group shrink-0">
                <img
                  src={
                    formData.adminFotoUrl ||
                    formData.adminProfile?.fotoUrl ||
                    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80'
                  }
                  alt="Admin Avatar"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow-xs bg-slate-200"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80';
                  }}
                />
              </div>

              <div className="flex-1 space-y-1.5">
                <span className="font-extrabold text-slate-800 block text-xs">
                  Foto Profil Admin
                </span>
                <p className="text-[10px] text-slate-500">
                  Foto ini akan tampil di Navbar atas, Dashboard Admin, dan akun Administrator.
                </p>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="file"
                    ref={adminPhotoInputRef}
                    accept="image/*"
                    onChange={handleAdminPhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => adminPhotoInputRef.current?.click()}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer text-[11px]"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Upload Foto</span>
                  </button>

                  {(formData.adminFotoUrl || formData.adminProfile?.fotoUrl) && (
                    <button
                      type="button"
                      onClick={handleRemoveAdminPhoto}
                      className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg font-bold flex items-center gap-1 transition cursor-pointer text-[11px]"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Nama Administrator
                </label>
                <input
                  type="text"
                  value={formData.adminProfile?.nama || 'Administrator Sekolah'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adminProfile: {
                        ...(formData.adminProfile || {}),
                        nama: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-semibold"
                  placeholder="Administrator Sekolah"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Jabatan / Peran Admin
                </label>
                <input
                  type="text"
                  value={formData.adminProfile?.jabatan || 'Kepala Tata Usaha / Operator Presensi'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adminProfile: {
                        ...(formData.adminProfile || {}),
                        nama: formData.adminProfile?.nama || 'Administrator Sekolah',
                        jabatan: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                  placeholder="Operator Presensi / IT"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  Email Admin
                </label>
                <input
                  type="email"
                  value={formData.adminProfile?.email || 'admin@smp-pgri-1-cikadu.sch.id'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adminProfile: {
                        ...(formData.adminProfile || {}),
                        nama: formData.adminProfile?.nama || 'Administrator Sekolah',
                        email: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">
                  No. WhatsApp Admin
                </label>
                <input
                  type="text"
                  value={formData.adminProfile?.noHp || formData.kontak}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      adminProfile: {
                        ...(formData.adminProfile || {}),
                        nama: formData.adminProfile?.nama || 'Administrator Sekolah',
                        noHp: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden font-mono"
                  placeholder="081234567890"
                />
              </div>
            </div>
          </div>

          {/* 4. DUTY TEACHER ROTATION SCHEDULE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 text-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              Rotasi Jadwal Petugas Guru Piket
            </h4>

            {(['senin', 'selasa', 'rabu', 'kamis', 'jumat'] as const).map((day) => (
              <div key={day} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <span className="font-extrabold text-blue-800 capitalize flex items-center gap-1.5 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Guru Piket Hari {day}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Nama Guru Piket"
                    value={formData.jadwalPiket[day]?.nama || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jadwalPiket: {
                          ...formData.jadwalPiket,
                          [day]: { ...formData.jadwalPiket[day], nama: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                  />
                  <input
                    type="text"
                    placeholder="NIP Guru Piket"
                    value={formData.jadwalPiket[day]?.nip || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jadwalPiket: {
                          ...formData.jadwalPiket,
                          [day]: { ...formData.jadwalPiket[day], nip: e.target.value },
                        },
                      })
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 5. GOOGLE DRIVE & CLOUD BACKUP BANNER */}
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-emerald-50 border border-blue-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-blue-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-emerald-600" />
                Backup Otomatis Google Drive &amp; CSV
              </h4>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[10px]">
                {formData.googleDriveBackup?.autoDailyBackup !== false ? 'Auto-Daily Aktif' : 'Manual'}
              </span>
            </div>

            <p className="text-slate-600 text-[11px] leading-relaxed">
              Data master siswa, catatan presensi apel/KBM, dan jurnal mengajar dapat dicadangkan secara otomatis setiap hari ke Google Drive folder resmi sekolah:
            </p>

            <div className="p-2.5 bg-white rounded-xl border border-blue-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-mono text-[11px] font-bold text-slate-700 truncate">
                  Folder: {formData.googleDriveBackup?.folderId || '1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw'}
                </span>
              </div>
              <a
                href={formData.googleDriveBackup?.folderUrl || 'https://drive.google.com/drive/u/0/folders/1eIy2U9w6Sts0GQP2LBKr1s_M8MARxFFw'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1 shrink-0"
              >
                <span>Buka</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {onNavigateToBackup && (
              <button
                type="button"
                onClick={onNavigateToBackup}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <CloudUpload className="w-4 h-4" />
                <span>Buka Pusat Backup &amp; Ekspor Lengkap</span>
              </button>
            )}
          </div>

          {/* 6. DATABASE MAINTENANCE & DATA PURGE SUITE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-rose-600" />
                <span>Pemeliharaan &amp; Cadangan Database Cloud</span>
              </h4>
              <span className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md font-bold text-[10px]">
                Konsol Admin
              </span>
            </div>

            {/* Live Database Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">Log Presensi</span>
                <span className="text-sm font-black text-slate-900">{attendance.length}</span>
                <span className="text-[9px] text-amber-600 block font-semibold">Transaksi</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">Jurnal KBM</span>
                <span className="text-sm font-black text-slate-900">{journals.length}</span>
                <span className="text-[9px] text-amber-600 block font-semibold">Transaksi</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">Master Siswa</span>
                <span className="text-sm font-black text-emerald-700">{students.length}</span>
                <span className="text-[9px] text-emerald-600 block font-bold">Aman (Master)</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                <span className="text-[10px] text-slate-500 font-bold block">Master Guru</span>
                <span className="text-sm font-black text-emerald-700">{teachers.length}</span>
                <span className="text-[9px] text-emerald-600 block font-bold">Aman (Master)</span>
              </div>
            </div>

            {/* Target Year & Semester Filter for Scope Operations */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Tahun Ajaran
                </label>
                <input
                  type="number"
                  value={maintenanceYear}
                  onChange={(e) => setMaintenanceYear(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Pilih Semester
                </label>
                <select
                  value={maintenanceSem}
                  onChange={(e) => setMaintenanceSem(e.target.value as 'ganjil' | 'genap')}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-hidden"
                >
                  <option value="ganjil">Semester Ganjil (Jul - Des)</option>
                  <option value="genap">Semester Genap (Jan - Jun)</option>
                </select>
              </div>
            </div>

            {/* Maintenance Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleBackupExcelOnly}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>1. Unduh Cadangan Excel (.xlsx) Semester Ini</span>
              </button>

              <button
                type="button"
                onClick={handleCleanupDuplicates}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>2. Bersihkan Data Berganda di Firestore</span>
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePurgeSemester}
                  className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-[11px]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>3. Reset Presensi Semester</span>
                </button>

                <button
                  type="button"
                  onClick={handlePurgeSemesterJournals}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer text-[11px]"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>4. Reset Jurnal Semester</span>
                </button>
              </div>

              {/* Master Full Purge Trigger Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setPurgeConfirmationWord('');
                    setPurgeAttendanceChecked(true);
                    setPurgeJournalsChecked(true);
                    setIsPurgeModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 text-white font-extrabold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>5. HAPUS SEMUA DATA INPUTAN (TOTAL RESET)</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 italic text-center pt-1">
              Master data siswa &amp; guru tetap 100% aman dan tidak terpengaruh pembersihan log transaksi.
            </p>
          </div>
        </div>
      </div>

      {/* SAFETY PURGE CONFIRMATION MODAL */}
      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base leading-tight">
                    Konfirmasi Hapus Semua Data Inputan
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Pembersihan Total Log Transaksi Presensi &amp; Jurnal KBM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPurgeModalOpen(false)}
                className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 space-y-1">
                <p className="font-bold">
                  PERHATIAN: Tindakan ini akan menghapus data transaksi secara permanen!
                </p>
                <p className="text-[11px] leading-relaxed">
                  Fitur ini digunakan saat awal semester baru atau ketika ingin mengosongkan seluruh riwayat presensi dan jurnal yang pernah diinput.
                </p>
              </div>

              {/* Data Checklist Options */}
              <div className="space-y-2">
                <span className="font-bold text-slate-700 block">
                  Pilih Data yang Akan Dihapus:
                </span>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={purgeAttendanceChecked}
                    onChange={(e) => setPurgeAttendanceChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 block">
                      Semua Log Presensi Siswa &amp; Guru
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Total {attendance.length} baris riwayat (Presensi Gerbang/Apel + Sesi KBM Kelas)
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={purgeJournalsChecked}
                    onChange={(e) => setPurgeJournalsChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-slate-900 block">
                      Semua Jurnal Mengajar Guru &amp; Catatan Supervisi
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Total {journals.length} entri jurnal pembelajaran &amp; evaluasi pengawas
                    </span>
                  </div>
                </label>
              </div>

              {/* Safe Master Guarantee */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-emerald-800">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  <span className="font-bold block">Jaminan Keamanan Data Master:</span>
                  Data Master Siswa ({students.length} siswa) &amp; Master Guru ({teachers.length} guru) serta profil sekolah <strong>tetap 100% aman dan tidak akan terhapus</strong>.
                </div>
              </div>

              {/* Backup Recommendation Button */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-bold text-blue-900 block text-[11px]">Belum unduh cadangan?</span>
                  <span className="text-[10px] text-blue-600">Simpan salinan offline sebelum menghapus.</span>
                </div>
                <button
                  type="button"
                  onClick={handleBackupFullExcel}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-2xs transition"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Unduh Excel</span>
                </button>
              </div>

              {/* Safety Word Input */}
              <div className="space-y-1.5 pt-1">
                <label className="block font-bold text-slate-700 text-[11px]">
                  Ketik kata <span className="text-rose-600 font-black tracking-wider">HAPUS SEMUA</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  value={purgeConfirmationWord}
                  onChange={(e) => setPurgeConfirmationWord(e.target.value)}
                  placeholder="Ketik HAPUS SEMUA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border-2 border-slate-300 focus:border-rose-500 rounded-xl font-mono text-center font-bold text-slate-900 uppercase tracking-wider focus:outline-hidden"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isPurgingAll}
                onClick={() => setIsPurgeModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={purgeConfirmationWord.trim() !== 'HAPUS SEMUA' || isPurgingAll || (!purgeAttendanceChecked && !purgeJournalsChecked)}
                onClick={handleExecutePurgeAllInputData}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-black text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {isPurgingAll ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menghapus Data...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Ya, Hapus Data Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
