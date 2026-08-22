import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  UploadCloud, 
  CheckCircle2, 
  ArrowRight, 
  X
} from 'lucide-react';
import { parsePiranhaFile, PiranhaParseResult, ParsedPiranhaRecord } from '../../data/piranhaParser';

interface PiranhaImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmImport: (records: ParsedPiranhaRecord[]) => void;
}

export function PiranhaImporterModal({ isOpen, onClose, onConfirmImport }: PiranhaImporterModalProps) {
  const [step, setStep] = useState<number>(1);
  const [fileName, setFileName] = useState<string>('');
  const [parsedData, setParsedData] = useState<PiranhaParseResult | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const parsed = parsePiranhaFile(text, file.name);
      setParsedData(parsed);
      setStep(2); // Advance to Column Detection & Mapping step
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    if (parsedData && parsedData.records.length > 0) {
      onConfirmImport(parsedData.records);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl font-sans">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black uppercase text-slate-900 dark:text-white font-mono">
                Piranha Multi-meter Data Importer Engine
              </h3>
              <p className="text-xs text-slate-400">Import CSV/XLSX/TXT dari RTI Piranha Multi-meter secara terkontrol</p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Steps Bar */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-2 font-mono text-[11px]">
          <span className={`px-3 py-1.5 rounded-xl font-bold ${step === 1 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>
            1. Upload File
          </span>
          <span className={`px-3 py-1.5 rounded-xl font-bold ${step === 2 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>
            2. Parameter Mapping
          </span>
          <span className={`px-3 py-1.5 rounded-xl font-bold ${step === 3 ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}>
            3. Preview & Validation
          </span>
        </div>

        {/* STEP 1: Upload */}
        {step === 1 && (
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-10 text-center space-y-4">
            <UploadCloud className="w-12 h-12 text-cyan-400 mx-auto animate-bounce" />
            <h4 className="text-sm font-black uppercase text-slate-800 dark:text-slate-200">
              Pilih File Ekspor RTI Piranha (.csv, .xlsx, .txt)
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Sistem akan mendeteksi kolom kVp, Dose, Exposure Time, HVL, dan Dose Rate secara otomatis.
            </p>
            <label className="inline-flex px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-emerald-500/20 font-mono">
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Unggah File Piranha
              <input type="file" accept=".csv,.xlsx,.txt" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}

        {/* STEP 2: Parameter Mapping */}
        {step === 2 && parsedData && (
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-emerald-400">
              <span>File: <strong>{fileName}</strong></span>
              <span className="font-bold">{parsedData.records.length} Records Terdeteksi</span>
            </div>

            <h5 className="font-black uppercase tracking-wider text-slate-400">Peta Kolom Piranha ke Parameter BAPETEN:</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Kolom kVp Measured</span>
                <span className="font-bold text-cyan-400">Terhubung $\rightarrow$ Akurasi kVp</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Kolom Time (ms)</span>
                <span className="font-bold text-cyan-400">Terhubung $\rightarrow$ Akurasi Waktu Penyinaran</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Kolom Dose (mGy)</span>
                <span className="font-bold text-cyan-400">Terhubung $\rightarrow$ Output Radiasi & Linearitas</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 block">Kolom Total Filtration / HVL</span>
                <span className="font-bold text-cyan-400">Terhubung $\rightarrow$ Lapisan Paruh Tebal (HVL)</span>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2.5 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2"
              >
                Lanjut ke Preview <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview & Validation */}
        {step === 3 && parsedData && (
          <div className="space-y-4 font-mono text-xs">
            <h5 className="font-black uppercase tracking-wider text-slate-400">Pratinjau Pengukuran Berulang (Preview):</h5>
            <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-400">
                    <th className="p-3">#</th>
                    <th className="p-3">Set kVp</th>
                    <th className="p-3">Hasil kVp</th>
                    <th className="p-3">Set Waktu (ms)</th>
                    <th className="p-3">Hasil Waktu</th>
                    <th className="p-3">Dosis (mGy)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {parsedData.records.slice(0, 5).map((rec, idx) => (
                    <tr key={idx}>
                      <td className="p-3 text-slate-400">{idx + 1}</td>
                      <td className="p-3 text-cyan-400">{rec.setKvp || '-'}</td>
                      <td className="p-3 text-emerald-400">{rec.measuredKvp?.toFixed(2) || '-'}</td>
                      <td className="p-3 text-cyan-400">{rec.setTimeMs || '-'}</td>
                      <td className="p-3 text-emerald-400">{rec.measuredTimeMs?.toFixed(2) || '-'}</td>
                      <td className="p-3 text-purple-400">{rec.doseMgy?.toFixed(3) || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setStep(2)} className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs uppercase">
                Kembali
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <CheckCircle2 className="w-4 h-4" /> Konfirmasi & Impor Data Pengukuran
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
