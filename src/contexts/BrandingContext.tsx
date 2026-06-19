import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSV-m1nWQTWSA1zmowQ7NdwSCARkx3shVL3k_NX9p7UQn-goRSlPpBky6Ej2LlvoGCeH8KfeftEz-eX/pub?output=csv";

export type Branding = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

export type StreamItem = { title: string; url: string; fallback?: string };
export type BannerItem = { url: string; link?: string };

export type SiteSettings = {
  branding: Branding;
  mainTitle: string;
  mainTagline: string;
  streams: StreamItem[];
  banners: BannerItem[];
  telegram?: string;
  instagram?: string;
  whatsapp?: string;
  facebook?: string;
  twitter?: string;
  maintenanceMode: boolean;
  maintenanceTitle: string;
  maintenanceTagline: string;
  maintenanceBackground: string;
};

const FALLBACK_BRANDING: Branding = {
  siteName: "FANCAST",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#ef4444",
  secondaryColor: "#0a0a0a",
};

const FALLBACK_SETTINGS: SiteSettings = {
  branding: FALLBACK_BRANDING,
  mainTitle: "FANCAST",
  mainTagline: "Watch · Follow · Celebrate",
  streams: [
    { title: "Stream 1", url: "" },
    { title: "Stream 2", url: "" },
  ],
  banners: [],
  maintenanceMode: false,
  maintenanceTitle: "Site Under Maintenance",
  maintenanceTagline: "We'll be back shortly.",
  maintenanceBackground: "",
};

const CACHE_KEY = "fancast-settings-cache-v3";

// Module-level cache: warm context immediately on remount without waiting for effects
let MODULE_CACHE: SiteSettings | null = null;

type Ctx = { settings: SiteSettings; branding: Branding; loading: boolean; error: string | null };
const SettingsContext = createContext<Ctx>({
  settings: FALLBACK_SETTINGS,
  branding: FALLBACK_BRANDING,
  loading: true,
  error: null,
});

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
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

function norm(h: string) { return h.toLowerCase().replace(/[\s_-]+/g, ""); }

function makeGetter(header: string[], first: string[]) {
  const idx = header.map(norm);
  return (...keys: string[]) => {
    for (const k of keys) {
      const n = norm(k);
      const i = idx.indexOf(n);
      if (i >= 0) {
        const v = (first[i] || "").trim();
        if (v) return v;
      }
    }
    return "";
  };
}

function truthy(v: string) {
  const s = v.trim().toLowerCase();
  return s === "yes" || s === "true" || s === "1" || s === "on" || s === "y";
}

function parseSettings(text: string): SiteSettings {
  const rows = parseCsv(text);
  if (rows.length < 2) return FALLBACK_SETTINGS;
  const header = rows[0].map((h) => h.trim());
  const first = rows[1];
  const g = makeGetter(header, first);

  const branding: Branding = {
    siteName: g("SiteName", "WebsiteName", "Brand", "Name") || FALLBACK_BRANDING.siteName,
    logoUrl: g("LogoURL", "Logo"),
    faviconUrl: g("FaviconURL", "Favicon"),
    primaryColor: g("PrimaryColor", "Primary") || FALLBACK_BRANDING.primaryColor,
    secondaryColor: g("SecondaryColor", "Secondary") || FALLBACK_BRANDING.secondaryColor,
  };

  const streams: StreamItem[] = [];
  for (let i = 1; i <= 4; i++) {
    const t = g(`Title${i}`, i === 1 ? "Title" : "");
    const u = g(`Stream${i}`, `StreamURL${i}`, `URL${i}`, i === 1 ? "Stream" : "", i === 1 ? "StreamURL" : "", i === 1 ? "URL" : "");
    const f = g(`Fallback${i}`, `Stream${i}_Fallback`, `BackupStream${i}`);
    if (u || t) streams.push({ title: t || `Stream ${i}`, url: u, fallback: f || undefined });
  }
  while (streams.length < 2) streams.push({ title: `Stream ${streams.length + 1}`, url: "" });

  const banners: BannerItem[] = [];
  for (let i = 1; i <= 10; i++) {
    const url = g(`Banner${i}`, `Image${i}`);
    if (url) banners.push({ url, link: g(`BannerLink${i}`, `BannerURL${i}`) });
  }

  return {
    branding,
    mainTitle: g("MainTitle", "Title", "HeroTitle") || branding.siteName,
    mainTagline: g("MainTagline", "Tagline", "Subtitle", "HeroTagline") || "Watch · Follow · Celebrate",
    streams,
    banners,
    telegram: g("Telegram", "TelegramURL", "TelegramLink") || undefined,
    instagram: g("Instagram", "InstagramURL", "InstagramLink") || undefined,
    whatsapp: g("WhatsApp", "WhatsappURL", "WhatsAppLink") || undefined,
    facebook: g("Facebook", "FacebookURL", "FacebookLink") || undefined,
    twitter: g("Twitter", "TwitterURL", "X", "XLink") || undefined,
    maintenanceMode: truthy(g("MaintenanceMode", "Maintenance")),
    maintenanceTitle: g("MaintenanceTitle") || "Site Under Maintenance",
    maintenanceTagline: g("MaintenanceTagline", "MaintenanceMessage") || "We'll be back shortly.",
    maintenanceBackground: g("MaintenanceBackground", "MaintenanceImage", "MaintenanceBG"),
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Synchronous hydrate from module cache / localStorage on first client paint
  useEffect(() => {
    if (MODULE_CACHE) {
      setSettings(MODULE_CACHE);
      setLoading(false);
    } else {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as SiteSettings;
          MODULE_CACHE = parsed;
          setSettings(parsed);
          setLoading(false);
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${SHEET_CSV_URL}&_=${Date.now()}`, { cache: "no-store" });
        const text = await r.text();
        if (cancelled) return;
        const next = parseSettings(text);
        MODULE_CACHE = next;
        setSettings(next);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
        setLoading(false);
        setError(null);
      } catch (e) {
        if (!cancelled) { setError(String(e)); setLoading(false); }
      }
    };
    load();
    const id = setInterval(load, 30_000); // poll every 30s for fresher data
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const { branding, mainTitle } = settings;
    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
    if (mainTitle || branding.siteName) {
      document.title = `${mainTitle || branding.siteName} — Live Sports`;
    }
    const root = document.documentElement;
    if (branding.primaryColor) root.style.setProperty("--brand-primary", branding.primaryColor);
    if (branding.secondaryColor) root.style.setProperty("--brand-secondary", branding.secondaryColor);
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, branding: settings.branding, loading, error }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(SettingsContext);
  return { branding: ctx.branding, loading: ctx.loading, error: ctx.error };
}

export function useSettings() {
  return useContext(SettingsContext);
}
