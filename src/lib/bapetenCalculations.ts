// BAPETEN Calculation & Acceptance Criteria Evaluator Engine

export interface BapetenEvaluationResult {
  parameterId: string;
  parameterName: string;
  category: string;
  unit: string;
  meanMeasured: number;
  setValue?: number;
  errorPercentage?: number;
  sd?: number;
  cvPercentage?: number;
  linearityL?: number;
  hvlValue?: number;
  status: 'PASS' | 'FAIL' | 'LAIK' | 'TIDAK_LAIK' | 'WARNING' | 'NOT_TESTED' | 'NOT_APPLICABLE';
  acceptanceCriteria: string;
  evaluationNote: string;
}

export function calculateMean(values: number[]): number {
  if (!values || values.length === 0) return 0;
  const sum = values.reduce((acc, curr) => acc + curr, 0);
  return sum / values.length;
}

export function calculateSD(values: number[]): number {
  if (!values || values.length <= 1) return 0;
  const mean = calculateMean(values);
  const variance = values.reduce((acc, curr) => acc + Math.pow(curr - mean, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export function calculateCV(values: number[]): number {
  const mean = calculateMean(values);
  if (mean === 0) return 0;
  const sd = calculateSD(values);
  return (sd / Math.abs(mean)) * 100;
}

export function calculateLinearity(y1: number, y2: number): number {
  if (y1 + y2 === 0) return 0;
  return Math.abs(y1 - y2) / (y1 + y2);
}

export function calculateErrorPercentage(measured: number, setPoint: number): number {
  if (setPoint === 0) return 0;
  return (Math.abs(measured - setPoint) / setPoint) * 100;
}

export function evaluateBapetenParameter(
  parameterId: string,
  parameterName: string,
  category: string,
  unit: string,
  setPoints: number[],
  readingsMap: Record<number, number[]>, // setPoint -> array of measurements
  toleranceType: string,
  toleranceMin?: number,
  toleranceMax?: number,
  maxCV?: number,
  maxLinearity?: number
): BapetenEvaluationResult {
  const allReadings: number[] = [];
  Object.values(readingsMap).forEach(arr => allReadings.push(...arr));

  if (allReadings.length === 0) {
    return {
      parameterId,
      parameterName,
      category,
      unit,
      meanMeasured: 0,
      status: 'NOT_TESTED',
      acceptanceCriteria: 'Belum diuji',
      evaluationNote: 'Data pengukuran belum dimasukkan.'
    };
  }

  const meanVal = calculateMean(allReadings);
  const cvVal = calculateCV(allReadings);
  const sdVal = calculateSD(allReadings);

  if (toleranceType === 'percentage') {
    const firstSet = setPoints[0] || 70;
    const errPct = calculateErrorPercentage(meanVal, firstSet);
    const pass = errPct <= (toleranceMax || 10);

    return {
      parameterId,
      parameterName,
      category,
      unit,
      meanMeasured: meanVal,
      setValue: firstSet,
      errorPercentage: errPct,
      sd: sdVal,
      cvPercentage: cvVal,
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Deviasi <= ${toleranceMax || 10}%`,
      evaluationNote: pass 
        ? `Deviasi terukur ${errPct.toFixed(2)}% berada di dalam toleransi (${toleranceMax || 10}%).` 
        : `Deviasi terukur ${errPct.toFixed(2)}% MELEBIHI batas toleransi (${toleranceMax || 10}%).`
    };
  }

  if (toleranceType === 'max_cv') {
    const pass = cvVal <= (maxCV || 5);
    return {
      parameterId,
      parameterName,
      category,
      unit,
      meanMeasured: meanVal,
      sd: sdVal,
      cvPercentage: cvVal,
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `CV <= ${maxCV || 5}%`,
      evaluationNote: pass 
        ? `Koefisien variasi ${cvVal.toFixed(2)}% berada di dalam toleransi (${maxCV || 5}%).`
        : `Koefisien variasi ${cvVal.toFixed(2)}% MELEBIHI batas (${maxCV || 5}%).`
    };
  }

  if (toleranceType === 'max_linearity') {
    const meansPerPoint = setPoints.map(sp => calculateMean(readingsMap[sp] || []));
    let maxL = 0;
    for (let i = 0; i < meansPerPoint.length - 1; i++) {
      const L = calculateLinearity(meansPerPoint[i], meansPerPoint[i + 1]);
      if (L > maxL) maxL = L;
    }
    const pass = maxL <= (maxLinearity || 0.10);

    return {
      parameterId,
      parameterName,
      category,
      unit,
      meanMeasured: meanVal,
      linearityL: maxL,
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Linearitas L <= ${maxLinearity || 0.10}`,
      evaluationNote: pass
        ? `Koefisien linearitas L = ${maxL.toFixed(3)} memenuhi kriteria (<= ${maxLinearity || 0.10}).`
        : `Koefisien linearitas L = ${maxL.toFixed(3)} MELEBIHI batas (<= ${maxLinearity || 0.10}).`
    };
  }

  if (toleranceType === 'absolute') {
    let pass = true;
    if (toleranceMin !== undefined && meanVal < toleranceMin) pass = false;
    if (toleranceMax !== undefined && meanVal > toleranceMax) pass = false;

    return {
      parameterId,
      parameterName,
      category,
      unit,
      meanMeasured: meanVal,
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: toleranceMin !== undefined && toleranceMax !== undefined
        ? `${toleranceMin} - ${toleranceMax} ${unit}`
        : toleranceMin !== undefined ? `>= ${toleranceMin} ${unit}` : `<= ${toleranceMax} ${unit}`,
      evaluationNote: pass ? 'Nilai terukur sesuai rentang kriteria.' : 'Nilai terukur di luar rentang kriteria.'
    };
  }

  return {
    parameterId,
    parameterName,
    category,
    unit,
    meanMeasured: meanVal,
    status: 'PASS',
    acceptanceCriteria: 'Kriteria Terpenuhi',
    evaluationNote: 'Pengujian selesai.'
  };
}
