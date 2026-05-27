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
  Layers
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');

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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="w-2 h-8 bg-indigo-600 rounded-full" />
             <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.4em] font-mono">Keamanan & Kepatuhan</p>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter leading-none italic uppercase">
            Audit <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-800">Aktivitas</span>
          </h1>
          <p className="text-slate-600 text-sm font-medium max-w-xl">
            Sistem pencatatan log real-time terenkripsi untuk transparansi akuntabilitas kalibrasi medis (ISO 17025).
          </p>
        </div>

        <button 
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all self-start lg:self-auto shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-6 shadow-sm space-y-4">
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
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2">
            <AlertCircle className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent text-xs text-slate-900 font-bold uppercase tracking-wider focus:outline-none cursor-pointer p-2"
            >
              <option value="all">Semua Keparahan</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Module Filter */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <select 
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="bg-transparent text-xs text-slate-900 font-bold uppercase tracking-wider focus:outline-none cursor-pointer p-2"
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
      <div className="bg-white border border-slate-100 rounded-[3rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[800px] border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] border-b border-slate-100 font-mono italic">
                <th className="px-8 py-5">Sistem Waktu</th>
                <th className="px-8 py-5">Penanggung Jawab</th>
                <th className="px-8 py-5">Tindakan / Action</th>
                <th className="px-8 py-5">Modul</th>
                <th className="px-8 py-5">Tingkat</th>
                <th className="px-8 py-5">Keterangan Tambahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400">
                    <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-[11px] font-black uppercase tracking-widest font-mono">Sinkronisasi Audit Stream...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-slate-400">
                    <ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-[11px] font-black uppercase tracking-widest font-mono">Tidak ada rekam log audit ditemukan</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                      <td className="px-8 py-5 font-mono text-slate-500 whitespace-nowrap">
                         <div className="flex items-center gap-2">
                           <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                           {formatTimestamp(log.createdAt)}
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-[10px]">
                              {log.operatorName?.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-slate-900 font-black tracking-tight">{log.operatorName}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5 text-slate-800 font-bold truncate max-w-xs" title={log.action}>
                        {log.action}
                      </td>
                      <td className="px-8 py-5">
                        <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-lg font-mono">
                          {log.module}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase tracking-widest border rounded-full",
                          log.severity === 'critical' ? "bg-red-50 text-red-600 border-red-100" :
                          log.severity === 'warning' ? "bg-amber-50 text-amber-600 border-amber-100" :
                          "bg-blue-50 text-blue-600 border-blue-100"
                        )}>
                          {log.severity === 'critical' && <AlertTriangle className="w-3 h-3 shrink-0" />}
                          {log.severity === 'warning' && <AlertCircle className="w-3 h-3 shrink-0" />}
                          {log.severity === 'info' && <Info className="w-3 h-3 shrink-0" />}
                          {log.severity}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-slate-500 font-medium max-w-sm overflow-hidden text-ellipsis whitespace-nowrap" title={log.details}>
                        {log.details || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
