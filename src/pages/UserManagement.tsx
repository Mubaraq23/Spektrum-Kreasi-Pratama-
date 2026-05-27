import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Search, 
  Shield, 
  Mail, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  User as UserIcon,
  ToggleLeft,
  ToggleRight,
  Copy,
  Check,
  X,
  Users,
  Eye,
  EyeOff
} from 'lucide-react';
import { collection, query, getDocs, updateDoc, doc, deleteDoc, setDoc, where, limit, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import { logAction, pushNotification } from '../lib/auditLogger';

function PasswordCell({ password }: { password?: string }) {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!password) {
    return (
      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200/50 select-none italic">
        🔑 OAuth / Secure SSO
      </span>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-1.5 w-fit shadow-inner">
      <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
        {show ? password : '••••••••'}
      </span>
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="text-slate-400 hover:text-blue-600 transition-colors p-1"
        title={show ? "Sembunyikan Password" : "Tampilkan Password"}
      >
        {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        className="text-slate-400 hover:text-emerald-600 transition-colors p-1 border-l border-slate-200 pl-2"
        title="Salin Password"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const copyInviteLink = () => {
    const url = window.location.origin;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  async function fetchUsers() {
    try {
      const q = collection(db, 'users');
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Hapus user ini?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
      await logAction(
        `Menghapus User Account`,
        'users',
        `Menarik izin akses untuk UID: ${userId}`,
        'critical'
      );
      await pushNotification(
         'Izin Akses Dicabut',
         `Akun anggota tim dengan UID ${userId} telah dinonaktifkan dari sistem.`,
         'error',
         'all',
         '/users'
      );
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      await logAction(
        `Mengubah Peran/Role Pengguna`,
        'users',
        `Perubahan peran pengguna UID: ${userId} menjadi ${newRole}`,
        'warning'
      );
      await pushNotification(
         `Hak Akses Diubah`,
         `Hak akses pengguna dengan UID ${userId} menduduki status: ${newRole}.`,
         'warning',
         'all',
         '/users'
      );
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      alert("Gagal merubah role user.");
    }
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <Shield className="w-16 h-16 text-red-500 mb-4 opacity-20" />
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Akses Dibatasi</h2>
        <p className="text-slate-500 mt-2">Anda memerlukan hak akses Administrator untuk mengelola pengguna.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 px-4 max-w-6xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
           <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-1 bg-blue-600 rounded-full" />
              <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.4em] font-mono">Team Access Control</p>
           </div>
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
                 <Users className="w-8 h-8" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-slate-100 tracking-tighter leading-none lowercase">
                Kelola <span className="text-blue-600 italic">Pengguna</span>
              </h1>
           </div>
           <p className="text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] ml-1">Database Perizinan Personel • Spektrum Security Protocol</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-600/30 active:scale-95"
          >
            <UserPlus className="w-5 h-5" />
            Provision New User
          </button>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search personnel..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
             className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-12 pr-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 w-full md:w-64 shadow-xl shadow-slate-200/50 dark:shadow-none transition-all font-mono italic"
            />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1">
        {loading ? (
          <div className="flex justify-center py-32">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl shadow-slate-200/60 dark:shadow-none transition-all hover:border-blue-200 dark:hover:border-blue-800">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] text-slate-700 dark:text-slate-300 font-black uppercase tracking-[0.3em] font-mono border-b border-slate-100 dark:border-slate-800 italic">
                  <tr>
                    <th className="px-10 py-8">Identitas Pengguna</th>
                    <th className="px-10 py-8">Role / Clearance</th>
                    <th className="px-10 py-8">Connectivity</th>
                    <th className="px-10 py-8">Initial Key / Password</th>
                    <th className="px-10 py-8 text-right">Manajemen Akun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredUsers.map((user) => (
                    <motion.tr 
                      layout
                      key={user.id} 
                      className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all group cursor-default"
                    >
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-6">
                          <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-500/30 transition-all duration-500 shadow-inner italic font-black text-xl">
                            {user.displayName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors uppercase italic">{user.displayName || 'User Tanpa Nama'}</p>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-black tracking-widest uppercase mt-1 font-mono">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <select 
                          value={user.role || 'technician'}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={cn(
                            "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-sm focus:ring-4 focus:ring-blue-500/10 italic",
                            user.role === 'admin' ? "text-red-600 dark:text-red-400 border-red-100 dark:border-red-950/30 bg-red-500/5 dark:bg-red-500/10" : 
                            user.role === 'supervisor' ? "text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-950/30 bg-blue-500/5 dark:bg-blue-500/10" :
                            user.role === 'client' ? "text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-950/30 bg-purple-500/5 dark:bg-purple-550/10" : "text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950/30 bg-emerald-500/5 dark:bg-emerald-500/10"
                          )}
                        >
                          <option value="technician">Teknisi Protocol</option>
                          <option value="supervisor">Lead Supervisor</option>
                          <option value="admin">System Admin</option>
                          <option value="client">Client RS (Hospital)</option>
                        </select>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">Validated Online</span>
                        </div>
                      </td>
                      <td className="px-10 py-6">
                        <PasswordCell password={user.password} />
                      </td>
                      <td className="px-10 py-6 text-right">
                         <button 
                           onClick={() => handleDeleteUser(user.id)}
                           className="p-4 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/50 active:scale-95"
                           title="Hapus User"
                         >
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-32 text-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[3.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-inner">
               <Users className="w-10 h-10 text-slate-200 dark:text-slate-700" />
            </div>
            <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.2em] font-mono italic">No personnel profiles detected in the registry matrix.</p>
          </div>
        )}
      </div>

      <AddUserModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onCopy={copyInviteLink}
        copied={copied}
        onRefresh={fetchUsers}
      />
    </div>
  );
}

function AddUserModal({ isOpen, onClose, onCopy, copied, onRefresh }: any) {
  const [activeTab, setActiveTab] = useState<'invite' | 'manual'>('invite');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'technician',
    hospitalName: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gcpError, setGcpError] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setGcpError(null);

    try {
      if (!formData.email || !formData.password || !formData.displayName || !formData.role) {
        throw new Error('Semua field harus diisi.');
      }

      const emailStandard = formData.email.toLowerCase().trim();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailStandard)) {
        throw new Error('Format alamat email tidak valid.');
      }

      if (formData.password.length < 6) {
        throw new Error('Password (Initial Key) harus memiliki minimal 6 karakter.');
      }

      const q = query(
        collection(db, 'users'),
        where('email', '==', emailStandard),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error('Alamat email tersebut sudah terdaftar.');
      }

      const uid = 'user_' + Math.random().toString(36).substring(2, 15);

      await setDoc(doc(db, 'users', uid), {
        uid,
        email: emailStandard,
        password: formData.password,
        displayName: formData.displayName,
        role: formData.role,
        hospitalName: formData.role === 'client' ? formData.hospitalName : '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSuccess(`User "${formData.displayName}" berhasil dibuat secara manual dengan peran ${formData.role}!`);
      onRefresh();
      
      setTimeout(() => {
        setSuccess('');
        onClose();
        setFormData({ email: '', password: '', displayName: '', role: 'technician', hospitalName: '' });
      }, 2500);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || String(err);
      if (err.code === 'permission-denied') {
        errMsg = 'Akses Ditolak: Aturan Firestore melarang pembuatan user ini. Harap periksa file firestore.rules Anda untuk memastikan akun administrator diizinkan membuat user baru.';
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] shadow-[0_50px_150px_rgba(0,0,0,0.15)] overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="absolute top-0 right-0 p-8 z-10">
               <button onClick={onClose} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm active:scale-95">
                  <X className="w-6 h-6" />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-12 custom-scrollbar">
              <div className="space-y-10">
               <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-6">
                     <UserPlus className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase italic leading-none">Security Provisioning</h2>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 font-black uppercase tracking-widest mt-2 font-mono">Create or Invite Authorized Personnel</p>
               </div>

               <div className="flex bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                 <button 
                  onClick={() => setActiveTab('invite')}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    activeTab === 'invite' ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/10 italic" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                 >
                   Registry Link
                 </button>
                 <button 
                  onClick={() => setActiveTab('manual')}
                  className={cn(
                    "flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                    activeTab === 'manual' ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/10 italic" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                 >
                   Manual Override
                 </button>
               </div>

               <AnimatePresence mode="wait">
                 {activeTab === 'invite' ? (
                   <motion.div 
                    key="invite"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-8"
                   >
                     <section className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] p-8 shadow-inner">
                        <ul className="space-y-6">
                           <li className="flex gap-6 items-start">
                              <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0 text-xs shadow-sm italic">1</span>
                              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed font-medium pt-1 italic"><span className="font-black text-slate-900 dark:text-slate-200 uppercase">Deploy Hub URL</span> and transmit to candidate.</p>
                           </li>
                           <li className="flex gap-6 items-start">
                              <span className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black shrink-0 text-xs shadow-sm italic">2</span>
                              <p className="text-slate-550 dark:text-slate-400 text-sm leading-relaxed font-medium pt-1 italic">Candidate executes <span className="font-black text-slate-900 dark:text-slate-200 uppercase">Authentication Setup</span>.</p>
                           </li>
                        </ul>
                     </section>
 
                     <div className="space-y-4">
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 font-mono italic">Secure Registry URL :</p>
                        <div className="flex gap-3">
                           <input 
                              type="text" 
                              readOnly 
                              value={window.location.origin} 
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-400 dark:text-slate-400 font-mono italic focus:outline-none"
                           />
                           <button 
                              onClick={onCopy}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 font-black text-[10px] uppercase tracking-widest active:scale-95"
                           >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              {copied ? 'Copied' : 'Clone'}
                           </button>
                        </div>
                     </div>
                   </motion.div>
                 ) : (
                   <motion.form 
                    key="manual"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                   >
                      {gcpError && (
                        <div className="p-6 bg-red-50 dark:bg-red-950/20 border border-red-100 rounded-[1.8rem] space-y-4 animate-shake">
                          <div className="flex items-start gap-4 text-red-800 dark:text-red-300">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse text-red-600" />
                            <div className="space-y-1">
                              <h4 className="text-[10px] font-black uppercase tracking-widest font-mono">Google Identity Toolkit Belum Aktif</h4>
                              <p className="text-[11px] text-red-700 dark:text-red-300 leading-relaxed font-semibold">{gcpError.message}</p>
                            </div>
                          </div>
                          
                          <div className="bg-white/80 dark:bg-black/40 p-4 rounded-xl text-[9px] text-[#8a1c1c] dark:text-red-350 font-mono space-y-2 border border-red-100/50 shadow-inner">
                            <p className="font-bold uppercase tracking-wider text-[8px]">Langkah Aktivasi 1-Menit:</p>
                            <ol className="list-decimal pl-4 space-y-1 font-medium text-red-750 dark:text-red-400">
                              <li>Klik tombol biru di bawah ini untuk membuka halaman aktivasi GCP Console.</li>
                              <li>Gunakan akun Google yang sama dengan pengelola database ini.</li>
                              <li>Tekan tombol <span className="font-bold text-red-900 dark:text-red-200">"ENABLE" (Aktifkan)</span> di halaman tersebut.</li>
                              <li>Tunggu <span className="font-bold text-red-900 dark:text-red-200">1 - 2 menit</span> agar sinkronisasi Google Cloud selesai, lalu klik simpan lagi.</li>
                            </ol>
                          </div>
                          
                          <a 
                            href={gcpError.activationUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full inline-flex items-center justify-center gap-2 bg-[#2e5bff] hover:bg-[#1a44db] text-white text-[9px] font-black uppercase tracking-widest py-3.5 px-6 rounded-xl shadow-lg shadow-blue-500/10 transition-all font-mono active:scale-[0.98] text-center no-underline"
                          >
                            Buka Console &amp; Aktifkan Layanan
                          </a>

                          <div className="text-[7px] text-red-400 font-mono text-center max-h-16 overflow-y-auto italic cursor-help whitespace-normal select-all bg-red-100/30 dark:bg-[#180a0a] p-2 rounded-lg border border-red-100/50">
                            <span>Diagnostic Detail: {gcpError.details}</span>
                          </div>
                        </div>
                      )}
                     {success && (
                       <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-800 text-[10px] font-black uppercase tracking-widest italic font-mono">
                         <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 animate-pulse" />
                         <span>{success}</span>
                       </div>
                     )}
                     {error && (
                       <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-black uppercase tracking-widest italic animate-shake">
                         <AlertCircle className="w-5 h-5" />
                         {error}
                       </div>
                     )}
                     <div className="space-y-5">
                       <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 italic font-mono">Full Display Name</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Maverick Mitchell" 
                          required
                          value={formData.displayName}
                          onChange={e => setFormData({...formData, displayName: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono italic"
                        />
                       </div>
                       <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 italic font-mono">Registry Email</label>
                        <input 
                          type="email" 
                          placeholder="personnel@spektrum.tech" 
                          required
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono italic"
                        />
                       </div>
                       <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 italic font-mono">Initial Encryption Key</label>
                        <input 
                          type="password" 
                          placeholder="••••••••" 
                          required
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono"
                        />
                       </div>
                       <div className="space-y-4">
                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 italic font-mono">Clearance Protocol</label>
                        <select 
                          value={formData.role}
                          onChange={e => setFormData({...formData, role: e.target.value})}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-black text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none uppercase tracking-widest text-[10px] italic appearance-none"
                        >
                          <option value="technician">Field Technician</option>
                          <option value="supervisor">Lead Supervisor</option>
                          <option value="admin">System Administrator</option>
                          <option value="client">Client RS (Hospital)</option>
                        </select>
                       </div>
                       {formData.role === 'client' && (
                         <div className="space-y-4">
                           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1 italic font-mono font-bold text-indigo-600 dark:text-cyan-400">Nama Rumah Sakit / Instansi</label>
                           <input 
                             type="text" 
                             placeholder="e.g. RS Siloam, RS Premier Bintaro, etc." 
                             required
                             value={formData.hospitalName}
                             onChange={e => setFormData({...formData, hospitalName: e.target.value})}
                             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white dark:focus:bg-slate-900 transition-all font-mono italic"
                           />
                         </div>
                       )}
                     </div>
                     <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-6 bg-blue-600 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest flex items-center justify-center gap-4 shadow-xl shadow-blue-500/30 transition-all active:scale-95"
                     >
                       {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Shield className="w-6 h-6" />}
                       Finalize Provisioning
                     </button>
                   </motion.form>
                 )}
               </AnimatePresence>

               <button 
                  onClick={onClose}
                  className="w-full py-2 text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest transition-all italic font-mono"
               >
                  Decline Provisioning Process
               </button>
            </div>
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
