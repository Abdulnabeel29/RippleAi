import React, { useEffect, useState } from 'react';
import { Activity, Network, Layers, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import DecisionPanel from '../Intelligence/DecisionPanel';

const ImpactSimulationView = ({ event, simulationData, onClose }) => {
  const [activeDepth, setActiveDepth] = useState(0);

  useEffect(() => {
    if (!simulationData || !event) return;
    
    setActiveDepth(0);
    const maxDepth = Math.max(0, ...simulationData.map(d => d.depth));
    
    let current = 0;
    const interval = setInterval(() => {
      if (current <= maxDepth) {
        current += 1;
        setActiveDepth(current);
      } else {
        clearInterval(interval);
      }
    }, 1200);
    
    return () => clearInterval(interval);
  }, [simulationData, event]);

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1400px] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-background border-primary/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        {/* Header Panel */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-primary/20 bg-card/50 backdrop-blur-md z-20">
          <div>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl tracking-wide text-white font-semibold">
                <Activity className="text-danger" size={24} /> 
                RIPPLE SIMULATION: {event?.event_type}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Epicenter: <span className="text-white font-medium">{event?.location}</span> • Confidence: {(event?.confidence_score * 100).toFixed(0)}%
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex gap-6">
            <div className="flex items-center gap-3 bg-muted/20 border border-muted/30 px-5 py-2.5 rounded-lg text-primary">
              <Layers size={20} />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white leading-none">{activeDepth}</span>
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground mt-0.5">CASCADE DEPTH</span>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/20 border border-muted/30 px-5 py-2.5 rounded-lg text-primary">
              <Network size={20} />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white leading-none">
                  {simulationData ? simulationData.filter(d => d.depth <= activeDepth).length : 0}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-muted-foreground mt-0.5">AFFECTED NODES</span>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout area */}
        <div className="flex-1 relative overflow-hidden flex w-full h-full">
          
          {/* Left Canvas (Graph) */}
          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_center,#1b2129_0%,#080a0f_100%)] border-r border-primary/20">
          {/* Subtle Grid dots */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(88,166,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(88,166,255,0.05)_1px,transparent_1px)] [background-size:60px_60px]" />
          
          {/* Epicenter */}
          {event && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
              <motion.div 
                animate={{ scale: [1, 1.15, 1], boxShadow: ["0 0 40px var(--danger-color)", "0 0 80px var(--danger-color)", "0 0 40px var(--danger-color)"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-14 h-14 rounded-full bg-danger z-21 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)]"
              />
              <div className="mt-4 px-4 py-2 bg-card/90 border border-danger text-white font-bold rounded-full shadow-lg z-21">
                {event.location}
              </div>
            </div>
          )}

          {/* Radial Expanding Rings */}
          <AnimatePresence>
            {[1, 2, 3].map((depth) => (
              activeDepth >= depth && (
                <motion.div
                  key={`ring-${depth}`}
                  initial={{ width: 0, height: 0, opacity: 0 }}
                  animate={{ 
                    width: depth * 400 + 100, 
                    height: depth * 400 + 100, 
                    opacity: 1 
                  }}
                  transition={{ duration: 1.2, ease: [0.19, 1, 0.22, 1] }}
                  className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border z-[1] pointer-events-none 
                    ${depth === 1 ? 'border-danger/40 bg-danger/5' : 
                      depth === 2 ? 'border-warning/30 bg-warning/5' : 
                      'border-primary/20 bg-primary/5'}`}
                />
              )
            ))}
          </AnimatePresence>

          {/* Render Radial Nodes & Links */}
          {activeDepth > 0 && simulationData && (
            <div className="absolute inset-0">
              <AnimatePresence>
                {simulationData.filter(d => d.depth <= activeDepth).map((node, i) => {
                  const angle = (i * 137.5) * (Math.PI / 180); // Golden angle distribution
                  const radius = node.depth * 200 + 50; 
                  
                  return (
                    <React.Fragment key={i}>
                      {/* Animated Link */}
                      <svg className="absolute inset-0 w-full h-full pointer-events-none z-[2]">
                        <motion.line 
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 0.6 }}
                          transition={{ duration: 1 }}
                          x1="50%" y1="50%" 
                          x2={`calc(50% + ${Math.cos(angle) * (radius - 20)}px)`} 
                          y2={`calc(50% + ${Math.sin(angle) * (radius - 20)}px)`} 
                          className={`stroke-2 stroke-dasharray-[4] ${
                            node.depth === 1 ? 'stroke-danger' : 
                            node.depth === 2 ? 'stroke-warning' : 'stroke-low'
                          }`}
                        />
                      </svg>
                      
                      {/* Rendered Node */}
                      <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: node.depth * 0.2 + (i % 3) * 0.1, type: "spring" }}
                        whileHover={{ scale: 1.1, zIndex: 30, boxShadow: "0 8px 30px rgba(88,166,255,0.3)" }}
                        className={`absolute top-1/2 left-1/2 flex items-center gap-3 px-4 py-2.5 rounded-full border bg-card/95 text-primary-foreground shadow-lg cursor-pointer z-[10] 
                          ${node.depth === 1 ? 'border-danger/80' : 
                            node.depth === 2 ? 'border-warning/60' : 'border-low/60'}`}
                        style={{ 
                          transform: `translate(calc(-50% + ${Math.cos(angle) * radius}px), calc(-50% + ${Math.sin(angle) * radius}px))` 
                        }}
                      >
                        <Share2 size={14} className={node.depth === 1 ? 'text-danger' : node.depth === 2 ? 'text-warning' : 'text-muted-foreground'} />
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-white whitespace-nowrap">{node.target}</span>
                          <span className="text-[11px] font-medium text-primary">Impact: {(node.impact * 100).toFixed(0)}%</span>
                        </div>
                      </motion.div>
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
          </div>

          {/* Right Panel (Decision Intelligence) */}
          <div className="w-[450px] shrink-0 bg-background/95 relative z-30 flex flex-col h-full overflow-hidden">
            <DecisionPanel eventId={event?.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactSimulationView;
