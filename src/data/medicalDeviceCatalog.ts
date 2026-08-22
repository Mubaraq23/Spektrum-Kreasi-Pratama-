// Katalog Komprehensif Alat Kesehatan (Medical Device Catalog) Standard Indonesia & KAN

export interface MedicalDeviceCategory {
  id: string;
  name: string;
  nameEn: string;
  codeIK: string;
  category: 'Diagnostic' | 'Life Support' | 'Therapeutic' | 'Laboratory' | 'Radiology';
  standardRef: string;
  calibrationIntervalMonths: number;
  description: string;
  inspections: {
    physical: string[];
    functional: string[];
  };
  parameters: {
    name: string;
    unit: string;
    points: number[];
    tolerance: number;
  }[];
}

export const MEDICAL_DEVICES_CATALOG: MedicalDeviceCategory[] = [
  {
    id: 'patient-monitor',
    name: 'Patient Monitor (Bedside / Vital Sign)',
    nameEn: 'Patient Monitor',
    codeIK: 'IK-SKP-PM-01',
    category: 'Diagnostic',
    standardRef: 'EC13 / Permenkes 54/2015 / IEC 60601-2-27',
    calibrationIntervalMonths: 12,
    description: 'Pengawasan tanda vital mencakup NIBP, EKG, SpO2, Suhu, dan Respirasi.',
    inspections: {
      physical: ['Chassis & Casing', 'Kabel Power & Grounding', 'Kabel Pasien & Probe', 'Layar Display & Sentuh'],
      functional: ['Self-Test Booting', 'Fungsi Alarm Sistolik/Diastolik', 'Respon Beep HR', 'Kejelasan Audio']
    },
    parameters: [
      { name: 'Detak Jantung (HR / EKG)', unit: 'BPM', points: [30, 60, 120, 180, 240], tolerance: 2 },
      { name: 'Tekanan Darah NIBP Sistolik', unit: 'mmHg', points: [60, 120, 150, 200], tolerance: 3 },
      { name: 'Tekanan Darah NIBP Diastolik', unit: 'mmHg', points: [30, 80, 100, 150], tolerance: 3 },
      { name: 'Saturasi Oksigen (SpO2)', unit: '%', points: [70, 80, 90, 97, 100], tolerance: 2 },
      { name: 'Suhu Tubuh (Temp Probe)', unit: '°C', points: [35, 37, 40], tolerance: 0.2 }
    ]
  },
  {
    id: 'syringe-pump',
    name: 'Syringe Pump',
    nameEn: 'Syringe Pump',
    codeIK: 'IK-SKP-SP-01',
    category: 'Life Support',
    standardRef: 'IEC 60601-2-24 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Pompa injeksi presisi tinggi untuk pemberian obat kontinyu.',
    inspections: {
      physical: ['Kondisi Plunger Clamp', 'Pendorong Spuit Mechanism', 'Kabel Power & Adaptor', 'Sensor Oklusi'],
      functional: ['Self-Test', 'Alarm Syringe Empty', 'Alarm Occlusion Pressure', 'Fungsi Bolus']
    },
    parameters: [
      { name: 'Laju Alir (Flow Rate)', unit: 'mL/h', points: [1, 5, 10, 50, 100], tolerance: 2 },
      { name: 'Tekanan Oklusi (Occlusion)', unit: 'psi', points: [5, 10, 15], tolerance: 10 }
    ]
  },
  {
    id: 'infusion-pump',
    name: 'Infusion Pump',
    nameEn: 'Infusion Pump',
    codeIK: 'IK-SKP-IP-01',
    category: 'Life Support',
    standardRef: 'IEC 60601-2-24 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Pompa infus otomatis untuk cairan intravena skala volume besar.',
    inspections: {
      physical: ['Kondisi Pintu Peristaltik', 'Sensor Udara (Air-in-line)', 'Display & Keypad', 'Kabel Power'],
      functional: ['Self-Test', 'Alarm Air Bubble', 'Alarm Door Open', 'Kalkulasi VTBI']
    },
    parameters: [
      { name: 'Laju Alir Infus (Flow Rate)', unit: 'mL/h', points: [10, 50, 100, 500], tolerance: 5 },
      { name: 'Volume Infus Terkirim (Volume)', unit: 'mL', points: [50, 100, 250], tolerance: 5 }
    ]
  },
  {
    id: 'defibrillator',
    name: 'Defibrillator & AED',
    nameEn: 'Defibrillator',
    codeIK: 'IK-SKP-DEF-01',
    category: 'Life Support',
    standardRef: 'IEC 60601-2-4 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Alat terapi kejut jantung listrik untuk kasus cardiac arrest.',
    inspections: {
      physical: ['Paddle Dewasa & Anak', 'Kabel Paddle & Connector', 'Baterai Cadangan Internal', 'Kertas Printer EKG'],
      functional: ['Fungsi Charge & Discharge', 'Synchronized Mode', 'Fungsi Pacemaker (jika ada)', 'Internal Battery Test']
    },
    parameters: [
      { name: 'Energi Kejut (Discharge Energy)', unit: 'Joule', points: [10, 50, 100, 200, 360], tolerance: 5 },
      { name: 'Waktu Pengisian (Charging Time)', unit: 'Detik', points: [360], tolerance: 10 }
    ]
  },
  {
    id: 'electrocardiograph',
    name: 'Elektrokardiograf (EKG / ECG 12-Lead)',
    nameEn: 'Electrocardiograph',
    codeIK: 'IK-SKP-ECG-01',
    category: 'Diagnostic',
    standardRef: 'IEC 60601-2-25 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Perekam aktivitas kelistrikan otot jantung 12-lead.',
    inspections: {
      physical: ['Elektroda Dada (Suction Cup)', 'Elektroda Ekstremitas (Clamp)', 'Kabel Patient Cable', 'Thermal Printer'],
      functional: ['Kalibrasi 1 mV Button', 'Kecepatan Kertas (Paper Speed)', 'Filter Muscle & Hum', 'Lead Selector']
    },
    parameters: [
      { name: 'Sensitivitas Amplifikasi', unit: 'mm/mV', points: [5, 10, 20], tolerance: 5 },
      { name: 'Kecepatan Kertas (Speed)', unit: 'mm/s', points: [25, 50], tolerance: 5 },
      { name: 'Frekuensi Detak Jantung EKG', unit: 'BPM', points: [30, 60, 120, 180], tolerance: 2 }
    ]
  },
  {
    id: 'infant-incubator',
    name: 'Infant Incubator / Inkubator Bayi',
    nameEn: 'Baby Incubator',
    codeIK: 'IK-SKP-INC-01',
    category: 'Life Support',
    standardRef: 'IEC 60601-2-19 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Inkubator pengontrol suhu dan kelembaban udara untuk bayi prematur.',
    inspections: {
      physical: ['Dinding Akrilik & Pintu Akses', 'Kasur & Filter Udara', 'Sensor Probe Skin', 'Tangki Water Reservoir'],
      functional: ['Alarm High Temperature', 'Alarm Power Failure', 'Alarm Airflow Failure', 'Kontrol Kelembaban']
    },
    parameters: [
      { name: 'Suhu Suasana Air Temp', unit: '°C', points: [32, 36, 37], tolerance: 0.5 },
      { name: 'Suhu Kulit Bayi Skin Temp', unit: '°C', points: [36, 37], tolerance: 0.3 },
      { name: 'Kelembaban Relatif (Humidity)', unit: '%RH', points: [50, 70], tolerance: 10 },
      { name: 'Kebisingan Dalam Hood', unit: 'dBA', points: [60], tolerance: 60 }
    ]
  },
  {
    id: 'radiant-warmer',
    name: 'Infant Radiant Warmer / Baby Warmer',
    nameEn: 'Infant Warmer',
    codeIK: 'IK-SKP-RW-01',
    category: 'Therapeutic',
    standardRef: 'IEC 60601-2-21 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Penghangat pemancar radiasi inframerah overhead untuk neonatus.',
    inspections: {
      physical: ['Elemen Pemanas Overhead', 'Probe Sensor Kulit', 'Lampu Pemeriksaan', 'Mekanisme Tilting Bed'],
      functional: ['Servo Control Mode', 'Manual Heater Power 0-100%', 'Alarm Overheating', 'Timer APGAR']
    },
    parameters: [
      { name: 'Suhu Terpanas Matras', unit: '°C', points: [35, 37], tolerance: 0.5 },
      { name: 'Fluks Radiasi Inframerah', unit: 'mW/cm²', points: [10, 20], tolerance: 10 }
    ]
  },
  {
    id: 'anesthesia-machine',
    name: 'Mesin Anestesi (Anesthesia Workstation)',
    nameEn: 'Anesthesia Machine',
    codeIK: 'IK-SKP-ANS-01',
    category: 'Life Support',
    standardRef: 'ISO 80601-2-13 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Sistem penyalur gas anestesi dan pernapasan operasi.',
    inspections: {
      physical: ['Vaporizer Isoflurane/Sevoflurane', 'Canister Absorber CO2', 'Sirkut Pernapasan', 'Tabung Gas O2/N2O/Air'],
      functional: ['Leak Test Circuit', 'APL Valve Function', 'Fungsi O2 Flush', 'Hypoxic Guard System']
    },
    parameters: [
      { name: 'Konsentrasi O2 (FiO2)', unit: '%', points: [21, 50, 100], tolerance: 3 },
      { name: 'Tidal Volume Anestesi', unit: 'mL', points: [200, 500, 800], tolerance: 10 },
      { name: 'Tekanan PEEP / Pmax', unit: 'cmH2O', points: [5, 10, 20], tolerance: 2 }
    ]
  },
  {
    id: 'ventilator',
    name: 'Ventilator Paru-Paru (Respirator)',
    nameEn: 'Ventilator',
    codeIK: 'IK-SKP-VEN-01',
    category: 'Life Support',
    standardRef: 'ISO 80601-2-12 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Alat bantu napas mekanis invasif & non-invasif ICU.',
    inspections: {
      physical: ['Turbin / Kompresor Udara', 'Humidifier Chamber', 'HME Filter & Tubing', 'Expiratory Valve'],
      functional: ['Self-Test System', 'Alarm High Pressure', 'Alarm Disconnection', 'Battery Backup 60 Min']
    },
    parameters: [
      { name: 'Volume Tidal (Vte)', unit: 'mL', points: [100, 300, 500, 800], tolerance: 10 },
      { name: 'Frekuensi Napas (RR)', unit: 'BPM', points: [10, 20, 30, 40], tolerance: 2 },
      { name: 'Tekanan Inspirasi Ppeak', unit: 'cmH2O', points: [15, 25, 40], tolerance: 2 },
      { name: 'PEEP (Positive End Expiratory)', unit: 'cmH2O', points: [5, 10, 15], tolerance: 2 }
    ]
  },
  {
    id: 'electrosurgical-unit',
    name: 'Electrosurgical Unit (ESU / Cauter)',
    nameEn: 'Electrosurgical Unit',
    codeIK: 'IK-SKP-ESU-01',
    category: 'Therapeutic',
    standardRef: 'IEC 60601-2-2 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Alat bedah kelistrikan frekuensi tinggi untuk pemotongan dan koagulasi jaringan.',
    inspections: {
      physical: ['Bipolar / Monopolar Handpiece', 'Patient Return Electrode (Plate)', 'Footswitch Cut/Coag', 'Power Cable'],
      functional: ['REM (Return Electrode Monitoring)', 'Fungsi Cut Pure/Blend', 'Fungsi Coag Spray/Fulgurate', 'Alarm Disconnect Plate']
    },
    parameters: [
      { name: 'Daya Output Monopolar Cut', unit: 'Watt', points: [50, 100, 200, 300], tolerance: 10 },
      { name: 'Daya Output Monopolar Coag', unit: 'Watt', points: [30, 60, 120], tolerance: 10 },
      { name: 'Daya Output Bipolar', unit: 'Watt', points: [10, 30, 50, 70], tolerance: 10 },
      { name: 'Frekuensi Kerja ESU', unit: 'kHz', points: [400], tolerance: 10 }
    ]
  },
  {
    id: 'fetal-monitor',
    name: 'Fetal Monitor / CTG (Cardiotocography)',
    nameEn: 'Fetal Monitor',
    codeIK: 'IK-SKP-CTG-01',
    category: 'Diagnostic',
    standardRef: 'IEC 60601-2-37 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Pemantau denyut jantung janin (FHR) dan kontraksi rahim ibu (TOCO).',
    inspections: {
      physical: ['Transduser Ultrasound FHR', 'Transduser TOCO Pressure', 'Event Marker Button', 'Printer CTG Paper'],
      functional: ['Signal Loss Alarm', 'Auto Baseline Cal', 'Fungsi Dual FHR (Twin)']
    },
    parameters: [
      { name: 'Denyut Jantung Janin (FHR)', unit: 'BPM', points: [60, 120, 160, 200], tolerance: 2 },
      { name: 'Tekanan Kontraksi (TOCO)', unit: 'g / %', points: [0, 50, 100], tolerance: 5 }
    ]
  },
  {
    id: 'suction-pump',
    name: 'Suction Pump / Medical Vacuum',
    nameEn: 'Suction Pump',
    codeIK: 'IK-SKP-SUC-01',
    category: 'Therapeutic',
    standardRef: 'ISO 10079-1 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Pompa hisap pembersih cairan & dahak usus / medis.',
    inspections: {
      physical: ['Tabung Penampung Fluid Jar', 'Katup Overflow Valve', 'Selang Suction Silicon', 'Manometer Analog/Digital'],
      functional: ['Fungsi Pengatur Suction Regulator', 'Kekedapan Sistem Vakum', 'Filter Antibakteri']
    },
    parameters: [
      { name: 'Tekanan Vakum Maksimum', unit: 'mmHg', points: [0, -100, -300, -500, -700], tolerance: 5 },
      { name: 'Laju Alir Sedot (Flow Rate)', unit: 'L/min', points: [20, 30, 40], tolerance: 10 }
    ]
  },
  {
    id: 'sphygmomanometer',
    name: 'Tensimeter Digital & Raksa (Sphygmomanometer)',
    nameEn: 'Sphygmomanometer',
    codeIK: 'IK-SKP-TEN-01',
    category: 'Diagnostic',
    standardRef: 'OIML R 16-1 / OIML R 16-2 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Alat ukur tekanan darah manual & otomatis.',
    inspections: {
      physical: ['Manset Dewasa/Anak', 'Balon Pompa (Bulb) & Valve', 'Tabung Skala / Display Digital', 'Konektor Tubing'],
      functional: ['Kebocoran Sistem Udara', 'Kecepatan Deflasi Valve (2-3 mmHg/s)', 'Poin Nol Zero Adjust']
    },
    parameters: [
      { name: 'Akurasi Tekanan Naik (Upping)', unit: 'mmHg', points: [0, 50, 100, 150, 200, 250], tolerance: 3 },
      { name: 'Akurasi Tekanan Turun (Downing)', unit: 'mmHg', points: [250, 200, 150, 100, 50, 0], tolerance: 3 }
    ]
  },
  {
    id: 'centrifuge',
    name: 'Centrifuge Klinik & Micro-Centrifuge',
    nameEn: 'Centrifuge',
    codeIK: 'IK-SKP-CEN-01',
    category: 'Laboratory',
    standardRef: 'BS ISO 22718 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Pemutar sampel darah & cairan laboratorium kecepatan tinggi.',
    inspections: {
      physical: ['Rotor Buckets & Adaptor', 'Kunci Tutup Otomatis (Lid Lock)', 'Bantalan Karet Anti-Vibrasi', 'Timer Knob / Digital'],
      functional: ['Safety Interlock Lid Switch', 'Deteksi Unbalance Rotor', 'Pengereman Otomatis (Brake)']
    },
    parameters: [
      { name: 'Kecepatan Putar Rotor (Speed)', unit: 'RPM', points: [1000, 2000, 3500, 5000, 10000], tolerance: 2 },
      { name: 'Waktu Putar (Timer)', unit: 'Menit', points: [5, 10, 15], tolerance: 5 }
    ]
  },
  {
    id: 'autoclave',
    name: 'Autoclave Sterilisasi Uap (Steam Sterilizer)',
    nameEn: 'Autoclave',
    codeIK: 'IK-SKP-AUT-01',
    category: 'Laboratory',
    standardRef: 'EN 285 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Sterilisator uap bertekanan tinggi untuk instrumen medis.',
    inspections: {
      physical: ['Gasket Karet Pintu', 'Katup Pengaman Safety Valve', 'Pressure Gauge & Thermometer', 'Drainage Valve'],
      functional: ['Door Locking Safety System', 'Pengontrol Suhu Sterilisasi 121°C/134°C', 'Siklus Drying Auto']
    },
    parameters: [
      { name: 'Suhu Sterilisasi', unit: '°C', points: [121, 134], tolerance: 1 },
      { name: 'Tekanan Uap Chamber', unit: 'bar / kPa', points: [1.1, 2.1], tolerance: 5 },
      { name: 'Waktu Sterilisasi (Hold Time)', unit: 'Menit', points: [15, 30], tolerance: 5 }
    ]
  },
  {
    id: 'pulse-oximeter',
    name: 'Pulse Oximeter (Fingertip / Tabletop)',
    nameEn: 'Pulse Oximeter',
    codeIK: 'IK-SKP-POX-01',
    category: 'Diagnostic',
    standardRef: 'ISO 80601-2-61 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Pengukur saturasi oksigen darah & denyut nadi non-invasif.',
    inspections: {
      physical: ['Probe SpO2 Jepit / Sensor LED', 'Kabel Konektor Probe', 'Layar OLED / LED'],
      functional: ['Indikator Perfusi (Pleth Wave)', 'Alarm SpO2 Rendah < 90%']
    },
    parameters: [
      { name: 'Saturasi Oksigen SpO2', unit: '%', points: [70, 80, 90, 95, 99], tolerance: 2 },
      { name: 'Pulse Rate (Denyut Nadi)', unit: 'BPM', points: [30, 60, 120, 180], tolerance: 2 }
    ]
  },
  {
    id: 'nebulizer',
    name: 'Nebulizer (Compressor & Ultrasonic)',
    nameEn: 'Nebulizer',
    codeIK: 'IK-SKP-NEB-01',
    category: 'Therapeutic',
    standardRef: 'EN 13544-1 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Alat pengabut obat inhalasi saluran pernapasan.',
    inspections: {
      physical: ['Medicine Cup & Masker', 'Filter Udara Asupan', 'Selang Air Tubing', 'Kompresor Motor'],
      functional: ['Pembentukan Partikel Aerosol', 'Suara Motor Kompresor']
    },
    parameters: [
      { name: 'Tekanan Output Kompresor', unit: 'psi / bar', points: [10, 20, 30], tolerance: 10 },
      { name: 'Laju Alir Uap Obat (Aerosol Output)', unit: 'mL/min', points: [0.2, 0.5], tolerance: 15 }
    ]
  },
  {
    id: 'phototherapy',
    name: 'Phototherapy Unit (Lampu Bilirubin Neonatal)',
    nameEn: 'Phototherapy',
    codeIK: 'IK-SKP-PHO-01',
    category: 'Therapeutic',
    standardRef: 'IEC 60601-2-50 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Lampu biru terapi ikterus / hiperbilirubinemia pada bayi baru lahir.',
    inspections: {
      physical: ['Lampu LED / Fluorescent Biru (450-470 nm)', 'Kaca Pelindung Filter', 'Hour Meter Pemakaian Lampu', 'Stand Roda'],
      functional: ['Pengatur Intensitas Lampu High/Low', 'Timer Terapi Auto Shutdown']
    },
    parameters: [
      { name: 'Intensitas Radiansi Biru (Irradiance)', unit: 'µW/cm²/nm', points: [10, 20, 30, 40], tolerance: 10 }
    ]
  },
  {
    id: 'dental-unit',
    name: 'Dental Unit & Ultrasonic Scaler',
    nameEn: 'Dental Unit',
    codeIK: 'IK-SKP-DEN-01',
    category: 'Therapeutic',
    standardRef: 'ISO 7494 / Permenkes 54/2015',
    calibrationIntervalMonths: 12,
    description: 'Kursi dan peralatan perawatan kesehatan gigi & mulut.',
    inspections: {
      physical: ['Handpiece High/Low Speed', 'Light Cure LED Lamp', 'Foot Pedal Control', 'Water & Air Filter'],
      functional: ['Pengatur Air & Spray', 'Fungsi Scaler Getaran Ultra', 'Suction Saliva Ejector']
    },
    parameters: [
      { name: 'Kecepatan Handpiece High-Speed', unit: 'RPM', points: [100000, 300000], tolerance: 10 },
      { name: 'Intensitas Curing Light', unit: 'mW/cm²', points: [800, 1200], tolerance: 10 }
    ]
  },
  {
    id: 'xray-radiography',
    name: 'Pesawat Sinar-X Radiografi & Fluoroskopi',
    nameEn: 'X-Ray Machine',
    codeIK: 'IK-SKP-XRAY-01',
    category: 'Radiology',
    standardRef: 'IEC 60601-2-54 / Permenkes 24/2020 / BAPETEN',
    calibrationIntervalMonths: 12,
    description: 'Peralatan pencitraan radiologi diagnostik medis.',
    inspections: {
      physical: ['Tabung Sinar-X (X-Ray Tube)', 'Kolimator Cahaya', 'Meja Pemeriksaan & Bucky', 'Kabel Tegangan Tinggi HV'],
      functional: ['Lampu Kolimator & Grid', 'Exposure Switch Handswitch', 'Interlock Pintu Radiasi']
    },
    parameters: [
      { name: 'Akurasi Tegangan Tabung (kVp)', unit: 'kVp', points: [50, 70, 90, 120], tolerance: 5 },
      { name: 'Akurasi Waktu Penyinaran (Exposure Time)', unit: 'ms', points: [50, 100, 200, 500], tolerance: 5 },
      { name: 'Keluaran Dosis Radiasi (mGy/mAs)', unit: 'mGy', points: [10, 50, 100], tolerance: 10 }
    ]
  }
];
