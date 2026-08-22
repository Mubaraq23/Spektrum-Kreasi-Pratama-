import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Lock } from 'lucide-react';
import { evaluateModalityScopeGate } from '../../lib/ukes/ukesScopeEngine';

interface ScopeVerificationGateProps {
  modalityId: string;
  modalityName: string;
}

export function ScopeVerificationGate({ modalityId, modalityName }: ScopeVerificationGateProps) {
  const gate = evaluateModalityScopeGate(modalityId);

  return (
    <div className={`p-5 rounded-3xl border ${
      gate.canIssueCertificate 
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : gate.scopeStatus === 'OUT_OF_SCOPE'
        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
    }`}>
      <div className="flex items-start gap-4">
        <div className="p-3 bg-slate-900/60 rounded-2xl shrink-0 mt-0.5">
          {gate.canIssueCertificate ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          ) : gate.scopeStatus === 'OUT_OF_SCOPE' ? (
            <Lock className="w-6 h-6 text-rose-400" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400" />
          )}
        </div>

        <div className="space-y-1 font-mono text-xs flex-1">
          <div className="flex items-center justify-between">
            <span className="font-black uppercase tracking-wider text-sm">
              {gate.displayNoticeTitle} — {modalityName}
            </span>
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              gate.canIssueCertificate 
                ? 'bg-emerald-500 text-slate-950' 
                : 'bg-rose-500 text-white'
            }`}>
              {gate.scopeStatus}
            </span>
          </div>

          <p className="font-sans text-xs opacity-90 leading-relaxed">
            {gate.displayNoticeMessage}
          </p>

          {!gate.canIssueCertificate && (
            <div className="pt-2 flex items-center gap-2 text-[11px] font-bold text-rose-400 uppercase">
              <XCircle className="w-4 h-4" /> Penerbitan Sertifikat Uji Kesesuaian DIBLOKIR Otomatis oleh Scope Engine.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
