import { mkdir, rm } from "node:fs/promises";

import { morph } from "@taskwish/bare";

const packageRoot = new URL("..", import.meta.url);

const examples = [
  {
    name: "biller",
    actor: "biller.ts",
    actions: ["on-greeter-message.ts"],
    service: "Biller",
    serviceActions: ["onGreeterMessage"],
  },
  {
    name: "greeter",
    actor: "greeter.ts",
    actions: ["hello.ts"],
    service: "Greeter",
    serviceActions: ["hello"],
  },
];

for (const example of examples) {
  const inputDirectory = `src/${example.name}/`;
  const outputDirectory = new URL(`bare/${example.name}/`, packageRoot);
  const actorSource = await readSource(`${inputDirectory}${example.actor}`);
  const localModules = [
    `./${example.actor.replace(/\.ts$/, "")}`,
    ...example.actions.map((file) => `./${file.replace(/\.ts$/, "")}`),
  ];

  await mkdir(outputDirectory, { recursive: true });
  await removeOutput(new URL(example.actor, outputDirectory));

  for (const action of example.actions) {
    const actionSource = await readSource(`${inputDirectory}${action}`);
    const output = new URL(action, outputDirectory);

    await writeOutput(
      output,
      stripActorImports(
        exportRunHelpers(
          morph(
            stripLocalImports(
              `${actorSource}\n\n${actionSource}`,
              localModules
            ),
            {
              filePath: new URL(`${inputDirectory}${action}`, packageRoot)
                .pathname,
            }
          )
        ),
        actorSource
      )
    );
  }

  await writeOutput(
    new URL("index.ts", outputDirectory),
    printServiceIndex(example.service, example.serviceActions, example.actions)
  );
}

function stripLocalImports(source: string, localModules: string[]): string {
  return source
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      return !localModules.some((module) =>
        trimmed.match(
          new RegExp(
            `^import\\s+.+\\s+from\\s+["']${escapeRegExp(module)}["'];?$`
          )
        )
      );
    })
    .join("\n")
    .trim();
}

function stripActorImports(source: string, actorSource: string): string {
  const actorImports = new Set(importLines(actorSource));

  return source
    .split("\n")
    .filter((line) => !actorImports.has(line.trim()))
    .join("\n")
    .trim();
}

function importLines(source: string): string[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.match(/^import\s+.+\s+from\s+["'].+["'];?$/));
}

function exportRunHelpers(source: string): string {
  return source
    .replace(/\nasync function run_/g, "\nexport async function run_")
    .replace(/\nasync function\* stream_/g, "\nexport async function* stream_");
}

function printServiceIndex(
  service: string,
  actionNames: string[],
  actionFiles: string[]
): string {
  const imports = actionNames.map((actionName, index) => {
    const actionModule = actionFiles[index]?.replace(/\.ts$/, "");
    return `import { ${actionName}, run_${actionName}, stream_${actionName} } from "./${actionModule}";`;
  });

  return `${imports.join("\n")}

export const ${service} = {
${actionNames.map((actionName) => `  ${actionName},`).join("\n")}
  run: {
${actionNames
  .map((actionName) => `    ${actionName}: run_${actionName},`)
  .join("\n")}
  },
  stream: {
${actionNames
  .map((actionName) => `    ${actionName}: stream_${actionName},`)
  .join("\n")}
  }
};
`;
}

async function readSource(relativePath: string): Promise<string> {
  return Bun.file(new URL(relativePath, packageRoot)).text();
}

async function writeOutput(output: URL, text: string): Promise<void> {
  await mkdir(new URL(".", output), { recursive: true });
  await Bun.write(output, text);
  console.log(`Wrote ${output.pathname}`);
}

async function removeOutput(output: URL): Promise<void> {
  await rm(output, { force: true });
  console.log(`Removed ${output.pathname}`);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
