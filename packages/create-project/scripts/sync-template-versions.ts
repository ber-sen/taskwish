import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type PackageJson = {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const packageDirectory = join(import.meta.dir, "..");
const packagesDirectory = join(packageDirectory, "..");
const templatesDirectory = join(packageDirectory, "templates");
const manifestPath = join(templatesDirectory, "versions.json");
const checkOnly = process.argv.includes("--check");

const workspaceVersions = new Map<string, string>();
for (const entry of await readdir(packagesDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const packageJson = await readPackageJson(
    join(packagesDirectory, entry.name, "package.json"),
  ).catch(() => null);
  if (packageJson?.name && packageJson.version) {
    workspaceVersions.set(packageJson.name, packageJson.version);
  }
}

const requiredPackages = new Set<string>();
for (const entry of await readdir(templatesDirectory, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const packageJson = await readPackageJson(
    join(templatesDirectory, entry.name, "package.json"),
  );
  for (const dependencies of [
    packageJson.dependencies,
    packageJson.devDependencies,
  ]) {
    for (const [name, range] of Object.entries(dependencies ?? {})) {
      if (range === "workspace:*") requiredPackages.add(name);
    }
  }
}

const manifest = Object.fromEntries(
  Array.from(requiredPackages)
    .sort()
    .map((name) => {
      const version = workspaceVersions.get(name);
      if (!version) {
        throw new Error(`Cannot find workspace package version for ${name}.`);
      }
      return [name, version];
    }),
);
const manifestSource = `${JSON.stringify(manifest, null, 2)}\n`;

if (checkOnly) {
  const currentSource = await readFile(manifestPath, "utf8").catch(() => null);
  if (currentSource !== manifestSource) {
    throw new Error(
      "Template dependency versions are out of date. Run bun run sync-template-versions.",
    );
  }
} else {
  await writeFile(manifestPath, manifestSource);
  console.log(`Synced ${requiredPackages.size} template dependency versions.`);
}

async function readPackageJson(path: string): Promise<PackageJson> {
  return JSON.parse(await readFile(path, "utf8")) as PackageJson;
}
