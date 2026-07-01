import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { Send, Instagram, Settings as SettingsIcon } from "lucide-react";
import StreamPlayer from "@/components/StreamPlayer";
import BannerCarousel from "@/components/BannerCarousel";
import ViewerCount from "@/components/ViewerCount";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import InviteFriends from "@/components/InviteFriends";
import AutoRefresh from "@/components/AutoRefresh";
import DonationCard from "@/components/DonationCard";
import { BandwidthBadge, useBandwidthGuard } from "@/components/BandwidthGuard";
import { useSettings } from "@/contexts/BrandingContext";
import { useUserPrefs } from "@/contexts/UserPrefsContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FANCAST — Live Sports, Premium Streaming" },
      { name: "description", content: "Watch live sports on FANCAST. Multi-format streams, low-latency, dual players, distraction-free." },
      { property: "og:title", content: "FANCAST — Live Sports" },
      { property: "og:description", content: "Watch live sports on FANCAST." },
    ],
  }),
  component: Index,
});

function Index() {
  const { settings, loading } = useSettings();
  const { prefs } = useUserPrefs();

  const videoRef1 = useRef<HTMLVideoElement | null>(null);
  const videoRef2 = useRef<HTMLVideoElement | null>(null);
  const { usedMB, blocked, resetBlock } = useBandwidthGuard([videoRef1, videoRef2], prefs.bandwidthLimitMB);

  if (settings.maintenanceMode) {
    return <MaintenanceScreen />;
  }

  const { branding, streams, banners } = settings;
  const refs = [videoRef1, videoRef2];

  return (
    <main className="min-h-screen flex flex-col">
      <AutoRefresh />

      <header className="w-full px-4 sm:px-6 md:px-10 py-4 flex items-center justify-end gap-2 sm:gap-3 animate-fade-up">
        <BandwidthBadge usedMB={usedMB} limitMB={prefs.bandwidthLimitMB} />
        <ViewerCount />
        <Link
          to="/settings"
          aria-label="Settings"
          className="h-9 w-9 grid place-items-center rounded-full bg-surface border border-border hover:bg-muted transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
        </Link>
      </header>

      <section className="flex-1 px-4 sm:px-6 md:px-10 pb-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center animate-fade-up">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-muted-foreground">Now Streaming</p>

            <div className="mt-4 flex flex-col items-center gap-3">
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={branding.siteName}
                  className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl object-cover bg-surface shadow-lg shadow-black/40 ring-1 ring-border"
                />
              ) : (
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-accent grid place-items-center shadow-lg shadow-accent/30">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M8 5v14l11-7z"/></svg>
                </div>
              )}
              <span className="font-display font-semibold tracking-tight text-base sm:text-lg text-muted-foreground">
                {branding.siteName}
              </span>
            </div>

            <h1 className="font-display text-3xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mt-6 bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              {settings.mainTitle}
            </h1>
            <p className="mt-3 text-sm sm:text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
              {settings.mainTagline}
            </p>
          </div>

          {banners.length > 0 ? (
            <div className="mt-8 sm:mt-10 max-w-5xl mx-auto animate-fade-up" style={{ animationDelay: "80ms" }}>
              <BannerCarousel items={banners} />
            </div>
          ) : loading ? (
            <div className="mt-8 sm:mt-10 max-w-5xl mx-auto">
              <div className="w-full aspect-video rounded-2xl bg-surface/60 border border-border animate-pulse" />
            </div>
          ) : null}

          {blocked && (
            <div className="mt-6 max-w-5xl mx-auto rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm flex items-center justify-between gap-3">
              <span>Bandwidth limit reached for this hour. Players have been paused.</span>
              <button onClick={resetBlock} className="h-8 px-3 rounded-md bg-white/10 hover:bg-white/20 text-xs">Resume anyway</button>
            </div>
          )}

          <div className="mt-8 sm:mt-10 flex flex-col gap-8 sm:gap-10 max-w-5xl mx-auto">
            {streams.slice(0, 2).map((s, i) => (
              <div key={i} className="animate-fade-up" style={{ animationDelay: `${140 + i * 80}ms` }}>
                <StreamPlayer
                  title={s.title}
                  url={s.url}
                  fallback={s.fallback}
                  type={s.type}
                  index={i}
                  videoRef={refs[i]}
                />
              </div>
            ))}
          </div>

          <DonationCard donations={settings.donations} />

          <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-up" style={{ animationDelay: "320ms" }}>
            Premium quality · Low latency · HLS · DASH · FLV · MP4 · WebM · YouTube · Twitch · Iframe
          </p>

          <div className="mt-10 sm:mt-12 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <InviteFriends siteName={branding.siteName} />
          </div>
        </div>
      </section>

      <footer className="px-6 md:px-10 py-8 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} {branding.siteName} — All rights reserved.
          </p>
          <div className="flex items-center gap-2">
            {settings.telegram && (
              <a href={settings.telegram} target="_blank" rel="noreferrer noopener" aria-label="Telegram"
                className="h-10 w-10 grid place-items-center rounded-full bg-surface border border-border hover:bg-muted hover:text-accent transition-colors">
                <Send className="w-4 h-4" />
              </a>
            )}
            {settings.instagram && (
              <a href={settings.instagram} target="_blank" rel="noreferrer noopener" aria-label="Instagram"
                className="h-10 w-10 grid place-items-center rounded-full bg-surface border border-border hover:bg-muted hover:text-accent transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
