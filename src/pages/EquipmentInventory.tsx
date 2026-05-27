import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Stethoscope, 
  Calendar, 
  Hash, 
  Tag, 
  Database,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  BookOpen,
  Edit2,
  Trash2,
  AlertTriangle,
  QrCode,
  Camera
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType, safeDate } from '../lib/firestoreUtils';
import { translateToIndonesian } from './WorksheetEditor';
import { QRGeneratorModal, QRScannerModal } from '../components/QRManager';

export default function EquipmentInventory() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [selectedQRItem, setSelectedQRItem] = useState<any | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  
  const { user, isAdmin } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    serialNumber: '',
    maintenanceSchedule: '',
    defaultMethodId: '',
  });

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanVal = params.get('scan');
    if (scanVal && equipment.length > 0) {
      const matched = equipment.find(eq => eq.serialNumber?.toLowerCase().trim() === scanVal.toLowerCase().trim() || eq.id === scanVal);
      if (matched) {
        setSelectedQRItem(matched);
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, [equipment]);

  useEffect(() => {
    if (!user) return;

    // Fetch Methods for selection
    const qMethods = query(collection(db, 'methods'), orderBy('title'));
    const unsubscribeMethods = onSnapshot(qMethods, (snapshot) => {
      setMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'methods');
    });

    const q = query(collection(db, 'medicalEquipment'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEquipment(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'medicalEquipment');
    });

    return () => {
      unsubscribeMethods();
      unsubscribe();
    };
  }, [user]);

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      name: item.name || '',
      brand: item.brand || '',
      model: item.model || '',
      serialNumber: item.serialNumber || '',
      maintenanceSchedule: item.maintenanceSchedule || '',
      defaultMethodId: item.defaultMethodId || '',
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'medicalEquipment', id));
      showToast("Aset alat medis berhasil dihapus secara permanen.", "success");
      setItemToDelete(null);
    } catch (err: any) {
      console.error("Error deleting equipment:", err);
      showToast("Gagal menghapus aset alat medis.", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      if (editingId) {
        // Update existing
        await updateDoc(doc(db, 'medicalEquipment', editingId), {
          ...formData,
          updatedAt: serverTimestamp(),
        });
        showToast("Data alat medis berhasil diperbarui!", "success");
      } else {
        // Create new
        await addDoc(collection(db, 'medicalEquipment'), {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
        showToast("Registrasi alat medis baru berhasil disimpan!", "success");
      }
      
      setSuccess(true);
      setFormData({
        name: '',
        brand: '',
        model: '',
        serialNumber: '',
        maintenanceSchedule: '',
        defaultMethodId: '',
      });
      setEditingId(null);
      
      setTimeout(() => {
        setSuccess(false);
        setShowAddForm(false);
      }, 1500);
    } catch (err: any) {
      console.error("Error saving equipment:", err);
      setError(err.message || "Gagal menyimpan data alat.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = equipment.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 relative p-1 pb-20 min-h-screen transition-all duration-300 font-sans">
      
      {/* Top Small Crisp Data Summary Panel */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 border-b border-sky-500/10 dark:border-cyan-500/10 pb-3 text-[10px] font-mono tracking-[0.2em] text-slate-400 dark:text-slate-500 select-none">
        <div className="flex items-center gap-4">
          <span className="text-[#06B6D4] font-black">METROLOGY ID: INVENTORY-CORE</span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-800">|</span>
          <span className="hidden sm:inline">ISO 17025 CERTIFIED AP-9</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            SECURE ASSET DEPOT
          </span>
        </div>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-1 bg-[#06B6D4] rounded-full" />
             <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-black uppercase tracking-[0.4em] font-mono">Daftar Alat Kategori S1</p>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2 uppercase italic">
            Inventaris Alat <span className="text-[#06B6D4] italic">Medis</span>
          </h1>
          <p className="text-[10px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-[0.3em]">Manajemen Aset & Pemeliharaan Spektrum Lab</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={() => setShowScanner(true)}
            className="px-8 py-5 bg-slate-100 dark:bg-[#141b2c] hover:bg-slate-200 dark:hover:bg-[#1f283d] text-slate-800 dark:text-white font-black rounded-2rem text-[11px] uppercase tracking-widest transition-all flex items-center gap-3 active:scale-95 cursor-pointer shadow-md border border-slate-200 dark:border-cyan-500/20"
          >
            <Camera className="w-5 h-5 text-cyan-500" />
            Pindai QR Aset
          </button>
          
          <button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '',
                brand: '',
                model: '',
                serialNumber: '',
                maintenanceSchedule: '',
                defaultMethodId: '',
              });
              setShowAddForm(true);
            }}
            className="px-10 py-5 bg-[#06B6D4] hover:bg-[#06b6d4]/90 text-slate-950 font-black rounded-2rem text-[11px] uppercase tracking-widest shadow-xl shadow-cyan-500/10 transition-all flex items-center gap-3 w-fit active:scale-95 cursor-pointer"
          >
            <Plus className="w-6 h-6" />
            Registrasi Alat Baru
          </button>
        </div>
      </header>

      {/* Search & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 relative group flex items-center">
          <Search className="absolute left-6 w-5 h-5 text-slate-400 dark:text-cyan-400/50" />
          <input 
            type="text" 
            placeholder="Cari berdasarkan nama, merk, atau serial number..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/25 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#06B6D4] focus:border-[#06B6D4] shadow-xl dark:shadow-none transition-all placeholder:text-slate-400"
          />
        </div>
        <div className="md:col-span-12 lg:col-span-4 bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/25 rounded-[2.5rem] p-6 flex items-center justify-around shadow-xl dark:shadow-none">
          <div className="text-center">
            <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest italic font-mono leading-none mb-2">Total Aset</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{equipment.length}</p>
          </div>
          <div className="w-px h-10 bg-slate-200 dark:bg-cyan-500/10"></div>
          <div className="text-center">
            <p className="text-[11px] font-black text-blue-600 dark:text-cyan-400 uppercase tracking-widest italic font-mono leading-none mb-2">Alat Baru</p>
            <p className="text-3xl font-black text-blue-600 dark:text-cyan-400 tracking-tighter">+{equipment.filter(e => {
              const date = e.createdAt ? safeDate(e.createdAt) : null;
              return date && (new Date().getTime() - date.getTime()) < 86400000 * 7;
            }).length}</p>
          </div>
        </div>
      </div>

      {/* Equipment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredItems.map((item) => (
          <motion.div
            layout
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-[#10192d] border border-slate-200 dark:border-cyan-500/25 rounded-[3rem] p-8 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all group relative overflow-hidden shadow-xl dark:shadow-none"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000">
              <Stethoscope className="w-32 h-32 text-cyan-500" />
            </div>
            
            <div className="flex items-start justify-between mb-8">
              <div className="w-16 h-16 rounded-[1.8rem] bg-slate-50 dark:bg-[#070d19] border border-slate-200 dark:border-cyan-500/15 flex items-center justify-center text-slate-400 dark:text-cyan-400/60 group-hover:text-[#06B6D4] group-hover:bg-cyan-500/10 group-hover:border-cyan-500/25 transition-all shadow-inner">
                <Stethoscope className="w-8 h-8" />
              </div>
              {item.status === 'LAIK PAKAI' ? (
                <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/25 shadow-sm flex items-center gap-1.2 text-emerald-550 dark:text-emerald-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] italic">LAIK PAKAI</span>
                </div>
              ) : item.status === 'TIDAK LAIK' ? (
                <div className="px-3 py-1 bg-rose-500/10 rounded-full border border-rose-500/25 shadow-sm flex items-center gap-1.2 text-rose-500">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] italic">TIDAK LAIK</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-sky-500/10 rounded-full border border-sky-500/25 shadow-sm flex items-center gap-1.2 text-sky-550 dark:text-cyan-400">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] italic">SIAP DIGUNAKAN</span>
                </div>
              )}
            </div>

            <div className="space-y-6 relative z-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-cyan-400 transition-colors leading-tight mb-2 truncate uppercase italic">LK-{item.name}</h3>
                <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-[0.2em] italic font-mono">{item.brand} &bull; {item.model}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 bg-slate-50/55 dark:bg-[#070d19]/80 p-6 rounded-[2.5rem] border border-slate-200/50 dark:border-cyan-500/10 group-hover:bg-cyan-500/5 group-hover:border-cyan-500/20 transition-all">
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-cyan-400/80">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase font-mono italic">S/N</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono italic truncate tracking-tighter">{item.serialNumber}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-cyan-400/80">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[9px] font-black uppercase font-mono italic">Sched</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 dark:text-white font-mono italic truncate tracking-tighter">{item.maintenanceSchedule || 'Daily'}</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#070d19] border border-slate-200 dark:border-cyan-500/10 flex items-center justify-center text-[10px] font-black text-slate-500 dark:text-cyan-405 shadow-sm">
                    <BookOpen className="w-4 h-4 text-[#06B6D4]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest font-mono leading-none mb-1">Metode Hub</span>
                    <span className="text-[10px] text-slate-700 dark:text-slate-300 font-extrabold uppercase tracking-tighter truncate max-w-[120px]">
                      {(() => {
                        const m = methods.find(m => m.id === item.defaultMethodId);
                        return m ? translateToIndonesian(m.title) : "Belum Terhubung";
                      })()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedQRItem(item)}
                    className="w-10 h-10 bg-white dark:bg-[#070d19] border border-slate-200 dark:border-cyan-500/20 shadow-sm rounded-xl flex items-center justify-center text-cyan-600 dark:text-cyan-400 hover:text-slate-900 dark:hover:text-cyan-300 hover:bg-cyan-500/10 transition-all active:scale-95 cursor-pointer"
                    title="Generate QR Tag"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleEdit(item)}
                    className="w-10 h-10 bg-white dark:bg-[#070d19] border border-slate-100 dark:border-cyan-500/15 shadow-sm rounded-xl flex items-center justify-center text-slate-400 hover:text-[#06B6D4] hover:border-[#06B6D4] transition-all active:scale-95 cursor-pointer"
                    title="Edit Alkes"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {isAdmin && (
                    <button 
                      onClick={() => setItemToDelete(item.id)}
                      className="w-10 h-10 bg-white dark:bg-[#070d19] border border-slate-100 dark:border-cyan-500/15 shadow-sm rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-500/10 hover:border-red-500/20 transition-all active:scale-95 cursor-pointer"
                      title="Hapus Alkes"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedQRItem(item)}
                    className="w-10 h-10 bg-white dark:bg-[#070d19] border border-slate-100 dark:border-cyan-500/15 shadow-xl dark:shadow-none rounded-xl flex items-center justify-center text-slate-300 hover:text-[#06B6D4] dark:hover:text-cyan-400 hover:border-[#06B6D4] transition-all active:scale-95 cursor-pointer"
                    title="Detail Aset"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setShowAddForm(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden"
            >
              <div className="p-10 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                      <Database className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">{editingId ? "Edit Alat Medis" : "Registrasi Alat Medis"}</h2>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1.5 font-mono">Modul Manajemen Aset</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowAddForm(false)}
                    className="p-4 bg-white border border-slate-100 hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-auto custom-scrollbar max-h-[70vh]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-mono">Nama Alat</label>
                    <input 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Contoh: Defibrillator"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-mono">Merk / Brand</label>
                    <input 
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      placeholder="Contoh: Philips"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-mono">Model / Type</label>
                    <input 
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      placeholder="Contoh: HeartStart XL"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all placeholder:text-slate-300"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-mono">Serial Number (S/N)</label>
                    <input 
                      required
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                      placeholder="Contoh: SN998231X"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono placeholder:text-slate-300"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-mono">Metode Kalibrasi Standar</label>
                    <select 
                      value={formData.defaultMethodId}
                      onChange={(e) => setFormData({...formData, defaultMethodId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all"
                    >
                       <option value="">Pilih Metode Kerja (Opsional)</option>
                       {methods.map(m => (
                         <option key={m.id} value={m.id}>MK-{translateToIndonesian(m.title)} ({m.deviceCategory})</option>
                       ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="p-6 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    <p className="text-[11px] font-black uppercase tracking-widest">{error}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 pt-6">
                  <button 
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    disabled={loading}
                    className="flex-1 px-8 py-5 bg-slate-100 border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 hover:bg-slate-200 hover:text-slate-900 transition-all uppercase tracking-widest"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-[2] px-8 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black hover:bg-blue-700 transition-all uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 disabled:opacity-50 relative overflow-hidden active:scale-95"
                  >
                    {loading ? (
                      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    ) : success ? (
                      <div className="flex items-center justify-center gap-3">
                        <CheckCircle2 className="w-6 h-6" />
                        Tersimpan!
                      </div>
                    ) : (
                      "Simpan Ke Database"
                    )}
                  </button>
                </div>
              </form>
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
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden z-20"
            >
              <div className="flex items-center gap-4 text-red-600 mb-6">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase italic">Konfirmasi Hapus</h3>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Hapus dari Inventaris</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed mb-8 font-sans">
                Apakah Anda yakin ingin menghapus aset alat medis ini secara permanen? Penghapusan ini tidak akan mematikan data historis lembar kerja yang sudah disinkronkan, namun alat tidak akan tersedia lagi untuk dipilih dalam draf baru.
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
                  Ya, Hapus Aset
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant Toast Feedback */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              "fixed bottom-12 right-12 z-[100] px-8 py-5 rounded-2xl shadow-2xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 border transition-all",
              toast.type === "success" && "bg-slate-950 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10",
              toast.type === "error" && "bg-red-950 text-red-400 border-red-500/30 shadow-red-500/10",
              toast.type === "info" && "bg-slate-950 text-blue-400 border-blue-500/30 shadow-blue-500/10"
            )}
          >
            <div className={cn(
              "w-2 h-2 rounded-full",
              toast.type === "success" && "bg-emerald-405",
              toast.type === "error" && "bg-red-505",
              toast.type === "info" && "bg-blue-505"
            )} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code and Scanner Modals */}
      <AnimatePresence>
        {selectedQRItem && (
          <QRGeneratorModal
            item={selectedQRItem}
            methods={methods}
            onClose={() => setSelectedQRItem(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScanner && (
          <QRScannerModal
            onClose={() => setShowScanner(false)}
            equipmentList={equipment}
            methods={methods}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
