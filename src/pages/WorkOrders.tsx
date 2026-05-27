import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Plus, 
  X, 
  Filter, 
  User, 
  Calendar, 
  Building, 
  Check, 
  Loader2, 
  Activity, 
  FileText,
  AlertCircle,
  Truck,
  Users,
  Eye,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  collection, 
  query, 
  getDocs, 
  addDoc, 
  updateDoc, 
  doc, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { logAction, pushNotification } from '../lib/auditLogger';

export function WorkOrders() {
  const { profile, user, isAdmin, isSupervisor, isTechnician } = useAuth();
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals & Action States
  const [isNewWOModalOpen, setIsNewWOModalOpen] = useState(false);
  const [selectedWO, setSelectedWO] = useState<any | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  
  // Technician lists for dropdowns
  const [techniciansList, setTechniciansList] = useState<any[]>([]);
  const [selectedTechId, setSelectedTechId] = useState('');
  
  // Status Update state
  const [newStatus, setNewStatus] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');

  // Creation State
  const [newWO, setNewWO] = useState({
    deviceName: '',
    brand: '',
    model: '',
    serialNumber: '',
    description: '',
    priority: 'medium',
    hospitalName: profile?.hospitalName || '',
    category: 'kalibrasi',
  });

  // Filters
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  useEffect(() => {
    if (profile?.hospitalName && !newWO.hospitalName) {
      setNewWO(prev => ({ ...prev, hospitalName: profile.hospitalName }));
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    // Fetch work orders in real-time
    let q = query(collection(db, 'work_orders'), orderBy('createdAt', 'desc'));
    
    // If user is hospital client, filter to only show their requested work orders
    if (profile?.role === 'client') {
      const hospitalIdentifier = profile?.hospitalName || '';
      if (hospitalIdentifier) {
        q = query(
          collection(db, 'work_orders'),
          where('hospitalName', '==', hospitalIdentifier),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, 'work_orders'),
          where('requestedByUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
      setWorkOrders(data);
      setLoading(false);
    }, (err) => {
      console.error("Firestore Listen Error in Work Orders:", err);
      // Fallback to offline representation if permissions/rules not completely deployed yet
      setLoading(false);
    });

    // Fetch Technicians list (users with technician or supervisor role) for assignment
    const fetchTechs = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const list = usersSnap.docs
          .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((u: any) => u.role === 'technician' || u.role === 'supervisor' || u.role === 'admin');
        setTechniciansList(list);
      } catch (err) {
        console.error("Gagal mengambil list teknisi:", err);
      }
    };
    fetchTechs();

    return () => unsubscribe();
  }, [user, profile]);

  const handleCreateWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitting) return;
    setSubmitting(true);
    setError(null);

    const clientHospital = profile?.role === 'client' ? (profile?.hospitalName || 'RS Default') : newWO.hospitalName;

    try {
      const requestData = {
        deviceName: newWO.deviceName.trim(),
        brand: newWO.brand.trim(),
        model: newWO.model.trim(),
        serialNumber: newWO.serialNumber.trim(),
        description: newWO.description.trim(),
        priority: newWO.priority,
        hospitalName: clientHospital,
        category: newWO.category || 'kalibrasi',
        status: 'pending', // pending, assigned, in_progress, completed, cancelled
        requestedByUid: user.uid,
        requestedByName: profile?.displayName || user.email,
        requestedByEmail: user.email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        technicianId: '',
        technicianName: '',
        completionNotes: '',
        completedAt: null
      };

      await addDoc(collection(db, 'work_orders'), requestData);
      
      await logAction(
        `Membuat Work Order Baru`,
        'work_orders',
        `Alat: ${requestData.deviceName} (${requestData.hospitalName})`,
        'info'
      );

      await pushNotification(
         'Pemesanan Kerja Baru',
         `Work Order baru untuk alat "${requestData.deviceName}" dari ${requestData.hospitalName} telah ditambahkan.`,
         'info',
         'all',
         '/work-orders'
      );

      setIsNewWOModalOpen(false);
      setNewWO({
        deviceName: '',
        brand: '',
        model: '',
        serialNumber: '',
        description: '',
        priority: 'medium',
        hospitalName: profile?.hospitalName || '',
        category: 'kalibrasi',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan sistem saat membuat Work Order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO || !selectedTechId) return;

    try {
      const tech = techniciansList.find(t => t.id === selectedTechId);
      const techName = tech ? (tech.displayName || tech.email) : 'Teknisi';

      const updates = {
        technicianId: selectedTechId,
        technicianName: techName,
        status: 'assigned',
        assignedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(db, 'work_orders', selectedWO.id), updates);

      await logAction(
        `Menugaskan Work Order`,
        'work_orders',
        `Menugaskan ${techName} untuk menangani ${selectedWO.deviceName}`,
        'info'
      );

      await pushNotification(
         'Tugas Baru Ditetapkan',
         `Anda ditugaskan pada pemesanan kerja ${selectedWO.deviceName} (${selectedWO.hospitalName}).`,
         'success',
         selectedTechId,
         '/work-orders'
      );

      setIsAssignModalOpen(false);
      setSelectedTechId('');
      if (selectedWO.id === selectedWO?.id) {
        setSelectedWO(prev => prev ? { 
          ...prev, 
          status: 'assigned', 
          technicianName: techName, 
          technicianId: selectedTechId,
          assignedAt: { seconds: Math.floor(Date.now() / 1000) }
        } : null);
      }
    } catch (err) {
      console.error("Error assigning Work Order:", err);
      alert("Gagal menugaskan pekerjaan.");
    }
  };

  const handleUpdateStatusAndNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWO || !newStatus) return;

    try {
      const updates: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (newStatus === 'assigned') {
        updates.assignedAt = serverTimestamp();
      } else if (newStatus === 'in_progress') {
        updates.startedAt = serverTimestamp();
      } else if (newStatus === 'quality_reviewed') {
        updates.qualityReviewedAt = serverTimestamp();
      } else if (newStatus === 'completed') {
        updates.completionNotes = completionNotes;
        updates.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'work_orders', selectedWO.id), updates);

      await logAction(
        `Mengubah Status Work Order`,
        'work_orders',
        `Mengubah status ${selectedWO.deviceName} menjadi ${newStatus}`,
        'warning'
      );

      await pushNotification(
         'Status Pemesanan Berubah',
         `Work Order ${selectedWO.deviceName} berubah menjadi status: ${newStatus.toUpperCase()}.`,
         'info',
         selectedWO.requestedByUid,
         '/work-orders'
      );

      setIsStatusUpdateOpen(false);
      setCompletionNotes('');
      
      const localUpdates = { ...updates };
      const timestampKeys = ['assignedAt', 'startedAt', 'qualityReviewedAt', 'completedAt', 'updatedAt'];
      timestampKeys.forEach(k => {
        if (localUpdates[k]) {
          localUpdates[k] = { seconds: Math.floor(Date.now() / 1000) };
        }
      });
      setSelectedWO(prev => prev ? { ...prev, ...localUpdates } : null);
    } catch (err) {
      console.error("Error updating Work Order status:", err);
      alert("Gagal mengupdate status.");
    }
  };

  const filteredWO = workOrders.filter(wo => {
    const matchesSearch = 
      wo.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wo.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || wo.status === filterStatus;
    const matchesPriority = filterPriority === 'ALL' || wo.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleExportToExcel = async () => {
    if (filteredWO.length === 0) {
      alert("Tidak ada data Work Orders yang sesuai dengan filter saat ini untuk diekspor.");
      return;
    }

    setExportingExcel(true);
    try {
      const dataToExport = filteredWO.map((wo, index) => {
        let createdDateStr = '';
        if (wo.createdAt) {
          if (wo.createdAt.toDate) {
            createdDateStr = wo.createdAt.toDate().toLocaleString('id-ID');
          } else {
            createdDateStr = new Date(wo.createdAt).toLocaleString('id-ID');
          }
        }

        let statusStr = 'Pending';
        if (wo.status === 'pending') statusStr = 'Menunggu Teknisi (Pending)';
        else if (wo.status === 'assigned') statusStr = 'Ditugaskan (Assigned)';
        else if (wo.status === 'in_progress') statusStr = 'Sedang Dikerjakan (In Progress)';
        else if (wo.status === 'completed') statusStr = 'Komplit Selesai (Completed)';

        let priorityStr = 'Medium';
        if (wo.priority === 'critical') priorityStr = 'CRITICAL (Kritis)';
        else if (wo.priority === 'high') priorityStr = 'HIGH (Tinggi)';
        else if (wo.priority === 'medium') priorityStr = 'MEDIUM (Sedang)';
        else if (wo.priority === 'low') priorityStr = 'LOW (Rendah)';

        let categoryStr = 'Kalibrasi';
        if (wo.category === 'ukes' || wo.category === 'UKES') categoryStr = 'Uji Kesesuaian (UKES)';
        else if (wo.category === 'ipm' || wo.category === 'IPM') categoryStr = 'Inspeksi & Pemeliharaan Mandiri (IPM)';
        else if (wo.category === 'kalibrasi' || wo.category === 'KALIBRASI') categoryStr = 'Kalibrasi';

        return {
          'No.': index + 1,
          'Tanggal Permintaan': createdDateStr,
          'Rumah Sakit / Fasyankes': wo.hospitalName || '-',
          'Nama Alat': wo.deviceName || '-',
          'Merk / Brand': wo.brand || '-',
          'Model / Tipe': wo.model || '-',
          'Nomor Seri (S/N)': wo.serialNumber || '-',
          'Kategori Layanan': categoryStr,
          'Tingkat Urgensi': priorityStr,
          'Status': statusStr,
          'Teknisi PIC': wo.technicianName || 'Belum Ditugaskan',
          'Keluhan / Deskripsi': wo.description || '-',
          'Catatan Penyelesaian': wo.completionNotes || '-',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Work Orders');

      // Style column widths
      worksheet['!cols'] = [
        { wch: 6 },   // No.
        { wch: 22 },  // Tanggal Permintaan
        { wch: 30 },  // Rumah Sakit
        { wch: 25 },  // Nama Alat
        { wch: 18 },  // Merk
        { wch: 18 },  // Model
        { wch: 18 },  // S/N
        { wch: 32 },  // Kategori
        { wch: 20 },  // Urgensi
        { wch: 20 },  // Status
        { wch: 28 },  // PIC
        { wch: 45 },  // Deskripsi
        { wch: 45 },  // Catatan
      ];

      XLSX.writeFile(workbook, `Work_Orders_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);

      // Log the audit trail
      await logAction(
        `Ekspor Excel Work Orders`,
        'reports',
        `Berhasil mengekspor ${filteredWO.length} rekaman tiket kerja berdasarkan filter saat ini.`,
        'info'
      );

      pushNotification(
        'Ekspor Excel Berhasil',
        `Sebanyak ${filteredWO.length} data Work Orders telah diekspor ke file Excel.`,
        'info',
        user?.uid
      );
    } catch (err: any) {
      console.error("Gagal melakukan ekspor excel:", err);
      alert("Gagal mengekspor data ke Excel: " + err.message);
    } finally {
      setExportingExcel(false);
    }
  };

  // Calculate Metrics on the fly
  const totalWO = filteredWO.length;
  const pendingCount = workOrders.filter(w => w.status === 'pending').length;
  const inProgressCount = workOrders.filter(w => w.status === 'in_progress' || w.status === 'assigned').length;
  const completedCount = workOrders.filter(w => w.status === 'completed').length;

  return (
    <div className="space-y-8 pb-20">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
            <span className="text-[10px] font-mono tracking-[0.3em] text-indigo-600 dark:text-cyan-400 font-black uppercase">
              Hospital Operations Maintenance Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 dark:bg-cyan-500 rounded-3xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
              <ClipboardList className="w-7 h-7 text-white dark:text-slate-950" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">
                Work Orders <span className="text-indigo-600 dark:text-cyan-400 font-light lowercase font-sans">Module</span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1.5 font-mono uppercase tracking-widest">
                Monitoring Kalibrasi & Pemeliharaan Alat Kesehatan RS Client
              </p>
            </div>
          </div>
        </div>

        {/* Create/Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportToExcel}
            disabled={exportingExcel}
            className="px-6 py-4 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/10 active:scale-[0.98] flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {exportingExcel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Mengekspor...
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4" />
                Ekspor XLSX (Filtered)
              </>
            )}
          </button>

          <button
            onClick={() => setIsNewWOModalOpen(true)}
            className="px-6 py-4 bg-indigo-600 dark:bg-cyan-500 hover:opacity-95 text-white dark:text-slate-950 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98] flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Pesan Maintenance / Kalibrasi RS
          </button>
        </div>
      </header>

      {/* STATS BENTO CLUSTER (Adaptive based on role) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* Total Stat */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#10192d] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block leading-none">TOTAL PERMINTAAN</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono mt-1 block">{totalWO}</span>
          </div>
        </div>

        {/* Pending Stat */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#10192d] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/65 flex items-center justify-center text-amber-500 dark:text-amber-400 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block leading-none">MENUNGGU AKSI</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono mt-1 block">{pendingCount}</span>
          </div>
        </div>

        {/* In Progress Stat */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#10192d] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block leading-none">PROSES REPARASI / KALIBRASI</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono mt-1 block">{inProgressCount}</span>
          </div>
        </div>

        {/* Completed Stat */}
        <div className="p-6 rounded-3xl bg-white dark:bg-[#10192d] border border-slate-100 dark:border-slate-800 flex items-center gap-5 shadow-xl shadow-slate-200/40 dark:shadow-none">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block leading-none">SELESAI TERUJI</span>
            <span className="text-2xl font-black text-slate-800 dark:text-white font-mono mt-1 block">{completedCount}</span>
          </div>
        </div>

      </div>

      {/* FILTER PANEL */}
      <div className="p-6 bg-white dark:bg-[#10192d] rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-slate-200/30 dark:shadow-none">
        
        {/* Search */}
        <div className="relative w-full md:w-80 group/search">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/search:text-indigo-600 dark:group-focus-within/search:text-cyan-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari alat, RS, brand, tipe, No Seri..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-700/70 rounded-2xl pl-12 pr-4 py-3.5 text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-500 font-mono italic"
          />
        </div>

        {/* Filters Select */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto font-mono">
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="pending">Menunggu Aksi</option>
              <option value="assigned">Pekerjaan Ditugaskan</option>
              <option value="in_progress">Sedang Diproses (On Progress)</option>
              <option value="completed">Komplit Selesai</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase">Prioritas:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase italic tracking-widest text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">Semua Tingkat</option>
              <option value="low">Rendah (Low)</option>
              <option value="medium">Sedang (Medium)</option>
              <option value="high">Tinggi (High)</option>
              <option value="critical">Kritis (Critical)</option>
            </select>
          </div>

        </div>

      </div>

      {/* WORK ORDER GRID/TABLE LIST */}
      {loading ? (
        <div className="py-32 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 dark:text-cyan-400 animate-spin" />
          <p className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Database Pemesanan Kerja...</p>
        </div>
      ) : filteredWO.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2  gap-6">
          {filteredWO.map((wo) => {
            return (
              <div 
                key={wo.id}
                className={cn(
                  "p-6 rounded-3xl bg-white dark:bg-[#10192d] border transition-all duration-300 flex flex-col justify-between group",
                  wo.priority === 'critical' ? 'border-red-500/20 hover:border-red-500/40' : 'border-slate-200/70 dark:border-slate-800 hover:border-indigo-500/25 dark:hover:border-cyan-500/20'
                )}
              >
                <div>
                  
                  {/* Card Header Tagging */}
                  <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span className="text-[10px] font-black tracking-widest text-slate-900 dark:text-slate-300 uppercase font-mono truncate">
                          {wo.hospitalName}
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-indigo-600 dark:text-cyan-400 uppercase truncate">
                        {wo.deviceName}
                      </h4>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Status Badge */}
                      <span className={cn(
                        "text-[8px] font-mono font-black px-2.5 py-1 rounded-full uppercase tracking-wider border shrink-0",
                        wo.status === 'pending' ? 'bg-amber-500/5 text-amber-500 border-amber-500/15' :
                        wo.status === 'assigned' ? 'bg-blue-500/5 text-blue-500 border-blue-500/15' :
                        wo.status === 'in_progress' ? 'bg-indigo-500/5 text-indigo-500 border-indigo-500/15' :
                        'bg-emerald-500/5 text-emerald-500 border-emerald-500/15'
                      )}>
                        {wo.status === 'pending' ? 'Menunggu Teknisi' :
                         wo.status === 'assigned' ? 'Ditugaskan' :
                         wo.status === 'in_progress' ? 'Sedang Dikerjakan' :
                         'Komplit Selesai'}
                      </span>
                      {/* Category Badge */}
                      <span className={cn(
                        "text-[7px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-wider border shrink-0",
                        wo.category === 'ukes' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        wo.category === 'ipm' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      )}>
                        {wo.category === 'ukes' ? '⚡ UKES' :
                         wo.category === 'ipm' ? '🔧 IPM' :
                         '🔬 KALIBRASI'}
                      </span>
                    </div>
                  </div>

                  {/* Body Technical Specifications */}
                  <div className="grid grid-cols-2 gap-4 py-4 font-mono text-[9px] text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="block font-black text-slate-400">BRAND / TIPE</span>
                      <span className="text-slate-700 dark:text-slate-200 font-extrabold uppercase truncate block mt-0.5">{wo.brand || '-'} / {wo.model || '-'}</span>
                    </div>
                    <div>
                      <span className="block font-black text-slate-400">NOMOR SERI (S/N)</span>
                      <span className="text-slate-700 dark:text-slate-200 font-extrabold uppercase truncate block mt-0.5">{wo.serialNumber || '-'}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="block font-black text-slate-400">DESKRIPSI / KELUHAN ALAT</span>
                      <span className="text-slate-700 dark:text-slate-300 font-bold block mt-1 leading-relaxed text-xs capitalize whitespace-normal">{wo.description}</span>
                    </div>
                  </div>

                </div>

                {/* Footer metadata & actions */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-[9px]">
                  
                  {/* Left priority/assigned information */}
                  <div className="space-y-1.5 text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black uppercase">Tingkat Darurat:</span>
                      <span className={cn(
                        "font-black px-2.5 py-1 rounded-lg text-[8px] uppercase tracking-widest border font-mono select-none inline-flex items-center gap-1",
                        wo.priority === 'critical' ? 'bg-red-500/15 text-red-500 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.25)] animate-pulse' :
                        wo.priority === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/25' :
                        wo.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/25' :
                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      )}>
                        {wo.priority === 'critical' ? '🚨' : wo.priority === 'high' ? '⚠️' : '🔔'} {wo.priority?.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      <span>PIC Teknisi: </span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-300 uppercase">{wo.technicianName || 'Belum Ditugaskan'}</span>
                    </div>
                  </div>

                  {/* Open details details trigger */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedWO(wo);
                        setIsStatusUpdateOpen(false);
                        setIsAssignModalOpen(false);
                      }}
                      className="px-3.5 py-2 text-[9px] font-black uppercase bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Detail Kerja
                    </button>

                    {/* Operational Management features */}
                    {(isAdmin || isSupervisor) && wo.status === 'pending' && (
                      <button 
                        onClick={() => {
                          setSelectedWO(wo);
                          setIsAssignModalOpen(true);
                        }}
                        className="px-3.5 py-2 text-[9px] font-black uppercase text-indigo-700 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Tugaskan
                      </button>
                    )}

                    {/* Technician update features */}
                    {(isAdmin || isSupervisor || (isTechnician && wo.technicianId === user?.uid)) && wo.status !== 'completed' && wo.status !== 'pending' && (
                      <button 
                        onClick={() => {
                          setSelectedWO(wo);
                          setNewStatus(wo.status);
                          setIsStatusUpdateOpen(true);
                        }}
                        className="px-3.5 py-2 text-[9px] font-black uppercase text-emerald-700 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" /> Update Status
                      </button>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center bg-white dark:bg-[#10192d] border border-slate-100 dark:border-slate-800 rounded-[3rem] shadow-xl">
          <ClipboardList className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-xs font-mono font-black text-slate-400 uppercase tracking-widest leading-none">Belum Ada Pemesanan Kerja Terdaftar</p>
          <p className="text-[10px] text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">Pesan teknisi sekarang untuk merawat alat medis Rumah Sakit Anda melalui tombol &quot;Pesan Maintenance&quot; di atas.</p>
        </div>
      )}

      {/* DETAIL MODAL WITH PROGRESS TRACKER */}
      <AnimatePresence>
        {selectedWO && !isAssignModalOpen && !isStatusUpdateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedWO(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl p-8 xl:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Close Button */}
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setSelectedWO(null)}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl hover:bg-slate-100 text-slate-500 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-8">
                
                {/* Header info */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-[#725bff] dark:text-[#56b3e6] font-extrabold flex items-center gap-1 bg-[#725bff]/5 px-3 py-1 rounded-full border border-[#725bff]/15">
                      <Activity className="w-3.5 h-3.5" /> Maintenance Ticket #{selectedWO.id?.slice(0, 5).toUpperCase()}
                    </span>
                    <span className={cn(
                      "text-[9px] font-mono font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                      selectedWO.priority === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}>
                      {selectedWO.priority} PRIORITY
                    </span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    {selectedWO.deviceName}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400 font-semibold mt-1">
                    RS CLIENT: {selectedWO.hospitalName}
                  </p>
                </div>

                {/* LIVE PROCESS TRACKING STEPPER */}
                <div className="bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 p-6 rounded-3xl">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-5">
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block italic">
                      Live Repair/Calibration Progress Tracker
                    </span>
                    <span className="text-[9px] font-mono font-bold bg-[#725bff]/10 dark:bg-cyan-500/10 text-[#725bff] dark:text-cyan-400 px-2.5 py-0.5 rounded-full border border-[#725bff]/20 uppercase">
                      5-Stage Lifecycle
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                    {/* Stepper Node 1: Requested */}
                    {(() => {
                      const formatTimestamp = (ts: any) => {
                        if (!ts) return null;
                        let dateObj: Date;
                        if (ts.toDate) {
                          dateObj = ts.toDate();
                        } else if (ts.seconds) {
                          dateObj = new Date(ts.seconds * 1000);
                        } else {
                          dateObj = new Date(ts);
                        }
                        if (isNaN(dateObj.getTime())) return null;
                        return dateObj.toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                      };

                      const currentStatus = selectedWO.status;
                      
                      // Node 1: Requested
                      const rTime = formatTimestamp(selectedWO.createdAt);
                      
                      // Node 2: Assigned
                      const hasAssigned = ['assigned', 'in_progress', 'quality_reviewed', 'completed'].includes(currentStatus);
                      const isAssignedActive = currentStatus === 'assigned';
                      const aTime = formatTimestamp(selectedWO.assignedAt);

                      // Node 3: In Progress
                      const hasStarted = ['in_progress', 'quality_reviewed', 'completed'].includes(currentStatus);
                      const isStartedActive = currentStatus === 'in_progress';
                      const sTime = formatTimestamp(selectedWO.startedAt);

                      // Node 4: Quality Reviewed
                      const hasQualityReviewed = ['quality_reviewed', 'completed'].includes(currentStatus);
                      const isQualityReviewedActive = currentStatus === 'quality_reviewed';
                      const qTime = formatTimestamp(selectedWO.qualityReviewedAt);

                      // Node 5: Completed
                      const hasCompleted = currentStatus === 'completed';
                      const cTime = formatTimestamp(selectedWO.completedAt);

                      return (
                        <>
                          {/* Node 1: Requested */}
                          <div className="flex flex-row md:flex-col items-center gap-3 md:gap-2 text-left md:text-center p-2.5 rounded-2xl bg-white dark:bg-[#10192d] md:bg-transparent md:dark:bg-transparent border border-slate-100 dark:border-slate-800 md:border-none shadow-sm md:shadow-none">
                            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                              <Check className="w-5 h-5" />
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[10px] font-mono uppercase font-black text-slate-800 dark:text-slate-200">1. Dipesan</p>
                              <p className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-extrabold">{rTime || 'Tersimpan'}</p>
                            </div>
                          </div>

                          {/* Node 2: Assigned */}
                          <div className={cn(
                            "flex flex-row md:flex-col items-center gap-3 md:gap-2 text-left md:text-center p-2.5 rounded-2xl border md:border-none shadow-sm md:shadow-none transition-all",
                            hasAssigned ? "bg-white dark:bg-[#10192d] border-emerald-100" : "bg-slate-100/50 dark:bg-[#10192d]/30 border-slate-100 dark:border-slate-800 opacity-60"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 transition-all",
                              hasAssigned ? 'bg-emerald-500 text-white shadow-md' : isAssignedActive ? 'bg-indigo-600 dark:bg-cyan-500 text-white shadow-md animate-pulse' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            )}>
                              {hasAssigned && currentStatus !== 'assigned' ? <Check className="w-5 h-5" /> : '02'}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[10px] font-mono uppercase font-black text-slate-800 dark:text-slate-200">2. Ditugaskan</p>
                              <p className={cn(
                                "text-[9px] font-mono font-extrabold",
                                aTime ? "text-emerald-600 dark:text-emerald-400" : isAssignedActive ? "text-indigo-600 dark:text-cyan-400 animate-pulse" : "text-slate-400"
                              )}>
                                {aTime || (isAssignedActive ? "Aktif" : "Menunggu")}
                              </p>
                            </div>
                          </div>

                          {/* Node 3: In Progress */}
                          <div className={cn(
                            "flex flex-row md:flex-col items-center gap-3 md:gap-2 text-left md:text-center p-2.5 rounded-2xl border md:border-none shadow-sm md:shadow-none transition-all",
                            hasStarted ? "bg-white dark:bg-[#10192d] border-emerald-100" : "bg-slate-100/50 dark:bg-[#10192d]/30 border-slate-100 dark:border-slate-800 opacity-60"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 transition-all",
                              (hasStarted && currentStatus !== 'in_progress') ? 'bg-emerald-500 text-white shadow-md' : isStartedActive ? 'bg-indigo-600 dark:bg-cyan-500 text-white shadow-md animate-pulse' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            )}>
                              {hasStarted && currentStatus !== 'in_progress' ? <Check className="w-5 h-5" /> : '03'}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[10px] font-mono uppercase font-black text-slate-800 dark:text-slate-200">3. Pengerjaan</p>
                              <p className={cn(
                                "text-[9px] font-mono font-extrabold",
                                sTime ? "text-emerald-600 dark:text-emerald-400" : isStartedActive ? "text-indigo-600 dark:text-cyan-400 animate-pulse" : "text-slate-400"
                              )}>
                                {sTime || (isStartedActive ? "Sedang Diuji" : "Menunggu")}
                              </p>
                            </div>
                          </div>

                          {/* Node 4: Quality Reviewed */}
                          <div className={cn(
                            "flex flex-row md:flex-col items-center gap-3 md:gap-2 text-left md:text-center p-2.5 rounded-2xl border md:border-none shadow-sm md:shadow-none transition-all",
                            hasQualityReviewed ? "bg-white dark:bg-[#10192d] border-emerald-100" : "bg-slate-100/50 dark:bg-[#10192d]/30 border-slate-100 dark:border-slate-800 opacity-60"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 transition-all",
                              (hasQualityReviewed && currentStatus !== 'quality_reviewed') ? 'bg-emerald-500 text-white shadow-md' : isQualityReviewedActive ? 'bg-indigo-600 dark:bg-cyan-500 text-white shadow-md animate-pulse' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            )}>
                              {hasQualityReviewed && currentStatus !== 'quality_reviewed' ? <Check className="w-5 h-5" /> : '04'}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[10px] font-mono uppercase font-black text-slate-800 dark:text-slate-200">4. Tinjau Mutu</p>
                              <p className={cn(
                                "text-[9px] font-mono font-extrabold",
                                qTime ? "text-emerald-600 dark:text-emerald-400" : isQualityReviewedActive ? "text-indigo-600 dark:text-cyan-400 animate-pulse" : "text-slate-400"
                              )}>
                                {qTime || (isQualityReviewedActive ? "Tinjauan QA" : "Menunggu")}
                              </p>
                            </div>
                          </div>

                          {/* Node 5: Completed */}
                          <div className={cn(
                            "flex flex-row md:flex-col items-center gap-3 md:gap-2 text-left md:text-center p-2.5 rounded-2xl border md:border-none shadow-sm md:shadow-none transition-all",
                            hasCompleted ? "bg-white dark:bg-[#10192d] border-emerald-100 animate-in fade-in" : "bg-slate-100/50 dark:bg-[#10192d]/30 border-slate-100 dark:border-slate-800 opacity-60"
                          )}>
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0 transition-all",
                              hasCompleted ? 'bg-emerald-500 text-white shadow-md' : 'bg-slate-200 text-slate-400 dark:bg-slate-900 border border-slate-250 dark:border-slate-800'
                            )}>
                              {hasCompleted ? <CheckCircle className="w-5 h-5 animate-pulse" /> : '05'}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <p className="text-[10px] font-mono uppercase font-black text-slate-800 dark:text-slate-200">5. Selesai</p>
                              <p className={cn(
                                "text-[9px] font-mono font-extrabold",
                                cTime ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                              )}>
                                {cTime || "Menunggu"}
                              </p>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Technical Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40 dark:bg-slate-900/30 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <span className="block font-black text-slate-400 uppercase">IDENTITAS ALAT MEDIS</span>
                    <p className="text-slate-800 dark:text-slate-250"><span className="font-extrabold">Brand/Model:</span> {selectedWO.brand || '-'} / {selectedWO.model || '-'}</p>
                    <p className="text-slate-800 dark:text-slate-250"><span className="font-extrabold">Nomor Seri (S/N):</span> {selectedWO.serialNumber || '-'}</p>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10px]">
                    <span className="block font-black text-slate-400 uppercase">PELAPOR & TEKNISI</span>
                    <p className="text-slate-800 dark:text-slate-250"><span className="font-extrabold">Oleh RS:</span> {selectedWO.requestedByName} ({selectedWO.requestedByEmail})</p>
                    <p className="text-slate-800 dark:text-slate-250"><span className="font-extrabold">Teknisi ditunjuk:</span> {selectedWO.technicianName || 'Belum ditugaskan'}</p>
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800 font-mono text-[10px]">
                    <span className="block font-black text-slate-400 uppercase">KELUHAN DETIL</span>
                    <p className="text-xs text-slate-800 dark:text-slate-300 font-mono leading-relaxed normal-case">{selectedWO.description}</p>
                  </div>
                </div>

                {/* Completion Note detail (rendered only if completed) */}
                {selectedWO.status === 'completed' && (
                  <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl space-y-3">
                    <h5 className="text-[11px] font-mono font-black uppercase text-emerald-600 tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Catatan Penyelesaian Pekerjaan / Kalibrasi:
                    </h5>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold font-mono leading-relaxed">
                      {selectedWO.completionNotes || 'Pekerjaan dinyatakan selesai teruji dengan performa normal.'}
                    </p>
                    {selectedWO.completedAt && (
                      <p className="text-[9px] font-mono text-slate-400 font-extrabold uppercase">
                        Selesai pada: {new Date(selectedWO.completedAt?.seconds * 1000).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: ASSIGN TECHNICIAN */}
      <AnimatePresence>
        {isAssignModalOpen && selectedWO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl p-8 z-10"
            >
              <form onSubmit={handleAssignWO} className="space-y-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Menugaskan Teknisi</h4>
                  <p className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-widest mt-1">Alat: {selectedWO.deviceName} ({selectedWO.hospitalName})</p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic font-mono">Pilih Teknisi Metrologi</label>
                  <select 
                    required
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-500 outline-none"
                  >
                    <option value="">-- PILIH TEKNISI PROTOKOL --</option>
                    {techniciansList.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.displayName || t.email} ({t.role?.toUpperCase()})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="flex-1 py-4 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-50 transition-all font-mono"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-indigo-600 hover:opacity-95 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/15 cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Tugaskan Sekarang
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: UPDATE STATUS & CATATAN TEKNIS */}
      <AnimatePresence>
        {isStatusUpdateOpen && selectedWO && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStatusUpdateOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-[3.5rem] shadow-2xl p-8 xl:p-10 z-10"
            >
              <form onSubmit={handleUpdateStatusAndNotes} className="space-y-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider">Perbarui Status Pengerjaan</h4>
                  <p className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-widest mt-1">Alat: {selectedWO.deviceName} • PIC: {selectedWO.technicianName}</p>
                </div>

                <div className="space-y-3 font-mono">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Status Pengerjaan</label>
                  <select 
                    required
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-widest outline-none"
                  >
                    <option value="assigned">TUGAS DITERIMA (ASSIGNED)</option>
                    <option value="in_progress">SEDANG DIKERJAKAN (IN PROGRESS)</option>
                    <option value="quality_reviewed">TINJAUAN MUTU (QUALITY REVIEWED)</option>
                    <option value="completed">KOMPLIT SELESAI TERUJI (COMPLETED)</option>
                  </select>
                </div>

                {newStatus === 'completed' && (
                  <div className="space-y-3 font-mono">
                    <label className="text-[10px] font-black text-indigo-600 dark:text-cyan-400 uppercase tracking-widest px-1 italic font-bold">Catatan Penyelesaian / Hasil Pengujian Kalibrasi</label>
                    <textarea 
                      required
                      placeholder="Uraikan tindakan pemeliharaan yang dilakukan, deviasi akhir, kesesuaian nilai toleransi, dan kesiapan operasional alat..."
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsStatusUpdateOpen(false)}
                    className="flex-1 py-4 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-50 font-mono"
                  >
                    Batal
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-emerald-600 font-mono hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/15 cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Simpan Perbaruan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: SUBMIT NEW WORK ORDER (CLIENT RS FORM) */}
      <AnimatePresence>
        {isNewWOModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewWOModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl p-8 xl:p-10 z-10 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Modal close */}
              <div className="absolute top-8 right-8">
                <button 
                  onClick={() => setIsNewWOModalOpen(false)}
                  className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWO} className="space-y-6">
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2.5">
                    <Truck className="w-6 h-6 text-indigo-600" /> Pemesanan Kerja Baru
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400 font-mono uppercase tracking-widest mt-1">Form Pengajuan Kalibrasi / Perbaikan Alat Medis</p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest font-mono">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-5">
                  
                  {/* Hospital/Client origin field */}
                  {profile?.role !== 'client' ? (
                    <div className="space-y-3 font-mono">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rumah Sakit / Instansi Pengaju</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. RS Siloam, RS Premier, etc." 
                        value={newWO.hospitalName}
                        onChange={(e) => setNewWO({ ...newWO, hospitalName: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-500"
                      />
                    </div>
                  ) : (
                    <div className="bg-indigo-500/5 border border-indigo-500/15 p-4.5 rounded-2xl flex items-center gap-3 text-indigo-650 dark:text-cyan-400 font-mono text-[10px]">
                      <Building className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="block font-black text-slate-400 uppercase leading-none mb-1">AUTO-IDENTITAS KLIEN RS</span>
                        <span className="font-extrabold uppercase text-xs block">{profile?.hospitalName || 'RS Default'}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3 font-mono">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nama Alat Medis</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Defibrillator, Incubator, Syringe Pump..." 
                      value={newWO.deviceName}
                      onChange={(e) => setNewWO({ ...newWO, deviceName: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-3 font-mono">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Brand Alat</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Philips, GE, etc." 
                        value={newWO.brand}
                        onChange={(e) => setNewWO({ ...newWO, brand: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-202 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-3 font-mono">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tipe / Model</label>
                      <input 
                        type="text" 
                        required
                        placeholder="V60, B40, etc." 
                        value={newWO.model}
                        onChange={(e) => setNewWO({ ...newWO, model: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-202 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 font-mono">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nomor Seri Alat (Serial Number)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. SN-98213-MED" 
                      value={newWO.serialNumber}
                      onChange={(e) => setNewWO({ ...newWO, serialNumber: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-3 font-mono">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Tingkat Kegawatan (Priority)</label>
                    <select 
                      value={newWO.priority}
                      onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-black uppercase text-slate-850 dark:text-slate-200 tracking-widest outline-none"
                    >
                      <option value="low">RENDAH (LOW/ROUTINE CALIBRATION)</option>
                      <option value="medium">SEDANG (MEDIUM MAINTENANCE)</option>
                      <option value="high">TINGGI (HIGH/URGENT ERROR)</option>
                      <option value="critical">KRITIS (CRITICAL SYSTEM FAIL)</option>
                    </select>
                  </div>

                  <div className="space-y-3 font-mono">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Kategori Layanan (Service Category)</label>
                    <select 
                      value={newWO.category}
                      onChange={(e) => setNewWO({ ...newWO, category: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 px-5 py-4 rounded-2xl text-xs font-black uppercase text-slate-850 dark:text-slate-200 tracking-widest outline-none mb-1"
                    >
                      <option value="kalibrasi">KALIBRASI (CALIBRATION)</option>
                      <option value="ukes">UKES (UJI KESESUAIAN)</option>
                      <option value="ipm">IPM (INSPEKSI PEMELIHARAAN MANDIRI)</option>
                    </select>
                  </div>

                  <div className="space-y-3 font-mono">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Uraian / Gejala Masalah Medis</label>
                    <textarea 
                      required
                      placeholder="Deskripsikan dengan detail gejala kerusakan, deviasi mencurigakan, atau jadwal kalibrasi periodik..."
                      value={newWO.description}
                      onChange={(e) => setNewWO({ ...newWO, description: e.target.value })}
                      rows={4}
                      className="w-full bg-slate-50 dark:bg-[#070c1a] border border-slate-200 dark:border-slate-800 rounded-2xl px-5 py-4 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                    />
                  </div>

                </div>

                <button 
                  type="submit"
                  disabled={submitting}
                  className="w-full py-5 bg-indigo-600 dark:bg-cyan-500 hover:opacity-95 text-white dark:text-slate-950 font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 cursor-pointer"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                  Finalisasi Pemesanan Kerja
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
