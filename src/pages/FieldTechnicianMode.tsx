import React, { useState, useEffect } from 'react';
import {
  QrCode, Play, Camera, CheckCircle2, Send, Wifi, WifiOff,
  Activity, Stethoscope, Zap, ChevronRight, Plus, Trash2,
  Battery, MapPin, Clock, FileText, ArrowLeft, RefreshCw,
  AlertTriangle, Database, Upload, Lock, Cpu, Calendar
} from 'lucide-react';
import { Tilt3D } from '../components/Tilt3D';

// ─── TYPES ────────────────────────────────────────────────────────────────────

type WizardStep = 'SCAN' | 'IDENTIFY' | 'PRECHECK' | 'MEASURE' | 'SUBMIT' | 'DONE';

interface ScannedAsset {
  id: string;
  name: string;
  type: string;
  location: string;
  ward: string;
  serial: string;
  lastCal: string;
  dueCal: string;
  facility: string;
  status: string;
}

interface Measurement {
  setting: number;
  unit: string;
  value: string;
}

// ─── MOCK ASSETS DB ───────────────────────────────────────────────────────────

const MOCK_ASSETS: Record<string, ScannedAsset> = {
  'EQ-DEF-2026-089': {
    id: 'EQ-DEF-2026-089', name: 'Defibrillator Zoll R Series',
    type: 'Defibrillator', location: 'IGD Bed 01', ward: 'IGD',
    serial: 'NK-884129', lastCal: '24 Agu 2025', dueCal: '24 Agu 2026',
    facility: 'RSUD Dr. Soetomo', status: 'DUE'
  },
  'EQ-VENT-2026-012': {
    id: 'EQ-VENT-2026-012', name: 'Hamilton C6 Ventilator',
    type: 'Ventilator', location: 'ICU Bed 3', ward: 'ICU',
    serial: 'HMC-778821', lastCal: '10 Mar 2025', dueCal: '10 Mar 2026',
    facility: 'RS Premier Surabaya', status: 'OVERDUE'
  },
  'EQ-INF-2026-034': {
    id: 'EQ-INF-2026-034', name: 'Infusion Pump Terumo TE-171',
    type: 'Infusion Pump', location: 'Rawat Inap Lt.3 Kamar 314',
    ward: 'Rawat Inap', serial: 'TRU-214518', lastCal: '01 Jun 2026',
    dueCal: '01 Jun 2027', facility: 'RS Siloam Surabaya', status: 'OK'
  },
};

const PRECHECK_ITEMS: { id: string; label: string; required: boolean }[] = [
  { id: 'p1', label: 'Alat kesehatan dalam keadaan menyala dan berfungsi', required: true },
  { id: 'p2', label: 'Label identifikasi aset sesuai dengan record sistem', required: true },
  { id: 'p3', label: 'Kabel dan aksesori lengkap tersedia', required: true },
  { id: 'p4', label: 'Standar ukur (kalibrator) telah hangat (warm-up) ≥ 30 menit', required: true },
  { id: 'p5', label: 'Kondisi lingkungan: suhu 20–26°C, kelembaban 40–70% RH', required: true },
  { id: 'p6', label: 'Tidak ada anomali visual (retak, hangus, bocor)', required: false },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: WizardStep }) {
  const steps: { key: WizardStep; label: string }[] = [
    { key: 'SCAN', label: 'Scan' },
    { key: 'IDENTIFY', label: 'Identifikasi' },
    { key: 'PRECHECK', label: 'Pre-Check' },
    { key: 'MEASURE', label: 'Ukur' },
    { key: 'SUBMIT', label: 'Kirim' },
  ];
  const currentIdx = steps.findIndex(s => s.key === current);

  return (
    <div className="flex items-center gap-1">
      {steps.map((s, i) => {
        const isDone = i < currentIdx;
        const isActive = i === currentIdx;
        return (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-1 ${isActive ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
              <div className={`w-6 h-6 rounded-full border text-[10px] font-black flex items-center justify-center ${
                isActive ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-400' :
                isDone ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400' :
                'bg-slate-800 border-slate-700 text-slate-600'
              }`}>
                {isDone ? '✓' : i + 1}
              </div>
              <span className="text-[9px] font-bold hidden sm:block">{s.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${i < currentIdx ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

export function FieldTechnicianMode() {
  const [isOnline, setIsOnline] = useState(true);
  const [step, setStep] = useState<WizardStep>('SCAN');
  const [scannedId, setScannedId] = useState('');
  const [scannedAsset, setScannedAsset] = useState<ScannedAsset | null>(null);
  const [preCheckState, setPreCheckState] = useState<Record<string, boolean>>({});
  const [measurements, setMeasurements] = useState<Measurement[]>([
    { setting: 50, unit: 'J', value: '' },
    { setting: 100, unit: 'J', value: '' },
    { setting: 150, unit: 'J', value: '' },
    { setting: 200, unit: 'J', value: '' },
    { setting: 360, unit: 'J', value: '' },
  ]);
  const [notes, setNotes] = useState('');
  const [submittedLkId, setSubmittedLkId] = useState('');
  const [scanInput, setScanInput] = useState('EQ-DEF-2026-089');

  const allPreChecksOk = PRECHECK_ITEMS.filter(p => p.required).every(p => preCheckState[p.id]);
  const measurementsComplete = measurements.every(m => m.value !== '');

  const handleSimulateScan = () => {
    const asset = MOCK_ASSETS[scanInput];
    if (asset) {
      setScannedAsset(asset);
      setStep('IDENTIFY');
    }
  };

  const handleSubmit = () => {
    const lkId = `LK-DEF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setSubmittedLkId(lkId);
    setStep('DONE');
  };

  const handleReset = () => {
    setStep('SCAN');
    setScannedAsset(null);
    setPreCheckState({});
    setMeasurements(measurements.map(m => ({ ...m, value: '' })));
    setNotes('');
    setSubmittedLkId('');
  };

  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4 text-slate-100 min-h-screen pb-20">

      {/* ─── MOBILE HEADER ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-slate-950/95 backdrop-blur-sm pb-4 pt-2 space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-900 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-black text-xs text-white uppercase tracking-wider">Field Mobile Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 font-mono">{currentTime}</div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-mono font-bold cursor-pointer transition-all ${
                isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}
            >
              {isOnline ? <><Wifi className="w-3 h-3" /> ONLINE</> : <><WifiOff className="w-3 h-3" /> OFFLINE</>}
            </button>
          </div>
        </div>

        {/* Step Indicator */}
        {step !== 'DONE' && <StepIndicator current={step} />}
      </div>

      {/* ─── STEP: SCAN ────────────────────────────────────────────── */}
      {step === 'SCAN' && (
        <div className="p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-24 h-24 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/20">
            <QrCode className="w-12 h-12 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Scan Label Alat Kesehatan</h2>
            <p className="text-xs text-slate-400 mt-1">Arahkan kamera ke QR Code atau Barcode sticker fisik pada alat kesehatan.</p>
          </div>

          {/* Manual ID Input (for simulation) */}
          <div className="space-y-2 text-left">
            <div className="text-xs text-slate-400 font-bold">Pilih Aset (Simulasi Scan):</div>
            <div className="flex flex-col gap-2">
              {Object.values(MOCK_ASSETS).map(a => (
                <button
                  key={a.id}
                  onClick={() => setScanInput(a.id)}
                  className={`text-left p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    scanInput === a.id ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-white">{a.name}</div>
                  <div className="text-slate-400 mt-0.5">{a.id} • {a.facility}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSimulateScan}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/20 cursor-pointer transition-all"
          >
            <Camera className="w-5 h-5" /> Pindai Barcode / QR Code
          </button>
        </div>
      )}

      {/* ─── STEP: IDENTIFY ────────────────────────────────────────── */}
      {step === 'IDENTIFY' && scannedAsset && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-mono font-bold text-cyan-400">{scannedAsset.id}</div>
                <h2 className="text-lg font-black text-white mt-1">{scannedAsset.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">SN: {scannedAsset.serial}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${
                scannedAsset.status === 'OK' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                scannedAsset.status === 'DUE' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {scannedAsset.status}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { label: 'Fasilitas', value: scannedAsset.facility, icon: MapPin },
                { label: 'Lokasi', value: `${scannedAsset.ward} — ${scannedAsset.location}`, icon: Cpu },
                { label: 'Kalibrasi Terakhir', value: scannedAsset.lastCal, icon: Clock },
                { label: 'Jadwal Berikutnya', value: scannedAsset.dueCal, icon: Calendar },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[10px] text-slate-400 flex items-center gap-1"><Icon className="w-3 h-3" /> {label}</div>
                  <div className="text-slate-200 font-bold mt-0.5">{value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep('PRECHECK')}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all"
            >
              <Play className="w-5 h-5 fill-slate-950" /> Mulai Pre-Check Pengujian
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: PRECHECK ────────────────────────────────────────── */}
      {step === 'PRECHECK' && (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="text-base font-black text-white">Pre-Check Sebelum Kalibrasi</h2>
          </div>

          <div className="space-y-2">
            {PRECHECK_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setPreCheckState(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  preCheckState[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    preCheckState[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                  }`}>
                    {preCheckState[item.id] && <CheckCircle2 className="w-3 h-3 text-slate-950" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{item.label}</div>
                    {!item.required && <div className="text-[10px] text-slate-500 mt-0.5">Opsional</div>}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className={`p-3 rounded-xl border text-xs font-bold ${allPreChecksOk ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-amber-500/5 border-amber-500/20 text-amber-400'}`}>
            {allPreChecksOk ? '✅ Semua item wajib pre-check telah diverifikasi' : '⚠️ Centang semua item wajib sebelum melanjutkan'}
          </div>

          <button
            onClick={() => setStep('MEASURE')}
            disabled={!allPreChecksOk}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Lanjut ke Pengukuran <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ─── STEP: MEASURE ─────────────────────────────────────────── */}
      {step === 'MEASURE' && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 shadow-2xl">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-black text-white">Input Pengukuran Lapangan</h2>
            </div>
            <p className="text-xs text-slate-400">Masukkan nilai terukur dari instrumen untuk setiap titik pengujian.</p>

            <div className="space-y-3">
              {measurements.map((m, i) => (
                <div key={i} className={`p-3.5 rounded-2xl border ${m.value ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-950 border-slate-800'} space-y-2`}>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-400">Setting {i + 1}: <span className="text-cyan-400">{m.setting} {m.unit}</span></span>
                    {m.value && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder={`Nilai terukur (${m.unit})...`}
                    value={m.value}
                    onChange={e => setMeasurements(prev => prev.map((mp, j) => j === i ? { ...mp, value: e.target.value } : mp))}
                    className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-white font-mono text-base font-bold focus:outline-none focus:border-cyan-500/50 placeholder-slate-600"
                  />
                  {m.value && (
                    <div className="text-[10px] font-mono text-slate-400">
                      Deviasi: <span className={`font-bold ${Math.abs(parseFloat(m.value) - m.setting) > m.setting * 0.05 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {((parseFloat(m.value) - m.setting) > 0 ? '+' : '') + (parseFloat(m.value) - m.setting).toFixed(2)} {m.unit}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-slate-400">Catatan Lapangan (opsional)</div>
              <textarea
                rows={3}
                placeholder="Temuan, kondisi alat, hambatan pengujian..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 resize-none"
              />
            </div>

            <div className={`p-3 rounded-xl border text-xs font-bold ${measurementsComplete ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'}`}>
              {measurementsComplete ? `✅ ${measurements.length} titik pengukuran selesai` : `${measurements.filter(m => m.value).length} / ${measurements.length} titik pengukuran diisi`}
            </div>

            <button
              onClick={() => setStep('SUBMIT')}
              disabled={!measurementsComplete}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Preview &amp; Kirim Data <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: SUBMIT ──────────────────────────────────────────── */}
      {step === 'SUBMIT' && (
        <div className="space-y-4">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl space-y-5 shadow-2xl">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-emerald-400" /> Review &amp; Konfirmasi Pengiriman
            </h2>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="text-slate-400 text-[10px]">Aset</div>
                <div className="font-bold text-white">{scannedAsset?.name} ({scannedAsset?.id})</div>
              </div>
              {measurements.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-400">Setting {m.setting} {m.unit}</span>
                  <span className="font-bold text-cyan-400">{m.value} {m.unit}</span>
                </div>
              ))}
              {notes && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-slate-400 text-[10px]">Catatan</div>
                  <div className="text-slate-200">{notes}</div>
                </div>
              )}
            </div>

            {!isOnline && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center gap-2">
                <WifiOff className="w-4 h-4 shrink-0" /> Mode Offline: Data akan disimpan lokal dan disinkronkan saat online kembali.
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl cursor-pointer transition-all"
            >
              <Upload className="w-5 h-5" /> {isOnline ? 'Kirim ke Server' : 'Simpan Offline'}
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP: DONE ────────────────────────────────────────────── */}
      {step === 'DONE' && (
        <div className="p-8 bg-slate-900 border border-emerald-500/40 rounded-3xl text-center space-y-6 shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 border-2 border-emerald-500/40 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">Pengujian Berhasil {isOnline ? 'Dikirim' : 'Disimpan Offline'}!</h2>
            <p className="text-xs text-slate-400">Lembar Kerja digital telah {isOnline ? 'tersimpan ke Firestore dan' : 'disimpan di memori lokal untuk'} dapat ditinjau oleh supervisor.</p>
          </div>

          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left space-y-2 font-mono text-xs">
            <div className="flex justify-between"><span className="text-slate-400">ID Lembar Kerja:</span><span className="text-cyan-400 font-bold">{submittedLkId}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Aset:</span><span className="text-white">{scannedAsset?.id}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Status:</span><span className="text-emerald-400 font-bold">{isOnline ? 'SUBMITTED' : 'PENDING SYNC'}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Timestamp:</span><span className="text-slate-300">{new Date().toLocaleString('id-ID')}</span></div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 py-3.5 bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 rounded-2xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
            >
              + Pindai Alat Berikutnya
            </button>
            <button
              onClick={() => {}}
              className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl text-xs font-black cursor-pointer transition-all"
            >
              <FileText className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
