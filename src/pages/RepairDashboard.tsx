import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  Stethoscope, 
  Activity, 
  RotateCcw,
  ShieldAlert,
  ChevronRight,
  Package
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function RepairDashboard() {
  const navigate = useNavigate();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'repair_work_orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRepairs(list);
      setLoading(false);
    }, (error) => {
      console.warn('Firestore repair_work_orders error, using fallback:', error);
      setRepairs([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredRepairs = repairs.filter(r => {
    const matchesSearch = 
      (r.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.fasyankesName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.woNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesPriority = selectedPriority === 'all' || r.priority === selectedPriority;

    return matchesSearch && matchesPriority;
  });

  const totalRepairs = repairs.length;
  const criticalRepairs = repairs.filter(r => r.priority === 'Critical').length;
  const inProgressRepairs = repairs.filter(r => r.status === 'Repair in Progress' || r.status === 'Inspection').length;
  const completedRepairs = repairs.filter(r => r.status === 'Completed' || r.status === 'Closed').length;

  const totalDowntimeHours = repairs.reduce((acc, curr) => acc + (curr.downtimeHours || 0), 0);
  const totalCostRp = repairs.reduce((acc, curr) => acc + (curr.totalCost || 0), 0);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 border border-slate-800 p-8 shadow-2xl text-white">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Wrench className="w-96 h-96 text-rose-500" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400 text-xs font-bold uppercase tracking-widest">
              <ShieldAlert className="w-3.5 h-3.5" /> Corrective Maintenance & Repair System
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              Perbaikan Alat Kesehatan
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Manajemen perbaikan alat kesehatan terintegrasi: Laporan Kerusakan, Diagnosis, Root Cause Analysis, Spare Parts, Testing Pasca Perbaikan, dan Pemicu Kalibrasi/UKES.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/repair/wizard')}
              className="px-6 py-3.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-400 hover:to-amber-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Laporkan Kerusakan
            </button>
            <Link
              to="/repair/master-catalog"
              className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all"
            >
              <FileText className="w-4 h-4 text-cyan-400" /> Master Failure Codes
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Perbaikan</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalRepairs}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
              <Wrench className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Seluruh WO perbaikan</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Kerusakan Kritis</p>
              <h3 className="text-3xl font-black text-rose-500 mt-1">{criticalRepairs}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Mempengaruhi pelayanan ICU/OK</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-cyan-500 uppercase tracking-widest">Total Downtime</p>
              <h3 className="text-3xl font-black text-cyan-500 mt-1">{totalDowntimeHours} <span className="text-sm font-normal">Jam</span></h3>
            </div>
            <div className="w-12 h-12 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Waktu alat tidak beroperasi</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Total Biaya Perbaikan</p>
              <h3 className="text-2xl font-black text-emerald-500 mt-1">Rp {totalCostRp.toLocaleString('id-ID')}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Part & Jasa Teknisi</p>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Repair Work Orders & Histori Penanganan
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Daftar laporan kerusakan dan penanganan perbaikan aktif</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari WO, alat, fasyankes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/30 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {filteredRepairs.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <Wrench className="w-12 h-12 text-slate-400 mx-auto opacity-40 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Work Order Perbaikan</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan klik tombol "Laporkan Kerusakan" untuk mencatat kerusakan alat kesehatan.
            </p>
            <button
              onClick={() => navigate('/repair/wizard')}
              className="px-5 py-2.5 bg-rose-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider hover:bg-rose-400 transition-all"
            >
              Laporkan Kerusakan
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <th className="py-4 px-4">No. WO & Peralatan</th>
                  <th className="py-4 px-4">Fasyankes & Ruangan</th>
                  <th className="py-4 px-4">No. Seri & Prioritas</th>
                  <th className="py-4 px-4">Diagnosis & Error Code</th>
                  <th className="py-4 px-4">Status Akhir Alat</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold">
                {filteredRepairs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white uppercase">{r.deviceName}</p>
                          <span className="text-[10px] text-rose-500 font-mono font-bold uppercase">{r.woNumber || 'WO-REP'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-bold">{r.fasyankesName}</p>
                      <p className="text-[10px] text-slate-400 font-normal">Ruang: {r.roomName || '-'}</p>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      <p>SN: {r.serialNumber}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-sans font-bold ${
                        r.priority === 'Critical' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}>
                        {r.priority || 'Medium'} Priority
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-mono text-[11px]">{r.failureCode || 'ERR-GEN'}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{r.diagnosisNote || 'Perbaikan modul'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {r.finalStatus || 'SIAP DIGUNAKAN'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate(`/repair/reports/${r.id}`)}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-[11px] transition-all cursor-pointer"
                      >
                        Detail & Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
