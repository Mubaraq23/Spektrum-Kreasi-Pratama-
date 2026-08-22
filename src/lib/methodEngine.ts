// Method-Driven Metrology Master Engine — Spektrum CalibraPro

export interface MethodParameterConfig {
  parameterCode: string;
  parameterName: string;
  unit: string;
  defaultRepeatCount: number;
  nominalSetting: number;
  toleranceMin?: number;
  toleranceMax?: number;
  maxAllowedError?: number;
  isMandatory: boolean;
}

export interface UncertaintySourceConfig {
  id: string;
  name: string;
  type: 'TYPE_A' | 'TYPE_B';
  distribution: 'NORMAL' | 'RECTANGULAR' | 'TRIANGULAR' | 'U_SHAPED';
  divisor: number;
  sensitivityCoefficient: number;
  degreesOfFreedom: number;
  sourceReference: string;
}

export interface MethodConfig {
  methodId: string;
  methodCode: string; // e.g. 'MK-EKG-01', 'MK-INFUSION-02', 'MK-DEFIB-03', 'MK-THERMO-01'
  methodName: string;
  version: string;
  revision: number;
  effectiveDate: string;
  reference: string;
  applicableDeviceType: string;
  parameters: MethodParameterConfig[];
  measurementModel: 'ERROR_UUT_MINUS_STD' | 'RATIO_UUT_STD' | 'DEVIATION_PERCENTAGE';
  uncertaintySources: UncertaintySourceConfig[];
  acceptanceCriteria: string;
  decisionRule: 'SIMPLE_ACCEPTANCE' | 'GUARD_BANDED_ACCEPTANCE' | 'TOLERANCE_BOUNDED';
  approvalStatus: 'DRAFT' | 'TECHNICAL_REVIEW' | 'APPROVED' | 'ACTIVE';
  scopeApplicability: 'KAN_ACCREDITED' | 'NON_ACCREDITED_INTERNAL';
  createdAt: string;
  updatedAt: string;
}

// Master Methods Catalog Seed
export const DEFAULT_MASTER_METHODS: MethodConfig[] = [
  {
    methodId: 'method-ekg-01',
    methodCode: 'MK-EKG-01',
    methodName: 'Metode Kalibrasi Elektrokardiograf (EKG)',
    version: '2.0',
    revision: 1,
    effectiveDate: '2024-01-01',
    reference: 'IK-EKG-KAN-01 / KAN LK-291-IDN',
    applicableDeviceType: 'Electrocardiograph (EKG)',
    parameters: [
      { parameterCode: 'HR_30', parameterName: 'Laju Jantung 30 BPM', unit: 'BPM', defaultRepeatCount: 5, nominalSetting: 30, maxAllowedError: 1, isMandatory: true },
      { parameterCode: 'HR_60', parameterName: 'Laju Jantung 60 BPM', unit: 'BPM', defaultRepeatCount: 5, nominalSetting: 60, maxAllowedError: 2, isMandatory: true },
      { parameterCode: 'HR_120', parameterName: 'Laju Jantung 120 BPM', unit: 'BPM', defaultRepeatCount: 5, nominalSetting: 120, maxAllowedError: 3, isMandatory: true },
      { parameterCode: 'AMP_1MV', parameterName: 'Amplitudo 1 mV', unit: 'mV', defaultRepeatCount: 5, nominalSetting: 1.0, maxAllowedError: 0.05, isMandatory: true }
    ],
    measurementModel: 'ERROR_UUT_MINUS_STD',
    uncertaintySources: [
      { id: 'u_a', name: 'Repeatability Daya Ulang (Type A)', type: 'TYPE_A', distribution: 'NORMAL', divisor: 1, sensitivityCoefficient: 1.0, degreesOfFreedom: 4, sourceReference: 'Measurement Repeats' },
      { id: 'u_b1', name: 'Ketidakpastian Kalibrator Standar', type: 'TYPE_B', distribution: 'NORMAL', divisor: 2.0, sensitivityCoefficient: 1.0, degreesOfFreedom: 50, sourceReference: 'Sertifikat Kalibrator' },
      { id: 'u_b2', name: 'Resolusi Display UUT', type: 'TYPE_B', distribution: 'RECTANGULAR', divisor: 1.732, sensitivityCoefficient: 1.0, degreesOfFreedom: 100, sourceReference: 'Spesifikasi Pabrik' },
      { id: 'u_b3', name: 'Drift Standar Simulator', type: 'TYPE_B', distribution: 'RECTANGULAR', divisor: 1.732, sensitivityCoefficient: 1.0, degreesOfFreedom: 50, sourceReference: 'Rekam Drift' }
    ],
    acceptanceCriteria: 'Deviasi Laju Jantung <= ± 5%, Amplitudo <= ± 5%',
    decisionRule: 'GUARD_BANDED_ACCEPTANCE',
    approvalStatus: 'APPROVED',
    scopeApplicability: 'KAN_ACCREDITED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    methodId: 'method-infusion-02',
    methodCode: 'MK-INFUSION-02',
    methodName: 'Metode Kalibrasi Infusion Pump & Syringe Pump',
    version: '1.5',
    revision: 2,
    effectiveDate: '2024-03-15',
    reference: 'IK-INF-KAN-02 / KAN LK-291-IDN',
    applicableDeviceType: 'Infusion Pump',
    parameters: [
      { parameterCode: 'FLOW_10', parameterName: 'Laju Alir 10 mL/jam', unit: 'mL/h', defaultRepeatCount: 3, nominalSetting: 10.0, maxAllowedError: 0.5, isMandatory: true },
      { parameterCode: 'FLOW_50', parameterName: 'Laju Alir 50 mL/jam', unit: 'mL/h', defaultRepeatCount: 3, nominalSetting: 50.0, maxAllowedError: 2.5, isMandatory: true },
      { parameterCode: 'FLOW_100', parameterName: 'Laju Alir 100 mL/jam', unit: 'mL/h', defaultRepeatCount: 3, nominalSetting: 100.0, maxAllowedError: 5.0, isMandatory: true }
    ],
    measurementModel: 'DEVIATION_PERCENTAGE',
    uncertaintySources: [
      { id: 'u_a', name: 'Daya Repeatability Laju Alir', type: 'TYPE_A', distribution: 'NORMAL', divisor: 1, sensitivityCoefficient: 1.0, degreesOfFreedom: 2, sourceReference: 'Pengulangan' },
      { id: 'u_b1', name: 'Ketidakpastian Standar IDA-5', type: 'TYPE_B', distribution: 'NORMAL', divisor: 2.0, sensitivityCoefficient: 1.0, degreesOfFreedom: 50, sourceReference: 'Sertifikat Fluke IDA' },
      { id: 'u_b2', name: 'Resolusi Alat UUT', type: 'TYPE_B', distribution: 'RECTANGULAR', divisor: 1.732, sensitivityCoefficient: 1.0, degreesOfFreedom: 100, sourceReference: 'Display UUT' }
    ],
    acceptanceCriteria: 'Deviasi Laju Alir <= ± 5.0%',
    decisionRule: 'SIMPLE_ACCEPTANCE',
    approvalStatus: 'APPROVED',
    scopeApplicability: 'KAN_ACCREDITED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export function getMethodByCode(methodCode: string): MethodConfig | undefined {
  return DEFAULT_MASTER_METHODS.find(m => m.methodCode === methodCode);
}
