import { UseCase, If, Loop, Return } from "../../src";

export default UseCase("Say hello")
  .use(import("../app"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    Loop(),

    If(2 > 1),

    Return()
  );
