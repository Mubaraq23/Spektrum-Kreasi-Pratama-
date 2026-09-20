import React, { useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, AreaChart, Area, Legend
} from 'recharts';
import {
  BarChart3, Sliders, FlaskConical, Play, Plus, Trash2,
  Download, Info, ChevronDown, ChevronUp, Calculator,
  AlertTriangle, CheckCircle2, RefreshCw, Copy, Zap
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type UncertaintyType = 'TYPE_A' | 'TYPE_B';
type Distribution = 'NORMAL' | 'RECTANGULAR' | 'TRIANGULAR' | 'U_SHAPED';

interface UncertaintyComponent {
  id: string;
  name: string;
  type: UncertaintyType;
  distribution: Distribution;
  value: number;
  divisor: number;
  sensitivityCoeff: number;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const DIST_INFO: Record<Distribution, { label: string; divisorDefault: number; desc: string; color: string }> = {
  NORMAL: { label: 'Normal (k=2)', divisorDefault: 2.0, desc: 'Distribusi normal, biasa digunakan pada sertifikat kalibrasi dengan k=2', color: '#06b6d4' },
  RECTANGULAR: { label: 'Segiempat (√3)', divisorDefault: 1.732, desc: 'Distribusi persegi (uniform), untuk resolusi alat & spesifikasi datasheet', color: '#8b5cf6' },
  TRIANGULAR: { label: 'Segitiga (√6)', divisorDefault: 2.449, desc: 'Distribusi segitiga, untuk estimasi batas atas & bawah tidak simetris', color: '#f59e0b' },
  U_SHAPED: { label: 'U-Shaped (√2)', divisorDefault: 1.414, desc: 'Distribusi berbentuk U, untuk sumber frekuensi tinggi / RF', color: '#10b981' },
};

const TYPE_COLORS: Record<UncertaintyType, string> = {
  TYPE_A: '#06b6d4',
  TYPE_B: '#8b5cf6',
};

const DEFAULT_COMPONENTS: UncertaintyComponent[] = [
  { id: 'u1', name: 'Sertifikat Standar Ukur', type: 'TYPE_B', distribution: 'NORMAL', value: 0.0500, divisor: 2.000, sensitivityCoeff: 1.0 },
  { id: 'u2', name: 'Drift Tahunan Standar Ukur', type: 'TYPE_B', distribution: 'RECTANGULAR', value: 0.0500, divisor: 1.732, sensitivityCoeff: 1.0 },
  { id: 'u3', name: 'Resolusi Alat (Setengah Skala Terkecil)', type: 'TYPE_B', distribution: 'RECTANGULAR', value: 0.0500, divisor: 3.464, sensitivityCoeff: 1.0 },
  { id: 'u4', name: 'Pengulangan Pengukuran (Repeatability)', type: 'TYPE_A', distribution: 'NORMAL', value: 0.0224, divisor: 2.236, sensitivityCoeff: 1.0 },
];

// ─── CALCULATION HELPERS ──────────────────────────────────────────────────────

function calcStdU(comp: UncertaintyComponent): number {
  return (comp.value / comp.divisor) * Math.abs(comp.sensitivityCoeff);
}

function calcUComponents(components: UncertaintyComponent[]) {
  const stdUs = components.map(c => ({ comp: c, u: calcStdU(c) }));
  const uC = Math.sqrt(stdUs.reduce((acc, { u }) => acc + u * u, 0));
  const k = 2;
  const U = k * uC;
  const total = stdUs.reduce((acc, { u }) => acc + u * u, 0);
  const withContrib = stdUs.map(({ comp, u }) => ({
    comp,
    u,
    u2: u * u,
    contributionPercent: total > 0 ? (u * u / total) * 100 : 0,
  }));
  return { uC, U, k, withContrib };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono shadow-xl max-w-xs">
        <div className="text-slate-400 font-bold mb-1 truncate">{label}</div>
        {payload.map((entry: any, i: number) => (
          <div key={i} style={{ color: entry.fill || entry.color }} className="flex justify-between gap-4">
            <span>{entry.name}</span>
            <span className="font-bold">{typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}{entry.unit || ''}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function UncertaintyLab() {
  const [components, setComponents] = useState<UncertaintyComponent[]>(DEFAULT_COMPONENTS);
  const [newComp, setNewComp] = useState<Partial<UncertaintyComponent>>({
    name: '', type: 'TYPE_B', distribution: 'RECTANGULAR', value: 0.05, divisor: 1.732, sensitivityCoeff: 1.0
  });
  const [showAddForm, setShowAddForm] = useState(false);
  const [mcResult, setMcResult] = useState<{ mean: number; expandedU: number; trials: number; hist: { x: number; freq: number }[] } | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [kFactor, setKFactor] = useState(2);
  const [measurementValue, setMeasurementValue] = useState(200.042);

  const { uC, U, withContrib } = calcUComponents(components);

  // Update divisor when distribution changes
  const handleDistChange = (id: string, dist: Distribution) => {
    setComponents(prev => prev.map(c => c.id === id ? {
      ...c, distribution: dist, divisor: DIST_INFO[dist].divisorDefault
    } : c));
  };

  const handleCompChange = (id: string, field: keyof UncertaintyComponent, val: any) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c));
  };

  const handleDeleteComp = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id));
  };

  const handleAddComp = () => {
    if (!newComp.name) return;
    const id = `u${Date.now()}`;
    setComponents(prev => [...prev, { ...newComp, id } as UncertaintyComponent]);
    setNewComp({ name: '', type: 'TYPE_B', distribution: 'RECTANGULAR', value: 0.05, divisor: 1.732, sensitivityCoeff: 1.0 });
    setShowAddForm(false);
  };

  const runMonteCarlo = useCallback(() => {
    setIsSimulating(true);
    setTimeout(() => {
      // Simple MC simulation
      const N = 100000;
      let sum = 0;
      const results: number[] = [];
      for (let i = 0; i < N; i++) {
        let sample = measurementValue;
        components.forEach(comp => {
          const u = calcStdU(comp);
          // Box-Muller for normal
          const r1 = Math.random(), r2 = Math.random();
          const z = Math.sqrt(-2 * Math.log(r1)) * Math.cos(2 * Math.PI * r2);
          sample += z * u;
        });
        sum += sample;
        results.push(sample);
      }
      const mean = sum / N;
      results.sort((a, b) => a - b);
      const lo = results[Math.floor(N * 0.025)];
      const hi = results[Math.floor(N * 0.975)];
      const expandedU = (hi - lo) / 2;

      // Build histogram (50 bins)
      const min = results[0], max = results[results.length - 1];
      const binSize = (max - min) / 40;
      const bins: number[] = Array(40).fill(0);
      results.forEach(v => {
        const idx = Math.min(Math.floor((v - min) / binSize), 39);
        bins[idx]++;
      });
      const hist = bins.map((freq, i) => ({
        x: parseFloat((min + i * binSize + binSize / 2).toFixed(4)),
        freq: Math.round(freq / N * 100 * 10) / 10
      }));

      setMcResult({ mean: parseFloat(mean.toFixed(5)), expandedU: parseFloat(expandedU.toFixed(5)), trials: N, hist });
      setIsSimulating(false);
    }, 800);
  }, [components, measurementValue]);

  // Tornado chart data
  const tornadoData = [...withContrib]
    .sort((a, b) => b.contributionPercent - a.contributionPercent)
    .map(({ comp, u, contributionPercent }) => ({
      name: comp.name.length > 30 ? comp.name.substring(0, 28) + '…' : comp.name,
      fullName: comp.name,
      contrib: parseFloat(contributionPercent.toFixed(1)),
      u: parseFloat(u.toFixed(6)),
      type: comp.type,
      fill: TYPE_COLORS[comp.type],
    }));

  const expandedU = kFactor * uC;

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950/60 to-slate-950 border border-purple-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 text-xs font-black uppercase tracking-widest">
              <FlaskConical className="w-4 h-4" /> Digital Uncertainty Laboratory & Tornado Analysis Studio
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Studio Laboratorium{' '}
              <span className="bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent">
                Ketidakpastian Pengukuran
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Pemodelan budget ketidakpastian ISO GUM sesuai ISO/IEC 17025:2017. Hitung kontribusi Tipe A &amp; B, diagram Tornado visual, analisis sensitivitas, dan simulasi Monte Carlo 100,000 trial.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── RESULT HEADER ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">u_C (Gabungan)</div>
          <div className="text-2xl font-black text-purple-400 font-mono">±{uC.toFixed(5)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-purple-500/30 space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">U (k={kFactor}, 95%)</div>
          <div className="text-2xl font-black text-white font-mono">±{expandedU.toFixed(5)}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Jumlah Komponen</div>
          <div className="text-2xl font-black text-cyan-400 font-mono">{components.length}</div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
          <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Faktor Cakupan (k)</div>
          <div className="flex items-center gap-2 mt-1">
            {[1, 2, 3].map(k => (
              <button
                key={k}
                onClick={() => setKFactor(k)}
                className={`w-10 h-9 rounded-xl text-sm font-black transition-all cursor-pointer ${kFactor === k ? 'bg-purple-500 text-slate-950' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MAIN LAYOUT ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Components Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-purple-400" /> Budget Ketidakpastian
              </h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 rounded-xl text-xs font-black hover:bg-purple-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah
              </button>
            </div>

            {/* Add Form */}
            {showAddForm && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="text-xs font-black text-purple-400 uppercase tracking-wider">Komponen Baru</div>
                <input
                  type="text"
                  placeholder="Nama komponen ketidakpastian..."
                  value={newComp.name || ''}
                  onChange={e => setNewComp(p => ({ ...p, name: e.target.value }))}
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50"
                />
                <div className="grid grid-cols-2 gap-2">
                  <select value={newComp.type} onChange={e => setNewComp(p => ({ ...p, type: e.target.value as UncertaintyType }))} className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white">
                    <option value="TYPE_A">Tipe A</option>
                    <option value="TYPE_B">Tipe B</option>
                  </select>
                  <select
                    value={newComp.distribution}
                    onChange={e => {
                      const dist = e.target.value as Distribution;
                      setNewComp(p => ({ ...p, distribution: dist, divisor: DIST_INFO[dist].divisorDefault }));
                    }}
                    className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white"
                  >
                    {(Object.keys(DIST_INFO) as Distribution[]).map(d => <option key={d} value={d}>{DIST_INFO[d].label}</option>)}
                  </select>
                  <input type="number" step="any" placeholder="Nilai ± (half-width)" value={newComp.value || ''} onChange={e => setNewComp(p => ({ ...p, value: parseFloat(e.target.value) || 0 }))} className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                  <input type="number" step="any" placeholder="Pembagi (divisor)" value={newComp.divisor || ''} onChange={e => setNewComp(p => ({ ...p, divisor: parseFloat(e.target.value) || 1 }))} className="p-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white" />
                </div>
                <div className="flex gap-2">
                  <button onClick={handleAddComp} className="flex-1 py-2 bg-purple-500 text-slate-950 text-xs font-black rounded-xl hover:bg-purple-400 transition-all cursor-pointer">
                    Tambahkan
                  </button>
                  <button onClick={() => setShowAddForm(false)} className="px-4 py-2 bg-slate-800 text-slate-400 text-xs font-black rounded-xl hover:bg-slate-700 transition-all cursor-pointer">
                    Batal
                  </button>
                </div>
              </div>
            )}

            {/* Components List */}
            <div className="space-y-3">
              {withContrib.map(({ comp, u, u2, contributionPercent }) => (
                <div key={comp.id} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <input
                        className="w-full bg-transparent text-xs font-bold text-white focus:outline-none"
                        value={comp.name}
                        onChange={e => handleCompChange(comp.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${comp.type === 'TYPE_A' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-purple-500/10 text-purple-400 border-purple-500/30'}`}>
                        {comp.type}
                      </span>
                      <button onClick={() => handleDeleteComp(comp.id)} className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:text-rose-300 transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                    <div>
                      <div className="text-slate-500 text-[10px] mb-0.5">Distribusi</div>
                      <select
                        value={comp.distribution}
                        onChange={e => handleDistChange(comp.id, e.target.value as Distribution)}
                        className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-white"
                      >
                        {(Object.keys(DIST_INFO) as Distribution[]).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px] mb-0.5">Nilai ±</div>
                      <input
                        type="number" step="any"
                        value={comp.value}
                        onChange={e => handleCompChange(comp.id, 'value', parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <div className="text-slate-500 text-[10px] mb-0.5">Pembagi</div>
                      <input
                        type="number" step="any"
                        value={comp.divisor}
                        onChange={e => handleCompChange(comp.id, 'divisor', parseFloat(e.target.value) || 1)}
                        className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">u_i = {u.toFixed(6)}</span>
                      <span style={{ color: TYPE_COLORS[comp.type] }} className="font-bold">{contributionPercent.toFixed(1)}% kontribusi</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${contributionPercent}%`, background: TYPE_COLORS[comp.type] }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary Footer */}
            <div className="pt-4 border-t border-slate-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">u_C (combined):</span>
                <span className="text-purple-400 font-bold">±{uC.toFixed(6)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">U (k={kFactor}):</span>
                <span className="text-white font-bold text-sm">±{expandedU.toFixed(5)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">Hasil: {measurementValue} ± {expandedU.toFixed(5)}</span>
                <span className="text-slate-500">p ≈ 95%</span>
              </div>
            </div>
          </div>

          {/* Monte Carlo Section */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-400" /> Simulasi Monte Carlo
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-xs text-slate-400 mb-1">Nilai Pengukuran Rata-rata (x̄)</div>
                <input
                  type="number" step="any"
                  value={measurementValue}
                  onChange={e => setMeasurementValue(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-purple-500/50"
                />
              </div>
            </div>
            <button
              onClick={runMonteCarlo}
              disabled={isSimulating}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSimulating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Menjalankan 100,000 Trial MC...</>
              ) : (
                <><Play className="w-4 h-4" /> Jalankan Monte Carlo (N=100,000)</>
              )}
            </button>

            {mcResult && (
              <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-2 font-mono text-xs animate-in fade-in duration-300">
                <div className="text-purple-400 font-black">Hasil Simulasi Monte Carlo ({mcResult.trials.toLocaleString()} Iterasi):</div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nilai Rata-rata Tersimulasi:</span>
                  <span className="text-white font-bold">{mcResult.mean}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">U₉₅ (interval 95%):</span>
                  <span className="text-emerald-400 font-bold">±{mcResult.expandedU}</span>
                </div>
                <div className="text-slate-500 text-[10px]">* Dihitung dari persentil 2.5% dan 97.5% distribusi output</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Charts */}
        <div className="lg:col-span-7 space-y-6">

          {/* Tornado Chart */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800">
            <h2 className="text-base font-black text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-purple-400" /> Diagram Tornado — Analisis Sensitivitas
            </h2>
            <div className="text-xs text-slate-500 mb-4 font-mono">
              Kontribusi % ketidakpastian setiap komponen terhadap u_C² gabungan, diurutkan dari terbesar.
            </div>
            <ResponsiveContainer width="100%" height={tornadoData.length * 52 + 40}>
              <BarChart
                data={tornadoData}
                layout="vertical"
                margin={{ top: 5, right: 50, bottom: 5, left: 10 }}
                barSize={18}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={v => `${v}%`}
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={160}
                  stroke="#475569"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  content={({ active, payload }) => active && payload?.length ? (
                    <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono shadow-xl">
                      <div className="text-slate-300 font-bold mb-1">{payload[0]?.payload.fullName}</div>
                      <div style={{ color: payload[0]?.payload.fill }}>Kontribusi: <strong>{payload[0]?.value}%</strong></div>
                      <div className="text-slate-400">u_i: ±{payload[0]?.payload.u}</div>
                      <div className="text-slate-500">Tipe: {payload[0]?.payload.type}</div>
                    </div>
                  ) : null}
                />
                <Bar dataKey="contrib" name="Kontribusi %" radius={[0, 6, 6, 0]}>
                  {tornadoData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} fillOpacity={0.85} />
                  ))}
                </Bar>
                <ReferenceLine x={50} stroke="#475569" strokeDasharray="4 2" label={{ value: '50%', position: 'top', fill: '#64748b', fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>

            {/* Type Legend */}
            <div className="flex gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-cyan-400" /><span className="text-slate-400">Tipe A (statistik)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-purple-400" /><span className="text-slate-400">Tipe B (evaluasi lain)</span></div>
            </div>
          </div>

          {/* Monte Carlo Histogram */}
          {mcResult && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/30 space-y-4 animate-in fade-in duration-300">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-400" /> Distribusi Output Monte Carlo (Histogram PDF)
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={mcResult.hist} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <defs>
                    <linearGradient id="mcGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="x" stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={v => v.toFixed(2)} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    content={({ active, payload }) => active && payload?.length ? (
                      <div className="bg-slate-950 border border-slate-700 rounded-xl p-2 text-xs font-mono">
                        <div className="text-slate-400">x = {payload[0]?.payload.x}</div>
                        <div className="text-purple-400 font-bold">Freq: {payload[0]?.value}%</div>
                      </div>
                    ) : null}
                  />
                  <Area type="monotone" dataKey="freq" stroke="#a855f7" fill="url(#mcGrad)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-slate-400">x̄ tersimulasi</div>
                  <div className="text-purple-400 font-bold">{mcResult.mean}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-purple-500/30 text-center">
                  <div className="text-slate-400">U₉₅ Monte Carlo</div>
                  <div className="text-white font-bold">±{mcResult.expandedU}</div>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <div className="text-slate-400">U₉₅ Analitik</div>
                  <div className="text-emerald-400 font-bold">±{expandedU.toFixed(5)}</div>
                </div>
              </div>
            </div>
          )}

          {/* GUM Summary */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-400" /> Laporan Budget Ketidakpastian (GUM Format)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Sumber', 'Tipe', 'Distribusi', 'Nilai ±', 'Pembagi', 'u_i', 'u_i²', 'Kontrib %'].map(h => (
                      <th key={h} className="text-left p-2 text-slate-500 font-bold uppercase tracking-wider text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900">
                  {withContrib.map(({ comp, u, u2, contributionPercent }) => (
                    <tr key={comp.id} className="hover:bg-slate-950 transition-colors">
                      <td className="p-2 text-slate-200 max-w-[120px] truncate">{comp.name}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${comp.type === 'TYPE_A' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>{comp.type}</span>
                      </td>
                      <td className="p-2 text-slate-400">{comp.distribution}</td>
                      <td className="p-2 text-slate-200">±{comp.value.toFixed(4)}</td>
                      <td className="p-2 text-slate-400">{comp.divisor.toFixed(3)}</td>
                      <td className="p-2 text-purple-300 font-bold">±{u.toFixed(5)}</td>
                      <td className="p-2 text-slate-400">{u2.toFixed(8)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${contributionPercent}%`, background: TYPE_COLORS[comp.type] }} />
                          </div>
                          <span style={{ color: TYPE_COLORS[comp.type] }}>{contributionPercent.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-purple-500/30">
                    <td colSpan={5} className="p-2 text-right text-slate-400 font-bold">u_C (combined):</td>
                    <td className="p-2 text-purple-400 font-bold">±{uC.toFixed(5)}</td>
                    <td className="p-2 text-slate-400">{(uC * uC).toFixed(8)}</td>
                    <td className="p-2 text-purple-400 font-bold">100%</td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="p-2 text-right text-white font-black">U (k={kFactor}, ~95%):</td>
                    <td colSpan={3} className="p-2 text-white font-black text-sm">±{expandedU.toFixed(5)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
