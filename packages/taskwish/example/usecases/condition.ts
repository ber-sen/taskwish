import { End, UseCase, If } from "../../src";

export default UseCase("Say hello")
  .trigger({ user: { name: "string", age: "number" } })

  .steps(
    If(2 > 1),

    ["asdasd", ({ input }) => input.user.name],

    End(If),

    (scope) => scope.asdasd
  );
