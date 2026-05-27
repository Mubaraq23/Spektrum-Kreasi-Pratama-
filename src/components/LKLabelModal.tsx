import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Printer, 
  Download, 
  Check, 
  Award,
  ShieldCheck,
  QrCode,
  FileText,
  AlertTriangle,
  RefreshCw,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { LKStickerThermalPrint } from './LKStickerThermalPrint';

interface LKLabelProps {
  lk: {
    id: string;
    deviceName?: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    fasyankesName?: string;
    technicianName?: string;
    createdAt?: any;
    status?: string;
  };
  onClose: () => void;
}

export function LKLabelModal({ lk, onClose }: LKLabelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isLaik, setIsLaik] = useState(true); // Toggle Laik vs Tidak Laik Sticker
  const [labelSize, setLabelSize] = useState<'standard' | 'small'>('standard');
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');

  const qrValue = `${window.location.origin}/worksheets/${lk.id}/edit`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrValue,
        {
          width: 250,
          margin: 1,
          color: {
            dark: '#1e293b', // slate-800
            light: '#ffffff', // pure white
          },
          errorCorrectionLevel: 'H'
        },
        (error) => {
          if (error) console.error('Error generating QR code:', error);
          else if (canvasRef.current) {
            setDownloadUrl(canvasRef.current.toDataURL('image/png'));
          }
        }
      );
    }
  }, [lk, qrValue]);

  // Synchronize equipment status in the medicalEquipment inventory database
  useEffect(() => {
    const syncStatusToInventory = async () => {
      if (!lk.serialNumber) return;
      setSyncState('syncing');
      try {
        const equipmentRef = collection(db, 'medicalEquipment');
        const q = query(equipmentRef, where('serialNumber', '==', lk.serialNumber));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const targetStatus = isLaik ? 'LAIK PAKAI' : 'TIDAK LAIK';
          const promises = querySnapshot.docs.map(docSnapshot => {
            return updateDoc(doc(db, 'medicalEquipment', docSnapshot.id), {
              status: targetStatus,
              lastCalibratedAt: serverTimestamp(),
              lastCalibrationResult: isLaik ? 'Lulus' : 'Tidak Lulus',
              updatedAt: serverTimestamp()
            });
          });
          await Promise.all(promises);
          setSyncState('synced');
        } else {
          // No matching equipment found in database, that is fine
          setSyncState('idle');
        }
      } catch (err) {
        console.error("Gagal sinkronisasi data fungsional status alkes:", err);
        setSyncState('failed');
      }
    };

    syncStatusToInventory();
  }, [lk.serialNumber, isLaik]);

  const formatDate = (dateVal: any) => {
    if (!dateVal) return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    try {
      if (dateVal.toDate) {
        return dateVal.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      }
      return new Date(dateVal).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  const getNextCalibDate = (dateVal: any) => {
    let baseDate = new Date();
    if (dateVal) {
      try {
        if (dateVal.toDate) baseDate = dateVal.toDate();
        else baseDate = new Date(dateVal);
      } catch (e) {}
    }
    const nextDate = new Date(baseDate);
    nextDate.setFullYear(nextDate.getFullYear() + 1);
    return nextDate.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const currentCalibDate = formatDate(lk.createdAt);
  const nextCalibDate = getNextCalibDate(lk.createdAt);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `QR_LK_${lk.deviceName || 'Alat'}_${lk.serialNumber || lk.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const mainColor = isLaik ? '#16a34a' : '#dc2626';
    const mainBadgeText = isLaik ? 'LAIK PAKAI' : 'TIDAK LAIK';
    const subBadgeText = isLaik ? 'PASSED CALIBRATION' : 'FAILED / REJECTED';

    printWindow.document.write(`
      <html>
        <head>
          <title>Label Kalibrasi - LK-${lk.id.slice(0, 8).toUpperCase()}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,400;0,700;0,900;1,900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              background-color: white;
            }
            .label-sticker {
              width: ${labelSize === 'standard' ? '420px' : '320px'};
              border: 4px solid ${mainColor};
              border-radius: 16px;
              padding: ${labelSize === 'standard' ? '18px' : '12px'};
              position: relative;
              box-sizing: border-box;
              background-color: white;
            }
            .badge-banner {
              background-color: ${mainColor};
              color: white;
              font-weight: 900;
              font-style: italic;
              text-align: center;
              font-size: ${labelSize === 'standard' ? '22px' : '17px'};
              padding: 6px 0;
              border-radius: 8px;
              letter-spacing: 2px;
              margin-bottom: ${labelSize === 'standard' ? '14px' : '10px'};
            }
            .grid-container {
              display: flex;
              gap: 12px;
            }
            .qr-side {
              flex: 0 0 ${labelSize === 'standard' ? '120px' : '90px'};
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .qr-code-img {
              width: ${labelSize === 'standard' ? '110px' : '85px'};
              height: ${labelSize === 'standard' ? '110px' : '85px'};
              border: 1px solid #e2e8f0;
              padding: 2px;
              border-radius: 6px;
            }
            .qr-caption {
              font-size: 7px;
              font-weight: 700;
              color: #64748b;
              margin-top: 5px;
              text-align: center;
              letter-spacing: 0.5px;
            }
            .info-side {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .field-row {
              margin-bottom: ${labelSize === 'standard' ? '6px' : '4px'};
              border-bottom: 1px dashed #f1f5f9;
              padding-bottom: 3px;
            }
            .field-label {
              font-size: ${labelSize === 'standard' ? '8px' : '7px'};
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .field-value {
              font-size: ${labelSize === 'standard' ? '11px' : '9.5px'};
              font-weight: 900;
              color: #0f172a;
              text-transform: uppercase;
              line-height: 1.2;
            }
            .tagline-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-top: 8px;
              font-size: 8px;
              border-top: 2px solid ${mainColor};
              padding-top: 8px;
            }
            .kps-logo {
              font-weight: 900;
              font-style: italic;
              color: #1e3a8a;
              letter-spacing: 1px;
            }
            .cert-no {
              font-family: monospace;
              color: #475569;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="label-sticker">
            <div class="badge-banner">${mainBadgeText}</div>
            
            <div class="grid-container">
              <div class="qr-side">
                <img class="qr-code-img" src="${downloadUrl}" />
                <div class="qr-caption">PINDAI UNTUK VERIFIKASI</div>
              </div>
              <div class="info-side">
                <div class="field-row">
                  <div class="field-label">Nama Alat Medis</div>
                  <div class="field-value">${lk.deviceName || '-'}</div>
                </div>
                <div class="field-row">
                  <div class="field-label">Merk / Tipe / No. Seri</div>
                  <div class="field-value">${lk.brand || '-'} / ${lk.model || '-'} / ${lk.serialNumber || '-'}</div>
                </div>
                <div class="field-row" style="display: flex; gap: 10px;">
                  <div style="flex: 1;">
                    <div class="field-label">Tgl Pengujian</div>
                    <div class="field-value" style="font-size: ${labelSize === 'standard' ? '10px' : '8.5px'}">${currentCalibDate}</div>
                  </div>
                  <div style="flex: 1;">
                    <div class="field-label">Kalibrasi Ulang</div>
                    <div class="field-value" style="font-size: ${labelSize === 'standard' ? '10px' : '8.5px'}; color: #1e40af">${nextCalibDate}</div>
                  </div>
                </div>
                <div class="field-row">
                  <div class="field-label">Asosiasi Fasyankes</div>
                  <div class="field-value" style="font-size: ${labelSize === 'standard' ? '9px' : '8px'}; font-weight: 700; color: #475569">${lk.fasyankesName || '-'}</div>
                </div>
              </div>
            </div>

            <div class="tagline-row">
              <div class="kps-logo">PT. QUANTUM PRECISION SYSTEMS</div>
              <div class="cert-no">LK-${lk.id.slice(0, 8).toUpperCase()}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white dark:bg-[#10192d] w-full max-w-2xl rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-md ${isLaik ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-400' : 'bg-red-50 text-red-600 dark:bg-red-950/35 dark:text-red-400'}`}>
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight italic">Cetak Label Fisik LK</h2>
              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono mt-0.5">Generator Label Kalibrasi Standard & QR</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-2xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="px-8 pb-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Real-time database sync notification */}
          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-[#06B6D4] flex items-center justify-center shrink-0">
                <Database className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">Status Sinkronisasi Inventaris</span>
                <span className="text-[10px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {syncState === 'syncing' && 'Menghubungkan ke pangkalan data PT Spektrum...'}
                  {syncState === 'synced' && `SINKRON: Status S/N ${lk.serialNumber || 'Alat'} diperbarui ke ${isLaik ? 'LAIK PAKAI' : 'TIDAK LAIK'}`}
                  {syncState === 'failed' && 'Koneksi database gagal. Status lokal dipertahankan.'}
                  {syncState === 'idle' && `SIAP: Tidak ada kecocokan S/N ${lk.serialNumber || '-'} di inventaris primer`}
                </span>
              </div>
            </div>
            <div>
              {syncState === 'syncing' ? (
                <RefreshCw className="w-4.5 h-4.5 text-blue-500 animate-spin" />
              ) : syncState === 'synced' ? (
                <span className="px-2.5 py-1 text-[8px] font-black bg-emerald-500 text-white rounded-full uppercase tracking-wider font-mono">TERHUBUNG</span>
              ) : syncState === 'failed' ? (
                <span className="px-2.5 py-1 text-[8px] font-black bg-rose-500 text-white rounded-full uppercase tracking-wider font-mono">ERROR</span>
              ) : (
                <span className="px-2.5 py-1 text-[8px] font-black bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full uppercase tracking-wider font-mono">STANDBY</span>
              )}
            </div>
          </div>

          {/* Settings Control Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80">
            <div>
              <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-2 font-mono">Status Kelaikan Label</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLaik(true)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${isLaik ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/15' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  Laik Pakai
                </button>
                <button
                  type="button"
                  onClick={() => setIsLaik(false)}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${!isLaik ? 'bg-red-600 text-white shadow-lg shadow-red-500/15' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  Tidak Laik
                </button>
              </div>
            </div>

            <div>
              <label className="text-[9px] text-slate-400 font-black uppercase tracking-widest block mb-2 font-mono">Ukuran Label Cetak</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLabelSize('standard')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${labelSize === 'standard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  Standard (4x10cm)
                </button>
                <button
                  type="button"
                  onClick={() => setLabelSize('small')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${labelSize === 'small' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/15' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'}`}
                >
                  Kecil (3x8cm)
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Live Preview of physical label */}
          <div className="flex flex-col items-center justify-center p-6 bg-slate-100 dark:bg-[#070d19] rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-4 font-mono">PREVIEW FISIK STICKER LABEL</span>
            
            <div 
              style={{ maxWidth: '380px' }}
              className={`w-full bg-white border-4 ${isLaik ? 'border-emerald-600' : 'border-red-600'} rounded-[1.2rem] p-4 text-slate-950 relative shadow-xl transition-all duration-300`}
            >
              {/* Header block with laik status */}
              <div className={`w-full ${isLaik ? 'bg-emerald-600' : 'bg-red-600'} text-white text-center font-black italic tracking-widest rounded-lg py-1.5 text-[15px] sm:text-[18px] uppercase mb-3 transition-colors`}>
                {isLaik ? 'LAIK PAKAI' : 'TIDAK LAIK'}
              </div>

              {/* Main row grid */}
              <div className="flex gap-4">
                <div className="w-[85px] shrink-0 flex flex-col items-center justify-center">
                  <canvas ref={canvasRef} className="hidden" />
                  {downloadUrl ? (
                    <img src={downloadUrl} alt="QR Code" className="w-[80px] h-[80px] border border-slate-100 p-0.5 rounded-lg bg-white" />
                  ) : (
                    <div className="w-[80px] h-[80px] bg-slate-100 animate-pulse rounded-lg" />
                  )}
                  <span className="text-[6px] font-black text-slate-400 mt-2 tracking-widest uppercase">PINDAI VERIFIKASI</span>
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="border-b border-dashed border-slate-100 pb-1">
                    <span className="text-[7px] font-black text-slate-400 block uppercase tracking-wider">Nama Alat Medis</span>
                    <span className="font-extrabold text-[11px] uppercase tracking-tight line-clamp-1 truncate text-slate-900">{lk.deviceName || 'Alat Medis'}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-100 pb-1">
                    <span className="text-[7px] font-black text-slate-400 block uppercase tracking-wider">Merek / No Seri</span>
                    <span className="font-extrabold text-[11px] uppercase tracking-tight line-clamp-1 truncate text-slate-900">{lk.brand || '-'} / {lk.serialNumber || '-'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-100 pb-1">
                    <div>
                      <span className="text-[7px] font-black text-slate-400 block uppercase tracking-wider font-mono">Tgl Pengujian</span>
                      <span className="font-extrabold text-[9.5px] uppercase tracking-tight text-slate-900">{currentCalibDate}</span>
                    </div>
                    <div>
                      <span className="text-[7px] font-black text-slate-400 block uppercase tracking-wider font-mono">Kalibrasi Ulang</span>
                      <span className="font-extrabold text-[9.5px] uppercase tracking-tight text-blue-700">{nextCalibDate}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[7px] font-black text-slate-400 block uppercase tracking-wider">Asosiasi</span>
                    <span className="font-semibold text-[8.5px] tracking-tight uppercase line-clamp-1 truncate text-slate-600">{lk.fasyankesName || 'INSTALASI NASIONAL'}</span>
                  </div>
                </div>
              </div>

              {/* Tagline footer details */}
              <div className={`mt-3 pt-2.5 border-t-2 ${isLaik ? 'border-emerald-600' : 'border-red-600'} flex items-center justify-between text-[7.5px] font-black tracking-wider uppercase`}>
                <span className="text-[#1E3A8A] italic">PT. QUANTUM PRECISION SYSTEMS</span>
                <span className="font-mono text-slate-500">LK-{lk.id.slice(0, 8).toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* New Physical Thermal Printer Roll Configurations Layout */}
          {downloadUrl && (
            <LKStickerThermalPrint lk={lk} qrCodeUrl={downloadUrl} isLaik={isLaik} />
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handlePrint}
              className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 border border-blue-500/10 cursor-pointer shadow-lg shadow-blue-500/15 duration-300 transition-all active:scale-[0.98]"
            >
              <Printer className="w-4.5 h-4.5" />
              Cetak A4 Standard
            </button>
            <button
              onClick={handleDownload}
              className="px-6 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 cursor-pointer duration-300 transition-all active:scale-[0.98]"
            >
              <Download className="w-4.5 h-4.5" />
              Download QR PNG
            </button>
            <button
              onClick={handleCopyLink}
              className="px-6 py-4 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-800 cursor-pointer duration-300 transition-all active:scale-[0.98]"
            >
              <Check className="w-4.5 h-4.5 text-emerald-500" />
              {copied ? 'Tersalin!' : 'Copy Link LK'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
