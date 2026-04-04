import React, { useEffect, useState, useMemo } from 'react';
import { Activity, Network, Layers, Share2, AlertTriangle, ShieldCheck, ShieldAlert, ShieldOff, Map as MapIcon, ChevronRight, Target, Zap, Ship, Factory, Plane, Box, Warehouse, FlaskConical, Store, Brain, Radio, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import DecisionPanel from '../Intelligence/DecisionPanel';
import { resolveCoords, projectCoords } from '../../utils/geoUtils';
import * as api from '../../services/api';
import { checkWebGLSupport } from '../../utils/webglUtils';

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

// Confidence score tier classification
const getConfidenceTier = (score) => {
  if (score >= 0.8) return { label: 'High Credibility', sublabel: 'Corroborated by multiple sources', color: 'text-success', border: 'border-success/40', bg: 'bg-success/10', Icon: ShieldCheck };
  if (score >= 0.6) return { label: 'Moderate Signal', sublabel: 'Partially verified reporting', color: 'text-warning', border: 'border-warning/40', bg: 'bg-warning/10', Icon: ShieldAlert };
  return { label: 'Unverified Signal', sublabel: 'Single or unconfirmed source', color: 'text-danger', border: 'border-danger/40', bg: 'bg-danger/10', Icon: ShieldOff };
};

const ImpactSimulationView = ({ event, simulationData, onClose }) => {
  const [activeDepth, setActiveDepth] = useState(0);
  const isWebGLSupported = useMemo(() => checkWebGLSupport(), []);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [enrichedData, setEnrichedData] = useState({});
  const [enrichingTargets, setEnrichingTargets] = useState(new Set());

  // ── Geospatial Setup ─────────────────────────────────────────────
  const epicenter = useMemo(() => resolveCoords(event?.location), [event?.location]);
  const NEUTRAL_CENTER = { lng: 10, lat: 20 };

  // Distribute nodes geographically to prevent overlap
  const mappedNodes = useMemo(() => {
    if (!simulationData) return [];

    return simulationData.map((node, i) => {
      const realCoord = resolveCoords(node.target);
      if (realCoord) {
        return { ...node, ...realCoord };
      }

      const anchor = epicenter || NEUTRAL_CENTER;
      const baseDist = node.depth === 1 ? 400 : node.depth === 2 ? 1500 : 4500;
      const jitter = (i * 73) % 400;
      const distance = baseDist + jitter;
      const angle = (i * 137.5) + (node.depth * 45);

      const coords = projectCoords(anchor, distance, angle);
      return { ...node, ...coords };
    });
  }, [simulationData, epicenter]);

  useEffect(() => {
    if (!simulationData || !event) return;

    setActiveDepth(0);
    const maxDepth = simulationData.length > 0
      ? Math.max(...simulationData.map(d => d.depth))
      : 0;

    if (maxDepth === 0) return;

    let current = 0;
    const interval = setInterval(() => {
      if (current < maxDepth) {
        current += 0.2;
        setActiveDepth(current);
      } else {
        clearInterval(interval);
      }
    }, 150);

    return () => clearInterval(interval);
  }, [simulationData, event]);

  const visibleNodes = mappedNodes.filter(d => d.depth <= activeDepth);
  const tier1Count = visibleNodes.filter(d => d.depth === 1).length;
  const tier2Count = visibleNodes.filter(d => d.depth === 2).length;
  const tier3Count = visibleNodes.filter(d => d.depth === 3).length;

  useEffect(() => {
    if (!event?.id || !visibleNodes.length) return;

    const nodesToEnrich = visibleNodes.filter(n =>
      !n.is_synthesized &&
      !enrichedData[n.target] &&
      !enrichingTargets.has(n.target)
    );

    if (nodesToEnrich.length === 0) return;

    const enrichNext = async () => {
      const node = nodesToEnrich[0];
      setEnrichingTargets(prev => new Set(prev).add(node.target));

      try {
        await new Promise(r => setTimeout(r, 2000));
        const result = await api.enrichSimulationNode(event.id, node);
        setEnrichedData(prev => ({
          ...prev,
          [node.target]: result
        }));
      } catch (err) {
        console.error(`Enrichment failed for ${node.target}:`, err);
      } finally {
        setEnrichingTargets(prev => {
          const next = new Set(prev);
          next.delete(node.target);
          return next;
        });
      }
    };

    enrichNext();
  }, [visibleNodes, event?.id, enrichedData, enrichingTargets]);

  const rawConfidence = typeof event?.confidence_score === 'number' ? event.confidence_score : null;
  const confidencePct = rawConfidence !== null ? (rawConfidence * 100).toFixed(0) : '—';
  const confidenceTier = rawConfidence !== null ? getConfidenceTier(rawConfidence) : null;

  const lineFeatures = useMemo(() => {
    const anchor = epicenter || NEUTRAL_CENTER;
    if (!anchor) return { type: 'FeatureCollection', features: [] };
    return {
      type: 'FeatureCollection',
      features: visibleNodes.map(node => ({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [[anchor.lng, anchor.lat], [node.lng, node.lat]]
        },
        properties: { depth: node.depth }
      }))
    };
  }, [visibleNodes, epicenter]);

  const getFacilityIcon = (type) => {
    const map = {
      'Port': Ship,
      'Factory': Factory,
      'Air': Plane,
      'Rail': Box,
      'Warehouse': Warehouse,
      'Laboratory': FlaskConical,
      'Retail': Store
    };
    return map[type] || Activity;
  };

  const isHigh = event?.severity?.toLowerCase() === 'high' || event?.severity?.toLowerCase() === 'critical';
  const isMed = event?.severity?.toLowerCase() === 'medium';

  const severityColor = isHigh ? 'text-danger' : isMed ? 'text-warning' : 'text-primary';
  const severityPipe = isHigh ? 'status-pipe-red' : isMed ? 'status-pipe-amber' : 'status-pipe-blue';

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1500px] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden glass-panel border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.8)] [&>button]:hidden">
        <div className={`absolute top-0 left-0 right-0 h-1 z-50 ${severityPipe}`} />

        {/* ── HUD Header ── */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-white/10 bg-white/[0.02] backdrop-blur-md z-40 gap-6">
          <div className="min-w-0 flex items-center gap-4">
            <div className={`p-2 rounded-lg bg-white/[0.05] border border-white/10 shadow-inner`}>
              <Radio size={24} className={`${severityColor} animate-pulse`} />
            </div>
            <div className="flex flex-col">
              <DialogTitle className="text-2xl font-black text-white tracking-tighter uppercase italic leading-none m-0">
                Ripple Simulation
              </DialogTitle>
              <DialogDescription className="sr-only">
                Interactive strategic simulation of global supply chain disruptions originating from {event?.location}.
              </DialogDescription>
              <div className="flex items-center gap-3 mt-1.5 opacity-80">
                <span className="text-[10px] mono text-white/50 uppercase tracking-[0.2em]">{event?.event_type?.replace(/_/g, ' ')}</span>
                <span className="w-1 h-1 rounded-full bg-white/20" />
                <span className="text-[10px] mono text-white/70 uppercase tracking-widest"><MapIcon size={10} className="inline mr-1 -mt-0.5 text-white/40" />{event?.location}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {/* Cascade Tier HUD Element */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl relative group/tier cursor-help hover:bg-white/[0.05] transition-colors">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <Layers size={14} className="text-primary" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-white leading-none tracking-tighter">{Math.floor(activeDepth)}<span className="text-white/30 text-sm">/3</span></span>
                <span className="text-[8px] mono font-bold tracking-[0.2em] text-white/40 mt-1 uppercase whitespace-nowrap">Tier Depth</span>
              </div>
            </div>

            {/* Vulnerable Nodes HUD Element */}
            <div className="flex items-center gap-3 bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl relative group/nodes cursor-help hover:bg-white/[0.05] transition-colors">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-primary/20 transition-colors">
                <Network size={14} className="text-primary" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xl font-black text-white leading-none tracking-tighter">{visibleNodes.length}</span>
                <span className="text-[8px] mono font-bold tracking-[0.2em] text-white/40 mt-1 uppercase whitespace-nowrap">Affected Nodes</span>
              </div>
            </div>

            {confidenceTier && (
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl relative group/credibility cursor-help transition-all ${confidenceTier.border} ${confidenceTier.bg} border`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border border-current shadow-inner ${confidenceTier.color} bg-white/5`}>
                  <confidenceTier.Icon size={14} className="text-current" />
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-xl font-black leading-none tracking-tighter ${confidenceTier.color}`}>{confidencePct}%</span>
                  <span className={`text-[8px] mono font-bold tracking-[0.2em] mt-1 uppercase whitespace-nowrap opacity-60 flex items-center gap-1 ${confidenceTier.color}`}>
                    Credibility <AlertTriangle size={8} />
                  </span>
                </div>
              </div>
            )}

            {/* HUD Close Interface */}
            <button 
              onClick={onClose}
              className="p-2.5 rounded-lg bg-white/[0.05] border border-white/10 hover:bg-white/10 transition-all group/close shadow-inner active:scale-95 ml-2"
              title="Terminate Simulation"
            >
              <X size={20} className="text-white/40 group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* ── 3-Column Body ── */}
        <div className="flex-1 relative overflow-hidden flex w-full h-full min-h-0 bg-[#05080f]/80">

          {/* LEFT — Structural Impact List */}
          <div className="w-[420px] shrink-0 bg-white/[0.02] border-r border-white/10 z-30 flex flex-col backdrop-blur-3xl shadow-[5px_0_30px_rgba(0,0,0,0.5)]">
            <div className="px-6 py-5 border-b border-white/10 bg-white/[0.02] relative group/info flex justify-between items-center">
              <h3 className="text-[10px] font-black mono tracking-[0.2em] text-white/60 uppercase flex items-center gap-2">
                <AlertTriangle size={12} className={severityColor} /> Direct Impact Matrix
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 custom-scrollbar">
              <AnimatePresence>
                {simulationData ? (
                  [...simulationData].sort((a, b) => b.impact - a.impact).map((node, i) => {
                    const FacilityIcon = getFacilityIcon(node.facility_type);
                    const isT1 = node.depth === 1;
                    const isT2 = node.depth === 2;
                    const pipeClass = isT1 ? 'status-pipe-red' : isT2 ? 'status-pipe-amber' : 'status-pipe-blue';
                    const colorClass = isT1 ? 'text-danger' : isT2 ? 'text-warning' : 'text-primary';
                    const bgClass = isT1 ? 'bg-danger/10 border-danger/20' : isT2 ? 'bg-warning/10 border-warning/20' : 'bg-primary/10 border-primary/20';

                    return (
                      <motion.div
                        key={`${node.target}-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-2 p-4 bg-white/[0.03] border border-white/5 rounded-xl relative overflow-hidden group hover:bg-white/[0.05] transition-all min-h-fit"
                      >
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${pipeClass} z-10 opacity-70 group-hover:opacity-100 transition-opacity`} />

                        <div className="flex justify-between items-start gap-3 relative z-20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 bg-white/5 rounded-md border border-white/10">
                              <FacilityIcon size={14} className={colorClass} />
                            </div>
                            <span className="text-sm font-black text-white leading-tight uppercase tracking-tighter truncate">{node.target}</span>
                          </div>
                          <span className={`text-[9px] mono font-black px-2 py-0.5 rounded border shrink-0 ${bgClass} ${colorClass} tracking-widest`}>
                            T{node.depth}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 relative z-20 my-1">
                          <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden p-[1px] border border-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(node.impact) * 100}%` }}
                              className={`h-full rounded-full shadow-[0_0_8px_currentColor] ${colorClass}`}
                              style={{ backgroundColor: 'currentColor' }}
                            />
                          </div>
                          <span className={`text-[11px] mono font-black w-8 text-right tracking-tighter ${colorClass}`}>{((node.impact) * 100).toFixed(0)}%</span>
                        </div>

                        {node.primary_metric && (
                          <div className="flex items-center justify-between bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg relative z-20 mb-1">
                            <span className="text-[8px] mono text-white/40 uppercase font-black tracking-widest">Live Tracker</span>
                            <span className="text-[9px] text-white font-black uppercase italic">{node.primary_metric}</span>
                          </div>
                        )}

                        <div className="flex flex-col gap-4 mt-2 pt-4 border-t border-white/5 relative z-20">
                          {/* WHY: Causality Vector */}
                          <div className="flex gap-3 relative items-start">
                            <div className="p-1.5 bg-white/5 rounded border border-white/10 shrink-0 mt-0.5">
                              <Target size={12} className={colorClass} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0 border-l-2 border-white/5 pl-4 ml-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[8px] font-black ${colorClass} uppercase tracking-widest`}>Risk Vector (WHY)</span>
                                <div className={`flex items-center gap-1.5 ${bgClass} border px-1.5 py-0.5 rounded-[3px]`}>
                                  <Brain size={8} className={`${colorClass} ${!enrichedData[node.target] && !node.is_synthesized ? 'animate-pulse' : ''}`} />
                                  <span className={`text-[7px] font-bold ${colorClass} uppercase tracking-tighter`}>
                                    {enrichedData[node.target] || node.is_synthesized ? 'Grounded' : 'Synthesizing'}
                                  </span>
                                </div>
                              </div>
                              <p className={`text-[10.5px] leading-[1.5] italic font-medium m-0 whitespace-normal ${!enrichedData[node.target] && !node.is_synthesized ? 'text-white/40' : 'text-white/80'}`}>
                                {enrichedData[node.target]?.risk_vector || node.risk_vector}
                              </p>
                            </div>
                          </div>

                          {/* HOW: Operational Impact */}
                          <div className="flex gap-3 relative items-start">
                            <div className="p-1.5 bg-white/5 rounded border border-white/10 shrink-0 mt-0.5">
                              <Zap size={12} className={colorClass} />
                            </div>
                            <div className="flex flex-col flex-1 min-w-0 border-l-2 border-white/5 pl-4 ml-1">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className={`text-[8px] font-black ${colorClass} uppercase tracking-widest`}>Operational Impact (HOW)</span>
                                <div className={`flex items-center gap-1.5 ${bgClass} border px-1.5 py-0.5 rounded-[3px]`}>
                                  <Activity size={8} className={colorClass} />
                                  <span className={`text-[7px] font-bold ${colorClass} uppercase tracking-tighter`}>
                                    {enrichedData[node.target] || node.is_synthesized ? 'Synthesized' : 'Simulating'}
                                  </span>
                                </div>
                              </div>
                              <p className={`text-[10.5px] leading-[1.5] font-medium m-0 whitespace-normal ${!enrichedData[node.target] && !node.is_synthesized ? 'text-white/40' : 'text-white/60'}`}>
                                {enrichedData[node.target]?.operational_impact || node.operational_impact}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 bg-white/[0.02] px-3 py-2 rounded-lg">
                            <span className="text-[9px] mono text-white/40 font-black uppercase tracking-widest">Est. Network Delay</span>
                            <span className="text-xs font-black text-white italic">
                              {node.delay_days} DAYS
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 opacity-30 text-center gap-4 h-full">
                    <Radio size={32} className="animate-pulse text-white" />
                    <p className="text-[10px] mono font-black tracking-[0.3em] uppercase">Synthesizing Topology…</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MIDDLE — Map Canvas */}
          <div className="flex-1 relative overflow-hidden bg-[#05080f] border-r border-white/10">
            {MAPTILER_KEY && simulationData && isWebGLSupported ? (
              <Map
                initialViewState={{
                  longitude: (epicenter || NEUTRAL_CENTER).lng,
                  latitude: (epicenter || NEUTRAL_CENTER).lat,
                  zoom: epicenter ? 3.5 : 1.5,
                  pitch: 45
                }}
                mapStyle={`https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`}
                scrollZoom={true}
                className="w-full h-full grayscale-[50%] contrast-125 brightness-75 mix-blend-screen"
              >
                <NavigationControl position="top-right" showCompass={false} />

                {/* Epicenter Marker */}
                <Marker longitude={(epicenter || NEUTRAL_CENTER).lng} latitude={(epicenter || NEUTRAL_CENTER).lat} anchor="center">
                  <div className="relative flex flex-col items-center">
                    <div className={`w-32 h-32 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20 ${severityColor.replace('text', 'bg')} blur-2xl animate-pulse`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-[0_0_30px_currentColor] z-10 transition-transform duration-500 bg-white/10 backdrop-blur-md border border-white/20`} style={{ color: severityColor === 'text-danger' ? '#ef4444' : severityColor === 'text-warning' ? '#f59e0b' : '#3b82f6' }}>
                      <Activity className="" size={14} />
                    </div>
                    <div className="mt-2 px-3 py-1.5 glass-panel border border-white/10 text-white font-black rounded-lg text-[9px] whitespace-nowrap uppercase tracking-widest shadow-2xl">
                      {epicenter ? `Origin::${event?.location}` : 'Global Fallback'}
                    </div>
                  </div>
                </Marker>

                {/* Node Markers */}
                {visibleNodes.map((node, idx) => (
                  <Marker key={`${node.target}-${idx}`} longitude={node.lng} latitude={node.lat} anchor="center">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="relative group flex flex-col items-center"
                    >
                      <div className={`w-4 h-4 rounded-full border-2 border-white/50 shadow-[0_0_15px_currentColor] transition-all duration-300 group-hover:scale-150 ${node.depth === 1 ? 'bg-danger text-danger' : node.depth === 2 ? 'bg-warning text-warning' : 'bg-primary text-primary'}`} />
                      <div className="absolute top-full mt-2 px-3 py-2 glass-panel border border-white/20 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-300 z-50 whitespace-nowrap flex flex-col items-center shadow-[0_10px_30px_rgba(0,0,0,0.8)] -translate-y-2 group-hover:translate-y-0">
                        <span className="text-[10px] font-black text-white uppercase tracking-tight italic">{node.target}</span>
                        <span className="text-[9px] mono text-white/50 font-bold border-t border-white/10 pt-1 mt-1">{((node.impact) * 100).toFixed(0)}% Exposure</span>
                      </div>
                    </motion.div>
                  </Marker>
                ))}

                {/* Connection Lines */}
                {(epicenter || NEUTRAL_CENTER) && (
                  <Source id="ripple-lines" type="geojson" data={lineFeatures}>
                    <Layer
                      id="ripple-lines-glow"
                      type="line"
                      paint={{
                        'line-color': ['match', ['get', 'depth'], 1, '#ef4444', 2, '#f59e0b', '#3b82f6'],
                        'line-width': 8,
                        'line-opacity': 0.6,
                        'line-blur': 3
                      }}
                    />
                    <Layer
                      id="ripple-lines-layer"
                      type="line"
                      paint={{
                        'line-color': ['match', ['get', 'depth'], 1, '#ef4444', 2, '#f59e0b', '#3b82f6'],
                        'line-width': 3,
                        'line-opacity': 1.0,
                        'line-dasharray': [1, 2.5]
                      }}
                    />
                  </Source>
                )}
              </Map>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center text-white/20 relative z-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                <Radio size={64} className="mb-6 opacity-20" />
                <h3 className="mono text-sm uppercase font-black tracking-[0.5em] m-0 mb-2">Telemetry Offline</h3>
                <p className="text-xs max-w-sm">Cannot establish secure visual link to GIS node. Awaiting WebGL interface handshake.</p>
              </div>
            )}

            {/* Network Topology Legend */}
            <div className="absolute bottom-8 left-8 z-40">
              <motion.div
                initial={false}
                animate={{ width: isLegendExpanded ? 260 : 48, height: isLegendExpanded ? 'auto' : 48 }}
                onMouseEnter={() => setIsLegendExpanded(true)}
                onMouseLeave={() => setIsLegendExpanded(false)}
                className="glass-panel border-white/10 rounded-2xl shadow-2xl overflow-hidden cursor-default transition-all duration-300 flex items-center justify-center"
              >
                {!isLegendExpanded ? (
                  <Network size={20} className="text-white/60" />
                ) : (
                  <div className="p-6 w-full">
                    <h4 className="text-[9px] mono uppercase tracking-[0.3em] font-black text-white/30 mb-4 border-b border-white/10 pb-3 flex items-center justify-between">
                      Node Classification
                    </h4>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-danger shadow-[0_0_10px_#ef4444]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">Tier 1 · Direct</span>
                        </div>
                        <span className="text-[9px] mono font-bold text-danger bg-danger/10 px-2 py-0.5 rounded border border-danger/20">{tier1Count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_10px_#f59e0b]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">Tier 2 · Regional</span>
                        </div>
                        <span className="text-[9px] mono font-bold text-warning bg-warning/10 px-2 py-0.5 rounded border border-warning/20">{tier2Count}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_#3b82f6]" />
                          <span className="text-[10px] font-black text-white uppercase tracking-tight">Tier 3 · Downstream</span>
                        </div>
                        <span className="text-[9px] mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">{tier3Count}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* RIGHT — Decision Intelligence */}
          <div className="w-[420px] shrink-0 bg-[#05080f]/90 relative z-30 flex flex-col h-full shadow-[-10px_0_40px_rgba(0,0,0,0.5)]">
            <DecisionPanel eventId={event?.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactSimulationView;
