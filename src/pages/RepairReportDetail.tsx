import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Download, 
  ChevronLeft, 
  Award
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function RepairReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [woData, setWoData] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const fetchDoc = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'repair_work_orders', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = { id: snap.id, ...snap.data() };
          setWoData(d);

          const verifyUrl = `${window.location.origin}/repair/verify/${snap.id}`;
          const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 140 });
          setQrDataUrl(qr);
        }
      } catch (err) {
        console.error('Error fetching Repair WO detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleExportPDF = () => {
    if (!woData) return;
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Header Banner
    pdf.setFillColor(15, 23, 42); // slate-900
    pdf.rect(0, 0, 210, 35, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(15);
    pdf.setFont('helvetica', 'bold');
    pdf.text('SERVICE REPORT & SERTIFIKAT PERBAIKAN ALAT KESEHATAN', 105, 15, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`No. Work Order: ${woData.woNumber || 'WO-REP'} — Tgl: ${woData.reportDate || '-'}`, 105, 23, { align: 'center' });

    // Device Info
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('1. IDENTITAS PERALATAN & LAPORAN KERUSAKAN', 15, 45);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Nama Fasyankes: ${woData.fasyankesName || '-'}`, 15, 52);
    pdf.text(`Ruangan: ${woData.roomName || '-'}`, 15, 58);
    pdf.text(`Nama Alat: ${woData.deviceName || '-'}`, 15, 64);
    pdf.text(`Merek / Model: ${woData.brand || '-'} / ${woData.model || '-'}`, 110, 52);
    pdf.text(`No. Seri (SN): ${woData.serialNumber || '-'}`, 110, 58);
    pdf.text(`Teknisi Repair: ${woData.technicianName || '-'}`, 110, 64);

    // Final Status Box
    pdf.setFillColor(woData.finalStatus === 'SIAP DIGUNAKAN' ? 240 : 254, 253, 244);
    pdf.rect(15, 75, 180, 20, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(`STATUS AKHIR ALAT: ${woData.finalStatus || 'SIAP DIGUNAKAN'}`, 25, 87);

    // QR Image
    if (qrDataUrl) {
      pdf.addImage(qrDataUrl, 'PNG', 165, 235, 30, 30);
    }

    pdf.save(`Service_Report_${woData.serialNumber || 'Perbaikan'}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!woData) {
    return (
      <div className="p-10 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">Dokumen Repair Tidak Ditemukan</h2>
        <button onClick={() => navigate('/repair')} className="px-4 py-2 bg-rose-500 text-slate-950 font-bold rounded-xl text-xs">
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/repair')} className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <span className="text-[10px] font-mono text-rose-500 font-bold uppercase tracking-widest">{woData.woNumber || 'WO-REP'}</span>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase">{woData.deviceName}</h1>
          </div>
        </div>

        <button
          onClick={handleExportPDF}
          className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-rose-500/20"
        >
          <Download className="w-4 h-4" /> Unduh Service Report PDF
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Award className="w-3.5 h-3.5" /> Service Report & Sertifikat Perbaikan
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white">{woData.fasyankesName}</h2>
            <p className="text-xs text-slate-400">Ruangan: {woData.roomName || '-'}</p>
          </div>

          <div className="text-right">
            <span className="px-6 py-2.5 rounded-2xl text-sm font-black uppercase tracking-widest inline-block bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20">
              {woData.finalStatus || 'SIAP DIGUNAKAN'}
            </span>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">Tgl Laporan: {woData.reportDate}</p>
          </div>
        </div>

        {/* Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Merek / Tipe</span>
            <span className="font-bold text-slate-900 dark:text-white">{woData.brand} / {woData.model}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">No. Seri (SN)</span>
            <span className="font-bold text-slate-900 dark:text-white">{woData.serialNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Total Biaya</span>
            <span className="font-bold text-emerald-400">Rp {(woData.totalCost || 0).toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-sans block">Teknisi Perbaikan</span>
            <span className="font-bold text-slate-900 dark:text-white">{woData.technicianName}</span>
          </div>
        </div>

        {/* Diagnosis & Root Cause Details */}
        <div className="space-y-4 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block">Diagnosis & Error Code</span>
            <p className="font-bold text-slate-900 dark:text-white mt-1">[{woData.failureCode || 'ERR-GEN'}] {woData.diagnosisNote}</p>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block">Penyebab Utama (Root Cause)</span>
            <p className="text-slate-600 dark:text-slate-300 mt-1">{woData.rootCause || '-'}</p>
          </div>
          <div>
            <span className="font-bold text-slate-400 uppercase tracking-wider block">Tindakan Perbaikan Dilakukan</span>
            <p className="text-slate-600 dark:text-slate-300 mt-1">{woData.actionDone || '-'}</p>
          </div>
        </div>

        {/* Verification Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            {qrDataUrl && <img src={qrDataUrl} alt="QR Verifikasi" className="w-20 h-20 rounded-xl border border-slate-200 dark:border-slate-700" />}
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Verifikasi Service Report Online</p>
              <p className="text-[10px] text-slate-400 max-w-xs">Pindai kode QR untuk memverifikasi keabsahan Laporan Perbaikan ini secara resmi.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
