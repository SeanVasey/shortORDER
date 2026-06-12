/**
 * Unsigned .shortcut serializer.
 *
 * Targets the documented unsigned format: an XML property list with
 * WFWorkflowActions plus metadata. Apple signs shortcuts server-side since
 * iOS 15, so anything generated here imports as *untrusted* — the UI sets
 * that expectation; this module just has to produce a structurally valid
 * file the importer accepts.
 *
 * Variable wiring: see lib/graph.ts for the $ref / {{ref:N}} / {{var:Name}}
 * conventions. Output references become OutputUUID attachments wired via
 * attachmentsByRange with U+FFFC placeholders; control-flow groups get their
 * GroupingIdentifier strings rewritten to stable UUIDs.
 */

import { randomUUID } from "node:crypto";
import {
  type ActionGraph,
  type GraphAction,
  type ParamValue,
  isOutputRef,
  isVariableRef,
} from "./graph";

const OBJECT_REPLACEMENT = "￼";
const INTERPOLATION = /\{\{(ref|var):([^}]+)\}\}/g;

// ── XML plist encoding ──────────────────────────────────────────────────────

type PlistValue =
  | string
  | number
  | boolean
  | PlistValue[]
  | { [key: string]: PlistValue };

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function encodeValue(value: PlistValue, indent: string): string {
  if (typeof value === "string") return `${indent}<string>${escapeXml(value)}</string>`;
  if (typeof value === "boolean") return `${indent}<${value ? "true" : "false"}/>`;
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? `${indent}<integer>${value}</integer>`
      : `${indent}<real>${value}</real>`;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${indent}<array/>`;
    const inner = value.map((v) => encodeValue(v, indent + "\t")).join("\n");
    return `${indent}<array>\n${inner}\n${indent}</array>`;
  }
  const keys = Object.keys(value);
  if (keys.length === 0) return `${indent}<dict/>`;
  const inner = keys
    .map(
      (k) =>
        `${indent}\t<key>${escapeXml(k)}</key>\n` +
        encodeValue(value[k], indent + "\t"),
    )
    .join("\n");
  return `${indent}<dict>\n${inner}\n${indent}</dict>`;
}

export function encodePlist(root: PlistValue): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n' +
    encodeValue(root, "") +
    "\n</plist>\n"
  );
}

// ── Graph → workflow actions ────────────────────────────────────────────────

interface BuildContext {
  /** action index → OutputUUID, assigned lazily when something references it */
  outputUuids: Map<number, string>;
  /** opaque grouping label → UUID */
  groupUuids: Map<string, string>;
  outputNameFor: (index: number, fallback: string) => string;
}

function attachmentValue(
  ref: { kind: "output"; index: number; name: string } | { kind: "var"; name: string },
  ctx: BuildContext,
): Record<string, PlistValue> {
  if (ref.kind === "var") {
    return { Type: "Variable", VariableName: ref.name };
  }
  let uuid = ctx.outputUuids.get(ref.index);
  if (!uuid) {
    uuid = randomUUID();
    ctx.outputUuids.set(ref.index, uuid);
  }
  return {
    Type: "ActionOutput",
    OutputUUID: uuid,
    OutputName: ctx.outputNameFor(ref.index, ref.name),
  };
}

/** A string with {{ref:N}} / {{var:Name}} tokens → WFTextTokenString dict */
function tokenString(text: string, ctx: BuildContext): PlistValue {
  INTERPOLATION.lastIndex = 0;
  if (!INTERPOLATION.test(text)) return text;
  INTERPOLATION.lastIndex = 0;

  let out = "";
  let last = 0;
  const attachments: Record<string, PlistValue> = {};
  for (const m of text.matchAll(INTERPOLATION)) {
    const matchStart = m.index ?? 0;
    out += text.slice(last, matchStart);
    const range = `{${out.length}, 1}`;
    out += OBJECT_REPLACEMENT;
    last = matchStart + m[0].length;
    const arg = m[2].trim();
    if (m[1] === "var") {
      attachments[range] = attachmentValue({ kind: "var", name: arg }, ctx);
    } else {
      const idx = Number.parseInt(arg, 10);
      attachments[range] = attachmentValue(
        { kind: "output", index: Number.isNaN(idx) ? -1 : idx, name: "Result" },
        ctx,
      );
    }
  }
  out += text.slice(last);
  return {
    Value: { string: out, attachmentsByRange: attachments },
    WFSerializationType: "WFTextTokenString",
  };
}

function convertParam(value: ParamValue, ctx: BuildContext): PlistValue {
  if (typeof value === "string") return tokenString(value, ctx);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (isOutputRef(value)) {
    return {
      Value: attachmentValue({ kind: "output", index: value.action, name: value.name ?? "Result" }, ctx),
      WFSerializationType: "WFTextTokenAttachment",
    };
  }
  if (isVariableRef(value)) {
    return {
      Value: attachmentValue({ kind: "var", name: value.name }, ctx),
      WFSerializationType: "WFTextTokenAttachment",
    };
  }
  if (Array.isArray(value)) return value.map((v) => convertParam(v, ctx));
  const out: Record<string, PlistValue> = {};
  for (const [k, v] of Object.entries(value)) out[k] = convertParam(v, ctx);
  return out;
}

// Icon: Signature-adjacent blue, "gear" glyph family. Colors are the fixed
// palette values Shortcuts uses; 463140079 is the deep blue closest to Teal.
const ICON = { WFWorkflowIconStartColor: 463140079, WFWorkflowIconGlyphNumber: 59771 };

const INPUT_CLASSES = [
  "WFAppStoreAppContentItem",
  "WFArticleContentItem",
  "WFContactContentItem",
  "WFDateContentItem",
  "WFEmailAddressContentItem",
  "WFGenericFileContentItem",
  "WFImageContentItem",
  "WFiTunesProductContentItem",
  "WFLocationContentItem",
  "WFDCMapsLinkContentItem",
  "WFAVAssetContentItem",
  "WFPDFContentItem",
  "WFPhoneNumberContentItem",
  "WFRichTextContentItem",
  "WFSafariWebPageContentItem",
  "WFStringContentItem",
  "WFURLContentItem",
];

/** Serializes a validated ActionGraph into XML plist text for a .shortcut file. */
export function graphToShortcutPlist(graph: ActionGraph): string {
  const ctx: BuildContext = {
    outputUuids: new Map(),
    groupUuids: new Map(),
    outputNameFor: (_index, fallback) => fallback || "Result",
  };

  // First pass: convert parameters (assigns OutputUUIDs to referenced actions).
  const converted = graph.actions.map((action: GraphAction) => {
    const params: Record<string, PlistValue> = {};
    for (const [key, value] of Object.entries(action.parameters)) {
      if (key === "GroupingIdentifier" && typeof value === "string") {
        let uuid = ctx.groupUuids.get(value);
        if (!uuid) {
          uuid = randomUUID();
          ctx.groupUuids.set(value, uuid);
        }
        params[key] = uuid;
        continue;
      }
      params[key] = convertParam(value, ctx);
    }
    return { identifier: action.identifier, params };
  });

  // Second pass: actions whose output is referenced need a UUID parameter.
  for (const [index, uuid] of ctx.outputUuids) {
    if (index >= 0 && index < converted.length && converted[index].params.UUID === undefined) {
      converted[index].params.UUID = uuid;
    }
  }

  const workflowActions: PlistValue[] = converted.map((a) => ({
    WFWorkflowActionIdentifier: a.identifier,
    WFWorkflowActionParameters: a.params,
  }));

  const importQuestions: PlistValue[] = graph.importQuestions.map((q) => ({
    ActionIndex: q.actionIndex,
    Category: "Parameter",
    ParameterKey: q.parameterKey,
    Text: q.prompt,
    ...(q.defaultValue !== undefined ? { DefaultValue: q.defaultValue } : {}),
  }));

  const root: PlistValue = {
    WFWorkflowClientVersion: "1230.5",
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowMinimumClientVersionString: "900",
    WFWorkflowHasOutputFallback: false,
    WFWorkflowHasShortcutInputVariables: false,
    WFWorkflowIcon: ICON,
    WFWorkflowImportQuestions: importQuestions,
    WFWorkflowInputContentItemClasses: INPUT_CLASSES,
    WFWorkflowTypes: ["NCWidget", "WatchKit"],
    WFQuickActionSurfaces: [],
    WFWorkflowActions: workflowActions,
  };

  return encodePlist(root);
}
