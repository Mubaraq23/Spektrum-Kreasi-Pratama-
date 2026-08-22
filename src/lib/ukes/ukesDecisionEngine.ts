// Digital UKES Decision Engine — Regulatory Acceptance & System Aggregate Evaluator
// Legal Basis: Perba 1/2025 & Kepka 3051/2024

import { UkesCalculatedParameter, AcceptanceCriterion, TestParameterStatus } from './ukesTypes';

export interface DecisionEvaluationResult {
  parameterCode: string;
  status: TestParameterStatus;
  isCritical: boolean;
  message: string;
}

export function evaluateParameterDecision(
  param: UkesCalculatedParameter,
  criterion?: AcceptanceCriterion
): DecisionEvaluationResult {
  if (!criterion) {
    return {
      parameterCode: param.parameterCode,
      status: 'CONFIGURATION_REQUIRED',
      isCritical: false,
      message: `Parameter ${param.parameterName} belum memiliki konfigurasi kriteria penerimaan resmi pada regulasi aktif.`
    };
  }

  let pass = false;
  const valToEvaluate = criterion.operator === 'CV_LESS_EQUAL'
    ? param.coefficientOfVariation
    : criterion.unit === '%'
      ? param.percentageError
      : param.meanMeasuredValue;

  switch (criterion.operator) {
    case '<=':
    case 'CV_LESS_EQUAL':
      pass = valToEvaluate <= criterion.thresholdValue;
      break;
    case '>=':
      pass = valToEvaluate >= criterion.thresholdValue;
      break;
    case '<':
      pass = valToEvaluate < criterion.thresholdValue;
      break;
    case '>':
      pass = valToEvaluate > criterion.thresholdValue;
      break;
    case 'BETWEEN':
      if (criterion.maxThresholdValue !== undefined) {
        pass = valToEvaluate >= criterion.thresholdValue && valToEvaluate <= criterion.maxThresholdValue;
      }
      break;
    case 'EQUAL_TO':
      pass = valToEvaluate === criterion.thresholdValue;
      break;
  }

  const status: TestParameterStatus = pass ? 'PASS' : 'FAIL';
  const msg = pass
    ? `MEMENUHI limit ${criterion.sourceDocument} (${criterion.articleReference}): ${valToEvaluate.toFixed(2)} ${criterion.unit} (Limit: ${criterion.operator} ${criterion.thresholdValue} ${criterion.unit}).`
    : `TIDAK MEMENUHI limit ${criterion.sourceDocument} (${criterion.articleReference}): ${valToEvaluate.toFixed(2)} ${criterion.unit} (Limit: ${criterion.operator} ${criterion.thresholdValue} ${criterion.unit}).`;

  return {
    parameterCode: param.parameterCode,
    status,
    isCritical: criterion.isCritical,
    message: msg
  };
}

export function evaluateSystemAggregateDecision(params: UkesCalculatedParameter[]): {
  systemDecision: 'LOLOS_UJI_KESESUAIAN' | 'LOLOS_BERSYARAT' | 'TIDAK_LOLOS_KESESUAIAN' | 'CONFIGURATION_REQUIRED';
  summaryMessage: string;
} {
  if (params.length === 0) {
    return {
      systemDecision: 'CONFIGURATION_REQUIRED',
      summaryMessage: 'Belum ada parameter yang dievaluasi.'
    };
  }

  const hasConfigRequired = params.some(p => p.status === 'CONFIGURATION_REQUIRED');
  if (hasConfigRequired) {
    return {
      systemDecision: 'CONFIGURATION_REQUIRED',
      summaryMessage: 'Terdapat parameter yang membutuhkan konfigurasi regulasi resmi.'
    };
  }

  const criticalFailures = params.filter(p => p.criterion?.isCritical && p.status === 'FAIL');
  if (criticalFailures.length > 0) {
    return {
      systemDecision: 'TIDAK_LOLOS_KESESUAIAN',
      summaryMessage: `Terdapat ${criticalFailures.length} parameter KRITIS (Tegangan/Waktu/CV/Kebocoran) yang GAGAL memenuhi limit BAPETEN.`
    };
  }

  const nonCriticalFailures = params.filter(p => !p.criterion?.isCritical && p.status === 'FAIL');
  if (nonCriticalFailures.length > 0) {
    return {
      systemDecision: 'LOLOS_BERSYARAT',
      summaryMessage: `Parameter KRITIS Lolos, namun terdapat ${nonCriticalFailures.length} parameter non-kritis yang membutuhkan penyesuaian.`
    };
  }

  return {
    systemDecision: 'LOLOS_UJI_KESESUAIAN',
    summaryMessage: 'Seluruh parameter pengujian MEMENUHI kriteria penerimaan BAPETEN.'
  };
}
