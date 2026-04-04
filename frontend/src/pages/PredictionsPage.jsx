import React from 'react';
import PredictionsPanel from '../components/Predictions/PredictionsPanel';
import TopInsightBanner from '../components/TopInsightBanner';
import { useIntelligenceData } from '../hooks/useData';
import { TrendingUp, Sparkles, BrainCircuit } from 'lucide-react';

const PredictionsPage = () => {
  const { predictions, loading } = useIntelligenceData();

  return (
    <div className="flex flex-col gap-12 p-8 md:p-12 bg-[#05080f] min-h-full">
      
      {/* HUD Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-end justify-between gap-8 border-l-2 border-primary/20 pl-8 relative">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                <BrainCircuit size={24} className="text-primary animate-pulse" />
             </div>
             <div className="flex flex-col">
                <h2 className="text-4xl font-black text-white tracking-tighter m-0 uppercase italic">
                  Predictive Engine
                </h2>
                <div className="flex items-center gap-2">
                   <span className="mono text-[9px] font-black tracking-extreme text-primary/60 uppercase">AI_Forecasting_Module_v2.0</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_#10b981]" />
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-10">
           <div className="flex flex-col items-end">
              <span className="mono text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold mb-1">Generated Forecasts</span>
              <div className="flex items-center gap-2">
                 <span className="text-2xl font-black text-white tracking-tighter italic">{predictions?.length.toString().padStart(3, '0')}</span>
                 <Sparkles size={16} className="text-primary" />
              </div>
           </div>
        </div>
      </div>

      {/* Primary Highlights Section */}
      <div className="space-y-6">
        <TopInsightBanner predictions={predictions} />
      </div>

      {/* Intelligence Sections */}
      <section>
        <div className="flex items-center gap-3 mb-8 px-4 border-l-2 border-primary/20 ml-2">
             <TrendingUp size={16} className="text-primary" />
             <div className="flex flex-col">
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight m-0">Predictions Matrix</h3>
                <span className="mono text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">AI_GENERATED_FORECASTS</span>
             </div>
        </div>
        <PredictionsPanel predictions={predictions} />
      </section>
      
      {/* Footer Decoration */}
      <div className="mt-auto pt-8 border-t border-white/5 flex justify-between items-center opacity-30 cursor-default">
        <span className="mono text-[8px] font-black uppercase tracking-[0.5em]">Forecasting Accuracy::87.4%</span>
        <div className="flex gap-2">
           {[1,2,3,4,5].map(i => <div key={i} className="w-1 h-1 rounded-full bg-white/20" />)}
        </div>
        <span className="mono text-[8px] font-black uppercase tracking-[0.5em]">Model::Gemini-2.0</span>
      </div>
    </div>
  );
};

export default PredictionsPage;
