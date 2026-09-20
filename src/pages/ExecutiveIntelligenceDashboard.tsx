import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PolarRadiusAxis
} from 'recharts';
import {
  BarChart3, TrendingUp, DollarSign, ShieldCheck, Activity, Zap, Compass,
  ChevronRight, Award, Target, Clock, Users, FileCheck, AlertTriangle,
  Layers, ArrowUpRight, ArrowDownRight, Minus, RefreshCw, Calendar,
  Cpu, Globe, CheckCircle2, TrendingDown, BookOpen, Wrench
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── DATA ─────────────────────────────────────────────────────────────────────

const monthlyRevenue = [
  { month: 'Mar', kalibrasi: 48, ukes: 22, ipm: 15, repair: 8 },
  { month: 'Apr', kalibrasi: 55, ukes: 27, ipm: 18, repair: 10 },
  { month: 'Mei', kalibrasi: 52, ukes: 31, ipm: 14, repair: 12 },
  { month: 'Jun', kalibrasi: 67, ukes: 35, ipm: 20, repair: 9 },
  { month: 'Jul', kalibrasi: 73, ukes: 40, ipm: 22, repair: 14 },
  { month: 'Agu', kalibrasi: 82, ukes: 44, ipm: 25, repair: 11 },
  { month: 'Sep', kalibrasi: 78, ukes: 48, ipm: 28, repair: 16 },
];

const slaData = [
  { month: 'Mar', sla: 96.2, target: 98 },
  { month: 'Apr', sla: 97.1, target: 98 },
  { month: 'Mei', sla: 95.8, target: 98 },
  { month: 'Jun', sla: 98.3, target: 98 },
  { month: 'Jul', sla: 97.9, target: 98 },
  { month: 'Agu', sla: 98.4, target: 98 },
  { month: 'Sep', sla: 98.7, target: 98 },
];

const competencyRadar = [
  { subject: 'Kalibrasi Biomedis', A: 92, fullMark: 100 },
  { subject: 'Ukes Radiologi', A: 85, fullMark: 100 },
  { subject: 'Safety IEC 62353', A: 88, fullMark: 100 },
  { subject: 'ISO 17025 QMS', A: 95, fullMark: 100 },
  { subject: 'Repair Teknis', A: 78, fullMark: 100 },
  { subject: 'Customer SLA', A: 98, fullMark: 100 },
];

const serviceDistribution = [
  { name: 'Kalibrasi', value: 48, color: '#06b6d4' },
  { name: 'Ukes Radiologi', value: 24, color: '#8b5cf6' },
  { name: 'IPM', value: 18, color: '#10b981' },
  { name: 'Repair', value: 10, color: '#f59e0b' },
];

const passFail = [
  { month: 'Mar', pass: 94, fail: 6 },
  { month: 'Apr', pass: 96, fail: 4 },
  { month: 'Mei', pass: 93, fail: 7 },
  { month: 'Jun', pass: 97, fail: 3 },
  { month: 'Jul', pass: 95, fail: 5 },
  { month: 'Agu', pass: 96, fail: 4 },
  { month: 'Sep', pass: 98, fail: 2 },
];

const assetHealth = [
  { name: 'Fluke 7000DP', health: 94, last: '12 Agu 2026', next: '12 Agu 2027', status: 'VALID' },
  { name: 'Rigel Uni-Therm', health: 81, last: '05 Jul 2026', next: '05 Jul 2027', status: 'VALID' },
  { name: 'Gammex 1290', health: 67, last: '18 Jun 2026', next: '18 Jun 2027', status: 'VALID' },
  { name: 'Radcal 2026', health: 52, last: '01 Mar 2026', next: '01 Mar 2027', status: 'WARNING' },
  { name: 'Barracuda 5000', health: 38, last: '15 Jan 2026', next: '15 Jan 2027', status: 'CRITICAL' },
];

const topClients = [
  { name: 'RSUD Dr. Soetomo', orders: 48, revenue: 142, trend: 'up' },
  { name: 'RS Siloam Surabaya', orders: 35, revenue: 98, trend: 'up' },
  { name: 'RS Premier Surabaya', orders: 28, revenue: 85, trend: 'stable' },
  { name: 'RSUP Dr. Kariadi', orders: 22, revenue: 64, trend: 'down' },
  { name: 'RSIA Kendangsari', orders: 19, revenue: 52, trend: 'up' },
];

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const KpiCard = ({
  icon: Icon, label, value, unit, sub, trend, color
}: {
  icon: any; label: string; value: string; unit?: string;
  sub: string; trend?: 'up' | 'down' | 'stable'; color: string;
}) => {
  const TrendIcon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-slate-400';

  return (
    <div className={`p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 hover:border-${color}-500/40 transition-all group`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
          <Icon className={`w-5 h-5 text-${color}-400`} />
        </div>
        {trend && (
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
        )}
      </div>
      <div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-3xl font-black text-white font-mono">
          {value}<span className="text-lg text-slate-400 font-normal ml-1">{unit}</span>
        </div>
        <div className="text-xs text-slate-400 mt-1">{sub}</div>
      </div>
    </div>
  );
};

const SectionTitle = ({ icon: Icon, title, sub, color }: { icon: any; title: string; sub: string; color: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`p-2 rounded-xl bg-${color}-500/10 border border-${color}-500/20`}>
      <Icon className={`w-5 h-5 text-${color}-400`} />
    </div>
    <div>
      <h2 className="text-base font-black text-white">{title}</h2>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono shadow-xl">
        <div className="text-slate-400 mb-2 font-bold">{label}</div>
        {payload.map((entry: any, i: number) => (
          <div key={i} style={{ color: entry.color }} className="flex justify-between gap-4">
            <span>{entry.name}</span>
            <span className="font-bold">{entry.value}{entry.unit || ''}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

type DimensionKey = 'operational' | 'metrological' | 'financial' | 'quality' | 'asset';

const DIMENSIONS: { key: DimensionKey; label: string; color: string; icon: any }[] = [
  { key: 'operational', label: 'Operational', color: 'cyan', icon: Activity },
  { key: 'metrological', label: 'Metrological', color: 'amber', icon: Zap },
  { key: 'financial', label: 'Financial', color: 'emerald', icon: DollarSign },
  { key: 'quality', label: 'Quality', color: 'purple', icon: ShieldCheck },
  { key: 'asset', label: 'Asset', color: 'rose', icon: Cpu },
];

export function ExecutiveIntelligenceDashboard() {
  const [activeDimension, setActiveDimension] = useState<DimensionKey>('operational');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('90d');

  const totalRevenue = monthlyRevenue.reduce((acc, m) => acc + m.kalibrasi + m.ukes + m.ipm + m.repair, 0);
  const avgSla = (slaData.reduce((a, b) => a + b.sla, 0) / slaData.length).toFixed(1);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO BANNER ─────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950/60 to-slate-950 border border-emerald-500/20 p-8 md:p-10 shadow-2xl">
          {/* Decorative orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full translate-y-1/2 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
                <BarChart3 className="w-4 h-4" /> Executive Intelligence & Management Decision System
              </div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Dashboard Kecerdasan{' '}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Eksekutif 5D Enterprise
                </span>
              </h1>
              <p className="text-slate-400 max-w-2xl text-sm leading-relaxed">
                Analisis performa 5 dimensi terpadu: Operational, Metrological, Financial, Quality &amp; Asset Intelligence untuk pengambilan keputusan direksi berbasis data real-time.
              </p>
            </div>

            {/* Period Selector */}
            <div className="flex gap-2 shrink-0">
              {(['7d', '30d', '90d', '1y'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    period === p
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* ─── 5-DIMENSION SELECTOR ────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {DIMENSIONS.map(({ key, label, color, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveDimension(key)}
            className={`p-4 rounded-2xl border text-center transition-all cursor-pointer ${
              activeDimension === key
                ? `bg-${color}-500/20 border-${color}-500/50 text-${color}-300`
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
            }`}
          >
            <Icon className={`w-5 h-5 mx-auto mb-2 ${activeDimension === key ? `text-${color}-400` : ''}`} />
            <div className="text-xs font-black uppercase tracking-wider">{label}</div>
          </button>
        ))}
      </div>

      {/* ─── TOP KPI CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={Activity} label="SLA Terpenuhi" value={`${avgSla}%`} sub="Turnaround avg. 1.8 hari" trend="up" color="cyan" />
        <KpiCard icon={CheckCircle2} label="Pass Ratio" value="96.2%" sub="Pass metrologi keseluruhan" trend="up" color="emerald" />
        <KpiCard icon={DollarSign} label="Revenue 7 Bln" value={`${totalRevenue}jt`} unit="IDR" sub="Target: 600jt | Tercapai" trend="up" color="amber" />
        <KpiCard icon={ShieldCheck} label="Open NC" value="0" sub="Zero NC open ISO 17025" trend="up" color="purple" />
        <KpiCard icon={Users} label="Klien Aktif" value="47" sub="RS & Klinik mitra aktif" trend="stable" color="indigo" />
        <KpiCard icon={Cpu} label="Kalibrator Sehat" value="3/5" sub="2 unit butuh perhatian" trend="down" color="rose" />
      </div>

      {/* ─── MAIN CHARTS GRID ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Revenue Trend */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <SectionTitle icon={DollarSign} title="Tren Pendapatan per Layanan (7 Bulan)" sub="Kalibrasi, Ukes, IPM & Repair dalam juta IDR" color="emerald" />
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={monthlyRevenue} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <defs>
                <linearGradient id="gKal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gUkes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gIpm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Area type="monotone" dataKey="kalibrasi" name="Kalibrasi" stroke="#06b6d4" fill="url(#gKal)" strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} />
              <Area type="monotone" dataKey="ukes" name="Ukes Rad." stroke="#8b5cf6" fill="url(#gUkes)" strokeWidth={2} dot={{ r: 3, fill: '#8b5cf6' }} />
              <Area type="monotone" dataKey="ipm" name="IPM" stroke="#10b981" fill="url(#gIpm)" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              <Area type="monotone" dataKey="repair" name="Repair" stroke="#f59e0b" fill="none" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: '#f59e0b' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Service Mix Donut */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <SectionTitle icon={Layers} title="Komposisi Layanan" sub="Distribusi % per jenis layanan" color="purple" />
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={serviceDistribution}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {serviceDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                    <span style={{ color: payload[0].payload.color }}>{payload[0].name}: </span>
                    <span className="text-white font-bold">{payload[0].value}%</span>
                  </div>
                ) : null}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {serviceDistribution.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-300">{s.name}</span>
                </div>
                <span className="font-bold font-mono" style={{ color: s.color }}>{s.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── METROLOGICAL CHARTS ROW ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SLA Trend */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <SectionTitle icon={Target} title="Tren SLA vs Target" sub="Persentase SLA bulanan vs target 98%" color="cyan" />
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={slaData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis domain={[93, 100]} stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="sla" name="SLA Aktual" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 4, fill: '#06b6d4' }} />
              <Line type="monotone" dataKey="target" name="Target 98%" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pass/Fail Bar */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <SectionTitle icon={CheckCircle2} title="Rasio Pass / Fail Metrologi" sub="Persentase per bulan — target &gt;95% PASS" color="emerald" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={passFail} margin={{ top: 5, right: 10, bottom: 5, left: -20 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis stroke="#475569" tick={{ fontSize: 11, fill: '#64748b' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pass" name="Pass %" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fail" name="Fail %" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── COMPETENCY RADAR + TOP CLIENTS ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Radar Chart */}
        <div className="lg:col-span-2 p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <SectionTitle icon={Compass} title="Radar Kompetensi Lab" sub="Skor kompetensi per area layanan (0–100)" color="amber" />
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={competencyRadar}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9, fill: '#64748b' }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569' }} />
              <Radar name="Kompetensi" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} />
              <Tooltip
                content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                    <span className="text-amber-400 font-bold">{payload[0]?.payload?.subject}: </span>
                    <span className="text-white">{payload[0]?.value}</span>
                  </div>
                ) : null}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Clients */}
        <div className="lg:col-span-3 p-6 rounded-3xl bg-slate-900 border border-slate-800">
          <SectionTitle icon={Users} title="Top 5 Klien per Revenue" sub="Rumah sakit & klinik dengan kontribusi tertinggi" color="indigo" />
          <div className="space-y-3">
            {topClients.map((client, idx) => {
              const TI = client.trend === 'up' ? ArrowUpRight : client.trend === 'down' ? ArrowDownRight : Minus;
              const tc = client.trend === 'up' ? 'text-emerald-400' : client.trend === 'down' ? 'text-rose-400' : 'text-slate-400';
              return (
                <div key={idx} className="flex items-center gap-4 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-black text-indigo-400 shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{client.name}</div>
                    <div className="text-xs text-slate-500">{client.orders} order selesai</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-emerald-400 font-mono">Rp {client.revenue}jt</div>
                    <div className={`text-xs flex items-center justify-end gap-1 ${tc}`}>
                      <TI className="w-3 h-3" /> {client.trend}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── ASSET HEALTH TABLE ──────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
        <SectionTitle icon={Cpu} title="Kalibrator Health Monitor — Asset Intelligence" sub="Kondisi kesehatan aset standar ukur utama" color="rose" />
        <div className="space-y-3">
          {assetHealth.map((asset, idx) => {
            const barColor = asset.health >= 80 ? '#10b981' : asset.health >= 50 ? '#f59e0b' : '#f43f5e';
            const statusColor = asset.status === 'VALID' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
              : asset.status === 'WARNING' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              : 'text-rose-400 bg-rose-500/10 border-rose-500/30';
            return (
              <div key={idx} className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                <div className="w-28 shrink-0">
                  <div className="text-xs font-bold text-white truncate">{asset.name}</div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs font-mono mb-1">
                    <span className="text-slate-400">Health Score</span>
                    <span style={{ color: barColor }} className="font-bold">{asset.health}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${asset.health}%`, background: barColor }}
                    />
                  </div>
                </div>
                <div className="shrink-0 text-xs text-slate-400 hidden lg:block">
                  <div>Terakhir: <span className="text-slate-300">{asset.last}</span></div>
                  <div>Berikut: <span className="text-slate-300">{asset.next}</span></div>
                </div>
                <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black border shrink-0 ${statusColor}`}>
                  {asset.status}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── QUALITY INTEL FOOTER ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: 'Dokumen IK Aktif', value: '24 Dokumen', sub: 'Semua dalam versi terkendali', color: 'cyan' },
          { icon: AlertTriangle, label: 'CAPA Open', value: '0 Open', sub: 'Semua tindakan koreksi closed', color: 'amber' },
          { icon: Award, label: 'Akreditasi KAN', value: 'ISO 17025', sub: 'Valid s.d. Des 2027', color: 'emerald' },
          { icon: Globe, label: 'Interoperabilitas', value: 'Active', sub: 'SatuSehat & BAPETEN bridge OK', color: 'purple' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 hover:border-${color}-500/30 transition-all`}>
            <Icon className={`w-4 h-4 text-${color}-400`} />
            <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">{label}</div>
            <div className="text-lg font-black text-white">{value}</div>
            <div className="text-xs text-slate-400">{sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
