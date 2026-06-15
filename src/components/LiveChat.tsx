import { useEffect, useRef, useState } from "react";
import { Send, Smile, Image as ImageIcon, X } from "lucide-react";

type Reactions = Record<string, number>;
type ChatMessage = {
  id: string;
  user: string;
  avatar: string;
  text?: string;
  gif?: string;
  ts: number;
  reactions: Reactions;
};

const EMOJIS = ["😀","😂","😍","😎","🤩","🥳","😭","😡","👏","🙏","🔥","💯","⚽","🏆","🎉","💪","👀","🤯","😱","🤝","❤️","💔","✨","⭐","🚀","🎯","👍","👎","🙌","😴"];

const GIFS = [
  "https://media.giphy.com/media/3o6Mbpc1YwQ2RHQqJq/giphy.gif",
  "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif",
  "https://media.giphy.com/media/26gscPbYrUluN5lf2/giphy.gif",
  "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif",
  "https://media.giphy.com/media/l46Cy1rHbQ1L9I47K/giphy.gif",
  "https://media.giphy.com/media/26FPqAHtgCBzKG5Pa/giphy.gif",
  "https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif",
  "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif",
  "https://media.giphy.com/media/3oz8xRF6T6AZdFNxiU/giphy.gif",
  "https://media.giphy.com/media/12NUbkX6p4xOO4/giphy.gif",
];

const REACTION_SET = ["👍", "❤️", "🔥", "😂"];

function avatarFor(name: string) {
  return `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(name)}`;
}

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h`;
}

export default function LiveChat() {
  const [nickname, setNickname] = useState<string>("");
  const [draftName, setDraftName] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      user: "Officia Play",
      avatar: avatarFor("Officia Play"),
      text: "Welcome to the live chat! 👋 Be kind, have fun.",
      ts: Date.now(),
      reactions: {},
    },
  ]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [, force] = useState(0);

  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  // re-render every 30s to refresh timestamps
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const send = (overrideText?: string, gif?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text && !gif) return;
    setMessages((m) => [
      ...m,
      {
        id: Math.random().toString(36).slice(2),
        user: nickname,
        avatar: avatarFor(nickname),
        text: text || undefined,
        gif,
        ts: Date.now(),
        reactions: {},
      },
    ]);
    setInput("");
    setShowEmoji(false);
    setShowGif(false);
  };

  const react = (id: string, emoji: string) => {
    setMessages((m) =>
      m.map((msg) =>
        msg.id === id
          ? { ...msg, reactions: { ...msg.reactions, [emoji]: (msg.reactions[emoji] || 0) + 1 } }
          : msg
      )
    );
  };

  if (!nickname) {
    return (
      <div className="h-full flex items-center justify-center p-6 rounded-2xl sm:rounded-3xl border border-border bg-surface/40 backdrop-blur">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const n = draftName.trim().slice(0, 24);
            if (n) setNickname(n);
          }}
          className="w-full max-w-xs text-center"
        >
          <div className="mx-auto h-14 w-14 rounded-2xl bg-accent/15 grid place-items-center mb-4">
            <Smile className="w-7 h-7 text-accent" />
          </div>
          <h3 className="font-display text-lg font-semibold mb-1">Join the live chat</h3>
          <p className="text-xs text-muted-foreground mb-4">Pick a nickname to start chatting with fans.</p>
          <input
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={24}
            placeholder="Your nickname"
            className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm outline-none focus:border-accent transition"
            autoFocus
          />
          <button
            type="submit"
            className="mt-3 w-full bg-accent hover:bg-accent/90 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Enter Chat
          </button>
          <p className="text-[10px] text-muted-foreground/70 mt-3">
            Messages are not stored. They disappear on refresh.
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col rounded-2xl sm:rounded-3xl border border-border bg-surface/40 backdrop-blur overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Live Chat</span>
        </div>
        <div className="flex items-center gap-2">
          <img src={avatarFor(nickname)} alt={nickname} className="w-6 h-6 rounded-full bg-muted" />
          <span className="text-xs font-medium truncate max-w-[100px]">{nickname}</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
        {messages.map((m) => (
          <div key={m.id} className="group flex gap-2.5 animate-fade-up">
            <img src={m.avatar} alt={m.user} className="w-8 h-8 rounded-full bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-semibold truncate">{m.user}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(m.ts)}</span>
              </div>
              {m.text && (
                <p className="text-sm leading-snug break-words mt-0.5">{m.text}</p>
              )}
              {m.gif && (
                <img src={m.gif} alt="gif" className="mt-1 rounded-lg max-w-[180px] border border-border" />
              )}
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {Object.entries(m.reactions).map(([emo, count]) => (
                  <span key={emo} className="text-[11px] bg-muted/60 rounded-full px-1.5 py-0.5">
                    {emo} {count}
                  </span>
                ))}
                <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                  {REACTION_SET.map((r) => (
                    <button
                      key={r}
                      onClick={() => react(m.id, r)}
                      className="text-xs hover:scale-125 transition-transform px-1"
                      aria-label={`React ${r}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pickers */}
      {showEmoji && (
        <div className="border-t border-border p-2 grid grid-cols-8 gap-1 max-h-40 overflow-y-auto flex-shrink-0">
          <div className="col-span-8 flex items-center justify-between px-1 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Emojis</span>
            <button onClick={() => setShowEmoji(false)} aria-label="Close"><X className="w-3.5 h-3.5" /></button>
          </div>
          {EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => { setInput((s) => s + e); setShowEmoji(false); }}
              className="text-xl hover:bg-muted rounded p-1"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      {showGif && (
        <div className="border-t border-border p-2 grid grid-cols-3 gap-1.5 max-h-52 overflow-y-auto flex-shrink-0">
          <div className="col-span-3 flex items-center justify-between px-1 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">GIFs</span>
            <button onClick={() => setShowGif(false)} aria-label="Close"><X className="w-3.5 h-3.5" /></button>
          </div>
          {GIFS.map((g) => (
            <button key={g} onClick={() => send("", g)} className="aspect-square overflow-hidden rounded-md border border-border hover:border-accent transition">
              <img src={g} alt="gif" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Composer */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="border-t border-border p-2 flex items-center gap-1.5 flex-shrink-0"
      >
        <button
          type="button"
          onClick={() => { setShowEmoji((s) => !s); setShowGif(false); }}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition"
          aria-label="Emojis"
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { setShowGif((s) => !s); setShowEmoji(false); }}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-muted transition"
          aria-label="GIFs"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something…"
          maxLength={300}
          className="flex-1 bg-background border border-border rounded-full px-3.5 py-2 text-sm outline-none focus:border-accent transition"
        />
        <button
          type="submit"
          className="h-9 w-9 grid place-items-center rounded-full bg-accent hover:bg-accent/90 text-white transition"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
