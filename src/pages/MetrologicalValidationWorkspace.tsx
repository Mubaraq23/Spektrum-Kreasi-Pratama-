import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  FlaskConical, 
  FileCode, 
  ShieldCheck, 
  Cpu, 
  Database, 
  RefreshCw, 
  Award, 
  Layers,
  ChevronRight
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';
import { evaluateDecisionRule } from '../lib/decisionRuleEngine';
import { formatMetrologicalResult, getStudentTCoverageFactor, calculateWelchSatterthwaiteVeff } from '../lib/uncertaintyCalculations';

interface GoldenDataset {
  id: string;
  name: string;
  category: string;
  settingValue: number;
  measuredValues: number[];
  resolution: number;
  calibratorUncertainty: number;
  mpeTolerance: number;
  expectedUncertainty: number;
  expectedPass: boolean;
}

export function MetrologicalValidationWorkspace() {
  const [goldenDatasets] = useState<GoldenDataset[]>([
    {
      id: 'GOLD-DEF-200J',
      name: 'Defibrillator Discharge Energy 200J Benchmark',
      category: 'defibrillator',
      settingValue: 200,
      measuredValues: [200.1, 200.3, 200.2, 200.1, 200.2],
      resolution: 0.1,
      calibratorUncertainty: 0.10,
      mpeTolerance: 30, // 15% of 200J = 30J
      expectedUncertainty: 0.15,
      expectedPass: true
    },
    {
      id: 'GOLD-RAD-KVP-80',
      name: 'X-Ray Generator 80 kVp Accuracy Benchmark',
      category: 'radiologi_radiografi',
      settingValue: 80,
      measuredValues: [80.5, 80.8, 80.6, 80.7, 80.5],
      resolution: 0.1,
      calibratorUncertainty: 0.20,
      mpeTolerance: 4.0, // 5% of 80kVp = 4kVp
      expectedUncertainty: 0.35,
      expectedPass: true
    }
  ]);

  const [selectedDataset, setSelectedDataset] = useState<GoldenDataset>(goldenDatasets[0]);
  const [testResult, setTestResult] = useState<any>(null);

  const runValidationTest = () => {
    const ds = selectedDataset;
    const n = ds.measuredValues.length;
    const mean = ds.measuredValues.reduce((a, b) => a + b, 0) / n;
    const error = mean - ds.settingValue;

    // Type A SD
    const variance = ds.measuredValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (n - 1);
    const sd = Math.sqrt(variance);
    const uA = sd / Math.sqrt(n);

    // Type B
    const uRes = ds.resolution / (2 * Math.sqrt(3));
    const uCal = ds.calibratorUncertainty / 2;

    const uC = Math.sqrt(Math.pow(uA, 2) + Math.pow(uRes, 2) + Math.pow(uCal, 2));
    const veff = calculateWelchSatterthwaiteVeff(uC, [
      { u: uA, v: n - 1 },
      { u: uRes, v: 100 },
      { u: uCal, v: 100 }
    ]);

    const k = getStudentTCoverageFactor(veff);
    const U = k * uC;

    const formatted = formatMetrologicalResult(mean, U);
    const decision = evaluateDecisionRule({
      parameterCode: 'VAL-01',
      parameterName: ds.name,
      measuredError: error,
      expandedUncertainty: U,
      toleranceLimit: ds.mpeTolerance,
      decisionRule: 'GUARD_BANDED_ACCEPTANCE',
      unit: 'Units',
      isWithinScope: true
    });

    setTestResult({
      mean: formatted.formattedValue,
      error: error.toFixed(3),
      uA: uA.toFixed(4),
      uC: uC.toFixed(4),
      veff,
      k,
      U: formatted.formattedUncertainty,
      status: decision.status,
      kelaikan: decision.kelaikan,
      note: decision.decisionNote
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      <Tilt3D intensity={5}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
              <FlaskConical className="w-4 h-4 text-indigo-400" /> Technical Manager Metrological Validation Workspace
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Workspace Validasi <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-cyan-400 bg-clip-text text-transparent">Formula Metrologi & Datasets</span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
              Ruang kerja pengujian formula metrologi ISO 17025, Welch-Satterthwaite v_eff, Student-t k-factor, dan evaluasi ILAC-G8 Guard Banding menggunakan *Golden Reference Datasets* sebelum publikasi resmi.
            </p>
          </div>
        </div>
      </Tilt3D>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-indigo-400" /> Golden Reference Datasets
            </h2>

            <div className="space-y-3">
              {goldenDatasets.map((ds) => (
                <div
                  key={ds.id}
                  onClick={() => setSelectedDataset(ds)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedDataset.id === ds.id
                      ? 'bg-indigo-500/10 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                      : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="font-bold text-white text-sm">{ds.name}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center justify-between font-mono">
                    <span>Setting: {ds.settingValue}</span>
                    <span>MPE: ±{ds.mpeTolerance}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={runValidationTest}
              className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-600 hover:from-indigo-400 hover:to-cyan-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              <Play className="w-4 h-4 fill-slate-950" /> Jalankan Simulasi Validasi Formula
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" /> Hasil Rekalkulasi Audit Trail Engine Metrologi
            </h2>

            {testResult ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Rata-rata (x̄)</div>
                    <div className="text-lg font-mono font-bold text-white mt-1">{testResult.mean}</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Deviasi (E)</div>
                    <div className="text-lg font-mono font-bold text-cyan-400 mt-1">{testResult.error}</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">Veff (Welch-Satt)</div>
                    <div className="text-lg font-mono font-bold text-amber-400 mt-1">{testResult.veff}</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-500 uppercase font-bold">U95 (Expanded)</div>
                    <div className="text-lg font-mono font-bold text-emerald-400 mt-1">{testResult.U}</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase">Keputusan Guard Banding</span>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase ${
                      testResult.status === 'PASS' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {testResult.status} ({testResult.kelaikan})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono leading-relaxed">{testResult.note}</p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-950 rounded-2xl border border-slate-800/60 text-slate-500 text-sm">
                Klik tombol "Jalankan Simulasi Validasi Formula" untuk melihat hasil kalkulasi audit.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
