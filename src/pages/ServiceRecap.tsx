import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Search, 
  Download, 
  Building2, 
  Layers, 
  Printer, 
  ArrowUpRight, 
  Sparkles,
  Award,
  Stethoscope,
  Activity,
  Loader2,
  FileText,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

type TabKey = 'ALL' | 'KALIBRASI' | 'UKES' | 'IPM' | 'REPAIR' | 'PENDING';

interface RawWorksheet {
  id: string;
  overallStatus?: string;
  status?: string;
  toolName?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  institution?: string;
  location?: string;
  certificateNumber?: string;
  createdBy?: string;
  createdAt?: Timestamp;
  identityData?: {
    toolName?: string;
    name?: string;
    brand?: string;
    typeModel?: string;
    serialNumber?: string;
    institution?: string;
    location?: string;
    calibrationDate?: string;
    calibrationDueDate?: string;
    certificateNumber?: string;
    technicianName?: string;
  };
}

interface RawUkesReport {
  id: string;
  deviceName?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  fasyankesName?: string;
  roomName?: string;
  overallStatus?: string;
  lhuNumber?: string;
  certificateNumber?: string;
  createdBy?: string;
  createdAt?: Timestamp;
}

interface RawIpmReport {
  id: string;
  equipmentName?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  fasyankesName?: string;
  hospital?: string;
  room?: string;
  status?: string;
  reportNumber?: string;
  technician?: string;
  createdBy?: string;
  createdAt?: Timestamp;
}

interface RawRepairReport {
  id: string;
  equipmentName?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  fasyankesName?: string;
  hospital?: string;
  room?: string;
  status?: string;
  repairNumber?: string;
  technician?: string;
  createdBy?: string;
  createdAt?: Timestamp;
}

interface RawEquipment {
  id: string;
  name?: string;
  serialNumber?: string;
  brand?: string;
}

interface RecapItem {
  id: string;
  sourceType: 'KALIBRASI' | 'UKES' | 'IPM' | 'REPAIR';
  deviceName: string;
  brand: string;
  model: string;
  serialNumber: string;
  fasyankes: string;
  room: string;
  serviceDate: string;
  expiryDate?: string;
  status: 'LAIK' | 'TIDAK_LAIK' | 'SELESAI' | 'DALAM_PROSES' | 'KADALUARSA';
  certificateNumber?: string;
  technician: string;
  detailsUrl: string;
}

export function ServiceRecap() {
  const [activeTab, setActiveTab] = useState<TabKey>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFasyankes, setSelectedFasyankes] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [showBapModal, setShowBapModal] = useState<boolean>(false);

  // Firestore raw state
  const [worksheets, setWorksheets] = useState<RawWorksheet[]>([]);
  const [ukesReports, setUkesReports] = useState<RawUkesReport[]>([]);
  const [ipmReports, setIpmReports] = useState<RawIpmReport[]>([]);
  const [repairReports, setRepairReports] = useState<RawRepairReport[]>([]);
  const [equipmentList, setEquipmentList] = useState<RawEquipment[]>([]);

  useEffect(() => {
    // 1. Fetch Worksheets (Kalibrasi)
    const unsubWs = onSnapshot(query(collection(db, 'worksheets'), orderBy('createdAt', 'desc')), (snapshot) => {
      setWorksheets(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RawWorksheet)));
      setLoading(false);
    }, () => setLoading(false));

    // 2. Fetch UKES Reports
    const unsubUkes = onSnapshot(query(collection(db, 'radiology_test_reports'), orderBy('createdAt', 'desc')), (snapshot) => {
      setUkesReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RawUkesReport)));
    }, () => {});

    // 3. Fetch IPM Reports
    const unsubIpm = onSnapshot(query(collection(db, 'ipm_test_reports'), orderBy('createdAt', 'desc')), (snapshot) => {
      setIpmReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RawIpmReport)));
    }, () => {});

    // 4. Fetch Repair Reports
    const unsubRepair = onSnapshot(query(collection(db, 'repair_reports'), orderBy('createdAt', 'desc')), (snapshot) => {
      setRepairReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RawRepairReport)));
    }, () => {});

    // 5. Fetch Medical Equipment Inventory
    const unsubEq = onSnapshot(query(collection(db, 'medicalEquipment')), (snapshot) => {
      setEquipmentList(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as RawEquipment)));
    }, () => {});

    return () => {
      unsubWs();
      unsubUkes();
      unsubIpm();
      unsubRepair();
      unsubEq();
    };
  }, []);

  // Transform and aggregate all services into unified list
  const allRecapItems = useMemo<RecapItem[]>(() => {
    const items: RecapItem[] = [];

    // Map Worksheets (Kalibrasi)
    worksheets.forEach(w => {
      const isPassed = w.overallStatus === 'PASSED' || w.status === 'approved' || w.status === 'verified';
      items.push({
        id: w.id,
        sourceType: 'KALIBRASI',
        deviceName: w.identityData?.toolName || w.toolName || w.identityData?.name || 'Alat Medis',
        brand: w.identityData?.brand || w.brand || '-',
        model: w.identityData?.typeModel || w.model || '-',
        serialNumber: w.identityData?.serialNumber || w.serialNumber || '-',
        fasyankes: w.identityData?.institution || w.institution || 'RSUD / Fasyankes',
        room: w.identityData?.location || w.location || '-',
        serviceDate: w.identityData?.calibrationDate || (w.createdAt ? new Date(w.createdAt.seconds * 1000).toISOString().split('T')[0] : '-'),
        expiryDate: w.identityData?.calibrationDueDate || '-',
        status: isPassed ? 'LAIK' : (w.overallStatus === 'FAILED' ? 'TIDAK_LAIK' : 'DALAM_PROSES'),
        certificateNumber: w.certificateNumber || w.identityData?.certificateNumber || '-',
        technician: w.identityData?.technicianName || w.createdBy || 'Teknisi Metrologi',
        detailsUrl: `/worksheets/edit/${w.id}`
      });
    });

    // Map UKES Reports
    ukesReports.forEach(u => {
      items.push({
        id: u.id,
        sourceType: 'UKES',
        deviceName: u.deviceName || 'Pesawat Sinar-X Radiologi',
        brand: u.brand || '-',
        model: u.model || '-',
        serialNumber: u.serialNumber || '-',
        fasyankes: u.fasyankesName || 'Fasyankes Radiologi',
        room: u.roomName || '-',
        serviceDate: u.createdAt ? new Date(u.createdAt.seconds * 1000).toISOString().split('T')[0] : '-',
        status: u.overallStatus === 'LAIK' ? 'LAIK' : 'TIDAK_LAIK',
        certificateNumber: u.lhuNumber || u.certificateNumber || `UKES-${u.id.substring(0, 6).toUpperCase()}`,
        technician: u.createdBy || 'Fisikawan Medis UKES',
        detailsUrl: `/ukes-radiology/reports/${u.id}`
      });
    });

    // Map IPM Reports
    ipmReports.forEach(ipm => {
      items.push({
        id: ipm.id,
        sourceType: 'IPM',
        deviceName: ipm.equipmentName || 'Pemeliharaan Alat',
        brand: ipm.brand || '-',
        model: ipm.model || '-',
        serialNumber: ipm.serialNumber || '-',
        fasyankes: ipm.fasyankesName || ipm.hospital || 'Fasyankes',
        room: ipm.room || '-',
        serviceDate: ipm.createdAt ? new Date(ipm.createdAt.seconds * 1000).toISOString().split('T')[0] : '-',
        status: ipm.status === 'COMPLETED' ? 'SELESAI' : 'DALAM_PROSES',
        certificateNumber: ipm.reportNumber || `IPM-${ipm.id.substring(0, 6).toUpperCase()}`,
        technician: ipm.technician || ipm.createdBy || 'Teknisi Elektromedis',
        detailsUrl: `/ipm/reports/${ipm.id}`
      });
    });

    // Map Repair Reports
    repairReports.forEach(rep => {
      items.push({
        id: rep.id,
        sourceType: 'REPAIR',
        deviceName: rep.equipmentName || 'Perbaikan Alat',
        brand: rep.brand || '-',
        model: rep.model || '-',
        serialNumber: rep.serialNumber || '-',
        fasyankes: rep.fasyankesName || rep.hospital || 'Fasyankes',
        room: rep.room || '-',
        serviceDate: rep.createdAt ? new Date(rep.createdAt.seconds * 1000).toISOString().split('T')[0] : '-',
        status: rep.status === 'COMPLETED' ? 'SELESAI' : 'DALAM_PROSES',
        certificateNumber: rep.repairNumber || `REP-${rep.id.substring(0, 6).toUpperCase()}`,
        technician: rep.technician || rep.createdBy || 'Teknisi Perbaikan',
        detailsUrl: `/repair/reports/${rep.id}`
      });
    });

    return items;
  }, [worksheets, ukesReports, ipmReports, repairReports]);

  // Unique Fasyankes list for dropdown filter
  const fasyankesOptions = useMemo(() => {
    const list = new Set<string>();
    allRecapItems.forEach(item => {
      if (item.fasyankes && item.fasyankes !== '-') list.add(item.fasyankes);
    });
    return Array.from(list);
  }, [allRecapItems]);

  // Filtered List based on activeTab, search, and Fasyankes
  const filteredItems = useMemo(() => {
    return allRecapItems.filter(item => {
      // Tab filter
      if (activeTab === 'KALIBRASI' && item.sourceType !== 'KALIBRASI') return false;
      if (activeTab === 'UKES' && item.sourceType !== 'UKES') return false;
      if (activeTab === 'IPM' && item.sourceType !== 'IPM') return false;
      if (activeTab === 'REPAIR' && item.sourceType !== 'REPAIR') return false;
      if (activeTab === 'PENDING' && item.status !== 'DALAM_PROSES' && item.status !== 'TIDAK_LAIK') return false;

      // Fasyankes filter
      if (selectedFasyankes !== 'ALL' && item.fasyankes !== selectedFasyankes) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.deviceName?.toLowerCase().includes(q);
        const matchSn = item.serialNumber?.toLowerCase().includes(q);
        const matchBrand = item.brand?.toLowerCase().includes(q);
        const matchCert = item.certificateNumber?.toLowerCase().includes(q);
        const matchFas = item.fasyankes?.toLowerCase().includes(q);
        return matchName || matchSn || matchBrand || matchCert || matchFas;
      }

      return true;
    });
  }, [allRecapItems, activeTab, selectedFasyankes, searchTerm]);

  // KPI Metrics
  const kpiStats = useMemo(() => {
    const total = allRecapItems.length;
    const kalibrasiCount = allRecapItems.filter(i => i.sourceType === 'KALIBRASI' && i.status === 'LAIK').length;
    const ukesCount = allRecapItems.filter(i => i.sourceType === 'UKES' && i.status === 'LAIK').length;
    const ipmCount = allRecapItems.filter(i => i.sourceType === 'IPM' && i.status === 'SELESAI').length;
    const repairCount = allRecapItems.filter(i => i.sourceType === 'REPAIR' && i.status === 'SELESAI').length;
    const laikRatio = total > 0 
      ? Math.round(((kalibrasiCount + ukesCount + ipmCount + repairCount) / total) * 100)
      : 100;

    return {
      total,
      kalibrasiCount,
      ukesCount,
      ipmCount,
      repairCount,
      laikRatio,
      totalInventaris: equipmentList.length
    };
  }, [allRecapItems, equipmentList]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Jenis Layanan', 'Nama Alat', 'Merek', 'Model', 'Serial Number', 'Fasyankes / RS', 'Ruangan', 'Tanggal Layanan', 'Status Kelaikan', 'No. Sertifikat / LHU', 'Teknisi'];
    const rows = filteredItems.map(i => [
      i.sourceType,
      `"${i.deviceName}"`,
      `"${i.brand}"`,
      `"${i.model}"`,
      `"${i.serialNumber}"`,
      `"${i.fasyankes}"`,
      `"${i.room}"`,
      i.serviceDate,
      i.status,
      `"${i.certificateNumber || '-'}"`,
      `"${i.technician}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekapan_BAP_Layanan_${selectedFasyankes !== 'ALL' ? selectedFasyankes : 'Semua_Instansi'}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 border border-slate-800 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-xs font-bold uppercase tracking-widest font-mono">
            <Layers className="w-4 h-4 animate-pulse" /> Berita Acara Pelaksanaan (BAP) & Rekapan Layanan Per Instansi
          </div>
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight font-mono">
            Rekapan Layanan & Berita Acara Pelaksanaan (BAP)
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Pencatatan resmi Berita Acara Pelaksanaan (BAP) per instansi rumah sakit: kalibrasi KAN, uji kesesuaian BAPETEN, pemeliharaan preventif (IPM), dan perbaikan teknis.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBapModal(true)}
            className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 font-mono transition-all"
          >
            <FileText className="w-4 h-4" /> Cetak Dokumen BAP Resmi
          </button>
          <button
            onClick={handleExportCSV}
            className="px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 font-mono transition-all"
          >
            <Download className="w-4 h-4" /> Ekspor Rekapan BAP (CSV)
          </button>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-2xl text-cyan-400 gap-2 text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data rekapan BAP layanan...
        </div>
      )}

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Total Layanan</span>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{kpiStats.total}</p>
          <span className="text-[10px] text-slate-400 font-medium">Record BAP</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Terkalibrasi</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 font-mono">{kpiStats.kalibrasiCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Sertifikat KAN Aktif</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Lolos UKES</span>
            <Radio className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500 font-mono">{kpiStats.ukesCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Laik Sinar-X BAPETEN</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Selesai IPM</span>
            <Wrench className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-500 font-mono">{kpiStats.ipmCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Preventif Terjadwal</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Perbaikan</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-500 font-mono">{kpiStats.repairCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Corrective Selesai</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Inventaris</span>
            <Stethoscope className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{kpiStats.totalInventaris}</p>
          <span className="text-[10px] text-slate-400 font-medium">Total Aset RS</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Service Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: 'ALL' as TabKey, label: 'Semua Layanan BAP', icon: Layers, count: allRecapItems.length },
              { key: 'KALIBRASI' as TabKey, label: 'Sudah Dikalibrasi', icon: Award, count: allRecapItems.filter(i => i.sourceType === 'KALIBRASI').length },
              { key: 'UKES' as TabKey, label: 'Sudah UKES (Radiologi)', icon: Radio, count: allRecapItems.filter(i => i.sourceType === 'UKES').length },
              { key: 'IPM' as TabKey, label: 'Sudah Pemeliharaan (IPM)', icon: Wrench, count: allRecapItems.filter(i => i.sourceType === 'IPM').length },
              { key: 'REPAIR' as TabKey, label: 'Sudah Diperbaiki', icon: Sparkles, count: allRecapItems.filter(i => i.sourceType === 'REPAIR').length },
              { key: 'PENDING' as TabKey, label: 'Perlu Perhatian / Pending', icon: AlertTriangle, count: allRecapItems.filter(i => i.status === 'DALAM_PROSES' || i.status === 'TIDAK_LAIK').length }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-4 py-2.5 rounded-2xl text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer",
                  activeTab === tab.key
                    ? "bg-slate-950 dark:bg-cyan-500 text-white dark:text-slate-950 shadow-md"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded-md text-[10px] font-mono",
                  activeTab === tab.key ? "bg-white/20 dark:bg-slate-950/20" : "bg-slate-200 dark:bg-slate-700"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Fasyankes Selector */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-slate-400 font-bold">Filter Instansi:</span>
            <select
              value={selectedFasyankes}
              onChange={(e) => setSelectedFasyankes(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">Semua Instansi / Rumah Sakit</option>
              {fasyankesOptions.map((f, idx) => (
                <option key={idx} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama instansi fasyankes, nama alat, nomor seri (S/N), merek, no sertifikat / LHU..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
      </div>

      {/* Recap Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-widest font-mono">
                <th className="py-4 px-5">Tipe Layanan</th>
                <th className="py-4 px-5">Identitas Alat Medis</th>
                <th className="py-4 px-5">Instansi / Lokasi</th>
                <th className="py-4 px-5">Tanggal & Masa Berlaku</th>
                <th className="py-4 px-5">No. Sertifikat / LHU</th>
                <th className="py-4 px-5 text-center">Status Kelaikan</th>
                <th className="py-4 px-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-mono text-xs">
                    Tidak ada data BAP layanan yang sesuai dengan instansi dan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={`${item.sourceType}-${item.id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-5">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase font-mono border",
                        item.sourceType === 'KALIBRASI' && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                        item.sourceType === 'UKES' && "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
                        item.sourceType === 'IPM' && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                        item.sourceType === 'REPAIR' && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      )}>
                        {item.sourceType === 'KALIBRASI' && <Award className="w-3 h-3" />}
                        {item.sourceType === 'UKES' && <Radio className="w-3 h-3" />}
                        {item.sourceType === 'IPM' && <Wrench className="w-3 h-3" />}
                        {item.sourceType === 'REPAIR' && <Sparkles className="w-3 h-3" />}
                        {item.sourceType}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{item.deviceName}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {item.brand} • {item.model} • S/N: <span className="font-bold text-slate-600 dark:text-slate-300">{item.serialNumber}</span>
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-cyan-400" /> {item.fasyankes}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">Ruang: {item.room}</p>
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs">
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{item.serviceDate}</p>
                        {item.expiryDate && item.expiryDate !== '-' && (
                          <p className="text-[10px] text-slate-400">Exp: {item.expiryDate}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-5 font-mono text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">{item.certificateNumber}</span>
                      <p className="text-[10px] text-slate-400">{item.technician}</p>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase font-mono border",
                        (item.status === 'LAIK' || item.status === 'SELESAI')
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                          : item.status === 'TIDAK_LAIK'
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      )}>
                        {(item.status === 'LAIK' || item.status === 'SELESAI') && <CheckCircle2 className="w-3 h-3" />}
                        {item.status === 'TIDAK_LAIK' && <AlertTriangle className="w-3 h-3" />}
                        {item.status === 'DALAM_PROSES' && <Clock className="w-3 h-3" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <Link
                        to={item.detailsUrl}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/10 text-slate-700 dark:text-slate-300 hover:text-cyan-400 rounded-xl text-xs font-bold font-mono transition-colors"
                      >
                        Buka <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official BAP Printable Document Modal */}
      {showBapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
          <div className="bg-white text-slate-900 w-full max-w-4xl p-8 md:p-12 rounded-3xl shadow-2xl space-y-6 print:p-0 print:shadow-none print:w-full font-serif">
            {/* Modal Actions */}
            <div className="flex justify-between items-center border-b pb-4 print:hidden font-sans">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900">Dokumen Berita Acara Pelaksanaan (BAP)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> Cetak BAP
                </button>
                <button
                  onClick={() => setShowBapModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* BAP Header */}
            <div className="text-center space-y-2 border-b-2 border-slate-900 pb-6">
              <h2 className="text-xl font-black uppercase tracking-wider">PT. SPEKTRUM KREASI PRATAMA</h2>
              <p className="text-xs font-sans text-slate-600">Laboratorium Kalibrasi & Pengujian Metrologi Medis Terakreditasi KAN (LK-291-IDN)</p>
              <div className="text-sm font-bold uppercase tracking-widest pt-2">
                BERITA ACARA PELAKSANAAN (BAP) KALIBRASI & MAINTENANCE
              </div>
              <p className="text-xs font-mono text-slate-500">Nomor: BAP/SPK/{selectedFasyankes !== 'ALL' ? selectedFasyankes.replace(/\s+/g, '-').toUpperCase() : 'INSTANSI'}/{new Date().getFullYear()}</p>
            </div>

            {/* BAP Narrative Statement */}
            <div className="text-xs leading-relaxed space-y-2 font-sans">
              <p>
                Pada hari ini, tanggal <strong>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah dilaksanakan pekerjaan Kalibrasi, Uji Kesesuaian Radiologi, dan Pemeliharaan Preventif (IPM) Peralatan Kesehatan untuk:
              </p>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border text-xs">
                <div><strong>Nama Fasyankes / RS:</strong> {selectedFasyankes !== 'ALL' ? selectedFasyankes : 'Seluruh Fasyankes Terdata'}</div>
                <div><strong>Jumlah Alat Ditindak:</strong> {filteredItems.length} Unit</div>
              </div>
            </div>

            {/* Equipment Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse border border-slate-900 text-left font-sans">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-slate-900 font-bold uppercase">
                    <th className="p-2 border border-slate-900 text-center">No</th>
                    <th className="p-2 border border-slate-900">Nama Alat Kesehatan</th>
                    <th className="p-2 border border-slate-900">Merek / Type</th>
                    <th className="p-2 border border-slate-900">Nomor Seri (S/N)</th>
                    <th className="p-2 border border-slate-900">Jenis Layanan</th>
                    <th className="p-2 border border-slate-900 text-center">Status Kelaikan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it, i) => (
                    <tr key={it.id} className="border-b border-slate-900">
                      <td className="p-2 border border-slate-900 text-center">{i + 1}</td>
                      <td className="p-2 border border-slate-900 font-bold">{it.deviceName}</td>
                      <td className="p-2 border border-slate-900">{it.brand} / {it.model}</td>
                      <td className="p-2 border border-slate-900 font-mono">{it.serialNumber}</td>
                      <td className="p-2 border border-slate-900">{it.sourceType}</td>
                      <td className="p-2 border border-slate-900 text-center font-bold">
                        {it.status === 'LAIK' || it.status === 'SELESAI' ? 'LAIK PAKAI' : 'TIDAK LAIK'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Block */}
            <div className="grid grid-cols-2 gap-8 pt-8 font-sans text-xs text-center">
              <div className="space-y-12">
                <p>PIHAK PERTAMA<br /><strong>PT. SPEKTRUM KREASI PRATAMA</strong></p>
                <div className="pt-8 border-b border-slate-900 w-48 mx-auto" />
                <p className="font-bold">Manajer Teknis Metrologi</p>
              </div>

              <div className="space-y-12">
                <p>PIHAK KEDUA<br /><strong>{selectedFasyankes !== 'ALL' ? selectedFasyankes : 'FASYANKES RUMAH SAKIT'}</strong></p>
                <div className="pt-8 border-b border-slate-900 w-48 mx-auto" />
                <p className="font-bold">Kepala IPSRS / Penanggung Jawab Alat</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
