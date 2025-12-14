import { End, Actor, Parallel } from "../../src";

export default Actor("Say hello")
  .use(import("../package"))

  .on({ user: { model: "string" } })

  .steps(
    Parallel(),

    ($) => $.input.user,

    ($) => $.input.user,

    End(Parallel)
  );
