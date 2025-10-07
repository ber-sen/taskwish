import { End, UseCase, Parallel } from "../../src";

export default UseCase("Say hello")
  .on({ user: { name: "string", age: "number" } })

  .steps(
    Parallel(),

    ($) => $.input.user,

    ($) => $.input.user,

    End(Parallel)
  );
