# FANCAST — Firebase Migration + Streaming/Donations Overhaul

## 1. Replace Google Sheets with Firebase

Switch the CMS from the published Google Sheet CSV to **Firebase Firestore** (with Realtime Database used only for live viewers).

- Add Firebase SDK (`firebase` npm) with a small `src/lib/firebase.ts` initializer using public web config (safe in client).
- Rewrite `src/contexts/BrandingContext.tsx` to:
  - Subscribe to a single Firestore doc `settings/site` via `onSnapshot` → instant realtime updates, no 30s polling.
  - Keep the module-level cache + `localStorage` warm hydration so refresh renders in <100ms.
  - Fall back to cached data if Firebase is unreachable.
- Firestore doc schema (single doc, all fields optional):
  - Branding: `siteName, logoUrl, faviconUrl, primaryColor, secondaryColor`
  - Site: `mainTitle, mainTagline`
  - Streams: `streams: [{ title, url, fallback, type? }]` (array, up to 4)
  - Banners: `banners: [{ url, link }]`
  - Socials: `telegram, instagram, whatsapp, facebook, twitter`
  - Maintenance: `maintenanceMode, maintenanceTitle, maintenanceTagline, maintenanceBackground`
  - **New — Donations**: `donationsEnabled, donationTitle, donationMessage, donationUpi, donationPaypal, donationStripeLink, donationBmcLink, donationQrUrl`
- Delete Google-Sheet-only fields (Overlays, Festival — already removed).
- Provide `firebase.rules` snippet in a comment / README so the doc is public-read, admin-write.

**User action:** paste Firebase web config into `src/lib/firebase.ts` (or set `VITE_FIREBASE_*` envs). The Google Sheet URL is removed entirely.

## 2. Fix multi-format streaming (currently only m3u8 works)

Rework `src/components/StreamPlayer.tsx` so every documented format actually plays:

- **HLS (.m3u8)** — hls.js when unsupported natively, native on Safari/iOS.
- **DASH (.mpd)** — lazy-load `dashjs`, attach via `MediaPlayer().create()`.
- **FLV (.flv)** — lazy-load `flv.js`, attach to the video element.
- **MP4 / WebM / OGG** — plain `<video src>`.
- **YouTube** (`youtube.com`, `youtu.be`) — iframe with `?autoplay=1&mute=1&playsinline=1`.
- **Twitch** (`twitch.tv/...`) — iframe embed with `parent=` param derived from `window.location.hostname` at runtime (fixes current "channel not visible" bug).
- **Generic iframe** — anything else that isn't a recognized video file.

Format detection = URL suffix + hostname sniff, with an explicit `type` override from Firestore. Guard every browser API (`window`, `document`, `navigator`) behind `typeof window !== 'undefined'` — this also fixes the SSR runtime error `window is not defined`.

### HLS resilience upgrade

- hls.js config: `manifestLoadingMaxRetry: 6`, `levelLoadingMaxRetry: 6`, `fragLoadingMaxRetry: 6` with exponential backoff.
- Error handler: on `NETWORK_ERROR` → `hls.startLoad()`; on `MEDIA_ERROR` → `hls.recoverMediaError()`; after 3 recovery attempts → swap to `fallback` URL from Firestore; after fallback also fails → show retry card with countdown auto-retry.
- Buffer Protection Mode already wired; keep `maxBufferLength: 60` in that mode.
- Surface `StreamHealth` status (already exists) prominently in the player overlay.

## 3. True realtime viewer count

Replace `counterapi.dev` with **Firebase Realtime Database presence**:

- On mount: `push()` a node under `presence/` with `onDisconnect().remove()` → auto-cleanup on tab close / network drop.
- Subscribe to `presence/` count via `onValue` → true concurrent viewers, updates within ~1s.
- Keep the animated counter UI in `ViewerCount.tsx`; only swap the data source.

## 4. Donations

- New `src/components/DonationCard.tsx`: premium card rendered above the footer when `donationsEnabled` is true.
  - Shows `donationTitle`, `donationMessage`.
  - Renders buttons for each configured method (UPI copy-to-clipboard, PayPal link, Stripe payment link, Buy Me a Coffee, QR image modal).
  - Logs a click event to Firestore `donations_clicks/{autoId}` (`method, timestamp, userAgent`) for basic analytics — no PII, no payment processing on our side.
- Fully DB-driven: hide entire section if no methods configured.

## 5. Settings usability improvements

`src/routes/settings.tsx` gets a polish pass — keep the 6 cards, add:

- **Preset previews** (Cinema/Fan/Analyst) auto-apply matching playback + experience toggles.
- **Bandwidth cap** slider with live "You have X MB left this hour" readout.
- **Test stream health** button — pings current stream and shows latency/bitrate.
- **Reset all** and **Export/Import** (JSON) preferences.
- Sticky "Saved ✓" toast on every change; back-to-home floating button.
- Mobile: convert grid to single-column stack with larger tap targets.

## 6. Fix current runtime error

`window is not defined` during SSR — comes from `StreamPlayer` / `BannerCarousel` / `ViewerCount` touching `window` at module or render top-level. Wrap all such reads in `useEffect` or `typeof window !== 'undefined'` guards, and gate `sessionStorage`/`localStorage` reads behind mount state.

## 7. Cleanup

- Remove Google Sheet constant and CSV parser from `BrandingContext`.
- Remove `counterapi.dev` fetches.
- Keep `AutoRefresh`, `BandwidthGuard`, `MaintenanceScreen`, `InviteFriends`, `StreamHealth` (still useful).

## Technical / dependency summary

- Add: `firebase`, `dashjs`, `flv.js` (hls.js already installed).
- Env: optional `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`. If unset, app runs on cached/fallback data and shows a small "Connect Firebase" hint in dev.
- Files created: `src/lib/firebase.ts`, `src/components/DonationCard.tsx`, `FIREBASE_SETUP.md`.
- Files modified: `BrandingContext.tsx`, `StreamPlayer.tsx`, `ViewerCount.tsx`, `settings.tsx`, `routes/index.tsx`, `BannerCarousel.tsx` (SSR guard).
- Files deleted: none.

## What I need from you before building

1. **Firebase project** — do you already have one? If yes, share the web config (apiKey/projectId/etc.). If no, I can scaffold the code and you paste config after creating a free Firebase project at console.firebase.google.com.
2. **Donation methods** — which do you want enabled? (UPI ID, PayPal.me link, Stripe Payment Link, Buy Me a Coffee, QR image) — any subset is fine.
3. **Confirm removing the Google Sheet entirely** — no dual-source fallback.
