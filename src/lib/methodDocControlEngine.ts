/**
 * Method & IK Document Control Engine — Spektrum Kreasi Pratama
 * Governs document control, versioning, revision history, and snapshot preservation for Work Instructions (IK).
 */

export interface WorkInstructionDoc {
  docNumber: string; // e.g. 'IK-SPK-DEF-01'
  title: string;
  revision: number; // e.g. 2
  effectiveDate: string;
  reviewDueDate: string;
  authorName: string;
  reviewerName: string;
  approverName: string;
  status: 'APPROVED_ACTIVE' | 'DRAFT' | 'OBSOLETE' | 'UNDER_REVIEW';
  changeReason: string;
  applicableCategories: string[];
  referenceStandards: string[]; // e.g. ['Permenkes No. 54 Tahun 2015', 'ISO/IEC 17025:2017 Clause 7.2']
  requiredCompetencyLevel: 'TECHNICIAN_LEVEL_1' | 'TECHNICIAN_LEVEL_2' | 'SENIOR_METROLOGIST';
  checksumSha256: string;
}

export interface IkVersionSnapshot {
  docNumber: string;
  revision: number;
  effectiveDate: string;
  title: string;
  checksumSha256: string;
  snapshottedAt: string;
}

export const REGISTERED_WORK_INSTRUCTIONS: WorkInstructionDoc[] = [
  {
    docNumber: 'IK-SPK-DEF-01',
    title: 'Instruksi Kerja Kalibrasi Defibrillator & Cardioverter',
    revision: 3,
    effectiveDate: '2026-01-15',
    reviewDueDate: '2028-01-15',
    authorName: 'Budi Santoso, S.ST.',
    reviewerName: 'Ir. Ahmad Zaky, S.T. (Manajer Mutu)',
    approverName: 'Dr. Eng. Hendra Wijaya (Manajer Teknis)',
    status: 'APPROVED_ACTIVE',
    changeReason: 'Penyesuaian toleransi MPE Energi Discharge dan penambahan kriteria Guard Banding ILAC-G8',
    applicableCategories: ['defibrillator'],
    referenceStandards: ['PMK_54_2015', 'ISO_17025_2017'],
    requiredCompetencyLevel: 'TECHNICIAN_LEVEL_2',
    checksumSha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
  },
  {
    docNumber: 'IK-SPK-RAD-01',
    title: 'Instruksi Kerja Uji Kesesuaian Pesawat Sinar-X Radiografi Umum',
    revision: 2,
    effectiveDate: '2025-08-10',
    reviewDueDate: '2027-08-10',
    authorName: 'Raditya Pratama, S.Si.',
    reviewerName: 'Dewi Lestari, M.Si.',
    approverName: 'Dr. Eng. Hendra Wijaya (Manajer Teknis)',
    status: 'APPROVED_ACTIVE',
    changeReason: 'Pembaruan tabel batas toleransi Perka BAPETEN No. 2 Tahun 2018',
    applicableCategories: ['radiologi_radiografi'],
    referenceStandards: ['BAPETEN_02_2018'],
    requiredCompetencyLevel: 'SENIOR_METROLOGIST',
    checksumSha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'
  }
];

export function getActiveIkDocument(docNumber: string): WorkInstructionDoc | undefined {
  return REGISTERED_WORK_INSTRUCTIONS.find(ik => ik.docNumber === docNumber && ik.status === 'APPROVED_ACTIVE');
}

export function createIkSnapshot(ik: WorkInstructionDoc): IkVersionSnapshot {
  return {
    docNumber: ik.docNumber,
    revision: ik.revision,
    effectiveDate: ik.effectiveDate,
    title: ik.title,
    checksumSha256: ik.checksumSha256,
    snapshottedAt: new Date().toISOString()
  };
}
