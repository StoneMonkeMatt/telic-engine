
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TelicSimulation } from './simulation/engine';
import { SimulationConfig, PhiType, StepData, AIProvider, AIConfig } from './simulation/types';
import { SimulationGrid } from './components/SimulationGrid';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { ChatInterface } from './components/ChatInterface';
import { AISettings } from './components/AISettings';
import { UserGuide } from './components/UserGuide';
import { HistoryView } from './components/HistoryView';
import { motion, AnimatePresence } from 'motion/react';
import { Info, AlertCircle, CheckCircle2, ChevronRight, MessageSquare, LayoutGrid, BookOpen, Play, Pause, Sparkles, History } from 'lucide-react';

const DEFAULT_CONFIG: SimulationConfig = {
  gridSize: 20,
  agentCount: 12,
  maxSteps: 500,
  visionRange: 2,
  moveSpeed: 1,
  useSoftmax: true,
  softmaxTemperature: 0.5,
  softmaxAdaptive: true,
  alpha: 0.6,
  gamma: 1.0,
  delta: 1.0,
  beta: 1.0,
  phiType: PhiType.INFORMATION,
  energyDepletionRate: 0.08,
  energyGainRange: [0.3, 1.2],
  initialEnergyRange: [5.0, 12.0],
  stasisThreshold: 0.01,
  chaosThreshold: 5.0,
  stabilityWindow: 50,
  seed: 42,
  
  // v13 Upgrades
  evolveParams: true,
  mutationRate: 0.05,
  mutationStd: 0.1,
  phiMutationRate: 0.01,
  reproductionEnabled: true,
  reproductionEnergyThreshold: 12.0,
  reproductionProbBase: 0.03,
  maxOffspringDist: 3,
  senescenceAge: 300,
  resourceField: true,
  resourceHotspots: 3,
  resourceSigma: 4.0,
  resourceMax: 2.5,
  resourceRegrowRate: 0.01,
  resourceConsumptionFraction: 0.4,
  toroidal: true
};

export default function App() {
  const [config, setConfig] = useState<SimulationConfig>(DEFAULT_CONFIG);
  const [aiConfig, setAIConfig] = useState<AIConfig>({
    provider: AIProvider.GEMINI,
    apiKey: '',
    model: 'gemini-3.1-pro-preview'
  });
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<StepData[]>([]);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'simulation' | 'guide' | 'history'>('simulation');
  const [showAI, setShowAI] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const simRef = useRef<TelicSimulation | null>(null);
  const timerRef = useRef<number | null>(null);

  const initSim = useCallback(() => {
    simRef.current = new TelicSimulation(config);
    setHistory([]);
    setGameOver(null);
  }, [config]);

  useEffect(() => {
    initSim();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [initSim]);

  const runStep = useCallback(() => {
    if (!simRef.current || simRef.current.gameOver) {
      if (simRef.current?.gameOver) {
        setIsRunning(false);
        setGameOver(simRef.current.gameOverReason);
      }
      return;
    }

    const stepData = simRef.current.step();
    setHistory(prev => [...prev.slice(-100), stepData]);
  }, []);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(runStep, 100);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [isRunning, runStep]);

  const handleExport = (type: 'data_logger' | 'full' = 'full') => {
    if (!simRef.current) return;
    
    let dataToExport: any;
    let filename: string;

    if (type === 'full') {
      dataToExport = simRef.current.getScientificResults();
      filename = `telic_full_dataset_${new Date().toISOString()}.json`;
    } else {
      const results = simRef.current.getResults();
      if (!results.scientific_data) {
        setNotification({ message: 'No data logger data available', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      dataToExport = results.scientific_data;
      filename = `telic_data_logger_${new Date().toISOString()}.json`;
    }

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSave = async (type: 'data_logger' | 'full' = 'full') => {
    if (!simRef.current) return;
    
    setNotification({ message: `Archiving ${type.replace('_', ' ')} dataset...`, type: 'success' });
    
    let payload: any;

    if (type === 'full') {
      const results = simRef.current.getScientificResults();
      payload = { 
        experiment_info: {
          name: results.metadata.experiment_name,
          timestamp: results.metadata.timestamp,
          config: results.metadata.parameters
        },
        summary: {
          final_agents: results.global_trajectories.agent_count.slice(-1)[0],
          final_avg_telic: results.global_trajectories.avg_telic.slice(-1)[0],
          final_avg_phi: results.global_trajectories.avg_phi.slice(-1)[0],
          ...results.final_state
        },
        trajectories: {
          telic: results.global_trajectories.avg_telic,
          phi: results.global_trajectories.avg_phi,
          energy: results.global_trajectories.avg_energy,
          agent_count: results.global_trajectories.agent_count,
          cluster_count: results.global_trajectories.cluster_count
        },
        scientific_data: results, // Store the complete scientific schema here
        dataset_type: 'full' 
      };
    } else {
      const results = simRef.current.getResults();
      if (!results.scientific_data) {
        setNotification({ message: 'No data logger data available to save', type: 'error' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }
      payload = {
        experiment_info: results.experiment_info,
        dataset_type: 'data_logger',
        scientific_data: results.scientific_data,
        summary: results.summary,
        trajectories: results.trajectories
      };
    }

    try {
      const res = await fetch('/api/simulations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNotification({ message: `${type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)} dataset archived successfully`, type: 'success' });
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save');
      }
    } catch (error) {
      setNotification({ message: `Error archiving ${type.replace('_', ' ')}: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const latestStep = history[history.length - 1];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-900/20">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 tracking-tight">TELIC SYSTEM</h1>
              <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Scientific Simulation v13.0</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                isRunning 
                  ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {isRunning ? 'Pause' : 'Run Simulation'}
            </button>

            <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setShowAI(!showAI)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  showAI 
                    ? 'bg-emerald-600/20 text-emerald-500 border border-emerald-500/30' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Analyst
              </button>
              <div className="w-px h-4 bg-zinc-800 self-center mx-1" />
              <button
                onClick={() => setActiveTab('simulation')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'simulation' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Simulation
              </button>
              <button
                onClick={() => setActiveTab('guide')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'guide' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Guide
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'history' 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                Archive
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'simulation' ? (
            <motion.div 
              key="simulation"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Left Column: Controls & Info */}
              <div className="lg:col-span-4 space-y-6">
                {showAI && <AISettings config={aiConfig} onChange={setAIConfig} />}
                
                <div className="h-[750px]">
                  <ControlPanel 
                    config={config}
                    setConfig={setConfig}
                    isRunning={isRunning}
                    onToggle={() => setIsRunning(!isRunning)}
                    onReset={() => {
                      setIsRunning(false);
                      initSim();
                    }}
                    onExport={handleExport}
                    onSave={handleSave}
                    step={latestStep?.step || 0}
                  />
                </div>

                <AnimatePresence>
                  {notification && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className={`p-4 border rounded-2xl flex items-center gap-3 ${
                        notification.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}
                    >
                      {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                      <div className="text-xs font-bold uppercase tracking-wider">{notification.message}</div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="p-6 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-4 h-4 text-zinc-500" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Equation</h3>
                  </div>
                  <div className="font-serif italic text-lg text-zinc-100 mb-2">
                    T = γ·I + δ·Φ − α·K + β·E
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    The Telic value (T) determines agent movement. It balances individual information (I), 
                    collective structure (Φ), energy reserves (E), and complexity costs (K).
                  </p>
                </div>

                <AnimatePresence>
                  {gameOver && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center gap-3"
                    >
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <div>
                        <div className="text-xs font-bold text-zinc-100 uppercase tracking-wider">Simulation Ended</div>
                        <div className="text-[10px] text-zinc-500 font-mono">{gameOver.replace(/_/g, ' ')}</div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Right Column: Visualization & Stats */}
              <div className="lg:col-span-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Spatial View</h3>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-700'}`} />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase">{isRunning ? 'Live' : 'Paused'}</span>
                      </div>
                    </div>
                    <SimulationGrid 
                      gridSize={config.gridSize}
                      agents={latestStep?.agents || []}
                      resourceGrid={latestStep?.resource_grid}
                    />
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">Emergence Metrics</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Oscillation', value: latestStep?.emergence.oscillation_detected, desc: 'Periodic system fluctuations' },
                        { label: 'Territorial', value: latestStep?.emergence.territorial_behavior, desc: 'Local spatial stabilization' },
                        { label: 'Coordination', value: (latestStep?.emergence.movement_coordination || 0) > 0.5, desc: 'Aligned movement vectors' }
                      ].map((m, i) => (
                        <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center justify-between group">
                          <div>
                            <div className="text-xs font-medium text-zinc-200">{m.label}</div>
                            <div className="text-[10px] text-zinc-500">{m.desc}</div>
                          </div>
                          {m.value ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : (
                            <div className="w-5 h-5 border-2 border-zinc-800 rounded-full" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <StatsPanel history={history} config={config} />

                {showAI && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                      <MessageSquare className="w-4 h-4 text-zinc-500" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500">AI Analyst Chat</h3>
                    </div>
                    <ChatInterface 
                      config={config} 
                      history={history} 
                      aiConfig={aiConfig}
                      onUpdateSettings={(newPartial) => {
                        setConfig(prev => {
                          const next = { ...prev, ...newPartial };
                          
                          // Map virtual fields back to tuples
                          if ('energyGainMin' in newPartial || 'energyGainMax' in newPartial) {
                            next.energyGainRange = [
                              newPartial.energyGainMin ?? prev.energyGainRange[0],
                              newPartial.energyGainMax ?? prev.energyGainRange[1]
                            ];
                          }
                          
                          if ('initialEnergyMin' in newPartial || 'initialEnergyMax' in newPartial) {
                            next.initialEnergyRange = [
                              newPartial.initialEnergyMin ?? prev.initialEnergyRange[0],
                              newPartial.initialEnergyMax ?? prev.initialEnergyRange[1]
                            ];
                          }
                          
                          return next;
                        });
                      }} 
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'guide' ? (
            <motion.div
              key="guide"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto h-[calc(100vh-12rem)]"
            >
              <UserGuide />
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-6xl mx-auto h-[calc(100vh-12rem)]"
            >
              <HistoryView 
                onLoadConfig={(loadedConfig) => {
                  setConfig(loadedConfig);
                  setActiveTab('simulation');
                  setNotification({ message: 'Configuration loaded from archive', type: 'success' });
                  setTimeout(() => setNotification(null), 3000);
                }} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
