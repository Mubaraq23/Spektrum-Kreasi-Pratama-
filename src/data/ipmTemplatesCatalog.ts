// Master Catalog Templat Inspeksi & Pemeliharaan Preventif (IPM) Alat Kesehatan

export interface IpmPerformanceParamDef {
  id: string;
  name: string;
  unit: string;
  defaultPoints: number[];
  numReadings: number;
  toleranceMin?: number;
  toleranceMax?: number;
  tolerancePercentage?: number;
  description: string;
}

export interface IpmTemplateDef {
  id: string;
  deviceName: string;
  category: 'Diagnostik' | 'Monitoring' | 'Terapi' | 'Bedah' | 'Laboratorium' | 'ICU' | 'Anestesi' | 'Respirasi' | 'Sterilisasi' | 'Dental' | 'Radiologi' | 'Emergency';
  riskLevel: 'High' | 'Medium' | 'Low';
  intervalMonths: number;
  description: string;
  physicalChecklist: string[];
  functionalChecklist: string[];
  electricalSafetyRequired: boolean;
  maintenanceActions: string[];
  performanceParameters: IpmPerformanceParamDef[];
}

export const IPM_TEMPLATES_CATALOG: IpmTemplateDef[] = [
  {
    id: 'patient-monitor',
    deviceName: 'Patient Monitor (Bedside / Vital Sign)',
    category: 'Monitoring',
    riskLevel: 'High',
    intervalMonths: 6,
    description: 'Pemeliharaan preventif pengawas tanda vital (NIBP, EKG, SpO2, Suhu, Respirasi).',
    physicalChecklist: [
      'Kondisi casing & permukaan monitor',
      'Kabel power, steker, & pembumian',
      'Display layar sentuh / LCD',
      'Kabel EKG & leadwires',
      'SpO2 sensor & probe',
      'Manset & selang NIBP',
      'Probe suhu (temperature probe)',
      'Baterai cadangan internal'
    ],
    functionalChecklist: [
      'Self-test booting & inisialisasi',
      'Tampilan bentuk gelombang EKG',
      'Fungsi alarm batas atas/bawah sistolik & diastolik',
      'Fungsi alarm SpO2 & pulse beep',
      'Pengisian & penahanan tekanan NIBP',
      'Fungsi switching daya PLN ke Baterai'
    ],
    electricalSafetyRequired: true,
    maintenanceActions: [
      'Pembersihan permukaan display & casing',
      'Pembersihan konektor probe & modul',
      'Inspeksi integritas kawat grounding',
      'Pengujian durasi baterai cadangan',
      'Pemeriksaan versi firmware/software'
    ],
    performanceParameters: [
      {
        id: 'hr-accuracy',
        name: 'Akurasi Detak Jantung (HR EKG)',
        unit: 'BPM',
        defaultPoints: [60, 120, 180],
        numReadings: 3,
        toleranceMin: -2,
        toleranceMax: 2,
        description: 'Toleransi deviasi detak jantung +- 2 BPM.'
      },
      {
        id: 'nibp-sys-accuracy',
        name: 'Akurasi NIBP Sistolik',
        unit: 'mmHg',
        defaultPoints: [120, 150],
        numReadings: 3,
        toleranceMin: -3,
        toleranceMax: 3,
        description: 'Toleransi deviasi NIBP sistolik +- 3 mmHg.'
      },
      {
        id: 'spo2-accuracy',
        name: 'Akurasi SpO2',
        unit: '%',
        defaultPoints: [90, 97, 100],
        numReadings: 3,
        toleranceMin: -2,
        toleranceMax: 2,
        description: 'Toleransi SpO2 +- 2%.'
      }
    ]
  },
  {
    id: 'infusion-pump',
    deviceName: 'Infusion Pump',
    category: 'Terapi',
    riskLevel: 'High',
    intervalMonths: 6,
    description: 'Pemeliharaan preventif pompa infus cairan IV otomatis.',
    physicalChecklist: [
      'Casing, pintu peristaltik, & engsel pintu',
      'Clamp tiang infus (pole clamp)',
      'Sensor udara (air-in-line detector)',
      'Kabel power & adaptor cas',
      'Layar display & keypad membran',
      'Sensor oklusi / penekan selang'
    ],
    functionalChecklist: [
      'Self-test booting',
      'Alarm pintu terbuka (Door Open)',
      'Alarm gelembung udara (Air Bubble)',
      'Alarm tekanan oklusi (Occlusion)',
      'Fungsi Bolus & KVO (Keep Vein Open)',
      'Indikator daya baterai'
    ],
    electricalSafetyRequired: true,
    maintenanceActions: [
      'Pembersihan mekanisme roda peristaltik',
      'Pembersihan optik sensor udara dengan alkohol',
      'Lubrikasi engsel pintu & pendorong',
      'Kalibrasi ulang sensor tetesan bila diperlukan',
      'Uji kapasitas baterai internal'
    ],
    performanceParameters: [
      {
        id: 'flow-rate-accuracy',
        name: 'Akurasi Laju Alir (Flow Rate)',
        unit: 'mL/h',
        defaultPoints: [10, 50, 100],
        numReadings: 3,
        tolerancePercentage: 5,
        description: 'Toleransi deviasi laju alir infus +- 5%.'
      },
      {
        id: 'occlusion-pressure',
        name: 'Tekanan Oklusi',
        unit: 'psi',
        defaultPoints: [10],
        numReadings: 3,
        toleranceMin: 5,
        toleranceMax: 15,
        description: 'Batas batas oklusi 5 - 15 psi.'
      }
    ]
  },
  {
    id: 'syringe-pump',
    deviceName: 'Syringe Pump',
    category: 'Terapi',
    riskLevel: 'High',
    intervalMonths: 6,
    description: 'Pemeliharaan preventif pompa injeksi obat kontinyu presisi tinggi.',
    physicalChecklist: [
      'Casing & klem pencengkeram spuit (plunger clamp)',
      'Mekanisme pendorong ulir (lead screw mechanism)',
      'Layar LCD & tombol pengaturan',
      'Kabel power & baterai internal'
    ],
    functionalChecklist: [
      'Self-test booting',
      'Alarm Syringe Dislodged / Syringe Empty',
      'Alarm Oklusi Tekanan Injeksi',
      'Fungsi Purge / Bolus cepat'
    ],
    electricalSafetyRequired: true,
    maintenanceActions: [
      'Pembersihan & pembersihan ulir pendorong',
      'Lubrikasi lead screw dengan pelumas medis',
      'Pemeriksaan klem deteksi ukuran spuit (10, 20, 50 mL)',
      'Uji ketahanan baterai'
    ],
    performanceParameters: [
      {
        id: 'flow-rate-accuracy',
        name: 'Akurasi Laju Alir Syringe',
        unit: 'mL/h',
        defaultPoints: [1, 5, 50],
        numReadings: 3,
        tolerancePercentage: 2,
        description: 'Toleransi deviasi laju alir presisi +- 2%.'
      }
    ]
  },
  {
    id: 'ventilator-icu',
    deviceName: 'Ventilator ICU / Resusitasi',
    category: 'Respirasi',
    riskLevel: 'High',
    intervalMonths: 6,
    description: 'Pemeliharaan preventif mesin bantuan pernapasan pasien ICU.',
    physicalChecklist: [
      'Chassis, trolley, & lengan penopang sirkuit (articulated arm)',
      'Filter bakteri masukan (HEPA filter)',
      'Selang Oksigen (O2) & Udara Tekan (Air)',
      'Katup ekspirasi & exhalation valve',
      'Humidifier / pemanas pelembab',
      'Baterai cadangan darurat (UPS)'
    ],
    functionalChecklist: [
      'Self-test sirkuit pernapasan (Leak & Compliance Test)',
      'Mode ventilasi VC-CMV, PC-CMV, SIMV, CPAP',
      'Alarm Apnea & Low Pressure / High Pressure',
      'Alarm Kegagalan Pasokan O2 / Gas',
      'Fungsi Suction O2 100%'
    ],
    electricalSafetyRequired: true,
    maintenanceActions: [
      'Penggantian HEPA Filter masukan gas & ekspirasi',
      'Pembersihan & sterilisasi exhalation valve',
      'Kalibrasi O2 cell sensor (21% - 100%)',
      'Pengujian kebocoran internal manifold gas',
      'Pengujian baterai cadangan'
    ],
    performanceParameters: [
      {
        id: 'tidal-volume-accuracy',
        name: 'Akurasi Volume Tidal (Vte)',
        unit: 'mL',
        defaultPoints: [300, 500],
        numReadings: 3,
        tolerancePercentage: 10,
        description: 'Toleransi volume tidal +- 10%.'
      },
      {
        id: 'peep-pressure',
        name: 'Akurasi PEEP Pressure',
        unit: 'cmH2O',
        defaultPoints: [5, 10],
        numReadings: 3,
        toleranceMin: -2,
        toleranceMax: 2,
        description: 'Toleransi PEEP +- 2 cmH2O.'
      }
    ]
  },
  {
    id: 'autoclave-sterilizer',
    deviceName: 'Autoclave / Sterilisator Uap',
    category: 'Sterilisasi',
    riskLevel: 'High',
    intervalMonths: 6,
    description: 'Pemeliharaan preventif bejana tekan sterilisasi uap bersuhu tinggi.',
    physicalChecklist: [
      'Kondisi bejana sterilisasi (chamber) & rak instrumen',
      'Pintu & paking karet pengunci (door gasket seal)',
      'Manometer pengukur tekanan uap & chamber',
      'Katup pengaman tekanan (safety valve)',
      'Elemen pemanas air (heating element)',
      'Tangki penampungan air kondensat'
    ],
    functionalChecklist: [
      'Penguncian pintu otomatis saat bertekanan',
      'Siklus sterilisasi (121°C / 134°C)',
      'Fungsi pengeringan (drying cycle)',
      'Alarm kegagalan suhu / suhu kurang',
      'Fungsi pelepasan katup pengaman manual'
    ],
    electricalSafetyRequired: true,
    maintenanceActions: [
      'Pembersihan endapan kerak pada elemen pemanas',
      'Pembersihan saringan pembuangan chamber',
      'Pengolesan pelumas silikon pada door gasket seal',
      'Uji mekanik katup pengaman tekanan (safety relief valve)',
      'Inspeksi keausan paking pintu'
    ],
    performanceParameters: [
      {
        id: 'steril-temp-accuracy',
        name: 'Akurasi Suhu Sterilisasi',
        unit: '°C',
        defaultPoints: [121, 134],
        numReadings: 3,
        toleranceMin: -1,
        toleranceMax: 3,
        description: 'Suhu terukur berada pada 121°C - 124°C atau 134°C - 137°C.'
      },
      {
        id: 'steril-pressure',
        name: 'Tekanan Uap Sterilisasi',
        unit: 'bar',
        defaultPoints: [1.2, 2.1],
        numReadings: 3,
        toleranceMin: 1.0,
        toleranceMax: 2.5,
        description: 'Tekanan uap chamber 1.1 - 2.3 bar.'
      }
    ]
  },
  {
    id: 'centrifuge-lab',
    deviceName: 'Centrifuge Laboratorium',
    category: 'Laboratorium',
    riskLevel: 'Medium',
    intervalMonths: 6,
    description: 'Pemeliharaan preventif pemutar sampel darah / cairan lab rotasi tinggi.',
    physicalChecklist: [
      'Casing, penutup (lid), & pengunci pintu',
      'Rotor, bucket, & selongsong tabung',
      'Bantalan karet penahan getaran (vibration damper)',
      'Display RPM & timer digital'
    ],
    functionalChecklist: [
      'Self-test & pemutaran rotor',
      'Lid lock interlock (pintu terunci saat berputar)',
      'Imbalance sensor (alarm getaran abnormal)',
      'Fungsi pengereman rotasi (brake system)'
    ],
    electricalSafetyRequired: true,
    maintenanceActions: [
      'Pembersihan rotor & chamber dari ceceran sampel',
      'Lubrikasi bantalan rotor',
      'Pemeriksaan kencang baut penambat motor',
      'Uji kelancaran putaran tanpa getaran'
    ],
    performanceParameters: [
      {
        id: 'rpm-accuracy',
        name: 'Akurasi Kecepatan Putar (RPM)',
        unit: 'RPM',
        defaultPoints: [1000, 3000, 4000],
        numReadings: 3,
        tolerancePercentage: 5,
        description: 'Toleransi putaran RPM +- 5%.'
      },
      {
        id: 'timer-accuracy',
        name: 'Akurasi Pengatur Waktu (Timer)',
        unit: 'detik',
        defaultPoints: [300, 600],
        numReadings: 3,
        tolerancePercentage: 5,
        description: 'Toleransi timer +- 5%.'
      }
    ]
  }
];

export function getIpmTemplate(templateId: string): IpmTemplateDef | undefined {
  return IPM_TEMPLATES_CATALOG.find(t => t.id === templateId) || IPM_TEMPLATES_CATALOG[0];
}
