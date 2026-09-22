import React, { useState } from 'react';
import { ShieldCheck, X, GraduationCap, Eye, EyeOff } from 'lucide-react';

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
  const [roleTab, setRoleTab] = useState<'GURU' | 'ADMIN'>('GURU');
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
        'Username / Email atau kata sandi tidak cocok. Silakan periksa kembali.',
        'warning'
      );
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
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs (Hanya Guru & Admin) */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setRoleTab('GURU');
              setUsername('');
              setPassword('');
            }}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              roleTab === 'GURU'
                ? 'bg-white text-emerald-700 shadow-2xs font-extrabold ring-1 ring-emerald-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Guru / Wali</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleTab('ADMIN');
              setUsername('');
              setPassword('');
            }}
            className={`py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${
              roleTab === 'ADMIN'
                ? 'bg-white text-blue-700 shadow-2xs font-extrabold ring-1 ring-blue-500/20'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Admin</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs pt-1">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              {roleTab === 'ADMIN' ? 'Username / Email Administrator' : 'Username / NIP Guru'}
            </label>
            <input
              type="text"
              required
              placeholder={roleTab === 'ADMIN' ? 'Masukkan username / email' : 'Masukkan username / NIP'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500 font-medium placeholder:text-slate-400"
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
                className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-blue-500 font-medium placeholder:text-slate-400"
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
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold rounded-xl transition shadow-md cursor-pointer mt-1"
          >
            {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
};
