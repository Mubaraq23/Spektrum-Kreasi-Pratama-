import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  MessageCircle, 
  User, 
  ShieldCheck,
  Clock,
  ChevronDown,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

export function Chat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { user, profile } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).reverse();
      
      setMessages(msgs);
      
      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return () => unsubscribe();
  }, [user, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, isMinimized]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: profile.displayName || user.email,
        senderRole: profile.role,
        createdAt: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
      setIsMinimized(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
            <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? '60px' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto transition-all duration-300",
              isMinimized && "h-[60px]"
            )}
          >
            {/* Chat Header */}
            <div className="bg-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-widest italic">Kolaborasi Tim</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
                    <span className="text-[9px] text-blue-100 font-bold uppercase tracking-tighter">Live Sync Active</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                  {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={toggleChat}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 h-[370px] overflow-y-auto p-5 space-y-4 scroll-smooth bg-slate-50/50"
                >
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                      <MessageSquare className="w-12 h-12 mb-2 text-slate-300" />
                      <p className="text-[10px] uppercase font-black tracking-widest text-slate-400">Belum ada percakapan</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isMe = msg.senderId === user?.uid;
                      return (
                        <div key={msg.id} className={cn("flex flex-col", isMe ? "items-end" : "items-start")}>
                          <div className={cn(
                            "max-w-[85%] rounded-[1.5rem] p-4 text-sm flex flex-col gap-1 shadow-sm",
                            isMe 
                              ? "bg-blue-600 text-white rounded-tr-none" 
                              : "bg-white text-slate-900 border border-slate-100 rounded-tl-none"
                          )}>
                            {!isMe && (
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[9px] font-black uppercase text-blue-600">{msg.senderName}</span>
                                {msg.senderRole === 'admin' && <ShieldCheck className="w-3 h-3 text-amber-500" />}
                              </div>
                            )}
                            <p className="leading-relaxed font-medium text-xs">{msg.text}</p>
                            <span className={cn(
                              "text-[8px] mt-2 font-black uppercase tracking-tighter opacity-70 self-end font-mono",
                              isMe ? "text-white/80" : "text-slate-400"
                            )}>
                              {msg.createdAt && typeof msg.createdAt.toDate === 'function' 
                                ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) 
                                : 'sending...'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Input Area */}
                <form 
                  onSubmit={handleSendMessage}
                  className="p-4 border-t border-slate-100 bg-white"
                >
                  <div className="relative group">
                    <input 
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Tulis pesan..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-12 py-3 text-xs text-slate-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium"
                    />
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 disabled:bg-slate-200 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleChat}
        className={cn(
          "h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl relative pointer-events-auto transition-all group",
          isOpen ? "bg-slate-900" : "bg-blue-600 shadow-xl shadow-blue-500/30"
        )}
      >
        {isOpen ? (
          <ChevronDown className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border-2 border-white shadow-xl animate-bounce">
                {unreadCount}
              </span>
            )}
          </div>
        )}
      </motion.button>
    </div>
  );
}
