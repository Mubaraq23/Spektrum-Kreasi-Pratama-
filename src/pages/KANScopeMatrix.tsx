import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Activity, 
  Thermometer, 
  Zap, 
  Gauge, 
  Wind, 
  Layers, 
  Sliders,
  Award,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  CheckCircle2
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ScopeItem {
  id: string;
  category: string;
  measurand: string;
  rangeMin: number;
  rangeMax: number;
  unit: string;
  cmcValue: number;
  cmcUnit: string;
  methodStandard: string;
  masterCalibrator: string;
}

const INITIAL_SCOPE_ITEMS: ScopeItem[] = [
  {
    id: 'p-1',
    category: 'Tekanan & Vakum (Pressure & Vacuum)',
    measurand: 'Tekanan Darah Non-Invasif (NIBP Simulator)',
    rangeMin: 0,
    rangeMax: 300,
    unit: 'mmHg',
    cmcValue: 0.5,
    cmcUnit: 'mmHg',
    methodStandard: 'MK-SKP-01 (IK-NIBP-01) • OIML R 16-2 / ISO 81060-2',
    masterCalibrator: 'Digital Pressure Calibrator / NIBP Analyzer (S/N: DPC-9901)'
  },
  {
    id: 'p-2',
    category: 'Tekanan & Vakum (Pressure & Vacuum)',
    measurand: 'Tekanan Suction Pump / Vacuum Regulator',
    rangeMin: -760,
    rangeMax: 0,
    unit: 'mmHg',
    cmcValue: 1.2,
    cmcUnit: 'mmHg',
    methodStandard: 'MK-SKP-02 (IK-VAC-01) • ISO 10079-1',
    masterCalibrator: 'Precision Digital Vacuum Gauge (S/N: VG-4402)'
  },
  {
    id: 't-1',
    category: 'Suhu & Kelembaban (Thermal & Humidity)',
    measurand: 'Suhu Suasana Infant Incubator / Radiant Warmer',
    rangeMin: 20,
    rangeMax: 45,
    unit: '°C',
    cmcValue: 0.15,
    cmcUnit: '°C',
    methodStandard: 'MK-SKP-05 (IK-INC-01) • IEC 60601-2-19',
    masterCalibrator: 'Multi-Channel Pt100 Temperature Data Logger (S/N: TL-8012)'
  },
  {
    id: 't-2',
    category: 'Suhu & Kelembaban (Thermal & Humidity)',
    measurand: 'Suhu Refrigerator Medis / Blood Bank Ref',
    rangeMin: -20,
    rangeMax: 15,
    unit: '°C',
    cmcValue: 0.20,
    cmcUnit: '°C',
    methodStandard: 'MK-SKP-06 (IK-REF-01) • DKD-R 5-7',
    masterCalibrator: 'Calibrated Standard Reference Thermometer (S/N: RT-1090)'
  },
  {
    id: 'e-1',
    category: 'Kelistrikan & Keselamatan Listrik (Electrical Safety & Signals)',
    measurand: 'Arus Bocor Pasien & Earth Leakage Current',
    rangeMin: 0.1,
    rangeMax: 10000,
    unit: 'µA',
    cmcValue: 1.5,
    cmcUnit: '%',
    methodStandard: 'MK-SKP-10 (IK-SAF-01) • IEC 60601-1 / IEC 62353',
    masterCalibrator: 'Electrical Safety Analyzer Standard (S/N: ESA-3000)'
  },
  {
    id: 'e-2',
    category: 'Kelistrikan & Keselamatan Listrik (Electrical Safety & Signals)',
    measurand: 'Laju Detak Jantung Simulated ECG Signal',
    rangeMin: 30,
    rangeMax: 300,
    unit: 'BPM',
    cmcValue: 0.5,
    cmcUnit: 'BPM',
    methodStandard: 'MK-SKP-11 (IK-ECG-01) • EC13 / IEC 60601-2-27',
    masterCalibrator: 'Multi-Parameter Patient Simulator (S/N: MPS-700)'
  },
  {
    id: 'e-3',
    category: 'Kelistrikan & Keselamatan Listrik (Electrical Safety & Signals)',
    measurand: 'Energi Defibrillator Discharge Energy',
    rangeMin: 1,
    rangeMax: 360,
    unit: 'Joule',
    cmcValue: 1.8,
    cmcUnit: '%',
    methodStandard: 'MK-SKP-12 (IK-DEF-01) • IEC 60601-2-4',
    masterCalibrator: 'Precision Defibrillator Analyzer (S/N: DA-2000)'
  },
  {
    id: 'f-1',
    category: 'Volume & Laju Alir (Flow Rate & Infusion Volume)',
    measurand: 'Laju Alir Syringe & Infusion Pump',
    rangeMin: 0.1,
    rangeMax: 1000,
    unit: 'mL/h',
    cmcValue: 1.0,
    cmcUnit: '%',
    methodStandard: 'MK-SKP-15 (IK-INF-01) • IEC 60601-2-24',
    masterCalibrator: 'Infusion Device Analyzer / Gravimetric Balance (S/N: IDA-500)'
  },
  {
    id: 'f-2',
    category: 'Volume & Laju Alir (Flow Rate & Infusion Volume)',
    measurand: 'Kecepatan Putar Centrifuge Klinik',
    rangeMin: 100,
    rangeMax: 15000,
    unit: 'RPM',
    cmcValue: 0.5,
    cmcUnit: '%',
    methodStandard: 'MK-SKP-16 (IK-CEN-01) • BS ISO 22718',
    masterCalibrator: 'Optical Laser Non-Contact Tachometer (S/N: LT-100)'
  }
];

export function KANScopeMatrix() {
  const { isAdmin, profile } = useAuth();
  const [scopeItems, setScopeItems] = useState<ScopeItem[]>(INITIAL_SCOPE_ITEMS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScopeItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ScopeItem | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    category: 'Tekanan & Vakum (Pressure & Vacuum)',
    measurand: '',
    rangeMin: 0,
    rangeMax: 100,
    unit: 'mmHg',
    cmcValue: 0.5,
    cmcUnit: 'mmHg',
    methodStandard: '',
    masterCalibrator: ''
  });

  // Interactive Scope Checker State
  const [checkMeasurand, setCheckMeasurand] = useState(scopeItems[0]?.id || 'p-1');
  const [checkValue, setCheckValue] = useState<number>(120);
  const [checkUncertainty, setCheckUncertainty] = useState<number>(0.8);

  const targetScopeItem = scopeItems.find(i => i.id === checkMeasurand) || scopeItems[0] || INITIAL_SCOPE_ITEMS[0];

  // Validation logic
  const isValueInRange = checkValue >= targetScopeItem.rangeMin && checkValue <= targetScopeItem.rangeMax;
  const isUncertaintyValid = checkUncertainty >= targetScopeItem.cmcValue;
  const isAccreditedPass = isValueInRange && isUncertaintyValid;

  // Realtime sync from Firestore
  useEffect(() => {
    const q = query(collection(db, 'kanScope'), orderBy('category'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ScopeItem));
        setScopeItems(data);
      }
    }, (err) => {
      console.warn('Firestore scope query error (using local scope):', err);
    });
    return () => unsubscribe();
  }, []);

  const openAddModal = () => {
    setFormData({
      category: 'Tekanan & Vakum (Pressure & Vacuum)',
      measurand: '',
      rangeMin: 0,
      rangeMax: 100,
      unit: 'mmHg',
      cmcValue: 0.5,
      cmcUnit: 'mmHg',
      methodStandard: '',
      masterCalibrator: ''
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: ScopeItem) => {
    setEditingItem(item);
    setFormData({
      category: item.category,
      measurand: item.measurand,
      rangeMin: item.rangeMin,
      rangeMax: item.rangeMax,
      unit: item.unit,
      cmcValue: item.cmcValue,
      cmcUnit: item.cmcUnit,
      methodStandard: item.methodStandard,
      masterCalibrator: item.masterCalibrator
    });
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.measurand) return;

    const newItem: ScopeItem = {
      id: `scope-${Date.now()}`,
      ...formData
    };

    setScopeItems(prev => [...prev, newItem]);
    setIsAddModalOpen(false);

    try {
      await addDoc(collection(db, 'kanScope'), {
        ...formData,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to save scope item to Firestore:', err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updated = scopeItems.map(item => item.id === editingItem.id ? { ...item, ...formData } : item);
    setScopeItems(updated);
    setEditingItem(null);

    try {
      const docRef = doc(db, 'kanScope', editingItem.id);
      await updateDoc(docRef, { ...formData });
    } catch (err) {
      console.error('Failed to update scope item:', err);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    setScopeItems(prev => prev.filter(i => i.id !== itemToDelete.id));
    const targetId = itemToDelete.id;
    setItemToDelete(null);

    try {
      const docRef = doc(db, 'kanScope', targetId);
      await deleteDoc(docRef);
    } catch (err) {
      console.error('Failed to delete scope item:', err);
    }
  };

  const categories = Array.from(new Set(scopeItems.map(i => i.category)));

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-1 bg-cyan-500 rounded-full" />
            <p className="text-[10px] text-cyan-400 font-black uppercase tracking-[0.4em] font-mono">Standar Akreditasi KAN SD/SR</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-[1.5rem] flex items-center justify-center text-slate-950 shadow-xl shadow-cyan-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic">
                Lingkup Akreditasi <span className="text-cyan-500">KAN</span> &amp; CMC Matrix
              </h1>
            </div>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-widest">
            Komite Akreditasi Nasional • ISO/IEC 17025:2017 • LK-999-ID
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={openAddModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tambahkan Scope Baru
          </button>

          <div className="relative group w-full sm:w-auto">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari Parameter..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 w-full sm:w-[280px] shadow-sm transition-all"
            />
          </div>
        </div>
      </header>

      {/* Interactive CMC Scope Checker Tool */}
      <section className="bg-slate-900/90 dark:bg-[#070c18]/90 border border-slate-800 rounded-[3rem] p-8 md:p-10 shadow-2xl relative overflow-hidden text-white">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <Sliders className="w-64 h-64 text-cyan-400" />
        </div>

        <div className="relative z-10 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-5 h-5 text-cyan-400" />
                <h2 className="text-xl font-black uppercase tracking-tight italic">Interactive CMC Scope Verification Engine</h2>
              </div>
              <p className="text-xs text-slate-400">Verifikasi otomatis kelayakan besaran ukur &amp; batas ketidakpastian terhadap ruang lingkup KAN</p>
            </div>
            <span className="px-4 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-black uppercase tracking-widest rounded-full">
              ISO/IEC 17025:2017 CLAUSE 7.8
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">1. Pilih Parameter Ukur</label>
              <select
                value={checkMeasurand}
                onChange={(e) => setCheckMeasurand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              >
                {scopeItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.measurand} ({item.rangeMin} - {item.rangeMax} {item.unit})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                2. Nilai Pengukuran ({targetScopeItem.unit})
              </label>
              <input
                type="number"
                value={checkValue}
                onChange={(e) => setCheckValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">
                3. Ketidakpastian Diperluas U ({targetScopeItem.cmcUnit})
              </label>
              <input
                type="number"
                step="0.01"
                value={checkUncertainty}
                onChange={(e) => setCheckUncertainty(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className={cn(
            "p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all",
            isAccreditedPass 
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-red-950/40 border-red-500/40 text-red-300"
          )}>
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-slate-950 shadow-lg",
                isAccreditedPass ? "bg-emerald-400" : "bg-red-400"
              )}>
                {isAccreditedPass ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider font-mono">
                  {isAccreditedPass ? 'VERDIKT: DALAM LINGKUP AKREDITASI KAN (VALID)' : 'VERDIKT: DILUAR LINGKUP AKREDITASI KAN (WARNING)'}
                </h4>
                <p className="text-xs text-slate-300 mt-1">
                  Batas Kemampuan Kalibrasi (CMC) Terakreditasi: <strong>{targetScopeItem.cmcValue} {targetScopeItem.cmcUnit}</strong> | Rentang: <strong>{targetScopeItem.rangeMin} s/d {targetScopeItem.rangeMax} {targetScopeItem.unit}</strong>
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-xs font-bold space-y-1">
              <div className={cn("px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest", isValueInRange ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
                Rentang: {isValueInRange ? 'Memenuhi Scope' : 'Di Luar Range Scope'}
              </div>
              <div className={cn("px-3 py-1 rounded-lg text-[10px] uppercase tracking-widest", isUncertaintyValid ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300")}>
                Ketidakpastian U: {isUncertaintyValid ? '≥ CMC Limit' : '< CMC Limit (Kekecilan)'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Scope Table Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic flex items-center gap-3">
            <Layers className="w-6 h-6 text-cyan-500" />
            Matriks Ruang Lingkup Terakreditasi ({scopeItems.length} Parameter)
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                selectedCategory === 'all' 
                  ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20" 
                  : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
              )}
            >
              Semua Scope ({scopeItems.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer",
                  selectedCategory === cat 
                    ? "bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20" 
                    : "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400"
                )}
              >
                {cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Matrix Table */}
        <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[1000px]">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[10px] font-black tracking-[0.2em] font-mono border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6">Besaran Ukur</th>
                  <th className="px-6 py-6">Rentang Ukur (Range)</th>
                  <th className="px-6 py-6">CMC (Ketidakpastian Terbaik)</th>
                  <th className="px-6 py-6">Metode Standar / Referensi</th>
                  <th className="px-6 py-6">Standar Kalibrator Utama</th>
                  <th className="px-8 py-6 text-right">Kelola (Edit / Hapus)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {scopeItems.filter(item => 
                  (selectedCategory === 'all' || item.category === selectedCategory) &&
                  (item.measurand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.methodStandard.toLowerCase().includes(searchTerm.toLowerCase()) ||
                   item.masterCalibrator.toLowerCase().includes(searchTerm.toLowerCase()))
                ).map(item => (
                  <tr key={item.id} className="hover:bg-cyan-500/5 transition-colors">
                    <td className="px-8 py-5">
                      <p className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">{item.measurand}</p>
                      <span className="text-[9px] font-mono text-cyan-500 uppercase tracking-wider">{item.category}</span>
                    </td>
                    <td className="px-6 py-5 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {item.rangeMin} ~ {item.rangeMax} {item.unit}
                    </td>
                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 dark:text-cyan-400 rounded-xl font-mono text-xs font-black">
                        ± {item.cmcValue} {item.cmcUnit}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {item.methodStandard}
                    </td>
                    <td className="px-6 py-5 text-xs text-slate-700 dark:text-slate-300 font-mono font-semibold">
                      {item.masterCalibrator}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
                          title="Edit Parameter Scope"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setItemToDelete(item)}
                          className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
                          title="Hapus Parameter Scope"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* MODAL TAMBAH SCOPE */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAddModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-cyan-500" /> Tambahkan Parameter Scope KAN Baru
                </h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveAdd} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Kategori Scope</label>
                  <input type="text" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Nama Besaran Ukur (Measurand)</label>
                  <input type="text" placeholder="Contoh: Suhu Autoclave Sterilisasi" value={formData.measurand} onChange={e => setFormData({ ...formData, measurand: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Range Min</label>
                    <input type="number" value={formData.rangeMin} onChange={e => setFormData({ ...formData, rangeMin: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Range Max</label>
                    <input type="number" value={formData.rangeMax} onChange={e => setFormData({ ...formData, rangeMax: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Satuan</label>
                    <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">CMC (Nilai Ketidakpastian Terbaik)</label>
                    <input type="number" step="0.01" value={formData.cmcValue} onChange={e => setFormData({ ...formData, cmcValue: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-cyan-400 font-mono" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Satuan CMC</label>
                    <input type="text" value={formData.cmcUnit} onChange={e => setFormData({ ...formData, cmcUnit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Metode Standar Referensi</label>
                  <input type="text" placeholder="Contoh: MK-SKP-08 • IEC 60601-2-1" value={formData.methodStandard} onChange={e => setFormData({ ...formData, methodStandard: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Standar Kalibrator Utama</label>
                  <input type="text" placeholder="Contoh: Fluke Biomedical Analyzer S/N: 109283" value={formData.masterCalibrator} onChange={e => setFormData({ ...formData, masterCalibrator: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                </div>

                <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg mt-4 cursor-pointer">
                  Simpan Scope Baru
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL EDIT SCOPE */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingItem(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl z-10 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-cyan-500" /> Edit Parameter Scope KAN
                </h3>
                <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Nama Besaran Ukur</label>
                  <input type="text" value={formData.measurand} onChange={e => setFormData({ ...formData, measurand: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Range Min</label>
                    <input type="number" value={formData.rangeMin} onChange={e => setFormData({ ...formData, rangeMin: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Range Max</label>
                    <input type="number" value={formData.rangeMax} onChange={e => setFormData({ ...formData, rangeMax: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Satuan</label>
                    <input type="text" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">CMC Value</label>
                    <input type="number" step="0.01" value={formData.cmcValue} onChange={e => setFormData({ ...formData, cmcValue: Number(e.target.value) })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-cyan-400 font-mono" required />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono">Satuan CMC</label>
                    <input type="text" value={formData.cmcUnit} onChange={e => setFormData({ ...formData, cmcUnit: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold text-slate-900 dark:text-white" required />
                  </div>
                </div>

                <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl shadow-lg mt-4 cursor-pointer">
                  Simpan Perubahan Scope
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL HAPUS CONFIRMATION */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setItemToDelete(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 shadow-2xl z-10 text-center space-y-6">
              <div className="w-16 h-16 bg-red-500/15 text-red-500 rounded-3xl flex items-center justify-center mx-auto border border-red-500/20">
                <Trash2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Hapus Parameter Scope?</h3>
                <p className="text-xs text-slate-400 mt-2 font-mono">
                  Apakah Anda yakin ingin menghapus "{itemToDelete.measurand}" dari matriks lingkup KAN?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setItemToDelete(null)} className="py-3 bg-slate-100 dark:bg-slate-800 rounded-xl font-bold text-xs uppercase text-slate-300">Batal</button>
                <button onClick={handleDelete} className="py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase">Ya, Hapus</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
