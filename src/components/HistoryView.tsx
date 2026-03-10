
import React, { useState, useEffect } from 'react';
import { History, Calendar, Play, Trash2, ChevronRight, Database, Download, Activity, Zap, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SimulationMeta {
  id: string;
  name: string;
  timestamp: string;
  dataset_type: 'standard' | 'data_logger' | 'full';
  has_scientific?: boolean;
}

interface SimulationDetail {
  id: string;
  experiment_info: {
    name: string;
    timestamp: string;
    config: any;
  };
  summary: any;
  trajectories: any;
  scientific_data?: any;
  dataset_type: 'standard' | 'data_logger' | 'full';
}

interface HistoryViewProps {
  onLoadConfig: (config: any) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onLoadConfig }) => {
  const [simulations, setSimulations] = useState<SimulationMeta[]>([]);
  const [selectedSim, setSelectedSim] = useState<SimulationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSimulations();
  }, []);

  const fetchSimulations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/simulations');
      if (res.ok) {
        const data = await res.json();
        setSimulations(data);
      } else {
        throw new Error('Failed to fetch simulations');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/simulations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSim(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTrajectories = (trajectories: any) => {
    if (!trajectories || !trajectories.telic) return [];
    return trajectories.telic.map((t: number, i: number) => ({
      step: i,
      telic: t,
      phi: trajectories.phi?.[i] || 0,
      energy: trajectories.energy?.[i] || 0
    }));
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-100">Simulation Archive</h3>
        </div>
        <button 
          onClick={fetchSimulations}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Refresh Archive"
        >
          <Activity className="w-4 h-4 text-zinc-500" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: List */}
        <div className="w-1/3 border-r border-zinc-800 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-zinc-800">
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500 text-xs animate-pulse font-mono">Accessing Database...</div>
          ) : simulations.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-xs italic">No saved simulations found.</div>
          ) : (
            simulations.map((sim) => (
              <button
                key={sim.id}
                onClick={() => loadDetail(sim.id)}
                className={`w-full text-left p-3 rounded-xl transition-all border ${
                  selectedSim?.id === sim.id 
                    ? 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-900/5' 
                    : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1 truncate flex items-center justify-between gap-2">
                  <span className="truncate">{sim.name}</span>
                  <div className="flex gap-1 shrink-0">
                    <span className={`text-[8px] px-1.5 py-0.5 rounded border ${
                      sim.dataset_type === 'data_logger' 
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                        : sim.dataset_type === 'full'
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                    }`}>
                      {sim.dataset_type === 'data_logger' ? 'LOGGER' : sim.dataset_type.toUpperCase()}
                    </span>
                    {sim.has_scientific && sim.dataset_type !== 'data_logger' && (
                      <span className="flex items-center gap-1 text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        <ScrollText className="w-2 h-2" />
                        LOGGER
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-500">
                  <Calendar className="w-3 h-3" />
                  {new Date(sim.timestamp).toLocaleString()}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Main: Detail */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-950/30">
          <AnimatePresence mode="wait">
            {selectedSim ? (
              <motion.div
                key={selectedSim.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-zinc-100 tracking-tight mb-1">{selectedSim.experiment_info.name}</h2>
                    <p className="text-xs text-zinc-500 font-mono">Archived on {new Date(selectedSim.experiment_info.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedSim.scientific_data && (
                      <button
                        onClick={() => {
                          const isFull = selectedSim.dataset_type === 'full';
                          const blob = new Blob([JSON.stringify(selectedSim.scientific_data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = isFull 
                            ? `telic_full_dataset_${selectedSim.experiment_info.name}.json`
                            : `telic_data_logger_${selectedSim.experiment_info.name}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-600/20 transition-all"
                        title={selectedSim.dataset_type === 'full' ? "Download Full Scientific Dataset" : "Download Data Logger Records"}
                      >
                        <ScrollText className="w-4 h-4" />
                        {selectedSim.dataset_type === 'full' ? 'Full Dataset' : 'Data Logger'}
                      </button>
                    )}
                    <button
                      onClick={() => onLoadConfig(selectedSim.experiment_info.config)}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/20"
                    >
                      <Zap className="w-4 h-4" />
                      Load Config
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Final Agents', value: selectedSim.summary?.final_agents ?? 'N/A', color: 'text-zinc-100' },
                    { label: 'Avg Telic', value: selectedSim.summary?.final_avg_telic?.toFixed(2) ?? 'N/A', color: 'text-emerald-400' },
                    { label: 'Avg Phi', value: selectedSim.summary?.final_avg_phi?.toFixed(3) ?? 'N/A', color: 'text-indigo-400' }
                  ].map((stat, i) => (
                    <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{stat.label}</div>
                      <div className={`text-xl font-mono ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>

                {selectedSim.dataset_type === 'full' && selectedSim.summary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Founder Dominance', value: selectedSim.summary.founder_dominance_index?.toFixed(3) ?? 'N/A' },
                      { label: 'Phi Stability', value: selectedSim.summary.avg_phi_stability?.toFixed(3) ?? 'N/A' },
                      { label: 'Symbol Entropy', value: selectedSim.summary.global_symbol_entropy?.toFixed(3) ?? 'N/A' },
                      { label: 'Steps', value: selectedSim.summary.steps_completed ?? 'N/A' }
                    ].map((stat, i) => (
                      <div key={i} className="p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl">
                        <div className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 mb-0.5">{stat.label}</div>
                        <div className="text-sm font-mono text-zinc-300">{stat.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSim.trajectories && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-2">Trajectory Analysis</h3>
                    <div className="h-64 w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={formatTrajectories(selectedSim.trajectories)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="step" hide />
                          <YAxis hide domain={['auto', 'auto']} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '10px' }}
                          />
                          <Line type="monotone" dataKey="telic" stroke="#10b981" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="phi" stroke="#6366f1" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-800 pb-2">Configuration Parameters</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(selectedSim.experiment_info.config).map(([key, value]) => (
                      <div key={key} className="flex flex-col p-2 bg-zinc-900/30 border border-zinc-800/50 rounded-lg">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase truncate">{key}</span>
                        <span className="text-xs text-zinc-300 font-bold truncate">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-4">
                <div className="w-16 h-16 bg-zinc-900 rounded-3xl flex items-center justify-center border border-zinc-800">
                  <Database className="w-8 h-8 text-zinc-700" />
                </div>
                <div>
                  <h4 className="text-zinc-300 font-bold uppercase tracking-wider">No Selection</h4>
                  <p className="text-xs text-zinc-500 max-w-[240px] mt-2">Select a simulation from the archive to view its detailed metrics and trajectories.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
