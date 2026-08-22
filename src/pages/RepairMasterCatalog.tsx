import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { FAILURE_CODES_CATALOG } from '../data/repairMasterCatalog';

export function RepairMasterCatalog() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-xs font-bold uppercase tracking-widest mb-2">
            <ShieldAlert className="w-4 h-4" /> Classification Catalog
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Master Failure Codes & Katalog Kerusakan
          </h1>
          <p className="text-xs text-slate-400 mt-1">Daftar standar kode kerusakan, dugaan penyebab, dan rekomendasi tindakan perbaikan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {FAILURE_CODES_CATALOG.map((fc) => (
          <div key={fc.code} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold text-rose-500 uppercase tracking-widest">{fc.code}</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">{fc.name}</h3>
                <p className="text-xs text-slate-400">{fc.description}</p>
              </div>
              <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-mono font-bold">
                {fc.category}
              </span>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">Dugaan Penyebab</p>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                {fc.commonCauses.map((c, idx) => (
                  <li key={idx}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">Rekomendasi Tindakan</p>
              <div className="flex flex-wrap gap-2">
                {fc.recommendedActions.map((act, idx) => (
                  <span key={idx} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-500 rounded-xl text-[10px] font-bold">
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
