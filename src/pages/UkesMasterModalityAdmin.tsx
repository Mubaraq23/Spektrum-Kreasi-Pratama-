import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Copy, 
  X, 
  Settings,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MASTER_RADIOLOGY_MODALITIES, 
  registerCustomModality,
  deleteModalityProfile,
  addParameterToModality,
  updateParameterInModality,
  deleteParameterFromModality
} from '../lib/ukes/radiologyModalityRegistry';
import { RadiologyModalityProfile, ModalityCategory, TestParameter } from '../lib/ukes/radiologyModalityTypes';
import { ParameterEditorModal } from '../components/ukes/ParameterEditorModal';

export function UkesMasterModalityAdmin() {
  const [modalities, setModalities] = useState<RadiologyModalityProfile[]>([...MASTER_RADIOLOGY_MODALITIES]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedModalityIds, setExpandedModalityIds] = useState<string[]>([]);
  
  // Custom Modality Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameEn, setNewNameEn] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newCategory, setNewCategory] = useState<ModalityCategory>('RADIOGRAFI');
  const [newDescription, setNewDescription] = useState('');

  // Parameter Modal State
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [activeModalityForParam, setActiveModalityForParam] = useState<{ id: string; name: string } | null>(null);
  const [activeParamToEdit, setActiveParamToEdit] = useState<TestParameter | null>(null);

  const filteredModalities = modalities.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          m.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleCreateCustomModality = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;

    const profileId = newId || `custom-${Date.now()}`;
    const customProfile: RadiologyModalityProfile = {
      id: profileId,
      code: newCode,
      name: newName,
      nameEn: newNameEn || newName,
      category: newCategory,
      description: newDescription || 'Modalitas Kustom Baru',
      isConfigured: true,
      isCustom: true,
      equipmentFields: [
        { id: 'customField1', label: 'Spesifikasi Utama', type: 'text', required: true, group: 'special' }
      ],
      parameters: [
        {
          id: 'custom-kvp',
          code: 'PAR-CUST-01',
          name: 'Akurasi Parameter Utama',
          category: 'Eksposi',
          unit: 'kV / mGy',
          measurementType: 'numeric',
          testConditions: 'Kondisi Uji Standar',
          defaultSetPoints: [70, 90],
          numReadings: 3,
          toleranceType: 'percentage',
          toleranceMax: 10,
          formula: 'Deviasi Persentase',
          acceptanceRuleId: 'RULE-CUST-10',
          requiredInstrumentType: 'Multi-meter Radiologi',
          evidenceRequired: true,
          regulationReference: 'Regulasi Kustom Laboratory',
          regulationVersion: 'CUSTOM-2025',
          description: 'Deviasi parameter utama <= 10%.',
          isMandatory: true
        }
      ],
      physicalChecklist: [
        { id: 'cp1', code: 'P-CUST-01', title: 'Pemeriksaan Fisik Kustom', description: 'Memastikan kelayakan fisik alat', category: 'Fisik', isMandatory: true }
      ],
      radiationSafetyChecklist: [
        { id: 'cs1', code: 'S-CUST-01', title: 'Pemeriksaan Keselamatan Radiasi', description: 'Memastikan proteksi radiasi memadai', category: 'Keselamatan', isMandatory: true }
      ],
      requiredDocuments: [],
      requiredEvidence: [],
      requiredInstrumentTypes: [],
      regulationReferences: []
    };

    registerCustomModality(customProfile);
    setModalities([...MASTER_RADIOLOGY_MODALITIES]);
    setIsModalOpen(false);

    // Reset Form
    setNewId('');
    setNewName('');
    setNewNameEn('');
    setNewCode('');
    setNewDescription('');
  };

  const handleCloneModality = (modality: RadiologyModalityProfile) => {
    const uniqueSuffix = Math.random().toString(36).substring(2, 9);
    const cloned: RadiologyModalityProfile = {
      ...modality,
      id: `${modality.id}-copy-${uniqueSuffix}`,
      code: `${modality.code}-COPY`,
      name: `${modality.name} (Salinan)`,
      isCustom: true
    };
    registerCustomModality(cloned);
    setModalities([...MASTER_RADIOLOGY_MODALITIES]);
  };

  const handleDeleteModalityProfile = (modalityId: string, modalityName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus profile modality "${modalityName}"?`)) {
      deleteModalityProfile(modalityId);
      setModalities([...MASTER_RADIOLOGY_MODALITIES]);
    }
  };

  const toggleExpandModality = (id: string) => {
    setExpandedModalityIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleOpenAddParam = (modality: RadiologyModalityProfile) => {
    setActiveModalityForParam({ id: modality.id, name: modality.name });
    setActiveParamToEdit(null);
    setIsParamModalOpen(true);
  };

  const handleOpenEditParam = (modality: RadiologyModalityProfile, param: TestParameter) => {
    setActiveModalityForParam({ id: modality.id, name: modality.name });
    setActiveParamToEdit(param);
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
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-500 rounded-full text-xs font-bold uppercase tracking-widest mb-2 font-mono">
            <Settings className="w-3.5 h-3.5" /> Administrator Configuration Engine
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
            Master Modality Admin
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kelola catalog modalitas radiologi, konfigurasi parameter, dan penambahan modalitas kustom baru.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Tambah Modality Baru
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-3xl shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari modalitas, kode, atau kategori..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl pl-11 pr-4 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['ALL', 'RADIOGRAFI', 'DENTAL_RADIOGRAPHY', 'MAMMOGRAPHY', 'FLUOROSCOPY', 'ANGIOGRAPHY_INTERVENTIONAL', 'COMPUTED_TOMOGRAPHY', 'SPECIAL_PROCEDURES'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase font-mono transition-all cursor-pointer shrink-0 ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 shadow-md'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Modalities Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredModalities.map((modality) => {
          const isExpanded = expandedModalityIds.includes(modality.id);
          return (
            <div 
              key={modality.id} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    {modality.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {modality.isCustom && (
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        KUSTOM
                      </span>
                    )}
                    {modality.isCustom && (
                      <button
                        onClick={() => handleDeleteModalityProfile(modality.id, modality.name)}
                        title="Hapus Profile Modality"
                        className="p-1 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {modality.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {modality.description}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] font-mono bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <div>
                    <span className="text-slate-400 block">Field:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{modality.equipmentFields.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Parameter:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{modality.parameters.length}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Status:</span>
                    <span className="font-bold text-emerald-500">READY</span>
                  </div>
                </div>
              </div>

              {/* Parameter Expandable Drawer */}
              {isExpanded && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-cyan-400">Daftar Parameter ({modality.parameters.length})</span>
                    <button
                      onClick={() => handleOpenAddParam(modality)}
                      className="px-2.5 py-1 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold rounded-lg text-[9px] uppercase flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Tambah
                    </button>
                  </div>

                  {modality.parameters.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">Belum ada parameter uji terdaftar.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {modality.parameters.map((p) => (
                        <div key={p.id} className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-900 dark:text-white block truncate">{p.name}</span>
                            <span className="text-[9px] text-slate-400 font-mono block">
                              {p.category} • {p.unit} • Toleransi ±{p.toleranceMax ?? 10}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEditParam(modality, p)}
                              title="Edit Parameter"
                              className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Hapus parameter "${p.name}"?`)) {
                                  deleteParameterFromModality(modality.id, p.id);
                                  setModalities([...MASTER_RADIOLOGY_MODALITIES]);
                                }
                              }}
                              title="Hapus Parameter"
                              className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleExpandModality(modality.id)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase font-mono rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  {isExpanded ? 'Tutup Parameter' : 'Kelola Parameter'}
                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenAddParam(modality)}
                    title="Tambah Parameter Baru"
                    className="px-2.5 py-1.5 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-bold text-[10px] uppercase font-mono rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Parameter
                  </button>

                  <button
                    onClick={() => handleCloneModality(modality)}
                    title="Duplikasi Profile"
                    className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-500" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Modality Baru */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl shadow-2xl p-6 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase font-mono tracking-wider">
                    Tambah Modalitas Kustom Baru
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Membuat profile modalitas radiologi kustom baru ke dalam platform.
                  </p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateCustomModality} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Kode Modalitas (cth: UKES-CUST-XRAY)</label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={e => setNewCode(e.target.value)}
                    placeholder="UKES-RAD-CUSTOM"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Nama Modalitas (Indonesia)</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Pesawat Sinar-X Kustom BAPETEN"
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Kategori Modalitas</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as ModalityCategory)}
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white font-mono"
                  >
                    <option value="RADIOGRAFI">RADIOGRAFI</option>
                    <option value="DENTAL_RADIOGRAPHY">DENTAL RADIOGRAPHY</option>
                    <option value="MAMMOGRAPHY">MAMMOGRAPHY</option>
                    <option value="FLUOROSCOPY">FLUOROSCOPY</option>
                    <option value="ANGIOGRAPHY_INTERVENTIONAL">ANGIOGRAPHY / INTERVENTIONAL</option>
                    <option value="COMPUTED_TOMOGRAPHY">COMPUTED TOMOGRAPHY (CT SCAN)</option>
                    <option value="SPECIAL_PROCEDURES">SPECIAL PROCEDURES</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Deskripsi Modalitas</label>
                  <textarea
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Deskripsi singkat ruang lingkup pengujian..."
                    className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs font-medium text-slate-900 dark:text-white h-20"
                  />
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-xs uppercase"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/20"
                  >
                    Simpan Modality Baru
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
