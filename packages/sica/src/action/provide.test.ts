import { Expect, Equal } from "../helpers";
import { Sica } from "../types";
import { Provide } from "./provide";

describe("Provide", () => {
  it("works with arrow functions", async () => {
    const env = Provide("env", process.env);

    type T = typeof env;

    type env = Expect<
      Equal<Sica.Use<Sica.Struct<NodeJS.ProcessEnv, ["env"]>>, T>
    >;
  });
});
