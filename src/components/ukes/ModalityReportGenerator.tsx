import React from 'react';
import { ShieldCheck, Printer, AlertTriangle, Atom } from 'lucide-react';
import { RadiologyModalityProfile } from '../../lib/ukes/radiologyModalityTypes';

export interface UkesReportRecordData {
  certificateNo?: string;
  testDate?: string;
  fasyankesName?: string;
  fasyankesAddress?: string;
  roomName?: string;
  deviceName?: string;
  brand?: string;
  model?: string;
  tubeSN?: string;
  overallStatus?: string;
}

interface ModalityReportGeneratorProps {
  testData: UkesReportRecordData;
  modalityProfile: RadiologyModalityProfile;
  onPrint?: () => void;
}

export function ModalityReportGenerator({
  testData,
  modalityProfile,
  onPrint
}: ModalityReportGeneratorProps) {
  const isLaik = testData?.overallStatus === 'LAIK' || testData?.overallStatus === 'PASS';

  return (
    <div className="bg-white text-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 font-sans max-w-4xl mx-auto space-y-6 print:shadow-none print:border-none print:p-0">
      {/* Official Certificate Header */}
      <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-cyan-400">
            <Atom className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-wider font-mono">
              LEMBAGA UJI KESESUAIAN (LUK)
            </h1>
            <p className="text-xs font-bold text-slate-600">
              SPEKTRUM CALIBRAPRO — AKREDITASI BAPETEN & KAN ISO/IEC 17025:2017
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
              Sertifikat Uji Kesesuaian Pesawat Sinar-X Radiologi Diagnostik & Intervensional
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[10px]">
          <p className="font-bold text-slate-900">No. Sertifikat:</p>
          <p className="text-cyan-700 font-black">{testData?.certificateNo || `CERT/UKES/${new Date().getFullYear()}/0091`}</p>
          <p className="text-slate-500 mt-1">Tanggal Terbit: {testData?.testDate || new Date().toISOString().split('T')[0]}</p>
        </div>
      </div>

      {/* Facility & Instrument Details */}
      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
        <div>
          <h4 className="font-black text-slate-900 uppercase font-mono text-[10px] mb-2 text-cyan-800">Identitas Fasyankes & Ruang</h4>
          <p><span className="font-bold">Fasyankes:</span> {testData?.fasyankesName || 'RSUD Pratama Jakarta'}</p>
          <p><span className="font-bold">Alamat:</span> {testData?.fasyankesAddress || 'Jl. Kesehatan No. 12, Jakarta'}</p>
          <p><span className="font-bold">Ruangan:</span> {testData?.roomName || 'Ruang Radiologi 01'}</p>
        </div>
        <div>
          <h4 className="font-black text-slate-900 uppercase font-mono text-[10px] mb-2 text-cyan-800">Identitas Pesawat Sinar-X ({modalityProfile.nameEn})</h4>
          <p><span className="font-bold">Nama Alat:</span> {testData?.deviceName}</p>
          <p><span className="font-bold">Merk / Model:</span> {testData?.brand} / {testData?.model}</p>
          <p><span className="font-bold font-mono">No. Seri Tabung:</span> {testData?.tubeSN || 'SN-88192-A'}</p>
        </div>
      </div>

      {/* Modality Specific Summary Table */}
      <div className="space-y-3">
        <h3 className="text-xs font-black uppercase font-mono text-slate-900">
          Ringkasan Pengujian Parameter ({modalityProfile.name})
        </h3>
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px]">
              <th className="py-2 px-3">Parameter Uji</th>
              <th className="py-2 px-3">Kategori</th>
              <th className="py-2 px-3">Syarat BAPETEN</th>
              <th className="py-2 px-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {modalityProfile.parameters.map((param) => (
              <tr key={param.id}>
                <td className="py-2.5 px-3 font-bold">{param.name}</td>
                <td className="py-2.5 px-3">{param.category}</td>
                <td className="py-2.5 px-3 text-slate-600">{param.description}</td>
                <td className="py-2.5 px-3 text-center">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-100 text-emerald-800">
                    LAIK / PASSED
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Final Decision Banner */}
      <div className={`p-5 rounded-2xl border-2 flex items-center justify-between font-mono ${
        isLaik 
          ? 'bg-emerald-50 border-emerald-500 text-emerald-950' 
          : 'bg-rose-50 border-rose-500 text-rose-950'
      }`}>
        <div className="flex items-center gap-3">
          {isLaik ? <ShieldCheck className="w-8 h-8 text-emerald-600" /> : <AlertTriangle className="w-8 h-8 text-rose-600" />}
          <div>
            <h4 className="text-sm font-black uppercase">KESIMPULAN UJI KESESUAIAN BAPETEN:</h4>
            <p className="text-xs font-medium">
              Pesawat Sinar-X dinyatakan <span className="font-black text-sm uppercase underline">{isLaik ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}</span> sesuai kriteria keberterimaan Perba BAPETEN No. 1 Tahun 2025.
            </p>
          </div>
        </div>
        <span className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider">
          {isLaik ? 'LAIK PAKAI' : 'TIDAK LAIK'}
        </span>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 print:hidden">
        <button
          onClick={onPrint || (() => window.print())}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Cetak / Export Sertifikat PDF
        </button>
      </div>
    </div>
  );
}
