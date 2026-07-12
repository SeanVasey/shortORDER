"use client";

import { useState } from "react";
import type { ActionGraph } from "@/lib/graph";
import { graphToSteps } from "@/lib/instructions";
import FeasibilityChip from "./FeasibilityChip";
import GlassPanel from "./GlassPanel";
import { GlassLink } from "./GlassButton";

interface ResultCardProps {
  graph: ActionGraph;
  /** shortcuts://import-shortcut URL when the direct path is offered */
  importUrl: string | null;
  /** Direct path still serializing */
  building: boolean;
  /** File is held in one server instance's memory — link may die any moment */
  ephemeral?: boolean;
}

/**
 * The served order. Two-path output: direct import via the
 * shortcuts:// scheme when the verdict allows it, and the numbered
 * build instructions always available underneath.
 */
export default function ResultCard({ graph, importUrl, building, ephemeral }: ResultCardProps) {
  const [showSteps, setShowSteps] = useState(graph.feasibility !== "native" || !importUrl);
  const steps = graphToSteps(graph);
  const impossible = graph.feasibility === "impossible";

  return (
    <GlassPanel className="glass-radius-lg" glow={impossible ? 0.25 : 0.7} contentClassName="glass-scrim p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <FeasibilityChip feasibility={graph.feasibility} confidence={graph.confidence} />
        <h3 className="display text-2xl text-chalk">{graph.title}</h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-silver">{graph.summary}</p>

      {graph.gaps.length > 0 && (
        <div className="mt-4 rounded-lg border border-blaze/25 bg-blaze/5 p-4">
          <p className="meta-mono text-blaze">What Shortcuts can&apos;t do here</p>
          <ul className="mt-2 space-y-1.5 text-sm text-silver">
            {graph.gaps.map((gap, i) => (
              <li key={i}>{gap}</li>
            ))}
          </ul>
        </div>
      )}

      {!impossible && (
        <>
          {/* Direct path */}
          {(importUrl || building) && (
            <div className="mt-6">
              {building ? (
                <p className="meta-mono pulse-soft">Plating the file…</p>
              ) : (
                importUrl && (
                  <>
                    <GlassLink href={importUrl} size="lg" accent tone="ready" className="w-full sm:w-auto">
                      Add to Shortcuts
                    </GlassLink>
                    {ephemeral && (
                      <p className="mt-3 font-mono text-xs text-blaze">
                        Ephemeral kitchen — this file is held in one server&apos;s memory.
                        Import it right away; if the import 404s, fire the order again.
                      </p>
                    )}
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      iOS will preview it as an untrusted shortcut — that&apos;s normal for anything
                      built outside the Gallery. Review the actions, then tap{" "}
                      <span className="text-silver">Add Untrusted Shortcut</span> at the bottom.
                      {graph.importQuestions.length > 0 &&
                        " It will ask for your values (nothing is hardcoded) as it installs."}
                    </p>
                  </>
                )
              )}
            </div>
          )}

          {/* Instruction path */}
          <div className="mt-6 border-t border-pewter/40 pt-5">
            <button
              type="button"
              className="meta-mono cursor-pointer text-silver transition-colors hover:text-beam"
              aria-expanded={showSteps}
              onClick={() => setShowSteps((s) => !s)}
            >
              {showSteps ? "− " : "+ "}Build it by hand ({steps.length} steps)
            </button>

            {showSteps && (
              <ol className="mt-4 space-y-4">
                {steps.map((step) => (
                  <li key={step.number} className="flex gap-4">
                    <span className="font-mono text-sm text-teal select-none">
                      {String(step.number).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="text-chalk">
                        Add the action{" "}
                        <span className="font-semibold text-beam">{step.actionName}</span>
                      </p>
                      {step.detail && <p className="mt-1 leading-relaxed text-silver">{step.detail}</p>}
                      {step.settings.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5 font-mono text-xs text-muted">
                          {step.settings.map((s, i) => (
                            <li key={i}>
                              {s.key}: <span className="text-silver">{s.value}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {graph.manualSteps && graph.manualSteps.length > 0 && (
            <div className="mt-6 rounded-lg border border-indigo/40 bg-indigo/10 p-4">
              <p className="meta-mono text-beam">Finish by hand</p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-silver">
                {graph.manualSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </GlassPanel>
  );
}
