import React, { useState } from 'react';
import { 
  Briefcase, 
  Clock, 
  AlertTriangle, 
  Radio, 
  Activity, 
  ShieldCheck, 
  Compass, 
  ChevronRight,
  Plus
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

type WorkspaceTab = 'MY_WORK' | 'TODAY' | 'PRIORITY' | 'PENDING' | 'ALERTS' | 'HISTORY';

export function UniversalWorkspace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('MY_WORK');

  const userRole = profile?.role || 'technician';

  const myWorkTasks = [
    {
      id: 'WO-CAL-2026-081',
      title: 'Kalibrasi KAN Defibrillator TEC-5631',
      facility: 'RSUD Semesta Sehat (IGD)',
      dueDate: 'Hari ini, 16:00',
      priority: 'HIGH',
      type: 'KALIBRASI',
      path: '/worksheets/LK-DEF-2026-0812/edit'
    },
    {
      id: 'WO-RAD-2026-042',
      title: 'Uji Kesesuaian Sinar-X Radiografi Umum',
      facility: 'RSIA Kasih Ibu (Radiologi)',
      dueDate: 'Besok, 10:00',
      priority: 'MEDIUM',
      type: 'UKES_RADIOLOGI',
      path: '/ukes-radiology/wizard'
    },
    {
      id: 'WO-IPM-2026-019',
      title: 'Pemeliharaan Preventif Patient Monitor',
      facility: 'RS Medika Utama (ICU)',
      dueDate: '26-08-2026',
      priority: 'LOW',
      type: 'IPM',
      path: '/ipm/wizard'
    }
  ];

  const pendingReviews = [
    {
      id: 'REV-LK-0089',
      title: 'Review Lembar Kerja Infant Incubator',
      technician: 'Budi Santoso, S.ST.',
      submittedAt: '24-08-2026 14:20',
      status: 'PENDING_TECHNICAL_REVIEW',
      path: '/worksheets'
    },
    {
      id: 'REV-RAD-0042',
      title: 'Sign-off Laporan Uji Kesesuaian BAPETEN',
      technician: 'Raditya Pratama, S.Si.',
      submittedAt: '24-08-2026 15:10',
      status: 'PENDING_QA_SIGNATURE',
      path: '/ukes-radiology'
    }
  ];

  return (
    <div className="p-2 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-10 text-slate-100">
      {/* Universal Workspace Hero Banner */}
      <Tilt3D intensity={4}>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 p-5 sm:p-8 md:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-black uppercase tracking-widest">
                <Compass className="w-4 h-4 text-cyan-400" /> Universal Engineering Workspace 3.0
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                ROLE: {userRole.toUpperCase()}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight text-white">
                Pusat Tugas & <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Operasional Lapangan</span>
              </h1>
              <p className="mt-2 text-slate-400 max-w-3xl text-xs sm:text-sm md:text-base leading-relaxed">
                Workspace universal terpadu untuk alur pengujian metrologi, peninjauan Manajer Teknis, verifikasi QMS, dan persetujuan sertifikat kelaikan alat kesehatan.
              </p>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap gap-2.5 sm:gap-3 pt-2">
              <button
                onClick={() => navigate('/worksheets/new')}
                className="px-3.5 sm:px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Kalibrasi Baru (LK)
              </button>

              <button
                onClick={() => navigate('/ukes-radiology/wizard')}
                className="px-3.5 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <Radio className="w-4 h-4" /> UKES Radiologi
              </button>

              <button
                onClick={() => navigate('/satusehat-hub')}
                className="px-3.5 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" /> SatuSehat Hub
              </button>
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto touch-pan-x no-scrollbar">
        {[
          { id: 'MY_WORK', label: 'Tugas Saya (My Work)', icon: Briefcase, count: myWorkTasks.length },
          { id: 'TODAY', label: 'Jadwal Hari Ini', icon: Clock, count: 2 },
          { id: 'PRIORITY', label: 'Prioritas Tinggi', icon: AlertTriangle, count: 1 },
          { id: 'PENDING', label: 'Menunggu Review', icon: Activity, count: pendingReviews.length },
          { id: 'ALERTS', label: 'Alert Regulasi & Standar', icon: ShieldCheck, count: 3 }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as WorkspaceTab)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-black'
                  : 'bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                  activeTab === tab.id ? 'bg-slate-950 text-cyan-400 font-mono' : 'bg-slate-800 text-slate-300 font-mono'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Display */}
      <div className="space-y-6">
        {activeTab === 'MY_WORK' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {myWorkTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => navigate(task.path)}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer space-y-4 group shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">{task.id}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                    task.priority === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {task.priority} PRIORITY
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">{task.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{task.facility}</p>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>Due: {task.dueDate}</span>
                  <ChevronRight className="w-4 h-4 text-cyan-400 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'TODAY' && (
          <div className="space-y-4">
            <div className="p-4 bg-cyan-950/30 border border-cyan-500/20 rounded-2xl flex items-center justify-between text-xs text-cyan-300">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>Jadwal Operasional Hari Ini: <strong>2 Tugas Pengujian & Kalibrasi Terjadwal</strong></span>
              </div>
              <span className="font-mono text-cyan-400 font-bold">20 September 2026</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                onClick={() => navigate('/worksheets/LK-DEF-2026-0812/edit')}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer space-y-3 group shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-cyan-400">WO-CAL-2026-081</span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    16:00 WIB • TENGGAT HARI INI
                  </span>
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                  Kalibrasi KAN Defibrillator TEC-5631
                </h3>
                <p className="text-xs text-slate-400">Lokasi: RSUD Semesta Sehat (IGD) • Standar: Fluke Impulse 7000DP</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-cyan-400 font-mono">
                  <span>Buka Lembar Kerja</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>

              <div 
                onClick={() => navigate('/calibrators')}
                className="p-6 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer space-y-3 group shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-amber-400">INT-CHK-2026-009</span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    14:00 WIB • CHECK HARIAN
                  </span>
                </div>
                <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition-colors">
                  Verifikasi Antara Standar Fluke ESA620
                </h3>
                <p className="text-xs text-slate-400">Lokasi: Laboratorium Metrologi Depok • Petugas: Teknisi Penanggungjawab</p>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400 font-mono">
                  <span>Periksa Status Kalibrator</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PRIORITY' && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-950/30 border border-rose-500/20 rounded-2xl flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Instrumen Resiko Tinggi & Penanganan Prioritas (Permenkes No. 54/2015)</span>
              </div>
              <span className="font-mono text-rose-400 font-bold">URGENT</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myWorkTasks.filter(t => t.priority === 'HIGH').map((task) => (
                <div
                  key={task.id}
                  onClick={() => navigate(task.path)}
                  className="p-6 rounded-3xl bg-slate-900 border border-rose-500/30 hover:border-rose-500/60 transition-all cursor-pointer space-y-4 group shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-rose-400">{task.id}</span>
                    <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                      HIGH PRIORITY
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-white text-base group-hover:text-rose-300 transition-colors">{task.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">{task.facility}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
                    <span>Due: {task.dueDate}</span>
                    <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'PENDING' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-950/30 border border-amber-500/20 rounded-2xl flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>Verifikasi Berjenjang & Otorisasi Teknis (ISO/IEC 17025 Kl. 7.8)</span>
              </div>
              <span className="font-mono text-amber-400 font-bold">{pendingReviews.length} DOKUMEN MENUNGGU</span>
            </div>

            {pendingReviews.map((rev) => (
              <div
                key={rev.id}
                onClick={() => navigate(rev.path)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">{rev.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {rev.status}
                    </span>
                  </div>
                  <div className="font-bold text-white text-sm">{rev.title}</div>
                  <div className="text-xs text-slate-400">Teknisi: {rev.technician} • Dikirim: {rev.submittedAt}</div>
                </div>

                <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start md:self-auto border border-slate-700">
                  Buka Review <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ALERTS' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                    COMPLIANT
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">Akreditasi KAN LK-291-IDN</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ruang lingkup ISO/IEC 17025:2017 & batas CMC terverifikasi penuh dan aktif dalam siklus akreditasi.
                </p>
                <button 
                  onClick={() => navigate('/scope-command-center')}
                  className="pt-2 text-xs text-cyan-400 font-bold hover:underline flex items-center gap-1"
                >
                  Buka Scope Command Center <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                    35 HARI LAGI
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">Resertifikasi Standar Ukur</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Standar Fluke 700G07 Digital Pressure Gauge memerlukan kalibrasi ulang SNSU-BSN sebelum masa berlaku habis.
                </p>
                <button 
                  onClick={() => navigate('/calibrators')}
                  className="pt-2 text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  Kelola Standar Kalibrator <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                    <Radio className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-black uppercase text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                    ONLINE
                  </span>
                </div>
                <h4 className="font-bold text-white text-sm">BAPETEN Si-INTAN & SatuSehat</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pipeline transmisi dosis radiasi dan FHIR R4 bridging siap disinkronisasikan ke portal kementerian.
                </p>
                <button 
                  onClick={() => navigate('/siintan-dispatcher')}
                  className="pt-2 text-xs text-teal-300 font-bold hover:underline flex items-center gap-1"
                >
                  Buka Si-INTAN Dispatcher <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
