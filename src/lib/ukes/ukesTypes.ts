// Digital UKES BAPETEN Platform — Comprehensive Types & Interfaces
// Acuan: Perba BAPETEN 1/2025, Perba 2/2022, Perka 2/2018, Perba 4/2020, PP 45/2023, Kepka 3051/2024

export type RegulatoryStatus = 'ACTIVE' | 'SUPERSEDED' | 'DRAFT' | 'REFERENCE_ONLY';

export type ModalityType =
  | 'RADIOGRAFI_UMUM'
  | 'RADIOGRAFI_MOBILE'
  | 'FLUOROSKOPI_INTERVENSIONAL'
  | 'CT_SCAN'
  | 'MAMMOGRAFI'
  | 'DENTAL_INTRAORAL'
  | 'DENTAL_PANORAMIK_CBCT'
  | 'CBCT_DENTAL'
  | 'DEXA_BONE'
  | 'ANGIOGRAPHY_CATHLAB';

export type TestParameterStatus =
  | 'PASS'
  | 'FAIL'
  | 'NOT_TESTED'
  | 'NOT_APPLICABLE'
  | 'CONFIGURATION_REQUIRED'
  | 'REVIEW_REQUIRED'
  | 'INVALID_DATA';

export type WorkflowStatus =
  | 'DRAFT'
  | 'DEVICE_VERIFICATION'
  | 'EQUIPMENT_VERIFICATION'
  | 'TEST_PREPARATION'
  | 'MEASUREMENT'
  | 'DATA_VALIDATION'
  | 'CALCULATION'
  | 'REGULATORY_EVALUATION'
  | 'WAITING_TA_REVIEW'
  | 'RETURNED_FOR_CORRECTION'
  | 'APPROVED'
  | 'FINAL_LOCKED'
  | 'CERTIFICATE_ISSUED';

export interface BapetenRegulationReference {
  regulationId: string;
  regulationNumber: string;
  title: string;
  version: string;
  effectiveDate: string;
  supersededDate?: string;
  status: RegulatoryStatus;
  sourceDocument: string;
  legalBasis: string[]; // e.g. 'PP No. 45/2023', 'Perba 1/2025'
  officialDisclaimer: string;
}

export interface AcceptanceCriterion {
  criterionId: string;
  regulationId: string;
  version: string;
  modality: ModalityType;
  parameterCode: string;
  parameterName: string;
  isCritical: boolean;
  unit: string;
  operator: '<=' | '>=' | '<' | '>' | 'BETWEEN' | 'EQUAL_TO' | 'CV_LESS_EQUAL';
  thresholdValue: number;
  maxThresholdValue?: number; // for BETWEEN
  articleReference: string;
  annexReference: string;
  sourceDocument: string;
  notes?: string;
}

export interface UkesDeviceIdentity {
  deviceId: string;
  facilityName: string;
  roomName: string;
  modality: ModalityType;
  manufacturer: string;
  model: string;
  serialNumber: string;
  tubeSerialNumber: string;
  generatorInfo: string;
  detectorInfo: string;
  installationYear: number;
  bapetenLicenseNumber: string;
  focalSpotSize?: string;
}

export interface UkesDetectorEquipment {
  equipmentId: string;
  name: string;
  brand: string;
  model: string;
  serialNumber: string;
  certificateNumber: string;
  calibrationDate: string;
  dueDate: string;
  calibrationLaboratory: string;
  uncertaintyCert?: number;
  coverageFactorK?: number;
  validityStatus: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED' | 'MISSING_CERTIFICATE';
}

export interface UkesRawMeasurement {
  parameterCode: string;
  parameterName: string;
  unit: string;
  settingValues: number[];
  measuredValues: number[];
  timestamps: string[];
}

export interface UkesCalculatedParameter {
  parameterCode: string;
  parameterName: string;
  unit: string;
  settingValue: number;
  meanMeasuredValue: number;
  deviation: number;
  percentageError: number;
  standardDeviation: number;
  coefficientOfVariation: number;
  calculationCode: string;
  formulaVersion: string;
  status: TestParameterStatus;
  criterion?: AcceptanceCriterion;
  statusMessage: string;
}

export interface UkesValidationReport {
  isValid: boolean;
  checkedAt: string;
  checks: {
    regulationConfigValid: boolean;
    modalityProfileValid: boolean;
    calculationFormulaValid: boolean;
    acceptanceCriteriaValid: boolean;
    detectorEquipmentValid: boolean;
    rawDataAvailable: boolean;
    unitNormalized: boolean;
    requiredEvidenceAvailable: boolean;
    reviewerAvailable: boolean;
  };
  warnings: string[];
  blockingErrors: string[];
}

export interface UkesAuditRecord {
  auditId: string;
  testSessionId: string;
  timestamp: string;
  userId: string;
  userRole: string;
  action: string;
  entityName: string;
  entityId: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  recordHash: string;
}

export interface UkesEvidenceItem {
  evidenceId: string;
  testSessionId: string;
  category: 'DEVICE_PHOTO' | 'SETUP_PHOTO' | 'PIRANHA_SCREENSHOT' | 'RAW_DETECTOR_FILE' | 'CALIBRATION_CERTIFICATE';
  description: string;
  fileUrl: string;
  fileHash: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface UkesTestSession {
  sessionId: string;
  sessionNumber: string;
  regulationVersionId: string;
  device: UkesDeviceIdentity;
  detector: UkesDetectorEquipment;
  workflowStatus: WorkflowStatus;
  rawMeasurements: UkesRawMeasurement[];
  calculatedParameters: UkesCalculatedParameter[];
  systemAggregateDecision: 'LOLOS_UJI_KESESUAIAN' | 'LOLOS_BERSYARAT' | 'TIDAK_LOLOS_KESESUAIAN' | 'CONFIGURATION_REQUIRED';
  validationReport: UkesValidationReport;
  reviewerId?: string;
  reviewerNotes?: string;
  approvedAt?: string;
  recordHash: string;
  qrVerificationToken: string;
  createdAt: string;
  updatedAt: string;
}
