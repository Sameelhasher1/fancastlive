import { useEffect, useState, type RefObject } from "react";
import { Wifi, WifiOff } from "lucide-react";

export type HealthLevel = "excellent" | "good" | "fair" | "poor" | "offline";

export function useStreamHealth(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const [health, setHealth] = useState<HealthLevel>("good");
  const [buffer, setBuffer] = useState(0);
  const [bitrateKbps, setBitrateKbps] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    let prevBytes = 0;
    let prevTs = performance.now();
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v) return;
      let aheadSec = 0;
      try {
        const cur = v.currentTime;
        for (let i = 0; i < v.buffered.length; i++) {
          if (cur >= v.buffered.start(i) && cur <= v.buffered.end(i)) {
            aheadSec = v.buffered.end(i) - cur;
            break;
          }
        }
      } catch {}
      setBuffer(aheadSec);

      // Try estimate bandwidth via video.webkitVideoDecodedByteCount if available
      const anyV = v as any;
      const bytes = anyV.webkitVideoDecodedByteCount ?? null;
      const now = performance.now();
      if (bytes != null && prevBytes > 0 && now > prevTs) {
        const dB = bytes - prevBytes;
        const dT = (now - prevTs) / 1000;
        if (dB > 0 && dT > 0) setBitrateKbps(Math.round((dB * 8) / dT / 1000));
      }
      if (bytes != null) { prevBytes = bytes; prevTs = now; }

      if (!navigator.onLine || v.networkState === 3) setHealth("offline");
      else if (v.readyState < 2 || aheadSec < 0.5) setHealth("poor");
      else if (aheadSec < 2) setHealth("fair");
      else if (aheadSec < 6) setHealth("good");
      else setHealth("excellent");
    }, 1500);
    return () => clearInterval(id);
  }, [videoRef, active]);

  return { health, buffer, bitrateKbps };
}

const COLORS: Record<HealthLevel, string> = {
  excellent: "text-emerald-400",
  good: "text-emerald-300",
  fair: "text-amber-300",
  poor: "text-orange-400",
  offline: "text-red-400",
};

const LABELS: Record<HealthLevel, string> = {
  excellent: "Excellent",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
  offline: "Offline",
};

export function HealthBadge({
  health,
  buffer,
  bitrateKbps,
}: { health: HealthLevel; buffer: number; bitrateKbps?: number | null }) {
  const bars = health === "excellent" ? 4 : health === "good" ? 3 : health === "fair" ? 2 : health === "poor" ? 1 : 0;
  return (
    <div
      className={`pointer-events-none absolute top-3 left-3 z-30 inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-black/55 backdrop-blur border border-white/10 text-[10px] uppercase tracking-wider ${COLORS[health]}`}
      title={`Stream health: ${LABELS[health]} · Buffer ${buffer.toFixed(1)}s${bitrateKbps ? ` · ${bitrateKbps} kbps` : ""}`}
    >
      {health === "offline" ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`w-[3px] rounded-sm ${i <= bars ? "bg-current" : "bg-current/25"}`}
            style={{ height: `${i * 25}%` }}
          />
        ))}
      </div>
      <span className="hidden sm:inline">{LABELS[health]}</span>
    </div>
  );
}
