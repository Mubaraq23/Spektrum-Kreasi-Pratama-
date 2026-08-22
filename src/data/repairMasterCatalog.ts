// Master Failure Codes, Diagnosis Categories & Repair Templates Catalog

export interface FailureCodeDef {
  code: string;
  category: 'Electrical' | 'Mechanical' | 'Sensor' | 'Software' | 'Battery' | 'Accessory' | 'Consumable' | 'Environmental' | 'Human Error' | 'Wear & Tear';
  name: string;
  description: string;
  commonCauses: string[];
  recommendedActions: string[];
}

export interface RepairTemplateDef {
  id: string;
  deviceName: string;
  category: string;
  initialChecklist: string[];
  postRepairTesting: string[];
  requiresElectricalSafety: boolean;
  requiresCalibrationCheck: boolean;
  requiresUkesCheck: boolean;
}

export const FAILURE_CODES_CATALOG: FailureCodeDef[] = [
  {
    code: 'ERR-ELE-001',
    category: 'Electrical',
    name: 'Kegagalan Catu Daya / Main Power Fuse Tripped',
    description: 'Sekring utama putus, lonjakan tegangan, atau kerusakan modul power supply.',
    commonCauses: ['Instabilitas tegangan PLN', 'Korsleting internal', 'Usia pakai kapasitor'],
    recommendedActions: ['Penggantian Sekring/Fuse', 'Perbaikan Modul Power Supply', 'Pengukuran Tegangan Regulated']
  },
  {
    code: 'ERR-BAT-002',
    category: 'Battery',
    name: 'Baterai Cadangan Rusak / Drop (Battery Exhausted)',
    description: 'Baterai internal tidak mampu menyimpan daya lebih dari 10 menit saat mati listrik.',
    commonCauses: ['Siklus isi ulang habis', 'Alat jarang di-charge', 'Sulfasi sel baterai'],
    recommendedActions: ['Penggantian Baterai Internal Original', 'Uji Durasi Suplai Baterai', 'Kalibrasi Indikator Baterai']
  },
  {
    code: 'ERR-SEN-003',
    category: 'Sensor',
    name: 'Sensor Malfungsi / Drift Pembacaan',
    description: 'Sensor SpO2, suhu, O2 cell, atau sensor tekanan memberikan nilai menyimpang.',
    commonCauses: ['Ceceran cairan medis', 'Kerusakan fisik optik', 'Sensitivitas menurun'],
    recommendedActions: ['Pembersihan Optik Sensor', 'Penggantian Sensor Module', 'Verifikasi & Kalibrasi Ulang']
  },
  {
    code: 'ERR-MEC-004',
    category: 'Mechanical',
    name: 'Kerusakan Mekanis / Pendorong Oklusi Macet',
    description: 'Mekanisme ulir pendorong infusion/syringe pump atau pengereman gantry macet.',
    commonCauses: ['Aus roda gigi mekanik', 'Penumpukan debu/pelumas mengering', 'Beban berlebih'],
    recommendedActions: ['Pembersihan & Pembersihan Roda Gigi', 'Pelumasan Khusus Medis', 'Penggantian Spare Part Gear']
  },
  {
    code: 'ERR-SOF-005',
    category: 'Software',
    name: 'Error Code Firmware / Freeze Display',
    description: 'Layar mengalami hang, error booting code, atau memori terganggu.',
    commonCauses: ['Kegagalan memori NVRAM', 'Interupsi daya saat booting', 'Bugs sistem'],
    recommendedActions: ['Factory Soft Reset', 'Flashing / Firmware Update', 'Penggantian Mainboard CPU']
  }
];

export const REPAIR_TEMPLATES_CATALOG: RepairTemplateDef[] = [
  {
    id: 'infusion-pump',
    deviceName: 'Infusion Pump / Syringe Pump',
    category: 'Terapi',
    initialChecklist: [
      'Inspeksi fisik casing & clamp tiang',
      'Pemeriksaan kabel power & steker',
      'Pemeriksaan sensor udara (air-in-line)',
      'Pemeriksaan mekanisme pendorong peristaltik'
    ],
    postRepairTesting: [
      'Uji laju alir (Flow rate verification)',
      'Uji alarm oklusi tekanan',
      'Uji alarm gelembung udara',
      'Uji baterai internal saat mati lampu'
    ],
    requiresElectricalSafety: true,
    requiresCalibrationCheck: true,
    requiresUkesCheck: false
  },
  {
    id: 'patient-monitor',
    deviceName: 'Patient Monitor (Bedside)',
    category: 'Monitoring',
    initialChecklist: [
      'Kondisi display layar sentuh',
      'Kondisi modul EKG, SpO2, NIBP',
      'Pemeriksaan kebocoran manset NIBP',
      'Pemeriksaan grounding casing'
    ],
    postRepairTesting: [
      'Uji akurasi EKG simulator',
      'Uji akurasi NIBP sistolik & diastolik',
      'Uji akurasi SpO2 & pulse beep',
      'Uji alarm batas atas/bawah'
    ],
    requiresElectricalSafety: true,
    requiresCalibrationCheck: true,
    requiresUkesCheck: false
  },
  {
    id: 'xray-unit',
    deviceName: 'Pesawat Sinar-X / Radiologi',
    category: 'Radiologi',
    initialChecklist: [
      'Pemeriksaan konsol generator & display kV/mA',
      'Pemeriksaan wadah tabung sinar-X & kolimator',
      'Pemeriksaan pengunci mekanis & kabel HV',
      'Pemeriksaan tombol eksposi & interlock'
    ],
    postRepairTesting: [
      'Uji fungsi penembakan sinar-X',
      'Uji lampu kolimator & keselarasan',
      'Pengujian akurasi kVp & waktu eksposi'
    ],
    requiresElectricalSafety: true,
    requiresCalibrationCheck: true,
    requiresUkesCheck: true
  }
];

export function getRepairTemplate(templateId: string): RepairTemplateDef | undefined {
  return REPAIR_TEMPLATES_CATALOG.find(t => t.id === templateId) || REPAIR_TEMPLATES_CATALOG[0];
}
