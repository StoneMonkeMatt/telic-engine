
import { SimulationConfig, PhiType, StepData, EmergenceData, GlobalStats } from './types';

export interface Vector2D {
  x: float;
  y: float;
  mag: float;
}

export interface AgentSnapshot {
  step: number;
  agent_id: number;
  parent_id: number;
  age: number;
  x: number;
  y: number;
  prev_x: number;
  prev_y: number;
  vx: number;
  vy: number;
  speed: number;
  local_density: number;
  neighbors_count: number;
  neighbor_ids: number[];
  neighbor_symbols: string[];
  telic_grad: Vector2D;
  telic_curvature: number;
  grad_curv_x: number;
  grad_curv_y: number;
  gradient_alignment: number;
  at_critical: boolean;
  critical_type: string;
  dist_to_attractor: number;
  dist_to_saddle: number;
  energy: number;
  info: number;
  symbol: string;
  phi_type: string;
  phi_value: number;
  telic_value: number;
  gamma: number;
  alpha: number;
  delta: number;
  beta: number;
  vision: number;
  temperature: number;
}

export interface StepSnapshot {
  step: number;
  agent_count: number;
  avg_telic: number;
  avg_phi: number;
  avg_energy: number;
  avg_info: number;
  avg_speed: number;
  avg_density: number;
  avg_grad_align: number;
  avg_curvature: number;
  cluster_count: number;
  largest_cluster: number;
  silhouette: number;
  phylo_diversity: number;
  phi_type_counts: Record<string, number>;
  symbol_entropy: number;
  field_mean_telic: number;
  field_mean_grad: number;
  field_mean_curv: number;
  attractor_count: number;
  repeller_count: number;
  saddle_count: number;
  agents_near_attractors: number;
  agents_near_repellers: number;
  agents_near_saddles: number;
  agents_at_critical: number;
}

export interface LineageRecord {
  agent_id: number;
  parent_id: number;
  birth_step: number;
  death_step: number | null;
  phi_type: string;
  gamma: number;
  alpha: number;
  delta: number;
  beta: number;
  vision: number;
  temperature: number;
  children_ids: number[];
  offspring: number;
  max_energy: number;
  avg_telic: number;
  avg_speed: number;
  avg_density: number;
  avg_grad_align: number;
  max_grad_align: number;
  avg_curvature: number;
  lifespan: number | null;
  time_near_attractors: number;
  time_near_saddles: number;
  time_near_repellers: number;
  attractor_visits: number;
  saddle_crossings: number;
  avg_dist_to_attractor: number;
  total_distance: number;
  max_speed: number;
}

export interface FieldSample {
  step: number;
  x: number;
  y: number;
  telic: number;
  phi: number;
  energy: number;
  info: number;
  cost: number;
  neighbor_count: number;
  neighbor_types: string[];
  density: number;
  grad: Vector2D;
  curvature: number;
  curv_x: number;
  curv_y: number;
  is_critical: boolean;
  critical_type: string;
}

export interface MovementRecord {
  step: number;
  agent_id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  telic_align: number;
  phi_align: number;
  curvature: number;
  in_attractor: boolean;
  in_saddle: boolean;
  crossing_saddle: boolean;
}

export interface FieldSnapshot {
  step: number;
  x_coords: number[];
  y_coords: number[];
  telic: number[][];
  phi: number[][];
  grad: Vector2D[][];
  curv: number[][];
  attractors: [number, number][];
  repellers: [number, number][];
  saddles: [number, number][];
}

type float = number;

export class TelicLogger {
  name: string;
  config: SimulationConfig;
  ts: string;
  
  agents: AgentSnapshot[] = [];
  steps: StepSnapshot[] = [];
  lineage: Map<number, LineageRecord> = new Map();
  samples: FieldSample[] = [];
  moves: MovementRecord[] = [];
  fields: Map<number, FieldSnapshot> = new Map();
  
  births: Map<number, number> = new Map();
  deaths: Map<number, number> = new Map();
  parents: Map<number, number> = new Map();
  children: Map<number, number[]> = new Map();
  pos_history: Map<number, [number, number, number][]> = new Map();
  attractor_visits: Map<number, Set<string>> = new Map();
  saddle_crossings: Map<number, number> = new Map();
  saddle_state: Map<number, boolean> = new Map();
  
  last_field: FieldSnapshot | null = null;
  last_flush = 0;
  flush_interval = 10;
  is_finalized = false;

  constructor(name: string, config: SimulationConfig) {
    this.name = name;
    this.config = config;
    this.ts = new Date().toISOString().replace(/[:.]/g, '-');
  }

  private classify(grad_mag: number, cx: number, cy: number, thresh: number = 0.1): [boolean, string] {
    if (grad_mag > thresh) return [false, 'none'];
    if (cx > 0 && cy > 0) return [true, 'attractor'];
    if (cx < 0 && cy < 0) return [true, 'repeller'];
    if ((cx > 0 && cy < 0) || (cx < 0 && cy > 0)) return [true, 'saddle'];
    return [true, 'degenerate'];
  }

  logStep(step: number, agents: any[], stats: GlobalStats, emerge: EmergenceData) {
    const field = this.last_field;
    const grad_map: Map<string, Vector2D> = new Map();
    const curv_map: Map<string, number> = new Map();
    let attractors: [number, number][] = [];
    let saddles: [number, number][] = [];

    if (field) {
      field.x_coords.forEach((x, i) => {
        field.y_coords.forEach((y, j) => {
          const key = `${x},${y}`;
          grad_map.set(key, field.grad[j][i]);
          curv_map.set(key, field.curv[j][i]);
        });
      });
      attractors = field.attractors;
      saddles = field.saddles;
    }

    const aligns: number[] = [];
    const curvs: number[] = [];
    let near_attr = 0, near_saddle = 0, near_rep = 0, at_crit = 0;

    agents.forEach(a => {
      const history = this.pos_history.get(a.id) || [];
      const prev = history[history.length - 1] || [step, a.x, a.y];
      let vx = 0, vy = 0;
      if (prev[0] === step - 1) {
        vx = a.x - prev[1];
        vy = a.y - prev[2];
        // Handle toroidal wrapping for velocity
        if (this.config.toroidal) {
          if (Math.abs(vx) > this.config.gridSize / 2) vx = vx > 0 ? vx - this.config.gridSize : vx + this.config.gridSize;
          if (Math.abs(vy) > this.config.gridSize / 2) vy = vy > 0 ? vy - this.config.gridSize : vy + this.config.gridSize;
        }
      }
      const speed = Math.sqrt(vx * vx + vy * vy);
      if (!this.pos_history.has(a.id)) this.pos_history.set(a.id, []);
      this.pos_history.get(a.id)!.push([step, a.x, a.y]);

      const neighbors = a.getNeighbors(agents, this.config, true);
      const max_neighbors = Math.pow(2 * a.vision + 1, 2) - 1;
      const density = max_neighbors > 0 ? neighbors.length / max_neighbors : 0;

      let grad = { x: 0, y: 0, mag: 0 };
      let curv = 0;
      let cx = 0, cy = 0;
      let align = 0;
      let critical = false;
      let ctype = 'none';
      let dist_attr = Infinity;
      let dist_saddle = Infinity;
      let near_a = false;
      let near_s = false;

      if (field && grad_map.size > 0) {
        const nx = field.x_coords.reduce((prev, curr) => Math.abs(curr - a.x) < Math.abs(prev - a.x) ? curr : prev);
        const ny = field.y_coords.reduce((prev, curr) => Math.abs(curr - a.y) < Math.abs(prev - a.y) ? curr : prev);
        const key = `${nx},${ny}`;
        
        if (grad_map.has(key)) {
          const g = grad_map.get(key)!;
          curv = curv_map.get(key)!;
          grad = g;
          cx = g.x; cy = g.y; // Simplified
          [critical, ctype] = this.classify(g.mag, cx, cy);
          
          if (speed > 0 && g.mag > 0) {
            align = (vx * g.x + vy * g.y) / (speed * g.mag);
          }
          aligns.push(align);
          curvs.push(curv);

          attractors.forEach(([ax, ay]) => {
            dist_attr = Math.min(dist_attr, Math.sqrt(Math.pow(a.x - ax, 2) + Math.pow(a.y - ay, 2)));
          });
          saddles.forEach(([sx, sy]) => {
            dist_saddle = Math.min(dist_saddle, Math.sqrt(Math.pow(a.x - sx, 2) + Math.pow(a.y - sy, 2)));
          });

          if (dist_attr < 2) near_a = true;
          if (dist_saddle < 2) near_s = true;

          if (critical) {
            at_crit++;
            if (ctype === 'attractor') near_attr++;
            else if (ctype === 'saddle') near_saddle++;
            else if (ctype === 'repeller') near_rep++;
          }
        }
      }

      // Attractor visits
      let nearest_attr: string | null = null;
      let nearest_d = Infinity;
      attractors.forEach(([ax, ay]) => {
        const d = Math.sqrt(Math.pow(a.x - ax, 2) + Math.pow(a.y - ay, 2));
        if (d < nearest_d) {
          nearest_d = d;
          nearest_attr = `${ax.toFixed(1)},${ay.toFixed(1)}`;
        }
      });
      if (nearest_attr && nearest_d < 2) {
        if (!this.attractor_visits.has(a.id)) this.attractor_visits.set(a.id, new Set());
        this.attractor_visits.get(a.id)!.add(nearest_attr);
      }

      // Saddle crossings
      if (critical && ctype === 'saddle') {
        if (!this.saddle_state.get(a.id)) {
          this.saddle_crossings.set(a.id, (this.saddle_crossings.get(a.id) || 0) + 1);
        }
        this.saddle_state.set(a.id, true);
      } else {
        this.saddle_state.set(a.id, false);
      }

      const snap: AgentSnapshot = {
        step, agent_id: a.id, parent_id: a.parent_id, age: a.age,
        x: a.x, y: a.y, prev_x: prev[1], prev_y: prev[2],
        vx, vy, speed,
        local_density: density, neighbors_count: neighbors.length,
        neighbor_ids: neighbors.map((n: any) => n.id),
        neighbor_symbols: neighbors.map((n: any) => n.symbol),
        telic_grad: grad, telic_curvature: curv,
        grad_curv_x: cx, grad_curv_y: cy, gradient_alignment: align,
        at_critical: critical, critical_type: ctype,
        dist_to_attractor: dist_attr, dist_to_saddle: dist_saddle,
        energy: a.energy, info: a.info, symbol: a.symbol,
        phi_type: a.phi_type, phi_value: a.computePhi(agents, this.config, (a as any).rng || { next: () => Math.random() }),
        telic_value: a.computeTelicValue(agents, this.config, (a as any).rng || { next: () => Math.random() }),
        gamma: a.gamma, alpha: a.alpha, delta: a.delta, beta: a.beta,
        vision: a.vision, temperature: a.temperature
      };
      this.agents.push(snap);

      if (!this.births.has(a.id)) {
        this.births.set(a.id, step);
        this.parents.set(a.id, a.parent_id);
        if (a.parent_id !== -1) {
          if (!this.children.has(a.parent_id)) this.children.set(a.parent_id, []);
          this.children.get(a.parent_id)!.push(a.id);
        }
      }

      if (speed > 0 && field) {
        const crossing = critical && ctype === 'saddle' && !this.saddle_state.get(a.id);
        this.moves.push({
          step, agent_id: a.id, x: a.x, y: a.y, vx, vy, speed,
          telic_align: align, phi_align: 0, curvature: curv,
          in_attractor: near_a, in_saddle: near_s, crossing_saddle: crossing
        });
      }
    });

    let f_telic = 0, f_grad = 0, f_curv = 0;
    if (field) {
      const flatTelic = field.telic.flat();
      const flatGrad = field.grad.flat();
      const flatCurv = field.curv.flat();
      f_telic = flatTelic.reduce((a, b) => a + b, 0) / flatTelic.length;
      f_grad = flatGrad.reduce((a, b) => a + b.mag, 0) / flatGrad.length;
      f_curv = flatCurv.reduce((a, b) => a + b, 0) / flatCurv.length;
    }

    this.steps.push({
      step, agent_count: stats.agent_count,
      avg_telic: stats.avg_telic, avg_phi: stats.avg_phi, avg_energy: stats.avg_energy, avg_info: stats.avg_info,
      avg_speed: agents.length > 0 ? this.agents.filter(s => s.step === step).reduce((a, b) => a + b.speed, 0) / agents.length : 0,
      avg_density: agents.length > 0 ? this.agents.filter(s => s.step === step).reduce((a, b) => a + b.local_density, 0) / agents.length : 0,
      avg_grad_align: aligns.length > 0 ? aligns.reduce((a, b) => a + b, 0) / aligns.length : 0,
      avg_curvature: curvs.length > 0 ? curvs.reduce((a, b) => a + b, 0) / curvs.length : 0,
      cluster_count: emerge.cluster_count, largest_cluster: emerge.largest_cluster_size, silhouette: emerge.silhouette_score || 0,
      phylo_diversity: emerge.phylo_diversity || 0, phi_type_counts: stats.phi_type_counts,
      symbol_entropy: stats.symbol_entropy || 0,
      field_mean_telic: f_telic, field_mean_grad: f_grad, field_mean_curv: f_curv,
      attractor_count: attractors.length, repeller_count: field ? field.repellers.length : 0, saddle_count: saddles.length,
      agents_near_attractors: near_attr, agents_near_repellers: near_rep,
      agents_near_saddles: near_saddle, agents_at_critical: at_crit
    });

    if (step - this.last_flush >= this.flush_interval) {
      this.flush();
      this.last_flush = step;
    }
  }

  logSample(step: number, x: number, y: number, telic: number, phi: number, energy: number, info: number, cost: number, n_count: number, n_types: string[], density: number) {
    this.samples.push({
      step, x, y, telic, phi, energy, info, cost, neighbor_count: n_count, neighbor_types: n_types, density,
      grad: { x: 0, y: 0, mag: 0 }, curvature: 0, curv_x: 0, curv_y: 0, is_critical: false, critical_type: 'none'
    });
  }

  computeField(step: number): FieldSnapshot | null {
    const pts = this.samples.filter(s => s.step === step);
    if (pts.length === 0) return null;

    const xs = Array.from(new Set(pts.map(p => p.x))).sort((a, b) => a - b);
    const ys = Array.from(new Set(pts.map(p => p.y))).sort((a, b) => a - b);
    const x_map = new Map(xs.map((x, i) => [x, i]));
    const y_map = new Map(ys.map((y, j) => [y, j]));

    const T = Array.from({ length: ys.length }, () => Array(xs.length).fill(0));
    const P = Array.from({ length: ys.length }, () => Array(xs.length).fill(0));
    
    pts.forEach(p => {
      T[y_map.get(p.y)!][x_map.get(p.x)!] = p.telic;
      P[y_map.get(p.y)!][x_map.get(p.x)!] = p.phi;
    });

    // Simple central difference for gradients
    const grad_field: Vector2D[][] = Array.from({ length: ys.length }, () => Array(xs.length).fill({ x: 0, y: 0, mag: 0 }));
    const curv: number[][] = Array.from({ length: ys.length }, () => Array(xs.length).fill(0));
    const d2x: number[][] = Array.from({ length: ys.length }, () => Array(xs.length).fill(0));
    const d2y: number[][] = Array.from({ length: ys.length }, () => Array(xs.length).fill(0));

    for (let j = 0; j < ys.length; j++) {
      for (let i = 0; i < xs.length; i++) {
        let gx = 0, gy = 0;
        if (i > 0 && i < xs.length - 1) gx = (T[j][i+1] - T[j][i-1]) / (xs[i+1] - xs[i-1]);
        if (j > 0 && j < ys.length - 1) gy = (T[j+1][i] - T[j-1][i]) / (ys[j+1] - ys[j-1]);
        const mag = Math.sqrt(gx * gx + gy * gy);
        grad_field[j][i] = { x: gx, y: gy, mag };

        if (i > 0 && i < xs.length - 1) d2x[j][i] = (T[j][i+1] - 2 * T[j][i] + T[j][i-1]) / Math.pow(xs[i] - xs[i-1], 2);
        if (j > 0 && j < ys.length - 1) d2y[j][i] = (T[j+1][i] - 2 * T[j][i] + T[j-1][i]) / Math.pow(ys[j] - ys[j-1], 2);
        curv[j][i] = d2x[j][i] + d2y[j][i];
      }
    }

    const attractors: [number, number][] = [];
    const repellers: [number, number][] = [];
    const saddles: [number, number][] = [];
    const thresh = 0.1;

    for (let j = 1; j < ys.length - 1; j++) {
      for (let i = 1; i < xs.length - 1; i++) {
        if (grad_field[j][i].mag < thresh) {
          const cx = d2x[j][i], cy = d2y[j][i];
          if (cx > 0.1 && cy > 0.1) attractors.push([xs[i], ys[j]]);
          else if (cx < -0.1 && cy < -0.1) repellers.push([xs[i], ys[j]]);
          else if ((cx > 0.1 && cy < -0.1) || (cx < -0.1 && cy > 0.1)) saddles.push([xs[i], ys[j]]);
        }
      }
    }

    const field: FieldSnapshot = {
      step, x_coords: xs, y_coords: ys, telic: T, phi: P,
      grad: grad_field, curv, attractors, repellers, saddles
    };
    this.fields.set(step, field);
    this.last_field = field;
    return field;
  }

  flush() {
    // In a web app, we don't write to disk directly, we keep it in memory
    // or send to a server. For now, we'll just keep it in memory.
    // If we were in Node, we'd use fs.
  }

  finalize(reason: string, final_step: number, elapsed: number) {
    if (this.is_finalized) return;
    
    const sampledSteps = Array.from(new Set(this.samples.map(s => s.step)));
    sampledSteps.forEach(step => this.computeField(step));

    this.births.forEach((birth, aid) => {
      const snaps = this.agents.filter(s => s.agent_id === aid);
      const death = this.deaths.get(aid) || null;
      
      if (snaps.length > 0) {
        const telicVals = snaps.map(s => s.telic_value);
        const speeds = snaps.map(s => s.speed);
        const densities = snaps.map(s => s.local_density);
        const aligns = snaps.map(s => s.gradient_alignment);
        const curvatures = snaps.map(s => s.telic_curvature);
        
        let total_dist = 0;
        const sorted = [...snaps].sort((a, b) => a.step - b.step);
        for (let i = 1; i < sorted.length; i++) {
          total_dist += Math.sqrt(Math.pow(sorted[i].x - sorted[i-1].x, 2) + Math.pow(sorted[i].y - sorted[i-1].y, 2));
        }

        const first = snaps[0];
        this.lineage.set(aid, {
          agent_id: aid, parent_id: this.parents.get(aid) || -1, birth_step: birth, death_step: death,
          phi_type: first.phi_type, gamma: first.gamma, alpha: first.alpha, delta: first.delta, beta: first.beta,
          vision: first.vision, temperature: first.temperature,
          children_ids: this.children.get(aid) || [], offspring: (this.children.get(aid) || []).length,
          max_energy: Math.max(...snaps.map(s => s.energy)),
          avg_telic: telicVals.reduce((a, b) => a + b, 0) / telicVals.length,
          avg_speed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
          avg_density: densities.reduce((a, b) => a + b, 0) / densities.length,
          avg_grad_align: aligns.reduce((a, b) => a + b, 0) / aligns.length,
          max_grad_align: Math.max(...aligns),
          avg_curvature: curvatures.reduce((a, b) => a + b, 0) / curvatures.length,
          lifespan: death ? death - birth : null,
          time_near_attractors: snaps.filter(s => s.dist_to_attractor < 2).length,
          time_near_saddles: snaps.filter(s => s.dist_to_saddle < 2).length,
          time_near_repellers: snaps.filter(s => s.critical_type === 'repeller').length,
          attractor_visits: (this.attractor_visits.get(aid) || new Set()).size,
          saddle_crossings: this.saddle_crossings.get(aid) || 0,
          avg_dist_to_attractor: snaps.reduce((a, b) => a + b.dist_to_attractor, 0) / snaps.length,
          total_distance: total_dist,
          max_speed: Math.max(...speeds)
        });
      }
    });

    this.is_finalized = true;
  }

  getResults(): any {
    // If not finalized, do a partial finalization to compute lineage for current state
    if (!this.is_finalized && this.agents.length > 0) {
      const lastStep = this.steps.length > 0 ? this.steps[this.steps.length - 1].step : 0;
      this.finalize("partial", lastStep, 0);
      this.is_finalized = false; // Reset so it can be finalized properly later
    }

    return {
      name: this.name,
      ts: this.ts,
      steps: this.steps,
      agents: this.agents,
      lineage: Array.from(this.lineage.values()),
      fields: Array.from(this.fields.entries()).map(([step, field]) => ({ step, ...field }))
    };
  }
}
