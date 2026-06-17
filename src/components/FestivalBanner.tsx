import { Sparkles } from "lucide-react";

export default function FestivalBanner({ title, subtitle }: { title: string; subtitle?: string }) {
  if (!title) return null;
  return (
    <div className="relative mx-auto max-w-3xl my-4 animate-fade-up">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 px-5 py-4 sm:px-6 sm:py-5 text-center shadow-xl shadow-black/30 bg-gradient-to-r from-accent/25 via-amber-400/15 to-accent/25">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-accent/30 blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-amber-400/30 blur-3xl animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-white/80 mb-1.5">
          <Sparkles className="w-3 h-3" />
          Special
          <Sparkles className="w-3 h-3" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm sm:text-base text-white/80">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
