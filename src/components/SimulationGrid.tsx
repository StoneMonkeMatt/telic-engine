
import React from 'react';
import { AgentState } from '../simulation/types';

interface SimulationGridProps {
  gridSize: number;
  agents: AgentState[];
  resourceGrid?: number[][];
}

export const SimulationGrid: React.FC<SimulationGridProps> = ({ gridSize, agents, resourceGrid }) => {
  const cellSize = 100 / gridSize;

  return (
    <div className="relative aspect-square w-full border border-zinc-800 bg-zinc-950/50 rounded-xl overflow-hidden shadow-inner">
      {/* Resource Field Heatmap */}
      {resourceGrid && (
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
          {resourceGrid.map((row, x) => (
            row.map((val, y) => (
              <div 
                key={`${x}-${y}`}
                className="w-full h-full transition-colors duration-500"
                style={{ 
                  backgroundColor: `rgba(16, 185, 129, ${Math.min(0.3, val / 5)})`,
                }}
              />
            ))
          ))}
        </div>
      )}

      {/* Grid Lines */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `linear-gradient(to right, #3f3f46 1px, transparent 1px), linear-gradient(to bottom, #3f3f46 1px, transparent 1px)`,
          backgroundSize: `${cellSize}% ${cellSize}%`
        }}
      />
      
      {/* Agents */}
      {agents.map((agent) => (
        <div
          key={agent.agent_id}
          className="absolute flex items-center justify-center transition-all duration-300 ease-in-out"
          style={{
            left: `${(agent.x / gridSize) * 100}%`,
            top: `${(agent.y / gridSize) * 100}%`,
            width: `${cellSize}%`,
            height: `${cellSize}%`,
          }}
        >
          <div 
            className="relative group cursor-help"
            title={`Agent ${agent.agent_id}\nTelic: ${agent.telic}\nEnergy: ${agent.energy}`}
          >
            <div 
              className="w-full h-full flex items-center justify-center text-[10px] sm:text-xs font-mono"
              style={{ 
                color: `hsl(${Math.min(120, agent.energy * 10)}, 70%, 60%)`,
                textShadow: '0 0 8px currentColor'
              }}
            >
              {agent.symbol}
            </div>
            
            {/* Energy Bar */}
            <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-current transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (agent.energy / 12) * 100)}%`,
                  color: `hsl(${Math.min(120, agent.energy * 10)}, 70%, 60%)`
                }}
              />
            </div>
          </div>
        </div>
      ))}

      {agents.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm">
          <div className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
            System Extinct
          </div>
        </div>
      )}
    </div>
  );
};
