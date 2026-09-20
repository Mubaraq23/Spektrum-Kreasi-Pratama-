import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { Interactive3DCanvas } from '../components/Interactive3DCanvas';

export function DigitalAssetPassport() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CALIBRATION' | 'IPM' | 'REPAIR' | 'UKES' | 'CERTIFICATES'>('OVERVIEW');


  const assetDetails = {
    id: id || 'EQ-DEF-2026-089',
    name: 'Defibrillator TEC-5631 (Biphasic)',
    manufacturer: 'Nihon Kohden Corporation',
    model: 'TEC-5631',
    serialNumber: 'NK-884129',
    category: 'Emergency Care & Resuscitation',
    riskClass: 'CLASS_III (High Risk Life Support)',
    location: 'IGD (Instalasi Gawat Darurat) - Resusitasi Bed 01',
    owner: 'RSUD Semesta Sehat',
    procurementDate: '2024-05-12',
    installationDate: '2024-05-20',
    warrantyExpiry: '2027-05-20',
    healthScore: 94,
    lifecycleStage: 'ACTIVE',
    lastCalibrationDate: '2026-08-24',
    nextCalibrationDueDate: '2027-08-24',
    certificateNo: 'SPK/CAL/2026/08-0142',
    status: 'LAIK_PAKAI'
  };

  const lifecycleStages = [
    { label: 'PROCURED', date: '12-05-2024', done: true },
    { label: 'INSTALLED', date: '20-05-2024', done: true },
    { label: 'INSPECTED', date: '21-05-2024', done: true },
    { label: 'CALIBRATED', date: '24-08-2026', done: true },
    { label: 'MAINTAINED', date: '24-08-2026', done: true },
    { label: 'REPAIRED', date: 'N/A', done: false },
    { label: 'ACTIVE', date: '2026 - Present', done: true },
    { label: 'RETIRED', date: 'Target 2034', done: false }
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      {/* Asset Header Card */}
      <Tilt3D intensity={4}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <Interactive3DCanvas density="medium" opacity={0.3} interactive={false} />

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  {assetDetails.id}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  ✓ {assetDetails.status}
                </span>
              </div>

              {/* Equipment Health Score Badge */}
              <div className="flex items-center gap-3 p-3 bg-slate-950/80 rounded-2xl border border-slate-800">
                <div className="text-right">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Health Score</div>
                  <div className="text-xl font-black text-emerald-400 font-mono">{assetDetails.healthScore} / 100</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center font-black text-emerald-400">
                  A+
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">{assetDetails.name}</h1>
              <p className="text-slate-400 mt-2 text-sm md:text-base font-mono">
                SN: {assetDetails.serialNumber} • {assetDetails.manufacturer} • {assetDetails.location}
              </p>
            </div>

            {/* Lifecycle Timeline */}
            <div className="pt-4 border-t border-slate-800/80">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Asset Lifecycle Timeline</div>
              <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
                {lifecycleStages.map((stg, idx) => (
                  <div key={idx} className="flex items-center gap-2 flex-shrink-0">
                    <div className={`p-2.5 rounded-xl border text-center ${
                      stg.done ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300' : 'bg-slate-950 border-slate-800 text-slate-600'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-wider">{stg.label}</div>
                      <div className="text-[9px] font-mono text-slate-400 mt-0.5">{stg.date}</div>
                    </div>
                    {idx < lifecycleStages.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-700" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* 360 Degree View Tabs & Details */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-4 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Ringkasan 360°' },
            { id: 'CALIBRATION', label: 'Histori Kalibrasi' },
            { id: 'IPM', label: 'Inspeksi & IPM' },
            { id: 'REPAIR', label: 'Catatan Repair' },
            { id: 'UKES', label: 'Ukes Radiologi' },
            { id: 'CERTIFICATES', label: 'Arsip Sertifikat' }
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setActiveTab(tb.id as typeof activeTab)}

              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tb.id ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20' : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block mb-1">PEMILIK / FASILITAS:</span>
                  <div className="text-white font-bold text-sm">{assetDetails.owner}</div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block mb-1">MASA BERLAKU KALIBRASI:</span>
                  <div className="text-emerald-400 font-bold text-sm">{assetDetails.nextCalibrationDueDate}</div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                  <span className="text-slate-500 block mb-1">NOMOR SERTIFIKAT SAH:</span>
                  <div className="text-cyan-400 font-bold text-sm">{assetDetails.certificateNo}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-cyan-400 font-bold">SPESIFIKASI TEKNIS ALAT:</span>
                  <div className="text-slate-300">Produsen: {assetDetails.manufacturer}</div>
                  <div className="text-slate-300">Model / Tipe: {assetDetails.model}</div>
                  <div className="text-slate-300">Kelas Risiko: {assetDetails.riskClass}</div>
                  <div className="text-slate-300">Garansi Pabrik: s/d {assetDetails.warrantyExpiry}</div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-emerald-400 font-bold">STATUS KETERTELUSURAN METROLOGI:</span>
                  <div className="text-slate-300">Standar Acuan: Fluke Impulse 7000DP DP-991</div>
                  <div className="text-slate-300">Ketertelusuran SI: BSN / SNSU Indonesia</div>
                  <div className="text-slate-300">Ketidakpastian Terluas ($U_{95}$): ± 0.15 Joule</div>
                  <div className="text-slate-300">Metode Pengujian: IK-SPK-DEF-01 Rev 4</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'CALIBRATION' && (
            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-cyan-400 uppercase">Riwayat Kalibrasi Terdaftar (KAN LK-210-IDN)</h3>
              <div className="space-y-3">
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">Kalibrasi Tahunan 2026</div>
                    <div className="text-slate-400 text-[11px]">Tgl: 24 Agustus 2026 • No: SPK/CAL/2026/08-0142</div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">LAIK PAKAI</span>
                </div>
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white">Kalibrasi Perdana 2025</div>
                    <div className="text-slate-400 text-[11px]">Tgl: 20 Agustus 2025 • No: SPK/CAL/2025/08-0091</div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full font-bold">LAIK PAKAI</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'IPM' && (
            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-blue-400 uppercase">Catatan Pemeliharaan Preventif (IPM IEC 62353)</h3>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="font-bold text-white">IPM Semesteran Q3 2026</span>
                  <span className="text-blue-400">Score 94 / 100</span>
                </div>
                <div className="text-slate-400 text-[11px]">
                  Pemeriksaan fisik OK, Uji keselamatan listrik IEC 62353 Lolos (PE: 0.08 Ω, Isolasi: 100 MΩ, Bocor: 45 µA).
                </div>
              </div>
            </div>
          )}

          {activeTab === 'REPAIR' && (
            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-purple-400 uppercase">Catatan Perbaikan & Replacement (Corrective Repair)</h3>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-400">
                Belum ada catatan kerusakan atau perbaikan mayor pada unit ini. Alat beroperasi stabil.
              </div>
            </div>
          )}

          {activeTab === 'UKES' && (
            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-amber-400 uppercase">Status Uji Kesesuaian Sinar-X (BAPETEN)</h3>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-400">
                Alat kategori non-radiasi. (Uji Kesesuaian BAPETEN hanya berlaku untuk Pesawat Sinar-X Radiologi).
              </div>
            </div>
          )}

          {activeTab === 'CERTIFICATES' && (
            <div className="space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-emerald-400 uppercase">Dokumen Sertifikat Digital & QR Verification</h3>
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Sertifikat Kalibrasi Sah (SHA-256 Verified)</div>
                  <div className="text-slate-400 text-[11px]">SPK/CAL/2026/08-0142 • Terbit: 24/08/2026</div>
                </div>
                <a
                  href={`/verify?cert=${assetDetails.certificateNo}`}
                  className="px-3.5 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl hover:bg-cyan-500/30 transition-all font-bold"
                >
                  Verifikasi QR
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

