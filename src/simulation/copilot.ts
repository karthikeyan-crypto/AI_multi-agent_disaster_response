import type { SimulationState, Civilian } from '../types';

function formatTime(ticks: number): string {
  const seconds = Math.round(ticks * 0.5);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getUrgentCivilians(state: SimulationState): Civilian[] {
  return state.civilians
    .filter(c => c.status === 'waiting' || c.status === 'being_rescued')
    .sort((a, b) => {
      const score = (c: Civilian) => {
        const w = { critical: 4, high: 3, medium: 2, low: 1 };
        return w[c.urgency] * 0.5 + (100 - c.health) * 0.005;
      };
      return score(b) - score(a);
    });
}

export function generateCopilotResponse(query: string, state: SimulationState): string {
  const q = query.toLowerCase();

  // Highest priority rescue
  if (q.includes('highest priority') || q.includes('top priority') || q.includes('most urgent')) {
    const urgent = getUrgentCivilians(state);
    if (urgent.length === 0) return 'All detected civilians have been rescued. No active rescue priorities.';
    const top = urgent[0];
    const mission = state.missions.find(m => m.targetId === top.id && m.status !== 'completed');
    const agent = mission ? state.agents.find(a => a.id === mission.assignedAgentId) : null;
    return `The highest priority target is **${top.id}** (${top.urgency.toUpperCase()}). Current health: ${Math.round(top.health)}%. Hazard exposure: ${Math.round(top.hazardExposure * 100)}%. ${agent ? `${agent.id} is en route — ETA: ${formatTime(mission?.eta ?? 0)}.` : 'No agent currently assigned — awaiting resource allocation.'}`;
  }

  // Why a specific robot was assigned
  if (q.includes('why') && (q.includes('robot') || q.includes('agent') || q.includes('assigned'))) {
    const agentMatch = q.match(/ares-[rd]\d+/i);
    const agentId = agentMatch ? agentMatch[0].toUpperCase() : null;
    const agent = agentId ? state.agents.find(a => a.id === agentId) : state.agents.find(a => a.currentMissionId);
    if (!agent) return 'I could not identify the specific agent. Please specify the agent ID (e.g., ARES-R01).';
    const decision = state.aiDecisions.get(agent.id);
    const mission = state.missions.find(m => m.id === agent.currentMissionId);
    if (!decision || !mission) return `${agent.id} has no active assignment currently. It is in state: ${agent.state}.`;
    return `${agent.id} was selected for ${mission.targetId} because: ${decision.reasoning} Decision confidence: ${decision.confidence}%.`;
  }

  // Safest route
  if (q.includes('safe') && q.includes('route')) {
    const missions = state.missions.filter(m => m.status === 'active' || m.status === 'assigned');
    if (missions.length === 0) return 'No active routes currently. All agents are idle or returning to base.';
    const safest = [...missions].sort((a, b) => a.risk - b.risk)[0];
    const agent = state.agents.find(a => a.id === safest.assignedAgentId);
    return `The lowest-risk active route belongs to ${agent?.id ?? 'unknown'} heading to ${safest.targetId}. Risk score: ${Math.round(safest.risk * 100)}% — classified as ${safest.risk < 0.3 ? 'LOW' : safest.risk < 0.6 ? 'MEDIUM' : 'HIGH'} hazard exposure. Route distance: ${Math.round(safest.distance)}m.`;
  }

  // After fire outbreak / what changed
  if (q.includes('fire') || q.includes('changed') || q.includes('happened')) {
    const fires = state.hazards.filter(h => h.active && h.type === 'fire');
    const blocked = state.roads.filter(r => r.blocked);
    const replanned = state.stats.routeRecalculations;
    return `Currently tracking ${fires.length} active fire zone(s). ${blocked.length} road(s) are blocked. ${replanned} route recalculations have occurred since mission start. The AI has adapted by finding alternative A* paths around hazard zones.`;
  }

  // Critical civilians count
  if (q.includes('critical') || (q.includes('how many') && q.includes('civilian'))) {
    const critical = state.civilians.filter(c => c.urgency === 'critical' && c.status === 'waiting');
    const total = state.civilians.filter(c => c.status === 'waiting').length;
    const rescued = state.stats.civiliansRescued;
    return `There are currently **${critical.length} civilians at CRITICAL risk** awaiting rescue. Total awaiting: ${total}. Rescued so far: ${rescued}/${state.stats.civiliansTotal}. Response success rate: ${Math.round(state.stats.rescueSuccessRate * 100)}%.`;
  }

  // What if robot fails
  if (q.includes('fail') || q.includes('what if') || q.includes('backup')) {
    const activeAgents = state.agents.filter(a => a.battery > 20 && a.health > 20);
    return `If a primary agent fails, the coordination system will automatically reassign its mission to the next available unit. Currently ${activeAgents.length} agents are operationally viable. Failover prioritizes agents with the highest battery, proximity to the target, and available health status. Redundancy protocols are active.`;
  }

  // Agent status
  if (q.includes('agent') || q.includes('drone') || q.includes('robot')) {
    const online = state.agents.filter(a => a.battery > 15).length;
    const rescuing = state.agents.filter(a => a.state === 'rescuing').length;
    const moving = state.agents.filter(a => a.state === 'moving').length;
    const lowBattery = state.agents.filter(a => a.battery < 25).length;
    return `${online}/${state.agents.length} agents operational. ${rescuing} actively rescuing, ${moving} in transit. ${lowBattery} agent(s) have low battery (<25%). Mission success rate: ${Math.round(state.stats.rescueSuccessRate * 100)}%.`;
  }

  // Statistics
  if (q.includes('statistic') || q.includes('performance') || q.includes('summary') || q.includes('status')) {
    return `**ARES System Status** — Tick ${state.tick}: ${state.stats.civiliansRescued} civilians rescued, ${state.hazards.filter(h => h.active).length} active hazards, ${state.stats.routeRecalculations} route recalculations, ${state.missions.filter(m => m.status === 'completed').length} missions complete. Agent utilization: ${Math.round(state.stats.agentUtilization * 100)}%. [SIMULATED DATA — DEMO MODE]`;
  }

  // Default
  return `I can answer questions about current rescue priorities, agent assignments, route safety, hazard impacts, and system performance. Try asking: "What is the highest priority rescue?" or "How many civilians are at critical risk?" [Note: This is a simulated AI response using live simulation state data.]`;
}
