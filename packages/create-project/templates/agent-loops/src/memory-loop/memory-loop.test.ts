import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { mockAgent } from "../shared/test-helpers";

test("retrieves and stores mocked state through ctx", async () => {
  const root = await mkdtemp(join(tmpdir(), "taskwish-memory-loop-test-"));
  const previousStorePath = process.env.TW_DEFAULT_STORE_PATH;
  process.env.TW_DEFAULT_STORE_PATH = join(root, "state");

  try {
    const { MemoryLoop } = await import(".");
    const agent = mockAgent("reuse the checklist", "release completed");
    const memories = [
      { id: "memory-1", text: "The release checklist worked." },
    ];
    memories.push = ((...items: Array<{ id?: string; text: string }>) =>
      Array.prototype.push.apply(
        memories,
        items.map((item) => ({ id: item.id ?? "memory-2", text: item.text }))
      )) as typeof memories.push;
    const state = { memories };

    await expect(
      MemoryLoop.runMemoryLoop
        .ctx({ agent, state })
        .run({ goal: "Improve the release checklist" })
    ).resolves.toEqual({
      result: "release completed",
      stored: {
        id: "memory-2",
        text: "Goal: Improve the release checklist\nOutcome: release completed",
      },
    });
    expect(state.memories).toHaveLength(2);
  } finally {
    if (previousStorePath === undefined) {
      delete process.env.TW_DEFAULT_STORE_PATH;
    } else {
      process.env.TW_DEFAULT_STORE_PATH = previousStorePath;
    }
    await rm(root, { recursive: true, force: true });
  }
});
