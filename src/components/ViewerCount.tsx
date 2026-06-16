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

  useEffect(() => {
    const from = display;
    const start = performance.now();
    const duration = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
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
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    const sessionKey = "fancast-viewer-session";
    const isNewSession = !sessionStorage.getItem(sessionKey);

    const initial = async () => {
      try {
        const url = isNewSession ? `${COUNTER_URL}/up` : `${COUNTER_URL}/`;
        const r = await fetch(url, { cache: "no-store" });
        const j = await r.json();
        const v = Number(j?.count ?? j?.value ?? 0);
        if (!cancelled && v > 0) setCount(v);
        if (isNewSession) sessionStorage.setItem(sessionKey, "1");
      } catch {
        if (!cancelled) setCount(1240 + Math.floor(Math.random() * 800));
      }
    };
    initial();

    const id = setInterval(async () => {
      try {
        const r = await fetch(`${COUNTER_URL}/`, { cache: "no-store" });
        const j = await r.json();
        const v = Number(j?.count ?? j?.value ?? 0);
        if (!cancelled && v > 0) setCount(v);
      } catch {}
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-surface border border-border text-xs sm:text-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
      </span>
      <Eye className="w-3.5 h-3.5 text-muted-foreground" />
      <AnimatedNumber value={count} />
      <span className="text-muted-foreground hidden sm:inline">viewers</span>
    </div>
  );
}
