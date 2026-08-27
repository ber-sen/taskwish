import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Actor, Store, State } from "./index";

const temporaryDirectories: string[] = [];
const originalDefaultStorePath = process.env.TW_DEFAULT_STORE_PATH;

function temporaryStateDirectory(): string {
  const root = mkdtempSync(join(tmpdir(), "taskwish-state-"));
  temporaryDirectories.push(root);
  return join(root, "state");
}

afterEach(() => {
  if (originalDefaultStorePath === undefined) {
    delete process.env.TW_DEFAULT_STORE_PATH;
  } else {
    process.env.TW_DEFAULT_STORE_PATH = originalDefaultStorePath;
  }

  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("State", () => {
  test("uses a filesystem store by default", async () => {
    const root = mkdtempSync(join(tmpdir(), "taskwish-state-"));
    temporaryDirectories.push(root);
    delete process.env.TW_DEFAULT_STORE_PATH;
    const previousDirectory = process.cwd();
    const scoped = (() => {
      process.chdir(root);
      try {
        return Actor("DefaultStore").scope(
          State({ items: State.List({ description: "string" }) }),
        );
      } finally {
        process.chdir(previousDirectory);
      }
    })();

    const { add } = scoped
      .actor()
      
      .on("Command", "add")

      .run(function () {
        return this.state.items.push({ description: "persist me" });
      });

    await add();
    expect(
      JSON.parse(
        readFileSync(join(root, "state", "DefaultStore.json"), "utf8"),
      ),
    ).toEqual({ items: [{ description: "persist me" }] });
  });

  test("uses TW_DEFAULT_STORE_PATH as the default store directory", async () => {
    const directory = temporaryStateDirectory();
    process.env.TW_DEFAULT_STORE_PATH = directory;

    const { actor } = Actor("EnvironmentStore").scope(
      Store({ adapter: "fs" }),
      State({ items: State.List({ description: "string" }) }),
    );
    const { add } = actor()
      .on("Command", "add")
      
      .run(function () {
        this.state.items.push({ description: "from env" });
      });

    await add();
    expect(
      JSON.parse(
        readFileSync(join(directory, "EnvironmentStore.json"), "utf8"),
      ),
    ).toEqual({ items: [{ description: "from env" }] });
  });

  test("primitive values are mutable, persisted, and reloaded", async () => {
    const directory = temporaryStateDirectory();
    const createActor = () =>
      Actor("Counter")
        .scope(
          Store({ adapter: "fs", directory }),
          State({ count: 0 }),
        )
        .actor();

    const first = createActor();
    const { increase } = first.on("Command", "increase").run(function () {
      return ++this.state.count;
    });

    expect(await increase()).toBe(1);
    expect(
      JSON.parse(readFileSync(join(directory, "Counter.json"), "utf8")),
    ).toEqual({ count: 1 });

    const second = createActor();
    const { decrease } = second.on("Command", "decrease").run(function () {
      return --this.state.count;
    });

    expect(await decrease()).toBe(0);
  });

  test("State.List is mutable in actor scope and persists", async () => {
    const directory = temporaryStateDirectory();
    const { actor } = Actor("Todos").scope(
      Store({ adapter: "fs", directory }),
      State({
        items: State.List({
          id: "primary.uuidv4.random",
          description: "string",
          done: "boolean",
        }),
      }),
    );

    const { add } = actor()
      .on("Command", "add")
      .input({ description: "string" })
      .run(function () {
        this.state.items.push({
          description: this.input.description,
          done: false,
        });
        return this.state.items.at(-1)!.id;
      });

    const id = await add({ description: "Write the docs" });
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    const persisted = JSON.parse(
      readFileSync(join(directory, "Todos.json"), "utf8"),
    );
    expect(persisted).toMatchObject({
      items: [{ description: "Write the docs", done: false }],
    });
    expect(persisted.items[0].id).toBe(id);
  });

  test("State.List validates primary.uuidv4.random fields", async () => {
    const directory = temporaryStateDirectory();
    const { actor } = Actor("UUIDs").scope(
      Store({ adapter: "fs", directory }),
      State({
        items: State.List({ id: "primary.uuidv4.random" }),
      }),
    );

    const { addInvalid } = actor()
      .on("Command", "addInvalid")

      .run(function () {
        return this.state.items.push({ id: "not-a-uuid" });
      });

    await expect(addInvalid()).rejects.toThrow(
      "Invalid value at state.items[0]",
    );
  });

  test("state reloads from the store", async () => {
    const directory = temporaryStateDirectory();
    const createActor = () =>
      Actor("Reloadable")
        .scope(
          Store({ adapter: "fs", directory }),
          State({
            items: State.List({ name: "string", done: "boolean" }),
          }),
        )
        .actor();

    const first = createActor();
    const { add } = first
      .on("Command", "add")

      .input({ name: "string" })

      .run(function () {
        this.state.items.push({ name: this.input.name, done: false });
      });
    await add({ name: "one" });

    const second = createActor();
    const { count } = second.on("Command", "count").run(function () {
      return this.state.items.length;
    });

    expect(await count()).toBe(1);
  });

  test("invalid list items are rejected by their schema", async () => {
    const directory = temporaryStateDirectory();
    const { actor } = Actor("Validated").scope(
      Store({ adapter: "fs", directory }),
      State({
        items: State.List({ description: "string", done: "boolean" }),
      }),
    );

    const { addInvalid } = actor()
      .on("Command", "addInvalid")
      
      .run(function () {
        return this.state.items.push({
          description: "bad",
          // @ts-expect-error State.List infers done as boolean
          done: "no",
        });
      });

    await expect(addInvalid()).rejects.toThrow(
      "Invalid value at state.items[0]",
    );
  });
});
