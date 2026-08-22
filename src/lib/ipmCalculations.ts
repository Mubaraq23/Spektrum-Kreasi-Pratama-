// IPM Performance & Device Fitness Calculation Engine

export interface IpmPerformanceEvaluation {
  paramId: string;
  paramName: string;
  unit: string;
  setPoint: number;
  meanMeasured: number;
  sd: number;
  cvPercentage: number;
  errorPercentage: number;
  status: 'PASS' | 'FAIL';
  acceptanceCriteria: string;
  evaluationNote: string;
}

export function evaluateIpmPerformance(
  paramId: string,
  paramName: string,
  unit: string,
  setPoint: number,
  readings: number[],
  toleranceMin?: number,
  toleranceMax?: number,
  tolerancePercentage?: number
): IpmPerformanceEvaluation {
  if (!readings || readings.length === 0) {
    return {
      paramId,
      paramName,
      unit,
      setPoint,
      meanMeasured: setPoint,
      sd: 0,
      cvPercentage: 0,
      errorPercentage: 0,
      status: 'PASS',
      acceptanceCriteria: 'Tidak ada data',
      evaluationNote: 'Pengukuran belum dilakukan.'
    };
  }

  const sum = readings.reduce((a, b) => a + b, 0);
  const mean = sum / readings.length;

  const variance = readings.length > 1 
    ? readings.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (readings.length - 1)
    : 0;
  const sd = Math.sqrt(variance);
  const cv = mean !== 0 ? (sd / Math.abs(mean)) * 100 : 0;

  const errorPct = setPoint !== 0 ? (Math.abs(mean - setPoint) / setPoint) * 100 : 0;

  let pass = true;
  let criteriaText = '';

  if (tolerancePercentage !== undefined) {
    pass = errorPct <= tolerancePercentage;
    criteriaText = `Deviasi <= ${tolerancePercentage}%`;
  } else if (toleranceMin !== undefined && toleranceMax !== undefined) {
    const diff = mean - setPoint;
    pass = diff >= toleranceMin && diff <= toleranceMax;
    criteriaText = `Deviasi ${toleranceMin} s/d ${toleranceMax} ${unit}`;
  }

  return {
    paramId,
    paramName,
    unit,
    setPoint,
    meanMeasured: mean,
    sd,
    cvPercentage: cv,
    errorPercentage: errorPct,
    status: pass ? 'PASS' : 'FAIL',
    acceptanceCriteria: criteriaText,
    evaluationNote: pass 
      ? `Deviasi terukur ${errorPct.toFixed(2)}% memenuhi kriteria (${criteriaText}).`
      : `Deviasi terukur ${errorPct.toFixed(2)}% MELEBIHI kriteria toleransi (${criteriaText}).`
  };
}

export function determineOverallDeviceFitness(
  physicalResults: Record<string, string>,
  functionalResults: Record<string, string>,
  electricalResults: { passed?: boolean },
  evaluations: IpmPerformanceEvaluation[]
): 'LAYAK DIGUNAKAN' | 'LAYAK DENGAN CATATAN' | 'PERLU PERBAIKAN' | 'TIDAK LAYAK DIGUNAKAN' {
  const physicalFailures = Object.values(physicalResults).filter(v => v === 'TIDAK_OK').length;
  const functionalFailures = Object.values(functionalResults).filter(v => v === 'TIDAK_OK').length;
  const electricalFail = electricalResults.passed === false;
  const performanceFailures = evaluations.filter(e => e.status === 'FAIL').length;

  if (electricalFail || functionalFailures > 2 || performanceFailures > 1) {
    return 'TIDAK LAYAK DIGUNAKAN';
  }

  if (functionalFailures > 0 || performanceFailures > 0) {
    return 'PERLU PERBAIKAN';
  }

  if (physicalFailures > 0) {
    return 'LAYAK DENGAN CATATAN';
  }

  return 'LAYAK DIGUNAKAN';
}
