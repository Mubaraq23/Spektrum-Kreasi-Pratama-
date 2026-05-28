import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  Settings, 
  ArrowLeft,
  RefreshCw,
  Clock,
  User,
  Layers,
  Trash2
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit, deleteDoc, doc, writeBatch, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { useAuth } from '../lib/AuthContext';
import { logAction } from '../lib/auditLogger';

interface AuditLog {
  id: string;
  operatorId: string;
  operatorName: string;
  action: string;
  module: string;
  details: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: any;
}

export function AuditLogs() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'auditLogs'), 
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as AuditLog[];
      setLogs(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleDeleteLog = async (logId: string) => {
    if (!isAdmin) {
      alert("Anda tidak memiliki hak akses untuk menghapus log audit!");
      return;
    }
    try {
      await deleteDoc(doc(db, 'auditLogs', logId));
    } catch (err: any) {
      console.error("Gagal menghapus log audit:", err);
      alert("Gagal menghapus log: " + err.message);
    }
  };

  const handleClearAllLogs = async () => {
    if (!isAdmin) {
      alert("Anda tidak memiliki hak akses untuk membersihkan log audit!");
      return;
    }
    
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'auditLogs'));
      const batch = writeBatch(db);
      querySnapshot.docs.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
      
      // Log the action of clearing the logs
      await logAction(
        "Membersihkan Semua Log Audit",
        "auditLogs",
        `Seluruh riwayat log audit sebanyak ${querySnapshot.size} entri dibersihkan permanen.`,
        "critical"
      );
      
      alert("Seluruh log audit berhasil dibersihkan!");
      setShowConfirmClear(false);
    } catch (err: any) {
      console.error("Gagal membersihkan log audit:", err);
      alert("Gagal membersihkan log: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.operatorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;
    const matchesModule = selectedModule === 'all' || log.module === selectedModule;

    return matchesSearch && matchesSeverity && matchesModule;
  });

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 animate-fade-in">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-2 h-8 bg-indigo-600 rounded-full" />
             <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.4em] font-mono">Keamanan & Kepatuhan</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-955 tracking-tighter leading-none italic uppercase">
            Audit <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-800">Aktivitas</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium max-w-xl">
            Sistem pencatatan log real-time terenkripsi untuk transparansi akuntabilitas kalibrasi medis (ISO 17025).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {isAdmin && (
            <button 
              onClick={() => setShowConfirmClear(true)}
              className="flex items-center gap-2 px-6 py-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 dark:hover:bg-rose-900/40 hover:text-rose-700 dark:hover:text-rose-300 transition-all shadow-sm cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Bersihkan Semua Log
            </button>
          )}
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-850 transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white dark:bg-[#090d1a] border border-slate-100 dark:border-slate-900 rounded-[2.5rem] p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari aktivitas, pelaku atau detail..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-6 py-4 text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 w-full transition-all font-bold uppercase tracking-widest placeholder:text-slate-400"
            />
          </div>

          {/* Severity filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-900 rounded-2xl px-4 py-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-xs text-slate-900 font-bold uppercase tracking-wider focus:outline-none cursor-pointer p-2"
              title="Pilih Keparahan"
              aria-label="Pilih Keparahan"
            >
              <option value="all">Semua Keparahan</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950/45 border border-slate-100 dark:border-slate-900 rounded-2xl px-4 py-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent text-xs text-slate-900 font-bold uppercase tracking-wider focus:outline-none cursor-pointer p-2"
              title="Pilih Modul"
              aria-label="Pilih Modul"
            >
              <option value="all">Semua Modul</option>
              <option value="calibrators">Calibrator</option>
              <option value="worksheets">Worksheet</option>
              <option value="certificates">Certificate</option>
              <option value="users">Users</option>
              <option value="ai">Metrologi AI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Log list container */}
      <div className="bg-white dark:bg-[#090d1a] border border-slate-100 dark:border-slate-900 rounded-[3rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-900 font-mono italic">
                <th className="px-8 py-5">Sistem Waktu</th>
                <th className="px-8 py-5">Penanggung Jawab</th>
                <th className="px-8 py-5">Tindakan / Action</th>
                <th className="px-8 py-5">Modul</th>
                <th className="px-8 py-5">Tingkat</th>
                <th className="px-8 py-5">Keterangan Tambahan</th>
                {isAdmin && <th className="px-8 py-5 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-8 py-20 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-[11px] font-black uppercase tracking-widest font-mono">Sinkronisasi Audit Stream...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-8 py-20 text-center text-slate-400">
                    <ShieldCheck className="w-12 h-12 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                    <p className="text-[11px] font-black uppercase tracking-widest font-mono">Tidak ada rekam log audit ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <td className="px-8 py-5 font-mono text-slate-500 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                           {formatTimestamp(log.createdAt)}
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 text-[10px]">
                              {log.operatorName?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-slate-900 dark:text-white font-black tracking-tight">{log.operatorName}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-slate-850 dark:text-slate-200 font-bold truncate max-w-xs" title={log.action}>
                        {log.action}
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-block px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg font-mono">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest border rounded-full",
                          log.severity === 'critical' ? "bg-red-50 dark:bg-red-950/20 text-red-600 border-red-100 dark:border-red-900/50" :
                          log.severity === 'warning' ? "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border-amber-100 dark:border-amber-900/50" :
                          "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border-blue-100 dark:border-blue-900/50"
                        )}>
                          {log.severity === 'critical' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {log.severity === 'warning' && <AlertCircle className="w-3 h-3 shrink-0" />}
                          {log.severity === 'info' && <Info className="w-3 h-3 shrink-0" />}
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-slate-500 dark:text-slate-400 font-medium max-w-sm overflow-hidden text-ellipsis whitespace-nowrap" title={log.details}>
                        {log.details || '-'}
                      </td>
                      {isAdmin && (
                        <td className="px-8 py-5 text-center whitespace-nowrap">
                          <button
                            onClick={() => {
                              if (window.confirm("Apakah Anda yakin ingin menghapus entri log audit ini secara permanen?")) {
                                handleDeleteLog(log.id);
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all cursor-pointer"
                            title="Hapus Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal to Clear All Logs */}
      <AnimatePresence>
        {showConfirmClear && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmClear(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl relative z-10 space-y-6"
            >
              <div className="flex items-center gap-4 text-rose-600">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 rounded-2xl flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">Konfirmasi Bersihkan Log</h3>
                  <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider font-mono">Tindakan Berisiko Tinggi</p>
                </div>
              </div>
              
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed font-sans">
                Apakah Anda yakin ingin membersihkan **seluruh** data log audit aktivitas sistem secara permanen? Tindakan ini tidak dapat dibatalkan dan semua riwayat akuntabilitas metrologi (ISO 17025) akan terhapus sepenuhnya.
              </p>
              
              <div className="flex items-center gap-3 w-full pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-center"
                >
                  Batal
                </button>
                <button
                  onClick={handleClearAllLogs}
                  className="flex-1 py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer text-center shadow-lg shadow-rose-600/25"
                >
                  Ya, Bersihkan Semua
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
