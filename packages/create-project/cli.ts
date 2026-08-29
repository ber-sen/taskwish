#!/usr/bin/env bun

import { createInterface, type Interface } from "node:readline";

import { CreateProject } from "./src/create-project";

type TemplateName = "empty" | "todo" | "customer-support";

type CliOptions = {
  projectName?: string;
  template?: TemplateName;
  install?: boolean;
  git?: boolean;
  yes: boolean;
};

const templates: Array<{
  name: TemplateName;
  label: string;
  description: string;
}> = [
  {
    name: "empty",
    label: "Empty",
    description: "A minimal TaskWish actor ready for your first action",
  },
  {
    name: "todo",
    label: "Todo",
    description: "Todo and activity actors with stateful actions",
  },
  {
    name: "customer-support",
    label: "Customer support",
    description: "Customers, tickets, and support actors working together",
  },
];

export function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = { yes: false };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;

    if (arg === "--template" || arg === "-t") {
      options.template = parseTemplate(readValue(args, ++index, arg));
    } else if (arg === "--install") {
      options.install = true;
    } else if (arg === "--no-install") {
      options.install = false;
    } else if (arg === "--git") {
      options.git = true;
    } else if (arg === "--no-git") {
      options.git = false;
    } else if (arg === "--yes" || arg === "-y") {
      options.yes = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (options.projectName) {
      throw new Error(`Unexpected argument: ${arg}`);
    } else {
      options.projectName = arg;
    }
  }

  return options;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(args);

  if (options.yes) {
    if (options.projectName === undefined) {
      options.projectName = "my-taskwish-app";
    }
    if (options.template === undefined) options.template = "empty";
    if (options.install === undefined) options.install = true;
    if (options.git === undefined) options.git = true;
  } else if (!process.stdin.isTTY || !process.stdout.isTTY) {
    const missing: string[] = [];
    if (!options.projectName) missing.push("project directory");
    if (!options.template) missing.push("template");
    if (options.install === undefined) missing.push("install preference");
    if (options.git === undefined) missing.push("git preference");

    if (missing.length > 0) {
      throw new Error(
        `Missing ${missing.join(", ")}. Pass --yes to accept defaults or provide all options.`,
      );
    }
  } else {
    await promptForMissingOptions(options);
  }

  const result = await CreateProject.createProject({
    projectName: options.projectName!,
    template: options.template!,
    install: options.install!,
    git: options.git!,
  });

  console.log(`\nCreated a new TaskWish project in ${result.directory}`);
  console.log(`\nNext steps:\n  cd ${result.relativeDirectory}`);
  if (!result.installed) console.log("  bun install");
  console.log("  bun start\n");
}

async function promptForMissingOptions(options: CliOptions): Promise<void> {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("\nCreate a new TaskWish project\n");

    if (options.projectName === undefined) {
      options.projectName = await askText(
        prompt,
        "Project directory",
        "my-taskwish-app",
      );
    }
    if (options.template === undefined) {
      options.template = await askTemplate(prompt);
    }
    if (options.install === undefined) {
      options.install = await askBoolean(prompt, "Install dependencies?", true);
    }
    if (options.git === undefined) {
      options.git = await askBoolean(
        prompt,
        "Initialize a git repository?",
        true,
      );
    }
  } finally {
    prompt.close();
  }
}

async function askText(
  prompt: Interface,
  label: string,
  defaultValue: string,
): Promise<string> {
  const answer = (await question(prompt, `${label} (${defaultValue}): `)).trim();
  return answer || defaultValue;
}

async function askTemplate(
  prompt: Interface,
): Promise<TemplateName> {
  console.log("Select a template:");
  templates.forEach((template, index) => {
    console.log(`  ${index + 1}. ${template.label} — ${template.description}`);
  });

  while (true) {
    const answer = (await question(prompt, "Template (1): ")).trim() || "1";
    const selected = templates[Number(answer) - 1];
    if (selected) return selected.name;
    console.log(`Enter a number from 1 to ${templates.length}.`);
  }
}

async function askBoolean(
  prompt: Interface,
  label: string,
  defaultValue: boolean,
): Promise<boolean> {
  const hint = defaultValue ? "Y/n" : "y/N";

  while (true) {
    const answer = (await question(prompt, `${label} (${hint}): `))
      .trim()
      .toLowerCase();
    if (!answer) return defaultValue;
    if (answer === "y" || answer === "yes") return true;
    if (answer === "n" || answer === "no") return false;
    console.log("Enter yes or no.");
  }
}

function question(prompt: Interface, message: string): Promise<string> {
  return new Promise((resolve) => prompt.question(message, resolve));
}

function parseTemplate(value: string): TemplateName {
  if (
    value === "empty" ||
    value === "todo" ||
    value === "customer-support"
  ) {
    return value;
  }

  throw new Error(
    `Unknown template "${value}". Choose empty, todo, or customer-support.`,
  );
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index];
  if (!value) throw new Error(`Missing value for ${option}.`);
  return value;
}

function printHelp(): void {
  console.log(`Usage: bunx @taskwish/create-project [directory] [options]

Create a fresh TypeScript TaskWish project.

Options:
  -t, --template <name>  Template: empty, todo, or customer-support
      --install          Install dependencies
      --no-install       Skip dependency installation
      --git              Initialize a git repository
      --no-git           Skip git initialization
  -y, --yes              Accept all defaults
  -h, --help             Show this help

Examples:
  bunx @taskwish/create-project
  bunx @taskwish/create-project my-app --template todo
  bunx @taskwish/create-project my-app --yes
`);
}

main().catch((error) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
