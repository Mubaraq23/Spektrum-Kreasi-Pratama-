// Master Regulasi BAPETEN & Parameter Uji Kesesuaian Pesawat Sinar-X / Radiologi

export interface BapetenParameterDef {
  id: string;
  name: string;
  category: 'Eksposi' | 'Kualitas Berkas' | 'Geometri' | 'AEC' | 'Dosis' | 'Citra';
  unit: string;
  testConditions: string;
  defaultPoints: number[];
  numReadings: number;
  toleranceType: 'percentage' | 'absolute' | 'range' | 'max_cv' | 'max_linearity';
  toleranceMin?: number;
  toleranceMax?: number;
  maxCV?: number;
  maxLinearity?: number;
  formula: string;
  regulationRef: string;
  description: string;
  isMandatory: boolean;
}

export interface BapetenModalityProfile {
  id: string;
  name: string;
  nameEn: string;
  codePrefix: string;
  description: string;
  physicalChecklist: string[];
  radiationSafetyChecklist: string[];
  parameters: BapetenParameterDef[];
}

export interface BapetenRegulationVersion {
  versionId: string;
  title: string;
  effectiveDate: string;
  authority: string;
  description: string;
  isCurrent: boolean;
  modalities: BapetenModalityProfile[];
}

export const BAPETEN_REGULATIONS: BapetenRegulationVersion[] = [
  {
    versionId: 'BAPETEN-2024-V1',
    title: 'Peraturan BAPETEN tentang Uji Kesesuaian Pesawat Sinar-X Radiologi Diagnostik & Intervensional',
    effectiveDate: '2024-01-01',
    authority: 'Badan Pengawas Tenaga Nuklir (BAPETEN) Republik Indonesia',
    description: 'Standar dan Kriteria Keberterimaan (Acceptance Criteria) Uji Kesesuaian Pesawat Sinar-X Indonesia.',
    isCurrent: true,
    modalities: [
      {
        id: 'general-xray',
        name: 'Radiografi Stasioner / General X-Ray',
        nameEn: 'Radiography / General X-Ray',
        codePrefix: 'UKES-RAD',
        description: 'Pesawat Sinar-X Radiografi Umum Konvensional atau Digital (CR/DR).',
        physicalChecklist: [
          'Kondisi fisik generator dan kontrol konsol',
          'Kondisi fisik tabung sinar-X dan wadah (housing)',
          'Sistem pergerakan meja pasien dan bucky stand',
          'Fungsi pengunci mekanis dan rem elektromagnetik',
          'Kabel tegangan tinggi dan grounding keselamatan',
          'Indikator eksposi (lampu & sinyal audio)',
          'Lampu kolimator dan penanda lapangan radiasi',
          'Filter tambahan (bila tersedia)',
          'Interlock pintu ruangan radiasi',
          'Lampu peringatan radiasi di luar pintu'
        ],
        radiationSafetyChecklist: [
          'Kebocoran wadah tabung sinar-X (Max 1 mGy/jam pada jarak 1 meter)',
          'Radiasi hambur pada posisi penguji / ruang kontrol',
          'Penahan radiasi (shielding) dinding, pintu, dan kaca timbal ruangan',
          'Tanda bahaya radiasi dan poster peringatan keselamatan'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'SID 100 cm, Fokal sedang, 100 mAs',
            defaultPoints: [50, 70, 90, 110],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
            regulationRef: 'BAPETEN Bab III Kriteria Akurasi kVp',
            description: 'Penyimpangan tegangan tabung terukur dari nilai yang diatur tidak boleh melebihi 10%.',
            isMandatory: true
          },
          {
            id: 'kvp-reproducibility',
            name: 'Reproduosibilitas Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: '%',
            testConditions: '5 kali eksposi berturut-turut pada 70 kVp',
            defaultPoints: [70],
            numReadings: 5,
            toleranceType: 'max_cv',
            maxCV: 5,
            formula: 'CV = (SD / Rata-rata) * 100%',
            regulationRef: 'BAPETEN Bab III Koefisien Variasi kVp',
            description: 'Koefisien variasi (CV) tegangan tabung tidak boleh lebih dari 5%.',
            isMandatory: true
          },
          {
            id: 'exposure-time-accuracy',
            name: 'Akurasi Waktu Eksposi (ms)',
            category: 'Eksposi',
            unit: 'ms',
            testConditions: 'SID 100 cm, 70 kVp',
            defaultPoints: [50, 100, 200, 500],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|t_ukur - t_set| / t_set * 100%',
            regulationRef: 'BAPETEN Bab III Waktu Eksposi',
            description: 'Deviasi waktu eksposi dari nilai terpilih tidak boleh lebih dari 10%.',
            isMandatory: true
          },
          {
            id: 'output-linearity',
            name: 'Linearitas Keluaran Radiasi (mGy/mAs)',
            category: 'Eksposi',
            unit: 'L',
            testConditions: 'Pengukuran dosis pada berbagai mA/mAs pada 70 kVp',
            defaultPoints: [10, 20, 50, 100],
            numReadings: 3,
            toleranceType: 'max_linearity',
            maxLinearity: 0.10,
            formula: 'L = |Y1 - Y2| / (Y1 + Y2)',
            regulationRef: 'BAPETEN Bab III Linearitas Keluaran',
            description: 'Koefisien linearitas keluaran radiasi L tidak boleh melebihi 0.10.',
            isMandatory: true
          },
          {
            id: 'hvl-beam-quality',
            name: 'Kualitas Berkas Radiasi (HVL)',
            category: 'Kualitas Berkas',
            unit: 'mm Al',
            testConditions: 'SID 100 cm pada 70 kVp',
            defaultPoints: [70],
            numReadings: 1,
            toleranceType: 'absolute',
            toleranceMin: 2.1,
            formula: 'Interpolasi Aluminium Half Value Layer',
            regulationRef: 'BAPETEN Tabel HVL Minimum',
            description: 'HVL minimum pada 70 kVp tidak boleh kurang dari 2.1 mm Al.',
            isMandatory: true
          },
          {
            id: 'collimator-alignment',
            name: 'Kesesuaian Lapangan Radiasi & Kolimasi',
            category: 'Geometri',
            unit: '% SID',
            testConditions: 'SID 100 cm, Lapangan 20x20 cm',
            defaultPoints: [100],
            numReadings: 1,
            toleranceType: 'percentage',
            toleranceMax: 2,
            formula: '|ΔX + ΔY| / SID * 100%',
            regulationRef: 'BAPETEN Keselarasan Berkas Cahaya & Radiasi',
            description: 'Ketidakselarasan berkas cahaya kolimator dan berkas radiasi <= 2% SID.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'mobile-xray',
        name: 'Radiografi Mobile / Portable X-Ray',
        nameEn: 'Mobile / Portable X-Ray',
        codePrefix: 'UKES-MOB',
        description: 'Pesawat sinar-X bergerak untuk bangsal, ICU, dan UGD.',
        physicalChecklist: [
          'Roda, rem, dan mekanika mobilitas pesawat',
          'Kondisi baterai & kabel pengisi daya (charger)',
          'Tombol eksposi jarak jauh (handswitch / kabel spiral)',
          'Kondisi wadah tabung dan mekanisme lengan artikulasi',
          'Indikator kolimator dan timer pengaman'
        ],
        radiationSafetyChecklist: [
          'Kebocoran tabung sinar-X (Max 1 mGy/jam pada 1m)',
          'Alat pelindung diri (Apron Timbal Pb >= 0.25 mm)',
          'Jarak aman penguji saat melakukan eksposi (>= 2 meter)'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'SID 100 cm, 70 kVp',
            defaultPoints: [60, 70, 80, 90],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
            regulationRef: 'BAPETEN Akurasi Mobile X-Ray',
            description: 'Deviasi kVp tidak boleh melebihi 10%.',
            isMandatory: true
          },
          {
            id: 'hvl-beam-quality',
            name: 'Kualitas Berkas Radiasi (HVL)',
            category: 'Kualitas Berkas',
            unit: 'mm Al',
            testConditions: 'SID 100 cm pada 70 kVp',
            defaultPoints: [70],
            numReadings: 1,
            toleranceType: 'absolute',
            toleranceMin: 2.1,
            formula: 'Interpolasi HVL mm Al',
            regulationRef: 'BAPETEN Minimal HVL Mobile X-Ray',
            description: 'HVL minimum pada 70 kVp >= 2.1 mm Al.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'dental-intraoral',
        name: 'Dental Intraoral X-Ray',
        nameEn: 'Dental Intraoral',
        codePrefix: 'UKES-DEN',
        description: 'Pesawat sinar-X gigi intraoral periapikal / bitewing.',
        physicalChecklist: [
          'Mekanisme lengan penopang (scissor arm) dan keseimbangan',
          'Position Indicating Device (PID) / Kerucut pembatas',
          'Tombol eksposi luar atau sakelar waktu',
          'Kondisi tabung gigi dan penanda fokal'
        ],
        radiationSafetyChecklist: [
          'Kebocoran tabung sinar-X gigi (Max 0.25 mGy/jam pada 1m)',
          'Jarak posisi penguji / operator saat penembakan (>= 2m)',
          'Penggunaan Apron Gigi untuk pasien'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'SSD sesuai panjang PID (20 cm)',
            defaultPoints: [60, 65, 70],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
            regulationRef: 'BAPETEN Uji Dental Intraoral',
            description: 'Deviasi tegangan tabung gigi <= 10%.',
            isMandatory: true
          },
          {
            id: 'exposure-reproducibility',
            name: 'Reproduosibilitas Dosis DPSA',
            category: 'Eksposi',
            unit: '%',
            testConditions: '5 kali eksposi berturut-turut',
            defaultPoints: [70],
            numReadings: 5,
            toleranceType: 'max_cv',
            maxCV: 5,
            formula: 'CV = (SD / Rata-rata) * 100%',
            regulationRef: 'BAPETEN Reproduosibilitas Dosis Gigi',
            description: 'Koefisien variasi keluaran dosis gigi <= 5%.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'dental-panoramic',
        name: 'Dental Panoramic & Cephalometric',
        nameEn: 'Dental Panoramic / Ceph',
        codePrefix: 'UKES-PAN',
        description: 'Pesawat sinar-X ekstraoral panoramik dan kefalometri.',
        physicalChecklist: [
          'Mekanisme rotasi gantry dan penopang dagu (chin rest)',
          'Laser alignment (sagital, frankfort, kaninus)',
          'Emergency stop switch',
          'Sistem detektor digital / kaset panoramik'
        ],
        radiationSafetyChecklist: [
          'Kebocoran tabung sinar-X',
          'Penahan radiasi ruangan dental',
          'Tombol sakelar darurat'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'Mode Panoramik Standar',
            defaultPoints: [70, 80],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
            regulationRef: 'BAPETEN Panoramik',
            description: 'Deviasi tegangan <= 10%.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'ct-scan',
        name: 'CT Scanner (Computed Tomography)',
        nameEn: 'CT Scan',
        codePrefix: 'UKES-CTS',
        description: 'Pesawat CT Scan Multi-Slice Diagnostik.',
        physicalChecklist: [
          'Kondisi gantry, indikator kemiringan (tilt), dan display',
          'Meja pasien (table movement & couch positioning)',
          'Sistem laser alignment internal & eksternal',
          'Interlock gantry dan tombol emergency stop',
          'Sistem komunikasi dua arah (interkom & CCTV)'
        ],
        radiationSafetyChecklist: [
          'Shielding kaca timbal dan dinding ruang kontrol CT',
          'Indikator bahaya radiasi gantry',
          'Kebocoran gantry & radiasi hambur ruang kontrol'
        ],
        parameters: [
          {
            id: 'ctdi-vol-accuracy',
            name: 'Akurasi CTDIvol / Akurasi Dosis CT',
            category: 'Dosis',
            unit: 'mGy',
            testConditions: 'Phantom CT Head / Body 120 kVp',
            defaultPoints: [120],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 20,
            formula: '|CTDI_ukur - CTDI_display| / CTDI_display * 100%',
            regulationRef: 'BAPETEN Standar Dosis CTDIvol',
            description: 'Deviasi dosis CTDIvol terukur vs display <= 20%.',
            isMandatory: true
          },
          {
            id: 'slice-thickness',
            name: 'Akurasi Ketebalan Irisan (Slice Thickness)',
            category: 'Geometri',
            unit: 'mm',
            testConditions: 'Phantom Uji Ketebalan 5 mm',
            defaultPoints: [5],
            numReadings: 3,
            toleranceType: 'absolute',
            toleranceMax: 1.0,
            formula: '|Thickness_ukur - Nominal|',
            regulationRef: 'BAPETEN Slice Thickness CT',
            description: 'Penyimpangan ketebalan irisan <= 1.0 mm.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'fluoroscopy-carm',
        name: 'Fluoroskopi / C-Arm',
        nameEn: 'Fluoroscopy / C-Arm',
        codePrefix: 'UKES-FLU',
        description: 'Pesawat Fluoroskopi Intervensional & C-Arm Bedah.',
        physicalChecklist: [
          'Mekanisme pergerakan C-Arm (Orbital, L-arm, Height)',
          'Sakelar kaki (footswitch) eksposi',
          'Image Intensifier / Flat Panel Detector',
          'Tampilan monitor dual-display',
          'Sistem pengatur waktu fluoroskopi 5 menit'
        ],
        radiationSafetyChecklist: [
          'Laju dosis maksimum fluoroskopi pada posisi pasien',
          'Tirai pelindung timbal (Pb drape) C-Arm',
          'Kebocoran tabung & radiasi hambur operator'
        ],
        parameters: [
          {
            id: 'fluoroscopy-dose-rate',
            name: 'Laju Dosis Maksimum Fluoroskopi (AKR)',
            category: 'Dosis',
            unit: 'mGy/min',
            testConditions: 'Mode Normal dengan Phantom PMMA 20 cm',
            defaultPoints: [80],
            numReadings: 3,
            toleranceType: 'absolute',
            toleranceMax: 50,
            formula: 'Air Kerma Rate (mGy/min)',
            regulationRef: 'BAPETEN Batas Laju Dosis Fluoroskopi',
            description: 'Laju air kerma maksimum tidak boleh melebihi 50 mGy/menit.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'mammography',
        name: 'Mamografi (Mammography)',
        nameEn: 'Mammography',
        codePrefix: 'UKES-MAM',
        description: 'Pesawat Sinar-X Pemeriksaan Payudara.',
        physicalChecklist: [
          'Plat kompresi (compression paddle) dan pengukur gaya',
          'Grid mamografi dan kisi-kisi radiasi',
          'Sistem pengereman dan pemutar gantry',
          'Pelindung wajah pasien (face shield)'
        ],
        radiationSafetyChecklist: [
          'Kebocoran tabung mamografi',
          'Perlindungan operator di belakang tabir Pb',
          'Interlock kompresi darurat'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung Mamografi (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'Target Mo/Rh pada 28 kVp',
            defaultPoints: [26, 28, 30],
            numReadings: 3,
            toleranceType: 'absolute',
            toleranceMax: 1.0,
            formula: '|kVp_ukur - kVp_set|',
            regulationRef: 'BAPETEN Akurasi Mamografi',
            description: 'Deviasi tegangan mamografi <= 1.0 kV.',
            isMandatory: true
          },
          {
            id: 'compression-force',
            name: 'Gaya Kompresi Maksimum',
            category: 'Geometri',
            unit: 'N',
            testConditions: 'Uji Motorized Compression',
            defaultPoints: [200],
            numReadings: 1,
            toleranceType: 'range',
            toleranceMin: 111,
            toleranceMax: 200,
            formula: 'Gaya Kompresi Terukur (Newton)',
            regulationRef: 'BAPETEN Gaya Kompresi Mamografi',
            description: 'Gaya kompresi harus berada dalam rentang 111 N hingga 200 N.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'cbct-dental',
        name: 'Cone Beam CT Dental (CBCT 3D)',
        nameEn: 'Dental CBCT 3D',
        codePrefix: 'UKES-CBC',
        description: 'Pesawat Sinar-X Dental 3D Cone Beam Computed Tomography.',
        physicalChecklist: [
          'Sistem rotasi gantry 360-derajat dan penopang kepala',
          'Laser alignment 3D (sagital, koronal, aksial)',
          'Flat panel detector 3D',
          'Emergency stop switch'
        ],
        radiationSafetyChecklist: [
          'Kebocoran wadah tabung (Max 0.25 mGy/jam pada 1m)',
          'Shielding ruangan CBCT',
          'Tanda peringatan radiasi'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'Mode 3D CBCT Standard 90 kVp',
            defaultPoints: [85, 90],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
            regulationRef: 'BAPETEN CBCT Dental',
            description: 'Deviasi tegangan tabung CBCT <= 10%.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'dexa-bone',
        name: 'Bone Densitometry (DEXA / DXA)',
        nameEn: 'Bone Densitometry (DEXA)',
        codePrefix: 'UKES-DEX',
        description: 'Pesawat Sinar-X Pengukur Kepadatan Tulang (DEXA).',
        physicalChecklist: [
          'Meja pasien dan pergerakan lengan pemindai (scanner arm)',
          'Laser pengarah lokasi pemindaian',
          'Phantom kalibrasi harian spine/femur',
          'Kabel data dan workstation'
        ],
        radiationSafetyChecklist: [
          'Dosis radiasi pasien sangat rendah',
          'Jarak operator dari meja scanner (>= 1m)'
        ],
        parameters: [
          {
            id: 'kvp-accuracy',
            name: 'Akurasi Tegangan Tabung (kVp)',
            category: 'Eksposi',
            unit: 'kV',
            testConditions: 'Mode Dual Energy (70/140 kVp)',
            defaultPoints: [70, 140],
            numReadings: 3,
            toleranceType: 'percentage',
            toleranceMax: 10,
            formula: '|kVp_ukur - kVp_set| / kVp_set * 100%',
            regulationRef: 'BAPETEN DEXA',
            description: 'Deviasi tegangan tabung DEXA <= 10%.',
            isMandatory: true
          }
        ]
      },
      {
        id: 'angiography-cathlab',
        name: 'Angiografi / Cath Lab Intervensional',
        nameEn: 'Angiography / Cath Lab',
        codePrefix: 'UKES-ANG',
        description: 'Pesawat Sinar-X Kardiologi & Vaskular Intervensional (Cath Lab).',
        physicalChecklist: [
          'Gantry C-arm / Biplane pergerakan fleksibel',
          'Sistem meja angiografi 4-arah & floating table',
          'Dual Flat Panel Detector & Monitor Array',
          'Sistem injektor kontras otomatis',
          'Footswitch eksposi & fluoroskopi'
        ],
        radiationSafetyChecklist: [
          'Tirai pelindung Pb meja & pelindung langit-langit (ceiling-suspended Pb shield)',
          'Laju dosis maksimum fluoroskopi high-level control (HLC)',
          'Shielding ruangan Cath Lab'
        ],
        parameters: [
          {
            id: 'high-level-dose-rate',
            name: 'Laju Air Kerma Maksimum HLC (High Level Control)',
            category: 'Dosis',
            unit: 'mGy/min',
            testConditions: 'Mode HLC dengan Phantom PMMA 20 cm',
            defaultPoints: [100],
            numReadings: 3,
            toleranceType: 'absolute',
            toleranceMax: 100,
            formula: 'Air Kerma Rate HLC (mGy/min)',
            regulationRef: 'BAPETEN Cath Lab Intervensional',
            description: 'Laju dosis maksimum mode HLC tidak boleh melebihi 100 mGy/menit.',
            isMandatory: true
          }
        ]
      }
    ]
  }
];

export function getCurrentBapetenRegulation(): BapetenRegulationVersion {
  return BAPETEN_REGULATIONS.find(r => r.isCurrent) || BAPETEN_REGULATIONS[0];
}

export function getModalityProfile(modalityId: string): BapetenModalityProfile | undefined {
  const currentReg = getCurrentBapetenRegulation();
  return currentReg.modalities.find(m => m.id === modalityId);
}
