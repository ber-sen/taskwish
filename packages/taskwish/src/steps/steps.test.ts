import { makeSteps } from "./steps";

describe("Steps", () => {
  it("works for two steps", async () => {
    const Steps = makeSteps();

    const result = Steps(["step 1", () => 3], ["step 2", ($) => 3]);

    expect(result).toEqual({ success: true });
  });
});
