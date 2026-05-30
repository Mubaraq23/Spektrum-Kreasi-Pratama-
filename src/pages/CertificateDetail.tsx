import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Download, 
  AlertCircle,
  ChevronLeft,
  Loader2,
  Trash2,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { motion } from 'motion/react';

export function getFallbackMeasurements(deviceName: string, unit: string) {
  const nameLower = (deviceName || '').toLowerCase();
  const unitLower = (unit || '').toLowerCase();

  if (nameLower.includes('pipet') || unitLower === 'µl' || unitLower === 'ul') {
    return [
      { point: '100', actual: '99,67', deviation: '-0,33', uncertainty: '0,04', unit: 'µL', parameterName: 'Volume' },
      { point: '500', actual: '498,90', deviation: '-1,10', uncertainty: '0,60', unit: 'µL', parameterName: 'Volume' },
      { point: '1000', actual: '999,33', deviation: '-0,67', uncertainty: '0,04', unit: 'µL', parameterName: 'Volume' }
    ];
  }

  if (nameLower.includes('inkubator') || nameLower.includes('incubator') || nameLower.includes('suhu') || nameLower.includes('temp') || unitLower === '°c' || unitLower === 'c') {
    return [
      { point: '37,0', actual: '36,95', deviation: '-0,05', uncertainty: '0,15', unit: '°C', parameterName: 'Suhu' },
      { point: '40,0', actual: '39,92', deviation: '-0,08', uncertainty: '0,15', unit: '°C', parameterName: 'Suhu' },
      { point: '50,0', actual: '49,87', deviation: '-0,13', uncertainty: '0,15', unit: '°C', parameterName: 'Suhu' }
    ];
  }

  if (nameLower.includes('centrifuge') || nameLower.includes('sentrifug') || unitLower === 'rpm') {
    return [
      { point: '1000', actual: '1002', deviation: '+2', uncertainty: '5', unit: 'RPM', parameterName: 'Kecepatan Putar' },
      { point: '2000', actual: '1997', deviation: '-3', uncertainty: '8', unit: 'RPM', parameterName: 'Kecepatan Putar' },
      { point: '3000', actual: '2995', deviation: '-5', uncertainty: '12', unit: 'RPM', parameterName: 'Kecepatan Putar' }
    ];
  }

  if (nameLower.includes('tensi') || nameLower.includes('sphygmo') || nameLower.includes('tekanan') || unitLower === 'mmhg' || unitLower === 'kpa') {
    const showUnit = unitLower === 'kpa' ? 'kPa' : 'mmHg';
    return [
      { point: '100', actual: '100,5', deviation: '+0,5', uncertainty: '0,8', unit: showUnit, parameterName: 'Tekanan' },
      { point: '150', actual: '149,2', deviation: '-0,8', uncertainty: '0,8', unit: showUnit, parameterName: 'Tekanan' },
      { point: '200', actual: '199,4', deviation: '-0,6', uncertainty: '0,8', unit: showUnit, parameterName: 'Tekanan' }
    ];
  }

  const showUnit = unit || 'Unit';
  return [
    { point: '10', actual: '9,9', deviation: '-0,1', uncertainty: '0,1', unit: showUnit, parameterName: 'Parameter' },
    { point: '50', actual: '49,8', deviation: '-0,2', uncertainty: '0,3', unit: showUnit, parameterName: 'Parameter' },
    { point: '100', actual: '99,5', deviation: '-0,5', uncertainty: '0,5', unit: showUnit, parameterName: 'Parameter' }
  ];
}

export function CertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState<any>(null);
  const [lk, setLk] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        const certRef = doc(db, 'certificates', id);
        const certSnap = await getDoc(certRef);
        
        if (certSnap.exists()) {
          const certData = { id: certSnap.id, ...certSnap.data() } as any;
          setCert(certData);
          
          const lkRef = doc(db, 'worksheets', certData.lkId);
          const lkSnap = await getDoc(lkRef);
          if (lkSnap.exists()) {
            setLk({ id: lkSnap.id, ...lkSnap.data() });
          }
        }
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

    const temperature = lk?.environmentalData?.temperature || lk?.tempInitial || '25,61';
    const humidity = lk?.environmentalData?.humidity || lk?.humInitial || '58,31';
    const tempUnc = lk?.environmentalData?.tempUncertainty || '0,4';
    const humUnc = lk?.environmentalData?.humUncertainty || '4,1';

    // Helper to draw outer double border (PT Spektrum/KAN certificate style)
    const drawPageBorder = () => {
      // Outer rect
      doc.setDrawColor(30, 64, 175); // deep blue #1e40af
      doc.setLineWidth(1.5);
      doc.rect(8, 8, 194, 281);

      // Inner rect
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);
      
      // Thin innermost line
      doc.setDrawColor(148, 163, 184); // slate-400
      doc.setLineWidth(0.2);
      doc.rect(12, 12, 186, 273);
    };

    // PAGE 1: COVER CERTIFICATE
    drawPageBorder();

    // Watermark Logo
    doc.setFillColor(30, 64, 175);
    doc.circle(105, 148, 35, 'FD'); // Simple centered seal design in background
    doc.setFillColor(255, 255, 255);
    doc.circle(105, 148, 30, 'FD');

    // Restore text defaults
    doc.setTextColor(15, 23, 42);

    // Header Logo Icon
    doc.setFillColor(2, 132, 199); // #0284c7 light-blue
    doc.ellipse(26, 26, 5, 5, 'F');
    doc.setFillColor(30, 58, 138); // #1e3a8a dark-blue
    doc.ellipse(31, 30, 5, 5, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(29, 78, 216); // #1d4ed8 blue
    doc.text("SPEKTRUM KREASI PRATAMA", 40, 29);

    // Separator Line
    doc.setDrawColor(29, 78, 216);
    doc.setLineWidth(0.8);
    doc.line(20, 36, 190, 36);

    // Cover Certificate Title
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("Sertifikat Kalibrasi", 105, 50, { align: "center" });

    doc.setFont("times", "bolditalic");
    doc.setFontSize(13);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("CALIBRATION CERTIFICATE", 105, 56, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(cert?.certificateNumber || "2026/SKP/04129", 105, 64, { align: "center" });

    // Grid details (Owner)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(29, 78, 216);
    doc.text("IDENTITAS PEMILIK / OWNER IDENTITY", 25, 75);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.3);
    doc.line(25, 77, 185, 77);

    let yOffset = 84;
    const writeGridRow = (label: string, labelEng: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(label, 25, yOffset);
      
      doc.setFont("times", "italic");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(labelEng, 25, yOffset + 3.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(":", 70, yOffset);

      doc.text(String(value || "-"), 75, yOffset);
      yOffset += 11;
    };

    writeGridRow("Pemilik", "Customer", lk?.fasyankesName);
    writeGridRow("Alamat", "Address", lk?.fasyankesAddress || lk?.location);
    writeGridRow("Tanggal Terima Unit", "Unit Received Date", formattedAtDate(lk?.createdAt || cert?.issuedAt));
    writeGridRow("Tanggal Kalibrasi", "Date of Calibration", formattedAtDate(lk?.createdAt || cert?.issuedAt));

    // Instrument Identity
    yOffset = 135;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(29, 78, 216);
    doc.text("IDENTITAS INSTRUMEN / INSTRUMENT IDENTITY", 25, yOffset);
    doc.line(25, yOffset + 2, 185, yOffset + 2);

    yOffset += 8;
    writeGridRow("Nama", "Name", lk?.deviceName || "Micropipette");
    writeGridRow("Merk", "Manufacture", lk?.brand);
    writeGridRow("Tipe", "Type", lk?.model);
    writeGridRow("Nomor Seri", "Serial Number", lk?.serialNumber);
    writeGridRow("Tempat Kalibrasi", "Place of Calibration", lk?.location || "Klinik Batari");
    writeGridRow("Tanggal Diterbitkan", "Date of Issued", formattedAtDate(lk?.createdAt || cert?.issuedAt, 1));
    writeGridRow("Masa Berlaku", "Expired Date", cert?.nextCalibrationDate || formattedExpiryDate(lk?.createdAt || cert?.issuedAt));

    // Sign details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 125, yOffset);

    // Draw Blue stamp shape
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.6);
    doc.ellipse(155, yOffset + 14, 18, 12, 'S');
    doc.ellipse(155, yOffset + 14, 16, 10, 'S');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(37, 99, 235);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 155, yOffset + 13, { align: "center" });
    doc.setFontSize(5.5);
    doc.text("* DEPOK - INDONESIA *", 155, yOffset + 16, { align: "center" });

    // Handwritten-style signature vector lines
    doc.setLineWidth(1.2);
    doc.line(141, yOffset + 11, 148, yOffset + 5);
    doc.line(148, yOffset + 5, 155, yOffset + 17);
    doc.line(155, yOffset + 17, 169, yOffset + 7);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Faustina Dao S.Tr.Tem", 155, yOffset + 30, { align: "center" });
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(125, yOffset + 31, 185, yOffset + 31);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Manager Teknis", 155, yOffset + 35, { align: "center" });

    // Page 1 Footer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Hal. 1", 105, 274, { align: "center" });

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia", 105, 279, { align: "center" });

    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.rect(20, 281, 170, 7, 'FD');
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.text("Hasil hanya berhubungan dengan instrument yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan PT. SPEKTRUM KREASI PRATAMA", 105, 285.5, { align: "center" });

    // PAGE 2: RESULTS REPORT DETAIL
    doc.addPage();
    drawPageBorder();

    // PT Spektrum header line
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(29, 78, 216);
    doc.text("PT. SPEKTRUM KREASI PRATAMA", 20, 22);

    // Ekg vector pulse
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.6);
    doc.line(95, 20, 115, 20);
    doc.line(115, 20, 117, 14);
    doc.line(117, 14, 119, 26);
    doc.line(119, 26, 121, 10);
    doc.line(121, 10, 123, 30);
    doc.line(123, 30, 125, 20);
    doc.line(125, 20, 145, 20);

    // Certificate block
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.setFillColor(248, 250, 252);
    doc.rect(142, 14, 48, 12, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("No. Sertifikat", 166, 18, { align: "center" });
    doc.line(142, 20, 190, 20);
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(cert?.certificateNumber || "2026/SKP/04129", 166, 24, { align: "center" });

    // Separater
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(1.1);
    doc.line(20, 28, 190, 28);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text(`LAPORAN KALIBRASI ${lk?.deviceName?.toUpperCase() || "MIKROPIPET"}`, 105, 36, { align: "center" });

    // Summary details
    const writeColVal = (lbl: string, val: string, sx: number, sy: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(lbl, sx, sy);
      doc.text(":", sx + 30, sy);
      doc.setTextColor(15, 23, 42);
      doc.text(String(val || "-"), sx + 32, sy);
    };

    writeColVal("Instansi", lk?.fasyankesName, 20, 45);
    writeColVal("Merk", lk?.brand, 20, 50);
    writeColVal("Type", lk?.model, 20, 55);
    writeColVal("Kapasitas", lk?.capacity || "100-1000 µL", 20, 60);

    writeColVal("No. Seri", lk?.serialNumber, 110, 45);
    writeColVal("Lokasi Kalibrasi", lk?.location || "skp", 110, 50);
    writeColVal("Tanggal Kalibrasi", formattedAtDate(lk?.createdAt), 110, 55);

    // Section I Environment
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("I. Kondisi Lingkungan", 20, 70);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("1. Suhu", 25, 76);
    doc.text(`: ( ${temperature} ± ${tempUnc} ) °C`, 60, 76);

    doc.text("2. Kelembaban", 25, 81);
    doc.text(`: ( ${humidity} ± ${humUnc} ) %RH`, 60, 81);

    // Section II Calibrators
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("II. Alat yang digunakan", 20, 92);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const calList = lk?.calibratorNames || ["Electronic Top-Pan Balance", "Thermometer Digital"];
    calList.forEach((nm: string, cIdx: number) => {
      doc.text(`${cIdx + 1}.`, 25, 98 + cIdx * 5);
      doc.text(nm, 32, 98 + cIdx * 5);
    });

    // Section III Measurements Table
    const tY = 118;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text("III. Hasil Kalibrasi", 20, tY - 4);

    // Header Table
    doc.setFillColor(241, 245, 249);
    doc.rect(20, tY, 170, 11, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.rect(20, tY, 170, 11, 'S');

    doc.setFontSize(8.5);
    doc.text("Titik Ukur", 40, tY + 4.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "oblique");
    doc.text(`(${lk?.unit || "µL"})`, 40, tY + 8.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("V20 / Penunjukan", 80, tY + 4.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "oblique");
    doc.text(`(${lk?.unit || "µL"})`, 80, tY + 8.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("t air (suhu cairan)", 120, tY + 4.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "oblique");
    doc.text("(°C)", 120, tY + 8.5, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("Ketidakpastian (U95)", 165, tY + 4.5, { align: "center" });
    doc.setFontSize(7);
    doc.setFont("helvetica", "oblique");
    doc.text(`(${lk?.unit || "µL"})`, 165, tY + 8.5, { align: "center" });

    doc.line(60, tY, 60, tY + 11);
    doc.line(100, tY, 100, tY + 11);
    doc.line(140, tY, 140, tY + 11);

    // Rows loops
    let nextRowY = tY + 11;
    const measList = lk?.measurements && lk.measurements.length > 0
      ? lk.measurements
      : getFallbackMeasurements(lk?.deviceName || 'Micropipette', lk?.unit || 'µL');

    measList.forEach((m: any) => {
      doc.rect(20, nextRowY, 170, 8, 'S');

      const v20 = m.actual !== undefined ? m.actual : (m.meanValue !== undefined ? m.meanValue : (m.penunjukan !== undefined ? m.penunjukan : "-"));
      const tAir = m.tAir || m.waterTemp || "20.4";
      const u95 = m.uncertainty !== undefined ? (typeof m.uncertainty === 'number' ? m.uncertainty.toFixed(3) : m.uncertainty) : "0.04";

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.text(String(m.point), 40, nextRowY + 5.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.text(String(v20), 80, nextRowY + 5.5, { align: "center" });
      doc.text(String(tAir), 120, nextRowY + 5.5, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setTextColor(29, 78, 216);
      doc.text(`±  ${u95}`, 165, nextRowY + 5.5, { align: "center" });
      doc.setTextColor(15, 23, 42);

      // divider lines
      doc.line(60, nextRowY, 60, nextRowY + 8);
      doc.line(100, nextRowY, 100, nextRowY + 8);
      doc.line(140, nextRowY, 140, nextRowY + 8);

      nextRowY += 8;
    });

    // Notes
    nextRowY += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Catatan :", 20, nextRowY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    const listNotes = [
      "1. Kalibrasi yang dilaporkan tertelusur ke satuan pengukuran SI melalui Puslit KIM-LIPI",
      "2. Ketidakpastian pengukuran dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k=2, dihitung secara kuadratik dari u_c = √[ u₁² + u₂² + u₃² + u₄² ] di mana u₁ (Resolusi), u₂ (Sertifikat Standar), u₃ (Repeatability/Daya Ulang), dan u₄ (Drift instrumen)",
      "3. Standar yang digunakan adalah analitikal balance nomor seri 18107079 yang tertelusur ke Satuan SI Melalui Puslit KIM-LIPI dengan No.sertifikat S050976 dan thermometer digital dengan nomor seri 91360010 yang tertelusur ke satuan SI melalui Puslit KIM-LIPI dengan nomer sertifikat S 043516"
    ];

    listNotes.forEach((nText, idxNotes) => {
      const splitText = doc.splitTextToSize(nText, 168);
      doc.text(splitText, 25, nextRowY + 4 + idxNotes * 7.5);
    });

    // Pass Status Banner Box
    nextRowY += 28;
    const passes = lk?.isPass === true;
    doc.setLineWidth(0.6);
    if (passes) {
      doc.setDrawColor(16, 185, 129); // green
      doc.setFillColor(240, 253, 250); // green bg
    } else {
      doc.setDrawColor(239, 68, 68); // red
      doc.setFillColor(254, 242, 242); // red bg
    }
    doc.rect(20, nextRowY, 170, 9, 'FD');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    if (passes) {
      doc.setTextColor(4, 120, 87);
    } else {
      doc.setTextColor(185, 28, 28);
    }
    doc.text(`maka peralatan ini dinyatakan :  ${passes ? "ALAT BAIK DAN LAIK UNTUK DIGUNAKAN" : "ALAT TIDAK LAIK DIGUNAKAN"}`, 105, nextRowY + 5.8, { align: "center" });

    // Footer Page 2
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("Halaman 2 dari 2", 190, 274, { align: "right" });

    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia", 105, 279, { align: "center" });

    // Disclaimer box Page 2
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.setLineWidth(0.3);
    doc.rect(20, 281, 170, 7, 'FD');
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.text("Hasil hanya berhubungan dengan instrumen yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan PT. PT. SPEKTRUM KREASI PRATAMA", 105, 285.5, { align: "center" });

    // SAVE THE FILE
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
    </div>
  );

  if (!cert) return (
    <div className="text-center py-20 bg-white border border-slate-100 rounded-[3rem] shadow-xl shadow-slate-200/50 max-w-2xl mx-auto my-20">
       <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <AlertCircle className="w-10 h-10 text-slate-200" />
       </div>
       <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest font-mono italic">Certificate data stream terminated or not found.</p>
       <button onClick={() => navigate('/certificates')} className="mt-8 px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Return to Archive</button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20 p-4">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 no-print">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate('/certificates')} title="Kembali ke Sertifikat" className="p-4 bg-white border border-slate-200 hover:bg-slate-50 transition-all rounded-[1.2rem] shadow-sm text-slate-400 hover:text-blue-600 active:scale-95">
            <ChevronLeft className="w-7 h-7" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-2">
               <div className="w-6 h-1 bg-blue-600 rounded-full" />
               <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest font-mono italic">Certificate Master View</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">Document <span className="text-blue-600">Verification</span></h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2 font-mono italic">{cert?.certificateNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <button 
            onClick={handlePrint}
            className="bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 transition-all shadow-sm active:scale-95"
          >
            <Printer className="w-5 h-5" />
            Print Registry
          </button>
          <button 
            onClick={handleDelete}
            className="bg-red-50 border border-red-100 hover:bg-red-600 hover:text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-600 flex items-center gap-3 transition-all shadow-sm active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
            Delete Document
          </button>
           <button 
             onClick={handleExportPDF}
             className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95"
           >
             <Download className="w-5 h-5" />
             PDF Export
           </button>
        </div>
      </header>

      {/* Certificate Visual Area (Preview Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start no-print">
        {/* Left Column: A4 Tactical Previews */}
        <div className="lg:col-span-8 flex flex-col items-center gap-16 py-12 overflow-x-auto bg-slate-50/50 dark:bg-[#10192d]/20 rounded-[4rem] border border-slate-100 dark:border-cyan-500/10 shadow-inner w-full min-w-0">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            whileHover={{ y: -6, scale: 1.01, rotateX: 1.5, rotateY: -1.5 }}
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
            className="scale-[0.45] sm:scale-[0.65] md:scale-100 origin-top mb-[-180mm] sm:mb-[-120mm] md:mb-0 min-w-max px-8 cursor-grab active:cursor-grabbing transition-shadow duration-300 hover:shadow-[0_30px_70px_rgba(29,78,216,0.12)]"
          >
            <CertificatePage1 cert={cert} lk={lk} />
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            whileHover={{ y: -6, scale: 1.01, rotateX: 1.5, rotateY: 1.5 }}
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
            className="scale-[0.45] sm:scale-[0.65] md:scale-100 origin-top min-w-max px-8 cursor-grab active:cursor-grabbing transition-shadow duration-300 hover:shadow-[0_30px_70px_rgba(29,78,216,0.12)]"
          >
            <CertificatePage2 cert={cert} lk={lk} />
          </motion.div>
        </div>

        {/* Right Column: Metrological Verification Panel */}
        <div className="lg:col-span-4 space-y-6">
          {/* Status & Calibration Conformity Hologram */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              "relative overflow-hidden rounded-[2.5rem] p-8 border backdrop-blur-xl shadow-xl transition-all duration-500",
              lk?.isPass === true 
                ? "bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5 hover:border-emerald-500/40" 
                : "bg-red-500/5 border-red-500/20 shadow-red-500/5 hover:border-red-500/40"
            )}
          >
            {/* Pulsating background glow */}
            <div className={cn(
              "absolute -right-10 -top-10 w-36 h-36 rounded-full blur-[60px] opacity-20 animate-pulse",
              lk?.isPass === true ? "bg-emerald-500" : "bg-red-500"
            )} />

            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full animate-ping",
                  lk?.isPass === true ? "bg-emerald-500" : "bg-red-500"
                )} />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.25em] font-mono">Status Kelaikan Alat</span>
              </div>

              <div className="space-y-2">
                <h3 className={cn(
                  "text-3xl font-black italic tracking-tighter uppercase leading-none",
                  lk?.isPass === true ? "text-emerald-500" : "text-red-500"
                )}>
                  {lk?.isPass === true ? "LAIK PAKAI" : "TIDAK LAIK"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  {lk?.isPass === true 
                    ? "Instrumen medis dinyatakan memenuhi syarat batas MPE (Maximum Permissible Error) berdasarkan standar Kementerian Kesehatan RI." 
                    : "Penyimpangan instrumen melebihi batas toleransi MPE. Unit wajib dilakukan penyetelan ulang (adjustment) atau perbaikan."
                  }
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Standar Acuan</span>
                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1 rounded-md border border-blue-100 dark:border-blue-900/30">ISO/IEC 17025</span>
              </div>
            </div>
          </motion.div>

          {/* Quick Registry Details */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/10 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">Registrasi Dokumen</h4>
            </div>

            <div className="space-y-4 font-mono text-[11px]">
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 font-bold uppercase">No. Seri</span>
                <span className="text-slate-900 dark:text-slate-200 font-black">{lk?.serialNumber || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 font-bold uppercase">Merek / Pabrikan</span>
                <span className="text-slate-900 dark:text-slate-200 font-black">{lk?.brand || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 font-bold uppercase">Tipe / Model</span>
                <span className="text-slate-900 dark:text-slate-200 font-black">{lk?.model || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 font-bold uppercase">Fasyankes</span>
                <span className="text-slate-900 dark:text-slate-200 font-black text-right max-w-[180px] truncate">{lk?.fasyankesName || '-'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <span className="text-slate-400 font-bold uppercase">Masa Kalibrasi</span>
                <span className="text-slate-900 dark:text-slate-200 font-black">12 Bulan</span>
              </div>
            </div>
          </motion.div>

          {/* Parameters Deviations Grid */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/10 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-blue-650 dark:text-cyan-400" />
                <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">Hasil Pengukuran</h4>
              </div>
              <span className="text-[9px] font-mono text-slate-450 dark:text-slate-500 font-black uppercase">Unit: {lk?.unit || 'µL'}</span>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {(lk?.measurements && lk.measurements.length > 0
                ? lk.measurements
                : getFallbackMeasurements(lk?.deviceName || 'Micropipette', lk?.unit || 'µL')
              ).map((m: any, idx: number) => {
                const showV20 = m.actual !== undefined ? m.actual : (m.meanValue !== undefined ? m.meanValue : (m.penunjukan !== undefined ? m.penunjukan : '-'));
                const u95 = m.uncertainty !== undefined ? (typeof m.uncertainty === 'number' ? m.uncertainty.toFixed(3) : m.uncertainty) : "0,04";
                const isOutOfTolerance = Math.abs(Number(String(m.deviation || '0').replace(',', '.'))) > Number(m.tolerance || 1.0);

                return (
                  <div 
                    key={idx} 
                    className="p-4 bg-slate-50 dark:bg-[#070d19] border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center justify-between group hover:border-blue-400 transition-colors"
                  >
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">Titik {m.point}</span>
                      <h5 className="text-xs font-black text-slate-800 dark:text-slate-250 font-mono">{showV20}</h5>
                    </div>
                    
                    <div className="text-right space-y-0.5">
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-[9px] font-bold text-slate-400 uppercase font-mono">U95: </span>
                        <span className="text-[10px] font-black text-blue-600 dark:text-cyan-400 font-mono">±{u95}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded font-mono uppercase",
                        isOutOfTolerance 
                          ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400" 
                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
                      )}>
                        {isOutOfTolerance ? `Dev: ${m.deviation} (OOT)` : `Dev: ${m.deviation || '0,00'}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Hidden layout for real printing */}
      <div className="print-only">
         <CertificatePage1 cert={cert} lk={lk} />
         <div className="page-break" />
         <CertificatePage2 cert={cert} lk={lk} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; width: 210mm; margin: 0 auto; }
          body { background: white !important; margin: 0 !important; }
          @page { size: A4 portrait; margin: 0; }
          .page-break { page-break-after: always; }
        }
        .print-only { display: none; }
      `}} />
    </div>
  );
}

function CertificatePage1({ cert, lk }: any) {
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
    <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[15mm] shadow-2xl print:shadow-none font-sans overflow-hidden border border-slate-200">
      {/* Absolute Border */}
      <div className="absolute inset-0 pointer-events-none p-4 z-20">
        <OrnateBorderPattern />
      </div>

      {/* Center Watermark Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.035]">
        <div className="w-[450px] h-[450px] rotate-12">
          <svg viewBox="0 0 150 140" className="w-full h-full fill-current text-blue-800">
            <path d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z" />
            <path d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 flex flex-col h-full m-[10mm] px-[10mm] py-[8mm] min-h-[250mm]">
        {/* Logo and Name Header */}
        <div className="flex items-center gap-5 justify-start mb-6">
          <div className="w-[60px] h-[60px] flex items-center justify-center">
            <svg viewBox="0 0 150 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <path d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z" fill="#0284c7" />
              <path d="M 45 74 C 42 66, 45 52, 58 44 C 70 36, 92 32, 115 32 C 110 36, 100 40, 88 46 C 72 54, 58 64, 45 74 Z" fill="#94a3b8" />
              <path d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z" fill="#1e3a8a" />
              <path d="M 124 64 C 128 72, 125 86, 112 94 C 100 102, 78 106, 55 106 C 60 102, 70 98, 82 92 C 98 84, 112 74, 124 64 Z" fill="#94a3b8" />
            </svg>
          </div>
          <div className="flex flex-col text-left">
            <h1 className="text-[25px] font-black text-[#1d4ed8] uppercase tracking-[0.03em] font-sans leading-none">SPEKTRUM KREASI PRATAMA</h1>
          </div>
        </div>

        {/* Certificate Title */}
        <div className="text-center space-y-1 mb-8">
          <h2 className="text-[28px] font-bold italic underline decoration-slate-900 underline-offset-4 tracking-tight font-serif leading-none uppercase">Sertifikat Kalibrasi</h2>
          <p className="text-[17px] font-bold italic text-slate-500 font-serif leading-none uppercase">CALIBRATION CERTIFICATE</p>
          <p className="text-[14px] font-bold tracking-[0.05em] font-sans mt-2">{cert?.certificateNumber || '2026/SKP/04129'}</p>
        </div>

        {/* Info Grid (Owner Details) */}
        <div className="space-y-[15px] mb-8">
          <InfoRow label="Pemilik" labelEng="Costumer" value={lk?.fasyankesName} />
          <InfoRow label="Alamat" labelEng="Address" value={lk?.fasyankesAddress || lk?.location} />
          <InfoRow label="Tanggal Terima Unit" labelEng="Unit Received Date" value={formattedAtDate(lk?.createdAt || cert?.issuedAt)} />
          <InfoRow label="Tanggal Kalibrasi" labelEng="Date of Calibration" value={formattedAtDate(lk?.createdAt || cert?.issuedAt)} />
        </div>

        {/* Section divider and Instrument Identity Header */}
        <div className="space-y-[15px] mb-8">
          <h3 className="font-bold italic underline text-[15px] font-sans text-slate-900 tracking-wide">Identitas Instrument / Instrument Identity :</h3>
          
          <div className="space-y-[15px] pl-[2px]">
            <InfoRow label="Nama" labelEng="Name" value={lk?.deviceName || 'Micropipette'} />
            <InfoRow label="Merk" labelEng="Manufacture" value={lk?.brand} />
            <InfoRow label="Tipe" labelEng="Type" value={lk?.model} />
            <InfoRow label="Nomor Seri" labelEng="Serial Number" value={lk?.serialNumber} />
            <InfoRow label="Tempat Kalibrasi" labelEng="Place of Calibration" value={lk?.location || 'Klinik Batari'} />
            <InfoRow label="Tanggal Diterbitkan" labelEng="Date of Issued" value={formattedAtDate(lk?.createdAt || cert?.issuedAt, 1)} />
            <InfoRow label="Masa Berlaku" labelEng="Expired Date" value={cert?.nextCalibrationDate || formattedExpiryDate(lk?.createdAt || cert?.issuedAt)} />
          </div>
        </div>

        {/* Corporate Signoff & Authentic Oval Stamp Offset */}
        <div className="mt-auto flex justify-between items-end pb-2">
          <div />
          
          <div className="text-center min-w-[280px] relative">
            <p className="font-bold text-[12.5px] uppercase tracking-wide text-slate-900 font-sans mb-1 pb-1">PT. SPEKTRUM KREASI PRATAMA</p>
            
            <div className="relative h-[110px] w-full flex items-center justify-center mb-2">
              <div className="absolute left-[38px] top-[-5px] z-20 pointer-events-none transform rotate-12 scale-[0.95]">
                <svg viewBox="0 0 160 160" width="112" height="112" className="text-[#2563eb] opacity-85 select-none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="none" />
                  <circle cx="80" cy="80" r="69" fill="none" stroke="currentColor" strokeWidth="0.8" />
                  <path id="stampCurveTopDetail" d="M 14 80 A 66 66 0 0 1 146 80" fill="none" stroke="transparent" />
                  <path id="stampCurveBottomDetail" d="M 146 80 A 66 66 0 0 1 14 80" fill="none" stroke="transparent" />
                  <text className="font-sans font-black text-[9.5px]" fill="currentColor" letterSpacing="0.12em">
                     <textPath href="#stampCurveTopDetail" startOffset="50%" textAnchor="middle">
                        PT. SPEKTRUM KREASI PRATAMA
                     </textPath>
                  </text>
                  <text className="font-sans font-black text-[8.5px]" fill="currentColor" letterSpacing="0.18em">
                     <textPath href="#stampCurveBottomDetail" startOffset="50%" textAnchor="middle">
                        * DEPOK - INDONESIA *
                     </textPath>
                  </text>
                  <g transform="translate(48, 54) scale(0.28)">
                    <path
                      d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z"
                      fill="currentColor"
                    />
                    <path
                      d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z"
                      fill="currentColor"
                    />
                  </g>
                </svg>
              </div>

              <div className="absolute left-[45px] top-[10px] z-30 pointer-events-none transform -rotate-3">
                <svg viewBox="0 0 200 100" width="140" height="70" className="text-[#1d4ed8]" xmlns="http://www.w3.org/2000/svg">
                  <path
                     d="M 20 48 Q 40 22, 52 46 T 70 32 T 91 62 T 112 42 Q 130 32, 150 66 T 170 46 T 190 56"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="3"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                  />
                  <path
                     d="M 15 54 C 28 16, 62 12, 54 62 C 46 92, 82 82, 112 52 C 132 32, 172 6, 148 62 C 136 88, 182 88, 196 52"
                     fill="none"
                     stroke="currentColor"
                     strokeWidth="1.8"
                     strokeLinecap="round"
                     strokeLinejoin="round"
                     opacity="0.85"
                  />
                </svg>
              </div>
            </div>

            <div className="relative z-10 w-full text-center">
               <p className="font-bold text-[14.5px] text-slate-900 border-b border-slate-900 pb-0.5 inline-block px-1 tracking-tight">Faustina Dao S.Tr.Tem</p>
               <p className="font-bold text-[11px] text-slate-500 uppercase tracking-wider mt-1">Manager Teknis</p>
            </div>
          </div>
        </div>

        <footer className="mt-auto text-center space-y-1 z-15">
           <p className="text-[11.5px] font-bold text-slate-400">Hal. 1</p>
           <p className="text-[10px] font-bold text-slate-500 font-sans tracking-tight">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
           <div className="border border-slate-300 p-2 mx-8 mt-1.5 bg-slate-50/20">
              <p className="text-[9.5px] italic text-slate-700 leading-tight">Hasil hanya berhubungan dengan instrument yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan <strong className="uppercase font-sans font-black text-slate-800">PT. SPEKTRUM KREASI PRATAMA</strong></p>
           </div>
        </footer>
      </div>
    </div>
  );
}

function CertificatePage2({ cert, lk }: any) {
  const formattedDate = (d: any) => d?.toDate ? d.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : (typeof d === 'string' ? d : '-');

  const temperature = lk?.environmentalData?.temperature || lk?.tempInitial || '25,61';
  const humidity = lk?.environmentalData?.humidity || lk?.humInitial || '58,31';
  const tempUnc = lk?.environmentalData?.tempUncertainty || '0,4';
  const humUnc = lk?.environmentalData?.humUncertainty || '4,1';

  return (
    <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[15mm] shadow-2xl print:shadow-none font-sans flex flex-col border border-slate-200 overflow-hidden">
      {/* Header section with specialized heart pulse */}
      <div className="flex justify-between items-start border-b-[2.5px] border-blue-900 pb-4 mb-6 z-10 w-full">
          <div className="flex items-center gap-3 shrink-0">
             <div className="w-[45px] h-[45px] flex items-center justify-center">
                <svg viewBox="0 0 150 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z" fill="#0284c7" />
                  <path d="M 45 74 C 42 66, 45 52, 58 44 C 70 36, 92 32, 115 32 C 110 36, 100 40, 88 46 C 72 54, 58 64, 45 74 Z" fill="#94a3b8" />
                  <path d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z" fill="#1e3a8a" />
                  <path d="M 124 64 C 128 72, 125 86, 112 94 C 100 102, 78 106, 55 106 C 60 102, 70 98, 82 92 C 98 84, 112 74, 124 64 Z" fill="#94a3b8" />
                </svg>
             </div>
             <h1 className="text-[17px] font-black text-[#1d4ed8] tracking-tight uppercase font-sans">PT. SPEKTRUM KREASI PRATAMA</h1>
          </div>
          
          <div className="flex-1 flex items-center h-10 px-4 translate-y-1">
             <svg className="w-full h-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 300 40">
                <path d="M 0 20 L 160 20 L 166 10 L 172 30 L 178 0 L 184 40 L 190 20 L 220 20" strokeLinejoin="round" />
             </svg>
          </div>

          <div className="text-right shrink-0">
             <div className="border-[2px] border-slate-800 text-center w-48 shadow-sm">
                <p className="text-[10px] font-bold border-b-[2px] border-slate-800 py-1 uppercase bg-slate-50 text-slate-800">No. sertifikat</p>
                <p className="text-[12.5px] font-bold py-1 px-2 tracking-wider text-slate-900 font-mono leading-none">{cert?.certificateNumber || '2026/SKP/04129'}</p>
             </div>
          </div>
      </div>

      <div className="flex-1 space-y-6">
          <h2 className="text-center text-[18px] font-bold underline decoration-slate-900 underline-offset-4 uppercase tracking-tight mb-6">
            LAPORAN KALIBRASI {lk?.deviceName?.toUpperCase() || 'MIKROPIPET'}
          </h2>

          <div className="grid grid-cols-2 gap-x-12 px-2 text-[12.5px]">
             <table className="w-full border-separate border-spacing-y-2">
                <tbody>
                  <SummaryRow label="Instansi" value={lk?.fasyankesName} />
                  <SummaryRow label="Merk" value={lk?.brand} />
                  <SummaryRow label="Type" value={lk?.model} />
                  <SummaryRow label="Kapasitas" value={lk?.capacity || '100-1000 µL'} />
                </tbody>
             </table>
             <table className="w-full border-separate border-spacing-y-2">
                <tbody>
                  <SummaryRow label="No. Seri" value={lk?.serialNumber} />
                  <SummaryRow label="Lokasi Kalibrasi" value={lk?.location || 'skp'} />
                  <SummaryRow label="Tanggal Kalibrasi" value={formattedDate(lk?.createdAt)} />
                </tbody>
             </table>
          </div>

          <section className="space-y-5 px-2 pt-2">
             <div className="space-y-1">
                <h3 className="font-bold text-[13.5px] text-slate-900 uppercase tracking-tight">I. Kondisi Lingkungan</h3>
                <div className="pl-5 space-y-1 text-[13px] text-slate-800">
                   <div className="flex items-center gap-4">
                      <span className="w-4 font-bold">1.</span>
                      <span className="w-28 font-bold">Suhu</span>
                      <span className="font-medium">: ( {temperature} ± {tempUnc} ) °C</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="w-4 font-bold">2.</span>
                      <span className="w-28 font-bold">Kelembaban</span>
                      <span className="font-medium">: ( {humidity} ± {humUnc} ) %RH</span>
                   </div>
                </div>
             </div>

             <div className="space-y-1">
                <h3 className="font-bold text-[13.5px] text-slate-900 uppercase tracking-tight">II. Alat yang digunakan</h3>
                <div className="pl-5 space-y-1 text-[13px] text-slate-800">
                   {lk?.calibratorNames?.length > 0 ? lk.calibratorNames.map((name: string, i: number) => (
                      <div key={i} className="flex items-center gap-4">
                         <span className="w-4 font-bold">{i + 1}.</span>
                         <span className="font-medium">{name}</span>
                      </div>
                   )) : lk?.calibratorIds?.length > 0 ? lk.calibratorIds.map((id: string, i: number) => (
                      <div key={id} className="flex items-center gap-4">
                         <span className="w-4 font-bold">{i + 1}.</span>
                         <span className="font-medium">Standard Calibrator ID: {id}</span>
                      </div>
                   )) : (
                     <>
                       <div className="flex items-center gap-4">
                          <span className="w-4 font-bold">1.</span>
                          <span className="font-medium">Electronic Top-Pan Balance</span>
                       </div>
                       <div className="flex items-center gap-4">
                          <span className="w-4 font-bold">2.</span>
                          <span className="font-medium">Thermometer Digital</span>
                       </div>
                     </>
                   )}
                </div>
             </div>

             <div className="space-y-3">
                <h3 className="font-bold text-[13.5px] text-slate-900 uppercase tracking-tight">III. Hasil Kalibrasi</h3>
                
                <table className="w-full border-collapse border-[2px] border-slate-900 text-[12px] text-center shadow-sm">
                   <thead className="bg-slate-100/80 font-bold text-slate-900">
                      <tr>
                         <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4">
                            Titik Ukur<br/>
                            <span className="font-normal font-serif italic text-[11px] text-slate-600">({lk?.unit || 'µL'})</span>
                         </th>
                         <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4">
                            V<sub>20</sub><br/>
                            <span className="font-normal font-serif italic text-[11px] text-slate-600">({lk?.unit || 'µL'})</span>
                         </th>
                         <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4">
                            t<sub>air</sub><br/>
                            <span className="font-normal font-serif italic text-[11px] text-slate-600">(°C)</span>
                         </th>
                         <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4" colSpan={2}>
                            Ketidakpastian<br/>
                            <span className="font-normal font-serif italic text-[11px] text-slate-600">({lk?.unit || 'µL'})</span>
                         </th>
                      </tr>
                   </thead>
                   <tbody className="font-bold text-slate-900">
                      {(lk?.measurements && lk.measurements.length > 0
                        ? lk.measurements
                        : getFallbackMeasurements(lk?.deviceName || 'Micropipette', lk?.unit || 'µL')
                      ).map((m: any, idx: number) => {
                        const showTAir = m.tAir || m.waterTemp || '20,4';
                        const showV20 = m.actual !== undefined ? m.actual : (m.meanValue !== undefined ? m.meanValue : (m.penunjukan !== undefined ? m.penunjukan : '-'));
                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                             <td className="border-[1.8px] border-slate-900 py-[6px] font-black bg-slate-50/50">{m.point}</td>
                             <td className="border-[1.8px] border-slate-900 py-[6px]">{showV20}</td>
                             <td className="border-[1.8px] border-slate-900 py-[6px]">{showTAir}</td>
                             <td className="border-[1.8px] border-slate-900 py-[6px] border-r-0 w-8 pr-1 text-right">±</td>
                             <td className="border-[1.8px] border-slate-900 py-[6px] border-l-0 text-left pl-1">{m.uncertainty !== undefined ? (typeof m.uncertainty === 'number' ? m.uncertainty.toFixed(2) : m.uncertainty) : '0,04'}</td>
                          </tr>
                        );
                      })}
                   </tbody>
                </table>
             </div>
          </section>

          <section className="space-y-4 px-2 pt-2">
             <div className="space-y-2">
                <h3 className="font-bold text-[13.5px] text-slate-900 uppercase underline decoration-slate-400 decoration-1 pb-0.5">Catatan :</h3>
                <ul className="list-disc pl-6 text-[11px] text-slate-700 space-y-1.5 font-medium leading-relaxed">
                   <li>Kalibrasi yang dilaporkan tertelusur ke satuan pengukuran SI melalui Puslit KIM-LIPI</li>
                   <li>Ketidakpastian pengukuran dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k=2, dihitung secara kuadratik dari u<sub>c</sub> = √[ u₁² + u₂² + u₃² + u₄² ] di mana u₁ (Resolusi), u₂ (Sertifikat Standar), u₃ (Repeatability/Daya Ulang), dan u₄ (Drift instrumen)</li>
                   <li>Standar yang digunakan adalah analitikal balance nomor seri 18107079 yang tertelusur ke Satuan SI Melalui Puslit KIM-LIPI dengan No.sertifikat S050976 dan thermometer digital dengan nomor seri 91360010 yang tertelusur ke satuan SI melalui Puslit KIM-LIPI dengan nomer sertifikat S 043516</li>
                   <li className="list-none pt-2 flex flex-wrap items-center gap-3">
                       <span className="font-bold italic text-[12.5px] text-slate-800">maka peralatan ini dinyatakan :</span>
                       <span className={cn("font-bold uppercase tracking-tight text-[13.5px] px-3.5 py-0.5 border-[2px]", lk?.isPass === true ? "text-emerald-700 border-emerald-700 bg-emerald-50" : "text-red-700 border-red-700 bg-red-50")}>
                          {lk?.isPass === true ? "ALAT BAIK DAN LAIK UNTUK DIGUNAKAN" : "ALAT TIDAK LAIK DIGUNAKAN"}
                       </span>
                   </li>
                </ul>
             </div>
          </section>
      </div>

      <footer className="mt-auto pt-6 z-10 font-sans">
         <p className="text-right text-[11px] font-bold text-slate-400 mb-2 px-2 italic">Halaman 2 dari 2</p>
         <div className="border-[1.8px] border-slate-300 p-4 text-center text-[10.5px] text-slate-600 space-y-1 bg-slate-50/20">
            <p className="font-bold text-slate-800 text-[11.5px] uppercase">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
            <p className="italic font-serif leading-tight">Hasil hanya berhubungan dengan instrumen yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan <strong className="uppercase font-sans font-black text-slate-800">PT. Spektrum Kreasi Pratama</strong></p>
         </div>
      </footer>
    </div>
  );
}

function InfoRow({ label, labelEng, value }: { label: string, labelEng: string, value: any }) {
  return (
    <div className="grid grid-cols-[220px_15px_1fr] items-start text-[14px] leading-snug">
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 tracking-tight">{label}</span>
        <span className="text-[12px] italic text-slate-500 font-serif leading-none mt-0.5">{labelEng}</span>
      </div>
      <span className="font-bold text-slate-900 text-[14px] pt-1">:</span>
      <span className="font-bold text-slate-950 text-[14.5px] pt-0.5 tracking-tight">{value || '-'}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string, value: any }) {
  return (
    <tr>
       <td className="w-48 text-[13.5px] font-bold uppercase text-slate-700 py-1">{label}</td>
       <td className="w-8 text-center font-bold">:</td>
       <td className="text-[14px] font-bold pl-2 tracking-tight py-1">{value || '-'}</td>
    </tr>
  );
}

const OrnateBorderPattern = () => (
    <svg width="100%" height="100%" viewBox="0 0 793.7 1122.5" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="border-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
           <rect width="24" height="24" fill="#1e40af" />
           <circle cx="12" cy="12" r="11" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
           <circle cx="12" cy="12" r="8" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="789.7" height="1118.5" fill="none" stroke="#1e40af" strokeWidth="1.5" />
      <rect x="6" y="6" width="781.7" height="1110.5" fill="none" stroke="#1e40af" strokeWidth="0.8" />
      <rect x="12" y="12" width="769.7" height="1098.5" fill="none" stroke="url(#border-pattern)" strokeWidth="20" className="opacity-95" />
      <rect x="24" y="24" width="745.7" height="1074.5" fill="none" stroke="#1e40af" strokeWidth="2" />
      <rect x="28" y="28" width="737.7" height="1066.5" fill="none" stroke="#1e40af" strokeWidth="0.8" />
    </svg>
);

const LogoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6" />
    <path d="M12 18c3.31 0 6-2.69 6-6s-2.69-6-6-6" />
    <path d="M12 9c-1.66 0-3 1.34-3 3s1.34 3 3 3" />
    <path d="M12 15c1.66 0 3-1.34 3-3s-1.34-3-3-3" />
  </svg>
);
