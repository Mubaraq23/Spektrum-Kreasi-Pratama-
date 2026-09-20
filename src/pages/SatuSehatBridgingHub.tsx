import React, { useState } from 'react';
import { 
  Network, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  FileCode, 
  Layers, 
  Radio, 
  Activity, 
  Server, 
  ExternalLink
} from 'lucide-react';

import { Tilt3D } from '../components/Tilt3D';

interface FhirDevicePayload {
  resourceType: 'Device';
  id: string;
  identifier: Array<{ system: string; value: string }>;
  status: 'active' | 'inactive';
  manufacturer: string;
  modelNumber: string;
  serialNumber: string;
  deviceName: Array<{ name: string; type: 'user-friendly-name' | 'official-name' }>;
  note: Array<{ text: string }>;
  safety: Array<{ coding: Array<{ system: string; code: string; display: string }> }>;
}

export function SatuSehatBridgingHub() {
  const [selectedTab, setSelectedTab] = useState<'device' | 'observation' | 'sync'>('device');
  const [authStatus] = useState<'authenticated' | 'disconnected' | 'connecting'>('authenticated');


  const [selectedEquipment, setSelectedEquipment] = useState('EQ-DEF-2026-089');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<Array<{ timestamp: string; message: string; type: 'info' | 'success' | 'warn' }>>([
    { timestamp: '18:04:12', message: 'Koneksi OAuth2 Token SatuSehat Kemenkes Terverifikasi (Client ID: spk_lpak_prod_881)', type: 'success' },
    { timestamp: '18:04:15', message: 'Payload FHIR R4 Resource Device (Defibrillator Nihon Kohden TEC-5631) Siap Dikirim', type: 'info' },
    { timestamp: '18:04:18', message: 'Respons API 201 Created — FHIR ID: 99a1284b-77c1-4b10-a22f-d890e1f', type: 'success' }
  ]);

  const mockEquipments = [
    { id: 'EQ-DEF-2026-089', name: 'Defibrillator TEC-5631', category: 'Emergency Care', serial: 'NK-884129', fhirId: '99a1284b-77c1-4b10', status: 'SYNCHRONIZED', lastCalibrated: '2026-08-15' },
    { id: 'EQ-PAT-2026-112', name: 'Patient Monitor BeneVision N17', category: 'ICU / CCU', serial: 'MR-992144', fhirId: 'b8192a00-112c-4f99', status: 'SYNCHRONIZED', lastCalibrated: '2026-08-20' },
    { id: 'EQ-XRAY-2026-004', name: 'Fixed X-Ray Multix Impact', category: 'Radiology', serial: 'SM-774012', fhirId: 'PENDING_BRIDGING', status: 'PENDING', lastCalibrated: '2026-08-22' },
    { id: 'EQ-INC-2026-045', name: 'Infant Incubator Isolette 8000', category: 'Neonatal ICU', serial: 'DG-331092', fhirId: 'PENDING_BRIDGING', status: 'PENDING', lastCalibrated: '2026-08-24' }
  ];

  const fhirDeviceSample: FhirDevicePayload = {
    resourceType: 'Device',
    id: '99a1284b-77c1-4b10-a22f-d890e1f',
    identifier: [
      { system: 'https://satusehat.kemkes.go.id/id/device-id', value: 'EQ-DEF-2026-089' },
      { system: 'https://spektrumkalibrasi.co.id/id/lpak-serial', value: 'NK-884129' }
    ],
    status: 'active',
    manufacturer: 'Nihon Kohden Corporation',
    modelNumber: 'TEC-5631',
    serialNumber: 'NK-884129',
    deviceName: [
      { name: 'Defibrillator & Monitor Pasien', type: 'user-friendly-name' },
      { name: 'Defibrillator Electro-Mechanical System', type: 'official-name' }
    ],
    note: [
      { text: 'Lolos Kalibrasi KAN ISO/IEC 17025:2017 (Sertifikat No: SPK/CAL/2026/0812). Koreksi Energi: +0.2J (U95: 0.15J).' }
    ],
    safety: [
      {
        coding: [
          { system: 'http://terminology.hl7.org/CodeSystem/device-safety', code: 'mr-unsafe', display: 'MR Unsafe' }
        ]
      }
    ]
  };

  const fhirObservationSample = {
    resourceType: 'Observation',
    id: 'obs-cal-2026-0812',
    status: 'final',
    category: [
      {
        coding: [
          { system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'procedure', display: 'Procedure' }
        ]
      }
    ],
    code: {
      coding: [
        { system: 'http://loinc.org', code: '8684-2', display: 'Calibration and measurement report' }
      ],
      text: 'Hasil Pengujian & Kalibrasi Metrologi Medis'
    },
    subject: { reference: 'Device/99a1284b-77c1-4b10-a22f-d890e1f' },
    effectiveDateTime: '2026-08-24T10:30:00+07:00',
    performer: [
      { display: 'LPAK Spektrum Kreasi Pratama (KAN LK-291-IDN)' }
    ],
    valueCodeableConcept: {
      coding: [
        { system: 'https://satusehat.kemkes.go.id/id/calibration-status', code: 'PASS', display: 'LAIK PAKAI (PASSED)' }
      ]
    },
    component: [
      {
        code: { text: 'Energi Discharge Setting 200J' },
        valueQuantity: { value: 200.2, unit: 'Joule', system: 'http://unitsofmeasure.org', code: 'J' }
      },
      {
        code: { text: 'Ketidakpastian Diperluas (U95)' },
        valueQuantity: { value: 0.15, unit: 'Joule', system: 'http://unitsofmeasure.org', code: 'J' }
      }
    ]
  };

  const triggerSyncAll = () => {
    setIsSyncing(true);
    setSyncLogs(prev => [
      ...prev,
      { timestamp: new Date().toLocaleTimeString(), message: 'Memulai Sinkronisasi Massal Ke Portal Kemenkes SatuSehat...', type: 'info' }
    ]);

    setTimeout(() => {
      setSyncLogs(prev => [
        ...prev,
        { timestamp: new Date().toLocaleTimeString(), message: 'Kirim Resource Device EQ-XRAY-2026-004: Sukses (201 Created)', type: 'success' },
        { timestamp: new Date().toLocaleTimeString(), message: 'Kirim Resource Device EQ-INC-2026-045: Sukses (201 Created)', type: 'success' },
        { timestamp: new Date().toLocaleTimeString(), message: 'Sinkronisasi 100% Selesai. Seluruh Rekam Kalibrasi Aktif Terhubung Kemenkes FHIR Server.', type: 'success' }
      ]);
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-10 text-slate-100">
      {/* Header Banner */}
      <Tilt3D intensity={5}>
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-slate-800 p-8 md:p-10 shadow-2xl">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none p-6">
            <Network className="w-96 h-96 text-cyan-400" />
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-xs font-black uppercase tracking-widest">
                <Radio className="w-4 h-4 animate-pulse text-cyan-400" /> Kemenkes SatuSehat FHIR R4 Interoperability Hub
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                  authStatus === 'authenticated' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}>
                  <ShieldCheck className="w-4 h-4" /> OAuth2 Gateway: Active
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
                Hub Bridging <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">SatuSehat & SIMRS</span>
              </h1>
              <p className="mt-3 text-slate-400 max-w-3xl text-sm md:text-base leading-relaxed">
                Platform sinkronisasi sertifikat kalibrasi KAN ISO/IEC 17025, status kelaikan alat medis, dan riwayat uji kesesuaian radiologi BAPETEN secara real-time ke Kemenkes RI menggunakan standar HL7 FHIR R4 (`Device` & `Observation`).
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Server FHIR</div>
                <div className="text-xl font-black text-emerald-400 mt-1 flex items-center gap-2">
                  <Server className="w-5 h-5" /> Connected
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">FHIR Standard</div>
                <div className="text-xl font-black text-cyan-400 mt-1 flex items-center gap-2">
                  <FileCode className="w-5 h-5" /> HL7 FHIR R4
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Synced</div>
                <div className="text-xl font-black text-white mt-1">1,482 / 1,500</div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kepatuhan Permenkes</div>
                <div className="text-xl font-black text-amber-400 mt-1">100% Compliant</div>
              </div>
            </div>
          </div>
        </div>
      </Tilt3D>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Equipment Selection & Sync Action */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" /> Inventaris Alat Tersinkron
              </h2>
              <button 
                onClick={triggerSyncAll}
                disabled={isSyncing}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition-all"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sinkronkan Semua'}
              </button>
            </div>

            <div className="space-y-3">
              {mockEquipments.map((eq) => (
                <div
                  key={eq.id}
                  onClick={() => setSelectedEquipment(eq.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedEquipment === eq.id
                      ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{eq.id}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                      eq.status === 'SYNCHRONIZED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {eq.status}
                    </span>
                  </div>
                  <div className="font-bold text-white mt-1 text-sm">{eq.name}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
                    <span>SN: {eq.serial}</span>
                    <span>Sertifikat: {eq.lastCalibrated}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sync Logs Console */}
          <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Live Gateway Sync Logs
            </h3>
            <div className="font-mono text-xs space-y-2 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
              {syncLogs.map((log, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2">
                  <span className="text-slate-500 text-[10px] whitespace-nowrap mt-0.5">{log.timestamp}</span>
                  <span className={`text-[11px] ${
                    log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : 'text-cyan-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: FHIR Resource JSON Inspector */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedTab('device')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedTab === 'device' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  FHIR `Device` Resource
                </button>
                <button
                  onClick={() => setSelectedTab('observation')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    selectedTab === 'observation' ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-slate-800/60 text-slate-400 hover:text-white'
                  }`}
                >
                  FHIR `Observation` Calibration
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedTab === 'device' ? fhirDeviceSample : fhirObservationSample, null, 2));
                    alert('Payload FHIR JSON Berhasil Disalin ke Clipboard!');
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  Copy FHIR JSON
                </button>
                <a
                  href="https://satusehat.kemkes.go.id/platform/docs/id/interoperability/fhir/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-700"
                >
                  Dokumentasi FHIR <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* JSON Code Viewer */}
            <div className="relative rounded-2xl bg-slate-950 p-6 border border-slate-800 font-mono text-xs overflow-x-auto text-cyan-300 max-h-[500px]">
              <pre>{JSON.stringify(selectedTab === 'device' ? fhirDeviceSample : fhirObservationSample, null, 2)}</pre>
            </div>

            {/* Mapping Information */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" /> Pemetaan Kolom Spektrum ➔ Kemenkes SatuSehat
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 font-mono">system.equipmentId</div>
                  <div className="text-cyan-400 font-bold mt-1">Device.identifier[0].value</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 font-mono">uncertainty.u95</div>
                  <div className="text-emerald-400 font-bold mt-1">Observation.component[1].value</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-slate-500 font-mono">certificate.status</div>
                  <div className="text-amber-400 font-bold mt-1">Observation.valueCodeableConcept</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
