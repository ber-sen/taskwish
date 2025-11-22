import { End, UseCase, Parallel } from "../../src";

export default UseCase("Say hello")
  .use(import("../package"))

  .on({ user: { model: "string" } })

  .steps(
    Parallel(),

    ($) => $.input.user,

    ($) => $.input.user,

    End(Parallel)
  );
