import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { QrCode, Download, FolderArchive, Search } from 'lucide-react';
import { Student } from '../types';
import { generateQrDataUrl } from '../utils/qr';

interface QrDownloadViewProps {
  students: Student[];
  onShowNotice: (title: string, message: string, type?: 'info' | 'success' | 'warning') => void;
}

export const QrDownloadView: React.FC<QrDownloadViewProps> = ({
  students,
  onShowNotice,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('ALL');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isZipping, setIsZipping] = useState(false);

  const classes = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();

  let filtered = [...students];
  if (selectedClass !== 'ALL') {
    filtered = filtered.filter((s) => s.kelas === selectedClass);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }
  filtered.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  useEffect(() => {
    let isMounted = true;
    const loadQrs = async () => {
      const map: Record<string, string> = {};
      for (const s of filtered) {
        if (!qrMap[s.nisn]) {
          map[s.nisn] = await generateQrDataUrl(s.nisn, 260);
        }
      }
      if (isMounted && Object.keys(map).length > 0) {
        setQrMap((prev) => ({ ...prev, ...map }));
      }
    };
    loadQrs();
    return () => {
      isMounted = false;
    };
  }, [filtered]);

  // Download Single QR PNG with border and details
  const downloadSinglePng = async (s: Student) => {
    const qrData = qrMap[s.nisn] || (await generateQrDataUrl(s.nisn, 260));
    if (!qrData) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Pure white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 300, 360);

      // Outer Border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 3;
      ctx.strokeRect(2, 2, 296, 356);

      // Draw QR Code
      ctx.drawImage(img, 30, 25, 240, 240);

      // Student Name
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      const name = s.nama.length > 24 ? s.nama.substring(0, 22) + '...' : s.nama;
      ctx.fillText(name, 150, 295);

      // NISN & Class
      ctx.fillStyle = '#475569';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`NISN: ${s.nisn} • ${s.kelas}`, 150, 322);

      const a = document.createElement('a');
      a.download = `QR_${s.nisn}_${s.nama.replace(/\s+/g, '_')}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      onShowNotice('Berhasil', `QR Code ${s.nama} berhasil diunduh!`, 'success');
    };
    img.src = qrData;
  };

  // Download All as ZIP
  const downloadAllZip = async () => {
    if (filtered.length === 0) return;
    setIsZipping(true);
    onShowNotice('Menyiapkan ZIP', `Sedang mengemas ${filtered.length} gambar QR Code ke format ZIP...`, 'info');

    try {
      const zip = new JSZip();

      for (const s of filtered) {
        const qrData = qrMap[s.nisn] || (await generateQrDataUrl(s.nisn, 260));
        if (!qrData) continue;

        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 300;
            canvas.height = 360;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve();
              return;
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, 300, 360);

            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 3;
            ctx.strokeRect(2, 2, 296, 356);

            ctx.drawImage(img, 30, 25, 240, 240);

            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            const name = s.nama.length > 24 ? s.nama.substring(0, 22) + '...' : s.nama;
            ctx.fillText(name, 150, 295);

            ctx.fillStyle = '#475569';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(`NISN: ${s.nisn} • ${s.kelas}`, 150, 322);

            const b64 = canvas.toDataURL('image/png').split(',')[1];
            zip.file(`QR_${s.nisn}_${s.nama.replace(/\s+/g, '_')}.png`, b64, { base64: true });
            resolve();
          };
          img.onerror = () => resolve();
          img.src = qrData;
        });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(content);
      a.download = `QR_Siswa_${selectedClass}_${new Date().toISOString().split('T')[0]}.zip`;
      a.click();
      onShowNotice('Selesai', `Arsip ZIP berisi ${filtered.length} QR Code berhasil diunduh!`, 'success');
    } catch (err: any) {
      onShowNotice('Gagal', err.message, 'warning');
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Download QR Code Siswa
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Unduh gambar barcode QR resolusi tinggi secara satuan (.PNG) atau kolektif satu kelas (.ZIP).
          </p>
        </div>

        <button
          type="button"
          onClick={downloadAllZip}
          disabled={isZipping || filtered.length === 0}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs cursor-pointer"
        >
          <FolderArchive className="w-4 h-4" />
          <span>{isZipping ? 'Mengemas ZIP...' : `Unduh ZIP Semua (${filtered.length} QR)`}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari NISN atau Nama Siswa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>

        <div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
          >
            <option value="ALL">Semua Kelas</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* QR Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 italic text-xs">
            Tidak ada data QR siswa yang sesuai kriteria.
          </div>
        ) : (
          filtered.map((s) => {
            const qrSrc = qrMap[s.nisn];
            return (
              <div
                key={s.nisn}
                className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col items-center justify-between text-center shadow-2xs space-y-2 hover:border-blue-300 transition"
              >
                <div className="w-full truncate">
                  <h5 className="font-bold text-xs text-slate-900 truncate">
                    {s.nama}
                  </h5>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {s.nisn} &bull; {s.kelas}
                  </p>
                </div>

                <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-inner flex items-center justify-center">
                  {qrSrc ? (
                    <img
                      src={qrSrc}
                      alt={`QR ${s.nisn}`}
                      className="w-24 h-24 object-contain"
                    />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center text-slate-300">
                      <QrCode className="w-8 h-8 animate-pulse" />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => downloadSinglePng(s)}
                  className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh PNG</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
