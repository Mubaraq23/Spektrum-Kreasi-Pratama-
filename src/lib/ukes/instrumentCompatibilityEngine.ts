// Instrument Compatibility Engine — Universal UKES Engine
// Checks compatibility between measuring instruments and selected radiology modality/parameters.

export interface InstrumentCompatibilityResult {
  isCompatible: boolean;
  warningMessage?: string;
  recommendedInstruments: string[];
}

export function checkInstrumentCompatibility(
  modalityId: string,
  instrumentName: string
): InstrumentCompatibilityResult {
  const nameLower = (instrumentName || '').toLowerCase();

  if (modalityId === 'ct-scan') {
    const hasCtPhantom = nameLower.includes('ctdi') || nameLower.includes('pencil') || nameLower.includes('catphan') || nameLower.includes('phantom');
    if (!hasCtPhantom) {
      return {
        isCompatible: false,
        warningMessage: 'PERINGATAN ALAT UKUR: Pengujian CT Scan memerlukan CTDI Phantom (16 cm Head / 32 cm Body) dan Dosimeter Pensil CT.',
        recommendedInstruments: ['RTI Piranha dengan CT Dose Profiler', 'Phantom CTDI Head/Body + Chamber Pensil 100mm']
      };
    }
  }

  if (modalityId === 'mammography') {
    const hasMammoSpec = nameLower.includes('mammo') || nameLower.includes('piranha') || nameLower.includes('compression');
    if (!hasMammoSpec) {
      return {
        isCompatible: false,
        warningMessage: 'PERINGATAN ALAT UKUR: Pengujian Mamografi memerlukan Detektor Khusus Mamografi (Target Mo/Rh/W) & Compression Force Gauge.',
        recommendedInstruments: ['RTI Piranha Mammo Detector', 'Mammography Compression Force Meter']
      };
    }
  }

  if (modalityId === 'fluoroscopy-carm' || modalityId === 'angiography-cathlab') {
    const hasDoseRate = nameLower.includes('dose rate') || nameLower.includes('piranha') || nameLower.includes('akr');
    if (!hasDoseRate) {
      return {
        isCompatible: false,
        warningMessage: 'PERINGATAN ALAT UKUR: Pengujian Fluoroskopi/Cath Lab memerlukan Pengukur Laju Dosis Tinggi (AKR Dose Rate Meter).',
        recommendedInstruments: ['RTI Piranha High Dose Rate Detector', 'Unfors RaySafe Dose Rate Meter']
      };
    }
  }

  return {
    isCompatible: true,
    recommendedInstruments: ['RTI Piranha Multi-meter', 'Unfors RaySafe Xi', 'Radcal Accu-Gold']
  };
}
