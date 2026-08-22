import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Edit3, Trash2, Plus, X, Settings2 } from 'lucide-react';
import { TestParameter } from '../../lib/ukes/radiologyModalityTypes';

interface UniversalMeasurementTableProps {
  parameter: TestParameter;
  readingsMap: Record<number, number[]>;
  onReadingsChange: (setPoint: number, newReadings: number[]) => void;
  onAddSetPoint?: (paramId: string, newSetPoint: number) => void;
  onDeleteSetPoint?: (paramId: string, setPoint: number) => void;
  onEditParameter?: (param: TestParameter) => void;
  onDeleteParameter?: (paramId: string) => void;
}

export function UniversalMeasurementTable({
  parameter,
  readingsMap,
  onReadingsChange,
  onAddSetPoint,
  onDeleteSetPoint,
  onEditParameter,
  onDeleteParameter
}: UniversalMeasurementTableProps) {
  const setPoints = Object.keys(readingsMap).map(Number).sort((a, b) => a - b);
  const [newSetPointInput, setNewSetPointInput] = useState<string>('');
  const [isAddingSetPoint, setIsAddingSetPoint] = useState<boolean>(false);

  const calculateStats = (setPoint: number, readings: number[]) => {
    const valid = readings.filter(r => typeof r === 'number' && !isNaN(r));
    if (valid.length === 0) return { mean: 0, sd: 0, cv: 0, errorPct: 0, status: 'NOT_TESTED' };

    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const devSqSum = valid.length > 1 ? valid.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) : 0;
    const sd = valid.length > 1 ? Math.sqrt(devSqSum / (valid.length - 1)) : 0;
    const cv = mean > 0 ? (sd / mean) * 100 : 0;
    const errorPct = setPoint > 0 ? ((mean - setPoint) / setPoint) * 100 : 0;

    let isPass = true;
    if (parameter.toleranceType === 'percentage' && parameter.toleranceMax) {
      isPass = Math.abs(errorPct) <= parameter.toleranceMax;
    } else if (parameter.toleranceType === 'max_cv' && parameter.maxCV) {
      isPass = cv <= parameter.maxCV;
    } else if (parameter.toleranceType === 'range' && parameter.toleranceMin !== undefined && parameter.toleranceMax !== undefined) {
      isPass = mean >= parameter.toleranceMin && mean <= parameter.toleranceMax;
    } else if (parameter.toleranceType === 'absolute' && parameter.toleranceMax) {
      isPass = Math.abs(mean - setPoint) <= parameter.toleranceMax;
    }

    return {
      mean: Number(mean.toFixed(2)),
      sd: Number(sd.toFixed(3)),
      cv: Number(cv.toFixed(2)),
      errorPct: Number(errorPct.toFixed(2)),
      status: isPass ? 'PASS' : 'FAIL'
    };
  };

  const handleCellChange = (setPoint: number, readingIndex: number, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    const currentReadings = readingsMap[setPoint] || Array(parameter.numReadings).fill(0);
    const updated = [...currentReadings];
    updated[readingIndex] = val;
    onReadingsChange(setPoint, updated);
  };

  const handleAddNewSetPoint = () => {
    const spVal = parseFloat(newSetPointInput);
    if (!isNaN(spVal) && spVal > 0) {
      if (onAddSetPoint) {
        onAddSetPoint(parameter.id, spVal);
      } else {
        onReadingsChange(spVal, Array(parameter.numReadings).fill(spVal));
      }
      setNewSetPointInput('');
      setIsAddingSetPoint(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 font-sans relative group/card">
      {/* Parameter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              {parameter.category} • {parameter.unit}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Ref: {parameter.regulationReference}</span>
          </div>
          <h4 className="text-sm font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            {parameter.name}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {parameter.description}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">Toleransi:</span>
          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-cyan-600 dark:text-cyan-400 font-bold border border-slate-200 dark:border-slate-700">
            {parameter.toleranceType === 'percentage' && `±${parameter.toleranceMax}%`}
            {parameter.toleranceType === 'max_cv' && `CV ≤ ${(parameter.maxCV || 0.05) * 100}%`}
            {parameter.toleranceType === 'absolute' && `≤ ${parameter.toleranceMax} ${parameter.unit}`}
            {parameter.toleranceType === 'range' && `${parameter.toleranceMin} - ${parameter.toleranceMax} ${parameter.unit}`}
          </span>

          {/* Action Buttons: Edit / Delete Parameter */}
          <div className="flex items-center gap-1 ml-2">
            {onEditParameter && (
              <button
                type="button"
                onClick={() => onEditParameter(parameter)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Edit Parameter"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteParameter && (
              <button
                type="button"
                onClick={() => onDeleteParameter(parameter.id)}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                title="Hapus Parameter"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Measurement Readings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
              <th className="py-2.5 px-3">Set Point ({parameter.unit})</th>
              {Array.from({ length: Math.max(...(setPoints.length > 0 ? setPoints.map(sp => (readingsMap[sp] || []).length) : [parameter.numReadings]), parameter.numReadings) }).map((_, idx) => (
                <th key={idx} className="py-2.5 px-3 text-center">Ukur {idx + 1}</th>
              ))}
              <th className="py-2.5 px-3 text-right">Rata-rata</th>
              <th className="py-2.5 px-3 text-right">SD</th>
              <th className="py-2.5 px-3 text-right">CV (%)</th>
              <th className="py-2.5 px-3 text-right">Error (%)</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-2 text-center w-10">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-800 dark:text-slate-200">
            {setPoints.map((sp) => {
              const readings = readingsMap[sp] || Array(parameter.numReadings).fill(sp);
              const stats = calculateStats(sp, readings);

              return (
                <tr key={sp} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                    {sp} {parameter.unit}
                  </td>
                  {readings.map((rVal, rIdx) => (
                    <td key={rIdx} className="py-2 px-2 text-center">
                      <input
                        type="number"
                        step="any"
                        value={rVal}
                        onChange={(e) => handleCellChange(sp, rIdx, e.target.value)}
                        className="w-20 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-3 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    {stats.mean}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">
                    {stats.sd}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-500">
                    {stats.cv}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {stats.errorPct > 0 ? `+${stats.errorPct}` : stats.errorPct}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase font-mono ${
                      stats.status === 'PASS'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    }`}>
                      {stats.status === 'PASS' ? (
                        <><CheckCircle2 className="w-3 h-3" /> LAIK</>
                      ) : (
                        <><AlertTriangle className="w-3 h-3" /> TIDAK LAIK</>
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-center">
                    {onDeleteSetPoint && (
                      <button
                        type="button"
                        onClick={() => onDeleteSetPoint(parameter.id, sp)}
                        className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                        title="Hapus Titik Uji Ini"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Set Point Control */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
        {isAddingSetPoint ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder={`Titik Baru (${parameter.unit})`}
              value={newSetPointInput}
              onChange={(e) => setNewSetPointInput(e.target.value)}
              className="w-32 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
            />
            <button
              type="button"
              onClick={handleAddNewSetPoint}
              className="px-3 py-1.5 bg-cyan-500 text-slate-950 font-bold rounded-xl text-[10px] uppercase tracking-wider"
            >
              Simpan Titik
            </button>
            <button
              type="button"
              onClick={() => setIsAddingSetPoint(false)}
              className="px-2 py-1.5 text-slate-400 hover:text-slate-200 text-[10px]"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingSetPoint(true)}
            className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline uppercase tracking-wider cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Titik Uji ({parameter.unit})
          </button>
        )}
      </div>
    </div>
  );
}
