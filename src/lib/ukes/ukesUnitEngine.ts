// Digital UKES Unit Normalization & Ambiguity Detection Engine — Spektrum CalibraPro

export interface UnitNormalizationResult {
  originalValue: number;
  originalUnit: string;
  normalizedValue: number;
  normalizedUnit: string;
  status: 'NORMALIZED' | 'UNIT_REVIEW_REQUIRED';
  conversionFactor: number;
  notes: string;
}

export function normalizeUkesUnit(value: number, rawUnit: string, targetParameterCode: string): UnitNormalizationResult {
  const cleanUnit = rawUnit.trim().toLowerCase();

  // Time Exposure Normalization (seconds to milliseconds)
  if (targetParameterCode.includes('TIME')) {
    if (cleanUnit === 's' || cleanUnit === 'sec' || cleanUnit === 'detik') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value * 1000,
        normalizedUnit: 'ms',
        status: 'NORMALIZED',
        conversionFactor: 1000,
        notes: 'Konversi dari Detik (s) ke Milidetik (ms).'
      };
    }
    if (cleanUnit === 'ms' || cleanUnit === 'msec') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value,
        normalizedUnit: 'ms',
        status: 'NORMALIZED',
        conversionFactor: 1.0,
        notes: 'Satuan sudah terstandar Milidetik (ms).'
      };
    }
  }

  // Dose Normalization (Gy to mGy, µGy to mGy)
  if (targetParameterCode.includes('DOSE') || targetParameterCode.includes('CTDI')) {
    if (cleanUnit === 'gy') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value * 1000,
        normalizedUnit: 'mGy',
        status: 'NORMALIZED',
        conversionFactor: 1000,
        notes: 'Konversi dari Gray (Gy) ke MilliGray (mGy).'
      };
    }
    if (cleanUnit === 'ugy' || cleanUnit === 'µgy') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value / 1000,
        normalizedUnit: 'mGy',
        status: 'NORMALIZED',
        conversionFactor: 0.001,
        notes: 'Konversi dari MicroGray (µGy) ke MilliGray (mGy).'
      };
    }
    if (cleanUnit === 'mgy') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value,
        normalizedUnit: 'mGy',
        status: 'NORMALIZED',
        conversionFactor: 1.0,
        notes: 'Satuan sudah terstandar MilliGray (mGy).'
      };
    }
  }

  // Voltage Normalization (V to kV)
  if (targetParameterCode.includes('KVP') || targetParameterCode.includes('VOLTAGE')) {
    if (cleanUnit === 'v' || cleanUnit === 'volt') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value / 1000,
        normalizedUnit: 'kV',
        status: 'NORMALIZED',
        conversionFactor: 0.001,
        notes: 'Konversi dari Volt (V) ke KiloVolt (kV).'
      };
    }
    if (cleanUnit === 'kv' || cleanUnit === 'kvp') {
      return {
        originalValue: value,
        originalUnit: rawUnit,
        normalizedValue: value,
        normalizedUnit: 'kV',
        status: 'NORMALIZED',
        conversionFactor: 1.0,
        notes: 'Satuan sudah terstandar KiloVolt (kV).'
      };
    }
  }

  // Default passthrough if unit matches expected standard
  if (cleanUnit === 'mm al' || cleanUnit === '%' || cleanUnit === 'mgy/h' || cleanUnit === 'ratio') {
    return {
      originalValue: value,
      originalUnit: rawUnit,
      normalizedValue: value,
      normalizedUnit: rawUnit,
      status: 'NORMALIZED',
      conversionFactor: 1.0,
      notes: 'Satuan terverifikasi.'
    };
  }

  // Unit Ambiguity Alert
  return {
    originalValue: value,
    originalUnit: rawUnit,
    normalizedValue: value,
    normalizedUnit: rawUnit,
    status: 'UNIT_REVIEW_REQUIRED',
    conversionFactor: 1.0,
    notes: `Satuan mentah '${rawUnit}' membutuhkan peninjauan manual oleh Tenaga Ahli (TA).`
  };
}
