/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  Search, 
  Trash2, 
  FileText, 
  ExternalLink,
  Calendar,
  Loader2,
  ShieldCheck,
  Building
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType, safeDate } from '../lib/firestoreUtils';

export function Certificates() {
  const { profile } = useAuth();
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  useEffect(() => {
    const q = query(collection(db, 'certificates'), orderBy('issuedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCertificates(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'certificates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteCert = async (certId: string) => {
    try {
      await deleteDoc(doc(db, 'certificates', certId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `certificates/${certId}`);
    }
  };

  const filteredCerts = certificates.filter(c => {
    const matchSearch = 
      (c.certificateNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.fasyankesName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.issuedByName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchSearch) return false;

    if (statusFilter === 'active') {
      return c.status === 'active' || c.status === 'approved' || c.status === 'completed';
    }
    if (statusFilter === 'expired') {
      return c.status === 'expired';
    }
    return true;
  });

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      {/* Top Banner Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/70 dark:bg-[#0c1427]/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 p-6 sm:p-8 rounded-3xl shadow-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 bg-blue-600 dark:bg-cyan-400 rounded-full animate-pulse" />
             <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-black uppercase tracking-[0.3em] font-mono">Registri &amp; Arsip Terakreditasi ISO/IEC 17025</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
                <Award className="w-7 h-7" />
             </div>
             <div>
               <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                 Registri <span className="text-blue-600 dark:text-cyan-400">Sertifikat</span>
               </h1>
               <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">Database Sertifikat Kalibrasi &amp; Lembar Hasil Uji Terpusat</p>
             </div>
          </div>
        </div>

        <div className="relative group w-full md:w-auto min-w-[280px] sm:min-w-[360px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari No. Sertifikat, Alat, atau RS..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </header>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { 
            label: 'Total Sertifikat Terbit', 
            value: certificates.length, 
            icon: Award, 
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10 border-blue-500/20'
          },
          { 
            label: 'Terbit Bulan Ini', 
            value: certificates.filter(c => {
              const date = safeDate(c.issuedAt);
              const now = new Date();
              return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length, 
            icon: Calendar, 
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10 border-emerald-500/20'
          },
          { 
            label: 'Sertifikat Aktif Valid', 
            value: certificates.filter(c => c.status === 'active' || c.status === 'approved' || c.status === 'completed').length, 
            icon: ShieldCheck, 
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-500/10 border-cyan-500/20'
          }
        ].map((stat, idx) => (
          <div 
            key={idx} 
            className={cn("p-6 rounded-3xl border backdrop-blur-md flex items-center justify-between shadow-sm transition-transform hover:scale-[1.01]", stat.bg)}
          >
            <div className="space-y-1">
              <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{stat.label}</p>
              <p className="text-3xl font-black font-mono text-slate-900 dark:text-white">{stat.value}</p>
            </div>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.color, "bg-white/80 dark:bg-slate-900/80 shadow-sm")}>
              <stat.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-[#0d1527] border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all",
                statusFilter === 'all'
                  ? "bg-slate-900 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              Semua ({certificates.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase tracking-wider transition-all",
                statusFilter === 'active'
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              Aktif Valid ({certificates.filter(c => c.status === 'active' || c.status === 'approved' || c.status === 'completed').length})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400">
            Menampilkan {filteredCerts.length} dari {certificates.length} data
          </span>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 uppercase text-[9px] font-black tracking-[0.2em] font-mono border-b border-slate-200/80 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4">Nomor &amp; Unit Alat</th>
                <th className="px-6 py-4">Fasyankes / Pemilik</th>
                <th className="px-6 py-4">Penerbitan &amp; Teknisi</th>
                <th className="px-6 py-4">Status &amp; Kelaikan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mx-auto" />
                    <p className="text-xs font-mono text-slate-400 mt-2 font-bold uppercase">Memuat Registri Dokumen...</p>
                  </td>
                </tr>
              ) : filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-24 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                      <FileText className="w-8 h-8" />
                    </div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Tidak ada sertifikat yang cocok.</p>
                    <p className="text-xs text-slate-400 font-mono mt-1">Sertifikat akan otomatis terdaftar saat Lembar Kerja diselesaikan.</p>
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => {
                  const isPass = cert.isPass !== false;
                  return (
                    <tr key={cert.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group">
                      {/* Cert No & Device */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 flex items-center justify-center text-blue-600 dark:text-cyan-400 shrink-0">
                            <Award className="w-5 h-5" />
                          </div>
                          <div>
                            <Link 
                              to={`/certificates/${cert.id}`}
                              className="font-black text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-cyan-400 transition-colors text-sm font-mono tracking-tight"
                            >
                              {cert.certificateNumber || '2026/SKP/04129'}
                            </Link>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mt-0.5">
                              {cert.deviceName || 'Alat Kesehatan'} {cert.serialNumber ? `(S/N: ${cert.serialNumber})` : ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Hospital / Owner */}
                      <td className="px-6 py-4 font-medium">
                        <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{cert.fasyankesName || 'RS Mitra'}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cert.location || 'In-Situ'}</p>
                      </td>

                      {/* Issued date & technician */}
                      <td className="px-6 py-4 font-mono text-[11px]">
                        <p className="font-bold text-slate-700 dark:text-slate-300">
                          {safeDate(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400">Teknisi: {cert.issuedByName || 'Teknisi Utama'}</p>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase font-mono tracking-wider w-fit border",
                            isPass 
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40"
                              : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800/40"
                          )}>
                            {isPass ? "✓ LAIK PAKAI" : "✕ TIDAK LAIK"}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            Exp: {cert.nextCalibrationDate || '12 Bulan'}
                          </span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link 
                            to={`/certificates/${cert.id}`}
                            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-blue-600 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-slate-950 text-slate-700 dark:text-slate-200 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
                            title="Buka Sertifikat Resmi"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Buka
                          </Link>

                          {cert.lkId && (
                            <Link 
                              to={`/worksheets/${cert.lkId}/edit`}
                              className="p-2 text-slate-400 hover:text-cyan-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                              title="Buka Lembar Kerja (LK)"
                            >
                              <FileText className="w-4 h-4" />
                            </Link>
                          )}

                          {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                            <DeleteButton onDelete={() => handleDeleteCert(cert.id)} />
                          )}
                        </div>
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

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);

  return (
    <AnimatePresence mode="wait">
      {confirm ? (
        <motion.div 
          key="confirm"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-1.5 bg-red-500/20 p-1 rounded-xl border border-red-500/30"
        >
          <button 
            onClick={onDelete}
            className="text-[9px] font-black text-white px-2.5 py-1 bg-red-600 rounded-lg uppercase tracking-wider"
          >
            Hapus
          </button>
          <button 
            onClick={() => setConfirm(false)}
            className="text-[9px] font-bold text-slate-400 px-2 py-1 hover:text-white uppercase"
          >
            Batal
          </button>
        </motion.div>
      ) : (
        <button 
          onClick={() => setConfirm(true)}
          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
          title="Hapus Sertifikat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </AnimatePresence>
  );
}
