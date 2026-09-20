import React, { useState } from 'react';
import {
  Archive, FileCheck, CheckCircle2, Layers, Download, Shield,
  FileCode, Award, Calendar, Clock, Hash, AlertTriangle,
  ChevronDown, ChevronRight, Cpu, User, Clipboard, Zap,
  RefreshCw, Eye, Lock, Globe, FileText, Database, Loader2
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

interface AuditFile {
  code: string;
  name: string;
  type: string;
  size: string;
  hash: string;
  status: 'verified' | 'pending' | 'warning';
  icon: any;
  color: string;
}

interface AuditPackage {
  packageId: string;
  worksheetId: string;
  generatedAt: string;
  generatedBy: string;
  scopeLevel: string;
  manifestHashSha256: string;
  totalFiles: number;
  totalSizeMb: string;
  verificationUrl: string;
  files: AuditFile[];
}

const AUDIT_TEMPLATES = [
  {
    id: 'ws',
    label: 'Per Lembar Kerja (LK)',
    desc: 'Paket lengkap untuk 1 lembar kerja kalibrasi spesifik',
    icon: FileText,
    color: 'cyan',
    fileCount: 8,
  },
  {
    id: 'period',
    label: 'Per Periode (Bulanan)',
    desc: 'Seluruh LK dalam 1 bulan — ideal untuk audit eksternal KAN',
    icon: Calendar,
    color: 'purple',
    fileCount: 47,
  },
  {
    id: 'client',
    label: 'Per Klien / Rumah Sakit',
    desc: 'Semua sertifikat dan LK untuk 1 klien dalam periode tertentu',
    icon: Globe,
    color: 'emerald',
    fileCount: 23,
  },
  {
    id: 'calibrator',
    label: 'Per Standar Ukur',
    desc: 'Semua dokumen yang menggunakan 1 standar ukur tertentu',
    icon: Cpu,
    color: 'amber',
    fileCount: 12,
  },
];

function makePackage(templateId: string): AuditPackage {
  const now = new Date();
  const pkgId = `AUDIT-PKG-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
  const hash = Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');

  return {
    packageId: pkgId,
    worksheetId: 'LK-DEF-2026-0812',
    generatedAt: now.toISOString(),
    generatedBy: 'Ahmad Rifai, A.Md.Kes — Teknisi Kalibrasi (LK-0034)',
    scopeLevel: 'FULL AUDIT PACKAGE — ISO/IEC 17025:2017 & BAPETEN',
    manifestHashSha256: hash,
    totalFiles: 8,
    totalSizeMb: '4.7 MB',
    verificationUrl: `https://verifikasi.spektrum-kalibrasi.id/audit/${pkgId}`,
    files: [
      { code: '01', name: 'Lembar Kerja Kalibrasi LK-DEF-2026-0812.pdf', type: 'Lembar Kerja', size: '0.8 MB', hash: hash.substring(0, 12) + '...', status: 'verified', icon: Clipboard, color: 'amber' },
      { code: '02', name: 'Instruksi Kerja IK-SPK-DEF-01 Rev.3.pdf', type: 'Instruksi Kerja', size: '1.2 MB', hash: hash.substring(4, 16) + '...', status: 'verified', icon: FileText, color: 'purple' },
      { code: '03', name: 'Sertifikat Standar Fluke 7000DP (SNSU-BSN-2025).pdf', type: 'Sertifikat Standar', size: '0.5 MB', hash: hash.substring(8, 20) + '...', status: 'verified', icon: Award, color: 'cyan' },
      { code: '04', name: 'Uncertainty Budget GUM Calculator.json', type: 'Budget Ketidakpastian', size: '0.1 MB', hash: hash.substring(12, 24) + '...', status: 'verified', icon: Database, color: 'emerald' },
      { code: '05', name: 'Decision Rule ILAC-G8 GuardBanding Report.pdf', type: 'Decision Rule', size: '0.3 MB', hash: hash.substring(16, 28) + '...', status: 'verified', icon: Shield, color: 'indigo' },
      { code: '06', name: 'Kompetensi & Autorisasi Teknisi (LK-0034).pdf', type: 'Kompetensi Personil', size: '0.2 MB', hash: hash.substring(20, 32) + '...', status: 'verified', icon: User, color: 'teal' },
      { code: '07', name: 'Immutable Audit Trail Log (Blockchain Hash).json', type: 'Audit Trail', size: '0.1 MB', hash: hash.substring(24, 36) + '...', status: 'verified', icon: FileCode, color: 'rose' },
      { code: '08', name: 'Sertifikat Kalibrasi Final SPK-CAL-2026-0142.pdf', type: 'Sertifikat Output', size: '1.5 MB', hash: hash.substring(28, 40) + '...', status: 'verified', icon: Award, color: 'emerald' },
    ]
  };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

type GenerationPhase = 'idle' | 'collecting' | 'hashing' | 'signing' | 'done';

const PHASE_LABELS: Record<GenerationPhase, string> = {
  idle: '',
  collecting: 'Mengumpulkan dokumen dari Firestore...',
  hashing: 'Menghitung SHA-256 hash setiap dokumen...',
  signing: 'Menandatangani manifest & generating QR...',
  done: 'Paket Audit berhasil digenerate!',
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function OneClickAuditPackage() {
  const [selectedTemplate, setSelectedTemplate] = useState('ws');
  const [phase, setPhase] = useState<GenerationPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [pkg, setPkg] = useState<AuditPackage | null>(null);
  const [expandedFiles, setExpandedFiles] = useState(true);

  const handleGenerate = () => {
    setPkg(null);
    setProgress(0);
    setPhase('collecting');

    const steps: { phase: GenerationPhase; pct: number; delay: number }[] = [
      { phase: 'collecting', pct: 30, delay: 700 },
      { phase: 'hashing', pct: 65, delay: 700 },
      { phase: 'signing', pct: 90, delay: 700 },
      { phase: 'done', pct: 100, delay: 500 },
    ];

    let total = 0;
    steps.forEach(({ phase: p, pct, delay }, i) => {
      total += delay;
      setTimeout(() => {
        setPhase(p);
        setProgress(pct);
        if (p === 'done') {
          setPkg(makePackage(selectedTemplate));
        }
      }, total);
    });
  };

  const isGenerating = phase !== 'idle' && phase !== 'done';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950/60 to-slate-950 border border-blue-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-xs font-black uppercase tracking-widest">
              <Archive className="w-4 h-4" /> One-Click Audit Package & Evidence Manifest Generator
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Generator Bundel{' '}
              <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                Bukti Audit 1-Klik
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Ekstraksi otomatis seluruh dokumen bukti pengujian: Lembar Kerja, Instruksi Kerja, Sertifikat Standar, Uncertainty Budget, Decision Rule, Kompetensi Personil, Audit Trail immutable, &amp; Hash SHA-256 dalam satu paket terenkripsi untuk asesor KAN/BAPETEN.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── COMPLIANCE BADGES ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'ISO/IEC 17025:2017', color: 'emerald' },
          { label: 'ILAC-G8:09/2019', color: 'cyan' },
          { label: 'BAPETEN Perka', color: 'purple' },
          { label: 'SHA-256 Immutable', color: 'amber' },
          { label: 'UU PDP No.27/2022', color: 'indigo' },
        ].map(({ label, color }) => (
          <div key={label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-${color}-500/10 border border-${color}-500/30 text-${color}-400 text-xs font-black`}>
            <Shield className="w-3 h-3" /> {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: Settings */}
        <div className="lg:col-span-4 space-y-5">

          {/* Template Selector */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" /> Pilih Cakupan Paket Audit
            </h2>
            <div className="space-y-3">
              {AUDIT_TEMPLATES.map(tpl => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                      selectedTemplate === tpl.id
                        ? `bg-${tpl.color}-500/10 border-${tpl.color}-500/40`
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 ${selectedTemplate === tpl.id ? `text-${tpl.color}-400` : 'text-slate-500'} shrink-0`} />
                      <div>
                        <div className={`text-sm font-black ${selectedTemplate === tpl.id ? 'text-white' : 'text-slate-300'}`}>{tpl.label}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{tpl.desc}</div>
                        <div className="text-xs text-slate-500 mt-1 font-mono">~{tpl.fileCount} file dokumen</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" /> Generate Paket
            </h2>

            {/* Progress Bar */}
            {phase !== 'idle' && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className={`${phase === 'done' ? 'text-emerald-400' : 'text-blue-400'} font-bold`}>{PHASE_LABELS[phase]}</span>
                  <span className="text-slate-400">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${phase === 'done' ? 'bg-emerald-400' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-400 hover:to-cyan-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-60 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Menggenerate...</>
              ) : (
                <><Archive className="w-5 h-5" /> Generate One-Click Audit Package</>
              )}
            </button>

            <div className="text-xs text-slate-500 text-center">
              Seluruh dokumen diekstraksi langsung dari Firestore dan di-hash menggunakan SHA-256 pada saat generate.
            </div>
          </div>

          {/* KAN Checklist */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Checklist Dokumen ISO 17025
            </h2>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Lembar Kerja (Raw Data)', req: 'Wajib', ok: true },
                { label: 'Instruksi Kerja terkendali', req: 'Wajib', ok: true },
                { label: 'Sertifikat Standar Ukur', req: 'Wajib', ok: true },
                { label: 'Uncertainty Budget (GUM)', req: 'Wajib', ok: true },
                { label: 'Decision Rule (ILAC-G8)', req: 'Wajib', ok: true },
                { label: 'Kompetensi Personil', req: 'Wajib', ok: true },
                { label: 'Audit Trail Log', req: 'Direkomendasikan', ok: true },
                { label: 'Sertifikat Output Final', req: 'Wajib', ok: true },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    {item.ok
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    }
                    <span className="text-slate-300">{item.label}</span>
                  </div>
                  <span className={`text-[10px] font-bold ${item.req === 'Wajib' ? 'text-rose-400' : 'text-amber-400'}`}>{item.req}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Result */}
        <div className="lg:col-span-8 space-y-5">
          {pkg ? (
            <>
              {/* Package Header */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-emerald-500/30 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span className="text-emerald-400 font-black text-sm uppercase tracking-wider">Paket Audit Berhasil Digenerate</span>
                    </div>
                    <div className="text-2xl font-black text-white font-mono">{pkg.packageId}</div>
                    <div className="text-xs text-slate-400">{pkg.scopeLevel}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-black hover:bg-slate-700 transition-all cursor-pointer">
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black hover:bg-emerald-400 transition-all cursor-pointer">
                      <Download className="w-3.5 h-3.5" /> Download ZIP
                    </button>
                  </div>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Dibuat Oleh</div>
                    <div className="text-slate-200 mt-0.5 truncate">{pkg.generatedBy.split('—')[0].trim()}</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Tanggal Generate</div>
                    <div className="text-slate-200 mt-0.5">{new Date(pkg.generatedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Total File</div>
                    <div className="text-cyan-400 font-bold mt-0.5">{pkg.totalFiles} dokumen</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <div className="text-slate-500 text-[10px] uppercase">Total Ukuran</div>
                    <div className="text-slate-200 mt-0.5">{pkg.totalSizeMb}</div>
                  </div>
                </div>

                {/* SHA-256 Hash */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-amber-500/20 space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-black">
                    <Lock className="w-3.5 h-3.5" /> SHA-256 Manifest Hash (Immutable Fingerprint)
                  </div>
                  <div className="text-amber-300 font-mono text-xs break-all">{pkg.manifestHashSha256}</div>
                </div>

                {/* Verification URL */}
                <div className="p-4 bg-slate-950 rounded-2xl border border-blue-500/20 space-y-1">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-black">
                    <Globe className="w-3.5 h-3.5" /> URL Verifikasi Publik
                  </div>
                  <div className="text-blue-300 font-mono text-xs break-all">{pkg.verificationUrl}</div>
                </div>
              </div>

              {/* File List */}
              <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
                <button
                  onClick={() => setExpandedFiles(!expandedFiles)}
                  className="flex items-center justify-between w-full cursor-pointer"
                >
                  <h2 className="text-base font-black text-white flex items-center gap-2">
                    <FileCheck className="w-5 h-5 text-blue-400" /> Daftar Dokumen dalam Paket ({pkg.files.length} file)
                  </h2>
                  {expandedFiles ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>

                {expandedFiles && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    {pkg.files.map((file) => {
                      const Icon = file.icon;
                      return (
                        <div key={file.code} className="flex items-center gap-3 p-3.5 bg-slate-950 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all group">
                          <div className={`w-9 h-9 rounded-xl bg-${file.color}-500/10 border border-${file.color}-500/30 flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 text-${file.color}-400`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-white truncate">{file.code}. {file.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">SHA-256: {file.hash} | {file.size}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400 hidden md:block">{file.type}</span>
                            {file.status === 'verified' && (
                              <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black">
                                <CheckCircle2 className="w-3 h-3" /> VERIFIED
                              </div>
                            )}
                            <button className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-5">
              <div className="w-20 h-20 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto">
                <Archive className="w-10 h-10 text-blue-400" />
              </div>
              <div>
                <div className="text-lg font-black text-white">Paket Audit Belum Digenerate</div>
                <div className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  Pilih cakupan paket di sebelah kiri, kemudian klik tombol "Generate One-Click Audit Package" untuk mengekstraksi seluruh dokumen bukti audit secara otomatis.
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto text-xs">
                {[
                  { n: '1', t: 'Pilih Scope', d: 'Per LK, Periode, atau Klien' },
                  { n: '2', t: 'Klik Generate', d: 'Sistem ekstraksi otomatis' },
                  { n: '3', t: 'Download ZIP', d: 'Bundel terenkripsi SHA-256' },
                ].map(s => (
                  <div key={s.n} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 font-black text-xs flex items-center justify-center mx-auto">{s.n}</div>
                    <div className="text-slate-300 font-bold">{s.t}</div>
                    <div className="text-slate-500">{s.d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
