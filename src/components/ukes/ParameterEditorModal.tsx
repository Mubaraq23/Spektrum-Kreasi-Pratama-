import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Plus, Trash2, Edit3, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TestParameter, ToleranceType, MeasurementType } from '../../lib/ukes/radiologyModalityTypes';

interface ParameterEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalityId: string;
  modalityName: string;
  initialParameter?: TestParameter | null;
  onSave: (param: TestParameter) => void;
  onDelete?: (paramId: string) => void;
}

export function ParameterEditorModal({
  isOpen,
  onClose,
  modalityId,
  modalityName,
  initialParameter,
  onSave,
  onDelete
}: ParameterEditorModalProps) {
  const isEditing = !!initialParameter;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Eksposi' | 'Kualitas Berkas' | 'Geometri' | 'AEC' | 'Dosis' | 'Citra' | 'Keselamatan'>('Eksposi');
  const [unit, setUnit] = useState('kV');
  const [measurementType, setMeasurementType] = useState<MeasurementType>('numeric');
  const [testConditions, setTestConditions] = useState('Kondisi Uji Standar');
  const [setPointsStr, setSetPointsStr] = useState('50, 70, 90, 100');
  const [numReadings, setNumReadings] = useState(3);
  const [toleranceType, setToleranceType] = useState<ToleranceType>('percentage');
  const [toleranceMin, setToleranceMin] = useState<number | undefined>(undefined);
  const [toleranceMax, setToleranceMax] = useState<number | undefined>(10);
  const [maxCV, setMaxCV] = useState<number | undefined>(5);
  const [maxLinearity, setMaxLinearity] = useState<number | undefined>(10);
  const [formula, setFormula] = useState('|X_ukur - X_set| / X_set * 100%');
  const [requiredInstrumentType, setRequiredInstrumentType] = useState('Piranha Multi-meter / Dosimeter');
  const [regulationReference, setRegulationReference] = useState('Perba BAPETEN 1/2025');
  const [description, setDescription] = useState('Deviasi parameter <= 10%');
  const [isMandatory, setIsMandatory] = useState(true);

  useEffect(() => {
    if (initialParameter) {
      setCode(initialParameter.code || '');
      setName(initialParameter.name || '');
      setCategory(initialParameter.category || 'Eksposi');
      setUnit(initialParameter.unit || 'kV');
      setMeasurementType(initialParameter.measurementType || 'numeric');
      setTestConditions(initialParameter.testConditions || 'Kondisi Uji Standar');
      setSetPointsStr((initialParameter.defaultSetPoints || [50, 70, 90]).join(', '));
      setNumReadings(initialParameter.numReadings || 3);
      setToleranceType(initialParameter.toleranceType || 'percentage');
      setToleranceMin(initialParameter.toleranceMin);
      setToleranceMax(initialParameter.toleranceMax);
      setMaxCV(initialParameter.maxCV);
      setMaxLinearity(initialParameter.maxLinearity);
      setFormula(initialParameter.formula || '');
      setRequiredInstrumentType(initialParameter.requiredInstrumentType || 'Piranha Multi-meter');
      setRegulationReference(initialParameter.regulationReference || 'Perba BAPETEN 1/2025');
      setDescription(initialParameter.description || '');
      setIsMandatory(initialParameter.isMandatory !== false);
    } else {
      // Reset for new parameter
      const randId = Math.random().toString(36).substring(2, 7).toUpperCase();
      setCode(`PAR-UKES-${randId}`);
      setName('');
      setCategory('Eksposi');
      setUnit('kV');
      setMeasurementType('numeric');
      setTestConditions('Kondisi Uji Standar BAPETEN');
      setSetPointsStr('50, 70, 90');
      setNumReadings(3);
      setToleranceType('percentage');
      setToleranceMin(undefined);
      setToleranceMax(10);
      setMaxCV(5);
      setMaxLinearity(10);
      setFormula('|X_ukur - X_set| / X_set * 100%');
      setRequiredInstrumentType('Multi-meter Radiologi');
      setRegulationReference('Perba BAPETEN 1/2025');
      setDescription('Deviasi terukur <= 10%');
      setIsMandatory(true);
    }
  }, [initialParameter, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    const parsedSetPoints = setPointsStr
      .split(',')
      .map(s => parseFloat(s.trim()))
      .filter(n => !isNaN(n));

    const paramObj: TestParameter = {
      id: initialParameter?.id || `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      code,
      name,
      category,
      unit,
      measurementType,
      testConditions,
      defaultSetPoints: parsedSetPoints.length > 0 ? parsedSetPoints : [70],
      numReadings: numReadings || 3,
      toleranceType,
      toleranceMin: toleranceType === 'range' ? toleranceMin : undefined,
      toleranceMax: toleranceMax !== undefined ? Number(toleranceMax) : undefined,
      maxCV: toleranceType === 'max_cv' ? maxCV : undefined,
      maxLinearity: toleranceType === 'max_linearity' ? maxLinearity : undefined,
      formula: formula || 'Formula Standar',
      acceptanceRuleId: `RULE-${code}`,
      requiredInstrumentType,
      evidenceRequired: true,
      regulationReference,
      regulationVersion: 'BAPETEN-2025-V1',
      description: description || `Deviasi ${name} <= ${toleranceMax}%`,
      isMandatory
    };

    onSave(paramObj);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {modalityName}
              </span>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase font-mono tracking-wider mt-1">
                {isEditing ? 'Edit Parameter Uji Kesesuaian' : 'Tambah Parameter Uji Baru'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs font-sans flex-1 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kode Parameter *</label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="PAR-RAD-KVP"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nama Parameter Uji *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Akurasi Tegangan Tabung (kVp)"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kategori Pengujian</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as any)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white font-mono"
                >
                  <option value="Eksposi">Eksposi (kV, mA, s, mGy)</option>
                  <option value="Kualitas Berkas">Kualitas Berkas (HVL, Filter)</option>
                  <option value="Geometri">Geometri (Kolimasi, Aligment)</option>
                  <option value="AEC">AEC (Automatic Exposure Control)</option>
                  <option value="Dosis">Dosis & Radiasi (DAP, KAP, CTDI)</option>
                  <option value="Citra">Kualitas Citra (Spatial Res, HU, Noise)</option>
                  <option value="Keselamatan">Keselamatan Radiasi & Kebocoran</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Satuan Ukur (Unit)</label>
                <input
                  type="text"
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="kV / ms / mGy / mm Al / %"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Daftar Titik Uji Default (Set Points)</label>
                <input
                  type="text"
                  value={setPointsStr}
                  onChange={e => setSetPointsStr(e.target.value)}
                  placeholder="50, 70, 90, 100"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
                <span className="text-[9px] text-slate-400 mt-1 block">Pisahkan dengan koma (cth: 50, 70, 90)</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jumlah Pengulangan Ukur (n)</label>
                <input
                  type="number"
                  value={numReadings}
                  onChange={e => setNumReadings(parseInt(e.target.value) || 3)}
                  min={1}
                  max={10}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipe Aturan Toleransi</label>
                <select
                  value={toleranceType}
                  onChange={e => setToleranceType(e.target.value as ToleranceType)}
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white font-mono"
                >
                  <option value="percentage">Persentase Deviasi (± %)</option>
                  <option value="absolute">Deviasi Absolut (± Nilai)</option>
                  <option value="range">Rentang Nilai Min - Max</option>
                  <option value="max_cv">Koefisien Variasi Maksimum (CV %)</option>
                  <option value="max_linearity">Linearitas Maksimum (CL %)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  {toleranceType === 'percentage' || toleranceType === 'absolute' ? 'Batas Maksimum Toleransi (±)' : 'Nilai Maksimum / Limit'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={toleranceMax !== undefined ? toleranceMax : ''}
                  onChange={e => setToleranceMax(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="10"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              {toleranceType === 'range' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nilai Minimum Rentang</label>
                  <input
                    type="number"
                    step="any"
                    value={toleranceMin !== undefined ? toleranceMin : ''}
                    onChange={e => setToleranceMin(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="0"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Formula Perhitungan</label>
                <input
                  type="text"
                  value={formula}
                  onChange={e => setFormula(e.target.value)}
                  placeholder="|X_ukur - X_set| / X_set * 100%"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Alat Ukur Master Yang Dipersyaratkan</label>
                <input
                  type="text"
                  value={requiredInstrumentType}
                  onChange={e => setRequiredInstrumentType(e.target.value)}
                  placeholder="Multi-meter Radiologi Piranha / Chamber"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Referensi Regulasi BAPETEN</label>
                <input
                  type="text"
                  value={regulationReference}
                  onChange={e => setRegulationReference(e.target.value)}
                  placeholder="Perba BAPETEN 1/2025 Lampiran I"
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Kriteria Keberterimaan / Deskripsi</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Deviasi parameter terukur harus <= 10%..."
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white h-20"
                />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              {isEditing && onDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Apakah Anda yakin ingin menghapus parameter "${name}"?`)) {
                      onDelete(initialParameter.id);
                      onClose();
                    }
                  }}
                  className="px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white font-bold rounded-xl text-xs uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Hapus Parameter
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Simpan Parameter
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
