import React, { useState } from 'react';
import { 
  Printer, 
  Settings, 
  Maximize2, 
  RotateCw, 
  Grid, 
  Cpu, 
  FileCheck,
  Check,
  ChevronRight,
  ShieldCheck,
  Sliders
} from 'lucide-react';

interface LKStickerThermalPrintProps {
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
  qrCodeUrl: string;
  isLaik: boolean;
  onPrintSuccess?: () => void;
}

export function LKStickerThermalPrint({ lk, qrCodeUrl, isLaik, onPrintSuccess }: LKStickerThermalPrintProps) {
  // Config state for physical thermal printers
  const [stickerSize, setStickerSize] = useState<'50x30' | '40x30' | '100x50' | 'custom'>('50x30');
  const [customWidth, setCustomWidth] = useState<number>(50); // mm
  const [customHeight, setCustomHeight] = useState<number>(30); // mm
  
  const [qrPosition, setQrPosition] = useState<'left' | 'right' | 'center'>('left');
  const [qrSizePercent, setQrSizePercent] = useState<number>(28); // percentage of width
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0); // adjustment in pixels
  const [logoOption, setLogoOption] = useState<'both' | 'spektrum' | 'none'>('both');
  const [densityMode, setDensityMode] = useState<'high_contrast' | 'ultra_dark' | 'standard'>('ultra_dark');

  const formatDate = (dateVal: any) => {
    if (!dateVal) return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
    try {
      if (dateVal.toDate) {
        return dateVal.toDate().toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
      }
      return new Date(dateVal).toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch (e) {
      return new Date().toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
    }
  };

  const currentCalibDate = formatDate(lk.createdAt);
  
  // Expiry date helper + 1 year
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
    return nextDate.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const nextCalibDate = getNextCalibDate(lk.createdAt);

  // Active Dimensions calculator based on selection
  const getDimensions = () => {
    switch (stickerSize) {
      case '50x30': return { width: '50mm', height: '30mm', ratio: 'w-[500px] h-[300px]' };
      case '40x30': return { width: '40mm', height: '30mm', ratio: 'w-[400px] h-[300px]' };
      case '100x50': return { width: '100mm', height: '50mm', ratio: 'w-[650px] h-[325px]' };
      case 'custom': return { width: `${customWidth}mm`, height: `${customHeight}mm`, ratio: 'w-[500px] h-[300px]' };
    }
  };

  const dims = getDimensions();

  const handleExecuteThermalPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Define optimized styling parameters based on custom sliders
    const mainColor = isLaik ? '#000000' : '#000000'; // Pure black/white is best for thermal output
    const isStandardSized = stickerSize !== '100x50';
    
    // Build optimized sticker raw design HTML
    printWindow.document.write(`
      <html>
        <head>
          <title>THERMAL_PRINT_LK_${lk.id.slice(0, 8)}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,700&family=Inter:wght@400;700;900&display=swap');
            
            @page {
              size: ${dims.width} ${dims.height};
              margin: 0 !important;
            }
            
            body { 
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              width: ${dims.width};
              height: ${dims.height};
              display: flex;
              align-items: center;
              justify-content: center;
              background-color: #ffffff;
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .sticker-wrapper {
              width: 100%;
              height: 100%;
              padding: 4px 6px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              border: 1.5px solid #000000;
              border-radius: 4px;
              position: relative;
              overflow: hidden;
            }

            .sticker-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1.5px solid #000000;
              padding-bottom: 2px;
              margin-bottom: 2px;
            }

            .laik-sticker-badge {
              background-color: ${isLaik ? '#000000' : '#ffffff'};
              color: ${isLaik ? '#ffffff' : '#000000'};
              border: 1.5px solid #000000;
              font-weight: 900;
              text-align: center;
              padding: 1px 4px;
              border-radius: 2px;
              font-size: ${10 + fontSizeOffset}px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
            }

            .header-serial-id {
              font-family: 'Courier Prime', monospace;
              font-size: ${7 + fontSizeOffset}px;
              font-weight: 700;
              color: #000000;
            }

            .grid-container {
              display: flex;
              flex: 1;
              gap: 4px;
              min-height: 0;
              overflow: hidden;
              margin-bottom: 2px;
            }

            .qr-panel {
              width: ${qrSizePercent}%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              border: 1px solid #000000;
              padding: 2px;
              box-sizing: border-box;
              border-radius: 2px;
            }

            .qr-image {
              max-width: 100%;
              max-height: 100%;
              object-fit: contain;
              image-rendering: pixelated;
              filter: ${densityMode === 'high_contrast' ? 'contrast(3) saturate(0)' : 'contrast(5) brightness(0.95)'};
            }

            .metadata-panel {
              flex: 1;
              min-width: 0;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }

            .field-box {
              border-bottom: 0.5px dashed #000000;
              padding-bottom: 1px;
              margin-bottom: 1px;
            }

            .field-box:last-child {
              border-bottom: none;
            }

            .field-title {
              font-size: ${5.5 + fontSizeOffset}px;
              font-weight: 700;
              color: #444444;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              line-height: 1.1;
            }

            .field-text {
              font-size: ${7.5 + fontSizeOffset}px;
              font-weight: 950;
              color: #000000;
              text-transform: uppercase;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              line-height: 1.2;
            }

            .sticker-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-top: 1px solid #000000;
              padding-top: 2px;
              margin-top: auto;
            }

            .footer-brand {
              font-size: ${5.5 + fontSizeOffset}px;
              font-weight: 900;
              color: #000000;
              letter-spacing: 0.2px;
            }

            .footer-signature {
              font-size: ${5.5 + fontSizeOffset}px;
              font-family: 'Courier Prime', monospace;
              color: #000000;
              font-weight: 700;
            }
          </style>
        </head>
        <body>
          <div class="sticker-wrapper">
            <div class="sticker-header">
              <div class="laik-sticker-badge">${isLaik ? 'LAIK PAKAI (CALIBRATED)' : 'TIDAK LAIK (REJECTED)'}</div>
              <div class="header-serial-id">LK-${lk.id.slice(0, 8).toUpperCase()}</div>
            </div>
            
            <div class="grid-container" style="flex-direction: ${qrPosition === 'right' ? 'row-reverse' : 'row'}">
              <div class="qr-panel">
                <img class="qr-image" src="${qrCodeUrl}" />
              </div>
              
              <div class="metadata-panel">
                <div class="field-box">
                  <div class="field-title">NAMA ALAT MEDIS</div>
                  <div class="field-text">${lk.deviceName || 'Instrumen Medis'}</div>
                </div>
                <div class="field-box">
                  <div class="field-title">BRAND / NO. SERI</div>
                  <div class="field-text">${lk.brand || '-'} / ${lk.serialNumber || '-'}</div>
                </div>
                <div class="field-box" style="display: flex; justify-content: space-between; gap: 4px;">
                  <div style="flex: 1; min-width: 0;">
                    <div class="field-title">CALIB. DATE</div>
                    <div class="field-text" style="font-size: ${7 + fontSizeOffset}px">${currentCalibDate}</div>
                  </div>
                  <div style="flex: 1; min-width: 0;">
                    <div class="field-title">EXP. DATE</div>
                    <div class="field-text" style="font-size: ${7 + fontSizeOffset}px; font-weight: 900">${nextCalibDate}</div>
                  </div>
                </div>
                <div class="field-box">
                  <div class="field-title">AFILIASI FASYANKES</div>
                  <div class="field-text" style="font-size: 6.5px; font-weight: 700;">${lk.fasyankesName || 'INSTALASI NASIONAL'}</div>
                </div>
              </div>
            </div>

            <div class="sticker-footer">
              <div class="footer-brand">${logoOption !== 'none' ? 'PT QUANTUM PRECISION SYSTEMS' : 'SPEKTRUM CALIBRAPRO'}</div>
              <div class="footer-signature">PIC: ${lk.technicianName?.split(' ')[0] || 'METROLOGIST'}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => {
                window.close();
              }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    if (onPrintSuccess) onPrintSuccess();
  };

  return (
    <div className="bg-slate-50 dark:bg-[#090f23] rounded-3xl p-5 border border-slate-200 dark:border-slate-800 space-y-6">
      
      {/* Title */}
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <Sliders className="w-4 h-4 text-emerald-500" />
        <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 tracking-widest uppercase font-mono">
          Prasetel Printer Thermal
        </span>
      </div>

      {/* Control Grid */}
      <div className="space-y-4">
        {/* Preset Selector */}
        <div>
          <label className="block text-[8px] font-black text-slate-550 dark:text-slate-400 uppercase tracking-widest mb-1.5 font-mono">
            Ukuran Label Roll Fisik
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setStickerSize('50x30')}
              className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider rounded-xl border font-mono transition-colors cursor-pointer ${stickerSize === '50x30' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600'}`}
            >
              50 x 30 mm
            </button>
            <button
              onClick={() => setStickerSize('40x30')}
              className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider rounded-xl border font-mono transition-colors cursor-pointer ${stickerSize === '40x30' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600'}`}
            >
              40 x 30 mm
            </button>
            <button
              onClick={() => setStickerSize('100x50')}
              className={`py-2 px-1 text-[9px] font-black uppercase tracking-wider rounded-xl border font-mono transition-colors cursor-pointer ${stickerSize === '100x50' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600'}`}
            >
              100 x 50 mm
            </button>
          </div>
        </div>

        {/* Detailed Controls Slider Panel */}
        <div className="p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-2xl space-y-3.5">
          {/* Position */}
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Arah QR Code</span>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setQrPosition('left')}
                className={`px-2 py-1 text-[8px] font-black uppercase rounded ${qrPosition === 'left' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}
              >
                Kiri
              </button>
              <button 
                onClick={() => setQrPosition('right')}
                className={`px-2 py-1 text-[8px] font-black uppercase rounded ${qrPosition === 'right' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}
              >
                Kanan
              </button>
            </div>
          </div>

          {/* QR Size Slider */}
          <div>
            <div className="flex justify-between text-[9px] text-slate-400 font-extrabold mb-1">
              <span>RASIO QR CODE</span>
              <span className="font-mono text-indigo-500">{qrSizePercent}%</span>
            </div>
            <input 
              type="range" 
              min="20" 
              max="45" 
              value={qrSizePercent}
              onChange={(e) => setQrSizePercent(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* FontSize Scale Slider */}
          <div>
            <div className="flex justify-between text-[9px] text-slate-400 font-extrabold mb-1">
              <span>UKURAN HURUF (EQUAL PROPORTION)</span>
              <span className="font-mono text-indigo-500">{fontSizeOffset >= 0 ? `+${fontSizeOffset}` : fontSizeOffset}px</span>
            </div>
            <input 
              type="range" 
              min="-3" 
              max="4" 
              value={fontSizeOffset}
              onChange={(e) => setFontSizeOffset(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Density selection */}
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Metode Kontras Pita Thermal</span>
            <div className="flex gap-1">
              <button 
                onClick={() => setDensityMode('ultra_dark')}
                className={`px-2 py-1 text-[8px] font-black uppercase rounded ${densityMode === 'ultra_dark' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}
                title="Bagus untuk printer ribbon tua"
              >
                Ultra Gelap
              </button>
              <button 
                onClick={() => setDensityMode('high_contrast')}
                className={`px-2 py-1 text-[8px] font-black uppercase rounded ${densityMode === 'high_contrast' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-500'}`}
                title="Bagus untuk thermal direct standar"
              >
                Kontras Tinggi
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Real Thermal Execution Button */}
      <button
        onClick={handleExecuteThermalPrint}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl flex items-center justify-center gap-2 border border-indigo-500/10 cursor-pointer shadow-lg shadow-indigo-500/15 duration-300 transition-all active:scale-[0.98]"
      >
        <Printer className="w-4 h-4 animate-pulse" />
        Kirim ke Printer Thermal Roll
      </button>

      <div className="text-center">
        <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold tracking-wider leading-relaxed">
          Keluaran dioptimalkan untuk cetak monokrom pita thermal 203 DPI & 300 DPI tanpa distorsi pixelasi.
        </p>
      </div>

    </div>
  );
}
