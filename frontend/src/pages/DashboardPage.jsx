import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldAlert } from 'lucide-react';

import GlobalRiskMap from '../components/Map/GlobalRiskMap';
import PredictionsPanel from '../components/Predictions/PredictionsPanel';
import EventFeed from '../components/Events/EventFeed';
import TopInsightBanner from '../components/TopInsightBanner';
import ImpactSimulationView from '../components/Simulation/ImpactSimulationView';
import { useIntelligenceData, useEventSimulation } from '../hooks/useData';

const DashboardPage = () => {
    const { events, predictions, loading } = useIntelligenceData();
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const { simulationData, impactData } = useEventSimulation(selectedEvent?.id);

    const handleLocationSelect = (evt) => {
        if (evt) {
            setSelectedLocation(evt.location);
            setSelectedEvent(evt);
        } else {
            setSelectedLocation(null);
            setSelectedEvent(null);
        }
    };

    const handleEventSelect = (evt) => {
        if (selectedEvent?.id === evt.id) setSelectedEvent(null);
        else setSelectedEvent(evt);
    };

    // Slice data for "Dashboard Preview" versions - High Density
    const recentEvents = events.slice(0, 10);
    const topPredictions = predictions.slice(0, 8);
    const critCount = events.filter(e => e.severity?.toLowerCase() === 'high' || e.severity?.toLowerCase() === 'critical').length;

    return (
        <div className="flex flex-col gap-12 p-8 md:p-10 max-w-7xl mx-auto">
            
            {/* Top Intelligence Banner */}
            <TopInsightBanner predictions={predictions} />

            {/* Core Telemetry Strip */}
            <div className="flex items-center bg-[#151c25]/40 border border-white/5 p-5 rounded-sm shadow-2xl relative overflow-hidden group">
                {/* Background scanning effect */}
                <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                <div className="flex-1 flex justify-between items-center px-8 border-r border-white/5 relative z-10">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1.5 cursor-default">
                            <Activity size={12} className="text-primary" />
                            <h4 className="mono text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black m-0">Detected Active Scenarios</h4>
                        </div>
                        <span className="text-3xl font-black text-white tracking-tighter leading-none">{String(events.length).padStart(3, '0')}</span>
                    </div>
                </div>
                
                <div className="flex-1 flex justify-between items-center px-8 relative z-10">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1.5 cursor-default">
                            <ShieldAlert size={12} className="text-danger animate-pulse" />
                            <h4 className="mono text-[9px] text-danger/80 uppercase tracking-[0.3em] font-black m-0">Critical Risk Vectors</h4>
                        </div>
                        <span className="text-3xl font-black text-danger tracking-tighter leading-none drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]">{String(critCount).padStart(3, '0')}</span>
                    </div>
                </div>
            </div>

            {/* 1. Global Disruption Matrix Section */}

            <section className="flex flex-col gap-5">
                <div className="flex justify-between items-end px-1">
                    <div>
                        <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 m-0">Geospatial Intelligence Vector</h3>
                        <h2 className="text-2xl font-bold text-white mt-1">Detected Disruptions Map</h2>
                    </div>
                </div>
                <div className="h-[550px] rounded-sm overflow-hidden ring-1 ring-white/5 shadow-2xl relative group">
                    <GlobalRiskMap 
                        events={events} 
                        onLocationSelect={handleLocationSelect} 
                        selectedLocation={selectedLocation} 
                    />
                    {/* Floating redirect button for Map */}
                    <div className="absolute top-4 right-4 z-20">
                        <Link to="/map" className="bg-[#151c25]/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-sm text-[11px] font-bold text-white uppercase tracking-widest hover:bg-white/[0.12] hover:border-white/20 transition-all shadow-xl flex items-center gap-2 group">
                            <span className="material-symbols-outlined text-sm">fullscreen</span>
                            Fullscreen Map
                        </Link>
                    </div>
                </div>
            </section>

            {/* 2. AI Forecasting Section */}
            <section className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                    <div>
                        <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 m-0">Predictive Intelligence</h3>
                        <h2 className="text-xl font-bold text-white mt-1">AI Disruption Forecasts</h2>
                    </div>
                </div>
                <div className="bg-[#151c25]/30 rounded-sm ring-1 ring-white/5 p-1 flex flex-col items-center">
                    <div className="w-full">
                        <PredictionsPanel predictions={topPredictions} />
                    </div>
                    {/* Explicit redirect button at bottom */}
                    <Link to="/predictions" className="mt-8 mb-6 px-10 py-3 bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-white hover:text-black hover:border-white transition-all active:scale-95 flex items-center gap-2 group shadow-lg">
                        View All Predictive Analytics
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                </div>
            </section>

            {/* 3. Recent Disruptions Section */}
            <section className="flex flex-col gap-5">
                <div className="flex justify-between items-center px-1">
                    <div>
                        <h3 className="mono text-[10px] uppercase tracking-widest text-slate-500 m-0">Real-time Event Feed</h3>
                        <h2 className="text-xl font-bold text-white mt-1">Detected Disruptions</h2>
                    </div>
                </div>
                <div className="bg-[#151c25]/30 rounded-sm ring-1 ring-white/5 p-1 flex flex-col items-center">
                    <div className="w-full">
                        <EventFeed 
                            events={recentEvents} 
                            onEventSelect={handleEventSelect}
                            selectedEventId={selectedEvent?.id}
                        />
                    </div>
                    {/* Explicit redirect button at bottom */}
                    <Link to="/map" className="mt-8 mb-6 px-10 py-3 bg-white/5 border border-white/10 text-white font-bold text-[11px] uppercase tracking-[0.2em] rounded-sm hover:bg-white hover:text-black hover:border-white transition-all active:scale-95 flex items-center gap-2 group shadow-lg">
                        Explore All Logged Events
                        <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">list</span>
                    </Link>
                </div>
            </section>

            {/* Global Impact Simulation (Popup) */}
            <ImpactSimulationView 
                event={selectedEvent} 
                simulationData={simulationData} 
                impactData={impactData} 
                onClose={() => setSelectedEvent(null)}
            />
        </div>
    );
};

export default DashboardPage;
