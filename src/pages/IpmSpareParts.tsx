import React, { useState } from 'react';
import { Package, Plus, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface SparePartItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  price: number;
  vendor: string;
}

export function IpmSpareParts() {
  const [parts] = useState<SparePartItem[]>([
    {
      id: 'part-1',
      code: 'SP-INF-001',
      name: 'Peristaltik Tube Gasket Infusion Pump',
      category: 'Terapi',
      stock: 45,
      minStock: 10,
      unit: 'Pcs',
      price: 150000,
      vendor: 'PT Medika Utama'
    },
    {
      id: 'part-2',
      code: 'SP-MON-002',
      name: 'SpO2 Finger Clip Sensor (Adult)',
      category: 'Monitoring',
      stock: 12,
      minStock: 5,
      unit: 'Unit',
      price: 650000,
      vendor: 'PT Jaya Alkes'
    },
    {
      id: 'part-3',
      code: 'SP-VENT-003',
      name: 'HEPA Exhalation Filter Ventilator',
      category: 'Respirasi',
      stock: 8,
      minStock: 10,
      unit: 'Pcs',
      price: 420000,
      vendor: 'PT Medisindo'
    }
  ]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-widest mb-2">
            <Package className="w-4 h-4" /> Persediaan Spare Parts
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Inventaris Spare Parts Pemeliharaan
          </h1>
          <p className="text-xs text-slate-400 mt-1">Stok suku cadang terintegrasi langsung dengan Work Order IPM.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <th className="py-3 px-4">Kode & Nama Spare Part</th>
                <th className="py-3 px-4">Kategori Alat</th>
                <th className="py-3 px-4">Sisa Stok</th>
                <th className="py-3 px-4">Harga Satuan</th>
                <th className="py-3 px-4">Vendor / Distributor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
              {parts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3.5 px-4">
                    <p className="font-extrabold text-slate-900 dark:text-white uppercase">{p.name}</p>
                    <span className="text-[10px] text-cyan-400 font-mono">{p.code}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500">{p.category}</td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      p.stock <= p.minStock ? 'bg-rose-500/10 text-rose-500 font-bold' : 'bg-emerald-500/10 text-emerald-500 font-bold'
                    }`}>
                      {p.stock} {p.unit}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-900 dark:text-white">Rp {p.price.toLocaleString('id-ID')}</td>
                  <td className="py-3.5 px-4 text-slate-400 font-normal">{p.vendor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
