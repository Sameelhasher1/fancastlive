import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type PlaybackMode = "ultra-low" | "balanced" | "buffer-protection";
export type ThemeMode = "dark" | "light" | "auto";
export type DataMode = "max" | "balanced" | "saver";
export type ViewingPreset = "cinema" | "fan" | "analyst";

export type UserPrefs = {
  playbackMode: PlaybackMode;
  theme: ThemeMode;
  matchExperience: { liveStats: boolean; timeline: boolean; fanReactions: boolean };
  dataMode: DataMode;
  notifications: { matchStart: boolean; goalWicket: boolean; favoriteTeam: boolean };
  viewingPreset: ViewingPreset;
  bandwidthLimitMB: number; // per hour, 0 = unlimited
};

const DEFAULTS: UserPrefs = {
  playbackMode: "balanced",
  theme: "dark",
  matchExperience: { liveStats: true, timeline: true, fanReactions: true },
  dataMode: "balanced",
  notifications: { matchStart: true, goalWicket: true, favoriteTeam: false },
  viewingPreset: "fan",
  bandwidthLimitMB: 0,
};

const KEY = "fancast-user-prefs-v1";

type Ctx = {
  prefs: UserPrefs;
  setPrefs: (updater: (p: UserPrefs) => UserPrefs) => void;
  reset: () => void;
};

const PrefsContext = createContext<Ctx>({ prefs: DEFAULTS, setPrefs: () => {}, reset: () => {} });

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<UserPrefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setPrefsState({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {}
  }, []);

  const setPrefs: Ctx["setPrefs"] = (updater) => {
    setPrefsState((p) => {
      const next = updater(p);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // Apply theme
  useEffect(() => {
    if (typeof document === "undefined") return;
    const apply = (mode: ThemeMode) => {
      let effective = mode;
      if (mode === "auto") {
        effective = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      }
      document.documentElement.classList.toggle("light", effective === "light");
    };
    apply(prefs.theme);
    if (prefs.theme === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const onChange = () => apply("auto");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, [prefs.theme]);

  return (
    <PrefsContext.Provider value={{ prefs, setPrefs, reset: () => setPrefs(() => DEFAULTS) }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function useUserPrefs() {
  return useContext(PrefsContext);
}
