import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Stethoscope, 
  Search, 
  QrCode, 
  ShieldCheck, 
  Award
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

interface CustomerEquipmentRecord {
  id: string;
  name: string;
  category: string;
  serialNumber: string;
  locationDepartment: string;
  lastCalibrationDate: string;
  nextDueDate: string;
  certificateNo: string;
  status: 'LAIK_PAKAI' | 'TIDAK_LAIK_PAKAI' | 'DUE_SOON';
  hashSignature: string;
}

export function CustomerPortal() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [records] = useState<CustomerEquipmentRecord[]>([
    {
      id: 'EQ-DEF-2026-089',
      name: 'Defibrillator TEC-5631',
      category: 'Emergency Care',
      serialNumber: 'NK-884129',
      locationDepartment: 'IGD (Instalasi Gawat Darurat)',
      lastCalibrationDate: '24-08-2026',
      nextDueDate: '24-08-2027',
      certificateNo: 'SPK/CAL/2026/08-0142',
      status: 'LAIK_PAKAI',
      hashSignature: '88a12b49c0d1e'
    },
    {
      id: 'EQ-PAT-2026-112',
      name: 'Patient Monitor BeneVision N17',
      category: 'ICU / CCU',
      serialNumber: 'MR-992144',
      locationDepartment: 'ICU Bed 04',
      lastCalibrationDate: '20-08-2026',
      nextDueDate: '20-08-2027',
      certificateNo: 'SPK/CAL/2026/08-0110',
      status: 'LAIK_PAKAI',
      hashSignature: '77c12f00a4b9d'
    },
    {
      id: 'EQ-XRAY-2026-004',
      name: 'Fixed X-Ray Multix Impact',
      category: 'Radiology',
      serialNumber: 'SM-774012',
      locationDepartment: 'Radiologi Ruang 01',
      lastCalibrationDate: '15-09-2025',
      nextDueDate: '15-09-2026',
      certificateNo: 'UKES/RAD/2025/09-0042',
      status: 'DUE_SOON',
      hashSignature: '55d99b11e2a3c'
    }
  ]);

  const filteredRecords = records.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.serialNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      <Tilt3D intensity={5}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-teal-400 text-xs font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-teal-400" /> Hospital Self-Service Client Portal & Certificate Verification
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Portal Layanan Rumah Sakit <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">Pencarian & Verifikasi Kelaikan Alat</span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
              Akses mandiri bagi manajemen & tenaga medis rumah sakit untuk mengunduh sertifikat sah, memeriksa status kelaikan alat kesehatan, dan jadwal kalibrasi terencana.
            </p>
          </div>
        </div>
      </Tilt3D>

      <div className="space-y-6">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-400" /> Daftar Alat Kesehatan Terkalibrasi
            </h2>

            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari ID, Nama Alat, Serial..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredRecords.map((rec) => (
              <div key={rec.id} className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-4 hover:border-teal-500/50 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-teal-400">{rec.id}</span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                    rec.status === 'LAIK_PAKAI' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {rec.status === 'LAIK_PAKAI' ? '✓ LAIK PAKAI' : '⚠️ DUE SOON'}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base">{rec.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{rec.locationDepartment}</p>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono">
                  <div className="flex justify-between"><span>SN:</span> <span className="text-slate-200">{rec.serialNumber}</span></div>
                  <div className="flex justify-between"><span>Tgl Test:</span> <span className="text-slate-200">{rec.lastCalibrationDate}</span></div>
                  <div className="flex justify-between"><span>Due Date:</span> <span className="text-amber-400 font-bold">{rec.nextDueDate}</span></div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => navigate(`/asset-passport/${rec.id}`)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-teal-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border border-slate-700"
                  >
                    <Stethoscope className="w-3.5 h-3.5 text-teal-400" /> Paspor Aset
                  </button>
                  <button 
                    onClick={() => navigate(`/verify/${rec.id}`)}
                    className="py-2 px-3 bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all border border-teal-500/30"
                  >
                    <QrCode className="w-3.5 h-3.5 text-teal-400" /> Verifikasi QR
                  </button>
                  <button 
                    onClick={() => navigate('/certificates')}
                    className="col-span-2 py-2 px-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-md shadow-teal-500/10"
                  >
                    <Award className="w-3.5 h-3.5" /> Akses Arsip Sertifikat Sah
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
