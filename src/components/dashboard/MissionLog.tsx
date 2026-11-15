import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LogEntry } from '../../types';

function formatTime(tick: number): string {
  const seconds = Math.round(tick * 0.5);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const typeConfig = {
  info: { color: 'text-blue-400', icon: '🔵' },
  warning: { color: 'text-[var(--ares-yellow)]', icon: '🟡' },
  success: { color: 'text-[var(--ares-green)]', icon: '🟢' },
  error: { color: 'text-[var(--ares-red)]', icon: '🔴' },
  ai: { color: 'text-purple-400', icon: '🧠' },
  mission: { color: 'text-[var(--ares-cyan)]', icon: '🎯' },
};

interface MissionLogProps {
  entries: LogEntry[];
}

export default function MissionLog({ entries }: MissionLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current && containerRef.current) {
      const container = containerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
      if (isNearBottom) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [entries]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--ares-panel-border)]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--ares-green)] animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider text-[var(--ares-cyan)] uppercase">Mission Timeline</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{entries.length} events</span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5 text-xs"
        style={{ minHeight: 0, maxHeight: '3.5rem' }}
      >
        <AnimatePresence initial={false}>
          {entries.slice(0, 40).reverse().map(entry => {
            const cfg = typeConfig[entry.type];
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 leading-relaxed"
              >
                <span className="text-muted-foreground shrink-0 select-none font-mono-data text-[10px]">
                  {formatTime(entry.timestamp)}
                </span>
                <span className="shrink-0 select-none text-[10px]">{cfg.icon}</span>
                <span className={`${cfg.color} opacity-90`}>
                  {entry.message}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
