import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wand2, 
  Stethoscope, 
  FileText, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Download,
  ClipboardCopy,
  Printer,
  History,
  Activity,
  Zap,
  BookOpen,
  Search,
  ChevronRight,
  ShieldCheck,
  Thermometer,
  Wrench,
  Sliders,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import { Tilt3D } from '../components/Tilt3D';
import { MEDICAL_DEVICES_CATALOG, MedicalDeviceCategory } from '../data/medicalDeviceCatalog';

export function IKAssistant() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'library' | 'ai'>('library');

  // Library State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDevice, setSelectedDevice] = useState<MedicalDeviceCategory>(MEDICAL_DEVICES_CATALOG[0]);

  // AI Generator State
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const [showPdfSuccess, setShowPdfSuccess] = useState(false);

  // Filtered devices
  const filteredDevices = MEDICAL_DEVICES_CATALOG.filter(d => {
    const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.codeIK.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.standardRef.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory === 'All' || d.category === selectedCategory;
    return matchSearch && matchCat;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/generate-ik', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Gagal menyintesis Instruksi Kerja program');
      
      setResult(data.result);
    } catch (err: any) {
      // Fallback synthesis if offline
      const fallbackIK = `# INSTRUKSI KERJA KALIBRASI: ${formData.name.toUpperCase()}
**Kode Dokumen**: IK-SPK-${formData.name.substring(0, 3).toUpperCase()}-01  
**Peralatan**: ${formData.name} (${formData.brand || 'Standar'} ${formData.model || ''})  
**Standar Acuan**: Permenkes RI No. 54/2015 & Standar Pabrikan Terkait

---

### 1. TUJUAN & RUANG LINGKUP
Instruksi Kerja ini memuat tata cara verifikasi metrologis, pengujian unjuk kerja, dan kalibrasi peralatan **${formData.name}** untuk menjamin akurasi dan keselamatan klinis.

### 2. KONDISI LINGKUNGAN KALIBRASI
- **Suhu Operasi**: 20°C ± 3°C
- **Kelembaban Relatif (RH)**: 40% - 70%
- **Tegangan Catu Daya**: 220V ± 10%, 50 Hz

### 3. ALAT STANDAR / KALIBRATOR YANG DIPERLUKAN
- Simulator / Penganalisis Medis Tertelusur KAN
- Electrical Safety Analyzer (IEC 62353)
- Termohigrometer Digital Terkalibrasi

### 4. PROSEDUR PELAKSANAAN KALIBRASI
1. **Pemeriksaan Fisik**: Cek integritas casing, kabel daya, tombol kontrol, dan display.
2. **Pemeriksaan Fungsi**: Lakukan self-test booting dan verifikasi respons alarm audio-visual.
3. **Uji Keselamatan Listrik**: Ukur resistansi pembumian (< 0.2 Ω) dan arus bocor pasien (< 100 µA).
4. **Pengujian Parameter Kinerja**: Lakukan pengukuran pada titik-titik uji nominal dengan pengulangan minimal 3 kali.
5. **Evaluasi Ketidakpastian**: Hitung estimasi ketidakpastian baku gabungan (uc) dan ketidakpastian diperluas (U95) dengan k=2.
6. **Pelabelan**: Pasang stiker hijau "LAIK PAKAI" jika dalam batas toleransi, atau "TIDAK LAIK" jika melampaui batas MPE.`;

      setResult(fallbackIK);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2500);
    }
  };

  // Print Official PDF for selected catalog device
  const printOfficialIK = (device: MedicalDeviceCategory) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const marginX = 18;
      let yPos = 20;

      // Header Branding
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text("PT SPEKTRUM KREASI PRATAMA", marginX, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("LABORATORIUM KALIBRASI TERAKREDITASI KAN LK-291-IDN & LP-1849-IDN", marginX, yPos);
      yPos += 4;

      doc.setDrawColor(37, 99, 235);
      doc.setLineWidth(0.6);
      doc.line(marginX, yPos, 192, yPos);
      yPos += 8;

      // Title Box
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, yPos, 174, 18, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(marginX, yPos, 174, 18, 'D');

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(`INSTRUKSI KERJA KALIBRASI: ${device.name.toUpperCase()}`, marginX + 4, yPos + 7);

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(37, 99, 235);
      doc.text(`KODE DOKUMEN: ${device.codeIK} | ACUAN: ${device.standardRef}`, marginX + 4, yPos + 13);
      yPos += 24;

      // Section 1: Tujuan
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("1. TUJUAN & RUANG LINGKUP", marginX, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(`Instruksi Kerja ini mengatur prosedur operasional standar verifikasi metrologis pada instrumen ${device.name}.`, marginX + 4, yPos);
      yPos += 4.5;
      doc.text(`Kategori: ${device.category} | Interval Kalibrasi: ${device.calibrationIntervalMonths || 12} Bulan.`, marginX + 4, yPos);
      yPos += 7;

      // Section 2: Kondisi Lingkungan
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("2. KONDISI LINGKUNGAN KALIBRASI", marginX, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("• Suhu Ruang Operasi: 20°C ± 5°C (Stabil selama pengujian)", marginX + 4, yPos);
      yPos += 4.5;
      doc.text("• Kelembaban Relatif: 40% - 75% RH", marginX + 4, yPos);
      yPos += 4.5;
      doc.text("• Sumber Listrik: 220V ± 10% AC, Grounding < 0.2 Ohm", marginX + 4, yPos);
      yPos += 7;

      // Section 3: Cek Fisik & Fungsi
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("3. PEMERIKSAAN FISIK & FUNGSI", marginX, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`• Pemeriksaan Fisik: ${device.inspections.physical.join(', ')}`, marginX + 4, yPos);
      yPos += 4.5;
      doc.text(`• Pemeriksaan Fungsi: ${device.inspections.functional.join(', ')}`, marginX + 4, yPos);
      yPos += 7;

      // Section 4: Parameter & Titik Ukur
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("4. PARAMETER PENGUKURAN & BATAS TOLERANSI MPE", marginX, yPos);
      yPos += 6;

      // Table Header
      doc.setFillColor(30, 41, 59);
      doc.rect(marginX, yPos, 174, 6, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.text('No', marginX + 2, yPos + 4.2);
      doc.text('Parameter Uji', marginX + 10, yPos + 4.2);
      doc.text('Satuan', marginX + 70, yPos + 4.2);
      doc.text('Titik Uji Nominal', marginX + 95, yPos + 4.2);
      doc.text('Toleransi MPE', marginX + 145, yPos + 4.2);
      yPos += 6;

      // Table Rows
      doc.setTextColor(15, 23, 42);
      doc.setFont("Helvetica", "normal");
      device.parameters.forEach((param, idx) => {
        doc.setFillColor(idx % 2 === 0 ? '#ffffff' : '#f8fafc');
        doc.rect(marginX, yPos, 174, 6, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(marginX, yPos + 6, marginX + 174, yPos + 6);

        doc.text(`${idx + 1}`, marginX + 2, yPos + 4.2);
        doc.text(param.name, marginX + 10, yPos + 4.2);
        doc.text(param.unit, marginX + 70, yPos + 4.2);
        doc.text(param.points.join(', '), marginX + 95, yPos + 4.2);
        doc.text(`± ${param.tolerance}%`, marginX + 145, yPos + 4.2);
        yPos += 6;
      });
      yPos += 8;

      // Section 5: Evaluasi Ketidakpastian & Aturan Keputusan
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("5. ESTIMASI KETIDAKPASTIAN & ATURAN KEPUTUSAN KAN K-01", marginX, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.text("• Ketidakpastian Baku Gabungan (uc) dihitung dari u_resolusi, u_sertifikat master, u_repeatability, dan u_drift.", marginX + 4, yPos);
      yPos += 4.5;
      doc.text("• Ketidakpastian Diperluas (U95) dilaporkan pada tingkat kepercayaan 95% dengan faktor cakupan k=2.", marginX + 4, yPos);
      yPos += 4.5;
      doc.text("• Aturan Keputusan (Decision Rule): Alat dinyatakan LAIK PAKAI jika |Penyimpangan| + U95 ≤ Batas MPE.", marginX + 4, yPos);
      yPos += 14;

      // Signature Box
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Disusun Oleh:", marginX, yPos);
      doc.text("Disetujui Oleh (Manajer Teknis):", marginX + 100, yPos);
      yPos += 14;
      doc.text("_______________________", marginX, yPos);
      doc.text("_______________________", marginX + 100, yPos);

      doc.save(`${device.codeIK}_Instruksi_Kerja.pdf`);
      setShowPdfSuccess(true);
      setTimeout(() => setShowPdfSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 text-slate-100 animate-fade-in">
      {/* Toast Alert */}
      {showPdfSuccess && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>Dokumen Instruksi Kerja berhasil diunduh dalam format PDF!</span>
        </div>
      )}

      {/* Hero Header */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest font-mono">
              <BookOpen className="w-4 h-4 text-indigo-400" /> Pustaka & Generator Instruksi Kerja (IK) Standar KAN LK-291
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white uppercase font-mono">
                  Instruksi Kerja <span className="bg-gradient-to-r from-indigo-400 via-rose-300 to-amber-400 bg-clip-text text-transparent">Metrologi Alkes</span>
                </h1>
                <p className="text-slate-400 max-w-2xl text-sm md:text-base mt-2 leading-relaxed">
                  Pusat dokumentasi SOP resmi prosedur pengujian, batasan MPE, tata kelola K3, dan acuan regulasi Kemenkes / KAN untuk 18+ kategori instrumen elektromedik.
                </p>
              </div>

              {/* Tab Switcher */}
              <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('library')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                    activeTab === 'library'
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Pustaka IK Resmi (18 Alkes)</span>
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer",
                    activeTab === 'ai'
                      ? "bg-gradient-to-r from-rose-600 to-indigo-600 text-white shadow-md"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  <Wand2 className="w-4 h-4" />
                  <span>AI Synthesizer IK Khusus</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* ════════════════ TAB 1: PUSTAKA IK RESMI ════════════════ */}
      {activeTab === 'library' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari Instruksi Kerja berdasarkan nama alat, kode IK, atau standar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold placeholder:text-slate-500 outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {['All', 'Life Support', 'Diagnostic', 'Therapeutic', 'Laboratory', 'Radiology'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left: Device Selection List (4 Cols) */}
            <div className="lg:col-span-4 space-y-2.5 max-h-[720px] overflow-y-auto custom-scrollbar pr-1">
              {filteredDevices.map((device) => {
                const isSelected = selectedDevice.id === device.id;
                return (
                  <div
                    key={device.id}
                    onClick={() => setSelectedDevice(device)}
                    className={cn(
                      "p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                      isSelected
                        ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/40"
                        : "bg-slate-900/80 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700"
                    )}
                  >
                    <div className="space-y-1 min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[9px] font-mono font-bold">
                          {device.codeIK}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {device.category}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-300 transition-colors">
                        {device.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 truncate font-mono">
                        {device.parameters.length} Parameter Uji | ±{device.parameters[0]?.tolerance}% MPE
                      </p>
                    </div>

                    <ChevronRight className={cn(
                      "w-4 h-4 shrink-0 transition-transform",
                      isSelected ? "text-indigo-400 translate-x-1" : "text-slate-600 group-hover:text-slate-400"
                    )} />
                  </div>
                );
              })}
            </div>

            {/* Right: Detailed SOP Viewer (8 Cols) */}
            <div className="lg:col-span-8">
              <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
                {/* Header of selected IK */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-[10px] text-indigo-400 uppercase font-black tracking-widest">
                      <span>{selectedDevice.codeIK}</span>
                      <span>•</span>
                      <span>{selectedDevice.category}</span>
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white font-mono uppercase">
                      {selectedDevice.name}
                    </h2>
                    <p className="text-xs text-slate-400 font-mono">
                      Acuan Standar: <span className="text-cyan-400">{selectedDevice.standardRef}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => printOfficialIK(selectedDevice)}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 border border-slate-700 cursor-pointer shadow-sm"
                    >
                      <Printer className="w-4 h-4 text-rose-400" />
                      <span>Cetak PDF IK</span>
                    </button>
                    <button
                      onClick={() => navigate('/worksheets')}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Buat LK</span>
                    </button>
                  </div>
                </div>

                {/* SOP 6 Steps Accordion Cards */}
                <div className="space-y-4 text-xs">
                  {/* Phase 1: Persiapan & K3 */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-indigo-400 font-black uppercase tracking-wider font-mono">
                      <ShieldCheck className="w-4 h-4" />
                      <span>1. Persiapan K3 & Standar Metrologi</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Teknisi metrologi wajib mengenakan APD standar laboratorium elektromedik (jas lab, sepatu anti-statis ESD). Pastikan instrumen telah beradaptasi dengan lingkungan pengujian minimal 30 menit sebelum pengukuran dimulai.
                    </p>
                  </div>

                  {/* Phase 2: Lingkungan */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black uppercase tracking-wider font-mono">
                      <Thermometer className="w-4 h-4" />
                      <span>2. Kondisi Lingkungan Kalibrasi</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1 text-slate-300 font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Suhu Kerja</span>
                        <span className="font-bold text-white">20°C ± 5°C</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-[10px] text-slate-500 block">Kelembaban (RH)</span>
                        <span className="font-bold text-white">40% - 75% RH</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
                        <span className="text-[10px] text-slate-500 block">Tegangan Catu</span>
                        <span className="font-bold text-white">220V ± 10% AC</span>
                      </div>
                    </div>
                  </div>

                  {/* Phase 3: Pemeriksaan Fisik & Fungsi */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-black uppercase tracking-wider font-mono">
                      <Wrench className="w-4 h-4" />
                      <span>3. Checklist Pemeriksaan Fisik & Fungsi</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1 font-mono uppercase">Uji Fisik Visual:</span>
                        <ul className="space-y-1 text-slate-300">
                          {selectedDevice.inspections.physical.map((item, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 block mb-1 font-mono uppercase">Uji Fungsi & Self-Test:</span>
                        <ul className="space-y-1 text-slate-300">
                          {selectedDevice.inspections.functional.map((item, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Phase 4: Prosedur Titik Ukur & Toleransi */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-cyan-400 font-black uppercase tracking-wider font-mono">
                        <Sliders className="w-4 h-4" />
                        <span>4. Parameter Pengukuran & Batas Toleransi MPE</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">Pengulangan: 3 - 5x</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                            <th className="py-2">Parameter</th>
                            <th className="py-2">Satuan</th>
                            <th className="py-2">Titik Uji Nominal</th>
                            <th className="py-2">Batas MPE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {selectedDevice.parameters.map((p, idx) => (
                            <tr key={idx}>
                              <td className="py-2.5 font-bold text-white">{p.name}</td>
                              <td className="py-2.5 text-cyan-400">{p.unit}</td>
                              <td className="py-2.5 text-slate-300">{p.points.join(', ')}</td>
                              <td className="py-2.5 text-rose-400 font-bold">± {p.tolerance}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Phase 5: Ketidakpastian & Decision Rule */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-black uppercase tracking-wider font-mono">
                      <Sparkles className="w-4 h-4" />
                      <span>5. Aturan Keputusan KAN K-01 & Pelabelan</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">
                      Sertifikat diterbitkan dengan status <b>"LAIK PAKAI"</b> jika deviasi pengukuran ditambah ketidakpastian diperluas U95 berada di dalam pita penerimaan MPE. Segera bubuhkan stiker barcode hijau KAN LK-291 pada bodi depan alat setelah verifikasi selesai.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TAB 2: AI SYNTHESIZER KHUSUS ════════════════ */}
      {activeTab === 'ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Input Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest font-mono">AI Technical Synthesizer</span>
                <h3 className="text-lg font-black text-white uppercase font-mono">Rumuskan IK Alat Medis Khusus</h3>
                <p className="text-xs text-slate-400">
                  Masukkan informasi instrumen medis non-katalog. AI akan menyusun dokumen IK terakreditasi KAN secara otomatis.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-400 block mb-1">Nama Alat Kesehatan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Phacoemulsifier Mata"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-bold text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Merk / Pabrikan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Alcon / Bausch & Lomb"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-400 block mb-1">Model / Tipe Seri</label>
                  <input
                    type="text"
                    placeholder="Contoh: Centurion Vision System"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !formData.name}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:opacity-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyintesis Dokumen IK...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Sintesis Dokumen IK Sekarang</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right: Output Viewer (7 Cols) */}
          <div className="lg:col-span-7">
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 min-h-[500px]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">Hasil Sintesis Dokumen IK</span>
                </div>
                {result && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <ClipboardCopy className="w-3.5 h-3.5" />
                      <span>{showCopied ? 'Tersalin!' : 'Salin'}</span>
                    </button>
                  </div>
                )}
              </div>

              {result ? (
                <div className="prose prose-invert prose-sm max-w-none font-mono text-xs leading-relaxed max-h-[580px] overflow-y-auto custom-scrollbar pr-2">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
              ) : (
                <div className="h-96 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <Wand2 className="w-12 h-12 text-slate-700 animate-pulse" />
                  <p className="text-xs text-slate-500 font-mono">
                    Belum ada dokumen yang disintesis. Masukkan nama alat kesehatan di sebelah kiri untuk menghasilkan instruksi kerja.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
