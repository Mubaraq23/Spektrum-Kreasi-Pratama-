import React, { useState } from 'react';
import {
  ClipboardList, Clock, CheckCircle2, AlertTriangle, UserCheck,
  Activity, Plus, Filter, Search, ChevronRight, Zap,
  Calendar, Building2, Cpu, ArrowUpRight, Timer,
  Eye, Edit3, X, Loader2, Bell, BarChart3, TrendingUp,
  Users, Target, RefreshCw
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

type WOType = 'CALIBRATION' | 'UKES' | 'IPM' | 'REPAIR';
type WOStatus = 'REQUESTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'COMPLETED';
type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

interface WorkOrder {
  id: string;
  title: string;
  facility: string;
  unit: string;
  assetId: string;
  assetName: string;
  type: WOType;
  status: WOStatus;
  slaDeadline: string;
  slaHoursLeft: number;
  priority: Priority;
  assignedTechnician: string;
  requestedBy: string;
  createdAt: string;
  notes: string;
}

const WORK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-2026-0901', title: 'Kalibrasi KAN Defibrillator CITO', facility: 'RSUD Dr. Soetomo',
    unit: 'IGD', assetId: 'EQ-DEF-2026-089', assetName: 'Zoll R Series', type: 'CALIBRATION',
    status: 'IN_PROGRESS', slaDeadline: '20 Sep 2026 14:00', slaHoursLeft: 2, priority: 'CRITICAL',
    assignedTechnician: 'Ir. Ahmad Zaky, S.T.', requestedBy: 'Kepala IGD', createdAt: '20 Sep 2026',
    notes: 'Unit defibrillator digunakan rutin — butuh pengesahan laik pakai segera.'
  },
  {
    id: 'WO-2026-0902', title: 'Uji Kesesuaian BAPETEN X-Ray Multix', facility: 'RSIA Kasih Ibu',
    unit: 'Radiologi', assetId: 'EQ-XRAY-2026-004', assetName: 'Siemens Multix Pro', type: 'UKES',
    status: 'SCHEDULED', slaDeadline: '22 Sep 2026 09:00', slaHoursLeft: 35, priority: 'HIGH',
    assignedTechnician: 'Raditya Pratama, S.Si.', requestedBy: 'Kepala Radiologi', createdAt: '18 Sep 2026',
    notes: 'Jadwal Ukes BAPETEN periodik, 2 tahun sekali. Persiapkan instrumen Piranha dan Gammex phantom.'
  },
  {
    id: 'WO-2026-0903', title: 'IPM Ventilator ICU Semester 2', facility: 'RS Premier Surabaya',
    unit: 'ICU', assetId: 'EQ-VENT-2026-012', assetName: 'Hamilton C6 x3 unit', type: 'IPM',
    status: 'REVIEW', slaDeadline: '21 Sep 2026 17:00', slaHoursLeft: 11, priority: 'HIGH',
    assignedTechnician: 'Budi Santoso, A.Md.', requestedBy: 'Kepala ICU', createdAt: '19 Sep 2026',
    notes: 'IPM 3 unit Hamilton C6. Laporan telah diselesaikan, menunggu review supervisor.'
  },
  {
    id: 'WO-2026-0904', title: 'Perbaikan Infusion Pump Error Code E05', facility: 'RS Siloam Surabaya',
    unit: 'Rawat Inap Lt.3', assetId: 'EQ-INF-2026-034', assetName: 'Terumo TE-171', type: 'REPAIR',
    status: 'REQUESTED', slaDeadline: '23 Sep 2026 12:00', slaHoursLeft: 48, priority: 'MEDIUM',
    assignedTechnician: '(Belum Ditugaskan)', requestedBy: 'Kepala Ruangan', createdAt: '20 Sep 2026',
    notes: 'Infusion pump menampilkan error code E05 pada sensor flow. Butuh diagnosa kerusakan.'
  },
  {
    id: 'WO-2026-0905', title: 'Kalibrasi Pulse Oximeter NIBP Annual', facility: 'Puskesmas Wonokromo',
    unit: 'Poli Umum', assetId: 'EQ-SPO2-2026-201', assetName: 'Nonin 9600 x5', type: 'CALIBRATION',
    status: 'COMPLETED', slaDeadline: '15 Sep 2026 16:00', slaHoursLeft: 0, priority: 'LOW',
    assignedTechnician: 'Sari Dewi, A.Md.Kes.', requestedBy: 'Kepala Puskesmas', createdAt: '10 Sep 2026',
    notes: 'Semua 5 unit lulus kalibrasi. Sertifikat diterbitkan No. SPK/CAL/2026/09-0120 s.d. 0124.'
  },
  {
    id: 'WO-2026-0906', title: 'Kalibrasi Patient Monitor Multi-Parameter', facility: 'RSUD Kariadi',
    unit: 'Bedah Sentral', assetId: 'EQ-PM-2026-055', assetName: 'GE Datex-Ohmeda S5', type: 'CALIBRATION',
    status: 'APPROVED', slaDeadline: '19 Sep 2026 15:00', slaHoursLeft: 0, priority: 'MEDIUM',
    assignedTechnician: 'Ahmad Rifai, A.Md.Kes.', requestedBy: 'Kepala Kamar Bedah', createdAt: '16 Sep 2026',
    notes: 'Selesai dikalibrasi — menunggu tanda tangan digital Manajer Teknis untuk penerbitan sertifikat.'
  },
];

const TYPE_CONFIG: Record<WOType, { label: string; color: string; bgColor: string }> = {
  CALIBRATION: { label: 'Kalibrasi', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/30' },
  UKES: { label: 'Ukes Radiologi', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30' },
  IPM: { label: 'IPM', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  REPAIR: { label: 'Perbaikan', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
};

const STATUS_CONFIG: Record<WOStatus, { label: string; color: string; step: number }> = {
  REQUESTED: { label: 'Diminta', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', step: 1 },
  SCHEDULED: { label: 'Terjadwal', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', step: 2 },
  IN_PROGRESS: { label: 'Sedang Dikerjakan', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', step: 3 },
  REVIEW: { label: 'Review Supervisor', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30', step: 4 },
  APPROVED: { label: 'Disetujui', color: 'text-teal-400 bg-teal-500/10 border-teal-500/30', step: 5 },
  COMPLETED: { label: 'Selesai', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', step: 6 },
};

const PRIORITY_CONFIG: Record<Priority, { color: string; bg: string }> = {
  CRITICAL: { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40' },
  HIGH: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40' },
  MEDIUM: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/40' },
  LOW: { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/40' },
};

const LIFECYCLE_STEPS: WOStatus[] = ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS', 'REVIEW', 'APPROVED', 'COMPLETED'];

const slaChartData = [
  { label: 'Kalibrasi', on_time: 42, late: 3 },
  { label: 'Ukes', on_time: 18, late: 1 },
  { label: 'IPM', on_time: 24, late: 0 },
  { label: 'Repair', on_time: 15, late: 2 },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function SmartWorkOrderEngine() {
  const [filterType, setFilterType] = useState<WOType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<WOStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);

  const filtered = WORK_ORDERS.filter(wo => {
    if (filterType !== 'ALL' && wo.type !== filterType) return false;
    if (filterStatus !== 'ALL' && wo.status !== filterStatus) return false;
    if (searchQuery && !wo.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !wo.facility.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !wo.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total: WORK_ORDERS.length,
    critical: WORK_ORDERS.filter(wo => wo.priority === 'CRITICAL' && wo.status !== 'COMPLETED').length,
    inProgress: WORK_ORDERS.filter(wo => wo.status === 'IN_PROGRESS').length,
    completed: WORK_ORDERS.filter(wo => wo.status === 'COMPLETED').length,
    overdue: WORK_ORDERS.filter(wo => wo.slaHoursLeft < 0).length,
  };

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950/60 to-slate-950 border border-blue-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
              <ClipboardList className="w-4 h-4" /> Smart Work Order Engine & SLA Escalation Manager
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Pusat Kendali{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                Smart Work Order &amp; SLA
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Manajemen siklus hidup perintah kerja terpadu — Kalibrasi, Ukes, IPM, &amp; Repair — dengan pemantauan SLA real-time, eskalasi otomatis, dan lifecycle tracker 6-step.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Work Order', value: counts.total, color: 'cyan', icon: ClipboardList },
          { label: 'Critical / Urgent', value: counts.critical, color: 'rose', icon: AlertTriangle },
          { label: 'Sedang Dikerjakan', value: counts.inProgress, color: 'amber', icon: Activity },
          { label: 'Selesai Bulan Ini', value: counts.completed, color: 'emerald', icon: CheckCircle2 },
          { label: 'SLA On-Time Rate', value: '93.5%', color: 'indigo', icon: Target },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <div className={`text-2xl font-black text-${color}-400 font-mono`}>{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Work Order List */}
        <div className="lg:col-span-7 space-y-4">

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Cari order, fasilitas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
              <option value="ALL">Semua Jenis</option>
              {(Object.keys(TYPE_CONFIG) as WOType[]).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
              <option value="ALL">Semua Status</option>
              {(Object.keys(STATUS_CONFIG) as WOStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </div>

          {/* Work Order Cards */}
          <div className="space-y-3">
            {filtered.map(wo => {
              const tc = TYPE_CONFIG[wo.type];
              const sc = STATUS_CONFIG[wo.status];
              const pc = PRIORITY_CONFIG[wo.priority];
              const isSelected = selectedWO?.id === wo.id;
              const isUrgent = wo.slaHoursLeft <= 6 && wo.status !== 'COMPLETED';

              return (
                <div
                  key={wo.id}
                  onClick={() => setSelectedWO(isSelected ? null : wo)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-500/5 border-blue-500/40' :
                    isUrgent ? 'bg-rose-500/3 border-rose-500/20 hover:border-rose-500/40' :
                    'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-slate-500">{wo.id}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${tc.bgColor} ${tc.color}`}>{tc.label}</span>
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${pc.bg} ${pc.color}`}>{wo.priority}</span>
                      </div>
                      <div className="text-sm font-black text-white">{wo.title}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                        <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {wo.facility} — {wo.unit}</span>
                        <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> {wo.assetName}</span>
                        <span className="flex items-center gap-1"><UserCheck className="w-3 h-3" /> {wo.assignedTechnician.split(',')[0]}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-1.5">
                      <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border ${sc.color}`}>{sc.label}</div>
                      {wo.status !== 'COMPLETED' && (
                        <div className={`text-xs font-mono font-bold flex items-center justify-end gap-1 ${wo.slaHoursLeft <= 6 ? 'text-rose-400' : wo.slaHoursLeft <= 24 ? 'text-amber-400' : 'text-slate-400'}`}>
                          <Timer className="w-3 h-3" /> {wo.slaHoursLeft}j tersisa
                        </div>
                      )}
                    </div>
                  </div>

                  {/* SLA Bar */}
                  {wo.status !== 'COMPLETED' && (
                    <div className="mt-3 space-y-1">
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${wo.slaHoursLeft <= 6 ? 'bg-rose-500' : wo.slaHoursLeft <= 24 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.max(5, Math.min(100, (wo.slaHoursLeft / 48) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="p-10 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500">
                Tidak ada work order yang sesuai filter.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Detail Panel & SLA Chart */}
        <div className="lg:col-span-5 space-y-5">

          {/* Work Order Detail */}
          {selectedWO ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-blue-500/30 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-400" /> Detail Work Order
                </h2>
                <button onClick={() => setSelectedWO(null)} className="text-xs text-slate-500 hover:text-white cursor-pointer">✕ Tutup</button>
              </div>

              {/* Lifecycle Progress */}
              <div className="space-y-2">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Lifecycle Progression</div>
                <div className="flex items-center gap-1">
                  {LIFECYCLE_STEPS.map((step, i) => {
                    const sc = STATUS_CONFIG[step];
                    const isActive = sc.step <= STATUS_CONFIG[selectedWO.status].step;
                    const isCurrent = step === selectedWO.status;
                    return (
                      <React.Fragment key={step}>
                        <div className={`flex-1 text-center`}>
                          <div className={`h-1.5 rounded-full ${isActive ? 'bg-blue-500' : 'bg-slate-800'} transition-all`} />
                          {isCurrent && <div className="text-[9px] text-blue-400 font-bold mt-1 hidden md:block">{sc.label}</div>}
                        </div>
                        {i < LIFECYCLE_STEPS.length - 1 && <div className="w-1" />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { label: 'ID Work Order', value: selectedWO.id, mono: true },
                  { label: 'Jenis Layanan', value: TYPE_CONFIG[selectedWO.type].label },
                  { label: 'Status', value: STATUS_CONFIG[selectedWO.status].label },
                  { label: 'Fasilitas', value: `${selectedWO.facility} — ${selectedWO.unit}` },
                  { label: 'Aset', value: `${selectedWO.assetName} (${selectedWO.assetId})` },
                  { label: 'Deadline SLA', value: selectedWO.slaDeadline },
                  { label: 'Teknisi', value: selectedWO.assignedTechnician },
                  { label: 'Diminta Oleh', value: selectedWO.requestedBy },
                  { label: 'Dibuat', value: selectedWO.createdAt },
                ].map(({ label, value, mono }) => (
                  <div key={label} className="flex items-start justify-between gap-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-slate-400 shrink-0">{label}</span>
                    <span className={`text-right text-slate-200 ${mono ? 'font-mono' : 'font-bold'}`}>{value}</span>
                  </div>
                ))}
              </div>

              {selectedWO.notes && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs text-slate-400">Catatan</div>
                  <div className="text-xs text-slate-300">{selectedWO.notes}</div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-800">
                <button className="flex-1 py-2.5 text-xs font-black bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button className="flex-1 py-2.5 text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Eskalasi
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-sm space-y-3">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-700" />
              <div>Klik work order untuk melihat detail dan lifecycle tracker</div>
            </div>
          )}

          {/* SLA Performance Chart */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" /> SLA On-Time vs Late (Bulan Ini)
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={slaChartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }} barSize={16} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 10, fill: '#64748b' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                      {payload.map((p: any, i: number) => <div key={i} style={{ color: p.fill }} className="font-bold">{p.name}: {p.value}</div>)}
                    </div>
                  ) : null}
                />
                <Bar dataKey="on_time" name="On-Time" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="late" name="Terlambat" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
