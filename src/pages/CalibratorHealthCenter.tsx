import React, { useState } from 'react';
import {
  Zap, ShieldCheck, AlertTriangle, CheckCircle2, Lock, GitCommit,
  Activity, ChevronRight, Calendar, Clock, Award, Cpu,
  TrendingUp, TrendingDown, Minus, RefreshCw, Eye, Bell,
  AlertOctagon, Globe, FileText, BarChart2
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, AreaChart, Area
} from 'recharts';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

type CalStatus = 'ACTIVE' | 'DUE_SOON' | 'QUARANTINED_EXPIRED' | 'OOT';

interface Calibrator {
  id: string;
  name: string;
  serialNumber: string;
  manufacturer: string;
  certificateNo: string;
  calibratedDate: string;
  dueDate: string;
  daysUntilDue: number;
  status: CalStatus;
  uncertaintyU95: string;
  traceabilityOrg: string;
  healthScore: number;
  driftHistory: { month: string; drift: number }[];
  usageCount: number;
  lastUsedDate: string;
  scope: string;
}

const CALIBRATORS: Calibrator[] = [
  {
    id: 'CAL-DEF-001', name: 'Fluke Impulse 7000DP', manufacturer: 'Fluke Biomedical',
    serialNumber: 'FLK-991428', certificateNo: 'SNSU-BSN/2025/11-094',
    calibratedDate: '10 Nov 2025', dueDate: '10 Nov 2026', daysUntilDue: 51,
    status: 'ACTIVE', uncertaintyU95: '± 0.05 Joule', traceabilityOrg: 'SNSU-BSN / BIPM',
    healthScore: 94, usageCount: 48, lastUsedDate: '18 Sep 2026',
    scope: 'Kalibrasi Defibrillator (Energi Discharge: 0–400J)',
    driftHistory: [
      { month: 'Mar', drift: 0.02 }, { month: 'Apr', drift: 0.03 }, { month: 'Mei', drift: 0.02 },
      { month: 'Jun', drift: 0.04 }, { month: 'Jul', drift: 0.03 }, { month: 'Agu', drift: 0.04 }, { month: 'Sep', drift: 0.05 }
    ]
  },
  {
    id: 'CAL-PUMP-002', name: 'Rigel Uni-Therm 400', manufacturer: 'Rigel Medical',
    serialNumber: 'RGL-UNT-2241', certificateNo: 'KAN/LAB-023/2025/08-044',
    calibratedDate: '05 Agu 2025', dueDate: '05 Agu 2026', daysUntilDue: -46,
    status: 'QUARANTINED_EXPIRED', uncertaintyU95: '± 0.05 mL/h', traceabilityOrg: 'Laboratorium KAN Terakreditasi',
    healthScore: 15, usageCount: 35, lastUsedDate: '01 Agu 2026',
    scope: 'Kalibrasi Infusion & Syringe Pump (Flow Rate)',
    driftHistory: [
      { month: 'Mar', drift: 0.05 }, { month: 'Apr', drift: 0.07 }, { month: 'Mei', drift: 0.06 },
      { month: 'Jun', drift: 0.09 }, { month: 'Jul', drift: 0.11 }, { month: 'Agu', drift: 0.14 }, { month: 'Sep', drift: null as any }
    ]
  },
  {
    id: 'CAL-RAD-003', name: 'RTI Black Piranha (X-Ray Multi-Meter)', manufacturer: 'RTI Group',
    serialNumber: 'RTI-CB2-1402', certificateNo: 'PTB-GERMANY/2024/09-112',
    calibratedDate: '05 Sep 2024', dueDate: '05 Sep 2026', daysUntilDue: 16 - 30,
    status: 'DUE_SOON', uncertaintyU95: '± 0.15 kVp', traceabilityOrg: 'PTB Germany / BIPM',
    healthScore: 62, usageCount: 28, lastUsedDate: '10 Sep 2026',
    scope: 'Ukes Radiologi — kVp, HVL, dosis, waktu paparan',
    driftHistory: [
      { month: 'Mar', drift: 0.10 }, { month: 'Apr', drift: 0.12 }, { month: 'Mei', drift: 0.11 },
      { month: 'Jun', drift: 0.13 }, { month: 'Jul', drift: 0.14 }, { month: 'Agu', drift: 0.14 }, { month: 'Sep', drift: 0.15 }
    ]
  },
  {
    id: 'CAL-SAFE-004', name: 'Rigel 288 Safety Analyzer', manufacturer: 'Rigel Medical',
    serialNumber: 'RGL-288-0042', certificateNo: 'SNSU-BSN/2026/02-018',
    calibratedDate: '10 Feb 2026', dueDate: '10 Feb 2027', daysUntilDue: 143,
    status: 'ACTIVE', uncertaintyU95: '± 0.5 µA', traceabilityOrg: 'SNSU-BSN / BIPM',
    healthScore: 88, usageCount: 22, lastUsedDate: '15 Sep 2026',
    scope: 'Kalibrasi & Pengujian Keselamatan Listrik Medis (IEC 62353)',
    driftHistory: [
      { month: 'Mar', drift: 0.12 }, { month: 'Apr', drift: 0.11 }, { month: 'Mei', drift: 0.12 },
      { month: 'Jun', drift: 0.13 }, { month: 'Jul', drift: 0.12 }, { month: 'Agu', drift: 0.13 }, { month: 'Sep', drift: 0.14 }
    ]
  },
  {
    id: 'CAL-RAD-005', name: 'Gammex 1290 (Mammography Phantom)', manufacturer: 'Gammex Inc.',
    serialNumber: 'GMX-1290-7812', certificateNo: 'BAPETEN-ACC/2026/04-007',
    calibratedDate: '10 Apr 2026', dueDate: '10 Apr 2027', daysUntilDue: 202,
    status: 'ACTIVE', uncertaintyU95: 'Phantom Referensi', traceabilityOrg: 'BAPETEN / SNSU-BSN',
    healthScore: 97, usageCount: 12, lastUsedDate: '15 Sep 2026',
    scope: 'Ukes Radiologi — Mammografi (ACR Phantom & HVL)',
    driftHistory: [
      { month: 'Mar', drift: 0.01 }, { month: 'Apr', drift: 0.01 }, { month: 'Mei', drift: 0.01 },
      { month: 'Jun', drift: 0.01 }, { month: 'Jul', drift: 0.02 }, { month: 'Agu', drift: 0.01 }, { month: 'Sep', drift: 0.01 }
    ]
  },
];

const STATUS_CONFIG: Record<CalStatus, { label: string; color: string; bg: string; icon: any; textColor: string }> = {
  ACTIVE: { label: 'ACTIVE — VALID', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/40', icon: CheckCircle2, textColor: 'emerald' },
  DUE_SOON: { label: 'DUE SOON — < 30 Hari', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40', icon: AlertTriangle, textColor: 'amber' },
  QUARANTINED_EXPIRED: { label: 'KARANTINA — KADALUARSA', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40', icon: Lock, textColor: 'rose' },
  OOT: { label: 'OUT-OF-TOLERANCE', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40', icon: AlertOctagon, textColor: 'rose' },
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function CalibratorHealthCenter() {
  const [selectedId, setSelectedId] = useState<string>('CAL-DEF-001');
  const selected = CALIBRATORS.find(c => c.id === selectedId)!;

  const getHealthColor = (h: number) => h >= 80 ? '#10b981' : h >= 50 ? '#f59e0b' : '#f43f5e';

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-amber-950/50 to-slate-950 border border-amber-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest">
              <Zap className="w-4 h-4" /> Calibrator Health Center & Metrological Traceability Monitor
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Pusat Kesehatan Standar &amp;{' '}
              <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent">
                Pohon Ketertelusuran SI
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Pemantauan real-time masa berlaku sertifikat standar ukur, health score, deteksi drift stabilitas, rantai hirarki ketertelusuran ke BIPM/SNSU-BSN, dan otomatisasi status Karantina.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── KPI SUMMARY ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Standar Ukur', value: CALIBRATORS.length, color: 'amber', icon: Cpu },
          { label: 'Status Aktif', value: CALIBRATORS.filter(c => c.status === 'ACTIVE').length, color: 'emerald', icon: CheckCircle2 },
          { label: 'Jatuh Tempo ≤30 Hari', value: CALIBRATORS.filter(c => c.status === 'DUE_SOON').length, color: 'amber', icon: AlertTriangle },
          { label: 'Karantina / Expired', value: CALIBRATORS.filter(c => c.status === 'QUARANTINED_EXPIRED' || c.status === 'OOT').length, color: 'rose', icon: Lock },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <div className={`text-2xl font-black font-mono text-${color}-400`}>{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── TRACEABILITY HIERARCHY ────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-amber-400" /> Rantai Hirarki Ketertelusuran Internasional (SI Traceability Chain)
        </h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: 'BIPM', sub: 'Satuan SI Internasional', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
            { label: 'PTB / NIST', sub: 'Lab Metrologi Nasional Asing', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30' },
            { label: 'SNSU-BSN', sub: 'Standar Nasional Indonesia', color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30' },
            { label: 'BAPETEN', sub: 'Lab Dosimetri Radiasi', color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30' },
            { label: 'LPAK Terakreditasi KAN', sub: 'Lab Penguji Alat Kesehatan', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
            { label: 'Standar Kerja Spektrum', sub: 'Working Standard Lab', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40 font-black' },
            { label: 'Alat Kesehatan RS', sub: 'Unit Pelayanan Klinis', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
          ].map((node, i, arr) => (
            <React.Fragment key={node.label}>
              <div className={`flex-shrink-0 p-3 rounded-xl border text-center min-w-[110px] ${node.bg}`}>
                <div className={`text-xs font-black ${node.color}`}>{node.label}</div>
                <div className="text-[9px] text-slate-500 mt-0.5">{node.sub}</div>
              </div>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ─── CALIBRATOR DETAIL ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Calibrator List */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-black text-white">Standar Ukur Lab ({CALIBRATORS.length} unit)</h2>
          {CALIBRATORS.map(cal => {
            const cfg = STATUS_CONFIG[cal.status];
            const Icon = cfg.icon;
            const isSelected = selectedId === cal.id;
            const hColor = getHealthColor(cal.healthScore);

            return (
              <div
                key={cal.id}
                onClick={() => setSelectedId(cal.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected ? `bg-amber-500/5 ${cfg.bg}` : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400">{cal.id}</span>
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${cfg.bg} ${cfg.color}`}>
                    <Icon className="w-3 h-3" /> {cal.status === 'ACTIVE' ? 'AKTIF' : cal.status === 'DUE_SOON' ? 'DUE SOON' : 'KARANTINA'}
                  </div>
                </div>
                <div className="text-sm font-black text-white leading-tight">{cal.name}</div>
                <div className="text-xs text-slate-400 mt-1">{cal.manufacturer} • SN: {cal.serialNumber}</div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-slate-400">Health Score</span>
                    <span style={{ color: hColor }} className="font-bold">{cal.healthScore}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${cal.healthScore}%`, background: hColor }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] font-mono text-slate-500">
                  <Calendar className="w-3 h-3" />
                  <span>Due: {cal.dueDate}</span>
                  {cal.daysUntilDue > 0
                    ? <span className={cal.daysUntilDue <= 30 ? 'text-amber-400 font-bold' : 'text-slate-400'}>({cal.daysUntilDue} hari lagi)</span>
                    : <span className="text-rose-400 font-bold">(KADALUARSA {Math.abs(cal.daysUntilDue)} hari lalu)</span>
                  }
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Selected Calibrator Detail + Drift Chart */}
        <div className="lg:col-span-8 space-y-5">
          {(() => {
            const cal = selected;
            const cfg = STATUS_CONFIG[cal.status];
            const Icon = cfg.icon;
            const hColor = getHealthColor(cal.healthScore);
            const driftData = cal.driftHistory.filter(d => d.drift != null);
            const maxDrift = Math.max(...driftData.map(d => d.drift));
            const mpeThreshold = 0.15; // example threshold

            return (
              <>
                {/* Header Card */}
                <div className={`p-6 rounded-3xl border ${cfg.bg} space-y-4`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className={`flex items-center gap-2 text-xs font-black ${cfg.color}`}>
                        <Icon className="w-4 h-4" /> {cfg.label}
                      </div>
                      <div className="text-2xl font-black text-white">{cal.name}</div>
                      <div className="text-xs text-slate-400">{cal.manufacturer} | SN: {cal.serialNumber}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-4xl font-black font-mono" style={{ color: hColor }}>{cal.healthScore}</div>
                      <div className="text-xs text-slate-400">Health Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs font-mono">
                    {[
                      { label: 'No. Sertifikat', value: cal.certificateNo },
                      { label: 'Tanggal Kalibrasi', value: cal.calibratedDate },
                      { label: 'Jatuh Tempo', value: cal.dueDate },
                      { label: 'U₉₅ Ketidakpastian', value: cal.uncertaintyU95 },
                      { label: 'Ketertelusuran', value: cal.traceabilityOrg },
                      { label: 'Pemakaian YTD', value: `${cal.usageCount} kali penggunaan` },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="text-[10px] text-slate-400">{label}</div>
                        <div className="text-slate-100 font-bold mt-0.5 truncate">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
                    <div className="text-slate-400 text-[10px] mb-0.5">Lingkup Penggunaan</div>
                    <div className="text-slate-200">{cal.scope}</div>
                  </div>
                </div>

                {/* Drift Chart */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-amber-400" /> Tren Drift Stabilitas Bulanan
                  </h2>
                  <div className="text-xs text-slate-400 font-mono">
                    Pemantauan pergeseran nilai terukur vs. nilai sertifikat — threshold: ±{mpeThreshold}
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={driftData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                      <defs>
                        <linearGradient id="driftGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={hColor} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={hColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <YAxis stroke="#475569" tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        content={({ active, payload }) => active && payload?.length ? (
                          <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                            <div style={{ color: hColor }} className="font-bold">Drift: {payload[0]?.value}</div>
                          </div>
                        ) : null}
                      />
                      <ReferenceLine y={mpeThreshold} stroke="#f43f5e" strokeDasharray="4 2" label={{ value: 'MPE', position: 'right', fill: '#f43f5e', fontSize: 9 }} />
                      <Area type="monotone" dataKey="drift" stroke={hColor} fill="url(#driftGrad)" strokeWidth={2.5} dot={{ r: 4, fill: hColor }} />
                    </AreaChart>
                  </ResponsiveContainer>

                  {maxDrift > mpeThreshold * 0.8 && (
                    <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/30 text-xs text-amber-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Drift mendekati atau melebihi threshold — pertimbangkan rekalibrasi lebih awal untuk memastikan ketertelusuran.</span>
                    </div>
                  )}
                </div>

                {/* Alerts */}
                {cal.status !== 'ACTIVE' && (
                  <div className={`p-5 rounded-3xl border ${cfg.bg} space-y-3`}>
                    <div className={`flex items-center gap-2 font-black text-sm ${cfg.color}`}>
                      <Icon className="w-5 h-5" /> Tindakan yang Diperlukan
                    </div>
                    {cal.status === 'QUARANTINED_EXPIRED' && (
                      <>
                        <div className="text-sm text-slate-300">
                          🔒 Standar ukur ini telah <strong className="text-rose-400">kadaluarsa</strong> dan wajib <strong>dikarantina</strong>. Tidak boleh digunakan untuk kegiatan kalibrasi hingga rekalibrasi selesai.
                        </div>
                        <div className="space-y-2 text-xs">
                          {['Ajukan permintaan rekalibrasi ke lab KAN terakreditasi', 'Tandai fisik alat dengan label QUARANTINE (merah)', 'Update status karantina di sistem inventaris'].map(a => (
                            <div key={a} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-rose-400 rounded-full mt-1.5 shrink-0" />
                              <span className="text-slate-300">{a}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {cal.status === 'DUE_SOON' && (
                      <div className="text-sm text-slate-300">
                        ⚠️ Sertifikat akan jatuh tempo dalam <strong className="text-amber-400">{cal.daysUntilDue} hari</strong>. Segera jadwalkan rekalibrasi untuk mencegah gangguan operasional.
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
