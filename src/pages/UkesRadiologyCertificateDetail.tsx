import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Radio, 
  Download, 
  Printer, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  FileText, 
  ChevronLeft, 
  QrCode,
  Building2,
  Stethoscope,
  Calendar,
  Award
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function UkesRadiologyCertificateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [testData, setTestData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'ukes_radiology_tests', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = { id: snap.id, ...snap.data() };
          setTestData(d);

          // Generate verification QR
          const verifyUrl = `${window.location.origin}/ukes-radiology/verify/${snap.id}`;
          const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 140 });
          setQrDataUrl(qr);
        }
      } catch (err) {
        console.error('Error fetching test detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleExportPDF = () => {
    if (!testData) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Header
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, 210, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('LAPORAN HASIL UJI KESESUAIAN PESAWAT SINAR-X', 105, 15, { align: 'center' });
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Sesuai Ketentuan BAPETEN — No. Laporan: LUK-${testData.id?.slice(0,8).toUpperCase()}`, 105, 23, { align: 'center' });

    // Details
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. IDENTITAS FASILITAS & PESAWAT', 15, 45);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Nama Fasyankes: ${testData.fasyankesName || '-'}`, 15, 52);
    pdf.text(`Ruangan: ${testData.roomName || '-'}`, 15, 58);
    pdf.text(`Modalitas: ${testData.modalityName || '-'}`, 15, 64);
    pdf.text(`Nama Pesawat: ${testData.deviceName || '-'}`, 110, 52);
    pdf.text(`Merek / Model: ${testData.brand || '-'} / ${testData.model || '-'}`, 110, 58);
    pdf.text(`No. Seri (SN): ${testData.serialNumber || '-'}`, 110, 64);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('2. HASIL EVALUASI KRITERIA BAPETEN', 15, 78);

    let yPos = 86;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Parameter Uji', 15, yPos);
    pdf.text('Rata-rata', 85, yPos);
    pdf.text('Kriteria Toleransi', 130, yPos);
    pdf.text('Status', 180, yPos);
    pdf.line(15, yPos + 2, 195, yPos + 2);
    yPos += 7;

    pdf.setFont('helvetica', 'normal');
    (testData.evaluations || []).forEach((ev: any) => {
      pdf.text(ev.parameterName || '', 15, yPos);
      pdf.text(`${ev.meanMeasured?.toFixed(2)} ${ev.unit}`, 85, yPos);
      pdf.text(ev.acceptanceCriteria || '', 130, yPos);
      pdf.text(ev.status || '', 180, yPos);
      yPos += 6;
    });

    // Conclusion Box
    pdf.setFillColor(testData.overallStatus === 'LAIK' ? 240 : 254, testData.overallStatus === 'LAIK' ? 253 : 242, testData.overallStatus === 'LAIK' ? 244 : 242);
    pdf.rect(15, yPos + 10, 180, 25, 'F');
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`KESIMPULAN AKHIR: PESAWAT ${testData.overallStatus || 'LAIK'} PAKAI`, 25, yPos + 23);

    // QR Image
    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', 165, 235, 30, 30);
    }

    pdf.save(`Laporan_UKES_Radiologi_${testData.serialNumber || 'BAPETEN'}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!testData) {
    return (
      <div className="p-10 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Dokumen Tidak Ditemukan</h2>
        <button onClick={() => navigate('/ukes-radiology')} className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/ukes-radiology')} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest">No. Laporan: LUK-{testData.id?.slice(0,8).toUpperCase()}</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{testData.deviceName} ({testData.modalityName})</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-cyan-500/20"
          >
            <Download className="w-4 h-4" /> Unduh Laporan PDF
          </button>
        </div>
      </div>

      {/* Main Certificate Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8">
        {/* Certificate Header Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Award className="w-3.5 h-3.5" /> Sertifikat Uji Kesesuaian BAPETEN
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{testData.fasyankesName}</h2>
            <p className="text-xs text-slate-400">{testData.fasyankesAddress || 'Alamat Fasyankes'}</p>
          </div>

          <div className="text-right">
            <span className={`px-6 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest inline-block ${
              testData.overallStatus === 'LAIK' || testData.overallStatus === 'PASS'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
            }`}>
              PESAWAT {testData.overallStatus} PAKAI
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">Tgl Pengujian: {testData.testDate}</p>
          </div>
        </div>

        {/* Device Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Merek / Tipe</span>
            <span className="font-bold text-slate-900 dark:text-white">{testData.brand} / {testData.model}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">No. Seri Pesawat</span>
            <span className="font-bold text-slate-900 dark:text-white">{testData.serialNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">No. Seri Tabung</span>
            <span className="font-bold text-slate-900 dark:text-white">{testData.tubeSN || '-'}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Penguji UKES</span>
            <span className="font-bold text-cyan-400">{testData.testerName}</span>
          </div>
        </div>

        {/* Parameter Table */}
        <div className="space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
            Hasil Pengujian Parameter Sesuai Regulasi BAPETEN
          </h3>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black tracking-widest text-slate-400">
                  <th className="py-3 px-3">Parameter Pengujian</th>
                  <th className="py-3 px-3">Rata-rata Terukur</th>
                  <th className="py-3 px-3">Deviasi / CV</th>
                  <th className="py-3 px-3">Acceptance Criteria</th>
                  <th className="py-3 px-3 text-right">Status Parameter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                {(testData.evaluations || []).map((ev: any) => (
                  <tr key={ev.parameterId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 text-slate-900 dark:text-white">{ev.parameterName}</td>
                    <td className="py-3 px-3 font-mono text-cyan-400">{ev.meanMeasured?.toFixed(2)} {ev.unit}</td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {ev.errorPercentage !== undefined ? `${ev.errorPercentage.toFixed(2)}%` : ev.cvPercentage !== undefined ? `CV ${ev.cvPercentage.toFixed(2)}%` : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-emerald-500">{ev.acceptanceCriteria}</td>
                    <td className="py-3 px-3 text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        ev.status === 'PASS' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {ev.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Footer with QR Code */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Verifikasi" className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700" />}
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Verifikasi Dokumen Online</p>
              <p className="text-[10px] text-slate-400 max-w-xs">Pindai kode QR untuk memverifikasi keabsahan Sertifikat Uji Kesesuaian BAPETEN ini secara resmi.</p>
            </div>
          </div>

          <div className="text-right font-mono text-xs">
            <p className="text-[10px] text-slate-400 font-sans uppercase">Versi Regulasi BAPETEN</p>
            <p className="font-bold text-cyan-400">{testData.regulationVersion || 'BAPETEN-2024-V1'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
