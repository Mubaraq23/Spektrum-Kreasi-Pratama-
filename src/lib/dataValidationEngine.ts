// Data Validation Engine for Spektrum CalibraPro

export interface ValidationIssue {
  field: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  message: string;
  suggestedAction?: string;
}

export interface ValidationReport {
  isValid: boolean;
  issues: ValidationIssue[];
  validatedAt: string;
}

export function validateMeasurementInput(
  deviceName: string,
  parameters: {
    kvpSeting?: number;
    kvpValues?: number[];
    timeSeting?: number;
    timeValues?: number[];
    hvlValue?: number;
    tubeLeakage?: number;
    calibratorDueDate?: string;
  }
): ValidationReport {
  const issues: ValidationIssue[] = [];

  // 1. Calibrator Expiration Check
  if (parameters.calibratorDueDate) {
    const dueDate = new Date(parameters.calibratorDueDate);
    const now = new Date();
    if (dueDate < now) {
      issues.push({
        field: 'calibratorDueDate',
        severity: 'ERROR',
        message: `Standar Kalibrator yang digunakan sudah KEDALUWARSA (${parameters.calibratorDueDate}). Pengujian tidak dapat disetujui.`,
        suggestedAction: 'Pilih alat standar kalibrator yang memiliki sertifikat kalibrasi aktif.'
      });
    }
  }

  // 2. Physical Range Checks
  if (parameters.kvpSeting !== undefined) {
    if (parameters.kvpSeting <= 0 || parameters.kvpSeting > 300) {
      issues.push({
        field: 'kvpSeting',
        severity: 'ERROR',
        message: `Nilai kVp Setting (${parameters.kvpSeting} kV) di luar domain fisik pesawat sinar-X (0 - 300 kV).`,
        suggestedAction: 'Periksa kembali nilai setting yang dimasukkan.'
      });
    }
  }

  if (parameters.timeSeting !== undefined) {
    if (parameters.timeSeting <= 0 || parameters.timeSeting > 60000) {
      issues.push({
        field: 'timeSeting',
        severity: 'ERROR',
        message: `Nilai Waktu Setting (${parameters.timeSeting} ms) tidak valid.`,
        suggestedAction: 'Periksa rentang waktu eksposur.'
      });
    }
  }

  if (parameters.tubeLeakage !== undefined && parameters.tubeLeakage > 50) {
    issues.push({
      field: 'tubeLeakage',
      severity: 'WARNING',
      message: `Nilai kebocoran tabung (${parameters.tubeLeakage} mGy/h) sangat tinggi. Potensi bahaya radiasi kritis!`,
      suggestedAction: 'Lakukan pemeriksaan fisik wadah tabung dan kolimator.'
    });
  }

  const hasErrors = issues.some(i => i.severity === 'ERROR');

  return {
    isValid: !hasErrors,
    issues,
    validatedAt: new Date().toISOString()
  };
}
