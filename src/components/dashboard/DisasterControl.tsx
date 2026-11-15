import { motion } from 'framer-motion';
import type { SimulationConfig, EmergencyEvent } from '../../types';

interface DisasterControlProps {
  config: SimulationConfig;
  onChange: (config: SimulationConfig) => void;
  onTriggerEvent: (type: EmergencyEvent['type']) => void;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onDemo: () => void;
  onTestAdaptation: () => void;
  paused: boolean;
  viewMode: 'simple' | 'advanced';
  speedMultiplier: number;
  onSpeedChange: (speed: number) => void;
}

const disasterTypes = [
  { value: 'earthquake', label: '🌍 Earthquake' },
  { value: 'flood', label: '🌊 Flood' },
  { value: 'wildfire', label: '🔥 Wildfire' },
  { value: 'cyclone', label: '🌀 Cyclone' },
  { value: 'building_collapse', label: '🏚 Collapse' },
] as const;

const difficulties = ['easy', 'medium', 'hard', 'extreme'] as const;

const emergencyEvents = [
  { type: 'fire_outbreak' as const, label: '🔥 Fire Outbreak', color: 'border-red-500/40 text-red-400 hover:bg-red-500/10' },
  { type: 'flood_surge' as const, label: '🌊 Flood Surge', color: 'border-blue-500/40 text-blue-400 hover:bg-blue-500/10' },
  { type: 'building_collapse' as const, label: '🏚 Collapse', color: 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10' },
  { type: 'road_blocked' as const, label: '🚧 Road Block', color: 'border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10' },
  { type: 'aftershock' as const, label: '⚠ Aftershock', color: 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10' },
  { type: 'low_battery' as const, label: '🔋 Low Battery', color: 'border-gray-500/40 text-gray-400 hover:bg-gray-500/10' },
];

function Slider({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between text-[10px] mb-1">
        <span className="text-muted-foreground uppercase tracking-wider">{label}</span>
        <span className="font-mono-data text-[var(--ares-cyan)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, var(--ares-cyan) ${((value - min) / (max - min)) * 100}%, var(--secondary) ${((value - min) / (max - min)) * 100}%)`
        }}
      />
    </div>
  );
}

export default function DisasterControl({
  config, onChange, onTriggerEvent, running, onStart, onPause, onReset, onDemo, onTestAdaptation, paused, viewMode, speedMultiplier, onSpeedChange
}: DisasterControlProps) {
  const update = (patch: Partial<SimulationConfig>) => onChange({ ...config, ...patch });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Simulation Controls */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-1.5 h-1.5 rounded-full ${running && !paused ? 'bg-[var(--ares-green)] animate-pulse' : 'bg-muted-foreground'}`} />
          <span className="text-xs font-semibold tracking-wider text-[var(--ares-cyan)] uppercase">Simulation Control</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={running && !paused ? onPause : onStart}
            className={`py-2 rounded text-xs font-bold uppercase tracking-wider border transition-all ${
              running && !paused
                ? 'border-[var(--ares-yellow)] text-[var(--ares-yellow)] bg-yellow-500/10 hover:bg-yellow-500/20'
                : 'border-[var(--ares-green)] text-[var(--ares-green)] bg-green-500/10 hover:bg-green-500/20'
            }`}
          >
            {running && !paused ? '⏸ PAUSE' : running && paused ? '▶ RESUME' : '▶ START'}
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onReset}
            className="py-2 rounded text-xs font-bold uppercase tracking-wider border border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all"
          >
            ↺ RESET
          </motion.button>
        </div>

        {/* Test AI Adaptation — the centerpiece demo */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onTestAdaptation}
          className="w-full py-2.5 mb-1.5 rounded text-xs font-bold uppercase tracking-widest border border-[var(--ares-orange)] text-[var(--ares-orange)] bg-orange-500/10 hover:bg-orange-500/20 transition-all"
        >
          ⚡ TEST AI ADAPTATION
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onDemo}
          className="w-full py-2 rounded text-xs font-bold uppercase tracking-widest border border-[var(--ares-cyan)] text-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.08)] hover:bg-[oklch(0.65_0.18_195_/_0.15)] transition-all animate-pulse-cyan"
        >
          ⚡ DEMO MODE
        </motion.button>

        {/* Speed selector */}
        <div className="mt-1.5">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Simulation Speed</div>
          <div className="grid grid-cols-3 gap-1">
            {[1, 1.5, 2].map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                  speedMultiplier === s
                    ? 'border-[var(--ares-cyan)] text-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.12)]'
                    : 'border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disaster Type */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Disaster Type</div>
        <div className="grid grid-cols-1 gap-1">
          {disasterTypes.map(dt => (
            <button
              key={dt.value}
              onClick={() => update({ disasterType: dt.value })}
              disabled={running}
              className={`text-left px-2 py-1.5 rounded text-xs border transition-all ${
                config.disasterType === dt.value
                  ? 'border-[var(--ares-cyan)] text-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.08)]'
                  : 'border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground hover:border-foreground/30'
              } disabled:opacity-40`}
            >
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Difficulty</div>
        <div className="grid grid-cols-2 gap-1">
          {difficulties.map(d => (
            <button
              key={d}
              onClick={() => update({ difficulty: d })}
              disabled={running}
              className={`py-1.5 rounded text-[10px] font-bold uppercase tracking-wider border transition-all ${
                config.difficulty === d
                  ? d === 'extreme' ? 'border-red-500/60 text-[var(--ares-red)] bg-red-500/10'
                  : d === 'hard' ? 'border-orange-500/60 text-[var(--ares-orange)] bg-orange-500/10'
                  : d === 'medium' ? 'border-yellow-500/60 text-[var(--ares-yellow)] bg-yellow-500/10'
                  : 'border-green-500/60 text-[var(--ares-green)] bg-green-500/10'
                  : 'border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground'
              } disabled:opacity-40`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Agent counts — always visible so user can configure before demo */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)] space-y-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Fleet Size</div>
        <Slider label="Drones" value={config.droneCount} min={1} max={6} onChange={v => update({ droneCount: v })} />
        <Slider label="Ground Robots" value={config.robotCount} min={1} max={6} onChange={v => update({ robotCount: v })} />
      </div>

      {/* Advanced sliders */}
      {viewMode === 'advanced' && (
        <div className="px-3 py-2 border-b border-[var(--ares-panel-border)] space-y-3">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Parameters</div>
          <Slider label="Civilians" value={config.civilianCount} min={4} max={20} onChange={v => update({ civilianCount: v })} />
          <Slider label="Hazard Rate" value={config.hazardRate} min={1} max={10} onChange={v => update({ hazardRate: v })} />
          <Slider label="Fire Spread" value={config.fireSpread} min={1} max={10} onChange={v => update({ fireSpread: v })} />
        </div>
      )}

      {/* Emergency Events */}
      <div className="px-3 py-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">⚡ Trigger Emergency Event</div>
        <div className="grid grid-cols-2 gap-1.5">
          {emergencyEvents.map(ev => (
            <motion.button
              key={ev.type}
              whileTap={{ scale: 0.95 }}
              onClick={() => onTriggerEvent(ev.type)}
              disabled={!running}
              className={`py-2 px-2 rounded text-[10px] font-bold uppercase tracking-wide border transition-all ${ev.color} disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {ev.label}
            </motion.button>
          ))}
        </div>
        {!running && (
          <div className="text-[9px] text-muted-foreground/50 mt-2 text-center">
            Start simulation to trigger events
          </div>
        )}
      </div>
    </div>
  );
}
