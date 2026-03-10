import React from 'react';
import { BookOpen, Globe, Users, Dna, Zap, Move, Battery, Heart, Leaf, BarChart3, FlaskConical, Info } from 'lucide-react';

export const UserGuide: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-100">User Configuration Guide v13</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 text-zinc-300 text-sm leading-relaxed">
        <section>
          <p className="text-zinc-400 italic mb-4">
            This guide documents all configurable parameters in the v13 scientific instrument.
            Use it to design rigorous experiments exploring the role of Φ (information structure) in emergent organisation.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Globe className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Grid & Environment</h4>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">GRID_SIZE (integer, default: 20)</div>
              <p className="mt-1">Dimensions of the simulation world. Larger grids allow more spatial dispersion; smaller grids force interaction.</p>
              <div className="text-[10px] text-zinc-500 mt-1">Range: 10–50 | Rec: 20 standard, 30+ for large populations.</div>
            </div>
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">TOROIDAL (boolean, default: True)</div>
              <p className="mt-1">Whether the grid wraps around. True eliminates boundary bias (preferred for science). False can trap agents in corners.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Users className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Population</h4>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">AGENT_COUNT (integer, default: 12)</div>
              <p className="mt-1">Initial number of agents spawned. Low (6–10) has high stochasticity; High (30+) provides stable populations.</p>
            </div>
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">SENESCENCE_AGE (integer, default: 300)</div>
              <p className="mt-1">Maximum age before an agent dies of old age. Prevents immortal agents and forces generational turnover.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Dna className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Evolution</h4>
          </div>
          <div className="space-y-4">
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">EVOLVE_PARAMS (boolean, default: True)</div>
              <p className="mt-1">Enable evolution of agent parameters (α, β, γ, δ, vision, temperature, Φ type). Natural selection in action.</p>
            </div>
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">MUTATION_RATE (float, default: 0.05)</div>
              <p className="mt-1">Probability that each numeric parameter mutates when inherited. 0.05 is balanced.</p>
            </div>
            <div>
              <div className="font-mono text-zinc-100 text-xs font-bold">PHI_MUTATION_RATE (float, default: 0.01)</div>
              <p className="mt-1">Probability that an offspring switches to a different Φ type. Allows the measure of structure to evolve.</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Zap className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Telic Equation: T = γ·I + δ·Φ − α·K + β·E</h4>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
              <span className="font-bold text-emerald-400">γ (GAMMA):</span> Weight of information state (I). Higher γ prioritises symbol learning.
            </div>
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
              <span className="font-bold text-indigo-400">δ (DELTA):</span> Weight of information structure (Φ). Key experimental variable.
            </div>
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
              <span className="font-bold text-rose-400">α (ALPHA):</span> Weight of complexity cost (K). Higher α causes agents to avoid neighbors.
            </div>
            <div className="p-3 bg-zinc-950/50 rounded-xl border border-zinc-800">
              <span className="font-bold text-amber-400">β (BETA):</span> Weight of energy (E). Higher β prioritises survival.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Move className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Φ (Information Structure) Types</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] font-mono border-collapse">
              <thead>
                <tr className="text-zinc-500 border-b border-zinc-800">
                  <th className="text-left py-2 pr-4">Type</th>
                  <th className="text-left py-2 pr-4">Description</th>
                  <th className="text-left py-2">Use Case</th>
                </tr>
              </thead>
              <tbody className="text-zinc-400">
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 font-bold text-zinc-200">SPATIAL</td>
                  <td className="py-2 pr-4">Local clustering coefficient.</td>
                  <td className="py-2">Spatial organisation.</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 font-bold text-zinc-200">INFORMATION</td>
                  <td className="py-2 pr-4">Shannon entropy of neighbor symbols.</td>
                  <td className="py-2">Measures diversity (Primary).</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 font-bold text-zinc-200">MUTUAL_INFO</td>
                  <td className="py-2 pr-4">Mutual info between self and neighbors.</td>
                  <td className="py-2">Pattern detection.</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 font-bold text-zinc-200">COND_ENTROPY</td>
                  <td className="py-2 pr-4">Predictability given own symbol.</td>
                  <td className="py-2">Predictive structure.</td>
                </tr>
                <tr className="border-b border-zinc-800/50">
                  <td className="py-2 pr-4 font-bold text-zinc-200">TRIPLET</td>
                  <td className="py-2 pr-4">Fraction of triad symbol matches.</td>
                  <td className="py-2">Homophily / triad closure.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Battery className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Energy Dynamics</h4>
          </div>
          <p>
            <span className="font-bold text-zinc-100">Metabolic Cost:</span> ENERGY_DEPLETION_RATE (default 0.08) is lost per step.
            <br />
            <span className="font-bold text-zinc-100">Foraging:</span> ENERGY_GAIN_RANGE (default 0.3–1.2) is gained per step.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Heart className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Reproduction</h4>
          </div>
          <p>
            Agents reproduce when energy exceeds <span className="font-bold text-zinc-100">REPRODUCTION_ENERGY_THRESHOLD</span> (default 12.0).
            Probability is density-dependent: <span className="font-mono text-zinc-100">BASE / (1 + n_neighbors)</span>.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <Leaf className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Resource Field</h4>
          </div>
          <p>
            Dynamic environment with Gaussian hotspots. Agents consume resources, which regrow at <span className="font-bold text-zinc-100">RESOURCE_REGROW_RATE</span>.
            Hotspots are defined by <span className="font-bold text-zinc-100">SIGMA</span> (width) and <span className="font-bold text-zinc-100">MAX</span> (intensity).
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <BarChart3 className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Output Metrics</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-zinc-800/30 py-1">
              <span className="font-mono text-[10px]">Cluster Persistence</span>
              <span className="text-[10px] text-zinc-500">Stability of clusters over time.</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/30 py-1">
              <span className="font-mono text-[10px]">Silhouette Score</span>
              <span className="text-[10px] text-zinc-500">Quality of spatial separation.</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/30 py-1">
              <span className="font-mono text-[10px]">Phylo Diversity</span>
              <span className="text-[10px] text-zinc-500">Lineage variety (roots/total).</span>
            </div>
            <div className="flex justify-between border-b border-zinc-800/30 py-1">
              <span className="font-mono text-[10px]">Symbol Entropy</span>
              <span className="text-[10px] text-zinc-500">Global behavioral diversity.</span>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-emerald-500 border-b border-emerald-500/20 pb-2">
            <FlaskConical className="w-4 h-4" />
            <h4 className="font-bold uppercase tracking-wider text-xs">Recommended Experiments</h4>
          </div>
          <ul className="list-disc list-inside space-y-2 text-xs">
            <li><span className="font-bold text-zinc-100">Baseline Sweep:</span> Vary γ [0.0 to 2.0] to see if Φ matters.</li>
            <li><span className="font-bold text-zinc-100">Φ Ablation:</span> Compare all 7 Φ types to find the most "organising".</li>
            <li><span className="font-bold text-zinc-100">Evolution Study:</span> Track Φ type distribution over 1000+ steps.</li>
          </ul>
        </section>

        <div className="pt-6 border-t border-zinc-800 flex items-center gap-2 text-[10px] text-zinc-500 italic">
          <Info className="w-3 h-3" />
          For publication-grade results, run at least 20 trials per condition.
        </div>
      </div>
    </div>
  );
};
