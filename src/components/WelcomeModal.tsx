import React from 'react';
import { ArrowRight, CheckCircle2, QrCode, Users } from 'lucide-react';
import { SchoolConfig } from '../types';

interface WelcomeModalProps {
  config: SchoolConfig;
  onEnter: () => void;
  onGoToMonitoring?: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  config,
  onEnter,
  onGoToMonitoring,
}) => {
  const w = config.welcomeScreen;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 transition-all">
      <div className="bg-white/95 backdrop-blur-xl max-w-lg w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl border border-white/80 space-y-6 relative overflow-hidden animate-scale-in">
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* School Logo */}
        <div className="relative mx-auto w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-2.5 shadow-lg border border-slate-100 flex items-center justify-center">
          <img
            src={config.logoUrl}
            alt="Logo Sekolah"
            className="w-full h-full object-contain bg-white"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://cdn-icons-png.flaticon.com/512/2856/2856000.png';
            }}
          />
        </div>

        {/* Title & Info */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Sistem Presensi Realtime
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight whitespace-pre-line">
            {w.title || `Selamat Datang Di E-Absensi\n${config.namaSekolah}`}
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium max-w-md mx-auto">
            {w.subtitle ||
              'Portal presensi digital berbasis QR Code, pemantauan kehadiran oleh orang tua secara realtime, dan rekapitulasi data akurat.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onEnter}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <span>Buka Scanner Presensi</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {onGoToMonitoring && (
            <button
              type="button"
              onClick={onGoToMonitoring}
              className="w-full sm:w-auto px-5 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Pantau Kehadiran (Ortu)</span>
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-400 font-medium">
          {config.namaSekolah} &bull; Disiplin, Karakter &amp; Berprestasi
        </p>
      </div>
    </div>
  );
};
