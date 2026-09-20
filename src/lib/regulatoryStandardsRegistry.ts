/**
 * Central Regulatory & Standards Registry — Spektrum Kreasi Pratama
 * Storing versioned standards, Permenkes, Perka BAPETEN, MPEs, acceptance criteria, and effective dates.
 */

export interface RegulatoryStandard {
  id: string;
  code: string; // e.g. 'PMK_54_2015', 'BAPETEN_02_2018', 'IEC_62353'
  title: string;
  issuingBody: 'KEMENKES' | 'BAPETEN' | 'KAN' | 'IEC' | 'BPFK';
  version: string;
  effectiveDate: string;
  revisionDate?: string;
  sourceUrl?: string;
  approvalStatus: 'APPROVED' | 'DRAFT' | 'SUPERSEDED';
  approvedBy: string;
  affectedCategories: string[];
}

export interface MpeRuleDefinition {
  ruleId: string;
  standardCode: string;
  category: string;
  subCategory?: string;
  parameter: string;
  rangeMin?: number;
  rangeMax?: number;
  unit: string;
  mpeType: 'PERCENTAGE' | 'ABSOLUTE' | 'HYBRID';
  mpeValue: number;       // e.g. 5 for 5%, 0.5 for 0.5 unit
  mpeAbsoluteSecondary?: number;
  formulaDescription: string;
  effectiveDate: string;
  testMethodRef: string;
}

export const CENTRAL_REGULATORY_REGISTRY: RegulatoryStandard[] = [
  {
    id: 'REG-PMK-54-2015',
    code: 'PMK_54_2015',
    title: 'Permenkes No. 54 Tahun 2015 tentang Pengujian dan Kalibrasi Alat Kesehatan',
    issuingBody: 'KEMENKES',
    version: '1.0.0',
    effectiveDate: '2015-11-12',
    sourceUrl: 'https://yankes.kemkes.go.id/regulasi/detail/54-2015',
    approvalStatus: 'APPROVED',
    approvedBy: 'Direktur Jenderal Pelayanan Kesehatan Kemenkes RI',
    affectedCategories: ['suhu', 'tekanan', 'massa', 'flow', 'kelistrikan', 'radiologi']
  },
  {
    id: 'REG-BAP-02-2018',
    code: 'BAPETEN_02_2018',
    title: 'Peraturan Kepala BAPETEN No. 2 Tahun 2018 tentang Uji Kesesuaian Pesawat Sinar-X',
    issuingBody: 'BAPETEN',
    version: '2.1.0',
    effectiveDate: '2018-04-16',
    sourceUrl: 'https://balis.bapeten.go.id/regulasi',
    approvalStatus: 'APPROVED',
    approvedBy: 'Kepala BAPETEN RI',
    affectedCategories: ['radiologi_radiografi', 'radiologi_fluoroskopi', 'radiologi_ctscan', 'radiologi_mammografi', 'radiologi_dental']
  },
  {
    id: 'REG-IEC-62353',
    code: 'IEC_62353',
    title: 'IEC 62353: Medical Electrical Equipment — Recurrent test and test after repair',
    issuingBody: 'IEC',
    version: '2014-ED2',
    effectiveDate: '2014-09-01',
    approvalStatus: 'APPROVED',
    approvedBy: 'International Electrotechnical Commission',
    affectedCategories: ['keselamatan_listrik']
  },
  {
    id: 'REG-KAN-BSN-17025',
    code: 'ISO_17025_2017',
    title: 'SNI ISO/IEC 17025:2017 — Persyaratan Umum Kompetensi Laboratorium Pengujian & Kalibrasi',
    issuingBody: 'KAN',
    version: '2017',
    effectiveDate: '2017-11-29',
    approvalStatus: 'APPROVED',
    approvedBy: 'Komite Akreditasi Nasional (KAN)',
    affectedCategories: ['semua_metode']
  }
];

export const CENTRAL_MPE_REGISTRY: MpeRuleDefinition[] = [
  // Defibrillator Discharge Energy
  {
    ruleId: 'MPE-DEF-001',
    standardCode: 'PMK_54_2015',
    category: 'defibrillator',
    parameter: 'Energi Discharge (Joule)',
    rangeMin: 0,
    rangeMax: 360,
    unit: 'J',
    mpeType: 'HYBRID',
    mpeValue: 15, // 15% atau 4 Joule (mana yang lebih besar)
    mpeAbsoluteSecondary: 4.0,
    formulaDescription: 'Max(15% dari setting, 4.0 Joule)',
    effectiveDate: '2015-11-12',
    testMethodRef: 'IK-SPK-DEF-01'
  },
  // ECG / Patient Monitor Heart Rate
  {
    ruleId: 'MPE-ECG-001',
    standardCode: 'PMK_54_2015',
    category: 'patient_monitor',
    parameter: 'Heart Rate (BPM)',
    rangeMin: 30,
    rangeMax: 240,
    unit: 'BPM',
    mpeType: 'ABSOLUTE',
    mpeValue: 5.0, // ± 5 BPM
    formulaDescription: '± 5.0 BPM',
    effectiveDate: '2015-11-12',
    testMethodRef: 'IK-SPK-MON-01'
  },
  // Syringe Pump Flow Rate
  {
    ruleId: 'MPE-SYR-001',
    standardCode: 'PMK_54_2015',
    category: 'syringe_pump',
    parameter: 'Laju Alir (Flow Rate)',
    rangeMin: 0.1,
    rangeMax: 999,
    unit: 'mL/h',
    mpeType: 'PERCENTAGE',
    mpeValue: 5.0, // ± 5%
    formulaDescription: '± 5.0% dari Flow Rate setting',
    effectiveDate: '2015-11-12',
    testMethodRef: 'IK-SPK-SYR-01'
  },
  // X-Ray Tegangan Tabung (kVp)
  {
    ruleId: 'MPE-RAD-KVP-001',
    standardCode: 'BAPETEN_02_2018',
    category: 'radiologi_radiografi',
    parameter: 'Akurasi Tegangan (kVp)',
    rangeMin: 40,
    rangeMax: 150,
    unit: 'kVp',
    mpeType: 'PERCENTAGE',
    mpeValue: 5.0, // ± 5%
    formulaDescription: 'Error Tegangan ≤ 5.0%',
    effectiveDate: '2018-04-16',
    testMethodRef: 'IK-SPK-RAD-01'
  },
  // X-Ray Linearitas (CL)
  {
    ruleId: 'MPE-RAD-CL-001',
    standardCode: 'BAPETEN_02_2018',
    category: 'radiologi_radiografi',
    parameter: 'Linearitas Keluaran Radiasi (CL)',
    unit: 'ratio',
    mpeType: 'ABSOLUTE',
    mpeValue: 0.10, // CL ≤ 0.10
    formulaDescription: 'Coeff of Linearity CL ≤ 0.10',
    effectiveDate: '2018-04-16',
    testMethodRef: 'IK-SPK-RAD-02'
  }
];

export function lookupMpeRule(category: string, parameter: string, value: number = 0): MpeRuleDefinition | undefined {
  return CENTRAL_MPE_REGISTRY.find(rule => 
    rule.category === category && 
    rule.parameter.toLowerCase().includes(parameter.toLowerCase())
  );
}
