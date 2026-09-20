import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Stethoscope, 
  FileText, 
  Award, 
  BookOpen, 
  QrCode, 
  Wrench, 
  Radio, 
  ShieldCheck, 
  Zap, 
  X,
  Compass
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: 'ASSET' | 'WORKSHEET' | 'CERTIFICATE' | 'METHOD' | 'ACTION';
  icon: any;
  path: string;
  badge?: string;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or toggle
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const commands: CommandItem[] = [
    { id: '1', title: 'Defibrillator TEC-5631 (SN: NK-884129)', category: 'ASSET', icon: Stethoscope, path: '/asset-passport/EQ-DEF-2026-089', badge: 'IGD' },
    { id: '2', title: 'Patient Monitor BeneVision N17 (SN: MR-992144)', category: 'ASSET', icon: Stethoscope, path: '/asset-passport/EQ-PAT-2026-112', badge: 'ICU' },
    { id: '3', title: 'Lembar Kerja LK-DEF-2026-0812 (Pending Review)', category: 'WORKSHEET', icon: FileText, path: '/worksheets/LK-DEF-2026-0812/edit', badge: 'Draft' },
    { id: '4', title: 'Sertifikat Kalibrasi SPK/CAL/2026/08-0142', category: 'CERTIFICATE', icon: Award, path: '/certificates/SPK-CAL-0142', badge: 'Valid' },
    { id: '5', title: 'IK Kalibrasi Defibrillator (IK-SPK-DEF-01 Rev 3)', category: 'METHOD', icon: BookOpen, path: '/methods', badge: 'KAN' },
    { id: '6', title: 'Mulai Pengujian Ukes Radiologi BAPETEN', category: 'ACTION', icon: Radio, path: '/ukes-radiology/wizard', badge: 'New' },
    { id: '7', title: 'Buka Studio Label Sticker Thermal', category: 'ACTION', icon: Zap, path: '/thermal-sticker-studio', badge: 'Studio' },
    { id: '8', title: 'Pusat Interoperabilitas Kemenkes SatuSehat', category: 'ACTION', icon: ShieldCheck, path: '/satusehat-hub', badge: 'FHIR' }
  ];

  const filteredCommands = commands.filter(cmd => 
    cmd.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cmd.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="relative border-b border-slate-800 p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            placeholder="Ketik perintah, nama alat, ID sertifikat, atau metode... (ESC untuk tutup)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
          />
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Command Items List */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <div
                  key={cmd.id}
                  onClick={() => handleSelect(cmd.path)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 hover:bg-cyan-500/10 hover:border-cyan-500/30 border border-transparent transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-cyan-400 group-hover:text-cyan-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-cyan-300">{cmd.title}</div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{cmd.category}</div>
                    </div>
                  </div>

                  {cmd.badge && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {cmd.badge}
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Tidak ada perintah atau alat yang cocok dengan kata kunci "{searchTerm}".
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">↑↓</span>
            <span>Navigasi</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">ENTER</span>
            <span>Pilih</span>
          </div>
          <span className="font-mono text-cyan-400">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
