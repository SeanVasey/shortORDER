"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ActionGraph } from "@/lib/graph";
import ActionGraphView from "./ActionGraph";
import GlassButton from "./GlassButton";
import GlassField from "./GlassField";
import ResultCard from "./ResultCard";

const SEED_ORDERS = [
  "DND on when Logic Pro opens",
  "Text the group when I leave the studio",
  "25-min focus block + queue a playlist",
  "Battery below 20%: low power mode and dim the screen",
];

// The direct path is only offered when the model is confident the file
// will import and run as intended.
const DIRECT_IMPORT_THRESHOLD = 0.7;

type Phase = "idle" | "firing" | "served" | "error";

export default function OrderConsole() {
  const [request, setRequest] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [graph, setGraph] = useState<ActionGraph | null>(null);
  const [importUrl, setImportUrl] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  const fire = useCallback(
    async (text: string) => {
      const order = text.trim();
      if (!order || phase === "firing") return;
      setPhase("firing");
      setError("");
      setGraph(null);
      setImportUrl(null);

      try {
        const res = await fetch("/api/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ request: order }),
        });
        const data = (await res.json()) as { graph?: ActionGraph; error?: string };
        if (!res.ok || !data.graph) {
          throw new Error(data.error ?? "The pass came back empty. Try again.");
        }

        setGraph(data.graph);
        setPhase("served");
        requestAnimationFrame(() =>
          resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        );

        // Direct path: serialize and host the file only when the verdict earns it.
        if (
          data.graph.feasibility === "native" &&
          data.graph.confidence >= DIRECT_IMPORT_THRESHOLD &&
          data.graph.actions.length > 0
        ) {
          setBuilding(true);
          try {
            const sres = await fetch("/api/shortcut", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ graph: data.graph }),
            });
            const sdata = (await sres.json()) as { importUrl?: string };
            if (sres.ok && sdata.importUrl) setImportUrl(sdata.importUrl);
          } finally {
            setBuilding(false);
          }
        }
      } catch (err) {
        setPhase("error");
        setError(err instanceof Error ? err.message : "Something failed on the line. Fire it again.");
      }
    },
    [phase],
  );

  // Onboarding hands off its seed order; the sticky nav hands back focus.
  useEffect(() => {
    const onSeed = (e: Event) => {
      const seed = (e as CustomEvent<string>).detail;
      setRequest(seed);
      void fire(seed);
    };
    const onFocus = () => fieldRef.current?.focus();
    window.addEventListener("shortorder:seed", onSeed);
    window.addEventListener("shortorder:focus", onFocus);
    return () => {
      window.removeEventListener("shortorder:seed", onSeed);
      window.removeEventListener("shortorder:focus", onFocus);
    };
  }, [fire]);

  return (
    <div className="w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void fire(request);
        }}
      >
        <GlassField
          ref={fieldRef}
          label="Describe the automation you want"
          placeholder="Describe what your phone should do…"
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void fire(request);
            }
          }}
          disabled={phase === "firing"}
          autoComplete="off"
          autoCapitalize="sentences"
          enterKeyHint="go"
        />

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {SEED_ORDERS.map((seed) => (
            <button
              key={seed}
              type="button"
              className="cursor-pointer rounded-full border border-pewter/60 px-3 py-1.5 text-xs text-silver transition-colors hover:border-teal/60 hover:text-chalk"
              onClick={() => {
                setRequest(seed);
                void fire(seed);
              }}
              disabled={phase === "firing"}
            >
              {seed}
            </button>
          ))}
        </div>

        <div className="mt-5">
          <GlassButton type="submit" size="lg" accent disabled={phase === "firing" || !request.trim()} className="w-full sm:w-auto">
            {phase === "firing" ? "On the fire…" : "Fire order"}
          </GlassButton>
        </div>
      </form>

      {phase === "error" && (
        <p role="alert" className="mt-5 font-mono text-sm text-blaze">
          {error}
        </p>
      )}

      <div ref={resultRef} className="scroll-mt-24">
        {phase === "firing" && (
          <p className="meta-mono pulse-soft mt-10" aria-live="polite">
            Reading the ticket…
          </p>
        )}

        {graph && phase === "served" && (
          <div className="mt-10 space-y-6">
            <div>
              <p className="meta-mono mb-3 text-teal">The pass</p>
              <ActionGraphView graph={graph} />
            </div>
            <ResultCard graph={graph} importUrl={importUrl} building={building} />
            {importUrl && <p className="meta-mono text-seafoam">Served</p>}
          </div>
        )}
      </div>
    </div>
  );
}
