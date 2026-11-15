export type AgentType = 'drone' | 'ground_robot';
export type AgentState =
  | 'idle'
  | 'scanning'
  | 'moving'
  | 'rescuing'
  | 'extinguishing'
  | 'returning'
  | 'low_battery'
  | 'avoiding_danger'
  | 'charging'
  | 'medical_support'
  | 'surveillance';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';
export type HazardType = 'fire' | 'flood' | 'debris' | 'collapse' | 'aftershock' | 'road_block';
export type MissionType = 'rescue' | 'extinguish' | 'surveillance' | 'medical_support' | 'clear_debris';
export type MissionStatus = 'pending' | 'assigned' | 'active' | 'completed' | 'failed' | 'replanning';
export type DisasterType = 'earthquake' | 'flood' | 'wildfire' | 'cyclone' | 'building_collapse';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Agent {
  id: string;
  type: AgentType;
  position: Vector2;
  battery: number;
  fuel: number;
  health: number;
  state: AgentState;
  currentMissionId: string | null;
  targetId: string | null;
  route: Vector2[];
  distanceTraveled: number;
  missionSuccessRate: number;
  decisionCount: number;
  claimedTargets: string[];
  altitude?: number; // drones only
}

export interface Civilian {
  id: string;
  position: Vector2;
  health: number;
  urgency: UrgencyLevel;
  hazardExposure: number;
  status: 'waiting' | 'being_rescued' | 'rescued' | 'deceased';
  detectedBy: string[];
}

export interface Hazard {
  id: string;
  type: HazardType;
  position: Vector2;
  severity: number; // 0-1
  spreadRate: number;
  radius: number;
  active: boolean;
  ticksAlive: number;
}

export interface Building {
  id: string;
  position: Vector2;
  width: number;
  height: number;
  type: 'residential' | 'hospital' | 'shelter' | 'commercial' | 'collapsed';
  damaged: boolean;
}

export interface Road {
  id: string;
  start: Vector2;
  end: Vector2;
  blocked: boolean;
  blockageReason?: string;
}

export interface Mission {
  id: string;
  type: MissionType;
  priority: number;
  assignedAgentId: string | null;
  targetId: string;
  targetType: 'civilian' | 'hazard';
  status: MissionStatus;
  route: Vector2[];
  risk: number;
  distance: number;
  eta: number;
  startTime: number;
  endTime: number | null;
  routeInvalidations: number;
}

export interface DecisionFactor {
  label: string;
  value: number;
  weight: number;
}

export interface AIDecision {
  agentId: string;
  action: string;
  confidence: number;
  factors: DecisionFactor[];
  reasoning: string;
  timestamp: number;
}

export interface EmergencyEvent {
  id: string;
  type: 'fire_outbreak' | 'flood_surge' | 'building_collapse' | 'road_blocked' | 'aftershock' | 'low_battery';
  description: string;
  position?: Vector2;
  timestamp: number;
  resolved: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'ai' | 'mission';
}

export interface SimulationConfig {
  disasterType: DisasterType;
  difficulty: Difficulty;
  civilianCount: number;
  droneCount: number;
  robotCount: number;
  hazardRate: number;
  fireSpread: number;
  floodSpread: number;
  eventFrequency: number;
}

export interface SimulationStats {
  civiliansRescued: number;
  civiliansTotal: number;
  missionsCompleted: number;
  missionsFailed: number;
  routeRecalculations: number;
  hazardsNeutralized: number;
  conflictsAvoided: number;
  avgResponseTime: number;
  avgRouteLength: number;
  agentUtilization: number;
  rescueSuccessRate: number;
  elapsedTicks: number;
  historicalRescues: number[];
  historicalHazards: number[];
}

export interface SimulationState {
  running: boolean;
  paused: boolean;
  tick: number;
  agents: Agent[];
  civilians: Civilian[];
  hazards: Hazard[];
  buildings: Building[];
  roads: Road[];
  missions: Mission[];
  aiDecisions: Map<string, AIDecision>;
  events: EmergencyEvent[];
  log: LogEntry[];
  stats: SimulationStats;
  config: SimulationConfig;
  selectedAgentId: string | null;
  graphicsQuality: 'low' | 'medium' | 'high';
  demoPhase: number;
  demoMessage: string | null;
  speedMultiplier: number;
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
