/**
 * Competency & Personnel Authorization Matrix Engine — Spektrum Kreasi Pratama
 * Manages technician qualifications, training records, competency expiry, and authorization gating.
 */

export interface TechnicianCompetencyRecord {
  technicianUid: string;
  technicianName: string;
  nipOrRegistrationNo: string;
  competencyLevel: 'JUNIOR_TECHNICIAN' | 'TECHNICIAN_LEVEL_1' | 'TECHNICIAN_LEVEL_2' | 'SENIOR_METROLOGIST';
  authorizedIkCodes: string[]; // e.g. ['IK-SPK-DEF-01', 'IK-SPK-MON-01']
  certificationNumber: string;
  certifiedBy: 'KAN' | 'BPFK' | 'BAPETEN' | 'INTERNAL_LPAK';
  issueDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'UNDER_TRAINING';
}

export const TECHNICIAN_COMPETENCY_DATABASE: TechnicianCompetencyRecord[] = [
  {
    technicianUid: 'tech-user-001',
    technicianName: 'Ir. Ahmad Zaky, S.T.',
    nipOrRegistrationNo: '198804122015031002',
    competencyLevel: 'SENIOR_METROLOGIST',
    authorizedIkCodes: ['IK-SPK-DEF-01', 'IK-SPK-MON-01', 'IK-SPK-SYR-01', 'IK-SPK-INC-01', 'IK-SPK-RAD-01', 'IK-SPK-RAD-02'],
    certificationNumber: 'KAN-CERT-MET-2024-0089',
    certifiedBy: 'KAN',
    issueDate: '2024-01-10',
    expiryDate: '2027-01-10',
    status: 'ACTIVE'
  },
  {
    technicianUid: 'tech-user-002',
    technicianName: 'Budi Santoso, S.ST.',
    nipOrRegistrationNo: '199209152019021004',
    competencyLevel: 'TECHNICIAN_LEVEL_2',
    authorizedIkCodes: ['IK-SPK-DEF-01', 'IK-SPK-MON-01', 'IK-SPK-SYR-01'],
    certificationNumber: 'BPFK-CERT-2025-0142',
    certifiedBy: 'BPFK',
    issueDate: '2025-03-01',
    expiryDate: '2028-03-01',
    status: 'ACTIVE'
  }
];

export function validateTechnicianAuthorization(
  technicianUid: string,
  requiredIkCode: string
): { authorized: boolean; reason?: string } {
  const tech = TECHNICIAN_COMPETENCY_DATABASE.find(t => t.technicianUid === technicianUid || t.technicianName.toLowerCase().includes(technicianUid.toLowerCase()));

  if (!tech) {
    return { authorized: false, reason: `Data kompetensi personel dengan ID '${technicianUid}' tidak ditemukan.` };
  }

  if (tech.status !== 'ACTIVE') {
    return { authorized: false, reason: `Status kompetensi personel '${tech.technicianName}' saat ini: ${tech.status}.` };
  }

  const now = new Date().toISOString().split('T')[0];
  if (tech.expiryDate < now) {
    return { authorized: false, reason: `Sertifikat kompetensi '${tech.technicianName}' telah kedaluwarsa pada ${tech.expiryDate}.` };
  }

  if (!tech.authorizedIkCodes.includes(requiredIkCode)) {
    return { authorized: false, reason: `Personel '${tech.technicianName}' belum terotorisasi untuk Instruksi Kerja '${requiredIkCode}'.` };
  }

  return { authorized: true };
}
