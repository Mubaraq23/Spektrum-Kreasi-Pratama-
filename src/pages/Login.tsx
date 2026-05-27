import React, { useState } from 'react';
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck, Zap, Mail, Lock, LogIn, UserPlus, AlertCircle,
  Sparkles, Check, ArrowLeft, RefreshCw, Eye, EyeOff,
  ChevronRight, Activity, Sun, Moon, ArrowRight
} from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Logo } from '../components/Logo';

const FEATURES = [
  { icon: ShieldCheck, text: 'ISO/IEC 17025 Certified', color: 'text-emerald-400' },
  { icon: Zap, text: 'Auto-Calculate U95 (k=2)', color: 'text-cyan-400' },
  { icon: Activity, text: 'Real-time Sync Database', color: 'text-blue-400' },
];

export function Login() {
  const { user, loading, login, register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" />;

  const handleProfileSync = async (authUser: any, nameStr?: string) => {
    try {
      const docRef = doc(db, 'users', authUser.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, {
          uid: authUser.uid,
          email: authUser.email,
          displayName: nameStr || authUser.displayName || authUser.email?.split('@')[0],
          role: 'technician',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        const payload: any = { updatedAt: serverTimestamp() };
        const newName = nameStr || authUser.displayName;
        if (newName) payload.displayName = newName;
        await updateDoc(docRef, payload);
      }
    } catch (e) {
      console.warn('Profile sync skipped:', e);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setAuthLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, provider);
      await handleProfileSync(result.user);
      navigate('/dashboard');
    } catch (error: any) {
      setError('Koneksi Google bermasalah atau otorisasi dibatalkan.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setAuthLoading(true);
    setError('');
    setResetSuccess('');
    try {
      if (isForgotPassword) {
        setResetSuccess('Silakan hubungi administrator Spektrum CalibraPro untuk me-reset sandi akun secara manual.');
        setIsForgotPassword(false);
      } else if (isRegistering) {
        if (!password) return;
        await register(email, password, fullName);
        navigate('/dashboard');
      } else {
        if (!password) return;
        await login(email, password);
        navigate('/dashboard');
      }
    } catch (error: any) {
      const msg = error.message || String(error);
      if (msg.includes('Kredensial salah') || msg.includes('tidak terdaftar')) {
        setError('Kredensial salah atau tidak terdaftar. Periksa kembali email dan sandi Anda.');
      } else if (msg.includes('sudah terdaftar')) {
        setError('Email tersebut sudah terdaftar di database Spektrum CalibraPro.');
      } else {
        setError('Gagal membangun koneksi aman: ' + msg);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const formTitle = isForgotPassword ? 'Reset Akses' : isRegistering ? 'Buat Akun Baru' : 'Masuk Portal';
  const formSub = isForgotPassword
    ? 'Masukkan email Anda untuk pemulihan hak akses'
    : isRegistering
    ? 'Daftarkan kredensial laboratorium baru'
    : 'Autentikasi untuk mengakses sistem kalibrasi';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-[#030612]">

      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="hidden lg:flex flex-col w-[55%] xl:w-[60%] relative overflow-hidden bg-gradient-to-br from-[#071030] via-[#0a1a4a] to-[#050c28]">
        
        {/* Background effects */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[150px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute top-0 bottom-0 w-px bg-blue-400/20" style={{ left: `${(i + 1) * 12.5}%` }} />
          ))}
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute left-0 right-0 h-px bg-blue-400/20" style={{ top: `${(i + 1) * 16.66}%` }} />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <span className="text-xl font-black text-white uppercase tracking-widest italic">SPEKTRUM</span>
            </Link>
          </div>

          {/* Hero Text */}
          <div className="flex-1 flex flex-col justify-center max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 mb-8">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
              <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em] font-mono">Enterprise Lab Console v4.5</span>
            </div>

            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.05] tracking-tight uppercase mb-6">
              Metrologi<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400">
                Kalibrasi
              </span><br />
              Digital
            </h1>

            <p className="text-slate-400 text-base leading-relaxed font-medium mb-10 max-w-sm">
              Platform kalibrasi alat kesehatan berstandar <strong className="text-white">KAN & Kemenkes RI</strong> dengan perhitungan U95 otomatis dan Gemini AI.
            </p>

            {/* Feature list */}
            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom note */}
          <div className="mt-auto pt-8 border-t border-white/10">
            <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-slate-600 font-mono">
              <span>AES-256 Encryption</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <span>ISO/IEC 17025</span>
              <span className="w-1 h-1 bg-slate-700 rounded-full" />
              <span>KAN Accredited</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL — Form ===== */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-16 relative">

        {/* Theme toggle & Back to Landing */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        <Link to="/" className="absolute top-6 left-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors font-mono">
          <ArrowLeft className="w-4 h-4" /> Beranda
        </Link>

        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Logo className="text-slate-900 dark:text-white max-w-[200px]" />
        </div>

        <div className="w-full max-w-[400px]">
          
          {/* Form Header */}
          <AnimatePresence mode="wait">
            <motion.div key={formTitle} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{formTitle}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 font-medium">{formSub}</p>
            </motion.div>
          </AnimatePresence>

          {/* Error/Success Alerts */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-2xl mb-5 text-xs text-red-700 dark:text-red-300 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                {error}
              </motion.div>
            )}
            {resetSuccess && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl mb-5 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
                <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                {resetSuccess}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isForgotPassword ? 'forgot' : isRegistering ? 'register' : 'login'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleEmailAuth}
              className="space-y-4"
            >
              {/* Full Name (register only) */}
              {!isForgotPassword && isRegistering && (
                <div className="relative group">
                  <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text" placeholder="Nama Lengkap" value={fullName}
                    onChange={e => setFullName(e.target.value)} required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-5 py-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              )}

              {/* Email */}
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email" placeholder="Alamat Email" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-5 py-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {/* Password */}
              {!isForgotPassword && (
                <div className="space-y-2">
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Kata Sandi" value={password}
                      onChange={e => setPassword(e.target.value)} required
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl pl-12 pr-12 py-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all font-medium"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {!isRegistering && (
                    <div className="text-right">
                      <button type="button" onClick={() => { setIsForgotPassword(true); setError(''); }}
                        className="text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors cursor-pointer">
                        Lupa kata sandi?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit" disabled={authLoading}
                className="w-full h-13 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-sm uppercase tracking-wider cursor-pointer"
              >
                {authLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : isForgotPassword ? (
                  <><RefreshCw className="w-4 h-4" /> Kirim Tautan Pemulihan</>
                ) : isRegistering ? (
                  <><UserPlus className="w-4 h-4" /> Buat Akun</>
                ) : (
                  <><LogIn className="w-4 h-4" /> Masuk</>
                )}
              </button>

              {/* Toggle register/forgot */}
              {isForgotPassword ? (
                <button type="button" onClick={() => { setIsForgotPassword(false); setError(''); }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold transition-colors py-1 cursor-pointer">
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Login
                </button>
              ) : (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  {isRegistering ? 'Sudah punya akun?' : 'Belum punya akun?'}{' '}
                  <button type="button" onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
                    className="text-blue-600 dark:text-blue-400 font-black hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer">
                    {isRegistering ? 'Masuk di sini' : 'Daftar sekarang'}
                  </button>
                </p>
              )}
            </motion.form>
          </AnimatePresence>

          {/* Divider + Google SSO */}
          {!isForgotPassword && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-slate-50 dark:bg-[#030612] text-[10px] uppercase tracking-[0.3em] text-slate-400 font-black font-mono">
                    atau lanjutkan dengan
                  </span>
                </div>
              </div>

              <button
                type="button" onClick={handleGoogleLogin} disabled={authLoading}
                className="w-full py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all shadow-sm hover:shadow-md text-sm cursor-pointer"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4 rounded-sm" alt="Google" />
                Masuk dengan Google
              </button>
            </>
          )}

          {/* Footer note */}
          <p className="text-center text-[10px] text-slate-400 mt-8 leading-relaxed">
            Dengan masuk, Anda menyetujui{' '}
            <span className="text-blue-500 cursor-pointer">Kebijakan Privasi</span>{' '}
            dan{' '}
            <span className="text-blue-500 cursor-pointer">Syarat Penggunaan</span>{' '}
            PT Spektrum Kreasi Pratama.
          </p>
        </div>
      </div>
    </div>
  );
}
