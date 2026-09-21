import React, { useState, useEffect } from 'react';
import { CalendarDays, CheckCircle2, Save, RotateCcw } from 'lucide-react';
import { SchoolConfig } from '../types';

interface CalendarHebViewProps {
  config: SchoolConfig;
  kalenderHebData: Record<string, boolean>;
  onUpdateKalenderHeb: (data: Record<string, boolean>) => Promise<void>;
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const CalendarHebView: React.FC<CalendarHebViewProps> = ({
  config,
  kalenderHebData,
  onUpdateKalenderHeb,
  onShowNotice,
}) => {
  const [semester, setSemester] = useState<'ganjil' | 'genap'>('ganjil');
  const [calendarState, setCalendarState] = useState<Record<string, boolean>>({});

  const curYear = new Date().getFullYear();

  // Define months for each semester
  const months =
    semester === 'ganjil'
      ? [
          { monthIdx: 6, year: curYear, name: 'Juli' },
          { monthIdx: 7, year: curYear, name: 'Agustus' },
          { monthIdx: 8, year: curYear, name: 'September' },
          { monthIdx: 9, year: curYear, name: 'Oktober' },
          { monthIdx: 10, year: curYear, name: 'November' },
          { monthIdx: 11, year: curYear, name: 'Desember' },
        ]
      : [
          { monthIdx: 0, year: curYear, name: 'Januari' },
          { monthIdx: 1, year: curYear, name: 'Februari' },
          { monthIdx: 2, year: curYear, name: 'Maret' },
          { monthIdx: 3, year: curYear, name: 'April' },
          { monthIdx: 4, year: curYear, name: 'Mei' },
          { monthIdx: 5, year: curYear, name: 'Juni' },
        ];

  // Initialize or synchronize calendar state
  useEffect(() => {
    const updated = { ...kalenderHebData };
    const workdays = parseInt(config.sistemHariSekolah || '5', 10);

    months.forEach((m) => {
      const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const mStr = String(m.monthIdx + 1).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        const dateKey = `${m.year}-${mStr}-${dStr}`;
        const dayOfWeek = new Date(m.year, m.monthIdx, d).getDay();

        if (updated[dateKey] === undefined) {
          updated[dateKey] = workdays === 6 ? dayOfWeek !== 0 : dayOfWeek !== 0 && dayOfWeek !== 6;
        }
      }
    });
    setCalendarState(updated);
  }, [semester, config.sistemHariSekolah, kalenderHebData]);

  const toggleDay = (dateKey: string) => {
    setCalendarState((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const applyWeeklyPattern = (workdays: number) => {
    const updated = { ...calendarState };
    months.forEach((m) => {
      const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const mStr = String(m.monthIdx + 1).padStart(2, '0');
        const dStr = String(d).padStart(2, '0');
        const dateKey = `${m.year}-${mStr}-${dStr}`;
        const dayOfWeek = new Date(m.year, m.monthIdx, d).getDay();
        updated[dateKey] = workdays === 6 ? dayOfWeek !== 0 : dayOfWeek !== 0 && dayOfWeek !== 6;
      }
    });
    setCalendarState(updated);
    onShowNotice('Pola Diterapkan', `Pola ${workdays} hari sekolah berhasil diterapkan.`, 'success');
  };

  const handleSave = async () => {
    await onUpdateKalenderHeb(calendarState);
    onShowNotice('Tersimpan', 'Kalender Hari Efektif Belajar berhasil disimpan ke database!', 'success');
  };

  // Calculate stats for current semester
  let totalHeb = 0;
  let totalLibur = 0;

  months.forEach((m) => {
    const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${m.year}-${String(m.monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (calendarState[dateKey]) {
        totalHeb++;
      } else {
        totalLibur++;
      }
    }
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header with Pattern and Save */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Kalender Hari Efektif Belajar (HEB)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Klik tanggal untuk mengubah status Hari Belajar (Hijau) atau Libur (Abu-abu).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value as 'ganjil' | 'genap')}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-hidden"
          >
            <option value="ganjil">Semester Ganjil (Juli - Desember)</option>
            <option value="genap">Semester Genap (Januari - Juni)</option>
          </select>

          <button
            type="button"
            onClick={() => applyWeeklyPattern(5)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Pola 5 Hari
          </button>
          <button
            type="button"
            onClick={() => applyWeeklyPattern(6)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Pola 6 Hari
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Kalender</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <p className="text-[11px] text-slate-500 font-medium">Hari Efektif KBM Semester</p>
          <h4 className="text-2xl font-black text-emerald-600 mt-0.5">{totalHeb} Hari</h4>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">Target Total Sesi (Pagi &amp; Siang)</p>
          <h4 className="text-2xl font-black text-blue-600 mt-0.5">{totalHeb * 2} Sesi</h4>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 font-medium">Hari Libur / Non-KBM</p>
          <h4 className="text-2xl font-black text-rose-600 mt-0.5">{totalLibur} Hari</h4>
        </div>
      </div>

      {/* Months Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map((m) => {
          const firstDay = new Date(m.year, m.monthIdx, 1).getDay();
          const daysInMonth = new Date(m.year, m.monthIdx + 1, 0).getDate();

          let monthHebCount = 0;
          for (let d = 1; d <= daysInMonth; d++) {
            const dateKey = `${m.year}-${String(m.monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (calendarState[dateKey]) monthHebCount++;
          }

          return (
            <div
              key={m.name}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-extrabold text-xs text-slate-900">
                  {m.name} {m.year}
                </span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200">
                  {monthHebCount} Hari Efektif
                </span>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                <span className="text-rose-500">Min</span>
                <span>Sen</span>
                <span>Sel</span>
                <span>Rab</span>
                <span>Kam</span>
                <span>Jum</span>
                <span>Sab</span>
              </div>

              {/* Days Numbers */}
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, bIdx) => (
                  <div key={`blank-${bIdx}`} />
                ))}

                {Array.from({ length: daysInMonth }).map((_, dIdx) => {
                  const dayNum = dIdx + 1;
                  const dateKey = `${m.year}-${String(m.monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                  const isHeb = calendarState[dateKey] === true;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => toggleDay(dateKey)}
                      className={`h-7 w-full rounded-lg text-[11px] font-bold flex items-center justify-center transition cursor-pointer ${
                        isHeb
                          ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {dayNum}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
