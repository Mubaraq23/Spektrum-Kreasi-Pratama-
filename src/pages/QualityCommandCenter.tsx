import React, { useState } from 'react';
import {
  ShieldCheck, Activity, AlertTriangle, CheckCircle2, Clock,
  FileText, Target, TrendingUp, BarChart3, Calendar, Plus,
  ArrowRight, RefreshCw, XCircle, Zap, Users, BookOpen
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

interface NCItem {
  id: string;
  source: string;
  description: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  status: 'OPEN' | 'CAPA_ISSUED' | 'CLOSED';
  date: string;
  deadline: string;
  assignedTo: string;
  clause: string;
}

interface PTResult {
  scheme: string;
  provider: string;
  parameter: string;
  date: string;
  xLab: number;
  uLab: number;
  xRef: number;
  uRef: number;
  status: 'SATISFACTORY' | 'UNSATISFACTORY' | 'QUESTIONABLE';
}

const NC_DATA: NCItem[] = [
  { id: 'NC-2026-001', source: 'Audit Internal KAN', description: 'Rekaman hasil kalibrasi tidak menyertakan kondisi lingkungan pada waktu pengujian', severity: 'MAJOR', status: 'CLOSED', date: '15 Mar 2026', deadline: '15 Apr 2026', assignedTo: 'Ahmad Rifai', clause: 'ISO 17025:2017 Kl.7.4.2' },
  { id: 'NC-2026-002', source: 'Audit Eksternal KAN', description: 'Prosedur pengendalian rekaman belum mencakup file digital (PDF, JSON) dari sistem informasi', severity: 'MINOR', status: 'CLOSED', date: '20 Jun 2026', deadline: '20 Jul 2026', assignedTo: 'Raditya Pratama', clause: 'ISO 17025:2017 Kl.8.4' },
  { id: 'NC-2026-003', source: 'Surveillance KAN', description: 'Kalibrator Rigel Uni-Therm 400 tidak direkalibrasi tepat waktu — ditemukan 46 hari kadaluarsa', severity: 'CRITICAL', status: 'CAPA_ISSUED', date: '10 Agu 2026', deadline: '10 Sep 2026', assignedTo: 'Ir. Ahmad Zaky', clause: 'ISO 17025:2017 Kl.6.4.4' },
];

const PT_DATA: PTResult[] = [
  { scheme: 'SNPTKI-DEF-2026', provider: 'SNPTKI / BSN', parameter: 'Energi Defibrillator 200J', date: 'Jan 2026', xLab: 200.12, uLab: 0.15, xRef: 200.00, uRef: 0.05, status: 'SATISFACTORY' },
  { scheme: 'SNPTKI-INF-2025', provider: 'SNPTKI / BSN', parameter: 'Flow Rate Infusion 100 mL/h', date: 'Sep 2025', xLab: 99.82, uLab: 0.25, xRef: 100.00, uRef: 0.08, status: 'SATISFACTORY' },
  { scheme: 'APLAC-RAD-2026', provider: 'APLAC / BIPM', parameter: 'kVp X-Ray 80 kVp', date: 'Apr 2026', xLab: 80.68, uLab: 0.35, xRef: 80.00, uRef: 0.12, status: 'QUESTIONABLE' },
];

const RADAR_DATA = [
  { subject: 'Ketertelusuran', value: 95 },
  { subject: 'Kompetensi Personil', value: 90 },
  { subject: 'Pengendalian Mutu', value: 88 },
  { subject: 'Ketidakpastian', value: 92 },
  { subject: 'Kalibrasi Standar', value: 85 },
  { subject: 'Dokumentasi IK', value: 97 },
];

const CAPA_AGING_DATA = [
  { range: '0–7 hari', count: 0, color: '#10b981' },
  { range: '8–14 hari', count: 1, color: '#10b981' },
  { range: '15–30 hari', count: 1, color: '#f59e0b' },
  { range: '31–60 hari', count: 1, color: '#f43f5e' },
  { range: '>60 hari', count: 0, color: '#dc2626' },
];

function calcEn(xL: number, uL: number, xR: number, uR: number) {
  return Math.abs(xL - xR) / Math.sqrt(uL * uL + uR * uR);
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function QualityCommandCenter() {
  const [xLab, setXLab] = useState<number>(200.12);
  const [uLab, setULab] = useState<number>(0.15);
  const [xRef, setXRef] = useState<number>(200.00);
  const [uRef, setURef] = useState<number>(0.05);

  const enScore = calcEn(xLab, uLab, xRef, uRef);
  const isSatisfactory = enScore <= 1.0;
  const isQuestionable = enScore > 1.0 && enScore <= 2.0;

  const openNCCount = NC_DATA.filter(n => n.status === 'OPEN').length;
  const capaCount = NC_DATA.filter(n => n.status === 'CAPA_ISSUED').length;
  const closedNCCount = NC_DATA.filter(n => n.status === 'CLOSED').length;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950/60 to-slate-950 border border-emerald-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Quality Management System (QMS) &amp; CAPA Command Center
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Pusat Kendali Mutu{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                KAN ISO/IEC 17025 QMS
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Dashboard Manajemen Mutu Lab: Ketidaksesuaian (NC), Aging CAPA, Hasil Uji Profisiensi (PT), En-Score Calculator ISO/IEC 17043, dan Matriks Risiko Kualitas.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'NC Terbuka (Open)', value: openNCCount, color: openNCCount > 0 ? 'rose' : 'emerald', icon: AlertTriangle },
          { label: 'CAPA Dalam Proses', value: capaCount, color: capaCount > 0 ? 'amber' : 'emerald', icon: FileText },
          { label: 'NC Tertutup YTD', value: closedNCCount, color: 'emerald', icon: CheckCircle2 },
          { label: 'IK Valid (Terkendali)', value: '100%', color: 'cyan', icon: BookOpen },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <div className={`text-2xl font-black font-mono text-${color}-400`}>{value}</div>
            <div className="text-xs text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      {/* ─── MAIN GRID ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: NC Tracker + PT Results */}
        <div className="lg:col-span-7 space-y-5">

          {/* NC Tracker */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-emerald-400" /> Tracker Ketidaksesuaian (NC) &amp; CAPA
            </h2>
            <div className="space-y-3">
              {NC_DATA.map(nc => {
                const sevColor = nc.severity === 'CRITICAL' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                  : nc.severity === 'MAJOR' ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-blue-400 bg-blue-500/10 border-blue-500/30';
                const stColor = nc.status === 'CLOSED' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                  : nc.status === 'CAPA_ISSUED' ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                  : 'text-rose-400 bg-rose-500/10 border-rose-500/30';
                const stLabel = nc.status === 'CLOSED' ? '✓ Closed' : nc.status === 'CAPA_ISSUED' ? '⟳ CAPA Issued' : '● Open';

                return (
                  <div key={nc.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-slate-400">{nc.id}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${sevColor}`}>{nc.severity}</span>
                          <span className="text-[10px] text-slate-500 font-mono">{nc.clause}</span>
                        </div>
                        <div className="text-sm font-bold text-slate-200">{nc.description}</div>
                        <div className="text-xs text-slate-400">{nc.source} • {nc.date} • PIC: {nc.assignedTo}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black border shrink-0 ${stColor}`}>{stLabel}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                      <Calendar className="w-3 h-3" /> Deadline CAPA: {nc.deadline}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PT Results */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" /> Hasil Uji Profisiensi (PT) &amp; Interlab Comparison
            </h2>
            <div className="space-y-3">
              {PT_DATA.map(pt => {
                const en = calcEn(pt.xLab, pt.uLab, pt.xRef, pt.uRef);
                const stColor = pt.status === 'SATISFACTORY' ? 'text-emerald-400'
                  : pt.status === 'QUESTIONABLE' ? 'text-amber-400' : 'text-rose-400';
                return (
                  <div key={pt.scheme} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-mono text-slate-400">{pt.scheme} — {pt.provider}</div>
                        <div className="text-sm font-bold text-white">{pt.parameter}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{pt.date}</div>
                      </div>
                      <div className={`text-2xl font-black font-mono ${stColor}`}>
                        En = {en.toFixed(3)}
                      </div>
                    </div>
                    <div className={`text-xs font-black ${stColor}`}>
                      {pt.status === 'SATISFACTORY' ? '✅ SATISFACTORY (En ≤ 1.0)'
                        : pt.status === 'QUESTIONABLE' ? '⚠️ QUESTIONABLE (1.0 < En ≤ 2.0)'
                        : '❌ UNSATISFACTORY (En > 2.0)'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Radar QMS + En Calculator + CAPA Aging */}
        <div className="lg:col-span-5 space-y-5">

          {/* QMS Radar */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" /> Matriks Mutu Lab (Radar QMS Score)
            </h2>
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={RADAR_DATA} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="#1e293b" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
                <Radar name="QMS" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* CAPA Aging Bar */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" /> CAPA Aging Analysis
            </h2>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={CAPA_AGING_DATA} margin={{ top: 5, right: 5, bottom: 5, left: -25 }} barSize={22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="range" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip content={({ active, payload }) => active && payload?.length ? (
                  <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                    <div style={{ color: payload[0]?.payload?.color }} className="font-bold">{payload[0]?.value} CAPA</div>
                  </div>
                ) : null} />
                <Bar dataKey="count" name="CAPA" radius={[4, 4, 0, 0]}>
                  {CAPA_AGING_DATA.map((entry, i) => <Cell key={i} fill={entry.color} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* En Score Calculator */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> En-Score Calculator (ISO/IEC 17043)
            </h2>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              {[
                { label: 'x_lab', value: xLab, setter: setXLab },
                { label: 'U_lab', value: uLab, setter: setULab },
                { label: 'x_ref', value: xRef, setter: setXRef },
                { label: 'U_ref', value: uRef, setter: setURef },
              ].map(({ label, value, setter }) => (
                <div key={label}>
                  <div className="text-slate-400 text-[10px] mb-0.5">{label}</div>
                  <input
                    type="number" step="any"
                    value={value}
                    onChange={e => setter(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-xs focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              ))}
            </div>
            <div className={`p-4 rounded-2xl border text-center space-y-1 ${isSatisfactory ? 'bg-emerald-500/5 border-emerald-500/30' : isQuestionable ? 'bg-amber-500/5 border-amber-500/30' : 'bg-rose-500/5 border-rose-500/30'}`}>
              <div className="text-xs text-slate-400 font-mono">En = |x_lab − x_ref| / √(U_lab² + U_ref²)</div>
              <div className={`text-3xl font-black font-mono ${isSatisfactory ? 'text-emerald-400' : isQuestionable ? 'text-amber-400' : 'text-rose-400'}`}>
                En = {enScore.toFixed(3)}
              </div>
              <div className={`text-xs font-black ${isSatisfactory ? 'text-emerald-400' : isQuestionable ? 'text-amber-400' : 'text-rose-400'}`}>
                {isSatisfactory ? '✅ SATISFACTORY' : isQuestionable ? '⚠️ QUESTIONABLE' : '❌ UNSATISFACTORY'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
