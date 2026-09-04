import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { rollup } from "rollup";
import dts from "rollup-plugin-dts";

type PackageJson = {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  exports?: {
    ".": string | { source?: string; import?: string; require?: string };
    [key: string]:
      | string
      | { source?: string; import?: string; require?: string; types?: string }
      | undefined;
  };
  taskwish?: {
    htmlSource?: string;
  };
};

const packageDir = process.cwd();
const packageJson = (await Bun.file(
  join(packageDir, "package.json"),
).json()) as PackageJson;

type SourceEntry = {
  exportPath: string;
  source: string;
  outputName: string;
  buildJs: boolean;
};

function rootEntrypoint(): string {
  const rootExport = packageJson.exports?.["."];
  if (typeof rootExport === "string") return rootExport;
  if (rootExport?.source) return rootExport.source;
  return "./src/index.ts";
}

function outputNameForExport(exportPath: string): string {
  if (exportPath === ".") return "index";
  return exportPath.replace(/^\.\//, "").replace(/\/index$/, "/index");
}

function sourceEntries(): SourceEntry[] {
  const entries = Object.entries(packageJson.exports ?? {
    ".": { source: rootEntrypoint() },
  });

  return entries.flatMap(([exportPath, exportValue]) => {
    const source =
      typeof exportValue === "string" ? exportValue : exportValue?.source;
    if (!source || !/\.[cm]?[tj]sx?$/.test(source)) return [];
    return [
      {
        exportPath,
        source,
        outputName: outputNameForExport(exportPath),
        buildJs:
          exportPath === "." ||
          typeof exportValue === "string" ||
          Boolean(exportValue?.import || exportValue?.require),
      },
    ];
  });
}

const entries = sourceEntries();
const externalPackages = [
  ...Object.keys(packageJson.dependencies ?? {}),
  ...Object.keys(packageJson.peerDependencies ?? {}),
].map((dependency) => `--external=${dependency}`);
const dist = join(packageDir, "dist");
const declarationDist = join(packageDir, ".types");

await rm(dist, { recursive: true, force: true });
await rm(declarationDist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const entry of entries) {
  const absoluteEntry = join(packageDir, entry.source);

  if (entry.buildJs) {
    for (const [format, extension] of [
      ["esm", "mjs"],
      ["cjs", "cjs"],
    ] as const) {
      const output = join(dist, `${entry.outputName}.${extension}`);
      if (entry.exportPath === "./react") {
        await Bun.$`bun build ${absoluteEntry} --target=browser --format=${format} --production --banner=${'"use client";'} ${externalPackages} --outfile=${output}`;
      } else {
        await Bun.$`bun build ${absoluteEntry} --target=node --format=${format} --packages=external --outfile=${output}`;
      }
    }
  }

  const declarationConfig = join(declarationDist, "tsconfig.json");
  await Bun.write(
    declarationConfig,
    JSON.stringify({
      extends: join(packageDir, "tsconfig.json"),
      compilerOptions: {
        declaration: true,
        declarationDir: declarationDist,
        emitDeclarationOnly: true,
        noEmit: false,
        rootDir: join(packageDir, dirname(entry.source)),
      },
      files: [absoluteEntry],
      include: [],
    }),
  );
  const declarations = await Bun.$`tsc --project ${declarationConfig}`;

  if (declarations.exitCode !== 0) process.exit(declarations.exitCode);

  const declarationFile = `${entry.source
    .split("/")
    .at(-1)!
    .replace(/\.[cm]?[tj]sx?$/, "")}.d.ts`;
  const declarationBundle = await rollup({
    input: join(declarationDist, declarationFile),
    plugins: [dts()],
  });

  await declarationBundle.write({
    file: join(dist, `${entry.outputName}.d.ts`),
    format: "es",
  });
  await declarationBundle.close();
}
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
