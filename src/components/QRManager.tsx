import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Camera, 
  X, 
  Printer, 
  Download, 
  FileText, 
  Check, 
  Search, 
  Plus, 
  AlertCircle,
  RefreshCcw,
  Sparkles,
  Barcode,
  ArrowRight
} from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { translateToIndonesian } from '../pages/WorksheetEditor';
import { motion, AnimatePresence } from 'motion/react';

// Interfaces
interface EquipmentItem {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  maintenanceSchedule?: string;
  defaultMethodId?: string;
  createdAt?: any;
}

interface QRGeneratorProps {
  item: EquipmentItem;
  methods: any[];
  onClose: () => void;
}

interface QRScannerProps {
  onClose: () => void;
  equipmentList: EquipmentItem[];
  methods: any[];
}

export function QRGeneratorModal({ item, methods, onClose }: QRGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const qrValue = `${window.location.origin}/inventory?scan=${item.serialNumber}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        qrValue,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#0f172a', // deep slate-900
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
  }, [item, qrValue]);

  const handleDownload = () => {
    if (!downloadUrl) return;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `QR_TAG_${item.brand}_${item.serialNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${item.name} - Asset Tag</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              margin: 0; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              min-height: 100vh;
              background-color: white;
            }
            .tag-container {
              width: 380px;
              border: 3px double #0f172a;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              box-sizing: border-box;
            }
            .header {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #2563eb;
              margin-bottom: 2px;
              text-transform: uppercase;
            }
            .subheader {
              font-size: 8px;
              font-weight: 700;
              letter-spacing: 1.5px;
              color: #64748b;
              text-transform: uppercase;
              border-bottom: 1px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .qr-wrapper {
              margin: 15px 0;
              display: flex;
              justify-content: center;
            }
            .asset-name {
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
              color: #0f172a;
              margin: 8px 0;
            }
            .asset-meta {
              font-size: 9px;
              font-family: monospace;
              color: #475569;
              background: #f8fafc;
              padding: 6px;
              border-radius: 6px;
              border: 1px solid #f1f5f9;
            }
            .footer {
              margin-top: 15px;
              font-size: 8.5px;
              color: #94a3b8;
              font-weight: 700;
              letter-spacing: 1px;
            }
          </style>
        </head>
        <body>
          <div class="tag-container">
            <div class="header">SUMD INDONESIA</div>
            <div class="subheader">Spektrum Utama Metrologi Integrasi</div>
            <div class="qr-wrapper">
              <img src="${downloadUrl}" width="160" height="160" />
            </div>
            <div class="asset-name">LK-${item.name}</div>
            <div class="asset-meta">
              MERK: ${item.brand.toUpperCase()} | S/N: ${item.serialNumber.toUpperCase()}
            </div>
            <div class="footer">AUTO-VERIFIED ASSET STICKER</div>
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-md bg-white dark:bg-[#0c1221] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#070d19]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">Tanda Pengenal QR</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Identifikasi Aset Digital</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#141b2c] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Tutup"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          {/* Main design sticker */}
          <div className="w-full max-w-[280px] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 bg-slate-50/30 dark:bg-slate-950/20 text-center flex flex-col items-center shadow-inner">
            <span className="text-[9px] font-black tracking-[0.25em] text-[#06B6D4] uppercase font-mono mb-0.5">METROLOGY TAG</span>
            <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-3 w-full">SUMD AUTO-VERIFY</span>
            
            <div className="my-5 bg-white p-2.5 rounded-2xl shadow-md border border-slate-200/40">
              <canvas ref={canvasRef} className="max-w-[160px] h-auto" />
            </div>

            <h3 className="text-md font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none truncate w-full mb-1">LK-{item.name}</h3>
            <p className="text-[9px] font-black text-slate-400 dark:text-cyan-400/80 font-mono uppercase tracking-widest truncate w-full">
              {item.brand} &bull; S/N: {item.serialNumber}
            </p>
          </div>

          {/* Quick link copying */}
          <div className="mt-6 w-full flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-900">
            <p className="text-[9px] font-mono font-bold text-slate-400 truncate flex-1 pl-2">
              {qrValue}
            </p>
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-slate-100 dark:bg-[#141b2c] hover:bg-slate-200 dark:hover:bg-[#1f283d] text-slate-600 dark:text-slate-400 font-bold text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <QrCode className="w-3 h-3" />}
              {copied ? 'Tersalin' : 'Salin URL'}
            </button>
          </div>

          {/* Controls */}
          <div className="grid grid-cols-2 gap-4 w-full mt-8">
            <button
              onClick={handleDownload}
              className="py-4 bg-slate-100 dark:bg-[#141b2c] hover:bg-slate-200 dark:hover:bg-[#1f283d] text-slate-700 dark:text-slate-200 hover:text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Simpan Gambar
            </button>
            <button
              onClick={handlePrint}
              className="py-4 bg-[#06B6D4] text-slate-950 hover:bg-[#06b6d4]/90 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xl shadow-cyan-500/10"
            >
              <Printer className="w-4 h-4" />
              Cetak Sticker
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function QRScannerModal({ onClose, equipmentList, methods }: QRScannerProps) {
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scannedItem, setScannedItem] = useState<EquipmentItem | null>(null);
  const [worksheetsCount, setWorksheetsCount] = useState<number>(0);
  const [lastWorksheet, setLastWorksheet] = useState<any | null>(null);
  const [createdWorksheetId, setCreatedWorksheetId] = useState<string | null>(null);
  const [checking, setChecking] = useState<boolean>(false);
  const [manualSearch, setManualSearch] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanningStatus, setScanningStatus] = useState<string>('Memulai kamera...');
  
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Restart camera helper
  const startCamera = async () => {
    setScanningStatus('Sedang mengakses webcam...');
    const element = document.getElementById('qr-reader-target');
    if (!element) return;

    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (_) {}
      }

      const html5QrCode = new Html5Qrcode('qr-reader-target');
      scannerRef.current = html5QrCode;
      setScannerActive(true);
      setCameraPermission(true);

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width, height) => {
            const minSize = Math.min(width, height);
            const boxSize = Math.floor(minSize * 0.7);
            return { width: boxSize, height: boxSize };
          }
        },
        (decodedText) => {
          handleSuccessScan(decodedText);
        },
        () => {
          // Silent scan error
        }
      );
    } catch (err: any) {
      console.warn('Camera failed to start:', err);
      setCameraPermission(false);
      setScannerActive(false);
      setScanningStatus('Kamera tidak dapat diakses (mungkin diblokir oleh iframe browser). Silakan gunakan tab "Simulasi Scan"!');
    }
  };

  useEffect(() => {
    if (activeTab === 'camera') {
      setTimeout(() => {
        startCamera();
      }, 200);
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const stopCamera = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Stop scanner error:', err);
      }
    }
    scannerRef.current = null;
    setScannerActive(false);
  };

  const handleSuccessScan = async (decodedText: string) => {
    try {
      await stopCamera();
    } catch (_) {}

    setScanResult(decodedText);
    setChecking(true);

    // Extract serial number or handle straight S/N
    let snSearch = decodedText;
    if (decodedText.includes('?scan=')) {
      const url = new URL(decodedText);
      snSearch = url.searchParams.get('scan') || decodedText;
    }

    // Lookup item in equipmentList
    const matched = equipmentList.find(
      (eq) => 
        eq.serialNumber?.toLowerCase().trim() === snSearch.toLowerCase().trim() ||
        eq.id === snSearch ||
        eq.name?.toLowerCase().trim() === snSearch.toLowerCase().trim()
    );

    if (matched) {
      setScannedItem(matched);
      // Fetch worksheet stats from firestore
      try {
        const q = query(
          collection(db, 'worksheets'),
          where('serialNumber', '==', matched.serialNumber)
        );
        const querySnapshot = await getDocs(q);
        setWorksheetsCount(querySnapshot.size);
        
        let newest: any = null;
        querySnapshot.forEach((doc) => {
          const docData = { id: doc.id, ...doc.data() as any };
          if (!newest || (docData.createdAt?.seconds > newest.createdAt?.seconds)) {
            newest = docData;
          }
        });
        setLastWorksheet(newest);
      } catch (err) {
        console.error('Worksheets lookup error:', err);
      }
    } else {
      setScannedItem(null);
    }
    setChecking(false);
  };

  const createWorksheetForMatched = async () => {
    if (!scannedItem || !user) return;
    setChecking(true);

    try {
      const method = methods.find(m => m.id === scannedItem.defaultMethodId);

      const docRef = await addDoc(collection(db, 'worksheets'), {
        deviceId: scannedItem.id,
        deviceName: scannedItem.name,
        brand: scannedItem.brand,
        model: scannedItem.model,
        serialNumber: scannedItem.serialNumber,
        fasyankesName: '',
        location: '',
        methodId: scannedItem.defaultMethodId || '',
        methodName: translateToIndonesian(method?.title || 'No Method Selected'),
        technicianId: user.uid,
        technicianName: profile?.displayName || user.email,
        status: 'draft',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        inspections: {
          physical: {},
          functional: {},
          electrical: { enabled: false, results: {} }
        },
        measurements: [],
        results: {
          pass: false,
          notes: ''
        }
      });

      setCreatedWorksheetId(docRef.id);
      navigate(`/worksheets/${docRef.id}/edit`);
      onClose();
    } catch (err) {
      console.error('Error creating worksheet via QR:', err);
    } finally {
      setChecking(false);
    }
  };

  const filteredSearch = equipmentList.filter(eq =>
    eq.name?.toLowerCase().includes(manualSearch.toLowerCase()) ||
    eq.brand?.toLowerCase().includes(manualSearch.toLowerCase()) ||
    eq.serialNumber?.toLowerCase().includes(manualSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#0c1221] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-[#070d19]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">Scanner QR Spektrum</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Identifikasi Unit & Pengujian Instan</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#141b2c] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Tutup"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        {!scanResult && (
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 mx-6 mt-6 rounded-2xl border border-slate-200/40 dark:border-slate-900">
            <button
              onClick={() => setActiveTab('camera')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'camera' ? 'bg-white dark:bg-[#10192d] text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Camera className="w-4 h-4" />
              Scan Kamera
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'manual' ? 'bg-white dark:bg-[#10192d] text-slate-800 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Sparkles className="w-4 h-4" />
              Simulasi Kode
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1">
          <AnimatePresence mode="wait">
            {!scanResult ? (
              // STEP 1: Scanning Mode
              <motion.div
                key="step-scanning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {activeTab === 'camera' ? (
                  <div className="flex flex-col items-center">
                    {/* QR Viewfinder Frame */}
                    <div className="relative w-full aspect-video bg-slate-950 rounded-3xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center min-h-[220px]">
                      {cameraPermission === false && (
                        <div className="p-6 text-center max-w-sm">
                          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Kamera tidak dapat diakses atau diblokir oleh iFrame sandboxed. Gunakan tab <strong>Simulasi Kode</strong> untuk mencoba alur kerja scan!
                          </p>
                        </div>
                      )}
                      
                      <div id="qr-reader-target" className="w-full h-full" />
                      
                      {scannerActive && (
                        <div className="absolute inset-0 border-2 border-emerald-500, pointer-events-none rounded-3xl animation-pulse">
                          <div className="absolute top-1/2 left-1/10 right-1/10 h-0.5 bg-emerald-400 shadow-xl shadow-emerald-500/80 animate-bounce" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 text-center uppercase tracking-widest mt-4">
                      {scanningStatus}
                    </p>
                  </div>
                ) : (
                  // Manual simulation lookup
                  <div className="space-y-4">
                    <div className="relative flex items-center">
                      <Search className="absolute left-4 text-slate-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="Ketik S/N, Merk, atau Nama Alat..."
                        value={manualSearch}
                        onChange={(e) => setManualSearch(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold focus:outline-none focus:border-cyan-555 placeholder:text-slate-400"
                      />
                    </div>

                    <div className="max-h-[200px] overflow-y-auto space-y-2 border border-slate-100 dark:border-slate-900 rounded-2xl p-2 bg-slate-50/20 dark:bg-slate-950/10 divide-y divide-slate-100 dark:divide-slate-900">
                      {filteredSearch.length > 0 ? (
                        filteredSearch.map((eq) => (
                          <button
                            key={eq.id}
                            onClick={() => handleSuccessScan(eq.serialNumber)}
                            className="w-full p-3 hover:bg-cyan-500/5 hover:border-cyan-500/25 border border-transparent rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group"
                          >
                            <div>
                              <p className="text-[11px] font-black uppercase text-slate-900 dark:text-white">LK-{eq.name}</p>
                              <p className="text-[9px] text-[#D4AF37] font-mono uppercase font-black">{eq.brand} &bull; S/N: {eq.serialNumber}</p>
                            </div>
                            <div className="flex items-center gap-1 bg-cyan-100 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 px-2 py-1 rounded-lg text-[8px] font-black uppercase font-mono tracking-wider opacity-60 group-hover:opacity-100 transition-opacity">
                              <span>SIMULASI SCAN</span>
                              <Barcode className="w-3.5 h-3.5" />
                            </div>
                          </button>
                        ))
                      ) : (
                        <p className="text-center py-6 text-[10px] text-slate-400 font-mono italic">Alat tidak ditemukan.</p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              // STEP 2: Match Result Display panel
              <motion.div
                key="step-result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-6"
              >
                {scannedItem ? (
                  <div className="space-y-6">
                    <div className="bg-emerald-500/10 p-5 rounded-[2rem] border border-emerald-500/20 flex gap-4 items-center">
                      <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white">
                        <Check className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest font-mono">ID Alat Valid</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                          Aset berhasil diidentifikasi di database sistem Spektrum Utama.
                        </p>
                      </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-900/60 flex flex-col gap-4">
                      <div className="flex justify-between items-start border-b border-slate-200/50 dark:border-slate-900 pb-3">
                        <div>
                          <span className="text-[8px] font-black text-[#06B6D4] uppercase tracking-widest font-mono font-bold">DEVICE REGISTER</span>
                          <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase italic">LK-{scannedItem.name}</h4>
                        </div>
                        <span className="text-[10px] font-black text-[#D4AF37] uppercase font-mono bg-amber-500/10 px-2 py-1 rounded-lg">
                          {scannedItem.brand}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Serial Number</p>
                          <p className="text-[11px] font-black text-slate-800 dark:text-white mt-0.5">{scannedItem.serialNumber}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Model / Sched</p>
                          <p className="text-[11px] font-black text-slate-800 dark:text-white mt-0.5">
                            {scannedItem.model || '-'} / {scannedItem.maintenanceSchedule || 'Daily'}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/50 dark:border-slate-900 pt-3">
                        <p className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">Spesifikasi Metode Kerja</p>
                        <p className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-300 mt-1 uppercase">
                          {(() => {
                            const mt = methods.find(m => m.id === scannedItem.defaultMethodId);
                            return mt ? translateToIndonesian(mt.title) : 'Belum Terhubung MK';
                          })()}
                        </p>
                      </div>

                      {/* Worksheet history indicator */}
                      <div className="border-t border-slate-200/50 dark:border-slate-900 pt-3 flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Hubungan Lembar Kerja</span>
                        <span className="bg-indigo-500/10 px-2.5 py-1 text-indigo-500 font-black rounded-full font-mono text-[9px] uppercase tracking-wider">
                          {worksheetsCount} Lembar Kerja Ditemukan
                        </span>
                      </div>
                    </div>

                    {/* Actions menu based on scan matched */}
                    <div className="space-y-3.5 pt-2">
                      {lastWorksheet && (
                        <button
                          onClick={() => {
                            navigate(`/worksheets/${lastWorksheet.id}/edit`);
                            onClose();
                          }}
                          className="w-full py-4 px-6 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-800 dark:text-white flex items-center justify-between shadow-sm cursor-pointer group transition-all"
                        >
                          <span className="flex items-center gap-2.5">
                            <FileText className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                            Buka Lembar Kerja Terakhir ({lastWorksheet.status})
                          </span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      )}

                      <button
                        onClick={createWorksheetForMatched}
                        disabled={checking}
                        className="w-full py-4 px-6 bg-[#06B6D4] text-slate-950 hover:bg-[#06b6d4]/90 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-xl shadow-cyan-500/10 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {checking ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Plus className="w-5 h-5" />}
                        Mulai Pengujian / Kalibrasi Baru
                      </button>
                    </div>
                  </div>
                ) : (
                  // No matched item found at all
                  <div className="py-8 text-center space-y-6">
                    <div className="w-16 h-16 bg-red-500/15 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20 shadow-md">
                      <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Aset Belum Terdaftar</h3>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed font-mono">
                        Hasil Scan: "{scanResult}" tidak terhubung dengan alat apa pun di database inventaris.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setScanResult(null);
                        setScannedItem(null);
                        setActiveTab('manual');
                      }}
                      className="px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-[#141b2c] dark:hover:bg-[#1f283d] rounded-2xl text-[10px] uppercase tracking-widest font-black text-slate-700 dark:text-white transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <RefreshCcw className="w-3.5 h-3.5" />
                      Coba Scan Ulang
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
