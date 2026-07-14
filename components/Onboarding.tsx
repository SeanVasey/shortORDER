"use client";

import { useEffect, useState } from "react";
import GlassButton from "./GlassButton";
import GlassPanel from "./GlassPanel";
import Wordmark from "./Wordmark";

const STORAGE_KEY = "shortorder.initiated.v1";

const SEEDS = [
  "DND on when Logic Pro opens",
  "Text the group when I leave the studio",
  "25-min focus block + queue a playlist",
];

/**
 * The six-stage initiation procedure. Value before friction: splash,
 * premise, the three beats, the untrusted-shortcuts gate, the PWA install
 * nudge, then the first order.
 */
export default function Onboarding() {
  const [stage, setStage] = useState<number | null>(null);
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setStage(1);
    setStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
        (navigator as Navigator & { standalone?: boolean }).standalone === true,
    );
  }, []);

  // Stage 1: beam splash, ~1.5s, no copy
  useEffect(() => {
    if (stage !== 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setStage(2), reduced ? 400 : 1500);
    return () => clearTimeout(t);
  }, [stage]);

  if (stage === null) return null;

  const finish = (seed?: string) => {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    setStage(null);
    if (seed) {
      window.dispatchEvent(new CustomEvent("shortorder:seed", { detail: seed }));
    }
  };

  return (
    <div
      className="safe-x safe-top safe-bottom fixed inset-0 z-50 flex flex-col items-center justify-center bg-void"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to shortORDER"
    >
      {stage === 1 && (
        <div className="relative flex h-40 w-full max-w-sm items-center justify-center overflow-hidden">
          <Wordmark className="text-5xl" />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-beam) 65%, transparent), transparent)",
              width: "40%",
              animation: "splash-sweep 1.4s cubic-bezier(0.6, 0, 0.3, 1) forwards",
            }}
          />
        </div>
      )}

      {stage !== null && stage >= 2 && (
        <GlassPanel className="glass-radius-lg w-full max-w-md" glow={0.8} contentClassName="glass-scrim p-7 sm:p-9">
          <p className="meta-mono mb-5 text-teal">
            {String(stage - 1).padStart(2, "0")} / 05
          </p>

          {stage === 2 && (
            <>
              <Wordmark className="text-4xl" />
              <p className="mt-5 text-lg text-silver">Tell it what you want. Order up.</p>
            </>
          )}

          {stage === 3 && (
            <>
              <h2 className="display text-3xl">How it works</h2>
              <ol className="mt-5 space-y-4 text-sm text-silver">
                <li>
                  <span className="font-mono text-beam">01 Describe</span> — say what your phone
                  should do, in your own words.
                </li>
                <li>
                  <span className="font-mono text-beam">02 Analyze</span> — the request is parsed
                  into real Shortcuts actions, with an honest verdict on what&apos;s possible.
                </li>
                <li>
                  <span className="font-mono text-beam">03 Deploy</span> — two ways out: import the
                  generated shortcut directly, or follow exact build steps and assemble it yourself.
                  You always get at least the steps.
                </li>
              </ol>
            </>
          )}

          {stage === 4 && (
            <>
              <h2 className="display text-3xl">One-time gate</h2>
              <p className="mt-4 text-sm leading-relaxed text-silver">
                Apple signs shortcuts on its own servers, so anything built here imports as{" "}
                <span className="text-chalk">untrusted</span>. Direct import needs one switch
                flipped, once:
              </p>
              <p className="mt-4 rounded-lg border border-pewter/60 bg-void/40 p-4 font-mono text-sm text-chalk">
                Settings → Shortcuts → Allow Untrusted Shortcuts
              </p>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                iOS hides that toggle until you&apos;ve run at least one shortcut from the Gallery —
                open Shortcuts, run any Gallery item, and it appears. iOS doesn&apos;t let websites
                deep-link into Settings, so this stays a manual step. The build-steps path needs
                none of this.
              </p>
            </>
          )}

          {stage === 5 && (
            <>
              <h2 className="display text-3xl">Put it on the Home Screen</h2>
              {standalone ? (
                <p className="mt-4 text-sm leading-relaxed text-silver">
                  Already installed. The <span className="font-mono text-chalk">shortcuts://</span>{" "}
                  handoff runs most predictably from here.
                </p>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-silver">
                  In Safari: tap <span className="text-chalk">Share</span>, then{" "}
                  <span className="text-chalk">Add to Home Screen</span>. The{" "}
                  <span className="font-mono text-chalk">shortcuts://</span> handoff behaves more
                  predictably from the installed app.
                </p>
              )}
            </>
          )}

          {stage === 6 && (
            <>
              <h2 className="display text-3xl">First order</h2>
              <p className="mt-4 text-sm text-silver">
                Pick one and watch your own words compile, or skip and write your own.
              </p>
              <div className="mt-5 flex flex-col gap-2">
                {SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    className="pill rounded-xl px-4 py-3 text-left text-sm text-chalk"
                    onClick={() => finish(seed)}
                  >
                    {seed}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              className="meta-mono cursor-pointer transition-colors hover:text-silver"
              onClick={() => finish()}
            >
              Skip
            </button>
            {stage < 6 ? (
              <GlassButton accent onClick={() => setStage(stage + 1)}>
                Next
              </GlassButton>
            ) : (
              <GlassButton accent onClick={() => finish()}>
                Start
              </GlassButton>
            )}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
