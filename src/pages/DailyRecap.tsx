import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Building2, 
  Search, 
  Download, 
  Printer, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Layers, 
  Activity, 
  Award, 
  Radio, 
  Wrench, 
  Sparkles, 
  ArrowUpRight,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Loader2,
  Filter,
  RotateCcw,
  X,
  FileText
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';

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

export interface DailyRecapItem {
  id: string;
  serviceType: 'KALIBRASI' | 'UKES' | 'IPM' | 'REPAIR';
  deviceName: string;
  brand: string;
  model: string;
  serialNumber: string;
  room: string;
  institution: string;
  executionDate: string;
  status: 'LAIK' | 'TIDAK_LAIK' | 'SELESAI' | 'DALAM_PROSES';
  certificateNumber: string;
  technician: string;
  detailsUrl: string;
}

export function DailyRecap() {
  type DateFilterMode = 'SINGLE' | 'RANGE' | 'ALL';

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getDaysAgoStr = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>('SINGLE');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [startDate, setStartDate] = useState<string>(getDaysAgoStr(6));
  const [endDate, setEndDate] = useState<string>(getTodayStr());
  const [selectedInstitution, setSelectedInstitution] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedService, setSelectedService] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Firestore raw state
  const [worksheets, setWorksheets] = useState<RawWorksheet[]>([]);
  const [ukesReports, setUkesReports] = useState<RawUkesReport[]>([]);
  const [ipmReports, setIpmReports] = useState<RawIpmReport[]>([]);
  const [repairReports, setRepairReports] = useState<RawRepairReport[]>([]);

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

    return () => {
      unsubWs();
      unsubUkes();
      unsubIpm();
      unsubRepair();
    };
  }, []);

  // Aggregated all items
  const allDailyItems = useMemo<DailyRecapItem[]>(() => {
    const items: DailyRecapItem[] = [];

    // Map Worksheets
    worksheets.forEach(w => {
      const isPassed = w.overallStatus === 'PASSED' || w.status === 'approved' || w.status === 'verified';
      const execDate = w.identityData?.calibrationDate || (w.createdAt ? new Date(w.createdAt.seconds * 1000).toISOString().split('T')[0] : '-');

      items.push({
        id: w.id,
        serviceType: 'KALIBRASI',
        deviceName: w.identityData?.toolName || w.toolName || w.identityData?.name || 'Alat Medis',
        brand: w.identityData?.brand || w.brand || '-',
        model: w.identityData?.typeModel || w.model || '-',
        serialNumber: w.identityData?.serialNumber || w.serialNumber || '-',
        room: w.identityData?.location || w.location || '-',
        institution: w.identityData?.institution || w.institution || 'RSUD / Fasyankes',
        executionDate: execDate,
        status: isPassed ? 'LAIK' : (w.overallStatus === 'FAILED' ? 'TIDAK_LAIK' : 'DALAM_PROSES'),
        certificateNumber: w.certificateNumber || w.identityData?.certificateNumber || '-',
        technician: w.identityData?.technicianName || w.createdBy || 'Teknisi Metrologi',
        detailsUrl: `/worksheets/edit/${w.id}`
      });
    });

    // Map UKES Reports
    ukesReports.forEach(u => {
      const execDate = u.createdAt ? new Date(u.createdAt.seconds * 1000).toISOString().split('T')[0] : '-';
      items.push({
        id: u.id,
        serviceType: 'UKES',
        deviceName: u.deviceName || 'Pesawat Sinar-X Radiologi',
        brand: u.brand || '-',
        model: u.model || '-',
        serialNumber: u.serialNumber || '-',
        room: u.roomName || '-',
        institution: u.fasyankesName || 'Fasyankes Radiologi',
        executionDate: execDate,
        status: u.overallStatus === 'LAIK' ? 'LAIK' : 'TIDAK_LAIK',
        certificateNumber: u.lhuNumber || u.certificateNumber || `UKES-${u.id.substring(0, 6).toUpperCase()}`,
        technician: u.createdBy || 'Fisikawan Medis',
        detailsUrl: `/ukes-radiology/reports/${u.id}`
      });
    });

    // Map IPM Reports
    ipmReports.forEach(ipm => {
      const execDate = ipm.createdAt ? new Date(ipm.createdAt.seconds * 1000).toISOString().split('T')[0] : '-';
      items.push({
        id: ipm.id,
        serviceType: 'IPM',
        deviceName: ipm.equipmentName || 'Pemeliharaan Alat',
        brand: ipm.brand || '-',
        model: ipm.model || '-',
        serialNumber: ipm.serialNumber || '-',
        room: ipm.room || '-',
        institution: ipm.fasyankesName || ipm.hospital || 'Fasyankes',
        executionDate: execDate,
        status: ipm.status === 'COMPLETED' ? 'SELESAI' : 'DALAM_PROSES',
        certificateNumber: ipm.reportNumber || `IPM-${ipm.id.substring(0, 6).toUpperCase()}`,
        technician: ipm.technician || ipm.createdBy || 'Teknisi IPM',
        detailsUrl: `/ipm/reports/${ipm.id}`
      });
    });

    // Map Repair Reports
    repairReports.forEach(rep => {
      const execDate = rep.createdAt ? new Date(rep.createdAt.seconds * 1000).toISOString().split('T')[0] : '-';
      items.push({
        id: rep.id,
        serviceType: 'REPAIR',
        deviceName: rep.equipmentName || 'Perbaikan Alat',
        brand: rep.brand || '-',
        model: rep.model || '-',
        serialNumber: rep.serialNumber || '-',
        room: rep.room || '-',
        institution: rep.fasyankesName || rep.hospital || 'Fasyankes',
        executionDate: execDate,
        status: rep.status === 'COMPLETED' ? 'SELESAI' : 'DALAM_PROSES',
        certificateNumber: rep.repairNumber || `REP-${rep.id.substring(0, 6).toUpperCase()}`,
        technician: rep.technician || rep.createdBy || 'Teknisi Repair',
        detailsUrl: `/repair/reports/${rep.id}`
      });
    });

    return items;
  }, [worksheets, ukesReports, ipmReports, repairReports]);

  // Unique Institution list with item counts
  const institutionOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    allDailyItems.forEach(item => {
      if (item.institution && item.institution !== '-') {
        counts[item.institution] = (counts[item.institution] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [allDailyItems]);

  // Filtered by Selected Date / Range / All, Institution, Status, Service, Search
  const filteredDailyItems = useMemo(() => {
    return allDailyItems.filter(item => {
      // 1. Date filter mode
      if (dateFilterMode === 'SINGLE') {
        if (selectedDate && item.executionDate !== selectedDate) return false;
      } else if (dateFilterMode === 'RANGE') {
        if (startDate && item.executionDate < startDate) return false;
        if (endDate && item.executionDate > endDate) return false;
      }
      // If dateFilterMode === 'ALL', do not restrict by date

      // 2. Institution / Rumah Sakit filter
      if (selectedInstitution !== 'ALL' && item.institution.trim().toLowerCase() !== selectedInstitution.trim().toLowerCase()) {
        return false;
      }

      // 3. Status filter
      if (selectedStatus === 'LAIK' && item.status !== 'LAIK' && item.status !== 'SELESAI') return false;
      if (selectedStatus === 'TIDAK_LAIK' && item.status !== 'TIDAK_LAIK') return false;
      if (selectedStatus === 'DALAM_PROSES' && item.status !== 'DALAM_PROSES') return false;

      // 4. Service filter
      if (selectedService !== 'ALL' && item.serviceType !== selectedService) return false;

      // 5. Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchName = item.deviceName.toLowerCase().includes(q);
        const matchBrand = item.brand.toLowerCase().includes(q);
        const matchModel = item.model.toLowerCase().includes(q);
        const matchSN = item.serialNumber.toLowerCase().includes(q);
        const matchRoom = item.room.toLowerCase().includes(q);
        const matchInst = item.institution.toLowerCase().includes(q);
        const matchCert = item.certificateNumber.toLowerCase().includes(q);
        const matchTech = item.technician.toLowerCase().includes(q);
        return matchName || matchBrand || matchModel || matchSN || matchRoom || matchInst || matchCert || matchTech;
      }

      return true;
    });
  }, [allDailyItems, dateFilterMode, selectedDate, startDate, endDate, selectedInstitution, selectedStatus, selectedService, searchTerm]);

  // Daily KPI Stats
  const dailyStats = useMemo(() => {
    const total = filteredDailyItems.length;
    const laikCount = filteredDailyItems.filter(i => i.status === 'LAIK' || i.status === 'SELESAI').length;
    const tidakLaikCount = filteredDailyItems.filter(i => i.status === 'TIDAK_LAIK').length;
    const inProgressCount = filteredDailyItems.filter(i => i.status === 'DALAM_PROSES').length;
    const institutionsCovered = new Set(filteredDailyItems.map(i => i.institution)).size;
    const complianceRate = total > 0 ? Math.round((laikCount / total) * 100) : 100;

    return {
      total,
      laikCount,
      tidakLaikCount,
      inProgressCount,
      institutionsCovered,
      complianceRate
    };
  }, [filteredDailyItems]);

  const changeDateByDays = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  // Date Preset Helpers
  const setPresetToday = () => {
    setDateFilterMode('SINGLE');
    setSelectedDate(getTodayStr());
  };

  const setPresetYesterday = () => {
    setDateFilterMode('SINGLE');
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const setPresetLast7Days = () => {
    setDateFilterMode('RANGE');
    setStartDate(getDaysAgoStr(6));
    setEndDate(getTodayStr());
  };

  const setPresetThisMonth = () => {
    setDateFilterMode('RANGE');
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(now.toISOString().split('T')[0]);
  };

  const setPresetAllDates = () => {
    setDateFilterMode('ALL');
  };

  const handleResetFilters = () => {
    setDateFilterMode('SINGLE');
    setSelectedDate(getTodayStr());
    setSelectedInstitution('ALL');
    setSelectedStatus('ALL');
    setSelectedService('ALL');
    setSearchTerm('');
  };

  const hasActiveFilters = useMemo(() => {
    return (
      dateFilterMode !== 'SINGLE' ||
      selectedDate !== getTodayStr() ||
      selectedInstitution !== 'ALL' ||
      selectedStatus !== 'ALL' ||
      selectedService !== 'ALL' ||
      searchTerm.trim() !== ''
    );
  }, [dateFilterMode, selectedDate, selectedInstitution, selectedStatus, selectedService, searchTerm]);

  // Dynamic Filename Generator based on selected filters
  const getExportFilename = (extension: 'xlsx' | 'csv') => {
    let instPart = 'Semua_RS';
    if (selectedInstitution !== 'ALL') {
      instPart = selectedInstitution.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 30);
    }

    let datePart = 'Semua_Tanggal';
    if (dateFilterMode === 'SINGLE') {
      datePart = selectedDate || 'Hari_Ini';
    } else if (dateFilterMode === 'RANGE') {
      datePart = `${startDate || 'Awal'}_sd_${endDate || 'Akhir'}`;
    }

    return `Rekapan_${instPart}_${datePart}.${extension}`;
  };

  // Export to Excel (.xlsx) using xlsx library
  const handleExportExcel = () => {
    if (filteredDailyItems.length === 0) {
      alert('Tidak ada data pengerjaan yang cocok dengan filter saat ini.');
      return;
    }

    const data = filteredDailyItems.map((item, idx) => ({
      'No': idx + 1,
      'Nama Alat Medis': item.deviceName,
      'Merek': item.brand,
      'Type / Model': item.model,
      'Nomor Seri (SN)': item.serialNumber,
      'Ruangan / Lokasi': item.room,
      'Rumah Sakit / Fasyankes': item.institution,
      'Tanggal Pengerjaan': item.executionDate,
      'Status Kelaikan': item.status,
      'Jenis Layanan': item.serviceType,
      'No. Sertifikat / LHU': item.certificateNumber,
      'Teknisi Pelaksana': item.technician,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set nice column widths
    worksheet['!cols'] = [
      { wch: 6 },   // No
      { wch: 32 },  // Nama Alat
      { wch: 16 },  // Merek
      { wch: 18 },  // Type/Model
      { wch: 20 },  // SN
      { wch: 18 },  // Ruangan
      { wch: 30 },  // RS
      { wch: 16 },  // Tanggal
      { wch: 14 },  // Status
      { wch: 16 },  // Jenis Layanan
      { wch: 24 },  // No. Sertifikat
      { wch: 24 },  // Teknisi
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekapitulasi Harian');
    XLSX.writeFile(workbook, getExportFilename('xlsx'));
  };

  // Export to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (filteredDailyItems.length === 0) {
      alert('Tidak ada data pengerjaan yang cocok dengan filter saat ini.');
      return;
    }

    const headers = [
      'No',
      'Nama Alat Medis',
      'Merek',
      'Type / Model',
      'Nomor Seri (SN)',
      'Ruangan / Lokasi',
      'Rumah Sakit / Fasyankes',
      'Tanggal Pengerjaan',
      'Status Kelaikan',
      'Jenis Layanan',
      'No. Sertifikat / LHU',
      'Teknisi Pelaksana'
    ];

    const rows = filteredDailyItems.map((item, idx) => [
      idx + 1,
      `"${(item.deviceName || '').replace(/"/g, '""')}"`,
      `"${(item.brand || '').replace(/"/g, '""')}"`,
      `"${(item.model || '').replace(/"/g, '""')}"`,
      `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
      `"${(item.room || '').replace(/"/g, '""')}"`,
      `"${(item.institution || '').replace(/"/g, '""')}"`,
      item.executionDate,
      item.status,
      item.serviceType,
      `"${(item.certificateNumber || '').replace(/"/g, '""')}"`,
      `"${(item.technician || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getExportFilename('csv'));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format date display for Indonesian locale
  const formattedDateDescription = useMemo(() => {
    if (dateFilterMode === 'ALL') {
      return 'Semua Riwayat Tanggal';
    }
    if (dateFilterMode === 'RANGE') {
      return `Rentang: ${startDate || '...'} s/d ${endDate || '...'}`;
    }
    try {
      const d = new Date(selectedDate);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return selectedDate;
    }
  }, [dateFilterMode, selectedDate, startDate, endDate]);

  return (
    <div className="p-2 sm:p-4 md:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto font-sans">
      {/* Printable Header (Visible only during print) */}
      <div className="hidden print:block text-black p-4 border-b-2 border-black mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold uppercase">PT SPEKTRUM KREASI PRATAMA</h1>
            <p className="text-xs">Laboratorium Kalibrasi & Metrologi Kesehatan • KAN LK-291-IDN & LP-1849-IDN</p>
            <h2 className="text-base font-bold uppercase mt-2">LEMBAR REKAPAN HARIAN PENGERJAAN ALAT MEDIS</h2>
            {selectedInstitution !== 'ALL' && (
              <p className="text-sm font-bold mt-1 text-slate-800 uppercase">
                FASYANKES / RUMAH SAKIT: {selectedInstitution}
              </p>
            )}
          </div>
          <div className="text-right text-xs">
            <p><span className="font-bold">Periode:</span> {formattedDateDescription}</p>
            <p><span className="font-bold">Instansi:</span> {selectedInstitution === 'ALL' ? 'Semua Instansi' : selectedInstitution}</p>
            <p><span className="font-bold">Total Alat:</span> {filteredDailyItems.length} Unit</p>
          </div>
        </div>
      </div>

      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900 border border-slate-800 p-6 sm:p-8 rounded-2xl sm:rounded-3xl text-white shadow-2xl relative overflow-hidden print:hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-xs font-bold uppercase tracking-widest font-mono">
            <CalendarDays className="w-4 h-4 animate-pulse" /> Modul Rekapan Harian
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight font-mono">
            Rekapan Harian Pelaksanaan Alat Medis
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
            Filter pengerjaan alat medis per Rumah Sakit/Fasyankes maupun per tanggal/rentang waktu, dan unduh rekapan instan dalam format Excel atau CSV.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 sm:gap-3">
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 font-mono transition-all active:scale-95"
            title="Download file Excel .xlsx"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Excel (.xlsx)
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-none px-4 sm:px-5 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 font-mono transition-all active:scale-95"
            title="Download file CSV"
          >
            <Download className="w-4 h-4" /> Download CSV
          </button>
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-4 sm:px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl sm:rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer border border-slate-700 font-mono transition-all"
            title="Cetak format cetak resmi PDF"
          >
            <Printer className="w-4 h-4" /> Cetak Rekapan
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-sm space-y-5 print:hidden">
        {/* ROW 1: DATE FILTER MODES & SELECTOR */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-cyan-500" /> Filter Waktu Pengerjaan:
            </span>

            {/* Date Mode Pills */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
              <button
                type="button"
                onClick={() => setDateFilterMode('SINGLE')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  dateFilterMode === 'SINGLE'
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                📅 Per Tanggal
              </button>
              <button
                type="button"
                onClick={() => setDateFilterMode('RANGE')}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  dateFilterMode === 'RANGE'
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                🗓️ Rentang Tanggal
              </button>
              <button
                type="button"
                onClick={setPresetAllDates}
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer",
                  dateFilterMode === 'ALL'
                    ? "bg-cyan-500 text-slate-950 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                🌐 Semua Tanggal
              </button>
            </div>
          </div>

          {/* Conditional Date Pickers based on Mode */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {dateFilterMode === 'SINGLE' && (
              <>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono">
                  <button
                    type="button"
                    onClick={() => changeDateByDays(-1)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Hari Sebelumnya"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-2 px-3">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent font-bold text-xs text-slate-900 dark:text-white focus:outline-none font-mono cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => changeDateByDays(1)}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Hari Berikutnya"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={setPresetToday}
                    className={cn(
                      "px-3 py-2 rounded-xl font-bold transition-colors cursor-pointer border",
                      selectedDate === getTodayStr()
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 border-slate-200 dark:border-slate-700"
                    )}
                  >
                    Hari Ini
                  </button>
                  <button
                    type="button"
                    onClick={setPresetYesterday}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Kemarin
                  </button>
                </div>

                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                  📅 {formattedDateDescription}
                </span>
              </>
            )}

            {dateFilterMode === 'RANGE' && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 font-mono text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-bold pl-1">Dari:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  />
                  <span className="text-slate-400 text-[10px] uppercase font-bold px-1">Sampai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-transparent font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={setPresetLast7Days}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    7 Hari Terakhir
                  </button>
                  <button
                    type="button"
                    onClick={setPresetThisMonth}
                    className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Bulan Ini
                  </button>
                </div>
              </div>
            )}

            {dateFilterMode === 'ALL' && (
              <div className="p-2.5 px-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold flex items-center gap-2">
                <span>🌐 Menampilkan seluruh tanggal pengerjaan alat medis (Filter per Rumah Sakit dapat diterapkan tanpa batas waktu).</span>
              </div>
            )}
          </div>
        </div>

        {/* ROW 2: HOSPITAL / FASYANKES SELECTOR */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-[11px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 font-mono block mb-2 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-cyan-500" /> Filter Rumah Sakit / Fasilitas Pelayanan Kesehatan (Fasyankes):
          </label>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedInstitution}
                onChange={(e) => setSelectedInstitution(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono cursor-pointer"
              >
                <option value="ALL">🏥 Semua Rumah Sakit / Instansi ({allDailyItems.length} Total Unit Terdaftar)</option>
                {institutionOptions.map((inst, idx) => (
                  <option key={idx} value={inst.name}>
                    🏥 {inst.name} ({inst.count} Unit)
                  </option>
                ))}
              </select>
            </div>

            {selectedInstitution !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedInstitution('ALL')}
                className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl font-mono transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-700"
              >
                <X className="w-4 h-4 text-rose-500" /> Tampilkan Semua RS
              </button>
            )}
          </div>
        </div>

        {/* ROW 3: SECONDARY FILTERS (STATUS, LAYANAN, PENCARIAN) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 font-mono text-xs">
          {/* Status Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Status Kelaikan</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Semua Status</option>
              <option value="LAIK">✓ LAIK / SELESAI</option>
              <option value="TIDAK_LAIK">⚠ TIDAK LAIK</option>
              <option value="DALAM_PROSES">⏳ DALAM PROSES</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Jenis Layanan</label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Semua Layanan</option>
              <option value="KALIBRASI">Kalibrasi Metrologi (KAN)</option>
              <option value="UKES">Uji Kesesuaian (BAPETEN)</option>
              <option value="IPM">Pemeliharaan Preventif (IPM)</option>
              <option value="REPAIR">Perbaikan Korektif (Repair)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="sm:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">Pencarian Alat / S/N / Ruangan / Teknisi</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari nama alat, merek, tipe, S/N, ruangan, atau teknisi..."
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ROW 4: ACTIVE FILTERS SUMMARY & RESET BUTTON */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs font-mono">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Filter className="w-3 h-3 text-cyan-400" /> Filter Aktif:
              </span>

              {selectedInstitution !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold text-[11px]">
                  🏥 {selectedInstitution}
                  <button onClick={() => setSelectedInstitution('ALL')} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {dateFilterMode === 'SINGLE' && selectedDate !== getTodayStr() && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[11px]">
                  📅 {selectedDate}
                  <button onClick={setPresetToday} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {dateFilterMode === 'RANGE' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[11px]">
                  🗓️ {startDate} s/d {endDate}
                  <button onClick={setPresetToday} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {dateFilterMode === 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[11px]">
                  🌐 Semua Tanggal
                  <button onClick={setPresetToday} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedStatus !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px]">
                  Status: {selectedStatus}
                  <button onClick={() => setSelectedStatus('ALL')} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {selectedService !== 'ALL' && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px]">
                  Layanan: {selectedService}
                  <button onClick={() => setSelectedService('ALL')} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}

              {searchTerm && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[11px]">
                  Kata Kunci: "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-white cursor-pointer">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] text-rose-500 hover:text-rose-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Semua Filter
            </button>
          </div>
        )}
      </div>

      {/* Daily KPI Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-5">
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Alat Hari Ini</span>
            <Activity className="w-4 h-4 text-cyan-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">{dailyStats.total}</p>
          <span className="text-[10px] text-slate-400 font-medium">Total Dikerjakan</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Alat Laik</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-500 font-mono">{dailyStats.laikCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Lolos Standar</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Tidak Laik</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-500 font-mono">{dailyStats.tidakLaikCount}</p>
          <span className="text-[10px] text-slate-400 font-medium">Perlu Tindak Lanjut</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Instansi Terlayani</span>
            <Building2 className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-indigo-500 font-mono">{dailyStats.institutionsCovered}</p>
          <span className="text-[10px] text-slate-400 font-medium">Fasyankes / RS</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
            <span>Kelaikan (%)</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 font-mono">{dailyStats.complianceRate}%</p>
          <span className="text-[10px] text-slate-400 font-medium">Rasio Laik Pakai</span>
        </div>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="flex items-center justify-center p-6 bg-slate-900 border border-slate-800 rounded-2xl text-cyan-400 gap-2 text-xs font-mono">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat data rekapan harian...
        </div>
      )}

      {/* Main Daily Recap Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-black tracking-widest font-mono">
                <th className="py-4 px-4 text-center w-12">No</th>
                <th className="py-4 px-5">Nama Alat</th>
                <th className="py-4 px-4">Merek</th>
                <th className="py-4 px-4">Type / Model</th>
                <th className="py-4 px-4">Nomor Seri (SN)</th>
                <th className="py-4 px-4">Ruangan</th>
                <th className="py-4 px-5">Nama Instansi</th>
                <th className="py-4 px-4">Tanggal Pengerjaan</th>
                <th className="py-4 px-4 text-center">Status</th>
                <th className="py-4 px-4 text-right print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
              {filteredDailyItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 font-mono text-xs">
                    Tidak ada data pengerjaan alat untuk filter ({formattedDateDescription}) yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredDailyItems.map((item, index) => (
                  <tr key={`${item.serviceType}-${item.id}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                    {/* 1. Nomor */}
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-500">
                      {index + 1}
                    </td>

                    {/* 2. Nama Alat */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          item.serviceType === 'KALIBRASI' && "bg-amber-400",
                          item.serviceType === 'UKES' && "bg-cyan-400",
                          item.serviceType === 'IPM' && "bg-blue-400",
                          item.serviceType === 'REPAIR' && "bg-purple-400"
                        )} />
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{item.deviceName}</h4>
                          <span className="text-[9px] font-mono text-slate-400 uppercase">
                            {item.serviceType} • {item.certificateNumber}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Merek */}
                    <td className="py-4 px-4 font-mono">
                      {item.brand}
                    </td>

                    {/* 4. Type / Model */}
                    <td className="py-4 px-4 font-mono">
                      {item.model}
                    </td>

                    {/* 5. SN */}
                    <td className="py-4 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {item.serialNumber}
                    </td>

                    {/* 6. Ruangan */}
                    <td className="py-4 px-4">
                      {item.room}
                    </td>

                    {/* 7. Nama Instansi */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.institution}</span>
                      </div>
                    </td>

                    {/* 8. Tanggal Pengerjaan */}
                    <td className="py-4 px-4 font-mono text-slate-600 dark:text-slate-300 font-bold">
                      {item.executionDate}
                    </td>

                    {/* 9. Status Laik dan Tidak Laik */}
                    <td className="py-4 px-4 text-center">
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

                    {/* 10. Aksi (Hidden on Print) */}
                    <td className="py-4 px-4 text-right print:hidden">
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

      {/* Signature Section for Official Printout */}
      <div className="hidden print:grid grid-cols-2 gap-12 pt-8 mt-12 text-center text-xs text-black border-t border-slate-300">
        <div>
          <p className="font-bold">Mengetahui / Penanggung Jawab Teknis</p>
          <div className="h-20" />
          <p className="font-bold underline">( ............................................................ )</p>
          <p className="text-[10px]">PT Spektrum Kreasi Pratama</p>
        </div>
        <div>
          <p className="font-bold">Petugas Pelaksana / Teknisi Lapangan</p>
          <div className="h-20" />
          <p className="font-bold underline">( ............................................................ )</p>
          <p className="text-[10px]">Tanggal: {formattedDateDescription}</p>
        </div>
      </div>
    </div>
  );
}
