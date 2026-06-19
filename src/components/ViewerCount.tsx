import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";

const COUNTER_URL = "https://api.counterapi.dev/v1/fancast/viewers";

function formatNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "K";
  return n.toString();
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const rafRef = useRef<number | null>(null);
  const fromRef = useRef(value);

  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    const duration = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (value - from) * eased);
      setDisplay(v);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <span className="tabular-nums">{formatNum(display)}</span>;
}

export default function ViewerCount() {
  const [count, setCount] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    const sessionKey = "fancast-viewer-session";
    const isNewSession = !sessionStorage.getItem(sessionKey);

    const fetchCount = async (bump: boolean) => {
      try {
        const url = bump ? `${COUNTER_URL}/up` : `${COUNTER_URL}/`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        const v = Number(j?.count ?? j?.value ?? 0);
        if (!cancelled && v > 0) setCount(v);
        if (bump) sessionStorage.setItem(sessionKey, "1");
      } catch {}
    };
    fetchCount(isNewSession);
    const id = setInterval(() => fetchCount(false), 7000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-surface border border-border text-xs sm:text-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
      {mounted && count > 0 ? <AnimatedNumber value={count} /> : <span className="tabular-nums text-muted-foreground">—</span>}
      <span className="text-muted-foreground hidden sm:inline">watching</span>
    </div>
  );
}
