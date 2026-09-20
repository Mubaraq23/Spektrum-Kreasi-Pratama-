import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  ShieldCheck, 
  Calculator, 
  Database
} from 'lucide-react';

import { Tilt3D } from '../components/Tilt3D';

interface PatientRadiationRecord {
  id: string;
  patientAge: number;
  examinationType: 'CHEST_AP_PA' | 'LUMBAR_SPINE' | 'ABDOMEN' | 'HEAD_CT' | 'MAMMOGRAPHY';
  kvpUsed: number;
  masUsed: number;
  esdMeasuredMgy: number;
  bapetenDrlMgy: number;
  drlStatus: 'BELOW_DRL' | 'EXCEEDS_DRL';
  submissionStatus: 'SUBMITTED' | 'DRAFT';
}

export function BapetenSiIntanDispatcher() {
  const [records, setRecords] = useState<PatientRadiationRecord[]>([
    {
      id: 'RAD-PAT-2026-001',
      patientAge: 45,
      examinationType: 'CHEST_AP_PA',
      kvpUsed: 80,
      masUsed: 12,
      esdMeasuredMgy: 0.22,
      bapetenDrlMgy: 0.40,
      drlStatus: 'BELOW_DRL',
      submissionStatus: 'SUBMITTED'
    },
    {
      id: 'RAD-PAT-2026-002',
      patientAge: 52,
      examinationType: 'LUMBAR_SPINE',
      kvpUsed: 85,
      masUsed: 32,
      esdMeasuredMgy: 2.85,
      bapetenDrlMgy: 4.50,
      drlStatus: 'BELOW_DRL',
      submissionStatus: 'SUBMITTED'
    },
    {
      id: 'RAD-PAT-2026-003',
      patientAge: 38,
      examinationType: 'HEAD_CT',
      kvpUsed: 120,
      masUsed: 250,
      esdMeasuredMgy: 48.5,
      bapetenDrlMgy: 50.0,
      drlStatus: 'BELOW_DRL',
      submissionStatus: 'DRAFT'
    }
  ]);

  const [newAge, setNewAge] = useState<number>(40);
  const [newExam, setNewExam] = useState<'CHEST_AP_PA' | 'LUMBAR_SPINE' | 'ABDOMEN' | 'HEAD_CT' | 'MAMMOGRAPHY'>('CHEST_AP_PA');
  const [newKvp, setNewKvp] = useState<number>(80);
  const [newMas, setNewMas] = useState<number>(10);
  const [isDispatching, setIsDispatching] = useState(false);

  const calculateEsd = (kvp: number, mas: number) => {
    // Empirical ESD formula for general radiography: ESD = Output_Factor * (kVp / 80)^2 * mAs
    const outputFactorAt80Kvp = 0.025; // mGy/mAs at 1m
    const esd = outputFactorAt80Kvp * Math.pow(kvp / 80, 2) * mas;
    return parseFloat(esd.toFixed(2));
  };

  const getDrlLimit = (exam: string) => {
    switch (exam) {
      case 'CHEST_AP_PA': return 0.40;
      case 'LUMBAR_SPINE': return 4.50;
      case 'ABDOMEN': return 3.50;
      case 'HEAD_CT': return 50.0;
      case 'MAMMOGRAPHY': return 3.0;
      default: return 1.0;
    }
  };

  const handleAddRecord = () => {
    const esd = calculateEsd(newKvp, newMas);
    const drl = getDrlLimit(newExam);
    const status = esd <= drl ? 'BELOW_DRL' : 'EXCEEDS_DRL';

    const newRec: PatientRadiationRecord = {
      id: `RAD-PAT-2026-${String(records.length + 1).padStart(3, '0')}`,
      patientAge: newAge,
      examinationType: newExam,
      kvpUsed: newKvp,
      masUsed: newMas,
      esdMeasuredMgy: esd,
      bapetenDrlMgy: drl,
      drlStatus: status,
      submissionStatus: 'DRAFT'
    };

    setRecords([newRec, ...records]);
  };

  const dispatchAllDrafts = () => {
    setIsDispatching(true);
    setTimeout(() => {
      setRecords(records.map(r => ({ ...r, submissionStatus: 'SUBMITTED' })));
      setIsDispatching(false);
      alert('Seluruh Rekam Dosis Radiasi Berhasil Di-dispatch ke Si-INTAN BAPETEN!');
    }, 1500);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      {/* Header Banner */}
      <Tilt3D intensity={5}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-cyan-950 to-blue-950 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
            <Radio className="w-96 h-96 text-cyan-400" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-black uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4 text-cyan-400" /> BAPETEN Si-INTAN National Radiation Dose Portal Dispatcher
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Dispatcher Dosis Pasien <span className="bg-gradient-to-r from-cyan-400 via-emerald-300 to-teal-400 bg-clip-text text-transparent">Si-INTAN BAPETEN</span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
              Sistem pengiriman otomatis data Dosis Radiasi Pasien (Entrance Surface Dose / ESD) dan evaluasi kepatuhan terhadap Tingkat Panduan Dosis Nasional (Diagnostic Reference Levels / DRL BAPETEN) sesuai Perka BAPETEN.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Input Form Column */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-400" /> Evaluator Dosis Radiasi Sinar-X
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Jenis Pemeriksaan Radiologi</label>
                <select
                  value={newExam}
                  onChange={(e) => setNewExam(e.target.value as PatientRadiationRecord['examinationType'])}

                  className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:border-cyan-500 outline-none"
                >
                  <option value="CHEST_AP_PA">Toraks (Chest AP/PA)</option>
                  <option value="LUMBAR_SPINE">Lumbal Spine (AP/LAT)</option>
                  <option value="ABDOMEN">Abdomen (AP)</option>
                  <option value="HEAD_CT">CT-Scan Kepala (Head CT)</option>
                  <option value="MAMMOGRAPHY">Mammografi Digital</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Tegangan (kVp)</label>
                  <input
                    type="number"
                    value={newKvp}
                    onChange={(e) => setNewKvp(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-cyan-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase">Arus x Waktu (mAs)</label>
                  <input
                    type="number"
                    value={newMas}
                    onChange={(e) => setNewMas(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-cyan-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase">Usia Pasien (Tahun)</label>
                <input
                  type="number"
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                  className="w-full mt-1.5 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white outline-none"
                />
              </div>

              {/* Calculated Result Preview */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-400 uppercase">Estimasi Dosis Permukaan (ESD)</div>
                <div className="text-2xl font-black text-emerald-400">
                  {calculateEsd(newKvp, newMas)} <span className="text-xs text-slate-400 font-normal">mGy</span>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between">
                  <span>Batas DRL BAPETEN:</span>
                  <span className="font-bold text-cyan-400">{getDrlLimit(newExam)} mGy</span>
                </div>
              </div>

              <button
                onClick={handleAddRecord}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
              >
                + Tambah Ke Antrean Si-INTAN
              </button>
            </div>
          </div>
        </div>

        {/* Radiation Log Table Column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" /> Log Record Dosis Radiasi Si-INTAN BAPETEN
              </h2>
              <button
                onClick={dispatchAllDrafts}
                disabled={isDispatching || records.every(r => r.submissionStatus === 'SUBMITTED')}
                className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" /> {isDispatching ? 'Dispatching...' : 'Dispatch Ke Si-INTAN'}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-bold">
                    <th className="p-3">ID Log</th>
                    <th className="p-3">Pemeriksaan</th>
                    <th className="p-3">kVp / mAs</th>
                    <th className="p-3">ESD (mGy)</th>
                    <th className="p-3">Status DRL</th>
                    <th className="p-3">BAPETEN Sync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-all">
                      <td className="p-3 font-mono text-cyan-400 font-bold">{rec.id}</td>
                      <td className="p-3 font-bold text-white">{rec.examinationType}</td>
                      <td className="p-3 font-mono text-slate-300">{rec.kvpUsed}kVp / {rec.masUsed}mAs</td>
                      <td className="p-3 font-mono font-bold text-emerald-400">{rec.esdMeasuredMgy} mGy</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          rec.drlStatus === 'BELOW_DRL' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}>
                          {rec.drlStatus === 'BELOW_DRL' ? '✓ Below DRL' : '⚠️ Exceeds DRL'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          rec.submissionStatus === 'SUBMITTED' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                        }`}>
                          {rec.submissionStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
