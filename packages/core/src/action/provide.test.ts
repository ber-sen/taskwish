import { Expect, Equal } from "../helpers";
import { Taskwish } from "../types";
import { Provide } from "./provide";

describe("Provide", () => {
  it("works with arrow functions", async () => {
    const env = Provide("env", process.env);

    type T = typeof env;

    type env = Expect<
      Equal<Taskwish.Use<Taskwish.Struct<NodeJS.ProcessEnv, ["env"]>>, T>
    >;
  });
});
