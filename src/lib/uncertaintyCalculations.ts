/**
 * Utility for instrument-specific uncertainty calculations based on the latest KMK/ISO GUM guidelines.
 * Covers: Suhu, Tekanan, Massa, Flow, Radiologi, and generic/standard categories.
 */

export interface UncertaintyBreakdown {
  methodUsed: string;
  u1: number;       // u_res (Resolution)
  u2: number;       // u_std (Calibrator Certificate)
  u3: number;       // u_rep (Repeatability of measurements)
  u4: number;       // u_drift (Drift/stabilitas kalibrator)
  uStab?: number;   // Suhu stability over time
  uUnif?: number;   // Suhu uniformity / spatial distribution
  uHyst?: number;   // Tekanan hysteresis
  uZero?: number;   // Tekanan zero setting deviation
  uEcc?: number;    // Massa eccentricity error
  uLin?: number;    // Massa linearity error
  uV?: number;      // Flow Volume component
  uT?: number;      // Flow Time component
  uDist?: number;   // Radiologi distance component
  uKvp?: number;    // Radiologi high voltage component
  uCombined: number;// Combined standard uncertainty (u_c)
  uExpanded: number;// Expanded uncertainty (U) with coverage factor k=2 (95% CL)
  k: number;        // Coverage factor (standardly 2)
  formulaDescription: string;
  cmcValue?: number;
  cmcComplied?: boolean;
  reportedUncertainty?: number;
  tur?: number;
  tar?: number;
}

/**
 * Switch-case driver that evaluates uncertainty based on the device category as per KMK.
 */
export function calculateInstrumentUncertainty(
  category: string,
  resolution: unknown = 0.01,
  masterUnc: unknown = 0.001,
  drift: unknown = 0,
  m: Record<string, unknown> = {}
): UncertaintyBreakdown {
  const methodUsed = category || 'standard';
  const k = 2; // coverage factor at 95% Confidence Level

  // Robustly parse core parameters to numbers
  const resNum = (resolution !== undefined && resolution !== null && resolution !== '') ? Number(resolution) : 0.01;
  const masterUncNum = (masterUnc !== undefined && masterUnc !== null && masterUnc !== '') ? Number(masterUnc) : 0.001;
  const driftNum = (drift !== undefined && drift !== null && drift !== '') ? Number(drift) : 0;

  // 1. Resolution / Skala Terkecil (u1)
  // Rectangular distribution (divided by 2 * sqrt(3))
  const u1 = resNum / (2 * Math.sqrt(3));

  // 2. Master Calibrator uncertainty from Certificate (u2)
  // Normally distributed with k=2 on standard certificates
  const u2 = masterUncNum / 2;

  // 3. Repeatability of measurements (u3)
  // Standard Deviation of Mean (SD / sqrt(n)), or fallback placeholder if no SD is provided
  const sd = (m.sd !== undefined && m.sd !== null && m.sd !== '') ? Number(m.sd) : 0;
  const n = (m.n !== undefined && m.n !== null && m.n !== '' && !isNaN(Number(m.n)) && Number(m.n) > 0) ? Number(m.n) : 3;
  const u3 = sd > 0 ? (sd / Math.sqrt(n)) : ((resNum * 0.25) / Math.sqrt(3));

  // 4. Drift Standard / drift calibration (u4)
  // Rectangular distribution
  const u4 = driftNum / Math.sqrt(3);

  let uCombined = 0;
  let formulaDescription = '';
  const breakdown: Partial<UncertaintyBreakdown> = {
    methodUsed,
    u1,
    u2,
    u3,
    u4,
    k,
  };

  switch (methodUsed) {
    case 'suhu':
    case 'kelembaban':
    case 'sterilisasi': {
      // Suhu / Heat & Moisture: includes stability & uniformity (distribution)
      const stability = (m.stability !== undefined && m.stability !== null && m.stability !== '') ? Number(m.stability) : 0;
      const uniformity = (m.uniformity !== undefined && m.uniformity !== null && m.uniformity !== '') ? Number(m.uniformity) : 0;
      
      const uStab = stability / (2 * Math.sqrt(3));
      const uUnif = uniformity / (2 * Math.sqrt(3));
      
      let extraSq = 0;
      if (methodUsed === 'sterilisasi') {
        const autoclaveP = (m.autoclaveP !== undefined && m.autoclaveP !== null && m.autoclaveP !== '') ? Number(m.autoclaveP) : 0;
        extraSq = Math.pow(autoclaveP * 0.02, 2);
      }

      const uCombinedSq = 
        Math.pow(u1, 2) + 
        Math.pow(u2, 2) + 
        Math.pow(u3, 2) + 
        Math.pow(u4, 2) + 
        Math.pow(uStab, 2) + 
        Math.pow(uUnif, 2) + 
        extraSq;
      
      uCombined = Math.sqrt(uCombinedSq);
      
      breakdown.uStab = uStab;
      breakdown.uUnif = uUnif;
      formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_drift² + u_stabilitas² + u_uniformitas²' + 
        (methodUsed === 'sterilisasi' ? ' + u_tekanan²' : '') + ']';
      break;
    }

    case 'tekanan': {
      // Tekanan: includes hysteresis & zero-drift setting
      const histeresis = (m.histeresis !== undefined && m.histeresis !== null && m.histeresis !== '') ? Number(m.histeresis) : 0;
      const zero = (m.zero !== undefined && m.zero !== null && m.zero !== '') ? Number(m.zero) : 0;
      
      const uHyst = histeresis / (2 * Math.sqrt(3));
      const uZero = zero / (2 * Math.sqrt(3));

      const uCombinedSq = 
        Math.pow(u1, 2) + 
        Math.pow(u2, 2) + 
        Math.pow(u3, 2) + 
        Math.pow(u4, 2) + 
        Math.pow(uHyst, 2) + 
        Math.pow(uZero, 2);
      
      uCombined = Math.sqrt(uCombinedSq);
      
      breakdown.uHyst = uHyst;
      breakdown.uZero = uZero;
      formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_drift² + u_histeresis² + u_no_drift²]';
      break;
    }

    case 'timbangan': 
    case 'gaya_beban_torsi': {
      // Massa (Timbangan): includes scale eccentricity and scale linearity
      const eccentricity = (m.eccentricity !== undefined && m.eccentricity !== null && m.eccentricity !== '') ? Number(m.eccentricity) : 0;
      const linearity = (m.linearity !== undefined && m.linearity !== null && m.linearity !== '') ? Number(m.linearity) : 0;
      
      const uEcc = eccentricity / (2 * Math.sqrt(3));
      const uLin = linearity / (2 * Math.sqrt(3));
      
      let extraSq = 0;
      if (methodUsed === 'gaya_beban_torsi') {
        const armLength = (m.armLength !== undefined && m.armLength !== null && m.armLength !== '' && !isNaN(Number(m.armLength)) && Number(m.armLength) > 0) ? Number(m.armLength) : 0.25;
        const uArm = (m.uArm !== undefined && m.uArm !== null && m.uArm !== '') ? Number(m.uArm) : 0.001;
        const actualVal = (m.actual !== undefined && m.actual !== null && m.actual !== '') ? Number(m.actual) : (m.point !== undefined && m.point !== null ? Number(m.point) : 1);
        extraSq = Math.pow(actualVal * (uArm / armLength), 2);
      }

      const uCombinedSq = 
        Math.pow(u1, 2) + 
        Math.pow(u2, 2) + 
        Math.pow(u3, 2) + 
        Math.pow(uEcc, 2) + 
        Math.pow(uLin, 2) + 
        extraSq;
      
      uCombined = Math.sqrt(uCombinedSq);
      
      breakdown.uEcc = uEcc;
      breakdown.uLin = uLin;
      formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_eksentrisitas² + u_linearitas²' + 
        (methodUsed === 'gaya_beban_torsi' ? ' + u_arm²' : '') + ']';
      break;
    }

    case 'volume_flow': {
      // Flow Cairan: Q = V / t
      const actualVal = (m.actual !== undefined && m.actual !== null && m.actual !== '') ? Number(m.actual) : (m.point !== undefined && m.point !== null ? Number(m.point) : 10);
      const Q = Math.abs(actualVal);
      const V = (m.volumeVal !== undefined && m.volumeVal !== null && m.volumeVal !== '' && !isNaN(Number(m.volumeVal)) && Number(m.volumeVal) > 0) ? Number(m.volumeVal) : 100;
      const uV = (m.uVolume !== undefined && m.uVolume !== null && m.uVolume !== '') ? Number(m.uVolume) : 0.5;
      const t = (m.timeVal !== undefined && m.timeVal !== null && m.timeVal !== '' && !isNaN(Number(m.timeVal)) && Number(m.timeVal) > 0) ? Number(m.timeVal) : 60;
      const uT = (m.uTime !== undefined && m.uTime !== null && m.uTime !== '') ? Number(m.uTime) : 0.1;
      
      uCombined = Q * Math.sqrt(Math.pow(uV / V, 2) + Math.pow(uT / t, 2));
      
      breakdown.uV = uV;
      breakdown.uT = uT;
      
      if (isNaN(uCombined) || uCombined === 0) {
        uCombined = Math.sqrt(Math.pow(u1, 2) + Math.pow(u2, 2) + Math.pow(u3, 2) + Math.pow(u4, 2));
        formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_drift²] (Fallback flow)';
      } else {
        formulaDescription = 'u_c = Q × √[(u_V / V)² + (u_t / t)²] (Hukum Propagasi Laju Alir Cairan)';
      }
      break;
    }

    case 'gas_flow':
    case 'gas_medis_konsentrasi': {
      // Flow Gas / Gas Medis: Q_std corrected by temp and pressure
      const actualVal = (m.actual !== undefined && m.actual !== null && m.actual !== '') ? Number(m.actual) : (m.point !== undefined && m.point !== null ? Number(m.point) : 10);
      const Q = Math.abs(actualVal);
      const gasTemp = (m.gasTemp !== undefined && m.gasTemp !== null && m.gasTemp !== '') ? Number(m.gasTemp) : 25;
      const gasPress = (m.gasPress !== undefined && m.gasPress !== null && m.gasPress !== '' && !isNaN(Number(m.gasPress)) && Number(m.gasPress) > 0) ? Number(m.gasPress) : 1013;
      const uTemp = (gasTemp + 273.15) * 0.002 / Math.sqrt(3);
      const uPress = gasPress * 0.001 / Math.sqrt(3);
      
      uCombined = Q * Math.sqrt(Math.pow(u2 / (Q || 1), 2) + Math.pow(uTemp / (gasTemp + 273.15), 2) + Math.pow(uPress / gasPress, 2));
      
      breakdown.uV = uTemp; // save temperature uncertainty component
      breakdown.uT = uPress; // save pressure uncertainty component
      
      if (isNaN(uCombined) || uCombined === 0) {
        uCombined = Math.sqrt(Math.pow(u1, 2) + Math.pow(u2, 2) + Math.pow(u3, 2) + Math.pow(u4, 2));
        formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_drift²] (Fallback flow)';
      } else {
        formulaDescription = 'u_c = Q × √[(u_std / Q)² + (u_temp / T_abs)² + (u_press / P)²] (Koreksi Suhu & Tekanan Gas)';
      }
      break;
    }

    case 'radiologi':
    case 'dosis_radiasi': {
      // Radiologi: includes KVp, distance deviations
      const actualVal = (m.actual !== undefined && m.actual !== null && m.actual !== '') ? Number(m.actual) : (m.point !== undefined && m.point !== null ? Number(m.point) : 100);
      const D = Math.abs(actualVal);
      const distanceD = (m.distanceD !== undefined && m.distanceD !== null && m.distanceD !== '' && !isNaN(Number(m.distanceD)) && Number(m.distanceD) > 0) ? Number(m.distanceD) : 100;
      const uDistance = (m.uDistance !== undefined && m.uDistance !== null && m.uDistance !== '') ? Number(m.uDistance) : 0.5;
      const kvpVal = (m.kvpVal !== undefined && m.kvpVal !== null && m.kvpVal !== '' && !isNaN(Number(m.kvpVal)) && Number(m.kvpVal) > 0) ? Number(m.kvpVal) : 80;
      const uKvp = (m.uKvp !== undefined && m.uKvp !== null && m.uKvp !== '') ? Number(m.uKvp) : 1.5;
      
      const term1 = Math.pow(u2 / D, 2);       // u_std
      const term2 = Math.pow(u3 / D, 2);       // u_repeat
      const term3 = Math.pow(uDistance / distanceD, 2); // u_jarak
      const term4 = Math.pow(uKvp / kvpVal, 2); // u_kVp
      
      uCombined = D * Math.sqrt(term1 + term2 + term3 + term4);
      
      breakdown.uDist = uDistance;
      breakdown.uKvp = uKvp;
      
      if (isNaN(uCombined) || uCombined === 0) {
        uCombined = Math.sqrt(Math.pow(u1, 2) + Math.pow(u2, 2) + Math.pow(u3, 2) + Math.pow(u4, 2));
        formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_drift²] (Fallback Radiologi)';
      } else {
        formulaDescription = 'u_c = D × √[(u_std/D)² + (u_rep/D)² + (u_jarak/jarak)² + (u_kVp/kVp)²]';
      }
      break;
    }

    default: {
      // standard / normal model
      const uCombinedSq = Math.pow(u1, 2) + Math.pow(u2, 2) + Math.pow(u3, 2) + Math.pow(u4, 2);
      uCombined = Math.sqrt(uCombinedSq);
      formulaDescription = 'u_c = √[u_res² + u_std² + u_rep² + u_drift²] (Standard Umum ISO GUM)';
      break;
    }
  }

  const uExpanded = uCombined * k;

  // ISO 17025 Metrology Calculations
  const rawTol = m.tolerance !== undefined ? m.tolerance : null;
  const tolerance = (rawTol !== null && rawTol !== "") ? Number(rawTol) : null;
  
  const rawCmc = m.cmcValue !== undefined ? m.cmcValue : (m.cmc !== undefined ? m.cmc : null);
  const cmcVal = (rawCmc !== null && rawCmc !== "") ? Number(rawCmc) : null;

  const reportedUncertainty = (cmcVal !== null && !isNaN(cmcVal)) ? Math.max(uExpanded, cmcVal) : uExpanded;
  const cmcComplied = (cmcVal !== null && !isNaN(cmcVal)) ? (uExpanded >= cmcVal) : true;

  const tur = (tolerance !== null && !isNaN(tolerance) && reportedUncertainty > 0) ? (tolerance / reportedUncertainty) : undefined;
  const tar = (tolerance !== null && !isNaN(tolerance) && masterUncNum > 0) ? (tolerance / masterUncNum) : undefined;

  return {
    ...(breakdown as UncertaintyBreakdown),
    uCombined,
    uExpanded,
    formulaDescription,
    cmcValue: cmcVal ?? undefined,
    cmcComplied,
    reportedUncertainty,
    tur,
    tar,
  } as UncertaintyBreakdown;
}

/**
 * Budget component interface for detailed ISO GUM Uncertainty Budget
 */
export interface UncertaintyBudgetRow {
  id: string;
  sourceName: string;
  symbol: string;
  value: number;            // Component magnitude / value (x_i or a)
  distribution: 'normal' | 'rectangular' | 'triangular' | 'u-shaped';
  divisor: number;          // e.g., 1, 2, sqrt(3), sqrt(6), sqrt(2)
  standardUncertainty: number; // u(x_i) = value / divisor
  sensitivityCoefficient: number; // c_i = df/dx_i
  degreesOfFreedom: number;   // nu_i (e.g. n-1 or infinity)
  varianceContribution: number; // (c_i * u(x_i))^2
  contributionPercentage: number; // % contribution to u_c^2
}

/**
 * Calculates Welch-Satterthwaite effective degrees of freedom (nu_eff)
 */
export function calculateWelchSatterthwaite(rows: UncertaintyBudgetRow[], uCombined: number): number {
  if (!uCombined || uCombined === 0 || rows.length === 0) return Infinity;
  const uc4 = Math.pow(uCombined, 4);
  let sumDenominator = 0;

  for (const row of rows) {
    const ui = row.sensitivityCoefficient * row.standardUncertainty;
    const df = row.degreesOfFreedom || Infinity;
    if (df > 0 && isFinite(df)) {
      sumDenominator += Math.pow(ui, 4) / df;
    }
  }

  if (sumDenominator === 0) return Infinity;
  const nuEff = uc4 / sumDenominator;
  return Math.max(1, Math.round(nuEff * 100) / 100);
}

/**
 * Interpolates Student's t coverage factor (k) for 95.45% or 95% Confidence Level based on nu_eff
 */
export function getCoverageFactorK(nuEff: number, confidence: number = 0.95): number {
  if (nuEff >= 100 || !isFinite(nuEff)) return 2.00;
  
  // Student-t table at 95% (two-tailed) for degrees of freedom 1..30 and selected values
  const tTable95: Record<number, number> = {
    1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
    6: 2.45,  7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
    11: 2.20, 12: 2.18, 13: 2.16, 14: 2.14, 15: 2.13,
    16: 2.12, 17: 2.11, 18: 2.10, 19: 2.09, 20: 2.09,
    25: 2.06, 30: 2.04, 40: 2.02, 50: 2.01, 60: 2.00
  };

  const roundedNu = Math.floor(nuEff);
  if (tTable95[roundedNu]) return tTable95[roundedNu];

  if (roundedNu > 30 && roundedNu < 40) return 2.03;
  if (roundedNu > 40 && roundedNu < 50) return 2.01;
  if (roundedNu > 50) return 2.00;

  return 2.00;
}

/**
 * Conformity Assessment & ILAC G8 Decision Rule Evaluation
 */
export interface ILACDecisionResult {
  decision: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  upperTolerance: number;
  lowerTolerance: number;
  guardBand: number;
  acceptanceLimitUpper: number;
  acceptanceLimitLower: number;
  tur: number;
  explanation: string;
}

export function evaluateILACDecision(
  measuredValue: number,
  nominalValue: number,
  expandedUncertainty: number,
  toleranceAbs: number,
  guardBandMultiplier: number = 1.0 // Simple acceptance guard band w = 1 * U
): ILACDecisionResult {
  const upperTol = nominalValue + toleranceAbs;
  const lowerTol = nominalValue - toleranceAbs;
  
  const guardBand = expandedUncertainty * guardBandMultiplier;
  const acceptUpper = upperTol - guardBand;
  const acceptLower = lowerTol + guardBand;

  const tur = expandedUncertainty > 0 ? (toleranceAbs / expandedUncertainty) : 0;

  let decision: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
  let explanation = '';

  if (measuredValue >= acceptLower && measuredValue <= acceptUpper) {
    decision = 'PASS';
    explanation = 'Nilai terukur berada di dalam batas penerimaan (Acceptance Zone) setelah mempertimbangkan pita pelindung (Guard Band) ketidakpastian.';
  } else if (measuredValue > upperTol || measuredValue < lowerTol) {
    decision = 'FAIL';
    explanation = 'Nilai terukur berada di luar batas toleransi maksimum spesifikasi (Out of Specification).';
  } else {
    decision = 'INCONCLUSIVE';
    explanation = 'Nilai terukur berada dalam zona abu-abu (Guard Band Zone). Hasil tidak dapat disimpulkan Lulus secara pasti pada tingkat kepercayaan 95%.';
  }

  return {
    decision,
    upperTolerance: upperTol,
    lowerTolerance: lowerTol,
    guardBand,
    acceptanceLimitUpper: acceptUpper,
    acceptanceLimitLower: acceptLower,
    tur: Math.round(tur * 100) / 100,
    explanation,
  };
}

/**
 * Safe Mathematical Expression Evaluator for Dynamic Calibration Formulas
 */
export function evaluateCustomFormula(expression: string, variables: Record<string, number>): { result: number; error?: string } {
  try {
    let expr = expression.trim();
    if (!expr) return { result: 0, error: 'Ekspresi kosong' };

    // Substitute variables in descending length order to avoid replacing substrings of longer var names
    const sortedVarKeys = Object.keys(variables).sort((a, b) => b.length - a.length);
    for (const key of sortedVarKeys) {
      const val = variables[key];
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, `(${val !== undefined && !isNaN(val) ? val : 0})`);
    }

    // Sanitize formula characters (only numbers, operators, parens, Math functions)
    const sanitized = expr
      .replace(/sqrt/g, 'Math.sqrt')
      .replace(/abs/g, 'Math.abs')
      .replace(/pow/g, 'Math.pow')
      .replace(/sin/g, 'Math.sin')
      .replace(/cos/g, 'Math.cos')
      .replace(/tan/g, 'Math.tan')
      .replace(/log/g, 'Math.log10')
      .replace(/ln/g, 'Math.log')
      .replace(/\^/g, '**');

    // Strict validation to prevent code execution
    if (/[^0-9.+\-*/(),\s\w*]/g.test(sanitized)) {
      const invalid = sanitized.match(/[^0-9.+\-*/(),\s\w*]/g);
      return { result: NaN, error: `Karakter tidak valid dalam formula: ${invalid?.join(', ')}` };
    }

    // Function constructor safe evaluation
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const evalFunc = new Function(`return (${sanitized});`);
    const val = evalFunc();

    if (typeof val !== 'number' || isNaN(val)) {
      return { result: NaN, error: 'Hasil kalkulasi bukan angka valid (NaN)' };
    }

    return { result: val };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Gagal mengevaluasi formula';
    return { result: NaN, error: errorMsg };
  }
}

/**
 * Calibration Unit Converter Utility Engine
 */
export const UNIT_CONVERSIONS: Record<string, Record<string, number>> = {
  suhu: {
    '°C': 1,
    '°F': 1, // special formula handles F & K
    'K': 1,
  },
  tekanan: {
    'bar': 1,
    'mbar': 0.001,
    'psi': 0.0689476,
    'kPa': 0.01,
    'MPa': 10,
    'mmHg': 0.00133322,
    'inHg': 0.0338639,
    'kg/cm²': 0.980665,
  },
  massa: {
    'kg': 1000,
    'g': 1,
    'mg': 0.001,
    'μg': 0.000001,
    'lb': 453.592,
  },
  flow: {
    'L/min': 1,
    'mL/min': 0.001,
    'mL/h': 1 / 60000,
    'm³/h': 1000 / 60,
    'L/h': 1 / 60,
  },
  listrik: {
    'V': 1,
    'mV': 0.001,
    'μV': 0.000001,
    'kV': 1000,
    'A': 1,
    'mA': 0.001,
    'μA': 0.000001,
    'Ω': 1,
    'kΩ': 1000,
    'MΩ': 1000000,
  }
};

export function convertCalibrationUnit(val: number, category: string, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return val;

  if (category === 'suhu') {
    let celsius = val;
    if (fromUnit === '°F') celsius = (val - 32) * (5 / 9);
    if (fromUnit === 'K') celsius = val - 273.15;

    if (toUnit === '°C') return celsius;
    if (toUnit === '°F') return (celsius * 9 / 5) + 32;
    if (toUnit === 'K') return celsius + 273.15;
    return val;
  }

  const catMap = UNIT_CONVERSIONS[category];
  if (!catMap || !catMap[fromUnit] || !catMap[toUnit]) return val;

  const baseValue = val * catMap[fromUnit];
  return baseValue / catMap[toUnit];
}

