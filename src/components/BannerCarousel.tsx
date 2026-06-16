import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type BannerItem = { url: string; link?: string };

export default function BannerCarousel({ items }: { items: BannerItem[] }) {
  const [index, setIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const valid = items.filter((b) => b.url);
  const count = valid.length;

  // Auto-advance
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % count);
    }, 5000);
    return () => clearInterval(id);
  }, [count]);

  // Scroll to index
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const child = el.children[index] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft, behavior: "smooth" });
  }, [index]);

  // Sync index from manual scroll
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const i = Math.round(el.scrollLeft / w);
    if (i !== index) setIndex(i);
  };

  if (count === 0) return null;

  return (
    <div className="relative group">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth rounded-2xl border border-border shadow-xl shadow-black/40 no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {valid.map((b, i) => {
          const Img = (
            <img
              src={b.url}
              alt={`Banner ${i + 1}`}
              className="w-full h-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
          );
          return (
            <div
              key={i}
              className="snap-center shrink-0 w-full aspect-video overflow-hidden bg-surface"
            >
              {b.link ? (
                <a href={b.link} target="_blank" rel="noreferrer noopener" className="block w-full h-full">
                  {Img}
                </a>
              ) : (
                Img
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            aria-label="Previous banner"
            onClick={() => setIndex((i) => (i - 1 + count) % count)}
            className="grid place-items-center absolute top-1/2 left-2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/75 text-white border border-white/10 backdrop-blur transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            aria-label="Next banner"
            onClick={() => setIndex((i) => (i + 1) % count)}
            className="grid place-items-center absolute top-1/2 right-2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/55 hover:bg-black/75 text-white border border-white/10 backdrop-blur transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {valid.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to banner ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
