import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Maximize,
  PictureInPicture2,
  Share2,
  Settings,
  Sun,
  Moon,
  Check,
  Copy,
} from "lucide-react";
import LiveChat from "@/components/LiveChat";
import ViewerCount from "@/components/ViewerCount";
import { useBranding } from "@/contexts/BrandingContext";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSV-m1nWQTWSA1zmowQ7NdwSCARkx3shVL3k_NX9p7UQn-goRSlPpBky6Ej2LlvoGCeH8KfeftEz-eX/pub?output=csv";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OFFICIA PLAY — Live Sports Streaming" },
      { name: "description", content: "Watch live sports in stunning quality on OFFICIA PLAY. One player. Zero distractions." },
      { property: "og:title", content: "OFFICIA PLAY — Live Sports Streaming" },
      { property: "og:description", content: "Watch live sports in stunning quality on OFFICIA PLAY." },
    ],
  }),
  component: Index,
});

type StreamData = {
  title: string;
  url: string;
  bannerUrl?: string;
  bannerLink?: string;
};

type QualityLevel = { id: number; label: string };

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

function findCol(header: string[], keys: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i];
    if (keys.some((k) => h.includes(k))) return i;
  }
  return -1;
}

function Index() {
  const { branding } = useBranding();
  const [data, setData] = useState<StreamData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [playerLoading, setPlayerLoading] = useState(true);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQuality, setShowQuality] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerWrapRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Theme init
  useEffect(() => {
    const saved = (localStorage.getItem("op-theme") as "dark" | "light" | null) || "dark";
    setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("op-theme", theme);
  }, [theme]);

  // Fetch sheet
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
        const titleIdx = findCol(header, ["title", "match"]);
        const urlIdx = findCol(header, ["streamurl", "stream", "url", "link"]);
        const bannerIdx = findCol(header, ["banner", "image"]);
        const bannerLinkIdx = findCol(header, ["bannerlink", "bannerurl", "ad"]);
        const title = (titleIdx >= 0 ? first[titleIdx] : first[0] || "").trim();
        const url = (urlIdx >= 0 ? first[urlIdx] : first[1] || "").trim();
        const bannerUrl = bannerIdx >= 0 ? (first[bannerIdx] || "").trim() : "";
        const bannerLink = bannerLinkIdx >= 0 ? (first[bannerLinkIdx] || "").trim() : "";
        if (!url) { setData({ title: title || "Live Stream", url: "", bannerUrl, bannerLink }); setStatus("offline"); return; }
        setData({ title: title || "Live Stream", url, bannerUrl, bannerLink });
        setStatus("ready");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, []);

  const kind = useMemo(() => detectKind(data?.url || ""), [data]);

  // Init video / HLS
  useEffect(() => {
    if (status !== "ready" || !data?.url) return;
    if (kind !== "hls" && kind !== "mp4") return;
    const video = videoRef.current;
    if (!video) return;
    setPlayerLoading(true);
    setQualities([]);
    setCurrentQuality(-1);

    const onReady = () => setPlayerLoading(false);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);

    if (kind === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true });
        hlsRef.current = hls;
        hls.loadSource(data.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels: QualityLevel[] = hls.levels.map((l, i) => ({
            id: i,
            label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}k`,
          }));
          setQualities(levels);
          setCurrentQuality(-1);
          video.play().catch(() => {});
        });
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
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [status, data, kind]);

  const setQuality = (id: number) => {
    setCurrentQuality(id);
    if (hlsRef.current) hlsRef.current.currentLevel = id;
    setShowQuality(false);
  };

  const handlePiP = async () => {
    const v = videoRef.current as any;
    try {
      if (document.pictureInPictureElement) await (document as any).exitPictureInPicture();
      else if (v?.requestPictureInPicture) await v.requestPictureInPicture();
    } catch {}
  };

  const handleFullscreen = async () => {
    const el = playerWrapRef.current as any;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (videoRef.current && (videoRef.current as any).webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } catch {}
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: data?.title || "OFFICIA PLAY", url: shareUrl });
        return;
      } catch {}
    }
    setShowShare((s) => !s);
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const isVideo = kind === "hls" || kind === "mp4";

  return (
    <main className="min-h-screen flex flex-col">
      <header className="w-full px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 animate-fade-up">
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt={branding.siteName} className="h-8 w-8 rounded-xl object-cover bg-surface" />
          ) : (
            <div className="h-8 w-8 rounded-xl bg-accent grid place-items-center shadow-lg shadow-accent/30">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M8 5v14l11-7z"/></svg>
            </div>
          )}
          <span className="font-display font-semibold tracking-tight text-lg">{branding.siteName}</span>
        </div>
        <div className="flex items-center gap-4 animate-fade-up">
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="live-dot" />
            <span className="uppercase tracking-[0.18em]">Live Now</span>
          </div>
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

      <section className="flex-1 flex items-start justify-center px-4 sm:px-6 md:px-10 pb-10">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center mb-5 animate-fade-up">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-muted-foreground">Now Streaming</p>
          </div>

          {/* Banner — between Now Streaming and Title, 16:9 */}
          {data?.bannerUrl && (
            <div className="mb-5 sm:mb-6 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "80ms" }}>
              {data.bannerLink ? (
                <a href={data.bannerLink} target="_blank" rel="noreferrer noopener" className="block">
                  <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-xl shadow-black/40">
                    <img src={data.bannerUrl} alt="Sponsor banner" className="w-full h-full object-cover" />
                  </div>
                </a>
              ) : (
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-xl shadow-black/40">
                  <img src={data.bannerUrl} alt="Sponsor banner" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          <div className="text-center mb-6 sm:mb-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {status === "loading" ? (
                <span className="inline-block h-10 sm:h-14 w-72 max-w-full rounded-lg bg-surface animate-pulse" />
              ) : (
                data?.title || branding.siteName
              )}
            </h1>
          </div>

          <div className="grid gap-4 lg:gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] items-stretch">
            <div
              ref={playerWrapRef}
              className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-border shadow-2xl shadow-black/60 animate-fade-up group"
              style={{ animationDelay: "160ms" }}
            >
              {status === "loading" && <LoadingOverlay label="Connecting to stream" />}
              {status === "error" && <Message title="Connection error" body="Couldn't reach the stream source. Please refresh." />}
              {status === "offline" && <Message title="Stream Soon." body="The match hasn't started yet. Check back soon." />}

              {status === "ready" && data?.url && (
                <>
                  {isVideo && (
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

              {/* Custom action bar — overlays player */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-2 opacity-90 hover:opacity-100 transition">
                {isVideo && qualities.length > 0 && (
                  <div className="relative">
                    <ActionBtn label="Quality" onClick={() => { setShowQuality((s) => !s); setShowShare(false); }}>
                      <Settings className="w-4 h-4" />
                    </ActionBtn>
                    {showQuality && (
                      <div className="absolute right-0 mt-2 min-w-[140px] rounded-xl bg-black/85 backdrop-blur border border-white/10 p-1 text-sm shadow-xl">
                        <QualityItem active={currentQuality === -1} label="Auto" onClick={() => setQuality(-1)} />
                        {qualities.map((q) => (
                          <QualityItem key={q.id} active={currentQuality === q.id} label={q.label} onClick={() => setQuality(q.id)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {isVideo && (
                  <ActionBtn label="Picture-in-picture" onClick={handlePiP}>
                    <PictureInPicture2 className="w-4 h-4" />
                  </ActionBtn>
                )}
                <div className="relative">
                  <ActionBtn label="Share" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                  </ActionBtn>
                  {showShare && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl bg-black/85 backdrop-blur border border-white/10 p-3 text-sm shadow-xl text-white">
                      <p className="text-xs text-white/60 mb-2">Share this stream</p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={shareUrl}
                          className="flex-1 bg-white/5 border border-white/10 rounded-md px-2 py-1.5 text-xs outline-none"
                        />
                        <button
                          onClick={copyLink}
                          className="h-8 w-8 grid place-items-center rounded-md bg-white/10 hover:bg-white/20"
                          aria-label="Copy link"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <ActionBtn label="Fullscreen" onClick={handleFullscreen}>
                  <Maximize className="w-4 h-4" />
                </ActionBtn>
              </div>
            </div>

            {/* Live chat — same height as player on desktop, full width on mobile */}
            <div className="h-[480px] lg:h-auto animate-fade-up" style={{ animationDelay: "200ms" }}>
              <LiveChat />
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
            Premium quality • Low latency • Watch anywhere
          </p>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-5 text-center text-xs text-muted-foreground/70">
        © {new Date().getFullYear()} {branding.siteName}
      </footer>
    </main>
  );
}

function ActionBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-9 w-9 grid place-items-center rounded-full bg-black/55 hover:bg-black/75 backdrop-blur text-white border border-white/10 transition-colors"
    >
      {children}
    </button>
  );
}

function QualityItem({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-lg flex items-center justify-between gap-3 text-white hover:bg-white/10 ${active ? "bg-white/10" : ""}`}
    >
      <span>{label}</span>
      {active && <Check className="w-3.5 h-3.5" />}
    </button>
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
        <p className="text-sm text-white/70 tracking-wide">{label}…</p>
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
