import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  Plus,
  Search,
  Filter,
  Zap,
  Save,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Activity,
  ShieldCheck,
  Stethoscope,
  FileText,
  CheckCircle2,
  AlertCircle,
  Camera,
  Trash2,
  Table as TableIcon,
  BrainCircuit,
  Loader2,
  CheckCircle,
  Eye,
  X,
  AlertTriangle,
  Info,
  Moon,
  Sun,
  Award,
  Sparkles,
  RotateCcw,
  Play,
  Download,
  QrCode
} from "lucide-react";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  deleteDoc,
  setDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { calculateInstrumentUncertainty } from "../lib/uncertaintyCalculations";
import {
  analyzeWorksheet,
  generateCertificateNarrative,
} from "../services/geminiService";
import { motion, AnimatePresence } from "motion/react";
import { logAction, pushNotification } from "../lib/auditLogger";
import { cn } from "../lib/utils";
import { useAuth } from "../lib/AuthContext";
import { handleFirestoreError, OperationType } from "../lib/firestoreUtils";
import { CertificatePreview } from "../components/CertificatePreview";
import { LKLabelModal } from "../components/LKLabelModal";

export function translateToIndonesian(text: string): string {
  if (!text) return "";
  let translated = text;

  const mapping: { [key: string]: string } = {
    "Infusion Pump": "Pompa Infus",
    "Syringe Pump": "Pompa Syringe",
    "Defibrillator": "Defibrilator",
    "Electrocardiograph": "Elektrokardiograf (EKG)",
    "Patient Monitor": "Monitor Pasien",
    "Baby Incubator": "Inkubator Bayi",
    "Fetal Monitor": "Monitor Janin (CTG)",
    "Anesthesia Machine": "Mesin Anestesi",
    "Ventilator": "Ventilator",
    "Pulse Oximeter": "Oksimeter Denyut",
    "Suction Pump": "Pompa Hisap",
    "Baby Warmer": "Penghangat Bayi",
    "Infant Warmer": "Penghangat Bayi",
    "Centrifuge": "Sentrifus",
    "Autoclave": "Autoklaf",
    "Thermometer": "Termometer",
    "Hygrometer": "Higrometer",
    "Sphygmomanometer": "Tensimeter",
    "Traction": "Alat Traksi",
    "Oxygen Concentrator": "Konsentrator Oksigen",
    "Electrosurgical Unit": "ESU (Electrosurgical Unit)",
    "Nebulizer": "Nebuliser",
    "Dental Unit": "Dental Unit",
    "Phototherapy": "Fototerapi",
    "X-Ray": "Sinar-X / Rontgen",
    "General Standard": "Standar Umum"
  };

  for (const [english, indonesian] of Object.entries(mapping)) {
    const regex = new RegExp(english, "gi");
    if (regex.test(translated)) {
      translated = translated.replace(regex, indonesian);
    }
  }

  translated = translated.replace(/Calibration\s+Method\s+for\s+/gi, "Metode Kerja Kalibrasi ");
  translated = translated.replace(/Calibration\s+Procedure\s+for\s+/gi, "Prosedur Kalibrasi ");
  translated = translated.replace(/Method\s+of\s+Calibration\s+for\s+/gi, "Metode Kerja Kalibrasi ");
  translated = translated.replace(/Method\s+for\s+/gi, "Metode Kerja ");

  return translated;
}

export function getDeviceNameFromMethodTitle(title: string): string {
  if (!title) return "";
  let clean = title;
  
  const prefixes = [
    /Calibration\s+Method\s+for\s+/gi,
    /Calibration\s+Procedure\s+for\s+/gi,
    /Method\s+of\s+Calibration\s+for\s+/gi,
    /Method\s+for\s+/gi,
    /Calibration\s+of\s+/gi,
    /Metode\s+Kerja\s+Kalibrasi\s+/gi,
    /Prosedur\s+Kalibrasi\s+/gi,
    /Metode\s+Kerja\s+/gi,
    /Metode\s+Kalibrasi\s+/gi,
    /Metodologi\s+Kalibrasi\s+/gi,
    /Metologi\s+Kalibrasi\s+/gi,
    /Metrologi\s+Kalibrasi\s+/gi,
    /Metrologi\s+/gi,
    /Metologi\s+/gi,
    /Pelayanan\s+Kalibrasi\s+/gi,
    /Instruksi\s+Kerja\s+Kalibrasi\s+/gi,
    /Instruksi\s+Kerja\s+/gi
  ];
  
  for (const regex of prefixes) {
    clean = clean.replace(regex, "");
  }
  
  clean = clean.trim();
  
  // Strip common suffixes or metadata if any
  clean = clean.replace(/\s*-\s*V\d+.*$/i, ""); // Remove version suffix if present e.g. " - V1"
  
  return translateToIndonesian(clean).trim();
}

const PHYSICAL_CHECKLIST = [
  "Badan & Permukaan",
  "Layar / Display",
  "Tombol / Kontrol",
  "Kabel & Konektor",
  "Aksesoris / Sensor",
  "Kebersihan Alat",
  "Catu Daya / Baterai",
];

const FORMULA_INFO_MAP: Record<
  string,
  {
    title: string;
    equation: string;
    components: {
      term: string;
      name: string;
      distribution: string;
      formula: string;
      desc: string;
    }[];
    notes: string;
  }
> = {
  suhu: {
    title: "Alat Ukur Suhu / Thermometer (KMK)",
    equation: "U95 = k * sqrt(u1² + u2² + u3² + u4² + u_stab² + u_unif²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Alat",
        distribution: "Semi-rekayasa / Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Menghitung keterbatasan pembacaan skala terkecil alat uji.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Standar Kalibrator",
        distribution: "Normal (k=2)",
        formula: "U_cert / 2",
        desc: "Ketidakpastian tersertifikasi dari kalibrator utama.",
      },
      {
        term: "u₃ (Repeatability)",
        name: "Ketidakpastian Daya Ulang Hasil",
        distribution: "Normal (S)",
        formula: "SD / √n",
        desc: "Nilai simpangan baku (SD) dari n kali pengukuran berulang.",
      },
      {
        term: "u₄ (Drift)",
        name: "Ketidakpastian Efek Drift Standar",
        distribution: "Rectangular",
        formula: "Drift / √3",
        desc: "Estimasi pergeseran performa standar kalibrator sejak kalibrasi terakhir.",
      },
      {
        term: "u_stab (Stability)",
        name: "Stabilitas Media Suhu / Bath",
        distribution: "Rectangular",
        formula: "Stabilitas / (2 * √3)",
        desc: "Kestabilan temperatur media uji (Liquid Bath / Dry Block) saat perekaman.",
      },
      {
        term: "u_unif (Uniformity)",
        name: "Keseragaman Spasial Temperatur",
        distribution: "Rectangular",
        formula: "Keseragaman / (2 * √3)",
        desc: "Perbedaan suhu antar titik spasial di dalam media temperatur.",
      },
    ],
    notes: "Faktor cakupan k = 2 memberikan tingkat kepercayaan sekitar 95%.",
  },
  kelembaban: {
    title: "Alat Ukur Kelembaban / Higrometer (KMK)",
    equation: "U95 = k * sqrt(u1² + u2² + u3² + u4² + u_stab² + u_unif²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Alat",
        distribution: "Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Menghitung keterbatasan resolusi pembacaan sensor kelembaban.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Kalibrator Kelembaban",
        distribution: "Normal (k=2)",
        formula: "U_cert / 2",
        desc: "Konstanta ketidakpastian yang diperoleh dari sertifikat alat standar kelembaban.",
      },
      {
        term: "u₃ (Repeatability)",
        name: "Ketidakpastian Pengukuran Berulang",
        distribution: "Normal (S)",
        formula: "SD / √n",
        desc: "Diperoleh dari standar deviasi (SD) pengukuran berulang kelembaban relatif.",
      },
      {
        term: "u₄ (Drift)",
        name: "Drift Sensor Standard",
        distribution: "Rectangular",
        formula: "Drift / √3",
        desc: "Faktor drift atau stabilitas jangka panjang dari induk kalibrator.",
      },
      {
        term: "u_stab (Stability)",
        name: "Stabilitas Ruang Uji",
        distribution: "Rectangular",
        formula: "Stabilitas / (2 * √3)",
        desc: "Fluktuasi kelembaban di dalam chamber pengujian selama selang waktu pengukuran.",
      },
      {
        term: "u_unif (Uniformity)",
        name: "Keseragaman Distribusi Chamber",
        distribution: "Rectangular",
        formula: "Uniformity / (2 * √3)",
        desc: "Gradien kelembaban relatif antar ruang di dalam chamber pengujian.",
      },
    ],
    notes:
      "Digunakan pada Thermo-hygrometer, Temperature Humidity Chamber, dsb.",
  },
  sterilisasi: {
    title: "Alat Sterilisator / Autoclave (KMK)",
    equation:
      "U95 = k * sqrt(u1² + u2² + u3² + u4² + u_stab² + u_unif² + (AutoclaveP * 0.02)²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Autoclave",
        distribution: "Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Ketidakpastian pembacaan indikator suhu oven/sterilisator.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Master Standard",
        distribution: "Normal (k=2)",
        formula: "U_cert / 2",
        desc: "Ketidakpastian kalibrator bersertifikat uji suhu sterilisasi.",
      },
      {
        term: "u₃ (Repeatability)",
        name: "Repeatabilitas Pembacaan Suhu",
        distribution: "Normal (S)",
        formula: "SD / √n",
        desc: "Baku simpangan fluktuasi suhu di titik sensor selama proses sterilisasi.",
      },
      {
        term: "u₄ (Drift)",
        name: "Standard Drift",
        distribution: "Rectangular",
        formula: "Drift / √3",
        desc: "Penyusutan akurasi sensor master akibat paparan panas tinggi berulang.",
      },
      {
        term: "u_stab",
        name: "Stabilitas Suhu Ruang Dalam Steril",
        distribution: "Rectangular",
        formula: "Stabilitas / (2 * √3)",
        desc: "Fluktuasi suhu maksimum seiring berjalannya siklus sterilisasi stabil.",
      },
      {
        term: "u_unif",
        name: "Homogenitas Spasial Panas Sterilisator",
        distribution: "Rectangular",
        formula: "Uniformity / (2 * √3)",
        desc: "Uniformitas panas antar sensor di zona terdingin hingga terpanas ruangan.",
      },
      {
        term: "u_press",
        name: "Ketidakpastian Tekanan Uap / AutoclaveP",
        distribution: "Rectangular",
        formula: "AutoclaveP * 0.02",
        desc: "Kontribusi fluktuasi tekanan uap air jenuh pengisi ruangan autoklaf.",
      },
    ],
    notes:
      "Menyesuaikan standar sterilisasi alat medis dengan paparan uap panas jenuh.",
  },
  tekanan: {
    title: "Alat Ukur Tekanan / Sphygmomanometer / Pressure Gauge (KMK)",
    equation: "U95 = k * sqrt(u1² + u2² + u3² + u4² + u_hyst² + u_zero²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Tekanan",
        distribution: "Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Kapasitas baca terkecil skala jarum dial atau display digitizer.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Kalibrator Tekanan",
        distribution: "Normal (k=2)",
        formula: "U_cert / 2",
        desc: "Nilai ketidakpastian standard dari DPM atau digital pressure calibrator.",
      },
      {
        term: "u₃ (Repeatability)",
        name: "Simpangan Fluktuasi Tekanan",
        distribution: "Normal (S)",
        formula: "SD / √n",
        desc: "Deviasi rata-rata pengujian siklus tekan berulang.",
      },
      {
        term: "u₄ (Drift)",
        name: "Drift Efek Tekanan Dinamis",
        distribution: "Rectangular",
        formula: "Drift / √3",
        desc: "Pergeseran sensor strain-gauge standar akibat histeresis fisis jangka panjang.",
      },
      {
        term: "u_hyst (Hysteresis)",
        name: "Histeresis Siklus Naik-Turun",
        distribution: "Rectangular",
        formula: "Histeresis / (2 * √3)",
        desc: "Selisih nilai pembacaan saat pembebanan naik (upscale) terhadap pembebanan turun (downscale).",
      },
      {
        term: "u_zero (Zero Drift)",
        name: "Kesesuaian Titik Nol / Zero Error",
        distribution: "Rectangular",
        formula: "Zero Drift / (2 * √3)",
        desc: "Ketidakpastian penyimpangan kedudukan titik awal sebelum ditekan.",
      },
    ],
    notes:
      "Metode standar histeresis dan zero drift mengacu pada acuan DKD-R 6-1 atau standar SNI terkait.",
  },
  timbangan: {
    title: "Timbangan Medik / Neraca Analitis (KMK)",
    equation: "U95 = k * sqrt(u1² + u2² + u_ecc² + u_lin²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Display",
        distribution: "Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Pembagian skala verifikasi terkecil timbangan.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Anak Timbangan Standard",
        distribution: "Normal (k=2)",
        formula: "U_cert / 2",
        desc: "Nilai ketidakpastian massa bersertifikat (kelas M1 / F1 / E2).",
      },
      {
        term: "u_ecc (Eccentricity)",
        name: "Ketidakpastian Eksentrisitas Muatan",
        distribution: "Rectangular",
        formula: "Eksentrisitas / (2 * √3)",
        desc: "Penyimpangan pembacaan massa saat anak timbangan diletakkan di sudut-sudut pan timbang.",
      },
      {
        term: "u_lin (Linearity)",
        name: "Penyimpangan Linearitas Sensor",
        distribution: "Rectangular",
        formula: "Linearitas / (2 * √3)",
        desc: "Deviasi deviasi kurva timbang non-linear di rentang kapasitas fungsional.",
      },
    ],
    notes:
      "Repeatabilitas diakumulasi langsung dalam proses standardisasi tera atau uji massa berulang.",
  },
  gaya_beban_torsi: {
    title: "Alat Penguji Gaya / Beban / Torsi / Traction (KMK)",
    equation:
      "U95 = k * sqrt(u1² + u2² + u_ecc² + u_lin² + (Actual * (u_Arm / Lengan))²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Sensor Gaya",
        distribution: "Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Resolusi terkecil dari load cell atau sensor torsi terintegrasi.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Kalibrator Gaya",
        distribution: "Normal (k=2)",
        formula: "U_cert / 2",
        desc: "Akurasi kalibrasi induk dari proving ring atau sensor torsi master.",
      },
      {
        term: "u_ecc (Eccentricity)",
        name: "Ketidakpastian Geser Sudut Beban",
        distribution: "Rectangular",
        formula: "Eksentrisitas / (2 * √3)",
        desc: "Deviasi posisi penekanan dari pusat sumbu aksial fisis.",
      },
      {
        term: "u_lin (Linearity)",
        name: "Ketidakpastian Linearitas Sensor",
        distribution: "Rectangular",
        formula: "Linearitas / (2 * √3)",
        desc: "Non-linearitas sensor load-cell melintasi rentang kurva tegangan.",
      },
      {
        term: "u_arm (Arm Length Error)",
        name: "Kesalahan Geometri Panjang Lengan Momen",
        distribution: "Normal",
        formula: "Actual * (u_Arm / Lengan)",
        desc: "Proporsi ketidakpastian panjang lengan beban fisis pengungkit torsi.",
      },
    ],
    notes:
      "Sangat penting untuk Traction, Kunci Momen, Dynamometer medis, dsb.",
  },
  volume_flow: {
    title: "Alat Aliran Cair / Infusion Device Analyzer (KMK)",
    equation: "U95 = k * Q * sqrt((u_V / V)² + (u_t / t)²)",
    components: [
      {
        term: "Q (Flow Rate)",
        name: "Nilai Laju Alir Terukur",
        distribution: "Variabel",
        formula: "Volume / Waktu (V / t)",
        desc: "Faktor pengali laju aliran fisis dalam ml/jam atau ml/menit.",
      },
      {
        term: "u_V (Volume Unc)",
        name: "Ketidakpastian Bejana / Gelas Ukur",
        distribution: "Normal",
        formula: "uVolume (ml)",
        desc: "Penyimpangan teraan bejana volumetrik atau sensor timbangan cair induk.",
      },
      {
        term: "u_t (Time Unc)",
        name: "Ketidakpastian Pencatatan Waktu (Timer)",
        distribution: "Normal",
        formula: "uTime (s)",
        desc: "Ketidakpastian stopwatch standar atau sirkuit kristal osilator analyzer.",
      },
    ],
    notes:
      "Rumus didasarkan pada turunan parsial persamaan hukum pengenceran / debit Q = V / t.",
  },
  gas_flow: {
    title: "Generator Aliran Gas / Ventilator Analyzer (KMK)",
    equation:
      "U95 = k * Q * sqrt((u2 / Q)² + (u_temp / 298.15)² + (u_press / 1013)²)",
    components: [
      {
        term: "Q (Gas Flow)",
        name: "Laju Alir Aliran Gas",
        distribution: "Variabel",
        formula: "Laju Alir Aktual",
        desc: "Besaran laju alir uji dalam Liter/Menit.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Sensor Aliran",
        distribution: "Normal",
        formula: "U_cert / 2",
        desc: "Ketidakpastian bersertifikat dari tabung venturi atau sensor massa gas master.",
      },
      {
        term: "u_temp (Temp Effect)",
        name: "Koreksi Keberadaan Suhu Gas",
        distribution: "Rectangular",
        formula: "(GasTemp + 273.15) * 0.002 / √3",
        desc: "Deviasi ekspansi molekul gas akibat penyimpangan dari suhu referensi STP (298.15 K).",
      },
      {
        term: "u_press (Press Effect)",
        name: "Koreksi Pengaruh Tekanan Barometrik",
        distribution: "Rectangular",
        formula: "GasPress * 0.001 / √3",
        desc: "Deviasi kerapatan molekul gas akibat tekanan luar atmosfer STP (1013 mbar).",
      },
    ],
    notes:
      "Menggunakan koreksi gas ideal untuk menyamakan kompresibilitas aliran udara medis.",
  },
  gas_medis_konsentrasi: {
    title: "Alat Konsentrasi Gas Oksigen / Anestesi (KMK)",
    equation:
      "U95 = k * Q * sqrt((u2 / Q)² + (u_temp / 298.15)² + (u_press / 1013)²)",
    components: [
      {
        term: "Q (Concentration)",
        name: "Persentase Fraksi Gas Medis",
        distribution: "Normal",
        formula: "Konsentrasi Terbaca (%)",
        desc: "Konsentrasi aktual gas target (O₂, N₂O, dsb).",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Sensor Konsentrasi Standard",
        distribution: "Normal",
        formula: "U_cert / 2",
        desc: "Akurasi tabung gas referensi atau detektor optik master.",
      },
      {
        term: "u_temp",
        name: "Fluktuasi Suhu Gas Medis",
        distribution: "Rectangular",
        formula: "Koreksi Termal",
        desc: "Fluktuasi termal mempengaruhi laju absorbsi sensor elektrokimia.",
      },
      {
        term: "u_press",
        name: "Pengaruh Fluktuasi Tekanan Gas",
        distribution: "Rectangular",
        formula: "Koreksi Tekanan",
        desc: "Pengaruh tekanan parsiil gas medis terhadap sirkuit hisap.",
      },
    ],
    notes:
      "Penting untuk keselamatan resusitator bayi, vaporiser anestesi, dsb.",
  },
  radiologi: {
    title: "Alat Uji Radiologi & Sinar-X (KMK)",
    equation:
      "U95 = k * D * sqrt((u_std/D)² + (u_repeat/D)² + (u_distance/r)² + (u_kVp/kVp)²)",
    components: [
      {
        term: "D (Dose / Output)",
        name: "Keluaran Dosis Radiasi Terukur",
        distribution: "Normal",
        formula: "Dosis Aktual Sinar-X",
        desc: "Dosis paparan radiasi (mGy, Air Kerma) atau laju dosis uji.",
      },
      {
        term: "u_std (Master)",
        name: "Ketidakpastian Deteksi Detektor Kamar Ionisasi",
        distribution: "Normal (k=2)",
        formula: "MasterUnc / 2",
        desc: "Ketidakpastian piringan sensor detektor multi-fungsi / ion chamber master.",
      },
      {
        term: "u_repeat (Repeat)",
        name: "Fisika Ketidakstabilan Generator Sinar-X",
        distribution: "Normal",
        formula: "SD / √n",
        desc: "Simpangan baku dari radiasi keluaran tabung anoda berulang.",
      },
      {
        term: "u_distance (Distance)",
        name: "Penyimpangan Jarak Geometri Fokus-Detektor",
        distribution: "Rectangular",
        formula: "uDistance / Jarak",
        desc: "Ketidakpastian jarak fisis (Hukum Kuadrat Terbalik Sinar-X I ~ 1/r²).",
      },
      {
        term: "u_kVp (Energy Quality)",
        name: "Ketidakpastian Fluktuasi Tegangan Tabung",
        distribution: "Rectangular",
        formula: "uKvp / kVp",
        desc: "Fluktuasi kualitas spektrum berkas energi akibat degradasi tegangan tinggi kVp generator.",
      },
    ],
    notes:
      "Komponen kelipatan eksponensial radiologis sesuai dengan standar IAEA TRS-398 / TRS-457.",
  },
  dosis_radiasi: {
    title: "Alat Ukur Proteksi Radiasi / Survey Meter (KMK)",
    equation:
      "U95 = k * D * sqrt((u_std/D)² + (u_repeat/D)² + (u_distance/r)² + (u_kVp/kVp)²)",
    components: [
      {
        term: "u_std (Standard)",
        name: "Ketidakpastian Detektor Surveymeter Master",
        distribution: "Normal",
        formula: "MasterUnc / 2",
        desc: "Akurasi rujukan isotop pembanding (Cs-137 / Co-60) di lab radiasi primer.",
      },
      {
        term: "u_distance (Geometry)",
        name: "Ketidakpastian Kedudukan Jarak Paparan",
        distribution: "Rectangular",
        formula: "uDistance / Jarak",
        desc: "Presisi rel paparan radiasi bangku kalibrasi gamma.",
      },
    ],
    notes:
      "Didesain spesifik mengawal keselamatan lingkungan radiasi di sekitar pesawat diagnostik.",
  },
  standard: {
    title: "Metode Ketidakpastian Standar (ISO GUM)",
    equation: "U95 = k * sqrt(u1² + u2² + u3² + u4²)",
    components: [
      {
        term: "u₁ (Resolution)",
        name: "Ketidakpastian Resolusi Alat Uji",
        distribution: "Rectangular",
        formula: "Resolusi / (2 * √3)",
        desc: "Menghitung kontribusi keterbacaan digit display terkecil.",
      },
      {
        term: "u₂ (Master)",
        name: "Ketidakpastian Kalibrator Master",
        distribution: "Normal (k=2)",
        formula: "MasterUnc / 2",
        desc: "Ketidakpastian sertifikat uji alat standar.",
      },
      {
        term: "u₃ (Repeatability)",
        name: "Simpangan Baku Rata-rata Uji Berulang",
        distribution: "Normal (S)",
        formula: "SD / √n",
        desc: "Ketidakstabilan hasil pengukuran berulang.",
      },
      {
        term: "u₄ (Drift)",
        name: "Drift Kalibrator",
        distribution: "Rectangular",
        formula: "Drift / √3",
        desc: "Faktor kestabilan atau pergeseran fisik nilai standar.",
      },
    ],
    notes:
      "Model umum penggabungan ketidakpastian standar sesuai dengan pedoman ISO GUM.",
  },
};

const FUNCTION_CHECKLIST = [
  "Fungsi ON / OFF",
  "Kinerja Operasional",
  "Tampilan & Indikator",
  "Fungsi Alarm",
  "Penyetelan / Zeroing",
  "Sistem Pengaman / Interlock",
];

export function WorksheetEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const [lk, setLk] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "identity" | "calibrators_tab" | "inspections" | "electrical" | "measurements"
  >("identity");
  const [showPreview, setShowPreview] = useState(false);
  const [editMetrologyMode, setEditMetrologyMode] = useState<boolean>(false);
  const [showLabelModal, setShowLabelModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [calibrators, setCalibrators] = useState<any[]>([]);
  const [selectedCalibratorIds, setSelectedCalibratorIds] = useState<string[]>(
    [],
  );
  const [availableMethods, setAvailableMethods] = useState<any[]>([]);
  const [availableEquipment, setAvailableEquipment] = useState<any[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [aiResults, setAiResults] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "warning" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const exportWorksheetToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const marginX = 20;
      let yPos = 25;
      const pageHeight = 280;

      // Header logo / Brand info
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(30, 41, 59); // slate-800
      doc.text("PT. SPEKTRUM KREASI PRATAMA", marginX, yPos);
      yPos += 5.5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text("DIVISI METROLOGI & KALIBRASI INTERNAL ALAT KESEHATAN", marginX, yPos);
      yPos += 4;

      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.5);
      doc.line(marginX, yPos, 190, yPos);
      yPos += 8;

      // Report Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("LEMBAR KERJA PENGUJIAN & KALIBRASI (WORK SHEET)", marginX, yPos);
      yPos += 5;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Lembar Rekam Pengujian Metrologis & Kondisi Lingkungan Kerja", marginX, yPos);
      yPos += 10;

      // Two-column metadata block
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      
      doc.text("IDENTITAS UNIT ALAT KESEHATAN", marginX, yPos);
      doc.text("KONDISI LINGKUNGAN & METODE", 110, yPos);
      yPos += 5;

      doc.setFont("Helvetica", "normal");
      doc.setTextColor(15, 23, 42);

      const metadataLeft = [
        ["Nama Alat:", identityData.deviceName || "-"],
        ["Merek / Model:", `${identityData.brand || "-"} / ${identityData.model || "-"}`],
        ["Nomor Seri:", identityData.serialNumber || "-"],
        ["ID Inventaris:", identityData.deviceId || "-"],
        ["Mitra / RS:", identityData.fasyankesName || "-"]
      ];

      const metadataRight = [
        ["Suhu Awal/Akhir:", `${identityData.tempInitial || "-"} C / ${identityData.tempFinal || "-"} C`],
        ["Kelembaban A/A:", `${identityData.humInitial || "-"} % / ${identityData.humFinal || "-"} %`],
        ["Tegangan Jala:", `${identityData.voltage || "-"} VAC`],
        ["Metode Kerja:", getDeviceNameFromMethodTitle(availableMethods.find(m => m.id === identityData.methodId)?.title || "Standar Kalibrasi")],
        ["Operator Teknik:", profile?.displayName || user?.email || "Teknisi Utama"]
      ];

      let leftY = yPos;
      metadataLeft.forEach(([label, val]) => {
        doc.setFont("Helvetica", "bold");
        doc.text(label, marginX, leftY);
        doc.setFont("Helvetica", "normal");
        doc.text(val, marginX + 26, leftY);
        leftY += 4.5;
      });

      let rightY = yPos;
      metadataRight.forEach(([label, val]) => {
        doc.setFont("Helvetica", "bold");
        doc.text(label, 110, rightY);
        doc.setFont("Helvetica", "normal");
        doc.text(val, 110 + 32, rightY);
        rightY += 4.5;
      });

      yPos = Math.max(leftY, rightY) + 7;

      // elegant separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(marginX, yPos - 3, 190, yPos - 3);

      // Section 1: Calibrators Used
      const activeCalibrators = calibrators.filter(c => selectedCalibratorIds.includes(c.id));
      if (activeCalibrators.length > 0) {
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text("1. STANDAR KALIBRATOR (MASTER STANDARDS)", marginX, yPos);
        yPos += 5;

        activeCalibrators.forEach(cal => {
          if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(`* ${cal.name || "Master Standard"}:`, marginX + 3, yPos);
          doc.setFont("Helvetica", "normal");
          doc.text(`S/N: ${cal.serialNumber || "-"} | Model: ${cal.model || "-"} | Koreksi Drift: ${cal.driftUncertainty || "-"}`, marginX + 50, yPos);
          yPos += 4.5;
        });
        yPos += 3;
      }

      // Section 2: Physical & Functional Checks
      if (yPos > pageHeight - 35) { doc.addPage(); yPos = 25; }
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 58, 138);
      doc.text("2. PEMERIKSAAN FISIK & FUNGSI (INSPECTION CHECKS)", marginX, yPos);
      yPos += 5;

      // Table visual & functional
      doc.setFillColor(241, 245, 249);
      doc.rect(marginX, yPos, 170, 5.5, "F");
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Aspek Inspeksi Fisik / Visual", marginX + 3, yPos + 4);
      doc.text("Hasil Uji", marginX + 65, yPos + 4);
      doc.text("Aspek Fungsi Operasional", marginX + 90, yPos + 4);
      doc.text("Hasil Uji", marginX + 155, yPos + 4);
      yPos += 5.5;

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);

      const physEntries = Object.entries(physicalData);
      const funcEntries = Object.entries(functionalData);
      const maxRows = Math.max(physEntries.length, funcEntries.length);

      for (let i = 0; i < maxRows; i++) {
        if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
        
        if (i < physEntries.length) {
          const [label, val] = physEntries[i];
          doc.text(label.slice(0, 32), marginX + 3, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(val === "Baik" ? 16 : 239, val === "Baik" ? 185 : 68, val === "Baik" ? 129 : 68);
          doc.text(String(val), marginX + 65, yPos + 4);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(15, 23, 42);
        }

        if (i < funcEntries.length) {
          const [label, val] = funcEntries[i];
          doc.text(label.slice(0, 32), marginX + 90, yPos + 4);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(val === "Baik" ? 16 : 239, val === "Baik" ? 185 : 68, val === "Baik" ? 129 : 68);
          doc.text(String(val), marginX + 155, yPos + 4);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(15, 23, 42);
        }
        yPos += 5.5;
      }
      yPos += 4;

      // Section 3: Electrical Safety Checks
      if (electricalData.enabled) {
        if (yPos > pageHeight - 35) { doc.addPage(); yPos = 25; }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text("3. PENGUJIAN KESELAMATAN LISTRIK (NFPA 99 Safety Standards)", marginX, yPos);
        yPos += 5;

        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos, 170, 5.5, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("Tipe Pengujian Kelistrikan", marginX + 3, yPos + 4);
        doc.text("Ambang Batas Pengaman", marginX + 65, yPos + 4);
        doc.text("Nilai Terukur", marginX + 110, yPos + 4);
        doc.text("Evaluasi", marginX + 145, yPos + 4);
        yPos += 5.5;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);

        Object.entries(electricalData.results || {}).forEach(([key, val]: any) => {
          if (yPos > pageHeight - 15) { doc.addPage(); yPos = 25; }
          let labelStr = key;
          let limitStr = "";
          let unit = "";
          let isOk = true;

          if (key.includes("protective")) {
            labelStr = "Protective Earth Resistance";
            limitStr = "<= 0.50 Ohm";
            unit = " Ohm";
            isOk = Number(val) <= 0.5;
          } else if (key.includes("insulation")) {
            labelStr = "Insulation Resistance";
            limitStr = ">= 2.0 MOhm";
            unit = " MOhm";
            isOk = Number(val) >= 2;
          } else if (key.includes("touch") || key.includes("leakage")) {
            labelStr = "Touch Chassis Leakage Current";
            limitStr = "<= 300 uA";
            unit = " uA";
            isOk = Number(val) <= 300;
          }

          doc.text(labelStr, marginX + 3, yPos + 4);
          doc.text(limitStr, marginX + 65, yPos + 4);
          doc.text(`${val}${unit}`, marginX + 110, yPos + 4);
          
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(isOk ? 16 : 239, isOk ? 185 : 68, isOk ? 129 : 68);
          doc.text(isOk ? "PASSED" : "FAILED", marginX + 145, yPos + 4);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          yPos += 5.5;
        });
        yPos += 4;
      }

      // Section 4: Metrology Data
      if (measurements.length > 0) {
        if (yPos > pageHeight - 35) { doc.addPage(); yPos = 25; }
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 58, 138);
        doc.text("4. DATA PENGUKURAN METROLOGIS & HASIL KALIBRASI", marginX, yPos);
        yPos += 5;

        // Table Header
        doc.setFillColor(241, 245, 249);
        doc.rect(marginX, yPos, 170, 6, "F");
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text("Nama Parameter", marginX + 2, yPos + 4.2);
        doc.text("Setting", marginX + 45, yPos + 4.2);
        doc.text("Terukur (Rata)", marginX + 63, yPos + 4.2);
        doc.text("Deviasi", marginX + 85, yPos + 4.2);
        doc.text("U95", marginX + 102, yPos + 4.2);
        doc.text("CMC", marginX + 119, yPos + 4.2);
        doc.text("TUR/TAR", marginX + 133, yPos + 4.2);
        doc.text("MPE Tol", marginX + 149, yPos + 4.2);
        doc.text("Status", marginX + 163, yPos + 4.2);
        yPos += 6;

        doc.setFont("Helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);

        measurements.forEach((row: any) => {
          if (yPos > pageHeight - 15) {
            doc.addPage();
            yPos = 25;
            // Draw header again
            doc.setFillColor(241, 245, 249);
            doc.rect(marginX, yPos, 170, 6, "F");
            doc.setFont("Helvetica", "bold");
            doc.setFontSize(7);
            doc.setTextColor(71, 85, 105);
            doc.text("Nama Parameter", marginX + 2, yPos + 4.2);
            doc.text("Setting", marginX + 45, yPos + 4.2);
            doc.text("Terukur (Rata)", marginX + 63, yPos + 4.2);
            doc.text("Deviasi", marginX + 85, yPos + 4.2);
            doc.text("U95", marginX + 102, yPos + 4.2);
            doc.text("CMC", marginX + 119, yPos + 4.2);
            doc.text("TUR/TAR", marginX + 133, yPos + 4.2);
            doc.text("MPE Tol", marginX + 149, yPos + 4.2);
            doc.text("Status", marginX + 163, yPos + 4.2);
            yPos += 6;
            doc.setFont("Helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(15, 23, 42);
          }

          const avgVal = Number(row.measuredAvg || row.avg || 0);
          const devVal = Number(row.deviation || 0);
          const u95Val = Number(row.u95 || 0);
          const isLolos = row.status === "Lolos" || row.status === "PASS";

          doc.text(String(row.parameterName || row.name || "-").slice(0, 24), marginX + 2, yPos + 4.5);
          doc.text(`${row.settingValue || row.setting || 0} ${row.unit || ""}`, marginX + 45, yPos + 4.5);
          doc.text(`${avgVal.toFixed(3)}`, marginX + 63, yPos + 4.5);
          doc.text(`${devVal.toFixed(3)}`, marginX + 85, yPos + 4.5);
          doc.text(`${u95Val.toFixed(3)}`, marginX + 102, yPos + 4.5);
          doc.text(`${(row.cmc || 0.05).toFixed(3)}`, marginX + 119, yPos + 4.5);
          doc.text(`${(row.tur || 0).toFixed(1)}`, marginX + 133, yPos + 4.5);
          doc.text(`${row.tolerance || row.mpe || 0}`, marginX + 149, yPos + 4.5);
          
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(isLolos ? 16 : 239, isLolos ? 185 : 68, isLolos ? 129 : 68);
          doc.text(String(row.status || "Lolos").toUpperCase(), marginX + 163, yPos + 4.5);
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(15, 23, 42);
          
          yPos += 5.5;
        });
        yPos += 4;
      }

      // Final Verdict Box
      if (yPos > pageHeight - 35) { doc.addPage(); yPos = 25; }
      
      const totalPassed = measurements.every((m: any) => m.status === "Lolos" || m.status === "PASS");
      
      doc.setFillColor(totalPassed ? 240 : 254, totalPassed ? 253 : 242, totalPassed ? 250 : 242);
      doc.setDrawColor(totalPassed ? 16 : 252, totalPassed ? 185 : 165, totalPassed ? 129 : 165);
      doc.setLineWidth(0.6);
      doc.rect(marginX, yPos, 170, 15, "FD");

      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(totalPassed ? 6 : 153, totalPassed ? 95 : 27, totalPassed ? 70 : 27);
      doc.text("STATUS AKHIR & KESIMPULAN KALIBRASI:", marginX + 5, yPos + 5.5);
      
      doc.setFont("Helvetica", "extrabold");
      doc.setFontSize(10);
      doc.text(
        totalPassed 
          ? "ALAT KESEHATAN MEMENUHI BATAS TOLERANSI MPE (LAIK OPERASI)" 
          : "ALAT KESEHATAN MELEBIHI BATAS TOLERANSI MPE (MEMBUTUHKAN PERBAIKAN / ADJUSTMENT)", 
        marginX + 5, 
        yPos + 10.5
      );
      yPos += 22;

      // Footer / Signature block
      if (yPos > pageHeight - 35) { doc.addPage(); yPos = 25; }
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text("Medan, " + new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric' }), 135, yPos);
      yPos += 4.5;
      doc.text("Teknisi Penguji / Kalibrator,", 135, yPos);
      yPos += 18;

      doc.setFont("Helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(profile?.displayName || user?.email || "Teknisi Utama", 135, yPos);
      doc.setFont("Helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("PT. Spektrum Kreasi Pratama", 135, yPos + 4);

      doc.save(`Lembar_Kerja_${(identityData.deviceName || "Alat").replace(/\s+/g, "_")}_${identityData.serialNumber || "SN"}.pdf`);
      showToast("Lembar Kerja (LK) berhasil diekspor ke PDF!", "success");
    } catch (e: any) {
      console.error(e);
      showToast("Gagal mengekspor Lembar Kerja ke PDF: " + e.message, "error");
    }
  };

  // Auto-save & draft states
  const [draftData, setDraftData] = useState<any | null>(null);
  const [showDraftBanner, setShowDraftBanner] = useState<boolean>(false);
  // Form State
  const [identityData, setIdentityData] = useState<any>({
    deviceId: "",
    deviceName: "",
    brand: "",
    model: "",
    serialNumber: "",
    fasyankesName: "",
    location: "",
    methodId: "",
    tempInitial: "",
    tempFinal: "",
    humInitial: "",
    humFinal: "",
    voltage: "",
    uncMethod: "standard",
  });
  const [physicalData, setPhysicalData] = useState<any>({});
  const [functionalData, setFunctionalData] = useState<any>({});
  const [electricalData, setElectricalData] = useState<any>({
    enabled: false,
    results: {},
  });
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [isAutomationOpen, setIsAutomationOpen] = useState<boolean>(false);

  // Decision Rules, CMC, and Drift justification state variables
  const [decisionRule, setDecisionRule] = useState<"simple" | "strict">("simple");
  const [cmcValue, setCmcValue] = useState<number>(0.05);
  const [justificationText, setJustificationText] = useState<string>("");
  const [isJustificationSaved, setIsJustificationSaved] = useState<boolean>(false);

  // Auto-Save Mechanisms and Draft Restore Hooks
  const stateRef = React.useRef({
    identityData: null as any,
    physicalData: null as any,
    functionalData: null as any,
    electricalData: null as any,
    measurements: null as any[],
    selectedCalibratorIds: null as string[],
    decisionRule: null as any,
    cmcValue: null as number,
    justificationText: null as string,
  });

  // Track state changes to local ref
  useEffect(() => {
    stateRef.current = {
      identityData,
      physicalData,
      functionalData,
      electricalData,
      measurements,
      selectedCalibratorIds,
      decisionRule,
      cmcValue,
      justificationText,
    };
  }, [
    identityData,
    physicalData,
    functionalData,
    electricalData,
    measurements,
    selectedCalibratorIds,
    decisionRule,
    cmcValue,
    justificationText,
  ]);

  // Check if draft exists in localStorage on load or id change
  useEffect(() => {
    if (!id) return;
    const key = `worksheet_autosave_${id}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.timestamp) {
          setDraftData(parsed);
          setShowDraftBanner(true);
        }
      }
    } catch (e) {
      console.error("Gagal membaca draf simpan otomatis:", e);
    }
  }, [id]);

  // Set up 30-second interval for autosave
  useEffect(() => {
    if (!id) return;
    const interval = setInterval(() => {
      const key = `worksheet_autosave_${id}`;
      try {
        localStorage.setItem(
          key,
          JSON.stringify({
            ...stateRef.current,
            timestamp: new Date().toISOString(),
          })
        );
        console.log("Draf lembar kerja berhasil disimpan secara otomatis ke lokal.");
      } catch (err) {
        console.error("Gagal menyimpan draf otomatis:", err);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [id]);

  const handleRestoreDraft = () => {
    if (!draftData) return;
    try {
      if (draftData.identityData) setIdentityData(draftData.identityData);
      if (draftData.physicalData) setPhysicalData(draftData.physicalData);
      if (draftData.functionalData) setFunctionalData(draftData.functionalData);
      if (draftData.electricalData) setElectricalData(draftData.electricalData);
      if (draftData.measurements) setMeasurements(draftData.measurements);
      if (draftData.selectedCalibratorIds) setSelectedCalibratorIds(draftData.selectedCalibratorIds);
      if (draftData.decisionRule) setDecisionRule(draftData.decisionRule);
      if (draftData.cmcValue !== undefined) setCmcValue(draftData.cmcValue);
      if (draftData.justificationText !== undefined) setJustificationText(draftData.justificationText);
      
      showToast("Draf berhasil dipulihkan!", "success");
      setShowDraftBanner(false);
    } catch (err) {
      console.error("Gagal memulihkan draf:", err);
      showToast("Gagal memulihkan draf.", "error");
    }
  };

  const handleDiscardDraft = () => {
    const key = `worksheet_autosave_${id}`;
    try {
      localStorage.removeItem(key);
      setDraftData(null);
      setShowDraftBanner(false);
      showToast("Draf lokal diabaikan.", "info");
    } catch (err) {
      console.error("Gagal menghapus draf:", err);
    }
  };

  // Bulk Auto-Fill Data Entry Assistant State
  const [bulkRes, setBulkRes] = useState<string>("0.01");
  const [bulkMUnc, setBulkMUnc] = useState<string>("0.001");
  const [bulkDrift, setBulkDrift] = useState<string>("0.0");
  const [bulkTol, setBulkTol] = useState<string>("");

  // Automated Sequence Generator State
  const [seqName, setSeqName] = useState<string>("Tegangan");
  const [seqStart, setSeqStart] = useState<string>("0");
  const [seqEnd, setSeqEnd] = useState<string>("220");
  const [seqSteps, setSeqSteps] = useState<string>("5");
  const [seqUnit, setSeqUnit] = useState<string>("V");

  // Interpolation Calculator State
  const [interpX1, setInterpX1] = useState<string>("");
  const [interpY1, setInterpY1] = useState<string>("");
  const [interpX2, setInterpX2] = useState<string>("");
  const [interpY2, setInterpY2] = useState<string>("");
  const [interpX, setInterpX] = useState<string>("");
  const [interpResult, setInterpResult] = useState<number | null>(null);
  const [interpTargetRow, setInterpTargetRow] = useState<number>(-1);
  const [interpTargetField, setInterpTargetField] = useState<
    "masterUnc" | "drift" | "actual"
  >("masterUnc");
  const [selectedInterpParam, setSelectedInterpParam] = useState<string>("");
  const [interpValueType, setInterpValueType] = useState<
    "correction" | "uncertainty"
  >("correction");
  const [interpSource, setInterpSource] = useState<"manual" | "calibrator">(
    "calibrator",
  );
  const [interpWarning, setInterpWarning] = useState<string>("");
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  const selectedCalibratorParams = useMemo(() => {
    const params: any[] = [];
    calibrators.forEach((cal) => {
      if (selectedCalibratorIds.includes(cal.id) && cal.parameters) {
        cal.parameters.forEach((p: any) => {
          params.push({
            ...p,
            calibratorName: cal.deviceName || cal.brand || "Kalibrator",
          });
        });
      }
    });
    return params;
  }, [calibrators, selectedCalibratorIds]);

  const uniqueParamNames = useMemo(() => {
    const names = new Set<string>();
    selectedCalibratorParams.forEach((p) => {
      if (p.parameterName) {
        names.add(p.parameterName);
      }
    });
    return Array.from(names);
  }, [selectedCalibratorParams]);

  // Unified Calibrator Historical Drift Analysis & Stability Trend
  const calibratorHistories = useMemo(() => {
    const historiesMap: Record<string, any[]> = {};
    selectedCalibratorIds.forEach((id) => {
      const selectedCal = calibrators.find((c) => c.id === id);
      if (!selectedCal) return;
      const sn = selectedCal.serialNumber || selectedCal.serial_number || "";
      if (!sn) return;
      
      // Filter out calibrators with identical serial number and sort chronologically
      const matches = calibrators
        .filter((c) => (c.serialNumber || c.serial_number || "") === sn && (c.calibrationDate || c.calibration_date))
        .sort((a, b) => {
          const dateA = a.calibrationDate || a.calibration_date || "";
          const dateB = b.calibrationDate || b.calibration_date || "";
          return dateA.localeCompare(dateB);
        });
      historiesMap[id] = matches;
    });
    return historiesMap;
  }, [calibrators, selectedCalibratorIds]);

  // Robust AI Warnings & Validations
  const aiWarnings = useMemo(() => {
    const warnings: string[] = [];

    // 1. Data pengulangan kurang (n < 3)
    measurements.forEach((m, idx) => {
      const n = typeof m.n === "number" ? m.n : 3;
      if (n < 3) {
        warnings.push(`Baris ${idx + 1}: Data pengulangan kurang (${n} kali), standar ISO GUM minimal menetapkan 3 atau 5 pengulangan.`);
      }
    });

    // 2. Kalibrator expired / mendekati expired
    selectedCalibratorIds.forEach((id) => {
      const cal = calibrators.find((c) => c.id === id);
      if (cal) {
        const expiryDateStr = cal.expiryDate || cal.expiry_date || "";
        if (expiryDateStr) {
          const expiryDate = new Date(expiryDateStr);
          const now = new Date();
          const diffDays = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0) {
            warnings.push(`⚠️ Standar "${cal.name}" telah EXPIRED pada ${expiryDateStr}!`);
          } else if (diffDays <= 30) {
            warnings.push(`⚠️ Standar "${cal.name}" mendekati masa expired (${diffDays} hari tersisa).`);
          }
        } else {
          warnings.push(`⚠️ Standar "${cal.name}" tidak memiliki tanggal kedaluwarsa.`);
        }
      }
    });

    // 3. Sertifikat standar belum tersedia
    if (selectedCalibratorIds.length === 0) {
      warnings.push("⚠️ Belum ada Sertifikat Kalibrator Standar yang dimasukkan/dipilih.");
    }

    // 4. Titik ukur di luar range, satuan tidak konsisten, dll
    measurements.forEach((m, idx) => {
      // Satuan tidak konsisten
      if (m.unit && selectedCalibratorParams.length > 0) {
        const matchParam = selectedCalibratorParams.find(p => p.parameterName === m.parameterName);
        if (matchParam && matchParam.unit && matchParam.unit.toLowerCase() !== m.unit.toLowerCase()) {
          warnings.push(`Baris ${idx + 1}: Satuan "${m.unit}" tidak konsisten dengan standar "${matchParam.unit}" untuk parameter "${m.parameterName}".`);
        }
      }

      // TUR rendah
      if (m.tolerance && m.uncertainty) {
        const tur = Number(m.tolerance) / Number(m.uncertainty);
        if (tur < 4) {
          warnings.push(`Baris ${idx + 1}: Test Uncertainty Ratio (TUR) rendah yaitu ${tur.toFixed(2)}:1. Disarankan TUR ≥ 4:1.`);
        }
      }

      // Uncertainty < CMC
      const currentCmc = cmcValue || 0.05;
      if (m.uncertainty && m.uncertainty < currentCmc) {
        warnings.push(`Baris ${idx + 1}: Nilai ketidakpastian (± ${m.uncertainty.toFixed(5)}) di bawah batas CMC lab (± ${currentCmc.toFixed(5)}).`);
      }
    });

    // 5. Metode kerja belum dipilih
    if (!identityData.methodId) {
      warnings.push("⚠️ Nama Alat / Metode Kerja belum dipilih pada Data Identitas.");
    }

    return warnings;
  }, [measurements, selectedCalibratorIds, calibrators, selectedCalibratorParams, identityData.methodId, cmcValue]);

  // Interpolation warning useEffect
  useEffect(() => {
    if (interpSource === "calibrator" && selectedInterpParam) {
      const matchedPoints = selectedCalibratorParams.filter(
        (p) =>
          p.parameterName === selectedInterpParam &&
          typeof p.point === "number" &&
          !isNaN(p.point),
      );
      if (matchedPoints.length === 0) {
        setInterpWarning(
          "Notifikasi: Tidak ada data titik acuan kalibrator untuk parameter terpilih ini.",
        );
      } else if (matchedPoints.length < 2) {
        setInterpWarning(
          "Notifikasi: Jumlah data titik acuan kalibrator tidak mencukupi untuk interpolasi (minimal dibutuhkan 2 titik data).",
        );
      } else {
        setInterpWarning("");
      }
    } else {
      setInterpWarning("");
    }
  }, [interpSource, selectedInterpParam, selectedCalibratorParams]);

  // Automatically sync calibrator parameters into measurements when calibrator is selected/changed
  useEffect(() => {
    if (selectedCalibratorParams && selectedCalibratorParams.length > 0 && measurements.length > 0) {
      const newM = measurements.map((row) => {
        let candidates = selectedCalibratorParams;
        if (row.parameterName) {
          const lowerName = row.parameterName.toLowerCase().trim();
          candidates = selectedCalibratorParams.filter(p => 
            p.parameterName && p.parameterName.toLowerCase().trim() === lowerName
          );
          if (candidates.length === 0) {
            candidates = selectedCalibratorParams.filter(p => 
              p.parameterName && (
                p.parameterName.toLowerCase().includes(lowerName) ||
                lowerName.includes(p.parameterName.toLowerCase())
              )
            );
          }
        }
        
        if (candidates.length > 0) {
          let bestMatch = candidates[0];
          let minDiff = Math.abs((bestMatch.point || 0) - (row.point || 0));
          for (let j = 1; j < candidates.length; j++) {
            const diff = Math.abs((candidates[j].point || 0) - (row.point || 0));
            if (diff < minDiff) {
              minDiff = diff;
              bestMatch = candidates[j];
            }
          }
          
          const updatedRow = { ...row };
          if (typeof bestMatch.uncertainty === 'number' && !isNaN(bestMatch.uncertainty)) {
            updatedRow.masterUnc = bestMatch.uncertainty;
          }
          if (bestMatch.unit) {
            updatedRow.unit = bestMatch.unit;
          }
          
          updatedRow.deviation = (updatedRow.actual !== undefined && updatedRow.actual !== null && String(updatedRow.actual).trim() !== "")
            ? Number(updatedRow.actual) - (updatedRow.point || 0)
            : 0;
            
          updatedRow.uncertainty = calculateUncertainty(
            updatedRow.resolution || 0.01,
            updatedRow.masterUnc || 0.001,
            updatedRow.drift || 0,
            updatedRow
          );
          return updatedRow;
        }
        return row;
      });
      
      const hasChanged = JSON.stringify(newM.map(m => ({ u: m.masterUnc, un: m.unit, dev: m.deviation, unc: m.uncertainty }))) !== 
                         JSON.stringify(measurements.map(m => ({ u: m.masterUnc, un: m.unit, dev: m.deviation, unc: m.uncertainty })));
      if (hasChanged) {
        setMeasurements(newM);
      }
    }
  }, [selectedCalibratorParams, measurements.length]);

  useEffect(() => {
    if (uniqueParamNames.length > 0 && !selectedInterpParam) {
      setSelectedInterpParam(uniqueParamNames[0]);
    }
  }, [uniqueParamNames, selectedInterpParam]);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // Fetch LK
        const docRef = doc(db, "worksheets", id);
        const snap = await getDoc(docRef);

        // Fetch Calibrators
        const calSnap = await getDocs(collection(db, "calibrators"));
        setCalibrators(calSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // Fetch Methods
        const methodSnap = await getDocs(collection(db, "methods"));
        setAvailableMethods(
          methodSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );

        // Fetch Equipment
        const equipSnap = await getDocs(collection(db, "medicalEquipment"));
        setAvailableEquipment(
          equipSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );

        if (snap.exists()) {
          const data = snap.data();
          setLk({ id: snap.id, ...data });
          setDecisionRule(data.decisionRule || "simple");
          setCmcValue(data.cmcValue !== undefined ? data.cmcValue : 0.05);
          setJustificationText(data.driftJustification || "");
          setIsJustificationSaved(!!data.driftJustification);
          setIdentityData({
            deviceId: data.deviceId || "",
            deviceName: data.deviceName || "",
            brand: data.brand || "",
            model: data.model || "",
            serialNumber: data.serialNumber || "",
            fasyankesName: data.fasyankesName || "",
            location: data.location || "",
            methodId: data.methodId || "",
            tempInitial: data.tempInitial || "",
            tempFinal: data.tempFinal || "",
            humInitial: data.humInitial || "",
            humFinal: data.humFinal || "",
            voltage: data.voltage || "",
            uncMethod: data.uncMethod || "standard",
          });

          // Use defaults if data is empty
          const pData = data.inspections?.physical || {};
          if (Object.keys(pData).length === 0) {
            PHYSICAL_CHECKLIST.forEach((item) => (pData[item] = "Baik"));
          }
          setPhysicalData(pData);

          const fData = data.inspections?.functional || {};
          if (Object.keys(fData).length === 0) {
            FUNCTION_CHECKLIST.forEach((item) => (fData[item] = "Baik"));
          }
          setFunctionalData(fData);

          setElectricalData(
            data.inspections?.electrical || { enabled: false, results: {} },
          );
          setMeasurements(data.measurements || []);
          setSelectedCalibratorIds(data.calibratorIds || []);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "worksheets");
      }
      setLoading(false);
    }
    fetchData();
  }, [id]);

  const loadMethod = (methodId: string) => {
    const method = availableMethods.find((m) => m.id === methodId);
    if (!method) return;

    // Dynamically map device categories based on title to relevant ISO 17025 calculation models
    const norm = (method.title || "").toLowerCase();
    let mappedUnc = "standard";
    if (
      norm.includes("suhu") ||
      norm.includes("temp") ||
      norm.includes("incubator") ||
      norm.includes("oven") ||
      norm.includes("freezer") ||
      norm.includes("refrigerator") ||
      norm.includes("bath") ||
      norm.includes("termometer") ||
      norm.includes("sterilizer") ||
      norm.includes("autoclave")
    ) {
      mappedUnc = "suhu";
    } else if (
      norm.includes("tekanan") ||
      norm.includes("pressure") ||
      norm.includes("manometer") ||
      norm.includes("suction") ||
      norm.includes("tensimeter") ||
      norm.includes("sphygmo") ||
      norm.includes("blood pressure")
    ) {
      mappedUnc = "tekanan";
    } else if (
      norm.includes("timbangan") ||
      norm.includes("massa") ||
      norm.includes("berat") ||
      norm.includes("neraca") ||
      norm.includes("scale") ||
      norm.includes("mass")
    ) {
      mappedUnc = "timbangan";
    } else if (
      norm.includes("aliran gas") ||
      norm.includes("gas flow") ||
      norm.includes("ventilator") ||
      norm.includes("anestesi") ||
      norm.includes("spirometer") ||
      norm.includes("oxygen")
    ) {
      mappedUnc = "gas_flow";
    } else if (
      norm.includes("aliran") ||
      norm.includes("flow") ||
      norm.includes("pump") ||
      norm.includes("pipet") ||
      norm.includes("syringe") ||
      norm.includes("volume")
    ) {
      mappedUnc = "volume_flow";
    } else if (
      norm.includes("radiologi") ||
      norm.includes("rontgen") ||
      norm.includes("x-ray") ||
      norm.includes("paparan") ||
      norm.includes("radiasi") ||
      norm.includes("dosis") ||
      norm.includes("sinar")
    ) {
      mappedUnc = "dosis_radiasi";
    } else if (
      norm.includes("defibrilator") ||
      norm.includes("ecg") ||
      norm.includes("esg") ||
      norm.includes("ekg") ||
      norm.includes("patient monitor") ||
      norm.includes("spo2") ||
      norm.includes("pasien")
    ) {
      mappedUnc = "monitoring_pasien";
    } else if (
      norm.includes("listrik") ||
      norm.includes("esa") ||
      norm.includes("medical safety") ||
      norm.includes("safety analyzer")
    ) {
      mappedUnc = "listrik_medis";
    } else if (
      norm.includes("waktu") ||
      norm.includes("timer") ||
      norm.includes("stopwatch") ||
      norm.includes("frekuensi")
    ) {
      mappedUnc = "waktu_frekuensi";
    } else if (norm.includes("putar") || norm.includes("rpm") || norm.includes("centrifuge")) {
      mappedUnc = "kecepatan_putar";
    } else if (norm.includes("cahaya") || norm.includes("lux") || norm.includes("bilirubin")) {
      mappedUnc = "cahaya_fotometri";
    } else if (norm.includes("suara") || norm.includes("sound") || norm.includes("audiometer")) {
      mappedUnc = "akustik_suara";
    } else if (norm.includes("panjang") || norm.includes("caliper") || norm.includes("mikrometer")) {
      mappedUnc = "dimensi_panjang";
    }

    setIdentityData((prev) => ({
      ...prev,
      deviceName: getDeviceNameFromMethodTitle(method.title || ""),
      methodId: methodId,
      uncMethod: mappedUnc,
    }));

    // Auto-initialize measurements if empty
    if (measurements.length === 0 && method.parameters) {
      const newMeasurements: any[] = [];
      method.parameters.forEach((p: any) => {
        const points = Array.isArray(p.points) ? p.points : [];
        points.forEach((pt: number) => {
          newMeasurements.push({
            parameterName: p.name,
            unit: p.unit,
            point: pt,
            actual: pt,
            resolution: 0.01,
            masterUnc: 0.001,
            drift: 0,
            deviation: 0,
            uncertainty: calculateUncertainty(0.01, 0.001, 0),
            tolerance: p.tolerance,
          });
        });
      });
      setMeasurements(newMeasurements);
    }

    // Auto-initialize checks from MK if available
    if (method.physicalChecks && method.physicalChecks.length > 0) {
      const pData: any = {};
      method.physicalChecks.forEach((item: string) => (pData[item] = "Baik"));
      setPhysicalData(pData);
    }
    if (method.functionalChecks && method.functionalChecks.length > 0) {
      const fData: any = {};
      method.functionalChecks.forEach((item: string) => (fData[item] = "Baik"));
      setFunctionalData(fData);
    }
  };

  const calculateUncertainty = (
    resolution: number = 0.01,
    masterUnc: number = 0.001,
    drift: number = 0,
    m: any = {},
  ) => {
    const category = identityData.uncMethod || "standard";
    const breakdown = calculateInstrumentUncertainty(
      category,
      resolution,
      masterUnc,
      drift,
      { ...m, cmcValue: cmcValue },
    );
    return breakdown.reportedUncertainty || breakdown.uExpanded;
  };

  const calculateUncertaintyFull = (
    resolution: number = 0.01,
    masterUnc: number = 0.001,
    drift: number = 0,
    m: any = {},
  ) => {
    const category = identityData.uncMethod || "standard";
    const breakdown = calculateInstrumentUncertainty(
      category,
      resolution,
      masterUnc,
      drift,
      { ...m, cmcValue: cmcValue },
    );
    return {
      uncertainty: breakdown.reportedUncertainty || breakdown.uExpanded,
      uCombined: breakdown.uCombined,
      uExpanded: breakdown.uExpanded,
    };
  };

  const autoFillFromCalibrator = (
    newM: any[],
    idx: number,
    pt?: number,
    paramName?: string
  ) => {
    const row = newM[idx];
    const targetPt = pt !== undefined ? pt : row.point;
    const targetName = paramName !== undefined ? paramName : row.parameterName;
    
    if (!selectedCalibratorParams || selectedCalibratorParams.length === 0) return;
    
    // First try to match by parameterName
    let candidates = selectedCalibratorParams;
    if (targetName) {
      const lowerName = targetName.toLowerCase().trim();
      candidates = selectedCalibratorParams.filter(p => 
        p.parameterName && p.parameterName.toLowerCase().trim() === lowerName
      );
      if (candidates.length === 0) {
        // Fallback to substring matching
        candidates = selectedCalibratorParams.filter(p => 
          p.parameterName && (
            p.parameterName.toLowerCase().includes(lowerName) ||
            lowerName.includes(p.parameterName.toLowerCase())
          )
        );
      }
    }
    
    if (candidates.length === 0) {
      candidates = selectedCalibratorParams;
    }
    
    // If we have candidates, find the one with the closest test point
    if (candidates.length > 0) {
      let bestMatch = candidates[0];
      let minDiff = Math.abs((bestMatch.point || 0) - (targetPt || 0));
      
      for (let i = 1; i < candidates.length; i++) {
        const diff = Math.abs((candidates[i].point || 0) - (targetPt || 0));
        if (diff < minDiff) {
          minDiff = diff;
          bestMatch = candidates[i];
        }
      }
      
      // Auto-fill standard values
      if (typeof bestMatch.uncertainty === 'number' && !isNaN(bestMatch.uncertainty)) {
        row.masterUnc = bestMatch.uncertainty;
      }
      if (bestMatch.unit) {
        row.unit = bestMatch.unit;
      }
      
      // Compute deviation and uncertainty based on updated values
      row.deviation = (row.actual !== undefined && row.actual !== null && String(row.actual).trim() !== "") 
        ? Number(row.actual) - (targetPt || 0) 
        : 0;
      row.uncertainty = calculateUncertainty(
        row.resolution || 0.01,
        row.masterUnc || 0.001,
        row.drift || 0,
        row
      );
    }
  };

  const handleAutoFillAllMeasurements = () => {
    if (measurements.length === 0) {
      showToast("Tidak ada baris titik ukur untuk diisi!", "warning");
      return;
    }
    if (!selectedCalibratorParams || selectedCalibratorParams.length === 0) {
      showToast("Silakan pilih minimal satu Kalibrator Master terlebih dahulu!", "warning");
      return;
    }
    const newM = [...measurements];
    let filledCount = 0;
    for (let i = 0; i < newM.length; i++) {
      const row = { ...newM[i] };
      // Try to find match
      let candidates = selectedCalibratorParams;
      if (row.parameterName) {
        const lowerName = row.parameterName.toLowerCase().trim();
        candidates = selectedCalibratorParams.filter(p => 
          p.parameterName && p.parameterName.toLowerCase().trim() === lowerName
        );
        if (candidates.length === 0) {
          candidates = selectedCalibratorParams.filter(p => 
            p.parameterName && (
              p.parameterName.toLowerCase().includes(lowerName) ||
              lowerName.includes(p.parameterName.toLowerCase())
            )
          );
        }
      }
      if (candidates.length > 0) {
        let bestMatch = candidates[0];
        let minDiff = Math.abs((bestMatch.point || 0) - (row.point || 0));
        for (let j = 1; j < candidates.length; j++) {
          const diff = Math.abs((candidates[j].point || 0) - (row.point || 0));
          if (diff < minDiff) {
            minDiff = diff;
            bestMatch = candidates[j];
          }
        }
        if (typeof bestMatch.uncertainty === 'number' && !isNaN(bestMatch.uncertainty)) {
          row.masterUnc = bestMatch.uncertainty;
        }
        if (bestMatch.unit) {
          row.unit = bestMatch.unit;
        }
        row.deviation = (row.actual !== undefined && row.actual !== null && String(row.actual).trim() !== "")
          ? Number(row.actual) - (row.point || 0)
          : 0;
        row.uncertainty = calculateUncertainty(
          row.resolution || 0.01,
          row.masterUnc || 0.001,
          row.drift || 0,
          row
        );
        newM[i] = row;
        filledCount++;
      }
    }
    setMeasurements(newM);
    showToast(`Berhasil auto-fill! ${filledCount} baris data ukur disinkronkan ke spesifikasi Kalibrator Master.`, "success");
  };

  const handleTableKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    cellKey: string
  ) => {
    const keys = [
      'parameterName',
      'point',
      'unit',
      'resolution',
      'masterUnc',
      'drift',
      'simUnc',
      'sd',
      'actual',
      'tolerance'
    ];

    // Filter out keys that don't have active elements in this row
    const visibleKeys = keys.filter(key => {
      return document.getElementById(`input-${key}-${rowIndex}`) !== null;
    });

    const currentKeyIndex = visibleKeys.indexOf(cellKey);

    if (e.key === 'Enter') {
      e.preventDefault();
      // Auto save changes
      handleSave(false);
      // Move down after saving to conform to spreadsheet flow
      const targetRowIndex = rowIndex + 1;
      if (targetRowIndex < measurements.length) {
        const targetId = `input-${cellKey}-${targetRowIndex}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          (targetElement as HTMLInputElement).focus();
          (targetElement as HTMLInputElement).select();
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const targetRowIndex = rowIndex + 1;
      if (targetRowIndex < measurements.length) {
        const targetId = `input-${cellKey}-${targetRowIndex}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          (targetElement as HTMLInputElement).focus();
          (targetElement as HTMLInputElement).select();
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const targetRowIndex = rowIndex - 1;
      if (targetRowIndex >= 0) {
        const targetId = `input-${cellKey}-${targetRowIndex}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          (targetElement as HTMLInputElement).focus();
          (targetElement as HTMLInputElement).select();
        }
      }
    } else if (e.key === 'ArrowRight') {
      // Move horizontally right
      const targetKeyIndex = currentKeyIndex + 1;
      if (targetKeyIndex < visibleKeys.length) {
        e.preventDefault();
        const nextKey = visibleKeys[targetKeyIndex];
        const targetId = `input-${nextKey}-${rowIndex}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          (targetElement as HTMLInputElement).focus();
          (targetElement as HTMLInputElement).select();
        }
      } else {
        // Wrap to the next row's first cell
        const targetRowIndex = rowIndex + 1;
        if (targetRowIndex < measurements.length) {
          e.preventDefault();
          const targetId = `input-${visibleKeys[0]}-${targetRowIndex}`;
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            (targetElement as HTMLInputElement).focus();
            (targetElement as HTMLInputElement).select();
          }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const targetKeyIndex = currentKeyIndex - 1;
      if (targetKeyIndex >= 0) {
        e.preventDefault();
        const prevKey = visibleKeys[targetKeyIndex];
        const targetId = `input-${prevKey}-${rowIndex}`;
        const targetElement = document.getElementById(targetId);
        if (targetElement) {
          (targetElement as HTMLInputElement).focus();
          (targetElement as HTMLInputElement).select();
        }
      } else {
        // Wrap to the previous row's last visible cell
        const targetRowIndex = rowIndex - 1;
        if (targetRowIndex >= 0) {
          e.preventDefault();
          const lastKey = visibleKeys[visibleKeys.length - 1];
          const targetId = `input-${lastKey}-${targetRowIndex}`;
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            (targetElement as HTMLInputElement).focus();
            (targetElement as HTMLInputElement).select();
          }
        }
      }
    }
  };

  const handleDownloadCSV = () => {
    if (measurements.length === 0) {
      showToast("Tidak ada data tabel untuk diunduh ke CSV.", "warning");
      return;
    }

    const headers = [
      "No",
      "Parameter",
      "Titik Ukur",
      "Unit",
      "Resolusi (u1)",
      "Ketidakpastian Master (u2)",
      "Drift (u4)",
      "Nilai Terukur",
      "Penyimpangan",
      "Toleransi MPE",
      "U95 (k=2)",
      "CMC Lab",
      "TUR/TAR"
    ];

    const rows = measurements.map((m: any, idx: number) => {
      return [
        idx + 1,
        `"${m.parameterName || ''}"`,
        m.point !== undefined ? m.point : "",
        `"${m.unit || ''}"`,
        m.resolution !== undefined ? m.resolution : "",
        m.masterUnc !== undefined ? m.masterUnc : "",
        m.drift !== undefined ? m.drift : "",
        m.actual !== undefined ? m.actual : "",
        m.deviation !== undefined ? m.deviation.toFixed(4) : "",
        m.tolerance !== undefined ? m.tolerance : "",
        m.uncertainty !== undefined ? (typeof m.uncertainty === 'number' ? m.uncertainty.toFixed(4) : m.uncertainty) : "",
        m.cmc !== undefined ? m.cmc : "",
        m.tur !== undefined ? m.tur : ""
      ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Data_Ukur_LK_${id || 'Baru'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Tabel data ukur berhasil diunduh ke format CSV!", "success");
  };

  const handleAutoSimulatePassed = () => {
    if (measurements.length === 0) {
      showToast("Tidak ada baris titik ukur untuk disimulasikan!", "warning");
      return;
    }
    const newM = measurements.map((m) => {
      const tol = Number(m.tolerance) || (m.point === 0 ? 0.2 : Math.abs(m.point) * 0.01) || 1.0;
      // Generate safe actual under MPE
      const randomFactor = (Math.random() * 1.6 - 0.8) * 0.45; // safe range (under 36% of MPE)
      const customDeviation = Number((tol * randomFactor).toFixed(4));
      const actual = Number((m.point + customDeviation).toFixed(4));
      
      const updated = {
        ...m,
        actual: actual,
        deviation: customDeviation,
      };
      updated.uncertainty = calculateUncertainty(
        updated.resolution || 0.01,
        updated.masterUnc || 0.001,
        updated.drift || 0,
        updated
      );
      return updated;
    });
    setMeasurements(newM);
    showToast("Berhasil mensimulasikan data ukur optimal (Lolos MPE secara otomatis)!", "success");
  };

  const handleAutoSimulateFailed = () => {
    if (measurements.length === 0) {
      showToast("Tidak ada baris titik ukur untuk disimulasikan!", "warning");
      return;
    }
    const newM = measurements.map((m, idx) => {
      const tol = Number(m.tolerance) || (m.point === 0 ? 0.2 : Math.abs(m.point) * 0.01) || 1.0;
      // Every 3rd row, exceed tolerance on purpose to test real-time validation highlights
      const exceed = idx % 3 === 1;
      const randomFactor = exceed 
        ? (Math.random() > 0.5 ? 1.25 : -1.25) * (1 + Math.random() * 0.2) // Exceed tolerance (125%+ MPE)
        : (Math.random() * 1.6 - 0.8) * 0.45; // Inside tolerance
         
      const customDeviation = Number((tol * randomFactor).toFixed(4));
      const actual = Number((m.point + customDeviation).toFixed(4));
      
      const updated = {
        ...m,
        actual: actual,
        deviation: customDeviation,
      };
      updated.uncertainty = calculateUncertainty(
        updated.resolution || 0.01,
        updated.masterUnc || 0.001,
        updated.drift || 0,
        updated
      );
      return updated;
    });
    setMeasurements(newM);
    showToast("Simulasi data ukur dengan penyimpangan MPE kritis berhasil termuat!", "warning");
  };

  const handleAutoZeroDeviations = () => {
    if (measurements.length === 0) return;
    const newM = measurements.map((m) => {
      const updated = {
        ...m,
        actual: m.point,
        deviation: 0,
      };
      updated.uncertainty = calculateUncertainty(
        updated.resolution || 0.01,
        updated.masterUnc || 0.001,
        updated.drift || 0,
        updated
      );
      return updated;
    });
    setMeasurements(newM);
    showToast("Seluruh penyimpangan diatur ulang ke nol (Presisi Sempurna)!", "success");
  };

  const handleAutoGenerateSequence = (name: string, start: number, end: number, steps: number, unit: string) => {
    if (steps <= 0) return;
    const stepValue = steps === 1 ? 0 : (end - start) / (steps - 1);
    const newPoints: any[] = [];
    for (let i = 0; i < steps; i++) {
      const pt = Number((start + i * stepValue).toFixed(4));
      newPoints.push({
        parameterName: name || `Titik ${i + 1}`,
        point: pt,
        actual: pt,
        deviation: 0,
        unit: unit || "V",
        resolution: Number(bulkRes) || 0.01,
        masterUnc: Number(bulkMUnc) || 0.001,
        drift: Number(bulkDrift) || 0,
        uncertainty: calculateUncertainty(Number(bulkRes) || 0.01, Number(bulkMUnc) || 0.001, Number(bulkDrift) || 0),
        tolerance: bulkTol !== "" ? Number(bulkTol) : undefined,
      });
    }
    setMeasurements(newPoints);
    showToast(`Berhasil men-generate ${steps} titik ukur otomatis!`, "success");
  };

  // Real-time automatic recalculation of U95 when measurements array or its parameters change
  useEffect(() => {
    let hasUpdated = false;
    const updated = measurements.map((m) => {
      const res = m.resolution !== undefined ? m.resolution : 0.01;
      const mUnc = m.masterUnc !== undefined ? m.masterUnc : 0.001;
      const dft = m.drift !== undefined ? m.drift : 0;
      const calcResult = calculateUncertaintyFull(res, mUnc, dft, m);

      const isUncDiff = Math.abs((m.uncertainty || 0) - calcResult.uncertainty) > 1e-9;
      const isCombDiff = Math.abs((m.uCombined || 0) - calcResult.uCombined) > 1e-9;
      const isExpDiff = Math.abs((m.uExpanded || 0) - calcResult.uExpanded) > 1e-9;

      if (isUncDiff || isCombDiff || isExpDiff) {
        hasUpdated = true;
        return {
          ...m,
          uncertainty: calcResult.uncertainty,
          uCombined: calcResult.uCombined,
          uExpanded: calcResult.uExpanded,
        };
      }
      return m;
    });

    if (hasUpdated) {
      setMeasurements(updated);
    }
  }, [measurements, identityData.uncMethod, cmcValue]);

  const getStatusModule = () => {
    // 1. Physical & Functional (10%)
    const physicalFail = Object.values(physicalData).some((v) => v === "Rusak");
    const functionalFail = Object.values(functionalData).some(
      (v) => v === "Rusak",
    );
    const inspectionsPass = !physicalFail && !functionalFail;

    // 2. Electrical (40%)
    let electricalPass = true;
    if (electricalData.enabled) {
      const results = electricalData.results || {};
      const standard = results.standard || "IEC 62353";
      const classType = results.classType || "Class I";
      const appliedPart = results.appliedPart || "Type BF";
      const leakageMethod = results.leakageMethod || "Direct";

      // Mains Voltage (220V ± 10% -> 198V to 242V)
      const mainsVoltageVal = parseFloat(results.mainsVoltage);
      const isMainsVoltagePass =
        !isNaN(mainsVoltageVal) &&
        mainsVoltageVal >= 198 &&
        mainsVoltageVal <= 242;
      if (!isMainsVoltagePass) {
        electricalPass = false;
      }

      if (standard === "IEC 62353") {
        // Tahanan Pembumian (Protective Earth) - Class I only
        if (classType === "Class I") {
          const earthResVal = parseFloat(results.earthRes);
          if (!isNaN(earthResVal) && earthResVal > 0.3) {
            electricalPass = false;
          }
        }

        // Tahanan Isolasi (Insulation)
        const insulationVal = parseFloat(results.insulation);
        if (!isNaN(insulationVal)) {
          const minLimit = classType === "Class II" ? 7.0 : 2.0;
          if (insulationVal < minLimit) {
            electricalPass = false;
          }
        }

        // Arus Bocor Peralatan (Equipment Leakage)
        const equipLeakageVal = parseFloat(results.equipmentLeakage);
        if (!isNaN(equipLeakageVal)) {
          const maxLimit = classType === "Class II" ? 100 : 500;
          if (equipLeakageVal > maxLimit) {
            electricalPass = false;
          }
        }

        // Arus Bocor Bagian Pasien / Applied Part Leakage (if BF or CF)
        if (appliedPart !== "None") {
          const applLeakageVal = parseFloat(results.appliedPartLeakage);
          if (!isNaN(applLeakageVal)) {
            let maxLimit = 1000;
            if (appliedPart === "Type CF") {
              maxLimit = leakageMethod === "Alternative" ? 100 : 50;
            } else {
              maxLimit = leakageMethod === "Alternative" ? 5000 : 1000;
            }
            if (applLeakageVal > maxLimit) {
              electricalPass = false;
            }
          }
        }
      } else {
        // Legacy or IEC 60601-1 safety limits
        const earthResVal = parseFloat(results.earthRes);
        if (!isNaN(earthResVal) && earthResVal > 0.2) electricalPass = false;

        const insulationVal = parseFloat(results.insulation);
        if (!isNaN(insulationVal) && insulationVal < 2.0)
          electricalPass = false;

        const earthLeakageVal = parseFloat(results.earthLeakage);
        if (!isNaN(earthLeakageVal) && earthLeakageVal > 500)
          electricalPass = false;

        const chassisLeakageVal = parseFloat(results.chassisLeakage);
        if (!isNaN(chassisLeakageVal) && chassisLeakageVal > 100)
          electricalPass = false;

        const patientLeakageVal = parseFloat(results.patientLeakage);
        if (!isNaN(patientLeakageVal)) {
          const maxLimit = appliedPart === "Type CF" ? 10 : 100;
          if (patientLeakageVal > maxLimit) electricalPass = false;
        }

        const leadLeakageVal = parseFloat(results.leadLeakage);
        if (!isNaN(leadLeakageVal)) {
          const maxLimit = appliedPart === "Type CF" ? 10 : 100;
          if (leadLeakageVal > maxLimit) electricalPass = false;
        }
      }
    }

    // 3. Measurement (50%)
    const measurementPass = measurements.every((m: any) => {
      const absoluteDev = Math.abs(Number(m.actual) - Number(m.point));
      const tol = Number(m.tolerance) || 999999;
      const unc = m.uncertainty || 0;
      return decisionRule === "strict" 
        ? (absoluteDev + unc) <= tol
        : absoluteDev <= tol;
    });

    const overallPass =
      inspectionsPass &&
      (electricalData.enabled ? electricalPass : true) &&
      measurementPass;

    return {
      inspections: inspectionsPass,
      electrical: electricalData.enabled ? electricalPass : true,
      measurements: measurementPass,
      overall: overallPass,
    };
  };

  const handleSave = async (isSubmitting = false) => {
    if (!id) return;

    // Validate MK selection
    if (!identityData.methodId) {
      showToast(
        "Silakan pilih Nama Alat / Metode Kerja terlebih dahulu untuk melanjutkan proses kalibrasi.",
        "warning"
      );
      setActiveTab("identity");
      return;
    }

    setSaving(true);
    try {
      const selectedMethod = availableMethods.find(
        (m) => m.id === identityData.methodId,
      );

      // Calculate uncertainty and deviation for each point
      const processedMeasurements = measurements.map((m: any) => {
        const actual = Number(m.actual) || 0;
        const ref = Number(m.point) || 0;
        const res = Number(m.resolution) || 0.01;
        const mUnc = Number(m.masterUnc) || 0.001;
        const drift = Number(m.drift) || 0;

        const deviation = actual - ref;
        const calcRes = calculateUncertaintyFull(res, mUnc, drift, m);
        const uncertainty = calcRes.uncertainty;

        const absoluteDev = Math.abs(deviation);
        const tol = Number(m.tolerance) || 999;
        const isPass = decisionRule === "strict" 
          ? (absoluteDev + uncertainty) <= tol 
          : absoluteDev <= tol;

        return {
          ...m,
          deviation,
          uncertainty,
          uCombined: calcRes.uCombined,
          uExpanded: calcRes.uExpanded,
          isPass,
        };
      });

      const status = getStatusModule();

      const updateData: any = {
        ...identityData,
        methodName: translateToIndonesian(selectedMethod?.title || ""),
        inspections: {
          physical: physicalData,
          functional: functionalData,
          electrical: electricalData,
        },
        measurements: processedMeasurements,
        calibratorIds: selectedCalibratorIds,
        decisionRule,
        cmcValue,
        driftJustification: justificationText,
        updatedAt: serverTimestamp(),
        isPass: status.overall,
        scores: {
          inspections: status.inspections ? 10 : 0,
          electrical: status.electrical ? 40 : 0,
          measurements: status.measurements ? 50 : 0,
          total:
            (status.inspections ? 10 : 0) +
            (status.electrical ? 40 : 0) +
            (status.measurements ? 50 : 0),
        },
      };

      if (isSubmitting) {
        updateData.status = "completed";
        updateData.issuedAt = serverTimestamp();
      }

      await updateDoc(doc(db, "worksheets", id), updateData);

      try {
        localStorage.removeItem(`worksheet_autosave_${id}`);
        setDraftData(null);
        setShowDraftBanner(false);
      } catch (err) {
        console.error("Gagal membersihkan draf autosave setelah menyimpan:", err);
      }

      if (isSubmitting) {
        await logAction(
          `Menyelesaikan Lembar Kerja: ${identityData.deviceName}`,
          "worksheets",
          `Sertifikat otomatis siap diterbitkan untuk ${identityData.deviceName}. ID LK: ${id}`,
          "info",
        );
        await pushNotification(
          "Kalibrasi Selesai",
          `Sesi kalibrasi untuk ${identityData.deviceName} (S/N: ${identityData.serialNumber}) telah diselesaikan.`,
          "success",
          "all",
          `/worksheets/${id}/edit`,
        );
        setShowPreview(true);
      } else {
        await logAction(
          `Menyimpan Lembar Kerja: ${identityData.deviceName}`,
          "worksheets",
          `Draf lembar kerja berhasil diperbarui. ID LK: ${id}`,
          "info",
        );
        navigate("/worksheets");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "worksheets");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteDoc(doc(db, "worksheets", id));
      try {
        localStorage.removeItem(`worksheet_autosave_${id}`);
        setDraftData(null);
        setShowDraftBanner(false);
      } catch (e) {
        console.error(e);
      }
      navigate("/worksheets");
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `worksheets/${id}`);
    }
  };

  const initMeasurementsFromMethod = () => {
    const method = availableMethods.find((m) => m.id === identityData.methodId);
    if (!method || !method.parameters) return;

    const newMeasurements: any[] = [];
    method.parameters.forEach((p: any) => {
      const points = Array.isArray(p.points) ? p.points : [];
      points.forEach((pt: number) => {
        newMeasurements.push({
          parameterName: p.name,
          unit: p.unit,
          point: pt,
          actual: pt,
          resolution: 0.01,
          masterUnc: 0.001,
          drift: 0,
          deviation: 0,
          uncertainty: calculateUncertainty(0.01, 0.001, 0, {}),
          tolerance: p.tolerance,
        });
      });
    });
    setMeasurements(newMeasurements);
  };

  const calculateInterpolationValue = (
    x1Str: string,
    y1Str: string,
    x2Str: string,
    y2Str: string,
    xStr: string,
  ) => {
    const x1 = parseFloat(x1Str);
    const y1 = parseFloat(y1Str);
    const x2 = parseFloat(x2Str);
    const y2 = parseFloat(y2Str);
    const x = parseFloat(xStr);

    if (!isNaN(x1) && !isNaN(y1) && !isNaN(x2) && !isNaN(y2) && !isNaN(x)) {
      if (x2 - x1 === 0) {
        setInterpResult(null);
        setInterpWarning(
          "Kesalahan: Titik x1 dan x2 tidak boleh sama (pembagian nol).",
        );
        return;
      }
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      if (x < minX || x > maxX) {
        setInterpWarning(
          `Notifikasi: Titik target x (${x}) berada di luar rentang [${minX}, ${maxX}] (ekstrapolasi)!`,
        );
      } else {
        setInterpWarning("");
      }
      const result = y1 + ((x - x1) * (y2 - y1)) / (x2 - x1);
      setInterpResult(result);
    } else {
      setInterpResult(null);
      setInterpWarning("");
    }
  };

  const handleAutoInterpolateFromSelected = (
    targetXStr: string,
    forceParamName?: string,
    forceType?: "correction" | "uncertainty",
  ) => {
    const xVal = parseFloat(targetXStr);
    const paramName = forceParamName || selectedInterpParam;
    const type = forceType || interpValueType;

    if (isNaN(xVal) || !paramName) return;

    const matchedPoints = selectedCalibratorParams
      .filter(
        (p) =>
          p.parameterName === paramName &&
          typeof p.point === "number" &&
          !isNaN(p.point),
      )
      .map((p) => ({
        x: p.point,
        y:
          type === "correction"
            ? Number(p.correction) || 0
            : Number(p.uncertainty) || 0,
      }))
      .sort((a, b) => a.x - b.x);

    if (matchedPoints.length === 0) {
      setInterpResult(null);
      setInterpWarning(
        "Notifikasi: Tidak ada data titik acuan kalibrator untuk parameter terpilih ini.",
      );
      return;
    }

    if (matchedPoints.length === 1) {
      setInterpX1(matchedPoints[0].x.toString());
      setInterpY1(matchedPoints[0].y.toString());
      setInterpX2("");
      setInterpY2("");
      setInterpResult(matchedPoints[0].y);
      setInterpWarning(
        "Notifikasi: Jumlah data titik acuan kalibrator tidak mencukupi untuk interpolasi (hanya 1 titik). Menggunakan nilai langsung.",
      );
      return;
    }

    let p1 = matchedPoints[0];
    let p2 = matchedPoints[1];

    // Range checks
    const minX = matchedPoints[0].x;
    const maxX = matchedPoints[matchedPoints.length - 1].x;
    if (xVal < minX || xVal > maxX) {
      setInterpWarning(
        `Notifikasi: Titik target x (${xVal}) berada di luar rentang kalibrator [${minX}, ${maxX}] (ekstrapolasi)!`,
      );
    } else {
      setInterpWarning("");
    }

    if (xVal <= matchedPoints[0].x) {
      p1 = matchedPoints[0];
      p2 = matchedPoints[1];
    } else if (xVal >= matchedPoints[matchedPoints.length - 1].x) {
      p1 = matchedPoints[matchedPoints.length - 2];
      p2 = matchedPoints[matchedPoints.length - 1];
    } else {
      for (let i = 0; i < matchedPoints.length - 1; i++) {
        if (xVal >= matchedPoints[i].x && xVal <= matchedPoints[i + 1].x) {
          p1 = matchedPoints[i];
          p2 = matchedPoints[i + 1];
          break;
        }
      }
    }

    setInterpX1(p1.x.toString());
    setInterpY1(p1.y.toString());
    setInterpX2(p2.x.toString());
    setInterpY2(p2.y.toString());

    const denominator = p2.x - p1.x;
    if (denominator !== 0) {
      const result = p1.y + ((xVal - p1.x) * (p2.y - p1.y)) / denominator;
      setInterpResult(result);
    } else {
      setInterpResult(p1.y);
    }
  };

  const autoInterpolateAllRows = (
    fieldToFill: "masterUnc" | "drift" | "actual",
    paramName: string,
    valueType: "correction" | "uncertainty",
  ) => {
    if (!paramName) return;

    const matchedPoints = selectedCalibratorParams
      .filter(
        (p) =>
          p.parameterName === paramName &&
          typeof p.point === "number" &&
          !isNaN(p.point),
      )
      .map((p) => ({
        x: p.point,
        y:
          valueType === "correction"
            ? Number(p.correction) || 0
            : Number(p.uncertainty) || 0,
      }))
      .sort((a, b) => a.x - b.x);

    if (matchedPoints.length === 0) return;

    const newM = measurements.map((m) => {
      const xVal = Number(m.point);
      if (isNaN(xVal)) return m;

      let interpolatedY = 0;

      if (matchedPoints.length === 1) {
        interpolatedY = matchedPoints[0].y;
      } else {
        let p1 = matchedPoints[0];
        let p2 = matchedPoints[1];

        if (xVal <= matchedPoints[0].x) {
          p1 = matchedPoints[0];
          p2 = matchedPoints[1];
        } else if (xVal >= matchedPoints[matchedPoints.length - 1].x) {
          p1 = matchedPoints[matchedPoints.length - 2];
          p2 = matchedPoints[matchedPoints.length - 1];
        } else {
          for (let i = 0; i < matchedPoints.length - 1; i++) {
            if (xVal >= matchedPoints[i].x && xVal <= matchedPoints[i + 1].x) {
              p1 = matchedPoints[i];
              p2 = matchedPoints[i + 1];
              break;
            }
          }
        }

        const denominator = p2.x - p1.x;
        if (denominator !== 0) {
          interpolatedY = p1.y + ((xVal - p1.x) * (p2.y - p1.y)) / denominator;
        } else {
          interpolatedY = p1.y;
        }
      }

      const updatedRow = { ...m };
      if (fieldToFill === "masterUnc") {
        updatedRow.masterUnc = interpolatedY;
      } else if (fieldToFill === "drift") {
        updatedRow.drift = interpolatedY;
      } else if (fieldToFill === "actual") {
        updatedRow.actual = interpolatedY;
        updatedRow.deviation = interpolatedY - (m.point || 0);
      }

      updatedRow.uncertainty = calculateUncertainty(
        m.resolution || 0.01,
        updatedRow.masterUnc || 0.001,
        updatedRow.drift || 0,
        updatedRow,
      );
      return updatedRow;
    });

    setMeasurements(newM);
  };

  const applyInterpolationToRow = () => {
    if (
      interpResult === null ||
      interpTargetRow < 0 ||
      interpTargetRow >= measurements.length
    )
      return;
    const newM = [...measurements];
    const target = newM[interpTargetRow];

    if (interpTargetField === "masterUnc") {
      target.masterUnc = interpResult;
    } else if (interpTargetField === "drift") {
      target.drift = interpResult;
    } else if (interpTargetField === "actual") {
      target.actual = interpResult;
      target.deviation = interpResult - (target.point || 0);
    }

    target.uncertainty = calculateUncertainty(
      target.resolution || 0.01,
      target.masterUnc || 0.001,
      target.drift || 0,
      target,
    );
    setMeasurements(newM);
  };

  const handleAIAnalysis = async () => {
    setAiAnalyzing(true);
    try {
      const result = await analyzeWorksheet({
        physical: physicalData,
        functional: functionalData,
        electrical: electricalData,
        measurements,
      });

      setAiResults(result);
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
      </div>
    );

  const handleTabChange = (tab: any) => {
    if (tab !== "identity" && !identityData.methodId) {
      showToast(
        "Silakan pilih Nama Alat / Metode Kerja terlebih dahulu untuk mengakses bagian ini.",
        "warning"
      );
      return;
    }
    setActiveTab(tab);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 relative">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border w-full max-w-sm backdrop-blur-md",
              toast.type === "success" && "bg-emerald-500/90 border-emerald-450 text-white shadow-emerald-500/10",
              toast.type === "error" && "bg-rose-500/90 border-rose-450 text-white shadow-rose-500/10",
              toast.type === "warning" && "bg-amber-500/90 border-amber-450 text-white shadow-amber-500/10",
              toast.type === "info" && "bg-blue-600/90 border-blue-500 text-white shadow-blue-500/10"
            )}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 shrink-0" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 shrink-0" />}
            {toast.type === "warning" && <AlertTriangle className="w-5 h-5 shrink-0" />}
            {toast.type === "info" && <Info className="w-5 h-5 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-wider font-mono">
                {toast.type}
              </p>
              <p className="text-xs font-medium mt-0.5 leading-snug">
                {toast.message}
              </p>
            </div>
            <button onClick={() => setToast(null)} className="shrink-0 p-1 hover:bg-white/15 rounded-lg transition-all text-white/80" title="Tutup" aria-label="Tutup">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPreview && (
          <CertificatePreview
            isOpen={showPreview}
            onClose={() => setShowPreview(false)}
            data={{
              id: id || "",
              ...lk,
              ...identityData,
              inspections: {
                physical: physicalData,
                functional: functionalData,
                electrical: electricalData,
              },
              measurements,
              createdAt: lk?.createdAt,
            }}
          />
        )}

        {showLabelModal && (
          <LKLabelModal
            lk={{
              id: id || "",
              ...lk,
              ...identityData,
            }}
            onClose={() => setShowLabelModal(false)}
          />
        )}

        {showFormulaModal &&
          (() => {
            const uncMethod = identityData.uncMethod || "standard";
            const info =
              FORMULA_INFO_MAP[uncMethod] || FORMULA_INFO_MAP["standard"];
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowFormulaModal(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col"
                >
                  {/* Header */}
                  <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Info className="w-5 h-5 opacity-90" />
                      <h3 className="font-extrabold tracking-tight uppercase text-sm font-mono">
                        Informasi Rumus Ketidakpastian
                      </h3>
                    </div>
                    <button
                      onClick={() => setShowFormulaModal(false)}
                      className="p-1.5 hover:bg-white/10 rounded-xl transition-all"
                      title="Tutup"
                      aria-label="Tutup"
                    >
                      <X className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 text-slate-700 dark:text-slate-300">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 font-mono uppercase tracking-wider">
                        Kategori Metode Terpilih
                      </label>
                      <h4 className="text-lg font-black text-slate-900 dark:text-white leading-none uppercase">
                        {info.title}
                      </h4>
                    </div>

                    {/* Math Formula Card */}
                    <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col items-center justify-center gap-3">
                      <span className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-widest">
                        Persamaan Bentangan (U95)
                      </span>
                      <div className="text-center font-mono text-sm font-bold text-indigo-600 dark:text-blue-400 selection:bg-indigo-100 px-4 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl w-full select-all overflow-x-auto">
                        {info.equation}
                      </div>
                    </div>

                    {/* Component Breakdown list */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-black text-slate-400 font-mono uppercase tracking-widest block font-mono">
                        Metode Pengisian Komponen (ISO GUM)
                      </span>
                      <div className="space-y-3 overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                        {info.components.map((comp, cIdx) => (
                          <div
                            key={cIdx}
                            className="p-4 bg-slate-50/55 dark:bg-slate-950/20 border-b last:border-0 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                          >
                            <div className="space-y-1 sm:max-w-xs text-left">
                              <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                {comp.term}
                              </span>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                {comp.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium italic">
                                {comp.desc}
                              </p>
                            </div>
                            <div className="flex flex-col sm:items-end gap-1 font-mono text-right">
                              <span className="bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider border border-blue-100 dark:border-blue-900/40">
                                {comp.distribution}
                              </span>
                              <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-1">
                                Rumus: {comp.formula}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer notes */}
                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider text-center">
                    💡 {info.notes}
                  </div>
                </motion.div>
              </div>
            );
          })()}
      </AnimatePresence>

      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-5 border-b border-slate-200/50 dark:border-slate-800/55">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/worksheets")}
            className="p-3 bg-white/60 dark:bg-[#070b18]/60 border border-slate-250 dark:border-slate-800/80 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm hover:border-blue-500 cursor-pointer"
            title="Kembali ke Lembar Kerja"
            aria-label="Kembali ke Lembar Kerja"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-405" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]" />
              <span className="text-[10px] font-black tracking-[0.2em] text-emerald-600 dark:text-emerald-450 uppercase font-mono">
                Live Precision Protocol
              </span>
            </div>
            <h1 className="text-3xl font-black text-slate-950 dark:text-white tracking-tighter uppercase leading-none italic font-sans">
              Lembar{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-white dark:to-cyan-200 font-black">Kerja Digital</span>
            </h1>
            <div className="flex items-center gap-3 mt-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono uppercase">
              <span className="bg-slate-100/80 dark:bg-[#0b132b]/80 border border-slate-200/50 dark:border-slate-800/50 px-2.5 py-0.5 rounded-lg text-slate-650 dark:text-slate-400 tracking-wider">
                ID: LK-{id?.slice(0, 8).toUpperCase()}
              </span>
              <span className="text-blue-600 dark:text-cyan-550">/</span>
              <span className="italic tracking-widest text-[#b38728] dark:text-amber-500">
                {lk?.deviceName || "Inisialisasi..."}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {(isAdmin ||
            (user?.uid === lk?.technicianId &&
              (lk?.status === "draft" || lk?.status === "revision"))) && (
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {confirmDelete ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-2 bg-red-50 p-1.5 rounded-2xl border border-red-100"
                  >
                    <button
                      onClick={handleDelete}
                      className="px-5 py-2.5 bg-red-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-500/20"
                    >
                      Hapus Permanen
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="p-2 text-slate-400 hover:text-slate-600"
                      title="Batal Hapus"
                      aria-label="Batal Hapus"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </motion.div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="p-3.5 bg-white border border-slate-200 rounded-2xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shadow-sm"
                    title="Hapus Lembar Kerja"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </AnimatePresence>
            </div>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 font-black text-[9px] rounded-xl uppercase tracking-widest hover:bg-white dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Simpan
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-5 py-2.5 bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 font-black text-[9px] rounded-xl uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-700 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all shadow-sm flex items-center gap-2"
          >
            <Eye className="w-3.5 h-3.5" />
            Preview
          </button>
          <button
            onClick={exportWorksheetToPDF}
            className="px-5 py-2.5 bg-indigo-50/80 dark:bg-indigo-950/25 backdrop-blur border border-indigo-200 dark:border-indigo-500/30 text-indigo-700 dark:text-indigo-400 font-black text-[9px] rounded-xl uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-950/40 hover:shadow-md hover:shadow-indigo-500/10 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Cetak PDF
          </button>
          <button
            onClick={() => setShowLabelModal(true)}
            className="px-5 py-2.5 bg-emerald-50/80 dark:bg-emerald-950/25 backdrop-blur border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-black text-[9px] rounded-xl uppercase tracking-widest hover:bg-emerald-100 dark:hover:bg-emerald-950/40 hover:shadow-md hover:shadow-emerald-500/10 transition-all shadow-sm flex items-center gap-2"
          >
            <QrCode className="w-3.5 h-3.5" />
            Label & QR
          </button>
          <button
            onClick={() => handleSave(true)}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-800 text-white font-black text-[9px] rounded-xl uppercase tracking-[0.15em] hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 italic active:scale-[0.98] flex items-center gap-2"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-white/90" />
            Finalize & Kunci
          </button>
        </div>
      </header>

      {showDraftBanner && draftData && (
        <div className="my-6 p-5 rounded-[2rem] bg-gradient-to-r from-amber-500/10 via-amber-600/[0.04] to-orange-500/10 border border-amber-500/20 shadow-[0_10px_25px_rgba(245,158,11,0.05)] flex flex-col md:flex-row md:items-center justify-between gap-5 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <span className="p-3 bg-amber-500/10 text-amber-500 dark:text-amber-400 font-extrabold rounded-2xl text-xl self-start">
              ⚠️
            </span>
            <div>
              <h4 className="text-sm font-black text-slate-950 dark:text-amber-500 uppercase tracking-widest mb-1 font-mono">
                DRAF SIMPAN OTOMATIS TERSEDIA
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Sistem menemukan berkas draf lokal dari simpan otomatis tanggal{" "}
                <span className="font-extrabold text-[#b38728] font-mono">
                  {new Date(draftData.timestamp).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  Pukul{" "}
                  {new Date(draftData.timestamp).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>{" "}
                yang belum disinkronisasi ke server. Apakah Anda ingin memulihkan draf tersebut?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              onClick={handleRestoreDraft}
              className="px-5 py-2.5 bg-[#b38728] hover:bg-[#9a7322] active:scale-95 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              🔄 Pulihkan berkas
            </button>
            <button
              onClick={handleDiscardDraft}
              className="px-5 py-2.5 bg-white/10 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
            >
              Abaikan draf
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation - Scrollable on mobile */}
        <div className="lg:col-span-3">
          <div className="flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2.5 lg:pb-0 custom-scrollbar-hidden snap-x lg:snap-none">
            <div className="min-w-[135px] sm:min-w-[180px] lg:min-w-0 shrink-0 snap-start">
              <NavBtn
                active={activeTab === "identity"}
                onClick={() => handleTabChange("identity")}
                icon={FileText}
                label="IDENTITAS ALAT"
                desc="Data teknis & instansi"
              />
            </div>
            <div className="min-w-[135px] sm:min-w-[180px] lg:min-w-0 shrink-0 snap-start">
              <NavBtn
                active={activeTab === "calibrators_tab"}
                onClick={() => handleTabChange("calibrators_tab")}
                icon={Zap}
                label="MASTER ALAT"
                desc="Kalibrator yang digunakan"
              />
            </div>
            <div className="min-w-[135px] sm:min-w-[180px] lg:min-w-0 shrink-0 snap-start">
              <NavBtn
                active={activeTab === "inspections"}
                onClick={() => handleTabChange("inspections")}
                icon={Stethoscope}
                label="FISIK & FUNGSI"
                desc="Visual & operasional"
              />
            </div>
            <div className="min-w-[135px] sm:min-w-[180px] lg:min-w-0 shrink-0 snap-start">
              <NavBtn
                active={activeTab === "electrical"}
                onClick={() => handleTabChange("electrical")}
                icon={ShieldCheck}
                label="KESELAMATAN LISTRIK"
                desc="Leakage & grounding"
              />
            </div>
            <div className="min-w-[135px] sm:min-w-[180px] lg:min-w-0 shrink-0 snap-start">
              <NavBtn
                active={activeTab === "measurements"}
                onClick={() => handleTabChange("measurements")}
                icon={TableIcon}
                label="DATA PENGUKURAN"
                desc="Metrologi & Kalkulasi"
              />
            </div>
          </div>

          <div className="mt-8 p-8 bg-blue-600 rounded-[2.5rem] border border-blue-500 shadow-2xl shadow-blue-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <BrainCircuit className="w-16 h-16 text-white" />
            </div>
            <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-2 font-mono italic">
              AI Audit Protocol
            </h4>
            <p className="text-[11px] text-blue-100 leading-relaxed mb-6 font-medium">
              Synthetic analysis of measurement anomalies in real-time
              execution.
            </p>

            {aiResults && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-6 p-4 bg-white/10 rounded-2xl border border-white/10 space-y-3"
              >
                <div className="flex items-center gap-2">
                  {aiResults.isPass ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase tracking-widest font-mono",
                      aiResults.isPass ? "text-emerald-400" : "text-red-400",
                    )}
                  >
                    {aiResults.isPass ? "VALIDATED" : "ANOMALY DETECTED"}
                  </span>
                </div>
                <p className="text-[10px] text-white/90 leading-tight font-bold italic">
                  "{aiResults.summary}"
                </p>
                {aiResults.warnings?.length > 0 && (
                  <div className="space-y-1.5">
                    {aiResults.warnings.map((w: string, i: number) => (
                      <p
                        key={i}
                        className="text-[9px] text-red-200/90 italic font-bold flex items-start gap-1"
                      >
                        <span>•</span> {w}
                      </p>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
            <button
              onClick={handleAIAnalysis}
              disabled={aiAnalyzing}
              className="w-full py-4 bg-white rounded-2xl text-[10px] font-black text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-lg active:scale-95"
            >
              {aiAnalyzing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <BrainCircuit className="w-4 h-4" />
              )}
              Sync AI Auditor
            </button>
          </div>

          {/* Human-in-the-Loop Visual Audit Card / Green Seal representation */}
          <div className="mt-4 p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/40 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-20">
              <Award className="w-16 h-16 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h4 className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-[0.3em] mb-2 font-mono italic">
              Visual Audit verification
            </h4>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-medium">
              Verified by Human-in-the-Loop protocol to guarantee calibration
              integrity.
            </p>

            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 rounded-2xl">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest font-mono">
                AUDIT VERIFIED (HITL)
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9 luxury-glass rounded-3xl p-8 min-h-[600px] shadow-xl shadow-slate-200/20 dark:shadow-none relative overflow-auto grid-bg transition-all duration-300">
          <AnimatePresence mode="wait">
            {activeTab === "identity" && (
              <TabContent key="identity">
                <header className="mb-8 select-none">
                  <div className="flex items-center gap-2 mb-2 font-mono text-[9px] uppercase tracking-[0.25em] text-blue-600 dark:text-cyan-400">
                    <Activity className="w-3.5 h-3.5 animate-pulse" />
                    <span>METROLOGY CORE SIGNAL INTERFACE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase flex items-center gap-2">
                    Identitas Alat & Instansi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Lengkapi data teknis alat kesehatan yang sedang dikalibrasi sesuai ISO/IEC 17025.
                  </p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="bg-slate-50/50 dark:bg-[#15223e]/40 border border-slate-200 dark:border-cyan-500/15 rounded-3xl p-6 space-y-4 shadow-sm dark:shadow-[0_0_15px_rgba(6,182,212,0.02)]">
                      <h3 className="text-[10px] font-black text-blue-800 dark:text-cyan-400 uppercase tracking-[0.2em] mb-3 font-mono flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]"></span>
                        Informasi Alat
                      </h3>

                      <div className="space-y-1.5 flex flex-col gap-1">
                        <label htmlFor="identity-deviceId" className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest ml-1 font-mono italic">
                          Pilih dari Inventaris (Opsional)
                        </label>
                        <div className="relative group">
                          <select
                            id="identity-deviceId"
                            title="Pilih dari Inventaris (Opsional)"
                            aria-label="Pilih dari Inventaris (Opsional)"
                            value={identityData.deviceId}
                            onChange={(e) => {
                              const deviceId = e.target.value;
                              const device = availableEquipment.find(
                                (d) => d.id === deviceId,
                              );
                              if (device) {
                                setIdentityData({
                                  ...identityData,
                                  deviceId: deviceId,
                                  brand: device.brand || "",
                                  model: device.model || "",
                                  serialNumber: device.serialNumber || "",
                                });
                                if (device.defaultMethodId) {
                                  loadMethod(device.defaultMethodId);
                                }
                              }
                            }}
                            className="w-full bg-white dark:bg-[#070d19]/60 border border-slate-400 dark:border-cyan-500/25 rounded-xl px-4 py-3 text-xs text-black dark:text-white font-black uppercase tracking-tight focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-cyan-500/10 focus:border-blue-600 dark:focus:border-cyan-450 transition-all appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0e172a] shadow-sm"
                          >
                            <option value="" className="font-bold">
                              -- PILIH DARI INVENTARIS --
                            </option>
                            {availableEquipment.map((d) => (
                              <option
                                key={d.id}
                                value={d.id}
                                className="font-bold text-black"
                              >
                                {d.name} ({d.serialNumber})
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-cyan-400 pointer-events-none" />
                        </div>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold italic ml-1 font-mono uppercase tracking-tight">
                          Pilih aset untuk mengisi data teknis secara otomatis.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="identity-methodId" className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest ml-1 font-mono italic">
                          Pilih Metode Kerja (MK)
                        </label>
                        <div className="relative group">
                          <select
                            id="identity-methodId"
                            title="Pilih Metode Kerja (MK)"
                            aria-label="Pilih Metode Kerja (MK)"
                            value={identityData.methodId}
                            onChange={(e) => loadMethod(e.target.value)}
                            className={cn(
                              "w-full bg-white dark:bg-[#070d19]/60 border rounded-xl px-4 py-3 text-xs text-black dark:text-white font-black focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-cyan-500/10 focus:border-blue-600 dark:focus:border-cyan-450 transition-all appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0e172a] uppercase tracking-wider",
                              !identityData.methodId
                                ? "border-red-400 dark:border-red-500/50"
                                : "border-slate-400 dark:border-cyan-500/25",
                            )}
                          >
                            <option
                              value=""
                              className="bg-white text-slate-900 font-black uppercase tracking-widest"
                            >
                              -- PILIH PROTOKOL --
                            </option>
                            {availableMethods.map((m) => (
                              <option
                                key={m.id}
                                value={m.id}
                                className="bg-white text-black font-bold"
                              >
                                {translateToIndonesian(m.title)}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 dark:text-cyan-400 pointer-events-none" />
                        </div>
                      </div>

                      <div className="space-y-1.5 opacity-100">
                        <label className="text-[10px] font-black text-slate-800 dark:text-slate-400 uppercase tracking-widest ml-1 font-mono italic">
                          Nama Alat Kesehatan (Otomatis)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            readOnly
                            value={identityData.deviceName}
                            placeholder="Pilih MK untuk mengisi nama alat"
                            className="w-full bg-slate-100/70 dark:bg-[#070d19]/35 border border-slate-300 dark:border-cyan-500/10 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-cyan-400 font-black uppercase tracking-tight focus:outline-none cursor-not-allowed font-mono shadow-inner"
                          />
                          {identityData.deviceName && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-[8px] font-mono text-emerald-500 font-extrabold uppercase tracking-widest">SMART LINKED</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            </div>
                          )}
                        </div>
                      </div>
                      <IdentityInput
                        label="Merk / Manufacturing"
                        value={identityData.brand}
                        onChange={(v: string) =>
                          setIdentityData({ ...identityData, brand: v })
                        }
                      />
                      <IdentityInput
                        label="Model / Tipe"
                        value={identityData.model}
                        onChange={(v: string) =>
                          setIdentityData({ ...identityData, model: v })
                        }
                      />
                      <IdentityInput
                        label="Nomor Seri (Serial Number)"
                        value={identityData.serialNumber}
                        onChange={(v: string) =>
                          setIdentityData({ ...identityData, serialNumber: v })
                        }
                      />
                    </div>

                    <div className="bg-slate-50/50 dark:bg-[#15223e]/40 border border-slate-200 dark:border-cyan-500/15 rounded-3xl p-6 space-y-4 shadow-sm">
                      <h3 className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-[0.2em] mb-2 font-mono flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#d97706]"></span>
                        Instansi & Lokasi
                      </h3>
                      <IdentityInput
                        label="Nama Instansi / Rumah Sakit"
                        value={identityData.fasyankesName}
                        onChange={(v: string) =>
                          setIdentityData({ ...identityData, fasyankesName: v })
                        }
                      />
                      <IdentityInput
                        label="Ruangan / Lokasi Kalibrasi"
                        value={identityData.location}
                        onChange={(v: string) =>
                          setIdentityData({ ...identityData, location: v })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-950 dark:from-[#0f1d3a] dark:to-[#070e1b] rounded-3xl p-6 space-y-6 shadow-xl border border-blue-500/20 dark:border-cyan-500/20">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                          <Activity className="w-4 h-4" />
                        </div>
                        <h3 className="text-[10px] font-mono font-black text-blue-100 dark:text-cyan-400 uppercase tracking-[0.2em]">
                          Kondisi Lingkungan
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center font-mono">
                            AWAL (Start)
                          </p>
                          <IdentityInput
                            label="Suhu (°C)"
                            value={identityData.tempInitial}
                            onChange={(v: string) =>
                              setIdentityData({
                                ...identityData,
                                tempInitial: v,
                              })
                            }
                          />
                          <IdentityInput
                            label="Kelembaban (%)"
                            value={identityData.humInitial}
                            onChange={(v: string) =>
                              setIdentityData({
                                ...identityData,
                                humInitial: v,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-4">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center font-mono">
                            AKHIR (End)
                          </p>
                          <IdentityInput
                            label="Suhu (°C)"
                            value={identityData.tempFinal}
                            onChange={(v: string) =>
                              setIdentityData({ ...identityData, tempFinal: v })
                            }
                          />
                          <IdentityInput
                            label="Kelembaban (%)"
                            value={identityData.humFinal}
                            onChange={(v: string) =>
                              setIdentityData({ ...identityData, humFinal: v })
                            }
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-white/5 dark:border-cyan-500/10">
                        <IdentityInput
                          label="Tegangan Jala-Jala (Volt)"
                          value={identityData.voltage}
                          onChange={(v: string) =>
                            setIdentityData({ ...identityData, voltage: v })
                          }
                        />
                      </div>
                    </div>

                    <div className="p-6 bg-cyan-500/5 dark:bg-cyan-950/20 rounded-2xl border border-cyan-500/20 dark:border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.02)]">
                      <h3 className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-2 font-mono flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                        Peringatan Sinyal
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                        Data kondisi lingkungan dan identitas harus sesuai
                        karena akan dicatat secara permanen dalam laporan
                        teknis dan dilock audit.
                      </p>
                    </div>
                  </div>
                </div>
              </TabContent>
            )}

            {activeTab === "calibrators_tab" && (
              <TabContent key="calibrators_tab">
                <div className="bg-slate-50/50 dark:bg-[#15223e]/20 border border-slate-200 dark:border-cyan-500/15 p-6 rounded-3xl shadow-sm mb-6">
                  <header className="mb-8 select-none">
                    <div className="flex items-center gap-2 mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-blue-600 dark:text-cyan-400">
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      <span>MASTER STANDARDS ARRAY</span>
                    </div>
                    <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase flex items-center gap-2">
                      Master Kalibrator Utama
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      Pilih standar alat yang digunakan dalam proses kalibrasi ini sesuai telusur KAN/NIST.
                    </p>
                  </header>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {calibrators.map((cal) => (
                      <div
                        key={cal.id}
                        onClick={() => {
                          if (selectedCalibratorIds.includes(cal.id)) {
                            setSelectedCalibratorIds(
                              selectedCalibratorIds.filter(
                                (id) => id !== cal.id,
                              ),
                            );
                          } else {
                            setSelectedCalibratorIds([
                              ...selectedCalibratorIds,
                              cal.id,
                              ]);
                          }
                        }}
                        className={cn(
                          "p-5 rounded-2xl border transition-all cursor-pointer group select-none font-mono text-[10px]",
                          selectedCalibratorIds.includes(cal.id)
                            ? "bg-cyan-500/10 dark:bg-cyan-950/20 border-cyan-500 dark:border-cyan-450 shadow-lg shadow-cyan-500/5"
                            : "bg-slate-50/50 dark:bg-[#0c1220]/60 border-slate-200 dark:border-cyan-500/10 hover:border-cyan-500/40 dark:hover:border-cyan-500/30",
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4
                              className={cn(
                                "text-[11px] font-black uppercase tracking-tight transition-colors truncate italic",
                                selectedCalibratorIds.includes(cal.id)
                                  ? "text-cyan-600 dark:text-cyan-400"
                                  : "text-slate-900 dark:text-slate-100",
                              )}
                            >
                              {cal.name}
                            </h4>
                            <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate font-mono">
                              {cal.brand} • {cal.serialNumber}
                            </p>
                          </div>
                          <div
                            className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ml-3",
                              selectedCalibratorIds.includes(cal.id)
                                ? "bg-cyan-500 border-cyan-500 dark:bg-cyan-400 dark:border-cyan-400 shadow-inner"
                                : "border-slate-200 dark:border-cyan-500/15",
                            )}
                          >
                            {selectedCalibratorIds.includes(cal.id) && (
                              <CheckCircle2 className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {calibrators.length === 0 && (
                      <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 dark:border-cyan-500/10 rounded-3xl animate-pulse">
                        <Zap className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                        <p className="text-[10px] text-slate-500 dark:text-slate-450 italic">
                          Belum ada kalibrator terdaftar di Master Alat.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </TabContent>
            )}

            {activeTab === "inspections" && (
              <TabContent key="inspections">
                <header className="mb-8">
                  <div className="flex items-center gap-2 mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-blue-600 dark:text-cyan-400">
                    <Eye className="w-3.5 h-3.5 animate-pulse" />
                    <span>VISUAL & PARAMETRIC COMPLIANCE INSPECTION</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight italic uppercase">
                    Hasil Pemeriksaan Fisik & Fungsi
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Verifikasi kondisi fisik (visual) dan fungsionalitas operasional alat kesehatan sebelum pengukuran presisi.
                  </p>
                </header>

                <div className="space-y-12">
                  {/* Physical Section */}
                  <section className="bg-slate-50/50 dark:bg-[#15223e]/20 p-6 rounded-3xl border border-slate-200 dark:border-cyan-500/15 shadow-sm">
                    <div className="flex items-center justify-between mb-6 px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600/10 dark:bg-cyan-500/10 flex items-center justify-center">
                          <Eye className="w-4 h-4 text-blue-600 dark:text-cyan-400" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-slate-900 dark:text-cyan-100 uppercase tracking-[0.2em] italic">
                            I. Pemeriksaan Fisik
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              {Object.values(physicalData).filter(v => v === "Baik").length} Baik
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 font-mono">
                              {Object.values(physicalData).filter(v => v === "Rusak").length} Rusak
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newKey = `Fisik Lainnya ${Object.keys(physicalData).length + 1}`;
                          setPhysicalData({
                            ...physicalData,
                            [newKey]: "Baik",
                          });
                        }}
                        className="flex items-center gap-2 text-[9px] font-black text-blue-600 dark:text-cyan-400 hover:text-blue-700 dark:hover:text-cyan-350 transition-all uppercase tracking-widest bg-white dark:bg-[#070d19]/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-cyan-500/20 shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-3 h-3" />
                        Item Baru
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {Object.entries(physicalData).map(([key, value]) => (
                        <CheckItem
                          key={key}
                          label={key}
                          value={value}
                          onLabelChange={(newLabel: string) => {
                            if (newLabel === key) return;
                            const newData = { ...physicalData };
                            newData[newLabel] = newData[key];
                            delete newData[key];
                            setPhysicalData(newData);
                          }}
                          onDelete={() => {
                            const newData = { ...physicalData };
                            delete newData[key];
                            setPhysicalData(newData);
                          }}
                          onChange={(val: any) =>
                            setPhysicalData({ ...physicalData, [key]: val })
                          }
                        />
                      ))}
                    </div>
                  </section>

                  {/* Functional Section */}
                  <section className="bg-slate-50/50 dark:bg-[#15223e]/20 p-6 rounded-3xl border border-slate-200 dark:border-amber-500/15 shadow-sm">
                    <div className="flex items-center justify-between mb-6 px-1">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-[11px] font-black text-slate-900 dark:text-amber-100 uppercase tracking-[0.2em] italic">
                            II. Pemeriksaan Fungsi
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 font-mono">
                              {Object.values(functionalData).filter(v => v === "Baik").length} Baik
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-[9px] font-black text-rose-500 dark:text-rose-400 font-mono">
                              {Object.values(functionalData).filter(v => v === "Rusak").length} Rusak
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newKey = `Fungsi Lainnya ${Object.keys(functionalData).length + 1}`;
                          setFunctionalData({
                            ...functionalData,
                            [newKey]: "Baik",
                          });
                        }}
                        className="flex items-center gap-2 text-[9px] font-black text-amber-600 dark:text-amber-400 hover:text-amber-750 dark:hover:text-[#e4be47] transition-all uppercase tracking-widest bg-white dark:bg-[#070d19]/80 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-amber-500/20 shadow-sm hover:shadow-md"
                      >
                        <Plus className="w-3 h-3" />
                        Item Baru
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {Object.entries(functionalData).map(([key, value]) => (
                        <CheckItem
                          key={key}
                          label={key}
                          value={value}
                          variant="gold"
                          onLabelChange={(newLabel: string) => {
                            if (newLabel === key) return;
                            const newData = { ...functionalData };
                            newData[newLabel] = newData[key];
                            delete newData[key];
                            setFunctionalData(newData);
                          }}
                          onDelete={() => {
                            const newData = { ...functionalData };
                            delete newData[key];
                            setFunctionalData(newData);
                          }}
                          onChange={(val: any) =>
                            setFunctionalData({ ...functionalData, [key]: val })
                          }
                        />
                      ))}
                    </div>
                  </section>
                </div>
              </TabContent>
            )}

            {activeTab === "electrical" && (
              <TabContent key="electrical">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight italic uppercase leading-none">
                      Keselamatan Listrik (ESA)
                    </h2>
                    <p className="text-sm text-slate-600 mt-2 font-medium">
                      Pengujian arus bocor, tahanan isolasi, dan parameter
                      keandalan kelistrikan medis.
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setElectricalData({
                        ...electricalData,
                        enabled: !electricalData.enabled,
                      })
                    }
                    className={cn(
                      "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl",
                      electricalData.enabled
                        ? "bg-red-50 text-red-600 border border-red-100 animate-pulse"
                        : "bg-blue-600 text-white shadow-blue-500/20",
                    )}
                  >
                    {electricalData.enabled
                      ? "Nonaktifkan ESA"
                      : "Aktifkan Modul ESA"}
                  </button>
                </div>

                {!electricalData.enabled ? (
                  <div className="py-24 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem] bg-slate-50/50">
                    <ShieldCheck className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] max-w-xs mx-auto">
                      Modul Electrical Safety Analyzer (ESA) Standby
                    </p>
                  </div>
                ) : (
                  (() => {
                    const results = electricalData.results || {};
                    const standard = results.standard || "IEC 62353";
                    const classType = results.classType || "Class I";
                    const appliedPart = results.appliedPart || "Type BF";
                    const leakageMethod = results.leakageMethod || "Direct";

                    // IEC 62353 compliance & status details helper logic
                    const earthResVal = parseFloat(results.earthRes);
                    const isEarthResPass =
                      classType === "Class II"
                        ? true
                        : !isNaN(earthResVal) && earthResVal <= 0.3;

                    const insulationVal = parseFloat(results.insulation);
                    const insulationLimit =
                      classType === "Class II" ? 7.0 : 2.0;
                    const isInsulationPass =
                      !isNaN(insulationVal) && insulationVal >= insulationLimit;

                    const equipLeakageVal = parseFloat(
                      results.equipmentLeakage,
                    );
                    const equipLeakageLimit =
                      classType === "Class II"
                        ? 100
                        : leakageMethod === "Alternative"
                          ? 1000
                          : 500;
                    const isEquipLeakagePass =
                      !isNaN(equipLeakageVal) &&
                      equipLeakageVal <= equipLeakageLimit;

                    let appPartLeakageLimit = 1000;
                    if (appliedPart === "Type CF") {
                      appPartLeakageLimit =
                        leakageMethod === "Alternative" ? 100 : 50;
                    } else {
                      appPartLeakageLimit =
                        leakageMethod === "Alternative" ? 5000 : 1000;
                    }
                    const appPartLeakageVal = parseFloat(
                      results.appliedPartLeakage,
                    );
                    const isAppPartLeakagePass =
                      appliedPart === "None"
                        ? true
                        : !isNaN(appPartLeakageVal) &&
                          appPartLeakageVal <= appPartLeakageLimit;

                    // Overall status specifically for standard selection style and UI state
                    let isAllPass = true;
                    
                    const mainsVoltageVal = parseFloat(results.mainsVoltage);
                    const isMainsVoltagePass =
                      !isNaN(mainsVoltageVal) &&
                      mainsVoltageVal >= 198 &&
                      mainsVoltageVal <= 242;

                    if (!isMainsVoltagePass) {
                      isAllPass = false;
                    }

                    if (standard === "IEC 62353") {
                      if (
                        classType === "Class I" &&
                        !isNaN(earthResVal) &&
                        !isEarthResPass
                      )
                        isAllPass = false;
                      if (!isNaN(insulationVal) && !isInsulationPass)
                        isAllPass = false;
                      if (!isNaN(equipLeakageVal) && !isEquipLeakagePass)
                        isAllPass = false;
                      if (
                        appliedPart !== "None" &&
                        !isNaN(appPartLeakageVal) &&
                        !isAppPartLeakagePass
                      )
                        isAllPass = false;
                    } else {
                      // Legacy IEC 60601 check block
                      if (!isNaN(earthResVal) && earthResVal > 0.2)
                        isAllPass = false;
                      if (!isNaN(insulationVal) && insulationVal < 2.0)
                        isAllPass = false;
                      const earthLeakageVal = parseFloat(results.earthLeakage);
                      if (!isNaN(earthLeakageVal) && earthLeakageVal > 500)
                        isAllPass = false;
                      const chassisLeakageVal = parseFloat(
                        results.chassisLeakage,
                      );
                      if (!isNaN(chassisLeakageVal) && chassisLeakageVal > 100)
                        isAllPass = false;
                      const patientLeakageVal = parseFloat(
                        results.patientLeakage,
                      );
                      if (
                        appliedPart !== "None" &&
                        !isNaN(patientLeakageVal) &&
                        patientLeakageVal >
                          (appliedPart === "Type CF" ? 10 : 100)
                      )
                        isAllPass = false;
                    }

                    return (
                      <div className="space-y-8">
                        {/* Selector Controls for Standard & Classifications */}
                        <div className="bg-slate-50 border border-slate-200 rounded-[2rem] p-6 space-y-6">
                          <div className="flex items-center gap-2 border-b border-slate-200/60 pb-3">
                            <Zap className="w-5 h-5 text-blue-600 animate-pulse" />
                            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">
                              Klasifikasi Modul ESA sesuai IEC / SNI
                            </h3>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                            {/* Standar Acuan */}
                            <div className="space-y-2">
                              <label htmlFor="esa-standard" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                                Standar Acuan
                              </label>
                              <div className="relative">
                                <select
                                  id="esa-standard"
                                  title="Standar Acuan"
                                  aria-label="Standar Acuan"
                                  value={standard}
                                  onChange={(e) => {
                                    setElectricalData({
                                      ...electricalData,
                                      results: {
                                        ...electricalData.results,
                                        standard: e.target.value,
                                      },
                                    });
                                  }}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 appearance-none transition-all cursor-pointer"
                                >
                                  <option value="IEC 62353">
                                    IEC 62353 (Recurrent)
                                  </option>
                                  <option value="IEC 60601-1">
                                    IEC 60601-1 (Type Test)
                                  </option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                            </div>

                            {/* Kelas Peralatan */}
                            <div className="space-y-2">
                              <label htmlFor="esa-classType" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                                Kelas Peralatan
                              </label>
                              <div className="relative">
                                <select
                                  id="esa-classType"
                                  title="Kelas Peralatan"
                                  aria-label="Kelas Peralatan"
                                  value={classType}
                                  onChange={(e) => {
                                    setElectricalData({
                                      ...electricalData,
                                      results: {
                                        ...electricalData.results,
                                        classType: e.target.value,
                                      },
                                    });
                                  }}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 appearance-none transition-all cursor-pointer"
                                >
                                  <option value="Class I">
                                    Class I (Earthed)
                                  </option>
                                  <option value="Class II">
                                    Class II (Double Insulated)
                                  </option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                            </div>

                            {/* Tipe Bagian Pasien */}
                            <div className="space-y-2">
                              <label htmlFor="esa-appliedPart" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                                Bagian Pasien (Applied Part)
                              </label>
                              <div className="relative">
                                <select
                                  id="esa-appliedPart"
                                  title="Bagian Pasien (Applied Part)"
                                  aria-label="Bagian Pasien (Applied Part)"
                                  value={appliedPart}
                                  onChange={(e) => {
                                    setElectricalData({
                                      ...electricalData,
                                      results: {
                                        ...electricalData.results,
                                        appliedPart: e.target.value,
                                      },
                                    });
                                  }}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 appearance-none transition-all cursor-pointer"
                                >
                                  <option value="Type BF">
                                    Type BF (Body Float)
                                  </option>
                                  <option value="Type CF">
                                    Type CF (Cardiac Float)
                                  </option>
                                  <option value="Type B">
                                    Type B (Body Earthed)
                                  </option>
                                  <option value="None">
                                    None (Tanpa Hubungan Pasien)
                                  </option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                            </div>

                            {/* Metode Pengukuran Leakage */}
                            <div className="space-y-2">
                              <label htmlFor="esa-leakageMethod" className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                                Metode Pengukuran (Leakage)
                              </label>
                              <div className="relative">
                                <select
                                  id="esa-leakageMethod"
                                  title="Metode Pengukuran (Leakage)"
                                  aria-label="Metode Pengukuran (Leakage)"
                                  value={leakageMethod}
                                  onChange={(e) => {
                                    setElectricalData({
                                      ...electricalData,
                                      results: {
                                        ...electricalData.results,
                                        leakageMethod: e.target.value,
                                      },
                                    });
                                  }}
                                  disabled={standard !== "IEC 62353"}
                                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-bold text-black focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 appearance-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <option value="Direct">
                                    Direct Method (Langsung)
                                  </option>
                                  <option value="Differential">
                                    Differential Method
                                  </option>
                                  <option value="Alternative">
                                    Alternative Method
                                  </option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Rendering dynamic fields based on selected standard */}
                        {standard === "IEC 62353" ? (
                          <>
                            {/* Standard IEC 62353 Form Sections */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                  I. Power Source Parameters
                                </h4>
                                <InputRow
                                  label="Mains Voltage (V)"
                                  value={results.mainsVoltage}
                                  onChange={(v) =>
                                    setElectricalData({
                                      ...electricalData,
                                      results: { ...results, mainsVoltage: v },
                                    })
                                  }
                                  limit="220V ± 10%"
                                  isValid={isMainsVoltagePass}
                                />
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                  II. Resistance & Insulation
                                </h4>
                                {classType === "Class I" ? (
                                  <InputRow
                                    label="Protective Earth Resistance (Ω)"
                                    value={results.earthRes}
                                    onChange={(v) =>
                                      setElectricalData({
                                        ...electricalData,
                                        results: { ...results, earthRes: v },
                                      })
                                    }
                                    limit="≤ 0.3 Ω"
                                    isValid={isEarthResPass}
                                  />
                                ) : (
                                  <div className="flex flex-col justify-center items-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-5 text-center min-h-[96px]">
                                    <ShieldCheck className="w-6 h-6 text-slate-400 mb-1" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                                      Tahanan PE Tidak Diperlukan
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 font-mono">
                                      Double Insulated (Class II)
                                    </p>
                                  </div>
                                )}
                                <InputRow
                                  label="Insulation Resistance (MΩ)"
                                  value={results.insulation}
                                  onChange={(v) =>
                                    setElectricalData({
                                      ...electricalData,
                                      results: { ...results, insulation: v },
                                    })
                                  }
                                  limit={
                                    classType === "Class II"
                                      ? "≥ 7.0 MΩ"
                                      : "≥ 2.0 MΩ"
                                  }
                                  isValid={isInsulationPass}
                                />
                              </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                III. Leakage Current Tests (µA) - IEC 62353
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputRow
                                  label="Equipment Leakage Current (µA)"
                                  value={results.equipmentLeakage || ""}
                                  onChange={(v) =>
                                    setElectricalData({
                                      ...electricalData,
                                      results: {
                                        ...results,
                                        equipmentLeakage: v,
                                      },
                                    })
                                  }
                                  limit={
                                    classType === "Class II"
                                      ? "≤ 100 µA"
                                      : leakageMethod === "Alternative"
                                        ? "≤ 1000 µA"
                                        : "≤ 500 µA"
                                  }
                                  isValid={isEquipLeakagePass}
                                />
                                {appliedPart !== "None" ? (
                                  <InputRow
                                    label={`Applied Part Leakage (${appliedPart}) (µA)`}
                                    value={results.appliedPartLeakage || ""}
                                    onChange={(v) =>
                                      setElectricalData({
                                        ...electricalData,
                                        results: {
                                          ...results,
                                          appliedPartLeakage: v,
                                        },
                                      })
                                    }
                                    limit={
                                      appPartLeakageLimit
                                        ? `≤ ${appPartLeakageLimit} µA`
                                        : "≤ 1000 µA"
                                    }
                                    isValid={isAppPartLeakagePass}
                                  />
                                ) : (
                                  <div className="flex flex-col justify-center items-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-5 text-center min-h-[96px]">
                                    <ShieldCheck className="w-6 h-6 text-slate-400 mb-1" />
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest block font-mono">
                                      Arus Bocor Pasien N/A
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 font-mono">
                                      Tidak Ada Hubungan Langsung Pasien
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Legacy IEC 60601-1 Form Sections */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                  I. Power Source Parameters
                                </h4>
                                <InputRow
                                  label="Mains Voltage (V)"
                                  value={results.mainsVoltage}
                                  onChange={(v) =>
                                    setElectricalData({
                                      ...electricalData,
                                      results: { ...results, mainsVoltage: v },
                                    })
                                  }
                                  limit="220V ± 10%"
                                  isValid={isMainsVoltagePass}
                                />
                              </div>
                              <div className="space-y-4">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                  II. Resistance Tests
                                </h4>
                                <InputRow
                                  label="Earth Resistance (Ω)"
                                  value={results.earthRes}
                                  onChange={(v) =>
                                    setElectricalData({
                                      ...electricalData,
                                      results: { ...results, earthRes: v },
                                    })
                                  }
                                  limit="≤ 0.2 Ω"
                                />
                                <InputRow
                                  label="Insulation Res. (MΩ)"
                                  value={results.insulation}
                                  onChange={(v) =>
                                    setElectricalData({
                                      ...electricalData,
                                      results: { ...results, insulation: v },
                                    })
                                  }
                                  limit="≥ 2.0 MΩ"
                                />
                              </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100">
                              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                                III. Leakage Current Tests (µA) - IEC 60601
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <InputRow
                                    label="Earth Leakage Curr."
                                    value={results.earthLeakage}
                                    onChange={(v) =>
                                      setElectricalData({
                                        ...electricalData,
                                        results: {
                                          ...results,
                                          earthLeakage: v,
                                        },
                                      })
                                    }
                                    limit="≤ 500 µA"
                                  />
                                  <InputRow
                                    label="Chassis Leakage Curr."
                                    value={results.chassisLeakage}
                                    onChange={(v) =>
                                      setElectricalData({
                                        ...electricalData,
                                        results: {
                                          ...results,
                                          chassisLeakage: v,
                                        },
                                      })
                                    }
                                    limit="≤ 100 µA"
                                  />
                                </div>
                                <div className="space-y-4">
                                  <InputRow
                                    label="Patient Leakage Curr."
                                    value={results.patientLeakage}
                                    onChange={(v) =>
                                      setElectricalData({
                                        ...electricalData,
                                        results: {
                                          ...results,
                                          patientLeakage: v,
                                        },
                                      })
                                    }
                                    limit={
                                      appliedPart === "Type CF"
                                        ? "≤ 10 µA"
                                        : "≤ 100 µA"
                                    }
                                  />
                                  <InputRow
                                    label="Lead to Lead Leakage"
                                    value={results.leadLeakage}
                                    onChange={(v) =>
                                      setElectricalData({
                                        ...electricalData,
                                        results: { ...results, leadLeakage: v },
                                      })
                                    }
                                    limit={
                                      appliedPart === "Type CF"
                                        ? "≤ 10 µA"
                                        : "≤ 100 µA"
                                    }
                                  />
                                </div>
                              </div>
                            </div>
                          </>
                        )}

                        <div
                          className={cn(
                            "flex p-6 rounded-[2rem] border items-center justify-between transition-all duration-300 shadow-md gap-6",
                            isAllPass
                              ? "bg-emerald-500/10 dark:bg-emerald-950/40 border-emerald-500/20 text-emerald-800 dark:text-emerald-400"
                              : "bg-gradient-to-r from-red-600 to-orange-600 text-white border-red-600 dark:border-red-900 shadow-xl shadow-red-500/20",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "w-2.5 h-2.5 rounded-full shrink-0",
                                isAllPass
                                  ? "bg-emerald-500 animate-ping"
                                  : "bg-white animate-pulse",
                              )}
                            />
                            <p className={cn(
                              "text-[10px] font-black uppercase tracking-[0.25em] font-mono",
                              isAllPass ? "text-slate-500 dark:text-slate-400" : "text-white/90"
                            )}>
                              Keandalan Kelistrikan ({standard})
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={cn(
                                "text-xs font-black italic tracking-widest uppercase",
                                isAllPass
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-white drop-shadow-sm font-black animate-pulse",
                              )}
                            >
                              {isAllPass
                                ? "MEMENUHI SYARAT (PASSED)"
                                : "TIDAK MEMENUHI SYARAT (FAILED)"}
                            </span>
                            {isAllPass ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-5 h-5 text-white animate-bounce" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </TabContent>
            )}

            {activeTab === "measurements" && (
              <TabContent key="measurements">
                {/* STUNNING HIGH-END HEADER & REAL-TIME STATS PANEL */}
                <div className="flex flex-col gap-6 mb-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b from-[#b38728] via-amber-500 to-[#aa771c]" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-[#b38728]/10 text-[#b38728] tracking-widest font-mono">
                          Auto-Calculate Active
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight italic uppercase mt-1 flex items-center gap-1.5">
                        <FileText className="w-5 h-5 text-[#b38728]" /> Lembar Pengukuran & Ketidakpastian
                      </h2>
                      <p className="text-xs text-slate-550 dark:text-slate-400 mt-0.5 font-medium">
                        Kelola titik uji metrologi secara instan dengan asisten verifikasi real-time & simulator otomatis.
                      </p>
                    </div>

                    {/* Integrated quick statistics tracker */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-white dark:bg-[#0c1221] border border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl flex flex-col min-w-[100px] shadow-sm">
                        <span className="text-[9px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider font-mono">Status MPE</span>
                        {measurements.length === 0 ? (
                          <span className="text-xs font-bold text-slate-400 mt-1">Belum Ada Data</span>
                        ) : measurements.filter(m => m.tolerance && Math.abs(m.deviation) > Number(m.tolerance)).length === 0 ? (
                          <span className="text-xs font-black text-emerald-500 mt-1 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> 100% AMAN (Lolos)
                          </span>
                        ) : (
                          <span className="text-xs font-black text-rose-500 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 animate-pulse" /> {measurements.filter(m => m.tolerance && Math.abs(m.deviation) > Number(m.tolerance)).length} Titik Melebihi
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-white dark:bg-[#0c1221] border border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl flex flex-col min-w-[75px] shadow-sm">
                        <span className="text-[9px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider font-mono">Avg Deviasi</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 font-mono mt-1">
                          {measurements.length > 0 
                            ? (measurements.reduce((acc, current) => acc + Math.abs(current.deviation || 0), 0) / measurements.length).toFixed(4)
                            : "0.0000"
                          }
                        </span>
                      </div>

                      <div className="bg-white dark:bg-[#0c1221] border border-slate-200/80 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl flex flex-col min-w-[75px] shadow-sm">
                        <span className="text-[9px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-wider font-mono">Max U95</span>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 font-mono mt-1">
                          {measurements.length > 0 
                            ? Math.max(...measurements.map(m => m.uncertainty || 0)).toFixed(4)
                            : "0.0000"
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* COLLAPSIBLE AUTOMATION ENGINE & SIMULATOR PANEL */}
                  <div className="border border-slate-200 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-sm bg-white dark:bg-[#090d1a] transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => setIsAutomationOpen(!isAutomationOpen)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-800/80 hover:bg-slate-100/60 dark:hover:bg-slate-850 transition-colors font-mono font-black text-[10px] uppercase text-blue-600 dark:text-cyan-400 tracking-wider cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                        Konsol Otomatisasi & Simulator Metrologi (Opsional / Kustom)
                      </span>
                      {isAutomationOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                    </button>
                    
                    <AnimatePresence initial={false}>
                      {isAutomationOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="p-5 space-y-6 bg-slate-50/20 dark:bg-slate-950/10">
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                              {/* WIDGET 1: THE INTELLIGENT COMPACT SIMULATOR (Left) */}
                              <div className="xl:col-span-5 bg-gradient-to-r from-slate-900 to-[#101b33] p-5 rounded-3xl border border-slate-850 shadow-md relative overflow-hidden flex flex-col justify-between">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/[0.03] rounded-full filter blur-xl" />
                                
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest font-mono">
                                      Metrology Fast-Play Simulator
                                    </h4>
                                  </div>
                                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                                    Mensimulasikan input data ukur riil dalam milidetik untuk verifikasi kelulusan batas alat tanpa pengisian formulir manual.
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4">
                                  <button
                                    type="button"
                                    onClick={handleAutoSimulatePassed}
                                    className="bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all shadow-sm active:scale-95 text-center cursor-pointer"
                                    title="Simulasikan seluruh titik uji lolos nilai toleransi"
                                  >
                                    🟢 Lolos MPE (Optimal)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAutoSimulateFailed}
                                    className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all shadow-sm active:scale-95 text-center cursor-pointer"
                                    title="Simulasikan beberapa titik ukur melampaui toleransi untuk menguji validasi warna merah"
                                  >
                                    🔴 Gagal MPE (Kritis)
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAutoZeroDeviations}
                                    className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-black text-[9px] uppercase tracking-wider py-2.5 px-3 rounded-xl transition-all shadow-sm active:scale-95 text-center col-span-2 cursor-pointer"
                                  >
                                    🎯 Setel Seluruh Deviasi = 0
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleAutoFillAllMeasurements}
                                    className="bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-500 dark:text-amber-400 font-bold text-[9px] uppercase tracking-wider py-2 py-1.5 rounded-xl transition-all shadow-sm active:scale-95 text-center col-span-2 mt-1 cursor-pointer"
                                  >
                                    ⚡ Auto-Fill dari Kalibrator Master
                                  </button>
                                </div>
                              </div>

                              {/* WIDGET 2: AUTO INTERVAL/SEQUENCE POINT GENERATOR (Right) */}
                              <div className="xl:col-span-7 bg-white dark:bg-slate-900/40 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-[#b38728]" />
                                      <h4 className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono">
                                        Generator Rentang Titik Otomatis
                                      </h4>
                                    </div>
                                    <span className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-full">
                                      Rapid Grid Creator
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Membuat deret titik ukur kalibrasi secara linier bertahap dalam sekali klik.
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mt-3">
                                  <div className="flex flex-col gap-1 col-span-2 sm:col-span-2">
                                    <label htmlFor="seq-parameter" className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono tracking-wider">Parameter</label>
                                    <input
                                      type="text"
                                      id="seq-parameter"
                                      value={seqName}
                                      onChange={(e) => setSeqName(e.target.value)}
                                      placeholder="Tegangan"
                                      title="Parameter"
                                      className="bg-slate-50 border border-slate-200 dark:bg-[#070d19]/80 dark:border-slate-800 text-[11px] py-[6px] px-2 h-8 min-h-[32px] font-extrabold rounded-xl outline-none focus:border-[#b38728] text-center w-full"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 col-span-1 sm:col-span-1">
                                    <label htmlFor="seq-start" className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono tracking-wider text-center">Dari</label>
                                    <input
                                      type="number"
                                      id="seq-start"
                                      value={seqStart}
                                      onChange={(e) => setSeqStart(e.target.value)}
                                      title="Titik Mulai"
                                      placeholder="Titik Mulai"
                                      className="bg-slate-50 border border-slate-200 dark:bg-[#070d19]/80 dark:border-slate-800 text-[11px] py-[6px] px-2 h-8 min-h-[32px] font-mono font-extrabold rounded-xl outline-none focus:border-[#b38728] text-center w-full"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 col-span-1 sm:col-span-1">
                                    <label htmlFor="seq-end" className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono tracking-wider text-center">Sampai</label>
                                    <input
                                      type="number"
                                      id="seq-end"
                                      value={seqEnd}
                                      onChange={(e) => setSeqEnd(e.target.value)}
                                      title="Titik Selesai"
                                      placeholder="Titik Selesai"
                                      className="bg-slate-50 border border-slate-200 dark:bg-[#070d19]/80 dark:border-slate-800 text-[11px] py-[6px] px-2 h-8 min-h-[32px] font-mono font-extrabold rounded-xl outline-none focus:border-[#b38728] text-center w-full"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 col-span-1 sm:col-span-1">
                                    <label htmlFor="seq-steps" className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono tracking-wider text-center">Jumlah Titik</label>
                                    <input
                                      type="number"
                                      id="seq-steps"
                                      value={seqSteps}
                                      onChange={(e) => setSeqSteps(e.target.value)}
                                      title="Jumlah Titik"
                                      placeholder="Jumlah Titik"
                                      className="bg-slate-50 border border-slate-200 dark:bg-[#070d19]/80 dark:border-slate-800 text-[11px] py-[6px] px-2 h-8 min-h-[32px] font-mono font-extrabold rounded-xl outline-none focus:border-[#b38728] text-center w-full"
                                    />
                                  </div>
                                  <div className="flex flex-col gap-1 col-span-1 sm:col-span-1">
                                    <label htmlFor="seq-unit" className="text-[8px] font-bold text-slate-400 dark:text-slate-550 uppercase font-mono tracking-wider text-center">Satuan</label>
                                    <input
                                      type="text"
                                      id="seq-unit"
                                      value={seqUnit}
                                      onChange={(e) => setSeqUnit(e.target.value)}
                                      placeholder="V"
                                      title="Satuan"
                                      className="bg-slate-50 border border-slate-200 dark:bg-[#070d19]/80 dark:border-slate-800 text-[11px] py-[6px] px-2 h-8 min-h-[32px] font-extrabold rounded-xl outline-none focus:border-[#b38728] text-center w-full"
                                    />
                                  </div>
                                </div>

                                <div className="flex flex-wrap items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 w-full">
                                  {identityData.methodId && measurements.length === 0 && (
                                    <button
                                      type="button"
                                      onClick={initMeasurementsFromMethod}
                                      className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[9px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all cursor-pointer"
                                    >
                                      Generate dari MK
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleAutoGenerateSequence(
                                        seqName,
                                        Number(seqStart) || 0,
                                        Number(seqEnd) || 0,
                                        Number(seqSteps) || 1,
                                        seqUnit
                                      );
                                    }}
                                    className="bg-gradient-to-r from-amber-400 via-amber-500 to-[#b38728] text-slate-950 hover:from-amber-500 hover:to-amber-600 hover:text-white font-black text-[9px] uppercase tracking-wider py-1.5 px-4.5 rounded-lg transition-all shadow-sm active:scale-95 cursor-pointer"
                                  >
                                    ⚡ Generate Deret Titik
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* General Metrology Controls action row */}
                  <div className="flex flex-wrap items-center justify-between gap-4 mt-4 mb-2">
                    <div className="flex items-center gap-2">
                      <TableIcon className="w-5 h-5 text-[#b38728]" />
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest font-mono italic">
                        Tabel Data Pengukuran Kalibrasi
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMeasurements([
                            ...measurements,
                            {
                              parameterName: "",
                              point: 0,
                              actual: 0,
                              deviation: 0,
                              unit: "",
                              resolution: Number(bulkRes) || 0.01,
                              masterUnc: Number(bulkMUnc) || 0.001,
                              drift: Number(bulkDrift) || 0,
                            },
                          ]);
                        }}
                        className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-extrabold text-[9px] uppercase tracking-widest py-1.5 px-3.5 rounded-lg transition-all border border-slate-250 dark:border-slate-700 shadow-sm cursor-pointer active:scale-95"
                      >
                        Tambah Satu Baris
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadCSV}
                        className="bg-emerald-55/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200/50 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-350 font-extrabold text-[9px] uppercase tracking-widest py-1.5 px-3.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5" /> Unduh CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMetrologyMode(!editMetrologyMode)}
                        className={cn(
                          "font-extrabold text-[9px] uppercase tracking-wider py-1.5 px-3.5 rounded-lg transition-all border flex items-center gap-1.5 shadow-sm cursor-pointer active:scale-95",
                          editMetrologyMode
                            ? "bg-[#b38728]/15 border-[#b38728]/40 text-[#b38728] hover:bg-[#b38728]/25 dark:border-[#b38728]/40"
                            : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {editMetrologyMode ? "🔒 Kunci Metrologi" : "🔓 Edit Metrologi"}
                      </button>
                    </div>
                  </div>
                </div>

                  {/* KMK Method dropdown and Interpolator Card */}
                  {aiWarnings.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-amber-50/70 border border-amber-200/80 p-5 rounded-3xl flex flex-col gap-3 shadow-sm mb-6"
                    >
                      <div className="flex items-center gap-2">
                        <BrainCircuit className="w-5 h-5 text-amber-600 animate-pulse" />
                        <h4 className="text-[11px] font-black text-amber-950 uppercase tracking-widest font-mono">
                          Validasi Metrologi & Peringatan Otomatis AI
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] text-amber-800 font-bold">
                        {aiWarnings.map((warn, i) => (
                          <div key={i} className="flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-amber-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                            <span className="text-amber-500 shrink-0 mt-0.5 animate-bounce">⚠️</span>
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {editMetrologyMode && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Selector Column */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col justify-between space-y-4 shadow-sm">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-950/40 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                            <BrainCircuit className="w-4 h-4" />
                          </div>
                          <div>
                            <label htmlFor="identity-uncMethod" className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono cursor-pointer">
                              Metode Ketidakpastian
                            </label>
                            <p className="text-[9px] text-slate-400 dark:text-slate-550 font-bold uppercase font-mono">
                              Acuan Buku KMK Terbaru
                            </p>
                          </div>
                        </div>
                        <select
                          id="identity-uncMethod"
                          title="Metode Ketidakpastian"
                          aria-label="Metode Ketidakpastian"
                          value={identityData.uncMethod || "standard"}
                          onChange={(e) => {
                            const val = e.target.value;
                            const newIdData = {
                              ...identityData,
                              uncMethod: val,
                            };
                            setIdentityData(newIdData);
                            // Recalculate uncertainty for all measurements
                            const newM = measurements.map((m: any) => {
                              const updated = { ...m };
                              updated.uncertainty = calculateUncertainty(
                                updated.resolution || 0.01,
                                updated.masterUnc || 0.001,
                                updated.drift || 0,
                                updated,
                              );
                              return updated;
                            });
                            setMeasurements(newM);
                          }}
                          className="bg-slate-50/50 dark:bg-[#070d19]/80 border border-slate-200 dark:border-[#b38728]/25 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 dark:text-slate-200 focus:border-[#b38728]/50 focus:bg-white dark:focus:bg-[#030611] focus:ring-2 focus:ring-[#b38728]/10 outline-none w-full transition-all cursor-pointer hover:border-slate-300 dark:hover:border-[#b38728]/40 shadow-sm"
                        >
                          <option value="standard">
                            Model Standar Umum (KMK Dasar)
                          </option>
                          <option value="suhu">
                            Alat Suhu (Incubator, Oven, Refrigerator)
                          </option>
                          <option value="tekanan">
                            Alat Tekanan (Manometer, Gauge, Sphygmomanometer)
                          </option>
                          <option value="timbangan">
                            Alat Massa / Timbangan (Analytical, Bed Scale, Digital)
                          </option>
                          <option value="volume_flow">
                            Alat Volume & Laju Alir Cairan (Pump, Pipet)
                          </option>
                          <option value="gas_flow">
                            Alat Aliran Gas / Udara (Ventilator, Spirometer)
                          </option>
                          <option value="kelembaban">
                            Alat Kelembaban (Thermohygrometer, Humidity Chamber)
                          </option>
                          <option value="laboratorium">
                            Alat Laboratorium (Micropipette, Spectrophotometer)
                          </option>
                          <option value="listrik_medis">
                            Alat Listrik & Medis (ESA, Multimeter)
                          </option>

                          {/* 14 Kelompok Tambahan */}
                          <option value="waktu_frekuensi">
                            Waktu & Frekuensi (Timer, Stopwatch, ECG/Fetal Simulator)
                          </option>
                          <option value="kecepatan_putar">
                            Kecepatan Putar / RPM (Centrifuge, Tachometer)
                          </option>
                          <option value="cahaya_fotometri">
                            Cahaya / Fotometri (Lux Meter, Lampu Operasi, Bilirubin)
                          </option>
                          <option value="akustik_suara">
                            Akustik / Suara (Sound Level Meter, Audiometer)
                          </option>
                          <option value="gaya_beban_torsi">
                            Gaya / Beban / Torsi (Force Gauge, Torque Wrench)
                          </option>
                          <option value="dimensi_panjang">
                            Dimensi & Panjang (Caliper, Micrometer, Dial Indicator)
                          </option>
                          <option value="optik">
                            Model Lensa & Optik (Lensmeter, Refractometer)
                          </option>
                          <option value="kimia_analitik">
                            Kimia & Elektrokimia (pH-Meter, Conductivity)
                          </option>
                          <option value="gas_medis_konsentrasi">
                            Konsentrasi Gas Medis (Oxygen Analyzer)
                          </option>
                          <option value="keselamatan_kerja">
                            Keselamatan Kerja & Higiene (Lux/Sound Area)
                          </option>
                          <option value="sterilisasi">
                            Autoclave & Sterilisator (Thermal Validation)
                          </option>
                          <option value="dosis_radiasi">
                            Dosis & Radiologi Sinar-X (Output Dose, kVp, kV)
                          </option>
                          <option value="terapi_energi">
                            Alat Terapi Energi Tinggi (Defibrillator Analyzer)
                          </option>
                          <option value="monitoring_pasien">
                            Alat Monitoring Pasien (Patient Monitor, NIBP, SpO2)
                          </option>
                        </select>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <div>
                          <label htmlFor="identity-decisionRule" className="text-[9px] font-black text-slate-800 uppercase block mb-1">
                            Aturan Keputusan (Decision Rule)
                          </label>
                          <select
                            id="identity-decisionRule"
                            title="Aturan Keputusan (Decision Rule)"
                            aria-label="Aturan Keputusan (Decision Rule)"
                            value={decisionRule}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setDecisionRule(val);
                            }}
                            className="bg-slate-50/50 dark:bg-[#070d19]/80 border border-slate-200 dark:border-[#b38728]/25 rounded-xl px-2.5 py-1.5 text-[10px] font-black text-slate-700 dark:text-slate-200 focus:border-[#b38728]/50 focus:bg-white dark:focus:bg-[#030611] focus:ring-2 focus:ring-[#b38728]/10 outline-none w-full transition-all cursor-pointer hover:border-slate-300 dark:hover:border-[#b38728]/40 shadow-sm"
                          >
                            <option value="simple">Simple Acceptance (Tanpa Pengaman)</option>
                            <option value="strict">Strict Acceptance (Guard-Band k=2)</option>
                          </select>
                        </div>

                        <div>
                          <label htmlFor="identity-cmcValue" className="text-[9px] font-black text-slate-800 block mb-1 uppercase">
                            Batas CMC Spektrum Lab
                          </label>
                          <input
                            type="number"
                            id="identity-cmcValue"
                            title="Batas CMC Spektrum Lab"
                            placeholder="Batas CMC Spektrum Lab"
                            step="0.0001"
                            value={cmcValue}
                            onChange={(e) => setCmcValue(Number(e.target.value) || 0)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-[10px] text-right font-black font-mono w-full"
                          />
                        </div>
                      </div>

                      <p className="text-[9px] text-slate-500 leading-relaxed pt-2 border-t border-slate-100 italic">
                        {identityData.uncMethod === "standard" &&
                          "Model Standar Umum menghitung ketidakpastian dasar berdasarkan resolusi, ketidakpastian standar master kalibrator, dan drift."}
                        {identityData.uncMethod === "suhu" &&
                          "Model Alat Suhu menambahkan parameter stabilitas media (fluktuasi) dan homogenitas ruang (uniformitas spasial)."}
                        {identityData.uncMethod === "tekanan" &&
                          "Model Alat Tekanan menambahkan parameter efek histeresis mekanik dan pergeseran titik nol (zero drift)."}
                        {identityData.uncMethod === "timbangan" &&
                          "Model Timbangan menambahkan parameter uji eksentrisitas (posisi pembebanan) dan linearitas skala."}
                        {identityData.uncMethod === "volume_flow" &&
                          "Model Volume & Laju Alir Cairan menganalisa ketidakpastian debit Q = V / t berdasarkan kontribusi u_V dan u_t."}
                        {identityData.uncMethod === "gas_flow" &&
                          "Model Aliran Gas mengoreksi aliran terukur Q ke kondisi standar Q_std berdasarkan pengaruh temperatur dan tekanan udara."}
                        {identityData.uncMethod === "kelembaban" &&
                          "Model Kelembaban memperhitungkan stabilitas RH ruang, keseragaman/homogenitas spasial, dan drift sensor."}
                        {identityData.uncMethod === "laboratorium" &&
                          "Model Laboratorium menghitung parameter volume Micropipette (m/rho), pH slope, atau absorbansi Spektrofotometer."}
                        {identityData.uncMethod === "listrik_medis" &&
                          "Model Listrik & Medis mengukur ketidakpastian tegangan, arus, daya P (V x I) atau hambatan."}
                      </p>
                    </div>

                    {/* COLUMN 2: CUSTOM DRIFT ANALYSIS STUDIO */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col justify-between space-y-4">
                      {(() => {
                        const primaryId = selectedCalibratorIds[0];
                        const cal = calibrators.find(c => c.id === primaryId);
                        if (!cal) {
                          return (
                            <div className="flex flex-col justify-center items-center h-full text-center py-8 px-6 bg-amber-500/[0.04] dark:bg-amber-500/[0.02] border-2 border-dashed border-amber-500/20 dark:border-[#b38728]/25 rounded-2xl">
                              <AlertTriangle className="w-8 h-8 text-[#b38728]/80 mb-2.5 animate-bounce" />
                              <h4 className="text-xs font-black uppercase text-[#b38728] dark:text-[#e4be47] font-mono">Standar Belum Terpilih</h4>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 max-w-xs mt-1.5 font-bold">
                                Silakan hubungkan calibrator utama di tab "Master Kalibrator" agar sistem dapat membaca runutan drift metrologi historis secara instan.
                              </p>
                            </div>
                          );
                        }

                        const matches = calibratorHistories[primaryId] || [];
                        const hasHistory = matches.length > 1;

                        if (hasHistory) {
                          const sorted = [...matches];
                          const oldest = sorted[0];
                          const newest = sorted[sorted.length - 1];
                          
                          let computedDrift = 0.002;
                          let paramUnit = "unit";
                          if (oldest.parameters && newest.parameters) {
                            let sumDiff = 0;
                            let count = 0;
                            newest.parameters.forEach((pNew: any) => {
                              const pOld = oldest.parameters.find((po: any) => po.parameterName === pNew.parameterName && po.point === pNew.point);
                              if (pOld) {
                                sumDiff += Math.abs((pNew.correction || 0) - (pOld.correction || 0));
                                count++;
                                paramUnit = pNew.unit || pNew.satuan || "unit";
                              }
                            });
                            if (count > 0) {
                              computedDrift = sumDiff / count;
                            }
                          }
                          
                          const points = sorted.map((m, idx) => {
                            const dateStr = m.calibrationDate || m.calibration_date || "N/A";
                            const avgCorrection = m.parameters ? (m.parameters.reduce((sum: number, p: any) => sum + (p.correction || 0), 0) / (m.parameters.length || 1)) : 0;
                            return {
                              date: dateStr,
                              correction: avgCorrection,
                              cert: m.certificateNumber || m.certificate_number || "N/A"
                            };
                          });

                          const width = 280;
                          const height = 80;
                          const padding = 15;
                          const chartPoints = points.map((p, i) => {
                            const x = padding + (i * (width - 2 * padding)) / Math.max(1, points.length - 1);
                            const corrections = points.map(pt => pt.correction);
                            const minCorr = Math.min(...corrections, -0.01) - 0.01;
                            const maxCorr = Math.max(...corrections, 0.01) + 0.01;
                            const range = maxCorr - minCorr || 1;
                            const y = height - padding - ((p.correction - minCorr) * (height - 2 * padding)) / range;
                            return { x, y, ...p };
                          });

                          let pathD = "";
                          if (chartPoints.length > 1) {
                            pathD = `M ${chartPoints[0].x} ${chartPoints[0].y} ` + chartPoints.slice(1).map(pt => `L ${pt.x} ${pt.y}`).join(" ");
                          }

                          return (
                            <div className="space-y-4 flex flex-col h-full justify-between">
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider font-mono truncate">{cal.name}</h4>
                                    <p className="text-[9px] text-amber-600 font-bold uppercase font-mono">DIPERIKSA: {matches.length} REKAM JEJAK SERTIFIKAT</p>
                                  </div>
                                </div>

                                <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 font-mono text-[8px] text-slate-600 space-y-1">
                                  <div className="flex justify-between font-black text-slate-900 border-b border-slate-200 pb-1 italic">
                                    <span>Tgl Kalibrasi</span>
                                    <span>No Sertifikat</span>
                                    <span>Koreksi Avg</span>
                                  </div>
                                  {sorted.map((m, idx) => {
                                    const avgCorr = m.parameters ? (m.parameters.reduce((sum: number, p: any) => sum + (p.correction || 0), 0) / m.parameters.length).toFixed(4) : "0.00";
                                    return (
                                      <div key={idx} className="flex justify-between items-center py-0.5">
                                        <span>{m.calibrationDate || m.calibration_date || "N/A"}</span>
                                        <span className="font-bold text-slate-700 truncate max-w-[80px]">{m.certificateNumber || m.certificate_number || "N/A"}</span>
                                        <span className="font-bold text-blue-600">{avgCorr}</span>
                                      </div>
                                    );
                                  })}
                                </div>

                                <div className="bg-slate-950 p-2.5 rounded-2xl border border-slate-800 relative">
                                  <div className="absolute top-1.5 right-2 text-[6.5px] text-slate-500 font-mono font-black uppercase">TREN KOREKSI ALAT</div>
                                  <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                                    <line x1={padding} y1={height/2} x2={width-padding} y2={height/2} stroke="#334155" strokeDasharray="3,3" />
                                    {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
                                    {chartPoints.map((pt, i) => (
                                      <g key={i}>
                                        <circle cx={pt.x} cy={pt.y} r="3" fill="#0ea5e9" stroke="#ffffff" strokeWidth="1" />
                                      </g>
                                    ))}
                                  </svg>
                                </div>

                                <div className="text-[9px] text-slate-500 leading-relaxed bg-blue-50/50 p-2.5 rounded-xl border border-blue-150 text-left">
                                  <strong className="text-blue-700 uppercase block mb-0.5 font-black">Drift Analitik:</strong>
                                  Laju instabilitas jangka panjang rata-rata sebesar <strong className="text-slate-900 font-mono">{computedDrift.toFixed(5)} {paramUnit}/tahun</strong>. Klik tombol untuk otomatis meratakan komponen drift ke tabel.
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const newM = measurements.map((m) => {
                                    const updated = { ...m };
                                    updated.drift = Math.abs(computedDrift);
                                    updated.uncertainty = calculateUncertainty(
                                      updated.resolution || 0.01,
                                      updated.masterUnc || 0.001,
                                      Math.abs(computedDrift),
                                      updated,
                                    );
                                    return updated;
                                  });
                                  setMeasurements(newM);
                                  showToast("Drift analitis berhasil dialirkan ke kolom drift pada parameter pengukuran!", "success");
                                }}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] uppercase tracking-widest py-2 rounded-xl transition-all shadow-md"
                              >
                                Terapkan Drift Historis ke Tabel
                              </button>
                            </div>
                          );
                        } else {
                          return (
                            <div className="space-y-4 font-mono flex flex-col h-full justify-between text-left">
                              <div className="space-y-3">
                                <div className="flex items-start gap-2 border-b border-slate-100 pb-2.5">
                                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
                                  <div>
                                    <h5 className="text-[10px] font-black uppercase text-slate-800">1 Sertifikat Terdaftar</h5>
                                    <div className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                                      Estimasi Pendekatan Tunggal (Enforced Audit-Trail)
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label htmlFor="drift-formula" className="text-[8.5px] font-black text-slate-800 uppercase block mb-1">Pilih Formula Pendekatan Drift</label>
                                  <select id="drift-formula" title="Pilih Formula Pendekatan Drift" aria-label="Pilih Formula Pendekatan Drift" className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 text-[9px] font-bold text-slate-700 outline-none w-full">
                                    <option value="pabrikan">1. Estimasi Produsen (e.g. Fluke / Keysight Specs)</option>
                                    <option value="konservatif">2. Pendekatan Konservatif Lab (1/3 Batas Toleransi)</option>
                                    <option value="disabled">3. Dinonaktifkan (Instrumen Standar Baru Kalibrasi)</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[8.5px] font-black text-slate-800 uppercase block mb-1">Justifikasi Teknis Analis (Wajib)</label>
                                  <textarea
                                    value={justificationText}
                                    onChange={(e) => {
                                      setJustificationText(e.target.value);
                                      setIsJustificationSaved(false);
                                    }}
                                    placeholder="Tulis alasan ilmiah / justifikasi penentuan nilai drift manual di mari..."
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-[9px] text-slate-800 placeholder:text-slate-400 outline-none w-full h-14 font-sans resize-none"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={!justificationText.trim()}
                                onClick={async () => {
                                  if (!justificationText.trim()) return;
                                  try {
                                    await logAction(
                                      `Justifikasi Drift Manual: ${identityData.deviceName || "Alat Kerja"}`,
                                      "worksheets",
                                      `Justifikasi teknis penentuan drift manual: "${justificationText}". ID LK: ${lk?.id || "Draft"}`,
                                      "warning"
                                    );
                                    setIsJustificationSaved(true);
                                    showToast("Sukses! Alasan tertulis tercatat dalam riwayat audit trail pangkalan data.", "success");
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className={cn(
                                  "w-full py-2 rounded-xl text-[9px] uppercase font-black tracking-widest text-white transition-all shadow-md",
                                  isJustificationSaved 
                                    ? "bg-slate-500 cursor-default" 
                                    : "bg-blue-600 hover:bg-blue-700 disabled:opacity-40"
                                )}
                              >
                                {isJustificationSaved ? "Justifikasi Ter-Audit ✓" : "Kirim & Catat Ke Audit Trail"}
                              </button>
                            </div>
                          );
                        }
                      })()}
                    </div>

                    {/* Interpolator Column */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-2.5 mb-4 justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-950/40 rounded-lg flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                            <TableIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                              Rumus Interpolasi &amp; Titik Acu
                            </h4>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase font-mono">
                              Dual-Mode: Auto dari Kalibrator atau Manual
                            </p>
                          </div>
                        </div>
                        {interpResult !== null && (
                          <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase px-2.5 py-1 rounded-full font-mono">
                            Hasil: ± {interpResult.toFixed(5)}
                          </span>
                        )}
                      </div>

                      <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl mb-5 max-w-sm">
                        <button
                          type="button"
                          onClick={() => {
                            setInterpSource("calibrator");
                            setInterpX1("");
                            setInterpY1("");
                            setInterpX2("");
                            setInterpY2("");
                            setInterpResult(null);
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all text-center",
                            interpSource === "calibrator"
                              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm font-black"
                              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                          )}
                        >
                          Otomatis Sertifikat
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInterpSource("manual");
                            setInterpResult(null);
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all text-center",
                            interpSource === "manual"
                              ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm font-black"
                              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                          )}
                        >
                          Manual
                        </button>
                      </div>

                      {interpSource === "calibrator" ? (
                        <div className="space-y-4 mb-5 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            <div className="space-y-1">
                                  <label htmlFor="interp-param" className="text-[9px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-wider font-mono">
                                    Pilih Parameter Kalibrator
                                  </label>
                                  {uniqueParamNames.length > 0 ? (
                                    <select
                                      id="interp-param"
                                      title="Pilih Parameter Kalibrator"
                                      aria-label="Pilih Parameter Kalibrator"
                                      value={selectedInterpParam}
                                  onChange={(e) => {
                                    setSelectedInterpParam(e.target.value);
                                    if (interpX) {
                                      handleAutoInterpolateFromSelected(
                                        interpX,
                                        e.target.value,
                                        interpValueType,
                                      );
                                    }
                                  }}
                                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-bold outline-none focus:border-blue-500"
                                >
                                  {uniqueParamNames.map((name) => (
                                    <option key={name} value={name}>
                                      {name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="p-3 bg-red-500/[0.04] dark:bg-red-500/[0.02] border border-red-500/20 dark:border-red-500/10 rounded-xl text-[10px] text-red-600 dark:text-red-400 font-bold italic flex items-start gap-2 mt-2 leading-relaxed">
                                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                  <span>
                                    <strong>Tidak ada data parameter kalibrator.</strong>
                                    <br />
                                    Silakan pilih Kalibrator terlebih dahulu.
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-slate-500 dark:text-slate-200 uppercase tracking-wider font-mono">
                                Asal Nilai Referensi (y)
                              </label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInterpValueType("correction");
                                    if (interpX) {
                                      handleAutoInterpolateFromSelected(
                                        interpX,
                                        selectedInterpParam,
                                        "correction",
                                      );
                                    }
                                  }}
                                  className={cn(
                                    "flex-1 py-1.5 text-[10px] font-bold uppercase border rounded-lg transition-all",
                                    interpValueType === "correction"
                                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 font-bold shadow-sm"
                                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                                  )}
                                >
                                  Nilai Koreksi
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setInterpValueType("uncertainty");
                                    if (interpX) {
                                      handleAutoInterpolateFromSelected(
                                        interpX,
                                        selectedInterpParam,
                                        "uncertainty",
                                      );
                                    }
                                  }}
                                  className={cn(
                                    "flex-1 py-1.5 text-[10px] font-bold uppercase border rounded-lg transition-all",
                                    interpValueType === "uncertainty"
                                      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400"
                                      : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                                  )}
                                >
                                  Ketidakpastian (U95)
                                </button>
                              </div>
                            </div>
                          </div>

                          {uniqueParamNames.length > 0 && (
                            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 animate-fade-in">
                              <div className="text-[9px] font-mono text-slate-450 dark:text-slate-300 uppercase font-bold">
                                ⚡ BATCH AUTO-FILL SEMUA BARIS TABEL:
                              </div>
                              <div className="flex items-center gap-2">
                                <select
                                  id="batchTargetSelect"
                                  title="Batch Auto-Fill Target"
                                  aria-label="Batch Auto-Fill Target"
                                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-650 dark:text-slate-200 font-bold outline-none focus:border-emerald-500"
                                >
                                  <option value="masterUnc">M.Unc (u₂)</option>
                                  <option value="drift">Drift (u₄)</option>
                                  <option value="actual">Nilai Terukur</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const selectElem = document.getElementById(
                                      "batchTargetSelect",
                                    ) as HTMLSelectElement;
                                    const field = selectElem
                                      ? (selectElem.value as
                                          | "masterUnc"
                                          | "drift"
                                          | "actual")
                                      : "masterUnc";
                                    autoInterpolateAllRows(
                                      field,
                                      selectedInterpParam,
                                      interpValueType,
                                    );
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white tracking-wider transition-all select-none active:scale-95 duration-100 shadow-md shadow-emerald-500/15 focus:ring-2 focus:ring-emerald-500/20"
                                >
                                  Mulai Interpolasi
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-2 mb-3 mt-4 border-t border-slate-200 dark:border-slate-800/60 pt-4">
                        <div className="w-1.5 h-3 bg-blue-600 dark:bg-blue-400 rounded-full" />
                        <span className="text-[10px] font-black text-slate-500 dark:text-slate-200 tracking-widest uppercase font-mono">
                          TITIK ACU INTERPOLASI ($X_1, Y_1, X_2, Y_2$)
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-550 dark:text-slate-200 uppercase font-mono">
                            Titik Acuan 1 (x₁)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="x₁"
                            value={interpX1}
                            disabled={interpSource === "calibrator"}
                            onChange={(e) => {
                              setInterpX1(e.target.value);
                              calculateInterpolationValue(
                                e.target.value,
                                interpY1,
                                interpX2,
                                interpY2,
                                interpX,
                              );
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase font-mono">
                            Koreksi 1 (y₁)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="y₁"
                            value={interpY1}
                            disabled={interpSource === "calibrator"}
                            onChange={(e) => {
                              setInterpY1(e.target.value);
                              calculateInterpolationValue(
                                interpX1,
                                e.target.value,
                                interpX2,
                                interpY2,
                                interpX,
                              );
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase font-mono">
                            Titik Acuan 2 (x₂)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="x₂"
                            value={interpX2}
                            disabled={interpSource === "calibrator"}
                            onChange={(e) => {
                              setInterpX2(e.target.value);
                              calculateInterpolationValue(
                                interpX1,
                                interpY1,
                                e.target.value,
                                interpY2,
                                interpX,
                              );
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase font-mono">
                            Koreksi 2 (y₂)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="y₂"
                            value={interpY2}
                            disabled={interpSource === "calibrator"}
                            onChange={(e) => {
                              setInterpY2(e.target.value);
                              calculateInterpolationValue(
                                interpX1,
                                interpY1,
                                interpX2,
                                e.target.value,
                                interpX,
                              );
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-bold outline-none focus:bg-white focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-blue-600 uppercase font-mono">
                            Titik Target (x)
                          </label>
                          <input
                            type="number"
                            step="any"
                            placeholder="x"
                            value={interpX}
                            onChange={(e) => {
                              setInterpX(e.target.value);
                              if (interpSource === "calibrator") {
                                handleAutoInterpolateFromSelected(
                                  e.target.value,
                                  selectedInterpParam,
                                  interpValueType,
                                );
                              } else {
                                calculateInterpolationValue(
                                  interpX1,
                                  interpY1,
                                  interpX2,
                                  interpY2,
                                  e.target.value,
                                );
                              }
                            }}
                            className="w-full bg-blue-50/50 border border-blue-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold outline-none focus:bg-white focus:border-blue-500 ring-2 ring-blue-500/10"
                          />
                        </div>
                      </div>

                      {interpWarning && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="my-4 p-3 bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-900/45 text-amber-800 dark:text-amber-200 rounded-xl text-xs font-semibold flex items-start gap-2.5"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <span>{interpWarning}</span>
                        </motion.div>
                      )}

                      {interpResult !== null && (
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">
                            Terapkan hasil terinterpolasi{" "}
                            <strong className="text-emerald-600">
                              {interpResult.toFixed(5)}
                            </strong>{" "}
                            ke baris tabel:
                          </span>
                          <div className="flex items-center gap-2">
                            <select
                              value={interpTargetRow}
                              onChange={(e) =>
                                setInterpTargetRow(Number(e.target.value))
                              }
                              title="Pilih Baris Target Interpolasi"
                              aria-label="Pilih Baris Target Interpolasi"
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold outline-none focus:border-blue-500"
                            >
                              <option value={-1}>-- Pilih Baris --</option>
                              {measurements.map((m, idx) => (
                                <option key={idx} value={idx}>
                                  Baris {idx + 1} -{" "}
                                  {m.parameterName || `Titik ${m.point}`}
                                </option>
                              ))}
                            </select>
                            <select
                              value={interpTargetField}
                              onChange={(e: any) =>
                                setInterpTargetField(e.target.value)
                              }
                              title="Pilih Kolom Target Interpolasi"
                              aria-label="Pilih Kolom Target Interpolasi"
                              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-bold outline-none focus:border-blue-500"
                            >
                              <option value="masterUnc">M.Unc (u₂)</option>
                              <option value="drift">Drift (u₄)</option>
                              <option value="actual">Nilai Terukur</option>
                            </select>
                            <button
                              type="button"
                              onClick={applyInterpolationToRow}
                              disabled={interpTargetRow === -1}
                              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase text-white tracking-widest transition-all"
                            >
                              Masukkan Data
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  )}

                {/* Panel Asisten Pengisian Data (Data Entry Assistant) - Extremely Luxurious Revamp */}
                {editMetrologyMode && (
                  <div className="bg-gradient-to-r from-slate-900/90 via-[#070b18]/95 to-[#0b142c]/90 border border-slate-800/80 dark:border-[#b38728]/30 p-7 rounded-[2rem] shadow-[0_15px_45px_0_rgba(0,0,0,0.5)] relative overflow-hidden mb-8 flex flex-col gap-5 group/panel">
                  {/* Glowing decorative golden line at the top */}
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#b38728]/25 via-[#fcf6ba] to-[#aa771c]/25 shadow-[0_1px_12px_rgba(212,175,55,0.4)]" />
                  
                  {/* Subtle luxurious background accent */}
                  <div className="absolute -right-32 -bottom-32 w-80 h-80 bg-gradient-to-br from-[#b38728]/5 via-amber-500/0 to-transparent rounded-full filter blur-3xl pointer-events-none group-hover/panel:scale-110 transition-all duration-1000" />
                  
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-[#b38728] p-0.5 shadow-[0_8px_20px_rgba(212,175,55,0.2)] shrink-0 group-hover/panel:rotate-6 transition-transform duration-500">
                        <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center text-amber-400">
                          <Sparkles className="w-5.5 h-5.5 animate-pulse" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] font-mono flex items-center gap-2">
                          <span className="gold-text-gradient">Core Metrology Suite</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        </h3>
                        <p className="text-[10px] text-slate-400 dark:text-slate-400 font-extrabold uppercase tracking-widest font-mono mt-0.5">
                          Asisten Pengisian Data Ukur & Penyelarasan Metrologis Massal
                        </p>
                      </div>
                    </div>
                    {/* Measurement statistics - luxurious styled counters */}
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="bg-slate-950/80 border border-slate-800/80 dark:border-[#b38728]/15 px-4 py-2 rounded-2xl flex flex-col min-w-[75px] shadow-inner relative overflow-hidden group/m">
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider font-mono">Row Count</span>
                        <span className="text-sm font-black text-slate-100 font-mono mt-0.5 flex items-baseline gap-1">
                          {measurements.length} <span className="text-[8px] text-slate-550 font-normal">pts</span>
                        </span>
                        <div className="absolute top-0 right-0 w-1 h-full bg-slate-700" />
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800/80 dark:border-emerald-500/15 px-4 py-2 rounded-2xl flex flex-col min-w-[100px] shadow-inner relative overflow-hidden group/m">
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Passed MPE</span>
                        <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                          {measurements.filter(m => !m.tolerance || Math.abs(m.deviation) <= Number(m.tolerance)).length}
                        </span>
                        <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
                      </div>
                      <div className="bg-slate-950/80 border border-slate-800/80 dark:border-rose-500/15 px-4 py-2 rounded-2xl flex flex-col min-w-[100px] shadow-inner relative overflow-hidden group/m">
                        <span className="text-[8px] text-rose-450 font-bold uppercase tracking-wider font-mono">Failed MPE</span>
                        <span className="text-sm font-black text-rose-500 font-mono mt-0.5 flex items-center gap-1.5">
                          {measurements.filter(m => m.tolerance && Math.abs(m.deviation) > Number(m.tolerance)).length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                          )}
                          {measurements.filter(m => m.tolerance && Math.abs(m.deviation) > Number(m.tolerance)).length}
                        </span>
                        <div className="absolute top-0 right-0 w-1 h-full bg-rose-500" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 bg-slate-950/60 p-5 rounded-2xl border border-slate-850 relative z-10">
                    {/* Resolution Bulk */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#b38728] uppercase tracking-[0.15em] font-mono block leading-none">
                        Resolusi (u₁)
                      </label>
                      <div className="flex gap-2 relative">
                        <input
                          type="number"
                          step="any"
                          value={bulkRes}
                          onChange={(e) => setBulkRes(e.target.value)}
                          placeholder="e.g., 0.01"
                          className="bg-slate-900 border border-slate-800/80 focus:border-[#b38728]/50 rounded-xl px-3.5 py-2 text-xs font-black text-slate-100 font-mono focus:bg-slate-950 focus:ring-1 focus:ring-[#b38728]/20 outline-none w-full transition-all placeholder:text-slate-650"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkRes) return;
                            const resNum = Number(bulkRes);
                            const newM = measurements.map((m) => {
                              const updated = { ...m, resolution: resNum };
                              updated.uncertainty = calculateUncertainty(resNum, updated.masterUnc || 0.001, updated.drift || 0, updated);
                              return updated;
                            });
                            setMeasurements(newM);
                            showToast("Resolusi berhasil diterapkan ke seluruh baris!", "success");
                          }}
                          className="bg-gradient-to-r from-slate-850 to-slate-900 hover:from-[#b38728] hover:to-[#aa771c] hover:text-slate-950 border border-slate-800 hover:border-transparent text-slate-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 shadow-md active:scale-95"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>

                    {/* Master Uncertainty Bulk */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#b38728] uppercase tracking-[0.15em] font-mono block leading-none">
                        M.Unc (u₂)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={bulkMUnc}
                          onChange={(e) => setBulkMUnc(e.target.value)}
                          placeholder="e.g., 0.001"
                          className="bg-slate-900 border border-slate-800/80 focus:border-[#b38728]/50 rounded-xl px-3.5 py-2 text-xs font-black text-slate-100 font-mono focus:bg-slate-950 focus:ring-1 focus:ring-[#b38728]/20 outline-none w-full transition-all placeholder:text-slate-650"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkMUnc) return;
                            const uncNum = Number(bulkMUnc);
                            const newM = measurements.map((m) => {
                              const updated = { ...m, masterUnc: uncNum };
                              updated.uncertainty = calculateUncertainty(updated.resolution || 0.01, uncNum, updated.drift || 0, updated);
                              return updated;
                            });
                            setMeasurements(newM);
                            showToast("Master Uncertainty berhasil diterapkan ke seluruh baris!", "success");
                          }}
                          className="bg-gradient-to-r from-slate-850 to-slate-900 hover:from-[#b38728] hover:to-[#aa771c] hover:text-slate-950 border border-slate-800 hover:border-transparent text-slate-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 shadow-md active:scale-95"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>

                    {/* Drift Bulk */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#b38728] uppercase tracking-[0.15em] font-mono block leading-none">
                        Drift (u₄)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={bulkDrift}
                          onChange={(e) => setBulkDrift(e.target.value)}
                          placeholder="e.g., 0.002"
                          className="bg-slate-900 border border-slate-800/80 focus:border-[#b38728]/50 rounded-xl px-3.5 py-2 text-xs font-black text-slate-100 font-mono focus:bg-slate-950 focus:ring-1 focus:ring-[#b38728]/20 outline-none w-full transition-all placeholder:text-slate-650"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (bulkDrift === "") return;
                            const driftNum = Number(bulkDrift);
                            const newM = measurements.map((m) => {
                              const updated = { ...m, drift: driftNum };
                              updated.uncertainty = calculateUncertainty(updated.resolution || 0.01, updated.masterUnc || 0.001, driftNum, updated);
                              return updated;
                            });
                            setMeasurements(newM);
                            showToast("Drift instabilitas berhasil diterapkan ke seluruh baris!", "success");
                          }}
                          className="bg-gradient-to-r from-slate-850 to-slate-900 hover:from-[#b38728] hover:to-[#aa771c] hover:text-slate-950 border border-slate-800 hover:border-transparent text-slate-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 shadow-md active:scale-95"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>

                    {/* MPE Tolerance Bulk */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-[#b38728] uppercase tracking-[0.15em] font-mono block leading-none">
                        Toleransi MPE
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          step="any"
                          value={bulkTol}
                          onChange={(e) => setBulkTol(e.target.value)}
                          placeholder="e.g., 1.5"
                          className="bg-slate-900 border border-slate-800/80 focus:border-[#b38728]/50 rounded-xl px-3.5 py-2 text-xs font-black text-slate-100 font-mono focus:bg-slate-950 focus:ring-1 focus:ring-[#b38728]/20 outline-none w-full transition-all placeholder:text-slate-650"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!bulkTol) return;
                            const tolNum = Number(bulkTol);
                            const newM = measurements.map((m) => {
                              const updated = { ...m, tolerance: tolNum };
                              updated.uncertainty = calculateUncertainty(updated.resolution || 0.01, updated.masterUnc || 0.001, updated.drift || 0, updated);
                              return updated;
                            });
                            setMeasurements(newM);
                            showToast("Toleransi MPE berhasil diterapkan ke seluruh baris!", "success");
                          }}
                          className="bg-gradient-to-r from-slate-850 to-slate-900 hover:from-[#b38728] hover:to-[#aa771c] hover:text-slate-950 border border-slate-800 hover:border-transparent text-slate-300 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 shrink-0 shadow-md active:scale-95"
                        >
                          Terapkan
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 relative z-10">
                    <span className="font-extrabold text-[11px] flex items-center gap-2 text-slate-450 font-mono">
                      <Info className="w-4 h-4 text-[#b38728]" />
                      Tips: Isi parameter pembagi di atas dan klik "Terapkan" atau "Terapkan Semua Sekaligus" di samping.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const resNum = Number(bulkRes) || 0.01;
                        const uncNum = Number(bulkMUnc) || 0.001;
                        const driftNum = Number(bulkDrift) || 0;
                        const tolNum = bulkTol !== "" ? Number(bulkTol) : undefined;
                        
                        const newM = measurements.map((m) => {
                          const updated = {
                            ...m,
                            resolution: resNum,
                            masterUnc: uncNum,
                            drift: driftNum,
                            ...(tolNum !== undefined ? { tolerance: tolNum } : {})
                          };
                          updated.uncertainty = calculateUncertainty(resNum, uncNum, driftNum, updated);
                          return updated;
                        });
                        setMeasurements(newM);
                        showToast("Seluruh komponen metrologi statis berhasil disebarkan secara massal!", "success");
                      }}
                      className="bg-gradient-to-r from-amber-400 via-amber-550 to-[#b38728] hover:from-amber-500 hover:to-amber-600 text-slate-950 hover:text-white font-black text-[10px] uppercase tracking-[0.15em] px-7 py-3 rounded-2xl transition-all duration-300 shadow-[0_4px_20px_rgba(212,175,55,0.25)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-95"
                    >
                      🔮 Terapkan Seluruh Metrologis
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditMetrologyMode(!editMetrologyMode)}
                      className={cn(
                        "flex items-center gap-2 px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border shadow-sm",
                        editMetrologyMode
                          ? "bg-[#b38728]/15 border-[#b38728]/40 text-[#b38728] hover:bg-[#b38728]/25"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      {editMetrologyMode ? "🔒 Kunci Parameter" : "🔓 Edit Parameter"}
                    </button>
                  </div>
                </div>
                )}

                {/* Mobile Scroll Indicator Helper Badge */}
                <div className="lg:hidden flex items-center justify-between bg-blue-500/10 dark:bg-cyan-500/5 border border-blue-500/20 dark:border-cyan-500/15 rounded-xl px-4 py-2.5 mb-3 text-[9px] font-mono font-bold text-blue-600 dark:text-cyan-450">
                  <span className="flex items-center gap-1.5 animate-pulse">
                    <Activity className="w-3 h-3 text-blue-550 dark:text-cyan-400" />
                    <span>TABEL DATA UKUR ISO/IEC 17025</span>
                  </span>
                  <span>Geser Kiri/Kanan ↔️</span>
                </div>

                <div className="overflow-x-auto pb-3 p-1 scroll-smooth snap-x touch-pan-x scrollbar-thin scrollbar-thumb-amber-500/25 scrollbar-track-transparent rounded-2xl border border-slate-200/50 dark:border-slate-800/40 bg-white/50 dark:bg-[#060a1a]/90 shadow-sm">
                  <table className={cn("table-data-ukur w-full text-left border-collapse", editMetrologyMode ? "min-w-[1600px] xl:min-w-[1850px]" : "min-w-[1100px] xl:min-w-[1300px]")}>
                    <thead className="text-[10.5px] uppercase tracking-[0.1em] font-extrabold font-mono bg-slate-50/80 dark:bg-[#040816] text-slate-600 dark:text-[#b38728] border-b border-slate-200/60 dark:border-slate-800/60">
                      {/* Premium Dual-Row Header Groups */}
                      <tr className="bg-slate-100/50 dark:bg-slate-950/70 border-b border-slate-200/40 dark:border-slate-850/40 text-[9px] uppercase tracking-[0.15em] font-black text-slate-400 dark:text-slate-500 select-none">
                        <th colSpan={editMetrologyMode ? 3 : 2} className="px-3 py-2 text-center border-r border-slate-200/40 dark:border-slate-850/40 bg-slate-50/20 dark:bg-slate-900/5">
                          📋 {editMetrologyMode ? "Spesifikasi & Resolusi" : "Spesifikasi Alat"}
                        </th>
                        {editMetrologyMode && (
                          <th 
                            colSpan={(() => {
                              let base = 2; // masterUnc and drift
                              const m = identityData.uncMethod || "standard";
                              if (m === "timbangan" || m === "gas_flow") base += 3;
                              else if (m === "radiologi" || m === "dosis_radiasi" || m === "listrik_medis" || m === "terapi_energi") base += 1;
                              else if (m === "standard") base += 0;
                              else base += 2;
                              return base;
                            })()} 
                            className="px-3 py-2 text-center border-r border-slate-200/40 dark:border-slate-850/40 bg-[#b38728]/5 text-[#b38728]/80"
                          >
                            🔮 Parameter Kalibrator (Metrologi)
                          </th>
                        )}
                        <th colSpan={editMetrologyMode ? 6 : 4} className="px-3 py-2 text-center border-r border-slate-200/40 dark:border-slate-850/40 bg-cyan-500/5 text-cyan-600 dark:text-cyan-400">
                          ✨ Live Data Ukur & Hasil Akhir
                        </th>
                        <th className="px-3 py-2 text-center">
                          ⚙️
                        </th>
                      </tr>
                      <tr>
                        <th className="px-3 py-2.5 min-w-[150px] font-bold text-left border-r border-slate-200/50 dark:border-slate-800/40">
                          Parameter
                        </th>
                        <th className="px-3 py-2.5 w-32 font-bold text-center border-r border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300">Titik Ukur & Unit</th>
                        {editMetrologyMode && (
                          <>
                            <th className="px-2 py-2.5 w-24 text-center font-bold border-r border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300">Res (u₁)</th>
                            <th className="px-2 py-2.5 w-24 text-center font-bold border-r border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
                              Unc Master (u₂)
                            </th>
                            <th className="px-2 py-2.5 w-24 text-center font-bold border-r border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300 font-mono">
                              Drift (u₄)
                            </th>
                            {identityData.uncMethod === "timbangan" && (
                              <>
                                <th className="px-2 py-2 w-20 text-center text-blue-600">
                                  Eks. (u<sub>ecc</sub>)
                                </th>
                                <th className="px-2 py-2 w-20 text-center text-blue-600">
                                  Lin. (u<sub>lin</sub>)
                                </th>
                                <th className="px-2 py-2 w-20 text-center text-blue-600">
                                  SD (u₃)
                                </th>
                              </>
                            )}
                            {(identityData.uncMethod === "suhu" ||
                              identityData.uncMethod === "kelembaban") && (
                              <>
                                <th className="px-2 py-2 w-20 text-center text-emerald-600 font-bold">
                                  Stab. (u<sub>stab</sub>)
                                </th>
                                <th className="px-2 py-2 w-20 text-center text-emerald-600 font-bold">
                                  Unif. (u<sub>unif</sub>)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "tekanan" && (
                              <>
                                <th className="px-2 py-2 w-20 text-center text-cyan-600">
                                  Hist. (u<sub>hyst</sub>)
                                </th>
                                <th className="px-2 py-2 w-20 text-center text-cyan-600">
                                  Zero (u<sub>zero</sub>)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "volume_flow" && (
                              <>
                                <th className="px-2 py-2 w-24 text-center text-indigo-600">
                                  Volume V / uV
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-indigo-600">
                                  Waktu t / ut
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "gas_flow" && (
                              <>
                                <th className="px-2 py-2 w-24 text-center text-orange-600">
                                  Raw Flow (Q)
                                </th>
                                <th className="px-2 py-2 w-20 text-center text-orange-600">
                                  Tekanan P
                                </th>
                                <th className="px-2 py-2 w-20 text-center text-orange-600">
                                  Suhu T
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "laboratorium" && (
                              <>
                                <th className="px-2 py-2 w-32 text-center text-purple-600">
                                  Metode Lab
                                </th>
                                <th className="px-2 py-2 w-40 text-center text-purple-600">
                                  Parameter Khusus
                                </th>
                              </>
                            )}
                            {(identityData.uncMethod === "radiologi" ||
                              identityData.uncMethod === "dosis_radiasi") && (
                              <>
                                <th className="px-2 py-2 w-44 text-center text-rose-600">
                                  Kalkulator Radiologi
                                </th>
                              </>
                            )}
                            {(identityData.uncMethod === "listrik_medis" ||
                              identityData.uncMethod === "terapi_energi") && (
                              <>
                                <th className="px-2 py-2 w-44 text-center text-amber-600">
                                  Kalkulator Medis
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "waktu_frekuensi" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-blue-600">
                                  Jitter (u<sub>jitter</sub>)
                                </th>
                                <th className="px-2 py-2 w-28 text-center text-blue-600">
                                  SD (u₃)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "kecepatan_putar" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-emerald-600">
                                  Waktu t / u_t
                                </th>
                                <th className="px-2 py-2 w-28 text-center text-emerald-600">
                                  SD (u₃)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "cahaya_fotometri" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-violet-600">
                                  Jarak r (m)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-violet-600 font-mono">
                                  uDistance
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "akustik_suara" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-rose-600">
                                  Ambient (dB)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-rose-600 font-mono">
                                  uFreq
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "gaya_beban_torsi" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-amber-600">
                                  Lengan Mo (m)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-amber-600 font-mono">
                                  u_Arm
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "dimensi_panjang" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-lime-600">
                                  Suhu T (°C)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-lime-600 font-mono">
                                  Linearitas
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "optik" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-indigo-600">
                                  Refr. Index (n)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-indigo-600 font-mono">
                                  SD (u₃)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "kimia_analitik" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-teal-600 font-bold">
                                  Buffer Unc
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-teal-600 font-bold font-mono">
                                  Slope Unc
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "gas_medis_konsentrasi" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-orange-600">
                                  Gas Temp (°C)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-orange-600 font-mono">
                                  Gas Press (P)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "keselamatan_kerja" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-indigo-600">
                                  Air Speed
                                </th>
                                <th className="px-2 py-2 w-28 text-center text-indigo-600 font-mono">
                                  Area (m²)
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "sterilisasi" && (
                              <>
                                <th className="px-2 py-2 w-28 text-center text-fuchsia-600 font-bold">
                                  Stab. (u<sub>stab</sub>)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-fuchsia-600 font-bold font-mono">
                                  Autoclave P
                                </th>
                              </>
                            )}
                            {identityData.uncMethod === "monitoring_pasien" && (
                              <>
                                <th className="px-2 py-2 w-32 text-center text-cyan-600 font-bold">
                                  Sim. Unc (u_sim)
                                </th>
                                <th className="px-2 py-2 w-24 text-center text-cyan-600 font-bold font-mono">
                                  SD (u₃)
                                </th>
                              </>
                            )}
                          </>
                        )}
                        <th className="px-2 py-2 text-right w-24">Nilai Terukur</th>
                        <th className="px-2 py-2 w-20 text-center">Penyimpangan</th>
                        <th className="px-2 py-2 w-20 text-center">MPE / Tol.</th>
                        <th className="px-2 py-2 w-24 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span>U95 (k=2)</span>
                            <button
                              type="button"
                              onClick={() => setShowFormulaModal(true)}
                              className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-blue-500 transition-colors"
                              title="Lihat Rumus Spesifik Alat"
                            >
                              <Info className="w-3 h-3" />
                            </button>
                          </div>
                        </th>
                        {editMetrologyMode && (
                          <>
                            <th className="px-2 py-2 w-20 text-center text-indigo-600 font-bold">
                              CMC Lab
                            </th>
                            <th className="px-2 py-2 w-20 text-center text-indigo-600 font-bold">
                              TUR/TAR
                            </th>
                          </>
                        )}
                        <th className="px-4 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white/50 dark:bg-[#070c1d]/40">
                      {measurements.map((m, idx) => {
                        const isActualFilled = m.actual !== undefined && m.actual !== null && String(m.actual).trim() !== "";
                        const hasTolerance = m.tolerance !== undefined && m.tolerance !== null && String(m.tolerance).trim() !== "";
                        const isOut = isActualFilled && hasTolerance && Math.abs(m.deviation) > Number(m.tolerance);
                        const isValid = isActualFilled && hasTolerance && Math.abs(m.deviation) <= Number(m.tolerance);

                        return (
                          <tr
                            key={idx}
                            className={cn(
                              "group hover:bg-slate-100/50 dark:hover:bg-white/5 hover:shadow-inner transition-all duration-300",
                              isOut
                                ? "bg-red-500/[0.03] dark:bg-red-950/20"
                                : "",
                            )}
                          >

                            {/* parameterName: always inline-editable – double-click/focus to rename */}
                            <td className="px-2 py-1.5 border-r border-b border-slate-200/40 dark:border-slate-850/45 bg-slate-50/[0.05] dark:bg-slate-900/[0.02] group/pname">
                              <input
                                type="text"
                                id={`input-parameterName-${idx}`}
                                aria-label={`Nama Parameter Baris ${idx + 1}`}
                                onKeyDown={(e) => handleTableKeyDown(e, idx, 'parameterName')}
                                value={m.parameterName || ""}
                                placeholder="Nama parameter..."
                                title="Klik untuk mengganti nama parameter"
                                onChange={(e) => {
                                  const newM = [...measurements];
                                  newM[idx].parameterName = e.target.value;
                                  autoFillFromCalibrator(newM, idx, newM[idx].point, e.target.value);
                                  setMeasurements(newM);
                                }}
                                className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-[#b38728] dark:focus:border-[#b38728] focus:bg-white dark:focus:bg-[#040816] rounded-md px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 font-sans cursor-pointer focus:cursor-text"
                              />
                            </td>

                            {editMetrologyMode ? (
                              <td className="px-2 py-1.5 border-r border-b border-slate-200/60 dark:border-slate-800/55 bg-white/40 dark:bg-slate-900/30">
                                <div className="flex items-center gap-1 justify-center">
                                  <input
                                    type="number"
                                    id={`input-point-${idx}`}
                                    aria-label={`Titik Ukur Baris ${idx + 1}`}
                                    onKeyDown={(e) => handleTableKeyDown(e, idx, 'point')}
                                    step="any"
                                    value={m.point}
                                    title={`Titik Ukur Baris ${idx + 1}`}
                                    placeholder="Titik"
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      const pt = Number(e.target.value);
                                      newM[idx].point = pt;
                                      autoFillFromCalibrator(newM, idx, pt, newM[idx].parameterName);
                                      setMeasurements(newM);
                                    }}
                                    className="w-20 bg-transparent hover:bg-slate-50 focus:bg-white dark:hover:bg-slate-900/60 dark:focus:bg-[#040816] border border-slate-200 focus:border-[#b38728] dark:border-slate-800/80 dark:focus:border-[#b38728] rounded-md px-2 py-1 text-xs font-bold text-slate-900 dark:text-slate-100 outline-none transition-all font-mono text-center"
                                  />
                                  <input
                                    type="text"
                                    id={`input-unit-${idx}`}
                                    aria-label={`Satuan Baris ${idx + 1}`}
                                    onKeyDown={(e) => handleTableKeyDown(e, idx, 'unit')}
                                    value={m.unit ? (m.unit.toLowerCase() === 'mmhg' ? 'mmHg' : m.unit) : ""}
                                    placeholder="Unit"
                                    title={`Satuan Baris ${idx + 1}`}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].unit = e.target.value;
                                      setMeasurements(newM);
                                    }}
                                    className="w-14 bg-transparent hover:bg-slate-50 focus:bg-white dark:hover:bg-slate-900/60 dark:focus:bg-[#040816] border border-slate-200 focus:border-[#b38728] dark:border-slate-800/80 dark:focus:border-[#b38728] rounded-md px-2 py-1 text-xs text-slate-650 dark:text-[#b38728]/90 font-black outline-none transition-all font-mono text-center"
                                  />
                                </div>
                              </td>
                            ) : (
                              <td className="px-3 py-2 border-r border-b border-slate-200/40 dark:border-slate-850/45 bg-slate-50/[0.08] dark:bg-slate-900/[0.02] text-center">
                                <div className="inline-flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/40 dark:border-slate-800/50 px-2.5 py-1 rounded-xl shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]">
                                  <span className="text-slate-900 dark:text-slate-100 font-mono font-black text-xs">{m.point}</span>
                                  <span className="text-[#b38728] dark:text-[#b38728] font-bold text-[9.5px] uppercase tracking-wider">{m.unit ? (m.unit.toLowerCase() === 'mmhg' ? 'mmHg' : m.unit) : "—"}</span>
                                </div>
                              </td>
                            )}

                            {editMetrologyMode && (
                              <td className="px-2 py-1.5 border-r border-b border-slate-200/60 dark:border-slate-800/55 bg-white/40 dark:bg-slate-900/30">
                                <input
                                  type="number"
                                  id={`input-resolution-${idx}`}
                                  aria-label={`Resolusi Baris ${idx + 1}`}
                                  onKeyDown={(e) => handleTableKeyDown(e, idx, 'resolution')}
                                  step="0.001"
                                  value={m.resolution || 0.01}
                                  title={`Resolusi Baris ${idx + 1}`}
                                  placeholder="Resolusi"
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    const res = Number(e.target.value);
                                    newM[idx].resolution = res;
                                    newM[idx].uncertainty = calculateUncertainty(
                                      res,
                                      newM[idx].masterUnc || 0.001,
                                      newM[idx].drift || 0,
                                      newM[idx],
                                    );
                                    setMeasurements(newM);
                                  }}
                                  className="w-18 bg-transparent hover:bg-slate-50 focus:bg-white dark:hover:bg-slate-900/60 dark:focus:bg-[#040816] border border-slate-200 focus:border-[#b38728] dark:border-slate-800/80 dark:focus:border-[#b38728] rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all font-mono text-center"
                                />
                              </td>
                            )}

                            {editMetrologyMode && (
                              <td className="px-2 py-1.5 border-r border-b border-slate-200/60 dark:border-slate-800/55 bg-white/40 dark:bg-slate-900/30">
                                <input
                                  type="number"
                                  id={`input-masterUnc-${idx}`}
                                  aria-label={`Uncertainty Master Baris ${idx + 1}`}
                                  onKeyDown={(e) => handleTableKeyDown(e, idx, 'masterUnc')}
                                  step="0.0001"
                                  value={m.masterUnc || 0.001}
                                  title={`Master Uncertainty Baris ${idx + 1}`}
                                  placeholder="M.Unc"
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    const mUnc = Number(e.target.value);
                                    newM[idx].masterUnc = mUnc;
                                    newM[idx].uncertainty = calculateUncertainty(
                                      newM[idx].resolution || 0.01,
                                      mUnc,
                                      newM[idx].drift || 0,
                                      newM[idx],
                                    );
                                    setMeasurements(newM);
                                  }}
                                  className="w-18 bg-transparent hover:bg-slate-50 focus:bg-white dark:hover:bg-slate-900/60 dark:focus:bg-[#040816] border border-slate-200 focus:border-[#b38728] dark:border-slate-800/80 dark:focus:border-[#b38728] rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all font-mono text-center"
                                />
                              </td>
                            )}

                            {editMetrologyMode && (
                              <td className="px-2 py-1.5 border-r border-b border-slate-200/60 dark:border-slate-800/55 bg-white/40 dark:bg-slate-900/30">
                                <input
                                  type="number"
                                  id={`input-drift-${idx}`}
                                  aria-label={`Drift Baris ${idx + 1}`}
                                  onKeyDown={(e) => handleTableKeyDown(e, idx, 'drift')}
                                  step="0.0001"
                                  value={m.drift || 0}
                                  title={`Drift Baris ${idx + 1}`}
                                  placeholder="Drift"
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    const drift = Number(e.target.value);
                                    newM[idx].drift = drift;
                                    newM[idx].uncertainty = calculateUncertainty(
                                      newM[idx].resolution || 0.01,
                                      newM[idx].masterUnc || 0.001,
                                      drift,
                                      newM[idx],
                                    );
                                    setMeasurements(newM);
                                  }}
                                  className="w-18 bg-transparent hover:bg-slate-50 focus:bg-white dark:hover:bg-slate-900/60 dark:focus:bg-[#040816] border border-slate-200 focus:border-[#b38728] dark:border-slate-800/80 dark:focus:border-[#b38728] rounded-md px-1.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none transition-all font-mono text-center"
                                />
                              </td>
                            )}

                          {editMetrologyMode && (
                            <>
                              {identityData.uncMethod === "timbangan" && (
                            <>
                              <td className="px-2 py-1.5 bg-blue-50/10">
                                <input
                                  type="number"
                                  step="0.0001"
                                  placeholder="Eks"
                                  value={m.eccentricity ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].eccentricity = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-blue-600 font-mono text-center font-bold"
                                />
                              </td>
                              <td className="px-2 py-1.5 bg-blue-50/10">
                                <input
                                  type="number"
                                  step="0.0001"
                                  placeholder="Lin"
                                  value={m.linearity ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].linearity = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-blue-600 font-mono text-center font-bold"
                                />
                              </td>
                              <td className="px-2 py-1.5 bg-blue-50/10">
                                <input
                                  type="number"
                                  step="0.0001"
                                  placeholder="SD"
                                  value={m.sd ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].sd = Number(e.target.value);
                                    newM[idx].n = newM[idx].n || 3;
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-blue-600 font-mono text-center font-bold"
                                />
                              </td>
                            </>
                          )}

                          {(identityData.uncMethod === "suhu" ||
                            identityData.uncMethod === "kelembaban") && (
                            <>
                              <td className="px-6 py-4 bg-emerald-50/10">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="Stab"
                                  value={m.stability ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].stability = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-emerald-600 font-mono text-center font-bold"
                                />
                              </td>
                              <td className="px-6 py-4 bg-emerald-50/10">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="Unif"
                                  value={m.uniformity ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].uniformity = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-emerald-600 font-mono text-center font-bold"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "tekanan" && (
                            <>
                              <td className="px-6 py-4 bg-cyan-50/10">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="Hyst"
                                  value={m.histeresis ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].histeresis = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-cyan-600 font-mono text-center font-bold"
                                />
                              </td>
                              <td className="px-6 py-4 bg-cyan-50/10">
                                <input
                                  type="number"
                                  step="0.001"
                                  placeholder="Zero"
                                  value={m.zero ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].zero = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-cyan-600 font-mono text-center font-bold"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "volume_flow" && (
                            <>
                              <td className="px-6 py-4 bg-indigo-50/10">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    placeholder="V"
                                    value={m.volumeVal ?? 100}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].volumeVal = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-10 focus:border-indigo-500 outline-none text-center font-mono"
                                  />
                                  <input
                                    type="number"
                                    placeholder="uV"
                                    value={m.uVolume ?? 0.5}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].uVolume = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-8 focus:border-indigo-500 outline-none text-center font-mono text-indigo-500"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 bg-indigo-50/10">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    placeholder="t"
                                    value={m.timeVal ?? 60}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].timeVal = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-10 focus:border-indigo-500 outline-none text-center font-mono"
                                  />
                                  <input
                                    type="number"
                                    placeholder="ut"
                                    value={m.uTime ?? 0.1}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].uTime = Number(e.target.value);
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-8 focus:border-indigo-500 outline-none text-center font-mono text-indigo-500"
                                  />
                                </div>
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "gas_flow" && (
                            <>
                              <td className="px-6 py-4 bg-orange-50/10">
                                <span className="text-xs font-mono font-bold text-slate-700">
                                  Q = {m.actual ?? 10}
                                </span>
                              </td>
                              <td className="px-6 py-4 bg-orange-50/10">
                                <input
                                  type="number"
                                  placeholder="Prs"
                                  value={m.gasPress ?? 1013}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].gasPress = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-14 focus:border-blue-500 outline-none text-center font-mono"
                                />
                              </td>
                              <td className="px-6 py-4 bg-orange-50/10">
                                <input
                                  type="number"
                                  placeholder="Temp"
                                  value={m.gasTemp ?? 25}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].gasTemp = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "laboratorium" && (
                            <>
                              <td className="px-6 py-4 bg-purple-50/10">
                                <select
                                  value={m.labType || "ph_meter"}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].labType = e.target.value;
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  title={`Tipe Laboratorium Baris ${idx + 1}`}
                                  aria-label={`Tipe Laboratorium Baris ${idx + 1}`}
                                  className="bg-white border border-slate-200 rounded-lg px-1 py-0.5 text-[9px] outline-none text-purple-700"
                                >
                                  <option value="ph_meter">pH Meter</option>
                                  <option value="centrifuge">Centrifuge</option>
                                  <option value="micropipette">Pipette</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 bg-purple-50/10">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    step="0.001"
                                    placeholder="Buffer"
                                    value={m.pHBufferUnc ?? 0.01}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].pHBufferUnc = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-12 focus:border-purple-500 outline-none text-center font-mono"
                                  />
                                  <input
                                    type="number"
                                    step="0.001"
                                    placeholder="Slope"
                                    value={m.pHSlopeUnc ?? 0.005}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].pHSlopeUnc = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-12 focus:border-purple-500 outline-none text-center font-mono"
                                  />
                                </div>
                              </td>
                            </>
                          )}

                          {(identityData.uncMethod === "radiologi" ||
                            identityData.uncMethod === "dosis_radiasi") && (
                            <>
                              <td className="px-6 py-4 bg-rose-50/10">
                                <div className="flex gap-1 items-center">
                                  <input
                                    type="number"
                                    placeholder="Dist cm"
                                    value={m.distanceD ?? 100}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].distanceD = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-14 focus:border-rose-500 outline-none text-center font-bold"
                                  />
                                  <input
                                    type="number"
                                    placeholder="uKvp"
                                    value={m.uKvp ?? 1.5}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].uKvp = Number(e.target.value);
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-10 focus:border-rose-500 outline-none text-center font-mono text-rose-500"
                                  />
                                </div>
                              </td>
                            </>
                          )}

                          {(identityData.uncMethod === "listrik_medis" ||
                            identityData.uncMethod === "terapi_energi") && (
                            <>
                              <td className="px-6 py-4 bg-amber-50/10">
                                <div className="flex gap-1 items-center">
                                  <input
                                    type="number"
                                    placeholder="Volt V"
                                    value={m.voltageV ?? 220}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].voltageV = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-12 focus:border-amber-500 outline-none text-center"
                                  />
                                  <input
                                    type="number"
                                    placeholder="Cur I"
                                    value={m.currentI ?? 10}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].currentI = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-10 focus:border-amber-500 outline-none text-center"
                                  />
                                  {identityData.uncMethod ===
                                    "terapi_energi" && (
                                    <input
                                      type="number"
                                      placeholder="Load R"
                                      value={m.impedance ?? 50}
                                      onChange={(e) => {
                                        const newM = [...measurements];
                                        newM[idx].impedance = Number(
                                          e.target.value,
                                        );
                                        newM[idx].uncertainty =
                                          calculateUncertainty(
                                            newM[idx].resolution || 0.01,
                                            newM[idx].masterUnc || 0.001,
                                            newM[idx].drift || 0,
                                            newM[idx],
                                          );
                                        setMeasurements(newM);
                                      }}
                                      className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-10 focus:border-amber-500 outline-none text-center font-bold text-amber-600"
                                    />
                                  )}
                                </div>
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "waktu_frekuensi" && (
                            <>
                              <td className="px-2 py-1.5 bg-blue-50/10">
                                <input
                                  type="number"
                                  step="0.0001"
                                  placeholder="Jitter"
                                  value={m.jitter ?? 0.005}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].jitter = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-14 focus:border-blue-500 outline-none text-center font-mono"
                                />
                              </td>
                              <td className="px-2 py-1.5 bg-blue-50/10">
                                <input
                                  type="number"
                                  step="0.0001"
                                  placeholder="SD"
                                  value={m.sd ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].sd = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-blue-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "kecepatan_putar" && (
                            <>
                              <td className="px-6 py-4 bg-emerald-50/10">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    placeholder="Sec"
                                    value={m.timeVal ?? 60}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].timeVal = Number(
                                        e.target.value,
                                      );
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-10 focus:border-emerald-500 outline-none text-center"
                                  />
                                  <input
                                    type="number"
                                    placeholder="uTime"
                                    value={m.uTime ?? 0.1}
                                    onChange={(e) => {
                                      const newM = [...measurements];
                                      newM[idx].uTime = Number(e.target.value);
                                      newM[idx].uncertainty =
                                        calculateUncertainty(
                                          newM[idx].resolution || 0.01,
                                          newM[idx].masterUnc || 0.001,
                                          newM[idx].drift || 0,
                                          newM[idx],
                                        );
                                      setMeasurements(newM);
                                    }}
                                    className="bg-white border border-slate-200 rounded-lg px-1 text-[9px] w-8 focus:border-emerald-500 outline-none text-center text-emerald-500"
                                  />
                                </div>
                              </td>
                              <td className="px-6 py-4 bg-emerald-50/10">
                                <input
                                  type="number"
                                  placeholder="SD"
                                  value={m.sd ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].sd = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-emerald-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "cahaya_fotometri" && (
                            <>
                              <td className="px-6 py-4 bg-violet-50/10">
                                <input
                                  type="number"
                                  placeholder="Dist"
                                  value={m.distanceD ?? 1}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].distanceD = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-violet-500 outline-none text-center font-mono"
                                />
                              </td>
                              <td className="px-6 py-4 bg-violet-50/10">
                                <input
                                  type="number"
                                  placeholder="uDist"
                                  value={m.uDistance ?? 0.01}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].uDistance = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-violet-500 outline-none text-center font-mono text-violet-500"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "akustik_suara" && (
                            <>
                              <td className="px-6 py-4 bg-rose-50/10">
                                <input
                                  type="number"
                                  placeholder="Noise"
                                  value={m.ambientNoise ?? 30}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].ambientNoise = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-rose-500 outline-none text-center font-mono text-rose-600"
                                />
                              </td>
                              <td className="px-6 py-4 bg-rose-50/10">
                                <input
                                  type="number"
                                  placeholder="uFreq"
                                  value={m.uFreq ?? 0.1}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].uFreq = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-rose-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "gaya_beban_torsi" && (
                            <>
                              <td className="px-6 py-4 bg-amber-50/10">
                                <input
                                  type="number"
                                  placeholder="Arm"
                                  value={m.armLength ?? 0.25}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].armLength = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-amber-500 outline-none text-center font-mono text-amber-600"
                                />
                              </td>
                              <td className="px-6 py-4 bg-amber-50/10">
                                <input
                                  type="number"
                                  placeholder="uArm"
                                  value={m.uArm ?? 0.001}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].uArm = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-amber-500 outline-none text-center font-mono text-amber-500"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "dimensi_panjang" && (
                            <>
                              <td className="px-6 py-4 bg-lime-50/10">
                                <input
                                  type="number"
                                  placeholder="Temp"
                                  value={m.temperature ?? 20}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].temperature = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-lime-500 outline-none text-center font-mono text-lime-700"
                                />
                              </td>
                              <td className="px-6 py-4 bg-lime-50/10">
                                <input
                                  type="number"
                                  placeholder="Lin"
                                  value={m.linearity ?? 0.01}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].linearity = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-lime-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "optik" && (
                            <>
                              <td className="px-6 py-4 bg-indigo-50/10">
                                <input
                                  type="number"
                                  placeholder="Index"
                                  value={m.refractiveIndex ?? 1.5}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].refractiveIndex = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-indigo-500 outline-none text-center font-mono text-indigo-700"
                                />
                              </td>
                              <td className="px-6 py-4 bg-indigo-50/10">
                                <input
                                  type="number"
                                  placeholder="SD"
                                  value={m.sd ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].sd = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-indigo-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "kimia_analitik" && (
                            <>
                              <td className="px-6 py-4 bg-teal-50/10">
                                <input
                                  type="number"
                                  placeholder="Buf"
                                  value={m.pHBufferUnc ?? 0.01}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].pHBufferUnc = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-teal-500 outline-none text-center font-mono"
                                />
                              </td>
                              <td className="px-6 py-4 bg-teal-50/10">
                                <input
                                  type="number"
                                  placeholder="Slp"
                                  value={m.pHSlopeUnc ?? 0.005}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].pHSlopeUnc = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-teal-500 outline-none text-center font-mono text-teal-600"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod ===
                            "gas_medis_konsentrasi" && (
                            <>
                              <td className="px-6 py-4 bg-orange-50/10">
                                <input
                                  type="number"
                                  placeholder="Temp"
                                  value={m.gasTemp ?? 25}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].gasTemp = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-orange-500 outline-none text-center font-mono"
                                />
                              </td>
                              <td className="px-6 py-4 bg-orange-50/10">
                                <input
                                  type="number"
                                  placeholder="Prs"
                                  value={m.gasPress ?? 1013}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].gasPress = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-14 focus:border-orange-500 outline-none text-center font-mono text-orange-600"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "keselamatan_kerja" && (
                            <>
                              <td className="px-6 py-4 bg-indigo-50/10 animate-pulse">
                                <input
                                  type="number"
                                  placeholder="V m/s"
                                  value={m.airSpeed ?? 0.5}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].airSpeed = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-300 rounded-lg px-1 text-[9px] w-14 focus:border-indigo-600 outline-none text-center font-bold text-indigo-900"
                                />
                              </td>
                              <td className="px-6 py-4 bg-indigo-50/10 animate-pulse">
                                <input
                                  type="number"
                                  placeholder="Area A"
                                  value={m.areaVal ?? 1.2}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].areaVal = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-300 rounded-lg px-1 text-[9px] w-14 focus:border-indigo-600 outline-none text-center font-mono text-indigo-900"
                                />
                              </td>
                            </>
                          )}

                          {identityData.uncMethod === "sterilisasi" && (
                            <>
                              <td className="px-6 py-4 bg-fuchsia-50/10">
                                <input
                                  type="number"
                                  placeholder="Stab"
                                  value={m.stability ?? 0.05}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].stability = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-fuchsia-500 outline-none text-center font-mono text-fuchsia-600"
                                />
                              </td>
                              <td className="px-6 py-4 bg-fuchsia-50/10">
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="Auto P"
                                  value={m.autoclaveP ?? 1.2}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].autoclaveP = Number(
                                      e.target.value,
                                    );
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-white border border-slate-200 rounded-lg px-1 text-[10px] w-12 focus:border-fuchsia-500 outline-none text-center font-mono"
                                />
                              </td>
                            </>
                          )}
                                  {identityData.uncMethod === "monitoring_pasien" && (
                            <>
                              <td className="px-4 py-2 bg-white/40 dark:bg-slate-900/30 border-r border-b border-slate-200/60 dark:border-slate-800/60">
                                <input
                                  type="number"
                                  id={`input-simUnc-${idx}`}
                                  onKeyDown={(e) => handleTableKeyDown(e, idx, 'simUnc')}
                                  placeholder="uSim"
                                  value={m.simUnc ?? 0.5}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].simUnc = Number(e.target.value);
                                    newM[idx].uncertainty = calculateUncertainty(
                                      newM[idx].resolution || 0.01,
                                      newM[idx].masterUnc || 0.001,
                                      newM[idx].drift || 0,
                                      newM[idx],
                                    );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-slate-50 dark:bg-[#0e1626]/80 border border-slate-300 dark:border-slate-800 focus:border-[#b38728]/50 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono text-center w-14 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-[#b38728]/10 outline-none transition-all"
                                />
                              </td>
                              <td className="px-4 py-2 bg-white/40 dark:bg-slate-900/30 border-r border-b border-slate-200/60 dark:border-slate-800/60">
                                <input
                                  type="number"
                                  id={`input-sd-${idx}`}
                                  onKeyDown={(e) => handleTableKeyDown(e, idx, 'sd')}
                                  placeholder="SD"
                                  value={m.sd ?? 0}
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    newM[idx].sd = Number(e.target.value);
                                    newM[idx].uncertainty =
                                      calculateUncertainty(
                                        newM[idx].resolution || 0.01,
                                        newM[idx].masterUnc || 0.001,
                                        newM[idx].drift || 0,
                                        newM[idx],
                                      );
                                    setMeasurements(newM);
                                  }}
                                  className="bg-slate-50 dark:bg-[#0e1626]/80 border border-slate-300 dark:border-slate-800 focus:border-[#b38728]/50 rounded-xl px-2 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono text-center w-14 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-[#b38728]/10 outline-none transition-all"
                                />
                              </td>
                            </>
                          )}
                            </>
                          )}

                          <td className={cn(
                            "px-2 py-1.5 border-r border-b transition-colors duration-200 text-right",
                            isOut ? "glow-fail-danger" :
                            isValid ? "bg-emerald-50/50 border-emerald-250/50 dark:bg-emerald-950/15 dark:border-emerald-900/40" :
                            "bg-white/40 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/55"
                          )}>
                            <input
                              type="number"
                              id={`input-actual-${idx}`}
                              onKeyDown={(e) => handleTableKeyDown(e, idx, 'actual')}
                              value={m.actual}
                              onChange={(e) => {
                                const newM = [...measurements];
                                const act = Number(e.target.value);
                                newM[idx].actual = act;
                                newM[idx].deviation =
                                  act - (newM[idx].point || 0);
                                newM[idx].uncertainty = calculateUncertainty(
                                  newM[idx].resolution || 0.01,
                                  newM[idx].masterUnc || 0.001,
                                  newM[idx].drift || 0,
                                  newM[idx],
                                );
                                setMeasurements(newM);
                              }}
                              className={cn(
                                "border px-2 py-1 text-xs w-20 rounded-md text-right font-bold outline-none focus:ring-1 transition-all duration-300 font-mono",
                                isOut
                                  ? "text-red-700 bg-red-50/50 border-red-300 focus:border-red-500 focus:ring-red-500/15 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900/50 dark:focus:border-red-500/50 dark:focus:ring-red-500/10"
                                  : isValid
                                  ? "text-emerald-700 bg-emerald-50/30 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/15 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:focus:border-emerald-500/50 dark:focus:ring-emerald-500/10"
                                  : "text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border-slate-200 hover:border-slate-350 focus:border-[#b38728] dark:text-slate-200 dark:bg-transparent dark:hover:bg-slate-900/60 dark:focus:bg-[#040816] dark:border-slate-800/80 dark:hover:border-slate-700 dark:focus:border-[#b38728]"
                              )}
                            />
                          </td>
                          <td className={cn(
                            "px-2 py-1.5 border-r border-b transition-colors duration-200 text-center",
                            isOut ? "glow-fail-danger" :
                            isValid ? "bg-emerald-50/50 border-emerald-250/50 dark:bg-emerald-950/15 dark:border-emerald-900/40" :
                            "bg-white/40 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/55"
                          )}>
                            <span
                              className={cn(
                                "text-xs font-bold font-mono px-2 py-1 rounded-md block text-center uppercase tracking-wider",
                                isOut
                                  ? "bg-rose-500/10 text-rose-600 dark:bg-rose-950/45 dark:text-rose-400 animate-pulse font-extrabold"
                                  : isValid
                                  ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/40"
                              )}
                            >
                              {m.deviation >= 0 ? "+" : ""}
                              {m.deviation?.toFixed(3)}
                            </span>
                          </td>

                          <td className={cn(
                            "px-2 py-1.5 border-r border-b transition-colors duration-200 text-center",
                            isOut ? "glow-fail-danger" :
                            isValid ? "bg-emerald-50/50 border-emerald-250/50 dark:bg-emerald-950/15 dark:border-emerald-900/40" :
                            "bg-white/40 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-800/55"
                          )}>
                            {editMetrologyMode ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-bold font-mono">±</span>
                                <input
                                  type="number"
                                  id={`input-tolerance-${idx}`}
                                  onKeyDown={(e) => handleTableKeyDown(e, idx, 'tolerance')}
                                  step="any"
                                  value={m.tolerance ?? ""}
                                  placeholder="--"
                                  onChange={(e) => {
                                    const newM = [...measurements];
                                    const val = e.target.value === "" ? undefined : Number(e.target.value);
                                    newM[idx].tolerance = val;
                                    setMeasurements(newM);
                                  }}
                                  className={cn(
                                    "w-16 bg-transparent text-slate-900 dark:text-slate-100 font-bold font-mono text-center border rounded-md px-1.5 py-1 text-xs outline-none transition-all placeholder:text-slate-400",
                                    isOut
                                      ? "border-red-300 focus:border-red-500 hover:bg-rose-50/30 dark:border-rose-900/50 dark:focus:border-red-500"
                                      : isValid
                                      ? "border-emerald-300 focus:border-emerald-500 hover:bg-emerald-50/30 dark:border-emerald-900/45 dark:focus:border-emerald-500"
                                      : "border-slate-200 hover:border-slate-350 dark:border-slate-800/80 dark:hover:border-slate-700 focus:border-[#b38728] hover:bg-slate-50 focus:bg-white"
                                  )}
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 font-mono text-center">
                                <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">±</span>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200">{m.tolerance ?? "—"}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-2 py-1.5 bg-white/40 dark:bg-slate-900/30 border-r border-b border-slate-200/60 dark:border-slate-800/55 font-mono text-center">
                            <div className="flex flex-col items-center justify-center py-1">
                              <span className="text-[#b38728] dark:text-amber-400 font-bold text-xs" title="Ketidakpastian Diperluas (U95)">
                                ±{m.uncertainty?.toFixed(4)}
                              </span>
                              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-none" title="Ketidakpastian Baku Gabungan (u_c)">
                                u<sub>c</sub>: {m.uCombined ? m.uCombined.toFixed(4) : (m.uncertainty ? (m.uncertainty / 2).toFixed(4) : "0.0000")}
                              </span>
                              <span className="text-[7.5px] text-[#b38728]/70 dark:text-[#b38728]/50 font-semibold uppercase tracking-widest mt-0.5 animate-pulse">
                                k=2 (95%)
                              </span>
                            </div>
                          </td>

                          {editMetrologyMode && (() => {
                            const category = identityData.uncMethod || "standard";
                            const b = calculateInstrumentUncertainty(
                              category,
                              m.resolution !== undefined ? m.resolution : 0.01,
                              m.masterUnc !== undefined ? m.masterUnc : 0.001,
                              m.drift !== undefined ? m.drift : 0,
                              { ...m, cmcValue: cmcValue }
                            );
                            
                            const isBelowCmc = (m.uncertainty || 0) < (cmcValue || 0.05);
                            
                            return (
                              <>
                                {/* CMC Validation Cell */}
                                <td className="px-2 py-1.5 bg-white/40 dark:bg-slate-900/30 border-r border-b border-slate-200/60 dark:border-slate-800/55 text-center font-mono">
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    {isBelowCmc ? (
                                      <>
                                        <span className="bg-amber-150/70 dark:bg-amber-950/35 text-amber-800 dark:text-amber-300 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-250/35" title="Ketidakpastian di bawah batas CMC, dilaporkan menggunakan nilai CMC">
                                          Clamped to CMC
                                        </span>
                                        <span className="text-[9px] text-amber-600 dark:text-amber-450 font-bold" title="Batas CMC Lab">
                                          ± {(cmcValue || 0.05).toFixed(4)}
                                        </span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="bg-emerald-150/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-emerald-250/25">
                                          Valid
                                        </span>
                                        <span className="text-[8px] text-slate-400 font-medium uppercase tracking-tight">
                                          U95 &gt; CMC
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </td>

                                {/* Ratio TUR/TAR Cell */}
                                <td className="px-2 py-1.5 bg-white/40 dark:bg-slate-900/30 border-r border-b border-slate-200/60 dark:border-slate-800/55 text-center font-mono">
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                    {b.tur !== undefined ? (
                                      <div className="flex flex-col items-center">
                                        <span className="text-[10px] font-bold uppercase text-slate-800 dark:text-slate-200">
                                          TUR:{" "}
                                          <strong className={cn(
                                            b.tur >= 4 ? "text-emerald-600 dark:text-emerald-400" : b.tur >= 1 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400 animate-pulse"
                                          )}>
                                            {b.tur.toFixed(1)}:1
                                          </strong>
                                        </span>
                                        <span className="text-[7.5px] text-slate-400 dark:text-slate-500 font-medium">
                                          (MPE / U95)
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[9px] text-slate-400 dark:text-slate-500 italic font-bold">N/A</span>
                                    )}
                                    {b.tar !== undefined ? (
                                      <div className="flex flex-col items-center mt-0.5">
                                        <span className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold text-[8px]">
                                          TAR: {b.tar.toFixed(1)}:1
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </>
                            );
                          })()}

                          <td className="px-2 py-1.5 bg-white/40 dark:bg-slate-900/30 border-b border-slate-200/60 dark:border-slate-800/55 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setMeasurements(
                                  measurements.filter((_, i) => i !== idx),
                                )
                              }
                              title={`Hapus Baris ${idx + 1}`}
                              aria-label={`Hapus Baris ${idx + 1}`}
                              className="p-1 px-1.5 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-transparent hover:border-rose-200 dark:hover:border-[#f43f5e]/30 text-slate-400 hover:text-rose-500 rounded-md transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>

                {/* Visual Uncertainty Budget Panel */}
                <div className="mt-8 bg-slate-50 rounded-[2rem] border border-slate-200/60 p-8 space-y-6">
                  <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                      <BrainCircuit className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest font-mono">
                        Model Matematis & Pembebanan Ketidakpastian
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                        Standar Acuan ISO/IEC 17025 & Panduan KAN (K-01)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* u1 Card */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">
                        u₁
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        Resolusi Alat
                      </p>
                      <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">
                        Ketidakpastian Resolusi
                      </h4>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                        <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1">
                          <span>u₁ = </span>
                          <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                            <span className="border-b border-slate-400 pb-0.5">
                              Resolusi
                            </span>
                            <span className="pt-0.5">2√3</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">
                          Distribusi Rectangular (Semi-Range)
                        </p>
                      </div>
                    </div>

                    {/* u2 Card */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">
                        u₂
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        Sertifikat Master
                      </p>
                      <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">
                        Instrumen Standar
                      </h4>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                        <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1">
                          <span>u₂ = </span>
                          <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                            <span className="border-b border-slate-400 pb-0.5">
                              U_sertifikat
                            </span>
                            <span className="pt-0.5">k_sertifikat</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">
                          Distribusi Normal (Confidence Level 95%, k=2)
                        </p>
                      </div>
                    </div>

                    {/* u3 Card */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">
                        u₃
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        Repeatability
                      </p>
                      <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">
                        Daya Ulang Pembacaan
                      </h4>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                        <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1 font-mono">
                          <span>u₃ = </span>
                          <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                            <span className="border-b border-slate-400 pb-0.5">
                              sₓ
                            </span>
                            <span className="pt-0.5">√n</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">
                          Evaluasi Tipe A (Standar Deviasi / Jumlah Sampel)
                        </p>
                      </div>
                    </div>

                    {/* u4 Card */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
                      <div className="absolute top-0 right-0 p-2 bg-blue-50 rounded-bl-xl text-[9px] font-mono text-blue-600 font-black">
                        u₄
                      </div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                        Long-term Drift
                      </p>
                      <h4 className="text-xs font-black text-slate-800 uppercase mt-1 leading-tight">
                        Ketidakstabilan Standar
                      </h4>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col items-center">
                        <div className="text-center font-mono text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 w-full mb-3 flex items-center justify-center gap-1">
                          <span>u₄ = </span>
                          <div className="inline-flex flex-col items-center justify-center text-[10px] leading-none px-1">
                            <span className="border-b border-slate-400 pb-0.5">
                              Drift
                            </span>
                            <span className="pt-0.5">√3</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-400 font-bold uppercase text-center leading-normal">
                          Distribusi Rectangular (Stabilitas Jangka Panjang)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Summary Calculation Flow */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60 text-slate-800">
                    {/* Combined */}
                    <div className="bg-blue-600/5 border border-blue-500/20 p-6 rounded-2xl flex flex-col justify-between font-sans">
                      <div className="flex items-center gap-2 text-blue-800 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest font-mono">
                          1. Ketidakpastian Baku Gabungan (u<sub>c</sub>)
                        </h4>
                      </div>
                      <div className="bg-white/80 p-4 border border-blue-200/60 rounded-xl font-mono text-xs font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
                        <span>
                          u<sub>c</sub> = √[ (u₁)² + (u₂)² + (u₃)² + (u₄)² ]
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed font-mono">
                        Prinsip dasar penggabungan kuadratik
                        (root-sum-of-squares) untuk parameter yang tidak saling
                        berkorelasi.
                      </p>
                    </div>

                    {/* Expanded */}
                    <div className="bg-emerald-600/5 border border-emerald-500/20 p-6 rounded-2xl flex flex-col justify-between font-sans">
                      <div className="flex items-center gap-2 text-emerald-800 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <h4 className="text-[11px] font-black uppercase tracking-widest font-mono">
                          2. Ketidakpastian Diperluas (U<sub>95</sub>)
                        </h4>
                      </div>
                      <div className="bg-white/80 p-4 border border-emerald-200/60 rounded-xl font-mono text-xs font-bold text-slate-800 mb-3 flex items-center justify-center gap-2">
                        <span>
                          U<sub>95</sub> = k × u<sub>c</sub> (k = 2)
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed font-mono">
                        Dilaporkan pada tingkat kepercayaan sekitar 95% dengan
                        faktor cakupan k=2 sesuai standar Komite Akreditasi
                        Nasional (KAN).
                      </p>
                    </div>
                  </div>
                </div>
              </TabContent>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function NavBtn({ active, onClick, icon: Icon, label, desc }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-full text-left p-2.5 sm:p-4 rounded-xl sm:rounded-[1.25rem] transition-all duration-350 border select-none group/btn cursor-pointer",
        active
          ? "bg-blue-600/10 dark:bg-cyan-500/10 border-blue-600/80 dark:border-cyan-400/80 shadow-md shadow-blue-500/5"
          : "bg-white/40 dark:bg-[#070b18]/45 border-slate-200/50 dark:border-slate-800/40 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-[#101b33]/40 hover:border-slate-350 dark:hover:border-slate-700/60"
      )}
    >
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "w-7.5 h-7.5 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm shrink-0",
            active
              ? "bg-blue-600 text-white dark:bg-cyan-500 dark:text-slate-950 shadow-md shadow-blue-500/10 dark:shadow-cyan-500/10 rotate-3"
              : "bg-slate-100 dark:bg-[#0b132b]/80 border border-slate-200/40 dark:border-slate-800/40 text-slate-500 dark:text-slate-500 group-hover/btn:bg-slate-50 dark:group-hover/btn:bg-[#142347] group-hover/btn:text-blue-600 dark:group-hover/btn:text-cyan-400 group-hover/btn:-rotate-3"
          )}
        >
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] leading-none truncate font-sans transition-colors duration-250",
              active
                ? "text-blue-600 dark:text-cyan-450 italic font-black"
                : "text-slate-800 dark:text-slate-200 font-bold"
            )}
          >
            {label}
          </p>
          <p
            className={cn(
              "text-[7.5px] sm:text-[8px] mt-1 font-bold italic truncate transition-colors duration-250 hidden sm:block",
              active
                ? "text-blue-500/80 dark:text-cyan-450/70"
                : "text-slate-450 dark:text-slate-500"
            )}
          >
            {desc}
          </p>
        </div>
        {active && (
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-cyan-400 shrink-0 shadow-[0_0_6px_#2563eb] dark:shadow-[0_0_6px_#22d3ee]" />
        )}
      </div>
    </button>
  );
}


function TabContent({
  children,
  ...props
}: { children: React.ReactNode } & any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

function CheckItem({ label, value, onChange, onLabelChange, onDelete, variant = "blue" }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);

  // Sync tempLabel when the label prop changes externally
  useEffect(() => {
    if (!isEditing) {
      setTempLabel(label);
    }
  }, [label, isEditing]);

  const isGold = variant === "gold";
  const isBaik = value === "Baik";
  const isRusak = value === "Rusak";

  return (
    <motion.div
      layout
      className={cn(
        "relative flex items-center justify-between p-3.5 pl-5 rounded-2xl border transition-all duration-300 overflow-hidden group",
        isBaik
          ? "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300/60 dark:border-emerald-500/30 shadow-sm"
          : isRusak
            ? "bg-rose-50/60 dark:bg-rose-950/25 border-rose-300/70 dark:border-rose-500/35 shadow-sm"
            : isGold
              ? "bg-slate-50/30 dark:bg-[#0c1220]/75 border-slate-200 dark:border-amber-500/15 border-l-4 border-l-amber-500"
              : "bg-slate-50/30 dark:bg-[#0c1220]/75 border-slate-200 dark:border-cyan-500/15 border-l-4 border-l-blue-600 dark:border-l-cyan-500"
      )}
    >
      {isBaik && <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500 rounded-l-2xl" />}
      {isRusak && <div className="absolute left-0 top-0 w-1 h-full bg-rose-500 rounded-l-2xl" />}

      <div className="flex items-center gap-2 flex-1 min-w-0 mr-4">
        <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
          isBaik ? "bg-emerald-500" : isRusak ? "bg-rose-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
        )} />
        {isEditing ? (
          <form onSubmit={(e) => { e.preventDefault(); onLabelChange(tempLabel); setIsEditing(false); }} className="flex-1">
            <input autoFocus value={tempLabel} onChange={(e) => setTempLabel(e.target.value)}
              onBlur={() => { onLabelChange(tempLabel); setIsEditing(false); }}
              title="Edit Nama Parameter"
              placeholder="Nama Parameter"
              className="w-full bg-white dark:bg-[#070d19] border border-blue-500 dark:border-cyan-500 rounded-lg px-3 py-1.5 text-[10px] font-black text-slate-900 dark:text-white focus:outline-none italic font-mono"
            />
          </form>
        ) : (
          <span onClick={() => setIsEditing(true)} title="Klik untuk mengubah label"
            className={cn("text-[10px] font-black uppercase tracking-tight cursor-pointer transition-colors whitespace-normal break-words italic font-mono flex items-center gap-1.5 flex-wrap",
              isBaik ? "text-emerald-800 dark:text-emerald-300" :
              isRusak ? "text-rose-800 dark:text-rose-300" :
              isGold ? "text-slate-800 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400" :
              "text-slate-800 dark:text-slate-300 hover:text-blue-600 dark:hover:text-cyan-400"
            )}
          >
            {label}
            <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 dark:bg-slate-800 text-[8px] font-sans px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-normal normal-case">
              Ubah
            </span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex bg-white dark:bg-[#070d19]/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/40 shadow-inner gap-0.5">
          <button onClick={() => onChange("Baik")} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer",
            isBaik ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 scale-[1.05]" : "text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          )}>✓ Baik</button>
          <button onClick={() => onChange("Rusak")} className={cn("px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all duration-200 cursor-pointer",
            isRusak ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25 scale-[1.05]" : "text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
          )}>✕ Rusak</button>
        </div>
        <button onClick={onDelete} className="p-1.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 transition-all opacity-0 group-hover:opacity-100 cursor-pointer rounded-lg" title="Hapus Parameter" aria-label="Hapus Parameter">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

function InputRow({ label, value, onChange, limit, isValid }: any) {
  const isPass = () => {
    if (isValid !== undefined) return isValid;
    if (!value) return true;
    const val = parseFloat(value);
    if (isNaN(val)) return true;

    if (label.includes("Resistance") || label.includes("Res.")) {
      if (label.includes("Insulation")) return val >= 2.0;
      return val <= 0.2;
    }
    if (label.includes("Leakage")) {
      if (label.includes("Earth")) return val <= 500;
      if (label.includes("Chassis")) return val <= 100;
      return val <= 10;
    }
    if (label.includes("Voltage")) {
      return val >= 198 && val <= 242;
    }
    return true;
  };

  const pass = isPass();

  return (
    <div
      className={cn(
        "flex items-center justify-between p-5 rounded-[1.5rem] border transition-all shadow-sm",
        value
          ? pass
            ? "bg-emerald-50/70 dark:bg-[#064e3b]/15 border-emerald-100 dark:border-emerald-500/20"
            : "bg-red-50/70 dark:bg-[#7f1d1d]/15 border-red-100 dark:border-red-500/20"
          : "bg-slate-50/50 dark:bg-[#0c1220]/75 border-slate-100 dark:border-cyan-500/15",
      )}
    >
      <div className="space-y-1">
        <p className="text-[11px] font-black text-black dark:text-white uppercase tracking-tight italic">
          {label}
        </p>
        <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-[0.2em] font-mono">
          Limit: {limit}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-white dark:bg-[#070d19] border border-slate-400 dark:border-cyan-500/25 rounded-xl px-5 py-2.5 text-right text-xs text-blue-700 dark:text-cyan-400 font-black focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-cyan-550/15 focus:outline-none w-32 shadow-inner font-mono"
          placeholder="0.00"
        />
        <div
          className={cn(
            "w-10 h-10 rounded-xl border flex items-center justify-center transition-all shadow-sm",
            value
              ? pass
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-red-600 text-white border-red-600 animate-pulse"
              : "bg-white dark:bg-[#070d19] border-slate-100 dark:border-[#152e4e]/40 text-slate-200 dark:text-slate-750 shadow-inner",
          )}
        >
          {value ? (
            pass ? (
              <CheckCircle2 className="w-5 h-5 text-white" />
            ) : (
              <AlertCircle className="w-5 h-5 text-white" />
            )
          ) : (
            <CheckCircle2 className="w-5 h-5 opacity-40 dark:opacity-25" />
          )}
        </div>
      </div>
    </div>
  );
}

function IdentityInput({ label, value, onChange }: any) {
  const inputId = `identity-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-[10px] font-black text-slate-800 dark:text-cyan-400/95 uppercase tracking-widest ml-1 font-mono italic">
        {label}
      </label>
      <input
        type="text"
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        title={label}
        placeholder={label}
        className="w-full bg-slate-50/55 dark:bg-[#070d19]/65 border border-slate-350 dark:border-cyan-500/25 rounded-2xl px-5 py-4 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-cyan-550/15 focus:border-blue-600 dark:focus:border-cyan-400 transition-all font-mono italic shadow-inner placeholder:text-slate-400 dark:placeholder:text-slate-600"
      />
    </div>
  );
}
