// Versioned BAPETEN Regulation & Modality Evaluation Engine
import { DEFAULT_REGULATIONS, getActiveRegulation } from './masterConfigurationEngine';

export type UkesModality = 'Radiografi Umum' | 'Dental' | 'CT Scan' | 'Mammografi' | 'Fluoroskopi';

export interface UkesEvaluationResultItem {
  parameterCode: string;
  parameterName: string;
  measuredValue: number | string;
  setValue?: number | string;
  unit: string;
  status: 'PASS' | 'FAIL' | 'REQUIRES_CONFIGURATION_REVIEW' | 'NOT_TESTED';
  acceptanceCriteria: string;
  deviation: number;
  regulationVersion: string;
  sourceReference: string;
  evaluationNote: string;
}

export interface UkesModalityEvaluationReport {
  modality: UkesModality;
  regulationVersion: string;
  effectiveDate: string;
  sourceReference: string;
  parameters: UkesEvaluationResultItem[];
  kesimpulan: 'LOLOS UJI KESESUAIAN' | 'LOLOS BERSYARAT' | 'TIDAK LOLOS KESESUAIAN (Kritis)' | 'REQUIRES CONFIGURATION/REVIEW';
  criticalFailuresCount: number;
  conditionalFailuresCount: number;
  unverifiedParametersCount: number;
  evaluatedAt: string;
}

// Multi-Modality BAPETEN Limit Lookup Table (Versioned 2018 / 2022 / 2025)
export function evaluateModalityParameter(
  modality: UkesModality,
  parameterCode: string,
  setValue: number,
  measuredValues: number[],
  extraParams?: { sid?: number; misX?: number; misY?: number; hvl?: number; tubeLeakage?: number; ctdiVol?: number; mgd?: number },
  regulationCode: string = 'PERBA_BAPETEN_1_2025'
): UkesEvaluationResultItem {
  const regConfig = getActiveRegulation(regulationCode) || DEFAULT_REGULATIONS[0];
  const count = measuredValues.length;
  const mean = count > 0 ? measuredValues.reduce((a, b) => a + b, 0) / count : 0;

  // 1. Tegangan Tabung (kVp Accuracy)
  if (parameterCode === 'KVP_ACCURACY') {
    const devPct = setValue > 0 ? Math.abs((mean - setValue) / setValue) * 100 : 0;
    const limit = regulationCode.includes('2025') ? 10 : 10;
    const pass = devPct <= limit;

    return {
      parameterCode,
      parameterName: 'Akurasi Tegangan Tabung (kVp)',
      measuredValue: Number(mean.toFixed(2)),
      setValue,
      unit: 'kV',
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Deviasi <= ${limit}% (Ref: ${regConfig.sourceReference})`,
      deviation: Number(devPct.toFixed(2)),
      regulationVersion: regConfig.regulationCode,
      sourceReference: regConfig.sourceReference,
      evaluationNote: pass ? `Deviasi terukur ${devPct.toFixed(2)}% memenuhi kriteria.` : `Deviasi terukur ${devPct.toFixed(2)}% melebihi limit ${limit}%.`
    };
  }

  // 2. Waktu Penyinaran (Time Exposure Accuracy)
  if (parameterCode === 'TIME_ACCURACY') {
    const devPct = setValue > 0 ? Math.abs((mean - setValue) / setValue) * 100 : 0;
    const limit = 10;
    const pass = devPct <= limit;

    return {
      parameterCode,
      parameterName: 'Akurasi Waktu Penyinaran',
      measuredValue: Number(mean.toFixed(1)),
      setValue,
      unit: 'ms',
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Deviasi <= ${limit}% (Ref: ${regConfig.sourceReference})`,
      deviation: Number(devPct.toFixed(1)),
      regulationVersion: regConfig.regulationCode,
      sourceReference: regConfig.sourceReference,
      evaluationNote: pass ? `Akurasi waktu ${devPct.toFixed(1)}% memenuhi limit.` : `Akurasi waktu ${devPct.toFixed(1)}% melebihi limit.`
    };
  }

  // 3. Reproduksibilitas Dosis / Keluaran (CV)
  if (parameterCode === 'DOSE_CV') {
    let cvPct = 0;
    if (count > 1 && mean > 0) {
      const devSq = measuredValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0);
      const sd = Math.sqrt(devSq / (count - 1));
      cvPct = (sd / mean) * 100;
    }
    const maxCV = 5.0; // 5%
    const pass = cvPct <= maxCV;

    return {
      parameterCode,
      parameterName: 'Reproduksibilitas Keluaran Radiasi (CV)',
      measuredValue: Number(mean.toFixed(4)),
      setValue,
      unit: 'mGy',
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Koefisien Variasi CV <= ${maxCV}% (Ref: ${regConfig.sourceReference})`,
      deviation: Number(cvPct.toFixed(2)),
      regulationVersion: regConfig.regulationCode,
      sourceReference: regConfig.sourceReference,
      evaluationNote: pass ? `CV ${cvPct.toFixed(2)}% memenuhi limit ${maxCV}%.` : `CV ${cvPct.toFixed(2)}% melebihi limit ${maxCV}%.`
    };
  }

  // 4. Lapisan Paruh Aluminium (HVL)
  if (parameterCode === 'HVL_AL') {
    const hvlVal = extraParams?.hvl || Number(measuredValues[0]) || 0;
    let minHvl = 2.3;
    if (modality === 'Mammografi') minHvl = 0.3;
    else if (setValue <= 50) minHvl = 1.5;
    else if (setValue <= 70) minHvl = 2.3;
    else if (setValue <= 90) minHvl = 2.5;
    else if (setValue <= 110) minHvl = 3.0;
    else minHvl = 3.5;

    const pass = hvlVal >= minHvl;
    return {
      parameterCode,
      parameterName: 'Ketebalan Half-Value Layer (HVL)',
      measuredValue: hvlVal,
      setValue,
      unit: 'mm Al',
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `HVL >= ${minHvl} mm Al pada ${setValue} kVp`,
      deviation: Number((hvlVal - minHvl).toFixed(2)),
      regulationVersion: regConfig.regulationCode,
      sourceReference: regConfig.sourceReference,
      evaluationNote: pass ? `HVL ${hvlVal} mm Al memenuhi batas minimum ${minHvl} mm Al.` : `HVL ${hvlVal} mm Al DI BAWAH batas minimum ${minHvl} mm Al.`
    };
  }

  // 5. Keselarasan Berkas Kolimasi (SID Alignment)
  if (parameterCode === 'COLLIMATION_ALIGNMENT') {
    const sid = extraParams?.sid || 100;
    const misX = Math.abs(extraParams?.misX || 0);
    const misY = Math.abs(extraParams?.misY || 0);
    const pctX = sid > 0 ? (misX / sid) * 100 : 0;
    const pctY = sid > 0 ? (misY / sid) * 100 : 0;
    const totalPct = sid > 0 ? ((misX + misY) / sid) * 100 : 0;
    const limit = 2.0;
    const pass = pctX <= limit && pctY <= limit && totalPct <= limit;

    return {
      parameterCode,
      parameterName: 'Keselarasan Berkas Kolimasi dengan Lapangan Cahaya',
      measuredValue: `ΔX: ${misX}cm, ΔY: ${misY}cm`,
      setValue: sid,
      unit: '% SID',
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Misalignment X, Y, & Total <= ${limit}% SID`,
      deviation: Number(totalPct.toFixed(2)),
      regulationVersion: regConfig.regulationCode,
      sourceReference: regConfig.sourceReference,
      evaluationNote: pass ? `Misalignment total ${totalPct.toFixed(2)}% SID memenuhi limit ${limit}%.` : `Misalignment ${totalPct.toFixed(2)}% SID melebihi limit ${limit}%.`
    };
  }

  // 6. Kebocoran Wadah Tabung (Tube Leakage)
  if (parameterCode === 'TUBE_LEAKAGE') {
    const leakage = extraParams?.tubeLeakage || Number(measuredValues[0]) || 0;
    const limit = 1.0; // 1.0 mGy/hour at 1m
    const pass = leakage <= limit;

    return {
      parameterCode,
      parameterName: 'Kebocoran Wadah Tabung Sinar-X',
      measuredValue: leakage,
      setValue: 1.0,
      unit: 'mGy/jam @ 1m',
      status: pass ? 'PASS' : 'FAIL',
      acceptanceCriteria: `Kebocoran <= ${limit} mGy/jam pada jarak 1 m`,
      deviation: Number((leakage - limit).toFixed(2)),
      regulationVersion: regConfig.regulationCode,
      sourceReference: regConfig.sourceReference,
      evaluationNote: pass ? `Kebocoran ${leakage} mGy/jam memenuhi kriteria keselamatan.` : `Kebocoran ${leakage} mGy/jam MELEBIHI batas aman ${limit} mGy/jam.`
    };
  }

  // Fallback for unverified parameters
  return {
    parameterCode,
    parameterName: `Parameter Kustom (${parameterCode})`,
    measuredValue: mean,
    setValue,
    unit: 'N/A',
    status: 'REQUIRES_CONFIGURATION_REVIEW',
    acceptanceCriteria: 'Memerlukan Konfigurasi Regulasi Terverifikasi',
    deviation: 0,
    regulationVersion: regConfig.regulationCode,
    sourceReference: 'Unverified Reference',
    evaluationNote: 'Parameter ini belum terdaftar di Regulation Engine terkonfigurasi. REQUIRES CONFIGURATION/REVIEW.'
  };
}

// Master Modality Evaluator
export function evaluateFullUkesReport(
  modality: UkesModality,
  rawParams: {
    kvpSeting: number;
    kvpValues: number[];
    timeSeting: number;
    timeValues: number[];
    doseValues: number[];
    sidValue: number;
    misalignX: number;
    misalignY: number;
    hvlValue: number;
    tubeLeakage: number;
    ctdiVol?: number;
    mgd?: number;
  },
  regulationCode: string = 'PERBA_BAPETEN_1_2025'
): UkesModalityEvaluationReport {
  const regConfig = getActiveRegulation(regulationCode) || DEFAULT_REGULATIONS[0];
  const items: UkesEvaluationResultItem[] = [];

  // Evaluasi Parameter Utama
  items.push(evaluateModalityParameter(modality, 'KVP_ACCURACY', rawParams.kvpSeting, rawParams.kvpValues, {}, regulationCode));
  items.push(evaluateModalityParameter(modality, 'TIME_ACCURACY', rawParams.timeSeting, rawParams.timeValues, {}, regulationCode));
  items.push(evaluateModalityParameter(modality, 'DOSE_CV', rawParams.kvpSeting, rawParams.doseValues, {}, regulationCode));
  items.push(evaluateModalityParameter(modality, 'HVL_AL', rawParams.kvpSeting, [], { hvl: rawParams.hvlValue }, regulationCode));
  items.push(evaluateModalityParameter(modality, 'COLLIMATION_ALIGNMENT', rawParams.kvpSeting, [], { sid: rawParams.sidValue, misX: rawParams.misalignX, misY: rawParams.misalignY }, regulationCode));
  items.push(evaluateModalityParameter(modality, 'TUBE_LEAKAGE', rawParams.kvpSeting, [], { tubeLeakage: rawParams.tubeLeakage }, regulationCode));

  let criticalFailures = 0;
  let conditionalFailures = 0;
  let unverified = 0;

  items.forEach(item => {
    if (item.status === 'REQUIRES_CONFIGURATION_REVIEW') {
      unverified++;
    } else if (item.status === 'FAIL') {
      if (['KVP_ACCURACY', 'TIME_ACCURACY', 'DOSE_CV', 'TUBE_LEAKAGE'].includes(item.parameterCode)) {
        criticalFailures++;
      } else {
        conditionalFailures++;
      }
    }
  });

  let kesimpulan: 'LOLOS UJI KESESUAIAN' | 'LOLOS BERSYARAT' | 'TIDAK LOLOS KESESUAIAN (Kritis)' | 'REQUIRES CONFIGURATION/REVIEW' = 'LOLOS UJI KESESUAIAN';

  if (unverified > 0) {
    kesimpulan = 'REQUIRES CONFIGURATION/REVIEW';
  } else if (criticalFailures > 0) {
    kesimpulan = 'TIDAK LOLOS KESESUAIAN (Kritis)';
  } else if (conditionalFailures > 0) {
    kesimpulan = 'LOLOS BERSYARAT';
  }

  return {
    modality,
    regulationVersion: regConfig.regulationCode,
    effectiveDate: regConfig.effectiveDate,
    sourceReference: regConfig.sourceReference,
    parameters: items,
    kesimpulan,
    criticalFailuresCount: criticalFailures,
    conditionalFailuresCount: conditionalFailures,
    unverifiedParametersCount: unverified,
    evaluatedAt: new Date().toISOString()
  };
}
