import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getPendingOfflineWorksheets, markWorksheetSynced, OfflineWorksheet } from '../lib/offlineStore';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function OfflineSyncBar() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingItems, setPendingItems] = useState<OfflineWorksheet[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchPending = async () => {
    try {
      const items = await getPendingOfflineWorksheets();
      setPendingItems(items);
    } catch (err) {
      console.error('Error fetching pending offline items:', err);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline || pendingItems.length === 0 || isSyncing) return;
    setIsSyncing(true);

    try {
      for (const item of pendingItems) {
        if (item.data && item.id) {
          const docRef = doc(db, 'worksheets', item.id);
          await setDoc(docRef, {
            ...item.data,
            updatedAt: serverTimestamp(),
            syncedFromOffline: true
          }, { merge: true });
          await markWorksheetSynced(item.id);
        }
      }
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
      await fetchPending();
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingItems.length === 0 && !syncSuccess) {
    return null; // Hidden when online and zero pending items
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-4 bg-slate-900/90 dark:bg-[#090d16]/95 backdrop-blur-2xl border border-slate-700/60 dark:border-cyan-500/30 text-white px-5 py-3.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] font-sans"
      >
        <div className="flex items-center gap-3">
          {isOnline ? (
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wifi className="w-4 h-4" />
            </div>
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 animate-pulse">
              <WifiOff className="w-4 h-4" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-200">
                {isOnline ? 'Terhubung Ke Jaringan' : 'Mode Terpisah (Offline)'}
              </span>
              {!isOnline && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-[8px] font-black uppercase tracking-widest rounded-md border border-amber-500/30">
                  Lokal PWA
                </span>
              )}
            </div>
            <p className="text-[9.5px] text-slate-400 font-medium">
              {pendingItems.length > 0
                ? `${pendingItems.length} lembar kerja menunggu sinkronisasi`
                : isOnline ? 'Seluruh data tersinkron sempurna' : 'Tersimpan aman di IndexedDB perangkat'}
            </p>
          </div>
        </div>

        {pendingItems.length > 0 && isOnline && (
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-[10px] uppercase tracking-widest px-4 py-2.5 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CloudUpload className="w-3.5 h-3.5" />
            )}
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>
        )}

        {syncSuccess && (
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
            <span>Tersinkron!</span>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
