import { useEffect, useState } from 'react';
import { formatSeconds } from '../format.ts';
import { readSeconds, writeSeconds } from '../storage.ts';
import type { MenuImport } from '../types.ts';

interface ReviewTimerProps {
  menu: MenuImport;
  running: boolean;
  onToggle: () => void;
}

// Alone in its component, so the list is not drawn again every second. It keeps counting while the original menu
// is open in another tab, since comparing is part of the work.
export function ReviewTimer({ menu, running, onToggle }: ReviewTimerProps) {
  const [seconds, setSeconds] = useState(() => readSeconds(menu));

  useEffect(() => {
    if (!running) return;
    const base = readSeconds(menu);
    const startedAt = Date.now();
    const tick = () => {
      const total = base + (Date.now() - startedAt) / 1000;
      writeSeconds(menu, total);
      setSeconds(total);
    };
    const timer = setInterval(tick, 1000);
    return () => {
      clearInterval(timer);
      tick();
    };
  }, [menu, running]);

  return (
    <button
      onClick={onToggle}
      aria-label={running ? 'Pausar el tiempo' : 'Seguir contando el tiempo'}
      className={`min-h-11 rounded-lg px-3 text-sm tabular-nums ${running ? 'bg-stone-200' : 'bg-stone-100 text-ink-muted'}`}
    >
      {running ? '⏸' : '▶'} {formatSeconds(seconds)}
    </button>
  );
}
