import { expect, test } from "bun:test";

import { mockAgent } from "../shared/test-helpers";
import { RoutingGraph } from ".";

test("executes only the selected branch", async () => {
  const router = mockAgent("billing");
  const technical = mockAgent("unused");
  const billing = mockAgent("refund explained");
  const general = mockAgent("unused");

  await expect(
    RoutingGraph.routeRequest
      .ctx({ router, technical, billing, general })
      .run({ request: "Explain this charge" }),
  ).resolves.toEqual({ route: "billing", response: "refund explained" });
  expect(billing.generate).toHaveBeenCalledTimes(1);
  expect(technical.generate).not.toHaveBeenCalled();
  expect(general.generate).not.toHaveBeenCalled();
});
