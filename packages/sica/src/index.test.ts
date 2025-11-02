import { Expect, Equal } from "./helpers";

describe("sica", () => {
  it("Initial test", () => {
    const test = 1;

    type T = typeof test;

    type test = Expect<Equal<T, 1>>;
  });
});
