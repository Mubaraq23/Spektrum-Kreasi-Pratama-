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
  resolution: number = 0.01,
  masterUnc: number = 0.001,
  drift: number = 0,
  m: any = {}
): UncertaintyBreakdown {
  const methodUsed = category || 'standard';
  const k = 2; // coverage factor at 95% Confidence Level

  // 1. Resolution / Skala Terkecil (u1)
  // Rectangular distribution (divided by 2 * sqrt(3))
  const u1 = resolution / (2 * Math.sqrt(3));

  // 2. Master Calibrator uncertainty from Certificate (u2)
  // Normally distributed with k=2 on standard certificates
  const u2 = masterUnc / 2;

  // 3. Repeatability of measurements (u3)
  // Standard Deviation of Mean (SD / sqrt(n)), or fallback placeholder if no SD is provided
  const sd = typeof m.sd === 'number' && !isNaN(m.sd) ? m.sd : 0;
  const n = typeof m.n === 'number' && m.n > 0 ? m.n : 3;
  const u3 = sd > 0 ? (sd / Math.sqrt(n)) : ((resolution * 0.25) / Math.sqrt(3));

  // 4. Drift Standard / drift calibration (u4)
  // Rectangular distribution
  const u4 = drift / Math.sqrt(3);

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
      const stability = typeof m.stability === 'number' && !isNaN(m.stability) ? m.stability : 0;
      const uniformity = typeof m.uniformity === 'number' && !isNaN(m.uniformity) ? m.uniformity : 0;
      
      const uStab = stability / (2 * Math.sqrt(3));
      const uUnif = uniformity / (2 * Math.sqrt(3));
      
      let extraSq = 0;
      if (methodUsed === 'sterilisasi') {
        const autoclaveP = typeof m.autoclaveP === 'number' && !isNaN(m.autoclaveP) ? m.autoclaveP : 0;
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
      const histeresis = typeof m.histeresis === 'number' && !isNaN(m.histeresis) ? m.histeresis : 0;
      const zero = typeof m.zero === 'number' && !isNaN(m.zero) ? m.zero : 0;
      
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
      const eccentricity = typeof m.eccentricity === 'number' && !isNaN(m.eccentricity) ? m.eccentricity : 0;
      const linearity = typeof m.linearity === 'number' && !isNaN(m.linearity) ? m.linearity : 0;
      
      const uEcc = eccentricity / (2 * Math.sqrt(3));
      const uLin = linearity / (2 * Math.sqrt(3));
      
      let extraSq = 0;
      if (methodUsed === 'gaya_beban_torsi') {
        const armLength = typeof m.armLength === 'number' && m.armLength > 0 ? m.armLength : 0.25;
        const uArm = typeof m.uArm === 'number' && !isNaN(m.uArm) ? m.uArm : 0.001;
        const actualVal = typeof m.actual === 'number' && !isNaN(m.actual) ? m.actual : (m.point || 1);
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
      const Q = Math.abs(typeof m.actual === 'number' && m.actual !== 0 ? m.actual : (m.point || 10));
      const V = typeof m.volumeVal === 'number' && m.volumeVal > 0 ? m.volumeVal : 100;
      const uV = typeof m.uVolume === 'number' && !isNaN(m.uVolume) ? m.uVolume : 0.5;
      const t = typeof m.timeVal === 'number' && m.timeVal > 0 ? m.timeVal : 60;
      const uT = typeof m.uTime === 'number' && !isNaN(m.uTime) ? m.uTime : 0.1;
      
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
      const Q = Math.abs(typeof m.actual === 'number' && m.actual !== 0 ? m.actual : (m.point || 10));
      const gasTemp = typeof m.gasTemp === 'number' && !isNaN(m.gasTemp) ? m.gasTemp : 25;
      const gasPress = typeof m.gasPress === 'number' && !isNaN(m.gasPress) ? m.gasPress : 1013;
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
      const D = Math.abs(typeof m.actual === 'number' && m.actual !== 0 ? m.actual : (m.point || 100));
      const distanceD = typeof m.distanceD === 'number' && m.distanceD > 0 ? m.distanceD : 100;
      const uDistance = typeof m.uDistance === 'number' && !isNaN(m.uDistance) ? m.uDistance : 0.5;
      const kvpVal = typeof m.kvpVal === 'number' && m.kvpVal > 0 ? m.kvpVal : 80;
      const uKvp = typeof m.uKvp === 'number' && !isNaN(m.uKvp) ? m.uKvp : 1.5;
      
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
  const tar = (tolerance !== null && !isNaN(tolerance) && masterUnc > 0) ? (tolerance / masterUnc) : undefined;

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
