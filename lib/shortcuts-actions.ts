/**
 * Curated iOS Shortcuts action dictionary.
 *
 * This is the single biggest determinant of output quality: the /api/parse
 * system prompt is preloaded with this catalog so the model maps intent onto
 * real WFWorkflowActionIdentifier strings instead of hallucinating them.
 *
 * Distilled from the publicly documented unsigned .shortcut format
 * (sebj/iOS-Shortcuts-Reference and community action catalogs). Version it:
 * bump DICTIONARY_VERSION whenever entries are added, corrected, or removed,
 * and note the change in the changelog block at the bottom of this file.
 */

export const DICTIONARY_VERSION = "1.0.0";

export interface ActionParameter {
  /** WFWorkflowActionParameters key */
  key: string;
  type: "string" | "number" | "boolean" | "array" | "dictionary" | "text-or-variable";
  description: string;
  required?: boolean;
  /** Allowed literal values, when the parameter is an enum */
  values?: readonly string[];
  example?: unknown;
}

export interface ActionDefinition {
  /** WFWorkflowActionIdentifier */
  identifier: string;
  /** Human name as shown in the Shortcuts editor — used verbatim in build instructions */
  name: string;
  /** Editor category, for grouping in instructions */
  category: string;
  description: string;
  parameters: readonly ActionParameter[];
  /** Extra guidance for the model and for human assembly steps */
  notes?: string;
}

const A = (def: ActionDefinition) => def;

export const ACTIONS: readonly ActionDefinition[] = [
  // ── Scripting: flow control ───────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.conditional",
    name: "If",
    category: "Scripting",
    description:
      "Branches on a condition. Emitted as a group of actions: one with WFControlFlowMode 0 (If), optionally one with mode 1 (Otherwise), and one with mode 2 (End If), all sharing the same GroupingIdentifier.",
    parameters: [
      { key: "WFControlFlowMode", type: "number", required: true, description: "0 = If, 1 = Otherwise, 2 = End If" },
      { key: "GroupingIdentifier", type: "string", required: true, description: "Same opaque string on every action of the group; the serializer rewrites it to a UUID" },
      { key: "WFCondition", type: "number", description: "Comparison: 4 = equals, 5 = not equals, 8 = contains, 9 = does not contain, 2 = greater than, 0 = less than, 100 = has any value, 101 = does not have value" },
      { key: "WFConditionalActionString", type: "text-or-variable", description: "Right-hand side for string comparisons" },
      { key: "WFNumberValue", type: "number", description: "Right-hand side for numeric comparisons" },
    ],
    notes: "The If action compares the output of the previous action (its input). Put the value to test immediately before the If, or reference it explicitly.",
  }),
  A({
    identifier: "is.workflow.actions.choosefrommenu",
    name: "Choose from Menu",
    category: "Scripting",
    description:
      "Presents a menu. Emitted as a group: mode 0 opens the menu and carries WFMenuPrompt + WFMenuItems (array of title strings); each option begins with a mode 1 action carrying WFMenuItemTitle; mode 2 ends the menu. All share GroupingIdentifier.",
    parameters: [
      { key: "WFControlFlowMode", type: "number", required: true, description: "0 = start (menu), 1 = case, 2 = end" },
      { key: "GroupingIdentifier", type: "string", required: true, description: "Shared opaque group id" },
      { key: "WFMenuPrompt", type: "string", description: "Menu title (mode 0 only)" },
      { key: "WFMenuItems", type: "array", description: "Array of option title strings (mode 0 only)" },
      { key: "WFMenuItemTitle", type: "string", description: "Option title (mode 1 only, must match an entry in WFMenuItems)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.repeat.count",
    name: "Repeat",
    category: "Scripting",
    description: "Repeats the enclosed actions N times. Group of mode 0 (start, carries WFRepeatCount) and mode 2 (end).",
    parameters: [
      { key: "WFControlFlowMode", type: "number", required: true, description: "0 = start, 2 = end" },
      { key: "GroupingIdentifier", type: "string", required: true, description: "Shared opaque group id" },
      { key: "WFRepeatCount", type: "number", description: "Iteration count (mode 0 only)", example: 5 },
    ],
  }),
  A({
    identifier: "is.workflow.actions.repeat.each",
    name: "Repeat with Each",
    category: "Scripting",
    description: "Repeats the enclosed actions once per item of the input list. Group of mode 0 (start) and mode 2 (end).",
    parameters: [
      { key: "WFControlFlowMode", type: "number", required: true, description: "0 = start, 2 = end" },
      { key: "GroupingIdentifier", type: "string", required: true, description: "Shared opaque group id" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.delay",
    name: "Wait",
    category: "Scripting",
    description: "Pauses execution for a number of seconds.",
    parameters: [
      { key: "WFDelayTime", type: "number", required: true, description: "Seconds to wait", example: 2 },
    ],
  }),
  A({
    identifier: "is.workflow.actions.waittoreturn",
    name: "Wait to Return",
    category: "Scripting",
    description: "Pauses until the user returns to the app.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.exit",
    name: "Stop This Shortcut",
    category: "Scripting",
    description: "Stops execution immediately.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.nothing",
    name: "Nothing",
    category: "Scripting",
    description: "Clears the current input (outputs nothing).",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.comment",
    name: "Comment",
    category: "Scripting",
    description: "A non-executing note inside the shortcut. Use to label sections.",
    parameters: [
      { key: "WFCommentActionText", type: "string", required: true, description: "Comment text" },
    ],
  }),

  // ── Scripting: variables ─────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.setvariable",
    name: "Set Variable",
    category: "Scripting",
    description: "Stores the previous action's output under a name.",
    parameters: [
      { key: "WFVariableName", type: "string", required: true, description: "Variable name", example: "Result" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.appendvariable",
    name: "Add to Variable",
    category: "Scripting",
    description: "Appends the previous action's output to a (list) variable.",
    parameters: [
      { key: "WFVariableName", type: "string", required: true, description: "Variable name" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getvariable",
    name: "Get Variable",
    category: "Scripting",
    description: "Outputs the value of a named variable, making it the input of the next action.",
    parameters: [
      { key: "WFVariable", type: "text-or-variable", required: true, description: "Reference the variable with {\"$ref\":\"variable\",\"name\":\"X\"}" },
    ],
  }),

  // ── Scripting: interaction ───────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.ask",
    name: "Ask for Input",
    category: "Scripting",
    description: "Prompts the user for a value at run time.",
    parameters: [
      { key: "WFAskActionPrompt", type: "string", required: true, description: "Question shown to the user", example: "How many minutes?" },
      { key: "WFInputType", type: "string", description: "Input kind", values: ["Text", "Number", "URL", "Date", "Time", "Date and Time"] },
      { key: "WFAskActionDefaultAnswer", type: "string", description: "Prefilled default answer" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.choosefromlist",
    name: "Choose from List",
    category: "Scripting",
    description: "Lets the user pick from the input list.",
    parameters: [
      { key: "WFChooseFromListActionPrompt", type: "string", description: "Prompt title" },
      { key: "WFChooseFromListActionSelectMultiple", type: "boolean", description: "Allow multiple selection" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.alert",
    name: "Show Alert",
    category: "Scripting",
    description: "Shows a blocking alert with OK/Cancel. Cancel stops the shortcut.",
    parameters: [
      { key: "WFAlertActionTitle", type: "string", description: "Alert title" },
      { key: "WFAlertActionMessage", type: "text-or-variable", required: true, description: "Alert body" },
      { key: "WFAlertActionCancelButtonShown", type: "boolean", description: "Show the Cancel button (default true)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.notification",
    name: "Show Notification",
    category: "Scripting",
    description: "Posts a local notification.",
    parameters: [
      { key: "WFNotificationActionTitle", type: "string", description: "Notification title" },
      { key: "WFNotificationActionBody", type: "text-or-variable", required: true, description: "Notification body" },
      { key: "WFNotificationActionSound", type: "boolean", description: "Play sound (default true)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.showresult",
    name: "Show Result",
    category: "Scripting",
    description: "Displays text (with interpolated variables) in a result sheet.",
    parameters: [
      { key: "Text", type: "text-or-variable", required: true, description: "Text to show; supports {{ref:N}} / {{var:Name}} interpolation" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.speaktext",
    name: "Speak Text",
    category: "Scripting",
    description: "Speaks the input aloud.",
    parameters: [
      { key: "WFSpeakTextRate", type: "number", description: "0–1 speech rate (0.5 is normal)" },
      { key: "WFSpeakTextPitch", type: "number", description: "Pitch around 1.0" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.dictatetext",
    name: "Dictate Text",
    category: "Scripting",
    description: "Captures speech and outputs the transcription.",
    parameters: [
      { key: "WFDictateTextStopListening", type: "string", description: "When to stop", values: ["After Pause", "After Short Pause", "On Tap"] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.openapp",
    name: "Open App",
    category: "Scripting",
    description: "Opens an app by bundle identifier.",
    parameters: [
      { key: "WFAppIdentifier", type: "string", required: true, description: "Bundle id", example: "com.apple.mobilesafari" },
    ],
    notes: "Common bundle ids: com.apple.MobileSMS (Messages), com.apple.mobilemail (Mail), com.apple.Music, com.apple.mobiletimer (Clock), com.apple.camera, com.apple.Maps, com.apple.Preferences (Settings). For third-party apps, prefer an import question so the user picks the app.",
  }),
  A({
    identifier: "is.workflow.actions.runworkflow",
    name: "Run Shortcut",
    category: "Scripting",
    description: "Runs another shortcut by name.",
    parameters: [
      { key: "WFWorkflowName", type: "string", required: true, description: "Name of the shortcut to run" },
    ],
  }),

  // ── Device state ─────────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.dnd.set",
    name: "Set Focus",
    category: "Device",
    description: "Turns Do Not Disturb / a Focus mode on or off.",
    parameters: [
      { key: "Enabled", type: "number", required: true, description: "1 = on, 0 = off" },
      { key: "AssertionType", type: "string", description: "Scope of the assertion", values: ["Turned On", "Until Turned Off", "Until Time", "Until Event Ends", "Until Leave"] },
    ],
    notes: "Selecting a specific named Focus (e.g. Work) requires the user to pick it once in the editor — surface that as a build-instruction note rather than hardcoding.",
  }),
  A({
    identifier: "is.workflow.actions.airplanemode.set",
    name: "Set Airplane Mode",
    category: "Device",
    description: "Turns Airplane Mode on or off.",
    parameters: [{ key: "OnValue", type: "boolean", required: true, description: "true = on" }],
  }),
  A({
    identifier: "is.workflow.actions.wifi.set",
    name: "Set Wi-Fi",
    category: "Device",
    description: "Turns Wi-Fi on or off.",
    parameters: [{ key: "OnValue", type: "boolean", required: true, description: "true = on" }],
  }),
  A({
    identifier: "is.workflow.actions.bluetooth.set",
    name: "Set Bluetooth",
    category: "Device",
    description: "Turns Bluetooth on or off.",
    parameters: [{ key: "OnValue", type: "boolean", required: true, description: "true = on" }],
  }),
  A({
    identifier: "is.workflow.actions.cellulardata.set",
    name: "Set Cellular Data",
    category: "Device",
    description: "Turns cellular data on or off.",
    parameters: [{ key: "OnValue", type: "boolean", required: true, description: "true = on" }],
  }),
  A({
    identifier: "is.workflow.actions.lowpowermode.set",
    name: "Set Low Power Mode",
    category: "Device",
    description: "Turns Low Power Mode on or off.",
    parameters: [{ key: "OnValue", type: "boolean", required: true, description: "true = on" }],
  }),
  A({
    identifier: "is.workflow.actions.setbrightness",
    name: "Set Brightness",
    category: "Device",
    description: "Sets screen brightness.",
    parameters: [{ key: "WFBrightness", type: "number", required: true, description: "0.0–1.0", example: 0.4 }],
  }),
  A({
    identifier: "is.workflow.actions.setvolume",
    name: "Set Volume",
    category: "Device",
    description: "Sets media volume.",
    parameters: [{ key: "WFVolume", type: "number", required: true, description: "0.0–1.0", example: 0.5 }],
  }),
  A({
    identifier: "is.workflow.actions.flashlight",
    name: "Set Flashlight",
    category: "Device",
    description: "Turns the torch on or off.",
    parameters: [{ key: "WFFlashlightSetting", type: "string", description: "On/Off", values: ["On", "Off"] }],
  }),
  A({
    identifier: "is.workflow.actions.vibrate",
    name: "Vibrate Device",
    category: "Device",
    description: "Vibrates the device once.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.appearance",
    name: "Set Appearance",
    category: "Device",
    description: "Switches the system between Light and Dark appearance.",
    parameters: [
      { key: "operation", type: "string", required: true, description: "set or toggle", values: ["set", "toggle"] },
      { key: "style", type: "string", description: "Target style when operation is set", values: ["light", "dark"] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.lockscreen",
    name: "Lock Screen",
    category: "Device",
    description: "Locks the device.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.returntohomescreen",
    name: "Go to Home Screen",
    category: "Device",
    description: "Returns to the Home Screen.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.getbatterylevel",
    name: "Get Battery Level",
    category: "Device",
    description: "Outputs the battery percentage (0–100).",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.getdevicedetails",
    name: "Get Device Details",
    category: "Device",
    description: "Outputs a device property.",
    parameters: [
      { key: "WFDeviceDetail", type: "string", required: true, description: "Property to read", values: ["Device Name", "Device Model", "System Version", "Screen Width", "Screen Height", "Current Volume", "Current Brightness"] },
    ],
  }),

  // ── Communication ────────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.sendmessage",
    name: "Send Message",
    category: "Communication",
    description: "Sends an iMessage/SMS. Recipients should come from an import question, not be hardcoded.",
    parameters: [
      { key: "WFSendMessageContent", type: "text-or-variable", required: true, description: "Message body" },
      { key: "WFSendMessageActionRecipients", type: "array", description: "Recipient handles; leave empty and attach an import question so the user picks contacts at install" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.sendemail",
    name: "Send Email",
    category: "Communication",
    description: "Composes and sends an email.",
    parameters: [
      { key: "WFSendEmailActionToRecipients", type: "array", description: "Recipient addresses; prefer an import question" },
      { key: "WFSendEmailActionSubject", type: "text-or-variable", description: "Subject" },
      { key: "WFSendEmailActionShowComposeSheet", type: "boolean", description: "Show the compose sheet before sending (default true)" },
    ],
  }),

  // ── Web ──────────────────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.url",
    name: "URL",
    category: "Web",
    description: "Outputs a URL value.",
    parameters: [
      { key: "WFURLActionURL", type: "text-or-variable", required: true, description: "The URL", example: "https://example.com" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.openurl",
    name: "Open URL",
    category: "Web",
    description: "Opens the input URL (use after a URL action). Also launches app URL schemes.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.downloadurl",
    name: "Get Contents of URL",
    category: "Web",
    description: "Performs an HTTP request on the input URL and outputs the response.",
    parameters: [
      { key: "WFHTTPMethod", type: "string", description: "HTTP method", values: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
      { key: "WFHTTPHeaders", type: "dictionary", description: "Request headers" },
      { key: "WFHTTPBodyType", type: "string", description: "Body encoding", values: ["JSON", "Form", "File"] },
      { key: "WFJSONValues", type: "dictionary", description: "JSON body when WFHTTPBodyType is JSON" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getwebpagecontents",
    name: "Get Contents of Web Page",
    category: "Web",
    description: "Extracts the readable article text of the input URL.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.searchweb",
    name: "Search Web",
    category: "Web",
    description: "Searches the web for the given query.",
    parameters: [
      { key: "WFSearchWebDestination", type: "string", description: "Engine", values: ["Google", "DuckDuckGo", "Bing", "Reddit"] },
      { key: "WFInputText", type: "text-or-variable", description: "Query" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.showwebpage",
    name: "Show Web Page",
    category: "Web",
    description: "Opens the input URL in an in-app Safari sheet.",
    parameters: [
      { key: "WFEnterSafariReader", type: "boolean", description: "Open in Reader mode" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.urlencode",
    name: "URL Encode",
    category: "Web",
    description: "Percent-encodes or decodes the input text.",
    parameters: [
      { key: "WFEncodeMode", type: "string", description: "Direction", values: ["Encode", "Decode"] },
    ],
  }),

  // ── Text ─────────────────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.gettext",
    name: "Text",
    category: "Text",
    description: "Outputs a text value; the workhorse for composing strings with variable interpolation.",
    parameters: [
      { key: "WFTextActionText", type: "text-or-variable", required: true, description: "The text; supports {{ref:N}} / {{var:Name}} interpolation" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.text.split",
    name: "Split Text",
    category: "Text",
    description: "Splits the input text into a list.",
    parameters: [
      { key: "WFTextSeparator", type: "string", description: "Separator kind", values: ["New Lines", "Spaces", "Every Character", "Custom"] },
      { key: "WFTextCustomSeparator", type: "string", description: "Custom separator when WFTextSeparator is Custom" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.text.combine",
    name: "Combine Text",
    category: "Text",
    description: "Joins the input list into one text.",
    parameters: [
      { key: "WFTextSeparator", type: "string", description: "Separator kind", values: ["New Lines", "Spaces", "Custom"] },
      { key: "WFTextCustomSeparator", type: "string", description: "Custom separator" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.text.replace",
    name: "Replace Text",
    category: "Text",
    description: "Replaces occurrences in the input text.",
    parameters: [
      { key: "WFReplaceTextFind", type: "string", required: true, description: "Text to find" },
      { key: "WFReplaceTextReplace", type: "string", required: true, description: "Replacement" },
      { key: "WFReplaceTextCaseSensitive", type: "boolean", description: "Case sensitive (default true)" },
      { key: "WFReplaceTextRegularExpression", type: "boolean", description: "Treat find as a regular expression" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.text.match",
    name: "Match Text",
    category: "Text",
    description: "Runs a regular expression over the input text and outputs the matches.",
    parameters: [
      { key: "WFMatchTextPattern", type: "string", required: true, description: "Regular expression" },
      { key: "WFMatchTextCaseSensitive", type: "boolean", description: "Case sensitive (default true)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.text.changecase",
    name: "Change Case",
    category: "Text",
    description: "Changes the case of the input text.",
    parameters: [
      { key: "WFCaseType", type: "string", required: true, description: "Target case", values: ["UPPERCASE", "lowercase", "Capitalize Every Word", "Capitalize with Title Case", "Capitalize with sentence case."] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.detect.date",
    name: "Get Dates from Input",
    category: "Text",
    description: "Extracts dates mentioned in the input text.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.detect.link",
    name: "Get URLs from Input",
    category: "Text",
    description: "Extracts URLs from the input.",
    parameters: [],
  }),

  // ── Numbers & math ───────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.number",
    name: "Number",
    category: "Math",
    description: "Outputs a number value.",
    parameters: [
      { key: "WFNumberActionNumber", type: "number", required: true, description: "The number", example: 25 },
    ],
  }),
  A({
    identifier: "is.workflow.actions.math",
    name: "Calculate",
    category: "Math",
    description: "Applies an operation to the input number.",
    parameters: [
      { key: "WFMathOperation", type: "string", required: true, description: "Operator", values: ["+", "-", "×", "÷"] },
      { key: "WFMathOperand", type: "number", required: true, description: "Second operand" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.calculateexpression",
    name: "Calculate Expression",
    category: "Math",
    description: "Evaluates a math expression string.",
    parameters: [
      { key: "Input", type: "text-or-variable", required: true, description: "Expression", example: "(8 * 3) + 2" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.format.number",
    name: "Format Number",
    category: "Math",
    description: "Formats the input number.",
    parameters: [
      { key: "WFNumberFormatDecimalPlaces", type: "number", description: "Decimal places", example: 2 },
    ],
  }),
  A({
    identifier: "is.workflow.actions.randomnumber",
    name: "Random Number",
    category: "Math",
    description: "Outputs a random integer in the inclusive range.",
    parameters: [
      { key: "WFRandomNumberMinimum", type: "number", required: true, description: "Minimum" },
      { key: "WFRandomNumberMaximum", type: "number", required: true, description: "Maximum" },
    ],
  }),

  // ── Lists & dictionaries ─────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.list",
    name: "List",
    category: "Scripting",
    description: "Outputs a fixed list of items.",
    parameters: [
      { key: "WFItems", type: "array", required: true, description: "Array of item strings", example: ["First", "Second"] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getitemfromlist",
    name: "Get Item from List",
    category: "Scripting",
    description: "Picks item(s) from the input list.",
    parameters: [
      { key: "WFItemSpecifier", type: "string", description: "Which item", values: ["First Item", "Last Item", "Random Item", "Item At Index", "Items in Range"] },
      { key: "WFItemIndex", type: "number", description: "1-based index when WFItemSpecifier is Item At Index" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.count",
    name: "Count",
    category: "Scripting",
    description: "Counts items, characters, words, sentences, or lines of the input.",
    parameters: [
      { key: "WFCountType", type: "string", description: "What to count", values: ["Items", "Characters", "Words", "Sentences", "Lines"] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.dictionary",
    name: "Dictionary",
    category: "Scripting",
    description: "Outputs a fixed key/value dictionary.",
    parameters: [
      { key: "WFItems", type: "dictionary", required: true, description: "Key/value pairs (string values)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getvalueforkey",
    name: "Get Dictionary Value",
    category: "Scripting",
    description: "Reads a key from the input dictionary (e.g. parsed JSON from Get Contents of URL).",
    parameters: [
      { key: "WFGetDictionaryValueType", type: "string", description: "Mode", values: ["Value", "All Keys", "All Values"] },
      { key: "WFDictionaryKey", type: "string", description: "Key to read (supports dot paths)" },
    ],
  }),

  // ── Date & time ──────────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.date",
    name: "Date",
    category: "Date",
    description: "Outputs the current date or a specified date.",
    parameters: [
      { key: "WFDateActionMode", type: "string", description: "Mode", values: ["Current Date", "Specified Date"] },
      { key: "WFDateActionDate", type: "string", description: "Date string when mode is Specified Date" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.format.date",
    name: "Format Date",
    category: "Date",
    description: "Formats the input date.",
    parameters: [
      { key: "WFDateFormatStyle", type: "string", description: "Date style", values: ["None", "Short", "Medium", "Long", "Relative", "Custom"] },
      { key: "WFTimeFormatStyle", type: "string", description: "Time style", values: ["None", "Short", "Medium", "Long"] },
      { key: "WFDateFormat", type: "string", description: "Custom format string when style is Custom", example: "yyyy-MM-dd" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.adjustdate",
    name: "Adjust Date",
    category: "Date",
    description: "Adds or subtracts an offset from the input date.",
    parameters: [
      { key: "WFAdjustOperation", type: "string", description: "Operation", values: ["Add", "Subtract", "Get Start of Day", "Get End of Day"] },
      { key: "WFDuration", type: "dictionary", description: "Offset: {\"Value\":{\"Magnitude\":25,\"Unit\":\"min\"},\"WFSerializationType\":\"WFQuantityFieldValue\"}" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.timer.start",
    name: "Start Timer",
    category: "Date",
    description: "Starts a Clock timer.",
    parameters: [
      { key: "WFDuration", type: "dictionary", required: true, description: "Duration: {\"Value\":{\"Magnitude\":25,\"Unit\":\"min\"},\"WFSerializationType\":\"WFQuantityFieldValue\"} — units: sec, min, hr" },
    ],
  }),

  // ── Calendar & reminders ─────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.addnewreminder",
    name: "Add New Reminder",
    category: "Calendar",
    description: "Creates a reminder.",
    parameters: [
      { key: "WFCalendarItemTitle", type: "text-or-variable", required: true, description: "Reminder title" },
      { key: "WFAlertEnabled", type: "boolean", description: "Add a date alert" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.addnewevent",
    name: "Add New Event",
    category: "Calendar",
    description: "Creates a calendar event.",
    parameters: [
      { key: "WFCalendarItemTitle", type: "text-or-variable", required: true, description: "Event title" },
      { key: "WFCalendarItemStartDate", type: "text-or-variable", description: "Start date/time" },
      { key: "WFCalendarItemEndDate", type: "text-or-variable", description: "End date/time" },
      { key: "WFCalendarDescriptor", type: "dictionary", description: "Target calendar; omit so the user's default is used" },
    ],
  }),

  // ── Location & weather ───────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.getcurrentlocation",
    name: "Get Current Location",
    category: "Location",
    description: "Outputs the device's current location.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.weather.currentconditions",
    name: "Get Current Weather",
    category: "Location",
    description: "Outputs current weather conditions at the input (or current) location.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.getdirections",
    name: "Show Directions",
    category: "Location",
    description: "Opens directions to the input destination in Maps.",
    parameters: [
      { key: "WFGetDirectionsActionMode", type: "string", description: "Travel mode", values: ["Driving", "Walking", "Transit", "Biking"] },
    ],
  }),

  // ── Music & media ────────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.playmusic",
    name: "Play Music",
    category: "Media",
    description: "Plays music. The specific song/playlist must be picked by the user — wire it through an import question or leave the picker empty so the editor prompts.",
    parameters: [],
    notes: "Playlist/track pickers serialize as opaque references; never hardcode them. Add an import question or instruct the user to tap the picker after install.",
  }),
  A({
    identifier: "is.workflow.actions.addmusictoupnext",
    name: "Add to Up Next",
    category: "Media",
    description: "Queues the input music after the current song.",
    parameters: [
      { key: "WFWhenToPlay", type: "string", description: "Queue position", values: ["Next", "Later"] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getcurrentsong",
    name: "Get Current Song",
    category: "Media",
    description: "Outputs the now-playing track.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.pausemusic",
    name: "Play/Pause",
    category: "Media",
    description: "Toggles, plays, or pauses playback on this device.",
    parameters: [
      { key: "WFPlayPauseBehavior", type: "string", description: "Behavior", values: ["Play/Pause", "Play", "Pause"] },
    ],
  }),

  // ── Camera & photos ──────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.takephoto",
    name: "Take Photo",
    category: "Media",
    description: "Opens the camera and captures a photo.",
    parameters: [
      { key: "WFCameraCaptureDevice", type: "string", description: "Camera", values: ["Front", "Back"] },
      { key: "WFCameraCaptureShowPreview", type: "boolean", description: "Show preview before accepting (default true)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.selectphoto",
    name: "Select Photos",
    category: "Media",
    description: "Lets the user pick photo(s) from the library.",
    parameters: [
      { key: "WFSelectMultiplePhotos", type: "boolean", description: "Allow multiple" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getlatestphotos",
    name: "Get Latest Photos",
    category: "Media",
    description: "Outputs the N most recent photos.",
    parameters: [
      { key: "WFGetLatestPhotoCount", type: "number", required: true, description: "How many", example: 1 },
    ],
  }),
  A({
    identifier: "is.workflow.actions.savetocameraroll",
    name: "Save to Photo Album",
    category: "Media",
    description: "Saves the input image(s) to Photos.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.image.resize",
    name: "Resize Image",
    category: "Media",
    description: "Resizes the input image.",
    parameters: [
      { key: "WFImageResizeWidth", type: "number", description: "Target width in px" },
      { key: "WFImageResizeHeight", type: "number", description: "Target height in px (omit to keep aspect)" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.image.convert",
    name: "Convert Image",
    category: "Media",
    description: "Converts the input image format.",
    parameters: [
      { key: "WFImageFormat", type: "string", description: "Format", values: ["JPEG", "PNG", "HEIF", "TIFF", "GIF", "PDF"] },
    ],
  }),

  // ── Sharing & clipboard ──────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.setclipboard",
    name: "Copy to Clipboard",
    category: "Sharing",
    description: "Copies the input to the clipboard.",
    parameters: [
      { key: "WFLocalOnly", type: "boolean", description: "Skip Handoff/Universal Clipboard" },
    ],
  }),
  A({
    identifier: "is.workflow.actions.getclipboard",
    name: "Get Clipboard",
    category: "Sharing",
    description: "Outputs the clipboard contents.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.share",
    name: "Share",
    category: "Sharing",
    description: "Opens the share sheet with the input.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.generatebarcode",
    name: "Generate QR Code",
    category: "Sharing",
    description: "Renders the input text as a QR code image.",
    parameters: [],
  }),
  A({
    identifier: "is.workflow.actions.scanbarcode",
    name: "Scan QR/Barcode",
    category: "Sharing",
    description: "Opens the camera to scan a code and outputs its payload.",
    parameters: [],
  }),

  // ── Data & encoding ──────────────────────────────────────────────────────
  A({
    identifier: "is.workflow.actions.base64encode",
    name: "Base64 Encode",
    category: "Data",
    description: "Base64 encodes or decodes the input.",
    parameters: [
      { key: "WFEncodeMode", type: "string", description: "Direction", values: ["Encode", "Decode"] },
    ],
  }),
  A({
    identifier: "is.workflow.actions.hash",
    name: "Generate Hash",
    category: "Data",
    description: "Hashes the input.",
    parameters: [
      { key: "WFHashType", type: "string", description: "Algorithm", values: ["MD5", "SHA1", "SHA256", "SHA512"] },
    ],
  }),
] as const;

/** Identifier → definition lookup */
export const ACTIONS_BY_ID: ReadonlyMap<string, ActionDefinition> = new Map(
  ACTIONS.map((a) => [a.identifier, a]),
);

/**
 * Capabilities Shortcuts cannot reach natively. The parse prompt cites these
 * so the model marks such requests partial/impossible instead of inventing
 * action identifiers.
 */
export const KNOWN_GAPS: readonly string[] = [
  "Personal automation TRIGGERS (time of day, arriving/leaving a location, app opens/closes, NFC, charger, Bluetooth connect) cannot be embedded in a .shortcut file. The shortcut holds the actions; the trigger must be created by hand in Shortcuts → Automation. Mark such requests 'partial' and describe the trigger setup in the build steps.",
  "Toggling arbitrary Settings panes (e.g. Always-On Display, specific notification settings) is not exposed to Shortcuts.",
  "Reading or sending messages from third-party apps (WhatsApp, Telegram, Slack…) depends on those apps' own Shortcuts actions and varies by app version — mark 'partial' and say which app must provide the action.",
  "Background execution without any user confirmation is limited; messages auto-send only from automations with 'Run Immediately' enabled.",
  "Interacting with arbitrary app UI (tapping buttons in other apps) is impossible.",
  "True scheduling/cron inside a shortcut is impossible — use a personal automation trigger instead.",
];

/**
 * Compact rendering of the catalog for the LLM system prompt.
 * One line per action keeps the token cost predictable.
 */
export function dictionaryForPrompt(): string {
  return ACTIONS.map((a) => {
    const params = a.parameters
      .map((p) => {
        const bits: string[] = [p.type];
        if (p.required) bits.push("required");
        if (p.values) bits.push(`one of: ${p.values.join(" | ")}`);
        return `${p.key} (${bits.join(", ")}) — ${p.description}`;
      })
      .join("; ");
    return `${a.identifier} — "${a.name}" [${a.category}]: ${a.description}${
      params ? ` PARAMS: ${params}` : " PARAMS: none"
    }${a.notes ? ` NOTE: ${a.notes}` : ""}`;
  }).join("\n");
}

/*
 * Changelog
 * 1.0.0 — Initial curated catalog: ~75 core actions across scripting, device
 *         state, communication, web, text, math, lists, dates, calendar,
 *         location, media, sharing, and data. Known-gaps list established.
 */
