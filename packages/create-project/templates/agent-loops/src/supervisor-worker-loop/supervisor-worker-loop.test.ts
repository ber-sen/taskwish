import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { SupervisorWorkerLoop } from ".";

test("delegates, executes, and evaluates work", async () => {
  const supervisor = mockAgent("draft the guide", "approved");
  const worker = mockAgent("completed guide");

  await expect(
    SupervisorWorkerLoop.runSupervisorWorkerLoop
      .ctx({ supervisor, worker })
      .run({ task: "Create an interview guide" }),
  ).resolves.toBe("approved");
  expect(supervisor.generate).toHaveBeenCalledTimes(2);
  expect(worker.generate).toHaveBeenCalledTimes(1);
});
