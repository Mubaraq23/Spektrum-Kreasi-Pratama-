/**
 * Quality Management System (QMS) Engine — Spektrum Kreasi Pratama
 * Governs ISO 17025 QMS compliance: Non-Conformity (NC), CAPA, Proficiency Testing, and Audits.
 */

export interface NonConformityRecord {
  id: string; // e.g. 'NC-2026-001'
  source: 'INTERNAL_AUDIT' | 'CUSTOMER_COMPLAINT' | 'CALIBRATOR_OUT_OF_TOLERANCE' | 'ENVIRONMENTAL_EXCURSION';
  findingDescription: string;
  rootCauseAnalysis: string;
  correctionAction: string;
  correctiveActionPlan: string;
  responsiblePerson: string;
  targetClosureDate: string;
  status: 'OPEN' | 'UNDER_VERIFICATION' | 'CLOSED';
  closureEvidenceSummary?: string;
  closedAt?: string;
}

export interface ProficiencyTestRecord {
  ptId: string;
  schemeName: string;
  organizer: string; // e.g. 'BBPK / KAN PT Scheme'
  parameterTested: string;
  assignedValue: number;
  labReportedValue: number;
  labUncertainty: number;
  zScore: number;
  enScore: number;
  status: 'SATISFACTORY' | 'QUESTIONABLE' | 'UNSATISFACTORY';
}

export function evaluateEnScore(
  labValue: number,
  refValue: number,
  labUnc: number,
  refUnc: number
): { enScore: number; status: 'SATISFACTORY' | 'UNSATISFACTORY' } {
  const diff = Math.abs(labValue - refValue);
  const combinedUnc = Math.sqrt(Math.pow(labUnc, 2) + Math.pow(refUnc, 2));

  if (combinedUnc <= 0) return { enScore: 0, status: 'SATISFACTORY' };
  const en = diff / combinedUnc;

  return {
    enScore: Number(en.toFixed(3)),
    status: en <= 1.0 ? 'SATISFACTORY' : 'UNSATISFACTORY'
  };
}
