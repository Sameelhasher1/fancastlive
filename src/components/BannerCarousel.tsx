import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type BannerItem = { url: string; link?: string };

export default function BannerCarousel({ items }: { items: BannerItem[] }) {
  const valid = items.filter((b) => b.url);
  const count = valid.length;

  // Use an extended track with a clone of the first slide at the end for seamless loop.
  const [index, setIndex] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; lastX: number; active: boolean } | null>(null);

  // Auto-advance
  useEffect(() => {
    if (count <= 1 || paused) return;
    const id = setInterval(() => {
      setAnimating(true);
      setIndex((i) => i + 1);
    }, 5000);
    return () => clearInterval(id);
  }, [count, paused]);

  // Seamless loop: when we land on the clone (index === count), snap to 0 without animation.
  const onTransitionEnd = () => {
    if (index >= count) {
      setAnimating(false);
      setIndex(0);
      // re-enable animation next frame
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    } else if (index < 0) {
      setAnimating(false);
      setIndex(count - 1);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimating(true)));
    }
  };

  const goPrev = () => {
    setAnimating(true);
    setIndex((i) => i - 1);
  };
  const goNext = () => {
    setAnimating(true);
    setIndex((i) => i + 1);
  };
  const goTo = (i: number) => {
    setAnimating(true);
    setIndex(i);
  };

  // Touch / pointer swipe
  const onPointerDown = (e: React.PointerEvent) => {
    setPaused(true);
    dragRef.current = { startX: e.clientX, lastX: e.clientX, active: true };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current?.active) return;
    dragRef.current.lastX = e.clientX;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current?.active) return;
    const dx = dragRef.current.lastX - dragRef.current.startX;
    dragRef.current.active = false;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    const threshold = 50;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
    // resume autoplay shortly after
    setTimeout(() => setPaused(false), 800);
  };

  if (count === 0) return null;

  const activeDot = ((index % count) + count) % count;

  return (
    <div
      className="relative group select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="overflow-hidden rounded-2xl border border-border shadow-xl shadow-black/40 bg-surface">
        <div
          ref={trackRef}
          className="flex w-full"
          style={{
            transform: `translateX(-${index * 100}%)`,
            transition: animating ? "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)" : "none",
            touchAction: "pan-y",
          }}
          onTransitionEnd={onTransitionEnd}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {[...valid, valid[0]].map((b, i) => {
            const img = (
              <img
                src={b.url}
                alt={`Banner ${(i % count) + 1}`}
                draggable={false}
                className="w-full h-full object-cover pointer-events-none"
                loading={i === 0 ? "eager" : "lazy"}
              />
            );
            return (
              <div key={i} className="shrink-0 w-full aspect-video overflow-hidden">
                {b.link ? (
                  <a href={b.link} target="_blank" rel="noreferrer noopener" className="block w-full h-full">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            );
          })}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            aria-label="Previous banner"
            onClick={goPrev}
            className="grid place-items-center absolute top-1/2 left-2 sm:left-3 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/10 backdrop-blur transition z-10"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button
            aria-label="Next banner"
            onClick={goNext}
            className="grid place-items-center absolute top-1/2 right-2 sm:right-3 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/10 backdrop-blur transition z-10"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {valid.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === activeDot ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
