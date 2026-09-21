import React from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface NoticeModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning';
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 text-slate-900 shadow-2xl space-y-3 text-center animate-scale-in">
        <div
          className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl ${
            type === 'success'
              ? 'bg-emerald-50 text-emerald-600'
              : type === 'warning'
              ? 'bg-amber-50 text-amber-600'
              : 'bg-blue-50 text-blue-600'
          }`}
        >
          {type === 'success' ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : type === 'warning' ? (
            <AlertTriangle className="w-6 h-6" />
          ) : (
            <Info className="w-6 h-6" />
          )}
        </div>

        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-5 text-slate-900 shadow-2xl space-y-3 text-center animate-scale-in">
        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center bg-rose-50 text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-600 leading-relaxed">{message}</p>

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Ya, Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};
