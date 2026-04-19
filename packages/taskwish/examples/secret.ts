import { secrets } from "bun";

const [, , command, name, value] = process.argv;

const SERVICE = "ai.taskwish.cli";

async function main() {
  if (!command) {
    console.log("Usage:");
    console.log("  cli.ts set <name> <value>");
    console.log("  cli.ts get <name>");
    process.exit(1);
  }

  if (command === "set") {
    if (!name || !value) {
      console.error("Missing name or value");
      process.exit(1);
    }

    await secrets.set({
      service: SERVICE,
      name,
      value,
    });

    console.log(`Stored secret "${name}"`);
    return;
  }

  if (command === "get") {
    if (!name) {
      console.error("Missing name");
      process.exit(1);
    }

    const result = await secrets.get({
      service: SERVICE,
      name,
    });

    if (!result) {
      console.error(`No secret found for "${name}"`);
      process.exit(1);
    }

    console.log(result);
    return;
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main();