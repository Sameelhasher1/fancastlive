import { useEffect, useState, type RefObject } from "react";
import { Gauge } from "lucide-react";

/**
 * Tracks decoded bytes from <video> elements (Chromium) and pauses them when
 * the per-hour user-selected cap is hit. Resets each rolling hour.
 */
export function useBandwidthGuard(videoRefs: RefObject<HTMLVideoElement | null>[], limitMB: number) {
  const [usedMB, setUsedMB] = useState(0);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!limitMB) { setBlocked(false); return; }
    let bytesAtStart: Map<HTMLVideoElement, number> = new Map();
    let totalBytes = 0;
    let windowStart = Date.now();

    const id = setInterval(() => {
      // Rolling 1-hour window reset
      if (Date.now() - windowStart > 60 * 60 * 1000) {
        windowStart = Date.now();
        totalBytes = 0;
        bytesAtStart = new Map();
        setBlocked(false);
      }
      let increment = 0;
      for (const ref of videoRefs) {
        const v = ref.current;
        if (!v) continue;
        const decoded = (v as any).webkitVideoDecodedByteCount;
        if (typeof decoded !== "number") continue;
        const prev = bytesAtStart.get(v);
        if (prev == null) bytesAtStart.set(v, decoded);
        else if (decoded >= prev) {
          increment += decoded - prev;
          bytesAtStart.set(v, decoded);
        } else {
          bytesAtStart.set(v, decoded);
        }
      }
      if (increment > 0) {
        totalBytes += increment;
        setUsedMB(totalBytes / (1024 * 1024));
      }
      if (totalBytes / (1024 * 1024) >= limitMB) {
        setBlocked(true);
        videoRefs.forEach((r) => { try { r.current?.pause(); } catch {} });
      }
    }, 2000);
    return () => clearInterval(id);
  }, [videoRefs, limitMB]);

  return { usedMB, blocked, resetBlock: () => setBlocked(false) };
}

export function BandwidthBadge({ usedMB, limitMB }: { usedMB: number; limitMB: number }) {
  if (!limitMB) return null;
  const pct = Math.min(100, (usedMB / limitMB) * 100);
  return (
    <div className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-surface border border-border text-xs">
      <Gauge className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="tabular-nums">{usedMB.toFixed(0)}<span className="text-muted-foreground">/{limitMB}MB</span></span>
      <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
