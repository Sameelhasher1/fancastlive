# Firebase Setup — FANCAST

FANCAST now uses **Firebase** as its database (replacing Google Sheets).

## 1. Create a Firebase project

1. Go to https://console.firebase.google.com and create a new project (free tier is fine).
2. Add a **Web app** to the project. Copy the config object shown.
3. Enable **Firestore Database** (Production mode).
4. Enable **Realtime Database** (used for concurrent viewer presence).

## 2. Add the config to your Lovable project

Set these environment variables (Project Settings → Env):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_DATABASE_URL=https://<PROJECT_ID>-default-rtdb.firebaseio.com
```

Until these are set the site runs on built-in fallback defaults.

## 3. Firestore document — `settings/site`

Create a **single document** at `settings/site` with these fields (all optional):

| Field | Type | Purpose |
| --- | --- | --- |
| `siteName` | string | Brand name shown in header |
| `logoUrl` | string | Logo image URL |
| `faviconUrl` | string | Favicon URL |
| `primaryColor` | string (`#ef4444`) | Accent color |
| `mainTitle` | string | Hero title |
| `mainTagline` | string | Hero tagline |
| `streams` | array of `{ title, url, fallback?, type? }` | Video sources |
| `banners` | array of `{ url, link? }` | Banner carousel |
| `telegram`, `instagram`, `whatsapp`, `facebook`, `twitter` | string | Social links |
| `maintenanceMode` | boolean | Show maintenance screen |
| `maintenanceTitle` | string | Maintenance headline |
| `maintenanceTagline` | string | Maintenance message |
| `maintenanceBackground` | string | Background image URL |
| `donationsEnabled` | boolean | Show donation card |
| `donationTitle` | string | e.g. `Support FANCAST` |
| `donationMessage` | string | Short pitch |
| `donationUpi` | string | UPI ID (India) |
| `donationPaypal` | string | PayPal.me URL |
| `donationStripeLink` | string | Stripe Payment Link URL |
| `donationBmcLink` | string | Buy Me a Coffee URL |
| `donationQrUrl` | string | QR image URL |

### Supported stream `type` values (optional override)
`hls`, `dash`, `flv`, `mp4`, `webm`, `youtube`, `twitch`, `iframe`.
If omitted, the type is auto-detected from the URL.

## 4. Firestore rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /settings/{doc} {
      allow read: if true;
      allow write: if false; // edit from the Firebase console
    }
    match /donations_clicks/{doc} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

## 5. Realtime Database rules (for viewer presence)

```
{
  "rules": {
    "presence": {
      ".read": true,
      "$id": { ".write": true }
    }
  }
}
```
