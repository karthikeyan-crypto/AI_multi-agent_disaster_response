import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  { icon: '🔍', title: '1. DETECT', desc: 'AI identifies civilians and hazards in the disaster zone using drones and sensors.' },
  { icon: '🚨', title: '2. PRIORITIZE', desc: 'AI determines which rescue mission is most urgent based on health, hazard exposure, and accessibility.' },
  { icon: '🤖', title: '3. ASSIGN', desc: 'The best available rescue agent is selected — the one closest with enough battery and health.' },
  { icon: '🗺️', title: '4. PLAN', desc: 'AI generates a safe route that avoids fire, flood, and debris using A* pathfinding.' },
  { icon: '✅', title: '5. ACT', desc: 'The rescue agent performs the mission — moving to the civilian and bringing them to safety.' },
  { icon: '🔄', title: '6. ADAPT', desc: 'If the disaster changes, the AI detects the change, recalculates routes, and finds a new safe path.' },
];

interface HowItWorksOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function HowItWorksOverlay({ open, onClose }: HowItWorksOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="ares-panel rounded-2xl border border-[var(--ares-cyan)]/30 max-w-2xl w-full p-6 max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-black text-[var(--ares-cyan)] tracking-wider">HOW DOES ARES WORK?</h2>
                <p className="text-xs text-muted-foreground mt-1">The AI rescue process in 6 simple steps</p>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground text-xl px-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {STEPS.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-4 p-3 rounded-lg bg-[var(--ares-surface)] border border-[var(--ares-panel-border)]"
                >
                  <div className="text-3xl shrink-0">{step.icon}</div>
                  <div>
                    <div className="text-sm font-bold text-foreground tracking-wider">{step.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-lg bg-[oklch(0.65_0.18_195_/_0.05)] border border-[var(--ares-cyan)]/20 text-center">
              <div className="text-xs text-[var(--ares-cyan)] font-bold uppercase tracking-wider">
                See. Decide. Adapt. Rescue.
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Intelligence for the moments that matter.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
