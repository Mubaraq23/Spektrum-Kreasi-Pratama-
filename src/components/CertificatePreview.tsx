import React from 'react';
import { 
  X, 
  Award, 
  Printer,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CertificatePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function CertificatePreview({ isOpen, onClose, data }: CertificatePreviewProps) {
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  // Safe Date Formatting functions corresponding to CertificateDetail.tsx
  const formattedAtDate = (d: any, plusDays = 0) => {
    if (!d) return '-';
    let dateObj = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    if (plusDays !== 0) {
      dateObj = new Date(dateObj.setDate(dateObj.getDate() + plusDays));
    }
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedExpiryDate = (d: any, plusYears = 1) => {
    if (!d) return '-';
    let dateObj = d?.toDate ? d.toDate() : new Date(d);
    if (isNaN(dateObj.getTime())) return '-';
    dateObj = new Date(dateObj.setFullYear(dateObj.getFullYear() + plusYears));
    dateObj = new Date(dateObj.setDate(dateObj.getDate() - 1));
    return dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formattedDate = (d: any) => d?.toDate ? d.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : (typeof d === 'string' ? d : '-');

  const certNumber = data.certificateNumber || '2026/SKP/04129';
  const temperature = data.environmentalData?.temperature || data.tempInitial || '25,61';
  const humidity = data.environmentalData?.humidity || data.humInitial || '58,31';
  const tempUnc = data.environmentalData?.tempUncertainty || '0,4';
  const humUnc = data.environmentalData?.humUncertainty || '4,1';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-10">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-md no-print"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col no-print"
          >
            {/* Header Toolbar */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between no-print">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                    <Award className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Preview Sertifikat</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sertifikat Resmi PT. Spektrum Kreasi Pratama</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <button 
                  onClick={handlePrint}
                  className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2 shadow-sm"
                 >
                    <Printer className="w-4 h-4" />
                    Print
                 </button>
                 <button 
                  onClick={onClose}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                 >
                    <X className="w-6 h-6" />
                 </button>
              </div>
            </div>

            {/* Scrollable multi-page certificate area mirroring production layout */}
            <div className="flex-1 overflow-y-auto p-12 bg-slate-100 flex flex-col items-center gap-16 custom-scrollbar no-print">
               
               {/* PAGE 1 */}
               <div className="scale-[0.45] sm:scale-[0.65] md:scale-100 origin-top mb-[-180mm] sm:mb-[-120mm] md:mb-0 min-w-max px-4">
                  <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[15mm] shadow-2xl font-sans overflow-hidden border border-slate-200">
                    {/* Absolute Border */}
                    <div className="absolute inset-0 pointer-events-none p-4 z-20">
                      <OrnateBorderPattern />
                    </div>

                    {/* Center Watermark Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.035]">
                      <div className="w-[450px] h-[450px] rotate-12">
                        <svg viewBox="0 0 150 140" className="w-full h-full fill-current text-blue-800">
                          <path d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z" />
                          <path d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z" />
                        </svg>
                      </div>
                    </div>

                    <div className="relative z-10 flex flex-col h-full m-[10mm] px-[10mm] py-[8mm] min-h-[250mm]">
                      {/* Logo and Name Header */}
                      <div className="flex items-center gap-5 justify-start mb-6">
                        <div className="w-[60px] h-[60px] flex items-center justify-center">
                          <svg viewBox="0 0 150 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                            <path d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z" fill="#0284c7" />
                            <path d="M 45 74 C 42 66, 45 52, 58 44 C 70 36, 92 32, 115 32 C 110 36, 100 40, 88 46 C 72 54, 58 64, 45 74 Z" fill="#94a3b8" />
                            <path d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z" fill="#1e3a8a" />
                            <path d="M 124 64 C 128 72, 125 86, 112 94 C 100 102, 78 106, 55 106 C 60 102, 70 98, 82 92 C 98 84, 112 74, 124 64 Z" fill="#94a3b8" />
                          </svg>
                        </div>
                        <div className="flex flex-col text-left">
                          <h1 className="text-[25px] font-black text-[#1d4ed8] uppercase tracking-[0.03em] font-sans leading-none">SPEKTRUM KREASI PRATAMA</h1>
                        </div>
                      </div>

                      {/* Certificate Title */}
                      <div className="text-center space-y-1 mb-8">
                        <h2 className="text-[28px] font-bold italic underline decoration-slate-900 underline-offset-4 tracking-tight font-serif leading-none uppercase">Sertifikat Kalibrasi</h2>
                        <p className="text-[17px] font-bold italic text-slate-500 font-serif leading-none uppercase">CALIBRATION CERTIFICATE</p>
                        <p className="text-[14px] font-bold tracking-[0.05em] font-sans mt-2">{certNumber}</p>
                      </div>

                      {/* Info Grid (Owner Details) */}
                      <div className="space-y-[15px] mb-8">
                        <InfoRow label="Pemilik" labelEng="Costumer" value={data.fasyankesName} />
                        <InfoRow label="Alamat" labelEng="Address" value={data.fasyankesAddress || data.location} />
                        <InfoRow label="Tanggal Terima Unit" labelEng="Unit Received Date" value={formattedAtDate(data.createdAt || data.issuedAt)} />
                        <InfoRow label="Tanggal Kalibrasi" labelEng="Date of Calibration" value={formattedAtDate(data.createdAt || data.issuedAt)} />
                      </div>

                      {/* Section divider and Instrument Identity Header */}
                      <div className="space-y-[15px] mb-8">
                        <h3 className="font-bold italic underline text-[15px] font-sans text-slate-900 tracking-wide">Identitas Instrument / Instrument Identity :</h3>
                        
                        <div className="space-y-[15px] pl-[2px]">
                          <InfoRow label="Nama" labelEng="Name" value={data.deviceName || 'Micropipette'} />
                          <InfoRow label="Merk" labelEng="Manufacture" value={data.brand} />
                          <InfoRow label="Tipe" labelEng="Type" value={data.model} />
                          <InfoRow label="Nomor Seri" labelEng="Serial Number" value={data.serialNumber} />
                          <InfoRow label="Tempat Kalibrasi" labelEng="Place of Calibration" value={data.location || 'Klinik Batari'} />
                          <InfoRow label="Tanggal Diterbitkan" labelEng="Date of Issued" value={formattedAtDate(data.createdAt || data.issuedAt, 1)} />
                          <InfoRow label="Masa Berlaku" labelEng="Expired Date" value={data.nextCalibrationDate || formattedExpiryDate(data.createdAt || data.issuedAt)} />
                        </div>
                      </div>

                      {/* Corporate Signoff & Authentic Oval Stamp Offset */}
                      <div className="mt-auto flex justify-between items-end pb-2">
                        <div />
                        
                        <div className="text-center min-w-[280px] relative">
                          <p className="font-bold text-[12.5px] uppercase tracking-wide text-slate-900 font-sans mb-1 pb-1">PT. SPEKTRUM KREASI PRATAMA</p>
                          
                          <div className="relative h-[110px] w-full flex items-center justify-center mb-2">
                            <div className="absolute left-[38px] top-[-5px] z-20 pointer-events-none transform rotate-12 scale-[0.95]">
                              <svg viewBox="0 0 160 160" width="112" height="112" className="text-[#2563eb] opacity-85 select-none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="none" />
                                <circle cx="80" cy="80" r="69" fill="none" stroke="currentColor" strokeWidth="0.8" />
                                <path id="stampCurveTopPreview" d="M 14 80 A 66 66 0 0 1 146 80" fill="none" stroke="transparent" />
                                <path id="stampCurveBottomPreview" d="M 146 80 A 66 66 0 0 1 14 80" fill="none" stroke="transparent" />
                                <text className="font-sans font-black text-[9.5px]" fill="currentColor" letterSpacing="0.12em">
                                   <textPath href="#stampCurveTopPreview" startOffset="50%" textAnchor="middle">
                                      PT. SPEKTRUM KREASI PRATAMA
                                   </textPath>
                                </text>
                                <text className="font-sans font-black text-[8.5px]" fill="currentColor" letterSpacing="0.18em">
                                   <textPath href="#stampCurveBottomPreview" startOffset="50%" textAnchor="middle">
                                      * DEPOK - INDONESIA *
                                   </textPath>
                                </text>
                                <g transform="translate(48, 54) scale(0.28)">
                                  <path
                                    d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z"
                                    fill="currentColor"
                                  />
                                  <path
                                    d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z"
                                    fill="currentColor"
                                  />
                                </g>
                              </svg>
                            </div>

                            <div className="absolute left-[45px] top-[10px] z-30 pointer-events-none transform -rotate-3">
                              <svg viewBox="0 0 200 100" width="140" height="70" className="text-[#1d4ed8]" xmlns="http://www.w3.org/2000/svg">
                                <path
                                   d="M 20 48 Q 40 22, 52 46 T 70 32 T 91 62 T 112 42 Q 130 32, 150 66 T 170 46 T 190 56"
                                   fill="none"
                                   stroke="currentColor"
                                   strokeWidth="3"
                                   strokeLinecap="round"
                                   strokeLinejoin="round"
                                />
                                <path
                                   d="M 15 54 C 28 16, 62 12, 54 62 C 46 92, 82 82, 112 52 C 132 32, 172 6, 148 62 C 136 88, 182 88, 196 52"
                                   fill="none"
                                   stroke="currentColor"
                                   strokeWidth="1.8"
                                   strokeLinecap="round"
                                   strokeLinejoin="round"
                                   opacity="0.85"
                                  />
                                </svg>
                              </div>
                            </div>

                            <div className="relative z-10 w-full text-center">
                               <p className="font-bold text-[14.5px] text-slate-900 border-b border-slate-900 pb-0.5 inline-block px-1 tracking-tight">Faustina Dao S.Tr.Tem</p>
                               <p className="font-bold text-[11px] text-slate-500 uppercase tracking-wider mt-1">Manager Teknis</p>
                            </div>
                          </div>
                        </div>

                        <footer className="mt-auto text-center space-y-1 z-15">
                           <p className="text-[11.5px] font-bold text-slate-400">Hal. 1</p>
                           <p className="text-[10px] font-bold text-slate-500 font-sans tracking-tight">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
                           <div className="border border-slate-300 p-2 mx-8 mt-1.5 bg-slate-50/20">
                              <p className="text-[9.5px] italic text-slate-700 leading-tight">Hasil hanya berhubungan dengan instrument yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan <strong className="uppercase font-sans font-black text-slate-800">PT. SPEKTRUM KREASI PRATAMA</strong></p>
                           </div>
                        </footer>
                     </div>
                  </div>
               </div>

               {/* PAGE 2 */}
               <div className="scale-[0.45] sm:scale-[0.65] md:scale-100 origin-top min-w-max px-4">
                  <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[15mm] shadow-2xl font-sans flex flex-col border border-slate-200 overflow-hidden">
                    {/* Header section with specialized heart pulse */}
                    <div className="flex justify-between items-start border-b-[2.5px] border-blue-900 pb-4 mb-6 z-10 w-full">
                        <div className="flex items-center gap-3 shrink-0">
                           <div className="w-[45px] h-[45px] flex items-center justify-center">
                              <svg viewBox="0 0 150 140" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                                <path d="M 50 110 C 15 90, 10 55, 38 30 C 48 20, 68 12, 100 12 C 118 12, 134 16, 142 22 C 122 28, 92 28, 68 38 C 45 48, 30 65, 38 88 C 44 100, 56 108, 68 112 C 60 114, 55 112, 50 110 Z" fill="#0284c7" />
                                <path d="M 45 74 C 42 66, 45 52, 58 44 C 70 36, 92 32, 115 32 C 110 36, 100 40, 88 46 C 72 54, 58 64, 45 74 Z" fill="#94a3b8" />
                                <path d="M 85 125 C 105 125, 122 118, 134 106 C 146 94, 150 78, 142 58 C 138 48, 126 38, 114 34 C 124 34, 130 38, 134 44 C 146 58, 145 88, 118 114 C 98 132, 60 134, 32 118 C 50 124, 70 125, 85 125 Z" fill="#1e3a8a" />
                                <path d="M 124 64 C 128 72, 125 86, 112 94 C 100 102, 78 106, 55 106 C 60 102, 70 98, 82 92 C 98 84, 112 74, 124 64 Z" fill="#94a3b8" />
                              </svg>
                           </div>
                           <h1 className="text-[17px] font-black text-[#1d4ed8] tracking-tight uppercase font-sans">PT. SPEKTRUM KREASI PRATAMA</h1>
                        </div>
                        
                        <div className="flex-1 flex items-center h-10 px-4 translate-y-1">
                           <svg className="w-full h-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 300 40">
                              <path d="M 0 20 L 160 20 L 166 10 L 172 30 L 178 0 L 184 40 L 190 20 L 220 20" strokeLinejoin="round" />
                           </svg>
                        </div>

                        <div className="text-right shrink-0">
                           <div className="border-[2px] border-slate-800 text-center w-48 shadow-sm">
                              <p className="text-[10px] font-bold border-b-[2px] border-slate-800 py-1 uppercase bg-slate-50 text-slate-800">No. sertifikat</p>
                              <p className="text-[12.5px] font-bold py-1 px-2 tracking-wider text-slate-900 font-mono leading-none">{certNumber}</p>
                           </div>
                        </div>
                    </div>

                    <div className="flex-1 space-y-6">
                        <h2 className="text-center text-[18px] font-bold underline decoration-slate-900 underline-offset-4 uppercase tracking-tight mb-6">
                          LAPORAN KALIBRASI {data.deviceName?.toUpperCase() || 'MIKROPIPET'}
                        </h2>

                        <div className="grid grid-cols-2 gap-x-12 px-2 text-[12.5px]">
                           <table className="w-full border-separate border-spacing-y-2">
                              <tbody>
                                <SummaryRow label="Instansi" value={data.fasyankesName} />
                                <SummaryRow label="Merk" value={data.brand} />
                                <SummaryRow label="Type" value={data.model} />
                                <SummaryRow label="Kapasitas" value={data.capacity || '100-1000 µL'} />
                              </tbody>
                           </table>
                           <table className="w-full border-separate border-spacing-y-2">
                              <tbody>
                                <SummaryRow label="No. Seri" value={data.serialNumber} />
                                <SummaryRow label="Lokasi Kalibrasi" value={data.location || 'skp'} />
                                <SummaryRow label="Tanggal Kalibrasi" value={formattedDate(data.createdAt)} />
                              </tbody>
                           </table>
                        </div>

                        <section className="space-y-5 px-2 pt-2">
                           <div className="space-y-1">
                              <h3 className="font-bold text-[13.5px] text-slate-900 uppercase tracking-tight">I. Kondisi Lingkungan</h3>
                              <div className="pl-5 space-y-1 text-[13px] text-slate-800">
                                 <div className="flex items-center gap-4">
                                    <span className="w-4 font-bold">1.</span>
                                    <span className="w-28 font-bold">Suhu</span>
                                    <span className="font-medium">: ( {temperature} ± {tempUnc} ) °C</span>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <span className="w-4 font-bold">2.</span>
                                    <span className="w-28 font-bold">Kelembaban</span>
                                    <span className="font-medium">: ( {humidity} ± {humUnc} ) %RH</span>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-1">
                              <h3 className="font-bold text-[13.5px] text-slate-900 uppercase tracking-tight">II. Alat yang digunakan</h3>
                              <div className="pl-5 space-y-1 text-[13px] text-slate-800">
                                 {data.calibratorNames?.length > 0 ? data.calibratorNames.map((name: string, i: number) => (
                                    <div key={i} className="flex items-center gap-4">
                                       <span className="w-4 font-bold">{i + 1}.</span>
                                       <span className="font-medium">{name}</span>
                                    </div>
                                 )) : data.calibratorIds?.length > 0 ? data.calibratorIds.map((id: string, i: number) => (
                                    <div key={id} className="flex items-center gap-4">
                                       <span className="w-4 font-bold">{i + 1}.</span>
                                       <span className="font-medium">Standard Calibrator ID: {id}</span>
                                    </div>
                                 )) : (
                                   <>
                                     <div className="flex items-center gap-4">
                                        <span className="w-4 font-bold">1.</span>
                                        <span className="font-medium">Electronic Top-Pan Balance</span>
                                     </div>
                                     <div className="flex items-center gap-4">
                                        <span className="w-4 font-bold">2.</span>
                                        <span className="font-medium">Thermometer Digital</span>
                                     </div>
                                   </>
                                 )}
                              </div>
                           </div>

                           <div className="space-y-3">
                              <h3 className="font-bold text-[13.5px] text-slate-900 uppercase tracking-tight">III. Hasil Kalibrasi</h3>
                              
                              <table className="w-full border-collapse border-[2px] border-slate-900 text-[12px] text-center shadow-sm">
                                 <thead className="bg-slate-100/80 font-bold text-slate-900">
                                    <tr>
                                       <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4">
                                          Titik Ukur<br/>
                                          <span className="font-normal font-serif italic text-[11px] text-slate-600">({data.unit || 'µL'})</span>
                                       </th>
                                       <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4">
                                          V<sub>20</sub><br/>
                                          <span className="font-normal font-serif italic text-[11px] text-slate-600">({data.unit || 'µL'})</span>
                                       </th>
                                       <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4">
                                          t<sub>air</sub><br/>
                                          <span className="font-normal font-serif italic text-[11px] text-slate-600">(°C)</span>
                                       </th>
                                       <th className="border-[1.8px] border-slate-900 px-2 py-2 w-1/4" colSpan={2}>
                                          Ketidakpastian<br/>
                                          <span className="font-normal font-serif italic text-[11px] text-slate-600">({data.unit || 'µL'})</span>
                                       </th>
                                    </tr>
                                 </thead>
                                 <tbody className="font-bold text-slate-900">
                                    {data.measurements?.map((m: any, idx: number) => {
                                      const showTAir = m.tAir || m.waterTemp || '20,4';
                                      const showV20 = m.actual !== undefined ? m.actual : (m.meanValue !== undefined ? m.meanValue : (m.penunjukan !== undefined ? m.penunjukan : '-'));
                                      return (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                           <td className="border-[1.8px] border-slate-900 py-[6px] font-black bg-slate-50/50">{m.point}</td>
                                           <td className="border-[1.8px] border-slate-900 py-[6px]">{showV20}</td>
                                           <td className="border-[1.8px] border-slate-900 py-[6px]">{showTAir}</td>
                                           <td className="border-[1.8px] border-slate-900 py-[6px] border-r-0 w-8 pr-1 text-right">±</td>
                                           <td className="border-[1.8px] border-slate-900 py-[6px] border-l-0 text-left pl-1">{m.uncertainty !== undefined ? (typeof m.uncertainty === 'number' ? m.uncertainty.toFixed(2) : m.uncertainty) : '0,04'}</td>
                                        </tr>
                                      );
                                    })}
                                    {(!data.measurements || data.measurements.length === 0) && (
                                       <>
                                         <tr className="hover:bg-slate-50">
                                            <td className="border-[1.8px] border-slate-900 py-2 font-black bg-slate-50/50">100</td>
                                            <td className="border-[1.8px] border-slate-900 py-2">99,67</td>
                                            <td className="border-[1.8px] border-slate-900 py-2">20,4</td>
                                            <td className="border-[1.8px] border-slate-900 py-2 border-r-0 w-8 pr-1 text-right">±</td>
                                            <td className="border-[1.8px] border-slate-900 py-2 border-l-0 text-left pl-1">0,04</td>
                                         </tr>
                                         <tr className="hover:bg-slate-50">
                                            <td className="border-[1.8px] border-slate-900 py-2 font-black bg-slate-50/50">500</td>
                                            <td className="border-[1.8px] border-slate-900 py-2">498,90</td>
                                            <td className="border-[1.8px] border-slate-900 py-2">20,4</td>
                                            <td className="border-[1.8px] border-slate-900 py-2 border-r-0 w-8 pr-1 text-right">±</td>
                                            <td className="border-[1.8px] border-slate-900 py-2 border-l-0 text-left pl-1">0,60</td>
                                         </tr>
                                         <tr className="hover:bg-slate-50">
                                            <td className="border-[1.8px] border-slate-900 py-2 font-black bg-slate-50/50">1000</td>
                                            <td className="border-[1.8px] border-slate-900 py-2">999,33</td>
                                            <td className="border-[1.8px] border-slate-900 py-2">20,4</td>
                                            <td className="border-[1.8px] border-slate-900 py-2 border-r-0 w-8 pr-1 text-right">±</td>
                                            <td className="border-[1.8px] border-slate-900 py-2 border-l-0 text-left pl-1">0,04</td>
                                         </tr>
                                       </>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </section>

                        <section className="space-y-4 px-2 pt-2">
                           <div className="space-y-2">
                              <h3 className="font-bold text-[13.5px] text-slate-900 uppercase underline decoration-slate-400 decoration-1 pb-0.5">Catatan :</h3>
                              <ul className="list-disc pl-6 text-[11px] text-slate-700 space-y-1.5 font-medium leading-relaxed">
                                 <li>Kalibrasi yang dilaporkan tertelusur ke satuan pengukuran SI melalui Puslit KIM-LIPI</li>
                                 <li>Ketidakpastian pengukuran dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k=2, dihitung secara kuadratik dari u<sub>c</sub> = √[ u₁² + u₂² + u₃² + u₄² ] di mana u₁ (Resolusi), u₂ (Sertifikat Standar), u₃ (Repeatability/Daya Ulang), dan u₄ (Drift instrumen)</li>
                                 <li>Standar yang digunakan adalah analitikal balance nomor seri 18107079 yang tertelusur ke Satuan SI Melalui Puslit KIM-LIPI dengan No.sertifikat S050976 dan thermometer digital dengan nomor seri 91360010 yang tertelusur ke satuan SI melalui Puslit KIM-LIPI dengan nomer sertifikat S 043516</li>
                                 <li className="list-none pt-2 flex flex-wrap items-center gap-3">
                                     <span className="font-bold italic text-[12.5px] text-slate-800">maka peralatan ini dinyatakan :</span>
                                     <span className={cn("font-bold uppercase tracking-tight text-[13.5px] px-3.5 py-0.5 border-[2px]", data.isPass !== false ? "text-emerald-700 border-emerald-700 bg-emerald-50" : "text-red-700 border-red-700 bg-red-50")}>
                                        {data.isPass !== false ? "ALAT BAIK DAN LAIK UNTUK DIGUNAKAN" : "ALAT TIDAK LAIK DIGUNAKAN"}
                                     </span>
                                 </li>
                              </ul>
                           </div>
                        </section>
                    </div>

                    <footer className="mt-auto pt-6 z-10 font-sans">
                       <p className="text-right text-[11px] font-bold text-slate-400 mb-2 px-2 italic">Halaman 2 dari 2</p>
                       <div className="border-[1.8px] border-slate-300 p-4 text-center text-[10.5px] text-slate-600 space-y-1 bg-slate-50/20">
                          <p className="font-bold text-slate-800 text-[11.5px] uppercase">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
                          <p className="italic font-serif leading-tight">Hasil hanya berhubungan dengan instrumen yang dikalibrasi dan laporan ini tidak boleh digandakan sebagian tanpa persetujuan <strong className="uppercase font-sans font-black text-slate-800">PT. Spektrum Kreasi Pratama</strong></p>
                       </div>
                    </footer>
                  </div>
               </div>

            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function InfoRow({ label, labelEng, value }: { label: string, labelEng: string, value: any }) {
  return (
    <div className="grid grid-cols-[220px_15px_1fr] items-start text-[14px] leading-snug">
      <div className="flex flex-col">
        <span className="font-bold text-slate-900 tracking-tight">{label}</span>
        <span className="text-[12px] italic text-slate-500 font-serif leading-none mt-0.5">{labelEng}</span>
      </div>
      <span className="font-bold text-slate-900 text-[14px] pt-1">:</span>
      <span className="font-bold text-slate-950 text-[14.5px] pt-0.5 tracking-tight">{value || '-'}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string, value: any }) {
  return (
    <tr>
       <td className="w-48 text-[13.5px] font-bold uppercase text-slate-700 py-1">{label}</td>
       <td className="w-8 text-center font-bold">:</td>
       <td className="text-[14px] font-bold pl-2 tracking-tight py-1">{value || '-'}</td>
    </tr>
  );
}

const OrnateBorderPattern = () => (
    <svg width="100%" height="100%" viewBox="0 0 793.7 1122.5" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <pattern id="border-pattern-prev" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
           <rect width="24" height="24" fill="#1e40af" />
           <circle cx="12" cy="12" r="11" fill="none" stroke="#60a5fa" strokeWidth="1.5" />
           <circle cx="12" cy="12" r="8" fill="none" stroke="#ffffff" strokeWidth="1.5" />
        </pattern>
      </defs>
      <rect x="2" y="2" width="789.7" height="1118.5" fill="none" stroke="#1e40af" strokeWidth="1.5" />
      <rect x="6" y="6" width="781.7" height="1110.5" fill="none" stroke="#1e40af" strokeWidth="0.8" />
      <rect x="12" y="12" width="769.7" height="1098.5" fill="url(#border-pattern-prev)" stroke="#1e40af" strokeWidth="20" className="opacity-95" />
      <rect x="24" y="24" width="745.7" height="1074.5" fill="none" stroke="#1e40af" strokeWidth="2" />
      <rect x="28" y="28" width="737.7" height="1066.5" fill="none" stroke="#1e40af" strokeWidth="0.8" />
    </svg>
);
