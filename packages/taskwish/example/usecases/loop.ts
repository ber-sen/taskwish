import { Loop, End, Range, UseCase } from "../../src";

export default UseCase("Say hello")
  .trigger({ user: { name: "string", age: "number" } })

  .steps(
    Loop(Range(0, 10)),

    ["asdasd", ({ input }) => input.user.name],

    End(Loop),

    (scope) => scope.asdasd
  );
