import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  Search, 
  Trash2, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Filter,
  Calendar,
  Loader2
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType, safeDate } from '../lib/firestoreUtils';

export function Certificates() {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, isAdmin } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'certificates'), orderBy('issuedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCertificates(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'certificates');
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

  const filteredCerts = certificates.filter(c => 
    c.certificateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.issuedByName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-1 bg-blue-600 rounded-full" />
             <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] font-mono">Registri Arsip</p>
          </div>
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                 <Award className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none lowercase">
                Manajemen <span className="text-blue-600 italic">Sertifikat</span>
              </h1>
           </div>
           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Database Sertifikat Kalibrasi Terpusat • Quantum Precision Systems</p>
        </div>
        <div className="relative group w-full md:w-auto">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari No. Sertifikat atau Instansi..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 w-full md:w-[450px] shadow-2xl shadow-slate-200/40 transition-all placeholder:text-slate-400 font-sans italic"
          />
        </div>
      </header>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {[
          { label: 'Total Sertifikat', value: certificates.length, icon: Award, color: 'blue' },
          { label: 'Terbit Bulan Ini', value: certificates.filter(c => {
              const date = safeDate(c.issuedAt);
              const now = new Date();
              return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length, icon: Calendar, color: 'emerald' },
          { label: 'Status Proyek Aktif', value: certificates.filter(c => c.status === 'active').length, icon: Filter, color: 'indigo' }
        ].map((stat, idx) => (
          <motion.div 
            key={idx} 
            whileHover={{ y: -5, scale: 1.02 }}
            className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/30 relative overflow-hidden group hover:border-blue-400/50 transition-all"
          >
            <div className={cn(
              "absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-150 rotate-12 duration-1000",
              stat.color === 'blue' ? "text-blue-600" : stat.color === 'emerald' ? "text-emerald-600" : "text-indigo-600"
            )}>
              <stat.icon className="w-20 h-20" />
            </div>
            <div className="relative z-10">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-6 shadow-lg transition-transform group-hover:rotate-6 border border-white/50",
                stat.color === 'blue' ? "bg-blue-600 text-white shadow-blue-500/20" :
                stat.color === 'emerald' ? "bg-emerald-600 text-white shadow-emerald-500/20" :
                "bg-indigo-600 text-white shadow-indigo-500/20"
              )}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 font-mono italic">{stat.label}</p>
              <p className="text-4xl font-black text-slate-950 tracking-tighter italic">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white border border-slate-100 rounded-[3.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-[0.3em] font-mono border-b border-slate-100 italic">
              <tr>
                <th className="px-10 py-8">Nomor Sertifikat</th>
                <th className="px-10 py-8">Informasi Penerbitan</th>
                <th className="px-10 py-8">Masa Berlaku</th>
                <th className="px-10 py-8 text-right">Manajemen Dokumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-24 text-center">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-32 text-center opacity-40 italic">
                    <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest font-mono">Tidak ada sertifikat dalam registri utama.</p>
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-blue-50/30 transition-all group cursor-default">
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-500 shadow-inner">
                          <Award className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight italic">{cert.certificateNumber}</p>
                          <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase mt-1.5 font-mono">LK REF: {cert.lkId?.slice(0,12).toUpperCase()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-600/30" />
                          <p className="text-xs font-black text-slate-600 uppercase tracking-tight italic">{cert.issuedByName}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest font-mono italic">
                          Diterbitkan: {safeDate(cert.issuedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <div className="flex flex-col gap-3">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-tight italic font-mono px-3 py-1 bg-slate-50 rounded-lg w-fit border border-slate-100">{cert.nextCalibrationDate}</span>
                          <span className={cn(
                            "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit border shadow-sm italic",
                            cert.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                          )}>
                             {cert.status}
                          </span>
                       </div>
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link 
                          to={`/certificates/${cert.id}`}
                          className="p-4 text-slate-300 hover:text-blue-600 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-blue-100 hover:shadow-lg hover:shadow-blue-500/5 active:scale-95"
                          title="Lihat Detail Sertifikat"
                        >
                          <ExternalLink className="w-6 h-6" />
                        </Link>
                        {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
                          <DeleteButton onDelete={() => handleDeleteCert(cert.id)} />
                        )}
                        <Link 
                          to={`/worksheets/${cert.lkId}/edit`}
                          className="flex items-center gap-3 px-8 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all ml-4 active:scale-95"
                        >
                          Protocol LK
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
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
          initial={{ opacity: 0, scale: 0.9, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.9, x: 20 }}
          className="flex items-center gap-2 bg-red-500/20 p-1 rounded-xl border border-red-500/30"
        >
          <button 
            onClick={onDelete}
            className="text-[9px] font-black text-white px-3 py-1.5 bg-red-600 rounded-lg shadow-lg uppercase tracking-wider"
          >
            Ya, Hapus
          </button>
          <button 
            onClick={() => setConfirm(false)}
            className="text-[9px] font-bold text-slate-400 px-2 py-1.5 hover:text-white uppercase tracking-wider"
          >
            Batal
          </button>
        </motion.div>
      ) : (
        <button 
          onClick={() => setConfirm(true)}
          className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
          title="Hapus Sertifikat"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </AnimatePresence>
  );
}
