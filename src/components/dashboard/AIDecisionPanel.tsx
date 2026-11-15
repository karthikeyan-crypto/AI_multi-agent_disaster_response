import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AIDecision, Civilian, Agent, Mission } from '../../types';

interface AIDecisionPanelProps {
  decision?: AIDecision;
  targetCivilian?: Civilian;
  agent?: Agent;
  mission?: Mission;
}

function getSimpleReasoning(civ: Civilian | undefined, agent: Agent | undefined, decision: AIDecision | undefined): string[] {
  if (!civ) return ['Waiting for AI to detect civilians...'];
  const reasons: string[] = [];
  if (civ.health < 25) reasons.push(`Critical health (${Math.round(civ.health)}%) — needs immediate help`);
  else if (civ.health < 50) reasons.push(`Low health (${Math.round(civ.health)}%) — high priority`);
  else reasons.push(`Health at ${Math.round(civ.health)}%`);

  if (civ.hazardExposure > 0.6) reasons.push('Fire or hazard is nearby');
  else if (civ.hazardExposure > 0.3) reasons.push('Moderate hazard exposure');
  else reasons.push('Low hazard exposure — safe to approach');

  if (agent) reasons.push(`${agent.id} is the closest available rescuer`);
  if (decision) reasons.push(`AI confidence: ${decision.confidence}%`);
  return reasons;
}

export default function AIDecisionPanel({ decision, targetCivilian, agent, mission }: AIDecisionPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const simpleReasons = getSimpleReasoning(targetCivilian, agent, decision);
  const hasActiveDecision = decision && targetCivilian;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-[var(--ares-cyan)] uppercase">🧠 AI Decision</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!hasActiveDecision ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <div className="text-3xl mb-3 opacity-50">🧠</div>
            <div className="text-xs">AI is monitoring the disaster zone.</div>
            <div className="text-[10px] mt-1">Decisions will appear here when civilians are detected.</div>
          </div>
        ) : (
          <>
            {/* Main decision */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[oklch(0.65_0.18_195_/_0.06)] border border-[var(--ares-cyan)]/30 rounded-lg p-3"
            >
              <div className="text-sm font-bold text-foreground mb-1">
                {targetCivilian!.id} needs help first.
              </div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                Priority: {targetCivilian!.urgency}
              </div>

              {/* Simple why */}
              <div className="space-y-1.5">
                {simpleReasons.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="text-[var(--ares-cyan)] mt-0.5">•</span>
                    <span className="text-foreground/90">{r}</span>
                  </motion.div>
                ))}
              </div>

              {/* Action */}
              {agent && (
                <div className="mt-3 pt-2 border-t border-[var(--ares-panel-border)] space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">→</span>
                    <span className="text-[var(--ares-cyan)] font-bold">Assigning {agent.id}</span>
                  </div>
                  {mission && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">→</span>
                      <span className="text-[var(--ares-yellow)]">Calculating safe route...</span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* WHY button */}
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="w-full py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground hover:border-[var(--ares-cyan-dim)] transition-all"
            >
              {showWhy ? '▲ Hide' : '❓ WHY?'}
            </button>

            <AnimatePresence>
              {showWhy && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-secondary/20 border border-[var(--ares-panel-border)] rounded-lg p-3 text-xs space-y-2"
                >
                  <div className="font-bold text-foreground">Why {targetCivilian!.id}?</div>
                  <div className="text-muted-foreground leading-relaxed">
                    {targetCivilian!.id} was prioritized because:
                    <ol className="mt-1.5 space-y-1 list-decimal list-inside">
                      <li>{targetCivilian!.urgency === 'critical' ? 'Critical health — needs immediate rescue' : `${targetCivilian!.urgency} priority status`}</li>
                      <li>{targetCivilian!.hazardExposure > 0.6 ? 'High hazard exposure nearby' : 'Moderate hazard exposure'}</li>
                      <li>{agent ? `${agent.id} has the shortest safe arrival time` : 'Agent being selected'}</li>
                    </ol>
                    <div className="mt-2 pt-2 border-t border-[var(--ares-panel-border)]">
                      Therefore the AI assigned {agent?.id ?? 'a rescue agent'}.
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Technical details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full py-1.5 rounded text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-all"
            >
              {showDetails ? '▼ Hide Technical Details' : '▶ View Technical Details'}
            </button>

            <AnimatePresence>
              {showDetails && decision && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border border-purple-500/20 rounded-lg p-3 bg-purple-500/5 space-y-2"
                >
                  <div className="text-[10px] text-purple-400 uppercase tracking-wider font-bold">AI Decision Factors</div>
                  {decision.factors.map(f => (
                    <div key={f.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-24 shrink-0">{f.label}</span>
                      <div className="flex-1 bg-secondary/50 rounded-full h-1">
                        <div className="h-full rounded-full bg-purple-400" style={{ width: `${f.value}%` }} />
                      </div>
                      <span className="text-[10px] font-mono-data text-purple-300 w-8 text-right">{f.value}%</span>
                    </div>
                  ))}
                  <div className="text-[9px] text-muted-foreground/50 italic pt-1">
                    Utility AI · GOAP · A* Pathfinding · Multi-Agent Coordination
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
