import React from 'react';
import { Clock } from 'lucide-react';

interface TimeInput24Props {
  id?: string;
  label: string;
  value: string; // Format "HH:mm" misal "07:00" atau "13:45"
  onChange: (newValue: string) => void;
  presets?: string[];
  helperText?: string;
}

export const TimeInput24: React.FC<TimeInput24Props> = ({
  id,
  label,
  value,
  onChange,
  presets,
  helperText,
}) => {
  // Parsing nilai HH:mm
  const parts = (value || '07:00').split(':');
  const rawHour = parseInt(parts[0] || '7', 10);
  const rawMinute = parseInt(parts[1] || '0', 10);

  const hour = isNaN(rawHour) ? '07' : String(Math.min(23, Math.max(0, rawHour))).padStart(2, '0');
  const minute = isNaN(rawMinute) ? '00' : String(Math.min(59, Math.max(0, rawMinute))).padStart(2, '0');

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newH = e.target.value;
    onChange(`${newH}:${minute}`);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newM = e.target.value;
    onChange(`${hour}:${newM}`);
  };

  // Generate opsi jam 00 sampai 23 (24 Jam)
  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  // Generate opsi menit 00 sampai 59
  const minutesList = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="space-y-1.5" id={id}>
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-slate-700">
          {label}
        </label>
        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded tracking-wide">
          {hour}:{minute} WIB
        </span>
      </div>

      {/* Kontrol Jam & Menit 24 Jam Murni (Tanpa AM/PM) */}
      <div className="flex items-center bg-white border border-slate-300 rounded-xl px-2 py-1.5 shadow-2xs hover:border-blue-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition">
        <Clock className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />

        {/* Dropdown Jam 00 - 23 */}
        <select
          value={hour}
          onChange={handleHourChange}
          aria-label={`${label} - Jam`}
          className="bg-transparent font-mono text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer text-center py-0.5"
        >
          {hoursList.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        <span className="font-mono font-black text-slate-400 px-1 select-none">:</span>

        {/* Dropdown Menit 00 - 59 */}
        <select
          value={minute}
          onChange={handleMinuteChange}
          aria-label={`${label} - Menit`}
          className="bg-transparent font-mono text-xs font-bold text-slate-900 focus:outline-hidden cursor-pointer text-center py-0.5"
        >
          {minutesList.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <span className="ml-auto text-[10px] font-extrabold text-slate-500 select-none pl-1">
          WIB
        </span>
      </div>

      {/* Tombol Pilihan Cepat (Presets) */}
      {presets && presets.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold transition cursor-pointer ${
                value === p
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-slate-500 italic leading-tight">
          {helperText}
        </p>
      )}
    </div>
  );
};
