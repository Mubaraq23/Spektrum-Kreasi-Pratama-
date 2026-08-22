// Digital UKES Evidence Integrity & Management Engine — Spektrum CalibraPro

import { UkesEvidenceItem } from './ukesTypes';

export function createEvidenceRecord(
  testSessionId: string,
  category: UkesEvidenceItem['category'],
  description: string,
  fileUrl: string,
  uploadedBy: string
): UkesEvidenceItem {
  const hashMock = 'hash-' + Math.random().toString(36).substring(2, 10);

  return {
    evidenceId: `evd-${Date.now()}`,
    testSessionId,
    category,
    description,
    fileUrl,
    fileHash: hashMock,
    uploadedAt: new Date().toISOString(),
    uploadedBy
  };
}
