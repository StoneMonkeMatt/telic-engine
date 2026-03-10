
export enum PhiType {
  NONE = "none",
  SPATIAL = "spatial_clustering",
  INFORMATION = "info_entropy",
  RANDOM = "random_noise",
  MUTUAL_INFO = "mutual_information",
  COND_ENTROPY = "conditional_entropy",
  TRIPLET = "triplet_closure"
}

export enum AIProvider {
  GEMINI = "gemini",
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
  DEEPSEEK = "deepseek",
  GROK = "grok"
}

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export enum GameOverReason {
  EXTINCTION = "all_agents_extinct",
  STASIS = "no_change_detected",
  CHAOS = "extreme_volatility",
  STABILITY = "equilibrium_reached",
  MAX_STEPS = "maximum_steps_reached"
}

export interface SimulationConfig {
  gridSize: number;
  agentCount: number;
  maxSteps: number;
  visionRange: number;
  moveSpeed: number;
  useSoftmax: boolean;
  softmaxTemperature: number;
  softmaxAdaptive: boolean;
  alpha: number;
  gamma: number;
  delta: number;
  beta: number;
  phiType: PhiType;
  energyDepletionRate: number;
  energyGainRange: [number, number];
  initialEnergyRange: [number, number];
  stasisThreshold: number;
  chaosThreshold: number;
  stabilityWindow: number;
  seed?: number;
  
  // v13 Upgrades
  evolveParams: boolean;
  mutationRate: number;
  mutationStd: number;
  phiMutationRate: number;
  reproductionEnabled: boolean;
  reproductionEnergyThreshold: number;
  reproductionProbBase: number;
  maxOffspringDist: number;
  senescenceAge: number;
  resourceField: boolean;
  resourceHotspots: number;
  resourceSigma: number;
  resourceMax: number;
  resourceRegrowRate: number;
  resourceConsumptionFraction: number;
  toroidal: boolean;
}

export interface AgentState {
  agent_id: number;
  parent_id: number;
  age: number;
  x: number;
  y: number;
  energy: number;
  info: number;
  phi: number;
  telic: number;
  symbol: string;
  phi_type: string;
  gamma: number;
  alpha: number;
  delta: number;
  beta: number;
  vision: number;
  temperature: number;
}

export interface StepData {
  step: number;
  alive_count: number;
  avg_telic: number;
  avg_phi: number;
  avg_energy: number;
  agents: AgentState[];
  emergence: EmergenceData;
  resource_grid?: number[][];
  pre_stats?: GlobalStats;
  post_stats?: GlobalStats;
}

export interface EmergenceData {
  cluster_count: number;
  largest_cluster_size: number;
  movement_coordination: number;
  oscillation_detected: boolean;
  territorial_behavior: boolean;
  cluster_persistence: number;
  phylo_diversity: number;
  symbol_entropy: number;
  silhouette_score?: number;
}

export interface SimulationResult {
  experiment_info: {
    name: string;
    timestamp: string;
    config: Record<string, any>; // Mapped to uppercase for schema compliance
    config_hash: string;
  };
  reproducibility: {
    rng_state: string;
    agent_counter_at_start: number;
  };
  game_over: {
    reason: string;
    step: number;
    elapsed_time: number;
  };
  summary: {
    initial_agents: number;
    final_agents: number;
    final_avg_telic: number;
    final_avg_phi: number;
    final_avg_neighbor_distance: number;
    final_cluster_count: number;
    final_cluster_persistence: number;
    final_silhouette_score: number;
    final_phylo_diversity: number;
    final_symbol_entropy: number;
    final_phi_type_counts: Record<string, number>;
    max_telic_achieved: number;
    min_telic_achieved: number;
    telic_volatility: number;
    phi_correlation: number;
    [key: string]: any;
  };
  trajectories: {
    telic: number[];
    phi: number[];
    energy: number[];
    neighbor_distance: number[];
    cluster_count: number[];
    cluster_persistence: number[];
    silhouette_score: number[];
    phylo_diversity: number[];
    symbol_entropy: number[];
    avg_gamma: number[];
    [key: string]: number[];
  };
  step_data: Array<{
    step: number;
    pre_stats: GlobalStats;
    post_stats: GlobalStats;
    agents: AgentState[];
    alive_count: number;
    emergence: EmergenceData;
    game_over?: boolean;
    game_over_reason?: string;
  }>;
  scientific_data?: {
    lineage: any[];
    fields: any[];
    steps: any[];
  };
}

export interface GlobalStats {
  step: number;
  agent_count: number;
  avg_telic: number;
  std_telic: number;
  min_telic: number;
  max_telic: number;
  avg_phi: number;
  avg_energy: number;
  avg_info: number;
  spatial_clustering: number;
  total_energy: number;
  alive_agents: number;
  avg_neighbor_distance: number;
  cluster_count: number;
  largest_cluster_size: number;
  cluster_persistence: number;
  silhouette_score: number;
  phylo_diversity: number;
  phi_type_counts: Record<string, number>;
  symbol_entropy: number;
  avg_gamma: number;
  avg_alpha: number;
  avg_beta: number;
  avg_delta: number;
  avg_vision: number;
  avg_temperature: number;
  [key: string]: any;
}
