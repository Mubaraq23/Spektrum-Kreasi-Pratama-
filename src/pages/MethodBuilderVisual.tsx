import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  Layers
} from 'lucide-react';

import { Tilt3D } from '../components/Tilt3D';

interface MethodStep {
  id: string;
  stepNumber: number;
  parameterName: string;
  unit: string;
  setValueRange: string;
  toleranceMpe: string;
  unassignedCalibrators: string[];
}

export function MethodBuilderVisual() {
  const [methodTitle, setMethodTitle] = useState('Instruksi Kerja Kalibrasi Defibrillator (IK-SPK-DEF-01 Rev 4)');
  const [deviceCategory, setDeviceCategory] = useState('Emergency Care & Resuscitation');
  const [steps, setSteps] = useState<MethodStep[]>([
    {
      id: 'step-1',
      stepNumber: 1,
      parameterName: 'Energi Discharge (Joule)',
      unit: 'Joule',
      setValueRange: '10 J - 360 J',
      toleranceMpe: '± 15% atau ± 3 J',
      unassignedCalibrators: ['Fluke Impulse 7000DP']
    },
    {
      id: 'step-2',
      stepNumber: 2,
      parameterName: 'Waktu Pengisian (Charge Time)',
      unit: 'Detik',
      setValueRange: 'Max Energy (360 J)',
      toleranceMpe: '≤ 15 Detik',
      unassignedCalibrators: ['Stopwatch Terkalibrasi']
    }
  ]);

  const handleAddStep = () => {
    const newStep: MethodStep = {
      id: `step-${steps.length + 1}`,
      stepNumber: steps.length + 1,
      parameterName: 'Parameter Pengukuran Baru',
      unit: 'Unit',
      setValueRange: '0 - 100',
      toleranceMpe: '± 5%',
      unassignedCalibrators: ['Standar Ukur LPAK']
    };
    setSteps([...steps, newStep]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      <Tilt3D intensity={4}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Visual Work Instruction (MK/IK) & Worksheet Builder
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Studio Visual Penyusun <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">Metode Kerja MK/IK</span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
              Perancang visual drag-and-drop untuk menyusun metode pengujian kalibrasi, batas toleransi MPE regulasi, dan formula metrologi tanpa menulis kode.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* Builder Settings Bar */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Judul Dokumentasi IK / Metode</label>
            <input
              type="text"
              value={methodTitle}
              onChange={(e) => setMethodTitle(e.target.value)}
              className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase">Kategori Alat Kesehatan</label>
            <input
              type="text"
              value={deviceCategory}
              onChange={(e) => setDeviceCategory(e.target.value)}
              className="w-full mt-1.5 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Steps List Visual Cards */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" /> Langkah & Parameter Pengukuran Terstruktur
            </h2>
            <button
              onClick={handleAddStep}
              className="px-3.5 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" /> Tambah Parameter
            </button>
          </div>

          <div className="space-y-4 font-mono text-xs">
            {steps.map((st, idx) => (
              <div key={st.id} className="p-5 bg-slate-950 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400 font-bold">LANGKAH #{idx + 1}</span>
                  <button
                    onClick={() => handleRemoveStep(st.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Nama Parameter:</label>
                    <input
                      type="text"
                      value={st.parameterName}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[idx].parameterName = e.target.value;
                        setSteps(updated);
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Satuan Ukur (Unit):</label>
                    <input
                      type="text"
                      value={st.unit}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[idx].unit = e.target.value;
                        setSteps(updated);
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Rentang Setting:</label>
                    <input
                      type="text"
                      value={st.setValueRange}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[idx].setValueRange = e.target.value;
                        setSteps(updated);
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">Batas MPE Regulasi:</label>
                    <input
                      type="text"
                      value={st.toleranceMpe}
                      onChange={(e) => {
                        const updated = [...steps];
                        updated[idx].toleranceMpe = e.target.value;
                        setSteps(updated);
                      }}
                      className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-emerald-400 font-bold"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Save Method Button */}
        <button className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20">
          <Save className="w-4 h-4" /> Simpan Versi Metode IK Baru
        </button>
      </div>
    </div>
  );
}
