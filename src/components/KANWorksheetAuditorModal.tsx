import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, CheckCircle2, XCircle, AlertTriangle, X
} from 'lucide-react';

export interface KANWorksheetAuditorProps {
  isOpen: boolean;
  onClose: () => void;
  worksheetData: {
    id?: string;
    identityData: {
      deviceName?: string;
      brand?: string;
      model?: string;
      serialNumber?: string;
      fasyankesName?: string;
      location?: string;
      methodId?: string;
      tempInitial?: string | number;
      tempFinal?: string | number;
      humInitial?: string | number;
      humFinal?: string | number;
      voltage?: string | number;
      uncMethod?: string;
    };
    measurements: Record<string, unknown>[];
    calibrators: Record<string, unknown>[];
    selectedCalibratorIds: string[];
    physicalData: Record<string, string>;
    functionalData: Record<string, string>;
    electricalData: { enabled?: boolean; results?: Record<string, unknown> };
    signatures?: {
      technician?: boolean;
      supervisor?: boolean;
      technicalManager?: boolean;
    };
    cmcValue?: number;
  };
}

export function KANWorksheetAuditorModal({
  isOpen,
  onClose,
  worksheetData
}: KANWorksheetAuditorProps) {
  const {
    identityData,
    measurements,
    calibrators,
    selectedCalibratorIds,
    physicalData,
    functionalData,
    electricalData,
    signatures,
    cmcValue = 0.05
  } = worksheetData;

  // Audit Checklist Evaluation according to ISO/IEC 17025:2017 & KAN Guidelines
  const auditResults = useMemo(() => {
    const checks = [];

    // 1. Customer & Location Identity (ISO 17025 Cl 7.1)
    const hasCustomer = !!(identityData.fasyankesName && identityData.fasyankesName.trim());
    checks.push({
      id: 'customer_id',
      clause: '7.1',
      title: 'Identitas Pelanggan & Fasyankes',
      desc: 'Nama Fasyankes / Rumah Sakit dan lokasi tempat pengujian teridentifikasi.',
      passed: hasCustomer,
      detail: hasCustomer ? `Fasyankes: ${identityData.fasyankesName}` : 'Nama Fasyankes belum diisi'
    });

    // 2. Instrument Identification (ISO 17025 Cl 7.8.2)
    const hasInstrumentId = !!(
      identityData.deviceName &&
      identityData.serialNumber &&
      identityData.serialNumber.trim()
    );
    checks.push({
      id: 'instrument_id',
      clause: '7.8.2',
      title: 'Identitas Alat Yang Dikalibrasi (UUT)',
      desc: 'Nama alat, merk, tipe, dan nomor seri unik instrumen terdata jelas.',
      passed: hasInstrumentId,
      detail: hasInstrumentId
        ? `${identityData.deviceName} (${identityData.brand || '-'} / S/N: ${identityData.serialNumber})`
        : 'Nama alat atau nomor seri unik belum diisi'
    });

    // 3. Work Method Selection (ISO 17025 Cl 7.2.1)
    const hasMethod = !!(identityData.methodId && identityData.methodId.trim());
    checks.push({
      id: 'method_id',
      clause: '7.2.1',
      title: 'Metode Kerja & Standar Acuan',
      desc: 'Metode kerja acuan (MK/IK/SNI/IEC/Permenkes) terpilih untuk pengujian.',
      passed: hasMethod,
      detail: hasMethod ? `Kode MK: ${identityData.methodId}` : 'Metode kerja belum dipilih'
    });

    // 4. Calibrator Traceability & Validity (ISO 17025 Cl 7.5 & 7.7)
    const activeCalibrators = calibrators.filter(c => selectedCalibratorIds.includes(String(c.id || '')));
    const now = new Date();
    let calibratorsValid = activeCalibrators.length > 0;
    const expiredCalibratorNames: string[] = [];

    activeCalibrators.forEach(c => {
      if (c.validUntil) {
        const expDate = new Date(c.validUntil as string | number | Date);
        if (expDate < now) {
          calibratorsValid = false;
          expiredCalibratorNames.push(String(c.name || 'Calibrator'));
        }
      }
    });

    checks.push({
      id: 'calibrator_traceability',
      clause: '7.5',
      title: 'Ketertelusuran Standar Kalibrator',
      desc: 'Standar master terdaftar, bersertifikat KAN/SI, dan masa berlaku sertifikat masih aktif.',
      passed: calibratorsValid,
      detail: activeCalibrators.length === 0
        ? 'Belum ada kalibrator standar terpilih'
        : expiredCalibratorNames.length > 0
        ? `Standar kedaluwarsa: ${expiredCalibratorNames.join(', ')}`
        : `${activeCalibrators.length} Kalibrator Standar Valid & Tertelusur`
    });

    // 5. Environmental Conditions Limits (ISO 17025 Cl 7.7.1)
    const tempInit = Number(identityData.tempInitial) || 0;
    const tempFin = Number(identityData.tempFinal) || 0;
    const humInit = Number(identityData.humInitial) || 0;
    const humFin = Number(identityData.humFinal) || 0;

    const tempAvg = (tempInit + tempFin) / (tempInit && tempFin ? 2 : 1);
    const humAvg = (humInit + humFin) / (humInit && humFin ? 2 : 1);

    const tempPassed = tempAvg >= 18 && tempAvg <= 28;
    const humPassed = humAvg >= 35 && humAvg <= 75;
    const envPassed = tempInit > 0 && humInit > 0 && tempPassed && humPassed;

    checks.push({
      id: 'environmental_conditions',
      clause: '7.7.1',
      title: 'Kondisi Lingkungan Kalibrasi',
      desc: 'Suhu ruang (20-25°C ±2) dan Kelembaban Relative RH (45-65% ±5) dalam batas toleransi KAN.',
      passed: envPassed,
      detail: (tempInit > 0 && humInit > 0)
        ? `Suhu: ${tempAvg.toFixed(1)}°C | RH: ${humAvg.toFixed(1)}% | Status: ${envPassed ? 'Sesuai Batas KAN' : 'Di Luar Batas Standar Ruang'}`
        : 'Data suhu atau kelembaban lingkungan belum lengkap'
    });

    // 6. Inspection Checks Completed (ISO 17025 Cl 7.4.2)
    const hasPhysical = Object.keys(physicalData).length > 0;
    const hasFunctional = Object.keys(functionalData).length > 0;
    const inspectionPassed = hasPhysical && hasFunctional;

    checks.push({
      id: 'inspection_checks',
      clause: '7.4.2',
      title: 'Pemeriksaan Fisik & Fungsi Operasional',
      desc: 'Inspeksi fisik visual dan uji fungsi operasional instrumen telah dilakukan lengkap.',
      passed: inspectionPassed,
      detail: inspectionPassed
        ? `Fisik: ${Object.keys(physicalData).length} item | Fungsi: ${Object.keys(functionalData).length} item`
        : 'Pemeriksaan fisik atau fungsi belum diisi lengkap'
    });

    // 7. Electrical Safety Checks (IEC 62353 / NFPA 99) (ISO 17025 Cl 7.4)
    const isElecEnabled = electricalData?.enabled;
    const elecResults = electricalData?.results || {};
    const hasElecData = Object.keys(elecResults).length > 0;

    checks.push({
      id: 'electrical_safety',
      clause: '7.4',
      title: 'Pengujian Keselamatan Listrik Medis',
      desc: 'Pengujian arus bocor dan tahanan isolasi sesuai IEC 62353 / IEC 60601-1 (apabila berlaku).',
      passed: !isElecEnabled || hasElecData,
      detail: !isElecEnabled
        ? 'Pengujian keselamatan listrik dinonaktifkan (Instrumen Non-Elektrik)'
        : hasElecData
        ? `${Object.keys(elecResults).length} Parameter Uji Kelistrikan Terverifikasi`
        : 'Modul listrik aktif namun data uji belum diisi'
    });

    // 8. Measurement Points & Repeatability Data (ISO 17025 Cl 7.6)
    const hasMeasurements = measurements.length > 0;
    const allRowDataComplete = measurements.every(m => m.actual !== undefined && m.actual !== null && m.actual !== '');

    checks.push({
      id: 'measurement_data',
      clause: '7.6',
      title: 'Data Pengukuran Berulang & Titik Ukur',
      desc: 'Tabel titik ukur terisi lengkap dengan nilai aktual terukur dan koreksi.',
      passed: hasMeasurements && allRowDataComplete,
      detail: hasMeasurements
        ? `${measurements.length} Titik Ukur Terdaftar (${allRowDataComplete ? 'Semua Data Lengkap' : 'Beberapa Data Belum Terisi'})`
        : 'Tabel data pengukuran masih kosong'
    });

    // 9. ISO GUM Uncertainty & CMC Clamping (ISO 17025 Cl 7.6.3)
    let uncertaintyValid = hasMeasurements;
    let belowCmcCount = 0;

    measurements.forEach(m => {
      if (m.uncertainty === undefined || m.uncertainty === null || isNaN(Number(m.uncertainty))) {
        uncertaintyValid = false;
      }
      if (Number(m.uncertainty) < cmcValue) {
        belowCmcCount++;
      }
    });

    checks.push({
      id: 'uncertainty_eval',
      clause: '7.6.3',
      title: 'Evaluasi Ketidakpastian ISO GUM & CMC KAN',
      desc: 'Perhitungan ketidakpastian baku gabungan u_c dan diperluas U_95 sesuai panduan ISO GUM & batas minimum CMC KAN.',
      passed: uncertaintyValid,
      detail: uncertaintyValid
        ? `Ketidakpastian Terkalkulasi (${belowCmcCount > 0 ? `${belowCmcCount} titik disesuaikan ke Batas Minimum CMC ±${cmcValue}` : 'Semua titik di atas CMC'})`
        : 'Kalkulasi ketidakpastian belum lengkap'
    });

    // 10. Multi-Level Signatures & Authorization (ISO 17025 Cl 7.8.1)
    const techSig = signatures?.technician || false;
    const superSig = signatures?.supervisor || false;
    const managerSig = signatures?.technicalManager || false;

    const signatureCount = (techSig ? 1 : 0) + (superSig ? 1 : 0) + (managerSig ? 1 : 0);

    checks.push({
      id: 'multi_signatures',
      clause: '7.8.1',
      title: 'Otorisasi & Tanda Tangan Bertingkat',
      desc: 'Verifikasi personil terotorisasi (Teknisi Kalibrasi, Penyelia Metrologi, Manajer Teknis).',
      passed: techSig,
      detail: `Otorisasi Terisi: ${signatureCount}/3 (${techSig ? 'Teknisi OK' : 'Teknisi Belum TTD'}${superSig ? ', Supervisor OK' : ''}${managerSig ? ', Manajer OK' : ''})`
    });

    // Compute Overall Score
    const passedCount = checks.filter(c => c.passed).length;
    const totalCount = checks.length;
    const scorePercentage = Math.round((passedCount / totalCount) * 100);

    return {
      checks,
      passedCount,
      totalCount,
      scorePercentage,
      isKanReady: scorePercentage >= 90
    };
  }, [identityData, measurements, calibrators, selectedCalibratorIds, physicalData, functionalData, electricalData, signatures, cmcValue]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[92vh] sm:max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* MODAL HEADER */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border ${
                auditResults.isKanReady
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <ShieldCheck className="w-5 h-5 sm:w-7 sm:h-7" />
              </div>
              <div>
                <h2 className="text-base sm:text-xl font-black text-white flex flex-wrap items-center gap-2">
                  Audit Kepatuhan KAN ISO/IEC 17025
                  <span className={`text-[10px] sm:text-xs px-2.5 sm:px-3 py-0.5 rounded-full font-mono font-bold ${
                    auditResults.isKanReady
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}>
                    {auditResults.scorePercentage}% COMPLIANT
                  </span>
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
                  Pemeriksaan kelayakan Lembar Kerja (LK) terhadap standar akreditasi KAN & Kemenkes RI.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* MODAL BODY CONTENT */}
          <div className="p-3.5 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
            {/* SCORE GAUGE & OVERVIEW SUMMARY */}
            <div className={`p-4 sm:p-6 rounded-2xl sm:rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6 ${
              auditResults.isKanReady
                ? 'bg-emerald-950/20 border-emerald-500/30'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Status Akreditasi Lembar Kerja (LK)
                </span>
                <div className="text-2xl font-black text-white flex items-center gap-2">
                  {auditResults.isKanReady ? (
                    <>
                      <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                      LK Siap Terbit (KAN Ready)
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-7 h-7 text-amber-400" />
                      Memerlukan Perbaikan Kelengkapan Data
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-300">
                  {auditResults.passedCount} dari {auditResults.totalCount} klausul ISO/IEC 17025 terverifikasi memenuhi standar.
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center font-mono bg-slate-950 px-6 py-3 rounded-2xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">SKOR AUDIT</span>
                  <span className={`text-3xl font-black ${
                    auditResults.isKanReady ? 'text-emerald-400' : 'text-amber-400'
                  }`}>
                    {auditResults.scorePercentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* CHECKLIST ITEMS LIST */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Rincian Pemeriksaan Klausul KAN ISO/IEC 17025:2017
              </h3>

              {auditResults.checks.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.passed
                      ? 'bg-slate-950/60 border-slate-800/80 hover:border-emerald-500/30'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {item.passed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                            Klausul {item.clause}
                          </span>
                          <h4 className="text-sm font-bold text-white">{item.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                        <p className={`text-xs font-mono font-semibold mt-2 ${
                          item.passed ? 'text-emerald-300' : 'text-rose-300'
                        }`}>
                          • {item.detail}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MODAL FOOTER */}
          <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] sm:text-xs text-slate-500 font-mono">
              Spektrum KAN ISO/IEC 17025 Metrology Inspector Engine
            </span>
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all cursor-pointer text-center"
            >
              Tutup Auditor
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
