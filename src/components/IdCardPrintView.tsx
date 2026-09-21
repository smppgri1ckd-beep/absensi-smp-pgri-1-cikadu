import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  FileDown,
  Layers,
  Search,
  CheckCircle2,
  Info,
  CreditCard,
  BookOpen,
  LayoutGrid,
  ChevronDown,
  Loader2,
  Check,
} from 'lucide-react';
import { Student, SchoolConfig } from '../types';
import { generateQrDataUrl } from '../utils/qr';
import { triggerDirectPrint } from '../utils/print';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { IdCardFront } from './IdCardFront';
import { IdCardBack } from './IdCardBack';

interface IdCardPrintViewProps {
  students: Student[];
  config: SchoolConfig;
}

export type CardSideMode = 'MOCKUP' | 'FRONT' | 'BACK' | 'BOTH';

interface StagingPage {
  type: 'FRONT' | 'BACK' | 'MOCKUP_PAIR';
  students: Student[];
  pageNumber: number;
  totalPageCount: number;
}

export const IdCardPrintView: React.FC<IdCardPrintViewProps> = ({
  students,
  config,
}) => {
  const [paperSize, setPaperSize] = useState<'F4' | 'A4'>('F4');
  const [cardSide, setCardSide] = useState<CardSideMode>('MOCKUP');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedStudentNisn, setSelectedStudentNisn] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgressPercent, setPdfProgressPercent] = useState<number>(0);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');
  const [currentStagingPage, setCurrentStagingPage] = useState<StagingPage | null>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState<boolean>(false);
  const printContainerRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const pdfPageRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Direct Printer execution
  const handleDirectPrint = () => {
    triggerDirectPrint({
      paperSize: paperSize === 'F4' ? 'F4' : 'A4',
      margins: '0',
      delayMs: 300,
    });
  };

  // High-Resolution True-Fidelity PDF Download using html2canvas
  const handleDownloadPdf = async (customSide?: CardSideMode) => {
    if (filtered.length === 0 || isGeneratingPdf) return;
    setShowDownloadMenu(false);
    setIsGeneratingPdf(true);
    setPdfProgressPercent(0);
    setPdfProgressText('Menyiapkan kode QR & tata letak kartu...');

    // Determine mode to use
    const modeToUse = customSide || (cardSide === 'MOCKUP' ? 'BOTH' : cardSide);

    try {
      // 1. Ensure all QR codes for filtered students are generated
      const newQrMap = { ...qrMap };
      for (const s of filtered) {
        if (!newQrMap[s.nisn]) {
          newQrMap[s.nisn] = await generateQrDataUrl(s.nisn, 240);
        }
      }
      setQrMap(newQrMap);

      const isF4 = paperSize === 'F4';
      const pageWidth = isF4 ? 215 : 210;
      const pageHeight = isF4 ? 330 : 297;
      const cardsPerPage = 9;
      const totalBatches = Math.ceil(filtered.length / cardsPerPage);

      // 2. Build the page queue according to modeToUse
      const pageQueue: StagingPage[] = [];

      if (modeToUse === 'FRONT') {
        for (let b = 0; b < totalBatches; b++) {
          const batch = filtered.slice(b * cardsPerPage, (b + 1) * cardsPerPage);
          pageQueue.push({
            type: 'FRONT',
            students: batch,
            pageNumber: b + 1,
            totalPageCount: totalBatches,
          });
        }
      } else if (modeToUse === 'BACK') {
        for (let b = 0; b < totalBatches; b++) {
          const batch = filtered.slice(b * cardsPerPage, (b + 1) * cardsPerPage);
          pageQueue.push({
            type: 'BACK',
            students: batch,
            pageNumber: b + 1,
            totalPageCount: totalBatches,
          });
        }
      } else if (modeToUse === 'BOTH') {
        // Duplex mode: Sheet 1 Front, Sheet 2 Back, Sheet 3 Front, Sheet 4 Back...
        const totalPages = totalBatches * 2;
        for (let b = 0; b < totalBatches; b++) {
          const batch = filtered.slice(b * cardsPerPage, (b + 1) * cardsPerPage);
          pageQueue.push({
            type: 'FRONT',
            students: batch,
            pageNumber: b * 2 + 1,
            totalPageCount: totalPages,
          });
          pageQueue.push({
            type: 'BACK',
            students: batch,
            pageNumber: b * 2 + 2,
            totalPageCount: totalPages,
          });
        }
      } else if (modeToUse === 'MOCKUP') {
        // Mockup mode: 2-3 students per page (Front & Back side by side)
        const pairsPerPage = isF4 ? 3 : 2;
        const totalMockupPages = Math.ceil(filtered.length / pairsPerPage);
        for (let b = 0; b < totalMockupPages; b++) {
          const batch = filtered.slice(b * pairsPerPage, (b + 1) * pairsPerPage);
          pageQueue.push({
            type: 'MOCKUP_PAIR',
            students: batch,
            pageNumber: b + 1,
            totalPageCount: totalMockupPages,
          });
        }
      }

      if (pageQueue.length === 0) {
        setIsGeneratingPdf(false);
        return;
      }

      // 3. Initialize jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: isF4 ? [215, 330] : [210, 297],
        compress: true,
      });

      // 4. Sequentially render each page and capture via html2canvas
      for (let i = 0; i < pageQueue.length; i++) {
        const pageInfo = pageQueue[i];
        const pageLabel =
          pageInfo.type === 'FRONT'
            ? 'Tampak Depan'
            : pageInfo.type === 'BACK'
            ? 'Tampak Belakang'
            : 'Mockup Pasangan';

        setPdfProgressText(`Memproses Halaman ${i + 1} dari ${pageQueue.length} (${pageLabel})...`);
        setPdfProgressPercent(Math.round((i / pageQueue.length) * 100));

        // Set staging page in state
        setCurrentStagingPage(pageInfo);

        // Wait for DOM to render SVG and fonts cleanly
        await new Promise((r) => setTimeout(r, 160));

        if (pdfPageRef.current) {
          const canvas = await html2canvas(pdfPageRef.current, {
            scale: 2.2, // ~220-250 DPI for crisp text, borders & QR codes
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 10000,
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.94);

          if (i > 0) {
            doc.addPage(isF4 ? [215, 330] : [210, 297], 'portrait');
          }

          doc.addImage(
            imgData,
            'JPEG',
            0,
            0,
            pageWidth,
            pageHeight,
            undefined,
            'FAST'
          );
        }
      }

      setPdfProgressText('Menyimpan berkas PDF...');
      setPdfProgressPercent(100);
      await new Promise((r) => setTimeout(r, 100));

      const dateStr = new Date().toISOString().split('T')[0];
      const modeLabel =
        modeToUse === 'BOTH'
          ? 'Bolak-Balik-Duplex'
          : modeToUse === 'FRONT'
          ? 'Tampak-Depan'
          : modeToUse === 'BACK'
          ? 'Tampak-Belakang'
          : 'Mockup-Sejajar';
      const classLabel = selectedClass === 'ALL' ? 'Semua-Kelas' : `Kelas-${selectedClass}`;
      const filename = `Kartu-Absensi-${(config.namaSekolah || 'SMP-PGRI-1-CIKADU').replace(/\s+/g, '-')}-${classLabel}-${modeLabel}-${paperSize}-${dateStr}.pdf`;

      doc.save(filename);
    } catch (err) {
      console.error('Gagal membuat PDF:', err);
      alert('Terjadi kesalahan saat memproses dokumen PDF. Silakan coba lagi atau gunakan Cetak Printer.');
    } finally {
      setIsGeneratingPdf(false);
      setCurrentStagingPage(null);
      setPdfProgressPercent(0);
      setPdfProgressText('');
    }
  };

  // Group into pages of 9
  const cardsPerPage = 9;
  const totalPages = Math.ceil(filtered.length / cardsPerPage);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Action Header (Hidden on Direct Print) */}
      <div className="no-print bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-extrabold text-slate-900">
              Desain Kartu Absensi Siswa SMP PGRI 1 CIKADU
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Format resmi (10,5 × 6,5 cm) dengan tata letak rapih: Kop Gelombang Biru-Kuning, Logo PGRI Bulat, Foto Siswa, Tabel Identitas, QR Code tebal, dan Panduan Belakang.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          {/* Card Side Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCardSide('MOCKUP')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                cardSide === 'MOCKUP'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilkan Tampak Depan & Belakang berdampingan persis seperti desain mockup"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Depan & Belakang (Sejajar)</span>
            </button>
            <button
              type="button"
              onClick={() => setCardSide('FRONT')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                cardSide === 'FRONT'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Depan Saja</span>
            </button>
            <button
              type="button"
              onClick={() => setCardSide('BACK')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                cardSide === 'BACK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Belakang Saja</span>
            </button>
            <button
              type="button"
              onClick={() => setCardSide('BOTH')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                cardSide === 'BOTH'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Cetak lembar ganjil Depan, genap Belakang (Siap Cetak Bolak-balik)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Cetak Duplex</span>
            </button>
          </div>

          {/* Paper selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setPaperSize('F4')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                paperSize === 'F4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              F4 (215x330mm)
            </button>
            <button
              type="button"
              onClick={() => setPaperSize('A4')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                paperSize === 'A4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 (210x297mm)
            </button>
          </div>

          {/* Action buttons */}
          <div className="relative" ref={downloadMenuRef}>
            <div className="inline-flex rounded-xl shadow-xs">
              <button
                type="button"
                onClick={() => handleDownloadPdf()}
                disabled={isGeneratingPdf || filtered.length === 0}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-l-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Unduh PDF kartu absensi berkualitas tinggi"
              >
                {isGeneratingPdf ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4" />
                )}
                <span>{isGeneratingPdf ? 'Memproses...' : 'Unduh PDF'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                disabled={isGeneratingPdf || filtered.length === 0}
                className="px-2 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white rounded-r-xl border-l border-rose-500 transition cursor-pointer"
                title="Pilihan format unduhan PDF"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {showDownloadMenu && (
              <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs text-slate-700 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Pilihan Unduh PDF (Kertas {paperSize})
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('BOTH')}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 hover:text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-slate-900 font-bold">Lengkap (Bolak-Balik / Duplex)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Halaman ganjil Depan, genap Belakang</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('FRONT')}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 hover:text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <CreditCard className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <div className="text-slate-900 font-bold">Tampak Depan Saja</div>
                      <div className="text-[10px] text-slate-500 font-normal">Hanya kartu identitas dan QR Code</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('BACK')}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 hover:text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <div className="text-slate-900 font-bold">Tampak Belakang Saja</div>
                      <div className="text-[10px] text-slate-500 font-normal">Hanya panduan penggunaan kartu</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf('MOCKUP')}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 hover:text-rose-700 font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutGrid className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <div className="text-slate-900 font-bold">Format Mockup (Sejajar)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Depan & Belakang dalam 1 lembar</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleDirectPrint}
            disabled={filtered.length === 0}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Printer</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Hidden on Direct Print) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs">
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
            <option value="ALL">Semua Siswa Terfilter ({filtered.length})</option>
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
              placeholder="Cari nama atau NISN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Guide Note on Printer Margins (Hidden on Direct Print) */}
      <div className="no-print p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-bold">
            Panduan Desain & Pencetakan:
          </p>
          <p className="text-slate-700 leading-relaxed text-[11px]">
            • Mode <strong>Depan & Belakang (Sejajar)</strong> menampilkan mockup persis seperti gambar acuan Anda (Tampak Depan dan Belakang bersandingan).<br />
            • Mode <strong>Depan Saja</strong> / <strong>Belakang Saja</strong> / <strong>Cetak Duplex</strong> menata 9 kartu per lembar pas pada kertas F4 / A4 untuk cetak printer langsung.
          </p>
        </div>
      </div>

      {/* Live Visual Card Preview */}
      <div className="print-sheet-wrapper p-4 sm:p-8 bg-slate-200/80 rounded-2xl border border-slate-300 overflow-x-auto flex flex-col items-center">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic text-xs">
            Tidak ada data kartu siswa yang cocok dengan filter.
          </div>
        ) : cardSide === 'MOCKUP' ? (
          /* ===== MOCKUP VIEW: Tampak Depan & Belakang Side-by-Side matching reference image ===== */
          <div className="space-y-10 flex flex-col items-center">
            {filtered.map((siswa) => (
              <div
                key={`mockup-${siswa.nisn}`}
                className="bg-slate-100/90 p-4 sm:p-6 rounded-3xl border border-slate-300 shadow-sm flex flex-col items-center gap-4"
              >
                <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
                  <span>Pratinjau Kartu Siswa:</span>
                  <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-md font-extrabold">
                    {siswa.nama} ({siswa.nisn}) - Kelas {siswa.kelas}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-8">
                  {/* Tampak Depan Card */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="shadow-lg rounded-2xl bg-white transition hover:shadow-xl">
                      <IdCardFront
                        student={siswa}
                        config={config}
                        qrDataUrl={qrMap[siswa.nisn]}
                        paperSize={paperSize}
                      />
                    </div>
                    <span className="bg-slate-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-2xs">
                      Tampak Depan (10,5 × 6,5 cm)
                    </span>
                  </div>

                  {/* Tampak Belakang Card */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="shadow-lg rounded-2xl bg-white transition hover:shadow-xl">
                      <IdCardBack
                        config={config}
                        paperSize={paperSize}
                      />
                    </div>
                    <span className="bg-slate-600 text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow-2xs">
                      Tampak Belakang (10,5 × 6,5 cm)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== 3x3 SHEET VIEW FOR PRINTER (FRONT, BACK, OR DUPLEX) ===== */
          <div ref={printContainerRef} className="space-y-8 print:space-y-0 flex flex-col items-center">
            {Array.from({ length: totalPages }).map((_, pIdx) => {
              const pageBatch = filtered.slice(pIdx * cardsPerPage, (pIdx + 1) * cardsPerPage);

              const pageClass =
                paperSize === 'F4'
                  ? 'id-card-page-f4 shadow-lg rounded-sm bg-white'
                  : 'id-card-page-a4 shadow-lg rounded-sm bg-white';

              return (
                <React.Fragment key={pIdx}>
                  {/* Page: Tampak Depan */}
                  {(cardSide === 'FRONT' || cardSide === 'BOTH') && (
                    <div className={pageClass}>
                      {pageBatch.map((siswa) => (
                        <IdCardFront
                          key={`front-${siswa.nisn}`}
                          student={siswa}
                          config={config}
                          qrDataUrl={qrMap[siswa.nisn]}
                          paperSize={paperSize}
                        />
                      ))}
                    </div>
                  )}

                  {/* Page: Tampak Belakang */}
                  {(cardSide === 'BACK' || cardSide === 'BOTH') && (
                    <div className={pageClass}>
                      {pageBatch.map((siswa) => (
                        <IdCardBack
                          key={`back-${siswa.nisn}`}
                          config={config}
                          paperSize={paperSize}
                        />
                      ))}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Off-screen PDF Rendering Stage (Active strictly during PDF export) */}
      {isGeneratingPdf && currentStagingPage && (
        <div
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            width: paperSize === 'F4' ? '215mm' : '210mm',
            minHeight: paperSize === 'F4' ? '330mm' : '297mm',
            zIndex: -9999,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          <div
            ref={pdfPageRef}
            className={
              paperSize === 'F4'
                ? 'id-card-page-f4 bg-white text-slate-900'
                : 'id-card-page-a4 bg-white text-slate-900'
            }
            style={{
              boxSizing: 'border-box',
              margin: 0,
              backgroundColor: '#ffffff',
            }}
          >
            {currentStagingPage.type === 'FRONT' &&
              currentStagingPage.students.map((siswa) => (
                <IdCardFront
                  key={`stage-front-${siswa.nisn}`}
                  student={siswa}
                  config={config}
                  qrDataUrl={qrMap[siswa.nisn]}
                  paperSize={paperSize}
                />
              ))}

            {currentStagingPage.type === 'BACK' &&
              currentStagingPage.students.map((siswa) => (
                <IdCardBack
                  key={`stage-back-${siswa.nisn}`}
                  config={config}
                  paperSize={paperSize}
                />
              ))}

            {currentStagingPage.type === 'MOCKUP_PAIR' &&
              currentStagingPage.students.map((siswa) => (
                <React.Fragment key={`stage-pair-${siswa.nisn}`}>
                  <IdCardFront
                    student={siswa}
                    config={config}
                    qrDataUrl={qrMap[siswa.nisn]}
                    paperSize={paperSize}
                  />
                  <IdCardBack
                    config={config}
                    paperSize={paperSize}
                  />
                </React.Fragment>
              ))}
          </div>
        </div>
      )}

      {/* High-Resolution PDF Generation Progress Modal */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 text-center space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-100 shadow-inner">
              <FileDown className="w-7 h-7 animate-bounce" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Menghasilkan Berkas PDF Beresolusi Tinggi
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                {pdfProgressText || 'Sedang merender kartu dengan tata letak presisi...'}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-blue-600 to-rose-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(6, pdfProgressPercent)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[11px] font-semibold text-slate-500 px-1">
              <span>Ukuran: Kertas {paperSize}</span>
              <span>{pdfProgressPercent}% Selesai</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
