import React, { useState } from 'react';
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
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';

export function IKAssistant() {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);

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
      setError(err.message);
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

  const printIK = () => {
    if (!result) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Layout boundary configuration
      const marginX = 20;
      let yPos = 25;
      const pageHeight = 280;

      // Premium Header Logo/Branding
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("KEMENTERIAN KESEHATAN REPUBLIK INDONESIA", marginX, yPos);
      yPos += 5.5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("SPEKTRUM UTAMA METROLOGI INTEGRASI DIGITAL", marginX, yPos);
      yPos += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.4);
      doc.line(marginX, yPos, 190, yPos);
      yPos += 10;

      // Title Details
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("INSTRUKSI KERJA (IK) ALAT MEDIS", marginX, yPos);
      yPos += 8;

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.text(`${formData.name.toUpperCase()} — ${formData.brand.toUpperCase()} (${formData.model.toUpperCase()})`, marginX, yPos);
      yPos += 10;

      // Document reference block
      doc.setDrawColor(241, 245, 249);
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, yPos, 170, 14, "F");
      
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text("KODE REGISTRASI PROTOKOL: IK-AI-SYS-" + formData.name.substring(0,3).toUpperCase(), marginX + 5, yPos + 6);
      doc.setFont("Helvetica", "normal");
      doc.text("METODE EKSTRAKSI: GENERATIVE AI AUTO-SINTESIS", marginX + 110, yPos + 6);
      
      doc.setFont("Helvetica", "normal");
      doc.text("STATUS DOKUMEN: RESMI / DISETUJUI", marginX + 5, yPos + 10);
      doc.text("TANGGAL BERLAKU: " + new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }), marginX + 110, yPos + 10);
      
      yPos += 24;

      // Parse the AI Markdown and render cleanly
      const lines = result.split("\n");
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) {
          yPos += 4;
          return;
        }

        // Handle page boundaries proactively
        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 25;
        }

        // Header 1 (# Section)
        if (trimmed.startsWith("# ")) {
          yPos += 4;
          if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(13);
          doc.setTextColor(15, 23, 42);
          const cleanText = trimmed.replace(/^#\s+/, "");
          doc.text(cleanText, marginX, yPos);
          yPos += 8;
        }
        // Header 2 (## Section)
        else if (trimmed.startsWith("## ")) {
          yPos += 3;
          if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(11);
          doc.setTextColor(37, 99, 235);
          const cleanText = trimmed.replace(/^##\s+/, "");
          doc.text(cleanText, marginX, yPos);
          yPos += 7;
        }
        // Header 3 (### Section)
        else if (trimmed.startsWith("### ")) {
          yPos += 2;
          if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          const cleanText = trimmed.replace(/^###\s+/, "");
          doc.text(cleanText, marginX, yPos);
          yPos += 6;
        }
        // Bullet patterns and standard lists (* / - / index)
        else if (trimmed.startsWith("- ") || trimmed.startsWith("* ") || /^\d+\.\s/.test(trimmed)) {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(51, 65, 85);
          // Strip bold markers
          const cleanText = trimmed.replace(/\*\*/g, "");
          const isNumeric = /^\d+\.\s/.test(cleanText);
          const listMarker = isNumeric ? "" : "• ";
          
          const splitText = doc.splitTextToSize(listMarker + cleanText, 162);
          doc.text(splitText, marginX + 4, yPos);
          yPos += (splitText.length * 4.8) + 1.5;
        }
        // Bold paragraph text or normal blocks
        else {
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(51, 65, 85);
          const cleanText = trimmed.replace(/\*\*/g, ""); 
          const splitText = doc.splitTextToSize(cleanText, 170);
          doc.text(splitText, marginX, yPos);
          yPos += (splitText.length * 4.8) + 2;
        }
      });

      // Add elegant Footer containing page tracker on all A4 sheets
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("Helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        
        // Print footers
        doc.text(`Spektrum Kalibrasi Digital — Dokumen Instruksi Kerja (IK) untuk ${formData.name}`, marginX, 287);
        doc.text(`Halaman ${i} dari ${pageCount}`, 172, 287);
        
        // Decorative bottom thin line
        doc.setDrawColor(241, 245, 249);
        doc.line(marginX, 283, 190, 283);
      }

      // Trigger automatic save direct download
      doc.save(`IK-${formData.name.replace(/\s+/g, "_")}.pdf`);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2500);
    } catch (e: any) {
      console.error("PDF generation failed:", e);
      alert("Gagal melakukan ekspor PDF: " + e.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-20 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-fade-in">
        <div className="space-y-4">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-1 bg-blue-600 rounded-full" />
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] font-mono">Cognitive Automation AI</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                 <Wand2 className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tighter leading-none lowercase">
                Asisten <span className="text-blue-600 italic">IK Cerdas</span>
              </h1>
           </div>
           <p className="text-slate-600 dark:text-slate-300 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Protokol Dokumentasi Metrologi Berbasis AI</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Input Section */}
        <section className="lg:col-span-1 space-y-8 print:hidden">
          <div className="bg-white dark:bg-[#090e1d] border border-slate-100 dark:border-slate-800 rounded-[3rem] p-10 shadow-2xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden transition-all hover:border-blue-400">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[80px] rounded-full -mr-10 -mt-10" />
            
            <h2 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-8 italic flex items-center gap-3">
               <Stethoscope className="w-4 h-4" />
               Spesifikasi Alat Medis
            </h2>
                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              <InputGroup label="Nama Instrumen" icon={FileText}>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Infusion Pump"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono italic"
                />
              </InputGroup>

               <InputGroup label="Merek Pabrikan" icon={Activity}>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Terumo BCT"
                  value={formData.brand}
                  onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono italic"
                />
              </InputGroup>

              <InputGroup label="Model / Tipe" icon={Zap}>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: TE-331 Digital"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 transition-all font-mono italic"
                />
              </InputGroup>

              <button 
                type="submit"
                disabled={loading}
                className={cn(
                  "w-full flex items-center justify-center gap-4 py-6 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/30 italic cursor-pointer",
                  loading ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none border border-slate-200 dark:border-slate-700" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menganalisis Data Metrologi...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Sintesis Instruksi Kerja AI
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-105 dark:border-blue-900/30 rounded-[2.5rem] p-8 shadow-inner shadow-blue-500/5">
            <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 italic font-mono">Cognitive Prompting</h3>
            <p className="text-[11px] text-blue-400 dark:text-blue-300 leading-relaxed font-semibold">
              "Dokumentasi presisi membutuhkan simpul data spesifik. AI melacak dan menyintesis petunjuk ini berdasarkan formulasi metrologi nasional dan internasional."
            </p>
          </div>
        </section>

        {/* Output Section */}
        <section className="lg:col-span-2 print:col-span-full">
          <AnimatePresence mode="wait">
            {!result && !loading && !error && (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center text-center p-12 bg-white dark:bg-[#090e1d] border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3.5rem] shadow-sm italic"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-200 dark:text-slate-700 mb-8 shadow-inner">
                  <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-300 dark:text-slate-700 mb-3 tracking-tight uppercase">Sistem Siap</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 max-w-sm mx-auto font-semibold leading-relaxed">Silakan lengkapi spesifikasi instrumen medis Anda di panel kiri untuk menyintesis Instruksi Kerja (IK) otomatis.</p>
              </motion.div>
            )}

            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[500px] flex flex-col items-center justify-center space-y-8"
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-[2.5rem] border-4 border-blue-105 border-t-blue-600 animate-spin"></div>
                  <Wand2 className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 text-blue-600 animate-pulse" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 italic">Menerjemahkan Formulasi Metrologi...</h3>
                  <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.4em] animate-pulse font-mono">PROSES SINTESIS DOKUMEN INSTRUKSI KERJA OLEH AI</p>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-red-50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/40 rounded-[3.5rem] p-20 text-center shadow-xl shadow-red-500/5 italic"
              >
                <div className="text-red-600 mb-8 flex justify-center">
                   <History className="w-16 h-16 opacity-30 text-red-500" />
                </div>
                <h3 className="text-2xl font-black text-red-600 dark:text-red-400 mb-3 tracking-tight uppercase">Sintesis Protokol Gagal</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-10 max-w-sm mx-auto font-medium leading-relaxed">{error}</p>
                <button 
                  onClick={() => handleSubmit({ preventDefault: () => {} } as any)}
                  className="px-10 py-5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-red-600/30 hover:bg-red-700 active:scale-95 transition-all cursor-pointer"
                >
                  Coba Menghasilkan Kembali
                </button>
              </motion.div>
            )}

            {result && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#0c132b] border border-slate-100 dark:border-slate-800 rounded-[3.5rem] shadow-2xl overflow-hidden print:shadow-none transition-all hover:border-blue-500 relative print-area"
              >
                {showCopied && (
                  <div className="absolute top-4 right-4 z-50 bg-emerald-600 text-white text-[9px] font-black tracking-widest uppercase px-5 py-2.5 rounded-xl shadow-lg border border-emerald-500/30 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Teks berhasil disalin ke clipboard
                  </div>
                )}
                
                <div className="px-6 sm:px-12 pt-8 sm:pt-12 pb-6 sm:pb-8 bg-slate-50 dark:bg-[#080d1a] border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between flex-wrap gap-8 print:hidden">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-2 font-mono leading-none italic">Draf Konfigurasi Protokol</h3>
                    <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase leading-tight">{formData.name} <span className="text-blue-600 dark:text-blue-400">•</span> {formData.brand}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={copyToClipboard}
                      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all shadow-xl shadow-slate-200/50 dark:shadow-none active:scale-95 cursor-pointer"
                      title="Salin Teks"
                    >
                      <ClipboardCopy className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </button>
                    <button 
                      onClick={printIK}
                      className="px-8 py-5 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/40 flex items-center gap-4 active:scale-95 cursor-pointer"
                    >
                      <Printer className="w-5 h-5" />
                      <span className="text-[11px] font-black uppercase tracking-widest">Cetak / Simpan</span>
                    </button>
                  </div>
                </div>
                
                <div className="markdown-body p-6 sm:p-12 text-slate-700 dark:text-slate-200 prose prose-slate max-w-none prose-sm prose-headings:text-slate-900 dark:prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-headings:italic prose-strong:text-slate-900 dark:prose-strong:text-white prose-li:marker:text-blue-600 dark:prose-li:marker:text-blue-400 leading-relaxed font-semibold">
                  <ReactMarkdown>{result}</ReactMarkdown>
                </div>
 
                <div className="bg-slate-950 p-8 flex items-center justify-center gap-4 print:hidden">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.4em] font-mono italic">ALUR KERJA SINTESIS AI • DIVERIFIKASI UNTUK KEANDALAN DATA</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}

function InputGroup({ label, icon: Icon, children }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-1">
        <Icon className="w-4 h-4 text-blue-600" />
        <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest font-mono italic">{label}</label>
      </div>
      <div className="relative group">
        {children}
      </div>
    </div>
  );
}
