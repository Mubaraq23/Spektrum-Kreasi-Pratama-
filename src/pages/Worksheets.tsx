/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FileText, 
  Search, 
  Filter, 
  Activity, 
  ClipboardCheck, 
  Clock, 
  AlertCircle,
  BrainCircuit,
  CheckCircle,
  ChevronRight,
  Loader2,
  X,
  ChevronDown,
  Trash2,
  FileSpreadsheet,
  Camera,
  QrCode,
  Calculator,
  ShieldCheck,
  Wrench,
  Sparkles
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, where, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logAction, pushNotification } from '../lib/auditLogger';
import { translateToIndonesian, getDeviceNameFromMethodTitle } from '../lib/metrologyUtils';
import { CalculationEngine } from './CalculationEngine';
import { KANScopeMatrix } from './KANScopeMatrix';
import { CustomProtocolBuilder } from './CustomProtocolBuilder';
import { QRScannerModal } from '../components/QRManager';
import { LKLabelModal } from '../components/LKLabelModal';
import { Tilt3D } from '../components/Tilt3D';
import { MEDICAL_DEVICES_CATALOG } from '../data/medicalDeviceCatalog';

export function Worksheets() {
  const [activeTab, setActiveTab] = useState<'worksheets' | 'calculator' | 'scope' | 'protocol'>('worksheets');
  const [worksheets, setWorksheets] = useState<{ id: string; [key: string]: any }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [methods, setMethods] = useState<{ id: string; [key: string]: any }[]>([]);
  const [deviceName, setDeviceName] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [inventoryNames, setInventoryNames] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [equipment, setEquipment] = useState<{ id: string; name?: string; brand?: string; model?: string; serialNumber?: string; [key: string]: any }[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isMethodDropdownOpen, setIsMethodDropdownOpen] = useState(false);
  
  // Custom Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || !profile) return;

    let q = query(collection(db, 'worksheets'), orderBy('createdAt', 'desc'));
    
    // Technicians only see their own worksheets to satisfy security rules
    if (profile.role === 'technician') {
      q = query(
        collection(db, 'worksheets'), 
        where('technicianId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorksheets(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'worksheets');
    });

    // Fetch methods for creation
    const fetchMetadata = async () => {
      try {
        const [methodsSnap, equipSnap] = await Promise.all([
          getDocs(collection(db, 'methods')),
          getDocs(collection(db, 'medicalEquipment'))
        ]);
        setMethods(methodsSnap.docs.map(m => ({ id: m.id, ...m.data() })));
        
        const equipData = equipSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEquipment(equipData);

        const names = equipSnap.docs.map(doc => doc.data().name).filter(Boolean) as string[];
        const uniqueNames = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
        setInventoryNames(uniqueNames);
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    };
    fetchMetadata();

    return () => unsubscribe();
  }, [user, profile]);

  const handleCreateLK = async () => {
    if (!deviceName || !user) return;
    setCreating(true);
    try {
      const method = methods.find(m => m.id === selectedMethod);

      // Match device from catalog if method parameters are not yet populated
      const catalogMatch = MEDICAL_DEVICES_CATALOG.find(d => 
        d.name.toLowerCase().includes(deviceName.toLowerCase()) ||
        deviceName.toLowerCase().includes(d.name.toLowerCase()) ||
        d.id === selectedMethod ||
        d.codeIK === method?.codeIK
      );

      // Pre-populate measurements from method or catalog
      let initialMeasurements: any[] = [];
      const paramsSource = method?.parameters || catalogMatch?.parameters;
      if (paramsSource && Array.isArray(paramsSource)) {
        initialMeasurements = paramsSource.map((p: any) => ({
          parameterName: p.name,
          unit: p.unit || '',
          tolerance: p.tolerance || 5,
          points: (p.points || []).map((nominal: number) => ({
            nominal: nominal,
            readings: [nominal, nominal, nominal],
            average: nominal,
            correction: 0,
            uncertainty: 0
          }))
        }));
      }

      // Pre-populate inspections
      const physicalList = method?.inspections?.physical || catalogMatch?.inspections?.physical || [
        'Badan & Permukaan', 'Layar / Display', 'Tombol / Kontrol', 'Kabel & Konektor', 'Catu Daya / Baterai'
      ];
      const functionalList = method?.inspections?.functional || catalogMatch?.inspections?.functional || [
        'Self-Test Booting', 'Fungsi Utama', 'Sistem Alarm'
      ];

      const initialPhysical: Record<string, boolean> = {};
      physicalList.forEach((k: string) => { initialPhysical[k] = true; });

      const initialFunctional: Record<string, boolean> = {};
      functionalList.forEach((k: string) => { initialFunctional[k] = true; });

      const docRef = await addDoc(collection(db, 'worksheets'), {
        deviceId: 'manual-' + Date.now(),
        deviceName: deviceName,
        brand: '',
        model: '',
        serialNumber: '',
        fasyankesName: '',
        location: '',
        methodId: selectedMethod || (catalogMatch ? catalogMatch.id : ''),
        methodName: translateToIndonesian(method?.title || method?.name || catalogMatch?.name || 'Metode Standar KAN'),
        codeIK: method?.codeIK || catalogMatch?.codeIK || 'IK-SPK-GEN-01',
        technicianId: user.uid,
        technicianName: profile?.displayName || user.email,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        inspections: {
          physical: initialPhysical,
          functional: initialFunctional,
          electrical: { enabled: true, results: { grounding: '0.08', insulation: '150', leakage: '42' } }
        },
        measurements: initialMeasurements,
        results: {
          pass: false,
          notes: ''
        }
      });
      await logAction(
        `Membuat Lembar Kerja Baru: ${deviceName}`,
        'worksheets',
        `Alat: ${deviceName}, ID: ${docRef.id}`,
        'info'
      );
      await pushNotification(
        'Lembar Kerja Baru Dibuat',
        `Lembar kerja untuk ${deviceName} telah berhasil dibuat dalam draf dengan parameter pengukuran terinisialisasi.`,
        'success',
        'all',
        `/worksheets/${docRef.id}/edit`
      );
      setIsModalOpen(false);
      setDeviceName('');
      setSelectedMethod('');
      navigate(`/worksheets/${docRef.id}/edit`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'worksheets');
    } finally {
      setCreating(false);
    }
  };

  const handleExcelImport = async () => {
    if (!pastedText.trim() || !user) {
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
          importType: 'worksheet'
        })
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Gagal memparsing data Excel dengan AI.');
      }

      setImportStatus("Menyimpan hasil ekstraksi ke database...");
      const parsed = await resp.json();

      const docRef = await addDoc(collection(db, 'worksheets'), {
        deviceId: 'manual-' + Date.now(),
        deviceName: parsed.deviceName || 'Alat Medis (Excel Import)',
        brand: parsed.brand || '',
        model: parsed.model || '',
        serialNumber: parsed.serialNumber || '',
        fasyankesName: parsed.fasyankesName || '',
        location: parsed.location || '',
        methodId: 'excel-import',
        methodName: 'Metode Pengukuran Umum (Excel Import)',
        technicianId: user.uid,
        technicianName: profile?.displayName || user.email,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        inspections: {
          physical: {},
          functional: {},
          electrical: { enabled: false, results: {} }
        },
        measurements: parsed.measurements || [],
        results: {
          pass: false,
          notes: 'Diimpor otomatis menggunakan AI Excel Importer.'
        }
      });

      await logAction(
        `Mengimpor Lembar Kerja Baru via Excel: ${parsed.deviceName}`,
        'worksheets',
        `Alat: ${parsed.deviceName}, ID: ${docRef.id}`,
        'info'
      );

      await pushNotification(
        'Excel Berhasil Diimpor',
        `Lembar kerja untuk ${parsed.deviceName} telah berhasil diimpor oleh AI.`,
        'success',
        'all',
        `/worksheets/${docRef.id}/edit`
      );

      showToast("Berhasil mengimpor data Excel! Mengalihkan ke editor...", "success");
      setIsExcelModalOpen(false);
      setPastedText('');
      navigate(`/worksheets/${docRef.id}/edit`);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || "Gagal mengimpor data Excel. Harap periksa format data.", "error");
    } finally {
      setIsImporting(false);
      setImportStatus("");
    }
  };

  const handleDeleteLK = async (lkId: string) => {
    try {
      await deleteDoc(doc(db, 'worksheets', lkId));
      showToast('Lembar kerja berhasil dihapus permanen dari sistem.', 'success');
      console.log("LK deleted successfully:", lkId);
    } catch (error) {
      console.error("Error deleting LK:", error);
      handleFirestoreError(error, OperationType.DELETE, `worksheets/${lkId}`);
      showToast('Gagal menghapus lembar kerja.', 'error');
    }
  };

  const categories = Array.from(new Set(methods.map(m => m.deviceCategory || 'Umum'))).filter(Boolean) as string[];
  const filteredMethodsInModal = selectedCategory === 'all'
    ? methods
    : methods.filter(m => (m.deviceCategory || 'Umum') === selectedCategory);

  const filteredWorksheets = worksheets.filter((lk) => {
    const q = searchQuery.toLowerCase();
    const dName = (lk.deviceName || '').toLowerCase();
    const mName = (lk.methodName || '').toLowerCase();
    const lkId = (lk.id || '').toLowerCase();
    const fasyankes = (lk.fasyankesName || '').toLowerCase();
    const techName = (lk.technicianName || '').toLowerCase();
    const status = (lk.status || '').toLowerCase();
    return dName.includes(q) || mName.includes(q) || lkId.includes(q) || fasyankes.includes(q) || techName.includes(q) || status.includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative p-1 pb-12 min-h-screen transition-all duration-300 font-sans">
      
      {/* Master Metrology Tab Switcher Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400">
            <FileText className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Modul Terpadu Kalibrasi & Metrologi KAN
            </h2>
            <p className="text-[10px] text-slate-400 font-medium">Lembar Kerja Digital, Mesin Perhitungan u95, Lingkup KAN, & Builder Metode</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('worksheets')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'worksheets'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow-md shadow-amber-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" /> Lembar Kerja
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'calculator'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4" /> Mesin Perhitungan u95
          </button>

          <button
            onClick={() => setActiveTab('scope')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'scope'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Lingkup KAN
          </button>

          <button
            onClick={() => setActiveTab('protocol')}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'protocol'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4" /> Builder Metode
          </button>
        </div>
      </div>

      {activeTab === 'calculator' ? (
        <CalculationEngine />
      ) : activeTab === 'scope' ? (
        <KANScopeMatrix />
      ) : activeTab === 'protocol' ? (
        <CustomProtocolBuilder />
      ) : (
        <>
      {/* Top Small Crisp Data Summary Panel */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 border-b border-sky-500/10 dark:border-cyan-500/10 pb-3 text-[10px] font-mono tracking-[0.2em] text-slate-400 dark:text-slate-500 select-none">
        <div className="flex items-center gap-4">
          <span className="text-[#06B6D4] font-black">METROLOGY ID: WORKSHEETS-CORE</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-800">|</span>
          <span className="hidden sm:inline">KAN SERVICE LEVEL A-PROV</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
            STANDARDS SYNCHRONOUS
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
             <div className="w-8 h-1 bg-[#06B6D4] rounded-full" />
             <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-black uppercase tracking-[0.4em] font-mono">Arsip Digital & Komando Kerja</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2 uppercase italic">
            Lembar Kerja <span className="text-[#06B6D4] italic">Digital</span>
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.3em]">Manajemen Siklus Hidup Kalibrasi Aset Kemenkes RI</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button 
            onClick={() => setShowScanner(true)}
            className="px-6 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-[#141b2c] dark:hover:bg-[#1f283d] text-slate-800 dark:text-white border border-slate-200 dark:border-cyan-500/20 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 active:scale-95 cursor-pointer shadow-sm"
          >
            <Camera className="w-4 h-4 text-cyan-500" />
            Pindai QR Aset
          </button>
          <button 
            onClick={() => setIsExcelModalOpen(true)}
            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 dark:border-emerald-500/30 font-black px-6 py-4 rounded-2xl flex items-center justify-center gap-2.5 transition-all uppercase tracking-widest text-[10px] cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Import Excel AI
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-slate-950 dark:text-[#070d19] font-black px-8 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-cyan-500/10 uppercase tracking-widest text-[10px] active:scale-95 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            Mulai LK Baru
          </button>
        </div>
      </div>

      {/* Futuristic Glassmorphic HUD Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 bg-slate-50/50 dark:bg-[#10192d]/50 backdrop-blur-xl border border-slate-200/50 dark:border-cyan-500/10 rounded-[2rem] shadow-sm">
        {[
          { label: "TOTAL LEMBAR KERJA", value: worksheets.length, color: "text-[#06B6D4]", bg: "bg-[#06B6D4]/5", border: "border-[#06B6D4]/10", icon: "📊" },
          { label: "SISTEM DRAF", value: worksheets.filter(w => w.status === 'draft').length, color: "text-slate-500", bg: "bg-slate-500/5", border: "border-slate-500/10", icon: "📁" },
          { label: "MENUNGGU PERSETUJUAN", value: worksheets.filter(w => w.status === 'pending').length, color: "text-amber-500", bg: "bg-amber-500/5", border: "border-amber-500/10", icon: "⏳" },
          { label: "SELESAI / TERVERIFIKASI", value: worksheets.filter(w => w.status === 'approved' || w.status === 'completed').length, color: "text-emerald-500", bg: "bg-emerald-500/5", border: "border-emerald-500/10", icon: "✅" },
        ].map((stat, i) => (
          <div key={i} className={cn("p-4 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.02]", stat.bg, stat.border)}>
            <div className="space-y-1">
              <span className="text-[8px] font-black tracking-widest uppercase block font-mono text-slate-400 dark:text-slate-500">{stat.label}</span>
              <span className={cn("text-xl font-black font-mono block", stat.color)}>{stat.value}</span>
            </div>
            <span className="text-base p-2 bg-white dark:bg-[#070d19] rounded-xl shadow-sm border border-slate-200/20">{stat.icon}</span>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 dark:bg-[#10192d]/80 backdrop-blur-xl border border-sky-500/10 dark:border-cyan-500/20 rounded-3xl p-3 flex flex-wrap items-center gap-3 shadow-xl dark:shadow-none sticky top-4 z-20">
        <div className="flex-1 relative flex items-center min-w-[200px]">
          <Search className="absolute left-6 w-5 h-5 text-slate-400 dark:text-cyan-400/50" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari aset, instansi, atau ID lembar kerja..."
            className="w-full bg-slate-50 dark:bg-[#070d19]/80 border border-slate-200 dark:border-cyan-500/15 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#06B6D4] focus:border-[#06B6D4] transition-all placeholder:text-slate-400 shadow-inner"
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="h-14 px-6 flex items-center gap-3 bg-white dark:bg-[#070d19]/60 border border-slate-200 dark:border-cyan-500/10 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:border-cyan-500/40 transition-all shadow-sm">
             <Filter className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
             Filter
           </button>
           <button className="h-14 px-6 flex items-center gap-3 bg-white dark:bg-[#070d19]/60 border border-slate-200 dark:border-cyan-500/10 rounded-2xl text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest hover:border-cyan-500/40 transition-all shadow-sm">
             <Clock className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
             Urutkan
           </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !creating && setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-auto max-h-[90vh]"
            >
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
                <div>
                   <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Inisialisasi Sistem</h2>
                   <p className="text-[9px] text-slate-600 dark:text-cyan-400 font-black uppercase tracking-widest mt-1">Konfigurasi Protokol Kalibrasi Baru</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-3xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all animate-pulse"
                  title="Tutup"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-10 space-y-8">
                <div className="space-y-6">
                  {/* Filter Kategori Alat Kesehatan */}
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest ml-1 font-mono">Kategori Alat Kesehatan</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
                          setIsMethodDropdownOpen(false);
                        }}
                        className="w-full bg-white dark:bg-[#070d19]/80 border border-slate-300 dark:border-slate-705 rounded-2xl px-6 py-5 text-sm font-bold text-left text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all flex items-center justify-between uppercase tracking-widest"
                      >
                        <span>
                          {selectedCategory === 'all' ? '-- SEMUA KATEGORI --' : selectedCategory.toUpperCase()}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isCategoryDropdownOpen && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                        {isCategoryDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsCategoryDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#10192d] border border-slate-250 dark:border-slate-800 rounded-2xl shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory('all');
                                  setSelectedMethod('');
                                  setDeviceName('');
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-6 py-4 text-xs font-bold transition-all uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50",
                                  selectedCategory === 'all' ? "text-blue-600 dark:text-cyan-400 bg-blue-50/20 dark:bg-cyan-950/10" : "text-slate-600 dark:text-slate-400"
                                )}
                              >
                                -- SEMUA KATEGORI --
                              </button>
                              {categories.map((cat: string) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCategory(cat);
                                    setSelectedMethod('');
                                    setDeviceName('');
                                    setIsCategoryDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-6 py-4 text-xs font-bold transition-all uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 last:border-0",
                                    selectedCategory === cat ? "text-blue-600 dark:text-cyan-400 bg-blue-50/20 dark:bg-cyan-950/10" : "text-slate-800 dark:text-slate-200"
                                  )}
                                >
                                  {cat.toUpperCase()}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest ml-1 font-mono">Protokol Kalibrasi (Metode)</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setIsMethodDropdownOpen(!isMethodDropdownOpen);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className="w-full bg-white dark:bg-[#070d19]/80 border border-slate-300 dark:border-slate-705 rounded-2xl px-6 py-5 text-sm font-bold text-left text-slate-800 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all flex items-center justify-between uppercase tracking-widest"
                      >
                        <span>
                          {selectedMethod 
                            ? translateToIndonesian(methods.find(m => m.id === selectedMethod)?.title || methods.find(m => m.id === selectedMethod)?.name || '')
                            : '-- PILIH PROTOKOL --'}
                        </span>
                        <ChevronDown className={cn("w-4 h-4 text-slate-500 transition-transform", isMethodDropdownOpen && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                        {isMethodDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setIsMethodDropdownOpen(false)} />
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#10192d] border border-slate-250 dark:border-slate-800 rounded-2xl shadow-2xl z-20 max-h-60 overflow-y-auto custom-scrollbar"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMethod('');
                                  setIsMethodDropdownOpen(false);
                                }}
                                className={cn(
                                  "w-full text-left px-6 py-4 text-xs font-bold transition-all uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50",
                                  !selectedMethod ? "text-blue-600 dark:text-cyan-400 bg-blue-50/20 dark:bg-cyan-950/10" : "text-slate-600 dark:text-slate-400"
                                )}
                              >
                                -- PILIH PROTOKOL --
                              </button>
                              {filteredMethodsInModal.map((m: any) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMethod(m.id);
                                    setDeviceName(getDeviceNameFromMethodTitle(m.title || m.name || ''));
                                    setIsMethodDropdownOpen(false);
                                  }}
                                  className={cn(
                                    "w-full text-left px-6 py-4 text-xs font-bold transition-all uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-slate-900 border-b border-slate-100 dark:border-slate-800/50 last:border-0",
                                    selectedMethod === m.id ? "text-blue-600 dark:text-cyan-400 bg-blue-50/20 dark:bg-cyan-950/10" : "text-slate-800 dark:text-slate-200"
                                  )}
                                >
                                  {translateToIndonesian(m.title || m.name || 'Tanpa Nama')}
                                </button>
                              ))}
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* 1-Click Quick Preset Shortcut Badges */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-cyan-500 uppercase tracking-widest ml-1 font-mono flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Preset 1-Klik Alat Medis Populer
                    </label>
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-950/60 rounded-2xl border border-slate-800">
                      {[
                        { name: 'Defibrillator TEC-5631 (Biphasic)', category: 'Resusitasi' },
                        { name: 'Infusion Pump IP-7700', category: 'Pompa Infus' },
                        { name: 'Patient Monitor Vista 120 (5-Para)', category: 'Vital Sign' },
                        { name: 'Pesawat Sinar-X Radiografi Stasioner', category: 'Radiologi' },
                        { name: 'ECG 12-Channel Cardiovit AT-102', category: 'Kardiologi' },
                        { name: 'Suction Pump Vacu-Aide High Flow', category: 'Penyedot' },
                        { name: 'Sphygmomanometer Tensimeter Digital', category: 'Tekanan Darah' },
                        { name: 'Autoclave Steam Sterilizer 50L', category: 'Sterilisasi' },
                        { name: 'Centrifuge Hettich EBA 200', category: 'Laboratorium' },
                        { name: 'Baby Incubator Isolette 8000', category: 'Neonatus' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setDeviceName(preset.name)}
                          className={cn(
                            "text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer border",
                            deviceName === preset.name
                              ? "bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-md shadow-cyan-500/20"
                              : "bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-white"
                          )}
                        >
                          + {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest ml-1 font-mono">Nama Alat Kesehatan</label>
                    <div className="relative group">
                      <input 
                        type="text"
                        required
                        value={deviceName}
                        onChange={(e) => setDeviceName(e.target.value)}
                        list="inventory-suggestions"
                        placeholder="Masukkan nama alat cetak/kalibrasi..."
                        className="w-full bg-white dark:bg-[#070d19]/80 border border-slate-400 dark:border-slate-700/80 rounded-2xl px-6 py-5 text-sm text-black dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 appearance-none transition-all font-black uppercase tracking-widest placeholder:text-slate-500 shadow-inner"
                      />
                      <datalist id="inventory-suggestions">
                        {inventoryNames.map(name => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </div>


                    {/* Quick suggestion badges based on inventory */}
                    {inventoryNames.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Saran dari Inventaris Aktif</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50/50 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar">
                          {inventoryNames
                            .filter(name => !deviceName || name.toLowerCase().includes(deviceName.toLowerCase()))
                            .slice(0, 6)
                            .map(name => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => setDeviceName(name)}
                                className={cn(
                                  "text-[9px] font-black px-3 py-2 border rounded-xl uppercase tracking-wider transition-all",
                                  deviceName === name 
                                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25" 
                                    : "bg-white dark:bg-[#0c111d] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 hover:border-blue-400 hover:text-blue-600"
                                )}
                              >
                                {name}
                              </button>
                            ))
                          }
                          {inventoryNames.filter(name => !deviceName || name.toLowerCase().includes(deviceName.toLowerCase())).length === 0 && (
                            <p className="text-[9px] font-bold text-slate-400 italic uppercase p-1">Nama alat tidak ditemukan di inventaris</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-4">
                  <button 
                    onClick={handleCreateLK}
                    disabled={!deviceName || creating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-20 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 uppercase tracking-widest text-xs active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-6 h-6" />
                        Jalankan Lembar Kerja
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-6 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800/80 text-center">
                 <p className="text-[9px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.5em] font-mono">Spektrum Cyber Core Protocol v.26</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Excel Importer Modal */}
      <AnimatePresence>
        {isExcelModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isImporting && setIsExcelModalOpen(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#0c111d] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2 font-mono">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    AI Excel &amp; CSV Lembar Kerja Importer
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Teknologi Pembacaan Data Ukur Cerdas Berbasis Gemini AI</p>
                </div>
                <button 
                  onClick={() => !isImporting && setIsExcelModalOpen(false)}
                  className="p-1 px-2.5 text-[10px] uppercase font-black tracking-widest text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg transition-all"
                >
                  Tutup
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl flex gap-3.5">
                  <BrainCircuit className="w-8 h-8 text-emerald-500 shrink-0" />
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider">Bagaimana cara kerjanya?</h4>
                    <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300 leading-relaxed font-sans">
                      Cukup salin (copy) baris-baris data dari tabel Excel / spreadsheet Anda (baik seluruh tabel, baris draf, atau format mentah csv) dan tempelkan (paste) di bawah ini. AI kami akan mengekstrak nama alat, merk, tipe, nomor seri, serta seluruh baris data pengukuran ke dalam format Lembar Kerja (LK) berstandar Kemenkes RI / ISO 17025 secara otomatis.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest font-mono">
                      Data Tabular Excel (Salin &amp; Tempel di Sini)
                    </label>
                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase font-mono bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-2 py-0.5 rounded-lg">
                      Excel / CSV / TSV format
                    </span>
                  </div>
                  
                  <textarea
                    rows={8}
                    disabled={isImporting}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Contoh salinan tabel Excel:&#10;Nama Alat: Infusion Pump&#10;Merek: Terumo  Model: TE-331&#10;Parameter  Target  Terukur  Satuan&#10;Suhu       37      36.85    C&#10;Suhu       38      37.92    C&#10;Aliran     100     99.4     ml/h"
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {isImporting && (
                  <div className="space-y-2.5 animate-pulse bg-slate-50 dark:bg-slate-900/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-mono">
                        {importStatus}
                      </p>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                      <div className="bg-emerald-500 h-full w-2/3 animate-[pulse_1.5s_infinite]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleExcelImport}
                  disabled={!pastedText.trim() || isImporting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-emerald-500/10 uppercase tracking-widest text-[11px] disabled:opacity-50 cursor-pointer"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Memproses Data...
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      Proses AI &amp; Buat LK Otomatis
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
         {loading ? (
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-8">
               {[1,2,3,4].map(i => (
                 <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-[2.5rem] animate-pulse border border-slate-100 dark:border-slate-800 shadow-sm"></div>
               ))}
            </div>
         ) : worksheets.length === 0 ? (
           <div className="col-span-full py-32 text-center bg-white dark:bg-slate-900 rounded-[3.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <div className="w-24 h-24 bg-blue-50 dark:bg-slate-950 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                 <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 italic">Belum Ada Lembar Kerja</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Mulai inisialisasi protokol baru untuk memulai proses kalibrasi</p>
           </div>
         ) : filteredWorksheets.length === 0 ? (
           <div className="col-span-full py-32 text-center bg-white dark:bg-slate-900 rounded-[3.5rem] border-2 border-dashed border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <div className="w-24 h-24 bg-amber-50 dark:bg-slate-950 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                 <Search className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2 italic text-slate-600">Pencarian Tidak Ditemukan</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-4">Tidak ada lembar kerja yang cocok dengan kata kunci "{searchQuery}"</p>
              <button 
                onClick={() => setSearchQuery('')}
                className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-855 dark:text-white text-[10px] font-black uppercase rounded-xl border border-slate-200 dark:border-slate-700 tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-mono"
              >
                Clear Search
              </button>
           </div>
         ) : (
           filteredWorksheets.map((lk) => (
             <WorksheetCard key={lk.id} lk={lk} onDelete={() => handleDeleteLK(lk.id)} />
           ))
         )}
      </div>

      {/* AI Recommendation Floating Widget */}
      <div className="fixed bottom-24 right-8 z-40 hidden lg:block">
         <motion.button 
           whileHover={{ scale: 1.05, y: -5 }}
           className="bg-white border border-slate-200 p-6 rounded-[2.5rem] flex items-center gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:border-blue-300 transition-all group"
         >
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white group-hover:rotate-12 transition-transform shadow-lg shadow-blue-500/30">
               <BrainCircuit className="w-8 h-8" />
            </div>
            <div className="text-left">
               <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest font-mono">Singkronisasi AI Gemini</p>
               <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] mt-1 italic">Optimasi Protokol Aktif</p>
            </div>
         </motion.button>
      </div>

      {/* Custom Toast Alert */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3.5 px-6 py-4 bg-slate-900 border border-slate-100 dark:border-slate-800 text-white rounded-2xl shadow-2xl backdrop-blur-md"
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

      <AnimatePresence>
        {showScanner && (
          <QRScannerModal
            onClose={() => setShowScanner(false)}
            equipmentList={equipment as any}
            methods={methods as any}
          />
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

interface WorksheetCardProps {
  lk: { id: string; [key: string]: any };
  onDelete: () => void | Promise<void>;
  key?: string | number;
}

function WorksheetCard({ lk, onDelete }: WorksheetCardProps) {
  const { user, isAdmin } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const canDelete = isAdmin || (user?.uid === lk.technicianId && (lk.status === 'draft' || lk.status === 'revision'));

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100/50 text-slate-500 border-slate-200/20",
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    revision: "bg-red-500/10 text-red-500 border-red-500/20",
    approved: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };

  const statusLabels: Record<string, string> = {
    draft: "SISTEM DRAF",
    pending: "MENUNGGU",
    revision: "REVISI",
    approved: "DISETUJUI",
    completed: "TERTUTUP",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    draft: <Clock className="w-3.5 h-3.5" />,
    pending: <Activity className="w-3.5 h-3.5 animate-pulse" />,
    revision: <AlertCircle className="w-3.5 h-3.5" />,
    approved: <CheckCircle className="w-3.5 h-3.5" />,
    completed: <ClipboardCheck className="w-3.5 h-3.5" />,
  };

  return (
    <Tilt3D intensity={5} className="h-full">
      <div 
        className="bg-white dark:bg-[#10192d] p-8 rounded-[2.5rem] transition-all group relative overflow-hidden border border-slate-200 dark:border-cyan-500/15 shadow-xl dark:shadow-none flex flex-col justify-between min-h-[300px] h-full"
      >
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:scale-110 group-hover:opacity-[0.05] transition-all duration-1000">
         <FileText className="w-48 h-48 text-[#06B6D4] dark:text-cyan-400" />
      </div>

      <div>
        <div className="flex items-start justify-between mb-8 relative z-10">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-[1.2rem] bg-slate-50 dark:bg-[#070d19] border border-slate-200/60 dark:border-cyan-500/15 flex items-center justify-center text-slate-400 dark:text-cyan-400/60 group-hover:text-[#06B6D4] dark:group-hover:text-cyan-400 group-hover:bg-cyan-500/10 dark:group-hover:bg-cyan-950/20 group-hover:border-cyan-500/25 group-hover:rotate-6 transition-all shadow-inner">
                <ClipboardCheck className="w-6 h-6" />
             </div>
             <div>
                <div className="flex items-center gap-2 mb-1">
                   <div className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full animate-pulse" />
                   <p className="text-[9px] text-blue-600 dark:text-cyan-400 font-black uppercase tracking-widest font-mono italic leading-none">CORE-SPEC-{lk.id.slice(0,4).toUpperCase()}</p>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none group-hover:text-[#06B6D4] dark:group-hover:text-cyan-400 transition-colors italic">LK-{lk.id.slice(0,8).toUpperCase()}</h3>
             </div>
          </div>
          <div className={cn("flex items-center gap-2.5 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border transition-all shadow-sm italic", statusColors[lk.status])}>
             {statusIcons[lk.status]}
             {statusLabels[lk.status] || lk.status}
          </div>
        </div>

        <div className="space-y-4 relative z-10">
           <div className="bg-slate-50/50 dark:bg-[#070d19]/80 p-5 rounded-2xl border border-slate-200/50 dark:border-cyan-500/10 group-hover:bg-[#06B6D4]/5 group-hover:border-cyan-500/20 dark:group-hover:border-cyan-500/15 transition-all shadow-inner">
                 <div className="flex items-center gap-2 mb-3">
                    <div className="w-1.5 h-1.5 bg-[#06B6D4] rounded-full animate-bounce" />
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest leading-none font-mono">Arsitektur Perangkat</p>
                 </div>
                 <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter line-clamp-1 truncate uppercase italic">{lk.deviceName || 'Unit Tidak Teridentifikasi'}</p>
              <div className="flex items-center gap-2.5 mt-3">
                 <div className="px-2.5 py-1 bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/15 rounded-lg text-[8px] font-black text-[#06B6D4] uppercase tracking-widest shadow-sm font-mono truncate max-w-[120px]">
                    ID: {lk.deviceId?.slice(-8).toUpperCase() || 'SYS-ERR'}
                 </div>
                 <div className="h-3 w-px bg-slate-200 dark:bg-cyan-500/20 mx-1" />
                 <p className="text-[10px] text-slate-500 dark:text-slate-400 font-black italic truncate tracking-tight uppercase">{lk.fasyankesName || 'INSTALASI NASIONAL'}</p>
              </div>
           </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-cyan-500/5 mt-6 relative z-10">
         <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
               {[1,2].map(i => (
                 <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-[#10192d] bg-slate-100 dark:bg-[#070d19] flex items-center justify-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase shadow-sm italic group-hover:border-cyan-500/10 transition-colors">
                    {String.fromCharCode(64 + i)}
                 </div>
               ))}
            </div>
            <div className="flex flex-col">
               <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest leading-none">{lk.technicianName || 'Analyst'}</p>
               <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Lead Technician</p>
            </div>
         </div>
         <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLabelModal(true)}
              className="p-2.5 bg-emerald-50 dark:bg-[#071d18] text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-all rounded-xl border border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/10 cursor-pointer flex items-center justify-center"
              title="Cetak Label & QR Code"
            >
              <QrCode className="w-4.5 h-4.5" />
            </button>
            {canDelete && (
               <motion.button 
                 whileTap={{ scale: 0.95 }}
                 whileHover={{ scale: 1.05 }}
                 onClick={(e) => {
                   e.preventDefault();
                   setConfirmDelete(!confirmDelete);
                 }}
                 className="p-2.5 bg-white dark:bg-[#070d19] text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl border border-slate-200 dark:border-cyan-500/15 hover:border-red-100 hover:shadow-lg hover:shadow-red-500/10 cursor-pointer"
               >
                 <Trash2 className="w-4.5 h-4.5" />
               </motion.button>
            )}
            <Link to={`/worksheets/${lk.id}/edit`} className="bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-slate-950 font-black h-11 px-5 rounded-xl flex items-center gap-2 transition-all shadow-xl shadow-cyan-500/10 group/btn text-[9px] font-black uppercase tracking-widest">
               Buka LK
               <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1.5 transition-transform text-slate-950" />
            </Link>
         </div>
      </div>
      
      {/* Delete Overlay */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(12px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            className="absolute inset-0 bg-red-600/15 dark:bg-red-950/40 z-20 flex flex-col items-center justify-center p-6 text-center"
          >
             <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-2xl shadow-red-600/40">
                <Trash2 className="text-white w-6 h-6" />
              </div>
             <p className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6">Hapus Lembar Kerja Permanen?</p>
             <div className="flex gap-3 w-full px-2">
                <button 
                   onClick={() => onDelete()}
                   className="flex-1 h-10 bg-red-600 text-white rounded-lg font-black text-[8px] uppercase tracking-widest shadow-xl shadow-red-600/20 hover:bg-red-700 transition cursor-pointer"
                >
                   Hapus Data
                </button>
                <button 
                   onClick={() => setConfirmDelete(false)}
                   className="flex-1 h-10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg font-black text-[8px] uppercase tracking-widest border border-slate-200 dark:border-slate-800 shadow-lg hover:bg-slate-50 transition"
                >
                   Batal
                </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLabelModal && (
          <LKLabelModal 
            lk={lk} 
            onClose={() => setShowLabelModal(false)}
          />
        )}
      </AnimatePresence>
      </div>
    </Tilt3D>
  );
}
