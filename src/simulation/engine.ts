import type {
  SimulationState, Agent, Civilian, Hazard, Mission, AIDecision,
  EmergencyEvent, LogEntry, Building, Road, SimulationConfig, Vector2,
  UrgencyLevel
} from '../types';
import { findPath, estimateETA } from './pathfinding';

let logIdCounter = 0;
let missionIdCounter = 0;
let eventIdCounter = 0;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function distance(a: Vector2, b: Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function addLog(state: SimulationState, message: string, type: LogEntry['type'] = 'info'): void {
  const entry: LogEntry = {
    id: `log-${++logIdCounter}`,
    timestamp: state.tick,
    message,
    type
  };
  state.log = [entry, ...state.log].slice(0, 200);
}

export function createInitialState(config: SimulationConfig): SimulationState {
  const GRID = 38;
  const buildings: Building[] = [];
  const roads: Road[] = [];

  // Hospital — placed off the residential grid at (37, 2) so it never overlaps
  buildings.push({ id: 'hospital', position: { x: 37, y: 2 }, width: 5, height: 4, type: 'hospital', damaged: false });
  // Shelter — placed off the residential grid at (1, 2)
  buildings.push({ id: 'shelter', position: { x: 1, y: 2 }, width: 4, height: 3, type: 'shelter', damaged: false });

  // Residential blocks — placed in the center of each 5-unit road cell so they never overlap roads or each other
  // Roads run at x=0,5,10,...,40 and y=0,5,10,...,40. Buildings sit at midpoints like (2.5, 2.5), (7.5, 2.5), etc.
  const buildingPositions: Vector2[] = [];
  for (let bx = 2; bx <= 36; bx += 5) {
    for (let by = 7; by <= 37; by += 5) {
      // Skip the hospital and shelter zones
      if ((bx === 2 && by === 2) || (bx === 37 && by === 2)) continue;
      buildingPositions.push({ x: bx, y: by });
    }
  }
  buildingPositions.forEach((p, i) => {
    buildings.push({
      id: `building-${i}`,
      position: p,
      width: 3,
      height: 3,
      type: Math.random() > 0.85 ? 'collapsed' : 'residential',
      damaged: Math.random() > 0.6
    });
  });

  // Roads — grid every 5 units. Road coordinates are integers (0,5,10,...,40)
  for (let x = 0; x <= GRID; x += 5) {
    roads.push({ id: `road-v${x}`, start: { x, y: 0 }, end: { x, y: GRID }, blocked: false });
  }
  for (let y = 0; y <= GRID; y += 5) {
    roads.push({ id: `road-h${y}`, start: { x: 0, y }, end: { x: GRID, y }, blocked: false });
  }

  const agents: Agent[] = [];
  for (let i = 0; i < config.droneCount; i++) {
    agents.push({
      id: `ARES-D0${i + 1}`,
      type: 'drone',
      position: { x: randomBetween(2, 8), y: randomBetween(2, 8) },
      battery: randomBetween(70, 100),
      fuel: 100,
      health: 100,
      state: 'idle',
      currentMissionId: null,
      targetId: null,
      route: [],
      distanceTraveled: 0,
      missionSuccessRate: 1,
      decisionCount: 0,
      claimedTargets: [],
      altitude: randomBetween(12, 20)
    });
  }
  for (let i = 0; i < config.robotCount; i++) {
    agents.push({
      id: `ARES-R0${i + 1}`,
      type: 'ground_robot',
      position: { x: randomBetween(2, 8), y: randomBetween(30, 36) },
      battery: randomBetween(60, 100),
      fuel: 100,
      health: randomBetween(85, 100),
      state: 'idle',
      currentMissionId: null,
      targetId: null,
      route: [],
      distanceTraveled: 0,
      missionSuccessRate: 1,
      decisionCount: 0,
      claimedTargets: [],
    });
  }

  const civilians: Civilian[] = [];
  const urgencies: UrgencyLevel[] = ['critical', 'high', 'medium', 'low'];
  for (let i = 0; i < config.civilianCount; i++) {
    const urgency = urgencies[Math.floor(Math.random() * urgencies.length)];
    // Place civilians ON roads so ground agents can always reach them
    const roadCoords = [5, 10, 15, 20, 25, 30, 35];
    const onRoad = roadCoords[Math.floor(Math.random() * roadCoords.length)];
    civilians.push({
      id: `CIV-${String(i + 1).padStart(3, '0')}`,
      position: { x: onRoad, y: roadCoords[Math.floor(Math.random() * roadCoords.length)] },
      health: urgency === 'critical' ? randomBetween(5, 25)
             : urgency === 'high' ? randomBetween(25, 55)
             : urgency === 'medium' ? randomBetween(55, 80)
             : randomBetween(75, 100),
      urgency,
      hazardExposure: Math.random(),
      status: 'waiting',
      detectedBy: ['initial-scan']
    });
  }

  const hazards: Hazard[] = [];
  const hCount = config.disasterType === 'wildfire' ? 4
               : config.disasterType === 'flood' ? 3
               : config.disasterType === 'earthquake' ? 5
               : 3;
  for (let i = 0; i < hCount; i++) {
    const hType = config.disasterType === 'wildfire' ? 'fire'
                : config.disasterType === 'flood' ? 'flood'
                : config.disasterType === 'earthquake' ? (Math.random() > 0.5 ? 'collapse' : 'debris')
                : 'fire';
    hazards.push({
      id: `HAZ-${i + 1}`,
      type: hType,
      position: { x: randomBetween(8, GRID - 8), y: randomBetween(8, GRID - 8) },
      severity: randomBetween(0.4, 0.9),
      spreadRate: config.fireSpread * 0.01,
      radius: randomBetween(2, 5),
      active: true,
      ticksAlive: 0
    });
  }

  return {
    running: false,
    paused: false,
    tick: 0,
    agents,
    civilians,
    hazards,
    buildings,
    roads,
    missions: [],
    aiDecisions: new Map(),
    events: [],
    log: [],
    stats: {
      civiliansRescued: 0,
      civiliansTotal: config.civilianCount,
      missionsCompleted: 0,
      missionsFailed: 0,
      routeRecalculations: 0,
      hazardsNeutralized: 0,
      conflictsAvoided: 0,
      avgResponseTime: 0,
      avgRouteLength: 0,
      agentUtilization: 0,
      rescueSuccessRate: 1,
      elapsedTicks: 0,
      historicalRescues: [],
      historicalHazards: [],
    },
    config,
    selectedAgentId: null,
    graphicsQuality: 'medium',
    demoPhase: 0,
    demoMessage: null,
    speedMultiplier: 1,
  };
}

function calcUrgencyScore(civ: Civilian): number {
  const urgencyWeight = { critical: 1.0, high: 0.75, medium: 0.5, low: 0.25 };
  return (urgencyWeight[civ.urgency] * 0.4) +
         ((100 - civ.health) / 100 * 0.35) +
         (civ.hazardExposure * 0.25);
}

function assignMissions(state: SimulationState): void {
  const waitingCivilians = state.civilians
    .filter(c => c.status === 'waiting')
    .sort((a, b) => calcUrgencyScore(b) - calcUrgencyScore(a));

  const idleAgents = state.agents.filter(a =>
    (a.state === 'idle' || a.state === 'scanning') &&
    a.battery > 15 &&
    a.health > 10
  );

  for (const civ of waitingCivilians) {
    if (idleAgents.length === 0) break;
    const alreadyMissioned = state.missions.some(
      m => m.targetId === civ.id && (m.status === 'assigned' || m.status === 'active')
    );
    if (alreadyMissioned) continue;

    // Find best agent
    let bestAgent: Agent | null = null;
    let bestScore = Infinity;
    for (const agent of idleAgents) {
      const d = distance(agent.position, civ.position);
      const batteryPenalty = (100 - agent.battery) * 0.2;
      const score = d + batteryPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestAgent = agent;
      }
    }

    if (!bestAgent) continue;

    const { path, risk, distance: dist } = findPath(bestAgent.position, civ.position, state.hazards, state.buildings, state.roads, bestAgent.type);
    const eta = estimateETA(dist, bestAgent.type);
    const missionId = `MISS-${++missionIdCounter}`;

    const mission: Mission = {
      id: missionId,
      type: 'rescue',
      priority: calcUrgencyScore(civ),
      assignedAgentId: bestAgent.id,
      targetId: civ.id,
      targetType: 'civilian',
      status: 'assigned',
      route: path,
      risk,
      distance: dist,
      eta,
      startTime: state.tick,
      endTime: null,
      routeInvalidations: 0
    };

    state.missions.push(mission);
    bestAgent.state = 'moving';
    bestAgent.currentMissionId = missionId;
    bestAgent.targetId = civ.id;
    bestAgent.route = path;
    bestAgent.decisionCount++;

    const confidence = Math.round(85 + Math.random() * 12);
    const decision: AIDecision = {
      agentId: bestAgent.id,
      action: 'RESCUE',
      confidence,
      factors: [
        { label: 'Victim urgency', value: 42, weight: civ.urgency === 'critical' ? 0.42 : 0.28 },
        { label: 'Distance', value: 21, weight: Math.min(dist / 40, 0.35) },
        { label: 'Hazard risk', value: 18, weight: risk * 0.25 },
        { label: 'Accessibility', value: 11, weight: 0.11 },
        { label: 'Resource state', value: 8, weight: bestAgent.battery / 1200 },
      ],
      reasoning: `${civ.id} has ${civ.urgency} status (health: ${Math.round(civ.health)}%). ${
        risk > 0.5 ? 'Route has elevated hazard exposure.' : 'Route remains viable.'
      } ${bestAgent.id} selected as nearest available unit (ETA: ${Math.round(eta)}s).`,
      timestamp: state.tick
    };
    state.aiDecisions.set(bestAgent.id, decision);

    addLog(state, `AI identified ${civ.id} as highest priority (${civ.urgency.toUpperCase()})`, 'ai');
    addLog(state, `${bestAgent.id} assigned to rescue ${civ.id}`, 'mission');
    addLog(state, `Safe route calculated — ${Math.round(dist)}m, ${risk > 0.6 ? 'HIGH RISK' : risk > 0.3 ? 'MODERATE RISK' : 'LOW RISK'}`, 'ai');

    idleAgents.splice(idleAgents.indexOf(bestAgent), 1);
  }
}

function updateAgents(state: SimulationState): void {
  const SPEED_DRONE = 0.25;
  const SPEED_ROBOT = 0.15;

  for (const agent of state.agents) {
    // Battery drain
    if (agent.state !== 'idle' && agent.state !== 'charging' && agent.state !== 'scanning') {
      agent.battery -= agent.type === 'drone' ? 0.02 : 0.01;
      agent.battery = Math.max(0, agent.battery);
    } else {
      // Recharge when idle or scanning
      agent.battery = Math.min(100, agent.battery + 0.3);
    }

    if (agent.battery <= 0) {
      agent.state = 'low_battery';
      if (agent.currentMissionId) {
        const mission = state.missions.find(m => m.id === agent.currentMissionId);
        if (mission) {
          mission.status = 'failed';
          state.stats.missionsFailed++;
        }
        agent.currentMissionId = null;
        agent.targetId = null;
        agent.route = [];
      }
      addLog(state, `${agent.id} BATTERY DEPLETED — returning to base`, 'warning');
      agent.state = 'low_battery';
      continue;
    }

    // Move along route
    if (agent.route.length > 0 && (agent.state === 'moving' || agent.state === 'returning' || agent.state === 'rescuing')) {
      const target = agent.route[0];
      const speed = agent.type === 'drone' ? SPEED_DRONE : SPEED_ROBOT;
      const dx = target.x - agent.position.x;
      const dy = target.y - agent.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist < speed * 1.5) {
        agent.position = { ...target };
        agent.route = agent.route.slice(1);
        agent.distanceTraveled += dist;
      } else {
        agent.position = {
          x: agent.position.x + (dx / dist) * speed,
          y: agent.position.y + (dy / dist) * speed,
        };
        agent.distanceTraveled += speed;
      }
    }

    // Reached civilian — pick up and head to hospital
    if (agent.currentMissionId && agent.route.length === 0 && agent.state === 'moving') {
      const mission = state.missions.find(m => m.id === agent.currentMissionId);
      if (mission) {
        const civ = state.civilians.find(c => c.id === mission.targetId);
        if (civ) {
          civ.status = 'being_rescued';
          civ.health = Math.max(civ.health, 50);
          addLog(state, `${agent.id} picked up ${civ.id} — transporting to hospital`, 'success');
        }
        const hospital = state.buildings.find(b => b.type === 'hospital');
        const shelter = state.buildings.find(b => b.type === 'shelter');
        const dest = hospital || shelter;
        if (dest) {
          const { path, risk } = findPath(agent.position, dest.position, state.hazards, state.buildings, state.roads, agent.type);
          agent.route = path;
          mission.route = path;
          mission.risk = risk;
        }
        agent.state = 'rescuing';
        mission.status = 'active';
      }
    }

    // Reached hospital — admit civilian as rescued
    if (agent.state === 'rescuing' && agent.route.length === 0) {
      const mission = state.missions.find(m => m.id === agent.currentMissionId);
      if (mission) {
        const civ = state.civilians.find(c => c.id === mission.targetId);
        if (civ) {
          civ.status = 'rescued';
          civ.health = 100;
          mission.status = 'completed';
          mission.endTime = state.tick;
          state.stats.civiliansRescued++;
          state.stats.missionsCompleted++;
          agent.missionSuccessRate = state.stats.missionsCompleted / Math.max(1, state.stats.missionsCompleted + state.stats.missionsFailed);
          const hospital = state.buildings.find(b => b.type === 'hospital');
          const shelter = state.buildings.find(b => b.type === 'shelter');
          const destType = hospital ? 'hospital' : shelter ? 'shelter' : 'base';
          addLog(state, `✓ ${civ.id} admitted to ${destType} — rescued by ${agent.id}`, 'success');
        }
        agent.currentMissionId = null;
        agent.targetId = null;

        const nextCiv = state.civilians
          .filter(c => c.status === 'waiting')
          .sort((a, b) => calcUrgencyScore(b) - calcUrgencyScore(a))
          .find(c => !state.missions.some(
            m => m.targetId === c.id && (m.status === 'assigned' || m.status === 'active')
          ));

        if (nextCiv && agent.battery > 15 && agent.health > 10) {
          const { path, risk, distance: dist } = findPath(
            agent.position,
            nextCiv.position,
            state.hazards,
            state.buildings,
            state.roads,
            agent.type
          );
          if (path.length === 0) {
            agent.state = 'idle';
            agent.route = [];
          } else {
            const missionId = `MISS-${++missionIdCounter}`;
            state.missions.push({
              id: missionId,
              type: 'rescue',
              priority: calcUrgencyScore(nextCiv),
              assignedAgentId: agent.id,
              targetId: nextCiv.id,
              targetType: 'civilian',
              status: 'assigned',
              route: path,
              risk,
              distance: dist,
              eta: estimateETA(dist, agent.type),
              startTime: state.tick,
              endTime: null,
              routeInvalidations: 0
            });
            agent.state = 'moving';
            agent.currentMissionId = missionId;
            agent.targetId = nextCiv.id;
            agent.route = path;
            agent.decisionCount++;
            addLog(state, `${agent.id} leaving hospital for ${nextCiv.id}`, 'mission');
          }
        } else {
          agent.state = 'idle';
          agent.route = [];
        }
      }
    }

    // Detect civilians (drones have wider range)
    const detectionRange = agent.type === 'drone' ? 12 : 5;
    for (const civ of state.civilians) {
      if (civ.status !== 'waiting') continue;
      if (civ.detectedBy.includes(agent.id)) continue;
      if (distance(agent.position, civ.position) < detectionRange) {
        civ.detectedBy.push(agent.id);
        addLog(state, `${agent.id} detected ${civ.id} (${civ.urgency}, health: ${Math.round(civ.health)}%)`, 'info');
      }
    }

    // Idle drones scan
    if (agent.state === 'idle' || (agent.state === 'returning' && agent.route.length === 0)) {
      agent.state = 'scanning';
      agent.position = {
        x: Math.max(1, Math.min(37, agent.position.x + randomBetween(-1, 1))),
        y: Math.max(1, Math.min(37, agent.position.y + randomBetween(-1, 1))),
      };
    }
  }
}

function updateHazards(state: SimulationState): void {
  for (const h of state.hazards) {
    if (!h.active) continue;
    h.ticksAlive++;

    // Spread
    if (Math.random() < h.spreadRate * state.config.fireSpread * 0.01) {
      h.radius = Math.min(h.radius + 0.05, 12);
      h.severity = Math.min(h.severity + 0.002, 1);
    }

    // Damage civilians nearby
    for (const civ of state.civilians) {
      if (civ.status === 'rescued' || civ.status === 'being_rescued') continue;
      const d = distance(civ.position, h.position);
      if (d < h.radius) {
        const damage = h.severity * (1 - d / h.radius) * 0.3;
        civ.health = Math.max(0, civ.health - damage);
        civ.hazardExposure = Math.min(1, civ.hazardExposure + 0.05);
        if (civ.health <= 0 && civ.status !== 'deceased') {
          civ.status = 'deceased';
          addLog(state, `⚠ ${civ.id} did not survive — rescue not reached in time`, 'error');
        }

        // Update urgency
        if (civ.health < 25) civ.urgency = 'critical';
        else if (civ.health < 50) civ.urgency = 'high';
        else if (civ.health < 75) civ.urgency = 'medium';
      }
    }

    // Block roads
    for (const road of state.roads) {
      if (road.blocked) continue;
      const midX = (road.start.x + road.end.x) / 2;
      const midY = (road.start.y + road.end.y) / 2;
      if (distance({ x: midX, y: midY }, h.position) < h.radius * 0.8 && h.severity > 0.7) {
        road.blocked = true;
        road.blockageReason = h.type;
        addLog(state, `Road blocked by ${h.type}`, 'warning');
      }
    }
  }

  // Spontaneous new hazards
  const difficulty = { easy: 0.002, medium: 0.005, hard: 0.01, extreme: 0.02 };
  if (Math.random() < difficulty[state.config.difficulty] * state.config.hazardRate * 0.1) {
    const types: Hazard['type'][] = ['fire', 'debris', 'flood'];
    state.hazards.push({
      id: `HAZ-${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)],
      position: { x: randomBetween(5, 33), y: randomBetween(5, 33) },
      severity: randomBetween(0.3, 0.7),
      spreadRate: 0.005,
      radius: randomBetween(1.5, 3.5),
      active: true,
      ticksAlive: 0
    });
    addLog(state, `New hazard detected — ${types[Math.floor(Math.random() * types.length)]}`, 'warning');
  }
}

function updateStats(state: SimulationState): void {
  const totalAgents = state.agents.length;
  const busyAgents = state.agents.filter(a => a.state !== 'idle' && a.state !== 'scanning').length;
  state.stats.agentUtilization = busyAgents / Math.max(1, totalAgents);
  state.stats.civiliansTotal = state.civilians.length;
  state.stats.elapsedTicks = state.tick;

  const completed = state.missions.filter(m => m.status === 'completed');
  if (completed.length > 0) {
    const avgRT = completed.reduce((s, m) => s + (m.endTime ?? m.startTime) - m.startTime, 0) / completed.length;
    state.stats.avgResponseTime = avgRT;
    state.stats.avgRouteLength = completed.reduce((s, m) => s + m.distance, 0) / completed.length;
  }
  state.stats.rescueSuccessRate = state.stats.civiliansRescued / Math.max(1, state.civilians.length);

  // Historical data (every 10 ticks)
  if (state.tick % 10 === 0) {
    state.stats.historicalRescues = [...state.stats.historicalRescues, state.stats.civiliansRescued].slice(-20);
    state.stats.historicalHazards = [...state.stats.historicalHazards, state.hazards.filter(h => h.active).length].slice(-20);
  }
}

export function triggerEmergencyEvent(
  state: SimulationState,
  eventType: EmergencyEvent['type']
): SimulationState {
  const s = { ...state };
  const GRID = 38;
  let description = '';

  if (eventType === 'fire_outbreak') {
    const pos = { x: randomBetween(10, GRID - 10), y: randomBetween(10, GRID - 10) };
    s.hazards = [...s.hazards, {
      id: `HAZ-EV-${++eventIdCounter}`,
      type: 'fire',
      position: pos,
      severity: 0.8,
      spreadRate: 0.015,
      radius: 4,
      active: true,
      ticksAlive: 0
    }];
    description = `Major fire outbreak detected in sector ${Math.round(Math.random() * 9 + 1)}. Multiple civilians at risk.`;
    addLog(s, `🔥 EMERGENCY: ${description}`, 'error');
    addLog(s, `AI recalculating affected routes...`, 'ai');
  } else if (eventType === 'flood_surge') {
    for (let i = 0; i < 2; i++) {
      s.hazards = [...s.hazards, {
        id: `HAZ-FLOOD-${++eventIdCounter}-${i}`,
        type: 'flood',
        position: { x: randomBetween(5, GRID - 5), y: randomBetween(5, GRID - 5) },
        severity: 0.7,
        spreadRate: 0.02,
        radius: 5,
        active: true,
        ticksAlive: 0
      }];
    }
    description = 'Flood surge detected. Water levels rising rapidly.';
    addLog(s, `🌊 EMERGENCY: ${description}`, 'error');
    addLog(s, `AI recalculating affected routes...`, 'ai');
  } else if (eventType === 'building_collapse') {
    const building = s.buildings.find(b => b.type === 'residential' && !b.damaged);
    if (building) {
      building.damaged = true;
      building.type = 'collapsed';
      s.hazards = [...s.hazards, {
        id: `HAZ-COLLAPSE-${++eventIdCounter}`,
        type: 'collapse',
        position: building.position,
        severity: 0.9,
        spreadRate: 0,
        radius: 3,
        active: true,
        ticksAlive: 0
      }];
      description = `Structural collapse at building sector. Civilians may be trapped.`;
    }
    addLog(s, `🏚 EMERGENCY: ${description}`, 'error');
    addLog(s, `AI reassessing nearby civilians...`, 'ai');
  } else if (eventType === 'road_blocked') {
    const road = s.roads.find(r => !r.blocked);
    if (road) {
      road.blocked = true;
      road.blockageReason = 'structural_collapse';
      description = `Road ${road.id} blocked by structural collapse. Routes replanning.`;
      // Invalidate routes using this road
      let replanned = 0;
      for (const agent of s.agents) {
        if (agent.route.length > 2) {
          const mission = s.missions.find(m => m.id === agent.currentMissionId);
          if (mission) {
            const { path, risk } = findPath(agent.position, agent.route[agent.route.length - 1], s.hazards, s.buildings, s.roads, agent.type);
            agent.route = path;
            mission.route = path;
            mission.risk = risk;
            mission.routeInvalidations++;
            s.stats.routeRecalculations++;
            replanned++;
          }
        }
      }
      addLog(s, `🚧 EMERGENCY: ${description}`, 'error');
      if (replanned > 0) addLog(s, `⚠ Route blocked — AI recalculating...`, 'ai');
      if (replanned > 0) addLog(s, `✓ New safe route found`, 'success');
    }
  } else if (eventType === 'aftershock') {
    description = 'Aftershock detected! All agents recalibrating.';
    for (const agent of s.agents) {
      agent.health = Math.max(10, agent.health - randomBetween(5, 20));
      if (agent.route.length > 0) {
        agent.route = [];
        const mission = s.missions.find(m => m.id === agent.currentMissionId);
        if (mission) {
          mission.status = 'replanning';
          mission.routeInvalidations++;
          s.stats.routeRecalculations++;
        }
      }
    }
    addLog(s, `⚠ EMERGENCY: ${description}`, 'error');
    addLog(s, `All agents recalibrating...`, 'warning');
  } else if (eventType === 'low_battery') {
    const drones = s.agents.filter(a => a.type === 'drone');
    if (drones.length > 0) {
      drones[0].battery = 8;
      description = `${drones[0].id} critically low battery. Emergency recall initiated.`;
      addLog(s, `🔋 EMERGENCY: ${description}`, 'warning');
      addLog(s, `Emergency recall initiated`, 'warning');
    }
  }

  const event: EmergencyEvent = {
    id: `EV-${++eventIdCounter}`,
    type: eventType,
    description,
    timestamp: s.tick,
    resolved: false
  };
  s.events = [event, ...s.events];
  return s;
}

export function tick(state: SimulationState): SimulationState {
  if (!state.running || state.paused) return state;

  const s = { ...state, tick: state.tick + 1 };
  s.agents = s.agents.map(a => ({ ...a }));
  s.civilians = s.civilians.map(c => ({ ...c }));
  s.hazards = s.hazards.map(h => ({ ...h }));
  s.roads = s.roads.map(r => ({ ...r }));
  s.missions = s.missions.map(m => ({ ...m }));
  s.aiDecisions = new Map(s.aiDecisions);

  updateHazards(s);
  updateAgents(s);
  assignMissions(s);
  updateStats(s);

  return s;
}

export interface DemoPhase {
  delay: number;
  message: string;
  action?: (state: SimulationState) => SimulationState;
}

export function getDemoPhases(triggerEvent: (type: EmergencyEvent['type']) => void): DemoPhase[] {
  return [
    { delay: 0, message: 'Drone scanning disaster area...' },
    { delay: 4000, message: '3 civilians detected in the disaster zone.' },
    { delay: 8000, message: 'AI is analyzing who needs help first...' },
    { delay: 12000, message: 'CIV-001 requires immediate assistance — CRITICAL health.' },
    { delay: 16000, message: 'Robot R-01 assigned to rescue mission.' },
    { delay: 20000, message: 'Safe route calculated — avoiding fire and debris.' },
    { delay: 25000, message: '⚠ NEW HAZARD DETECTED — fire spreading on route!', action: () => { triggerEvent('fire_outbreak'); return undefined as any; } },
    { delay: 28000, message: '❌ Original route is no longer safe.' },
    { delay: 31000, message: '🧠 AI REPLANNING... finding new safe route.' },
    { delay: 35000, message: '✅ New safe route established.' },
    { delay: 40000, message: 'Robot continues to target on new route.' },
    { delay: 50000, message: '✓ RESCUE SUCCESSFUL — civilian saved!' },
    { delay: 55000, message: 'AI adapted to a changing disaster environment.' },
  ];
}
