"use client";

import { motion, AnimatePresence } from "framer-motion";

const TIER_STYLES = {
  Common:  { cardBg: '#E8E2D6', badge: 'bg-[#DFD8CC] text-[#4A4540]' },
  Notable: { cardBg: '#E4F6F7', badge: 'bg-cyan/10 text-cyan'        },
  Shock:   { cardBg: '#FBF4E4', badge: 'bg-amber-50 text-amber-700'  },
  Seismic: { cardBg: '#FDE8E8', badge: 'bg-red-50 text-red-700'      },
} as const;

const CARD_STATES = [
  {
    tier: "Common" as const,
    score: "0 - 0",
    event: "Check-in active",
    minute: "Before kickoff",
  },
  {
    tier: "Notable" as const,
    score: "1 - 0",
    event: "Goal — Spain",
    minute: "48 mins",
  },
  {
    tier: "Shock" as const,
    score: "1 - 1",
    event: "Goal — Belgium",
    minute: "89 mins",
  },
  {
    tier: "Seismic" as const,
    score: "1 - 2",
    event: "Full-time Upset",
    minute: "90 + 4 mins",
  },
];

export function StickyMomentCard({ activeStep }: { activeStep: number }) {
  const state = CARD_STATES[activeStep] || CARD_STATES[0];

  return (
    <div className="relative w-[190px] h-[268px]">
      <motion.div
        className="w-[190px] h-[268px] rounded-[18px] border border-cream-border overflow-hidden flex flex-col"
        animate={{ backgroundColor: TIER_STYLES[state.tier].cardBg }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Top */}
        <div className="flex-1 flex flex-col justify-between p-4">
          <AnimatePresence mode="wait">
            <motion.span
              key={state.tier}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
              className={`self-start text-[9px] font-semibold tracking-[0.16em] uppercase px-2 py-1 rounded ${TIER_STYLES[state.tier].badge}`}
            >
              {state.tier}
            </motion.span>
          </AnimatePresence>

          <div>
            <AnimatePresence mode="wait">
              <motion.div
                key={state.score}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="font-display text-[40px] font-bold leading-none tracking-tight text-[#1A1714]"
              >
                {state.score}
              </motion.div>
            </AnimatePresence>
            <p className="text-[11px] text-[#4A4540] mt-1">{state.event}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#100F06] px-4 py-3">
          <p className="font-display text-[11px] font-bold text-cream tracking-wide">Spain vs Belgium</p>
          <p className="text-[9px] text-[#DFD8CC] tracking-[0.08em] uppercase mt-0.5">{state.minute}</p>
        </div>
      </motion.div>

      {/* Sheen Overlay */}
      <div className={`
        absolute inset-0 pointer-events-none rounded-[18px] transition-opacity duration-500
        ${state.tier === 'Shock' || state.tier === 'Seismic' ? 'opacity-100' : 'opacity-0'}
      `}
        style={{ background: 'linear-gradient(135deg, transparent 38%, rgba(255,255,255,0.15) 50%, transparent 62%)' }}
      />
    </div>
  );
}
