import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  User, 
  Mail, 
  Shield, 
  Check, 
  AlertCircle, 
  Loader2, 
  Lock, 
  Settings2, 
  FileCheck, 
  Award,
  Zap
} from 'lucide-react';
import { logAction } from '../lib/auditLogger';

export function Settings() {
  const { profile, user } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !user) return;

    setUpdating(true);
    setSuccess('');
    setError('');

    try {
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        displayName,
        updatedAt: new Date()
      });

      await logAction('Memperbarui Profil', 'Sistem', `Mengubah nama tampilan operator menjadi "${displayName}"`, 'info');
      setSuccess('Profil berhasil diperbarui secara real-time!');
    } catch (err: any) {
      console.error(err);
      setError('Gagal memperbarui profil: ' + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const currentRoleName = () => {
    switch(profile?.role) {
      case 'admin': return 'Administrator Utama';
      case 'supervisor': return 'Supervisor Laboratorium';
      case 'technician': return 'Teknisi Metrologi';
      case 'management': return 'Manajemen Eksekutif';
      default: return 'Operator';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-1 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full" />
          <p className="text-[10px] text-blue-600 dark:text-cyan-400 font-extrabold uppercase tracking-[0.35em] font-mono">Pengaturan Sistem</p>
        </div>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-slate-900 dark:text-white leading-none uppercase">
          Profil & Otoritas ⚙️
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs mt-2 font-semibold">
          Kelola nama penguji, hak akses, dan kepatuhan operator LK PT Spektrum Kreasi Pratama.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#080d22] border border-slate-200/60 dark:border-slate-800 p-8 rounded-[2.5rem] text-center relative overflow-hidden shadow-lg shadow-slate-100/40 dark:shadow-none">
            <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-600 to-cyan-500" />
            
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-700 p-1 rounded-full mx-auto mb-6 shadow-xl shadow-blue-500/20">
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-full flex items-center justify-center font-black text-blue-600 dark:text-cyan-400 uppercase text-3xl italic">
                {profile?.displayName?.[0] || 'U'}
              </div>
            </div>

            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
              {profile?.displayName || 'Operator'}
            </h2>
            <p className="text-[9px] text-blue-600 dark:text-cyan-400 font-bold uppercase tracking-[0.2em] mt-1 font-mono">
              ROLE: {profile?.role?.toUpperCase() || 'CORE'}
            </p>

            <div className="h-[1px] bg-slate-100 dark:bg-slate-800/80 my-6" />

            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>{currentRoleName()}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                <Lock className="w-4 h-4 text-slate-400" />
                <span className="font-mono">ID: {user?.uid.slice(0, 10)}...</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-900/10 to-indigo-900/10 dark:from-sky-950/20 dark:to-blue-950/20 border border-blue-105/20 dark:border-sky-900/30 p-8 rounded-[2.5rem] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-5 opacity-5">
              <Award className="w-24 h-24 text-blue-600" />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <Zap className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white font-mono">Standar Akreditasi</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Seluruh rekam data digital LK terenkripsi AES-256 dan dilindungi otorisasi tanda tangan bersertifikat, mematuhi standar ISO/IEC 17025 KAN PT Spektrum Kreasi Pratama, LK-291-IDN & LP-1849-IDN.
            </p>
          </div>
        </div>

        {/* Right Column: Update Credentials Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#080d22] border border-slate-200/60 dark:border-slate-800 p-8 md:p-10 rounded-[2.5rem] shadow-lg shadow-slate-100/40 dark:shadow-none">
            <div className="flex items-center gap-3 mb-8">
              <Settings2 className="w-5 h-5 text-blue-600 dark:text-cyan-400" />
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight font-mono">Informasi Identitas Operator</h2>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {error && (
                <div className="p-4 bg-red-955/20 border border-red-900/40 text-red-500 rounded-2xl flex items-start gap-3.5 text-xs font-bold leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-start gap-3.5 text-xs font-bold leading-relaxed">
                  <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">E-mail Akses (Permanen)</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={user?.email || ''} 
                      disabled 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-slate-400 cursor-not-allowed font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Otorisasi Hak Akses (Role)</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={currentRoleName()} 
                      disabled 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-slate-400 cursor-not-allowed font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2.5 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 font-mono ml-1">Nama Lengkap Auditor / Laboran</label>
                  <div className="relative group/input">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-cyan-400 transition-colors" />
                    <input 
                      type="text" 
                      required
                      placeholder="Masukkan nama lengkap Anda..."
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-slate-950/10 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl pl-12 pr-6 py-4 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-cyan-400 transition-all font-black uppercase tracking-widest"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={updating}
                  className="px-8 h-14 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-black text-[10px] uppercase tracking-[0.25em] rounded-2xl flex items-center justify-center gap-3 transition-all transform active:scale-98 shadow-md shadow-blue-500/10"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mencatat Perubahan...
                    </>
                  ) : (
                    <>
                      <FileCheck className="w-4 h-4" />
                      Simpan Profil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
