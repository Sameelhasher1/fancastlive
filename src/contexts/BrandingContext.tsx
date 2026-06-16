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

const FALLBACK: Branding = {
  siteName: "FANCAST",
  logoUrl: "",
  faviconUrl: "",
  primaryColor: "#ef4444",
  secondaryColor: "#0a0a0a",
};

const CACHE_KEY = "op-branding-cache-v1";

type Ctx = { branding: Branding; loading: boolean; error: string | null };
const BrandingContext = createContext<Ctx>({ branding: FALLBACK, loading: true, error: null });

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

function findCol(header: string[], keys: string[]): number {
  for (let i = 0; i < header.length; i++) {
    const h = header[i].toLowerCase().replace(/\s+/g, "");
    if (keys.some((k) => h.includes(k))) return i;
  }
  return -1;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Branding>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hydrate from cache on client only (avoid SSR/client mismatch)
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) setBranding((b) => ({ ...b, ...JSON.parse(cached) }));
    } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${SHEET_CSV_URL}&_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        const rows = parseCsv(text);
        if (rows.length < 2) { setLoading(false); return; }
        const header = rows[0].map((h) => h.trim());
        const first = rows[1];
        const get = (keys: string[]) => {
          const idx = findCol(header, keys);
          return idx >= 0 ? (first[idx] || "").trim() : "";
        };
        const next: Branding = {
          siteName: get(["sitename", "websitename", "brand", "name"]) || FALLBACK.siteName,
          logoUrl: get(["logo"]) || FALLBACK.logoUrl,
          faviconUrl: get(["favicon"]) || FALLBACK.faviconUrl,
          primaryColor: get(["primarycolor", "primary"]) || FALLBACK.primaryColor,
          secondaryColor: get(["secondarycolor", "secondary"]) || FALLBACK.secondaryColor,
        };
        setBranding(next);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(next)); } catch {}
        setLoading(false);
      })
      .catch((e) => { if (!cancelled) { setError(String(e)); setLoading(false); } });
    return () => { cancelled = true; };
  }, []);

  // Apply favicon + title + colors
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
    if (branding.siteName) {
      document.title = `${branding.siteName} — Live Sports`;
    }
    const root = document.documentElement;
    if (branding.primaryColor) root.style.setProperty("--brand-primary", branding.primaryColor);
    if (branding.secondaryColor) root.style.setProperty("--brand-secondary", branding.secondaryColor);
  }, [branding]);

  return (
    <BrandingContext.Provider value={{ branding, loading, error }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}
