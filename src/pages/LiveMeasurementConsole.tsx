import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend, AreaChart, Area
} from 'recharts';
import {
  Activity, HelpCircle, CheckCircle2, AlertTriangle, Sliders,
  Layers, Cpu, ShieldCheck, Zap, ArrowRight, Play, Pause,
  RefreshCw, Download, Settings, ChevronDown, Plus, Trash2,
  TrendingUp, Target, Clock, Gauge, Database, Eye
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface MeasurementPoint {
  seq: number;
  value: number;
  timestamp: string;
}

interface MeasurementResult {
  setting: number;
  measurements: number[];
  mean: number;
  stdDev: number;
  error: number;
  errorPct: number;
  uA: number;
  uB: number;
  uC: number;
  U: number;
  k: number;
  mpe: number;
  pass: boolean;
  enNominal: number;
}

// ─── PRESETS ──────────────────────────────────────────────────────────────────

const ALAT_PRESETS = [
  { id: 'def', label: 'Defibrillator (Energi Joule)', unit: 'J', settings: [50, 100, 150, 200, 360], mpeFormula: '15%', uB: 0.08 },
  { id: 'infus', label: 'Infusion Pump (Flow Rate)', unit: 'mL/h', settings: [50, 100, 200, 500], mpeFormula: '5%', uB: 0.05 },
  { id: 'spo2', label: 'Pulse Oximeter (SpO2)', unit: '%', settings: [70, 80, 90, 95, 98], mpeFormula: '±2%', uB: 0.07 },
  { id: 'nibp', label: 'NIBP (Tekanan Sistolik)', unit: 'mmHg', settings: [60, 80, 100, 120, 150], mpeFormula: '±3 mmHg', uB: 0.06 },
  { id: 'esr', label: 'ESR (Laju Endap Darah)', unit: 'mm/h', settings: [10, 20, 30, 50], mpeFormula: '±5%', uB: 0.10 },
];

// ─── CALCULATION ──────────────────────────────────────────────────────────────

function calcResult(setting: number, measurements: number[], uB: number, mpeFormula: string): MeasurementResult {
  const n = measurements.length;
  const mean = measurements.reduce((a, b) => a + b, 0) / n;
  const variance = measurements.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(n - 1, 1);
  const stdDev = Math.sqrt(variance);
  const uA = stdDev / Math.sqrt(n);
  const uC = Math.sqrt(uA * uA + uB * uB);
  const k = 2.0;
  const U = k * uC;
  const error = mean - setting;
  const errorPct = setting !== 0 ? (error / setting) * 100 : 0;
  const mpe = mpeFormula.includes('%')
    ? Math.abs(parseFloat(mpeFormula)) / 100 * setting
    : Math.abs(parseFloat(mpeFormula));
  const pass = Math.abs(error) + U <= mpe;
  const enNominal = U > 0 ? Math.abs(error) / U : 0;

  return { setting, measurements, mean, stdDev, error, errorPct, uA, uB, uC, U, k, mpe, pass, enNominal };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const INITIAL_MEASUREMENTS = [200.2, 200.4, 200.1, 200.3, 200.2];

export function LiveMeasurementConsole() {
  const [selectedPreset, setSelectedPreset] = useState(ALAT_PRESETS[0]);
  const [activeSettingIdx, setActiveSettingIdx] = useState(3); // 200J default
  const [measurements, setMeasurements] = useState<number[]>(INITIAL_MEASUREMENTS);
  const [newValue, setNewValue] = useState('');
  const [showExplainability, setShowExplainability] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [liveHistory, setLiveHistory] = useState<MeasurementPoint[]>([]);
  const [liveSeq, setLiveSeq] = useState(1);
  const timerRef = useRef<any>(null);

  const preset = selectedPreset;
  const setting = preset.settings[activeSettingIdx] ?? preset.settings[0];
  const result = calcResult(setting, measurements, preset.uB, preset.mpeFormula);

  // Live mode simulation
  useEffect(() => {
    if (isLive) {
      timerRef.current = setInterval(() => {
        const noise = (Math.random() - 0.5) * 0.6;
        const val = parseFloat((setting * (1 + noise / setting) + noise).toFixed(2));
        const ts = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLiveHistory(prev => {
          const next = [...prev, { seq: prev.length + 1, value: val, timestamp: ts }];
          return next.slice(-30); // keep last 30
        });
        setMeasurements(prev => {
          const next = [...prev, val].slice(-10);
          return next;
        });
      }, 1500);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isLive, setting]);

  const handleAddMeasurement = () => {
    const v = parseFloat(newValue);
    if (!isNaN(v)) {
      setMeasurements(prev => [...prev, v]);
      setNewValue('');
    }
  };

  const handleReset = () => {
    setMeasurements(INITIAL_MEASUREMENTS);
    setLiveHistory([]);
    setIsLive(false);
  };

  const liveChartData = liveHistory.map(p => ({
    t: p.timestamp.slice(-8),
    value: p.value,
    mpe_hi: setting + result.mpe,
    mpe_lo: setting - result.mpe,
    setting,
  }));

  const passColor = result.pass ? 'text-emerald-400' : 'text-rose-400';
  const passBg = result.pass ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5';

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-cyan-950/60 to-slate-950 border border-cyan-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-black uppercase tracking-widest">
              <Activity className="w-4 h-4" /> Scientific Instrumentation Console & Live Metrology Inspector
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Console Pengukuran{' '}
              <span className="bg-gradient-to-r from-cyan-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">
                Real-Time Metrologi
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Dashboard pengukuran berpresisi tinggi dengan analisis deviasi real-time, transparansi kalkulasi metrologi ISO/IEC 17025, decision rule ILAC-G8, dan streaming live dari instrumen.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── PRESET & SETTING SELECTOR ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Jenis Alat Kesehatan</div>
          <div className="flex flex-wrap gap-2">
            {ALAT_PRESETS.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setSelectedPreset(p); setActiveSettingIdx(0); setMeasurements([]); setLiveHistory([]); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  selectedPreset.id === p.id ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {p.label.split(' (')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Titik Pengukuran (Setting)</div>
          <div className="flex flex-wrap gap-2">
            {preset.settings.map((s, i) => (
              <button
                key={s}
                onClick={() => { setActiveSettingIdx(i); setMeasurements([]); setLiveHistory([]); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                  activeSettingIdx === i ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {s} {preset.unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN DASHBOARD ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Measurement Input & Big Display */}
        <div className="lg:col-span-5 space-y-5">

          {/* Big Display */}
          <div className={`p-6 rounded-3xl bg-slate-900 border space-y-6 ${passBg}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                PARAMETER: {preset.label.toUpperCase()} ({preset.unit})
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${result.pass ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-rose-500/20 border-rose-500/40 text-rose-400'}`}>
                {result.pass ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {result.pass ? 'PASS — LAIK PAKAI' : 'FAIL — TIDAK LAIK PAKAI'}
              </div>
            </div>

            {/* Main Value Display */}
            <div className="p-8 bg-slate-950 rounded-2xl border border-slate-800 text-center space-y-3 font-mono">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nilai Terukur Rata-Rata (x̄)</div>
              {measurements.length > 0 ? (
                <>
                  <div className="text-5xl md:text-6xl font-black text-cyan-400 tracking-tight">
                    {result.mean.toFixed(2)} <span className="text-xl text-slate-500 font-normal">{preset.unit}</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Setting: <span className="text-white font-bold">{setting} {preset.unit}</span>
                    {' '}• Deviasi: <span className={`font-bold ${Math.abs(result.error) > result.mpe ? 'text-rose-400' : 'text-amber-400'}`}>
                      {(result.error > 0 ? '+' : '') + result.error.toFixed(3)} {preset.unit} ({result.errorPct.toFixed(2)}%)
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-3xl font-black text-slate-600">--- {preset.unit}</div>
              )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              {[
                { label: 'MPE Toleransi', value: `±${result.mpe.toFixed(3)} ${preset.unit}`, color: 'text-slate-200' },
                { label: 'U₉₅ (k=2)', value: `±${result.U.toFixed(4)} ${preset.unit}`, color: 'text-emerald-400' },
                { label: 'u_A (Tipe A)', value: `±${result.uA.toFixed(5)}`, color: 'text-cyan-400' },
                { label: 'u_B (Tipe B)', value: `±${result.uB.toFixed(5)}`, color: 'text-purple-400' },
                { label: 'StdDev (s)', value: measurements.length > 1 ? `±${result.stdDev.toFixed(5)}` : '---', color: 'text-slate-300' },
                { label: 'En Nominal', value: measurements.length > 0 ? result.enNominal.toFixed(3) : '---', color: result.enNominal <= 1 ? 'text-emerald-400' : 'text-rose-400' },
              ].map(m => (
                <div key={m.label} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px] mb-0.5">{m.label}</div>
                  <div className={`font-bold text-sm ${m.color}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Input */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" /> Input Data Pengukuran (n={measurements.length})
              </h2>
              <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Reset
              </button>
            </div>

            {/* Current measurements */}
            <div className="flex flex-wrap gap-2">
              {measurements.map((v, i) => (
                <div key={i} className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs group">
                  <span className="text-cyan-400 font-bold">{v}</span>
                  <button onClick={() => setMeasurements(prev => prev.filter((_, j) => j !== i))} className="opacity-0 group-hover:opacity-100 text-rose-400 transition-all cursor-pointer ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <input
                type="number"
                step="any"
                placeholder={`Nilai ukur (${preset.unit})...`}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddMeasurement()}
                className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500/50"
              />
              <button onClick={handleAddMeasurement} className="px-4 py-2.5 bg-cyan-500 text-slate-950 rounded-xl text-xs font-black hover:bg-cyan-400 transition-all cursor-pointer">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* WHY PASS Button */}
          <button
            onClick={() => setShowExplainability(!showExplainability)}
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" /> WHY {result.pass ? 'PASS' : 'FAIL'}? — Transparansi Kalkulasi Metrologi
          </button>
        </div>

        {/* RIGHT: Charts & Explainability */}
        <div className="lg:col-span-7 space-y-5">

          {/* Live Mode Controls */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-black text-white">Mode Live Streaming Instrumen</div>
              <div className="text-xs text-slate-400">Simulasi data masuk dari instrumen secara real-time (1.5 detik interval)</div>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all cursor-pointer ${
                isLive ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-slate-950'
              }`}
            >
              {isLive ? <><Pause className="w-4 h-4" /> Stop</> : <><Play className="w-4 h-4" /> Live</>}
            </button>
          </div>

          {/* Live Chart */}
          {liveChartData.length > 0 ? (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" /> Live Data Stream ({liveChartData.length} titik)
                </h2>
                {isLive && <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-black"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> LIVE</div>}
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={liveChartData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="t" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <Tooltip content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                      <div className="text-cyan-400 font-bold">{typeof payload[0]?.value === 'number' ? payload[0].value.toFixed(3) : payload[0]?.value} {preset.unit}</div>
                    </div>
                  ) : null} />
                  <ReferenceLine y={setting + result.mpe} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth={1} label={{ value: '+MPE', position: 'right', fill: '#f43f5e', fontSize: 9 }} />
                  <ReferenceLine y={setting - result.mpe} stroke="#f43f5e" strokeDasharray="4 2" strokeWidth={1} label={{ value: '-MPE', position: 'right', fill: '#f43f5e', fontSize: 9 }} />
                  <ReferenceLine y={setting} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="value" name="Nilai Terukur" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center text-slate-500 text-sm">
              <Activity className="w-10 h-10 mx-auto mb-3 text-slate-700" />
              Klik tombol <strong className="text-emerald-400">Live</strong> untuk memulai streaming data real-time dari instrumen.
            </div>
          )}

          {/* Explainability Panel */}
          {showExplainability && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-cyan-500/40 space-y-4 animate-in fade-in duration-300">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" /> Metrology Calculation Explainability Panel (WHY {result.pass ? 'PASS' : 'FAIL'}?)
              </h2>

              <div className="space-y-2 text-xs font-mono">
                {[
                  { step: '1', label: 'Data Pengukuran Mentah (Raw Data)', value: measurements.join(' | '), color: 'text-cyan-400' },
                  { step: '2', label: `Nilai Rata-rata (x̄) = Σx / n`, value: `${result.mean.toFixed(4)} ${preset.unit}`, color: 'text-white' },
                  { step: '3', label: `Deviasi dari Nilai Nominal (E)`, value: `${result.mean.toFixed(4)} - ${setting} = ${result.error > 0 ? '+' : ''}${result.error.toFixed(4)} ${preset.unit}`, color: 'text-amber-400' },
                  { step: '4', label: `Ketidakpastian Tipe A (u_A = s/√n)`, value: `±${result.uA.toFixed(5)} ${preset.unit}`, color: 'text-cyan-400' },
                  { step: '5', label: `Ketidakpastian Tipe B (u_B, sertifikat standar)`, value: `±${result.uB.toFixed(5)} ${preset.unit}`, color: 'text-purple-400' },
                  { step: '6', label: `Ketidakpastian Gabungan (u_C = √(u_A²+u_B²))`, value: `±${result.uC.toFixed(5)} ${preset.unit}`, color: 'text-indigo-400' },
                  { step: '7', label: `Expanded Uncertainty U₉₅ (k=2)`, value: `±${result.U.toFixed(5)} ${preset.unit}`, color: 'text-white' },
                  { step: '8', label: `MPE (Batas Toleransi)`, value: `±${result.mpe.toFixed(4)} ${preset.unit} (${preset.mpeFormula} × ${setting})`, color: 'text-amber-300' },
                  { step: '9', label: `Decision Rule ILAC-G8: |E| + U ≤ MPE?`, value: `|${result.error.toFixed(4)}| + ${result.U.toFixed(4)} = ${(Math.abs(result.error) + result.U).toFixed(4)} ≤ ${result.mpe.toFixed(4)}? → ${result.pass ? '✅ PASS' : '❌ FAIL'}`, color: result.pass ? 'text-emerald-400' : 'text-rose-400' },
                ].map(({ step, label, value, color }) => (
                  <div key={step} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex-1">
                      <div className="text-slate-400 text-[10px] mb-0.5">{label}</div>
                      <div className={`font-bold ${color} break-all`}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pass/Fail History (if measurements) */}
          {measurements.length >= 2 && (
            <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Distribusi Data Pengukuran
              </h2>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart
                  data={measurements.map((v, i) => ({ i: i + 1, v }))}
                  margin={{ top: 5, right: 10, bottom: 5, left: -20 }}
                >
                  <defs>
                    <linearGradient id="measGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="i" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} domain={['auto', 'auto']} />
                  <ReferenceLine y={result.mean} stroke="#f59e0b" strokeDasharray="4 2" />
                  <Area type="monotone" dataKey="v" stroke="#06b6d4" fill="url(#measGrad)" strokeWidth={2} dot={{ r: 3, fill: '#06b6d4' }} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-4 gap-2 text-xs font-mono text-center">
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Min</div>
                  <div className="text-white font-bold">{Math.min(...measurements).toFixed(2)}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Max</div>
                  <div className="text-white font-bold">{Math.max(...measurements).toFixed(2)}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Range</div>
                  <div className="text-white font-bold">{(Math.max(...measurements) - Math.min(...measurements)).toFixed(3)}</div>
                </div>
                <div className="p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-500 text-[10px]">StdDev</div>
                  <div className="text-white font-bold">{result.stdDev.toFixed(4)}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
