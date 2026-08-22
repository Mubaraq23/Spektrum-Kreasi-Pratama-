// Deterministic UKES Calculation Engine — Spektrum CalibraPro
// Formula Reference: Perba 1/2025 & Perka 2/2018

import { UkesCalculatedParameter, AcceptanceCriterion } from './ukesTypes';

export interface CalculationInput {
  parameterCode: string;
  parameterName: string;
  unit: string;
  settingValue: number;
  measuredValues: number[];
  criterion?: AcceptanceCriterion;
}

export function calculateUkesParameter(input: CalculationInput): UkesCalculatedParameter {
  const n = input.measuredValues.length;
  if (n === 0) {
    return {
      parameterCode: input.parameterCode,
      parameterName: input.parameterName,
      unit: input.unit,
      settingValue: input.settingValue,
      meanMeasuredValue: 0,
      deviation: 0,
      percentageError: 0,
      standardDeviation: 0,
      coefficientOfVariation: 0,
      calculationCode: 'CALC_EMPTY',
      formulaVersion: '2025.1',
      status: 'INVALID_DATA',
      statusMessage: 'Data pengukuran mentah tidak tersedia.'
    };
  }

  // Mean (Rata-rata)
  const sum = input.measuredValues.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Sample Standard Deviation (s)
  const variance = n > 1
    ? input.measuredValues.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
    : 0;
  const sd = Math.sqrt(variance);

  // Coefficient of Variation (CV = s / mean)
  const cv = mean > 0 ? sd / mean : 0;

  // Deviasi dan Percentage Error
  const deviation = mean - input.settingValue;
  const percentageError = input.settingValue !== 0 ? Math.abs((deviation / input.settingValue) * 100) : 0;

  return {
    parameterCode: input.parameterCode,
    parameterName: input.parameterName,
    unit: input.unit,
    settingValue: input.settingValue,
    meanMeasuredValue: Number(mean.toFixed(4)),
    deviation: Number(deviation.toFixed(4)),
    percentageError: Number(percentageError.toFixed(2)),
    standardDeviation: Number(sd.toFixed(4)),
    coefficientOfVariation: Number(cv.toFixed(4)),
    calculationCode: 'CALC_BAPETEN_DETERMINISTIC_V1',
    formulaVersion: '2025.1',
    status: 'NOT_TESTED',
    criterion: input.criterion,
    statusMessage: 'Kalkulasi deterministik berhasil.'
  };
}
