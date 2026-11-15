import { motion } from 'framer-motion';
import type { Mission, Agent, Civilian } from '../../types';

interface CurrentMissionCardProps {
  mission?: Mission;
  agent?: Agent;
  civilian?: Civilian;
}

function formatETA(eta: number): string {
  const s = Math.round(eta);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export default function CurrentMissionCard({ mission, agent, civilian }: CurrentMissionCardProps) {
  if (!mission || !agent) {
    return (
      <div className="ares-panel rounded-xl p-4 border border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🎯</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ares-cyan)]">Current Mission</span>
        </div>
        <div className="text-sm text-muted-foreground py-2 text-center">
          No active rescue mission.
        </div>
      </div>
    );
  }

  const progress = mission.route.length === 0 && mission.status === 'active' ? 100
    : mission.status === 'completed' ? 100
    : Math.max(0, Math.min(90, ((mission.distance - agent.route.length * 0.5) / Math.max(1, mission.distance)) * 100));

  const statusInfo = mission.status === 'replanning'
    ? { icon: '🔄', label: 'RECALCULATING', color: 'text-[var(--ares-yellow)]' }
    : mission.status === 'active'
    ? { icon: '🟢', label: 'RESCUING', color: 'text-[var(--ares-green)]' }
    : mission.risk > 0.6
    ? { icon: '⚠', label: 'HIGH RISK ROUTE', color: 'text-[var(--ares-red)]' }
    : { icon: '🟢', label: 'ROUTE FOUND', color: 'text-[var(--ares-green)]' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="ares-panel rounded-xl p-4 border border-[var(--ares-cyan)]/30"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--ares-cyan)]">Current Mission</span>
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-wider ${statusInfo.color} flex items-center gap-1`}>
          {statusInfo.icon} {statusInfo.label}
        </span>
      </div>

      <div className="text-lg font-bold text-foreground mb-3">
        RESCUE {mission.targetId}
      </div>

      <div className="space-y-2 text-xs">
        {/* Assigned agent */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Assigned:</span>
          <span className="text-foreground font-bold">🤖 {agent.id}</span>
        </div>

        {/* Route status */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Route:</span>
          <span className={mission.risk > 0.6 ? 'text-[var(--ares-red)] font-bold' : 'text-[var(--ares-green)] font-bold'}>
            {mission.status === 'replanning' ? '🔄 Recalculating...' : mission.risk > 0.6 ? '⚠ HIGH RISK' : '🟢 SAFE'}
          </span>
        </div>

        {/* ETA */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">ETA:</span>
          <span className="text-[var(--ares-cyan)] font-bold font-mono-data">{formatETA(mission.eta)}</span>
        </div>

        {/* Distance */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Distance:</span>
          <span className="text-foreground font-mono-data">{Math.round(mission.distance)}m</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>Progress</span>
          <span className="font-mono-data">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary/50 rounded-full h-2 overflow-hidden">
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${mission.status === 'replanning' ? 'bg-[var(--ares-yellow)]' : 'bg-[var(--ares-green)]'}`}
          />
        </div>
      </div>

      {/* Civilian info */}
      {civilian && (
        <div className="mt-3 pt-3 border-t border-[var(--ares-panel-border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">👤</span>
            <span className="text-xs text-foreground font-bold">{civilian.id}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-muted-foreground">Health:</span>
            <span className={civilian.health < 25 ? 'text-[var(--ares-red)] font-bold' : 'text-[var(--ares-yellow)] font-bold'}>
              {Math.round(civilian.health)}%
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
