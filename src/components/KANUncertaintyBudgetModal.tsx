import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calculator, X, ShieldCheck, Copy, Check
} from 'lucide-react';
import {
  calculateInstrumentUncertainty,
  calculateWelchSatterthwaite,
  getCoverageFactorK,
  evaluateILACDecision,
  UncertaintyBudgetRow
} from '../lib/uncertaintyCalculations';

export interface KANUncertaintyBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  pointData: {
    pointName?: string | number;
    point?: number;
    actual?: number;
    resolution?: number;
    masterUnc?: number;
    drift?: number;
    tolerance?: number;
    unit?: string;
    category?: string;
    sd?: number;
    n?: number;
    stability?: number;
    uniformity?: number;
    histeresis?: number;
    zero?: number;
    eccentricity?: number;
    linearity?: number;
  };
  cmcValue?: number;
}

export function KANUncertaintyBudgetModal({
  isOpen,
  onClose,
  pointData,
  cmcValue = 0.05
}: KANUncertaintyBudgetModalProps) {
  const [copied, setCopied] = React.useState(false);

  const budget = useMemo(() => {
    const category = pointData.category || 'standard';
    const res = pointData.resolution ?? 0.01;
    const masterU = pointData.masterUnc ?? 0.001;
    const driftVal = pointData.drift ?? 0;
    const tol = pointData.tolerance ?? 1.0;
    const nominal = pointData.point ?? 0;
    const measured = pointData.actual ?? nominal;

    const breakdown = calculateInstrumentUncertainty(
      category,
      res,
      masterU,
      driftVal,
      { ...pointData, cmcValue }
    );

    // Build budget rows
    const rows: UncertaintyBudgetRow[] = [];

    // u1 Resolution
    const u1 = res / (2 * Math.sqrt(3));
    rows.push({
      id: 'u1',
      sourceName: 'Daya Baca / Resolusi Skala (u_res)',
      symbol: 'u_res',
      value: res,
      distribution: 'rectangular',
      divisor: 2 * Math.sqrt(3),
      standardUncertainty: u1,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: Infinity,
      varianceContribution: Math.pow(u1, 2),
      contributionPercentage: 0,
    });

    // u2 Master Calibrator
    const u2 = masterU / 2;
    rows.push({
      id: 'u2',
      sourceName: 'Ketidakpastian Kalibrator Standar (u_std)',
      symbol: 'u_std',
      value: masterU,
      distribution: 'normal',
      divisor: 2,
      standardUncertainty: u2,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: Infinity,
      varianceContribution: Math.pow(u2, 2),
      contributionPercentage: 0,
    });

    // u3 Repeatability
    const u3 = breakdown.u3;
    rows.push({
      id: 'u3',
      sourceName: 'Daya Ulang / Repeatability (u_rep)',
      symbol: 'u_rep',
      value: pointData.sd || (res * 0.25),
      distribution: 'normal',
      divisor: Math.sqrt(pointData.n || 3),
      standardUncertainty: u3,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: (pointData.n || 3) - 1,
      varianceContribution: Math.pow(u3, 2),
      contributionPercentage: 0,
    });

    // u4 Drift
    const u4 = driftVal / Math.sqrt(3);
    rows.push({
      id: 'u4',
      sourceName: 'Stabilitas / Drift Kalibrator (u_drift)',
      symbol: 'u_drift',
      value: driftVal,
      distribution: 'rectangular',
      divisor: Math.sqrt(3),
      standardUncertainty: u4,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: Infinity,
      varianceContribution: Math.pow(u4, 2),
      contributionPercentage: 0,
    });

    // Category specific
    if (breakdown.uStab) {
      rows.push({
        id: 'u_stab',
        sourceName: 'Stabilitas Ruang / Media (u_stab)',
        symbol: 'u_stab',
        value: pointData.stability || 0,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: breakdown.uStab,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(breakdown.uStab, 2),
        contributionPercentage: 0,
      });
    }

    if (breakdown.uUnif) {
      rows.push({
        id: 'u_unif',
        sourceName: 'Uniformitas / Keseragaman Ruang (u_unif)',
        symbol: 'u_unif',
        value: pointData.uniformity || 0,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: breakdown.uUnif,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(breakdown.uUnif, 2),
        contributionPercentage: 0,
      });
    }

    if (breakdown.uHyst) {
      rows.push({
        id: 'u_hyst',
        sourceName: 'Penyimpangan Histeresis (u_hyst)',
        symbol: 'u_hyst',
        value: pointData.histeresis || 0,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: breakdown.uHyst,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(breakdown.uHyst, 2),
        contributionPercentage: 0,
      });
    }

    if (breakdown.uEcc) {
      rows.push({
        id: 'u_ecc',
        sourceName: 'Eksentrisitas Skala (u_ecc)',
        symbol: 'u_ecc',
        value: pointData.eccentricity || 0,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: breakdown.uEcc,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(breakdown.uEcc, 2),
        contributionPercentage: 0,
      });
    }

    // Variance total
    let totalVar = 0;
    for (const r of rows) totalVar += r.varianceContribution;
    for (const r of rows) r.contributionPercentage = totalVar > 0 ? (r.varianceContribution / totalVar) * 100 : 0;

    const uCombined = breakdown.uCombined;
    const nuEff = calculateWelchSatterthwaite(rows, uCombined);
    const k = getCoverageFactorK(nuEff, 0.95);
    const uExpanded = breakdown.uExpanded;
    const reported = breakdown.reportedUncertainty;

    // ILAC Decision Rule
    const ilac = evaluateILACDecision(measured, nominal, reported, tol);

    return {
      rows,
      breakdown,
      uCombined,
      nuEff,
      k,
      uExpanded,
      reported,
      ilac
    };
  }, [pointData, cmcValue]);

  if (!isOpen) return null;

  const handleCopyBudget = () => {
    const text = `
=== BUDGET KETIDAKPASTIAN KAN ISO GUM ===
Titik Ukur: ${pointData.pointName || pointData.point} ${pointData.unit || ''}
Nilai Terukur: ${pointData.actual ?? pointData.point}

${budget.rows.map(r => `${r.symbol} (${r.sourceName}): u = ${r.standardUncertainty.toFixed(5)} [${r.contributionPercentage.toFixed(1)}%]`).join('\n')}

Combined Standard Unc (u_c): ${budget.uCombined.toFixed(5)}
Degrees of Freedom (nu_eff): ${budget.nuEff}
Coverage Factor (k): ${budget.k}
Expanded Uncertainty (U_95): ${budget.uExpanded.toFixed(5)}
Reported Uncertainty (KAN): ${budget.reported.toFixed(5)}
Keputusan ILAC G8: ${budget.ilac.decision}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Calculator className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  Budget Ketidakpastian KAN (ISO GUM)
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                    Point: {pointData.pointName || pointData.point} {pointData.unit || ''}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rincian komponen evaluasi ketidakpastian baku gabungan u_c dan diperluas U_95.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyBudget}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* BODY */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
            {/* KEY METRICS SUMMARY */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[9px]">u_c (COMBINED)</span>
                <span className="text-sm font-bold text-cyan-400">{budget.uCombined.toFixed(5)}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[9px]">ν_eff (WELCH-SATT)</span>
                <span className="text-sm font-bold text-emerald-400">{budget.nuEff}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[9px]">U_95 (EXPANDED k=2)</span>
                <span className="text-sm font-bold text-amber-400">{budget.uExpanded.toFixed(5)}</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-500 block text-[9px]">REPORTED (KAN)</span>
                <span className="text-sm font-bold text-indigo-400">{budget.reported.toFixed(5)}</span>
              </div>
            </div>

            {/* BUDGET TABLE */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-left font-mono">
                <thead>
                  <tr className="text-slate-500 border-b border-slate-800 text-[10px] uppercase">
                    <th className="pb-2">Komponen</th>
                    <th className="pb-2 text-right">Nilai (x_i)</th>
                    <th className="pb-2 text-center">Distribusi</th>
                    <th className="pb-2 text-right">u(x_i)</th>
                    <th className="pb-2 text-right">Kontribusi (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {budget.rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-900/50">
                      <td className="py-2.5 font-bold text-slate-200">{r.sourceName}</td>
                      <td className="py-2.5 text-right text-cyan-300">{r.value}</td>
                      <td className="py-2.5 text-center capitalize text-slate-400">{r.distribution}</td>
                      <td className="py-2.5 text-right text-amber-300 font-bold">{r.standardUncertainty.toFixed(5)}</td>
                      <td className="py-2.5 text-right text-emerald-400 font-bold">{r.contributionPercentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ILAC DECISION RULE STATUS */}
            <div className={`p-4 rounded-2xl border ${
              budget.ilac.decision === 'PASS'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5" />
                  <span className="font-bold uppercase tracking-wider">ILAC G8 Guard Banding Decision:</span>
                </div>
                <span className="font-black font-mono text-sm px-3 py-0.5 rounded-full bg-slate-950 border border-slate-800">
                  {budget.ilac.decision}
                </span>
              </div>
              <p className="text-[11px] mt-2 opacity-80">{budget.ilac.explanation}</p>
            </div>
          </div>

          <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all text-xs"
            >
              Tutup
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
