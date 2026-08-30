import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const packageDirectory = join(import.meta.dir, "..");
const bareAction = join(
  packageDirectory,
  ".bare",
  "scaffolder",
  "create-project.ts",
);

await Bun.$`bare create-taskwish-project`;

const source = await readFile(bareAction, "utf8");
const wireImport = /import\s*\{[^}]*\}\s*from\s*["']@taskwish\/wire["'];/;

if (!wireImport.test(source)) {
  throw new Error(`Bare output did not contain the expected Wire import.`);
}

const staticWire = `class Wire {
  trace(_path: string, _data: unknown): void {}
}`;

await writeFile(bareAction, source.replace(wireImport, staticWire));

await Bun.$`scriptc build ${join(
  packageDirectory,
  ".bare",
  "create-taskwish-project.ts",
)} -o ${join(
  packageDirectory,
  "dist",
  "create-taskwish-project",
)} --npm-static @taskwish/terminal --no-keep-c`;
