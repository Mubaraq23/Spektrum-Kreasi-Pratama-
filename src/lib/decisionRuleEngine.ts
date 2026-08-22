// Decision Rule Engine — Spektrum CalibraPro Metrology Platform

export interface DecisionEvaluationInput {
  parameterCode: string;
  parameterName: string;
  measuredError: number;
  expandedUncertainty: number;
  toleranceLimit: number; // e.g. 5.0 (%) or 2.0 (BPM)
  decisionRule: 'SIMPLE_ACCEPTANCE' | 'GUARD_BANDED_ACCEPTANCE' | 'TOLERANCE_BOUNDED';
  unit: string;
}

export interface DecisionEvaluationOutput {
  status: 'PASS' | 'FAIL' | 'NOT_ASSESSED';
  kelaikan: 'LAIK_PAKAI' | 'TIDAK_LAIK_PAKAI';
  acceptanceLimit: string;
  guardBandValue: number;
  decisionNote: string;
  evaluatedAt: string;
}

export function evaluateDecisionRule(input: DecisionEvaluationInput): DecisionEvaluationOutput {
  const absError = Math.abs(input.measuredError);
  const tol = input.toleranceLimit;
  const U = input.expandedUncertainty;

  let guardBand = 0;
  if (input.decisionRule === 'GUARD_BANDED_ACCEPTANCE') {
    guardBand = U; // Guardband = Expanded Uncertainty
  }

  const effectiveLimit = tol - guardBand;
  const pass = absError <= effectiveLimit;

  return {
    status: pass ? 'PASS' : 'FAIL',
    kelaikan: pass ? 'LAIK_PAKAI' : 'TIDAK_LAIK_PAKAI',
    acceptanceLimit: `Deviasi <= ±${tol} ${input.unit} (Guardband: ${guardBand > 0 ? guardBand.toFixed(3) : 'N/A'})`,
    guardBandValue: Number(guardBand.toFixed(3)),
    decisionNote: pass
      ? `Deviasi terukur (${absError.toFixed(2)} ${input.unit}) memenuhi kriteria penerimaan (<= ${effectiveLimit.toFixed(2)} ${input.unit}).`
      : `Deviasi terukur (${absError.toFixed(2)} ${input.unit}) MELEBIHI batas penerimaan (<= ${effectiveLimit.toFixed(2)} ${input.unit}).`,
    evaluatedAt: new Date().toISOString()
  };
}
