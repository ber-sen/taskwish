import { End, UseCase, Parallel } from "../../src";

export default UseCase("Say hello")
  .trigger({ user: { name: "string" } })

  .steps(
    Parallel(),

    ($) => $.input.user,

    ($) => $.input.user,

    End(Parallel)
  );
