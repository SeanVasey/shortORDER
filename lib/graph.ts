/**
 * The structured action graph exchanged between /api/parse, the UI, and
 * /api/shortcut. This is the contract the LLM is prompted to emit.
 */

export type Feasibility = "native" | "partial" | "impossible";

/**
 * Variable reference conventions the serializer understands:
 *
 * 1. A parameter value that is exactly
 *      { "$ref": "output", "action": <0-based index>, "name": "<label>" }
 *    becomes a WFTextTokenAttachment pointing at that action's output.
 *
 * 2. A parameter value that is exactly
 *      { "$ref": "variable", "name": "X" }
 *    becomes a WFTextTokenAttachment pointing at the named variable.
 *
 * 3. A string containing {{ref:N}} or {{var:Name}} tokens becomes a
 *    WFTextTokenString with attachmentsByRange (U+FFFC placeholders).
 */
export interface OutputRef {
  $ref: "output";
  action: number;
  name: string;
}

export interface VariableRef {
  $ref: "variable";
  name: string;
}

export type ParamValue =
  | string
  | number
  | boolean
  | OutputRef
  | VariableRef
  | ParamValue[]
  | { [key: string]: ParamValue };

export interface GraphAction {
  identifier: string;
  parameters: Record<string, ParamValue>;
  /** One-line human explanation, used verbatim in the build instructions */
  note: string;
}

export interface ImportQuestion {
  /** 0-based index into actions */
  actionIndex: number;
  /** WFWorkflowActionParameters key the answer fills */
  parameterKey: string;
  /** Question shown by the Shortcuts importer */
  prompt: string;
  defaultValue?: string;
}

export interface ActionGraph {
  title: string;
  summary: string;
  feasibility: Feasibility;
  confidence: number;
  actions: GraphAction[];
  importQuestions: ImportQuestion[];
  /** What Shortcuts can't do natively for this request */
  gaps: string[];
  /** Manual setup that can't ship in the file (e.g. automation triggers) */
  manualSteps?: string[];
}

export function isOutputRef(v: unknown): v is OutputRef {
  return (
    typeof v === "object" && v !== null && ("$ref" in v) &&
    (v as { $ref: unknown }).$ref === "output" &&
    typeof (v as { action?: unknown }).action === "number"
  );
}

export function isVariableRef(v: unknown): v is VariableRef {
  return (
    typeof v === "object" && v !== null && ("$ref" in v) &&
    (v as { $ref: unknown }).$ref === "variable" &&
    typeof (v as { name?: unknown }).name === "string"
  );
}

/** Validates and normalizes the LLM's JSON into an ActionGraph. Throws on malformed shape. */
export function validateGraph(raw: unknown): ActionGraph {
  if (typeof raw !== "object" || raw === null) throw new Error("graph: not an object");
  const g = raw as Record<string, unknown>;

  const feasibility = g.feasibility;
  if (feasibility !== "native" && feasibility !== "partial" && feasibility !== "impossible") {
    throw new Error("graph: bad feasibility");
  }

  const title = typeof g.title === "string" && g.title.trim() ? g.title.trim().slice(0, 80) : "Untitled order";
  const summary = typeof g.summary === "string" ? g.summary.trim() : "";
  const confidence = typeof g.confidence === "number" ? Math.min(1, Math.max(0, g.confidence)) : 0;

  const rawActions = Array.isArray(g.actions) ? g.actions : [];
  const actions: GraphAction[] = rawActions.map((a, i) => {
    if (typeof a !== "object" || a === null) throw new Error(`graph: action ${i} not an object`);
    const act = a as Record<string, unknown>;
    if (typeof act.identifier !== "string" || !act.identifier) {
      throw new Error(`graph: action ${i} missing identifier`);
    }
    const parameters =
      typeof act.parameters === "object" && act.parameters !== null
        ? (act.parameters as Record<string, ParamValue>)
        : {};
    return {
      identifier: act.identifier,
      parameters,
      note: typeof act.note === "string" ? act.note : "",
    };
  });

  const rawQuestions = Array.isArray(g.importQuestions) ? g.importQuestions : [];
  const importQuestions: ImportQuestion[] = rawQuestions.flatMap((q) => {
    if (typeof q !== "object" || q === null) return [];
    const iq = q as Record<string, unknown>;
    if (
      typeof iq.actionIndex !== "number" ||
      iq.actionIndex < 0 ||
      iq.actionIndex >= actions.length ||
      typeof iq.parameterKey !== "string" ||
      typeof iq.prompt !== "string"
    ) {
      return [];
    }
    return [{
      actionIndex: iq.actionIndex,
      parameterKey: iq.parameterKey,
      prompt: iq.prompt,
      ...(typeof iq.defaultValue === "string" ? { defaultValue: iq.defaultValue } : {}),
    }];
  });

  const gaps = Array.isArray(g.gaps) ? g.gaps.filter((x): x is string => typeof x === "string") : [];
  const manualSteps = Array.isArray(g.manualSteps)
    ? g.manualSteps.filter((x): x is string => typeof x === "string")
    : undefined;

  return { title, summary, feasibility, confidence, actions, importQuestions, gaps, manualSteps };
}
