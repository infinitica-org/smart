'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const WAIT_GAME_CELLS = 9;

export function nextWaitGameCell(except: number, roll: () => number = Math.random): number {
  const raw = Math.floor(roll() * WAIT_GAME_CELLS);
  if (raw === except) return (raw + 1) % WAIT_GAME_CELLS;
  return raw;
}

export function SkillVerifyWaitGame() {
  const [active, setActive] = useState(4);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [missFlash, setMissFlash] = useState(false);
  const missTimer = useRef<number>(0);

  const hit = useCallback(
    (index: number) => {
      if (index !== active) {
        setMissFlash(true);
        window.clearTimeout(missTimer.current);
        missTimer.current = window.setTimeout(() => setMissFlash(false), 180);
        return;
      }
      setScore((prev) => prev + 1);
      setBest((current) => Math.max(current, score + 1));
      setActive((current) => nextWaitGameCell(current));
    },
    [active, score],
  );

  useEffect(() => {
    const hop = window.setInterval(() => {
      setActive((current) => nextWaitGameCell(current));
    }, 1_400);
    return () => {
      window.clearInterval(hop);
      window.clearTimeout(missTimer.current);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const digit = Number(event.key);
      if (!Number.isInteger(digit) || digit < 1 || digit > 9) return;
      hit(digit - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-300/80">Pulse</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Tap the lit square. Keys 1–9 work too.
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Score</p>
            <p className="font-mono text-lg text-white" data-testid="wait-game-score">
              {score}
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-white/40">Best</p>
            <p className="font-mono text-lg text-white/70">{best}</p>
          </div>
        </div>
      </div>
      <div
        className={`grid grid-cols-3 gap-2 ${missFlash ? 'opacity-70' : ''}`}
        role="group"
        aria-label="Pulse wait game"
      >
        {Array.from({ length: WAIT_GAME_CELLS }, (_, index) => {
          const lit = index === active;
          return (
            <button
              key={index}
              type="button"
              aria-label={lit ? `Hit square ${String(index + 1)}` : `Square ${String(index + 1)}`}
              aria-pressed={lit}
              onClick={() => hit(index)}
              className={`h-16 rounded-xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 sm:h-20 ${
                lit
                  ? 'scale-[1.03] border-teal-300/80 bg-teal-400 shadow-[0_0_18px_rgba(45,212,191,0.45)]'
                  : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
