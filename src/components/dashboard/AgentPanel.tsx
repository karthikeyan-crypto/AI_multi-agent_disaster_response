import { motion, AnimatePresence } from 'framer-motion';
import type { Agent, AIDecision, Mission } from '../../types';

const stateColors: Record<string, string> = {
  idle: 'text-muted-foreground',
  scanning: 'text-blue-400',
  moving: 'text-[var(--ares-cyan)]',
  rescuing: 'text-[var(--ares-green)]',
  extinguishing: 'text-orange-400',
  returning: 'text-purple-400',
  low_battery: 'text-[var(--ares-red)]',
  avoiding_danger: 'text-[var(--ares-yellow)]',
  charging: 'text-green-400',
  medical_support: 'text-pink-400',
  surveillance: 'text-blue-300',
};

const stateLabels: Record<string, string> = {
  idle: 'IDLE',
  scanning: 'SCANNING',
  moving: 'EN ROUTE',
  rescuing: 'RESCUING',
  extinguishing: 'EXTINGUISHING',
  returning: 'RETURNING',
  low_battery: 'LOW BATTERY',
  avoiding_danger: 'AVOIDING DANGER',
  charging: 'CHARGING',
  medical_support: 'MED SUPPORT',
  surveillance: 'SURVEILLANCE',
};

function BatteryBar({ value }: { value: number }) {
  const color = value < 20 ? 'bg-[var(--ares-red)]' : value < 40 ? 'bg-[var(--ares-yellow)]' : 'bg-[var(--ares-green)]';
  return (
    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function HealthBar({ value }: { value: number }) {
  const color = value < 30 ? 'bg-[var(--ares-red)]' : value < 60 ? 'bg-[var(--ares-yellow)]' : 'bg-blue-400';
  return (
    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  mission?: Mission;
  onClick: () => void;
}

function AgentCard({ agent, isSelected, mission, onClick }: AgentCardProps) {
  const stateColor = stateColors[agent.state] ?? 'text-muted-foreground';
  const stateLabel = stateLabels[agent.state] ?? agent.state;
  const isDrone = agent.type === 'drone';

  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
        isSelected
          ? 'border-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.08)] ares-glow-cyan'
          : 'border-[var(--ares-panel-border)] bg-[var(--ares-surface)] hover:border-[var(--ares-cyan-dim)]'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground tracking-wide">{agent.id}</span>
            {isSelected && (
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-cyan)] animate-pulse" />
            )}
          </div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
            {isDrone ? '🚁 AERIAL DRONE' : '🤖 GROUND ROBOT'}
          </div>
        </div>
        <div className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${stateColor} bg-current/10`}>
          <span className={stateColor}>{stateLabel}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">BATTERY</span>
          <span className={`font-mono-data font-bold ${agent.battery < 20 ? 'text-[var(--ares-red)] animate-pulse' : 'text-foreground'}`}>
            {Math.round(agent.battery)}%
          </span>
        </div>
        <BatteryBar value={agent.battery} />

        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">HEALTH</span>
          <span className="font-mono-data font-bold text-foreground">{Math.round(agent.health)}%</span>
        </div>
        <HealthBar value={agent.health} />
      </div>

      {mission && (
        <div className="mt-2 pt-2 border-t border-[var(--ares-panel-border)]">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Mission</div>
          <div className="text-[10px] text-[var(--ares-cyan)] mt-0.5 truncate">
            → {mission.targetId} ({mission.type.toUpperCase()})
          </div>
        </div>
      )}
    </motion.button>
  );
}

interface AgentDetailProps {
  agent: Agent;
  decision?: AIDecision;
  mission?: Mission;
  viewMode?: 'simple' | 'advanced';
}

export function AgentDetail({ agent, decision, mission, viewMode = 'simple' }: AgentDetailProps) {
  const stateColor = stateColors[agent.state] ?? 'text-muted-foreground';
  const stateLabel = stateLabels[agent.state] ?? agent.state;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground tracking-widest">{agent.id}</h3>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            {agent.type === 'drone' ? '🚁 Aerial Drone' : '🤖 Ground Rescue Robot'}
          </div>
        </div>
        <div className={`text-xs font-bold px-2 py-1 rounded border ${stateColor} border-current bg-current/10`}>
          {stateLabel}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'BATTERY', value: `${Math.round(agent.battery)}%`, crit: agent.battery < 20 },
          { label: 'HEALTH', value: `${Math.round(agent.health)}%`, crit: agent.health < 30 },
          { label: 'DIST TRAVELED', value: `${Math.round(agent.distanceTraveled)}m` },
          { label: 'DECISIONS', value: String(agent.decisionCount) },
          { label: 'SUCCESS RATE', value: `${Math.round(agent.missionSuccessRate * 100)}%` },
          { label: 'ROUTE POINTS', value: String(agent.route.length) },
        ].map(({ label, value, crit }) => (
          <div key={label} className="bg-secondary/30 rounded p-2 border border-[var(--ares-panel-border)]">
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
            <div className={`text-sm font-bold font-mono-data mt-0.5 ${crit ? 'text-[var(--ares-red)] animate-pulse' : 'text-foreground'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Current mission */}
      {mission && (
        <div className="bg-[oklch(0.65_0.18_195_/_0.05)] border border-[var(--ares-panel-border)] rounded p-3">
          <div className="text-[10px] text-[var(--ares-cyan)] uppercase tracking-wider mb-2">Current Mission</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Target</span>
              <span className="text-foreground font-mono-data">{mission.targetId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span className="text-foreground">{mission.type.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="text-foreground font-mono-data">{Math.round(mission.distance)}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Risk</span>
              <span className={mission.risk > 0.6 ? 'text-[var(--ares-red)]' : mission.risk > 0.3 ? 'text-[var(--ares-yellow)]' : 'text-[var(--ares-green)]'}>
                {mission.risk > 0.6 ? 'HIGH' : mission.risk > 0.3 ? 'MEDIUM' : 'LOW'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Replans</span>
              <span className="text-foreground font-mono-data">{mission.routeInvalidations}</span>
            </div>
          </div>
        </div>
      )}

      {/* AI Decision */}
      {decision && (
        <div className="border border-purple-500/30 rounded p-3 bg-purple-500/5">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] text-purple-400 uppercase tracking-wider">AI Decision Core</div>
            <div className="text-xs font-mono-data text-purple-300">{decision.confidence}% confidence</div>
          </div>
          <div className="text-xs font-bold text-foreground mb-2">→ {decision.action}</div>
          {viewMode === 'advanced' && (
            <div className="space-y-1.5">
              {decision.factors.map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground w-28 shrink-0">{f.label}</span>
                  <div className="flex-1 bg-secondary/50 rounded-full h-1">
                    <div
                      className="h-full rounded-full bg-purple-400 transition-all duration-500"
                      style={{ width: `${f.value}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono-data text-purple-300 w-8 text-right">{f.value}%</span>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 p-2 bg-secondary/30 rounded text-[10px] text-muted-foreground leading-relaxed border-l-2 border-purple-500/50">
            {decision.reasoning}
          </div>
          {viewMode === 'advanced' && (
            <div className="mt-1 text-[9px] text-muted-foreground/50 italic">
              [SIMULATED AI REASONING — DEMO DATA]
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface AgentPanelProps {
  agents: Agent[];
  missions: Mission[];
  decisions: Map<string, AIDecision>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  viewMode?: 'simple' | 'advanced';
}

export default function AgentPanel({ agents, missions, decisions, selectedId, onSelect, viewMode = 'simple' }: AgentPanelProps) {
  const selectedAgent = agents.find(a => a.id === selectedId);
  const selectedDecision = selectedId ? decisions.get(selectedId) : undefined;
  const selectedMission = selectedAgent
    ? missions.find(m => m.id === selectedAgent.currentMissionId)
    : undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-cyan)] animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-[var(--ares-cyan)] uppercase">
            {selectedAgent ? 'Agent Detail' : 'Active Agents'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono-data">
            {agents.filter(a => a.battery > 15).length}/{agents.length} online
          </span>
          {selectedAgent && (
            <button
              onClick={() => onSelect(null)}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 border border-[var(--ares-panel-border)] rounded"
            >
              ← back
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="wait">
          {selectedAgent ? (
            <motion.div key="detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AgentDetail agent={selectedAgent} decision={selectedDecision} mission={selectedMission} viewMode={viewMode} />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {agents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedId === agent.id}
                  mission={missions.find(m => m.id === agent.currentMissionId)}
                  onClick={() => onSelect(agent.id)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Coordination stats */}
      {!selectedAgent && (
        <div className="border-t border-[var(--ares-panel-border)] p-3 grid grid-cols-2 gap-2">
          {[
            { label: 'Agents Online', value: `${agents.filter(a => a.battery > 15).length}/${agents.length}` },
            { label: 'Active Missions', value: String(missions.filter(m => m.status === 'active' || m.status === 'assigned').length) },
          ].map(({ label, value }) => (
            <div key={label} className="text-center p-1.5 bg-secondary/20 rounded border border-[var(--ares-panel-border)]">
              <div className="text-sm font-bold text-[var(--ares-cyan)] font-mono-data">{value}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
