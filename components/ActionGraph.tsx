"use client";

import { useEffect, useState } from "react";
import type { ActionGraph as Graph } from "@/lib/graph";
import { ACTIONS_BY_ID } from "@/lib/shortcuts-actions";

/**
 * "The pass": the parsed action graph assembles step by step in
 * JetBrains Mono before the result card resolves below it.
 */
export default function ActionGraph({ graph }: { graph: Graph }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    setVisible(0);
    if (graph.actions.length === 0) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(graph.actions.length);
      return;
    }
    const timer = setInterval(() => {
      setVisible((v) => {
        if (v >= graph.actions.length) {
          clearInterval(timer);
          return v;
        }
        return v + 1;
      });
    }, 130);
    return () => clearInterval(timer);
  }, [graph]);

  if (graph.actions.length === 0) return null;

  return (
    <ol className="font-mono text-xs leading-6 text-silver" aria-label="Parsed actions">
      {graph.actions.slice(0, visible).map((action, i) => {
        const def = ACTIONS_BY_ID.get(action.identifier);
        const isEnd = action.parameters.WFControlFlowMode === 2;
        return (
          <li key={i} className="step-in flex gap-3" style={{ animationDelay: "0s" }}>
            <span className="w-7 shrink-0 text-right text-muted select-none">{String(i + 1).padStart(2, "0")}</span>
            <span className="min-w-0">
              <span className={isEnd ? "text-muted" : "text-beam"}>{def?.name ?? "Unknown action"}</span>
              <span className="text-muted"> · {action.identifier.replace("is.workflow.actions.", "")}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
