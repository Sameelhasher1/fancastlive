import { useState } from "react";
import { Copy, Check, Share2, Send, MessageCircle, Facebook, Twitter } from "lucide-react";

export default function InviteFriends({ siteName }: { siteName: string }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const text = `Watch live sports on ${siteName}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {}
  };

  const nativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share({ title: siteName, text, url: shareUrl }); } catch {}
    } else copy();
  };

  const enc = encodeURIComponent;
  const links = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${enc(text + " " + shareUrl)}`,
      icon: <MessageCircle className="w-4 h-4" />,
      tint: "hover:text-emerald-400",
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${enc(shareUrl)}&text=${enc(text)}`,
      icon: <Send className="w-4 h-4" />,
      tint: "hover:text-sky-400",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}`,
      icon: <Facebook className="w-4 h-4" />,
      tint: "hover:text-blue-400",
    },
    {
      label: "X / Twitter",
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(text)}`,
      icon: <Twitter className="w-4 h-4" />,
      tint: "hover:text-foreground",
    },
  ];

  return (
    <section className="max-w-3xl mx-auto rounded-2xl border border-border bg-surface/70 backdrop-blur px-5 sm:px-7 py-6 shadow-xl shadow-black/30">
      <div className="text-center">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.25em] text-muted-foreground">Invite Friends</p>
        <h3 className="font-display text-xl sm:text-2xl font-semibold mt-1">Share the action with your crew</h3>
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-xl bg-background/60 border border-border p-1.5">
        <input
          readOnly
          value={shareUrl}
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm outline-none truncate"
        />
        <button
          onClick={copy}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-accent text-accent-foreground hover:opacity-90 text-xs sm:text-sm font-medium transition"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={nativeShare}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface border border-border hover:bg-muted text-sm transition"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={l.label}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-full bg-surface border border-border hover:bg-muted text-sm transition ${l.tint}`}
          >
            {l.icon}
            <span className="hidden sm:inline">{l.label}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
