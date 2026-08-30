import { join } from "node:path";
import ts from "typescript";

const packageDirectory = join(import.meta.dir, "..");

await Bun.$`bun ${join(packageDirectory, "..", "..", "scripts", "build-package.ts")}`;

const source = await Bun.file(
  join(packageDirectory, "src", "terminal.ts"),
).text();
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
    removeComments: false,
  },
});

await Bun.write(
  join(packageDirectory, "dist", "index.mjs"),
  outputText,
);
await Bun.write(
  join(packageDirectory, "dist", "index.d.mts"),
  Bun.file(join(packageDirectory, "dist", "index.d.ts")),
);
