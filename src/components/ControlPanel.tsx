
import React from 'react';
import { PhiType, SimulationConfig } from '../simulation/types';
import { Settings, Play, Pause, RotateCcw, Download, Zap, Eye, Move, Activity, Dna, Heart, Leaf, Globe, Battery, AlertCircle, Users, BarChart3, ScrollText, Database, Archive } from 'lucide-react';

interface ControlPanelProps {
  config: SimulationConfig;
  setConfig: (config: SimulationConfig) => void;
  isRunning: boolean;
  onToggle: () => void;
  onReset: () => void;
  onExport: (type: 'data_logger' | 'full') => void;
  onSave: (type: 'data_logger' | 'full') => void;
  step: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  config,
  setConfig,
  isRunning,
  onToggle,
  onReset,
  onExport,
  onSave,
  step
}) => {
  const handleChange = (key: keyof SimulationConfig, value: any) => {
    setConfig({ ...config, [key]: value });
  };

  const Slider = ({ label, icon, value, min, max, step, param, color, format = (v: number) => v.toFixed(2) }: any) => (
    <label className="block">
      <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
        {icon} {label}
      </span>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={(e) => handleChange(param, parseFloat(e.target.value))}
        className={`w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-${color}-500`}
      />
      <div className="flex justify-between text-[10px] font-mono text-zinc-600 mt-1">
        <span>{min}</span>
        <span className={`text-${color}-400 font-bold`}>{format(value)}</span>
        <span>{max}</span>
      </div>
    </label>
  );

  const getConfigHash = (cfg: SimulationConfig) => {
    const configStr = JSON.stringify(cfg);
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-2xl backdrop-blur-md overflow-hidden">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-400" />
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-100">Parameters</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onToggle}
            className={`p-1.5 rounded-lg transition-all ${
              isRunning 
                ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' 
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
            title={isRunning ? 'Pause' : 'Start'}
          >
            {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <div className="text-[10px] font-mono text-zinc-500">STEP {step}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* Reproducibility Section */}
        <section className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-500/70">Reproducibility</h3>
            <div className="text-[9px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
              HASH: {getConfigHash(config)}
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                <RotateCcw className="w-3 h-3" /> Simulation Seed
              </span>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={config.seed || 0}
                  onChange={(e) => handleChange('seed', parseInt(e.target.value))}
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs font-mono rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500/50 outline-none"
                />
                <button
                  onClick={() => handleChange('seed', Math.floor(Math.random() * 1000000))}
                  className="px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors flex items-center gap-2 text-[10px] font-bold uppercase"
                  title="Generate New Seed"
                >
                  <RotateCcw className="w-3 h-3" />
                  New
                </button>
              </div>
            </label>
            <p className="text-[9px] text-zinc-600 italic">Changing the seed or any parameter will reset the simulation.</p>
          </div>
        </section>
        {/* Core Weights */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-b border-zinc-800 pb-2">Telic Weights</h3>
          <div className="grid grid-cols-2 gap-4">
            <Slider label="γ (Info)" icon={<Zap className="w-3 h-3" />} value={config.gamma} min={0} max={3} step={0.1} param="gamma" color="emerald" />
            <Slider label="δ (Phi)" icon={<Activity className="w-3 h-3" />} value={config.delta} min={0} max={2} step={0.1} param="delta" color="indigo" />
            <Slider label="β (Energy)" icon={<Battery className="w-3 h-3" />} value={config.beta} min={0.5} max={2} step={0.1} param="beta" color="amber" />
            <Slider label="α (Cost)" icon={<AlertCircle className="w-3 h-3" />} value={config.alpha} min={0.2} max={1.2} step={0.1} param="alpha" color="rose" />
          </div>
        </section>

        {/* System Settings */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-b border-zinc-800 pb-2">System Config</h3>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <Globe className="w-3 h-3" /> Grid Size
              </span>
              <select
                value={config.gridSize}
                onChange={(e) => handleChange('gridSize', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {[10, 15, 20, 25, 30, 40, 50].map(v => <option key={v} value={v}>{v}x{v}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <Users className="w-3 h-3" /> Agents
              </span>
              <input
                type="number" min="1" max="100"
                value={config.agentCount}
                onChange={(e) => handleChange('agentCount', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <Zap className="w-3 h-3" /> Max Steps
              </span>
              <input
                type="number" min="100" max="5000" step="100"
                value={config.maxSteps}
                onChange={(e) => handleChange('maxSteps', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <Move className="w-3 h-3" /> Move Speed
              </span>
              <select
                value={config.moveSpeed}
                onChange={(e) => handleChange('moveSpeed', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {[1, 2, 3].map(v => <option key={v} value={v}>{v} units</option>)}
              </select>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <Eye className="w-3 h-3" /> Vision
              </span>
              <select
                value={config.visionRange}
                onChange={(e) => handleChange('visionRange', parseInt(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v} units</option>)}
              </select>
            </label>
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <Move className="w-3 h-3" /> Φ Type
              </span>
              <select
                value={config.phiType}
                onChange={(e) => handleChange('phiType', e.target.value as PhiType)}
                className="w-full bg-zinc-800 border border-zinc-700 text-zinc-100 text-[10px] rounded-lg p-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value={PhiType.NONE}>None</option>
                <option value={PhiType.SPATIAL}>Spatial</option>
                <option value={PhiType.INFORMATION}>Information</option>
                <option value={PhiType.RANDOM}>Random</option>
                <option value={PhiType.MUTUAL_INFO}>Mutual Info</option>
                <option value={PhiType.COND_ENTROPY}>Cond Entropy</option>
                <option value={PhiType.TRIPLET}>Triplet</option>
              </select>
            </label>
          </div>
        </section>

        {/* v13 Upgrades */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-b border-zinc-800 pb-2">v13 Upgrades</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'evolveParams', label: 'Evolution', icon: <Dna className="w-3 h-3" /> },
              { key: 'reproductionEnabled', label: 'Reproduction', icon: <Heart className="w-3 h-3" /> },
              { key: 'resourceField', label: 'Resource Field', icon: <Leaf className="w-3 h-3" /> },
              { key: 'toroidal', label: 'Toroidal Grid', icon: <Globe className="w-3 h-3" /> }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => handleChange(item.key as any, !config[item.key as keyof SimulationConfig])}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  config[item.key as keyof SimulationConfig]
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-zinc-400'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* Evolution & Reproduction Details */}
        {(config.evolveParams || config.reproductionEnabled) && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-b border-zinc-800 pb-2">Evolutionary Tuning</h3>
            <div className="grid grid-cols-2 gap-4">
              {config.evolveParams && (
                <>
                  <Slider label="Mutation Rate" icon={<Zap className="w-3 h-3" />} value={config.mutationRate} min={0.01} max={0.2} step={0.01} param="mutationRate" color="zinc" />
                  <Slider label="Mutation Std" icon={<Activity className="w-3 h-3" />} value={config.mutationStd} min={0.05} max={0.3} step={0.01} param="mutationStd" color="zinc" />
                  <Slider label="Φ Mutation" icon={<Move className="w-3 h-3" />} value={config.phiMutationRate} min={0.005} max={0.05} step={0.005} param="phiMutationRate" color="zinc" format={(v: number) => v.toFixed(3)} />
                  <Slider label="Max Age" icon={<Users className="w-3 h-3" />} value={config.senescenceAge} min={100} max={1000} step={50} param="senescenceAge" color="zinc" format={(v: number) => v.toFixed(0)} />
                </>
              )}
              {config.reproductionEnabled && (
                <>
                  <Slider label="Repro Energy" icon={<Battery className="w-3 h-3" />} value={config.reproductionEnergyThreshold} min={8} max={20} step={0.5} param="reproductionEnergyThreshold" color="zinc" format={(v: number) => v.toFixed(1)} />
                  <Slider label="Repro Prob" icon={<Heart className="w-3 h-3" />} value={config.reproductionProbBase} min={0.01} max={0.1} step={0.01} param="reproductionProbBase" color="zinc" />
                </>
              )}
            </div>
          </section>
        )}

        {/* Resource Field Details */}
        {config.resourceField && (
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-b border-zinc-800 pb-2">Environment Tuning</h3>
            <div className="grid grid-cols-2 gap-4">
              <Slider label="Hotspots" icon={<Leaf className="w-3 h-3" />} value={config.resourceHotspots} min={1} max={5} step={1} param="resourceHotspots" color="emerald" format={(v: number) => v.toFixed(0)} />
              <Slider label="Sigma (Width)" icon={<Activity className="w-3 h-3" />} value={config.resourceSigma} min={2} max={8} step={0.5} param="resourceSigma" color="emerald" />
              <Slider label="Max Resource" icon={<Zap className="w-3 h-3" />} value={config.resourceMax} min={1} max={5} step={0.1} param="resourceMax" color="emerald" />
              <Slider label="Regrow Rate" icon={<RotateCcw className="w-3 h-3" />} value={config.resourceRegrowRate} min={0.005} max={0.05} step={0.005} param="resourceRegrowRate" color="emerald" format={(v: number) => v.toFixed(3)} />
            </div>
          </section>
        )}

        {/* Advanced Behavior & Termination */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600 border-b border-zinc-800 pb-2">Advanced & Termination</h3>
          <div className="grid grid-cols-2 gap-4">
            <Slider label="Softmax Temp" icon={<Zap className="w-3 h-3" />} value={config.softmaxTemperature} min={0.1} max={1.5} step={0.1} param="softmaxTemperature" color="zinc" />
            <Slider label="Energy Decay" icon={<Battery className="w-3 h-3" />} value={config.energyDepletionRate} min={0.05} max={0.2} step={0.01} param="energyDepletionRate" color="zinc" />
            <Slider label="Stasis Thr" icon={<AlertCircle className="w-3 h-3" />} value={config.stasisThreshold} min={0.001} max={0.05} step={0.001} param="stasisThreshold" color="zinc" format={(v: number) => v.toFixed(3)} />
            <Slider label="Chaos Thr" icon={<AlertCircle className="w-3 h-3" />} value={config.chaosThreshold} min={1.0} max={10.0} step={0.5} param="chaosThreshold" color="zinc" format={(v: number) => v.toFixed(1)} />
            <Slider label="Stability Win" icon={<BarChart3 className="w-3 h-3" />} value={config.stabilityWindow} min={10} max={200} step={10} param="stabilityWindow" color="zinc" format={(v: number) => v.toFixed(0)} />
            <label className="block">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                <RotateCcw className="w-3 h-3" /> Adaptive
              </span>
              <button
                onClick={() => handleChange('softmaxAdaptive', !config.softmaxAdaptive)}
                className={`w-full px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                  config.softmaxAdaptive
                    ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                    : 'bg-zinc-800/50 border-zinc-700/50 text-zinc-500'
                }`}
              >
                {config.softmaxAdaptive ? 'ON' : 'OFF'}
              </button>
            </label>
          </div>
        </section>
      </div>

      <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex flex-wrap gap-2">
        <button
          onClick={onToggle}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-all mb-1 ${
            isRunning 
              ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700' 
              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
          }`}
        >
          {isRunning ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> Start</>}
        </button>
        
        <div className="grid grid-cols-3 gap-2 w-full">
          <button
            onClick={onReset}
            className="flex items-center justify-center p-2.5 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-all border border-zinc-700"
            title="Reset Simulation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => onExport('data_logger')}
            className="flex items-center justify-center p-2.5 bg-emerald-600/10 text-emerald-400 rounded-xl hover:bg-emerald-600/20 transition-all border border-emerald-500/30"
            title="Export Data Logger"
          >
            <ScrollText className="w-4 h-4" />
          </button>

          <button
            onClick={() => onExport('full')}
            className="flex items-center justify-center p-2.5 bg-indigo-600/10 text-indigo-400 rounded-xl hover:bg-indigo-600/20 transition-all border border-indigo-500/30"
            title="Export Full Dataset"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 w-full">
          <button
            onClick={() => onSave('data_logger')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/10 text-emerald-400 rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-emerald-600/20 transition-all border border-emerald-500/30"
            title="Archive Data Logger"
          >
            <ScrollText className="w-3.5 h-3.5" />
            Archive Logger
          </button>

          <button
            onClick={() => onSave('full')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-600/10 text-indigo-400 rounded-xl text-[9px] font-bold uppercase tracking-wider hover:bg-indigo-600/20 transition-all border border-indigo-500/30"
            title="Archive Full Dataset"
          >
            <Database className="w-3.5 h-3.5" />
            Archive Full
          </button>
        </div>
      </div>
    </div>
  );
};
