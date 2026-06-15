import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toString();
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = display;
    fromRef.current = from;
    startRef.current = performance.now();
    const duration = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className="tabular-nums">{formatNum(display)}</span>;
}

export default function ViewerCount() {
  const [count, setCount] = useState<number>(() => 1200 + Math.floor(Math.random() * 800));

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => {
        const delta = Math.floor(Math.random() * 60) - 25;
        const next = Math.max(800, c + delta);
        return next;
      });
    }, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-surface border border-border text-xs sm:text-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
      <AnimatedNumber value={count} />
      <span className="text-muted-foreground hidden sm:inline">watching</span>
    </div>
  );
}
