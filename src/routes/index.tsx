import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sun, Moon, Send, Instagram } from "lucide-react";
import StreamPlayer from "@/components/StreamPlayer";
import BannerCarousel, { type BannerItem } from "@/components/BannerCarousel";
import ViewerCount from "@/components/ViewerCount";
import { useBranding } from "@/contexts/BrandingContext";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSV-m1nWQTWSA1zmowQ7NdwSCARkx3shVL3k_NX9p7UQn-goRSlPpBky6Ej2LlvoGCeH8KfeftEz-eX/pub?output=csv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FANCAST — Live Sports, Two Streams Side-by-Side" },
      { name: "description", content: "Watch two live sports streams at once on FANCAST. Multi-format support, low-latency, distraction-free." },
      { property: "og:title", content: "FANCAST — Live Sports" },
      { property: "og:description", content: "Watch two live sports streams at once on FANCAST." },
    ],
  }),
  component: Index,
});

type StreamItem = { title: string; url: string };
type SheetData = {
  streams: StreamItem[];
  banners: BannerItem[];
  telegram?: string;
  instagram?: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else { inQuotes = false; }
      } else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); cell = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
      } else cell += ch;
    }
  }
  if (cell || row.length) { row.push(cell); if (row.some((c) => c.trim() !== "")) rows.push(row); }
  return rows;
}

function colIndex(header: string[], match: (h: string) => boolean): number {
  return header.findIndex(match);
}

function Index() {
  const { branding } = useBranding();
  const [data, setData] = useState<SheetData>({ streams: [], banners: [] });
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = (localStorage.getItem("op-theme") as "dark" | "light" | null) || "dark";
    setTheme(saved);
  }, []);
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("op-theme", theme);
  }, [theme, mounted]);

  useEffect(() => {
    let cancelled = false;
    fetch(`${SHEET_CSV_URL}&_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const rows = parseCsv(text);
        if (rows.length < 2) return;
        const header = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
        const first = rows[1];
        const get = (idx: number) => (idx >= 0 ? (first[idx] || "").trim() : "");

        // Streams: Title1/Stream1, Title2/Stream2 (also accept Title/StreamURL as #1)
        const streams: StreamItem[] = [];
        for (let i = 1; i <= 4; i++) {
          const tIdx = colIndex(header, (h) => h === `title${i}` || (i === 1 && (h === "title" || h === "match")));
          const uIdx = colIndex(header, (h) => h === `stream${i}` || h === `streamurl${i}` || h === `url${i}` || (i === 1 && (h === "streamurl" || h === "stream" || h === "url" || h === "link")));
          const t = get(tIdx);
          const u = get(uIdx);
          if (u || t) streams.push({ title: t || `Stream ${i}`, url: u });
        }
        // Ensure at least 2 player slots
        while (streams.length < 2) streams.push({ title: `Stream ${streams.length + 1}`, url: "" });

        // Banners: Banner1..BannerN + matching BannerLink1..N. Also accept legacy "banner"/"bannerlink".
        const banners: BannerItem[] = [];
        const legacyB = colIndex(header, (h) => h === "banner" || h === "image");
        const legacyL = colIndex(header, (h) => h === "bannerlink" || h === "bannerurl" || h === "ad");
        if (legacyB >= 0 && get(legacyB)) banners.push({ url: get(legacyB), link: get(legacyL) });
        for (let i = 1; i <= 10; i++) {
          const bIdx = colIndex(header, (h) => h === `banner${i}` || h === `image${i}`);
          const lIdx = colIndex(header, (h) => h === `bannerlink${i}` || h === `bannerurl${i}`);
          const url = get(bIdx);
          if (url) banners.push({ url, link: get(lIdx) });
        }

        const tgIdx = colIndex(header, (h) => h === "telegram" || h === "telegramurl" || h === "telegramlink");
        const igIdx = colIndex(header, (h) => h === "instagram" || h === "instagramurl" || h === "instagramlink");

        setData({
          streams,
          banners,
          telegram: get(tgIdx) || undefined,
          instagram: get(igIdx) || undefined,
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="w-full px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 animate-fade-up">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.siteName}
              className="h-8 w-8 rounded-xl object-cover bg-surface"
            />
          ) : (
            <div className="h-8 w-8 rounded-xl bg-accent grid place-items-center shadow-lg shadow-accent/30">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M8 5v14l11-7z"/></svg>
            </div>
          )}
          <span className="font-display font-semibold tracking-tight text-lg">{branding.siteName}</span>
        </div>
        <div className="flex items-center gap-3 animate-fade-up">
          <ViewerCount />
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
            className="h-9 w-9 grid place-items-center rounded-full bg-surface border border-border hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <section className="flex-1 px-4 sm:px-6 md:px-10 pb-12">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center mb-5 animate-fade-up">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground">Now Streaming</p>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mt-2">
              {branding.siteName}
            </h1>
          </div>

          {/* Scrollable banner carousel */}
          {data.banners.length > 0 && (
            <div className="mb-6 sm:mb-8 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "80ms" }}>
              <BannerCarousel items={data.banners} />
            </div>
          )}

          {/* Two players, each with its own title section */}
          <div className="grid gap-6 lg:gap-7 lg:grid-cols-2 items-start">
            {data.streams.slice(0, 2).map((s, i) => (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${160 + i * 80}ms` }}>
                <StreamPlayer title={s.title} url={s.url} index={i} />
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-up" style={{ animationDelay: "320ms" }}>
            Premium quality • Low latency • All formats: HLS · DASH · FLV · MP4 · WebM · YouTube · Twitch
          </p>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} {branding.siteName} — All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {data.telegram && (
              <a
                href={data.telegram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Telegram"
                className="h-10 w-10 grid place-items-center rounded-full bg-surface border border-border hover:bg-muted hover:text-accent transition-colors"
              >
                <Send className="w-4 h-4" />
              </a>
            )}
            {data.instagram && (
              <a
                href={data.instagram}
                target="_blank"
                rel="noreferrer noopener"
                aria-label="Instagram"
                className="h-10 w-10 grid place-items-center rounded-full bg-surface border border-border hover:bg-muted hover:text-accent transition-colors"
              >
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {!data.telegram && !data.instagram && (
              <span className="text-[11px] text-muted-foreground/60">
                Add Telegram &amp; Instagram columns to the sheet to show social links.
              </span>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
