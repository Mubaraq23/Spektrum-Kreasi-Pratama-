import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  Layers, 
  FileCode, 
  Sliders, 
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface InspectionItem {
  id: string;
  name: string;
  category: 'physical' | 'functional' | 'electrical';
}

interface TestPoint {
  id: string;
  settingValue: number;
  unit: string;
  tolerancePlus: number;
  toleranceMinus: number;
  runsCount: number;
}

export function CustomProtocolBuilder() {
  const { user, profile } = useAuth();
  const [protocolTitle, setProtocolTitle] = useState('');
  const [deviceCategory, setDeviceCategory] = useState('Patient Monitor');
  const [codeReference, setCodeReference] = useState('IK-SKP-CUSTOM-01');
  const [allowableErrorUnit, setAllowableErrorUnit] = useState('%');
  
  // Dynamic lists
  const [inspections, setInspections] = useState<InspectionItem[]>([
    { id: '1', name: 'Kondisi Fisik & Kebersihan Chassis', category: 'physical' },
    { id: '2', name: 'Kondisi Kabel Daya & Grounding Plug', category: 'physical' },
    { id: '3', name: 'Fungsi Display & Layar Sentuh', category: 'functional' },
    { id: '4', name: 'Fungsi Alarm & Speaker Indikator', category: 'functional' }
  ]);

  const [testPoints, setTestPoints] = useState<TestPoint[]>([
    { id: 'tp-1', settingValue: 60, unit: 'BPM', tolerancePlus: 2, toleranceMinus: 2, runsCount: 5 },
    { id: 'tp-2', settingValue: 120, unit: 'BPM', tolerancePlus: 2, toleranceMinus: 2, runsCount: 5 },
    { id: 'tp-3', settingValue: 180, unit: 'BPM', tolerancePlus: 3, toleranceMinus: 3, runsCount: 5 }
  ]);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const addInspection = (category: 'physical' | 'functional' | 'electrical') => {
    setInspections([
      ...inspections,
      { id: Date.now().toString(), name: 'Pemeriksaan Baru', category }
    ]);
  };

  const removeInspection = (id: string) => {
    setInspections(inspections.filter(i => i.id !== id));
  };

  const updateInspectionName = (id: string, name: string) => {
    setInspections(inspections.map(i => i.id === id ? { ...i, name } : i));
  };

  const addTestPoint = () => {
    const lastPoint = testPoints[testPoints.length - 1];
    setTestPoints([
      ...testPoints,
      {
        id: `tp-${Date.now()}`,
        settingValue: (lastPoint?.settingValue || 100) + 50,
        unit: lastPoint?.unit || 'mmHg',
        tolerancePlus: lastPoint?.tolerancePlus || 2,
        toleranceMinus: lastPoint?.toleranceMinus || 2,
        runsCount: 5
      }
    ]);
  };

  const removeTestPoint = (id: string) => {
    setTestPoints(testPoints.filter(tp => tp.id !== id));
  };

  const updateTestPoint = (id: string, field: keyof TestPoint, value: any) => {
    setTestPoints(testPoints.map(tp => tp.id === id ? { ...tp, [field]: value } : tp));
  };

  const handleSaveProtocol = async () => {
    if (!protocolTitle.trim()) {
      alert('Silakan masukkan Judul Metode Kerja / Protokol!');
      return;
    }

    setSaving(true);
    try {
      // 1. Save to legacy workMethods collection
      await addDoc(collection(db, 'workMethods'), {
        title: protocolTitle,
        category: deviceCategory,
        code: codeReference,
        inspections,
        testPoints,
        createdById: user?.uid || '',
        createdBy: profile?.displayName || user?.email || 'System Admin',
        createdAt: serverTimestamp(),
        isCustom: true
      });

      // 2. Map testPoints to parameters format for worksheets compatibility
      const groupedByUnit: Record<string, { unit: string; points: number[]; maxTolerance: number; runsCount: number }> = {};
      testPoints.forEach(tp => {
        const u = tp.unit || 'unit';
        if (!groupedByUnit[u]) {
          groupedByUnit[u] = {
            unit: u,
            points: [],
            maxTolerance: 0,
            runsCount: tp.runsCount || 5
          };
        }
        groupedByUnit[u].points.push(tp.settingValue);
        groupedByUnit[u].maxTolerance = Math.max(groupedByUnit[u].maxTolerance, tp.tolerancePlus, tp.toleranceMinus);
      });

      const parameters = Object.entries(groupedByUnit).map(([unitKey, group]) => ({
        name: `Parameter ${unitKey}`,
        unit: group.unit,
        points: group.points,
        tolerance: group.maxTolerance,
        runsCount: group.runsCount
      }));

      // 3. Save to core methods collection so it is visible in the Worksheet Creation options
      await addDoc(collection(db, 'methods'), {
        title: protocolTitle,
        deviceCategory: deviceCategory,
        standardReference: codeReference,
        objectives: `Metode kalibrasi kustom untuk ${deviceCategory} menggunakan acuan ${codeReference}.`,
        procedures: inspections.map(i => `${i.category === 'physical' ? '[Fisik]' : '[Fungsi]'} ${i.name}`),
        parameters,
        createdById: user?.uid || '',
        createdBy: profile?.displayName || user?.email || 'System Admin',
        createdAt: serverTimestamp(),
        isCustom: true
      });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving custom protocol:', err);
      alert('Gagal menyimpan metode kerja baru ke database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-cyan-500 rounded-full" />
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.4em] font-mono">Custom Schema Builder</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-xl shadow-cyan-500/20">
              <Wrench className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic">
                Builder <span className="text-cyan-500">Protokol</span> &amp; Metode Kerja
              </h1>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Desain Templat Pengujian Kalibrasi Alat Kesehatan Kustom
          </p>
        </div>

        <button
          onClick={handleSaveProtocol}
          disabled={saving}
          className="flex items-center gap-3 px-8 py-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-[2rem] shadow-xl shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Menyimpan Template...' : 'Simpan Protokol Baru'}
        </button>
      </header>

      {savedSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-3"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>Metode kerja baru berhasil disimpan ke database dan siap digunakan pada Lembar Kerja!</span>
        </motion.div>
      )}

      {/* Main Settings Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Basic Info Panel */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6">
          <h2 className="text-sm font-black uppercase tracking-widest text-cyan-500 font-mono flex items-center gap-2">
            <FileCode className="w-4 h-4" /> 1. Metadata Protokol
          </h2>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Judul Metode Kerja</label>
            <input
              type="text"
              placeholder="Contoh: Kalibrasi Patient Monitor Pulse Ox"
              value={protocolTitle}
              onChange={(e) => setProtocolTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Kategori Alat Kesehatan</label>
            <select
              value={deviceCategory}
              onChange={(e) => setDeviceCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Patient Monitor">Patient Monitor</option>
              <option value="Syringe / Infusion Pump">Syringe / Infusion Pump</option>
              <option value="Infant Incubator">Infant Incubator</option>
              <option value="Defibrillator">Defibrillator</option>
              <option value="Electro-Surgical Unit (ESU)">Electro-Surgical Unit (ESU)</option>
              <option value="Centrifuge Klinik">Centrifuge Klinik</option>
              <option value="Kategori Kustom">Kategori Kustom Lainnya</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Kode Acuan IK / MK</label>
            <input
              type="text"
              value={codeReference}
              onChange={(e) => setCodeReference(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-900 dark:text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Inspections Checkpoint Builder */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6 md:col-span-2">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-cyan-500 font-mono flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> 2. Checklist Inspeksi Fisik &amp; Fungsi
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => addInspection('physical')}
                className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-cyan-500/20 cursor-pointer"
              >
                + Fisik
              </button>
              <button
                onClick={() => addInspection('functional')}
                className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-500/20 cursor-pointer"
              >
                + Fungsi
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
            {inspections.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-400 w-6">{index + 1}.</span>
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-[8px] font-black uppercase font-mono tracking-widest",
                  item.category === 'physical' ? "bg-cyan-500/15 text-cyan-400" : "bg-blue-500/15 text-blue-400"
                )}>
                  {item.category}
                </span>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => updateInspectionName(item.id, e.target.value)}
                  className="flex-1 bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
                <button
                  onClick={() => removeInspection(item.id)}
                  className="p-2 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Measurement Points Builder */}
      <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-xl space-y-6">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-cyan-500 font-mono flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> 3. Titik Ukur Pengukuran &amp; Batas Toleransi
          </h2>
          <button
            onClick={addTestPoint}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-cyan-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Tambah Titik Ukur
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-widest font-mono">
              <tr>
                <th className="p-4">Nilai Setting Standar</th>
                <th className="p-4">Satuan</th>
                <th className="p-4">Toleransi Positif (+)</th>
                <th className="p-4">Toleransi Negatif (-)</th>
                <th className="p-4">Pengulangan (n)</th>
                <th className="p-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold">
              {testPoints.map((tp) => (
                <tr key={tp.id} className="hover:bg-slate-50 dark:hover:bg-slate-950/40">
                  <td className="p-4">
                    <input
                      type="number"
                      value={tp.settingValue}
                      onChange={(e) => updateTestPoint(tp.id, 'settingValue', Number(e.target.value))}
                      className="w-28 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="text"
                      value={tp.unit}
                      onChange={(e) => updateTestPoint(tp.id, 'unit', e.target.value)}
                      className="w-20 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={tp.tolerancePlus}
                      onChange={(e) => updateTestPoint(tp.id, 'tolerancePlus', Number(e.target.value))}
                      className="w-24 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400"
                    />
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={tp.toleranceMinus}
                      onChange={(e) => updateTestPoint(tp.id, 'toleranceMinus', Number(e.target.value))}
                      className="w-24 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-red-400"
                    />
                  </td>
                  <td className="p-4 font-mono">
                    <select
                      value={tp.runsCount}
                      onChange={(e) => updateTestPoint(tp.id, 'runsCount', Number(e.target.value))}
                      className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value={3}>3 Kali</option>
                      <option value={5}>5 Kali (ISO GUM Recommended)</option>
                      <option value={10}>10 Kali</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => removeTestPoint(tp.id)}
                      className="p-2 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
