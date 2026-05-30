import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { Logo } from '../components/Logo';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import {

  Zap,
  Shield,
  ShieldCheck,
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

  // Dynamic Landing Page Settings State
  const [settings, setSettings] = useState({
    heroTitle: 'SISTEM INFORMASI & KALIBRASI ALAT KESEHATAN PREMIUM',
    heroSubtitle: 'PT Spektrum Kreasi Pratama - Menjamin Akurasi, Keselamatan, dan Kepatuhan Regulasi Medis di Seluruh Indonesia dengan KAN LK-291-IDN & LP-1849-IDN.',
    supportWhatsapp: '6281290008888',
    companyAddress: 'Graha Spektrum, Kav. 45, Jl. Tebet Barat Raya, Jakarta Selatan, DKI Jakarta 12810',
    companyEmail: 'info@spektrumkreasi.co.id',
    accreditationKan: 'LK-291-IDN & LP-1849-IDN'
  });

  // Online Calibration Request Form States
  const [formStep, setFormStep] = useState(1);
  const [custName, setCustName] = useState('');
  const [custOrg, setCustOrg] = useState('');
  const [custWhatsapp, setCustWhatsapp] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [devName, setDevName] = useState('');
  const [devBrand, setDevBrand] = useState('');
  const [devModel, setDevModel] = useState('');
  const [devSn, setDevSn] = useState('');
  const [devPriority, setDevPriority] = useState('Sedang');
  const [devNotes, setDevNotes] = useState('');
  const [submittingForm, setSubmittingForm] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch settings document on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'landing_page');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings({
            heroTitle: data.heroTitle || 'SISTEM INFORMASI & KALIBRASI ALAT KESEHATAN PREMIUM',
            heroSubtitle: data.heroSubtitle || 'PT Spektrum Kreasi Pratama - Menjamin Akurasi, Keselamatan, dan Kepatuhan Regulasi Medis di Seluruh Indonesia dengan KAN LK-291-IDN & LP-1849-IDN.',
            supportWhatsapp: data.supportWhatsapp || '6281290008888',
            companyAddress: data.companyAddress || 'Graha Spektrum, Kav. 45, Jl. Tebet Barat Raya, Jakarta Selatan, DKI Jakarta 12810',
            companyEmail: data.companyEmail || 'info@spektrumkreasi.co.id',
            accreditationKan: data.accreditationKan || 'LK-291-IDN & LP-1849-IDN'
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
    if (formStep < 2) {
      setFormStep(2);
      return;
    }

    setSubmittingForm(true);
    setFormError('');

    try {
      const woId = 'wo_pub_' + Math.random().toString(36).substring(2, 15);
      
      const docRef = doc(db, 'work_orders', woId);
      await setDoc(docRef, {
        id: woId,
        customerName: custOrg,
        contactPerson: custName,
        clientEmail: custEmail.toLowerCase().trim(),
        clientWhatsapp: custWhatsapp,
        deviceName: devName,
        brand: devBrand,
        model: devModel,
        serialNumber: devSn,
        priority: devPriority,
        description: devNotes,
        requestDate: new Date().toISOString().split('T')[0],
        status: 'Menunggu',
        isPublicRequest: true,
        createdAt: new Date()
      });

      const logId = 'log_pub_' + Math.random().toString(36).substring(2, 15);
      const auditRef = doc(db, 'audit_logs', logId);
      await setDoc(auditRef, {
        id: logId,
        action: 'Pengajuan Kalibrasi Publik',
        details: `Pengajuan kalibrasi online publik baru untuk "${devName}" dari "${custOrg}"`,
        timestamp: new Date(),
        userEmail: custEmail.toLowerCase().trim()
      });

      setFormSuccess(true);
      setCustName('');
      setCustOrg('');
      setCustWhatsapp('');
      setCustEmail('');
      setDevName('');
      setDevBrand('');
      setDevModel('');
      setDevSn('');
      setDevPriority('Sedang');
      setDevNotes('');
    } catch (err: any) {
      console.error('Gagal mengajukan kalibrasi online:', err);
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
        <div className="absolute top-[-200px] right-[-200px] w-[800px] h-[800px] bg-blue-500/8 dark:bg-blue-500/10 rounded-full blur-[150px]" />
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
          
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center max-w-[220px]"
            title="Kembali ke Beranda"
            aria-label="Kembali ke Beranda"
          >
            <Logo className="text-slate-900 dark:text-white" />
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {[['#services', 'Layanan'], ['#workflow', 'Alur Kerja'], ['#request-form', 'Pengajuan'], ['#faq', 'FAQ']].map(([href, label]) => (
              <a key={href} href={href} className={`text-[10px] font-black uppercase tracking-[0.2em] transition-all font-mono hover:text-blue-600 dark:hover:text-cyan-400 ${
                label === 'Pengajuan' ? 'text-blue-600 dark:text-cyan-400' : 'text-slate-500 dark:text-slate-400'
              }`}>{label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <Link to="/dashboard" className="hidden sm:flex px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5" /> Dashboard
              </Link>
            ) : (
              <Link to="/login" className="hidden sm:flex px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-95 transition-all shadow-lg shadow-blue-500/20 items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Akses Portal
              </Link>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white/98 dark:bg-[#040a18]/98 border-t border-slate-200 dark:border-slate-800 overflow-hidden">
            <nav className="px-4 py-5 space-y-2">
              {[['#services', 'Layanan'], ['#workflow', 'Alur Kerja'], ['#request-form', 'Pengajuan'], ['#faq', 'FAQ']].map(([href, label]) => (
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
          </div>
        )}
      </header>

      {/* ===== HERO SECTION ===== */}
      <section ref={heroRef} className="relative pt-28 sm:pt-36 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center">
        <div className="space-y-8 flex flex-col items-center">
          {/* Premium KAN Accreditation Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-500/10 dark:from-amber-500/5 dark:to-yellow-500/5 border border-amber-500/30 dark:border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)] mb-2">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shrink-0 shadow-lg shadow-amber-500/25">
              KAN
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-black font-mono tracking-widest text-slate-400 dark:text-slate-500 uppercase leading-none">PT Spektrum Kreasi Pratama</span>
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 leading-tight uppercase font-mono mt-0.5">
                {settings.accreditationKan}
              </span>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tighter leading-[1.0] text-slate-900 dark:text-white uppercase max-w-3xl mx-auto">
            {settings.heroTitle}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed font-medium max-w-2xl mx-auto">
            {settings.heroSubtitle}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={user ? '/dashboard' : '/login'}
              className="group flex items-center justify-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40">
              {user ? 'Buka Dashboard' : 'Masuk Terminal Operasi'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#workflow"
              className="flex items-center justify-center gap-2 px-8 py-4 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-800/80 transition-all">
              Pelajari Alur Kerja
            </a>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 pt-4 border-t border-slate-250 dark:border-slate-800 justify-center w-full max-w-md">
            {[
              { icon: ShieldCheck, text: 'ISO 17025 Compliant', color: 'text-emerald-500' },
              { icon: Award, text: 'KAN Accredited', color: 'text-amber-500' },
              { icon: Database, text: 'Auto Sync DB', color: 'text-blue-500' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 font-mono">
                <Icon className={`w-3.5 h-3.5 ${color} shrink-0`} /> {text}
              </div>
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
              <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
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
              <Settings className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
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
                <div key={idx} className="h-full">
                  <div className="group relative bg-white dark:bg-[#070d1f] border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 sm:p-8 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 h-full">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center mb-6 shadow-lg transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-black font-mono text-slate-300 dark:text-slate-600 absolute top-6 right-6">0{idx + 1}</span>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase mb-3 tracking-tight">{step.title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{step.desc}</p>
                  </div>
                </div>
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
                <div key={idx} className="h-full">
                  <div className="group flex gap-6 items-start p-7 sm:p-9 rounded-[2.5rem] bg-white dark:bg-[#070d1f] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xl transition-all duration-300 cursor-pointer h-full">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cat.color} text-white flex items-center justify-center shrink-0 shadow-lg transition-transform`}>
                      <Icon className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors">{cat.name}</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed">{cat.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
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
              <div key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#070d1f] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <button onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full text-left px-6 py-5 flex justify-between items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer">
                  <span className="text-sm font-black text-slate-800 dark:text-white tracking-wide">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180 text-blue-500' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-6 pb-6 pt-0 text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PUBLIC CALIBRATION REQUEST FORM ===== */}
      <section id="request-form" className="py-24 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        <div className="bg-white/60 dark:bg-[#070d1f]/60 backdrop-blur-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 sm:p-12 rounded-[3rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-600 via-cyan-500 to-amber-500" />
          
          <div className="text-center mb-10 space-y-3">
            <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-blue-600 dark:text-cyan-400 font-mono">
              <Sparkles className="w-4 h-4" /> Kalibrasi Instan Publik
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              Pengajuan Kalibrasi Online 🏥
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Daftarkan alat kesehatan Anda secara digital untuk kalibrasi dan sertifikasi resmi KAN.
            </p>
          </div>

          {formSuccess ? (
            <div className="p-8 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-3xl text-center space-y-4 max-w-md mx-auto">
              <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />
              <h3 className="text-lg font-black uppercase tracking-tight">Pengajuan Berhasil Dikirim!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium leading-relaxed font-semibold">
                Terima kasih! Rekor pengajuan kalibrasi online Anda telah masuk ke sistem antrean teknisi kami. Tim admin PT Spektrum Kreasi Pratama akan segera menghubungi Anda melalui nomor WhatsApp yang terdaftar.
              </p>
              <button 
                type="button" 
                onClick={() => { setFormSuccess(false); setFormStep(1); }} 
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Buat Pengajuan Baru
              </button>
            </div>
          ) : (
            <form onSubmit={handlePublicRequest} className="space-y-8">
              {formError && (
                <div className="p-4 bg-red-950/20 border border-red-900/40 text-red-500 rounded-2xl flex items-start gap-3.5 text-xs font-bold leading-relaxed">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Progress Steps Indicators */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    formStep >= 1 ? 'bg-blue-600 text-white font-mono' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 font-mono'
                  }`}>
                    1
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Identitas Fasyankes</span>
                </div>
                <div className="w-8 h-[2px] bg-slate-200 dark:bg-slate-800" />
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    formStep === 2 ? 'bg-blue-600 text-white font-mono' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 font-mono'
                  }`}>
                    2
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Spesifikasi Alkes</span>
                </div>
              </div>

              {formStep === 1 ? (
                // STEP 1: Customer details
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Nama Rumah Sakit / Fasyankes</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: RS Hermina Kemayoran"
                        value={custOrg}
                        onChange={(e) => setCustOrg(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Nama Lengkap Kontak (CP)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Dr. Teguh Pratama"
                        value={custName}
                        onChange={(e) => setCustName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Nomor WhatsApp Aktif (62xxx)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: 628123456789"
                        value={custWhatsapp}
                        onChange={(e) => setCustWhatsapp(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Alamat E-mail Fasyankes</label>
                      <input 
                        type="email" 
                        required
                        placeholder="Contoh: info@hermina-kemayoran.com"
                        value={custEmail}
                        onChange={(e) => setCustEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => {
                        if(custOrg && custName && custWhatsapp && custEmail) {
                          setFormStep(2);
                        } else {
                          setFormError('Harap lengkapi semua bidang sebelum melanjutkan.');
                        }
                      }}
                      className="px-8 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center gap-3 transition-all"
                    >
                      Langkah Selanjutnya <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                // STEP 2: Device details
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Nama Alat Kesehatan (Alkes)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Defibrillator / Infusion Pump / ECG"
                        value={devName}
                        onChange={(e) => setDevName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Prioritas Layanan</label>
                      <select 
                        value={devPriority} 
                        onChange={(e) => setDevPriority(e.target.value)}
                        title="Prioritas Layanan"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-bold"
                      >
                        <option value="Rendah">Rendah (Pemeliharaan Rutin)</option>
                        <option value="Sedang">Sedang (Kalibrasi Tahunan)</option>
                        <option value="Tinggi">Tinggi (Kritis / Perbaikan)</option>
                        <option value="Sangat Tinggi">Sangat Tinggi (Akut / Rusak)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Merk / Produsen</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: Terumo / Zoll / Omron"
                        value={devBrand}
                        onChange={(e) => setDevBrand(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Tipe / Model</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: TE-331 / M Series"
                        value={devModel}
                        onChange={(e) => setDevModel(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Nomor Seri (S/N)</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Contoh: SN-887162A"
                        value={devSn}
                        onChange={(e) => setDevSn(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Keluhan / Catatan Layanan Tambahan</label>
                      <textarea 
                        rows={2}
                        placeholder="Tulis keluhan atau detail kondisi alat kesehatan Anda..."
                        value={devNotes}
                        onChange={(e) => setDevNotes(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-semibold"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-between gap-4">
                    <button 
                      type="button" 
                      onClick={() => setFormStep(1)}
                      className="px-6 py-4 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:bg-slate-200"
                    >
                      Kembali
                    </button>

                    <button 
                      type="submit" 
                      disabled={submittingForm}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center gap-3 transition-all"
                    >
                      {submittingForm ? 'Memproses Pengajuan...' : 'Kirim Pengajuan Kalibrasi'}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>
      </section>

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${settings.supportWhatsapp}?text=Halo%20PT%20Spektrum%20Kreasi%20Pratama,%20saya%20tertarik%20dengan%20layanan%20kalibrasi%20alkes.`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl transition-colors group focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
        title="Hubungi PT Spektrum Kreasi Pratama via WhatsApp"
        aria-label="Hubungi kami via WhatsApp"
      >
        <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.45 5.507 0 9.961-4.45 9.964-9.943.003-2.66-1.025-5.163-2.898-7.038C16.466 3.75 13.973 2.717 11.97 2.717c-5.518 0-10.003 4.451-10.006 9.95-.001 1.742.457 3.447 1.328 4.954L2.29 21.057l3.784-1.294 1.573.991zm10.297-6.938c-.3-.15-1.771-.875-2.042-.973-.27-.099-.467-.149-.662.15-.195.298-.753.973-.923 1.171-.17.199-.341.224-.642.075-1.127-.565-1.92-1.002-2.673-2.298-.198-.342.198-.318.567-1.053.061-.125.03-.233-.015-.333-.046-.1-.417-1.005-.572-1.378-.15-.366-.315-.316-.432-.322-.112-.006-.24-.006-.368-.006-.128 0-.337.048-.514.24-.177.193-.677.662-.677 1.614 0 .952.693 1.874.79 2.007.097.133 1.363 2.08 3.298 2.919.46.2.818.319 1.098.408.462.146.883.125 1.216.075.371-.056 1.771-.724 2.02-.1.249-.624.249-1.158.174-1.258-.074-.1-.271-.15-.572-.3z" />
        </svg>
      </a>



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
