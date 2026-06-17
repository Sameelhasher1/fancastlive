import { useEffect, useRef, useState } from "react";
import type { OverlayItem } from "@/contexts/BrandingContext";

type Box = { x: number; y: number; w: number; h: number };

export default function OverlayLayer({ overlays }: { overlays: OverlayItem[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [boxes, setBoxes] = useState<Record<string, Box>>({});
  const [editMode, setEditMode] = useState(false);

  // Initialize / sync boxes from props
  useEffect(() => {
    setBoxes((prev) => {
      const next: Record<string, Box> = { ...prev };
      for (const o of overlays) {
        if (!next[o.id]) next[o.id] = { x: o.x, y: o.y, w: o.w, h: o.h };
      }
      // remove ids no longer present
      for (const id of Object.keys(next)) {
        if (!overlays.find((o) => o.id === id)) delete next[id];
      }
      return next;
    });
  }, [overlays]);

  const onDrag = (id: string, ev: React.PointerEvent) => {
    if (!editMode) return;
    ev.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const startX = ev.clientX;
    const startY = ev.clientY;
    const start = boxes[id];
    const move = (e: PointerEvent) => {
      const dx = ((e.clientX - startX) / rect.width) * 100;
      const dy = ((e.clientY - startY) / rect.height) * 100;
      setBoxes((b) => ({
        ...b,
        [id]: {
          ...b[id],
          x: Math.max(0, Math.min(100 - start.w, start.x + dx)),
          y: Math.max(0, Math.min(100 - start.h, start.y + dy)),
        },
      }));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (overlays.length === 0) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 z-30 pointer-events-none">
      <button
        onClick={() => setEditMode((e) => !e)}
        className={`pointer-events-auto absolute bottom-3 left-3 h-7 px-2.5 rounded-full text-[10px] uppercase tracking-wider border backdrop-blur transition ${
          editMode
            ? "bg-accent text-accent-foreground border-accent"
            : "bg-black/55 text-white border-white/10 hover:bg-black/75"
        }`}
        aria-label="Toggle overlay edit"
      >
        {editMode ? "Done" : "Edit overlays"}
      </button>

      {overlays.map((o) => {
        const b = boxes[o.id] || { x: o.x, y: o.y, w: o.w, h: o.h };
        const style: React.CSSProperties = {
          left: `${b.x}%`,
          top: `${b.y}%`,
          width: `${b.w}%`,
          height: `${b.h}%`,
          color: o.color,
          background: o.bg,
        };
        const interactive = editMode ? "pointer-events-auto cursor-move ring-2 ring-white/70" : "";
        if (o.type === "rect") {
          return (
            <div
              key={o.id}
              onPointerDown={(e) => onDrag(o.id, e)}
              style={{ ...style, background: o.bg || o.color, opacity: o.bg ? 1 : 0.6 }}
              className={`absolute rounded-md ${interactive}`}
            />
          );
        }
        if (o.type === "circle") {
          return (
            <div
              key={o.id}
              onPointerDown={(e) => onDrag(o.id, e)}
              style={{ ...style, background: o.bg || o.color, opacity: o.bg ? 1 : 0.6 }}
              className={`absolute rounded-full ${interactive}`}
            />
          );
        }
        // text
        return (
          <div
            key={o.id}
            onPointerDown={(e) => onDrag(o.id, e)}
            style={{
              ...style,
              fontSize: o.fontSize ? `${o.fontSize}px` : undefined,
              background: o.bg,
            }}
            className={`absolute font-display font-bold tracking-tight grid place-items-center text-center px-2 rounded-md ${interactive}`}
          >
            <span style={{ textShadow: "0 2px 12px rgba(0,0,0,0.6)" }}>{o.text}</span>
          </div>
        );
      })}
    </div>
  );
}
