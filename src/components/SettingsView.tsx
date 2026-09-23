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
} from 'lucide-react';
import { SchoolConfig, AttendanceRecord } from '../types';
import { processImageFile } from '../utils/qr';
import { playBeep } from '../utils/audio';
import { TimeInput24 } from './TimeInput24';

interface SettingsViewProps {
  config: SchoolConfig;
  attendance: AttendanceRecord[];
  onUpdateConfig: (newConfig: SchoolConfig) => Promise<void>;
  onCleanDuplicates: () => Promise<number>;
  onPurgeSemester: (year: number, semester: 'ganjil' | 'genap') => Promise<number>;
  onNavigateToBackup?: () => void;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
  onShowConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  attendance,
  onUpdateConfig,
  onCleanDuplicates,
  onPurgeSemester,
  onNavigateToBackup,
  onShowNotice,
  onShowConfirm,
}) => {
  const [formData, setFormData] = useState<SchoolConfig>(config);
  const [maintenanceYear, setMaintenanceYear] = useState<number>(new Date().getFullYear());
  const [maintenanceSem, setMaintenanceSem] = useState<'ganjil' | 'genap'>('ganjil');
  const [isSaving, setIsSaving] = useState(false);
  const adminPhotoInputRef = useRef<HTMLInputElement>(null);

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

    const targets = attendance.filter((a) => a.tanggal >= startIso && a.tanggal <= endIso);
    if (targets.length === 0) {
      onShowNotice('Data Kosong', `Tidak ditemukan log presensi pada Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear}.`, 'warning');
      return;
    }

    const rows = [
      ["ARSIP CADANGAN PRESENSI SEMESTER"],
      [config.namaSekolah],
      [`Periode: ${startIso} s/d ${endIso} (Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear})`],
      [],
      ["ID", "TANGGAL", "WAKTU", "NISN", "NAMA", "KELAS", "SESI", "STATUS"]
    ];
    targets.forEach((t) =>
      rows.push([t.id, t.tanggal, t.waktu, t.nisn, t.nama, t.kelas, t.sesi, t.status])
    );

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "ARSIP_PRESENSI");
    XLSX.writeFile(wb, `Cadangan_Presensi_${maintenanceSem.toUpperCase()}_${maintenanceYear}.xlsx`);

    onShowNotice('Cadangan Berhasil', `${targets.length} catatan presensi berhasil diunduh ke Excel. Data di cloud tetap aman!`, 'success');
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
      'Konfirmasi Reset Semester',
      `PERINGATAN: Seluruh log presensi pada Semester ${maintenanceSem.toUpperCase()} ${maintenanceYear} akan dihapus permanen. Master siswa tetap 100% aman. Lanjutkan?`,
      async () => {
        const deleted = await onPurgeSemester(maintenanceYear, maintenanceSem);
        onShowNotice('Pembersihan Selesai', `${deleted} catatan presensi semester berhasil dibersihkan!`, 'success');
      }
    );
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

          {/* 6. DATABASE MAINTENANCE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3 text-xs">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Server className="w-4 h-4 text-rose-600" />
              Pemeliharaan &amp; Cadangan Database Cloud
            </h4>

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

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleBackupExcelOnly}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>1. Unduh Cadangan Excel (.xlsx) Saja</span>
              </button>

              <button
                type="button"
                onClick={handleCleanupDuplicates}
                className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>2. Bersihkan Data Berganda di Firestore</span>
              </button>

              <button
                type="button"
                onClick={handlePurgeSemester}
                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>3. Bersihkan / Reset Presensi Semester</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 italic text-center">
              Master data siswa tetap 100% aman dan tidak terpengaruh pembersihan log.
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};
