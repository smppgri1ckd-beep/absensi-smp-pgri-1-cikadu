import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileDown,
  Sparkles,
  Info,
  Layers,
  Search,
  CheckSquare,
  Square,
  QrCode,
} from 'lucide-react';
import { Student, SchoolConfig } from '../types';
import { generateQrDataUrl } from '../utils/qr';
import { jsPDF } from 'jspdf';

interface IdCardPrintViewProps {
  students: Student[];
  config: SchoolConfig;
}

export const IdCardPrintView: React.FC<IdCardPrintViewProps> = ({
  students,
  config,
}) => {
  const [paperSize, setPaperSize] = useState<'F4' | 'A4'>('F4');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStudentNisn, setSelectedStudentNisn] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const classes = Array.from(new Set(students.map((s) => s.kelas))).filter(Boolean).sort();

  // Filter students
  let filtered = [...students];
  if (selectedClass !== 'ALL') {
    filtered = filtered.filter((s) => s.kelas === selectedClass);
  }
  if (selectedStudentNisn !== 'ALL') {
    filtered = filtered.filter((s) => s.nisn === selectedStudentNisn);
  }
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }
  filtered.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  // Generate QR Codes for filtered students in memory
  useEffect(() => {
    let isMounted = true;
    const loadQrs = async () => {
      const map: Record<string, string> = {};
      for (const s of filtered) {
        if (!qrMap[s.nisn]) {
          map[s.nisn] = await generateQrDataUrl(s.nisn, 240);
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

  // Direct Printer execution without truncation
  const handleDirectPrint = () => {
    // Apply print class matching chosen paper size
    document.body.classList.remove('printing-idcard-f4', 'printing-idcard-a4', 'printing-rekap');
    document.body.classList.add(paperSize === 'F4' ? 'printing-idcard-f4' : 'printing-idcard-a4');

    setTimeout(() => {
      window.print();
    }, 250);

    window.onafterprint = () => {
      document.body.classList.remove('printing-idcard-f4', 'printing-idcard-a4');
    };
  };

  // High-Resolution PDF Download
  const handleDownloadPdf = async () => {
    if (filtered.length === 0) return;
    setIsGeneratingPdf(true);

    try {
      const isF4 = paperSize === 'F4';
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isF4 ? [215, 330] : [210, 297],
      });

      const cardsPerPage = 9;
      const totalPages = Math.ceil(filtered.length / cardsPerPage);

      // Card Dimensions
      const cardW = isF4 ? 65 : 63;
      const cardH = isF4 ? 100 : 93;
      const colGap = 3;
      const rowGap = 3;
      const marginX = isF4 ? 6 : 5;
      const marginY = isF4 ? 8 : 6;

      for (let p = 0; p < totalPages; p++) {
        if (p > 0) {
          doc.addPage(isF4 ? [215, 330] : [210, 297], 'portrait');
        }

        const pageStudents = filtered.slice(p * cardsPerPage, (p + 1) * cardsPerPage);

        for (let idx = 0; idx < pageStudents.length; idx++) {
          const s = pageStudents[idx];
          const row = Math.floor(idx / 3);
          const col = idx % 3;

          const x = marginX + col * (cardW + colGap);
          const y = marginY + row * (cardH + rowGap);

          // Card Background & Outer Border
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'FD');
          doc.setDrawColor(203, 213, 225); // slate-300
          doc.setLineWidth(0.3);
          doc.roundedRect(x, y, cardW, cardH, 2.5, 2.5, 'S');

          // Header band
          doc.setFillColor(30, 58, 138); // blue-900
          doc.rect(x, y, cardW, 11, 'F');

          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.text(config.namaSekolah.toUpperCase(), x + cardW / 2, y + 4.5, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(226, 232, 240);
          doc.text("KARTU PRESENSI SISWA DIGITAL", x + cardW / 2, y + 8, { align: 'center' });

          // Sub-header indicator
          doc.setFillColor(239, 246, 255);
          doc.rect(x, y + 11, cardW, 4, 'F');
          doc.setTextColor(29, 78, 216);
          doc.setFontSize(5);
          doc.setFont('helvetica', 'bold');
          doc.text(`KELAS: ${s.kelas}   |   ${s.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}`, x + cardW / 2, y + 13.8, { align: 'center' });

          // Student Details
          doc.setTextColor(15, 23, 42); // slate-900
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          const dispName = s.nama.length > 22 ? s.nama.substring(0, 20) + '...' : s.nama;
          doc.text(dispName, x + cardW / 2, y + 20, { align: 'center' });

          doc.setFontSize(7);
          doc.setFont('courier', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text(`NISN: ${s.nisn}`, x + cardW / 2, y + 24.5, { align: 'center' });

          // QR Code in Center
          const qrData = qrMap[s.nisn] || (await generateQrDataUrl(s.nisn, 240));
          if (qrData) {
            const qrSize = isF4 ? 40 : 36;
            const qrX = x + (cardW - qrSize) / 2;
            const qrY = y + 28;

            // QR container box
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.rect(qrX - 1, qrY - 1, qrSize + 2, qrSize + 2, 'FD');

            doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);
          }

          // Scan Instruction Tag
          const tagY = y + (isF4 ? 76 : 70);
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(x + 8, tagY, cardW - 16, 5, 1.5, 1.5, 'F');
          doc.setTextColor(71, 85, 105);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5);
          doc.text("PINDAI SESI PAGI & SIANG", x + cardW / 2, tagY + 3.5, { align: 'center' });

          // Card Footer
          doc.setFillColor(30, 58, 138);
          doc.rect(x, y + cardH - 5.5, cardW, 5.5, 'F');
          doc.setTextColor(254, 240, 138); // yellow-200
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.5);
          doc.text("Disiplin &bull; Karakter &bull; Berprestasi", x + cardW / 2, y + cardH - 2, { align: 'center' });
        }
      }

      doc.save(`Kartu_Siswa_${paperSize}_${config.namaSekolah.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Group into pages of 9
  const cardsPerPage = 9;
  const totalPages = Math.ceil(filtered.length / cardsPerPage);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Action Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">
            Cetak Kartu Siswa Presisi (9 Kartu per Lembar 3x3)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Desain minimalis, modern, kontras tinggi dan mudah dipindai oleh kamera aplikasi tanpa terpotong.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Paper selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPaperSize('F4')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                paperSize === 'F4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kertas F4 / Folio (215 x 330 mm)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('A4')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                paperSize === 'A4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kertas A4 (210 x 297 mm)
            </button>
          </div>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || filtered.length === 0}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>{isGeneratingPdf ? 'Memproses PDF...' : `Unduh PDF (${paperSize})`}</span>
          </button>

          <button
            type="button"
            onClick={handleDirectPrint}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Langsung (Printer)</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Filter Rombel / Kelas
          </label>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
          >
            <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
            {classes.map((c) => (
              <option key={c} value={c}>
                Kelas {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Pilih Siswa Tertentu
          </label>
          <select
            value={selectedStudentNisn}
            onChange={(e) => setSelectedStudentNisn(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden"
          >
            <option value="ALL">Semua Siswa Terfilter</option>
            {filtered.map((s) => (
              <option key={s.nisn} value={s.nisn}>
                {s.nama} ({s.nisn})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-500 mb-1">
            Pencarian Nama / NISN
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Cari siswa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Guide Note on Printer Margins */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">
            Petunjuk Cetak Bebas Terpotong pada Printer Fisik:
          </p>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            1. Pada jendela Cetak browser (Ctrl + P), pastikan <strong>Paper Size</strong> dipilih sesuai opsi di atas: <strong>Folio / F4 (215 x 330 mm)</strong> atau <strong>A4 (210 x 297 mm)</strong>.<br />
            2. Atur <strong>Margin: None</strong> atau <strong>Minimum</strong>.<br />
            3. Centang opsi <strong>Background Graphics (Grafis Latar Belakang)</strong> agar warna dan bingkai kartu tercetak tajam.
          </p>
        </div>
      </div>

      {/* Live Visual Card Sheet Preview */}
      <div className="p-4 sm:p-8 bg-slate-200/80 rounded-2xl border border-slate-300 overflow-x-auto flex flex-col items-center">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic text-xs">
            Tidak ada data kartu siswa yang cocok dengan filter.
          </div>
        ) : (
          <div ref={printContainerRef} className="space-y-8 flex flex-col items-center">
            {Array.from({ length: totalPages }).map((_, pIdx) => {
              const pageBatch = filtered.slice(pIdx * cardsPerPage, (pIdx + 1) * cardsPerPage);

              return (
                <div
                  key={pIdx}
                  className={
                    paperSize === 'F4'
                      ? 'id-card-page-f4 shadow-lg rounded-sm bg-white'
                      : 'id-card-page-a4 shadow-lg rounded-sm bg-white'
                  }
                >
                  {pageBatch.map((siswa) => {
                    const qrSrc = qrMap[siswa.nisn];

                    return (
                      <div
                        key={siswa.nisn}
                        className="bg-white border border-slate-300 rounded-xl overflow-hidden flex flex-col justify-between shadow-2xs relative select-none"
                        style={{
                          width: paperSize === 'F4' ? '65mm' : '63mm',
                          height: paperSize === 'F4' ? '100mm' : '93mm',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* Card Header */}
                        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white px-2 py-1.5 text-center flex items-center justify-center gap-1.5 shrink-0">
                          <img
                            src={config.logoUrl}
                            alt="Logo"
                            className="w-5 h-5 object-contain bg-white rounded-md p-0.5"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src =
                                'https://cdn-icons-png.flaticon.com/512/2856/2856000.png';
                            }}
                          />
                          <div className="truncate text-left leading-tight">
                            <h5 className="text-[7.5px] font-black uppercase tracking-wide truncate">
                              {config.namaSekolah}
                            </h5>
                            <p className="text-[5.5px] text-blue-200 uppercase font-semibold">
                              Kartu Presensi Siswa Digital
                            </p>
                          </div>
                        </div>

                        {/* Sub-header banner */}
                        <div className="bg-blue-50 border-y border-blue-100 px-2 py-0.5 flex items-center justify-between text-[6px] font-bold text-blue-800 shrink-0">
                          <span>KELAS: {siswa.kelas}</span>
                          <span>{siswa.jk === 'L' ? 'LAKI-LAKI' : 'PEREMPUAN'}</span>
                        </div>

                        {/* Student Details & Photo */}
                        <div className="px-2 pt-1 flex items-center gap-2 shrink-0">
                          <div className="w-10 h-12 rounded-lg border border-blue-900 overflow-hidden bg-white shrink-0 flex items-center justify-center">
                            <img
                              src={siswa.fotoUrl}
                              alt={siswa.nama}
                              className="w-full h-full object-cover bg-white"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).src =
                                  'https://placehold.co/100x120/ffffff/64748b?text=Foto';
                              }}
                            />
                          </div>
                          <div className="overflow-hidden leading-tight flex-1">
                            <p className="text-[5px] uppercase font-bold text-slate-400">
                              Nama Siswa:
                            </p>
                            <p className="text-[8px] font-black text-slate-900 truncate leading-tight">
                              {siswa.nama}
                            </p>
                            <p className="text-[5px] uppercase font-bold text-slate-400 mt-1">
                              NISN:
                            </p>
                            <p className="text-[7.5px] font-mono font-black text-blue-800 leading-tight">
                              {siswa.nisn}
                            </p>
                          </div>
                        </div>

                        {/* Integrated QR Code */}
                        <div className="flex flex-col items-center justify-center my-auto py-0.5">
                          <div className="p-1 bg-white border border-slate-200 rounded-xl shadow-inner flex items-center justify-center">
                            {qrSrc ? (
                              <img
                                src={qrSrc}
                                alt={`QR ${siswa.nisn}`}
                                className="w-20 h-20 sm:w-22 sm:h-22 object-contain"
                              />
                            ) : (
                              <div className="w-20 h-20 flex items-center justify-center text-slate-300">
                                <QrCode className="w-10 h-10 animate-pulse" />
                              </div>
                            )}
                          </div>
                          <span className="mt-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-extrabold text-[5.5px] tracking-wide uppercase">
                            PINDAI SESI PAGI &amp; SIANG
                          </span>
                        </div>

                        {/* Card Footer */}
                        <div className="bg-blue-900 text-amber-300 text-center py-1 px-1 border-t border-amber-400 text-[5.5px] font-medium tracking-wide shrink-0">
                          Disiplin &bull; Karakter &bull; Berprestasi
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
