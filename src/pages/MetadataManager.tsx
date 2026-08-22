import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Trash2, 
  Edit2, 
  Copy, 
  Download, 
  Upload, 
  History, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Info, 
  Sliders, 
  ChevronDown, 
  Check, 
  X, 
  ShieldAlert, 
  FileJson,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { 
  collection, 
  query, 
  onSnapshot, 
  orderBy, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp, 
  getDocs, 
  setDoc,
  where
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { logAction } from '../lib/auditLogger';

interface HistoryRecord {
  id: string;
  docId: string;
  collectionName: string;
  data: any;
  version: number;
  updatedAt: any;
  updatedBy: string;
}

export function MetadataManager() {
  const { user, profile } = useAuth();
  const isAdminOrSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor';
  
  const [activeTab, setActiveTab] = useState<'methods' | 'calibrators' | 'kanScope'>('methods');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals and Forms
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [historyItems, setHistoryItems] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDocId, setHistoryDocId] = useState<string | null>(null);
  
  // JSON Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  
  // Toast Notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Real-time synchronization
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, activeTab));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(data);
      setLoading(false);
    }, (error) => {
      console.error(`Error loading ${activeTab}:`, error);
      showToast(`Gagal memuat data ${activeTab}. Periksa hak akses Anda.`, 'error');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  // Load version history for a document
  const fetchVersionHistory = async (docId: string) => {
    try {
      const q = query(
        collection(db, 'metadataHistory'), 
        where('docId', '==', docId),
        where('collectionName', '==', activeTab)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as HistoryRecord));
      // Sort by version descending
      list.sort((a, b) => b.version - a.version);
      setHistoryItems(list);
      setHistoryDocId(docId);
      setShowHistory(true);
    } catch (err) {
      console.error("Error fetching version history:", err);
      showToast("Gagal memuat riwayat versi.", "error");
    }
  };

  // Create a snapshot for history tracking
  const saveHistorySnapshot = async (docId: string, collectionName: string, data: any, updatedBy: string) => {
    try {
      // Find latest version
      const q = query(
        collection(db, 'metadataHistory'),
        where('docId', '==', docId),
        where('collectionName', '==', collectionName)
      );
      const snap = await getDocs(q);
      const currentVersion = snap.empty ? 0 : Math.max(...snap.docs.map(d => d.data().version || 0));

      await addDoc(collection(db, 'metadataHistory'), {
        docId,
        collectionName,
        data,
        version: currentVersion + 1,
        updatedAt: new Date().toISOString(),
        updatedBy
      });
    } catch (err) {
      console.error("Failed to write history snapshot:", err);
    }
  };

  // Rollback to specific history version
  const handleRollback = async (historyRecord: HistoryRecord) => {
    if (!isAdminOrSupervisor) {
      showToast("Hanya Chief/Senior Metrologist yang berhak melakukan rollback.", "warning");
      return;
    }
    
    if (!window.confirm(`Apakah Anda yakin ingin melakukan rollback ke Versi ${historyRecord.version}?`)) {
      return;
    }

    try {
      const docRef = doc(db, activeTab, historyRecord.docId);
      const rollbackData = {
        ...historyRecord.data,
        updatedAt: serverTimestamp(),
        approvalStatus: 'approved' // Automatically approved on rollback of previously approved state
      };
      
      await setDoc(docRef, rollbackData, { merge: true });
      await saveHistorySnapshot(historyRecord.docId, activeTab, historyRecord.data, user?.email || 'System Admin');
      
      await logAction('Rollback Metadata', activeTab, `Rollback ${activeTab}/${historyRecord.docId} ke Versi ${historyRecord.version}`, 'warning');
      showToast(`Berhasil rollback ke Versi ${historyRecord.version}!`, 'success');
      setShowHistory(false);
    } catch (err) {
      console.error("Error during rollback:", err);
      showToast("Gagal melakukan rollback data.", "error");
    }
  };

  // Duplicate / Clone Item
  const handleDuplicate = async (item: any) => {
    try {
      const { id, createdAt, updatedAt, ...cleanData } = item;
      const cloneData = {
        ...cleanData,
        title: `${item.title || item.name || 'Copy'} (Salinan)`,
        name: item.name ? `${item.name} (Salinan)` : undefined,
        approvalStatus: 'draft',
        createdBy: user?.email || 'System Admin',
        createdAt: serverTimestamp()
      };
      // Clean undefined keys
      Object.keys(cloneData).forEach(key => cloneData[key] === undefined && delete cloneData[key]);

      const docRef = await addDoc(collection(db, activeTab), cloneData);
      await saveHistorySnapshot(docRef.id, activeTab, cloneData, user?.email || 'System Admin');
      
      showToast("Item berhasil diduplikasi menjadi draf kustom!", "success");
    } catch (err) {
      console.error("Error duplicating:", err);
      showToast("Gagal menduplikasi item.", "error");
    }
  };

  // Change Approval Status
  const handleApprovalChange = async (itemId: string, newStatus: 'draft' | 'pending_review' | 'approved') => {
    if (!isAdminOrSupervisor && newStatus === 'approved') {
      showToast("Anda tidak memiliki hak untuk menyetujui (approve) draf metadata.", "warning");
      return;
    }

    try {
      const docRef = doc(db, activeTab, itemId);
      await updateDoc(docRef, { approvalStatus: newStatus });
      
      // Update history
      const targetItem = items.find(i => i.id === itemId);
      if (targetItem) {
        await saveHistorySnapshot(itemId, activeTab, { ...targetItem, approvalStatus: newStatus }, user?.email || 'System Admin');
      }

      await logAction('Update Approval Status', activeTab, `Status ${activeTab}/${itemId} diubah menjadi ${newStatus}`, 'info');
      showToast(`Status disetujui: ${newStatus.toUpperCase()}`, "success");
    } catch (err) {
      console.error("Approval error:", err);
      showToast("Gagal memperbarui status approval.", "error");
    }
  };

  // Delete Item
  const handleDelete = async (itemId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus item metadata ini secara permanen dari server?")) return;

    try {
      await deleteDoc(doc(db, activeTab, itemId));
      await logAction('Hapus Metadata', activeTab, `Menghapus item ID: ${itemId}`, 'warning');
      showToast("Item berhasil dihapus dari database.", "success");
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Gagal menghapus item.", "error");
    }
  };

  // Export selected / all items to JSON
  const handleExportJSON = () => {
    try {
      const cleanItems = items.map(({ id, createdAt, updatedAt, ...rest }) => rest);
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cleanItems, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `spektrum_metadata_${activeTab}_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast("Metadata berhasil diekspor ke file JSON!", "success");
    } catch (err) {
      showToast("Gagal mengekspor metadata.", "error");
    }
  };

  // Import JSON metadata
  const handleImportJSON = async () => {
    setImportError('');
    setImportSuccess('');
    try {
      const parsed = JSON.parse(importJsonText);
      const dataArray = Array.isArray(parsed) ? parsed : [parsed];

      let count = 0;
      for (const item of dataArray) {
        const importData = {
          ...item,
          approvalStatus: 'draft', // Force all imported items to draft first for supervisor review
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, activeTab), importData);
        await saveHistorySnapshot(docRef.id, activeTab, importData, user?.email || 'JSON Import');
        count++;
      }

      setImportSuccess(`Berhasil mengimpor ${count} item metadata dalam status Draf.`);
      setImportJsonText('');
      setTimeout(() => {
        setIsImportModalOpen(false);
        setImportSuccess('');
      }, 2000);
      showToast(`Sukses impor ${count} item!`, "success");
    } catch (err: any) {
      setImportError(`Gagal mengurai file JSON: ${err.message}`);
    }
  };

  // Save changes from Edit Modal
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const docRef = doc(db, activeTab, editingItem.id);
      const { id, createdAt, updatedAt, ...cleanData } = editingItem;
      
      const saveData = {
        ...cleanData,
        updatedAt: serverTimestamp()
      };

      await setDoc(docRef, saveData, { merge: true });
      await saveHistorySnapshot(id, activeTab, saveData, user?.email || 'System Admin');
      
      await logAction('Edit Metadata', activeTab, `Memperbarui rincian metadata ID: ${id}`, 'info');
      showToast("Metadata berhasil disimpan dan dicatat dalam versi baru!", "success");
      setIsEditModalOpen(false);
    } catch (err) {
      console.error("Save edit error:", err);
      showToast("Gagal menyimpan perubahan.", "error");
    }
  };

  const filteredItems = items.filter(item => {
    const text = (item.title || item.name || item.measurand || '').toLowerCase();
    const standard = (item.standardReference || item.code || item.methodStandard || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return text.includes(query) || standard.includes(query);
  });

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto font-sans text-slate-100">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-in fade-in duration-500">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-cyan-500 rounded-full" />
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.4em] font-mono">PT SPEKTRUM KREASI PRATAMA</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-xl shadow-cyan-500/20">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase italic">
                Manajer <span className="text-cyan-500">Metadata</span>
              </h1>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Modul Konfigurasi Dinamis Tanpa Source Code (Metode, Alat Standar, &amp; Ruang Lingkup KAN)
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded-2xl text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            <Upload className="w-4 h-4" /> Import JSON
          </button>
          
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-5 py-3.5 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded-2xl text-xs font-bold transition-all shadow-lg cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </header>

      {/* TOAST MESSAGE */}
      {toast && (
        <div className={cn(
          "fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold flex items-center gap-3 border shadow-2xl animate-in slide-in-from-top-4 duration-300",
          toast.type === 'success' ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' :
          toast.type === 'error' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
          'bg-amber-500/15 text-amber-400 border-amber-500/30'
        )}>
          <CheckCircle2 className="w-4 h-4" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        {[
          { key: 'methods', label: 'Metode & Instruksi Kerja (IK)', count: activeTab === 'methods' ? items.length : null },
          { key: 'calibrators', label: 'Standar & Kalibrator', count: activeTab === 'calibrators' ? items.length : null },
          { key: 'kanScope', label: 'Lingkup Akreditasi KAN', count: activeTab === 'kanScope' ? items.length : null },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-5 py-3.5 rounded-2xl text-xs font-bold transition-all relative cursor-pointer",
              activeTab === tab.key
                ? "bg-slate-950 dark:bg-slate-900 text-cyan-400 border border-cyan-500/20 shadow-md"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            {tab.label}
            {tab.count !== null && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* SEARCH AND ADD BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Cari metadata berdasarkan judul atau acuan standar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          />
        </div>

        <button
          onClick={() => {
            const defaultItem = activeTab === 'methods' 
              ? { title: 'Instruksi Kerja Baru', deviceCategory: 'Umum', standardReference: 'IK-SKP-NEW', procedures: [], parameters: [], approvalStatus: 'draft' }
              : activeTab === 'calibrators'
              ? { name: 'Alat Standar Baru', serialNumber: '', model: '', accuracy: '', nextCalibrationDate: '', approvalStatus: 'draft' }
              : { category: 'Umum', measurand: 'Alkes Baru', rangeMin: 0, rangeMax: 100, unit: '', cmcValue: 0.1, cmcUnit: '', approvalStatus: 'draft' };
            
            setEditingItem(defaultItem);
            setIsEditModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tambah Metadata
        </button>
      </div>

      {/* METADATA GRID / LIST */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest font-mono">Memuat koleksi dari Cloud Firestore...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-12 text-center shadow-xl">
          <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-4 animate-bounce" />
          <p className="text-slate-900 dark:text-white font-bold">Tidak ada metadata ditemukan</p>
          <p className="text-slate-400 text-xs mt-1">Gunakan tombol Tambah Metadata di kanan atas untuk membuat konfigurasi baru.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 shadow-xl relative flex flex-col justify-between hover:border-cyan-500/30 transition-all"
            >
              {/* Approval status tag */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-wider font-mono border",
                  item.approvalStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  item.approvalStatus === 'pending_review' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                  'bg-slate-500/10 text-slate-400 border-slate-500/20'
                )}>
                  {item.approvalStatus || 'draft'}
                </span>
              </div>

              <div className="space-y-4">
                <div className="pr-16">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight line-clamp-1 italic">
                    {item.title || item.name || item.measurand}
                  </h3>
                  <p className="text-[10px] text-cyan-400 font-mono font-bold tracking-wider uppercase mt-1">
                    {item.standardReference || item.model || item.category || 'Metadata'}
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-[11px] font-medium space-y-2 text-slate-600 dark:text-slate-400 font-mono">
                  {activeTab === 'methods' && (
                    <>
                      <div className="flex justify-between"><span>Kategori:</span> <span className="text-slate-900 dark:text-slate-200">{item.deviceCategory}</span></div>
                      <div className="flex justify-between"><span>Parameter:</span> <span className="text-slate-900 dark:text-slate-200">{(item.parameters || []).length} jenis</span></div>
                      <div className="flex justify-between"><span>Tipe:</span> <span className="text-indigo-400">{item.isCustom ? 'KUSTOM BUILDER' : 'STANDAR KAN'}</span></div>
                    </>
                  )}
                  {activeTab === 'calibrators' && (
                    <>
                      <div className="flex justify-between"><span>S/N:</span> <span className="text-slate-900 dark:text-slate-200">{item.serialNumber}</span></div>
                      <div className="flex justify-between"><span>Akurasi:</span> <span className="text-slate-900 dark:text-slate-200">{item.accuracy}</span></div>
                      <div className="flex justify-between"><span>Kalibrasi Ulang:</span> <span className="text-rose-400">{item.nextCalibrationDate || '-'}</span></div>
                    </>
                  )}
                  {activeTab === 'kanScope' && (
                    <>
                      <div className="flex justify-between"><span>Rentang:</span> <span className="text-slate-900 dark:text-slate-200">{item.rangeMin} s/d {item.rangeMax} {item.unit}</span></div>
                      <div className="flex justify-between"><span>CMC Limit:</span> <span className="text-emerald-400">{item.cmcValue} {item.cmcUnit}</span></div>
                    </>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4">
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditingItem({ ...item });
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-xl transition-all cursor-pointer"
                    title="Ubah Rincian"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(item)}
                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all cursor-pointer"
                    title="Duplikasi Item"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => fetchVersionHistory(item.id)}
                    className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-xl transition-all cursor-pointer"
                    title="Riwayat Versi / Rollback"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {item.approvalStatus !== 'approved' && isAdminOrSupervisor && (
                    <button
                      onClick={() => handleApprovalChange(item.id, 'approved')}
                      className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  )}
                  {item.approvalStatus === 'approved' && isAdminOrSupervisor && (
                    <button
                      onClick={() => handleApprovalChange(item.id, 'draft')}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EDIT / CREATE MODAL */}
      <AnimatePresence>
        {isEditModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#080d22] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative z-10 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  {editingItem.id ? 'Edit Metadata' : 'Tambah Metadata Baru'}
                </h3>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {activeTab === 'methods' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Judul Metode Kerja</label>
                      <input 
                        type="text"
                        value={editingItem.title || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Kategori Alat Kesehatan</label>
                      <input 
                        type="text"
                        value={editingItem.deviceCategory || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, deviceCategory: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Kode IK/Standard Reference</label>
                      <input 
                        type="text"
                        value={editingItem.standardReference || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, standardReference: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Formula Ketidakpastian Kustom (Opsional)</label>
                      <input 
                        type="text"
                        placeholder="Contoh: sqrt(u_res^2 + u_std^2 + u_rep^2)"
                        value={editingItem.customFormula || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, customFormula: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'calibrators' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Nama Standar / Calibrator</label>
                      <input 
                        type="text"
                        value={editingItem.name || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Serial Number (S/N)</label>
                      <input 
                        type="text"
                        value={editingItem.serialNumber || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, serialNumber: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Model / Type</label>
                      <input 
                        type="text"
                        value={editingItem.model || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, model: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Akurasi &amp; Deviasi Sertifikat</label>
                      <input 
                        type="text"
                        value={editingItem.accuracy || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, accuracy: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Jadwal Kalibrasi Berikutnya</label>
                      <input 
                        type="date"
                        value={editingItem.nextCalibrationDate || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, nextCalibrationDate: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'kanScope' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Nama Besaran / Measurand</label>
                      <input 
                        type="text"
                        value={editingItem.measurand || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, measurand: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Kategori Ruang Lingkup</label>
                      <input 
                        type="text"
                        value={editingItem.category || ''}
                        onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Rentang Min</label>
                        <input 
                          type="number"
                          value={editingItem.rangeMin ?? 0}
                          onChange={(e) => setEditingItem({ ...editingItem, rangeMin: Number(e.target.value) })}
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Rentang Max</label>
                        <input 
                          type="number"
                          value={editingItem.rangeMax ?? 100}
                          onChange={(e) => setEditingItem({ ...editingItem, rangeMax: Number(e.target.value) })}
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1 col-span-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">CMC Value Terakreditasi</label>
                        <input 
                          type="number"
                          step="any"
                          value={editingItem.cmcValue ?? 0.1}
                          onChange={(e) => setEditingItem({ ...editingItem, cmcValue: Number(e.target.value) })}
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono font-bold text-emerald-400"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400">Satuan</label>
                        <input 
                          type="text"
                          value={editingItem.unit || ''}
                          onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
                          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80 mt-6">
                  <button 
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VERSION HISTORY MODAL */}
      <AnimatePresence>
        {showHistory && historyDocId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHistory(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#080d22] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative z-10 text-slate-900 dark:text-white max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  Riwayat Versi &amp; Rollback
                </h3>
                <button 
                  onClick={() => setShowHistory(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {historyItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Info className="w-10 h-10 mx-auto mb-2 text-slate-500" />
                  <p className="text-xs font-bold uppercase tracking-wider font-mono">Belum ada catatan histori perubahan untuk dokumen ini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historyItems.map((rec) => (
                    <div 
                      key={rec.id}
                      className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between md:flex-row md:items-center gap-4 hover:border-amber-500/20 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest font-mono border border-amber-500/30">
                            Versi {rec.version}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">{new Date(rec.updatedAt).toLocaleString('id-ID')}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Diperbarui oleh: <span className="text-slate-900 dark:text-slate-200 font-semibold">{rec.updatedBy}</span></p>
                      </div>

                      <button
                        onClick={() => handleRollback(rec)}
                        disabled={!isAdminOrSupervisor}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md"
                      >
                        Rollback
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMPORT JSON MODAL */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#080d22] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl relative z-10 text-slate-900 dark:text-white"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
                <h3 className="text-lg font-black uppercase tracking-tight italic flex items-center gap-2">
                  <FileJson className="w-5 h-5 text-cyan-400" />
                  Import Metadata JSON
                </h3>
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                  Tempelkan teks JSON metadata yang diekspor sebelumnya di bawah ini. Skema JSON harus berwujud array objek atau objek tunggal yang valid. Data yang diimpor akan didaftarkan dalam status **Draf** untuk proses review keamanan.
                </p>

                <textarea
                  rows={8}
                  placeholder='[\n  {\n    "title": "IK-Infusion-Custom",\n    "deviceCategory": "Syringe / Infusion Pump"\n  }\n]'
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />

                {importError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                )}

                {importSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{importSuccess}</span>
                  </div>
                )}

                <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800/80 mt-6">
                  <button 
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={handleImportJSON}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer"
                  >
                    Proses Impor
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
