import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Stethoscope, Zap, FileText, BookOpen, Settings, LogOut, Menu, X, Bell, Search, ChevronRight, Award, BarChart3, Wifi, WifiOff, Users, Wand2, BrainCircuit, ShieldCheck, Info, Sun, Moon, Wrench, Atom, ClipboardList, History } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { auth, db } from '../lib/firebase';
import { cn } from '../lib/utils';
import { Chat } from './Chat';
import { AIAssistant } from './AIAssistant';
import { Logo } from './Logo';
import { collection, query, onSnapshot, where, orderBy, doc, updateDoc } from 'firebase/firestore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'supervisor', 'technician', 'management', 'client'], category: 'UTAMA' },
  { path: '/work-orders', label: 'Work Orders', icon: ClipboardList, roles: ['admin', 'supervisor', 'technician', 'management', 'client'], category: 'UTAMA' },
  { path: '/service-history', label: 'Service History', icon: History, roles: ['admin', 'supervisor', 'technician', 'management', 'client'], category: 'UTAMA' },
  
  { path: '/worksheets', label: 'Lembar Kerja', icon: FileText, roles: ['admin', 'supervisor', 'technician'], category: 'METROLOGI' },
  { path: '/calibrators', label: 'Standar & Kalibrator', icon: Zap, roles: ['admin', 'supervisor'], category: 'METROLOGI' },
  { path: '/inventory', label: 'Inventaris Alat', icon: Stethoscope, roles: ['admin', 'supervisor'], category: 'METROLOGI' },
  { path: '/certificates', label: 'Arsip Sertifikat', icon: Award, roles: ['admin', 'supervisor'], category: 'METROLOGI' },
  { path: '/methods', label: 'Metode Kerja', icon: BookOpen, roles: ['admin', 'supervisor', 'technician'], category: 'METROLOGI' },
  
  { path: '/ipm', label: 'Pemeliharaan IPM', icon: Wrench, roles: ['admin', 'supervisor', 'technician'], category: 'PEMELIHARAAN' },
  { path: '/ukes', label: 'Uji Kesesuaian (Ukes)', icon: Atom, roles: ['admin', 'supervisor', 'technician'], category: 'PEMELIHARAAN' },
  
  { path: '/ik-assistant', label: 'Asisten MK AI', icon: Wand2, roles: ['admin', 'supervisor', 'technician'], category: 'KECERDASAN BUATAN' },
  { path: '/extractor', label: 'Ekstraktor AI', icon: BrainCircuit, roles: ['admin', 'supervisor', 'technician'], category: 'KECERDASAN BUATAN' },
  
  { path: '/reports', label: 'Laporan Kinerja', icon: BarChart3, roles: ['admin', 'supervisor', 'management'], category: 'ADMINISTRASI' },
  { path: '/audit-logs', label: 'Audit Aktivitas', icon: ShieldCheck, roles: ['admin', 'supervisor'], category: 'ADMINISTRASI' },
  { path: '/users', label: 'Manajemen User', icon: Users, roles: ['admin'], category: 'ADMINISTRASI' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeNavItem = navItems.find(item => 
    location.pathname === item.path || 
    (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'))
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (!profile?.uid) return;
    
    // Subscribe to notifications for this user or 'all'
    const q = query(
      collection(db, 'notifications'),
      where('targetUid', 'in', [profile.uid, 'all']),
      orderBy('createdAt', 'desc')
    );

    let unsubscribe = () => {};
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setNotifications(list);
      }, (error) => {
        // Quietly handle permission warning without logging full stack or spamming console
        if (error.code === 'permission-denied' || error.message?.includes('permission')) {
          setNotifications([]);
        } else {
          console.debug("Notifications real-time error (ignored):", error.message);
        }
      });
    } catch (e) {
      console.debug("Failed to set up notifications real-time listener:", e);
    }

    return () => unsubscribe();
  }, [profile?.uid]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const docRef = doc(db, 'notifications', notificationId);
      await updateDoc(docRef, { read: true });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };


  const userRole = profile?.role || 'technician';
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  const getFormattedRole = (role?: string) => {
    if (!role) return 'SUPER ADMIN';
    const r = role.toLowerCase();
    if (r === 'admin') return 'CHIEF METROLOGIST';
    if (r === 'supervisor') return 'SENIOR METROLOGIST';
    if (r === 'technician') return 'FIELD METROLOGIST';
    if (r === 'client') return 'HOSPITAL CLIENT';
    return role.toUpperCase();
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 dark:bg-[#030612] dark:text-slate-100 overflow-hidden font-sans grid-bg">
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r border-slate-200 dark:border-slate-800 transition-all duration-500 ease-in-out bg-white dark:bg-[#0b0f19] relative z-40 shadow-xl shadow-slate-200/50 dark:shadow-none print:hidden",
          sidebarOpen ? "w-72" : "w-20"
        )}
      >
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 h-16 flex items-center">
          <div className="flex items-center w-full overflow-hidden">
            {sidebarOpen ? (
              <Logo className="h-9 text-slate-900 dark:text-white" />
            ) : (
              <Logo iconOnly className="h-9 w-9 text-slate-900 dark:text-white mx-auto" />
            )}
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-4 mt-4 overflow-auto custom-scrollbar">
          {['UTAMA', 'METROLOGI', 'PEMELIHARAAN', 'KECERDASAN BUATAN', 'ADMINISTRASI'].map((category) => {
            const items = filteredNavItems.filter(item => item.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category} className="space-y-1">
                {sidebarOpen && (
                  <div className="px-4 py-2 text-[10px] font-bold uppercase text-slate-400/80 dark:text-slate-500/80 tracking-widest select-none mt-2">
                    {category}
                  </div>
                )}
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all group relative duration-200",
                      isActive 
                        ? "bg-blue-50/40 dark:bg-cyan-500/[0.06] border border-blue-100/40 dark:border-cyan-500/10 text-blue-600 dark:text-cyan-400 font-bold shadow-sm" 
                        : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100/40 dark:hover:bg-slate-900/20 border border-transparent"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.div 
                            layoutId="sidebar-active-indicator"
                            className="absolute left-0 w-[3px] h-5 bg-gradient-to-b from-blue-500 to-indigo-500 dark:from-cyan-400 dark:to-blue-500 rounded-r-md shadow-sm shadow-blue-500/20 dark:shadow-cyan-400/20"
                          />
                        )}
                        <item.icon className={cn(
                          "w-4.5 h-4.5 transition-all duration-300", 
                          isActive ? "text-blue-600 dark:text-cyan-400 scale-105" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                        )} />
                        {sidebarOpen && (
                          <span className={cn(
                            "text-[12px] font-medium tracking-wide transition-all duration-300", 
                            isActive ? "text-slate-900 dark:text-white font-semibold" : "text-slate-500 dark:text-slate-400"
                          )}>
                            {item.label}
                          </span>
                        )}
                        {!sidebarOpen && (
                          <div className="absolute left-full ml-4 px-3 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 transition-all translate-x-2 group-hover:translate-x-0 pointer-events-none shadow-2xl">
                            {item.label}
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

        <div className="mt-auto p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-100/10 dark:bg-slate-950/40">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/50 dark:bg-[#070b17]/40 border border-slate-200/40 dark:border-slate-800/60 shadow-sm transition-all duration-300">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-500 p-0.5 shadow-sm shrink-0">
                <div className="w-full h-full rounded-[9px] bg-slate-900 flex items-center justify-center font-bold text-white uppercase text-xs overflow-hidden relative">
                  <span className="relative z-10">{profile?.displayName?.slice(0, 2) || 'AD'}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate tracking-tight">{profile?.displayName || 'Administrator'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                   <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide truncate">{getFormattedRole(profile?.role)}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg group/logout"
                title="Keluar"
              >
                <LogOut className="w-4 h-4 group-hover/logout:-translate-y-0.5 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={handleLogout}
                className="w-12 h-12 flex items-center justify-center rounded-xl bg-white dark:bg-[#0c111d] border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 transition-all shadow-sm group/logout hover:shadow-md"
                title="Keluar"
              >
                <LogOut className="w-5 h-5 group-hover/logout:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-[#030612]/85 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 z-30 print:hidden">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-800"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />
            
            {/* Desktop Dynamic Page Title Breadcrumb */}
            {activeNavItem ? (
              <div className="hidden md:flex items-center gap-2 select-none">
                <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 font-sans">
                  {activeNavItem.category}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700 shrink-0" />
                <span className="text-xs font-semibold tracking-wide text-blue-600 dark:text-cyan-400 font-sans">
                  {activeNavItem.label}
                </span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 select-none">
                <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400 dark:text-slate-500 font-sans">
                  SISTEM
                </span>
                <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-700 shrink-0" />
                <span className="text-xs font-semibold tracking-wide text-blue-600 dark:text-cyan-400 font-sans">
                  SPEKTRUM
                </span>
              </div>
            )}

            {/* Mobile Elegant Center Logo */}
            <div className="cursor-pointer flex items-center md:hidden" onClick={() => navigate('/dashboard')}>
              <Logo iconOnly className="h-8 w-8 text-slate-900 dark:text-white" />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 group transition-all focus-within:ring-2 focus-within:ring-blue-500/10 focus-within:border-blue-400">
              <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Cari data..." 
                className="bg-transparent border-none text-[11px] w-48 focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 font-semibold p-0 text-slate-900 dark:text-white"
              />
              <kbd className="text-[8px] bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-400 dark:text-slate-500 font-mono border border-slate-200 dark:border-slate-700 shadow-sm ml-2">⌘K</kbd>
            </div>
            
            <div className="flex items-center gap-4 relative">
              <button 
                type="button"
                onClick={toggleTheme}
                className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-400 hover:text-blue-600 dark:hover:text-amber-400 hover:bg-blue-50 dark:hover:bg-slate-800 transition-all"
                title={darkMode ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
              >
                {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-500 animate-[spin_10s_linear_infinite]" /> : <Moon className="w-4.5 h-4.5 text-slate-500" />}
              </button>

              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "relative p-2 text-slate-400 hover:text-blue-600 transition-all hover:bg-blue-50 rounded-lg border group",
                  showNotifications ? "bg-blue-50 text-blue-600 border-blue-200" : "border-slate-100"
                )}
                title="Notifikasi Sistem"
              >
                <Bell className="w-4.5 h-4.5 group-hover:animate-bounce" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-blue-600 text-white text-[9px] font-black font-mono rounded-full border-2 border-white shadow-sm px-1 animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowNotifications(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 15, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 15, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-80 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]"
                    >
                      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                         <div className="flex items-center gap-2">
                           <Bell className="w-4 h-4 text-blue-600" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-800 font-mono">Notifikasi Spektrum</span>
                         </div>
                         {unreadCount > 0 && (
                           <span className="text-[9px] font-black uppercase bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-mono">{unreadCount} BARU</span>
                         )}
                      </div>

                      <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[350px]">
                         {notifications.length === 0 ? (
                           <div className="p-8 text-center text-slate-400">
                             <ShieldCheck className="w-8 h-8 text-slate-200 mx-auto mb-3" />
                             <p className="text-[10px] font-black uppercase tracking-widest font-mono">Tidak ada notifikasi baru</p>
                           </div>
                         ) : (
                           <div className="divide-y divide-slate-50">
                             {notifications.map((notif) => {
                               return (
                                 <div 
                                   key={notif.id}
                                   onClick={() => {
                                     handleMarkAsRead(notif.id);
                                     if (notif.link) {
                                       navigate(notif.link);
                                       setShowNotifications(false);
                                     }
                                   }}
                                   className={cn(
                                     "p-4 transition-all hover:bg-slate-50/80 cursor-pointer flex gap-3 text-left items-start",
                                     !notif.read ? "bg-blue-50/30 border-l-4 border-l-blue-600" : ""
                                   )}
                                 >
                                   <div className={cn(
                                     "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                                     notif.type === 'success' ? "bg-emerald-50 text-emerald-500" :
                                     notif.type === 'warning' ? "bg-amber-50 text-amber-500" :
                                     notif.type === 'error' ? "bg-red-50 text-red-500" :
                                     "bg-blue-50 text-blue-500"
                                   )}>
                                      <Info className="w-4 h-4" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate pr-2">{notif.title}</p>
                                        {!notif.read && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0" />}
                                      </div>
                                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed uppercase tracking-tight">{notif.message}</p>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800">
                <div className="text-right hidden xl:block">
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[140px]" title={profile?.displayName}>
                    {profile?.displayName || 'Admin'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-1.5 leading-none">
                    {getFormattedRole(profile?.role)}
                  </p>
                </div>
                <button 
                  onClick={() => navigate('/settings')}
                  className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-cyan-500/10 dark:from-blue-500/5 dark:via-indigo-500/5 dark:to-cyan-500/5 border border-slate-200 dark:border-slate-800 p-0.5 shadow-sm hover:scale-[1.03] transition-all duration-300 group overflow-hidden"
                >
                   <div className="w-full h-full rounded-[9px] bg-white dark:bg-slate-950 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-cyan-400 transition-colors italic">
                    {profile?.displayName?.[0] || 'U'}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto bg-slate-50/65 dark:bg-[#040816] p-6 md:p-10 pb-24 md:pb-10 relative custom-scrollbar text-slate-900 dark:text-slate-100 grid-bg">
          {/* Enhanced Background Decorative Glows - Luxurious Golden Flare and Turquoise Aura */}
          <div className="fixed top-0 right-10 w-[700px] h-[700px] bg-gradient-to-b from-[#b38728]/10 via-amber-500/[0.01] to-transparent rounded-full blur-[160px] pointer-events-none -z-10 animate-pulse duration-[12s]"></div>
          <div className="fixed bottom-0 left-10 w-[600px] h-[600px] bg-gradient-to-t from-cyan-500/[0.08] via-blue-600/[0.01] to-transparent rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse duration-[8s]"></div>
          <div className="fixed top-1/3 left-1/4 w-[400px] h-[400px] bg-indigo-500/[0.03] rounded-full blur-[120px] pointer-events-none -z-10"></div>

          {/* Premium Thin Top Light Border Effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/10 dark:via-[#b38728]/20 to-transparent pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 max-w-[1400px] mx-auto"
          >
            {children}
          </motion.div>
        </main>


        <Chat />
        <AIAssistant />

        {/* Mobile Slide-out Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 md:hidden animate-fade-in"
              />
              
              {/* Drawer Body */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#0b0f19] border-r border-slate-200 dark:border-slate-800 z-[99] md:hidden flex flex-col p-6 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
                  <Logo className="h-9 text-slate-900 dark:text-white" />
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Drawer Nav Links */}
                <nav className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar">
                  {filteredNavItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) => cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                        isActive 
                          ? "bg-blue-600/5 dark:bg-blue-600/10 text-blue-600 dark:text-blue-400 font-bold" 
                          : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900/40"
                      )}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="text-xs font-medium tracking-wide text-slate-700 dark:text-slate-200 leading-normal">{item.label}</span>
                    </NavLink>
                  ))}
                </nav>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-6 flex items-center gap-3 mt-auto bg-white/55 dark:bg-transparent">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-cyan-500 p-0.5 shadow-sm shrink-0">
                    <div className="w-full h-full rounded-[9px] bg-slate-900 flex items-center justify-center font-bold text-white uppercase text-xs overflow-hidden relative">
                      <span className="relative z-10">{profile?.displayName?.slice(0, 2) || 'AD'}</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate tracking-tight">{profile?.displayName || 'Operator'}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide truncate">{getFormattedRole(profile?.role)}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-xl cursor-pointer"
                    title="Keluar"
                  >
                    <LogOut className="w-4.5 h-4.5" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Bottom Navigation (Mobile) */}
        <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white/90 dark:bg-[#0b0f19]/90 backdrop-blur-2xl border-t border-slate-200/50 dark:border-cyan-500/15 py-2.5 px-3 pb-safe flex items-center justify-between z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_32px_rgba(6,182,212,0.06)] max-h-16 transition-all duration-300">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 flex-1 relative rounded-xl h-11 min-w-0",
              isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            <LayoutDashboard className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap truncate max-w-full px-0.5">Dashboard</span>
          </NavLink>

          <NavLink
            to="/worksheets"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 flex-1 relative rounded-xl h-11 min-w-0",
              isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            <FileText className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap truncate max-w-full px-0.5">Lembar Kerja</span>
          </NavLink>

          <NavLink
            to="/ik-assistant"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 flex-1 relative rounded-xl h-11 min-w-0",
              isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            <Wand2 className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap truncate max-w-full px-0.5">Asisten MK</span>
          </NavLink>

          <NavLink
            to="/extractor"
            className={({ isActive }) => cn(
              "flex flex-col items-center justify-center gap-1 flex-1 relative rounded-xl h-11 min-w-0",
              isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            <BrainCircuit className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap truncate max-w-full px-0.5">Ekstraktor</span>
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 flex-1 relative rounded-xl h-11 min-w-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 cursor-pointer"
          >
            <Menu className="w-4.5 h-4.5" />
            <span className="text-[8px] font-bold uppercase tracking-wider whitespace-nowrap truncate max-w-full px-0.5">Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
