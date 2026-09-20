import React, { useState } from 'react';
import { 
  Briefcase, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Radio, 
  Wrench, 
  Award, 
  Activity, 
  ShieldCheck, 
  Compass, 
  Search, 
  ChevronRight,
  Filter,
  Plus
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export function UniversalWorkspace() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'MY_WORK' | 'TODAY' | 'PRIORITY' | 'PENDING' | 'ALERTS' | 'HISTORY'>('MY_WORK');

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
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      {/* Universal Workspace Hero Banner */}
      <Tilt3D intensity={4}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 p-8 md:p-10 shadow-2xl">
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
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Pusat Tugas & <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Operasional Lapangan</span>
              </h1>
              <p className="mt-2 text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
                Workspace universal terpadu untuk alur pengujian metrologi, peninjauan Manajer Teknis, verifikasi QMS, dan persetujuan sertifikat kelaikan alat kesehatan.
              </p>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={() => navigate('/worksheets/new')}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Kalibrasi Baru (LK)
              </button>

              <button
                onClick={() => navigate('/ukes-radiology/wizard')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
              >
                <Radio className="w-4 h-4" /> UKES Radiologi
              </button>

              <button
                onClick={() => navigate('/satusehat-hub')}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-700 transition-all"
              >
                <ShieldCheck className="w-4 h-4" /> SatuSehat Hub
              </button>
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto scrollbar-none">
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
              onClick={() => setActiveTab(tab.id as any)}
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

        {activeTab === 'PENDING' && (
          <div className="space-y-4">
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
      </div>
    </div>
  );
}
