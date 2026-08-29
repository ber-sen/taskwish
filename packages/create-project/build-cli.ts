import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const packageDirectory = import.meta.dir;
const bareAction = join(
  packageDirectory,
  ".bare",
  "create-project",
  "create-project.ts",
);

await Bun.$`bare cli`;

const source = await readFile(bareAction, "utf8");
const wireImport = 'import { Wire } from "@taskwish/wire";';

if (!source.includes(wireImport)) {
  throw new Error(`Bare output did not contain the expected Wire import.`);
}

const staticWire = `class Wire {
  trace(_path: string, _data: unknown): void {}
}`;

await writeFile(bareAction, source.replace(wireImport, staticWire));

await Bun.$`scriptc build ${join(
  packageDirectory,
  ".bare",
  "cli.ts",
)} -o ${join(packageDirectory, "cli")} --no-keep-c`;
