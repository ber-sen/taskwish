import { createInterface, type Interface } from "node:readline";

export type ElicitOption = {
  value: string | number | boolean;
  label: string;
  description?: string;
};

export type ElicitInputMetadata = {
  description?: string;
  example?: unknown;
  elicit?: {
    label?: string;
    default?: unknown;
    hidden?: boolean;
    options?: readonly ElicitOption[];
  };
};

export type ElicitActionMetadata = {
  description?: string;
  elicit?: {
    title?: string;
  };
  input?: Record<string, string | ElicitInputMetadata>;
};

export type TerminalInputOptions = {
  positional?: boolean | number;
  short?: string;
};

export type TerminalElicitOptions<Output = unknown> = {
  command?: string;
  examples?: readonly string[];
  formatResult?: (result: Output) => string;
  input?: Record<string, TerminalInputOptions>;
  args?: readonly string[];
  stdin?: NodeJS.ReadableStream;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
  interactive?: boolean;
  /** Show the Taskwish mark before an interactive prompt. */
  logo?: boolean;
  /** Override automatic TTY color detection. */
  color?: boolean;
  setExitCode?: (code: number) => void;
};

type AnyAction = (...args: any[]) => any;
type ActionOutput<Action extends AnyAction> = Awaited<ReturnType<Action>>;

export type TerminalPromptField = {
  name: string;
  schema: unknown;
  optional: boolean;
  description?: string;
  elicit: NonNullable<ElicitInputMetadata["elicit"]>;
};

type Field = TerminalPromptField & {
  terminal: TerminalInputOptions;
};

export type TerminalPrompt = {
  ask(message: string): Promise<string>;
};

type ParsedArguments = {
  help: boolean;
  values: Record<string, unknown>;
  yes: boolean;
};

type BareActionMetadata = {
  meta?: unknown;
  inputSchema?: unknown;
};

const META = Symbol.for("TW.Meta");
const INPUT_SCHEMA = Symbol.for("TW.InputSchema");
const RAW_STREAM = Symbol.for("TW.RawStream");
const TASKWISH_ACCENT = "38;2;0;223;163";

export const TASKWISH_LOGO = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣷⣄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⣾⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⠟
⣠⣾⣷⣄⠀⠀⠀⣠⣾⣿⣿⣿⡿⠋⠀⢀⣴⣿⣦⡀⠀⠀⢀⣴⣿⣿⣿⣿⠟⠁⠀
⠻⣿⣿⣿⣷⣤⣾⣿⣿⣿⡿⠋⠀⠀⠀⠙⢿⣿⣿⣿⣦⣴⣿⣿⣿⣿⠟⠁⠀⠀⠀
⠀⠈⠻⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⣿⣿⣿⣿⠟⠁⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⠟
`;

const TASKWISH_LOGO_COLORED = `
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\x1b[1m⣠⣾⣿⣦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\x1b[38;5;244m⢀⣴⣿⣷⣄\x1b[0m
⠀⠀⠀⠀⠀⠀⠀⠀⠀\x1b[1m⣠⣾⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀\x1b[38;5;244m⢀⣴⣿⣿⣿⣿⠟\x1b[0m
\x1b[1m⣠⣾⣷⣄⠀⠀⠀⣠⣾⣿⣿⣿⡿⠋⠀\x1b[38;5;244m⢀⣴⣿⣦⡀⠀⠀\x1b[38;5;244m⢀⣴⣿⣿⣿⣿⠟⠁⠀\x1b[0m
\x1b[1m⠻⣿⣿⣿⣷⣤⣾⣿⣿⣿⡿⠋⠀⠀⠀\x1b[38;5;244m⠙⢿⣿⣿⣿⣦\x1b[38;5;244m⣴⣿⣿⣿⣿⠟⠁⠀⠀⠀\x1b[0m
⠀\x1b[1m⠈⠻⣿⣿⣿⣿⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀\x1b[38;5;244m⠙⢿⣿⣿⣿\x1b[38;5;244m⣿⣿⠟⠁⠀⠀⠀⠀⠀\x1b[0m
⠀⠀⠀\x1b[1m⠈⠻⣿⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\x1b[38;5;244m⠙⢿⣿\x1b[38;5;244m⠟\x1b[0m
`;

export function taskwishLogo(color = true): string {
  return color ? TASKWISH_LOGO_COLORED : TASKWISH_LOGO;
}

async function terminalElicit<Action extends AnyAction>(
  action: Action,
  options?: TerminalElicitOptions<ActionOutput<Action>>,
  positionalInputs: readonly string[] = [],
  shortInputs: readonly string[] = [],
): Promise<ActionOutput<Action> | undefined> {
    options ??= {};
    const stdin = options.stdin ?? process.stdin;
    const stdout = options.stdout ?? process.stdout;
    const stderr = options.stderr ?? process.stderr;
    const interactive =
      options.interactive ??
      (Boolean((stdin as NodeJS.ReadStream).isTTY) &&
        Boolean((stdout as NodeJS.WriteStream).isTTY));
    const setExitCode =
      options.setExitCode ?? ((code: number) => (process.exitCode = code));

    try {
      if (options.logo ?? interactive) {
        stdout.write(taskwishLogo(useColor(stdout, options.color)));
      }
      const metadata = readMetadata(action);
      const fields = readFields(
        action,
        metadata,
        options.input,
        positionalInputs,
        shortInputs,
      );
      const parsed = parseArguments(options.args ?? process.argv.slice(2), fields);

      if (parsed.help) {
        stdout.write(
          formatHelp(
            metadata,
            fields,
            options.command ?? "command",
            options.examples ?? [],
            stdout,
            options.color,
          ),
        );
        return undefined;
      }

      if (parsed.yes) {
        applyDefaults(parsed.values, fields);
      } else if (interactive) {
        await promptForValues(
          parsed.values,
          fields,
          metadata,
          stdin,
          stdout,
          options.color,
        );
      } else {
        const missing = fields.filter(
          (field) =>
            !field.elicit.hidden && parsed.values[field.name] === undefined,
        );
        if (missing.length > 0) {
          throw new Error(
            `Missing ${missing.map(fieldLabel).join(", ")}. Pass --yes to accept defaults or provide all options.`,
          );
        }
      }

      assertRequiredValues(parsed.values, fields);
      const result = await invoke(action, parsed.values, fields);
      printResult(result, options, stdout);
      return result;
    } catch (error) {
      stderr.write(
        `\n${paint(stderr, 31, "■", options.color)}  ${errorMessage(error)}\n`,
      );
      setExitCode(1);
      return undefined;
    }
}

export const Terminal = { elicit: terminalElicit };

function readMetadata(action: AnyAction): ElicitActionMetadata {
  const metadata =
    (action as unknown as Record<symbol, unknown>)[META] ??
    readBareMetadata(action)?.meta;
  if (metadata === null || typeof metadata !== "object") {
    throw new Error("Terminal.elicit requires action metadata.");
  }

  return metadata as ElicitActionMetadata;
}

function readFields(
  action: AnyAction,
  metadata: ElicitActionMetadata,
  terminalInput: Record<string, TerminalInputOptions> = {},
  positionalInputs: readonly string[] = [],
  shortInputs: readonly string[] = [],
): Field[] {
  const rawSchema =
    (action as unknown as Record<symbol, unknown>)[INPUT_SCHEMA] ??
    readBareMetadata(action)?.inputSchema;
  const schema =
    rawSchema !== null &&
    typeof rawSchema === "object" &&
    !Array.isArray(rawSchema)
      ? (rawSchema as Record<string, unknown>)
      : {};
  return fieldsFromSchema(
    schema,
    metadata,
    terminalInput,
    positionalInputs,
    shortInputs,
  );
}

function fieldsFromSchema(
  schema: Record<string, unknown>,
  metadata: ElicitActionMetadata,
  terminalInput: Record<string, TerminalInputOptions>,
  positionalInputs: readonly string[],
  shortInputs: readonly string[],
): Field[] {
  const inputMetadata = metadata.input ?? {};
  /** @type {string[]} */
  const names: string[] = [];

  for (const name of Object.keys(inputMetadata)) names.push(name);
  for (const schemaName of Object.keys(schema)) {
    const name = schemaName.replace(/\?$/, "");
    if (!names.includes(name)) names.push(name);
  }

  return names.map((name) => {
    const schemaName = Object.hasOwn(schema, name) ? name : `${name}?`;
    const value = inputMetadata[name];
    const normalized =
      typeof value === "string" ? { description: value } : (value ?? {});

    return {
      name,
      schema: schema[schemaName],
      optional: schemaName.endsWith("?"),
      description: normalized.description,
      elicit: normalized.elicit ?? {},
      terminal:
        terminalInput[name] ??
        staticInputOptions(name, positionalInputs, shortInputs),
    };
  });
}

function staticInputOptions(
  name: string,
  positionalInputs: readonly string[],
  shortInputs: readonly string[],
): TerminalInputOptions {
  const shortIndex = shortInputs.indexOf(name);
  return {
    positional: positionalInputs.includes(name),
    short: shortIndex === -1 ? undefined : shortInputs[shortIndex + 1],
  };
}

function readBareMetadata(action: AnyAction): BareActionMetadata | undefined {
  const value = (action as AnyAction & { __taskwish?: unknown }).__taskwish;
  return value !== null && typeof value === "object"
    ? (value as BareActionMetadata)
    : undefined;
}

function parseArguments(args: readonly string[], fields: Field[]): ParsedArguments {
  /** @type {Record<string, any>} */
  const values: Record<string, unknown> = {};
  const positionals = fields
    .filter((field) => field.terminal.positional)
    .sort((left, right) => positionalOrder(left) - positionalOrder(right));
  let positionalIndex = 0;
  let help = false;
  let yes = false;

  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;

    if (argument === "--help" || argument === "-h") {
      help = true;
      continue;
    }
    if (argument === "--yes" || argument === "-y") {
      yes = true;
      continue;
    }
    if (argument.startsWith("--no-")) {
      const name = argument.slice("--no-".length);
      const field = fields.find(
        (candidate) => kebabCase(candidate.name) === name,
      );
      if (!field || !isBooleanField(field)) {
        throw new Error(`Unknown option: ${argument}`);
      }
      values[field.name] = false;
      continue;
    }
    if (argument.startsWith("--")) {
      const equals = argument.indexOf("=");
      const name = argument.slice(2, equals === -1 ? undefined : equals);
      const field = fields.find(
        (candidate) => kebabCase(candidate.name) === name,
      );
      if (!field || field.elicit.hidden) {
        throw new Error(`Unknown option: --${name}`);
      }
      if (isBooleanField(field) && equals === -1) {
        values[field.name] = true;
      } else {
        const value =
          equals === -1
            ? readArgumentValue(args, ++index, `--${name}`)
            : argument.slice(equals + 1);
        values[field.name] = parseValue(field, value, `--${name}`);
      }
      continue;
    }
    if (argument.startsWith("-") && argument !== "-") {
      const short = argument.slice(1);
      const field = fields.find(
        (candidate) => candidate.terminal.short === short,
      );
      if (!field || field.elicit.hidden) {
        throw new Error(`Unknown option: ${argument}`);
      }
      if (isBooleanField(field)) {
        values[field.name] = true;
      } else {
        values[field.name] = parseValue(
          field,
          readArgumentValue(args, ++index, argument),
          argument,
        );
      }
      continue;
    }

    const field = positionals[positionalIndex++];
    if (!field) throw new Error(`Unexpected argument: ${argument}`);
    values[field.name] = parseValue(field, argument, fieldLabel(field));
  }

  return { help, values, yes };
}

function applyDefaults(values: Record<string, unknown>, fields: Field[]): void {
  for (const field of fields) {
    if (field.elicit.hidden || values[field.name] !== undefined) continue;
    if (field.elicit.default !== undefined) {
      values[field.name] = field.elicit.default;
    }
  }
}

async function promptForValues(
  values: Record<string, unknown>,
  fields: readonly TerminalPromptField[],
  metadata: ElicitActionMetadata,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  color?: boolean,
): Promise<void> {
  const prompt = new LinePrompt(input, output);
  const title = metadata.elicit?.title ?? metadata.description ?? "Run action";
  output.write(
    `\n${paint(output, 30, "┌", color)}  ${paint(output, TASKWISH_ACCENT, title, color)}\n`,
  );

  try {
    for (const field of fields) {
      if (field.elicit.hidden || values[field.name] !== undefined) continue;
      values[field.name] = await promptField(prompt, field, output, color);
    }
  } finally {
    prompt.close();
  }
}

/** Prompt a statically described set of fields without invoking an action. */
export async function promptFields(
  fields: readonly TerminalPromptField[],
  values: Record<string, unknown>,
  title = "Run action",
): Promise<Record<string, unknown>> {
  await promptForValues(
    values,
    fields,
    { elicit: { title } },
    process.stdin,
    process.stdout,
  );
  return values;
}

export async function promptField(
  prompt: TerminalPrompt,
  field: TerminalPromptField,
  output: NodeJS.WritableStream = process.stdout,
  color?: boolean,
): Promise<unknown> {
  const options = field.elicit.options;
  const label = promptLabel(field);

  if (options && options.length > 0) {
    output.write(
      `${paint(output, 90, "│", color)}\n${paint(output, TASKWISH_ACCENT, "◆", color)}  ${label}\n`,
    );
    options.forEach((option, index) => {
      const description = option.description ? ` — ${option.description}` : "";
      output.write(
        `${paint(output, 90, "│", color)}  ${paint(output, TASKWISH_ACCENT, `${index + 1}.`, color)} ${option.label}${paint(output, 90, description, color)}\n`,
      );
    });
    const defaultIndex = options.findIndex(
      (option) => option.value === field.elicit.default,
    );

    while (true) {
      const answer = (
        await prompt.ask(
          `${paint(output, 90, "│", color)}  Select${defaultIndex >= 0 ? ` ${paint(output, 90, `[${defaultIndex + 1}]`, color)}` : ""}: `,
        )
      ).trim();
      if (!answer && defaultIndex >= 0) return options[defaultIndex]!.value;
      const option = options[Number(answer) - 1];
      if (option) return option.value;
      output.write(
        `${paint(output, 90, "│", color)}  ${paint(output, 33, `Enter a number from 1 to ${options.length}.`, color)}\n`,
      );
    }
  }

  if (isBooleanField(field)) {
    const defaultValue = field.elicit.default;
    const hint = defaultValue === true ? "Y/n" : defaultValue === false ? "y/N" : "y/n";

    while (true) {
      const answer = (
        await prompt.ask(
          `${paint(output, 90, "│", color)}\n${paint(output, TASKWISH_ACCENT, "◆", color)}  ${label} ${paint(output, 90, `(${hint})`, color)}\n${paint(output, 90, "│", color)}  `,
        )
      )
        .trim()
        .toLowerCase();
      if (!answer && typeof defaultValue === "boolean") return defaultValue;
      if (answer === "y" || answer === "yes") return true;
      if (answer === "n" || answer === "no") return false;
      output.write(
        `${paint(output, 90, "│", color)}  ${paint(output, 33, "Enter yes or no.", color)}\n`,
      );
    }
  }

  while (true) {
    const defaultValue = field.elicit.default;
    const hint = defaultValue === undefined ? "" : ` (${String(defaultValue)})`;
    const answer = (
      await prompt.ask(
        `${paint(output, 90, "│", color)}\n${paint(output, TASKWISH_ACCENT, "◆", color)}  ${label}${paint(output, 90, hint, color)}\n${paint(output, 90, "│", color)}  `,
      )
    ).trim();
    if (answer) return parseValue(field, answer, label);
    if (defaultValue !== undefined) return defaultValue;
    if (field.optional) return undefined;
    output.write(
      `${paint(output, 90, "│", color)}  ${paint(output, 33, "A value is required.", color)}\n`,
    );
  }
}

class LinePrompt implements TerminalPrompt {
  readonly #interface: Interface;
  readonly #lines: AsyncIterator<string>;
  readonly #output: NodeJS.WritableStream;

  constructor(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
    this.#interface = createInterface({ input, output, terminal: false });
    this.#lines = this.#interface[Symbol.asyncIterator]();
    this.#output = output;
  }

  async ask(message: string): Promise<string> {
    this.#output.write(message);
    const line = await this.#lines.next();
    if (line.done) throw new Error("Terminal prompt cancelled.");
    return line.value;
  }

  close(): void {
    this.#interface.close();
  }
}

function assertRequiredValues(values: Record<string, unknown>, fields: Field[]): void {
  const missing = fields.filter(
    (field) =>
      !field.elicit.hidden &&
      !field.optional &&
      values[field.name] === undefined,
  );
  if (missing.length > 0) {
    throw new Error(`Missing ${missing.map(fieldLabel).join(", ")}.`);
  }
}

async function invoke<Action extends AnyAction>(
  action: Action,
  values: Record<string, unknown>,
  fields: Field[],
): Promise<ActionOutput<Action>> {
  const args = fields.length === 0 ? [] : [values];
  const rawStream = (action as unknown as Record<symbol, unknown>)[RAW_STREAM];
  if (typeof rawStream !== "function") {
    return action(...args) as ActionOutput<Action>;
  }

  const stream = rawStream(...args) as AsyncGenerator<
    unknown,
    ActionOutput<Action>
  >;
  let item = await stream.next();
  while (!item.done) item = await stream.next();
  return item.value;
}

function printResult(
  result: unknown,
  options: TerminalElicitOptions<any>,
  output: NodeJS.WritableStream,
): void {
  const formatter = options.formatResult;
  const formatted = formatter
    ? formatter(result)
    : result === undefined
      ? "Done"
      : typeof result === "string"
        ? result
        : JSON.stringify(result, null, 2);
  const [first = "Done", ...rest] = formatted.split("\n");
  output.write(
    `${paint(output, 90, "│", options.color)}\n${paint(output, 30, "└", options.color)}  ${paint(output, TASKWISH_ACCENT, first, options.color)}\n`,
  );
  if (rest.length > 0) output.write(`${rest.join("\n")}\n`);
}

function formatHelp(
  metadata: ElicitActionMetadata,
  fields: Field[],
  command: string,
  examples: readonly string[],
  output: NodeJS.WritableStream,
  color?: boolean,
): string {
  const positionals = fields
    .filter((field) => field.terminal.positional && !field.elicit.hidden)
    .sort((left, right) => positionalOrder(left) - positionalOrder(right));
  const usagePositionals = positionals
    .map((field) =>
      field.optional || field.elicit.default !== undefined
        ? `[${kebabCase(field.name)}]`
        : `<${kebabCase(field.name)}>`,
    )
    .join(" ");
  const lines = [
    `${paint(output, TASKWISH_ACCENT, "Usage:", color)} ${command}${usagePositionals ? ` ${usagePositionals}` : ""} [options]`,
    "",
    metadata.description ?? "Run a TaskWish action.",
  ];

  if (positionals.length > 0) {
    lines.push("", paint(output, TASKWISH_ACCENT, "Arguments:", color));
    for (const field of positionals) {
      lines.push(`  ${kebabCase(field.name).padEnd(20)} ${field.description ?? fieldLabel(field)}`);
    }
  }

  lines.push("", paint(output, TASKWISH_ACCENT, "Options:", color));
  for (const field of fields) {
    if (field.elicit.hidden || field.terminal.positional) continue;
    const long = `--${kebabCase(field.name)}`;
    const flag = isBooleanField(field) ? `${long}, --no-${kebabCase(field.name)}` : `${long} <value>`;
    const prefix = field.terminal.short ? `-${field.terminal.short}, ` : "    ";
    const choices = field.elicit.options?.map((option) => option.value).join(", ");
    const description = [field.description ?? fieldLabel(field), choices ? `(${choices})` : ""]
      .filter(Boolean)
      .join(" ");
    lines.push(`  ${(prefix + flag).padEnd(34)} ${description}`);
  }
  lines.push(
    `  ${"-y, --yes".padEnd(34)} Accept all defaults`,
    `  ${"-h, --help".padEnd(34)} Show this help`,
  );

  if (examples.length > 0) {
    lines.push(
      "",
      paint(output, TASKWISH_ACCENT, "Examples:", color),
      ...examples.map((example) => `  ${paint(output, 90, example, color)}`),
    );
  }

  return `${lines.join("\n")}\n`;
}

function parseValue(
  field: TerminalPromptField,
  value: string,
  source: string,
): unknown {
  const options = field.elicit.options;
  if (options && options.length > 0) {
    const option = options.find((candidate) => String(candidate.value) === value);
    if (!option) {
      throw new Error(
        `Invalid value "${value}" for ${source}. Choose ${options.map((candidate) => candidate.value).join(", ")}.`,
      );
    }
    return option.value;
  }
  if (isNumberField(field)) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(`Invalid number "${value}" for ${source}.`);
    }
    return number;
  }
  return value;
}

function isBooleanField(field: TerminalPromptField): boolean {
  return (
    field.schema === "boolean" ||
    typeof field.elicit.default === "boolean" ||
    (field.elicit.options?.length ?? 0) > 0 &&
      field.elicit.options!.every((option) => typeof option.value === "boolean")
  );
}

function isNumberField(field: TerminalPromptField): boolean {
  return field.schema === "number" || typeof field.elicit.default === "number";
}

function positionalOrder(field: Field): number {
  return typeof field.terminal.positional === "number"
    ? field.terminal.positional
    : Number.MAX_SAFE_INTEGER;
}

function fieldLabel(field: TerminalPromptField): string {
  return (field.elicit.label ?? field.description ?? humanize(field.name))
    .replace(/[?.!]$/, "")
    .toLowerCase();
}

function promptLabel(field: TerminalPromptField): string {
  const label = field.elicit.label ?? field.description ?? humanize(field.name);
  return isBooleanField(field) && !/[?.!]$/.test(label) ? `${label}?` : label;
}

function humanize(value: string): string {
  const spaced = value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function kebabCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .toLowerCase();
}

function readArgumentValue(
  args: readonly string[],
  index: number,
  option: string,
): string {
  const value = args[index];
  if (value === undefined) throw new Error(`Missing value for ${option}.`);
  return value;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function useColor(output: NodeJS.WritableStream, override?: boolean): boolean {
  if (override !== undefined) return override;
  if (process.env.NO_COLOR !== undefined || process.env.FORCE_COLOR === "0") {
    return false;
  }
  return process.env.FORCE_COLOR !== undefined ||
    Boolean((output as NodeJS.WriteStream).isTTY);
}

function paint(
  output: NodeJS.WritableStream,
  code: number | string,
  value: string,
  override?: boolean,
): string {
  return useColor(output, override) ? `\x1b[${code}m${value}\x1b[0m` : value;
}
