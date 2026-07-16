import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { rollup } from "rollup";
import dts from "rollup-plugin-dts";

type PackageJson = {
  exports?: {
    ".": string | { source?: string };
    [key: string]: string | { source?: string } | undefined;
  };
  taskwish?: {
    htmlSource?: string;
  };
};

const packageDir = process.cwd();
const packageJson = (await Bun.file(
  join(packageDir, "package.json"),
).json()) as PackageJson;

function entrypoint(): string {
  const rootExport = packageJson.exports?.["."];
  if (typeof rootExport === "string") return rootExport;
  if (rootExport?.source) return rootExport.source;
  return "./src/index.ts";
}

const entry = entrypoint();
const absoluteEntry = join(packageDir, entry);
const dist = join(packageDir, "dist");
const declarationDist = join(packageDir, ".types");
const declarationRoot = dirname(entry);

await rm(dist, { recursive: true, force: true });
await rm(declarationDist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const [format, outfile] of [
  ["esm", "index.mjs"],
  ["cjs", "index.cjs"],
] as const) {
  await Bun.$`bun build ${absoluteEntry} --target=bun --format=${format} --packages=external --outfile=${join(
    dist,
    outfile,
  )}`;
}

const declarations =
  await Bun.$`tsc ${absoluteEntry} --declaration --emitDeclarationOnly --declarationDir ${declarationDist} --rootDir ${join(
    packageDir,
    declarationRoot,
  )} --target esnext --module esnext --moduleResolution Bundler --jsx react-jsx --strict --strictNullChecks --esModuleInterop --skipLibCheck --types bun`;

if (declarations.exitCode !== 0) process.exit(declarations.exitCode);

const declarationBundle = await rollup({
  input: join(declarationDist, "index.d.ts"),
  plugins: [dts()],
});

await declarationBundle.write({
  file: join(dist, "index.d.ts"),
  format: "es",
});
await declarationBundle.close();
await rm(declarationDist, { recursive: true, force: true });

const htmlExport = packageJson.exports?.["./index.html"];
const htmlSource =
  packageJson.taskwish?.htmlSource ??
  (typeof htmlExport === "object" ? htmlExport.source : undefined);
const htmlEntry = htmlSource ? join(packageDir, htmlSource) : null;

if (htmlEntry) {
  const stylesEntry = join(packageDir, "src", "styles.css");
  if (await Bun.file(stylesEntry).exists()) {
    const [{ default: postcss }, { default: tailwindcss }] = await Promise.all([
      import("postcss"),
      import("@tailwindcss/postcss"),
    ]);
    const result = await postcss([tailwindcss()]).process(
      await Bun.file(stylesEntry).text(),
      {
        from: stylesEntry,
        to: join(packageDir, "src", "styles.generated.css"),
      },
    );
    await Bun.write(join(packageDir, "src", "styles.generated.css"), result.css);
  }

  await Bun.$`bun build ${htmlEntry} --target=browser --outdir=${join(
    dist,
    "app",
  )}`;
}
