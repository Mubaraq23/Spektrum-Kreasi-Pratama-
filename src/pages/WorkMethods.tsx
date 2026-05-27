import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  BookOpen, 
  Search, 
  BrainCircuit, 
  ChevronRight, 
  ChevronDown,
  Info, 
  ShieldCheck,
  Loader2,
  Sparkles,
  ListChecks,
  X,
  Trash2,
  Save,
  PlusCircle,
  Database,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { recommendWorkMethod } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { jsPDF } from 'jspdf';
import { translateToIndonesian } from './WorksheetEditor';

export function WorkMethods() {
  const { isAdmin } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiDraft, setAiDraft] = useState<any>(null);
  const [inputDevice, setInputDevice] = useState('');
  const [inputCategory, setInputCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [showUncBudgetRef, setShowUncBudgetRef] = useState(false);

  // Custom Toast state
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

  useEffect(() => {
    const q = query(collection(db, 'methods'), orderBy('title'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMethods(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'methods');
    });
    return () => unsubscribe();
  }, []);

  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [editingParamIdx, setEditingParamIdx] = useState<number | null>(null);
  const [tempParam, setTempParam] = useState<any>(null);

  const filteredMethods = methods.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.deviceCategory?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.standardReference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.objectives?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openParamModal = (idx: number | null) => {
    if (idx !== null) {
      setEditingParamIdx(idx);
      setTempParam({ ...selectedMethod.parameters[idx] });
    } else {
      setEditingParamIdx(null);
      setTempParam({ name: '', unit: '', points: [], tolerance: 0 });
    }
    setIsParamModalOpen(true);
  };

  const saveParam = () => {
    const newParams = [...(selectedMethod.parameters || [])];
    if (editingParamIdx !== null) {
      newParams[editingParamIdx] = tempParam;
    } else {
      newParams.push(tempParam);
    }
    setSelectedMethod({ ...selectedMethod, parameters: newParams });
    setIsParamModalOpen(false);
  };

  const handleGenerateAI = async () => {
    if (!inputDevice) return;
    setIsGenerating(true);
    try {
      const draft = await recommendWorkMethod(inputDevice, inputCategory);
      if (draft) {
        setAiDraft(draft);
        showToast('Metode kerja berhasil dirumuskan oleh AI!', 'success');
      }
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      showToast(error.message || 'Gagal merumuskan strategi kalibrasi. Silakan coba lagi.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMethod = async () => {
    try {
      await addDoc(collection(db, 'methods'), {
        ...aiDraft,
        deviceCategory: aiDraft.deviceCategory || inputCategory || 'Umum',
        createdAt: serverTimestamp(),
      });
      setIsModalOpen(false);
      setAiDraft(null);
      setInputDevice('');
      setInputCategory('');
      showToast('Katalog metode kerja baru berhasil disimpan!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'methods');
      showToast('Gagal menyimpan metode kerja baru ke database.', 'error');
    }
  };

  const handleToggleParameterEdit = (method: any) => {
    setSelectedMethod({ ...method });
    setIsEditModalOpen(true);
  };

  const exportMethodToPDF = () => {
    if (!selectedMethod) return;
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
      doc.text("KEMENTERIAN KESEHATAN REPUBLIK INDONESIA", marginX, yPos);
      yPos += 5.5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("SPEKTRUM UTAMA METROLOGI INTEGRASI DIGITAL — METODE KERJA KALIBRASI", marginX, yPos);
      yPos += 4;

      // Decorative header border (elegant double line)
      doc.setDrawColor(37, 99, 235); // Blue-600
      doc.setLineWidth(0.6);
      doc.line(marginX, yPos, 190, yPos);
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.2);
      doc.line(marginX, yPos + 1, 190, yPos + 1);
      yPos += 10;

      // Title Block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("PROTOKOL METODE KERJA (MK) STANDAR", marginX, yPos);
      yPos += 7.5;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235); // blue-605
      doc.text(`KODE PROTOKOL: MK-KEMENKES-${(selectedMethod.deviceCategory || 'UMUM').toUpperCase()}-${selectedMethod.title.substring(0,3).toUpperCase()}`, marginX, yPos);
      yPos += 7;

      // Metadata section (luxury filled box with colored left accent)
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, yPos, 170, 24, "FD"); // Filled & drawn
      
      // Draw left solid marker block inside relative box
      doc.setFillColor(37, 99, 235);
      doc.rect(marginX, yPos, 3, 24, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`METODE JUDUL     :  ${translateToIndonesian(selectedMethod.title).toUpperCase()}`, marginX + 6, yPos + 6);
      doc.text(`KATEGORI ALAT    :  ${(selectedMethod.deviceCategory || 'UMUM').toUpperCase()}`, marginX + 6, yPos + 12);
      doc.text(`STANDAR ACUAN    :  ${(selectedMethod.standardReference || 'KMK / ISO 17025').toUpperCase()}`, marginX + 6, yPos + 18);
      doc.setFont("Helvetica", "normal");
      doc.text(`BERLAKU SEJAK    :  ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }).toUpperCase()}`, marginX + 110, yPos + 18);
      yPos += 32;

      // Objectives: Section 1
      if (selectedMethod.objectives) {
        doc.setFillColor(37, 99, 235); // blue marker
        doc.rect(marginX, yPos, 3.5, 5, "F");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text("1. TUJUAN & LINGKUP PENGUJIAN / KALIBRASI", marginX + 5, yPos + 4);
        yPos += 8;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        const splitObjectives = doc.splitTextToSize(selectedMethod.objectives, 170);
        doc.text(splitObjectives, marginX, yPos);
        yPos += (splitObjectives.length * 4.5) + 8;
      }

      // Prosedur Kalibrasi (Procedures): Section 2
      if (selectedMethod.procedures && selectedMethod.procedures.length > 0) {
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 25; }
        
        doc.setFillColor(37, 99, 235); // blue marker
        doc.rect(marginX, yPos, 3.5, 5, "F");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text("2. PROSEDUR DAN LANGKAH-LANGKAH KALIBRASI", marginX + 5, yPos + 4);
        yPos += 8;

        selectedMethod.procedures.forEach((proc: string, index: number) => {
          const splitProc = doc.splitTextToSize(proc, 158);
          const blockHeight = (splitProc.length * 4.5) + 3;
          
          if (yPos + blockHeight > pageHeight - 15) { 
            doc.addPage(); 
            yPos = 25; 
          }
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235); // Blue identifier
          doc.text(`[0${index + 1}]`, marginX, yPos);
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(51, 65, 85);
          doc.text(splitProc, marginX + 11, yPos);
          yPos += blockHeight;
        });
        yPos += 6;
      }

      // Pemeriksaan Fisik & Fungsi: Section 3
      const hasPhysical = selectedMethod.physicalChecks && selectedMethod.physicalChecks.length > 0;
      const hasFunctional = selectedMethod.functionalChecks && selectedMethod.functionalChecks.length > 0;
      if (hasPhysical || hasFunctional) {
        if (yPos > pageHeight - 30) { doc.addPage(); yPos = 25; }
        
        doc.setFillColor(37, 99, 235); // blue marker
        doc.rect(marginX, yPos, 3.5, 5, "F");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text("3. MATRIKS CHECKLIST PEMERIKSAAN KONDISI FISIK & FUNGSI", marginX + 5, yPos + 4);
        yPos += 8;

        if (hasPhysical) {
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.text("Pemeriksaan Fisik (Physical Inspection Metrics):", marginX, yPos);
          yPos += 6;

          selectedMethod.physicalChecks.forEach((check: string) => {
            if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
            
            // Draw checkbox outline box manually
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.25);
            doc.rect(marginX + 1, yPos - 3, 3.5, 3.5);

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            doc.text(check, marginX + 8, yPos);
            yPos += 5.5;
          });
          yPos += 3;
        }

        if (hasFunctional) {
          if (yPos > pageHeight - 20) { doc.addPage(); yPos = 25; }
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.text("Pemeriksaan Fungsi Operasional (Functional Verification Control):", marginX, yPos);
          yPos += 6;

          selectedMethod.functionalChecks.forEach((check: string) => {
            if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
            
            // Draw checkbox outline box manually
            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.25);
            doc.rect(marginX + 1, yPos - 3, 3.5, 3.5);

            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            doc.text(check, marginX + 8, yPos);
            yPos += 5.5;
          });
          yPos += 4;
        }
      }

      // Parameters of calibration: Section 4
      if (selectedMethod.parameters && selectedMethod.parameters.length > 0) {
        if (yPos > pageHeight - 40) { doc.addPage(); yPos = 25; }
        
        doc.setFillColor(37, 99, 235); // blue marker
        doc.rect(marginX, yPos, 3.5, 5, "F");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text("4. PARAMETER UTAMA METROLOGI & TITIK UKUR SASARAN", marginX + 5, yPos + 4);
        yPos += 9;

        selectedMethod.parameters.forEach((param: any, idx: number) => {
          if (yPos > pageHeight - 20) { doc.addPage(); yPos = 25; }
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(30, 41, 59);
          doc.text(`0${idx + 1}. Parameter Uji: ${param.name.toUpperCase()} (Unit: ${param.unit || '-'})`, marginX, yPos);
          yPos += 4.5;

          if (param.targets && param.targets.length > 0) {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Target Nominal Titik Pengukuran: [ ${param.targets.join(', ')} ]`, marginX + 6, yPos);
            yPos += 6;
          } else if (param.points && param.points.length > 0) {
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Target Nominal Titik Pengukuran: [ ${param.points.join(', ')} ]`, marginX + 6, yPos);
            yPos += 6;
          } else {
            yPos += 2.5;
          }
        });
      }

      // Signature / Stamp Verification Section
      if (yPos > pageHeight - 45) { doc.addPage(); yPos = 25; }
      yPos += 8;

      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(250, 251, 252);
      doc.rect(marginX, yPos, 170, 30, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("DISETUJUI OLEH / APPROVED BY:", marginX + 6, yPos + 6);
      doc.text("FISIKAWAN MEDIS PENGEVALUASI:", marginX + 110, yPos + 6);

      doc.setFont("Helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("(Tanda tangan & stempel digital resmi)", marginX + 6, yPos + 18);
      doc.text("(Evaluasi Sistem Spektrum Auto-Verify)", marginX + 110, yPos + 18);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("INDRA KUSUMA, S.T., M.Si.", marginX + 6, yPos + 24);
      doc.text("TIM INTEGRASI METROLOGI NASIONAL", marginX + 110, yPos + 24);

      // Page numbering footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        // Printing elegant footer lines and details
        doc.text(`Dokumen Resmi Metode Kerja Spektrum Metrologi Utama — ${selectedMethod.title}`, marginX, 287);
        doc.text(`Halaman ${j} dari ${totalPages}`, 172, 287);

        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, 283, 190, 283);
      }

      doc.save(`MK-${selectedMethod.title.replace(/\s+/g, "_")}.pdf`);
      showToast('Hasil cetak Metode Kerja (MK) berhasil diekspor ke PDF!', 'success');
    } catch(err: any) {
      console.error("Failed to export MK to PDF:", err);
      showToast("Gagal melakukan ekspor PDF: " + err.message, "error");
    }
  };

  const handleUpdateMethod = async () => {
    if (!selectedMethod.id) return;
    setSavingEdit(true);
    try {
      const { id, ...data } = selectedMethod;
      await updateDoc(doc(db, 'methods', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      setIsEditModalOpen(false);
      showToast('Konfigurasi protokol metode kerja berhasil dimutakhirkan!', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'methods');
      showToast('Gagal memperbarui konfigurasi metode kerja.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteMethod = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'methods', id));
      setConfirmDeleteId(null);
      showToast('Metode kerja berhasil dihapus dari sistem Katalog.', 'info');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'methods');
      showToast('Gagal menghapus metode kerja.', 'error');
    }
  };

  const addParameter = () => {
    const newParam = { name: 'Parameter Baru', unit: '-', points: [0], tolerance: 0 };
    setSelectedMethod({
      ...selectedMethod,
      parameters: [...(selectedMethod.parameters || []), newParam]
    });
  };

  const updateParameter = (idx: number, field: string, value: any) => {
    const newParams = [...(selectedMethod.parameters || [])];
    const updatedParam = { ...newParams[idx] };
    
    if (field === 'points') {
      // Handle comma separated points
      if (typeof value === 'string') {
        updatedParam[field] = value.split(',')
          .map((v: string) => v.trim())
          .filter(v => v !== '')
          .map((v: string) => Number(v))
          .filter((v: number) => !isNaN(v));
      } else {
        updatedParam[field] = value;
      }
    } else {
      updatedParam[field] = value;
    }
    
    newParams[idx] = updatedParam;
    setSelectedMethod({ ...selectedMethod, parameters: newParams });
  };

  const removeParameter = (idx: number) => {
    const newParams = (selectedMethod.parameters || []).filter((_: any, i: number) => i !== idx);
    setSelectedMethod({ ...selectedMethod, parameters: newParams });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-1 bg-blue-600 rounded-full" />
             <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] font-mono">Protokol Standardisasi</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                <BookOpen className="w-8 h-8" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none lowercase">
               Metode <span className="text-blue-600 italic">Kerja</span>
             </h1>
          </div>
          <p className="text-slate-400 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Basis Data Standardisasi Pengujian & Kalibrasi Global</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-black px-10 py-5 rounded-2xl flex items-center gap-4 transition-all shadow-xl shadow-blue-600/20 active:scale-95 uppercase tracking-widest text-[11px]"
        >
          <BrainCircuit className="w-6 h-6 transition-transform group-hover:rotate-12" />
          Generate Strategi AI
        </button>
      </header>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/25 rounded-[2.5rem] p-3 flex items-center gap-2 max-w-2xl shadow-xl shadow-slate-200/50 dark:shadow-none group focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:border-blue-600 transition-all">
          <div className="flex-1 relative flex items-center">
          <Search className="absolute left-6 w-5 h-5 text-slate-400 dark:text-cyan-400/50 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari metode berdasarkan nama alat, kategori, atau standar..."
            className="w-full bg-transparent border-none py-4 pl-14 pr-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Interactive Uncertainty Budget Guidance */}
      <div className="bg-slate-50 dark:bg-[#10192d] rounded-[2.5rem] border border-slate-200/60 dark:border-cyan-500/25 p-8 space-y-6">
        <button 
          onClick={() => setShowUncBudgetRef(!showUncBudgetRef)}
          className="w-full flex items-center justify-between text-left focus:outline-none"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/25">
               <BrainCircuit className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">Panduan Rumusan Pembebanan Ketidakpastian Pengukuran</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-[0.2em] font-mono mt-0.5">Acuan Metrologi KAN (K-01) & ISO/IEC 17025</p>
            </div>
          </div>
          <div className={cn(
            "w-10 h-10 bg-white dark:bg-[#070d19] border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-400 transition-all",
            showUncBudgetRef ? "rotate-180 bg-blue-50 border-blue-200 text-blue-600 shadow-md shadow-blue-500/5" : ""
          )}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </button>

        <AnimatePresence>
          {showUncBudgetRef && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden space-y-8"
            >
              <div className="pt-6 border-t border-slate-200/60 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* u1 Card */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">u₁</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Resolusi Alat</p>
                  <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">Ketidakpastian Resolusi</h4>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                    <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1">
                      <span>u₁ = </span>
                      <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                        <span className="border-b border-slate-400 pb-0.5">Resolusi</span>
                        <span className="pt-0.5">2√3</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">Distribusi Rectangular (Semi-Range)</p>
                  </div>
                </div>

                {/* u2 Card */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">u₂</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Sertifikat Master</p>
                  <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">Instrumen Standar</h4>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                    <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1">
                      <span>u₂ = </span>
                      <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                        <span className="border-b border-slate-400 pb-0.5">U_sertifikat</span>
                        <span className="pt-0.5">k_sertifikat</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">Distribusi Normal (Confidence Level 95%, k=2)</p>
                  </div>
                </div>

                {/* u3 Card */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">u₃</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Repeatability</p>
                  <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">Daya Ulang Pembacaan</h4>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                    <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1 font-mono">
                      <span>u₃ = </span>
                      <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                        <span className="border-b border-slate-400 pb-0.5">sₓ</span>
                        <span className="pt-0.5 font-mono">√n</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">Evaluasi Tipe A (Standar Deviasi / Jumlah Sampel)</p>
                  </div>
                </div>

                {/* u4 Card */}
                <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                  <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">u₄</div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">Long-term Drift</p>
                  <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">Ketidakstabilan Standar</h4>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                    <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1">
                      <span>u₄ = </span>
                      <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                        <span className="border-b border-slate-400 pb-0.5">Drift</span>
                        <span className="pt-0.5">√3</span>
                      </div>
                    </div>
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">Distribusi Rectangular (Stabilitas Jangka Panjang)</p>
                  </div>
                </div>
              </div>

              {/* Summary Calculation Flow */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-slate-800">
                {/* Combined */}
                <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-blue-800 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest font-mono">1. Ketidakpastian Baku Gabungan (u<sub>c</sub>)</h4>
                  </div>
                  <div className="bg-white/80 p-4 border border-blue-200/60 rounded-xl font-mono text-xs font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
                    <span>u<sub>c</sub> = √[ (u₁)² + (u₂)² + (u₃)² + (u₄)² ]</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed font-mono">Prinsip dasar penggabungan kuadratik (root-sum-of-squares) untuk parameter yang tidak saling berkorelasi.</p>
                </div>

                {/* Expanded */}
                <div className="bg-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-between font-sans">
                  <div className="flex items-center gap-2 text-emerald-800 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <h4 className="text-[11px] font-black uppercase tracking-widest font-mono">2. Ketidakpastian Diperluas (U<sub>95</sub>)</h4>
                  </div>
                  <div className="bg-white/80 p-4 border border-emerald-200/60 rounded-xl font-mono text-xs font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
                    <span>U<sub>95</sub> = k × u<sub>c</sub>  (k = 2)</span>
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed font-mono">Dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k=2 sesuai standar Komite Akreditasi Nasional (KAN).</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredMethods.map((method) => (
          <motion.div 
            layout
            key={method.id}
            className="group relative bg-white dark:bg-[#10192d] border border-slate-100 dark:border-cyan-500/15 rounded-[3rem] p-10 pl-12 hover:border-blue-200 dark:hover:border-blue-500/45 transition-all duration-500 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden"
          >
            {/* Left margin luxury accent marker bar */}
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-blue-600 via-indigo-500 to-cyan-400 opacity-80 group-hover:opacity-100 group-hover:w-3.5 transition-all duration-500 rounded-l-[3rem]" />
            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/5 blur-[80px] rounded-full -mr-10 -mt-10 group-hover:bg-blue-600/10 transition-all duration-700" />
            
            <div className="relative space-y-8">
              <div className="flex items-start justify-between">
                <div className="w-16 h-16 bg-slate-50 dark:bg-[#070d19] border border-slate-100 dark:border-slate-800 rounded-[1.8rem] flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50 dark:group-hover:bg-[#070d19] group-hover:border-blue-200 dark:group-hover:border-blue-800 transition-all shadow-inner">
                  <BookOpen className="w-8 h-8" />
                </div>
                <div className="flex gap-2">
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <AnimatePresence>
                        {confirmDeleteId === method.id ? (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-1"
                          >
                             <button 
                               onClick={() => handleDeleteMethod(method.id)}
                               className="text-[9px] font-black text-red-600 uppercase tracking-widest hover:text-red-700 bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-lg border border-red-100 dark:border-red-900/30"
                             >
                               Hapus
                             </button>
                             <button onClick={() => setConfirmDeleteId(null)} className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200">
                                <X className="w-4 h-4" />
                             </button>
                          </motion.div>
                        ) : (
                          <button 
                            onClick={() => setConfirmDeleteId(method.id)} 
                            className="p-3 bg-red-500/5 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 border border-slate-200/40 dark:border-cyan-500/15 hover:border-red-500/25 transition-all rounded-xl text-slate-300 dark:text-slate-500 hover:shadow-lg hover:shadow-red-500/5 active:scale-95 cursor-pointer"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
 
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-3 leading-tight italic tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase">MK-{translateToIndonesian(method.title)}</h3>
                <span className="text-[9px] font-black text-blue-600 dark:text-[#06B6D4] uppercase tracking-[0.2em] bg-blue-50/50 dark:bg-cyan-500/10 px-3 py-1.5 rounded-full border border-blue-100 dark:border-cyan-550/20 shadow-sm italic">{method.deviceCategory}</span>
              </div>
 
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest font-mono truncate">{method.standardReference}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500">
                   <ListChecks className="w-4 h-4" />
                   <span className="text-[10px] font-black uppercase tracking-widest font-mono">{method.parameters?.length || 0} Titik Pengukuran</span>
                </div>
              </div>
 
              <button 
                onClick={() => handleToggleParameterEdit(method)}
                className="w-full flex items-center justify-between p-5 bg-slate-50 dark:bg-[#070d19] border border-slate-100 dark:border-slate-800/80 rounded-[1.8rem] text-[10px] font-black text-slate-400 dark:text-slate-400/80 uppercase tracking-widest group-hover:text-blue-700 dark:group-hover:text-blue-450 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/20 group-hover:border-blue-200 dark:group-hover:border-blue-900 group-hover:shadow-lg group-hover:shadow-blue-500/5 transition-all"
              >
                Atur MK & Parameter
                <ChevronRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isParamModalOpen && tempParam && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-lg shadow-2xl p-10 space-y-8"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-600 rounded-[1.1rem] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <Database className="w-6 h-6" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight">Konfigurasi <span className="text-blue-600">Parameter</span></h3>
                </div>
                <button onClick={() => setIsParamModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-xl text-slate-400">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">Nama Parameter</label>
                  <input 
                    value={tempParam.name}
                    onChange={(e) => setTempParam({...tempParam, name: e.target.value})}
                    placeholder="Contoh: Tekanan Sistolik"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">Satuan (Unit)</label>
                    <input 
                      value={tempParam.unit}
                      onChange={(e) => setTempParam({...tempParam, unit: e.target.value})}
                      placeholder="Contoh: mmHg"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-mono"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">Toleransi (±)</label>
                    <input 
                      type="number"
                      value={tempParam.tolerance}
                      onChange={(e) => setTempParam({...tempParam, tolerance: Number(e.target.value)})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">Titik Ukur (Pisahkan Koma)</label>
                  <input 
                    value={tempParam.points?.join(', ')}
                    onChange={(e) => {
                      const pts = e.target.value.split(',').map(p => p.trim()).filter(p => !isNaN(Number(p))).map(p => Number(p));
                      setTempParam({...tempParam, points: pts});
                    }}
                    placeholder="0, 50, 100, 150..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button onClick={() => setIsParamModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-400 font-black rounded-2xl text-[10px] uppercase tracking-widest">Batal</button>
                <button onClick={saveParam} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-500/20">Terapkan Perubahan</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 40 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 40 }}
               className="bg-white border border-slate-200 rounded-[4rem] w-full max-w-5xl max-h-[85vh] shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col"
            >
              <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                 <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                       <BrainCircuit className="w-8 h-8" />
                    </div>
                     <div>
                        <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tight">Generator Metode AI</h2>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 font-mono">Protokol Kecerdasan Quantum v.4.0</p>
                     </div>
                 </div>
                 <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-5 bg-white border border-slate-100 hover:bg-slate-50 rounded-3xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                 >
                    <X className="w-7 h-7" />
                 </button>
              </div>

              <div className="flex-1 overflow-auto p-12 bg-white relative">
                 {!aiDraft ? (
                    <div className="max-w-2xl mx-auto space-y-16 py-10 text-center">
                       <div className="space-y-6">
                          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full border border-blue-100 text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <Sparkles className="w-4 h-4" />
                            Menunggu Instruksi
                          </div>
                          <h3 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none">Otomatisasi <span className="text-blue-600">Rumusan</span> Kalibrasi</h3>
                          <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed font-medium">AI akan merumuskan parameter, standar kesalahan, dan titik ukur berdasarkan standar internasional terkini.</p>
                       </div>
                       <div className="space-y-8 text-left bg-slate-50 p-10 rounded-[3rem] border border-slate-100 shadow-inner">
                          <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 font-mono italic">Identifikasi Alat Kesehatan</label>
                             <input 
                               type="text" 
                               value={inputDevice}
                               onChange={(e) => setInputDevice(e.target.value)}
                               placeholder="Contoh: Defibrillator, Incubator, Syringe Pump"
                               className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold placeholder:text-slate-300"
                             />
                          </div>
                          <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 font-mono italic">Kategori (Opsional)</label>
                             <input 
                               type="text" 
                               value={inputCategory}
                               onChange={(e) => setInputCategory(e.target.value)}
                               placeholder="Contoh: Life Support Systems, Diagnostic Tools"
                               className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-5 text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-bold placeholder:text-slate-300"
                             />
                          </div>
                          <button 
                            disabled={!inputDevice || isGenerating}
                            onClick={handleGenerateAI}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black h-20 rounded-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-blue-500/30 mt-6 uppercase tracking-widest active:scale-95 text-[11px]"
                          >
                            {isGenerating ? <Loader2 className="w-7 h-7 animate-spin" /> : <Sparkles className="w-6 h-6 fill-white" />}
                            Inisialisasi Perumusan MK
                          </button>
                       </div>
                    </div>
                 ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-700">
                       <div className="flex flex-col md:flex-row md:items-start justify-between gap-10 pb-10 border-b border-slate-100">
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-1 bg-blue-600 rounded-full" />
                                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest font-mono italic">AI Recommendation Engine</span>
                             </div>
                             <h3 className="text-4xl font-black text-slate-900 italic tracking-tight uppercase leading-tight mb-3">MK-{aiDraft.title}</h3>
                             <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] font-mono italic">{aiDraft.standardReference}</p>
                          </div>
                          <div className="flex items-center gap-4">
                             <button onClick={() => setAiDraft(null)} className="px-8 py-4 rounded-2xl border border-slate-200 text-slate-400 font-bold text-[11px] uppercase tracking-widest hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-95">Re-Configure</button>
                             <button onClick={handleSaveMethod} className="px-10 py-4 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95">Deploy MK Baru</button>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                          <div className="space-y-12">
                             <section className="space-y-4">
                                <div className="flex items-center gap-3 text-blue-600">
                                   <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                                      <Info className="w-5 h-5" />
                                   </div>
                                   <h4 className="text-[11px] font-black uppercase tracking-[0.2em] italic font-mono">Objektif & Filosofi Kerja</h4>
                                </div>
                                <p className="text-slate-500 text-sm leading-loose font-medium bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner">{aiDraft.objectives}</p>
                             </section>
                             <section className="space-y-6">
                                <div className="flex items-center gap-3 text-blue-600">
                                   <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                                      <ListChecks className="w-5 h-5" />
                                   </div>
                                   <h4 className="text-[11px] font-black uppercase tracking-[0.2em] italic font-mono">Prosedur Operasional Standar</h4>
                                </div>
                                <div className="space-y-4">
                                   {aiDraft.procedures?.map((p: string, i: number) => (
                                      <div key={i} className="flex gap-6 group">
                                         <span className="flex-shrink-0 w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-[11px] font-black text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm group-hover:shadow-blue-500/20 italic">{i+1}</span>
                                         <p className="text-sm text-slate-500 leading-loose font-medium pt-2 italic">{p}</p>
                                      </div>
                                   ))}
                                </div>
                             </section>
                          </div>

                          <div className="space-y-8">
                             <div className="bg-slate-50 rounded-[3rem] border border-slate-100 p-10 shadow-inner">
                                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/50">
                                   <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-0 font-mono italic">Parameter Konfigurasi AI</h4>
                                   <div className="px-3 py-1 bg-white rounded-full border border-slate-200 text-[9px] font-black text-slate-400 italic">v.4.2</div>
                                </div>
                                <div className="space-y-5">
                                   {aiDraft.parameters?.map((p: any, i: number) => (
                                      <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-6 group hover:border-blue-400 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/10 active:scale-95 cursor-default">
                                         <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-black text-slate-900 italic tracking-tight">{p.name}</span>
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 px-2 py-0.5 rounded italic">{p.unit}</span>
                                         </div>
                                         <div className="flex gap-2 flex-wrap">
                                            {p.points?.map((pt: number, j: number) => (
                                               <span key={j} className="px-3 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-400 border border-slate-100 italic transition-colors hover:bg-blue-50 hover:text-blue-600 font-mono">{pt}</span>
                                            ))}
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>
                 )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail & Parameter Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedMethod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm print:absolute print:bg-white print:p-0 print:m-0 print:inset-0">
            <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 50 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 50 }}
               className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[3.5rem] w-full max-w-5xl max-h-[90vh] shadow-[0_50px_150px_rgba(0,0,0,0.2)] dark:shadow-none flex flex-col overflow-hidden print:border-none print:shadow-none print:max-w-full print:max-h-full print:rounded-none print-area"
            >
              <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-[#070d19]/80 print:border-b-2 print:border-slate-300">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                      <ListChecks className="w-8 h-8" />
                   </div>
                   <div>
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none">MK-{selectedMethod.title}</h2>
                     <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-2 font-mono">Manajemen Konfigurasi Protocol MK</p>
                   </div>
                 </div>
                   <div className="flex items-center gap-4">
                    {isAdmin && (
                      <div className="flex items-center gap-2">
                        <AnimatePresence>
                          {confirmDeleteModal ? (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="flex items-center gap-2"
                            >
                               <button 
                                 onClick={async () => {
                                   await handleDeleteMethod(selectedMethod.id);
                                   setConfirmDeleteModal(false);
                                   setIsEditModalOpen(false);
                                 }}
                                 className="px-6 py-3 bg-red-600 text-white text-[10px] font-black rounded-2xl uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95"
                               >
                                 Confirm Delete
                               </button>
                               <button onClick={() => setConfirmDeleteModal(false)} className="p-4 bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-900">
                                  <X className="w-5 h-5" />
                               </button>
                            </motion.div>
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteModal(true)}
                              className="p-4 bg-white border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 rounded-2xl transition-all shadow-sm active:scale-95"
                              title="Hapus Metode Kerja"
                            >
                              <Trash2 className="w-6 h-6" />
                            </button>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    <motion.button 
                      onClick={exportMethodToPDF}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black flex items-center gap-3 transition-all shadow-xl shadow-amber-500/20 active:scale-95 uppercase tracking-widest cursor-pointer print:hidden"
                    >
                      <Printer className="w-5 h-5" />
                      Cetak Jadi PDF
                    </motion.button>
                    <motion.button 
                      onClick={handleUpdateMethod}
                      disabled={savingEdit}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black flex items-center gap-3 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest print:hidden"
                    >
                       {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                       Synchronize MK
                    </motion.button>
                    <motion.button 
                      onClick={() => setIsEditModalOpen(false)} 
                      whileTap={{ scale: 0.95 }}
                      className="p-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-2xl text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 print:hidden"
                    >
                        <X className="w-7 h-7" />
                    </motion.button>
                 </div>
              </div>

              <div className="flex-1 overflow-auto p-12 custom-scrollbar print:overflow-visible print:p-0 print:m-0">
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
                    <div className="lg:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="space-y-12">
                       <section className="bg-slate-50 dark:bg-[#070d19]/80 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8 border-b border-slate-200/50 pb-4 italic font-mono">Tujuan & Standardisasi Global</h4>
                          <div className="space-y-8">
                             <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase mb-3 block italic font-mono tracking-widest px-1">Device Category / Type</label>
                                <input 
                                  value={selectedMethod.deviceCategory}
                                  onChange={(e) => setSelectedMethod({...selectedMethod, deviceCategory: e.target.value})}
                                  placeholder="e.g. Life Support, Diagnostic"
                                  className="w-full bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all placeholder:text-slate-500 font-mono italic"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase mb-3 block italic font-mono tracking-widest px-1">Standard Reference Protocol</label>
                                <input 
                                  value={selectedMethod.standardReference}
                                  onChange={(e) => setSelectedMethod({...selectedMethod, standardReference: e.target.value})}
                                  className="w-full bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all placeholder:text-slate-500 font-mono italic"
                                />
                             </div>
                             <div>
                                <label className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase mb-3 block italic font-mono tracking-widest px-1">Mission Objectives</label>
                                <textarea 
                                  value={selectedMethod.objectives}
                                  onChange={(e) => setSelectedMethod({...selectedMethod, objectives: e.target.value})}
                                  rows={5}
                                  className="w-full bg-white dark:bg-[#10192d] border border-slate-200 dark:border-slate-800 rounded-[2rem] px-6 py-6 text-sm font-medium text-slate-500 dark:text-slate-300 leading-relaxed focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all resize-none shadow-sm italic"
                                />
                             </div>
                          </div>
                       </section>

                        <section className="bg-white dark:bg-transparent p-2">
                           <div className="flex items-center justify-between mb-8 px-2">
                             <h4 className="text-[11px] font-black text-slate-400 dark:text-cyan-400 uppercase tracking-widest italic font-mono mb-0">Pemeriksaan Fisik (IK)</h4>
                              <div className="w-10 h-1 bg-blue-100 dark:bg-[#0c1d3a] rounded-full" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                               {(selectedMethod.physicalChecks || []).map((check: string, idx: number) => (
                                  <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-[#070d19]/85 border border-slate-100 dark:border-slate-800 border-l-4 border-l-blue-600 dark:border-l-cyan-500 rounded-2xl group relative hover:bg-white dark:hover:bg-[#10192d] hover:border-blue-200 dark:hover:border-cyan-550/30 transition-all shadow-sm">
                                     <textarea 
                                       value={check}
                                       rows={2}
                                       onChange={(e) => {
                                          const newChecks = [...(selectedMethod.physicalChecks || [])];
                                          newChecks[idx] = e.target.value;
                                          setSelectedMethod({...selectedMethod, physicalChecks: newChecks});
                                       }}
                                       className="bg-transparent border-none focus:outline-none flex-1 text-xs font-bold text-slate-600 dark:text-slate-350 italic whitespace-normal break-words resize-none font-mono"
                                     />
                                     <button 
                                       onClick={() => {
                                         const newChecks = (selectedMethod.physicalChecks || []).filter((_: any, i: number) => i !== idx);
                                         setSelectedMethod({...selectedMethod, physicalChecks: newChecks});
                                       }}
                                       className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1 self-start cursor-pointer"
                                     >
                                        <X className="w-4 h-4" />
                                     </button>
                                  </div>
                               ))}
                               <button 
                                 onClick={() => setSelectedMethod({...selectedMethod, physicalChecks: [...(selectedMethod.physicalChecks || []), 'Item Fisik Baru']})}
                                 className="col-span-full py-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase font-mono tracking-widest hover:bg-blue-50/50 dark:hover:bg-blue-900/10 hover:text-blue-600 transition-all cursor-pointer"
                               >
                                 + TAMBAH INSPEKSI FISIK (IK)
                               </button>
                            </div>
                         </section>
 
                         <section className="bg-transparent p-2">
                            <div className="flex items-center justify-between mb-8 px-2 text-amber-500">
                              <h4 className="text-[11px] font-black uppercase tracking-widest italic font-mono mb-0 text-amber-600 dark:text-amber-400">Pemeriksaan Fungsi (IK)</h4>
                              <div className="w-10 h-1 bg-amber-100 dark:bg-amber-950/30 rounded-full" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                               {(selectedMethod.functionalChecks || []).map((check: string, idx: number) => (
                                  <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-[#070d19]/85 border border-slate-100 dark:border-slate-800 border-l-4 border-l-amber-500 dark:border-l-amber-400 rounded-2xl group relative hover:bg-white dark:hover:bg-[#10192d] hover:border-amber-250 dark:hover:border-amber-500/40 transition-all shadow-sm">
                                     <textarea 
                                       value={check}
                                       rows={2}
                                       onChange={(e) => {
                                          const newChecks = [...(selectedMethod.functionalChecks || [])];
                                          newChecks[idx] = e.target.value;
                                          setSelectedMethod({...selectedMethod, functionalChecks: newChecks});
                                       }}
                                       className="bg-transparent border-none focus:outline-none flex-1 text-xs font-bold text-slate-600 dark:text-slate-350 italic whitespace-normal break-words resize-none font-mono"
                                     />
                                     <button 
                                       onClick={() => {
                                         const newChecks = (selectedMethod.functionalChecks || []).filter((_: any, i: number) => i !== idx);
                                         setSelectedMethod({...selectedMethod, functionalChecks: newChecks});
                                       }}
                                       className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-1 self-start cursor-pointer"
                                     >
                                        <X className="w-4 h-4" />
                                     </button>
                                  </div>
                               ))}
                               <button 
                                 onClick={() => setSelectedMethod({...selectedMethod, functionalChecks: [...(selectedMethod.functionalChecks || []), 'Item Fungsi Baru']})}
                                 className="col-span-full py-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase font-mono tracking-widest hover:bg-amber-50/50 dark:hover:bg-amber-950/10 hover:text-amber-600 transition-all cursor-pointer"
                               >
                                 + TAMBAH INSPEKSI FUNGSI (IK)
                               </button>
                            </div>
                         </section>

                        <section className="bg-transparent p-2">
                           <div className="flex items-center justify-between mb-8 px-2">
                             <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest italic font-mono mb-0">Prosedur Langkah Kerja</h4>
                            <div className="w-10 h-1 bg-slate-100 dark:bg-slate-800 rounded-full" />
                          </div>
                          <div className="space-y-4">
                             {selectedMethod.procedures?.map((proc: string, idx: number) => (
                                <div key={idx} className="flex gap-6 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] group relative hover:border-blue-200 transition-all hover:bg-white hover:shadow-lg hover:shadow-blue-500/5 active:scale-[0.98] cursor-text">
                                   <span className="flex-shrink-0 w-8 h-8 rounded-xl bg-white dark:bg-[#10192d] border border-slate-100 dark:border-slate-800 flex items-center justify-center text-[11px] font-black text-blue-600 italic shadow-sm group-hover:bg-blue-600 group-hover:text-white dark:group-hover:text-white transition-all">{idx + 1}</span>
                                   <input 
                                     value={proc}
                                     onChange={(e) => {
                                        const newProcs = [...selectedMethod.procedures];
                                        newProcs[idx] = e.target.value;
                                        setSelectedMethod({...selectedMethod, procedures: newProcs});
                                     }}
                                     className="bg-transparent border-none focus:outline-none flex-1 text-sm font-medium text-slate-500 dark:text-slate-300 leading-relaxed italic"
                                   />
                                   <button 
                                     onClick={() => {
                                       const newProcs = selectedMethod.procedures.filter((_: any, i: number) => i !== idx);
                                       setSelectedMethod({...selectedMethod, procedures: newProcs});
                                     }}
                                     className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 bg-white dark:bg-[#10192d] border border-red-100 dark:border-[#ef4444]/20 text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 transition-all shadow-sm"
                                   >
                                      <X className="w-4 h-4" />
                                   </button>
                                </div>
                             ))}
                             <button 
                               onClick={() => setSelectedMethod({...selectedMethod, procedures: [...(selectedMethod.procedures || []), 'Langkah baru...']})}
                               className="w-full py-5 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[1.8rem] text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all active:scale-95"
                             >
                               + INSERT NEW PROCEDURE MODULE
                             </button>
                          </div>
                       </section>
                    </div>

                    <div className="space-y-10">
                       <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic font-mono mb-0">Parameter Titik Pengukuran</h4>
                          <button 
                            onClick={() => openParamModal(null)}
                            className="text-[10px] font-black text-white uppercase tracking-widest bg-blue-600 px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all flex items-center gap-3 shadow-xl shadow-blue-500/20 active:scale-95"
                          >
                             <PlusCircle className="w-4 h-4" />
                             Deploy Parameter
                          </button>
                       </div>
                       <div className="space-y-4">
                          {selectedMethod.parameters?.map((param: any, idx: number) => (
                             <div key={idx} className="bg-white dark:bg-[#070d19]/80 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 hover:border-blue-300 dark:hover:border-blue-800 transition-all group shadow-sm flex items-center justify-between">
                                <div>
                                   <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{param.name}</p>
                                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 tracking-tighter">
                                     {param.unit} &bull; {param.points?.length || 0} Titik Ukur &bull; Tol: ±{param.tolerance} {param.unit}
                                   </p>
                                </div>
                                <div className="flex items-center gap-2">
                                   <button 
                                     onClick={() => openParamModal(idx)}
                                     className="p-3 bg-indigo-500/5 hover:text-indigo-600 hover:bg-indigo-500/10 dark:hover:bg-indigo-500/20 border border-slate-200/40 dark:border-cyan-500/15 hover:border-indigo-500/25 transition-all rounded-xl text-slate-400 dark:text-slate-500 hover:shadow-lg hover:shadow-indigo-500/5 active:scale-95 cursor-pointer"
                                   >
                                      <PlusCircle className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => removeParameter(idx)}
                                     className="p-3 bg-red-500/5 hover:text-red-500 hover:bg-red-500/10 dark:hover:bg-red-500/20 border border-slate-200/40 dark:border-cyan-500/15 hover:border-red-500/25 transition-all rounded-xl text-slate-300 dark:text-slate-500 hover:shadow-lg hover:shadow-red-500/5 active:scale-95 cursor-pointer"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             </div>
                          ))}
                          {(!selectedMethod.parameters || selectedMethod.parameters.length === 0) && (
                             <div className="py-24 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] text-center bg-slate-50/50 dark:bg-[#070d19]/30">
                                <div className="w-16 h-16 bg-white dark:bg-[#10192d] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 dark:border-slate-800">
                                   <ListChecks className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                                </div>
                                <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] italic font-mono">No measured parameter modules registered.</p>
                             </div>
                          )}
                       </div>
                    </div>
                    </div>
                 </div>
              </div>
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
    </div>
  );
}
