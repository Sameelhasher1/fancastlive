import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

const REFRESH_MS = 60 * 60 * 1000; // 1 hour
const NOTICE_BEFORE_MS = 30 * 1000; // show 30s before

export default function AutoRefresh() {
  const [showNotice, setShowNotice] = useState(false);
  const [seconds, setSeconds] = useState(NOTICE_BEFORE_MS / 1000);

  useEffect(() => {
    const noticeTimer = setTimeout(() => setShowNotice(true), REFRESH_MS - NOTICE_BEFORE_MS);
    const refreshTimer = setTimeout(() => {
      try { window.location.reload(); } catch {}
    }, REFRESH_MS);
    return () => {
      clearTimeout(noticeTimer);
      clearTimeout(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (!showNotice) return;
    const id = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [showNotice]);

  if (!showNotice) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-up">
      <div className="flex items-center gap-3 rounded-xl bg-black/85 backdrop-blur border border-white/10 px-4 py-3 text-white shadow-2xl">
        <RefreshCw className="w-4 h-4 animate-spin-slow" />
        <div className="text-sm">
          Refreshing in <span className="tabular-nums font-semibold">{seconds}s</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="ml-2 text-xs px-2.5 h-7 rounded-md bg-white/10 hover:bg-white/20"
        >
          Refresh now
        </button>
      </div>
    </div>
  );
}
