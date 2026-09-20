# 🔬 Spektrum Kreasi Pratama — Master Enterprise Documentation

## Platform Digital Kalibrasi Alat Kesehatan, Uji Kesesuaian Radiologi (Ukes BAPETEN), IPM & Medical Device Repair Suite

### Dokumentasi Resmi Arsitektur Sistem, Engine Metrologi, Kepatuhan ISO/IEC 17025:2017, Regulasi BAPETEN & Integrasi Mobile Edge

---

> ### ⚠️ Pernyataan Status Implementasi Sistem (System Status Disclaimer)
>
> Seluruh modul, engine kalkulasi, dan antarmuka dalam dokumen ini diklasifikasikan ke dalam label status teknis berikut:
>
> - `IMPLEMENTED`: Fitur telah diimplementasikan secara penuh pada frontend, logika kalkulasi metrologi, dan persistensi data.
> - `INTEGRATION READY`: Struktur data, parser payload, endpoint, dan pipeline mapping telah siap di backend/server, siap dihubungkan dengan API eksternal (misalnya: *Si-INTAN BAPETEN / Balis Online*).
> - `SIMULATED / OFFLINE EDGE`: Fitur beroperasi menggunakan engine lokal / PWA store / IndexedDB untuk mengakomodasi pengujian di area steril/perisai radiasi (*Lead-shielded X-Ray Bunker*) yang minim koneksi internet.
> - `REQUIRES METROLOGICAL VALIDATION`: Formulir kalkulasi dan batas toleransi (MPE) berpedoman pada standar BPFK/Kemenkes/KAN dan wajib diverifikasi oleh Manajer Teknis Laboratorium Terakreditasi.

---

## 📑 Daftar Isi Master (15 Bab)

1. [Overview Sistem & Arsitektur Utama](#bab-1-overview-sistem--arsitektur-utama)
2. [Struktur Direktori & Komponen Kode](#bab-2-struktur-direktori--komponen-kode)
3. [Instalasi, Konfigurasi (.env) & Panduan Deployment](#bab-3-instalasi-konfigurasi-env--panduan-deployment)
4. [Metrologi & Engine Kalkulasi Ketidakpastian (ISO/IEC 17025)](#bab-4-metrologi--engine-kalkulasi-ketidakpastian-isoiec-17025)
5. [Sub-Sistem Ukes Radiologi & Integrasi BAPETEN](#bab-5-sub-sistem-ukes-radiologi--integrasi-bapeten)
6. [Engine Lembar Kerja Kalibrasi (Worksheet Builder & Lifecycle)](#bab-6-engine-lembar-kerja-kalibrasi-worksheet-builder--lifecycle)
7. [Modul IPM (Preventive Maintenance) & Keselamatan Listrik Medis](#bab-7-modul-ipm-preventive-maintenance--keselamatan-listrik-medis)
8. [Modul Perbaikan Alat Kesehatan (Medical Device Repair Suite)](#bab-8-modul-perbaikan-alat-kesehatan-medical-device-repair-suite)
9. [Manajemen Standar Ukur, Ketertelusuran & Matriks Lingkup KAN](#bab-9-manajemen-standar-ukur-ketertelusuran--matriks-lingkup-kan)
10. [Ekstraksi OCR & AI Assistant (Gemini AI Vision & Piranha Parser)](#bab-10-ekstraksi-ocr--ai-assistant-gemini-ai-vision--piranha-parser)
11. [Penerbitan Sertifikat Digital, QR Verification & Ekspor PDF/Excel](#bab-11-penerbitan-sertifikat-digital-qr-verification--ekspor-pdfexcel)
12. [Keamanan, Firestore Security Rules & Audit Trail](#bab-12-keamanan-firestore-security-rules--audit-trail)
13. [Offline-First Architecture & Edge Sync](#bab-13-offline-first-architecture--edge-sync)
14. [Integrasi Mobile App (Capacitor 8 Android Build & Scanner)](#bab-14-integrasi-mobile-app-capacitor-8-android-build--scanner)
15. [Status Implementasi, Roadmap & Matrix Kepatuhan Regulasi](#bab-15-status-implementasi-roadmap--matrix-kepatuhan-regulasi)

---

## BAB 1: Overview Sistem & Arsitektur Utama

### 1.1 Visi & Industri Target

**Spektrum Kreasi Pratama** adalah platform enterprise digital berstandar industri metrologi medis yang dirancang khusus untuk memenuhi kebutuhan Lembaga Penguji Alat Kesehatan (LPAK), Laboratorium Kalibrasi Terakreditasi KAN (ISO/IEC 17025:2017), serta Institusi Penguji Kesesuaian Radiologi yang terdaftar di BAPETEN.

Sistem ini menggabungkan 8 pilar utama kecerdasan medis terpadu (Spektrum 3.0):

1. **Universal Engineering Workspace & Command Palette (Ctrl+K)**: Pusat navigasi tugas prioritas & shortcut pencarian global.

2. **Digital Asset Passport & Engineering 360°**: Single source of truth 360° alat kesehatan, Health Score 0-100, & Asset Lifecycle.
3. **Live Measurement Console & Metrology Explainability Panel**: Dashboard pengujian real-time dengan transparansi kalkulasi "WHY PASS?".
4. **Digital Uncertainty Laboratory & Tornado Chart**: Studio pemodelan ketidakpastian visual & diagram Tornado.
5. **KAN Scope Command Center & Calibrator Health Center**: Pohon ketertelusuran SI, pemantauan drift, & matriks akreditasi.
6. **Executive Intelligence 5D Dashboard**: Kecerdasan eksekutif Operational, Metrological, Financial, Quality, & Asset.
7. **One-Click Audit Package & Public QR Verification Seal**: Generator bukti audit 1-klik terverifikasi hash SHA-256.
8. **Interoperabilitas SatuSehat, BAPETEN Si-INTAN, & Studio Label Thermal**: Bridge FHIR R4, dispatch dosis radiasi, & ZPL/ESC-POS printer studio.

```text

                               ┌──────────────────────────────────────────────┐
                               │           EQUIPMENT INVENTORY / MPI          │
                               └──────────────────────┬───────────────────────┘
                                                      │
                       ┌──────────────────────────────┼──────────────────────────────┐
                       │                              │                              │
        ┌──────────────▼──────────────┐┌──────────────▼──────────────┐┌──────────────▼──────────────┐
        │     KALIBRASI METROLOGI     ││    UKES RADIOLOGI BAPETEN    ││      IPM & SAFETY CHECK    │
        │  (ISO/IEC 17025 / BPFK IK)  ││ (Perka BAPETEN / Radiografi) ││    (IEC 62353 Maintenance)  │
        └──────────────┬──────────────┘└──────────────┬──────────────┘└──────────────┬──────────────┘
                       │                              │                              │
                       └──────────────────────────────┼──────────────────────────────┘
                                                      │
                               ┌──────────────────────▼───────────────────────┐
                               │       CALCULATIONS & DECISION ENGINE         │
                               │  (Type A/B, En-Score, Pass/Fail, MPE Rule)   │
                               └──────────────────────┬───────────────────────┘
                                                      │
                               ┌──────────────────────▼───────────────────────┐
                               │     CERTIFICATE & REPORT GENERATION          │
                               │   (SHA-256 Hash, QR Code, PDF & BAPETEN)    │
                               └──────────────────────────────────────────────┘
```

### 1.2 Tech Stack Arsitektur Modern

- **Frontend Core**: React 19, TypeScript 5.8, React Router v7.
- **Styling & UI**: Tailwind CSS v4, Motion / Framer Motion, Lucide Icons, Recharts, Three.js (Interactive 3D Equipment/Bunker Viewer).
- **Backend & API**: Node.js, Express 4.22, ESBuild, TSX Runtime.
- **Cloud Database & Auth**: Firebase Firestore (NoSQL Document Store), Firebase Authentication, Firebase Storage.
- **AI & Computer Vision**: Google Gemini API (`@google/genai`), Custom OCR Vision Engine for Calibration Certificate Parsing & Piranha Multi-meter Data Extraction.
- **Mobile Native Bridge**: Capacitor 8 for Android (Native Camera, QR Scanner, File Access).
- **Document & PDF Export**: jsPDF, AutoTable, XLSX Engine, QR Code Generator.

---

## BAB 2: Struktur Direktori & Komponen Kode

### 2.1 Peta Folder Utama

```text
spektrum-kalibrasi-digital/
├── android/                        # Proyek Native Android (Capacitor 8 Integration)
├── public/                         # Asset Statis, Logo & Icon
├── src/
│   ├── components/                 # Reusable UI Components (Layout, Modals, Forms, Tables)
│   ├── data/                       # Catalog & Static Master Data
│   │   ├── bapetenRegulations.ts   # Matriks Standar Uji Kesesuaian BAPETEN
│   │   ├── ipmTemplatesCatalog.ts  # Templat Pemeliharaan Pencegahan Alat
│   │   ├── medicalDeviceCatalog.ts # Katalog Alat Kesehatan & Toleransi MPE
│   │   ├── piranhaParser.ts        # Parser Log Data Piranha Meter Radiologi
│   │   └── repairMasterCatalog.ts  # Katalog Kerusakan & Komponen Sparepart
│   ├── lib/                        # Engines, Utilities & Core Logic
│   │   ├── ukes/                   # Core Engine Sub-Sistem Ukes Radiologi
│   │   │   ├── bapetenReportingEngine.ts
│   │   │   ├── radiologyModalityRegistry.ts
│   │   │   ├── ukesAiVisionEngine.ts
│   │   │   ├── ukesCalculationEngine.ts
│   │   │   └── ukesRegulationEngine.ts
│   │   ├── AuthContext.tsx         # Provider Otentikasi & Session State
│   │   ├── uncertaintyCalculations.ts # Engine Perhitungan Ketidakpastian Metrologi
│   │   ├── kanScopeValidationEngine.ts # Validasi Lingkup KAN & Matriks CMC
│   │   ├── standardTraceabilityEngine.ts # Silsilah Rantai Ketertelusuran Standar Ukur
│   │   ├── offlineStore.ts         # IndexedDB / LocalStorage Engine
│   │   └── firebase.ts             # Inisialisasi SDK Firebase Client
│   ├── pages/                      # 40+ Halaman Modul Aplikasi
│   │   ├── Dashboard.tsx           # Analytics & KPI Overview
│   │   ├── WorksheetEditor.tsx     # Editor Lembar Kerja Kalibrasi Interactive (430KB+)
│   │   ├── UkesRadiologyWizard.tsx # Wizard Pengujian Ukes Radiologi (50KB+)
│   │   ├── Calibrators.tsx         # Master Standar Ukur & Masa Berlaku Sertifikat
│   │   ├── WorkMethods.tsx         # Metode Kerja / IK Kalibrasi (95KB+)
│   │   ├── CalculationEngine.tsx   # Workbench Pengujian Rumus Metrologi (80KB+)
│   │   ├── CertificateDetail.tsx   # Viewer & Generator Sertifikat Kalibrasi (62KB+)
│   │   ├── IKAssistant.tsx         # Asisten AI Gemini RAG Metrologi
│   │   └── ... (40+ modul pendukung)
│   ├── services/
│   │   └── geminiService.ts        # Service Client Google Gemini AI API
│   ├── App.tsx                     # Router Master & Error Boundary Global
│   ├── main.tsx                    # React Entrypoint
│   └── index.css                   # Tailwind CSS Configuration & Theme Utility
├── capacitor.config.json           # Konfigurasi Capacitor Native Mobile
├── firebase-blueprint.json         # Cetak Biru Schema & Collection Firestore
├── firestore.rules                 # Rules Keamanan & Otorisasi Firestore
├── security_spec.md                # Spesifikasi Invariant Keamanan & Test Plan
├── server.ts                       # Express Server Backend untuk Production / SSR / API
└── vite.config.ts                  # Konfigurasi Vite Bundler & Plugin React
```

---

## BAB 3: Instalasi, Konfigurasi (.env) & Panduan Deployment

> Status Sub-Sistem: `IMPLEMENTED`

### 3.1 Prasyarat Lingkungan (Environment Prerequisites)

- **Node.js**: v18.0.0 atau lebih baru (Rekomendasi LTS v20.x).
- **npm**: v9.x atau lebih baru.
- **Java Development Kit (JDK)**: JDK 17+ (Diperlukan jika melakukan build Android via Capacitor).
- **Android Studio & SDK**: Android API Level 34+ (Untuk build APK/AAB).

### 3.2 File Konfigurasi Lingkungan (`.env`)

Buat file `.env` di root direktori berdasarkan `.env.example`:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyYourFirebaseApiKeyHere
VITE_FIREBASE_AUTH_DOMAIN=spektrum-kalibrasi.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=spektrum-kalibrasi
VITE_FIREBASE_STORAGE_BUCKET=spektrum-kalibrasi.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Google Gemini AI Integration
GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere

# Application Port Settings
PORT=3000
NODE_ENV=production
```

### 3.3 Langkah Instalasi & Jalankan Aplikasi Lokal

```bash
# 1. Clone repository
git clone https://github.com/Mubaraq23/Spektrum-Kreasi-Pratama-.git
cd spektrum-kalibrasi-digital

# 2. Install dependensi package
npm install

# 3. Jalankan server pengembangan (Vite + Express Server)
npm run dev

# 4. Akses aplikasi melalui browser di: http://localhost:3000
```

### 3.4 Build Produksi & Deploy Server

```bash
# Build frontend Vite & bundling Express server
npm run build

# Jalankan server node produksi
npm start
```

---

## BAB 4: Metrologi & Engine Kalkulasi Ketidakpastian (ISO/IEC 17025)

> Status Sub-Sistem: `IMPLEMENTED` / `VERIFIED`

Engine ketidakpastian pengukuran (`uncertaintyCalculations.ts`) mengimplementasikan metode **GUM (Guide to the Expression of Uncertainty in Measurement)** sesuai rekomendasi ISO/IEC Guide 98-3 dan petunjuk teknis KAN.

### 4.1 Komponen Ketidakpastian Tipe A ($u_a$)

Ketidakpastian Tipe A dihitung dari pengulangan pengukuran (*repeatability*) sebanyak $n$ kali:

$$\bar{x} = \frac{1}{n} \sum_{i=1}^{n} x_i$$

$$s(x_i) = \sqrt{\frac{1}{n-1} \sum_{i=1}^{n} (x_i - \bar{x})^2}$$

$$u_a = \frac{s(x_i)}{\sqrt{n}}$$

### 4.2 Komponen Ketidakpastian Tipe B ($u_b$)

Diperhitungkan dari berbagai sumber error eksternal dan spesifikasi alat:

1. **Resolusi Alat ($u_{b1}$)**: Distibusi segi empat (*rectangular distribution*):

   $$u_{b1} = \frac{\text{Resolusi}}{2 \sqrt{3}}$$

2. **Sertifikat Standard Ukur ($u_{b2}$)**: Distribusi normal dengan faktor cakupan $k$ dari sertifikat standar:

   $$u_{b2} = \frac{U_{\text{sertifikat}}}{k}$$

3. **Drift Standard Ukur ($u_{b3}$)**: Distribusi segi empat:

   $$u_{b3} = \frac{\text{Drift Tahunan}}{\sqrt{3}}$$

4. **Kondisi Lingkungan ($u_{b4}$)**: Suhu & Kelembaban (Variasi lingkungan):

   $$u_{b4} = \frac{\Delta T \times c_{\text{temp}}}{\sqrt{3}}$$

### 4.3 Ketidakpastian Gabungan ($u_c$) & Derajat Kebebasan Efektif ($v_{eff}$)

Ketidakpastian gabungan dihitung dengan penjumlahan kuadrat:

$$u_c = \sqrt{u_a^2 + u_{b1}^2 + u_{b2}^2 + u_{b3}^2 + u_{b4}^2}$$

Derajat kebebasan efektif dihitung menggunakan **Persamaan Welch-Satterthwaite**:

$$v_{eff} = \frac{u_c^4}{\frac{u_a^4}{n-1} + \sum \frac{u_{bi}^4}{v_{bi}}}$$

Berdasarkan nilai $v_{eff}$, dihitung faktor cakupan $k$ (default $k = 2.00$ untuk tingkat kepercayaan 95%), sehingga **Ketidakpastian Diperluas ($U$)**:

$$U = k \times u_c$$

### 4.4 Evaluasi Keputusan & MPE (Maximum Permissible Error)

Alat dinyatakan **PASS (Lolos)** jika selisih nilai terukur dengan nilai setting ditambah ketidakpastian tidak melebihi batas toleransi BPFK/Kemenkes:

$$|\text{Koreksi}| + U \le \text{MPE}$$

---

## BAB 5: Sub-Sistem Ukes Radiologi & Integrasi BAPETEN

> Status Sub-Sistem: `IMPLEMENTED` / `INTEGRATION READY`

Sub-sistem Ukes Radiologi (`UkesRadiologyWizard.tsx`, `bapetenCalculations.ts`, `ukesRegulationEngine.ts`) mendukung pengujian kesesuaian pesawat sinar-X sesuai Regulasi Perka BAPETEN.

```text
Modul Modalitas Radiologi Yang Didukung:
├── Pesawat Radiografi Umum (Fixed & Mobile X-Ray)
├── Pesawat Fluoroskopi (C-Arm / Angiografi)
├── Pesawat Mammografi Digital / Analog
├── Pesawat CT-Scan (Computed Tomography)
├── Pesawat Dental (Intraoral & Panoramic / Cephalometric)
└── Pesawat Sinar-X C-Arm Bedah
```

### 5.1 Parameter Uji Kesesuaian Utama & Batas Toleransi

| Parameter Uji | Metode & Rumus Kalkulasi | Batas Toleransi BAPETEN | Status Engine |
| --- | --- | --- | --- |
| **Akurasi Tegangan Tabung (kVp)** | $\% Error = \frac{\vert \bar{kV}_{terukur} - kV_{set} \vert}{kV_{set}} \times 100\%$ | $\le 5.0\%$ | `IMPLEMENTED` |
| **Akurasi Waktu Penyinaran (ms)** | $\% Error = \frac{\vert \bar{t}_{terukur} - t_{set} \vert}{t_{set}} \times 100\%$ | $\le 10.0\%$ (untuk $t \ge 10\text{ms}$) | `IMPLEMENTED` |
| **Linearitas Keluaran Radiasi (CL)** | $CL = \frac{\vert X_1 - X_2 \vert}{X_1 + X_2} \le 0.10$ | $CL \le 0.10$ | `IMPLEMENTED` |
| **Reprodusibilitas Pemasukan (CV)** | $CV = \frac{s}{\bar{X}} \le 0.05$ | $CV \le 0.05$ | `IMPLEMENTED` |
| **Kualitas Berkas Sinar-X (HVL)** | Interpolasi Logaritmik Tebal Filter Al | $\ge 2.3 \text{ mm Al}$ (pada 80 kVp) | `IMPLEMENTED` |
| **Kebocoran Wadah Tabung** | Dosis kebocoran pada jarak 1 meter | $\le 1.0 \text{ mGy/jam}$ | `IMPLEMENTED` |

### 5.2 Payload Bridge API Balis BAPETEN (`bapetenReportingEngine.ts`)

Sistem secara otomatis mengolah data mentah uji kesesuaian menjadi payload JSON terstruktur yang siap dikirimkan ke endpoint Sistem Balis BAPETEN:

```json

{
  "header": {
    "bapetenLpakCode": "LPAK-SPK-001",
    "testReportNumber": "UKES/RAD/2026/08/0142",
    "testDate": "2026-08-24",
    "inspectorNip": "198804122015031002"
  },
  "facility": {
    "hospitalName": "RSUD Semesta Sehat",
    "bapetenFacilityId": "FAC-BAP-99214"
  },
  "equipment": {
    "modalityType": "RADIOGRAPHY_GENERAL",
    "tubeSerialNumber": "TUB-PH-88412",
    "generatorSerialNumber": "GEN-PH-99120"
  },
  "results": {
    "kvpAccuracyPass": true,
    "linearityPass": true,
    "reproducibilityPass": true,
    "hvlValueMmAl": 2.65,
    "overallSuitabilityStatus": "CORRECT_AND_SUITABLE"
  }
}
```

---

## BAB 6: Engine Lembar Kerja Kalibrasi (Worksheet Builder & Lifecycle)

> Status Sub-Sistem: `IMPLEMENTED`

Modul `WorksheetEditor.tsx` (430KB+) adalah core editor dinamis yang menangani lebih dari 30 jenis alat kesehatan populer di Indonesia.

```text
Siklus Hidup Lembar Kerja (Worksheet State Machine):
[ DRAFT ] ──► [ PENDING_REVIEW ] ──► [ APPROVED ] ──► [ CERTIFICATE_ISSUED ]
    │                  │
    └──────────────────┴────────────► [ REJECTED / REVISION ]
```

### 6.1 Jenis Alat Kesehatan & Parameter Pengujian

1. **Defibrillator**: Pengujian Energi Discharge (Joule), Charging Time (detik), dan Synchronizer Mode.
2. **Patient Monitor / ECG**: Pengujian Heart Rate (BPM), Respiration Rate (RPM), NIBP (Systolic/Diastolic mmHg), dan SpO2 (%).
3. **Syringe / Infusion Pump**: Pengujian Laju Alir (*Flow Rate* mL/jam) dan Alarm Occlusion Pressure (psi/bar).
4. **Infant Incubator**: Pengujian Akurasi Suhu Ruang Chamber, Airflow Velocity (m/s), Noise Level (dBA), dan Alarm Power Failure.
5. **Electrosurgical Unit (ESU)**: Pengujian Daya Output Cut & Coagulation (Watt) pada Beban Resistansi $300\Omega / 500\Omega$.
6. **Centrifuge**: Pengujian Kecepatan Putaran (RPM) menggunakan Laser Tachometer dan Timer.
7. **Sphygmomanometer**: Pengujian Kebocoran Tekanan (*Pressure Leakage*) dan Akurasi Manometer (mmHg).

---

## BAB 7: Modul IPM (Preventive Maintenance) & Keselamatan Listrik Medis

> Status Sub-Sistem: `IMPLEMENTED`

Modul IPM (`IpmWizard.tsx`, `ipmCalculations.ts`, `ipmTemplatesCatalog.ts`) berfokus pada inspeksi fisik, pengujian kinerja berkala, serta keselamatan listrik medis sesuai standar **IEC 62353** (Pengujian Pasca Perbaikan/Pemeliharaan Alat Medis) dan **IEC 60601-1**.

### 7.1 Parameter Pengujian Keselamatan Listrik Medis

1. **Resistansi Arde Pelindung (Protective Earth Resistance)**: $R_{pe} \le 0.2\,\Omega$.
2. **Arus Bocor Selubung (Enclosure Leakage Current)**: $I_{ea} \le 100\,\mu\text{A}$ (Kondisi Normal) / $500\,\mu\text{A}$ (Kondisi Single Fault).
3. **Arus Bocor Pasien (Patient Leakage Current)**:
   - Type B / BF: $\le 100\,\mu\text{A}$ (AC).
   - Type CF (Direct Heart Contact): $\le 10\,\mu\text{A}$ (AC).
4. **Resistansi Isolasi (Insulation Resistance)**: $R_{ins} \ge 50\,\text{M}\Omega$ (pada tegangan uji 500V DC).

---

## BAB 8: Modul Perbaikan Alat Kesehatan (Medical Device Repair Suite)

> Status Sub-Sistem: `IMPLEMENTED`

Modul Perbaikan (`RepairWizard.tsx`, `repairCalculations.ts`, `repairMasterCatalog.ts`) memfasilitasi alur kerja penanganan kerusakan alat medis di rumah sakit atau bengkel LPAK.

```text
Alur Kerja Perbaikan Alat Medis:
[ TROUBLE_REPORTED ] ──► [ DIAGNOSTICS & ESTIMATION ] ──► [ SPAREPART_REPLACEMENT ]
                                                                   │
[ CERTIFICATE_ISSUED ] ◄── [ POST_REPAIR_CALIBRATION ] ◄── [ REPAIR_COMPLETED ]
```

- **Troubleshooting Catalog**: Mengidentifikasi gejala kerusakan (contoh: *Power Supply Drop, Sensor Drift, Transducer Element Failure*).
- **Penggantian Komponen & Spare Part**: Pencatatan nomor seri spare part pengganti dan stok terpakai.
- **Verifikasi Pasca Perbaikan**: Alat yang telah selesai diperbaiki secara otomatis ditandai wajib melalui proses **Kalibrasi Ulang (Post-Repair Recalibration)** sebelum dikembalikan ke unit pelayanan klinis.

---

## BAB 9: Manajemen Standar Ukur, Ketertelusuran & Matriks Lingkup KAN

> Status Sub-Sistem: `IMPLEMENTED`

### 9.1 Ketertelusuran Standar Ukur (Standard Traceability)

Seluruh lembar kerja wajib terhubung ke master standar ukur (*Calibrator*) yang terdaftar di modul `Calibrators.tsx` dan divalidasi oleh `standardTraceabilityEngine.ts`.

Sistem menyimpan rantai hirarki ketertelusuran:

$$\text{Unit Pelayanan RS} \longrightarrow \text{Alat Ukur Lapangan} \longrightarrow \text{Standar Kerja LPAK} \longrightarrow \text{Standar Nasional (SNSU-BSN)} \longrightarrow \text{SI (BIPM)}$$

### 9.2 Matriks Lingkup KAN & Validation Engine (`kanScopeValidationEngine.ts`)

Sebelum lembar kerja dapat disetujui, engine memvalidasi apakah pengujian yang dilakukan berada dalam lingkup akreditasi KAN LPAK:

- **Rentang Ukur (Range)**: Memastikan nilai ukur berada dalam min-max range yang diakreditasi.
- **Kemampuan Kalibrasi dan Pengukuran (CMC)**: Memastikan ketidakpastian yang dilaporkan ($U$) tidak lebih kecil dari nilai CMC terkecil yang diakui KAN.

---

## BAB 10: Ekstraksi OCR & AI Assistant (Gemini AI Vision & Piranha Parser)

> Status Sub-Sistem: `IMPLEMENTED` / `AI POWERED`

### 10.1 OCR Sertifikat Vendor & Piranha Log Extractor

1. **OCR Sertifikat Standard (`CertificateExtractor.tsx`, `ukesAiVisionEngine.ts`)**: Memanfaatkan Google Gemini API untuk mengekstrak metadata dari foto/scan sertifikat vendor kalibrasi lama (Nomor Sertifikat, Tanggal Kalibrasi, Masa Berlaku, Nilai Ketidakpastian).
2. **Parser File Log Meter Radiologi (`piranhaParser.ts`)**: Membaca file log mentah hasil pembacaan detektor radiologi *RTI Piranha / Black Piranha* secara cepat tanpa perlu mengetik ulang nilai kV, dosis, dan exposure time.

### 10.2 Asisten Pakar Metrologi (`IKAssistant.tsx`, `geminiService.ts`)

Asisten AI interaktif berbasis RAG yang dilatih dengan dokumen Instruksi Kerja (IK) kalibrasi BPFK dan Klausul ISO/IEC 17025:2017:

- Menjawab pertanyaan penanganan error alat medis di lapangan.
- Memberikan panduan koreksi ketidakpastian Tipe B.
- Menjelaskan standar toleransi Permenkes No. 54 Tahun 2015.

---

## BAB 11: Penerbitan Sertifikat Digital, QR Verification & Ekspor PDF/Excel

> Status Sub-Sistem: `IMPLEMENTED`

### 11.1 Pengamanan Sertifikat & Kode QR Verifikasi (`ukesQrVerification.ts`)

Setiap sertifikat kalibrasi atau uji kesesuaian yang diterbitkan dilengkapi dengan pengaman digital:

- **SHA-256 Signature Hash**: Kombinasi hash unik dari ID Alat, Tanggal Pengujian, Nilai Koreksi, dan ID Teknis.
- **Dynamic QR Code Verification**: QR Code tercetak pada dokumen fisik yang ketika dipindai mengarah ke URL verifikasi keaslian dokumen resmi LPAK.


### 11.2 Ekspor Dokumen Resmi (jsPDF & XLSX Engine)

- **PDF Sertifikat Kalibrasi**: Layout resmi A4 2 halaman lengkap dengan Kop LPAK, Tabel Hasil Pengukuran, Grafik Ketidakpastian, Tanda Tangan Digital Manajer Teknis, dan Logo KAN.
- **Ekspor Excel Multi-Worksheet**: Laporan rekapitulasi pekerjaan bulanan, matriks masa berlaku sertifikat alat RS, serta log histori kalibrasi.

---

## BAB 12: Keamanan, Firestore Security Rules & Audit Trail

> Status Sub-Sistem: `IMPLEMENTED` / `COMPLIANT`

### 12.1 Spesifikasi Keamanan Data (`security_spec.md`)

Sistem menerapkan prinsip **Least Privilege Access Control** dan perlindungan terhadap 12 skenario serangan siber (*The Dirty Dozen Payloads*):

1. **Identity Spoofing**: Validasi `request.auth.uid == request.resource.data.senderId`.
2. **Privilege Escalation**: Pencegahan modifikasi kolom `role` pada koleksi `users/{uid}` oleh non-admin.
3. **Immutable Signature**: Field `createdAt`, `hashSignature`, dan `measurementLogs` bersifat read-only setelah disetujui.
4. **Cross-Tenant Guard**: Isolasi data antar laboratorium/rumah sakit berbasis `tenantId`.

### 12.2 Firestore Rules Sample (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /calibrators/{calibratorId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    match /worksheets/{worksheetId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() && request.resource.data.technicianId == request.auth.uid;
      allow delete: if isAdmin();
    }
  }
}
```

---

## BAB 13: Offline-First Architecture & Edge Sync

> Status Sub-Sistem: `IMPLEMENTED` / `OFFLINE READY`

### 13.1 Offline Engine (`offlineStore.ts`)

Laboratorium radiologi berada di dalam bungker berbahan timbal (*Lead-shielded bunker*) yang sering kali mengalami kendala sinyal seluler/Wi-Fi.

Sistem dilengkapi dengan **Offline-First PWA Store**:

- **Penyimpanan Lokal**: Menggunakan IndexedDB & LocalStorage untuk menyimpan lembar kerja draft dan data pengukuran.
- **Background Synchronization**: Ketika perangkat terhubung kembali ke jaringan internet, engine melakukan rekonsiliasi data otomatis ke Firebase Cloud Firestore.
- **Conflict Resolution**: Menggunakan strategi *Technician Timestamp Lock* untuk mencegah overwrite data antar teknisi.


---

## BAB 14: Integrasi Mobile App (Capacitor 8 Android Build & Scanner)

> Status Sub-Sistem: `IMPLEMENTED`

Sistem dikemas menjadi aplikasi Android Native menggunakan **Capacitor 8 Framework** (`android/`, `capacitor.config.json`).

### 14.1 Fitur Native Mobile

- **Hardware Camera Scanner (`html5-qrcode`)**: Pemindaian cepat label Barcode/QR Code inventaris alat kesehatan di ruang rawat rumah sakit.
- **File System & Offline PDF View**: Akses penyimpanan file lokal Android untuk menyimpan draft sertifikat offline.
- **Sensors & Bluetooth Bridge**: Dukungan koneksi Bluetooth LE ke alat ukur standar digital.

---

## BAB 15: Status Implementasi, Roadmap & Matrix Kepatuhan Regulasi

> Status Sub-Sistem: `ENTERPRISE READY`

### 15.1 Matriks Kepatuhan Regulasi (Regulatory Compliance Matrix)

| Regulasi / Standar | Deskripsi Kepatuhan | Status Modul System |
| --- | --- | --- |
| **KAN ISO/IEC 17025:2017** | Persyaratan Umum Kompetensi Laboratorium Pengujian & Kalibrasi | `IMPLEMENTED` |
| **Permenkes No. 54 Tahun 2015** | Pengujian dan Kalibrasi Alat Kesehatan pada Fasilitas Pelayanan Kesehatan | `IMPLEMENTED` |
| **Perka BAPETEN (Ukes Radiologi)** | Uji Kesesuaian Pesawat Sinar-X Radiologi Diagnostik & Intervensional | `IMPLEMENTED` |
| **IEC 62353 / IEC 60601-1** | Medical Electrical Equipment — Recurrent test and test after repair | `IMPLEMENTED` |
| **UU PDP No. 27 Tahun 2022** | Perlindungan Data Pribadi & Enkripsi Log Pengukuran | `COMPLIANT` |

### 15.2 Roadmap Pengembangan Sistem

```text
┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
│ FASE 1: CORE METROLOGY    │─────►│ FASE 2: UKES RADIOLOGI    │─────►│ FASE 3: BAPETEN & BRIDGING│
│ ISO 17025 Engine, WS, PDF │      │ BAPETEN Engine, Piranha   │      │ Balis API, Si-INTAN Bridge│
└───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

---

**Spektrum Kreasi Pratama — Sistem Digital Kalibrasi & Ukes Radiologi**  
*Dokumentasi Master Sistem — Versi 2.0 Enterprise (Release 2026)*  
Hak Cipta © 2026 Spektrum Kreasi Pratama. Seluruh hak dilindungi undang-undang.
