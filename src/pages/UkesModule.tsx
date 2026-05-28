import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Clock, 
  Printer, 
  Download,
  Save, 
  Activity,
  FileSpreadsheet,
  Atom,
  ChevronRight,
  Calculator,
  RotateCcw,
  Zap,
  Gauge,
  TrendingUp,
  Columns4,
  ClipboardCopy,
  Check,
  Edit,
  Award,
  Shield,
  FileCheck,
  X,
  Trash2
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { logAction, pushNotification } from '../lib/auditLogger';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

// BAPETEN limits configuration
const BAPETEN_LIMITS = {
  kvpAccuracy: 10,             // max ±10% deviation
  timeAccuracy: 10,            // max ±10% deviation
  reproducibilityCV: 0.05,     // CV <= 0.05 (5%)
  linearityC: 0.1,             // Linearity coefficient <= 0.1 (10%)
  collimationPct: 2,           // total misalign <= 2% of SID
  tubeLeakage: 1.0             // Tube Housing Leakage <= 1.0 mGy/hour at 1 meter
};

// BAPETEN standard minimum HVL thickness lookup
const getMinHvlRequired = (kvp: number, deviceName: string = ''): number => {
  const name = (deviceName || '').toLowerCase();
  
  // Mammography has a different, much lower HVL requirement due to low energies (usually 25kVp - 35kVp)
  if (name.includes('mammograf') || name.includes('mammography')) {
    return 0.3; // standard BAPETEN for Mammography is around 0.3 mm Al at 30 kVp
  }
  
  // Custom BAPETEN multi-threshold table (as per Perka BAPETEN & specific prompt guidelines)
  if (kvp <= 50) return 1.5;
  if (kvp > 50 && kvp <= 60) return 2.0;
  if (kvp > 60 && kvp <= 70) return 2.3; // conforms exactly to: < 2.3 mm Al for 70kVp
  if (kvp > 70 && kvp <= 80) return 2.3;
  if (kvp > 80 && kvp <= 90) return 2.5;
  if (kvp > 90 && kvp <= 100) return 2.7;
  if (kvp > 100 && kvp <= 110) return 3.0;
  if (kvp > 110 && kvp <= 120) return 3.2;
  return 3.5;
};

// Seeding sample data
const INITIAL_UKES_RECORDS: any[] = [];

export function UkesModule() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);

  // Certificate state
  const [issuingCert, setIssuingCert] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [certRecord, setCertRecord] = useState<any | null>(null);
  const [certNomorSurat, setCertNomorSurat] = useState('');
  const [certPenandatangan, setCertPenandatangan] = useState('');
  const [certJabatan, setCertJabatan] = useState('Kepala Divisi Uji Kesesuaian');

  // Custom Toast and Custom Delete Confirmation States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [copiedRow, setCopiedRow] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  const copyToClipboard = (text: string, rowKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRow(rowKey);
    showToast(`Baris ${rowKey} disalin ke clipboard!`, "success");
    setTimeout(() => setCopiedRow(null), 2000);
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Form parameters
  const [formDeviceName, setFormDeviceName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formFasyankes, setFormFasyankes] = useState('');
  const [formOperator, setFormOperator] = useState('');
  const [formTestDate, setFormTestDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic custom parameters state for extra safety parameters (BAPETEN / standard kustom)
  interface CustomChecklistItem {
    id: string;
    name: string;
    status: 'Lolos' | 'Tidak Lolos';
  }
  const [customParameters, setCustomParameters] = useState<CustomChecklistItem[]>([]);

  // Helpers to add, edit, or delete items inside custom parameters
  const addCustomParameter = () => {
    setCustomParameters(prev => [
      ...prev,
      {
        id: `cust-${Date.now()}-${Math.random()}`,
        name: `Parameter Kustom Baru ${prev.length + 1}`,
        status: 'Lolos'
      }
    ]);
  };

  const deleteCustomParameter = (id: string) => {
    setCustomParameters(prev => prev.filter(item => item.id !== id));
  };

  const updateCustomParameterName = (id: string, name: string) => {
    setCustomParameters(prev => prev.map(item => item.id === id ? { ...item, name } : item));
  };

  const updateCustomParameterStatus = (id: string, status: 'Lolos' | 'Tidak Lolos') => {
    setCustomParameters(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };

  // Form scientific fields
  const [kvpSet, setKvpSet] = useState<number>(0);
  const [kvp1, setKvp1] = useState<number>(0);
  const [kvp2, setKvp2] = useState<number>(0);
  const [kvp3, setKvp3] = useState<number>(0);

  // Waktu eksposur
  const [timeSet, setTimeSet] = useState<number>(0);
  const [time1, setTime1] = useState<number>(0);
  const [time2, setTime2] = useState<number>(0);
  const [time3, setTime3] = useState<number>(0);

  // Reproducibility doses (5 runs)
  const [dose1, setDose1] = useState<number>(0);
  const [dose2, setDose2] = useState<number>(0);
  const [dose3, setDose3] = useState<number>(0);
  const [dose4, setDose4] = useState<number>(0);
  const [dose5, setDose5] = useState<number>(0);

  // Collimation, HVL, and Leakage
  const [sidVal, setSidVal] = useState<number>(100);
  const [misX, setMisX] = useState<number>(0);
  const [misY, setMisY] = useState<number>(0);
  const [hvlVal, setHvlVal] = useState<number>(0);
  const [tubeLeakage, setTubeLeakage] = useState<number>(0);

  // Linearity parameters (5 mAs/Dose pairs)
  const [linMas, setLinMas] = useState<number[]>([50, 100, 200, 400, 800]);
  const [linDose, setLinDose] = useState<number[]>([0, 0, 0, 0, 0]);

  const [saving, setSaving] = useState(false);
  const { user } = useAuth();

  const [purging, setPurging] = useState(false);
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);

  const handlePurgeAllRecords = async () => {
    setPurging(true);
    try {
      const q = query(collection(db, 'ukes_records'));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'ukes_records', docSnap.id)));
      await Promise.all(deletePromises);
      await logAction(`Membersihkan Seluruh Rekor Ukes`, 'ukes_records', `Total rekor dihapus: ${snapshot.docs.length}`, 'warning');
      showToast(`Sukses menghapus ${snapshot.docs.length} rekor!`, "success");
      setIsPurgeConfirmOpen(false);
    } catch (e: any) {
      console.error(e);
      showToast("Gagal membersihkan rekor: " + e.message, "error");
    } finally {
      setPurging(false);
    }
  };

  // Helper: open modal in edit mode
  const handleOpenEdit = (record: any) => {
    setIsEditMode(true);
    setEditingRecordId(record.id);
    setFormDeviceName(record.deviceName || '');
    setFormBrand(record.brand || '');
    setFormModel(record.model || '');
    setFormSerialNumber(record.serialNumber || '');
    setFormLocation(record.location || '');
    setFormFasyankes(record.fasyankesName || '');
    setFormOperator(record.operatorName || '');
    setFormTestDate(record.testDate || new Date().toISOString().split('T')[0]);
    // Scientific fields
    const p = record.parameters || {};
    setKvpSet(p.kvpSeting || p.kvpSet || 80);
    setKvp1(p.kvpValues?.[0] || 79.5);
    setKvp2(p.kvpValues?.[1] || 80.1);
    setKvp3(p.kvpValues?.[2] || 79.8);
    setTimeSet(p.timeSeting || p.timeSet || 100);
    setTime1(p.timeValues?.[0] || 101.5);
    setTime2(p.timeValues?.[1] || 99.2);
    setTime3(p.timeValues?.[2] || 100.8);
    setDose1(p.doseValues?.[0] || p.dose1 || 1.24);
    setDose2(p.doseValues?.[1] || p.dose2 || 1.26);
    setDose3(p.doseValues?.[2] || p.dose3 || 1.25);
    setDose4(p.doseValues?.[3] || p.dose4 || 1.23);
    setDose5(p.doseValues?.[4] || p.dose5 || 1.27);
    setSidVal(p.sidValue || p.sidVal || 100);
    setMisX(p.misalignX || p.misX || 0.8);
    setMisY(p.misalignY || p.misY || 0.9);
    setHvlVal(p.hvlValue || p.hvlVal || 2.7);
    setTubeLeakage(p.tubeLeakage || 0);
    // Linearity
    if (p.linMas && p.linDose) {
      setLinMas(p.linMas);
      setLinDose(p.linDose);
    }
    
    const custArr = Object.entries(record.customParameters || {}).map(([name, status], idx) => ({
      id: `cust-${idx}-${Date.now()}`,
      name,
      status: status as 'Lolos' | 'Tidak Lolos'
    }));
    setCustomParameters(custArr);

    setIsModalOpen(true);
  };

  const handleOpenNew = () => {
    setIsEditMode(false);
    setEditingRecordId(null);
    setFormDeviceName('Pesawat Sinar-X Radiografi Umum');
    setFormBrand('');
    setFormModel('');
    setFormSerialNumber('');
    setFormLocation('');
    setFormFasyankes('');
    setFormOperator('');
    setFormTestDate(new Date().toISOString().split('T')[0]);
    setKvpSet(80);
    setKvp1(79.5);
    setKvp2(80.1);
    setKvp3(79.8);
    setTimeSet(100);
    setTime1(101.5);
    setTime2(99.2);
    setTime3(100.8);
    setDose1(1.24);
    setDose2(1.26);
    setDose3(1.25);
    setDose4(1.23);
    setDose5(1.27);
    setSidVal(100);
    setMisX(0.8);
    setMisY(0.9);
    setHvlVal(2.7);
    setTubeLeakage(0);
    setCustomParameters([]);
    setIsModalOpen(true);
  };

  // Memoized historical Half Value Layer (HVL) trend vs Standards
  const hvlTrendData = useMemo(() => {
    return [...records]
      .filter(r => r.testDate && r.parameters?.hvlValue !== undefined)
      .sort((a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime())
      .map(r => {
        const threshold = getMinHvlRequired(r.parameters.kvpSeting || 70, r.deviceName);
        return {
          date: r.testDate,
          hvl: Number(r.parameters.hvlValue),
          standard: threshold,
          facility: r.fasyankesName || "Rumah Sakit",
          device: r.deviceName
        };
      });
  }, [records]);

  const exportUkesToPDF = (record: any) => {
    if (!record) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const marginX = 20;
      let yPos = 25;
      const pageHeight = 280;

      // ─── Helper: professional double border ──────────────────────────────
      const drawBorder = () => {
        doc.setDrawColor(30, 64, 175);
        doc.setLineWidth(1.2);
        doc.rect(8, 8, 194, 281);
        doc.setLineWidth(0.4);
        doc.rect(10, 10, 190, 277);
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.2);
        doc.rect(11.5, 11.5, 187, 274);
      };
      drawBorder();

      // ─── Header ──────────────────────────────────────────────────────────
      doc.setFillColor(2, 132, 199);
      doc.ellipse(22, 26, 3, 4, 'F');
      doc.setFillColor(30, 58, 138);
      doc.ellipse(24, 28, 3, 4, 'F');

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(29, 78, 216);
      doc.text("PT. SPEKTRUM KREASI PRATAMA", 34, 25);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok – (021) 2961-0080", 34, 30);
      doc.text("DIVISI UJI KESESUAIAN & KEPATUHAN RADIOLOGI ALKES (BAPETEN)", 34, 34);

      doc.setDrawColor(29, 78, 216);
      doc.setLineWidth(0.8);
      doc.line(marginX, 38, 190, 38);
      yPos = 45;

      // ─── Title block ─────────────────────────────────────────────────────
      doc.setFillColor(239, 246, 255);
      doc.rect(marginX, yPos, 170, 14, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("LAPORAN HASIL UJI KESESUAIAN (CONFORMITY TESTING REPORT)", 105, yPos + 5.5, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Evaluasi Kepatuhan berdasarkan Peraturan Kepala BAPETEN No. 2 Tahun 2018", 105, yPos + 10.5, { align: "center" });
      yPos += 18;

      // ─── Metadata two-column ─────────────────────────────────────────────
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(29, 78, 216);
      doc.text("IDENTITAS PESAWAT SINAR-X", marginX, yPos);
      doc.text("INFORMASI FASYANKES & ANALIS", 113, yPos);
      yPos += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const metaLeft = [
        ["Nama Alat:", record.deviceName || "-"],
        ["Merek / Tipe:", `${record.brand || "-"} / ${record.model || "-"}`],
        ["Nomor Seri:", record.serialNumber || "-"],
        ["Lokasi / Ruang:", record.location || "-"]
      ];
      const metaRight = [
        ["Fasyankes:", record.fasyankesName || "-"],
        ["Tanggal Uji:", record.testDate || "-"],
        ["Fisikawan Medis:", record.operatorName || "-"],
        ["Hasil Akhir:", record.kesimpulan?.split(" ").slice(0, 4).join(" ") || "-"]
      ];

      let leftY = yPos;
      metaLeft.forEach(([label, val]) => {
        doc.setFont("helvetica", "bold"); doc.text(label, marginX, leftY);
        doc.setFont("helvetica", "normal"); doc.text(String(val).slice(0, 45), marginX + 27, leftY);
        leftY += 4.5;
      });
      let rightY = yPos;
      metaRight.forEach(([label, val]) => {
        doc.setFont("helvetica", "bold"); doc.text(label, 113, rightY);
        doc.setFont("helvetica", "normal"); doc.text(String(val).slice(0, 35), 113 + 28, rightY);
        rightY += 4.5;
      });
      yPos = Math.max(leftY, rightY) + 5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.line(marginX, yPos - 2, 190, yPos - 2);

      const successColor: [number, number, number] = [16, 185, 129];
      const failColor: [number, number, number] = [239, 68, 68];

      // ─── Helper: section header ───────────────────────────────────────────
      const secHead = (title: string, num: string) => {
        if (yPos > pageHeight - 35) { doc.addPage(); drawBorder(); yPos = 25; }
        doc.setFillColor(239, 246, 255);
        doc.rect(marginX, yPos, 170, 6, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text(`${num}. ${title}`, marginX + 3, yPos + 4.2);
        yPos += 8;
      };

      const tHead = (cols: {text:string; x:number}[], h=5.5) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, yPos, 170, h, 'F');
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        cols.forEach(c => doc.text(c.text, c.x, yPos + 4));
        yPos += h;
      };

      // ─── Section 1: Akurasi Tegangan & Waktu ─────────────────────────────
      secHead("AKURASI TEGANGAN (kVp) & WAKTU PENYINARAN (ms)", "1");

      // kVp values – read from kvpValues array (new format) or fallback
      const kvpVals = record.parameters?.kvpValues as number[] || [
        record.parameters?.kvp1, record.parameters?.kvp2, record.parameters?.kvp3
      ];
      const timeVals = record.parameters?.timeValues as number[] || [
        record.parameters?.time1, record.parameters?.time2, record.parameters?.time3
      ];

      tHead([
        { text: "Parameter Uji", x: marginX + 3 },
        { text: "Nilai Set", x: marginX + 48 },
        { text: "Run 1", x: marginX + 69 },
        { text: "Run 2", x: marginX + 87 },
        { text: "Run 3", x: marginX + 105 },
        { text: "Rata-rata", x: marginX + 123 },
        { text: "Dev%", x: marginX + 144 },
        { text: "Evaluasi", x: marginX + 157 }
      ]);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      // kVp row
      doc.text("Akurasi Tegangan (kVp)", marginX + 3, yPos + 4);
      doc.text(`${record.parameters?.kvpSeting || 80} kVp`, marginX + 48, yPos + 4);
      doc.text(kvpVals[0] != null ? String(kvpVals[0]) : "-", marginX + 69, yPos + 4);
      doc.text(kvpVals[1] != null ? String(kvpVals[1]) : "-", marginX + 87, yPos + 4);
      doc.text(kvpVals[2] != null ? String(kvpVals[2]) : "-", marginX + 105, yPos + 4);
      doc.text(`${(record.calculations?.kvpAvg || 0).toFixed(2)}`, marginX + 123, yPos + 4);
      doc.text(`${(record.calculations?.kvpDevPct || 0).toFixed(1)}%`, marginX + 144, yPos + 4);
      doc.setFont("helvetica", "bold");
      let kvpC = record.calculations?.kvpStatus === "Lolos" ? successColor : failColor;
      doc.setTextColor(kvpC[0], kvpC[1], kvpC[2]);
      doc.text((record.calculations?.kvpStatus || "Lolos").toUpperCase(), marginX + 157, yPos + 4);
      doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
      yPos += 5.5;

      // Time row
      doc.text("Akurasi Waktu Eksposur (ms)", marginX + 3, yPos + 4);
      doc.text(`${record.parameters?.timeSeting || 100} ms`, marginX + 48, yPos + 4);
      doc.text(timeVals[0] != null ? String(timeVals[0]) : "-", marginX + 69, yPos + 4);
      doc.text(timeVals[1] != null ? String(timeVals[1]) : "-", marginX + 87, yPos + 4);
      doc.text(timeVals[2] != null ? String(timeVals[2]) : "-", marginX + 105, yPos + 4);
      doc.text(`${(record.calculations?.timeAvg || 0).toFixed(2)}`, marginX + 123, yPos + 4);
      doc.text(`${(record.calculations?.timeDevPct || 0).toFixed(1)}%`, marginX + 144, yPos + 4);
      doc.setFont("helvetica", "bold");
      let timeC = record.calculations?.timeStatus === "Lolos" ? successColor : failColor;
      doc.setTextColor(timeC[0], timeC[1], timeC[2]);
      doc.text((record.calculations?.timeStatus || "Lolos").toUpperCase(), marginX + 157, yPos + 4);
      doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
      yPos += 9;

      // ─── Section 2: Reproduksibilitas ────────────────────────────────────
      secHead("REPRODUKSIBILITAS PAPARAN DOSIS (5 Runs)", "2");

      const doseVals: number[] = [
        record.parameters?.doseValues?.[0] ?? record.parameters?.dose1 ?? 0,
        record.parameters?.doseValues?.[1] ?? record.parameters?.dose2 ?? 0,
        record.parameters?.doseValues?.[2] ?? record.parameters?.dose3 ?? 0,
        record.parameters?.doseValues?.[3] ?? record.parameters?.dose4 ?? 0,
        record.parameters?.doseValues?.[4] ?? record.parameters?.dose5 ?? 0,
      ];

      // Show 5 runs as mini cards
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      [1,2,3,4,5].forEach((i, idx) => {
        const x = marginX + idx * 34;
        doc.setFillColor(248, 250, 252);
        doc.rect(x, yPos, 32, 10, 'F');
        doc.text(`Run ${i}`, x + 16, yPos + 4, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(30, 58, 138);
        doc.text(`${Number(doseVals[idx]).toFixed(3)}`, x + 16, yPos + 8, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
      });
      yPos += 13;

      tHead([
        { text: "Dosis Rata-rata (mGy)", x: marginX + 3 },
        { text: "Std Dev (SD)", x: marginX + 48 },
        { text: "Koef. Variasi (CV)", x: marginX + 85 },
        { text: "Batas CV BAPETEN", x: marginX + 125 },
        { text: "Evaluasi", x: marginX + 157 }
      ]);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const doseMean = record.calculations?.doseMean || 0;
      const doseSD = record.calculations?.doseSD || 0;
      const doseCV = record.calculations?.doseCV || 0;

      doc.text(`${doseMean.toFixed(4)} mGy`, marginX + 3, yPos + 4);
      doc.text(`${doseSD.toFixed(4)}`, marginX + 48, yPos + 4);
      doc.text(`${(doseCV * 100).toFixed(2)}%`, marginX + 85, yPos + 4);
      doc.text("<= 5.0000%", marginX + 125, yPos + 4);
      doc.setFont("helvetica", "bold");
      let doseC = record.calculations?.doseStatus === "Lolos" ? successColor : failColor;
      doc.setTextColor(doseC[0], doseC[1], doseC[2]);
      doc.text((record.calculations?.doseStatus || "Lolos").toUpperCase(), marginX + 157, yPos + 4);
      doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
      yPos += 11;

      // ─── Section 3: Kolimasi, HVL & Kebocoran ────────────────────────────
      secHead("PROTEKSI RADIASI – KOLIMASI, HVL & KEBOCORAN TABUNG", "3");

      const sidValue = record.parameters?.sidValue || 100;
      const collimPct = record.calculations?.collimationPct || 0;
      const hvlValue = record.parameters?.hvlValue || 0;
      const minHvl = getMinHvlRequired(record.parameters?.kvpSeting || 80, record.deviceName);
      const hvlOk = hvlValue >= minHvl;
      const tubeLeakageVal = record.parameters?.tubeLeakage || 0;
      const tubeStatus = record.calculations?.tubeLeakageStatus || (tubeLeakageVal <= BAPETEN_LIMITS.tubeLeakage ? "Lolos" : "Tidak Lolos");

      tHead([
        { text: "Parameter Proteksi", x: marginX + 3 },
        { text: "Nilai Acuan / Seting", x: marginX + 55 },
        { text: "Hasil Terukur", x: marginX + 100 },
        { text: "Batas Regulasi BAPETEN", x: marginX + 130 },
        { text: "Evaluasi", x: marginX + 157 }
      ]);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      const protRows: [string, string, string, string, boolean][] = [
        ["Akurasi Kolimasi Lapangan", `SID: ${sidValue} cm`, `${collimPct.toFixed(2)}% of SID`, "<= 2.0% of SID", record.calculations?.collimationStatus === "Lolos"],
        ["Penyaringan Berkas (HVL)", `kVp Set: ${record.parameters?.kvpSeting || 80}`, `${hvlValue.toFixed(2)} mm Al`, `>= ${minHvl.toFixed(2)} mm Al`, hvlOk],
        ["Kebocoran Radiasi Tabung", "Jarak: 1 meter", `${tubeLeakageVal.toFixed(2)} mGy/jam`, "<= 1.0 mGy/jam", tubeStatus === "Lolos"]
      ];

      protRows.forEach(([name, seting, result, limit, ok]) => {
        if (yPos > pageHeight - 20) { doc.addPage(); drawBorder(); yPos = 25; }
        doc.text(name, marginX + 3, yPos + 4);
        doc.text(seting, marginX + 55, yPos + 4);
        doc.text(result, marginX + 100, yPos + 4);
        doc.text(limit, marginX + 130, yPos + 4);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...(ok ? successColor : failColor));
        doc.text(ok ? "LOLOS" : "GAGAL", marginX + 157, yPos + 4);
        doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
        yPos += 5.5;
      });
      yPos += 5;

      // ─── Section 4: Custom parameters ────────────────────────────────────
      const customParams = record.customParameters || {};
      const customKeys = Object.keys(customParams);
      if (customKeys.length > 0) {
        secHead("PARAMETER PENGUJIAN TAMBAHAN / KUSTOM", "4");
        tHead([
          { text: "Parameter Kustom", x: marginX + 3 },
          { text: "Status Evaluasi", x: marginX + 150 }
        ]);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        customKeys.forEach((name) => {
          if (yPos > pageHeight - 20) { doc.addPage(); drawBorder(); yPos = 25; }
          const status = customParams[name] || "Lolos";
          const wrapped = doc.splitTextToSize(name, 120);
          doc.text(wrapped, marginX + 3, yPos + 4);
          doc.setFont("helvetica", "bold");
          const sColor = status === "Lolos" ? successColor : failColor;
          doc.setTextColor(sColor[0], sColor[1], sColor[2]);
          doc.text(status.toUpperCase(), marginX + 150, yPos + 4);
          doc.setFont("helvetica", "normal"); doc.setTextColor(15, 23, 42);
          yPos += Math.max(5.5, wrapped.length * 4);
        });
        yPos += 5;
      }

      // ─── Verdict box ──────────────────────────────────────────────────────
      if (yPos > pageHeight - 30) { doc.addPage(); drawBorder(); yPos = 25; }
      const isLolosTotal = !record.kesimpulan?.includes("TIDAK");
      const isBersyarat = record.kesimpulan?.includes("BERSYARAT");
      const vBg = isLolosTotal && !isBersyarat ? [240, 253, 250] : isBersyarat ? [255, 251, 235] : [254, 242, 242];
      const vBorder = isLolosTotal && !isBersyarat ? [16, 185, 129] : isBersyarat ? [245, 158, 11] : [239, 68, 68];
      const vText = isLolosTotal && !isBersyarat ? [6, 95, 70] : isBersyarat ? [146, 64, 14] : [153, 27, 27];
      doc.setFillColor(vBg[0], vBg[1], vBg[2]);
      doc.setDrawColor(vBorder[0], vBorder[1], vBorder[2]);
      doc.setLineWidth(0.8);
      doc.rect(marginX, yPos, 170, 16, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(vText[0], vText[1], vText[2]);
      doc.text("PERNYATAAN METROLOGI & KELAYAKAN ALAT SESUAI BAPETEN:", marginX + 5, yPos + 5.5);
      doc.setFontSize(9.5);
      const verdictSplit = doc.splitTextToSize((record.kesimpulan || "LOLOS UJI KESESUAIAN").toUpperCase(), 155);
      doc.text(verdictSplit, marginX + 5, yPos + 11.5);
      yPos += 23;

      // ─── Signature block ──────────────────────────────────────────────────
      if (yPos > pageHeight - 35) { doc.addPage(); drawBorder(); yPos = 25; }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Depok, " + new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }), 135, yPos);
      yPos += 4.5;
      doc.text("Analis Fisikawan Medis,", 135, yPos);
      yPos += 20;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(record.operatorName || "Analis Fisikawan Medis", 135, yPos);
      doc.setLineWidth(0.3);
      doc.setDrawColor(15, 23, 42);
      doc.line(135, yPos + 1, 190, yPos + 1);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PT. Spektrum Kreasi Pratama", 135, yPos + 4.5);

      // ─── Footer ───────────────────────────────────────────────────────────
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Laporan ini diterbitkan berdasarkan Perka BAPETEN No. 2/2018. Hanya berlaku untuk pesawat yang diuji.", 105, 279, { align: "center" });

      doc.save(`Uji_Kesesuaian_${(record.deviceName || "Alat").replace(/\s+/g, "_")}_${record.serialNumber || "SN"}.pdf`);
      showToast("Laporan Uji Kesesuaian BAPETEN berhasil diekspor ke PDF!", "success");
    } catch (e: any) {
      console.error(e);
      showToast("Gagal mengekspor PDF: " + e.message, "error");
    }
  };

  // Load records from Firestore with Fallback
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'ukes_records'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          setRecords(INITIAL_UKES_RECORDS);
          setLoading(false);
        } else {
          const list = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
          setRecords(list);
          setLoading(false);
        }
      }, (error) => {
        console.error("Firestore Loading Ukes failed, fallback applied:", error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'ukes_records');
        } catch (e) {
          // Graceful fallback
          setRecords(INITIAL_UKES_RECORDS);
          setLoading(false);
        }
      });
    } catch (e) {
      console.error("Failed to connect to Ukes database, fallback initialized:", e);
      try {
        handleFirestoreError(e, OperationType.LIST, 'ukes_records');
      } catch (err) {
        setRecords(INITIAL_UKES_RECORDS);
        setLoading(false);
      }
    }
    return () => unsubscribe();
  }, []);

  // Scientific calculator for the active form parameters
  const runLiveCalculations = () => {
    // 1. kVp Accuracy
    const kvpVals = [Number(kvp1), Number(kvp2), Number(kvp3)].filter(v => !isNaN(v) && v > 0);
    const kvpAvg = kvpVals.length > 0 ? kvpVals.reduce((sum, v) => sum + v, 0) / kvpVals.length : 0;
    const kvpDevPct = kvpSet > 0 ? ((kvpAvg - kvpSet) / kvpSet) * 100 : 0;
    const kvpStatus = Math.abs(kvpDevPct) <= BAPETEN_LIMITS.kvpAccuracy ? "Lolos" : "Tidak Lolos";

    // 2. Exposure Time Accuracy
    const timeVals = [Number(time1), Number(time2), Number(time3)].filter(v => !isNaN(v) && v > 0);
    const timeAvg = timeVals.length > 0 ? timeVals.reduce((sum, v) => sum + v, 0) / timeVals.length : 0;
    const timeDevPct = timeSet > 0 ? ((timeAvg - timeSet) / timeSet) * 100     : 0;
    const timeStatus = Math.abs(timeDevPct) <= BAPETEN_LIMITS.timeAccuracy ? "Lolos" : "Tidak Lolos";

    // 3. Reproducibility CV
    const dVals = [Number(dose1), Number(dose2), Number(dose3), Number(dose4), Number(dose5)].filter(v => !isNaN(v) && v > 0);
    const rawMean = dVals.length > 0 ? dVals.reduce((sum, v) => sum + v, 0) / dVals.length : 0;
    const doseMean = parseFloat(rawMean.toFixed(4));
    
    const devSqSum = dVals.length > 1 ? dVals.reduce((sum, v) => sum + Math.pow(v - doseMean, 2), 0) : 0;
    const rawSD = dVals.length > 1 ? Math.sqrt(devSqSum / (dVals.length - 1)) : 0;
    const doseSD = parseFloat(rawSD.toFixed(4));
    
    const rawCV = doseMean > 0 ? doseSD / doseMean : 0;
    const doseCV = parseFloat(rawCV.toFixed(4));
    const doseStatus = doseCV <= BAPETEN_LIMITS.reproducibilityCV ? "Lolos" : "Tidak Lolos";

    // 4. Collimation Accuracy (Beam Alignment)
    const misalignSum = Number(misX) + Number(misY);
    const collimationPct = sidVal > 0 ? (misalignSum / sidVal) * 100 : 0;
    const collimationStatus = collimationPct <= BAPETEN_LIMITS.collimationPct ? "Lolos" : "Tidak Lolos";

    // 5. HVL Validation
    const hvlMinRequired = getMinHvlRequired(Number(kvpSet), formDeviceName);
    const hvlStatus = Number(hvlVal) >= hvlMinRequired ? "Lolos" : "Tidak Lolos";

    // 6. Tube Housing Leakage (BAPETEN max 1.0 mGy/jam at 1 meter)
    const tubeLeakageStatus = Number(tubeLeakage) <= BAPETEN_LIMITS.tubeLeakage ? "Lolos" : "Tidak Lolos";

    return {
      kvpAvg,
      kvpDevPct,
      kvpStatus,
      timeAvg,
      timeDevPct,
      timeStatus,
      doseMean,
      doseSD,
      doseCV,
      doseStatus,
      collimationSum: misalignSum,
      collimationPct,
      collimationStatus,
      hvlMinRequired,
      hvlStatus,
      tubeLeakageStatus,
      tubeLeakage: Number(tubeLeakage)
    };
  };

  const calculated = runLiveCalculations();

  // Handle Save
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrand || !formFasyankes) {
      showToast("Harap lengkapi Merek dan Nama Rumah Sakit / Fasyankes.", "warning");
      return;
    }

    setSaving(true);
    try {
      const calc = runLiveCalculations();
      
      // Determine overall compliance
      let finalVerdict = "LOLOS UJI KESESUAIAN";
      if (
        calc.kvpStatus === "Tidak Lolos" || 
        calc.timeStatus === "Tidak Lolos" || 
        calc.doseStatus === "Tidak Lolos" || 
        calc.tubeLeakageStatus === "Tidak Lolos"
      ) {
        finalVerdict = "TIDAK LOLOS KESESUAIAN (Kritis)";
      } else if (calc.hvlStatus === "Tidak Lolos" || calc.collimationStatus === "Tidak Lolos") {
        finalVerdict = "LOLOS BERSYARAT (Butuh Filter Tambahan / Kalibrasi Kolimator)";
      }

      const customParamsObj: Record<string, 'Lolos' | 'Tidak Lolos'> = {};
      customParameters.forEach(item => {
        if (item.name.trim()) {
          customParamsObj[item.name.trim()] = item.status;
        }
      });

      const ukesData = {
        deviceName: formDeviceName,
        brand: formBrand,
        model: formModel,
        serialNumber: formSerialNumber,
        location: formLocation,
        fasyankesName: formFasyankes,
        operatorName: formOperator,
        testDate: formTestDate,
        kesimpulan: finalVerdict,
        parameters: {
          kvpSeting: Number(kvpSet),
          kvpValues: [Number(kvp1), Number(kvp2), Number(kvp3)],
          timeSeting: Number(timeSet),
          timeValues: [Number(time1), Number(time2), Number(time3)],
          doseValues: [Number(dose1), Number(dose2), Number(dose3), Number(dose4), Number(dose5)],
          sidValue: Number(sidVal),
          misalignX: Number(misX),
          misalignY: Number(misY),
          hvlValue: Number(hvlVal),
          tubeLeakage: Number(tubeLeakage)
        },
        customParameters: customParamsObj,
        calculations: calc,
        createdAt: serverTimestamp()
      };

      if (isEditMode && editingRecordId) {
        const docRef = doc(db, 'ukes_records', editingRecordId);
        await updateDoc(docRef, {
          ...ukesData,
          updatedAt: serverTimestamp()
        });

        await logAction(
          `Pembaruan Uji Kesesuaian: ${formDeviceName}`,
          'ukes_records',
          `Alat: ${formDeviceName}, Hasil: ${finalVerdict}, SN: ${formSerialNumber}, ID: ${editingRecordId}`,
          'info'
        );

        showToast("Laporan Uji Kesesuaian BAPETEN berhasil diperbarui!", "success");
      } else {
        const docRef = await addDoc(collection(db, 'ukes_records'), ukesData);

        await logAction(
          `Registrasi Uji Kesesuaian: ${formDeviceName}`,
          'ukes_records',
          `Alat: ${formDeviceName}, Hasil: ${finalVerdict}, SN: ${formSerialNumber}`,
          'info'
        );

        await pushNotification(
          'Laporan Uji Kesesuaian BAPETEN Tersimpan',
          `Catatan Uji Kesesuaian untuk ${formDeviceName} telah divalidasi dan disimpan.`,
          'success',
          'all',
          '/ukes'
        );
      }

      setIsModalOpen(false);
      // Reset major fields
      setFormBrand('');
      setFormModel('');
      setFormSerialNumber('');
      setFormFasyankes('');
      setTubeLeakage(0);
      setIsEditMode(false);
      setEditingRecordId(null);
    } catch (error) {
      console.error("Save Ukes Error, falling back to local list:", error);
      let firestoreErr: any = null;
      try {
        handleFirestoreError(error, OperationType.CREATE, 'ukes_records');
      } catch (err) {
        firestoreErr = err;
      }
      // Fallback
      const nextId = isEditMode && editingRecordId ? editingRecordId : ("local-ukes-" + Date.now());
      const calc = runLiveCalculations();
      let finalVerdict = "LOLOS UJI KESESUAIAN";
      if (
        calc.kvpStatus === "Tidak Lolos" || 
        calc.timeStatus === "Tidak Lolos" || 
        calc.doseStatus === "Tidak Lolos" || 
        calc.tubeLeakageStatus === "Tidak Lolos"
      ) {
        finalVerdict = "TIDAK LOLOS KESESUAIAN (Kritis)";
      } else if (calc.hvlStatus === "Tidak Lolos" || calc.collimationStatus === "Tidak Lolos") {
        finalVerdict = "LOLOS BERSYARAT (Butuh Filter Tambahan / Kalibrasi Kolimator)";
      }

      const localItem = {
        id: nextId,
        deviceName: formDeviceName,
        brand: formBrand,
        model: formModel,
        serialNumber: formSerialNumber,
        location: formLocation,
        fasyankesName: formFasyankes,
        operatorName: formOperator,
        testDate: formTestDate,
        kesimpulan: finalVerdict,
        parameters: {
          kvpSeting: Number(kvpSet),
          kvpValues: [Number(kvp1), Number(kvp2), Number(kvp3)],
          timeSeting: Number(timeSet),
          timeValues: [Number(time1), Number(time2), Number(time3)],
          doseValues: [Number(dose1), Number(dose2), Number(dose3), Number(dose4), Number(dose5)],
          sidValue: Number(sidVal),
          misalignX: Number(misX),
          misalignY: Number(misY),
          hvlValue: Number(hvlVal),
          tubeLeakage: Number(tubeLeakage)
        },
        calculations: calc,
        createdAt: new Date()
      };

      if (isEditMode && editingRecordId) {
        setRecords(prev => prev.map(r => r.id === editingRecordId ? { ...r, ...localItem } : r));
        showToast("Laporan Uji Kesesuaian diperbarui secara lokal!", "success");
      } else {
        setRecords(prev => [localItem, ...prev]);
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingRecordId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleExcelImport = async () => {
    if (!pastedText.trim()) {
      showToast("Harap masukkan atau tempelkan data teks Excel.", "warning");
      return;
    }
    setIsImporting(true);
    setImportStatus("Menghubungi AI untuk memproses tabel Excel Anda...");
    try {
      const resp = await fetch('/api/parse-excel-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rawText: pastedText,
          importType: 'ukes'
        })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Gagal memparsing data Excel dengan AI.');
      }

      setImportStatus("Mengevaluasi kesesuaian keselamatan radiansi BAPETEN...");
      const parsed = await resp.json();

      // Calculate Derived Fields
      const kvpVals = parsed.parameters.kvpValues || [];
      const kvpAvg = kvpVals.length > 0 ? kvpVals.reduce((sum: number, v: number) => sum + v, 0) / kvpVals.length : 0;
      const kvpDevPct = parsed.parameters.kvpSeting > 0 ? ((kvpAvg - parsed.parameters.kvpSeting) / parsed.parameters.kvpSeting) * 100 : 0;
      const kvpStatus = Math.abs(kvpDevPct) <= BAPETEN_LIMITS.kvpAccuracy ? "Lolos" : "Tidak Lolos";

      const timeVals = parsed.parameters.timeValues || [];
      const timeAvg = timeVals.length > 0 ? timeVals.reduce((sum: number, v: number) => sum + v, 0) / timeVals.length : 0;
      const timeDevPct = parsed.parameters.timeSeting > 0 ? ((timeAvg - parsed.parameters.timeSeting) / parsed.parameters.timeSeting) * 100 : 0;
      const timeStatus = Math.abs(timeDevPct) <= BAPETEN_LIMITS.timeAccuracy ? "Lolos" : "Tidak Lolos";

      const dVals = parsed.parameters.doseValues || [];
      const rawMean = dVals.length > 0 ? dVals.reduce((sum: number, v: number) => sum + v, 0) / dVals.length : 0;
      const doseMean = parseFloat(rawMean.toFixed(4));
      const devSqSum = dVals.length > 1 ? dVals.reduce((sum: number, v: number) => sum + Math.pow(v - doseMean, 2), 0) : 0;
      const rawSD = dVals.length > 1 ? Math.sqrt(devSqSum / (dVals.length - 1)) : 0;
      const doseSD = parseFloat(rawSD.toFixed(4));
      const rawCV = doseMean > 0 ? doseSD / doseMean : 0;
      const doseCV = parseFloat(rawCV.toFixed(4));
      const doseStatus = doseCV <= BAPETEN_LIMITS.reproducibilityCV ? "Lolos" : "Tidak Lolos";

      const misalignSum = (parsed.parameters.misalignX || 0.5) + (parsed.parameters.misalignY || 0.5);
      const sid = parsed.parameters.sidValue || 100;
      const collimationPct = sid > 0 ? (misalignSum / sid) * 100 : 0;
      const collimationStatus = collimationPct <= BAPETEN_LIMITS.collimationPct ? "Lolos" : "Tidak Lolos";

      const hvlMinRequired = getMinHvlRequired(parsed.parameters.kvpSeting || 70, parsed.deviceName || '');
      const hvlStatus = (parsed.parameters.hvlValue || 2.5) >= hvlMinRequired ? "Lolos" : "Tidak Lolos";

      const tubeLeakageVal = parsed.parameters.tubeLeakage || 0;
      const tubeLeakageStatus = Number(tubeLeakageVal) <= BAPETEN_LIMITS.tubeLeakage ? "Lolos" : "Tidak Lolos";

      let finalVerdict = "LOLOS UJI KESESUAIAN";
      if (
        kvpStatus === "Tidak Lolos" || 
        timeStatus === "Tidak Lolos" || 
        doseStatus === "Tidak Lolos" || 
        tubeLeakageStatus === "Tidak Lolos"
      ) {
        finalVerdict = "TIDAK LOLOS KESESUAIAN (Kritis)";
      } else if (hvlStatus === "Tidak Lolos" || collimationStatus === "Tidak Lolos") {
        finalVerdict = "LOLOS BERSYARAT (Butuh Filter Tambahan / Kalibrasi Kolimator)";
      }

      setImportStatus("Menyimpan rekor Uji Kesesuaian ke database...");

      const ukesData = {
        deviceName: parsed.deviceName || 'Pesawat Sinar-X Radiografi Umum',
        brand: parsed.brand || '',
        model: parsed.model || '',
        serialNumber: parsed.serialNumber || '',
        location: parsed.location || 'Ruang Radiologi',
        fasyankesName: parsed.fasyankesName || '',
        operatorName: parsed.operatorName || 'Ir. Bambang Wijaya, M.Si',
        testDate: parsed.testDate || new Date().toISOString().split('T')[0],
        kesimpulan: finalVerdict,
        parameters: {
          kvpSeting: parsed.parameters.kvpSeting || 80,
          kvpValues: kvpVals,
          timeSeting: parsed.parameters.timeSeting || 100,
          timeValues: timeVals,
          doseValues: dVals,
          sidValue: sid,
          misalignX: parsed.parameters.misalignX || 0.5,
          misalignY: parsed.parameters.misalignY || 0.5,
          hvlValue: parsed.parameters.hvlValue || 2.5,
          tubeLeakage: Number(tubeLeakageVal)
        },
        calculations: {
          kvpAvg: Number(kvpAvg.toFixed(2)),
          kvpDevPct: Number(kvpDevPct.toFixed(2)),
          kvpStatus,
          timeAvg: Number(timeAvg.toFixed(1)),
          timeDevPct: Number(timeDevPct.toFixed(1)),
          timeStatus,
          doseMean,
          doseSD,
          doseCV,
          doseStatus,
          collimationSum: misalignSum,
          collimationPct: Number(collimationPct.toFixed(2)),
          collimationStatus,
          hvlMinRequired,
          hvlStatus,
          tubeLeakageStatus,
          tubeLeakage: Number(tubeLeakageVal)
        },
        createdAt: serverTimestamp()
      };

      try {
        const docRef = await addDoc(collection(db, 'ukes_records'), ukesData);
        await logAction(
          `Mengimpor Uji Kesesuaian via Excel: ${ukesData.deviceName}`,
          'ukes_records',
          `Alat: ${ukesData.deviceName}, ID: ${docRef.id}`,
          'info'
        );
      } catch (err) {
        console.warn("Firestore save failed, saving locally:", err);
        const localItem = {
          ...ukesData,
          id: 'local-ukes-' + Date.now(),
          createdAt: new Date()
        };
        setRecords(prev => [localItem, ...prev]);
      }

      await pushNotification(
        'Rekor Ukes Berhasil Diimpor',
        `Hasil Uji Kesesuaian untuk ${ukesData.deviceName} berhasil diproses oleh AI.`,
        'success',
        'all',
        '/ukes'
      );

      showToast("Berhasil mengimpor data Ukes via AI Excel!", "success");
      setIsExcelModalOpen(false);
      setPastedText('');
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Gagal mengimpor data Excel. Harap periksa format data.", "error");
    } finally {
      setIsImporting(false);
      setImportStatus("");
    }
  };

  const executeDeleteRecord = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ukes_records', id));
      await logAction(`Menghapus Laporan Ukes`, 'ukes_records', `ID: ${id}`, 'warning');
      setRecords(prev => prev.filter(r => r.id !== id));
      if (selectedRecord?.id === id) setSelectedRecord(null);
      showToast("Laporan Uji Kesesuaian BAPETEN berhasil dihapus permanen.", "success");
    } catch (e) {
      try {
        handleFirestoreError(e, OperationType.DELETE, `ukes_records/${id}`);
      } catch (err) {
        // Fallback or ignore
      }
      setRecords(prev => prev.filter(r => r.id !== id));
      showToast("Catatan terhapus dari status tampilan.", "info");
    }
  };

  const handleDeleteRecord = (id: string) => {
    setDeleteConfirmId(id);
  };

  // Search filter
  const filteredRecords = records.filter(r => {
    const queryTerm = searchQuery.toLowerCase();
    return (
      (r.deviceName || "").toLowerCase().includes(queryTerm) ||
      (r.brand || "").toLowerCase().includes(queryTerm) ||
      (r.fasyankesName || "").toLowerCase().includes(queryTerm) ||
      (r.kesimpulan || "").toLowerCase().includes(queryTerm) ||
      (r.serialNumber || "").toLowerCase().includes(queryTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Atom className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Modul Uji Kesesuaian (Ukes) Radiologi
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest font-mono">
              Kalkulator Kepatuhan BAPETEN &amp; Pengujian Presisi Pesawat Sinar-X
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {records.length > 0 && (
            <button
              onClick={() => setIsPurgeConfirmOpen(true)}
              className="w-full lg:w-auto bg-rose-50/50 hover:bg-rose-500 hover:text-white text-rose-600 border border-rose-200/50 dark:border-rose-900/30 dark:bg-rose-950/20 font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Bersihkan Data Dummy</span>
            </button>
          )}
          <button
            onClick={handleOpenNew}
            className="w-full lg:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-indigo-500/10 hover:scale-[1.02] flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Mulai Uji Kesesuaian Baru</span>
          </button>
        </div>
      </div>

      {/* Grid of critical BAPETEN bounds */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-100/50 dark:bg-slate-950/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-800/80">
        <div className="p-3.5 bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-black uppercase font-mono">AKURASI TEGANGAN (kVp)</span>
            <span className="bg-amber-100 text-amber-850 text-[8px] font-black uppercase px-2 py-0.5 rounded">Batas Perpres</span>
          </div>
          <p className="text-xl font-black text-slate-850 dark:text-white font-mono mt-1">&le; 10% Deviation</p>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Perka BAPETEN No. 2 Tahun 2018</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-black uppercase font-mono">REPRODUKSIBILITAS DOSIS</span>
            <span className="bg-amber-100 text-amber-850 text-[8px] font-black uppercase px-2 py-0.5 rounded">Batas Perpres</span>
          </div>
          <p className="text-xl font-black text-slate-850 dark:text-white font-mono mt-1">CV &le; 0.05 (5%)</p>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Koefisien Variasi Paparan</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-slate-400 font-black uppercase font-mono">AKURASI KOLIMASI (X-RAY)</span>
            <span className="bg-amber-100 text-amber-850 text-[8px] font-black uppercase px-2 py-0.5 rounded">Batas Perpres</span>
          </div>
          <p className="text-xl font-black text-slate-850 dark:text-white font-mono mt-1">&le; 2% of SID</p>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Penyimpangan Berkas Sinar Cahaya</span>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-indigo-500 font-black uppercase font-mono">TOTAL REKORD UKES</span>
            <span className="bg-indigo-100 text-indigo-850 text-[8px] font-black uppercase px-2 py-0.5 rounded">Database</span>
          </div>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">{records.length} Berkas</p>
          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-tight">Kelaikan Pesawat Radiologi</span>
        </div>
      </div>

      {/* Control filters */}
      <div className="bg-white dark:bg-[#0e1422] p-4 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 font-mono uppercase tracking-widest pl-2">
          Arsip Sertifikasi Uji Kesesuaian BAPETEN
        </h3>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari fasyankes, tipe pesawat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 placeholder:text-slate-400 dark:text-white font-mono"
          />
        </div>
      </div>

      {/* Dynamic HVL Trend Chart against BAPETEN Standards */}
      {hvlTrendData.length > 0 && (
        <div className="bg-white dark:bg-[#0c111d] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <div>
              <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-550" />
                Tren Nilai Half Value Layer (HVL) vs Batas Regulasi BAPETEN
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-400 font-medium">
                Visualisasi historis kelaikan penetrasi radiasi berkas utama Sinar-X di lapangan dibandingkan toleransi keselamatan BAPETEN.
              </p>
            </div>
            <div className="flex items-center gap-4 text-[9px] font-mono tracking-tight shrink-0 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
                <span className="font-extrabold text-slate-700 dark:text-slate-300">HVL Terukur</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-red-500 inline-block text-red-500" />
                <span className="font-extrabold text-slate-700 dark:text-slate-300">Syarat BAPETEN</span>
              </div>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hvlTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" className="hidden dark:block" />
                <XAxis 
                  dataKey="date" 
                  stroke="#94a3b8" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 'auto']} 
                  stroke="#94a3b8" 
                  fontSize={8} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(v) => `${v} mm`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isLolos = Number(data.hvl) >= Number(data.standard);
                      return (
                        <div className="p-3 bg-slate-950/95 border border-slate-801 text-white shadow-2xl rounded-2xl text-[9px] font-mono leading-relaxed max-w-[280px]">
                          <p className="font-bold text-amber-500 mb-1 border-b border-white/10 pb-1">{data.date}</p>
                          <p className="line-clamp-1"><span className="text-slate-400">Instansi:</span> {data.facility}</p>
                          <p className="line-clamp-1"><span className="text-slate-400">Alat:</span> {data.device}</p>
                          <div className="flex justify-between gap-6 mt-1.5 pt-1 border-t border-white/5">
                            <span>HVL Terukur:</span>
                            <span className="font-black text-cyan-400">{Number(data.hvl).toFixed(2)} mm Al</span>
                          </div>
                          <div className="flex justify-between gap-6">
                            <span>Syarat Minimum:</span>
                            <span className="font-bold text-red-400">&ge; {Number(data.standard).toFixed(1)} mm Al</span>
                          </div>
                          <p className={`mt-2 font-black text-center uppercase tracking-wider py-0.5 rounded text-[8px] ${
                            isLolos ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
                          }`}>
                            {isLolos ? "LOLOS STANDAR" : "TIDAK LOLOS"}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="hvl"
                  stroke="#4f46e5"
                  strokeWidth={2.5}
                  dot={{ r: 4, strokeWidth: 1.5, stroke: "#ffffff" }}
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#4f46e5" }}
                />
                <Line
                  type="monotone"
                  dataKey="standard"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Screen Division */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table/List of Test records */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-[#0c111d] rounded-3xl border border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Memuat database BAPETEN...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-[#0c111d] rounded-3xl border border-slate-200 dark:border-slate-810">
              <Atom className="w-12 h-12 text-slate-200 dark:text-slate-850 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 font-mono mb-1">Tidak Ada Rekor Uji Kesesuaian</p>
              <p className="text-[10px] text-slate-400 font-medium">Buat rekor kepatuhan baru dengan mengeklik tombol di kanan atas.</p>
            </div>
          ) : (
            filteredRecords.map((r) => {
              const fails = r.kesimpulan.includes("TIDAK");
              const cond = r.kesimpulan.includes("BERSYARAT");
              return (
                <div
                  key={r.id}
                  onClick={() => {
                    setSelectedRecord(r);
                    if (window.innerWidth < 1024) {
                      setTimeout(() => {
                        document.getElementById('ukes-details-panel')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className={cn(
                    "bg-white dark:bg-[#0c111d] rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md cursor-pointer relative overflow-hidden group/card",
                    selectedRecord?.id === r.id 
                      ? "border-indigo-500 ring-2 ring-indigo-500/10 dark:bg-slate-900/10" 
                      : "border-slate-200 dark:border-slate-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-0 bottom-0 left-0 w-1.5",
                    fails ? "bg-red-500 animate-pulse" : cond ? "bg-amber-500" : "bg-emerald-500"
                  )} />

                  <div className="flex justify-between items-start gap-3">
                    <div className="pl-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight group-hover/card:text-indigo-500 transition-colors">
                          {r.deviceName}
                        </span>
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-850 text-slate-500 font-mono">
                          {r.brand} {r.model}
                        </span>
                      </div>

                      <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-extrabold font-mono uppercase tracking-tight mb-2">
                        {r.fasyankesName}
                      </p>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-slate-500 font-mono">
                        <div>
                          <span className="text-slate-400">No. Seri: </span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300">{r.serialNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Tgl Pengujian: </span>
                          <span className="font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {r.testDate}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">Analis Fisikawan: </span>
                          <span className="font-bold text-slate-600 dark:text-slate-400">{r.operatorName}</span>
                        </div>
                        <div>
                          <span className="text-slate-450 block uppercase text-[8px] text-indigo-500">Masa Kalibrasi Ulang:</span>
                          <span className="font-black text-slate-700 dark:text-slate-300">Setiap 2 Tahun</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl font-mono border",
                        fails ? "bg-red-50 text-red-650 border-red-200" :
                        cond ? "bg-amber-50 text-amber-600 border-amber-200" :
                        "bg-emerald-50 text-emerald-600 border-emerald-200"
                      )}>
                        {fails ? "TIDAK LOLOS" : cond ? "LOLOS BERSYARAT" : "LOLOS UKES"}
                      </span>
                      
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteRecord(r.id);
                        }}
                        className="opacity-0 group-hover/card:opacity-100 transition-opacity p-1 px-2 text-[9px] font-extrabold uppercase rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        Hapus
                      </motion.button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected record details panel */}
        <div id="ukes-details-panel" className="bg-white dark:bg-[#0c111d] rounded-2xl border border-slate-200 dark:border-slate-810 p-6 shadow-sm space-y-6 h-fit sticky top-6scroll-mt-20">
          {selectedRecord ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-850 dark:text-white uppercase tracking-wider font-mono">
                    Lembar Hasil Uji Kepatuhan
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                    ID: #{selectedRecord.id.slice(0, 10)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportUkesToPDF(selectedRecord)}
                    className="p-2 px-3 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    title="Ekspor PDF Kemenkes/BAPETEN Resmi"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Cetak PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const printW = window.open("", "_blank");
                      if (printW) {
                        printW.document.write(`
                          <html>
                            <head>
                              <title>LAPORAN UJI KESESUAIAN</title>
                              <style>
                                body { font-family: sans-serif; padding: 40px; }
                                .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 15px; }
                                .title { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
                                .meta { margin: 20px 0; font-size: 12px; }
                                table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                                th { bg-color: #f5f5f5; font-weight: bold; }
                                .verdict { font-size: 16px; font-weight: bold; text-align: center; margin: 30px 0; border: 2px solid #000; padding: 15px; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <div class="title">SERTIFIKAT UJI KESESUAIAN (CONFORMITY CERTIFICATE)</div>
                                <div style="font-size: 11px;">BERDASARKAN KEPUTUSAN KEPALA BAPETEN NO. 2 TAHUN 2018</div>
                              </div>
                              <div class="meta">
                                <b>NAMA ALAT:</b> ${selectedRecord.deviceName}<br/>
                                <b>MERK MERK/SN:</b> ${selectedRecord.brand} / ${selectedRecord.serialNumber}<br/>
                                <b>RUMAH SAKIT:</b> ${selectedRecord.fasyankesName}<br/>
                                <b>LOKASI:</b> ${selectedRecord.location}<br/>
                                <b>TANGGAL UJI:</b> ${selectedRecord.testDate}<br/>
                                <b>FISIKAWAN MEDIS:</b> ${selectedRecord.operatorName}
                              </div>
                              
                              <h3>1. AKURASI TEGANGAN & WAKTU PENYINARAN</h3>
                              <table>
                                <tr>
                                  <th>Parameter Uji</th>
                                  <th>Nilai Seting</th>
                                  <th>Nilai Rata-rata Ukur</th>
                                  <th>Penyimpangan (%)</th>
                                  <th>Ambang Batas BAPETEN</th>
                                  <th>Kesimpulan</th>
                                </tr>
                                <tr>
                                  <td>Tegangan Tabung (kVp)</td>
                                  <td>${selectedRecord.parameters.kvpSeting} kVp</td>
                                  <td>${selectedRecord.calculations.kvpAvg.toFixed(2)} kVp</td>
                                  <td>${selectedRecord.calculations.kvpDevPct.toFixed(2)}%</td>
                                  <td>&le; ±10%</td>
                                  <td><b>${selectedRecord.calculations.kvpStatus.toUpperCase()}</b></td>
                                </tr>
                                <tr>
                                  <td>Waktu Eksposur (time)</td>
                                  <td>${selectedRecord.parameters.timeSeting} ms</td>
                                  <td>${selectedRecord.calculations.timeAvg.toFixed(2)} ms</td>
                                  <td>${selectedRecord.calculations.timeDevPct.toFixed(2)}%</td>
                                  <td>&le; ±10%</td>
                                  <td><b>${selectedRecord.calculations.timeStatus.toUpperCase()}</b></td>
                                </tr>
                              </table>

                              <h3>2. REPRODUKSIBILITAS DOSIS PAPARAN</h3>
                              <p>Dosis terukur (mGy): [${selectedRecord.parameters.doseValues.join(', ')}]</p>
                              <table>
                                <tr>
                                  <th>Dosis Rata-rata</th>
                                  <th>Standar Deviasi (SD)</th>
                                  <th>Koefisien Variasi (CV)</th>
                                  <th>Ambang Batas CV</th>
                                  <th>Status</th>
                                </tr>
                                <tr>
                                  <td>${selectedRecord.calculations.doseMean.toFixed(4)} mGy</td>
                                  <td>${selectedRecord.calculations.doseSD.toFixed(4)}</td>
                                  <td>${selectedRecord.calculations.doseCV.toFixed(4)}</td>
                                  <td>&le; 0.05 (5%)</td>
                                  <td><b>${selectedRecord.calculations.doseStatus.toUpperCase()}</b></td>
                                </tr>
                              </table>

                              <h3>3. AKURASI KOLIMATOR FIELD ALIGNMENT</h3>
                              <table>
                                <tr>
                                  <th>Jarak SID</th>
                                  <th>Penyimpangan X + Y</th>
                                  <th>Rasio Penyimpangan terhadap SID</th>
                                  <th>Status Batas (&le; 2%)</th>
                                </tr>
                                <tr>
                                  <td>${selectedRecord.parameters.sidValue} cm</td>
                                  <td>${selectedRecord.calculations.collimationSum} cm</td>
                                  <td>${selectedRecord.calculations.collimationPct.toFixed(2)}%</td>
                                  <td><b>${selectedRecord.calculations.collimationStatus.toUpperCase()}</b></td>
                                </tr>
                              </table>

                              <h3>4. KETEBALAN PENYARINGAN EKSTRA (HALF VALUE LAYER / HVL)</h3>
                              <table>
                                <tr>
                                  <th>Voltase Pengoperasian (Set)</th>
                                  <th>Ketebalan HVL Terukur</th>
                                  <th>Standar Minimum BAPETEN</th>
                                  <th>Status Evaluasi</th>
                                </tr>
                                <tr>
                                  <td>${selectedRecord.parameters.kvpSeting} kVp</td>
                                  <td>${(selectedRecord.parameters.hvlValue || 0).toFixed(2)} mm Al</td>
                                  <td>&ge; ${getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName)} mm Al</td>
                                  <td><b>${((selectedRecord.parameters.hvlValue || 0) >= getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName)) ? "LOLOS STANDAR" : "TIDAK LOLOS (LEMAH)"}</b></td>
                                </tr>
                              </table>

                              <h3>5. KEBOCORAN RADIASI WADAH TABUNG (TUBE HOUSING LEAKAGE)</h3>
                              <table>
                                <tr>
                                  <th>Jarak Pengukuran</th>
                                  <th>Laju Dosis Bocor Terukur</th>
                                  <th>Standar Maksimum BAPETEN</th>
                                  <th>Status Evaluasi</th>
                                </tr>
                                <tr>
                                  <td>1 Meter</td>
                                  <td>${(selectedRecord.parameters.tubeLeakage || 0).toFixed(2)} mGy/jam</td>
                                  <td>&le; 1.0 mGy/jam</td>
                                  <td><b>${(selectedRecord.calculations?.tubeLeakageStatus || (selectedRecord.parameters.tubeLeakage <= 1.0 ? "Lolos" : "Tidak Lolos")).toUpperCase()}</b></td>
                                </tr>
                              </table>

                              ${selectedRecord.customParameters && Object.keys(selectedRecord.customParameters).length > 0 ? `
                                <h3>6. PARAMETER PENGUJIAN TAMBAHAN / KUSTOM</h3>
                                <table>
                                  <tr>
                                    <th>Parameter Kustom</th>
                                    <th>Status Evaluasi</th>
                                  </tr>
                                  ${Object.entries(selectedRecord.customParameters as Record<string, string>).map(([name, status]) => `
                                    <tr>
                                      <td>${name}</td>
                                      <td><b>${status.toUpperCase()}</b></td>
                                    </tr>
                                  `).join('')}
                                </table>
                              ` : ''}

                              <div class="verdict">
                                KESIMPULAN METROLOGI:<br/>
                                <span style="color: ${selectedRecord.kesimpulan.includes('TIDAK') ? 'red' : 'green'}">${selectedRecord.kesimpulan}</span>
                              </div>

                              <div style="margin-top: 50px; text-align: right;">
                                Analis Fisikawan Medis,<br/><br/><br/>
                                <u>${selectedRecord.operatorName}</u>
                              </div>
                            </body>
                          </html>
                        `);
                        printW.document.close();
                      }
                    }}
                    className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                    title="Cetak Sertifikat Kelayakan BAPETEN (HTML)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Specs and facility card */}
              <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl flex flex-col gap-2 font-mono text-[10px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">FASYANKES / MITRA</span>
                  <span className="font-extrabold text-slate-800 dark:text-white uppercase text-right">{selectedRecord.fasyankesName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MERK PESAWAT</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{selectedRecord.brand} {selectedRecord.model || ''}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NOMOR SERI</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{selectedRecord.serialNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TANGGAL UJI</span>
                  <span className="font-extrabold text-slate-800 dark:text-white">{selectedRecord.testDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ANALIS FISIKAWAN</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{selectedRecord.operatorName}</span>
                </div>
              </div>

              {/* Detailed metrics breakdown */}
              <div className="space-y-4">
                {/* Tegangan section */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3.5">
                  <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex items-center justify-between">
                    <span>1. Akurasi Tegangan &amp; Waktu</span>
                    <span className="bg-indigo-100 text-indigo-850 text-[8px] px-1.5 py-0.5 rounded uppercase">U95</span>
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                      <span className="text-slate-400 block pb-1 font-bold text-[8px] uppercase font-mono">Tegangan (Set {selectedRecord.parameters.kvpSeting} kVp)</span>
                      <p className="font-extrabold text-xs text-slate-800 dark:text-white">Avg: {selectedRecord.calculations.kvpAvg.toFixed(2)} kVp</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Deviasi: {selectedRecord.calculations.kvpDevPct.toFixed(2)}% (Batas &le; 10%)</p>
                      <span className={cn(
                        "text-[8px] font-black uppercase mt-1 inline-block px-1.5 py-0.5 rounded-md font-mono",
                        selectedRecord.calculations.kvpStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      )}>{selectedRecord.calculations.kvpStatus} BAPETEN</span>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                      <span className="text-slate-400 block pb-1 font-bold text-[8px] uppercase font-mono">Waktu (Set {selectedRecord.parameters.timeSeting} ms)</span>
                      <p className="font-extrabold text-xs text-slate-800 dark:text-white">Avg: {selectedRecord.calculations.timeAvg.toFixed(2)} ms</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 font-mono">Deviasi: {selectedRecord.calculations.timeDevPct.toFixed(2)}% (Batas &le; 10%)</p>
                      <span className={cn(
                        "text-[8px] font-black uppercase mt-1 inline-block px-1.5 py-0.5 rounded-md font-mono",
                        selectedRecord.calculations.timeStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      )}>{selectedRecord.calculations.timeStatus} BAPETEN</span>
                    </div>
                  </div>

                  {/* Raw runs table for Tegangan and Waktu */}
                  <div className="mt-3 overflow-x-auto scroll-smooth snap-x touch-pan-x scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent pb-1">
                    <div className="bg-white dark:bg-[#0c111d] rounded-xl border border-slate-150 dark:border-slate-850 overflow-hidden shadow-sm min-w-[440px] sm:min-w-0">
                      <table className="w-full text-left border-collapse text-[9px] font-mono">
                        <thead>
                          <tr className="bg-slate-50/60 dark:bg-slate-900/60 border-b border-indigo-100 dark:border-indigo-950 text-slate-400 font-extrabold uppercase tracking-wider">
                            <th className="px-3 py-2">Parameter</th>
                            <th className="px-3 py-2 text-center">Run 1</th>
                            <th className="px-3 py-2 text-center">Run 2</th>
                            <th className="px-3 py-2 text-center">Run 3</th>
                            <th className="px-3 py-2 text-center bg-slate-50/50 dark:bg-slate-900/10 text-indigo-600 dark:text-indigo-400">Rataan</th>
                            <th className="px-2 py-2 text-center w-12">Salin</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-colors">
                            <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">Tegangan (kVp)<br/><span className="text-[7.5px] text-slate-400 font-mono">Set: {selectedRecord.parameters.kvpSeting} kVp</span></td>
                            <td className="px-3 py-2 text-center text-slate-500 font-bold">{(selectedRecord.parameters.kvpValues?.[0] ?? selectedRecord.parameters.kvp1 ?? '-')}</td>
                            <td className="px-3 py-2 text-center text-slate-500 font-bold">{(selectedRecord.parameters.kvpValues?.[1] ?? selectedRecord.parameters.kvp2 ?? '-')}</td>
                            <td className="px-3 py-2 text-center text-slate-500 font-bold">{(selectedRecord.parameters.kvpValues?.[2] ?? selectedRecord.parameters.kvp3 ?? '-')}</td>
                            <td className="px-3 py-2 text-center font-extrabold text-indigo-600 dark:text-indigo-400 bg-slate-50/20 dark:bg-slate-950/20">{selectedRecord.calculations.kvpAvg.toFixed(2)}</td>
                            <td className="px-2 py-1 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const kvpVals = selectedRecord.parameters.kvpValues || [];
                                  const txt = `Tegangan (kVp) [Setting: ${selectedRecord.parameters.kvpSeting} kVp] - Run 1: ${kvpVals[0] ?? selectedRecord.parameters.kvp1 ?? '-'}, Run 2: ${kvpVals[1] ?? selectedRecord.parameters.kvp2 ?? '-'}, Run 3: ${kvpVals[2] ?? selectedRecord.parameters.kvp3 ?? '-'}, Rataan: ${selectedRecord.calculations.kvpAvg.toFixed(2)}`;
                                  copyToClipboard(txt, 'Tegangan');
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-90 inline-flex items-center justify-center cursor-pointer"
                                title="Salin Baris Tegangan"
                              >
                                {copiedRow === 'Tegangan' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>
                          <tr className="hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-colors">
                            <td className="px-3 py-2 font-bold text-slate-600 dark:text-slate-300">Waktu (ms)<br/><span className="text-[7.5px] text-slate-400 font-mono">Set: {selectedRecord.parameters.timeSeting} ms</span></td>
                            <td className="px-3 py-2 text-center text-slate-500 font-bold">{(selectedRecord.parameters.timeValues?.[0] ?? selectedRecord.parameters.time1 ?? '-')}</td>
                            <td className="px-3 py-2 text-center text-slate-500 font-bold">{(selectedRecord.parameters.timeValues?.[1] ?? selectedRecord.parameters.time2 ?? '-')}</td>
                            <td className="px-3 py-2 text-center text-slate-500 font-bold">{(selectedRecord.parameters.timeValues?.[2] ?? selectedRecord.parameters.time3 ?? '-')}</td>
                            <td className="px-3 py-2 text-center font-extrabold text-indigo-600 dark:text-indigo-400 bg-slate-50/20 dark:bg-slate-950/20">{selectedRecord.calculations.timeAvg.toFixed(2)}</td>
                            <td className="px-2 py-1 text-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const timeVals = selectedRecord.parameters.timeValues || [];
                                  const txt = `Waktu (ms) [Setting: ${selectedRecord.parameters.timeSeting} ms] - Run 1: ${timeVals[0] ?? selectedRecord.parameters.time1 ?? '-'}, Run 2: ${timeVals[1] ?? selectedRecord.parameters.time2 ?? '-'}, Run 3: ${timeVals[2] ?? selectedRecord.parameters.time3 ?? '-'}, Rataan: ${selectedRecord.calculations.timeAvg.toFixed(2)}`;
                                  copyToClipboard(txt, 'Waktu');
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 active:scale-90 inline-flex items-center justify-center cursor-pointer"
                                title="Salin Baris Waktu"
                              >
                                {copiedRow === 'Waktu' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Reproducibility section */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex justify-between items-center">
                    <span>2. Reproduksibilitas Paparan Dosis</span>
                    <span className="text-slate-400 font-bold bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 text-[8.5px] px-1.5 py-0.5 rounded font-mono inline-flex items-center gap-1.5 shadow-sm">
                      <span>5 Runs</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const runsText = [1,2,3,4,5].map(i => `Run ${i}: ${selectedRecord.parameters[`dose${i}`]?.toFixed(3) || '-'} mGy`).join(', ');
                          const txt = `Reproduksibilitas Paparan Dosis (5 Runs) - ${runsText}. Rataan: ${selectedRecord.calculations.doseMean.toFixed(4)} mGy, CV: ${(selectedRecord.calculations.doseCV * 100).toFixed(4)}%`;
                          copyToClipboard(txt, 'Dosis');
                        }}
                        className="hover:text-indigo-600 dark:hover:text-white transition-colors p-0.5 cursor-pointer"
                        title="Salin Data Dosis"
                      >
                        {copiedRow === 'Dosis' ? <Check className="w-2.5 h-2.5 text-emerald-500 animate-bounce" /> : <ClipboardCopy className="w-2.5 h-2.5 text-slate-400 dark:text-slate-300" />}
                      </button>
                    </span>
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 font-mono text-[10px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Paparan Dosis Rata-rata:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedRecord.calculations.doseMean.toFixed(4)} mGy</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Standar Deviasi (SD):</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {selectedRecord.calculations.doseSD !== undefined && selectedRecord.calculations.doseSD !== null 
                          ? selectedRecord.calculations.doseSD.toFixed(4) 
                          : (0).toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Koefisien Variasi (CV):</span>
                      <span className={cn(
                        "font-black text-xs px-2 py-0.5 rounded font-mono",
                        selectedRecord.calculations.doseCV <= BAPETEN_LIMITS.reproducibilityCV 
                          ? "bg-emerald-100 text-emerald-800" 
                          : "bg-red-100 text-red-800"
                      )}>
                        {selectedRecord.calculations.doseCV.toFixed(4)} ({(selectedRecord.calculations.doseCV * 100).toFixed(4)}%)
                      </span>
                    </div>
                    <div className="text-[8.5px] text-slate-401 dark:text-slate-450 border-t border-slate-201 dark:border-slate-801 pt-1 ml-0.5">
                      Batas Regulasi CV BAPETEN: &le; 0.05 (5.0000%)
                    </div>
                  </div>

                  {/* Horizontal visualization of 5 runs data */}
                  <div className="overflow-x-auto scroll-smooth snap-x touch-pan-x scrollbar-thin scrollbar-thumb-indigo-500/20 scrollbar-track-transparent pb-1">
                    <div className="flex sm:grid sm:grid-cols-5 gap-2 mt-3 min-w-[340px] sm:min-w-0 p-1">
                      {[1, 2, 3, 4, 5].map((idx) => {
                        const doseVals = selectedRecord.parameters.doseValues || [];
                        const doseVal = doseVals[idx - 1] ?? selectedRecord.parameters[`dose${idx}`];
                        return (
                          <div key={idx} className="bg-white dark:bg-[#0c111d] rounded-xl p-2 border border-slate-150 dark:border-slate-850 text-center shadow-sm flex-1 min-w-[70px] sm:min-w-0">
                            <span className="text-[7px] text-slate-400 font-black uppercase block font-mono">Run {idx}</span>
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 block font-mono mt-0.5">{doseVal !== undefined && doseVal !== null ? Number(doseVal).toFixed(3) : '-'}</span>
                            <span className="text-[6.5px] text-slate-400 block font-mono">mGy</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Collimator beam alignment field */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex justify-between items-center">
                    <span>3. Kolimasi Lapangan Cahaya vs Berkas Sinar &amp; HVL</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const txt = `Kolimasi lapangan cahaya vs berkas Sinar & HVL - SID: ${selectedRecord.parameters.sidValue} cm, Penyimpangan: ${selectedRecord.calculations.collimationSum} cm (${selectedRecord.calculations.collimationPct.toFixed(2)}%), HVL: ${(selectedRecord.parameters.hvlValue || 0).toFixed(2)} mm Al (Standard: >= ${getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName).toFixed(1)} mm Al)`;
                        copyToClipboard(txt, 'Kolimasi_HVL');
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                      title="Salin Data Kolimasi & HVL"
                    >
                      {copiedRow === 'Kolimasi_HVL' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                    </button>
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 font-mono text-[10px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Jarak Fokus Film (SID):</span>
                      <span className="font-bold">{selectedRecord.parameters.sidValue} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Penyimpangan Lapangan (X + Y):</span>
                      <span className="font-bold">{selectedRecord.calculations.collimationSum} cm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Deviasi Lapangan terhadap SID:</span>
                      <span className="font-black text-indigo-600">{selectedRecord.calculations.collimationPct.toFixed(2)}% (Batas &le; 2%)</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 mt-1">
                      <span className="text-slate-400 text-[8px] uppercase font-bold font-mono">Status Kolimasi:</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono",
                        selectedRecord.calculations.collimationStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                      )}>{selectedRecord.calculations.collimationStatus} BAPETEN</span>
                    </div>
                    
                    <div className="flex justify-between border-t border-slate-201 dark:border-slate-801 pt-2 mt-1">
                      <span className="text-slate-400">Ketebalan HVL Terukur:</span>
                      <span className="font-bold">{(selectedRecord.parameters.hvlValue || 0).toFixed(2)} mm Al</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">HVL Standar Min. BAPETEN:</span>
                      <span className="font-bold">&ge; {getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName).toFixed(1)} mm Al</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 text-[8px] uppercase font-bold font-mono">Status Filter HVL:</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono",
                        (selectedRecord.parameters.hvlValue || 0) >= getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName)
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800 animate-pulse font-extrabold"
                      )}>
                        {(selectedRecord.parameters.hvlValue || 0) >= getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName) ? "Lolos" : "Tidak Lolos"}
                      </span>
                    </div>
                  </div>

                  {selectedRecord.parameters.hvlValue < getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName) && (
                    <div className="mt-2 text-red-750 dark:text-red-400 bg-red-100/30 dark:bg-rose-950/25 border border-red-200 dark:border-rose-900/40 rounded-xl p-3 flex gap-2 text-[9px]/[1.3] font-semibold leading-normal font-mono">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                      <span>
                        ⚠️ PERINGATAN BAPETEN: Nilai HVL Terukur ({(selectedRecord.parameters.hvlValue || 0).toFixed(2)} mm Al) di bawah standar proteksi radiasi BAPETEN (&ge; {getMinHvlRequired(selectedRecord.parameters.kvpSeting, selectedRecord.deviceName).toFixed(1)} mm Al untuk {selectedRecord.parameters.kvpSeting} kVp)! Resiko pancaran radiasi lunak tinggi, butuh filter tambahan segera.
                      </span>
                    </div>
                  )}

                  {/* Individual deviation and HVL cards */}
                  <div className="grid grid-cols-3 gap-2 mt-2 font-mono text-[9px]">
                    <div className="p-2 bg-white dark:bg-[#0c111d] rounded-xl border border-slate-150 dark:border-slate-850 shadow-sm">
                      <span className="text-slate-404 block text-[7px] font-black uppercase font-mono">Selisih X (&Delta;X)</span>
                      <p className="font-black text-[10px] text-slate-800 dark:text-slate-200 mt-0.5">{(selectedRecord.parameters.misalignX || 0).toFixed(1)} cm</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-[#0c111d] rounded-xl border border-slate-150 dark:border-slate-850 shadow-sm">
                      <span className="text-slate-404 block text-[7px] font-black uppercase font-mono">Selisih Y (&Delta;Y)</span>
                      <p className="font-black text-[10px] text-slate-800 dark:text-slate-200 mt-0.5">{(selectedRecord.parameters.misalignY || 0).toFixed(1)} cm</p>
                    </div>
                    <div className="p-2 bg-white dark:bg-[#0c111d] rounded-xl border border-slate-150 dark:border-slate-850 shadow-sm flex flex-col justify-between">
                      <span className="text-slate-404 block text-[7px] font-black uppercase font-mono">HVL Parameter</span>
                      <div className="flex justify-between items-end mt-0.5 font-mono">
                        <span className="font-black text-[11px] text-[#2e5bff] dark:text-indigo-400">{(selectedRecord.parameters.hvlValue || 0).toFixed(2)}</span>
                        <span className="text-[7px] text-slate-400 pb-0.5">mm Al</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Kebocoran Radiasi Wadah Tabung */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
                  <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex justify-between items-center">
                    <span>4. Kebocoran Radiasi Wadah Tabung</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const txt = `Kebocoran Radiasi Wadah Tabung - Laju Dosis Bocor pada 1m: ${(selectedRecord.parameters.tubeLeakage || 0).toFixed(2)} mGy/jam (Batas BAPETEN: <= 1.0 mGy/jam)`;
                        copyToClipboard(txt, 'Kebocoran_Radiasi');
                      }}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                      title="Salin Data Kebocoran"
                    >
                      {copiedRow === 'Kebocoran_Radiasi' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                    </button>
                  </h4>
                  <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 font-mono text-[10px] space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Laju Dosis Bocor (1 meter):</span>
                      <span className="font-bold">{(selectedRecord.parameters.tubeLeakage || 0).toFixed(2)} mGy/jam</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batas Maksimum BAPETEN:</span>
                      <span className="font-bold">&le; 1.00 mGy/jam</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-2 mt-1">
                      <span className="text-slate-400 text-[8px] uppercase font-bold font-mono">Status Kebocoran:</span>
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded font-mono",
                        selectedRecord.calculations.tubeLeakageStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800 animate-pulse font-extrabold"
                      )}>{selectedRecord.calculations.tubeLeakageStatus} BAPETEN</span>
                    </div>
                  </div>
                  {selectedRecord.calculations.tubeLeakageStatus === 'Tidak Lolos' && (
                    <div className="mt-2 text-red-750 dark:text-red-400 bg-red-100/30 dark:bg-rose-950/25 border border-red-200 dark:border-rose-900/40 rounded-xl p-3 flex gap-2 text-[9px]/[1.3] font-semibold leading-normal font-mono glow-fail-danger">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                      <span>
                        ⚠️ PENDETEKSIAN BAHAYA: Kebocoran Radiasi Wadah Tabung ({(selectedRecord.parameters.tubeLeakage || 0).toFixed(2)} mGy/jam) melanggar batas keselamatan BAPETEN! Sangat berbahaya jika dioperasikan!
                      </span>
                    </div>
                  )}
                </div>

                {/* Section 5: Parameter Tambahan (Kustom) */}
                {selectedRecord.customParameters && Object.keys(selectedRecord.customParameters).length > 0 && (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5">
                    <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex justify-between items-center">
                      <span>5. Parameter Pengujian Kustom / Tambahan</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const customText = Object.entries(selectedRecord.customParameters as Record<string, string>)
                            .map(([name, status]) => `${name}: ${status}`)
                            .join(', ');
                          const txt = `Parameter Pengujian Kustom - ${customText}`;
                          copyToClipboard(txt, 'Parameter_Kustom');
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                        title="Salin Data Parameter Kustom"
                      >
                        {copiedRow === 'Parameter_Kustom' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
                      </button>
                    </h4>
                    <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 font-mono text-[10px] space-y-2">
                      {Object.entries(selectedRecord.customParameters as Record<string, string>).map(([name, status]) => (
                        <div key={name} className="flex justify-between items-center py-1 border-b border-slate-100 dark:border-slate-900 last:border-b-0">
                          <span className="text-slate-650 dark:text-slate-350">{name}:</span>
                          <span className={cn(
                            "text-[8.5px] font-black uppercase px-2 py-0.5 rounded font-mono",
                            status === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800 animate-pulse font-extrabold"
                          )}>{status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Final Verdict Compliance statement */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-indigo-100/50 dark:from-slate-900/60 dark:to-indigo-950/20 border border-indigo-200 rounded-2xl text-center">
                <span className="text-[9px] text-slate-401 font-black uppercase tracking-wider block font-mono">Kesimpulan Akhir Kepatuhan BAPETEN</span>
                <p className={cn(
                  "text-xs font-black font-mono mt-1.5 uppercase tracking-tight",
                  selectedRecord.kesimpulan.includes('TIDAK') ? "text-red-650" : selectedRecord.kesimpulan.includes('BERSYARAT') ? "text-amber-500" : "text-emerald-600"
                )}>
                  {selectedRecord.kesimpulan}
                </p>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center text-slate-400">
              <FileSpreadsheet className="w-12 h-12 text-slate-150 dark:text-slate-850 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest font-mono">Pilih Rekor Ukes</p>
              <p className="text-[9px] text-slate-400 mt-1 uppercase leading-relaxed font-mono">Klik salah satu berkas di sebelah kiri untuk menampilkan rincian kalkulasi kelaikan penyinaran radiasi secara terperinci.</p>
            </div>
          )}
        </div>
      </div>

      {/* Conformity Test Creator Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0c111d] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <form onSubmit={handleSaveRecord} className="flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Atom className="w-5 h-5 text-indigo-600 animate-spin" />
                    <div>
                      <h3 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider font-mono">
                        Pencatatan Uji Kesesuaian BAPETEN Baru
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                        Isi form parameter ukur fisik radiologi diagnostik
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    title="Tutup"
                    className="p-1.5 hover:bg-slate-50 dark:text-slate-300 rounded-lg text-slate-401"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  {/* Base Metadata Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="formDeviceName" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block font-mono">Jenis Pesawat Radiologi</label>
                      <select
                        id="formDeviceName"
                        title="Jenis Pesawat Radiologi"
                        value={formDeviceName}
                        onChange={(e) => setFormDeviceName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
                      >
                        <option value="Pesawat Sinar-X Radiografi Umum">Pesawat Sinar-X Radiografi Umum (General)</option>
                        <option value="Pesawat Sinar-X Radiografi Mobile">Pesawat Sinar-X Radiografi Mobile (Mobile Rail)</option>
                        <option value="Pesawat Sinar-X Radiografi Digital & Analog DR/CR">Pesawat Sinar-X Radiografi Digital & Analog DR/CR</option>
                        <option value="Dental X-Ray (Panoramic & Cephalometric)">Dental Panoramic / Dental Cephalometric</option>
                        <option value="Dental Intraoral Periapikal">Dental Intraoral Periapikal</option>
                        <option value="Pesawat Sinar-X Dental Intraoral Portabel (Handheld)">Pesawat Sinar-X Dental Intraoral Portabel (Handheld)</option>
                        <option value="Dental Cone Beam CT (CBCT 3D)">Dental Cone Beam CT (CBCT 3D)</option>
                        <option value="CT-Scan Multislice">CT-Scan Multislice</option>
                        <option value="Pesawat Sinar-X Computed Tomography Simulasi (CT-Simulator)">Pesawat Sinar-X Computed Tomography Simulasi (CT-Simulator)</option>
                        <option value="Mammografi Pesawat Sinar-X">Mammografi Pesawat Sinar-X (Mammography Unit)</option>
                        <option value="Fluoroscopy C-Arm Bedah">Fluoroscopy C-Arm Bedah (Surgical C-Arm)</option>
                        <option value="Pesawat Sinar-X Bedah Orthopedi (Mini C-Arm)">Pesawat Sinar-X Bedah Orthopedi (Mini C-Arm)</option>
                        <option value="Cath Lab / Angiografi">Cath Lab / Angiografi (Interventional Cardiology)</option>
                        <option value="Pesawat Sinar-X Fluoroskopi Diagnostik (Stationary General)">Pesawat Sinar-X Fluoroskopi Diagnostik (Stationary General)</option>
                        <option value="Pesawat Sinar-X Terapi (Orthovoltage / Superficial)">Pesawat Sinar-X Terapi (Orthovoltage / Superficial)</option>
                        <option value="Pesawat Sinar-X Bone Densitometer (DEXA)">Pesawat Sinar-X Bone Densitometer (DEXA)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block font-mono">Nama Fasyankes / Rumah Sakit</label>
                      <input
                        type="text"
                        placeholder="e.g., RSUD Harapan Bangsa"
                        value={formFasyankes}
                        onChange={(e) => setFormFasyankes(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block font-mono">Merek Pesawat</label>
                      <input
                        type="text"
                        placeholder="e.g., Shimadzu / Sirona"
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block font-mono">Tipe / Model &amp; S/N</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Model"
                          value={formModel}
                          onChange={(e) => setFormModel(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none font-mono"
                        />
                        <input
                          type="text"
                          placeholder="No Seri"
                          value={formSerialNumber}
                          onChange={(e) => setFormSerialNumber(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="formOperator" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block font-mono">Fisikawan Medis Penguji</label>
                      <input
                        id="formOperator"
                        title="Fisikawan Medis Penguji"
                        placeholder="Nama Penguji"
                        type="text"
                        value={formOperator}
                        onChange={(e) => setFormOperator(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="formTestDate" className="text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest block font-mono">Tanggal Pengujian</label>
                      <input
                        id="formTestDate"
                        title="Tanggal Pengujian"
                        placeholder="Pilih Tanggal"
                        type="date"
                        value={formTestDate}
                        onChange={(e) => setFormTestDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Calculations Input Section */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-5 space-y-4">
                    <h4 className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono flex items-center gap-1.5 mb-1">
                      <Calculator className="w-4 h-4" />
                      Data Pengukuran &amp; Perhitungan Sinar-X
                    </h4>

                    {/* Tegangan (kVp) */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono">Akurasi Tegangan (kVp)</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                          calculated.kvpStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        )}>Status: {calculated.kvpStatus} (Dev {calculated.kvpDevPct.toFixed(1)}%)</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                        <div>
                          <label htmlFor="kvpSet" className="text-[8px] text-slate-400 block mb-0.5">kVp Seting</label>
                          <input id="kvpSet" title="kVp Seting" placeholder="0" type="number" value={kvpSet} onChange={(e) => setKvpSet(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="kvp1" className="text-[8px] text-slate-400 block mb-0.5">Run 1</label>
                          <input id="kvp1" title="kVp Run 1" placeholder="0" type="number" value={kvp1} onChange={(e) => setKvp1(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="kvp2" className="text-[8px] text-slate-400 block mb-0.5">Run 2</label>
                          <input id="kvp2" title="kVp Run 2" placeholder="0" type="number" value={kvp2} onChange={(e) => setKvp2(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="kvp3" className="text-[8px] text-slate-400 block mb-0.5">Run 3</label>
                          <input id="kvp3" title="kVp Run 3" placeholder="0" type="number" value={kvp3} onChange={(e) => setKvp3(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                      </div>
                    </div>

                    {/* Waktu Eksposur (ms) */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono">Akurasi Waktu Penyinaran (ms)</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                          calculated.timeStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                        )}>Status: {calculated.timeStatus} (Dev {calculated.timeDevPct.toFixed(1)}%)</span>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                        <div>
                          <label htmlFor="timeSet" className="text-[8px] text-slate-400 block mb-0.5">Time Set (ms)</label>
                          <input id="timeSet" title="Time Set (ms)" placeholder="0" type="number" value={timeSet} onChange={(e) => setTimeSet(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="time1" className="text-[8px] text-slate-400 block mb-0.5">Run 1</label>
                          <input id="time1" title="Time Run 1 (ms)" placeholder="0" type="number" value={time1} onChange={(e) => setTime1(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="time2" className="text-[8px] text-slate-400 block mb-0.5">Run 2</label>
                          <input id="time2" title="Time Run 2 (ms)" placeholder="0" type="number" value={time2} onChange={(e) => setTime2(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="time3" className="text-[8px] text-slate-400 block mb-0.5">Run 3</label>
                          <input id="time3" title="Time Run 3 (ms)" placeholder="0" type="number" value={time3} onChange={(e) => setTime3(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                      </div>
                    </div>

                    {/* Reproduksibilitas (5 Runs) */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono">Reproduksibilitas Dosis Paparan (mGy)</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                          calculated.doseStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-200 text-red-800"
                        )}>Status: {calculated.doseStatus} (CV: {(calculated.doseCV * 100).toFixed(4)}% | SD: {calculated.doseSD.toFixed(4)})</span>
                      </div>
                      <div className="grid grid-cols-5 gap-2 text-[10px] font-mono">
                        <div>
                          <label htmlFor="dose1" className="text-[8px] text-slate-400 block mb-0.5">Run 1</label>
                          <input id="dose1" title="Dosis Run 1 (mGy)" placeholder="0.0" type="number" step="any" value={dose1} onChange={(e) => setDose1(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="dose2" className="text-[8px] text-slate-400 block mb-0.5">Run 2</label>
                          <input id="dose2" title="Dosis Run 2 (mGy)" placeholder="0.0" type="number" step="any" value={dose2} onChange={(e) => setDose2(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="dose3" className="text-[8px] text-slate-400 block mb-0.5">Run 3</label>
                          <input id="dose3" title="Dosis Run 3 (mGy)" placeholder="0.0" type="number" step="any" value={dose3} onChange={(e) => setDose3(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="dose4" className="text-[8px] text-slate-400 block mb-0.5">Run 4</label>
                          <input id="dose4" title="Dosis Run 4 (mGy)" placeholder="0.0" type="number" step="any" value={dose4} onChange={(e) => setDose4(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="dose5" className="text-[8px] text-slate-400 block mb-0.5">Run 5</label>
                          <input id="dose5" title="Dosis Run 5 (mGy)" placeholder="0.0" type="number" step="any" value={dose5} onChange={(e) => setDose5(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 p-1.5 rounded-lg text-xs font-bold" />
                        </div>
                      </div>
                    </div>

                    {/* Kolimasi, SID, HVL */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 space-y-2.5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono">Kolimasi Lapangan &amp; Penyaringan HVL</span>
                        <div className="flex flex-wrap gap-1.5">
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono",
                            calculated.collimationStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-200 text-red-800"
                          )}>Kolimasi: {calculated.collimationStatus} ({calculated.collimationPct.toFixed(1)}%)</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono",
                            calculated.hvlStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-200 text-red-800 animate-pulse"
                          )}>HVL: {calculated.hvlStatus} (Min: {calculated.hvlMinRequired.toFixed(1)} mm Al)</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3 text-xs font-mono">
                        <div>
                          <label htmlFor="sidVal" className="text-[8px] text-slate-400 block mb-0.5">SID Jarak (cm)</label>
                          <input id="sidVal" title="SID Jarak (cm)" placeholder="100" type="number" value={sidVal} onChange={(e) => setSidVal(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold animate-pulse" />
                        </div>
                        <div>
                          <label htmlFor="misX" className="text-[8px] text-slate-400 block mb-0.5">Penyimpangan X (cm)</label>
                          <input id="misX" title="Penyimpangan X (cm)" placeholder="0.0" type="number" step="any" value={misX} onChange={(e) => setMisX(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="misY" className="text-[8px] text-slate-400 block mb-0.5">Penyimpangan Y (cm)</label>
                          <input id="misY" title="Penyimpangan Y (cm)" placeholder="0.0" type="number" step="any" value={misY} onChange={(e) => setMisY(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                        <div>
                          <label htmlFor="hvlVal" className="text-[8px] text-slate-400 block mb-0.5">Ketebalan HVL (mmAl)</label>
                          <input id="hvlVal" title="Ketebalan HVL (mmAl)" placeholder="0.0" type="number" step="any" value={hvlVal} onChange={(e) => setHvlVal(Number(e.target.value))} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold" />
                        </div>
                      </div>
                      {hvlVal > 0 && calculated.hvlStatus === 'Tidak Lolos' && (
                        <div className="mt-2 text-red-700 dark:text-red-400 bg-red-100/40 dark:bg-rose-950/20 border border-red-200 dark:border-rose-900/40 rounded-xl p-3 flex gap-2 text-[9px]/[1.3] font-mono leading-normal font-bold">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 animate-bounce" />
                          <span>⚠️ VAL_HVL_WARNING: Nilai HVL ({hvlVal} mm Al) di bawah standar proteksi radiasi BAPETEN (&ge; {calculated.hvlMinRequired.toFixed(1)} mm Al untuk {kvpSet} kVp)! Sinar-X membutuhkan perisasi/penyaringan tambahan untuk meredam radiasi lemah yang tidak berguna.</span>
                        </div>
                      )}
                    </div>

                    {/* Kebocoran Radiasi Wadah Tabung */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-150 dark:border-slate-900 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-300 font-mono">Kebocoran Radiasi Wadah Tabung</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono",
                          calculated.tubeLeakageStatus === 'Lolos' ? "bg-emerald-100 text-emerald-800" : "bg-red-200 text-red-850 animate-pulse font-extrabold"
                        )}>Status: {calculated.tubeLeakageStatus} ({calculated.tubeLeakageStatus === 'Lolos' ? 'Batas Aman' : 'Bahaya Dosis Tinggi'})</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                          <label htmlFor="tubeLeakage" className="text-[8px] text-slate-400 block mb-0.5">Laju Dosis Bocor at 1m (mGy/jam)</label>
                          <input
                            id="tubeLeakage"
                            title="Laju Dosis Bocor at 1m (mGy/jam)"
                            placeholder="0.0"
                            type="number"
                            step="any"
                            value={tubeLeakage}
                            onChange={(e) => setTubeLeakage(Number(e.target.value))}
                            className={cn(
                              "w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-bold",
                              Number(tubeLeakage) > BAPETEN_LIMITS.tubeLeakage && "glow-fail-danger"
                            )}
                          />
                        </div>
                        <div className="flex flex-col justify-center text-[8.5px] text-slate-500 font-mono italic leading-tight pl-2">
                          <span>Nilai batas acuan kelaikan: &le; 1.0 mGy/jam</span>
                          <span>Pengukuran dilakukan pada jarak 1 meter dari wadah tabung.</span>
                        </div>
                      </div>
                      {Number(tubeLeakage) > BAPETEN_LIMITS.tubeLeakage && (
                        <div className="mt-2 text-red-750 dark:text-red-400 bg-red-100/30 dark:bg-rose-950/25 border border-red-200 dark:border-rose-900/40 rounded-xl p-3 flex gap-2 text-[9px]/[1.3] font-mono leading-normal font-bold glow-fail-danger">
                          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5 animate-bounce" />
                          <span>⚠️ VAL_LEAK_WARNING: Kebocoran Radiasi ({tubeLeakage} mGy/jam) melanggar ambang batas BAPETEN (&le; 1.0 mGy/jam)! Risiko paparan radiasi sekunder/bocor sangat kritis bagi keselamatan personil!</span>
                        </div>
                      )}
                    </div>

                    {/* Section 7: Parameter Kustom / Tambahan (Dynamic Accordion) */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-[#0c111d] mt-4 col-span-1 md:col-span-2">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase text-slate-700 dark:text-slate-350 font-mono flex items-center gap-1.5">
                          <Plus className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                          Parameter Pengujian Tambahan / Kustom ({customParameters.length} Poin)
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {customParameters.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50/50 dark:bg-slate-950/60 rounded-xl border border-slate-200/60 dark:border-slate-850 hover:border-indigo-400 dark:hover:border-cyan-500/20 transition-all duration-300 gap-3">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => updateCustomParameterName(item.id, e.target.value)}
                              className="text-[10px] font-mono text-slate-850 dark:text-slate-200 bg-transparent border-0 border-b border-transparent focus:border-indigo-500 outline-none w-full py-0.5"
                              placeholder="Nama parameter kustom..."
                            />
                            <div className="flex gap-1.5 items-center shrink-0">
                              <button
                                type="button"
                                onClick={() => updateCustomParameterStatus(item.id, 'Lolos')}
                                className={cn(
                                  "px-2 py-0.75 rounded text-[8.5px] font-black uppercase font-mono transition-all cursor-pointer",
                                  item.status === 'Lolos' ? "bg-emerald-50 text-emerald-800 bg-emerald-100 border border-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"
                                )}
                              >
                                Lolos
                              </button>
                              <button
                                type="button"
                                onClick={() => updateCustomParameterStatus(item.id, 'Tidak Lolos')}
                                className={cn(
                                  "px-2 py-0.75 rounded text-[8.5px] font-black uppercase font-mono transition-all cursor-pointer",
                                  item.status === 'Tidak Lolos' ? "bg-red-50 text-red-800 bg-red-100 border border-red-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"
                                )}
                              >
                                Gagal
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCustomParameter(item.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                                title="Hapus parameter ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <button
                          type="button"
                          onClick={addCustomParameter}
                          className="w-full mt-2 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[9px] font-black uppercase font-mono text-indigo-600 dark:text-cyan-400 hover:bg-indigo-50/50 dark:hover:bg-cyan-950/10 transition-colors cursor-pointer"
                        >
                          + Tambah Parameter Kustom Baru
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3 font-mono">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-wider hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Memproses...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Kalkulasi &amp; Registrasi</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 px-6 py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl backdrop-blur-md"
          >
            <span className={cn(
              "font-extrabold text-sm font-mono",
              toast.type === "success" ? "text-emerald-400" :
              toast.type === "warning" ? "text-amber-400" :
              toast.type === "error" ? "text-red-400" : "text-blue-400"
            )}>
              {toast.type === "success" ? "✓" : toast.type === "warning" ? "⚠️" : toast.type === "error" ? "✕" : "ℹ"}
            </span>
            <span className="text-xs font-bold font-sans uppercase tracking-wider">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Dialog Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setDeleteConfirmId(null)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2rem] max-w-sm w-full p-8 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center gap-4 text-red-650">
                <span className="p-3 bg-red-100 dark:bg-red-950/40 rounded-2xl text-2xl font-black">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                    KONFIRMASI HAPUS
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold font-mono">
                    Tindakan ini tidak dapat dibatalkan
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-450 font-sans tracking-wide leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan laporan Uji Kesesuaian BAPETEN ini secara permanen dari basis data sistem?
              </p>
              
              <div className="flex items-center gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const idToDelete = deleteConfirmId;
                    setDeleteConfirmId(null);
                    await executeDeleteRecord(idToDelete);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-red-500/10 transition-all cursor-pointer"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Purge Confirmation Modal */}
      <AnimatePresence>
        {isPurgeConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setIsPurgeConfirmOpen(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[2rem] max-w-sm w-full p-8 shadow-2xl flex flex-col gap-6"
            >
              <div className="flex items-center gap-4 text-rose-600">
                <span className="p-3 bg-rose-100 dark:bg-rose-950/40 rounded-2xl text-2xl font-black">
                  ⚠️
                </span>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                    PURGE ALL RECORDS
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold font-mono">
                    Hapus Seluruh Data Uji Kesesuaian
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-450 font-sans tracking-wide leading-relaxed">
                Apakah Anda yakin ingin menghapus **SEMESTINYA SELURUH CATATAN LAPORAN UKES** secara permanen dari Firestore database? Tindakan ini sangat kritis dan tidak dapat dikembalikan.
              </p>
              
              <div className="flex items-center gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsPurgeConfirmOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                  disabled={purging}
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={purging}
                  onClick={handlePurgeAllRecords}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-500/10 transition-all cursor-pointer flex items-center gap-2"
                >
                  {purging ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>Ya, Purge Semua</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
