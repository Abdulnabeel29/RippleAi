import React from 'react';
import { Clock, MapPin, ChevronRight, Activity } from 'lucide-react';
import { Card } from '../ui/card';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

const EventFeed = ({ events, onEventSelect, selectedEventId }) => {
  if (!events) return (
    <Card className="flex flex-col gap-4 p-4 min-h-[300px] border-border bg-card shadow-lg flex-[2] opacity-60">
      <div className="h-6 w-1/3 rounded bg-muted/20 animate-pulse" />
      <div className="h-20 w-full rounded bg-muted/10 animate-pulse" />
      <div className="h-20 w-full rounded bg-muted/10 animate-pulse" />
    </Card>
  );

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="text-xl font-bold text-white tracking-tight m-0">Signal Feed</h3>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-success rounded-full animate-pulse"></div>
          <span className="text-[10px] mono text-slate-500 uppercase tracking-widest">Live Stream ({events.length})</span>
        </div>
      </div>

      <div className="bg-[#151c25] rounded-sm border border-white/5 overflow-hidden flex flex-col relative w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 p-6 bg-transparent">
        {events.map((evt, idx) => {
          const isSelected = selectedEventId === evt.id;
          const severityClass = evt.severity.toLowerCase();

          const getStripStyles = (sev) => {
            switch (sev) {
              case 'high': return 'bg-danger shadow-[0_0_12px_var(--danger-color)]';
              case 'medium': return 'bg-warning shadow-[0_0_12px_var(--warning-color)]';
              default: return 'bg-low';
            }
          };

          return (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01 }}
            >
              <div
                onClick={() => onEventSelect(evt)}
                className={`
                  group cursor-pointer flex items-center gap-4 py-3 pr-3 pl-5 rounded-sm border transition-all duration-200 relative overflow-hidden
                  ${isSelected ? 'bg-[#2e353f] border-white/20' : 'bg-transparent border-transparent hover:bg-[#2e353f]/50 hover:border-white/10'}
                `}
              >
                {/* Left Color Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${getStripStyles(severityClass)}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-white tracking-tight">
                      {evt.event_type}
                    </span>
                    <span className="mono text-[9px] text-slate-500 mt-1">
                      {evt.detected_at ? formatDistanceToNow(new Date(evt.detected_at + 'Z')).replace('about ', '').replace(' hours', 'h').replace(' minutes', 'm') + ' ago' : 'Live'}
                    </span>
                  </div>

                  <p className="text-[12px] text-slate-300 font-medium mb-1.5 truncate m-0">
                    {evt.summary}
                  </p>

                  <div className="flex gap-4 mono text-[9px] text-slate-500">
                    <span className="flex items-center gap-1">
                      {evt.location.toUpperCase()}
                    </span>
                    <span className="text-secondary/70 font-bold">
                      CONF: {(evt.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className={`transition-all duration-200 ${isSelected ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100 group-hover:text-primary'} scale-75`}>
                  <ChevronRight size={18} />
                </div>
              </div>
            </motion.div>
          );
        })}
        {events.length === 0 && (
          <div className="p-6 text-center text-sm italic text-muted-foreground">
            No matching signals found.
          </div>
        )}
        </div>
        <div className="p-3 bg-[#2e353f]/20 border-t border-white/5 flex justify-center">
          <button className="text-[9px] mono text-primary hover:underline uppercase tracking-tighter bg-transparent border-none cursor-pointer">View Master Logs</button>
        </div>
      </div>
    </div>
  );
};

export default EventFeed;
