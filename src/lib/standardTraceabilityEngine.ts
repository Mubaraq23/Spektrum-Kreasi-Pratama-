// Standard Equipment Traceability & Calibration Validity Engine — Spektrum CalibraPro

export interface StandardEquipmentRecord {
  id: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  certificateNumber: string;
  calibrationDate: string;
  dueDate: string;
  calibrationLaboratory: string;
  uncertaintyCert: number;
  coverageFactorK: number;
  traceabilityChain: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_CERTIFICATE';
}

export function evaluateStandardValidity(std: StandardEquipmentRecord): {
  status: StandardEquipmentRecord['status'];
  daysRemaining: number;
  message: string;
} {
  if (!std.dueDate || !std.certificateNumber) {
    return {
      status: 'MISSING_CERTIFICATE',
      daysRemaining: 0,
      message: `Alat Standar ${std.name} (${std.serialNumber}) TIDAK MEMILIKI SERTIFIKAT TERDAFTAR.`
    };
  }

  const due = new Date(std.dueDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'EXPIRED',
      daysRemaining: diffDays,
      message: `Sertifikat Kalibrasi Standar ${std.name} telah KEDALUWARSA sejak ${Math.abs(diffDays)} hari yang lalu.`
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'EXPIRING_SOON',
      daysRemaining: diffDays,
      message: `Sertifikat Kalibrasi Standar ${std.name} akan KEDALUWARSA dalam ${diffDays} hari.`
    };
  }

  return {
    status: 'VALID',
    daysRemaining: diffDays,
    message: `Sertifikat Kalibrasi Standar ${std.name} VALID hingga ${std.dueDate}.`
  };
}
