import { useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";

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
    const duration = 700;
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
    if (!isFirebaseConfigured) return;
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        const { rtdb } = getFirebase();
        if (!rtdb) return;
        const { ref, push, onValue, onDisconnect, remove, serverTimestamp, set } = await import(
          "firebase/database"
        );
        const listRef = ref(rtdb, "presence");
        const myRef = push(listRef);
        await set(myRef, { t: serverTimestamp() });
        onDisconnect(myRef).remove();
        const unsub = onValue(listRef, (snap) => {
          setCount(snap.size || 0);
        });
        const onBeforeUnload = () => { try { remove(myRef); } catch {} };
        window.addEventListener("beforeunload", onBeforeUnload);
        cleanup = () => {
          window.removeEventListener("beforeunload", onBeforeUnload);
          try { unsub(); } catch {}
          try { remove(myRef); } catch {}
        };
      } catch {}
    })();
    return () => { if (cleanup) cleanup(); };
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
