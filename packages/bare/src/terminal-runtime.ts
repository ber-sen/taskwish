/**
 * Runtime emitted into a transformed entrypoint. It deliberately owns argument
 * parsing and action invocation; only the low-level prompt and logo rendering
 * stay linked to @taskwish/terminal.
 */
export const TERMINAL_RUNTIME = String.raw`
type __TaskwishTerminalField = {
  name: string;
  schema: unknown;
  optional: boolean;
  description?: string;
  elicit: {
    label?: string;
    default?: unknown;
    hidden?: boolean;
    options?: readonly {
      value: string | number | boolean;
      label: string;
      description?: string;
    }[];
  };
  position: number;
  short?: string;
};

type __TaskwishTerminalOptions<Action extends (...args: any[]) => any> = {
  command: string;
  examples: readonly string[];
  formatResult: (result: Awaited<ReturnType<Action>>) => string;
  positionalInputs: readonly string[];
  shortInputs: readonly string[];
};

function __taskwishUseColor(): boolean {
  if (process.env.NO_COLOR !== undefined || process.env.FORCE_COLOR === "0") return false;
  return process.env.FORCE_COLOR !== undefined || Boolean(process.stdout.isTTY);
}

const __TASKWISH_ACCENT = "38;2;0;223;163";

function __taskwishPaint(code: string, value: string): string {
  return __taskwishUseColor() ? "\x1b[" + code + "m" + value + "\x1b[0m" : value;
}

function __taskwishHumanize(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function __taskwishKebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[_\s]+/g, "-").toLowerCase();
}

function __taskwishLabel(field: __TaskwishTerminalField): string {
  return String(field.elicit.label ?? field.description ?? __taskwishHumanize(field.name))
    .replace(/[?.!]$/, "")
    .toLowerCase();
}

function __taskwishPromptLabel(field: __TaskwishTerminalField): string {
  const label = field.elicit.label ?? field.description ?? __taskwishHumanize(field.name);
  return __taskwishBoolean(field) && !/[?.!]$/.test(label) ? label + "?" : label;
}

function __taskwishBoolean(field: __TaskwishTerminalField): boolean {
  return field.schema === "boolean" ||
    typeof field.elicit.default === "boolean" ||
    Boolean(field.elicit.options?.length) && field.elicit.options!.every((option) => typeof option.value === "boolean");
}

function __taskwishValue(field: __TaskwishTerminalField, value: string, source: string): unknown {
  const options = field.elicit.options;
  if (options?.length) {
    const option = options.find((candidate) => String(candidate.value) === value);
    if (!option) {
      throw new Error("Invalid value \"" + value + "\" for " + source + ". Choose " + options.map((item) => item.value).join(", ") + ".");
    }
    return option.value;
  }
  if (field.schema === "number" || typeof field.elicit.default === "number") {
    const number = Number(value);
    if (!Number.isFinite(number)) throw new Error("Invalid number \"" + value + "\" for " + source + ".");
    return number;
  }
  return value;
}

function __taskwishArguments(args: readonly string[], fields: __TaskwishTerminalField[]) {
  const values: Record<string, unknown> = {};
  const positionals = fields
    .filter((field) => field.position >= 0)
    .sort((left, right) => left.position - right.position);
  let positionalIndex = 0;
  let help = false;
  let yes = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === "--help" || argument === "-h") { help = true; continue; }
    if (argument === "--yes" || argument === "-y") { yes = true; continue; }
    if (argument.startsWith("--no-")) {
      const name = argument.slice(5);
      const field = fields.find((item) => __taskwishKebab(item.name) === name);
      if (!field || !__taskwishBoolean(field)) throw new Error("Unknown option: " + argument);
      values[field.name] = false;
      continue;
    }
    if (argument.startsWith("--")) {
      const equals = argument.indexOf("=");
      const name = equals < 0 ? argument.slice(2) : argument.slice(2, equals);
      const field = fields.find((item) => __taskwishKebab(item.name) === name);
      if (!field || field.elicit.hidden) throw new Error("Unknown option: --" + name);
      if (__taskwishBoolean(field) && equals < 0) values[field.name] = true;
      else {
        const value = equals < 0 ? args[++index] : argument.slice(equals + 1);
        if (value === undefined) throw new Error("Missing value for --" + name + ".");
        values[field.name] = __taskwishValue(field, value, "--" + name);
      }
      continue;
    }
    if (argument.startsWith("-") && argument !== "-") {
      const field = fields.find((item) => item.short === argument.slice(1));
      if (!field || field.elicit.hidden) throw new Error("Unknown option: " + argument);
      if (__taskwishBoolean(field)) values[field.name] = true;
      else {
        const value = args[++index];
        if (value === undefined) throw new Error("Missing value for " + argument + ".");
        values[field.name] = __taskwishValue(field, value, argument);
      }
      continue;
    }
    const field = positionals[positionalIndex++];
    if (!field) throw new Error("Unexpected argument: " + argument);
    values[field.name] = __taskwishValue(field, argument, __taskwishLabel(field));
  }
  return { help, values, yes };
}

function __taskwishHelp(description: string | undefined, fields: __TaskwishTerminalField[], command: string, examples: readonly string[]): string {
  const positionals = fields
    .filter((field) => field.position >= 0 && !field.elicit.hidden)
    .sort((left, right) => left.position - right.position);
  const usage = positionals.map((field) => field.optional || field.elicit.default !== undefined ? "[" + __taskwishKebab(field.name) + "]" : "<" + __taskwishKebab(field.name) + ">").join(" ");
  const lines: string[] = [__taskwishPaint(__TASKWISH_ACCENT, "Usage:") + " " + command + (usage ? " " + usage : "") + " [options]", "", description ?? "Run a Taskwish action."];
  if (positionals.length) {
    lines.push("", __taskwishPaint(__TASKWISH_ACCENT, "Arguments:"));
    for (const field of positionals) lines.push("  " + __taskwishKebab(field.name).padEnd(20) + " " + (field.description ?? __taskwishLabel(field)));
  }
  lines.push("", __taskwishPaint(__TASKWISH_ACCENT, "Options:"));
  for (const field of fields) {
    if (field.elicit.hidden || field.position >= 0) continue;
    const long = "--" + __taskwishKebab(field.name);
    const flag = __taskwishBoolean(field) ? long + ", --no-" + __taskwishKebab(field.name) : long + " <value>";
    const prefix = field.short ? "-" + field.short + ", " : "    ";
    const choices = field.elicit.options?.map((option) => option.value).join(", ");
    const description = (field.description ?? __taskwishLabel(field)) + (choices ? " (" + choices + ")" : "");
    lines.push("  " + (prefix + flag).padEnd(34) + " " + description);
  }
  lines.push("  " + "-y, --yes".padEnd(34) + " Accept all defaults", "  " + "-h, --help".padEnd(34) + " Show this help");
  if (examples.length) {
    lines.push("", __taskwishPaint(__TASKWISH_ACCENT, "Examples:"));
    for (const example of examples) lines.push("  " + __taskwishPaint("90", example));
  }
  return lines.join("\n") + "\n";
}

function __taskwishAsk(readline: ReturnType<typeof createInterface>, message: string): Promise<string> {
  return new Promise((resolve) => readline.question(message, resolve));
}

async function __taskwishPromptField(readline: ReturnType<typeof createInterface>, field: __TaskwishTerminalField): Promise<unknown> {
  const options = field.elicit.options;
  const label = __taskwishPromptLabel(field);

  if (options && options.length > 0) {
    process.stdout.write(__taskwishPaint("90", "\u2502") + "\n" + __taskwishPaint(__TASKWISH_ACCENT, "\u25c6") + "  " + label + "\n");
    for (let index = 0; index < options.length; index++) {
      const option = options[index]!;
      const description = option.description ? " \u2014 " + option.description : "";
      process.stdout.write(__taskwishPaint("90", "\u2502") + "  " + __taskwishPaint(__TASKWISH_ACCENT, String(index + 1) + ".") + " " + option.label + __taskwishPaint("90", description) + "\n");
    }
    const defaultValue = field.elicit.default as string | number | boolean | undefined;
    const defaultIndex = defaultValue === undefined
      ? -1
      : options.findIndex((option) => String(option.value) === String(defaultValue));
    while (true) {
      const hint = defaultIndex >= 0 ? " " + __taskwishPaint("90", "[" + String(defaultIndex + 1) + "]") : "";
      const answer = (await __taskwishAsk(readline, __taskwishPaint("90", "\u2502") + "  Select" + hint + ": ")).trim();
      if (!answer && defaultIndex >= 0) return options[defaultIndex]!.value;
      const selected = Number(answer) - 1;
      if (selected >= 0 && selected < options.length) return options[selected]!.value;
      process.stdout.write(__taskwishPaint("90", "\u2502") + "  Enter a number from 1 to " + String(options.length) + ".\n");
    }
  }

  if (__taskwishBoolean(field)) {
    const defaultValue = field.elicit.default;
    const hint = defaultValue === true ? "Y/n" : defaultValue === false ? "y/N" : "y/n";
    while (true) {
      const answer = (await __taskwishAsk(readline, __taskwishPaint("90", "\u2502") + "\n" + __taskwishPaint(__TASKWISH_ACCENT, "\u25c6") + "  " + label + " " + __taskwishPaint("90", "(" + hint + ")") + "\n" + __taskwishPaint("90", "\u2502") + "  ")).trim().toLowerCase();
      if (!answer && typeof defaultValue === "boolean") return defaultValue;
      if (answer === "y" || answer === "yes") return true;
      if (answer === "n" || answer === "no") return false;
      process.stdout.write(__taskwishPaint("90", "\u2502") + "  Enter yes or no.\n");
    }
  }

  while (true) {
    const defaultValue = field.elicit.default;
    const hint = defaultValue === undefined ? "" : " (" + String(defaultValue) + ")";
    const answer = (await __taskwishAsk(readline, __taskwishPaint("90", "\u2502") + "\n" + __taskwishPaint(__TASKWISH_ACCENT, "\u25c6") + "  " + label + __taskwishPaint("90", hint) + "\n" + __taskwishPaint("90", "\u2502") + "  ")).trim();
    if (answer) return __taskwishValue(field, answer, label);
    if (defaultValue !== undefined) return defaultValue;
    if (field.optional) return undefined;
    process.stdout.write(__taskwishPaint("90", "\u2502") + "  A value is required.\n");
  }
}

async function __taskwishPrompt(values: Record<string, unknown>, fields: __TaskwishTerminalField[], title: string): Promise<void> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  process.stdout.write("\n" + __taskwishPaint("30", "\u250c") + "  " + __taskwishPaint(__TASKWISH_ACCENT, title) + "\n");
  try {
    for (const field of fields) {
      if (!field.elicit.hidden && values[field.name] === undefined) values[field.name] = await __taskwishPromptField(readline, field);
    }
  } finally {
    readline.close();
  }
}

`;
