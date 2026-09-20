/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  AlertCircle, 
  ChevronLeft, 
  Loader2, 
  Trash2, 
  ShieldCheck, 
  QrCode as QrCodeIcon, 
  FileText, 
  Award 
} from 'lucide-react';
import { doc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { motion } from 'motion/react';
import { translateToIndonesian, getUniversalMeasurements } from '../lib/metrologyUtils';

export function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState<any>(null);
  const [lk, setLk] = useState<any>(null);
  const [calibratorList, setCalibratorList] = useState<any[]>([]);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const certRef = doc(db, 'certificates', id);
        const certSnap = await getDoc(certRef);
        
        let certData: any = null;
        if (certSnap.exists()) {
          certData = { id: certSnap.id, ...certSnap.data() };
          setCert(certData);
        } else {
          // If accessing by LK id directly
          const lkRef = doc(db, 'worksheets', id);
          const lkSnap = await getDoc(lkRef);
          if (lkSnap.exists()) {
            const rawLk = { id: lkSnap.id, ...lkSnap.data() } as any;
            setLk(rawLk);
            certData = {
              id: id,
              certificateNumber: `${new Date().getFullYear()}/SKP/${id.slice(0, 5).toUpperCase()}`,
              lkId: id,
              deviceName: rawLk.deviceName,
              brand: rawLk.brand,
              model: rawLk.model,
              serialNumber: rawLk.serialNumber,
              fasyankesName: rawLk.fasyankesName,
              location: rawLk.location,
              issuedByName: rawLk.technicianName || 'Teknisi Utama',
              issuedAt: rawLk.issuedAt || rawLk.createdAt,
              nextCalibrationDate: rawLk.nextCalibrationDate,
              status: rawLk.status === 'completed' || rawLk.status === 'approved' ? 'active' : 'draft',
              isPass: rawLk.isPass !== false,
              measurements: rawLk.measurements,
              environmentalData: rawLk.environmentalData || {
                temperature: rawLk.tempInitial || '25.0',
                humidity: rawLk.humInitial || '55.0',
                voltage: rawLk.voltage || '220'
              }
            };
            setCert(certData);
          }
        }

        if (certData?.lkId) {
          const lkRef = doc(db, 'worksheets', certData.lkId);
          const lkSnap = await getDoc(lkRef);
          if (lkSnap.exists()) {
            setLk({ id: lkSnap.id, ...lkSnap.data() });
          }
        }

        // Fetch Master Calibrators info
        const calsSnap = await getDocs(collection(db, 'calibrators'));
        setCalibratorList(calsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Generate QR code for verification
        const verifyUrl = `${window.location.origin}/verify/${id}`;
        const qrUrl = await QRCode.toDataURL(verifyUrl, {
          width: 180,
          margin: 1,
          color: {
            dark: '#1e3a8a',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(qrUrl);

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `certificates/${id}`);
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formattedAtDate = (d: any, plusDays = 0) => {
    if (!d) return '-';
    let dateObj = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    if (plusDays !== 0) {
      dateObj = new Date(dateObj.setDate(dateObj.getDate() + plusDays));
    }
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedExpiryDate = (d: any, plusYears = 1) => {
    if (!d) return '-';
    let dateObj = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    dateObj = new Date(dateObj.setFullYear(dateObj.getFullYear() + plusYears));
    dateObj = new Date(dateObj.setDate(dateObj.getDate() - 1));
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const temperature = lk?.environmentalData?.temperature || lk?.tempInitial || cert?.environmentalData?.temperature || '25.0';
    const humidity = lk?.environmentalData?.humidity || lk?.humInitial || cert?.environmentalData?.humidity || '55.0';
    const tempUnc = lk?.environmentalData?.tempUncertainty || '0.4';
    const humUnc = lk?.environmentalData?.humUncertainty || '4.0';

    const drawPageBorder = () => {
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(1.2);
      doc.rect(8, 8, 194, 281);

      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.4);
      doc.rect(10, 10, 190, 277);
      
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.2);
      doc.rect(12, 12, 186, 273);
    };

    // PAGE 1: COVER CERTIFICATE
    drawPageBorder();

    // Watermark Logo
    doc.setFillColor(30, 64, 175);
    doc.circle(105, 148, 35, 'FD');
    doc.setFillColor(255, 255, 255);
    doc.circle(105, 148, 30, 'FD');

    doc.setTextColor(15, 23, 42);

    // Header Logo & Branding
    doc.setFillColor(2, 132, 199);
    doc.ellipse(26, 26, 5, 5, 'F');
    doc.setFillColor(30, 58, 138);
    doc.ellipse(31, 30, 5, 5, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(29, 78, 216);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 40, 27);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("LABORATORIUM KALIBRASI & METROLOGI ALAT KESEHATAN", 40, 31.5);

    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(0.8);
    doc.line(20, 36, 190, 36);

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text("Sertifikat Kalibrasi", 105, 48, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.text("CALIBRATION CERTIFICATE", 105, 54, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(cert?.certificateNumber || "2026/SKP/04129", 105, 62, { align: "center" });

    // Section 1: Customer Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(29, 78, 216);
    doc.text("IDENTITAS PEMILIK / OWNER IDENTITY", 25, 73);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(25, 75, 185, 75);

    let yOffset = 82;
    const writeGridRow = (label: string, labelEng: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(label, 25, yOffset);
      
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(labelEng, 25, yOffset + 3.2);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(":", 70, yOffset);

      doc.text(String(value || "-"), 75, yOffset);
      yOffset += 10.5;
    };

    writeGridRow("Pemilik", "Customer", lk?.fasyankesName || cert?.fasyankesName);
    writeGridRow("Alamat", "Address", lk?.fasyankesAddress || lk?.location || cert?.location);
    writeGridRow("Tanggal Terima Unit", "Unit Received Date", formattedAtDate(lk?.createdAt || cert?.issuedAt));
    writeGridRow("Tanggal Kalibrasi", "Date of Calibration", formattedAtDate(lk?.createdAt || cert?.issuedAt));

    // Section 2: Instrument Info
    yOffset = 132;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(29, 78, 216);
    doc.text("IDENTITAS INSTRUMEN / INSTRUMENT IDENTITY", 25, yOffset);
    doc.line(25, yOffset + 2, 185, yOffset + 2);

    yOffset += 8;
    writeGridRow("Nama Alat", "Instrument Name", lk?.deviceName || cert?.deviceName || "Alat Medis");
    writeGridRow("Merek / Pabrikan", "Manufacture", lk?.brand || cert?.brand);
    writeGridRow("Tipe / Model", "Type / Model", lk?.model || cert?.model);
    writeGridRow("Nomor Seri", "Serial Number", lk?.serialNumber || cert?.serialNumber);
    writeGridRow("Tempat Kalibrasi", "Place of Calibration", lk?.location || cert?.location || "Laboratorium Kalibrasi");
    writeGridRow("Tanggal Diterbitkan", "Date of Issued", formattedAtDate(lk?.createdAt || cert?.issuedAt, 1));
    writeGridRow("Masa Berlaku", "Expired Date", cert?.nextCalibrationDate || formattedExpiryDate(lk?.createdAt || cert?.issuedAt));

    // QR Code Embed on Page 1
    if (qrCodeDataUrl) {
      try {
        doc.addImage(qrCodeDataUrl, 'PNG', 28, yOffset + 2, 28, 28);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("Pindai untuk Verifikasi", 42, yOffset + 33, { align: "center" });
      } catch (err) {
        console.error("QR PDF Error:", err);
      }
    }

    // Signatures
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 130, yOffset + 2);

    // Official Stamp
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.6);
    doc.ellipse(155, yOffset + 15, 18, 12, 'S');
    doc.ellipse(155, yOffset + 15, 16, 10, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(37, 99, 235);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 155, yOffset + 14, { align: "center" });
    doc.setFontSize(5.5);
    doc.text("* METROLOGI DIGITAL *", 155, yOffset + 17, { align: "center" });

    // Signature Line
    doc.setLineWidth(1.0);
    doc.line(140, yOffset + 12, 147, yOffset + 6);
    doc.line(147, yOffset + 6, 154, yOffset + 18);
    doc.line(154, yOffset + 18, 168, yOffset + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("Faustina Dao S.Tr.Tem", 155, yOffset + 30, { align: "center" });
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(125, yOffset + 31, 185, yOffset + 31);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Manager Teknis", 155, yOffset + 35, { align: "center" });

    // Page 1 Footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Halaman 1 dari 2", 105, 274, { align: "center" });

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia", 105, 278.5, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.rect(20, 281, 170, 7, 'FD');
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text("Hasil hanya berhubungan dengan instrumen yang diuji dan sertifikat ini sah apabila dibubuhi stempel/tanda tangan resmi.", 105, 285.5, { align: "center" });

    // PAGE 2: RESULTS REPORT DETAIL
    doc.addPage();
    drawPageBorder();

    // PT Spektrum header line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(29, 78, 216);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 20, 22);

    // Certificate Box Right
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.setFillColor(248, 250, 252);
    doc.rect(138, 14, 52, 12, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("No. Sertifikat", 164, 18, { align: "center" });
    doc.line(138, 20, 190, 20);
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(cert?.certificateNumber || "2026/SKP/04129", 164, 24.5, { align: "center" });

    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.0);
    doc.line(20, 28, 190, 28);

    // Report Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(`LAPORAN HASIL KALIBRASI — ${(lk?.deviceName || cert?.deviceName || "ALAT KESEHATAN").toUpperCase()}`, 105, 35, { align: "center" });

    // Summary metadata
    const writeColVal = (lbl: string, val: string, sx: number, sy: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(lbl, sx, sy);
      doc.text(":", sx + 28, sy);
      doc.setTextColor(15, 23, 42);
      doc.text(String(val || "-"), sx + 30, sy);
    };

    writeColVal("Instansi / RS", lk?.fasyankesName || cert?.fasyankesName, 20, 43);
    writeColVal("Merek / Tipe", `${lk?.brand || '-'} / ${lk?.model || '-'}`, 20, 48);
    writeColVal("Nomor Seri", lk?.serialNumber || cert?.serialNumber, 20, 53);

    writeColVal("Metode Acuan", translateToIndonesian(lk?.methodName || "Protokol Standar KAN"), 110, 43);
    writeColVal("Lokasi Kalibrasi", lk?.location || cert?.location || "In-Situ", 110, 48);
    writeColVal("Tgl Kalibrasi", formattedAtDate(lk?.createdAt || cert?.issuedAt), 110, 53);

    // Section I: Environment
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("I. Kondisi Lingkungan Pengujian", 20, 62);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`1. Suhu Ruang : ( ${temperature} ± ${tempUnc} ) °C`, 25, 67.5);
    doc.text(`2. Kelembaban : ( ${humidity} ± ${humUnc} ) %RH`, 95, 67.5);

    // Section II: Standards Used
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("II. Standar Kalibrator yang Digunakan", 20, 76);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const activeCals = calibratorList.filter(c => (lk?.calibratorIds || cert?.calibratorIds || []).includes(c.id));
    if (activeCals.length > 0) {
      activeCals.forEach((cal: any, cIdx: number) => {
        doc.text(`${cIdx + 1}. ${cal.name || cal.deviceName} (SN: ${cal.serialNumber || '-'}) | Tertelusur: ${cal.traceability || 'Puslit KIM-LIPI / KAN'} | Sertifikat: ${cal.certificateNumber || '-'}`, 25, 81.5 + cIdx * 4.5);
      });
    } else {
      doc.text("1. Simulator Kalibrator Standar Terkalibrasi Tertelusur SI (KAN LK-291-IDN)", 25, 81.5);
    }

    // Section III: Measurements Table
    const tY = 95;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("III. Hasil Pengukuran & Analisis Ketidakpastian (ISO GUM)", 20, tY - 3);

    // Dynamic Measurements Table
    const measurements = getUniversalMeasurements(lk || cert);

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(20, tY, 170, 9, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.rect(20, tY, 170, 9, 'S');

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    doc.text("Parameter Uji", 23, tY + 5.5);
    doc.text("Setting", 66, tY + 5.5, { align: "center" });
    doc.text("Terukur", 90, tY + 5.5, { align: "center" });
    doc.text("Deviasi", 112, tY + 5.5, { align: "center" });
    doc.text("U95 (k=2)", 134, tY + 5.5, { align: "center" });
    doc.text("Toleransi", 156, tY + 5.5, { align: "center" });
    doc.text("Status", 178, tY + 5.5, { align: "center" });

    doc.line(56, tY, 56, tY + 9);
    doc.line(78, tY, 78, tY + 9);
    doc.line(102, tY, 102, tY + 9);
    doc.line(122, tY, 122, tY + 9);
    doc.line(146, tY, 146, tY + 9);
    doc.line(166, tY, 166, tY + 9);

    let rowY = tY + 9;
    measurements.forEach((row: any) => {
      doc.rect(20, rowY, 170, 6.5, 'S');

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(String(row.parameterName).slice(0, 22), 23, rowY + 4.5);

      doc.text(`${row.point} ${row.unit || ''}`, 66, rowY + 4.5, { align: "center" });
      doc.text(`${row.actual}`, 90, rowY + 4.5, { align: "center" });
      doc.text(`${row.deviation}`, 112, rowY + 4.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 78, 216);
      doc.text(`± ${row.uncertainty}`, 134, rowY + 4.5, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setTextColor(15, 23, 42);
      doc.text(`± ${row.tolerance}`, 156, rowY + 4.5, { align: "center" });

      const isLolos = row.status === 'Lolos';
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isLolos ? 16 : 220, isLolos ? 185 : 38, isLolos ? 129 : 38);
      doc.text(isLolos ? "LOLOS" : "FAIL", 178, rowY + 4.5, { align: "center" });
      doc.setTextColor(15, 23, 42);

      doc.line(56, rowY, 56, rowY + 6.5);
      doc.line(78, rowY, 78, rowY + 6.5);
      doc.line(102, rowY, 102, rowY + 6.5);
      doc.line(122, rowY, 122, rowY + 6.5);
      doc.line(146, rowY, 146, rowY + 6.5);
      doc.line(166, rowY, 166, rowY + 6.5);

      rowY += 6.5;
    });

    // Notes
    rowY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Catatan & Ketertelusuran :", 20, rowY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    const listNotes = [
      "1. Kalibrasi yang dilaporkan tertelusur ke satuan pengukuran Sistem Internasional (SI) melalui SNSU-BSN / Puslit KIM-LIPI.",
      "2. Ketidakpastian pengukuran bentangan U95 dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k = 2.",
      "3. Batas toleransi (MPE) mengacu pada standar Kepmenkes RI No. HK.01.07/MENKES/2023 / IEC 60601 / IEC 62353."
    ];

    listNotes.forEach((nText, idxNotes) => {
      doc.text(nText, 25, rowY + 4 + idxNotes * 4.5);
    });

    // Pass Status Banner Box
    rowY += 19;
    const passes = lk?.isPass !== false && cert?.isPass !== false;
    doc.setLineWidth(0.6);
    if (passes) {
      doc.setDrawColor(16, 185, 129);
      doc.setFillColor(240, 253, 250);
    } else {
      doc.setDrawColor(239, 68, 68);
      doc.setFillColor(254, 242, 242);
    }
    doc.rect(20, rowY, 170, 9, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(passes ? 4 : 185, passes ? 120 : 28, passes ? 87 : 28);
    doc.text(
      `KESIMPULAN : ALAT DINYATAKAN ${passes ? "MEMENUHI PERSYARATAN MPE (LAIK OPERASIONAL)" : "MELEBIHI BATAS PENYIMPANGAN (TIDAK LAIK)"}`, 
      105, 
      rowY + 5.8, 
      { align: "center" }
    );

    // Footer Page 2
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Halaman 2 dari 2", 190, 274, { align: "right" });

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia", 105, 278.5, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.rect(20, 281, 170, 7, 'FD');
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6);
    doc.text("Hasil hanya berhubungan dengan instrumen yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan PT. SPEKTRUM KREASI PRATAMA", 105, 285.5, { align: "center" });

    const filename = `Sertifikat_Kalibrasi_${cert?.certificateNumber?.replace(/\//g, "_") || "SKP"}.pdf`;
    doc.save(filename);
  };

  const handleDelete = async () => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sertifikat ini?')) return;
    try {
      if (id) {
        await deleteDoc(doc(db, 'certificates', id));
        navigate('/certificates');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `certificates/${id}`);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">Memuat Sertifikat Resmi...</p>
    </div>
  );

  if (!cert) return (
    <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-xl max-w-2xl mx-auto my-20 p-8">
       <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <AlertCircle className="w-10 h-10 text-amber-500" />
       </div>
       <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sertifikat Tidak Ditemukan</h2>
       <p className="text-xs text-slate-400 mt-2 font-mono">ID Sertifikat tidak valid atau telah dihapus dari registri.</p>
       <button onClick={() => navigate('/certificates')} className="mt-8 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all">Kembali ke Registri</button>
    </div>
  );

  const measurements = getUniversalMeasurements(lk || cert);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 p-2 sm:p-4">
      {/* Top Header Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print bg-white/70 dark:bg-[#0c1427]/70 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 p-6 rounded-3xl shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/certificates')} 
            title="Kembali ke Daftar Sertifikat" 
            className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all rounded-2xl text-slate-600 dark:text-slate-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
               <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
               <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-black uppercase tracking-widest font-mono">Sertifikat Kalibrasi Resmi ISO/IEC 17025</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none uppercase">
              {cert?.certificateNumber || 'Sertifikat Kalibrasi'}
            </h1>
            <p className="text-xs text-slate-400 font-mono mt-1">{cert?.deviceName} • {cert?.fasyankesName || 'RS Mitra'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {cert?.lkId && (
            <Link
              to={`/worksheets/${cert.lkId}/edit`}
              className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200/80 dark:border-slate-700"
            >
              <FileText className="w-4 h-4 text-cyan-500" />
              Buka LK Asli
            </Link>
          )}

          <button 
            onClick={handlePrint}
            className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200/80 dark:border-slate-700"
          >
            <Printer className="w-4 h-4" />
            Cetak (A4)
          </button>

          <button 
            onClick={handleDelete}
            className="px-4 py-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 font-bold text-xs flex items-center gap-2 hover:bg-red-500/20 transition-all border border-red-500/20"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button 
            onClick={handleExportPDF}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-blue-500/25 hover:brightness-110 active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            Ekspor PDF KAN
          </button>
        </div>
      </header>

      {/* Visual Live Certificate Render Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start no-print">
        {/* Left Column: A4 Tactical Previews */}
        <div className="lg:col-span-8 flex flex-col items-center gap-12 py-8 overflow-x-auto bg-slate-200/50 dark:bg-[#070c18] rounded-3xl border border-slate-300/60 dark:border-slate-800 shadow-inner w-full">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Lembar 1: Halaman Sampul & Pengesahan</span>
          </div>
          <div className="scale-[0.42] sm:scale-[0.62] md:scale-[0.85] xl:scale-100 origin-top mb-[-190mm] sm:mb-[-130mm] md:mb-[-40mm] xl:mb-0 min-w-max shadow-2xl rounded-sm">
            <CertificatePage1 cert={cert} lk={lk} qrCodeDataUrl={qrCodeDataUrl} />
          </div>
          
          <div className="text-center space-y-1 pt-8">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">Lembar 2: Rincian Hasil & Analisis Ketidakpastian</span>
          </div>
          <div className="scale-[0.42] sm:scale-[0.62] md:scale-[0.85] xl:scale-100 origin-top min-w-max shadow-2xl rounded-sm">
            <CertificatePage2 cert={cert} lk={lk} calibratorList={calibratorList} measurements={measurements} />
          </div>
        </div>

        {/* Right Column: Key Metrology Diagnostics */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status Verdict Badge */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "p-6 rounded-3xl border backdrop-blur-xl shadow-lg relative overflow-hidden",
              cert?.isPass !== false
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100" 
                : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-100"
            )}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className={cn(
                "w-2.5 h-2.5 rounded-full animate-ping",
                cert?.isPass !== false ? "bg-emerald-500" : "bg-red-500"
              )} />
              <span className="text-[10px] font-mono font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Status Metrologis</span>
            </div>

            <h3 className={cn(
              "text-2xl font-black uppercase tracking-tight",
              cert?.isPass !== false ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )}>
              {cert?.isPass !== false ? "LAIK DIGUNAKAN" : "TIDAK LAIK PAKAI"}
            </h3>
            <p className="text-xs mt-2 text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {cert?.isPass !== false
                ? "Unit alat kesehatan memenuhi batas Maximum Permissible Error (MPE) dan regulasi keselamatan metrologi."
                : "Penyimpangan pengukuran unit melebihi batas toleransi MPE standar. Diperlukan penyesuaian atau reparasi."}
            </p>
          </motion.div>

          {/* QR Code Card */}
          <div className="bg-white dark:bg-[#10192d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center space-y-3">
            <h4 className="text-xs font-mono font-black uppercase tracking-widest text-slate-400">Verifikasi QR Code Publik</h4>
            {qrCodeDataUrl ? (
              <img src={qrCodeDataUrl} alt="QR Code Verifikasi" className="w-36 h-36 rounded-xl border border-slate-200 dark:border-slate-700 p-1 bg-white shadow-sm" />
            ) : (
              <QrCodeIcon className="w-28 h-28 text-slate-300 animate-pulse" />
            )}
            <p className="text-[11px] text-slate-500 font-mono">Pindai dengan kamera untuk membuka lembar validasi keaslian dokumen di cloud.</p>
          </div>

          {/* Instrument Specs */}
          <div className="bg-white dark:bg-[#10192d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h4 className="text-xs font-mono font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-500" />
              Metadata Kalibrasi
            </h4>

            <div className="space-y-2.5 text-xs font-mono divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Nomor Seri</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{cert?.serialNumber || '-'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Merek / Model</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{cert?.brand || '-'} / {cert?.model || '-'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Fasyankes</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 text-right max-w-[180px] truncate">{cert?.fasyankesName || '-'}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Tanggal Terbit</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{formattedAtDate(cert?.issuedAt || lk?.createdAt)}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-400">Kalibrasi Berikutnya</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{cert?.nextCalibrationDate || formattedExpiryDate(cert?.issuedAt || lk?.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Print Only Container */}
      <div className="print-only">
         <CertificatePage1 cert={cert} lk={lk} qrCodeDataUrl={qrCodeDataUrl} />
         <div className="page-break" />
         <CertificatePage2 cert={cert} lk={lk} calibratorList={calibratorList} measurements={measurements} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; width: 210mm; margin: 0 auto; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          @page { size: A4 portrait; margin: 0; }
          .page-break { page-break-after: always; }
        }
        .print-only { display: none; }
      `}} />
    </div>
  );
}

function CertificatePage1({ cert, lk, qrCodeDataUrl }: any) {
  const formattedAtDate = (d: any, plusDays = 0) => {
    if (!d) return '-';
    let dateObj = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    if (plusDays !== 0) {
      dateObj = new Date(dateObj.setDate(dateObj.getDate() + plusDays));
    }
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedExpiryDate = (d: any, plusYears = 1) => {
    if (!d) return '-';
    let dateObj = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    dateObj = new Date(dateObj.setFullYear(dateObj.getFullYear() + plusYears));
    dateObj = new Date(dateObj.setDate(dateObj.getDate() - 1));
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[12mm] font-sans overflow-hidden border border-slate-200 flex flex-col justify-between box-border">
      {/* Outer Border Frame */}
      <div className="absolute inset-0 pointer-events-none p-3 z-20">
        <div className="w-full h-full border-[1.5px] border-blue-900 p-1">
          <div className="w-full h-full border-[0.5px] border-blue-800 p-1">
            <div className="w-full h-full border-[0.3px] border-slate-300" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-full px-6 py-4 justify-between">
        {/* Header Header Brand */}
        <div>
          <div className="flex items-center gap-4 justify-start pb-3 border-b-2 border-blue-800">
            <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-xl border border-blue-100 shrink-0">
              <Award className="w-8 h-8 text-blue-700" />
            </div>
            <div>
              <h1 className="text-xl font-black text-blue-800 uppercase tracking-tight font-sans leading-none">PT. SPEKTRUM KREASI PRATAMA</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Laboratorium Kalibrasi &amp; Pengujian Metrologi Alat Kesehatan</p>
            </div>
          </div>

          {/* Certificate Title Block */}
          <div className="text-center space-y-1 mt-6 mb-6">
            <h2 className="text-2xl font-bold italic underline decoration-slate-900 underline-offset-4 tracking-tight font-serif uppercase">Sertifikat Kalibrasi</h2>
            <p className="text-sm font-bold italic text-slate-500 font-serif uppercase">CALIBRATION CERTIFICATE</p>
            <div className="inline-block bg-slate-50 border border-slate-300 px-4 py-1 rounded-lg mt-2">
              <p className="text-xs font-bold font-mono text-slate-900 tracking-wider">{cert?.certificateNumber || '2026/SKP/04129'}</p>
            </div>
          </div>

          {/* Owner Grid */}
          <div className="space-y-2 mb-6">
            <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200 pb-1">Identitas Pemilik / Owner Identity</h3>
            <div className="space-y-1.5 pt-1 pl-1">
              <InfoRow label="Nama Pemilik" labelEng="Customer" value={lk?.fasyankesName || cert?.fasyankesName} />
              <InfoRow label="Alamat" labelEng="Address" value={lk?.fasyankesAddress || lk?.location || cert?.location} />
              <InfoRow label="Tanggal Terima Unit" labelEng="Unit Received Date" value={formattedAtDate(lk?.createdAt || cert?.issuedAt)} />
              <InfoRow label="Tanggal Kalibrasi" labelEng="Date of Calibration" value={formattedAtDate(lk?.createdAt || cert?.issuedAt)} />
            </div>
          </div>

          {/* Instrument Grid */}
          <div className="space-y-2 mb-4">
            <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200 pb-1">Identitas Instrumen / Instrument Identity</h3>
            <div className="space-y-1.5 pt-1 pl-1">
              <InfoRow label="Nama Alat" labelEng="Instrument Name" value={lk?.deviceName || cert?.deviceName} />
              <InfoRow label="Merek / Pabrikan" labelEng="Manufacture" value={lk?.brand || cert?.brand} />
              <InfoRow label="Tipe / Model" labelEng="Type / Model" value={lk?.model || cert?.model} />
              <InfoRow label="Nomor Seri" labelEng="Serial Number" value={lk?.serialNumber || cert?.serialNumber} />
              <InfoRow label="Lokasi Kalibrasi" labelEng="Place of Calibration" value={lk?.location || cert?.location || 'In-Situ'} />
              <InfoRow label="Tanggal Terbit" labelEng="Date of Issued" value={formattedAtDate(lk?.createdAt || cert?.issuedAt, 1)} />
              <InfoRow label="Masa Berlaku" labelEng="Calibration Expired" value={cert?.nextCalibrationDate || formattedExpiryDate(lk?.createdAt || cert?.issuedAt)} />
            </div>
          </div>
        </div>

        {/* Bottom Signatures & QR Code */}
        <div>
          <div className="flex justify-between items-end pb-4 border-t border-slate-200 pt-4">
            {/* QR Code Validation */}
            <div className="flex items-center gap-3">
              {qrCodeDataUrl && (
                <img src={qrCodeDataUrl} alt="QR Verifikasi" className="w-20 h-20 border border-slate-300 p-0.5 bg-white rounded-md" />
              )}
              <div className="text-left space-y-0.5">
                <p className="text-[9px] font-bold uppercase text-slate-800 font-mono">Verifikasi Keaslian</p>
                <p className="text-[7.5px] text-slate-500 max-w-[140px] leading-tight">Pindai QR untuk memvalidasi dokumen secara digital di portal Spektrum.</p>
              </div>
            </div>

            {/* Manager Signature & Seal */}
            <div className="text-center min-w-[220px]">
              <p className="font-bold text-[11px] uppercase tracking-wide text-slate-900 font-sans mb-1">PT. SPEKTRUM KREASI PRATAMA</p>
              
              <div className="h-16 flex items-center justify-center relative my-1">
                <div className="w-24 h-12 border border-blue-600 rounded-full flex items-center justify-center opacity-85 rotate-[-6deg] text-blue-700 font-bold text-[8px] uppercase tracking-tighter shadow-sm">
                  ★ TERVERIFIKASI ★
                </div>
              </div>

              <p className="font-bold text-xs text-slate-900 border-b border-slate-800 pb-0.5 inline-block px-4">Faustina Dao S.Tr.Tem</p>
              <p className="font-bold text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Manager Teknis</p>
            </div>
          </div>

          <footer className="text-center space-y-1 pt-2 border-t border-slate-200">
             <p className="text-[9px] font-bold text-slate-400 font-mono">Halaman 1 dari 2</p>
             <p className="text-[8px] font-bold text-slate-600 font-sans">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
             <p className="text-[7px] italic text-slate-500 leading-tight">Hasil hanya berhubungan dengan instrumen yang diuji. Dokumen ini sah dan dilindungi secara hukum.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

function CertificatePage2({ cert, lk, calibratorList, measurements }: any) {
  const formattedDate = (d: any) => d?.toDate ? d.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : (typeof d === 'string' ? d : '-');

  const temperature = lk?.environmentalData?.temperature || lk?.tempInitial || cert?.environmentalData?.temperature || '25.0';
  const humidity = lk?.environmentalData?.humidity || lk?.humInitial || cert?.environmentalData?.humidity || '55.0';
  const tempUnc = lk?.environmentalData?.tempUncertainty || '0.4';
  const humUnc = lk?.environmentalData?.humUncertainty || '4.0';

  const activeCals = (calibratorList || []).filter((c: any) => (lk?.calibratorIds || cert?.calibratorIds || []).includes(c.id));

  return (
    <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[12mm] font-sans flex flex-col justify-between border border-slate-200 overflow-hidden box-border">
      {/* Outer Frame */}
      <div className="absolute inset-0 pointer-events-none p-3 z-20">
        <div className="w-full h-full border-[1.5px] border-blue-900 p-1">
          <div className="w-full h-full border-[0.5px] border-blue-800 p-1">
            <div className="w-full h-full border-[0.3px] border-slate-300" />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-full px-6 py-4 justify-between">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center border-b-2 border-blue-900 pb-3 mb-4 w-full">
            <div className="flex items-center gap-3">
              <Award className="w-7 h-7 text-blue-700" />
              <h1 className="text-sm font-black text-blue-800 tracking-tight uppercase font-sans">PT. SPEKTRUM KREASI PRATAMA</h1>
            </div>
            
            <div className="border border-slate-800 text-center px-3 py-1 bg-slate-50 rounded-md">
              <p className="text-[7.5px] font-bold uppercase text-slate-600">No. Sertifikat</p>
              <p className="text-[10px] font-bold text-slate-900 font-mono">{cert?.certificateNumber || '2026/SKP/04129'}</p>
            </div>
          </div>

          {/* Title */}
          <h2 className="text-center text-sm font-bold underline decoration-slate-900 underline-offset-4 uppercase tracking-tight mb-4">
            LAPORAN HASIL KALIBRASI — {(lk?.deviceName || cert?.deviceName || 'ALAT KESEHATAN').toUpperCase()}
          </h2>

          {/* Summary Grid */}
          <div className="grid grid-cols-2 gap-4 px-2 text-[10px] mb-4 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
            <div className="space-y-1">
              <p><strong className="text-slate-600">Instansi:</strong> {lk?.fasyankesName || cert?.fasyankesName || '-'}</p>
              <p><strong className="text-slate-600">Merek / Model:</strong> {lk?.brand || '-'} / {lk?.model || '-'}</p>
              <p><strong className="text-slate-600">Nomor Seri:</strong> {lk?.serialNumber || cert?.serialNumber || '-'}</p>
            </div>
            <div className="space-y-1">
              <p><strong className="text-slate-600">Metode Acuan:</strong> {translateToIndonesian(lk?.methodName || 'Standar Metrologi Medis')}</p>
              <p><strong className="text-slate-600">Lokasi Kalibrasi:</strong> {lk?.location || cert?.location || 'In-Situ'}</p>
              <p><strong className="text-slate-600">Tanggal Kalibrasi:</strong> {formattedDate(lk?.createdAt || cert?.issuedAt)}</p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3 px-1">
            {/* Section I */}
            <div>
              <h3 className="font-bold text-[10px] text-blue-900 uppercase">I. Kondisi Lingkungan</h3>
              <div className="text-[9.5px] text-slate-800 flex gap-8 pl-3 mt-0.5 font-medium">
                <span>1. Suhu Ruang : ( {temperature} ± {tempUnc} ) °C</span>
                <span>2. Kelembaban : ( {humidity} ± {humUnc} ) %RH</span>
              </div>
            </div>

            {/* Section II */}
            <div>
              <h3 className="font-bold text-[10px] text-blue-900 uppercase">II. Standar Kalibrator</h3>
              <div className="text-[9px] text-slate-800 pl-3 mt-0.5 space-y-0.5">
                {activeCals.length > 0 ? (
                  activeCals.map((cal: any, idx: number) => (
                    <p key={idx}>
                      {idx + 1}. {cal.name || cal.deviceName} (SN: {cal.serialNumber || '-'}) | Tertelusur: {cal.traceability || 'Puslit KIM-LIPI / KAN'}
                    </p>
                  ))
                ) : (
                  <p>1. Standar Kalibrator Tersertifikasi KAN LK-291-IDN (Tertelusur Satuan SI)</p>
                )}
              </div>
            </div>

            {/* Section III: Table */}
            <div>
              <h3 className="font-bold text-[10px] text-blue-900 uppercase mb-1">III. Hasil Pengukuran Metrologis</h3>
              
              <table className="w-full border-collapse border border-slate-900 text-[9px] text-center">
                <thead className="bg-slate-100 font-bold text-slate-900">
                  <tr>
                    <th className="border border-slate-900 px-2 py-1.5">Parameter Uji</th>
                    <th className="border border-slate-900 px-2 py-1.5">Nilai Setting</th>
                    <th className="border border-slate-900 px-2 py-1.5">Nilai Terukur</th>
                    <th className="border border-slate-900 px-2 py-1.5">Deviasi</th>
                    <th className="border border-slate-900 px-2 py-1.5">U95 (k=2)</th>
                    <th className="border border-slate-900 px-2 py-1.5">Toleransi MPE</th>
                    <th className="border border-slate-900 px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="text-slate-900">
                  {(measurements || []).map((m: any, idx: number) => {
                    const isPass = m.status === 'Lolos';
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="border border-slate-900 py-1 px-2 text-left font-medium">{m.parameterName}</td>
                        <td className="border border-slate-900 py-1 font-mono">{m.point} {m.unit || ''}</td>
                        <td className="border border-slate-900 py-1 font-mono">{m.actual}</td>
                        <td className="border border-slate-900 py-1 font-mono">{m.deviation}</td>
                        <td className="border border-slate-900 py-1 font-mono text-blue-700 font-bold">±{m.uncertainty}</td>
                        <td className="border border-slate-900 py-1 font-mono">±{m.tolerance}</td>
                        <td className={cn("border border-slate-900 py-1 font-bold", isPass ? "text-emerald-700" : "text-red-600")}>
                          {isPass ? "LOLOS" : "FAIL"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            <div className="pt-2">
              <h3 className="font-bold text-[9.5px] text-slate-900 uppercase">Catatan :</h3>
              <ul className="list-disc pl-5 text-[8.5px] text-slate-700 space-y-0.5 leading-relaxed">
                <li>Kalibrasi yang dilaporkan tertelusur ke satuan pengukuran SI melalui SNSU-BSN / Puslit KIM-LIPI.</li>
                <li>Ketidakpastian pengukuran dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k = 2.</li>
                <li className="list-none pt-1">
                  <div className={cn(
                    "p-2 rounded border font-bold text-[9.5px] text-center",
                    (lk?.isPass !== false && cert?.isPass !== false)
                      ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                      : "bg-red-50 border-red-600 text-red-800"
                  )}>
                    KESIMPULAN: ALAT DINYATAKAN {(lk?.isPass !== false && cert?.isPass !== false) ? "MEMENUHI PERSYARATAN MPE (LAIK OPERASI)" : "TIDAK LAIK OPERASI"}
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Page 2 Footer */}
        <footer className="pt-3 border-t border-slate-200">
          <p className="text-right text-[8.5px] font-bold text-slate-400 mb-1 italic">Halaman 2 dari 2</p>
          <div className="border border-slate-300 p-2 text-center text-[8px] text-slate-600 space-y-0.5 bg-slate-50/50">
            <p className="font-bold text-slate-800 uppercase">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
            <p className="italic leading-tight">Hasil hanya berhubungan dengan instrumen yang dikalibrasi dan sertifikat ini tidak boleh digandakan sebagian tanpa izin tertulis PT. Spektrum Kreasi Pratama.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

function InfoRow({ label, labelEng, value }: { label: string, labelEng: string, value: any }) {
  return (
    <div className="grid grid-cols-[180px_12px_1fr] items-start text-xs leading-tight">
      <div className="flex flex-col">
        <span className="font-bold text-slate-900">{label}</span>
        <span className="text-[9.5px] italic text-slate-500 font-serif leading-none mt-0.5">{labelEng}</span>
      </div>
      <span className="font-bold text-slate-900">:</span>
      <span className="font-bold text-slate-950 font-sans tracking-tight">{value || '-'}</span>
    </div>
  );
}
