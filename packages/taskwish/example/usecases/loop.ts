import { Loop, End, Range, UseCase } from "../../src";

export default UseCase("Say hello")
  .on({ language: "string" })

  .steps(
    Loop(Range(0, 10)),

    ["asdasd", ({ input }) => input.language],

    End(Loop),

    scope => scope.asdasd
  );
