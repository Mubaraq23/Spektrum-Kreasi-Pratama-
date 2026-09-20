import React, { useState } from 'react';
import {
  Award, ShieldCheck, AlertTriangle, CheckCircle2, Layers,
  Search, TrendingUp, Compass, BarChart3, Filter, Globe,
  FileText, ArrowUpRight, Cpu, Zap, Target
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

type ScopeStatus = 'IN_SCOPE' | 'CONDITIONAL' | 'OUT_OF_SCOPE';

interface ScopeMatrixItem {
  id: string;
  category: string;
  parameter: string;
  range: string;
  unit: string;
  cmcValue: string;
  methodRef: string;
  status: ScopeStatus;
  usageCount: number;
  lastUsed: string;
  standard: string;
}

const SCOPE_DATA: ScopeMatrixItem[] = [
  { id: 'SC-01', category: 'Kelistrikan Medik', parameter: 'Energi Discharge Defibrillator', range: '0–360 J', unit: 'J', cmcValue: '0.15 J', methodRef: 'IK-SPK-DEF-01', status: 'IN_SCOPE', usageCount: 482, lastUsed: '18 Sep 2026', standard: 'IEC 60601-2-4' },
  { id: 'SC-02', category: 'Fisiologi Medik', parameter: 'Heart Rate (Detak Jantung)', range: '30–240 BPM', unit: 'BPM', cmcValue: '0.45 BPM', methodRef: 'IK-SPK-MON-01', status: 'IN_SCOPE', usageCount: 890, lastUsed: '20 Sep 2026', standard: 'IEC 60601-2-27' },
  { id: 'SC-03', category: 'Fisiologi Medik', parameter: 'SpO₂ (Saturasi Oksigen)', range: '70–100 %', unit: '%', cmcValue: '0.5 %', methodRef: 'IK-SPK-MON-02', status: 'IN_SCOPE', usageCount: 645, lastUsed: '19 Sep 2026', standard: 'ISO 9919' },
  { id: 'SC-04', category: 'Fisiologi Medik', parameter: 'NIBP (Tekanan Darah Non-Invasif)', range: '0–300 mmHg', unit: 'mmHg', cmcValue: '1.5 mmHg', methodRef: 'IK-SPK-MON-03', status: 'IN_SCOPE', usageCount: 510, lastUsed: '20 Sep 2026', standard: 'IEC 60601-2-30' },
  { id: 'SC-05', category: 'Fisiologi Medik', parameter: 'Flow Rate Infusion Pump', range: '1–999 mL/h', unit: 'mL/h', cmcValue: '0.5 mL/h', methodRef: 'IK-SPK-INF-01', status: 'IN_SCOPE', usageCount: 740, lastUsed: '18 Sep 2026', standard: 'IEC 60601-2-24' },
  { id: 'SC-06', category: 'Ventilasi Medik', parameter: 'Tidal Volume Ventilator', range: '50–2000 mL', unit: 'mL', cmcValue: '3 mL', methodRef: 'IK-SPK-VENT-01', status: 'IN_SCOPE', usageCount: 320, lastUsed: '15 Sep 2026', standard: 'ISO 10651' },
  { id: 'SC-07', category: 'Radiologi Diagnostik', parameter: 'Tegangan Tabung X-Ray (kVp)', range: '40–150 kVp', unit: 'kVp', cmcValue: '0.35 kVp', methodRef: 'IK-SPK-RAD-01', status: 'IN_SCOPE', usageCount: 312, lastUsed: '17 Sep 2026', standard: 'PERKA BAPETEN 8/2011' },
  { id: 'SC-08', category: 'Radiologi Diagnostik', parameter: 'Keluaran Radiasi (Air Kerma)', range: '0.1–500 mGy', unit: 'mGy', cmcValue: '0.5%', methodRef: 'IK-SPK-RAD-02', status: 'IN_SCOPE', usageCount: 290, lastUsed: '17 Sep 2026', standard: 'PERKA BAPETEN 8/2011' },
  { id: 'SC-09', category: 'Keselamatan Listrik', parameter: 'Arus Bocor (Earth Leakage)', range: '0–10 mA', unit: 'mA', cmcValue: '0.1 µA', methodRef: 'IK-SPK-SAF-01', status: 'IN_SCOPE', usageCount: 1250, lastUsed: '20 Sep 2026', standard: 'IEC 62353' },
  { id: 'SC-10', category: 'Fisika Medis', parameter: 'Intensitas Sinar Laser Medis', range: '1–100 mW', unit: 'mW', cmcValue: '0.05 mW', methodRef: 'IK-SPK-LAS-01', status: 'OUT_OF_SCOPE', usageCount: 5, lastUsed: '01 Jun 2026', standard: 'IEC 60825' },
  { id: 'SC-11', category: 'Radiologi Terapeutik', parameter: 'Dosis Terapi Radioterapi Linear', range: '1–100 Gy', unit: 'Gy', cmcValue: '1%', methodRef: 'IK-SPK-THR-01', status: 'CONDITIONAL', usageCount: 12, lastUsed: '10 Agu 2026', standard: 'IAEA TRS 398' },
  { id: 'SC-12', category: 'Kelistrikan Medik', parameter: 'Output Energi Surgical Diathermy', range: '0–300 W', unit: 'W', cmcValue: '0.5 W', methodRef: 'IK-SPK-ESU-01', status: 'IN_SCOPE', usageCount: 185, lastUsed: '14 Sep 2026', standard: 'IEC 60601-2-2' },
];

const STATUS_CONFIG: Record<ScopeStatus, { label: string; color: string; bg: string }> = {
  IN_SCOPE: { label: 'IN SCOPE', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  CONDITIONAL: { label: 'CONDITIONAL', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  OUT_OF_SCOPE: { label: 'OUT OF SCOPE', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
};

const usageChartData = SCOPE_DATA
  .filter(s => s.status !== 'OUT_OF_SCOPE')
  .sort((a, b) => b.usageCount - a.usageCount)
  .slice(0, 8)
  .map(s => ({ label: s.parameter.split(' ').slice(0, 2).join(' '), usage: s.usageCount, color: s.status === 'IN_SCOPE' ? '#10b981' : '#f59e0b' }));

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function ScopeCommandCenter() {
  const [filterStatus, setFilterStatus] = useState<ScopeStatus | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['ALL', ...Array.from(new Set(SCOPE_DATA.map(s => s.category)))];

  const filtered = SCOPE_DATA.filter(s => {
    if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
    if (filterCategory !== 'ALL' && s.category !== filterCategory) return false;
    if (searchQuery && !s.parameter.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const inScopeCount = SCOPE_DATA.filter(s => s.status === 'IN_SCOPE').length;
  const conditionalCount = SCOPE_DATA.filter(s => s.status === 'CONDITIONAL').length;
  const outOfScopeCount = SCOPE_DATA.filter(s => s.status === 'OUT_OF_SCOPE').length;
  const totalUsage = SCOPE_DATA.reduce((a, b) => a + b.usageCount, 0);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-amber-950/50 to-slate-950 border border-amber-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest">
              <Award className="w-4 h-4" /> KAN Scope Matrix Command Center — ISO/IEC 17025:2017
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Pusat Kendali Lingkup{' '}
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                Akreditasi KAN &amp; CMC
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Matriks pemantauan lingkup terakreditasi KAN (LK-210-IDN), validasi Kemampuan Ukur Terkecil (CMC), referensi standar internasional, dan heatmap intensitas penggunaan lingkup kalibrasi.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Parameter Terakreditasi', value: `${inScopeCount + conditionalCount}`, color: 'amber', icon: Award },
          { label: 'In Scope — Aktif', value: `${inScopeCount}`, color: 'emerald', icon: CheckCircle2 },
          { label: 'Conditional', value: `${conditionalCount}`, color: 'amber', icon: AlertTriangle },
          { label: 'Total Pengujian YTD', value: totalUsage.toLocaleString(), color: 'cyan', icon: BarChart3 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <div className={`text-2xl font-black font-mono text-${color}-400`}>{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── USAGE HEATMAP CHART ───────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" /> Intensitas Penggunaan Lingkup Kalibrasi (YTD)
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={usageChartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis dataKey="label" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} angle={-15} textAnchor="end" />
            <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} />
            <Tooltip
              content={({ active, payload }) => active && payload?.length ? (
                <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                  <div className="text-amber-400 font-bold">{payload[0]?.value} pengujian</div>
                </div>
              ) : null}
            />
            <Bar dataKey="usage" name="Pengujian" radius={[4, 4, 0, 0]}>
              {usageChartData.map((entry, index) => (
                <Cell key={index} fill={entry.color} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ─── SCOPE MATRIX ──────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari parameter..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
            {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kategori' : c}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
            <option value="ALL">Semua Status</option>
            {(Object.keys(STATUS_CONFIG) as ScopeStatus[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="p-1 rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  <th className="p-3">ID</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Parameter Terakreditasi</th>
                  <th className="p-3">Rentang Ukur</th>
                  <th className="p-3">CMC Terkecil</th>
                  <th className="p-3">Referensi</th>
                  <th className="p-3">Penggunaan YTD</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filtered.map(sc => {
                  const cfg = STATUS_CONFIG[sc.status];
                  return (
                    <tr key={sc.id} className="hover:bg-slate-800/40 transition-all group">
                      <td className="p-3 font-bold text-amber-400">{sc.id}</td>
                      <td className="p-3 text-slate-400 text-[10px]">{sc.category}</td>
                      <td className="p-3 font-bold text-white">{sc.parameter}</td>
                      <td className="p-3 text-cyan-400">{sc.range}</td>
                      <td className="p-3 font-bold text-emerald-400">{sc.cmcValue}</td>
                      <td className="p-3 text-slate-400">
                        <div>{sc.methodRef}</div>
                        <div className="text-[9px] text-slate-500">{sc.standard}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.min(100, (sc.usageCount / 1250) * 100)}%` }} />
                          </div>
                          <span className="text-amber-400 font-bold">{sc.usageCount}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-right">
            Menampilkan {filtered.length} dari {SCOPE_DATA.length} parameter
          </div>
        </div>
      </div>
    </div>
  );
}
