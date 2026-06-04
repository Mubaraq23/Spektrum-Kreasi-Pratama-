import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Logo } from '../components/Logo';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {
  Zap, Shield, ShieldCheck, FileCheck, ChevronRight, ArrowRight,
  Sparkles, Award, Database, CheckCircle2, HeartPulse, Thermometer,
  Gauge, Cpu, Sun, Moon, HelpCircle, Check, AlertTriangle, ChevronDown,
  Settings, QrCode, FileSpreadsheet, Menu, X, Star, Globe, Lock,
  BarChart3, Atom, TrendingUp, Search, Layers, MessageCircle, Phone, Mail,
  Activity, AwardIcon, Compass, Server
} from 'lucide-react';

const STATS = [
  { value: '2,400+', label: 'Alat Terkalibrasi',     sub: 'Tersebar di 150+ Fasyankes' },
  { value: '99.8%',  label: 'Akurasi Sistem',         sub: 'ISO/IEC 17025 Grade' },
  { value: '< 3min', label: 'Waktu Generate LK',      sub: 'Per Lembar Kerja' },
  { value: '100%',   label: 'KAN Compliant',           sub: 'Standar Metrologi Legal' },
];

export function Landing() {
  const { user }                    = useAuth();
  const { theme, toggleTheme }      = useTheme();
  const navigate                    = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq]       = useState<number | null>(null);
  const [scrolled, setScrolled]     = useState(false);
  const heroRef                     = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState({
    heroTitle:         'SISTEM INFORMASI & KALIBRASI ALAT KESEHATAN PREMIUM',
    heroSubtitle:      'PT Spektrum Kreasi Pratama — Menjamin Akurasi, Keselamatan, dan Kepatuhan Regulasi Medis di Seluruh Indonesia dengan KAN LK-291-IDN & LP-1849-IDN.',
    supportWhatsapp:   '6281290008888',
    companyAddress:    'Graha Spektrum, Kav. 45, Jl. Tebet Barat Raya, Jakarta Selatan, DKI Jakarta 12810',
    companyEmail:      'info@spektrumkreasi.co.id',
    accreditationKan:  'LK-291-IDN & LP-1849-IDN'
  });

  const [formStep, setFormStep]       = useState(1);
  const [custName, setCustName]       = useState('');
  const [custOrg, setCustOrg]         = useState('');
  const [custWhatsapp, setCustWhatsapp] = useState('');
  const [custEmail, setCustEmail]     = useState('');
  const [devName, setDevName]         = useState('');
  const [devBrand, setDevBrand]       = useState('');
  const [devModel, setDevModel]       = useState('');
  const [devSn, setDevSn]             = useState('');
  const [devPriority, setDevPriority] = useState('Sedang');
  const [devNotes, setDevNotes]       = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError]     = useState('');

  // Floating background bubble coordinates
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 40 - 20,
        y: (e.clientY / window.innerHeight) * 40 - 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef  = doc(db, 'settings', 'landing_page');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            heroTitle:         data.heroTitle        || settings.heroTitle,
            heroSubtitle:      data.heroSubtitle     || settings.heroSubtitle,
            supportWhatsapp:   data.supportWhatsapp  || settings.supportWhatsapp,
            companyAddress:    data.companyAddress   || settings.companyAddress,
            companyEmail:      data.companyEmail     || settings.companyEmail,
            accreditationKan:  data.accreditationKan || settings.accreditationKan,
          });
        }
      } catch (err) {
        console.error('Gagal memuat pengaturan landing page:', err);
      }
    };
    fetchSettings();
  }, []);

  const handlePublicRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formStep < 2) { setFormStep(2); return; }
    setSubmittingForm(true);
    setFormError('');
    try {
      const woId    = 'wo_pub_' + Math.random().toString(36).substring(2, 15);
      const docRef  = doc(db, 'work_orders', woId);
      await setDoc(docRef, {
        id: woId, customerName: custOrg, contactPerson: custName,
        clientEmail: custEmail.toLowerCase().trim(), clientWhatsapp: custWhatsapp,
        deviceName: devName, brand: devBrand, model: devModel, serialNumber: devSn,
        priority: devPriority, description: devNotes,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Menunggu', isPublicRequest: true, createdAt: new Date()
      });
      const logId   = 'log_pub_' + Math.random().toString(36).substring(2, 15);
      const auditRef = doc(db, 'audit_logs', logId);
      await setDoc(auditRef, {
        id: logId, action: 'Pengajuan Kalibrasi Publik',
        details: `Pengajuan kalibrasi online baru untuk "${devName}" dari "${custOrg}"`,
        timestamp: new Date(), userEmail: custEmail.toLowerCase().trim()
      });
      setFormSuccess(true);
      setCustName(''); setCustOrg(''); setCustWhatsapp(''); setCustEmail('');
      setDevName(''); setDevBrand(''); setDevModel(''); setDevSn('');
      setDevPriority('Sedang'); setDevNotes('');
    } catch (err: any) {
      setFormError('Gagal mengajukan kalibrasi: ' + err.message);
    } finally {
      setSubmittingForm(false);
    }
  };

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const categories = [
    { name: 'Elektromedik & Defibrilator', icon: HeartPulse,  color: 'from-[#FF3366] to-[#FF007F]',    desc: 'Defibrilator, simulator ECG/NIBP, syringe pump, patient monitor dengan tingkat presisi ultra tinggi.' },
    { name: 'Radiologi & Imaging',          icon: Atom,        color: 'from-[#7928CA] to-[#FF0080]', desc: 'Kalibrasi paparan radiasi X-ray, akurasi dosis radioterapi bersertifikat regulasi nasional.' },
    { name: 'Laboratorium & Suhu',          icon: Thermometer, color: 'from-[#FF9F43] to-[#FF5252]', desc: 'Inkubator bayi, autoclave, freezer rantai dingin medis berstandar fisis kalibrasi premium.' },
    { name: 'Tekanan & Aliran Gas',         icon: Gauge,       color: 'from-[#00F2FE] to-[#4FACFE]',    desc: 'Manometer, suction pump, ventilator paru, anesthesia machine, serta vaporiser gas medis.' },
  ];

  const steps = [
    { title: 'Pindai Kode QR',     desc: 'Scan barcode atau QR aset medis untuk mendaftarkan dan menarik detail spesifikasi secara kilat.',          icon: QrCode,       color: 'from-[#00F2FE] to-[#4FACFE]',   num: '01' },
    { title: 'Input Lembar Kerja', desc: 'Isi draf pengujian digital dengan validasi real-time yang meminimalisir kesalahan fisis.',              icon: FileSpreadsheet, color: 'from-[#F5365C] to-[#F56036]',  num: '02' },
    { title: 'Kalkulasi U95 Otomatis', desc: 'Algoritma cerdas menghitung nilai deviasi dan ketidakpastian standar k=2 instan tanpa rumus manual.',  icon: Cpu,          color: 'from-[#7928CA] to-[#B800FF]', num: '03' },
    { title: 'Cetak Stiker Lulus', desc: 'Dapatkan label kelaikan fisik dengan kode QR unik terintegrasi langsung dengan database KEMENKES.',   icon: CheckCircle2, color: 'from-[#2DCE89] to-[#2DCECC]', num: '04' },
  ];

  const faqs = [
    { q: 'Bagaimana sistem menjamin kepatuhan akreditasi ISO/IEC 17025?', a: 'Sistem menerapkan penghitungan ketidakpastian otomatis (U95), pemantauan audit trail yang tidak dapat diubah, pembatasan hak akses bersertifikat, dan aturan keputusan (decision rule) KAN secara terintegrasi.' },
    { q: 'Apakah sistem mendukung pemindaian sertifikat kalibrasi eksternal?', a: 'Ya, modul Gemini AI OCR memungkinkan ekstraksi data parameter koreksi dari sertifikat eksternal (dalam format PDF maupun gambar) secara langsung untuk diperbarui dalam inventaris aset.' },
    { q: 'Bagaimana penentuan status kelulusan alat medis dihitung?', a: 'Sistem menggunakan aturan Simple Acceptance maupun Strict Acceptance (dengan batas pelindung k=2 guard-band) untuk memastikan kelayakan alat kesehatan sesuai standar pabrikan.' },
    { q: 'Apakah platform ini dapat diakses offline saat berada di lapangan?', a: 'Ya, draf lembar kerja tersimpan aman di database lokal browser secara offline-first, dan otomatis disinkronisasikan ke server cloud saat jaringan internet terdeteksi kembali.' },
  ];

  const navLinks = [['#workflow','Alur Kerja'],['#services','Kategori'],['#request-form','Registrasi Alat'],['#faq','Bantuan']];  return (
    <div className="min-h-screen bg-[#f4f6fb] dark:bg-[#030712] text-slate-900 dark:text-slate-100 overflow-x-hidden font-sans relative selection:bg-cyan-500 selection:text-black transition-colors duration-300">
      
      {/* ── Background Blobs & Interactive Glows ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full bg-cyan-500/[0.08] dark:bg-cyan-500/[0.12] blur-[150px] transition-transform duration-700 ease-out top-[5%] right-[5%]"
          style={{
            transform: `translate(${mousePosition.x - 10}%, ${mousePosition.y - 15}%)`,
          } as React.CSSProperties}
        />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full bg-violet-600/[0.06] dark:bg-violet-600/[0.1] blur-[130px] transition-transform duration-700 ease-out bottom-[15%] left-[5%]"
          style={{
            transform: `translate(${mousePosition.x * -0.8}%, ${mousePosition.y * -0.8}%)`,
          } as React.CSSProperties}
        />
        <div className="absolute top-[35%] left-[45%] w-[400px] h-[400px] rounded-full bg-blue-600/[0.04] dark:bg-blue-600/[0.08] blur-[120px]" />
      </div>

      {/* Futuristic Mesh Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293706_1px,transparent_1px),linear-gradient(to_bottom,#1f293706_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/85 dark:bg-[#040814]/85 backdrop-blur-xl border-b border-slate-200/50 dark:border-cyan-500/10 shadow-[0_4px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
          : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">

          <button onClick={() => navigate('/')} className="flex items-center gap-2 group" title="Beranda" aria-label="Beranda">
            <Logo className="text-slate-900 dark:text-white h-9 drop-shadow-[0_0_15px_rgba(6,182,212,0.15)] dark:drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-transform group-hover:scale-105" />
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-8" aria-label="Navigasi utama">
            {navLinks.map(([href, label]) => (
              <a key={href} href={href}
                className={cn(
                  "text-[10px] font-black uppercase tracking-[0.25em] transition-all font-mono hover:text-blue-600 dark:hover:text-cyan-400 relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[2px] after:bg-blue-600 dark:after:bg-cyan-500 after:transition-all hover:after:w-full",
                  label === 'Registrasi Alat'
                    ? "text-blue-600 dark:text-cyan-400 font-extrabold"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white"
                )}
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {/* Theme Toggle (Custom styled for dark/light portal vibe) */}
            <button
              onClick={toggleTheme}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 hover:border-slate-300 dark:hover:border-cyan-500/30 transition-all cursor-pointer shadow-sm dark:shadow-inner"
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>

            {/* CTA button with Glassmorphic cyber effect */}
            {user ? (
              <Link to="/dashboard" className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white dark:text-slate-950 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 hover:opacity-90 transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] dark:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:-translate-y-0.5 active:translate-y-0">
                <BarChart3 className="w-3.5 h-3.5" /> Dashboard
              </Link>
            ) : (
              <Link to="/login" className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-white border border-slate-300 dark:border-cyan-500/20 bg-white/40 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-cyan-500/10 hover:border-blue-600 dark:hover:border-cyan-400 transition-all shadow-[0_0_15px_rgba(6,182,212,0.03)] dark:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:-translate-y-0.5 active:translate-y-0">
                <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" /> Akses Portal
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-cyan-400 hover:border-slate-300 dark:hover:border-cyan-500/30 transition-all cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu with neon style */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#040814]/98 border-t border-cyan-500/10 shadow-2xl">
            <nav className="px-6 py-6 space-y-2">
              {navLinks.map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/5 rounded-2xl transition-all font-mono"
                >
                  {label}
                </a>
              ))}
              <div className="pt-4 border-t border-slate-800">
                {user
                  ? <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 w-full"><BarChart3 className="w-4 h-4" /> Dashboard</Link>
                  : <Link to="/login"     onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white border border-cyan-500/20 bg-slate-950/40 w-full"><Lock className="w-4 h-4 text-cyan-400" /> Akses Portal</Link>
                }
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ══════════════════════════════════════════
          HERO SECTION (Asymmetric 2-Column Grid)
      ══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative pt-36 sm:pt-44 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-8 z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Headline, Subtitle, Badges & CTAs */}
          <div className="lg:col-span-7 text-left space-y-8">
            
            {/* Glowing KAN Badge */}
            <div className="inline-flex items-center gap-3.5 px-4.5 py-2.5 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md shadow-[0_0_30px_rgba(245,158,11,0.06)] hover:border-amber-400/45 transition-colors duration-300">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)] bg-gradient-to-br from-amber-500 to-yellow-400">
                KAN
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[8px] font-bold font-mono tracking-[0.2em] text-amber-500/80 uppercase">Spektrum Kalibrasi Indonesia</span>
                <span className="text-[10px] font-black text-amber-400 uppercase font-mono mt-0.5 tracking-wider">{settings.accreditationKan}</span>
              </div>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] uppercase">
              <span className="block text-slate-900 dark:text-white opacity-95">{settings.heroTitle.split(' ').slice(0,3).join(' ')}</span>
              <span className="block my-2.5 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-500 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.1)] dark:drop-shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                {settings.heroTitle.split(' ').slice(3,6).join(' ')}
              </span>
              <span className="block text-slate-700 dark:text-slate-300">{settings.heroTitle.split(' ').slice(6).join(' ')}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-450 leading-relaxed font-medium max-w-2xl">
              {settings.heroSubtitle}
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to={user ? '/dashboard' : '/login'}
                className="group flex items-center justify-center gap-3 px-7 py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white dark:text-slate-950 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 hover:opacity-90 transition-all shadow-[0_8px_30px_rgba(6,182,212,0.15)] dark:shadow-[0_8px_30px_rgba(6,182,212,0.2)] hover:shadow-[0_8px_40px_rgba(6,182,212,0.35)] hover:-translate-y-0.5 active:translate-y-0"
              >
                {user ? 'Buka Dashboard Utama' : 'Masuk Terminal Operasi'}
                <ArrowRight className="w-4 h-4 text-white dark:text-slate-950 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#workflow"
                className="flex items-center justify-center gap-2 px-7 py-4.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800/85 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              >
                Alur Kerja Digital
              </a>
            </div>

            {/* Quality Seals */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-6 border-t border-slate-200 dark:border-slate-900/80">
              {[
                { icon: ShieldCheck, text: 'ISO 17025 Compliant', color: 'text-blue-600 dark:text-cyan-400' },
                { icon: Award,       text: 'Akreditasi KAN Resmi',  color: 'text-amber-500 dark:text-amber-400' },
                { icon: Database,    text: 'Sinkronisasi Kemenkes', color: 'text-indigo-600 dark:text-blue-400' },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-500 font-mono">
                  <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} /> {text}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Premium Cyber Dashboard Preview Widget */}
          <div className="lg:col-span-5 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-[2.5rem] blur-2xl opacity-70 group-hover:opacity-90 transition-opacity pointer-events-none" />
            <div className="relative bg-[#080c1a]/90 border border-cyan-500/15 p-6 rounded-[2rem] shadow-2xl space-y-6 backdrop-blur-xl">
              
              {/* Header Info */}
              <div className="flex justify-between items-center border-b border-slate-900 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 animate-ping" />
                  <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">SISTEM MONITORING LIVE</span>
                </div>
                <span className="text-[9px] font-mono text-slate-500">REFRESHING...</span>
              </div>

              {/* Simulated Stats Widgets */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">U95 Ketidakpastian</span>
                  <span className="text-xl font-bold font-mono text-white">k = 2.00</span>
                </div>
                <div className="p-4 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Decision Rule</span>
                  <span className="text-xl font-bold font-mono text-emerald-400 uppercase tracking-tighter">LULUS MEDIK</span>
                </div>
              </div>

              {/* Interactive Log Console Preview */}
              <div className="p-4 bg-slate-950/90 border border-slate-900 rounded-2xl font-mono text-[9px] space-y-2 text-slate-400 overflow-hidden shadow-inner h-[120px] flex flex-col justify-end">
                <div className="opacity-45">&gt; Loading calibration profiles... OK</div>
                <div className="opacity-60">&gt; Computing regression curves for Thermocouple...</div>
                <div className="opacity-80 text-cyan-400">&gt; Live sync completed with Kemenkes SIMAK-PT</div>
                <div className="text-amber-400 animate-pulse">&gt; Ready for physical scanner request... [127.0.0.1]</div>
              </div>

              {/* QR and Acc Seal Link */}
              <div className="flex items-center gap-4 bg-slate-950/40 p-4 border border-slate-900 rounded-2xl">
                <div className="w-10 h-10 bg-white p-1 rounded-xl shrink-0 flex items-center justify-center shadow-md">
                  <QrCode className="w-8 h-8 text-slate-950" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black text-white uppercase tracking-tight">KONEKSI INSTAN PORTAL</h4>
                  <p className="text-[9px] text-slate-500 font-medium leading-tight">Pindai kode QR fisik instrumen medis untuk sinkronisasi otomatis.</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
      {/* ══════════════════════════════════════════
          STATS STRIP (Glassmorphic Glow)
      ══════════════════════════════════════════ */}
      <section className="py-12 px-4 sm:px-6 border-y border-slate-200/50 dark:border-[#1e293b]/50 bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-md relative z-10">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {STATS.map(({ value, label, sub }) => (
            <div key={label} className="text-center space-y-2 group">
              <div className="text-3xl sm:text-4xl font-black font-mono tracking-tighter bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300">
                {value}
              </div>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{label}</p>
              <p className="text-[9px] text-slate-500 font-mono tracking-wider">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          Accreditation Logos Panel
      ══════════════════════════════════════════ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-center items-center gap-8 md:gap-16">
          {[
            { icon: AwardIcon, color: 'text-amber-500 dark:text-amber-400',  bg: 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/15 dark:border-amber-500/20',   title: 'LK-291-IDN & LP-1849', sub: 'Terakreditasi KAN' },
            { icon: Shield,    color: 'text-blue-600 dark:text-cyan-400',   bg: 'bg-blue-500/5 dark:bg-cyan-500/10 border-blue-500/15 dark:border-cyan-500/20',     title: 'ISO/IEC 17025:2017',   sub: 'Mutu Laboratorium' },
            { icon: Cpu,       color: 'text-indigo-600 dark:text-violet-400',  bg: 'bg-indigo-500/5 dark:bg-violet-500/10 border-indigo-500/15 dark:border-violet-500/20', title: 'Gemini AI Integration', sub: 'Otomasi OCR Sertifikat' },
            { icon: Globe,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/15 dark:border-emerald-500/20', title: 'KEMENKES RI',         sub: 'Standar Mutu Alkes' },
          ].map(({ icon: Icon, color, bg, title, sub }) => (
            <div key={title} className="flex items-center gap-4 group">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300 group-hover:scale-105", bg)}>
                <Icon className={cn("w-6 h-6", color)} />
              </div>
              <div>
                <p className="text-[12px] font-black text-slate-800 dark:text-white uppercase tracking-wider">{title}</p>
                <p className="text-[9px] text-slate-500 font-medium tracking-wide mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WORKFLOW STEPS (Retro-futurism Card Flow)
      ══════════════════════════════════════════ */}
      <section id="workflow" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 bg-slate-50/40 dark:bg-slate-950/40 border-y border-slate-200 dark:border-slate-900 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <span className="section-label inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-600/25 dark:border-cyan-500/20 bg-blue-550/5 dark:bg-cyan-500/5 text-[9px] font-mono tracking-widest text-blue-600 dark:text-cyan-400 uppercase">
              <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Sistem Integrasi Kalibrasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
              Alur Kerja <span className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Digital Otomatis</span>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-xl mx-auto leading-relaxed">
              Pemrosesan terotomatisasi dari awal registrasi fisik hingga penerbitan sertifikat digital KAN.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="group relative bg-[#f8fafc] dark:bg-[#090d1f] border border-slate-200 dark:border-slate-800 rounded-3xl p-8 hover:border-blue-450 dark:hover:border-cyan-500/30 hover:shadow-[0_10px_35px_rgba(6,182,212,0.04)] dark:hover:shadow-[0_10px_35px_rgba(6,182,212,0.08)] transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br text-slate-950 flex items-center justify-center shadow-lg font-black", step.color)}>
                        <Icon className="w-5 h-5 text-slate-950" />
                      </div>
                      <span className="text-[12px] font-black font-mono text-slate-400 dark:text-slate-700 group-hover:text-blue-600 dark:group-hover:text-cyan-500/50 transition-colors">{step.num}</span>
                    </div>
                    <h3 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-tight mb-3">{step.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SERVICES / CATEGORIES (Integrated with Accordion Support Sidebar)
      ══════════════════════════════════════════ */}
      <section id="services" className="py-24 sm:py-32 px-4 sm:px-6 lg:px-8 relative z-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Side: Services lists (7 cols) */}
          <div className="lg:col-span-7 space-y-10">
            <div className="text-left space-y-4">
              <span className="section-label inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-600/20 dark:border-cyan-500/20 bg-blue-500/5 dark:bg-cyan-500/5 text-[9px] font-mono tracking-widest text-blue-600 dark:text-cyan-400 uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Metrologi Terakreditasi
              </span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white font-sans">
                Cakupan <span className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Kalibrasi Medis</span>
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 rounded-full" />
            </div>

            <div className="grid grid-cols-1 gap-6">
              {categories.map((cat, idx) => {
                const Icon = cat.icon;
                return (
                  <div key={idx} className="group flex gap-6 items-start p-6 rounded-3xl bg-slate-50/50 dark:bg-[#090d1f]/60 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-cyan-500/25 hover:shadow-[0_8px_30px_rgba(6,182,212,0.03)] dark:hover:shadow-[0_8px_30px_rgba(6,182,212,0.05)] transition-all duration-300 hover:-translate-y-1">
                    <div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg transition-all duration-300 group-hover:scale-105", cat.color)}>
                      <Icon className="w-5 h-5 text-white dark:text-slate-950" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-850 dark:text-white uppercase tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{cat.name}</h3>
                      <p className="text-slate-550 dark:text-slate-400 text-xs font-medium leading-relaxed">{cat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Integrated Help Center FAQ Accordions (5 cols) */}
          <div id="faq" className="lg:col-span-5 space-y-10">
            <div className="text-left space-y-4">
              <span className="section-label inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-600/20 dark:border-cyan-500/20 bg-blue-500/5 dark:bg-cyan-500/5 text-[9px] font-mono tracking-widest text-blue-600 dark:text-cyan-400 uppercase">
                <HelpCircle className="w-3.5 h-3.5" /> FAQ & Bantuan
              </span>
              <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Informasi <span className="bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-400 bg-clip-text text-transparent">Kepatuhan</span>
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 rounded-full" />
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#f8fafc] dark:bg-[#090d1f]/80 overflow-hidden shadow-md hover:border-blue-450 dark:hover:border-cyan-500/20 transition-all duration-300">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full text-left px-5 py-4.5 flex justify-between items-center gap-4 hover:bg-slate-100/50 dark:hover:bg-cyan-500/[0.02] transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-black text-slate-800 dark:text-white leading-snug uppercase tracking-wide">{faq.q}</span>
                    <ChevronDown className={cn("w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform duration-300", openFaq === idx ? "rotate-180 text-blue-600 dark:text-cyan-400" : "")} />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-[11px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/30 dark:bg-slate-950/50 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════
          REQUEST FORM (Simplified Single-Step Cyber Card)
      ══════════════════════════════════════════ */}
      <section id="request-form" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-[#f8fafc]/90 dark:bg-[#080d1e]/80 backdrop-blur-2xl border border-slate-200 dark:border-cyan-500/10 p-8 sm:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden">
            
            {/* Hologram top edge neon line */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-650 to-transparent dark:via-cyan-400 shadow-[0_0_10px_#06b6d4]" />

            <div className="text-center mb-10 space-y-3">
              <span className="section-label inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-blue-600/25 dark:border-cyan-500/20 bg-blue-500/5 dark:bg-cyan-500/5 text-[9px] font-mono tracking-widest text-blue-600 dark:text-cyan-400 uppercase">
                <Sparkles className="w-3.5 h-3.5" /> Portal Registrasi Cepat
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-850 dark:text-white uppercase tracking-tight">
                Registrasi Instan Alat Kesehatan 🏥
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                Isi detail Fasyankes & spesifikasi instrumen medis dalam satu formulir untuk penjadwalan kalibrasi resmi KAN.
              </p>
            </div>

            {formSuccess ? (
              <div className="p-8 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-3xl text-center space-y-5 max-w-md mx-auto shadow-[0_0_30px_rgba(46,204,113,0.05)] dark:shadow-[0_0_30px_rgba(46,204,113,0.1)]">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 dark:text-emerald-400 mx-auto drop-shadow-[0_0_10px_rgba(46,204,113,0.3)]" />
                <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Registrasi Terkirim!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Permohonan registrasi alat medis Anda berhasil didaftarkan. Tim teknisi PT Spektrum Kreasi Pratama akan menghubungi narahubung terdaftar via WhatsApp.
                </p>
                <button
                  onClick={() => setFormSuccess(false)}
                  className="px-8 py-3.5 text-white dark:text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-cyan-400 dark:to-blue-500 w-full"
                >
                  Registrasi Alat Baru
                </button>
              </div>
            ) : (
              <form onSubmit={handlePublicRequest} className="space-y-6">
                {formError && (
                  <div className="p-4 bg-red-550/5 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 text-red-650 dark:text-red-400 rounded-2xl flex items-start gap-3 text-xs font-semibold">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  
                  {/* Fasyankes Data Section */}
                  <div className="space-y-4 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-950 pb-6 sm:pb-0 sm:pr-6">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-cyan-400 font-mono mb-2">01. Identitas Rumah Sakit/Fasyankes</h3>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Nama Rumah Sakit/Klinik</label>
                      <input type="text" required placeholder="RS Hermina Kemayoran" value={custOrg} onChange={e=>setCustOrg(e.target.value)}
                        className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Nama Narahubung / PIC</label>
                      <input type="text" required placeholder="Dr. Teguh Pratama" value={custName} onChange={e=>setCustName(e.target.value)}
                        className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Nomor WhatsApp Aktif (62xxx)</label>
                      <input type="text" required placeholder="6281234567890" value={custWhatsapp} onChange={e=>setCustWhatsapp(e.target.value)}
                        className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Alamat Email Resmi</label>
                      <input type="email" required placeholder="info@rshermina.com" value={custEmail} onChange={e=>setCustEmail(e.target.value)}
                        className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Instrument Specifications Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-cyan-400 font-mono mb-2">02. Spesifikasi Alat Kesehatan</h3>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Nama Alat Medis</label>
                      <input type="text" required placeholder="Defibrillator / Infusion Pump" value={devName} onChange={e=>setDevName(e.target.value)}
                        className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Merk / Manufaktur</label>
                        <input type="text" required placeholder="Zoll / Terumo" value={devBrand} onChange={e=>setDevBrand(e.target.value)}
                          className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Tipe / Model</label>
                        <input type="text" required placeholder="M Series / TE-331" value={devModel} onChange={e=>setDevModel(e.target.value)}
                          className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Serial Number (S/N)</label>
                        <input type="text" required placeholder="SN-8827A" value={devSn} onChange={e=>setDevSn(e.target.value)}
                          className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Prioritas Layanan</label>
                        <select value={devPriority} onChange={e=>setDevPriority(e.target.value)}
                          className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all appearance-none cursor-pointer"
                          title="Prioritas Layanan"
                        >
                          <option>Rendah (Rutin)</option>
                          <option>Sedang (Tahunan)</option>
                          <option>Tinggi (Kritis)</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Kondisi / Keluhan Alat</label>
                      <textarea rows={2} placeholder="Tulis catatan kondisi fisik alat..." value={devNotes} onChange={e=>setDevNotes(e.target.value)}
                        className="w-full bg-white dark:bg-[#050914] border border-slate-200 dark:border-slate-800 focus:border-blue-600 dark:focus:border-cyan-500/50 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600/5 dark:focus:ring-cyan-500/5 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-950">
                  <button type="submit" disabled={submittingForm}
                    className="flex items-center gap-2 px-10 py-4 text-slate-950 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/10 cursor-pointer"
                  >
                    {submittingForm ? (
                      <><div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" /> Mendaftarkan...</>
                    ) : (
                      <>Kirim Pengajuan Kalibrasi <ArrowRight className="w-4 h-4 text-slate-950" /></>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          WHATSAPP CHAT FLOAT BUTTON
      ══════════════════════════════════════════ */}
      <a
        href={`https://wa.me/${settings.supportWhatsapp}?text=Halo%20PT%20Spektrum%20Kreasi%20Pratama,%20saya%20tertarik%20dengan%20layanan%20kalibrasi%20alkes.`}
        target="_blank"
        rel="noopener noreferrer"
        className="wa-float-btn flex items-center justify-center w-14 h-14 rounded-full text-white shadow-2xl transition-all hover:scale-110 active:scale-95 group bg-[#25D366] [box-shadow:0_8px_30px_rgba(37,211,102,0.40)] hover:[box-shadow:0_12px_40px_rgba(37,211,102,0.60)]"
        title="Hubungi via WhatsApp"
        aria-label="WhatsApp"
      >
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.507 0 9.961-4.45 9.964-9.943.003-2.66-1.025-5.163-2.898-7.038C16.466 3.75 13.973 2.717 11.97 2.717c-5.518 0-10.003 4.451-10.006 9.95-.001 1.742.457 3.447 1.328 4.954L2.29 21.057l3.784-1.294 1.573.991zm10.297-6.938c-.3-.15-1.771-.875-2.042-.973-.27-.099-.467-.149-.662.15-.195.298-.753.973-.923 1.171-.17.199-.341.224-.642.075-1.127-.565-1.92-1.002-2.673-2.298-.198-.342.198-.318.567-1.053.061-.125.03-.233-.015-.333-.046-.1-.417-1.005-.572-1.378-.15-.366-.315-.316-.432-.322-.112-.006-.24-.006-.368-.006-.128 0-.337.048-.514.24-.177.193-.677.662-.677 1.614 0 .952.693 1.874.79 2.007.097.133 1.363 2.08 3.298 2.919.46.2.818.319 1.098.408.462.146.883.125 1.216.075.371-.056 1.771-.724 2.02-.1.249-.624.249-1.158.174-1.258-.074-.1-.271-.15-.572-.3z" />
        </svg>
      </a>

      {/* ══════════════════════════════════════════
          FOOTER (Futuristic cyber elements)
      ══════════════════════════════════════════ */}
      <footer className="px-4 sm:px-6 lg:px-8 py-20 bg-[#02050c] border-t border-slate-900 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-2 space-y-6">
              <div className="flex items-center gap-2">
                <Zap className="w-7 h-7 text-cyan-400 fill-cyan-400 drop-shadow-[0_0_10px_#06b6d4]" />
                <span className="text-2xl font-black italic tracking-widest text-white">SPEKTRUM</span>
              </div>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-md">
                Platform digital kalibrasi dan standardisasi alat kesehatan terkemuka di Indonesia, terafiliasi dengan komite akreditasi nasional dan kementerian kesehatan RI.
              </p>
              <div className="flex flex-wrap gap-2.5">
                {['AES-256 ENCRYPTION', 'ISO 17025:2017', 'KAN ACCREDITED', 'KEMENKES COMPLIANT'].map(badge => (
                  <span key={badge} className="text-[8px] font-black font-mono uppercase tracking-[0.2em] text-slate-500 border border-slate-800 px-3 py-1.5 rounded-lg bg-slate-900/30">{badge}</span>
                ))}
              </div>
            </div>

            {/* Platform links */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] font-mono mb-6">Navigasi Utama</p>
              <div className="space-y-3.5">
                {[['/', 'Kembali ke Atas'], ['/login', 'Terminal Masuk'], ['/login', 'Sertifikat KAN'], ['/login', 'Simulasi Kalibrasi']].map(([to, label]) => (
                  <Link key={label} to={to} className="block text-sm text-slate-400 hover:text-cyan-400 transition-colors font-medium font-mono uppercase tracking-wider text-[11px]">{label}</Link>
                ))}
              </div>
            </div>

            {/* Regulatory items */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] font-mono mb-6">Regulasi & Legalitas</p>
              <div className="space-y-3.5">
                {['ISO/IEC 17025:2017', 'KAN K-01 ATURAN KEPUTUSAN', 'PERMENKES 54/2015', 'PEDOMAN KALIBRASI BAPETEN'].map(item => (
                  <p key={item} className="text-[11px] font-black text-slate-400 font-mono tracking-wider uppercase">{item}</p>
                ))}
              </div>
            </div>
          </div>



          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-slate-650 text-[9px] tracking-[0.25em] font-black uppercase font-mono text-center sm:text-left">
              © 2026 PT Spektrum Kreasi Pratama. Seluruh Hak Cipta Dilindungi.
            </p>
            <Link to="/login" className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-cyan-400 transition-colors font-mono">
              Terminal Operasi Sistem →
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
