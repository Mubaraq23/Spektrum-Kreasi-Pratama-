import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  X, 
  Sparkles,
  ChevronDown,
  Loader2,
  BrainCircuit,
  Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { 
          role: 'assistant', 
          text: 'Halo! Saya Asisten Metrologi AI. Ada yang bisa saya bantu terkait kalibrasi, metode kerja, atau standar alat kesehatan?' 
        }
      ]);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = { role: 'user', text: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/metrology-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg.text,
          history: messages.slice(-5).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.text }]
          }))
        })
      });

      const data = await response.json();
      if (data.result) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.result }]);
      } else {
        throw new Error('Gagal mendapatkan respon AI');
      }
    } catch (error) {
      console.error('AI Error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: 'Maaf, terjadi kesalahan koneksi dengan sistem AI. Silakan coba lagi nanti.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="w-80 sm:w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden pointer-events-auto flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white backdrop-blur-md">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[11px] font-black text-white uppercase tracking-widest italic leading-none">Metrology AI</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse"></div>
                    <span className="text-[8px] text-blue-100 font-bold uppercase tracking-widest">Cognitive Engine v3.0</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-white/70 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar-dark"
            >
              {messages.map((msg, idx) => (
                <div key={idx} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.role === 'user' ? "ml-auto items-end" : "items-start"
                )}>
                  <div className={cn(
                    "p-4 rounded-3xl text-[11px] leading-relaxed",
                    msg.role === 'user' 
                      ? "bg-blue-600 text-white rounded-tr-none shadow-lg shadow-blue-500/10" 
                      : "bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700"
                  )}>
                    <div className="markdown-body prose prose-invert prose-sm max-w-none">
                      <Markdown>{msg.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-2 max-w-[85%]">
                   <div className="bg-slate-800 border border-slate-700 p-4 rounded-3xl rounded-tl-none flex items-center gap-3">
                      <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Analisa Data...</span>
                   </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <div className="p-6 bg-slate-900 border-t border-slate-800">
              <form onSubmit={handleSend} className="relative">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanyakan sesuatu tentang metrologi..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl pl-5 pr-14 py-4 text-[11px] text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-500 font-bold"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 active:scale-95"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="mt-4 flex flex-wrap gap-2">
                 <button 
                  onClick={() => setInput('Apa itu k=2 dalam ketidakpastian?')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest transition-all"
                 >
                   ± U95 k=2?
                 </button>
                 <button 
                  onClick={() => setInput('Saran metode kerja Tensimeter')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-widest transition-all"
                 >
                   MK Tensimeter
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05, rotate: 5 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-16 w-16 rounded-[1.8rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative pointer-events-auto transition-all group overflow-hidden",
          isOpen ? "bg-white" : "bg-gradient-to-br from-indigo-600 to-blue-700"
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-7 h-7 text-slate-900" />
        ) : (
          <>
            <div className="absolute inset-0 bg-blue-400/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500" />
            <BrainCircuit className="w-7 h-7 text-white relative z-10" />
            <div className="absolute -top-1 -right-1">
               <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" />
            </div>
          </>
        )}
      </motion.button>
    </div>
  );
}
