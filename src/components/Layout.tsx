import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard, Stethoscope, Zap, FileText, BookOpen, Settings, LogOut,
  Menu, X, Bell, Search, ChevronRight, Award, BarChart3, Wifi, WifiOff,
  Users, Wand2, BrainCircuit, ShieldCheck, Info, Sun, Moon, Wrench,
  Atom, ClipboardList, History, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Chat } from './Chat';
import { AIAssistant } from './AIAssistant';
import { Logo } from './Logo';
import { Interactive3DCanvas } from './Interactive3DCanvas';
import { collection, query, onSnapshot, where, orderBy, doc, updateDoc } from 'firebase/firestore';

const navItems = [
  { path: '/dashboard',      label: 'Dashboard',              icon: LayoutDashboard, roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA' },
  { path: '/work-orders',    label: 'Work Orders',            icon: ClipboardList,   roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA' },
  { path: '/service-history',label: 'Service History',        icon: History,         roles: ['admin','supervisor','technician','management','client'], category: 'UTAMA' },

  { path: '/worksheets',     label: 'Lembar Kerja',           icon: FileText,        roles: ['admin','supervisor','technician'], category: 'METROLOGI' },
  { path: '/calibrators',    label: 'Standar & Kalibrator',   icon: Zap,             roles: ['admin','supervisor'],             category: 'METROLOGI' },
  { path: '/inventory',      label: 'Inventaris Alat',        icon: Stethoscope,     roles: ['admin','supervisor'],             category: 'METROLOGI' },
  { path: '/certificates',   label: 'Arsip Sertifikat',       icon: Award,           roles: ['admin','supervisor'],             category: 'METROLOGI' },
  { path: '/methods',        label: 'Metode Kerja',           icon: BookOpen,        roles: ['admin','supervisor','technician'], category: 'METROLOGI' },

  { path: '/ipm',            label: 'Pemeliharaan IPM',       icon: Wrench,          roles: ['admin','supervisor','technician'], category: 'PEMELIHARAAN' },
  { path: '/ukes',           label: 'Uji Kesesuaian (Ukes)',  icon: Atom,            roles: ['admin','supervisor','technician'], category: 'PEMELIHARAAN' },

  { path: '/ik-assistant',   label: 'Asisten MK AI',          icon: Wand2,           roles: ['admin','supervisor','technician'], category: 'KECERDASAN BUATAN' },
  { path: '/extractor',      label: 'Ekstraktor AI',          icon: BrainCircuit,    roles: ['admin','supervisor','technician'], category: 'KECERDASAN BUATAN' },

  { path: '/reports',        label: 'Laporan Kinerja',        icon: BarChart3,       roles: ['admin','supervisor','management'], category: 'ADMINISTRASI' },
  { path: '/audit-logs',     label: 'Audit Aktivitas',        icon: ShieldCheck,     roles: ['admin','supervisor'],             category: 'ADMINISTRASI' },
  { path: '/users',          label: 'Manajemen User',         icon: Users,           roles: ['admin'],                          category: 'ADMINISTRASI' },
];

const categoryColors: Record<string, string> = {
  'UTAMA':             'text-indigo-500 dark:text-indigo-400',
  'METROLOGI':         'text-rose-500 dark:text-rose-400',
  'PEMELIHARAAN':      'text-cyan-500 dark:text-cyan-400',
  'KECERDASAN BUATAN': 'text-amber-500 dark:text-amber-400',
  'ADMINISTRASI':      'text-slate-400 dark:text-slate-500',
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen]         = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline]               = useState(navigator.onLine);
  const [notifications, setNotifications]     = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, toggleTheme }                = useTheme();
  const darkMode                              = theme === 'dark';
  const { profile, logout }                   = useAuth();
  const navigate                              = useNavigate();
  const location                              = useLocation();

  const activeNavItem = navItems.find(item =>
    location.pathname === item.path ||
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))
  );

  React.useEffect(() => {
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        setNotifications(list);
      }, (error) => {
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          setNotifications([]);
        }
      });
    } catch (e) {}
    return () => unsubscribe();
  }, [profile?.uid]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (err) {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userRole         = profile?.role || 'technician';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

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
          "hidden md:flex flex-col transition-all duration-400 ease-in-out glass-sidebar relative z-40 print:hidden shrink-0",
          sidebarOpen ? "w-64" : "w-[68px]"
        )}
      >
        {/* Logo area */}
        <div className={cn(
          "flex items-center h-[60px] border-b border-slate-200/60 dark:border-slate-800/40 shrink-0 transition-all duration-300",
          sidebarOpen ? "px-5 justify-between" : "px-0 justify-center"
        )}>
          {sidebarOpen ? (
            <>
              <Logo className="h-8 text-slate-900 dark:text-white" />
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
                title="Ciutkan sidebar"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all"
              title="Perluas sidebar"
            >
              <Logo iconOnly className="h-8 w-8 text-slate-900 dark:text-white" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-auto custom-scrollbar py-4 px-3 space-y-5">
          {['UTAMA', 'METROLOGI', 'PEMELIHARAAN', 'KECERDASAN BUATAN', 'ADMINISTRASI'].map((category) => {
            const items = filteredNavItems.filter(item => item.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-0.5">
                {sidebarOpen && (
                  <div className={cn(
                    "px-3 pt-1 pb-2 text-[9px] font-black uppercase tracking-[0.22em] select-none font-mono",
                    categoryColors[category] || 'text-slate-400'
                  )}>
                    {category}
                  </div>
                )}
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative group",
                      sidebarOpen ? "" : "justify-center",
                      isActive
                        ? "bg-indigo-600/[0.08] dark:bg-rose-500/[0.08] text-indigo-700 dark:text-rose-300 font-semibold"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
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
                          "shrink-0 transition-all duration-200",
                          sidebarOpen ? "w-4 h-4" : "w-4.5 h-4.5",
                          isActive
                            ? "text-indigo-600 dark:text-rose-400"
                            : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )} />

                        {/* Label */}
                        {sidebarOpen && (
                          <span className="text-[12px] font-medium tracking-normal truncate">
                            {item.label}
                          </span>
                        )}

                        {/* Collapsed tooltip */}
                        {!sidebarOpen && (
                          <div className="absolute left-full ml-3 px-3 py-1.5 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-semibold rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-all duration-150 translate-x-1 group-hover:translate-x-0 pointer-events-none shadow-xl">
                            {item.label}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-slate-900 dark:bg-slate-800 rotate-45" />
                          </div>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

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
        <header className="h-[60px] flex items-center justify-between px-4 sm:px-6 glass-header z-30 print:hidden shrink-0">
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
            {/* Search — desktop only */}
            <div className="hidden lg:flex items-center gap-2 bg-slate-100/60 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/40 px-3.5 py-2 rounded-xl group transition-all focus-within:ring-2 focus-within:ring-indigo-500/15 focus-within:border-indigo-500/30">
              <Search className="w-3.5 h-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors shrink-0" />
              <input
                type="text"
                placeholder="Cari data..."
                className="bg-transparent border-none text-[12px] w-40 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium p-0 text-slate-800 dark:text-white"
              />
              <kbd className="text-[9px] bg-white/80 dark:bg-slate-700/80 px-1.5 py-0.5 rounded-md text-slate-400 font-mono border border-slate-200/60 dark:border-slate-600/60 shadow-sm ml-1 hidden xl:block">⌘K</kbd>
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-amber-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 transition-all"
              title={darkMode ? "Mode Terang" : "Mode Gelap"}
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
                      className="absolute right-0 top-11 w-80 bg-white dark:bg-[#0d1426] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[420px]"
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

            {/* User profile */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200/60 dark:border-slate-700/50">
              <div className="text-right hidden xl:block">
                <p className="text-[12px] font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[130px]">{profile?.displayName || 'Admin'}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-1 leading-none font-mono">{getFormattedRole(profile?.role)}</p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-rose-500/10 dark:from-indigo-500/[0.08] dark:to-rose-500/[0.08] border border-slate-200/60 dark:border-slate-700/50 p-px shadow-sm hover:scale-105 transition-transform overflow-hidden"
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

        {/* ===================== MOBILE DRAWER ===================== */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 md:hidden"
              />

              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 240 }}
                className="fixed top-0 left-0 h-full w-72 glass-sidebar z-[60] md:hidden flex flex-col shadow-2xl overflow-hidden"
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between h-[60px] px-5 border-b border-slate-200/60 dark:border-slate-800/40 shrink-0">
                  <Logo className="h-7 text-slate-900 dark:text-white" />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-all"
                    aria-label="Tutup Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Drawer nav */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-4 custom-scrollbar">
                  {['UTAMA', 'METROLOGI', 'PEMELIHARAAN', 'KECERDASAN BUATAN', 'ADMINISTRASI'].map((category) => {
                    const items = filteredNavItems.filter(item => item.category === category);
                    if (items.length === 0) return null;
                    return (
                      <div key={category} className="space-y-0.5">
                        <div className={cn(
                          "px-3 pt-1 pb-2 text-[9px] font-black uppercase tracking-[0.22em] select-none font-mono",
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
                              "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150",
                              isActive
                                ? "bg-indigo-600/[0.08] dark:bg-rose-500/[0.08] text-indigo-700 dark:text-rose-300 font-semibold"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-900/[0.04] dark:hover:bg-white/[0.04]"
                            )}
                          >
                            <item.icon className="w-4 h-4 shrink-0" />
                            <span className="text-[13px] font-medium">{item.label}</span>
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
        <nav className="md:hidden fixed bottom-0 left-0 w-full glass-bottom-nav z-50 print:hidden">
          <div className="flex items-center justify-around px-2 pt-2 pb-safe">
            {[
              { to: '/dashboard',    icon: LayoutDashboard, label: 'Home' },
              { to: '/worksheets',   icon: FileText,        label: 'LK' },
              { to: '/ik-assistant', icon: Wand2,           label: 'AI' },
              { to: '/extractor',    icon: BrainCircuit,    label: 'Ekstraktor' },
            ].map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => cn(
                  "flex flex-col items-center justify-center gap-1 flex-1 py-1.5 px-1 rounded-xl transition-all duration-200 min-h-[52px]",
                  isActive
                    ? "text-indigo-600 dark:text-rose-400"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
              >
                {({ isActive }) => (
                  <>
                    <div className={cn(
                      "w-9 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
                      isActive ? "bg-indigo-600/10 dark:bg-rose-400/10" : ""
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
            >
              <div className="w-9 h-8 flex items-center justify-center rounded-xl">
                <Menu className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Menu</span>
            </button>
          </div>
        </nav>

      </div>
    </div>
  );
}
