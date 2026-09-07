import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const webDirectory = join(import.meta.dir, "..");
const sourceDirectory = join(
  webDirectory,
  "..",
  "..",
  "packages",
  "create-project",
  "platforms"
);
const outputDirectory = join(webDirectory, "public", "cli");
const expectedBinaries = [
  "create-taskwish-project-darwin-arm64",
  "create-taskwish-project-darwin-x64",
  "create-taskwish-project-linux-arm64",
  "create-taskwish-project-linux-x64",
  "create-taskwish-project-linux-x64-musl",
  "create-taskwish-project-windows-arm64.exe",
  "create-taskwish-project-windows-x64.exe",
] as const;

const available = new Set(await readdir(sourceDirectory));
const missing = expectedBinaries.filter((binary) => !available.has(binary));
if (missing.length > 0) {
  throw new Error(
    `Missing compiled create-project binaries:\n${missing.join(
      "\n"
    )}\nRun bun run --cwd packages/create-project build-cli:platforms first.`
  );
}

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

for (const binary of expectedBinaries) {
  const source = join(sourceDirectory, binary);
  const output = join(outputDirectory, binary);
  await copyFile(source, output);

  const size = (await stat(output)).size;
  if (size === 0) throw new Error(`Copied an empty binary: ${binary}`);
  console.log(`Copied ${binary} (${size} bytes).`);
}
