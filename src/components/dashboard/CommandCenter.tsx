import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DisasterScene from '../3d/DisasterScene';
import AgentPanel from './AgentPanel';
import MissionLog from './MissionLog';
import RescuePriority from './RescuePriority';
import DisasterControl from './DisasterControl';
import AICopilot from './AICopilot';
import Analytics from './Analytics';
import AIPipeline, { type PipelineStep } from './AIPipeline';
import AIDecisionPanel from './AIDecisionPanel';
import CurrentMissionCard from './CurrentMissionCard';
import HowItWorksOverlay from './HowItWorksOverlay';
import type { SimulationState, SimulationConfig, EmergencyEvent } from '../../types';
import { createInitialState, tick, triggerEmergencyEvent, getDemoPhases } from '../../simulation/engine';
import { useDeviceCapability } from '../../hooks/use-device-capability';

const DEFAULT_CONFIG: SimulationConfig = {
  disasterType: 'earthquake',
  difficulty: 'medium',
  civilianCount: 10,
  droneCount: 2,
  robotCount: 2,
  hazardRate: 5,
  fireSpread: 5,
  floodSpread: 3,
  eventFrequency: 5,
};

function TopBar({ state, onBack, viewMode, onViewModeChange, onHowItWorks }: {
  state: SimulationState;
  onBack: () => void;
  viewMode: 'simple' | 'advanced';
  onViewModeChange: (m: 'simple' | 'advanced') => void;
  onHowItWorks: () => void;
}) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const simTime = state.tick * 0.5;
  const mm = Math.floor(simTime / 60);
  const ss = Math.floor(simTime % 60);

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-[var(--ares-panel-border)] bg-[oklch(0.08_0.01_240_/_0.95)] backdrop-blur-xl shrink-0 z-50">
      {/* Left: Logo + status */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors text-xs mr-1">
          ← BACK
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-[var(--ares-cyan)] flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-[var(--ares-cyan)] animate-pulse" />
          </div>
          <span className="text-sm font-black tracking-[0.3em] text-[var(--ares-cyan)]">ARES</span>
        </div>
        <div className="h-4 w-px bg-[var(--ares-panel-border)]" />
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${state.running && !state.paused ? 'bg-[var(--ares-green)] animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-wider">
            {state.running && !state.paused ? 'LIVE' : state.paused ? 'PAUSED' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Center: Clear stats with icons */}
      <div className="flex items-center gap-5">
        {[
          { icon: '👤', label: 'RESCUED', value: state.stats.civiliansRescued, color: 'text-[var(--ares-green)]' },
          { icon: '🔥', label: 'HAZARDS', value: state.hazards.filter(h => h.active).length, color: 'text-[var(--ares-red)]' },
          { icon: '🤖', label: 'AGENTS', value: `${state.agents.filter(a => a.battery > 15).length}/${state.agents.length}`, color: 'text-[var(--ares-cyan)]' },
          { icon: '🎯', label: 'MISSIONS', value: state.stats.missionsCompleted, color: 'text-blue-400' },
        ].map(({ icon, label, value, color }) => (
          <div key={label} className="text-center hidden md:flex flex-col items-center">
            <div className="flex items-center gap-1">
              <span className="text-xs">{icon}</span>
              <span className={`text-sm font-bold font-mono-data ${color}`}>{value}</span>
            </div>
            <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>

      {/* Right: View toggle + clock */}
      <div className="flex items-center gap-3">
        {/* View mode toggle */}
        <div className="flex items-center rounded-md border border-[var(--ares-panel-border)] overflow-hidden">
          <button
            onClick={() => onViewModeChange('simple')}
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
              viewMode === 'simple' ? 'bg-[oklch(0.65_0.18_195_/_0.15)] text-[var(--ares-cyan)]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ● SIMPLE
          </button>
          <button
            onClick={() => onViewModeChange('advanced')}
            className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all ${
              viewMode === 'advanced' ? 'bg-[oklch(0.65_0.18_195_/_0.15)] text-[var(--ares-cyan)]' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ADVANCED
          </button>
        </div>

        <button
          onClick={onHowItWorks}
          className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-[var(--ares-cyan)] transition-colors hidden lg:block"
        >
          ? HOW IT WORKS
        </button>

        <div className="text-right hidden sm:block">
          <div className="text-[10px] font-mono-data text-[var(--ares-cyan)]">
            SIM {String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
          </div>
          <div className="text-[9px] text-muted-foreground font-mono-data">
            {time.toLocaleTimeString()}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-[var(--ares-green)]/40 bg-green-500/5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-green)] animate-pulse" />
          <span className="text-[10px] text-[var(--ares-green)] uppercase tracking-wider font-bold">ONLINE</span>
        </div>
      </div>
    </div>
  );
}

function HazardAlert({ events }: { events: EmergencyEvent[] }) {
  const latest = events.find(e => !e.resolved);
  if (!latest) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={latest.id}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="absolute top-14 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4"
      >
        <div className="ares-panel border border-[var(--ares-red)]/50 rounded-lg px-4 py-3 ares-glow-red">
          <div className="flex items-start gap-3">
            <div className="text-[var(--ares-red)] text-lg animate-pulse">⚠</div>
            <div className="flex-1">
              <div className="text-xs font-bold text-[var(--ares-red)] uppercase tracking-wider">Emergency Event</div>
              <div className="text-xs text-foreground mt-0.5">{latest.description}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function DemoBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={message}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="absolute top-14 left-1/2 -translate-x-1/2 z-40 max-w-xl w-full px-4"
      >
        <div className="ares-panel border border-[var(--ares-cyan)]/40 rounded-lg px-4 py-2.5 text-center">
          <div className="text-sm font-bold text-[var(--ares-cyan)]">{message}</div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Compass() {
  return (
    <div className="absolute top-3 right-3 z-10 ares-panel rounded-full w-16 h-16 border border-[var(--ares-panel-border)] flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[var(--ares-red)]">N</div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px] font-bold text-muted-foreground">S</div>
        <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">W</div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-bold text-muted-foreground">E</div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-6 bg-gradient-to-t from-transparent via-[var(--ares-cyan)] to-[var(--ares-red)] rounded-full" />
      </div>
    </div>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 ares-panel rounded-lg p-3 border border-[var(--ares-panel-border)] max-w-[200px]">
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">LEGEND</div>
      <div className="space-y-1.5">
        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">People</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          {[
            { color: 'bg-[var(--ares-red)]', label: 'Critical' },
            { color: 'bg-[var(--ares-orange)]', label: 'High' },
            { color: 'bg-[var(--ares-yellow)]', label: 'Medium' },
            { color: 'bg-[var(--ares-green)]', label: 'Safe' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-[9px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-2">Hazards</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center gap-1.5"><span className="text-[10px]">🔥</span><span className="text-[9px] text-muted-foreground">Fire</span></div>
          <div className="flex items-center gap-1.5"><span className="text-[10px]">🌊</span><span className="text-[9px] text-muted-foreground">Flood</span></div>
          <div className="flex items-center gap-1.5"><span className="text-[10px]">🧱</span><span className="text-[9px] text-muted-foreground">Debris</span></div>
        </div>
        <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-2">Agents</div>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1">
          <div className="flex items-center gap-1.5"><span className="text-[10px]">🚁</span><span className="text-[9px] text-muted-foreground">Drone</span></div>
          <div className="flex items-center gap-1.5"><span className="text-[10px]">🤖</span><span className="text-[9px] text-muted-foreground">Robot</span></div>
        </div>
      </div>
    </div>
  );
}

function MapOverlay({ simState, onResetView, onFullMap, fullMap }: {
  simState: SimulationState;
  onResetView: () => void;
  onFullMap: () => void;
  fullMap: boolean;
}) {
  return (
    <>
      {/* Map label */}
      <div className="absolute top-3 left-3 z-10 ares-panel rounded px-2 py-1.5 border border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-red)] animate-pulse" />
          <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-wider">
            Disaster Zone Alpha
          </span>
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">
          {simState.hazards.filter(h => h.active).length} hazards · {simState.civilians.filter(c => c.status === 'waiting').length} people waiting
        </div>
      </div>

      <Compass />

      {/* Camera controls */}
      <div className="absolute top-3 right-20 z-10 flex flex-col gap-1">
        <button
          onClick={onFullMap}
          className="ares-panel rounded px-2 py-1 text-[9px] font-bold text-[var(--ares-cyan)] hover:bg-[oklch(0.65_0.18_195_/_0.15)] border border-[var(--ares-cyan)]/50 transition-colors"
        >
          {fullMap ? '▣ EXIT FULL MAP' : '▣ FULL MAP'}
        </button>
        <button
          onClick={onResetView}
          className="ares-panel rounded px-2 py-1 text-[9px] text-muted-foreground hover:text-[var(--ares-cyan)] border border-[var(--ares-panel-border)] transition-colors"
        >
          ⟳ RESET VIEW
        </button>
      </div>

      <Legend />

      {/* Standby overlay */}
      {!simState.running && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/40 backdrop-blur-sm">
          <div className="text-center">
            <div className="text-[var(--ares-cyan)] text-4xl mb-4 animate-pulse">◎</div>
            <div className="text-lg font-bold text-foreground tracking-[0.2em]">AWAITING DEPLOYMENT</div>
            <div className="text-xs text-muted-foreground mt-2">Click START to activate AI agents</div>
          </div>
        </div>
      )}
    </>
  );
}

interface CommandCenterProps {
  onBack: () => void;
}

export default function CommandCenter({ onBack }: CommandCenterProps) {
  const [simState, setSimState] = useState<SimulationState>(() => createInitialState(DEFAULT_CONFIG));
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('simple');
  const [activeTab, setActiveTab] = useState<'mission' | 'agents' | 'analytics'>('mission');
  const [rightTab, setRightTab] = useState<'priority' | 'decision' | 'copilot'>('priority');
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [fullMap, setFullMap] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const deviceCap = useDeviceCapability();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const demoTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Auto-set graphics quality based on device capability on first load
  useEffect(() => {
    setSimState(prev => ({ ...prev, graphicsQuality: deviceCap.tier === 'low' ? 'low' : deviceCap.tier === 'high' ? 'high' : 'medium' }));
  }, [deviceCap.tier]);

  const startSim = useCallback(() => {
    setSimState(prev => ({ ...prev, running: true, paused: false }));
  }, []);

  const pauseSim = useCallback(() => {
    setSimState(prev => ({ ...prev, paused: !prev.paused }));
  }, []);

  const resetSim = useCallback(() => {
    setSimState(createInitialState(simState.config));
    setDemoMessage(null);
  }, [simState.config]);

  const handleConfigChange = useCallback((config: SimulationConfig) => {
    setSimState(createInitialState(config));
  }, []);

  const handleTriggerEvent = useCallback((type: EmergencyEvent['type']) => {
    setSimState(prev => triggerEmergencyEvent(prev, type));
  }, []);

  const handleSelectAgent = useCallback((id: string | null) => {
    setSimState(prev => ({ ...prev, selectedAgentId: id }));
  }, []);

  const handleResetView = useCallback(() => {
    setResetTrigger(n => n + 1);
  }, []);

  const toggleFullMap = useCallback(() => {
    setFullMap(value => !value);
  }, []);

  // Test AI Adaptation — scripted demo
  const runTestAdaptation = useCallback(() => {
    const state = createInitialState({ ...DEFAULT_CONFIG, civilianCount: 8, droneCount: simState.config.droneCount, robotCount: simState.config.robotCount });
    setSimState({ ...state, running: true, paused: false });

    const phases = getDemoPhases(handleTriggerEvent);
    demoTimeoutsRef.current = [];

    phases.forEach(({ delay, message, action }) => {
      const t = setTimeout(() => {
        setDemoMessage(message);
        if (action) action(state);
        // Clear message after 4 seconds
        setTimeout(() => setDemoMessage(null), 4000);
      }, delay);
      demoTimeoutsRef.current.push(t);
    });
  }, [handleTriggerEvent]);

  // Demo mode — runs continuously until all civilians are rescued
  const runDemo = useCallback(() => {
    const state = createInitialState({ ...DEFAULT_CONFIG, civilianCount: 12, droneCount: simState.config.droneCount, robotCount: simState.config.robotCount });
    setSimState({ ...state, running: true, paused: false });

    const phases = getDemoPhases(handleTriggerEvent);
    demoTimeoutsRef.current = [];

    phases.forEach(({ delay, message, action }) => {
      const t = setTimeout(() => {
        setDemoMessage(message);
        if (action) action(state);
        setTimeout(() => setDemoMessage(null), 4000);
      }, delay);
      demoTimeoutsRef.current.push(t);
    });
  }, [handleTriggerEvent]);

  // Simulation tick loop
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSimState(prev => {
        if (!prev.running || prev.paused) return prev;
        const n = prev.speedMultiplier ?? 1;
        let s = prev;
        for (let i = 0; i < n; i++) s = tick(s);
        return s;
      });
    }, 300);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      demoTimeoutsRef.current.forEach(t => clearTimeout(t));
    };
  }, []);

  // Determine active pipeline step
  const pipelineState = useMemo(() => {
    const activeMissions = simState.missions.filter(m => m.status === 'active' || m.status === 'assigned');
    const detectedCivs = simState.civilians.filter(c => c.detectedBy.length > 0 && c.status === 'waiting').length;
    const rescuingAgents = simState.agents.filter(a => a.state === 'rescuing').length;
    const movingAgents = simState.agents.filter(a => a.state === 'moving').length;

    let active: PipelineStep | null = null;
    let completed: PipelineStep[] = [];

    if (detectedCivs > 0) {
      completed.push('detect');
      if (activeMissions.length > 0) {
        completed.push('prioritize');
        if (movingAgents > 0 || rescuingAgents > 0) {
          completed.push('assign');
          if (movingAgents > 0) {
            active = 'plan';
            completed.push('plan');
            if (rescuingAgents > 0) active = 'rescue';
          } else {
            active = 'assign';
          }
        } else {
          active = 'prioritize';
        }
      } else {
        active = 'detect';
      }
    } else if (simState.running) {
      active = 'detect';
    }

    completed = [...new Set(completed)];
    if (active && completed.includes(active)) completed = completed.filter(s => s !== active);

    return { active, completed };
  }, [simState]);

  // Get selected agent and related data
  const selectedAgent = simState.agents.find(a => a.id === simState.selectedAgentId);
  const selectedMission = selectedAgent ? simState.missions.find(m => m.id === selectedAgent.currentMissionId) : undefined;
  const selectedCivilian = selectedMission ? simState.civilians.find(c => c.id === selectedMission.targetId) : undefined;

  // For AI Decision panel — use the most recent active mission
  const latestMission = simState.missions.find(m => m.status === 'assigned' || m.status === 'active');
  const latestDecisionAgent = latestMission ? simState.agents.find(a => a.id === latestMission.assignedAgentId) : undefined;
  const latestDecision = latestDecisionAgent ? simState.aiDecisions.get(latestDecisionAgent.id) : undefined;
  const latestCivilian = latestMission ? simState.civilians.find(c => c.id === latestMission.targetId) : undefined;

  if (fullMap) {
    return (
      <div className="fixed inset-0 z-[100] bg-[var(--background)]">
        <DisasterScene simState={simState} resetTrigger={resetTrigger} />
        <MapOverlay
          simState={simState}
          onResetView={handleResetView}
          onFullMap={toggleFullMap}
          fullMap
        />
        <div className="absolute bottom-4 right-4 z-10 rounded border border-[var(--ares-cyan)]/40 bg-[oklch(0.08_0.01_240_/_0.88)] px-3 py-2 text-[10px] text-muted-foreground backdrop-blur-sm">
          DRAG TO ROTATE · SCROLL TO ZOOM · RIGHT-DRAG TO PAN
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--background)] overflow-hidden relative">
      <TopBar
        state={simState}
        onBack={onBack}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onHowItWorks={() => setShowHowItWorks(true)}
      />
      <HazardAlert events={simState.events} />
      <DemoBanner message={demoMessage} />
      <HowItWorksOverlay open={showHowItWorks} onClose={() => setShowHowItWorks(false)} />

      {/* AI Pipeline — always visible at top */}
      <div className="border-b border-[var(--ares-panel-border)] bg-[oklch(0.09_0.01_240_/_0.95)] shrink-0">
        <AIPipeline activeStep={pipelineState.active} completedSteps={pipelineState.completed} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-56 shrink-0 border-r border-[var(--ares-panel-border)] bg-[oklch(0.09_0.01_240_/_0.95)] flex flex-col">
          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
            <TabsList className="w-full rounded-none border-b border-[var(--ares-panel-border)] bg-transparent p-0 h-auto shrink-0">
              {[
                { value: 'mission', label: 'CONTROL' },
                { value: 'agents', label: 'AGENTS' },
                ...(viewMode === 'advanced' ? [{ value: 'analytics' as const, label: 'STATS' }] : []),
              ].map(tab => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex-1 py-2 text-[9px] tracking-widest rounded-none border-0 data-[state=active]:bg-transparent data-[state=active]:text-[var(--ares-cyan)] data-[state=active]:border-b data-[state=active]:border-[var(--ares-cyan)] text-muted-foreground"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="mission" className="flex-1 overflow-hidden m-0">
              <DisasterControl
                config={simState.config}
                onChange={handleConfigChange}
                onTriggerEvent={handleTriggerEvent}
                running={simState.running}
                onStart={startSim}
                onPause={pauseSim}
                onReset={resetSim}
                onDemo={runDemo}
                onTestAdaptation={runTestAdaptation}
                paused={simState.paused}
                viewMode={viewMode}
                speedMultiplier={simState.speedMultiplier}
                onSpeedChange={(s) => setSimState(prev => ({ ...prev, speedMultiplier: s }))}
              />
            </TabsContent>

            <TabsContent value="agents" className="flex-1 overflow-hidden m-0">
              <AgentPanel
                agents={simState.agents}
                missions={simState.missions}
                decisions={simState.aiDecisions}
                selectedId={simState.selectedAgentId}
                onSelect={handleSelectAgent}
                viewMode={viewMode}
              />
            </TabsContent>

            {viewMode === 'advanced' && (
              <TabsContent value="analytics" className="flex-1 overflow-hidden m-0">
                <Analytics state={simState} />
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* CENTER — 3D Map (65-70% of screen) */}
        <div className="flex-1 relative overflow-hidden">
          <MapOverlay
            simState={simState}
            onResetView={handleResetView}
            onFullMap={toggleFullMap}
            fullMap={false}
          />
          <DisasterScene
            simState={simState}
            resetTrigger={resetTrigger}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="w-64 shrink-0 border-l border-[var(--ares-panel-border)] bg-[oklch(0.09_0.01_240_/_0.95)] flex flex-col">
          {/* Right panel tabs */}
          <div className="flex border-b border-[var(--ares-panel-border)] shrink-0">
            {[
              { value: 'priority', label: '🚨 PRIORITY' },
              { value: 'decision', label: '🧠 AI DECISION' },
              ...(viewMode === 'advanced' ? [{ value: 'copilot' as const, label: '💬 COPILOT' }] : []),
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setRightTab(tab.value as typeof rightTab)}
                className={`flex-1 py-2 text-[9px] tracking-widest transition-colors ${
                  rightTab === tab.value
                    ? 'text-[var(--ares-cyan)] border-b border-[var(--ares-cyan)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            <AnimatePresence mode="wait">
              {rightTab === 'priority' ? (
                <motion.div key="priority" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <RescuePriority civilians={simState.civilians} missions={simState.missions} agents={simState.agents} />
                </motion.div>
              ) : rightTab === 'decision' ? (
                <motion.div key="decision" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AIDecisionPanel
                    decision={latestDecision}
                    targetCivilian={latestCivilian}
                    agent={latestDecisionAgent}
                    mission={latestMission}
                  />
                </motion.div>
              ) : (
                <motion.div key="copilot" className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <AICopilot simState={simState} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* BOTTOM — Mission Log + Current Mission */}
      <div className="flex border-t border-[var(--ares-panel-border)] bg-[oklch(0.08_0.01_240_/_0.97)] shrink-0">
        {/* Current Mission card */}
        <div className="w-72 shrink-0 border-r border-[var(--ares-panel-border)] p-2 overflow-y-auto">
          <CurrentMissionCard
            mission={selectedMission ?? latestMission}
            agent={selectedAgent ?? latestDecisionAgent}
            civilian={selectedCivilian ?? latestCivilian}
          />
        </div>
        {/* Mission Log */}
        <div className="flex-1 h-20">
          <MissionLog entries={simState.log} />
        </div>
      </div>
    </div>
  );
}
