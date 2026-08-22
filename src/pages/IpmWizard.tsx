import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Wrench, 
  ShieldCheck, 
  Save, 
  Plus, 
  Trash2, 
  Camera, 
  Package, 
  FileText,
  AlertTriangle,
  Stethoscope
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { IPM_TEMPLATES_CATALOG, getIpmTemplate } from '../data/ipmTemplatesCatalog';
import { evaluateIpmPerformance, determineOverallDeviceFitness } from '../lib/ipmCalculations';

const IPM_STEPS = [
  'Identitas Alat & RS',
  'Alat Ukur Master',
  'Pemeriksaan Fisik',
  'Uji Fungsi',
  'Keselamatan Listrik',
  'Pengujian Performa',
  'Tindakan Maintenance',
  'Spare Parts Used',
  'Dokumentasi Foto',
  'Pencatatan Temuan',
  'Evaluasi & Approval',
  'Finalisasi'
];

export function IpmWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // General Identity
  const [fasyankesName, setFasyankesName] = useState('RSUD Pratama Jakarta');
  const [roomName, setRoomName] = useState('Ruang ICU 01');
  const [templateId, setTemplateId] = useState<string>('infusion-pump');
  const [deviceName, setDeviceName] = useState('Infusion Pump');
  const [brand, setBrand] = useState('Terumo');
  const [model, setModel] = useState('TE-171');
  const [serialNumber, setSerialNumber] = useState('SN-INF-991');
  const [inventoryNo, setInventoryNo] = useState('INV-INF-001');

  // Master Instruments
  const [instrumentName, setInstrumentName] = useState('ESA612 Electrical Safety Analyzer (Fluke)');
  const [instrumentSN, setInstrumentSN] = useState('FLK-8821');

  // Checklists
  const [physicalResults, setPhysicalResults] = useState<Record<string, string>>({});
  const [functionalResults, setFunctionalResults] = useState<Record<string, string>>({});
  
  // Electrical Safety
  const [earthResistance, setEarthResistance] = useState<number>(0.08);
  const [insulationResistance, setInsulationResistance] = useState<number>(100);
  const [leakageCurrent, setLeakageCurrent] = useState<number>(45);

  // Performance Readings: paramId -> number[]
  const [performanceReadings, setPerformanceReadings] = useState<Record<string, number[]>>({});

  // Maintenance Checklist
  const [maintenanceDone, setMaintenanceDone] = useState<Record<string, boolean>>({});

  // Spare Parts
  const [selectedParts, setSelectedParts] = useState<Array<{ name: string; qty: number; code: string }>>([]);

  // Photos
  const [photos, setPhotos] = useState<Array<{ title: string; dataUrl: string }>>([]);

  // Findings
  const [findings, setFindings] = useState<string>('');

  const template = getIpmTemplate(templateId) || IPM_TEMPLATES_CATALOG[0];

  useEffect(() => {
    if (template) {
      const pInit: Record<string, string> = {};
      template.physicalChecklist.forEach(i => pInit[i] = 'OK');
      setPhysicalResults(pInit);

      const fInit: Record<string, string> = {};
      template.functionalChecklist.forEach(i => fInit[i] = 'OK');
      setFunctionalResults(fInit);

      const mInit: Record<string, boolean> = {};
      template.maintenanceActions.forEach(i => mInit[i] = true);
      setMaintenanceDone(mInit);

      const perfInit: Record<string, number[]> = {};
      template.performanceParameters.forEach(param => {
        perfInit[param.id] = Array(param.numReadings).fill(param.defaultPoints[0] || 100);
      });
      setPerformanceReadings(perfInit);
    }
  }, [templateId]);

  const handleReadingChange = (paramId: string, idx: number, val: number) => {
    setPerformanceReadings(prev => {
      const current = [...(prev[paramId] || [100])];
      current[idx] = val;
      return { ...prev, [paramId]: current };
    });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setPhotos(prev => [...prev, { title: file.name, dataUrl: evt.target?.result as string }]);
    };
    reader.readAsDataURL(file);
  };

  const evaluations = template.performanceParameters.map(param => {
    const readings = performanceReadings[param.id] || [param.defaultPoints[0] || 100];
    return evaluateIpmPerformance(
      param.id,
      param.name,
      param.unit,
      param.defaultPoints[0] || 100,
      readings,
      param.toleranceMin,
      param.toleranceMax,
      param.tolerancePercentage
    );
  });

  const fitnessStatus = determineOverallDeviceFitness(
    physicalResults,
    functionalResults,
    { passed: earthResistance <= 0.2 && insulationResistance >= 2.0 && leakageCurrent <= 500 },
    evaluations
  );

  const handleSaveWO = async (status: 'Draft' | 'Approved' = 'Draft') => {
    setLoading(true);
    try {
      const woData = {
        woNumber: `WO-IPM-${Date.now().toString().slice(-6)}`,
        fasyankesName,
        roomName,
        templateId,
        deviceName,
        brand,
        model,
        serialNumber,
        inventoryNo,
        riskLevel: template.riskLevel,
        category: template.category,
        instrumentName,
        instrumentSN,
        physicalResults,
        functionalResults,
        electricalResults: {
          earthResistance,
          insulationResistance,
          leakageCurrent,
          passed: earthResistance <= 0.2 && insulationResistance >= 2.0 && leakageCurrent <= 500
        },
        performanceReadings,
        evaluations,
        maintenanceDone,
        selectedParts,
        findings,
        fitnessStatus,
        status,
        ipmDate: new Date().toISOString().split('T')[0],
        technicianName: profile?.displayName || user?.email || 'Teknisi IPM',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'ipm_work_orders'), woData);
      setTimeout(() => {
        navigate('/ipm');
      }, 1000);
    } catch (err) {
      console.error('Error saving IPM WO:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
            <Wrench className="w-3.5 h-3.5" /> Field Maintenance Wizard
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase">
            IPM: {template.deviceName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveWO('Draft')}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-cyan-500" /> Simpan Draf
          </button>
        </div>
      </div>

      {/* Progress Wizard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {IPM_STEPS.map((sName, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                currentStep === idx
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : currentStep > idx
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                  : 'bg-slate-50 dark:bg-slate-800/40 text-slate-400'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-950/10 flex items-center justify-center text-[10px]">
                {idx + 1}
              </span>
              {sName}
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
        {/* STEP 1 */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap 1: Identitas Peralatan & Lokasi Fasyankes
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Pilih Templat Jenis Alat *</label>
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {IPM_TEMPLATES_CATALOG.map(t => (
                    <option key={t.id} value={t.id}>{t.deviceName} ({t.category})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nama Fasyankes / RS *</label>
                <input
                  type="text"
                  value={fasyankesName}
                  onChange={(e) => setFasyankesName(e.target.value)}
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
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nomor Seri (SN)</label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 & 4: Physical & Functional */}
        {(currentStep === 2 || currentStep === 3) && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap {currentStep + 1}: {currentStep === 2 ? 'Dynamic Visual & Physical Inspection' : 'Dynamic Functional Test Checklist'}
            </h3>

            <div className="space-y-3">
              {(currentStep === 2 ? template.physicalChecklist : template.functionalChecklist).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item}</span>
                  <select
                    value={currentStep === 2 ? (physicalResults[item] || 'OK') : (functionalResults[item] || 'OK')}
                    onChange={(e) => {
                      if (currentStep === 2) setPhysicalResults({ ...physicalResults, [item]: e.target.value });
                      else setFunctionalResults({ ...functionalResults, [item]: e.target.value });
                    }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="OK">OK (Baik)</option>
                    <option value="TIDAK_OK">Tidak OK (Kerusakan)</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Electrical Safety */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap 5: Pengujian Keselamatan Listrik (IEC 62353 / IEC 60601-1)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Resistansi Arde Pelindung (PE)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={earthResistance}
                    onChange={(e) => setEarthResistance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-400">Ohm (Max 0.2)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Resistansi Isolasi</label>
                <div className="relative">
                  <input
                    type="number"
                    value={insulationResistance}
                    onChange={(e) => setInsulationResistance(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-400">MOhm (Min 2.0)</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Arus Bocor Peralatan</label>
                <div className="relative">
                  <input
                    type="number"
                    value={leakageCurrent}
                    onChange={(e) => setLeakageCurrent(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-cyan-400">uA (Max 500)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Performance */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap 6: Pengujian Parameter Performa Alat
            </h3>

            <div className="space-y-6">
              {template.performanceParameters.map((param) => (
                <div key={param.id} className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-200/60 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase">{param.name}</h4>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{param.unit}</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {(performanceReadings[param.id] || [param.defaultPoints[0] || 100]).map((rVal, rIdx) => (
                      <input
                        key={rIdx}
                        type="number"
                        step="any"
                        value={rVal}
                        onChange={(e) => handleReadingChange(param.id, rIdx, parseFloat(e.target.value) || 0)}
                        className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white text-center"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 11 & 12: Finalization */}
        {(currentStep === 10 || currentStep === 11) && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap {currentStep + 1}: Finalisasi Status Kelayakan IPM
            </h3>

            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-black uppercase tracking-wider">Status Kelayakan Alat</h4>
                <span className="px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest bg-emerald-500 text-slate-950">
                  {fitnessStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Berdasarkan hasil pemeriksaan fisik, fungsi, keselamatan listrik, dan performa, alat diputuskan **{fitnessStatus}**.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => handleSaveWO('Approved')}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Selesaikan IPM & Terbitkan Sertifikat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="px-5 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-extrabold rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" /> Kembali
        </button>

        <button
          onClick={() => setCurrentStep(prev => Math.min(IPM_STEPS.length - 1, prev + 1))}
          disabled={currentStep === IPM_STEPS.length - 1}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-md shadow-cyan-500/20"
        >
          Lanjut <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
