import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Plus, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Settings, 
  Wrench, 
  Activity,
  Layers
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BAPETEN_REGULATIONS } from '../data/bapetenRegulations';

export interface UkesRadiologyTestRecord {
  id: string;
  deviceName?: string;
  serialNumber?: string;
  fasyankesName?: string;
  certificateNo?: string;
  modalityId?: string;
  overallStatus?: string;
  status?: string;
  testDate?: string;
  [key: string]: any;
}

export function UkesRadiologyDashboard() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<UkesRadiologyTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModality, setSelectedModality] = useState<string>('all');

  const currentReg = BAPETEN_REGULATIONS[0];

  useEffect(() => {
    const q = query(collection(db, 'ukes_radiology_tests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTests(list);
      setLoading(false);
    }, (error) => {
      console.warn('Firestore ukes_radiology_tests query error, using local fallback:', error);
      setTests([]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredTests = tests.filter(t => {
    const matchesSearch = 
      (t.deviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.serialNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.fasyankesName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.certificateNo || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesModality = selectedModality === 'all' || t.modalityId === selectedModality;

    return matchesSearch && matchesModality;
  });

  const totalTests = tests.length;
  const totalLaik = tests.filter(t => t.overallStatus === 'LAIK' || t.overallStatus === 'PASS').length;
  const totalTidakLaik = tests.filter(t => t.overallStatus === 'TIDAK_LAIK' || t.overallStatus === 'FAIL').length;
  const totalReview = tests.filter(t => t.status === 'Review' || t.status === 'In Progress').length;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 shadow-2xl text-white">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Radio className="w-96 h-96 text-cyan-400" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" /> Standar BAPETEN Terbaru (2024 V1)
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight">
              UKES Radiologi BAPETEN
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Sistem Uji Kesesuaian Pesawat Sinar-X terstruktur sesuai Regulasi BAPETEN. Mendukung modalitas Radiografi, Mobile, Dental, CT Scan, Fluoroskopi/C-Arm, dan Mamografi.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/ukes-radiology/wizard')}
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Pengujian Baru
            </button>
            <Link
              to="/ukes-radiology/master-modalities"
              className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Layers className="w-4 h-4 text-cyan-400" /> Master Modality
            </Link>
            <Link
              to="/ukes-radiology/master-regulations"
              className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Settings className="w-4 h-4 text-cyan-400" /> Master Regulasi
            </Link>
            <Link
              to="/ukes-radiology/instruments"
              className="px-5 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-white font-extrabold rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 border border-slate-700 transition-all"
            >
              <Wrench className="w-4 h-4 text-amber-400" /> Master Alat Ukur
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Pengujian</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{totalTests}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Seluruh arsip uji kesesuaian</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Laik Pakai (PASS)</p>
              <h3 className="text-3xl font-black text-emerald-500 mt-1">{totalLaik}</h3>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Memenuhi kriteria BAPETEN</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Tidak Laik Pakai</p>
              <h3 className="text-3xl font-black text-rose-500 mt-1">{totalTidakLaik}</h3>
            </div>
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500">
              <XCircle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Perlu tindakan korektif</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Menunggu Review</p>
              <h3 className="text-3xl font-black text-amber-500 mt-1">{totalReview}</h3>
            </div>
            <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">Pemeriksaan dalam draf/review</p>
        </div>
      </div>

      {/* Modality Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setSelectedModality('all')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            selectedModality === 'all'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
          }`}
        >
          Semua Modalitas
        </button>

        {currentReg.modalities.map(m => (
          <button
            key={m.id}
            onClick={() => setSelectedModality(m.id)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              selectedModality === m.id
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            {m.name}
          </button>
        ))}
      </div>

      {/* 1-Click Quick Preset UKES Launchers */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-3xl space-y-2">
        <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest block">
          ⚡ Mulai Pengujian UKES 1-Klik Per Modalitas Pesawat Sinar-X:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'rad_general', label: 'Radiografi General Stasioner' },
            { id: 'mobile_xray', label: 'Mobile X-Ray Ruang Perawatan' },
            { id: 'ct_scan', label: 'CT Scan Multi-Slice (128 Slice)' },
            { id: 'c_arm', label: 'Fluoroskopi / C-Arm Bedah' },
            { id: 'mammo', label: 'Mamografi Digital' },
            { id: 'dental', label: 'Dental Intraoral / Panoramik' }
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => navigate(`/ukes-radiology/wizard?modality=${preset.id}`)}
              className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>


      {/* Search & Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Daftar Hasil Uji Kesesuaian Pesawat Sinar-X
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Arsip data pengujian kesesuaian terdaftar</p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari fasyankes, alat, no seri..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500/30 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono">Memuat data uji kesesuaian...</div>
        ) : filteredTests.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
            <Radio className="w-12 h-12 text-slate-400 mx-auto opacity-40 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum Ada Data Uji Kesesuaian</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Silakan klik tombol "Pengujian Baru" untuk memulai wizard Uji Kesesuaian Pesawat Sinar-X BAPETEN.
            </p>
            <button
              onClick={() => navigate('/ukes-radiology/wizard')}
              className="px-5 py-2.5 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider hover:bg-cyan-400 transition-all"
            >
              Mulai Uji Kesesuaian
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <th className="py-4 px-4">Modalitas & Pesawat</th>
                  <th className="py-4 px-4">Fasyankes & Ruang</th>
                  <th className="py-4 px-4">No. Seri & Inventaris</th>
                  <th className="py-4 px-4">Tanggal & Penguji</th>
                  <th className="py-4 px-4">Status Kriteria BAPETEN</th>
                  <th className="py-4 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-bold">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center text-cyan-400 shrink-0">
                          <Radio className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 dark:text-white uppercase">{test.deviceName || 'Pesawat Sinar-X'}</p>
                          <span className="text-[10px] text-cyan-500 font-mono font-bold uppercase">{test.modalityName || test.modalityId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 dark:text-slate-200 font-bold">{test.fasyankesName || 'Fasyankes Umum'}</p>
                      <p className="text-[10px] text-slate-400 font-normal">Ruang: {test.roomName || '-'}</p>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-400 text-[11px]">
                      <p>SN: {test.serialNumber || '-'}</p>
                      <p className="text-[10px] text-slate-400">Inv: {test.inventoryNo || '-'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-slate-800 dark:text-slate-200">{test.testDate || '-'}</p>
                      <p className="text-[10px] text-slate-400">{test.testerName || 'Teknisi UKES'}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        test.overallStatus === 'LAIK' || test.overallStatus === 'PASS'
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500'
                          : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                      }`}>
                        {test.overallStatus === 'LAIK' || test.overallStatus === 'PASS' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {test.overallStatus || 'LAIK'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => navigate(`/ukes-radiology/reports/${test.id}`)}
                        className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-700 dark:text-slate-300 font-extrabold rounded-xl text-[11px] transition-all cursor-pointer"
                      >
                        Detail & Sertifikat
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
