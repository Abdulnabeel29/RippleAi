import React, { useState, useMemo } from 'react';
import { MapPin, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { resolveCoords } from '../../utils/geoUtils';


const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

const GlobalRiskMap = ({ events, onLocationSelect, selectedLocation }) => {
  const [hoverInfo, setHoverInfo] = useState(null);

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
                Clear Filter: {selectedLocation}
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

          {markers.map((evt, idx) => {
            const isSelected = selectedLocation === evt.location;
            const isFaded = selectedLocation && !isSelected;
            const isHigh = evt.severity.toLowerCase() === 'high';
            const isMedium = evt.severity.toLowerCase() === 'medium';

            return (
              <Marker
                key={evt.id || idx}
                longitude={evt.lng}
                latitude={evt.lat}
                anchor="center"
              >
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: isFaded ? 0.8 : 1,
                    opacity: isFaded ? 0.3 : 1,
                    filter: isFaded ? 'grayscale(100%)' : 'grayscale(0%)'
                  }}
                  transition={{ delay: idx * 0.05 + 0.2, duration: 0.5, type: 'spring' }}
                  className="relative cursor-pointer group w-6 h-6 flex items-center justify-center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    onLocationSelect(isSelected ? null : evt.location);
                  }}
                  onMouseEnter={() => setHoverInfo(evt)}
                  onMouseLeave={() => setHoverInfo(null)}
                >
                  {/* Pulse Ring */}
                  {(isHigh || isMedium) && !isFaded && (
                    <motion.div
                      initial={{ scale: 0.5, opacity: 1 }}
                      animate={{ scale: 4, opacity: 0 }}
                      transition={{
                        duration: isHigh ? 1.5 : 2.5,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`absolute inset-0 rounded-full z-[1] pointer-events-none ${isHigh ? 'bg-danger' : 'bg-warning'}`}
                    />
                  )}

                  {/* Core Node */}
                  <motion.div
                    whileHover={{ scale: 1.4 }}
                    className={`w-3.5 h-3.5 rounded-full relative z-[2] transition-transform ${isSelected ? 'border-2 border-white scale-125' : ''} ${isHigh ? 'bg-danger shadow-[0_0_15px_var(--danger-color)]' : isMedium ? 'bg-warning shadow-[0_0_10px_var(--warning-color)]' : 'bg-low'}`}
                  />
                </motion.div>
              </Marker>
            );
          })}

          {/* Hover Tooltip Overlay */}
          <AnimatePresence>
            {hoverInfo && (
              <Popup
                longitude={hoverInfo.lng}
                latitude={hoverInfo.lat}
                offset={14}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                className="z-50"
                maxWidth="300px"
              >
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="bg-card border border-white/10 px-5 py-4 rounded-xl min-w-[200px] shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 pb-3 border-b border-white/5 font-medium tracking-wide">
                    <MapPin size={14} className="text-primary" /> <strong className="text-primary-foreground">{hoverInfo.location}</strong>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-white leading-tight">
                      {hoverInfo.event_type}
                    </span>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${hoverInfo.severity.toLowerCase() === 'high' ? 'bg-danger/15 text-danger' :
                          hoverInfo.severity.toLowerCase() === 'medium' ? 'bg-warning/15 text-warning' : 'bg-low/15 text-low'
                        }`}>
                        {hoverInfo.severity} Risk
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                        <Target size={12} /> {(hoverInfo.confidence_score * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                  </div>
                </motion.div>
              </Popup>
            )}
          </AnimatePresence>
        </Map>
      </div>
    </div>
  );
};

export default GlobalRiskMap;
