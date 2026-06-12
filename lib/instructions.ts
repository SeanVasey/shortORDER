/**
 * Renders an action graph as numbered, copy-proof assembly steps —
 * the instruction path of the two-path output model.
 */

import type { ActionGraph, ParamValue } from "./graph";
import { ACTIONS_BY_ID } from "./shortcuts-actions";
import { isOutputRef, isVariableRef } from "./graph";

export interface BuildStep {
  number: number;
  /** Action name as shown in the Shortcuts editor search */
  actionName: string;
  identifier: string;
  /** What to configure, in plain words */
  detail: string;
  /** Parameter key/value pairs worth setting by hand */
  settings: { key: string; value: string }[];
}

function describeValue(v: ParamValue): string {
  if (isOutputRef(v)) return `the output of step ${v.action + 1}`;
  if (isVariableRef(v)) return `the variable "${v.name}"`;
  if (typeof v === "string") {
    return v
      .replace(/\{\{ref:(\d+)\}\}/g, (_, n) => `[output of step ${Number(n) + 1}]`)
      .replace(/\{\{var:([^}]+)\}\}/g, (_, name) => `[variable ${name}]`);
  }
  if (typeof v === "boolean") return v ? "on" : "off";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map(describeValue).join(", ");
  return JSON.stringify(v);
}

const SKIP_KEYS = new Set(["GroupingIdentifier", "WFControlFlowMode", "UUID"]);

export function graphToSteps(graph: ActionGraph): BuildStep[] {
  return graph.actions.map((action, i) => {
    const def = ACTIONS_BY_ID.get(action.identifier);
    const settings = Object.entries(action.parameters)
      .filter(([key]) => !SKIP_KEYS.has(key))
      .map(([key, value]) => {
        const param = def?.parameters.find((p) => p.key === key);
        return {
          key: param?.description.split(/[;—]/)[0].trim() || key,
          value: describeValue(value),
        };
      });

    // Control-flow middles/ends read better with explicit names
    const mode = action.parameters.WFControlFlowMode;
    let actionName = def?.name ?? action.identifier;
    if (action.identifier === "is.workflow.actions.conditional") {
      actionName = mode === 1 ? "Otherwise" : mode === 2 ? "End If" : "If";
    } else if (mode === 2) {
      actionName = `End ${def?.name ?? "block"}`;
    }

    return {
      number: i + 1,
      actionName,
      identifier: action.identifier,
      detail: action.note,
      settings,
    };
  });
}
