import React, { useState } from 'react';
import { ShieldCheck, X, GraduationCap, Eye, EyeOff, Globe, Copy, Check, Info } from 'lucide-react';

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
  const [showOriginHelp, setShowOriginHelp] = useState(false);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyOrigin = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.origin);
      setCopiedOrigin(true);
      onShowNotice('Tersalin', 'URL Asal JavaScript berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedOrigin(false), 2000);
    }
  };

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

        {/* OAuth / Cloud Run Origin Helper Section */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowOriginHelp(!showOriginHelp)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-slate-500 hover:text-blue-700 transition cursor-pointer py-1 px-1.5 rounded-lg hover:bg-slate-50"
          >
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>Bantuan Otorisasi OAuth Google</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold">{showOriginHelp ? '▲ Tutup' : '▼ Salin URL'}</span>
          </button>

          {showOriginHelp && (
            <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs animate-in fade-in">
              <div className="flex items-start gap-1.5 text-slate-700">
                <Info className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-slate-600">
                  Untuk mengatasi <b>Error 400: origin_mismatch</b>, daftarkan URL asal (Authorized JavaScript Origins) berikut di <b>Google Cloud Console</b>:
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={currentOrigin}
                  className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-[10px] text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyOrigin}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedOrigin ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedOrigin ? 'Tersalin' : 'Salin'}</span>
                </button>
              </div>

              <p className="text-[9px] text-slate-400">
                Tambahkan URL ini ke menu <i>Credentials ➔ OAuth 2.0 Client IDs ➔ Authorized JavaScript origins</i>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
