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
  resolution: any = 0.01,
  masterUnc: any = 0.001,
  drift: any = 0,
  m: any = {}
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
