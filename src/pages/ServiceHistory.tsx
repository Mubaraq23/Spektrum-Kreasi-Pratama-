import React, { useState, useEffect } from 'react';
import { 
  History, 
  Stethoscope, 
  ClipboardList, 
  Award, 
  Wrench, 
  Search, 
  ChevronRight, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  ExternalLink,
  ShieldAlert,
  Sliders,
  Filter,
  User,
  Heart,
  Loader2,
  Building,
  Save,
  Trash2,
  X,
  Activity
} from 'lucide-react';
import { 
  collection, 
  query, 
  getDocs, 
  where, 
  orderBy, 
  getDoc,
  doc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import { logAction, pushNotification } from '../lib/auditLogger';

const timelineContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const timelineItem = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: "spring" as const, 
      stiffness: 100,
      damping: 15
    } 
  }
};

export function ServiceHistory() {
  const { profile, user, isAdmin, isSupervisor } = useAuth();
  const isClient = profile?.role === 'client';

  // State
  const [deviceList, setDeviceList] = useState<any[]>([]);
  const [selectedSerialNumber, setSelectedSerialNumber] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  
  // Aggregated data
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [ipmTasks, setIpmTasks] = useState<any[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  
  // Filter settings
  const [activeTab, setActiveTab] = useState<'all' | 'work_orders' | 'certificates' | 'ipm'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [downloadingHospitalReport, setDownloadingHospitalReport] = useState(false);

  // State for IPM quick action
  const [isIPMModalOpen, setIsIPMModalOpen] = useState(false);
  const [savingIPM, setSavingIPM] = useState(false);
  const [ipmError, setIpmError] = useState<string | null>(null);
  const [ipmForm, setIpmForm] = useState({
    deviceName: '',
    brand: '',
    model: '',
    serialNumber: '',
    location: '',
    department: '',
    technicianName: '',
    lastMaintenanceDate: '',
    nextMaintenanceDate: '',
    template: 'General Medical Equipment',
    executionNotes: '',
    status: 'Selesai'
  });

  const handleOpenIPMCreate = () => {
    if (!selectedDevice) return;
    const latestRecord = timelineEvents[0];
    const today = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0];

    setIpmForm({
      deviceName: selectedDevice.name || '',
      brand: selectedDevice.brand || '',
      model: selectedDevice.model || '',
      serialNumber: selectedDevice.serialNumber || '',
      location: profile?.hospitalName || latestRecord?.original?.hospitalName || '',
      department: latestRecord?.original?.department || 'Instalasi Alkes',
      technicianName: profile?.displayName || user?.email || 'Teknisi Utama KPS',
      lastMaintenanceDate: today,
      nextMaintenanceDate: oneYearLater,
      template: 'General Medical Equipment',
      status: 'Selesai',
      executionNotes: latestRecord
        ? `AUTO-POPULATED. Terdaftar menyusul riwayat pemeliharaan "${latestRecord.title}" tertanggal ${latestRecord.date?.toLocaleDateString('id-ID')}`
        : `Dibuat secara otomatis di pusat compliance audit.`
    });
    setIpmError(null);
    setIsIPMModalOpen(true);
  };

  const handleSaveIPM = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingIPM || !user) return;
    setSavingIPM(true);
    setIpmError(null);

    try {
      const taskData = {
        deviceName: ipmForm.deviceName.trim(),
        brand: ipmForm.brand.trim(),
        model: ipmForm.model.trim(),
        serialNumber: ipmForm.serialNumber.trim(),
        location: ipmForm.location.trim(),
        department: ipmForm.department.trim(),
        technicianName: ipmForm.technicianName.trim(),
        technicianId: user.uid,
        lastMaintenanceDate: ipmForm.lastMaintenanceDate,
        nextMaintenanceDate: ipmForm.nextMaintenanceDate,
        status: ipmForm.status,
        template: ipmForm.template,
        visualChecks: {
          physicalBody: "Pass",
          powerCable: "Pass",
          switchesControls: "Pass",
          displayIndicators: "Pass"
        },
        functionalChecks: {
          basicOperations: "Pass",
          alarmsSafety: "Pass",
          userInterface: "Pass"
        },
        executionNotes: ipmForm.executionNotes.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'ipm_tasks'), taskData);

      await logAction(
        `Membuat IPM via Service History: ${ipmForm.deviceName}`,
        'ipm_tasks',
        `Alat: ${ipmForm.deviceName}, S/N: ${ipmForm.serialNumber}, Status: ${ipmForm.status}`,
        'info'
      );

      await pushNotification(
        'IPM Terdaftar Sukses',
        `Laporan IPM Preventif baru untuk ${ipmForm.deviceName} (${ipmForm.serialNumber}) berhasil ditambahkan secara otomatis.`,
        'success',
        'all',
        '/service-history'
      );

      // Local update
      const newLocalTask = {
        id: 'temp-id-' + Math.random(),
        type: 'ipm',
        title: 'Sertifikasi Inspeksi IPM',
        date: new Date(),
        status: ipmForm.status,
        notes: ipmForm.executionNotes,
        techName: ipmForm.technicianName,
        original: taskData
      };

      setIpmTasks(prev => [newLocalTask, ...prev]);
      setTimelineEvents(prev => [newLocalTask, ...prev]);
      setIsIPMModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setIpmError(err.message || "Gagal menyimpan IPM.");
    } finally {
      setSavingIPM(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedDevice) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // Top header band (Deep Space Navy background)
      doc.setFillColor(11, 15, 25);
      doc.rect(0, 0, 210, 36, 'F');
      
      // Top accent bar
      doc.setFillColor(99, 102, 241); // indigo-500
      doc.rect(0, 36, 210, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(20);
      doc.text("QUANTUM PRECISION COMPLIANCE REPORT", 14, 16);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(156, 163, 175);
      doc.text(`Generated on: ${new Date().toLocaleString('id-ID')} | Quantum Metrology Audit Engine`, 14, 23);
      doc.text(`Authorized Report for: ${profile?.hospitalName || 'Health Center Customer'}`, 14, 27);
      
      // Title Section I
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("I. SPESIFIKASI & IDENTITAS ALAT MEDIS DETIL", 14, 48);
      
      // Specs box
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 52, 182, 38, 'FD');
      
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'bold');
      doc.text("Nama Alat Medis:", 18, 60);
      doc.text("Nomor Seri (S/N):", 18, 68);
      doc.text("Brand / Pabrikan:", 18, 76);
      doc.text("Tipe / Model:", 18, 84);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(selectedDevice.name || '-', 54, 60);
      doc.text(selectedDevice.serialNumber || '-', 54, 68);
      doc.text(selectedDevice.brand || '-', 54, 76);
      doc.text(selectedDevice.model || '-', 54, 84);
      
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text("Status Kelayakan:", 114, 60);
      doc.text("Masa Berlaku:", 114, 68);
      doc.text("Masa Kalibrasi:", 114, 76);
      
      const comp = getComplianceStatus();
      doc.setFont('Helvetica', 'bold');
      if (comp.label.includes("KOMPLIEN")) {
        doc.setTextColor(16, 120, 60);
      } else {
        doc.setTextColor(180, 110, 10);
      }
      doc.text(comp.label, 144, 60);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      const activeCert2 = certificates.find(c => c.status === 'active');
      doc.text(activeCert2 ? `Aktif s/d ${activeCert2.nextCalibration || '-'}` : 'N/A', 144, 68);
      doc.text(selectedDevice.maintenanceSchedule || '12 Bulan', 144, 76);
      
      // Title Section II
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("II. RIWAYAT INSTALASI, LAYANAN & KALIBRASI (TIMELINE)", 14, 102);
      
      let y = 106;
      doc.setLineWidth(0.3);
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 196, y);
      
      // Table Header Row
      y += 5;
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.setFont('Helvetica', 'bold');
      doc.text("Tanggal", 16, y);
      doc.text("Tipe Aktivitas & Keterangan / Catatan Kelayakan", 46, y);
      doc.text("Teknisi (PIC)", 148, y);
      doc.text("Status", 176, y);
      
      y += 2.5;
      doc.line(14, y, 196, y);
      y += 5;
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      
      if (timelineEvents.length === 0) {
        doc.text("Belum ada catatan aktivitas layanan kalibrasi atau maintenance terdaftar.", 18, y);
      } else {
        timelineEvents.forEach((ev) => {
          if (y > 265) {
            doc.addPage();
            y = 20;
            // Page Header Band for page 2+
            doc.setFillColor(11, 15, 25);
            doc.rect(0, 0, 210, 14, 'F');
            doc.setFillColor(99, 102, 241);
            doc.rect(0, 14, 210, 1, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8);
            doc.text(`QUANTUM PREVENTIVE METROLOGY REPORT - S/N: ${selectedDevice.serialNumber}`, 14, 9);
            y = 26;
          }
          
          const dateStr = ev.date ? ev.date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(dateStr, 16, y);
          
          doc.setTextColor(15, 23, 42);
          let catText = "";
          if (ev.type === 'work_order') catText = "[WORK ORDER] ";
          else if (ev.type === 'certificate') catText = "[CALIBRATION CERT] ";
          else catText = "[IPM REPORT] ";
          
          doc.text(catText + ev.title, 46, y);
          
          // Notes with line wrap
          doc.setFont('Helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(120, 130, 150);
          const notesWrapped = doc.splitTextToSize(ev.notes || '-', 98);
          doc.text(notesWrapped, 46, y + 3.8);
          
          // PIC and Status
          doc.setTextColor(15, 23, 42);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          const techTrunc = ev.techName.length > 14 ? ev.techName.slice(0, 14) + '...' : ev.techName;
          doc.text(techTrunc, 148, y);
          
          const statusStr = (ev.status || 'SUCCESS').toUpperCase();
          doc.setFont('Helvetica', 'bold');
          if (statusStr === 'COMPLETED' || statusStr === 'ACTIVE' || statusStr === 'SELESAI') {
            doc.setTextColor(16, 120, 60);
          } else {
            doc.setTextColor(180, 110, 10);
          }
          doc.text(statusStr, 176, y);
          
          const linesCount = notesWrapped.length;
          y += 7.5 + (linesCount * 3.5);
          
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y - 2, 196, y - 2);
        });
      }
      
      // Page space safety for Seal
      if (y > 235) {
        doc.addPage();
        y = 25;
      }
      
      y += 8;
      doc.setDrawColor(99, 102, 241);
      doc.setFillColor(250, 250, 255);
      doc.rect(14, y, 182, 22, 'FD');
      
      doc.setTextColor(79, 70, 229);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text("QUANTUM CALIBRATION COMPLIANCE SEAL", 20, y + 7);
      
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text("Laporan ini diterbitkan secara elektronik oleh Quantum Precision Systems Metrology Engine.", 20, y + 12);
      doc.text("Seluruh data pengujian, kalibrasi, dan pengerjaan rekapitulasi dijamin keabsahan dan ketertelusurannya.", 20, y + 16);
      
      doc.save(`Compliance_Report_${selectedDevice.serialNumber || 'Unit'}.pdf`);
    } catch (e2) {
      console.error(e2);
    }
  };

  const handleDownloadHospitalReportPDF = async () => {
    const hospitalToReport = profile?.hospitalName;
    if (!hospitalToReport) {
      alert("Akun Anda tidak memiliki asosiasi nama Rumah Sakit. Harap hubungi Admin.");
      return;
    }
    
    setDownloadingHospitalReport(true);
    try {
      // 1. Fetch Work Orders for this Hospital
      const woSnap = await getDocs(query(
        collection(db, 'work_orders'),
        where('hospitalName', '==', hospitalToReport)
      ));
      const wos = woSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // 2. Fetch Worksheets (LK) for this Hospital
      const wsSnap = await getDocs(query(
        collection(db, 'worksheets'),
        where('fasyankesName', '==', hospitalToReport)
      ));
      const worksheetsList = wsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // 3. Fetch IPM Tasks for this Hospital
      const ipmSnap = await getDocs(query(
        collection(db, 'ipm_tasks'),
        where('location', '==', hospitalToReport)
      ));
      const ipms = ipmSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));

      // 4. Fetch Certificates that belong to this Hospital's worksheets
      const worksheetIds = worksheetsList.map(w => w.id);
      let certs: any[] = [];
      if (worksheetIds.length > 0) {
        const certsSnap = await getDocs(collection(db, 'certificates'));
        certs = certsSnap.docs
          .map(doc => ({ id: doc.id, ...doc.data() as any }))
          .filter(c => worksheetIds.includes(c.lkId));
      }

      // Compile unique assets list based on these records
      const uniqueAssetsMap = new Map();
      worksheetsList.forEach(ws => {
        if (ws.serialNumber) {
          uniqueAssetsMap.set(ws.serialNumber, {
            serialNumber: ws.serialNumber,
            name: ws.deviceName || 'Alat Medis',
            brand: ws.brand || '',
            model: ws.model || '',
            type: 'calibration'
          });
        }
      });
      wos.forEach(wo => {
        if (wo.serialNumber && !uniqueAssetsMap.has(wo.serialNumber)) {
          uniqueAssetsMap.set(wo.serialNumber, {
            serialNumber: wo.serialNumber,
            name: wo.deviceName || 'Alat Medis',
            brand: wo.brand || '',
            model: wo.model || '',
            type: 'work_order'
          });
        }
      });
      ipms.forEach(ipm => {
        if (ipm.serialNumber && !uniqueAssetsMap.has(ipm.serialNumber)) {
          uniqueAssetsMap.set(ipm.serialNumber, {
            serialNumber: ipm.serialNumber,
            name: ipm.deviceName || 'Alat Medis',
            brand: ipm.brand || '',
            model: ipm.model || '',
            type: 'ipm'
          });
        }
      });
      const uniqueAssetsList = Array.from(uniqueAssetsMap.values());

      // Let's instantiate PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      
      doc.setFillColor(11, 15, 25); // Obsidian black
      doc.rect(0, 0, 210, 297, 'F');

      // Decorative cyan/indigo neon-like linear bands (Modern Swiss precision look)
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.rect(0, 90, 210, 4, 'F');
      doc.setFillColor(6, 182, 212); // Cyan 500
      doc.rect(0, 94, 210, 1.5, 'F');

      // Title Block
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(24);
      doc.text("QUANTUM METROLOGY COMPLIANCE", 20, 115);
      doc.text("HOLISTIC HOSPITAL REPORT", 20, 126);

      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text(`CONSOLIDATED SERVICE RECAP & CALIBRATION HISTORIC REGISTRY`, 20, 134);

      // Metrology Details Box
      doc.setFillColor(17, 24, 39); // Slate 900
      doc.setDrawColor(79, 70, 229); // Indigo 600 border
      doc.rect(20, 150, 170, 95, 'FD');

      doc.setFontSize(10);
      doc.setFont('Helvetica', 'bold');
      doc.setTextColor(59, 130, 246); // Blue 500
      doc.text("I. COMPLIANCE PROFILE & METROLOGICAL METRICS", 26, 160);

      doc.setLineWidth(0.3);
      doc.setDrawColor(55, 65, 81);
      doc.line(26, 163, 184, 163);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      
      doc.text("Fasilitas Rumah Sakit (Hospital):", 26, 172);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text(hospitalToReport.toUpperCase(), 84, 172);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text("Jumlah Aset Medis Terpindas:", 26, 181);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${uniqueAssetsList.length} Unit Alat`, 84, 181);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text("Sertifikat Kalibrasi Terdaftar:", 26, 190);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${certs.length} Sertifikat Aktif/Expired`, 84, 190);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text("Rekaman Pemeliharaan WO:", 26, 199);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${wos.length} Tiket Pengerjaan`, 84, 199);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text("Inspeksi Preventif Mandiri (IPM):", 26, 208);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text(`${ipms.length} Laporan PM`, 84, 208);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text("Tanggal Pembuatan (Date Generated):", 26, 217);
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text(new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 84, 217);

      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(156, 163, 175);
      doc.text("Sistem Pengesahan (Authority):", 26, 226);
      doc.setTextColor(34, 197, 94); // Green 500
      doc.text("QUANTUM PRECISION COMPLIANCE DECK", 84, 226);

      // Footnote of Cover
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text("Laporan audit kepatuhan ini dihasilkan secara resmi dan sah oleh sistem metrologi digital PT. KPS.", 20, 275);
      doc.text("Semua rekam jejak pengujian bersifat rahasia dan bersertifikasi sah sesuai standar nasional.", 20, 279);

      // Header helper function for subpages
      const drawSubPageHeader = (pageTitle: string, sectionNum: string) => {
        doc.setFillColor(11, 15, 25);
        doc.rect(0, 0, 210, 24, 'F');
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 24, 210, 1, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text("QUANTUM PRECISION COMPLIANCE SYSTEMS", 14, 10);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(156, 163, 175);
        doc.text(`${hospitalToReport.toUpperCase()} • GENERAL RECOMPILATION AUDIT`, 14, 15);

        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(`${sectionNum}. ${pageTitle.toUpperCase()}`, 196 - doc.getTextWidth(`${sectionNum}. ${pageTitle.toUpperCase()}`), 13);
      };

      // Footer helper
      const drawSubPageFooter = (curPage: number, maxPage: number) => {
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Dokumen ini sah tanpa tanda tangan basah, dihasilkan otomatis oleh Quantum Engine.`, 14, 287);
        doc.text(`Halaman ${curPage} dari ${maxPage}`, 196 - doc.getTextWidth(`Halaman ${curPage} dari ${maxPage}`), 287);
      };

      // ==========================================
      // PAGE 2: ASSETS REGISTRY TABLE
      // ==========================================
      doc.addPage();
      drawSubPageHeader("Asset Registry & Compliance Rating", "I");

      let y = 38;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("1. DAFTAR INVENTARIS ALAT MEDIS KESELURUHAN", 14, y);
      y += 5;
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Berikut adalah daftar seluruh aset medis yang pernah memiliki interaksi layanan (Work Order, Kalibrasi, atau IPM) pada fasyankes Anda:", 14, y);
      y += 8;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 196, y);
      doc.line(14, y + 7, 196, y + 7);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No", 16, y + 5);
      doc.text("Nama Alat Medis", 24, y + 5);
      doc.text("Nomor Seri (S/N)", 80, y + 5);
      doc.text("Merk / Model", 124, y + 5);
      doc.text("Status Kelayakan", 164, y + 5);

      y += 7;
      let assetCounter = 1;
      
      uniqueAssetsList.forEach((asset) => {
        if (y > 265) {
          drawSubPageFooter(2, 5);
          doc.addPage();
          drawSubPageHeader("Asset Registry & Compliance Rating", "I");
          y = 35;
          // Redraw table header
          doc.setFillColor(241, 245, 249);
          doc.rect(14, y, 182, 7, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.line(14, y, 196, y);
          doc.line(14, y + 7, 196, y + 7);
          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text("No", 16, y + 5);
          doc.text("Nama Alat Medis", 24, y + 5);
          doc.text("Nomor Seri (S/N)", 80, y + 5);
          doc.text("Merk / Model", 124, y + 5);
          doc.text("Status Kelayakan", 164, y + 5);
          y += 7;
        }

        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(String(assetCounter), 16, y + 5);
        
        doc.setFont('Helvetica', 'bold');
        const truncName = asset.name.length > 28 ? asset.name.slice(0, 26) + '..' : asset.name;
        doc.text(truncName, 24, y + 5);
        
        doc.setFont('Helvetica', 'normal');
        doc.text(asset.serialNumber || '-', 80, y + 5);
        
        const brandModel = `${asset.brand || '-'} / ${asset.model || '-'}`;
        const truncBrand = brandModel.length > 20 ? brandModel.slice(0, 18) + '..' : brandModel;
        doc.text(truncBrand, 124, y + 5);

        const hasActiveCert = certs.some(c => c.lkId && worksheetsList.find(w => w.id === c.lkId)?.serialNumber === asset.serialNumber && c.status === 'active');
        const hasAnyCert = certs.some(c => worksheetsList.find(w => w.id === c.lkId)?.serialNumber === asset.serialNumber);

        if (hasActiveCert) {
          doc.setTextColor(16, 120, 60);
          doc.setFont('Helvetica', 'bold');
          doc.text("KOMPLIEN", 164, y + 5);
        } else if (hasAnyCert) {
          doc.setTextColor(180, 110, 10);
          doc.setFont('Helvetica', 'bold');
          doc.text("EXPIRED", 164, y + 5);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.setFont('Helvetica', 'normal');
          doc.text("BELUM KALIBRASI", 164, y + 5);
        }

        y += 7.5;
        doc.setDrawColor(241, 245, 249);
        doc.line(14, y, 196, y);
        assetCounter++;
      });
      drawSubPageFooter(2, 5);

      // ==========================================
      // PAGE 3: CERTIFICATES LIST
      // ==========================================
      doc.addPage();
      drawSubPageHeader("Calibration Certificates & Metrology Records", "II");
      
      y = 38;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("2. SERTIFIKAT LULUS KALIBRASI & PRESTASI METROLOGI", 14, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Sertifikat di bawah ini diterbitkan resmi oleh Quantum Precision untuk alat medis milik fasyankes Anda:", 14, y);
      y += 8;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 196, y);
      doc.line(14, y + 7, 196, y + 7);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No Sertifikat", 16, y + 5);
      doc.text("Alat Medis (S/N)", 65, y + 5);
      doc.text("Tgl Terbit", 125, y + 5);
      doc.text("Exp Date", 155, y + 5);
      doc.text("Status", 182, y + 5);

      y += 7;
      
      if (certs.length === 0) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Belum ada sertifikat kalibrasi yang diterbitkan untuk fasyankes Anda.", 20, y + 8);
        y += 15;
      } else {
        certs.forEach((c) => {
          if (y > 265) {
            drawSubPageFooter(3, 5);
            doc.addPage();
            drawSubPageHeader("Calibration Certificates & Metrology Records", "II");
            y = 35;
            doc.setFillColor(241, 245, 249);
            doc.rect(14, y, 182, 7, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.text("No Sertifikat", 16, y + 5);
            doc.text("Alat Medis (S/N)", 65, y + 5);
            doc.text("Tgl Terbit", 125, y + 5);
            doc.text("Exp Date", 155, y + 5);
            doc.text("Status", 182, y + 5);
            y += 7;
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(15, 23, 42);
          doc.text(c.certificateNumber || 'QT-N/A', 16, y + 5);

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          const linkedWs = worksheetsList.find(w => w.id === c.lkId);
          const devDetail = linkedWs ? `${linkedWs.deviceName} (${linkedWs.serialNumber})` : 'Alat Medis';
          const truncDevDetail = devDetail.length > 34 ? devDetail.slice(0, 32) + '..' : devDetail;
          doc.text(truncDevDetail, 65, y + 5);

          const issuedDateStr = c.issuedAt ? (c.issuedAt.toDate ? c.issuedAt.toDate() : new Date(c.issuedAt)).toLocaleDateString('id-ID') : '-';
          doc.text(issuedDateStr, 125, y + 5);
          doc.text(c.nextCalibrationDate || '-', 155, y + 5);

          const certStatus = (c.status || 'active').toUpperCase();
          doc.setFont('Helvetica', 'bold');
          if (certStatus === 'ACTIVE') {
            doc.setTextColor(16, 120, 60);
            doc.text("AKTIF", 182, y + 5);
          } else {
            doc.setTextColor(180, 110, 10);
            doc.text("EXPIRED", 182, y + 5);
          }

          y += 7.5;
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y, 196, y);
        });
      }
      drawSubPageFooter(3, 5);

      // ==========================================
      // PAGE 4: WORK ORDERS COMPLETED / HISTORIC
      // ==========================================
      doc.addPage();
      drawSubPageHeader("Work Orders & Corrective Maintenance", "III");

      y = 38;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("3. RIWAYAT TIKET LAYANAN WORK ORDER (CORRECTIVE MAINTENANCE)", 14, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Berikut rekapitulasi penanganan kendala teknis dan keluhan fasilitas medis fasyankes Anda:", 14, y);
      y += 8;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 196, y);
      doc.line(14, y + 7, 196, y + 7);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Tanggal", 16, y + 5);
      doc.text("Alat (S/N)", 36, y + 5);
      doc.text("Deskripsi / Keterangan Masalah Selesai", 86, y + 5);
      doc.text("Kategori", 152, y + 5);
      doc.text("Status", 175, y + 5);

      y += 7;

      if (wos.length === 0) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Belum ada keluhan atau Work Order tercatat untuk Rumah Sakit Anda.", 20, y + 8);
        y += 15;
      } else {
        wos.forEach((wo) => {
          if (y > 265) {
            drawSubPageFooter(4, 5);
            doc.addPage();
            drawSubPageHeader("Work Orders & Corrective Maintenance", "III");
            y = 35;
            doc.setFillColor(241, 245, 249);
            doc.rect(14, y, 182, 7, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.text("Tanggal", 16, y + 5);
            doc.text("Alat (S/N)", 36, y + 5);
            doc.text("Deskripsi / Keterangan Masalah Selesai", 86, y + 5);
            doc.text("Kategori", 152, y + 5);
            doc.text("Status", 175, y + 5);
            y += 7;
          }

          const woDateStr = wo.createdAt ? (wo.createdAt.toDate ? wo.createdAt.toDate() : new Date(wo.createdAt)).toLocaleDateString('id-ID') : '-';
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(woDateStr, 16, y + 5);

          doc.setFont('Helvetica', 'bold');
          const devSNDetail = `${wo.deviceName || 'Alat'} (${wo.serialNumber || '-'})`;
          const truncDevSNDetail = devSNDetail.length > 25 ? devSNDetail.slice(0, 23) + '..' : devSNDetail;
          doc.text(truncDevSNDetail, 36, y + 5);

          doc.setFont('Helvetica', 'italic');
          const dDesc = wo.completionNotes || wo.description || '-';
          const truncDesc = dDesc.length > 38 ? dDesc.slice(0, 36) + '..' : dDesc;
          doc.text(truncDesc, 86, y + 5);

          doc.setFont('Helvetica', 'bold');
          const catStr = (wo.category || 'KALIBRASI').toUpperCase();
          doc.text(catStr, 152, y + 5);

          const woStatus = (wo.status || 'pending').toUpperCase();
          if (woStatus === 'COMPLETED' || woStatus === 'SELESAI') {
            doc.setTextColor(16, 120, 60);
            doc.text("SUKSES", 175, y + 5);
          } else if (woStatus === 'IN_PROGRESS' || woStatus === 'ASSIGNED') {
            doc.setTextColor(59, 130, 246);
            doc.text("PROSES", 175, y + 5);
          } else {
            doc.setTextColor(180, 110, 10);
            doc.text("PENDING", 175, y + 5);
          }

          y += 7.5;
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y, 196, y);
        });
      }
      drawSubPageFooter(4, 5);


      // ==========================================
      // PAGE 5: PREVENTIVE MAINTENANCE (IPM) LIST
      // ==========================================
      doc.addPage();
      drawSubPageHeader("Preventive Maintenance & Inspection Records", "IV");

      y = 38;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text("4. PROGRAM INSPEKSI PEMELIHARAAN MANDIRI (IPM) & PREVENTIVE", 14, y);
      y += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Inspeksi fisik dan pemeliharaan jangka panjang berkala terencana fasyankes Anda:", 14, y);
      y += 8;

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 7, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.line(14, y, 196, y);
      doc.line(14, y + 7, 196, y + 7);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Alat Medis", 16, y + 5);
      doc.text("No Seri (S/N)", 55, y + 5);
      doc.text("Jadwal Terakhir", 90, y + 5);
      doc.text("Jadwal Berikutnya", 125, y + 5);
      doc.text("Teknisi", 160, y + 5);
      doc.text("Status", 185, y + 5);

      y += 7;

      if (ipms.length === 0) {
        doc.setFont('Helvetica', 'italic');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text("Belum ada laporan Preventive Maintenance / IPM untuk Rumah Sakit Anda.", 20, y + 8);
        y += 15;
      } else {
        ipms.forEach((ipm) => {
          if (y > 255) {
            drawSubPageFooter(5, 5);
            doc.addPage();
            drawSubPageHeader("Preventive Maintenance & Inspection Records", "IV");
            y = 35;
            doc.setFillColor(241, 245, 249);
            doc.rect(14, y, 182, 7, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.text("Alat Medis", 16, y + 5);
            doc.text("No Seri (S/N)", 55, y + 5);
            doc.text("Jadwal Terakhir", 90, y + 5);
            doc.text("Jadwal Berikutnya", 125, y + 5);
            doc.text("Teknisi", 160, y + 5);
            doc.text("Status", 185, y + 5);
            y += 7;
          }

          doc.setFont('Helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          const iName = ipm.deviceName || 'Alat';
          const truncIName = iName.length > 20 ? iName.slice(0, 18) + '..' : iName;
          doc.text(truncIName, 16, y + 5);

          doc.setFont('Helvetica', 'normal');
          doc.text(ipm.serialNumber || '-', 55, y + 5);
          doc.text(ipm.lastMaintenanceDate || '-', 90, y + 5);
          doc.text(ipm.nextMaintenanceDate || '-', 125, y + 5);

          const techName = ipm.technicianName || 'Teknisi';
          const truncTech = techName.length > 14 ? techName.slice(0, 12) + '..' : techName;
          doc.text(truncTech, 160, y + 5);

          const ipmStatus = (ipm.status || 'Selesai').toUpperCase();
          if (ipmStatus === 'SELESAI' || ipmStatus === 'PASS') {
            doc.setTextColor(16, 120, 60);
          } else {
            doc.setTextColor(180, 110, 10);
          }
          doc.text(ipmStatus, 185, y + 5);

          y += 7.5;
          doc.setDrawColor(241, 245, 249);
          doc.line(14, y, 196, y);
        });
      }

      if (y > 230) {
        doc.addPage();
        drawSubPageHeader("Preventive Maintenance & Inspection Records", "IV");
        y = 35;
      }

      y += 10;
      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.4);
      doc.rect(14, y, 182, 30, 'D');
      doc.setFillColor(248, 250, 252);
      doc.rect(14.2, y + 0.2, 181.6, 29.6, 'F');

      doc.setTextColor(79, 70, 229);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.text("QUANTUM PRECISION COMPLIANCE SEAL • PT. KPS METROLOGY", 20, y + 9);

      doc.setTextColor(71, 85, 105);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Integrated Audit Code: QUA-${Math.floor(Math.random() * 90000) + 10000}-${hospitalToReport.toUpperCase().slice(0, 4)}`, 20, y + 16);
      doc.text("Seluruh data laporan ini bersifat valid, berintegritas tinggi, dan terhubung langsung ke basis data Quantum KPS.", 20, y + 21);
      doc.text("PT. Quantum Precision Systems berkomitmen menjaga kelaikan alat medis demi keselamatan pelayanan pasien nasional.", 20, y + 25);

      drawSubPageFooter(5, 5);

      // Save PDF
      doc.save(`Complete_Audit_Report_${hospitalToReport.replace(/\s+/g, '_')}.pdf`);

      await logAction(
        `Mengunduh Laporan RS Komplit: ${hospitalToReport}`,
        'reports',
        `Data: ${uniqueAssetsList.length} Aset, ${certs.length} Sertifikat, ${wos.length} Work Orders untuk fasyankes ${hospitalToReport}`,
        'info'
      );

    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan saat mengkompilasi file PDF: " + err.message);
    } finally {
      setDownloadingHospitalReport(false);
    }
  };

  // Load searchable devices list
  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const devsMap = new Map();

        // 1. Fetch from medicalEquipment
        const eqSnap = await getDocs(collection(db, 'medicalEquipment'));
        eqSnap.forEach(docSnap => {
          const d = docSnap.data();
          if (d.serialNumber) {
            devsMap.set(d.serialNumber, {
              serialNumber: d.serialNumber,
              name: d.name || 'Alat Medis',
              brand: d.brand || '',
              model: d.model || '',
              maintenanceSchedule: d.maintenanceSchedule || ''
            });
          }
        });

        // 2. Fetch unique serial numbers from work orders
        let woQuery = query(collection(db, 'work_orders'));
        if (isClient && profile?.hospitalName) {
          woQuery = query(collection(db, 'work_orders'), where('hospitalName', '==', profile.hospitalName));
        }
        const woSnap = await getDocs(woQuery);
        woSnap.forEach(docSnap => {
          const w = docSnap.data();
          if (w.serialNumber) {
            if (!devsMap.has(w.serialNumber)) {
              devsMap.set(w.serialNumber, {
                serialNumber: w.serialNumber,
                name: w.deviceName || 'Alat Medis',
                brand: w.brand || '',
                model: w.model || '',
                maintenanceSchedule: ''
              });
            }
          }
        });

        // 3. Keep list sorted
        const list = Array.from(devsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setDeviceList(list);

        // Pre-select first device if available
        if (list.length > 0) {
          setSelectedSerialNumber(list[0].serialNumber);
        }
      } catch (err) {
        console.error("Error loading devices for service history history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [isClient, profile?.hospitalName]);

  // Handle serial selection
  useEffect(() => {
    if (!selectedSerialNumber) {
      setSelectedDevice(null);
      setWorkOrders([]);
      setCertificates([]);
      setIpmTasks([]);
      setTimelineEvents([]);
      return;
    }

    const loadAggregatedHistory = async () => {
      setSearching(true);
      try {
        // Set metadata device
        const currentDev = deviceList.find(d => d.serialNumber === selectedSerialNumber) || {
          serialNumber: selectedSerialNumber,
          name: 'Alat Medis Utama',
          brand: '',
          model: ''
        };
        setSelectedDevice(currentDev);

        // Define parallel queries
        // A. Work Orders queries
        const woQuery = query(
          collection(db, 'work_orders'), 
          where('serialNumber', '==', selectedSerialNumber)
        );

        // B. IPM Tasks queries
        const ipmQuery = query(
          collection(db, 'ipm_tasks'), 
          where('serialNumber', '==', selectedSerialNumber)
        );

        // C. Worksheets queries (to associate with certificates)
        const wsQuery = query(
          collection(db, 'worksheets'),
          where('serialNumber', '==', selectedSerialNumber)
        );

        const [woSnap, ipmSnap, wsSnap] = await Promise.all([
          getDocs(woQuery),
          getDocs(ipmQuery),
          getDocs(wsQuery)
        ]);

        // Map Work Orders
        const mappedWOs = woSnap.docs.map(dSnap => {
          const d = dSnap.data();
          return {
            id: dSnap.id,
            type: 'work_order',
            title: 'Work Order (Maintenance/Perbaikan)',
            date: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : new Date(),
            status: d.status,
            priority: d.priority,
            notes: d.completionNotes || d.description,
            techName: d.technicianName || 'Belum ditentukan',
            original: d
          };
        }).sort((a: any, b: any) => b.date - a.date);

        // Map IPM
        const mappedIPM = ipmSnap.docs.map(dSnap => {
          const d = dSnap.data();
          return {
            id: dSnap.id,
            type: 'ipm',
            title: 'Sertifikasi Inspeksi IPM',
            date: d.createdAt ? (d.createdAt.toDate ? d.createdAt.toDate() : new Date(d.createdAt)) : new Date(),
            status: d.status,
            notes: d.executionNotes || 'Preventive Maintenance selesai.',
            techName: d.technicianName || 'Teknisi KPS',
            original: d
          };
        }).sort((a: any, b: any) => b.date - a.date);

        // Map Worksheets and grab linked certificates
        const sheetIds = wsSnap.docs.map(dSnap => dSnap.id);
        let mappedCerts: any[] = [];

        if (sheetIds.length > 0) {
          // Batch fetch certificates that match wsIds
          const certsQuery = query(
            collection(db, 'certificates'),
            where('lkId', 'in', sheetIds)
          );
          const certsSnap = await getDocs(certsQuery);
          
          mappedCerts = certsSnap.docs.map(cSnap => {
            const data = cSnap.data();
            const ws = wsSnap.docs.find(s => s.id === data.lkId)?.data();
            return {
              id: cSnap.id,
              type: 'certificate',
              title: `Sertifikat Kalibrasi KPS`,
              certificateNumber: data.certificateNumber,
              date: data.issuedAt ? (data.issuedAt.toDate ? data.issuedAt.toDate() : new Date(data.issuedAt)) : new Date(),
              status: data.status,
              notes: `Masa Berlaku hingga ${data.nextCalibrationDate || '-'}`,
              techName: data.issuedByName || 'Quantum Precision Certifier',
              nextCalibration: data.nextCalibrationDate,
              original: data,
              ws: ws
            };
          });
        }

        setWorkOrders(mappedWOs);
        setIpmTasks(mappedIPM);
        setCertificates(mappedCerts);

        // Compile and sort timeline events hierarchically
        const unified = [...mappedWOs, ...mappedIPM, ...mappedCerts].sort((a, b) => b.date - a.date);
        setTimelineEvents(unified);

      } catch (err) {
        console.error("Error aggregating device compliance services history:", err);
      } finally {
        setSearching(false);
      }
    };

    loadAggregatedHistory();
  }, [selectedSerialNumber, deviceList]);

  // Display safe date string
  const formatEventDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Safe compliance status indicator
  const getComplianceStatus = () => {
    if (certificates.length === 0) {
      return {
        label: "BELUM DIKALIBRASI",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
        message: "Perangkat belum tercatat memiliki sertifikat kalibrasi resmi dari Quantum Precision Systems."
      };
    }
    const activeCert = certificates.find(c => c.status === 'active');
    if (activeCert) {
      return {
        label: "KOMPLIEN - SERTIFIKAT AKTIF",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        message: "Perangkat ini layak operasional dengan sertifikat kalibrasi aktif hingga " + (activeCert.nextCalibration || "selanjutnya") + "."
      };
    }
    return {
      label: "EXPIRED / TIDAK LAID",
      color: "bg-red-500/10 text-red-500 border-red-500/20",
      message: "Sertifikat kalibrasi telah melewati batas kedaluwarsa. Jadwalkan kalibrasi ulang secepatnya."
    };
  };

  const compliance = getComplianceStatus();

  // Filter logic
  const filteredEvents = timelineEvents.filter(ev => {
    const matchesTab = activeTab === 'all' || 
                       (activeTab === 'work_orders' && ev.type === 'work_order') ||
                       (activeTab === 'certificates' && ev.type === 'certificate') ||
                       (activeTab === 'ipm' && ev.type === 'ipm');
    
    const matchesQuery = !searchFilter || 
                         ev.title?.toLowerCase().includes(searchFilter.toLowerCase()) || 
                         ev.notes?.toLowerCase().includes(searchFilter.toLowerCase()) || 
                         ev.techName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                         ev.certificateNumber?.toLowerCase().includes(searchFilter.toLowerCase());

    return matchesTab && matchesQuery;
  });

  if (loading) {
    return (
      <div className="flex flex-col h-[70vh] items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-600 dark:text-cyan-400 animate-spin" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Menyiapkan Jejak Sejarah Alat...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 pb-20">
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-indigo-500 dark:bg-[#56b3e6] rounded-full animate-ping" />
            <span className="text-[10px] font-mono tracking-[0.3em] text-indigo-600 dark:text-cyan-400 font-extrabold uppercase">
              Quantum Compliance Engine
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 dark:bg-cyan-500 rounded-[1.5rem] flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/20">
              <History className="w-7 h-7 text-white dark:text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">
                Service History <span className="text-indigo-600 dark:text-cyan-400 font-light lowercase font-sans">& compliance audit</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1.5 font-mono uppercase tracking-widest">
                Rekapitulasi Holistik Work Orders, Sertifikat Kalibrasi, & Preventive Maintenance (IPM)
              </p>
            </div>
          </div>
        </div>

        {/* Actions & Device Picker */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full xl:w-auto shrink-0">
          {profile?.hospitalName && (
            <button
              onClick={handleDownloadHospitalReportPDF}
              disabled={downloadingHospitalReport}
              className="px-6 py-4 bg-emerald-600 hover:bg-emerald-750 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-black uppercase text-[10px] tracking-widest rounded-[1.5rem] flex items-center justify-center gap-2 border border-emerald-500/10 cursor-pointer shadow-lg shadow-emerald-500/15 duration-300 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            >
              {downloadingHospitalReport ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengkompilasi Audit...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Unduh Laporan RS Komplit
                </>
              )}
            </button>
          )}

          {/* Device Picker */}
          <div className="bg-white dark:bg-[#10192d] p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 w-full xl:w-[350px] shadow-sm flex items-center gap-3">
            <Stethoscope className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="flex-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">PILIH NOMOR SERI / ALAT MEDIS</span>
              <select
                value={selectedSerialNumber}
                onChange={(e) => setSelectedSerialNumber(e.target.value)}
                className="w-full bg-transparent border-none text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider outline-none mt-1 p-0.5 cursor-pointer"
              >
                <option value="" disabled className="text-slate-400 bg-white dark:bg-[#10192d]">-- Pilih Seri Alat --</option>
                {deviceList.map((dev) => (
                  <option key={dev.serialNumber} value={dev.serialNumber} className="bg-white dark:bg-[#10192d] text-slate-800 dark:text-slate-200">
                    {dev.name} ({dev.serialNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* RENDER CONTENT IF SERIAL IS SELECTED */}
      {selectedDevice ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
          
          {/* LEFT CLUSTER: COMPLIANCE RATING & DEVICE SPEC */}
          <div className="xl:col-span-1 space-y-6">
            
            {/* DEVICE SPECS CARD */}
            <div className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-7 shadow-sm space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/5 dark:bg-cyan-500/10 flex items-center justify-center text-indigo-600 dark:text-cyan-400 shrink-0 border border-indigo-500/10">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">{selectedDevice.name}</h3>
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">Serial: {selectedDevice.serialNumber}</p>
                </div>
              </div>

              <div className="space-y-4 font-mono text-[10px]">
                <div>
                  <span className="text-slate-400 uppercase font-black tracking-widest block">BRAND / MERK</span>
                  <p className="text-slate-800 dark:text-slate-200 font-extrabold text-xs mt-1 uppercase">{selectedDevice.brand || 'Quantum Standard'}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-black tracking-widest block">MODEL / UNIT TYPE</span>
                  <p className="text-slate-800 dark:text-slate-200 font-extrabold text-xs mt-1 uppercase">{selectedDevice.model || 'QT-SERIES'}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-black tracking-widest block">INTERVAL KALIBRASI</span>
                  <p className="text-slate-800 dark:text-slate-200 font-extrabold text-xs mt-1 uppercase">{selectedDevice.maintenanceSchedule || '12 BULAN (TAHUNAN)'}</p>
                </div>
              </div>
            </div>

            {/* COMPLIANCE RATING */}
            <div className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-7 shadow-sm space-y-5">
              <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Compliance Health Card</span>
              
              <div className={cn(
                "p-4 border rounded-2xl flex items-center gap-3.5",
                compliance.color
              )}>
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <div>
                  <span className="text-[9px] font-mono font-black tracking-widest block">STATUS KELAYAKAN</span>
                  <span className="text-xs font-black uppercase tracking-wider block mt-0.5">{compliance.label}</span>
                </div>
              </div>

              <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                {compliance.message}
              </p>
            </div>

            {/* COMPLIANCE ACTION CENTER */}
            <div className="bg-[#56b3e6]/5 border border-[#56b3e6]/15 rounded-[2.5rem] p-7 shadow-sm space-y-4">
              <span className="text-[9px] font-mono font-black text-indigo-500 dark:text-cyan-400 uppercase tracking-widest block font-bold">Action Control Panel</span>
              
              <button
                onClick={handleDownloadPDF}
                className="w-full py-3.5 bg-indigo-600 hover:bg-slate-900 dark:bg-cyan-500 dark:hover:bg-cyan-400 text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <FileText className="w-4 h-4" /> Download Compliance Report
              </button>

              <button
                onClick={handleOpenIPMCreate}
                className="w-full py-3.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Wrench className="w-4 h-4 text-indigo-500 dark:text-cyan-400" /> Auto-Prefill IPM Task
              </button>
            </div>

            {/* QUICK STATS */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white dark:bg-[#10192d] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                <span className="text-[8px] font-black font-mono text-slate-400 uppercase tracking-wider block leading-none">WORK ORDERS</span>
                <span className="text-xl font-black text-slate-800 dark:text-white font-mono mt-2 block">{workOrders.length}</span>
              </div>
              <div className="bg-white dark:bg-[#10192d] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                <span className="text-[8px] font-black font-mono text-slate-400 uppercase tracking-wider block leading-none">SERTIFIKAT</span>
                <span className="text-xl font-black text-slate-800 dark:text-white font-mono mt-2 block">{certificates.length}</span>
              </div>
              <div className="bg-white dark:bg-[#10192d] p-5 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-center shadow-xs">
                <span className="text-[8px] font-black font-mono text-slate-400 uppercase tracking-wider block leading-none">IPM REPORT</span>
                <span className="text-xl font-black text-slate-800 dark:text-white font-mono mt-2 block">{ipmTasks.length}</span>
              </div>
            </div>

          </div>

          {/* RIGHT CLUSTER: UNIFIED COMPLIANCE TIMELINE */}
          <div className="xl:col-span-2 space-y-6">
            
            {/* SEARCH AND FILTERS BAR */}
            <div className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
              
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { value: 'all', label: 'Holistic Timeline' },
                  { value: 'work_orders', label: 'Work Orders' },
                  { value: 'certificates', label: 'Certificates' },
                  { value: 'ipm', label: 'IPM (Preventive)' }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setActiveTab(t.value as any)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer border",
                      activeTab === t.value 
                        ? "bg-indigo-600 dark:bg-cyan-500 border-indigo-600 dark:border-cyan-500 text-white dark:text-slate-950 shadow-md shadow-indigo-600/10"
                        : "bg-transparent border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900/50 text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="relative group w-full md:w-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter aktivitas..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-820 rounded-[1.5rem] pl-11 pr-5 py-3 text-xs font-bold text-slate-800 dark:text-white outline-none w-full md:w-[220px]"
                />
              </div>

            </div>

            {/* TIMELINE DISPLAY */}
            <div className="space-y-4">
              {searching ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-[10px] uppercase font-mono font-black tracking-widest text-slate-400 mt-4">Memuat Rekaman Audit Kalibrasi...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] py-20 text-center text-slate-400">
                  <p className="text-xs uppercase font-mono font-black tracking-widest italic leading-relaxed">Belum ada catatan aktivitas layanan untuk filter ini.</p>
                </div>
              ) : (
                <motion.div 
                  variants={timelineContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-4 relative before:absolute before:left-6.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800"
                >
                  {filteredEvents.map((ev) => (
                    <motion.div 
                      key={ev.id}
                      variants={timelineItem}
                      className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-5.5 shadow-xs flex items-start gap-4 transition-all hover:border-indigo-500/20"
                    >
                      {/* Icon Indicator */}
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border z-10",
                        ev.type === 'work_order' ? "bg-amber-500/5 text-amber-500 border-amber-500/20" :
                        ev.type === 'certificate' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" :
                        "bg-blue-500/5 text-blue-500 border-blue-500/20"
                      )}>
                        {ev.type === 'work_order' ? <ClipboardList className="w-5 h-5" /> :
                         ev.type === 'certificate' ? <Award className="w-5 h-5" /> :
                         <Wrench className="w-5 h-5" />}
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                          <span className="text-[10px] font-mono font-black uppercase text-slate-400 tracking-wider">
                            {ev.type === 'work_order' ? "Kategori: Keluhan / Perbaikan" :
                             ev.type === 'certificate' ? "Kategori: Sertifikat Kalibrasi" :
                             "Kategori: Preventive Maintenance"}
                          </span>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-400 font-extrabold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full w-fit">
                            {formatEventDate(ev.date)}
                          </span>
                        </div>

                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">{ev.title}</h4>
                        
                        {ev.certificateNumber && (
                          <p className="text-[10px] font-mono font-bold text-indigo-600 dark:text-cyan-400 uppercase tracking-widest">NO. SERTIFIKAT: {ev.certificateNumber}</p>
                        )}
                        
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-mono leading-relaxed normal-case">{ev.notes}</p>
                        
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-50 dark:border-slate-800/50 mt-3">
                          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                            <User className="w-3.5 h-3.5" />
                            <span>PIC: <span className="font-bold text-slate-600 dark:text-slate-200 uppercase">{ev.techName}</span></span>
                          </div>

                          <div className="flex items-center gap-2">
                            {ev.type === 'work_order' && (
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                ev.status === 'completed' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              )}>
                                {ev.status}
                              </span>
                            )}
                            
                            {ev.type === 'certificate' && (
                              <>
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                                  ev.status === 'active' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                )}>
                                  {ev.status === 'active' ? 'AKTIF' : 'KEDALUWARSA'}
                                </span>
                                <Link
                                  to={`/certificates/${ev.id}`}
                                  className="p-1 px-3.5 text-[#725bff] dark:text-cyan-400 bg-[#725bff]/5 hover:bg-[#725bff]/10 border border-[#725bff]/25 rounded-md text-[9px] font-black uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                                >
                                  Lihat Dokumen <ExternalLink className="w-3 h-3" />
                                </Link>
                              </>
                            )}

                            {ev.type === 'ipm' && (
                              <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
                                {ev.status}
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

          </div>

        </div>
      ) : (
        <div className="flex flex-col h-[50vh] items-center justify-center p-8 bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[3.5rem] shadow-2xl shadow-slate-200/20 max-w-2xl mx-auto text-center gap-4">
          <Stethoscope className="w-16 h-16 text-slate-300 dark:text-slate-700 shrink-0" />
          <h2 className="text-xl font-black uppercase tracking-wider text-slate-800 dark:text-white">Pilih Seri Alat Medis</h2>
          <p className="text-xs text-slate-400 font-mono max-w-sm mx-auto leading-relaxed uppercase">
            Gunakan selektor di pojok kanan atas untuk memuat riwayat compliance audit komplit untuk unit terpilih.
          </p>
        </div>
      )}

      {/* QUICK IPM MODAL */}
      <AnimatePresence>
        {isIPMModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsIPMModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl p-8 xl:p-10 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setIsIPMModalOpen(false)}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveIPM} className="space-y-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2.5">
                    <Activity className="w-6 h-6 text-indigo-600" /> Auto-Prefilled IPM Task
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-widest mt-1">
                    Form Pemeliharaan Preventif Mandiri Terisi Otomatis
                  </p>
                </div>

                {ipmError && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest font-mono">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>{ipmError}</span>
                  </div>
                )}

                <div className="space-y-5">
                  {/* Read-only Device details for confirmation */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 grid grid-cols-2 gap-3.5 text-[10px] font-mono mb-2">
                    <div>
                      <span className="text-slate-400 font-black block">ALAT MEDIS</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold uppercase">{ipmForm.deviceName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-black block">S/N NOMOR SERI</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold uppercase">{ipmForm.serialNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-black block">BRAND / MERK</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold uppercase">{ipmForm.brand}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-black block">TIPE / MODEL</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold uppercase">{ipmForm.model}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5 font-mono">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Rumah Sakit / Lokasi</label>
                      <input 
                        type="text" 
                        required
                        value={ipmForm.location}
                        onChange={(e) => setIpmForm({ ...ipmForm, location: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2.5 font-mono">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Unit / Departemen</label>
                      <input 
                        type="text" 
                        required
                        value={ipmForm.department}
                        onChange={(e) => setIpmForm({ ...ipmForm, department: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5 font-mono">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tanggal PM Terakhir</label>
                      <input 
                        type="date" 
                        required
                        value={ipmForm.lastMaintenanceDate}
                        onChange={(e) => setIpmForm({ ...ipmForm, lastMaintenanceDate: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2.5 font-mono">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Tanggal Selanjutnya</label>
                      <input 
                        type="date" 
                        required
                        value={ipmForm.nextMaintenanceDate}
                        onChange={(e) => setIpmForm({ ...ipmForm, nextMaintenanceDate: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2.5 font-mono">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Teknisi Penanggungjawab</label>
                      <input 
                        type="text" 
                        required
                        value={ipmForm.technicianName}
                        onChange={(e) => setIpmForm({ ...ipmForm, technicianName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-2.5 font-mono">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Status Hasil IPM</label>
                      <select 
                        value={ipmForm.status}
                        onChange={(e) => setIpmForm({ ...ipmForm, status: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer"
                      >
                        <option value="Selesai">SELESAI (PASS COMPLIANCE)</option>
                        <option value="Menunggu Jadwal">MENUNGGU JADWAL (SCHEDULED)</option>
                        <option value="Perlu Tindak Lanjut">PERLU TINDAK LANJUT (WARNING)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2.5 font-mono">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Hasil & Catatan Rekomendasi Eksekusi</label>
                    <textarea 
                      required
                      rows={3}
                      value={ipmForm.executionNotes}
                      onChange={(e) => setIpmForm({ ...ipmForm, executionNotes: e.target.value })}
                      placeholder="Tuliskan catatan inspeksi preventif rinci..."
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-3 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500"
                    />
                  </div>

                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setIsIPMModalOpen(false)}
                    className="px-6 py-3 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingIPM}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/15"
                  >
                    {savingIPM ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Registrasi IPM
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
