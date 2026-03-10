
import { PhiType, SimulationConfig, AgentState, EmergenceData, StepData, GameOverReason, SimulationResult, GlobalStats } from './types';
import { TelicLogger } from './logger';

const SYMBOLS = ["◇", "◆", "○", "▲", "■"];
const SYMBOL_WEIGHTS: Record<string, number> = {
  "◇": 3.0,
  "◆": 2.0,
  "○": 1.0,
  "▲": 0.5,
  "■": 0.0
};

class Random {
  private seed: number;
  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  uniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  randint(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }
  choice<T>(arr: T[]): T {
    return arr[this.randint(0, arr.length - 1)];
  }
  gauss(mean: number, std: number): number {
    let u = 0, v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return mean + std * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
}

function toroidalManhattan(x1: number, y1: number, x2: number, y2: number, size: number): number {
  let dx = Math.abs(x1 - x2);
  let dy = Math.abs(y1 - y2);
  dx = Math.min(dx, size - dx);
  dy = Math.min(dy, size - dy);
  return dx + dy;
}

export class Agent {
  id: number;
  parent_id: number = -1;
  age: number = 0;
  birth_step: number = 0;
  death_step: number | null = null;
  founder_root_id: number;
  x: number;
  y: number;
  energy: number;
  info: number;
  symbol: string;
  phi_type: PhiType;
  
  // Evolvable parameters
  gamma: number;
  alpha: number;
  delta: number;
  beta: number;
  vision: number;
  temperature: number;
  use_softmax: boolean;
  adaptive: boolean;
  rng: Random;

  cachedNeighbors: Agent[] = [];
  positionHistory: [number, number][] = [];
  
  constructor(id: number, config: SimulationConfig, rng: Random, parent?: Agent, birthStep: number = 0) {
    this.id = id;
    this.phi_type = config.phiType;
    this.birth_step = birthStep;

    if (parent && config.evolveParams) {
      this.parent_id = parent.id;
      this.founder_root_id = parent.founder_root_id;
      this.gamma = this._mutate(parent.gamma, config, rng);
      this.alpha = this._mutate(parent.alpha, config, rng);
      this.delta = this._mutate(parent.delta, config, rng);
      this.beta = this._mutate(parent.beta, config, rng);
      this.vision = Math.max(1, Math.round(this._mutate(parent.vision, config, rng)));
      this.temperature = Math.max(0.1, this._mutate(parent.temperature, config, rng));
      this.use_softmax = parent.use_softmax;
      this.adaptive = parent.adaptive;
      
      if (rng.next() < config.phiMutationRate) {
        const others = Object.values(PhiType).filter(pt => pt !== parent.phi_type);
        this.phi_type = rng.choice(others);
      } else {
        this.phi_type = parent.phi_type;
      }

      const dx = rng.randint(-config.maxOffspringDist, config.maxOffspringDist);
      const dy = rng.randint(-config.maxOffspringDist, config.maxOffspringDist);
      if (config.toroidal) {
        this.x = (parent.x + dx + config.gridSize) % config.gridSize;
        this.y = (parent.y + dy + config.gridSize) % config.gridSize;
      } else {
        this.x = Math.max(0, Math.min(config.gridSize - 1, parent.x + dx));
        this.y = Math.max(0, Math.min(config.gridSize - 1, parent.y + dy));
      }
    } else {
      this.parent_id = -1;
      this.founder_root_id = id;
      this.gamma = config.gamma;
      this.alpha = config.alpha;
      this.delta = config.delta;
      this.beta = config.beta;
      this.vision = config.visionRange;
      this.temperature = config.softmaxTemperature;
      this.use_softmax = config.useSoftmax;
      this.adaptive = config.softmaxAdaptive;
      this.x = rng.randint(0, config.gridSize - 1);
      this.y = rng.randint(0, config.gridSize - 1);
    }

    this.energy = rng.uniform(config.initialEnergyRange[0], config.initialEnergyRange[1]);
    this.info = rng.next();
    this.symbol = rng.choice(SYMBOLS);
    this.rng = rng;
  }

  private _mutate(value: number, config: SimulationConfig, rng: Random): number {
    if (rng.next() < config.mutationRate) {
      return value * (1 + rng.gauss(0, config.mutationStd));
    }
    return value;
  }

  getNeighbors(allAgents: Agent[], config: SimulationConfig, useCache: boolean = false): Agent[] {
    if (useCache) return this.cachedNeighbors;
    const vision = this.vision;
    const size = config.gridSize;
    const toroidal = config.toroidal;

    return allAgents.filter(a => {
      if (a.id === this.id) return false;
      if (toroidal) {
        return toroidalManhattan(this.x, this.y, a.x, a.y, size) <= vision;
      }
      return Math.abs(a.x - this.x) <= vision && Math.abs(a.y - this.y) <= vision;
    });
  }

  updateNeighborCache(allAgents: Agent[], config: SimulationConfig) {
    this.cachedNeighbors = this.getNeighbors(allAgents, config, false);
  }

  private _computeEntropy(symbols: string[]): number {
    if (symbols.length < 2) return 0;
    const counts: Record<string, number> = {};
    symbols.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const total = symbols.length;
    let entropy = 0;
    Object.values(counts).forEach(count => {
      const p = count / total;
      if (p > 0) entropy -= p * Math.log2(p);
    });
    const maxEntropy = Math.log2(SYMBOLS.length);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  computePhi(allAgents: Agent[], config: SimulationConfig, rng: Random, useCache: boolean = false): number {
    const phiType = this.phi_type;
    if (phiType === PhiType.NONE) return 0;
    
    const neighbors = this.getNeighbors(allAgents, config, useCache);
    if (phiType === PhiType.RANDOM) return rng.next();

    if (phiType === PhiType.SPATIAL) {
      const group = [this, ...neighbors];
      if (group.length < 2) return 0;
      let links = 0;
      const vision = this.vision;
      const size = config.gridSize;
      const toroidal = config.toroidal;
      for (let i = 0; i < group.length; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const a = group[i];
          const b = group[j];
          const dist = toroidal ? toroidalManhattan(a.x, a.y, b.x, b.y, size) : Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (dist <= vision) links++;
        }
      }
      const possible = (group.length * (group.length - 1)) / 2;
      return links / possible;
    }

    if (phiType === PhiType.INFORMATION) {
      const neighborSymbols = [this.symbol, ...neighbors.map(n => n.symbol)];
      return this._computeEntropy(neighborSymbols);
    }

    if (phiType === PhiType.MUTUAL_INFO) {
      if (neighbors.length < 2) return 0;
      const neighborSymbols = neighbors.map(n => n.symbol);
      const jointCounts: Record<string, number> = {};
      const pNei: Record<string, number> = {};
      neighborSymbols.forEach(ns => {
        const key = `${this.symbol}|${ns}`;
        jointCounts[key] = (jointCounts[key] || 0) + 1;
        pNei[ns] = (pNei[ns] || 0) + 1;
      });
      const total = neighborSymbols.length;
      let mi = 0;
      Object.keys(pNei).forEach(ns => pNei[ns] /= total);
      Object.entries(jointCounts).forEach(([key, count]) => {
        const [sSelf, sNei] = key.split('|');
        const pJoint = count / total;
        if (pJoint > 0 && pNei[sNei] > 0) {
          mi += pJoint * Math.log2(pJoint / (1.0 * pNei[sNei]));
        }
      });
      const maxMi = Math.log2(SYMBOLS.length);
      return maxMi > 0 ? Math.max(0, mi / maxMi) : 0;
    }

    if (phiType === PhiType.COND_ENTROPY) {
      if (neighbors.length < 2) return 0;
      const matching = neighbors.filter(n => n.symbol === this.symbol);
      const nonMatching = neighbors.filter(n => n.symbol !== this.symbol);
      const pMatch = matching.length / neighbors.length;
      const entMatch = this._computeEntropy(matching.map(n => n.symbol));
      const entNon = this._computeEntropy(nonMatching.map(n => n.symbol));
      const condEnt = pMatch * entMatch + (1 - pMatch) * entNon;
      return 1.0 - condEnt;
    }

    if (phiType === PhiType.TRIPLET) {
      if (neighbors.length < 2) return 0;
      let triads = 0;
      let allSame = 0;
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          triads++;
          if (this.symbol === neighbors[i].symbol && this.symbol === neighbors[j].symbol) {
            allSame++;
          }
        }
      }
      return triads > 0 ? allSame / triads : 0;
    }

    return 0;
  }

  computeComplexityCost(config: SimulationConfig, allAgents: Agent[]): number {
    // K = number of neighbors (coordination cost)
    return this.getNeighbors(allAgents, config, false).length;
  }

  computeTelicValue(allAgents: Agent[], config: SimulationConfig, rng: Random, useCache: boolean = false): number {
    const I = this.info;
    const Phi = this.computePhi(allAgents, config, rng, useCache);
    const E = this.energy;
    const K = this.computeComplexityCost(config, allAgents);
    // v13 Standard: T = γ·I + δ·Φ - α·K + β·E
    return (this.gamma * I + this.delta * Phi - this.alpha * K + this.beta * E);
  }

  chooseBestMove(allAgents: Agent[], config: SimulationConfig, rng: Random): [number, number] {
    const origX = this.x;
    const origY = this.y;
    const moves: [number, number][] = [[0, 0]];
    const speed = config.moveSpeed;
    
    for (let dx = -speed; dx <= speed; dx++) {
      for (let dy = -speed; dy <= speed; dy++) {
        if (dx !== 0 || dy !== 0) moves.push([dx, dy]);
      }
    }

    const scores: { score: number, dx: number, dy: number }[] = [];
    for (const [dx, dy] of moves) {
      let newX = origX + dx;
      let newY = origY + dy;
      if (config.toroidal) {
        newX = (newX + config.gridSize) % config.gridSize;
        newY = (newY + config.gridSize) % config.gridSize;
      } else {
        newX = Math.max(0, Math.min(config.gridSize - 1, newX));
        newY = Math.max(0, Math.min(config.gridSize - 1, newY));
      }
      this.x = newX;
      this.y = newY;
      const score = this.computeTelicValue(allAgents, config, rng, true);
      scores.push({ score, dx, dy });
    }

    this.x = origX;
    this.y = origY;

    if (this.use_softmax) {
      let temperature = this.temperature;
      if (this.adaptive && scores.length > 1) {
        const vals = scores.map(s => s.score);
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const variance = vals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / vals.length;
        const spread = Math.sqrt(variance) || 1.0;
        temperature *= spread;
      }

      const maxS = Math.max(...scores.map(s => s.score));
      const expScores = scores.map(s => Math.exp((s.score - maxS) / temperature));
      const total = expScores.reduce((a, b) => a + b, 0);
      const probs = expScores.map(e => e / total);
      
      let r = rng.next();
      let cumulative = 0;
      for (let i = 0; i < probs.length; i++) {
        cumulative += probs[i];
        if (r <= cumulative) return [scores[i].dx, scores[i].dy];
      }
      return [scores[0].dx, scores[0].dy];
    } else {
      const best = scores.reduce((prev, curr) => curr.score > prev.score ? curr : prev);
      return [best.dx, best.dy];
    }
  }

  move(allAgents: Agent[], config: SimulationConfig, rng: Random, localResource: number, onDeplete: (x: number, y: number, amount: number) => void) {
    const [dx, dy] = this.chooseBestMove(allAgents, config, rng);
    if (config.toroidal) {
      this.x = (this.x + dx + config.gridSize) % config.gridSize;
      this.y = (this.y + dy + config.gridSize) % config.gridSize;
    } else {
      this.x = Math.max(0, Math.min(config.gridSize - 1, this.x + dx));
      this.y = Math.max(0, Math.min(config.gridSize - 1, this.y + dy));
    }
    this.symbol = rng.choice(SYMBOLS);
    
    // Update info
    this.info += SYMBOL_WEIGHTS[this.symbol] * 0.1; // INFO_LEARNING_RATE
    this.info *= (1 - 0.02); // INFO_DECAY_RATE
    this.info = Math.max(0, Math.min(1, this.info));

    // Update energy
    this.energy -= config.energyDepletionRate;
    const baseGain = rng.uniform(config.energyGainRange[0], config.energyGainRange[1]);
    const consumed = localResource * config.resourceConsumptionFraction;
    this.energy += baseGain + consumed;
    this.energy = Math.max(0, this.energy);
    if (consumed > 0) onDeplete(this.x, this.y, consumed);
    
    this.age++;
  }

  recordState(allAgents: Agent[], config: SimulationConfig, rng: Random): AgentState {
    const telic = this.computeTelicValue(allAgents, config, rng, false);
    const phi = this.computePhi(allAgents, config, rng, false);
    
    return {
      agent_id: this.id,
      parent_id: this.parent_id,
      age: this.age,
      x: this.x,
      y: this.y,
      energy: Number(this.energy.toFixed(2)),
      info: Number(this.info.toFixed(2)),
      phi: Number(phi.toFixed(3)),
      telic: Number(telic.toFixed(2)),
      symbol: this.symbol,
      phi_type: this.phi_type,
      gamma: Number(this.gamma.toFixed(2)),
      alpha: Number(this.alpha.toFixed(2)),
      delta: Number(this.delta.toFixed(2)),
      beta: Number(this.beta.toFixed(2)),
      vision: this.vision,
      temperature: Number(this.temperature.toFixed(2))
    };
  }
}

export class TelicSimulation {
  config: SimulationConfig;
  agents: Agent[];
  stepCount: number = 0;
  history: StepData[] = [];
  rng: Random;
  gameOver: boolean = false;
  gameOverReason: GameOverReason | null = null;
  telicValuesHistory: number[] = [];
  phiHistory: number[] = [];
  energyHistory: number[] = [];
  neighborDistanceHistory: number[] = [];
  clusterCountHistory: number[] = [];
  clusterPersistenceHistory: number[] = [];
  silhouetteScoreHistory: number[] = [];
  phyloDiversityHistory: number[] = [];
  symbolEntropyHistory: number[] = [];
  avgGammaHistory: number[] = [];
  startTime: number;
  dataLogger: TelicLogger;
  experiment_info: {
    name: string;
    timestamp: string;
    config: SimulationConfig;
    config_hash: string;
  };
  
  nextAgentId: number = 0;
  allAgentsEver: Agent[] = [];
  lineageMap: Map<number, number> = new Map(); // childId -> parentId
  initialAgentCount: number;

  resourceGrid: number[][] = [];
  initialResourceGrid: number[][] = [];

  constructor(config: SimulationConfig) {
    this.config = config;
    this.rng = new Random(config.seed);
    this.nextAgentId = 0;
    this.initialAgentCount = config.agentCount;
    this.agents = Array.from({ length: config.agentCount }, () => {
      const id = this.nextAgentId++;
      const agent = new Agent(id, config, this.rng);
      this.allAgentsEver.push(agent);
      return agent;
    });
    this.startTime = Date.now();
    const ts = new Date(this.startTime).toISOString();
    const tsName = ts.replace(/[:.]/g, '-');
    
    // Simple hash for config
    const configStr = JSON.stringify(config);
    let hash = 0;
    for (let i = 0; i < configStr.length; i++) {
      const char = configStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const configHash = Math.abs(hash).toString(16).padStart(16, '0').slice(-16).toUpperCase();

    this.experiment_info = {
      name: `telic_exp_${tsName}`,
      timestamp: ts,
      config: config,
      config_hash: configHash
    };

    this.dataLogger = new TelicLogger(this.experiment_info.name, config);
    
    if (config.resourceField) {
      this.initResourceField();
    }
    
    this.updateAllCaches();
  }

  private initResourceField() {
    const size = this.config.gridSize;
    this.resourceGrid = Array.from({ length: size }, () => Array(size).fill(0));
    this.initialResourceGrid = Array.from({ length: size }, () => Array(size).fill(0));
    
    const hotspots = Array.from({ length: this.config.resourceHotspots }, () => ({
      x: this.rng.uniform(0, size - 1),
      y: this.rng.uniform(0, size - 1)
    }));

    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        let val = 0;
        hotspots.forEach(h => {
          let dx = Math.abs(x - h.x);
          let dy = Math.abs(y - h.y);
          if (this.config.toroidal) {
            dx = Math.min(dx, size - dx);
            dy = Math.min(dy, size - dy);
          }
          const d2 = dx * dx + dy * dy;
          val += this.config.resourceMax * Math.exp(-d2 / (2 * Math.pow(this.config.resourceSigma, 2)));
        });
        const finalVal = Math.min(val, this.config.resourceMax * 1.5);
        this.resourceGrid[x][y] = finalVal;
        this.initialResourceGrid[x][y] = finalVal;
      }
    }
  }

  private regrowResources() {
    const size = this.config.gridSize;
    for (let x = 0; x < size; x++) {
      for (let y = 0; y < size; y++) {
        const deficit = this.initialResourceGrid[x][y] - this.resourceGrid[x][y];
        this.resourceGrid[x][y] += deficit * this.config.resourceRegrowRate;
      }
    }
  }

  private updateAllCaches() {
    this.agents.forEach(a => a.updateNeighborCache(this.agents, this.config));
  }

  step(): StepData {
    const preStats = this.getGlobalStats();
    this.stepCount++;
    
    if (this.config.resourceField) {
      this.regrowResources();
    }

    // 1. Shuffle
    for (let i = this.agents.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [this.agents[i], this.agents[j]] = [this.agents[j], this.agents[i]];
    }

    // 2. Move
    this.agents.forEach(a => {
      a.positionHistory.push([a.x, a.y]); // Record current position before move
      const res = this.config.resourceField ? this.resourceGrid[a.x][a.y] : 0;
      a.move(this.agents, this.config, this.rng, res, (x, y, amt) => {
        if (this.config.resourceField) this.resourceGrid[x][y] = Math.max(0, this.resourceGrid[x][y] - amt);
      });
    });

    // 3. Remove dead
    this.agents.forEach(a => {
      if (a.energy <= 0 || a.age >= this.config.senescenceAge) {
        a.death_step = this.stepCount;
      }
    });
    this.agents = this.agents.filter(a => a.energy > 0 && a.age < this.config.senescenceAge);

    // 4. Reproduce
    if (this.config.reproductionEnabled) {
      const offspring: Agent[] = [];
      this.agents.forEach(agent => {
        const neighbors = agent.getNeighbors(this.agents, this.config, true);
        const densityFactor = 1.0 / (1.0 + neighbors.length);
        const prob = this.config.reproductionProbBase * densityFactor;
        if (agent.energy > this.config.reproductionEnergyThreshold && this.rng.next() < prob) {
          const childId = this.nextAgentId++;
          const child = new Agent(childId, this.config, this.rng, agent, this.stepCount);
          child.energy = agent.energy * 0.45;
          agent.energy *= 0.55;
          this.lineageMap.set(childId, agent.id);
          offspring.push(child);
          this.allAgentsEver.push(child);
        }
      });
      this.agents.push(...offspring);
    }

    // 5. Update cache
    this.updateAllCaches();

    // 6. Record
    const emergence = this.detectEmergence();
    const postStats = this.getGlobalStats();
    // Fill emergence stats into postStats
    postStats.cluster_count = emergence.cluster_count;
    postStats.largest_cluster_size = emergence.largest_cluster_size;
    postStats.cluster_persistence = emergence.cluster_persistence;
    postStats.phylo_diversity = emergence.phylo_diversity;
    postStats.symbol_entropy = emergence.symbol_entropy;

    const agentStates = this.agents.map(a => a.recordState(this.agents, this.config, this.rng));
    
    this.telicValuesHistory.push(postStats.avg_telic);
    this.phiHistory.push(postStats.avg_phi);
    this.energyHistory.push(postStats.avg_energy);
    this.neighborDistanceHistory.push(postStats.avg_neighbor_distance);
    this.clusterCountHistory.push(postStats.cluster_count);
    this.clusterPersistenceHistory.push(postStats.cluster_persistence);
    this.silhouetteScoreHistory.push(postStats.silhouette_score);
    this.phyloDiversityHistory.push(postStats.phylo_diversity);
    this.symbolEntropyHistory.push(postStats.symbol_entropy);
    this.avgGammaHistory.push(postStats.avg_gamma);

    const stepData: StepData = {
      step: this.stepCount,
      alive_count: this.agents.length,
      avg_telic: postStats.avg_telic,
      avg_phi: postStats.avg_phi,
      avg_energy: postStats.avg_energy,
      agents: agentStates,
      emergence: emergence,
      resource_grid: this.config.resourceField ? this.resourceGrid.map(row => [...row]) : undefined,
      pre_stats: preStats,
      post_stats: postStats
    };

    this.history.push(stepData);
    this.dataLogger.logStep(this.stepCount, this.agents, postStats, emergence);
    this.sampleLandscape(this.stepCount);
    this.checkGameOver();
    
    return stepData;
  }

  sampleLandscape(step: number, res: number = 20) {
    if (!this.dataLogger) return;
    const gridSize = this.config.gridSize;
    const resolution = Math.max(2, Math.min(res, gridSize));
    
    // Create a dummy agent to probe the landscape
    const dummy = new Agent(-999, this.config, this.rng);
    dummy.info = 0.5;
    dummy.energy = 10.0;
    dummy.symbol = SYMBOLS[0];

    const xs = Array.from({ length: resolution }, (_, i) => (i * (gridSize - 1)) / (resolution - 1));
    const ys = Array.from({ length: resolution }, (_, i) => (i * (gridSize - 1)) / (resolution - 1));

    for (const x of xs) {
      for (const y of ys) {
        dummy.x = x;
        dummy.y = y;
        const allAgents = [dummy, ...this.agents];
        const telic = dummy.computeTelicValue(allAgents, this.config, this.rng);
        const phi = dummy.computePhi(allAgents, this.config, this.rng);
        const neighbors = dummy.getNeighbors(this.agents, this.config);
        const max_n = Math.pow(2 * dummy.vision + 1, 2) - 1;
        
        this.dataLogger.logSample(
          step, x, y, telic, phi, dummy.energy, dummy.info,
          dummy.computeComplexityCost(this.config, allAgents),
          neighbors.length, neighbors.map(n => n.symbol),
          max_n > 0 ? neighbors.length / max_n : 0
        );
      }
    }
    this.dataLogger.computeField(step);
  }

  getGlobalStats(): GlobalStats {
    const agentStates = this.agents.map(a => a.recordState(this.agents, this.config, this.rng));
    const n = this.agents.length;
    
    if (n === 0) {
      return {
        step: this.stepCount,
        agent_count: 0,
        avg_telic: 0,
        std_telic: 0,
        min_telic: 0,
        max_telic: 0,
        avg_phi: 0,
        avg_energy: 0,
        avg_info: 0,
        spatial_clustering: 0,
        total_energy: 0,
        alive_agents: 0,
        avg_neighbor_distance: 0,
        cluster_count: 0,
        largest_cluster_size: 0,
        cluster_persistence: 0,
        silhouette_score: 0, 
        phylo_diversity: 0,
        phi_type_counts: {},
        symbol_entropy: 0,
        avg_gamma: 0,
        avg_alpha: 0,
        avg_beta: 0,
        avg_delta: 0,
        avg_vision: 0,
        avg_temperature: 0
      };
    }

    const telics = agentStates.map(a => a.telic);
    const avgTelic = telics.reduce((a, b) => a + b, 0) / n;
    const stdTelic = Math.sqrt(telics.reduce((a, b) => a + Math.pow(b - avgTelic, 2), 0) / n);
    
    const phiTypeCounts: Record<string, number> = {};
    this.agents.forEach(a => {
      phiTypeCounts[a.phi_type] = (phiTypeCounts[a.phi_type] || 0) + 1;
    });

    // Avg neighbor distance
    let avgNeighborDist = 0;
    if (n > 1) {
      const dists = this.agents.map(a => {
        let minDist = Infinity;
        this.agents.forEach(b => {
          if (a.id === b.id) return;
          const d = this.config.toroidal 
            ? toroidalManhattan(a.x, a.y, b.x, b.y, this.config.gridSize)
            : Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
          if (d < minDist) minDist = d;
        });
        return minDist;
      });
      avgNeighborDist = dists.reduce((a, b) => a + b, 0) / n;
    }

    const uniquePositions = new Set(this.agents.map(a => `${a.x},${a.y}`)).size;

    return {
      step: this.stepCount,
      agent_count: n,
      avg_telic: avgTelic,
      std_telic: stdTelic,
      min_telic: Math.min(...telics),
      max_telic: Math.max(...telics),
      avg_phi: agentStates.reduce((a, b) => a + b.phi, 0) / n,
      avg_energy: agentStates.reduce((a, b) => a + b.energy, 0) / n,
      avg_info: agentStates.reduce((a, b) => a + b.info, 0) / n,
      spatial_clustering: uniquePositions / n,
      total_energy: agentStates.reduce((a, b) => a + b.energy, 0),
      alive_agents: n,
      avg_neighbor_distance: avgNeighborDist,
      cluster_count: 0, // Filled later if needed
      largest_cluster_size: 0,
      cluster_persistence: 0,
      silhouette_score: 0, 
      phylo_diversity: 0,
      phi_type_counts: phiTypeCounts,
      symbol_entropy: 0,
      avg_gamma: agentStates.reduce((a, b) => a + b.gamma, 0) / n,
      avg_alpha: agentStates.reduce((a, b) => a + b.alpha, 0) / n,
      avg_beta: agentStates.reduce((a, b) => a + b.beta, 0) / n,
      avg_delta: agentStates.reduce((a, b) => a + b.delta, 0) / n,
      avg_vision: agentStates.reduce((a, b) => a + b.vision, 0) / n,
      avg_temperature: agentStates.reduce((a, b) => a + b.temperature, 0) / n
    };
  }

  getResults(): SimulationResult {
    const finalStats = this.getGlobalStats();
    
    const mappedConfig: Record<string, any> = {
      GRID_SIZE: this.config.gridSize,
      AGENT_COUNT: this.config.agentCount,
      MAX_STEPS: this.config.maxSteps,
      TOROIDAL: this.config.toroidal,
      VISION_RANGE: this.config.visionRange,
      MOVE_SPEED: this.config.moveSpeed,
      USE_SOFTMAX: this.config.useSoftmax,
      SOFTMAX_TEMPERATURE: this.config.softmaxTemperature,
      SOFTMAX_ADAPTIVE: this.config.softmaxAdaptive,
      ALPHA: this.config.alpha,
      GAMMA: this.config.gamma,
      DELTA: this.config.delta,
      BETA: this.config.beta,
      PHI_TYPE: this.config.phiType,
      EVOLVE_PARAMS: this.config.evolveParams,
      MUTATION_RATE: this.config.mutationRate,
      MUTATION_STD: this.config.mutationStd,
      PHI_MUTATION_RATE: this.config.phiMutationRate,
      ENERGY_DEPLETION_RATE: this.config.energyDepletionRate,
      ENERGY_GAIN_RANGE: this.config.energyGainRange,
      INITIAL_ENERGY_RANGE: this.config.initialEnergyRange,
      RESOURCE_FIELD: this.config.resourceField,
      RESOURCE_HOTSPOTS: this.config.resourceHotspots,
      RESOURCE_SIGMA: this.config.resourceSigma,
      RESOURCE_MAX: this.config.resourceMax,
      RESOURCE_REGROW_RATE: this.config.resourceRegrowRate,
      RESOURCE_CONSUMPTION_FRACTION: this.config.resourceConsumptionFraction,
      REPRODUCTION_ENABLED: this.config.reproductionEnabled,
      REPRODUCTION_ENERGY_THRESHOLD: this.config.reproductionEnergyThreshold,
      REPRODUCTION_PROB_BASE: this.config.reproductionProbBase,
      MAX_OFFSPRING_DIST: this.config.maxOffspringDist,
      SENESCENCE_AGE: this.config.senescenceAge,
      SYMBOLS: SYMBOLS,
      SYMBOL_WEIGHTS: SYMBOL_WEIGHTS,
      INFO_LEARNING_RATE: 0.1,
      INFO_DECAY_RATE: 0.02,
      STASIS_THRESHOLD: this.config.stasisThreshold,
      CHAOS_THRESHOLD: this.config.chaosThreshold,
      STABILITY_WINDOW: this.config.stabilityWindow,
      CLUSTER_STABILITY_WINDOW: 20,
      SEED: this.config.seed
    };

    let phiCorr = 0;
    if (this.telicValuesHistory.length > 1) {
      const meanT = this.telicValuesHistory.reduce((a, b) => a + b, 0) / this.telicValuesHistory.length;
      const meanP = this.phiHistory.reduce((a, b) => a + b, 0) / this.phiHistory.length;
      let num = 0;
      let denT = 0;
      let denP = 0;
      for (let i = 0; i < this.telicValuesHistory.length; i++) {
        const dt = this.telicValuesHistory[i] - meanT;
        const dp = this.phiHistory[i] - meanP;
        num += dt * dp;
        denT += dt * dt;
        denP += dp * dp;
      }
      phiCorr = denT > 0 && denP > 0 ? num / Math.sqrt(denT * denP) : 0;
    }

    return {
      experiment_info: this.experiment_info,
      reproducibility: {
        rng_state: "seed=" + this.config.seed,
        agent_counter_at_start: 0
      },
      game_over: {
        reason: this.gameOverReason || "unknown",
        step: this.stepCount,
        elapsed_time: (Date.now() - this.startTime) / 1000
      },
      summary: {
        initial_agents: this.initialAgentCount,
        final_agents: finalStats.alive_agents,
        final_avg_telic: finalStats.avg_telic,
        final_avg_phi: finalStats.avg_phi,
        final_avg_neighbor_distance: finalStats.avg_neighbor_distance,
        final_cluster_count: finalStats.cluster_count,
        final_cluster_persistence: finalStats.cluster_persistence,
        final_silhouette_score: finalStats.silhouette_score,
        final_phylo_diversity: finalStats.phylo_diversity,
        final_symbol_entropy: finalStats.symbol_entropy,
        final_phi_type_counts: finalStats.phi_type_counts,
        max_telic_achieved: Math.max(...this.telicValuesHistory, 0),
        min_telic_achieved: Math.min(...this.telicValuesHistory, 0),
        telic_volatility: Math.sqrt(this.telicValuesHistory.reduce((a, b) => a + Math.pow(b - finalStats.avg_telic, 2), 0) / this.telicValuesHistory.length) || 0,
        phi_correlation: phiCorr
      },
      trajectories: {
        telic: this.telicValuesHistory,
        phi: this.phiHistory,
        energy: this.energyHistory,
        neighbor_distance: this.neighborDistanceHistory,
        cluster_count: this.clusterCountHistory,
        cluster_persistence: this.clusterPersistenceHistory,
        silhouette_score: this.silhouetteScoreHistory,
        phylo_diversity: this.phyloDiversityHistory,
        symbol_entropy: this.symbolEntropyHistory,
        avg_gamma: this.avgGammaHistory
      },
      step_data: this.history.map(h => ({
        step: h.step,
        pre_stats: h.pre_stats!,
        post_stats: h.post_stats!,
        agents: h.agents,
        alive_count: h.alive_count,
        emergence: h.emergence,
        game_over: h.step === this.stepCount && this.gameOver,
        game_over_reason: h.step === this.stepCount ? this.gameOverReason || undefined : undefined
      })),
      scientific_data: this.dataLogger.getResults()
    };
  }

  getScientificResults() {
    const finalStats = this.getGlobalStats();
    
    // Calculate founder dominance index
    const rootCounts: Record<number, number> = {};
    this.agents.forEach(a => {
      rootCounts[a.founder_root_id] = (rootCounts[a.founder_root_id] || 0) + 1;
    });
    const totalAgents = this.agents.length;
    let founderDominance = 0;
    if (totalAgents > 0) {
      const maxCount = Math.max(...Object.values(rootCounts));
      founderDominance = maxCount / totalAgents;
    }

    // Calculate avg phi stability (simple variance of phi over last window)
    const window = Math.min(50, this.phiHistory.length);
    const recentPhi = this.phiHistory.slice(-window);
    const meanPhi = recentPhi.reduce((a, b) => a + b, 0) / recentPhi.length;
    const phiStability = 1 - (recentPhi.reduce((a, b) => a + Math.pow(b - meanPhi, 2), 0) / recentPhi.length || 0);

    return {
      metadata: {
        experiment_name: this.experiment_info.name,
        v13_production_ready: true,
        timestamp: this.experiment_info.timestamp,
        config_hash: this.experiment_info.config_hash,
        rng_seed_state: [this.config.seed],
        parameters: {
          PHI_TYPE_DEFAULT: this.config.phiType,
          MUTATION_RATE: this.config.mutationRate,
          REPRO_THRESHOLD: this.config.reproductionEnergyThreshold,
          RESOURCE_REGROW_RATE: this.config.resourceRegrowRate,
          GRID_SIZE: this.config.gridSize,
          AGENT_COUNT: this.config.agentCount,
          VISION_RANGE: this.config.visionRange
        }
      },
      final_state: {
        steps_completed: this.stepCount,
        termination_reason: this.gameOverReason || "active",
        global_symbol_entropy: finalStats.symbol_entropy,
        founder_dominance_index: founderDominance,
        avg_phi_stability: phiStability
      },
      global_trajectories: {
        avg_telic: this.telicValuesHistory,
        avg_phi: this.phiHistory,
        avg_energy: this.energyHistory,
        agent_count: this.history.map(h => h.alive_count),
        symbol_entropy: this.symbolEntropyHistory,
        cluster_count: this.clusterCountHistory
      },
      lineage_tree: this.allAgentsEver.map(a => ({
        agent_id: a.id,
        parent_id: a.parent_id,
        birth_step: a.birth_step,
        death_step: a.death_step,
        founder_root_id: a.founder_root_id
      })),
      step_data: this.history.map(h => ({
        step: h.step,
        global_stats: h.post_stats,
        agents: h.agents.map(a => ({
          id: a.agent_id,
          pos: [a.x, a.y],
          phi: a.phi,
          phi_type: a.phi_type,
          energy: a.energy,
          evolved_params: {
            alpha: a.alpha,
            gamma: a.gamma,
            beta: a.beta,
            vision: a.vision
          }
        }))
      }))
    };
  }

  private detectEmergence(): EmergenceData {
    if (this.agents.length < 2) {
      return { cluster_count: 0, largest_cluster_size: 0, movement_coordination: 0, oscillation_detected: false, territorial_behavior: false, cluster_persistence: 0, phylo_diversity: 0, symbol_entropy: 0 };
    }

    // Clustering
    const visited = new Set<number>();
    const clusters: number[][] = [];
    const positions = this.agents.map(a => ({ x: a.x, y: a.y, id: a.id }));
    const size = this.config.gridSize;
    const toroidal = this.config.toroidal;

    const dfs = (idx: number, cluster: number[]) => {
      visited.add(idx);
      cluster.push(idx);
      const p1 = positions[idx];
      for (let j = 0; j < positions.length; j++) {
        if (!visited.has(j)) {
          const p2 = positions[j];
          const dist = toroidal ? toroidalManhattan(p1.x, p1.y, p2.x, p2.y, size) : Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
          if (dist <= 1) {
            dfs(j, cluster);
          }
        }
      }
    };

    for (let i = 0; i < positions.length; i++) {
      if (!visited.has(i)) {
        const cluster: number[] = [];
        dfs(i, cluster);
        if (cluster.length > 1) clusters.push(cluster);
      }
    }

    const clusterCount = clusters.length;
    const largestClusterSize = clusters.length > 0 ? Math.max(...clusters.map(c => c.length)) : 0;

    // Cluster persistence
    let clusterPersistence = 0;
    if (clusters.length > 0) {
      const variances = clusters.map(cl => {
        const xs = cl.map(i => positions[i].x);
        const ys = cl.map(i => positions[i].y);
        const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
        const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
        const varX = xs.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / xs.length;
        const varY = ys.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / ys.length;
        return (varX + varY) / 2;
      });
      clusterPersistence = 1.0 / (1.0 + variances.reduce((a, b) => a + b, 0) / variances.length);
    }

    // Phylogenetic diversity (roots / total)
    // Find absolute roots for all current agents
    const findRoot = (id: number): number => {
      let current = id;
      while (this.lineageMap.has(current)) {
        current = this.lineageMap.get(current)!;
      }
      return current;
    };
    const roots = new Set(this.agents.map(a => findRoot(a.id)));
    const phyloDiversity = roots.size / this.agents.length;

    // Symbol entropy
    const symbolCounts: Record<string, number> = {};
    this.agents.forEach(a => symbolCounts[a.symbol] = (symbolCounts[a.symbol] || 0) + 1);
    let symbolEntropy = 0;
    Object.values(symbolCounts).forEach(c => {
      const p = c / this.agents.length;
      if (p > 0) symbolEntropy -= p * Math.log2(p);
    });
    const maxEnt = Math.log2(SYMBOLS.length);
    symbolEntropy = maxEnt > 0 ? symbolEntropy / maxEnt : 0;

    // Movement coordination
    let movementCoordination = 0;
    if (this.stepCount > 1) {
      const dirVectors: { dx: number, dy: number }[] = [];
      this.agents.forEach(a => {
        if (a.positionHistory.length >= 1) {
          const prev = a.positionHistory[a.positionHistory.length - 1];
          let dx = a.x - prev[0];
          let dy = a.y - prev[1];
          if (toroidal) {
            if (Math.abs(dx) > size / 2) dx = -Math.sign(dx) * (size - Math.abs(dx));
            if (Math.abs(dy) > size / 2) dy = -Math.sign(dy) * (size - Math.abs(dy));
          }
          const mag = Math.hypot(dx, dy);
          if (mag > 0) dirVectors.push({ dx: dx / mag, dy: dy / mag });
        }
      });

      if (dirVectors.length > 1) {
        let totalDot = 0;
        let count = 0;
        for (let i = 0; i < dirVectors.length; i++) {
          for (let j = i + 1; j < dirVectors.length; j++) {
            totalDot += dirVectors[i].dx * dirVectors[j].dx + dirVectors[i].dy * dirVectors[j].dy;
            count++;
          }
        }
        movementCoordination = totalDot / count;
      }
    }

    // Oscillation
    let oscillationDetected = false;
    if (this.telicValuesHistory.length > 20) {
      const diffs = [];
      for (let i = 1; i < this.telicValuesHistory.length; i++) {
        diffs.push(this.telicValuesHistory[i] - this.telicValuesHistory[i - 1]);
      }
      let signChanges = 0;
      for (let i = 1; i < diffs.length; i++) {
        if (diffs[i] * diffs[i - 1] < 0) signChanges++;
      }
      if (signChanges > diffs.length * 0.2) oscillationDetected = true;
    }

    // Territorial
    let territorialBehavior = false;
    if (this.stepCount > 50) {
      const variances: number[] = [];
      this.agents.forEach(a => {
        if (a.positionHistory.length > 10) {
          const recent = a.positionHistory.slice(-20);
          const xs = recent.map(p => p[0]);
          const ys = recent.map(p => p[1]);
          const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
          const meanY = ys.reduce((a, b) => a + b, 0) / ys.length;
          const varX = xs.reduce((a, b) => a + Math.pow(b - meanX, 2), 0) / xs.length;
          const varY = ys.reduce((a, b) => a + Math.pow(b - meanY, 2), 0) / ys.length;
          variances.push((varX + varY) / 2);
        }
      });
      if (variances.length > 0 && (variances.reduce((a, b) => a + b, 0) / variances.length) < 4.0) {
        territorialBehavior = true;
      }
    }

    return {
      cluster_count: clusterCount,
      largest_cluster_size: largestClusterSize,
      movement_coordination: Number(movementCoordination.toFixed(3)),
      oscillation_detected: oscillationDetected,
      territorial_behavior: territorialBehavior,
      cluster_persistence: Number(clusterPersistence.toFixed(3)),
      phylo_diversity: Number(phyloDiversity.toFixed(3)),
      symbol_entropy: Number(symbolEntropy.toFixed(3))
    };
  }

  private checkGameOver() {
    if (this.agents.length === 0) {
      this.gameOver = true;
      this.gameOverReason = GameOverReason.EXTINCTION;
      this.dataLogger.finalize("extinction", this.stepCount, (Date.now() - this.startTime) / 1000);
      return;
    }

    if (this.stepCount >= this.config.maxSteps) {
      this.gameOver = true;
      this.gameOverReason = GameOverReason.MAX_STEPS;
      this.dataLogger.finalize("max_steps", this.stepCount, (Date.now() - this.startTime) / 1000);
      return;
    }

    if (this.stepCount > this.config.stabilityWindow) {
      const recent = this.telicValuesHistory.slice(-this.config.stabilityWindow);
      const min = Math.min(...recent);
      const max = Math.max(...recent);
      const range = max - min;

      if (range < this.config.stasisThreshold) {
        this.gameOver = true;
        this.gameOverReason = GameOverReason.STASIS;
        this.dataLogger.finalize("stasis", this.stepCount, (Date.now() - this.startTime) / 1000);
        return;
      }

      if (range > this.config.chaosThreshold) {
        this.gameOver = true;
        this.gameOverReason = GameOverReason.CHAOS;
        this.dataLogger.finalize("chaos", this.stepCount, (Date.now() - this.startTime) / 1000);
        return;
      }
    }
  }
}
