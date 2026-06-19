import { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import * as dashjs from "dashjs";
import flvjs from "flv.js";
import {
  Maximize,
  PictureInPicture2,
  Share2,
  Settings,
  Check,
  Copy,
  Volume2,
  VolumeX,
  RotateCw,
  AlertTriangle,
  Shield,
} from "lucide-react";
import { HealthBadge, useStreamHealth } from "@/components/StreamHealth";
import { useUserPrefs } from "@/contexts/UserPrefsContext";

type QualityLevel = { id: number; label: string };

export type StreamKind = "hls" | "dash" | "flv" | "mp4" | "webm" | "youtube" | "twitch" | "iframe" | "empty";

export function detectKind(url: string): StreamKind {
  if (!url) return "empty";
  const u = url.toLowerCase();
  if (u.includes(".m3u8")) return "hls";
  if (u.includes(".mpd")) return "dash";
  if (u.includes(".flv")) return "flv";
  if (u.endsWith(".mp4") || u.includes(".mp4?")) return "mp4";
  if (u.endsWith(".webm") || u.includes(".webm?")) return "webm";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("twitch.tv")) return "twitch";
  return "iframe";
}

function isValidUrl(u: string) {
  try { new URL(u); return true; } catch { return false; }
}

function toYouTubeEmbed(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0`;
    }
    if (u.pathname.startsWith("/embed/")) {
      const sep = url.includes("?") ? "&" : "?";
      return `${url}${sep}autoplay=1&mute=1&rel=0`;
    }
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0`;
  } catch {}
  return url;
}

function toTwitchEmbed(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    const channel = parts[0];
    const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `https://player.twitch.tv/?channel=${channel}&parent=${parent}&muted=true&autoplay=true`;
  } catch {}
  return url;
}

export default function StreamPlayer({
  title,
  url,
  fallback,
  index,
  videoRef: externalVideoRef,
}: {
  title: string;
  url: string;
  fallback?: string;
  index: number;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
}) {
  const { prefs } = useUserPrefs();
  const [activeUrl, setActiveUrl] = useState(url);
  const [usingFallback, setUsingFallback] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setActiveUrl(url);
    setUsingFallback(false);
    setErrored(false);
  }, [url]);

  const kind = useMemo(() => detectKind(activeUrl), [activeUrl]);
  const isVideo = kind === "hls" || kind === "dash" || kind === "flv" || kind === "mp4" || kind === "webm";
  const invalid = !!activeUrl && !isValidUrl(activeUrl);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const setVideoRef = (el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (externalVideoRef) externalVideoRef.current = el;
  };
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const flvRef = useRef<flvjs.Player | null>(null);

  const [loading, setLoading] = useState(true);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState<number>(-1);
  const [showQuality, setShowQuality] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(true);

  const { health, buffer, bitrateKbps } = useStreamHealth(localVideoRef, isVideo && !!activeUrl && !invalid);

  const handleStreamError = () => {
    if (!usingFallback && fallback) {
      setUsingFallback(true);
      setActiveUrl(fallback);
      setErrored(false);
    } else {
      setErrored(true);
      setLoading(false);
    }
  };

  const retry = () => {
    setErrored(false);
    setLoading(true);
    setUsingFallback(false);
    setActiveUrl(url);
    setRetryKey((k) => k + 1);
  };

  // Apply data-mode + playback-mode tuning when (re)building player
  useEffect(() => {
    if (!isVideo || !activeUrl || invalid) return;
    const video = localVideoRef.current;
    if (!video) return;
    setLoading(true);
    setQualities([]);
    setCurrentQuality(-1);

    const onReady = () => setLoading(false);
    const onErr = () => handleStreamError();
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    video.addEventListener("error", onErr);

    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
      video.removeEventListener("error", onErr);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (dashRef.current) { try { dashRef.current.reset(); } catch {} dashRef.current = null; }
      if (flvRef.current) { try { flvRef.current.destroy(); } catch {} flvRef.current = null; }
    };

    const ultra = prefs.playbackMode === "ultra-low";
    const buffer = prefs.playbackMode === "buffer-protection";

    if (kind === "hls") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: ultra,
          maxBufferLength: ultra ? 6 : buffer ? 60 : 30,
          maxMaxBufferLength: ultra ? 10 : buffer ? 120 : 60,
          backBufferLength: buffer ? 30 : 10,
        });
        hlsRef.current = hls;
        hls.loadSource(activeUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const levels: QualityLevel[] = hls.levels.map((l, i) => ({
            id: i,
            label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}k`,
          }));
          setQualities(levels);
          // Apply data-saver cap
          if (prefs.dataMode === "saver" && levels.length) {
            const low = levels.findIndex((l) => /\d+p/.test(l.label) && parseInt(l.label) <= 360);
            hls.currentLevel = low >= 0 ? low : 0;
            setCurrentQuality(hls.currentLevel);
          } else if (prefs.dataMode === "max") {
            const top = levels.length - 1;
            hls.currentLevel = top;
            setCurrentQuality(top);
          } else {
            setCurrentQuality(-1);
          }
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) handleStreamError();
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = activeUrl;
        video.play().catch(() => {});
      }
    } else if (kind === "dash") {
      try {
        const player = dashjs.MediaPlayer().create();
        dashRef.current = player;
        player.initialize(video, activeUrl, true);
        player.on("error", () => handleStreamError());
      } catch { handleStreamError(); }
    } else if (kind === "flv") {
      if (flvjs.isSupported()) {
        try {
          const player = flvjs.createPlayer({ type: "flv", url: activeUrl, isLive: true });
          flvRef.current = player;
          player.attachMediaElement(video);
          player.load();
          Promise.resolve(player.play()).catch(() => {});
          player.on(flvjs.Events.ERROR, () => handleStreamError());
        } catch { handleStreamError(); }
      } else handleStreamError();
    } else {
      video.src = activeUrl;
      video.play().catch(() => {});
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUrl, kind, isVideo, invalid, retryKey, prefs.playbackMode, prefs.dataMode]);

  const setQuality = (id: number) => {
    setCurrentQuality(id);
    if (hlsRef.current) hlsRef.current.currentLevel = id;
    setShowQuality(false);
  };

  const handlePiP = async () => {
    const v = localVideoRef.current as any;
    try {
      if (document.pictureInPictureElement) await (document as any).exitPictureInPicture();
      else if (v?.requestPictureInPicture) await v.requestPictureInPicture();
    } catch {}
  };

  const handleFullscreen = async () => {
    const el = wrapRef.current as any;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (el?.requestFullscreen) await el.requestFullscreen();
      else if (el?.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else if (localVideoRef.current && (localVideoRef.current as any).webkitEnterFullscreen) {
        (localVideoRef.current as any).webkitEnterFullscreen();
      }
    } catch {}
  };

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const handleShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title, url: shareUrl }); return; } catch {}
    }
    setShowShare((s) => !s);
  };
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (localVideoRef.current) localVideoRef.current.muted = next;
  };

  return (
    <div className="flex flex-col">
      <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Player {index + 1}{usingFallback && " · Fallback"}
          </p>
          <h2 className="font-display text-base sm:text-2xl md:text-3xl font-semibold tracking-tight truncate">
            {title || `Stream ${index + 1}`}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {prefs.playbackMode === "buffer-protection" && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 h-7 rounded-full bg-surface border border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <Shield className="w-3 h-3" /> Buffer Mode
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-surface border border-border text-[10px] uppercase tracking-wider text-muted-foreground">
            <span className="live-dot" />
            Live
          </span>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative w-full aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-black border border-border shadow-2xl shadow-black/60 group"
      >
        {!activeUrl && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                Offline
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-semibold mb-2">Stream Soon.</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                The match hasn't started yet. Check back soon.
              </p>
            </div>
          </div>
        )}

        {activeUrl && invalid && (
          <div className="absolute inset-0 grid place-items-center px-6 text-center bg-black/70">
            <div className="text-white">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <h3 className="font-display text-lg sm:text-xl font-semibold mb-1">Invalid stream URL</h3>
              <p className="text-xs text-white/60">Check the spreadsheet for this stream.</p>
            </div>
          </div>
        )}

        {isVideo && activeUrl && !invalid && (
          <>
            <video
              key={retryKey}
              ref={setVideoRef}
              className="w-full h-full object-contain bg-black"
              controls
              playsInline
              autoPlay
              muted
            />
            {!loading && !errored && <HealthBadge health={health} buffer={buffer} bitrateKbps={bitrateKbps} />}
            {loading && !errored && (
              <div className="absolute inset-0 grid place-items-center bg-black/70 backdrop-blur-sm z-10 pointer-events-none">
                <div className="flex flex-col items-center gap-3 text-white/80">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin-slow" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.25em]">Loading stream…</p>
                </div>
              </div>
            )}
            {errored && (
              <div className="absolute inset-0 grid place-items-center bg-black/80 z-20 px-6 text-center">
                <div className="text-white">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  <h3 className="font-display text-lg sm:text-xl font-semibold mb-1">Stream unavailable</h3>
                  <p className="text-xs text-white/60 mb-4">We couldn't reach this source.</p>
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 text-sm"
                  >
                    <RotateCw className="w-4 h-4" /> Retry
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {kind === "youtube" && !invalid && (
          <iframe
            key={retryKey}
            src={toYouTubeEmbed(activeUrl)}
            title={title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
        {kind === "twitch" && !invalid && (
          <iframe
            key={retryKey}
            src={toTwitchEmbed(activeUrl)}
            title={title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}
        {kind === "iframe" && activeUrl && !invalid && (
          <iframe
            key={retryKey}
            src={activeUrl}
            title={title}
            className="w-full h-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
          />
        )}

        {activeUrl && !invalid && (
          <div className="absolute top-3 right-3 z-40 flex items-center gap-1.5 sm:gap-2 opacity-90 hover:opacity-100 transition">
            {isVideo && (
              <ActionBtn label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </ActionBtn>
            )}
            {isVideo && qualities.length > 0 && (
              <div className="relative">
                <ActionBtn label="Quality" onClick={() => { setShowQuality((s) => !s); setShowShare(false); }}>
                  <Settings className="w-4 h-4" />
                </ActionBtn>
                {showQuality && (
                  <div className="absolute right-0 mt-2 min-w-[140px] rounded-xl bg-black/85 backdrop-blur border border-white/10 p-1 text-sm shadow-xl z-50">
                    <QualityItem active={currentQuality === -1} label="Auto" onClick={() => setQuality(-1)} />
                    {qualities.map((q) => (
                      <QualityItem key={q.id} active={currentQuality === q.id} label={q.label} onClick={() => setQuality(q.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}
            <ActionBtn label="Retry" onClick={retry}>
              <RotateCw className="w-4 h-4" />
            </ActionBtn>
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
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-black/85 backdrop-blur border border-white/10 p-3 text-sm shadow-xl text-white z-50">
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
        )}
      </div>
    </div>
  );
}

function ActionBtn({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 sm:h-9 sm:w-9 grid place-items-center rounded-full bg-black/55 hover:bg-black/75 backdrop-blur text-white border border-white/10 transition-colors"
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
