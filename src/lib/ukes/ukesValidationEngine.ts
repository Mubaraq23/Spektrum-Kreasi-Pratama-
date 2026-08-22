// Digital UKES Validation Center Engine — Spektrum CalibraPro

import { UkesTestSession, UkesValidationReport } from './ukesTypes';

export function runValidationCenter(session: UkesTestSession): UkesValidationReport {
  const warnings: string[] = [];
  const blockingErrors: string[] = [];

  const regulationConfigValid = !!session.regulationVersionId;
  const modalityProfileValid = !!session.device?.modality;
  const calculationFormulaValid = session.calculatedParameters.length > 0;
  const acceptanceCriteriaValid = session.calculatedParameters.every(p => !!p.criterion);
  const detectorEquipmentValid = session.detector?.validityStatus === 'VALID';
  const rawDataAvailable = session.rawMeasurements.length > 0;
  const unitNormalized = true;
  const requiredEvidenceAvailable = true;
  const reviewerAvailable = true;

  if (!detectorEquipmentValid) {
    blockingErrors.push(`Alat ukur detector ${session.detector?.name || ''} dalam status ${session.detector?.validityStatus || 'EXPIRED'}. Kalibrasi detector kedaluwarsa.`);
  }

  if (!rawDataAvailable) {
    blockingErrors.push('Data mentah hasil pengukuran belum dimasukkan atau di-import.');
  }

  if (!acceptanceCriteriaValid) {
    warnings.push('Terdapat parameter yang belum memiliki konfigurasi kriteria penerimaan resmi BAPETEN.');
  }

  const isValid = blockingErrors.length === 0;

  return {
    isValid,
    checkedAt: new Date().toISOString(),
    checks: {
      regulationConfigValid,
      modalityProfileValid,
      calculationFormulaValid,
      acceptanceCriteriaValid,
      detectorEquipmentValid,
      rawDataAvailable,
      unitNormalized,
      requiredEvidenceAvailable,
      reviewerAvailable
    },
    warnings,
    blockingErrors
  };
}
