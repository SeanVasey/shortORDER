"use client";

import { useEffect, useState } from "react";
import GlassPanel from "./GlassPanel";
import Wordmark from "./Wordmark";

/**
 * Floating glass nav that fades in once the hero's order field scrolls
 * away — the field "rises" into the chrome as a compact re-entry point.
 */
export default function StickyNav() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("hero-sentinel");
    if (!sentinel) return;
    const io = new IntersectionObserver(([entry]) => setShown(!entry.isIntersecting), {
      rootMargin: "-10% 0px 0px 0px",
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  const backToOrder = () => {
    document.getElementById("order")?.scrollIntoView({ behavior: "smooth" });
    window.dispatchEvent(new CustomEvent("shortorder:focus"));
  };

  return (
    <div
      className={`safe-top fixed inset-x-0 top-0 z-40 px-4 transition-all duration-500 ${
        shown ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0"
      }`}
    >
      <GlassPanel className="mx-auto max-w-xl [--glass-radius:1rem]" glow={0.35} contentClassName="flex items-center justify-between px-4 py-2.5">
        <Wordmark className="text-xl" />
        <button
          type="button"
          onClick={backToOrder}
          className="cursor-pointer rounded-lg border border-pewter/60 px-3 py-1.5 text-xs text-silver transition-colors hover:border-teal/60 hover:text-chalk"
        >
          New order
        </button>
      </GlassPanel>
    </div>
  );
}
