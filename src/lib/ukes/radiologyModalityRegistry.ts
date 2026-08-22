// Master Radiology Modality Registry — Universal UKES Engine
// Contains complete profile configurations for all BAPETEN-accredited radiology modalities
// Reference: Perba BAPETEN No. 1 Tahun 2025, Perba No. 2 Tahun 2022, Kepka No. 3051/2024

import { RadiologyModalityProfile, ModalityCategory, TestParameter } from './radiologyModalityTypes';

export const MASTER_RADIOLOGY_MODALITIES: RadiologyModalityProfile[] = [
  // ==========================================
  // A. RADIOGRAFI (STASIONER & MOBILE)
  // ==========================================
  {
    id: 'general-xray',
    code: 'UKES-RAD-GEN',
    name: 'General X-Ray (Radiografi Umum Stasioner)',
    nameEn: 'General Radiography (Fixed X-Ray)',
    category: 'RADIOGRAFI',
    description: 'Pesawat Sinar-X Radiografi Umum Konvensional atau Digital (CR/DR) Stasioner.',
    isConfigured: true,
    equipmentFields: [
      { id: 'generatorBrand', label: 'Merk Generator', type: 'text', required: true, group: 'generator' },
      { id: 'generatorModel', label: 'Model Generator', type: 'text', required: true, group: 'generator' },
      { id: 'generatorPower', label: 'Daya Generator (kW)', type: 'number', required: false, unit: 'kW', group: 'generator' },
      { id: 'tubeModel', label: 'Model Tabung Sinar-X', type: 'text', required: true, group: 'tube' },
      { id: 'tubeSN', label: 'Nomor Seri Tabung', type: 'text', required: true, group: 'tube' },
      { id: 'focalSpotSmall', label: 'Focal Spot Kecil (mm)', type: 'number', required: false, unit: 'mm', group: 'tube' },
      { id: 'focalSpotLarge', label: 'Focal Spot Besar (mm)', type: 'number', required: false, unit: 'mm', group: 'tube' },
      { id: 'detectorType', label: 'Tipe Detektor', type: 'select', options: ['Flat Panel DR', 'CR Plate', 'Film Screen'], required: true, group: 'detector' }
    ],
    physicalChecklist: [
      { id: 'p1', code: 'P-RAD-01', title: 'Kondisi Fisik Generator & Konsol Kontrol', description: 'Memastikan tidak ada kerusakan mekanis atau tombol rusak', category: 'Fisik', isMandatory: true },
      { id: 'p2', code: 'P-RAD-02', title: 'Kondisi Wadah Tabung (Housing)', description: 'Memastikan tidak ada kebocoran oli atau keretakan fisik', category: 'Fisik', isMandatory: true },
      { id: 'p3', code: 'P-RAD-03', title: 'Pergerakan Meja & Rem Elektromagnetik', description: 'Fungsi sistem pengunci posisi dan rem mekanik', category: 'Fisik', isMandatory: true },
      { id: 'p4', code: 'P-RAD-04', title: 'Lampu Kolimator & Penanda Lapangan Radiasi', description: 'Intensitas cahaya dan garis silang kolimator jelas', category: 'Fisik', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 's1', code: 'S-RAD-01', title: 'Kebocoran Wadah Tabung Sinar-X', description: 'Maksimum 1.0 mGy/jam pada jarak 1 meter', category: 'Keselamatan', isMandatory: true },
      { id: 's2', code: 'S-RAD-02', title: 'Interlock Pintu & Lampu Merah Radiasi', description: 'Sinyal bahaya radiasi otomatis menyala saat eksposi', category: 'Interlock', isMandatory: true }
    ],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-KVP-ACC',
        name: 'Akurasi Tegangan Tabung (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm, Fokal sedang',
        defaultSetPoints: [50, 70, 90, 110],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-KVP-10',
        requiredInstrumentType: 'Piranha / Dosimeter X-Ray Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Penyimpangan kVp terukur vs seting tidak boleh melebihi 10%.',
        isMandatory: true
      },
      {
        id: 'time-accuracy',
        code: 'PAR-TIME-ACC',
        name: 'Akurasi Waktu Penyinaran (ms)',
        category: 'Eksposi',
        unit: 'ms',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm, 70 kVp',
        defaultSetPoints: [50, 100, 200, 500],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|t_ukur - t_set| / t_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-TIME-10',
        requiredInstrumentType: 'Piranha / Timer Meter Digital',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi waktu penyinaran terukur vs seting <= 10%.',
        isMandatory: true
      },
      {
        id: 'linearity-output',
        code: 'PAR-RAD-LIN',
        name: 'Linearitas Keluaran Radiasi (CL)',
        category: 'Dosis',
        unit: 'Koefisien (CL)',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm pada 70 kVp berbagai setting mA/mAs',
        defaultSetPoints: [10, 20, 50, 100],
        numReadings: 3,
        toleranceType: 'absolute',
        toleranceMax: 0.10,
        formula: '|X1 - X2| / (X1 + X2) <= 0.10',
        acceptanceRuleId: 'RULE-BAPETEN-CL-010',
        requiredInstrumentType: 'Piranha / Ion Chamber Dosimeter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Koefisien linearitas keluaran radiasi (CL) harus <= 0.10.',
        isMandatory: true
      },
      {
        id: 'reproducibility-output',
        code: 'PAR-RAD-REP',
        name: 'Reprodusibilitas Penyinaran (CV)',
        category: 'Dosis',
        unit: 'Koefisien (CV)',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm, 70 kVp, 20 mAs (5x pengulangan)',
        defaultSetPoints: [70],
        numReadings: 5,
        toleranceType: 'max_cv',
        maxCV: 0.05,
        formula: 'SD / Mean <= 0.05',
        acceptanceRuleId: 'RULE-BAPETEN-CV-005',
        requiredInstrumentType: 'Piranha Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Koefisien variasi (CV) reprodusibilitas dosis radiasi <= 0.05 (5%).',
        isMandatory: true
      },
      {
        id: 'hvl-beam-quality',
        code: 'PAR-HVL',
        name: 'Kualitas Berkas Radiasi (HVL)',
        category: 'Kualitas Berkas',
        unit: 'mm Al',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm pada 70 kVp',
        defaultSetPoints: [70, 80, 90],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMin: 2.3,
        formula: 'Interpolasi Tebal Paruh HVL mm Al',
        acceptanceRuleId: 'RULE-BAPETEN-HVL-2.3',
        requiredInstrumentType: 'Piranha / Filter Al murni 99.9%',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'HVL minimum pada 70 kVp harus >= 2.3 mm Al.',
        isMandatory: true
      },
      {
        id: 'collimation-alignment',
        code: 'PAR-COL-ALIGN',
        name: 'Keselarasan Berkas Cahaya Kolimator & Radiasi',
        category: 'Geometri',
        unit: '% SID',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm dengan Collimator Alignment Tool',
        defaultSetPoints: [100],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMax: 2.0,
        formula: '(|ΔX| + |ΔY|) / SID * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-COL-2PCT',
        requiredInstrumentType: 'Alat Uji Kolimasi / RMI Collimator Test Tool',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Total penyimpangan berkas cahaya dan berkas radiasi (|ΔX| + |ΔY|) <= 2.0% SID.',
        isMandatory: true
      },
      {
        id: 'beam-perpendicularity',
        code: 'PAR-PERP-ALIGN',
        name: 'Ketegaklurusan Berkas Sinar-X (Perpendicularity)',
        category: 'Geometri',
        unit: 'derajat',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm dengan Beam Alignment Cylinder',
        defaultSetPoints: [100],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMax: 1.5,
        formula: 'Sudut deviasi ketegaklurusan tabung sinar-X',
        acceptanceRuleId: 'RULE-BAPETEN-PERP-1.5',
        requiredInstrumentType: 'Beam Alignment Cylinder Tool',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Penyimpangan ketegaklurusan berkas radiasi <= 1.5 derajat.',
        isMandatory: true
      }
    ],
    requiredDocuments: [
      { id: 'd1', title: 'Izin Operasi BAPETEN', description: 'Surat Izin Pemanfaatan Tenaga Nuklir aktif', mandatory: true }
    ],
    requiredEvidence: [
      { id: 'e1', title: 'Foto Plat Nama Generator & Tabung', description: 'Foto nameplate jelas memperlihatkan serial number', type: 'photo', mandatory: true },
      { id: 'e2', title: 'Foto Setup Alat Ukur & Detektor', description: 'Foto konfigurasi SID 100 cm dan Piranha', type: 'photo', mandatory: true },
      { id: 'e3', title: 'Citra Uji Kolimasi', description: 'Citra hasil uji keselarasan lapangan radiasi', type: 'photo', mandatory: true }
    ],
    requiredInstrumentTypes: [
      { typeId: 'multimeter', typeName: 'Multi-meter Radiologi Digital (Piranha / RaySafe)', description: 'Mengukur kVp, Waktu, Dosis, dan HVL serentak', mandatory: true }
    ],
    regulationReferences: [
      { regulationId: 'PERBA-1-2025', regulationTitle: 'Perba BAPETEN No. 1 Tahun 2025', clause: 'Pasal 4 & Lampiran I', effectiveDate: '2025-01-01' }
    ]
  },

  {
    id: 'mobile-xray',
    code: 'UKES-RAD-MOB',
    name: 'Mobile / Portable X-Ray Unit',
    nameEn: 'Mobile / Portable Radiography Unit',
    category: 'RADIOGRAFI',
    description: 'Pesawat Sinar-X bergerak untuk ruang ICU, IGD, dan bangsal perawatan.',
    isConfigured: true,
    equipmentFields: [
      { id: 'batteryCondition', label: 'Kondisi Baterai & Charger', type: 'select', options: ['Sangat Baik', 'Baik', 'Lemah'], required: true, group: 'special' },
      { id: 'handswitchCable', label: 'Panjang Kabel Sakelar Jarak Jauh (m)', type: 'number', required: true, unit: 'm', group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pm1', code: 'P-MOB-01', title: 'Roda, Rem, & Mekanisme Mobilitas', description: 'Kelancaran pengereman roda saat dipindahkan', category: 'Fisik', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 'sm1', code: 'S-MOB-01', title: 'Jarak Aman Operator saat Penembakan (>= 2m)', description: 'Panjang kabel sakelar jarak jauh', category: 'Keselamatan', isMandatory: true }
    ],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-KVP-ACC',
        name: 'Akurasi Tegangan Tabung (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm, 70 kVp',
        defaultSetPoints: [60, 70, 80, 90],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-KVP-10',
        requiredInstrumentType: 'Piranha Digital Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi kVp <= 10%.',
        isMandatory: true
      },
      {
        id: 'time-accuracy',
        code: 'PAR-TIME-ACC',
        name: 'Akurasi Waktu Penyinaran (ms)',
        category: 'Eksposi',
        unit: 'ms',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm, 70 kVp',
        defaultSetPoints: [50, 100, 200],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|t_ukur - t_set| / t_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-TIME-10',
        requiredInstrumentType: 'Piranha / Timer Meter Digital',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi waktu penyinaran <= 10%.',
        isMandatory: true
      },
      {
        id: 'reproducibility-output',
        code: 'PAR-RAD-REP',
        name: 'Reprodusibilitas Penyinaran (CV)',
        category: 'Dosis',
        unit: 'Koefisien (CV)',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm, 70 kVp (5x eksposi)',
        defaultSetPoints: [70],
        numReadings: 5,
        toleranceType: 'max_cv',
        maxCV: 0.05,
        formula: 'SD / Mean <= 0.05',
        acceptanceRuleId: 'RULE-BAPETEN-CV-005',
        requiredInstrumentType: 'Piranha Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Koefisien variasi (CV) reprodusibilitas <= 0.05.',
        isMandatory: true
      },
      {
        id: 'hvl-beam-quality',
        code: 'PAR-HVL',
        name: 'Kualitas Berkas Radiasi (HVL)',
        category: 'Kualitas Berkas',
        unit: 'mm Al',
        measurementType: 'numeric',
        testConditions: 'SID 100 cm pada 70 kVp',
        defaultSetPoints: [70],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMin: 2.3,
        formula: 'Interpolasi HVL mm Al',
        acceptanceRuleId: 'RULE-BAPETEN-HVL-2.3',
        requiredInstrumentType: 'Piranha Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran I',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'HVL minimum pada 70 kVp harus >= 2.3 mm Al.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  // ==========================================
  // B. DENTAL RADIOGRAPHY (INTRAORAL, PANORAMIC, CBCT)
  // ==========================================
  {
    id: 'dental-intraoral',
    code: 'UKES-DEN-INT',
    name: 'Dental Intraoral X-Ray (Periapical / Bitewing)',
    nameEn: 'Dental Intraoral Radiography',
    category: 'DENTAL_RADIOGRAPHY',
    description: 'Pesawat Sinar-X Gigi Intraoral Periapikal.',
    isConfigured: true,
    equipmentFields: [
      { id: 'pidType', label: 'Tipe PID (Position Indicating Device)', type: 'select', options: ['Silinder Terbuka', 'Kerucut (Conical)', 'Persegi (Rectangular)'], required: true, group: 'geometry' },
      { id: 'pidLength', label: 'Panjang PID (cm)', type: 'number', required: true, unit: 'cm', group: 'geometry' }
    ],
    physicalChecklist: [
      { id: 'pd1', code: 'P-DEN-01', title: 'Mekanisme Lengan Penopang (Scissor Arm)', description: 'Keseimbangan posisi lengan tanpa drift menggeser sendiri', category: 'Fisik', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 'sd1', code: 'S-DEN-01', title: 'Kebocoran Tabung Gigi (Max 0.25 mGy/jam)', description: 'Diukur pada jarak 1 meter', category: 'Keselamatan', isMandatory: true }
    ],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-DEN-KVP',
        name: 'Akurasi Tegangan Tabung Dental (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'SSD sesuai ujung PID (20 cm)',
        defaultSetPoints: [60, 65, 70],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-DEN-10',
        requiredInstrumentType: 'Dental Dosimeter / Piranha Dental',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi tegangan tabung gigi <= 10%.',
        isMandatory: true
      },
      {
        id: 'time-accuracy',
        code: 'PAR-DEN-TIME',
        name: 'Akurasi Waktu Penyinaran Dental (ms)',
        category: 'Eksposi',
        unit: 'ms',
        measurementType: 'numeric',
        testConditions: 'SSD 20 cm, 65 kVp',
        defaultSetPoints: [100, 200, 400],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|t_ukur - t_set| / t_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-DEN-TIME',
        requiredInstrumentType: 'Piranha Dental',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi waktu penyinaran dental <= 10%.',
        isMandatory: true
      },
      {
        id: 'reproducibility-output',
        code: 'PAR-DEN-REP',
        name: 'Reprodusibilitas Penyinaran Dental (CV)',
        category: 'Dosis',
        unit: 'Koefisien (CV)',
        measurementType: 'numeric',
        testConditions: 'Ujung PID 20 cm, 65 kVp, 0.2 s (5x eksposi)',
        defaultSetPoints: [65],
        numReadings: 5,
        toleranceType: 'max_cv',
        maxCV: 0.05,
        formula: 'SD / Mean <= 0.05',
        acceptanceRuleId: 'RULE-BAPETEN-CV-005',
        requiredInstrumentType: 'Piranha Dental',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Koefisien variasi (CV) reprodusibilitas <= 0.05.',
        isMandatory: true
      },
      {
        id: 'hvl-beam-quality',
        code: 'PAR-DEN-HVL',
        name: 'Kualitas Berkas Radiasi Dental (HVL)',
        category: 'Kualitas Berkas',
        unit: 'mm Al',
        measurementType: 'numeric',
        testConditions: '60 - 70 kVp',
        defaultSetPoints: [70],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMin: 1.5,
        formula: 'Interpolasi HVL mm Al',
        acceptanceRuleId: 'RULE-BAPETEN-DEN-HVL',
        requiredInstrumentType: 'Piranha Dental Filter Al',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'HVL dental pada 70 kVp harus >= 1.5 mm Al.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  {
    id: 'dental-panoramic',
    code: 'UKES-DEN-PAN',
    name: 'Dental Panoramic & Cephalometric',
    nameEn: 'Panoramic & Cephalometric Dental X-Ray',
    category: 'DENTAL_RADIOGRAPHY',
    description: 'Pesawat Sinar-X Gigi Ekstraoral Panoramik dan Kefalometri.',
    isConfigured: true,
    equipmentFields: [
      { id: 'laserAlignment', label: 'Sistem Laser Alignment (Sagital/Frankfort)', type: 'boolean', required: true, group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pp1', code: 'P-PAN-01', title: 'Mekanisme Rotasi Gantry & Chin Rest', description: 'Rotasi lancar tanpa hentakan getaran mekanis', category: 'Fungsi', isMandatory: true }
    ],
    radiationSafetyChecklist: [],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-PAN-KVP',
        name: 'Akurasi Tegangan Tabung Panoramik (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'Sensor diletakkan di slit kolimator sekunder',
        defaultSetPoints: [65, 75, 85],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-PAN-10',
        requiredInstrumentType: 'Piranha Panoramic Holder',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi kVp panoramik <= 10%.',
        isMandatory: true
      },
      {
        id: 'reproducibility-output',
        code: 'PAR-PAN-REP',
        name: 'Reprodusibilitas Dosis Panoramik (CV)',
        category: 'Dosis',
        unit: 'Koefisien (CV)',
        measurementType: 'numeric',
        testConditions: '75 kVp mode standar',
        defaultSetPoints: [75],
        numReadings: 5,
        toleranceType: 'max_cv',
        maxCV: 0.05,
        formula: 'SD / Mean <= 0.05',
        acceptanceRuleId: 'RULE-BAPETEN-CV-005',
        requiredInstrumentType: 'Piranha Panoramic Holder',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Koefisien variasi (CV) reprodusibilitas <= 0.05.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  {
    id: 'cbct-dental',
    code: 'UKES-DEN-CBC',
    name: 'Dental CBCT 3D (Cone Beam Computed Tomography)',
    nameEn: '3D Dental Cone Beam CT',
    category: 'DENTAL_RADIOGRAPHY',
    description: 'Pesawat Sinar-X Dental 3D Cone Beam CT Diagnostik.',
    isConfigured: true,
    equipmentFields: [
      { id: 'fovSize', label: 'Ukuran FOV Maksimum (cm x cm)', type: 'text', required: true, group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pcbct1', code: 'P-CBC-01', title: 'Kalibrasi Laser Posisi Kepala Pasien', description: 'Garis laser tepat pada bidang oklusal & midsagital', category: 'Fungsi', isMandatory: true }
    ],
    radiationSafetyChecklist: [],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-CBC-KVP',
        name: 'Akurasi Tegangan Tabung CBCT (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'Mode 3D CBCT Rotasi Penuh',
        defaultSetPoints: [80, 90, 100],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-CBC-10',
        requiredInstrumentType: 'Piranha CBCT Holder',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi kVp CBCT <= 10%.',
        isMandatory: true
      },
      {
        id: 'cbct-image-uniformity',
        code: 'PAR-CBC-UNI',
        name: 'Keseragaman Citra & Derau CBCT 3D',
        category: 'Citra',
        unit: 'HU / %',
        measurementType: 'numeric',
        testConditions: 'Phantom Silinder PMMA Homogen',
        defaultSetPoints: [90],
        numReadings: 3,
        toleranceType: 'absolute',
        toleranceMax: 10,
        formula: 'Deviasi HU pusat vs periferal phantom CBCT',
        acceptanceRuleId: 'RULE-BAPETEN-CBC-UNI',
        requiredInstrumentType: 'Phantom CBCT SEDENTEXCT / Quart DVT',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran II',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Keseragaman voxel CBCT harus <= 10 HU deviasi.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  // ==========================================
  // C. MAMMOGRAPHY
  // ==========================================
  {
    id: 'mammography',
    code: 'UKES-MAM-FFD',
    name: 'Mamografi (Full Field Digital Mammography / FFDM)',
    nameEn: 'Full Field Digital Mammography (FFDM)',
    category: 'MAMMOGRAPHY',
    description: 'Pesawat Sinar-X Khusus Pemeriksaan Payudara Resolusi Tinggi.',
    isConfigured: true,
    equipmentFields: [
      { id: 'targetFilter', label: 'Kombinasi Anoda / Filter', type: 'select', options: ['Mo/Mo', 'Mo/Rh', 'W/Rh', 'W/Ag'], required: true, group: 'tube' },
      { id: 'compressionPaddle', label: 'Tipe Plat Kompresi', type: 'select', options: ['Standard 18x24', 'Large 24x30', 'Spot Compression'], required: true, group: 'special' },
      { id: 'aecAvailable', label: 'Automatic Exposure Control (AEC)', type: 'boolean', required: true, group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pmam1', code: 'P-MAM-01', title: 'Plat Kompresi & Indikator Gaya', description: 'Permukaan plat tidak retak dan pembacaan gaya akurat', category: 'Fisik', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 'smam1', code: 'S-MAM-01', title: 'Pelindung Wajah Pasien (Face Shield)', description: 'Mencegah paparan radiasi langsung ke mata pasien', category: 'Keselamatan', isMandatory: true }
    ],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-MAM-KVP',
        name: 'Akurasi Tegangan Tabung Mamografi (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'SID 65 cm, Mo/Mo Target Filter',
        defaultSetPoints: [26, 28, 30, 32],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 5,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-MAM-KVP',
        requiredInstrumentType: 'Piranha Mammo Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran III',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Penyimpangan tegangan tabung mamografi tidak boleh lebih dari 5%.',
        isMandatory: true
      },
      {
        id: 'compression-force',
        code: 'PAR-MAM-COMP',
        name: 'Gaya Kompresi Otomatis (Newton)',
        category: 'Geometri',
        unit: 'N',
        measurementType: 'numeric',
        testConditions: 'Uji Motorized Compression dengan Busa PMMA',
        defaultSetPoints: [150],
        numReadings: 2,
        toleranceType: 'range',
        toleranceMin: 111,
        toleranceMax: 200,
        formula: 'Gaya_terukur (Newton)',
        acceptanceRuleId: 'RULE-BAPETEN-MAM-COMP',
        requiredInstrumentType: 'Mammography Compression Force Gauge',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran III',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Gaya kompresi otomatis harus dalam rentang 111 N s.d. 200 N.',
        isMandatory: true
      },
      {
        id: 'hvl-beam-quality',
        code: 'PAR-MAM-HVL',
        name: 'Kualitas Berkas Mamografi (HVL Mo/Rh)',
        category: 'Kualitas Berkas',
        unit: 'mm Al',
        measurementType: 'numeric',
        testConditions: '28 kVp, Mo/Mo target filter',
        defaultSetPoints: [28],
        numReadings: 1,
        toleranceType: 'range',
        toleranceMin: 0.30,
        toleranceMax: 0.45,
        formula: 'Interpolasi HVL mm Al',
        acceptanceRuleId: 'RULE-BAPETEN-MAM-HVL',
        requiredInstrumentType: 'Piranha Mammo Filter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran III',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'HVL mamografi pada 28 kVp harus berada dalam rentang 0.30 - 0.45 mm Al.',
        isMandatory: true
      },
      {
        id: 'mammography-image-quality',
        code: 'PAR-MAM-ACR',
        name: 'Kualitas Citra Phantom Mamografi (Skor ACR)',
        category: 'Citra',
        unit: 'Skor ACR',
        measurementType: 'numeric',
        testConditions: 'Phantom ACR Mammography 28 kVp mode AEC',
        defaultSetPoints: [4],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMin: 4.0,
        formula: 'Skor minimum: 4 fiber, 3 specks, 3 massa',
        acceptanceRuleId: 'RULE-BAPETEN-MAM-ACR',
        requiredInstrumentType: 'ACR Mammography Accreditation Phantom',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran III',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Skor minimum terdeteksi: 4 struktur fiber, 3 kelompok specks, 3 massa.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  // ==========================================
  // D. FLUOROSCOPY & C-ARM BEDAH
  // ==========================================
  {
    id: 'fluoroscopy-carm',
    code: 'UKES-FLU-CAR',
    name: 'Fluoroskopi / C-Arm Bedah',
    nameEn: 'C-Arm Surgical Fluoroscopy System',
    category: 'FLUOROSCOPY',
    description: 'Pesawat Sinar-X Fluoroskopi Intervensional & C-Arm Bedah Ruang Operasi.',
    isConfigured: true,
    equipmentFields: [
      { id: 'carmMovement', label: 'Pergerakan C-Arm', type: 'select', options: ['Motorized 3D', 'Manual High Precision'], required: true, group: 'special' },
      { id: 'imageReceptor', label: 'Tipe Penerima Citra', type: 'select', options: ['Flat Panel Detector (FPD)', 'Image Intensifier (II)'], required: true, group: 'detector' },
      { id: 'fluoroscopyMode', label: 'Mode Fluoroskopi', type: 'select', options: ['Pulsed Fluoroscopy', 'Continuous Fluoroscopy', 'High Dose Rate'], required: true, group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pflu1', code: 'P-FLU-01', title: 'Sakelar Kaki (Footswitch) & Timer 5 Menit', description: 'Footswitch bekerja responsif dan alarm 5 menit berfungsi', category: 'Fungsi', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 'sflu1', code: 'S-FLU-01', title: 'Tirai Pelindung Timbal (Pb Drape)', description: 'Kondisi Pb drape bebas dari keausan dan sobekan', category: 'Keselamatan', isMandatory: true }
    ],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-FLU-KVP',
        name: 'Akurasi Tegangan Tabung Fluoroskopi (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'Mode Fluoroskopi Manual / ABC',
        defaultSetPoints: [60, 70, 80, 90],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-KVP-10',
        requiredInstrumentType: 'Piranha Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran IV',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi kVp fluoroskopi <= 10%.',
        isMandatory: true
      },
      {
        id: 'fluoroscopy-dose-rate',
        code: 'PAR-FLU-AKR',
        name: 'Laju Dosis Maksimum Fluoroskopi Normal (AKR)',
        category: 'Dosis',
        unit: 'mGy/min',
        measurementType: 'numeric',
        testConditions: 'Mode Normal dengan Phantom PMMA 20 cm',
        defaultSetPoints: [80],
        numReadings: 3,
        toleranceType: 'absolute',
        toleranceMax: 50,
        formula: 'Air Kerma Rate (mGy/min)',
        acceptanceRuleId: 'RULE-BAPETEN-FLU-AKR',
        requiredInstrumentType: 'Dosimeter Fluoroskopi / Piranha Dose Rate',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran IV',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Laju air kerma maksimum mode normal <= 50 mGy/menit.',
        isMandatory: true
      },
      {
        id: 'spatial-resolution',
        code: 'PAR-FLU-RES',
        name: 'Resolusi Spasial Citra Fluoroskopi (lp/mm)',
        category: 'Citra',
        unit: 'lp/mm',
        measurementType: 'numeric',
        testConditions: 'Leeds Phantom TOR-18FG pada pusat II/FPD',
        defaultSetPoints: [70],
        numReadings: 1,
        toleranceType: 'absolute',
        toleranceMin: 1.2,
        formula: 'Resolusi garis terdeteksi (lp/mm)',
        acceptanceRuleId: 'RULE-BAPETEN-FLU-RES',
        requiredInstrumentType: 'Leeds Test Phantom TOR 18FG',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran IV',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Resolusi spasial fluoroskopi harus >= 1.2 lp/mm.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  // ==========================================
  // E. ANGIOGRAPHY / CATH LAB INTERVENSIONAL
  // ==========================================
  {
    id: 'angiography-cathlab',
    code: 'UKES-ANG-CAT',
    name: 'Angiografi / Cath Lab Intervensional',
    nameEn: 'Angiography & Interventional Cath Lab X-Ray',
    category: 'ANGIOGRAPHY_INTERVENTIONAL',
    description: 'Pesawat Sinar-X Kardiologi & Vaskular Intervensional (Cath Lab).',
    isConfigured: true,
    equipmentFields: [
      { id: 'gantryType', label: 'Konfigurasi Gantry', type: 'select', options: ['Single Plane C-Arm', 'Biplane C-Arm'], required: true, group: 'special' },
      { id: 'hlcAvailable', label: 'High-Level Control (HLC)', type: 'boolean', required: true, group: 'special' },
      { id: 'contrastInjector', label: 'Injektor Kontras Otomatis Interlock', type: 'boolean', required: false, group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pang1', code: 'P-ANG-01', title: 'Pelindung Langit-Langit (Ceiling-Suspended Pb Shield)', description: 'Kemudahan posisi pelindung Pb fleksibel', category: 'Fisik', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 'sang1', code: 'S-ANG-01', title: 'Laju Dosis HLC Mode Maksimum', description: 'Maksimum 100 mGy/menit', category: 'Keselamatan', isMandatory: true }
    ],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-ANG-KVP',
        name: 'Akurasi Tegangan Tabung Angiografi (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'Mode Angio Cine 15 fps',
        defaultSetPoints: [70, 80, 90],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-KVP-10',
        requiredInstrumentType: 'Piranha Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran IV',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi kVp <= 10%.',
        isMandatory: true
      },
      {
        id: 'high-level-dose-rate',
        code: 'PAR-ANG-HLC',
        name: 'Laju Air Kerma Maksimum HLC Mode',
        category: 'Dosis',
        unit: 'mGy/min',
        measurementType: 'numeric',
        testConditions: 'Mode HLC dengan Phantom PMMA 20 cm',
        defaultSetPoints: [100],
        numReadings: 3,
        toleranceType: 'absolute',
        toleranceMax: 100,
        formula: 'Air Kerma Rate HLC (mGy/min)',
        acceptanceRuleId: 'RULE-BAPETEN-ANG-HLC',
        requiredInstrumentType: 'Piranha High Dose Rate Meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran IV',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Laju air kerma HLC mode <= 100 mGy/menit.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  // ==========================================
  // F. COMPUTED TOMOGRAPHY (CT SCAN)
  // ==========================================
  {
    id: 'ct-scan',
    code: 'UKES-CT-MLS',
    name: 'CT Scanner (Computed Tomography Multi-Slice)',
    nameEn: 'Multi-Slice Diagnostic CT Scanner',
    category: 'COMPUTED_TOMOGRAPHY',
    description: 'Pesawat CT Scan Multi-Slice Diagnostik Seluruh Tubuh.',
    isConfigured: true,
    equipmentFields: [
      { id: 'sliceCount', label: 'Jumlah Irisan (Slice Count)', type: 'select', options: ['16 Slice', '32 Slice', '64 Slice', '128 Slice', '256+ Slice'], required: true, group: 'special' },
      { id: 'gantryTilt', label: 'Rentang Gantry Tilt (derajat)', type: 'text', required: true, group: 'special' },
      { id: 'couchLoadMax', label: 'Beban Maksimum Meja Pasien (kg)', type: 'number', required: true, unit: 'kg', group: 'special' }
    ],
    physicalChecklist: [
      { id: 'pct1', code: 'P-CT-01', title: 'Laser Alignment Internal & Eksternal', description: 'Presisi garis laser aksial, sagital, dan koronal', category: 'Fungsi', isMandatory: true }
    ],
    radiationSafetyChecklist: [
      { id: 'sct1', code: 'S-CT-01', title: 'Shielding Kaca Timbal Ruang Kontrol CT', description: 'Bebas dari kebocoran radiasi hambur', category: 'Keselamatan', isMandatory: true }
    ],
    parameters: [
      {
        id: 'ctdi-vol-accuracy',
        code: 'PAR-CT-CTDI',
        name: 'Akurasi CTDIvol / Akurasi Dosis CT (mGy)',
        category: 'Dosis',
        unit: 'mGy',
        measurementType: 'numeric',
        testConditions: 'Phantom CT Head 16 cm / Body 32 cm, 120 kVp',
        defaultSetPoints: [120],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 20,
        formula: '|CTDI_ukur - CTDI_display| / CTDI_display * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-CTDI-20',
        requiredInstrumentType: 'Phantom CTDI (16 cm Head / 32 cm Body) + Dosimeter Pensil CT',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran V',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi dosis CTDIvol terukur vs display konsol <= 20%.',
        isMandatory: true
      },
      {
        id: 'ct-number-water',
        code: 'PAR-CT-HU',
        name: 'CT Number Air (Hounsfield Unit Accuracy)',
        category: 'Citra',
        unit: 'HU',
        measurementType: 'numeric',
        testConditions: 'Phantom Air 120 kVp pada ROI Pusat',
        defaultSetPoints: [0],
        numReadings: 3,
        toleranceType: 'range',
        toleranceMin: -5,
        toleranceMax: 5,
        formula: 'Nilai Terukur HU Air',
        acceptanceRuleId: 'RULE-BAPETEN-CT-HU',
        requiredInstrumentType: 'Phantom Citra CT (Catphan / AAPM)',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran V',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'CT number air pada ROI pusat harus di rentang -5 HU s.d. +5 HU.',
        isMandatory: true
      },
      {
        id: 'ct-image-uniformity',
        code: 'PAR-CT-UNI',
        name: 'Keseragaman Citra CT (Image Uniformity & Noise)',
        category: 'Citra',
        unit: 'HU',
        measurementType: 'numeric',
        testConditions: 'Phantom Homogen Air / PMMA 120 kVp',
        defaultSetPoints: [0],
        numReadings: 3,
        toleranceType: 'absolute',
        toleranceMax: 5,
        formula: '|HU_pusat - HU_periferal| <= 5.0 HU',
        acceptanceRuleId: 'RULE-BAPETEN-CT-UNI',
        requiredInstrumentType: 'Catphan / AAPM CT Performance Phantom',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran V',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Perbedaan nilai CT number antara ROI pusat dan kuadran periferal <= 5.0 HU.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  },

  // ==========================================
  // G. SPECIAL PROCEDURES (DEXA)
  // ==========================================
  {
    id: 'dexa-bone',
    code: 'UKES-SPC-DEX',
    name: 'Bone Densitometry (DEXA / DXA)',
    nameEn: 'Dual-Energy X-Ray Absorptiometry (DEXA)',
    category: 'SPECIAL_PROCEDURES',
    description: 'Pesawat Sinar-X Pengukur Kepadatan Tulang Dual Energy.',
    isConfigured: true,
    equipmentFields: [
      { id: 'energyModes', label: 'Mode Energi', type: 'select', options: ['Dual Energy (70/140 kVp)', 'Single Energy'], required: true, group: 'special' }
    ],
    physicalChecklist: [],
    radiationSafetyChecklist: [],
    parameters: [
      {
        id: 'kvp-accuracy',
        code: 'PAR-DEX-KVP',
        name: 'Akurasi Tegangan Dual Energy (kVp)',
        category: 'Eksposi',
        unit: 'kV',
        measurementType: 'numeric',
        testConditions: 'Mode Dual Energy 70/140 kVp',
        defaultSetPoints: [70, 140],
        numReadings: 3,
        toleranceType: 'percentage',
        toleranceMax: 10,
        formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
        acceptanceRuleId: 'RULE-BAPETEN-KVP-10',
        requiredInstrumentType: 'Piranha Multi-meter',
        evidenceRequired: true,
        regulationReference: 'Perba BAPETEN 1/2025 Lampiran VI',
        regulationVersion: 'BAPETEN-2025-V1',
        description: 'Deviasi kVp <= 10%.',
        isMandatory: true
      }
    ],
    requiredDocuments: [],
    requiredEvidence: [],
    requiredInstrumentTypes: [],
    regulationReferences: []
  }
];

export function getAllModalities(): RadiologyModalityProfile[] {
  return MASTER_RADIOLOGY_MODALITIES;
}

export function getModalitiesByCategory(category: ModalityCategory): RadiologyModalityProfile[] {
  return MASTER_RADIOLOGY_MODALITIES.filter(m => m.category === category);
}

export function getModalityProfileById(id: string): RadiologyModalityProfile | undefined {
  return MASTER_RADIOLOGY_MODALITIES.find(m => m.id === id);
}

export function registerCustomModality(customProfile: RadiologyModalityProfile): void {
  const existingIdx = MASTER_RADIOLOGY_MODALITIES.findIndex(m => m.id === customProfile.id);
  if (existingIdx >= 0) {
    MASTER_RADIOLOGY_MODALITIES[existingIdx] = customProfile;
  } else {
    MASTER_RADIOLOGY_MODALITIES.push({ ...customProfile, isCustom: true });
  }
}

export function deleteModalityProfile(modalityId: string): boolean {
  const idx = MASTER_RADIOLOGY_MODALITIES.findIndex(m => m.id === modalityId);
  if (idx >= 0) {
    MASTER_RADIOLOGY_MODALITIES.splice(idx, 1);
    return true;
  }
  return false;
}

export function addParameterToModality(modalityId: string, param: TestParameter): boolean {
  const modality = getModalityProfileById(modalityId);
  if (modality) {
    const existingIdx = modality.parameters.findIndex(p => p.id === param.id);
    if (existingIdx >= 0) {
      modality.parameters[existingIdx] = param;
    } else {
      modality.parameters.push(param);
    }
    return true;
  }
  return false;
}

export function updateParameterInModality(modalityId: string, paramId: string, updatedParam: Partial<TestParameter>): boolean {
  const modality = getModalityProfileById(modalityId);
  if (modality) {
    const pIdx = modality.parameters.findIndex(p => p.id === paramId);
    if (pIdx >= 0) {
      modality.parameters[pIdx] = { ...modality.parameters[pIdx], ...updatedParam };
      return true;
    }
  }
  return false;
}

export function deleteParameterFromModality(modalityId: string, paramId: string): boolean {
  const modality = getModalityProfileById(modalityId);
  if (modality) {
    const pIdx = modality.parameters.findIndex(p => p.id === paramId);
    if (pIdx >= 0) {
      modality.parameters.splice(pIdx, 1);
      return true;
    }
  }
  return false;
}
