// Master Configuration Engine — Configuration-Driven Architecture for Spektrum CalibraPro

export interface RegulationConfig {
  id: string;
  regulationCode: string; // e.g. 'PERBA_BAPETEN_1_2025', 'PERBA_BAPETEN_2_2022', 'PERKA_BAPETEN_2_2018', 'KAN_MIS_002'
  regulationTitle: string;
  authority: 'BAPETEN' | 'KAN' | 'KEMENKES' | 'BSN' | 'INTERNAL';
  effectiveDate: string;
  revision: number;
  status: 'ACTIVE' | 'SUPERSEDED' | 'DRAFT' | 'ARCHIVED';
  sourceReference: string;
  modalityOrCategory: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

export interface DeviceTaxonomyConfig {
  id: string;
  deviceCategory: 'RADIOLOGY' | 'ELECTROMEDICAL' | 'LABORATORY' | 'SURGICAL' | 'LIFE_SUPPORT' | 'DIAGNOSTIC';
  deviceType: string; // e.g. 'Pesawat Sinar-X Radiografi Umum', 'Patient Monitor', 'Defibrillator', 'CT Scan'
  modality?: 'Radiografi Umum' | 'Dental' | 'CT Scan' | 'Mammografi' | 'Fluoroskopi' | 'Umum';
  modelFamily?: string;
  riskCategory: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
  isElectricalSafetyRequired: boolean;
  electricalSafetyClass?: 'CLASS_I_TYPE_B' | 'CLASS_I_TYPE_BF' | 'CLASS_I_TYPE_CF' | 'CLASS_II_TYPE_BF' | 'CLASS_II_TYPE_CF' | 'NOT_APPLICABLE';
  calibrationFrequencyMonths: number;
  ipmFrequencyMonths: number;
  ukesFrequencyMonths?: number;
  calculationTemplateId: string;
  ipmChecklistTemplateId: string;
}

export interface ParameterConfig {
  id: string;
  parameterCode: string; // e.g. 'KVP_ACCURACY', 'TIME_ACCURACY', 'DOSE_CV', 'HVL_AL', 'TUBE_LEAKAGE', 'SAFETY_EARTH_RES'
  parameterName: string;
  regulationVersion: string;
  deviceCategory: string;
  deviceType: string;
  modality?: string;
  unit: string;
  method: string;
  formula: string; // e.g. 'ABS_ERROR_PCT', 'MAX_CV', 'WELCH_SATTERTHWAITE', 'LINEARITY_C'
  acceptanceCriteria: string;
  toleranceMin?: number;
  toleranceMax?: number;
  maxCV?: number;
  maxLinearity?: number;
  isMandatory: boolean;
  status: 'VERIFIED' | 'NEEDS_REGULATORY_CONFIGURATION' | 'DEPRECATED';
  sourceReference: string;
  revision: number;
}

export interface ChecklistConfig {
  id: string;
  templateId: string;
  deviceCategory: string;
  deviceType: string;
  riskCategory: 'HIGH_RISK' | 'MEDIUM_RISK' | 'LOW_RISK';
  checkitemId: string;
  title: string;
  category: 'PHYSICAL' | 'FUNCTIONAL' | 'ELECTRICAL_SAFETY' | 'ACCESSORIES' | 'ALARM' | 'DISPLAY' | 'BATTERY' | 'MECHANICAL';
  method: string;
  acceptanceCriteria: string;
  scoringWeight: number; // e.g. 10
  isElectricalSafety: boolean;
  status: 'ACTIVE' | 'DRAFT';
}

// Master Regulation Default Seed Catalog
export const DEFAULT_REGULATIONS: RegulationConfig[] = [
  {
    id: 'reg-bapeten-1-2025',
    regulationCode: 'PERBA_BAPETEN_1_2025',
    regulationTitle: 'Peraturan BAPETEN No. 1 Tahun 2025 tentang Penilaian Kesesuaian Pesawat Sinar-X Dalam Radiologi Diagnostik dan Intervensional',
    authority: 'BAPETEN',
    effectiveDate: '2025-01-01',
    revision: 1,
    status: 'ACTIVE',
    sourceReference: 'JDIH BAPETEN Perba No. 1/2025',
    modalityOrCategory: 'RADIOLOGY',
    description: 'Ketentuan standar penilaian kesesuaian terbaru untuk pesawat sinar-X diagnostik dan intervensional.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Master Engine'
  },
  {
    id: 'reg-bapeten-2-2022',
    regulationCode: 'PERBA_BAPETEN_2_2022',
    regulationTitle: 'Peraturan BAPETEN No. 2 Tahun 2022 tentang Perubahan Atas Peraturan BAPETEN No. 2 Tahun 2018',
    authority: 'BAPETEN',
    effectiveDate: '2022-06-15',
    revision: 2,
    status: 'ACTIVE',
    sourceReference: 'JDIH BAPETEN Perba No. 2/2022',
    modalityOrCategory: 'RADIOLOGY',
    description: 'Perubahan parameter toleransi dan metode pengujian kesesuaian radiologi.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Master Engine'
  },
  {
    id: 'reg-bapeten-2-2018',
    regulationCode: 'PERKA_BAPETEN_2_2018',
    regulationTitle: 'Peraturan Kepala BAPETEN No. 2 Tahun 2018 tentang Uji Kesesuaian Pesawat Sinar-X Radiologi Diagnostik dan Intervensional',
    authority: 'BAPETEN',
    effectiveDate: '2018-04-01',
    revision: 1,
    status: 'ACTIVE',
    sourceReference: 'JDIH BAPETEN Perka No. 2/2018',
    modalityOrCategory: 'RADIOLOGY',
    description: 'Standar dasar uji kesesuaian pesawat sinar-X radiologi diagnostik dan intervensional.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Master Engine'
  },
  {
    id: 'reg-kan-17025',
    regulationCode: 'ISO_IEC_17025_2017',
    regulationTitle: 'ISO/IEC 17025:2017 & Pedoman KAN MIS 002 (Guide to Expression of Uncertainty in Measurement)',
    authority: 'KAN',
    effectiveDate: '2017-11-01',
    revision: 3,
    status: 'ACTIVE',
    sourceReference: 'KAN LK-291-IDN & LP-1849-IDN Documented Standard',
    modalityOrCategory: 'ELECTROMEDICAL',
    description: 'Persyaratan umum kompetensi laboratorium pengujian dan kalibrasi metrologi.',
    updatedAt: new Date().toISOString(),
    updatedBy: 'System Master Engine'
  }
];

// Helper functions for configuration lookup
export function getActiveRegulation(code: string): RegulationConfig | undefined {
  return DEFAULT_REGULATIONS.find(r => r.regulationCode === code && r.status === 'ACTIVE');
}

export function formatRegulationBadge(regulationCode: string): { label: string; bg: string; text: string } {
  if (regulationCode.includes('2025')) {
    return { label: 'BAPETEN 2025 (Terbaru)', bg: 'bg-emerald-500/10', text: 'text-emerald-400' };
  }
  if (regulationCode.includes('2022')) {
    return { label: 'BAPETEN 2022', bg: 'bg-cyan-500/10', text: 'text-cyan-400' };
  }
  if (regulationCode.includes('17025')) {
    return { label: 'KAN ISO 17025', bg: 'bg-indigo-500/10', text: 'text-indigo-400' };
  }
  return { label: 'BAPETEN 2018', bg: 'bg-blue-500/10', text: 'text-blue-400' };
}
