import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Wrench, 
  ShieldAlert, 
  Save, 
  Plus, 
  Trash2, 
  Camera, 
  Package, 
  FileText,
  AlertTriangle,
  Stethoscope,
  DollarSign,
  UserCheck
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { FAILURE_CODES_CATALOG, getRepairTemplate } from '../data/repairMasterCatalog';
import { calculateRepairCost, calculateDowntimeHours, evaluateFinalRepairStatus } from '../lib/repairCalculations';

const REPAIR_STEPS = [
  'Laporan Kerusakan',
  'Status Awal Alat',
  'Pemeriksaan Awal',
  'Diagnosis & Error',
  'Root Cause Analysis',
  'Rencana Perbaikan',
  'Spare Parts Used',
  'Vendor Subkontrak',
  'Testing Pasca Repair',
  'Trigger Kalibrasi/UKES',
  'Verifikasi Reviewer',
  'Finalisasi Report'
];

export function RepairWizard() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, profile } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Identity
  const [fasyankesName, setFasyankesName] = useState('RSUD Pratama Jakarta');
  const [roomName, setRoomName] = useState('Ruang Bedah 02');
  const [deviceName, setDeviceName] = useState('Patient Monitor (Bedside)');
  const [brand, setBrand] = useState('Mindray');
  const [model, setModel] = useState('uMEC12');
  const [serialNumber, setSerialNumber] = useState('SN-MON-7721');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium' | 'Low'>('High');

  // Issue & Symptom
  const [symptomNote, setSymptomNote] = useState('Display SpO2 & NIBP tidak muncul pada layar.');
  const [initialStatus, setInitialStatus] = useState('RUSAK');

  // Diagnosis
  const [failureCode, setFailureCode] = useState('ERR-SEN-003');
  const [diagnosisNote, setDiagnosisNote] = useState('Modul sensor board SpO2 mengalami korosi akibat ceceran cairan.');

  // Root Cause
  const [rootCause, setRootCause] = useState('Ceceran cairan pembersih yang masuk ke dalam rongga konektor probe.');

  // Actions & Parts
  const [actionDone, setActionDone] = useState('Penggantian modul board SpO2 & pembersihan konektor internal.');
  const [laborCost, setLaborCost] = useState(250000);
  const [sparePartCost, setSparePartCost] = useState(650000);
  const [vendorCost, setVendorCost] = useState(0);

  // Testing & Verification
  const [functionalTestPassed, setFunctionalTestPassed] = useState(true);
  const [electricalSafetyPassed, setElectricalSafetyPassed] = useState(true);
  const [requiresCalibration, setRequiresCalibration] = useState(true);
  const [requiresUkes, setRequiresUkes] = useState(false);

  const costBreakdown = calculateRepairCost(laborCost, sparePartCost, vendorCost, 0);
  const finalStatus = evaluateFinalRepairStatus(
    functionalTestPassed,
    electricalSafetyPassed,
    requiresCalibration,
    requiresUkes
  );

  const handleSaveWO = async (status: 'Reported' | 'Completed' = 'Reported') => {
    setLoading(true);
    try {
      const woData = {
        woNumber: `WO-REP-${Date.now().toString().slice(-6)}`,
        fasyankesName,
        roomName,
        deviceName,
        brand,
        model,
        serialNumber,
        priority,
        symptomNote,
        initialStatus,
        failureCode,
        diagnosisNote,
        rootCause,
        actionDone,
        laborCost,
        sparePartCost,
        vendorCost,
        totalCost: costBreakdown.totalCost,
        downtimeHours: 24,
        functionalTestPassed,
        electricalSafetyPassed,
        requiresCalibration,
        requiresUkes,
        finalStatus,
        status,
        reportDate: new Date().toISOString().split('T')[0],
        technicianName: profile?.displayName || user?.email || 'Teknisi Perbaikan',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'repair_work_orders'), woData);
      setTimeout(() => {
        navigate('/repair');
      }, 1000);
    } catch (err) {
      console.error('Error saving Repair WO:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest mb-2">
            <Wrench className="w-3.5 h-3.5" /> Corrective Maintenance Wizard
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white uppercase">
            Perbaikan: {deviceName}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveWO('Reported')}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4 text-rose-500" /> Simpan Laporan
          </button>
        </div>
      </div>

      {/* Progress Wizard */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 shadow-sm overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max">
          {REPAIR_STEPS.map((sName, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                currentStep === idx
                  ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/20'
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
        {/* STEP 1 & 2 */}
        {(currentStep === 0 || currentStep === 1) && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap {currentStep + 1}: Laporan Kerusakan & Status Awal Alat
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Nama Alat Kesehatan *</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Prioritas Kerusakan</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="Critical">Critical (Sangat Kritis)</option>
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Status Awal Alat</label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                >
                  <option value="RUSAK">RUSAK TOTAL</option>
                  <option value="TERGANGGU">TERGANGGU / PARSIAL</option>
                  <option value="JANGAN_DIGUNAKAN">JANGAN DIGUNAKAN (BAHAYA)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Keluhan & Gejala Kerusakan</label>
                <textarea
                  value={symptomNote}
                  onChange={(e) => setSymptomNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white h-24"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 & 5: Diagnosis & Root Cause */}
        {(currentStep === 3 || currentStep === 4) && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap {currentStep + 1}: Diagnosis Kerusakan & Root Cause Analysis
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Failure Code Kategori Kerusakan</label>
                <select
                  value={failureCode}
                  onChange={(e) => setFailureCode(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white"
                >
                  {FAILURE_CODES_CATALOG.map(fc => (
                    <option key={fc.code} value={fc.code}>[{fc.code}] {fc.name} ({fc.category})</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Hasil Diagnosis & Troublehooting Teknisi</label>
                <textarea
                  value={diagnosisNote}
                  onChange={(e) => setDiagnosisNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white h-24"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">Penyebab Utama (Root Cause)</label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-xs font-bold text-slate-900 dark:text-white h-24"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 9 & 10: Testing & Triggers */}
        {(currentStep === 8 || currentStep === 9) && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap {currentStep + 1}: Pengujian Pasca Perbaikan & Pemicu Kalibrasi/UKES
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Uji Fungsi Utama (Functional Test)</span>
                <input
                  type="checkbox"
                  checked={functionalTestPassed}
                  onChange={(e) => setFunctionalTestPassed(e.target.checked)}
                  className="w-5 h-5 text-rose-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Uji Kesesuaian Keselamatan Listrik</span>
                <input
                  type="checkbox"
                  checked={electricalSafetyPassed}
                  onChange={(e) => setElectricalSafetyPassed(e.target.checked)}
                  className="w-5 h-5 text-rose-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                <span className="text-xs font-bold text-amber-400">Rekomendasi Kalibrasi Ulang KAN Pasca Perbaikan</span>
                <input
                  type="checkbox"
                  checked={requiresCalibration}
                  onChange={(e) => setRequiresCalibration(e.target.checked)}
                  className="w-5 h-5 text-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl">
                <span className="text-xs font-bold text-cyan-400">Rekomendasi UKES Radiologi BAPETEN Ulang</span>
                <input
                  type="checkbox"
                  checked={requiresUkes}
                  onChange={(e) => setRequiresUkes(e.target.checked)}
                  className="w-5 h-5 text-cyan-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 11 & 12: Finalization */}
        {(currentStep === 10 || currentStep === 11) && (
          <div className="space-y-6">
            <h3 className="text-base font-black uppercase text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
              Tahap {currentStep + 1}: Finalisasi & Penentuan Status Akhir Alat
            </h3>

            <div className="p-6 bg-slate-900 text-white rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-black uppercase tracking-wider">Status Akhir Peralatan</h4>
                <span className="px-5 py-2 rounded-full text-sm font-black uppercase tracking-widest bg-emerald-500 text-slate-950">
                  {finalStatus}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Total Biaya Perbaikan: **Rp {costBreakdown.totalCost.toLocaleString('id-ID')}**. Status akhir ditentukan sebagai **{finalStatus}**.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => handleSaveWO('Completed')}
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Selesaikan Perbaikan & Terbitkan Service Report
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
          onClick={() => setCurrentStep(prev => Math.min(REPAIR_STEPS.length - 1, prev + 1))}
          disabled={currentStep === REPAIR_STEPS.length - 1}
          className="px-6 py-3 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cursor-pointer shadow-md shadow-rose-500/20"
        >
          Lanjut <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
