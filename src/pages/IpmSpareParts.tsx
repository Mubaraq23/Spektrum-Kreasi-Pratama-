import React, { useState } from 'react';
import {
  Package, Plus, Search, AlertTriangle, CheckCircle2,
  ShoppingCart, TrendingDown, RefreshCw, Filter, Truck,
  BarChart3, ArrowUpRight, Wrench, ChevronDown
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

export interface SparePartItem {
  id: string;
  code: string;
  name: string;
  category: string;
  deviceType: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
  vendor: string;
  leadTimeDays: number;
  lastRestock: string;
  usagePerMonth: number;
}

const SPARE_PARTS: SparePartItem[] = [
  { id: 'p01', code: 'SP-INF-001', name: 'Peristaltik Tube Gasket Infusion Pump', category: 'Terapi', deviceType: 'Infusion Pump', stock: 45, minStock: 10, unit: 'Pcs', price: 150000, vendor: 'PT Medika Utama', leadTimeDays: 7, lastRestock: '01 Sep 2026', usagePerMonth: 12 },
  { id: 'p02', code: 'SP-MON-002', name: 'SpO₂ Finger Clip Sensor (Adult)', category: 'Monitoring', deviceType: 'Patient Monitor', stock: 12, minStock: 5, unit: 'Unit', price: 650000, vendor: 'PT Jaya Alkes', leadTimeDays: 14, lastRestock: '15 Agu 2026', usagePerMonth: 3 },
  { id: 'p03', code: 'SP-VENT-003', name: 'HEPA Exhalation Filter Ventilator', category: 'Respirasi', deviceType: 'Ventilator', stock: 8, minStock: 10, unit: 'Pcs', price: 420000, vendor: 'PT Medisindo', leadTimeDays: 21, lastRestock: '10 Jul 2026', usagePerMonth: 15 },
  { id: 'p04', code: 'SP-DEF-004', name: 'Elektroda Paddle Defib Dewasa (1 Set)', category: 'Kelistrikan Medik', deviceType: 'Defibrillator', stock: 6, minStock: 8, unit: 'Set', price: 2800000, vendor: 'PT Alkes Prima', leadTimeDays: 30, lastRestock: '01 Jun 2026', usagePerMonth: 2 },
  { id: 'p05', code: 'SP-INF-005', name: 'Syringe 50mL Luer-Lock (Kotak isi 50)', category: 'Terapi', deviceType: 'Syringe Pump', stock: 120, minStock: 50, unit: 'Kotak', price: 85000, vendor: 'PT Medika Utama', leadTimeDays: 3, lastRestock: '18 Sep 2026', usagePerMonth: 40 },
  { id: 'p06', code: 'SP-NIBP-006', name: 'Manset NIBP Dewasa Reusable', category: 'Monitoring', deviceType: 'NIBP Monitor', stock: 18, minStock: 8, unit: 'Pcs', price: 380000, vendor: 'PT Jaya Alkes', leadTimeDays: 10, lastRestock: '05 Sep 2026', usagePerMonth: 4 },
  { id: 'p07', code: 'SP-ESU-007', name: 'Elektroda Dispersif ESU / Diathermy (100 pcs)', category: 'Kelistrikan Medik', deviceType: 'ESU Diathermy', stock: 3, minStock: 5, unit: 'Pak', price: 480000, vendor: 'PT Medisindo', leadTimeDays: 14, lastRestock: '20 Agu 2026', usagePerMonth: 6 },
  { id: 'p08', code: 'SP-VENT-008', name: 'Flow Sensor Pneumatik Ventilator', category: 'Respirasi', deviceType: 'Ventilator', stock: 4, minStock: 3, unit: 'Unit', price: 3500000, vendor: 'PT Alkes Prima', leadTimeDays: 45, lastRestock: '15 Jul 2026', usagePerMonth: 1 },
];

const usageData = SPARE_PARTS.map(p => ({
  name: p.code,
  usage: p.usagePerMonth,
  stock: p.stock,
  minStock: p.minStock,
  isLow: p.stock <= p.minStock,
}));

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function IpmSpareParts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');

  const categories = ['ALL', ...Array.from(new Set(SPARE_PARTS.map(p => p.category)))];

  const filtered = SPARE_PARTS.filter(p => {
    if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.code.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const lowStockCount = SPARE_PARTS.filter(p => p.stock <= p.minStock).length;
  const totalStockValue = SPARE_PARTS.reduce((acc, p) => acc + p.stock * p.price, 0);
  const criticalItems = SPARE_PARTS.filter(p => p.stock < p.minStock);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950/50 to-slate-950 border border-emerald-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
              <Package className="w-4 h-4" /> Inventaris Spare Parts &amp; Manajemen Stok IPM
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Inventaris Suku Cadang{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                &amp; Stok Pemeliharaan
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Manajemen persediaan suku cadang terintegrasi dengan Work Order IPM. Deteksi otomatis stok kritis, peringatan reorder, dan analisis penggunaan bulanan per jenis alat kesehatan.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Jenis Spare Part', value: SPARE_PARTS.length, color: 'emerald', icon: Package },
          { label: 'Stok Kritis (Low Stock)', value: lowStockCount, color: lowStockCount > 0 ? 'rose' : 'emerald', icon: AlertTriangle },
          { label: 'Nilai Total Persediaan', value: `Rp ${(totalStockValue / 1000000).toFixed(1)}JT`, color: 'cyan', icon: BarChart3 },
          { label: 'Vendor Aktif', value: new Set(SPARE_PARTS.map(p => p.vendor)).size, color: 'amber', icon: Truck },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <div className={`text-2xl font-black font-mono text-${color}-400`}>{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── CRITICAL ALERTS ───────────────────────────────────────── */}
      {criticalItems.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/30 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
            <AlertTriangle className="w-5 h-5" /> {criticalItems.length} Item Stok Di Bawah Minimum — Segera Lakukan Reorder
          </div>
          <div className="flex flex-wrap gap-2">
            {criticalItems.map(p => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-mono">
                <span className="text-rose-400 font-bold">{p.code}</span>
                <span className="text-slate-300">{p.name.split(' ').slice(0, 3).join(' ')}</span>
                <span className="text-rose-400 font-black">{p.stock}/{p.minStock} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Usage Chart */}
        <div className="lg:col-span-5 space-y-5">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" /> Penggunaan Bulanan per Spare Part
            </h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={usageData} layout="vertical" margin={{ top: 5, right: 30, bottom: 5, left: 60 }} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis type="category" dataKey="name" stroke="#475569" tick={{ fontSize: 9, fill: '#94a3b8' }} width={65} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                    <div className="text-slate-400">{payload[0]?.payload?.name}</div>
                    <div className="text-emerald-400 font-bold">Usage: {payload[0]?.value}/bln</div>
                    <div className={payload[0]?.payload?.isLow ? 'text-rose-400' : 'text-slate-300'}>
                      Stok: {payload[0]?.payload?.stock} (min: {payload[0]?.payload?.minStock})
                    </div>
                  </div>
                ) : null} />
                <Bar dataKey="usage" name="Penggunaan/Bln" radius={[0, 4, 4, 0]}>
                  {usageData.map((entry, i) => (
                    <Cell key={i} fill={entry.isLow ? '#f43f5e' : '#10b981'} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-emerald-400" /><span className="text-slate-400">Stok Aman</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-rose-400" /><span className="text-slate-400">Stok Kritis</span></div>
            </div>
          </div>
        </div>

        {/* RIGHT: Spare Parts Table */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text" placeholder="Cari spare part..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white">
              {categories.map(c => <option key={c} value={c}>{c === 'ALL' ? 'Semua Kategori' : c}</option>)}
            </select>
            <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-black hover:bg-emerald-500/20 transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Tambah Spare Part
            </button>
          </div>

          {/* Table */}
          <div className="rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-bold tracking-wider">
                    <th className="p-3">Kode &amp; Nama</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Stok / Min</th>
                    <th className="p-3">Harga Satuan</th>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Lead Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filtered.map(p => {
                    const isLow = p.stock <= p.minStock;
                    return (
                      <tr key={p.id} className={`hover:bg-slate-800/40 transition-all ${isLow ? 'bg-rose-500/3' : ''}`}>
                        <td className="p-3">
                          <div className="font-bold text-white text-xs leading-tight">{p.name}</div>
                          <div className="text-[10px] text-cyan-400 mt-0.5">{p.code}</div>
                        </td>
                        <td className="p-3 text-slate-400 text-[10px]">
                          <div>{p.category}</div>
                          <div className="text-slate-500">{p.deviceType}</div>
                        </td>
                        <td className="p-3">
                          <div className={`font-bold ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {p.stock} {p.unit}
                          </div>
                          <div className="text-slate-500 text-[10px]">min: {p.minStock}</div>
                          <div className="w-full h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isLow ? 'bg-rose-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(100, (p.stock / (p.minStock * 3)) * 100)}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3 text-slate-200 font-bold">Rp {p.price.toLocaleString('id-ID')}</td>
                        <td className="p-3 text-slate-400 text-[10px]">{p.vendor}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${p.leadTimeDays > 21 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                            {p.leadTimeDays} hari
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-right">
              {filtered.length} dari {SPARE_PARTS.length} spare part
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
