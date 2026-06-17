import { useSettings } from "@/contexts/BrandingContext";
import { Wrench } from "lucide-react";

export default function MaintenanceScreen() {
  const { settings } = useSettings();
  const bg = settings.maintenanceBackground;

  return (
    <main
      className="min-h-screen w-full relative overflow-hidden flex items-center justify-center px-6"
      style={{
        backgroundImage: bg
          ? `linear-gradient(135deg, rgba(5,5,8,0.85), rgba(5,5,8,0.92)), url(${bg})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {!bg && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-blue-500/10 blur-3xl" />
        </div>
      )}

      <div className="max-w-2xl text-center animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur text-xs uppercase tracking-[0.25em] text-white/70 mb-6">
          <Wrench className="w-3.5 h-3.5" />
          Maintenance
        </div>
        <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.05]">
          {settings.maintenanceTitle}
        </h1>
        <p className="mt-5 text-base sm:text-xl text-white/70 max-w-xl mx-auto">
          {settings.maintenanceTagline}
        </p>

        <div className="mt-10 inline-flex items-center gap-2.5 px-4 h-11 rounded-full bg-white/5 border border-white/10 text-white/80 text-sm">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-accent opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          {settings.branding.siteName} · We'll be live again soon
        </div>
      </div>
    </main>
  );
}
