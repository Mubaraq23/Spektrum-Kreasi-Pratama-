import React, { useState, useEffect } from 'react';
import {
  X, Download, Smartphone, Monitor, Apple, CheckCircle2,
  QrCode, Sparkles, ExternalLink, ShieldCheck, HardDrive,
  Info, Cpu, Share2, PlusSquare, ArrowRight, Laptop
} from 'lucide-react';
import QRCode from 'qrcode';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'pc' | 'ios';
}

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'android'
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'pc' | 'ios'>(defaultTab);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (defaultTab) setActiveTab(defaultTab);
  }, [defaultTab]);

  // Generate QR Code pointing to the current host / download
  useEffect(() => {
    const downloadUrl = `${window.location.origin}/spektrum-kalibrasi.apk`;
    QRCode.toDataURL(downloadUrl, {
      width: 200,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(setQrDataUrl).catch(console.error);
  }, []);

  // Listen for PWA beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert('Untuk menginstal di PC: Klik ikon "Install" ⊕ di address bar browser Anda (Chrome/Edge) atau pilih menu titik tiga ⋮ -> "Install Spektrum CalibraPro".');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Glow Ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-r from-indigo-500/20 via-rose-500/20 to-cyan-500/20 blur-2xl pointer-events-none" />

        {/* Modal Top Bar */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight font-mono">
                  Instal Spektrum CalibraPro
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono">
                  v1.0.0 NATIVE
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aplikasi multi-platform untuk Android, PC Desktop, dan iPhone
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Platform Selector Tabs */}
        <div className="px-6 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-white dark:bg-[#151f38] text-indigo-600 dark:text-rose-400 shadow-sm border border-slate-200/60 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Android (APK)</span>
            </button>
            <button
              onClick={() => setActiveTab('pc')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pc'
                  ? 'bg-white dark:bg-[#151f38] text-indigo-600 dark:text-rose-400 shadow-sm border border-slate-200/60 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>PC / Komputer</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white dark:bg-[#151f38] text-indigo-600 dark:text-rose-400 shadow-sm border border-slate-200/60 dark:border-slate-700/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Apple className="w-4 h-4" />
              <span>iOS (iPhone/iPad)</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* ═══════════ TAB 1: ANDROID APK ═══════════ */}
          {activeTab === 'android' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                {/* QR Code Column */}
                <div className="sm:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="QR Code Download APK"
                      className="w-36 h-36 rounded-xl shadow-inner border border-slate-200 dark:border-slate-700 p-1 bg-white"
                    />
                  ) : (
                    <div className="w-36 h-36 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  )}
                  <div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 font-mono uppercase tracking-wider">
                    <QrCode className="w-3 h-3 text-indigo-500" /> Scan via HP
                  </div>
                </div>

                {/* Direct Download & Info Column */}
                <div className="sm:col-span-8 space-y-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest font-mono mb-2">
                      <Cpu className="w-3 h-3" /> Paket APK Android Standalone
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      Unduh Berkas APK Resmi
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Instal langsung di perangkat Android tanpa Play Store. Mendukung mode offline penuh, kamera pemindai barcode, dan sinkronisasi Bluetooth kalibrator.
                    </p>
                  </div>

                  {/* Badges Info */}
                  <div className="flex flex-wrap gap-2 text-[10px] font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-rose-500" /> Ukuran: ~12.4 MB
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" /> Android 7.0+ (Nougat - 15)
                    </span>
                  </div>

                  {/* Primary Download Button */}
                  <a
                    href="/spektrum-kalibrasi.apk"
                    download="spektrum-kalibrasi.apk"
                    className="flex items-center justify-center gap-3 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-rose-500 dark:from-rose-500 dark:to-indigo-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download APK (12.4 MB)</span>
                  </a>
                </div>
              </div>

              {/* Android Installation Steps */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Info className="w-3.5 h-3.5 text-indigo-500" />
                  <span>3 Langkah Instalasi di Android:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <div className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-rose-400 font-bold flex items-center justify-center shrink-0 text-[10px]">1</span>
                    <span>Download file APK di atas</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-rose-400 font-bold flex items-center justify-center shrink-0 text-[10px]">2</span>
                    <span>Buka file dari notifikasi / Download</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-rose-400 font-bold flex items-center justify-center shrink-0 text-[10px]">3</span>
                    <span>Izinkan "Install unknown apps" & selesai</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 2: PC / DESKTOP PWA ═══════════ */}
          {activeTab === 'pc' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest font-mono">
                  <Laptop className="w-3 h-3" /> PWA Desktop Native (Windows, macOS, Linux)
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Instal Langsung di Komputer / Laptop PC
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Tidak memerlukan emulator Android atau file installer berat. Cukup pasang sebagai Progressive Web App (PWA) yang berjalan di jendela tersendiri layaknya software desktop profesional, dengan ikon di Desktop & Start Menu.
                </p>
              </div>

              {/* Install Action Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-rose-500/5 border border-indigo-500/20 dark:border-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Instalasi 1-Klik melalui Browser Desktop</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Didukung penuh oleh Google Chrome, Microsoft Edge, Brave, dan Opera.
                  </p>
                </div>

                <button
                  onClick={handleInstallPWA}
                  className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isInstalled ? 'Aplikasi Sudah Terpasang' : 'Pasang di Desktop'}</span>
                </button>
              </div>

              {/* Step by Step Visual Guidance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-rose-400 flex items-center justify-center font-mono text-[10px]">A</span>
                    <span>Melalui Address Bar Browser</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Perhatikan pojok kanan address bar di atas browser Anda. Klik ikon <b>⊕ (Install Spektrum CalibraPro)</b> atau ikon komputer, lalu klik "Install".
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <span className="w-5 h-5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-rose-400 flex items-center justify-center font-mono text-[10px]">B</span>
                    <span>Melalui Menu Browser (⋮)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Buka menu titik tiga (⋮) di pojok kanan atas browser Anda → pilih opsi <b>"Simpan dan bagikan" / "Instal Spektrum CalibraPro"</b>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════ TAB 3: iOS (iPhone / iPad) ═══════════ */}
          {activeTab === 'ios' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-widest font-mono">
                  <Apple className="w-3 h-3" /> Standar Apple iOS PWA
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Instal di iPhone atau iPad (iOS)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Pada perangkat Apple iOS (iPhone & iPad), aplikasi web dapat ditambahkan langsung ke Layar Utama (Home Screen) tanpa memerlukan App Store. Aplikasi akan berjalan layar penuh dengan performa native.
                </p>
              </div>

              {/* 3 Step Visual Guide */}
              <div className="space-y-3">
                <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 mt-0.5">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Langkah 1: Buka di Safari
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Pastikan Anda membuka website ini menggunakan browser bawaan Apple yaitu <b>Safari</b>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Langkah 2: Tap Tombol "Share" (Bagikan)
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Ketuk tombol <b>Bagikan (Share)</b> berupa ikon kotak dengan tanda panah ke atas di bilah bawah layar Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
                    <PlusSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Langkah 3: Pilih "Tambahkan ke Layar Utama"
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Gulir ke bawah pada menu yang muncul dan pilih opsi <b>"Tambahkan ke Layar Utama" (Add to Home Screen)</b>, lalu tap tombol "Tambah" di kanan atas.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Terakreditasi KAN LK-291-IDN & LP-1849-IDN</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
