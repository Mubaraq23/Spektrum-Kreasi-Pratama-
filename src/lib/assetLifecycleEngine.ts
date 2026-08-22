// Unified 360° Asset Lifecycle Engine — Spektrum CalibraPro

export interface AssetLifecycleRecord {
  assetId: string;
  inventoryNumber: string;
  deviceName: string;
  brand: string;
  model: string;
  serialNumber: string;
  fasyankesName: string;
  locationRoom: string;
  riskCategory: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
  operationalStatus: 'SIAP_DIGUNAKAN' | 'PERLU_KALIBRASI' | 'PERLU_UKES' | 'SEDANG_PERBAIKAN' | 'TIDAK_LAYAK';
  lastCalibrationDate?: string;
  nextCalibrationDueDate?: string;
  lastUkesDate?: string;
  nextUkesDueDate?: string;
  lastIpmDate?: string;
  nextIpmDueDate?: string;
  totalRepairCost: number;
  totalDowntimeHours: number;
  repairCount: number;
  createdAt: string;
  updatedAt: string;
}

export function evaluateAssetNextDisposition(
  asset: AssetLifecycleRecord,
  serviceEvent: {
    eventType: 'CALIBRATION' | 'UKES' | 'IPM' | 'REPAIR';
    eventDate: string;
    resultStatus: 'PASS' | 'FAIL' | 'LAIK' | 'TIDAK_LAIK';
    repairDisposition?: 'SIAP_DIGUNAKAN' | 'PERLU_KALIBRASI' | 'PERLU_UKES' | 'TIDAK_LAYAK';
  }
): { newOperationalStatus: AssetLifecycleRecord['operationalStatus']; note: string } {
  if (serviceEvent.eventType === 'REPAIR') {
    const disp = serviceEvent.repairDisposition || 'SIAP_DIGUNAKAN';
    if (disp === 'PERLU_KALIBRASI') {
      return { newOperationalStatus: 'PERLU_KALIBRASI', note: 'Perbaikan selesai; memicu permohonan Kalibrasi ulang.' };
    }
    if (disp === 'PERLU_UKES') {
      return { newOperationalStatus: 'PERLU_UKES', note: 'Perbaikan selesai; memicu Uji Kesesuaian BAPETEN.' };
    }
    if (disp === 'TIDAK_LAYAK') {
      return { newOperationalStatus: 'TIDAK_LAYAK', note: 'Perbaikan gagal/komponen kritis rusak. Alat tidak layak operasional.' };
    }
    return { newOperationalStatus: 'SIAP_DIGUNAKAN', note: 'Perbaikan selesai dan pengujian pasca-perbaikan memenuhi syarat.' };
  }

  if (serviceEvent.resultStatus === 'FAIL' || serviceEvent.resultStatus === 'TIDAK_LAIK') {
    return { newOperationalStatus: 'TIDAK_LAYAK', note: 'Hasil pengujian tidak memenuhi kriteria penerimaan.' };
  }

  return { newOperationalStatus: 'SIAP_DIGUNAKAN', note: 'Pengujian berhasil. Alat laik digunakan.' };
}
