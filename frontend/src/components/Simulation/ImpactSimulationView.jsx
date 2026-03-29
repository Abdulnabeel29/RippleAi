import React, { useEffect, useState, useMemo } from 'react';
import { Activity, Network, Layers, Share2, AlertTriangle, ShieldCheck, ShieldAlert, ShieldOff, Map as MapIcon, ChevronRight, Target, Zap, Ship, Factory, Plane, Box, Warehouse, FlaskConical, Store, Brain } from 'lucide-react';
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

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;

// Confidence score tier classification
const getConfidenceTier = (score) => {
  if (score >= 0.8) return { label: 'High Credibility', sublabel: 'Corroborated by multiple sources', color: 'text-green-400', border: 'border-green-500/40', bg: 'bg-green-500/10', Icon: ShieldCheck };
  if (score >= 0.6) return { label: 'Moderate Signal', sublabel: 'Partially verified reporting', color: 'text-warning', border: 'border-warning/40', bg: 'bg-warning/10', Icon: ShieldAlert };
  return { label: 'Unverified Signal', sublabel: 'Single or unconfirmed source', color: 'text-danger', border: 'border-danger/40', bg: 'bg-danger/10', Icon: ShieldOff };
};

const ImpactSimulationView = ({ event, simulationData, onClose }) => {
  const [activeDepth, setActiveDepth] = useState(0);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);
  const [enrichedData, setEnrichedData] = useState({});
  const [enrichingTargets, setEnrichingTargets] = useState(new Set());

  // ── Geospatial Setup ─────────────────────────────────────────────
  const epicenter = useMemo(() => resolveCoords(event?.location), [event?.location]);
  const NEUTRAL_CENTER = { lng: 10, lat: 20 };

  // Distribute nodes geographically to prevent overlap
  const mappedNodes = useMemo(() => {
    if (!simulationData) return [];

    // Use actual epicenter if possible, otherwise use the neutral center for global events
    return simulationData.map((node, i) => {
      // 1. Attempt to resolve high-fidelity real-world coordinate first
      const realCoord = resolveCoords(node.target);
      if (realCoord) {
        return { ...node, ...realCoord };
      }

      // 2. Fallback to stable distributed projection if unknown
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
        current += 1;
        setActiveDepth(current);
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [simulationData, event]);

  const visibleNodes = mappedNodes.filter(d => d.depth <= activeDepth);
  const tier1Count = visibleNodes.filter(d => d.depth === 1).length;
  const tier2Count = visibleNodes.filter(d => d.depth === 2).length;
  const tier3Count = visibleNodes.filter(d => d.depth === 3).length;

  // Sequential Enrichment Logic
  useEffect(() => {
    if (!event?.id || !visibleNodes.length) return;

    const nodesToEnrich = visibleNodes.filter(n => 
      !n.is_synthesized && 
      !enrichedData[n.target] && 
      !enrichingTargets.has(n.target)
    );

    if (nodesToEnrich.length === 0) return;

    // Process one node at a time to avoid rate limits and provide better "streaming" feel
    const enrichNext = async () => {
      const node = nodesToEnrich[0];
      setEnrichingTargets(prev => new Set(prev).add(node.target));

      try {
        // Sequential throttle to stay within provider (Gemini/Groq) Free Tier RPM limits
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

  // GeoJSON for Ripple Lines
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

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[1500px] w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden bg-background border-primary/20 shadow-[0_10px_40px_rgba(0,0,0,0.8)]">
        {/* ── Header ── */}
        <div className="flex justify-between items-center px-8 py-4 border-b border-primary/20 bg-card/50 backdrop-blur-md z-50 gap-6">
          <div className="min-w-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg tracking-wide text-white font-semibold uppercase truncate">
                <Activity className="text-danger shrink-0" size={20} />
                Ripple Simulation: {event?.event_type}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-0.5 text-xs truncate">
                Epicenter: <span className="text-white font-medium">{event?.location}</span>
                {event?.industry && <> · Industry: <span className="text-primary font-medium">{event.industry}</span></>}
                {event?.severity && <> · Severity: <span className={`font-bold uppercase ${event.severity === 'critical' ? 'text-danger' : event.severity === 'high' ? 'text-warning' : 'text-primary'}`}>{event.severity}</span></>}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Cascade Tier Explanation */}
            <div className="flex items-center gap-2.5 bg-muted/20 border border-muted/30 px-4 py-2 rounded-lg relative group/tier cursor-help">
              <Layers size={18} className="text-primary" />
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold text-white leading-none">{activeDepth} / 3</span>
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground mt-0.5 whitespace-nowrap">CASCADE TIER</span>
              </div>
              <div className="absolute top-full left-0 mt-2 w-[240px] bg-card border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 group-hover/tier:opacity-100 pointer-events-none transition-all z-[100] backdrop-blur-xl">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-1 pb-1 border-b border-white/5">Network Depth Explanation</h4>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  The "Ripple" propagates through tiers. T1=Direct local impact, T2=Regional distribution delay, T3=Global downstream exposure.
                </p>
              </div>
            </div>

            {/* Vulnerable Nodes Explanation */}
            <div className="flex items-center gap-2.5 bg-muted/20 border border-muted/30 px-4 py-2 rounded-lg relative group/nodes cursor-help">
              <Network size={18} className="text-primary" />
              <div className="flex flex-col text-left">
                <span className="text-xl font-bold text-white leading-none">{visibleNodes.length}</span>
                <span className="text-[9px] font-bold tracking-widest text-muted-foreground mt-0.5 whitespace-nowrap">VULNERABLE NODES</span>
              </div>
              <div className="absolute top-full left-0 mt-2 w-[240px] bg-card border border-white/10 p-3 rounded-xl shadow-2xl opacity-0 group-hover/nodes:opacity-100 pointer-events-none transition-all z-[100] backdrop-blur-xl">
                <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-1 pb-1 border-b border-white/5">Impact Scope Explanation</h4>
                <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                  These are the specific facilities, factories, ports, and transit hubs identified by AI as being in the direct path of the ripple contagion.
                </p>
              </div>
            </div>
            {confidenceTier && (
              <div className={`flex items-center gap-2.5 border px-4 py-2 rounded-lg relative group/credibility cursor-help transition-all ${confidenceTier.border} ${confidenceTier.bg}`}>
                <confidenceTier.Icon size={18} className={confidenceTier.color} />
                <div className="flex flex-col text-left">
                  <span className={`text-xl font-bold leading-none ${confidenceTier.color}`}>{confidencePct}%</span>
                  <span className="text-[9px] font-bold tracking-widest text-muted-foreground mt-0.5 uppercase flex items-center gap-1">
                    Confidence <AlertTriangle size={8} />
                  </span>
                </div>

                {/* Calculation Logic Tooltip */}
                <div className="absolute top-full right-0 mt-2 w-[280px] bg-card border border-white/10 p-4 rounded-xl shadow-2xl opacity-0 group-hover/credibility:opacity-100 pointer-events-none transition-all z-[100] backdrop-blur-xl">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-primary" /> Source Credibility Logic
                  </h4>
                  <p className="text-[9px] text-muted-foreground leading-relaxed mb-3">
                    Calculated by the AI Intelligence Layer using weighted Bayesian inference across three key vectors:
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-0.5 border-l-2 border-primary/30 pl-2">
                      <span className="text-[9px] font-bold text-white uppercase">1. Source Authority</span>
                      <p className="text-[8px] text-muted-foreground">Historical reliability of the news publisher or agency.</p>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l-2 border-primary/30 pl-2">
                      <span className="text-[9px] font-bold text-white uppercase">2. Linguistic Certainty</span>
                      <p className="text-[8px] text-muted-foreground">Evaluation of "Confirmed" vs. "Speculative" language in the report.</p>
                    </div>
                    <div className="flex flex-col gap-0.5 border-l-2 border-primary/30 pl-2">
                      <span className="text-[9px] font-bold text-white uppercase">3. Data Integrity</span>
                      <p className="text-[8px] text-muted-foreground">Completeness of extracted event attributes (Type, Core Location, Industry).</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center text-[8px] font-bold uppercase tracking-tighter">
                    <span className="text-green-400">High: 80%+</span>
                    <span className="text-warning">Mod: 60%+</span>
                    <span className="text-danger">Low: &lt;60%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── 3-Column Body ── */}
        <div className="flex-1 relative overflow-hidden flex w-full h-full min-h-0">

          {/* LEFT — Structural Impact List */}
          <div className="w-[320px] shrink-0 bg-background/80 border-r border-primary/20 z-30 flex flex-col backdrop-blur-md">
            <div className="px-5 py-4 border-b border-primary/20 bg-muted/10 relative group/info">
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase flex items-center gap-2">
                <AlertTriangle size={12} className="text-warning" /> Structural Impact List
              </h3>
              <div className="absolute top-4 right-5 text-muted-foreground hover:text-primary transition-colors cursor-help">
                <AlertTriangle size={12} />
                <div className="absolute right-0 top-full mt-2 w-[280px] bg-card border border-white/10 p-4 rounded-xl shadow-2xl opacity-0 group-hover/info:opacity-100 pointer-events-none transition-opacity z-[100] backdrop-blur-xl">
                  <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-2 border-b border-white/5 pb-1">Ripple Intelligence Guide</h4>
                  
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-danger uppercase flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-danger" /> T1: Direct Epicenter
                      </span>
                      <p className="text-[8px] text-muted-foreground leading-relaxed">Immediate operational stoppage at the disaster site. High probability of complete failure.</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-warning uppercase flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-warning" /> T2: Cascading Regional
                      </span>
                      <p className="text-[8px] text-muted-foreground leading-relaxed">Indirect delays for first-tier suppliers and local logistics hubs relying on the epicenter.</p>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] font-bold text-primary uppercase flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" /> T3: Downstream Global
                      </span>
                      <p className="text-[8px] text-muted-foreground leading-relaxed">Tertiary risk to distal markets and global retailers as mid-stream inventory depletes.</p>
                    </div>
                  </div>

                  <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">Disruption Probability</p>
                  <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                    The percentage indicates the statistical likelihood of operational failure at this node, calculated by compounding epicenter severity with network proximity.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              <AnimatePresence>
                {simulationData ? (
                  [...simulationData].sort((a, b) => b.impact - a.impact).map((node, i) => {
                    const FacilityIcon = getFacilityIcon(node.facility_type);
                    return (
                      <motion.div
                        key={node.target}
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex flex-col gap-1.5 p-3 bg-card/60 border border-white/5 rounded-md"
                      >
                        <div className="flex justify-between items-start gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <FacilityIcon size={12} className="text-primary shrink-0" />
                            <span className="text-xs font-bold text-white leading-tight truncate font-mono uppercase tracking-tighter">{node.target}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${node.depth === 1 ? 'border-danger/50 text-danger bg-danger/10' : node.depth === 2 ? 'border-warning/50 text-warning bg-warning/10' : 'border-primary/50 text-primary bg-primary/10'}`}>
                            T{node.depth}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-muted/30 rounded-full overflow-hidden relative">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(node.impact) * 100}%` }}
                              className={`h-full rounded-full ${node.depth === 1 ? 'bg-danger' : node.depth === 2 ? 'bg-warning' : 'bg-primary'}`}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-white font-bold w-10 text-right">{((node.impact) * 100).toFixed(0)}%</span>
                        </div>

                        {node.primary_metric && (
                          <div className="flex items-center justify-between bg-primary/5 border border-primary/10 px-2 py-1 rounded">
                            <span className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter">Live Metric</span>
                            <span className="text-[9px] text-primary font-black uppercase italic">{node.primary_metric}</span>
                          </div>
                        )}
                      <div className="flex flex-col gap-2.5 mt-2.5 pt-2.5 border-t border-white/5">
                        <div className="flex gap-2 relative group/why">
                          <div className="flex flex-col items-center">
                            <Target size={12} className="text-danger shrink-0" />
                            <div className="w-[1px] h-full bg-white/5 my-1" />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[7.5px] font-black text-danger uppercase tracking-widest">Risk Vector (WHY)</span>
                              <div className="flex items-center gap-1 bg-danger/10 border border-danger/20 px-1 rounded-[2px]">
                                <Brain size={7} className="text-danger animate-pulse" />
                                <span className="text-[6px] font-bold text-danger uppercase tracking-tighter">Grounded</span>
                              </div>
                            </div>
                            <p className="text-[9px] text-white/90 leading-tight italic font-medium relative overflow-hidden">
                              {enrichedData[node.target]?.risk_vector || (node.is_synthesized ? node.risk_vector : (
                                <span className="flex flex-col gap-1">
                                  <span className="block w-full h-2.5 bg-danger/20 animate-pulse rounded-[2px]" />
                                  <span className="block w-3/4 h-2.5 bg-danger/20 animate-pulse rounded-[2px]" />
                                </span>
                              ))}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 relative group/how">
                          <Zap size={12} className="text-warning shrink-0" />
                          <div className="flex flex-col flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[7.5px] font-black text-warning uppercase tracking-widest">Operational Impact (HOW)</span>
                              <div className="flex items-center gap-1 bg-warning/10 border border-warning/20 px-1 rounded-[2px]">
                                <Activity size={7} className="text-warning" />
                                <span className="text-[6px] font-bold text-warning uppercase tracking-tighter">
                                  {enrichedData[node.target] ? 'Synthesized' : 'Simulated'}
                                </span>
                              </div>
                            </div>
                            <p className="text-[9px] text-muted-foreground leading-snug font-medium">
                              {enrichedData[node.target]?.operational_impact || (node.is_synthesized ? node.operational_impact : (
                                <span className="flex flex-col gap-1">
                                  <span className="block w-full h-2.5 bg-warning/20 animate-pulse rounded-[2px]" />
                                  <span className="block w-2/3 h-2.5 bg-warning/20 animate-pulse rounded-[2px]" />
                                </span>
                              ))}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/5">
                          <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter">Est. Recovery</span>
                          <span className="text-[10px] font-mono text-primary font-bold">
                            {enrichedData[node.target]?.primary_metric ? (
                              <span className="text-primary-foreground bg-primary px-1 rounded-[2px] mr-2">
                                {enrichedData[node.target].primary_metric}
                              </span>
                            ) : null}
                            {node.delay_days} Days
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
                ) : (
                  // Skeleton Loading State for structural impact list
                  <div className="flex flex-col gap-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-3 bg-card/40 border border-white/5 rounded-md animate-pulse">
                        <div className="flex justify-between mb-3">
                          <div className="h-3 w-24 bg-white/10 rounded" />
                          <div className="h-3 w-8 bg-white/10 rounded" />
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full mb-3" />
                        <div className="flex flex-col gap-2">
                          <div className="h-2 w-full bg-white/5 rounded" />
                          <div className="h-2 w-2/3 bg-white/5 rounded" />
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-col items-center justify-center py-6 opacity-30 text-center gap-2">
                       <Network size={20} className="animate-spin" />
                       <p className="text-[8px] tracking-[0.2em] uppercase">Synthesizing Network Topologies…</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MIDDLE — Map Canvas */}
          <div className="flex-1 relative overflow-hidden bg-[#05080f] border-r border-primary/20">
            {MAPTILER_KEY && simulationData ? (
              <Map
                initialViewState={{
                  longitude: (epicenter || NEUTRAL_CENTER).lng,
                  latitude: (epicenter || NEUTRAL_CENTER).lat,
                  zoom: epicenter ? 3.5 : 1.5,
                  pitch: 45
                }}
                mapStyle={`https://api.maptiler.com/maps/dataviz-dark/style.json?key=${MAPTILER_KEY}`}
                scrollZoom={true}
                className="w-full h-full"
              >
                <NavigationControl position="top-right" showCompass={false} />

                {/* Epicenter Marker */}
                <Marker longitude={(epicenter || NEUTRAL_CENTER).lng} latitude={(epicenter || NEUTRAL_CENTER).lat} anchor="center">
                  <div className="relative flex flex-col items-center">
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-4 bg-danger/30 rounded-full blur-md"
                    />
                    <div className="w-8 h-8 rounded-full bg-danger border-2 border-white flex items-center justify-center shadow-[0_0_20px_#ef4444] z-10">
                      <AlertTriangle className="text-white" size={14} />
                    </div>
                    <div className="mt-2 px-2 py-1 bg-background border border-danger text-white font-bold rounded text-[8px] whitespace-nowrap uppercase tracking-tighter">
                      {epicenter ? `EPICENTER: ${event?.location}` : 'GLOBAL FALLBACK VIEW'}
                    </div>
                  </div>
                </Marker>

                {/* Node Markers */}
                {visibleNodes.map((node) => (
                  <Marker key={node.target} longitude={node.lng} latitude={node.lat} anchor="center">
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="relative group flex flex-col items-center"
                    >
                      <div className={`w-3.5 h-3.5 rounded-full border border-white/50 shadow-xl ${node.depth === 1 ? 'bg-danger' : node.depth === 2 ? 'bg-warning' : 'bg-primary'}`} />
                      <div className="absolute top-full mt-1 px-1.5 py-0.5 bg-background/90 border border-white/10 rounded backdrop-blur-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap flex flex-col items-center">
                        <span className="text-[9px] font-bold text-white">{node.target}</span>
                        <span className="text-[8px] text-muted-foreground">{((node.impact) * 100).toFixed(0)}% Disruption Risk</span>
                      </div>
                    </motion.div>
                  </Marker>
                ))}

                {/* Connection Lines (GeoJSON) */}
                {(epicenter || NEUTRAL_CENTER) && (
                  <Source id="ripple-lines" type="geojson" data={lineFeatures}>
                    <Layer
                      id="ripple-lines-layer"
                      type="line"
                      paint={{
                        'line-color': ['match', ['get', 'depth'], 1, '#ef4444', 2, '#f59e0b', '#3b82f6'],
                        'line-width': 1.5,
                        'line-opacity': 0.6,
                        'line-dasharray': [2, 2]
                      }}
                    />
                  </Source>
                )}
              </Map>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted/5">
                <div className="text-center opacity-40">
                  <MapIcon size={48} className="mx-auto mb-4" />
                  <p className="text-xs uppercase tracking-[0.2em]">Map Engine Offline</p>
                  <p className="text-[10px] mt-2">Falling back to dark topology view</p>
                </div>
              </div>
            )}

            {/* ── Network Topology Legend — HOVERABLE COMPONENT ── */}
            <div
              className="absolute bottom-6 left-6 z-40"
              onMouseEnter={() => setIsLegendExpanded(true)}
              onMouseLeave={() => setIsLegendExpanded(false)}
            >
              <motion.div
                initial={false}
                animate={{ width: isLegendExpanded ? 240 : 44, height: isLegendExpanded ? 'auto' : 44 }}
                className="bg-background/90 border border-white/10 rounded-xl backdrop-blur-md shadow-2xl overflow-hidden cursor-default transition-all duration-300"
              >
                {!isLegendExpanded ? (
                  <div className="w-full h-full flex items-center justify-center text-primary group-hover:text-white">
                    <Network size={20} />
                  </div>
                ) : (
                  <div className="p-4">
                    <h4 className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold mb-3 border-b border-white/10 pb-2 flex items-center justify-between">
                      Network Topology <ChevronRight size={10} />
                    </h4>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 rounded-full h-2 bg-danger shadow-[0_0_8px_#ef4444]" />
                          <span className="text-[10px] font-semibold text-white uppercase">Tier 1 · Direct</span>
                        </div>
                        <span className="text-[9px] font-mono text-danger bg-danger/10 px-1.5 py-0.5 rounded border border-danger/20">{tier1Count}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 rounded-full h-2 bg-warning shadow-[0_0_8px_#f59e0b]" />
                          <span className="text-[10px] font-semibold text-white uppercase">Tier 2 · Regional</span>
                        </div>
                        <span className="text-[9px] font-mono text-warning bg-warning/10 px-1.5 py-0.5 rounded border border-warning/20">{tier2Count}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 rounded-full h-2 bg-primary shadow-[0_0_8px_#3b82f6]" />
                          <span className="text-[10px] font-semibold text-white uppercase">Tier 3 · Downstream</span>
                        </div>
                        <span className="text-[9px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">{tier3Count}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* RIGHT — Decision Intelligence */}
          <div className="w-[420px] shrink-0 bg-background/95 relative z-30 flex flex-col h-full shadow-2xl">
            <DecisionPanel eventId={event?.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImpactSimulationView;
