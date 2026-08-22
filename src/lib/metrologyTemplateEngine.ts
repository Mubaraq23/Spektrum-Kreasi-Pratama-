// ISO/IEC 17025:2017 & ISO GUM Metrology Calculation Engine

export interface UncertaintyComponent {
  name: string;
  type: 'TYPE_A' | 'TYPE_B';
  value: number; // u_i
  distribution: 'NORMAL' | 'RECTANGULAR' | 'TRIANGULAR' | 'U_SHAPED';
  divisor: number;
  sensitivityCoefficient: number; // c_i
  uContrib: number; // c_i * u_i
  degreesOfFreedom: number; // v_i
}

export interface MetrologyCalculationResult {
  deviceType: string;
  meanMeasured: number;
  referenceValue: number;
  correction: number; // Reference - Measured
  typeAUncertainty: number; // u_a
  typeBComponents: UncertaintyComponent[];
  combinedUncertainty: number; // u_c
  effectiveDegreesOfFreedom: number; // v_eff
  coverageFactorK: number; // k=2
  expandedUncertainty: number; // U = k * u_c
  formattedResult: string; // e.g. "100.02 ± 0.05 bar (k=2, 95%)"
  evaluatedAt: string;
}

export function calculateMetrologyUncertainty(
  deviceType: string,
  referenceValue: number,
  readings: number[],
  resolution: number,
  stdUncertaintyCert: number,
  stdCertKFactor: number = 2,
  driftVal: number = 0,
  temperatureVariation: number = 0
): MetrologyCalculationResult {
  const n = readings.length;
  const mean = n > 0 ? readings.reduce((a, b) => a + b, 0) / n : 0;
  const correction = referenceValue - mean;

  // 1. Type A Uncertainty (Repeatability)
  let sd = 0;
  if (n > 1) {
    const sumSq = readings.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
    sd = Math.sqrt(sumSq / (n - 1));
  }
  const u_a = n > 0 ? sd / Math.sqrt(n) : 0;

  // 2. Type B Components
  // u_b1: Kalibrator standar (Normal dist)
  const u_b1 = stdCertKFactor > 0 ? stdUncertaintyCert / stdCertKFactor : 0;
  
  // u_b2: Resolusi alat (Rectangular dist)
  const u_b2 = resolution / (2 * Math.sqrt(3));

  // u_b3: Drift kalibrator (Rectangular dist)
  const u_b3 = driftVal / Math.sqrt(3);

  // u_b4: Pengaruh suhu (Rectangular dist)
  const u_b4 = temperatureVariation / Math.sqrt(3);

  const typeBComponents: UncertaintyComponent[] = [
    {
      name: 'Ketidakpastian Standar Kalibrator',
      type: 'TYPE_B',
      value: stdUncertaintyCert,
      distribution: 'NORMAL',
      divisor: stdCertKFactor,
      sensitivityCoefficient: 1.0,
      uContrib: u_b1,
      degreesOfFreedom: 50
    },
    {
      name: 'Resolusi Alat Ukur (UUT)',
      type: 'TYPE_B',
      value: resolution,
      distribution: 'RECTANGULAR',
      divisor: Math.sqrt(3),
      sensitivityCoefficient: 1.0,
      uContrib: u_b2,
      degreesOfFreedom: 100
    },
    {
      name: 'Drift Standar',
      type: 'TYPE_B',
      value: driftVal,
      distribution: 'RECTANGULAR',
      divisor: Math.sqrt(3),
      sensitivityCoefficient: 1.0,
      uContrib: u_b3,
      degreesOfFreedom: 50
    }
  ];

  // 3. Combined Uncertainty (u_c)
  const sumSqContrib = Math.pow(u_a, 2) + Math.pow(u_b1, 2) + Math.pow(u_b2, 2) + Math.pow(u_b3, 2) + Math.pow(u_b4, 2);
  const u_c = Math.sqrt(sumSqContrib);

  // 4. Effective Degrees of Freedom (Welch-Satterthwaite)
  const v_a = n > 1 ? n - 1 : 1;
  const denom = (Math.pow(u_a, 4) / v_a) + (Math.pow(u_b1, 4) / 50) + (Math.pow(u_b2, 4) / 100) + (Math.pow(u_b3, 4) / 50);
  const v_eff = denom > 0 ? Math.pow(u_c, 4) / denom : 50;

  // 5. Coverage Factor k & Expanded Uncertainty U
  const k = 2.0; // Standard coverage factor for 95% confidence level
  const U = k * u_c;

  const formattedResult = `${mean.toFixed(2)} (Koreksi: ${correction > 0 ? '+' : ''}${correction.toFixed(2)}) ± ${U.toFixed(3)} (k=2, 95%)`;

  return {
    deviceType,
    meanMeasured: Number(mean.toFixed(4)),
    referenceValue,
    correction: Number(correction.toFixed(4)),
    typeAUncertainty: Number(u_a.toFixed(4)),
    typeBComponents,
    combinedUncertainty: Number(u_c.toFixed(4)),
    effectiveDegreesOfFreedom: Number(v_eff.toFixed(1)),
    coverageFactorK: k,
    expandedUncertainty: Number(U.toFixed(4)),
    formattedResult,
    evaluatedAt: new Date().toISOString()
  };
}
