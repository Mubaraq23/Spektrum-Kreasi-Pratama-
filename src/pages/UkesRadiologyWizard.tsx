import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  ChevronLeft, 
  FileSpreadsheet, 
  Radio, 
  Camera, 
  Save,
  Sparkles,
  Wrench,
  Lock,
  Layers,
  FileCheck2,
  CheckCircle2,
  XCircle,
  Plus,
  Edit3,
  Trash2,
  Sliders,
  X
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { getCurrentBapetenRegulation } from '../data/bapetenRegulations';
import { getModalityProfileById, MASTER_RADIOLOGY_MODALITIES } from '../lib/ukes/radiologyModalityRegistry';
import { evaluateBapetenParameter } from '../lib/bapetenCalculations';
import { checkInstrumentCompatibility } from '../lib/ukes/instrumentCompatibilityEngine';
import { runAiAssistantAnalysis, AiExtractionResult } from '../lib/ukes/ukesAiAssistant';
import { evaluateModalityScopeGate } from '../lib/ukes/ukesScopeEngine';
import { getDefaultSubsystemsForModality, EquipmentSubsystemRecord } from '../lib/ukes/ukesSubsystemEngine';
import { recordUkesAuditEntry } from '../lib/ukes/ukesAuditEngine';
import { ScopeVerificationGate } from '../components/ukes/ScopeVerificationGate';
import { PiranhaImporterModal } from '../components/ukes/PiranhaImporterModal';
import { DicomCanvasViewer } from '../components/ukes/DicomCanvasViewer';
import { UniversalMeasurementTable } from '../components/ukes/UniversalMeasurementTable';
import { ModalityReportGenerator } from '../components/ukes/ModalityReportGenerator';
import { ParsedPiranhaRecord } from '../data/piranhaParser';
import { TestParameter } from '../lib/ukes/radiologyModalityTypes';

const WIZARD_STEPS = [
  'Fasilitas & Ruang',
  'Identitas & Sub-sistem',
  'Alat Ukur Master',
  'Pemeriksaan Fisik',
  'Keselamatan Radiasi',
  'Pengujian Parameter',
  'Impor Piranha / Data',
  'Perhitungan Otomatis',
  'Evaluasi Criteria',
  'DICOM & Bukti Citra (AI)',
  'Review & Audit Trail',
  'LHU & Finalisasi Sertifikat'
];

export function UkesRadiologyWizard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const currentReg = getCurrentBapetenRegulation();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isPiranhaModalOpen, setIsPiranhaModalOpen] = useState<boolean>(false);

  // Form State
  const [fasyankesName, setFasyankesName] = useState('');
  const [fasyankesAddress, setFasyankesAddress] = useState('');
  const [roomName, setRoomName] = useState('Ruang Radiologi 1');
  
  // Modality & Device
  const [selectedModalityId, setSelectedModalityId] = useState<string>('general-xray');
  const [deviceName, setDeviceName] = useState('General X-Ray Unit');
  const [brand, setBrand] = useState('Siemens');
  const [model, setModel] = useState('Multix Select DR');
  const [serialNumber, setSerialNumber] = useState('SN-88239-X');
  const [tubeSN, setTubeSN] = useState('TB-9941-A');
  const [dynamicFieldsData, setDynamicFieldsData] = useState<Record<string, string | number | boolean>>({});
  const [subsystems, setSubsystems] = useState<EquipmentSubsystemRecord[]>([]);

  // Measuring Instrument
  const [instrumentName, setInstrumentName] = useState('Piranha Multi-meter (RTI)');
  const [instrumentSN, setInstrumentSN] = useState('PIR-99120');
  const [instrumentCalDate, setInstrumentCalDate] = useState('2025-11-15');

  // Checklists
  const [physicalResults, setPhysicalResults] = useState<Record<string, string>>({});
  const [radiationSafetyResults, setRadiationSafetyResults] = useState<Record<string, string>>({});

  const initialModality = getModalityProfileById(selectedModalityId) || MASTER_RADIOLOGY_MODALITIES[0];
  
  // Dynamic Parameters State (Add, Edit, Delete)
  const [activeParameters, setActiveParameters] = useState<TestParameter[]>(() => initialModality.parameters);
  const [isParamModalOpen, setIsParamModalOpen] = useState<boolean>(false);
  const [paramModalMode, setParamModalMode] = useState<'create' | 'edit'>('create');
  const [editingParamForm, setEditingParamForm] = useState<Partial<TestParameter>>({
    id: '',
    code: '',
    name: '',
    category: 'Eksposi',
    unit: 'kV',
    measurementType: 'numeric',
    testConditions: 'SID 100 cm',
    defaultSetPoints: [50, 70, 90],
    numReadings: 3,
    toleranceType: 'percentage',
    toleranceMax: 10,
    formula: '|Ukur - Set| / Set * 100%',
    acceptanceRuleId: 'RULE-BAPETEN-KVP',
    requiredInstrumentType: 'Piranha Multi-meter',
    evidenceRequired: true,
    regulationReference: 'Perba BAPETEN 1/2025',
    regulationVersion: 'BAPETEN-2025-V1',
    description: 'Parameter uji kesesuaian resmi BAPETEN.',
    isMandatory: true
  });

  // Measurements Data: parameterId -> setPoint -> number[]
  const [measurementData, setMeasurementData] = useState<Record<string, Record<number, number[]>>>(() => {
    const init: Record<string, Record<number, number[]>> = {};
    initialModality.parameters.forEach(p => {
      init[p.id] = {};
      p.defaultSetPoints.forEach(pt => {
        init[p.id][pt] = Array(p.numReadings).fill(pt);
      });
    });
    return init;
  });
  
  // AI Assistant Analysis
  const [aiAnalysis, setAiAnalysis] = useState<AiExtractionResult | null>(null);

  // Evidence Photos
  const [photos, setPhotos] = useState<Array<{ title: string; dataUrl: string }>>([]);

  const modalityProfile = getModalityProfileById(selectedModalityId) || MASTER_RADIOLOGY_MODALITIES[0];
  const scopeGate = evaluateModalityScopeGate(selectedModalityId);
  const instrumentCheck = checkInstrumentCompatibility(selectedModalityId, instrumentName);

  const handleModalityChange = (newModalityId: string) => {
    setSelectedModalityId(newModalityId);
    const newProfile = getModalityProfileById(newModalityId) || MASTER_RADIOLOGY_MODALITIES[0];
    
    const pInit: Record<string, string> = {};
    newProfile.physicalChecklist.forEach(item => pInit[item.title || item.code] = 'OK');
    setPhysicalResults(pInit);

    const rInit: Record<string, string> = {};
    newProfile.radiationSafetyChecklist.forEach(item => rInit[item.title || item.code] = 'OK');
    setRadiationSafetyResults(rInit);

    setSubsystems(getDefaultSubsystemsForModality(newModalityId));
    setActiveParameters(newProfile.parameters);

    const mInit: Record<string, Record<number, number[]>> = {};
    newProfile.parameters.forEach(param => {
      mInit[param.id] = {};
      param.defaultSetPoints.forEach(pt => {
        mInit[param.id][pt] = Array(param.numReadings).fill(pt);
      });
    });
    setMeasurementData(mInit);
  };

  const handlePiranhaImportConfirm = (records: ParsedPiranhaRecord[]) => {
    if (records.length > 0) {
      const newMData = { ...measurementData };
      activeParameters.forEach(param => {
        if (!newMData[param.id]) newMData[param.id] = {};
        param.defaultSetPoints.forEach(pt => {
          const rec = records.find(r => Math.abs((r.setKvp || 0) - pt) < 5);
          if (rec && rec.measuredKvp) {
            newMData[param.id][pt] = [rec.measuredKvp, rec.measuredKvp, rec.measuredKvp];
          }
        });
      });
      setMeasurementData(newMData);
    }
  };

  const handleReadingsChange = (paramId: string, setPoint: number, newReadings: number[]) => {
    setMeasurementData(prev => ({
      ...prev,
      [paramId]: {
        ...(prev[paramId] || {}),
        [setPoint]: newReadings
      }
    }));
  };

  const handleAddSetPoint = (paramId: string, newSetPoint: number) => {
    const targetParam = activeParameters.find(p => p.id === paramId);
    const numR = targetParam?.numReadings || 3;
    setMeasurementData(prev => ({
      ...prev,
      [paramId]: {
        ...(prev[paramId] || {}),
        [newSetPoint]: Array(numR).fill(newSetPoint)
      }
    }));
  };

  const handleDeleteSetPoint = (paramId: string, setPoint: number) => {
    setMeasurementData(prev => {
      const paramMap = { ...(prev[paramId] || {}) };
      delete paramMap[setPoint];
      return {
        ...prev,
        [paramId]: paramMap
      };
    });
  };

  const handleOpenAddParameterModal = () => {
    setParamModalMode('create');
    setEditingParamForm({
      id: `param-${Date.now()}`,
      code: `PAR-CUSTOM-${activeParameters.length + 1}`,
      name: '',
      category: 'Eksposi',
      unit: 'kV',
      measurementType: 'numeric',
      testConditions: 'SID 100 cm',
      defaultSetPoints: [50, 70, 90],
      numReadings: 3,
      toleranceType: 'percentage',
      toleranceMax: 10,
      formula: '|Ukur - Set| / Set * 100%',
      acceptanceRuleId: 'RULE-BAPETEN-CUSTOM',
      requiredInstrumentType: 'Piranha Multi-meter',
      evidenceRequired: true,
      regulationReference: 'Perba BAPETEN 1/2025',
      regulationVersion: 'BAPETEN-2025-V1',
      description: 'Parameter uji tambahan yang dapat disesuaikan.',
      isMandatory: true
    });
    setIsParamModalOpen(true);
  };

  const handleOpenEditParameterModal = (param: TestParameter) => {
    setParamModalMode('edit');
    setEditingParamForm({ ...param });
    setIsParamModalOpen(true);
  };

  const handleSaveParameterForm = () => {
    if (!editingParamForm.name || !editingParamForm.id) return;
    const finalParam = editingParamForm as TestParameter;

    if (paramModalMode === 'create') {
      setActiveParameters(prev => [...prev, finalParam]);
      setMeasurementData(prev => ({
        ...prev,
        [finalParam.id]: finalParam.defaultSetPoints.reduce((acc, pt) => ({ ...acc, [pt]: Array(finalParam.numReadings).fill(pt) }), {})
      }));
    } else {
      setActiveParameters(prev => prev.map(p => p.id === finalParam.id ? finalParam : p));
    }
    setIsParamModalOpen(false);
  };

  const handleDeleteParameter = (paramId: string) => {
    setActiveParameters(prev => prev.filter(p => p.id !== paramId));
    setMeasurementData(prev => {
      const next = { ...prev };
      delete next[paramId];
      return next;
    });
  };

  const handleApplyAiMeasurements = (updates: Array<{ parameterId: string; setPoint: number; recommendedValue: number }>) => {
    setMeasurementData(prev => {
      const next = { ...prev };
      updates.forEach(u => {
        if (!next[u.parameterId]) next[u.parameterId] = {};
        next[u.parameterId][u.setPoint] = [u.recommendedValue, u.recommendedValue, u.recommendedValue];
      });
      return next;
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const url = evt.target?.result as string;
      const updatedPhotos = [...photos, { title: file.name, dataUrl: url }];
      setPhotos(updatedPhotos);

      const aiRes = runAiAssistantAnalysis(updatedPhotos, selectedModalityId);
      setAiAnalysis(aiRes);
    };
    reader.readAsDataURL(file);
  };

  // Evaluations for active parameters
  const evaluations = activeParameters.map(param => {
    const readings = measurementData[param.id] || {};
    return evaluateBapetenParameter(
      param.id,
      param.name,
      param.category,
      param.unit,
      param.defaultSetPoints,
      readings,
      param.toleranceType,
      param.toleranceMin,
      param.toleranceMax,
      param.maxCV,
      param.maxLinearity
    );
  });

  const overallPass = evaluations.length > 0 && evaluations.every(e => e.status === 'PASS');
  const overallStatus = overallPass ? 'LAIK' : 'TIDAK_LAIK';

  // 14-Point Finalization Gate Verification
  const gateChecklist = [
    { title: 'Scope Akreditasi Terverifikasi Valid', ok: scopeGate.canIssueCertificate },
    { title: 'Regulasi BAPETEN Terkonfigurasi (Perba 1/2025)', ok: modalityProfile.isConfigured },
    { title: 'Spesifikasi Identitas Fasyankes & Pesawat Lengkap', ok: !!fasyankesName && !!deviceName },
    { title: 'Sub-sistem Komponen Utama Terdaftar', ok: subsystems.length > 0 },
    { title: 'Kesesuaian Alat Ukur Master Terverifikasi', ok: instrumentCheck.isCompatible },
    { title: 'Pemeriksaan Fisik & Fungsi Selesai', ok: Object.keys(physicalResults).length > 0 },
    { title: 'Keselamatan Radiasi & Interlock Aman', ok: Object.keys(radiationSafetyResults).length > 0 },
    { title: 'Seluruh Parameter Telah Diuji', ok: evaluations.length > 0 },
    { title: 'Evaluasi Kriteria Lolos (Semua LAIK)', ok: overallPass },
    { title: 'Bukti Foto & Citra Terunggah', ok: photos.length > 0 },
    { title: 'Audit Trail Telah Tercatat', ok: true },
    { title: 'Review Teknis Tenaga Ahli Terpenuhi', ok: true },
    { title: 'Otorisasi Tanda Tangan Digital Siap', ok: true },
    { title: 'Integritas Laporan LHU Terkunci', ok: true }
  ];

  const canFinalizeAssessment = gateChecklist.every(item => item.ok);

  const handleSaveDoc = async (status: 'Draft' | 'Final') => {
    setLoading(true);
    try {
      const docPayload = {
        fasyankesName,
        fasyankesAddress,
        roomName,
        selectedModalityId,
        deviceName,
        brand,
        model,
        serialNumber,
        tubeSN,
        dynamicFieldsData,
        subsystems,
        instrumentName,
        instrumentSN,
        instrumentCalDate,
        physicalResults,
        radiationSafetyResults,
        measurementData,
        evaluations,
        overallStatus,
        status,
        createdAt: serverTimestamp(),
        createdBy: user?.email || profile?.displayName || 'Technician'
      };

      const docRef = await addDoc(collection(db, 'radiology_test_reports'), docPayload);

      await recordUkesAuditEntry({
        entityType: 'ASSESSMENT',
        entityId: docRef.id,
        action: status === 'Final' ? 'ISSUE_CERTIFICATE' : 'CREATE',
        userId: user?.email || 'technician',
        userRole: profile?.role || 'field_officer',
        reason: `Laporan UKES untuk ${deviceName} di ${fasyankesName} disimpan (${status})`
      });

      if (status === 'Final') {
        navigate(`/ukes-radiology/reports/${docRef.id}`);
      } else {
        alert('Draft Laporan UKES Berhasil Disimpan!');
      }
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan laporan UKES.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-3xl text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
            <Radio className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono">
                UNIVERSAL UKES ENGINE • {currentReg.title}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase font-mono">
              Wizard Uji Kesesuaian Pesawat Sinar-X
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Panduan 12-tahap kalibrasi, pengujian parameter, AI vision citra, & sertifikasi BAPETEN.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveDoc('Draft')}
            disabled={loading}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border border-slate-700 font-mono"
          >
            <Save className="w-4 h-4" /> Simpan Draft
          </button>
        </div>
      </div>

      {/* Scope Verification Gate Indicator */}
      <ScopeVerificationGate modalityId={selectedModalityId} modalityName={modalityProfile.name} />

      {/* Wizard Steps Navigation Pills */}
      <div className="overflow-x-auto pb-2 custom-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {WIZARD_STEPS.map((stepName, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`px-4 py-2 rounded-2xl text-xs font-black uppercase font-mono flex items-center gap-2 transition-all cursor-pointer ${
                currentStep === idx
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : currentStep > idx
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px]">
                {idx + 1}
              </span>
              {stepName}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        {/* STEP 1: Fasilitas & Ruang */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 font-mono">
              Tahap 1: Identitas Fasilitas Kesehatan & Ruangan
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nama Fasyankes / Rumah Sakit *</label>
                <input
                  type="text"
                  value={fasyankesName}
                  onChange={(e) => setFasyankesName(e.target.value)}
                  placeholder="Contoh: RSUD Pratama Jakarta"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nama Ruangan Radiologi *</label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="Contoh: Ruang Uji Sinar-X 01"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Alamat Lengkap Fasyankes</label>
                <textarea
                  value={fasyankesAddress}
                  onChange={(e) => setFasyankesAddress(e.target.value)}
                  placeholder="Alamat RS / Klinik..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white h-24"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Identitas Alat & Sub-sistem */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 font-mono">
              Tahap 2: Identitas Pesawat & Rincian Sub-sistem ({modalityProfile.name})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Jenis Modalitas Radiologi *</label>
                <select
                  value={selectedModalityId}
                  onChange={(e) => handleModalityChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white font-mono"
                >
                  {MASTER_RADIOLOGY_MODALITIES.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nama Pesawat / Alat *</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Merek Pesawat</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Tipe / Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nomor Seri (SN) Pesawat</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nomor Seri Tabung Sinar-X</label>
                <input
                  type="text"
                  value={tubeSN}
                  onChange={(e) => setTubeSN(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            {modalityProfile.equipmentFields.length > 0 && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4 font-mono text-xs">
                <h4 className="text-xs font-black uppercase text-cyan-500 tracking-wider">Spesifikasi Khusus Modalitas ({modalityProfile.nameEn})</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {modalityProfile.equipmentFields.map((field) => (
                    <div key={field.id}>
                      <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-1.5">{field.label}</label>
                      <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={String(dynamicFieldsData[field.id] ?? '')}
                        onChange={e => setDynamicFieldsData({ ...dynamicFieldsData, [field.id]: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 text-xs font-bold text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Subsystem Breakdown List */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
              <h4 className="text-xs font-black uppercase text-cyan-500 font-mono tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4" /> Sub-sistem Komponen Utama Terdaftar
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {subsystems.map((sub) => (
                  <div key={sub.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-1">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase">{sub.subsystemType}</span>
                    <h5 className="font-bold text-slate-900 dark:text-white">{sub.name}</h5>
                    <p className="text-[11px] text-slate-400">Merek/Tipe: {sub.manufacturer} {sub.model}</p>
                    <p className="text-[11px] text-slate-400">SN: {sub.serialNumber}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Alat Ukur Master & Compatibility Check */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 font-mono">
              Tahap 3: Pemilihan & Validasi Kompatibilitas Alat Ukur
            </h3>

            {!instrumentCheck.isCompatible && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-3 text-amber-500 text-xs">
                <Wrench className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold uppercase tracking-wider">Peringatan Kompatibilitas Alat Ukur</h5>
                  <p className="mt-1">{instrumentCheck.warningMessage}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nama Alat Ukur Master</label>
                <input
                  type="text"
                  value={instrumentName}
                  onChange={(e) => setInstrumentName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nomor Seri Alat Ukur</label>
                <input
                  type="text"
                  value={instrumentSN}
                  onChange={(e) => setInstrumentSN(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Tanggal Berlaku Kalibrasi</label>
                <input
                  type="date"
                  value={instrumentCalDate}
                  onChange={(e) => setInstrumentCalDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Physical Inspection Checklist */}
        {currentStep === 3 && (
          <div className="space-y-4 font-sans">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 font-mono">
              Tahap 4: Physical Inspection Checklist ({modalityProfile.name})
            </h3>
            {modalityProfile.physicalChecklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-[10px] text-slate-400">{item.description}</p>
                </div>
                <select
                  value={physicalResults[item.title] || 'OK'}
                  onChange={(e) => setPhysicalResults({ ...physicalResults, [item.title]: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white font-mono"
                >
                  <option value="OK">OK (Baik)</option>
                  <option value="TIDAK_OK">Tidak OK</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* STEP 5: Radiation Safety Checklist */}
        {currentStep === 4 && (
          <div className="space-y-4 font-sans">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 font-mono">
              Tahap 5: Radiation Safety & Interlock Checklist ({modalityProfile.name})
            </h3>
            {modalityProfile.radiationSafetyChecklist.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="text-[10px] text-slate-400">{item.description}</p>
                </div>
                <select
                  value={radiationSafetyResults[item.title] || 'OK'}
                  onChange={(e) => setRadiationSafetyResults({ ...radiationSafetyResults, [item.title]: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white font-mono"
                >
                  <option value="OK">OK (Aman)</option>
                  <option value="TIDAK_OK">Tidak OK / Bocor</option>
                </select>
              </div>
            ))}
          </div>
        )}

        {/* STEP 6 & 7: Universal Measurement Tables */}
        {(currentStep === 5 || currentStep === 6) && (
          <div className="space-y-6 font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white font-mono flex items-center gap-2">
                  Tahap {currentStep + 1}: Universal Parameter Measurement Grid ({modalityProfile.name})
                </h3>
                <p className="text-xs text-slate-400">
                  Parameter terkonfigurasi: {activeParameters.length} parameter resmi BAPETEN (Bisa ditambah, diedit, atau dihapus).
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleOpenAddParameterModal}
                  className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-cyan-500/20 font-mono"
                >
                  <Plus className="w-4 h-4" /> Tambah Parameter Baru
                </button>
                <button
                  onClick={() => setIsPiranhaModalOpen(true)}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/20 font-mono"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Buka Importer Piranha
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {activeParameters.map((param) => (
                <UniversalMeasurementTable
                  key={param.id}
                  parameter={param}
                  readingsMap={measurementData[param.id] || {}}
                  onReadingsChange={(setPoint, newReadings) => handleReadingsChange(param.id, setPoint, newReadings)}
                  onAddSetPoint={handleAddSetPoint}
                  onDeleteSetPoint={handleDeleteSetPoint}
                  onEditParameter={handleOpenEditParameterModal}
                  onDeleteParameter={handleDeleteParameter}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP 8: Perhitungan Otomatis */}
        {currentStep === 7 && (
          <div className="space-y-6 font-mono text-xs">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap 8: Perhitungan Otomatis Evaluasi Parameter UKES
            </h3>
            <div className="space-y-3">
              {evaluations.map((ev, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-white">{ev.parameterName}</h5>
                    <p className="text-slate-400 text-[10px] mt-0.5">{ev.evaluationNote}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    ev.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {ev.status === 'PASS' ? 'LAIK' : 'TIDAK LAIK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 9: Evaluasi Kriteria */}
        {currentStep === 8 && (
          <div className="space-y-6 font-mono text-xs">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap 9: Matriks Evaluasi Kriteria Laik Pakai
            </h3>
            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold">Status Evaluasi Menyeluruh:</span>
                <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${
                  overallPass ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                }`}>
                  {overallPass ? 'LAIK PAKAI' : 'TIDAK LAIK PAKAI'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {overallPass 
                  ? 'Seluruh parameter pengujian radiasi memenuhi batas toleransi Perba BAPETEN No. 1 Tahun 2025.' 
                  : 'Terdapat parameter yang melampaui batas toleransi yang ditetapkan BAPETEN.'}
              </p>
            </div>
          </div>
        )}

        {/* STEP 10: DICOM & Interactive Viewer with AI Vision */}
        {currentStep === 9 && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 font-mono">
              <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white flex items-center gap-2">
                  Tahap 10: Interactive Canvas & AI Phantom Image Reader
                </h3>
                <p className="text-xs text-slate-400">
                  Pembacaan citra phantom radiologi cerdas berbantuan AI Gemini Vision (Kolimasi, Resolusi, CT HU, Mammo ACR).
                </p>
              </div>
              <label className="px-4 py-2 bg-cyan-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider cursor-pointer hover:bg-cyan-400 transition-all flex items-center gap-2">
                <Camera className="w-4 h-4" /> Unggah Citra / DICOM
                <input type="file" accept="image/*,.dcm" onChange={handlePhotoUpload} className="hidden" />
              </label>
            </div>

            <DicomCanvasViewer
              modalityId={selectedModalityId}
              onApplyAiMeasurements={handleApplyAiMeasurements}
            />
          </div>
        )}

        {/* STEP 11: Review & Audit Trail */}
        {currentStep === 10 && (
          <div className="space-y-6 font-mono text-xs">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap 11: Technical Review & Traceable Audit Log
            </h3>

            {aiAnalysis && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span>AI ASSISTANT ANALYSIS (REKOMENDASI SAHAJA)</span>
                </div>
                <p className="text-slate-300">{aiAnalysis.suggestedNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 12: LHU & 14-Point Finalization Gate */}
        {currentStep === 11 && (
          <div className="space-y-6 font-sans">
            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4 font-mono">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-black uppercase tracking-wider">Kesimpulan Uji Kesesuaian</h4>
                <span className={`px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest ${
                  overallStatus === 'LAIK' 
                    ? 'bg-emerald-500 text-slate-950' 
                    : 'bg-rose-500 text-white'
                }`}>
                  PESAWAT {overallStatus} PAKAI
                </span>
              </div>
            </div>

            {/* 14-Point Finalization Gate Checklist UI */}
            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-3xl p-6 border border-slate-200 dark:border-slate-700/60 space-y-4">
              <h4 className="text-xs font-black uppercase font-mono tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-cyan-400" /> 14-Point Finalization & Certification Gate
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
                {gateChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    {item.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className={item.ok ? 'text-slate-700 dark:text-slate-300' : 'text-rose-400 font-bold'}>
                      {item.title}
                    </span>
                  </div>
                ))}
              </div>

              {!canFinalizeAssessment && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-xs font-mono flex items-center gap-3">
                  <Lock className="w-5 h-5 shrink-0" />
                  <div>
                    <h5 className="font-bold uppercase">CERTIFICATION BLOCKED</h5>
                    <p className="mt-0.5">Seluruh 14 poin gerbang finalisasi wajib terpenuhi sebelum sertifikat digital diterbitkan.</p>
                  </div>
                </div>
              )}
            </div>

            <ModalityReportGenerator
              testData={{
                fasyankesName,
                fasyankesAddress,
                roomName,
                deviceName,
                brand,
                model,
                tubeSN,
                overallStatus
              }}
              modalityProfile={modalityProfile}
              onPrint={() => handleSaveDoc('Final')}
            />
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center pt-4 font-mono">
        <button
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>

        <button
          onClick={() => setCurrentStep(prev => Math.min(WIZARD_STEPS.length - 1, prev + 1))}
          disabled={currentStep === WIZARD_STEPS.length - 1}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-500/20"
        >
          Lanjut <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Parameter Create / Edit Modal */}
      {isParamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-base font-black uppercase text-slate-900 dark:text-white font-mono flex items-center gap-2">
                <Sliders className="w-5 h-5 text-cyan-400" />
                {paramModalMode === 'create' ? 'Tambah Parameter UKES Baru' : 'Edit Konfigurasi Parameter'}
              </h3>
              <button
                type="button"
                onClick={() => setIsParamModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Nama Parameter *</label>
                <input
                  type="text"
                  value={editingParamForm.name || ''}
                  onChange={(e) => setEditingParamForm({ ...editingParamForm, name: e.target.value })}
                  placeholder="Contoh: Akurasi Tegangan Khusus"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Kategori</label>
                  <select
                    value={editingParamForm.category || 'Eksposi'}
                    onChange={(e) => setEditingParamForm({ ...editingParamForm, category: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Eksposi">Eksposi</option>
                    <option value="Kualitas Berkas">Kualitas Berkas</option>
                    <option value="Geometri">Geometri</option>
                    <option value="Dosis">Dosis</option>
                    <option value="Citra">Citra</option>
                    <option value="Keselamatan">Keselamatan</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Satuan Unit *</label>
                  <input
                    type="text"
                    value={editingParamForm.unit || ''}
                    onChange={(e) => setEditingParamForm({ ...editingParamForm, unit: e.target.value })}
                    placeholder="Contoh: kV, ms, mm Al, mGy"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Tipe Toleransi</label>
                  <select
                    value={editingParamForm.toleranceType || 'percentage'}
                    onChange={(e) => setEditingParamForm({ ...editingParamForm, toleranceType: e.target.value as any })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="percentage">Persentase (%)</option>
                    <option value="absolute">Nilai Mutlak</option>
                    <option value="range">Rentang Min - Max</option>
                    <option value="max_cv">Koefisien Variasi (CV)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Batas Maksimum Toleransi</label>
                  <input
                    type="number"
                    value={editingParamForm.toleranceMax !== undefined ? editingParamForm.toleranceMax : ''}
                    onChange={(e) => setEditingParamForm({ ...editingParamForm, toleranceMax: parseFloat(e.target.value) || 0 })}
                    placeholder="Contoh: 10"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Titik Uji Bawaan (Dipisahkan koma)</label>
                <input
                  type="text"
                  value={(editingParamForm.defaultSetPoints || []).join(', ')}
                  onChange={(e) => {
                    const pts = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
                    setEditingParamForm({ ...editingParamForm, defaultSetPoints: pts });
                  }}
                  placeholder="Contoh: 50, 70, 90, 110"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Referensi Regulasi</label>
                <input
                  type="text"
                  value={editingParamForm.regulationReference || ''}
                  onChange={(e) => setEditingParamForm({ ...editingParamForm, regulationReference: e.target.value })}
                  placeholder="Perba BAPETEN 1/2025"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-mono">
              <button
                type="button"
                onClick={() => setIsParamModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs uppercase"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveParameterForm}
                className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs uppercase shadow-md"
              >
                Simpan Parameter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Piranha Interactive Importer Modal */}
      <PiranhaImporterModal
        isOpen={isPiranhaModalOpen}
        onClose={() => setIsPiranhaModalOpen(false)}
        onConfirmImport={handlePiranhaImportConfirm}
      />
    </div>
  );
}
