import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Logo } from '../components/Logo';
import { Interactive3DCanvas } from '../components/Interactive3DCanvas';
import { Tilt3D } from '../components/Tilt3D';
import {
  Zap,
  Shield,
  ShieldCheck,
  Activity,
  FileCheck,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Award,
  Database,
  CheckCircle2,
  HeartPulse,
  Thermometer,
  Gauge,
  Cpu,
  Sun,
  Moon,
  HelpCircle,
  Check,
  AlertTriangle,
  ChevronDown,
  Info,
  Scale,
  Settings,
  QrCode,
  FileSpreadsheet,
  Menu,
  X,
  Star,
  Globe,
  Lock,
  BarChart3,
  Atom,
  TrendingUp,
  Search,
  Layers
} from 'lucide-react';

const STATS = [
  { value: '2,400+', label: 'Alat Terkalibrasi', sub: 'Across 150+ Fasyankes' },
  { value: '99.8%', label: 'Akurasi Sistem', sub: 'ISO/IEC 17025 Grade' },
  { value: '< 3 min', label: 'Waktu Generate LK', sub: 'Per Lembar Kerja' },
  { value: '100%', label: 'KAN Compliant', sub: 'Standar Metrologi Legal' },
];

export function Landing() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Framer Motion Parallax Transforms
  const { scrollY } = useScroll();
  const parallaxBgY = useTransform(scrollY, [0, 600], [0, 180]);
  const parallaxTextY = useTransform(scrollY, [0, 600], [0, 80]);
  const parallaxCardY = useTransform(scrollY, [0, 600], [0, -40]);
  const heroFadeOpacity = useTransform(scrollY, [0, 500], [1, 0]);

  // Calibration Simulator state
  const [simType, setSimType] = useState<'suhu' | 'timbangan' | 'tekanan'>('suhu');
  const [simRef, setSimRef] = useState<number>(37.0);
  const [simRead, setSimRead] = useState<number>(37.12);
  const [simRes, setSimRes] = useState<number>(0.01);
  const [simTolerance, setSimTolerance] = useState<number>(0.2);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (simType === 'suhu') { setSimRef(37.0); setSimRead(37.12); setSimRes(0.01); setSimTolerance(0.2); }
    else if (simType === 'timbangan') { setSimRef(100.0); setSimRead(100.015); setSimRes(0.001); setSimTolerance(0.05); }
    else { setSimRef(5.0); setSimRead(4.91); setSimRes(0.05); setSimTolerance(0.15); }
  }, [simType]);

  const simDeviation = Number((simRead - simRef).toFixed(4));
  const u_res = simRes / Math.sqrt(12);
  const u_master = simType === 'suhu' ? 0.02 : simType === 'timbangan' ? 0.002 : 0.03;
  const u_repeatability = Math.abs(simDeviation) * 0.15;
  const u_combined = Math.sqrt(u_res * u_res + u_master * u_master + u_repeatability * u_repeatability);
  const simUnc = Number((2 * u_combined).toFixed(4));
  const passStrict = Math.abs(simDeviation) + simUnc <= simTolerance;
  const passSimple = Math.abs(simDeviation) <= simTolerance;
  const unit = simType === 'suhu' ? '°C' : simType === 'timbangan' ? 'g' : 'bar';

  const categories = [
    { name: 'Elektromedik & Defibrilator', icon: HeartPulse, color: 'from-rose-500 to-pink-600', desc: 'Defibrilator, simulator ECG/NIBP, syringe pump, patient monitor dengan ketidakpastian ultra-rendah.' },
    { name: 'Radiologi & Imaging', icon: Atom, color: 'from-violet-500 to-indigo-600', desc: 'Kalibrasi paparan radiasi X-ray, mammografi, akurasi dosis radioterapi bersertifikat nasional.' },
    { name: 'Laboratorium & Suhu', icon: Thermometer, color: 'from-amber-500 to-orange-600', desc: 'Inkubator bayi, autoclave, freezer medis rantai dingin, water bath presisi berstandar fisis.' },
    { name: 'Tekanan & Aliran Gas', icon: Gauge, color: 'from-teal-500 to-cyan-600', desc: 'Manometer draf, suction pump, ventilator paru, anesthesia machine, vaporiser analog.' },
  ];

  const steps = [
    { title: 'Scan QR Aset', desc: 'Pindai kode QR aset untuk mendaftarkan atau menarik data spesifikasi instrumen secara kilat.', icon: QrCode, color: 'from-blue-500 to-indigo-600' },
    { title: 'Input Lembar Kerja', desc: 'Isi draf pengujian dengan antarmuka dinamis yang meminimalkan distorsi pengisian fisis.', icon: FileSpreadsheet, color: 'from-cyan-500 to-teal-600' },
    { title: 'Auto-Calculate U95', desc: 'Algoritme otomatis menghitung deviasi dan ketidakpastian standar k=2 tanpa hitungan manual.', icon: Cpu, color: 'from-purple-500 to-violet-600' },
    { title: 'Cetak Label Thermal', desc: 'Dapatkan stiker kelaikan fisik dengan QR unik tersinkronisasi ke inventaris alkes.', icon: CheckCircle2, color: 'from-emerald-500 to-green-600' },
  ];

  const faqs = [
    { q: 'Bagaimana CalibraPro menjamin kepatuhan ISO/IEC 17025?', a: 'CalibraPro memaksakan rumus ketidakpastian baku ganda (U95), memantau audit trail anti-manipulasi, serta menerapkan Decision Rule KAN secara ketat pada pengisian draf teknisi.' },
    { q: 'Apakah modul OCR & Gemini AI dapat membaca semua format sertifikat kalibrator?', a: 'Ya! Dengan teknologi Gemini 1.5 Pro Extractor, sistem dapat memindai berkas sertifikat PDF/Gambar dari laboratorium eksternal manapun dan mencatat parameter koreksi secara instan.' },
    { q: 'Bagaimana Decision Rule diimplementasikan saat penentuan status lolos medik?', a: 'Sistem mendukung Simple Acceptance (tanpa guard band) maupun Strict Acceptance (k=2 guard-band) yang memastikan status alat lulus hanya jika deviasi + ketidakpastian ≤ toleransi pabrikan.' },
    { q: 'Apakah platform mendukung mode luring (offline-first)?', a: 'Ya. Platform memiliki penyimpanan draf lokal (localStorage/IndexedDB) dan menyinkronkan seluruh draf secara otomatis dengan Firebase Cloud terenkripsi setelah koneksi tersedia.' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#030612] text-slate-900 dark:text-white overflow-x-hidden transition-colors duration-500">
      
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <Interactive3DCanvas density="high" opacity={0.65} interactive={true} />
        <div className="absolute top-[-200px] right-[-200px] w-[800px] h-[800px] bg-blue-500/8 dark:bg-blue-500/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-200px] left-[-200px] w-[600px] h-[600px] bg-indigo-500/8 dark:bg-cyan-500/8 rounded-full blur-[130px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-violet-500/5 rounded-full blur-[100px]" />
      </div>

      {/* ===== NAVBAR ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 dark:bg-[#040a18]/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800/80 shadow-lg shadow-slate-900/5 dark:shadow-black/30' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 sm:h-18">
          
          <button onClick={() => navigate('/')} className="flex items-center max-w-[220px]">
            <Logo className="text-slate-900 dark:text-white" />
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {[['#services', 'Layanan'], ['#workflow', 'Alur Kerja'], ['#calculator', 'Playground U95'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all font-mono hover:text-blue-600 dark:hover:text-cyan-400 ${
                label === 'Playground U95' ? 'text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
              }`}>{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <Link to="/dashboard" className="hidden sm:flex px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20 items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Dashboard
              </Link>
            ) : (
              <Link to="/login" className="hidden sm:flex px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-95 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-blue-500/20 items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Akses Portal
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:hidden bg-white/98 dark:bg-[#040a18]/98 border-t border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              <nav className="px-4 py-5 space-y-2">
                {[['#services', 'Layanan'], ['#workflow', 'Alur Kerja'], ['#calculator', 'Playground U95'], ['#faq', 'FAQ']].map(([href, label]) => (
                  <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400 hover:bg-slate-50 dark:hover:bg-slate-900/50 rounded-xl transition-all font-mono">
                    {label}
                  </a>
                ))}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  {user
                    ? <Link to="/dashboard" className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"><BarChart3 className="w-3.5 h-3.5" /> Dashboard</Link>
                    : <Link to="/login" className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"><Lock className="w-3.5 h-3.5" /> Akses Portal</Link>
                  }
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section ref={heroRef} className="relative pt-28 sm:pt-36 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  {/* Left: Text */}
          <motion.div className="space-y-8" style={{ y: parallaxTextY, opacity: heroFadeOpacity }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-cyan-400 text-[9px] font-black tracking-[0.3em] uppercase mb-6">
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping" />
                Platform Kalibrasi Alkes Terintegrasi v4.5
              </span>
              
              <h1 className="text-5xl sm:text-6xl xl:text-7xl font-black tracking-tighter leading-[0.95] text-slate-900 dark:text-white">
                METROLOGI<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 dark:from-blue-400 dark:via-cyan-400 dark:to-indigo-400">
                  CALIBRA
                </span>
                <span className="text-slate-900 dark:text-white">PRO</span>
              </h1>
            </motion.div>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-xl">
              Platform integrasi kalibrasi alat kesehatan berstandar <strong className="text-slate-800 dark:text-white">KAN & Kemenkes RI</strong>. Sinkronisasi otomatis, generator stiker thermal QR, dan asisten ekstraksi cerdas bertenaga <strong className="text-blue-600 dark:text-cyan-400">Gemini AI</strong>.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-4">
              <Link to={user ? '/dashboard' : '/login'}
                className="group flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]">
                {user ? 'Buka Dashboard' : 'Masuk Terminal Operasi'}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#workflow"
                className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-all">
                Pelajari Alur Kerja
              </a>
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.35 }}
              className="flex flex-wrap gap-x-6 gap-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              {[
                { icon: ShieldCheck, text: 'ISO 17025 Compliant', color: 'text-emerald-500' },
                { icon: Award, text: 'KAN Accredited', color: 'text-amber-500' },
                { icon: Database, text: 'Auto Sync DB', color: 'text-blue-500' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">
                  <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} /> {text}
                </div>
              ))}
            </motion.div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.96, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            transition={{ duration: 0.8, delay: 0.15 }}
            style={{ y: parallaxCardY, opacity: heroFadeOpacity }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-cyan-500/10 rounded-[3rem] blur-3xl -z-10 animate-pulse" />
            
            <Tilt3D intensity={8}>
              <div className="bg-white dark:bg-[#060d1f] border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                {/* Card Top Bar */}
                <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <div className="ml-auto flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black font-mono text-emerald-500 uppercase tracking-widest">Live Sync</span>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-px bg-slate-100 dark:bg-slate-800">
                  {[
                    { label: 'Alat Aktif', value: '284', color: 'text-blue-600 dark:text-cyan-400' },
                    { label: 'Laik Pakai', value: '97.2%', color: 'text-emerald-500' },
                    { label: 'Pending LK', value: '12', color: 'text-amber-500' },
                  ].map(item => (
                    <div key={item.label} className="bg-white dark:bg-[#060d1f] p-4 text-center">
                      <p className={`text-xl font-black font-mono ${item.color}`}>{item.value}</p>
                      <p className="text-[8px] font-bold uppercase text-slate-400 tracking-wider mt-1">{item.label}</p>
                    </div>
                  ))}
                </div>

                {/* Sticker Preview */}
                <div className="p-5 space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">Demo Stiker Thermal QR</p>
                  
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/40">
                    <div className="flex gap-4 items-center">
                      <div className="w-16 h-16 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl p-2 shrink-0 flex items-center justify-center">
                        <QrCode className="w-full h-full text-slate-800 dark:text-slate-200" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate">Syringe Pump Presisi</p>
                        <p className="text-[9px] font-mono text-slate-400">S/N: SP-982701X</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-wide">LAIK PAKAI — KAN Certified</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[8px] font-mono">
                      <div>
                        <span className="text-slate-400">KALIBRASI:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold ml-1">14 MEI 2026</span>
                      </div>
                      <div>
                        <span className="text-slate-400">BERLAKU:</span>
                        <span className="text-emerald-500 font-bold ml-1">14 MEI 2027</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-indigo-500" />
                      <div>
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-wider">Status Inventaris</p>
                        <p className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">TERUPDATE INSTAN</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono font-black text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">SYNC OK ✓</span>
                  </div>
                </div>
              </div>
            </Tilt3D>

            {/* Floating Badge */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-br from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-500/30 text-[8px] font-black uppercase tracking-widest z-20">
              ⚡ ISO 17025
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== STATS STRIP ===== */}
      <section className="py-12 border-y border-slate-100 dark:border-slate-800/60 bg-slate-50/60 dark:bg-slate-950/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center">
                <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-mono">{stat.value}</p>
                <p className="text-xs font-black text-slate-700 dark:text-white uppercase tracking-wider mt-1">{stat.label}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUST BADGES ===== */}
      <section className="py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {[
            { icon: Award, color: 'text-amber-500', title: 'LK-291-IDN & LP-1849', sub: 'Terakreditasi KAN' },
            { icon: Shield, color: 'text-blue-500', title: 'ISO/IEC 17025', sub: 'Standar Metrologi Internasional' },
            { icon: Cpu, color: 'text-cyan-500', title: 'Gemini 1.5 Pro', sub: 'AI Document Extractor' },
            { icon: Globe, color: 'text-emerald-500', title: 'KEMENKES RI', sub: 'Regulasi Alat Kesehatan' },
          ].map(({ icon: Icon, color, title, sub }) => (
            <div key={title} className="flex items-center gap-3 group">
              <div className={`w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-800 dark:text-white leading-none">{title}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== WORKFLOW STEPS ===== */}
      <section id="workflow" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/60 dark:bg-[#040812]/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-blue-600 dark:text-cyan-400 font-mono">
              <Settings className="w-4 h-4 animate-spin" style={{ animationDuration: '8s' }} />
              Proses Digital Terintegrasi
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Alur Kerja <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">4 Langkah</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-2xl mx-auto">
              Dari pemindaian awal hingga pengesahan digital dan pembaruan inventaris secara seketika.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                  className="h-full"
                >
                  <Tilt3D intensity={10} className="h-full">
                    <div className="group relative bg-white dark:bg-[#070d1f] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 h-full">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <span className="text-[10px] font-black font-mono text-slate-300 dark:text-slate-600 absolute top-6 right-6">0{idx + 1}</span>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-3 tracking-tight">{step.title}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{step.desc}</p>
                    </div>
                  </Tilt3D>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== SERVICES CATEGORIES ===== */}
      <section id="services" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-blue-600 dark:text-cyan-400 font-mono">
              <Sparkles className="w-4 h-4" /> Program Standardisasi Medis
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Kategori Pengujian <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Kalibrasi</span>
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {categories.map((cat, idx) => {
              const Icon = cat.icon;
              return (
                <motion.div key={idx}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }}
                  className="h-full"
                >
                  <Tilt3D intensity={8} className="h-full">
                    <div className="group flex gap-6 items-start p-7 sm:p-9 rounded-[2.5rem] bg-white dark:bg-[#070d1f] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xl transition-all duration-300 cursor-pointer h-full">
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform`}>
                        <Icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{cat.name}</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{cat.desc}</p>
                      </div>
                    </div>
                  </Tilt3D>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== METROLOGY PLAYGROUND ===== */}
      <section id="calculator" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50/60 dark:bg-[#040812]/60 border-y border-slate-200 dark:border-slate-800/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-400 font-mono">
              <Activity className="w-4 h-4 animate-pulse" /> Live Metrology Engine
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              U95 Calculator <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">Playground</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-xl mx-auto">
              Simulasikan kalkulasi deviasi & ketidakpastian U95 (k=2) sesuai kaidah ISO 17025 secara langsung.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Panel */}
            <div className="lg:col-span-7 bg-white dark:bg-[#070d1f] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest font-mono text-slate-700 dark:text-white mb-6 flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-600 dark:bg-cyan-500 rounded-full" />
                Konfigurasi Parameter
              </h3>

              {/* Type Selector */}
              <div className="grid grid-cols-3 gap-2 mb-7">
                {([['suhu', Thermometer, 'PM / Suhu'], ['timbangan', Scale, 'Timbangan'], ['tekanan', Gauge, 'Manometer']] as const).map(([type, Icon, label]) => (
                  <button key={type} onClick={() => setSimType(type as any)}
                    className={`py-4 px-2 rounded-2xl text-[9px] font-black uppercase tracking-wider font-mono transition-all flex flex-col items-center gap-2 border cursor-pointer ${
                      simType === type
                        ? 'bg-blue-600 dark:bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-900/40 text-slate-500 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}>
                    <Icon className="w-5 h-5" /> {label}
                  </button>
                ))}
              </div>

              <div className="space-y-6">
                {/* Reference */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Nilai Acuan Standar (y<sub>ref</sub>)</span>
                    <span className="font-mono font-black text-blue-600 dark:text-cyan-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg text-[11px]">{simRef} {unit}</span>
                  </div>
                  <input type="range" min={simType === 'suhu' ? 20 : simType === 'timbangan' ? 1 : 0.1} max={simType === 'suhu' ? 120 : simType === 'timbangan' ? 500 : 20} step={simType === 'suhu' ? 0.5 : simType === 'timbangan' ? 1 : 0.1} value={simRef} onChange={e => setSimRef(Number(e.target.value))} className="w-full accent-blue-600 cursor-pointer" />
                </div>

                {/* Observed */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">Pembacaan Alat DUT (y<sub>read</sub>)</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg text-[11px]">{simRead} {unit}</span>
                  </div>
                  <input type="range" min={(simRef - (simType === 'suhu' ? 1.5 : simType === 'timbangan' ? 0.3 : 0.8)).toFixed(3)} max={(simRef + (simType === 'suhu' ? 1.5 : simType === 'timbangan' ? 0.3 : 0.8)).toFixed(3)} step={simRes} value={simRead} onChange={e => setSimRead(Number(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" />
                </div>

                {/* Resolution & Tolerance */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">Resolusi Alat</label>
                    <select value={simRes} onChange={e => setSimRes(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value={0.1}>0.1 (Kasar)</option>
                      <option value={0.01}>0.01 (Sedang)</option>
                      <option value={0.001}>0.001 (Presisi)</option>
                      <option value={0.0001}>0.0001 (Mikro)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 font-mono">Toleransi (MPE)</label>
                    <select value={simTolerance} onChange={e => setSimTolerance(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-mono p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      {simType === 'suhu' && (<><option value={0.10}>±0.10 °C</option><option value={0.20}>±0.20 °C</option><option value={0.50}>±0.50 °C</option></>)}
                      {simType === 'timbangan' && (<><option value={0.01}>±0.010 g</option><option value={0.05}>±0.050 g</option><option value={0.15}>±0.150 g</option></>)}
                      {simType === 'tekanan' && (<><option value={0.05}>±0.05 bar</option><option value={0.15}>±0.15 bar</option><option value={0.40}>±0.40 bar</option></>)}
                    </select>
                  </div>
                </div>
              </div>

              <p className="flex items-start gap-2 text-[10px] text-slate-400 font-medium mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 leading-relaxed">
                <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                u_c = √[u_master² + (Res/√12)² + u_rep²] × k=2
              </p>
            </div>

            {/* Results */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-[#071030] to-[#040816] text-white rounded-[2rem] p-6 sm:p-8 shadow-2xl border border-blue-900/40 h-full flex flex-col">
                <div className="mb-6">
                  <p className="text-[9px] font-black tracking-widest text-cyan-400 uppercase font-mono">CALIBRA-SIM ENGINE</p>
                  <h4 className="text-xl font-black mt-1 uppercase tracking-tight">Hasil Penilaian Fisis</h4>
                </div>

                <div className="space-y-4 flex-1">
                  {[
                    { label: 'Besar Penyimpangan', value: `${simDeviation > 0 ? `+${simDeviation}` : simDeviation} ${unit}`, color: 'text-white bg-white/10' },
                    { label: 'Ketidakpastian U95 (k=2)', value: `±${simUnc} ${unit}`, color: 'text-cyan-400 bg-cyan-500/15' },
                    { label: 'Toleransi Pabrikan (MPE)', value: `±${simTolerance} ${unit}`, color: 'text-amber-400 bg-amber-500/10' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center py-3 border-b border-white/5">
                      <span className="text-xs text-slate-400 font-medium">{label}</span>
                      <span className={`text-sm font-mono font-black px-3 py-1 rounded-lg ${color}`}>{value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className={`p-5 rounded-2xl border flex items-start gap-3 ${
                    passStrict ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-rose-500/15 border-rose-500/30'
                  }`}>
                    {passStrict
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                      : <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                    }
                    <div>
                      <p className={`text-xs font-black uppercase tracking-wider ${passStrict ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {passStrict ? '✓ LAIK PAKAI — Guard-Band Compliant' : '✗ TIDAK LAIK — Melewati Batas Regulasi'}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium mt-1 leading-relaxed">
                        {passStrict
                          ? 'Alat berada di zona aman metrologi. Kesalahan fisis tidak melompati guard band pabrikan.'
                          : 'Alat melanggar batas regulasi! Deviasi + U95 melebihi toleransi MPE yang ditetapkan.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section id="faq" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-blue-600 dark:text-cyan-400 font-mono">
              <HelpCircle className="w-4 h-4" /> Knowledge Base & Compliance
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Tanya Jawab <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">Regulasi</span>
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.08 }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070d1f] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer">
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-wide">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <div className="px-6 pb-6 pt-0 text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 pt-4">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA SECTION ===== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 mx-4 sm:mx-8 lg:mx-16 mb-16 rounded-[3rem] bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-tight">
            Siap Digitalisasi<br />Kalibrasi Anda?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base font-medium max-w-xl mx-auto">
            Bergabunglah dengan 150+ fasyankes yang sudah mempercayakan manajemen kalibrasi kepada CalibraPro.
          </p>
          <Link to={user ? '/dashboard' : '/login'}
            className="inline-flex items-center gap-3 px-10 py-4 bg-white text-blue-700 font-black rounded-2xl text-sm uppercase tracking-wider hover:bg-blue-50 transition-all shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98]">
            {user ? 'Buka Dashboard Saya' : 'Mulai Gratis Sekarang'}
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-7 h-7 text-cyan-400 fill-cyan-400" />
                <span className="text-2xl font-black italic tracking-widest">SPEKTRUM</span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                Platform Manajemen Kalibrasi Alat Kesehatan Terintegrasi PT Spektrum Kreasi Pratama.
              </p>
              <div className="flex gap-2 mt-5">
                {['AES-256', 'ISO 17025', 'KAN'].map(badge => (
                  <span key={badge} className="text-[8px] font-black font-mono uppercase tracking-widest text-slate-500 border border-slate-800 px-2 py-1 rounded-lg">{badge}</span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono mb-4">Platform</p>
              <div className="space-y-2.5">
                {[['/', 'Beranda'], ['/login', 'Terminal Utama'], ['/login', 'Laporan KAN'], ['/login', 'Gemini Extractor']].map(([to, label]) => (
                  <Link key={label} to={to} className="block text-sm text-slate-400 hover:text-cyan-400 transition-colors font-medium">{label}</Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono mb-4">Regulasi</p>
              <div className="space-y-2.5">
                {['ISO/IEC 17025:2017', 'KAN K-01', 'KEMENKES 54/2015', 'BAPETEN No. 2/2018'].map(item => (
                  <p key={item} className="text-sm text-slate-400 font-medium">{item}</p>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-slate-600 text-[10px] tracking-widest font-black uppercase font-mono">
              © 2026 PT Spektrum Kreasi Pratama. All Rights Reserved.
            </p>
            <Link to="/login" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-colors font-mono">
              Akses Portal →
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
