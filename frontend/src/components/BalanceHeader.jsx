import { useEffect, useRef, useState } from "react";

export default function BalanceHeader({ user }) {
  const target = Number(user?.balance ?? 0);
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = target;
    if (from === to) return;

    const duration = 650;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    function step(now) {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else prevRef.current = to;
    }
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target]);

  return (
    <header className="sticky top-0 z-20 glass-panel border-b border-line/80 flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-[10px] text-muted uppercase tracking-[0.18em] font-medium">Balans</p>
        <p className="font-mono text-2xl font-bold text-gold tabular-nums leading-tight">
          {display.toLocaleString("ru-RU")}
          <span className="text-sm text-muted font-body font-normal ml-1.5">so'm</span>
        </p>
      </div>
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-gold/25 blur-lg pulse-glow" />
        <div className="octagon relative w-12 h-12 bg-gradient-to-br from-surface3 to-surface2 border border-lineBright flex items-center justify-center text-xl shadow-softGlow">
          🎮
        </div>
      </div>
    </header>
  );
}
