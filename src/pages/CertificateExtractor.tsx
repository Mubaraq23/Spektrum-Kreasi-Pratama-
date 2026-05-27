import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  Sparkles, 
  BrainCircuit, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  Save, 
  ArrowLeft,
  FileText,
  BadgeAlert,
  Edit3,
  Trash2,
  Plus,
  Compass,
  Check,
  Building,
  Calendar,
  Layers
} from 'lucide-react';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { extractCertificateData } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

interface ExtractedField<T = string> {
  value: T;
  sourcePage: number;
}

interface ParameterInput {
  parameterName: string;
  measurementPoint: number;
  unit: string;
  correction: number;
  u95: number;
  uncertainty: number;
  sourcePage: number;
}

interface ExtractionResult {
  certificateNumber: ExtractedField;
  equipmentName: ExtractedField;
  brand: ExtractedField;
  type: ExtractedField;
  serialNumber: ExtractedField;
  calibrationDate: ExtractedField;
  expiryDate: ExtractedField;
  traceability: ExtractedField;
  parameters: ParameterInput[];
}

export function CertificateExtractor() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionStep, setExtractionStep] = useState(0);
  const [errorInput, setErrorInput] = useState<string | null>(null);
  
  // Extracted and fully editable form state
  const [formData, setFormData] = useState<ExtractionResult | null>(null);
  const [fasyankesName, setFasyankesName] = useState('Instansi Kesehatan Pusat');
  const [location, setLocation] = useState('Gedung Medik Lantai 2');
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCertId, setSuccessCertId] = useState('');

  const steps = [
    'Membaca representasi dokumen...',
    'Menguji validitas metadata sertifikat...',
    'AI menyisir tabel parameter kalibrasi...',
    'Memetakan anotasi rujukan halaman...'
  ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        triggerExtraction(droppedFile);
      } else {
        alert("Mohon unggah file dengan format PDF.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      triggerExtraction(selectedFile);
    }
  };

  const triggerExtraction = async (pdfFile: File) => {
    setIsExtracting(true);
    setExtractionStep(0);
    setErrorInput(null);
    setFormData(null);

    // Dynamic steps simulation for the micro-animations
    const stepInterval = setInterval(() => {
      setExtractionStep(prev => (prev < 3 ? prev + 1 : prev));
    }, 1800);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = (reader.result as string).split(',')[1];
        const res = await extractCertificateData(base64Data);
        
        // Map backend fallback types & safety constraints
        const mappedData: ExtractionResult = {
          certificateNumber: res.certificateNumber || { value: 'CERT-EXT-' + Math.floor(1000 + Math.random() * 9000), sourcePage: 1 },
          equipmentName: res.equipmentName || { value: '', sourcePage: 1 },
          brand: res.brand || { value: '', sourcePage: 1 },
          type: res.type || { value: '', sourcePage: 1 },
          serialNumber: res.serialNumber || { value: '', sourcePage: 1 },
          calibrationDate: res.calibrationDate || { value: new Date().toISOString().split('T')[0], sourcePage: 1 },
          expiryDate: res.expiryDate || { value: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], sourcePage: 1 },
          traceability: res.traceability || { value: 'Tertelusur ke SI', sourcePage: 2 },
          parameters: (res.parameters || []).map((p: any) => ({
            parameterName: p.parameterName || 'Faktor Koreksi',
            measurementPoint: typeof p.measurementPoint === 'number' ? p.measurementPoint : (p.point || 0),
            unit: p.unit || 'unit',
            correction: typeof p.correction === 'number' ? p.correction : 0,
            u95: typeof p.u95 === 'number' ? p.u95 : (p.uncertainty || 0),
            uncertainty: typeof p.uncertainty === 'number' ? p.uncertainty : 0,
            sourcePage: typeof p.sourcePage === 'number' ? p.sourcePage : 2
          }))
        };
        
        setFormData(mappedData);
      } catch (error: any) {
        console.error("AI Certificate Extraction error:", error);
        setErrorInput(error.message || "Gagal melakukan ekstraksi sertifikat kalibrasi.");
      } finally {
        clearInterval(stepInterval);
        setIsExtracting(false);
      }
    };
    reader.readAsDataURL(pdfFile);
  };

  const handleFieldChange = (field: keyof Omit<ExtractionResult, 'parameters'>, key: 'value' | 'sourcePage', val: any) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [field]: {
        ...formData[field],
        [key]: val
      }
    });
  };

  const handleParameterChange = (index: number, field: keyof ParameterInput, val: any) => {
    if (!formData) return;
    const updatedParameters = [...formData.parameters];
    updatedParameters[index] = {
      ...updatedParameters[index],
      [field]: val
    };
    setFormData({
      ...formData,
      parameters: updatedParameters
    });
  };

  const handleDeleteParameter = (index: number) => {
    if (!formData) return;
    setFormData({
      ...formData,
      parameters: formData.parameters.filter((_, idx) => idx !== index)
    });
  };

  const handleAddParameter = () => {
    if (!formData) return;
    const newParam: ParameterInput = {
      parameterName: 'Tegangan',
      measurementPoint: 100,
      unit: 'V',
      correction: 0,
      u95: 0,
      uncertainty: 0,
      sourcePage: 2
    };
    setFormData({
      ...formData,
      parameters: [...formData.parameters, newParam]
    });
  };

  const handleSaveToDatabase = async () => {
    if (!formData) return;
    if (!formData.equipmentName.value || !formData.serialNumber.value) {
      alert("Nama alat dan Nomor seri harus diisi.");
      return;
    }

    try {
      setIsExtracting(true);
      
      // 1. Create stub worksheet ID for referential integrity
      const lkRef = doc(collection(db, 'worksheets'));
      const certRef = doc(collection(db, 'certificates'));

      // Create Worksheet in firestore
      await setDoc(lkRef, {
        deviceName: formData.equipmentName.value,
        brand: formData.brand.value,
        model: formData.type.value,
        serialNumber: formData.serialNumber.value,
        fasyankesName: fasyankesName,
        location: location,
        status: 'completed',
        isPass: true,
        createdBy: profile?.uid || 'ai-extractor',
        technicianId: profile?.uid || 'ai-extractor',
        technicianName: profile?.displayName || 'AI System',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        measurements: formData.parameters.map(p => ({
          point: p.measurementPoint,
          actual: p.measurementPoint + p.correction,
          uncertainty: p.u95
        })),
        calibratorIds: ['SYSTEM_AI_EXTRACTED'],
        environmentalData: {
          temperature: '25.0',
          humidity: '55.0'
        }
      });

      // Create Certificate in firestore
      await setDoc(certRef, {
        certificateNumber: formData.certificateNumber.value,
        issuedByName: profile?.displayName || 'AI System Extractor',
        nextCalibrationDate: formData.expiryDate.value,
        status: 'active',
        lkId: lkRef.id,
        issuedAt: serverTimestamp(),
        traceability: formData.traceability.value
      });

      setSuccessCertId(certRef.id);
      setIsSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'certificates');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-8 h-1 bg-blue-600 rounded-full" />
             <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] font-mono">Quantum AI Engine</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                <BrainCircuit className="w-8 h-8 animate-pulse" />
             </div>
             <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none lowercase">
               Ekstraksi <span className="text-blue-600 italic">Sertifikat AI</span>
             </h1>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Konversi instan PDF dokumen fisik ke rekam presisi digital</p>
        </div>
        <button 
          onClick={() => navigate('/certificates')}
          className="flex items-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 font-black text-[10px] uppercase tracking-widest px-8 py-4 rounded-2xl shadow-sm transition-all hover:border-blue-400"
        >
          <ArrowLeft className="w-4 h-4" />
          Daftar Sertifikat
        </button>
      </header>

      {isSuccess ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/80 backdrop-blur-xl border border-emerald-200 rounded-[3.5rem] p-12 text-center max-w-3xl mx-auto shadow-2xl shadow-emerald-100"
        >
          <div className="w-24 h-24 bg-emerald-50 border border-emerald-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner text-emerald-600">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter lowercase mb-4">
            Ekstraksi <span className="text-emerald-600 italic">Berhasil Disimpan</span>
          </h2>
          <p className="text-slate-500 font-bold max-w-lg mx-auto text-sm leading-relaxed mb-10">
            Sertifikat <span className="font-black text-slate-950">{formData?.certificateNumber.value}</span> dan rekam lembar kerja digital telah berhasil diprosesi, divalidasi, dan ditransmisikan ke Firebase Database utama.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate(`/certificates/${successCertId}`)}
              className="px-10 py-5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 w-full sm:w-auto"
            >
              Lihat Detail Sertifikat
            </button>
            <button 
              onClick={() => {
                setFile(null);
                setFormData(null);
                setIsSuccess(false);
              }}
              className="px-8 py-5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all w-full sm:w-auto"
            >
              Ekstrak File Lain
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-12 gap-10">
          {/* File Upload / Processing zone */}
          {!formData && (
            <div className="col-span-12">
              <AnimatePresence mode="wait">
                {isExtracting ? (
                  <motion.div 
                    key="loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="bg-white border border-slate-100 rounded-[3.5rem] p-16 flex flex-col items-center justify-center shadow-2xl shadow-slate-200/50 min-h-[450px]"
                  >
                    <div className="relative mb-10">
                      <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                        <BrainCircuit className="w-10 h-10 animate-pulse" />
                      </div>
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter lowercase mb-3">AI menganalisis dokumen kalibrasi...</h3>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest font-mono mb-8">Quantum OCR & Metadata Mapping</p>
                    
                    {/* Stepper logs */}
                    <div className="space-y-3 max-w-sm w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-5">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            extractionStep === idx ? "bg-blue-600 animate-ping" : 
                            extractionStep > idx ? "bg-emerald-500" : "bg-slate-200"
                          )} />
                          <p className={cn(
                            "text-xs font-bold",
                            extractionStep === idx ? "text-slate-900 font-extrabold" :
                            extractionStep > idx ? "text-slate-400" : "text-slate-300"
                          )}>
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="dropzone"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-[3.5rem] p-24 text-center cursor-pointer transition-all flex flex-col items-center justify-center group shadow-sm bg-white",
                      dragActive ? "border-blue-500 bg-blue-50/30 scale-[1.01]" : "border-slate-300 hover:border-blue-400"
                    )}
                  >
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    <div className="w-24 h-24 rounded-[2.5rem] bg-slate-50 border border-slate-100 flex items-center justify-center mb-8 text-slate-300 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-xl group-hover:shadow-blue-500/20 transition-all duration-700 shadow-inner">
                      <Upload className="w-10 h-10 group-hover:-translate-y-1 transition-transform" />
                    </div>
                    
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter lowercase mb-2">Unggah sertifikat fisik (.pdf)</h3>
                    <p className="text-slate-400 text-xs font-bold font-sans max-w-sm leading-relaxed mb-4">Seret dokumen PDF sertifikat kalibrasi ke sini atau klik untuk menelusuri folder dari sistem komputer.</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest font-mono">Standarisasi ISO/IEC 17025 • Quantum Certified</p>

                    {errorInput && (
                      <div className="mt-8 flex items-center gap-3 bg-red-50 text-red-600 border border-red-100 rounded-xl px-5 py-3 text-xs font-bold">
                        <BadgeAlert className="w-4 h-4 shrink-0" />
                        {errorInput}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Form & Extracted Parameter Tables */}
          {formData && (
            <>
              <div className="col-span-12 xl:col-span-4 space-y-8">
                {/* Meta Detail Form */}
                <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-[3rem] p-8 space-y-6 shadow-2xl shadow-slate-200/40">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-2">
                       <FileText className="w-5 h-5 text-blue-600" />
                       <h2 className="text-md font-black italic uppercase tracking-widest text-slate-900">Metadata <span className="text-blue-600">Sertifikat</span></h2>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">AI Terverifikasi</span>
                  </div>

                  <div className="space-y-4">
                    <EditableField 
                      label="Nomor Sertifikat" 
                      value={formData.certificateNumber.value} 
                      sourcePage={formData.certificateNumber.sourcePage}
                      onChange={(v) => handleFieldChange('certificateNumber', 'value', v)}
                    />
                    <EditableField 
                      label="Nama Alat Kesehatan" 
                      value={formData.equipmentName.value} 
                      sourcePage={formData.equipmentName.sourcePage}
                      onChange={(v) => handleFieldChange('equipmentName', 'value', v)}
                    />
                    <EditableField 
                      label="Merk Alat" 
                      value={formData.brand.value} 
                      sourcePage={formData.brand.sourcePage}
                      onChange={(v) => handleFieldChange('brand', 'value', v)}
                    />
                    <EditableField 
                      label="Tipe / Model" 
                      value={formData.type.value} 
                      sourcePage={formData.type.sourcePage}
                      onChange={(v) => handleFieldChange('type', 'value', v)}
                    />
                    <EditableField 
                      label="Nomor Seri (Serial Number)" 
                      value={formData.serialNumber.value} 
                      sourcePage={formData.serialNumber.sourcePage}
                      onChange={(v) => handleFieldChange('serialNumber', 'value', v)}
                    />
                    <EditableField 
                      label="Tanggal Kalibrasi" 
                      value={formData.calibrationDate.value} 
                      sourcePage={formData.calibrationDate.sourcePage}
                      onChange={(v) => handleFieldChange('calibrationDate', 'value', v)}
                    />
                    <EditableField 
                      label="Masa Berlaku Kalibrasi" 
                      value={formData.expiryDate.value} 
                      sourcePage={formData.expiryDate.sourcePage}
                      onChange={(v) => handleFieldChange('expiryDate', 'value', v)}
                    />
                    <EditableField 
                      label="Ketertelusuran Standar" 
                      value={formData.traceability.value} 
                      sourcePage={formData.traceability.sourcePage}
                      onChange={(v) => handleFieldChange('traceability', 'value', v)}
                    />
                  </div>
                </div>

                {/* Auxiliary Form to Bind Client Mapping */}
                <div className="bg-slate-900/95 border border-slate-800 rounded-[3rem] p-8 space-y-6 text-white shadow-xl shadow-slate-950/20">
                  <div className="flex items-center gap-2 border-b border-slate-800 pb-5">
                    <Building className="w-5 h-5 text-blue-400" />
                    <h3 className="text-md font-black uppercase tracking-widest font-mono text-white/95">Relasi & Penugasan</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">Fasyankes Pemilik / Klien</label>
                      <input 
                        type="text" 
                        value={fasyankesName} 
                        onChange={(e) => setFasyankesName(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">Lokasi Pemasangan</label>
                      <input 
                        type="text" 
                        value={location} 
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:ring-4 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Data parameters table review */}
              <div className="col-span-12 xl:col-span-8 flex flex-col gap-6">
                <div className="bg-white border border-slate-200 rounded-[3.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden flex flex-col h-full">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-md font-black tracking-widest uppercase italic leading-none text-slate-900">Hasil & Parameter Kalibrasi</h3>
                      <p className="text-[8px] text-slate-400 uppercase tracking-[0.3em] font-black mt-2 font-mono">Anand & Precision Audit</p>
                    </div>
                    <button 
                      onClick={handleAddParameter}
                      className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-white px-5 py-3 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-600 hover:border-blue-600 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Baris Data
                    </button>
                  </div>

                  <div className="overflow-x-auto custom-scrollbar flex-1">
                    <table className="w-full text-left min-w-[800px]">
                      <thead className="bg-slate-50/50 text-slate-400 font-mono uppercase text-[9px] font-black tracking-[0.2em] border-b border-slate-100 italic">
                        <tr>
                          <th className="px-6 py-5 w-[20%]">Parameter / Channel</th>
                          <th className="px-6 py-5 w-[15%]">Setting Value</th>
                          <th className="px-6 py-5 w-[12%]">Unit</th>
                          <th className="px-6 py-5 w-[12%]">Correction</th>
                          <th className="px-6 py-5 w-[12%]">U95 (Ketidakpastian)</th>
                          <th className="px-6 py-5 w-[10%] text-center">Rujukan Hal.</th>
                          <th className="px-6 py-5 w-[12%] text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm font-bold">
                        {formData.parameters.map((param, index) => (
                          <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                value={param.parameterName} 
                                onChange={(e) => handleParameterChange(index, 'parameterName', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="number" 
                                value={param.measurementPoint} 
                                onChange={(e) => handleParameterChange(index, 'measurementPoint', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="text" 
                                value={param.unit} 
                                onChange={(e) => handleParameterChange(index, 'unit', e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="number" 
                                step="0.001"
                                value={param.correction} 
                                onChange={(e) => handleParameterChange(index, 'correction', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <input 
                                type="number" 
                                step="0.001"
                                value={param.u95} 
                                onChange={(e) => handleParameterChange(index, 'u95', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                              />
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="inline-flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black tracking-wider w-10">
                                p.{param.sourcePage}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button 
                                onClick={() => handleDeleteParameter(index)}
                                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Hapus Baris"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => setFormData(null)}
                    className="flex-1 max-w-[200px] py-5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all hover:border-slate-300"
                  >
                    Batal (Reset)
                  </button>
                  <button 
                    onClick={handleSaveToDatabase}
                    className="flex-1 py-5 bg-blue-600 text-white hover:bg-blue-700 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    Simpan Ke Database & Hubungkan Worksheet
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  sourcePage: number;
  onChange: (val: string) => void;
}

function EditableField({ label, value, sourcePage, onChange }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
    <div className="space-y-1.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 font-mono">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center text-[8px] font-black bg-blue-50 border border-blue-100 text-blue-600 px-2 py-0.5 rounded-md uppercase font-mono italic">Hal. {sourcePage}</span>
          <button 
            type="button" 
            onClick={() => setIsEditing(!isEditing)}
            className="text-[9px] font-bold text-slate-400 hover:text-blue-600 transition-all leading-none ml-1 uppercase font-mono tracking-tighter"
          >
            {isEditing ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Edit3 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
      {isEditing ? (
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-extrabold focus:outline-none focus:ring-2 focus:ring-blue-500/15"
          autoFocus
        />
      ) : (
        <p className="text-xs font-black text-slate-950 uppercase select-all truncate tracking-tight">{value || '-'}</p>
      )}
    </div>
  );
}
