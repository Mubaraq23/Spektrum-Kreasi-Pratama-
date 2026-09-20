/**
 * Master Medical Device & Test Method Registry — Spektrum Kreasi Pratama
 * Governs the strict traceability hierarchy:
 * Device Class -> Test Method (IK) -> Worksheet (LK) -> Measurements -> Calculations -> Review -> Certificate
 */

export interface MedicalDeviceClassDefinition {
  classId: string;
  categoryName: string;
  subCategory?: string;
  riskClass: 'CLASS_I' | 'CLASS_IIa' | 'CLASS_IIb' | 'CLASS_III'; // Kemenkes Risk Classification
  calibrationIntervalMonths: number;
  applicableIkCodes: string[];
  requiredCalibratorTypes: string[];
  minRepeatCount: number;
  environmentalLimits: {
    tempMinC: number;
    tempMaxC: number;
    rhMinPercent: number;
    rhMaxPercent: number;
  };
}

export const MASTER_DEVICE_CLASSES: MedicalDeviceClassDefinition[] = [
  {
    classId: 'DEV-CLS-DEF',
    categoryName: 'Defibrillator & Monitor Pasien',
    riskClass: 'CLASS_III', // High Risk Life Support
    calibrationIntervalMonths: 12,
    applicableIkCodes: ['IK-SPK-DEF-01', 'IK-SPK-MON-01'],
    requiredCalibratorTypes: ['DEFIBRILLATOR_ANALYZER', 'ECG_SIMULATOR', 'ELECTRICAL_SAFETY_ANALYZER'],
    minRepeatCount: 3,
    environmentalLimits: { tempMinC: 18, tempMaxC: 28, rhMinPercent: 30, rhMaxPercent: 75 }
  },
  {
    classId: 'DEV-CLS-MON',
    categoryName: 'Patient Monitor (ECG, NIBP, SpO2, Temp)',
    riskClass: 'CLASS_IIb',
    calibrationIntervalMonths: 12,
    applicableIkCodes: ['IK-SPK-MON-01'],
    requiredCalibratorTypes: ['PATIENT_SIMULATOR_MULTI', 'NIBP_SIMULATOR', 'SPO2_SIMULATOR'],
    minRepeatCount: 3,
    environmentalLimits: { tempMinC: 18, tempMaxC: 28, rhMinPercent: 30, rhMaxPercent: 75 }
  },
  {
    classId: 'DEV-CLS-SYR',
    categoryName: 'Syringe Pump & Infusion Pump',
    riskClass: 'CLASS_IIb',
    calibrationIntervalMonths: 12,
    applicableIkCodes: ['IK-SPK-SYR-01'],
    requiredCalibratorTypes: ['INFUSION_DEVICE_ANALYZER', 'DIGITAL_STOPWATCH'],
    minRepeatCount: 3,
    environmentalLimits: { tempMinC: 20, tempMaxC: 25, rhMinPercent: 40, rhMaxPercent: 70 }
  },
  {
    classId: 'DEV-CLS-INC',
    categoryName: 'Infant Incubator & Transport Incubator',
    riskClass: 'CLASS_III',
    calibrationIntervalMonths: 12,
    applicableIkCodes: ['IK-SPK-INC-01'],
    requiredCalibratorTypes: ['INCUBATOR_ANALYZER_MULTI_SENSOR', 'SOUND_LEVEL_METER'],
    minRepeatCount: 5,
    environmentalLimits: { tempMinC: 20, tempMaxC: 25, rhMinPercent: 40, rhMaxPercent: 65 }
  },
  {
    classId: 'DEV-CLS-RAD-GEN',
    categoryName: 'Pesawat Sinar-X Radiografi Umum',
    riskClass: 'CLASS_III',
    calibrationIntervalMonths: 12,
    applicableIkCodes: ['IK-SPK-RAD-01', 'IK-SPK-RAD-02'],
    requiredCalibratorTypes: ['RTI_PIRANHA_MULTI_METER', 'XRAY_LEAKAGE_DETECTOR', 'ALUMINUM_FILTER_SET'],
    minRepeatCount: 3,
    environmentalLimits: { tempMinC: 18, tempMaxC: 26, rhMinPercent: 30, rhMaxPercent: 70 }
  }
];

export function getDeviceClass(category: string): MedicalDeviceClassDefinition | undefined {
  return MASTER_DEVICE_CLASSES.find(cls => 
    cls.categoryName.toLowerCase().includes(category.toLowerCase()) ||
    category.toLowerCase().includes(cls.classId.toLowerCase())
  );
}
