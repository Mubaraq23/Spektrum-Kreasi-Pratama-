import React, { useState } from 'react';
import { ShieldCheck, Layers, Plus, Edit3, Trash2 } from 'lucide-react';
import { BAPETEN_REGULATIONS, BapetenParameterDef } from '../data/bapetenRegulations';
import { REGULATORY_DOCUMENT_CATALOG } from '../data/regulatoryCatalog';
import { ParameterEditorModal } from '../components/ukes/ParameterEditorModal';
import { 
  MASTER_RADIOLOGY_MODALITIES,
  addParameterToModality, 
  updateParameterInModality, 
  deleteParameterFromModality 
} from '../lib/ukes/radiologyModalityRegistry';
import { TestParameter } from '../lib/ukes/radiologyModalityTypes';

export function UkesRadiologyMasterRegulations() {
  const activeReg = BAPETEN_REGULATIONS[0];
  const [, setModalities] = useState([...MASTER_RADIOLOGY_MODALITIES]);

  // Parameter Modal state
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [activeModalityForParam, setActiveModalityForParam] = useState<{ id: string; name: string } | null>(null);
  const [activeParamToEdit, setActiveParamToEdit] = useState<TestParameter | null>(null);

  const handleOpenAddParam = (modalityId: string, modalityName: string) => {
    setActiveModalityForParam({ id: modalityId, name: modalityName });
    setActiveParamToEdit(null);
    setIsParamModalOpen(true);
  };

  const handleOpenEditParam = (modalityId: string, modalityName: string, param: BapetenParameterDef) => {
    setActiveModalityForParam({ id: modalityId, name: modalityName });
    const paramId = param.id || 'param-default';
    const tParam: TestParameter = {
      id: paramId,
      code: paramId.toUpperCase(),
      name: param.name || 'Parameter Uji',
      category: param.category || 'Eksposi',
      unit: param.unit || 'kV',
      measurementType: 'numeric',
      testConditions: param.testConditions || '',
      defaultSetPoints: param.defaultPoints || [70],
      numReadings: param.numReadings || 3,
      toleranceType: (param.toleranceType === 'range' ? 'percentage' : param.toleranceType) as TestParameter['toleranceType'],
      toleranceMax: param.toleranceMax,
      formula: param.formula || '',
      acceptanceRuleId: `RULE-${paramId}`,
      requiredInstrumentType: 'Multi-meter Radiologi',
      evidenceRequired: true,
      regulationReference: param.regulationRef || 'Perba 1/2025',
      regulationVersion: 'BAPETEN-2025-V1',
      description: param.description || '',
      isMandatory: param.isMandatory !== false
    };
    setActiveParamToEdit(tParam);
    setIsParamModalOpen(true);
  };

  const handleSaveParam = (paramObj: TestParameter) => {
    if (!activeModalityForParam) return;
    if (activeParamToEdit) {
      updateParameterInModality(activeModalityForParam.id, activeParamToEdit.id, paramObj);
    } else {
      addParameterToModality(activeModalityForParam.id, paramObj);
    }
    setModalities([...MASTER_RADIOLOGY_MODALITIES]);
  };

  const handleDeleteParam = (paramId: string) => {
    if (!activeModalityForParam) return;
    deleteParameterFromModality(activeModalityForParam.id, paramId);
    setModalities([...MASTER_RADIOLOGY_MODALITIES]);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Top Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-xs font-bold uppercase tracking-widest mb-2 font-mono">
          <ShieldCheck className="w-4 h-4" /> Regulatory-First Hierarchy Engine
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase font-mono">
          Master Regulasi & Dokumen Acuan BAPETEN
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Katalog versi regulasi resmi BAPETEN yang mengendalikan seluruh kriteria keberterimaan dan aturan pengujian.
        </p>
      </div>

      {/* Regulatory Document Hierarchy Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-500" /> Katalog Hirarki Regulasi & Pedoman Teknis
        </h3>

        <div className="overflow-x-auto no-scrollbar font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                <th className="py-3 px-3">Nomor Dokumen</th>
                <th className="py-3 px-3">Judul Regulasi</th>
                <th className="py-3 px-3">Tipe</th>
                <th className="py-3 px-3">Status Versioning</th>
                <th className="py-3 px-3">Catatan Multi-versi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
              {REGULATORY_DOCUMENT_CATALOG.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-3 px-3 text-cyan-400">{doc.documentNumber}</td>
                  <td className="py-3 px-3 text-slate-900 dark:text-white">{doc.title}</td>
                  <td className="py-3 px-3 text-slate-400">{doc.documentType}</td>
                  <td className="py-3 px-3">
                    {doc.status === 'ACTIVE' ? (
                      <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] uppercase font-black">
                        AKTIF / VERSI UTAMA
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px] uppercase font-black">
                        SUPERSEDED (HISTORIS)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    {doc.supersededBy ? `Digantikan oleh ${doc.supersededBy}` : doc.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Modality Parameters Catalog */}
      <div className="space-y-6">
        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
          Parameter Uji Berdasarkan {activeReg.title}
        </h3>

        {activeReg.modalities.map((modality) => (
          <div key={modality.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4 font-sans">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">{modality.codePrefix}</span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase font-mono">{modality.name}</h3>
                <p className="text-xs text-slate-400">{modality.description}</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleOpenAddParam(modality.id, modality.name)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Parameter
                </button>
                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold font-mono">
                  {modality.parameters.length} Parameter Uji
                </span>
              </div>
            </div>

            <div className="overflow-x-auto no-scrollbar font-mono text-xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                    <th className="py-3 px-3">Parameter Uji</th>
                    <th className="py-3 px-3">Kategori</th>
                    <th className="py-3 px-3">Satuan</th>
                    <th className="py-3 px-3">Acceptance Criteria / Toleransi</th>
                    <th className="py-3 px-3">Referensi Regulasi BAPETEN</th>
                    <th className="py-3 px-3 text-right">Aksi Parameter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-bold">
                  {modality.parameters.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-3 text-slate-900 dark:text-white">{p.name}</td>
                      <td className="py-3 px-3 text-slate-400">{p.category}</td>
                      <td className="py-3 px-3 text-cyan-400">{p.unit}</td>
                      <td className="py-3 px-3 text-emerald-400">
                        {p.toleranceMax !== undefined ? `Toleransi ± ${p.toleranceMax}%` : p.description}
                      </td>
                      <td className="py-3 px-3 text-slate-400">{p.regulationRef}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditParam(modality.id, modality.name, p)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] uppercase font-black flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Apakah Anda yakin ingin menghapus parameter "${p.name}"?`)) {
                                deleteParameterFromModality(modality.id, p.id);
                                setModalities([...MASTER_RADIOLOGY_MODALITIES]);
                              }
                            }}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] uppercase font-black flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Edit / Tambah Parameter */}
      {activeModalityForParam && (
        <ParameterEditorModal
          isOpen={isParamModalOpen}
          onClose={() => setIsParamModalOpen(false)}
          modalityId={activeModalityForParam.id}
          modalityName={activeModalityForParam.name}
          initialParameter={activeParamToEdit}
          onSave={handleSaveParam}
          onDelete={handleDeleteParam}
        />
      )}
    </div>
  );
}
