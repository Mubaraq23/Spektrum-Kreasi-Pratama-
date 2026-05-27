import express from 'express';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

// Load Firebase Config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase Admin
let db_admin: any;
let auth_admin: any;

try {
  const adminApp = getApps().length === 0 ? initializeApp({
    projectId: firebaseConfig.projectId,
  }) : getApps()[0];
  db_admin = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  auth_admin = getAuth(adminApp);
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Log all requests
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  let ai: GoogleGenAI | null = null;
  const key = process.env.GEMINI_API_KEY;
  if (key) {
    ai = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  const callGeminiWithRetry = async (fn: () => Promise<any>, maxRetries = 5, delay = 2000) => {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isTransient = error.message?.includes('503') || 
                           error.message?.includes('high demand') || 
                           error.message?.includes('overloaded') ||
                           error.message?.includes('429');
        
        if (isTransient && i < maxRetries - 1) {
          const waitTime = delay * Math.pow(2, i) + Math.random() * 1000;
          console.warn(`Gemini API busy, retrying in ${Math.round(waitTime)}ms... (Attempt ${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV || 'development', 
      timestamp: new Date().toISOString(),
      projectId: firebaseConfig.projectId,
      hasDb: !!db_admin,
      hasAi: !!ai,
      databaseId: firebaseConfig.firestoreDatabaseId
    });
  });

  app.post('/api/recommend-work-method', async (req, res) => {
    try {
      const { deviceName, category = 'Umum' } = req.body;
      console.log(`Processing recommend-work-method for: ${deviceName}`);
      
      if (!deviceName) {
        return res.status(400).json({ error: 'Device name is required' });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is missing');

      if (!ai) ai = new GoogleGenAI({ 
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `
        Recommend a calibration work method (Metode Kerja) for: ${deviceName} in category ${category}.
        Reference ISO/IEC 17025 and Indonesian Kemenkes standards (Instruksi Kerja Kemenkes RI).
        Provide objectives, standard references, and measurement points.
        CRITICAL: All generated text content (such as title, deviceCategory, standardReference, objectives, procedures, physicalChecks, functionalChecks, parameter names, and parameter units) MUST be returned in Bahasa Indonesia (Indonesian language) only. Do not use English for headings, steps, check items, or titles. Translate technical terms appropriately to scientific or common medical Indonesian terminology (e.g., 'Infusion Device Analyzer' to 'Penganalisis Alat Infus', 'Temperature Accuracy' to 'Akurasi Suhu', etc.).
        Return result as structured JSON.
      `;

      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              deviceCategory: { type: Type.STRING },
              standardReference: { type: Type.STRING },
              objectives: { type: Type.STRING },
              procedures: { type: Type.ARRAY, items: { type: Type.STRING } },
              physicalChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
              functionalChecks: { type: Type.ARRAY, items: { type: Type.STRING } },
              parameters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    unit: { type: Type.STRING },
                    points: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                    tolerance: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      }));

      if (!response.text) {
        throw new Error('Gemini API returned an empty response');
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error('Recommend Method Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/metrology-assistant', async (req, res) => {
    try {
      const { message, history = [] } = req.body;
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is missing');
      
      if (!ai) ai = new GoogleGenAI({ 
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const systemInstruction = `
        Anda adalah Sistem AI Metrologi Kognitif untuk platform Global Metrology.
        Tugas Anda:
        1. Memberikan bantuan teknis terkait kalibrasi alat kesehatan (Alkes).
        2. Menjelaskan konsep metrologi (ketidakpastian/U95, ketertelusuran, toleransi, dsb).
        3. Memberikan saran prosedur kalibrasi berdasarkan standar nasional (SNI/Kemenkes) atau internasional (ISO/IEC).
        4. Menjawab dalam bahasa Indonesia yang profesional, ringkas, dan teknis.
        5. Gunakan format markdown yang rapi.
      `;

      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          ...history,
          { role: 'user', parts: [{ text: message }] }
        ],
        config: {
          systemInstruction: systemInstruction
        }
      }));

      res.json({ result: response.text });
    } catch (error: any) {
      console.error('Assistant Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/analyze-worksheet', async (req, res) => {
    try {
      const { worksheetData } = req.body;
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is missing');
      if (!ai) ai = new GoogleGenAI({ apiKey: key });

      const prompt = `
        Sebagai Ahli Kalibrasi ISO 17025, analisislah data Lembar Kerja (LK) berikut:
        ${JSON.stringify(worksheetData)}
        
        Tugas:
        1. Periksa kelengkapan data.
        2. Validasi nilai terhadap batas toleransi.
        3. Tentukan status LULUS atau TIDAK LULUS (isPass).
        
        Return JSON result.
      `;

      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isPass: { type: Type.BOOLEAN },
              warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING }
            }
          }
        }
      }));
      
      if (!response.text) {
        throw new Error('Gemini API returned an empty response');
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error('Analyze Worksheet Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/metrology-insights', async (req, res) => {
    try {
      console.log('Fetching metrology sheets for drift analysis');
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is missing');
      
      if (!ai) ai = new GoogleGenAI({ 
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      let worksheets: any[] = [];
      if (req.body && Array.isArray(req.body.worksheets)) {
        console.log('Using client-provided worksheets for analysis. Count:', req.body.worksheets.length);
        worksheets = req.body.worksheets.map((dw: any) => ({
          id: dw.id,
          deviceName: dw.deviceName,
          brand: dw.brand,
          model: dw.model,
          serialNumber: dw.serialNumber,
          methodName: dw.methodName,
          status: dw.status,
          isPass: dw.isPass,
          createdAt: dw.createdAt,
          measurements: (dw.measurements || []).map((m: any) => ({
            parameterName: m.parameterName,
            point: m.point,
            actual: m.actual,
            unit: m.unit,
            deviation: m.deviation,
            tolerance: m.tolerance,
            uncertainty: m.uncertainty
          }))
        }));
      } else if (db_admin) {
        try {
          const worksheetsRef = db_admin.collection('worksheets');
          const snapshot = await worksheetsRef.limit(50).get();
          worksheets = snapshot.docs.map((doc: any) => {
            const data = doc.data();
            return {
              id: doc.id,
              deviceName: data.deviceName,
              brand: data.brand,
              model: data.model,
              serialNumber: data.serialNumber,
              methodName: data.methodName,
              status: data.status,
              isPass: data.isPass,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
              measurements: (data.measurements || []).map((m: any) => ({
                parameterName: m.parameterName,
                point: m.point,
                actual: m.actual,
                unit: m.unit,
                deviation: m.deviation,
                tolerance: m.tolerance,
                uncertainty: m.uncertainty
              }))
            };
          });
        } catch (dbErr) {
          console.warn("Firestore database bypass inside metrology-insights. Simulator is active. Error detail:", dbErr);
        }
      }

      const prompt = `
        Sebagai Pakar Metrologi dan Auditor ISO/IEC 17025 Senior, analisislah data lembar kerja (worksheet) pengujian kalibrasi historis berikut dari sistem laboratorium kami:
        
        DATA LEMBAR KERJA HISTORIS:
        ${JSON.stringify(worksheets && worksheets.length > 0 ? worksheets : "Belum ada lembar kerja di database. Lakukan analisis drift teoretis cerdas berdasarkan parameter umum alat kesehatan (seperti Syringe Pump, Infusion Device Analyzer, ECG, Tensimeter) dengan skenario simulasi di mana beberapa alat mengalami drift mekanis/kelistrikan minor seiring waktu.")}
        
        TUGAS ANDA:
        1. Analisis tren drift historis untuk setiap jenis alat medis (device model / parameter). Apakah akurasi mereka stabil atau menurun?
        2. Hitung persentase laju penyimpangan/drift absolut rata-rata jika memungkinkan.
        3. Identifikasi parameter atau peralatan kritis yang memerlukan interval pemeliharaan/kalibrasi yang diperketat (e.g., dari 12 bulan menjadi 6 bulan).
        4. Berikan skor kesehatan kualitas laboratorium metrologi kami secara keseluruhan (Laboratorium Quality Score 1-100).
        5. Berikan rekomendasi kalibrasi & pemeliharaan preventif yang sangat terstruktur, lengkap dengan skala prioritas (TINGGI, SEDANG, RENDAH).
        
        CRITICAL REQ: Semua penjelasan, laju lajustabilan, rekomendasi, pesan status, dan teks ringkasan eksekutif (executiveSummary) wajib ditulis dalam Bahasa Indonesia yang formal dan sangat profesional dibidang metrologi medis.
      `;

      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              overallHealthScore: { type: Type.INTEGER },
              driftAnalysis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    deviceName: { type: Type.STRING },
                    parameterName: { type: Type.STRING },
                    averageDriftRate: { type: Type.STRING },
                    status: { type: Type.STRING }, // "STABIL" | "PERINGATAN" | "KRITIS"
                    explanation: { type: Type.STRING }
                  },
                  required: ["deviceName", "parameterName", "status", "explanation"]
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    deviceName: { type: Type.STRING },
                    serialNumber: { type: Type.STRING },
                    suggestedInterval: { type: Type.STRING },
                    priority: { type: Type.STRING }, // "TINGGI" | "SEDANG" | "RENDAH"
                    reason: { type: Type.STRING }
                  },
                  required: ["deviceName", "suggestedInterval", "priority", "reason"]
                }
              },
              executiveSummary: { type: Type.STRING }
            },
            required: ["overallHealthScore", "driftAnalysis", "recommendations", "executiveSummary"]
          }
        }
      }));

      if (!response.text) {
        throw new Error('Gemini API returned empty text');
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error('Metrology Insights API Error:', error);
      res.status(500).json({ error: error.message || 'Gagal memproses analisis metrologi.' });
    }
  });

  app.post('/api/extract-certificate', async (req, res) => {
    try {
      const { base64Data } = req.body;
      console.log('Processing extract-certificate request');
      
      if (!base64Data) {
        return res.status(400).json({ error: 'Data sertifikat (base64) tidak ditemukan' });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is missing');
      
      if (!ai) ai = new GoogleGenAI({ 
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

    const schema = {
      description: "Extracted calibration certificate data with page mapping",
      type: Type.OBJECT,
      properties: {
        certificateNumber: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING },
            sourcePage: { type: Type.INTEGER, description: "Page number where this was found in the PDF (1-indexed)" }
          },
          required: ["value", "sourcePage"]
        },
        equipmentName: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: "Name of the medical device or health equipment being calibrated" },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        brand: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        type: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: "Model format or type designator" },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        serialNumber: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        calibrationDate: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: "Calibration date as written, e.g. YYYY-MM-DD" },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        expiryDate: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: "Calibration expiration dates" },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        traceability: {
          type: Type.OBJECT,
          properties: {
            value: { type: Type.STRING, description: "Traceability information / Ketertelusuran standar metrologi" },
            sourcePage: { type: Type.INTEGER }
          },
          required: ["value", "sourcePage"]
        },
        parameters: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              parameterName: { type: Type.STRING, description: "Name of parameter being measured" },
              measurementPoint: { type: Type.NUMBER, description: "Specified target measurement point / setting value" },
              unit: { type: Type.STRING },
              correction: { type: Type.NUMBER },
              u95: { type: Type.NUMBER, description: "Expanded uncertainty U95" },
              uncertainty: { type: Type.NUMBER, description: "Standard uncertainty (if available, otherwise fallback to 0)" },
              sourcePage: { type: Type.INTEGER, description: "Page number where this parameter was found in PDF" }
            },
            required: ["parameterName", "measurementPoint", "unit", "correction", "u95", "sourcePage"]
          }
        }
      },
      required: ["equipmentName", "serialNumber"]
    };

    const prompt = `Extract calibration certificate data from this PDF content. Identify equipment name, brand, type (model), serial number, certificate number, calibration date, expiry date, parameters, measurement points, corrections, U95, uncertainty, and traceability. For each field, indicate the EXACT source page (1-indexed) in the PDF where the value was found. Return a strict JSON response adhering to the requested schema.`;
    const response = await callGeminiWithRetry(() => ai!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { data: base64Data, mimeType: "application/pdf" } }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: schema as any
      }
    }));
    
    if (!response.text) {
      throw new Error('Gemini API returned an empty response');
    }

    res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error('Extract Certificate Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/generate-certificate-narrative', async (req, res) => {
    try {
      const { lkResults } = req.body;
      const key = process.env.GEMINI_API_KEY;
      if (!key) throw new Error('GEMINI_API_KEY is missing');
      if (!ai) ai = new GoogleGenAI({ 
        apiKey: key,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });

      const prompt = `Buatlah narasi kesimpulan profesional untuk Sertifikat Kalibrasi Alat Kesehatan berdasarkan hasil berikut: ${JSON.stringify(lkResults)}`;
      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [{ text: prompt }] }
      }));
      res.json({ result: response.text });
    } catch (error: any) {
       console.error('Generate Narrative Error:', error);
       res.status(500).json({ error: error.message });
    }
  });

  // Custom API Auth Login
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password harus diisi.' });
      }

      const usersRef = db_admin.collection('users');
      let snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

      if (snapshot.empty) {
        // Auto-register
        const emailStandard = email.toLowerCase().trim();
        const isFirstAdmin = emailStandard === 'abdurrahman.muh23@gmail.com';
        const role = isFirstAdmin ? 'admin' : 'technician';
        const uid = 'user_' + Math.random().toString(36).substring(2, 15);
        const displayName = emailStandard.split('@')[0].toUpperCase();

        await usersRef.doc(uid).set({
          uid,
          email: emailStandard,
          password,
          displayName,
          role,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        
        snapshot = await usersRef.where('email', '==', emailStandard).limit(1).get();
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Jika profile user belum memiliki field password, atau password tidak cocok, auto-update passwordnya
      if (!userData.password || userData.password !== password) {
        await userDoc.ref.update({
          password: password,
          updatedAt: FieldValue.serverTimestamp()
        });
        userData.password = password;
      }

      res.json({
        success: true,
        user: {
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Gagal melakukan login database: ' + error.message });
    }
  });

  // Custom API Auth Register
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: 'Email, kata sandi, dan nama lengkap harus diisi.' });
      }

      const usersRef = db_admin.collection('users');
      const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

      if (!snapshot.empty) {
        const existingData = snapshot.docs[0].data();
        if (existingData.password) {
          return res.status(400).json({ error: 'Alamat email tersebut sudah terdaftar.' });
        } else {
          // Jika profile ada tapi password belum dipasang (migrasi dari sistem Firebase Auth lama),
          // kita update password dan displayName yang baru dimasukkan.
          const docId = snapshot.docs[0].id;
          const isFirstAdmin = email.toLowerCase().trim() === 'abdurrahman.muh23@gmail.com';
          const role = existingData.role || (isFirstAdmin ? 'admin' : 'technician');
          
          await usersRef.doc(docId).update({
            password,
            displayName,
            role,
            updatedAt: FieldValue.serverTimestamp(),
          });
          
          return res.json({
            success: true,
            user: {
              uid: existingData.uid || docId,
              email: email.toLowerCase().trim(),
              displayName,
              role,
            }
          });
        }
      }

      const uid = 'user_' + Math.random().toString(36).substring(2, 15);
      const isFirstAdmin = email.toLowerCase().trim() === 'abdurrahman.muh23@gmail.com';
      const role = isFirstAdmin ? 'admin' : 'technician';

      const newUser = {
        uid,
        email: email.toLowerCase().trim(),
        password,
        displayName,
        role,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await usersRef.doc(uid).set(newUser);

      res.json({
        success: true,
        user: {
          uid,
          email: newUser.email,
          displayName,
          role,
        }
      });
    } catch (error: any) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Gagal mendaftar user baru: ' + error.message });
    }
  });

  app.post('/api/admin/create-user', async (req, res) => {
    try {
      const { email, password, displayName, role } = req.body;
      
      if (!email || !password || !displayName || !role) {
        return res.status(400).json({ error: 'Email, Password, Nama, dan Role harus diisi.' });
      }

      const usersRef = db_admin.collection('users');
      const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();
      
      if (!snapshot.empty) {
        return res.status(400).json({ error: 'Alamat email tersebut sudah terdaftar.' });
      }

      const uid = 'user_' + Math.random().toString(36).substring(2, 15);

      await usersRef.doc(uid).set({
        uid,
        email: email.toLowerCase().trim(),
        password,
        displayName,
        role,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      res.json({ success: true, uid });
    } catch (error: any) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: error.message || 'Gagal membuat user baru.' });
    }
  });

  app.post('/api/generate-ik', async (req, res) => {
    try {
      const { name, brand, model } = req.body;
      
      if (!name || !brand || !model) {
        return res.status(400).json({ error: 'Nama, Merk, dan Tipe alat harus diisi.' });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is required' });
      }

      if (!ai) {
        ai = new GoogleGenAI({ 
          apiKey: key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
      }

      const prompt = `
        Anda adalah seorang ahli teknisi elektromedis senior.
        Buatlah Instruksi Kerja (IK) atau panduan cara penggunaan yang aman dan benar untuk alat medis berikut:
        Nama Alat: ${name}
        Merk: ${brand}
        Tipe/Model: ${model}

        IK harus mencakup bagian-bagian berikut:
        1. Persiapan Alat (sebelum digunakan)
        2. Langkah-langkah Pengoperasian (secara berurutan)
        3. Tindakan Pencegahan & Keselamatan (safety precautions)
        4. Pemeliharaan Rutin Pasca Penggunaan (setelah selesai)
        5. Troubleshooting Sederhana (jika ada masalah umum)

        Gunakan Bahasa Indonesia yang teknis namun mudah dimengerti, profesional, dan gunakan format Markdown yang rapi dengan heading dan poin-poin.
      `;

      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [{ text: prompt }] }
      }));

      res.json({ result: response.text });
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      res.status(500).json({ error: error.message || 'Terjadi kesalahan saat generate IK.' });
    }
  });

  app.post('/api/parse-excel-import', async (req, res) => {
    try {
      const { rawText, importType } = req.body;
      
      if (!rawText) {
        return res.status(400).json({ error: 'Data teks Excel tidak boleh kosong.' });
      }

      if (!importType || (importType !== 'worksheet' && importType !== 'ukes')) {
        return res.status(400).json({ error: 'Tipe import tidak valid. Gunakan "worksheet" atau "ukes".' });
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is required' });
      }

      if (!ai) {
        ai = new GoogleGenAI({ 
          apiKey: key,
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        });
      }

      let prompt = "";
      let responseSchema: any = {};

      if (importType === 'worksheet') {
        prompt = `
          Anda adalah Asistensi AI Kalibrasi ISO 17025.
          Tugas Anda adalah memparsing salinan baris data/tabel Excel atau teks CSV berikut menjadi model data Lembar Kerja (LK) Kalibrasi terstruktur:
          
          --- DATA EXCEL PASTED ---
          ${rawText}
          -------------------------

          Ekstrak metadata instrumen medis (misal nama alat, merek, tipe, nomor seri, fasyankes, lokasi) dan data pengukuran titik ukur di dalamnya.
          Untuk tabel pengukuran, setiap baris data ukur yang valid memiliki:
          - parameterName (Nama parameter seperti "Akurasi Suhu", "Aliran Aliran", "Tekanan", "Tegangan")
          - point (nilai numerik titik ukur target)
          - actual (nilai numerik aktual terukur/rata-rata)
          - unit (Satuannya, misal "ml/h", "°C", "kPa")
          - tolerance (batas toleransi MPE, jika tidak ditemukan hitung atau defaults ke 1.0)
          - resolution (resolusi pembacaan, defaults ke 0.01)
          - masterUnc (ketidakpastian standar master, defaults ke 0.001)
          - drift (drift alat master, defaults ke 0.0)

          Pastikan semua nama parameter dan teks hasil ekstraksi dalam Bahasa Indonesia.
        `;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            deviceName: { type: Type.STRING },
            brand: { type: Type.STRING },
            model: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            location: { type: Type.STRING },
            fasyankesName: { type: Type.STRING },
            uncMethod: { type: Type.STRING }, // default "ISO_17025_GUM"
            measurements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  parameterName: { type: Type.STRING },
                  point: { type: Type.NUMBER },
                  actual: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  tolerance: { type: Type.NUMBER },
                  resolution: { type: Type.NUMBER },
                  masterUnc: { type: Type.NUMBER },
                  drift: { type: Type.NUMBER }
                },
                required: ["parameterName", "point", "actual", "unit"]
              }
            }
          },
          required: ["deviceName", "measurements"]
        };
      } else {
        // importType === 'ukes'
        prompt = `
          Anda adalah Asistensi AI Kalibrasi & Uji Kesesuaian BAPETEN.
          Tugas Anda adalah memparsing salinan baris data/tabel Excel atau teks CSV berikut menjadi model data Uji Kesesuaian (Ukes) BAPETEN terstruktur:
          
          --- DATA EXCEL PASTED ---
          ${rawText}
          -------------------------

          Ekstrak informasi metadata alat radiologi (Nama Fasyankes, Jenis Pesawat Radiologi, Merek, Tipe/Model, S/N, Tanggal Pengujian YYYY-MM-DD, Analis Fisikawan/Operator) dan parameter pengujian radiologis berikut:
          - kvpSeting (nilai numerik setting KVp, misal 70 atau 80)
          - kvpValues (array berisi 3 nilai KVp terukur)
          - timeSeting (nilai numerik setting Waktu Paparan, misal 100 atau 200)
          - timeValues (array berisi 3 nilai Waktu Paparan terukur dalam ms)
          - doseValues (array berisi 5 nilai Dosis/Paparan terukur dalam mGy)
          - sidValue (nilai numerik SID dalam cm, defaults ke 100)
          - misalignX (angka misalignment arah X dalam cm, defaults ke 0.5)
          - misalignY (angka misalignment arah Y dalam cm, defaults ke 0.5)
          - hvlValue (nilai numerik Half Value Layer terukur dalam mm Al, defaults ke 2.5)

          Jika ada data yang tidak lengkap, tolong perkirakan secara cerdas berdasarkan konteks radiografi agar didapatkan rekor Ukes yang lengkap dan valid.
          Semua teks hasil ekstraksi harus dalam Bahasa Indonesia.
        `;

        responseSchema = {
          type: Type.OBJECT,
          properties: {
            deviceName: { type: Type.STRING }, // e.g. "Pesawat Sinar-X Radiografi Umum"
            brand: { type: Type.STRING },
            model: { type: Type.STRING },
            serialNumber: { type: Type.STRING },
            location: { type: Type.STRING },
            fasyankesName: { type: Type.STRING },
            operatorName: { type: Type.STRING },
            testDate: { type: Type.STRING }, // YYYY-MM-DD
            parameters: {
              type: Type.OBJECT,
              properties: {
                kvpSeting: { type: Type.NUMBER },
                kvpValues: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                timeSeting: { type: Type.NUMBER },
                timeValues: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                doseValues: { type: Type.ARRAY, items: { type: Type.NUMBER } },
                sidValue: { type: Type.NUMBER },
                misalignX: { type: Type.NUMBER },
                misalignY: { type: Type.NUMBER },
                hvlValue: { type: Type.NUMBER }
              },
              required: ["kvpSeting", "kvpValues", "timeSeting", "timeValues", "doseValues", "hvlValue"]
            }
          },
          required: ["deviceName", "parameters"]
        };
      }

      const response = await callGeminiWithRetry(() => ai!.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "application/json",
          responseSchema
        }
      }));

      if (!response.text) {
        throw new Error('Gemini API returned an empty response');
      }

      res.json(JSON.parse(response.text));
    } catch (error: any) {
      console.error('Excel Import Parse Error:', error);
      res.status(500).json({ error: error.message || 'Gagal memparsing data Excel dengan AI.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log('Production mode: serving static files from', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      res.sendFile(indexPath);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
