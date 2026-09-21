import React, { useState } from 'react';
import { ShieldCheck, X, KeyRound, UserCheck } from 'lucide-react';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      onShowNotice('Kredensial Kosong', 'Harap masukkan username dan kata sandi.', 'warning');
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
        'Username / Email atau kata sandi tidak cocok.',
        'warning'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 text-slate-900 shadow-2xl space-y-4 animate-scale-in">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Masuk Akun Portal</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-600 font-bold mb-1">
              Email (Admin) / Username (Piket)
            </label>
            <input
              type="text"
              required
              placeholder="admin@absensi.id / peserta"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-slate-600 font-bold mb-1">
              Kata Sandi (Password)
            </label>
            <input
              type="password"
              required
              placeholder="Masukkan kata sandi"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-[10px] text-slate-600 leading-relaxed">
            <strong>Kredensial Default Portal:</strong><br />
            &bull; Admin: <code className="font-mono text-blue-700">admin@absensi.id</code> / <code className="font-mono text-blue-700">edudigital</code><br />
            &bull; Petugas Piket: <code className="font-mono text-blue-700">peserta</code> / <code className="font-mono text-blue-700">edudigital</code>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl transition shadow-md cursor-pointer"
          >
            {loading ? 'Memverifikasi...' : 'Masuk Sekarang'}
          </button>
        </form>
      </div>
    </div>
  );
};
