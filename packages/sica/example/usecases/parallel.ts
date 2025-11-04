import { End, UseCase, Parallel } from "../../src";

export default UseCase("Say hello")
  .use(import("../app"))

  .on({ user: { model: "Scope.model" } })

  .steps(
    Parallel(),

    ($) => $.input.user,

    ($) => $.input.user,

    End(Parallel)
  );
