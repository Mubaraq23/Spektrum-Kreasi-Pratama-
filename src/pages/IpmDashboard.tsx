import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  PackageCheck, 
  FileText, 
  Stethoscope, 
  QrCode,
  ShieldCheck,
  ChevronRight,
  Activity,
  Layers
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { IPM_TEMPLATES_CATALOG } from '../data/ipmTemplatesCatalog';

export function IpmDashboard() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const q = query(collection(db, 'ipm_work_orders'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWorkOrders(list);
      setLoading(false);
    }, (error) => {
      console.warn('Firestore ipm_work_orders error, using fallback:', error);
      setWorkOrders([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredWOs = workOrders.filter(wo => {
    const matchesSearch = 
      (wo.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wo.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wo.fasyankesName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wo.woNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || wo.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const totalWO = workOrders.length;
  const completedWO = workOrders.filter(w => w.status === 'Approved' || w.status === 'Closed' || w.status === 'Completed').length;
  const overdueWO = workOrders.filter(w => w.isOverdue).length;
  const inProgressWO = workOrders.filter(w => w.status === 'In Progress' || w.status === 'Assigned').length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 border border-slate-800 p-8 shadow-2xl text-white">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Wrench className="w-96 h-96 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Terintegrasi Kalibrasi & Spare Parts
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              IPM Alat Kesehatan Engine
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Sistem Inspeksi dan Pemeliharaan Preventif (IPM) Dinamis untuk seluruh kategori alat kesehatan. Terintegrasi dengan jadwal maintenance, inventaris spare part, dan sertifikat pemeliharaan.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/ipm/wizard')}
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Work Order IPM Baru
            </button>
            <Link
              to="/ipm/templates"
              className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Layers className="w-4 h-4 text-cyan-400" /> Master Templat
            </Link>
            <Link
              to="/ipm/spare-parts"
              className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all"
            >
              <PackageCheck className="w-4 h-4 text-emerald-400" /> Stok Spare Parts
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Work Orders</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalWO}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Seluruh WO pemeliharaan</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">IPM Selesai</p>
              <h3 className="text-3xl font-black text-emerald-500 mt-1">{completedWO}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Laporan & sertifikat terbit</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Dalam Pengerjaan</p>
              <h3 className="text-3xl font-black text-amber-500 mt-1">{inProgressWO}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Teknisi di lapangan</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Overdue / Terlambat</p>
              <h3 className="text-3xl font-black text-rose-500 mt-1">{overdueWO}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Perlu prioritas penanganan</p>
        </div>
      </div>

      {/* Main Work Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Work Orders & Jadwal Pemeliharaan Alat
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Daftar inspeksi dan pemeliharaan preventif aktif</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari WO, alat, fasyankes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {filteredWOs.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <Wrench className="w-12 h-12 text-slate-400 mx-auto opacity-40 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Work Order IPM</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan buat Work Order IPM baru untuk memulai pemeliharaan alat kesehatan.
            </p>
            <button
              onClick={() => navigate('/ipm/wizard')}
              className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider hover:bg-cyan-400 transition-all"
            >
              Buat Work Order Baru
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <th className="py-4 px-4">No. WO & Peralatan</th>
                  <th className="py-4 px-4">Fasyankes & Ruangan</th>
                  <th className="py-4 px-4">No. Seri & Riskan</th>
                  <th className="py-4 px-4">Jadwal & Teknisi</th>
                  <th className="py-4 px-4">Status Kelayakan</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold">
                {filteredWOs.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 shrink-0">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white uppercase">{wo.deviceName}</p>
                          <span className="text-[10px] text-cyan-500 font-mono font-bold uppercase">{wo.woNumber || 'WO-IPM'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-bold">{wo.fasyankesName}</p>
                      <p className="text-[10px] text-slate-400 font-normal">Ruang: {wo.roomName || '-'}</p>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      <p>SN: {wo.serialNumber}</p>
                      <span className="text-[9px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full font-sans font-bold text-slate-500">
                        {wo.riskLevel || 'Medium'} Risk
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 dark:text-slate-200">{wo.ipmDate || '-'}</p>
                      <p className="text-[10px] text-slate-400">{wo.technicianName || 'Teknisi'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        {wo.fitnessStatus || 'LAYAK DIGUNAKAN'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate(`/ipm/reports/${wo.id}`)}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-[11px] transition-all cursor-pointer"
                      >
                        Detail Laporan
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
