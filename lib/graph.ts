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


const MAX_ACTIONS = 80;
const MAX_PARAM_DEPTH = 8;
const MAX_ARRAY_ITEMS = 100;
const MAX_STRING_CHARS = 4000;

function cleanString(value: string, max = MAX_STRING_CHARS): string {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}

function validateParamValue(value: unknown, path: string, depth = 0): ParamValue {
  if (depth > MAX_PARAM_DEPTH) throw new Error(`${path}: too deep`);
  if (typeof value === "string") return cleanString(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path}: non-finite number`);
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length > MAX_ARRAY_ITEMS) throw new Error(`${path}: too many items`);
    return value.map((item, index) => validateParamValue(item, `${path}[${index}]`, depth + 1));
  }
  if (typeof value !== "object" || value === null) throw new Error(`${path}: unsupported value`);

  const record = value as Record<string, unknown>;
  if (record.$ref === "output") {
    if (typeof record.action !== "number" || !Number.isInteger(record.action) || record.action < 0) {
      throw new Error(`${path}: invalid output ref`);
    }
    return {
      $ref: "output",
      action: record.action,
      name: typeof record.name === "string" ? cleanString(record.name, 80) : "Result",
    };
  }
  if (record.$ref === "variable") {
    if (typeof record.name !== "string" || !record.name.trim()) {
      throw new Error(`${path}: invalid variable ref`);
    }
    return { $ref: "variable", name: cleanString(record.name, 80) };
  }

  const out: Record<string, ParamValue> = {};
  for (const [key, child] of Object.entries(record)) {
    if (!key || key.length > 120 || key === "__proto__" || key === "constructor" || key === "prototype") {
      throw new Error(`${path}: unsafe key`);
    }
    out[key] = validateParamValue(child, `${path}.${key}`, depth + 1);
  }
  return out;
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

/**
 * A {"$ref":"output"} pointing past the end of the actions array would
 * serialize into an attachment whose UUID is never assigned to any action —
 * a silently broken variable in the imported shortcut.
 */
function assertOutputRefsInRange(value: ParamValue, max: number, path: string): void {
  if (isOutputRef(value)) {
    if (value.action >= max) throw new Error(`${path}: output ref to nonexistent action ${value.action}`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertOutputRefsInRange(item, max, `${path}[${i}]`));
    return;
  }
  if (typeof value === "object" && value !== null && !isVariableRef(value)) {
    for (const [key, child] of Object.entries(value)) {
      assertOutputRefsInRange(child, max, `${path}.${key}`);
    }
  }
}

/** Validates and normalizes the LLM's JSON into an ActionGraph. Throws on malformed shape. */
export function validateGraph(raw: unknown): ActionGraph {
  if (typeof raw !== "object" || raw === null) throw new Error("graph: not an object");
  const g = raw as Record<string, unknown>;

  const feasibility = g.feasibility;
  if (feasibility !== "native" && feasibility !== "partial" && feasibility !== "impossible") {
    throw new Error("graph: bad feasibility");
  }

  const title = typeof g.title === "string" && g.title.trim() ? cleanString(g.title, 80) : "Untitled order";
  const summary = typeof g.summary === "string" ? cleanString(g.summary, 1000) : "";
  const confidence = typeof g.confidence === "number" ? Math.min(1, Math.max(0, g.confidence)) : 0;

  const rawActions = Array.isArray(g.actions) ? g.actions.slice(0, MAX_ACTIONS) : [];
  const actions: GraphAction[] = rawActions.map((a, i) => {
    if (typeof a !== "object" || a === null) throw new Error(`graph: action ${i} not an object`);
    const act = a as Record<string, unknown>;
    if (typeof act.identifier !== "string" || !act.identifier) {
      throw new Error(`graph: action ${i} missing identifier`);
    }
    const parameters =
      typeof act.parameters === "object" && act.parameters !== null
        ? (validateParamValue(act.parameters, `graph.actions[${i}].parameters`) as Record<string, ParamValue>)
        : {};
    return {
      identifier: cleanString(act.identifier, 160),
      parameters,
      note: typeof act.note === "string" ? cleanString(act.note, 500) : "",
    };
  });

  actions.forEach((action, i) =>
    assertOutputRefsInRange(action.parameters, actions.length, `graph.actions[${i}].parameters`),
  );

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
      parameterKey: cleanString(iq.parameterKey, 120),
      prompt: cleanString(iq.prompt, 300),
      ...(typeof iq.defaultValue === "string" ? { defaultValue: cleanString(iq.defaultValue, 300) } : {}),
    }];
  });

  const gaps = Array.isArray(g.gaps) ? g.gaps.filter((x): x is string => typeof x === "string").map((x) => cleanString(x, 500)).slice(0, 20) : [];
  const manualSteps = Array.isArray(g.manualSteps)
    ? g.manualSteps.filter((x): x is string => typeof x === "string").map((x) => cleanString(x, 500)).slice(0, 20)
    : undefined;

  return { title, summary, feasibility, confidence, actions, importQuestions, gaps, manualSteps };
}
