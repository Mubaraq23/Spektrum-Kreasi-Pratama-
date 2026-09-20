/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { 
  X, 
  Award, 
  Printer,
  FileCheck2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getUniversalMeasurements } from '../lib/metrologyUtils';

interface CertificatePreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}

export function CertificatePreview({ isOpen, onClose, data }: CertificatePreviewProps) {
  const navigate = useNavigate();
  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

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

  const certNumber = data.certificateNumber || `${new Date().getFullYear()}/SKP/${(data.id || '04129').slice(0, 5).toUpperCase()}`;
  const temperature = data.environmentalData?.temperature || data.tempInitial || '25.0';
  const humidity = data.environmentalData?.humidity || data.humInitial || '55.0';
  const tempUnc = data.environmentalData?.tempUncertainty || '0.4';
  const humUnc = data.environmentalData?.humUncertainty || '4.0';

  const deviceName = data.deviceName || 'Alat Medis';
  const measurements = getUniversalMeasurements(data);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-md no-print"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-[#0c1427] w-full max-w-5xl h-full max-h-[92vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col no-print border border-slate-200 dark:border-slate-800"
          >
            {/* Header Toolbar */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-4 sm:p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between no-print shrink-0">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                    <Award className="w-5 h-5" />
                 </div>
                 <div>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">Pratinjau Sertifikat Resmi</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{certNumber} • {deviceName}</p>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 {data.id && (
                   <button 
                    onClick={() => {
                      onClose();
                      navigate(`/certificates/${data.id}`);
                    }}
                    className="px-4 py-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-blue-100 transition-all flex items-center gap-1.5"
                   >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Detail Lengkap
                   </button>
                 )}

                 <button 
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm"
                 >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak
                 </button>

                 <button 
                  onClick={onClose}
                  title="Tutup"
                  aria-label="Tutup"
                  className="p-2 bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-300 transition-all"
                 >
                     <X className="w-4 h-4" />
                 </button>
              </div>
            </div>

            {/* Scrollable Preview Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-8 bg-slate-200/50 dark:bg-[#060a15] flex flex-col items-center gap-12">
              {/* PAGE 1 */}
              <div className="scale-[0.42] sm:scale-[0.62] md:scale-[0.85] xl:scale-95 origin-top mb-[-190mm] sm:mb-[-130mm] md:mb-[-40mm] xl:mb-0 min-w-max shadow-2xl rounded-sm">
                <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[12mm] font-sans overflow-hidden border border-slate-300 flex flex-col justify-between box-border">
                  <div className="absolute inset-0 pointer-events-none p-3 z-20">
                    <div className="w-full h-full border-[1.5px] border-blue-900 p-1">
                      <div className="w-full h-full border-[0.5px] border-blue-800 p-1">
                        <div className="w-full h-full border-[0.3px] border-slate-300" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full px-6 py-4 justify-between">
                    <div>
                      <div className="flex items-center gap-4 justify-start pb-3 border-b-2 border-blue-800">
                        <div className="w-12 h-12 flex items-center justify-center bg-blue-50 rounded-xl border border-blue-100 shrink-0">
                          <Award className="w-8 h-8 text-blue-700" />
                        </div>
                        <div>
                          <h1 className="text-xl font-black text-blue-800 uppercase tracking-tight font-sans leading-none">PT. SPEKTRUM KREASI PRATAMA</h1>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">Laboratorium Kalibrasi &amp; Pengujian Metrologi Alat Kesehatan</p>
                        </div>
                      </div>

                      <div className="text-center space-y-1 mt-6 mb-6">
                        <h2 className="text-2xl font-bold italic underline decoration-slate-900 underline-offset-4 tracking-tight font-serif uppercase">Sertifikat Kalibrasi</h2>
                        <p className="text-sm font-bold italic text-slate-500 font-serif uppercase">CALIBRATION CERTIFICATE</p>
                        <div className="inline-block bg-slate-50 border border-slate-300 px-4 py-1 rounded-lg mt-2">
                          <p className="text-xs font-bold font-mono text-slate-900 tracking-wider">{certNumber}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-6">
                        <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200 pb-1">Identitas Pemilik / Owner Identity</h3>
                        <div className="space-y-1.5 pt-1 pl-1">
                          <PreviewInfoRow label="Nama Pemilik" labelEng="Customer" value={data.fasyankesName} />
                          <PreviewInfoRow label="Alamat" labelEng="Address" value={data.fasyankesAddress || data.location} />
                          <PreviewInfoRow label="Tanggal Terima Unit" labelEng="Unit Received Date" value={formattedAtDate(data.createdAt || data.issuedAt)} />
                          <PreviewInfoRow label="Tanggal Kalibrasi" labelEng="Date of Calibration" value={formattedAtDate(data.createdAt || data.issuedAt)} />
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <h3 className="text-[11px] font-bold text-blue-800 uppercase tracking-wider border-b border-slate-200 pb-1">Identitas Instrumen / Instrument Identity</h3>
                        <div className="space-y-1.5 pt-1 pl-1">
                          <PreviewInfoRow label="Nama Alat" labelEng="Instrument Name" value={data.deviceName} />
                          <PreviewInfoRow label="Merek / Pabrikan" labelEng="Manufacture" value={data.brand} />
                          <PreviewInfoRow label="Tipe / Model" labelEng="Type / Model" value={data.model} />
                          <PreviewInfoRow label="Nomor Seri" labelEng="Serial Number" value={data.serialNumber} />
                          <PreviewInfoRow label="Lokasi Kalibrasi" labelEng="Place of Calibration" value={data.location || 'Laboratorium / In-Situ'} />
                          <PreviewInfoRow label="Tanggal Terbit" labelEng="Date of Issued" value={formattedAtDate(data.createdAt || data.issuedAt, 1)} />
                          <PreviewInfoRow label="Masa Berlaku" labelEng="Calibration Expired" value={data.nextCalibrationDate || formattedExpiryDate(data.createdAt || data.issuedAt)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end pb-4 border-t border-slate-200 pt-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <FileCheck2 className="w-6 h-6 text-blue-600" />
                          <span className="text-[9px] font-mono font-bold uppercase">Terakreditasi ISO/IEC 17025</span>
                        </div>

                        <div className="text-center min-w-[220px]">
                          <p className="font-bold text-[11px] uppercase tracking-wide text-slate-900 font-sans mb-1">PT. SPEKTRUM KREASI PRATAMA</p>
                          <div className="h-14 flex items-center justify-center relative my-1">
                            <div className="w-24 h-10 border border-blue-600 rounded-full flex items-center justify-center opacity-85 rotate-[-6deg] text-blue-700 font-bold text-[8px] uppercase tracking-tighter">
                              ★ RESMI ★
                            </div>
                          </div>
                          <p className="font-bold text-xs text-slate-900 border-b border-slate-800 pb-0.5 inline-block px-4">Faustina Dao S.Tr.Tem</p>
                          <p className="font-bold text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">Manager Teknis</p>
                        </div>
                      </div>

                      <footer className="text-center space-y-1 pt-2 border-t border-slate-200">
                         <p className="text-[9px] font-bold text-slate-400 font-mono">Halaman 1 dari 2</p>
                         <p className="text-[8px] font-bold text-slate-600 font-sans">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
                      </footer>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 2 */}
              <div className="scale-[0.42] sm:scale-[0.62] md:scale-[0.85] xl:scale-95 origin-top min-w-max shadow-2xl rounded-sm">
                <div className="bg-white text-slate-900 w-[210mm] h-[297mm] min-h-[297mm] max-h-[297mm] relative p-[12mm] font-sans flex flex-col justify-between border border-slate-300 overflow-hidden box-border">
                  <div className="absolute inset-0 pointer-events-none p-3 z-20">
                    <div className="w-full h-full border-[1.5px] border-blue-900 p-1">
                      <div className="w-full h-full border-[0.5px] border-blue-800 p-1">
                        <div className="w-full h-full border-[0.3px] border-slate-300" />
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-col h-full px-6 py-4 justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b-2 border-blue-900 pb-3 mb-4 w-full">
                        <div className="flex items-center gap-3">
                          <Award className="w-7 h-7 text-blue-700" />
                          <h1 className="text-sm font-black text-blue-800 tracking-tight uppercase font-sans">PT. SPEKTRUM KREASI PRATAMA</h1>
                        </div>
                        <div className="border border-slate-800 text-center px-3 py-1 bg-slate-50 rounded-md">
                          <p className="text-[7.5px] font-bold uppercase text-slate-600">No. Sertifikat</p>
                          <p className="text-[10px] font-bold text-slate-900 font-mono">{certNumber}</p>
                        </div>
                      </div>

                      <h2 className="text-center text-sm font-bold underline decoration-slate-900 underline-offset-4 uppercase tracking-tight mb-4">
                        LAPORAN HASIL KALIBRASI — {deviceName.toUpperCase()}
                      </h2>

                      <div className="grid grid-cols-2 gap-4 px-2 text-[10px] mb-4 bg-slate-50/70 p-3 rounded-lg border border-slate-200">
                        <div className="space-y-1">
                          <p><strong className="text-slate-600">Instansi:</strong> {data.fasyankesName || '-'}</p>
                          <p><strong className="text-slate-600">Merek / Model:</strong> {data.brand || '-'} / {data.model || '-'}</p>
                          <p><strong className="text-slate-600">Nomor Seri:</strong> {data.serialNumber || '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p><strong className="text-slate-600">Metode:</strong> {data.methodName || 'Protokol Standar Kalibrasi'}</p>
                          <p><strong className="text-slate-600">Lokasi:</strong> {data.location || 'Laboratorium / In-Situ'}</p>
                          <p><strong className="text-slate-600">Tanggal:</strong> {formattedDate(data.createdAt || data.issuedAt)}</p>
                        </div>
                      </div>

                      <div className="space-y-3 px-1">
                        <div>
                          <h3 className="font-bold text-[10px] text-blue-900 uppercase">I. Kondisi Lingkungan</h3>
                          <div className="text-[9.5px] text-slate-800 flex gap-8 pl-3 mt-0.5 font-medium">
                            <span>1. Suhu Ruang : ( {temperature} ± {tempUnc} ) °C</span>
                            <span>2. Kelembaban : ( {humidity} ± {humUnc} ) %RH</span>
                          </div>
                        </div>

                        <div>
                          <h3 className="font-bold text-[10px] text-blue-900 uppercase mb-1">II. Hasil Pengukuran Metrologis</h3>
                          
                          <table className="w-full border-collapse border border-slate-900 text-[9px] text-center">
                            <thead className="bg-slate-100 font-bold text-slate-900">
                              <tr>
                                <th className="border border-slate-900 px-2 py-1.5">Parameter Uji</th>
                                <th className="border border-slate-900 px-2 py-1.5">Nilai Setting</th>
                                <th className="border border-slate-900 px-2 py-1.5">Nilai Terukur</th>
                                <th className="border border-slate-900 px-2 py-1.5">Deviasi</th>
                                <th className="border border-slate-900 px-2 py-1.5">U95 (k=2)</th>
                                <th className="border border-slate-900 px-2 py-1.5">Batas MPE</th>
                                <th className="border border-slate-900 px-2 py-1.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-900">
                              {measurements.map((m: any, idx: number) => {
                                const isPass = m.status === 'Lolos';
                                return (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="border border-slate-900 py-1 px-2 text-left font-medium">{m.parameterName}</td>
                                    <td className="border border-slate-900 py-1 font-mono">{m.point} {m.unit || ''}</td>
                                    <td className="border border-slate-900 py-1 font-mono">{m.actual}</td>
                                    <td className="border border-slate-900 py-1 font-mono">{m.deviation}</td>
                                    <td className="border border-slate-900 py-1 font-mono text-blue-700 font-bold">±{m.uncertainty}</td>
                                    <td className="border border-slate-900 py-1 font-mono">±{m.tolerance}</td>
                                    <td className={cn("border border-slate-900 py-1 font-bold", isPass ? "text-emerald-700" : "text-red-600")}>
                                      {isPass ? "LOLOS" : "FAIL"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-2">
                          <h3 className="font-bold text-[9.5px] text-slate-900 uppercase">Catatan :</h3>
                          <ul className="list-disc pl-5 text-[8.5px] text-slate-700 space-y-0.5 leading-relaxed">
                            <li>Kalibrasi yang dilaporkan tertelusur ke satuan pengukuran SI melalui SNSU-BSN / Puslit KIM-LIPI.</li>
                            <li>Ketidakpastian pengukuran bentangan U95 dilaporkan pada tingkat kepercayaan sekitar 95% dengan faktor cakupan k = 2.</li>
                            <li className="list-none pt-1">
                              <div className={cn(
                                "p-1.5 rounded border font-bold text-[9px] text-center",
                                data.isPass !== false
                                  ? "bg-emerald-50 border-emerald-600 text-emerald-800"
                                  : "bg-red-50 border-red-600 text-red-800"
                              )}>
                                KESIMPULAN: ALAT DINYATAKAN {data.isPass !== false ? "MEMENUHI PERSYARATAN MPE (LAIK OPERASIONAL)" : "TIDAK LAIK OPERASIONAL"}
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <footer className="pt-3 border-t border-slate-200">
                      <p className="text-right text-[8.5px] font-bold text-slate-400 mb-1 italic">Halaman 2 dari 2</p>
                      <div className="border border-slate-300 p-2 text-center text-[8px] text-slate-600 space-y-0.5 bg-slate-50/50">
                        <p className="font-bold text-slate-800 uppercase">Jl. K.H.M. Yusuf Raya No.14, Mekar Jaya, Sukmajaya, Kota Depok, Jawa Barat 16411, Indonesia</p>
                      </div>
                    </footer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PreviewInfoRow({ label, labelEng, value }: { label: string, labelEng: string, value: any }) {
  return (
    <div className="grid grid-cols-[180px_12px_1fr] items-start text-xs leading-tight">
      <div className="flex flex-col">
        <span className="font-bold text-slate-900">{label}</span>
        <span className="text-[9.5px] italic text-slate-500 font-serif leading-none mt-0.5">{labelEng}</span>
      </div>
      <span className="font-bold text-slate-900">:</span>
      <span className="font-bold text-slate-950 font-sans tracking-tight">{value || '-'}</span>
    </div>
  );
}
