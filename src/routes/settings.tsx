import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Gauge, Palette, Activity, Wifi, Bell, Monitor, Check } from "lucide-react";
import { useUserPrefs, type PlaybackMode, type ThemeMode, type DataMode, type ViewingPreset } from "@/contexts/UserPrefsContext";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — FANCAST" },
      { name: "description", content: "Personalize playback, appearance, match experience, data, notifications and viewing preset." },
    ],
  }),
  component: SettingsPage,
});

function Section({
  icon: Icon, title, subtitle, children, delay = 0,
}: { icon: any; title: string; subtitle: string; children: React.ReactNode; delay?: number }) {
  return (
    <section
      className="rounded-3xl bg-surface/70 backdrop-blur border border-border p-5 sm:p-6 shadow-xl shadow-black/20 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <header className="flex items-start gap-3 mb-4">
        <div className="h-10 w-10 shrink-0 grid place-items-center rounded-xl bg-accent/15 text-accent">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-lg sm:text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function OptionRow<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string; desc?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`text-left rounded-2xl border p-3 transition-all ${
              active
                ? "border-accent bg-accent/10 ring-1 ring-accent/40"
                : "border-border bg-background/40 hover:bg-muted/50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm">{o.label}</span>
              {active && <Check className="w-4 h-4 text-accent" />}
            </div>
            {o.desc && <p className="text-[11px] text-muted-foreground mt-1">{o.desc}</p>}
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 cursor-pointer">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {desc && <p className="text-[11px] text-muted-foreground">{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        role="switch"
        aria-checked={checked}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-accent" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </label>
  );
}

function SettingsPage() {
  const { prefs, setPrefs, reset } = useUserPrefs();

  return (
    <main className="min-h-screen px-4 sm:px-6 md:px-10 py-6 sm:py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6 sm:mb-8 animate-fade-up">
          <Link
            to="/"
            className="inline-flex items-center gap-2 h-9 px-3 rounded-full bg-surface border border-border hover:bg-muted text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <button
            onClick={reset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Reset all
          </button>
        </div>

        <header className="mb-6 sm:mb-8 animate-fade-up">
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Personalize how you watch. Preferences are saved on this device.</p>
        </header>

        <div className="space-y-4 sm:space-y-5">
          <Section icon={Activity} title="Playback Mode" subtitle="Trade latency for stability." delay={40}>
            <OptionRow<PlaybackMode>
              value={prefs.playbackMode}
              onChange={(v) => setPrefs((p) => ({ ...p, playbackMode: v }))}
              options={[
                { id: "ultra-low", label: "Ultra Low Latency", desc: "Closest to live, may stutter." },
                { id: "balanced", label: "Balanced", desc: "Recommended for most networks." },
                { id: "buffer-protection", label: "Buffer Protection", desc: "Bigger buffer, fewer hiccups." },
              ]}
            />
          </Section>

          <Section icon={Palette} title="Appearance" subtitle="Theme preference." delay={80}>
            <OptionRow<ThemeMode>
              value={prefs.theme}
              onChange={(v) => setPrefs((p) => ({ ...p, theme: v }))}
              options={[
                { id: "dark", label: "Dark" },
                { id: "light", label: "Light" },
                { id: "auto", label: "Auto", desc: "Follows your system." },
              ]}
            />
          </Section>

          <Section icon={Monitor} title="Match Experience" subtitle="Toggle in-match modules." delay={120}>
            <Toggle label="Live Stats" desc="Score, runs, possession panel."
              checked={prefs.matchExperience.liveStats}
              onChange={(v) => setPrefs((p) => ({ ...p, matchExperience: { ...p.matchExperience, liveStats: v } }))} />
            <Toggle label="Timeline" desc="Key moments and highlights."
              checked={prefs.matchExperience.timeline}
              onChange={(v) => setPrefs((p) => ({ ...p, matchExperience: { ...p.matchExperience, timeline: v } }))} />
            <Toggle label="Fan Reactions" desc="Live emoji floods from fellow fans."
              checked={prefs.matchExperience.fanReactions}
              onChange={(v) => setPrefs((p) => ({ ...p, matchExperience: { ...p.matchExperience, fanReactions: v } }))} />
          </Section>

          <Section icon={Wifi} title="Data & Performance" subtitle="Quality and bandwidth controls." delay={160}>
            <OptionRow<DataMode>
              value={prefs.dataMode}
              onChange={(v) => setPrefs((p) => ({ ...p, dataMode: v }))}
              options={[
                { id: "max", label: "Maximum Quality", desc: "Pin to top resolution." },
                { id: "balanced", label: "Balanced", desc: "Auto adapt to network." },
                { id: "saver", label: "Data Saver", desc: "Cap at lowest resolution." },
              ]}
            />
            <div className="rounded-xl border border-border bg-background/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-accent" />
                  <p className="text-sm font-medium">Bandwidth Guard</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {prefs.bandwidthLimitMB === 0 ? "Unlimited" : `${prefs.bandwidthLimitMB} MB/hr`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={3000}
                step={100}
                value={prefs.bandwidthLimitMB}
                onChange={(e) => setPrefs((p) => ({ ...p, bandwidthLimitMB: Number(e.target.value) }))}
                className="w-full accent-[var(--color-accent)]"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Players auto-pause when your hourly cap is reached. Set to 0 to disable.
              </p>
            </div>
          </Section>

          <Section icon={Bell} title="Notifications" subtitle="Get alerted to what matters." delay={200}>
            <Toggle label="Match Start"
              checked={prefs.notifications.matchStart}
              onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, matchStart: v } }))} />
            <Toggle label="Goal / Wicket"
              checked={prefs.notifications.goalWicket}
              onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, goalWicket: v } }))} />
            <Toggle label="Favorite Team Alerts"
              checked={prefs.notifications.favoriteTeam}
              onChange={(v) => setPrefs((p) => ({ ...p, notifications: { ...p.notifications, favoriteTeam: v } }))} />
          </Section>

          <Section icon={Monitor} title="Viewing Preset" subtitle="Layout tuned for your style." delay={240}>
            <OptionRow<ViewingPreset>
              value={prefs.viewingPreset}
              onChange={(v) => setPrefs((p) => ({ ...p, viewingPreset: v }))}
              options={[
                { id: "cinema", label: "Cinema Mode", desc: "Minimal UI, big player." },
                { id: "fan", label: "Fan Mode", desc: "Players + reactions." },
                { id: "analyst", label: "Analyst Mode", desc: "Stats + timeline focus." },
              ]}
            />
          </Section>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-8">
          Changes save automatically and persist between visits.
        </p>
      </div>
    </main>
  );
}
