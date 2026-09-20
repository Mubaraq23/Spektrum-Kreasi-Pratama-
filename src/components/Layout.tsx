import React, { useState, useMemo } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Stethoscope, Zap, FileText, BookOpen, LogOut,
  Menu, X, Bell, Search, ChevronRight, Award, BarChart3,
  Users, Wand2, BrainCircuit, ShieldCheck, Info, Sun, Moon, Wrench,
  Atom, ChevronLeft, Compass, Layers,
  Network, Printer, Radio, Activity, Settings, Calendar, History,
  Database, Sliders, ChevronDown, Download
} from 'lucide-react';

import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Chat } from './Chat';
import { AIAssistant } from './AIAssistant';
import { Logo } from './Logo';
import { Interactive3DCanvas } from './Interactive3DCanvas';
import { OfflineSyncBar } from './OfflineSyncBar';
import { CommandPalette } from './CommandPalette';
import { AppDownloadModal } from './AppDownloadModal';
import { collection, query, onSnapshot, where, orderBy, doc, updateDoc } from 'firebase/firestore';

interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  read?: boolean;
  type?: 'info' | 'success' | 'warning' | 'error';
  link?: string;
}

const navItems = [
  // UTAMA 3.0
  { path: '/universal-workspace', label: 'Workspace Universal 3.0', icon: Compass,         roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA 3.0' },
  { path: '/dashboard',          label: 'Dashboard Utama',        icon: LayoutDashboard, roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA 3.0' },
  { path: '/field-mode',         label: 'Mode Mobile Lapangan',   icon: Zap,             roles: ['admin','supervisor','technician'], category: 'UTAMA 3.0' },
  { path: '/master-hub',         label: 'Pusat Operasi Terpadu',  icon: Compass,         roles: ['admin','supervisor','technician'], category: 'UTAMA 3.0' },
  { path: '/asset-passport',     label: 'Paspor Aset Digital (360°)', icon: Stethoscope, roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA 3.0' },
  { path: '/customer-portal',    label: 'Portal Mandiri RS',      icon: Stethoscope,     roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA 3.0' },

  // KALIBRASI, UKES & PEMELIHARAAN
  { path: '/worksheets',         label: 'Lembar Kerja (LK) & Kalibrasi', icon: FileText, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/methods',            label: 'Metode Kerja (MK) & Standar',   icon: BookOpen, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/method-builder',     label: 'Penyusun MK Visual',            icon: BookOpen, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/work-orders',        label: 'Order Kerja (Work Orders)',     icon: Calendar, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/smart-work-orders',  label: 'Smart Work Order Engine',       icon: Calendar, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/ukes-radiology',     label: 'Uji Kesesuaian Radiologi (UKES)', icon: Atom,   roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/ipm',                label: 'Pemeliharaan Preventif (IPM)',  icon: Wrench,   roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/repair',             label: 'Perbaikan Alat (Repair)',       icon: Wrench,   roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/calibrators',        label: 'Standar & Kalibrator Ukur',     icon: Zap,      roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/inventory',          label: 'Inventaris Alat Kesehatan',     icon: Stethoscope, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/certificates',       label: 'Arsip Sertifikat Kalibrasi',    icon: Award,    roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/service-history',    label: 'Riwayat Layanan & Servis',      icon: History,  roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/service-recap',      label: 'Rekapitulasi Layanan Terpadu',  icon: FileText, roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },
  { path: '/daily-recap',        label: 'Rekap Harian & Servis',         icon: BarChart3,roles: ['admin','supervisor','technician','management','client'], category: 'KALIBRASI, UKES & PEMELIHARAAN' },

  // KECERDASAN METROLOGI
  { path: '/calculation-engine', label: 'Workbench Rumus Metrologi',     icon: Sliders,  roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/protocol-builder',   label: 'Builder Protokol Khusus',       icon: Sliders,  roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/live-console',       label: 'Konsol Pengukuran Real-Time',   icon: Activity, roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/uncertainty-lab',    label: 'Lab Ketidakpastian & Tornado',  icon: BarChart3,roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/scope-command-center', label: 'Pusat Kendali Lingkup KAN',   icon: Award,    roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/scope-matrix',       label: 'Matriks Ruang Lingkup KAN',     icon: Layers,   roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/calibrator-health',  label: 'Kesehatan Kalibrator & Drift',  icon: Zap,      roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/traceability-graph', label: 'Grafik Ketertelusuran Dampak',  icon: Layers,   roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },
  { path: '/metrological-validation', label: 'Validasi Metrologis',     icon: ShieldCheck, roles: ['admin','supervisor','technician','management','client'], category: 'KECERDASAN METROLOGI' },

  // KECERDASAN EKSEKUTIF & MUTU
  { path: '/executive-intelligence', label: 'Kecerdasan Eksekutif 5D', icon: BarChart3, roles: ['admin','supervisor','management'], category: 'KECERDASAN EKSEKUTIF & MUTU' },
  { path: '/quality-command-center', label: 'Pusat Kendali Mutu (QMS)', icon: ShieldCheck, roles: ['admin','supervisor'], category: 'KECERDASAN EKSEKUTIF & MUTU' },
  { path: '/incident-rca',        label: 'Studio Insiden RCA (5-Why)', icon: Atom,      roles: ['admin','supervisor'],             category: 'KECERDASAN EKSEKUTIF & MUTU' },
  { path: '/audit-package',      label: 'Paket Bukti Audit 1-Klik', icon: FileText,     roles: ['admin','supervisor'],             category: 'KECERDASAN EKSEKUTIF & MUTU' },

  // INTEROPERABILITAS & BRIDGING
  { path: '/satusehat-hub',      label: 'Pusat Interoperabilitas SatuSehat', icon: Network, roles: ['admin','supervisor','technician'], category: 'INTEROPERABILITAS & BRIDGING' },
  { path: '/siintan-dispatcher', label: 'Dispatcher Dosis Si-INTAN', icon: Radio,       roles: ['admin','supervisor','technician'], category: 'INTEROPERABILITAS & BRIDGING' },
  { path: '/thermal-sticker-studio', label: 'Studio Label Sticker Thermal', icon: Printer, roles: ['admin','supervisor','technician'], category: 'INTEROPERABILITAS & BRIDGING' },

  // KECERDASAN BUATAN (AI)
  { path: '/ik-assistant',       label: 'Asisten Metode Kerja AI',     icon: Wand2,        roles: ['admin','supervisor','technician'], category: 'KECERDASAN BUATAN (AI)' },
  { path: '/extractor',          label: 'Ekstraktor Sertifikat AI',    icon: BrainCircuit, roles: ['admin','supervisor','technician'], category: 'KECERDASAN BUATAN (AI)' },

  // ADMINISTRASI & AUDIT
  { path: '/reports',            label: 'Laporan Kinerja Laboratorium', icon: BarChart3,    roles: ['admin','supervisor','management'], category: 'ADMINISTRASI & AUDIT' },
  { path: '/audit-logs',         label: 'Audit Aktivitas & Keamanan',  icon: ShieldCheck,  roles: ['admin','supervisor'],             category: 'ADMINISTRASI & AUDIT' },
  { path: '/metadata-manager',   label: 'Master Metadata & Konfigurasi', icon: Database,   roles: ['admin','supervisor'],             category: 'ADMINISTRASI & AUDIT' },
  { path: '/users',              label: 'Manajemen Pengguna System',   icon: Users,        roles: ['admin'],                          category: 'ADMINISTRASI & AUDIT' },
  { path: '/settings',           label: 'Pengaturan Sistem',           icon: Settings,     roles: ['admin','supervisor','technician','management','client'], category: 'ADMINISTRASI & AUDIT' },
];

const categoryColors: Record<string, string> = {
  'UTAMA 3.0':                   'text-cyan-500 dark:text-cyan-400',
  'KALIBRASI, UKES & PEMELIHARAAN':'text-emerald-500 dark:text-emerald-400',
  'KECERDASAN METROLOGI':        'text-amber-500 dark:text-amber-400',
  'KECERDASAN EKSEKUTIF & MUTU': 'text-purple-500 dark:text-purple-400',
  'INTEROPERABILITAS & BRIDGING':'text-teal-500 dark:text-teal-400',
  'KECERDASAN BUATAN (AI)':      'text-fuchsia-500 dark:text-fuchsia-400',
  'ADMINISTRASI & AUDIT':        'text-slate-400 dark:text-slate-500',
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]         = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1200;
    }
    return false;
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarFilter, setSidebarFilter]     = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications]     = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [downloadModalTab, setDownloadModalTab] = useState<'android' | 'pc' | 'ios'>('android');
  const { theme, toggleTheme }                = useTheme();
  const darkMode                              = theme === 'dark';
  const { profile, logout }                   = useAuth();

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1200 && window.innerWidth >= 768) {
        setSidebarOpen(false);
      } else if (window.innerWidth >= 1200) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useNavigate();
  const location = useLocation();

  const userRole         = profile?.role || 'technician';
  const filteredNavItems = useMemo(() => {
    return navItems.filter(item => {
      const hasRole = item.roles.includes(userRole);
      if (!hasRole) return false;
      if (!sidebarFilter.trim()) return true;
      return (
        item.label.toLowerCase().includes(sidebarFilter.toLowerCase()) ||
        item.category.toLowerCase().includes(sidebarFilter.toLowerCase())
      );
    });
  }, [userRole, sidebarFilter]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    navItems.forEach(item => {
      if (item.roles.includes(userRole)) {
        cats.add(item.category);
      }
    });
    return Array.from(cats);
  }, [userRole]);

  const activeNavItem = navItems.find(item =>
    location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))
  );

  const toggleCategory = (category: string) => {
    setCollapsedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  React.useEffect(() => {
    if (!profile?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('targetUid', 'in', [profile.uid, 'all']),
      orderBy('createdAt', 'desc')
    );
    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as NotificationItem));
        setNotifications(list);
      }, (error) => {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          setNotifications([]);
        }
      });
    } catch (err) {
      console.warn('Notification listener initialization error:', err);
    }
    return () => unsubscribe();
  }, [profile?.uid]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (error) {
      console.error('Gagal memperbarui notifikasi:', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getFormattedRole = (role?: string) => {
    if (!role) return 'SUPER ADMIN';
    const r = role.toLowerCase();
    if (r === 'admin')      return 'CHIEF METROLOGIST';
    if (r === 'supervisor') return 'SENIOR METROLOGIST';
    if (r === 'technician') return 'FIELD METROLOGIST';
    if (r === 'client')     return 'HOSPITAL CLIENT';
    return role.toUpperCase();
  };

  const avatarInitials = (profile?.displayName?.slice(0, 2) || 'AD').toUpperCase();

  return (
    <div className="flex h-screen text-slate-900 dark:text-slate-100 overflow-hidden font-sans bg-[#f4f6fb] dark:bg-[#040812]">

      {/* ===================== DESKTOP SIDEBAR ===================== */}
      <aside
        className={cn(
          "hidden md:flex flex-col transition-all duration-300 ease-in-out glass-sidebar relative z-40 print:hidden shrink-0 border-r border-slate-200/70 dark:border-slate-800/60 shadow-xl",
          sidebarOpen ? "w-64" : "w-[68px]"
        )}
      >
        {/* Logo area */}
        <div className={cn(
          "flex items-center h-[60px] border-b border-slate-200/60 dark:border-slate-800/40 shrink-0 transition-all duration-300",
          sidebarOpen ? "px-4 justify-between" : "px-0 justify-center"
        )}>
          {sidebarOpen ? (
            <>
              <Logo className="h-8 text-slate-900 dark:text-white" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                title="Ciutkan sidebar"
                aria-label="Ciutkan sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
              title="Perluas sidebar"
              aria-label="Perluas sidebar"
            >
              <Logo iconOnly className="h-8 w-8 text-slate-900 dark:text-white" />
            </button>
          )}
        </div>

        {/* Quick Command Palette / Filter */}
        {sidebarOpen && (
          <div className="px-3 pt-3 space-y-2 shrink-0">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-xs flex items-center justify-between font-mono transition-all group shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-sans font-medium text-slate-300">Pencarian Cepat...</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 font-bold border border-slate-700">Ctrl K</span>
            </button>

            {/* Quick in-sidebar filter */}
            <div className="relative">
              <input
                type="text"
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
                placeholder="Filter menu..."
                className="w-full pl-7 pr-7 py-1.5 text-[11px] rounded-lg bg-slate-100/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              />
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              {sidebarFilter && (
                <button
                  onClick={() => setSidebarFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2.5 space-y-4">
          {categories.map((category) => {
            const items = filteredNavItems.filter(item => item.category === category);
            if (items.length === 0) return null;
            const isCollapsed = !sidebarFilter && !!collapsedCategories[category];

            return (
              <div key={category} className="space-y-0.5">
                {sidebarOpen ? (
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[9px] font-black uppercase tracking-[0.18em] select-none font-mono text-left group hover:opacity-80 transition-opacity"
                  >
                    <span className={cn(categoryColors[category] || 'text-slate-400')}>
                      {category}
                    </span>
                    <ChevronDown className={cn(
                      "w-3 h-3 text-slate-400 transition-transform duration-200",
                      isCollapsed ? "-rotate-90" : "rotate-0"
                    )} />
                  </button>
                ) : (
                  <div className="h-px bg-slate-200/50 dark:bg-slate-800/50 my-2 mx-1" />
                )}

                {(!isCollapsed || !sidebarOpen) && (
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                          "flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 relative group",
                          sidebarOpen ? "" : "justify-center",
                          isActive
                            ? "bg-indigo-600/[0.1] dark:bg-rose-500/[0.12] text-indigo-700 dark:text-rose-300 font-semibold shadow-sm"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.05]"
                        )}
                      >
                        {({ isActive }) => (
                          <>
                            {/* Active left bar */}
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-bar"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gradient-to-b from-indigo-500 to-violet-600 dark:from-rose-400 dark:to-pink-500 rounded-r-full"
                              />
                            )}

                            {/* Icon */}
                            <item.icon className={cn(
                              "shrink-0 transition-all duration-150 group-hover:scale-105",
                              sidebarOpen ? "w-4 h-4" : "w-4.5 h-4.5",
                              isActive
                                ? "text-indigo-600 dark:text-rose-400"
                                : "text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                            )} />

                            {/* Label */}
                            {sidebarOpen && (
                              <span className="text-[11.5px] font-medium tracking-normal truncate">
                                {item.label}
                              </span>
                            )}

                            {/* Collapsed tooltip */}
                            {!sidebarOpen && (
                              <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-all duration-150 translate-x-1 group-hover:translate-x-0 pointer-events-none shadow-xl border border-slate-200/10">
                                {item.label}
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900/95 dark:bg-slate-800/95 rotate-45 border-l border-b border-slate-200/10" />
                              </div>
                            )}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* App Download / Install button */}
        <div className="shrink-0 px-3 py-2 border-t border-slate-200/50 dark:border-slate-800/40">
          {sidebarOpen ? (
            <button
              onClick={() => { setDownloadModalTab('android'); setDownloadModalOpen(true); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-rose-400 bg-indigo-500/10 dark:bg-rose-500/10 hover:bg-indigo-500/20 dark:hover:bg-rose-500/20 border border-indigo-500/20 dark:border-rose-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span className="truncate">Unduh App (APK / PC / iOS)</span>
            </button>
          ) : (
            <button
              onClick={() => { setDownloadModalTab('android'); setDownloadModalOpen(true); }}
              className="w-9 h-9 mx-auto flex items-center justify-center rounded-xl text-indigo-600 dark:text-rose-400 bg-indigo-500/10 dark:bg-rose-500/10 hover:bg-indigo-500/20 transition-all cursor-pointer"
              title="Unduh Aplikasi (APK/PC/iOS)"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* User area */}
        <div className="shrink-0 p-3 border-t border-slate-200/50 dark:border-slate-800/40">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-800/30 border border-slate-200/40 dark:border-slate-700/30 transition-all duration-300">
              {/* Avatar */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-violet-500 to-rose-500 p-px shrink-0 shadow-sm">
                <div className="w-full h-full rounded-[7px] bg-slate-900 flex items-center justify-center font-bold text-white text-[10px]">
                  {avatarInitials}
                </div>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-none">{profile?.displayName || 'Administrator'}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide truncate font-mono">{getFormattedRole(profile?.role)}</p>
                </div>
              </div>
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-500 transition-all hover:bg-red-500/[0.08] rounded-lg group/logout"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut className="w-3.5 h-3.5 group-hover/logout:scale-110 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-rose-500 p-px shadow-sm">
                <div className="w-full h-full rounded-[6px] bg-slate-900 flex items-center justify-center font-bold text-white text-[9px]">
                  {avatarInitials}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/[0.08] transition-all"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ===================== MAIN CONTENT ===================== */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

        {/* ---- HEADER ---- */}
        <header className="h-[60px] flex items-center justify-between px-4 sm:px-6 glass-header z-30 print:hidden shrink-0 border-b border-slate-200/60 dark:border-slate-800/50">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/50 transition-all"
              title="Toggle Sidebar"
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="hidden md:flex items-center gap-2 text-sm">
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              {activeNavItem ? (
                <div className="flex items-center gap-2 select-none">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">
                    {activeNavItem.category}
                  </span>
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                  <span className="text-[12px] font-semibold text-indigo-600 dark:text-rose-400">
                    {activeNavItem.label}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 select-none">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-mono">SISTEM</span>
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="text-[12px] font-semibold text-indigo-600 dark:text-rose-400">SPEKTRUM</span>
                </div>
              )}
            </div>

            {/* Mobile logo */}
            <button
              className="md:hidden flex items-center"
              onClick={() => navigate('/dashboard')}
              title="Kembali ke Dashboard"
              aria-label="Kembali ke Dashboard"
            >
              <Logo iconOnly className="h-8 w-8 text-slate-900 dark:text-white" />
            </button>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Search launcher button */}
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden lg:flex items-center gap-2 bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 px-3.5 py-1.5 rounded-xl group transition-all hover:border-indigo-500/30"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
              <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">Cari navigasi...</span>
              <kbd className="text-[9px] bg-white/80 dark:bg-slate-700/80 px-1.5 py-0.5 rounded-md text-slate-400 font-mono border border-slate-200/60 dark:border-slate-600/60 shadow-sm ml-2">⌘K</kbd>
            </button>

            {/* Download App button */}
            <button
              onClick={() => { setDownloadModalTab('android'); setDownloadModalOpen(true); }}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 dark:text-rose-400 bg-indigo-500/10 dark:bg-rose-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 dark:border-rose-500/20 transition-all cursor-pointer"
              title="Unduh Aplikasi (Android APK / PC / iOS)"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-wider">Unduh App</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-amber-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 transition-all"
              title={darkMode ? "Mode Terang" : "Mode Gelap"}
              aria-label={darkMode ? "Mode Terang" : "Mode Gelap"}
            >
              {darkMode
                ? <Sun className="w-4 h-4 text-amber-400" />
                : <Moon className="w-4 h-4" />
              }
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative p-2 rounded-lg border transition-all",
                  showNotifications
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20"
                    : "text-slate-500 hover:text-indigo-600 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50"
                )}
                title="Notifikasi"
                aria-label="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-indigo-600 text-white text-[9px] font-bold font-mono rounded-full px-0.5 border-2 border-white dark:border-[#040812]">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.96 }}
                      transition={{ duration: 0.15, ease: [0.16,1,0.3,1] }}
                      className="absolute right-0 top-11 w-[calc(100vw-2.5rem)] max-w-xs sm:w-80 bg-white/95 dark:bg-[#0d1426]/95 backdrop-blur-xl border border-slate-200/60 dark:border-slate-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[420px]"
                    >
                      <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/30">
                        <div className="flex items-center gap-2">
                          <Bell className="w-3.5 h-3.5 text-indigo-600 dark:text-rose-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 font-mono">Notifikasi</span>
                        </div>
                        {unreadCount > 0 && (
                          <span className="text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-mono">{unreadCount} baru</span>
                        )}
                      </div>

                      <div className="overflow-y-auto flex-1 custom-scrollbar">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <ShieldCheck className="w-8 h-8 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono">Tidak ada notifikasi</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                            {notifications.map((notif) => (
                              <div
                                key={notif.id}
                                onClick={() => {
                                  handleMarkAsRead(notif.id);
                                  if (notif.link) { navigate(notif.link); setShowNotifications(false); }
                                }}
                                className={cn(
                                  "px-4 py-3.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer flex gap-3 items-start",
                                  !notif.read ? "bg-indigo-50/40 dark:bg-indigo-500/[0.05] border-l-[3px] border-l-indigo-500" : ""
                                )}
                              >
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                                  notif.type === 'success' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" :
                                  notif.type === 'warning' ? "bg-amber-50 dark:bg-amber-500/10 text-amber-500" :
                                  notif.type === 'error'   ? "bg-red-50 dark:bg-red-500/10 text-red-500" :
                                  "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500"
                                )}>
                                  <Info className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate pr-2">{notif.title}</p>
                                    {!notif.read && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shrink-0" />}
                                  </div>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">{notif.message}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* User profile button */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200/60 dark:border-slate-700/50">
              <div className="text-right hidden xl:block">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[130px]">{profile?.displayName || 'Admin'}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-1 leading-none font-mono">{getFormattedRole(profile?.role)}</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-rose-500/10 dark:from-indigo-500/[0.08] dark:to-rose-500/[0.08] border border-slate-200/60 dark:border-slate-700/50 p-px shadow-sm hover:scale-105 transition-transform overflow-hidden"
                title="Buka Pengaturan Akun"
                aria-label="Buka Pengaturan Akun"
              >
                <div className="w-full h-full rounded-[10px] bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-rose-400 transition-colors">
                  {profile?.displayName?.[0] || 'U'}
                </div>
              </button>
            </div>
          </div>
        </header>

        {/* ---- CONTENT ---- */}
        <main className="flex-1 overflow-auto custom-scrollbar relative grid-bg bg-transparent">
          <div className="absolute inset-0 bg-slate-50/60 dark:bg-[#040812]/90 pointer-events-none" />
          <Interactive3DCanvas density="low" opacity={0.12} interactive={true} />

          {/* Ambient glows */}
          <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-indigo-500/[0.06] to-transparent rounded-full blur-[160px] pointer-events-none -z-10" />
          <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-rose-500/[0.05] to-transparent rounded-full blur-[140px] pointer-events-none -z-10" />
          <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/15 dark:via-rose-500/20 to-transparent pointer-events-none z-10" />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-[1440px] mx-auto p-4 sm:p-6 lg:p-8 pb-28 md:pb-8"
          >
            {children}
          </motion.div>
        </main>

        <Chat />
        <AIAssistant />
        <OfflineSyncBar />

        {/* ===================== MOBILE DRAWER ===================== */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 md:hidden"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="fixed top-0 left-0 h-full w-[85vw] max-w-[320px] glass-sidebar z-[60] md:hidden flex flex-col shadow-2xl overflow-hidden bg-white/95 dark:bg-[#080d1e]/95 backdrop-blur-2xl"
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between h-[60px] px-4 border-b border-slate-200/60 dark:border-slate-800/40 shrink-0">
                  <Logo className="h-7 text-slate-900 dark:text-white" />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all"
                    aria-label="Tutup Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Mobile Drawer search */}
                <div className="p-3 border-b border-slate-200/50 dark:border-slate-800/40">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={sidebarFilter}
                      onChange={(e) => setSidebarFilter(e.target.value)}
                      placeholder="Cari navigasi sistem..."
                      className="w-full bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Drawer nav */}
                <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 custom-scrollbar">
                  {categories.map((category) => {
                    const items = filteredNavItems.filter(item => item.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1">
                        <div className={cn(
                          "px-3 pt-2 pb-1 text-[9px] font-black uppercase tracking-[0.2em] select-none font-mono",
                          categoryColors[category] || 'text-slate-400'
                        )}>
                          {category}
                        </div>
                        {items.map((item) => (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
                              isActive
                                ? "bg-indigo-600/[0.1] dark:bg-rose-500/[0.12] text-indigo-700 dark:text-rose-300 font-semibold"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="text-[12px] font-medium truncate">{item.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    );
                  })}
                </nav>

                {/* Drawer user */}
                <div className="shrink-0 p-4 border-t border-slate-200/50 dark:border-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 p-px shadow-sm shrink-0">
                      <div className="w-full h-full rounded-[10px] bg-slate-900 flex items-center justify-center font-bold text-white text-[11px]">
                        {avatarInitials}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 truncate">{profile?.displayName || 'Operator'}</p>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono font-semibold tracking-wide truncate">{getFormattedRole(profile?.role)}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/[0.08] rounded-lg transition-all"
                      title="Keluar"
                      aria-label="Keluar"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ===================== BOTTOM NAV (MOBILE) ===================== */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full glass-bottom-nav z-40 print:hidden border-t border-slate-200/60 dark:border-slate-800/50">
          <div className="flex items-center justify-around px-2 pt-2 pb-safe">
            {[
              { to: '/dashboard',           icon: LayoutDashboard, label: 'Home' },
              { to: '/universal-workspace', icon: Compass,         label: 'Workspace' },
              { to: '/worksheets',          icon: FileText,        label: 'LK' },
              { to: '/asset-passport',      icon: Stethoscope,     label: 'Aset 360°' },
            ].map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 min-h-[52px]",
                  isActive
                    ? "text-indigo-600 dark:text-rose-400 font-bold"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "w-9 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
                      isActive ? "bg-indigo-600/10 dark:bg-rose-400/10 scale-105" : ""
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wide leading-none">{label}</span>
                  </>
                )}
              </NavLink>
            ))}

            {/* More button */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-1 flex-1 py-1.5 px-1 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all min-h-[52px]"
              aria-label="Buka Semua Menu"
            >
              <div className="w-9 h-8 flex items-center justify-center rounded-xl">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Menu</span>
            </button>
          </div>
        </nav>

        {/* Command Palette Modal (Ctrl + K) */}
        <CommandPalette isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />

        {/* Multi-platform App Download Modal */}
        <AppDownloadModal
          isOpen={downloadModalOpen}
          onClose={() => setDownloadModalOpen(false)}
          defaultTab={downloadModalTab}
        />

      </div>
    </div>
  );
}


