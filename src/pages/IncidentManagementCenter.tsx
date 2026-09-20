import React, { useState } from 'react';
import {
  AlertTriangle, HelpCircle, GitCommit, Plus, ChevronRight,
  Clock, CheckCircle2, XCircle, FileText, Users, Wrench,
  Cpu, Globe, BookOpen, AlertOctagon, ArrowRight,
  Edit3, Calendar, Shield, Zap, Target, RefreshCw, Layers
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

type RCAMode = '5_WHY' | 'FISHBONE';
type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'CAPA_ISSUED' | 'CLOSED';
type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';

interface Incident {
  id: string;
  title: string;
  date: string;
  facility: string;
  assetId: string;
  assetName: string;
  type: string;
  severity: Severity;
  status: IncidentStatus;
  description: string;
  rootCause?: string;
  capaDeadline?: string;
  assignedTo: string;
}

const INCIDENTS: Incident[] = [
  {
    id: 'INC-2026-0814', title: 'Defibrillator OOT — Energi +10% di Atas MPE',
    date: '14 Agu 2026', facility: 'RSUD Dr. Soetomo', assetId: 'EQ-DEF-2026-089',
    assetName: 'Zoll R Series', type: 'Metrologi — OOT',
    severity: 'CRITICAL', status: 'CAPA_ISSUED',
    description: 'Hasil kalibrasi energi discharge menunjukkan 220J pada setting 200J (+10%), melebihi MPE ±5%.',
    rootCause: 'Degradasi kapasitansi internal defibrillator akibat IPM terlambat 2 bulan.',
    capaDeadline: '30 Sep 2026',
    assignedTo: 'Ir. Ahmad Zaky, S.T.'
  },
  {
    id: 'INC-2026-0823', title: 'Standar Ukur Fluke VT650 Drift OOT Saat Rekalibrasi',
    date: '23 Agu 2026', facility: 'Lab Kalibrasi Spektrum', assetId: 'CAL-VT650-001',
    assetName: 'Fluke VT650 Flow Analyzer', type: 'Ketertelusuran — Standar OOT',
    severity: 'CRITICAL', status: 'INVESTIGATING',
    description: 'Saat rekalibrasi ke BSN, ditemukan drift 3.8% pada kalibrasi aliran udara (MPE: ±2%). 7 LK ventilator terdampak.',
    rootCause: undefined,
    capaDeadline: '10 Okt 2026',
    assignedTo: 'Raditya Pratama, S.Si.'
  },
  {
    id: 'INC-2026-0901', title: 'Instruksi Kerja IK-SPK-VENT-02 Ditemukan Tidak Mutakhir',
    date: '01 Sep 2026', facility: 'Internal Audit', assetId: 'IK-SPK-VENT-02',
    assetName: 'Dokumen IK Ventilator Rev.2', type: 'Dokumen — Non-Conformance',
    severity: 'MINOR', status: 'CLOSED',
    description: 'Auditor internal menemukan referensi standar IEC 60601-1-12 pada IK Rev.2 mengacu pada edisi 2014, bukan 2023.',
    rootCause: 'Proses peninjauan dokumen tahunan tidak melibatkan verifikasi kode standar terbaru.',
    capaDeadline: '15 Sep 2026',
    assignedTo: 'Budi Santoso, A.Md.'
  },
];

const SEV_CONFIG: Record<Severity, { color: string; bg: string; label: string }> = {
  CRITICAL: { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/40', label: 'Critical' },
  MAJOR: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/40', label: 'Major' },
  MINOR: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/40', label: 'Minor' },
};

const STATUS_CFG: Record<IncidentStatus, { color: string; label: string; icon: any }> = {
  OPEN: { color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', label: 'Open', icon: AlertOctagon },
  INVESTIGATING: { color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', label: 'Investigasi', icon: HelpCircle },
  CAPA_ISSUED: { color: 'text-blue-400 bg-blue-500/10 border-blue-500/30', label: 'CAPA Diterbitkan', icon: FileText },
  CLOSED: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', label: 'Closed', icon: CheckCircle2 },
};

const FIVE_WHYS = [
  {
    why: 'Why 1: Mengapa hasil kalibrasi energi Defibrillator melebihi MPE?',
    answer: 'Energi terukur 220J pada setting 200J (+10% deviasi).',
    icon: AlertTriangle, color: 'text-rose-400'
  },
  {
    why: 'Why 2: Mengapa energi terukur melonjak?',
    answer: 'Kapasitor beban internal mengalami degradasi kapasitansi akibat usia dan siklus discharge tinggi.',
    icon: Cpu, color: 'text-amber-400'
  },
  {
    why: 'Why 3: Mengapa degradasi tidak terdeteksi lebih awal?',
    answer: 'Jadwal pemeliharaan preventif (IPM) semesteran terlambat dilakukan 2 bulan.',
    icon: Calendar, color: 'text-orange-400'
  },
  {
    why: 'Why 4: Mengapa IPM terlambat dilakukan?',
    answer: 'Sistem notifikasi jadwal belum terhubung otomatis ke email teknisi dan supervisor.',
    icon: Globe, color: 'text-yellow-400'
  },
  {
    why: 'Why 5 (Root Cause): Mengapa sistem notifikasi tidak berfungsi?',
    answer: 'Integrasi API notification daemon pada modul maintenance belum diaktifkan saat deployment awal.',
    icon: Zap, color: 'text-emerald-400'
  },
];

const FISHBONE_6M = [
  {
    category: 'Man (Manusia)',
    color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30',
    causes: [
      'Sertifikat pelatihan teknik defibrillator perlu diperbaharui',
      'Teknisi baru belum mendapat OJT untuk IPM defibrillator',
    ]
  },
  {
    category: 'Machine (Alat Standar)',
    color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30',
    causes: [
      'Fluke Impulse 7000DP baterai melemah pada pengujian ke-50+',
      'Kabel koneksi BNC perlu pergantian berkala',
    ]
  },
  {
    category: 'Method (Metode Pengujian)',
    color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30',
    causes: [
      'IK-SPK-DEF-01 Rev.3 perlu diupdate ke Rev.4 (referensi AHA 2024)',
      'Frekuensi titik ukur perlu ditambah di bawah 50J',
    ]
  },
  {
    category: 'Material (Komponen)',
    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30',
    causes: [
      'Kualitas kapasitor internal yang terdegradasi',
      'Spare part OEM tidak tersedia di distributor lokal',
    ]
  },
  {
    category: 'Measurement (Pengukuran)',
    color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30',
    causes: [
      'Jumlah pengulangan pengukuran (n=3) terlalu kecil untuk deteksi drift',
      'Belum ada prosedur verifikasi antara (intermediate check)',
    ]
  },
  {
    category: 'Milieu / Environment',
    color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/30',
    causes: [
      'Ruangan IGD tidak memiliki kontrol suhu & kelembaban stabil',
      'Getaran akibat troli dan aktivitas IGD mempengaruhi pengukuran',
    ]
  },
];

const CAPA_ITEMS = [
  { id: 'CAPA-01', action: 'Perbaikan defibrillator Zoll R Series — penggantian kapasitor', deadline: '25 Sep 2026', status: 'IN_PROGRESS', pic: 'Ahmad Zaky' },
  { id: 'CAPA-02', action: 'Aktifkan API notifikasi otomatis modul IPM di sistem', deadline: '22 Sep 2026', status: 'COMPLETED', pic: 'Tim IT Spektrum' },
  { id: 'CAPA-03', action: 'Update IK Kalibrasi Defibrillator ke Revisi 4', deadline: '30 Sep 2026', status: 'OPEN', pic: 'Raditya Pratama' },
  { id: 'CAPA-04', action: 'Training penyegaran teknik kalibrasi defibrillator untuk semua teknisi', deadline: '15 Okt 2026', status: 'OPEN', pic: 'Manajer Teknis' },
  { id: 'CAPA-05', action: 'Rekalibrasi seluruh 14 defibrillator yang menggunakan alat standar tsb.', deadline: '30 Sep 2026', status: 'IN_PROGRESS', pic: 'Tim Kalibrasi' },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function IncidentManagementCenter() {
  const [rcaMode, setRcaMode] = useState<RCAMode>('5_WHY');
  const [selectedIncident, setSelectedIncident] = useState<Incident>(INCIDENTS[0]);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-rose-950/60 to-slate-950 border border-rose-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-full text-rose-400 text-xs font-black uppercase tracking-widest">
              <AlertTriangle className="w-4 h-4" /> Incident Management & Root Cause Analysis (RCA) Studio
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Pusat Manajemen Insiden{' '}
              <span className="bg-gradient-to-r from-rose-400 via-amber-300 to-red-400 bg-clip-text text-transparent">
                &amp; RCA / CAPA Studio
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Studio investigasi ketidaksesuaian metrologi (NC), OOT, dan kegagalan proses. Dilengkapi analisis 5-Why, diagram Ishikawa Fishbone 6M, dan tracker tindakan korektif (CAPA).
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── INCIDENT LIST + SELECTED DETAIL ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Incident List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-white">Daftar Insiden Aktif</h2>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500/20 transition-all cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Laporkan Insiden
            </button>
          </div>

          {INCIDENTS.map(inc => {
            const sv = SEV_CONFIG[inc.severity];
            const st = STATUS_CFG[inc.status];
            const StIcon = st.icon;
            const isSelected = selectedIncident.id === inc.id;
            return (
              <div
                key={inc.id}
                onClick={() => setSelectedIncident(inc)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected ? 'bg-rose-500/5 border-rose-500/40' : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-xs font-mono text-slate-400">{inc.id}</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${sv.bg} ${sv.color}`}>{sv.label}</span>
                </div>
                <div className="text-sm font-black text-white leading-tight">{inc.title}</div>
                <div className="text-xs text-slate-400 mt-1">{inc.facility} • {inc.date}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <StIcon className="w-3 h-3" style={{ color: st.color.split(' ')[0].replace('text-', '') }} />
                  <span className={`text-[10px] font-black ${st.color.split(' ')[0]}`}>{st.label}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Incident Detail */}
        <div className="lg:col-span-8 space-y-5">
          {(() => {
            const inc = selectedIncident;
            const sv = SEV_CONFIG[inc.severity];
            const st = STATUS_CFG[inc.status];
            const StIcon = st.icon;
            return (
              <>
                {/* Header */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertOctagon className={`w-5 h-5 ${sv.color}`} />
                        <span className={`font-black text-sm ${sv.color}`}>{inc.id} — {sv.label} INCIDENT</span>
                      </div>
                      <div className="text-xl font-black text-white">{inc.title}</div>
                      <div className="text-xs text-slate-400">{inc.facility} • {inc.date} • {inc.type}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black shrink-0 ${st.color}`}>
                      <StIcon className="w-3.5 h-3.5" /> {st.label}
                    </div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-sm text-slate-300">{inc.description}</div>
                  {inc.rootCause && (
                    <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/20 space-y-1">
                      <div className="text-xs font-black text-rose-400">🔍 Root Cause Teridentifikasi</div>
                      <div className="text-sm text-slate-200">{inc.rootCause}</div>
                    </div>
                  )}
                  <div className="flex gap-3 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-slate-400"><Users className="w-3.5 h-3.5" /> {inc.assignedTo}</div>
                    {inc.capaDeadline && <div className="flex items-center gap-1.5 text-amber-400"><Clock className="w-3.5 h-3.5" /> CAPA Deadline: {inc.capaDeadline}</div>}
                  </div>
                </div>

                {/* RCA Mode Toggle */}
                <div className="flex items-center gap-3">
                  <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Metode RCA:</div>
                  <div className="flex gap-2">
                    {(['5_WHY', 'FISHBONE'] as RCAMode[]).map(m => (
                      <button
                        key={m}
                        onClick={() => setRcaMode(m)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          rcaMode === m ? 'bg-rose-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {m === '5_WHY' ? '5-Why Analysis' : 'Diagram Fishbone (6M)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RCA 5-Why */}
                {rcaMode === '5_WHY' && (
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-rose-400" /> Pohon Investigasi 5-Why — {inc.id}
                    </h2>
                    <div className="space-y-2">
                      {FIVE_WHYS.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <div key={idx} className="relative flex items-start gap-3">
                            {idx < FIVE_WHYS.length - 1 && (
                              <div className="absolute left-[16px] top-[36px] w-0.5 h-[calc(100%+8px)] bg-gradient-to-b from-slate-700 to-transparent z-0" />
                            )}
                            <div className={`relative z-10 w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 bg-slate-950 border-slate-700`}>
                              <Icon className={`w-4 h-4 ${item.color}`} />
                            </div>
                            <div className={`flex-1 p-4 rounded-2xl border bg-slate-950 mb-2 ${idx === FIVE_WHYS.length - 1 ? 'border-emerald-500/40' : 'border-slate-800'}`}>
                              <div className="text-xs font-black text-rose-400 mb-1">{item.why}</div>
                              <div className="text-sm text-slate-200 leading-relaxed">{item.answer}</div>
                              {idx === FIVE_WHYS.length - 1 && (
                                <div className="mt-2 text-xs text-emerald-400 font-black">✅ ROOT CAUSE TERIDENTIFIKASI</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RCA Fishbone */}
                {rcaMode === 'FISHBONE' && (
                  <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 animate-in fade-in duration-200">
                    <h2 className="text-base font-black text-white flex items-center gap-2">
                      <GitCommit className="w-5 h-5 text-rose-400" /> Diagram Ishikawa — Fishbone 6M Categories
                    </h2>
                    <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/20 text-sm text-rose-300 font-black text-center mb-4">
                      🐟 EFEK / MASALAH: Defibrillator OOT — Energi +10% di Atas MPE (INC-2026-0814)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {FISHBONE_6M.map(bone => (
                        <div key={bone.category} className={`p-4 rounded-2xl border ${bone.bg} space-y-2`}>
                          <div className={`text-xs font-black uppercase tracking-wider ${bone.color}`}>{bone.category}</div>
                          <ul className="space-y-1.5">
                            {bone.causes.map((c, i) => (
                              <li key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                                <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-slate-500" /> {c}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CAPA Tracker */}
                <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <Target className="w-5 h-5 text-amber-400" /> CAPA Tracker — Tindakan Korektif &amp; Pencegahan
                  </h2>
                  <div className="space-y-2">
                    {CAPA_ITEMS.map(item => {
                      const stColor = item.status === 'COMPLETED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : item.status === 'IN_PROGRESS' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                        : 'text-slate-400 bg-slate-500/10 border-slate-500/30';
                      const stLabel = item.status === 'COMPLETED' ? '✓ Selesai' : item.status === 'IN_PROGRESS' ? '⟳ On-Progress' : '○ Open';
                      return (
                        <div key={item.id} className="flex items-start gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
                          <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${stColor} shrink-0 mt-0.5`}>{stLabel}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white">{item.action}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.pic} • Deadline: {item.deadline}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
