// Universal Radiology UKES Engine — Comprehensive Types & Interfaces
// Acuan: Perba BAPETEN 1/2025, Perba 2/2022, Perka 2/2018, Kepka 3051/2024

export type ModalityCategory = 
  | 'RADIOGRAFI'
  | 'DENTAL_RADIOGRAPHY'
  | 'MAMMOGRAPHY'
  | 'FLUOROSCOPY'
  | 'ANGIOGRAPHY_INTERVENTIONAL'
  | 'COMPUTED_TOMOGRAPHY'
  | 'SPECIAL_PROCEDURES';

export type MeasurementType = 
  | 'numeric'
  | 'categorical'
  | 'boolean'
  | 'image'
  | 'waveform'
  | 'table'
  | 'calculated';

export type ToleranceType = 
  | 'percentage' 
  | 'absolute' 
  | 'range' 
  | 'max_cv' 
  | 'max_linearity';

export interface EquipmentField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  placeholder?: string;
  defaultValue?: string | number | boolean;
  required: boolean;
  unit?: string;
  group: 'generator' | 'tube' | 'detector' | 'geometry' | 'special' | 'subsystem';
}

export interface InstrumentRequirement {
  typeId: string;
  typeName: string;
  description: string;
  mandatory: boolean;
  recommendedModels?: string[];
}

export interface DocumentRequirement {
  id: string;
  title: string;
  description: string;
  mandatory: boolean;
}

export interface EvidenceRequirement {
  id: string;
  title: string;
  description: string;
  type: 'photo' | 'dicom' | 'pdf' | 'waveform';
  mandatory: boolean;
}

export interface TestParameter {
  id: string;
  code: string;
  name: string;
  category: 'Eksposi' | 'Kualitas Berkas' | 'Geometri' | 'AEC' | 'Dosis' | 'Citra' | 'Keselamatan';
  unit: string;
  measurementType: MeasurementType;
  testConditions: string;
  defaultSetPoints: number[];
  numReadings: number;
  toleranceType: ToleranceType;
  toleranceMin?: number;
  toleranceMax?: number;
  maxCV?: number;
  maxLinearity?: number;
  formula: string;
  acceptanceRuleId: string;
  requiredInstrumentType: string;
  evidenceRequired: boolean;
  regulationReference: string;
  regulationVersion: string;
  description: string;
  isMandatory: boolean;
}

export interface ChecklistItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'Fisik' | 'Keselamatan' | 'Interlock' | 'Fungsi';
  isMandatory: boolean;
}

export interface RegulationReference {
  regulationId: string;
  regulationTitle: string;
  clause: string;
  effectiveDate: string;
}

export interface RadiologyModalityProfile {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  category: ModalityCategory;
  description: string;
  isConfigured: boolean;
  isCustom?: boolean;
  equipmentFields: EquipmentField[];
  parameters: TestParameter[];
  physicalChecklist: ChecklistItem[];
  radiationSafetyChecklist: ChecklistItem[];
  requiredDocuments: DocumentRequirement[];
  requiredEvidence: EvidenceRequirement[];
  requiredInstrumentTypes: InstrumentRequirement[];
  regulationReferences: RegulationReference[];
}
