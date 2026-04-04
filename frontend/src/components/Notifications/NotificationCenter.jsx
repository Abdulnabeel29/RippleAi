import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Bell, X, AlertTriangle, Shield, Activity, Clock, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as api from '../../services/api';

import { useNotifications } from '../../hooks/useNotifications';

const NotificationCenter = ({ isOpen, onClose }) => {
  const { notifications, loading, removeNotification, clearAll } = useNotifications();
  const containerRef = useRef(null);

  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      // Small delay to prevent the opening click from immediately closing the panel
      const timeout = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      return () => {
        clearTimeout(timeout);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-4 w-[400px] z-[100] origin-top-right">
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="glass-panel border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden rounded-2xl flex flex-col max-h-[600px]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <Bell size={16} className="text-primary animate-pulse" />
            <h3 className="text-xs font-black mono tracking-[0.2em] text-white uppercase italic">Neural Notifications</h3>
          </div>
          {notifications.length > 0 && (
            <button 
              onClick={clearAll}
              className="text-[10px] font-black mono text-white/30 hover:text-danger uppercase tracking-widest transition-colors flex items-center gap-2"
            >
              <Trash2 size={12} /> Clear All
            </button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 flex flex-col gap-3">
          <AnimatePresence mode="popLayout">
            {loading ? (
              [1, 2].map(i => (
                <div key={i} className="h-24 rounded-xl bg-white/[0.02] border border-white/5 animate-pulse" />
              ))
            ) : notifications.length > 0 ? (
              notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  className={`relative p-4 rounded-xl border border-white/5 bg-white/[0.03] group hover:bg-white/[0.05] transition-colors`}
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${notif.type === 'danger' ? 'bg-danger' : notif.type === 'warning' ? 'bg-warning' : 'bg-primary'} opacity-50`} />
                  
                  <div className="flex gap-4">
                    <div className={`p-2 rounded-lg bg-white/5 border border-white/10 h-fit`}>
                      <notif.icon size={14} className={notif.type === 'danger' ? 'text-danger' : notif.type === 'warning' ? 'text-warning' : 'text-primary'} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] font-black text-white italic tracking-tighter uppercase">{notif.title}</span>
                        <button 
                          onClick={() => removeNotification(notif.id)}
                          className="text-white/20 hover:text-white transition-colors p-1"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed font-medium m-0">
                        {notif.message}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-white/20">
                        <Clock size={10} />
                        <span className="text-[9px] mono font-bold uppercase tracking-widest leading-none">Just Now</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-12 flex flex-col items-center justify-center text-center gap-4 opacity-20"
              >
                <CheckCircle2 size={48} className="text-success" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-black mono uppercase tracking-[0.3em]">System Steady</span>
                  <p className="text-[10px] max-w-[200px]">No critical neural signals requiring operator intervention detected.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex justify-center shrink-0">
           <span className="text-[8px] mono font-black text-white/20 uppercase tracking-[0.5em]">Real-Time Intelligence Feed</span>
        </div>
      </motion.div>
    </div>
  );
};

export default NotificationCenter;
