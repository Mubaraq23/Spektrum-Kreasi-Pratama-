import React, { useState } from 'react';
import { 
  Compass, 
  Wrench, 
  Radio, 
  Award, 
  Stethoscope, 
  BrainCircuit, 
  QrCode, 
  Search, 
  Plus, 
  Activity, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Zap,
  Layers,
  BarChart3,
  Network,
  Printer
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export function MasterUnifiedHub() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const quickLaunchers = [
    {
      title: 'Kalibrasi KAN ISO 17025',
      desc: 'Lembar kerja digital, engine ketidakpastian u95, & sertifikat kalibrasi',
      icon: Award,
      color: 'from-amber-500 to-orange-600',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      path: '/worksheets/new'
    },
    {
      title: 'UKES Radiologi BAPETEN',
      desc: 'Pengujian kesesuaian 6 modalitas sinar-X & parser multi-meter Piranha',
      icon: Radio,
      color: 'from-cyan-500 to-blue-600',
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10',
      path: '/ukes-radiology/wizard'
    },
    {
      title: 'SatuSehat FHIR R4 Hub',
      desc: 'Bridging rekam kalibrasi & status kelaikan alat ke Kemenkes SatuSehat',
      icon: Network,
      color: 'from-teal-500 to-emerald-600',
      textColor: 'text-teal-400',
      bgColor: 'bg-teal-500/10',
      path: '/satusehat-hub'
    },
    {
      title: 'Dispatcher Si-INTAN BAPETEN',
      desc: 'Evaluasi DRL dosis radiasi pasien & dispatch data dosis nasional BAPETEN',
      icon: ShieldCheck,
      color: 'from-blue-500 to-indigo-600',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      path: '/siintan-dispatcher'
    },
    {
      title: 'Studio Label Thermal',
      desc: 'Desain sticker thermal fisik, cetak QR Code, & generator ZPL/ESC-POS',
      icon: Printer,
      color: 'from-amber-500 to-yellow-600',
      textColor: 'text-amber-300',
      bgColor: 'bg-amber-500/10',
      path: '/thermal-sticker-studio'
    },
    {
      title: 'Pemeliharaan Preventif (IPM)',
      desc: 'Dynamic checklist inspeksi fisik, keselamatan listrik, & performa alat',
      icon: Wrench,
      color: 'from-emerald-500 to-teal-600',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      path: '/ipm/wizard'
    },
    {
      title: 'Perbaikan & Repair (Corrective)',
      desc: 'Laporan kerusakan, diagnosis failure code, spare parts, & testing pasca-repair',
      icon: Activity,
      color: 'from-rose-500 to-amber-600',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      path: '/repair/wizard'
    },
    {
      title: 'Inventaris & Histori Alat',
      desc: 'Database alat kesehatan, riwayat 360°, & cetak label QR Code',
      icon: Stethoscope,
      color: 'from-indigo-500 to-purple-600',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      path: '/inventory'
    },
    {
      title: 'Asisten AI & Ekstraktor MK',
      desc: 'AI Metrology Assistant, ekstraksi OCR sertifikat, & saran uncertainty',
      icon: BrainCircuit,
      color: 'from-fuchsia-500 to-pink-600',
      textColor: 'text-fuchsia-400',
      bgColor: 'bg-fuchsia-500/10',
      path: '/ik-assistant'
    }
  ];


  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl text-white">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Compass className="w-96 h-96 text-cyan-400 animate-spin-slow" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-xs font-black uppercase tracking-widest">
            <Zap className="w-4 h-4" /> Integrated Medical Device Operations Hub
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Pusat Operasi Terpadu <br />
            <span className="bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400 bg-clip-text text-transparent">
              Kalibrasi, UKES, IPM & Perbaikan Alat
            </span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base max-w-3xl">
            Satu ekosistem lengkap pengujian dan pemeliharaan alat kesehatan: Kalibrasi KAN ISO 17025, Uji Kesesuaian Radiologi BAPETEN, Inspeksi IPM Preventif, Perbaikan Repair, dan Inventaris Aset.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-2 max-w-2xl">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Pencarian silang: Cari No. Seri, Nama Alat, Fasyankes, atau QR Code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl pl-12 pr-32 py-4 text-xs font-bold text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner"
              />
              <button
                onClick={() => navigate('/inventory')}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                Cari Aset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-Module Quick Launchers */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Peluncur Pengujian & Pekerjaan
          </h2>
          <span className="text-xs font-bold text-slate-400">Pilih modul yang ingin dijalankan</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLaunchers.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <div
                key={idx}
                onClick={() => navigate(item.path)}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div className={`w-12 h-12 rounded-2xl ${item.bgColor} flex items-center justify-center ${item.textColor}`}>
                      <IconComp className="w-6 h-6" />
                    </div>
                    <span className="p-2 bg-slate-100 dark:bg-slate-800 group-hover:bg-cyan-500 group-hover:text-slate-950 rounded-xl text-slate-400 transition-all">
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider group-hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${item.textColor}`}>
                    Buka Modul
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{item.path}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Module Overview Map */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3">
          Alur Integrasi Siklus Hidup Alat Kesehatan (360° Life Cycle)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 text-center">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="w-7 h-7 bg-indigo-500 text-white rounded-full flex items-center justify-center mx-auto text-xs font-black">1</span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">Inventaris & QR</h4>
            <p className="text-[10px] text-slate-400">Registrasi identitas & label QR</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="w-7 h-7 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center mx-auto text-xs font-black">2</span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">IPM Preventif</h4>
            <p className="text-[10px] text-slate-400">Inspeksi berkala & keselamatan listrik</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="w-7 h-7 bg-cyan-500 text-slate-950 rounded-full flex items-center justify-center mx-auto text-xs font-black">3</span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">UKES Radiologi</h4>
            <p className="text-[10px] text-slate-400">Uji kesesuaian BAPETEN X-Ray</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="w-7 h-7 bg-amber-500 text-slate-950 rounded-full flex items-center justify-center mx-auto text-xs font-black">4</span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">Kalibrasi KAN</h4>
            <p className="text-[10px] text-slate-400">Lembar kerja u95 & sertifikat</p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/60 dark:border-slate-800 space-y-2">
            <span className="w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center mx-auto text-xs font-black">5</span>
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">Perbaikan (Repair)</h4>
            <p className="text-[10px] text-slate-400">Corrective maintenance & spare parts</p>
          </div>
        </div>
      </div>
    </div>
  );
}
