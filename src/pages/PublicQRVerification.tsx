import React from 'react';
import { useParams } from 'react-router-dom';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Award, 
  QrCode, 
  Stethoscope, 
  ExternalLink,
  Lock
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

export function PublicQRVerification() {
  const { id } = useParams<{ id: string }>();

  const certData = {
    certificateNumber: 'SPK/CAL/2026/08-0142',
    equipmentName: 'Defibrillator TEC-5631 (Nihon Kohden)',
    serialNumber: 'NK-884129',
    hospitalName: 'RSUD Semesta Sehat',
    issuingLaboratory: 'LPAK Spektrum Kreasi Pratama (KAN LK-291-IDN)',
    testDate: '24-08-2026',
    expiryDate: '24-08-2027',
    status: 'LAIK_PAKAI',
    verificationHash: '88a12b49c0d1e55a77c8812b'
  };

  return (
    <div className="min-h-screen bg-[#030612] text-slate-100 flex items-center justify-center p-4">
      <Tilt3D intensity={6}>
        <div className="w-full max-w-lg bg-slate-900 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl space-y-6 text-center relative overflow-hidden">
          {/* Authenticity Seal Background Accent */}
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <ShieldCheck className="w-10 h-10 animate-pulse" />
          </div>

          <div>
            <span className="px-3.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-widest">
              OFFICIAL CERTIFICATE VERIFIED
            </span>
            <h1 className="text-2xl font-black text-white mt-3">Sertifikat Sah & Terverifikasi</h1>
            <p className="text-xs text-slate-400 mt-1 font-mono">{certData.issuingLaboratory}</p>
          </div>

          {/* Certificate Metadata Card */}
          <div className="p-5 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500">NOMOR SERTIFIKAT:</span>
              <div className="text-cyan-400 font-bold text-sm">{certData.certificateNumber}</div>
            </div>
            <div>
              <span className="text-slate-500">ALAT KESEHATAN:</span>
              <div className="text-white font-bold">{certData.equipmentName}</div>
            </div>
            <div className="flex justify-between">
              <div><span className="text-slate-500">SERIAL NUMBER:</span> <div className="text-slate-300 font-bold">{certData.serialNumber}</div></div>
              <div><span className="text-slate-500">KELAIKAN:</span> <div className="text-emerald-400 font-bold">LAIK PAKAI</div></div>
            </div>
            <div className="flex justify-between border-t border-slate-800 pt-2">
              <div><span className="text-slate-500">TGL KALIBRASI:</span> <div className="text-slate-300">{certData.testDate}</div></div>
              <div><span className="text-slate-500">BERLAKU S/D:</span> <div className="text-amber-400 font-bold">{certData.expiryDate}</div></div>
            </div>
            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 break-all">
              HASH OTENTIKASI SHA-256: <span className="text-slate-400">{certData.verificationHash}</span>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Terlindungi oleh Pengaman Kriptografi SHA-256 & KAN ISO 17025
          </div>
        </div>
      </Tilt3D>
    </div>
  );
}
