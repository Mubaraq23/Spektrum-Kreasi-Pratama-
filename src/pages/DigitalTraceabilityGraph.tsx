import React, { useState } from 'react';
import {
  GitCommit, AlertTriangle, ShieldCheck, Layers, Search, Zap,
  Stethoscope, Award, ChevronRight, ChevronDown, Database,
  FileText, Wrench, Cpu, Link2, ArrowRight, AlertOctagon,
  CheckCircle2, XCircle, Clock, Eye, RefreshCw
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES & DATA ─────────────────────────────────────────────────────────────

type NodeType = 'CALIBRATOR' | 'METHOD' | 'WORKSHEET' | 'CERTIFICATE' | 'ASSET' | 'REGULATION';
type NodeStatus = 'OK' | 'WARNING' | 'OOT' | 'EXPIRED';

interface TraceNode {
  id: string;
  type: NodeType;
  label: string;
  detail: string;
  status: NodeStatus;
  certNo?: string;
  validUntil?: string;
  impactCount?: number;
}

interface TraceChain {
  id: string;
  label: string;
  description: string;
  nodes: TraceNode[];
}

const NODE_CONFIG: Record<NodeType, { icon: any; color: string; bgColor: string }> = {
  CALIBRATOR: { icon: Cpu, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10 border-cyan-500/30' },
  METHOD: { icon: FileText, color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/30' },
  WORKSHEET: { icon: Layers, color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/30' },
  CERTIFICATE: { icon: Award, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/30' },
  ASSET: { icon: Stethoscope, color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/30' },
  REGULATION: { icon: ShieldCheck, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10 border-indigo-500/30' },
};

const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; icon: any }> = {
  OK: { label: 'Valid', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30', icon: CheckCircle2 },
  WARNING: { label: 'Segera Dikalibrasi', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30', icon: AlertTriangle },
  OOT: { label: 'Out-of-Tolerance', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30', icon: XCircle },
  EXPIRED: { label: 'Kadaluarsa', color: 'text-slate-400 bg-slate-500/10 border-slate-500/30', icon: Clock },
};

const TRACE_CHAINS: TraceChain[] = [
  {
    id: 'def',
    label: 'Rantai Kalibrasi Defibrillator',
    description: 'Fluke Impulse 7000DP → IK-SPK-DEF-01 → LK-DEF-2026-0812 → SPK/CAL/2026/08-0142 → EQ-DEF-2026-089',
    nodes: [
      {
        id: 'n1', type: 'REGULATION', label: 'Permenkes No. 54/2015 + IEC 60601-2-4',
        detail: 'Standar acuan pengujian defibrillator', status: 'OK', validUntil: 'Berlaku'
      },
      {
        id: 'n2', type: 'CALIBRATOR', label: 'Fluke Impulse 7000DP', certNo: 'SNSU-BSN/2025/11-094',
        detail: 'Kalibrasi Energi Defibrillator | ketertelusuran ke SNSU BSN', status: 'OK', validUntil: 'Valid s.d. 12 Agu 2027', impactCount: 14
      },
      {
        id: 'n3', type: 'METHOD', label: 'IK Kalibrasi Defibrillator Rev.3 (IK-SPK-DEF-01)',
        detail: 'Metode kerja tervalidasi, 5 titik ukur energi | Verifikasi ulang: Jan 2027', status: 'OK', validUntil: 'Valid'
      },
      {
        id: 'n4', type: 'WORKSHEET', label: 'Lembar Kerja LK-DEF-2026-0812',
        detail: 'Tanggal: 24-08-2026 | Teknisi: Ahmad Rifai | 5 setting pengukuran', status: 'OK'
      },
      {
        id: 'n5', type: 'CERTIFICATE', label: 'Sertifikat Kalibrasi SPK/CAL/2026/08-0142',
        detail: 'SHA-256: 88a12b49c0d1e... | Terbit: 24-08-2026 | Valid 1 Tahun', status: 'OK', validUntil: 'Valid s.d. 24 Agu 2027'
      },
      {
        id: 'n6', type: 'ASSET', label: 'Defibrillator Zoll R Series (EQ-DEF-2026-089)',
        detail: 'RSUD Dr. Soetomo — Ruang IGD | Health Score: 96', status: 'OK'
      },
    ]
  },
  {
    id: 'vent',
    label: 'Rantai Kalibrasi Ventilator — OOT ALERT',
    description: 'Contoh skenario: standar ukur OOT → dampak pada worksheet & sertifikat terkait',
    nodes: [
      {
        id: 'v1', type: 'CALIBRATOR', label: 'Fluke VT650 (Flow Analyzer)', certNo: 'KAN/LAB-XXX/2025/03-011',
        detail: 'OOT saat rekalibrasi — hasil drift 3.8% (MPE: ±2%)', status: 'OOT', validUntil: 'TIDAK VALID', impactCount: 7
      },
      {
        id: 'v2', type: 'METHOD', label: 'IK Kalibrasi Ventilator (IK-SPK-VENT-02 Rev.2)',
        detail: 'Metode menggunakan Fluke VT650 sebagai standar primer', status: 'WARNING'
      },
      {
        id: 'v3', type: 'WORKSHEET', label: '7 Lembar Kerja Ventilator (Jun–Agu 2026)',
        detail: '⚠️ REVIEW DIPERLUKAN — dikalibrasi menggunakan alat ukur yang kemudian OOT', status: 'WARNING', impactCount: 7
      },
      {
        id: 'v4', type: 'CERTIFICATE', label: '7 Sertifikat Kalibrasi Ventilator Terpengaruh',
        detail: '⛔ HOLD / Pending Review oleh Manajer Teknis — perlu penilaian ulang keabsahan', status: 'OOT'
      },
      {
        id: 'v5', type: 'ASSET', label: '7 Ventilator di 3 Rumah Sakit',
        detail: 'RS Siloam, RSUD Kariadi, RS Premier — Status laik pakai perlu konfirmasi ulang', status: 'WARNING'
      },
    ]
  },
  {
    id: 'xray',
    label: 'Rantai Ukes Radiologi — Mammografi',
    description: 'Traceable chain: Instrumen BAPETEN → IK Ukes Mamo → LK Ukes → Laporan BAPETEN',
    nodes: [
      {
        id: 'x1', type: 'CALIBRATOR', label: 'Gammex 1290 (Mammography QA Phantom)', certNo: 'BAPETEN-ACC/2026/04-007',
        detail: 'Phantom terakreditasi BAPETEN untuk Ukes Mammografi', status: 'OK', validUntil: 'Valid s.d. Apr 2027'
      },
      {
        id: 'x2', type: 'REGULATION', label: 'Perka BAPETEN No. 2 Tahun 2018 — Ukes Mammografi',
        detail: 'Parameter wajib: HVL, AEC, kVp, mAs, dosis kelenjar rata-rata', status: 'OK'
      },
      {
        id: 'x3', type: 'METHOD', label: 'IK Ukes Mammografi (IK-SPK-MAMO-01 Rev.1)',
        detail: 'Prosedur pengujian 12 parameter BAPETEN', status: 'OK'
      },
      {
        id: 'x4', type: 'WORKSHEET', label: 'LK Ukes Mamo — GE Senographe Essential (RS Siloam)',
        detail: 'Tanggal: 15-09-2026 | Penguji: Budi Santoso | 12 parameter diuji', status: 'OK'
      },
      {
        id: 'x5', type: 'CERTIFICATE', label: 'Laporan Ukes BAPETEN — RS Siloam Surabaya',
        detail: 'Nomor: SPK/UKES/2026/09-0023 | Hasil: 11 PASS, 1 NEEDS ADJUSTMENT', status: 'WARNING', validUntil: '2 tahun'
      },
    ]
  }
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function NodeCard({ node, index, total, isSelected, onClick }: {
  node: TraceNode; index: number; total: number;
  isSelected: boolean; onClick: () => void;
}) {
  const cfg = NODE_CONFIG[node.type];
  const stCfg = STATUS_CONFIG[node.status];
  const Icon = cfg.icon;
  const StIcon = stCfg.icon;

  return (
    <div className="relative flex items-start gap-3">
      {/* Connector line */}
      {index < total - 1 && (
        <div className="absolute left-[18px] top-[44px] w-0.5 h-[calc(100%+4px)] bg-gradient-to-b from-slate-700 to-transparent z-0" />
      )}

      {/* Node number circle */}
      <div className={`relative z-10 w-9 h-9 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
        node.status === 'OOT' ? 'border-rose-500 bg-rose-500/20' :
        node.status === 'WARNING' ? 'border-amber-500 bg-amber-500/20' :
        'border-slate-700 bg-slate-900'
      }`}>
        <Icon className={`w-4 h-4 ${cfg.color}`} />
      </div>

      {/* Node card */}
      <button
        onClick={onClick}
        className={`flex-1 text-left p-4 rounded-2xl border transition-all cursor-pointer mb-2 ${
          isSelected
            ? `${cfg.bgColor} shadow-lg`
            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{node.type}</div>
            <div className="text-sm font-bold text-white leading-tight">{node.label}</div>
            {node.certNo && <div className="text-xs text-cyan-400 font-mono mt-0.5">{node.certNo}</div>}
            <div className="text-xs text-slate-400 mt-1">{node.detail}</div>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${stCfg.color}`}>
              <StIcon className="w-3 h-3" /> {stCfg.label}
            </div>
            {node.impactCount && (
              <div className="text-[10px] text-rose-400 font-mono">⚠ {node.impactCount} terdampak</div>
            )}
          </div>
        </div>
        {node.validUntil && (
          <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {node.validUntil}
          </div>
        )}
      </button>
    </div>
  );
}

function ImpactAlert({ chain }: { chain: TraceChain }) {
  const hasIssues = chain.nodes.some(n => n.status === 'OOT' || n.status === 'WARNING');
  if (!hasIssues) return null;

  const ootNodes = chain.nodes.filter(n => n.status === 'OOT');
  const warnNodes = chain.nodes.filter(n => n.status === 'WARNING');

  return (
    <div className="p-4 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-2">
      <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-wider">
        <AlertOctagon className="w-4 h-4" /> Impact Analysis Alert — Tindakan Diperlukan
      </div>
      {ootNodes.map(n => (
        <div key={n.id} className="text-xs text-slate-300 flex items-start gap-2">
          <XCircle className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
          <span><strong className="text-rose-400">OOT:</strong> {n.label} — investigasi ulang seluruh hasil pengukuran terkait.</span>
        </div>
      ))}
      {warnNodes.map(n => (
        <div key={n.id} className="text-xs text-slate-300 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <span><strong className="text-amber-400">WARNING:</strong> {n.label} — perlu verifikasi dan review manajer teknis.</span>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function DigitalTraceabilityGraph() {
  const [activeChain, setActiveChain] = useState<string>('def');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const chain = TRACE_CHAINS.find(c => c.id === activeChain)!;

  const filteredNodes = searchQuery
    ? chain.nodes.filter(n =>
        n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.detail.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chain.nodes;

  const selectedNodeData = selectedNode ? chain.nodes.find(n => n.id === selectedNode) : null;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 text-slate-100">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <Tilt3D intensity={3}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950/60 to-slate-950 border border-indigo-500/20 p-8 md:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-indigo-400 text-xs font-black uppercase tracking-widest">
              <GitCommit className="w-4 h-4" /> Digital Traceability Graph & Impact Analysis Engine
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Graf Ketertelusuran Digital{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                &amp; Impact Analysis
              </span>
            </h1>
            <p className="text-slate-400 max-w-3xl text-sm leading-relaxed">
              Visualisasi rantai ketertelusuran 2-arah: dari Regulasi → Standar Ukur → Metode IK → Lembar Kerja → Sertifikat → Aset. Deteksi dampak otomatis apabila terjadi OOT atau kadaluarsa di salah satu node rantai.
            </p>
          </div>
        </div>
      </Tilt3D>

      {/* ─── STATS BAR ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Rantai', value: '3', color: 'indigo', icon: Link2 },
          { label: 'Node Terverifikasi', value: '16', color: 'emerald', icon: CheckCircle2 },
          { label: 'OOT Alert', value: '1', color: 'rose', icon: AlertOctagon },
          { label: 'Warning Node', value: '3', color: 'amber', icon: AlertTriangle },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className={`p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3`}>
            <Icon className={`w-5 h-5 text-${color}-400`} />
            <div>
              <div className={`text-xl font-black text-${color}-400 font-mono`}>{value}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── CHAIN SELECTOR ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex gap-3 flex-wrap">
          {TRACE_CHAINS.map(c => {
            const hasIssue = c.nodes.some(n => n.status === 'OOT' || n.status === 'WARNING');
            return (
              <button
                key={c.id}
                onClick={() => { setActiveChain(c.id); setSelectedNode(null); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  activeChain === c.id
                    ? 'bg-indigo-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {hasIssue && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                {c.label}
              </button>
            );
          })}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari node dalam rantai..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* ─── CHAIN DESCRIPTION ─────────────────────────────────────── */}
      <div className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-400 font-mono flex items-center gap-2">
        <Link2 className="w-4 h-4 text-indigo-400 shrink-0" />
        {chain.description}
      </div>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left: Node Flow */}
        <div className="lg:col-span-7 space-y-0">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> Rantai Ketertelusuran — {chain.label}
              </h2>
              <button className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <ImpactAlert chain={chain} />

            <div className="mt-4 space-y-0">
              {filteredNodes.map((node, idx) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  index={idx}
                  total={filteredNodes.length}
                  isSelected={selectedNode === node.id}
                  onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: Node Detail Panel */}
        <div className="lg:col-span-5 space-y-4">
          {selectedNodeData ? (
            <div className="p-6 rounded-3xl bg-slate-900 border border-indigo-500/30 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Eye className="w-5 h-5 text-indigo-400" /> Detail Node
                </h2>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-xs text-slate-500 hover:text-white transition-colors cursor-pointer"
                >
                  Tutup ✕
                </button>
              </div>

              {(() => {
                const cfg = NODE_CONFIG[selectedNodeData.type];
                const stCfg = STATUS_CONFIG[selectedNodeData.status];
                const Icon = cfg.icon;
                const StIcon = stCfg.icon;
                return (
                  <>
                    <div className={`p-4 rounded-2xl border ${cfg.bgColor} space-y-2`}>
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        <span className="text-xs font-black text-slate-400 uppercase tracking-wider">{selectedNodeData.type}</span>
                      </div>
                      <div className="text-base font-black text-white">{selectedNodeData.label}</div>
                      {selectedNodeData.certNo && (
                        <div className="text-xs text-cyan-400 font-mono">{selectedNodeData.certNo}</div>
                      )}
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <span className="text-slate-400 text-xs">Status</span>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${stCfg.color}`}>
                          <StIcon className="w-3.5 h-3.5" /> {stCfg.label}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                        <div className="text-xs text-slate-400 mb-1">Deskripsi Detail</div>
                        <div className="text-sm text-slate-200">{selectedNodeData.detail}</div>
                      </div>

                      {selectedNodeData.validUntil && (
                        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <span className="text-slate-400 text-xs flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Masa Berlaku</span>
                          <span className="text-xs font-mono text-slate-200">{selectedNodeData.validUntil}</span>
                        </div>
                      )}

                      {selectedNodeData.impactCount && (
                        <div className="p-3 bg-rose-500/5 rounded-xl border border-rose-500/30">
                          <div className="text-xs text-rose-400 font-black mb-1">⚠️ Dampak Potensial</div>
                          <div className="text-sm text-slate-300">
                            <strong className="text-rose-400">{selectedNodeData.impactCount}</strong> dokumen/aset downstream berpotensi terdampak jika node ini bermasalah (OOT / Expired).
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <div className="text-xs text-slate-500 uppercase tracking-wider font-bold">Tindakan Cepat</div>
                      {selectedNodeData.type === 'CALIBRATOR' && (
                        <button className="w-full py-2.5 text-xs font-black bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-xl hover:bg-cyan-500/20 transition-all cursor-pointer">
                          📋 Lihat Sertifikat Kalibrasi Standar Ukur
                        </button>
                      )}
                      {selectedNodeData.type === 'WORKSHEET' && (
                        <button className="w-full py-2.5 text-xs font-black bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl hover:bg-amber-500/20 transition-all cursor-pointer">
                          📝 Buka Lembar Kerja di Editor
                        </button>
                      )}
                      {selectedNodeData.type === 'CERTIFICATE' && (
                        <button className="w-full py-2.5 text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl hover:bg-emerald-500/20 transition-all cursor-pointer">
                          🏆 Buka Sertifikat &amp; QR Verifikasi
                        </button>
                      )}
                      {selectedNodeData.status !== 'OK' && (
                        <button className="w-full py-2.5 text-xs font-black bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer">
                          🚨 Buat CAPA / Laporan Insiden
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <GitCommit className="w-12 h-12 text-slate-600 mx-auto" />
              <div>
                <div className="text-slate-400 text-sm font-bold">Pilih Node untuk Inspeksi</div>
                <div className="text-slate-500 text-xs mt-1">Klik salah satu node di rantai ketertelusuran untuk melihat detail, masa berlaku, dan tindakan yang tersedia.</div>
              </div>

              {/* Chain Summary */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Ringkasan Rantai</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(
                    chain.nodes.reduce((acc, n) => {
                      acc[n.type] = (acc[n.type] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).map(([type, count]) => {
                    const cfg = NODE_CONFIG[type as NodeType];
                    const Icon = cfg.icon;
                    return (
                      <div key={type} className={`flex items-center gap-2 p-2 rounded-xl border ${cfg.bgColor}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className="text-xs text-slate-300">{type}</span>
                        <span className={`ml-auto text-xs font-black ${cfg.color}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="text-xs font-black text-slate-400 uppercase tracking-wider">Legenda Status Node</div>
            <div className="space-y-2">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <div key={status} className="flex items-center gap-2.5 text-xs">
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border ${cfg.color} shrink-0`}>
                      <Icon className="w-3 h-3" /> {status}
                    </div>
                    <span className="text-slate-400">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
