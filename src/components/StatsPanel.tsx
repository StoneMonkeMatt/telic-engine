
import React from 'react';
import { StepData, SimulationConfig } from '../simulation/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StatsPanelProps {
  history: StepData[];
  config: SimulationConfig;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ history, config }) => {
  const latest = history[history.length - 1];
  const currentSeed = config.seed || 'N/A';
  
  const chartData = history.slice(-50).map(h => ({
    step: h.step,
    telic: h.avg_telic,
    phi: h.avg_phi,
    energy: h.avg_energy
  }));

  const StatCard = ({ label, value, subValue, color }: { label: string, value: string | number, subValue?: string, color: string }) => (
    <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">{label}</div>
      <div className={`text-2xl font-mono ${color}`}>{value}</div>
      {subValue && <div className="text-[10px] font-mono text-zinc-600 mt-1">{subValue}</div>}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard 
          label="Avg Telic" 
          value={latest?.avg_telic.toFixed(2) || '0.00'} 
          color="text-emerald-400" 
        />
        <StatCard 
          label="Avg Phi" 
          value={latest?.avg_phi.toFixed(3) || '0.000'} 
          color="text-indigo-400" 
        />
        <StatCard 
          label="Agents" 
          value={latest?.alive_count || 0} 
          subValue={`Coord: ${latest?.emergence.movement_coordination || 0}`}
          color="text-zinc-100" 
        />
        <StatCard 
          label="Clusters" 
          value={latest?.emergence.cluster_count || 0} 
          subValue={`Max: ${latest?.emergence.largest_cluster_size || 0}`}
          color="text-zinc-100" 
        />
        <StatCard 
          label="Phylo Div" 
          value={latest?.emergence.phylo_diversity.toFixed(2) || '0.00'} 
          subValue={`Entropy: ${latest?.emergence.symbol_entropy.toFixed(2) || '0.00'}`}
          color="text-amber-400" 
        />
        <StatCard 
          label="Active Seed" 
          value={currentSeed} 
          subValue="Reproducibility Key"
          color="text-zinc-500" 
        />
      </div>

      <div className="h-64 w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">System Trajectory (Last 50 Steps)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="step" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '10px' }}
              itemStyle={{ padding: '0' }}
            />
            <Line type="monotone" dataKey="telic" stroke="#10b981" strokeWidth={2} dot={false} animationDuration={300} />
            <Line type="monotone" dataKey="phi" stroke="#6366f1" strokeWidth={2} dot={false} animationDuration={300} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
