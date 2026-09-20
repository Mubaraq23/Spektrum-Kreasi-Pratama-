/**
 * Environmental Monitoring Engine — Spektrum Kreasi Pratama
 * Tracks ambient conditions (Temperature, Relative Humidity, Pressure) & issues excursion alerts.
 */

export interface EnvironmentalReading {
  timestamp: string;
  sensorId: string;
  sensorCalibrationDueDate: string;
  temperatureC: number;
  humidityPercent: number;
  pressureKpa?: number;
  locationRoom: string;
}

export interface EnvironmentalLimits {
  tempMinC: number;
  tempMaxC: number;
  humidityMinPercent: number;
  humidityMaxPercent: number;
}

export interface EnvironmentalEvaluationResult {
  compliant: boolean;
  excursionDetected: boolean;
  warnings: string[];
  evaluationNote: string;
}

export function evaluateEnvironmentalConditions(
  reading: EnvironmentalReading,
  limits: EnvironmentalLimits
): EnvironmentalEvaluationResult {
  const warnings: string[] = [];
  const now = new Date().toISOString().split('T')[0];

  // Sensor Calibration Validity Check
  if (reading.sensorCalibrationDueDate < now) {
    warnings.push(`PERINGATAN: Sensor Lingkungan (${reading.sensorId}) telah kedaluwarsa pada ${reading.sensorCalibrationDueDate}.`);
  }

  // Temperature Check
  if (reading.temperatureC < limits.tempMinC || reading.temperatureC > limits.tempMaxC) {
    warnings.push(`EKSKURSI SUHU: Suhu terukur ${reading.temperatureC}°C berada di luar batas (${limits.tempMinC}°C - ${limits.tempMaxC}°C).`);
  }

  // Humidity Check
  if (reading.humidityPercent < limits.humidityMinPercent || reading.humidityPercent > limits.humidityMaxPercent) {
    warnings.push(`EKSKURSI KELEMBABAN: Kelembaban terukur ${reading.humidityPercent}% RH berada di luar batas (${limits.humidityMinPercent}% - ${limits.humidityMaxPercent}% RH).`);
  }

  const compliant = warnings.length === 0;
  const excursionDetected = warnings.some(w => w.includes('EKSKURSI'));

  return {
    compliant,
    excursionDetected,
    warnings,
    evaluationNote: compliant
      ? `Kondisi lingkungan sesuai dengan persyaratan metode kerja (${reading.temperatureC}°C, ${reading.humidityPercent}% RH).`
      : `Kondisi lingkungan tidak memenuhi persyaratan. Memerlukan peninjauan Manajer Teknis.`
  };
}
