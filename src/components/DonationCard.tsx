import { useState } from "react";
import { Heart, Copy, Check, ExternalLink, QrCode, X } from "lucide-react";
import type { Donations } from "@/contexts/BrandingContext";
import { getFirebase, isFirebaseConfigured } from "@/lib/firebase";

async function logClick(method: string) {
  if (!isFirebaseConfigured) return;
  try {
    const { db } = getFirebase();
    if (!db) return;
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");
    await addDoc(collection(db, "donations_clicks"), {
      method,
      timestamp: serverTimestamp(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    });
  } catch {}
}

export default function DonationCard({ donations }: { donations: Donations }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const hasMethod = !!(donations.upi || donations.paypal || donations.stripeLink || donations.bmcLink || donations.qrUrl);
  if (!donations.enabled || !hasMethod) return null;

  const copyUpi = async () => {
    if (!donations.upi) return;
    try {
      await navigator.clipboard.writeText(donations.upi);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      logClick("upi");
    } catch {}
  };

  return (
    <section className="mt-10 sm:mt-12 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent/10 via-surface/70 to-surface/40 p-6 sm:p-8">
      <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-accent/20 blur-3xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-6">
        <div className="h-14 w-14 grid place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/40 shrink-0">
          <Heart className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">{donations.title}</h3>
          {donations.message && (
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">{donations.message}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {donations.upi && (
              <button
                onClick={copyUpi}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-accent text-white hover:brightness-110 text-sm font-medium transition"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "UPI copied" : `UPI · ${donations.upi}`}
              </button>
            )}
            {donations.paypal && (
              <a
                href={donations.paypal}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => logClick("paypal")}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#0070ba] text-white hover:brightness-110 text-sm font-medium transition"
              >
                <ExternalLink className="w-4 h-4" /> PayPal
              </a>
            )}
            {donations.stripeLink && (
              <a
                href={donations.stripeLink}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => logClick("stripe")}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#635bff] text-white hover:brightness-110 text-sm font-medium transition"
              >
                <ExternalLink className="w-4 h-4" /> Card / Stripe
              </a>
            )}
            {donations.bmcLink && (
              <a
                href={donations.bmcLink}
                target="_blank"
                rel="noreferrer noopener"
                onClick={() => logClick("bmc")}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#ffdd00] text-black hover:brightness-105 text-sm font-medium transition"
              >
                <ExternalLink className="w-4 h-4" /> Buy Me a Coffee
              </a>
            )}
            {donations.qrUrl && (
              <button
                onClick={() => { setShowQr(true); logClick("qr"); }}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface border border-border hover:bg-muted text-sm font-medium transition"
              >
                <QrCode className="w-4 h-4" /> Scan QR
              </button>
            )}
          </div>
        </div>
      </div>

      {showQr && donations.qrUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setShowQr(false)}
        >
          <div
            className="relative bg-surface border border-border rounded-3xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowQr(false)}
              className="absolute top-3 right-3 h-8 w-8 grid place-items-center rounded-full hover:bg-muted"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <h4 className="font-display text-lg font-semibold mb-3">{donations.title}</h4>
            <img
              src={donations.qrUrl}
              alt="Donation QR code"
              className="w-full aspect-square object-contain rounded-2xl bg-white p-3"
            />
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Scan with any UPI or wallet app.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
