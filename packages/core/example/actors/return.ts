import { Actor, If, Loop, Return } from "../../src";

export default Actor("Say hello")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(),

    If(2 > 1),

    Return()
  );
