import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle2, AlertTriangle, Calendar, ShieldCheck } from 'lucide-react';

export interface RadiometerInstrument {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  calibrationCertNo: string;
  calibrationDate: string;
  validUntil: string;
  issuer: string;
  status: 'VALID' | 'EXPIRED';
}

export function UkesRadiologyInstruments() {
  const [instruments] = useState<RadiometerInstrument[]>([
    {
      id: 'inst-1',
      name: 'RTI Piranha Multi-meter Radiologi',
      brand: 'RTI Group',
      model: 'Piranha 657',
      serialNumber: 'CB2-19040012',
      calibrationCertNo: 'CERT-RTI-2025-081',
      calibrationDate: '2025-05-10',
      validUntil: '2026-05-10',
      issuer: 'PT Spektrum Metrologi Indonesia (KAN LK-001-IDN)',
      status: 'VALID'
    },
    {
      id: 'inst-2',
      name: 'Ionization Chamber 6cc (Radcal)',
      brand: 'Radcal Corporation',
      model: '10X6-6',
      serialNumber: 'RAD-11209',
      calibrationCertNo: 'CERT-RAD-2025-110',
      calibrationDate: '2025-08-01',
      validUntil: '2026-08-01',
      issuer: 'PT Spektrum Metrologi Indonesia',
      status: 'VALID'
    }
  ]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full text-xs font-bold uppercase tracking-widest mb-2">
            <Wrench className="w-4 h-4" /> Traceability Standards
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Master Alat Ukur Radiologi (Piranha & Chamber)
          </h1>
          <p className="text-xs text-slate-400 mt-1">Daftar alat ukur master untuk Uji Kesesuaian BAPETEN beserta status ketertelusuran kalibrasi.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {instruments.map((inst) => (
          <div key={inst.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase">{inst.name}</h3>
                <p className="text-xs text-slate-400">{inst.brand} — {inst.model}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                inst.status === 'VALID' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {inst.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-t border-b border-slate-100 dark:border-slate-800 py-3 font-mono">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">No. Seri</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{inst.serialNumber}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">No. Sertifikat</span>
                <span className="font-bold text-cyan-400">{inst.calibrationCertNo}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Berlaku s/d</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{inst.validUntil}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans">Penerbit Sertifikat</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{inst.issuer}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
