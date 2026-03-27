import React, { useState, useEffect, useMemo, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useIntelligenceData } from '../hooks/useData';
import { motion, AnimatePresence } from 'framer-motion';

const NetworkGraphPage = () => {
    const { events, loading } = useIntelligenceData();
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [fetchingGraph, setFetchingGraph] = useState(false);
    const [hoverNode, setHoverNode] = useState(null);
    const fgRef = useRef();

    // Auto-select first high severity event if none selected
    useEffect(() => {
        if (!selectedEventId && events.length > 0) {
            const highRisk = events.find(e => e.severity?.toLowerCase() === 'high' || e.severity?.toLowerCase() === 'critical');
            setSelectedEventId(highRisk?.id || events[0].id);
        }
    }, [events, selectedEventId]);

    // Fetch impact data from backend Neo4j service
    useEffect(() => {
        if (!selectedEventId) return;

        const fetchImpact = async () => {
            setFetchingGraph(true);
            try {
                const res = await fetch(`http://localhost:8000/events/${selectedEventId}/impact`);
                const data = await res.json();
                
                if (data.status === 'success') {
                    const impact = data.data.impact;
                    const nodes = [];
                    const links = [];
                    const seen = new Set();

                    // 1. Root Event Node
                    const event = data.data.event || events.find(e => e.id === selectedEventId);
                    nodes.push({
                        id: selectedEventId,
                        name: event?.event_type?.replace(/_/g, ' ') || 'Disruption',
                        val: 24,
                        color: (event?.severity?.toLowerCase() === 'high' || event?.severity?.toLowerCase() === 'critical') ? '#f87171' : '#fbbf24',
                        type: 'event'
                    });
                    seen.add(selectedEventId);

                    // 2. Affected Industries (Tier 1)
                    impact.industries.forEach(industryName => {
                        const industryId = `industry-${industryName}`;
                        if (!seen.has(industryId)) {
                            nodes.push({
                                id: industryId,
                                name: industryName,
                                type: 'industry',
                                val: 18,
                                color: '#60a5fa'
                            });
                            seen.add(industryId);
                        }
                        links.push({ source: selectedEventId, target: industryId, value: 3 });

                        // 3. Companies in this Industry (Tier 2)
                        // Mock mapping: in a real graph these would come from Neo4j relationships.
                        // Here we'll link all 'companies' to all 'industries' for the MVP visualisation.
                        impact.companies.forEach(companyName => {
                            const companyId = `company-${companyName}`;
                            if (!seen.has(companyId)) {
                                nodes.push({
                                    id: companyId,
                                    name: companyName,
                                    type: 'company',
                                    val: 14,
                                    color: '#a855f7'
                                });
                                seen.add(companyId);
                            }
                            // Link company to industry if not already linked
                            if (!links.some(l => l.source === industryId && l.target === companyId)) {
                                links.push({ source: industryId, target: companyId, value: 2 });
                            }

                            // 4. Downstream Companies (Tier 3)
                            impact.downstream_companies.forEach(downstreamName => {
                                const downstreamId = `downstream-${downstreamName}`;
                                if (!seen.has(downstreamId)) {
                                    nodes.push({
                                        id: downstreamId,
                                        name: downstreamName,
                                        type: 'ripple',
                                        val: 10,
                                        color: '#94a3b8'
                                    });
                                    seen.add(downstreamId);
                                }
                                // Link downstream to company
                                if (!links.some(l => l.source === companyId && l.target === downstreamId)) {
                                    links.push({ source: companyId, target: downstreamId, value: 1, dashArray: [2, 2] });
                                }
                            });
                        });
                    });

                    setGraphData({ nodes, links });
                    
                    // Center the graph after a short delay
                    setTimeout(() => {
                        if (fgRef.current) fgRef.current.zoomToFit(400, 100);
                    }, 500);
                }
            } catch (err) {
                console.error('Failed to fetch graph data:', err);
            } finally {
                setFetchingGraph(false);
            }
        };

        fetchImpact();
    }, [selectedEventId, events]);

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            
            {/* Sidebar: Event Selector */}
            <div className="w-[320px] bg-[#151c25] border-r border-white/5 flex flex-col shrink-0">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-bold text-white mb-1">Network Graph</h2>
                    <p className="text-xs text-slate-500 uppercase tracking-widest">Select Incident to Visualise Impact</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500 text-sm">Loading events...</div>
                    ) : events.map(evt => (
                        <div 
                            key={evt.id}
                            onClick={() => setSelectedEventId(evt.id)}
                            className={`p-4 rounded-sm border cursor-pointer transition-all duration-200 ${
                                selectedEventId === evt.id 
                                ? 'bg-primary/10 border-primary/30' 
                                : 'bg-white/5 border-transparent hover:bg-white/10'
                            }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                    evt.severity?.toLowerCase() === 'high' ? 'bg-red-400/20 text-red-400' : 'bg-amber-400/20 text-amber-400'
                                }`}>
                                    {evt.severity}
                                </span>
                                <span className="mono text-[10px] text-slate-500 uppercase">{evt.industry}</span>
                            </div>
                            <h4 className="text-sm font-medium text-white truncate">{evt.event_type?.replace(/_/g, ' ')}</h4>
                            <p className="text-xs text-slate-500 m-0 mt-1 truncate">{evt.location}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Graph Area */}
            <div className="flex-1 relative">
                
                {/* Visualisation Legend */}
                <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 p-4 bg-[#0d141d]/80 backdrop-blur-md border border-white/5 rounded-sm">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                        <span className="mono text-[10px] text-slate-400 uppercase">Primary Event</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                        <span className="mono text-[10px] text-slate-400 uppercase">Industry Impact</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                        <span className="mono text-[10px] text-slate-400 uppercase">Affected Company</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                        <span className="mono text-[10px] text-slate-400 uppercase">Ripple Effect</span>
                    </div>
                </div>

                {fetchingGraph && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20 backdrop-blur-sm">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <span className="mono text-xs text-primary uppercase tracking-widest">Mapping Dependencies...</span>
                        </div>
                    </div>
                )}

                <ForceGraph2D
                    ref={fgRef}
                    graphData={graphData}
                    nodeLabel="name"
                    nodeColor={node => node.color}
                    nodeRelSize={6}
                    linkColor={() => '#1e293b'}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={d => 0.005}
                    backgroundColor="#0d141d"
                    onNodeHover={setHoverNode}
                    nodeCanvasObject={(node, ctx, globalScale) => {
                        const label = node.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Inter`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = node.color;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, node.val / 2, 0, 2 * Math.PI, false);
                        ctx.fill();
                        
                        if (globalScale > 1.5 || node.id === selectedEventId) {
                            ctx.fillStyle = '#f8fafc';
                            ctx.fillText(label, node.x, node.y + (node.val / 2) + 10);
                        }
                    }}
                />

                {/* Node Detail Popup */}
                <AnimatePresence>
                    {hoverNode && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute bottom-10 left-1/2 -translate-x-1/2 p-6 bg-[#151c25] border border-white/5 rounded-sm shadow-2xl min-w-[300px]"
                        >
                            <div className="mono text-[9px] text-slate-500 uppercase tracking-widest mb-1">{hoverNode.type} Node</div>
                            <h3 className="text-lg font-bold text-white uppercase m-0">{hoverNode.name}</h3>
                            <p className="text-xs text-slate-400 mt-2 m-0 leading-relaxed">
                                {hoverNode.type === 'event' 
                                    ? 'Primary disruption source causing cascade failures.' 
                                    : `Downstream ${hoverNode.type} affected by logistics delays and inventory shortages.`}
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default NetworkGraphPage;
