import { motion } from 'framer-motion';

export type PipelineStep = 'detect' | 'prioritize' | 'assign' | 'plan' | 'rescue';

const STEPS: { id: PipelineStep; label: string; icon: string }[] = [
  { id: 'detect', label: 'DETECT', icon: '🔍' },
  { id: 'prioritize', label: 'PRIORITIZE', icon: '🚨' },
  { id: 'assign', label: 'ASSIGN', icon: '🤖' },
  { id: 'plan', label: 'PLAN ROUTE', icon: '🗺️' },
  { id: 'rescue', label: 'RESCUE', icon: '✅' },
];

const stepColors: Record<string, { active: string; done: string; idle: string }> = {
  detect:     { active: 'border-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.15)] text-[var(--ares-cyan)]', done: 'border-[var(--ares-green)]/50 bg-green-500/5 text-[var(--ares-green)]', idle: 'border-[var(--ares-panel-border)] text-muted-foreground' },
  prioritize: { active: 'border-[var(--ares-orange)] bg-orange-500/10 text-[var(--ares-orange)]', done: 'border-[var(--ares-green)]/50 bg-green-500/5 text-[var(--ares-green)]', idle: 'border-[var(--ares-panel-border)] text-muted-foreground' },
  assign:     { active: 'border-blue-400 bg-blue-500/10 text-blue-400', done: 'border-[var(--ares-green)]/50 bg-green-500/5 text-[var(--ares-green)]', idle: 'border-[var(--ares-panel-border)] text-muted-foreground' },
  plan:       { active: 'border-[var(--ares-yellow)] bg-yellow-500/10 text-[var(--ares-yellow)]', done: 'border-[var(--ares-green)]/50 bg-green-500/5 text-[var(--ares-green)]', idle: 'border-[var(--ares-panel-border)] text-muted-foreground' },
  rescue:     { active: 'border-[var(--ares-green)] bg-green-500/10 text-[var(--ares-green)]', done: 'border-[var(--ares-green)]/50 bg-green-500/5 text-[var(--ares-green)]', idle: 'border-[var(--ares-panel-border)] text-muted-foreground' },
};

interface AIPipelineProps {
  activeStep: PipelineStep | null;
  completedSteps: PipelineStep[];
}

export default function AIPipeline({ activeStep, completedSteps }: AIPipelineProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {STEPS.map((step, i) => {
        const isActive = activeStep === step.id;
        const isDone = completedSteps.includes(step.id);
        const colorClass = isActive ? stepColors[step.id].active : isDone ? stepColors[step.id].done : stepColors[step.id].idle;

        return (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            <motion.div
              animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
              transition={isActive ? { repeat: Infinity, duration: 1.5 } : {}}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${colorClass} ${isActive ? 'ares-glow-cyan' : ''}`}
            >
              <span className="text-sm">{step.icon}</span>
              <span>{step.label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
              {isDone && !isActive && <span className="text-[10px]">✓</span>}
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-3 ${isDone ? 'bg-[var(--ares-green)]/50' : 'bg-[var(--ares-panel-border)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
