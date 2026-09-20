import React, { useState, useRef } from 'react';
import { 
  Printer, 
  QrCode, 
  Copy, 
  Sliders, 
  Sparkles, 
  Maximize2 
} from 'lucide-react';

import { Tilt3D } from '../components/Tilt3D';

interface StickerData {
  hospitalName: string;
  equipmentId: string;
  equipmentName: string;
  serialNumber: string;
  calibrationDate: string;
  dueDate: string;
  certificateNo: string;
  technicianName: string;
  status: 'PASSED' | 'FAILED' | 'REPAIR_REQUIRED';
  hashSignature: string;
}

export function ThermalStickerStudio() {
  const [stickerSize, setStickerSize] = useState<'50x30' | '70x40' | '100x50'>('70x40');
  const [printerLanguage, setPrinterLanguage] = useState<'ESC_POS' | 'ZEBRA_ZPL'>('ZEBRA_ZPL');
  
  const [stickerData, setStickerData] = useState<StickerData>({
    hospitalName: 'RSUD SEMESTA SEHAT AKREDITASI KARS',
    equipmentId: 'EQ-DEF-2026-089',
    equipmentName: 'DEFIBRILLATOR & MONITOR PASIEN',
    serialNumber: 'NK-884129',
    calibrationDate: '24-08-2026',
    dueDate: '24-08-2027',
    certificateNo: 'SPK/CAL/2026/08-0142',
    technicianName: 'Ir. Ahmad Zaky, S.T. (KAN Certified)',
    status: 'PASSED',
    hashSignature: '88a12b49c0d1e'
  });

  const printAreaRef = useRef<HTMLDivElement>(null);

  const generateZplCode = () => {
    return `^XA
^FO20,20^GB560,300,3^FS
^FO30,30^A0N,25,25^FDSPEKTRUM KREASI PRATAMA (KAN LK-210-IDN)^FS
^FO30,60^A0N,20,20^FD${stickerData.hospitalName}^FS
^FO30,90^GB540,2,2^FS
^FO30,105^A0N,22,22^FDID: ${stickerData.equipmentId}^FS
^FO30,130^A0N,20,20^FDNAMA: ${stickerData.equipmentName}^FS
^FO30,155^A0N,20,20^FDTGL KALIBRASI: ${stickerData.calibrationDate}^FS
^FO30,180^A0N,20,20^FDMASA BERLAKU : ${stickerData.dueDate}^FS
^FO30,205^A0N,18,18^FDNO SERTIFIKAT : ${stickerData.certificateNo}^FS
^FO380,105^BQN,2,4^FDQA,https://spektrumkalibrasi.co.id/verify/${stickerData.equipmentId}^FS
^FO380,240^A0N,25,25^FD[ ${stickerData.status} ]^FS
^XZ`;
  };

  const generateEscPosCode = () => {
    return `ESC @
ESC a 1
GS ! 17
SPEKTRUM KREASI PRATAMA - KAN LK-210-IDN
----------------------------------------
ID ALAT    : ${stickerData.equipmentId}
ALAT       : ${stickerData.equipmentName}
TGL TEST   : ${stickerData.calibrationDate}
DUE DATE   : ${stickerData.dueDate}
STATUS     : *** ${stickerData.status} ***
VERIFY QR  : https://spektrumkalibrasi.co.id/verify/${stickerData.equipmentId}
----------------------------------------
ESC d 3
GS V 66 0`;
  };

  const handlePrintWindow = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      {/* Header Banner */}
      <Tilt3D intensity={5}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
            <Printer className="w-96 h-96 text-amber-400" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-black uppercase tracking-widest">
              <Sparkles className="w-4 h-4 text-amber-400" /> Thermal Sticker & Calibration Label Studio
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Studio Label <span className="bg-gradient-to-r from-amber-400 via-orange-300 to-amber-500 bg-clip-text text-transparent">Sticker Kalibrasi Thermal</span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
              Desainer label thermal fisik otomatis berstandar KAN ISO/IEC 17025. Dilengkapi QR Code verifikasi anti-tamper, generator script printer Zebra ZPL / ESC-POS, serta dukungan cetak thermal 50mm, 70mm, & 100mm.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* Main Grid Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-400" /> Parameter & Data Label
            </h2>

            {/* Sticker Size Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ukuran Kertas Thermal</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '50x30', label: '50 x 30 mm' },
                  { id: '70x40', label: '70 x 40 mm' },
                  { id: '100x50', label: '100 x 50 mm' }
                ].map((sz) => (
                  <button
                    key={sz.id}
                    onClick={() => setStickerSize(sz.id as '50x30' | '70x40' | '100x50')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border ${
                      stickerSize === sz.id
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sz.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Form */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Status Hasil Kalibrasi</label>
                <select
                  value={stickerData.status}
                  onChange={(e) => setStickerData({ ...stickerData, status: e.target.value as StickerData['status'] })}

                  className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:border-amber-500 outline-none"
                >
                  <option value="PASSED">LAIK PAKAI (PASSED)</option>
                  <option value="FAILED">TIDAK LAIK PAKAI (FAILED)</option>
                  <option value="REPAIR_REQUIRED">BUTUH PERBAIKAN (REPAIR)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">ID / Kode Inventaris Alat</label>
                <input
                  type="text"
                  value={stickerData.equipmentId}
                  onChange={(e) => setStickerData({ ...stickerData, equipmentId: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-cyan-400 font-bold focus:border-amber-500 outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Nama Alat Kesehatan</label>
                <input
                  type="text"
                  value={stickerData.equipmentName}
                  onChange={(e) => setStickerData({ ...stickerData, equipmentName: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Tanggal Test</label>
                  <input
                    type="text"
                    value={stickerData.calibrationDate}
                    onChange={(e) => setStickerData({ ...stickerData, calibrationDate: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Kalibrasi Ulang</label>
                  <input
                    type="text"
                    value={stickerData.dueDate}
                    onChange={(e) => setStickerData({ ...stickerData, dueDate: e.target.value })}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Nomor Sertifikat</label>
                <input
                  type="text"
                  value={stickerData.certificateNo}
                  onChange={(e) => setStickerData({ ...stickerData, certificateNo: e.target.value })}
                  className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-amber-400 outline-none"
                />
              </div>
            </div>

            {/* Print Buttons */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <button
                onClick={handlePrintWindow}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 transition-all"
              >
                <Printer className="w-5 h-5" /> Cetak Label Thermal (Browser Print)
              </button>
            </div>
          </div>
        </div>

        {/* Live Preview & ZPL / ESC-POS Exporter */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Maximize2 className="w-5 h-5 text-amber-400" /> Live Canvas Preview Label Physical Sticker
            </h2>

            {/* Physical Thermal Label Preview Box */}
            <div className="flex justify-center p-8 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto">
              <div 
                ref={printAreaRef}
                className={`bg-white text-black p-5 rounded-md shadow-2xl border border-slate-300 font-sans select-none transition-all ${
                  stickerSize === '50x30' ? 'w-[320px]' : stickerSize === '70x40' ? 'w-[420px]' : 'w-[520px]'
                }`}
              >
                {/* Kop LPAK & Accreditation */}
                <div className="border-b-2 border-black pb-2 text-center">
                  <div className="font-black text-xs tracking-tight uppercase">SPEKTRUM KREASI PRATAMA</div>
                  <div className="text-[10px] font-bold text-slate-700">LABORATORIUM KALIBRASI TERAKREDITASI KAN (LK-210-IDN)</div>
                </div>

                {/* Status Badge */}
                <div className="my-3 text-center">
                  <span className={`inline-block px-4 py-1 rounded text-xs font-black uppercase tracking-wider ${
                    stickerData.status === 'PASSED' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}>
                    *** {stickerData.status === 'PASSED' ? 'LAIK PAKAI (PASSED)' : 'TIDAK LAIK PAKAI'} ***
                  </span>
                </div>

                {/* Data Grid */}
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold leading-tight">
                  <div className="col-span-8 space-y-1">
                    <div><span className="text-slate-500">ID ALAT:</span> <span className="font-mono">{stickerData.equipmentId}</span></div>
                    <div><span className="text-slate-500">ALAT:</span> {stickerData.equipmentName}</div>
                    <div><span className="text-slate-500">SN:</span> {stickerData.serialNumber}</div>
                    <div><span className="text-slate-500">TGL TEST:</span> {stickerData.calibrationDate}</div>
                    <div className="text-rose-700"><span className="text-slate-500">DUE DATE:</span> {stickerData.dueDate}</div>
                    <div><span className="text-slate-500">NO SERT:</span> <span className="font-mono">{stickerData.certificateNo}</span></div>
                  </div>

                  {/* QR Code Simulation */}
                  <div className="col-span-4 flex flex-col items-center justify-center border-l border-slate-300 pl-2">
                    <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded">
                      <QrCode className="w-12 h-12" />
                    </div>
                    <span className="text-[8px] font-mono text-slate-500 mt-1">SIG: {stickerData.hashSignature}</span>
                  </div>
                </div>

                <div className="mt-3 pt-1 border-t border-slate-300 text-[9px] text-center text-slate-500 font-mono">
                  Dilarang Melepas Sticker Ini Tanpa Izin Manajer Teknis LPAK
                </div>
              </div>
            </div>

            {/* Code Exporter (ZPL / ESC-POS) */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPrinterLanguage('ZEBRA_ZPL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      printerLanguage === 'ZEBRA_ZPL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Zebra ZPL II Script
                  </button>
                  <button
                    onClick={() => setPrinterLanguage('ESC_POS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      printerLanguage === 'ESC_POS' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    ESC/POS Thermal Commands
                  </button>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(printerLanguage === 'ZEBRA_ZPL' ? generateZplCode() : generateEscPosCode());
                    alert('Script Printer Berhasil Disalin!');
                  }}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Code
                </button>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto max-h-48">
                <pre>{printerLanguage === 'ZEBRA_ZPL' ? generateZplCode() : generateEscPosCode()}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
