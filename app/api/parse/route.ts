import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { validateGraph } from "@/lib/graph";
import {
  ACTIONS_BY_ID,
  DICTIONARY_VERSION,
  KNOWN_GAPS,
  dictionaryForPrompt,
} from "@/lib/shortcuts-actions";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.SHORTORDER_MODEL ?? "claude-sonnet-4-6";
const MAX_REQUEST_CHARS = 2000;

const SYSTEM_PROMPT = `You are the compiler core of shortORDER: you translate a plain-language description of a desired iPhone automation into an iOS Shortcuts action graph.

ACTION DICTIONARY (v${DICTIONARY_VERSION}) — the ONLY action identifiers you may emit. Never invent identifiers; if a capability is not in this dictionary, treat it as unavailable and reflect that in feasibility/gaps.

${dictionaryForPrompt()}

THINGS SHORTCUTS CANNOT DO (cite these in "gaps" when relevant):
${KNOWN_GAPS.map((g) => `- ${g}`).join("\n")}

VARIABLE WIRING CONVENTIONS (the serializer understands exactly these):
- To pass the output of action N (0-based) as a whole parameter value: {"$ref":"output","action":N,"name":"<short label>"}
- To pass a named variable as a whole parameter value: {"$ref":"variable","name":"X"}
- To interpolate into text: embed {{ref:N}} or {{var:Name}} inside the string.
- Control flow (If / Repeat / Choose from Menu) is FLAT: emit start/middle/end actions sharing the same GroupingIdentifier string (any stable label like "g1"); nested actions simply sit between them in the array.

IMPORT QUESTIONS: anything personal or device-specific (contacts, addresses, playlists, app choices, thresholds the user might tune) must NOT be hardcoded. Add an entry to "importQuestions" so the Shortcuts importer prompts the user at install time. Reference real actionIndex/parameterKey pairs.

FEASIBILITY:
- "native": every requested behavior maps onto dictionary actions. Note that triggers (time/location/app-launch) are NEVER native — a request that needs one is at best "partial" with the trigger described in manualSteps.
- "partial": the core is achievable but something is approximated or requires manual setup. Build the closest achievable graph and list what's missing in "gaps" plus any hand-setup in "manualSteps".
- "impossible": Shortcuts cannot meaningfully do this. Emit an empty actions array, explain why in "gaps", and if a related-but-different automation IS possible, describe it in "summary".
- "confidence" (0-1): your confidence that the emitted graph imports and runs as intended. Be honest; an exotic parameter combination you are unsure about should lower it.

OUTPUT — a single JSON object, no markdown fences, no prose:
{
  "title": "Short name for the shortcut",
  "summary": "One or two plain sentences of what it does and any caveat",
  "feasibility": "native" | "partial" | "impossible",
  "confidence": 0.0-1.0,
  "actions": [ { "identifier": "...", "parameters": { ... }, "note": "one-line human explanation for manual assembly" } ],
  "importQuestions": [ { "actionIndex": 0, "parameterKey": "...", "prompt": "...", "defaultValue": "..." } ],
  "gaps": [ "..." ],
  "manualSteps": [ "..." ]
}

Style: titles in sentence case, terse. Notes must let a person assemble the step by hand in the Shortcuts editor without guessing. No emoji anywhere.`;

function extractJson(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in model output");
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }

  let requestText: string;
  try {
    const body = (await request.json()) as { request?: unknown };
    requestText = typeof body.request === "string" ? body.request.trim() : "";
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!requestText) {
    return NextResponse.json({ error: "Describe the automation first." }, { status: 400 });
  }
  if (requestText.length > MAX_REQUEST_CHARS) {
    return NextResponse.json(
      { error: `Keep the order under ${MAX_REQUEST_CHARS} characters.` },
      { status: 400 },
    );
  }

  const anthropic = new Anthropic();
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: requestText }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const graph = validateGraph(extractJson(text));

    // Guard the dictionary boundary server-side too: unknown identifiers
    // demote the verdict rather than shipping a file that won't import.
    const unknown = graph.actions
      .map((a) => a.identifier)
      .filter((id) => !ACTIONS_BY_ID.has(id));
    if (unknown.length > 0 && graph.feasibility === "native") {
      graph.feasibility = "partial";
      graph.confidence = Math.min(graph.confidence, 0.4);
      graph.gaps.push(
        `Unverified action identifier(s): ${[...new Set(unknown)].join(", ")} — direct import disabled; follow the build steps instead.`,
      );
    }

    return NextResponse.json({ graph, dictionaryVersion: DICTIONARY_VERSION });
  } catch (err) {
    // Log the failure class only — never the user's prompt or model output.
    console.error("parse failed:", err instanceof Error ? err.message : "unknown error");
    return NextResponse.json(
      { error: "Couldn't parse that order. Try rephrasing it." },
      { status: 502 },
    );
  }
}
