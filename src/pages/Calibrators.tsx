import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Zap, 
  Trash2,
  FileText, 
  Calendar, 
  Upload, 
  X, 
  CheckCircle, 
  AlertTriangle,
  BrainCircuit,
  Loader2,
  FileCheck,
  Eye,
  Settings2,
  HardDrive,
  Edit2,
  Printer
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { jsPDF } from 'jspdf';
import { db, storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { extractCertificateData } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { useAuth } from '../lib/AuthContext';
import { logAction, pushNotification } from '../lib/auditLogger';

interface UploadQueueItem {
  id: string;
  fileName: string;
  status: 'pending' | 'extracting' | 'extracted' | 'failed';
  error?: string;
  data?: any;
}

export function Calibrators() {
  const { isAdmin, user } = useAuth();
  const [calibrators, setCalibrators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedCalibrator, setSelectedCalibrator] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Staging and sequential batch uploading
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [activeQueueItemId, setActiveQueueItemId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'calibrators'), orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCalibrators(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'calibrators');
    });
    return () => unsubscribe();
  }, []);

  const filteredCalibrators = calibrators.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileUploads = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Create queue items
    const newItems: UploadQueueItem[] = Array.from(files).map((file, idx) => ({
      id: `queue-${Date.now()}-${idx}`,
      fileName: file.name,
      status: 'pending'
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
    setIsExtracting(true);

    // Read and extract sequentially to avoid rate limits
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const queueId = newItems[i].id;

      // Set status to extracting
      setUploadQueue(prev => prev.map(item => item.id === queueId ? { ...item, status: 'extracting' } : item));

      try {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error("Gagal membaca file."));
          reader.readAsDataURL(file);
        });

        const data = await extractCertificateData(base64Data);

        const mappedData = {
          name: data.equipmentName?.value || '',
          brand: data.brand?.value || '',
          model: data.type?.value || '',
          serialNumber: data.serialNumber?.value || '',
          certificateNumber: data.certificateNumber?.value || '',
          calibrationDate: data.calibrationDate?.value || '',
          expiryDate: data.expiryDate?.value || '',
          parameters: (data.parameters || []).map((p: any) => ({
            parameterName: p.parameterName || '',
            channel: p.channel || 'MAIN',
            point: p.measurementPoint !== undefined ? p.measurementPoint : (p.point !== undefined ? p.point : 0),
            unit: p.unit || '',
            correction: p.correction !== undefined ? p.correction : 0,
            uncertainty: p.u95 !== undefined ? p.u95 : (p.uncertainty !== undefined ? p.uncertainty : 0)
          }))
        };

        setUploadQueue(prev => prev.map(item => item.id === queueId ? { ...item, status: 'extracted', data: mappedData } : item));
      } catch (error: any) {
        setUploadQueue(prev => prev.map(item => item.id === queueId ? { ...item, status: 'failed', error: error.message || 'Gagal mengekstrak data AI.' } : item));
      }

      // Add a tiny 300ms pause to ensure API/UI transition smoothness
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setIsExtracting(false);
  };

  const handleSaveAllQueue = async () => {
    const activeItems = uploadQueue.filter(item => item.status === 'extracted' && item.data);
    if (activeItems.length === 0) return;

    setLoading(true);
    let successCount = 0;
    try {
      for (const item of activeItems) {
        const finalData = item.data;
        await addDoc(collection(db, 'calibrators'), {
          ...finalData,
          status: 'active',
          createdAt: serverTimestamp(),
        });
        
        await logAction(
          `Mendaftarkan Standar Baru (Batch): ${finalData.name}`,
          'calibrators',
          `S/N: ${finalData.serialNumber}, Model: ${finalData.model}`,
          'info'
        );
        successCount++;
      }

      await pushNotification(
        'Batch Standar Terdaftar',
        `${successCount} Alat standar baru telah ditambahkan ke armada Spektrum via Batch Upload.`,
        'success',
        'all',
        '/calibrators'
      );

      const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
      };
      showToast(`✓ Berhasil menyimpan ${successCount} standar kalibrasi ke infrastruktur.`, 'success');
      setUploadQueue([]);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'calibrators');
      setToast({ msg: `✕ Gagal menyimpan batch standar: ` + (error as Error).message, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const startManualEntry = () => {
    setExtractedData({
      name: '',
      brand: '',
      model: '',
      serialNumber: '',
      certificateNumber: '',
      calibrationDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      parameters: []
    });
  };

  const handleSaveCalibrator = async () => {
    if (!extractedData) return;
    
    // Check if we are editing an item in the upload queue staging list
    if (activeQueueItemId) {
      setUploadQueue(prev => prev.map(item => item.id === activeQueueItemId ? { ...item, data: extractedData } : item));
      setActiveQueueItemId(null);
      setExtractedData(null);
      return;
    }

    try {
      if (editingId) {
        // Update existing
        await setDoc(doc(db, 'calibrators', editingId), {
          ...extractedData,
          updatedAt: serverTimestamp(),
        }, { merge: true });
        
        await logAction(
          `Memperbarui Standar: ${extractedData.name}`,
          'calibrators',
          `S/N: ${extractedData.serialNumber}, Model: ${extractedData.model}`,
          'info'
        );
        await pushNotification(
          'Standar Kalibrasi Diperbarui',
          `Alat standar ${extractedData.name} telah berhasil disesuaikan.`,
          'info',
          'all',
          '/calibrators'
        );
      } else {
        // Create new
        await addDoc(collection(db, 'calibrators'), {
          ...extractedData,
          status: 'active',
          createdAt: serverTimestamp(),
        });

        await logAction(
          `Mendaftarkan Standar Baru: ${extractedData.name}`,
          'calibrators',
          `S/N: ${extractedData.serialNumber}, Model: ${extractedData.model}`,
          'info'
        );
        await pushNotification(
          'Standar Kalibrasi Terdaftar',
          `Alat standar ${extractedData.name} telah ditambahkan ke armada Spektrum.`,
          'success',
          'all',
          '/calibrators'
        );
      }
      setIsModalOpen(false);
      setExtractedData(null);
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'calibrators');
    }
  };

  const handleEdit = (calibrator: any) => {
    // Spread necessary data to extractedData for the modal form
    setExtractedData({
      name: calibrator.name,
      brand: calibrator.brand,
      model: calibrator.model,
      serialNumber: calibrator.serialNumber,
      certificateNumber: calibrator.certificateNumber,
      calibrationDate: calibrator.calibrationDate,
      expiryDate: calibrator.expiryDate,
      parameters: calibrator.parameters || []
    });
    setEditingId(calibrator.id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setExtractedData(null);
    setEditingId(null);
  };

  const openPreview = (calibrator: any) => {
    setSelectedCalibrator(calibrator);
    setIsPreviewOpen(true);
  };

  const exportCalibratorToPDF = (calibrator: any) => {
    if (!calibrator) return;
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
      doc.text("DIVISI METROLOGI & KALIBRASI ALAT KESEHATAN", marginX, yPos);
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
      doc.text("SPESIFIKASI METROLOGI MASTER KALIBRATOR", marginX, yPos);
      yPos += 7.5;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235);
      doc.text(`NAMA ALAT STANDAR: ${calibrator.name.toUpperCase()}`, marginX, yPos);
      yPos += 7;

      // Metadata section (luxury filled box with colored left accent)
      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.5);
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, yPos, 170, 32, "FD"); // Filled & drawn
      
      // Draw left solid marker block inside relative box
      doc.setFillColor(37, 99, 235);
      doc.rect(marginX, yPos, 3, 32, "F");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`PABRIKAN / MERK   :  ${(calibrator.brand || 'N/A').toUpperCase()}`, marginX + 6, yPos + 6);
      doc.text(`TIPE / KELAS MODEL :  ${(calibrator.model || 'N/A').toUpperCase()}`, marginX + 6, yPos + 12);
      doc.text(`NOMOR SERI (S/N)   :  ${(calibrator.serialNumber || 'N/A').toUpperCase()}`, marginX + 6, yPos + 18);
      doc.text(`NO. SERTIFIKAT     :  ${(calibrator.certificateNumber || 'N/A').toUpperCase()}`, marginX + 6, yPos + 24);
      doc.setFont("Helvetica", "bold");
      doc.text(`KADALUARSA GARANSI :  ${(calibrator.expiryDate || 'N/A').toUpperCase()}`, marginX + 110, yPos + 24);
      yPos += 40;

      // Parameters: Section 1
      if (calibrator.parameters && calibrator.parameters.length > 0) {
        doc.setFillColor(37, 99, 235); // blue marker
        doc.rect(marginX, yPos, 3.5, 5, "F");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text("PETA MATRIKS KOREKSI & KETIDAKPASTIAN ALAT STANDAR", marginX + 5, yPos + 4);
        yPos += 8;

        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos, 170, 9, "F");
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.rect(marginX, yPos, 170, 9, "S");

        doc.setFont("Helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text("Nama Parameter", marginX + 4, yPos + 6);
        doc.text("Saluran", marginX + 50, yPos + 6);
        doc.text("Titik Uji", marginX + 85, yPos + 6);
        doc.text("Nilai Koreksi", marginX + 115, yPos + 6);
        doc.text("Ketidakpastian Baku (u)", marginX + 142, yPos + 6);
        yPos += 9;

        calibrator.parameters.forEach((p: any, index: number) => {
          if (yPos > pageHeight - 15) { 
            doc.addPage(); 
            yPos = 25; 
            
            // Redraw header table on new page
            doc.setFillColor(241, 245, 249);
            doc.rect(marginX, yPos, 170, 9, "F");
            doc.setDrawColor(203, 213, 225);
            doc.rect(marginX, yPos, 170, 9, "S");
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(51, 65, 85);
            doc.text("Nama Parameter", marginX + 4, yPos + 6);
            doc.text("Saluran", marginX + 50, yPos + 6);
            doc.text("Titik Uji", marginX + 85, yPos + 6);
            doc.text("Nilai Koreksi", marginX + 115, yPos + 6);
            doc.text("Ketidakpastian Baku (u)", marginX + 142, yPos + 6);
            yPos += 9;
          }

          doc.setDrawColor(241, 245, 249);
          doc.rect(marginX, yPos, 170, 8, "S");

          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8.5);
          doc.setTextColor(37, 99, 235);
          doc.text(p.parameterName || '-', marginX + 4, yPos + 5.5);

          doc.setFont("Helvetica", "normal");
          doc.setTextColor(51, 65, 85);
          doc.text(p.channel || 'UTAMA', marginX + 50, yPos + 5.5);
          doc.text(`${p.point} ${p.unit || ''}`, marginX + 85, yPos + 5.5);
          
          doc.setFont("Helvetica", "bold");
          doc.text(String(p.correction || 0), marginX + 115, yPos + 5.5);
          doc.setTextColor(148, 163, 184);
          doc.text(String(p.uncertainty || 0), marginX + 142, yPos + 5.5);

          yPos += 8;
        });
      }

      // Page numbering footer
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let j = 1; j <= totalPages; j++) {
        doc.setPage(j);
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);

        // Printing elegant footer lines and details
        doc.text(`Spesifikasi Teknis & Metrologi Armada Master Kalibrator — ${calibrator.name}`, marginX, 287);
        doc.text(`Halaman ${j} dari ${totalPages}`, 172, 287);

        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, 283, 190, 283);
      }

      doc.save(`MK-${calibrator.name.replace(/\s+/g, "_")}.pdf`);
    } catch (err) {
      setToast({ msg: '✕ Gagal melakukan ekspor PDF.', type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'calibrators', id));
      await logAction(
        `Menghapus ALat Standar: ${id}`,
        'calibrators',
        `ID alat standar: ${id} ditarik atau dihapus dari sistem`,
        'warning'
      );
      await pushNotification(
         'Standar Kalibrasi Dihapus',
         `Instrumen standar dengan ID ${id} ditarik dari sistem oleh Administrator.`,
         'warning',
         'all',
         '/calibrators'
      );
      setItemToDelete(null);
      setIsPreviewOpen(false);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `calibrators/${id}`);
      setToast({ msg: '✕ Gagal menghapus: ' + (error.message || 'Unknown error'), type: 'error' });
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative p-1 pb-20 min-h-screen transition-all duration-300 font-sans">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "fixed top-6 right-6 z-[200] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-black font-mono max-w-sm",
              toast.type === 'success' ? "bg-emerald-600 text-white border-emerald-500/50" :
              toast.type === 'error' ? "bg-rose-600 text-white border-rose-500/50" :
              "bg-blue-600 text-white border-blue-500/50"
            )}
          >
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Small Crisp Data Summary Panel */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 border-b border-sky-500/10 dark:border-cyan-500/10 pb-3 text-[10px] font-mono tracking-[0.2em] text-slate-400 dark:text-slate-500 select-none">
        <div className="flex items-center gap-4">
          <span className="text-[#06B6D4] font-black">METROLOGY ID: STANDARDS-HUB</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-800">|</span>
          <span className="hidden sm:inline">KAN SERVICE MASTER NO. STD-109</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            STANDARDS SYNCHRONOUS
          </span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-2 h-8 bg-[#06B6D4] rounded-full" />
             <p className="text-[10px] text-blue-600 dark:text-cyan-405 font-black uppercase tracking-[0.4em] font-mono">Infrastruktur Armada Master</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2 uppercase italic">
            Standar <span className="text-[#06B6D4] italic">Kalibrasi</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold max-w-xl uppercase tracking-wider">Manajemen instrumen ukur standar dengan ketertelusuran tinggi (Traceable) & digitalisasi sertifikat berbasis AI.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group flex items-center">
            <Search className="absolute left-5 w-4 h-4 text-slate-400 dark:text-cyan-400/50" />
            <input 
              type="text" 
              placeholder="Cari standarmu..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/25 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#06B6D4] focus:border-[#06B6D4] w-full sm:w-64 transition-all uppercase tracking-widest placeholder:text-slate-400 font-mono"
            />
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-slate-950 font-black px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all shadow-xl shadow-cyan-500/10 active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrasi Standar Baru
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
           <CardSkeleton />
        ) : filteredCalibrators.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200">
             <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
               <Zap className="w-10 h-10 text-slate-200" />
             </div>
             <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">Aset tidak ditemukan dalam database</p>
          </div>
        ) : (
          filteredCalibrators.map((item) => (
            <motion.div 
              key={item.id}
              whileHover={{ y: -8 }}
              onClick={() => openPreview(item)}
              className="luxury-card p-8 relative overflow-hidden group hover:scale-[1.015] active:scale-[0.99] cursor-pointer border border-slate-200/50 dark:border-cyan-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.015)] dark:shadow-none bg-white dark:bg-[#0c1224]/85 backdrop-blur-md transition-all duration-300"
            >
              <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-[0.03] transition-opacity duration-1000">
                 <Zap className="w-32 h-32 text-blue-600 dark:text-cyan-400" />
              </div>

              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-[#070d19] border border-slate-100 dark:border-cyan-500/15 flex items-center justify-center text-slate-400 dark:text-cyan-400 group-hover:text-[#06B6D4] group-hover:bg-[#06B6D4]/10 transition-all shadow-inner">
                   <Zap className="w-7 h-7" />
                </div>
                <div className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-350 font-mono shadow-sm",
                   item.status === 'active' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20 animate-pulse"
                )}>
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    item.status === 'active' ? "bg-emerald-50 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]"
                  )} />
                  {item.status || 'active'}
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2 group-hover:text-[#06B6D4] dark:group-hover:text-cyan-400 transition-colors uppercase italic">{item.name}</h3>
                   <div className="flex items-center gap-2">
                     <span className="text-[10px] text-blue-750 dark:text-cyan-400 font-black uppercase tracking-widest bg-blue-50 dark:bg-cyan-500/10 px-2 py-0.5 rounded-md">{item.brand}</span>
                     <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{item.model}</span>
                   </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-100 dark:border-slate-800/80">
                    <div>
                       <p className="text-[8px] text-slate-450 dark:text-slate-500 font-black uppercase tracking-widest mb-2 font-mono">Identitas S/N</p>
                       <p className="text-xs text-slate-900 dark:text-white font-black tracking-tight">{item.serialNumber || '-'}</p>
                    </div>
                    <div>
                       <p className="text-[8px] text-slate-450 dark:text-slate-500 font-black uppercase tracking-widest mb-2 font-mono">Nomor Sertifikat</p>
                       <p className="text-xs text-slate-900 dark:text-white font-black truncate tracking-tight">{item.certificateNumber || '-'}</p>
                    </div>
                 </div>

                 <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-450 uppercase tracking-widest font-mono">
                       <Calendar className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                       Kadaluarsa: <span className="text-slate-950 dark:text-white">{item.expiryDate || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }} 
                        className="p-2.5 bg-slate-50 dark:bg-[#070d19] hover:bg-[#06B6D4] text-slate-400 dark:text-cyan-400/60 hover:text-slate-950 dark:hover:text-[#070d19] rounded-xl transition-all border border-slate-100 dark:border-cyan-500/15 shadow-sm cursor-pointer"
                        title="Edit Standar"
                      >
                         <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openPreview(item); }} 
                        className="p-2.5 bg-slate-50 dark:bg-[#070d19] hover:bg-[#06B6D4] text-slate-400 dark:text-cyan-400/60 hover:text-slate-950 dark:hover:text-[#070d19] rounded-xl transition-all border border-slate-100 dark:border-cyan-500/15 shadow-sm cursor-pointer"
                      >
                         <Eye className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button 
                           onClick={(e) => { e.stopPropagation(); setItemToDelete(item.id); }}
                           className="p-2.5 bg-white dark:bg-[#070d19] hover:bg-red-500/10 text-slate-350 dark:text-cyan-400/40 hover:text-red-500 rounded-xl transition-all border border-slate-100 dark:border-cyan-500/10 cursor-pointer"
                           title="Hapus Alat"
                        >
                           <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                 </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* AI Extraction Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-[3rem] w-full max-w-2xl shadow-3xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 flex-shrink-0">
                 <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <BrainCircuit className="w-7 h-7" />
                   </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase leading-none mb-1">
                        {editingId ? 'Update Identitas Standar' : 'Registrasi Cerdas AI'}
                      </h2>
                      <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest font-mono">
                        {editingId ? 'Mode Penyesuaian Manual' : 'Didukung oleh Analisis Metrologi Gemini'}
                      </p>
                    </div>
                 </div>
                 <button 
                   onClick={() => {
                     setIsModalOpen(false);
                     setEditingId(null);
                     setExtractedData(null);
                   }} 
                   className="p-3 bg-white hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors shadow-sm border border-slate-100"
                 >
                    <X className="w-5 h-5" />
                 </button>
              </div>
 
              <div className="p-10 overflow-y-auto custom-scrollbar flex-1">
                {uploadQueue.length > 0 && !extractedData ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest font-mono flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-blue-600 animate-pulse" />
                        AI Batch Extraction Monitor ({uploadQueue.filter(q => q.status === 'extracted').length}/{uploadQueue.length})
                      </h3>
                      <button
                        onClick={() => setUploadQueue([])}
                        className="text-[9px] font-black uppercase tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        Reset Antrean
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
                      {uploadQueue.map((item) => (
                        <div key={item.id} className="bg-slate-50/60 dark:bg-[#080e1e]/60 border border-slate-200/60 dark:border-cyan-500/15 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden backdrop-blur-md transition-all duration-300">
                          {item.status === 'extracting' && (
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
                          )}
                          {item.status === 'extracted' && (
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                          )}
                          {item.status === 'failed' && (
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-slate-900 dark:text-white truncate uppercase font-mono">{item.fileName}</h4>
                            {item.status === 'extracted' && item.data && (
                              <p className="text-[10px] text-slate-500 dark:text-cyan-400/80 font-bold uppercase tracking-wider mt-1 font-mono">
                                {item.data.name} • S/N: {item.data.serialNumber} • {item.data.parameters?.length || 0} Param
                              </p>
                            )}
                            {item.status === 'failed' && (
                              <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold mt-1 font-mono">
                                Error: {item.error}
                              </p>
                            )}
                            {item.status === 'pending' && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1">
                                Menunggu giliran...
                              </p>
                            )}
                            {item.status === 'extracting' && (
                              <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-bold animate-pulse mt-1 uppercase tracking-wider font-mono">
                                Menganalisis dengan Gemini AI...
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.status === 'extracted' && (
                              <button
                                onClick={() => {
                                  setExtractedData(item.data);
                                  setActiveQueueItemId(item.id);
                                }}
                                className="px-3.5 py-1.5 bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/20 text-[#06B6D4] hover:bg-[#06B6D4]/10 dark:hover:bg-cyan-500/10 hover:text-slate-950 dark:hover:text-cyan-400 font-black rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-sm font-mono"
                              >
                                Edit Parameter
                              </button>
                            )}
                            <button
                              onClick={() => setUploadQueue(prev => prev.filter(q => q.id !== item.id))}
                              className="p-1.5 bg-white dark:bg-[#10192d] hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-450 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 border border-slate-100 dark:border-slate-800/80 rounded-lg transition-colors cursor-pointer shadow-sm"
                              title="Hapus"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-slate-100 bg-slate-50/50 -mx-10 -mb-10 p-8">
                      <button
                        onClick={() => setUploadQueue([])}
                        className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl hover:text-slate-900 transition-all uppercase tracking-widest text-[10px] shadow-sm cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveAllQueue}
                        disabled={uploadQueue.filter(q => q.status === 'extracted').length === 0}
                        className="flex-1 px-8 py-4 bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-slate-950 font-black rounded-2xl disabled:bg-slate-100 disabled:text-slate-450 disabled:shadow-none transition-all shadow-xl shadow-cyan-500/10 uppercase tracking-widest text-[10px] cursor-pointer"
                      >
                        Simpan Semua Standar ({uploadQueue.filter(q => q.status === 'extracted').length})
                      </button>
                    </div>
                  </div>
                ) : !extractedData ? (
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 bg-slate-50/30 rounded-[2.5rem] py-20 px-8 text-center hover:border-blue-500/50 transition-all cursor-pointer group"
                       onClick={() => fileInputRef.current?.click()}>
                    <input 
                      type="file" 
                      className="hidden" 
                      ref={fileInputRef} 
                      accept=".pdf"
                      multiple
                      onChange={handleFileUploads}
                    />
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-all shadow-xl group-hover:shadow-blue-500/20">
                       {isExtracting ? (
                         <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                       ) : (
                         <Upload className="w-12 h-12 text-slate-300 group-hover:text-blue-600" />
                       )}
                    </div>
                    <h3 className="text-slate-900 font-black text-xl mb-3 tracking-tight uppercase italic">
                       {isExtracting ? 'Menganalisis Arsitektur Sertifikat...' : 'Unggah Sertifikat PDF'}
                    </h3>
                    <p className="text-slate-500 text-sm max-w-sm font-medium leading-relaxed">
                       Sistem akan membedah struktur data sertifikat dan mengekstrak parameter metrologi secara otomatis (Mendukung banyak file sekaligus).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Nama Standar / Alat</label>
                        <input 
                          type="text" 
                          value={extractedData.name || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, name: e.target.value })}
                          placeholder="Contoh: Fluke 5522A"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Merek / Pabrikan</label>
                        <input 
                          type="text" 
                          value={extractedData.brand || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, brand: e.target.value })}
                          placeholder="Contoh: Fluke"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Tipe / Model</label>
                        <input 
                          type="text" 
                          value={extractedData.model || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, model: e.target.value })}
                          placeholder="Contoh: 5522A"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Nomor Seri (S/N)</label>
                        <input 
                          type="text" 
                          value={extractedData.serialNumber || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, serialNumber: e.target.value })}
                          placeholder="Contoh: FLK-981273"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Nomor Sertifikat</label>
                        <input 
                          type="text" 
                          value={extractedData.certificateNumber || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, certificateNumber: e.target.value })}
                          placeholder="Contoh: CERT-FLK-2026"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Tanggal Sertifikasi</label>
                        <input 
                          type="date" 
                          value={extractedData.calibrationDate || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, calibrationDate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Tanggal Kadaluarsa</label>
                        <input 
                          type="date" 
                          value={extractedData.expiryDate || ''} 
                          onChange={(e) => setExtractedData({ ...extractedData, expiryDate: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-950 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                      </div>
                    </div>
                    <div className="bg-slate-50/50 border border-slate-200 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileCheck className="w-5 h-5 text-blue-600" />
                          <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] font-mono">Parameters & Uncertainty Map</h4>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            const newParam = {
                              parameterName: 'Tegangan',
                              channel: 'UTAMA',
                              point: 100,
                              unit: 'V',
                              correction: 0,
                              uncertainty: 0
                            };
                            setExtractedData({
                              ...extractedData,
                              parameters: [...(extractedData.parameters || []), newParam]
                            });
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 border border-blue-100 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all select-none active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Parameter
                        </button>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                        {(extractedData.parameters || []).length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-bold text-xs italic">
                            Belum ada parameter. Klik "Tambah Parameter" untuk menambahkan baris baru.
                          </div>
                        ) : (
                          extractedData.parameters.map((p: any, idx: number) => {
                            const handleParamChange = (field: string, val: any) => {
                              const updatedParams = [...extractedData.parameters];
                              updatedParams[idx] = { ...updatedParams[idx], [field]: val };
                              setExtractedData({ ...extractedData, parameters: updatedParams });
                            };

                            return (
                              <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-end relative">
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const updatedParams = extractedData.parameters.filter((_: any, i: number) => i !== idx);
                                    setExtractedData({ ...extractedData, parameters: updatedParams });
                                  }}
                                  className="absolute top-2 right-2 md:static md:mb-1.5 p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-all border border-slate-100 shrink-0 shadow-sm"
                                  title="Hapus Parameter"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 w-full">
                                  <div className="col-span-2 md:col-span-1 space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Parameter</span>
                                    <input 
                                      type="text" 
                                      value={p.parameterName || ''} 
                                      onChange={(e) => handleParamChange('parameterName', e.target.value)}
                                      placeholder="Tegangan"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Saluran (Ch.)</span>
                                    <input 
                                      type="text" 
                                      value={p.channel || ''} 
                                      onChange={(e) => handleParamChange('channel', e.target.value)}
                                      placeholder="UTAMA"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Titik Uji</span>
                                    <input 
                                      type="number" 
                                      value={p.point !== undefined ? p.point : ''} 
                                      onChange={(e) => handleParamChange('point', Number(e.target.value))}
                                      placeholder="100"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Unit</span>
                                    <input 
                                      type="text" 
                                      value={p.unit || ''} 
                                      onChange={(e) => handleParamChange('unit', e.target.value)}
                                      placeholder="V"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Koreksi</span>
                                    <input 
                                      type="number" 
                                      step="0.0001"
                                      value={p.correction !== undefined ? p.correction : ''} 
                                      onChange={(e) => handleParamChange('correction', Number(e.target.value))}
                                      placeholder="0.01"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                  </div>
                                  <div className="space-y-1 col-span-2 md:col-span-1">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">U95 / Toleransi</span>
                                    <input 
                                      type="number" 
                                      step="0.0001"
                                      value={p.uncertainty !== undefined ? p.uncertainty : ''} 
                                      onChange={(e) => handleParamChange('uncertainty', Number(e.target.value))}
                                      placeholder="0.05"
                                      className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2 text-[11px] font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/10"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {extractedData && (
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex gap-4 flex-shrink-0">
                  <button 
                    onClick={() => setExtractedData(null)}
                    className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-500 font-black rounded-2xl hover:text-slate-900 transition-all uppercase tracking-widest text-[10px] shadow-sm"
                  >
                    Ulangi Proses
                  </button>
                  <button 
                    onClick={handleSaveCalibrator}
                    className="flex-1 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 uppercase tracking-widest text-[10px]"
                  >
                    {editingId ? 'Update Perubahan' : 'Simpan ke Infrastruktur'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && selectedCalibrator && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            ></motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-[#0c1224] border border-slate-200 dark:border-cyan-500/25 rounded-[3rem] w-full max-w-5xl shadow-3xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-[#080e1e]/60">
                 <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-blue-600 dark:bg-cyan-500/10 border border-cyan-500/20 rounded-3xl flex items-center justify-center text-white dark:text-cyan-400 shadow-xl shadow-blue-500/10">
                      <Zap className="w-9 h-9 fill-white/10 dark:fill-cyan-400/10" />
                   </div>
                   <div>
                     <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-none mb-1">{selectedCalibrator.name}</h2>
                     <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-bold uppercase tracking-[0.3em] font-mono">Master Fleet Intelligence • {selectedCalibrator.brand}</p>
                   </div>
                 </div>
                 <button onClick={() => setIsPreviewOpen(false)} className="p-4 bg-white dark:bg-[#10192d] hover:bg-slate-100 dark:hover:bg-[#1f283d] rounded-[1.5rem] text-slate-400 dark:text-slate-500 transition-all border border-slate-100 dark:border-slate-800 shadow-sm cursor-pointer">
                    <X className="w-6 h-6" />
                 </button>
              </div>

              <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-slate-50/30 dark:bg-[#030612]/30">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
                  <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white dark:bg-[#10192d] border border-slate-100 dark:border-cyan-500/15 rounded-[2.5rem] p-8 shadow-sm space-y-8">
                      <h4 className="text-[10px] font-black text-slate-350 dark:text-slate-550 uppercase tracking-[0.2em] mb-4 flex items-center gap-3">
                        <HardDrive className="w-4 h-4 text-blue-500 dark:text-cyan-400" />
                        Aset Core Data
                      </h4>
                        <div className="space-y-6">
                          <DetailField label="Pabrikan" value={selectedCalibrator.brand} />
                          <DetailField label="Kelas Model" value={selectedCalibrator.model} />
                          <DetailField label="SN Master" value={selectedCalibrator.serialNumber} />
                          <DetailField label="No. Registrasi" value={selectedCalibrator.certificateNumber} />
                          <DetailField label="Jadwal Kadaluarsa" value={selectedCalibrator.expiryDate} highlight />
                        </div>
                    </div>

                    <div className="bg-slate-900 dark:bg-[#10192d] rounded-[2.5rem] p-8 text-white shadow-xl border border-slate-800/80 dark:border-cyan-500/10">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Operational Status</h4>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-300 leading-relaxed font-medium">Ini adalah aset berlisensi dalam Spektrum Global Network. Standar ini siap digunakan untuk seluruh protokol kalibrasi digital.</p>
                    </div>
                  </div>

                  <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white dark:bg-[#10192d] border border-slate-100 dark:border-cyan-500/15 rounded-[2.5rem] p-10 shadow-sm h-full flex flex-col">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h4 className="text-[10px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-[0.3em] font-mono leading-none mb-2">Metrology Matrix Analysis</h4>
                          <p className="text-sm text-slate-400 dark:text-slate-500 font-medium italic">Data koreksi dan ketidakpastian yang terverifikasi</p>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 dark:bg-[#0c1224] rounded-xl flex items-center justify-center text-slate-350">
                           <Settings2 className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-slate-50/80 dark:bg-[#070d19] border border-slate-200 dark:border-cyan-500/10 rounded-3xl overflow-x-auto shadow-inner flex-1 custom-scrollbar">
                        <table className="w-full text-left min-w-[600px] border-collapse">
                          <thead>
                            <tr className="bg-slate-100/50 dark:bg-[#0c1224]/80 text-[10px] font-black text-slate-700 dark:text-cyan-400 uppercase tracking-[0.2em] border-b border-slate-200 dark:border-slate-800/80 font-mono italic">
                              <th className="px-8 py-5">Peta Parameter</th>
                              <th className="px-8 py-5">Ch.</th>
                              <th className="px-8 py-5 text-center">Titik Uji</th>
                              <th className="px-8 py-5 text-right">Koreksi</th>
                              <th className="px-8 py-5 text-right">Ketidakpastian</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                            {selectedCalibrator.parameters?.length > 0 ? (
                              selectedCalibrator.parameters.map((p: any, idx: number) => (
                                <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-cyan-500/5 transition-colors">
                                  <td className="px-8 py-6">
                                     <p className="text-xs font-black text-blue-600 dark:text-cyan-400 uppercase italic leading-none">{p.parameterName || 'N/A'}</p>
                                  </td>
                                  <td className="px-8 py-6">
                                     <p className="text-[10px] font-black text-slate-350 dark:text-slate-500 uppercase font-mono">{p.channel || 'UTAMA'}</p>
                                  </td>
                                  <td className="px-8 py-6 text-center">
                                     <span className="text-sm font-black text-slate-900 dark:text-white">{p.point}</span>
                                     <span className="text-[10px] text-slate-400 ml-1 font-black uppercase tracking-tighter">{p.unit}</span>
                                  </td>
                                  <td className="px-8 py-6 text-right font-black text-base text-blue-600 dark:text-cyan-400 font-mono">
                                    {p.correction}
                                  </td>
                                  <td className="px-8 py-6 text-right font-mono text-xs text-slate-405 dark:text-slate-550 font-black">
                                    {p.uncertainty}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="px-8 py-20 text-center text-slate-300 dark:text-slate-700 text-xs font-black uppercase tracking-widest italic">
                                  Data peta struktural kosong
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50/50 dark:bg-[#080e1e]/60 border-t border-slate-100 dark:border-slate-800/80 flex justify-between items-center">
                {isAdmin && (
                  <button 
                    onClick={() => {
                      setItemToDelete(selectedCalibrator.id);
                    }}
                    className="px-8 py-4 bg-white dark:bg-[#10192d] hover:bg-red-50 dark:hover:bg-red-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black text-red-500 dark:text-red-400 transition-all uppercase tracking-widest flex items-center gap-3 shadow-sm group cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                    Hapus Data Aset
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => exportCalibratorToPDF(selectedCalibrator)}
                  className="px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest flex items-center gap-3 active:scale-95 shadow-xl shadow-amber-500/20 ml-auto mr-4 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Cetak PDF
                </button>
                <button 
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-12 py-4 bg-blue-600 dark:bg-cyan-500 hover:bg-blue-700 dark:hover:bg-cyan-600 text-white dark:text-slate-950 rounded-2xl text-xs font-black transition-all uppercase tracking-[0.2em] active:scale-95 shadow-xl shadow-blue-500/20 dark:shadow-cyan-500/10 cursor-pointer"
                >
                  Tutup Matriks
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setItemToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden z-10"
            >
              <div className="flex items-center gap-4 text-red-600 mb-6">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase italic">Konfirmasi Hapus</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Tindakan Tidak Dapat Dibatalkan</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-8">
                Apakah Anda yakin ingin menghapus data instrumen standar kalibrator ini secara permanen dari sistem? Seluruh matriks runutan drift dan sertifikat eksternal yang terhubung akan disosialisasikan ulang.
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setItemToDelete(null)}
                  className="flex-1 px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all uppercase tracking-widest cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(itemToDelete)}
                  className="flex-1 px-6 py-4 bg-red-600 text-white hover:bg-red-700 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-600/20 cursor-pointer"
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

function DetailField({ label, value, highlight }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="space-y-2">
       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">{label}</span>
       <div className={cn(
         "px-5 py-3 rounded-2xl text-[11px] font-black border font-mono tracking-tight transition-all",
         highlight ? "bg-red-50 border-red-100 text-red-600" : "bg-slate-50 border-slate-100 text-slate-900 shadow-inner"
       )}>
          {value || '-'}
       </div>
    </div>
  );
}

function ExtractedField({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-2">
       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">{label}</span>
       <div className="px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-900 font-bold font-mono tracking-tight italic shadow-inner">
          {value || '-'}
       </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <>
      {[1, 2, 3].map(id => (
        <div key={id} className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm animate-pulse">
           <div className="flex items-start justify-between mb-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100"></div>
              <div className="w-20 h-5 bg-slate-50 rounded-full"></div>
           </div>
           <div className="space-y-6">
              <div className="h-8 w-48 bg-slate-50 rounded-xl"></div>
              <div className="h-4 w-32 bg-slate-50 rounded-lg"></div>
              <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                 <div className="h-10 bg-slate-50 rounded-xl"></div>
                 <div className="h-10 bg-slate-50 rounded-xl"></div>
              </div>
           </div>
        </div>
      ))}
    </>
  );
}
