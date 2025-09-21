import { Expect, Equal } from "./utils/helper-types";

describe("TaskWish", () => {
  it("Initial test", () => {
    const test = 1;

    type T = typeof test;

    type test = Expect<Equal<T, 1>>;
  });
});
