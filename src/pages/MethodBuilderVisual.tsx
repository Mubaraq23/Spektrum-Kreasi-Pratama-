import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Save, 
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Printer,
  FileText,
  Thermometer,
  Wrench,
  AlertTriangle,
  FolderOpen,
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import { collection, addDoc, getDocs, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Tilt3D } from '../components/Tilt3D';
import { jsPDF } from 'jspdf';
import { MEDICAL_DEVICES_CATALOG } from '../data/medicalDeviceCatalog';

interface MethodParameter {
  id: string;
  name: string;
  unit: string;
  points: number[];
  tolerance: number;
  distributionType: 'rectangular' | 'normal' | 'triangular';
  calibrator: string;
}

export function MethodBuilderVisual() {
  const navigate = useNavigate();

  // Active method state
  const [methodCode, setMethodCode] = useState('IK-SKP-DEF-01');
  const [methodTitle, setMethodTitle] = useState('Instruksi Kerja Kalibrasi Defibrillator & AED');
  const [deviceCategory, setDeviceCategory] = useState<'Diagnostic' | 'Life Support' | 'Therapeutic' | 'Laboratory' | 'Radiology'>('Life Support');
  const [standardRef, setStandardRef] = useState('IEC 60601-2-4 / Permenkes 54/2015');
  const [calibrationInterval, setCalibrationInterval] = useState(12);
  const [riskClass, setRiskClass] = useState<'CLASS_I' | 'CLASS_IIa' | 'CLASS_IIb' | 'CLASS_III'>('CLASS_III');
  
  // Environmental Limits
  const [tempMin, setTempMin] = useState(18);
  const [tempMax, setTempMax] = useState(28);
  const [rhMin, setRhMin] = useState(30);
  const [rhMax, setRhMax] = useState(75);

  // Checklists
  const [physicalChecks, setPhysicalChecks] = useState<string[]>([
    'Badan & Chassis Casing',
    'Paddle Dewasa & Anak',
    'Kabel Paddle & Connector',
    'Baterai Cadangan Internal'
  ]);
  const [functionalChecks, setFunctionalChecks] = useState<string[]>([
    'Self-Test Booting',
    'Fungsi Charge & Discharge',
    'Synchronized Cardioversion Mode',
    'Internal Battery Test'
  ]);

  // Calibrator Requirements
  const [calibratorsRequired, setCalibratorsRequired] = useState<string[]>([
    'Defibrillator Analyzer (Fluke Impulse 7000DP / Rigel)',
    'Electrical Safety Analyzer (IEC 62353)',
    'Digital Stopwatch Terkalibrasi'
  ]);

  // Parameters
  const [parameters, setParameters] = useState<MethodParameter[]>([
    {
      id: 'param-1',
      name: 'Energi Kejut (Discharge Energy)',
      unit: 'Joule',
      points: [10, 50, 100, 200, 360],
      tolerance: 5,
      distributionType: 'rectangular',
      calibrator: 'Defibrillator Analyzer'
    },
    {
      id: 'param-2',
      name: 'Waktu Pengisian (Charging Time)',
      unit: 'Detik',
      points: [360],
      tolerance: 10,
      distributionType: 'normal',
      calibrator: 'Digital Stopwatch'
    }
  ]);

  const [newPhysicalItem, setNewPhysicalItem] = useState('');
  const [newFunctionalItem, setNewFunctionalItem] = useState('');
  const [newCalibratorItem, setNewCalibratorItem] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load from catalog template
  const handleLoadTemplate = (catalogId: string) => {
    const item = MEDICAL_DEVICES_CATALOG.find(d => d.id === catalogId);
    if (!item) return;

    setMethodCode(item.codeIK);
    setMethodTitle(`Instruksi Kerja Kalibrasi ${item.name}`);
    setDeviceCategory(item.category);
    setStandardRef(item.standardRef);
    setCalibrationInterval(item.calibrationIntervalMonths || 12);
    setPhysicalChecks(item.inspections.physical);
    setFunctionalChecks(item.inspections.functional);

    setParameters(item.parameters.map((p, idx) => ({
      id: `param-${idx + 1}`,
      name: p.name,
      unit: p.unit,
      points: p.points,
      tolerance: p.tolerance,
      distributionType: 'rectangular',
      calibrator: 'Standar Kalibrator Tertelusur KAN'
    })));

    showToast(`Template "${item.name}" berhasil dimuat ke editor visual.`);
  };

  // Add Parameter
  const handleAddParameter = () => {
    const newParam: MethodParameter = {
      id: `param-${Date.now()}`,
      name: 'Parameter Uji Baru',
      unit: 'Unit',
      points: [10, 50, 100],
      tolerance: 5,
      distributionType: 'rectangular',
      calibrator: 'Standar Ukur LPAK'
    };
    setParameters([...parameters, newParam]);
  };

  const handleRemoveParameter = (id: string) => {
    setParameters(parameters.filter(p => p.id !== id));
  };

  const handleUpdateParameter = (id: string, field: keyof MethodParameter, value: any) => {
    setParameters(parameters.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    }));
  };

  // Checklist handlers
  const handleAddPhysical = () => {
    if (!newPhysicalItem.trim()) return;
    setPhysicalChecks([...physicalChecks, newPhysicalItem.trim()]);
    setNewPhysicalItem('');
  };

  const handleAddFunctional = () => {
    if (!newFunctionalItem.trim()) return;
    setFunctionalChecks([...functionalChecks, newFunctionalItem.trim()]);
    setNewFunctionalItem('');
  };

  const handleAddCalibrator = () => {
    if (!newCalibratorItem.trim()) return;
    setCalibratorsRequired([...calibratorsRequired, newCalibratorItem.trim()]);
    setNewCalibratorItem('');
  };

  // Save to Firestore
  const handleSaveToDatabase = async () => {
    setSaving(true);
    try {
      await addDoc(collection(db, 'methods'), {
        codeIK: methodCode,
        title: methodTitle,
        deviceCategory,
        standardReference: standardRef,
        calibrationIntervalMonths: calibrationInterval,
        riskClass,
        environmentalLimits: {
          tempMinC: tempMin,
          tempMaxC: tempMax,
          rhMinPercent: rhMin,
          rhMaxPercent: rhMax
        },
        inspections: {
          physical: physicalChecks,
          functional: functionalChecks
        },
        requiredCalibrators: calibratorsRequired,
        parameters: parameters.map(p => ({
          name: p.name,
          unit: p.unit,
          points: p.points,
          tolerance: p.tolerance,
          distributionType: p.distributionType,
          calibrator: p.calibrator
        })),
        objectives: `Prosedur terstandarisasi pengujian kalibrasi dan verifikasi metrologis pada peralatan ${methodTitle} dengan kepatuhan terhadap ${standardRef} dan KAN LK-291-IDN.`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      setSavedSuccess(true);
      showToast('Metode Kerja berhasil disimpan permanen ke database!');
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving method:', err);
      showToast('Gagal menyimpan metode ke database: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Export to PDF (ISO/IEC 17025 Format)
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const marginX = 18;
      let yPos = 20;

      // Header Company
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('PT SPEKTRUM KREASI PRATAMA', marginX, yPos);
      yPos += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('LABORATORIUM KALIBRASI ALAT KESEHATAN KAN LK-291-IDN & LP-1849-IDN', marginX, yPos);
      yPos += 4;

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.6);
      doc.line(marginX, yPos, 192, yPos);
      yPos += 8;

      // Document Title Box
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, yPos, 174, 18, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, yPos, 174, 18, 'D');

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59);
      doc.text(methodTitle.toUpperCase(), marginX + 4, yPos + 7);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(37, 99, 235);
      doc.text(`KODE DOKUMEN: ${methodCode} | REVISI: 02 | TANGGAL: ${new Date().toLocaleDateString('id-ID')}`, marginX + 4, yPos + 13);
      yPos += 24;

      // Metadata Info
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text('1. INFORMASI UMUM METODE', marginX, yPos);
      yPos += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`• Kategori Alat      : ${deviceCategory}`, marginX + 4, yPos); yPos += 4.5;
      doc.text(`• Standar Acuan    : ${standardRef}`, marginX + 4, yPos); yPos += 4.5;
      doc.text(`• Interval Kalibrasi: ${calibrationInterval} Bulan`, marginX + 4, yPos); yPos += 4.5;
      doc.text(`• Batas Lingkungan  : Suhu ${tempMin}°C - ${tempMax}°C, Kelembaban ${rhMin}% - ${rhMax}% RH`, marginX + 4, yPos); yPos += 7;

      // Required Calibrators
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('2. STANDAR UKUR & KALIBRATOR WAJIB', marginX, yPos);
      yPos += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      calibratorsRequired.forEach((cal) => {
        doc.text(`• ${cal}`, marginX + 4, yPos);
        yPos += 4.5;
      });
      yPos += 3;

      // Parameters Table
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('3. PARAMETER PENGUKURAN & BATAS TOLERANSI (MPE)', marginX, yPos);
      yPos += 6;

      // Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(marginX, yPos, 174, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.text('No', marginX + 2, yPos + 4.2);
      doc.text('Parameter Pengukuran', marginX + 10, yPos + 4.2);
      doc.text('Satuan', marginX + 65, yPos + 4.2);
      doc.text('Titik Uji Nominal', marginX + 85, yPos + 4.2);
      doc.text('Toleransi MPE', marginX + 135, yPos + 4.2);
      doc.text('Distribusi', marginX + 158, yPos + 4.2);
      yPos += 6;

      // Table Rows
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      parameters.forEach((param, idx) => {
        doc.setFillColor(idx % 2 === 0 ? '#ffffff' : '#f8fafc');
        doc.rect(marginX, yPos, 174, 6, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, yPos + 6, marginX + 174, yPos + 6);

        doc.text(`${idx + 1}`, marginX + 2, yPos + 4.2);
        doc.text(param.name, marginX + 10, yPos + 4.2);
        doc.text(param.unit, marginX + 65, yPos + 4.2);
        doc.text(param.points.join(', '), marginX + 85, yPos + 4.2);
        doc.text(`± ${param.tolerance}%`, marginX + 135, yPos + 4.2);
        doc.text(param.distributionType, marginX + 158, yPos + 4.2);
        yPos += 6;
      });
      yPos += 8;

      // Physical & Functional Checks
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('4. CHECKLIST PEMERIKSAAN FISIK & FUNGSI', marginX, yPos);
      yPos += 5;

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`• Uji Fisik: ${physicalChecks.join(', ')}`, marginX + 4, yPos);
      yPos += 5;
      doc.text(`• Uji Fungsi: ${functionalChecks.join(', ')}`, marginX + 4, yPos);
      yPos += 14;

      // Approval Signatures Block
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('Disusun Oleh (Metrologist):', marginX, yPos);
      doc.text('Ditinjau & Disetujui (Manajer Teknis):', marginX + 100, yPos);
      yPos += 15;
      doc.text('_________________________', marginX, yPos);
      doc.text('_________________________', marginX + 100, yPos);

      doc.save(`${methodCode}_Metode_Kerja.pdf`);
      showToast(`Dokumen ${methodCode} berhasil diunduh dalam format PDF.`);
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      showToast('Gagal mencetak dokumen PDF.');
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 text-slate-100 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-indigo-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hero Header */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest font-mono">
              <Sliders className="w-4 h-4 text-indigo-400" /> Studio Visual Metode Kerja & IK (ISO/IEC 17025)
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase font-mono">
                  Perancang <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">Metode Kerja & IK</span>
                </h1>
                <p className="text-slate-400 max-w-2xl text-sm md:text-base mt-2 leading-relaxed font-sans">
                  Konfigurasikan batas toleransi MPE, titik uji nominal, acuan regulasi, checklist fisik, dan standar ukur tertelusur KAN secara visual tanpa menulis kode.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleExportPDF}
                  className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 border border-slate-700 shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-rose-400" />
                  <span>Cetak PDF Resmi</span>
                </button>

                <button
                  onClick={handleSaveToDatabase}
                  disabled={saving}
                  className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-rose-500 hover:opacity-90 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : savedSuccess ? 'Tersimpan!' : 'Simpan ke Database'}</span>
                </button>

                <button
                  onClick={() => navigate('/worksheets')}
                  className="px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>Buka Lembar Kerja (LK)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* Quick Template Selector Bar */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
            <FolderOpen className="w-4 h-4 text-cyan-400" />
            <span>Pilih Cepat Template Standar KAN (18 Kategori Alkes)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Permenkes 54 / ISO 17025 Grade</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {MEDICAL_DEVICES_CATALOG.slice(0, 10).map((dev) => (
            <button
              key={dev.id}
              onClick={() => handleLoadTemplate(dev.id)}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 text-[11px] font-bold text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{dev.name.split(' ')[0]}</span>
              <span className="text-[9px] font-mono text-cyan-400">({dev.codeIK})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Metadata & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Metadata Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 font-mono flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> 1. Metadata Dokumen & Legalitas
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Kode Instruksi Kerja (IK/MK)</label>
                <input
                  type="text"
                  value={methodCode}
                  onChange={(e) => setMethodCode(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white font-bold focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Judul Metode Kerja</label>
                <input
                  type="text"
                  value={methodTitle}
                  onChange={(e) => setMethodTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Kategori Alkes</label>
                  <select
                    value={deviceCategory}
                    onChange={(e: any) => setDeviceCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white outline-none"
                  >
                    <option value="Life Support">Life Support</option>
                    <option value="Diagnostic">Diagnostic</option>
                    <option value="Therapeutic">Therapeutic</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Radiology">Radiology</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Kelas Risiko</label>
                  <select
                    value={riskClass}
                    onChange={(e: any) => setRiskClass(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white outline-none"
                  >
                    <option value="CLASS_I">Kelas I (Rendah)</option>
                    <option value="CLASS_IIa">Kelas IIa (Sedang)</option>
                    <option value="CLASS_IIb">Kelas IIb (Tinggi)</option>
                    <option value="CLASS_III">Kelas III (Kritis)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-400 block mb-1">Standar Acuan Regulasi</label>
                <input
                  type="text"
                  value={standardRef}
                  onChange={(e) => setStandardRef(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-cyan-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Environmental Limits Card */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 font-mono flex items-center gap-2">
              <Thermometer className="w-4 h-4" /> 2. Kondisi Lingkungan Kalibrasi
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-slate-400 block mb-1">Suhu Min (°C)</label>
                <input
                  type="number"
                  value={tempMin}
                  onChange={(e) => setTempMin(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-400 block mb-1">Suhu Max (°C)</label>
                <input
                  type="number"
                  value={tempMax}
                  onChange={(e) => setTempMax(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-400 block mb-1">RH Min (%)</label>
                <input
                  type="number"
                  value={rhMin}
                  onChange={(e) => setRhMin(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white font-bold"
                />
              </div>
              <div>
                <label className="font-bold text-slate-400 block mb-1">RH Max (%)</label>
                <input
                  type="number"
                  value={rhMax}
                  onChange={(e) => setRhMax(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white font-bold"
                />
              </div>
            </div>
          </div>

          {/* Required Calibrators */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono flex items-center gap-2">
              <Wrench className="w-4 h-4" /> 3. Standar Kalibrator yang Diwajibkan
            </h3>

            <div className="space-y-2">
              {calibratorsRequired.map((cal, idx) => (
                <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                  <span className="text-slate-300 font-mono font-bold">• {cal}</span>
                  <button
                    onClick={() => setCalibratorsRequired(calibratorsRequired.filter((_, i) => i !== idx))}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Nama alat standar..."
                  value={newCalibratorItem}
                  onChange={(e) => setNewCalibratorItem(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
                <button
                  onClick={handleAddCalibrator}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Parameters & Checklists (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Measurement Parameters Section */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-2">
                <Sliders className="w-4 h-4" /> 4. Parameter Titik Ukur & Toleransi MPE
              </h3>
              <button
                onClick={handleAddParameter}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Parameter
              </button>
            </div>

            <div className="space-y-4">
              {parameters.map((param, index) => (
                <div key={param.id} className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">
                      Parameter #{index + 1}
                    </span>
                    <button
                      onClick={() => handleRemoveParameter(param.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors"
                      title="Hapus parameter"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Nama Parameter</label>
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleUpdateParameter(param.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Satuan (Unit)</label>
                      <input
                        type="text"
                        value={param.unit}
                        onChange={(e) => handleUpdateParameter(param.id, 'unit', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-cyan-400 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Toleransi MPE (%)</label>
                      <input
                        type="number"
                        value={param.tolerance}
                        onChange={(e) => handleUpdateParameter(param.id, 'tolerance', Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-rose-400 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Titik Uji Nominal (Pisahkan Koma)</label>
                      <input
                        type="text"
                        value={param.points.join(', ')}
                        onChange={(e) => {
                          const pts = e.target.value.split(',').map(p => Number(p.trim())).filter(n => !isNaN(n));
                          handleUpdateParameter(param.id, 'points', pts);
                        }}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Model Distribusi Tipe B</label>
                      <select
                        value={param.distributionType}
                        onChange={(e: any) => handleUpdateParameter(param.id, 'distributionType', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl font-mono text-slate-300 text-xs outline-none"
                      >
                        <option value="rectangular">Rectangular (√3 - Resolusi/MPE)</option>
                        <option value="normal">Normal (k=2 - Sertifikat Kalibrasi)</option>
                        <option value="triangular">Triangular (√6 - Fluktuasi Suhu)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Physical & Functional Checklists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Physical */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Pemeriksaan Fisik
              </h4>
              <div className="space-y-2">
                {physicalChecks.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-950 rounded-lg">
                    <span className="text-slate-300 truncate">{item}</span>
                    <button onClick={() => setPhysicalChecks(physicalChecks.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Tambah poin fisik..."
                    value={newPhysicalItem}
                    onChange={(e) => setNewPhysicalItem(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  />
                  <button onClick={handleAddPhysical} className="px-3 py-1.5 bg-indigo-600 rounded-lg text-xs font-bold">
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Functional */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Pemeriksaan Fungsi
              </h4>
              <div className="space-y-2">
                {functionalChecks.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-xs px-3 py-1.5 bg-slate-950 rounded-lg">
                    <span className="text-slate-300 truncate">{item}</span>
                    <button onClick={() => setFunctionalChecks(functionalChecks.filter((_, idx) => idx !== i))} className="text-slate-500 hover:text-red-400">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Tambah poin fungsi..."
                    value={newFunctionalItem}
                    onChange={(e) => setNewFunctionalItem(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs"
                  />
                  <button onClick={handleAddFunctional} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-xs font-bold">
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
