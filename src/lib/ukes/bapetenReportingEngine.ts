// Kepka BAPETEN No. 3051 Tahun 2024 Reporting & Self-Submission Preparation Engine
// Acuan: Keputusan Kepala BAPETEN No. 3051 Tahun 2024 tentang Tata Cara Penerbitan Sertifikat Uji Kesesuaian & Pelaporan Mandiri LUK

export type BapetenReportingStatus = 
  | 'DRAFT_REPORT'
  | 'PENDING_SUBMISSION'
  | 'SUBMITTED'
  | 'ACCEPTED_BY_BAPETEN'
  | 'REJECTED_BY_BAPETEN'
  | 'RETRY_SUBMISSION';

export interface BapetenReportPayload {
  reportId: string;
  lhuNumber: string;
  certificateNumber: string;
  modalityCode: string;
  modalityName: string;
  fasyankesName: string;
  fasyankesAddress: string;
  fasyankesBapetenId?: string;
  deviceBrand: string;
  deviceModel: string;
  deviceSerialNumber: string;
  tubeSerialNumber: string;
  overallStatus: 'LAIK' | 'TIDAK_LAIK';
  testDate: string;
  testerName: string;
  reviewerName: string;
  approverName: string;
  payloadVersion: string; // 'KEPKA-3051-2024-V1'
  submittedBy: string;
  submittedAt?: string;
  reportingStatus: BapetenReportingStatus;
  rejectionReason?: string;
  auditTrailLogs: Array<{ action: string; timestamp: string; actor: string }>;
}

export interface UkesTestRecordInput {
  id?: string;
  lhuNumber?: string;
  certificateNo?: string;
  modalityId?: string;
  modalityName?: string;
  fasyankesName?: string;
  fasyankesAddress?: string;
  fasyankesBapetenId?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  tubeSN?: string;
  overallStatus?: string;
  testDate?: string;
  testerName?: string;
  reviewerName?: string;
  approverName?: string;
  [key: string]: unknown;
}

export function formatBapeten3051Payload(testRecord: UkesTestRecordInput, userEmail: string): BapetenReportPayload {
  const timestamp = new Date().toISOString();
  return {
    reportId: `BAP-3051-${testRecord.id || Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    lhuNumber: (testRecord.lhuNumber as string) || `LHU-UKES-${new Date().getFullYear()}-001`,
    certificateNumber: (testRecord.certificateNo as string) || `CERT-BAPETEN-${new Date().getFullYear()}-881`,
    modalityCode: (testRecord.modalityId as string) || 'general-xray',
    modalityName: (testRecord.modalityName as string) || 'General X-Ray',
    fasyankesName: (testRecord.fasyankesName as string) || 'RS Unspecified',
    fasyankesAddress: (testRecord.fasyankesAddress as string) || 'Alamat Unspecified',
    fasyankesBapetenId: (testRecord.fasyankesBapetenId as string) || 'BAP-RS-9921',
    deviceBrand: (testRecord.brand as string) || '-',
    deviceModel: (testRecord.model as string) || '-',
    deviceSerialNumber: (testRecord.serialNumber as string) || '-',
    tubeSerialNumber: (testRecord.tubeSN as string) || '-',
    overallStatus: testRecord.overallStatus === 'LAIK' ? 'LAIK' : 'TIDAK_LAIK',
    testDate: (testRecord.testDate as string) || timestamp.split('T')[0],
    testerName: (testRecord.testerName as string) || userEmail,
    reviewerName: (testRecord.reviewerName as string) || 'Manajer Teknis UKES',
    approverName: (testRecord.approverName as string) || 'Kepala LUK',
    payloadVersion: 'KEPKA-3051-2024-V1',
    submittedBy: userEmail,
    reportingStatus: 'PENDING_SUBMISSION',
    auditTrailLogs: [
      {
        action: 'DRAFT_PAYLOAD_GENERATED',
        timestamp,
        actor: userEmail
      }
    ]
  };
}
