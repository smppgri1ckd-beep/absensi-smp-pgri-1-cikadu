import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Save,
  User,
  ShieldCheck,
  GraduationCap,
  Phone,
  KeyRound,
  FileText,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Image as ImageIcon,
} from 'lucide-react';
import { TeacherUser, AdminProfile, SchoolConfig } from '../types';
import { processImageFile } from '../utils/qr';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'TEACHER' | 'ADMIN';
  teacher?: TeacherUser | null;
  adminProfile?: AdminProfile | null;
  config?: SchoolConfig;
  onSaveTeacher?: (updatedTeacher: TeacherUser) => Promise<void>;
  onSaveAdmin?: (updatedAdmin: AdminProfile) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  mode,
  teacher,
  adminProfile,
  config,
  onSaveTeacher,
  onSaveAdmin,
  onShowNotice,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingImg, setIsProcessingImg] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Teacher Form State
  const [tNama, setTNama] = useState(teacher?.nama || '');
  const [tNip, setTNip] = useState(teacher?.nip || '');
  const [tKontak, setTKontak] = useState(teacher?.kontak || teacher?.noHp || '');
  const [tFotoUrl, setTFotoUrl] = useState(teacher?.fotoUrl || '');
  const [tPassword, setTPassword] = useState(teacher?.password || '');

  // Admin Form State
  const [aNama, setANama] = useState(
    adminProfile?.nama || config?.adminProfile?.nama || 'Administrator Sekolah'
  );
  const [aNip, setANip] = useState(adminProfile?.nip || config?.adminProfile?.nip || '');
  const [aEmail, setAEmail] = useState(
    adminProfile?.email || config?.adminProfile?.email || 'admin@smp-pgri-1-cikadu.sch.id'
  );
  const [aNoHp, setANoHp] = useState(
    adminProfile?.noHp || config?.adminProfile?.noHp || config?.kontak || ''
  );
  const [aJabatan, setAJabatan] = useState(
    adminProfile?.jabatan || config?.adminProfile?.jabatan || 'Kepala Tata Usaha / Operator Presensi'
  );
  const [aFotoUrl, setAFotoUrl] = useState(
    adminProfile?.fotoUrl || config?.adminProfile?.fotoUrl || config?.adminFotoUrl || ''
  );

  // Reset form when modal opens or props change
  React.useEffect(() => {
    if (teacher && mode === 'TEACHER') {
      setTNama(teacher.nama);
      setTNip(teacher.nip || '');
      setTKontak(teacher.kontak || teacher.noHp || '');
      setTFotoUrl(teacher.fotoUrl || '');
      setTPassword(teacher.password || '');
    }
    if (mode === 'ADMIN') {
      setANama(adminProfile?.nama || config?.adminProfile?.nama || 'Administrator Sekolah');
      setANip(adminProfile?.nip || config?.adminProfile?.nip || '');
      setAEmail(adminProfile?.email || config?.adminProfile?.email || 'admin@smp-pgri-1-cikadu.sch.id');
      setANoHp(adminProfile?.noHp || config?.adminProfile?.noHp || config?.kontak || '');
      setAJabatan(adminProfile?.jabatan || config?.adminProfile?.jabatan || 'Kepala Tata Usaha / Operator Presensi');
      setAFotoUrl(adminProfile?.fotoUrl || config?.adminProfile?.fotoUrl || config?.adminFotoUrl || '');
    }
  }, [teacher, adminProfile, config, mode, isOpen]);

  if (!isOpen) return null;

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImg(true);
    try {
      // Compress to max 360px square avatar
      const b64 = await processImageFile(file, 360, 0.88);
      if (mode === 'TEACHER') {
        setTFotoUrl(b64);
      } else {
        setAFotoUrl(b64);
      }
      onShowNotice('Foto Dipilih', 'Foto profil berhasil dimuat dan dioptimasi.', 'info');
    } catch (err) {
      console.error('Error processing photo:', err);
      onShowNotice('Gagal', 'Terjadi kesalahan saat memproses gambar.', 'warning');
    } finally {
      setIsProcessingImg(false);
    }
  };

  const handleRemovePhoto = () => {
    if (mode === 'TEACHER') {
      setTFotoUrl('');
    } else {
      setAFotoUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (mode === 'TEACHER' && teacher && onSaveTeacher) {
        if (!tNama.trim()) {
          onShowNotice('Validasi', 'Nama lengkap guru tidak boleh kosong.', 'warning');
          setIsSaving(false);
          return;
        }

        const updated: TeacherUser = {
          ...teacher,
          nama: tNama.trim(),
          nip: tNip.trim(),
          kontak: tKontak.trim(),
          noHp: tKontak.trim(),
          fotoUrl: tFotoUrl.trim() || undefined,
          password: tPassword.trim() || teacher.password,
        };

        await onSaveTeacher(updated);
        onShowNotice('Profil Diperbarui', 'Foto profil dan identitas akun guru berhasil disimpan.', 'success');
        onClose();
      } else if (mode === 'ADMIN' && onSaveAdmin) {
        if (!aNama.trim()) {
          onShowNotice('Validasi', 'Nama administrator tidak boleh kosong.', 'warning');
          setIsSaving(false);
          return;
        }

        const updatedAdmin: AdminProfile = {
          nama: aNama.trim(),
          nip: aNip.trim(),
          email: aEmail.trim(),
          noHp: aNoHp.trim(),
          jabatan: aJabatan.trim(),
          fotoUrl: aFotoUrl.trim() || undefined,
        };

        await onSaveAdmin(updatedAdmin);
        onShowNotice('Profil Admin Diperbarui', 'Foto profil dan informasi administrator berhasil disimpan.', 'success');
        onClose();
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      onShowNotice('Gagal Menyimpan', err.message || 'Gagal memperbarui profil.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const currentPhoto = mode === 'TEACHER' ? tFotoUrl : aFotoUrl;
  const defaultFallbackPhoto =
    mode === 'TEACHER'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
      : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div
          className={`p-5 text-white flex items-center justify-between ${
            mode === 'TEACHER'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600'
              : 'bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-xs">
              {mode === 'TEACHER' ? (
                <GraduationCap className="w-5 h-5 text-white" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                {mode === 'TEACHER' ? 'Edit Profil & Foto Guru' : 'Edit Profil & Foto Admin'}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {mode === 'TEACHER'
                  ? `Akun Guru: ${teacher?.username || teacher?.nama}`
                  : 'Pengaturan Identitas & Avatar Administrator'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Photo Uploader Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
            <div className="relative group shrink-0">
              <img
                src={currentPhoto || defaultFallbackPhoto}
                alt="Avatar"
                className="w-24 h-24 rounded-2xl object-cover border-2 border-white shadow-md bg-slate-200"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = defaultFallbackPhoto;
                }}
              />

              {isProcessingImg && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white text-[10px] font-bold">
                  Memproses...
                </div>
              )}
            </div>

            <div className="space-y-2 flex-1 text-center sm:text-left">
              <div>
                <span className="font-extrabold text-slate-900 block text-xs">
                  Foto Profil {mode === 'TEACHER' ? 'Guru' : 'Admin'}
                </span>
                <p className="text-[11px] text-slate-500">
                  Format JPG/PNG, dikompres otomatis agar ringan dan tajam.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Pilih Foto</span>
                </button>

                {currentPhoto && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Teacher Specific Fields */}
          {mode === 'TEACHER' && teacher && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={tNama}
                    onChange={(e) => setTNama(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: Rendi, S.Pd."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    NIP / NUPTK (Opsional)
                  </label>
                  <input
                    type="text"
                    value={tNip}
                    onChange={(e) => setTNip(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    placeholder="Contoh: 198501012010011001"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    No. WhatsApp / Kontak
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={tKontak}
                      onChange={(e) => setTKontak(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      placeholder="Contoh: 081234567890"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Mata Pelajaran yang Diampu
                </label>
                <input
                  type="text"
                  disabled
                  value={teacher.mapel}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Penetapan mapel diatur oleh Administrator di menu Kelola Guru.
                </span>
              </div>

              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Kata Sandi Login Akun
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={tPassword}
                    onChange={(e) => setTPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    placeholder="Kata Sandi Akun"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin Specific Fields */}
          {mode === 'ADMIN' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-extrabold text-slate-700 mb-1">
                  Nama Administrator <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={aNama}
                    onChange={(e) => setANama(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Administrator Sekolah / Operator Presensi"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Jabatan / Peran
                  </label>
                  <input
                    type="text"
                    value={aJabatan}
                    onChange={(e) => setAJabatan(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: Tim IT / Operator Presensi"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    NIP / ID Petugas (Opsional)
                  </label>
                  <input
                    type="text"
                    value={aNip}
                    onChange={(e) => setANip(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="Contoh: 1990..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    Email Administrator
                  </label>
                  <input
                    type="email"
                    value={aEmail}
                    onChange={(e) => setAEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@sekolah.sch.id"
                  />
                </div>

                <div>
                  <label className="block font-extrabold text-slate-700 mb-1">
                    No. WhatsApp / HP
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={aNoHp}
                      onChange={(e) => setANoHp(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      placeholder="081234567890"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Submit Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`px-5 py-2 text-white font-extrabold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer ${
                mode === 'TEACHER'
                  ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
                  : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
