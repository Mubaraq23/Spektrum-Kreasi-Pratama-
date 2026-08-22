import React from 'react';
import { Layers, Plus, CheckCircle2, Stethoscope, Wrench } from 'lucide-react';
import { IPM_TEMPLATES_CATALOG } from '../data/ipmTemplatesCatalog';

export function IpmMasterTemplates() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-bold uppercase tracking-widest mb-2">
            <Layers className="w-4 h-4" /> Dynamic Engine Configuration
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Master Templat Pemeliharaan IPM
          </h1>
          <p className="text-xs text-slate-400 mt-1">Daftar profil inspeksi dan parameter pemeliharaan preventif per jenis alat kesehatan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {IPM_TEMPLATES_CATALOG.map((tpl) => (
          <div key={tpl.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">{tpl.category}</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">{tpl.deviceName}</h3>
                <p className="text-xs text-slate-400">{tpl.description}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                tpl.riskLevel === 'High' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
              }`}>
                {tpl.riskLevel} Risk
              </span>
            </div>

            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">Item Inspeksi Fisik ({tpl.physicalChecklist.length})</p>
              <p className="text-slate-400 line-clamp-2">{tpl.physicalChecklist.join(', ')}</p>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 uppercase">Parameter Performa ({tpl.performanceParameters.length})</p>
              <div className="flex flex-wrap gap-2">
                {tpl.performanceParameters.map(p => (
                  <span key={p.id} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-mono font-bold text-cyan-400">
                    {p.name} ({p.unit})
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
