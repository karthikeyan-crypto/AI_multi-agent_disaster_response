import { memo, useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Billboard, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { SimulationState, Agent, Civilian, Building, Vector2, Road } from '../../types';
import { useDeviceCapability, type DeviceTier } from '../../hooks/use-device-capability';

type Quality = 'low' | 'medium' | 'high';

function resolveQuality(graphics: Quality, tier: DeviceTier): Quality {
  if (graphics === 'low' || tier === 'low') return 'low';
  if (graphics === 'high' && tier === 'high') return 'high';
  return 'medium';
}

// ── Terrain ─────────────────────────────────────────────────────────────────
function Terrain() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[19, -0.05, 19]} receiveShadow>
      <planeGeometry args={[40, 40, 1, 1]} />
      <meshStandardMaterial color="#0d1420" roughness={0.9} metalness={0.05} />
    </mesh>
  );
}

// ── Roads — wider, brighter, with dashed center lines ──────────────────────────
function RoadMeshBase({ road }: { road: Road }) {
  const isVertical = Math.abs(road.end.x - road.start.x) < 0.1;
  const length = isVertical
    ? Math.abs(road.end.y - road.start.y)
    : Math.abs(road.end.x - road.start.x);
  const midX = (road.start.x + road.end.x) / 2;
  const midY = (road.start.y + road.end.y) / 2;
  const ROAD_WIDTH = 3.5;
  const surfaceColor = road.blocked ? '#5a1010' : '#3a4858';
  const lineColor = road.blocked ? '#ff3322' : '#8aaaca';

  return (
    <group position={[midX, 0.015, midY]}>
      {/* Road surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={isVertical ? [ROAD_WIDTH, length] : [length, ROAD_WIDTH]} />
        <meshStandardMaterial color={surfaceColor} roughness={0.6} metalness={0.1} />
      </mesh>
      {/* Center dashed line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <planeGeometry args={isVertical ? [0.12, length * 0.92] : [length * 0.92, 0.12]} />
        <meshBasicMaterial color={lineColor} />
      </mesh>
      {/* Edge lines */}
      {isVertical ? (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-ROAD_WIDTH / 2 + 0.08, 0.003, 0]}>
            <planeGeometry args={[0.06, length * 0.95]} />
            <meshBasicMaterial color={road.blocked ? '#ff3322' : '#3a5a7a'} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ROAD_WIDTH / 2 - 0.08, 0.003, 0]}>
            <planeGeometry args={[0.06, length * 0.95]} />
            <meshBasicMaterial color={road.blocked ? '#ff3322' : '#3a5a7a'} />
          </mesh>
        </>
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -ROAD_WIDTH / 2 + 0.08]}>
            <planeGeometry args={[length * 0.95, 0.06]} />
            <meshBasicMaterial color={road.blocked ? '#ff3322' : '#3a5a7a'} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, ROAD_WIDTH / 2 - 0.08]}>
            <planeGeometry args={[length * 0.95, 0.06]} />
            <meshBasicMaterial color={road.blocked ? '#ff3322' : '#3a5a7a'} />
          </mesh>
        </>
      )}
      {/* Blocked road: red hazard overlay + warning label */}
      {road.blocked && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <planeGeometry args={isVertical ? [ROAD_WIDTH, length * 0.9] : [length * 0.9, ROAD_WIDTH]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.18} side={THREE.DoubleSide} />
        </mesh>
      )}
      {road.blocked && (
        <Billboard position={[0, 1.5, 0]}>
          <Text fontSize={0.3} color="#ff3322" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#000000">
            ⚠ HAZARD ROAD
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ── Building — taller, more recognizable ──────────────────────────────────────
function BuildingMeshBase({ building, quality }: { building: Building; quality: Quality }) {
  const color = building.type === 'hospital' ? '#1a5a3a'
              : building.type === 'shelter' ? '#1a3a5a'
              : building.type === 'collapsed' ? '#3a2818'
              : building.damaged ? '#2a2418'
              : '#1a2438';
  const edgeColor = building.type === 'hospital' ? '#00ff88'
                  : building.type === 'shelter' ? '#00aaff'
                  : building.type === 'collapsed' ? '#ff6600'
                  : '#4a6a9a';
  const h = building.type === 'collapsed' ? 0.8
          : building.type === 'hospital' ? 5
          : building.type === 'shelter' ? 4
          : 4 + ((parseInt(building.id.replace('building-', '')) || 0) % 3);
  const label = building.type === 'hospital' ? '🏥 HOSPITAL'
              : building.type === 'shelter' ? '🏠 SHELTER'
              : building.type === 'collapsed' ? '⚠ COLLAPSED'
              : '';
  const showWindows = quality !== 'low';
  const showEdges = quality !== 'low';

  return (
    <group position={[building.position.x, 0, building.position.y]}>
      <mesh castShadow={quality === 'high'} receiveShadow position={[0, h / 2, 0]}>
        <boxGeometry args={[building.width, h, building.height]} />
        <meshStandardMaterial color={color} roughness={0.65} metalness={0.25} />
      </mesh>
      {showWindows && building.type !== 'collapsed' && Array.from({ length: Math.floor(h) - 1 }, (_, j) => (
        <group key={j}>
          {Array.from({ length: Math.max(1, Math.floor(building.width) - 1) }, (_, i) => (
            <mesh key={i} position={[building.width / 2 + 0.015, 0.6 + j, -building.height / 2 + 0.5 + i * 0.8]}>
              <planeGeometry args={[0.015, 0.35]} />
              <meshBasicMaterial color={((j + i) % 3 === 0) ? '#ffcc44' : '#3366aa'} />
            </mesh>
          ))}
        </group>
      ))}
      {showEdges && (
        <lineSegments position={[0, h / 2, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(building.width, h, building.height)]} />
          <lineBasicMaterial color={edgeColor} linewidth={1} />
        </lineSegments>
      )}
      {building.type === 'hospital' && (
        <mesh position={[0, h + 0.15, 0]}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
      )}
      {label && (
        <Billboard position={[0, h + 0.8, 0]}>
          <Text fontSize={0.32} color={edgeColor} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
            {label}
          </Text>
        </Billboard>
      )}
    </group>
  );
}

// ── Fire Hazard ───────────────────────────────────────────────────────────────
function FireEffect({ position, radius, severity, quality }: { position: Vector2; radius: number; severity: number; quality: Quality }) {
  const ref = useRef<THREE.Mesh>(null);
  const flameRef = useRef<THREE.Group>(null);
  const t = useRef(0);
  const segs = quality === 'low' ? 8 : 24;
  const flameCount = quality === 'low' ? 2 : 5;

  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(t.current * 4) * 0.12);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(t.current * 3) * 0.15;
    }
    if (flameRef.current) {
      flameRef.current.children.forEach((child, i) => {
        child.position.y = 0.5 + Math.sin(t.current * 5 + i) * 0.3 + (i * 0.3);
        child.scale.setScalar(0.8 + Math.sin(t.current * 6 + i * 2) * 0.2);
      });
    }
  });

  return (
    <group position={[position.x, 0, position.y]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, segs]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.35} />
      </mesh>
      <group ref={flameRef}>
        {Array.from({ length: flameCount }, (_, i) => (
          <mesh key={i} position={[Math.sin(i) * radius * 0.3, 0.5, Math.cos(i) * radius * 0.3]}>
            <coneGeometry args={[0.3, 0.8, 6]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#ff4400' : '#ffaa00'} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>
      {quality === 'high' && (
        <pointLight color="#ff4400" intensity={severity * 5} distance={radius * 5} decay={2} position={[0, 1, 0]} />
      )}
      <Billboard position={[0, radius + 0.5, 0]}>
        <Text fontSize={0.3} color="#ff4400" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
          🔥 FIRE
        </Text>
      </Billboard>
    </group>
  );
}

// ── Flood Hazard ──────────────────────────────────────────────────────────────
function FloodEffect({ position, radius, quality }: { position: Vector2; radius: number; quality: Quality }) {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  const segs = quality === 'low' ? 8 : 24;
  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + Math.sin(t.current * 1.5) * 0.1;
    }
  });
  return (
    <group position={[position.x, 0, position.y]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[radius, segs]} />
        <meshBasicMaterial color="#0066ff" transparent opacity={0.35} />
      </mesh>
      <Billboard position={[0, radius + 0.5, 0]}>
        <Text fontSize={0.3} color="#00aaff" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
          🌊 FLOOD
        </Text>
      </Billboard>
    </group>
  );
}

// ── Debris Hazard ─────────────────────────────────────────────────────────────
function DebrisEffect({ position, radius, quality }: { position: Vector2; radius: number; quality: Quality }) {
  const pieceCount = quality === 'low' ? 3 : 8;
  const pieces = useMemo(() =>
    Array.from({ length: pieceCount }, () => ({
      x: (Math.random() - 0.5) * radius * 1.8,
      z: (Math.random() - 0.5) * radius * 1.8,
      r: Math.random() * Math.PI,
      s: 0.3 + Math.random() * 0.6,
      tx: Math.random() * 0.3,
      tz: Math.random() * 0.3
    })), [radius, pieceCount]);

  return (
    <group position={[position.x, 0, position.y]}>
      {pieces.map((p, i) => (
        <mesh key={i} position={[p.x, p.s / 2, p.z]} rotation={[p.tx, p.r, p.tz]} castShadow={quality === 'high'}>
          <boxGeometry args={[p.s, p.s * 0.5, p.s * 1.2]} />
          <meshStandardMaterial color="#5a4030" roughness={0.9} />
        </mesh>
      ))}
      <Billboard position={[0, radius + 0.3, 0]}>
        <Text fontSize={0.28} color="#aa6633" anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
          🧱 DEBRIS
        </Text>
      </Billboard>
    </group>
  );
}

// ── Civilian Figure — clearly visible human marker ────────────────────────────
function CivilianFigureBase({ civilian, selected, quality }: { civilian: Civilian; selected: boolean; quality: Quality }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const t = useRef(Math.random() * Math.PI * 2);
  const color = civilian.urgency === 'critical' ? '#ff2200'
              : civilian.urgency === 'high' ? '#ff7700'
              : civilian.urgency === 'medium' ? '#ffcc00'
              : '#44ff44';
  const pulseSpeed = civilian.urgency === 'critical' ? 4 : civilian.urgency === 'high' ? 3 : 2;
  const ringSegs = quality === 'low' ? 8 : 16;

  useFrame((_, delta) => {
    t.current += delta * pulseSpeed;
    if (ringRef.current) {
      ringRef.current.scale.setScalar(1 + Math.sin(t.current) * 0.3);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t.current) * 0.3;
    }
  });

  if (civilian.status === 'rescued' || civilian.status === 'deceased' || civilian.status === 'being_rescued') return null;

  return (
    <group position={[civilian.position.x, 0, civilian.position.y]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.4, 0.7, ringSegs]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.35, 0]} castShadow={quality === 'high'}>
        <capsuleGeometry args={[0.12, 0.3, 4, quality === 'low' ? 4 : 8]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.65, 0]}>
        <sphereGeometry args={[0.1, quality === 'low' ? 5 : 8, quality === 'low' ? 5 : 8]} />
        <meshStandardMaterial color="#ffccaa" roughness={0.6} />
      </mesh>
      <Billboard position={[0, 1.0, 0]}>
        <Text fontSize={0.22} color={color} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
          {civilian.id}
        </Text>
        <Text fontSize={0.16} color={color} anchorX="center" anchorY="middle" position={[0, -0.25, 0]} outlineWidth={0.015} outlineColor="#000000">
          {civilian.urgency.toUpperCase()}
        </Text>
      </Billboard>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
          <ringGeometry args={[0.8, 0.9, quality === 'low' ? 16 : 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ── Drone — flies lower, more recognizable ─────────────────────────────────────
function DroneModelBase({ agent, selected, quality }: { agent: Agent; selected: boolean; quality: Quality }) {
  const ref = useRef<THREE.Group>(null);
  const propRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(Math.random() * Math.PI * 2);
  const altitude = agent.altitude ?? 28;

  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      ref.current.position.y = altitude * 0.25 + Math.sin(t.current * 2) * 0.12;
    }
    propRefs.current.forEach(p => {
      if (p) p.rotation.y += delta * 30;
    });
  });

  const color = agent.state === 'rescuing' ? '#00ff88'
              : agent.state === 'low_battery' ? '#ff4400'
              : '#00aaff';
  const stateLabel = agent.state === 'rescuing' ? 'RESCUING'
                   : agent.state === 'low_battery' ? 'LOW BATTERY'
                   : agent.state === 'moving' ? 'EN ROUTE'
                   : 'SCANNING';

  return (
    <group ref={ref} position={[agent.position.x, altitude * 0.25, agent.position.y]}>
      <mesh castShadow={quality === 'high'}>
        <boxGeometry args={[0.45, 0.15, 0.45]} />
        <meshStandardMaterial color="#2a3a5a" roughness={0.5} metalness={0.5} />
      </mesh>
      {/* Arms with spinning propellers */}
      {[[-0.55, 0, 0], [0.55, 0, 0], [0, 0, -0.55], [0, 0, 0.55]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh>
            <cylinderGeometry args={[0.03, 0.03, 0.5, 6]} />
            <meshStandardMaterial color="#1a2a3a" metalness={0.6} />
          </mesh>
          <mesh
            ref={el => { propRefs.current[i] = el; }}
            position={[0, 0.06, 0]}
          >
            <boxGeometry args={[0.5, 0.01, 0.05]} />
            <meshBasicMaterial color={color} transparent opacity={0.6} />
          </mesh>
        </group>
      ))}
      {/* LED indicator */}
      <mesh position={[0, 0.1, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Billboard position={[0, 0.7, 0]}>
        <Text fontSize={0.2} color={color} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
          🚁 {agent.id}
        </Text>
        <Text fontSize={0.14} color={color} anchorX="center" anchorY="middle" position={[0, -0.22, 0]} outlineWidth={0.015} outlineColor="#000000">
          {stateLabel}
        </Text>
      </Billboard>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -altitude * 0.25 + 0.05, 0]}>
          <ringGeometry args={[0.7, 0.8, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ── Ground Robot — clearly distinguishable from drone ────────────────────────
function RobotModelBase({ agent, selected, quality }: { agent: Agent; selected: boolean; quality: Quality }) {
  const ref = useRef<THREE.Group>(null);
  const wheelRefs = useRef<(THREE.Mesh | null)[]>([]);
  const t = useRef(0);

  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current && agent.state === 'moving') {
      wheelRefs.current.forEach(w => { if (w) w.rotation.x += delta * 6; });
    }
  });

  const color = agent.state === 'rescuing' ? '#00ff88'
              : agent.state === 'low_battery' ? '#ff4400'
              : agent.state === 'avoiding_danger' ? '#ff7700'
              : '#44aaff';
  const stateLabel = agent.state === 'rescuing' ? 'RESCUING'
                   : agent.state === 'low_battery' ? 'LOW BATTERY'
                   : agent.state === 'moving' ? 'EN ROUTE'
                   : agent.state === 'returning' ? 'RETURNING'
                   : 'STANDBY';

  return (
    <group ref={ref} position={[agent.position.x, 0, agent.position.y]}>
      <mesh castShadow={quality === 'high'} position={[0, 0.45, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.7]} />
        <meshStandardMaterial color="#2a3a4a" roughness={0.5} metalness={0.4} />
      </mesh>
      {/* Head/cabin */}
      <mesh position={[0, 0.9, 0.15]}>
        <boxGeometry args={[0.4, 0.35, 0.4]} />
        <meshStandardMaterial color="#3a4a5a" roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Eye/headlight */}
      <mesh position={[0, 0.92, 0.35]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {quality === 'high' && (
        <spotLight
          position={[0, 0.92, 0.4]}
          target-position={[0, 0.92, 4]}
          angle={0.4}
          penumbra={0.5}
          intensity={2}
          color={color}
          distance={8}
        />
      )}
      {/* Wheels/tracks — 4 wheels, clearly ground-based */}
      {[[-0.35, -0.3], [0.35, -0.3], [-0.35, 0.3], [0.35, 0.3]].map(([x, z], i) => (
        <mesh
          key={i}
          ref={el => { wheelRefs.current[i] = el; }}
          position={[x, 0.15, z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.15, 0.15, 0.18, 12]} />
          <meshStandardMaterial color="#1a1a2a" roughness={0.8} />
        </mesh>
      ))}
      {/* Arm/manipulator — distinguishes from drone */}
      <mesh position={[0, 0.9, -0.4]} rotation={[0.3, 0, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.5, 6]} />
        <meshStandardMaterial color="#4a5a6a" metalness={0.6} />
      </mesh>
      <Billboard position={[0, 1.4, 0]}>
        <Text fontSize={0.2} color={color} anchorX="center" anchorY="middle" outlineWidth={0.025} outlineColor="#000000">
          🤖 {agent.id}
        </Text>
        <Text fontSize={0.14} color={color} anchorX="center" anchorY="middle" position={[0, -0.22, 0]} outlineWidth={0.015} outlineColor="#000000">
          {stateLabel}
        </Text>
      </Billboard>
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[0.8, 0.9, 32]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function sameAgentView(
  a: { agent: Agent; selected: boolean; quality: Quality },
  b: { agent: Agent; selected: boolean; quality: Quality }
) {
  return a.agent.state === b.agent.state &&
    a.agent.position.x === b.agent.position.x &&
    a.agent.position.y === b.agent.position.y &&
    a.selected === b.selected &&
    a.quality === b.quality;
}

const RoadMesh = memo(RoadMeshBase, (a, b) =>
  a.road.blocked === b.road.blocked && a.road.blockageReason === b.road.blockageReason
);
const BuildingMesh = memo(BuildingMeshBase, (a, b) =>
  a.building.type === b.building.type && a.building.damaged === b.building.damaged && a.quality === b.quality
);
const CivilianFigure = memo(CivilianFigureBase, (a, b) =>
  a.civilian.status === b.civilian.status &&
  a.civilian.urgency === b.civilian.urgency &&
  Math.round(a.civilian.health) === Math.round(b.civilian.health) &&
  a.selected === b.selected &&
  a.quality === b.quality
);
const DroneModel = memo(DroneModelBase, sameAgentView);
const RobotModel = memo(RobotModelBase, sameAgentView);

// ── Animated Route Line with label ────────────────────────────────────────────
function AnimatedRoute({ route, risk, blocked, agentType, eta }: {
  route: Vector2[]; risk: number; blocked?: boolean; agentType: 'drone' | 'ground_robot'; eta: number;
}) {
  const points = useMemo(() =>
    route.map(p => new THREE.Vector3(p.x, agentType === 'drone' ? 3 : 0.15, p.y)),
    [route, agentType]
  );

  if (points.length < 2) return null;

  const isGround = agentType === 'ground_robot';
  const lineColor = blocked ? '#ff2200' : risk > 0.6 ? '#ff4400' : risk > 0.3 ? '#ffaa00' : isGround ? '#00ffaa' : '#00aaff';
  const midIdx = Math.floor(points.length / 2);
  const midPoint = points[midIdx];

  const etaStr = `${String(Math.floor(eta / 60)).padStart(2, '0')}:${String(Math.round(eta % 60)).padStart(2, '0')}`;
  const routeLabel = blocked ? '❌ BLOCKED' : risk > 0.6 ? '⚠ HIGH RISK' : isGround ? '🟢 GROUND ROUTE' : '🔵 DRONE ROUTE';
  const labelColor = blocked ? '#ff2200' : isGround ? '#00ffaa' : '#00aaff';
  const lineWidth = isGround ? 8 : 4;

  return (
    <group>
      <Line points={points} color={lineColor} lineWidth={blocked ? 4 : lineWidth} dashed={blocked} dashSize={0.4} gapSize={0.3} />
      {/* Route label at midpoint */}
      <Billboard position={[midPoint.x, isGround ? 1.2 : 3.5, midPoint.z]}>
        <Text fontSize={0.16} color={labelColor} anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#000000">
          {routeLabel}
        </Text>
        {!blocked && (
          <Text fontSize={0.12} color={labelColor} anchorX="center" anchorY="middle" position={[0, -0.2, 0]} outlineWidth={0.015} outlineColor="#000000">
            ETA {etaStr}
          </Text>
        )}
      </Billboard>
    </group>
  );
}

// ── Camera Controller ──────────────────────────────────────────────────────────
function CameraController({ resetTrigger }: { running: boolean; resetTrigger: number }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(19, 28, 45);
    camera.lookAt(19, 0, 19);
  }, [camera]);

  useEffect(() => {
    if (resetTrigger > 0) {
      camera.position.set(19, 28, 45);
      camera.lookAt(19, 0, 19);
    }
  }, [resetTrigger, camera]);

  return null;
}

// ── Main Scene ────────────────────────────────────────────────────────────────
interface DisasterSceneProps {
  simState: SimulationState;
  resetTrigger?: number;
}

export default function DisasterScene({ simState, resetTrigger = 0 }: DisasterSceneProps) {
  const { agents, civilians, hazards, buildings, roads, missions } = simState;
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(simState.selectedAgentId);
  const deviceCap = useDeviceCapability();
  const quality = resolveQuality(simState.graphicsQuality, deviceCap.tier);

  useEffect(() => {
    setSelectedAgentId(simState.selectedAgentId);
  }, [simState.selectedAgentId]);

  const routes = useMemo(() =>
    agents
      .filter(a => a.route.length > 1 && a.type === 'ground_robot')
      .map(a => {
        const mission = missions.find(m => m.id === a.currentMissionId);
        return {
          id: a.id,
          route: a.route,
          risk: mission?.risk ?? 0,
          type: a.type,
          blocked: mission?.status === 'replanning',
          eta: mission?.eta ?? 0,
        };
      }),
    [agents, missions]
  );

  const dpr: [number, number] = quality === 'low' ? [0.5, 1] : quality === 'medium' ? [0.75, 1.5] : [1, 2];
  const shadowMapSize = quality === 'low' ? 512 : quality === 'medium' ? 1024 : 2048;

  return (
    <Canvas
      shadows={quality !== 'low'}
      dpr={dpr}
      gl={{ antialias: quality !== 'low', alpha: true, powerPreference: 'high-performance' }}
      frameloop={quality === 'low' ? 'demand' : 'always'}
      style={{ background: 'linear-gradient(180deg, #0a1020 0%, #0d1525 50%, #101828 100%)' }}
      camera={{ position: [19, 28, 45], fov: 50 }}
    >
      <ambientLight intensity={0.5} color="#6080b0" />
      <hemisphereLight args={['#7090c0', '#252d3d', 0.5]} />
      <directionalLight
        position={[15, 30, 15]}
        intensity={0.9}
        color="#b0c0e0"
        castShadow={quality !== 'low'}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
      />
      {quality !== 'low' && (
        <pointLight position={[19, 18, 19]} intensity={0.6} color="#004488" distance={70} />
      )}
      <fog attach="fog" args={['#0a1020', 55, 110]} />

      <CameraController running={simState.running} resetTrigger={resetTrigger} />
      <OrbitControls
        target={[19, 0, 19]}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.05}
        minPolarAngle={0.1}
        minDistance={8}
        maxDistance={80}
      />

      <Terrain />

      {roads.map(r => <RoadMesh key={r.id} road={r} />)}

      {buildings.map(b => <BuildingMesh key={b.id} building={b} quality={quality} />)}

      {hazards.filter(h => h.active).map(h => (
        h.type === 'fire' ? <FireEffect key={h.id} position={h.position} radius={h.radius} severity={h.severity} quality={quality} />
        : h.type === 'flood' ? <FloodEffect key={h.id} position={h.position} radius={h.radius} quality={quality} />
        : <DebrisEffect key={h.id} position={h.position} radius={h.radius} quality={quality} />
      ))}

      {civilians.map(c => (
        <CivilianFigure key={c.id} civilian={c} selected={selectedAgentId === c.id} quality={quality} />
      ))}

      {routes.map(r => (
        <AnimatedRoute
          key={r.id}
          route={r.route}
          risk={r.risk}
          blocked={r.blocked}
          agentType={r.type}
          eta={r.eta}
        />
      ))}

      {agents.map(a =>
        a.type === 'drone'
          ? <DroneModel key={a.id} agent={a} selected={selectedAgentId === a.id} quality={quality} />
          : <RobotModel key={a.id} agent={a} selected={selectedAgentId === a.id} quality={quality} />
      )}
    </Canvas>
  );
}
