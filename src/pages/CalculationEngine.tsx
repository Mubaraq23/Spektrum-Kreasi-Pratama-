import React, { useState, useMemo } from 'react';
import {
  Calculator, Cpu, CheckCircle2, XCircle, AlertTriangle, ShieldCheck,
  Plus, Trash2, RefreshCw, FileSpreadsheet, Sparkles,
  Copy, HelpCircle, Variable, Activity, Zap, Check, Sliders
} from 'lucide-react';
import {
  calculateWelchSatterthwaite,
  getCoverageFactorK,
  evaluateILACDecision,
  evaluateCustomFormula,
  convertCalibrationUnit,
  UncertaintyBudgetRow,
  ILACDecisionResult
} from '../lib/uncertaintyCalculations';

export function CalculationEngine() {
  const [activeTab, setActiveTab] = useState<'isogum' | 'formula' | 'converter' | 'guide' | 'inspeksi'>('isogum');

  // ==========================================
  // TAB 1: ISO GUM ENGINE STATE
  // ==========================================
  const [category, setCategory] = useState<string>('suhu');
  const [nominalValue, setNominalValue] = useState<number>(100);
  const [unit, setUnit] = useState<string>('°C');
  const [resolution, setResolution] = useState<number>(0.01);
  const [masterUnc, setMasterUnc] = useState<number>(0.05); // U_std (k=2)
  const [masterK, setMasterK] = useState<number>(2);
  const [drift, setDrift] = useState<number>(0.01);

  // Measurement samples y1, y2, y3, ...
  const [samples, setSamples] = useState<number[]>([100.02, 100.05, 100.01, 100.03, 100.04]);

  // Category specific inputs
  const [stability, setStability] = useState<number>(0.02);       // Suhu
  const [uniformity, setUniformity] = useState<number>(0.04);      // Suhu
  const [histeresis, setHisteresis] = useState<number>(0.01);      // Tekanan
  const [zeroDev, setZeroDev] = useState<number>(0.005);          // Tekanan
  const [eccentricity, setEccentricity] = useState<number>(0.02);  // Timbangan
  const [linearity, setLinearity] = useState<number>(0.01);     // Timbangan
  const [volumeVal] = useState<number>(100);        // Flow
  const [uVolume] = useState<number>(0.2);            // Flow
  const [timeVal] = useState<number>(60);             // Flow
  const [uTime] = useState<number>(0.05);               // Flow
  const [kvpVal] = useState<number>(80);               // Radiologi
  const [uKvp] = useState<number>(1.2);                  // Radiologi
  const [distanceD] = useState<number>(100);        // Radiologi
  const [uDistance] = useState<number>(0.3);        // Radiologi

  // Conformance & Specs
  const [toleranceAbs, setToleranceAbs] = useState<number>(0.5); // MPE / Toleransi
  const [cmcValue, setCmcValue] = useState<number>(0.08);         // KAN CMC limit

  // Sample management
  const handleAddSample = () => {
    const last = samples.length > 0 ? samples[samples.length - 1] : nominalValue;
    setSamples([...samples, last]);
  };

  const handleUpdateSample = (index: number, val: number) => {
    const next = [...samples];
    next[index] = val;
    setSamples(next);
  };

  const handleRemoveSample = (index: number) => {
    if (samples.length <= 1) return;
    setSamples(samples.filter((_, i) => i !== index));
  };

  // Sample Statistics
  const sampleStats = useMemo(() => {
    const n = samples.length;
    if (n === 0) return { mean: 0, sd: 0, uRep: 0, df: 1 };
    const mean = samples.reduce((acc, curr) => acc + curr, 0) / n;
    const variance = n > 1 ? samples.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (n - 1) : 0;
    const sd = Math.sqrt(variance);
    const uRep = sd / Math.sqrt(n);
    return {
      mean: Math.round(mean * 100000) / 100000,
      sd: Math.round(sd * 100000) / 100000,
      uRep: Math.round(uRep * 100000) / 100000,
      df: n - 1
    };
  }, [samples]);

  // Compute Full Uncertainty Budget Rows
  const budgetData = useMemo(() => {
    const rows: UncertaintyBudgetRow[] = [];

    // 1. Resolution / Skala Terkecil (Type B, Rectangular, divisor 2*sqrt(3))
    const uRes = resolution / (2 * Math.sqrt(3));
    rows.push({
      id: 'u_res',
      sourceName: 'Daya Baca / Resolusi Alat (u_res)',
      symbol: 'u_res',
      value: resolution,
      distribution: 'rectangular',
      divisor: 2 * Math.sqrt(3),
      standardUncertainty: uRes,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: Infinity,
      varianceContribution: Math.pow(uRes, 2),
      contributionPercentage: 0,
    });

    // 2. Master Calibrator Standard Uncertainty (Type B, Normal, divisor k_std)
    const uStd = masterUnc / (masterK || 2);
    rows.push({
      id: 'u_std',
      sourceName: 'Sertifikat Kalibrator Standar (u_std)',
      symbol: 'u_std',
      value: masterUnc,
      distribution: 'normal',
      divisor: masterK || 2,
      standardUncertainty: uStd,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: Infinity,
      varianceContribution: Math.pow(uStd, 2),
      contributionPercentage: 0,
    });

    // 3. Repeatability / Daya Ulang (Type A, Normal, SD / sqrt(n))
    rows.push({
      id: 'u_rep',
      sourceName: `Daya Ulang Pengukuran / Repeatability (n=${samples.length})`,
      symbol: 'u_rep',
      value: sampleStats.sd,
      distribution: 'normal',
      divisor: Math.sqrt(samples.length),
      standardUncertainty: sampleStats.uRep,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: sampleStats.df,
      varianceContribution: Math.pow(sampleStats.uRep, 2),
      contributionPercentage: 0,
    });

    // 4. Drift Standard (Type B, Rectangular, divisor sqrt(3))
    const uDrift = drift / Math.sqrt(3);
    rows.push({
      id: 'u_drift',
      sourceName: 'Drift / Stabilitas Kalibrator (u_drift)',
      symbol: 'u_drift',
      value: drift,
      distribution: 'rectangular',
      divisor: Math.sqrt(3),
      standardUncertainty: uDrift,
      sensitivityCoefficient: 1.0,
      degreesOfFreedom: Infinity,
      varianceContribution: Math.pow(uDrift, 2),
      contributionPercentage: 0,
    });

    // Category Specific Components
    if (category === 'suhu' || category === 'kelembaban') {
      const uStab = stability / (2 * Math.sqrt(3));
      rows.push({
        id: 'u_stab',
        sourceName: 'Stabilitas Ruang / Media Suhu (u_stab)',
        symbol: 'u_stab',
        value: stability,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: uStab,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uStab, 2),
        contributionPercentage: 0,
      });

      const uUnif = uniformity / (2 * Math.sqrt(3));
      rows.push({
        id: 'u_unif',
        sourceName: 'Keseragaman / Uniformitas Ruang (u_unif)',
        symbol: 'u_unif',
        value: uniformity,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: uUnif,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uUnif, 2),
        contributionPercentage: 0,
      });
    } else if (category === 'tekanan') {
      const uHyst = histeresis / (2 * Math.sqrt(3));
      rows.push({
        id: 'u_hyst',
        sourceName: 'Pengaruh Histeresis Tekanan (u_hyst)',
        symbol: 'u_hyst',
        value: histeresis,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: uHyst,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uHyst, 2),
        contributionPercentage: 0,
      });

      const uZero = zeroDev / (2 * Math.sqrt(3));
      rows.push({
        id: 'u_zero',
        sourceName: 'Deviasi Setting Titik Nol (u_zero)',
        symbol: 'u_zero',
        value: zeroDev,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: uZero,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uZero, 2),
        contributionPercentage: 0,
      });
    } else if (category === 'timbangan') {
      const uEcc = eccentricity / (2 * Math.sqrt(3));
      rows.push({
        id: 'u_ecc',
        sourceName: 'Efek Eksentrisitas Muatan (u_ecc)',
        symbol: 'u_ecc',
        value: eccentricity,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: uEcc,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uEcc, 2),
        contributionPercentage: 0,
      });

      const uLin = linearity / (2 * Math.sqrt(3));
      rows.push({
        id: 'u_lin',
        sourceName: 'Linearitas Skala Timbangan (u_lin)',
        symbol: 'u_lin',
        value: linearity,
        distribution: 'rectangular',
        divisor: 2 * Math.sqrt(3),
        standardUncertainty: uLin,
        sensitivityCoefficient: 1.0,
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uLin, 2),
        contributionPercentage: 0,
      });
    } else if (category === 'volume_flow') {
      const uV = uVolume / Math.sqrt(3);
      rows.push({
        id: 'u_vol',
        sourceName: 'Komponen Ketidakpastian Volume (u_V)',
        symbol: 'u_V',
        value: uVolume,
        distribution: 'rectangular',
        divisor: Math.sqrt(3),
        standardUncertainty: uV,
        sensitivityCoefficient: 1.0 / (volumeVal || 1),
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uV / (volumeVal || 1), 2),
        contributionPercentage: 0,
      });

      const uT = uTime / Math.sqrt(3);
      rows.push({
        id: 'u_time',
        sourceName: 'Komponen Ketidakpastian Waktu (u_t)',
        symbol: 'u_t',
        value: uTime,
        distribution: 'rectangular',
        divisor: Math.sqrt(3),
        standardUncertainty: uT,
        sensitivityCoefficient: 1.0 / (timeVal || 1),
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uT / (timeVal || 1), 2),
        contributionPercentage: 0,
      });
    } else if (category === 'radiologi') {
      const uKv = uKvp / Math.sqrt(3);
      rows.push({
        id: 'u_kvp',
        sourceName: 'Komponen Tegangan Tinggi Generator (u_kVp)',
        symbol: 'u_kVp',
        value: uKvp,
        distribution: 'rectangular',
        divisor: Math.sqrt(3),
        standardUncertainty: uKv,
        sensitivityCoefficient: 1.0 / (kvpVal || 1),
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uKv / (kvpVal || 1), 2),
        contributionPercentage: 0,
      });

      const uDist = uDistance / Math.sqrt(3);
      rows.push({
        id: 'u_dist',
        sourceName: 'Komponen Posisi Jarak Sumber (u_dist)',
        symbol: 'u_dist',
        value: uDistance,
        distribution: 'rectangular',
        divisor: Math.sqrt(3),
        standardUncertainty: uDist,
        sensitivityCoefficient: 1.0 / (distanceD || 1),
        degreesOfFreedom: Infinity,
        varianceContribution: Math.pow(uDist / (distanceD || 1), 2),
        contributionPercentage: 0,
      });
    }

    // Calculate Total Variance Contribution
    let totalVar = 0;
    for (const r of rows) {
      totalVar += r.varianceContribution;
    }

    const uCombined = Math.sqrt(totalVar);

    // Calculate percentage contributions
    for (const r of rows) {
      r.contributionPercentage = totalVar > 0 ? (r.varianceContribution / totalVar) * 100 : 0;
    }

    return {
      rows,
      uCombined,
      totalVar,
    };
  }, [
    category, resolution, masterUnc, masterK, drift, samples, sampleStats,
    stability, uniformity, histeresis, zeroDev, eccentricity, linearity,
    volumeVal, uVolume, timeVal, uTime, kvpVal, uKvp, distanceD, uDistance
  ]);

  // Welch-Satterthwaite Degrees of Freedom & Student-t Coverage Factor k
  const nuEff = useMemo(() => {
    return calculateWelchSatterthwaite(budgetData.rows, budgetData.uCombined);
  }, [budgetData]);

  const coverageK = useMemo(() => {
    return getCoverageFactorK(nuEff, 0.95);
  }, [nuEff]);

  const uExpanded = useMemo(() => {
    return budgetData.uCombined * coverageK;
  }, [budgetData.uCombined, coverageK]);

  // Reported Uncertainty (considering CMC limit)
  const reportedUncertainty = useMemo(() => {
    if (cmcValue > 0) {
      return Math.max(uExpanded, cmcValue);
    }
    return uExpanded;
  }, [uExpanded, cmcValue]);

  // ILAC G8 Decision Rule Evaluation
  const ilacResult: ILACDecisionResult = useMemo(() => {
    return evaluateILACDecision(
      sampleStats.mean,
      nominalValue,
      reportedUncertainty,
      toleranceAbs
    );
  }, [sampleStats.mean, nominalValue, reportedUncertainty, toleranceAbs]);

  // ==========================================
  // TAB 2: DYNAMIC FORMULA ENGINE STATE
  // ==========================================
  const [formulaInput, setFormulaInput] = useState<string>('sqrt(u_res^2 + u_std^2 + u_rep^2)');
  const [formulaVars, setFormulaVars] = useState<Array<{ name: string; label: string; value: number }>>([
    { name: 'u_res', label: 'Ketidakpastian Resolusi', value: 0.00289 },
    { name: 'u_std', label: 'Ketidakpastian Kalibrator', value: 0.025 },
    { name: 'u_rep', label: 'Ketidakpastian Repeatability', value: 0.0089 },
  ]);

  const formulaEval = useMemo(() => {
    const varMap: Record<string, number> = {};
    formulaVars.forEach(v => {
      varMap[v.name] = Number(v.value) || 0;
    });
    return evaluateCustomFormula(formulaInput, varMap);
  }, [formulaInput, formulaVars]);

  const handleAddFormulaVar = () => {
    setFormulaVars([
      ...formulaVars,
      { name: `var_${formulaVars.length + 1}`, label: `Variabel ${formulaVars.length + 1}`, value: 1.0 }
    ]);
  };

  const handleUpdateFormulaVar = (index: number, key: 'name' | 'label' | 'value', val: string | number) => {
    const next = [...formulaVars];
    next[index] = { ...next[index], [key]: val };
    setFormulaVars(next);
  };

  const handleRemoveFormulaVar = (index: number) => {
    setFormulaVars(formulaVars.filter((_, i) => i !== index));
  };

  // Preset Formulas
  const handleLoadFormulaPreset = (preset: 'error' | 'flow' | 'gas' | 'safety' | 'enthalpy') => {
    if (preset === 'error') {
      setFormulaInput('y_mean - x_std');
      setFormulaVars([
        { name: 'y_mean', label: 'Rata-rata Terukur UUT', value: 100.04 },
        { name: 'x_std', label: 'Nilai Acuan Standar', value: 100.00 },
      ]);
    } else if (preset === 'flow') {
      setFormulaInput('Q * sqrt((u_V / V)^2 + (u_t / t)^2)');
      setFormulaVars([
        { name: 'Q', label: 'Laju Alir (L/min)', value: 10 },
        { name: 'V', label: 'Volume Alir (mL)', value: 500 },
        { name: 'u_V', label: 'Ketidakpastian Volume', value: 1.0 },
        { name: 't', label: 'Waktu Alir (detik)', value: 300 },
        { name: 'u_t', label: 'Ketidakpastian Waktu', value: 0.5 },
      ]);
    } else if (preset === 'gas') {
      setFormulaInput('Q_raw * (1013.25 / P_abs) * ((T_abs + 273.15) / 293.15)');
      setFormulaVars([
        { name: 'Q_raw', label: 'Flow Terbaca', value: 15.0 },
        { name: 'P_abs', label: 'Tekanan Barometrik (hPa)', value: 1010.5 },
        { name: 'T_abs', label: 'Suhu Ruang (°C)', value: 24.5 },
      ]);
    } else if (preset === 'safety') {
      setFormulaInput('I_measured + sqrt(u_res^2 + u_cal^2)');
      setFormulaVars([
        { name: 'I_measured', label: 'Arus Bocor (μA)', value: 45.2 },
        { name: 'u_res', label: 'Resolusi Multimeter', value: 0.1 },
        { name: 'u_cal', label: 'Ketidakpastian Multimeter', value: 0.8 },
      ]);
    }
  };

  // ==========================================
  // TAB 3: UNIT CONVERTER STATE
  // ==========================================
  const [convCat, setConvCat] = useState<string>('tekanan');
  const [convVal, setConvVal] = useState<number>(1);
  const [fromUnit, setFromUnit] = useState<string>('bar');
  const [toUnit, setToUnit] = useState<string>('psi');

  const convertedResult = useMemo(() => {
    return convertCalibrationUnit(convVal, convCat, fromUnit, toUnit);
  }, [convVal, convCat, fromUnit, toUnit]);

  // Copy Summary to Clipboard
  const [copied, setCopied] = useState(false);
  const handleCopySummary = () => {
    const text = `
=== LAPORAN EVALUASI KETIDAKPASTIAN (ISO GUM) ===
Kategori: ${category.toUpperCase()}
Nominal: ${nominalValue} ${unit}
Rata-rata Terukur: ${sampleStats.mean} ${unit}
Simpangan Baku (SD): ${sampleStats.sd} ${unit}
Daya Ulang (u_rep): ${sampleStats.uRep} ${unit}

--- BUDGET KETIDAKPASTIAN ---
${budgetData.rows.map(r => `${r.symbol}: ${r.value} | u_i = ${r.standardUncertainty.toFixed(5)} (${r.contributionPercentage.toFixed(1)}%)`).join('\n')}

Combined Standard Uncertainty (u_c): ${budgetData.uCombined.toFixed(5)} ${unit}
Welch-Satterthwaite nu_eff: ${nuEff}
Coverage Factor (k, 95%): ${coverageK}
Expanded Uncertainty (U): ${uExpanded.toFixed(5)} ${unit}
Reported Uncertainty (max(U, CMC)): ${reportedUncertainty.toFixed(5)} ${unit}

--- CONFORMITY ASSESSMENT (ILAC G8) ---
Hasil Keputusan: ${ilacResult.decision}
Toleransi Maksimum (MPE): ±${toleranceAbs} ${unit}
Guard Band (w): ${ilacResult.guardBand.toFixed(5)} ${unit}
TUR (Test Uncertainty Ratio): ${ilacResult.tur} : 1
Evaluasi: ${ilacResult.explanation}
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ==========================================
  // TAB 5: INSPEKSI FISIK, FUNGSI & KESELAMATAN LISTRIK (ESA)
  // ==========================================
  const PHYSICAL_ITEMS = [
    'Kondisi Casing / Bodi Alat',
    'Layar / Display & Indikator',
    'Kabel Power & Konektor',
    'Tombol, Saklar & Knob',
    'Label & Penandaan Alat',
    'Aksesori & Kelengkapan Alat',
    'Kebersihan & Higienitas Alat',
    'Kondisi Roda / Struktur Mekanik',
  ];
  const FUNCTIONAL_ITEMS = [
    'Fungsi ON / OFF',
    'Kinerja Operasional Utama',
    'Tampilan & Indikator Normal',
    'Fungsi Alarm (Suara & Visual)',
    'Penyetelan / Zeroing / Kalibrasi Internal',
    'Sistem Pengaman / Interlock',
    'Fungsi Battery / UPS (jika ada)',
    'Komunikasi Data / Output (jika ada)',
  ];

  type InspStatus = 'Baik' | 'Rusak' | 'Tidak Ada';
  const [physicalData, setPhysicalData] = useState<Record<string, InspStatus>>(
    () => Object.fromEntries(PHYSICAL_ITEMS.map(k => [k, 'Baik' as InspStatus]))
  );
  const [functionalData, setFunctionalData] = useState<Record<string, InspStatus>>(
    () => Object.fromEntries(FUNCTIONAL_ITEMS.map(k => [k, 'Baik' as InspStatus]))
  );

  // ESA — IEC 62353 / IEC 60601-1 Parameters
  const [esaEnabled, setEsaEnabled] = useState(true);
  const [esaStandard, setEsaStandard] = useState('IEC 62353');
  const [esaClassType, setEsaClassType] = useState('Kelas I');
  const [esaAppliedPart, setEsaAppliedPart] = useState('Tipe BF');
  const [esaEarthRes, setEsaEarthRes] = useState('');
  const [esaInsulation, setEsaInsulation] = useState('');
  const [esaEquipLeakage, setEsaEquipLeakage] = useState('');
  const [esaPatientLeakage, setEsaPatientLeakage] = useState('');
  const [esaTouchCurrent, setEsaTouchCurrent] = useState('');
  const [esaAuxPatientLeakage, setEsaAuxPatientLeakage] = useState('');

  // Limits based on IEC 62353 / IEC 60601-1
  const ESA_LIMITS: Record<string, { earthRes: number; insulation: number; equip: number; patient: number; touch: number; aux: number }> = {
    'Kelas I': { earthRes: 0.2, insulation: 2, equip: 500, patient: 100, touch: 100, aux: 10 },
    'Kelas II': { earthRes: Infinity, insulation: 7, equip: 500, patient: 100, touch: 100, aux: 10 },
    'Kelas Intern': { earthRes: 0.2, insulation: 2, equip: 100, patient: 50, touch: 100, aux: 10 },
  };
  const esaLimits = ESA_LIMITS[esaClassType] || ESA_LIMITS['Kelas I'];

  const esaResults = {
    earthRes: { val: parseFloat(esaEarthRes), limit: esaLimits.earthRes, unit: 'Ω', label: 'Tahanan Bumi / R_PE', pass: !esaEarthRes || parseFloat(esaEarthRes) <= esaLimits.earthRes },
    insulation: { val: parseFloat(esaInsulation), limit: esaLimits.insulation, unit: 'MΩ', label: 'Tahanan Isolasi / R_ISO', pass: !esaInsulation || parseFloat(esaInsulation) >= esaLimits.insulation },
    equip: { val: parseFloat(esaEquipLeakage), limit: esaLimits.equip, unit: 'μA', label: 'Arus Bocor Selungkup', pass: !esaEquipLeakage || parseFloat(esaEquipLeakage) <= esaLimits.equip },
    patient: { val: parseFloat(esaPatientLeakage), limit: esaLimits.patient, unit: 'μA', label: 'Arus Bocor Pasien', pass: !esaPatientLeakage || parseFloat(esaPatientLeakage) <= esaLimits.patient },
    touch: { val: parseFloat(esaTouchCurrent), limit: esaLimits.touch, unit: 'μA', label: 'Arus Sentuh (Touch Current)', pass: !esaTouchCurrent || parseFloat(esaTouchCurrent) <= esaLimits.touch },
    aux: { val: parseFloat(esaAuxPatientLeakage), limit: esaLimits.aux, unit: 'μA', label: 'Arus Bocor Pasien Auxiliar', pass: !esaAuxPatientLeakage || parseFloat(esaAuxPatientLeakage) <= esaLimits.aux },
  };

  const physOk = Object.values(physicalData).every(v => v === 'Baik');
  const funcOk = Object.values(functionalData).every(v => v === 'Baik');
  const esaOk = esaEnabled ? Object.values(esaResults).every(r => r.pass) : true;
  const overallInspOk = physOk && funcOk && esaOk;

  const STATUS_COLORS: Record<InspStatus, string> = {
    'Baik': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    'Rusak': 'bg-red-500/10 text-red-400 border-red-500/30',
    'Tidak Ada': 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-4 md:p-8">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5 sm:pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
                <Cpu className="w-6 h-6 sm:w-8 sm:h-8 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white flex flex-wrap items-center gap-2 sm:gap-3">
                  Mesin Perhitungan Metrologi
                  <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                    ISO GUM & KAN Standard
                  </span>
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-1">
                  Engine evaluasi ketidakpastian pengukur, Welch-Satterthwaite, Student-t coverage factor, dan ILAC G8 conformity rules.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopySummary}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 text-xs sm:text-sm font-semibold transition-all shadow-lg cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin!' : 'Salin Laporan'}
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 mt-4 sm:mt-6 overflow-x-auto pb-2 border-b border-slate-800/80 touch-pan-x no-scrollbar">
          <button
            onClick={() => setActiveTab('isogum')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
              activeTab === 'isogum'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Evaluator ISO GUM
          </button>

          <button
            onClick={() => setActiveTab('formula')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition-all shrink-0 cursor-pointer ${
              activeTab === 'formula'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Variable className="w-4 h-4" />
            Evaluator Formula Kustom
          </button>

          <button
            onClick={() => setActiveTab('converter')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === 'converter'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Konverter Satuan Metrologi
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === 'guide'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Panduan Distribusi GUM
          </button>

          <button
            onClick={() => setActiveTab('inspeksi')}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all shrink-0 ${
              activeTab === 'inspeksi'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Pemeriksaan Fisik, Fungsi & ESA
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: ISO GUM ENGINE */}
      {activeTab === 'isogum' && (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT PANEL: CONFIG & MEASUREMENT SAMPLES (COL 5) */}
          <div className="lg:col-span-5 space-y-6">
            {/* PARAMETER INSTRUMEN & KATEGORI */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                1. Parameter Alat & Kategori
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Kategori Pengujian Metrologi
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                  >
                    <option value="suhu">Suhu & Thermometry</option>
                    <option value="kelembaban">Kelembaban Relatif (RH)</option>
                    <option value="tekanan">Tekanan (Manometer / Sphygmo)</option>
                    <option value="timbangan">Massa & Timbangan Analitis</option>
                    <option value="volume_flow">Laju Alir Cairan (Infusion/Syringe Pump)</option>
                    <option value="radiologi">Radiologi & Dosis Sinar-X</option>
                    <option value="standard">Metrologi Umum (Standard)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                      Nominal / Titik Ukur
                    </label>
                    <input
                      type="number"
                      value={nominalValue}
                      onChange={(e) => setNominalValue(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                      Satuan Ukur
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                      Daya Baca / Resolusi (δ)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={resolution}
                      onChange={(e) => setResolution(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                      Drift Kalibrator (a_drift)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={drift}
                      onChange={(e) => setDrift(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                      Ketidakpastian Standar (U_std)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={masterUnc}
                      onChange={(e) => setMasterUnc(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                      Coverage Factor Standar (k_std)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={masterK}
                      onChange={(e) => setMasterK(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {/* CATEGORY SPECIFIC INPUTS */}
                {(category === 'suhu' || category === 'kelembaban') && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-amber-400 mb-1">
                        Stabilitas Ruang (u_stab)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={stability}
                        onChange={(e) => setStability(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-400 mb-1">
                        Uniformitas Ruang (u_unif)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={uniformity}
                        onChange={(e) => setUniformity(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {category === 'tekanan' && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-cyan-400 mb-1">
                        Histeresis (u_hyst)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={histeresis}
                        onChange={(e) => setHisteresis(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-cyan-400 mb-1">
                        Deviasi Zero (u_zero)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={zeroDev}
                        onChange={(e) => setZeroDev(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {category === 'timbangan' && (
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-rose-400 mb-1">
                        Eksentrisitas Skala (u_ecc)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={eccentricity}
                        onChange={(e) => setEccentricity(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-rose-400 mb-1">
                        Linearitas Skala (u_lin)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={linearity}
                        onChange={(e) => setLinearity(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-rose-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SAMPLING REPEATABILITY DATA (TYPE A) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-400" />
                  2. Pengukuran Berulang (Type A)
                </h2>
                <button
                  onClick={handleAddSample}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-semibold border border-emerald-500/40 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Sample
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {samples.map((val, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-xs font-mono font-bold text-slate-500 w-8">#{idx + 1}</span>
                    <input
                      type="number"
                      step="any"
                      value={val}
                      onChange={(e) => handleUpdateSample(idx, Number(e.target.value))}
                      className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none"
                    />
                    <button
                      onClick={() => handleRemoveSample(idx)}
                      disabled={samples.length <= 1}
                      className="text-slate-500 hover:text-rose-400 disabled:opacity-30 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* SAMPLE STATS SUMMARY */}
              <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center font-mono text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">RATA-RATA (ȳ)</span>
                  <span className="text-emerald-400 font-bold">{sampleStats.mean}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">SIMPANGAN (SD)</span>
                  <span className="text-cyan-400 font-bold">{sampleStats.sd}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">u_rep (SD/√n)</span>
                  <span className="text-amber-400 font-bold">{sampleStats.uRep}</span>
                </div>
              </div>
            </div>

            {/* CONFORMANCE SPECIFICATION INPUTS */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                3. Spesifikasi Toleransi & CMC (KAN)
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                    Batas Toleransi (MPE / ±Absolud)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={toleranceAbs}
                    onChange={(e) => setToleranceAbs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold tracking-wider text-slate-400 mb-1">
                    Batas Minimum CMC (KAN)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={cmcValue}
                    onChange={(e) => setCmcValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: LIVE BREAKDOWN & METROLOGICAL REPORT (COL 7) */}
          <div className="lg:col-span-7 space-y-6">
            {/* KEY METRICS SUMMARY CARDS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Combined Unc (u_c)
                </span>
                <div className="text-xl font-black font-mono text-cyan-400">
                  {budgetData.uCombined.toFixed(5)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">Satuan: {unit}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Welch-Satterthwaite ν_eff
                </span>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {nuEff === Infinity ? '∞' : nuEff}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">k_95 = {coverageK}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Expanded Unc (U, 95%)
                </span>
                <div className="text-xl font-black font-mono text-amber-400">
                  {uExpanded.toFixed(5)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">± {unit}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Reported Unc (KAN)
                </span>
                <div className="text-xl font-black font-mono text-indigo-400">
                  {reportedUncertainty.toFixed(5)}
                </div>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">max(U, CMC)</span>
              </div>
            </div>

            {/* CONFORMITY ASSESSMENT (ILAC G8 GUARD BANDING) */}
            <div className={`p-6 rounded-3xl border shadow-xl transition-all ${
              ilacResult.decision === 'PASS'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : ilacResult.decision === 'FAIL'
                ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {ilacResult.decision === 'PASS' && <CheckCircle2 className="w-7 h-7 text-emerald-400" />}
                  {ilacResult.decision === 'FAIL' && <XCircle className="w-7 h-7 text-rose-400" />}
                  {ilacResult.decision === 'INCONCLUSIVE' && <AlertTriangle className="w-7 h-7 text-amber-400" />}
                  <div>
                    <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                      Evaluasi Kesesuaian (ILAC G8)
                      <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                        ilacResult.decision === 'PASS'
                          ? 'bg-emerald-500 text-slate-950'
                          : ilacResult.decision === 'FAIL'
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500 text-slate-950'
                      }`}>
                        {ilacResult.decision}
                      </span>
                    </h3>
                    <p className="text-xs opacity-80 mt-0.5">{ilacResult.explanation}</p>
                  </div>
                </div>
              </div>

              {/* GUARD BAND VISUALIZER */}
              <div className="mt-4 pt-4 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">TUR (Tolerance / U)</span>
                  <span className="font-bold text-white">{ilacResult.tur} : 1</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">PITA GUARD BAND (w)</span>
                  <span className="font-bold text-amber-400">± {ilacResult.guardBand.toFixed(5)}</span>
                </div>
                <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">BATAS ZONA LULUS</span>
                  <span className="font-bold text-cyan-400">
                    [{ilacResult.acceptanceLimitLower.toFixed(3)} , {ilacResult.acceptanceLimitUpper.toFixed(3)}]
                  </span>
                </div>
              </div>
            </div>

            {/* DETAILED UNCERTAINTY BUDGET TABLE */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
              <h3 className="text-md font-bold text-white mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                  Tabel Budget Ketidakpastian (ISO GUM)
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Σ Contrib: 100.0%
                </span>
              </h3>

              <div className="overflow-x-auto touch-pan-x no-scrollbar">
                <table className="w-full min-w-[640px] text-left text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                      <th className="p-3">Sumber Ketidakpastian</th>
                      <th className="p-3 text-right">Nilai (x_i)</th>
                      <th className="p-3 text-center">Distribusi</th>
                      <th className="p-3 text-right">Divisor</th>
                      <th className="p-3 text-right">u(x_i)</th>
                      <th className="p-3 text-right">Kontribusi (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {budgetData.rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-semibold text-slate-200">{row.sourceName}</td>
                        <td className="p-3 text-right text-cyan-300">{row.value}</td>
                        <td className="p-3 text-center capitalize text-slate-400">{row.distribution}</td>
                        <td className="p-3 text-right text-slate-400">{row.divisor.toFixed(3)}</td>
                        <td className="p-3 text-right font-bold text-amber-300">
                          {row.standardUncertainty.toFixed(5)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {row.contributionPercentage.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* VISUAL VARIANCE CONTRIBUTION BARS */}
              <div className="mt-6 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Grafik Proporsi Komponen Ketidakpastian (u_i² / u_c²)
                </h4>
                {budgetData.rows.map((row) => (
                  <div key={row.id} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>{row.symbol}</span>
                      <span>{row.contributionPercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(1, row.contributionPercentage)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: DYNAMIC FORMULA EVALUATOR */}
      {activeTab === 'formula' && (
        <div className="max-w-6xl mx-auto space-y-8">
          {/* PRESET TEMPLATES */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-md font-bold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Template Presets Formula Metrologi Popular
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleLoadFormulaPreset('error')}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-cyan-300 text-xs font-semibold rounded-xl border border-cyan-500/30 transition-all"
              >
                Koreksi Korektif (Error)
              </button>
              <button
                onClick={() => handleLoadFormulaPreset('flow')}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-emerald-300 text-xs font-semibold rounded-xl border border-emerald-500/30 transition-all"
              >
                Propagasi Flow Cairan (Q = V/t)
              </button>
              <button
                onClick={() => handleLoadFormulaPreset('gas')}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-all"
              >
                Koreksi Barometrik Gas Medis
              </button>
              <button
                onClick={() => handleLoadFormulaPreset('safety')}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-800 text-indigo-300 text-xs font-semibold rounded-xl border border-indigo-500/30 transition-all"
              >
                IEC 62353 Arus Bocor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* FORMULA INPUT & VARIABLES */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Ekspresi Matematika Formula
                </label>
                <textarea
                  rows={3}
                  value={formulaInput}
                  onChange={(e) => setFormulaInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl p-4 text-cyan-300 font-mono text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
                  placeholder="Contoh: sqrt(u_res^2 + u_std^2)"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Fungsi didukung: sqrt(), abs(), pow(x,y), sin(), cos(), log(), ^
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-white">Variabel Parameter Formula</h3>
                  <button
                    onClick={handleAddFormulaVar}
                    className="flex items-center gap-1 px-3 py-1 bg-cyan-500/20 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/40 hover:bg-cyan-500/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Variabel
                  </button>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {formulaVars.map((v, idx) => (
                    <div key={idx} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={v.name}
                          onChange={(e) => handleUpdateFormulaVar(idx, 'name', e.target.value)}
                          className="w-1/3 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-cyan-400 font-mono text-xs font-bold"
                          placeholder="Nama (e.g. u1)"
                        />
                        <input
                          type="text"
                          value={v.label}
                          onChange={(e) => handleUpdateFormulaVar(idx, 'label', e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-300 text-xs"
                          placeholder="Keterangan variabel"
                        />
                        <button
                          onClick={() => handleRemoveFormulaVar(idx)}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div>
                        <input
                          type="number"
                          step="any"
                          value={v.value}
                          onChange={(e) => handleUpdateFormulaVar(idx, 'value', Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-mono text-xs font-bold"
                          placeholder="Nilai angka"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE RESULT DISPLAY */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Hasil Evaluasi Real-Time
                </h3>

                {formulaEval.error ? (
                  <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
                    <div>
                      <span className="font-bold block">Kesalahan Sintaks Formula</span>
                      <span className="text-xs">{formulaEval.error}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950 border border-cyan-500/30 rounded-3xl space-y-4">
                    <span className="text-xs font-mono text-slate-400 block">HASIL EKSPRESI:</span>
                    <div className="text-4xl font-black font-mono text-cyan-400 tracking-tight">
                      {formulaEval.result}
                    </div>

                    <div className="pt-4 border-t border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
                      <span className="block text-[10px] text-slate-500">EKSPRESI SUBS:</span>
                      <p className="text-slate-300 break-all">{formulaInput}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs text-slate-400">
                <span className="font-bold text-white block mb-1">💡 Catatan Keamanan Metrologi:</span>
                Evaluator formula dijalankan dalam lingkungan terisolasi aman tanpa eksekusi kode eksternal. Digunakan untuk perhitungan cepat nilai koreksi, interpolasi sensor, dan formula ISO/IEC kustom.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: UNIT CONVERTER */}
      {activeTab === 'converter' && (
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin-slow" />
              Kalkulator Konversi Satuan Metrologi
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Kategori Besaran
                </label>
                <select
                  value={convCat}
                  onChange={(e) => {
                    setConvCat(e.target.value);
                    if (e.target.value === 'tekanan') { setFromUnit('bar'); setToUnit('psi'); }
                    if (e.target.value === 'suhu') { setFromUnit('°C'); setToUnit('°F'); }
                    if (e.target.value === 'massa') { setFromUnit('kg'); setToUnit('g'); }
                    if (e.target.value === 'flow') { setFromUnit('L/min'); setToUnit('mL/h'); }
                    if (e.target.value === 'listrik') { setFromUnit('V'); setToUnit('mV'); }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  <option value="tekanan">Tekanan (Pressure)</option>
                  <option value="suhu">Suhu (Temperature)</option>
                  <option value="massa">Massa (Mass)</option>
                  <option value="flow">Laju Alir (Flow Rate)</option>
                  <option value="listrik">Listrik (Voltage / Current)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Dari Satuan (From)
                </label>
                <select
                  value={fromUnit}
                  onChange={(e) => setFromUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  {convCat === 'tekanan' && ['bar', 'mbar', 'psi', 'kPa', 'MPa', 'mmHg', 'inHg', 'kg/cm²'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'suhu' && ['°C', '°F', 'K'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'massa' && ['kg', 'g', 'mg', 'μg', 'lb'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'flow' && ['L/min', 'mL/min', 'mL/h', 'm³/h', 'L/h'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'listrik' && ['V', 'mV', 'μV', 'kV', 'A', 'mA', 'μA', 'Ω', 'kΩ', 'MΩ'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Ke Satuan (To)
                </label>
                <select
                  value={toUnit}
                  onChange={(e) => setToUnit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white font-medium focus:ring-2 focus:ring-cyan-500 outline-none"
                >
                  {convCat === 'tekanan' && ['bar', 'mbar', 'psi', 'kPa', 'MPa', 'mmHg', 'inHg', 'kg/cm²'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'suhu' && ['°C', '°F', 'K'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'massa' && ['kg', 'g', 'mg', 'μg', 'lb'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'flow' && ['L/min', 'mL/min', 'mL/h', 'm³/h', 'L/h'].map(u => <option key={u} value={u}>{u}</option>)}
                  {convCat === 'listrik' && ['V', 'mV', 'μV', 'kV', 'A', 'mA', 'μA', 'Ω', 'kΩ', 'MΩ'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Nilai Yang Dikonversi
                </label>
                <input
                  type="number"
                  step="any"
                  value={convVal}
                  onChange={(e) => setConvVal(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-2xl px-5 py-4 text-2xl font-black font-mono text-white focus:ring-2 focus:ring-cyan-500 outline-none"
                />
              </div>

              <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-center">
                <span className="text-xs font-mono text-slate-400 block mb-1">HASIL KONVERSI METROLOGI:</span>
                <div className="text-3xl font-black font-mono text-cyan-400">
                  {convertedResult} <span className="text-sm text-slate-400">{toUnit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: METROLOGY GUIDE */}
      {activeTab === 'guide' && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl space-y-6 text-sm text-slate-300">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-cyan-400" />
              Panduan Evaluasi Ketidakpastian ISO GUM / KAN
            </h2>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white mb-1 text-base text-cyan-400">1. Evaluasi Tipe A vs Tipe B</h3>
                <p>
                  <strong>Tipe A:</strong> Dievaluasi dengan metode statistik dari serangkaian pengukuran berulang. Diukur menggunakan Standard Deviation of Mean (SDM): <code className="text-emerald-300 font-mono">u_rep = SD / √n</code>.
                </p>
                <p className="mt-2">
                  <strong>Tipe B:</strong> Dievaluasi berdasarkan informasi eksternal seperti sertifikat kalibrasi standar, spesifikasi pabrik, atau resolusi skala instrumen.
                </p>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white mb-1 text-base text-amber-400">2. Pembagi Distribusi Probabilitas</h3>
                <ul className="list-disc list-inside space-y-1.5 font-mono text-xs text-slate-300">
                  <li><strong>Distribusi Normal:</strong> Pembagi <code className="text-cyan-300">k</code> (biasanya k=2 dari sertifikat standar).</li>
                  <li><strong>Distribusi Sembarang (Rectangular):</strong> Pembagi <code className="text-cyan-300">√3</code> (misalnya drift standar) atau <code className="text-cyan-300">2√3</code> (resolusi skala instrumen).</li>
                  <li><strong>Distribusi Segitiga (Triangular):</strong> Pembagi <code className="text-cyan-300">√6</code> (biasanya pada efek suhu ambien terbatas).</li>
                  <li><strong>Distribusi U-Shaped:</strong> Pembagi <code className="text-cyan-300">√2</code> (efek kontrol termostatik sinusoidal).</li>
                </ul>
              </div>

              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <h3 className="font-bold text-white mb-1 text-base text-emerald-400">3. Formulasi Welch-Satterthwaite (ν_eff)</h3>
                <p>
                  Derajat kebebasan efektif digunakan untuk menentukan faktor cakupan <code className="text-cyan-300 font-mono">k</code> dari distribusi Student-t pada tingkat kepercayaan 95.45%:
                </p>
                <div className="p-3 bg-slate-900 rounded-xl my-2 text-center font-mono text-cyan-300 text-xs">
                  ν_eff = u_c⁴ / Σ [ u_i⁴ / ν_i ]
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INSPEKSI FISIK, FUNGSI & KESELAMATAN LISTRIK */}
      {activeTab === 'inspeksi' && (
        <div className="max-w-7xl mx-auto space-y-8">

          {/* VERDICT HEADER */}
          <div className={`rounded-3xl border p-6 flex items-center gap-6 shadow-2xl ${
            overallInspOk
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            <div className={`p-4 rounded-2xl ${
              overallInspOk ? 'bg-emerald-500/20' : 'bg-red-500/20'
            }`}>
              <ShieldCheck className={`w-10 h-10 ${
                overallInspOk ? 'text-emerald-400' : 'text-red-400'
              }`} />
            </div>
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Hasil Pemeriksaan Terpadu (Fisik + Fungsi + ESA)</p>
              <h2 className={`text-2xl font-black tracking-tight ${
                overallInspOk ? 'text-emerald-300' : 'text-red-300'
              }`}>
                {overallInspOk ? '✅ LAIK — Semua Parameter LULUS' : '❌ TIDAK LAIK — Terdapat Parameter GAGAL'}
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Fisik: <span className={physOk ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{physOk ? 'LULUS' : 'GAGAL'}</span>
                {' • '} Fungsi: <span className={funcOk ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{funcOk ? 'LULUS' : 'GAGAL'}</span>
                {' • '} ESA: <span className={esaOk ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>{esaEnabled ? (esaOk ? 'LULUS' : 'GAGAL') : 'TIDAK DIUJI'}</span>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* PEMERIKSAAN FISIK */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-black text-white mb-5 flex items-center gap-2">
                <span className="p-2 bg-blue-500/10 rounded-xl"><Activity className="w-4 h-4 text-blue-400" /></span>
                Pemeriksaan Fisik / Visual
                <span className={`ml-auto text-xs font-black px-3 py-1 rounded-full border ${
                  physOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>{physOk ? 'LULUS' : 'GAGAL'}</span>
              </h3>
              <div className="space-y-3">
                {PHYSICAL_ITEMS.map(item => (
                  <div key={item} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-300 font-medium flex-1">{item}</span>
                    <div className="flex gap-1.5 shrink-0">
                      {(['Baik', 'Rusak', 'Tidak Ada'] as InspStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setPhysicalData(d => ({ ...d, [item]: s }))}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                            physicalData[item] === s
                              ? STATUS_COLORS[s]
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
                          }`}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PEMERIKSAAN FUNGSI */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-base font-black text-white mb-5 flex items-center gap-2">
                <span className="p-2 bg-amber-500/10 rounded-xl"><Cpu className="w-4 h-4 text-amber-400" /></span>
                Pemeriksaan Fungsi Operasional
                <span className={`ml-auto text-xs font-black px-3 py-1 rounded-full border ${
                  funcOk ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
                }`}>{funcOk ? 'LULUS' : 'GAGAL'}</span>
              </h3>
              <div className="space-y-3">
                {FUNCTIONAL_ITEMS.map(item => (
                  <div key={item} className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-300 font-medium flex-1">{item}</span>
                    <div className="flex gap-1.5 shrink-0">
                      {(['Baik', 'Rusak', 'Tidak Ada'] as InspStatus[]).map(s => (
                        <button
                          key={s}
                          onClick={() => setFunctionalData(d => ({ ...d, [item]: s }))}
                          className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                            functionalData[item] === s
                              ? STATUS_COLORS[s]
                              : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-slate-600'
                          }`}
                        >{s}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KESELAMATAN LISTRIK (ESA) */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <span className="p-2 bg-violet-500/10 rounded-xl"><Zap className="w-4 h-4 text-violet-400" /></span>
                  Keselamatan Listrik (ESA)
                </h3>
                <button
                  onClick={() => setEsaEnabled(v => !v)}
                  className={`text-[10px] font-black px-3 py-1.5 rounded-xl border transition-all ${
                    esaEnabled
                      ? 'bg-violet-500/10 text-violet-400 border-violet-500/30'
                      : 'bg-slate-800 text-slate-500 border-slate-700'
                  }`}
                >{esaEnabled ? '🟢 AKTIF' : '⚫ NONAKTIF'}</button>
              </div>

              {esaEnabled ? (
                <div className="space-y-4">
                  {/* Config */}
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Standar Pengujian</label>
                      <select
                        value={esaStandard}
                        onChange={e => setEsaStandard(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500 outline-none"
                      >
                        <option>IEC 62353</option>
                        <option>IEC 60601-1</option>
                        <option>IEC 60601-1 + IEC 62353</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Kelas Alat</label>
                        <select
                          value={esaClassType}
                          onChange={e => setEsaClassType(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                          <option>Kelas I</option>
                          <option>Kelas II</option>
                          <option>Kelas Intern</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Applied Part</label>
                        <select
                          value={esaAppliedPart}
                          onChange={e => setEsaAppliedPart(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-violet-500 outline-none"
                        >
                          <option>Tipe B</option>
                          <option>Tipe BF</option>
                          <option>Tipe CF</option>
                          <option>Tidak Ada</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Measurement Inputs */}
                  <div className="space-y-2.5">
                    {[
                      { key: 'earthRes', val: esaEarthRes, setter: setEsaEarthRes, label: 'R_PE — Tahanan Bumi', unit: 'Ω', limit: `≤ ${esaLimits.earthRes === Infinity ? 'N/A' : esaLimits.earthRes}` },
                      { key: 'insulation', val: esaInsulation, setter: setEsaInsulation, label: 'R_ISO — Tahanan Isolasi', unit: 'MΩ', limit: `≥ ${esaLimits.insulation}` },
                      { key: 'equip', val: esaEquipLeakage, setter: setEsaEquipLeakage, label: 'I_LE — Arus Bocor Selungkup', unit: 'μA', limit: `≤ ${esaLimits.equip}` },
                      { key: 'patient', val: esaPatientLeakage, setter: setEsaPatientLeakage, label: 'I_LP — Arus Bocor Pasien', unit: 'μA', limit: `≤ ${esaLimits.patient}` },
                      { key: 'touch', val: esaTouchCurrent, setter: setEsaTouchCurrent, label: 'I_T — Arus Sentuh', unit: 'μA', limit: `≤ ${esaLimits.touch}` },
                      { key: 'aux', val: esaAuxPatientLeakage, setter: setEsaAuxPatientLeakage, label: 'I_AUX — Arus Bocor Aux Pasien', unit: 'μA', limit: `≤ ${esaLimits.aux}` },
                    ].map(({ key, val, setter, label, unit, limit }) => {
                      const r = esaResults[key as keyof typeof esaResults];
                      const hasVal = val !== '' && !isNaN(parseFloat(val));
                      return (
                        <div key={key} className={`rounded-xl border p-3 transition-all ${
                          !hasVal ? 'border-slate-800 bg-slate-950'
                          : r.pass ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'
                        }`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>
                            {hasVal && (
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                r.pass ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
                              }`}>{r.pass ? 'LULUS' : 'GAGAL'}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={val}
                              onChange={e => setter(e.target.value)}
                              placeholder="Masukkan nilai"
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:ring-2 focus:ring-violet-500 outline-none"
                            />
                            <span className="text-xs font-mono text-violet-300 w-8 text-center">{unit}</span>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">{limit} {unit}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ESA Summary Badge */}
                  <div className={`mt-3 p-3 rounded-2xl border text-center ${
                    esaOk ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
                  }`}>
                    <p className={`text-sm font-black tracking-tight ${
                      esaOk ? 'text-emerald-300' : 'text-red-300'
                    }`}>
                      {esaOk ? '✅ ESA LULUS' : '❌ ESA GAGAL'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{esaStandard} · {esaClassType} · Applied Part {esaAppliedPart}</p>
                  </div>
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center gap-3 text-center">
                  <Zap className="w-12 h-12 text-slate-700" />
                  <p className="text-slate-500 text-sm font-medium">Modul ESA Dinonaktifkan</p>
                  <p className="text-slate-600 text-xs">Aktifkan untuk memasukkan parameter IEC 62353 / IEC 60601-1</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icon helper import fix
function BookOpen(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
