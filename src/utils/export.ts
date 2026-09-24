import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { Student, AttendanceRecord, SchoolConfig, TeacherUser } from '../types';
import { getSchoolLogoImage } from './imageLoader';

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
      a =>
        String(a.nisn).trim() === String(s.nisn).trim() &&
        a.tanggal >= tglAwal &&
        a.tanggal <= tglAkhir &&
        (a.kategori === 'APEL' || !a.kategori)
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

export async function exportRekapPDF(
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

  // Render Logo Sekolah in Kop Surat
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  // Draw school logo on the top-left if available
  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 13, 20, 20);
    } catch (e) {
      console.warn('Could not render logo to Rekap PDF:', e);
    }
  }

  // Header / Kop Surat
  const textCenterX = logoImg ? (pageWidth + margin + 16) / 2 : pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN", textCenterX, y, { align: 'center' });
  y += 4;
  doc.text("PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR", textCenterX, y, { align: 'center' });
  y += 5;
  doc.setFontSize(13);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(config.alamat, textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.text(`${config.kontak} | NPSN: ${config.npsn}`, textCenterX, y, { align: 'center' });
  y += 4;

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
      a =>
        String(a.nisn).trim() === String(siswa.nisn).trim() &&
        a.tanggal >= tglAwal &&
        a.tanggal <= tglAkhir &&
        (a.kategori === 'APEL' || !a.kategori)
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
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, leftSignX, y + 4, { align: 'center' });

  // Duty Teacher Name
  doc.setFont('helvetica', 'bold');
  doc.text(piketName || "Guru Piket, S.Pd", rightSignX, y, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP/NUPTK: ${piketNip || '-'}`, rightSignX, y + 4, { align: 'center' });

  doc.save(`Rekap_Presensi_${config.namaSekolah.replace(/\s+/g, '_')}_${tglAwal}_sd_${tglAkhir}.pdf`);
}

export async function exportSingleStudentAttendancePDF(
  config: SchoolConfig,
  student: Student,
  attendanceRecords: AttendanceRecord[]
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const margin = 14;
  let y = 14;

  // Render Logo Sekolah in Kop Surat
  let logoImg: HTMLImageElement | string | null = null;
  try {
    logoImg = await getSchoolLogoImage(config.logoUrl);
  } catch {
    logoImg = null;
  }

  // Draw school logo on top-left if available
  if (logoImg) {
    try {
      doc.addImage(logoImg as any, 'PNG', margin + 1, 13, 20, 20);
    } catch (e) {
      console.warn('Could not render logo to Student Slip PDF:', e);
    }
  }

  // Header / Kop Surat Resmi
  const textCenterX = logoImg ? (pageWidth + margin + 16) / 2 : pageWidth / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text("PERWAKILAN YAYASAN PEMBINA LEMBAGA PENDIDIKAN", textCenterX, y, { align: 'center' });
  y += 4;
  doc.text("PERSATUAN GURU REPUBLIK INDONESIA (YPLP PGRI) KABUPATEN CIANJUR", textCenterX, y, { align: 'center' });
  y += 5;
  doc.setFontSize(13);
  doc.text(config.namaSekolah.toUpperCase(), textCenterX, y, { align: 'center' });
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(config.alamat, textCenterX, y, { align: 'center' });
  y += 3.5;
  doc.text(`${config.kontak} | NPSN: ${config.npsn}`, textCenterX, y, { align: 'center' });
  y += 4;

  // Divider lines
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  doc.setLineWidth(0.3);
  doc.line(margin, y + 0.8, pageWidth - margin, y + 0.8);
  y += 6;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LEMBAR BUKTI & RIWAYAT KEHADIRAN SISWA', pageWidth / 2, y, { align: 'center' });
  y += 6;

  // Student Identity Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, pageWidth - (margin * 2), 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Nama Lengkap:', margin + 4, y + 6);
  doc.text('NISN:', margin + 4, y + 12);
  doc.text('Kelas / Rombel:', margin + 4, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(student.nama, margin + 32, y + 6);
  doc.text(student.nisn, margin + 32, y + 12);
  doc.text(student.kelas, margin + 32, y + 18);

  doc.setFont('helvetica', 'bold');
  doc.text('Jenis Kelamin:', margin + 95, y + 6);
  doc.text('Tanggal Dicetak:', margin + 95, y + 12);
  doc.text('Status Data:', margin + 95, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(student.jk === 'L' ? 'Laki-laki' : 'Perempuan', margin + 125, y + 6);
  doc.text(new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), margin + 125, y + 12);
  doc.text('Terverifikasi Sistem Presensi', margin + 125, y + 18);

  y += 26;

  // Attendance Records
  const studentLogs = attendanceRecords
    .filter((a) => String(a.nisn).trim() === String(student.nisn).trim())
    .sort((a, b) => (b.tanggal + b.waktu).localeCompare(a.tanggal + a.waktu));

  const totalLogs = studentLogs.length;
  const onTimeCount = studentLogs.filter((a) => a.status.includes('Tepat Waktu')).length;
  const lateCount = studentLogs.filter((a) => a.status.includes('Terlambat')).length;
  const permissionCount = studentLogs.filter((a) => a.status === 'Izin' || a.status === 'Sakit').length;

  // Mini summary badges
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`Total Kehadiran: ${totalLogs} Sesi`, margin, y);
  doc.text(`Tepat Waktu: ${onTimeCount}`, margin + 50, y);
  doc.text(`Terlambat: ${lateCount}`, margin + 95, y);
  doc.text(`Izin/Sakit: ${permissionCount}`, margin + 135, y);
  y += 5;

  // Table header
  const tableWidth = pageWidth - (margin * 2);
  const cols = [
    { title: 'NO', width: 10, align: 'center' as const },
    { title: 'TANGGAL', width: 28, align: 'center' as const },
    { title: 'KATEGORI / SESI / MAPEL', width: 55, align: 'left' as const },
    { title: 'JAM (WIB)', width: 24, align: 'center' as const },
    { title: 'STATUS KEHADIRAN', width: 40, align: 'center' as const },
    { title: 'KETERANGAN', width: tableWidth - 157, align: 'left' as const },
  ];

  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, tableWidth, 6, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  let currentX = margin;
  cols.forEach((col) => {
    const textX = col.align === 'center' ? currentX + (col.width / 2) : currentX + 2;
    doc.text(col.title, textX, y + 4.2, { align: col.align });
    currentX += col.width;
  });
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  const displayLogs = studentLogs.slice(0, 30); // show up to 30 latest entries
  if (displayLogs.length === 0) {
    doc.rect(margin, y, tableWidth, 8);
    doc.text('Belum ada catatan riwayat kehadiran yang tersimpan.', pageWidth / 2, y + 5.2, { align: 'center' });
    y += 8;
  } else {
    displayLogs.forEach((log, idx) => {
      if (y > 245) {
        doc.addPage();
        y = 15;
      }

      currentX = margin;
      const rowHeight = 5.5;

      const kategoriText = log.kategori === 'KELAS'
        ? `KBM: ${log.mapel || 'Mapel'} (P-${log.pertemuanKe || '1'})`
        : `Apel: Sesi ${log.sesi}`;

      const keteranganText = log.kategori === 'KELAS' && log.materiPokok
        ? log.materiPokok.substring(0, 24)
        : '-';

      const rowValues = [
        String(idx + 1),
        log.tanggal,
        kategoriText,
        `${log.waktu} WIB`,
        log.status,
        keteranganText,
      ];

      cols.forEach((col, cIdx) => {
        doc.rect(currentX, y, col.width, rowHeight);
        const textX = col.align === 'center' ? currentX + (col.width / 2) : currentX + 2;
        doc.text(rowValues[cIdx], textX, y + 3.8, { align: col.align });
        currentX += col.width;
      });

      y += rowHeight;
    });
  }

  // Signature Block
  if (y > 235) {
    doc.addPage();
    y = 20;
  } else {
    y += 10;
  }

  const leftSignX = margin + 30;
  const rightSignX = pageWidth - margin - 35;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Mengetahui / Memeriksa,', leftSignX, y, { align: 'center' });
  doc.text('Orang Tua / Wali Siswa', leftSignX, y + 4, { align: 'center' });

  const dateNowStr = `${config.kota}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
  doc.text(dateNowStr, rightSignX, y, { align: 'center' });
  doc.text('Petugas / Kepala Sekolah', rightSignX, y + 4, { align: 'center' });

  y += 22;

  // Signature lines & names
  doc.setFont('helvetica', 'bold');
  doc.text('( ............................................. )', leftSignX, y, { align: 'center' });
  doc.text(config.namaKepsek, rightSignX, y, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.text('Nama Terang Orang Tua / Wali', leftSignX, y + 4, { align: 'center' });
  doc.text(`NIP/NUPTK: ${config.nipKepsek || '-'}`, rightSignX, y + 4, { align: 'center' });

  doc.save(`Presensi_${student.nisn}_${student.nama.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Download standard Excel template for bulk importing teachers (.xlsx)
 */
export function downloadTeacherExcelTemplate(config?: SchoolConfig) {
  const schoolName = config?.namaSekolah || 'SMP PGRI 1 CIKADU';
  const wb = XLSX.utils.book_new();

  // Sheet 1: TEMPLATE_GURU (Main Data Entry Sheet)
  const headers = [
    'NIP / NUPTK',
    'NAMA GURU & GELAR',
    'USERNAME',
    'PASSWORD',
    'MATA PELAJARAN',
    'WALI KELAS',
    'NO HP / WHATSAPP',
    'STATUS',
  ];

  const sampleRows = [
    [
      '198203152008011004',
      'Drs. H. Budi Santoso, M.Pd.',
      'budi.santoso',
      'guru123',
      'Matematika',
      'VII-A',
      '081234567890',
      'AKTIF',
    ],
    [
      '199105202022212009',
      'Siti Rahmawati, S.Pd.',
      'siti.rahmawati',
      'guru123',
      'Bahasa Indonesia',
      'VIII-A',
      '085678901234',
      'AKTIF',
    ],
    [
      '199407122020121005',
      'Ahmad Fauzi, S.Pd., Gr.',
      'ahmad.fauzi',
      'guru123',
      'Ilmu Pengetahuan Alam (IPA)',
      'IX-A',
      '087812345678',
      'AKTIF',
    ],
    [
      '-',
      'Nurul Hidayah, S.Pd.I.',
      'nurul.hidayah',
      'guru123',
      'Pendidikan Agama Islam dan Budi Pekerti',
      'VII-B',
      '081398765432',
      'AKTIF',
    ],
    [
      '-',
      'Rizky Pratama, S.Kom.',
      'rizky.pratama',
      'guru123',
      'Informatika, Prakarya',
      '-',
      '082155667788',
      'AKTIF',
    ],
    [
      '-',
      'Dewi Lestari, S.Pd.',
      'dewi.lestari',
      'guru123',
      'Pendidikan Jasmani Olahraga dan Kesehatan (PJOK), Seni Budaya',
      'VIII-B',
      '081987654321',
      'AKTIF',
    ],
    [
      '-',
      'Cecep Supriatna, S.Pd.',
      'cecep.supriatna',
      'guru123',
      'Bahasa Inggris, Bahasa Sunda',
      '-',
      '085211223344',
      'AKTIF',
    ],
  ];

  // Build sheet with strict text types to prevent scientific notation on NIP and phone numbers
  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Enforce text formatting on all cells so leading zeros and long NIP numbers stay intact
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H8');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[cellAddress]) {
        ws[cellAddress].t = 's'; // Force string type
        ws[cellAddress].z = '@'; // Force text format
      }
    }
  }

  // Column width formatting
  ws['!cols'] = [
    { wch: 24 }, // NIP / NUPTK
    { wch: 34 }, // NAMA GURU & GELAR
    { wch: 22 }, // USERNAME
    { wch: 18 }, // PASSWORD
    { wch: 46 }, // MATA PELAJARAN
    { wch: 18 }, // WALI KELAS
    { wch: 22 }, // NO HP / WHATSAPP
    { wch: 14 }, // STATUS
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'TEMPLATE_GURU');

  // Sheet 2: PETUNJUK_DAN_CONTOH (Comprehensive Guide & Subject List)
  const petunjukRows = [
    ['PANDUAN & PETUNJUK PENGISIAN TEMPLATE IMPOR DATA GURU'],
    [`Instansi: ${schoolName}`],
    ['Gunakan template ini untuk mengisi data guru secara massal agar tidak terjadi kesalahan sistem.'],
    [],
    ['=== ATURAN PENGISIAN SETIAP KOLOM ==='],
    ['NAMA KOLOM', 'KEWAJIBAN', 'ATURAN & CONTOH PENULISAN'],
    [
      'NIP / NUPTK',
      'Opsional',
      'Isi 18 digit NIP PNS/PPPK atau 16 digit NUPTK. Jika guru Honorer / GTT belum memiliki NIP, isi dengan tanda strip (-) atau kosongkan.',
    ],
    [
      'NAMA GURU & GELAR',
      'Wajib',
      'Tulis nama lengkap beserta gelar akademik guru (contoh: Drs. H. Budi Santoso, M.Pd. atau Siti Rahmawati, S.Pd.).',
    ],
    [
      'USERNAME',
      'Wajib / Otomatis',
      'Username untuk login ke Portal Guru (gunakan huruf kecil tanpa spasi, contoh: budi.santoso). Jika dikosongkan, sistem akan membuatkan otomatis.',
    ],
    [
      'PASSWORD',
      'Wajib / Otomatis',
      'Kata sandi awal untuk login (contoh: guru123). Jika dikosongkan, kata sandi bawaan adalah guru123.',
    ],
    [
      'MATA PELAJARAN',
      'Wajib',
      'Tulis mata pelajaran yang diampu. JIKA 1 GURU MENGAJAR LEBIH DARI 1 MAPEL, PISAHKAN DENGAN TANDA KOMA (contoh: "Matematika, IPA, Informatika"). Guru dapat memilih mapel saat mengajar di kelas.',
    ],
    [
      'WALI KELAS',
      'Opsional',
      'Isi kode kelas binaan (contoh: VII-A, VII-B, VIII-A, VIII-B, IX-A, IX-B). Jika bukan wali kelas, isi tanda strip (-) atau "Bukan Wali Kelas".',
    ],
    [
      'NO HP / WHATSAPP',
      'Opsional',
      'Nomor WhatsApp aktif guru diawali angka 08 (contoh: 081234567890). Nomor ini digunakan untuk kontak darurat dan koordinasi.',
    ],
    [
      'STATUS',
      'Wajib',
      'Status keaktifan akun. Isi dengan: "AKTIF" (agar bisa login) atau "NONAKTIF" (default: AKTIF).',
    ],
    [],
    ['=== DAFTAR REFERENSI MATA PELAJARAN UMUM (SMP) ==='],
    ['1', 'Pendidikan Agama Islam dan Budi Pekerti', 'PAI'],
    ['2', 'Pendidikan Pancasila dan Kewarganegaraan (PPKn)', 'PPKn'],
    ['3', 'Bahasa Indonesia', 'Bahasa Indonesia'],
    ['4', 'Matematika', 'Matematika'],
    ['5', 'Ilmu Pengetahuan Alam (IPA)', 'IPA'],
    ['6', 'Ilmu Pengetahuan Sosial (IPS)', 'IPS'],
    ['7', 'Bahasa Inggris', 'Bahasa Inggris'],
    ['8', 'Pendidikan Jasmani Olahraga dan Kesehatan (PJOK)', 'PJOK'],
    ['9', 'Seni Budaya', 'Seni Budaya'],
    ['10', 'Prakarya', 'Prakarya'],
    ['11', 'Informatika', 'Informatika'],
    ['12', 'Bahasa Sunda', 'Bahasa Sunda / Muatan Lokal'],
    ['13', 'Bimbingan dan Konseling (BK)', 'BK'],
    [],
    ['=== TIPS PENTING AGAR TIDAK GAGAL IMPOR ==='],
    ['1', 'Jangan mengubah atau menghapus baris judul (Header baris ke-1) di lembar "TEMPLATE_GURU".', ''],
    ['2', 'Pastikan nama guru tidak kosong.', ''],
    ['3', 'Format file yang didukung saat unggah adalah .xlsx, .xls, atau .csv.', ''],
  ];

  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukRows);
  wsPetunjuk['!cols'] = [{ wch: 26 }, { wch: 32 }, { wch: 75 }];
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'PETUNJUK_DAN_CONTOH');

  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Template_Impor_Guru_${schoolName.replace(/\s+/g, '_')}_${dateStr}.xlsx`);
}

/**
 * Download standard CSV template for bulk importing teachers (.csv)
 */
export function downloadTeacherCsvTemplate(config?: SchoolConfig) {
  const schoolName = config?.namaSekolah || 'SMP PGRI 1 CIKADU';
  const headers = [
    'NIP / NUPTK',
    'NAMA GURU & GELAR',
    'USERNAME',
    'PASSWORD',
    'MATA PELAJARAN',
    'WALI KELAS',
    'NO HP / WHATSAPP',
    'STATUS',
  ];

  const sampleRows = [
    [
      '198203152008011004',
      'Drs. H. Budi Santoso, M.Pd.',
      'budi.santoso',
      'guru123',
      'Matematika',
      'VII-A',
      '081234567890',
      'AKTIF',
    ],
    [
      '199105202022212009',
      'Siti Rahmawati, S.Pd.',
      'siti.rahmawati',
      'guru123',
      'Bahasa Indonesia',
      'VIII-A',
      '085678901234',
      'AKTIF',
    ],
    [
      '199407122020121005',
      'Ahmad Fauzi, S.Pd.',
      'ahmad.fauzi',
      'guru123',
      'Ilmu Pengetahuan Alam (IPA)',
      'IX-A',
      '087812345678',
      'AKTIF',
    ],
    [
      '-',
      'Nurul Hidayah, S.Pd.I.',
      'nurul.hidayah',
      'guru123',
      'Pendidikan Agama Islam dan Budi Pekerti',
      'VII-B',
      '081398765432',
      'AKTIF',
    ],
    [
      '-',
      'Rizky Pratama, S.Kom.',
      'rizky.pratama',
      'guru123',
      'Informatika, Prakarya',
      '-',
      '082155667788',
      'AKTIF',
    ],
    [
      '-',
      'Dewi Lestari, S.Pd.',
      'dewi.lestari',
      'guru123',
      'Pendidikan Jasmani Olahraga dan Kesehatan (PJOK), Seni Budaya',
      'VIII-B',
      '081987654321',
      'AKTIF',
    ],
  ];

  const escapeCsvVal = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
  const csvContent =
    '\uFEFF' +
    [
      headers.map(escapeCsvVal).join(','),
      ...sampleRows.map((row) => row.map(escapeCsvVal).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `Template_Impor_Guru_${schoolName.replace(/\s+/g, '_')}_${dateStr}.csv`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Export full teacher list to Excel
 */
export function exportTeachersToExcel(teachers: TeacherUser[], config?: SchoolConfig) {
  const schoolName = config?.namaSekolah || 'Sekolah';
  const rows = [
    ['DAFTAR AKUN PENGGUNA GURU - E-PRESENSI'],
    [schoolName],
    [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}`],
    [],
    ['NO', 'NIP / NUPTK', 'NAMA GURU & GELAR', 'USERNAME', 'PASSWORD', 'MATA PELAJARAN', 'WALI KELAS', 'NO HP / WHATSAPP', 'STATUS'],
  ];

  teachers.forEach((t, idx) => {
    rows.push([
      String(idx + 1),
      t.nip || '-',
      t.nama,
      t.username,
      t.password,
      t.mapel,
      t.waliKelas || 'Bukan Wali Kelas',
      t.kontak || t.noHp || '-',
      t.status,
    ]);
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!cols'] = [
    { wch: 6 },
    { wch: 22 },
    { wch: 32 },
    { wch: 20 },
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'AKUN_GURU');
  XLSX.writeFile(wb, `Daftar_Akun_Guru_${schoolName.replace(/\s+/g, '_')}.xlsx`);
}


