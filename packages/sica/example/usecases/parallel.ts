import { End, UseCase, Parallel } from "../../src";

export default UseCase("Say hello")
  .on({ user: { model: "Scope.model" } })

  .steps(
    Parallel(),

    ($) => $.input.user,

    ($) => $.input.user,

    End(Parallel)
  );
