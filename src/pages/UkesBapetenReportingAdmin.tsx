import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Send, 
  Clock, 
  Search
} from 'lucide-react';
import { formatBapeten3051Payload, BapetenReportPayload } from '../lib/ukes/bapetenReportingEngine';
import { useAuth } from '../lib/AuthContext';

export function UkesBapetenReportingAdmin() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Sample mock payloads adhering to Kepka 3051/2024
  const [payloads] = useState<BapetenReportPayload[]>([
    formatBapeten3051Payload({
      id: 'TEST-001',
      lhuNumber: 'LHU-UKES-2026-001',
      certificateNo: 'CERT-BAPETEN-2026-001',
      modalityId: 'general-xray',
      modalityName: 'General X-Ray',
      fasyankesName: 'RSUD Pratama Jakarta',
      brand: 'Siemens',
      model: 'Multix Select DR',
      serialNumber: 'SN-88239-X',
      overallStatus: 'LAIK',
      testDate: '2026-02-15'
    }, user?.email || 'teknisi@spektrum.co.id'),
    formatBapeten3051Payload({
      id: 'TEST-002',
      lhuNumber: 'LHU-UKES-2026-002',
      certificateNo: 'NOTISI-BAPETEN-2026-002',
      modalityId: 'ct-scan',
      modalityName: 'CT Scanner Multi-Slice',
      fasyankesName: 'RS Medika Sejahtera',
      brand: 'GE Healthcare',
      model: 'Revolution CT',
      serialNumber: 'SN-CT-99120',
      overallStatus: 'TIDAK_LAIK',
      testDate: '2026-02-18'
    }, user?.email || 'teknisi@spektrum.co.id')
  ]);

  const filteredPayloads = payloads.filter(p => 
    p.fasyankesName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lhuNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 font-mono">
            <ShieldCheck className="w-3.5 h-3.5" /> Kepka BAPETEN No. 3051 Tahun 2024
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Modul Pelaporan Mandiri LUK BAPETEN
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Pengelolaan payload pelaporan penerbitan Sertifikat Uji Kesesuaian & Notisi Hasil Uji ke sistem BAPETEN.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 font-mono">
            <Send className="w-4 h-4" /> Sinkronkan Pelaporan
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Daftar Antrean Payload Pelaporan LUK
          </h3>
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari fasyankes, no sertifikat, LHU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-2 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto no-scrollbar font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <th className="py-4 px-4">ID Pelaporan & LHU</th>
                <th className="py-4 px-4">Nomor Sertifikat / Notisi</th>
                <th className="py-4 px-4">Modalitas & Fasyankes</th>
                <th className="py-4 px-4">Keputusan Uji</th>
                <th className="py-4 px-4">Status BAPETEN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPayloads.map((p) => (
                <tr key={p.reportId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all">
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{p.reportId}</div>
                    <div className="text-[10px] text-slate-400">{p.lhuNumber}</div>
                  </td>
                  <td className="py-4 px-4 font-bold text-cyan-400">
                    {p.certificateNumber}
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{p.modalityName}</div>
                    <div className="text-[10px] text-slate-400">{p.fasyankesName}</div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      p.overallStatus === 'LAIK' 
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    }`}>
                      {p.overallStatus === 'LAIK' ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-bold uppercase">
                      <Clock className="w-3 h-3" /> Ready for BAPETEN Kepka 3051/2024
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
