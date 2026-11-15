import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SimulationState, CopilotMessage } from '../../types';
import { generateCopilotResponse } from '../../simulation/copilot';

const SUGGESTED = [
  "What is the highest priority rescue?",
  "How many civilians are at critical risk?",
  "Which route is safest right now?",
  "What changed after the last event?",
  "Give me a system status summary.",
];

interface AICopilotProps {
  simState: SimulationState;
}

export default function AICopilot({ simState }: AICopilotProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "ARES AI Copilot online. I have access to the current simulation state and can answer questions about rescue priorities, agent assignments, route safety, and system performance. How can I assist?",
      timestamp: 0
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: CopilotMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: simState.tick
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate processing delay
    await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

    const response = generateCopilotResponse(text, simState);
    const assistantMsg: CopilotMessage = {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: response,
      timestamp: simState.tick
    };
    setMessages(prev => [...prev, assistantMsg]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--ares-panel-border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-[var(--ares-cyan)] uppercase">ARES AI Copilot</span>
          </div>
          <div className="text-[9px] px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400">
            SIMULATED AI
          </div>
        </div>
        <div className="text-[9px] text-muted-foreground mt-1">
          Human oversight active — AI provides decision support only.
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: 0 }}>
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <span className="text-[8px] text-purple-400">AI</span>
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[oklch(0.65_0.18_195_/_0.12)] border border-[var(--ares-panel-border)] text-foreground'
                    : 'bg-purple-500/8 border border-purple-500/20 text-foreground'
                }`}
              >
                {msg.content.split('**').map((part, i) =>
                  i % 2 === 1
                    ? <strong key={i} className="text-[var(--ares-cyan)]">{part}</strong>
                    : <span key={i}>{part}</span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
              <span className="text-[8px] text-purple-400">AI</span>
            </div>
            <div className="flex gap-1 px-3 py-2 bg-purple-500/8 border border-purple-500/20 rounded-lg">
              {[0, 0.15, 0.3].map(delay => (
                <div key={delay} className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${delay}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-3 py-2 border-t border-[var(--ares-panel-border)]">
        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide">
          {SUGGESTED.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={loading}
              className="shrink-0 text-[9px] px-2 py-1 rounded border border-[var(--ares-panel-border)] text-muted-foreground hover:text-foreground hover:border-[var(--ares-cyan-dim)] transition-all whitespace-nowrap"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send(input)}
            placeholder="Ask about the simulation..."
            disabled={loading}
            className="flex-1 bg-secondary/30 border border-[var(--ares-panel-border)] rounded px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--ares-cyan-dim)] transition-colors"
          />
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="px-3 py-2 rounded text-xs font-bold border border-[var(--ares-cyan)] text-[var(--ares-cyan)] bg-[oklch(0.65_0.18_195_/_0.08)] hover:bg-[oklch(0.65_0.18_195_/_0.15)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ↵
          </motion.button>
        </div>
      </div>
    </div>
  );
}
