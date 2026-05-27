import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Plus, 
  Wrench, 
  Search, 
  Filter, 
  Calendar, 
  CheckSquare, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Clock, 
  Printer, 
  Download, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Save, 
  Edit, 
  FileText, 
  Eye, 
  Activity,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logAction, pushNotification } from '../lib/auditLogger';

// Helper for relative timestamps
const formatDate = (dateString: any) => {
  if (!dateString) return '-';
  const date = dateString?.seconds ? new Date(dateString.seconds * 1000) : new Date(dateString);
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

// Default Checklist Templates for IPM
const CHECKLIST_TEMPLATES: Record<string, { visual: string[]; functional: string[] }> = {
  'Infusion / Syringe Pump': {
    visual: [
      'Kebersihan luar & chassis (bersih dari cairan kontaminasi)',
      'Kondisi casing & engsel pintu (tidak ada keretakan atau pecah)',
      'Klip drop censor / penutup sensor tetesan (berfungsi utuh)',
      'Kabel daya & steker AC (kondisi fleksibel, pin tidak longgar)',
      'Pegangan infus / Tiang clamp (mengunci kuat pada tiang infus)'
    ],
    functional: [
      'Uji tombol panel kontrol (touchscreen / tactile berespons baik)',
      'Uji sensor gelembung udara (Air-in-Line alarm melengking)',
      'Uji sensor oklusi (Occlusion pressure alarm berbunyi saat sumbatan)',
      'Uji alarm baterai lemah (Battery low alarm memicu indikator)',
      'Uji akurasi laju aliran (Flow rate verification)',
      'Peralihan lancar dari AC ke baterai internal (UPS internal backup)'
    ]
  },
  'Patient Monitor': {
    visual: [
      'Kebersihan fisik monitor & slot modul (bebas debu & lembab)',
      'Kondisi layarnya (tidak bergaris, bebas gores)',
      'Kabel Patient ECG Trunk (tidak pecah-pecah/terkelupas)',
      'Konektor NIBP & manset / cuff (tidak robek atau bocor)',
      'Kabel SPO2 Probe / Sensor (pemancar infra merah terpasang baik)'
    ],
    functional: [
      'Uji performa boot & inisialisasi modul ECG',
      'Uji fungsi inflasi & deflasi otomatis pompa NIBP',
      'Uji pembacaan kejenuhan oksigen (SPO2) & denyut nadi',
      'Uji fungsi alarm ambang batas (HR, SPO2, Temperatur)',
      'Uji fungsi speaker alarm eksternal',
      'Operasi daya baterai cadangan (berjalan minimal 15 menit)'
    ]
  },
  'Anesthesia Machine': {
    visual: [
      'Kondisi tangki penyerap CO2 (Soda Lime masih segar/tidak ungu)',
      'Keutuhan selang sirkuit napas pasien & Breathing Bag',
      'Kondisi Vaporizer dialer & pengunci dudukan',
      'Selang suplai medis (O2, N2O, Air) ke dinding gas sentral'
    ],
    functional: [
      'Uji kebocoran sistem sirkuit napas (Leak Test)',
      'Uji kegagalan suplai O2 alarm (O2 Fail-Safe alarm)',
      'Uji rasio campuran oksigen / nitrous (Anti-Hypoxic guard)',
      'Uji kalibrasi sensor aliran ekspirasi (Flow Sensor Calibration)',
      'Sistem pembuangan limbah gas anestesi (Scavenging System)'
    ]
  },
  'General Equipment': {
    visual: [
      'Chassis luar, kaki karet, atau roda pengunci',
      'Kabel catu daya utama, sekring & label keselamatan',
      'Kondisi tombol darurat & emergency interrupt'
    ],
    functional: [
      'Uji siklus daya hidup-mati (Power Cycle Test)',
      'Uji layar tampilan & indikator LED',
      'Uji alarm pengingat visual atau akustik',
      'Uji efektivitas operasional umum'
    ]
  }
};

const INITIAL_IPM_TASKS = [
  {
    id: "sample-ipm-1",
    deviceName: "Infusion Pump",
    brand: "Terumo",
    model: "TE-331",
    serialNumber: "IN-2022-8874",
    location: "Ruang OK Utama (Operating Theater)",
    department: "IBS (Instalasi Bedah Sentral)",
    technicianName: "Rian Hidayat",
    technicianId: "sample-tech",
    lastMaintenanceDate: "2026-02-15",
    nextMaintenanceDate: "2026-08-15",
    status: "Lolos",
    template: "Infusion / Syringe Pump",
    visualChecks: {
      'Kebersihan luar & chassis (bersih dari cairan kontaminasi)': 'Lolos',
      'Kondisi casing & engsel pintu (tidak ada keretakan atau pecah)': 'Lolos',
      'Klip drop censor / penutup sensor tetesan (berfungsi utuh)': 'Lolos',
      'Kabel daya & steker AC (kondisi fleksibel, pin tidak longgar)': 'Lolos',
      'Pegangan infus / Tiang clamp (mengunci kuat pada tiang infus)': 'Lolos'
    },
    functionalChecks: {
      'Uji tombol panel kontrol (touchscreen / tactile berespons baik)': 'Lolos',
      'Uji sensor gelembung udara (Air-in-Line alarm melengking)': 'Lolos',
      'Uji sensor oklusi (Occlusion pressure alarm berbunyi saat sumbatan)': 'Lolos',
      'Uji alarm baterai lemah (Battery low alarm memicu indikator)': 'Lolos',
      'Uji akurasi laju aliran (Flow rate verification)': 'Lolos',
      'Peralihan lancar dari AC ke baterai internal (UPS internal backup)': 'Lolos'
    },
    measurements: {
      template: "Infusion / Syringe Pump",
      flowRateTarget: 100,
      flowRateMeasured: 99.4,
      occlusionTarget: 300,
      occlusionMeasured: 308,
      groundResistance: 0.12,
      leakageCurrent: 35
    },
    executionNotes: "Alat dalam kondisi prima. Baterai internal memegang muatan dengan baik. Lacing sirkuit stabil.",
    createdAt: { seconds: 1779840000 } // April 2026
  },
  {
    id: "sample-ipm-2",
    deviceName: "Patient Monitor",
    brand: "Mindray",
    model: "uMEC 12",
    serialNumber: "PM-1090-9983",
    location: "Ruang ICU Kamar 4",
    department: "ICU (Intensive Care Unit)",
    technicianName: "Rian Hidayat",
    technicianId: "sample-tech",
    lastMaintenanceDate: "2026-03-10",
    nextMaintenanceDate: "2026-09-10",
    status: "Bersyarat",
    template: "Patient Monitor",
    visualChecks: {
      'Kebersihan fisik monitor & slot modul (bebas debu & lembab)': 'Lolos',
      'Kondisi layarnya (tidak bergaris, bebas gores)': 'Lolos',
      'Kabel Patient ECG Trunk (tidak pecah-pecah/terkelupas)': 'Lolos',
      'Konektor NIBP & manset / cuff (tidak robek atau bocor)': 'Tidak Lolos',
      'Kabel SPO2 Probe / Sensor (pemancar infra merah terpasang baik)': 'Lolos'
    },
    functionalChecks: {
      'Uji performa boot & inisialisasi modul ECG': 'Lolos',
      'Uji fungsi inflasi & deflasi otomatis pompa NIBP': 'Tidak Lolos',
      'Uji pembacaan kejenuhan oksigen (SPO2) & denyut nadi': 'Lolos',
      'Uji fungsi alarm ambang batas (HR, SPO2, Temperatur)': 'Lolos',
      'Uji fungsi speaker alarm eksternal': 'Lolos',
      'Operasi daya baterai cadangan (berjalan minimal 15 menit)': 'Lolos'
    },
    measurements: {
      template: "Patient Monitor",
      ecgTarget: 80,
      ecgMeasured: 79,
      spo2Target: 97,
      spo2Measured: 97,
      nibpTarget: 120,
      nibpMeasured: 123,
      groundResistance: 0.14,
      leakageCurrent: 44
    },
    executionNotes: "Manset NIBP bocor halus saat tekanan inflasi di atas 150 mmHg. Direkomendasikan mengganti manset NIBP dengan cadangan baru dalam kurun 7 hari. Untuk modul lainnya bekerja optimal.",
    createdAt: { seconds: 1782000000 }
  },
  {
    id: "sample-ipm-3",
    deviceName: "Anesthesia Machine",
    brand: "Dräger",
    model: "Atlan A350",
    serialNumber: "AN-1102-7744",
    location: "Kamar Operasi 1",
    department: "IBS (Instalasi Bedah Sentral)",
    technicianName: "Siti Rahma",
    technicianId: "sample-tech-2",
    lastMaintenanceDate: "2026-05-01",
    nextMaintenanceDate: "2026-11-01",
    status: "Menunggu Jadwal",
    template: "Anesthesia Machine",
    visualChecks: {},
    functionalChecks: {},
    measurements: null,
    executionNotes: "Menunggu giliran pemeliharaan bulanan sesuai jadwal kalender preventif.",
    createdAt: { seconds: 1785000000 }
  }
];;

export function IPMModule() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'Lolos' | 'Bersyarat' | 'Gagal' | 'Menunggu Jadwal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Toast and Custom Delete Confirmation States
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Modal Form State
  const [formDeviceName, setFormDeviceName] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formSerialNumber, setFormSerialNumber] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formDepartment, setFormDepartment] = useState('IPS-RS (Fisik Medis)');
  const [formTemplate, setFormTemplate] = useState('Infusion / Syringe Pump');
  const [formTechnician, setFormTechnician] = useState('');
  const [formLastMaintenanceDate, setFormLastMaintenanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [formStatus, setFormStatus] = useState<'Lolos' | 'Bersyarat' | 'Gagal' | 'Menunggu Jadwal'>('Menunggu Jadwal');
  
  // Custom checkpoints based on template
  const [visualChecks, setVisualChecks] = useState<Record<string, 'Lolos' | 'Tidak Lolos'>>({});
  const [functionalChecks, setFunctionalChecks] = useState<Record<string, 'Lolos' | 'Tidak Lolos'>>({});
  const [executionNotes, setExecutionNotes] = useState('');
  
  // Measurement State Fields for standard templates
  const [measFlowRateTarget, setMeasFlowRateTarget] = useState<number>(100);
  const [measFlowRateMeasured, setMeasFlowRateMeasured] = useState<number>(99.5);
  const [measOcclusionTarget, setMeasOcclusionTarget] = useState<number>(300);
  const [measOcclusionMeasured, setMeasOcclusionMeasured] = useState<number>(302);

  const [measEcgTarget, setMeasEcgTarget] = useState<number>(80);
  const [measEcgMeasured, setMeasEcgMeasured] = useState<number>(80);
  const [measSpo2Target, setMeasSpo2Target] = useState<number>(97);
  const [measSpo2Measured, setMeasSpo2Measured] = useState<number>(97);
  const [measNibpTarget, setMeasNibpTarget] = useState<number>(120);
  const [measNibpMeasured, setMeasNibpMeasured] = useState<number>(121);

  const [measO2Target, setMeasO2Target] = useState<number>(50);
  const [measO2Measured, setMeasO2Measured] = useState<number>(49.8);
  const [measPressureTarget, setMeasPressureTarget] = useState<number>(20);
  const [measPressureMeasured, setMeasPressureMeasured] = useState<number>(19.7);

  const [measGroundResistance, setMeasGroundResistance] = useState<number>(0.12);
  const [measLeakageCurrent, setMeasLeakageCurrent] = useState<number>(35);

  const [saving, setSaving] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const handleOpenEdit = (task: any) => {
    setIsEditMode(true);
    setEditingTaskId(task.id);
    setFormDeviceName(task.deviceName || '');
    setFormBrand(task.brand || '');
    setFormModel(task.model || '');
    setFormSerialNumber(task.serialNumber || '');
    setFormLocation(task.location || '');
    setFormDepartment(task.department || 'IPS-RS (Fisik Medis)');
    setFormTemplate(task.template || 'General Equipment');
    setFormTechnician(task.technicianName || '');
    setFormLastMaintenanceDate(task.lastMaintenanceDate || new Date().toISOString().split('T')[0]);
    setFormStatus(task.status || 'Menunggu Jadwal');
    setVisualChecks(task.visualChecks || {});
    setFunctionalChecks(task.functionalChecks || {});
    setExecutionNotes(task.executionNotes || '');
    
    // Measurements
    const m = task.measurements || {};
    setMeasGroundResistance(m.groundResistance || 0.12);
    setMeasLeakageCurrent(m.leakageCurrent || 35);
    
    if (task.template === 'Infusion / Syringe Pump') {
      setMeasFlowRateTarget(m.flowRateTarget || 100);
      setMeasFlowRateMeasured(m.flowRateMeasured || 99.5);
      setMeasOcclusionTarget(m.occlusionTarget || 300);
      setMeasOcclusionMeasured(m.occlusionMeasured || 302);
    } else if (task.template === 'Patient Monitor') {
      setMeasEcgTarget(m.ecgTarget || 80);
      setMeasEcgMeasured(m.ecgMeasured || 80);
      setMeasSpo2Target(m.spo2Target || 97);
      setMeasSpo2Measured(m.spo2Measured || 97);
      setMeasNibpTarget(m.nibpTarget || 120);
      setMeasNibpMeasured(m.nibpMeasured || 121);
    } else if (task.template === 'Anesthesia Machine') {
      setMeasO2Target(m.o2Target || 50);
      setMeasO2Measured(m.o2Measured || 49.8);
      setMeasPressureTarget(m.pressureTarget || 20);
      setMeasPressureMeasured(m.pressureMeasured || 19.7);
    }
    
    setIsModalOpen(true);
  };

  const { user, profile } = useAuth();

  const exportIPMToPDF = (task: any) => {
    if (!task) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const marginX = 20;
      let yPos = 25;
      const pageHeight = 280;

      // Header logo / Brand info
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("PT. SPEKTRUM KREASI PRATAMA", marginX, yPos);
      yPos += 5.5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("DIVISI PEMELIHARAAN PREVENTIF & KALIBRASI INTERNAL ALKES", marginX, yPos);
      yPos += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(marginX, yPos, 190, yPos);
      yPos += 8;

      // Report Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("LAPORAN PEMELIHARAAN PREVENTIF TERJADWAL (IPM)", marginX, yPos);
      yPos += 5;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Sistem Kepatuhan Uji Fungsi & Keamanan Listrik NFPA 99", marginX, yPos);
      yPos += 10;

      // Metadata block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      
      doc.text("IDENTITAS ALAT KESEHATAN", marginX, yPos);
      doc.text("INFORMASI INSPEKSI & PERIODE", 110, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      const metadataLeft = [
        ["Nama Alkes:", task.deviceName || "-"],
        ["Merek / Model:", `${task.brand || "-"} / ${task.model || "-"}`],
        ["Nomor Seri:", task.serialNumber || "-"],
        ["Ruang / Dept:", `${task.location || "-"} / ${task.department || "-"}`]
      ];

      const metadataRight = [
        ["Teknisi Utama:", task.technicianName || "-"],
        ["Tgl Pemeliharaan:", formatDate(task.lastMaintenanceDate)],
        ["Jadwal Berikutnya:", formatDate(task.nextMaintenanceDate)],
        ["Label Kelaikan:", task.status || "-"]
      ];

      let leftY = yPos;
      metadataLeft.forEach(([label, val]) => {
        doc.setFont("Helvetica", "bold");
        doc.text(label, marginX, leftY);
        doc.setFont("Helvetica", "normal");
        doc.text(val, marginX + 25, leftY);
        leftY += 4.5;
      });

      let rightY = yPos;
      metadataRight.forEach(([label, val]) => {
        doc.setFont("Helvetica", "bold");
        doc.text(label, 110, rightY);
        doc.setFont("Helvetica", "normal");
        doc.text(val, 110 + 32, rightY);
        rightY += 4.5;
      });

      yPos = Math.max(leftY, rightY) + 7;

      // elegant separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, yPos - 3, 190, yPos - 3);

      const successColor = [16, 185, 129];
      const failColor = [239, 68, 68];

      // Section 1: Visual checks
      const hasVisual = Object.keys(task.visualChecks || {}).length > 0;
      if (hasVisual) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 58, 138); // navy
        doc.text("1. HASIL INVENTARISASI & PEMERIKSAAN VISUAL", marginX, yPos);
        yPos += 5;

        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos, 170, 5.5, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Kriteria Inspeksi Fisik / Chassis / Kabel", marginX + 3, yPos + 4);
        doc.text("Hasil Evaluasi", marginX + 140, yPos + 4);
        yPos += 5.5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);

        Object.entries(task.visualChecks).forEach(([item, status]: any) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 25;
          }
          doc.text(item, marginX + 3, yPos + 4);
          
          doc.setFont("Helvetica", "bold");
          const c = status === "Lolos" ? successColor : failColor;
          doc.setTextColor(c[0], c[1], c[2]);
          doc.text(status.toUpperCase(), marginX + 140, yPos + 4);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          yPos += 5.5;
        });
        yPos += 4;
      }

      // Section 2: Functional checks
      const hasFunc = Object.keys(task.functionalChecks || {}).length > 0;
      if (hasFunc) {
        if (yPos > pageHeight - 35) {
          doc.addPage();
          yPos = 25;
        }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 58, 138);
        doc.text("2. PEMERIKSAAN FUNGSI OPERASIONAL & SYSTEM ALARM", marginX, yPos);
        yPos += 5;

        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos, 170, 5.5, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Fitur & Respon Sensor Keamanan", marginX + 3, yPos + 4);
        doc.text("Hasil Evaluasi", marginX + 140, yPos + 4);
        yPos += 5.5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);

        Object.entries(task.functionalChecks).forEach(([item, status]: any) => {
          if (yPos > pageHeight - 20) {
            doc.addPage();
            yPos = 25;
          }
          doc.text(item, marginX + 3, yPos + 4);
          
          doc.setFont("Helvetica", "bold");
          const c = status === "Lolos" ? successColor : failColor;
          doc.setTextColor(c[0], c[1], c[2]);
          doc.text(status.toUpperCase(), marginX + 140, yPos + 4);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          yPos += 5.5;
        });
        yPos += 4;
      }

      // Section 3: Measurements
      if (task.measurements) {
        if (yPos > pageHeight - 55) {
          doc.addPage();
          yPos = 25;
        }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9.5);
        doc.setTextColor(30, 58, 138);
        doc.text("3. DATA INSPEKSI METROLOGI & KESELAMATAN LISTRIK (EST)", marginX, yPos);
        yPos += 5;

        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos, 170, 5.5, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Parameter Metrologi Uji Fungsi", marginX + 3, yPos + 4);
        doc.text("Target / Batas", marginX + 65, yPos + 4);
        doc.text("Nilai Terukur", marginX + 110, yPos + 4);
        doc.text("Kesimpulan", marginX + 145, yPos + 4);
        yPos += 5.5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        // specific measurements
        if (task.measurements.template === 'Infusion / Syringe Pump') {
          doc.text("Volumetric Flow Rate (Laju Alir)", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.flowRateTarget || 100} ml/jam`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.flowRateMeasured} ml/jam`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;

          doc.text("Occlusion Pressure (Tekn. Penyumbatan)", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.occlusionTarget || 300} mmHg`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.occlusionMeasured} mmHg`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;
        } else if (task.measurements.template === 'Patient Monitor') {
          doc.text("ECG Heart Rate Simulation", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.ecgTarget || 80} bpm`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.ecgMeasured} bpm`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;

          doc.text("SpO2 Oxygen Saturation Simulation", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.spo2Target || 97} %`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.spo2Measured} %`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;

          doc.text("NIBP Systolic Pressure Simulation", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.nibpTarget || 120} mmHg`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.nibpMeasured} mmHg`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;
        } else if (task.measurements.template === 'Anesthesia Machine') {
          doc.text("O2 Mixing Concentration", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.o2Target || 50} %`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.o2Measured || 49} %`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;

          doc.text("Inspiratory Peak Pressure", marginX + 3, yPos + 4);
          doc.text(`${task.measurements.pressureTarget || 20} cmH2O`, marginX + 65, yPos + 4);
          doc.text(`${task.measurements.pressureMeasured || 19.8} cmH2O`, marginX + 110, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.text("LOLOS", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          yPos += 5.5;
        }

        // EST Safety (NFPA 99)
        doc.setFont("Helvetica", "bold");
        doc.text("Electrical Safety Testing (EST NFPA 99 Standards)", marginX + 3, yPos + 4);
        yPos += 5;
        doc.setFont("Helvetica", "normal");

        doc.text("Hambatan Pembumian (Ground Resistance)", marginX + 3, yPos + 4);
        doc.text("<= 0.50 Ohm", marginX + 65, yPos + 4);
        doc.text(`${task.measurements.groundResistance} Ohm`, marginX + 110, yPos + 4);
        doc.setFont("Helvetica", "bold");
        const groundLolos = task.measurements.groundResistance <= 0.5;
        doc.setTextColor(groundLolos ? successColor[0] : failColor[0], groundLolos ? successColor[1] : failColor[1], groundLolos ? successColor[2] : failColor[2]);
        doc.text(groundLolos ? "LOLOS" : "GAGAL", marginX + 145, yPos + 4);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        yPos += 5.5;

        doc.text("Arus Bocor Selubung (Chassis Leakage)", marginX + 3, yPos + 4);
        doc.text("<= 300 uA", marginX + 65, yPos + 4);
        doc.text(`${task.measurements.leakageCurrent} uA`, marginX + 110, yPos + 4);
        doc.setFont("Helvetica", "bold");
        const leakageLolos = task.measurements.leakageCurrent <= 300;
        doc.setTextColor(leakageLolos ? successColor[0] : failColor[0], leakageLolos ? successColor[1] : failColor[1], leakageLolos ? successColor[2] : failColor[2]);
        doc.text(leakageLolos ? "LOLOS" : "GAGAL", marginX + 145, yPos + 4);
        doc.setFont("Helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        yPos += 9;
      }

      // Notes & Recommendations box
      if (yPos > pageHeight - 35) {
        doc.addPage();
        yPos = 25;
      }
      const isOk = task.status === 'Lolos';
      doc.setFillColor(isOk ? 240 : 254, isOk ? 253 : 242, isOk ? 250 : 242);
      doc.setDrawColor(isOk ? 16 : 252, isOk ? 185 : 165, isOk ? 129 : 165);
      doc.setLineWidth(0.6);
      doc.rect(marginX, yPos, 170, 16, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(isOk ? 6 : 153, isOk ? 95 : 27, isOk ? 70 : 27);
      doc.text("CATATAN KHUSUS & REKOMENDASI TEKNIK:", marginX + 5, yPos + 5.5);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(task.executionNotes || "Alat bekerja stabil dan berada dalam batas toleransi pabrikan.", marginX + 5, yPos + 10.5);
      yPos += 24;

      // Footer / Signature block
      if (yPos > pageHeight - 35) {
        doc.addPage();
        yPos = 25;
      }
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Medan, " + new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }), 135, yPos);
      yPos += 4.5;
      doc.text("Teknisi Pelaksana (Analis EST),", 135, yPos);
      yPos += 18;

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(task.technicianName || "Rian Hidayat", 135, yPos);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("PT. Spektrum Kreasi Pratama", 135, yPos + 4);

      doc.save(`Laporan_IPM_${(task.deviceName || "Alat").replace(/\s+/g, "_")}_${task.serialNumber || "SN"}.pdf`);
      showToast("Laporan Inspeksi IPM berhasil diekspor ke PDF!", "success");
    } catch (e: any) {
      console.error(e);
      showToast("Gagal mengekspor Laporan IPM ke PDF: " + e.message, "error");
    }
  };

  // Load Tasks from Firestore with Fallback to default records
  useEffect(() => {
    let unsubscribe = () => {};
    try {
      const q = query(collection(db, 'ipm_tasks'), orderBy('createdAt', 'desc'));
      unsubscribe = onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
          // Prefill Firestore with mock data for smooth onboarding
          setTasks(INITIAL_IPM_TASKS);
          setLoading(false);
        } else {
          const list = snapshot.docs.map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          }));
          setTasks(list);
          setLoading(false);
        }
      }, (error) => {
        console.error("Firestore loading error:", error);
        setTasks(INITIAL_IPM_TASKS);
        setLoading(false);
      });
    } catch (e) {
      console.error("Failed to load IPM Tasks from Firestore, fallback active:", e);
      setTasks(INITIAL_IPM_TASKS);
      setLoading(false);
    }
    return () => unsubscribe();
  }, []);

  // Update check items when template selection changes
  useEffect(() => {
    const template = CHECKLIST_TEMPLATES[formTemplate] || CHECKLIST_TEMPLATES['General Equipment'];
    const vis: Record<string, 'Lolos' | 'Tidak Lolos'> = {};
    const func: Record<string, 'Lolos' | 'Tidak Lolos'> = {};
    
    template.visual.forEach(item => {
      vis[item] = 'Lolos';
    });
    template.functional.forEach(item => {
      func[item] = 'Lolos';
    });
    
    setVisualChecks(vis);
    setFunctionalChecks(func);
  }, [formTemplate]);

  // Handle opening new form
  const handleOpenNew = () => {
    setIsEditMode(false);
    setEditingTaskId(null);
    setFormDeviceName('');
    setFormBrand('');
    setFormModel('');
    setFormSerialNumber('');
    setFormLocation('');
    setFormDepartment('IPS-RS (Fisik Medis)');
    setFormTemplate('Infusion / Syringe Pump');
    setFormTechnician('');
    setFormLastMaintenanceDate(new Date().toISOString().split('T')[0]);
    setFormStatus('Menunggu Jadwal');
    setExecutionNotes('');
    
    // Set default checks based on template
    const template = CHECKLIST_TEMPLATES['Infusion / Syringe Pump'];
    const vis: Record<string, 'Lolos' | 'Tidak Lolos'> = {};
    const func: Record<string, 'Lolos' | 'Tidak Lolos'> = {};
    template.visual.forEach(item => {
      vis[item] = 'Lolos';
    });
    template.functional.forEach(item => {
      func[item] = 'Lolos';
    });
    setVisualChecks(vis);
    setFunctionalChecks(func);
    
    setMeasGroundResistance(0.12);
    setMeasLeakageCurrent(35);
    setMeasFlowRateTarget(100);
    setMeasFlowRateMeasured(99.5);
    setMeasOcclusionTarget(300);
    setMeasOcclusionMeasured(302);
    
    setIsModalOpen(true);
  };

  // Handle creating or editing item
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDeviceName || !formBrand) {
      showToast("Harap lengkapi Nama Alat dan Merk Alat.", "warning");
      return;
    }

    setSaving(true);
    try {
      // Calculate next scheduled maintanance (Add 6 Months)
      const lastDate = new Date(formLastMaintenanceDate);
      lastDate.setMonth(lastDate.getMonth() + 6);
      const nextDateString = lastDate.toISOString().split('T')[0];

      const techName = formTechnician || profile?.displayName || user?.email || "Teknisi Utama";

      let measurements: any = null;
      if (formStatus !== 'Menunggu Jadwal') {
        measurements = {
          template: formTemplate,
          groundResistance: Number(measGroundResistance),
          leakageCurrent: Number(measLeakageCurrent)
        };
        if (formTemplate === 'Infusion / Syringe Pump') {
          measurements.flowRateTarget = Number(measFlowRateTarget);
          measurements.flowRateMeasured = Number(measFlowRateMeasured);
          measurements.occlusionTarget = Number(measOcclusionTarget);
          measurements.occlusionMeasured = Number(measOcclusionMeasured);
        } else if (formTemplate === 'Patient Monitor') {
          measurements.ecgTarget = Number(measEcgTarget);
          measurements.ecgMeasured = Number(measEcgMeasured);
          measurements.spo2Target = Number(measSpo2Target);
          measurements.spo2Measured = Number(measSpo2Measured);
          measurements.nibpTarget = Number(measNibpTarget);
          measurements.nibpMeasured = Number(measNibpMeasured);
        } else if (formTemplate === 'Anesthesia Machine') {
          measurements.o2Target = Number(measO2Target);
          measurements.o2Measured = Number(measO2Measured);
          measurements.pressureTarget = Number(measPressureTarget);
          measurements.pressureMeasured = Number(measPressureMeasured);
        }
      }

      const taskData: any = {
        deviceName: formDeviceName,
        brand: formBrand,
        model: formModel,
        serialNumber: formSerialNumber,
        location: formLocation,
        department: formDepartment,
        technicianName: techName,
        technicianId: user?.uid || "tech-uid",
        lastMaintenanceDate: formLastMaintenanceDate,
        nextMaintenanceDate: nextDateString,
        status: formStatus,
        template: formTemplate,
        visualChecks: formStatus === 'Menunggu Jadwal' ? {} : visualChecks,
        functionalChecks: formStatus === 'Menunggu Jadwal' ? {} : functionalChecks,
        measurements: measurements,
        executionNotes: executionNotes || "Pemeliharaan preventif selesai dilaksanakan."
      };

      if (isEditMode && editingTaskId) {
        taskData.updatedAt = serverTimestamp();
        await updateDoc(doc(db, 'ipm_tasks', editingTaskId), taskData);

        await logAction(
          `Pembaruan Registrasi IPM: ${formDeviceName}`,
          'ipm_tasks',
          `Alat: ${formDeviceName}, Status: ${formStatus}, ID: ${editingTaskId}`,
          'info'
        );

        showToast("Laporan pemeliharaan preventif (IPM) berhasil diperbarui!", "success");
      } else {
        taskData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'ipm_tasks'), taskData);

        await logAction(
          `Membuat Registrasi IPM Baru: ${formDeviceName}`,
          'ipm_tasks',
          `Alat: ${formDeviceName}, Status: ${formStatus}, ID: ${docRef.id}`,
          'info'
        );

        await pushNotification(
          'IPM Terjadwal Berhasil Diregistrasi',
          `Laporan Inspeksi Preventif untuk ${formDeviceName} (${formBrand}) disimpan dengan sukses.`,
          'success',
          'all',
          '/ipm'
        );
      }

      setIsModalOpen(false);
      // Reset major fields
      setFormDeviceName('');
      setFormBrand('');
      setFormModel('');
      setFormSerialNumber('');
      setFormLocation('');
      setExecutionNotes('');
      setFormStatus('Menunggu Jadwal');
      setIsEditMode(false);
      setEditingTaskId(null);
    } catch (error) {
      console.error("Save IPM Error:", error);
      // Fallback update to local array in case offline
      const lastDate = new Date(formLastMaintenanceDate);
      lastDate.setMonth(lastDate.getMonth() + 6);
      const nextDateString = lastDate.toISOString().split('T')[0];
      const nextId = isEditMode && editingTaskId ? editingTaskId : ("local-ipm-" + Date.now());
      
      let measurements: any = null;
      if (formStatus !== 'Menunggu Jadwal') {
        measurements = {
          template: formTemplate,
          groundResistance: Number(measGroundResistance),
          leakageCurrent: Number(measLeakageCurrent)
        };
        if (formTemplate === 'Infusion / Syringe Pump') {
          measurements.flowRateTarget = Number(measFlowRateTarget);
          measurements.flowRateMeasured = Number(measFlowRateMeasured);
          measurements.occlusionTarget = Number(measOcclusionTarget);
          measurements.occlusionMeasured = Number(measOcclusionMeasured);
        } else if (formTemplate === 'Patient Monitor') {
          measurements.ecgTarget = Number(measEcgTarget);
          measurements.ecgMeasured = Number(measEcgMeasured);
          measurements.spo2Target = Number(measSpo2Target);
          measurements.spo2Measured = Number(measSpo2Measured);
          measurements.nibpTarget = Number(measNibpTarget);
          measurements.nibpMeasured = Number(measNibpMeasured);
        } else if (formTemplate === 'Anesthesia Machine') {
          measurements.o2Target = Number(measO2Target);
          measurements.o2Measured = Number(measO2Measured);
          measurements.pressureTarget = Number(measPressureTarget);
          measurements.pressureMeasured = Number(measPressureMeasured);
        }
      }

      const localItem = {
        id: nextId,
        deviceName: formDeviceName,
        brand: formBrand,
        model: formModel,
        serialNumber: formSerialNumber,
        location: formLocation,
        department: formDepartment,
        template: formTemplate,
        technicianName: formTechnician || profile?.displayName || "Teknisi Utama",
        lastMaintenanceDate: formLastMaintenanceDate,
        nextMaintenanceDate: nextDateString,
        status: formStatus,
        visualChecks: visualChecks,
        functionalChecks: functionalChecks,
        measurements: measurements,
        executionNotes: executionNotes,
        createdAt: new Date()
      };
      
      if (isEditMode && editingTaskId) {
        setTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, ...localItem } : t));
        showToast("Laporan pemeliharaan preventif diperbarui secara lokal!", "success");
      } else {
        setTasks(prev => [localItem, ...prev]);
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingTaskId(null);
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'ipm_tasks', id));
      await logAction(`Menghapus Catatan IPM`, 'ipm_tasks', `Task ID: ${id}`, 'warning');
      setTasks(prev => prev.filter(t => t.id !== id));
      if (selectedTask?.id === id) setSelectedTask(null);
      showToast("Laporan pemeliharaan preventif berhasil dihapus.", "success");
    } catch (e) {
      console.error("Failed to delete from server, doing local action:", e);
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast("Catatan terhapus dari status tampilan.", "info");
    }
  };

  const handleDeleteTask = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleUpdateStatus = async (item: any, newStatus: 'Lolos' | 'Bersyarat' | 'Gagal') => {
    try {
      const docRef = doc(db, 'ipm_tasks', item.id);
      await updateDoc(docRef, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error("Error updating status:", err);
      setTasks(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatus } : t));
    }
  };

  // Filter Tasks based on search query and active tab filter
  const filteredTasks = tasks.filter(t => {
    const term = searchQuery.toLowerCase();
    const matchSearch = 
      (t.deviceName || "").toLowerCase().includes(term) ||
      (t.brand || "").toLowerCase().includes(term) ||
      (t.serialNumber || "").toLowerCase().includes(term) ||
      (t.location || "").toLowerCase().includes(term) ||
      (t.technicianName || "").toLowerCase().includes(term);
      
    if (activeTab === 'all') return matchSearch;
    return t.status === activeTab && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header and Page Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
              <Wrench className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                Sistem Registrasi Pemeliharaan Preventif (IPM)
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest font-mono">
                Modul Pemeliharaan Preventif &amp; Pengujian Fungsi Terjadwal Alkes
              </p>
            </div>
          </div>
        </div>

        <div>
          <button
            onClick={handleOpenNew}
            className="w-full lg:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all shadow-lg hover:shadow-blue-500/10 hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrasi Preventif / IPM Baru</span>
          </button>
        </div>
      </div>

      {/* Grid Status Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Scheduled */}
        <div className="luxury-card p-5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest block font-mono">TOTAL ALAT IPM</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono">{tasks.length}</span>
          </div>
        </div>

        {/* Lolos (Pass) */}
        <div className="luxury-card p-5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-black uppercase tracking-widest block font-mono">PEMELIHARAAN LOLOS</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {tasks.filter(t => t.status === 'Lolos').length}
            </span>
          </div>
        </div>

        {/* Bersyarat */}
        <div className="luxury-card p-5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-amber-500 dark:text-amber-400 font-black uppercase tracking-widest block font-mono">LOLOS BERSYARAT</span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              {tasks.filter(t => t.status === 'Bersyarat').length}
            </span>
          </div>
        </div>

        {/* Schedule */}
        <div className="luxury-card p-5 flex items-center gap-4 transition-all duration-300 hover:scale-[1.02]">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-black uppercase tracking-widest block font-mono">MENUNGGU JADWAL</span>
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {tasks.filter(t => t.status === 'Menunggu Jadwal').length}
            </span>
          </div>
        </div>
      </div>

      {/* Control Panel: Filters, Search & Categories */}
      <div className="luxury-card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1 w-full md:w-auto">
          {[
            { id: 'all', label: 'Semua IPM' },
            { id: 'Menunggu Jadwal', label: 'Menunggu Jadwal' },
            { id: 'Lolos', label: 'Selesai (OK)' },
            { id: 'Bersyarat', label: 'Bersyarat' },
            { id: 'Gagal', label: 'Gagal' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono transition-all",
                activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari alat, SN, nama teknis..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold focus:outline-none focus:border-blue-500 placeholder:text-slate-400 text-slate-800 dark:text-white font-mono"
          />
        </div>
      </div>
      {/* Primary Table layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List Section */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="p-12 text-center luxury-card">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">Memuat Catatan IPM...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="p-12 text-center luxury-card">
              <Wrench className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono mb-1">Catatan IPM Tidak Ditemukan</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Ubah filter pemfilteran atau rekam penugasan pemeliharaan baru.</p>
            </div>
          ) : (
            filteredTasks.map((t) => {
              const hasChecklists = Object.keys(t.visualChecks || {}).length > 0;
              return (
                <div 
                  key={t.id}
                  onClick={() => {
                    setSelectedTask(t);
                    if (window.innerWidth < 1024) {
                      setTimeout(() => {
                        document.getElementById('ipm-details-panel')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }
                  }}
                  className={cn(
                    "luxury-card p-5 cursor-pointer relative overflow-hidden group/card transition-all duration-300",
                    selectedTask?.id === t.id 
                      ? "border-blue-500 dark:border-blue-500/80 ring-4 ring-blue-500/10 dark:bg-blue-950/5" 
                      : "border-slate-200 dark:border-slate-800/80"
                  )}
                >
                  {/* Left Accent Status Border */}
                  <div className={cn(
                    "absolute top-0 bottom-0 left-0 w-1.5",
                    t.status === 'Lolos' ? "bg-emerald-500 shadow-[2px_0_12px_rgba(16,185,129,0.4)]" :
                    t.status === 'Bersyarat' ? "bg-amber-500 shadow-[2px_0_12px_rgba(245,158,11,0.4)]" :
                    t.status === 'Gagal' ? "bg-red-500 shadow-[2px_0_12px_rgba(239,68,68,0.4)]" : 
                    "bg-blue-500 shadow-[2px_0_12px_rgba(59,130,246,0.4)]"
                  )} />

                  <div className="flex justify-between items-start gap-3 pl-2">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono tracking-tight group-hover/card:text-blue-500 transition-colors">
                          {t.deviceName}
                        </span>
                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-mono">
                          {t.brand} {t.model}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">S/N: </span>
                          <span className="font-extrabold text-slate-700 dark:text-slate-300">{t.serialNumber || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">Lokasi: </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{t.location}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500">PM Terakhir: </span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{formatDate(t.lastMaintenanceDate)}</span>
                        </div>
                        <div>
                          <span className="text-rose-500 dark:text-rose-400/90 font-bold">PM Berikutnya: </span>
                          <span className="font-black text-rose-600 dark:text-rose-400">{formatDate(t.nextMaintenanceDate)}</span>
                        </div>
                      </div>

                      {/* Execution snippet */}
                      {t.executionNotes && (
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-950/40 p-2 rounded-lg italic font-mono border border-slate-100 dark:border-slate-900/45 truncate max-w-lg">
                          Catatan: {t.executionNotes}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      {/* Badge status */}
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-xl font-mono border",
                        t.status === 'Lolos' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-250 dark:border-emerald-900/30" :
                        t.status === 'Bersyarat' ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-250 dark:border-amber-900/30" :
                        t.status === 'Gagal' ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-250 dark:border-red-900/30" :
                        "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-200 dark:border-blue-900/30"
                      )}>
                        {t.status}
                      </span>
                      
                      <div className="flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(t);
                          }}
                          className="p-1 px-2.5 text-[9px] font-extrabold uppercase rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Edit className="w-3 h-3" /> Ubah
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTask(t.id);
                          }}
                          className="p-1 px-2.5 text-[9px] font-extrabold uppercase rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Selected / Detail Pane Panel */}
        <div id="ipm-details-panel" className="luxury-card p-6 space-y-6 h-fit sticky top-6 transition-all duration-300 scroll-mt-20">
          {selectedTask ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                    Rincian Pemeliharaan (IPM)
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">
                    ID: #{selectedTask.id.slice(0, 10)}
                  </p>
                </div>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl font-mono border",
                  selectedTask.status === 'Lolos' ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/30" :
                  selectedTask.status === 'Bersyarat' ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/30" :
                  selectedTask.status === 'Gagal' ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/30" : 
                  "bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/30"
                )}>
                  {selectedTask.status}
                </span>
              </div>

              {/* Specs & Location info */}
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[8px]">Nama Alkes</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedTask.deviceName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[8px]">S/N (Serial Number)</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedTask.serialNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[8px]">Merek / Model</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedTask.brand} / {selectedTask.model || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[8px]">Ruangan / Dept</span>
                    <span className="font-extrabold text-slate-800 dark:text-slate-200">{selectedTask.location}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[8px]">Pelaksana Pemeliharaan</span>
                    <span className="font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                      {selectedTask.technicianName}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 dark:text-slate-500 block uppercase font-bold text-[8px]">Masa Frekuensi</span>
                    <span className="font-black text-rose-500 dark:text-rose-450 uppercase">Setiap 6 Bulan</span>
                  </div>
                </div>
              </div>

              {/* Detailed Lists of inspection criteria */}
              <div className="space-y-4">
                {/* Visual - Theme Blue */}
                {Object.keys(selectedTask.visualChecks || {}).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Pemeriksaan Fisik / Visual (IK)
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(selectedTask.visualChecks).map(([item, res]: any) => (
                        <div 
                          key={item} 
                          className="flex items-center justify-between text-[10px] bg-slate-50/40 dark:bg-slate-950/20 p-2 rounded-xl border-l-2 border-l-blue-500 dark:border-l-cyan-500 border-y border-r border-slate-200 dark:border-slate-800 font-mono shadow-[sm_rgba(37,99,235,0.01)]"
                        >
                          <span className="text-slate-700 dark:text-slate-300 pr-4">{item}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                            res === 'Lolos' 
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30" 
                              : "bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/30"
                          )}>{res}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Functional - Theme Gold */}
                {Object.keys(selectedTask.functionalChecks || {}).length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest font-mono mb-2 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      Pemeriksaan Fungsi (IK)
                    </h4>
                    <div className="space-y-1.5">
                      {Object.entries(selectedTask.functionalChecks).map(([item, res]: any) => (
                        <div 
                          key={item} 
                          className="flex items-center justify-between text-[10px] bg-slate-50/40 dark:bg-slate-950/20 p-2 rounded-xl border-l-2 border-l-amber-500 border-y border-r border-slate-200 dark:border-slate-800 font-mono shadow-[sm_rgba(245,158,11,0.01)]"
                        >
                          <span className="text-slate-700 dark:text-slate-300 pr-4">{item}</span>
                          <span className={cn(
                            "text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border",
                            res === 'Lolos' 
                              ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-250 dark:border-emerald-900/30" 
                              : "bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/30"
                          )}>{res}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Physical measurements display */}
              {selectedTask.measurements && (
                <div className="border border-blue-200 dark:border-blue-900/40 bg-blue-50/20 dark:bg-blue-950/10 rounded-2xl p-4 space-y-3.5">
                  <h4 className="text-[10px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" />
                    Data Pengukuran Metrologi &amp; EST
                  </h4>
                  <div className="grid grid-cols-1 gap-2 text-[10px] font-mono">
                    {selectedTask.measurements.template === 'Infusion / Syringe Pump' && (
                      <>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 dark:text-slate-500">Volumetric Flow Rate (Set {selectedTask.measurements.flowRateTarget || 100} ml/jam):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.flowRateMeasured} ml/jam
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-slate-400 dark:text-slate-500">Occlusion Pressure (Set {selectedTask.measurements.occlusionTarget || 300} mmHg):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.occlusionMeasured} mmHg
                          </span>
                        </div>
                      </>
                    )}
                    
                    {selectedTask.measurements.template === 'Patient Monitor' && (
                      <>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">ECG Heart Rate (Set {selectedTask.measurements.ecgTarget || 80} bpm):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.ecgMeasured} bpm
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">SpO2 Oxygen Sat. (Set {selectedTask.measurements.spo2Target || 97} %):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.spo2Measured} %
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">NIBP Systolic (Set {selectedTask.measurements.nibpTarget || 120} mmHg):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.nibpMeasured} mmHg
                          </span>
                        </div>
                      </>
                    )}

                    {selectedTask.measurements.template === 'Anesthesia Machine' && (
                      <>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">O2 Concentration (Set {selectedTask.measurements.o2Target || 50} %):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.o2Measured || 49} %
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-2.5 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">Inspiratory Pressure (Set {selectedTask.measurements.pressureTarget || 20} cmH2O):</span>
                          <span className="font-extrabold text-slate-800 dark:text-white">
                            {selectedTask.measurements.pressureMeasured || 19.8} cmH2O
                          </span>
                        </div>
                      </>
                    )}

                    {/* EST section */}
                    <div className="border-t border-slate-200 dark:border-slate-800 mt-1.5 pt-2.5 space-y-2">
                      <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">Uji Keselamatan Listrik (NFPA 99 EST)</span>
                      <div className="grid grid-cols-2 gap-2 text-[9px]">
                        <div className="flex flex-col p-2 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">Grounding Wire:</span>
                          <span className="font-extrabold text-slate-800 dark:text-white text-xs mt-0.5">
                            {selectedTask.measurements.groundResistance} &Omega;
                          </span>
                          <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">&le; 0.5 &Omega; (Lolos)</span>
                        </div>
                        <div className="flex flex-col p-2 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-855">
                          <span className="text-slate-400 dark:text-slate-500">Chassis Leakage:</span>
                          <span className="font-extrabold text-slate-800 dark:text-white text-xs mt-0.5">
                            {selectedTask.measurements.leakageCurrent} &mu;A
                          </span>
                          <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">&le; 300 &mu;A (Lolos)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendation, Verdict update */}
              <div className="space-y-2.5 border-t border-slate-200 dark:border-slate-800 pt-5">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block font-mono">Catatan Khusus &amp; Saran Teknik</span>
                <p className="text-[11px] font-mono leading-relaxed bg-amber-50/50 dark:bg-amber-950/10 text-amber-800 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 p-3.5 rounded-2xl">
                  {selectedTask.executionNotes || "Alat bekerja dengan toleransi normal. Tidak ada rekomendasi darurat."}
                </p>

                {/* Verdict fast updates */}
                <div className="flex gap-2 pt-3">
                  <button
                    onClick={() => handleUpdateStatus(selectedTask, 'Lolos')}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[9px] uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-emerald-500/10 transition-all active:scale-[0.98]"
                  >
                    Beri Label Lolos
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTask, 'Bersyarat')}
                    className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9px] uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-amber-500/10 transition-all active:scale-[0.98]"
                  >
                    Beri Bersyarat
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(selectedTask, 'Gagal')}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold text-[9px] uppercase tracking-wider py-2.5 rounded-xl cursor-pointer shadow-sm hover:shadow-red-500/10 transition-all active:scale-[0.98]"
                  >
                    Gagal / Rusak
                  </button>
                </div>

                {/* Print buttons group */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedTask)}
                    className="w-full flex items-center justify-center gap-2 border border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-extrabold text-[10px] tracking-wider uppercase py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Edit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Ubah Laporan / Parameter IPM</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportIPMToPDF(selectedTask)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-[10px] tracking-wider uppercase py-3 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Cetak Laporan IPM (PDF)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open("", "_blank");
                      if (printWindow) {
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>STIKER PEMELIHARAAN ALKES</title>
                              <style>
                                body { font-family: 'Courier New', monospace; text-align: center; padding: 20px; }
                                .tag-box { border: 4px solid #10b981; border-radius: 12px; padding: 15px; width: 320px; margin: auto; }
                                .header { font-weight: bold; font-size: 16px; margin-bottom: 5px; color: #047857; }
                                .status { background: #10b981; color: white; display: inline-block; padding: 4px 15px; font-weight: bold; border-radius: 4px; margin-bottom: 10px; }
                                .field { font-size: 11px; margin: 4px 0; text-align: left; }
                              </style>
                            </head>
                            <body>
                              <div class="tag-box" style="border-color: ${selectedTask.status === 'Lolos' ? '#10b981' : selectedTask.status === 'Bersyarat' ? '#f59e0b' : '#ef4444'}">
                                <div class="header">STIKER PREVENTIF / IPM</div>
                                <div class="status" style="background-color: ${selectedTask.status === 'Lolos' ? '#10b981' : selectedTask.status === 'Bersyarat' ? '#f59e0b' : '#ef4444'}">${selectedTask.status.toUpperCase()} (OK)</div>
                                <div class="field"><b>ALAT:</b> ${selectedTask.deviceName}</div>
                                <div class="field"><b>MERK/SN:</b> ${selectedTask.brand} / ${selectedTask.serialNumber}</div>
                                <div class="field"><b>TEKNISI:</b> ${selectedTask.technicianName}</div>
                                <div class="field"><b>TGL PM:</b> ${formatDate(selectedTask.lastMaintenanceDate)}</div>
                                <div class="field" style="color: red;"><b>BERIKUTNYA:</b> ${formatDate(selectedTask.nextMaintenanceDate)}</div>
                                <hr />
                                <span style="font-size: 8px;">SPECTRUM CALIBRATION SYSTEM</span>
                              </div>
                              <script>window.print();</script>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 font-extrabold text-[10px] tracking-wider uppercase py-3 rounded-xl transition-all active:scale-[0.98] cursor-pointer text-slate-700 dark:text-slate-300"
                  >
                    <Printer className="w-4 h-4 text-blue-500" />
                    <span>Cetak Stiker Tag Label Hijau</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 dark:text-slate-500">
              <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-3" />
              <p className="text-xs font-black uppercase tracking-widest font-mono">Pilih Laporan IPM</p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 uppercase leading-relaxed">Klik salah satu kartu laporan pemeliharaan preventif di sebelah kiri untuk melihat rincian kelaikan operasional.</p>
            </div>
          )}
        </div>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0c111d] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <form onSubmit={handleSaveTask} className="flex flex-col h-full overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Wrench className="w-5 h-5 text-blue-600 animate-spin" />
                    <div>
                      <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                        {isEditMode ? "Ubah Laporan Pemeliharaan Preventif (IPM)" : "Registrasi Catatan Pemeliharaan Preventif (IPM)"}
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-mono">
                        Isi kriteria fisik dan fungsi alat kesehatan preventif
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-400"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
                  {/* Select Template Checklist */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Template Checklist Inspeksi
                      </label>
                      <select
                        value={formTemplate}
                        onChange={(e) => setFormTemplate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="Infusion / Syringe Pump">Infusion / Syringe Pump (Laju Alir, Air Detector)</option>
                        <option value="Patient Monitor">Patient Monitor (ECG, SpO2, NIBP System)</option>
                        <option value="Anesthesia Machine">Anesthesia Machine (O2 Mixer, Soda Lime, Vaporizer)</option>
                        <option value="General Equipment">General Equipment (Peralatan Umum / Lab / Bedah)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Nama Alat Kesehatan
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Infusion Pump"
                        value={formDeviceName}
                        onChange={(e) => setFormDeviceName(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Merk Alat / Brand
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Terumo / B.Braun"
                        value={formBrand}
                        onChange={(e) => setFormBrand(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Tipe / Model Alat
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., TE-331 / Vista"
                        value={formModel}
                        onChange={(e) => setFormModel(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Nomor Seri (Serial Number)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., SN-88654-Z"
                        value={formSerialNumber}
                        onChange={(e) => setFormSerialNumber(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Lokasi Penempatan
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Ruang ICU Bed 3 / OK 1"
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Instalasi Pelayanan / Unit
                      </label>
                      <select
                        value={formDepartment}
                        onChange={(e) => setFormDepartment(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="IBS (Instalasi Bedah Sentral)">IBS (Instalasi Bedah Sentral)</option>
                        <option value="ICU (Intensive Care Unit)">ICU (Intensive Care Unit)</option>
                        <option value="IGD (Instalasi Gawat Darurat)">IGD (Instalasi Gawat Darurat)</option>
                        <option value="Klinik Rawat Jalan">Klinik Rawat Jalan</option>
                        <option value="IPSRS (Fisik Medis)">IPSRS (Fisik Medis / Sarana RS)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Tgl Pemeliharaan Preventif
                      </label>
                      <input
                        type="date"
                        value={formLastMaintenanceDate}
                        onChange={(e) => setFormLastMaintenanceDate(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                        Status Awal Pemeliharaan
                      </label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                      >
                        <option value="Menunggu Jadwal">Menunggu Jadwal (Tunda Kalender)</option>
                        <option value="Lolos">Lolos (Baik / Normal)</option>
                        <option value="Bersyarat">Bersyarat (Alat Butuh Perhatian)</option>
                        <option value="Gagal">Gagal (Rusak / Tak Boleh Pakai)</option>
                      </select>
                    </div>
                  </div>

                  {/* Render checklist inputs directly if NOT "Menunggu Jadwal" */}
                  {formStatus !== 'Menunggu Jadwal' && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono mb-2">Pemeriksaan Fisik Checklist</h4>
                        <div className="space-y-2">
                          {Object.keys(visualChecks).map((item) => (
                            <div key={item} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-900">
                              <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 max-w-md">{item}</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setVisualChecks(prev => ({ ...prev, [item]: 'Lolos' }))}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[9px] font-black uppercase font-mono transition-all",
                                    visualChecks[item] === 'Lolos' ? "bg-emerald-50 text-emerald-800 bg-emerald-100 border border-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"
                                  )}
                                >
                                  Lolos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setVisualChecks(prev => ({ ...prev, [item]: 'Tidak Lolos' }))}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[9px] font-black uppercase font-mono transition-all",
                                    visualChecks[item] === 'Tidak Lolos' ? "bg-red-50 text-red-800 bg-red-100 border border-red-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"
                                  )}
                                >
                                  Tidak Lolos
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono mb-2">Pemeriksaan Fungsi Checklist</h4>
                        <div className="space-y-2">
                          {Object.keys(functionalChecks).map((item) => (
                            <div key={item} className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-900">
                              <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300 max-w-md">{item}</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setFunctionalChecks(prev => ({ ...prev, [item]: 'Lolos' }))}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[9px] font-black uppercase font-mono transition-all",
                                    functionalChecks[item] === 'Lolos' ? "bg-emerald-50 text-emerald-800 bg-emerald-100 border border-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"
                                  )}
                                >
                                  Lolos
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFunctionalChecks(prev => ({ ...prev, [item]: 'Tidak Lolos' }))}
                                  className={cn(
                                    "px-2.5 py-1 rounded text-[9px] font-black uppercase font-mono transition-all",
                                    functionalChecks[item] === 'Tidak Lolos' ? "bg-red-50 text-red-800 bg-red-100 border border-red-300" : "bg-slate-100 text-slate-500 dark:bg-slate-900"
                                  )}
                                >
                                  Tidak Lolos
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Metrologi Data Ukur Inputs */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono flex items-center gap-1.5">
                          <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                          Data Pengukuran Metrologi &amp; EST (NFPA 99)
                        </h4>
                        
                        {formTemplate === 'Infusion / Syringe Pump' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 font-mono block">Volumetric Flow Rate Target (ml/jam)</label>
                              <input
                                type="number"
                                value={measFlowRateTarget}
                                onChange={(e) => setMeasFlowRateTarget(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 font-mono block">Volumetric Flow Rate Terukur (ml/jam)</label>
                              <input
                                type="number"
                                step="any"
                                value={measFlowRateMeasured}
                                onChange={(e) => setMeasFlowRateMeasured(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 font-mono block">Occlusion Pressure Target (mmHg)</label>
                              <input
                                type="number"
                                value={measOcclusionTarget}
                                onChange={(e) => setMeasOcclusionTarget(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 font-mono block">Occlusion Pressure Terukur (mmHg)</label>
                              <input
                                type="number"
                                step="any"
                                value={measOcclusionMeasured}
                                onChange={(e) => setMeasOcclusionMeasured(Number(e.target.value))}
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        )}

                        {formTemplate === 'Patient Monitor' && (
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1 md:col-span-1 col-span-3">
                              <label className="text-[8px] font-bold text-slate-500 font-mono block">ECG HR Target / Measured</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={measEcgTarget}
                                  onChange={(e) => setMeasEcgTarget(Number(e.target.value))}
                                  placeholder="Target"
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                                <input
                                  type="number"
                                  step="any"
                                  value={measEcgMeasured}
                                  onChange={(e) => setMeasEcgMeasured(Number(e.target.value))}
                                  placeholder="Measured"
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-1 col-span-3">
                              <label className="text-[8px] font-bold text-slate-500 font-mono block">SpO2 Target / Measured</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={measSpo2Target}
                                  onChange={(e) => setMeasSpo2Target(Number(e.target.value))}
                                  placeholder="Target"
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                                <input
                                  type="number"
                                  step="any"
                                  value={measSpo2Measured}
                                  onChange={(e) => setMeasSpo2Measured(Number(e.target.value))}
                                  placeholder="Measured"
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="space-y-1 md:col-span-1 col-span-3">
                              <label className="text-[8px] font-bold text-slate-500 font-mono block">NIBP Target / Measured</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={measNibpTarget}
                                  onChange={(e) => setMeasNibpTarget(Number(e.target.value))}
                                  placeholder="Target"
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                                <input
                                  type="number"
                                  step="any"
                                  value={measNibpMeasured}
                                  onChange={(e) => setMeasNibpMeasured(Number(e.target.value))}
                                  placeholder="Measured"
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {formTemplate === 'Anesthesia Machine' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 font-mono block">O2 Concentration Target / Terukur (%)</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={measO2Target}
                                  onChange={(e) => setMeasO2Target(Number(e.target.value))}
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                                <input
                                  type="number"
                                  step="any"
                                  value={measO2Measured}
                                  onChange={(e) => setMeasO2Measured(Number(e.target.value))}
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-slate-500 font-mono block">PIP Peak Insp. Pressure Target / Terukur (cmH2O)</label>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={measPressureTarget}
                                  onChange={(e) => setMeasPressureTarget(Number(e.target.value))}
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                                <input
                                  type="number"
                                  step="any"
                                  value={measPressureMeasured}
                                  onChange={(e) => setMeasPressureMeasured(Number(e.target.value))}
                                  className="w-1/2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Standard Electrical Safety Test fields */}
                        <div className="grid grid-cols-2 gap-4 bg-slate-100/50 dark:bg-slate-950/80 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm col-span-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 font-mono block">Hambatan Pembumian Grounding Wire (&Omega;) - Batas &le; 0.5</label>
                            <input
                              type="number"
                              step="any"
                              value={measGroundResistance}
                              onChange={(e) => setMeasGroundResistance(Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-slate-500 font-mono block">Arus Bocor Sasis / Selimut (&mu;A) - Batas &le; 300</label>
                            <input
                              type="number"
                              step="any"
                              value={measLeakageCurrent}
                              onChange={(e) => setMeasLeakageCurrent(Number(e.target.value))}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold font-mono text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes & Rec */}
                  <div className="space-y-1.5 pt-4">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest font-mono block">
                      Rekomendasi / Catatan Pemeliharaan
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Masukkan catatan perihal suku cadang yang diganti, kalibrasi internal dsb..."
                      value={executionNotes}
                      onChange={(e) => setExecutionNotes(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white outline-none focus:border-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end gap-3">
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
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5"
                  >
                    {saving ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{isEditMode ? "Perbarui Laporan IPM" : "Simpan Laporan IPM"}</span>
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
              <div className="flex items-center gap-4 text-red-600">
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
              
              <p className="text-xs text-slate-500 dark:text-slate-400 font-sans tracking-wide leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan laporan pemeliharaan preventif (IPM) ini secara permanen dari basis data sistem?
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
                    await executeDeleteTask(idToDelete);
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
    </div>
  );
}
