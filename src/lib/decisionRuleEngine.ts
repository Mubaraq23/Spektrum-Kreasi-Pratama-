/**
 * Decision Rule Engine — Spektrum Kreasi Pratama Metrology Platform
 * Implements ILAC-G8 / ISO 14253-1 Guard Banding & Explicit Decision Rule Evaluation.
 */

export type DecisionStatus = 'PASS' | 'FAIL' | 'CONDITIONAL' | 'OUT_OF_SCOPE' | 'INVALID_DATA' | 'REQUIRES_REVIEW';
export type KelaikanStatus = 'LAIK_PAKAI' | 'TIDAK_LAIK_PAKAI' | 'MEMERLUKAN_EVALUASI_DPJP';

export interface DecisionEvaluationInput {
  parameterCode: string;
  parameterName: string;
  measuredError: number;
  expandedUncertainty: number;
  toleranceLimit: number; // MPE value
  decisionRule: 'SIMPLE_ACCEPTANCE' | 'GUARD_BANDED_ACCEPTANCE' | 'SHARED_RISK' | 'BINARY_PASS_FAIL';
  guardBandMultiplier?: number; // default 1.0 (ILAC-G8)
  unit: string;
  isWithinScope?: boolean;
  minRepeatsCount?: number;
  actualRepeatsCount?: number;
}

export interface DecisionEvaluationOutput {
  status: DecisionStatus;
  kelaikan: KelaikanStatus;
  acceptanceLimit: string;
  guardBandValue: number;
  effectiveLimit: number;
  decisionNote: string;
  ruleVersion: string;
  approvedBy: string;
  evaluatedAt: string;
}

export function evaluateDecisionRule(input: DecisionEvaluationInput): DecisionEvaluationOutput {
  const evaluatedAt = new Date().toISOString();
  const ruleVersion = 'ISO-14253-1:2017 / ILAC-G8:2019';
  const approvedBy = 'Manajer Teknis Laboratorium Terakreditasi KAN';

  // 1. Scope & Validity Checks
  if (input.isWithinScope === false) {
    return {
      status: 'OUT_OF_SCOPE',
      kelaikan: 'TIDAK_LAIK_PAKAI',
      acceptanceLimit: `Batas Toleransi MPE: ±${input.toleranceLimit} ${input.unit}`,
      guardBandValue: 0,
      effectiveLimit: 0,
      decisionNote: `Pengujian di luar lingkup akreditasi KAN atau kemampuan ukur (CMC).`,
      ruleVersion,
      approvedBy,
      evaluatedAt
    };
  }

  if (input.actualRepeatsCount !== undefined && input.minRepeatsCount !== undefined && input.actualRepeatsCount < input.minRepeatsCount) {
    return {
      status: 'INVALID_DATA',
      kelaikan: 'MEMERLUKAN_EVALUASI_DPJP',
      acceptanceLimit: `Pengulangan Minimum: ${input.minRepeatsCount} kali`,
      guardBandValue: 0,
      effectiveLimit: 0,
      decisionNote: `Data pengukuran tidak valid: Jumlah pengulangan (${input.actualRepeatsCount}) kurang dari minimum (${input.minRepeatsCount}).`,
      ruleVersion,
      approvedBy,
      evaluatedAt
    };
  }

  const absError = Math.abs(input.measuredError);
  const tol = input.toleranceLimit;
  const U = input.expandedUncertainty;

  let guardBand = 0;
  if (input.decisionRule === 'GUARD_BANDED_ACCEPTANCE') {
    const multiplier = input.guardBandMultiplier ?? 1.0;
    guardBand = U * multiplier; // Guard Banding = multiplier * U
  }

  const effectiveLimit = Math.max(0, tol - guardBand);

  // Evaluation
  let status: DecisionStatus = 'FAIL';
  let kelaikan: KelaikanStatus = 'TIDAK_LAIK_PAKAI';

  if (absError <= effectiveLimit) {
    status = 'PASS';
    kelaikan = 'LAIK_PAKAI';
  } else if (absError <= tol) {
    // Falls between Effective Limit and MPE (Guard Band Warning Zone)
    status = 'CONDITIONAL';
    kelaikan = 'MEMERLUKAN_EVALUASI_DPJP';
  } else {
    status = 'FAIL';
    kelaikan = 'TIDAK_LAIK_PAKAI';
  }

  let decisionNote = '';
  if (status === 'PASS') {
    decisionNote = `Deviasi terukur (${absError.toFixed(2)} ${input.unit}) + U95 (${U.toFixed(2)} ${input.unit}) berada dalam batas penerimaan (<= ${effectiveLimit.toFixed(2)} ${input.unit}).`;
  } else if (status === 'CONDITIONAL') {
    decisionNote = `PERINGATAN GUARD BAND: Deviasi terukur (${absError.toFixed(2)} ${input.unit}) memenuhi MPE (<= ${tol} ${input.unit}) namun berada pada zona Guard Band (Limit: ${effectiveLimit.toFixed(2)} ${input.unit}).`;
  } else {
    decisionNote = `GAGAL (FAIL): Deviasi terukur (${absError.toFixed(2)} ${input.unit}) MELEBIHI batas penerimaan MPE (<= ${tol} ${input.unit}).`;
  }

  return {
    status,
    kelaikan,
    acceptanceLimit: `Deviasi <= ±${tol} ${input.unit} (Guardband: ${guardBand > 0 ? guardBand.toFixed(3) : 'Tidak Digunakan'})`,
    guardBandValue: Number(guardBand.toFixed(3)),
    effectiveLimit: Number(effectiveLimit.toFixed(3)),
    decisionNote,
    ruleVersion,
    approvedBy,
    evaluatedAt
  };
}
