import { End, UseCase, If, Message } from "../../src";

export default UseCase("Say hello")
  .use(import("../package"))

  .on({ user: { name: "string", age: "number" } })

  .steps(
    If(2 > 1),

    Message("case is true"),

    {
      name: "asdasd",
      run: ({ input }) => input.user.name,
    },

    End(If),

    (scope) => scope.asdasd
  );
