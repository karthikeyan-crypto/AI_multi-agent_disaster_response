import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { SimulationState } from '../../types';

interface AnalyticsProps {
  state: SimulationState;
}

function StatCard({ label, value, sub, color = 'text-[var(--ares-cyan)]' }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="bg-[var(--ares-surface)] border border-[var(--ares-panel-border)] rounded-lg p-3">
      <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-bold font-mono-data ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: 'oklch(0.12 0.015 240)',
  border: '1px solid oklch(0.30 0.05 195 / 0.4)',
  borderRadius: '6px',
  fontSize: '10px',
  color: 'oklch(0.95 0.01 240)',
};

export default function Analytics({ state }: AnalyticsProps) {
  const { stats, agents, missions, hazards, civilians } = state;

  const rescueData = stats.historicalRescues.map((v, i) => ({ t: i, rescued: v }));
  const hazardData = stats.historicalHazards.map((v, i) => ({ t: i, hazards: v }));

  const missionStatusData = [
    { name: 'Completed', value: stats.missionsCompleted, color: '#00ff88' },
    { name: 'Active', value: missions.filter(m => m.status === 'active' || m.status === 'assigned').length, color: '#00aaff' },
    { name: 'Failed', value: stats.missionsFailed, color: '#ff3300' },
  ].filter(d => d.value > 0);

  const agentData = agents.map(a => ({
    name: a.id.replace('ARES-', ''),
    battery: Math.round(a.battery),
    health: Math.round(a.health),
    missions: a.decisionCount,
  }));

  const urgencyCounts = {
    critical: civilians.filter(c => c.urgency === 'critical' && c.status === 'waiting').length,
    high: civilians.filter(c => c.urgency === 'high' && c.status === 'waiting').length,
    medium: civilians.filter(c => c.urgency === 'medium' && c.status === 'waiting').length,
    low: civilians.filter(c => c.urgency === 'low' && c.status === 'waiting').length,
  };

  const formatTime = (ticks: number) => {
    const s = Math.round(ticks * 0.5);
    return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-cyan)] animate-pulse" />
        <span className="text-xs font-semibold tracking-wider text-[var(--ares-cyan)] uppercase">AI Performance Analytics</span>
        <span className="text-[9px] text-muted-foreground ml-auto">[SIMULATED DATA]</span>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <StatCard label="Civilians Rescued" value={stats.civiliansRescued} sub={`of ${stats.civiliansTotal}`} color="text-[var(--ares-green)]" />
        <StatCard label="Missions Complete" value={stats.missionsCompleted} color="text-[var(--ares-cyan)]" />
        <StatCard label="Route Recalcs" value={stats.routeRecalculations} color="text-[var(--ares-yellow)]" />
        <StatCard label="Avg Response" value={formatTime(stats.avgResponseTime)} color="text-purple-400" />
        <StatCard label="Agent Utilization" value={`${Math.round(stats.agentUtilization * 100)}%`} color="text-blue-400" />
        <StatCard label="Success Rate" value={`${Math.round(stats.rescueSuccessRate * 100)}%`} color="text-[var(--ares-green)]" />
        <StatCard label="Active Hazards" value={hazards.filter(h => h.active).length} color="text-[var(--ares-red)]" />
        <StatCard label="Simulation Tick" value={state.tick} color="text-muted-foreground" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Rescue progress */}
        <div className="bg-[var(--ares-surface)] border border-[var(--ares-panel-border)] rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Rescue Progress</div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={rescueData}>
              <defs>
                <linearGradient id="rescueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 240)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'oklch(0.55 0.02 240)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'oklch(0.55 0.02 240)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="rescued" stroke="#00ff88" fill="url(#rescueGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Active hazards */}
        <div className="bg-[var(--ares-surface)] border border-[var(--ares-panel-border)] rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Active Hazards Over Time</div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={hazardData}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 240)" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: 'oklch(0.55 0.02 240)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'oklch(0.55 0.02 240)' }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="hazards" stroke="#ff4400" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Agent battery/health */}
        <div className="bg-[var(--ares-surface)] border border-[var(--ares-panel-border)] rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Agent Battery & Health</div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={agentData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 240)" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'oklch(0.55 0.02 240)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'oklch(0.55 0.02 240)' }} domain={[0, 100]} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="battery" fill="#00aaff" radius={[2, 2, 0, 0]} maxBarSize={16} />
              <Bar dataKey="health" fill="#44ff88" radius={[2, 2, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mission status pie */}
        <div className="bg-[var(--ares-surface)] border border-[var(--ares-panel-border)] rounded-lg p-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Mission Status</div>
          {missionStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={missionStatusData} dataKey="value" cx="50%" cy="50%" outerRadius={45} innerRadius={25}>
                  {missionStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend formatter={(value) => <span style={{ fontSize: 9, color: 'oklch(0.55 0.02 240)' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[120px] text-muted-foreground text-xs">
              No missions yet
            </div>
          )}
        </div>
      </div>

      {/* Civilian urgency breakdown */}
      <div className="bg-[var(--ares-surface)] border border-[var(--ares-panel-border)] rounded-lg p-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-3">Civilian Status Breakdown</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { label: 'Critical', count: urgencyCounts.critical, color: 'text-[var(--ares-red)]', bar: 'bg-[var(--ares-red)]' },
            { label: 'High', count: urgencyCounts.high, color: 'text-[var(--ares-orange)]', bar: 'bg-[var(--ares-orange)]' },
            { label: 'Medium', count: urgencyCounts.medium, color: 'text-[var(--ares-yellow)]', bar: 'bg-[var(--ares-yellow)]' },
            { label: 'Rescued', count: stats.civiliansRescued, color: 'text-[var(--ares-green)]', bar: 'bg-[var(--ares-green)]' },
          ].map(({ label, count, color, bar }) => (
            <div key={label} className="text-center">
              <div className={`text-2xl font-bold font-mono-data ${color}`}>{count}</div>
              <div className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{label}</div>
              <div className="mt-1.5 w-full bg-secondary rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full rounded-full ${bar} transition-all duration-500`}
                  style={{ width: `${(count / Math.max(1, civilians.length)) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
