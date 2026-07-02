# Why Firebase isn't loading data

The Firestore connection is live — the network log shows a successful Listen channel to `projects/streamin-5dd83`. But the response contains a `documentDelete` event for `settings/site`, which is Firestore's signal that **the document you're subscribed to does not exist**. So the app falls back to built-in defaults on every render.

A secondary issue: `src/lib/firebase.ts` still has the placeholder value `AIzaSyBPLACEHOLDER_PASTE_REAL_KEY` for `apiKey`. Public reads happen to work anonymously, but Auth and Realtime Database presence (true viewer count) will fail silently until the real key is pasted in.

## Steps

### 1. Paste the real Firebase Web API key

- **File:** `src/lib/firebase.ts`, line 9.
- **Where to get it:** Firebase Console → Project Settings (gear) → General tab → *Your apps* → *SDK setup and configuration* → copy the `apiKey` value.
- **Safety:** Firebase web apiKeys are safe to be public; security is enforced by Firestore/RTDB rules, not by hiding the key.

Result: `isFirebaseConfigured` becomes truly valid, RTDB presence (viewer count) starts working.

### 2. Create the `settings/site` document in Firestore

- Firebase Console → Firestore Database → *Start collection*
- Collection ID: `settings`
- Document ID: `site` (exact, lowercase)
- Add the fields you want to drive the site. Minimum recommended set to see immediate effect:

  | Field | Type | Example |
  | --- | --- | --- |
  | `siteName` | string | `FANCAST` |
  | `mainTitle` | string | `FANCAST Live` |
  | `mainTagline` | string | `Watch · Follow · Celebrate` |
  | `primaryColor` | string | `#ef4444` |
  | `streams` | array | `[{ title: "Main", url: "https://.../stream.m3u8" }]` |
  | `banners` | array | `[{ url: "https://.../banner.jpg", link: "" }]` |
  | `telegram` | string | `https://t.me/yourchannel` |
  | `instagram` | string | `https://instagram.com/yourhandle` |
  | `donationsEnabled` | boolean | `true` |
  | `donationUpi` | string | `you@upi` |

  Full schema is in `FIREBASE_SETUP.md`.

Result: `onSnapshot` fires with the real data within ~1 second, the site rerenders with your branding, streams, banners, socials, and the donation card appears above the footer.

### 3. Confirm Firestore rules allow public read

In Firebase Console → Firestore → Rules, ensure `settings/{doc}` has `allow read: if true;` (the rules block from `FIREBASE_SETUP.md`). Without it, the client would still see zero data even after creating the doc.

### 4. Enable Realtime Database (only needed for true viewer count)

- Firebase Console → Realtime Database → *Create Database* → pick a region → start in locked mode.
- Paste the rules block from `FIREBASE_SETUP.md` (allows public read of `presence/`, writes only to your own presence node).

## No code changes required from me for step 1

Only step 1 touches code, and it's a single-line edit you can do yourself. I don't need to run any file edits for this — the fix is a configuration action in Firebase Console plus pasting the apiKey.

If you'd like, I can instead have the code default to a specific apiKey you paste here (still public, still safe), and I'll make that one-line change on your behalf.
