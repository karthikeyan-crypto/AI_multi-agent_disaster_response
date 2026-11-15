import type { Vector2, Hazard, Building, Road } from '../types';

interface Node {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: Node | null;
}

const GRID_SIZE = 40;
const CELL_SIZE = 1;

function heuristic(a: Vector2, b: Vector2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function worldToGrid(pos: Vector2): Vector2 {
  return { x: Math.round(pos.x / CELL_SIZE), y: Math.round(pos.y / CELL_SIZE) };
}

function gridToWorld(pos: Vector2): Vector2 {
  return { x: pos.x * CELL_SIZE, y: pos.y * CELL_SIZE };
}

// Build a set of road grid cells from road definitions
function buildRoadSet(roads: Road[]): Set<string> {
  const roadCells = new Set<string>();
  const ROAD_HALF_WIDTH = 1.5; // roads are ~3 units wide
  for (const road of roads) {
    if (road.blocked) continue;
    const isVertical = Math.abs(road.end.x - road.start.x) < 0.1;
    if (isVertical) {
      const gx = Math.round(road.start.x);
      for (let y = 0; y <= GRID_SIZE; y++) {
        for (let dx = -Math.ceil(ROAD_HALF_WIDTH); dx <= Math.ceil(ROAD_HALF_WIDTH); dx++) {
          roadCells.add(`${gx + dx},${y}`);
        }
      }
    } else {
      const gy = Math.round(road.start.y);
      for (let x = 0; x <= GRID_SIZE; x++) {
        for (let dy = -Math.ceil(ROAD_HALF_WIDTH); dy <= Math.ceil(ROAD_HALF_WIDTH); dy++) {
          roadCells.add(`${x},${gy + dy}`);
        }
      }
    }
  }
  return roadCells;
}

// Build a set of building grid cells (blocked)
function buildBuildingSet(buildings: Building[]): Set<string> {
  const buildingCells = new Set<string>();
  for (const b of buildings) {
    const gx = Math.round(b.position.x);
    const gy = Math.round(b.position.y);
    const hw = Math.floor(b.width / 2);
    const hh = Math.floor(b.height / 2);
    for (let dx = -hw; dx <= hw; dx++) {
      for (let dy = -hh; dy <= hh; dy++) {
        buildingCells.add(`${gx + dx},${gy + dy}`);
      }
    }
  }
  return buildingCells;
}

function getHazardCost(x: number, y: number, hazards: Hazard[]): number {
  let cost = 0;
  for (const h of hazards) {
    if (!h.active) continue;
    const gx = Math.round(h.position.x / CELL_SIZE);
    const gy = Math.round(h.position.y / CELL_SIZE);
    const dist = Math.hypot(x - gx, y - gy);
    const radius = Math.ceil(h.radius / CELL_SIZE);
    if (dist < radius) {
      cost += h.severity * (1 - dist / radius) * 20;
    }
  }
  return cost;
}

export function findPath(
  start: Vector2,
  end: Vector2,
  hazards: Hazard[],
  buildings: Building[] = [],
  roads: Road[] = [],
  agentType: 'drone' | 'ground_robot' = 'ground_robot'
): { path: Vector2[]; risk: number; distance: number } {
  const startGrid = worldToGrid(start);
  const endGrid = worldToGrid(end);

  const roadSet = buildRoadSet(roads);
  const buildingSet = buildBuildingSet(buildings);
  const hazardSet = buildHazardSet(hazards);

  const groundStrict = agentType === 'ground_robot';
  // Ground agents must stay on roads and out of buildings.
  // Snap start/end to nearest road cell that is not covered by a building.
  if (groundStrict) {
    const startSnapped = snapToRoad(startGrid, roadSet, buildingSet);
    const endSnapped = snapToRoad(endGrid, roadSet, buildingSet);
    startGrid.x = startSnapped.x;
    startGrid.y = startSnapped.y;
    endGrid.x = endSnapped.x;
    endGrid.y = endSnapped.y;
  }

  const open: Node[] = [];
  const closed = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: Node = {
    x: startGrid.x, y: startGrid.y,
    g: 0, h: heuristic(startGrid, endGrid), f: 0, parent: null
  };
  startNode.f = startNode.h;
  open.push(startNode);

  let totalRisk = 0;
  let iterations = 0;
  const MAX_ITER = 3000;

  while (open.length > 0 && iterations < MAX_ITER) {
    iterations++;
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const ck = key(current.x, current.y);
    if (closed.has(ck)) continue;
    closed.add(ck);

    if (current.x === endGrid.x && current.y === endGrid.y) {
      const path: Vector2[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift(gridToWorld({ x: node.x, y: node.y }));
        node = node.parent;
      }
      const distance = path.reduce((sum, p, i) => {
        if (i === 0) return 0;
        return sum + Math.hypot(p.x - path[i-1].x, p.y - path[i-1].y);
      }, 0);
      return { path, risk: Math.min(totalRisk / Math.max(path.length, 1), 1), distance };
    }

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
      { x: current.x + 1, y: current.y + 1 },
      { x: current.x - 1, y: current.y - 1 },
      { x: current.x + 1, y: current.y - 1 },
      { x: current.x - 1, y: current.y + 1 },
    ];

    for (const n of neighbors) {
      if (n.x < 0 || n.x >= GRID_SIZE || n.y < 0 || n.y >= GRID_SIZE) continue;
      if (closed.has(key(n.x, n.y))) continue;

      const nk = key(n.x, n.y);
      // Block building cells — agents cannot travel through buildings
      if (buildingSet.has(nk)) continue;

      // Ground agents: strictly road-only
      if (groundStrict && !roadSet.has(nk)) continue;

      // Block any hazard cell entirely (no going through hazards)
      if (hazardSet.has(nk)) continue;

      const isRoad = roadSet.has(nk);
      const moveCost = (n.x !== current.x && n.y !== current.y) ? 1.414 : 1;
      // Roads are strongly preferred (cost 1), off-road is expensive (cost 8)
      const terrainCost = isRoad ? 0 : 7;
      const g = current.g + moveCost + terrainCost;
      const h = heuristic(n, endGrid);

      const existing = open.find(o => o.x === n.x && o.y === n.y);
      if (existing && existing.g <= g) continue;

      if (existing) {
        existing.g = g;
        existing.f = g + h;
        existing.parent = current;
      } else {
        open.push({ x: n.x, y: n.y, g, h, f: g + h, parent: current });
      }
    }
  }

  // fallback: straight line (ignoring buildings as last resort)
  const path = [{ ...start }, { ...end }];
  const distance = Math.hypot(end.x - start.x, end.y - start.y);
  return { path, risk: 0.8, distance };
}

// Build a set of grid cells covered by active hazards — these are fully blocked.
// Collapse hazards are excluded here: the collapsed building's own cells are
// already blocked by buildBuildingSet, but surrounding roads must stay open
// so ground agents can still reach civilians near the collapse.
function buildHazardSet(hazards: Hazard[]): Set<string> {
  const cells = new Set<string>();
  for (const h of hazards) {
    if (!h.active) continue;
    if (h.type === 'collapse') continue;
    const cx = Math.round(h.position.x / CELL_SIZE);
    const cy = Math.round(h.position.y / CELL_SIZE);
    const r = Math.ceil(h.radius / CELL_SIZE);
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        if (Math.hypot(dx, dy) <= r) cells.add(`${cx + dx},${cy + dy}`);
      }
    }
  }
  return cells;
}

// Snap a grid point to the nearest road cell that is not inside a building.
// This ensures ground agents route to a reachable road cell adjacent to
// buildings (hospital, shelter, etc.) instead of the building's interior.
function snapToRoad(pos: Vector2, roadSet: Set<string>, buildingSet: Set<string>): Vector2 {
  const k = `${pos.x},${pos.y}`;
  if (roadSet.has(k) && !buildingSet.has(k)) return pos;
  let best = pos;
  let bestDist = Infinity;
  for (let r = 1; r <= 10; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const nx = pos.x + dx;
        const ny = pos.y + dy;
        const nk = `${nx},${ny}`;
        if (roadSet.has(nk) && !buildingSet.has(nk)) {
          const d = Math.hypot(dx, dy);
          if (d < bestDist) { bestDist = d; best = { x: nx, y: ny }; }
        }
      }
    }
    if (bestDist < Infinity) return best;
  }
  return best;
}

export function calculateRouteRisk(path: Vector2[], hazards: Hazard[]): number {
  if (path.length === 0) return 0;
  let totalRisk = 0;
  for (const point of path) {
    const gp = worldToGrid(point);
    totalRisk += getHazardCost(gp.x, gp.y, hazards) * 0.1;
  }
  return Math.min(totalRisk / path.length, 1);
}

export function estimateETA(distance: number, agentType: 'drone' | 'ground_robot'): number {
  const speed = agentType === 'drone' ? 8 : 4;
  return distance / speed;
}
