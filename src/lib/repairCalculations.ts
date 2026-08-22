// Repair & Corrective Maintenance Calculation & Logic Engine

export interface RepairCostBreakdown {
  laborCost: number;
  sparePartCost: number;
  vendorCost: number;
  transportCost: number;
  totalCost: number;
}

export function calculateRepairCost(
  laborCost: number = 0,
  sparePartCost: number = 0,
  vendorCost: number = 0,
  transportCost: number = 0
): RepairCostBreakdown {
  const total = (laborCost || 0) + (sparePartCost || 0) + (vendorCost || 0) + (transportCost || 0);
  return {
    laborCost,
    sparePartCost,
    vendorCost,
    transportCost,
    totalCost: total
  };
}

export function calculateDowntimeHours(startDateStr: string, endDateStr?: string): number {
  if (!startDateStr) return 0;
  const start = new Date(startDateStr).getTime();
  const end = endDateStr ? new Date(endDateStr).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  return Math.round(diffMs / (1000 * 60 * 60)); // hours
}

export function evaluateFinalRepairStatus(
  testingPassed: boolean,
  electricalSafetyPassed: boolean,
  requiresCalibration: boolean,
  requiresUkes: boolean
): 'SIAP DIGUNAKAN' | 'PERLU KALIBRASI' | 'PERLU UKES' | 'TIDAK LAYAK DIGUNAKAN' {
  if (!testingPassed || !electricalSafetyPassed) {
    return 'TIDAK LAYAK DIGUNAKAN';
  }

  if (requiresCalibration) {
    return 'PERLU KALIBRASI';
  }

  if (requiresUkes) {
    return 'PERLU UKES';
  }

  return 'SIAP DIGUNAKAN';
}
