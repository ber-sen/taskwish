import type { ActorDef, BehaviorDef, StepDef } from "./types";

// ---------------------------------------------------------------------------
// Value serialisation
// ---------------------------------------------------------------------------

/**
 * Converts a DSL string value to its TypeScript representation:
 *
 * - `"@{x}"` (full reference)   → `this.x`
 * - `"foo @{x} bar"` (partial)  → `` `foo ${this.x} bar` ``
 * - anything else               → `"quoted string"`
 */
function formatStringValue(value: string): string {
  // Full reference — entire value is a single @{…} token
  if (/^@\{([^}]+)\}$/.test(value)) {
    return `this.${value.slice(2, -1)}`;
  }

  // Partial reference — contains at least one @{…} inside other text
  if (/@\{[^}]+\}/.test(value)) {
    const tpl = value
      .replace(/\\/g, "\\\\")
      .replace(/`/g, "\\`")
      .replace(/\$\{/g, "\\${")
      .replace(/@\{([^}]+)\}/g, "${this.$1}");
    return `\`${tpl}\``;
  }

  // Plain string
  return JSON.stringify(value);
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return formatStringValue(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value === null) return "null";
  // Fallback for nested objects — serialize via JSON (rare in the DSL)
  return JSON.stringify(value);
}

// ---------------------------------------------------------------------------
// Step code generation
// ---------------------------------------------------------------------------

/**
 * Resolves a DSL action name to its `this.actions.*` call path.
 *
 * - `"generateText"`    → `"this.actions.generateText"`
 * - `"Slack.sendMessage"` → `"this.actions.slack.sendMessage"`
 */
function resolveAction(action: string): string {
  const dot = action.indexOf(".");
  if (dot === -1) return `this.actions.${action}`;
  const ns = action.slice(0, dot).toLowerCase();
  const method = action.slice(dot + 1);
  return `this.actions.${ns}.${method}`;
}

function formatStep(step: StepDef): string {
  const name = step["="];
  const action = resolveAction(step["$"]);

  // Collect params — skip DSL meta-keys
  const params: Array<[string, unknown]> = Object.entries(step).filter(
    ([k]) => k !== "$" && k !== "=",
  );

  const stepIndent = "    "; // 4 spaces
  const bodyIndent = "      "; // 6 spaces
  const paramIndent = "        "; // 8 spaces

  let returnExpr: string;

  if (params.length === 0) {
    returnExpr = `${bodyIndent}return ${action}();`;
  } else {
    const paramLines = params
      .map(([k, v]) => `${paramIndent}${k}: ${formatValue(v)},`)
      .join("\n");
    returnExpr = [
      `${bodyIndent}return ${action}({`,
      paramLines,
      `${bodyIndent}});`,
    ].join("\n");
  }

  return [
    `${stepIndent}Step("${name}", function () {`,
    returnExpr,
    `${stepIndent}}),`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Behavior code generation
// ---------------------------------------------------------------------------

function formatBehavior(actorName: string, behavior: BehaviorDef): string {
  const trigger = behavior[">"];
  const steps = behavior.run ?? [];

  let actionName: string;
  let onCall: string;

  if (trigger === "Command") {
    actionName = behavior["="] ?? "run";
    onCall = `  .on("Command", "${actionName}")`;
  } else {
    actionName = `on${trigger}`;
    onCall = `  .on("${trigger}")`;
  }

  const formattedSteps = steps.map(formatStep);

  // Interleave steps with a 4-space blank line (matches the step indent level).
  // A truly empty "" gives a blank line between .on() and .run().
  const stepsWithSeparators = formattedSteps.flatMap((s, i) =>
    i === 0 ? [s] : ["    ", s],
  );

  return [
    `const { ${actionName} } = ${actorName}()`,
    onCall,
    ``, // blank line between .on() and .run()
    `  .run(`,
    ...stepsWithSeparators,
    `  );`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts a Taskwish JSON actor definition to a TypeScript code string.
 *
 * @example
 * ```ts
 * convert({
 *   $: "Actor",
 *   "=": "SneakyConductor",
 *   behaviors: [{ ">": "Command", run: [...] }],
 * });
 * // → 'const { SneakyConductor } = Actor("SneakyConductor");\n\n...'
 * ```
 */
export function convert(def: ActorDef): string {
  const actorName = def["="];
  const behaviors = def.behaviors ?? [];

  const parts: string[] = [
    `const { ${actorName} } = Actor("${actorName}");`,
  ];

  for (const behavior of behaviors) {
    parts.push(""); // blank line between sections
    parts.push(formatBehavior(actorName, behavior));
  }

  return parts.join("\n");
}
