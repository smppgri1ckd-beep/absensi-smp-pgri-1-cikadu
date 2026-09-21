import React from 'react';
import { ArrowRightLeft, Bell, X } from 'lucide-react';

interface NotificationBannerProps {
  banner: {
    show: boolean;
    title: string;
    message: string;
  } | null;
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  banner,
  onDismiss,
}) => {
  if (!banner || !banner.show) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-md w-full px-4 animate-slide-up no-print">
      <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
          <ArrowRightLeft className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <h5 className="font-bold text-xs text-white">{banner.title}</h5>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
            {banner.message}
          </p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
