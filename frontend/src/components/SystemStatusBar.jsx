import React, { useState, useEffect } from 'react';
import { Wifi, Clock, Server } from 'lucide-react';
import { motion } from 'framer-motion';

const SystemStatusBar = ({ loading, error }) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center px-6 py-2 bg-background border-b border-white/5 text-[13px] text-muted-foreground select-none">
      <div className="flex items-center gap-3">
        <Server size={14} className="text-muted-foreground" />
        <span className="font-medium">Intelligence Core</span>
      </div>
      
      <div className="flex items-center gap-3">
        {error ? (
          <div className="flex items-center gap-1.5 font-medium text-danger">
            <Wifi size={14} /> Disconnected
          </div>
        ) : loading ? (
          <div className="flex items-center gap-1.5 font-medium text-warning">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="w-3 h-3 rounded-full border-2 border-transparent border-t-warning"
            />
            Syncing
          </div>
        ) : (
          <div className="flex items-center gap-1.5 font-medium text-success">
            <Wifi size={14} /> Live
          </div>
        )}
        <div className="w-px h-3 bg-border"></div>
        <div className="flex items-center gap-1.5 font-medium">
          <Clock size={14} /> {time}
        </div>
      </div>
    </div>
  );
};

export default SystemStatusBar;
