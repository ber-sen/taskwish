import { End, UseCase, If, Agent } from "../../src";

export default UseCase("Say hello")
  .on({ user: { name: "string", age: "number" } })

  .steps(
    If(2 > 1),

    Agent("lorem").abilities(),

    End(If)
  );
