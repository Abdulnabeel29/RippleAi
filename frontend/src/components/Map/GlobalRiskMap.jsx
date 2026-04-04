import React, { useState, useMemo, useCallback } from 'react';
import { MapPin, Target, Zap, Ship, Activity, ShieldCheck, AlertCircle, TrendingUp, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { resolveCoords } from '../../utils/geoUtils';
import { checkWebGLSupport } from '../../utils/webglUtils';

const getEventIcon = (type) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('weather') || t.includes('storm')) return Zap;
  if (t.includes('port') || t.includes('maritime') || t.includes('ship')) return Ship;
  if (t.includes('strike') || t.includes('protest')) return Activity;
  if (t.includes('cyber') || t.includes('security')) return ShieldCheck;
  return AlertCircle;
};

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const RiskMarker = React.memo(({ evt, isSelected, isFaded, onSelect, setHoverInfo, idx }) => {
  const isHigh = evt.severity?.toLowerCase() === 'high' || evt.severity?.toLowerCase() === 'critical';
  const isMedium = evt.severity?.toLowerCase() === 'medium';

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        filter: 'grayscale(0%)'
      }}
      transition={{ delay: idx * 0.05 + 0.2, duration: 0.5, type: 'spring' }}
      className="relative cursor-pointer group w-6 h-6 flex items-center justify-center outline-none"
      onClick={(e) => {
        onSelect(isSelected ? null : evt);
      }}
      onMouseEnter={() => setHoverInfo(evt)}
      onMouseLeave={() => setHoverInfo(null)}
    >
      {/* Pulse Rings - CSS Powered for Smoothness */}
      {(isHigh || isMedium) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={`pulse-ring ${isHigh ? 'pulse-ring-high' : 'pulse-ring-medium'} ${isHigh ? 'animate-marker-pulse-fast' : 'animate-marker-pulse'}`} />
          <div className={`pulse-ring ${isHigh ? 'pulse-ring-high' : 'pulse-ring-medium'} ${isHigh ? 'animate-marker-pulse-fast' : 'animate-marker-pulse'} delay-pulse-1`} />
        </div>
      )}

      {/* Core Node */}
      <motion.div
        whileHover={{ scale: 1.4 }}
        className={`w-3.5 h-3.5 rounded-full relative z-[2] transition-all duration-300 ${isHigh ? 'bg-danger shadow-[0_0_15px_var(--danger-color)]' : isMedium ? 'bg-warning shadow-[0_0_10px_var(--warning-color)]' : 'bg-low'}`}
      />

    </motion.div>
  );
});

const GlobalRiskMap = ({ events, onLocationSelect, selectedLocation }) => {
  const [hoverInfo, setHoverInfo] = useState(null);
  const isWebGLSupported = useMemo(() => checkWebGLSupport(), []);

  const markers = useMemo(() => {
    if (!events) return [];
    return events
      .map(evt => {
        const coords = resolveCoords(evt.location);
        if (!coords) return null; // Skip events with unresolvable locations
        return { ...evt, ...coords };
      })
      .filter(Boolean);
  }, [events]);

  if (!MAPTILER_KEY) {
    return (
      <div className="flex-1 bg-card border border-border shadow-lg rounded-xl flex items-center justify-center p-8 m-4 text-center">
        <div className="max-w-md">
          <MapPin size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">MapTiler Key Required</h3>
          <p className="text-muted-foreground text-sm mb-4">
            To view the interactive MapTiler map, get a free API key at maptiler.com (no credit card required) and add it to your frontend environment variables.
          </p>
          <code className="bg-muted px-4 py-2 rounded text-xs text-primary block text-left">
            VITE_MAPTILER_KEY=your_maptiler_key
          </code>
        </div>
      </div>
    );
  }

  if (!isWebGLSupported) {
    return (
      <div className="flex-1 bg-[#0a0a0c] border border-white/5 shadow-2xl rounded-xl flex items-center justify-center p-12 m-4 text-center">
        <div className="max-w-lg">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-danger/20">
            <MapPin size={40} className="text-danger animate-pulse" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-3 uppercase tracking-tight">WebGL Not Supported</h3>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            Your browser or system does not support WebGL, which is required for the interactive high-fidelity risk map. 
            <br /><br />
            <span className="text-slate-500 italic block border-l-2 border-primary/30 pl-4 py-1 text-left">
              Try enabling <strong>Hardware Acceleration</strong> in your browser settings or using a modern browser like Chrome, Edge, or Firefox.
            </span>
          </p>
          <div className="flex items-center justify-center gap-4">
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-sm text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              Standard View available
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative z-10 w-full h-full bg-[#0a0a0c] rounded-sm">
      <div className="flex justify-between items-center px-6 py-5 border-b border-white/5 bg-[#151c25] z-10 relative shrink-0">
        <div className="flex flex-col gap-1">
          <p className="mono text-[10px] text-slate-500 uppercase tracking-widest m-0">Active View</p>
          <h3 className="flex items-center m-0 text-sm font-bold tracking-tight text-white uppercase">
            Geospatial Risk Vector
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {selectedLocation && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-muted/10 border border-muted/20 text-primary-foreground px-3 py-1 rounded text-xs cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => onLocationSelect(null)}
              >
                Clear Filter: {typeof selectedLocation === 'object'
                  ? (selectedLocation?.location ?? JSON.stringify(selectedLocation))
                  : String(selectedLocation)}
              </motion.button>
            )}
          </AnimatePresence>

          <span className="text-[10px] font-bold tracking-widest text-success border border-success/20 bg-success/10 px-2.5 py-1 rounded-sm mono">
            LIVE MONITORING
          </span>
        </div>
      </div>

      <div className="flex-1 relative w-full h-full">
        <Map
          initialViewState={{
            longitude: 10,
            latitude: 30,
            zoom: 1.5,
            pitch: 0,
            bearing: 0
          }}
          mapStyle={`https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`}
          interactiveLayerIds={['clusters']}
          scrollZoom={false}
        >
          <NavigationControl position="bottom-right" showCompass={false} />

          {markers.map((evt, idx) => (
            <Marker
              key={evt.id || idx}
              longitude={evt.lng}
              latitude={evt.lat}
              anchor="center"
            >
              <RiskMarker
                evt={evt}
                idx={idx}
                isSelected={selectedLocation === evt.location}
                isFaded={Boolean(selectedLocation && selectedLocation !== evt.location)}
                onSelect={onLocationSelect}
                setHoverInfo={setHoverInfo}
              />
            </Marker>
          ))}

          {/* Hover Tooltip Overlay */}
          <AnimatePresence mode="wait">
            {hoverInfo && (
              <Popup
                longitude={hoverInfo.lng}
                latitude={hoverInfo.lat}
                offset={15}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                className="z-[200] pointer-events-none"
                maxWidth="260px"
              >
                {(() => {
                   const isHigh = hoverInfo.severity?.toLowerCase() === 'high' || hoverInfo.severity?.toLowerCase() === 'critical';
                   const isMed = hoverInfo.severity?.toLowerCase() === 'medium';
                   const sColor = isHigh ? 'text-danger' : isMed ? 'text-warning' : 'text-primary';
                   const sBg = isHigh ? 'bg-danger/10 border-danger/20' : isMed ? 'bg-warning/10 border-warning/20' : 'bg-primary/10 border-primary/20';
                   const sPipe = isHigh ? 'status-pipe-red' : isMed ? 'status-pipe-amber' : 'status-pipe-blue';
                   const EventIcon = getEventIcon(hoverInfo.event_type);

                   return (
                     <motion.div
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="glass-panel border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden rounded-xl flex flex-col min-w-[240px] relative"
                     >
                        {/* Style Overlay Hack to override Radix/MapLibre defaults */}
                        <style>{`
                          .maplibregl-popup-content {
                            background: transparent !important;
                            padding: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                          }
                          .maplibregl-popup-tip {
                            border-top-color: rgba(10, 15, 27, 0.95) !important;
                          }
                        `}</style>
                        
                        {/* Top Accent Pipe */}
                        <div className={`absolute top-0 left-0 right-0 h-[2px] z-50 ${sPipe}`} />
                        
                        {/* Header: Location */}
                        <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10 ${sColor}`}>
                            <MapPin size={12} className="animate-pulse" />
                          </div>
                          <span className="text-[11px] font-black text-white italic truncate uppercase tracking-tighter">
                            {hoverInfo.location}
                          </span>
                        </div>

                        {/* Body: Event Info */}
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${sBg} border shrink-0`}>
                              <EventIcon size={14} className={sColor} />
                            </div>
                            <div className="flex flex-col min-w-0">
                               <span className="text-[13px] font-black text-white uppercase italic leading-none truncate">
                                 {hoverInfo.event_type.replace(/_/g, ' ')}
                               </span>
                               <span className={`text-[8px] mono font-black mt-1 uppercase tracking-widest ${sColor}`}>
                                 {hoverInfo.severity} Risk Potential
                               </span>
                            </div>
                          </div>

                          {/* Neural Confidence Meter */}
                          <div className="flex flex-col gap-1.5 mt-1">
                             <div className="flex justify-between items-center text-[8px] mono font-black text-white/30 uppercase tracking-widest">
                               <span>Neural Confidence</span>
                               <span className={sColor}>{(hoverInfo.confidence_score * 100).toFixed(0)}%</span>
                             </div>
                             <div className="h-1 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${hoverInfo.confidence_score * 100}%` }}
                                  className={`h-full rounded-full ${sColor.replace('text-', 'bg-')} shadow-[0_0_8px_currentColor]`}
                                />
                             </div>
                          </div>
                        </div>

                        {/* Footer: Tech Data */}
                        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/5 flex justify-between items-center">
                          <div className="flex items-center gap-1.5 opacity-30">
                            <Globe size={8} className="text-white" />
                            <span className="text-[8px] mono font-bold text-white uppercase tracking-tighter">
                               {hoverInfo.lng.toFixed(3)}°E, {hoverInfo.lat.toFixed(3)}°N
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-40">
                             <TrendingUp size={8} className="text-success" />
                             <span className="text-[7px] font-black mono text-success uppercase tracking-widest">Live Feed</span>
                          </div>
                        </div>
                     </motion.div>
                   );
                })()}
              </Popup>
            )}
          </AnimatePresence>
        </Map>
      </div>
    </div>
  );
};

export default GlobalRiskMap;
