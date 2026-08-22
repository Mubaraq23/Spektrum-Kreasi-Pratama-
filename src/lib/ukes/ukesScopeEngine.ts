// Ukes Scope Gatekeeper Engine — Universal BAPETEN Radiology UKES Platform v2
// Acuan: KAN ISO/IEC 17025:2017 & Regulasi BAPETEN Perba 1/2025

export type ScopeStatus = 
  | 'IN_SCOPE'
  | 'OUT_OF_SCOPE'
  | 'CONDITIONAL'
  | 'PENDING_SCOPE'
  | 'EXPIRED_SCOPE';

export type ModalitySupportLevel = 
  | 'CATALOG_SUPPORTED'
  | 'UKES_SUPPORTED'
  | 'OUT_OF_SCOPE'
  | 'CUSTOM';

export interface UkesScopeDefinition {
  id: string;
  modalityId: string;
  modalityName: string;
  scopeStatus: ScopeStatus;
  supportLevel: ModalitySupportLevel;
  accreditationReference: string;
  certificateNumber: string;
  effectiveDate: string;
  expiryDate: string;
  limitations: string[];
  notes: string;
}

export const MASTER_ACCREDITED_SCOPES: UkesScopeDefinition[] = [
  {
    id: 'SCOPE-RAD-01',
    modalityId: 'general-xray',
    modalityName: 'General X-Ray (Radiografi Umum Stasioner)',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-RAD-001',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: ['Maksimum tegangan tabung 150 kVp'],
    notes: 'Terakreditasi penuh untuk pengujian kesesuaian radiografi umum stasioner.'
  },
  {
    id: 'SCOPE-MOB-01',
    modalityId: 'mobile-xray',
    modalityName: 'Mobile / Portable X-Ray',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-RAD-002',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: ['Pengujian jarak aman operator minimum 2m'],
    notes: 'Terakreditasi penuh untuk radiografi mobile.'
  },
  {
    id: 'SCOPE-DEN-01',
    modalityId: 'dental-intraoral',
    modalityName: 'Dental Intraoral X-Ray',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-DEN-001',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: [],
    notes: 'Terakreditasi penuh untuk dental periapikal.'
  },
  {
    id: 'SCOPE-PAN-01',
    modalityId: 'dental-panoramic',
    modalityName: 'Dental Panoramic & Cephalometric',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-DEN-002',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: [],
    notes: 'Terakreditasi penuh untuk panoramik & kefalometri.'
  },
  {
    id: 'SCOPE-MAM-01',
    modalityId: 'mammography',
    modalityName: 'Mamografi (Mammography / FFDM)',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-MAM-001',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: ['Gaya kompresi 111 N - 200 N'],
    notes: 'Terakreditasi penuh untuk mamografi digital.'
  },
  {
    id: 'SCOPE-FLU-01',
    modalityId: 'fluoroscopy-carm',
    modalityName: 'Fluoroskopi / C-Arm Bedah',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-FLU-001',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: ['Laju dosis maksimum 50 mGy/menit'],
    notes: 'Terakreditasi penuh untuk fluoroskopi C-Arm.'
  },
  {
    id: 'SCOPE-ANG-01',
    modalityId: 'angiography-cathlab',
    modalityName: 'Angiografi / Cath Lab Intervensional',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-ANG-001',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: ['Mode HLC laju dosis 100 mGy/menit'],
    notes: 'Terakreditasi penuh untuk Cath Lab.'
  },
  {
    id: 'SCOPE-CTS-01',
    modalityId: 'ct-scan',
    modalityName: 'CT Scanner (Multi-Slice CT)',
    scopeStatus: 'IN_SCOPE',
    supportLevel: 'UKES_SUPPORTED',
    accreditationReference: 'KAN LK-091-IDN & BAPETEN LUK-012',
    certificateNumber: 'LUK-2025-CTS-001',
    effectiveDate: '2024-01-01',
    expiryDate: '2028-12-31',
    limitations: ['Menggunakan Phantom Head 16cm & Body 32cm'],
    notes: 'Terakreditasi penuh untuk CT Scan.'
  },
  {
    id: 'SCOPE-DEX-01',
    modalityId: 'dexa-bone',
    modalityName: 'Bone Densitometry (DEXA / DXA)',
    scopeStatus: 'OUT_OF_SCOPE',
    supportLevel: 'CATALOG_SUPPORTED',
    accreditationReference: 'BAPETEN Katalog Non-UKES',
    certificateNumber: 'N/A',
    effectiveDate: '2024-01-01',
    expiryDate: '2025-01-01',
    limitations: ['Belum masuk ruang lingkup akreditasi UKES BAPETEN LUK'],
    notes: 'DEXA terdaftar di katalog perangkat software, tetapi DILUAR RUANG LINGKUP AKREDITASI UKES.'
  }
];

export interface ScopeGateEvaluation {
  canProceedAssessment: boolean;
  canIssueCertificate: boolean;
  scopeStatus: ScopeStatus;
  supportLevel: ModalitySupportLevel;
  displayNoticeTitle: string;
  displayNoticeMessage: string;
}

export function evaluateModalityScopeGate(modalityId: string): ScopeGateEvaluation {
  const scope = MASTER_ACCREDITED_SCOPES.find(s => s.modalityId === modalityId);

  if (!scope) {
    return {
      canProceedAssessment: true,
      canIssueCertificate: false,
      scopeStatus: 'OUT_OF_SCOPE',
      supportLevel: 'CUSTOM',
      displayNoticeTitle: 'SCOPE NOT CONFIGURED',
      displayNoticeMessage: 'Modalitas ini belum mempunyai konfigurasi ruang lingkup akreditasi UKES yang disahkan. Sertifikat UKES otomatis tidak dapat diterbitkan.'
    };
  }

  if (scope.scopeStatus === 'OUT_OF_SCOPE') {
    return {
      canProceedAssessment: true,
      canIssueCertificate: false,
      scopeStatus: 'OUT_OF_SCOPE',
      supportLevel: scope.supportLevel,
      displayNoticeTitle: 'MODALITY OUT OF ACCREDITED SCOPE',
      displayNoticeMessage: `Perangkat ${scope.modalityName} didukung secara software, namun DILUAR RUANG LINGKUP AKREDITASI UKES BAPETEN (${scope.accreditationReference}). Sistem memblokir penerbitan Sertifikat Uji Kesesuaian.`
    };
  }

  if (scope.scopeStatus === 'EXPIRED_SCOPE') {
    return {
      canProceedAssessment: false,
      canIssueCertificate: false,
      scopeStatus: 'EXPIRED_SCOPE',
      supportLevel: scope.supportLevel,
      displayNoticeTitle: 'ACCREDITATION SCOPE EXPIRED',
      displayNoticeMessage: `Masa berlaku akreditasi UKES untuk ${scope.modalityName} telah berakhir pada ${scope.expiryDate}. Harap perbarui lisensi akreditasi LUK.`
    };
  }

  return {
    canProceedAssessment: true,
    canIssueCertificate: true,
    scopeStatus: scope.scopeStatus,
    supportLevel: scope.supportLevel,
    displayNoticeTitle: 'AKREDITASI UKES VALID',
    displayNoticeMessage: `Ruang lingkup akreditasi aktif: ${scope.accreditationReference} (Berlaku s.d. ${scope.expiryDate}).`
  };
}
