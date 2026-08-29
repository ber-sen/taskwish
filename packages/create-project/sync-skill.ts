import { copyFile, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const packageDirectory = import.meta.dir;
const canonicalSkillPath = join(packageDirectory, "../skill/SKILL.md");
const templatesDirectory = join(packageDirectory, "templates");
const checkOnly = process.argv.includes("--check");

const canonicalSkill = await readFile(canonicalSkillPath, "utf8");
const templateDirectories = (await readdir(templatesDirectory, {
  withFileTypes: true,
}))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const staleTemplates: string[] = [];

for (const template of templateDirectories) {
  const templateSkillPath = join(templatesDirectory, template, "SKILL.md");

  if (checkOnly) {
    const templateSkill = await readFile(templateSkillPath, "utf8").catch(
      () => null,
    );
    if (templateSkill !== canonicalSkill) staleTemplates.push(template);
  } else {
    await copyFile(canonicalSkillPath, templateSkillPath);
  }
}

if (staleTemplates.length > 0) {
  throw new Error(
    `Template SKILL.md files are out of date: ${staleTemplates.join(", ")}. Run bun run sync-skill.`,
  );
}

if (!checkOnly) {
  console.log(`Synced SKILL.md to ${templateDirectories.length} templates.`);
}
