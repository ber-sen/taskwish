import { Actor, If, Loop, Return } from "../../src";

export default Actor("SayHello")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(),

    If(() => true),

    Return()
  );
