import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const packageDirectory = join(import.meta.dir, "..");
const repositoryDirectory = join(packageDirectory, "../..");
const canonicalSkillPath = join(
  repositoryDirectory,
  "skills/taskwish/SKILL.md",
);
const templatesDirectory = join(packageDirectory, "templates");
const checkOnly = process.argv.includes("--check");

const canonicalSkill = await readFile(canonicalSkillPath, "utf8");
const templateDirectories = (await readdir(templatesDirectory, {
  withFileTypes: true,
}))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const skillTargets = [join(packageDirectory, "../skill/SKILL.md")];

for (const template of templateDirectories) {
  skillTargets.push(
    join(
      templatesDirectory,
      template,
      ".agents/skills/taskwish/SKILL.md",
    ),
  );
}

const staleTargets: string[] = [];

for (const skillTarget of skillTargets) {
  if (checkOnly) {
    const targetSkill = await readFile(skillTarget, "utf8").catch(
      () => null,
    );
    if (targetSkill !== canonicalSkill) {
      staleTargets.push(relative(repositoryDirectory, skillTarget));
    }
  } else {
    await mkdir(dirname(skillTarget), { recursive: true });
    await copyFile(canonicalSkillPath, skillTarget);
  }
}

if (staleTargets.length > 0) {
  throw new Error(
    `Generated SKILL.md files are out of date: ${staleTargets.join(", ")}. Run bun run sync-skill.`,
  );
}

if (!checkOnly) {
  console.log(`Synced SKILL.md to ${skillTargets.length} package targets.`);
}
