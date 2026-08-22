// KAN Scope Matrix Validation Engine — Spektrum CalibraPro (LK-291-IDN & LP-1849-IDN)

export interface KANScopeItem {
  id: string;
  accreditationNumber: string; // 'LK-291-IDN' | 'LP-1849-IDN'
  scopeVersion: string;
  instrumentName: string;
  parameterName: string;
  measurementRange: string;
  minVal: number;
  maxVal: number;
  cmcValue: number;
  cmcUnit: string;
  methodReference: string;
  status: 'ACTIVE' | 'SUPERSEDED';
}

export const KAN_SCOPE_CATALOG: KANScopeItem[] = [
  {
    id: 'kan-scope-ekg-01',
    accreditationNumber: 'LK-291-IDN',
    scopeVersion: '2024.1',
    instrumentName: 'Elektrokardiograf (EKG)',
    parameterName: 'Laju Jantung (Heart Rate)',
    measurementRange: '30 BPM s/d 240 BPM',
    minVal: 30,
    maxVal: 240,
    cmcValue: 0.25,
    cmcUnit: 'BPM',
    methodReference: 'IK-EKG-KAN-01',
    status: 'ACTIVE'
  },
  {
    id: 'kan-scope-infusion-01',
    accreditationNumber: 'LK-291-IDN',
    scopeVersion: '2024.1',
    instrumentName: 'Infusion Pump / Syringe Pump',
    parameterName: 'Laju Alir (Flow Rate)',
    measurementRange: '1 mL/h s/d 999 mL/h',
    minVal: 1,
    maxVal: 999,
    cmcValue: 0.12,
    cmcUnit: 'mL/h',
    methodReference: 'IK-INF-KAN-02',
    status: 'ACTIVE'
  },
  {
    id: 'kan-scope-defib-01',
    accreditationNumber: 'LK-291-IDN',
    scopeVersion: '2024.1',
    instrumentName: 'Defibrillator',
    parameterName: 'Energi Kejutan (Energy Output)',
    measurementRange: '2 Joule s/d 360 Joule',
    minVal: 2,
    maxVal: 360,
    cmcValue: 0.45,
    cmcUnit: 'Joule',
    methodReference: 'IK-DEFIB-KAN-03',
    status: 'ACTIVE'
  }
];

export function validateKANScopeApplicability(
  instrumentName: string,
  parameterName: string,
  measuredValue: number
): {
  isInScope: boolean;
  scopeItem?: KANScopeItem;
  statusLabel: 'IN_CONFIGURED_SCOPE' | 'OUT_OF_CONFIGURED_SCOPE';
  message: string;
} {
  const match = KAN_SCOPE_CATALOG.find(s => 
    s.status === 'ACTIVE' &&
    instrumentName.toLowerCase().includes(s.instrumentName.toLowerCase().split(' ')[0]) &&
    measuredValue >= s.minVal && measuredValue <= s.maxVal
  );

  if (match) {
    return {
      isInScope: true,
      scopeItem: match,
      statusLabel: 'IN_CONFIGURED_SCOPE',
      message: `Pengukuran berada dalam Lingkup Akreditasi KAN ${match.accreditationNumber} (CMC: ${match.cmcValue} ${match.cmcUnit}).`
    };
  }

  return {
    isInScope: false,
    statusLabel: 'OUT_OF_CONFIGURED_SCOPE',
    message: 'Pengukuran berada di LUR LINGKUP Akreditasi KAN terkonfigurasi. (Status: Non-Accredited / Internal).'
  };
}
