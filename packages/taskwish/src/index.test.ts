import { Expect, Equal } from "./type-helpers";

describe("TaskWish", () => {
  it("Initial test", () => {
    const test = 1;

    type T = typeof test;

    type test = Expect<Equal<T, 1>>;
  });
});
