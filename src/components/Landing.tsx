import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';

// ── 3D Hero Scene ─────────────────────────────────────────────────────────────
function HeroBuildings() {
  const buildingData = [
    { x: -8, z: -5, h: 4, w: 1.5, color: '#0f1520' },
    { x: -5, z: -3, h: 6, w: 1.2, color: '#0d1a28' },
    { x: -3, z: -6, h: 3, w: 2, color: '#0a1218' },
    { x: 0, z: -4, h: 7, w: 1.8, color: '#0f1520' },
    { x: 3, z: -5, h: 5, w: 1.4, color: '#0d1a28' },
    { x: 6, z: -3, h: 4, w: 1.6, color: '#0a1520' },
    { x: 8, z: -6, h: 6, w: 1.2, color: '#0f1828' },
    { x: -6, z: 2, h: 3.5, w: 1.8, color: '#0a1218' },
    { x: 5, z: 2, h: 2.5, w: 1.5, color: '#0d1520' },
  ];

  return (
    <group>
      {buildingData.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh castShadow position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.w, b.h, b.w]} />
            <meshLambertMaterial color={b.color} />
          </mesh>
          <lineSegments position={[0, b.h / 2, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(b.w, b.h, b.w)]} />
            <lineBasicMaterial color="#1a3a5a" />
          </lineSegments>
          {/* Windows */}
          {Array.from({ length: Math.floor(b.h) }, (_, j) => (
            <mesh key={j} position={[b.w / 2 + 0.01, 0.8 + j * 1, 0]}>
              <planeGeometry args={[0.02, 0.3, 1, 1]} />
              <meshBasicMaterial color={Math.random() > 0.4 ? '#ffcc44' : '#224466'} transparent opacity={0.8} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function FloatingDrone() {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      ref.current.position.x = Math.sin(t.current * 0.5) * 3;
      ref.current.position.y = 5 + Math.sin(t.current * 0.8) * 0.3;
      ref.current.position.z = Math.cos(t.current * 0.4) * 2;
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={ref} position={[0, 5, 0]}>
      <mesh>
        <boxGeometry args={[0.4, 0.12, 0.4]} />
        <meshLambertMaterial color="#1a2a4a" />
      </mesh>
      {[[-0.5, 0, 0], [0.5, 0, 0], [0, 0, -0.5], [0, 0, 0.5]].map((pos, i) => (
        <group key={i} position={pos as [number, number, number]}>
          <mesh rotation={[0, i * Math.PI / 4, 0]}>
            <cylinderGeometry args={[0.2, 0.2, 0.02, 12]} />
            <meshBasicMaterial color="#00aaff" transparent opacity={0.7} />
          </mesh>
        </group>
      ))}
      <pointLight color="#00aaff" intensity={2} distance={5} />
      <Billboard position={[0, 0.5, 0]}>
        <Text fontSize={0.25} color="#00aaff">ARES-D01</Text>
      </Billboard>
    </group>
  );
}

function FireEffect3D() {
  const ref = useRef<THREE.Mesh>(null);
  const t = useRef(0);
  useFrame((_, delta) => {
    t.current += delta;
    if (ref.current) {
      ref.current.scale.setScalar(1 + Math.sin(t.current * 4) * 0.15);
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.4 + Math.sin(t.current * 3) * 0.2;
    }
  });

  return (
    <group position={[-3, 0, 2]}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 16]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.4} />
      </mesh>
      <pointLight color="#ff4400" intensity={4} distance={8} position={[0, 1, 0]} />
    </group>
  );
}

function HeroScene() {
  return (
    <>
      <ambientLight intensity={0.1} color="#102030" />
      <directionalLight position={[5, 10, 5]} intensity={0.4} color="#8ab4d0" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#003366" distance={25} />
      <fog attach="fog" args={['#060912', 20, 50]} />
      <Stars radius={80} depth={50} count={2000} factor={3} saturation={0} fade />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshLambertMaterial color="#080d14" />
      </mesh>

      <HeroBuildings />
      <FloatingDrone />
      <FireEffect3D />

      {/* Holographic grid on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[30, 30, 15, 15]} />
        <meshBasicMaterial color="#0a2040" wireframe transparent opacity={0.15} />
      </mesh>

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI / 2.5}
        minPolarAngle={Math.PI / 4}
      />
    </>
  );
}

// ── AI Pipeline Component ─────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { label: 'PERCEPTION', desc: 'Sensors scan the environment for hazards, civilians, and obstacles in real time.' },
  { label: 'ENVIRONMENT ANALYSIS', desc: 'The system maps terrain, hazard zones, and civilian locations into a dynamic world model.' },
  { label: 'UTILITY AI', desc: 'Each potential action is scored using weighted utility functions considering urgency, risk, and resource state.' },
  { label: 'MISSION SELECTION', desc: 'The highest-utility mission is selected and assigned to the best available agent.' },
  { label: 'GOAP PLANNING', desc: 'Goal-Oriented Action Planning sequences the steps needed to complete the mission goal.' },
  { label: 'A* PATHFINDING', desc: 'A* calculates the safest, shortest route through the disaster environment avoiding blocked areas.' },
  { label: 'MULTI-AGENT COORD.', desc: 'Agents communicate to avoid conflicts, share target claims, and coordinate coverage.' },
  { label: 'ACTION', desc: 'The agent executes its planned action — moving, rescuing, extinguishing, or scanning.' },
  { label: 'ENVIRONMENT UPDATE', desc: 'The world model is updated based on agent actions and evolving conditions.' },
  { label: 'RE-EVALUATION', desc: 'All priorities and routes are recalculated, beginning the next decision cycle.' },
];

function AIPipeline() {
  const [active, setActive] = useState<number | null>(null);
  const [flowing, setFlowing] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setFlowing(f => (f + 1) % PIPELINE_STEPS.length), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative">
      {PIPELINE_STEPS.map((step, i) => (
        <div key={i} className="flex items-start gap-4 mb-2">
          <div className="flex flex-col items-center">
            <button
              onClick={() => setActive(active === i ? null : i)}
              className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${
                flowing === i ? 'border-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.2)] text-[var(--ares-cyan)] scale-110'
                : active === i ? 'border-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.1)] text-[var(--ares-cyan)]'
                : 'border-[var(--ares-panel-border)] text-muted-foreground hover:border-[var(--ares-cyan-dim)]'
              }`}
            >
              {i + 1}
            </button>
            {i < PIPELINE_STEPS.length - 1 && (
              <div className={`w-px h-4 mt-1 transition-colors duration-300 ${flowing === i ? 'bg-[var(--ares-cyan)]' : 'bg-[var(--ares-panel-border)]'}`} />
            )}
          </div>
          <div className="flex-1 pt-1">
            <div className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${
              flowing === i ? 'text-[var(--ares-cyan)]' : 'text-muted-foreground'
            }`}>
              {step.label}
            </div>
            <AnimatePresence>
              {active === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] text-muted-foreground mt-1 leading-relaxed"
                >
                  {step.desc}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tech Stack ────────────────────────────────────────────────────────────────
const TECH = [
  { name: 'React + TypeScript', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'Three.js / React Three Fiber', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'WebGL', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'Framer Motion', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'A* Pathfinding', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'Utility AI', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'Multi-Agent System', status: 'IMPLEMENTED', color: 'text-[var(--ares-green)]' },
  { name: 'GOAP Planning', status: 'SIMULATED', color: 'text-[var(--ares-yellow)]' },
  { name: 'LLM / AI Copilot API', status: 'INTEGRATION-READY', color: 'text-[var(--ares-cyan)]' },
  { name: 'YOLO / OpenCV', status: 'INTEGRATION-READY', color: 'text-[var(--ares-cyan)]' },
  { name: 'WebSocket Real-time', status: 'INTEGRATION-READY', color: 'text-[var(--ares-cyan)]' },
  { name: 'Python Backend', status: 'INTEGRATION-READY', color: 'text-[var(--ares-cyan)]' },
];

interface LandingProps {
  onEnter: () => void;
}

export default function Landing({ onEnter }: LandingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: containerRef });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.15], [0, -60]);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto scroll-smooth bg-[var(--background)]">

      {/* ── HERO ── */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* 3D Background */}
        <div className="absolute inset-0">
          <Canvas camera={{ position: [0, 4, 12], fov: 50 }} dpr={[0.5, 1.5]} gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }} style={{ background: 'transparent' }}>
            <HeroScene />
          </Canvas>
        </div>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[oklch(0.08_0.01_240_/_0.3)] to-[var(--background)]" />
        <div className="absolute inset-0 bg-gradient-radial from-transparent to-[oklch(0.08_0.01_240_/_0.6)]" />

        {/* Hero content */}
        <motion.div
          style={{ opacity: heroOpacity, y: heroY }}
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-[var(--ares-cyan)] mb-4 relative">
              <div className="w-8 h-8 rounded-full border border-[var(--ares-cyan-dim)] flex items-center justify-center animate-pulse">
                <div className="w-3 h-3 rounded-full bg-[var(--ares-cyan)]" />
              </div>
              <div className="absolute inset-0 rounded-full border border-[var(--ares-cyan)] animate-ping opacity-20" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-8xl font-black tracking-[0.4em] text-[var(--ares-cyan)] mb-2"
            style={{ textShadow: '0 0 40px oklch(0.65 0.18 195 / 0.4)' }}
          >
            ARES
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-sm font-semibold tracking-[0.25em] text-muted-foreground uppercase mb-4"
          >
            AI Rescue & Emergency System
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-lg text-foreground/80 font-light mb-2"
          >
            AI-Powered Multi-Agent Disaster Response
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="text-sm text-muted-foreground mb-10"
          >
            "Intelligence for the moments that matter."
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              className="px-8 py-3 rounded-lg font-bold text-sm tracking-widest uppercase bg-[var(--ares-cyan)] text-[oklch(0.08_0.01_240)] hover:bg-[oklch(0.80_0.18_195)] transition-all animate-pulse-cyan"
            >
              ⚡ ENTER COMMAND CENTER
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-3 rounded-lg font-bold text-sm tracking-widest uppercase border border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground hover:border-[var(--ares-cyan-dim)] transition-all"
            >
              VIEW HOW IT WORKS
            </motion.button>
          </motion.div>

          {/* Human oversight badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.6 }}
            className="mt-6 flex items-center justify-center gap-2 text-[10px] text-muted-foreground"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-green)]" />
            <span className="uppercase tracking-wider">HUMAN OVERSIGHT ACTIVE — Decision-Support Simulation</span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 text-muted-foreground text-xs flex flex-col items-center gap-2"
        >
          <span className="text-[9px] uppercase tracking-widest">Scroll to explore</span>
          <div className="w-px h-8 bg-gradient-to-b from-[var(--ares-cyan)] to-transparent" />
        </motion.div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-[10px] text-[var(--ares-cyan)] uppercase tracking-[0.3em] mb-4">The Problem</div>
          <h2 className="text-4xl font-black text-foreground mb-6 leading-tight">
            Disasters are dynamic.<br />
            <span className="text-muted-foreground font-light">Response systems are not.</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {[
              { icon: '⏱', title: 'Critical Delay', desc: 'Manual coordination takes minutes. Every second counts when lives are at risk in dynamic disaster environments.' },
              { icon: '🗺', title: 'Hazard Blindness', desc: 'Responders lack real-time awareness of spreading fires, floods, and structural collapses that block rescue routes.' },
              { icon: '🤝', title: 'Poor Coordination', desc: 'Multiple units operating without central AI coordination leads to duplicated effort and missed critical victims.' },
            ].map(item => (
              <div key={item.title} className="ares-panel rounded-xl p-6 border border-[var(--ares-panel-border)]">
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── SOLUTION ── */}
      <section className="py-24 px-6 bg-[oklch(0.10_0.01_240_/_0.5)] border-y border-[var(--ares-panel-border)]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-[10px] text-[var(--ares-cyan)] uppercase tracking-[0.3em] mb-4">The Solution</div>
            <h2 className="text-4xl font-black text-foreground mb-6">
              Autonomous intelligence.<br />
              <span className="text-[var(--ares-cyan)]">See. Decide. Adapt. Rescue.</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
              ARES deploys a fleet of AI-powered aerial drones and ground rescue robots that continuously perceive the environment, calculate rescue priorities, plan safe routes, and coordinate to maximize civilian survival — all while adapting in real time to changing conditions.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
              {[
                { label: 'AI Decision Cycles', value: '~50ms' },
                { label: 'Route Recalculation', value: 'Real-time' },
                { label: 'Agent Types', value: '2' },
                { label: 'Hazard Types', value: '5+' },
              ].map(stat => (
                <div key={stat.label} className="text-center p-4 border border-[var(--ares-panel-border)] rounded-lg bg-[var(--ares-surface)]">
                  <div className="text-2xl font-black text-[var(--ares-cyan)] font-mono-data">{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="text-[10px] text-[var(--ares-cyan)] uppercase tracking-[0.3em] mb-4">AI Architecture</div>
          <h2 className="text-4xl font-black text-foreground mb-10">How ARES Thinks</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <AIPipeline />
            <div className="space-y-6">
              <div className="ares-panel rounded-xl p-6 border border-[var(--ares-panel-border)]">
                <h3 className="font-bold text-[var(--ares-cyan)] mb-2 text-sm uppercase tracking-wider">Multi-Agent Coordination</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Drones and ground robots share a unified world model. Each agent claims targets to prevent duplication, communicates route conflicts, and collaborates to maximize coverage of the disaster zone.
                </p>
              </div>
              <div className="ares-panel rounded-xl p-6 border border-[var(--ares-panel-border)]">
                <h3 className="font-bold text-[var(--ares-cyan)] mb-2 text-sm uppercase tracking-wider">Dynamic Pathfinding</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  A* pathfinding continuously recalculates routes as hazards spread. When a road is blocked or fire encroaches, new safe paths are generated within milliseconds and agents adapt immediately.
                </p>
              </div>
              <div className="ares-panel rounded-xl p-6 border border-[var(--ares-panel-border)]">
                <h3 className="font-bold text-[var(--ares-cyan)] mb-2 text-sm uppercase tracking-wider">Human Oversight</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  ARES operates as a decision-support system. All AI recommendations are visible and auditable. Human operators retain authority over real-world rescue decisions.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── TECHNOLOGY ── */}
      <section className="py-24 px-6 bg-[oklch(0.10_0.01_240_/_0.5)] border-y border-[var(--ares-panel-border)]">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="text-[10px] text-[var(--ares-cyan)] uppercase tracking-[0.3em] mb-4">Technology Stack</div>
            <h2 className="text-4xl font-black text-foreground mb-10">Built for real-world integration.</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TECH.map(t => (
                <div key={t.name} className="flex items-center gap-3 p-3 ares-panel rounded-lg border border-[var(--ares-panel-border)]">
                  <div className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-current ${t.color} shrink-0`}>
                    {t.status === 'IMPLEMENTED' ? 'LIVE' : t.status === 'SIMULATED' ? 'SIM' : 'READY'}
                  </div>
                  <span className="text-xs text-foreground">{t.name}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-4 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded border border-[var(--ares-green)] text-[var(--ares-green)]" /> Implemented</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded border border-[var(--ares-yellow)]" /> Simulated</div>
              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded border border-[var(--ares-cyan)]" /> Integration-Ready</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── IMPACT ── */}
      <section className="py-24 px-6 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center"
        >
          <div className="text-[10px] text-[var(--ares-cyan)] uppercase tracking-[0.3em] mb-4">Impact</div>
          <h2 className="text-4xl font-black text-foreground mb-6">
            Faster response.<br />
            <span className="text-[var(--ares-cyan)]">More lives saved.</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed">
            By automating coordination, pathfinding, and priority calculation, ARES dramatically reduces the time from hazard detection to civilian rescue.
          </p>

          <div className="flex justify-center">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              className="px-12 py-4 rounded-lg font-black text-base tracking-widest uppercase bg-[var(--ares-cyan)] text-[oklch(0.08_0.01_240)] hover:bg-[oklch(0.80_0.18_195)] transition-all animate-pulse-cyan"
            >
              ⚡ ENTER COMMAND CENTER
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-[var(--ares-panel-border)] text-center">
        <div className="text-sm font-black tracking-[0.3em] text-[var(--ares-cyan)] mb-1">ARES</div>
        <div className="text-xs text-muted-foreground">AI Rescue & Emergency System · Hackathon Demo · All data simulated</div>
        <div className="text-[10px] text-muted-foreground/50 mt-2">
          Built with React · Three.js · React Three Fiber · TypeScript
        </div>
      </footer>
    </div>
  );
}
