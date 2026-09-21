import React, { useState } from 'react';
import { ShieldCheck, X, GraduationCap, UserCheck, KeyRound, Eye, EyeOff, Sparkles } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: string, pass: string) => Promise<boolean>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  onShowNotice,
}) => {
  const [roleTab, setRoleTab] = useState<'GURU' | 'ADMIN' | 'PIKET'>('GURU');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onShowNotice('Kredensial Kosong', 'Harap masukkan username/email dan kata sandi.', 'warning');
      return;
    }

    setLoading(true);
    const success = await onLogin(username.trim(), password.trim());
    setLoading(false);

    if (success) {
      onClose();
      setUsername('');
      setPassword('');
    } else {
      onShowNotice(
        'Login Gagal',
        'Username / Email atau kata sandi tidak cocok, atau akun dinonaktifkan oleh Administrator.',
        'warning'
      );
    }
  };

  const handleQuickDemo = (role: 'GURU' | 'ADMIN' | 'PIKET') => {
    setRoleTab(role);
    if (role === 'GURU') {
      setUsername('budi.guru');
      setPassword('guru12345');
    } else if (role === 'ADMIN') {
      setUsername('admin@absensi.id');
      setPassword('edudigital');
    } else {
      setUsername('peserta');
      setPassword('edudigital');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-extrabold flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Masuk Portal Presensi</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setRoleTab('GURU');
              if (username === 'admin@absensi.id' || username === 'peserta') {
                setUsername('');
                setPassword('');
              }
            }}
            className={`py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              roleTab === 'GURU'
                ? 'bg-white text-emerald-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Guru</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('ADMIN');
              if (username === 'budi.guru' || username === 'peserta') {
                setUsername('');
                setPassword('');
              }
            }}
            className={`py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              roleTab === 'ADMIN'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('PIKET');
              if (username === 'admin@absensi.id' || username === 'budi.guru') {
                setUsername('');
                setPassword('');
              }
            }}
            className={`py-1.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1 ${
              roleTab === 'PIKET'
                ? 'bg-white text-amber-700 shadow-2xs font-extrabold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5 text-amber-600" />
            <span>Piket</span>
          </button>
        </div>

        {/* Role Helper description */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-snug">
          {roleTab === 'GURU' && (
            <p>
              Masuk sebagai <strong className="text-slate-900">Guru Pengajar / Wali Kelas</strong> untuk mencatat izin/sakit, cek presensi kelas, dan rekap tatap muka. Akun dibuat oleh Administrator.
            </p>
          )}
          {roleTab === 'ADMIN' && (
            <p>
              Masuk sebagai <strong className="text-slate-900">Administrator Sekolah</strong> untuk akses penuh database siswa, akun guru, dan pengaturan sistem.
            </p>
          )}
          {roleTab === 'PIKET' && (
            <p>
              Masuk sebagai <strong className="text-slate-900">Petugas Piket</strong> untuk memantau scanner Kiosk secara mandiri.
            </p>
          )}
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {roleTab === 'ADMIN'
                ? 'Email Administrator'
                : roleTab === 'GURU'
                ? 'Username atau NIP Guru'
                : 'Username Petugas'}
            </label>
            <input
              type="text"
              required
              placeholder={
                roleTab === 'ADMIN'
                  ? 'admin@absensi.id'
                  : roleTab === 'GURU'
                  ? 'Contoh: budi.guru'
                  : 'peserta'
              }
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Kata Sandi (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer"
          >
            {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
          </button>
        </form>

        {/* Quick Demo Credential Helper */}
        <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
          <span>Uji Coba Cepat:</span>
          <div className="flex items-center gap-1.5 font-bold">
            <button
              type="button"
              onClick={() => handleQuickDemo('GURU')}
              className="text-emerald-700 hover:underline cursor-pointer"
            >
              Demo Guru
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="text-blue-600 hover:underline cursor-pointer"
            >
              Admin
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleQuickDemo('PIKET')}
              className="text-amber-600 hover:underline cursor-pointer"
            >
              Piket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
