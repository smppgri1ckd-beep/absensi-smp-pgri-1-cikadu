import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Student, AttendanceRecord, SchoolConfig } from '../types';

export function exportStudentsToExcel(students: Student[]) {
  const sorted = [...students].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));
  const wsData = [
    ["NISN", "NAMA LENGKAP", "JENIS KELAMIN", "KELAS", "FOTO URL"],
    ...sorted.map(s => [s.nisn, s.nama, s.jk === 'L' ? 'Laki-laki' : 'Perempuan', s.kelas, s.fotoUrl || ''])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 12 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "MASTER_SISWA");
  XLSX.writeFile(wb, `Format_Master_Siswa_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportRekapToExcel(
  config: SchoolConfig,
  students: Student[],
  attendance: AttendanceRecord[],
  tglAwal: string,
  tglAkhir: string,
  kelas: string,
  totalHeb: number
) {
  const targetSesi = Math.max(1, totalHeb * 2);
  let filteredStudents = kelas === 'ALL' ? [...students] : students.filter(s => s.kelas === kelas);
  filteredStudents.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  const rows: (string | number)[][] = [
    ["LAPORAN REKAPITULASI KEHADIRAN SISWA DIGITAL"],
    [config.namaSekolah],
    [`NPSN: ${config.npsn} | Alamat: ${config.alamat}`],
    [`Periode: ${tglAwal} s/d ${tglAkhir} | Kelas: ${kelas === 'ALL' ? 'Semua Kelas' : kelas} | Hari Efektif Belajar: ${totalHeb} Hari (${targetSesi} Sesi)`],
    [],
    ["NO", "NISN", "NAMA SISWA", "L/P", "KELAS", "HADIR PAGI", "HADIR SIANG", "TOTAL HADIR", "PERSENTASE (%)", "STATUS"]
  ];

  let totalGrandPagi = 0;
  let totalGrandSiang = 0;

  filteredStudents.forEach((s, idx) => {
    const studentLogs = attendance.filter(
      a => String(a.nisn).trim() === String(s.nisn).trim() && a.tanggal >= tglAwal && a.tanggal <= tglAkhir
    );
    const pagiCount = studentLogs.filter(a => a.sesi === 'Pagi').length;
    const siangCount = studentLogs.filter(a => a.sesi === 'Siang').length;
    const totalHadir = pagiCount + siangCount;
    const persen = Math.min(100, Math.round((totalHadir / targetSesi) * 100));

    totalGrandPagi += pagiCount;
    totalGrandSiang += siangCount;

    rows.push([
      idx + 1,
      s.nisn,
      s.nama,
      s.jk,
      s.kelas,
      pagiCount,
      siangCount,
      totalHadir,
      `${persen}%`,
      persen >= 75 ? 'Memenuhi Standar' : 'Perlu Pembinaan'
    ]);
  });

  // Summary Row
  rows.push([]);
  rows.push([
    "TOTAL",
    "",
    `Jumlah Siswa: ${filteredStudents.length}`,
    "",
    "",
    totalGrandPagi,
    totalGrandSiang,
    totalGrandPagi + totalGrandSiang,
    filteredStudents.length > 0 ? `${Math.round(((totalGrandPagi + totalGrandSiang) / (filteredStudents.length * targetSesi)) * 100)}%` : "0%",
    ""
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 28 },
    { wch: 6 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 15 },
    { wch: 18 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, "REKAP_PRESENSI");
  XLSX.writeFile(wb, `Rekap_Presensi_${kelas}_${tglAwal}_sd_${tglAkhir}.xlsx`);
}

export function exportRekapPDF(
  config: SchoolConfig,
  students: Student[],
  attendance: AttendanceRecord[],
  tglAwal: string,
  tglAkhir: string,
  kelas: string,
  totalHeb: number,
  piketName: string,
  piketNip: string,
  tglTtd: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4', // 210 x 297 mm
  });

  const pageWidth = 210;
  const margin = 10;
  let y = 14;

  // Header / Kop Surat
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN", pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.text("PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR", pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.setFontSize(13);
  doc.text(config.namaSekolah.toUpperCase(), pageWidth / 2, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(config.alamat, pageWidth / 2, y, { align: 'center' });
  y += 3.5;
  doc.text(`${config.kontak} | NPSN: ${config.npsn}`, pageWidth / 2, y, { align: 'center' });
  y += 3;

  // Double border line
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.8, pageWidth - margin, y + 0.8);
  y += 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text("LAPORAN REKAPITULASI KEHADIRAN SISWA", pageWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const infoText = `Periode: ${tglAwal} s/d ${tglAkhir}   |   Kelas: ${kelas === 'ALL' ? 'Semua Kelas' : kelas}   |   Hari Efektif: ${totalHeb} Hari (${totalHeb * 2} Sesi)`;
  doc.text(infoText, pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Table header
  const cols = [
    { title: "No", width: 8, align: 'center' as const },
    { title: "NISN", width: 22, align: 'center' as const },
    { title: "Nama Siswa", width: 62, align: 'left' as const },
    { title: "L/P", width: 10, align: 'center' as const },
    { title: "Kelas", width: 16, align: 'center' as const },
    { title: "Pagi", width: 18, align: 'center' as const },
    { title: "Siang", width: 18, align: 'center' as const },
    { title: "Total", width: 18, align: 'center' as const },
    { title: "% Hadir", width: 18, align: 'center' as const },
  ];

  const tableStartX = margin;
  let currentX = tableStartX;

  // Draw Header Row
  doc.setFillColor(240, 243, 246);
  doc.rect(tableStartX, y, pageWidth - (margin * 2), 6.5, 'F');
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.2);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  cols.forEach(col => {
    doc.rect(currentX, y, col.width, 6.5);
    const textX = col.align === 'center' ? currentX + (col.width / 2) : currentX + 2;
    doc.text(col.title, textX, y + 4.5, { align: col.align });
    currentX += col.width;
  });
  y += 6.5;

  let filtered = kelas === 'ALL' ? [...students] : students.filter(s => s.kelas === kelas);
  filtered.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }));

  const targetSesi = Math.max(1, totalHeb * 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);

  filtered.forEach((siswa, index) => {
    // Check if new page is needed
    if (y > 250) {
      doc.addPage();
      y = 15;
    }

    const studentLogs = attendance.filter(
      a => String(a.nisn).trim() === String(siswa.nisn).trim() && a.tanggal >= tglAwal && a.tanggal <= tglAkhir
    );
    const pagiCount = studentLogs.filter(a => a.sesi === 'Pagi').length;
    const siangCount = studentLogs.filter(a => a.sesi === 'Siang').length;
    const total = pagiCount + siangCount;
    const persen = Math.min(100, Math.round((total / targetSesi) * 100));

    currentX = tableStartX;
    const rowHeight = 5.5;

    const rowData = [
      String(index + 1),
      siswa.nisn,
      siswa.nama.length > 32 ? siswa.nama.substring(0, 30) + '...' : siswa.nama,
      siswa.jk,
      siswa.kelas,
      `${pagiCount} Hadir`,
      `${siangCount} Hadir`,
      `${total} Sesi`,
      `${persen}%`,
    ];

    cols.forEach((col, cIdx) => {
      doc.rect(currentX, y, col.width, rowHeight);
      const textX = col.align === 'center' ? currentX + (col.width / 2) : currentX + 2;
      doc.text(rowData[cIdx], textX, y + 3.8, { align: col.align });
      currentX += col.width;
    });

    y += rowHeight;
  });

  // Signatures Section
  if (y > 240) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }

  const leftSignX = margin + 25;
  const rightSignX = pageWidth - margin - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  // Left Signature (Headmaster)
  doc.text("Mengetahui,", leftSignX, y, { align: 'center' });
  doc.text("Kepala Sekolah,", leftSignX, y + 4, { align: 'center' });

  // Right Signature (Duty Teacher)
  const kotaDate = `${config.kota}, ${tglTtd}`;
  doc.text(kotaDate, rightSignX, y, { align: 'center' });
  doc.text("Guru Piket,", rightSignX, y + 4, { align: 'center' });

  y += 22;

  // Headmaster Name
  doc.setFont('helvetica', 'bold');
  doc.text(config.namaKepsek, leftSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${config.nipKepsek || '-'}`, leftSignX, y + 4, { align: 'center' });

  // Duty Teacher Name
  doc.setFont('helvetica', 'bold');
  doc.text(piketName || "Guru Piket, S.Pd", rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP: ${piketNip || '-'}`, rightSignX, y + 4, { align: 'center' });

  doc.save(`Rekap_Presensi_${config.namaSekolah.replace(/\s+/g, '_')}_${tglAwal}_sd_${tglAkhir}.pdf`);
}
