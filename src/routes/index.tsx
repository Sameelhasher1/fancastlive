import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSV-m1nWQTWSA1zmowQ7NdwSCARkx3shVL3k_NX9p7UQn-goRSlPpBky6Ej2LlvoGCeH8KfeftEz-eX/pub?output=csv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SportStream — Live Sports Streaming" },
      {
        name: "description",
        content: "Watch live sports in stunning quality on SportStream. One player. Zero distractions.",
      },
      { property: "og:title", content: "SportStream — Live Sports Streaming" },
      {
        property: "og:description",
        content: "Watch live sports in stunning quality on SportStream.",
      },
    ],
  }),
  component: Index,
});

type StreamData = { title: string; url: string };

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

function detectKind(url: string): "hls" | "mp4" | "youtube" | "iframe" | "empty" {
  if (!url) return "empty";
  const u = url.toLowerCase();
  if (u.includes(".m3u8")) return "hls";
  if (u.endsWith(".mp4") || u.includes(".mp4?")) return "mp4";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  return "iframe";
}

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
    }
    if (u.pathname.startsWith("/embed/")) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}autoplay=1&rel=0`;
    }
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  } catch {}
  return url;
}

function Index() {
  const [data, setData] = useState<StreamData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [playerLoading, setPlayerLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    fetch(`${SHEET_CSV_URL}&_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const rows = parseCsv(text);
        if (rows.length < 2) { setStatus("offline"); return; }
        const header = rows[0].map((h) => h.trim().toLowerCase());
        const first = rows[1];
        const titleIdx = header.findIndex((h) => h.includes("title") || h.includes("match"));
        const urlIdx = header.findIndex((h) => h.includes("url") || h.includes("link") || h.includes("stream"));
        const title = (titleIdx >= 0 ? first[titleIdx] : first[0] || "").trim();
        const url = (urlIdx >= 0 ? first[urlIdx] : first[1] || "").trim();
        if (!url) { setData({ title: title || "Live Stream", url: "" }); setStatus("offline"); return; }
        setData({ title: title || "Live Stream", url });
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  const kind = useMemo(() => detectKind(data?.url || ""), [data]);

  useEffect(() => {
    if (status !== "ready" || !data?.url) return;
    if (kind !== "hls" && kind !== "mp4") return;
    const video = videoRef.current;
    if (!video) return;
    setPlayerLoading(true);
    let hls: Hls | null = null;
    const onReady = () => setPlayerLoading(false);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);

    if (kind === "hls") {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true });
        hls.loadSource(data.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = data.url;
        video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
      }
    } else {
      video.src = data.url;
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
      if (hls) hls.destroy();
    };
  }, [status, data, kind]);

  return (
    <main className="min-h-screen flex flex-col">
      <header className="w-full px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 animate-fade-up">
          <div className="h-8 w-8 rounded-xl bg-accent grid place-items-center shadow-lg shadow-accent/30">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span className="font-display font-semibold tracking-tight text-lg">
            Sport<span className="text-accent">Stream</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground animate-fade-up">
          <span className="live-dot" />
          <span className="uppercase tracking-[0.18em]">Live Now</span>
        </div>
      </header>

      <section className="flex-1 flex items-center justify-center px-4 sm:px-6 md:px-10 pb-10">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-6 sm:mb-8 animate-fade-up">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground mb-3">
              Now Streaming
            </p>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {status === "loading" ? (
                <span className="inline-block h-10 sm:h-14 w-72 max-w-full rounded-lg bg-surface animate-pulse" />
              ) : (
                data?.title || "SportStream"
              )}
            </h1>
          </div>

          <div
            className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-border shadow-2xl shadow-black/60 animate-fade-up"
            style={{ animationDelay: "120ms" }}
          >
            {status === "loading" && <LoadingOverlay label="Connecting to stream" />}
            {status === "error" && <Message title="Connection error" body="Couldn't reach the stream source. Please refresh." />}
            {status === "offline" && <Message title="Stream Offline" body="The broadcast hasn't started yet. Check back soon." />}

            {status === "ready" && data?.url && (
              <>
                {(kind === "hls" || kind === "mp4") && (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-contain bg-black"
                      controls
                      playsInline
                      autoPlay
                      muted
                    />
                    {playerLoading && <LoadingOverlay label="Loading stream" />}
                  </>
                )}
                {kind === "youtube" && (
                  <iframe
                    src={toYouTubeEmbed(data.url)}
                    title={data.title}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
                {kind === "iframe" && (
                  <iframe
                    src={data.url}
                    title={data.title}
                    className="w-full h-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
              </>
            )}
          </div>

          <p
            className="text-center text-xs text-muted-foreground mt-6 animate-fade-up"
            style={{ animationDelay: "240ms" }}
          >
            Premium quality • Low latency • Watch anywhere
          </p>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-5 text-center text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} SportStream
      </footer>
    </main>
  );
}

function LoadingOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm z-10">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin-slow" />
        </div>
        <p className="text-sm text-muted-foreground tracking-wide">{label}…</p>
      </div>
    </div>
  );
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="absolute inset-0 grid place-items-center px-6 text-center">
      <div>
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
          Offline
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">{body}</p>
      </div>
    </div>
  );
}
