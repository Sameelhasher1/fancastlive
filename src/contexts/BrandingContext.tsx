import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";

export type Branding = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
};

export type StreamItem = { title: string; url: string; fallback?: string; type?: string };
export type BannerItem = { url: string; link?: string };

export type Donations = {
  enabled: boolean;
  title: string;
  message: string;
  upi?: string;
  paypal?: string;
  stripeLink?: string;
  bmcLink?: string;
  qrUrl?: string;
};

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
  donations: Donations;
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
  donations: { enabled: false, title: "Support FANCAST", message: "" },
};

const CACHE_KEY = "fancast-settings-cache-v4";

let MODULE_CACHE: SiteSettings | null = null;

type Ctx = { settings: SiteSettings; branding: Branding; loading: boolean; error: string | null };
const SettingsContext = createContext<Ctx>({
  settings: FALLBACK_SETTINGS,
  branding: FALLBACK_BRANDING,
  loading: true,
  error: null,
});

function normalize(raw: any): SiteSettings {
  if (!raw || typeof raw !== "object") return FALLBACK_SETTINGS;
  const branding: Branding = {
    siteName: raw.siteName || FALLBACK_BRANDING.siteName,
    logoUrl: raw.logoUrl || "",
    faviconUrl: raw.faviconUrl || "",
    primaryColor: raw.primaryColor || FALLBACK_BRANDING.primaryColor,
    secondaryColor: raw.secondaryColor || FALLBACK_BRANDING.secondaryColor,
  };
  const streams: StreamItem[] = Array.isArray(raw.streams)
    ? raw.streams
        .filter((s: any) => s && typeof s === "object")
        .map((s: any, i: number) => ({
          title: s.title || `Stream ${i + 1}`,
          url: s.url || "",
          fallback: s.fallback || undefined,
          type: s.type || undefined,
        }))
    : [];
  while (streams.length < 2) streams.push({ title: `Stream ${streams.length + 1}`, url: "" });

  const banners: BannerItem[] = Array.isArray(raw.banners)
    ? raw.banners
        .filter((b: any) => b && b.url)
        .map((b: any) => ({ url: b.url, link: b.link || undefined }))
    : [];

  return {
    branding,
    mainTitle: raw.mainTitle || branding.siteName,
    mainTagline: raw.mainTagline || "Watch · Follow · Celebrate",
    streams,
    banners,
    telegram: raw.telegram || undefined,
    instagram: raw.instagram || undefined,
    whatsapp: raw.whatsapp || undefined,
    facebook: raw.facebook || undefined,
    twitter: raw.twitter || undefined,
    maintenanceMode: !!raw.maintenanceMode,
    maintenanceTitle: raw.maintenanceTitle || "Site Under Maintenance",
    maintenanceTagline: raw.maintenanceTagline || "We'll be back shortly.",
    maintenanceBackground: raw.maintenanceBackground || "",
    donations: {
      enabled: !!raw.donationsEnabled,
      title: raw.donationTitle || "Support FANCAST",
      message: raw.donationMessage || "",
      upi: raw.donationUpi || undefined,
      paypal: raw.donationPaypal || undefined,
      stripeLink: raw.donationStripeLink || undefined,
      bmcLink: raw.donationBmcLink || undefined,
      qrUrl: raw.donationQrUrl || undefined,
    },
  };
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(FALLBACK_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate synchronously from cache
  useEffect(() => {
    if (MODULE_CACHE) {
      setSettings(MODULE_CACHE);
      setLoading(false);
      return;
    }
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as SiteSettings;
        MODULE_CACHE = parsed;
        setSettings(parsed);
        setLoading(false);
      }
    } catch {}
  }, []);

  // Subscribe to Firestore realtime
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError("Firebase not configured — using fallback data. See FIREBASE_SETUP.md");
      return;
    }
    let unsub: (() => void) | undefined;
    (async () => {
      try {
        const { db } = getFirebase();
        if (!db) return;
        const { doc, onSnapshot } = await import("firebase/firestore");
        const ref = doc(db, "settings", "site");
        unsub = onSnapshot(
          ref,
          (snap) => {
            const next = normalize(snap.exists() ? snap.data() : {});
            MODULE_CACHE = next;
            setSettings(next);
            setLoading(false);
            setError(null);
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
          },
          (e) => { setError(String(e)); setLoading(false); },
        );
      } catch (e) {
        setError(String(e));
        setLoading(false);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Apply branding to DOM
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
