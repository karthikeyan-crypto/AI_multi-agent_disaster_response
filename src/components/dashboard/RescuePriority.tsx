import { motion, AnimatePresence } from 'framer-motion';
import type { Civilian, Mission, Agent } from '../../types';

const urgencyConfig = {
  critical: { color: 'text-[var(--ares-red)]', bg: 'bg-red-500/10 border-red-500/40', dot: 'bg-[var(--ares-red)]', label: 'CRITICAL', emoji: '🔴' },
  high:     { color: 'text-[var(--ares-orange)]', bg: 'bg-orange-500/10 border-orange-500/40', dot: 'bg-[var(--ares-orange)]', label: 'HIGH', emoji: '🟠' },
  medium:   { color: 'text-[var(--ares-yellow)]', bg: 'bg-yellow-500/10 border-yellow-500/40', dot: 'bg-[var(--ares-yellow)]', label: 'MEDIUM', emoji: '🟡' },
  low:      { color: 'text-[var(--ares-green)]', bg: 'bg-green-500/10 border-green-500/40', dot: 'bg-[var(--ares-green)]', label: 'LOW', emoji: '🟢' },
};

function formatETA(eta: number): string {
  const s = Math.round(eta);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

interface RescuePriorityProps {
  civilians: Civilian[];
  missions: Mission[];
  agents: Agent[];
}

export default function RescuePriority({ civilians, missions, agents }: RescuePriorityProps) {
  const activeCivilians = civilians
    .filter(c => c.status === 'waiting' || c.status === 'being_rescued')
    .filter(c => c.detectedBy.length > 0)
    .sort((a, b) => {
      const scoreMap = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = scoreMap[a.urgency] * 0.5 + (100 - a.health) * 0.005 + a.hazardExposure * 0.2;
      const bScore = scoreMap[b.urgency] * 0.5 + (100 - b.health) * 0.005 + b.hazardExposure * 0.2;
      return bScore - aScore;
    })
    .slice(0, 3);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-red)] animate-pulse" />
          <span className="text-xs font-bold tracking-wider text-[var(--ares-cyan)] uppercase">🚨 Who Needs Help First?</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {activeCivilians.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="text-3xl mb-3 opacity-50">🔍</div>
            <div className="text-xs">No civilians detected yet.</div>
            <div className="text-[10px] mt-1">Drones are scanning the area...</div>
          </div>
        ) : (
          <AnimatePresence>
            {activeCivilians.map((civ, idx) => {
              const cfg = urgencyConfig[civ.urgency];
              const mission = missions.find(m => m.targetId === civ.id && (m.status === 'assigned' || m.status === 'active'));
              const assignedAgent = mission ? agents.find(a => a.id === mission.assignedAgentId) : undefined;
              const rank = idx + 1;

              return (
                <motion.div
                  key={civ.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className={`rounded-xl border-2 p-3 ${cfg.bg}`}
                >
                  {/* Rank header */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`text-2xl font-black ${cfg.color} opacity-70`}>#{rank}</div>
                    <div className="flex-1">
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color} flex items-center gap-1`}>
                        {cfg.emoji} {cfg.label}
                      </div>
                      <div className="font-mono-data text-sm font-bold text-foreground">{civ.id}</div>
                    </div>
                  </div>

                  {/* Stats in plain English */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">❤️ Health</span>
                      <span className={`font-bold ${civ.health < 25 ? 'text-[var(--ares-red)]' : civ.health < 50 ? 'text-[var(--ares-yellow)]' : 'text-foreground'}`}>
                        {Math.round(civ.health)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">🔥 Hazard</span>
                      <span className={`font-bold ${civ.hazardExposure > 0.6 ? 'text-[var(--ares-red)]' : civ.hazardExposure > 0.3 ? 'text-[var(--ares-yellow)]' : 'text-[var(--ares-green)]'}`}>
                        {civ.hazardExposure > 0.6 ? 'Nearby' : civ.hazardExposure > 0.3 ? 'Moderate' : 'Low'}
                      </span>
                    </div>

                    {assignedAgent ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">🤖 Assigned</span>
                          <span className="text-[var(--ares-cyan)] font-bold">{assignedAgent.id}</span>
                        </div>
                        {mission && (
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">🟢 ETA</span>
                            <span className="text-[var(--ares-green)] font-bold font-mono-data">{formatETA(mission.eta)}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">⏳ Status</span>
                        <span className="text-muted-foreground font-bold">Waiting...</span>
                      </div>
                    )}
                  </div>

                  {/* Health bar */}
                  <div className="mt-2 w-full bg-secondary/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        civ.health < 25 ? 'bg-[var(--ares-red)]' : civ.health < 50 ? 'bg-[var(--ares-yellow)]' : 'bg-[var(--ares-green)]'
                      }`}
                      style={{ width: `${civ.health}%` }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
